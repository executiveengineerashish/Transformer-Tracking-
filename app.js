/* =========================================================
   TRANSFORMER TRACKING
   GOOGLE SHEET -> PR SEARCH
   LOAD ONCE -> SEARCH LOCALLY
========================================================= */


/* =========================================================
   GOOGLE SHEET
========================================================= */

const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";


/*
   PR SEARCH:

   Row 3 = Header
   Row 4 onwards = Data

   A:AZ loaded so search can scan all available columns.
*/


/* =========================================================
   COLUMN MAP
   A = 0
========================================================= */

const COL = {

  SN: 0,

  WORKSHOP: 1,
  DIVISION: 2,
  SUBDIVISION: 3,
  SUBSTATION: 4,
  FEEDER: 5,

  DATE_DAMAGE: 6,
  PLACE_DAMAGE: 7,
  DID_NO: 8,
  CAPACITY: 9,

  COMPLAINT_NO: 10,
  COMPLAINT_DATE: 11,

  PR_NO: 12,
  PR_DATE: 13,

  JE_NAME: 14,
  JE_MOBILE: 15,

  ISSUED_TO_FIRM: 16,
  ISSUE_DATE: 17,

  DRIVER_NAME: 18,
  DRIVER_MOBILE: 19,

  REPLACEMENT_DATE: 20,
  TIME: 21,

  TX_RETURN_DATE: 22,
  OBSERVATION: 23

};


/* =========================================================
   GLOBAL DATA
========================================================= */

let ALL_RECORDS = [];

let DAMAGE_HISTORY = new Map();

let DATA_READY = false;

let LOAD_STARTED = false;


/* =========================================================
   DOM
========================================================= */

const searchInput =
  document.getElementById("searchInput");

const searchBtn =
  document.getElementById("searchBtn");

const searchStatus =
  document.getElementById("searchStatus");

const results =
  document.getElementById("results");


/* =========================================================
   NORMALIZE
========================================================= */

function normalize(value) {

  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s\-_/\\().,+]/g, "");
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function esc(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   VALUE
========================================================= */

function getValue(row, index) {

  if (!row) {
    return "";
  }

  return row[index] ?? "";
}


/* =========================================================
   DATE PARSER
========================================================= */

function dateScore(value) {

  const s =
    String(value ?? "").trim();

  if (!s) {
    return Number.MAX_SAFE_INTEGER;
  }

  /* dd/mm/yyyy */
  let m =
    s.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    );

  if (m) {

    return new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1])
    ).getTime();
  }

  /* yyyy-mm-dd */
  m =
    s.match(
      /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/
    );

  if (m) {

    return new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3])
    ).getTime();
  }

  const d =
    new Date(s);

  const t =
    d.getTime();

  return Number.isNaN(t)
    ? Number.MAX_SAFE_INTEGER
    : t;
}


/* =========================================================
   ORDINAL
========================================================= */

function ordinal(n) {

  const v = n % 100;

  if (v >= 11 && v <= 13) {
    return n + "th";
  }

  switch (n % 10) {

    case 1:
      return n + "st";

    case 2:
      return n + "nd";

    case 3:
      return n + "rd";

    default:
      return n + "th";
  }
}


/* =========================================================
   JSONP LOADER
========================================================= */

function loadGoogleSheet() {

  if (LOAD_STARTED) {
    return;
  }

  LOAD_STARTED = true;

  searchStatus.textContent =
    "Loading all transformer records...";

  searchStatus.className =
    "search-status loading";


  const callbackName =
    "transformerTrackingCallback_" +
    Date.now();


  const script =
    document.createElement("script");


  const timeout =
    setTimeout(() => {

      cleanup();

      LOAD_STARTED = false;

      searchStatus.textContent =
        "Unable to load PR SEARCH. Please refresh.";

      searchStatus.className =
        "search-status error";

    }, 30000);


  function cleanup() {

    clearTimeout(timeout);

    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }

    try {
      delete window[callbackName];
    } catch (e) {
      window[callbackName] = undefined;
    }
  }


  window[callbackName] =
    function(gviz) {

      cleanup();

      try {

        processGoogleData(gviz);

      } catch (error) {

        console.error(error);

        LOAD_STARTED = false;

        searchStatus.textContent =
          "Data processing error. Please refresh.";

        searchStatus.className =
          "search-status error";
      }

    };


  /*
    Row 3 is header.

    We start from A3.

    gid ensures only PR SEARCH tab is used.
  */

  const params = new URLSearchParams({

    gid:
      SHEET_GID,

    range:
      "A3:AZ",

    tq:
      "select *",

    tqx:
      "responseHandler:" +
      callbackName

  });


  script.src =
    "https://docs.google.com/spreadsheets/d/" +
    SHEET_ID +
    "/gviz/tq?" +
    params.toString();


  script.async = true;


  script.onerror =
    function() {

      cleanup();

      LOAD_STARTED = false;

      searchStatus.textContent =
        "Google Sheet connection failed.";

      searchStatus.className =
        "search-status error";
    };


  document.head.appendChild(script);
}


