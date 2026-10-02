// ==========================================
// TRANSFORMER TRACKING
// ==========================================

const SHEET_ID = "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";
const SHEET_GID = "1464518527";

const CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const CACHE_KEY = "transformer_tracking_cache_v1";
const CACHE_TTL_MS = 10 * 60 * 1000;


// ==========================================
// ELEMENTS
// ==========================================

const el = (id) => document.getElementById(id);

const subtitle = el("subtitle");
const refreshBtn = el("refreshBtn");

const qInput = el("q");
const searchBtn = el("searchBtn");

const errorBox = el("error");

const resultsSummary = el("resultsSummary");

const prevBtn = el("prevBtn");
const nextBtn = el("nextBtn");

const tableWrap = el("tableWrap");
const thead = el("thead");
const tbody = el("tbody");

const mobileResults = el("mobileResults");


// ==========================================
// DATA
// ==========================================

let headers = [];
let rows = [];
let filtered = [];

let offset = 0;

const limit = 50;


// ==========================================
// ERROR
// ==========================================

function showError(msg) {

  errorBox.style.display = msg ? "block" : "none";

  errorBox.textContent = msg || "";

}


// ==========================================
// NORMALIZE
// ==========================================

function normalize(s) {

  return String(s ?? "")
    .trim()
    .toLowerCase();

}


// ==========================================
// CSV PARSER
// ==========================================

function parseCSV(text) {

  const out = [];

  let row = [];
  let cur = "";

  let i = 0;
  let inQuotes = false;


  while (i < text.length) {

    const ch = text[i];


    if (inQuotes) {

      if (ch === '"') {

        const next = text[i + 1];

        if (next === '"') {

          cur += '"';
          i += 2;
          continue;

        }

        inQuotes = false;

        i += 1;

        continue;
      }

      cur += ch;

      i += 1;

      continue;
    }


    if (ch === '"') {

      inQuotes = true;

      i += 1;

      continue;

    }


    if (ch === ",") {

      row.push(cur);

      cur = "";

      i += 1;

      continue;

    }


    if (ch === "\n") {

      row.push(cur);

      out.push(row);

      row = [];

      cur = "";

      i += 1;

      continue;

    }


    if (ch === "\r") {

      i += 1;

      continue;

    }


    cur += ch;

    i += 1;

  }


  row.push(cur);

  out.push(row);

  return out;

}


// ==========================================
// FIND HEADER
// ==========================================

function detectHeaderRow(records) {

  const n = Math.min(records.length, 15);

  let bestIdx = 0;

  let bestScore = -1;


  for (let i = 0; i < n; i++) {

    const r = records[i] || [];

    const nonEmpty =
      r.filter((c) => normalize(c).length > 0).length;

    if (nonEmpty > bestScore) {

      bestScore = nonEmpty;

      bestIdx = i;

    }

  }


  return bestScore >= 3 ? bestIdx : 0;

}


// ==========================================
// CLEAN DATA
// ==========================================

function cleanData(records) {

  const headerIdx = detectHeaderRow(records);

  const headerRow =
    (records[headerIdx] || []).map((h, i) => {

      const t = String(h ?? "").trim();

      return t
        ? t
        : `Column ${i + 1}`;

    });


  const data = records
    .slice(headerIdx + 1)

    .map((r) =>
      r.map((c) => String(c ?? ""))
    )

    .filter((r) =>
      r.some((c) => normalize(c))
    );


  return {
    headerRow,
    data
  };

}


// ==========================================
// FETCH CSV
// ==========================================

