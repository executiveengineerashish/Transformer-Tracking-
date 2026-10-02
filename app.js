// ======================================================
// PR SEARCH - TRANSFORMER TRACKING
// ======================================================

const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";

const CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;


// ======================================================
// ELEMENTS
// ======================================================

const subtitle =
  document.getElementById("subtitle");

const refreshBtn =
  document.getElementById("refreshBtn");

const qInput =
  document.getElementById("q");

const searchBtn =
  document.getElementById("searchBtn");

const resultsSummary =
  document.getElementById("resultsSummary");

const prevBtn =
  document.getElementById("prevBtn");

const nextBtn =
  document.getElementById("nextBtn");

const pager =
  document.getElementById("pager");

const mobileResults =
  document.getElementById("mobileResults");

const tableWrap =
  document.getElementById("tableWrap");

const thead =
  document.getElementById("thead");

const tbody =
  document.getElementById("tbody");

const errorBox =
  document.getElementById("error");


// ======================================================
// DATA
// ======================================================

let headers = [];

let rows = [];

let filtered = [];

let offset = 0;

const PAGE_SIZE = 50;

let sheetLoaded = false;

let loading = false;

let searchTimer = null;


// ======================================================
// NORMALIZE
// ======================================================

function normalize(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

}


// ======================================================
// ERROR
// ======================================================

function showError(message) {

  errorBox.style.display =
    message ? "block" : "none";

  errorBox.textContent =
    message || "";

}


// ======================================================
// SUBTITLE
// ======================================================

function setSubtitle(text) {

  subtitle.textContent = text;

}


// ======================================================
// CSV PARSER
// ======================================================

function parseCSV(text) {

  const result = [];

  let row = [];

  let value = "";

  let inQuotes = false;


  for (
    let i = 0;
    i < text.length;
    i++
  ) {

    const ch = text[i];


    if (inQuotes) {

      if (ch === '"') {

        if (text[i + 1] === '"') {

          value += '"';

          i++;

        } else {

          inQuotes = false;

        }

      } else {

        value += ch;

      }

      continue;
    }


    if (ch === '"') {

      inQuotes = true;

      continue;

    }


    if (ch === ",") {

      row.push(value);

      value = "";

      continue;

    }


    if (ch === "\n") {

      row.push(value);

      result.push(row);

      row = [];

      value = "";

      continue;

    }


    if (ch === "\r") {

      continue;

    }


    value += ch;

  }


  if (
    value !== "" ||
    row.length > 0
  ) {

    row.push(value);

    result.push(row);

  }


  return result;

}


// ======================================================
// HEADER DETECTION
// ======================================================

function detectHeaderRow(records) {

  const max =
    Math.min(records.length, 15);

  let bestIndex = 0;

  let bestScore = -1;


  for (
    let i = 0;
    i < max;
    i++
  ) {

    const current =
      records[i] || [];


    const score =
      current.filter(
        cell =>
          normalize(cell).length > 0
      ).length;


    if (
      score > bestScore
    ) {

      bestScore = score;

      bestIndex = i;

    }

  }


  return bestIndex;

}


// ======================================================
// CLEAN DATA
// ======================================================

function cleanData(records) {

  const headerIndex =
    detectHeaderRow(records);


  const headerRow =
    (
      records[headerIndex] || []
    ).map(
      (header, index) => {

        const text =
          String(header ?? "").trim();


        return text
          ? text
          : `Column ${index + 1}`;

      }
    );


  const data =
    records
      .slice(headerIndex + 1)
      .map(
        row =>
          row.map(
            cell =>
              String(cell ?? "")
          )
      )
      .filter(
        row =>
          row.some(
            cell =>
              normalize(cell)
          )
      );


  return {

    headers: headerRow,

    rows: data

  };

}


// ======================================================
// FETCH GOOGLE SHEET
//
// NO LOCAL STORAGE
// ======================================================

async function fetchSheet() {

  const url =
    CSV_URL +
    "&_=" +
    Date.now();


  const response =
    await fetch(
      url,
      {
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      `Google Sheet fetch failed: ${response.status}`
    );

  }


  const text =
    await response.text();


  if (!text.trim()) {

    throw new Error(
      "Google Sheet returned empty data."
    );

  }


  return text;

}


// ======================================================
// LOAD SHEET
//
// IMPORTANT:
// DATA IS LOADED IN MEMORY,
// BUT NOT DISPLAYED.
// ======================================================

