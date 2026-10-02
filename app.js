const SHEET_ID="1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";
const SHEET_GID="1464518527";

let ALL=[];
let timer=null;


/* ================= BASIC ================= */

const $=id=>document.getElementById(id);

const clean=x=>String(x??"").trim();

const norm=x=>
 String(x??"")
 .toLowerCase()
 .replace(/[\s\-\/\\().,\[\]{}:;_]+/g,"");

function escapeHTML(x){
 return String(x??"")
 .replace(/&/g,"&amp;")
 .replace(/</g,"&lt;")
 .replace(/>/g,"&gt;")
 .replace(/"/g,"&quot;")
 .replace(/'/g,"&#039;");
}


/* ================= LOCATION ================= */

function locationKey(x){

 return norm(
   String(x??"")
   .replace(/[0-9]+/g," ")
   .replace(/[\(\)\[\]\{\}]/g," ")
 );

}


/* ================= CAPACITY ================= */

function capacityKey(x){

 return String(x??"")
 .toLowerCase()
 .replace(/kva/g,"")
 .replace(/[^0-9.]/g,"")
 .trim();

}


/* ================= DATE ================= */

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


function sameMonth(x){

 let d=parseDate(x);
 let n=new Date();

 return d &&
 d.getFullYear()===n.getFullYear() &&
 d.getMonth()===n.getMonth();
}


/* ================= LOAD SHEET ================= */

function loadSheet(){

 const status=$("searchStatus");

 if(status)
  status.textContent="Loading transformer records...";

 const callback="transformer_"+Date.now();

 window[callback]=function(response){

  try{

   const rows=response.table.rows||[];

   ALL=[];

   /*
    A:X = 24 columns

    IMPORTANT:
    gviz range A3:X with headers=1
    returns row 4 as first data row.
   */

   rows.forEach(function(row,index){

    let record=[];

    for(let i=0;i<24;i++){

     let cell=row.c?.[i];

     if(!cell){
      record.push("");
      continue;
     }

     record.push(
      cell.f!==undefined?
      String(cell.f):
      cell.v!==undefined?
      String(cell.v):
      ""
     );

    }

    if(!record.some(clean))
     return;

    record.__row=index+4;

    record.__search=norm(record.join(" "));

    ALL.push(record);

   });


   buildDashboard();

   if(status){

    status.textContent=
     ALL.length.toLocaleString("en-IN")+
     " transformer records loaded • Search ready";

   }

  }catch(error){

   console.error(error);

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


 const old=$("googleSheetScript");

 if(old)
  old.remove();


 const script=document.createElement("script");

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

  if(status){

   status.textContent=
    "Google Sheet connection failed. Refresh page.";

   status.classList.add("error");

  }

 };

 document.head.appendChild(script);

}


/* ================= DASHBOARD ================= */

function buildDashboard(){

 if(!ALL.length)return;

 const now=new Date();


 /* CURRENT MONTH = PR DATE N = index 13 */

 const monthRecords=
  ALL.filter(x=>sameMonth(x[13]));


 /* STATUS */

 let issued=0;
 let pendingIssue=0;
 let replacementPending=0;
 let returnPending=0;

 monthRecords.forEach(function(x){

  const issue=clean(x[17]);       // R
  const replacement=clean(x[20]); // U
  const returned=clean(x[22]);    // W

  if(!issue){

   pendingIssue++;

  }else{

   issued++;

   if(!replacement){

    replacementPending++;

   }else if(!returned){

    returnPending++;

   }

  }

 });


 if($("dashTotal"))
  $("dashTotal").textContent=monthRecords.length;

 if($("dashIssued"))
  $("dashIssued").textContent=issued;

 if($("dashPending"))
  $("dashPending").textContent=pendingIssue;

 if($("dashReplacement"))
  $("dashReplacement").textContent=replacementPending;

 if($("dashReturn"))
  $("dashReturn").textContent=returnPending;


 if($("dashboardMonth"))
  $("dashboardMonth").textContent=
   now.toLocaleString("en-IN",{
    month:"long",
    year:"numeric"
   });


 /* ================= WORKSHOP ================= */

 let workshop={};

 monthRecords.forEach(function(x){

  if(!clean(x[17])){

   let w=clean(x[1])||"OTHER";

   workshop[w]=(workshop[w]||0)+1;

  }

 });

 let wlist=
  Object.entries(workshop)
  .sort((a,b)=>b[1]-a[1]);

 let wmax=wlist[0]?.[1]||1;

 if($("workshopDashboard")){

  $("workshopDashboard").innerHTML=
   wlist.map(function(x){

    let width=(x[1]/wmax)*100;

    return `
    <div class="dashboard-row">

     <div class="dashboard-row-title">
      <span>${escapeHTML(x[0])}</span>
      <span>${x[1]}</span>
     </div>

     <div class="dashboard-bar-bg">
      <div class="dashboard-bar"
           style="width:${width}%">
      </div>
     </div>

    </div>`;

   }).join("")||

   `<div class="no-dashboard-data">
     No pending transformer
    </div>`;

 }


 /* ================= CAPACITY ================= */

 let capacity={};

 monthRecords.forEach(function(x){

  if(!clean(x[17])){

   let c=clean(x[9])||"Unknown";

   capacity[c]=(capacity[c]||0)+1;

  }

 });

 if($("capacityDashboard")){

  let list=
   Object.entries(capacity)
   .sort((a,b)=>{
    let aa=parseFloat(a[0])||0;
    let bb=parseFloat(b[0])||0;
    return aa-bb;
   });

  $("capacityDashboard").innerHTML=
   `<div class="capacity-grid">`+

   list.map(function(x){

    return `
    <div class="capacity-box">

     <span>${escapeHTML(x[0])} kVA</span>

     <strong>${x[1]}</strong>

    </div>`;

   }).join("")+

   `</div>`;

 }


 /* ================= AGEING ================= */

 let age24=0;
 let age72=0;
 let age7=0;

 monthRecords.forEach(function(x){

  if(!clean(x[17])){

   let d=parseDate(x[13]);

   if(!d)return;

   let days=
    (now.getTime()-d.getTime())/
    86400000;

   if(days>1)age24++;
   if(days>3)age72++;
   if(days>7)age7++;

  }

 });


 if($("ageingDashboard")){

  $("ageingDashboard").innerHTML=`

  <div class="ageing-grid">

   <div class="ageing-box">
    <div>&gt; 1 Day</div>
    <strong>${age24}</strong>
   </div>

   <div class="ageing-box">
    <div>&gt; 3 Days</div>
    <strong>${age72}</strong>
   </div>

   <div class="ageing-box">
    <div>&gt; 7 Days</div>
    <strong>${age7}</strong>
   </div>

  </div>`;

 }


 /* ================= TODAY ACTION ================= */

 if($("action24"))
  $("action24").textContent=age24;

 if($("action72"))
  $("action72").textContent=age72;

 if($("action7"))
  $("action7").textContent=age7;


 /* ================= REPEATED DAMAGE ================= */

 let groups={};

 ALL.forEach(function(x){

  let location=locationKey(x[7]);
  let capacity=capacityKey(x[9]);

  if(!location||!capacity)return;

  let key=location+"|"+capacity;

  if(!groups[key])
   groups[key]=[];

  groups[key].push(x);

 });


 let repeated=
  Object.values(groups)
  .filter(x=>x.length>1)
  .sort((a,b)=>b.length-a.length);


 if($("repeatedDashboard")){

  $("repeatedDashboard").innerHTML=

   repeated.length?

   repeated.map(function(x){

    return `
    <div class="repeated-dashboard-item">

     <div class="repeated-dashboard-title">
      🔄 ${escapeHTML(x[0][7])}
      — ${x.length} Times
     </div>

     <div class="repeated-dashboard-detail">
      Capacity:
      <b>${escapeHTML(x[0][9])} kVA</b>
     </div>

    </div>`;

   }).join(""):

   `<div class="no-dashboard-data">
     No repeated damage found
    </div>`;

 }

}


/* ================= SEARCH ================= */

function searchRecords(){

 const input=$("searchInput");

 const results=$("results");

 if(!input||!results)return;

 const q=norm(input.value);

 if(!q){

  results.innerHTML="";
  return;

 }


 const found=
  ALL.filter(x=>
   x.__search.includes(q)
  );


 if(!found.length){

  results.innerHTML=
   `<div class="no-results">
     No record found
    </div>`;

  return;

 }


 results.innerHTML=
  `<div class="result-count">
    ${found.length.toLocaleString("en-IN")}
    records found
   </div>`+

  found.map(function(x,i){

   return buildCard(x,i+1);

  }).join("");

}


/* ================= CARD ================= */

function buildCard(x,number){

 /*
 A SN
 B Workshop
 C Division
 D Subdivision
 E Substation
 F Feeder
 G Date of Damage
 H Place
 I DID
 J Capacity
 K Complaint
 L Complaint Date
 M PR No
 N PR Date
 O JE
 P JE Mobile
 Q Firm
 R Issue Date
 S Driver
 T Driver Mobile
 U Replacement Date
 V Time
 W TX Return
 X Observation
 */


 const issue=clean(x[17]);
 const replacement=clean(x[20]);
 const returned=clean(x[22]);


 let statusHTML="";


 /* IMPORTANT:
    CONGRATULATIONS ONLY IF U / REPLACEMENT DATE EXISTS
 */

 if(replacement){

  statusHTML=`

  <div class="status-box status-installed">

   <strong>
    ✓ Congratulations Your Transformer Installed
   </strong>

   <div>
    Replacement Date:
    ${escapeHTML(replacement)}
   </div>

  </div>`;

 }

 else if(issue){

  statusHTML=`

  <div class="status-box status-issued">

   <strong>
    ✓ Your Transformer Issued by Workshop
   </strong>

   <div>
    Please Contact Driver for Installation
   </div>

   <div>
    Issue Date:
    ${escapeHTML(issue)}
   </div>

   ${clean(x[18])?
    `<div>
      Driver:
      ${escapeHTML(x[18])}
     </div>`:""}

   ${clean(x[19])?
    `<div>
      Mobile:
      ${escapeHTML(x[19])}
     </div>

     ${driverButtons(x)}`:""}

  </div>`;

 }

 else{

  statusHTML=`

  <div class="status-box status-pending">

   <strong>
    ⚠ Transformer Pending to Issue
   </strong>

  </div>`;

 }


 /* ================= REPEATED ================= */

 const location=
  locationKey(x[7]);

 const capacity=
  capacityKey(x[9]);


 let history=
  ALL.filter(function(y){

   return locationKey(y[7])===location &&
          capacityKey(y[9])===capacity;

  });


 history.sort(function(a,b){

  let da=
   parseDate(a[13])||
   parseDate(a[6])||
   new Date(0);

  let db=
   parseDate(b[13])||
   parseDate(b[6])||
   new Date(0);

  return da-db;

 });


 let repeatedHTML="";


 if(history.length>1){

  repeatedHTML=`

  <div class="repeated-box">

   <div class="repeated-title">
    ⚠ It Damaged ${history.length} times
   </div>

   <div class="repeated-warning">
    Please Ensure Increasing Capacity if Overloaded
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
      PR No:
      ${escapeHTML(y[12]||"-")}
     </div>

     <div>
      Date:
      ${escapeHTML(
       y[13]||
       y[6]||
       "-"
      )}
     </div>

     <div>
      Capacity:
      ${escapeHTML(y[9]||"-")} kVA
     </div>

    </div>`;

   }).join("")}

  </div>`;

 }


 /* ================= DATA ================= */

 const names=[
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


 let dataHTML="";


 names.forEach(function(name,i){

  if(!clean(x[i]))return;

  dataHTML+=`

  <div class="data-row">

   <div class="data-label">
    ${name}
   </div>

   <div class="data-value">
    ${escapeHTML(x[i])}
   </div>

  </div>`;

 });


 return `

 <div class="result-card">

  <div class="card-top">

   <span>
    #${number}
   </span>

   <span>
    Row ${x.__row}
   </span>

  </div>

  ${statusHTML}

  ${repeatedHTML}

  <div class="data-section">

   ${dataHTML}

  </div>

 </div>`;

}


/* ================= DRIVER BUTTONS ================= */

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

The transformer has been issued from Workshop. Please arrange installation and confirm the installation status.

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


/* ================= START ================= */

document.addEventListener("DOMContentLoaded",function(){

 const input=$("searchInput");

 const button=$("searchBtn");


 if(button){

  button.addEventListener(
   "click",
   searchRecords
  );

 }


 if(input){

  input.addEventListener(
   "keydown",
   function(e){

    if(e.key==="Enter")
     searchRecords();

   }
  );


  input.addEventListener(
   "input",
   function(){

    clearTimeout(timer);

    timer=setTimeout(
     searchRecords,
     70
    );

   }
  );

 }


 loadSheet();

});