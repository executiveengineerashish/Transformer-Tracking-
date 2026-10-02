/* =========================================================
   TRANSFORMER TRACKING
   FAST LOCAL SEARCH
   PR SEARCH SHEET
========================================================= */

const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";

let ALL_RECORDS = [];
let DAMAGE_HISTORY = new Map();
let DATA_READY = false;
let LOAD_STARTED = false;


/* =========================================================
   COLUMN POSITION
   A = 0
   X = 23
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
   GET VALUE
========================================================= */

function getValue(row, col) {

  return row && row[col] != null
    ? row[col]
    : "";
}


/* =========================================================
   ORDINAL
========================================================= */

function ordinal(n) {

  if (n % 100 >= 11 && n % 100 <= 13) {
    return n + "th";
  }

  if (n % 10 === 1) {
    return n + "st";
  }

  if (n % 10 === 2) {
    return n + "nd";
  }

  if (n % 10 === 3) {
    return n + "rd";
  }

  return n + "th";
}


/* =========================================================
   DATE SORT
========================================================= */

function dateScore(value) {

  const s =
    String(value ?? "").trim();

  if (!s) {
    return Number.MAX_SAFE_INTEGER;
  }

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

  return Number.isNaN(d.getTime())
    ? Number.MAX_SAFE_INTEGER
    : d.getTime();
}