/* =========================================================
   PROCESS GOOGLE DATA
========================================================= */

function processGoogleData(gviz) {

  if (
    !gviz ||
    !gviz.table ||
    !Array.isArray(gviz.table.rows)
  ) {

    throw new Error(
      "Invalid Google Sheet response"
    );
  }


  const rows =
    gviz.table.rows;


  ALL_RECORDS = [];


  /*
    gviz rows start after the header because
    range=A3:AZ and headers are automatically detected.
  */

  for (
    let i = 0;
    i < rows.length;
    i++
  ) {

    const gRow =
      rows[i];


    const cells =
      gRow.c || [];


    const record =
      new Array(52).fill("");


    for (
      let c = 0;
      c < record.length;
      c++
    ) {

      const cell =
        cells[c];


      if (!cell) {
        record[c] = "";
        continue;
      }


      /*
        f = formatted value
        v = raw value
      */

      record[c] =
        cell.f ??
        cell.v ??
        "";
    }


    /*
      Ignore completely empty rows.
    */

    const hasData =
      record.some(
        value =>
          String(value ?? "").trim() !== ""
      );


    if (!hasData) {
      continue;
    }


    /*
      Search index.

      All loaded columns are included.
    */

    record.__search =
      normalize(
        record.join(" ")
      );


    /*
      Keep original row position.
    */

    record.__sheetRow =
      i + 4;


    ALL_RECORDS.push(record);
  }


  buildDamageHistory();


  DATA_READY = true;


  searchStatus.textContent =
    ALL_RECORDS.length.toLocaleString() +
    " transformer records loaded • Search ready";

  searchStatus.className =
    "search-status ready";


  console.log(
    "Transformer Tracking loaded:",
    ALL_RECORDS.length
  );
}


/* =========================================================
   DAMAGE HISTORY
========================================================= */

function buildDamageHistory() {

  DAMAGE_HISTORY =
    new Map();


  for (
    const row of ALL_RECORDS
  ) {

    const place =
      normalize(
        getValue(
          row,
          COL.PLACE_DAMAGE
        )
      );


    /*
      If place is blank, do not create
      a repeated-damage group.
    */

    if (!place) {
      continue;
    }


    if (
      !DAMAGE_HISTORY.has(place)
    ) {

      DAMAGE_HISTORY.set(
        place,
        []
      );
    }


    DAMAGE_HISTORY
      .get(place)
      .push(row);
  }


  /*
    Sort each history by damage/PR date.

    If dates are unavailable, original order
    is retained.
  */

  for (
    const history of DAMAGE_HISTORY.values()
  ) {

    history.sort(
      (a, b) => {

        const aDate =
          dateScore(
            getValue(
              a,
              COL.PR_DATE
            ) ||
            getValue(
              a,
              COL.DATE_DAMAGE
            )
          );


        const bDate =
          dateScore(
            getValue(
              b,
              COL.PR_DATE
            ) ||
            getValue(
              b,
              COL.DATE_DAMAGE
            )
          );


        if (aDate === bDate) {

          return (
            (a.__sheetRow || 0) -
            (b.__sheetRow || 0)
          );
        }


        return aDate - bDate;
      }
    );
  }
}


/* =========================================================
   SEARCH
========================================================= */

