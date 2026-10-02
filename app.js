/* =====================================================
   PR SEARCH
   Google Sheet -> PR SEARCH
   ===================================================== */


const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";

const SHEET_NAME =
  "PR SEARCH";


let headers = [];
let rows = [];
let ready = false;


/* DOM */

const input =
  document.getElementById("searchInput");

const searchBtn =
  document.getElementById("searchBtn");

const status =
  document.getElementById("status");

const message =
  document.getElementById("message");

const results =
  document.getElementById("results");


/* =====================================================
   NORMALIZE
   ===================================================== */

function normalize(value){

  return String(value ?? "")
    .toLowerCase()
    .trim();

}


function compact(value){

  return normalize(value)
    .replace(/[\s\-\/]/g,"");

}


/* =====================================================
   ESCAPE HTML
   ===================================================== */

function escapeHTML(value){

  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}


/* =====================================================
   CSV PARSER
   ===================================================== */

function parseCSV(text){

  const data = [];

  let row = [];

  let cell = "";

  let quoted = false;


  for(
    let i = 0;
    i < text.length;
    i++
  ){

    const c =
      text[i];

    const next =
      text[i + 1];


    if(
      c === '"' &&
      quoted &&
      next === '"'
    ){

      cell += '"';

      i++;

      continue;
    }


    if(c === '"'){

      quoted =
        !quoted;

      continue;
    }


    if(
      c === "," &&
      !quoted
    ){

      row.push(cell);

      cell = "";

      continue;
    }


    if(
      (c === "\n" ||
       c === "\r") &&
      !quoted
    ){

      if(
        c === "\r" &&
        next === "\n"
      ){

        i++;
      }


      row.push(cell);

      cell = "";


      if(
        row.some(
          x =>
          String(x).trim() !== ""
        )
      ){

        data.push(row);
      }


      row = [];

      continue;
    }


    cell += c;
  }


  if(
    cell !== "" ||
    row.length
  ){

    row.push(cell);

    if(
      row.some(
        x =>
        String(x).trim() !== ""
      )
    ){

      data.push(row);
    }
  }


  return data;
}


/* =====================================================
   FIND HEADER ROW
   ===================================================== */

function findHeaderRow(data){

  const keys = [

    "place of damage",

    "did no",

    "capacity",

    "complain number",

    "complaint number",

    "complain date",

    "complaint date",

    "pr no",

    "pr date",

    "je name",

    "je mobile"

  ];


  let bestRow = 0;

  let bestScore = 0;


  const limit =
    Math.min(
      data.length,
      20
    );


  for(
    let r = 0;
    r < limit;
    r++
  ){

    const text =
      data[r]
        .map(x => normalize(x))
        .join(" | ");


    let score = 0;


    keys.forEach(k => {

      if(
        text.includes(k)
      ){

        score++;
      }

    });


    if(score > bestScore){

      bestScore =
        score;

      bestRow =
        r;
    }
  }


  return bestRow;
}


/* =====================================================
   LOAD CSV
   ===================================================== */

async function loadCSV(){

  const url =
    `https://docs.google.com/spreadsheets/d/` +
    `${SHEET_ID}/export?format=csv` +
    `&gid=${SHEET_GID}` +
    `&t=${Date.now()}`;


  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () => controller.abort(),
      12000
    );


  try{

    const response =
      await fetch(
        url,
        {
          method:"GET",
          mode:"cors",
          cache:"no-store",
          signal:controller.signal
        }
      );


    if(!response.ok){

      throw new Error(
        "Google CSV returned HTTP " +
        response.status
      );
    }


    const text =
      await response.text();


    if(
      !text ||
      text.length < 100
    ){

      throw new Error(
        "Empty response from Google Sheet."
      );
    }


    /*
      If Google sends an HTML login/error page,
      don't try to parse it as CSV.
    */

    if(
      text.trim().startsWith("<!DOCTYPE") ||
      text.trim().startsWith("<html")
    ){

      throw new Error(
        "Google Sheet is not publicly readable."
      );
    }


    return text;


  }finally{

    clearTimeout(timeout);
  }

}


/* =====================================================
   GVIZ FALLBACK
   ===================================================== */

