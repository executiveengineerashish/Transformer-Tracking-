const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";


let ALL_RECORDS = [];
let DAMAGE_HISTORY = {};

let searchTimer = null;


/*
  PR SEARCH
  A:X
*/

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


/* -------------------------
   BASIC HELPERS
------------------------- */

function clean(value) {

  return String(value ?? "").trim();

}


function normalize(value) {

  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s\-\/\\().,]/g, "")
    .trim();

}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function setStatus(text, type) {

  const el =
    document.getElementById("searchStatus");

  if (!el) return;

  el.textContent = text;

  el.className =
    "search-status " + (type || "");

}


/* -------------------------
   LOAD GOOGLE SHEET
------------------------- */

function loadSheet() {

  setStatus(
    "Loading transformer records...",
    "loading"
  );


  const callbackName =
    "TransformerTracking_" +
    Date.now() +
    "_" +
    Math.floor(Math.random() * 99999);


  let script =
    document.createElement("script");


  window[callbackName] =
    function(response) {

      try {

        if (
          !response ||
          !response.table ||
          !response.table.rows
        ) {

          throw new Error(
            "No data received from Google Sheet"
          );

        }


        const rows =
          response.table.rows;


        ALL_RECORDS =
          rows.map(function(row, index) {

            const record = [];


            for (
              let i = 0;
              i < 24;
              i++
            ) {

              const cell =
                row.c && row.c[i];


              if (!cell) {

                record.push("");

              } else if (
                cell.f !== undefined
              ) {

                record.push(cell.f);

              } else if (
                cell.v !== undefined
              ) {

                record.push(cell.v);

              } else {

                record.push("");

              }

            }


            record.__rowNumber =
              index + 4;


            record.__search =
              normalize(
                record.join(" ")
              );


            return record;

          });


        buildDamageHistory();


        setStatus(
          ALL_RECORDS.length.toLocaleString() +
          " transformer records loaded • Search ready",
          "ready"
        );


        console.log(
          "Transformer records:",
          ALL_RECORDS.length
        );


        const input =
          document.getElementById(
            "searchInput"
          );


        if (
          input &&
          input.value.trim()
        ) {

          performSearch();

        }


      } catch (error) {

        console.error(
          "Sheet processing error:",
          error
        );


        setStatus(
          "Unable to process transformer data",
          "error"
        );

      }


      cleanup();

    };


  window[callbackName + "_error"] =
    function() {

      setStatus(
        "Google Sheet connection failed",
        "error"
      );

      cleanup();

    };


  const url =
    "https://docs.google.com/spreadsheets/d/" +
    SHEET_ID +
    "/gviz/tq" +

    "?gid=" +
    encodeURIComponent(SHEET_GID) +

    "&range=" +
    encodeURIComponent("A3:X") +

    "&headers=1" +

    "&tq=" +
    encodeURIComponent("select *") +

    "&tqx=" +
    encodeURIComponent(
      "out:json;responseHandler:" +
      callbackName
    );


  console.log(
    "Loading PR SEARCH:",
    url
  );


  script.src = url;

  script.async = true;


  script.onerror =
    function() {

      setStatus(
        "Google Sheet connection failed",
        "error"
      );

      cleanup();

    };


  document.head.appendChild(script);


  function cleanup() {

    try {

      delete window[callbackName];

    } catch (e) {

      window[callbackName] =
        undefined;

    }


    if (script) {

      script.remove();

      script = null;

    }

  }


  setTimeout(
    function() {

      if (
        window[callbackName]
      ) {

        setStatus(
          "Loading timed out. Please refresh.",
          "error"
        );

        cleanup();

      }

    },
    45000
  );

}


/* -------------------------
   DAMAGE HISTORY
------------------------- */

function buildDamageHistory() {

  DAMAGE_HISTORY = {};


  ALL_RECORDS.forEach(
    function(record) {

      const place =
        normalize(
          record[COL.PLACE_DAMAGE]
        );


      if (!place) return;


      if (
        !DAMAGE_HISTORY[place]
      ) {

        DAMAGE_HISTORY[place] = [];

      }


      DAMAGE_HISTORY[place]
        .push(record);

    }
  );

}


/* -------------------------
   SEARCH
------------------------- */

