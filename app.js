// 危老檢查你我他：地址查詢＋3D 里分數＋可自訂疊圖
// 底圖：config.js 有 Google 金鑰就用 Google 地圖（GoogleMapsOverlay），否則用 MapLibre＋OpenFreeMap（MapboxOverlay）。
(() => {
const CFG = Object.assign({googleMapsApiKey:'',googleMapId:''}, window.WEILAO_CONFIG||{});
const qs = new URLSearchParams(location.search);
if (qs.get('key')) CFG.googleMapsApiKey = qs.get('key');
if (qs.get('mapId')) CFG.googleMapId = qs.get('mapId');
if (qs.get('engine') === 'free') CFG.googleMapsApiKey = '';

const $ = id => document.getElementById(id);
const HOME = {lng:121.545, lat:25.075, zoom:11.2};
const hex = h => [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pct = x => (x*100).toFixed(1)+'%';
const store = {get(k,d){try{const v=localStorage.getItem('weilao:'+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem('weilao:'+k,JSON.stringify(v))}catch(e){}}};

// ---------- palettes ----------
const PAL = {
  score: {orange:['#fbe7d2','#f6bc85','#ef8d42','#e8650a','#a53d05'], blue:['#e4e8fb','#aab7f2','#7088e8','#3f5ad8','#1f2f86'], heat:['#fff3b0','#ffd23f','#f59a23','#d9480f','#141414']},
  liq:   {blue:['#3f5ad8','#8a9cec','#d4dbf8'], orange:['#a53d05','#ef8d42','#fbd7b5'], ink:['#141414','#6b6b6b','#c9c9c9']},
  old:   {violet:['#f1e9fb','#c9b0ee','#9a72de','#6d3fc6','#3f1f86'], green:['#e6f5e1','#a9dd9c','#5fbf5a','#2f8f3a','#145a22'], orange:['#fbe7d2','#f6bc85','#ef8d42','#e8650a','#a53d05']},
  house: {ink:['#141414','#b9b2a6'], orange:['#e8650a','#c9c1b4'], blue:['#3f5ad8','#c9c1b4']},
  twin:  {orange:['#a53d05','#e8650a','#f6bc85','#efe6d6'], red:['#8b1a17','#e5322d','#f4a9a6','#efe6d6'], violet:['#3f1f86','#7a4fd6','#c9b0ee','#efe6d6']},
  fire:  {red:['#e5322d'], blue:['#3f5ad8'], ink:['#141414']}
};
const PALNAME={orange:'橘色',blue:'藍色',heat:'黃到黑',ink:'黑色',violet:'紫色',green:'綠色',yellow:'黃色',red:'紅色'};
const LAYERS = [
  {k:'score', name:'危老分數（3D 柱）', tag:'A 版分數', on:true, op:.92, pal:'orange', desc:'每個里依分數升高，顏色越深分數越高。'},
  {k:'twin', name:'雙老熱區（人老＋屋老）', tag:'真實／推估', on:false, op:.85, pal:'orange', desc:'65 歲以上比例和 30 年以上老屋比例「都」在全市前 1/4 的里（門檻：高齡 ≥ 27.5%、老屋 ≥ 93%）。切到 2035 用同一個門檻，看熱區擴大多少。'},
  {k:'liq', name:'土壤液化潛勢', tag:'真實', on:false, op:.55, pal:'blue', desc:'高／中／低潛勢範圍。'},
  {k:'house', name:'逐棟屋齡（實價登錄成交樣本）', tag:'成交樣本', on:false, op:.85, pal:'ink', desc:'只有 2011–2026 年有成交紀錄的建物，約占全市 28%，而且偏新，不是全部建物；屋齡用登錄的建築完成年，座標依門牌定位（第三方整理）。'},
  {k:'old', name:'高齡人口比例', tag:'真實', on:false, op:.75, pal:'violet', desc:'65 歲以上人口比例，以里為單位。'},
  {k:'fire', name:'火災搶救困難、長巷道', tag:'真實', on:false, op:.9, pal:'red', desc:'消防局列管的 185 處巷道。清冊只有路名，線是用那條巷子的門牌排出來的大致走向，不是精確的道路線；185 處中 179 處畫得出線，其餘 6 處門牌不足，只列在該里的查詢結果。'}
];
// 各圖層資料來源（頁尾與面板共用）
const DT=id=>'https://data.taipei/dataset/detail?id='+id;
const SRC={
  liq:[['臺北市土壤液化潛勢圖（工務局，2016–2018 調查）',DT('ec40e067-930f-4058-b7dc-71399d5f3147')]],
  old:[['臺北市各里人口數按年齡分（民政局，115 年 9 月）',DT('a6394e3f-3514-4542-87bd-de4310a40db3')]],
  house:[['不動產實價登錄（內政部，2011–2026 成交）','https://plvr.land.moi.gov.tw/DownloadOpenData'],['座標整理版 taiwan-lvr-geodata（第三方）','https://github.com/monkey1wizard/taiwan-lvr-geodata'],['核對用：臺北市歷年使用執照摘要（建管處）',DT('c876ff02-af2e-4eb8-bd33-d444f5052733')]],
  fire:[['臺北市消防通道清冊（消防局）',DT('7a800e92-eb22-461f-b29d-8def2127a1bc')],['定位用：內政部門牌位置資料（taiwan-address-data 整理版）','https://github.com/monkey1wizard/taiwan-address-data']]
};
SRC.twin=[...SRC.old,SRC.house[0]];
SRC.score=[...SRC.liq,...SRC.old,SRC.house[0],['村（里）界（內政部國土測繪中心，taiwan-atlas 簡化版）','https://www.npmjs.com/package/taiwan-atlas']];
const srcHtml=k=>SRC[k].map(([t,u])=>`<a href="${u}" target="_blank" rel="noopener">${t}</a>`).join('、');
const PRESETS = [
  {id:'bal',label:'均衡',w:{liq:40,old:30,house:30}},
  {id:'dis',label:'防災優先',w:{liq:50,old:20,house:30}},
  {id:'eld',label:'照顧高齡',w:{liq:30,old:50,house:20}}
];
const st = store.get('layers3', {});
const AREA=['score','twin','old','liq'];
let yr=0; // 0 現在、1 2035 推估、2 變化（2035 減現在）
let TP=.2753,TH=.9306,DB='top'; // 雙老門檻（現在的全市前 1/4）、啞鈴圖排序
function applyYear(){for(const v of V){v.s=yr?v.s1:v.s0;v.r=yr?v.r1:v.r0;v.pt=yr?v.pt1:v.pt0;v.pa=yr?v.p1:v.p0;v.ha=yr?v.h1:v.h0;v.isNew=v.r1<=30&&v.r0>30;v.ds=v.s1-v.s0;v.tw=twinCls(v)}}
// 雙老分類：0 現在就是熱區、1 到 2035 才變熱區、2 只有一老、3 都不是
const both=(p,h)=>(p>=TP)+(h>=TH);
function twinCls(v){const a=both(v.p0,v.h0),b=both(v.p1,v.h1);if(!yr)return a===2?0:a===1?2:3;return a===2?0:b===2?1:b===1?2:3}
const TWN=['現在就是雙老熱區','到 2035 變成雙老熱区'.replace('区','區'),'只有一老（人老或屋老）','都不高'];
const YL=()=>yr?'2035 推估':'現在';
const q75=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length*.75)]; // 面狀圖層一次只開一層，才不會疊成一片灰
const L = Object.fromEntries(LAYERS.map(l=>[l.k,{...l,...(st[l.k]||{})}]));
let preset = store.get('preset','bal');
let houseOldOnly = store.get('houseOldOnly', true);
let colH = store.get('colH', 1);
let is3d = true, zoomNow = HOME.zoom;
// 拉近時把柱子壓低，才不會擋住街道和其他疊圖
const elevK = () => Math.min(1, Math.pow(2, (11.6 - zoomNow) * 0.9));

// ---------- data ----------
let V=[], LIQ=[], HOUSES=null, MAT=[], ADDR=null, FIRE=[], FIRELN=[];
let sel=null, pin=null, N=0;
const load = u => fetch(u).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r.json()});

