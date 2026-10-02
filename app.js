// ======================================================
// PR SEARCH
// ======================================================
//
// Google Sheet:
// PR Search
//
// Behaviour:
//
// 1. Sheet loads immediately in background.
// 2. NO records are displayed initially.
// 3. User enters PR/Complaint Number.
// 4. Search checks EVERY ROW.
// 5. Search checks EVERY COLUMN.
// 6. Results appear immediately.
// 7. No localStorage is used.
// 8. Therefore no "Storage quota exceeded" error.
// 9. Repeated damage is checked using Place of Damage.
// 10. Issue Date / Replacement Date messages are shown.
//
// ======================================================


// ======================================================
// GOOGLE SHEET
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
// DATA VARIABLES
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
    .toLowerCase();

}


// ======================================================
// SHOW ERROR
// ======================================================

function showError(message) {

  errorBox.style.display =
    message
      ? "block"
      : "none";

  errorBox.textContent =
    message || "";

}


// ======================================================
// SET SUBTITLE
// ======================================================

function setSubtitle(text) {

  subtitle.textContent =
    text;

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

    const ch =
      text[i];


    // ------------------------------------------
    // INSIDE QUOTES
    // ------------------------------------------

    if (inQuotes) {

      if (ch === '"') {

        if (
          text[i + 1] === '"'
        ) {

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


    // ------------------------------------------
    // START QUOTES
    // ------------------------------------------

    if (ch === '"') {

      inQuotes = true;

      continue;
    }


    // ------------------------------------------
    // COMMA
    // ------------------------------------------

    if (ch === ",") {

      row.push(value);

      value = "";

      continue;
    }


    // ------------------------------------------
    // NEW LINE
    // ------------------------------------------

    if (ch === "\n") {

      row.push(value);

      result.push(row);

      row = [];

      value = "";

      continue;
    }


    // ------------------------------------------
    // IGNORE CR
    // ------------------------------------------

    if (ch === "\r") {

      continue;
    }


    value += ch;
  }


  // Last row

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
// DETECT HEADER
// ======================================================

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
          normalize(cell)
            .length > 0
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
      records[
        headerIndex
      ] || []
    ).map(
      (
        header,
        index
      ) => {

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
      .slice(
        headerIndex + 1
      )
      .map(
        row =>
          row.map(
            cell =>
              String(
                cell ?? ""
              )
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

    headers:
      headerRow,

    rows:
      data

  };
}


// ======================================================
// FETCH GOOGLE SHEET
//
// NO LOCAL STORAGE
// NO CACHE
//
// This prevents the previous:
// "exceeded the quota"
// error.
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
        cache:
          "no-store"
      }
    );


  if (
    !response.ok
  ) {

    throw new Error(
      `Google Sheet fetch failed: ${response.status}`
    );
  }


  const text =
    await response.text();


  if (
    !text.trim()
  ) {

    throw new Error(
      "Google Sheet returned empty data."
    );
  }


  return text;
}


// ======================================================
// LOAD SHEET IN BACKGROUND
//
// VERY IMPORTANT:
//
// We DO NOT call renderPage()
// after loading.
//
// Therefore the 11,000+ records
// will NOT appear automatically.
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


    if (
      !records.length
    ) {

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


    // ==================================================
    // IMPORTANT
    //
    // DO NOT:
    //
    // filtered = rows;
    // renderPage();
    //
    // This is exactly what caused all data
    // to appear previously.
    // ==================================================

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


    pager.style.display =
      "none";


    resultsSummary.textContent =
      "Enter PR / Complaint Number to search.";


    setSubtitle(
      `${rows.length.toLocaleString()} records • Ready to search`
    );


  } catch (error) {

    console.error(
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


// ======================================================
// FIND COLUMN
// ======================================================

function findColumn(names) {

  const wanted =
    names.map(
      normalize
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
      );


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
      );


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
// PLACE OF DAMAGE
// ======================================================

function getPlaceColumn() {

  let index =
    findColumn([

      "place of damage",
      "placeofdamage",
      "damage place",
      "damaged place",
      "place damaged"

    ]);


  if (
    index >= 0
  ) {

    return index;
  }


  // Flexible detection

  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    const h =
      normalize(
        headers[i]
      );


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
// ISSUE DATE
// ======================================================

function getIssueDateColumn() {

  return findColumn([

    "issue date",
    "issued date",
    "issue_date",
    "issuedate",
    "tx issue date",
    "transformer issue date",
    "date of issue"

  ]);
}


// ======================================================
// REPLACEMENT DATE
// ======================================================

function getReplacementDateColumn() {

  return findColumn([

    "replacement date",
    "replacement_date",
    "replacementdate",
    "tx replacement date",
    "transformer replacement date",
    "date of replacement"

  ]);
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
          row[
            replacementIndex
          ] ?? ""
        ).trim()

      : "";


  const issueDate =
    issueIndex >= 0

      ? String(
          row[
            issueIndex
          ] ?? ""
        ).trim()

      : "";


  // Replacement has priority

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


// ======================================================
// REPEATED DAMAGE
//
// Same PLACE OF DAMAGE
// appearing in multiple records.
//
// ======================================================

function getRepeatedDamage(row) {

  const placeIndex =
    getPlaceColumn();


  if (
    placeIndex < 0
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
        placeIndex
      ] ?? ""
    );


  if (
    !place
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


  let count = 0;


  for (
    const otherRow of rows
  ) {

    const otherPlace =
      normalize(
        otherRow[
          placeIndex
        ] ?? ""
      );


    if (
      otherPlace ===
      place
    ) {

      count++;
    }
  }


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


// ======================================================
// STATUS DISPLAY
// ======================================================

function createStatus(row) {

  const box =
    document.createElement(
      "div"
    );


  const transformer =
    getTransformerStatus(
      row
    );


  // ==================================================
  // INSTALLED
  // ==================================================

  if (
    transformer.type ===
    "installed"
  ) {

    const message =
      document.createElement(
        "div"
      );


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
        document.createElement(
          "div"
        );


      date.style.marginTop =
        "5px";

      date.style.fontSize =
        "12px";

      date.style.fontWeight =
        "500";


      date.textContent =
        `Replacement Date: ${transformer.date}`;


      message.appendChild(
        date
      );
    }


    box.appendChild(
      message
    );
  }


  // ==================================================
  // ISSUED
  // ==================================================

  else if (
    transformer.type ===
    "issued"
  ) {

    const message =
      document.createElement(
        "div"
      );


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
        document.createElement(
          "div"
        );


      date.style.marginTop =
        "5px";

      date.style.fontSize =
        "12px";

      date.style.fontWeight =
        "500";


      date.textContent =
        `Issue Date: ${transformer.date}`;


      message.appendChild(
        date
      );
    }


    box.appendChild(
      message
    );
  }


  // ==================================================
  // REPEATED DAMAGE
  // ==================================================

  const repeated =
    getRepeatedDamage(
      row
    );


  if (
    repeated.type ===
    "notRepeated"
  ) {

    const message =
      document.createElement(
        "div"
      );


    message.className =
      "status notRepeated";


    message.textContent =
      "✅ Not a repeated damage";


    box.appendChild(
      message
    );
  }


  else if (
    repeated.type ===
    "repeated"
  ) {

    const message =
      document.createElement(
        "div"
      );


    message.className =
      "status repeated";


    const times =
      repeated.count === 2

        ? "2 times"

        : `${repeated.count} times`;


    message.innerHTML =
      `
      ⚠️ It Damaged ${times}.<br>
      Please Ensure Increasing Capacity if Overloaded.
      `;


    box.appendChild(
      message
    );
  }


  return box;
}


// ======================================================
// SEARCH
//
// EVERY ROW
// EVERY COLUMN
// ======================================================

function searchData() {

  const query =
    normalize(
      qInput.value
    );


  // -----------------------------------------------
  // EMPTY SEARCH
  // -----------------------------------------------

  if (
    !query
  ) {

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


    pager.style.display =
      "none";


    resultsSummary.textContent =
      "Enter PR / Complaint Number to search.";


    return;
  }


  // -----------------------------------------------
  // DATA NOT READY
  // -----------------------------------------------

  if (
    !sheetLoaded
  ) {

    resultsSummary.textContent =
      loading
        ? "Data is still loading…"
        : "Please wait for data to load…";


    return;
  }


  // -----------------------------------------------
  // SEARCH EVERY ROW
  // AND EVERY COLUMN
  // -----------------------------------------------

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


// ======================================================
// RENDER MOBILE
// ======================================================

function renderMobile(page) {

  mobileResults.innerHTML =
    "";


  page.forEach(
    (
      row,
      index
    ) => {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "dataCard";


      // Status messages

      const status =
        createStatus(
          row
        );


      if (
        status.children.length
      ) {

        card.appendChild(
          status
        );
      }


      // Title

      const title =
        document.createElement(
          "div"
        );


      title.className =
        "cardTitle";


      title.textContent =
        `Transformer Record ${
          offset + index + 1
        }`;


      card.appendChild(
        title
      );


      // All columns

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
            !String(
              value
            ).trim()
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


          const valueElement =
            document.createElement(
              "span"
            );


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


// ======================================================
// RENDER DESKTOP
// ======================================================

function renderDesktop(page) {

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
    header => {

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


  thead.appendChi
