const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";

let ALL_RECORDS = [];
let DAMAGE_HISTORY = {};
let searchTimer = null;

/* =========================
   COLUMN POSITIONS
========================= */

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


/* =========================
   BASIC FUNCTIONS
========================= */

function clean(value) {
  return String(value ?? "").trim();
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s\-\/\\().,\[\]{}:;_]+/g, "")
    .trim();
}


/* =========================
   LOCATION NORMALIZATION

   SISREDI
   SISREDI 1
   1 SISREDI
   SISREDI (1)
   (1) SISREDI
   SISREDI [25]

   ALL = SISREDI
========================= */

function normalizeLocation(value) {

  let text = String(value ?? "").toLowerCase();

  // Remove numbers
  text = text.replace(/[0-9]+/g, " ");

  // Remove brackets
  text = text.replace(/[\(\)\[\]\{\}]/g, " ");

  // Remove punctuation
  text = text.replace(/[-_/\\.,:;]+/g, " ");

  // Remove extra spaces
  text = text.replace(/\s+/g, " ").trim();

  return normalize(text);
}


/* =========================
   DATE PARSER
========================= */

function parseDate(value) {

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const text = String(value).trim();

  // Google Visualization:
  // Date(2026,9,2)
  let m = text.match(
    /Date\(\s*(\d{4})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})/
  );

  if (m) {
    return new Date(
      Number(m[1]),
      Number(m[2]),
      Number(m[3])
    );
  }

  // YYYY-MM-DD
  m = text.match(
    /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/
  );

  if (m) {
    return new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3])
    );
  }

  // DD.MM.YYYY / DD-MM-YYYY / DD/MM/YYYY
  m = text.match(
    /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/
  );

  if (m) {
    return new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1])
    );
  }

  const d = new Date(text);

  if (!isNaN(d.getTime())) {
    return d;
  }

  return null;
}


/* =========================
   CURRENT MONTH

   IMPORTANT:
   Dashboard uses PR DATE
   Column N
========================= */

function isCurrentMonth(value) {

  const d = parseDate(value);

  if (!d) return false;

  const now = new Date();

  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
}


/* =========================
   LOAD GOOGLE SHEET
========================= */

function loadSheet() {

  setStatus("Connecting to PR SEARCH...", false);

  const callbackName =
    "__transformerCallback_" + Date.now();

  const script = document.createElement("script");

  const base =
    "https://docs.google.com/spreadsheets/d/" +
    SHEET_ID +
    "/gviz/tq";

  const params = new URLSearchParams();

  params.set("gid", SHEET_GID);
  params.set("range", "A3:X");
  params.set("headers", "1");

  params.set(
    "tqx",
    "out:json;responseHandler:" + callbackName
  );

  // Prevent browser/CDN cached old response
  params.set("_", Date.now());

  const url = base + "?" + params.toString();

  let finished = false;

  window[callbackName] = function(response) {

    if (finished) return;

    finished = true;

    try {

      if (
        !response ||
        !response.table ||
        !response.table.rows
      ) {
        throw new Error("Invalid Google Sheet response");
      }

      processSheetData(response);

    } catch (error) {

      console.error(error);

      setStatus(
        "Unable to read PR SEARCH data. Please refresh.",
        true
      );
    }

    cleanup();
  };


  script.onerror = function() {

    if (finished) return;

    finished = true;

    console.error(
      "Google Sheet JSONP request failed"
    );

    setStatus(
      "Google Sheet connection failed. Please refresh.",
      true
    );

    cleanup();
  };


  // Give a clear message if Google does not respond
  setTimeout(function() {

    if (finished) return;

    finished = true;

    console.error(
      "Google Sheet loading timeout"
    );

    setStatus(
      "Google Sheet is taking too long to respond. Please refresh.",
      true
    );

    cleanup();

  }, 20000);


  function cleanup() {

    try {
      delete window[callbackName];
    } catch (e) {}

    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }
  }


  script.src = url;

  document.head.appendChild(script);
}


/* =========================
   PROCESS DATA
========================= */

