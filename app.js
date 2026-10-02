const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/" +
  SHEET_ID +
  "/export?format=csv&gid=" +
  SHEET_GID;

let DATA = [];
let HEADERS = [];
let LOADED = false;
let LOADING = null;


/* =========================================================
   START
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  const input =
    document.getElementById("searchInput");

  const button =
    document.getElementById("searchBtn");


  button.addEventListener("click", function () {
    searchData(input.value);
  });


  input.addEventListener("input", function () {

    clearTimeout(window.searchTimer);

    const value =
      input.value.trim();


    if (!value) {

      document.getElementById("results").innerHTML = "";

      document.getElementById("searchStatus").textContent =
        "Enter PR / Complaint Number to search.";

      return;
    }


    window.searchTimer =
      setTimeout(function () {
        searchData(value);
      }, 500);

  });

});


/* =========================================================
   LOAD GOOGLE SHEET
========================================================= */

function loadData() {

  if (LOADED) {
    return Promise.resolve(DATA);
  }

  if (LOADING) {
    return LOADING;
  }


  LOADING =
    fetch(SHEET_URL + "&_=" + Date.now())

    .then(function (response) {

      if (!response.ok) {
        throw new Error(
          "Google Sheet connection failed."
        );
      }

      return response.text();

    })

    .then(function (csv) {

      const rows =
        parseCSV(csv);


      if (!rows.length) {
        throw new Error(
          "No data found in PR SEARCH."
        );
      }


      /*
        FIRST ROW = ACTUAL HEADERS
      */

      HEADERS =
        rows[0].map(function (h, i) {

          let name =
            String(h || "")
              .replace(/^\uFEFF/, "")
              .trim();

          if (!name) {
            name = "Column " + (i + 1);
          }

          return name;

        });


      DATA = [];


      for (let i = 1; i < rows.length; i++) {

        const row =
          rows[i];


        if (!row || !row.length) {
          continue;
        }


        let record = {};


        for (
          let c = 0;
          c < HEADERS.length;
          c++
        ) {

          record[HEADERS[c]] =
            String(row[c] || "").trim();

        }


        record.__rowNumber =
          i + 1;


        DATA.push(record);

      }


      LOADED = true;

      return DATA;

    })

    .catch(function (error) {

      LOADING = null;

      throw error;

    });


  return LOADING;
}


/* =========================================================
   SEARCH ALL COLUMNS
========================================================= */

function searchData(searchText) {

  const status =
    document.getElementById("searchStatus");

  const results =
    document.getElementById("results");


  const query =
    normalize(searchText);


  if (!query) {
    return;
  }


  status.textContent =
    "Searching PR SEARCH...";


  results.innerHTML =
    '<div class="loading">Loading data...</div>';


  loadData()

  .then(function (records) {


    /*
      SEARCH EVERY COLUMN
    */

    const found =
      records.filter(function (record) {

        return Object.keys(record).some(function (key) {

          if (key === "__rowNumber") {
            return false;
          }

          return normalize(record[key])
            .includes(query);

        });

      });


    status.textContent =
      found.length +
      " record(s) found";


    if (!found.length) {

      results.innerHTML =
        '<div class="no-result">' +
        'No matching record found.' +
        '</div>';

      return;

    }


    /*
      CREATE REPEATED DAMAGE HISTORY
    */

    const history =
      createHistory(records);


    let html = "";


    found.forEach(function (record, index) {

      html +=
        createRecordCard(
          record,
          index + 1,
          history
        );

    });


    results.innerHTML = html;

  })

  .catch(function (error) {

    console.error(error);

    status.textContent =
      "Unable to load PR SEARCH.";

    results.innerHTML =
      '<div class="no-result">' +
      '<b>Unable to load data</b><br><br>' +
      escapeHTML(error.message) +
      '</div>';

  });

}


/* =========================================================
   FIND FIELD BY HEADER
========================================================= */

function getField(record, aliases) {

  const keys =
    Object.keys(record);


  for (let a = 0; a < aliases.length; a++) {

    const wanted =
      normalizeHeader(aliases[a]);


    for (let k = 0; k < keys.length; k++) {

      if (
        keys[k] === "__rowNumber"
      ) {
        continue;
      }


      if (
        normalizeHeader(keys[k]) === wanted
      ) {

        return String(
          record[keys[k]] || ""
        ).trim();

      }

    }

  }


  return "";
}


