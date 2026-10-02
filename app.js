const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID = "1464518527";

const CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

let headers = [];
let rows = [];
let ready = false;

const input = document.getElementById("searchInput");
const button = document.getElementById("searchBtn");
const statusBox = document.getElementById("status");
const message = document.getElementById("message");
const results = document.getElementById("results");


/* ---------------- CSV PARSER ---------------- */

function parseCSV(text){

  const data = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for(let i=0;i<text.length;i++){

    const c = text[i];
    const next = text[i+1];

    if(c === '"' && quoted && next === '"'){
      cell += '"';
      i++;
      continue;
    }

    if(c === '"'){
      quoted = !quoted;
      continue;
    }

    if(c === "," && !quoted){
      row.push(cell);
      cell = "";
      continue;
    }

    if((c === "\n" || c === "\r") && !quoted){

      if(c === "\r" && next === "\n") i++;

      row.push(cell);
      cell = "";

      if(row.some(x => String(x).trim() !== "")){
        data.push(row);
      }

      row = [];
      continue;
    }

    cell += c;
  }

  if(cell !== "" || row.length){
    row.push(cell);

    if(row.some(x => String(x).trim() !== "")){
      data.push(row);
    }
  }

  return data;
}


/* ---------------- NORMALIZE ---------------- */

function normalize(value){

  return String(value ?? "")
    .toLowerCase()
    .trim();
}

function compact(value){

  return normalize(value)
    .replace(/[\s\-\/]/g,"");
}


/* ---------------- HEADER DETECTION ---------------- */

function findHeaderRow(data){

  let best = 0;
  let bestScore = 0;

  const keywords = [
    "place of damage",
    "complain number",
    "complaint number",
    "pr no",
    "pr date",
    "date of damage",
    "capacity",
    "did no",
    "je name"
  ];

  for(let i=0;i<Math.min(data.length,20);i++){

    const line = data[i]
      .map(x => normalize(x))
      .join(" | ");

    let score = 0;

    keywords.forEach(k=>{
      if(line.includes(k)) score++;
    });

    if(score > bestScore){
      bestScore = score;
      best = i;
    }
  }

  return best;
}


/* ---------------- LOAD SHEET ---------------- */

async function loadSheet(){

  statusBox.textContent = "Loading PR SEARCH...";
  statusBox.className = "sub";

  try{

    const controller = new AbortController();

    const timeout = setTimeout(()=>{
      controller.abort();
    },15000);

    const response = await fetch(
      CSV_URL + "&t=" + Date.now(),
      {
        cache:"no-store",
        signal:controller.signal
      }
    );

    clearTimeout(timeout);

    if(!response.ok){
      throw new Error("Google Sheet could not be loaded.");
    }

    const text = await response.text();

    if(!text || text.length < 50){
      throw new Error("No data received from Google Sheet.");
    }

    const data = parseCSV(text);

    if(!data.length){
      throw new Error("PR SEARCH is empty.");
    }

    const headerIndex = findHeaderRow(data);

    headers = data[headerIndex].map((h,i)=>{
      const value = String(h || "").trim();
      return value || `Column ${i+1}`;
    });

    rows = data
      .slice(headerIndex + 1)
      .filter(row =>
        row.some(cell => String(cell ?? "").trim() !== "")
      );

    ready = true;

    statusBox.textContent =
      `${rows.length.toLocaleString()} records • Ready`;

    message.textContent =
      "Enter PR / Complaint Number to search.";

  }catch(error){

    console.error(error);

    statusBox.textContent = "Unable to load PR SEARCH";
    statusBox.className = "sub error";

    message.innerHTML =
      `<span class="error">
        ${error.name === "AbortError"
          ? "Loading timed out. Please check Google Sheet access."
          : escapeHTML(error.message)}
      </span>`;
  }
}


/* ---------------- HEADER FINDER ---------------- */

function findColumn(possibleNames){

  for(const name of possibleNames){

    const wanted = normalize(name);

    const index = headers.findIndex(h =>
      normalize(h) === wanted
    );

    if(index !== -1) return index;
  }

  return -1;
}


/* ---------------- SEARCH ---------------- */

function doSearch(){

  if(!ready){

    message.innerHTML =
      `<span class="loading">Please wait. PR SEARCH is loading...</span>`;

    return;
  }

  const query = input.value.trim();

  if(!query){

    results.innerHTML = "";

    message.textContent =
      "Enter PR / Complaint Number to search.";

    return;
  }

  const q = compact(query);

  const matches = rows.filter(row => {

    return row.some(cell =>
      compact(cell).includes(q)
    );

  });

  renderResults(matches);
}


