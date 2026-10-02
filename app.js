// =====================================================
// PR SEARCH - TRANSFORMER TRACKING
// ONLY "PR SEARCH" SHEET IS USED
// =====================================================


const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";


// IMPORTANT:
// Uses SHEET NAME instead of monthly sheets.
// No GID required.

const SHEET_NAME =
  "PR SEARCH";


const CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;


// =====================================================
// EXACT COLUMNS FROM YOUR SHEET
// =====================================================

const COL = {

  DATE_DAMAGE: 6,        // G
  PLACE_DAMAGE: 7,       // H
  DID_NO: 8,             // I
  CAPACITY: 9,           // J
  COMPLAINT_NO: 10,      // K
  COMPLAINT_DATE: 11,    // L
  PR_NO: 12,             // M
  PR_DATE: 13,           // N
  JE_NAME: 14,           // O
  JE_MOBILE: 15,         // P
  ISSUED_FIRM: 16,       // Q
  ISSUE_DATE: 17,        // R
  DRIVER_NAME: 18,       // S
  DRIVER_MOBILE: 19,     // T
  REPLACEMENT_DATE: 20,  // U
  TIME: 21,              // V
  TX_RETURN_DATE: 22,    // W
  OBSERVATION: 23        // X

};


// =====================================================
// ELEMENTS
// =====================================================

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


// =====================================================
// DATA
// =====================================================

let headers = [];

let rows = [];

let filtered = [];

let offset = 0;

const PAGE_SIZE = 20;

let sheetLoaded = false;

let loading = false;

let searchTimer = null;


// =====================================================
// NORMALIZE
// =====================================================

function normalize(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

}


// =====================================================
// ERROR
// =====================================================

function showError(message) {

  errorBox.style.display =
    message ? "block" : "none";

  errorBox.textContent =
    message || "";

}


// =====================================================
// SUBTITLE
// =====================================================

function setSubtitle(text) {

  subtitle.textContent = text;

}


// =====================================================
// CSV PARSER
// =====================================================

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

        }

        else {

          inQuotes = false;

        }

      }

      else {

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


// =====================================================
// HEADER DETECTION
// =====================================================

function detectHeaderRow(records) {

  const max =
    Math.min(
      records.length,
      15
    );


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


// =====================================================
// CLEAN DATA
// =====================================================

function cleanData(records) {

  const headerIndex =
    detectHeaderRow(records);


  const headerRow =
    (
      records[headerIndex] || []
    ).map(
      (header, index) => {

        const text =
          String(
            header ?? ""
          ).trim();


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


// =====================================================
// FETCH ONLY PR SEARCH SHEET
// =====================================================

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
      `PR SEARCH fetch failed: ${response.status}`
    );

  }


  const text =
    await response.text();


  if (
    !text.trim()
  ) {

    throw new Error(
      "PR SEARCH sheet returned no data."
    );

  }


  return text;

}


// =====================================================
// LOAD DATA INTO MEMORY
//
// IMPORTANT:
// It loads the sheet,
// BUT DOES NOT DISPLAY RECORDS.
// =====================================================

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
    "Loading PR Search…"
  );


  try {

    const csvText =
      await fetchSheet();


    const records =
      parseCSV(csvText);


    if (
      !records.length
    ) {

      throw new Error(
        "No records received."
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


    // IMPORTANT:
    // Do not show full data.

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
      `${rows.length.toLocaleString()} records • Ready`
    );

  }

  catch (error) {

    console.error(error);


    showError(
      error instanceof Error
        ? error.message
        : String(error)
    );


    setSubtitle(
      "Failed to load PR Search"
    );

  }

  finally {

    loading = false;

  }

}


// =====================================================
// PARSE DATE
// =====================================================

function parsePossibleDate(value) {

  const text =
    String(value ?? "")
      .trim();


  if (!text) {

    return null;

  }


  // DD.MM.YYYY

  let match =
    text.match(
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})/
    );


  if (match) {

    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1])
    ).getTime();

  }


  // DD/MM/YYYY

  match =
    text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})/
    );


  if (match) {

    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1])
    ).getTime();

  }


  // DD-MM-YYYY

  match =
    text.match(
      /^(\d{1,2})-(\d{1,2})-(\d{4})/
    );


  if (match) {

    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1])
    ).getTime();

  }


  // YYYY-MM-DD

  match =
    text.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})/
    );


  if (match) {

    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    ).getTime();

  }


  const parsed =
    Date.parse(text);


  return Number.isNaN(parsed)
    ? null
    : parsed;

}


