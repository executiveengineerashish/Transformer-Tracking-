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
   PR SEARCH COLUMN POSITIONS
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
   BASIC HELPERS
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

   All treated as same location.
===================================================== */

function normalizeLocation(value) {

  let text =
    String(value ?? "")
      .toLowerCase();

  text =
    text.replace(
      /[0-9]+/g,
      " "
    );

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
   25kVA

   All treated as 25.
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


  /* Google Date(yyyy,mm,dd) */

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


  if (
    !isNaN(
      date.getTime()
    )
  ) {

    return date;

  }


  return null;
}


/* =====================================================
   CURRENT MONTH
   BASED ONLY ON PR DATE
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
   LOAD PR SEARCH
   ONLY ONE GOOGLE REQUEST
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
          "PR SEARCH error:",
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


  const oldScript =
    $("googleSheetScript902");


  if (oldScript) {
    oldScript.remove();
  }


  const script =
    document.createElement(
      "script"
    );


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
   PROCESS DATA
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
        A3:X
        index 0 = header
        data starts from sheet row 4
      */

      if (
        index === 0
      ) {
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


        let displayValue = "";


        if (
          cell.f !== undefined &&
          cell.f !== null
        ) {

          displayValue =
            String(cell.f);

        } else if (
          cell.v !== undefined &&
          cell.v !== null
        ) {

          displayValue =
            String(cell.v);

        }


        record.push(
          displayValue
        );


        raw.push(
          cell.v !== undefined &&
          cell.v !== null
            ? String(cell.v)
            : ""
        );

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
    BUILD INDEXES
  */

  buildDamageHistory();


  /*
    DASHBOARD MUST NEVER STOP
    DATA PROCESSING
  */

  try {

    buildDashboard();

  } catch (error) {

    console.error(
      "Dashboard error:",
      error
    );

  }


  try {

    populateFilters();

  } catch (error) {

    console.error(
      "Filter error:",
      error
    );

  }


  setStatus(
    ALL_RECORDS.length.toLocaleString("en-IN") +
      " transformer records loaded • Search ready",
    false
  );

}


/* =====================================================
   REPEATED DAMAGE HISTORY
   LOCATION + SAME CAPACITY
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
  )
  .forEach(
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


          return (
            dateA - dateB
          );

        }
      );

    }
  );

}


/* =====================================================
   STATUS
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

    return "PENDING_ISSUE";

  }


  if (
    issueDate &&
    !replacementDate
  ) {

    return "REPLACEMENT_PENDING";

  }


  if (
    replacementDate &&
    !returnDate
  ) {

    return "RETURN_PENDING";

  }


  if (
    issueDate &&
    replacementDate &&
    returnDate
  ) {

    return "COMPLETED";

  }


  return "PENDING_ISSUE";

}


/* =====================================================
   ISSUE AGE
===================================================== */

function issueAgeHours(
  record
) {

  const date =
    parseDate(
      record[
        COL.ISSUE_DATE
      ]
    );


  if (!date) {
    return null;
  }


  return (
    Date.now() -
    date.getTime()
  ) / 3600000;

}


/* =====================================================
   DASHBOARD
   CURRENT MONTH
   PR DATE ONLY
===================================================== */

