const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";


let ALL_RECORDS = [];

let DAMAGE_HISTORY = {};

let searchTimer = null;



/* =========================
   COLUMN MAP
========================= */

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



/* =========================
   HELPERS
========================= */

function clean(value) {

  return String(value ?? "").trim();

}


function normalize(value) {

  return String(value ?? "")

    .toLowerCase()

    .replace(
      /[\s\-\/\\().,]/g,
      ""
    )

    .trim();

}


/*
  LOCATION NORMALIZATION

  Example:

  SISREDI
  SISREDI 1
  SISREDI 2
  SISREDI 25
  SISREDI-25

  All become:

  sisredi
*/

function normalizeLocation(value) {

  return String(value ?? "")

    .toLowerCase()

    /* remove all numbers */

    .replace(/[0-9]+/g, "")

    /* remove punctuation */

    .replace(
      /[\s\-\/\\().,]+/g,
      " "
    )

    .trim();

}


function escapeHTML(value) {

  return String(value ?? "")

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


function setStatus(
  text,
  type
) {

  const el =
    document.getElementById(
      "searchStatus"
    );

  if (!el) return;

  el.textContent = text;

  el.className =
    "search-status " +
    (type || "");

}



/* =========================
   LOAD SHEET
========================= */

function loadSheet() {

  setStatus(
    "Loading transformer records...",
    "loading"
  );


  const callbackName =

    "TransformerTracking_" +

    Date.now() +

    "_" +

    Math.floor(
      Math.random() * 99999
    );


  let script =
    document.createElement(
      "script"
    );


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

          rows

            .map(
              function(
                row,
                index
              ) {


                const record = [];


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

                  }

                  else if (
                    cell.f !== undefined
                  ) {

                    record.push(
                      cell.f
                    );

                  }

                  else if (
                    cell.v !== undefined
                  ) {

                    record.push(
                      cell.v
                    );

                  }

                  else {

                    record.push("");

                  }

                }


                /*
                  Ignore completely blank rows
                */

                const hasData =
                  record.some(
                    function(value) {

                      return clean(
                        value
                      ) !== "";

                    }
                  );


                if (!hasData) {

                  return null;

                }


                record.__rowNumber =
                  index + 4;


                /*
                  Search index
                */

                record.__search =
                  normalize(
                    record.join(" ")
                  );


                return record;

              }
            )

            .filter(
              function(record) {

                return record !== null;

              }
            );


        /*
          Build repeated damage
        */

        buildDamageHistory();


        /*
          Build dashboard
        */

        buildDashboard();


        /*
          Ready
        */

        setStatus(

          ALL_RECORDS.length
            .toLocaleString() +

          " transformer records loaded • Search ready",

          "ready"

        );


        console.log(
          "Transformer records:",
          ALL_RECORDS.length
        );


        /*
          If user already typed
          something while loading
        */

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


      }

      catch (error) {

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



  const url =

    "https://docs.google.com/spreadsheets/d/" +

    SHEET_ID +

    "/gviz/tq" +

    "?gid=" +

    encodeURIComponent(
      SHEET_GID
    ) +

    "&range=" +

    encodeURIComponent(
      "A3:X"
    ) +

    "&headers=1" +

    "&tq=" +

    encodeURIComponent(
      "select *"
    ) +

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


  document.head.appendChild(
    script
  );


  /*
    Timeout
  */

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


  function cleanup() {

    try {

      delete window[
        callbackName
      ];

    }

    catch (e) {

      window[
        callbackName
      ] = undefined;

    }


    if (script) {

      script.remove();

      script = null;

    }

  }

}



/* =========================
   REPEATED DAMAGE HISTORY
========================= */

function buildDamageHistory() {

  DAMAGE_HISTORY = {};


  ALL_RECORDS.forEach(

    function(record) {


      /*
        Location without numbers
      */

      const location =

        normalizeLocation(

          record[
            COL.PLACE_DAMAGE
          ]

        );


      /*
        Capacity must also match
      */

      const capacity =

        normalize(

          record[
            COL.CAPACITY
          ]

        );


      if (!location) {

        return;

      }


      /*
        SAME LOCATION
        +
        SAME CAPACITY

        = SAME DAMAGE GROUP
      */

      const key =

        location +

        "||" +

        capacity;


      if (
        !DAMAGE_HISTORY[key]
      ) {

        DAMAGE_HISTORY[key] = [];

      }


      DAMAGE_HISTORY[key]
        .push(record);

    }

  );

}