async function preloadSheet() {

  if (
    loading ||
    sheetLoaded
  ) {

    return;

  }


  loading = true;

  showError("");

  setSubtitle(
    "Loading PR Search data…"
  );


  try {

    const csvText =
      await fetchSheet();


    const records =
      parseCSV(csvText);


    if (!records.length) {

      throw new Error(
        "No data received from Google Sheet."
      );

    }


    const cleaned =
      cleanData(records);


    headers =
      cleaned.headers;

    rows =
      cleaned.rows;


    sheetLoaded =
      true;


    // VERY IMPORTANT
    // Do NOT display data initially.

    filtered = [];

    offset = 0;


    mobileResults.innerHTML = "";

    tbody.innerHTML = "";

    thead.innerHTML = "";


    tableWrap.style.display =
      "none";

    pager.style.display =
      "none";


    resultsSummary.textContent =
      "Enter PR / Complaint Number to search.";


    setSubtitle(
      `${rows.length.toLocaleString()} records • Ready to search`
    );


  } catch (error) {

    console.error(error);


    showError(
      error instanceof Error
        ? error.message
        : String(error)
    );


    setSubtitle(
      "Failed to load PR Search."
    );


  } finally {

    loading = false;

  }

}


// ======================================================
// FIND COLUMN
// ======================================================

function findColumn(names) {

  const wanted =
    names.map(normalize);


  // Exact match

  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    const header =
      normalize(headers[i]);


    if (
      wanted.includes(header)
    ) {

      return i;

    }

  }


  // Partial match

  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    const header =
      normalize(headers[i]);


    for (
      const name of wanted
    ) {

      if (
        header.includes(name)
      ) {

        return i;

      }

    }

  }


  return -1;

}


// ======================================================
// PLACE OF DAMAGE COLUMN
// ======================================================

function getPlaceColumn() {

  const index =
    findColumn([

      "place of damage",
      "placeofdamage",
      "damage place",
      "damaged place",
      "place damaged",
      "place of damaged",
      "damage location",
      "location of damage"

    ]);


  if (index >= 0) {

    return index;

  }


  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    const h =
      normalize(headers[i]);


    if (
      h.includes("place") &&
      h.includes("damage")
    ) {

      return i;

    }

  }


  return -1;

}


// ======================================================
// PR NUMBER COLUMN
// ======================================================

function getPRColumn() {

  return findColumn([

    "pr number",
    "pr no",
    "pr no.",
    "pr",
    "pr_number",
    "prnumber",
    "purchase requisition",
    "pr number / complaint number",
    "complaint number",
    "complaint no",
    "complaint no."

  ]);

}


// ======================================================
// PR / DAMAGE DATE COLUMN
// ======================================================

function getDamageDateColumn() {

  let index =
    findColumn([

      "pr date",
      "pr_date",
      "prdate",
      "damage date",
      "date of damage",
      "damaged date",
      "date damaged",
      "complaint date"

    ]);


  if (index >= 0) {

    return index;

  }


  // Fall back to issue date

  index =
    getIssueDateColumn();


  return index;

}


// ======================================================
// ISSUE DATE COLUMN
// ======================================================

function getIssueDateColumn() {

  return findColumn([

    "issue date",
    "issued date",
    "issue_date",
    "issuedate",
    "tx issue date",
    "transformer issue date",
    "date of issue",
    "transformer issued date",
    "dt issue date"

  ]);

}


// ======================================================
// REPLACEMENT DATE COLUMN
// ======================================================

function getReplacementDateColumn() {

  return findColumn([

    "replacement date",
    "replacement_date",
    "replacementdate",
    "tx replacement date",
    "transformer replacement date",
    "date of replacement",
    "dt replacement date"

  ]);

}


// ======================================================
// DATE PARSER
// ======================================================

function parsePossibleDate(value) {

  const text =
    String(value ?? "").trim();


  if (!text) {

    return null;

  }


  // YYYY-MM-DD

  let match =
    text.match(
      /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/
    );


  if (match) {

    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    ).getTime();

  }


  // DD-MM-YYYY

  match =
    text.match(
      /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/
    );


  if (match) {

    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1])
    ).getTime();

  }


  const parsed =
    Date.parse(text);


  return Number.isNaN(parsed)
    ? null
    : parsed;

}


// ======================================================
// ORDINAL
// ======================================================

function getOrdinal(number) {

  const names = {

    1: "First",
    2: "Second",
    3: "Third",
    4: "Fourth",
    5: "Fifth",
    6: "Sixth",
    7: "Seventh",
    8: "Eighth",
    9: "Ninth",
    10: "Tenth",
    11: "Eleventh",
    12: "Twelfth",
    13: "Thirteenth",
    14: "Fourteenth",
    15: "Fifteenth",
    16: "Sixteenth",
    17: "Seventeenth",
    18: "Eighteenth",
    19: "Nineteenth",
    20: "Twentieth"

  };


  if (
    names[number]
  ) {

    return names[number];

  }


  return `${number}th`;

}


// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// ======================================================
// REPEATED DAMAGE
//
// SAME PLACE OF DAMAGE
// ======================================================

