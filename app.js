// ==========================================
// PR SEARCH
// Google Sheet tab: PR Search
//
// Sheet loads immediately in BACKGROUND.
// Full data is NOT displayed.
//
// Search works on EVERY ROW + EVERY COLUMN.
// ==========================================


const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";


const CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;


// ==========================================
// ELEMENTS
// ==========================================

const el = (id) =>
  document.getElementById(id);


const subtitle =
  el("subtitle");

const refreshBtn =
  el("refreshBtn");

const qInput =
  el("q");

const searchBtn =
  el("searchBtn");

const errorBox =
  el("error");

const resultsSummary =
  el("resultsSummary");

const prevBtn =
  el("prevBtn");

const nextBtn =
  el("nextBtn");

const tableWrap =
  el("tableWrap");

const thead =
  el("thead");

const tbody =
  el("tbody");

const mobileResults =
  el("mobileResults");


// ==========================================
// DATA
// ==========================================

let headers = [];

let rows = [];

let filtered = [];

let offset = 0;

const limit = 50;

let sheetLoaded = false;

let loading = false;

let searchTimer = null;


// ==========================================
// NORMALIZE
// ==========================================

function normalize(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase();

}


// ==========================================
// SUBTITLE
// ==========================================

function setSubtitle(text) {

  subtitle.textContent =
    text;

}


// ==========================================
// ERROR
// ==========================================

function showError(message) {

  errorBox.style.display =
    message
      ? "block"
      : "none";

  errorBox.textContent =
    message || "";

}


// ==========================================
// CSV PARSER
// ==========================================

function parseCSV(text) {

  const output = [];

  let row = [];

  let current = "";

  let i = 0;

  let inQuotes = false;


  while (i < text.length) {

    const ch =
      text[i];


    if (inQuotes) {

      if (ch === '"') {

        const next =
          text[i + 1];


        if (next === '"') {

          current += '"';

          i += 2;

          continue;
        }


        inQuotes = false;

        i++;

        continue;
      }


      current += ch;

      i++;

      continue;
    }


    if (ch === '"') {

      inQuotes = true;

      i++;

      continue;
    }


    if (ch === ",") {

      row.push(current);

      current = "";

      i++;

      continue;
    }


    if (ch === "\n") {

      row.push(current);

      output.push(row);

      row = [];

      current = "";

      i++;

      continue;
    }


    if (ch === "\r") {

      i++;

      continue;
    }


    current += ch;

    i++;
  }


  if (
    current !== "" ||
    row.length > 0
  ) {

    row.push(current);

    output.push(row);
  }


  return output;
}


// ==========================================
// HEADER DETECTION
// ==========================================

function detectHeaderRow(records) {

  const count =
    Math.min(
      records.length,
      15
    );


  let bestIndex = 0;

  let bestScore = -1;


  for (
    let i = 0;
    i < count;
    i++
  ) {

    const currentRow =
      records[i] || [];


    const score =
      currentRow.filter(
        (cell) =>
          normalize(cell).length > 0
      ).length;


    if (
      score > bestScore
    ) {

      bestScore = score;

      bestIndex = i;
    }
  }


  return bestScore >= 3
    ? bestIndex
    : 0;
}


// ==========================================
// CLEAN DATA
// ==========================================

function cleanData(records) {

  const headerIndex =
    detectHeaderRow(records);


  const headerRow =
    (records[headerIndex] || [])
      .map(
        (header, index) => {

          const value =
            String(
              header ?? ""
            ).trim();


          return value
            ? value
            : `Column ${index + 1}`;
        }
      );


  const data =
    records
      .slice(headerIndex + 1)

      .map(
        (record) =>
          record.map(
            (cell) =>
              String(cell ?? "")
          )
      )

      .filter(
        (record) =>
          record.some(
            (cell) =>
              normalize(cell)
          )
      );


  return {

    headerRow,

    data

  };
}


// ==========================================
// FETCH GOOGLE SHEET
//
// NO LOCAL STORAGE
// NO CACHE
// ==========================================

async function fetchSheetCSV() {

  const url =
    CSV_URL +
    "&t=" +
    Date.now();


  const response =
    await fetch(
      url,
      {
        cache:
          "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      `Google Sheet fetch failed: ${response.status}`
    );
  }


  const csvText =
    await response.text();


  if (
    !csvText ||
    csvText.trim().length === 0
  ) {

    throw new Error(
      "Google Sheet returned empty data."
    );
  }


  return {

    csvText,

    fetchedAt:
      Date.now()

  };
}


// ==========================================
// PRELOAD SHEET
//
// Loads immediately in background.
//
// DOES NOT DISPLAY ALL DATA.
// ==========================================

