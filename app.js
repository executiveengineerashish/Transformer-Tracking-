const SHEET_ID =
"1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
"1464518527";


let ALL_RECORDS = [];

let DAMAGE_HISTORY = {};

let searchTimer = null;


/* =====================================================
   COLUMN POSITIONS
   ===================================================== */

const COL = {

  SN:0,

  WORKSHOP:1,

  DIVISION:2,

  SUBDIVISION:3,

  SUBSTATION:4,

  FEEDER:5,

  DATE_DAMAGE:6,

  PLACE_DAMAGE:7,

  DID_NO:8,

  CAPACITY:9,

  COMPLAINT_NO:10,

  COMPLAINT_DATE:11,

  PR_NO:12,

  PR_DATE:13,

  JE_NAME:14,

  JE_MOBILE:15,

  ISSUED_TO_FIRM:16,

  ISSUE_DATE:17,

  DRIVER_NAME:18,

  DRIVER_MOBILE:19,

  REPLACEMENT_DATE:20,

  TIME:21,

  TX_RETURN_DATE:22,

  OBSERVATION:23

};


/* =====================================================
   BASIC
   ===================================================== */

function $(id){

  return document.getElementById(id);

}


function clean(v){

  return String(v ?? "").trim();

}


function normalize(v){

  return String(v ?? "")
    .toLowerCase()
    .replace(
      /[\s\-\/\\().,\[\]{}:;_]+/g,
      ""
    )
    .trim();

}


/* =====================================================
   LOCATION NORMALIZATION
   ===================================================== */

function normalizeLocation(v){

  let t =
    String(v ?? "").toLowerCase();

  /*
    Remove all numbers.
  */

  t =
    t.replace(/[0-9]+/g," ");


  /*
    Remove brackets.
  */

  t =
    t.replace(
      /[\(\)\[\]\{\}]/g,
      " "
    );


  /*
    Remove punctuation.
  */

  t =
    t.replace(
      /[-_/\\.,:;]+/g,
      " "
    );


  t =
    t.replace(
      /\s+/g,
      " "
    ).trim();


  return normalize(t);

}


/* =====================================================
   CAPACITY NORMALIZATION

   IMPORTANT:

   Location + Capacity are used together
   for repeated damage.
   ===================================================== */

function normalizeCapacity(v){

  return String(v ?? "")
    .toLowerCase()
    .replace(/kva/g,"")
    .replace(/[^0-9.]/g,"")
    .trim();

}


/* =====================================================
   DATE PARSER
   ===================================================== */

function parseDate(v){

  if(
    v === null ||
    v === undefined ||
    v === ""
  ){

    return null;

  }


  const s =
    String(v).trim();


  let m =
    s.match(
      /Date\(\s*(\d{4})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})/
    );


  if(m){

    return new Date(
      +m[1],
      +m[2],
      +m[3]
    );

  }


  m =
    s.match(
      /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/
    );


  if(m){

    return new Date(
      +m[1],
      +m[2]-1,
      +m[3]
    );

  }


  m =
    s.match(
      /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/
    );


  if(m){

    return new Date(
      +m[3],
      +m[2]-1,
      +m[1]
    );

  }


  const d =
    new Date(s);


  return isNaN(d.getTime())
    ? null
    : d;

}


/* =====================================================
   MONTH
   ===================================================== */

function isCurrentMonth(v){

  const d =
    parseDate(v);

  const now =
    new Date();


  return !!d &&
    d.getFullYear() ===
      now.getFullYear() &&

    d.getMonth() ===
      now.getMonth();

}


/* =====================================================
   HTML SAFETY
   ===================================================== */