function performSearch() {

  const input =
    document.getElementById(
      "searchInput"
    );

  const results =
    document.getElementById(
      "results"
    );


  if (!input || !results)
    return;


  const query =
    normalize(input.value);


  results.innerHTML = "";


  if (!query) {

    setStatus(
      ALL_RECORDS.length
        ? ALL_RECORDS.length.toLocaleString() +
          " transformer records loaded • Search ready"
        : "Loading transformer records...",
      ALL_RECORDS.length
        ? "ready"
        : "loading"
    );

    return;

  }


  if (!ALL_RECORDS.length) {

    setStatus(
      "Records are still loading...",
      "loading"
    );

    return;

  }


  const matches = [];


  for (
    let i = 0;
    i < ALL_RECORDS.length;
    i++
  ) {

    if (
      ALL_RECORDS[i]
        .__search
        .includes(query)
    ) {

      matches.push(
        ALL_RECORDS[i]
      );

    }

  }


  setStatus(
    matches.length +
    (
      matches.length === 1
        ? " record found"
        : " records found"
    ),
    "ready"
  );


  renderResults(matches);

}


/* -------------------------
   RENDER RESULTS
------------------------- */

function renderResults(records) {

  const results =
    document.getElementById(
      "results"
    );


  if (!records.length) {

    results.innerHTML =
      `
      <div class="no-result">
        No matching transformer found.
      </div>
      `;

    return;

  }


  const fragment =
    document.createDocumentFragment();


  records.forEach(
    function(record, index) {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "result-card";


      card.innerHTML =
        buildCard(
          record,
          index + 1
        );


      fragment.appendChild(card);

    }
  );


  results.appendChild(fragment);

}


/* -------------------------
   CARD
------------------------- */

