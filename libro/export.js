const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const SRC=process.argv[2]||'../index.html', OUT=process.argv[3]||'dati.json';
const dom=new JSDOM(fs.readFileSync(SRC,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:new VirtualConsole(),url:'https://x.test/'});
setTimeout(()=>{const w=dom.window,d=w.document,ser=new w.XMLSerializer();
 const data=JSON.parse(w.eval(`JSON.stringify({SENS:SENS5,UMAMI:UMAMI,ASSI_SENS:ASSI_SENS,P:PROFILO8,ASSI:ASSI8,ORD:ORDINE_RADAR,MOL:MOLECOLE,MASTER:MASTER,DOSE:DATA.dose,MAT:window.MATRICE_SENTORI,
   STYLES:DATA.styles, GIN:GIN_LISTE, GIN_BASE:GIN_BASE, GARN:window.GARNISH_STILI,
   CAL:MASTER.map(x=>{const m=window.spCalMesi?window.spCalMesi(x.periodo_raccolta):null;return [x.botanica,m?[...m]:null];})})`));
 function clean(el,keepSvg){
  const c=el.cloneNode(true);
  const NOMI=new Set(w.eval('MASTER.map(x=>x.botanica)'));
  c.querySelectorAll('button').forEach(b=>{const t=b.textContent.trim();if(NOMI.has(t)||NOMI.has(t.replace(/^\S+\s/,''))){const s=d.createElement('span');s.setAttribute('class','bot-nome');s.textContent=t;b.replaceWith(s);}});
  c.querySelectorAll('a[href*="google.com"]').forEach(a=>a.remove());
  c.querySelectorAll('script,style,button,input,select,textarea,canvas,datalist,'+(keepSvg?'':'svg,')+'.page-hero,.howto-chiudi,[hidden],.noz-rimando,.radar-box,.gin-radar').forEach(x=>x.remove());
  c.querySelectorAll('label').forEach(x=>{ if(!x.textContent.trim()) x.remove(); });
  c.querySelectorAll('details').forEach(det=>{const s=det.querySelector(':scope > summary');const t=s?s.textContent.trim():'';
    if(/^Come si usa$|^Come si usa questa|^Assaggia e annota|^➕/.test(t)){det.remove();return;}
    const sec=d.createElement('section');sec.setAttribute('class','box');
    if(s){const h=d.createElement('h3');h.textContent=t;sec.appendChild(h);s.remove();}
    while(det.firstChild) sec.appendChild(det.firstChild); det.replaceWith(sec);});
  c.querySelectorAll('a').forEach(a=>{const h=a.getAttribute('href')||'';if(!/^https?:/.test(h)){const s=d.createElement('span');s.innerHTML=a.innerHTML;a.replaceWith(s);} else {[...a.attributes].forEach(at=>{if(at.name!=='href')a.removeAttribute(at.name);});}});
  c.querySelectorAll('*').forEach(x=>{if(x.closest('svg'))return;[...x.attributes].forEach(at=>{if(!['href','class','colspan','rowspan'].includes(at.name)) x.removeAttribute(at.name);});});
  // contenitori vuoti
  for(let k=0;k<3;k++) c.querySelectorAll('div,p,span,section,ul,ol,li,table').forEach(x=>{if(!x.textContent.trim()) x.remove();});
  return c;
 }
 const xs=n=>[...n.childNodes].map(x=>ser.serializeToString(x)).join('').replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g,'');
 function sezioni(id){
  const p=d.getElementById('panel-'+id); const c=clean(p); const out=[];
  const sez=[...c.querySelectorAll('.pg-sez')];
  if(sez.length){
    const st=c.querySelector('.storia')||c; const pre=[...st.children].filter(x=>!x.classList.contains('pg-sez')).map(x=>ser.serializeToString(x)).join('').replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g,'');
    out.push(['',pre]);
    sez.forEach(s=>{const h=s.querySelector('h3');const t=h?h.textContent.trim():'';if(h)h.remove();out.push([t,xs(s)]);});
  } else out.push(['',xs(c)]);
  return out;
 }
 data.PAN={}; ['storia','nozioni','analisi','ruota','altrigin','ridondanza','cocktail','laboratorio','garnish','toniche','prove'].forEach(id=>data.PAN[id]=sezioni(id));
 const box=(pid,txt,k)=>{const el=[...d.querySelectorAll('#panel-'+pid+' details')].find(x=>x.querySelector('summary').textContent.includes(txt));return el?xs(clean(el.querySelector('.howto-body,.tar-body')||el,k)):'';};
 data.QUATTRO=box('matrice','Quattro sistemi'); data.CANALI=box('matrice','I canali e dove',true);
 data.RIDGUIDA=box('ridondanza','Come si usa'); data.TARATURA=box('prove','Taratura del palato');
 data.ABV={}; d.querySelectorAll('#panel-altrigin details.howto > summary').forEach(s=>{const t=s.textContent,n=Object.keys(data.GIN).find(x=>t.startsWith(x));if(n)data.ABV[n]=t.split(' — ')[1]||'';});
 fs.writeFileSync(OUT,JSON.stringify(data));
 Object.keys(data.PAN).forEach(k=>console.log(k,data.PAN[k].map(x=>x[0]+':'+x[1].length).join(' | ')));
 console.log('CANALI',data.CANALI.length,'RID',data.RIDGUIDA.length,'CAL',data.CAL.filter(x=>x[1]).length);
 process.exit(0);},3000);
