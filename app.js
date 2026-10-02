const ID="1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM",G="1464518527";
let A=[],t;

const $=x=>document.getElementById(x);
const V=x=>String(x??"").trim();
const N=x=>V(x).toLowerCase().replace(/[\W_]+/g,"");
const L=x=>N(V(x).replace(/[0-9]/g,""));
const K=x=>N(x).replace("kva","");
const E=x=>V(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function D(x){
 let m=V(x).match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
 return m?new Date(m[3],m[2]-1,m[1]):new Date(x);
}

function load(){
 $("searchStatus").textContent="Loading transformer records...";
 let q="cb"+Date.now();

 window[q]=r=>{
  A=(r.table.rows||[]).slice(1).map((z,i)=>{
   let a=Array.from({length:24},(_,j)=>z.c?.[j]?.f??z.c?.[j]?.v??"");
   a.row=i+4;
   a.s=N(a.join(" "));
   return a;
  }).filter(x=>x.some(V));

  dash();

  $("searchStatus").textContent=
   A.length.toLocaleString("en-IN")+
   " transformer records loaded • Search ready";
 };

 let s=document.createElement("script");

 s.src=
 `https://docs.google.com/spreadsheets/d/${ID}/gviz/tq?gid=${G}&range=A3:X&headers=1&tqx=out:json;responseHandler:${q}`;

 document.head.appendChild(s);
}


/* DASHBOARD */

function dash(){

 let n=new Date();

 let r=A.filter(x=>{
  let d=D(x[13]);                 // PR DATE
  return d.getFullYear()==n.getFullYear() &&
         d.getMonth()==n.getMonth();
 });

 let p=r.filter(x=>!V(x[17]));    // ISSUE DATE
 let i=r.length-p.length;

 $("dashTotal").textContent=r.length;
 $("dashIssued").textContent=i;
 $("dashPending").textContent=p.length;

 $("dashboardMonth").textContent=
  n.toLocaleString("en-IN",{month:"long",year:"numeric"});

 let w={};

 p.forEach(x=>{
  let q=V(x[1])||"OTHER";         // WORKSHOP
  w[q]=(w[q]||0)+1;
 });

 let z=Object.entries(w).sort((a,b)=>b[1]-a[1]);
 let m=z[0]?.[1]||1;

 $("workshopDashboard").innerHTML=
 z.map(x=>
 `<div class="dashboard-row">
   <div class="dashboard-row-title">
    <span>${E(x[0])}</span><span>${x[1]}</span>
   </div>
   <div class="dashboard-bar-bg">
    <div class="dashboard-bar" style="width:${x[1]/m*100}%"></div>
   </div>
  </div>`
 ).join("")||"No pending transformer";
}


/* SEARCH */

function search(){

 let q=N($("searchInput").value);

 if(!q){
  $("results").innerHTML="";
  return;
 }

 let r=A.filter(x=>x.s.includes(q));

 $("results").innerHTML=r.length
 ? `<div class="result-count">${r.length} records found</div>`+
   r.map((x,i)=>card(x,i+1)).join("")
 : `<div class="no-results">No record found</div>`;
}


/* CARD */

function card(x,n){

 /* CORRECT COLUMNS:
    Place = H = 7
    Capacity = J = 9
 */

 let h=A.filter(y=>
   L(y[7])==L(x[7]) &&
   K(y[9])==K(x[9])
 );

 h.sort((a,b)=>
   D(a[13])-D(b[13])
 );


 /* CORRECT STATUS:
    Issue Date = R = 17
    Replacement Date = U = 20
 */

 let issue=V(x[17]);
 let replacement=V(x[20]);

 let s="";

 if(replacement){

  s=
  `<div class="status-box status-installed">
    <strong>✓ Congratulations Your Transformer Installed</strong>
    Replacement Date: ${E(replacement)}
   </div>`;

 }else if(issue){

  let driver=V(x[18]);
  let mobile=V(x[19]);

  s=
  `<div class="status-box status-issued">
    <strong>✓ Your Transformer Issued by Workshop</strong>
    Please Contact Driver for Installation
    <div>Issue Date: ${E(issue)}</div>
    ${driver?`<div>Driver: ${E(driver)}</div>`:""}
    ${mobile?`<div>Mobile: ${E(mobile)}</div>`+buttons(x):""}
   </div>`;

 }else{

  s=
  `<div class="status-box status-pending">
    <strong>⚠ Transformer Pending to Issue</strong>
   </div>`;

 }


 /* REPEATED DAMAGE */

 let rep="";

 if(h.length>1){

  rep=
  `<div class="repeated-box">
   <div class="repeated-title">
    ⚠ It Damaged ${h.length} times
   </div>

   <div class="repeated-warning">
    Please Ensure Increasing Capacity if Overloaded
   </div>

   ${h.map((y,i)=>`

    <div class="history-item">

     <div class="history-number">
      ${i+1}${i==0?"st":i==1?"nd":i==2?"rd":"th"} Time
     </div>

     <div>
      PR No: ${E(y[12]||"-")}
     </div>

     <div>
      Date: ${E(y[13]||y[6]||"-")}
     </div>

     <div>
      Capacity: ${E(y[9]||"-")} kVA
     </div>

    </div>

   `).join("")}

  </div>`;
 }


 /* ALL FIELDS */

 let names=[
  "Workshop","Division","Subdivision","Substation","Feeder",
  "Date of Damage","Place of Damage","DID No","Capacity",
  "Complaint Number","Complaint Date","PR No","PR Date",
  "JE Name","JE Mobile","Issued to Firm","Issue Date",
  "Driver Name","Driver Mobile","Replacement Date","Time",
  "TX Return Date","Observation DTC"
 ];

 let data=names.map((a,i)=>
  V(x[i])?
  `<div class="data-row">
    <div class="data-label">${a}</div>
    <div class="data-value">${E(x[i])}</div>
   </div>`
  :""
 ).join("");


 return `
 <div class="result-card">

  <div class="card-top">
   <span>#${n}</span>
   <span>Row ${x.row}</span>
  </div>

  ${s}

  ${rep}

  <div class="data-section">
   ${data}
  </div>

 </div>`;
}


/* CALL + WHATSAPP */

function buttons(x){

 let mobile=V(x[19]).replace(/\D/g,"");

 if(mobile.length==10)
  mobile="91"+mobile;

 let msg=
`Namaste ${V(x[18])||"Driver"} ji,

Transformer PR No.: ${V(x[12])||"-"}
Capacity: ${V(x[9])||"-"} kVA
Place: ${V(x[7])||"-"}
Workshop: ${V(x[1])||"-"}

The transformer has been issued from Workshop. Please arrange installation and confirm the installation status.

Thank you.`;

 return `
 <div class="driver-buttons">

  <a class="call-driver"
     href="tel:${V(x[19])}">
     📞 CALL DRIVER
  </a>

  <a class="whatsapp-driver"
     target="_blank"
     href="https://wa.me/${mobile}?text=${encodeURIComponent(msg)}">
     💬 WHATSAPP
  </a>

 </div>`;
}


/* START */

document.addEventListener("DOMContentLoaded",()=>{

 $("searchBtn").onclick=search;

 $("searchInput").oninput=()=>{
  clearTimeout(t);
  t=setTimeout(search,60);
 };

 load();

});