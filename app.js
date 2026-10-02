/* =========================================================
   TRANSFORMER TRACKING
   FAST VERSION
   LOAD ONCE -> SEARCH IN MEMORY
========================================================= */

const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";


/* =========================================================
   COLUMN MAP
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
   GLOBAL
========================================================= */

let ALL_RECORDS = [];

let DAMAGE_HISTORY = new Map();

let DATA_READY = false;

let LOAD_STARTED = false;

let searchTimer = null;

let lastSearch = "";


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
   ESCAPE
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

  if (n % 10 === 1) return n + "st";
  if (n % 10 === 2) return n + "nd";
  if (n % 10 === 3) return n + "rd";

  return n + "th";
}


/* =========================================================
   DATE SCORE
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
   LOAD DATA
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
    "transformerCallback_" +
    Date.now();


  const script =
    document.createElement("script");


  let completed = false;


  const timeout =
    setTimeout(function() {

      if (completed) {
        return;
      }

      completed = true;

      cleanup();

      LOAD_STARTED = false;

      searchStatus.textContent =
        "Loading timed out. Please refresh.";

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

      if (completed) {
        return;
      }

      completed = true;

      cleanup();

      try {

        processData(response);

      } catch (error) {

        console.error(
          "PROCESS ERROR:",
          error
        );

        LOAD_STARTED = false;

        searchStatus.textContent =
          "Data processing error.";

        searchStatus.className =
          "search-status error";
      }
    };


  /*
     IMPORTANT

     Only PR SEARCH.
     Row 3 = header.
     Data begins from row 4.
  */

  const params =
    new URLSearchParams();

  params.set(
    "gid",
    SHEET_GID
  );

  params.set(
    "range",
    "A3:X"
  );

  params.set(
    "headers",
    "1"
  );

  params.set(
    "tq",
    "select *"
  );

  params.set(
    "tqx",
    "responseHandler:" +
    callbackName
  );


  const url =
    "https://docs.google.com/spreadsheets/d/" +
    SHEET_ID +
    "/gviz/tq?" +
    params.toString();


  console.log(
    "LOADING:",
    url
  );


  script.src =
    url;

  script.async =
    true;


  script.onerror =
    function() {

      if (completed) {
        return;
      }

      completed = true;

      cleanup();

      LOAD_STARTED = false;

      searchStatus.textContent =
        "Google Sheet connection failed.";

      searchStatus.className =
        "search-status error";
    };


  document.head.appendChild(
    script
  );
}


/* =========================================================
   PROCESS GOOGLE RESPONSE
========================================================= */

function processData(response) {

  if (
    !response ||
    !response.table ||
    !Array.isArray(
      response.table.rows
    )
  ) {

    throw new Error(
      "Invalid Google response"
    );
  }


  ALL_RECORDS = [];


  const rows =
    response.table.rows;


  /*
     Each returned row corresponds
     to Google Sheet row 4 onwards.
  */

  for (
    let r = 0;
    r < rows.length;
    r++
  ) {

    const cells =
      rows[r].c || [];


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


      record[c] =
        cell.f != null
          ? cell.f
          : (
              cell.v != null
                ? cell.v
                : ""
            );
    }


    /*
       Ignore blank rows.
    */

    const hasData =
      record.some(
        function(value) {

          return (
            String(value ?? "").trim()
            !== ""
          );

        }
      );


    if (!hasData) {
      continue;
    }


    /*
       Search index.

       ALL columns A:X.
    */

    record.__search =
      normalize(
        record.join(" ")
      );


    /*
       Actual Google Sheet row.
    */

    record.__sheetRow =
      r + 4;


    ALL_RECORDS.push(
      record
    );
  }


  /*
     Build history ONCE.
  */

  buildDamageHistory();


  DATA_READY = true;


  searchStatus.textContent =
    ALL_RECORDS.length.toLocaleString() +
    " transformer records loaded • Search ready";

  searchStatus.className =
    "search-status ready";


  console.log(
    "DATA READY:",
    ALL_RECORDS.length
  );
}


/* =========================================================
   BUILD REPEATED DAMAGE HISTORY
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
     Oldest to newest.
  */

  for (
    const history of
    DAMAGE_HISTORY.values()
  ) {

    history.sort(
      function(a, b) {

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
   FAST LOCAL SEARCH
========================================================= */

function performFastSearch(query) {

  if (!DATA_READY) {

    searchStatus.textContent =
      "Please wait. Records are still loading...";

    searchStatus.className =
      "search-status loading";

    return;
  }


  const found = [];


  /*
     Search only memory.
     NO GOOGLE REQUEST.
  */

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


  renderResults(
    found
  );
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
   FIELD
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

  let statusHTML = "";


  /*
     INSTALLED
  */

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


  /*
     ISSUED
     DRIVER INFORMATION HERE
  */

  else if (
    String(
      issueDate
    ).trim()
  ) {

    let callButton = "";


    if (
      String(
        driverMobile
      ).trim()
    ) {

      const cleanMobile =
        String(
          driverMobile
        )
          .trim()
          .replace(
            /[\s\-().]/g,
            ""
          );


      callButton = `
        <a
          class="call-btn"
          href="tel:${esc(cleanMobile)}"
        >
          📞 CALL DRIVER
        </a>
      `;
    }


    statusHTML = `
      <div class="status-box issued">

        🔧 Your Transformer Issued by Workshop.
        Please Contact Driver for Installation.

        <br><br>

        <b>Issue Date:</b>
        ${esc(issueDate)}

        <br>

        <b>Driver:</b>
        ${esc(driverName || "-")}

        <br>

        <b>Mobile:</b>
        ${esc(driverMobile || "-")}

        ${callButton}

      </div>
    `;

  }


  /*
     PENDING
  */

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


  let repeatHTML = "";


  if (
    history.length <= 1
  ) {

    repeatHTML = `
      <div class="repeat-box normal">

        Not a repeated damage

      </div>
    `;

  }

  else {

    let historyHTML = "";


    /*
       SHOW EVERY OCCURRENCE.
       NO LIMIT.
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
          ${historyHTML