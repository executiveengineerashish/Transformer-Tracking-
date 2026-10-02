const SID="1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";
const GID="1464518527";

let DATA=[];
let HISTORY={};

const C={
W:1,D:2,SD:3,SS:4,F:5,
DAMAGE:6,PLACE:7,DID:8,CAP:9,
COMPLAINT:10,COMPLAINTDATE:11,
PR:12,PRDATE:13,
JE:14,JEMOBILE:15,
FIRM:16,ISSUE:17,
DRIVER:18,MOBILE:19,
REPLACE:20,TIME:21,RETURN:22,OBS:23
};

const $=id=>document.getElementById(id);

function s(v){
return String(v??"").trim();
}

function norm(v){
return s(v).toLowerCase()
.replace(/[\s\-\/\\().,\[\]{}:;_]+/g,"");
}

/* Removes numbers from LOCATION only */
function location(v){
return norm(s(v).replace(/[0-9]/g,""));
}

/* Capacity remains separate */
function capacity(v){
return s(v).toLowerCase()
.replace(/kva/g,"")
.replace(/[^0-9.]/g,"");
}

function parseDate(v){

if(!s(v))return null;

let x=s(v);

let m=x.match(
/Date\((\d+),(\d+),(\d+)/
);

if(m)
return new Date(
+m[1],+m[2],+m[3]
);

m=x.match(
/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/
);

if(m)
return new Date(
+m[3],+m[2]-1,+m[1]
);

let d=new Date(x);

return isNaN(d.getTime())?null:d;
}

function currentMonth(v){

let d=parseDate(v);
let n=new Date();

return d &&
d.getMonth()===n.getMonth() &&
d.getFullYear()===n.getFullYear();
}


/* =========================
   LOAD GOOGLE SHEET
========================= */

function loadData(){

window.transformerData=function(r){

try{

DATA=[];

(r.table.rows||[]).forEach(
(row,i)=>{

if(i===0)return;

let a=[];

for(let j=0;j<24;j++){

let c=row.c&&row.c[j];

a.push(
c&&c.f!=null
?c.f
:c&&c.v!=null
?c.v
:""
);

}

if(a.some(x=>s(x))){

a._row=i+4;
a._search=norm(a.join(" "));

DATA.push(a);

}

});

makeHistory();
makeDashboard();

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

let old=document.getElementById("sheetScript");

if(old)old.remove();

let script=document.createElement("script");

script.id="sheetScript";

script.src=
"https://docs.google.com/spreadsheets/d/"+
SID+
"/gviz/tq?gid="+GID+
"&range=A3:X"+
"&headers=1"+
"&tqx=out%3Ajson%3BresponseHandler%3AtransformerData"+
"&_="+Date.now();

script.onerror=function(){

$("status").textContent=
"Google Sheet connection failed";

};

document.head.appendChild(script);

}


/* =========================
   REPEATED DAMAGE
   PLACE + CAPACITY
========================= */

function makeHistory(){

HISTORY={};

DATA.forEach(r=>{

let place=location(r[C.PLACE]);
let cap=capacity(r[C.CAP]);

if(!place||!cap)return;

let key=place+"|"+cap;

if(!HISTORY[key])
HISTORY[key]=[];

HISTORY[key].push(r);

});

Object.values(HISTORY).forEach(a=>{

a.sort((x,y)=>{

let dx=
parseDate(x[C.PRDATE])||
parseDate(x[C.DAMAGE])||
new Date(0);

let dy=
parseDate(y[C.PRDATE])||
parseDate(y[C.DAMAGE])||
new Date(0);

return dx-dy;

});

});

}


/* =========================
   STATUS
========================= */

function getStatus(r){

if(!s(r[C.ISSUE]))
return"pending";

if(!s(r[C.REPLACE]))
return"issued";

if(!s(r[C.RETURN]))
return"return";

return"done";

}


/* =========================
   DASHBOARD
========================= */

function makeDashboard(){

let total=0;
let issued=0;
let pending=0;
let replacement=0;
let txreturn=0;

let a24=0;
let a72=0;
let a168=0;

DATA.forEach(r=>{

/* CURRENT MONTH BY PR DATE */

if(!currentMonth(r[C.PRDATE]))
return;

total++;

let st=getStatus(r);

if(st!=="pending")
issued++;

if(st==="pending")
pending++;

if(st==="issued"){

replacement++;

let d=parseDate(r[C.ISSUE]);

if(d){

let hours=
(Date.now()-d.getTime())/
3600000;

if(hours>24)a24++;
if(hours>72)a72++;
if(hours>168)a168++;

}

}

if(st==="return")
txreturn++;

});

$("total").textContent=total;
$("issued").textContent=issued;
$("pending").textContent=pending;
$("replacement").textContent=replacement;
$("txreturn").textContent=txreturn;

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


/* =========================
   SEARCH
========================= */

$("search").addEventListener(
"input",
function(){

let q=norm(this.value);

if(!q){

$("results").innerHTML="";
return;

}

let found=DATA.filter(
r=>r._search.includes(q)
);

showResults(found);

});


/* =========================
   RESULTS
========================= */

function showResults(a){

if(!a.length){

$("results").innerHTML=
`<div class="noresult">
No record found
</div>`;

return;

}

$("results").innerHTML=
`<div class="result-count">
${a.length.toLocaleString("en-IN")}
record(s) found
</div>`+
a.map((r,i)=>makeCard(r,i+1)).join("");

}


/* =========================
   CARD
========================= */

function makeCard(r,no){

let st=getStatus(r);

let status="";

if(st==="done"){

status=
`<div class="status installed">

<strong>
Congratulations Your Transformer Installed
</strong>

Replacement Date:
${s(r[C.REPLACE])}

</div>`;

}

else if(st==="issued"){

status=
`<div class="status issued">

<strong>
Your Transformer Issued by Workshop
</strong>

Please Contact Driver for Installation

<div class="driver">
Issue Date: ${s(r[C.ISSUE])}
</div>

<div class="driver">
Driver: ${s(r[C.DRIVER])||"-"}
</div>

<div class="driver">
Mobile: ${s(r[C.MOBILE])||"-"}
</div>

${driverButtons(r)}

</div>`;

}

else if(st==="return"){

status=
`<div class="status return">

<strong>
Transformer Installed
</strong>

TX Return Pending

<div>
Replacement Date:
${s(r[C.REPLACE])}
</div>

</div>`;

}

else{

status=
`<div class="status pending">

<strong>
Transformer Pending to Issue
</strong>

</div>`;

}


/* =========================
   REPEATED DAMAGE
========================= */

let key=
location(r[C.PLACE])+
"|"+
capacity(r[C.CAP]);

let history=
HISTORY[key]||[];

let repeated="";

if(history.length>1){

repeated=
`<div class="repeat">

<div class="repeat-title">
🔁 It Damaged ${history.length} times
</div>

<div>
Please Ensure Increasing Capacity if Overloaded
</div>

${history.map(x=>

`<div class="history">

PR:
<b>${s(x[C.PR])||"-"}</b>

&nbsp; | &nbsp;

Date:
${s(x[C.PRDATE])||"-"}

&nbsp; | &nbsp;

Capacity:
<b>${s(x[C.CAP])||"-"} kVA</b>

</div>`

).join("")}

</div>`;

}


/* =========================
   DATA FIELDS
========================= */

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
["Complaint Date",C.COMPLAINTDATE],

["PR No",C.PR],
["PR Date",C.PRDATE],

["JE Name",C.JE],
["JE Mobile",C.JEMOBILE],

["Issued to Firm",C.FIRM],
["Issue Date",C.ISSUE],

["Driver Name",C.DRIVER],
["Driver Mobile",C.MOBILE],

["Replacement Date",C.REPLACE],
["Time",C.TIME],

["TX Return Date",C.RETURN],
["Observation DTC",C.OBS]

];

let rows=fields.map(f=>{

if(!s(r[f[1]]))
return"";

return`
<div class="row">

<div class="label">
${f[0]}
</div>

<div class="value">
${s(r[f[1]])}
</div>

</div>`;

}).join("");


return`

<div class="card">

<div class="cardno">
#${no} • Sheet Row ${r._row}
</div>

${status}

${repeated}

${rows}

</div>

`;

}


/* =========================
   DRIVER BUTTONS
========================= */

function driverButtons(r){

let phone=
s(r[C.MOBILE])
.replace(/[^\d+]/g,"");

let message=
`Namaste ${s(r[C.DRIVER])||"Driver"} ji,

Transformer PR No.: ${s(r[C.PR])||"-"}
Capacity: ${s(r[C.CAP])||"-"} kVA
Place: ${s(r[C.PLACE])||"-"}
Workshop: ${s(r[C.W])||"-"}

Transformer has been issued from Workshop. Please arrange installation and confirm installation status.

Thank you.`;

return`

<div class="buttons">

<a
class="call"
href="tel:${phone}">
📞 CALL DRIVER
</a>

<a
class="whatsapp"
target="_blank"
href="https://wa.me/${phone}?text=${encodeURIComponent(message)}">
💬 WHATSAPP
</a>

</div>

`;

}


/* =========================
   START
========================= */

loadData();