// Configure your sheet here
const SHEET_ID = "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM"
const SHEET_GID = "1464518527"

// Option A (live): reads directly from Google Sheets CSV export
// Note: for GitHub Pages, this must be publicly accessible and allow browser access.
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`

// Option B (recommended for GitHub Pages if CORS blocks the live URL):
// 1) Download CSV and commit it next to index.html
// 2) Replace CSV_URL with: "./data.csv"
// const CSV_URL = "./data.csv"

const CACHE_KEY = "sheet_search_cache_v1"
const CACHE_TTL_MS = 10 * 60 * 1000

const el = (id) => document.getElementById(id)
const subtitle = el("subtitle")
const csvLink = el("csvLink")
const refreshBtn = el("refreshBtn")
const qInput = el("q")
const modeSel = el("mode")
const colSel = el("col")
const limitSel = el("limit")
const searchBtn = el("searchBtn")
const addFilterBtn = el("addFilterBtn")
const clearFilterBtn = el("clearFilterBtn")
const filtersGrid = el("filtersGrid")
const filterHint = el("filterHint")
const errorBox = el("error")
const resultsSummary = el("resultsSummary")
const prevBtn = el("prevBtn")
const nextBtn = el("nextBtn")
const tableWrap = el("tableWrap")
const thead = el("thead")
const tbody = el("tbody")

let headers = []
let rows = []
let filtered = []
let offset = 0
let limit = Number(limitSel.value || 50)
let filters = []

csvLink.href = CSV_URL

function showError(msg) {
  errorBox.style.display = msg ? "block" : "none"
  errorBox.textContent = msg || ""
}

function normalize(s) {
  return String(s ?? "").trim().toLowerCase()
}

// Minimal CSV parser that handles commas + quotes
function parseCSV(text) {
  const out = []
  let row = []
  let cur = ""
  let i = 0
  let inQuotes = false

  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1]
        if (next === '"') {
          cur += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      cur += ch
      i += 1
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (ch === ",") {
      row.push(cur)
      cur = ""
      i += 1
      continue
    }
    if (ch === "\n") {
      row.push(cur)
      out.push(row)
      row = []
      cur = ""
      i += 1
      continue
    }
    if (ch === "\r") {
      i += 1
      continue
    }
    cur += ch
    i += 1
  }
  row.push(cur)
  out.push(row)
  return out
}

function detectHeaderRow(records) {
  // Pick the "most meaningful" header row from the first ~15 rows
  const n = Math.min(records.length, 15)
  let bestIdx = 0
  let bestScore = -1

  for (let i = 0; i < n; i++) {
    const r = records[i] || []
    const nonEmpty = r.filter((c) => normalize(c).length > 0).length
    const score = nonEmpty
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }
  return bestScore >= 3 ? bestIdx : 0
}

function cleanData(records) {
  const headerIdx = detectHeaderRow(records)
  const headerRow = (records[headerIdx] || []).map((h, i) => {
    const t = String(h ?? "").trim()
    return t ? t : `Column ${i + 1}`
  })

  const data = records
    .slice(headerIdx + 1)
    .map((r) => r.map((c) => String(c ?? "")))
    .filter((r) => r.some((c) => normalize(c)))

  return { headerRow, data, headerIdx }
}

async function fetchSheetCSV(force = false) {
  const now = Date.now()
  if (!force) {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed && now - parsed.fetchedAt < CACHE_TTL_MS && typeof parsed.csvText === "string") {
          return { csvText: parsed.csvText, fetchedAt: parsed.fetchedAt, cached: true }
        }
      } catch {
        // ignore
      }
    }
  }

  const res = await fetch(CSV_URL, { cache: "no-store" })
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`)
  const csvText = await res.text()
  localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: now, csvText }))
  return { csvText, fetchedAt: now, cached: false }
}

function renderColumnOptions() {
  colSel.innerHTML = ""
  headers.forEach((h, i) => {
    const opt = document.createElement("option")
    opt.value = String(i)
    opt.textContent = `${i + 1}. ${h}`
    colSel.appendChild(opt)
  })
  colSel.disabled = modeSel.value !== "column"
}

function setSubtitle(text) {
  subtitle.textContent = text
}

