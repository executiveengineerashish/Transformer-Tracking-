const SHEET_ID = "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";
const SHEET_GID = "1464518527";

const SHEET_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

let ALL_RECORDS = [];
let DAMAGE_HISTORY = new Map();
let HEADERS = [];

/* =========================
   START
========================= */
document.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("searchInput");
  const button = document.getElementById("searchBtn");
  const status = document.getElementById("searchStatus");

  if (input) input.disabled = true;
  if (button) button.disabled = true;

  if (status) {
    status.textContent = "Loading all transformer records...";
  }

  loadAllData()
    .then(() => {

      if (input) input.disabled = false;
      if (button) button.disabled = false;

      if (status) {
        status.textContent =
          `${ALL_RECORDS.length.toLocaleString()} records loaded — Ready to Search`;
      }

      console.log("Records loaded:", ALL_RECORDS.length);
      console.log("Headers:", HEADERS);

    })
    .catch(error => {

      console.error(error);

      if (status) {
        status.textContent =
          "Unable to load PR SEARCH data. Please check Sheet sharing.";
      }
    });

  if (button) {
    button.addEventListener("click", doSearch);
  }

  if (input) {
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        doSearch();
      }
    });

    input.addEventListener("input", () => {

      const value = input.value.trim();

      if (!value) {
        clearResults();
        return;
      }

      doSearch();
    });
  }
});


/* =========================
   LOAD ALL DATA ONCE
========================= */
async function loadAllData() {

  const response = await fetch(SHEET_URL, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Google Sheet could not be loaded");
  }

  const csvText = await response.text();

  const rows = parseCSV(csvText);

  if (!rows || rows.length < 4) {
    throw new Error("PR SEARCH data not found");
  }

  /*
     IMPORTANT:
     Your sheet has:
     Row 1
     Row 2
     Row 3 = HEADERS
     Row 4 onwards = DATA
  */

  HEADERS = rows[2].map((h, index) => {

    const value = String(h || "").trim();

    return value || columnLetter(index);

  });

  ALL_RECORDS = [];

  for (let i = 3; i < rows.length; i++) {

    const row = rows[i];

    if (!row || row.length === 0) continue;

    const hasData = row.some(cell =>
      String(cell || "").trim() !== ""
    );

    if (!hasData) continue;

    const record = {};

    HEADERS.forEach((header, index) => {
      record[header] = String(row[index] || "").trim();
    });

    /*
       Keep original row also.
       This makes fixed-column fallback 100% reliable.
    */
    record.__cells = row.slice();

    /*
       Search index containing EVERY COLUMN
    */
    record.__search = row
      .map(value => normalize(value))
      .join(" ");

    record.__rowNumber = i + 1;

    ALL_RECORDS.push(record);
  }

  buildDamageHistory();
}