function buildCard(
  record,
  number
) {


  const replacementDate =
    clean(
      record[
        COL.REPLACEMENT_DATE
      ]
    );


  const issueDate =
    clean(
      record[
        COL.ISSUE_DATE
      ]
    );


  const driverName =
    clean(
      record[
        COL.DRIVER_NAME
      ]
    );


  const driverMobile =
    clean(
      record[
        COL.DRIVER_MOBILE
      ]
    );


  let statusHTML = "";


  /* INSTALLED */

  if (replacementDate) {

    statusHTML = `

      <div class="status-box installed">

        <div class="status-title">
          ✓ Congratulations Your Transformer Installed
        </div>

        <div class="status-detail">
          Replacement Date:
          ${escapeHTML(replacementDate)}
        </div>

      </div>

    `;

  }


  /* ISSUED */

  else if (issueDate) {


    let callButton = "";


    if (driverMobile) {

      const phone =
        driverMobile.replace(
          /[^\d+]/g,
          ""
        );


      callButton = `

        <a
          class="call-btn"
          href="tel:${escapeHTML(phone)}"
        >
          ☎ CALL DRIVER
        </a>

      `;

    }


    statusHTML = `

      <div class="status-box issued">

        <div class="status-title">
          ⚡ Your Transformer Issued by Workshop
        </div>

        <div class="status-detail">
          Please Contact Driver for Installation
        </div>


        <div class="driver-info">

          <div>
            <b>Issue Date</b><br>
            ${escapeHTML(issueDate)}
          </div>


          <div>
            <b>Driver</b><br>
            ${escapeHTML(
              driverName || "-"
            )}
          </div>


          <div>
            <b>Mobile</b><br>
            ${escapeHTML(
              driverMobile || "-"
            )}
          </div>

        </div>


        ${callButton}

      </div>

    `;

  }


  /* PENDING */

  else {

    statusHTML = `

      <div class="status-box pending">

        <div class="status-title">
          ⏳ Transformer Replacement Pending
        </div>

      </div>

    `;

  }


  /* -------------------------
     REPEATED DAMAGE
  ------------------------- */

  const place =
    clean(
      record[
        COL.PLACE_DAMAGE
      ]
    );


  const history =
    place
      ? (
          DAMAGE_HISTORY[
            normalize(place)
          ] || []
        )
      : [];


  let repeatedHTML = "";


  if (history.length <= 1) {

    repeatedHTML = `

      <div class="repeat-box normal">
        <b>Not a repeated damage</b>
      </div>

    `;

  }

  else {


    let rows = "";


    history.forEach(
      function(item, index) {


        const pr =
          clean(
            item[
              COL.PR_NO
            ]
          ) || "-";


        const date =
          clean(
            item[
              COL.PR_DATE
            ]
          ) ||
          clean(
            item[
              COL.DATE_DAMAGE
            ]
          ) ||
          "-";


        rows += `

          <div class="repeat-row">

            <div>
              <b>
                ${ordinal(index + 1)} Time
              </b>
            </div>

            <div>
              PR No:
              <b>
                ${escapeHTML(pr)}
              </b>
            </div>

            <div>
              Date:
              <b>
                ${escapeHTML(date)}
              </b>
            </div>

          </div>

        `;

      }
    );


    repeatedHTML = `

      <div class="repeat-box repeated">

        <div class="repeat-title">
          ⚠ It Damaged ${history.length} times
        </div>

        <div class="repeat-warning">
          Please Ensure Increasing Capacity if Overloaded
        </div>

        ${rows}

      </div>

    `;

  }


  /* -------------------------
     FINAL CARD
  ------------------------- */

  return `

    <div class="card-number">

      #${number}

      <span>
        Row ${record.__rowNumber}
      </span>

    </div>


    ${statusHTML}


    ${repeatedHTML}


    <div class="data-grid">

      ${field(
        "Workshop",
        record[COL.WORKSHOP]
      )}

      ${field(
        "Division",
        record[COL.DIVISION]
      )}

      ${field(
        "Subdivision",
        record[COL.SUBDIVISION]
      )}

      ${field(
        "Substation",
        record[COL.SUBSTATION]
      )}

      ${field(
        "Feeder",
        record[COL.FEEDER]
      )}

      ${field(
        "Date of Damage",
        record[COL.DATE_DAMAGE]
      )}

      ${field(
        "Place of Damage",
        record[COL.PLACE_DAMAGE]
      )}

      ${field(
        "DID No",
        record[COL.DID_NO]
      )}

      ${field(
        "Capacity",
        record[COL.CAPACITY]
      )}

      ${field(
        "Complaint Number",
        record[COL.COMPLAINT_NO]
      )}

      ${field(
        "Complaint Date",
        record[COL.COMPLAINT_DATE]
      )}

      ${field(
        "PR No",
        record[COL.PR_NO]
      )}

      ${field(
        "PR Date",
        record[COL.PR_DATE]
      )}

      ${field(
        "JE Name",
        record[COL.JE_NAME]
      )}

      ${field(
        "JE Mobile",
        record[COL.JE_MOBILE]
      )}

      ${field(
        "Issued To Firm",
        record[COL.ISSUED_TO_FIRM]
      )}

      ${field(
        "Issue Date",
        record[COL.ISSUE_DATE]
      )}

      ${field(
        "Driver Name",
        record[COL.DRIVER_NAME]
      )}

      ${field(
        "Driver Mobile",
        record[COL.DRIVER_MOBILE]
      )}

      ${field(
        "Replacement Date",
        record[COL.REPLACEMENT_DATE]
      )}

      ${field(
        "Time",
        record[COL.TIME]
      )}

      ${field(
        "TX Return Date",
        record[COL.TX_RETURN_DATE]
      )}

      ${field(
        "Observation DTC",
        record[COL.OBSERVATION]
      )}

    </div>

  `;

}


/* -------------------------
   FIELD
------------------------- */

function field(
  label,
  value
) {

  const v =
    clean(value);


  if (!v) return "";


  return `

    <div class="data-item">

      <div class="data-label">
        ${escapeHTML(label)}
      </div>

      <div class="data-value">
        ${escapeHTML(v)}
      </div>

    </div>

  `;

}


/* -------------------------
   ORDINAL
------------------------- */

function ordinal(n) {

  if (
    n % 100 >= 11 &&
    n % 100 <= 13
  ) {

    return n + "th";

  }


  switch (n % 10) {

    case 1:
      return n + "st";

    case 2:
      return n + "nd";

    case 3:
      return n + "rd";

    default:
      return n + "th";

  }

}


/* -------------------------
   SEARCH EVENTS
------------------------- */

function setupSearch() {

  const input =
    document.getElementById(
      "searchInput"
    );


  const button =
    document.getElementById(
      "searchBtn"
    );


  if (!input) return;


  input.addEventListener(
    "input",
    function() {

      clearTimeout(
        searchTimer
      );


      searchTimer =
        setTimeout(
          function() {

            performSearch();

          },
          80
        );

    }
  );


  if (button) {

    button.addEventListener(
      "click",
      function() {

        performSearch();

      }
    );

  }


  input.addEventListener(
    "keydown",
    function(event) {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        performSearch();

      }

    }
  );

}


/* -------------------------
   START
------------------------- */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    setupSearch();

    loadSheet();

  }
);