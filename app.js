const SID="1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";
const GID="1464518527";

let DATA=[],HIST={},FILTERS={};

const C={
W:1,D:2,SD:3,SS:4,F:5,DD:6,PLACE:7,DID:8,CAP:9,
CN:10,CD:11,PR:12,PRD:13,JE:14,JEM:15,FIRM:16,
ISSUE:17,DRIVER:18,MOBILE:19,REP:20,TIME:21,RET:22,OBS:23
};

const $=id=>document.getElementById(id);
const s=v=>String(v??"").trim();
const norm=v=>s(v).toLowerCase().replace(/[\s\-\/\\().,\[\]{}:;_]+/g,"");

function esc(v){
 return s(v).replace(/&/g,"&amp;").replace(/</g,"&lt;")
 .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function loc(v){
 return norm(s(v).replace(/[0-9]/g,""));
}

function cap(v){
 return s(v).toLowerCase().replace(/kva/g,"").replace(/[^0-9.]/g,"");
}

function date(v){
 if(!s(v))return null;
 let x=s(v),m=x.match(/Date\((\d+),(\d+),(\d+)/);
 if(m)return new Date(+m[1],+m[2],+m[3]);
 m=x.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
 if(m)return new Date(+m[3],+m[2]-1,+m[1]);
 m=x.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
 if(m)return new Date(+m[1],+m[2]-1,+m[3]);
 let d=new Date(x);
 return isNaN(d)?null:d;
}

function thisMonth(v){
 let d=date(v),n=new Date();
 return d&&d.getMonth()==n.getMonth()&&d.getFullYear()==n.getFullYear();
}

function status(r){
 if(!s(r[C.ISSUE]))return"PENDING";
 if(!s(r[C.REP]))return"REPLACE";
 if(!s(r[C.RET]))return"RETURN";
 return"DONE";
}


/* ================= LOAD ================= */

function load(){

 let cb="sheetCB";
 window[cb]=r=>{
  try{
   DATA=[];
   (r.table.rows||[]).forEach((row,i)=>{
    if(i==0)return;
    let a=[];
    for(let j=0;j<24;j++){
     let c=row.c?.[j];
     a.push(c?.f??c?.v??"");
    }
    if(a.some(x=>s(x))){
     a.__row=i+4;
     a.__search=norm(a.join(" "));
     DATA.push(a);
    }
   });

   buildHistory();
   dashboard();
   filters();

   $("searchStatus").textContent=
    DATA.length.toLocaleString("en-IN")+" transformer records loaded • Search ready";

  }catch(e){
   console.error(e);
   $("searchStatus").textContent="Error loading PR SEARCH";
  }
 };

 let u="https://docs.google.com/spreadsheets/d/"+SID+
 "/gviz/tq?gid="+GID+
 "&range=A3:X&headers=1&tqx=out%3Ajson%3BresponseHandler%3A"+cb+
 "&_="+Date.now();

 let old=$("sheetScript");
 if(old)old.remove();

 let sc=document.createElement("script");
 sc.id="sheetScript";
 sc.src=u;
 sc.onerror=()=>$("searchStatus").textContent="Google Sheet connection failed";
 document.head.appendChild(sc);
}


/* ================= REPEATED DAMAGE ================= */

function buildHistory(){

 HIST={};

 DATA.forEach(r=>{
  let l=loc(r[C.PLACE]),k=cap(r[C.CAP]);
  if(!l||!k)return;
  let key=l+"|"+k;
  (HIST[key]??=[]).push(r);
 });

 Object.values(HIST).forEach(a=>a.sort((x,y)=>
  (date(x[C.PRD])||new Date(0))-(date(y[C.PRD])||new Date(0))
 ));
}


/* ================= DASHBOARD ================= */

function dashboard(){

 let total=0,issued=0,pending=0,replace=0,ret=0;
 let a24=0,a72=0,a168=0;
 let workshops={},caps={},age=[0,0,0,0];

 DATA.forEach(r=>{

  if(!thisMonth(r[C.PRD]))return;

  total++;

  let st=status(r);

  if(st!="PENDING")issued++;

  if(st=="PENDING"){
   pending++;

   let w=s(r[C.W])||"Workshop Not Available";
   workshops[w]=(workshops[w]||0)+1;

   let c=s(r[C.CAP])||"Unknown";
   caps[c]=(caps[c]||0)+1;

   let d=date(r[C.PRD]);
   if(d){
    let days=Math.floor((Date.now()-d)/86400000);
    if(days<=1)age[0]++;
    else if(days<=3)age[1]++;
    else if(days<=7)age[2]++;
    else age[3]++;
   }
  }

  if(st=="REPLACE"){
   replace++;
   let d=date(r[C.ISSUE]);
   if(d){
    let h=(Date.now()-d)/3600000;
    if(h>24)a24++;
    if(h>72)a72++;
    if(h>168)a168++;
   }
  }

  if(st=="RETURN")ret++;
 });

 set("dashTotal",total);
 set("dashIssued",issued);
 set("dashPending",pending);
 set("dashReplacement",replace);
 set("dashReturn",ret);
 set("age24",a24);
 set("age72",a72);
 set("age168",a168);

 if($("dashboardMonth"))
  $("dashboardMonth").textContent=
   new Date().toLocaleString("en-IN",{month:"long",year:"numeric"});

 let wl=Object.entries(workshops).sort((a,b)=>b[1]-a[1]);
 let mx=wl[0]?.[1]||1;

 if($("workshopDashboard"))
  $("workshopDashboard").innerHTML=wl.length?
   wl.map(x=>`
    <div class="workshop-row">
     <div class="workshop-name-line">
      <span class="workshop-name">${esc(x[0])}</span>
      <span class="workshop-count">${x[1]}</span>
     </div>
     <div class="bar-background">
      <div class="bar-fill" style="width:${Math.max(5,x[1]/mx*100)}%"></div>
     </div>
    </div>`).join("")
   :"<div class='dashboard-loading'>No pending transformer</div>";

 if($("capacityDashboard"))
  $("capacityDashboard").innerHTML=
   Object.entries(caps).sort((a,b)=>b[1]-a[1]).map(x=>
    `<span class="capacity-chip">${esc(x[0])} kVA: <b>${x[1]}</b></span>`
   ).join("")||"<div class='dashboard-loading'>No pending transformer</div>";

 if($("ageingDashboard"))
  $("ageingDashboard").innerHTML=`
   <div class="age-box">0–1 day<b>${age[0]}</b></div>
   <div class="age-box">2–3 days<b>${age[1]}</b></div>
   <div class="age-box">4–7 days<b>${age[2]}</b></div>
   <div class="age-box">&gt;7 days<b>${age[3]}</b></div>`;

 let rep=Object.entries(HIST)
  .filter(x=>x[1].length>1)
  .sort((a,b)=>b[1].length-a[1].length)
  .slice(0,15);

 if($("repeatedDashboard"))
  $("repeatedDashboard").innerHTML=
   rep.map(x=>{
    let r=x[1][0];
    return `<button class="repeated-link" data-repeat="${esc(x[0])}">
     🔁 ${esc(r[C.PLACE])} — ${esc(r[C.CAP])} kVA
     <b>${x[1].length} times</b>
    </button>`;
   }).join("")||"<div class='dashboard-loading'>No repeated damage found</div>";
}

function set(id,v){
 if($(id))$(id).textContent=Number(v).toLocaleString("en-IN");
}


/* ================= FILTERS ================= */

function uniq(c){
 return [...new Set(DATA.map(r=>s(r[c])).filter(Boolean))]
 .sort((a,b)=>a.localeCompare(b));
}

function fill(id,a){
 let e=$(id);
 if(!e)return;
 e.innerHTML="<option value=''>All</option>"+
 a.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
}

function filters(){
 fill("fWorkshop",uniq(C.W));
 fill("fDivision",uniq(C.D));
 fill("fSubdivision",uniq(C.SD));
 fill("fSubstation",uniq(C.SS));
 fill("fCapacity",uniq(C.CAP));
}


/* ================= SEARCH ================= */

function filtered(){

 let q=norm($("searchInput")?.value||"");

 return DATA.filter(r=>{

  if(q&&!r.__search.includes(q))return false;

  if(FILTERS.w&&s(r[C.W])!=FILTERS.w)return false;
  if(FILTERS.d&&s(r[C.D])!=FILTERS.d)return false;
  if(FILTERS.sd&&s(r[C.SD])!=FILTERS.sd)return false;
  if(FILTERS.ss&&s(r[C.SS])!=FILTERS.ss)return false;
  if(FILTERS.cap&&s(r[C.CAP])!=FILTERS.cap)return false;
  if(FILTERS.st&&status(r)!=FILTERS.st)return false;

  return true;
 });
}

function search(){

 let q=$("searchInput")?.value.trim()||"";

 if(!q&&!Object.keys(FILTERS).length){
  $("results").innerHTML="";
  return;
 }

 let a=filtered();

 $("results").innerHTML=a.length?
  `<div class="result-count">${a.length.toLocaleString("en-IN")} record(s) found</div>`+
  a.map((r,i)=>card(r,i+1)).join("")
  :"<div class='no-results'>No record found</div>";
}


/* ================= CARD ================= */

function card(r,n){

 let st=status(r);
 let driver=s(r[C.DRIVER]),mobile=s(r[C.MOBILE]);
 let stat="";

 if(st=="DONE")
  stat=`<div class="status-box installed">
   <strong>Congratulations Your Transformer Installed</strong>
   <div>Replacement Date: ${esc(r[C.REP])}</div>
  </div>`;

 else if(st=="REPLACE")
  stat=`<div class="status-box issued">
   <strong>Your Transformer Issued by Workshop</strong>
   <div>Please Contact Driver for Installation</div>
   <div class="status-detail">Issue Date: ${esc(r[C.ISSUE])}</div>
   ${driver?`<div class="status-detail">Driver: ${esc(driver)}</div>`:""}
   ${mobile?`<div class="status-detail">Mobile: ${esc(mobile)}</div>
   ${buttons(r)}`:""}
  </div>`;

 else if(st=="RETURN")
  stat=`<div class="status-box issued">
   <strong>Transformer Installed</strong>
   <div>TX Return Pending</div>
   <div class="status-detail">Replacement Date: ${esc(r[C.REP])}</div>
  </div>`;

 else
  stat=`<div class="status-box pending">
   <strong>Transformer Pending to Issue</strong>
  </div>`;

 let key=loc(r[C.PLACE])+"|"+cap(r[C.CAP]);
 let h=HIST[key]||[];
 let repeat="";

 if(h.length>1)
  repeat=`<div class="repeated-box">
   <div class="repeated-title">🔁 It Damaged ${h.length} times</div>
   <div class="repeated-warning">
    Please Ensure Increasing Capacity if Overloaded
   </div>
   ${h.map(x=>`
    <div class="history-item">
     <span>PR: <strong>${esc(x[C.PR]||"-")}</strong></span>
     <span>Date: ${esc(x[C.PRD]||x[C.DD]||"-")}</span>
     <span>Capacity: <strong>${esc(x[C.CAP]||"-")} kVA</strong></span>
    </div>`).join("")}
  </div>`;

 let f=[
  ["Workshop",C.W],["Division",C.D],["Subdivision",C.SD],
  ["Substation",C.SS],["Feeder",C.F],["Date of Damage",C.DD],
  ["Place of Damage",C.PLACE],["DID No",C.DID],["Capacity",C.CAP],
  ["Complaint Number",C.CN],["Complaint Date",C.CD],
  ["PR No",C.PR],["PR Date",C.PRD],["JE Name",C.JE],
  ["JE Mobile",C.JEM],["Issued to Firm",C.FIRM],
  ["Issue Date",C.ISSUE],["Driver Name",C.DRIVER],
  ["Driver Mobile",C.MOBILE],["Replacement Date",C.REP],
  ["Time",C.TIME],["TX Return Date",C.RET],
  ["Observation DTC",C.OBS]
 ];

 let data=f.map(x=>s(r[x[1]])?
  `<div class="data-row">
   <div class="data-label">${esc(x[0])}</div>
   <div class="data-value">${esc(r[x[1]])}</div>
  </div>`:"").join("");

 return `<div class="result-card">
  <div class="card-number">#${n} • Sheet Row ${r.__row}</div>
  ${stat}
  ${repeat}
  <div class="data-section">${data}</div>
 </div>`;
}


/* ================= DRIVER BUTTONS ================= */

function buttons(r){

 let p=s(r[C.MOBILE]).replace(/[^\d+]/g,"");
 let msg=`Namaste ${s(r[C.DRIVER])||"Driver"} ji,

Transformer PR No.: ${s(r[C.PR])||"-"}
Capacity: ${s(r[C.CAP])||"-"} kVA
Place: ${s(r[C.PLACE])||"-"}
Workshop: ${s(r[C.W])||"-"}

The transformer has been issued from Workshop. Please arrange installation and confirm the installation status.

Thank you.`;

 return `<div class="driver-buttons">
  <a class="call-driver" href="tel:${p}">📞 CALL DRIVER</a>
  <a class="whatsapp-driver" target="_blank"
   href="https://wa.me/${p}?text=${encodeURIComponent(msg)}">
   💬 WHATSAPP
  </a>
 </div>`;
}


/* ================= FILTER APPLY ================= */

function apply(){

 FILTERS={
  w:$("fWorkshop")?.value||"",
  d:$("fDivision")?.value||"",
  sd:$("fSubdivision")?.value||"",
  ss:$("fSubstation")?.value||"",
  cap:$("fCapacity")?.value||"",
  st:$("fStatus")?.value||""
 };

 Object.keys(FILTERS).forEach(k=>{
  if(!FILTERS[k])delete FILTERS[k];
 });

 $("filterModal")?.classList.add("hidden");
 search();
}


/* ================= INITIALIZE ================= */

document.addEventListener("DOMContentLoaded",()=>{

 $("searchInput")?.addEventListener("input",()=>{
  clearTimeout(searchTimer);
  searchTimer=setTimeout(search,30);
 });

 $("filterBtn")?.addEventListener("click",()=>
  $("filterModal")?.classList.remove("hidden"));

 $("closeFilter")?.addEventListener("click",()=>
  $("filterModal")?.classList.add("hidden"));

 $("applyFilter")?.addEventListener("click",apply);

 $("clearBtn")?.addEventListener("click",()=>{
  FILTERS={};
  if($("searchInput"))$("searchInput").value="";
  search();
 });

 document.querySelectorAll("[data-action='status']")
 .forEach(b=>b.addEventListener("click",()=>{
  FILTERS=b.dataset.value=="ALL"?{}:{st:b.dataset.value};
  search();
 }));

 document.querySelectorAll("[data-action='age']")
 .forEach(b=>b.addEventListener("click",()=>{
  let h=+b.dataset.value;
  let a=DATA.filter(r=>
   status(r)=="REPLACE"&&
   (Date.now()-(date(r[C.ISSUE])||Date.now()))/3600000>h
  );
  $("results").innerHTML=a.length?
   `<div class="result-count">${a.length} record(s) found</div>`+
   a.map((r,i)=>card(r,i+1)).join("")
   :"<div class='no-results'>No record found</div>";
 }));

 $("repeatedDashboard")?.addEventListener("click",e=>{
  let b=e.target.closest("[data-repeat]");
  if(!b)return;
  let h=HIST[b.dataset.repeat];
  if(h?.length){
   FILTERS={};
   $("searchInput").value=h[0][C.PLACE]||"";
   search();
  }
 });

 load();
});