function processSheetData(response) {

  const rows = response.table.rows || [];

  ALL_RECORDS = [];

  rows.forEach(function(row, index) {

    const cells = row.c || [];

    const record = [];
    const raw = [];

    for (let i = 0; i < 24; i++) {

      const cell = cells[i];

      if (!cell) {

        record.push("");
        raw.push("");

        continue;
      }

      // Formatted value for display
      if (
        cell.f !== undefined &&
        cell.f !== null
      ) {
        record.push(String(cell.f));
      } else if (
        cell.v !== undefined &&
        cell.v !== null
      ) {
        record.push(String(cell.v));
      } else {
        record.push("");
      }

      // Raw value for date calculations
      if (
        cell.v !== undefined &&
        cell.v !== null
      ) {
        raw.push(String(cell.v));
      } else {
        raw.push("");
      }
    }

    // Ignore completely blank rows
    if (
      record.every(function(x) {
        return clean(x) === "";
      })
    ) {
      return;
    }

    // Header row is row 3.
    // Data starts row 4.
    if (index === 0) {
      return;
    }

    record.__raw = raw;

    record.__search = normalize(
      record.join(" ")
    );

    record.__sheetRow = index + 4;

    ALL_RECORDS.push(record);
  });


  buildDamageHistory();

  buildDashboard();

  setStatus(
    ALL_RECORDS.length.toLocaleString("en-IN") +
      " transformer records loaded • Search ready",
    false
  );

  console.log(
    "Transformer records:",
    ALL_RECORDS.length
  );
}


/* =========================
   DAMAGE HISTORY
========================= */

function buildDamageHistory() {

  DAMAGE_HISTORY = {};

  ALL_RECORDS.forEach(function(record) {

    const location =
      normalizeLocation(
        record[COL.PLACE_DAMAGE]
      );

    if (!location) return;

    if (!DAMAGE_HISTORY[location]) {
      DAMAGE_HISTORY[location] = [];
    }

    DAMAGE_HISTORY[location].push(record);
  });


  Object.keys(DAMAGE_HISTORY).forEach(function(key) {

    DAMAGE_HISTORY[key].sort(function(a, b) {

      const da =
        parseDate(
          a.__raw
            ? a.__raw[COL.PR_DATE]
            : a[COL.PR_DATE]
        ) ||
        parseDate(a[COL.DATE_DAMAGE]) ||
        new Date(0);

      const db =
        parseDate(
          b.__raw
            ? b.__raw[COL.PR_DATE]
            : b[COL.PR_DATE]
        ) ||
        parseDate(b[COL.DATE_DAMAGE]) ||
        new Date(0);

      return da - db;
    });

  });
}


/* =========================
   DASHBOARD
   CURRENT MONTH = PR DATE
========================= */

function buildDashboard() {

  const totalEl =
    document.getElementById("dashTotal");

  const issuedEl =
    document.getElementById("dashIssued");

  const pendingEl =
    document.getElementById("dashPending");

  const workshopEl =
    document.getElementById("workshopDashboard");

  const monthEl =
    document.getElementById("dashboardMonth");


  if (!totalEl ||
      !issuedEl ||
      !pendingEl ||
      !workshopEl) {

    console.error(
      "Dashboard elements not found"
    );

    return;
  }


  const now = new Date();

  monthEl.textContent =
    now.toLocaleString("en-IN", {
      month: "long",
      year: "numeric"
    });


  let total = 0;
  let issued = 0;
  let pending = 0;

  const workshopPending = {};


  ALL_RECORDS.forEach(function(record) {

    /*
      IMPORTANT:
      USE PR DATE — COLUMN N
    */

    const rawPRDate =
      record.__raw
        ? record.__raw[COL.PR_DATE]
        : "";

    const displayPRDate =
      record[COL.PR_DATE];

    const prDate =
      rawPRDate || displayPRDate;


    if (!isCurrentMonth(prDate)) {
      return;
    }


    total++;


    if (
      clean(record[COL.ISSUE_DATE]) !== ""
    ) {

      issued++;

    } else {

      pending++;

      const workshop =
        clean(record[COL.WORKSHOP]) ||
        "Workshop Not Available";

      workshopPending[workshop] =
        (workshopPending[workshop] || 0) + 1;
    }

  });


  totalEl.textContent =
    total.toLocaleString("en-IN");

  issuedEl.textContent =
    issued.toLocaleString("en-IN");

  pendingEl.textContent =
    pending.toLocaleString("en-IN");


  const list =
    Object.entries(workshopPending)
      .sort(function(a, b) {
        return b[1] - a[1];
      });


  if (!list.length) {

    workshopEl.innerHTML =
      '<div class="dashboard-loading">' +
      'No pending transformer found' +
      '</div>';

    return;
  }


  const maxValue =
    Math.max.apply(
      null,
      list.map(function(x) {
        return x[1];
      })
    );


  workshopEl.innerHTML =
    list.map(function(item, index) {

      const workshop = item[0];
      const count = item[1];

      const width =
        Math.max(
          8,
          (count / maxValue) * 100
        );


      return `
        <div class="workshop-row">

          <div class="workshop-name-line">
            <span class="workshop-name">
              ${escapeHtml(workshop)}
            </span>

            <span class="workshop-count">
              ${count}
            </span>
          </div>

          <div class="bar-background">
            <div
              class="bar-fill bar-${(index % 10) + 1}"
              style="width:${width}%">
            </div>
          </div>

        </div>
      `;

    }).join("");
}