function loadGViz(){

  return new Promise(
    (resolve,reject)=>{

      const callbackName =
        "__prSearch_" +
        Date.now() +
        "_" +
        Math.floor(
          Math.random()*10000
        );


      let finished =
        false;


      const script =
        document.createElement("script");


      const timeout =
        setTimeout(
          () => {

            if(finished) return;

            finished = true;

            cleanup();

            reject(
              new Error(
                "Google connection timed out."
              )
            );

          },
          12000
        );


      function cleanup(){

        clearTimeout(timeout);

        try{
          delete window[callbackName];
        }catch(e){}

        script.remove();
      }


      window[callbackName] =
        function(data){

          if(finished) return;

          finished = true;

          cleanup();

          try{

            if(
              !data ||
              !data.table
            ){

              throw new Error(
                "Invalid Google Sheet response."
              );
            }


            const table =
              data.table;


            const cols =
              table.cols || [];


            const header =
              cols.map(
                c =>
                c.label || ""
              );


            const body =
              (table.rows || [])
                .map(
                  r =>
                  cols.map(
                    (_,i) =>
                    r.c &&
                    r.c[i] &&
                    r.c[i].v != null
                      ? r.c[i].v
                      : ""
                  )
                );


            resolve({
              headers:header,
              rows:body
            });


          }catch(err){

            reject(err);
          }

        };


      const tqx =
        encodeURIComponent(
          `out:json;responseHandler:${callbackName}`
        );


      const sheet =
        encodeURIComponent(
          SHEET_NAME
        );


      script.src =
        `https://docs.google.com/spreadsheets/d/` +
        `${SHEET_ID}/gviz/tq` +
        `?tqx=${tqx}` +
        `&sheet=${sheet}` +
        `&t=${Date.now()}`;


      script.onerror =
        function(){

          if(finished) return;

          finished = true;

          cleanup();

          reject(
            new Error(
              "Google GViz connection failed."
            )
          );

        };


      document.head.appendChild(script);

    }
  );

}


/* =====================================================
   OPEN SHEET FALLBACK
   ===================================================== */

async function loadOpenSheet(){

  const url =
    `https://opensheet.elk.sh/` +
    `${SHEET_ID}/` +
    `${encodeURIComponent(SHEET_NAME)}`;


  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () => controller.abort(),
      12000
    );


  try{

    const response =
      await fetch(
        url,
        {
          cache:"no-store",
          signal:controller.signal
        }
      );


    if(!response.ok){

      throw new Error(
        "OpenSheet HTTP " +
        response.status
      );
    }


    const data =
      await response.json();


    if(
      !Array.isArray(data) ||
      !data.length
    ){

      throw new Error(
        "OpenSheet returned no records."
      );
    }


    const header =
      Object.keys(
        data[0]
      );


    const body =
      data.map(
        item =>
        header.map(
          h =>
          item[h] ?? ""
        )
      );


    return {
      headers:header,
      rows:body
    };


  }finally{

    clearTimeout(timeout);
  }

}


/* =====================================================
   PROCESS CSV DATA
   ===================================================== */

function processCSV(text){

  const data =
    parseCSV(text);


  if(!data.length){

    throw new Error(
      "PR SEARCH contains no readable data."
    );
  }


  const headerRow =
    findHeaderRow(data);


  headers =
    data[headerRow]
      .map(
        (h,i) =>
          String(h || "").trim() ||
          `Column ${i+1}`
      );


  rows =
    data
      .slice(headerRow + 1)
      .filter(
        row =>
        row.some(
          cell =>
          String(cell ?? "").trim() !== ""
        )
      );


  if(!rows.length){

    throw new Error(
      "No records found in PR SEARCH."
    );
  }

}


/* =====================================================
   LOAD DATA
   ===================================================== */

async function loadData(){

  ready = false;


  status.textContent =
    "Loading PR SEARCH...";


  message.className =
    "message loading";


  message.innerHTML =
    `<span class="spinner"></span>
     Loading records...`;


  /*
    METHOD 1
    Direct Google CSV
  */

  try{

    const csv =
      await loadCSV();

    processCSV(csv);

    setReady();

    return;

  }catch(error){

    console.warn(
      "CSV failed:",
      error
    );
  }


  /*
    METHOD 2
    Google GViz
  */

  try{

    const data =
      await loadGViz();


    headers =
      data.headers;


    rows =
      data.rows
        .filter(
          row =>
          row.some(
            x =>
            String(x).trim() !== ""
          )
        );


    if(!headers.length){

      throw new Error(
        "No headers returned."
      );
    }


    setReady();

    return;

  }catch(error){

    console.warn(
      "GViz failed:",
      error
    );
  }


  /*
    METHOD 3
    OpenSheet
  */

  try{

    const data =
      await loadOpenSheet();


    headers =
      data.headers;


    rows =
      data.rows;


    setReady();

    return;

  }catch(error){

    console.warn(
      "OpenSheet failed:",
      error
    );
  }


  /*
    ALL METHODS FAILED
  */

  ready = false;


  status.textContent =
    "Connection failed";


  status.className =
    "status error";


  message.className =
    "message error";


  message.innerHTML = `
    <b>Unable to load PR SEARCH.</b>
    <br><br>
    Please make sure the Google Sheet is
    <b>Anyone with the link → Viewer</b>.
    <br><br>
    Then tap the page refresh button.
  `;

}