function cen(rings){const r=rings.reduce((a,b)=>b.length>a.length?b:a);let x=0,y=0;for(const p of r){x+=p[0];y+=p[1]}return [x/r.length,y/r.length]}
function bbox(rings){let b=[180,90,-180,-90];for(const r of rings)for(const[x,y]of r){if(x<b[0])b[0]=x;if(y<b[1])b[1]=y;if(x>b[2])b[2]=x;if(y>b[3])b[3]=y}return b}
const inRing=(x,y,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const[xi,yi]=r[i],[xj,yj]=r[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c};
const inPoly=(x,y,rings)=>{let c=false;for(const r of rings)if(inRing(x,y,r))c=!c;return c};
const findV=(x,y)=>V.find(v=>x>=v.b[0]&&x<=v.b[2]&&y>=v.b[1]&&y<=v.b[3]&&inPoly(x,y,v.rings));

function weights(){return PRESETS.find(p=>p.id===preset).w}
const wl=()=>{const w=weights();return `液化 ${w.liq}／高齡 ${w.old}／老屋 ${w.house}`};
function rescore(){const w=weights(),t=w.liq+w.old+w.house;
  const P=x=>[100*w.liq/t*x[0],100*w.old/t*x[1],100*w.house/t*x[2]];
  for(const v of V){v.pt0=P(v.x0);v.pt1=P(v.x1);v.s0=Math.round(v.pt0[0]+v.pt0[1]+v.pt0[2]);v.s1=Math.round(v.pt1[0]+v.pt1[1]+v.pt1[2])}
  [...V].sort((a,b)=>b.s0-a.s0||b.L-a.L||b.p0-a.p0).forEach((v,i)=>v.r0=i+1);
  [...V].sort((a,b)=>b.s1-a.s1||b.L-a.L||b.p1-a.p1).forEach((v,i)=>v.r1=i+1);
  applyYear();top10();stats();dumbbell();
  $('wlabel').textContent=yr===2?'顏色與柱高＝十年內分數增加多少':wl();
  $('wdesc').textContent=`權重：液化面積 ${w.liq}、高齡人口 ${w.old}、老屋比例 ${w.house}。換權重後排名會重算。`}

// ---------- layers ----------
const ramp = (arr,t) => hex(arr[Math.max(0,Math.min(arr.length-1,Math.floor(t*arr.length)))]);
const DPAL=['#fff0ee','#f9b4ab','#ef6a5c','#d62e1f','#7a120a']; // 變化模式色階（固定刻度 0–30 分）
const A = op => Math.round(op*255);
let ver = 0;
// 柱高（3D 時外框要畫在柱頂，才不會看起來浮在半空）
// 拉近查某一里時，其他柱子壓低變淡，才不會擋住你查的里
const focusOn=()=>sel&&is3d&&zoomNow>=12.8;
const colZ=v=>is3d?(yr===2?Math.max(v.ds,1)*40:Math.max(v.s,2)*14)*colH*(focusOn()&&v!==sel?.08:1):0;
const topZ=v=>L.score.on&&is3d?colZ(v)*elevK()+2:0;
const ringPaths=v=>{const z=topZ(v);return v.rings.map(r=>r.map(([x,y])=>[x,y,z]))};
function buildLayers(){
  const D = deck, out = [];
  if (!V.length) return out;
  const selCode = sel && sel.code;
  // 里界底線
  out.push(new D.PolygonLayer({id:'outline',data:V,getPolygon:v=>v.rings,filled:false,stroked:true,getLineColor:[20,20,20,90],lineWidthMinPixels:.6,pickable:false}));
  if (L.old.on) out.push(new D.PolygonLayer({id:'old',data:V,getPolygon:v=>v.rings,stroked:false,
    getFillColor:v=>[...ramp(PAL.old[L.old.pal],(v.pa-0.15)/0.25),A(L.old.op)],updateTriggers:{getFillColor:[L.old.pal,L.old.op,yr]},pickable:true,onClick:clickV}));
  if (L.twin.on) out.push(new D.PolygonLayer({id:'twin',data:V,getPolygon:v=>v.rings,stroked:true,getLineColor:v=>v.tw<2?[20,20,20,200]:[20,20,20,0],lineWidthMinPixels:1.2,
    getFillColor:v=>[...hex(PAL.twin[L.twin.pal][v.tw]),A(L.twin.op*(v.tw===3?.45:1))],updateTriggers:{getFillColor:[L.twin.pal,L.twin.op,yr,ver],getLineColor:[yr,ver]},transitions:{getFillColor:{duration:700}},pickable:true,onClick:clickV}));
  if (L.liq.on) out.push(new D.PolygonLayer({id:'liq',data:LIQ,getPolygon:d=>d.poly,stroked:false,
    getFillColor:d=>[...hex(PAL.liq[L.liq.pal][d.c-1]),A(L.liq.op*(d.c===1?1:d.c===2?.8:.6))],updateTriggers:{getFillColor:[L.liq.pal,L.liq.op]},pickable:true}));
  if (L.fire.on && !L.score.on) out.push(new D.PolygonLayer({id:'fire',data:V.filter(v=>v.fire.length),getPolygon:v=>v.rings,stroked:true,
    getFillColor:[...hex(PAL.fire[L.fire.pal][0]),A(L.fire.op*.18)],getLineColor:[20,20,20,140],lineWidthMinPixels:1.2,
    updateTriggers:{getFillColor:[L.fire.pal,L.fire.op]},pickable:true,onClick:clickV}));
  if (L.score.on) out.push(new D.PolygonLayer({id:'score',data:V,getPolygon:v=>v.rings,extruded:true,wireframe:true,
    getElevation:colZ,elevationScale:elevK(),
    getFillColor:v=>v.code===selCode?[...hex('#ffd23f'),255]:[...(yr===2?ramp(DPAL,v.ds/30):ramp(PAL.score[L.score.pal],v.s/100)),A(L.score.op*(is3d?1:.72))],
    getLineColor:[20,20,20,160],lineWidthMinPixels:.8,stroked:false,
    material:{ambient:.55,diffuse:.55,shininess:8,specularColor:[40,40,40]},
    updateTriggers:{getFillColor:[L.score.pal,L.score.op,selCode,ver,is3d,yr,focusOn()],getElevation:[ver,colH,is3d,yr,selCode,focusOn()]},
    transitions:{getElevation:{duration:900},getFillColor:{duration:700}},pickable:true,autoHighlight:true,highlightColor:[63,90,216,200],onClick:clickV}));
  if (L.house.on && HOUSES && zoomNow>=13.5) out.push(new D.ScatterplotLayer({id:'house',data:HOUSES.filter(h=>!houseOldOnly||h.age>=30),
    getPosition:h=>[h.x,h.y,is3d&&L.score.on?0:0],getRadius:h=>h.age>=30?7:5,radiusMinPixels:1.5,radiusMaxPixels:5,
    getFillColor:h=>[...hex(PAL.house[L.house.pal][h.age>=30?0:1]),A(L.house.op*.75)],stroked:false,
    updateTriggers:{getFillColor:[L.house.pal,L.house.op]},pickable:true,parameters:{depthCompare:'always'}}));
  if (L.fire.on && FIRE.length){const fc=hex(PAL.fire[L.fire.pal][0]);
    out.push(new D.PathLayer({id:'firecase',data:FIRELN,getPath:d=>d.p,getWidth:zoomNow>=14?10:4.5,widthUnits:'pixels',widthMinPixels:3,capRounded:true,jointRounded:true,
      getColor:[20,20,20,A(L.fire.op)],updateTriggers:{getColor:[L.fire.op],getWidth:[zoomNow>=14]},pickable:false,parameters:{depthCompare:'always'}}));
    out.push(new D.PathLayer({id:'fireln',data:FIRELN,getPath:d=>d.p,getWidth:zoomNow>=14?6:2.5,widthUnits:'pixels',widthMinPixels:2,capRounded:true,jointRounded:true,
      getColor:[...fc,A(L.fire.op)],updateTriggers:{getColor:[L.fire.pal,L.fire.op],getWidth:[zoomNow>=14]},pickable:true,parameters:{depthCompare:'always'}}));
}
  if (yr && (L.score.on||L.old.on)) out.push(new D.PathLayer({id:'newtop',data:V.filter(v=>v.isNew).flatMap(v=>ringPaths(v)),getPath:d=>d,getColor:hex('#3f5ad8'),getWidth:4,widthUnits:'pixels',jointRounded:true,updateTriggers:{getPath:[zoomNow,is3d,yr,colH,ver]}}));
  if (sel) out.push(new D.PathLayer({id:'sel',data:ringPaths(sel),getPath:d=>d,getColor:[20,20,20,255],getWidth:4,widthUnits:'pixels',jointRounded:true,parameters:{depthCompare:'always'}}));
  if (sel) out.push(new D.TextLayer({id:'selname',data:[sel],getPosition:v=>[v.c[0],v.c[1],topZ(v)+30],getText:v=>yr===2?`${v.n}　+${v.ds} 分（${v.s0} → ${v.s1}）`:`${v.n}　${v.s} 分・第 ${v.r} 名`,
    characterSet:'auto',fontFamily:'"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif',fontWeight:900,getSize:15,getColor:[20,20,20],
    background:true,getBackgroundColor:[255,255,255,245],getBorderColor:[20,20,20],getBorderWidth:2.5,backgroundPadding:[8,4],getPixelOffset:[0,-22],
    updateTriggers:{getText:[ver,yr],getPosition:[zoomNow,is3d,yr,colH,ver]},parameters:{depthCompare:'always'}}));
  if (pin) out.push(new D.ScatterplotLayer({id:'pin',data:[pin],getPosition:p=>[p[0],p[1],sel?topZ(sel)+1:0],getRadius:1,radiusUnits:'pixels',radiusMinPixels:10,
    getFillColor:hex('#e8650a'),stroked:true,getLineColor:[20,20,20],lineWidthMinPixels:3,parameters:{depthCompare:'always'}}));
  return out;
}
const TT_STYLE={background:'#ffffff',color:'#141414',border:'3px solid #141414',boxShadow:'4px 4px 0 #141414',borderRadius:'0',padding:'8px 10px',fontSize:'13px',fontFamily:'"Noto Sans TC",sans-serif',maxWidth:'260px'};
function tooltip({object,layer}){
  if(!object||!layer)return null;
  let h='';
  if(['score','old','fire','twin'].includes(layer.id)){const v=object;
    h=`<small style="font-weight:700">${layer.id==='old'?'高齡人口':layer.id==='fire'?'救災巷道所在的里':layer.id==='twin'?'雙老熱區：'+TWN[v.tw]:'危老分數'}</small><br><b style="font-weight:900;font-size:15px">${esc(v.d)} ${esc(v.n)}</b><br>${YL()}分數 <b>${v.s}</b>・第 ${v.r} 名／${N}<br>65 歲以上 ${pct(v.pa)}・老屋 ${pct(v.ha)}${yr===2?`<br>十年內分數 +${v.ds}（${v.s0} → ${v.s1}）`:''}${v.isNew&&yr?'<br><b>2035 新進前 30 名</b>':''}`+(v.fire.length?`<br>救災列管 ${v.fire.length} 處`:'')}
  else if(layer.id==='firec'||layer.id==='fireln'){const f=layer.id==='firec'?object:object.f;h=`<small style="font-weight:700">救災巷道（消防局列管）</small><br><b style="font-weight:900;font-size:15px">${esc(f.n)}</b><br>${esc(f.t)}${f.p?'・'+esc(f.p):''}<br>${esc(f.d)} ${esc(f.v)}${f.e?'':'<br>（找不到門牌，標在里的中心）'}`}
  else if(layer.id==='liq'){h=`<small style="font-weight:700">土壤液化潛勢</small><br><b style="font-weight:900">液化潛勢：${['高','中','低'][object.c-1]}</b>`}
  else if(layer.id==='house'){const o=object;h=`<small style="font-weight:700">屋齡（實價登錄成交樣本）・一棟建物</small><br><b style="font-weight:900">屋齡 ${o.age} 年</b>${o.fl?`・${o.fl} 層`:''}<br>${esc(MAT[o.m]||'')}`}
  else return null;
  return {html:h,style:TT_STYLE};
}

// ---------- map engines ----------
// 自己畫的名牌：游標停在里上就一直顯示，重畫地圖也不會消失
let tipEl=null;
function hover(info){if(!tipEl){tipEl=document.createElement('div');tipEl.className='maptip';tipEl.setAttribute('role','tooltip');$('map').appendChild(tipEl)}
  const t=info&&info.object?tooltip(info):null;
  if(!t){tipEl.hidden=true;return}
  tipEl.innerHTML=t.html;tipEl.hidden=false;
  const W=$('map').clientWidth,w=tipEl.offsetWidth,h=tipEl.offsetHeight;
  tipEl.style.left=Math.max(4,Math.min(info.x+14,W-w-4))+'px';tipEl.style.top=Math.max(4,info.y-h-14)+'px'}
$('map').addEventListener('mouseleave',()=>{if(tipEl)tipEl.hidden=true});
let engine=null; // {setLayers, fly, setPitch, name}
function refresh(){if(engine)engine.setLayers(buildLayers())}

function recolorStyle(style){
  const C={bg:'#f6efe0',water:'#a9b8f3',park:'#e7e3c4',build:'#ece2cf',road:'#ffffff',casing:'#141414',major:'#ffd23f',text:'#141414'};
  for(const l of style.layers){const id=l.id.toLowerCase();l.paint=l.paint||{};
    if(l.type==='background'){l.paint['background-color']=C.bg;continue}
    if(l.type==='fill'){
      if(/water|ocean|river|lake/.test(id))l.paint['fill-color']=C.water;
      else if(/park|wood|grass|forest|landcover|landuse/.test(id))l.paint['fill-color']=C.park;
      else if(/building/.test(id))l.paint['fill-color']=C.build;
      else l.paint['fill-color']=C.bg;
      delete l.paint['fill-pattern'];}
    if(l.type==='fill-extrusion'){l.layout={...(l.layout||{}),visibility:'none'}}
    if(l.type==='line'){
      if(/water|river|stream/.test(id))l.paint['line-color']=C.water;
      else if(/casing/.test(id))l.paint['line-color']=C.casing;
      else if(/motorway|trunk|highway/.test(id))l.paint['line-color']=C.major;
      else if(/road|street|path|bridge|tunnel|primary|secondary|tertiary|minor|service/.test(id))l.paint['line-color']=C.road;
      else if(/boundary|admin/.test(id))l.paint['line-color']='#e8650a';
      else if(/rail|transit/.test(id))l.paint['line-color']='#8c857c';}
    if(l.type==='symbol'){
      if(l.layout&&l.layout['text-field'])l.layout['text-field']=['coalesce',['get','name:zh-Hant'],['get','name:zh'],['get','name']];
      l.paint['text-color']=C.text;l.paint['text-halo-color']='#ffffff';l.paint['text-halo-width']=1.6;
      if(/poi/.test(id))l.layout={...(l.layout||{}),visibility:'none'};}
  }
  return style;
}
async function startFree(){
  let style;
  try{const s=await load('https://tiles.openfreemap.org/styles/positron');style=recolorStyle(s);$('engine').textContent='底圖：OpenFreeMap'}
  catch(e){style={version:8,sources:{},layers:[{id:'bg',type:'background',paint:{'background-color':'#f3ead8'}}]};$('engine').textContent='底圖：離線色塊'}
  const map=new maplibregl.Map({container:'map',style,cooperativeGestures:matchMedia('(pointer:coarse)').matches,center:[HOME.lng,HOME.lat],zoom:HOME.zoom,pitch:50,bearing:-12,maxPitch:70,attributionControl:{compact:true}});
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
  const ov=new deck.MapboxOverlay({interleaved:true,layers:[],onHover:hover});
  map.addControl(ov);
  map.on('zoomend',()=>{const z=map.getZoom();if(Math.abs(z-zoomNow)>.2){zoomNow=z;refresh();legend()}});
  map.on('click',e=>{ if(!ov.pickObject({x:e.point.x,y:e.point.y,radius:2})){const v=findV(e.lngLat.lng,e.lngLat.lat);if(v)selectV(v,null,'')} });
  engine={name:'free',setLayers:l=>ov.setProps({layers:l}),
    fly:(lng,lat,zoom)=>map.flyTo({center:[lng,lat],zoom,pitch:is3d?55:0,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:1400,essential:true}),
    setPitch:p=>map.easeTo({pitch:p,bearing:p?-12:0,duration:600})};
}
function startGoogle(){return new Promise((res,rej)=>{
  window.__gmInit=()=>{try{
    const vec=!!CFG.googleMapId;
    const opt={center:{lat:HOME.lat,lng:HOME.lng},zoom:HOME.zoom+.3,disableDefaultUI:true,zoomControl:true,rotateControl:true,clickableIcons:false,backgroundColor:'#f3ead8',gestureHandling:matchMedia('(pointer:coarse)').matches?'cooperative':'greedy'};
    if(vec){opt.mapId=CFG.googleMapId;opt.tilt=45;opt.heading=-12;opt.renderingType='VECTOR'}else{opt.styles=GSTYLE}
    const el=$('map');el.classList.add('gm');
    const map=new google.maps.Map(el,opt);
    const ov=new deck.GoogleMapsOverlay({interleaved:vec,layers:[],onHover:hover});
    ov.setMap(map);
    map.addListener('zoom_changed',()=>{const z=map.getZoom()-.3;if(Math.abs(z-zoomNow)>.2){zoomNow=z;refresh();legend()}});
    map.addListener('click',e=>{const v=findV(e.latLng.lng(),e.latLng.lat());if(v)selectV(v,null,'')});
    engine={name:'google',setLayers:l=>ov.setProps({layers:l}),
      fly:(lng,lat,zoom)=>{map.moveCamera({center:{lat,lng},zoom:zoom+.3,tilt:vec&&is3d?55:0,heading:vec&&is3d?-12:0})},
      setPitch:p=>{if(vec){map.setTilt(p?55:0);map.setHeading(p?-12:0)}}};
    $('engine').textContent=vec?'底圖：Google 地圖（3D）':'底圖：Google 地圖（需 Map ID 才能 3D）';
    res();
  }catch(e){rej(e)}};
  const s=document.createElement('script');
  s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(CFG.googleMapsApiKey)+'&v=weekly&callback=__gmInit&language=zh-TW&region=TW';
  s.async=true;s.onerror=()=>rej(new Error('Google Maps 載入失敗'));
  window.gm_authFailure=()=>{$('engine').textContent='Google 金鑰無效，改用免費底圖';};
  document.head.appendChild(s);
})}
// 沒有 Map ID 時給 Google 點陣地圖用的樣式（有 Map ID 時請在 Cloud Console 設定雲端樣式）
const GSTYLE=[
 {featureType:'all',elementType:'labels.icon',stylers:[{visibility:'off'}]},
 {featureType:'poi',stylers:[{visibility:'off'}]},
 {featureType:'transit',stylers:[{visibility:'off'}]},
 {featureType:'landscape',elementType:'geometry',stylers:[{color:'#f6efe0'}]},
 {featureType:'water',elementType:'geometry',stylers:[{color:'#a9b8f3'}]},
 {featureType:'road',elementType:'geometry.fill',stylers:[{color:'#ffffff'}]},
 {featureType:'road',elementType:'geometry.stroke',stylers:[{color:'#141414'},{weight:.8}]},
 {featureType:'road.highway',elementType:'geometry.fill',stylers:[{color:'#ffd23f'}]},
 {featureType:'administrative',elementType:'geometry.stroke',stylers:[{color:'#e8650a'},{weight:1.5}]},
 {elementType:'labels.text.fill',stylers:[{color:'#141414'}]},
 {elementType:'labels.text.stroke',stylers:[{color:'#ffffff'},{weight:3}]}
];

// ---------- selection & result ----------
function clickV(info){if(info&&info.object){selectV(info.object,null,'');return true}}
const level=s=>s>=70?'優先關注':s>=50?'建議留意':s>=30?'中等':'相對較低';
const liqAt=(x,y)=>{let c=0;for(const d of LIQ){if(inPoly(x,y,d.poly)&&(!c||d.c<c))c=d.c}return c};
function near(x,y,m){if(!HOUSES)return null;const kx=Math.cos(y*Math.PI/180)*111320,ky=110540;let n=0,o=0,brick=0,max=0;
  for(const h of HOUSES){const dx=(h.x-x)*kx,dy=(h.y-y)*ky;if(dx*dx+dy*dy<=m*m){n++;if(h.age>=30)o++;if(/磚/.test(MAT[h.m]||''))brick++;if(h.age>max)max=h.age}}
  return{n,o,brick,max}}
function selectV(v,xy,addr,warn){sel=v;pin=xy;render(v,addr,xy,warn);refresh();legend();dumbbell();
  if(addr&&matchMedia('(max-width:1000px)').matches)document.querySelector('.result').scrollIntoView({behavior:'smooth',block:'start'});
  const c=xy||[(v.b[0]+v.b[2])/2,(v.b[1]+v.b[3])/2];if(engine)engine.fly(c[0],c[1],xy?14.3:13.4)}
let lastWarn='';
function render(v,addr,xy,warn){lastWarn=warn||'';
  const w=weights();
  const parts=[['液化面積',v.pt[0],w.liq,'高潛勢 '+pct(v.hi)+'・中潛勢 '+pct(v.mid)],['高齡人口',v.pt[1],w.old,'65 歲以上 '+pct(v.pa)+(yr?'（2035 推估）':'')],['老屋比例',v.pt[2],w.house,(yr?'2035 年時 30 年以上 ':'30 年以上 ')+pct(v.ha)+'・實價登錄推估，實際可能更高'+(v.hd?'（這一里成交樣本少，用區平均）':`（成交樣本 ${v.hn} 棟）`)]];
  const t=w.liq+w.old+w.house;
  let nb='';
  if(xy){const r=near(xy[0],xy[1],150);if(r&&r.n)nb=`<div class="box"><h3>這個地址方圓 150 公尺</h3><p>實價登錄有 ${r.n} 棟成交建物，其中 <b>${r.o} 棟屋齡 30 年以上</b>（${Math.round(r.o/r.n*100)}%）${r.brick?`，${r.brick} 棟磚造或加強磚造`:''}；最老 ${r.max} 年。</p></div>`;
    else if(r)nb=`<div class="box"><h3>這個地址方圓 150 公尺</h3><p>實價登錄沒有成交紀錄。</p></div>`}
  const fire=v.fire.length?`<div class="box"><h3>消防局列管 ${v.fire.length} 處</h3><ul>${v.fire.slice(0,5).map(f=>`<li>${esc(f[0])}（${esc(f[1])}${f[2]?'・'+esc(f[2]):''}）</li>`).join('')}${v.fire.length>5?`<li>另有 ${v.fire.length-5} 處</li>`:''}</ul></div>`:'';
  let lq='',lqv='';
  if(xy){const c=liqAt(xy[0],xy[1]);lqv=['','high','mid','low'][c];lq=`<p class="liqline">這個地址：${c?`<b>液化${['高','中','低'][c-1]}潛勢</b>`:'不在液化潛勢圖範圍內（多為山坡地）'}</p>`}
  const warnBox=warn?`<div class="box warn"><h3>注意</h3><p>${esc(warn)}</p></div>`:'';
  const ck='check.html'+(xy?'?'+new URLSearchParams({...(lqv?{liq:lqv}:{}),addr:addr||''}).toString():'');
  $('res').innerHTML=`${warnBox}<div><p class="addr">${esc(addr||'在地圖上點選')}</p><h2 class="vname">${esc(v.d)} ${esc(v.n)}</h2></div>${lq}
  <p class="yrline">現在 ${v.s0} 分・第 ${v.r0} 名 → 2035 ${v.s1} 分・第 ${v.r1} 名${v.isNew?'　<b>2035 新進前 30 名</b>':''}</p>
  <p class="twline">雙老熱區：${both(v.p0,v.h0)===2?'<b>現在就是</b>':both(v.p1,v.h1)===2?'現在不是，<b>2035 會變成熱區</b>':'現在和 2035 都不是'}</p>
  <div class="tiles"><div class="tile"><div class="k">危老分數（${YL()}）</div><div class="v">${v.s}<small>/ 100</small></div></div>
  <div class="tile"><div class="k">全市排名（${YL()}）</div><div class="v">${v.r}<small>/ ${N}</small></div></div></div>
  <div><span class="lvl">里的風險：${level(v.s)}</span>${v.s<30?'<span class="lvlnote">不代表你家這棟安全</span>':''}</div>
  <div class="parts">${parts.map(([k,p,m,raw])=>{const mx=100*m/t;return `<div><div class="prow"><span>${k}</span><div class="track"><div class="bfill${p<=0.05?' z':''}" style="width:${mx?(p/mx*100).toFixed(1):0}%"></div></div><span class="n">${p.toFixed(1)}/${Math.round(mx)}</span></div><p class="raw">${raw}</p></div>`}).join('')}</div>
  ${nb}${fire}
  <a class="checklink" href="${esc(ck)}">自己檢查單棟 →</a>
  <p class="note">分數是這一里的平均狀況，不是這一棟的耐震結果。單棟要看建物結構與耐震評估。</p>`;
}

// ---------- legend & layer panel ----------
function legend(){const g=[];
  if(sel||pin)g.push(`<span class="g"><span class="sw" style="background:#ffd23f"></span>你查的里 <span class="sw" style="background:#e8650a;border-radius:50%"></span>你查的地址</span>`);
  if(L.score.on&&yr===2)g.push(`<span class="g">2035 比現在多幾分：+0<span class="ramp">${DPAL.map(c=>`<i style="background:${c}"></i>`).join('')}</span>+30 以上（柱越高，增加越多）</span>`);
  else if(L.score.on)g.push(`<span class="g">${YL()}分數 0<span class="ramp">${PAL.score[L.score.pal].map(c=>`<i style="background:${c}"></i>`).join('')}</span>100</span>`);
  if(L.twin.on){const c=PAL.twin[L.twin.pal],ix=yr?[0,1,2,3]:[0,2,3];g.push(ix.map(i=>`<span class="g"><span class="sw" style="background:${c[i]}"></span>${TWN[i]}</span>`).join(''))}
  if(L.liq.on)g.push(`<span class="g">液化 ${['高','中','低'].map((n,i)=>`<span class="sw" style="background:${PAL.liq[L.liq.pal][i]}"></span>${n}`).join(' ')}</span>`);
  if(L.house.on&&zoomNow<13.5)g.push('<span class="g">屋齡點：拉近地圖才會顯示</span>');
  else if(L.house.on)g.push(`<span class="g"><span class="sw" style="background:${PAL.house[L.house.pal][0]};border-radius:50%"></span>一棟 30 年以上建物（成交樣本）${houseOldOnly?'':` <span class="sw" style="background:${PAL.house[L.house.pal][1]};border-radius:50%"></span>一棟未滿 30 年建物`}</span>`);
  if(yr&&(L.score.on||L.old.on))g.push('<span class="g"><span class="sw" style="background:transparent;border:3px solid #3f5ad8"></span>2035 新進前 30 名</span>');
  if(L.old.on)g.push(`<span class="g">${yr?'2035 推估 ':''}高齡 15%<span class="ramp">${PAL.old[L.old.pal].map(c=>`<i style="background:${c}"></i>`).join('')}</span>40%</span>`);
  if(L.fire.on)g.push(`<span class="g"><span style="display:inline-block;width:28px;height:7px;background:${PAL.fire[L.fire.pal][0]};border:2px solid #141414;border-radius:4px;vertical-align:middle;margin-right:4px"></span>救災巷道（消防局列管，一條線一處）</span>`);
  $('legend').innerHTML=g.join('')||'<span>沒有開啟的疊圖</span>'}
function setOn(k,v){L[k].on=v;if(v&&AREA.includes(k))AREA.forEach(a=>{if(a!==k)L[a].on=false})}
function save(){store.set('layers3',Object.fromEntries(LAYERS.map(l=>[l.k,{on:L[l.k].on,op:L[l.k].op,pal:L[l.k].pal}])))}
const SHORT={score:'危老分數',twin:'雙老熱區',liq:'液化潛勢',house:'屋齡（成交樣本）',old:'高齡人口',fire:'救災巷道'};
function chips(){const btn=k=>{const c=PAL[k][L[k].pal];return `<button class="chipb" data-k="${k}" aria-pressed="${L[k].on}"><i style="background:${c[Math.floor(c.length/2)]}"></i>${SHORT[k]}</button>`};
  $('chips').innerHTML='<span class="lbl">底色（選一）</span>'+AREA.map(btn).join('')+'<span class="lbl" style="margin-left:10px">加上點位</span>'+['house','fire'].map(btn).join('')}
function chipsOld(){$('chips').innerHTML='<span class="lbl">疊圖</span>'+LAYERS.map(({k})=>{const c=PAL[k][L[k].pal];return `<button class="chipb" data-k="${k}" aria-pressed="${L[k].on}"><i style="background:${c[Math.floor(c.length/2)]}"></i>${SHORT[k]}</button>`}).join('')}
$('chips').addEventListener('click',e=>{const b=e.target.closest('.chipb');if(!b)return;const k=b.dataset.k;setOn(k,!L[k].on);save();panel();chips();legend();refresh()});
function panel(){
  $('presets').innerHTML=PRESETS.map(p=>`<button data-p="${p.id}" aria-pressed="${p.id===preset}">${p.label}</button>`).join('');
  $('laylist').innerHTML=LAYERS.map(({k})=>{const l=L[k];return `<div class="lay" data-k="${k}" ${l.on?'':'data-off'}>
    <div class="lh"><label><input type="checkbox" id="on-${k}" ${l.on?'checked':''}>${l.name}</label><span class="tag ${l.tag==='真實'?'real':''}">${l.tag}</span></div>
    <p class="sub">${l.desc}</p>
    <p class="sub src">來源：${srcHtml(k)}${k==='score'?'（分數＝液化 40＋高齡 30＋老屋 30）':''}</p>
    <div class="lb"><label for="op-${k}">透明度</label><input type="range" id="op-${k}" min="0.1" max="1" step="0.05" value="${l.op}">
    ${k==='score'?`<label for="colh">柱高</label><input type="range" id="colh" min="0.3" max="3" step="0.1" value="${colH}">`:''}
    <span>配色</span><div class="pals">${Object.entries(PAL[k]).map(([pk,arr])=>`<button class="pal" data-pal="${pk}" aria-label="${PALNAME[pk]||pk}配色" aria-pressed="${pk===l.pal}">${arr.map(c=>`<i style="background:${c}"></i>`).join('')}</button>`).join('')}</div></div>
    ${k==='house'?`<label class="chk"><input type="checkbox" id="oldonly" ${houseOldOnly?'checked':''}>只顯示 30 年以上</label>`:''}
  </div>`}).join('');
}
$('laylist').addEventListener('input',e=>{const lay=e.target.closest('.lay');if(!lay)return;const k=lay.dataset.k;
  if(e.target.id==='on-'+k){setOn(k,e.target.checked);panel()}
  else if(e.target.id==='op-'+k)L[k].op=+e.target.value;
  else if(e.target.id==='colh'){colH=+e.target.value;store.set('colH',colH)}
  else if(e.target.id==='oldonly'){houseOldOnly=e.target.checked;store.set('houseOldOnly',houseOldOnly)}
  save();chips();legend();refresh()});
$('laylist').addEventListener('click',e=>{const b=e.target.closest('.pal');if(!b)return;const k=b.closest('.lay').dataset.k;L[k].pal=b.dataset.pal;
  b.parentElement.querySelectorAll('.pal').forEach(x=>x.setAttribute('aria-pressed',x===b));save();chips();legend();refresh()});
$('presets').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;preset=b.dataset.p;store.set('preset',preset);
  $('presets').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));rescore();ver++;if(sel)render(sel,lastAddr,pin,lastWarn);refresh()});
