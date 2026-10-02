/* =========================================================
   TRANSFORMER TRACKING
   PR SEARCH
   LOAD ONCE
   FAST LOCAL AUTO SEARCH
========================================================= */


/* =========================================================
   GOOGLE SHEET
========================================================= */

const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";


const SHEET_GID =
  "1464518527";


/* =========================================================
   COLUMN MAP
   A = 0
   X = 23

   PR SEARCH
   Row 3 = Header
   Row 4 onwards = Data
========================================================= */

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


/* =========================================================
   GLOBAL DATA
========================================================= */

let ALL_RECORDS = [];

let DAMAGE_HISTORY =
  new Map();

let DATA_READY = false;

let LOAD_STARTED = false;

let searchTimer = null;

let lastSearch = "";


/* =========================================================
   DOM
========================================================= */

const searchInput =
  document.getElementById(
    "searchInput"
  );


const searchBtn =
  document.getElementById(
    "searchBtn"
  );


const searchStatus =
  document.getElementById(
    "searchStatus"
  );


const results =
  document.getElementById(
    "results"
  );


/* =========================================================
   NORMALIZE
========================================================= */

function normalize(value) {

  return String(
    value ?? ""
  )
    .toLowerCase()
    .trim()

    /*
       Remove spaces, hyphens,
       brackets, slash etc.

       Example:

       81017 2249
       81017-2249
       810172249

       All become same search key.
    */

    .replace(
      /[\s\-_/\\().,+]/g,
      ""
    );
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function esc(value) {

  return String(
    value ?? ""
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


/* =========================================================
   GET VALUE
========================================================= */

function getValue(
  row,
  col
) {

  return (
    row &&
    row[col] != null
  )
    ? row[col]
    : "";
}


/* =========================================================
   ORDINAL
========================================================= */

function ordinal(n) {

  if (
    n % 100 >= 11 &&
    n % 100 <= 13
  ) {

    return n + "th";
  }


  if (
    n % 10 === 1
  ) {

    return n + "st";
  }


  if (
    n % 10 === 2
  ) {

    return n + "nd";
  }


  if (
    n % 10 === 3
  ) {

    return n + "rd";
  }


  return n + "th";
}


/* =========================================================
   DATE SCORE
========================================================= */

function dateScore(value) {

  const s =
    String(
      value ?? ""
    ).trim();


  if (!s) {

    return Number.MAX_SAFE_INTEGER;
  }


  let m =
    s.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    );


  if (m) {

    return new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1])
    ).getTime();
  }


  m =
    s.match(
      /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/
    );


  if (m) {

    return new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3])
    ).getTime();
  }


  const d =
    new Date(s);


  return Number.isNaN(
    d.getTime()
  )
    ? Number.MAX_SAFE_INTEGER
    : d.getTime();
}


/* =========================================================
   LOAD GOOGLE CHARTS
========================================================= */

function loadGoogleCharts() {

  if (
    LOAD_STARTED
  ) {

    return;
  }


  LOAD_STARTED = true;


  searchStatus.textContent =
    "Connecting to PR SEARCH...";


  searchStatus.className =
    "search-status loading";


  /*
     Google Charts already available?
  */

  if (
    window.google &&
    google.charts
  ) {

    startSheetQuery();

    return;
  }


  const script =
    document.createElement(
      "script"
    );


  script.src =
    "https://www.gstatic.com/charts/loader.js";


  script.async = true;


  script.onload =
    function() {

      try {

        google.charts.load(
          "current",
          {
            packages: [
              "corechart"
            ]
          }
        );


        google.charts.setOnLoadCallback(
          startSheetQuery
        );


      } catch (error) {

        console.error(error);


        showLoadError(
          "Google service could not start."
        );

      }

    };


  script.onerror =
    function() {

      showLoadError(
        "Google service connection failed."
      );

    };


  document.head.appendChild(
    script
  );
}


/* =========================================================
   QUERY GOOGLE SHEET
========================================================= */

