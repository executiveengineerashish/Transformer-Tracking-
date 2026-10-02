const SHEET_ID="1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";
const SHEET_GID="1464518527";

let ALL=[];
let timer=null;

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


/* LOCATION NORMALIZATION */

function locationKey(x){

 return norm(
  String(x??"")
  .replace(/[0-9]+/g," ")
  .replace(/[\(\)\[\]\{\}]/g," ")
 );

}


/* CAPACITY */

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


function currentMonth(x){

 let d=parseDate(x);
 let n=new Date();

 return d &&
 d.getFullYear()===n.getFullYear() &&
 d.getMonth()===n.getMonth();

}


/* LOAD */

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

    if(!a.some(clean))
     return;

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

 if(old)
  old.remove();


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

  $("searchStatus").classList.add("error");

 };

 document.head.appendChild(script);

}


/* DASHBOARD */

function buildDashboard(){

 if(!ALL.length)return;

 let month=
  ALL.filter(x=>currentMonth(x[13]));

 let issued=0;
 let pending=0;
 let replacement=0;
 let returned=0;


/* STATUS */

 month.forEach(function(x){

  let issue=clean(x[17]);
  let replace=clean(x[20]);
  let ret=clean(x[22]);

  if(!issue){

   pending++;

  }else{

   issued++;

   if(!replace)
    replacement++;

   else if(!ret)
    returned++;

  }

 });


 $("dashTotal").textContent=month.length;
 $("dashIssued").textContent=issued;
 $("dashPending").textContent=pending;
 $("dashReplacement").textContent=replacement;
 $("dashReturn").textContent=returned;


 let n=new Date();

 $("dashboardMonth").textContent=
  n.toLocaleString("en-IN",{
   month:"long",
   year:"numeric"
  });


/* WORKSHOP */

 let W={};

 month.forEach(function(x){

  if(!clean(x[17])){

   let w=clean(x[1])||"OTHER";

   W[w]=(W[w]||0)+1;

  }

 });


 let list=
  Object.entries(W)
  .sort((a,b)=>b[1]-a[1]);

 let max=list[0]?.[1]||1;


 $("workshopDashboard").innerHTML=

 list.length?

 list.map(function(x){

  let width=x[1]/max*100;

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

 }).join("")

 :

 `<div class="no-dashboard-data">
   No pending transformer
  </div>`;

}


/* SEARCH */

function searchRecords(){

 let q=norm(
  $("searchInput").value
 );

 if(!q){

  $("results").innerHTML="";
  return;

 }


 let found=
  ALL.filter(x=>
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
   ${found.length.toLocaleString("en-IN")}
   records found
  </div>`+

 found.map((x,i)=>
  buildCard(x,i+1)
 ).join("");

}


/* CARD */

function buildCard(x,no){

 let issue=clean(x[17]);
 let replacement=clean(x[20]);


 let status="";


 /* ONLY U = REPLACEMENT DATE */

 if(replacement){

  status=`

  <div class="status-box status-installed">

   <strong>
    ✓ Congratulations Your Transformer Installed
   </strong>

   Replacement Date:
   ${escapeHTML(replacement)}

  </div>`;

 }


 else if(issue){

  status=`

  <div class="status-box status-issued">

   <strong>
    ✓ Your Transformer Issued by Workshop
   </strong>

   Please Contact Driver for Installation

   <div>
    Issue Date: ${escapeHTML(issue)}
   </div>

   ${clean(x[18])?
    `<div>
      Driver: ${escapeHTML(x[18])}
     </div>`:""}

   ${clean(x[19])?
    `<div>
      Mobile: ${escapeHTML(x[19])}
     </div>
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


 /* REPEATED DAMAGE
    ONLY SHOWN INSIDE SEARCH RESULT
 */

 let location=locationKey(x[7]);
 let capacity=capacityKey(x[9]);

 let history=
  ALL.filter(y=>
   locationKey(y[7])===location &&
   capacityKey(y[9])===capacity
  );


 history.sort((a,b)=>{

  let da=parseDate(a[13])||parseDate(a[6])||new Date(0);
  let db=parseDate(b[13])||parseDate(b[6])||new Date(0);

  return da-db;

 });


 let repeated="";


 if(history.length>1){

  repeated=`

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
      PR No: ${escapeHTML(y[12]||"-")}
     </div>

     <div>
      Date: ${escapeHTML(
       y[13]||y[6]||"-"
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


 /* DATA */

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

  if(!clean(x[i]))return;

  data+=`

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

   <span>#${no}</span>

   <span>Row ${x.__row}</span>

  </div>

  ${status}

  ${repeated}

  <div class="data-section">
   ${data}
  </div>

 </div>`;

}


/* DRIVER */

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


/* START */

document.addEventListener(
 "DOMContentLoaded",
 function(){

  $("searchBtn").onclick=
   searchRecords;


  $("searchInput").oninput=
   function(){

    clearTimeout(timer);

    timer=setTimeout(
     searchRecords,
     60
    );

   };


  $("searchInput").onkeydown=
   function(e){

    if(e.key==="Enter")
     searchRecords();

   };


  loadSheet();

 }
);