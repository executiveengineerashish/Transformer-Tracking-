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
   SHORTCUT
===================================================== */

function $(id) {
  return document.getElementById(id);
}


/* =====================================================
   CLEAN / NORMALIZE
===================================================== */

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

   ALL = SISREDI
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
   25 kVA
   25 KVA

   ALL = 25
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


  /* Google Date */

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


  /* DD.MM.YYYY */

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
   DASHBOARD USES PR DATE — COLUMN N
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
   LOAD GOOGLE SHEET

   ONE TIME LOAD
===================================================== */

function loadSheet() {

  setStatus(
    "Loading transformer records...",
    false
  );


  const callbackName =
    "transformerCallback901";


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


        processSheetData(response);


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


  console.log(
    "Loading PR SEARCH..."
  );


  const script =
    document.create