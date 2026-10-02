const SHEET_ID = "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";
const SHEET_GID = "1464518527";

let ALL_RECORDS = [];
let LOADED = false;

/* =====================================================
   COLUMN POSITIONS
   A=0, B=1 ... G=6 ... U=20 ... X=23
===================================================== */

const C = {
  DATE_DAMAGE: 6,       // G
  PLACE_DAMAGE: 7,      // H
  DID_NO: 8,             // I
  CAPACITY: 9,           // J
  COMPLAINT_NO: 10,      // K
  COMPLAINT_DATE: 11,    // L
  PR_NO: 12,             // M
  PR_DATE: 13,           // N
  JE_NAME: 14,           // O
  JE_MOBILE: 15,         // P
  ISSUED_TO_FIRM: 16,    // Q
  ISSUE_DATE: 17,        // R
  DRIVER_NAME: 18,       // S
  DRIVER_MOBILE: 19,     // T
  REPLACEMENT_DATE: 20,  // U
  TIME: 21,              // V
  TX_RETURN_DATE: 22,    // W
  OBSERVATION: 23        // X
};


/* =====================================================
   PAGE START
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

  const input = document.getElementById("searchInput");
  const button = document.getElementById("searchBtn");
  const status = document.getElementById("searchStatus");

  if (input) input.disabled = true;
  if (button) button.disabled = true;

  if (status) {
    status.textContent = "Loading all transformer records...";
  }

  loadGoogleSheet();

  if (button) {
    button.addEventListener("click", searchNow);
  }

  if (input) {

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        searchNow();
      }
    });

    input.addEventListener("input", function () {

      if (!LOADED) return;

      const value = input.value.trim();

      if (!value) {
        clearResults();
        return;
      }

      searchNow();
    });
  }
});


/* =====================================================
   LOAD ENTIRE PR SEARCH ONCE
===================================================== */

function loadGoogleSheet() {

  const callbackName =
    "transformerCallback_" +
    Date.now();

  const script = document.createElement("script");

  /*
     IMPORTANT:
     headers=3 means first THREE rows are treated as
     header rows by Google Visualization.

     Your actual header is Row 3.
  */

  const url =
    "https://docs.google.com/spreadsheets/d/" +
    SHEET_ID +
    "/gviz/tq" +
    "?gid=" + SHEET_GID +
    "&headers=2" +
    "&tqx=out:json;responseHandler:" +
    callbackName +
    "&tq=" +
    encodeURIComponent("select *");

  window[callbackName] = function (response) {

    try {

      if (!response ||
          !response.table) {

        throw new Error(
          "Google returned no table data."
        );
      }

      const table = response.table;

      const cols = table.cols || [];
      const rows = table.rows || [];

      ALL_RECORDS = rows.map(function (row) {

        const cells = row.c || [];

        const values = [];

        for (
          let i = 0;
          i < cols.length;
          i++
        ) {

          const cell = cells[i];

          if (!cell) {
            values.push("");
          } else if (
            cell.f !== undefined &&
            cell.f !== null
          ) {
            values.push(String(cell.f));
          } else if (
            cell.v !== undefined &&
            cell.v !== null
          ) {
            values.push(String(cell.v));
          } else {
            values.push("");
          }
        }

        return {
          values: values,
          searchText: normalize(
            values.join(" ")
          )
        };
      });

      /*
         Remove completely empty rows
      */

      ALL_RECORDS =
        ALL_RECORDS.filter(function (r) {

          return r.values.some(function (v) {
            return String(v).trim() !== "";
          });

        });

      LOADED = true;

      const input =
        document.getElementById("searchInput");

      const button =
        document.getElementById("searchBtn");

      const status =
        document.getElementById("searchStatus");

      if (input) input.disabled = false;
      if (button) button.disabled = false;

      if (status) {

        status.textContent =
          ALL_RECORDS.length.toLocaleString() +
          " records loaded — Ready to Search";
      }

      console.log(
        "Transformer records loaded:",
        ALL_RECORDS.length
      );

      console.log(
        "First record:",
        ALL_RECORDS[0]
      );

      /*
         Remove callback
      */

      delete window[callbackName];

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

    } catch (error) {

      console.error(error);

      showLoadError(
        "Data received but could not be processed."
      );
    }
  };


  script.onerror = function () {

    console.error(
      "Google Sheet loading failed."
    );

    showLoadError(
      "Google Sheet could not be loaded. Check that the sheet is public."
    );

    delete window[callbackName];

    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }
  };


  document.body.appendChild(script);


  /*
     Safety timeout
  */

  setTimeout(function () {

    if (!LOADED) {

      showLoadError(
        "Loading timed out. Please refresh the page."
      );

    }

  }, 30000);
}


/* =====================================================
   SEARCH
===================================================== */

function searchNow() {

  if (!LOADED) return;

  const input =
    document.getElementById("searchInput");

  const status =
    document.getElementById("searchStatus");

  const results =
    document.getElementById("results");

  if (!input || !results) return;

  const query =
    normalize(input.value);

  if (!query) {

    clearResults();

    if (status) {

      status.textContent =
        ALL_RECORDS.length.toLocaleString() +
        " records loaded — Ready to Search";
    }

    return;
  }


  /*
     SEARCH ALL COLUMNS
  */

  const found =
    ALL_RECORDS.filter(function (record) {

      return record.searchText.includes(query);

    });


  if (status) {

    status.textContent =
      found.length.toLocaleString() +
      " record(s) found";
  }


  if (found.length === 0) {

    results.innerHTML = `
      <div class="no-results">
        No record found
      </div>
    `;

    return;
  }


  /*
     Maximum 100 displayed results
  */

  results.innerHTML =
    found
      .slice(0, 100)
      .map(function (record, index) {

        return createCard(
          record,
          index + 1
        );

      })
      .join("");
}


/* =====================================================
   CREATE CARD
===================================================== */

function createCard(record, number) {

  const v = record.values;

  const damageDate =
    value(v, C.DATE_DAMAGE);

  const place =
    value(v, C.PLACE_DAMAGE);

  const didNo =
    value(v, C.DID_NO);

  const capacity =
    value(v, C.CAPACITY);

  const complaintNo =
    value(v, C.COMPLAINT_NO);

  const complaintDate =
    value(v, C.COMPLAINT_DATE);

  const prNo =
    value(v, C.PR_NO);

  const prDate =
    value(v, C.PR_DATE);

  const jeName =
    value(v, C.JE_NAME);

  const jeMobile =
    value(v, C.JE_MOBILE);

  const firm =
    value(v, C.ISSUED_TO