// =====================================================
// ORDINAL
// =====================================================

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


  return (
    names[number] ||
    `${number}th`
  );

}


// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHtml(value) {

  return String(value ?? "")

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


// =====================================================
// REPEATED DAMAGE
//
// EXACTLY:
// H = PLACE OF DAMAGE
// M = PR NO
// N = PR DATE
// =====================================================

function getRepeatedDamage(row) {

  const currentPlace =
    normalize(
      row[COL.PLACE_DAMAGE]
    );


  if (
    !currentPlace
  ) {

    return {

      type: "unknown",

      count: 0,

      history: []

    };

  }


  const history = [];


  rows.forEach(
    (otherRow, index) => {

      const otherPlace =
        normalize(
          otherRow[
            COL.PLACE_DAMAGE
          ]
        );


      if (
        otherPlace ===
        currentPlace
      ) {

        history.push({

          rowIndex: index,

          prNumber:
            String(
              otherRow[
                COL.PR_NO
              ] ?? ""
            ).trim(),

          prDate:
            String(
              otherRow[
                COL.PR_DATE
              ] ?? ""
            ).trim(),

          damageDate:
            String(
              otherRow[
                COL.DATE_DAMAGE
              ] ?? ""
            ).trim()

        });

      }

    }
  );


  // Oldest first

  history.sort(
    (a, b) => {

      const da =
        parsePossibleDate(
          a.prDate
        );


      const db =
        parsePossibleDate(
          b.prDate
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


  return {

    type:
      history.length >= 2
        ? "repeated"
        : "notRepeated",

    count:
      history.length,

    history

  };

}


// =====================================================
// CREATE STATUS
// =====================================================

function createStatus(row) {

  const box =
    document.createElement("div");


  // ===================================================
  // REPLACEMENT DATE
  // U
  // ===================================================

  const replacementDate =
    String(
      row[
        COL.REPLACEMENT_DATE
      ] ?? ""
    ).trim();


  // ===================================================
  // ISSUE DATE
  // R
  // ===================================================

  const issueDate =
    String(
      row[
        COL.ISSUE_DATE
      ] ?? ""
    ).trim();


  // ===================================================
  // INSTALLED
  // ===================================================

  if (
    replacementDate
  ) {

    const status =
      document.createElement("div");


    status.className =
      "status installed";


    status.innerHTML =
      `
      🎉 Congratulations!<br>
      Your Transformer is installed.
      <div style="
        margin-top:6px;
        font-size:13px;
        font-weight:500;
      ">
        Replacement Date: ${escapeHtml(
          replacementDate
        )}
      </div>
      `;


    box.appendChild(status);

  }


  // ===================================================
  // ISSUED
  // ===================================================

  else if (
    issueDate
  ) {

    const driver =
      String(
        row[
          COL.DRIVER_NAME
        ] ?? ""
      ).trim();


    const mobile =
      String(
        row[
          COL.DRIVER_MOBILE
        ] ?? ""
      ).trim();


    const status =
      document.createElement("div");


    status.className =
      "status issued";


    status.innerHTML =
      `
      ⚡ Your Transformer is issued by Workshop.
      <br>
      Please Contact Driver for Installation.

      <div style="
        margin-top:8px;
        font-size:13px;
        font-weight:500;
      ">

        Issue Date:
        ${escapeHtml(issueDate)}

        ${
          driver
            ? `<br>Driver:
               ${escapeHtml(driver)}`
            : ""
        }

        ${
          mobile
            ? `<br>Mobile:
               ${escapeHtml(mobile)}`
            : ""
        }

      </div>
      `;


    box.appendChild(status);

  }


  // ===================================================
  // REPEATED DAMAGE
  // ===================================================

  const repeated =
    getRepeatedDamage(row);


  if (
    repeated.type ===
    "notRepeated"
  ) {

    const status =
      document.createElement("div");


    status.className =
      "status notRepeated";


    status.textContent =
      "✅ Not a repeated damage";


    box.appendChild(status);

  }


  else if (
    repeated.type ===
    "repeated"
  ) {

    const status =
      document.createElement("div");


    status.className =
      "status repeated";


    const heading =
      document.createElement("div");


    heading.innerHTML =
      `
      ⚠️ Repeated Damage –
      ${repeated.count} Times
      `;


    heading.style.fontSize =
      "17px";


    heading.style.fontWeight =
      "800";


    heading.style.marginBottom =
      "7px";


    status.appendChild(
      heading
    );


    const warning =
      document.createElement("div");


    warning.textContent =
      "Please Ensure Increasing Capacity if Overloaded.";


    warning.style.marginBottom =
      "10px";


    warning.style.fontWeight =
      "600";


    status.appendChild(
      warning
    );


    // -----------------------------------------------
    // HISTORY
    // -----------------------------------------------

    repeated.history.forEach(
      (item, index) => {

        const history =
          document.createElement("div");


        history.style.padding =
          "8px 0";


        history.style.borderTop =
          "1px solid rgba(138,76,0,.20)";


        const ordinal =
          getOrdinal(
            index + 1
          );


        history.innerHTML =
          `
          <strong>
            ${ordinal} Time
          </strong>
          <br>
          PR No:
          ${escapeHtml(
            item.prNumber ||
            "Not available"
          )}
          <br>
          PR Date:
          ${escapeHtml(
            item.prDate ||
            "Not available"
          )}
          `;


        status.appendChild(
          history
        );

      }
    );


    box.appendChild(status);

  }


  return box;

}


// =====================================================
// SEARCH ALL COLUMNS
// =====================================================

function searchData() {

  const query =
    normalize(
      qInput.value
    );


  // ---------------------------------------------------
  // EMPTY SEARCH
  // ---------------------------------------------------

  if (
    !query
  ) {

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


    return;

  }


  // ---------------------------------------------------
  // WAIT FOR SHEET
  // ---------------------------------------------------

  if (
    !sheetLoaded
  ) {

    resultsSummary.textContent =
      "Please wait — PR Search is loading…";


    return;

  }


  // ---------------------------------------------------
  // SEARCH EVERY COLUMN
  // ---------------------------------------------------

  filtered =
    rows.filter(
      row =>
        row.some(
          cell =>
            normalize(
              cell
            ).includes(
              query
            )
        )
    );


  offset = 0;


  renderResults();

}


// =====================================================
// MOBILE CARDS
// =====================================================

function renderMobile(page) {

  mobileResults.innerHTML = "";


  page.forEach(
    (row, pageIndex) => {

      const card =
        document.createElement("div");


      card.className =
        "dataCard";


      // -----------------------------------------------
      // STATUS
      // -----------------------------------------------

      const status =
        createStatus(row);


      if (
        status.children.length
      ) {

        card.appendChild(
          status
        );

      }


      // -----------------------------------------------
      // TITLE
      // -----------------------------------------------

      const title =
        document.createElement("div");


      title.className =
        "cardTitle";


      title.textContent =
        `Transformer Record ${
          offset +
          pageIndex +
          1
        }`;


      card.appendChild(
        title
      );


      // -----------------------------------------------
      // DISPLAY DATA
      // -----------------------------------------------

      headers.forEach(
        (
          header,
          index
        ) => {

          const value =
            row[index] ?? "";


          if (
            !String(value).trim()
          ) {

            return;

          }


          const item =
            document.createElement("div");


          item.className =
            "dataItem";


          const label =
            document.createElement("span");


          label.className =
            "dataLabel";


          label.textContent =
            header;


          const valueElement =
            document.createElement("span");


          valueElement.className =
            "dataValue";


          valueElement.textContent =
            value;


          item.appendChild(
            label
          );


          item.appendChild(
            valueElement
          );


          card.appendChild(
            item
          );

        }
      );


      mobileResults.appendChild(
        card
      );

    }
  );

}


// =====================================================
// DESKTOP TABLE
// ================
