/* =========================================================
   TRANSFORMER TRACKING
   Google Sheet - PR SEARCH
   ========================================================= */

const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";


/* Google Sheet CSV URL */

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/" +
  SHEET_ID +
  "/export?format=csv&gid=" +
  SHEET_GID;


/* DATA */

let allData = [];
let headers = [];
let sheetLoaded = false;
let loadingPromise = null;


/* =========================================================
   START
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  const input = document.getElementById("searchInput");
  const button = document.getElementById("searchBtn");

  input.addEventListener("input", function () {

    clearTimeout(window.searchTimer);

    const value = input.value.trim();

    if (!value) {
      document.getElementById("results").innerHTML = "";

      document.getElementById("searchStatus").textContent =
        "Enter PR / Complaint Number to search.";

      return;
    }

    /*
      Wait a little before searching so that typing
      does not trigger multiple searches.
    */

    window.searchTimer = setTimeout(function () {
      searchRecords(value);
    }, 500);

  });


  button.addEventListener("click", function () {

    const value = input.value.trim();

    if (value) {
      searchRecords(value);
    }

  });

});


/* =========================================================
   LOAD GOOGLE SHEET
   ========================================================= */

function loadSheet() {

  if (sheetLoaded) {
    return Promise.resolve(allData);
  }

  if (loadingPromise) {
    return loadingPromise;
  }


  loadingPromise = fetch(SHEET_URL, {
    method: "GET",
    cache: "no-store"
  })

  .then(function (response) {

    if (!response.ok) {
      throw new Error(
        "Google Sheet could not be loaded. HTTP " +
        response.status
      );
    }

    return response.text();

  })

  .then(function (csvText) {

    const rows = parseCSV(csvText);

    if (!rows || rows.length === 0) {
      throw new Error("No data found in PR SEARCH.");
    }

    headers = rows[0].map(function (x) {
      return String(x || "").trim();
    });

    allData = [];

    for (let i = 1; i < rows.length; i++) {

      if (!rows[i]) continue;

      let row = rows[i];

      let hasValue = row.some(function (cell) {
        return String(cell || "").trim() !== "";
      });

      if (!hasValue) continue;

      let obj = {};

      for (let c = 0; c < headers.length; c++) {

        let header = headers[c];

        if (!header) {
          header = "Column " + (c + 1);
        }

        obj[header] = row[c] || "";
      }

      obj.__row = row;

      allData.push(obj);
    }


    sheetLoaded = true;

    return allData;

  })

  .catch(function (error) {

    loadingPromise = null;

    throw error;

  });


  return loadingPromise;
}


/* =========================================================
   SEARCH
   ========================================================= */