/* =========================
   DASHBOARD
========================= */

function buildDashboard() {


  const totalEl =
    document.getElementById(
      "dashTotal"
    );


  const issuedEl =
    document.getElementById(
      "dashIssued"
    );


  const pendingEl =
    document.getElementById(
      "dashPending"
    );


  const container =
    document.getElementById(
      "workshopDashboard"
    );


  if (
    !totalEl ||
    !issuedEl ||
    !pendingEl ||
    !container
  ) {

    return;

  }


  let total = 0;

  let issued = 0;

  let pending = 0;


  const workshopPending = {};


  /*
    Count actual records
  */

  ALL_RECORDS.forEach(

    function(record) {


      total++;


      const issueDate =

        clean(

          record[
            COL.ISSUE_DATE
          ]

        );


      /*
        Issue Date available
        = Issued
      */

      if (issueDate) {

        issued++;

      }

      else {

        pending++;


        const workshop =

          clean(

            record[
              COL.WORKSHOP
            ]

          ) ||

          "Workshop Not Available";


        if (
          !workshopPending[
            workshop
          ]
        ) {

          workshopPending[
            workshop
          ] = 0;

        }


        workshopPending[
          workshop
        ]++;

      }

    }

  );


  /*
    Summary
  */

  totalEl.textContent =
    total.toLocaleString();


  issuedEl.textContent =
    issued.toLocaleString();


  pendingEl.textContent =
    pending.toLocaleString();


  /*
    Workshop list
  */

  const workshopList =

    Object.entries(
      workshopPending
    )

    .sort(

      function(a, b) {

        return b[1] - a[1];

      }

    );


  if (
    !workshopList.length
  ) {

    container.innerHTML =

      `
      <div class="dashboard-loading">
        No pending transformer to issue.
      </div>
      `;

    return;

  }


  const max =
    workshopList[0][1];


  const colors = [

    "bar-1",
    "bar-2",
    "bar-3",
    "bar-4",
    "bar-5",
    "bar-6",
    "bar-7",
    "bar-8",
    "bar-9",
    "bar-10"

  ];


  let html = "";


  workshopList.forEach(

    function(item, index) {


      const workshop =
        item[0];


      const count =
        item[1];


      const percentage =

        Math.max(

          4,

          (
            count /
            max
          ) * 100

        );


      const color =

        colors[
          index %
          colors.length
        ];


      html += `

        <div class="workshop-row">


          <div
            class="workshop-name-line">


            <span
              class="workshop-name">

              ${escapeHTML(
                workshop
              )}

            </span>


            <span
              class="workshop-count">

              ${count}

            </span>


          </div>


          <div
            class="bar-background">


            <div
              class="bar-fill ${color}"
              style="width:${percentage}%">

            </div>


          </div>


        </div>

      `;

    }

  );


  container.innerHTML =
    html;

}



/* =========================
   SEARCH
========================= */

function performSearch() {


  const input =
    document.getElementById(
      "searchInput"
    );


  const results =
    document.getElementById(
      "results"
    );


  if (
    !input ||
    !results
  ) {

    return;

  }


  const query =
    normalize(
      input.value
    );


  /*
    Clear immediately
    so backspace never hangs
  */

  results.innerHTML = "";


  if (!query) {

    setStatus(

      ALL_RECORDS.length

        ? ALL_RECORDS.length
            .toLocaleString() +
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


  /*
    FAST LOCAL SEARCH
  */

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


  renderResults(
    matches
  );

}



/* =========================
   RENDER
========================= */

function renderResults(
  records
) {


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


      fragment.appendChild(
        card
      );

    }

  );


  results.appendChild(
    fragment
  );

}



