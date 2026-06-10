
const DATA_KEY='cdrm_final_data_v3_supabase_compatible';
const CFG_KEY='cdrm_supabase_cfg_v1';
const BUCKET='club-assets';
const ADMIN_PASS='ADMINRIMEN1932';
const SERIES=["SERIE PEQUES", "SERIE SEGUNDA INFANTIL", "SERIE PRIMERA INFANTIL", "SERIE JUVENILES", "SERIE ORO", "SERIE SUPER SENIOR", "SERIE SENIOR", "SERIE SEGUNDA ADULTOS", "SERIE PRIMERA ADULTOS", "SERIE PLATINOS", "SERIE HONOR"];
const DEFAULT_DATA={
 homeTitle:'RICARDO MÉNDEZ',
 homeIntro:'Web pública profesional con administración privada para noticias, socios, fixture, puntajes, fotos, videos, auspiciadores e historia institucional.',
 metrics:{series:'11',members:'246',titles:'0',anniversary:'12/08'},
 nextMatch:{rival:'Club rival',date:'Sábado 25 Mayo · 15:00 hrs',place:'Cancha por confirmar',logo:''},
 history:'Club Deportivo Ricardo Méndez, institución deportiva de San Carlos fundada el 12 de agosto de 1932. Más que un club, una familia.',
 president:'Presidente actual por definir',
 historyPhoto:'',
 directors:[],
 presidents:[],
 results:[],
 news:[],
 gallery:[],
 fixture_images:[],
 sponsors:window.CDRM_DEFAULT_SPONSORS||[],
 standings:Object.fromEntries(SERIES.map(s=>[s,[]]))
};
let supabaseClient=null;
const $=id=>document.getElementById(id);
function toast(m){let e=document.createElement('div');e.className='toast';e.textContent=m;document.body.appendChild(e);setTimeout(()=>e.remove(),3000)}
function merge(a,b){if(Array.isArray(a))return Array.isArray(b)?b:a;if(typeof a==='object'&&a&&typeof b==='object'&&b){let o={...a};for(const k of Object.keys(b))o[k]=merge(a[k],b[k]);return o}return b??a}
function getData(){try{return merge(DEFAULT_DATA,JSON.parse(localStorage.getItem(DATA_KEY)||'{}'))}catch(e){return structuredClone(DEFAULT_DATA)}}
function saveData(d){localStorage.setItem(DATA_KEY,JSON.stringify(merge(DEFAULT_DATA,d)))}
function normUrl(u){u=String(u||'').trim();if(u&&!u.startsWith('http')&&!u.includes('.supabase.co'))u='https://'+u+'.supabase.co';return u.replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'')}
function getCfg(){try{return JSON.parse(localStorage.getItem(CFG_KEY)||'{}')}catch(e){return {}}}
function setCfg(url,key){localStorage.setItem(CFG_KEY,JSON.stringify({url:normUrl(url),key:String(key||'').trim()}))}
function initSB(){const c=getCfg();if(!window.supabase||!c.url||!c.key)return false;supabaseClient=window.supabase.createClient(normUrl(c.url),c.key);return true}
async function testSB(){if(!initSB())return false;const {error}=await supabaseClient.from('settings').select('key').limit(1);if(error)throw error;return true}
async function fileToData(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
async function uploadFile(file,folder){if(!file)return'';const local=await fileToData(file);if(!initSB())return local;try{const ext=(file.name.split('.').pop()||'png');const path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;const {error}=await supabaseClient.storage.from(BUCKET).upload(path,file,{upsert:false});if(error)throw error;return supabaseClient.storage.from(BUCKET).getPublicUrl(path).data.publicUrl||local}catch(e){console.warn(e);return local}}
async function table(name){const {data,error}=await supabaseClient.from(name).select('*');if(error)throw error;return data||[]}
async function pullCloud(){if(!initSB())throw new Error('Supabase no conectado');let d=getData();
 const settings=await table('settings'); settings.forEach(r=>{
   try{
     d[r.key] = (typeof r.value === 'string') ? JSON.parse(r.value) : r.value;
   }catch(e){ d[r.key]=r.value }
 });
 d.directors=(await table('directors')).map(x=>({role:x.role,name:x.name}));
 d.sponsors=(await table('sponsors')).map(x=>({name:x.name,url:x.url}));
 d.fixture_images=(await table('fixture_images')).map(x=>({title:x.title,image:x.image||x.image_url||''}));
 d.results=(await table('results')).map(x=>({date:x.date_text||x.date||'',match:x.match,score:x.score,scorers:x.scorers||''}));
 d.news=(await table('news')).map(x=>({title:x.title,text:x.text||x.body||'',date:x.date_text||x.date||'',image:x.image||x.image_url||''}));
 d.gallery=(await table('gallery')).map(x=>({title:x.title,type:x.type,url:x.url}));
 d.presidents=(await table('presidents')).map(x=>({name:x.name,period:x.period,image:x.image||x.image_url||''}));
 const st=await table('standings'); d.standings=Object.fromEntries(SERIES.map(s=>[s,[]])); st.forEach(x=>{if(!d.standings[x.serie])d.standings[x.serie]=[];d.standings[x.serie].push({team:x.team,pj:x.pj||0,pg:x.pg||0,pe:x.pe||0,pp:x.pp||0,gf:x.gf||0,gc:x.gc||0,dg:x.dg||0,pts:x.pts||0})});
 return d;
}
async function replaceTable(name,rows){
 if(name==='settings'){
   if(rows.length){
     const {error}=await supabaseClient.from('settings').upsert(rows,{onConflict:'key'});
     if(error)throw error;
   }
   return;
 }
 await supabaseClient.from(name).delete().neq('id','00000000-0000-0000-0000-000000000000');
 if(rows.length){
   const {error}=await supabaseClient.from(name).insert(rows);
   if(error)throw error;
 }
}
async function pushCloud(d){if(!initSB())throw new Error('Supabase no conectado');d=merge(DEFAULT_DATA,d);
 await replaceTable('settings',[{key:'homeTitle',value:JSON.stringify(d.homeTitle)},{key:'homeIntro',value:JSON.stringify(d.homeIntro)},{key:'metrics',value:JSON.stringify(d.metrics)},{key:'nextMatch',value:JSON.stringify(d.nextMatch)},{key:'history',value:JSON.stringify(d.history)},{key:'president',value:JSON.stringify(d.president)},{key:'historyPhoto',value:JSON.stringify(d.historyPhoto)}]);
 await replaceTable('directors',d.directors.map((x,i)=>({role:x.role,name:x.name,sort_order:i})));
 await replaceTable('sponsors',d.sponsors.map((x,i)=>({name:x.name,url:x.url,sort_order:i})));
 await replaceTable('fixture_images',d.fixture_images.map((x,i)=>({title:x.title,image:x.image,sort_order:i})));
 await replaceTable('results',d.results.map((x,i)=>({date_text:x.date,match:x.match,score:x.score,scorers:x.scorers||'',sort_order:i})));
 await replaceTable('news',d.news.map((x,i)=>({title:x.title,text:x.text,date_text:x.date,image:x.image,sort_order:i})));
 await replaceTable('gallery',d.gallery.map((x,i)=>({title:x.title,type:x.type,url:x.url,sort_order:i})));
 await replaceTable('presidents',d.presidents.map((x,i)=>({name:x.name,period:x.period,image:x.image,sort_order:i})));
 let standings=[];Object.entries(d.standings).forEach(([serie,rows])=>rows.forEach((x,i)=>standings.push({serie,team:x.team,pj:+x.pj||0,pg:+x.pg||0,pe:+x.pe||0,pp:+x.pp||0,gf:+x.gf||0,gc:+x.gc||0,dg:+x.dg||0,pts:+x.pts||0,sort_order:i}))); await replaceTable('standings',standings);
}
async function saveAll(d){saveData(d);try{await pushCloud(d);status('Estado: guardado en Supabase.');toast('Guardado exitoso')}catch(e){console.error(e);status('Estado: guardado local. Error Supabase: '+e.message);toast('Guardado local')}renderAll()}
function status(m){if($('statusLine'))$('statusLine').textContent=m}
function imgOrText(url,name){return url?`<img src="${url}" alt="${name}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'sponsor-fallback',textContent:'${String(name||'AUSPICIADOR').replace(/'/g,'')}'}))">`:`<div class="sponsor-fallback">${name||'AUSPICIADOR'}</div>`}
function renderSponsors(d){$('sponsorsGrid')&&($('sponsorsGrid').innerHTML=(d.sponsors||[]).map(s=>`<article class="sponsor-card"><div class="sponsor-logo-box">${imgOrText(s.url,s.name)}</div><h3>${s.name}</h3></article>`).join(''))}
function renderPublic(){const d=getData(); if($('homeIntro'))$('homeIntro').textContent=d.homeIntro; renderSponsors(d); renderSponsorTicker(d); renderHomePreviews(d); renderSponsorTickerFinal(d); $('metrics')&&($('metrics').innerHTML=`<div class="metric"><span>Series</span><b>${d.metrics.series}</b></div><div class="metric"><span>Socios activos</span><b>${d.metrics.members}</b></div><div class="metric"><span>Campeonatos</span><b>${d.metrics.titles}</b></div><div class="metric"><span>Aniversario</span><b>${d.metrics.anniversary}</b></div>`);
 $('nextMatchCard')&&($('nextMatchCard').innerHTML=`<h3 class="featured-title">★ Próximo partido</h3><div class="match-pro-logos"><div class="match-team">${proImg(window.CDRM_LOGO,'Ricardo Méndez','match-logo-img')}<span>Ricardo<br>Méndez</span></div><strong>VS</strong><div class="match-team">${proImg(d.nextMatch.logo,d.nextMatch.rival,'match-logo-img')}<span>${d.nextMatch.rival||'Club rival'}</span></div></div><div class="match-info"><h3 class="match-title">Ricardo Méndez vs ${d.nextMatch.rival}</h3><p>▣ ${d.nextMatch.date}</p><b>⌖ ${d.nextMatch.place}</b></div><a class="match-button" href="#fixture">Ver partido</a>`);
 $('resultsGrid')&&($('resultsGrid').innerHTML=(d.results||[]).map(r=>`<article class="result-card"><span>${r.date}</span><h3>${r.match}</h3><h2>${r.score}</h2></article>`).join('')||'<article class="result-card">Sin resultados cargados.</article>');
 $('fixtureGrid')&&($('fixtureGrid').innerHTML=(d.fixture_images||[]).map(f=>`<article class="fixture-card"><img src="${f.image}" alt="${f.title}" onerror="this.style.display=\'none\'"><h3>${f.title}</h3></article>`).join(''));
 const sel=$('serieSelect'); if(sel&&!sel.options.length){sel.innerHTML=SERIES.map(s=>`<option>${s}</option>`).join('');sel.onchange=renderPublic}; const serie=sel?sel.value:SERIES[0]; const rows=[...(d.standings[serie]||[])].sort((a,b)=>(+b.pts)-(+a.pts)||(+b.dg)-(+a.dg)); $('standingsRows')&&($('standingsRows').innerHTML=rows.map((r,i)=>`<tr class="${(r.team||'').toLowerCase().includes('méndez')||(r.team||'').toLowerCase().includes('mendez')?'rm':''}"><td>${i+1}</td><td>${r.team}</td><td>${r.pj}</td><td>${r.pg}</td><td>${r.pe}</td><td>${r.pp}</td><td>${r.gf}</td><td>${r.gc}</td><td>${r.dg}</td><td>${r.pts}</td></tr>`).join(''));
 let acc={}; Object.values(d.standings).flat().forEach(r=>{let t=(r.team||'').toLowerCase().includes('méndez')||(r.team||'').toLowerCase().includes('mendez')?'R. Méndez':r.team;acc[t]=acc[t]||{team:t,pj:0,pts:0,dg:0};acc[t].pj+=+r.pj||0;acc[t].pts+=+r.pts||0;acc[t].dg+=+r.dg||0});$('cumulativeRows')&&($('cumulativeRows').innerHTML=Object.values(acc).sort((a,b)=>b.pts-a.pts).map((r,i)=>`<tr class="${r.team==='R. Méndez'?'rm':''}"><td>${i+1}</td><td>${r.team}</td><td>${r.pj}</td><td>${r.pts}</td><td>${r.dg}</td></tr>`).join(''));
 $('newsGrid')&&($('newsGrid').innerHTML=(d.news||[]).map(n=>`<article class="news-card">${n.image?`<img src="${n.image}" onerror="this.style.display=\'none\'">`:''}<h3>${n.title}</h3><p>${n.text}</p></article>`).join(''));
 $('galleryGrid')&&($('galleryGrid').innerHTML=(d.gallery||[]).map(m=>`<article class="media-card">${(m.type||'').toLowerCase().includes('video')?`<video src="${m.url}" controls></video>`:`<img src="${m.url}" onerror="this.style.display=\'none\'">`}<h3>${m.title}</h3></article>`).join(''));
 $('historyBox')&&($('historyBox').innerHTML=`<h2>Historia</h2>${d.historyPhoto?`<img src="${d.historyPhoto}" style="max-width:320px;border-radius:18px">`:''}<p>${d.history}</p><h3>Presidente actual: ${d.president}</h3>`);
 $('presidentsGrid')&&($('presidentsGrid').innerHTML=(d.presidents||[]).map(p=>`<article class="president-card">${p.image?`<img src="${p.image}" onerror="this.style.display=\'none\'">`:''}<h3>${p.name}</h3><p>${p.period}</p></article>`).join(''));
}
function renderAdminLists(){const d=getData(); const list=(id,arr,fn)=>$(id)&&($(id).innerHTML=(arr||[]).map((x,i)=>`<div class="list-item"><span>${fn(x)}</span><button onclick="delItem('${id}',${i})">Eliminar</button></div>`).join('')); list('sponsorsList',d.sponsors,x=>x.name);list('resultsList',d.results,x=>x.match+' '+x.score);list('newsList',d.news,x=>x.title);list('galleryList',d.gallery,x=>x.title);list('fixtureList',d.fixture_images,x=>x.title);list('presidentsList',d.presidents,x=>x.name);list('directorsList',d.directors,x=>x.role+' '+x.name);}
function renderAll(){renderPublic();renderAdminLists()}
window.delItem=async(id,i)=>{const d=getData(); const map={sponsorsList:'sponsors',resultsList:'results',newsList:'news',galleryList:'gallery',fixtureList:'fixture_images',presidentsList:'presidents',directorsList:'directors'};d[map[id]].splice(i,1);await saveAll(d)}
function bindAdmin(){if(!$('adminPanel'))return; $('loginBtn').onclick=()=>{if($('adminPassword').value!==ADMIN_PASS)return alert('Clave incorrecta');$('loginPanel').classList.add('hidden');$('adminPanel').classList.remove('hidden');fillAdmin();renderAll()}; document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.tab-content').forEach(x=>x.classList.add('hidden'));$('tab-'+b.dataset.tab).classList.remove('hidden')}); const cfg=getCfg(); if($('supabaseUrl'))$('supabaseUrl').value=cfg.url||''; if($('supabaseKey'))$('supabaseKey').value=cfg.key||'';
 $('saveSupabase').onclick=async()=>{setCfg($('supabaseUrl').value,$('supabaseKey').value);try{await testSB();status('Estado: conectado a Supabase.');alert('Conexión guardada')}catch(e){console.error(e);status('Error conexión: '+e.message);alert('Error conexión')}};
 $('loadCloud').onclick=async()=>{try{const d=await pullCloud();saveData(d);renderAll();status('Estado: datos cargados desde Supabase.')}catch(e){console.error(e);alert('No se pudo cargar: '+e.message)}};
 $('saveCloud').onclick=async()=>{await saveAll(getData())};
 $('saveGeneral').onclick=async()=>{let d=getData();d.homeIntro=$('homeIntroInput').value;d.metrics.members=$('metricMembers').value;d.metrics.titles=$('metricTitles').value;await saveAll(d)};
 $('saveMatch').onclick=async()=>{let d=getData();d.nextMatch.rival=$('matchRival').value;d.nextMatch.date=$('matchDate').value;d.nextMatch.place=$('matchPlace').value;d.nextMatch.logo=$('matchLogoFile').files[0]?await uploadFile($('matchLogoFile').files[0],'logos'):$('matchLogoUrl').value;await saveAll(d)};
 $('saveHistory').onclick=async()=>{let d=getData();d.history=$('historyText').value;d.president=$('presidentName').value;if($('historyPhoto').files[0])d.historyPhoto=await uploadFile($('historyPhoto').files[0],'history');await saveAll(d)};
 $('addDirector').onclick=async()=>{let d=getData();d.directors.push({role:$('directorRole').value,name:$('directorName').value});await saveAll(d)};
 $('addPresident').onclick=async()=>{let d=getData();d.presidents.push({name:$('presidentGalleryName').value,period:$('presidentPeriod').value,image:await uploadFile($('presidentPhoto').files[0],'presidents')});await saveAll(d)};
 $('addResult').onclick=async()=>{let d=getData();d.results.unshift({date:$('resultDate').value,match:$('resultMatch').value,score:$('resultScore').value});await saveAll(d)};
 $('addNews').onclick=async()=>{let d=getData();d.news.unshift({title:$('newsTitle').value,text:$('newsText').value,date:new Date().toLocaleDateString('es-CL'),image:await uploadFile($('newsImage').files[0],'news')});await saveAll(d)};
 $('addMedia').onclick=async()=>{let d=getData();let f=$('mediaFile').files[0];d.gallery.unshift({title:$('mediaTitle').value,type:f&&f.type.startsWith('video')?'Video':'Foto',url:f?await uploadFile(f,'gallery'):$('mediaUrl').value});await saveAll(d)};
 $('addFixture').onclick=async()=>{let d=getData();d.fixture_images.unshift({title:$('fixtureTitle').value,image:await uploadFile($('fixtureImage').files[0],'fixture')});await saveAll(d)};
 $('addSponsor').onclick=async()=>{let d=getData();let f=$('sponsorFile').files[0];d.sponsors.push({name:$('sponsorName').value,url:f?await uploadFile(f,'sponsors'):$('sponsorUrl').value});await saveAll(d)};
 $('addStanding').onclick=async()=>{let d=getData();let s=$('standingSerie').value;d.standings[s]=d.standings[s]||[];d.standings[s].push({team:$('teamName').value,pj:$('pj').value,pg:$('pg').value,pe:$('pe').value,pp:$('pp').value,gf:$('gf').value,gc:$('gc').value,dg:(+$('gf').value||0)-(+$('gc').value||0),pts:$('pts').value});await saveAll(d)};
 $('exportBackup').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(getData(),null,2)],{type:'application/json'}));a.download='respaldo_ricardo_mendez.json';a.click()};
 $('importBackup').onchange=e=>{const r=new FileReader();r.onload=()=>{saveData(JSON.parse(r.result));renderAll()};r.readAsText(e.target.files[0])};
}
function fillAdmin(){const d=getData(); if($('homeIntroInput'))$('homeIntroInput').value=d.homeIntro;$('metricMembers')&&($('metricMembers').value=d.metrics.members);$('metricTitles')&&($('metricTitles').value=d.metrics.titles);$('matchRival')&&($('matchRival').value=d.nextMatch.rival);$('matchDate')&&($('matchDate').value=d.nextMatch.date);$('matchPlace')&&($('matchPlace').value=d.nextMatch.place);$('historyText')&&($('historyText').value=d.history);$('presidentName')&&($('presidentName').value=d.president);$('standingSerie')&&($('standingSerie').innerHTML=SERIES.map(s=>`<option>${s}</option>`).join(''))}
document.addEventListener('DOMContentLoaded',async()=>{bindAdmin();try{if(initSB()){const d=await pullCloud();saveData(d)}}catch(e){console.warn('Carga cloud omitida',e.message)}renderAll()});

