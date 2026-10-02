const SHEET_ID =
"1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
"1464518527";

let ALL_RECORDS = [];
let DAMAGE_HISTORY = {};
let searchTimer = null;

/*
  PR SEARCH columns
  A=0 ... X=23
*/

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


/* ---------------- BASIC FUNCTIONS ---------------- */

function $(id){
  return document.getElementById(id);
}

function clean(v){
  return String(v ?? "").trim();
}


/*
  General search normalization.

  Example:
  810-172-5692
  8101725692
  810 172 5692

  all become same searchable value.
*/

function normalize(v){

  return String(v ?? "")
    .toLowerCase()
    .replace(/[\s\-\/\\().,\[\]{}:;_]+/g,"")
    .trim();

}


/*
  Location normalization.

  These will all become same location:

  SISREDI
  SISREDI 1
  1 SISREDI
  SISREDI (1)
  (1) SISREDI
  SISREDI [25]

  Numbers and punctuation are ignored.
*/

function normalizeLocation(v){

  let t = String(v ?? "").toLowerCase();

  t = t.replace(/[0-9]+/g," ");

  t = t.replace(/[\(\)\[\]\{\}]/g," ");

  t = t.replace(/[-_/\\.,:;]+/g," ");

  t = t.replace(/\s+/g," ").trim();

  return normalize(t);
}


/*
  CAPACITY IS PART OF THE REPEATED DAMAGE KEY.

  Therefore:

  SISREDI + 25 KVA
  SISREDI + 63 KVA

  are DIFFERENT groups.
*/

function normalizeCapacity(v){

  let t = String(v ?? "")
    .toLowerCase()
    .replace(/kva/g,"")
    .replace(/[^0-9.]/g,"")
    .trim();

  return t;
}


/* ---------------- DATE ---------------- */

function parseDate(v){

  if(
    v === null ||
    v === undefined ||
    v === ""
  ){
    return null;
  }

  const s = String(v).trim();

  let m = s.match(
    /Date\(\s*(\d{4})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})/
  );

  if(m){
    return new Date(
      +m[1],
      +m[2],
      +m[3]
    );
  }

  m = s.match(
    /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/
  );

  if(m){

    return new Date(
      +m[1],
      +m[2]-1,
      +m[3]
    );

  }

  m = s.match(
    /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/
  );

  if(m){

    return new Date(
      +m[3],
      +m[2]-1,
      +m[1]
    );

  }

  const d = new Date(s);

  return isNaN(d.getTime())
    ? null
    : d;
}


/* ---------------- HTML SAFETY ---------------- */

function escapeHtml(v){

  return String(v ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}


/* ---------------- STATUS ---------------- */

function setStatus(message,error=false){

  const e = $("searchStatus");

  if(!e) return;

  e.textContent = message;

  e.className =
    "search-status " +
    (error ? "error" : "ready");
}


/* ---------------- LOAD GOOGLE SHEET ---------------- */

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

  window[callbackName] = function(response){

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

      processSheetData(response);

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
    "?gid=" + SHEET_GID +
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
    document.createElement("script");

  script.id =
    "googleSheetScript902";

  script.src = url;

  script.async = true;

  script.onerror = function(){

    setStatus(
      "Google Sheet connection failed. Refresh page.",
      true
    );

  };

  document.head.appendChild(script);


  setTimeout(function(){

    if(!ALL_RECORDS.length){

      setStatus(
        "Google Sheet loading timeout. Refresh page.",
        true
      );

    }

  },25000);

}


/* ---------------- PROCESS SHEET ---------------- */

function processSheetData(response){

  ALL_RECORDS = [];

  const rows =
    response.table.rows || [];


  rows.forEach(function(row,index){

    /*
      Row 3 is header.
      Data starts from Row 4.
    */

    if(index === 0){
      return;
    }


    const record = [];

    const raw = [];


    for(let i=0;i<24;i++){

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
          ? String(cell.f)
          : cell.v !== undefined &&
            cell.v !== null
              ? String(cell.v)
              : "";


      const value =
        cell.v !== undefined &&
        cell.v !== null
          ? String(cell.v)
          : "";


      record.push(formatted);
      raw.push(value);

    }


    if(
      record.every(
        x => clean(x) === ""
      )
    ){

      return;

    }


    record.__raw = raw;

    /*
      Google Sheet row number.
      Header is row 3.
      First data row = 4.
    */

    record.__sheetRow =
      index + 4;


    /*
      Full row search index.
    */

    record.__search =
      normalize(
        record.join(" ")
      );


    ALL_RECORDS.push(record);

  });


  buildDamageHistory();

  setStatus(
    ALL_RECORDS.length.toLocaleString("en-IN") +
    " transformer records loaded • Search ready",
    false
  );

}


/* ---------------- REPEATED DAMAGE ---------------- */

function buildDamageHistory(){

  DAMAGE_HISTORY = {};


  ALL_RECORDS.forEach(function(record){

    const location =
      normalizeLocation(
        record[COL.PLACE_DAMAGE]
      );

    const capacity =
      normalizeCapacity(
        record[COL.CAPACITY]
      );


    /*
      IMPORTANT:
      Both location AND capacity are used.

      Therefore different capacity transformers
      are never mixed.
    */

    if(!location || !capacity){
      return;
    }


    const key =
      location +
      "||" +
      capacity;


    if(!DAMAGE_HISTORY[key]){
      DAMAGE_HISTORY[key] = [];
    }


    DAMAGE_HISTORY[key].push(record);

  });


  Object.keys(
    DAMAGE_HISTORY
  ).forEach(function(key){

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


        return da - db;

      }
    );

  });

}


