const SHEET_ID =
  "1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
  "1464518527";


let ALL_RECORDS = [];

let DAMAGE_HISTORY = {};

let searchTimer = null;


/* =========================
   COLUMNS
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
    .replace(/[\s\-\/\\().,\[\]{}:;_]+/g, "")
    .trim();

}


/*
  LOCATION NORMALIZATION

  Numbers are ignored anywhere
  in the location.

  Examples:

  SISREDI
  SISREDI 1
  SISREDI 25
  25 SISREDI
  SISREDI (25)
  (25) SISREDI
  SISREDI [25]

  All become:

  sisredi
*/

function normalizeLocation(value) {

  let text =
    String(value ?? "")
      .toLowerCase();


  /*
    Remove numbers
  */

  text =
    text.replace(
      /[0-9]+/g,
      " "
    );


  /*
    Remove bracket characters
  */

  text =
    text.replace(
      /[\(\)\[\]\{\}]/g,
      " "
    );


  /*
    Remove punctuation
  */

  text =
    text.replace(
      /[-_/\\.,:;]+/g,
      " "
    );


  /*
    Remove extra spaces
  */

  text =
    text.replace(
      /\s+/g,
      " "
    )
    .trim();


  /*
    Final compact comparison key
  */

  return normalize(text);

}


/*
  Date parser

  Supports:

  02.10.2026
  02/10/2026
  02-10-2026
  2026-10-02
  Google date strings
  Date objects
*/

function parseDate(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }


  if (
    Object.prototype.toString
      .call(value) ===
    "[object Date]"
  ) {

    if (
      isNaN(value.getTime())
    ) {
      return null;
    }

    return value;

  }


  const text =
    String(value).trim();


  /*
    Google visualization date:

    Date(2026,9,2)
  */

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


  /*
    yyyy-mm-dd
  */

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


  /*
    dd.mm.yyyy
    dd/mm/yyyy
    dd-mm-yyyy
  */

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


  /*
    Try normal JS date
  */

  const parsed =
    new Date(text);


  if (
    !isNaN(parsed.getTime())
  ) {

    return parsed;

  }


  return null;

}


/*
  Check whether date belongs
  to current month/year
*/

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
    now.getFullYear()

    &&

    date.getMonth() ===
    now.getMonth()

  );

}


/*
  Month label
*/

function currentMonthLabel() {

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      month: "long",
      year: "numeric"
    }
  ).format(
    new Date()
  );

}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

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


  let completed = false;


  window[callbackName] =

    function(response) {

      if (completed) return;

      completed = true;


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


                /*
                  Actual sheet row

                  A3 is header

                  A4 is first data row
                */

                record.__rowNumber =
                  index + 4;


                /*
                  Complete search index
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


        console.log(
          "TOTAL RECORDS:",
          ALL_RECORDS.length
        );


        /*
          Build repeated history
        */

        buildDamageHistory();


        /*
          Build CURRENT MONTH dashboard
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


        /*
          Search if user
          typed while loading
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

      if (completed) return;

      completed = true;


      setStatus(
        "Google Sheet connection failed",
        "error"
      );


      cleanup();

    };


  document.head.appendChild(
    script
  );


  setTimeout(
    function() {

      if (
        !completed
      ) {

        completed = true;


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
   REPEATED DAMAGE
========================= */

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


      if (!location) {

        return;

      }


      /*
        IMPORTANT:

        Repeated damage is
        LOCATION based.

        Capacity is NOT used
        to discard history.

        Every actual occurrence
        remains visible.

        Capacity of each occurrence
        is shown separately.
      */

      if (
        !DAMAGE_HISTORY[location]
      ) {

        DAMAGE_HISTORY[location] = [];

      }


      DAMAGE_HISTORY[location]
        .push(record);

    }

  );


  /*
    Sort every history by date
    oldest to newest where possible
  */

  Object.keys(
    DAMAGE_HISTORY
  ).forEach(

    function(key) {

      DAMAGE_HISTORY[key].sort(
        function(a, b) {

          const da =
            parseDate(
              a[COL.PR_DATE]
            ) ||
            parseDate(
              a[COL.DATE_DAMAGE]
            );

          const db =
            parseDate(
              b[COL.PR_DATE]
            ) ||
            parseDate(
              b[COL.DATE_DAMAGE]
            );


          if (!da && !db)
            return 0;

          if (!da)
            return 1;

          if (!db)
            return -1;


          return da - db;

        }
      );

    }

  );

}


/* =========================
   CURRENT MONTH DASHBOARD
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


  const monthEl =
    document.getElementById(
      "dashboardMonth"
    );


  if (
    !totalEl ||
    !issuedEl ||
    !pendingEl ||
    !container
  ) {

    console.error(
      "Dashboard elements missing"
    );

    return;

  }


  /*
    Show current month
  */

  if (monthEl) {

    monthEl.textContent =
      currentMonthLabel() +
      " • Based on Date of Damage";

  }


  let total = 0;

  let issued = 0;

  let pending = 0;


  const workshopPending = {};


  /*
    ONLY CURRENT MONTH
  */

  ALL_RECORDS.forEach(

    function(record) {


      const damageDate =
        record[
          COL.DATE_DAMAGE
        ];


      if (
        !isCurrentMonth(
          damageDate
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
    Update summary
  */

  totalEl.textContent =
    total.toLocaleString();


  issuedEl.textContent =
    issued.toLocaleString();


  pendingEl.textContent =
    pending.toLocaleString();


  /*
    No current month records
  */

  if (total === 0) {

    container.innerHTML =

      `
      <div class="dashboard-loading">

        No transformer record found
        for ${escapeHTML(
          currentMonthLabel()
        )}.

      </div>
      `;

    return;

  }


  const workshopList =

    Object.entries(
      workshopPending
    )
    .sort(
      function(a, b) {

        return b[1] - a[1];

      }
    );


  /*
    No pending
  */

  if (
    !workshopList.length
  ) {

    container.innerHTML =

      `
      <div class="dashboard-loading">

        No pending transformer
        to issue in
        ${escapeHTML(
          currentMonthLabel()
        )}.

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

        <div
          class="workshop-row">


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
    Immediate clear
    on backspace
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
    Fast local search
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
   RENDER RESULTS
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

    function(
      record,
      index
    ) {


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


  /*
    INSTALLED
  */

  if (
    replacementDate
  ) {


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


  /*
    ISSUED
  */

  else if (
    issueDate
  ) {


    let callButton = "";


    if (
      driverMobile
    ) {


      const phone =
        driverMobile.replace(
          /[^\d+]/g,
          ""
        );


      callButton = `

        <a
          class="call-btn"
          href="tel:${escapeHTML(
            phone
          )}">

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


  /*
    PENDING
  */

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


  /*
    REPEATED DAMAGE

    LOCATION ONLY

    Numbers ignored.
  */

  const location =
    normalizeLocation(
      record[
        COL.PLACE_DAMAGE
      ]
    );


  const history =
    location
      ? (
          DAMAGE_HISTORY[
            location
          ] || []
        )
      : [];


  let repeatedHTML = "";


  /*
    NOT REPEATED
  */

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


  /*
    REPEATED
  */

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
 