function renderFilters() {
  filtersGrid.innerHTML = ""
  filterHint.style.display = filters.length ? "none" : "block"

  filters.forEach((f, idx) => {
    const wrap = document.createElement("div")
    wrap.className = "filterRow"

    const col = document.createElement("select")
    headers.forEach((h, i) => {
      const opt = document.createElement("option")
      opt.value = String(i)
      opt.textContent = `${i + 1}. ${h}`
      col.appendChild(opt)
    })
    col.value = String(f.col)
    col.addEventListener("change", () => {
      filters[idx].col = Number(col.value)
    })

    const val = document.createElement("input")
    val.placeholder = "Exact value"
    val.value = f.value
    val.addEventListener("input", () => {
      filters[idx].value = val.value
    })

    const rm = document.createElement("button")
    rm.className = "danger"
    rm.textContent = "Remove"
    rm.addEventListener("click", () => {
      filters = filters.filter((_, i) => i !== idx)
      renderFilters()
    })

    wrap.appendChild(col)
    wrap.appendChild(val)
    wrap.appendChild(rm)
    filtersGrid.appendChild(wrap)
  })
}

function applySearch() {
  const q = normalize(qInput.value)
  const mode = modeSel.value
  const col = Number(colSel.value || 0)

  const activeFilters = filters
    .map((f) => ({ col: Number(f.col), value: normalize(f.value) }))
    .filter((f) => f.value)

  const matchesFilters = (row) => {
    for (const f of activeFilters) {
      const cell = row[f.col] ?? ""
      if (normalize(cell) !== f.value) return false
    }
    return true
  }

  const matchesQuery = (row) => {
    if (!q) return true
    if (mode === "column") return normalize(row[col] ?? "").includes(q)
    return row.some((cell) => normalize(cell).includes(q))
  }

  filtered = rows.filter((r) => matchesFilters(r) && matchesQuery(r))
  offset = 0
  renderPage()
}

function renderPage() {
  limit = Number(limitSel.value || 50)
  const page = filtered.slice(offset, offset + limit)

  resultsSummary.textContent =
    filtered.length === 0
      ? "No results."
      : `Showing ${Math.min(filtered.length, offset + 1)}–${Math.min(filtered.length, offset + page.length)} of ${filtered.length}`

  prevBtn.disabled = offset === 0
  nextBtn.disabled = offset + limit >= filtered.length

  // header
  thead.innerHTML = ""
  const trh = document.createElement("tr")
  headers.forEach((h) => {
    const th = document.createElement("th")
    th.textContent = h
    trh.appendChild(th)
  })
  thead.appendChild(trh)

  // body
  tbody.innerHTML = ""
  page.forEach((r) => {
    const tr = document.createElement("tr")
    headers.forEach((_h, ci) => {
      const td = document.createElement("td")
      td.textContent = r[ci] ?? ""
      tr.appendChild(td)
    })
    tbody.appendChild(tr)
  })

  tableWrap.style.display = "block"
}

async function init(force = false) {
  showError("")
  setSubtitle("Loading sheet…")

  try {
    const { csvText, fetchedAt, cached } = await fetchSheetCSV(force)
    const records = parseCSV(csvText)
    const cleaned = cleanData(records)
    headers = cleaned.headerRow
    rows = cleaned.data

    renderColumnOptions()
    renderFilters()

    setSubtitle(
      `${rows.length.toLocaleString()} rows • last fetch ${new Date(fetchedAt).toLocaleString()}${cached ? " (cached)" : ""}`
    )

    // default column = 2nd column if present
    colSel.value = String(Math.min(1, Math.max(0, headers.length - 1)))
    colSel.disabled = modeSel.value !== "column"

    // initial empty search to show something
    filtered = rows
    offset = 0
    renderPage()
  } catch (e) {
    showError(
      e instanceof Error
        ? `${e.message}. If this is on GitHub Pages, it might be a CORS issue. Use local ./data.csv or publish the sheet to web.`
        : String(e)
    )
    setSubtitle("Failed to load sheet.")
  }
}

modeSel.addEventListener("change", () => {
  colSel.disabled = modeSel.value !== "column"
})

limitSel.addEventListener("change", () => {
  renderPage()
})

searchBtn.addEventListener("click", () => applySearch())
qInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") applySearch()
})

addFilterBtn.addEventListener("click", () => {
  if (filters.length >= 3) return
  filters.push({ col: 0, value: "" })
  renderFilters()
})

clearFilterBtn.addEventListener("click", () => {
  filters = []
  renderFilters()
})

prevBtn.addEventListener("click", () => {
  offset = Math.max(0, offset - limit)
  renderPage()
})

nextBtn.addEventListener("click", () => {
  offset = Math.min(filtered.length, offset + limit)
  renderPage()
})

refreshBtn.addEventListener("click", () => init(true))

init(false)