/* ---------------- RECORD STATUS ---------------- */

function getStatus(record){

  const issueDate =
    clean(
      record[COL.ISSUE_DATE]
    );

  const replacementDate =
    clean(
      record[COL.REPLACEMENT_DATE]
    );

  const returnDate =
    clean(
      record[COL.TX_RETURN_DATE]
    );


  if(!issueDate){

    return "PENDING_ISSUE";

  }


  if(
    issueDate &&
    !replacementDate
  ){

    return "REPLACEMENT_PENDING";

  }


  if(
    replacementDate &&
    !returnDate
  ){

    return "RETURN_PENDING";

  }


  if(
    issueDate &&
    replacementDate &&
    returnDate
  ){

    return "COMPLETED";

  }


  return "PENDING_ISSUE";

}


/* ---------------- SEARCH ---------------- */

function filterRecords(){

  const input =
    $("searchInput");

  if(!input){
    return [];
  }


  const search =
    normalize(
      input.value
    );


  return ALL_RECORDS.filter(
    function(record){

      if(
        search &&
        !record.__search.includes(search)
      ){

        return false;

      }

      return true;

    }
  );

}


function performSearch(){

  const results =
    $("results");

  if(!results){
    return;
  }


  const query =
    $("searchInput").value.trim();


  if(!query){

    results.innerHTML = "";

    return;

  }


  renderResults(
    filterRecords()
  );

}


/* ---------------- RESULTS ---------------- */

function renderResults(records){

  const results =
    $("results");


  if(!records.length){

    results.innerHTML =
      '<div class="no-results">' +
      'No record found' +
      '</div>';

    return;

  }


  results.innerHTML =

    '<div class="result-count">' +

    records.length.toLocaleString("en-IN") +

    ' record(s) found' +

    '</div>' +

    records.map(
      function(record,index){

        return buildCard(
          record,
          index + 1
        );

      }
    ).join("");

}


/* ---------------- CARD ---------------- */