window.CDRM_HEALTH=()=>({ok:true,version:'final3',hasData:!!localStorage.getItem(DATA_KEY),hasSupabase:!!supabaseClient});


/* PRO1: limpieza de fondo blanco al cargar logos/imágenes */
async function removeWhiteBackgroundFile(file){
  if(!file || !file.type || !file.type.startsWith('image/')) return file;
  return new Promise((resolve)=>{
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = ()=>{
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img,0,0);
      try{
        const data = ctx.getImageData(0,0,canvas.width,canvas.height);
        for(let i=0;i<data.data.length;i+=4){
          const r=data.data[i], g=data.data[i+1], b=data.data[i+2], a=data.data[i+3];
          // Quita blanco/gris claro de fondos. Mantiene colores principales.
          if(a>0 && r>232 && g>232 && b>232){
            data.data[i+3]=0;
          }else if(a>0 && r>218 && g>218 && b>218){
            data.data[i+3]=Math.round(a*0.18);
          }
        }
        ctx.putImageData(data,0,0);
        canvas.toBlob((blob)=>{
          URL.revokeObjectURL(url);
          if(!blob) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.png', {type:'image/png'}));
        }, 'image/png');
      }catch(e){
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };
    img.onerror=()=>{URL.revokeObjectURL(url);resolve(file)};
    img.src=url;
  });
}