/* ---------------- REPEATED DAMAGE ---------------- */

function getRepeatedHistory(currentRow){

  const placeIndex = findColumn([
    "PLACE OF DAMAGE",
    "Place of Damage"
  ]);

  if(placeIndex === -1){
    return [];
  }

  const place = compact(currentRow[placeIndex]);

  if(!place){
    return [];
  }

  const samePlace = rows.filter(row =>
    compact(row[placeIndex]) === place
  );

  if(samePlace.length <= 1){
    return samePlace;
  }

  const dateIndex = findColumn([
    "PR DATE",
    "PR Date",
    "DATE OF DAMAGE",
    "Date of Damage"
  ]);

  samePlace.sort((a,b)=>{

    const da = dateIndex >= 0
      ? new Date(a[dateIndex] || 0).getTime()
      : 0;

    const db = dateIndex >= 0
      ? new Date(b[dateIndex] || 0).getTime()
      : 0;

    return da - db;
  });

  return samePlace;
}


/* ---------------- STATUS ---------------- */

function getStatus(row){

  const replacementIndex = findColumn([
    "REPLACEMENT DATE",
    "Replacement Date"
  ]);

  const issueIndex = findColumn([
    "ISSUE DATE",
    "Issue Date"
  ]);

  const driverIndex = findColumn([
    "DRIVER NAME",
    "Driver Name"
  ]);

  const mobileIndex = findColumn([
    "DRIVER MOBILE",
    "Driver Mobile"
  ]);

  const replacement =
    replacementIndex >= 0
      ? String(row[replacementIndex] || "").trim()
      : "";

  const issue =
    issueIndex >= 0
      ? String(row[issueIndex] || "").trim()
      : "";

  const driver =
    driverIndex >= 0
      ? String(row[driverIndex] || "").trim()
      : "";

  const mobile =
    mobileIndex >= 0
      ? String(row[mobileIndex] || "").trim()
      : "";

  if(replacement){

    return {
      type:"installed",
      title:"🎉 Congratulations! Your Transformer is installed.",
      detail:`Replacement Date: ${replacement}`
    };
  }

  if(issue){

    return {
      type:"issued",
      title:"⚡ Your Transformer is issued by Workshop.",
      detail:
        `Issue Date: ${issue}` +
        (driver ? `<br>Driver: ${escapeHTML(driver)}` : "") +
        (mobile ? `<br>Mobile: ${escapeHTML(mobile)}` : "") +
        `<br><b>Please contact Driver for Installation.</b>`
    };
  }

  return {
    type:"pending",
    title:"Transformer replacement pending.",
    detail:"No Issue Date / Replacement Date found."
  };
}


/* ---------------- RENDER ---------------- */

