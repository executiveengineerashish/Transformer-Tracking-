const SHEET_ID="1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";
const GID="1464518527";

let DATA=[];
let HISTORY={};

const C={
 W:1,D:2,SD:3,SS:4,F:5,
 DAMAGE:6,PLACE:7,DID:8,CAP:9,
 COMPLAINT:10,COMPLAINT_DATE:11,
 PR:12,PR_DATE:13,
 JE:14,JE_MOBILE:15,
 FIRM:16,ISSUE:17,
 DRIVER:18,MOBILE:19,
 REPLACE:20,TIME:21,
 RETURN:22,OBS:23
};

const $=id=>document.getElementById(id);

function text(v){
 return String(v??"").trim();
}

function norm(v){
 return text(v)
  .toLowerCase()
  .replace(/[\s\-\/\\().,\[\]{}:;_]+/g,"");
}

/* Location:
   SISREDI
   SISREDI 1
   1 SISREDI
   SISREDI (25)
   all treated as same
*/

function location(v){
 return norm(text(v).replace(/[0-9]/g,""));
}

function capacity(v){
 return text(v)
  .toLowerCase()
  .replace(/kva/g,"")
  .replace(/[^0-9.]/g,"");
}

function date(v){

 if(!text(v)) return null;

 let s=text(v);

 let m=s.match(
   /Date\((\d+),(\d+),(\d+)/
 );

 if(m)
   return new Date(+m[1],+m[2],+m[3]);

 m=s.match(
   /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/
 );

 if(m)
   return new Date(
     +m[3],+m[2]-1,+m[1]
   );

 let d=new Date(s);

 return isNaN(d)?null:d;
}

function currentMonth(v){

 let d=date(v);
 let n=new Date();

 return d &&
   d.getMonth()==n.getMonth() &&
   d.getFullYear()==n.getFullYear();
}


/* ================= LOAD DATA ================= */

function load(){

 window.sheetLoaded=function(response){

  try{

   DATA=[];

   response.table.rows.forEach(
    (row,i)=>{

     if(i==0)return;

     let r=[];

     for(let j=0;j<24;j++){

      let c=row.c?.[j];

      r.push(
       c?.f ??
       c?.v ??
       ""
      );

     }

     if(r.some(x=>text(x))){

      r._row=i+4;
      r._search=norm(r.join(" "));

      DATA.push(r);

     }

    }
   );

   makeHistory();

   dashboard();

   $("status").textContent=
    DATA.length.toLocaleString("en-IN")+
    " transformer records loaded • Search ready";

  }
  catch(e){

   console.error(e);

   $("status").textContent=
    "Error loading PR SEARCH";

  }

 };

 let url=
  "https://docs.google.com/spreadsheets/d/"+
  SHEET_ID+
  "/gviz/tq"+
  "?gid="+GID+
  "&range=A3:X"+
  "&headers=1"+
  "&tqx=out%3Ajson%3BresponseHandler%3AsheetLoaded"+
  "&_="+Date.now();

 let old=$("sheetScript");

 if(old)old.remove();

 let script=
  document.createElement("script");

 script.id="sheetScript";
 script.src=url;

 script.onerror=()=>{
  $("status").textContent=
   "Google Sheet connection failed";
 };

 document.head.appendChild(script);
}


/* ================= HISTORY ================= */

function makeHistory(){

 HISTORY={};

 DATA.forEach(r=>{

  let l=location(r[C.PLACE]);
  let k=capacity(r[C.CAP]);

  if(!l||!k)return;

  let key=l+"|"+k;

  if(!HISTORY[key])
   HISTORY[key]=[];

  HISTORY[key].push(r);

 });

 Object.values(HISTORY).forEach(a=>{
  a.sort(
   (x,y)=>
    (date(x[C.PR_DATE])||0)-
    (date(y[C.PR_DATE])||0)
  );
 });

}


/* ================= STATUS ================= */

function getStatus(r){

 if(!text(r[C.ISSUE]))
  return "pending";

 if(!text(r[C.REPLACE]))
  return "issue";

 if(!text(r[C.RETURN]))
  return "return";

 return "done";
}


/* ================= DASHBOARD ================= */

function dashboard(){

 let total=0;
 let issued=0;
 let pending=0;
 let replacement=0;
 let ret=0;

 let a24=0;
 let a72=0;
 let a168=0;

 DATA.forEach(r=>{

  /* Dashboard uses PR DATE */

  if(!currentMonth(r[C.PR_DATE]))
   return;

  total++;

  let st=getStatus(r);

  if(st!="pending")
   issued++;

  if(st=="pending")
   pending++;

  if(st=="issue"){

   replacement++;

   let d=date(r[C.ISSUE]);

   if(d){

    let h=
     (Date.now()-d.getTime())/
     3600000;

    if(h>24)a24++;
    if(h>72)a72++;
    if(h>168)a168++;

   }

  }

  if(st=="return")
   ret++;

 });

 $("total").textContent=total;
 $("issued").textContent=issued;
 $("pending").textContent=pending;
 $("replacement").textContent=replacement;
 $("return").textContent=ret;

 $("a24").textContent=a24;
 $("a72").textContent=a72;
 $("a168").textContent=a168;

 $("month").textContent=
  new Date().toLocaleString(
   "en-IN",
   {
    month:"long",
    year:"numeric"
   }
  );

}


/* ================= SEARCH ================= */

$("search").addEventListener(
 "input",
 function(){

  let q=norm(this.value);

  if(!q){

   $("results").innerHTML="";
   return;

  }

  let found=
   DATA.filter(
    r=>r._search.includes(q)
   );

  show(found);

 }
);


/* ================= SHOW RESULTS ================= */

function show(records){

 if(!records.length){

  $("results").innerHTML=
   `<div class="no-result">
     No record found
   </div>`;

  return;

 }

 $("results").innerHTML=
  `<div class="result-count">
    ${records.length} record(s) found
   </div>`+
  records.map(
   (r,i)=>card(r,i+1)
  ).join("");

}


/* ================= CARD ================= */

function card(r,no){

 let st=getStatus(r);

 let statusHTML="";

 if(st=="done"){

  statusHTML=
   `<div class="status done">
    <strong>
     Congratulations Your Transformer Installed
    </strong>
    Replacement Date:
    ${text(r[C.REPLACE])}
   </div>`;

 }

 else if(st=="issue"){

  statusHTML=
   `<div class="status issue">
    <strong>
     Your Transformer Issued by Workshop
    </strong>

    Please Contact Driver for Installation

    <div class="driver">
     Issue Date: ${text(r[C.ISSUE])}
    </div>

    <div class="driver">
     Driver: ${text(r[C.DRIVER])||"-"}
    </div>

    <div class="driver">
     Mobile: ${text(r[C.MOBILE])||"-"}
    </div>

    ${driverButtons(r)}

   </div>`;

 }

 else if(st=="return"){

  statusHTML=
   `<div class="status return">
    <strong>
     Transformer Installed
    </strong>
    TX Return Pending
    <div>
     Replacement Date:
     ${text(r[C.REPLACE])}
    </div>
   </div>`;

 }

 else{

  statusHTML=
   `<div class="status pending">
    <strong>
     Transformer Pending to Issue
    </strong>
   </div>`;

 }


 /* Repeated damage */

 let key=
  location(r[C.PLACE])+
  "|"+
  capacity(r[C.CAP]);

 let history=
  HISTORY[key]||[];

 let repeat="";

 if(history.length>1){

  repeat=
   `<div class="repeat">

    <div class="repeat-title">
     🔁 It Damaged ${history.length} times
    </div>

    <div>
     Please Ensure Increasing Capacity if Overloaded
    </div>

    ${history.map(x=>
     `<div class="history">
       PR: <b>${text(x[C.PR])||"-"}</b>
       &nbsp; | &nbsp;
       Date: ${text(x[C.PR_DATE])||"-"}
       &nbsp; | &nbsp;
       Capacity: <b>${text(x[C.CAP])||"-"} kVA</b>
      </div>`
    ).join("")}

   </div>`;

 }


 let fields=[
  ["Workshop",C.W],
  ["Division",C.D],
  ["Subdivision",C.SD],
  ["Substation",C.SS],
  ["Feeder",C.F],
  ["Date of Damage",C.DAMAGE],
  ["Place of Damage",C.PLACE],
  ["DID No",C.DID],
  ["Capacity",C.CAP],
  ["Complaint Number",C.COMPLAINT],
  ["Complaint Date",C.COMPLAINT_DATE],
  ["PR No",C.PR],
  ["PR Date",C.PR_DATE],
  ["JE Name",C.JE],
  ["JE Mobile",C.JE_MOBILE],
  ["Issued to Firm",C.FIRM],
  ["Issue Date",C.ISSUE],
  ["Driver Name",C.DRIVER],
  ["Driver Mobile",C.MOBILE],
  ["Replacement Date",C.REPLACE],
  ["Time",C.TIME],
  ["TX Return Date",C.RETURN],
  ["Observation DTC",C.OBS]
 ];

 let html=fields.map(f=>{

  if(!text(r[f[1]]))
   return "";

  return `
   <div class="row">
    <div class="label">${f[0]}</div>
    <div class="value">${text(r[f[1]])}</div>
   </div>`;

 }).join("");


 return `
  <div class="card">

   <div class="card-title">
    #${no} • Sheet Row ${r._row}
   </div>

   ${statusHTML}

   ${repeat}

   ${html}

  </div>`;
}


/* ================= DRIVER ================= */

function driverButtons(r){

 let phone=
  text(r[C.MOBILE])
   .replace(/[^\d+]/g,"");

 let msg=
`Namaste ${text(r[C.DRIVER])||"Driver"} ji,

Transformer PR No.: ${text(r[C.PR])||"-"}
Capacity: ${text(r[C.CAP])||"-"} kVA
Place: ${text(r[C.PLACE])||"-"}

Transformer has been issued from Workshop. Please arrange installation and confirm installation status.

Thank you.`;

 return `
  <div class="buttons">

   <a
    class="call"
    href="tel:${phone}">
    📞 CALL DRIVER
   </a>

   <a
    class="whatsapp"
    target="_blank"
    href="https://wa.me/${phone}?text=${encodeURIComponent(msg)}">
    💬 WHATSAPP
   </a>

  </div>`;
}


/* ================= START ================= */

load();