function buildCard(
  record,
  number
){

  const issueDate =
    clean(
      record[COL.ISSUE_DATE]
    );


  const replacementDate =
    clean(
      record[COL.REPLACEMENT_DATE]
    );


  const driver =
    clean(
      record[COL.DRIVER_NAME]
    );


  const mobile =
    clean(
      record[COL.DRIVER_MOBILE]
    );


  let statusHTML = "";


  /* INSTALLED */

  if(replacementDate){

    statusHTML =
      '<div class="status-box installed">' +

      '<strong>' +
      'Congratulations Your Transformer Installed' +
      '</strong>' +

      '<div>' +
      'Replacement Date: ' +
      escapeHtml(replacementDate) +
      '</div>' +

      '</div>';

  }


  /* ISSUED */

  else if(issueDate){

    const phone =
      mobile.replace(
        /[^\d+]/g,
        ""
      );


    statusHTML =

      '<div class="status-box issued">' +

      '<strong>' +
      'Your Transformer Issued by Workshop' +
      '</strong>' +

      '<div>' +
      'Please Contact Driver for Installation' +
      '</div>' +

      '<div class="status-detail">' +
      'Issue Date: ' +
      escapeHtml(issueDate) +
      '</div>' +


      (
        driver
          ?
          '<div class="status-detail">' +
          'Driver: ' +
          escapeHtml(driver) +
          '</div>'
          :
          ""
      ) +


      (
        mobile
          ?
          '<div class="status-detail">' +
          'Mobile: ' +
          escapeHtml(mobile) +
          '</div>' +

          buildDriverButtons(
            record,
            phone
          )
          :
          ""
      ) +

      '</div>';

  }


  /* PENDING */

  else{

    statusHTML =

      '<div class="status-box pending">' +

      '<strong>' +
      'Transformer Pending to Issue' +
      '</strong>' +

      '</div>';

  }


  /* ---------------- REPEATED DAMAGE ---------------- */

  const location =
    normalizeLocation(
      record[COL.PLACE_DAMAGE]
    );


  const capacity =
    normalizeCapacity(
      record[COL.CAPACITY]
    );


  /*
    CRITICAL FIX:

    Repeated damage requires:
      SAME normalized location
      AND
      SAME normalized capacity

    Example:

    SISREDI + 25
    SISREDI 1 + 25

    = SAME

    SISREDI + 25
    SISREDI + 63

    = DIFFERENT
  */

  let history = [];


  if(location && capacity){

    history =
      ALL_RECORDS.filter(
        function(item){

          return (

            normalizeLocation(
              item[COL.PLACE_DAMAGE]
            ) === location

            &&

            normalizeCapacity(
              item[COL.CAPACITY]
            ) === capacity

          );

        }
      );


    history.sort(
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


        return da - db;

      }
    );

  }


  let repeatedHTML = "";


  /*
    NO LIMIT.
    If 4, show 4.
    If 5, show 5.
    If 10, show 10.
  */

  if(history.length > 1){

    repeatedHTML =

      '<div class="repeated-box">' +

      '<div class="repeated-title">' +

      '🔁 It Damaged ' +
      history.length +
      ' times' +

      '</div>' +


      '<div class="repeated-warning">' +

      'Please Ensure Increasing Capacity if Overloaded' +

      '</div>' +


      history.map(
        function(item){

          return (

            '<div class="history-item">' +

            '<span>' +

            'PR: <strong>' +

            escapeHtml(
              item[COL.PR_NO] || "-"
            ) +

            '</strong>' +

            '</span>' +


            '<span>' +

            'Date: ' +

            escapeHtml(
              item[COL.PR_DATE] ||
              item[COL.DATE_DAMAGE] ||
              "-"
            ) +

            '</span>' +


            '<span>' +

            'Capacity: <strong>' +

            escapeHtml(
              item[COL.CAPACITY] || "-"
            ) +

            ' kVA</strong>' +

            '</span>' +


            '</div>'

          );

        }
      ).join("") +


      '</div>';

  }


  /* ---------------- DATA FIELDS ---------------- */

  const fields = [

    ["Workshop",
      record[COL.WORKSHOP]],

    ["Division",
      record[COL.DIVISION]],

    ["Subdivision",
      record[COL.SUBDIVISION]],

    ["Substation",
      record[COL.SUBSTATION]],

    ["Feeder",
      record[COL.FEEDER]],

    ["Date of Damage",
      record[COL.DATE_DAMAGE]],

    ["Place of Damage",
      record[COL.PLACE_DAMAGE]],

    ["DID No",
      record[COL.DID_NO]],

    ["Capacity",
      record[COL.CAPACITY]],

    ["Complaint Number",
      record[COL.COMPLAINT_NO]],

    ["Complaint Date",
      record[COL.COMPLAINT_DATE]],

    ["PR No",
      record[COL.PR_NO]],

    ["PR Date",
      record[COL.PR_DATE]],

    ["JE Name",
      record[COL.JE_NAME]],

    ["JE Mobile",
      record[COL.JE_MOBILE]],

    ["Issued to Firm",
      record[COL.ISSUED_TO_FIRM]],

    ["Issue Date",
      record[COL.ISSUE_DATE]],

    ["Driver Name",
      record[COL.DRIVER_NAME]],

    ["Driver Mobile",
      record[COL.DRIVER_MOBILE]],

    ["Replacement Date",
      record[COL.REPLACEMENT_DATE]],

    ["Time",
      record[COL.TIME]],

    ["TX Return Date",
      record[COL.TX_RETURN_DATE]],

    ["Observation DTC",
      record[COL.OBSERVATION]

  ];


  const dataHTML =

    fields.map(
      function(field){

        if(
          !clean(field[1])
        ){

          return "";

        }


        return (

          '<div class="data-row">' +

          '<div class="data-label">' +

          escapeHtml(
            field[0]
          ) +

          '</div>' +

          '<div class="data-value">' +

          escapeHtml(
            field[1]
          ) +

          '</div>' +

          '</div>'

        );

      }
    ).join("");


  return (

    '<div class="result-card">' +

    '<div class="card-number">' +

    '#' +
    number +
    ' • Sheet Row ' +
    record.__sheetRow +

    '</div>' +

    statusHTML +

    /*
      Repeated damage is immediately
      below status.
    */

    repeatedHTML +

    '<div class="data-section">' +

    dataHTML +

    '</div>' +

    '</div>'

  );

}


