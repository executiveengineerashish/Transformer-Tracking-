const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/" +
  SHEET_ID +
  "/export?format=csv&gid=" +
  SHEET_GID;


/*
  PR SEARCH columns

  A = 0
  B = 1
  C = 2
  D = 3
  E = 4
  F = 5

  G = 6  DATE OF DAMAGE
  H = 7  PLACE OF DAMAGE
  I = 8  DID NO
  J = 9  CAPACITY
  K = 10 COMPLAIN NUMBER
  L = 11 COMPLAIN DATE
  M = 12 PR NO
  N = 13 PR DATE
  O = 14 JE NAME
  P = 15 JE MOBILE
  Q = 16 ISSUED TO FIRM
  R = 17 ISSUE DATE
  S = 18 DRIVER NAME
  T = 19 DRIVER MOBILE
  U = 20 REPLACEMENT DATE
  V = 21 TIME
  W = 22 TX RETURN DATE
  X = 23 OBSERVATION DTC
*/


let sheetRows = [];
let loaded = false;
let loading = null;


/* ---------------------------------------------------------
   START
--------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", function () {

  const input =
    document.getElementById("searchInput");

  const button =
    document.getElementById("searchBtn");


  button.addEventListener("click", function () {

    searchNow(input.value);

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


    /*
      Automatic search after typing stops
    */

    window.searchTimer =
      setTimeout(function () {

        searchNow(value);

      }, 600);

  });

});


/* ---------------------------------------------------------
   LOAD SHEET
--------------------------------------------------------- */

function loadSheet() {

  if (loaded) {
    return Promise.resolve(sheetRows);
  }

  if (loading) {
    return loading;
  }


  loading =
    fetch(SHEET_URL + "&t=" + Date.now())

      .then(function (response) {

        if (!response.ok) {
          throw new Error(
            "Unable to load Google Sheet"
          );
        }

        return response.text();

      })

      .then(function (csv) {

        const rows =
          parseCSV(csv);


        if (!rows.length) {
          throw new Error("No data found");
        }


        /*
          First row = headers
          Remaining rows = data
        */

        sheetRows =
          rows.slice(1).filter(function (row) {

            return row.some(function (cell) {

              return String(cell || "").trim() !== "";

            });

          });


        loaded = true;

        return sheetRows;

      })

      .catch(function (error) {

        loading = null;

        throw error;

      });


  return loading;
}


/* ---------------------------------------------------------
   SEARCH
--------------------------------------------------------- */

function searchNow(value) {

  const status =
    document.getElementById("searchStatus");

  const results =
    document.getElementById("results");


  const query =
    clean(value);


  if (!query) {
    return;
  }


  status.textContent =
    "Searching PR SEARCH...";


  results.innerHTML =
    '<div class="loading">Loading records...</div>';


  loadSheet()

    .then(function (rows) {

      /*
        Search ALL A:X columns
      */

      const matches =
        rows.filter(function (row) {

          return row.some(function (cell) {

            return clean(cell).includes(query);

          });

        });


      status.textContent =
        matches.length +
        " record(s) found";


      if (!matches.length) {

        results.innerHTML =
          '<div class="no-result">' +
          'No matching record found.' +
          '</div>';

        return;

      }


      /*
        Build repeated damage history
      */

      const history =
        buildHistory(rows);


      let html = "";


      matches.forEach(function (row, index) {

        html +=
          createCard(
            row,
            index + 1,
            history
          );

      });


      results.innerHTML = html;

    })

    .catch(function (error) {

      console.error(error);

      status.textContent =
        "Error loading PR SEARCH";

      results.innerHTML =
        '<div class="no-result">' +
        '<b>Unable to load data.</b><br><br>' +
        error.message +
        '</div>';

    });

}


/* ---------------------------------------------------------
   CREATE RESULT CARD
--------------------------------------------------------- */