function searchRecords(searchText) {

  const status =
    document.getElementById("searchStatus");

  const results =
    document.getElementById("results");


  status.textContent =
    "Connecting to PR SEARCH...";

  results.innerHTML =
    '<div class="loading">Loading data...</div>';


  loadSheet()

    .then(function (data) {

      const query =
        normalize(searchText);


      /*
        Search EVERYTHING / ALL COLUMNS
      */

      const matches = data.filter(function (record) {

        return Object.keys(record).some(function (key) {

          if (key === "__row") {
            return false;
          }

          return normalize(record[key])
            .includes(query);

        });

      });


      status.textContent =
        matches.length +
        " record(s) found";


      if (matches.length === 0) {

        results.innerHTML =
          '<div class="no-result">' +
          'No matching record found.' +
          '</div>';

        return;
      }


      /*
        Sort latest PR date first where possible
      */

      matches.sort(function (a, b) {

        const dateA =
          getField(a, [
            "PR DATE",
            "PR Date",
            "PR DATE "
          ]);

        const dateB =
          getField(b, [
            "PR DATE",
            "PR Date",
            "PR DATE "
          ]);

        return parseDateValue(dateB) -
               parseDateValue(dateA);

      });


      /*
        Build repeated damage history
      */

      const historyMap =
        buildDamageHistory(data);


      let html = "";


      matches.forEach(function (record, index) {

        html += createCard(
          record,
          index + 1,
          historyMap
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
        '<b>Unable to connect to PR SEARCH.</b><br><br>' +
        escapeHTML(error.message) +
        '<br><br>' +
        'Please check that the Google Sheet is shared as ' +
        '"Anyone with the link - Viewer".' +
        '</div>';

    });

}


/* =========================================================
   NORMALIZE SEARCH
   ========================================================= */

function normalize(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/[\s\-\/\\().]/g, "");

}


/* =========================================================
   CREATE CARD
   ========================================================= */

function createCard(record, number, historyMap) {

  const place =
    getField(record, [
      "PLACE OF DAMAGE",
      "Place Of Damage",
      "PLACE OF DAMAGE "
    ]);


  const prNo =
    getField(record, [
      "PR NO",
      "PR NO.",
      "PR NUMBER",
      "PR Number"
    ]);


  const prDate =
    getField(record, [
      "PR DATE",
      "PR Date"
    ]);


  const complaintNo =
    getField(record, [
      "COMPLAIN NUMBER",
      "COMPLAINT NUMBER",
      "Complaint Number"
    ]);


  const complaintDate =
    getField(record, [
      "COMPLAIN DATE",
      "COMPLAINT DATE"
    ]);


  const dateDamage =
    getField(record, [
      "DATE OF DAMAGE",
      "DATE OF DAMAGE "
    ]);


  const didNo =
    getField(record, [
      "DID NO",
      "DID NO."
    ]);


  const capacity =
    getField(record, [
      "CAPACITY",
      "CAPACITY IN KVA",
      "KVA"
    ]);


  const division =
    getField(record, [
      "DIVISION",
      "DIVISION NAME"
    ]);


  const subdivision =
    getField(record, [
      "SUBDIVISION",
      "SUB DIVISION",
      "SUBDIVISION NAME"
    ]);


  const substation =
    getField(record, [
      "SUBSTATION",
      "SUB STATION",
      "SUBSTATION NAME"
    ]);


  const jeName =
    getField(record, [
      "JE Name",
      "JE NAME",
      "JE"
    ]);


  const jeMobile =
    getField(record, [
      "JE Mobile",
      "JE MOBILE"
    ]);


  const firm =
    getField(record, [
      "ISSUED TO FIRM",
      "FIRM",
      "FIRM NAME"
    ]);


  const issueDate =
    getField(record, [
      "ISSUE DATE",
      "ISSUED DATE"
    ]);


  const driver =
    getField(record, [
      "DRIVER NAME",
      "DRIVER"
    ]);


  const driverMobile =
    getField(record, [
      "DRIVER MOBILE",
      "DRIVER MOBILE NO",
      "DRIVER PHONE"
    ]);


  const replacementDate =
    getField(record, [
      "REPLACEMENT DATE",
      "TX REPLACEMENT DATE"
    ]);


  const time =
    getField(record, [
      "TIME"
    ]);


  const returnDate =
    getField(record, [
      "TX RETURN DATE",
      "RETURN DATE",
      "W RETURN DATE",
      "TX Return Date"
    ]);


  const observation =
    getField(record, [
      "OBSERVATION DTC",
      "OBSERVATION"
    ]);


  /* STATUS */

  let statusHTML = "";

  if (replacementDate.trim() !== "") {

    statusHTML =
      '<div class="status-box status-installed">' +
      '🎉 Congratulations! Your Transformer installed' +
      '<br>' +
      '<span style="font-weight:normal">' +
      'Replacement Date: ' +
      escapeHTML(replacementDate) +
      '</span>' +
      '</div>';

  }

  else if (issueDate.trim() !== "") {

    statusHTML =
      '<div class="status-box status-issued">' +
      '🔧 Your Transformer Issued by Workshop' +
      '<br>' +
      '<span style="font-weight:normal">' +
      'Please Contact Driver for Installation' +
      '<br>' +
      'Issue Date: ' +
      escapeHTML(issueDate);

    if (driver) {

      statusHTML +=
        '<br>Driver: ' +
        escapeHTML(driver);

    }

    if (driverMobile) {

      statusHTML +=
        '<br>Mobile: ' +
        escapeHTML(driverMobile);

    }

    statusHTML +=
      '</span></div>';

  }

  else {

    statusHTML =
      '<div class="status-box status-pending">' +
      '⏳ Transformer Replacement Pending' +
      '</div>';

  }


  /* REPEATED DAMAGE */

  let repeatHTML = "";

  const key =
    normalize(place);


  const history =
    historyMap[key] || [];


  if (key && history.length > 1) {

    repeatHTML =
      '<div class="repeat-box">' +

      '<div class="repeat-title">' +
      '⚠️ Repeated Damage' +
      '</div>' +

      '<div>' +
      'It Damaged ' +
      history.length +
      ' times. Please Ensure Increasing Capacity if Overloaded.' +
      '</div>' +

      '<br>' +

      history.map(function (item, i) {

        return (
          '<div class="history-item">' +
          '<b>' +
          getOrdinal(i + 1) +
          ' Time</b> – ' +
          escapeHTML(item.prNo || "PR Not Available") +
          ' – ' +
          escapeHTML(item.prDate || "Date Not Available") +
          '</div>'
        );

      }).join("") +

      '</div>';

  }

  else if (key) {

    repeatHTML =
      '<div class="repeat-box">' +
      '<div class="repeat-title">' +
      '✓ Not a repeated damage' +
      '</div>' +
      '</div>';

  }


  return (

    '<div class="result-card">' +

      '<div class="card-heading">' +
      'Transformer Record #' +
      number +
      '</div>' +

      '<div class="card-body">' +

        statusHTML +

        repeatHTML +

        infoRow("PR Number", prNo) +

        infoRow("PR Date", prDate) +

        infoRow("Complaint Number", complaintNo) +

        infoRow("Complaint Date", complaintDate) +

        infoRow("Date of Damage", dateDamage) +

        infoRow("Place of Damage", place) +

        infoRow("DID No", didNo) +

        infoRow("Capacity", capacity) +

        infoRow("Division", division) +

        infoRow("Subdivision", subdivision) +

        infoRow("Substation", substation) +

        infoRow("JE Name", jeName) +

        infoRow("JE Mobile", jeMobile) +

        infoRow("Issued To Firm", firm) +

        infoRow("Issue Date", issueDate) +

        infoRow("Driver Name", driver) +

        infoRow("Driver Mobile", driverMobile) +

        infoRow("Replacement Date", replacementDate) +

        infoRow("Time", time) +

        infoRow("TX Return Date", returnDate) +

        infoRow("Observation DTC", observation) +

      '</div>' +

    '</div>'

  );

}


/* =========================================================
   INFO ROW
   ========================================================= */

function infoRow(label, value) {

  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return "";
  }


  return (

    '<div class="info-row">' +

      '<div class="info-label">' +
      escapeHTML(label) +
      '</div>' +

      '<div class="info-value">' +
      escapeHTML(value) +
      '</div>' +

    '</div>'

  );

}


/* =========================================================
   REPEATED DAMAGE HISTORY
   Same PLACE OF DAMAGE
   ========================================================= */

function buildDamageHistory(data) {

  const map = {};


  data.forEach(function (record) {

    const place =
      getField(record, [
        "PLACE OF DAMAGE",
        "Place Of Damage",
        "PLACE OF DAMAGE "
      ]);


    if (!place) {
      return;
    }


    const key =
      normalize(place);


    const prNo =
      getField(record, [
        "PR NO",
        "PR NO.",
        "PR NUMBER"
      ]);


    const prDate =
      getField(record, [
        "PR DATE",
        "PR Date"
      ]);


    if (!map[key]) {
      map[key] = [];
    }


    map[key].push({

      prNo: prNo,

      prDate: prDate,

      dateDamage:
        getField(record, [
          "DATE OF DAMAGE"
        ])

    });

  });


  /* Sort each history by date */

  Object.keys(map).forEach(function (key) {

    map[key].sort(function (a, b) {

      return parseDateValue(a.dateDamage) -
             parseDateValue(b.dateDamage);

    });

  });


  return map;

}


/* =========================================================
   GET FIELD
   ========================================================= */

function getField(record, possibleNames) {

  for (let i = 0; i < possibleNames.length; i++) {

    const wanted =
      normalizeHeader(possibleNames[i]);


    const keys =
      Object.keys(record);


    for (let k = 0; k < keys.length; k++) {

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
   HEADER NORMALIZE
   ========================================================= */

function normalizeHeader(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

}


/* =========================================================
   DATE PARSER
   ========================================================= */

function parseDateValue(value) {

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


  /* DD/MM/YYYY */

  let m =
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

function getOrdinal(number) {

  if (number === 1) return "First";
  if (number === 2) return "Second";
  if (number === 3) return "Third";
  if (number === 4) return "Fourth";
  if (number === 5) return "Fifth";

  return number + "th";

}


/* =========================================================
   CSV PARSER
   Handles commas inside quoted cells
   ========================================================= */

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

      }

      else {

        insideQuotes =
          !insideQuotes;

      }

    }

    else if (
      char === "," &&
      !insideQuotes
    ) {

      row.push(cell);

      cell = "";

    }

    else if (
      (char === "\n" || char === "\r") &&
      !insideQuotes
    ) {

      if (
        char === "\r" &&
        next === "\n"
      ) {
        i++;
      }


      row.push(cell);

      cell = "";


      if (row.length > 0) {

        rows.push(row);

      }


      row = [];

    }

    else {

      cell += char;

    }

  }


  /* Last cell */

  if (cell !== "" || row.length > 0) {

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