const originalUploadFile = typeof uploadFile === 'function' ? uploadFile : null;
if(originalUploadFile){
  uploadFile = async function(file, folder){
    const clean = await removeWhiteBackgroundFile(file);
    return originalUploadFile(clean, folder);
  }
}


/* SISTEMA PRO BLUE: cinta superior de auspiciadores */
function renderSponsorTicker(d){
  d = d || getData();
  const el = document.getElementById('sponsorTicker');
  if(!el) return;
  const list = (d.sponsors && d.sponsors.length ? d.sponsors : (window.CDRM_DEFAULT_SPONSORS || []));
  const items = [...list, ...list];
  el.innerHTML = items.map(s => `
    <div class="ticker-sponsor">
      <img class="ticker-sponsor-img" src="${s.url||''}" alt="${s.name||''}" onerror="this.style.display='none'">
      <span>${s.name||''}</span>
    </div>
  `).join('');
}


/* ESTADIO USER FINAL: limpieza fuerte de fondo blanco en logos */
async function cleanLogoWhiteBackground(file){
  if(!file || !file.type || !file.type.startsWith('image/')) return file;
  return new Promise(resolve=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      const c=document.createElement('canvas');
      c.width=img.naturalWidth || img.width;
      c.height=img.naturalHeight || img.height;
      const ctx=c.getContext('2d');
      ctx.drawImage(img,0,0);
      try{
        const data=ctx.getImageData(0,0,c.width,c.height);
        for(let i=0;i<data.data.length;i+=4){
          const r=data.data[i],g=data.data[i+1],b=data.data[i+2],a=data.data[i+3];
          // remove white/light backgrounds
          if(a>0 && r>228 && g>228 && b>228){
            data.data[i+3]=0;
          }else if(a>0 && r>210 && g>210 && b>210){
            data.data[i+3]=Math.round(a*0.12);
          }
        }
        ctx.putImageData(data,0,0);
        c.toBlob(blob=>{
          URL.revokeObjectURL(url);
          if(!blob) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.[^.]+$/,'')+'.png', {type:'image/png'}));
        },'image/png');
      }catch(e){
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };
    img.onerror=()=>{URL.revokeObjectURL(url);resolve(file)};
    img.src=url;
  });
}

