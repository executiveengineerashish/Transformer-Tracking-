const ID="1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM",G="1464518527",C=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
let A=[],t;

const $=x=>document.getElementById(x),v=x=>String(x??"").trim(),
N=x=>v(x).toLowerCase().replace(/[\W_]+/g,""),
L=x=>N(v(x).replace(/[0-9]/g,"")),
K=x=>N(x).replace("kva",""),
E=x=>v(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function D(x){
 let m=v(x).match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
 return m?new Date(m[3],m[2]-1,m[1]):new Date(x);
}

function load(){
 $("searchStatus").textContent="Loading transformer records...";
 let q="cb"+Date.now();window[q]=r=>{
  A=(r.table.rows||[]).slice(1).map((z,i)=>{
   let a=C.map(j=>z.c?.[j]?.f??z.c?.[j]?.v??"");
   a.row=i+4;a.s=N(a.join(" "));return a
  }).filter(x=>x.some(v));
  dash();
  $("searchStatus").textContent=A.length.toLocaleString("en-IN")+" transformer records loaded • Search ready";
 };
 let s=document.createElement("script");
 s.src=`https://docs.google.com/spreadsheets/d/${ID}/gviz/tq?gid=${G}&range=A3:X&headers=1&tqx=out:json;responseHandler:${q}`;
 document.head.appendChild(s);
}

function dash(){
 let n=new Date(),r=A.filter(x=>{let d=D(x[12]);return d.getFullYear()==n.getFullYear()&&d.getMonth()==n.getMonth()}),
 p=r.filter(x=>!v(x[16])),i=r.length-p.length;
 $("dashTotal").textContent=r.length;$("dashIssued").textContent=i;$("dashPending").textContent=p.length;
 $("dashboardMonth").textContent=n.toLocaleString("en-IN",{month:"long",year:"numeric"});

 let w={};p.forEach(x=>w[x[0]]=(w[x[0]]||0)+1);
 let z=Object.entries(w).sort((a,b)=>b[1]-a[1]),m=z[0]?.[1]||1;
 $("workshopDashboard").innerHTML=z.map(x=>`<div class="dashboard-row"><div class="dashboard-row-title"><span>${E(x[0])}</span><span>${x[1]}</span></div><div class="dashboard-bar-bg"><div class="dashboard-bar" style="width:${x[1]/m*100}%"></div></div></div>`).join("")||"No pending transformer";
}

function search(){
 let q=N($("searchInput").value);
 if(!q)return $("results").innerHTML="";
 let r=A.filter(x=>x.s.includes(q));
 $("results").innerHTML=r.length?`<div class="result-count">${r.length} records found</div>`+r.map(card).join(""):"<div class='no-results'>No record found</div>";
}

function card(x,n){
 let h=A.filter(y=>L(y[6])==L(x[6])&&K(y[8])==K(x[8])).sort((a,b)=>D(a[12])-D(b[12]));
 let s=v(x[16])?`<div class="status-box status-installed"><strong>✓ Congratulations Your Transformer Installed</strong>Replacement Date: ${E(x[19])}</div>`:
 v(x[15])?`<div class="status-box status-issued"><strong>✓ Your Transformer Issued by Workshop</strong>Please Contact Driver for Installation<div>Issue Date: ${E(x[15])}</div><div>Driver: ${E(x[17])}</div><div>Mobile: ${E(x[18])}</div><div class="driver-buttons"><a class="call-driver" href="tel:${x[18]}">📞 CALL DRIVER</a><a class="whatsapp-driver" target="_blank" href="https://wa.me/91${v(x[18]).replace(/\D/g,"")}?text=${encodeURIComponent("Namaste "+v(x[17])+" ji, Transformer PR No.: "+v(x[11])+", Capacity: "+v(x[8])+" kVA, Place: "+v(x[6])+". Please arrange installation.")}">💬 WHATSAPP</a></div></div>`:
`<div class="status-box status-pending"><strong>⚠ Transformer Pending to Issue</strong></div>`;

 let rep=h.length>1?`<div class="repeated-box"><div class="repeated-title">⚠ It Damaged ${h.length} times</div><div class="repeated-warning">Please Ensure Increasing Capacity if Overloaded</div>${h.map((y,i)=>`<div class="history-item"><b>${i+1}${i==0?"st":i==1?"nd":i==2?"rd":"th"} Time</b><div>PR No: ${E(y[11])}</div><div>Date: ${E(y[12])}</div></div>`).join("")}</div>`:"";

 let f=["Workshop","Division","Subdivision","Substation","Feeder","Date of Damage","Place of Damage","DID No","Capacity","Complaint Number","Complaint Date","PR No","PR Date","JE Name","JE Mobile","Issued to Firm","Issue Date","Driver Name","Driver Mobile","Replacement Date","Time","TX Return Date","Observation DTC"];
 let data=f.map((a,i)=>v(x[i])?`<div class="data-row"><div class="data-label">${a}</div><div class="data-value">${E(x[i])}</div></div>`:"").join("");

 return `<div class="result-card"><div class="card-top"><span>#${n}</span><span>Row ${x.row}</span></div>${s}${rep}<div class="data-section">${data}</div></div>`;
}

document.addEventListener("DOMContentLoaded",()=>{
 $("searchBtn").onclick=search;
 $("searchInput").oninput=()=>{clearTimeout(t);t=setTimeout(search,60)};
 load();
});