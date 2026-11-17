'use strict';
/* Interface: ícones, diálogo único, telas e eventos. */
const PATHS={
  up:'<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  down:'<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
  wallet:'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  dollar:'<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  list:'<path d="M6 3h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
  chart:'<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  sliders:'<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M18 18h2"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  chevron:'<path d="m9 6 6 6-6 6"/>',
  mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
  pin:'<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  repeat:'<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  shield:'<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0"/>',
  briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3"/>',
  file:'<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/>',
  table:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
  cloud:'<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 20 11a3.5 3.5 0 0 1-1 7z"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/>',
  check:'<path d="m5 12 5 5 9-10"/>',
  pie:'<path d="M21 12a9 9 0 1 1-9-9v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>'
};
const ic=(n,cls='')=>`<span class="ic ${cls}" aria-hidden="true"><svg viewBox="0 0 24 24">${PATHS[n]||PATHS.wallet}</svg></span>`;
const NAV=[['Início','home'],['Extrato','list'],['Relatórios','chart'],['Ajustes','sliders']];
let page='Início',tab='Todos',hl=null;

/* ---------- Diálogo único ---------- */
function openSheet(id){return document.querySelector(`dialog[data-sheet="${id}"]`)}
function sheet(id,title,body,foot='',head=''){
  let d=openSheet(id);
  const html=`<div class="sheet-head"><h2>${esc(title)}</h2>${head}<button type="button" class="icon-btn" data-act="close" aria-label="Fechar">${ic('close')}</button></div><div class="sheet-body">${body}</div>${foot?`<div class="sheet-foot">${foot}</div>`:''}`;
  if(!d){d=document.createElement('dialog');d.className='sheet';d.dataset.sheet=id;document.body.append(d);d.addEventListener('close',()=>{d.remove();if(typeof onSheetClose==='function')onSheetClose(id)})}
  const keep=d.querySelector('.sheet-body')?.scrollTop||0;
  d.innerHTML=html;
  if(!d.open)d.showModal();else d.querySelector('.sheet-body').scrollTop=keep;
  return d;
}
/* Pergunta, confirmação ou aviso: sempre a mesma caixa. */
function ask({title,message='',input=null,label='Nome',ok='Salvar',cancel='Cancelar',notice=false,allowEmpty=false}){
  return new Promise(resolve=>{
    let result=null;const id='ask'+Math.random().toString(36).slice(2);
    const d=sheet(id,title,(message?`<p class="text">${esc(message)}</p>`:'')+(input!==null?`<div class="field"><label for="ask-input">${esc(label)}</label><input id="ask-input" value="${esc(input)}" maxlength="500" autocomplete="off"></div><p class="error" id="ask-error" role="alert"></p>`:''),
      (notice?'':`<button type="button" class="btn" data-act="close">${esc(cancel)}</button>`)+`<button type="button" class="btn primary" id="ask-ok">${notice?'OK':esc(ok)}</button>`);
    const field=d.querySelector('#ask-input');
    const accept=()=>{if(field&&!field.value.trim()&&!allowEmpty){d.querySelector('#ask-error').textContent='Preencha este campo.';field.focus();return}result=field?field.value.trim():true;d.close()};
    d.querySelector('#ask-ok').onclick=accept;
    field?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();accept()}});
    d.addEventListener('close',()=>resolve(result),{once:true});
    if(field){field.focus();field.select()}
  });
}
const notice=(title,message)=>ask({title,message,notice:true});
let toastTimer=null;
function toast(msg){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';t.setAttribute('role','status');document.body.append(t)}t.textContent=msg;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.remove(),3500)}

/* ---------- Componentes de tela ---------- */
const kpi=(cls,label,value,sub,icon)=>`<div class="kpi ${cls}"><div class="kpi-icon">${ic(icon)}</div><span class="kpi-label">${label}</span><strong class="kpi-value">${value}</strong><span class="kpi-sub">${sub}</span></div>`;
const card=(icon,title,body,link='',tight=false,tone='orange')=>`<section class="card t-${tone}"><div class="card-head"><h2>${ic(icon)}${esc(title)}</h2>${link}</div><div class="card-body${tight?' tight':''}">${body}</div></section>`;
const row=({icon='tag',tone='',title,sub='',end='',endCls='',act='',id=''})=>{
  const attrs=act?` role="button" tabindex="0" data-act="${act}"${id?` data-id="${esc(id)}"`:''}`:'';
  return `<div class="row"${attrs}><span class="row-icon ${tone}">${ic(icon)}</span><span class="row-main"><strong>${title}</strong>${sub?`<small>${sub}</small>`:''}</span>${end?`<span class="row-end ${endCls}">${end}</span>`:''}</div>`;
};
const seg=(items,current,act)=>`<div class="seg" role="group">${items.map(([v,l])=>`<button type="button" data-act="${act}" data-v="${esc(v)}" aria-pressed="${v===current}">${esc(l||v)}</button>`).join('')}</div>`;
const empty=text=>`<p class="empty">${text}</p>`;
const cta=()=>`<button type="button" class="btn primary block" data-act="newEntry">${ic('plus')}Novo lançamento</button>`;

function entryRow(x){
  const gain=x.type==='gain';
  const meta=[br(x.date),x.payment&&x.payment!=='Não informado'?x.payment:'',x.workCost?'Custo do trabalho':'',x.workSource||'',x.place?'📍 '+x.place:'',x.description||''].filter(Boolean).map(esc).join(' · ');
  return row({icon:gain?'up':'down',tone:gain?'gain':'',title:esc(catName(x))+(x.item?' · '+esc(x.item):''),sub:meta,end:`${gain?'+':'−'} ${money(x.amount)}`,endCls:gain?'gain':'loss',act:'edit',id:x.id});
}
const entryList=es=>es.length?es.slice().sort(byRecent).map(entryRow).join(''):empty('Nenhum lançamento neste período.');

function periodBar(){
  return seg(['Hoje','Semana','Mês','Ano','Período'].map(p=>[p]),period,'period')+(period==='Período'?`<div class="range"><div class="field"><label for="p-start">De</label><input id="p-start" type="date" value="${start}" data-change="start"></div><div class="field"><label for="p-end">Até</label><input id="p-end" type="date" value="${end}" min="${start}" data-change="end"></div></div>${start>end?'<p class="error">A data final deve ser igual ou posterior à inicial.</p>':''}`:'');
}

/* ---------- Telas ---------- */
function homePage(){
  const es=entries(),t=totals(es),all=totals(data.entries.filter(x=>x.date<=today()));
  const count=type=>es.filter(x=>x.type===type).length;
  const kpis=`<div class="kpis">${kpi('green','Ganhos',money(t.gain),`${count('gain')} no período`,'up')}${kpi('orange','Gastos',money(t.loss),`${count('loss')} no período`,'down')}${kpi('blue','Saldo do período',money(t.net),t.net>=0?'Positivo':'Negativo','wallet')}${kpi('purple','Disponível hoje',money(data.opening+all.net),'Inclui o saldo inicial','dollar')}</div>`;
  const due=data.recurring.filter(r=>r.active&&r.nextDue<=today());
  const near=budgetStats().filter(b=>b.ratio>=.8);
  const alerts=[
    ...due.map(r=>row({icon:'repeat',title:esc(r.name),sub:`Venceu em ${br(r.nextDue)}`,end:money(r.amount),act:'recurring'})),
    ...near.map(b=>row({icon:'target',title:esc(data.categories.find(c=>c.id===b.category)?.name||'Categoria'),sub:`${money(b.spent)} de ${money(b.limit)} · ${Math.round(b.ratio*100)}%`,end:b.ratio>=1?'Limite atingido':'Perto do limite',endCls:'loss',act:'budgets'}))
  ];
  const recents=es.slice().sort(byRecent).slice(0,5);
  return kpis+(alerts.length?card('bell','Atenção',alerts.join(''),'',true,'orange'):'')+
    card('list','Últimos lançamentos',entryList(recents),`<button type="button" class="link" data-act="goto" data-v="Extrato">Ver todos${ic('chevron')}</button>`,true,'blue');
}
function statementPage(){
  const es=entries(),filtered=es.filter(x=>tab==='Todos'||x.type===(tab==='Ganhos'?'gain':'loss')),t=totals(filtered);
  return seg([['Todos'],['Ganhos'],['Gastos']],tab,'tab')+card('list','Lançamentos',entryList(filtered),filtered.length?`<span class="text">${filtered.length} · ${money(tab==='Todos'?t.net:tab==='Ganhos'?t.gain:t.loss)}</span>`:'',true,'blue');
}
function donutCard(es){
  const r=expenseBreakdown(es);
  if(hl&&!r.rows.some(x=>x.category===hl))hl=null;
  const sel=r.rows.find(x=>x.category===hl),R=84,C=2*Math.PI*R;let off=0;
  const arcs=r.rows.map(x=>{const len=x.amount/r.total*C,s=`<circle cx="120" cy="120" r="${R}" fill="none" stroke="${x.color}" stroke-width="32" stroke-dasharray="${len} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 120 120)" opacity="${hl&&hl!==x.category?.2:1}"/>`;off+=len;return s}).join('');
  const body=r.total?`<div class="donut"><svg viewBox="0 0 240 240" role="img" aria-label="Gastos por categoria"><circle cx="120" cy="120" r="${R}" fill="none" stroke="#e2e8f0" stroke-width="32"/>${arcs}</svg><div class="donut-center"><span>${sel?esc(sel.name):'Total'}</span><strong>${money(sel?sel.amount:r.total)}</strong>${sel?`<small>${pctLabel(sel.percent)}</small>`:''}</div></div>`+
    `<div style="margin-top:12px">${r.rows.map(x=>`<button type="button" class="row" data-act="hl" data-id="${esc(x.category)}" aria-pressed="${hl===x.category}" style="min-height:48px;padding-left:0;padding-right:0"><span class="legend-swatch" style="background:${x.color}"></span><span class="row-main"><strong style="font-size:var(--fs-sm)">${esc(x.name)}</strong></span><span class="row-end"><span style="color:var(--ink)">${money(x.amount)}</span><span>${pctLabel(x.percent)}</span></span></button>`).join('')}</div>`:empty('Nenhuma despesa neste período.');
  return card('pie','Gastos por categoria',body,'',false,'purple');
}
/* Ganhos e gastos ao longo do período (por dia; por mês quando o período é longo). */
function trendCard(es){
  const [s,e]=bounds(),days=Math.round((new Date(e+'T12:00:00')-new Date(s+'T12:00:00'))/864e5)+1,monthly=days>62;
  const buckets=[];
  if(monthly){let d=new Date(s.slice(0,7)+'-01T12:00:00');while(localDate(d)<=e){buckets.push({key:localDate(d).slice(0,7),label:d.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),gain:0,loss:0});d.setMonth(d.getMonth()+1)}}
  else{let d=new Date(s+'T12:00:00');while(localDate(d)<=e){buckets.push({key:localDate(d),label:pad(d.getDate())+'/'+pad(d.getMonth()+1),gain:0,loss:0});d.setDate(d.getDate()+1)}}
  for(const x of es){const b=buckets.find(b=>b.key===(monthly?x.date.slice(0,7):x.date));if(b)b[x.type]+=x.amount}
  const max=Math.max(1,...buckets.flatMap(b=>[b.gain,b.loss])),W=340,H=190,L=46,T=10,Bm=26,pw=W-L-8,ph=H-T-Bm;
  const step=Math.pow(10,Math.floor(Math.log10(max/4)||0)),nice=[1,2,2.5,5,10].map(m=>m*step).find(v=>v*4>=max)||step*10,top=nice*4;
  const fmt=v=>v>=1e5?(v/1e5).toFixed(v%1e5?1:0).replace('.',',')+' mil':String(Math.round(v/100));
  const X=i=>L+(buckets.length<2?pw/2:i*pw/(buckets.length-1)),Y=v=>T+ph-v/top*ph;
  const line=k=>buckets.map((b,i)=>`${i?'L':'M'}${X(i).toFixed(1)} ${Y(b[k]).toFixed(1)}`).join(' ');
  const area=k=>`${line(k)} L${X(buckets.length-1).toFixed(1)} ${T+ph} L${X(0).toFixed(1)} ${T+ph} Z`;
  const grid=[0,1,2,3,4].map(i=>`<line x1="${L}" x2="${W-8}" y1="${Y(nice*i)}" y2="${Y(nice*i)}" stroke="#e2e8f0" stroke-dasharray="3 3"/><text x="${L-6}" y="${Y(nice*i)+3}" text-anchor="end">R$${fmt(nice*i)}</text>`).join('');
  const every=Math.max(1,Math.ceil(buckets.length/6)),xl=buckets.map((b,i)=>i%every?'':`<text x="${X(i)}" y="${H-8}" text-anchor="middle">${b.label}</text>`).join('');
  const dots=buckets.length<=31?buckets.map((b,i)=>`<circle cx="${X(i)}" cy="${Y(b.gain)}" r="2.5" fill="#16a34a"/><circle cx="${X(i)}" cy="${Y(b.loss)}" r="2.5" fill="#f97316"/>`).join(''):'';
  const body=es.length?`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ganhos e gastos ao longo do período">${grid}${xl}<path d="${area('loss')}" fill="#f97316" opacity=".12"/><path d="${line('gain')}" fill="none" stroke="#16a34a" stroke-width="2.5"/><path d="${line('loss')}" fill="none" stroke="#f97316" stroke-width="2.5"/>${dots}</svg><div class="chart-legend"><span><i style="background:#16a34a"></i>Ganhos</span><span><i style="background:#f97316"></i>Gastos</span></div>`:empty('Sem lançamentos neste período.');
  return card('chart',monthly?'Evolução por mês':'Evolução por dia',body,'',false,'blue');
}
function incomeCard(es){
  const g=new Map();for(const x of es)if(x.type==='gain')g.set(x.category,(g.get(x.category)||0)+x.amount);
  const total=[...g.values()].reduce((a,b)=>a+b,0);
  const rows=[...g].sort((a,b)=>b[1]-a[1]).map(([id,v])=>`<div class="row" style="display:block;min-height:0;padding:12px 0"><div class="inline" style="justify-content:space-between"><strong>${esc(data.categories.find(c=>c.id===id)?.name||'Categoria arquivada')}</strong><strong class="gain">${money(v)}</strong></div><div class="bar"><i style="width:${(v/total*100).toFixed(1)}%"></i></div></div>`).join('');
  return card('up','Ganhos por fonte',rows||empty('Nenhum ganho neste período.'),'',false,'green');
}
function workCard(es){
  const w=workTotals(es);if(!w.gain&&!w.cost)return '';
  return card('briefcase','Resultado do trabalho',w.sources.filter(x=>x.total).map(x=>row({icon:'briefcase',title:esc(x.name),end:money(x.total)})).join('')+row({icon:'down',title:'Custos do trabalho',end:money(w.cost),endCls:'loss'})+row({icon:'wallet',tone:'gain',title:'Sobrou do trabalho',end:money(w.net),endCls:w.net<0?'loss':'gain'})+`<p class="hint" style="padding:8px 16px 0">Considera apenas despesas marcadas como custo do trabalho.</p>`,'',true,'orange');
}
function reportsPage(){
  const es=entries();
  return donutCard(es)+trendCard(es)+incomeCard(es)+workCard(es)+`<div class="actions"><button type="button" class="btn" data-act="export" data-v="pdf">${ic('file')}PDF</button><button type="button" class="btn" data-act="export" data-v="xlsx">${ic('table')}Excel</button></div>`;
}
function settingsPage(){
  const due=data.recurring.filter(r=>r.active&&r.nextDue<=today()).length;
  const m=(icon,title,sub,act,end='')=>row({icon,title,sub,act,end:end||ic('chevron')});
  return card('tag','Cadastros',
      m('tag','Categorias e fontes de renda',`${data.categories.filter(c=>!c.archived).length} ativas`,'categories')+
      m('target','Orçamento mensal',`${Object.keys(data.budgets).length} limite(s)`,'budgets')+
      m('repeat','Contas recorrentes',due?`${due} vencida(s) ou vencendo`:`${data.recurring.length} cadastrada(s)`,'recurring')+
      m('wallet','Saldo inicial',money(data.opening),'opening')+
      m('trash','Lixeira',`${data.trash.length} lançamento(s)`,'trash'),'',true,'purple')+
    card('shield','Dados e privacidade',
      m('cloud','Backup, restauração e segurança','Google Drive, senha e bloqueio','backup')+
      row({icon:'pin',title:'Localização dos gastos',sub:'Registrar o local ao lançar uma despesa',act:'toggleLocation',end:`<span>${data.settings.locationEnabled?'Ativada':'Desativada'}</span>`}),'',true,'green')+
    `<p class="foot">Dados guardados neste aparelho. Faça backups regularmente.</p>`;
}
const PAGES={'Início':homePage,'Extrato':statementPage,'Relatórios':reportsPage,'Ajustes':settingsPage};
function subtitle(){
  const [s,e]=bounds();
  if(page==='Início')return new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
  if(page==='Ajustes')return 'Cadastros, backup e privacidade';
  return s===e?br(s):`${br(s)} a ${br(e)}`;
}
const TITLES={'Início':'Painel','Extrato':'Extrato','Relatórios':'Relatórios','Ajustes':'Ajustes'};
function render(){
  const showCta=page==='Início'||page==='Extrato',showPeriod=page!=='Ajustes';
  $('#main').innerHTML=`<div class="page-head"><h1>${TITLES[page]}</h1><p>${esc(subtitle())}</p></div>${showCta?`<div class="stack">${cta()}</div>`:''}${showPeriod?periodBar():''}${PAGES[page]()}`;
  $('#nav').innerHTML=NAV.map(([p,i])=>`<button type="button" data-act="goto" data-v="${p}"${p===page?' aria-current="page"':''}>${ic(i)}<span>${p}</span></button>`).join('');
}