function performSearch() {

  if (!DATA_READY) {

    searchStatus.textContent =
      "Please wait. Records are still loading...";

    searchStatus.className =
      "search-status loading";

    return;
  }


  const raw =
    searchInput.value;


  const query =
    normalize(raw);


  if (!query) {

    results.innerHTML = "";

    searchStatus.textContent =
      ALL_RECORDS.length.toLocaleString() +
      " transformer records loaded • Enter PR / Complaint Number";

    searchStatus.className =
      "search-status ready";

    return;
  }


  /*
    LOCAL SEARCH ONLY.

    No Google request here.
  */

  const found =
    [];


  for (
    let i = 0;
    i < ALL_RECORDS.length;
    i++
  ) {

    const record =
      ALL_RECORDS[i];


    if (
      record.__search &&
      record.__search.includes(query)
    ) {

      found.push(record);
    }
  }


  renderResults(found);
}


/* =========================================================
   RENDER RESULTS
========================================================= */

function renderResults(records) {

  if (!records.length) {

    results.innerHTML = `
      <div class="empty-box">
        No matching transformer record found.
      </div>
    `;

    searchStatus.textContent =
      "0 record(s) found";

    searchStatus.className =
      "search-status error";

    return;
  }


  searchStatus.textContent =
    records.length +
    " record(s) found";

  searchStatus.className =
    "search-status ready";


  let html = "";


  /*
    No artificial limit on search results.
  */

  for (
    let i = 0;
    i < records.length;
    i++
  ) {

    html +=
      renderCard(
        records[i],
        i + 1
      );
  }


  results.innerHTML =
    html;
}


/* =========================================================
   RESULT CARD
========================================================= */