function startSheetQuery() {

  searchStatus.textContent =
    "Loading all transformer records...";


  searchStatus.className =
    "search-status loading";


  /*
     Only PR SEARCH GID.

     A3:X

     Row 3 is header.
  */

  const sheetUrl =

    "https://docs.google.com/spreadsheets/d/" +

    SHEET_ID +

    "/gviz/tq" +

    "?gid=" +

    SHEET_GID +

    "&range=A3:X";


  console.log(
    "PR SEARCH URL:",
    sheetUrl
  );


  const query =
    new google.visualization.Query(
      sheetUrl
    );


  query.setQuery(
    "select *"
  );


  query.send(
    function(response) {

      if (
        response.isError()
      ) {

        console.error(
          response.getMessage(),
          response.getDetailedMessage()
        );


        showLoadError(
          "PR SEARCH data could not be loaded."
        );


        return;
      }


      try {

        processDataTable(
          response.getDataTable()
        );


      } catch (error) {

        console.error(
          error
        );


        showLoadError(
          "Data processing error."
        );

      }

    }
  );
}


/* =========================================================
   PROCESS DATA
========================================================= */

function processDataTable(
  dataTable
) {

  ALL_RECORDS = [];


  const rowCount =
    dataTable.getNumberOfRows();


  const columnCount =
    dataTable.getNumberOfColumns();


  console.log(
    "PR SEARCH rows:",
    rowCount
  );


  console.log(
    "PR SEARCH columns:",
    columnCount
  );


  /*
     Convert Google DataTable
     to normal JS arrays.
  */

  for (
    let r = 0;
    r < rowCount;
    r++
  ) {

    const record =
      new Array(24)
        .fill("");


    for (
      let c = 0;
      c < 24;
      c++
    ) {

      if (
        c >= columnCount
      ) {

        continue;
      }


      let value = "";


      try {

        value =
          dataTable.getFormattedValue(
            r,
            c
          );


      } catch (error) {

        value =
          dataTable.getValue(
            r,
            c
          );

      }


      if (
        value == null
      ) {

        value = "";
      }


      record[c] =
        String(value);
    }


    /*
       Ignore blank rows.
    */

    const hasData =
      record.some(
        function(value) {

          return (
            String(value).trim()
            !== ""
          );

        }
      );


    if (
      !hasData
    ) {

      continue;
    }


    /*
       ONE search index.

       All A:X columns.
    */

    record.__search =
      normalize(
        record.join(" ")
      );


    /*
       Actual Google Sheet row.

       Header = row 3
       First data = row 4
    */

    record.__sheetRow =
      r + 4;


    ALL_RECORDS.push(
      record
    );
  }


  /*
     Build repeated-damage
     history only once.
  */

  buildDamageHistory();


  DATA_READY = true;


  searchStatus.textContent =
    ALL_RECORDS.length.toLocaleString() +

    " transformer records loaded • Search ready";


  searchStatus.className =
    "search-status ready";


  console.log(
    "DATA READY:",
    ALL_RECORDS.length
  );
}


/* =========================================================
   DAMAGE HISTORY
========================================================= */

function buildDamageHistory() {

  DAMAGE_HISTORY =
    new Map();


  for (
    const row of ALL_RECORDS
  ) {

    const place =
      normalize(
        getValue(
          row,
          COL.PLACE_DAMAGE
        )
      );


    /*
       Blank place should not
       become a repeated group.
    */

    if (
      !place
    ) {

      continue;
    }


    if (
      !DAMAGE_HISTORY.has(
        place
      )
    ) {

      DAMAGE_HISTORY.set(
        place,
        []
      );
    }


    DAMAGE_HISTORY
      .get(place)
      .push(row);
  }


  /*
     Sort each history
     oldest -> newest.
  */

  for (
    const history of
    DAMAGE_HISTORY.values()
  ) {

    history.sort(
      function(a, b) {

        const aDate =
          dateScore(
            getValue(
              a,
              COL.PR_DATE
            ) ||

            getValue(
              a,
              COL.DATE_DAMAGE
            )
          );


        const bDate =
          dateScore(
            getValue(
              b,
              COL.PR_DATE
            ) ||

            getValue(
              b,
              COL.DATE_DAMAGE
            )
          );


        if (
          aDate === bDate
        ) {

          return (
            (a.__sheetRow || 0) -
            (b.__sheetRow || 0)
          );
        }


        return (
          aDate -
          bDate
        );

      }
    );
  }
}


/* =========================================================
   FAST LOCAL SEARCH
========================================================= */