/* =========================
   SEARCH
========================= */

function performSearch() {

  const input =
    document.getElementById("searchInput");

  const results =
    document.getElementById("results");

  if (!input || !results) return;


  const query =
    normalize(input.value);


  if (!query) {

    results.innerHTML = "";

    return;
  }


  if (!ALL_RECORDS.length) {

    results.innerHTML = `
      <div class="no-results">
        Transformer records are still loading.
        Please wait a moment.
      </div>
    `;

    return;
  }


  const found =
    ALL_RECORDS.filter(function(record) {

      return record.__search.includes(query);

    });


  if (!found.length) {

    results.innerHTML = `
      <div class="no-results">
        No record found
      </div>
    `;

    return;
  }


  results.innerHTML =
    `<div class="result-count">
      ${found.length.toLocaleString("en-IN")}
      record(s) found
    </div>` +
    found.map(function(record, index) {

      return buildCard(record, index + 1);

    }).join("");
}


/* =========================
   BUILD CARD
========================= */

function buildCard(record, number) {

  const replacementDate =
    clean(record[COL.REPLACEMENT_DATE]);

  const issueDate =
    clean(record[COL.ISSUE_DATE]);

  let statusHTML = "";


  if (replacementDate) {

    statusHTML = `
      <div class="status-box installed">
        <strong>
          Congratulations Your Transformer Installed
        </strong>

        <div>
          Replacement Date:
          ${escapeHtml(replacementDate)}
        </div>
      </div>
    `;

  } else if (issueDate) {

    const driver =
      clean(record[COL.DRIVER_NAME]);

    const mobile =
      clean(record[COL.DRIVER_MOBILE]);


    let callButton = "";

    if (mobile) {

      const phone =
        mobile.replace(/[^\d+]/g, "");

      callButton = `
        <a
          class="call-driver"
          href="tel:${phone}">
          📞 CALL DRIVER
        </a>
      `;
    }


    statusHTML = `
      <div class="status-box issued">

        <strong>
          Your Transformer Issued by Workshop
        </strong>

        <div>
          Please Contact Driver for Installation
        </div>

        <div class="status-detail">
          Issue Date:
          ${escapeHtml(issueDate)}
        </div>

        ${
          driver
            ? `<div class="status-detail">
                 Driver:
                 ${escapeHtml(driver)}
               </div>`
            : ""
        }

        ${
          mobile
            ? `<div class="status-detail">
                 Mobile:
                 ${escapeHtml(mobile)}
               </div>`
            : ""
        }

        ${callButton}

      </div>
    `;

  } else {

    statusHTML = `
      <div class="status-box pending">
        <strong>
          Transformer Pending to Issue
        </strong>
      </div>
    `;
  }


  /* =========================
     REPEATED DAMAGE
  ========================= */

  const locationKey =
    normalizeLocation(
      record[COL.PLACE_DAMAGE]
    );

  const history =
    DAMAGE_HISTORY[locationKey] || [];


  let repeatedHTML = "";


  if (history.length > 1) {

    repeatedHTML = `
      <div class="repeated-box">

        <div class="repeated-title">
          🔁 It Damaged ${history.length} times
        </div>

        <div class="repeated-warning">
          Please Ensure Increasing Capacity if Overloaded
        </div>

        <div class="history-list">

          ${history.map(function(item) {

            const pr =
              clean(item[COL.PR_NO]) || "-";

            const date =
              clean(item[COL.PR_DATE]) ||
              clean(item[COL.DATE_DAMAGE]) ||
              "-";

            const capacity =
              clean(item[COL.CAPACITY]) || "-";


            return `
              <div class="history-item">

                <span>
                  PR: <strong>
                    ${escapeHtml(pr)}
                  </strong>
                </span>

                <span>
                  Date:
                  ${escapeHtml(date)}
                </span>

                <span>
                  Capacity:
                  <strong>
                    ${escapeHtml(capacity)} kVA
                  </strong>
                </span>

              </div>
            `;

          }).join("")}

        </div>

      </div>
    `;
  }


  /* =========================
     DATA FIELDS
  ========================= */

  const fields = [

    ["Workshop", record[COL.WORKSHOP]],
    ["Division", record[COL.DIVISION]],
    ["Subdivision", record[COL.SUBDIVISION]],
    ["Substation", record[COL.SUBSTATION]],
    ["Feeder", record[COL.FEEDER]],
    ["Date of Damage", record[COL.DATE_DAMAGE]],
    ["Place of Damage", record[COL.PLACE_DAMAGE]],
    ["DID No", record[COL.DID_NO]],
    ["Capacity", record[COL.CAPACITY]],
    ["Complaint Number", record[COL.COMPLAINT_NO]],
    ["Complaint Date", record[COL.COMPLAINT_DATE]],
    ["PR No", record[COL.PR_NO]],
    ["PR Date", record[COL.PR_DATE]],
    ["JE Name", record[COL.JE_NAME]],
    ["JE Mobile", record[COL.JE_MOBILE]],
    ["Issued to Firm", record[COL.ISSUED_TO_FIRM]],
    ["Issue Date", record[COL.ISSUE_DATE]],
    ["Driver Name", record[COL.DRIVER_NAME]],
    ["Driver Mobile", record[COL.DRIVER_MOBILE]],
    ["Replacement Date", record[COL.REPLACEMENT_DATE]],
    ["Time", record[COL.TIME]],
    ["TX Return Date", record[COL.TX_RETURN_DATE]],
    ["Observation DTC", record[COL.OBSERVATION]]

  ];


  const dataHTML =
    fields.map(function(field) {

      if (!clean(field[1])) return "";

      return `
        <div class="data-row">

          <div class="data-label">
            ${escapeHtml(field[0])}
          </div>

          <div class="data-value">
            ${escapeHtml(field[1])}
          </div>

        </div>
      `;

    }).join("");


  return `
    <div class="result-card">

      <div class="card-number">
        #${number}
      </div>

      ${statusHTML}

      ${repeatedHTML}

      <div class="data-section">
        ${dataHTML}
      </div>

    </div>
  `;
}


/* =========================
   STATUS
========================= */

function setStatus(message, error) {

  const el =
    document.getElementById("searchStatus");

  if (!el) return;

  el.textContent = message;

  el.classList.remove(
    "loading",
    "error",
    "ready"
  );

  if (error) {
    el.classList.add("error");
  } else {
    el.classList.add("ready");
  }
}


/* =========================
   HTML SAFETY
========================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================
   START
========================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    const input =
      document.getElementById("searchInput");

    const button =
      document.getElementById("searchBtn");


    if (input) {

      input.addEventListener(
        "input",
        function() {

          clearTimeout(searchTimer);

          searchTimer =
            setTimeout(
              performSearch,
              60
            );

        }
      );

    }


    if (button) {

      button.addEventListener(
        "click",
        performSearch
      );

    }


    loadSheet();

  }
);