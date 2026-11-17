'use strict';
/* Núcleo: dados, validação e cálculos. O formato dos dados é o mesmo da v0.8,
   então backups e dados antigos continuam funcionando. */
const KEY='meu-controle-v1';
const payMethods=['Não informado','Dinheiro','Pix','Cartão de débito','Cartão de crédito','Transferência','Outro'];
const workSources=['Uber','99','Corrida particular','Outro trabalho'];
const ID_RE=/^[a-zA-Z0-9_-]{1,100}$/;

const $=s=>document.querySelector(s);
const pad=n=>String(n).padStart(2,'0');
const money=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const localDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>localDate(new Date());
const br=s=>s.split('-').reverse().join('/');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const asInput=cents=>cents?(cents/100).toFixed(2).replace('.',','):'';
function parseAmount(s){s=String(s).trim();if(!/^\d+(?:[.,]\d{1,2})?$/.test(s))return NaN;return Math.round(Number(s.replace(',','.'))*100)}
function dateOK(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00');return Number.isFinite(d.getTime())&&localDate(d)===s}

const defaults=()=>({version:1,categories:[
  {id:'clt',name:'CLT',type:'gain',items:['Salário mensal','Horas extras','Comissão']},
  {id:'sales',name:'Vendas',type:'gain',items:['Bolos','Roupas']},
  {id:'services',name:'Serviços',type:'gain',items:['Diária','Reparos']},
  {id:'driver',name:'Motorista',type:'gain',items:['Uber','99','Corrida particular']},
  ...['Mercado','Manutenção','Creche','Diversão','Água','Luz','Seguro'].map((name,i)=>({id:'expense'+i,name,type:'loss',items:[]}))
],entries:[],opening:0});

let data;
try{const stored=window.EncryptedStore?EncryptedStore.load():localStorage.getItem(KEY);data=stored?JSON.parse(stored):defaults()}
catch(e){document.body.innerHTML='<main><h1>Não foi possível abrir seus dados</h1><p class="text">Feche e abra o aplicativo. Os dados existentes não foram substituídos. Se o problema persistir, restaure seu backup.</p></main>';throw e}

function normalized(s){return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim()}
function ensureExtras(){
  data.budgets??={};data.recurring??=[];data.trash??=[];data.settings??={locationEnabled:false};data.settings.backupInterval??='change';
  if(data.featuresVersion!==7){
    for(const [id,name] of [['fuel','Combustível'],['food','Alimentação'],['leisure','Lazer'],['rent','Aluguel'],['internet','Internet'],['subscriptions','Assinaturas'],['workfees','Taxas de aplicativo']])
      if(!data.categories.some(c=>c.id===id||normalized(c.name)===normalized(name)))data.categories.push({id,name,type:'loss',items:[]});
    data.featuresVersion=7;
  }
}
ensureExtras();

/* Validação de dados importados (backup) */
function entryOK(e,d){
  if(!e||typeof e.id!=='string'||!ID_RE.test(e.id)||!Number.isSafeInteger(e.amount)||e.amount<=0||!['gain','loss'].includes(e.type)||!dateOK(e.date))return false;
  if(!d.categories.some(c=>c.id===e.category&&c.type===e.type))return false;
  if(e.description&&typeof e.description!=='string')return false;
  if(e.item&&typeof e.item!=='string')return false;
  if(e.place!==undefined&&typeof e.place!=='string')return false;
  if(e.payment!==undefined&&!payMethods.includes(e.payment))return false;
  if(e.workSource!==undefined&&!workSources.includes(e.workSource))return false;
  if(e.workCost!==undefined&&typeof e.workCost!=='boolean')return false;
  if(e.location){const l=e.location;if(!(Number.isFinite(l.latitude)&&Math.abs(l.latitude)<=90&&Number.isFinite(l.longitude)&&Math.abs(l.longitude)<=180&&Number.isFinite(l.accuracy)&&l.accuracy>=0&&typeof l.capturedAt==='string'&&Number.isFinite(Date.parse(l.capturedAt))))return false}
  return true;
}
function valid(d){
  if(!d||d.version!==1||!Number.isSafeInteger(d.opening)||!Array.isArray(d.categories)||!Array.isArray(d.entries))return false;
  if(!d.categories.every(c=>c&&typeof c.id==='string'&&ID_RE.test(c.id)&&typeof c.name==='string'&&['gain','loss'].includes(c.type)&&Array.isArray(c.items)&&c.items.every(i=>typeof i==='string')))return false;
  if(new Set(d.categories.map(c=>c.id)).size!==d.categories.length)return false;
  if(!d.entries.every(e=>entryOK(e,d))||new Set(d.entries.map(e=>e.id)).size!==d.entries.length)return false;
  if(d.settings&&typeof d.settings!=='object')return false;
  if(d.settings?.backupInterval!==undefined&&!['change','hour','day'].includes(d.settings.backupInterval))return false;
  if(d.budgets!==undefined&&(!d.budgets||Array.isArray(d.budgets)||typeof d.budgets!=='object'||!Object.entries(d.budgets).every(([k,v])=>d.categories.some(c=>c.id===k&&c.type==='loss')&&Number.isSafeInteger(v)&&v>0)))return false;
  if(d.recurring!==undefined){
    if(!Array.isArray(d.recurring)||new Set(d.recurring.map(r=>r&&r.id)).size!==d.recurring.length)return false;
    if(!d.recurring.every(r=>r&&ID_RE.test(r.id)&&typeof r.name==='string'&&r.name.length<=120&&Number.isSafeInteger(r.amount)&&r.amount>0&&dateOK(r.nextDue)&&['monthly','weekly','yearly'].includes(r.frequency)&&Number.isInteger(r.anchor)&&r.anchor>=1&&r.anchor<=31&&Number.isInteger(r.lead)&&r.lead>=0&&r.lead<=30&&d.categories.some(c=>c.id===r.category&&c.type==='loss')&&payMethods.includes(r.payment)&&typeof r.active==='boolean'))return false;
  }
  if(d.trash!==undefined&&(!Array.isArray(d.trash)||!d.trash.every(t=>t&&dateOK(t.deletedDate)&&entryOK(t.entry,d))))return false;
  return true;
}

/* Período selecionado (único para todas as telas) */
let period='Mês',start=today(),end=today();
function bounds(){
  const d=new Date();let s=today(),e=s;
  if(period==='Semana'){d.setDate(d.getDate()-((d.getDay()+6)%7));s=localDate(d);d.setDate(d.getDate()+6);e=localDate(d)}
  if(period==='Mês'){s=today().slice(0,7)+'-01';e=localDate(new Date(d.getFullYear(),d.getMonth()+1,0))}
  if(period==='Ano'){s=d.getFullYear()+'-01-01';e=d.getFullYear()+'-12-31'}
  if(period==='Período'){s=start;e=end}
  return[s,e];
}
function entries(){const[s,e]=bounds();return data.entries.filter(x=>x.date>=s&&x.date<=e)}
function totals(es){let gain=0,loss=0;es.forEach(x=>x.type==='gain'?gain+=x.amount:loss+=x.amount);return{gain,loss,net:gain-loss}}
function catName(x){return data.categories.find(c=>c.id===x.category)?.name||'Categoria arquivada'}
const name=catName;
const byRecent=(a,b)=>b.date.localeCompare(a.date)||(b.created||0)-(a.created||0);

/* Gastos por categoria (percentuais somam 100,0%) */
const expenseColors=['#167D8D','#B35424','#7752A5','#BF3E68','#547B2D','#3168AB','#A26A0A','#8B4E6E','#267958','#765C3B','#5B5EB3','#AD4339','#647A85','#A65E81','#827620','#285775'];
function expenseBreakdown(records){
  const grouped=new Map();
  for(const r of records){if(r.type!=='loss')continue;grouped.set(r.category,(grouped.get(r.category)||0)+r.amount)}
  const total=[...grouped.values()].reduce((a,b)=>a+b,0);
  if(!total)return{total:0,rows:[]};
  const rows=[...grouped].map(([category,amount])=>({category,amount,name:data.categories.find(c=>c.id===category)?.name||'Categoria arquivada'}))
    .sort((a,b)=>b.amount-a.amount||a.name.localeCompare(b.name,'pt-BR')||a.category.localeCompare(b.category));
  const pct=rows.map((row,index)=>({index,value:Math.floor(row.amount/total*1000),fraction:row.amount/total*1000%1}));
  const left=1000-pct.reduce((s,r)=>s+r.value,0),order=pct.slice().sort((a,b)=>b.fraction-a.fraction||a.index-b.index);
  for(let i=0;i<left;i++)order[i%order.length].value++;
  const lossOrder=data.categories.filter(c=>c.type==='loss').map(c=>c.id);
  return{total,rows:rows.map((row,i)=>({...row,percent:pct[i].value/10,color:expenseColors[(lossOrder.indexOf(row.category)<0?i:lossOrder.indexOf(row.category))%expenseColors.length]}))};
}
const pctLabel=v=>v.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';

/* Orçamento, trabalho e contas recorrentes */
function budgetStats(month=today().slice(0,7)){
  return Object.entries(data.budgets).map(([category,limit])=>{
    const spent=data.entries.filter(e=>e.type==='loss'&&e.category===category&&e.date.startsWith(month)).reduce((s,e)=>s+e.amount,0);
    return{category,limit,spent,ratio:spent/limit};
  });
}
function workTotals(es){
  const source=e=>e.workSource||(e.category==='driver'?(['Uber','99','Corrida particular'].includes(e.item)?e.item:'Outro trabalho'):e.work?'Outro trabalho':'');
  const income=es.filter(e=>e.type==='gain'&&source(e)),costs=es.filter(e=>e.type==='loss'&&e.workCost);
  const gain=income.reduce((a,e)=>a+e.amount,0),cost=costs.reduce((a,e)=>a+e.amount,0);
  return{sources:workSources.map(s=>({name:s,total:income.filter(e=>source(e)===s).reduce((a,e)=>a+e.amount,0)})),gain,cost,net:gain-cost};
}
function nextDueDate(r){
  const d=new Date(r.nextDue+'T12:00:00');
  if(r.frequency==='weekly'){d.setDate(d.getDate()+7);return localDate(d)}
  const year=d.getFullYear()+(r.frequency==='yearly'?1:0),month=d.getMonth()+(r.frequency==='monthly'?1:0);
  const base=new Date(year,month,1,12);base.setDate(Math.min(r.anchor,new Date(base.getFullYear(),base.getMonth()+1,0).getDate()));
  return localDate(base);
}

/* Persistência. A chamada 'schedule' reagenda os lembretes no Android. */
let backupDirty=false,backupTimer=null,backupStatus=null;
function save(){
  ensureExtras();
  const text=JSON.stringify(data);
  if(window.EncryptedStore){if(!EncryptedStore.save(text))throw Error('Não foi possível salvar. Tente novamente antes de fechar o aplicativo.');localStorage.removeItem(KEY)}
  else localStorage.setItem(KEY,text);
  backupDirty=true;clearTimeout(backupTimer);
  if(backupStatus?.enabled)backupTimer=setTimeout(()=>writeCloudBackup(false),1500);
  if(window.AndroidPlus)AndroidPlus.call('schedule','',JSON.stringify([data.recurring.filter(r=>r.active).map(r=>({id:r.id,date:r.nextDue,lead:r.lead}))]));
}

/* Importação tolerante: aproveita o que for válido de um backup fora do padrão exato
   e conta o que foi ignorado, em vez de recusar o arquivo inteiro. */
function parseBackupText(text){
  const t=String(text??'').replace(/^﻿/,'').trim();
  if(!t)throw Error('O arquivo está vazio.');
  let raw;
  try{raw=JSON.parse(t)}catch{throw Error(/eu-anoto-encrypted|ciphertext/.test(t)?'Este backup está protegido por senha. Use o botão Restaurar para informar a senha.':'O arquivo não é um backup do Eu Anoto (não está em formato JSON).')}
  if(raw&&(raw.ciphertext||/encrypted/.test(String(raw.format||''))))throw Error('Este backup está protegido por senha. Use o botão Restaurar para informar a senha.');
  return raw;
}
function sanitizeBackup(raw){
  if(!raw||typeof raw!=='object'||(!Array.isArray(raw.entries)&&!Array.isArray(raw.categories)))return null;
  const rep={dropped:0,fixed:0};
  const okId=s=>typeof s==='string'&&ID_RE.test(s);
  const str=(v,n)=>typeof v==='string'?v.slice(0,n):undefined;
  const cats=[],ids=new Set(),idMap=new Map();
  for(const c of raw.categories||[]){
    if(!c||typeof c.name!=='string'||!c.name.trim()||!['gain','loss'].includes(c.type)){rep.dropped++;continue}
    let id=okId(c.id)?c.id:uid();if(ids.has(id)){rep.dropped++;continue}
    ids.add(id);if(c.id!==id)rep.fixed++;idMap.set(c.id,id);
    cats.push({id,name:c.name.trim().slice(0,80),type:c.type,items:Array.isArray(c.items)?[...new Set(c.items.filter(i=>typeof i==='string'&&i.trim()).map(i=>i.slice(0,80)))]:[],...(c.archived?{archived:true}:{})});
  }
  const draft={version:1,categories:cats};
  const catFor=(old,type)=>{
    let id=idMap.get(old);const c=cats.find(c=>c.id===id);
    if(c&&c.type===type)return id;
    const key='imp-'+type;let imp=cats.find(c=>c.id===key);
    if(!imp){imp={id:key,name:'Categoria importada',type,items:[],archived:true};cats.push(imp);rep.fixed++}
    return key;
  };
  const cleanEntry=e=>{
    const amount=Math.round(Number(e?.amount));
    if(!e||!['gain','loss'].includes(e.type)||!Number.isSafeInteger(amount)||amount<=0||!dateOK(e.date))return null;
    const r={id:'',type:e.type,amount,date:e.date,category:catFor(e.category,e.type),created:Number.isFinite(e.created)?e.created:Date.now()};
    for(const [k,n] of [['description',250],['item',80],['place',120],['recurringId',100],['recurringDue',10]]){const v=str(e[k],n);if(v)r[k]=v}
    if(payMethods.includes(e.payment))r.payment=e.payment;
    if(workSources.includes(e.workSource))r.workSource=e.workSource;
    if(typeof e.workCost==='boolean')r.workCost=e.workCost;
    r.id=okId(e.id)?e.id:uid();
    if(e.location&&entryOK({...r,location:e.location},{categories:cats}))r.location=e.location;
    return r;
  };
  const used=new Set(),entries=[];
  for(const e of raw.entries||[]){
    const r=cleanEntry(e);if(!r){rep.dropped++;continue}
    if(used.has(r.id))r.id=uid();used.add(r.id);entries.push(r);
  }
  const trash=[];
  for(const t of Array.isArray(raw.trash)?raw.trash:[]){const r=cleanEntry(t?.entry);if(!r||!dateOK(t.deletedDate)){rep.dropped++;continue}if(used.has(r.id))r.id=uid();used.add(r.id);trash.push({entry:r,deletedDate:t.deletedDate})}
  const budgets={};
  if(raw.budgets&&typeof raw.budgets==='object'&&!Array.isArray(raw.budgets))for(const [k,v] of Object.entries(raw.budgets)){const id=idMap.get(k);if(id&&cats.some(c=>c.id===id&&c.type==='loss')&&Number.isSafeInteger(v)&&v>0)budgets[id]=v;else rep.dropped++}
  const recurring=[];
  for(const r of Array.isArray(raw.recurring)?raw.recurring:[]){
    const id=idMap.get(r?.category),amount=Math.round(Number(r?.amount));
    if(!r||typeof r.name!=='string'||!id||!cats.some(c=>c.id===id&&c.type==='loss')||!Number.isSafeInteger(amount)||amount<=0||!dateOK(r.nextDue)){rep.dropped++;continue}
    const rec={id:okId(r.id)&&!recurring.some(x=>x.id===r.id)?r.id:uid(),name:r.name.slice(0,120),amount,category:id,nextDue:r.nextDue,frequency:['monthly','weekly','yearly'].includes(r.frequency)?r.frequency:'monthly',anchor:Number.isInteger(r.anchor)&&r.anchor>=1&&r.anchor<=31?r.anchor:Number(r.nextDue.slice(8)),lead:Number.isInteger(r.lead)&&r.lead>=0&&r.lead<=30?r.lead:1,payment:payMethods.includes(r.payment)?r.payment:'Não informado',active:r.active!==false};
    recurring.push(rec);
  }
  const out={version:1,opening:Number.isSafeInteger(raw.opening)?raw.opening:0,categories:cats,entries,budgets,recurring,trash,
    settings:{locationEnabled:false,backupInterval:['change','hour','day'].includes(raw.settings?.backupInterval)?raw.settings.backupInterval:'change'}};
  if(!valid(out)||(!entries.length&&!cats.length))return null;
  return{data:out,report:rep,counts:{entries:entries.length,categories:cats.length,recurring:recurring.length,trash:trash.length}};
}