function performFastSearch(
  query
) {

  if (
    !DATA_READY
  ) {

    searchStatus.textContent =
      "Loading records...";


    searchStatus.className =
      "search-status loading";


    return;
  }


  const found = [];


  /*
     Search ONLY memory.

     No Google request.
  */

  for (
    let i = 0;
    i < ALL_RECORDS.length;
    i++
  ) {

    const record =
      ALL_RECORDS[i];


    if (
      record.__search.includes(
        query
      )
    ) {

      found.push(
        record
      );
    }
  }


  renderResults(
    found
  );
}


/* =========================================================
   RENDER RESULTS
========================================================= */

function renderResults(
  records
) {

  if (
    !records.length
  ) {

    results.innerHTML = `
      <div class="empty-box">

        No matching transformer
        record found.

      </div>
    `;


    searchStatus.textContent =
      "0 record(s) found";


    searchStatus.className =
      "search-status error";


    return;
  }


  searchStatus.textContent =
    records.length +
    " record(s) found";


  searchStatus.className =
    "search-status ready";


  let html = "";


  /*
     Render all matching records.

     No artificial search-result limit.
  */

  for (
    let i = 0;
    i < records.length;
    i++
  ) {

    html +=
      renderCard(
        records[i],
        i + 1
      );
  }


  results.innerHTML =
    html;
}


/* =========================================================
   FIELD
========================================================= */

function field(
  label,
  value
) {

  return `
    <div class="card-row">

      <div class="field-label">
        ${esc(label)}
      </div>

      <div class="field-value">
        ${esc(value || "-")}
      </div>

    </div>
  `;
}


/* =========================================================
   RESULT CARD
========================================================= */

