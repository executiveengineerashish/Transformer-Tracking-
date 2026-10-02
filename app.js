// ==========================================
// PR SEARCH
// Searches EVERYTHING in the PR Search tab
// ==========================================

const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";


// Google Sheet CSV
const CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;


// Cache
const CACHE_KEY =
  "pr_search_cache_v2";

const CACHE_TTL_MS =
  10 * 60 * 1000;


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


// ==========================================
// NORMALIZE
// ==========================================

function normalize(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase();

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

    const ch = text[i];


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


  row.push(current);

  output.push(row);


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

    const row =
      records[i] || [];


    const score =
      row.filter(
        (cell) =>
          normalize(cell).length > 0
      ).length;


    if (score > bestScore) {

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
      .map((header, index) => {

        const value =
          String(header ?? "")
            .trim();


        return value
          ? value
          : `Column ${index + 1}`;
      });


  const data =
    records
      .slice(headerIndex + 1)

      .map((row) =>
        row.map(
          (cell) =>
            String(cell ?? "")
        )
      )

      .filter((row) =>
        row.some(
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
// ==========================================

async function fetchSheetCSV(
  force = false
) {

  const now =
    Date.now();


  if (!force) {

    const cached =
      localStorage.getItem(
        CACHE_KEY
      );


    if (cached) {

      try {

        const parsed =
          JSON.parse(cached);


        if (
          parsed &&
          typeof parsed.csvText === "string" &&
          now - parsed.fetchedAt <
            CACHE_TTL_MS
        ) {

          return {

            csvText:
              parsed.csvText,

            fetchedAt:
              parsed.fetchedAt,

            cached: true
          };
        }

      } catch {

        // Ignore bad cache
      }
    }
  }


  const response =
    await fetch(
      CSV_URL,
      {
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      `Google Sheet fetch failed: ${response.status}`
    );
  }


  const csvText =
    await response.text();


  localStorage.setItem(
    CACHE_KEY,

    JSON.stringify({
      fetchedAt: now,
      csvText
    })
  );


  return {

    csvText,

    fetchedAt: now,

    cached: false
  };
}


// ==========================================
// FIND DATE COLUMNS
// ==========================================

function findDateColumn(
  type
) {

  const wanted =
    type === "replacement"
      ? [
          "replacement date",
          "replacementdate",
          "tx replacement date",
          "transformer replacement date",
          "date of replacement",
          "replacement"
        ]
      : [
          "issue date",
          "issued date",
          "issuedate",
          "tx issue date",
          "transformer issue date",
          "date of issue",
          "issue"
        ];


  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    const header =
      normalize(
        headers[i]
      )
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();


    if (
      wanted.some(
        (name) =>
          header === name
      )
    ) {

      return i;
    }
  }


  // Second-level flexible matching

  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    const header =
      normalize(
        headers[i]
      )
      .replace(/[_-]/g, " ");


    if (
      type === "replacement" &&
      header.includes("replacement") &&
      header.includes("date")
    ) {

      return i;
    }


    if (
      type === "issue" &&
      header.includes("issue") &&
      header.includes("date")
    ) {

      return i;
    }
  }


  return -1;
}


// ==========================================
// CHECK TRANSFORMER STATUS
// ==========================================

function getTransformerStatus(
  row
) {

  const replacementColumn =
    findDateColumn(
      "replacement"
    );


  const issueColumn =
    findDateColumn(
      "issue"
    );


  const replacementDate =
    replacementColumn >= 0
      ? String(
          row[replacementColumn] ?? ""
        ).trim()
      : "";


  const issueDate =
    issueColumn >= 0
      ? String(
          row[issueColumn] ?? ""
        ).trim()
      : "";


  /*
    Replacement Date has priority.

    If replacement date is filled:
    Transformer installed.

    Otherwise if issue date is filled:
    Transformer issued by workshop.
  */

  if (replacementDate) {

    return {
      type: "installed",
      date: replacementDate
    };
  }


  if (issueDate) {

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


// ==========================================
// SEARCH ENTIRE PR SEARCH SHEET
// ==========================================

function applySearch() {

  const query =
    normalize(
      qInput.value
    );


  /*
    Empty search:
    Show complete PR Search sheet.
  */

  if (!query) {

    filtered =
      [...rows];

    offset = 0;

    renderPage();

    return;
  }


  /*
    IMPORTANT:

    Search EVERY row
    and EVERY column.

    It is NOT restricted
    to PR column or
    Complaint column.
  */

  filtered =
    rows.filter(
      (row) => {

        return row.some(
          (cell) =>
            normalize(
              cell
            ).includes(query)
        );
      }
    );


  offset = 0;

  renderPage();
}


// ==========================================
// CREATE STATUS MESSAGE
// ==========================================

function createStatusMessage(
  status
) {

  if (
    status.type ===
    "installed"
  ) {

    const div =
      document.createElement(
        "div"
      );


    div.className =
      "statusMessage statusInstalled";


    div.innerHTML =
      `🎉 Congratulations!<br>
       Your Transformer is installed.`;


    if (status.date) {

      const small =
        document.createElement(
          "div"
        );

      small.style.fontSize =
        "12px";

      small.style.fontWeight =
        "500";

      small.style.marginTop =
        "5px";

      small.textContent =
        `Replacement Date: ${status.date}`;


      div.appendChild(
        small
      );
    }


    return div;
  }


  if (
    status.type ===
    "issued"
  ) {

    const div =
      document.createElement(
        "div"
      );


    div.className =
      "statusMessage statusIssued";


    div.innerHTML =
      `⚡ Your Transformer has been issued by Workshop.<br>
       Please contact the driver for installation.`;


    if (status.date) {

      const small =
        document.createElement(
          "div"
        );

      small.style.fontSize =
        "12px";

      small.style.fontWeight =
        "500";

      small.style.marginTop =
        "5px";

      small.textContent =
        `Issue Date: ${status.date}`;


      div.appendChild(
        small
      );
    }


    return div;
  }


  return null;
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
    (row, rowIndex) => {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "dataCard";


      const status =
        getTransformerStatus(
          row
        );


      /*
        Show status only when
        user has actually searched.
      */

      if (
        qInput.value.trim() &&
        status.type !== "none"
      ) {

        const statusMessage =
          createStatusMessage(
            status
          );


        if (statusMessage) {

          card.appendChild(
            statusMessage
          );
        }
      }


      const title =
        document.createElement(
          "div"
        );


      title.className =
        "dataCardTitle";


      title.textContent =
        `Transformer Record ${
          offset + rowIndex + 1
        }`;


      card.appendChild(
        title
      );


      headers.forEach(
        (header, index) => {

          const value =
            row[index] ?? "";


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


          const val =
            document.createElement(
              "span"
            );


          val.className =
            "dataValue";


          val.textContent =
            value;


          item.appendChild(
            label
          );


          item.appendChild(
            val
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
        (_header, index) => {

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
    page.length
      ? "block"
      : "none";
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
// INITIAL LOAD
// ==========================================

async function init(
  force = false
) {

  showError("");

  setSubtitle(
    "Loading PR Search…"
  );


  try {

    const {
      csvText,
      fetchedAt,
      cached
    } =
      await fetchSheetCSV(
        force
      );


    const records =
      parseCSV(
        csvText
      );


    const cleaned =
      cleanData(
        records
      );


    headers =
      cleaned.headerRow;


    rows =
      cleaned.data;


    /*
      Automatically show
      complete PR Search sheet.
    */

    filtered =
      [...rows];


    offset = 0;


    renderPage();


    setSubtitle(
      `${
        rows.length.toLocaleString()
      } records • Updated ${
        new Date(
          fetchedAt
        ).toLocaleString()
      }${
        cached
          ? " • cached"
          : ""
      }`
    );


  } catch (error) {

    showError(
      error instanceof Error
        ? error.message
        : String(error)
    );


    setSubtitle(
      "Failed to load PR Search."
    );
  }
}


// ==========================================
// SET SUBTITLE
// ==========================================

function setSubtitle(
  text
) {

  subtitle.textContent =
    text;
}


// ==========================================
// EVENTS
// ==========================================


// Search button

searchBtn.addEventListener(
  "click",
  applySearch
);


// Search automatically
// while typing

qInput.addEventListener(
  "input",
  () => {

    clearTimeout(
      qInput._searchTimer
    );


    qInput._searchTimer =
      setTimeout(
        applySearch,
        250
      );
  }
);


// Enter key

qInput.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key ===
      "Enter"
    ) {

      applySearch();
    }
  }
);


// Previous

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


// Next

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


// Refresh

refreshBtn.addEventListener(
  "click",
  () => {

    init(true);
  }
);


// ==========================================
// START
// ==========================================

init(false);