function escapeHtml(v){

  return String(v ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}


/* =====================================================
   STATUS MESSAGE
   ===================================================== */

function setStatus(
  message,
  error=false
){

  const e =
    $("searchStatus");

  if(!e){
    return;
  }


  e.textContent =
    message;


  e.className =
    "search-status " +
    (
      error
      ? "error"
      : "ready"
    );

}


/* =====================================================
   LOAD GOOGLE SHEET
   ===================================================== */

function loadSheet(){

  setStatus(
    "Loading transformer records...",
    false
  );


  const callbackName =
    "transformerCallback902";


  try{

    delete window[callbackName];

  }catch(e){}


  window[callbackName] =
    function(response){

      try{

        if(
          !response ||
          !response.table ||
          !response.table.rows
        ){

          throw new Error(
            "Invalid Google Sheet response"
          );

        }


        processSheetData(
          response
        );


      }catch(error){

        console.error(
          "Sheet error:",
          error
        );


        setStatus(
          "Error reading PR SEARCH data",
          true
        );

      }


      try{

        delete window[callbackName];

      }catch(e){}

    };


  const url =

    "https://docs.google.com/spreadsheets/d/" +

    SHEET_ID +

    "/gviz/tq" +

    "?gid=" +
    SHEET_GID +

    "&range=A3:X" +

    "&headers=1" +

    "&tqx=out%3Ajson%3BresponseHandler%3A" +

    callbackName +

    "&_=" +

    Date.now();


  const oldScript =
    document.getElementById(
      "googleSheetScript902"
    );


  if(oldScript){

    oldScript.remove();

  }


  const script =
    document.createElement(
      "script"
    );


  script.id =
    "googleSheetScript902";


  script.src =
    url;


  script.async =
    true;


  script.onerror =
    function(){

      setStatus(
        "Google Sheet connection failed. Refresh page.",
        true
      );

    };


  document.head.appendChild(
    script
  );


  setTimeout(
    function(){

      if(
        !ALL_RECORDS.length
      ){

        setStatus(
          "Google Sheet loading timeout. Refresh page.",
          true
        );

      }

    },
    25000
  );

}


/* =====================================================
   PROCESS DATA
   ===================================================== */

function processSheetData(
  response
){

  ALL_RECORDS = [];


  const rows =
    response.table.rows || [];


  rows.forEach(
    function(row,index){

      /*
        Row 3 = header
        Data begins Row 4.
      */

      if(index === 0){
        return;
      }


      const record = [];

      const raw = [];


      for(
        let i=0;
        i<24;
        i++
      ){

        const cell =
          row.c?.[i];


        if(!cell){

          record.push("");
          raw.push("");

          continue;

        }


        const formatted =

          cell.f !== undefined &&
          cell.f !== null

          ?

          String(cell.f)

          :

          cell.v !== undefined &&
          cell.v !== null

          ?

          String(cell.v)

          :

          "";


        const value =

          cell.v !== undefined &&
          cell.v !== null

          ?

          String(cell.v)

          :

          "";


        record.push(
          formatted
        );


        raw.push(
          value
        );

      }


      if(
        record.every(
          x => clean(x) === ""
        )
      ){

        return;

      }


      record.__raw =
        raw;


      record.__sheetRow =
        index + 4;


      /*
        Search everything.
      */

      record.__search =
        normalize(
          record.join(" ")
        );


      ALL_RECORDS.push(
        record
      );

    }
  );


  /*
    Build repeated history.
  */

  buildDamageHistory();


  /*
    BUILD DASHBOARD HERE.

    This is the important fix.
  */

  buildDashboard();


  setStatus(

    ALL_RECORDS.length
      .toLocaleString("en-IN") +

    " transformer records loaded • Search ready",

    false

  );

}


/* =====================================================
   REPEATED DAMAGE HISTORY
   ===================================================== */

function buildDamageHistory(){

  DAMAGE_HISTORY = {};


  ALL_RECORDS.forEach(
    function(record){

      const location =
        normalizeLocation(
          record[COL.PLACE_DAMAGE]
        );


      const capacity =
        normalizeCapacity(
          record[COL.CAPACITY]
        );


      if(
        !location ||
        !capacity
      ){

        return;

      }


      /*
        SAME LOCATION + SAME CAPACITY
      */

      const key =
        location +
        "||" +
        capacity;


      if(
        !DAMAGE_HISTORY[key]
      ){

        DAMAGE_HISTORY[key] =
          [];

      }


      DAMAGE_HISTORY[key].push(
        record
      );

    }
  );


  Object.keys(
    DAMAGE_HISTORY
  ).forEach(
    function(key){

      DAMAGE_HISTORY[key].sort(
        function(a,b){

          const da =
            parseDate(
              a[COL.PR_DATE]
            ) ||

            parseDate(
              a[COL.DATE_DAMAGE]
            ) ||

            new Date(0);


          const db =
            parseDate(
              b[COL.PR_DATE]
            ) ||

            parseDate(
              b[COL.DATE_DAMAGE]
            ) ||

            new Date(0);


          return da-db;

        }
      );

    }
  );

}


/* =====================================================
   RECORD STATUS
   ===================================================== */

function getStatus(record){

  const issue =
    clean(
      record[COL.ISSUE_DATE]
    );


  const replacement =
    clean(
      record[COL.REPLACEMENT_DATE]
    );


  const returned =
    clean(
      record[COL.TX_RETURN_DATE]
    );


  if(!issue){

    return "PENDING_ISSUE";

  }


  if(
    issue &&
    !replacement
  ){

    return "REPLACEMENT_PENDING";

  }


  if(
    replacement &&
    !returned
  ){

    return "RETURN_PENDING";

  }


  return "COMPLETED";

}


/* =====================================================
   DASHBOARD
   ===================================================== */

function buildDashboard(){

  if(!ALL_RECORDS.length){

    return;

  }


  const now =
    new Date();


  const monthName =
    now.toLocaleString(
      "en-IN",
      {
        month:"long",
        year:"numeric"
      }
    );


  $("dashboardMonth").textContent =
    monthName;


  /*
    CURRENT MONTH IS BASED ON PR DATE.
  */

  const currentMonth =
    ALL_RECORDS.filter(
      function(record){

        return isCurrentMonth(
          record[COL.PR_DATE]
        );

      }
    );


  let totalPR =
    currentMonth.length;


  let issued = 0;

  let pendingIssue = 0;

  let replacementPending = 0;

  let returnPending = 0;


  /*
    WORKSHOP
  */

  const workshopMap = {};


  /*
    CAPACITY
  */

  const capacityMap = {};


  /*
    AGEING
  */

  let age24 = 0;
  let age72 = 0;
  let age7 = 0;


  /*
    TODAY ACTION
  */

  let action24 = 0;
  let action72 = 0;
  let action7 = 0;


  currentMonth.forEach(
    function(record){

      const status =
        getStatus(record);


      if(
        clean(
          record[COL.ISSUE_DATE]
        )
      ){

        issued++;

      }


      if(
        status ===
        "PENDING_ISSUE"
      ){

        pendingIssue++;


        /*
          WORKSHOP
        */

        const workshop =
          clean(
            record[COL.WORKSHOP]
          ) || "OTHER";


        workshopMap[workshop] =
          (
            workshopMap[workshop] ||
            0
          ) + 1;


        /*
          CAPACITY
        */

        const cap =
          clean(
            record[COL.CAPACITY]
          ) || "Unknown";


        capacityMap[cap] =
          (
            capacityMap[cap] ||
            0
          ) + 1;


        /*
          AGEING BASED ON PR DATE
        */

        const prDate =
          parseDate(
            record[COL.PR_DATE]
          );


        if(prDate){

          const age =
            (
              now.getTime() -
              prDate.getTime()
            ) /
            86400000;


          if(age > 24/24){

            age24++;

          }


          if(age > 72/24){

            age72++;

          }


          if(age > 7){

            age7++;

          }

        }

      }


      if(
        status ===
        "REPLACEMENT_PENDING"
      ){

        replacementPending++;

      }


      if(
        status ===
        "RETURN_PENDING"
      ){

        returnPending++;

      }

    }
  );


  /*
    TODAY'S ACTION:

    Issue Date ageing for records
    where transformer has been issued
    but replacement is pending.
  */

  currentMonth.forEach(
    function(record){

      const issueDate =
        parseDate(
          record[COL.ISSUE_DATE]
        );


      const replacement =
        clean(
          record[COL.REPLACEMENT_DATE]
        );


      if(
        issueDate &&
        !replacement
      ){

        const hours =
          (
            now.getTime() -
            issueDate.getTime()
          ) /
          3600000;


        if(hours > 24){

          action24++;

        }


        if(hours > 72){

          action72++;

        }


        if(hours > 168){

          action7++;

        }

      }

    }
  );


  /*
    SET MAIN COUNTERS
  */

  $("totalPR").textContent =
    totalPR.toLocaleString("en-IN");


  $("totalIssued").textContent =
    issued.toLocaleString("en-IN");


  $("totalPendingIssue").textContent =
    pendingIssue.toLocaleString("en-IN");


  $("totalReplacementPending").textContent =
    replacementPending.toLocaleString("en-IN");


  $("totalReturnPending").textContent =
    returnPending.toLocaleString("en-IN");


  $("issue24").textContent =
    action24;


  $("issue72").textContent =
    action72;


  $("issue7").textContent =
    action7;


  /*
    BUILD SECTIONS
  */

  buildWorkshopDashboard(
    workshopMap
  );


  buildCapacityDashboard(
    capacityMap
  );


  buildAgeingDashboard(
    age24,
    age72,
    age7
  );


  buildRepeatedDashboard();

}


/* =====================================================
   WORKSHOP DASHBOARD
   ===================================================== */

function buildWorkshopDashboard(
  map
){

  const box =
    $("workshopDashboard");


  const entries =
    Object.entries(map)
      .sort(
        function(a,b){
          return b[1]-a[1];
        }
      );


  if(!entries.length){

    box.innerHTML =
      '<div class="no-dashboard-data">' +
      'No pending transformer to issue' +
      '</div>';

    return;

  }


  const max =
    entries[0][1];


  box.innerHTML =

    '<div class="dashboard-list">' +

    entries.map(
      function(item){

        const name =
          escapeHtml(
            item[0]
          );


        const count =
          item[1];


        const width =
          max
          ? Math.max(
              3,
              (count/max)*100
            )
          : 0;


        return (

          '<div class="dashboard-row">' +

          '<div class="dashboard-row-head">' +

          '<span>' +
          name +
          '</span>' +

          '<span class="dashboard-count">' +
          count +
          '</span>' +

          '</div>' +

          '<div class="progress-track">' +

          '<div class="progress-bar" ' +

          'style="width:' +
          width +
          '%">' +

          '</div>' +

          '</div>' +

          '</div>'

        );

      }
    ).join("") +

    '</div>';

}


/* =====================================================
   CAPACITY DASHBOARD
   ===================================================== */

function buildCapacityDashboard(
  map
){

  const box =
    $("capacityDashboard");


  const entries =
    Object.entries(map)
      .sort(
        function(a,b){

          return (
            parseFloat(a[0]) -
            parseFloat(b[0])
          );

        }
      );


  if(!entries.length){

    box.innerHTML =
      '<div class="no-dashboard-data">' +
      'No pending transformer to issue' +
      '</div>';

    return;

  }


  box.innerHTML =

    '<div class="capacity-grid">' +

    entries.map(
      function(item){

        return (

          '<div class="capacity-item">' +

          '<span>' +

          escapeHtml(
            item[0]
          ) +

          ' kVA</span>' +

          '<span class="capacity-value">' +

          item[1] +

          '</span>' +

          '</div>'

        );

      }
    ).join("") +

    '</div>';

}


/* =====================================================
   AGEING DASHBOARD
   ===================================================== */

function buildAgeingDashboard(
  age24,
  age72,
  age7
){

  const box =
    $("ageingDashboard");


  box.innerHTML =

    '<div class="ageing-grid">' +

    '<div class="ageing-item age-green">' +

    '<div class="ageing-label">' +
    'Pending &gt; 24 Hours' +
    '</div>' +

    '<div class="ageing-number">' +
    age24 +
    '</div>' +

    '</div>' +


    '<div class="ageing-item age-yellow">' +

    '<div class="ageing-label">' +
    'Pending &gt; 72 Hours' +
    '</div>' +

    '<div class="ageing-number">' +
    age72 +
    '</div>' +

    '</div>' +


    '<div class="ageing-item age-orange">' +

    '<div class="ageing-label">' +
    'Pending &gt; 7 Days' +
    '</div>' +

    '<div class="ageing-number">' +
    age7 +
    '</div>' +

    '</div>' +


    '<div class="ageing-item age-red">' +

    '<div class="ageing-label">' +
    'Total Ageing' +
    '</div>' +

    '<div class="ageing-number">' +

    age24 +

    '</div>' +

    '</div>' +

    '</div>';

}


/* =====================================================
   REPEATED DAMAGE DASHBOARD
   ===================================================== */

function buildRepeatedDashboard(){

  const box =
    $("repeatedDashboard");


  /*
    DAMAGE_HISTORY already uses:

    Location + Capacity

    so different capacities are NOT mixed.
  */

  const groups =
    Object.entries(
      DAMAGE_HISTORY
    )
    .filter(
      function(item){

        return item[1].length > 1;

      }
    )
    .sort(
      function(a,b){

        return (
          b[1].length -
          a[1].length
        );

      }
    );


  if(!groups.length){

    box.innerHTML =
      '<div class="no-dashboard-data">' +
      'No repeated damage found' +
      '</div>';

    return;

  }


  /*
    Show all repeated groups.
  */

  box.innerHTML =
    groups.map(
      function(group){

        const records =
          group[1];


        const first =
          records[0];


        const location =
          clean(
            first[COL.PLACE_DAMAGE]
          ) ||
          "-";


        const capacity =
          clean(
            first[COL.CAPACITY]
          ) ||
          "-";


        return (

          '<div class="repeated-dashboard-item">' +

          '<div class="repeated-dashboard-title">' +

          '🔄 ' +

          escapeHtml(
            location
          ) +

          ' — ' +

          records.length +

          ' Times' +

          '</div>' +

          '<div class="repeated-dashboard-detail">' +

          'Capacity: ' +

          '<span class="repeated-capacity">' +

          escapeHtml(
            capacity
          ) +

          ' kVA</span>' +

          '</div>' +

          '<div class="repeated-dashboard-detail">' +

          'PR Nos: ' +

          records.map(
            function(r){

              return escapeHtml(
                clean(
                  r[COL.PR_NO]
                ) || "-"
              );

            }
          ).join(", ") +

          '</div>' +

          '</div>'

        );

      }
    ).join("");

}


/* =====================================================
   SEARCH
   ===================================================== */

function filterRecords(){

  const search =
    normalize(
      $("searchInput").value
    );


  return ALL_RECORDS.filter(
    function(record){

      if(
        search &&
        !record.__search.includes(
          search
        )
      ){

      