/* =========================
   CSV PARSER
========================= */
function parseCSV(text) {

  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {

    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {

      if (insideQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }

    } else if (char === "," && !insideQuotes) {

      row.push(cell);
      cell = "";

    } else if (
      (char === "\n" || char === "\r") &&
      !insideQuotes
    ) {

      if (char === "\r" && next === "\n") {
        i++;
      }

      row.push(cell);
      rows.push(row);

      row = [];
      cell = "";

    } else {

      cell += char;
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}


/* =========================
   NORMALIZE SEARCH
========================= */
function normalize(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/[\s\-\/\\().,+]/g, "")
    .trim();
}


/* =========================
   COLUMN LETTER
========================= */
function columnLetter(index) {

  let result = "";
  let n = index + 1;

  while (n > 0) {

    const remainder = (n - 1) % 26;

    result =
      String.fromCharCode(65 + remainder) + result;

    n = Math.floor((n - 1) / 26);
  }

  return result;
}


/* =========================
   FIXED COLUMN FALLBACK
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
  OBSERVATION_DTC: 23

};


/* =========================
   GET FIELD
========================= */
function getField(record, aliases, fallbackIndex) {

  const keys = Object.keys(record);

  /*
     First try header names
  */
  for (const alias of aliases) {

    const target = normalizeHeader(alias);

    for (const key of keys) {

      if (key.startsWith("__")) continue;

      if (normalizeHeader(key) === target) {

        const value = String(record[key] || "").trim();

        if (value !== "") {
          return value;
        }
      }
    }
  }

  /*
     Fixed column fallback
  */
  if (
    record.__cells &&
    fallbackIndex !== undefined
  ) {

    return String(
      record.__cells[fallbackIndex] || ""
    ).trim();
  }

  return "";
}


/* =========================
   HEADER NORMALIZATION
========================= */
function normalizeHeader(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}


/* =========================
   GET ALL IMPORTANT FIELDS
========================= */
function getFields(record) {

  return {

    sn: getField(
      record,
      ["SN", "S NO", "SERIAL NO"],
      COL.SN
    ),

    workshop: getField(
      record,
      ["WORKSHOP"],
      COL.WORKSHOP
    ),

    division: getField(
      record,
      ["DIVISION"],
      COL.DIVISION
    ),

    subdivision: getField(
      record,
      ["SUBDIVISION", "SUB DIVISION"],
      COL.SUBDIVISION
    ),

    substation: getField(
      record,
      ["SUBSTATION"],
      COL.SUBSTATION
    ),

    feeder: getField(
      record,
      ["FEEDER"],
      COL.FEEDER
    ),

    damageDate: getField(
      record,
      ["DATE OF DAMAGE", "DAMAGE DATE"],
      COL.DATE_DAMAGE
    ),

    place: getField(
      record,
      ["PLACE OF DAMAGE"],
      COL.PLACE_DAMAGE
    ),

    didNo: getField(
      record,
      ["DID NO", "DIDNO"],
      COL.DID_NO
    ),

    capacity: getField(
      record,
      ["CAPACITY", "CAPACITY IN KVA"],
      COL.CAPACITY
    ),

    complaintNo: getField(
      record,
      ["COMPLAIN NUMBER", "COMPLAINT NUMBER", "COMPLAINT NO"],
      COL.COMPLAINT_NO
    ),

    complaintDate: getField(
      record,
      ["COMPLAIN DATE", "COMPLAINT DATE"],
      COL.COMPLAINT_DATE
    ),

    prNo: getField(
      record,
      ["PR NO", "PR NUMBER", "PR NUMBER"],
      COL.PR_NO
    ),

    prDate: getField(
      record,
      ["PR DATE"],
      COL.PR_DATE
    ),

    jeName: getField(
      record,
      ["JE NAME", "JE"],
      COL.JE_NAME
    ),

    jeMobile: getField(
      record,
      ["JE MOBILE", "JE MOBILE NO", "JE PHONE"],
      COL.JE_MOBILE
    ),

    issuedToFirm: getField(
      record,
      ["ISSUED TO FIRM", "ISSUE TO FIRM"],
      COL.ISSUED_TO_FIRM
    ),

    issueDate: getField(
      record,
      ["ISSUE DATE"],
      COL.ISSUE_DATE
    ),

    driverName: getField(
      record,
      ["DRIVER NAME"],
      COL.DRIVER_NAME
    ),

    driverMobile: getField(
      record,
      ["DRIVER MOBILE", "DRIVER MOBILE NO"],
      COL.DRIVER_MOBILE
    ),

    replacementDate: getField(
      record,
      ["REPLACEMENT DATE", "REPLACEMENT"],
      COL.REPLACEMENT_DATE
    ),

    time: getField(
      record,
      ["TIME"],
      COL.TIME
    ),

    txReturnDate: getField(
      record,
      ["TX RETURN DATE", "RETURN DATE"],
      COL.TX_RETURN_DATE
    ),

    observation: getField(
      record,
      ["OBSERVATION DTC"],
      COL.OBSERVATION_DTC
    )
  };
}


/* =========================
   REPEATED DAMAGE HISTORY
========================= */
function buildDamageHistory() {

  DAMAGE_HISTORY = new Map();

  ALL_RECORDS.forEach(record => {

    const fields = getFields(record);

    const place = normalize(fields.place);

    if (!place) return;

    if (!DAMAGE_HISTORY.has(place)) {
      DAMAGE_HISTORY.set(place, []);
    }

    DAMAGE_HISTORY.get(place).push({
      record: record,
      fields: fields
    });
  });

  /*
     Sort each location by Damage Date / PR Date
  */
  DAMAGE_HISTORY.forEach(list => {

    list.sort((a, b) => {

      const da = parseDateValue(
        a.fields.damageDate || a.fields.prDate
      );

      const db = parseDateValue(
        b.fields.damageDate || b.fields.prDate
      );

      return da - db;
    });
  });
}


/* =========================
   SEARCH
========================= */
function doSearch() {

  const input = document.getElementById("searchInput");
  const status = document.getElementById("searchStatus");
  const results = document.getElementById("results");

  if (!input) return;

  const query = normalize(input.value);

  if (!query) {

    clearResults();

    if (status) {
      status.textContent =
        `${ALL_RECORDS.length.toLocaleString()} records loaded — Ready to Search`;
    }

    return;
  }

  /*
     LOCAL SEARCH ONLY
     No Google request here.
  */
  const found = ALL_RECORDS.filter(record =>
    record.__search.includes(query)
  );

  if (status) {

    status.textContent =
      `${found.length.toLocaleString()} record(s) found`;
  }

  if (!results) return;

  if (found.length === 0) {

    results.innerHTML = `
      <div class="no-results">
        No record found
      </div>
    `;

    return;
  }

  results.innerHTML = found
    .slice(0, 100)
    .map((record, index) =>
      createCard(record, index + 1)
    )
    .join("");
}


/* =========================
   CREATE RESULT CARD
========================= */
function createCard(record, number) {

  const f = getFields(record);

  const placeKey = normalize(f.place);

  const history =
    DAMAGE_HISTORY.get(placeKey) || [];

  const isRepeated = history.length > 1;

  let statusHTML = "";

  /*
     REPLACEMENT DATE HAS HIGHEST PRIORITY
  */
  if (hasValue(f.replacementDate)) {

    statusHTML = `
      <div class="status-box installed">
        <strong>Congratulations Your Transformer installed</strong>
        <div>Replacement Date: ${escapeHTML(f.replacementDate)}</div>
      </div>
    `;

  } else if (hasValue(f.issueDate)) {

    statusHTML = `
      <div class="status-box issued">
        <strong>
          Your Transformer Issued by Workshop
        </strong>

        <div>Please Contact Driver for Installation</div>

        <div>Issue Date: ${escapeHTML(f.issueDate)}</div>

        ${
          f.driverName
            ? `<div>Driver: ${escapeHTML(f.driverName)}</div>`
            : ""
        }

        ${
          f.driverMobile
            ? `<div>Mobile: ${escapeHTML(f.driverMobile)}</div>`
            : ""
        }
      </div>
    `;

  } else {

    statusHTML = `
      <div class="status-box pending">
        <strong>Transformer Replacement Pending</strong>
      </div>
    `;
  }


  let repeatHTML = "";

  if (!isRepeated) {

    repeatHTML = `
      <div class="repeat-box normal">
        Not a repeated damage
      </div>
    `;

  } else {

    const position =
      history.findIndex(item =>
        item.record === record
      ) + 1;

    let historyRows = "";

    history.forEach((item, index) => {

      const hf = item.fields;

      historyRows += `
        <div class="repeat-row">
          <strong>${ordinal(index + 1)} Time</strong>

          <span>
            PR No:
            ${escapeHTML(hf.prNo || "-")}
          </span>

          <span>
            Date:
            ${escapeHTML(
              hf.prDate ||
              hf.damageDate ||
              "-"
            )}
          </span>
        </div>
      `;
    });

    repeatHTML = `
      <div class="repeat-box repeated">

        <strong>
          It Damaged ${history.length} times
        </strong>

        <div class="repeat-warning">
          Please Ensure Increasing Capacity if Overloaded
        </div>

        <div class="repeat-history">
          ${historyRows}
        </div>

      </div>
    `;
  }


  return `
    <div class="result-card">

      <div class="card-title">
        Record #${number}
      </div>

      ${statusHTML}

      <div class="data-grid">

        ${dataRow("PR Number", f.prNo)}
        ${dataRow("PR Date", f.prDate)}

        ${dataRow("Complaint Number", f.complaintNo)}
        ${dataRow("Complaint Date", f.complaintDate)}

        ${dataRow("Date of Damage", f.damageDate)}
        ${dataRow("Place of Damage", f.place)}

        ${dataRow("Capacity", f.capacity)}
        ${dataRow("DID No", f.didNo)}

        ${dataRow("Workshop", f.workshop)}
        ${dataRow("Division", f.division)}

        ${dataRow("Subdivision", f.subdivision)}
        ${dataRow("Substation", f.substation)}

        ${dataRow("Feeder", f.feeder)}
        ${dataRow("JE Name", f.jeName)}

        ${dataRow("JE Mobile", f.jeMobile)}
        ${dataRow("Issued To Firm", f.issuedToFirm)}

        ${dataRow("Issue Date", f.issueDate)}
        ${dataRow("Driver Name", f.driverName)}

        ${dataRow("Driver Mobile", f.driverMobile)}
        ${dataRow("Replacement Date", f.replacementDate)}

        ${dataRow("Time", f.time)}
        ${dataRow("TX Return Date", f.txReturnDate)}

        ${dataRow("Observation DTC", f.observation)}

      </div>

      ${repeatHTML}

    </div>
  `;
}


/* =========================
   DATA ROW
========================= */
function dataRow(label, value) {

  if (!hasValue(value)) return "";

  return `
    <div class="data-row">

      <div class="data-label">
        ${escapeHTML(label)}
      </div>

      <div class="data-value">
        ${escapeHTML(value)}
      </div>

    </div>
  `;
}


/* =========================
   HELPERS
========================= */
function hasValue(value) {

  return String(value || "").trim() !== "";
}


function ordinal(number) {

  if (number === 1) return "First";
  if (number === 2) return "Second";
  if (number === 3) return "Third";

  return `${number}th`;
}


function parseDateValue(value) {

  const text = String(value || "").trim();

  if (!text) return 0;

  /*
     DD.MM.YYYY
  */
  const match = text.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/
  );

  if (match) {

    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1])
    ).getTime();
  }

  const d = new Date(text);

  return isNaN(d.getTime())
    ? 0
    : d.getTime();
}


function escapeHTML(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function clearResults() {

  const results =
    document.getElementById("results");

  if (results) {
    results.innerHTML = "";
  }
}