function createCard(row, number, history) {

  const damageDate =
    val(row, 6);

  const place =
    val(row, 7);

  const didNo =
    val(row, 8);

  const capacity =
    val(row, 9);

  const complaintNo =
    val(row, 10);

  const complaintDate =
    val(row, 11);

  const prNo =
    val(row, 12);

  const prDate =
    val(row, 13);

  const jeName =
    val(row, 14);

  const jeMobile =
    val(row, 15);

  const firm =
    val(row, 16);

  const issueDate =
    val(row, 17);

  const driver =
    val(row, 18);

  const driverMobile =
    val(row, 19);

  const replacementDate =
    val(row, 20);

  const time =
    val(row, 21);

  const returnDate =
    val(row, 22);

  const observation =
    val(row, 23);


  /* STATUS */

  let statusHTML = "";


  if (replacementDate) {

    statusHTML =
      '<div class="status status-installed">' +
      '🎉 Congratulations! Your Transformer installed' +
      '<br><span style="font-weight:normal">' +
      'Replacement Date: ' +
      esc(replacementDate) +
      '</span>' +
      '</div>';

  }

  else if (issueDate) {

    statusHTML =
      '<div class="status status-issued">' +
      '🔧 Your Transformer Issued by Workshop' +
      '<br>' +
      '<span style="font-weight:normal">' +
      'Please Contact Driver for Installation' +
      '<br>Issue Date: ' +
      esc(issueDate);


    if (driver) {

      statusHTML +=
        '<br>Driver: ' +
        esc(driver);

    }


    if (driverMobile) {

      statusHTML +=
        '<br>Mobile: ' +
        esc(driverMobile);

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


  /* REPEATED DAMAGE */

  let repeatHTML = "";


  const key =
    clean(place);


  const list =
    history[key] || [];


  if (key && list.length > 1) {

    let historyRows = "";


    list.forEach(function (item, index) {

      historyRows +=
        '<div class="history-row">' +

        '<b>' +
        ordinal(index + 1) +
        ' Time</b> – ' +

        esc(item.prNo || "PR Not Available") +

        ' – ' +

        esc(item.prDate || "Date Not Available") +

        '</div>';

    });


    repeatHTML =
      '<div class="repeat-box">' +

      '<div class="repeat-title">' +
      '⚠️ Repeated Damage' +
      '</div>' +

      '<div class="repeat-message">' +
      'It Damaged ' +
      list.length +
      ' times. Please Ensure Increasing Capacity if Overloaded.' +
      '</div>' +

      '<div class="history">' +
      historyRows +
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


  /* CARD */

  return (

    '<div class="result-card">' +

      '<div class="card-title">' +
      'Transformer Record #' +
      number +
      '</div>' +

      statusHTML +

      repeatHTML +

      '<div class="data">' +

        rowHTML("PR Number", prNo) +
        rowHTML("PR Date", prDate) +

        rowHTML("Complaint Number", complaintNo) +
        rowHTML("Complaint Date", complaintDate) +

        rowHTML("Date of Damage", damageDate) +
        rowHTML("Place of Damage", place) +

        rowHTML("DID No", didNo) +
        rowHTML("Capacity", capacity) +

        rowHTML("JE Name", jeName) +
        rowHTML("JE Mobile", jeMobile) +

        rowHTML("Issued To Firm", firm) +
        rowHTML("Issue Date", issueDate) +

        rowHTML("Driver Name", driver) +
        rowHTML("Driver Mobile", driverMobile) +

        rowHTML("Replacement Date", replacementDate) +
        rowHTML("Time", time) +

        rowHTML("TX Return Date", returnDate) +
        rowHTML("Observation DTC", observation) +

      '</div>' +

    '</div>'

  );

}


/* ---------------------------------------------------------
   DATA ROW
--------------------------------------------------------- */

function rowHTML(label, value) {

  if (!value) {
    return "";
  }


  return (

    '<div class="data-row">' +

      '<div class="data-label">' +
      esc(label) +
      '</div>' +

      '<div class="data-value">' +
      esc(value) +
      '</div>' +

    '</div>'

  );

}


/* ---------------------------------------------------------
   REPEATED DAMAGE
--------------------------------------------------------- */

function buildHistory(rows) {

  const map = {};


  rows.forEach(function (row) {

    const place =
      val(row, 7);


    if (!place) {
      return;
    }


    const key =
      clean(place);


    if (!map[key]) {
      map[key] = [];
    }


    map[key].push({

      prNo:
        val(row, 12),

      prDate:
        val(row, 13),

      damageDate:
        val(row, 6)

    });

  });


  /*
    Sort by damage date
  */

  Object.keys(map).forEach(function (key) {

    map[key].sort(function (a, b) {

      return dateValue(a.damageDate) -
             dateValue(b.damageDate);

    });

  });


  return map;

}


/* ---------------------------------------------------------
   GET VALUE
--------------------------------------------------------- */

function val(row, index) {

  if (!row || index >= row.length) {
    return "";
  }

  return String(row[index] || "").trim();

}


/* ---------------------------------------------------------
   SEARCH CLEANING
--------------------------------------------------------- */

function clean(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/[\s\-\/\\().]/g, "");

}


/* ---------------------------------------------------------
   DATE
--------------------------------------------------------- */

function dateValue(value) {

  if (!value) {
    return 0;
  }


  let d =
    new Date(value);


  if (!isNaN(d.getTime())) {
    return d.getTime();
  }


  const m =
    String(value).match(
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


/* ---------------------------------------------------------
   ORDINAL
--------------------------------------------------------- */

function ordinal(n) {

  if (n === 1) return "First";
  if (n === 2) return "Second";
  if (n === 3) return "Third";
  if (n === 4) return "Fourth";
  if (n === 5) return "Fifth";

  return n + "th";

}


/* ---------------------------------------------------------
   CSV PARSER
--------------------------------------------------------- */

function parseCSV(text) {

  const rows = [];

  let row = [];

  let cell = "";

  let quotes = false;


  for (let i = 0; i < text.length; i++) {

    const c = text[i];

    const next =
      text[i + 1];


    if (c === '"') {

      if (quotes && next === '"') {

        cell += '"';

        i++;

      } else {

        quotes = !quotes;

      }

    }

    else if (
      c === "," &&
      !quotes
    ) {

      row.push(cell);

      cell = "";

    }

    else if (
      (c === "\n" || c === "\r") &&
      !quotes
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
    row.length
  ) {

    row.push(cell);

    rows.push(row);

  }


  return rows;

}


/* ---------------------------------------------------------
   ESCAPE
--------------------------------------------------------- */

function esc(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}