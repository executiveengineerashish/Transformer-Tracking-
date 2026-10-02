<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
>

<title>Transformer Tracking</title>

<style>

*{
  box-sizing:border-box;
  -webkit-tap-highlight-color:transparent;
}

html,body{
  margin:0;
  padding:0;
  width:100%;
  min-height:100%;
}

body{
  font-family:Arial,Helvetica,sans-serif;
  background:#f4f5f7;
  color:#222;
}

.app{
  width:100%;
  max-width:520px;
  min-height:100vh;
  margin:auto;
  background:#f5f6f8;
}

/* ================= HEADER ================= */

.header{
  background:linear-gradient(135deg,#ff6a00,#ff1700);
  color:#fff;
  padding:32px 25px 34px;
  border-radius:0 0 30px 30px;
  box-shadow:0 5px 16px rgba(0,0,0,.18);
}

.title{
  font-size:29px;
  font-weight:700;
  line-height:1.15;
  margin:0 0 8px;
}

.subtitle{
  font-size:15px;
  opacity:.95;
}

/* ================= SEARCH CARD ================= */

.searchBox{
  background:#fff;
  margin:-8px 20px 16px;
  padding:21px 24px;
  border-radius:23px;
  box-shadow:0 5px 18px rgba(0,0,0,.10);
}

.label{
  font-size:20px;
  font-weight:700;
  margin-bottom:13px;
}

.searchRow{
  display:flex;
  gap:12px;
}

.searchInput{
  flex:1;
  min-width:0;
  height:62px;
  border:1px solid #d8d8d8;
  border-radius:17px;
  padding:0 17px;
  font-size:18px;
  outline:none;
  background:#fafafa;
}

.searchInput:focus{
  border-color:#ff6500;
  background:#fff;
  box-shadow:0 0 0 2px rgba(255,101,0,.08);
}

.searchBtn{
  width:135px;
  height:62px;
  border:none;
  border-radius:17px;
  background:linear-gradient(135deg,#ff7100,#ff3200);
  color:#fff;
  font-size:17px;
  font-weight:700;
  cursor:pointer;
}

.searchBtn:active{
  transform:scale(.97);
}

.searchBtn:disabled{
  opacity:.55;
}

/* ================= MESSAGE ================= */

.message{
  margin:14px 20px;
  padding:16px 14px;
  border-radius:16px;
  text-align:center;
  font-size:15px;
  line-height:1.45;
  background:#fff;
  color:#666;
  box-shadow:0 3px 12px rgba(0,0,0,.07);
}

.loading{
  color:#e65100;
}

.error{
  background:#fff0ee;
  color:#b71c1c;
}

.success{
  background:#edf9f0;
  color:#176b2b;
}

/* ================= RESULTS ================= */

.results{
  padding:0 15px 30px;
}

.resultCount{
  font-size:16px;
  font-weight:700;
  margin:15px 5px;
  color:#444;
}

/* ================= CARD ================= */

.card{
  background:#fff;
  border-radius:18px;
  margin-bottom:16px;
  overflow:hidden;
  box-shadow:0 4px 14px rgba(0,0,0,.10);
}

.cardHead{
  background:#fff2ea;
  border-bottom:1px solid #f1ddd3;
  padding:15px 16px;
}

.cardTitle{
  font-size:20px;
  font-weight:700;
  color:#d84315;
  word-break:break-word;
}

.cardSub{
  font-size:13px;
  color:#777;
  margin-top:4px;
}

.cardBody{
  padding:14px 16px;
}

/* ================= ROW ================= */

.row{
  display:flex;
  gap:10px;
  padding:9px 0;
  border-bottom:1px solid #eeeeee;
}

.key{
  width:43%;
  flex-shrink:0;
  font-size:12px;
  font-weight:600;
  color:#777;
}

.value{
  width:57%;
  font-size:13px;
  font-weight:600;
  color:#222;
  word-break:break-word;
}

/* ================= STATUS ================= */

.statusBox{
  margin:14px 0 5px;
  padding:13px;
  border-radius:13px;
  font-size:13px;
  line-height:1.55;
}

.installed{
  background:#e8f7ed;
  color:#176b2b;
  border-left:5px solid #2e9d4d;
}

.issued{
  background:#fff4df;
  color:#925600;
  border-left:5px solid #f39c12;
}

.pending{
  background:#fff0ee;
  color:#a52316;
  border-left:5px solid #e04432;
}

/* ================= REPEATED DAMAGE ================= */

.repeatBox{
  margin:14px 0 5px;
  padding:13px;
  border-radius:13px;
  background:#fff8e1;
  border-left:5px solid #ff9800;
}

.repeatTitle{
  font-size:15px;
  font-weight:700;
  color:#d35400;
  margin-bottom:7px;
}

.history{
  font-size:12px;
  line-height:1.7;
  color:#444;
}

.historyItem{
  padding:5px 0;
  border-top:1px dashed #ddd;
}

/* ================= ALL DETAILS ================= */

details{
  margin-top:12px;
  padding-top:10px;
  border-top:1px solid #eee;
}

summary{
  cursor:pointer;
  color:#d84315;
  font-size:13px;
  font-weight:700;
}

.allDetails{
  margin-top:7px;
}

/* ================= FOOTER ================= */

.footer{
  text-align:center;
  color:#aaa;
  font-size:12px;
  padding:15px 0 30px;
}

/* ================= SMALL MOBILE ================= */

@media(max-width:380px){

  .header{
    padding-left:20px;
    padding-right:20px;
  }

  .title{
    font-size:25px;
  }

  .searchBox{
    margin-left:14px;
    margin-right:14px;
    padding:18px;
  }

  .label{
    font-size:18px;
  }

  .searchRow{
    gap:8px;
  }

  .searchInput{
    height:56px;
    font-size:16px;
    padding:0 12px;
  }

  .searchBtn{
    width:105px;
    height:56px;
    font-size:15px;
  }

}

</style>

</head>


<body>

<div class="app">

  <!-- HEADER -->

  <div class="header">

    <div class="title">
      Transformer Tracking
    </div>

    <div class="subtitle">
      PR / Complaint tracking system
    </div>

  </div>


  <!-- SEARCH -->

  <div class="searchBox">

    <div class="label">
      PR / Complaint Number
    </div>

    <div class="searchRow">

      <input
        id="searchInput"
        class="searchInput"
        type="text"
        inputmode="text"
        autocomplete="off"
        placeholder="Enter PR / Complaint Number"
      >

      <button
        id="searchBtn"
        class="searchBtn"
      >
        SEARCH
      </button>

    </div>

  </div>


  <!-- MESSAGE -->

  <div
    id="message"
    class="message"
  >
    Enter PR / Complaint Number to search.
  </div>


  <!-- RESULTS -->

  <div
    id="results"
    class="results"
  ></div>


  <!-- FOOTER -->

  <div class="footer">
    Transformer Tracking
  </div>

</div>


<script>

/* =====================================================
   GOOGLE SHEET
===================================================== */

const SHEET_ID =
"1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";

const SHEET_GID =
"1464518527";

const SHEET_NAME =
"PR SEARCH";


/* =====================================================
   ELEMENTS
===================================================== */

const input =
document.getElementById("searchInput");

const searchBtn =
document.getElementById("searchBtn");

const message =
document.getElementById("message");

const results =
document.getElementById("results");


/* =====================================================
   VARIABLES
===================================================== */

let allRows = [];

let headers = [];

let loading = false;

let autoSearchTimer = null;


/* =====================================================
   NORMALIZE
===================================================== */

function normalize(value){

  if(
    value === null ||
    value === undefined
  ){
    return "";
  }

  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[\s\-\/\\().,:_]/g,"");

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(value){

  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}


/* =====================================================
   MESSAGE
===================================================== */

function showMessage(
  text,
  type=""
){

  message.className =
    "message " + type;

  message.innerHTML =
    text;

}


/* =====================================================
   LOAD GOOGLE SHEET
   JSONP METHOD
===================================================== */

function loadSheet(){

  return new Promise(
    function(resolve,reject){

      /*
       Already loaded
      */

      if(allRows.length){

        resolve(allRows);

        return;

      }


      const callbackName =
        "transformerCallback_" +
        Date.now();


      /*
       Timeout
      */

      const timeout =
        setTimeout(
          function(){

            delete window[
              callbackName
            ];


            const oldScript =
              document.getElementById(
                "googleSheetLoader"
              );


            if(oldScript){
              oldScript.remove();
            }


            reject(
              new Error(
                "Google Sheet loading timed out."
              )
            );

          },
          30000
        );


      /*
       GOOGLE CALLBACK
      */

      window[callbackName] =
        function(data){

          clearTimeout(timeout);


          try{

            if(
              !data ||
              !data.table
            ){

              throw new Error(
                "Invalid response from Google Sheet."
              );

            }


            const table =
              data.table;


            /*
             HEADERS
            */

            headers =
              table.cols.map(
                function(column,index){

                  return (
                    column.label ||
                    column.id ||
                    "Column " +
                    (index + 1)
                  );

                }
              );


            /*
             ROWS
            */

            allRows =
              table.rows.map(
                function(row){

                  const cells =
                    headers.map(
                      function(
                        header,
                        index
                      ){

                        const cell =
                          row.c &&
                          row.c[index];


                        if(!cell){
                          return "";
                        }


                        /*
                         Formatted value first.
                        */

                        if(
                          cell.f !== undefined
                        ){

                          return cell.f;

                        }


                        if(
                          cell.v !== undefined
                        ){

                          return cell.v;

                        }


                        return "";

                      }
                    );


                  const object = {

                    __cells:
                      cells

                  };


                  headers.forEach(
                    function(
                      header,
                      index
                    ){

                      object[header] =
                        cells[index];

                    }
                  );


                  return object;

                }
              );


            delete window[
              callbackName
            ];


            const script =
              document.getElementById(
                "googleSheetLoader"
              );


            if(script){
              script.remove();
            }


            resolve(allRows);


          }
          catch(error){

            delete window[
              callbackName
            ];

            reject(error);

          }

        };


      /*
       GOOGLE VISUALIZATION URL
      */

      const url =
        "https://docs.google.com/spreadsheets/d/" +
        SHEET_ID +
        "/gviz/tq" +
        "?gid=" +
        SHEET_GID +
        "&tqx=out:json;responseHandler:" +
        callbackName;


      /*
       SCRIPT
      */

      const script =
        document.createElement(
          "script"
        );


      script.id =
        "googleSheetLoader";

      script.src =
        url;


      script.onerror =
        function(){

          clearTimeout(timeout);

          delete window[
            callbackName
          ];

          script.remove();


          reject(
            new Error(
              "Google Sheet could not be accessed."
            )
          );

        };


      document.body.appendChild(
        script
      );

    }
  );

}


/* =====================================================
   GET FIELD
===================================================== */

function getField(
  row,
  names
){

  for(
    const wanted of names
  ){

    const found =
      headers.find(
        function(header){

          return (
            normalize(header) ===
            normalize(wanted)
          );

        }
      );


    if(
      found &&
      row[found] !== undefined
    ){

      return row[found];

    }

  }

  return "";

}


/* =====================================================
   MAIN FIELD HELPERS
===================================================== */

function getPlace(row){

  return getField(
    row,
    [
      "PLACE OF DAMAGE",
      "PLACE",
      "DAMAGE PLACE"
    ]
  );

}


function getPR(row){

  return getField(
    row,
    [
      "PR NO",
      "PR NUMBER",
      "PRNO"
    ]
  );

}


function getPRDate(row){

  return getField(
    row,
    [
      "PR DATE",
      "PRDATE"
    ]
  );

}


function getComplaint(row){

  return getField(
    row,
    [
      "COMPLAIN NUMBER",
      "COMPLAINT NUMBER",
      "COMPLAIN NO",
      "COMPLAINT NO"
    ]
  );

}


function getIssueDate(row){

  return getField(
    row,
    [
      "ISSUE DATE",
      "ISSUED DATE"
    ]
  );

}


function getReplacementDate(row){

  return getField(
    row,
    [
      "REPLACEMENT DATE",
      "TX REPLACEMENT DATE"
    ]
  );

}


function getDriver(row){

  return getField(
    row,
    [
      "DRIVER NAME",
      "DRIVER"
    ]
  );

}


function getDriverMobile(row){

  return getField(
    row,
    [
      "DRIVER MOBILE",
      "DRIVER MOBILE NO",
      "DRIVER PHONE"
    ]
  );

}


/* =====================================================
   SEARCH ALL COLUMNS
===================================================== */

function searchRows(
  rows,
  query
){

  const q =
    normalize(query);


  return rows.filter(
    function(row){

      return row.__cells.some(
        function(cell){

          return normalize(cell)
            .includes(q);

        }
      );

    }
  );

}


/* =====================================================
   DATE VALUE
===================================================== */

function dateValue(value){

  if(!value){
    return 0;
  }


  const text =
    String(value).trim();


  let date =
    new Date(text);


  if(!isNaN(date.getTime())){

    return date.getTime();

  }


  const match =
    text.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/
    );


  if(match){

    let day =
      Number(match[1]);

    let month =
      Number(match[2]) - 1;

    let year =
      Number(match[3]);


    if(year < 100){
      year += 2000;
    }


    return new Date(
      year,
      month,
      day
    ).getTime();

  }


  return 0;

}


/* =====================================================
   REPEATED DAMAGE HISTORY
   BASED ON PLACE OF DAMAGE
===================================================== */

function getHistory(row){

  const currentPlace =
    normalize(
      getPlace(row)
    );


  if(!currentPlace){
    return [];
  }


  const history =
    allRows.filter(
      function(item){

        return (
          normalize(
            getPlace(item)
          ) === currentPlace
        );

      }
    );


  history.sort(
    function(a,b){

      const dateA =
        dateValue(
          getPRDate(a) ||
          getField(
            a,
            [
              "DATE OF DAMAGE"
            ]
          )
        );


      const dateB =
        dateValue(
          get