/* ---------------- DRIVER BUTTONS ---------------- */

function buildDriverButtons(
  record,
  phone
){

  const driver =
    clean(
      record[COL.DRIVER_NAME]
    ) || "Driver";


  const pr =
    clean(
      record[COL.PR_NO]
    ) || "-";


  const capacity =
    clean(
      record[COL.CAPACITY]
    ) || "-";


  const place =
    clean(
      record[COL.PLACE_DAMAGE]
    ) || "-";


  const workshop =
    clean(
      record[COL.WORKSHOP]
    ) || "-";


  /*
    WhatsApp message is prepared automatically.

    User only has to tap SEND inside WhatsApp.
  */

  const message =

`Namaste ${driver} ji,

Transformer PR No.: ${pr}
Capacity: ${capacity} kVA
Place: ${place}
Workshop: ${workshop}

The transformer has been issued from Workshop. Please arrange installation and confirm the installation status.

Thank you.`;


  let cleanPhone =
    String(phone || "")
      .replace(/\D/g,"");


  /*
    Indian mobile numbers:
    if 10 digits, add 91.
  */

  if(
    cleanPhone.length === 10
  ){

    cleanPhone =
      "91" +
      cleanPhone;

  }


  const whatsappURL =

    "https://wa.me/" +
    cleanPhone +
    "?text=" +
    encodeURIComponent(
      message
    );


  return (

    '<div class="driver-buttons">' +

    '<a class="call-driver" ' +
    'href="tel:' +
    escapeHtml(phone) +
    '">' +

    '📞 CALL DRIVER' +

    '</a>' +


    '<a class="whatsapp-driver" ' +

    'href="' +
    whatsappURL +
    '"' +

    'target="_blank" ' +
    'rel="noopener">' +

    '💬 WHATSAPP' +

    '</a>' +

    '</div>'

  );

}


/* ---------------- PAGE START ---------------- */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    const searchInput =
      $("searchInput");


    const clearBtn =
      $("clearBtn");


    /*
      AUTOMATIC SEARCH WHILE TYPING
    */

    searchInput.addEventListener(
      "input",
      function(){

        clearTimeout(
          searchTimer
        );


        searchTimer =
          setTimeout(
            function(){

              performSearch();

            },
            40
          );

      }
    );


    /*
      CLEAR BUTTON
    */

    clearBtn.addEventListener(
      "click",
      function(){

        searchInput.value = "";

        $("results").innerHTML = "";

        searchInput.focus();

      }
    );


    /*
      LOAD ALL PR SEARCH DATA ONCE
    */

    loadSheet();

  }
);