/* =========================================================
   IMPORTANT FIELDS
========================================================= */

function fields(record) {

  return {

    damageDate: getField(record, [
      "DATE OF DAMAGE",
      "DATE OF DAMAGE "
    ]),

    place: getField(record, [
      "PLACE OF DAMAGE",
      "PLACE OF DAMAGE ",
      "PLACE",
      "LOCATION"
    ]),

    didNo: getField(record, [
      "DID NO",
      "DID NO.",
      "DTC ID",
      "DTC NO"
    ]),

    capacity: getField(record, [
      "CAPACITY",
      "CAPACITY IN KVA",
      "KVA"
    ]),

    complaintNo: getField(record, [
      "COMPLAIN NUMBER",
      "COMPLAINT NUMBER",
      "COMPLAINT NO",
      "COMPLAINT NO."
    ]),

    complaintDate: getField(record, [
      "COMPLAIN DATE",
      "COMPLAINT DATE"
    ]),

    prNo: getField(record, [
      "PR NO",
      "PR NO.",
      "PR NUMBER",
      "PR NUMBER "
    ]),

    prDate: getField(record, [
      "PR DATE",
      "PR DATE "
    ]),

    jeName: getField(record, [
      "JE NAME",
      "JE Name",
      "JE"
    ]),

    jeMobile: getField(record, [
      "JE MOBILE",
      "JE Mobile",
      "JE MOBILE NO"
    ]),

    firm: getField(record, [
      "ISSUED TO FIRM",
      "ISSUE TO FIRM",
      "FIRM",
      "FIRM NAME"
    ]),

    issueDate: getField(record, [
      "ISSUE DATE",
      "ISSUED DATE"
    ]),

    driver: getField(record, [
      "DRIVER NAME",
      "DRIVER"
    ]),

    driverMobile: getField(record, [
      "DRIVER MOBILE",
      "DRIVER MOBILE NO",
      "DRIVER PHONE"
    ]),

    replacementDate: getField(record, [
      "REPLACEMENT DATE",
      "TX REPLACEMENT DATE"
    ]),

    time: getField(record, [
      "TIME"
    ]),

    returnDate: getField(record, [
      "TX RETURN DATE",
      "RETURN DATE",
      "TX Return Date",
      "W RETURN DATE"
    ]),

    observation: getField(record, [
      "OBSERVATION DTC",
      "OBSERVATION"
    ])

  };

}


/* =========================================================
   CREATE CARD
========================================================= */

function createRecordCard(
  record,
  number,
  history
) {

  const f =
    fields(record);


  /* ---------------------------------------------
     STATUS
  --------------------------------------------- */

  let statusHTML = "";


  if (f.replacementDate) {

    statusHTML =
      '<div class="status status-installed">' +

      '🎉 Congratulations! Your Transformer installed' +

      '<br>' +

      '<span style="font-weight:normal">' +

      'Replacement Date: ' +

      escapeHTML(f.replacementDate) +

      '</span>' +

      '</div>';

  }

  else if (f.issueDate) {

    statusHTML =
      '<div class="status status-issued">' +

      '🔧 Your Transformer Issued by Workshop' +

      '<br>' +

      '<span style="font-weight:normal">' +

      'Please Contact Driver for Installation' +

      '<br>Issue Date: ' +

      escapeHTML(f.issueDate);


    if (f.driver) {

      statusHTML +=
        '<br>Driver: ' +
        escapeHTML(f.driver);

    }


    if (f.driverMobile) {

      statusHTML +=
        '<br>Mobile: ' +
        escapeHTML(f.driverMobile);

    }


    statusHTML +=
      '</span></div>';

  }

  else {

    statusHTML =
      '<div class="status status-pending">' +

      '⏳ Transformer Replacement Pending' +

      '</div>';

  }


  /* ---------------------------------------------
     REPEATED DAMAGE
  --------------------------------------------- */

  let repeatHTML = "";


  const placeKey =
    normalize(f.place);


  const repeated =
    history[placeKey] || [];


  if (
    placeKey &&
    repeated.length > 1
  ) {

    let historyHTML = "";


    repeated.forEach(function (item, index) {

      historyHTML +=

        '<div class="history-row">' +

        '<b>' +
        ordinal(index + 1) +
        ' Time</b> – ' +

        escapeHTML(
          item.prNo ||
          "PR Not Available"
        ) +

        ' – ' +

        escapeHTML(
          item.prDate ||
          "Date Not Available"
        ) +

        '</div>';

    });


    repeatHTML =

      '<div class="repeat-box">' +

      '<div class="repeat-title">' +
      '⚠️ Repeated Damage' +
      '</div>' +

      '<div class="repeat-message">' +

      'It Damaged ' +
      repeated.length +
      ' times. Please Ensure Increasing Capacity if Overloaded.' +

      '</div>' +

      '<div class="history">' +

      historyHTML +

      '</div>' +

      '</div>';

  }

  else {

    repeatHTML =

      '<div class="repeat-box">' +

      '<div class="repeat-title">' +

      '✓ Not a repeated damage' +

      '</div>' +

      '</div>';

  }


  /* ---------------------------------------------
     DATA
  --------------------------------------------- */

  let dataHTML = "";


  /*
    IMPORTANT:
    Show all populated columns from the sheet.
    Therefore no information is lost even if
    a column heading is slightly different.
  */

  Object.keys(record).forEach(function (key) {

    if (key === "__rowNumber") {
      return;
    }


    const value =
      String(record[key] || "").trim();


    if (!value) {
      return;
    }


    dataHTML +=

      '<div class="data-row">' +

      '<div class="data-label">' +

      escapeHTML(key) +

      '</div>' +

      '<div class="data-value">' +

      escapeHTML(value) +

      '</div>' +

      '</div>';

  });


  return

    '<div class="result-card">' +

      '<div class="card-title">' +

      'Transformer Record #' +

      number +

      '</div>' +

      statusHTML +

      repeatHTML +

      '<div class="data">' +

      dataHTML +

      '</div>' +

    '</div>';

}