function renderCard(row, cardNumber) {

  const workshop =
    getValue(
      row,
      COL.WORKSHOP
    );

  const division =
    getValue(
      row,
      COL.DIVISION
    );

  const subdivision =
    getValue(
      row,
      COL.SUBDIVISION
    );

  const substation =
    getValue(
      row,
      COL.SUBSTATION
    );

  const feeder =
    getValue(
      row,
      COL.FEEDER
    );

  const dateDamage =
    getValue(
      row,
      COL.DATE_DAMAGE
    );

  const place =
    getValue(
      row,
      COL.PLACE_DAMAGE
    );

  const didNo =
    getValue(
      row,
      COL.DID_NO
    );

  const capacity =
    getValue(
      row,
      COL.CAPACITY
    );

  const complaintNo =
    getValue(
      row,
      COL.COMPLAINT_NO
    );

  const complaintDate =
    getValue(
      row,
      COL.COMPLAINT_DATE
    );

  const prNo =
    getValue(
      row,
      COL.PR_NO
    );

  const prDate =
    getValue(
      row,
      COL.PR_DATE
    );

  const jeName =
    getValue(
      row,
      COL.JE_NAME
    );

  const jeMobile =
    getValue(
      row,
      COL.JE_MOBILE
    );

  const issuedFirm =
    getValue(
      row,
      COL.ISSUED_TO_FIRM
    );

  const issueDate =
    getValue(
      row,
      COL.ISSUE_DATE
    );

  const driverName =
    getValue(
      row,
      COL.DRIVER_NAME
    );

  const driverMobile =
    getValue(
      row,
      COL.DRIVER_MOBILE
    );

  const replacementDate =
    getValue(
      row,
      COL.REPLACEMENT_DATE
    );

  const time =
    getValue(
      row,
      COL.TIME
    );

  const returnDate =
    getValue(
      row,
      COL.TX_RETURN_DATE
    );

  const observation =
    getValue(
      row,
      COL.OBSERVATION
    );


  /* =====================================
     STATUS
  ===================================== */

  let statusHTML = "";


  if (
    String(
      replacementDate
    ).trim()
  ) {

    statusHTML = `
      <div class="status-box installed">

        🎉 Congratulations!
        Your Transformer installed.

        <br>

        Replacement Date:
        ${esc(replacementDate)}

      </div>
    `;

  }

  else if (
    String(
      issueDate
    ).trim()
  ) {

    statusHTML = `
      <div class="status-box issued">

        🔧 Your Transformer Issued by Workshop.
        Please Contact Driver for Installation.

        <br>

        Issue Date:
        ${esc(issueDate)}

        ${
          driverName
            ? `<br>Driver: ${esc(driverName)}`
            : ""
        }

        ${
          driverMobile
            ? `<br>Mobile: ${esc(driverMobile)}`
            : ""
        }

      </div>
    `;

  }

  else {

    statusHTML = `
      <div class="status-box pending">

        ⏳ Transformer Replacement Pending

      </div>
    `;
  }


  /* =====================================
     REPEATED DAMAGE
  ===================================== */

  const placeKey =
    normalize(place);


  const history =
    placeKey
      ? (
          DAMAGE_HISTORY.get(
            placeKey
          ) || []
        )
      : [];


  let repeatHTML;


  /*
    IMPORTANT:
    NO LIMIT.

    If history has 2, 3, 10, 20 records,
    ALL records will be displayed.
  */

  if (history.length <= 1) {

    repeatHTML = `
      <div class="repeat-box normal">

        Not a repeated damage

      </div>
    `;

  }

  else {

    let historyHTML = "";


    for (
      let i = 0;
      i < history.length;
      i++
    ) {

      const h =
        history[i];


      const hPR =
        getValue(
          h,
          COL.PR_NO
        );


      const hDate =
        getValue(
          h,
          COL.PR_DATE
        ) ||
        getValue(
          h,
          COL.DATE_DAMAGE
        );


      historyHTML += `
        <div class="repeat-row">

          <strong>
            ${ordinal(i + 1)} Time
          </strong>

          <span>
            PR No:
            ${esc(hPR || "-")}
            <br>

            Date:
            ${esc(hDate || "-")}
          </span>

        </div>
      `;
    }


    repeatHTML = `
      <div class="repeat-box repeated">

        <div class="repeat-title">

          It Damaged ${history.length} times

        </div>


        <div class="repeat-warning">

          Please Ensure Increasing Capacity
          if Overloaded

        </div>


        <div class="repeat-history">

          ${historyHTML}

        </div>

      </div>
    `;
  }


  /* =====================================
     DATA HTML
  ===================================== */

  return `
    <article class="result-card">

      <div class="card-top">

        <span class="card-number">
          Record #${cardNumber}
        </span>

        <span class="card-number">
          Row ${row.__sheetRow || "-"}
        </span>

      </div>


      ${statusHTML}


      <div class="card-row">
        <div class="field-label">
          Workshop
        </div>

        <div class="field-value">
          ${esc(workshop || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          Division
        </div>

        <div class="field-value">
          ${esc(division || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          Subdivision
        </div>

        <div class="field-value">
          ${esc(subdivision || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          Substation
        </div>

        <div class="field-value">
          ${esc(substation || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          Feeder
        </div>

        <div class="field-value">
          ${esc(feeder || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          Date of Damage
        </div>

        <div class="field-value">
          ${esc(dateDamage || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          Place of Damage
        </div>

        <div class="field-value">
          ${esc(place || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          DID No
        </div>

        <div class="field-value">
          ${esc(didNo || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          Capacity
        </div>

        <div class="field-value">
          ${esc(capacity || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          Complaint Number
        </div>

        <div class="field-value">
          ${esc(complaintNo || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          Complaint Date
        </div>

        <div class="field-value">
          ${esc(complaintDate || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          PR No
        </div>

        <div class="field-value">
          ${esc(prNo || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          PR Date
        </div>

        <div class="field-value">
          ${esc(prDate || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          JE Name
        </div>

        <div class="field-value">
          ${esc(jeName || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          JE Mobile
        </div>

        <div class="field-value">
          ${esc(jeMobile || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          Issued to Firm
        </div>

        <div class="field-value">
          ${esc(issuedFirm || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          Issue Date
        </div>

        <div class="field-value">
          ${esc(issueDate || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          Driver Name
        </div>

        <div class="field-value">
          ${esc(driverName || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          Driver Mobile
        </div>

        <div class="field-value">
          ${esc(driverMobile || "-")}
        </div>
      </div>


      <div class="card-row">
        <div class="field-label">
          Replacement Date
        </div>

     