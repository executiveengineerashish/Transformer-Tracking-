const ID="1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";
const G="1464518527";

let A=[],tm;

const $=x=>document.getElementById(x);
const V=x=>String(x??"").trim();
const N=x=>V(x).toLowerCase().replace(/[\s\-\/\\().,\[\]{}:;_]+/g,"");
const L=x=>N(V(x).replace(/[0-9]/g,""));
const K=x=>N(x).replace("kva","");
const E=x=>V(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function D(x){
 if(!x)return null;
 let s=V(x),m=s.match(/Date\(\s*(\d+),\s*(\d+),\s*(\d+)/);
 if(m)return new Date(+m[1],+m[2],+m[3]);
 m=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
 if(m)return new Date(+m[3],+m[2]-1,+m[1]);
 let d=new Date(s);
 return isNaN(d.getTime())?null:d;
}

function currentMonth(x){
 let d=D(x),n=new Date();
 return d&&d.getFullYear()==n.getFullYear()&&d.getMonth()==n.getMonth();
}


/* ================= LOAD ================= */

function load(){

 $("searchStatus").textContent="Loading transformer records...";

 let cb="TT"+Date.now();

 window[cb]=r=>{

  try{

   A=(r.table.rows||[]).map((z,i)=>{

    let a=Array.from(
     {length:24},
     (_,j)=>z.c?.[j]?.f??z.c?.[j]?.v??""
    );

    a.row=i+4;
    a.s=N(a.join(" "));

    return a;

   }).filter(x=>x.some(V));

   dashboard();

   $("searchStatus").textContent=
    A.length.toLocaleString("en-IN")+
    " transformer records loaded • Search ready";

  }catch(e){

   console.error(e);
   $("searchStatus").textContent=
    "Error reading PR SEARCH data";

  }

 };

 let old=$("googleSheetScript");
 if(old)old.remove();

 let s=document.createElement("script");

 s.id="googleSheetScript";

 s.src=
 "https://docs.google.com/spreadsheets/d/"+ID+
 "/gviz/tq?gid="+G+
 "&range=A3:X"+
 "&headers=1"+
 "&tqx=out:json;responseHandler:"+cb+
 "&_="+Date.now();

 document.head.appendChild(s);
}


/* ================= DASHBOARD ================= */

function dashboard(){

 let n=new Date();

 let r=A.filter(x=>currentMonth(x[13]));

 let issued=r.filter(x=>V(x[17])).length;

 let pending=r.filter(x=>!V(x[17]));

 $("dashTotal").textContent=r.length;
 $("dashIssued").textContent=issued;
 $("dashPending").textContent=pending.length;

 $("dashboardMonth").textContent=
  n.toLocaleString("en-IN",{
   month:"long",
   year:"numeric"
  });


 /* WORKSHOP */

 let W={};

 pending.forEach(x=>{
  let w=V(x[1])||"OTHER";
  W[w]=(W[w]||0)+1;
 });

 let ws=Object.entries(W).sort((a,b)=>b[1]-a[1]);
 let wm=ws[0]?.[1]||1;

 $("workshopDashboard").innerHTML=
 ws.map(x=>
 `<div class="dashboard-row">
  <div class="dashboard-row-title">
   <span>${E(x[0])}</span>
   <span>${x[1]}</span>
  </div>
  <div class="dashboard-bar-bg">
   <div class="dashboard-bar"
        style="width:${x[1]/wm*100}%"></div>
  </div>
 </div>`
 ).join("")||"No pending transformer";


 /* CAPACITY */

 let C={};

 pending.forEach(x=>{
  let c=V(x[9])||"Unknown";
  C[c]=(C[c]||0)+1;
 });

 $("capacityDashboard").innerHTML=
 `<div class="capacity-grid">`+
 Object.entries(C)
 .sort((a,b)=>parseFloat(a[0])-parseFloat(b[0]))
 .map(x=>
 `<div class="capacity-box">
   <span>${E(x[0])} kVA</span>
   <strong>${x[1]}</strong>
  </div>`
 ).join("")+
 `</div>`;


 /* AGEING */

 let a24=0,a72=0,a7=0;

 pending.forEach(x=>{

  let d=D(x[13]);

  if(!d)return;

  let days=(n-d)/86400000;

  if(days>1)a24++;
  if(days>3)a72++;
  if(days>7)a7++;

 });

 $("ageingDashboard").innerHTML=
 `<div class="ageing-grid">

  <div class="ageing-box">
   <div>&gt; 1 Day</div>
   <strong>${a24}</strong>
  </div>

  <div class="ageing-box">
   <div>&gt; 3 Days</div>
   <strong>${a72}</strong>
  </div>

  <div class="ageing-box">
   <div>&gt; 7 Days</div>
   <strong>${a7}</strong>
  </div>

 </div>`;


 /* REPEATED DAMAGE */

 let H={};

 A.forEach(x=>{

  let place=L(x[7]);
  let capacity=K(x[9]);

  if(!place||!capacity)return;

  let key=place+"|"+capacity;

  if(!H[key])H[key]=[];

  H[key].push(x);

 });


 let repeated=Object.values(H)
  .filter(x=>x.length>1)
  .sort((a,b)=>b.length-a.length);


 $("repeatedDashboard").innerHTML=

 repeated.length?

 repeated.map(x=>{

  let q=x[0];

  return `<div class="repeated-dashboard-item">

   <div class="repeated-dashboard-title">
    🔄 ${E(q[7])} — ${x.length} Times
   </div>

   <div class="repeated-dashboard-detail">
    Capacity: <b>${E(q[9])} kVA</b>
   </div>

  </div>`;

 }).join("")

 :

 "No repeated damage found";

}


/* ================= SEARCH ================= */

function search(){

 let q=N($("searchInput").value);

 if(!q){
  $("results").innerHTML="";
  return;
 }

 let r=A.filter(x=>x.s.includes(q));

 $("results").innerHTML=

 r.length?

 `<div class="result-count">
   ${r.length} records found
  </div>`+

 r.map((x,i)=>card(x,i+1)).join("")

 :

 `<div class="no-results">
   No record found
  </div>`;
}


/* ================= CARD ================= */

function card(x,n){

 /*
 PLACE = H = 7
 CAPACITY = J = 9
 ISSUE = R = 17
 DRIVER = S = 18
 MOBILE = T = 19
 REPLACEMENT = U = 20
 */

 let issue=V(x[17]);
 let replacement=V(x[20]);

 let s="";


 /* INSTALLED */

 if(replacement){

  s=
  `<div class="status-box status-installed">

   <strong>
    ✓ Congratulations Your Transformer Installed
   </strong>

   Replacement Date:
   ${E(replacement)}

  </div>`;

 }


 /* ISSUED */

 else if(issue){

  s=
  `<div class="status-box status-issued">

   <strong>
    ✓ Your Transformer Issued by Workshop
   </strong>

   Please Contact Driver for Installation

   <div>
    Issue Date: ${E(issue)}
   </div>

   ${V(x[18])?
    `<div>Driver: ${E(x[18])}</div>`:""}

   ${V(x[19])?
    `<div>Mobile: ${E(x[19])}</div>
     ${buttons(x)}`:""}

  </div>`;

 }


 /* PENDING */

 else{

  s=
  `<div class="status-box status-pending">

   <strong>
    ⚠ Transformer Pending to Issue
   </strong>

  </div>`;

 }


 /* ================= REPEATED ================= */

 let place=L(x[7]);
 let capacity=K(x[9]);

 let h=A.filter(y=>
  L(y[7])==place &&
  K(y[9])==capacity
 );

 h.sort((a,b)=>
  (D(a[13])||0)-
  (D(b[13])||0)
 );


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


 /* ================= FIELDS ================= */

 let names=[
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


 let data=names.map((name,i)=>

  V(x[i])?

  `<div class="data-row">

   <div class="data-label">
    ${name}
   </div>

   <div class="data-value">
    ${E(x[i])}
   </div>

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


/* ================= BUTTONS ================= */

function buttons(x){

 let p=V(x[19]).replace(/\D/g,"");

 if(p.length==10)p="91"+p;

 let msg=
 `Namaste ${V(x[18])||"Driver"} ji,

 Transformer PR No.: ${V(x[12])||"-"}
 Capacity: ${V(x[9])||"-"} kVA
 Place: ${V(x[7])||"-"}
 Workshop: ${V(x[1])||"-"}

 The transformer has been issued from Workshop.
 Please arrange installation and confirm the installation status.

 Thank you.`;

 return `

 <div class="driver-buttons">

  <a class="call-driver"
     href="tel:${V(x[19])}">
   📞 CALL DRIVER
  </a>

  <a class="whatsapp-driver"
     target="_blank"
     href="https://wa.me/${p}?text=${encodeURIComponent(msg)}">
   💬 WHATSAPP
  </a>

 </div>`;

}


/* ================= START ================= */

document.addEventListener("DOMContentLoaded",()=>{

 $("searchBtn").onclick=search;

 $("searchInput").oninput=()=>{

  clearTimeout(tm);

  tm=setTimeout(search,60);

 };

 load();

});