function renderResults(matches){

  results.innerHTML = "";

  if(!matches.length){

    message.innerHTML =
      `<b>No record found.</b><br>
       <span class="small">Try PR Number, Complaint Number, DID No or another value.</span>`;

    return;
  }

  message.textContent =
    `${matches.length} matching record${matches.length > 1 ? "s" : ""} found`;

  matches.slice(0,50).forEach(row=>{

    const card = document.createElement("div");
    card.className = "card";

    const prIndex = findColumn([
      "PR NO",
      "PR No",
      "PR NUMBER"
    ]);

    const prDateIndex = findColumn([
      "PR DATE",
      "PR Date"
    ]);

    const placeIndex = findColumn([
      "PLACE OF DAMAGE",
      "Place of Damage"
    ]);

    const capacityIndex = findColumn([
      "CAPACITY",
      "CAPACITY IN KVA"
    ]);

    const complaintIndex = findColumn([
      "COMPLAIN NUMBER",
      "COMPLAINT NUMBER",
      "COMPLAINT NO"
    ]);

    const damageDateIndex = findColumn([
      "DATE OF DAMAGE",
      "Date of Damage"
    ]);

    const prNo = prIndex >= 0 ? row[prIndex] : "";
    const prDate = prDateIndex >= 0 ? row[prDateIndex] : "";

    const history = getRepeatedHistory(row);
    const repeated = history.length > 1;

    const status = getStatus(row);

    let html = `
      <div class="cardHead">

        <div>
          <div class="pr">
            PR No: ${escapeHTML(prNo || "—")}
          </div>

          <div class="small">
            PR Date: ${escapeHTML(prDate || "—")}
          </div>
        </div>

        <div class="badge ${status.type}">
          ${status.type === "installed"
            ? "INSTALLED"
            : status.type === "issued"
              ? "ISSUED"
              : "PENDING"}
        </div>

      </div>
    `;

    if(status.type === "installed"){

      html += `
        <div class="alert ok">
          ${status.title}<br>
          ${status.detail}
        </div>
      `;

    }else if(status.type === "issued"){

      html += `
        <div class="alert issue">
          ${status.title}<br>
          ${status.detail}
        </div>
      `;

    }else{

      html += `
        <div class="alert">
          ${status.title}<br>
          ${status.detail}
        </div>
      `;
    }


    if(repeated){

      html += `
        <div class="alert">
          ⚠️ It Damaged ${history.length} Times.<br>
          Please Ensure Increasing Capacity if Overloaded.
        </div>

        <div class="history">

          <div class="historyTitle">
            Repeated Damage History
          </div>
      `;

      history.forEach((item,index)=>{

        const itemPr =
          prIndex >= 0 ? item[prIndex] : "";

        const itemDate =
          prDateIndex >= 0
            ? item[prDateIndex]
            : damageDateIndex >= 0
              ? item[damageDateIndex]
              : "";

        html += `
          <div class="historyRow">
            <b>${ordinal(index+1)} Time</b>
            — PR No: ${escapeHTML(itemPr || "—")}
            <br>
            <span class="small">
              Date: ${escapeHTML(itemDate || "—")}
            </span>
          </div>
        `;
      });

      html += `</div>`;

    }else{

      html += `
        <div class="alert ok">
          ✓ Not a repeated damage
        </div>
      `;
    }


    html += `<div class="infoGrid">`;

    const important = [
      ["DATE OF DAMAGE",["DATE OF DAMAGE","Date of Damage"]],
      ["PLACE OF DAMAGE",["PLACE OF DAMAGE","Place of Damage"]],
      ["DID NO",["DID NO","DID NO."]],
      ["CAPACITY",["CAPACITY","CAPACITY IN KVA"]],
      ["COMPLAINT NUMBER",["COMPLAIN NUMBER","COMPLAINT NUMBER"]],
      ["COMPLAINT DATE",["COMPLAIN DATE","COMPLAINT DATE"]],
      ["JE NAME",["JE Name","JE NAME"]],
      ["JE MOBILE",["JE Mobile","JE MOBILE"]],
      ["ISSUED TO FIRM",["ISSUED TO FIRM"]],
      ["ISSUE DATE",["ISSUE DATE","Issue Date"]],
      ["DRIVER NAME",["DRIVER NAME","Driver Name"]],
      ["DRIVER MOBILE",["DRIVER MOBILE","Driver Mobile"]],
      ["REPLACEMENT DATE",["REPLACEMENT DATE","Replacement Date"]],
      ["TIME",["TIME"]],
      ["TX RETURN DATE",["TX Return Date","TX RETURN DATE"]],
      ["OBSERVATION DTC",["OBSERVATION DTC"]]
    ];

    important.forEach(item=>{

      const label = item[0];
      const index = findColumn(item[1]);

      if(index >= 0){

        const value = String(row[index] ?? "").trim();

        if(value){

          html += `
            <div class="item ${label === "PLACE OF DAMAGE" ? "full" : ""}">
              <div class="label">${label}</div>
              <div class="value">${escapeHTML(value)}</div>
            </div>
          `;
        }
      }
    });

    html += `</div>`;

    card.innerHTML = html;

    results.appendChild(card);
  });

  if(matches.length > 50){

    const more = document.createElement("div");

    more.className = "message";

    more.textContent =
      "Showing first 50 matching records.";

    results.appendChild(more);
  }
}


/* ---------------- HELPERS ---------------- */

function ordinal(n){

  if(n === 1) return "First";
  if(n === 2) return "Second";
  if(n === 3) return "Third";

  return n + "th";
}

function escapeHTML(value){

  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}


/* ---------------- EVENTS ---------------- */

button.addEventListener("click",doSearch);

input.addEventListener("keydown",e=>{

  if(e.key === "Enter"){
    doSearch();
  }

});

let timer;

input.addEventListener("input",()=>{

  clearTimeout(timer);

  timer = setTimeout(()=>{

    if(input.value.trim()){
      doSearch();
    }

  },180);

});


/* ---------------- START ---------------- */

loadSheet();