function renderCard(
  row,
  number
) {


  /* =======================================================
     DATA
  ======================================================= */

  const workshop =
    getValue(
      row,
      COL.WORKSHOP
    );


  const division =
    getValue(
      row,
      COL.DIVISION
    );


  const subdivision =
    getValue(
      row,
      COL.SUBDIVISION
    );


  const substation =
    getValue(
      row,
      COL.SUBSTATION
    );


  const feeder =
    getValue(
      row,
      COL.FEEDER
    );


  const dateDamage =
    getValue(
      row,
      COL.DATE_DAMAGE
    );


  const place =
    getValue(
      row,
      COL.PLACE_DAMAGE
    );


  const didNo =
    getValue(
      row,
      COL.DID_NO
    );


  const capacity =
    getValue(
      row,
      COL.CAPACITY
    );


  const complaintNo =
    getValue(
      row,
      COL.COMPLAINT_NO
    );


  const complaintDate =
    getValue(
      row,
      COL.COMPLAINT_DATE
    );


  const prNo =
    getValue(
      row,
      COL.PR_NO
    );


  const prDate =
    getValue(
      row,
      COL.PR_DATE
    );


  const jeName =
    getValue(
      row,
      COL.JE_NAME
    );


  const jeMobile =
    getValue(
      row,
      COL.JE_MOBILE
    );


  const issuedFirm =
    getValue(
      row,
      COL.ISSUED_TO_FIRM
    );


  const issueDate =
    getValue(
      row,
      COL.ISSUE_DATE
    );


  const driverName =
    getValue(
      row,
      COL.DRIVER_NAME
    );


  const driverMobile =
    getValue(
      row,
      COL.DRIVER_MOBILE
    );


  const replacementDate =
    getValue(
      row,
      COL.REPLACEMENT_DATE
    );


  const time =
    getValue(
      row,
      COL.TIME
    );


  const returnDate =
    getValue(
      row,
      COL.TX_RETURN_DATE
    );


  const observation =
    getValue(
      row,
      COL.OBSERVATION
    );


  /* =======================================================
     STATUS
  ======================================================= */

  let statusHTML = "";


  /*
     INSTALLED
  */

  if (
    String(
      replacementDate
    ).trim() !== ""
  ) {

    statusHTML = `

      <div
        class="status-box installed"
      >

        🎉 Congratulations!
        Your Transformer installed.

        <br>

        Replacement Date:
        ${esc(replacementDate)}

      </div>

    `;

  }


  /*
     ISSUED
  */

  else if (
    String(
      issueDate
    ).trim() !== ""
  ) {


    let callButton = "";


    if (
      String(
        driverMobile
      ).trim() !== ""
    ) {


      /*
         Keep + if already present.
         Remove spaces, -, brackets.
      */

      const cleanMobile =
        String(
          driverMobile
        )
          .trim()
          .replace(
            /[\s\-().]/g,
            ""
          );


      callButton = `

        <a
          class="call-btn"
          href="tel:${esc(cleanMobile)}"
        >
          📞 CALL DRIVER
        </a>

      `;
    }


    statusHTML = `

      <div
        class="status-box issued"
      >

        🔧 Your Transformer Issued by Workshop.
        Please Contact Driver for Installation.

        <br><br>

        <b>Issue Date:</b>
        ${esc(issueDate)}

        <br>

        <b>Driver:</b>
        ${esc(driverName || "-")}

        <br>

        <b>Mobile:</b>
        ${esc(driverMobile || "-")}

        ${callButton}

      </div>

    `;

  }


  /*
     PENDING
  */

  else {

    statusHTML = `

      <div
        class="status-box pending"
      >

        ⏳ Transformer Replacement Pending

      </div>

    `;
  }


  /* =======================================================
     REPEATED DAMAGE
     NO LIMIT
  ======================================================= */

  const placeKey =
    normalize(
      place
    );


  const history =
    placeKey
      ? (
          DAMAGE_HISTORY.get(
            placeKey
          ) || []
        )
      : [];


  let repeatHTML = "";


  /*
     NOT REPEATED
  */

  if (
    history.length <= 1
  ) {

    repeatHTML = `

      <div
        class="repeat-box normal"
      >

        Not a repeated damage

      </div>

    `;

  }


  /*
     REPEATED
  */

  else {

    let historyHTML = "";


    /*
       ALL occurrences.

       2
       3
       4
       10
       20

       No limit.
    */

    for (
      let i = 0;
      i < history.length;
      i++
    ) {

      const h =
        history[i];


      const hPR =
        getValue(
          h,
          COL.PR_NO
        );


      const hDate =
        getValue(
          h,
          COL.PR_DATE
        ) ||

        getValue(
          h,
          COL.DATE_DAMAGE
        );


      historyHTML += `

        <div
          class="repeat-row"
        >

          <strong>
            ${ordinal(i + 1)} Time
          </strong>


          <span>

            PR No:
            ${esc(
              hPR || "-"
            )}

            <br>

            Date:
            ${esc(
              hDate || "-"
            )}

          </span>

        </div>

      `;
    }


    repeatHTML = `

      <div
        class="repeat-box repeated"
      >

        <div
          class="repeat-title"
        >

          It Damaged
          ${history.length}
          times

        </div>


        <div
          class="repeat-warning"
        >

          Please Ensure Increasing
          Capacity if Overloaded

        </div>


        <div
          class="repeat-history"
        >

          ${historyHTML}

        </div>

      </div>

    `;
  }


  /* =======================================================
     FINAL CARD

     ORDER:

     STATUS
     REPEATED DAMAGE
     OTHER DATA
  ======================================================= */

  return `

    <article
      class="result-card"
    >


      <div
        class="card-top"
      >

        <span
          class="card-number"
        >
          Record #${number}
        </span>


        <span
          class="card-number"
        >
          Row ${row.__sheetRow || "-"}
        </span>

      </div>


      <!-- STATUS -->

      ${statusHTML}


      <!-- REPEATED DAMAGE -->

      ${repeatHTML}


      <!-- DATA -->

      ${field(
        "Workshop",
        workshop
      )}


      ${field(
        "Division",
        division
      )}


      ${field(
        "Subdivision",
        subdivision
      )}


      ${field(
        "Substation",
        substation
      )}


      ${field(
        "Feeder",
        feeder
      )}


      ${field(
        "Date of Damage",
        dateDamage
      )}


      ${field(
        "Place of Damage",
        place
      )}


      ${field(
        "DID No",
        didNo
      )}


      ${field(
        "Capacity",
        capacity
      )}


      ${field(
        "Complaint Number",
        complaintNo
      )}


      ${field(
        "Complaint Date",
        complaintDate
      )}


      ${field(
        "PR No",
        prNo
      )}


      ${field(
        "PR Date",
        prDate
      )}


      ${field(
        "JE Name",
        jeName
      )}


      ${field(
        "JE Mobile",
        jeMobile
      )}


      ${field(
        "Issued to Firm",
        issuedFirm
      )}


      ${field(
        "Issue Date",
        issueDate
      )}


      ${field(
        "Driver Name",
        driverName
      )}


      ${field(
        "Driver Mobile",
        driverMobile
    