if(typeof uploadFile==='function' && !window.__cleanLogoFinal){
  window.__cleanLogoFinal=true;
  const oldUploadFile=uploadFile;
  uploadFile=async function(file,folder){
    const mustClean = folder === 'sponsors' || folder === 'logos' || folder === 'presidents';
    const clean = mustClean ? await cleanLogoWhiteBackground(file) : file;
    return oldUploadFile(clean,folder);
  }
}

function renderSponsorTickerFinal(d){
  d=d||getData();
  const el=document.getElementById('sponsorTicker');
  if(!el) return;
  const list=(d.sponsors&&d.sponsors.length?d.sponsors:(window.CDRM_DEFAULT_SPONSORS||[]));
  const items=[...list,...list];
  el.innerHTML=items.map(s=>`
    <div class="ticker-sponsor">
      <img class="ticker-sponsor-img" src="${s.url||''}" alt="${s.name||''}" onerror="this.style.display='none'">
      <span>${s.name||''}</span>
    </div>
  `).join('');
}


/* PRO2026 overrides */
function proSponsorFallback(img){const name=img.getAttribute('alt')||'AUSPICIADOR';const box=img.closest('.sponsor-logo-box')||img.parentElement;img.style.display='none';if(box&&!box.querySelector('.sponsor-fallback-pro')){const d=document.createElement('div');d.className='sponsor-fallback-pro';d.textContent=name;box.appendChild(d)}}
function proImg(url,name,cls=''){if(!url)return `<div class="sponsor-fallback-pro">${name||'SIN IMAGEN'}</div>`;return `<img class="${cls}" src="${url}" alt="${name||''}" onerror="proSponsorFallback(this)">`}
function renderSponsors(d){d=d||getData();const el=document.getElementById('sponsorsGrid');if(!el)return;const list=(d.sponsors&&d.sponsors.length?d.sponsors:(window.CDRM_DEFAULT_SPONSORS||[]));el.innerHTML=list.map(s=>`<article class="sponsor-card"><div class="sponsor-logo-box">${proImg(s.url,s.name,'sponsor-img-pro')}</div><h3>${s.name||''}</h3></article>`).join('')}
function renderSponsorTicker(d){d=d||getData();const el=document.getElementById('sponsorTicker');if(!el)return;const list=(d.sponsors&&d.sponsors.length?d.sponsors:(window.CDRM_DEFAULT_SPONSORS||[]));const items=[...list,...list];el.innerHTML=items.map(s=>`<div class="ticker-sponsor">${proImg(s.url,s.name,'ticker-sponsor-img')}<span>${s.name||''}</span></div>`).join('')}
async function cleanLogoWhiteBackground(file){if(!file||!file.type||!file.type.startsWith('image/'))return file;return new Promise(resolve=>{const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{const c=document.createElement('canvas');c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);try{const data=ctx.getImageData(0,0,c.width,c.height);for(let i=0;i<data.data.length;i+=4){const r=data.data[i],g=data.data[i+1],b=data.data[i+2],a=data.data[i+3];if(a>0&&r>228&&g>228&&b>228)data.data[i+3]=0;else if(a>0&&r>210&&g>210&&b>210)data.data[i+3]=Math.round(a*.1)}ctx.putImageData(data,0,0);c.toBlob(blob=>{URL.revokeObjectURL(url);if(!blob)return resolve(file);resolve(new File([blob],file.name.replace(/\.[^.]+$/,'')+'.png',{type:'image/png'}))},'image/png')}catch(e){URL.revokeObjectURL(url);resolve(file)}};img.onerror=()=>{URL.revokeObjectURL(url);resolve(file)};img.src=url})}
if(typeof uploadFile==='function'&&!window.__pro2026Upload){window.__pro2026Upload=true;const oldUpload=uploadFile;uploadFile=async function(file,folder){const clean=(folder==='sponsors'||folder==='logos'||folder==='presidents')?await cleanLogoWhiteBackground(file):file;return oldUpload(clean,folder)}}