function getRepeatedDamage(row) {

  const placeIndex =
    getPlaceColumn();


  if (placeIndex < 0) {

    return {

      type: "unknown",

      count: 0,

      history: []

    };

  }


  const currentPlace =
    normalize(
      row[placeIndex] ?? ""
    );


  if (!currentPlace) {

    return {

      type: "unknown",

      count: 0,

      history: []

    };

  }


  const prIndex =
    getPRColumn();


  const dateIndex =
    getDamageDateColumn();


  const history = [];


  rows.forEach(
    (otherRow, rowIndex) => {

      const otherPlace =
        normalize(
          otherRow[placeIndex] ?? ""
        );


      if (
        otherPlace === currentPlace
      ) {

        const prNumber =
          prIndex >= 0
            ? String(
                otherRow[prIndex] ?? ""
              ).trim()
            : "";


        const date =
          dateIndex >= 0
            ? String(
                otherRow[dateIndex] ?? ""
              ).trim()
            : "";


        history.push({

          rowIndex,

          prNumber,

          date

        });

      }

    }
  );


  // Sort oldest → newest

  history.sort(
    (a, b) => {

      const da =
        parsePossibleDate(
          a.date
        );


      const db =
        parsePossibleDate(
          b.date
        );


      if (
        da !== null &&
        db !== null
      ) {

        return da - db;

      }


      return (
        a.rowIndex -
        b.rowIndex
      );

    }
  );


  if (
    history.length >= 2
  ) {

    return {

      type: "repeated",

      count:
        history.length,

      history

    };

  }


  return {

    type: "notRepeated",

    count:
      history.length,

    history

  };

}


// ======================================================
// TRANSFORMER STATUS
// ======================================================

function getTransformerStatus(row) {

  const replacementIndex =
    getReplacementDateColumn();


  const issueIndex =
    getIssueDateColumn();


  const replacementDate =
    replacementIndex >= 0
      ? String(
          row[replacementIndex] ?? ""
        ).trim()
      : "";


  const issueDate =
    issueIndex >= 0
      ? String(
          row[issueIndex] ?? ""
        ).trim()
      : "";


  // Replacement gets priority

  if (
    replacementDate
  ) {

    return {

      type: "installed",

      date: replacementDate

    };

  }


  if (
    issueDate
  ) {

    return {

      type: "issued",

      date: issueDate

    };

  }


  return {

    type: "none",

    date: ""

  };

}


// ======================================================
// STATUS BOX
// ======================================================

function createStatus(row) {

  const box =
    document.createElement("div");


  // ====================================================
  // TRANSFORMER STATUS
  // ====================================================

  const transformer =
    getTransformerStatus(row);


  if (
    transformer.type === "installed"
  ) {

    const message =
      document.createElement("div");


    message.className =
      "status installed";


    message.innerHTML =
      `
      🎉 Congratulations!<br>
      Your Transformer is installed.
      `;


    if (
      transformer.date
    ) {

      const date =
        document.createElement("div");


      date.style.marginTop =
        "5px";


      date.style.fontSize =
        "12px";


      date.style.fontWeight =
        "500";


      date.textContent =
        `Replacement Date: ${transformer.date}`;


      message.appendChild(date);

    }


    box.appendChild(message);

  }


  else if (
    transformer.type === "issued"
  ) {

    const message =
      document.createElement("div");


    message.className =
      "status issued";


    message.innerHTML =
      `
      ⚡ Your Transformer is issued by Workshop.<br>
      Please contact Driver for installation.
      `;


    if (
      transformer.date
    ) {

      const date =
        document.createElement("div");


      date.style.marginTop =
        "5px";


      date.style.fontSize =
        "12px";


      date.style.fontWeight =
        "500";


      date.textContent =
        `Issue Date: ${transformer.date}`;


      message.appendChild(date);

    }


    box.appendChild(message);

  }


  // ====================================================
  // REPEATED DAMAGE
  // ====================================================

  const repeated =
    getRepeatedDamage(row);


  if (
    repeated.type === "notRepeated"
  ) {

    const message =
      document.createElement("div");


    message.className =
      "status notRepeated";


    message.textContent =
      "✅ Not a repeated damage";


    box.appendChild(message);

  }


  else if (
    repeated.type === "repeated"
  ) {

    const message =
      document.createElement("div");


    message.className =
      "status repeated";


    // Heading

    const heading =
      document.createElement("div");


    heading.innerHTML =
      `⚠️ Repeated Damage – ${repeated.count} Times`;


    heading.style.fontSize =
      "16px";


    heading.style.fontWeight =
      "800";


    heading.style.marginBottom =
      "7px";


    message.appendChild(heading);


    // Warning

    const warning =
      document.createElement("div");


    warning.textContent =
      "Please Ensure Increasing Capacity if Overloaded.";


    warning.style.marginBottom =
      "10px";


    message.appendChild(warning);


    //