$('v3').onclick=()=>{is3d=true;$('v3').setAttribute('aria-pressed','true');$('v2').setAttribute('aria-pressed','false');engine&&engine.setPitch(55);refresh()};
$('v2').onclick=()=>{is3d=false;$('v2').setAttribute('aria-pressed','true');$('v3').setAttribute('aria-pressed','false');engine&&engine.setPitch(0);refresh()};
function setYear(y){yr=y;if(y===2&&!L.score.on){setOn('score',true);save();chips();panel()}['y0','y1','y2'].forEach((id,i)=>$(id).setAttribute('aria-pressed',i===y));applyYear();ver++;top10();legend();stats();if(sel)render(sel,lastAddr,pin,lastWarn);refresh();
  $('yearnote').hidden=!y;$('modebadge').hidden=y!==2;$('wlabel').textContent=yr===2?'顏色與柱高＝十年內分數增加多少':wl()}
['y0','y1','y2'].forEach((id,i)=>$(id).onclick=()=>setYear(i));
// 全市大字：現在 → 2035
function stats(){if(!V.length)return;const pop=a=>V.reduce((t,v)=>t+a(v),0);
  const c=[['全市 65 歲以上',CITY[0].toFixed(1)+'%',CITY[1].toFixed(1)+'%'],['雙老熱區',V.filter(v=>both(v.p0,v.h0)===2).length+' 里',V.filter(v=>both(v.p1,v.h1)===2).length+' 里'],['危老分數 60 分以上',V.filter(v=>v.s0>=60).length+' 里',V.filter(v=>v.s1>=60).length+' 里']];
  $('stats').innerHTML=c.map(([k,a,b])=>`<div class="stat"><div class="k">${k}</div><div class="v"><span class="cell${yr?'':' on'}"><b>${a}</b><small>現在</small></span><i>→</i><span class="cell${yr?' on':''}"><b>${b}</b><small>2035 推估</small></span></div></div>`).join('')}