/* =========================
   BUILD CARD
========================= */

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



  /* =====================
     INSTALLED
  ===================== */

  if (replacementDate) {


    statusHTML = `

      <div
        class="status-box installed">


        <div
          class="status-title">

          ✓ Congratulations Your Transformer Installed

        </div>


        <div
          class="status-detail">

          Replacement Date:
          ${escapeHTML(
            replacementDate
          )}

        </div>


      </div>

    `;

  }



  /* =====================
     ISSUED
  ===================== */

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
          href="tel:${escapeHTML(phone)}">

          ☎ CALL DRIVER

        </a>

      `;

    }


    statusHTML = `

      <div
        class="status-box issued">


        <div
          class="status-title">

          ⚡ Your Transformer Issued by Workshop

        </div>


        <div
          class="status-detail">

          Please Contact Driver for Installation

        </div>


        <div
          class="driver-info">


          <div>

            <b>Issue Date</b>

            <br>

            ${escapeHTML(
              issueDate
            )}

          </div>


          <div>

            <b>Driver</b>

            <br>

            ${escapeHTML(
              driverName || "-"
            )}

          </div>


          <div>

            <b>Mobile</b>

            <br>

            ${escapeHTML(
              driverMobile || "-"
            )}

          </div>


        </div>


        ${callButton}


      </div>

    `;

  }



  /* =====================
     PENDING
  ===================== */

  else {


    statusHTML = `

      <div
        class="status-box pending">


        <div
          class="status-title">

          ⏳ Transformer Replacement Pending

        </div>


      </div>

    `;

  }



  /* =====================
     REPEATED DAMAGE KEY
  ===================== */

  const location =

    normalizeLocation(

      record[
        COL.PLACE_DAMAGE
      ]

    );


  const capacity =

    normalize(

      record[
        COL.CAPACITY
      ]

    );


  const historyKey =

    location +

    "||" +

    capacity;


  const history =

    location

      ? (
          DAMAGE_HISTORY[
            historyKey
          ] || []
        )

      : [];



  let repeatedHTML = "";



  /* =====================
     NOT REPEATED
  ===================== */

  if (
    history.length <= 1
  ) {


    repeatedHTML = `

      <div
        class="repeat-box normal">

        <b>
          Not a repeated damage
        </b>

      </div>

    `;

  }



  /* =====================
     REPEATED
  ===================== */

  else {


    let rows = "";


    history.forEach(

      function(
        item,
        index
      ) {


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


        const itemCapacity =

          clean(

            item[
              COL.CAPACITY
            ]

          ) || "-";


        rows += `

          <div
            class="repeat-row">


            <div>

              <b>

                ${ordinal(
                  index + 1
                )} Time

              </b>

            </div>


            <div>

              PR No:

              <b>

                ${escapeHTML(
                  pr
                )}

              </b>

            </div>


            <div>

              Date:

              <b>

                ${escapeHTML(
                  date
                )}

              </b>

            </div>


            <div>

              Capacity:

              <b>

                ${escapeHTML(
                  itemCapacity
                )}

              </b>

            </div>


          </div>

        `;

      }

    );


    repeatedHTML = `

      <div
        class="repeat-box repeated">


        <div
          class="repeat-title">

          ⚠ It Damaged
          ${history.length}
          times

        </div>


        <div
          class="repeat-warning">

          Please Ensure Increasing Capacity if Overloaded

        </div>


        ${rows}


      </div>

    `;

  }



  /* =====================
     FINAL CARD
  ===================== */

  return `


    <div
      class="card-number">


      #${number}


      <span>

        Row
        ${record.__rowNumber}

      </span>


    </div>



    ${statusHTML}



    ${repeatedHTML}



    <div
      class="data-grid">


      ${field(
        "Workshop",
        record[
          COL.WORKSHOP
        ]
      )}


      ${field(
        "Division",
        record[
          COL.DIVISION
        ]
      )}


      ${field(
        "Subdivision",
        record[
          COL.SUBDIVISION
        ]
      )}


      ${field(
        "Substation",
        record[
          COL.SUBSTATION
        ]
      )}


      ${field(
        "Feeder",
        record[
          COL.FEEDER
        ]
      )}


      ${field(
        "Date of Damage",
        record[
          COL.DATE_DAMAGE
        ]
      )}


      ${field(
        "Place of Damage",
        record[
          COL.PLACE_DAMAGE
        ]
      )}


      ${field(
        "DID No",
        record[
          COL.DID_NO
        ]
      )}


      ${field(
        "Capacity",
        record[
          COL.CAPACITY
        ]
      )}


      ${field(
        "Complaint Number",
        record[
          COL.COMPLAINT_NO
        ]
      )}


      ${field(
        "Complaint Date",
        record[
          COL.COMPLAINT_DATE
        ]
      )}


      ${field(
        "PR No",
        record[
          COL.PR_NO
        ]
      )}


      ${field(
        "PR Date",
        record[
          COL.PR_DATE
        ]
      )}


      ${field(
        "JE Name",
        record[
          COL.JE_NAME
        ]
      )}


      ${field(
        "JE Mobile",
        record[
          COL.JE_MOBILE
        ]
      )}


      ${field(
        "Issued To Firm",
        record[
          COL.ISSU