async function preloadSheet() {

  if (
    sheetLoaded ||
    loading
  ) {

    return;
  }


  loading = true;

  showError("");

  setSubtitle(
    "Loading PR Search data…"
  );


  try {

    const {
      csvText,
      fetchedAt
    } =
      await fetchSheetCSV();


    const records =
      parseCSV(
        csvText
      );


    if (
      !records.length
    ) {

      throw new Error(
        "No records received from Google Sheet."
      );
    }


    const cleaned =
      cleanData(
        records
      );


    headers =
      cleaned.headerRow;


    rows =
      cleaned.data;


    sheetLoaded = true;


    // IMPORTANT:
    // Do NOT display complete data.

    filtered = [];

    offset = 0;


    mobileResults.innerHTML =
      "";

    tbody.innerHTML =
      "";

    thead.innerHTML =
      "";

    tableWrap.style.display =
      "none";


    resultsSummary.textContent =
      "Enter PR / Complaint Number to search.";


    setSubtitle(
      `${
        rows.length.toLocaleString()
      } records loaded • Ready to search`
    );


  } catch (error) {

    console.error(
      "PR Search loading error:",
      error
    );


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


// ==========================================
// FIND COLUMN
// ==========================================

function findColumnByNames(
  names
) {

  const wanted =
    names.map(
      (name) =>
        normalize(name)
          .replace(
            /[_-]/g,
            " "
          )
          .replace(
            /\s+/g,
            " "
          )
          .trim()
    );


  // Exact match

  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    const header =
      normalize(
        headers[i]
      )
        .replace(
          /[_-]/g,
          " "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();


    if (
      wanted.includes(
        header
      )
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
      normalize(
        headers[i]
      )
        .replace(
          /[_-]/g,
          " "
        )
        .replace(
          /\s+/g,
          " "
        );


    if (
      wanted.some(
        (name) =>
          header.includes(
            name
          )
      )
    ) {

      return i;
    }
  }


  return -1;
}


// ==========================================
// PLACE OF DAMAGE COLUMN
// ==========================================

function findPlaceColumn() {

  const names = [

    "place of damage",

    "placeofdamage",

    "damage place",

    "damaged place",

    "place damaged"

  ];


  const found =
    findColumnByNames(
      names
    );


  if (
    found >= 0
  ) {

    return found;
  }


  // Flexible search

  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    const header =
      normalize(
        headers[i]
      )
        .replace(
          /[_-]/g,
          " "
        );


    if (
      header.includes("place") &&
      header.includes("damage")
    ) {

      return i;
    }
  }


  return -1;
}


// ==========================================
// ISSUE DATE COLUMN
// ==========================================

function findIssueDateColumn() {

  return findColumnByNames([

    "issue date",

    "issued date",

    "issuedate",

    "tx issue date",

    "transformer issue date",

    "date of issue"

  ]);
}


// ==========================================
// REPLACEMENT DATE COLUMN
// ==========================================

function findReplacementDateColumn() {

  return findColumnByNames([

    "replacement date",

    "replacementdate",

    "tx replacement date",

    "transformer replacement date",

    "date of replacement"

  ]);
}


// ==========================================
// TRANSFORMER STATUS
// ==========================================

function getTransformerStatus(
  row
) {

  const replacementColumn =
    findReplacementDateColumn();


  const issueColumn =
    findIssueDateColumn();


  const replacementDate =
    replacementColumn >= 0

      ? String(
          row[
            replacementColumn
          ] ?? ""
        ).trim()

      : "";


  const issueDate =
    issueColumn >= 0

      ? String(
          row[
            issueColumn
          ] ?? ""
        ).trim()

      : "";


  // Replacement date has priority

  if (
    replacementDate
  ) {

    return {

      type:
        "installed",

      date:
        replacementDate

    };
  }


  // Issue date

  if (
    issueDate
  ) {

    return {

      type:
        "issued",

      date:
        issueDate

    };
  }


  return {

    type:
      "none",

    date:
      ""

  };
}


// ==========================================
// REPEATED DAMAGE CHECK
//
// SAME PLACE OF DAMAGE
// ACROSS COMPLETE PR SEARCH SHEET
// ==========================================

function getRepeatedDamageStatus(
  row
) {

  const placeColumn =
    findPlaceColumn();


  if (
    placeColumn < 0
  ) {

    return {

      type:
        "unknown",

      count:
        0,

      place:
        ""

    };
  }


  const place =
    normalize(
      row[
        placeColumn
      ] ?? ""
    );


  if (!place) {

    return {

      type:
        "unknown",

      count:
        0,

      place:
        ""

    };
  }


  let count = 0;


  rows.forEach(
    (otherRow) => {

      const otherPlace =
        normalize(
          otherRow[
            placeColumn
          ] ?? ""
        );


      if (
        otherPlace ===
        place
      ) {

        count++;
      }

    }
  );


  if (
    count >= 2
  ) {

    return {

      type:
        "repeated",

      count,

      place

    };
  }


  return {

    type:
      "notRepeated",

    count:
      1,

    place

  };
}


// ==========================================
// CREATE STATUS MESSAGES
// ==========================================

function createStatusMessage(
  row
) {

  const container =
    document.createElement(
      "div"
    );


  // ========================================
  // TRANSFORMER STATUS
  // ========================================

  const transformerStatus =
    getTransformerStatus(
      row
    );


  if (
    transformerStatus.type ===
    "installed"
  ) {

    const message =
      document.createElement(
        "div"
      );


    message.className =
      "statusMessage statusInstalled";


    message.innerHTML =
      `🎉 Congratulations!<br>
       Your Transformer is installed.`;


    if (
      transformerStatus.date
    ) {

      const date =
        document.createElement(
          "div"
        );


      date.style.fontSize =
        "12px";

      date.style.fontWeight =
        "500";

      date.style.marginTop =
        "5px";


      date.textContent =
        `Replacement Date: ${
          transformerStatus.date
        }`;


      message.appendChild(
        date
      );
    }


    container.appendChild(
      message
    );
  }


  else if (
    transformerStatus.type ===
    "issued"
  ) {

    const message =
      document.createElement(
        "div"
      );


    message.className =
      "statusMessage statusIssued";


    message.innerHTML =
      `⚡ Your Transformer has been issued by Workshop.<br>
       Please contact the driver for installation.`;


    if (
      transformerStatus.date
    ) {

      const date =
        document.createElement(
          "div"
        );


      date.style.fontSize =
        "12px";

      date.style.fontWeight =
        "500";

      date.style.marginTop =
        "5px";


      date.textContent =
        `Issue Date: ${
          transformerStatus.date
        }`;


      message.appendChild(
        date
      );
    }


    container.appendChild(
      message
    );
  }


  // ========================================
  // REPEATED DAMAGE
  // ========================================

  const repeatedStatus =
    getRepeatedDamageStatus(
      row
    );


  if (
    repeatedStatus.type ===
    "notRepeated"
  ) {

    const message =
      document.createElement(
        "div"
      );


    message.className =
      "statusMessage statusNotRepeated";


    message.innerHTML =
      `✅ Not a repeated damage`;


    container.appendChild(
      message
    );
  }


  else if (
    repeatedStatus.type ===
    "repeated"
  ) {

    const message =
      document.createElement(
        "div"
      );


    message.className =
      "statusMessage statusRepeated";


    const times =
      repeatedStatus.count === 2

        ? "2 times"

        : `${repeatedStatus.count} times`;


    message.innerHTML =
      `⚠️ It Damaged ${times}.<br>
       Please Ensure Increasing Capacity if Overloaded.`;


    container.appendChild(
      message
    );
  }


  return container;
}


// ==========================================
// SEARCH
//
// Searches EVERY ROW + EVERY COLUMN
// ==========================================

function applySearch() {

  const query =
    normalize(
      qInput.value
    );


  // Empty search

  if (!query) {

    filtered = [];

    offset = 0;


    mobileResults.innerHTML =
      "";

    tbody.innerHTML =
      "";

    thead.innerHTML =
      "";

    tableWrap.style.display =
      "none";


    resultsSummary.textContent =
      "Enter PR / Complaint Number to search.";


    return;
  }


  // If background loading
  // is not finished yet

  if (!sheetLoaded) {

    resultsSummary.textContent =
      loading
        ? "Data is still loading…"
        : "Please wait for data to load…";


    return;
  }


  // ========================================
  // SEARCH COMPLETE SHEET
  // ========================================

  filtered =
    rows.filter(
      (row) => {

        return row.some(
          (cell) => {

            return normalize(
              cell
            ).includes(
              query
            );

          }
        );

      }
    );


  offset = 0;


  renderPage();
}


// ==========================================
// MOBILE CARDS
// ==========================================

function renderMobileCards(
  page
) {

  mobileResults.innerHTML =
    "";


  page.forEach(
    (
      row,
      rowIndex
    ) => {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "dataCard";


      // Status

      const statusBox =
        createStatusMessage(
          row
        );


      if (
        statusBox.children.length
      ) {

        card.appendChild(
          statusBox
        );
      }


      // Title

      const title =
        document.createElement(
          "div"
        );


      title.className =
        "dataCardTitle";


      title.textContent =
        `Transformer Record ${
          offset +
          rowIndex +
          1
        }`;


      card.appendChild(
        title
      );


      // All non-empty fields

      headers.forEach(
        (
          header,
          columnIndex
        ) => {

          const value =
            row[
              columnIndex
            ] ?? "";


          if (
            !String(value).trim()
          ) {

            return;
          }


          const item =
            document.createElement(
              "div"
            );


          item.className =
            "dataItem";


          const label =
            document.createElement(
              "span"
            );


          label.className =
            "dataLabel";


          label.textContent =
            header;


          const dataValue =
            document.createElement(
              "span"
            );


          dataValue.className =
            "dataValue";


          dataValue.textContent =
            value;


          item.appendChild(
            label
          );


          item.appendChild(
            dataValue
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


// ==========================================
// DESKTOP TABLE
// ==========================================

function renderTable(
  page
) {

  thead.innerHTML =
    "";

  tbody.innerHTML =
    "";


  if (
    !page.length
  ) {

    tableWrap.style.display =
      "none";

    return;
  }


  const headerRow =
    document.createElement(
      "tr"
    );


  headers.forEach(
    (header) => {

      const th =
        document.createElement(
          "th"
        );


      th.textContent =
        header;


      headerRow.appendChild(
        th
      );
    }
  );


  thead.appendChild(
    headerRow
  );


  page.forEach(
    (row) => {

      const tr =
        document.createElement(
          "tr"
        );


      headers.forEach(
        (
          _header,
          index
        ) => {

          const td =
            document.createElement(
              "td"
            );


          td.textContent =
            row[index] ?? "";


          tr.appendChild(
            td
          );
        }
      );


      tbody.appendChild(
        tr
      );
    }
  );


  tableWrap.style.display =
    "block";
}


// ==========================================
// RENDER PAGE
// ==========================================

function renderPage() {

  const page =
    filtered.slice(
      offset,
      offset + limit
    );


  if (
    filtered.length === 0
  ) {

    resultsSummary.textContent =
      "No records found.";

  } else {

    resultsSummary.textContent =
      `Showing ${
        offset + 1
      }–${
        Math.min(
          filtered.length,
          offset + page.length
        )
      } of ${
        filtered.length
      }`;
  }


  prevBtn.disabled =
    offset === 0;


  nextBtn.disabled =
    offset + limit >=
    filtered.length;


  renderMobileCards(
    page
  );


  renderTable(
    page
  );
}


// ==========================================
// REFRESH
//
// Refresh downloads sheet again,
// but still does NOT display all data.
// ==========================================

async function refreshApp() {

  headers = [];

  rows = [];

  filtered = [];

  offset = 0;

  sheetLoaded = false;


  mobileResults.innerHTML =
    "";

  tbody.innerHTML =
    "";

  thead.innerHTML =
    "";

  tableWrap.style.display =
    "none";


  showError("");


  setSubtitle(
    "Refreshing PR Search…"
  );


  resultsSummary.textContent =
    "Preparing search…";


  await preloadSheet();


  // If user already entered
  // a search value, show result
  // after refresh.

  if (
    qInput.value.trim()
  ) {

    applySearch();
  }
}


// ==========================================
// SEARCH BUTTON
// ==========================================

searchBtn.addEventListener(
  "click",
  () => {

    applySearch();

  }
);


// ==========================================
// AUTOMATIC SEARCH
//
// Search after user stops typing
// for 250 milliseconds.
// ==========================================

qInput.addEventListener(
  "input",
  () => {

    clearTimeout(
      searchTimer
    );


    searchTimer =
      setTimeout(
        () => {

          applySearch();

        },
        250
      );

  }
);


// ==========================================
// ENTER KEY
// ==========================================

qInput.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key ===
      "Enter"
    ) {

      clearTimeout(
        searchTimer
      );


      applySearch();
    }

  }
);


// ==========================================
// PREVIOUS
// ==========================================

prevBtn.addEventListener(
  "click",
  () => {

    offset =
      Math.max(
        0,
        offset - limit
      );


    renderPage();

  }
);


// ==========================================
// NEXT
// ==========================================

nextBtn.addEventListener(
  "click",
  () => {

    offset =
      Math.min(
        filtered.length,
        offset + limit
      );


    renderPage();

  }
);


// ==========================================
// REFRESH
// ==========================================

refreshBtn.addEventListener(
  "click",
  () => {

    refreshApp();

  }
);


// ==========================================
// INITIAL SCREEN
//
// START BACKGROUND LOADING
// BUT SHOW NO RECORDS.
// ==========================================

setSubtitle(
  "Loading PR Search data…"
);


resultsSummary.textContent =
  "Preparing search…";


// IMPORTANT:
// This loads the sheet immediately
// in the background.
//
// It does NOT display all records.

preloadSheet();