/* =====================================================
   READY
   ===================================================== */

function setReady(){

  ready = true;


  status.textContent =
    `${rows.length.toLocaleString()} records • Ready`;


  status.className =
    "status ready";


  message.className =
    "message";


  message.textContent =
    "Enter PR / Complaint Number to search.";


  console.log(
    "PR SEARCH loaded:",
    rows.length
  );

}


/* =====================================================
   FIND COLUMN
   ===================================================== */

function findColumn(names){

  for(
    const name of names
  ){

    const wanted =
      normalize(name);


    const index =
      headers.findIndex(
        h =>
        normalize(h) === wanted
      );


    if(index !== -1){

      return index;
    }
  }


  return -1;
}


/* =====================================================
   SEARCH
   ===================================================== */

function search(){

  if(!ready){

    message.className =
      "message loading";


    message.innerHTML =
      `<span class="spinner"></span>
       PR SEARCH is still loading...`;

    return;
  }


  const value =
    input.value.trim();


  if(!value){

    results.innerHTML = "";


    message.className =
      "message";


    message.textContent =
      "Enter PR / Complaint Number to search.";


    return;
  }


  const q =
    compact(value);


  const found =
    rows.filter(
      row =>
      row.some(
        cell =>
        compact(cell)
          .includes(q)
      )
    );


  renderResults(found);
}


/* =====================================================
   STATUS
   ===================================================== */

function getStatus(row){

  const replacementIndex =
    findColumn([
      "REPLACEMENT DATE",
      "Replacement Date"
    ]);


  const issueIndex =
    findColumn([
      "ISSUE DATE",
      "Issue Date"
    ]);


  const driverIndex =
    findColumn([
      "DRIVER NAME",
      "Driver Name"
    ]);


  const mobileIndex =
    findColumn([
      "DRIVER MOBILE",
      "Driver Mobile"
    ]);


  const replacement =
    replacementIndex >= 0
      ? String(
          row[replacementIndex] || ""
        ).trim()
      : "";


  const issue =
    issueIndex >= 0
      ? String(
          row[issueIndex] || ""
        ).trim()
      : "";


  const driver =
    driverIndex >= 0
      ? String(
          row[driverIndex] || ""
        ).trim()
      : "";


  const mobile =
    mobileIndex >= 0
      ? String(
          row[mobileIndex] || ""
        ).trim()
      : "";


  if(replacement){

    return {

      type:"installed",

      title:
        "🎉 Congratulations! Your Transformer is installed.",

      detail:
        `Replacement Date: ${
          escapeHTML(replacement)
        }`
    };

  }


  if(issue){

    return {

      type:"issued",

      title:
        "⚡ Your Transformer is issued by Workshop.",

      detail:
        `Issue Date: ${
          escapeHTML(issue)
        }` +

        (
          driver
            ? `<br>Driver: ${
                escapeHTML(driver)
              }`
            : ""
        ) +

        (
          mobile
            ? `<br>Mobile: ${
                escapeHTML(mobile)
              }`
            : ""
        ) +

        `<br><b>
          Please contact Driver for Installation.
        </b>`
    };

  }


  return {

    type:"pending",

    title:
      "Transformer replacement pending.",

    detail:
      "No Issue Date / Replacement Date found."
  };

}


/* =====================================================
   REPEATED DAMAGE HISTORY
   ===================================================== */