/* REFERENCIA PRO: overrides finales */
function proSponsorFallback(img){
  const name = img.getAttribute('alt') || 'AUSPICIADOR';
  const box = img.closest('.logo-box,.sponsor-logo-box') || img.parentElement;
  img.style.display='none';
  if(box && !box.querySelector('.sponsor-fallback-pro')){
    const d=document.createElement('div');
    d.className='sponsor-fallback-pro';
    d.textContent=name;
    box.appendChild(d);
  }
}
function proImg(url,name,cls=''){
  if(!url) return `<div class="sponsor-fallback-pro">${name||'SIN IMAGEN'}</div>`;
  return `<img class="${cls}" src="${url}" alt="${name||''}" onerror="proSponsorFallback(this)">`;
}
function renderSponsors(d){
  d=d||getData();
  const el=document.getElementById('sponsorsGrid');
  if(!el)return;
  const list=(d.sponsors&&d.sponsors.length?d.sponsors:(window.CDRM_DEFAULT_SPONSORS||[]));
  el.innerHTML=list.map(s=>`<article class="sponsor-card"><div class="sponsor-logo-box">${proImg(s.url,s.name,'sponsor-img')}</div><h3>${s.name||''}</h3></article>`).join('');
}
function renderSponsorTicker(d){
  d=d||getData();
  const el=document.getElementById('sponsorTicker');
  if(!el)return;
  const list=(d.sponsors&&d.sponsors.length?d.sponsors:(window.CDRM_DEFAULT_SPONSORS||[]));
  const items=[...list,...list];
  el.innerHTML=items.map(s=>`<div class="ticker-sponsor"><div class="ticker-logo-box">${proImg(s.url,s.name,'ticker-sponsor-img')}</div><span>${s.name||''}</span></div>`).join('');
}
function renderHomePreviews(d){
  d=d||getData();
  const n=document.getElementById('homeNewsPreview');
  if(n){
    const news=(d.news||[]).slice(0,3);
    n.innerHTML=news.length?news.map(x=>`<article>${x.image?`<img src="${x.image}" onerror="this.style.display='none'">`:''}<div><b>${x.title||'Noticia'}</b><p>${(x.text||'').slice(0,72)}</p></div></article>`).join(''):`<article><div><b>Inicio de temporada</b><p>El club prepara sus series para una nueva competencia.</p></div></article><article><div><b>Campaña de socios</b><p>Súmate a la familia Ricardo Méndez.</p></div></article>`;
  }
  const g=document.getElementById('homeGalleryPreview');
  if(g){
    const gal=(d.gallery||[]).slice(0,4);
    g.innerHTML=gal.length?gal.map(x=>`${(x.type||'').toLowerCase().includes('video')?`<video src="${x.url}" muted></video>`:`<img src="${x.url}" onerror="this.style.display='none'">`}`).join(''):`<div></div><div></div><div></div><div></div>`;
  }
}
async function cleanLogoWhiteBackground(file){
  if(!file||!file.type||!file.type.startsWith('image/')) return file;
  return new Promise(resolve=>{
    const img=new Image(); const url=URL.createObjectURL(file);
    img.onload=()=>{
      const c=document.createElement('canvas'); c.width=img.naturalWidth||img.width; c.height=img.naturalHeight||img.height;
      const ctx=c.getContext('2d'); ctx.drawImage(img,0,0);
      try{
        const data=ctx.getImageData(0,0,c.width,c.height);
        for(let i=0;i<data.data.length;i+=4){
          const r=data.data[i],g=data.data[i+1],b=data.data[i+2],a=data.data[i+3];
          if(a>0&&r>228&&g>228&&b>228)data.data[i+3]=0;
          else if(a>0&&r>210&&g>210&&b>210)data.data[i+3]=Math.round(a*.10);
        }
        ctx.putImageData(data,0,0);
        c.toBlob(blob=>{URL.revokeObjectURL(url);if(!blob)return resolve(file);resolve(new File([blob],file.name.replace(/\.[^.]+$/,'')+'.png',{type:'image/png'}))},'image/png');
      }catch(e){URL.revokeObjectURL(url);resolve(file)}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);resolve(file)}; img.src=url;
  });
}
if(typeof uploadFile==='function'&&!window.__refProUpload){
  window.__refProUpload=true;
  const oldUpload=uploadFile;
  uploadFile=async function(file,folder){
    const clean=(folder==='sponsors'||folder==='logos'||folder==='presidents')?await cleanLogoWhiteBackground(file):file;
    return oldUpload(clean,folder);
  }
}
