const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/" +
  SHEET_ID +
  "/export?format=csv&gid=" +
  SHEET_GID;


/* =========================================================
   GLOBAL DATA
========================================================= */

let ALL_RECORDS = [];
let DAMAGE_HISTORY = {};
let DATA_READY = false;
let SEARCH_TIMER = null;


/* =========================================================
   START APP
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  const input =
    document.getElementById("searchInput");

  const button =
    document.getElementById("searchBtn");

  const status =
    document.getElementById("searchStatus");

  const results =
    document.getElementById("results");


  /*
    Disable search until ALL data is loaded.
  */

  input.disabled = true;
  button.disabled = true;

  input.placeholder =
    "Loading PR SEARCH data...";


  status.textContent =
    "⏳ Loading all PR SEARCH data...";


  results.innerHTML =
    '<div class="loading">' +
    '⏳ Loading all transformer records...<br>' +
    '<small>Please wait. Search will be instant after loading.</small>' +
    '</div>';


  /*
    FIRST LOAD ALL DATA
  */

  loadAllData()

    .then(function () {

      DATA_READY = true;

      input.disabled = false;
      button.disabled = false;

      input.placeholder =
        "Enter PR / Complaint Number";


      status.textContent =
        "✓ Ready — " +
        ALL_RECORDS.length +
        " records loaded. Search now.";


      results.innerHTML = "";


      /*
        Automatically put cursor in search box
      */

      input.focus();

    })

    .catch(function (error) {

      console.error(error);


      status.textContent =
        "❌ Data loading failed";


      results.innerHTML =
        '<div class="no-result">' +

        '<b>Unable to load PR SEARCH data.</b>' +

        '<br><br>' +

        escapeHTML(
          error.message
        ) +

        '<br><br>' +

        'Please check that the Google Sheet is public/viewable.' +

        '</div>';

    });


  /*
    SEARCH BUTTON
  */

  button.addEventListener("click", function () {

    if (!DATA_READY) {
      return;
    }

    searchRecords(
      input.value
    );

  });


  /*
    AUTOMATIC SEARCH WHILE TYPING
  */

  input.addEventListener("input", function () {

    if (!DATA_READY) {
      return;
    }


    clearTimeout(SEARCH_TIMER);


    const value =
      input.value.trim();


    if (!value) {

      status.textContent =
        "✓ Ready — " +
        ALL_RECORDS.length +
        " records loaded. Search now.";

      results.innerHTML = "";

      return;

    }


    /*
      Very short delay only.
      Data is already in memory.
    */

    SEARCH_TIMER =
      setTimeout(function () {

        searchRecords(value);

      }, 180);

  });

});


/* =========================================================
   LOAD COMPLETE SHEET ONCE
========================================================= */

function loadAllData() {

  return fetch(
    SHEET_URL +
    "&_=" +
    Date.now(),
    {
      cache: "no-store"
    }
  )

  .then(function (response) {

    if (!response.ok) {

      throw new Error(
        "Google Sheet returned HTTP " +
        response.status
      );

    }

    return response.text();

  })

  .then(function (csvText) {

    const rows =
      parseCSV(csvText);


    if (!rows || rows.length < 2) {

      throw new Error(
        "No records found in PR SEARCH."
      );

    }


    /*
      FIRST ROW = HEADERS
    */

    const headers =
      rows[0].map(function (header, index) {

        let h =
          String(header || "")
            .replace(/^\uFEFF/, "")
            .trim();


        if (!h) {
          h =
            "Column " +
            (index + 1);
        }


        return h;

      });


    ALL_RECORDS = [];


    /*
      CONVERT EVERY ROW TO OBJECT
    */

    for (
      let r = 1;
      r < rows.length;
      r++
    ) {

      const row =
        rows[r];


      if (!row) {
        continue;
      }


      /*
        Ignore completely empty rows.
      */

      const hasData =
        row.some(function (cell) {

          return String(
            cell || ""
          ).trim() !== "";

        });


      if (!hasData) {
        continue;
      }


      const record = {};


      for (
        let c = 0;
        c < headers.length;
        c++
      ) {

        record[
          headers[c]
        ] =
          String(
            row[c] || ""
          ).trim();

      }


      /*
        SEARCH INDEX
        All columns joined together.
      */

      record.__search =
        normalize(
          row.join(" ")
        );


      ALL_RECORDS.push(record);

    }


    /*
      BUILD REPEATED DAMAGE HISTORY
      ONCE.
    */

    buildDamageHistory();


    return ALL_RECORDS;

  });

}


/* =========================================================
   BUILD DAMAGE HISTORY
========================================================= */