function buildDashboard() {

  const now =
    new Date();


  const monthName =
    now.toLocaleString(
      "en-IN",
      {
        month: "long",
        year: "numeric"
      }
    );


  if (
    $("dashboardMonth")
  ) {

    $("dashboardMonth")
      .textContent =
      monthName;

  }


  let total = 0;

  let issued = 0;

  let pendingIssue = 0;

  let replacementPending = 0;

  let returnPending = 0;


  let age24 = 0;

  let age72 = 0;

  let age168 = 0;


  const workshopPending = {};

  const capacityPending = {};


  const ageing = [
    0,
    0,
    0,
    0
  ];


  /*
    IMPORTANT:
    ONLY PR DATE IS USED
  */

  ALL_RECORDS.forEach(
    function(record) {

      const prDate =
        record[
          COL.PR_DATE
        ];


      if (
        !isCurrentMonth(
          prDate
        )
      ) {

        return;

      }


      total++;


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


      /* ISSUED */

      if (
        issueDate
      ) {

        issued++;

      }


      /* PENDING TO ISSUE */

      if (
        !issueDate
      ) {

        pendingIssue++;


        const workshop =
          clean(
            record[
              COL.WORKSHOP
            ]
          ) ||
          "Workshop Not Available";


        workshopPending[
          workshop
        ] =
          (
            workshopPending[
              workshop
            ] || 0
          ) + 1;


        const capacity =
          clean(
            record[
              COL.CAPACITY
            ]
          ) ||
          "Unknown";


        capacityPending[
          capacity
        ] =
          (
            capacityPending[
              capacity
            ] || 0
          ) + 1;


        /* AGEING BASED ON PR DATE */

        const pr =
          parseDate(
            prDate
          );


        if (pr) {

          const days =
            Math.floor(
              (
                Date.now() -
                pr.getTime()
              ) /
              86400000
            );


          if (
            days <= 1
          ) {

            ageing[0]++;

          } else if (
            days <= 3
          ) {

            ageing[1]++;

          } else if (
            days <= 7
          ) {

            ageing[2]++;

          } else {

            ageing[3]++;

          }

        }

      }


      /* REPLACEMENT PENDING */

      if (
        issueDate &&
        !replacementDate
      ) {

        replacementPending++;


        const issue =
          parseDate(
            issueDate
          );


        if (issue) {

          const hours =
            (
              Date.now() -
              issue.getTime()
            ) /
            3600000;


          if (
            hours > 24
          ) {

            age24++;

          }


          if (
            hours > 72
          ) {

            age72++;

          }


          if (
            hours > 168
          ) {

            age168++;

          }

        }

      }


      /* TX RETURN PENDING */

      if (
        replacementDate &&
        !returnDate
      ) {

        returnPending++;

      }

    }
  );


  /* ===================================================
     SUMMARY CARDS
  =================================================== */

  if (
    $("dashTotal")
  ) {

    $("dashTotal")
      .textContent =
      total.toLocaleString(
        "en-IN"
      );

  }


  if (
    $("dashIssued")
  ) {

    $("dashIssued")
      .textContent =
      issued.toLocaleString(
        "en-IN"
      );

  }


  if (
    $("dashPending")
  ) {

    $("dashPending")
      .textContent =
      pendingIssue.toLocaleString(
        "en-IN"
      );

  }


  if (
    $("dashReplacement")
  ) {

    $("dashReplacement")
      .textContent =
      replacementPending.toLocaleString(
        "en-IN"
      );

  }


  if (
    $("dashReturn")
  ) {

    $("dashReturn")
      .textContent =
      returnPending.toLocaleString(
        "en-IN"
      );

  }


  /* ===================================================
     TODAY'S ACTION
  =================================================== */

  if (
    $("age24")
  ) {

    $("age24").textContent =
      age24;

  }


  if (
    $("age72")
  ) {

    $("age72").textContent =
      age72;

  }


  if (
    $("age168")
  ) {

    $("age168").textContent =
      age168;

  }


  /* ===================================================
     WORKSHOP WISE
  =================================================== */

  const workshops =
    Object.entries(
      workshopPending
    )
    .sort(
      function(a, b) {
        return b[1] - a[1];
      }
    );


  const maxWorkshop =
    workshops.length
      ? workshops[0][1]
      : 1;


  if (
    $("workshopDashboard")
  ) {

    if (
      workshops.length
    ) {

      $("workshopDashboard")
        .innerHTML =
        workshops
          .map(
            function(item) {

              const width =
                Math.max(
                  6,
                  (
                    item[1] /
                    maxWorkshop
                  ) * 100
                );


              return `
                <div class="workshop-row">

                  <div class="workshop-name-line">

                    <span class="workshop-name">

                      ${escapeHtml(
                        item[0]
                      )}

                    </span>


                    <span class="workshop-count">

                      ${item[1]}

                    </span>

                  </div>


                  <div class="bar-background">

                    <div
                      class="bar-fill"
                      style="width:${width}%">
                    </div>

                  </div>

                </div>
              `;

            }
          )
          .join("");

    } else {

      $("workshopDashboard")
        .innerHTML =
        `
          <div class="dashboard-loading">

            No pending transformer

          </div>
        `;

    }

  }


  /* ===================================================
     CAPACITY WISE
  =================================================== */

  const capacities =
    Object.entries(
      capacityPending
    )
    .sort(
      function(a, b) {
        return b[1] - a[1];
      }
    );


  if (
    $("capacityDashboard")
  ) {

    if (
      capacities.length
    ) {

      $("capacityDashboard")
        .innerHTML =
        capacities
          .map(
            function(item) {

              return `
                <span class="capacity-chip">

                  ${escapeHtml(
                    item[0]
                  )}

                  kVA:

                  <b>
                    ${item[1]}
                  </b>

                </span>
              `;

            }
          )
          .join("");

    } else {

      $("capacityDashboard")
        .innerHTML =
        `
          <div class="dashboard-loading">

            No pending transformer

          </div>
        `;

    }

  }


  /* ===================================================
     AGEING
  =================================================== */

  if (
    $("ageingDashboard")
  ) {

    $("ageingDashboard")
      .innerHTML = `

        <div class="age-box">

          0–1 day

          <b>
            ${ageing[0]}
          </b>

        </div>


        <div class="age-box">

          2–3 days

          <b>
            ${ageing[1]}
          </b>

        </div>


        <div class="age-box">

          4–7 days

          <b>
            ${ageing[2]}
          </b>

        </div>


        <div class="age-box">

          &gt;7 days

          <b>
            ${ageing[3]}
          </b>

        </div>

      `;

  }


  /* ===================================================
     REPEATED DAMAGE
  =================================================== */

  const repeated =
    Object.entries(
      DAMAGE_HISTORY
    )
    .filter(
      function(item) {
        return item[1].length > 1;
      }
    )
    .sort(
      function(a, b) {
        return (
          b[1].leng