const CITY=[24.9,33.3];
// 現在 → 2035 啞鈴圖
function dumbbell(){if(!V.length)return;const list=[...V].sort(DB==='top'?(a,b)=>a.r1-b.r1:(a,b)=>b.ds-a.ds||a.r1-b.r1).slice(0,20);
  const W=620,lw=130,rw=64,top=20,rh=24,H=top+list.length*rh+30,x=s=>lw+(W-lw-rw)*s/100;
  let g=[0,25,50,75,100].map(t=>`<line x1="${x(t)}" x2="${x(t)}" y1="${top-6}" y2="${H-26}" stroke="#d9cfbf" stroke-width="1.5"/><text x="${x(t)}" y="${H-8}" text-anchor="middle" class="ax">${t}</text>`).join('');
  g+=list.map((v,i)=>{const y=top+i*rh+rh/2,on=sel&&sel.code===v.code;return `<g class="row" data-c="${v.code}" tabindex="0" role="button" aria-label="${esc(v.d+' '+v.n)}，現在 ${v.s0} 分，2035 ${v.s1} 分">${on?`<rect x="0" y="${y-rh/2}" width="${W}" height="${rh}" fill="#ffd23f"/>`:''}<rect x="0" y="${y-rh/2}" width="${W}" height="${rh}" fill="transparent"/><text x="${lw-12}" y="${y+5}" text-anchor="end" class="nm">${esc(v.d.replace(/區$/,''))} ${esc(v.n)}${v.isNew?' ★':''}</text><line x1="${x(v.s0)}" x2="${x(v.s1)}" y1="${y}" y2="${y}" stroke="#e8650a" stroke-width="5"/><circle cx="${x(v.s0)}" cy="${y}" r="7" fill="#fff" stroke="#141414" stroke-width="2.5"/><circle cx="${x(v.s1)}" cy="${y}" r="8" fill="#a53d05" stroke="#141414" stroke-width="2.5"/><text x="${W-rw+10}" y="${y+5}" class="vl">${v.s0}→${v.s1}</text></g>`}).join('');
  $('db').innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="現在到 2035 分數變化">${g}</svg>`}
$('db').addEventListener('click',e=>{const r=e.target.closest('.row');if(!r)return;const v=V.find(x=>x.code===r.dataset.c);if(v)selectV(v,null,'')});
$('db').addEventListener('keydown',e=>{if(e.key==='Enter'){const r=e.target.closest('.row');if(r)r.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});
['dbTop','dbRise'].forEach(id=>$(id).onclick=()=>{DB=id==='dbTop'?'top':'rise';$('dbTop').setAttribute('aria-pressed',DB==='top');$('dbRise').setAttribute('aria-pressed',DB==='rise');dumbbell()});
function top10(){if(!V.length)return;const list=[...V].sort((a,b)=>(yr?a.r1-b.r1:a.r0-b.r0)).slice(0,10);
  $('top10h').textContent=`全市前 10 名（${YL()}）`;
  $('top10').innerHTML=list.map(v=>`<li><button data-c="${v.code}"><span class="rk">${yr?v.r1:v.r0}</span><span class="nm">${esc(v.d)} ${esc(v.n)}${yr&&v.isNew?' <em>新進</em>':''}</span><span class="sc">${yr?v.s1:v.s0} 分</span></button></li>`).join('')}
$('top10').addEventListener('click',e=>{const b=e.target.closest('button[data-c]');if(!b)return;const v=V.find(x=>x.code===b.dataset.c);if(v){selectV(v,null,'');if(matchMedia('(max-width:1000px)').matches)document.querySelector('.result').scrollIntoView({behavior:'smooth'})}});
$('home').onclick=()=>engine&&engine.fly(HOME.lng,HOME.lat,HOME.zoom);

// ---------- address search (內政部門牌位置資料) ----------
const CN='〇一二三四五六七八九';
function cnNum(n){n=+n;if(n<=10)return n===10?'十':CN[n];if(n<20)return '十'+(n%10?CN[n%10]:'');return CN[Math.floor(n/10)]+'十'+(n%10?CN[n%10]:'')}
function norm(s){return s.replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/台/g,'臺').replace(/\s+/g,'')
  .replace(/^臺北市/,'').replace(/(\d+)樓.*$/,'').replace(/(\d+)段/g,(m,n)=>cnNum(n)+'段').replace(/-/g,'之')}
function parseQ(raw){let s=norm(raw),dist='';const m=s.match(/^(..區)/);if(m&&ADDR.d.includes(m[1])){dist=m[1];s=s.slice(3)}
  const road=(s.match(/^[^0-9]+/)||[''])[0];let rest=s.slice(road.length);
  const lane=[];let mm;
  while((mm=rest.match(/^(\d+)(巷|弄|衖)/))){lane.push(mm[0]);rest=rest.slice(mm[0].length)}
  const num=(rest.match(/^(\d+(?:之\d*)?)號?/)||[])[1]||'';
  return{dist,road,lane:lane.join(''),num}}
const numCache=new Map();
function nums(i){if(numCache.has(i))return numCache.get(i);const s=ADDR.s[i],p=s[5].split('|'),o=[];
  for(let j=0;j<p.length;j+=3)o.push([p[j],s[3]+(+p[j+1])/1e5,s[4]+(+p[j+2])/1e5]);numCache.set(i,o);return o}
const label=i=>{const s=ADDR.s[i];return '臺北市'+ADDR.d[s[0]]+s[1]+s[2]};
function suggest(raw){if(!ADDR)return[];const q=parseQ(raw);if(!q.road&&!q.dist)return[];
  const cand=[];
  for(let i=0;i<ADDR.s.length;i++){const s=ADDR.s[i];
    if(q.dist&&ADDR.d[s[0]]!==q.dist)continue;
    if(q.road&&!s[1].includes(q.road))continue;
    if(q.lane&&!s[2].startsWith(q.lane))continue;
    cand.push(i)}
  const rank=i=>{const s=ADDR.s[i];return (s[1].startsWith(q.road)?0:2)+(s[2]===q.lane?0:1)};
  cand.sort((a,b)=>rank(a)-rank(b)||ADDR.s[a][2].length-ADDR.s[b][2].length);
  const out=[];
  if(q.num){
    for(const i of cand){if(q.lane&&ADDR.s[i][2]!==q.lane)continue;if(!q.lane&&ADDR.s[i][2]!=='')continue;
      for(const [n,x,y] of nums(i)){if(n===q.num||n.startsWith(q.num.replace(/之$/,'')))out.push({t:'a',main:label(i)+n+'號',sub:'',x,y,ex:n===q.num});}
      if(out.length>40)break}
    out.sort((a,b)=>b.ex-a.ex);
    if(!out.length)for(const i of cand.slice(0,6))out.push(streetItem(i,'找不到這個門牌號，先到這條路'));
  }else{
    const seen=new Set();
    for(const i of cand){const key=ADDR.s[i][0]+ADDR.s[i][1]+ADDR.s[i][2];if(seen.has(key))continue;seen.add(key);out.push(streetItem(i));if(out.length>=8)break}
  }
  return out.slice(0,8)}
function streetItem(i,sub){const a=nums(i),m=a[Math.floor(a.length/2)];return{t:'s',main:label(i),sub:sub||`${a.length} 個門牌・可再輸入門牌號`,x:m[1],y:m[2]}}

const q=$('q'),list=$('list');let items=[],act=-1,lastAddr='';
function hl(s,raw){const t=parseQ(raw).road;const i=t?s.indexOf(t):-1;return i<0?esc(s):esc(s.slice(0,i))+'<mark>'+esc(t)+'</mark>'+esc(s.slice(i+t.length))}
function showList(){list.innerHTML=items.length?items.map((s,i)=>`<li role="option" id="o${i}" aria-selected="${i===act}" data-i="${i}"><span class="pin ${s.t==='s'?'st':''}"><i></i></span><span><b>${hl(s.main,q.value)}</b>${s.sub?`<small>${esc(s.sub)}</small>`:''}</span></li>`).join('')
  :`<li class="empty">${ADDR?'找不到這個地址。請輸入臺北市的路名，例如「廣州街」。':'門牌資料還在載入，請稍等。'}</li>`;
  list.hidden=false;q.setAttribute('aria-expanded','true');q.setAttribute('aria-activedescendant',act>=0?'o'+act:'')}
function hide(){list.hidden=true;q.setAttribute('aria-expanded','false')}
let tmr=0;
q.addEventListener('input',()=>{$('clear').hidden=!q.value;clearTimeout(tmr);tmr=setTimeout(()=>{act=-1;items=suggest(q.value);q.value.trim()?showList():hide()},120)});
q.addEventListener('focus',()=>{if(q.value.trim()&&items.length)showList()});
q.addEventListener('keydown',e=>{if(list.hidden||!items.length)return;
  if(e.key==='ArrowDown'){act=(act+1)%items.length;showList();e.preventDefault()}
  else if(e.key==='ArrowUp'){act=(act-1+items.length)%items.length;showList();e.preventDefault()}
  else if(e.key==='Escape')hide()});
list.addEventListener('mousedown',e=>{const li=e.target.closest('li[data-i]');if(li){e.preventDefault();pick(items[+li.dataset.i])}});
document.addEventListener('click',e=>{if(!e.target.closest('.search'))hide()});
$('clear').addEventListener('click',()=>{q.value='';$('clear').hidden=true;hide();q.focus()});
function pick(s){q.value=s.main+(s.t==='s'?'':'');hide();const v=findV(s.x,s.y);lastAddr=s.main;
  if(s.t==='s'){q.focus();items=suggest(q.value);}
  if(v)selectV(v,[s.x,s.y],s.main,s.t==='s'?'找不到這個門牌，以下是這條路段中間的里，可能不是你家。請輸入完整門牌號。':'');else{$('res').innerHTML='<p class="empty-res">這個地址不在 456 里的範圍內。</p>'}}
$('f').addEventListener('submit',e=>{e.preventDefault();items=suggest(q.value);if(items.length)pick(items[Math.max(act,0)]);else showList()});

// ---------- boot ----------
panel();chips();legend();
// 手機上進階設定預設收起來（桌機是地圖左邊的直式欄）
if(matchMedia('(max-width:1000px)').matches)$('layers').open=false;
// 桌機：進階設定預設收起，左邊箭頭展開／收合，地圖跟著變寬
function toggleSet(){const w=$('mapwrap'),open=w.classList.toggle('shut')===false;$('settab').setAttribute('aria-expanded',open);setTimeout(()=>window.dispatchEvent(new Event('resize')),30)}
$('settab').onclick=toggleSet;
// 桌機上點「進階設定」標題也能收起（手機維持原本的展開／收合）
$('layers').querySelector('summary').addEventListener('click',e=>{if(!matchMedia('(max-width:1000px)').matches){e.preventDefault();toggleSet()}});
// 單棟頁「回里級地圖」會帶 ?q=地址，門牌載入後自動查詢
if(qs.get('q')){q.value=qs.get('q');$('clear').hidden=false}
const enginePromise=(CFG.googleMapsApiKey?startGoogle().catch(err=>{console.warn(err);return startFree()}):startFree()).catch(err=>{console.error(err);$('engine').textContent='地圖載入失敗'});
Promise.all([load('data/villages.json'),load('data/liquefaction.json')]).then(([vs,lq])=>{
  V=vs.map(a=>({code:a[0],d:a[1],n:a[2],x0:[a[3],a[4],a[5]],x1:a[14]?a[14].slice(0,3):[a[3],a[4],a[5]],p1:a[14]?a[14][3]:a[8],h1:a[14]?a[14][4]:a[9],hi:a[6],mid:a[7],p0:a[8],h0:a[9],hd:a[10],fire:a[11],rings:a[12],hn:a[13]||0,b:bbox(a[12]),c:cen(a[12]),L:a[6]+a[7]*.5}));
  N=V.length;TP=q75(V.map(v=>v.p0));TH=q75(V.map(v=>v.h0));
  LIQ=[];for(const[c,mp]of lq)for(const poly of mp)LIQ.push({c,poly}); // MultiPolygon → 每個 polygon 一筆
  rescore();
  return enginePromise}).then(()=>{refresh();$('loading').hidden=true;
    const h=decodeURIComponent(location.hash.slice(1));if(h){q.value=h;items=suggest(h)}})
  .catch(e=>{console.error(e);$('loading').textContent='資料載入失敗'});
load('data/fire.json').then(d=>{FIRE=d;FIRELN=d.flatMap(f=>(f.ln||[]).filter(p=>p.length>1).map(p=>({p,f})));if(L.fire.on)refresh()});
load('data/houses.json').then(d=>{MAT=d.mat;const p=d.p,o=[];for(let i=0;i<p.length;i+=5)if(p[i+2]<=96)o.push({x:p[i],y:p[i+1],age:p[i+2],fl:p[i+3],m:p[i+4]});HOUSES=o;if(L.house.on)refresh();if(sel)render(sel,lastAddr,pin,lastWarn)});
load('data/addresses.json').then(d=>{ADDR=d;$('hint').textContent=`可查 ${d.s.length.toLocaleString()} 條路段巷弄、約 25 萬個門牌（內政部門牌位置資料）。`;
  if(q.value){items=suggest(q.value);if(items.length)pick(items[0])}}).catch(()=>{$('hint').textContent='門牌資料載入失敗，請重新整理。'});
})();
