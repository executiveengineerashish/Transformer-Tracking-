const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";

let ALL_RECORDS = [];
let DAMAGE_HISTORY = {};
let searchTimer = null;
let compactMode = false;
let currentFilters = {};


/* =====================================================
   COLUMN POSITIONS — PR SEARCH
===================================================== */

const COL = {
  SN: 0,
  WORKSHOP: 1,
  DIVISION: 2,
  SUBDIVISION: 3,
  SUBSTATION: 4,
  FEEDER: 5,

  DATE_DAMAGE: 6,
  PLACE_DAMAGE: 7,
  DID_NO: 8,
  CAPACITY: 9,

  COMPLAINT_NO: 10,
  COMPLAINT_DATE: 11,

  PR_NO: 12,
  PR_DATE: 13,

  JE_NAME: 14,
  JE_MOBILE: 15,

  ISSUED_TO_FIRM: 16,
  ISSUE_DATE: 17,

  DRIVER_NAME: 18,
  DRIVER_MOBILE: 19,

  REPLACEMENT_DATE: 20,
  TIME: 21,

  TX_RETURN_DATE: 22,
  OBSERVATION: 23
};


/* =====================================================
   HELPER
===================================================== */

function $(id) {
  return document.getElementById(id);
}


function clean(value) {
  return String(value ?? "").trim();
}


function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s\-\/\).,\[{}:;_]+/g, "")
    .trim();
}


/* =====================================================
   LOCATION NORMALIZATION

   SISREDI
   SISREDI 1
   1 SISREDI
   SISREDI (1)
   (1) SISREDI
   SISREDI [25]

   ALL BECOME SAME LOCATION
===================================================== */

function normalizeLocation(value) {

  let text =
    String(value ?? "").toLowerCase();

  text =
    text.replace(/[0-9]+/g, " ");

  text =
    text.replace(
      /[\{\}]/g,
      " "
    );

  text =
    text.replace(
      /[-_/\\.,:;]+/g,
      " "
    );

  text =
    text.replace(
      /\s+/g,
      " "
    )
    .trim();

  return normalize(text);
}


/* =====================================================
   CAPACITY NORMALIZATION

   25
   25 KVA
   25 kVA

   ALL BECOME 25
===================================================== */

function normalizeCapacity(value) {

  return String(value ?? "")
    .toLowerCase()
    .replace(/kva/g, "")
    .replace(/[^0-9.]/g, "")
    .trim();

}


/* =====================================================
   DATE PARSER
===================================================== */

function parseDate(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }


  const text =
    String(value).trim();


  /* Google Date(...) */

  let match =
    text.match(
      /Date\(\s*(\d{4})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})/
    );


  if (match) {

    return new Date(
      Number(match[1]),
      Number(match[2]),
      Number(match[3])
    );

  }


  /* YYYY-MM-DD */

  match =
    text.match(
      /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/
    );


  if (match) {

    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );

  }


  /* DD.MM.YYYY / DD-MM-YYYY / DD/MM/YYYY */

  match =
    text.match(
      /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/
    );


  if (match) {

    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1])
    );

  }


  const date =
    new Date(text);


  if (!isNaN(date.getTime())) {
    return date;
  }


  return null;
}


/* =====================================================
   CURRENT MONTH
   IMPORTANT:
   DASHBOARD IS BASED ON PR DATE — COLUMN N
===================================================== */

function isCurrentMonth(value) {

  const date =
    parseDate(value);

  if (!date) {
    return false;
  }


  const now =
    new Date();


  return (
    date.getFullYear() ===
      now.getFullYear() &&

    date.getMonth() ===
      now.getMonth()
  );
}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =====================================================
   STATUS MESSAGE
===================================================== */

function setStatus(
  message,
  error = false
) {

  const element =
    $("searchStatus");


  if (!element) {
    return;
  }


  element.textContent =
    message;


  element.className =
    "search-status " +
    (
      error
        ? "error"
        : "ready"
    );

}


/* =====================================================
   LOAD GOOGLE SHEET
   ONE TIME ONLY
===================================================== */

