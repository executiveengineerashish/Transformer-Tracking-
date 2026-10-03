const SHEET_ID="1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";
const SHEET_GID="1464518527";

let ALL=[];
let searchTimer=null;

const $=id=>document.getElementById(id);
const clean=x=>String(x??"").trim();

const norm=x=>String(x??"")
.toLowerCase()
.replace(/[\s\-\/\\().,\[\]{}:;_]+/g,"");

function esc(x){
 return String(x??"")
 .replace(/&/g,"&amp;")
 .replace(/</g,"&lt;")
 .replace(/>/g,"&gt;")
 .replace(/"/g,"&quot;")
 .replace(/'/g,"&#039;");
}


/* PLACE + CAPACITY */

function locationKey(x){
 return norm(
  String(x??"")
  .replace(/[0-9]+/g," ")
  .replace(/[\(\)\[\]\{\}]/g," ")
 );
}

function capacityKey(x){
 return String(x??"")
 .toLowerCase()
 .replace(/kva/g,"")
 .replace(/[^0-9.]/g,"")
 .trim();
}


/* DATE */

function parseDate(x){

 if(!x)return null;

 let s=String(x).trim();

 let m=s.match(
  /Date\(\s*(\d{4})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})/
 );

 if(m)
  return new Date(+m[1],+m[2],+m[3]);

 m=s.match(
  /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/
 );

 if(m)
  return new Date(+m[3],+m[2]-1,+m[1]);

 let d=new Date(s);

 return isNaN(d.getTime())?null:d;
}


/* CURRENT MONTH = PR DATE */

function currentMonth(x){

 let d=parseDate(x);
 let n=new Date();

 return d &&
 d.getFullYear()===n.getFullYear() &&
 d.getMonth()===n.getMonth();
}


/* AGE FROM PR DATE */

function ageDays(prDate){

 let d=parseDate(prDate);

 if(!d)return 0;

 let today=new Date();

 today.setHours(0,0,0,0);
 d.setHours(0,0,0,0);

 let days=Math.floor(
  (today-d)/86400000
 );

 return Math.max(0,days);
}


/* LOAD SHEET */

function loadSheet(){

 $("searchStatus").textContent=
  "Loading transformer records...";

 let callback="TT_"+Date.now();

 window[callback]=function(response){

  try{

   ALL=[];

   (response.table.rows||[]).forEach(function(row,index){

    let a=[];

    for(let i=0;i<24;i++){

     let c=row.c?.[i];

     a.push(
      c?.f!==undefined?
      String(c.f):
      c?.v!==undefined?
      String(c.v):
      ""
     );

    }

    if(!a.some(clean))return;

    a.__row=index+4;
    a.__search=norm(a.join(" "));

    ALL.push(a);

   });

   buildDashboard();

   $("searchStatus").textContent=
    ALL.length.toLocaleString("en-IN")+
    " transformer records loaded • Search ready";

  }catch(e){

   console.error(e);

   $("searchStatus").textContent=
    "Error reading PR SEARCH data";

   $("searchStatus").classList.add("error");
  }

 };

 let old=$("googleSheetScript");

 if(old)old.remove();

 let script=document.createElement("script");

 script.id="googleSheetScript";

 script.src=
 "https://docs.google.com/spreadsheets/d/"+
 SHEET_ID+
 "/gviz/tq"+
 "?gid="+SHEET_GID+
 "&range=A3:X"+
 "&headers=1"+
 "&tqx=out%3Ajson%3BresponseHandler%3A"+
 callback+
 "&_="+Date.now();

 script.onerror=function(){

  $("searchStatus").textContent=
   "Google Sheet connection failed. Refresh page.";

 };

 document.head.appendChild(script);
}


/* DASHBOARD */

function buildDashboard(){

 if(!ALL.length)return;

 let month=
  ALL.filter(x=>currentMonth(x[13]));

 let total=month.length;
 let issuePending=0;
 let replacementPending=0;
 let returnPending=0;
 let issued=0;

 month.forEach(function(x){

  let issue=clean(x[17]);
  let replacement=clean(x[20]);
  let returned=clean(x[22]);

  if(!issue){

   issuePending++;

  }else{

   issued++;

   if(!replacement)
    replacementPending++;

   else if(!returned)
    returnPending++;
  }

 });

 $("dashTotal").textContent=total;
 $("dashIssued").textContent=issued;
 $("dashPending").textContent=issuePending;
 $("dashReplacement").textContent=replacementPending;
 $("dashReturn").textContent=returnPending;


 let now=new Date();

 $("dashboardMonth").textContent=
  now.toLocaleString("en-IN",{
   month:"long",
   year:"numeric"
  });


 /* ================= WORKSHOP STATUS ================= */

 let WS={};

 month.forEach(function(x){

  let w=clean(x[1])||"OTHER";

  if(!WS[w]){
   WS[w]={
    issue:0,
    replacement:0,
    returned:0
   };
  }

  let issue=clean(x[17]);
  let replacement=clean(x[20]);
  let returned=clean(x[22]);

  if(!issue)
   WS[w].issue++;

  else if(!replacement)
   WS[w].replacement++;

  else if(!returned)
   WS[w].returned++;

 });


 let list=Object.entries(WS);

 let maxStatus=1;

 list.forEach(function(x){

  maxStatus=Math.max(
   maxStatus,
   x[1].issue,
   x[1].replacement,
   x[1].returned
  );

 });


 $("workshopDashboard").innerHTML=

 list.length?

 list.sort((a,b)=>
  (b[1].issue+b[1].replacement+b[1].returned)-
  (a[1].issue+a[1].replacement+a[1].returned)
 ).map(function(x){

  return `
  <div class="wc-status">

   <div class="wc-status-name">
    ${esc(x[0])}
   </div>

   <div class="wc-status-item">
    <span>Pending to Issue</span>
    <b>${x[1].issue}</b>
   </div>

   <div class="mini-bar">
    <i style="width:${x[1].issue/maxStatus*100}%"></i>
   </div>

   <div class="wc-status-item">
    <span>Replacement Pending</span>
    <b>${x[1].replacement}</b>
   </div>

   <div class="mini-bar replacement-bar">
    <i style="width:${x[1].replacement/maxStatus*100}%"></i>
   </div>

   <div class="wc-status-item">
    <span>TX Return Pending</span>
    <b>${x[1].returned}</b>
   </div>

   <div class="mini-bar return-bar">
    <i style="width:${x[1].returned/maxStatus*100}%"></i>
   </div>

  </div>`;

 }).join("")

 :

 "No pending data";


 /* ================= AGEING WORKSHOP ================= */

 let AGE={};

 month.forEach(function(x){

  let w=clean(x[1])||"OTHER";

  if(!AGE[w]){
   AGE[w]={
    d0:0,
    d1:0,
    d3:0,
    d7:0
   };
  }

  let days=ageDays(x[13]);

  if(days===0)
   AGE[w].d0++;

  else if(days===1)
   AGE[w].d1++;

  else if(days>1 && days<=3)
   AGE[w].d3++;

  else if(days>3 && days<=7)
   AGE[w].d7++;

 });


 $("ageingDashboard").innerHTML=

 Object.entries(AGE).map(function(x){

  return `
  <div class="ageing-row">

   <div class="ageing-name">
    ${esc(x[0])}
   </div>

   <div class="ageing-grid">

    <div class="age-box">
     <span>0 Day</span>
     <strong>${x[1].d0}</strong>
    </div>

    <div class="age-box">
     <span>1 Day</span>
     <strong>${x[1].d1}</strong>
    </div>

    <div class="age-box">
     <span>&gt;1 Day</span>
     <strong>${x[1].d3}</strong>
    </div>

    <div class="age-box">
     <span>&gt;3 Days</span>
     <strong>${x[1].d7}</strong>
    </div>

    <div class="age-box">
     <span>&gt;7 Days</span>
     <strong>${month.filter(y=>
      (clean(y[1])||"OTHER")===x[0] &&
      ageDays(y[13])>7
     ).length}</strong>
    </div>

   </div>

  </div>`;

 }).join("");


 /* ================= WORKSHOP CAPACITY ================= */

 let WC={};

 month.forEach(function(x){

  if(!clean(x[17])){

   let w=clean(x[1])||"OTHER";
   let c=clean(x[9])||"Unknown";

   if(!WC[w])WC[w]={};

   WC[w][c]=(WC[w][c]||0)+1;
  }

 });


 $("workshopCapacityDashboard").innerHTML=

 Object.entries(WC)
 .sort((a,b)=>
  Object.values(b[1]).reduce((s,v)=>s+v,0)-
  Object.values(a[1]).reduce((s,v)=>s+v,0)
 )
 .map(function(x){

  return `
  <div class="wc-row">

   <div class="wc-name">
    ${esc(x[0])}
   </div>

   <div class="wc-capacity">

    ${Object.entries(x[1])
     .sort((a,b)=>
      (parseFloat(a[0])||0)-
      (parseFloat(b[0])||0)
     )
     .map(function(c){

      return `
      <div class="wc-chip">
       ${esc(c[0])} kVA
       <strong>${c[1]}</strong>
      </div>`;

     }).join("")}

   </div>

  </div>`;

 }).join("");

}


/* ================= SEARCH ================= */

function searchRecords(){

 let input=$("searchInput");

 let q=norm(input.value);

 if(!q){

  $("results").innerHTML="";
  return;
 }

 let found=ALL.filter(x=>
  x.__search.includes(q)
 );

 if(!found.length){

  $("results").innerHTML=
   `<div class="no-results">
    No record found
   </div>`;

  return;
 }

 $("results").innerHTML=
  `<div class="result-count">
   ${found.length} record(s) found
  </div>`+
  found.map((x,i)=>
   buildCard(x,i+1)
  ).join("");

}


/* ================= CARD ================= */

function buildCard(x,no){

 let issue=clean(x[17]);
 let replacement=clean(x[20]);

 let status="";

 /* IMPORTANT:
    INSTALLATION ONLY WHEN REPLACEMENT DATE EXISTS
 */

 if(replacement){

  status=`
  <div class="status-box status-installed">

   <strong>
    ✓ Congratulations Your Transformer Installed
   </strong>

   Replacement Date:
   ${esc(replacement)}

  </div>`;

 }

 else if(issue){

  status=`
  <div class="status-box status-issued">

   <strong>
    ✓ Your Transformer Issued by Workshop
   </strong>

   Please Contact Driver for Installation

   <div>Issue Date: ${esc(issue)}</div>

   ${clean(x[18])?
    `<div>Driver: ${esc(x[18])}</div>`:""}

   ${clean(x[19])?
    `<div>Mobile: ${esc(x[19])}</div>
     ${driverButtons(x)}`:""}

  </div>`;

 }

 else{

  status=`
  <div class="status-box status-pending">

   <strong>
    ⚠ Transformer Pending to Issue
   </strong>

  </div>`;

 }


 /* ================= REPEAT DAMAGE ================= */

 let loc=locationKey(x[7]);
 let cap=capacityKey(x[9]);

 let history=ALL.filter(y=>
  locationKey(y[7])===loc &&
  capacityKey(y[9])===cap
 );

 history.sort(function(a,b){

  let da=parseDate(a[13])||parseDate(a[6])||new Date(0);
  let db=parseDate(b[13])||parseDate(b[6])||new Date(0);

  return da-db;
 });


 let frequency="";

 if(history.length===1){

  frequency=`
  <div class="damage-frequency">

   <div class="damage-title">
    ✓ No Repeat Damage
   </div>

   <div class="damage-subtitle">
    Only 1 damage at same place and same capacity
   </div>

  </div>`;

 }else{

  frequency=`
  <div class="damage-frequency">

   <div class="damage-title">
    🔄 ${history.length} Times Damage
   </div>

   <div class="damage-subtitle">
    Same Place + Same Capacity
   </div>

   ${history.map(function(y,i){

    let suffix=
     i===0?"st":
     i===1?"nd":
     i===2?"rd":"th";

    return `
    <div class="history-item">

     <div class="history-number">
      ${i+1}${suffix} Time
     </div>

     <div>
      PR No: ${esc(y[12]||"-")}
     </div>

     <div>
      PR Date: ${esc(y[13]||"-")}
     </div>

     <div>
      Capacity: ${esc(y[9]||"-")} kVA
     </div>

    </div>`;

   }).join("")}

  </div>`;

 }


 /* ================= DATA ================= */

 let names=[
  "SN","Workshop","Division","Subdivision","Substation",
  "Feeder","Date of Damage","Place of Damage","DID No",
  "Capacity","Complaint Number","Complaint Date","PR No",
  "PR Date","JE Name","JE Mobile","Issued to Firm","Issue Date",
  "Driver Name","Driver Mobile","Replacement Date","Time",
  "TX Return Date","Observation DTC"
 ];

 let data="";

 names.forEach(function(name,i){

  if(!clean(x[i]))return;

  data+=`
  <div class="data-row">

   <div class="data-label">${name}</div>

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

  ${frequency}

  <div class="data-section">
   ${data}
  </div>

 </div>`;

}


/* ================= DRIVER ================= */

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
     href="https://wa.me/${phone}?text=${encodeURIComponent(message)}">
   💬 WHATSAPP
  </a>

 </div>`;

}


/* ================= START ================= */

document.addEventListener("DOMContentLoaded",function(){

 const input=$("searchInput");

 /*
  IMPORTANT:
  Do NOT recreate/replace the input while typing.
  This prevents Android Chrome from stopping after
  the first digit.
 */

 input.addEventListener("input",function(){

  clearTimeout(searchTimer);

  searchTimer=setTimeout(function(){

   searchRecords();

  },120);

 });


 $("searchBtn").addEventListener("click",function(){

  searchRecords();

  input.focus();

 });


 input.addEventListener("keydown",function(e){

  if(e.key==="Enter"){
   e.preventDefault();
   searchRecords();
  }

 });


 loadSheet();

});