function getHistory(currentRow){

  const placeIndex =
    findColumn([
      "PLACE OF DAMAGE",
      "Place of Damage"
    ]);


  if(placeIndex === -1){

    return [];
  }


  const place =
    compact(
      currentRow[placeIndex]
    );


  if(!place){

    return [];
  }


  const matches =
    rows.filter(
      row =>
      compact(
        row[placeIndex]
      ) === place
    );


  if(matches.length <= 1){

    return matches;
  }


  const dateIndex =
    findColumn([
      "PR DATE",
      "PR Date",
      "DATE OF DAMAGE",
      "Date of Damage"
    ]);


  matches.sort(
    (a,b)=>{

      if(dateIndex === -1){

        return 0;
      }


      const da =
        parseDateValue(
          a[dateIndex]
        );


      const db =
        parseDateValue(
          b[dateIndex]
        );


      return da - db;
    }
  );


  return matches;
}


/* =====================================================
   DATE PARSER
   ===================================================== */

function parseDateValue(value){

  const text =
    String(value || "").trim();


  if(!text){

    return 0;
  }


  /*
    DD.MM.YYYY
  */

  const m =
    text.match(
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/
    );


  if(m){

    return new Date(
      Number(m[3]),
      Number(m[2])-1,
      Number(m[1])
    ).getTime();
  }


  const d =
    new Date(text);


  return isNaN(d.getTime())
    ? 0
    : d.getTime();
}


/* =====================================================
   ORDINAL
   ===================================================== */

function ordinal(n){

  if(n === 1) return "First";

  if(n === 2) return "Second";

  if(n === 3) return "Third";

  if(n === 4) return "Fourth";

  if(n === 5) return "Fifth";

  if(n === 6) return "Sixth";

  if(n === 7) return "Seventh";

  if(n === 8) return "Eighth";

  if(n === 9) return "Ninth";

  if(n === 10) return "Tenth";

  return n + "th";
}


/* =====================================================
   RENDER RESULTS
   ===================================================== */

function renderResults(found){

  results.innerHTML = "";


  if(!found.length){

    message.className =
      "message";


    message.innerHTML = `
      <b>No record found.</b>
      <br>
      <span style="font-size:10px;color:#888">
        Try PR No, Complaint No, DID No,
        Place of Damage or another value.
      </span>
    `;

    return;
  }


  message.className =
    "message";


  message.textContent =
    `${found.length}
     matching record${found.length > 1 ? "s" : ""}
     found`;


  /*
    Maximum 50 results on screen.
  */

  found
    .slice(0,50)
    .forEach(
      row =>
      renderCard(row)
    );


  if(found.length > 50){

    const more =
      document.createElement("div");


    more.className =
      "message";


    more.textContent =
      "Showing first 50 matching records.";

    results.appendChild(more);
  }

}


/* =====================================================
   RENDER CARD
   ===================================================== */

function renderCard(row){

  const card =
    document.createElement("div");


  card.className =
    "card";


  const prIndex =
    findColumn([
      "PR NO",
      "PR No",
      "PR NUMBER"
    ]);


  const prDateIndex =
    findColumn([
      "PR DATE",
      "PR Date"
    ]);


  const prNo =
    prIndex >= 0
      ? row[prIndex]
      : "";


  const prDate =
    prDateIndex >= 0
      ? row[prDateIndex]
      : "";


  const history =
    getHistory(row);


  const repeated =
    history.length > 1;


  const statusData =
    getStatus(row);


  let html = `

    <div class="card-head">

      <div>

        <div class="pr-number">
          PR No:
          ${escapeHTML(
            prNo || "—"
          )}
        </div>

        <div class="pr-date">
          PR Date:
          ${escapeHTML(
            prDate || "—"
          )}
        </div>

      </div>


      <div class="
        badge
        ${statusData.type}
      ">

        ${
          statusData.type === "installed"
            ? "INSTALLED"
            : statusData.type === "issued"
              ? "ISSUED"
              : "PENDING"
        }

      </div>

    </div>

  `;


  /*
    STATUS
  */

  if(
    statusData.type ===
    "installed"
  ){

    html += `

      <div class="alert ok">

        ${statusData.title}

        <br>

        ${statusData.detail}

      </div>

    `;

  }
  else if(
    statusData.type ===
    "issued"
  ){

    html += `

      <div class="alert issue">

        ${statusData.title}

        <br>

        ${statusData.detail}

      </div>

    `;

  }
  else{

    html += `

      <div class="alert">

        ${statusData.title}

        <br>

        ${statusData.detail}

      </div>

    `;
  }


  /*
    REPEATED DAMAGE
  */

  if(repeated){

    html += `

      <div class="repeat-alert">

        ⚠️ It Damaged
        ${history.length}
        Times.

        <br>

        Ple