/* =========================================================
   REPEATED DAMAGE HISTORY
   SAME PLACE OF DAMAGE
========================================================= */

function createHistory(records) {

  const map = {};


  records.forEach(function (record) {

    const f =
      fields(record);


    if (!f.place) {
      return;
    }


    const key =
      normalize(f.place);


    if (!map[key]) {
      map[key] = [];
    }


    map[key].push({

      prNo:
        f.prNo,

      prDate:
        f.prDate,

      damageDate:
        f.damageDate

    });

  });


  /*
    Sort oldest → newest
  */

  Object.keys(map).forEach(function (key) {

    map[key].sort(function (a, b) {

      return dateValue(a.damageDate) -
             dateValue(b.damageDate);

    });

  });


  return map;

}


/* =========================================================
   NORMALIZE SEARCH
========================================================= */

function normalize(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/[\s\-\/\\().,]/g, "");

}


/* =========================================================
   NORMALIZE HEADER
========================================================= */

function normalizeHeader(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

}


/* =========================================================
   DATE
========================================================= */

function dateValue(value) {

  if (!value) {
    return 0;
  }


  const text =
    String(value).trim();


  let d =
    new Date(text);


  if (!isNaN(d.getTime())) {
    return d.getTime();
  }


  const m =
    text.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    );


  if (m) {

    return new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1])
    ).getTime();

  }


  return 0;

}


/* =========================================================
   ORDINAL
========================================================= */

function ordinal(n) {

  if (n === 1) return "First";
  if (n === 2) return "Second";
  if (n === 3) return "Third";
  if (n === 4) return "Fourth";
  if (n === 5) return "Fifth";

  return n + "th";

}


/* =========================================================
   CSV PARSER
========================================================= */

function parseCSV(text) {

  const rows = [];

  let row = [];

  let cell = "";

  let inQuotes = false;


  for (
    let i = 0;
    i < text.length;
    i++
  ) {

    const c =
      text[i];

    const next =
      text[i + 1];


    if (c === '"') {

      if (
        inQuotes &&
        next === '"'
      ) {

        cell += '"';

        i++;

      }

      else {

        inQuotes =
          !inQuotes;

      }

    }

    else if (
      c === "," &&
      !inQuotes
    ) {

      row.push(cell);

      cell = "";

    }

    else if (
      (c === "\n" || c === "\r") &&
      !inQuotes
    ) {

      if (
        c === "\r" &&
        next === "\n"
      ) {

        i++;

      }


      row.push(cell);

      rows.push(row);

      row = [];

      cell = "";

    }

    else {

      cell += c;

    }

  }


  if (
    cell !== "" ||
    row.length > 0
  ) {

    row.push(cell);

    rows.push(row);

  }


  return rows;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}