function buildDamageHistory() {

  DAMAGE_HISTORY = {};


  ALL_RECORDS.forEach(function (record) {

    const place =
      getField(
        record,
        [
          "PLACE OF DAMAGE",
          "PLACE OF DAMAGE ",
          "PLACE",
          "LOCATION"
        ]
      );


    if (!place) {
      return;
    }


    const key =
      normalize(place);


    if (!DAMAGE_HISTORY[key]) {

      DAMAGE_HISTORY[key] = [];

    }


    DAMAGE_HISTORY[key].push({

      prNo:
        getField(
          record,
          [
            "PR NO",
            "PR NO.",
            "PR NUMBER"
          ]
        ),

      prDate:
        getField(
          record,
          [
            "PR DATE"
          ]
        ),

      damageDate:
        getField(
          record,
          [
            "DATE OF DAMAGE"
          ]
        )

    });

  });


  /*
    Sort each place history
    oldest → newest
  */

  Object.keys(
    DAMAGE_HISTORY
  ).forEach(function (key) {

    DAMAGE_HISTORY[key].sort(
      function (a, b) {

        return dateValue(
          a.damageDate
        ) -
        dateValue(
          b.damageDate
        );

      }
    );

  });

}


/* =========================================================
   SEARCH
   ========================================================= */

function searchRecords(searchText) {

  const status =
    document.getElementById(
      "searchStatus"
    );

  const results =
    document.getElementById(
      "results"
    );


  const query =
    normalize(searchText);


  if (!query) {
    results.innerHTML = "";
    return;
  }


  /*
    IMPORTANT:
    NO GOOGLE REQUEST HERE.

    Search happens completely
    inside already-loaded memory.
  */

  const matches =
    ALL_RECORDS.filter(
      function (record) {

        return record.__search
          .includes(query);

      }
    );


  status.textContent =
    matches.length +
    " record(s) found";


  if (!matches.length) {

    results.innerHTML =
      '<div class="no-result">' +

      'No matching PR / Complaint Number found.' +

      '</div>';

    return;

  }


  let html = "";


  matches.forEach(
    function (record, index) {

      html +=
        createCard(
          record,
          index + 1
        );

    }
  );


  results.innerHTML =
    html;

}


/* =========================================================
   CREATE CARD
========================================================= */

