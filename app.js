const SHEET_ID="1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";
const SHEET_GID="1464518527";

let ALL=[];
let DAMAGE={};
let timer=null;

const $=id=>document.getElementById(id);
const clean=x=>String(x??"").trim();

function norm(x){
 return String(x??"").toLowerCase()
 .replace(/[\s\-\/\\().,\[\]{}:;_]+/g,"");
}

function esc(x){
 return String(x??"")
 .replace(/&/g,"&amp;")
 .replace(/</g,"&lt;")
 .replace(/>/g,"&gt;")
 .replace(/"/g,"&quot;")
 .replace(/'/g,"&#039;");
}

function locKey(x){
 return norm(
  String(x??"")
  .replace(/[0-9]+/g," ")
  .replace(/[\(\)\[\]\{\}]/g," ")
  .replace(/[-_/\\.,:;]+/g," ")
 );
}

function capKey(x){
 return String(x??"")
 .toLowerCase()
 .replace(/kva/g,"")
 .replace(/[^0-9.]/g,"")
 .trim();
}

function dateVal(x){

 if(!x)return null;

 let s=String(x).trim();
 let m;

 m=s.match(
  /Date\(\s*(\d{4})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})/
 );

 if(m)
  return new Date(
   +m[1],+m[2],+m[3]
  );

 m=s.match(
  /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/
 );

 if(m)
  return new Date(
   +m[3],
   +m[2]-1,
   +m[1]
  );

 let d=new Date(s);

 return isNaN(d.getTime())?null:d;
}

function currentMonth(x){

 let d=dateVal(x);
 let n=new Date();

 return !!d &&
  d.getFullYear()===n.getFullYear() &&
  d.getMonth()===n.getMonth();
}

function age(x){

 let d=dateVal(x);

 if(!d)return 0;

 let n=new Date();

 n.setHours(0,0,0,0);
 d.setHours(0,0,0,0);

 return Math.max(
  0,
  Math.floor((n-d)/86400000)
 );
}


/* =========================
   LOAD GOOGLE SHEET
========================= */

function loadSheet(){

 let status=$("searchStatus");

 if(status)
  status.textContent="Loading transformer records...";


 let callback="TT_"+Date.now();


 window[callback]=function(response){

  try{

   if(
    !response ||
    !response.table ||
    !response.table.rows
   ){
    throw new Error("Invalid Google response");
   }


   ALL=[];


   response.table.rows.forEach(
    function(row,index){

     let a=[];


     for(let c=0;c<24;c++){

      let cell=row.c?.[c];

      if(!cell){

       a.push("");

      }else if(
       cell.f!==undefined &&
       cell.f!==null
      ){

       a.push(String(cell.f));

      }else if(
       cell.v!==undefined &&
       cell.v!==null
      ){

       a.push(String(cell.v));

      }else{

       a.push("");

      }

     }


     if(!a.some(clean))
      return;


     a.__row=index+4;

     a.__search=norm(
      a.join(" ")
     );


     ALL.push(a);

    }
   );


   buildDamage();


   /* SEARCH READY FIRST */

   if(status){

    status.textContent=
     ALL.length.toLocaleString("en-IN")+
     " transformer records loaded • Search ready";

    status.classList.remove("error");

   }


   /* Dashboard separately */

   setTimeout(function(){

    try{
     buildDashboard();
    }catch(e){
     console.error("Dashboard error:",e);
    }

   },10);


  }catch(e){

   console.error("Sheet error:",e);

   if(status){

    status.textContent=
     "Error reading PR SEARCH data";

    status.classList.add("error");

   }

  }


  try{
   delete window[callback];
  }catch(e){}

 };


 let old=$("googleSheetScript");

 if(old)
  old.remove();


 let script=
  document.createElement("script");


 script.id=
  "googleSheetScript";


 /*
  No problematic encoding of callback.
 */

 script.src=
  "https://docs.google.com/spreadsheets/d/"+
  SHEET_ID+
  "/gviz/tq"+
  "?gid="+SHEET_GID+
  "&range=A3%3AX"+
  "&headers=1"+
  "&tqx=out:json;responseHandler:"+
  callback+
  "&_="+Date.now();


 script.onerror=function(){

  if(status){

   status.textContent=
    "Google Sheet connection failed. Refresh page.";

   status.classList.add("error");

  }

 };


 document.head.appendChild(script);

}


/* =========================
   DAMAGE INDEX
========================= */

function buildDamage(){

 DAMAGE={};


 ALL.forEach(function(x){

  let location=
   locKey(x[7]);

  let capacity=
   capKey(x[9]);


  if(!location || !capacity)
   return;


  let key=
   location+"||"+capacity;


  if(!DAMAGE[key])
   DAMAGE[key]=[];


  DAMAGE[key].push(x);

 });


 Object.keys(DAMAGE).forEach(
  function(key){

   DAMAGE[key].sort(
    function(a,b){

     let da=
      dateVal(a[13])||
      dateVal(a[6])||
      new Date(0);

     let db=
      dateVal(b[13])||
      dateVal(b[6])||
      new Date(0);

     return da-db;

    }
   );

  }
 );

}


/* =========================
   DASHBOARD
========================= */

function buildDashboard(){

 if(!ALL.length)
  return;


 let month=
  ALL.filter(function(x){

   return currentMonth(x[13]);

  });


 let total=month.length;
 let issued=0;
 let pending=0;
 let replacement=0;
 let txReturn=0;


 month.forEach(function(x){

  let issue=
   clean(x[17]);

  let rep=
   clean(x[20]);

  let ret=
   clean(x[22]);


  if(!issue){

   pending++;

  }else{

   issued++;


   if(!rep){

    replacement++;

   }else if(!ret){

    txReturn++;

   }

  }

 });


 if($("dashTotal"))
  $("dashTotal").textContent=total;

 if($("dashIssued"))
  $("dashIssued").textContent=issued;

 if($("dashPending"))
  $("dashPending").textContent=pending;

 if($("dashReplacement"))
  $("dashReplacement").textContent=replacement;

 if($("dashReturn"))
  $("dashReturn").textContent=txReturn;


 if($("dashboardMonth")){

  let n=new Date();

  $("dashboardMonth").textContent=
   n.toLocaleString(
    "en-IN",
    {
     month:"long",
     year:"numeric"
    }
   );

 }


 /* =========================
    WORKSHOP PENDING TO ISSUE
 ========================= */

 let workshop={};


 month.forEach(function(x){

  if(clean(x[17]))
   return;


  let w=
   clean(x[1])||"OTHER";


  workshop[w]=
   (workshop[w]||0)+1;

 });


 let wl=
  Object.entries(workshop)
  .sort(function(a,b){

   return b[1]-a[1];

  });


 let max=
  wl.length?
  wl[0][1]:
  1;


 if($("workshopDashboard")){

  $("workshopDashboard").innerHTML=
   wl.length?

   wl.map(function(x){

    return `
    <div class="dashboard-row">

     <div class="dashboard-row-title">
      <span>${esc(x[0])}</span>
      <span>${x[1]}</span>
     </div>

     <div class="dashboard-bar-bg">

      <div class="dashboard-bar"
       style="width:${(x[1]/max)*100}%">
      </div>

     </div>

    </div>`;

   }).join("")

   :

   '<div class="no-dashboard-data">'+
   'No Pending to Issue</div>';

 }


 /* =========================
    WORKSHOP AGEING
 ========================= */

 let ageing={};


 month.forEach(function(x){

  if(clean(x[17]))
   return;


  let w=
   clean(x[1])||"OTHER";


  if(!ageing[w]){

   ageing[w]={
    zero:0,
    one:0,
    more1:0,
    more3:0,
    more7:0
   };

  }


  let d=
   age(x[13]);


  if(d===0){

   ageing[w].zero++;

  }else if(d===1){

   ageing[w].one++;

  }else if(d<=3){

   ageing[w].more1++;

  }else if(d<=7){

   ageing[w].more3++;

  }else{

   ageing[w].more7++;

  }

 });


 if($("ageingDashboard")){

  $("ageingDashboard").innerHTML=
   Object.entries(ageing).map(
    function(x){

     return `
     <div class="ageing-row">

      <div class="ageing-name">
       ${esc(x[0])}
      </div>

      <div class="ageing-grid">

       <div class="age-box">
        <span>0 Day</span>
        <strong>${x[1].zero}</strong>
       </div>

       <div class="age-box">
        <span>1 Day</span>
        <strong>${x[1].one}</strong>
       </div>

       <div class="age-box">
        <span>&gt;1 Day</span>
        <strong>${x[1].more1}</strong>
       </div>

       <div class="age-box">
        <span>&gt;3 Days</span>
        <strong>${x[1].more3}</strong>
       </div>

       <div class="age-box">
        <span>&gt;7 Days</span>
        <strong>${x[1].more7}</strong>
       </div>

      </div>

     </div>`;

    }
   ).join("")

   ||

   '<div class="no-dashboard-data">'+
   'No ageing pending</div>';

 }


 /* =========================
    WORKSHOP CAPACITY
 ========================= */

 let capacity={};


 month.forEach(function(x){

  if(clean(x[17]))
   return;


  let w=
   clean(x[1])||"OTHER";

  let c=
   clean(x[9])||"Unknown";


  if(!capacity[w])
   capacity[w]={};


  capacity[w][c]=
   (capacity[w][c]||0)+1;

 });


 /*
  VERY IMPORTANT:
  Your HTML ID is:
  workshopCapacityDashboard
 */

 let capacityBox=
  $("workshopCapacityDashboard");


 if(capacityBox){

  capacityBox.innerHTML=
   Object.entries(capacity)
   .sort(function(a,b){

    let aa=
     Object.values(a[1])
     .reduce(function(s,v){
      return s+v;
     },0);


    let bb=
     Object.values(b[1])
     .reduce(function(s,v){
      return s+v;
     },0);


    return bb-aa;

   })
   .map(function(w){

    let chips=
     Object.entries(w[1])
     .sort(function(a,b){

      return
       (parseFloat(a[0])||0)-
       (parseFloat(b[0])||0);

     })
     .map(function(c){

      return `
      <span class="wc-chip">
       ${esc(c[0])} kVA
       <strong>${c[1]}</strong>
      </span>`;

     })
     .join("");


    return `
    <div class="wc-row">

     <div class="wc-name">
      ${esc(w[0])}
     </div>

     <div class="wc-capacity">
      ${chips}
     </div>

    </div>`;

   })
   .join("")

   ||

   '<div class="no-dashboard-data">'+
   'No capacity pending</div>';

 }

}


/* =========================
   SEARCH
========================= */

function searchRecords(){

 let input=
  $("searchInput");

 let results=
  $("results");


 if(!input || !results)
  return;


 let q=
  norm(input.value);


 if(!q){

  results.innerHTML="";
  return;

 }


 /*
  IMPORTANT:
  If data has not loaded yet,
  do NOT freeze the input.
 */

 if(!ALL.length){

  results.innerHTML=
   '<div class="no-results">'+
   'Loading records... Please wait.'+
   '</div>';

  return;

 }


 let found=[];


 for(let i=0;i<ALL.length;i++){

  if(
   ALL[i].__search.includes(q)
  ){

   found.push(ALL[i]);

  }

 }


 if(!found.length){

  results.innerHTML=
   '<div class="no-results">'+
   'No record found'+
   '</div>';

  return;

 }


 /*
  Don't render thousands of cards
  for 1 or 2 digit searches.
 */

 if(q.length<3){

  results.innerHTML=
   `<div class="result-count">

    ${found.length.toLocaleString("en-IN")}
    matching records

    <br>

    <small>
     Type more digits to show records
    </small>

   </div>`;

  return;

 }


 let show=
  found.slice(0,50);


 results.innerHTML=
  `<div class="result-count">

   ${found.length.toLocaleString("en-IN")}
   record(s) found

   ${
    found.length>50?
    "<br><small>Showing first 50</small>":
    ""
   }

  </div>`+

  show.map(
   function(x,i){

    return buildCard(x,i+1);

   }
  ).join("");

}


/* =========================
   RESULT CARD
========================= */

function buildCard(x,no){

 let issue=
  clean(x[17]);

 let replacement=
  clean(x[20]);


 let status="";


 /*
  CONGRATULATIONS ONLY IF
  REPLACEMENT DATE EXISTS
 */

 if(replacement){

  status=`
  <div class="status-box status-installed">

   <strong>
    ✓ Congratulations Your Transformer Installed
   </strong>

   <div>
    Replacement Date:
    ${esc(replacement)}
   </div>

  </div>`;

 }else if(issue){

  status=`
  <div class="status-box status-issued">

   <strong>
    ✓ Your Transformer Issued by Workshop
   </strong>

   <div>
    Please Contact Driver for Installation
   </div>

   <div>
    Issue Date:
    ${esc(issue)}
   </div>

   ${
    clean(x[18])?
    `<div>
      Driver: ${esc(x[18])}
     </div>`:
    ""
   }

   ${
    clean(x[19])?
    `<div>
      Mobile: ${esc(x[19])}
     </div>
     ${driverButtons(x)}`:
    ""
   }

  </div>`;

 }else{

  status=`
  <div class="status-box status-pending">

   <strong>
    ⚠ Transformer Pending to Issue
   </strong>

  </div>`;

 }


 /* =========================
    REPEATED DAMAGE
 ========================= */

 let key=
  locKey(x[7])+
  "||"+
  capKey(x[9]);


 let history=
  DAMAGE[key]||[];


 let repeat="";


 if(history.length===1){

  repeat=`
  <div class="damage-frequency">

   <div class="damage-title">
    ✓ No Repeat Damage
   </div>

   <div class="damage-subtitle">
    Only 1 damage at same place
    and same capacity
   </div>

  </div>`;

 }else{

  repeat=`
  <div class="damage-frequency">

   <div class="damage-title">
    🔄 ${history.length} Times Damage
   </div>

   <div class="damage-subtitle">
    Same Place + Same Capacity
   </div>

   ${
    history.map(function(y,i){

     let suffix=
      i===0?"st":
      i===1?"nd":
      i===2?"rd":
      "th";


     return `
     <div class="history-item">

      <div class="history-number">
       ${i+1}${suffix} Time
      </div>

      <div>
       PR No:
       <strong>
        ${esc(y[12]||"-")}
       </strong>
      </div>

      <div>
       PR Date:
       ${esc(y[13]||"-")}
      </div>

      <div>
       Capacity:
       <strong>
        ${esc(y[9]||"-")} kVA
       </strong>
      </div>

     </div>`;

    }).join("")
   }

  </div>`;

 }


 /* =========================
    DATA
 ========================= */

 let names=[
  "SN",
  "Workshop",
  "Division",
  "Subdivision",
  "Substation",
  "Feeder",
  "Date of Damage",
  "Place of Damage",
  "DID No",
  "Capacity",
  "Complaint Number",
  "Complaint Date",
  "PR No",
  "PR Date",
  "JE Name",
  "JE Mobile",
  "Issued to Firm",
  "Issue Date",
  "Driver Name",
  "Driver Mobile",
  "Replacement Date",
  "Time",
  "TX Return Date",
  "Observation DTC"
 ];


 let data="";


 names.forEach(function(name,i){

  if(!clean(x[i]))
   return;


  data+=`
  <div class="data-row">

   <div class="data-label">
    ${name}
   </div>

   <div class="data-value">
    ${esc(x[i])}
   </div>

  </div>`;

 });


 return `
 <div class="result-card">

  <div class="card-top">
   <span>#${no}</span>
   <span>Row ${x.__row}</span>
  </div>

  ${status}

  ${repeat}

  <div class="data-section">
   ${data}
  </div>

 </div>`;

}


/* =========================
   DRIVER
========================= */

function driverButtons(x){

 let phone=
  clean(x[19]).replace(/\D/g,"");


 if(phone.length===10)
  phone="91"+phone;


 let message=
`Namaste ${clean(x[18])||"Driver"} ji,

Transformer PR No.: ${clean(x[12])||"-"}
Capacity: ${clean(x[9])||"-"} kVA
Place: ${clean(x[7])||"-"}
Workshop: ${clean(x[1])||"-"}

The transformer has been issued from Workshop. Please arrange installation and confirm installation status.

Thank you.`;


 return `
 <div class="driver-buttons">

  <a class="call-driver"
   href="tel:${clean(x[19])}">
   📞 CALL DRIVER
  </a>

  <a class="whatsapp-driver"
   target="_blank"
   rel="noopener"
   href="https://wa.me/${phone}?text=${encodeURIComponent(message)}">
   💬 WHATSAPP
  </a>

 </div>`;

}


/* =========================
   START
========================= */

document.addEventListener(
 "DOMContentLoaded",
 function(){

  let input=
   $("searchInput");


  if(input){

   input.disabled=false;


   input.addEventListener(
    "input",
    function(){

     clearTimeout(timer);

     /*
      Very short debounce.
      Input is NEVER recreated.
     */

     timer=setTimeout(
      searchRecords,
      10
     );

    }
   );


   input.addEventListener(
    "keydown",
    function(e){

     if(e.key==="Enter"){

      e.preventDefault();

      clearTimeout(timer);

      searchRecords();

     }

    }
   );

  }


  let button=
   $("searchBtn");


  if(button){

   button.addEventListener(
    "click",
    function(){

     searchRecords();

     input?.focus();

    }
   );

  }


  loadSheet();

 }
);