function loadSheet() {

  setStatus(
    "Loading transformer records...",
    false
  );


  const callbackName =
    "transformerCallback902";


  try {
    delete window[callbackName];
  } catch (e) {}


  window[callbackName] =
    function(response) {

      try {

        if (
          !response ||
          !response.table ||
          !response.table.rows
        ) {

          throw new Error(
            "Invalid Google Sheet response"
          );

        }


        processSheetData(
          response
        );


      } catch (error) {

        console.error(
          "Sheet error:",
          error
        );


        setStatus(
          "Error reading PR SEARCH data",
          true
        );

      }


      try {
        delete window[callbackName];
      } catch (e) {}

    };


  const url =
    "https://docs.google.com/spreadsheets/d/" +
    SHEET_ID +
    "/gviz/tq" +

    "?gid=" +
    SHEET_GID +

    "&range=A3:X" +

    "&headers=1" +

    "&tqx=out%3Ajson%3BresponseHandler%3A" +
    callbackName +

    "&_=" +
    Date.now();


  const script =
    document.createElement("script");


  script.id =
    "googleSheetScript902";

  script.src =
    url;

  script.async = true;


  script.onerror =
    function() {

      setStatus(
        "Google Sheet connection failed. Refresh page.",
        true
      );

    };


  document.head.appendChild(
    script
  );


  setTimeout(
    function() {

      if (
        ALL_RECORDS.length === 0
      ) {

        setStatus(
          "Google Sheet loading timeout. Refresh page.",
          true
        );

      }

    },
    25000
  );

}


/* =====================================================
   PROCESS GOOGLE SHEET DATA
===================================================== */

function processSheetData(
  response
) {

  ALL_RECORDS = [];


  const rows =
    response.table.rows || [];


  rows.forEach(
    function(row, index) {

      /*
        Row 3 = Header
        Row 4 onward = Data
      */

      if (index === 0) {
        return;
      }


      const record = [];
      const raw = [];


      for (
        let i = 0;
        i < 24;
        i++
      ) {

        const cell =
          row.c &&
          row.c[i];


        if (!cell) {

          record.push("");
          raw.push("");

          continue;

        }


        /* Display value */

        if (
          cell.f !== undefined &&
          cell.f !== null
        ) {

          record.push(
            String(cell.f)
          );

        } else if (
          cell.v !== undefined &&
          cell.v !== null
        ) {

          record.push(
            String(cell.v)
          );

        } else {

          record.push("");

        }


        /* Raw value */

        if (
          cell.v !== undefined &&
          cell.v !== null
        ) {

          raw.push(
            String(cell.v)
          );

        } else {

          raw.push("");

        }

      }


      if (
        record.every(
          function(value) {

            return clean(value) === "";

          }
        )
      ) {

        return;

      }


      record.__raw =
        raw;


      record.__sheetRow =
        index + 4;


      record.__search =
        normalize(
          record.join(" ")
        );


      ALL_RECORDS.push(
        record
      );

    }
  );


  /*
    Build everything from the
    same in-memory dataset.
  */

  buildDamageHistory();

  buildDashboard();

  populateFilters();


  setStatus(
    ALL_RECORDS.length.toLocaleString("en-IN") +
      " transformer records loaded • Search ready",
    false
  );

}


/* =====================================================
   REPEATED DAMAGE

   STRICTLY:
   SAME NORMALIZED LOCATION
   +
   SAME CAPACITY

   Different capacity = NOT repeated
===================================================== */

function buildDamageHistory() {

  DAMAGE_HISTORY = {};


  ALL_RECORDS.forEach(
    function(record) {

      const location =
        normalizeLocation(
          record[
            COL.PLACE_DAMAGE
          ]
        );


      const capacity =
        normalizeCapacity(
          record[
            COL.CAPACITY
          ]
        );


      if (
        !location ||
        !capacity
      ) {

        return;

      }


      const key =
        location +
        "||" +
        capacity;


      if (
        !DAMAGE_HISTORY[key]
      ) {

        DAMAGE_HISTORY[key] =
          [];

      }


      DAMAGE_HISTORY[key].push(
        record
      );

    }
  );


  Object.keys(
    DAMAGE_HISTORY
  ).forEach(
    function(key) {

      DAMAGE_HISTORY[key].sort(
        function(a, b) {

          const dateA =
            parseDate(
              a[
                COL.PR_DATE
              ]
            ) ||
            parseDate(
              a[
                COL.DATE_DAMAGE
              ]
            ) ||
            new Date(0);


          const dateB =
            parseDate(
              b[
                COL.PR_DATE
              ]
            ) ||
            parseDate(
              b[
                COL.DATE_DAMAGE
              ]
            ) ||
            new Date(0);


          return dateA - dateB;

        }
      );

    }
  );

}


/* =====================================================
   STATUS LOGIC

   Issue blank
      = Pending to Issue

   Issue filled +
   Replacement blank
      = Replacement Pending

   Replacement filled +
   Return blank
      = TX Return Pending

   All filled
      = Completed
===================================================== */

function getStatus(
  record
) {

  const issueDate =
    clean(
      record[
        COL.ISSUE_DATE
      ]
    );


  const replacementDate =
    clean(
      record[
        COL.REPLACEMENT_DATE
      ]
    );


  const returnDate =
    clean(
      record[
        COL.TX_RETURN_DATE
      ]
    );


  if (!issueDate) {