/* =========================================================
   LOAD GOOGLE SHEET
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
    "ttCallback_" + Date.now();


  const script =
    document.createElement("script");


  let finished = false;


  const timeout =
    setTimeout(function() {

      if (finished) {
        return;
      }

      finished = true;

      cleanup();

      LOAD_STARTED = false;

      searchStatus.textContent =
        "Loading timed out. Please refresh the page.";

      searchStatus.className =
        "search-status error";

    }, 60000);


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
    function(response) {

      if (finished) {
        return;
      }

      finished = true;

      cleanup();

      try {

        processGoogleData(response);

      } catch (error) {

        console.error(error);

        LOAD_STARTED = false;

        searchStatus.textContent =
          "Data processing error.";

        searchStatus.className =
          "search-status error";
      }
    };


  /*
     IMPORTANT

     Only A:X is required.

     Row 3 = headers
     Row 4 onward = records
  */

  const url =
    "https://docs.google.com/spreadsheets/d/" +
    SHEET_ID +
    "/gviz/tq" +
    "?gid=" + encodeURIComponent(SHEET_GID) +
    "&range=A3:X" +
    "&headers=1" +
    "&tq=" + encodeURIComponent("select *") +
    "&tqx=" + encodeURIComponent(
      "responseHandler:" + callbackName
    );


  console.log(
    "Loading PR SEARCH:",
    url
  );


  script.src = url;

  script.async = true;


  script.onerror =
    function() {

      if (finished) {
        return;
      }

      finished = true;

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
   PROCESS DATA
========================================================= */

function processGoogleData(response) {

  if (
    !response ||
    !response.table ||
    !Array.isArray(response.table.rows)
  ) {

    throw new Error(
      "Invalid Google response"
    );
  }


  /*
     Check Google error response
  */

  if (
    response.status &&
    response.status !== "ok" &&
    response.status !== "warning"
  ) {

    const message =
      response.errors &&
      response.errors[0]
        ? response.errors[0].message
        : "Google Sheet error";

    throw new Error(message);
  }


  const rows =
    response.table.rows;


  ALL_RECORDS = [];


  for (
    let i = 0;
    i < rows.length;
    i++
  ) {

    const cells =
      rows[i].c || [];


    /*
       A:X = 24 columns
    */

    const record =
      new Array(24).fill("");


    for (
      let c = 0;
      c < 24;
      c++
    ) {

      const cell =
        cells[c];

      if (!cell) {
        continue;
      }


      /*
         Prefer formatted value.
         This keeps dates/numbers readable.
      */

      record[c] =
        cell.f != null
          ? cell.f
          : (
              cell.v != null
                ? cell.v
                : ""
            );
    }


    const hasData =
      record.some(function(value) {

        return String(value ?? "").trim() !== "";

      });


    if (!hasData) {
      continue;
    }


    /*
       Complete local search index.

       Every column A:X is included.
    */

    record.__search =
      normalize(
        record.join(" ")
      );


    /*
       Actual Google Sheet row number.

       A3 is header,
       therefore first data row = 4.
    */

    record.__sheetRow =
      i + 4;


    ALL_RECORDS.push(record);
  }


  /*
     Build repeated damage history
     only once.
  */

  buildDamageHistory();


  DATA_READY = true;


  searchStatus.textContent =
    ALL_RECORDS.length.toLocaleString() +
    " transformer records loaded • Search ready";

  searchStatus.className =
    "search-status ready";


  console.log(
    "TOTAL RECORDS:",
    ALL_RECORDS.length
  );

  console.log(
    "DAMAGE HISTORY:",
    DAMAGE_HISTORY.size
  );
}


/* =========================================================
   BUILD DAMAGE HISTORY
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
     Sort every history by PR Date.
  */

  for (
    const history of DAMAGE_HISTORY.values()
  ) {

    history.sort(function(a, b) {

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
    });
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


  const query =
    normalize(
      searchInput.value
    );


  if (!query) {

    results.innerHTML = "";

    searchStatus.textContent =
      ALL_RECORDS.length.toLocaleString() +
      " transformer records loaded • Search ready";

    searchStatus.className =
      "search-status ready";

    return;
  }


  /*
     LOCAL SEARCH.
     No Google request.
  */

  const found = [];


  for (
    let i = 0;
    i < ALL_RECORDS.length;
    i++
  ) {

    if (
      ALL_RECORDS[i].__search.includes(
        query
      )
    ) {

      found.push(
        ALL_RECORDS[i]
      );
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
   CARD
========================================================= */

function renderCard(row, number) {

  const workshop =
    getValue(row, COL.WORKSHOP);

  const division =
    getValue(row, COL.DIVISION);

  const subdivision =
    getValue(row, COL.SUBDIVISION);

  const substation =
    getValue(row, COL.SUBSTATION);

  const feeder =
    getValue(row, COL.FEEDER);

  const dateDamage =
    getValue(row, COL.DATE_DAMAGE);

  const place =
    getValue(row, COL.PLACE_DAMAGE);

  const didNo =
    getValue(row, COL.DID_NO);

  const capacity =
    getValue(row, COL.CAPACITY);

  const complaintNo =
    getValue(row, COL.COMPLAINT_NO);

  const complaintDate =
    getValue(row, COL.COMPLAINT_DATE);

  const prNo =
    getValue(row, COL.PR_NO);

  const prDate =
    getValue(row, COL.PR_DATE);

  const jeName =
    getValue(row, COL.JE_NAME);

  const jeMobile =
    getValue(row, COL.JE_MOBILE);

  const issuedFirm =
    getValue(row, COL.ISSUED_TO_FIRM);

  const issueDate =
    getValue(row, COL.ISSUE_DATE);

  const driverName =
    getValue(row, COL.DRIVER_NAME);

  const driverMobile =
    getValue(row, COL.DRIVER_MOBILE);

  const replacementDate =
    getValue(row, COL.REPLACEMENT_DATE);

  const time =
    getValue(row, COL.TIME);

  const returnDate =
    getValue(row, COL.TX_RETURN_DATE);

  const observation =
    getValue(row, COL.OBSERVATION);


  /* =======================================================
     STATUS
  ======================================================= */

  let statusHTML;


  if (
    String(
      replacementDate
    ).trim() !== ""
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
    ).trim() !== ""
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


  /* =======================================================
     REPEATED DAMAGE
     NO LIMIT
  ======================================================= */

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


  if (history.length <= 1) {

    repeatHTML = `
      <div class="repeat-box normal">
        Not a repeated damage
      </div>
    `;

  }

  else {

    let historyHTML = "";


    /*
       ALL occurrences.

       No slice()
       No limit
       No first-3 restriction.
    */

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


  /* =======================================================
     FINAL CARD
  ======================================================= */

  return `
    <article class="result-card">

      <div class="card-top">

        <span class="card-number">
          Record #${number}
        </span>

        <span class="card-number">
          Row ${row.__sheetRow || "-"}
        </span>

      </div>


      ${statusHTML}


      ${field("Workshop", workshop)}

      ${field("Division", division)}

      ${field("Subdivision", subdivision)}

      ${field("Substation", substation)}

      ${field("Feeder", feeder)}

      ${field("Date of Damage", dateDamage)}

      ${field("Place of Damage", place)}

      ${field("DID No", didNo)}

      ${field("Capacity", capacity)}

      ${field("Complaint Number", complaintNo)}

      ${field("Complaint Date", complaintDate)}

      ${field("PR No", prNo)}

      ${field("PR Date", prDate)}

      ${field("JE Name", jeName)}

      ${field("JE Mobile", jeMobile)}

      ${field("Issued to Firm", issuedFirm)}

      ${field("Issue Date", issueDate)}

      ${field("Driver Name", driverName)}

      ${field("Driver Mobile", driverMobile)}

      ${field("Replacement Date", replacementDate)}

      ${field("Time", time)}

      ${field("TX Return Date", returnDate)}

      ${field("Observation DTC", observation)}


      ${repeatHTML}

    </article>
  `;
}


/* =========================================================
   FIELD HTML
========================================================= */

function field(label, value) {

  return `
    <div class="card-row">

      <div class="field-label">
        ${esc(label)}
      </div>

      <div class="field-value">
        ${esc(value || "-")}
      </div>

    </div>
  `;
}


/* =========================================================
   EVENTS
========================================================= */

searchBtn.addEventListener(
  "click",
  performSearch
);


searchInput.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key === "Enter"
    ) {

      event.preventDefault();

      performSearch();
    }
  }
);


/*
   Instant local search while typing.
*/

searchInput.addEventListener(
  "input",
  function() {

    if (
      searchInput.value.trim()
    ) {

      performSearch();

    }
    else {

      results.innerHTML = "";

      if (DATA_READY) {

        searchStatus.textContent =
          ALL_RECORDS.length.toLocaleString() +
          " transformer records loaded • Search ready";

        searchStatus.className =
          "search-status ready";
      }
    }
  }
);


/* =========================================================
   START
========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    loadGoogleSheet
  );

}
else {

  loadGoogleSheet();

}