/* ---------- Eventos (um único ponto de entrada) ---------- */
const acts={
  close:el=>el.closest('dialog').close(),
  goto:el=>{page=el.dataset.v;window.scrollTo(0,0);render()},
  period:el=>{period=el.dataset.v;render()},
  tab:el=>{tab=el.dataset.v;render()},
  hl:el=>{hl=hl===el.dataset.id?null:el.dataset.id;render()},
  newEntry:()=>entryDialog(),
  edit:el=>entryDialog(el.dataset.id),
  export:el=>exportReport(el.dataset.v)
};
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(el&&acts[el.dataset.act]&&!el.disabled){try{const r=acts[el.dataset.act](el);if(r&&r.catch)r.catch(showError)}catch(err){showError(err)}}});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('.row[role=button]')){e.preventDefault();e.target.click()}});
document.addEventListener('change',e=>{
  const k=e.target.dataset?.change;if(!k)return;
  if(k==='start'){start=e.target.value;if(end<start)end=start;render()}
  if(k==='end'){end=e.target.value;render()}
  if(typeof changeHandlers!=='undefined'&&changeHandlers[k])changeHandlers[k](e.target);
});
function showError(err){console.error(err);notice('Algo deu errado',err?.message||'Tente novamente.')}
window.addEventListener('unhandledrejection',e=>{showError(e.reason)});