function createCard(
  record,
  number
) {

  const f =
    getFields(record);


  /* -------------------------------------------------------
     STATUS
  ------------------------------------------------------- */

  let statusHTML = "";


  if (f.replacementDate) {

    statusHTML =

      '<div class="status status-installed">' +

      '🎉 Congratulations Your Transformer installed' +

      '<br>' +

      '<span style="font-weight:normal">' +

      'Replacement Date: ' +

      escapeHTML(
        f.replacementDate
      ) +

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

      escapeHTML(
        f.issueDate
      );


    if (f.driver) {

      statusHTML +=
        '<br>Driver: ' +
        escapeHTML(
          f.driver
        );

    }


    if (f.driverMobile) {

      statusHTML +=
        '<br>Mobile: ' +
        escapeHTML(
          f.driverMobile
        );

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


  /* -------------------------------------------------------
     REPEATED DAMAGE
  ------------------------------------------------------- */

  const placeKey =
    normalize(f.place);


  const history =
    DAMAGE_HISTORY[
      placeKey
    ] || [];


  let repeatHTML = "";


  if (
    placeKey &&
    history.length > 1
  ) {

    let historyHTML = "";


    history.forEach(
      function (item, index) {

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

      }
    );


    repeatHTML =

      '<div class="repeat-box">' +

      '<div class="repeat-title">' +

      '⚠️ Repeated Damage' +

      '</div>' +

      '<div class="repeat-message">' +

      'It Damaged ' +

      history.length +

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


  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  let dataHTML = "";


  addRow(
    "PR Number",
    f.prNo
  );

  addRow(
    "PR Date",
    f.prDate
  );

  addRow(
    "Complaint Number",
    f.complaintNo
  );

  addRow(
    "Complaint Date",
    f.complaintDate
  );

  addRow(
    "Date of Damage",
    f.damageDate
  );

  addRow(
    "Place of Damage",
    f.place
  );

  addRow(
    "DID No",
    f.didNo
  );

  addRow(
    "Capacity",
    f.capacity
  );

  addRow(
    "JE Name",
    f.jeName
  );

  addRow(
    "JE Mobile",
    f.jeMobile
  );

  addRow(
    "Issued To Firm",
    f.firm
  );

  addRow(
    "Issue Date",
    f.issueDate
  );

  addRow(
    "Driver Name",
    f.driver
  );

  addRow(
    "Driver Mobile",
    f.driverMobile
  );

  addRow(
    "Replacement Date",
    f.replacementDate
  );

  addRow(
    "Time",
    f.time
  );

  addRow(
    "TX Return Date",
    f.returnDate
  );

  addRow(
    "Observation DTC",
    f.observation
  );


  function addRow(
    label,
    value
  ) {

    if (!value) {
      return;
    }


    dataHTML +=

      '<div class="data-row">' +

      '<div class="data-label">' +

      escapeHTML(label) +

      '</div>' +

      '<div class="data-value">' +

      escapeHTML(value) +

      '</div>' +

      '</div>';

  }


  /*
    IMPORTANT:
    Return directly.
    No undefined.
  */

  return (

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

    '</div>'

  );

}


/* =========================================================
   GET FIELDS
========================================================= */

function getFields(record) {

  return {

    damageDate:
      getField(
        record,
        [
          "DATE OF DAMAGE"
        ]
      ),

    place:
      getField(
        record,
        [
          "PLACE OF DAMAGE",
          "PLACE",
          "LOCATION"
        ]
      ),

    didNo:
      getField(
        record,
        [
          "DID NO",
          "DID NO."
        ]
      ),

    capacity:
      getField(
        record,
        [
          "CAPACITY",
          "CAPACITY IN KVA",
          "KVA"
        ]
      ),

    complaintNo:
      getField(
        record,
        [
          "COMPLAIN NUMBER",
          "COMPLAINT NUMBER",
          "COMPLAINT NO"
        ]
      ),

    complaintDate:
      getField(
        record,
        [
          "COMPLAIN DATE",
          "COMPLAINT DATE"
        ]
      ),

    prNo:
      getField(
        record,
        [
          "PR NO",
          "PR NO.",
          "PR NUMBER"
        ]
      ),

    prDate:
      getField(
        record,
        [
          "PR DATE"
        ]
      ),

    jeName:
      getField(
        record,
        [
          "JE NAME",
          "JE Name",
          "JE"
        ]
      ),

    jeMobile:
      getField(
        record,
        [
          "JE MOBILE",
          "JE Mobile"
        ]
      ),

    firm:
      getField(
        record,
        [
          "ISSUED TO FIRM",
          "FIRM",
          "FIRM NAME"
        ]
      ),

    issueDate:
      getField(
        record,
        [
          "ISSUE DATE",
          "ISSUED DATE"
        ]
      ),

    driver:
      getField(
        record,
        [
          "DRIVER NAME",
          "DRIVER"
        ]
      ),

    driverMobile:
      getField(
        record,
        [
          "DRIVER MOBILE",
          "DRIVER MOBILE NO"
        ]
      ),

    replacementDate:
      getField(
        record,
        [
          "REPLACEMENT DATE"
        ]
      ),

    time:
      getField(
        record,
        [
          "TIME"
        ]
      ),

    returnDate:
      getField(
        record,
        [
          "TX RETURN DATE",
          "RETURN DATE",
          "TX Return Date"
        ]
      ),

    observation:
      getField(
        record,
        [
          "OBSERVATION DTC",
          "OBSERVATION"
        ]
      )

  };

}


/* =========================================================
   FIELD FINDER
========================================================= */

function getField(
  record,
  aliases
) {

  const keys =
    Object.keys(record);


  for (
    let a = 0;
    a < aliases.length;
    a++
  ) {

    const wanted =
      normalizeHeader(
        aliases[a]
      );


    for (
      let k = 0;
      k < keys.length;
      k++
    ) {

      if (
        keys[k] === "__search"
      ) {
        continue;
      }


      if (
        normalizeHeader(
          keys[k]
        ) === wanted
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
   NORMALIZE SEARCH
========================================================= */

function normalize(value) {

  return String(
    value || ""
  )
  .toLowerCase()
  .replace(
    /[\s\-\/\\().,]/g,
    ""
  );

}


/* =========================================================
   NORMALIZE HEADER
========================================================= */

function normalizeHeader(value) {

  return String(
    value || ""
  )
  .toLowerCase()
  .replace(
    /[^a-z0-9]/g,
    ""
  );

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


  const match =
    text.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    );


  if (match) {

    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1])
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

    const char =
      text[i];

    const next =
      text[i + 1];


    if (char === '"') {

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
      char === "," &&
      !inQuotes
    ) {

      row.push(cell);

      cell = "";

    }

    else if (
      (char === "\n" ||
       char === "\r") &&
      !inQuotes
    ) {

      if (
        char === "\r" &&
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

      cell += char;

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
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

  return String(
    value || ""
  )
  .replace(
    /&/g,
    "&amp;"
  )
  .replace(
    /</g,
    "&lt;"
  )
  .replace(
    />/g,
    "&gt;"
  )
  .replace(
    /"/g,
    "&quot;"
  )
  .replace(
    /'/g,
    "&#039;"
  );

}