async function fetchSheetCSV(force = false) {

  const now = Date.now();


  if (!force) {

    const cached =
      localStorage.getItem(CACHE_KEY);


    if (cached) {

      try {

        const parsed = JSON.parse(cached);


        if (
          parsed &&
          now - parsed.fetchedAt < CACHE_TTL_MS &&
          typeof parsed.csvText === "string"
        ) {

          return {
            csvText: parsed.csvText,
            fetchedAt: parsed.fetchedAt,
            cached: true
          };

        }

      } catch {

        // Ignore cache errors

      }

    }

  }


  const res =
    await fetch(CSV_URL, {
      cache: "no-store"
    });


  if (!res.ok) {

    throw new Error(
      `CSV fetch failed: ${res.status}`
    );

  }


  const csvText =
    await res.text();


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
// SEARCH
// ==========================================

function applySearch() {

  const q =
    normalize(qInput.value);


  // Empty search = show all data

  if (!q) {

    filtered = [...rows];

    offset = 0;

    renderPage();

    return;

  }


  /*
    Search PR / Complaint related columns first.
    If no such column is found, search all columns.
  */

  const searchColumns = [];


  headers.forEach((header, index) => {

    const h = normalize(header);

    if (
      h.includes("pr") ||
      h.includes("complaint") ||
      h.includes("complain")
    ) {

      searchColumns.push(index);

    }

  });


  filtered = rows.filter((row) => {

    if (searchColumns.length) {

      return searchColumns.some((index) =>
        normalize(row[index]).includes(q)
      );

    }


    return row.some((cell) =>
      normalize(cell).includes(q)
    );

  });


  offset = 0;

  renderPage();

}


// ==========================================
// DESKTOP TABLE
// ==========================================

function renderTable(page) {

  thead.innerHTML = "";

  tbody.innerHTML = "";


  const trh =
    document.createElement("tr");


  headers.forEach((header) => {

    const th =
      document.createElement("th");

    th.textContent = header;

    trh.appendChild(th);

  });


  thead.appendChild(trh);


  page.forEach((row) => {

    const tr =
      document.createElement("tr");


    headers.forEach((_header, index) => {

      const td =
        document.createElement("td");

      td.textContent =
        row[index] ?? "";

      tr.appendChild(td);

    });


    tbody.appendChild(tr);

  });


  tableWrap.style.display =
    page.length ? "block" : "none";

}


// ==========================================
// MOBILE CARDS
// ==========================================

function renderMobileCards(page) {

  mobileResults.innerHTML = "";


  page.forEach((row, rowIndex) => {

    const card =
      document.createElement("div");

    card.className =
      "dataCard";


    const title =
      document.createElement("div");

    title.className =
      "dataCardTitle";

    title.textContent =
      `Transformer Record ${offset + rowIndex + 1}`;


    card.appendChild(title);


    headers.forEach((header, index) => {

      const value =
        row[index] ?? "";


      if (!normalize(value)) return;


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


      const val =
        document.createElement("span");

      val.className =
        "dataValue";

      val.textContent =
        value;


      item.appendChild(label);

      item.appendChild(val);


      card.appendChild(item);

    });


    mobileResults.appendChild(card);

  });

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


  if (!filtered.length) {

    resultsSummary.textContent =
      "No records found.";

  } else {

    resultsSummary.textContent =
      `Showing ${offset + 1}–${
        Math.min(
          filtered.length,
          offset + page.length
        )
      } of ${filtered.length}`;

  }


  prevBtn.disabled =
    offset === 0;


  nextBtn.disabled =
    offset + limit >= filtered.length;


  renderTable(page);

  renderMobileCards(page);

}


// ==========================================
// INITIAL LOAD
// ==========================================

async function init(force = false) {

  showError("");

  setSubtitle("Loading transformer data…");


  try {

    const {
      csvText,
      fetchedAt,
      cached
    } =
      await fetchSheetCSV(force);


    const records =
      parseCSV(csvText);


    const cleaned =
      cleanData(records);


    headers =
      cleaned.headerRow;


    rows =
      cleaned.data;


    /*
      IMPORTANT:
      Automatically show all data
      without pressing Search.
    */

    filtered =
      [...rows];


    offset = 0;


    renderPage();


    setSubtitle(
      `${rows.length.toLocaleString()} records • Updated ${new Date(
        fetchedAt
      ).toLocaleString()}${
        cached ? " • cached" : ""
      }`
    );


  } catch (e) {

    showError(
      e instanceof Error
        ? `${e.message}. If this is on GitHub Pages, check CSV access/CORS.`
        : String(e)
    );


    setSubtitle(
      "Failed to load transformer data."
    );

  }

}


// ==========================================
// EVENTS
// ==========================================

searchBtn.addEventListener(
  "click",
  applySearch
);


qInput.addEventListener(
  "keydown",
  (e) => {

    if (e.key === "Enter") {

      applySearch();

    }

  }
);


// Search automatically while typing

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
