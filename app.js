const ID="1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM",
GID="1464518527";

let A=[],D={},tm;
const $=x=>document.getElementById(x);
const clean=x=>String(x??"").trim();
const norm=x=>String(x??"").toLowerCase().replace(/[\s\-\/\\().,\[\]{}:;_]+/g,"");
const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

function date(x){
 if(!x)return null;
 let s=String(x).trim(),m=s.match(/Date\((\d+),(\d+),(\d+)/);
 if(m)return new Date(+m[1],+m[2],+m[3]);
 m=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
 if(m)return new Date(+m[3],+m[2]-1,+m[1]);
 let d=new Date(s);
 return isNaN(d)?null:d;
}

function age(x){
 let d=date(x),n=new Date();
 if(!d)return 0;
 d.setHours(0,0,0,0);n.setHours(0,0,0,0);
 return Math.max(0,Math.floor((n-d)/86400000));
}

function month(x){
 let d=date(x),n=new Date();
 return d&&d.getFullYear()==n.getFullYear()&&d.getMonth()==n.getMonth();
}

function loc(x){
 return norm(String(x??"").replace(/\d+/g," ").replace(/[\(\)\[\]\{\}]/g," "));
}

function cap(x){
 return String(x??"").toLowerCase().replace(/kva/g,"").replace(/[^0-9.]/g,"");
}


/* LOAD */

function load(){

 let st=$("searchStatus"),cb="TT"+Date.now();

 if(st)st.textContent="Loading transformer records...";

 window[cb]=r=>{

  try{

   A=(r.table?.rows||[]).map((row,i)=>{

    let x=Array.from({length:24},(_,c)=>{
     let z=row.c?.[c];
     return z?.f!==undefined?String(z.f):z?.v!==undefined?String(z.v):"";
    });

    x.__row=i+4;
    x.__search=norm(x.join(" "));
    return x;

   }).filter(x=>x.some(clean));

   buildDamage();

   if(st){
    st.textContent=A.length.toLocaleString("en-IN")+" transformer records loaded • Search ready";
    st.classList.remove("error");
   }

   setTimeout(dashboard,20);

  }catch(e){

   if(st){
    st.textContent="Error reading PR SEARCH data";
    st.classList.add("error");
   }

  }

  delete window[cb];
 };

 let old=$("googleSheetScript");
 if(old)old.remove();

 let s=document.createElement("script");
 s.id="googleSheetScript";
 s.src=
  "https://docs.google.com/spreadsheets/d/"+ID+
  "/gviz/tq?gid="+GID+
  "&range=A3%3AX&headers=1"+
  "&tqx=out%3Ajson%3BresponseHandler%3A"+cb+
  "&_="+Date.now();

 s.onerror=()=>{
  if(st){
   st.textContent="Google Sheet connection failed. Refresh page.";
   st.classList.add("error");
  }
 };

 document.head.appendChild(s);
}


/* REPEATED DAMAGE */

function buildDamage(){

 D={};

 A.forEach(x=>{
  let k=loc(x[7])+"|"+cap(x[9]);
  if(!k||k=="|")return;
  (D[k]??=[]).push(x);
 });

 Object.values(D).forEach(h=>
  h.sort((a,b)=>
   (date(a[13])||date(a[6])||0)-
   (date(b[13])||date(b[6])||0)
  )
 );
}


/* DASHBOARD */

function dashboard(){

 let M=A.filter(x=>month(x[13])),W={},R={},T={},AG={},C={};

 M.forEach(x=>{

  let w=clean(x[1])||"OTHER",
      issue=clean(x[17]),
      rep=clean(x[20]),
      ret=clean(x[22]);

  if(!issue)W[w]=(W[w]||0)+1;
  if(issue&&!rep)R[w]=(R[w]||0)+1;
  if(rep&&!ret)T[w]=(T[w]||0)+1;

  if(!issue){

   AG[w]??={
    a:0,b:0,c:0,d:0,e:0,f:0
   };

   let n=age(x[13]);

   if(n==0)AG[w].a++;
   else if(n==1)AG[w].b++;
   else if(n==2)AG[w].c++;
   else if(n==3)AG[w].d++;
   else if(n<=5)AG[w].e++;
   else AG[w].f++;

   C[w]??={};
   let q=clean(x[9])||"Unknown";
   C[w][q]=(C[w][q]||0)+1;
  }

 });

 let total=M.length,
     issued=M.filter(x=>clean(x[17])).length,
     pending=M.filter(x=>!clean(x[17])).length,
     replacement=M.filter(x=>clean(x[17])&&!clean(x[20])).length,
     returned=M.filter(x=>clean(x[20])&&!clean(x[22])).length;

 $("dashTotal").textContent=total;
 $("dashIssued").textContent=issued;
 $("dashPending").textContent=pending;
 $("dashReplacement").textContent=replacement;
 $("dashReturn").textContent=returned;

 let n=new Date();
 $("dashboardMonth").textContent=n.toLocaleString("en-IN",{month:"long",year:"numeric"});

 bars("workshopDashboard",W,"No Pending to Issue");
 bars("workshopReplacementDashboard",R,"No Replacement Pending");
 bars("workshopReturnDashboard",T,"No TX Return Pending");

 let h="";

 Object.entries(AG).forEach(([w,v])=>{
  h+=`
  <div class="ageing-row">
   <div class="ageing-name">${esc(w)}</div>
   <div class="ageing-grid">
    <div class="age-box"><span>0 Day</span><strong>${v.a}</strong></div>
    <div class="age-box"><span>0–1 Day</span><strong>${v.b}</strong></div>
    <div class="age-box"><span>1–2 Days</span><strong>${v.c}</strong></div>
    <div class="age-box"><span>2–3 Days</span><strong>${v.d}</strong></div>
    <div class="age-box"><span>3–5 Days</span><strong>${v.e}</strong></div>
    <div class="age-box"><span>More than 5 Days</span><strong>${v.f}</strong></div>
   </div>
  </div>`;
 });

 $("ageingDashboard").innerHTML=h||empty("No ageing pending");

 let ch="";

 Object.entries(C).forEach(([w,v])=>{
  ch+=`
  <div class="wc-row">
   <div class="wc-name">${esc(w)}</div>
   <div class="wc-capacity">
    ${Object.entries(v).sort((a,b)=>(parseFloat(a[0])||0)-(parseFloat(b[0])||0))
     .map(q=>`<span class="wc-chip">${esc(q[0])} kVA <strong>${q[1]}</strong></span>`).join("")}
   </div>
  </div>`;
 });

 $("workshopCapacityDashboard").innerHTML=ch||empty("No capacity pending");
}


/* BARS */

function bars(id,obj,msg){

 let a=Object.entries(obj).sort((x,y)=>y[1]-x[1]);

 if(!a.length){
  $(id).innerHTML=empty(msg);
  return;
 }

 let max=a[0][1];

 $(id).innerHTML=a.map(x=>`
  <div class="dashboard-row">
   <div class="dashboard-row-title">
    <span>${esc(x[0])}</span><span>${x[1]}</span>
   </div>
   <div class="dashboard-bar-bg">
    <div class="dashboard-bar" style="width:${Math.max(5,x[1]/max*100)}%"></div>
   </div>
  </div>
 `).join("");
}

function empty(x){
 return `<div class="no-dashboard-data">${x}</div>`;
}


/* SEARCH */

function search(){

 let q=norm($("searchInput").value);

 if(!q){
  $("results").innerHTML="";
  return;
 }

 let f=A.filter(x=>x.__search.includes(q));

 if(!f.length){
  $("results").innerHTML=`<div class="no-results">No record found</div>`;
  return;
 }

 if(q.length<3){
  $("results").innerHTML=
   `<div class="result-count">${f.length.toLocaleString("en-IN")} matching records<br><small>Type more digits to show records</small></div>`;
  return;
 }

 $("results").innerHTML=
  `<div class="result-count">${f.length.toLocaleString("en-IN")} record(s) found${f.length>50?"<br><small>Showing first 50 results</small>":""}</div>`+
  f.slice(0,50).map((x,i)=>card(x,i+1)).join("");
}


/* CARD */

function card(x,no){

 let issue=clean(x[17]),
     rep=clean(x[20]),
     status;

 if(rep){

  status=`
  <div class="status-box status-installed">
   <strong>✓ Congratulations Your Transformer Installed</strong>
   Replacement Date: ${esc(rep)}
  </div>`;

 }else if(issue){

  status=`
  <div class="status-box status-issued">
   <strong>✓ Your Transformer Issued by Workshop</strong>
   Please Contact Driver for Installation
   <div>Issue Date: ${esc(issue)}</div>
   ${clean(x[18])?`<div>Driver: ${esc(x[18])}</div>`:""}
   ${clean(x[19])?`<div>Mobile: ${esc(x[19])}</div>${driver(x)}`:""}
  </div>`;

 }else{

  status=`
  <div class="status-box status-pending">
   <strong>⚠ Transformer Pending to Issue</strong>
  </div>`;

 }


 let h=D[loc(x[7])+"|"+cap(x[9])]||[],
     freq="";


 if(h.length==1){

  freq=`
  <div class="damage-frequency">
   <div class="damage-title">✓ No Repeat Damage</div>
   <div class="damage-subtitle">Only 1 damage at same place and same capacity</div>
  </div>`;

 }else{

  freq=`
  <div class="damage-frequency">
   <div class="damage-title">🔄 ${h.length} Times Damage</div>
   <div class="damage-subtitle">Same Place + Same Capacity</div>
   ${h.map((y,i)=>`
    <div class="history-item">
     <div class="history-number">${i+1}${i==0?"st":i==1?"nd":i==2?"rd":"th"} Time</div>
     <div>PR No: ${esc(y[12]||"-")}</div>
     <div>PR Date: ${esc(y[13]||"-")}</div>
     <div>Capacity: ${esc(y[9]||"-")} kVA</div>
    </div>
   `).join("")}
  </div>`;

 }


 let names=[
  "SN","Workshop","Division","Subdivision","Substation","Feeder",
  "Date of Damage","Place of Damage","DID No","Capacity",
  "Complaint Number","Complaint Date","PR No","PR Date",
  "JE Name","JE Mobile","Issued to Firm","Issue Date",
  "Driver Name","Driver Mobile","Replacement Date","Time",
  "TX Return Date","Observation DTC"
 ];


 let data=names.map((n,i)=>
  clean(x[i])?`
   <div class="data-row">
    <div class="data-label">${n}</div>
    <div class="data-value">${esc(x[i])}</div>
   </div>`:""
 ).join("");


 return `
 <div class="result-card">

  <div class="card-top">
   <span>#${no}</span>
   <span>Row ${x.__row}</span>
  </div>

  ${status}
  ${freq}

  <div class="data-section">
   ${data}
  </div>

 </div>`;
}


/* DRIVER */

function driver(x){

 let p=clean(x[19]).replace(/\D/g,"");
 if(p.length==10)p="91"+p;

 let msg=`Namaste ${clean(x[18])||"Driver"} ji,

Transformer PR No.: ${clean(x[12])||"-"}
Capacity: ${clean(x[9])||"-"} kVA
Place: ${clean(x[7])||"-"}
Workshop: ${clean(x[1])||"-"}

The transformer has been issued from Workshop. Please arrange installation and confirm installation status.

Thank you.`;

 return `
 <div class="driver-buttons">

  <a class="call-driver" href="tel:${clean(x[19])}">
   📞 CALL DRIVER
  </a>

  <a class="whatsapp-driver"
     target="_blank"
     rel="noopener"
     href="https://wa.me/${p}?text=${encodeURIComponent(msg)}">
   💬 WHATSAPP
  </a>

 </div>`;
}


/* START */

document.addEventListener("DOMContentLoaded",()=>{

 let i=$("searchInput");

 i.addEventListener("input",()=>{
  clearTimeout(tm);
  tm=setTimeout(search,20);
 });

 i.addEventListener("keydown",e=>{
  if(e.key=="Enter"){
   e.preventDefault();
   clearTimeout(tm);
   search();
  }
 });

 $("searchBtn").onclick=search;

 load();

});