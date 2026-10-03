const SHEET_ID="1qjOJ879V4FGGQtf2RvqjtSH1eHzGXh4fARJZE0LtdnM";
const SHEET_GID="1464518527";

let ALL=[];
let DAMAGE={};
let searchTimer=null;

const $=id=>document.getElementById(id);

const clean=x=>String(x??"").trim();

function norm(x){
 return String(x??"")
  .toLowerCase()
  .replace(/[\s\-\/\).,\[{}:;_]+/g,"");
}

function esc(x){
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
   .replace(/[\{\}]/g," ")
   .replace(/[-_/\\.,:;]+/g," ")
 );

}


/* CAPACITY NORMALIZATION */

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
  return new Date(
   +m[1],
   +m[2],
   +m[3]
  );

 m=s.match(
  /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/
 );

 if(m)
  return new Date(
   +m[3],
   +m[2]-1,
   +m[1]
  );

 let d=new Date(s);

 return isNaN(d.getTime())?null:d;
}


/* CURRENT MONTH BY PR DATE */

function currentMonth(x){

 let d=parseDate(x);
 let n=new Date();

 return !!d &&
  d.getFullYear()===n.getFullYear() &&
  d.getMonth()===n.getMonth();

}


/* AGE FROM PR DATE */

function ageDays(x){

 let d=parseDate(x);

 if(!d)return 0;

 let t=new Date();

 t.setHours(0,0,0,0);
 d.setHours(0,0,0,0);

 return Math.max(
  0,
  Math.floor((t-d)/86400000)
 );

}


/* LOAD SHEET */

function loadSheet(){

 const status=$("searchStatus");

 if(status)
  status.textContent=
   "Loading transformer records...";


 const callback="TT_"+Date.now();


 window[callback]=function(response){

  try{

   ALL=[];
   DAMAGE={};


   (response.table.rows||[]).forEach(
    function(row,index){

     let a=[];


     for(let i=0;i<24;i++){

      let c=row.c?.[i];

      a.push(
       c?.f!==undefined
        ?String(c.f)
        :c?.v!==undefined
         ?String(c.v)
         :""
      );

     }


     if(!a.some(clean))
      return;


     a.__row=index+4;


     /*
      One combined search index.
      Search is completely local.
     */

     a.__search=norm(
      a.join(" ")
     );


     ALL.push(a);

    }
   );


   buildDamageIndex();


   /*
    SEARCH READY IMMEDIATELY.
   */

   if(status){

    status.textContent=
     ALL.length.toLocaleString("en-IN")+
     " transformer records loaded • Search ready";

    status.classList.remove("error");

   }


   /*
    Dashboard is started separately.
    It cannot stop typing/search.
   */

   setTimeout(
    buildDashboard,
    30
   );


  }catch(e){

   console.error(e);

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


 const script=
  document.createElement("script");


 script.id=
  "googleSheetScript";


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


/* DAMAGE INDEX */

function buildDamageIndex(){

 DAMAGE={};


 ALL.forEach(function(x){

  let loc=
   locationKey(x[7]);

  let cap=
   capacityKey(x[9]);


  if(!loc || !cap)
   return;


  let key=
   loc+"||"+cap;


  if(!DAMAGE[key])
   DAMAGE[key]=[];


  DAMAGE[key].push(x);

 });


 Object.keys(DAMAGE).forEach(
  function(key){

   DAMAGE[key].sort(
    function(a,b){

     let da=
      parseDate(a[13])||
      parseDate(a[6])||
      new Date(0);

     let db=
      parseDate(b[13])||
      parseDate(b[6])||
      new Date(0);

     return da-db;

    }
   );

  }
 );

}


/* ENABLE SEARCH */

function enableSearch(){

 const input=$("searchInput");

 if(!input)
  return;


 input.disabled=false;


 /*
  IMPORTANT:
  Do not recreate input.
  Do not change value.
  Do not focus elsewhere.
 */

 input.oninput=function(){

  clearTimeout(searchTimer);

  searchTimer=setTimeout(
   searchRecords,
   20
  );

 };


 input.onkeydown=function(e){

  if(e.key==="Enter"){

   e.preventDefault();

   clearTimeout(searchTimer);

   searchRecords();

  }

 };


 const button=$("searchBtn");

 if(button){

  button.onclick=function(){

   clearTimeout(searchTimer);

   searchRecords();

  };

 }

}


/* DASHBOARD */

function buildDashboard(){

 if(!ALL.length)
  return;


 const month=
  ALL.filter(
   x=>currentMonth(x[13])
  );


 let total=month.length;
 let issued=0;
 let pending=0;
 let replacement=0;
 let returned=0;


 month.forEach(function(x){

  let issue=
   clean(x[17]);

  let rep=
   clean(x[20]);

  let ret=
   clean(x[22]);


  if(!issue){

   pending++;

  }else{

   issued++;


  