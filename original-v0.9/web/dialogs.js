'use strict';
/* Formulários e diálogos. Todos usam sheet()/ask() de ui.js: mesma caixa, mesmos botões. */
let draft=null,session=0,locBusy=false,locMsg='',voiceBusy=false;
const changeHandlers={};
const closeSheet=id=>openSheet(id)?.close();
function onSheetClose(id){if(id==='entry'){cancelLocation();draft=null;locMsg=''}if(id==='backup')backupOpen=false}

/* ---------- Lançamento ---------- */
function entryDialog(key){
  const src=data.entries.find(x=>x.id===key);
  draft=src?{...src}:{type:'gain',amount:0,date:today(),payment:'Não informado'};
  moreOpen=!!(src&&(src.place||src.location||src.workCost||src.workSource));
  cancelLocation();locMsg='';entryForm();
}
function cancelLocation(){session++;locBusy=false;if(window.AndroidDevice)AndroidDevice.cancelLocation()}
function itemLabel(c){return {sales:'O que você vendeu?',driver:'De onde veio o ganho?',clt:'Qual tipo de recebimento?',services:'Qual serviço você realizou?'}[c.id]||'Tipo / item (opcional)'}
let moreOpen=false;
/* Lê os campos digitados. Categoria, item, forma de pagamento e origem do trabalho já ficam no rascunho (botões de toque). */
function capture(){
  const g=i=>document.getElementById(i);if(!g('entryform'))return;
  Object.assign(draft,{amount:parseAmount(g('amount').value),date:g('date').value,description:g('description').value.trim()});
  if(draft.type==='gain'){delete draft.workCost;delete draft.place;delete draft.location}
  else{if(g('work-cost'))draft.workCost=g('work-cost').checked;if(g('place'))draft.place=g('place').value.trim().slice(0,120);delete draft.workSource}
}
function locHTML(){
  const l=draft.location,on=data.settings.locationEnabled;
  if(!on)return '<p class="hint">Para registrar o ponto de GPS, ative a localização em Ajustes.</p>';
  const status=locBusy?'Buscando a localização atual…':l?`Local capturado em ${new Date(l.capturedAt).toLocaleString('pt-BR')} · precisão ${Math.round(l.accuracy)} m`:(locMsg||'Sem localização registrada.');
  return `<p class="hint" role="status">${esc(status)}</p><div class="chips" style="margin-top:8px">${locBusy?'<button type="button" class="chip" data-act="removeLocation">Salvar sem localização</button>':`<button type="button" class="chip" data-act="locate">${ic('pin')}${l?'Atualizar':'Usar localização atual'}</button>${l?'<button type="button" class="chip" data-act="mapDraft">Ver no mapa</button><button type="button" class="chip" data-act="removeLocation">Remover</button>':''}`}</div>`;
}
function drawLocation(){const p=$('#loc-panel');if(p)p.innerHTML=locHTML()}
const chip=(label,act,v,on,icon='')=>`<button type="button" class="chip" data-act="${act}" data-v="${esc(v)}" aria-pressed="${on}">${on?ic('check'):icon}${esc(label)}</button>`;
function entryForm(){
  const x=draft,gain=x.type==='gain',tone=gain?'green':'orange',c=data.categories.find(c=>c.id===x.category);
  const cats=data.categories.filter(k=>k.type===x.type&&(!k.archived||k.id===x.category));
  const wsel=x.workSource||(!x.workOff&&x.category==='driver'&&['Uber','99','Corrida particular'].includes(x.item)?x.item:'');
  const d0=today(),ontem=(()=>{const d=new Date();d.setDate(d.getDate()-1);return localDate(d)})();
  const open=moreOpen||(!gain&&data.settings.locationEnabled);
  const label=(icon,text)=>`<span class="label">${ic(icon)}${text}</span>`;
  const body=`${x.voiceText?`<div class="notice" role="status" style="margin-top:12px"><strong>Confira o que foi entendido</strong><br>${esc(x.voiceText)}${x.voiceWarning?'<br>'+esc(x.voiceWarning):''}<br>Nada foi salvo ainda.</div>`:''}
  <div class="type-pick" role="group" aria-label="Tipo de lançamento">
    <button type="button" class="type-card gain" data-act="entryType" data-v="gain" aria-pressed="${gain}"><span class="type-ic">${ic('up')}</span>Ganho<small>Dinheiro que entrou</small></button>
    <button type="button" class="type-card loss" data-act="entryType" data-v="loss" aria-pressed="${!gain}"><span class="type-ic">${ic('down')}</span>Despesa<small>Dinheiro que saiu</small></button>
  </div>
  <div class="t-${tone}">
    <div class="amount-box"><label for="amount">Quanto ${gain?'você recebeu':'você gastou'}?</label><div class="amount-row"><span>R$</span><input id="amount" form="entryform" inputmode="decimal" placeholder="0,00" value="${asInput(x.amount)}" autocomplete="off"></div></div>
    <form id="entryform" novalidate>
      <div class="field">${label('tag',gain?'De onde veio?':'Em que você gastou?')}<div class="chips">${cats.map(k=>chip(k.name+(k.archived?' (arquivada)':''),'pickCategory',k.id,k.id===x.category)).join('')}<button type="button" class="chip add" data-act="newCategory">${ic('plus')}Nova</button></div></div>
      ${c?`<div class="field">${label('list',itemLabel(c))}<div class="chips">${c.items.map(i=>chip(i,'pickItem',i,i===x.item)).join('')}<button type="button" class="chip add" data-act="newItem">${ic('plus')}Novo</button></div></div>`:''}
      <div class="field">${label('calendar','Quando?')}<div class="chips">${chip('Hoje','pickDate',d0,x.date===d0)}${chip('Ontem','pickDate',ontem,x.date===ontem)}<input id="date" type="date" value="${esc(x.date)}" data-change="date" aria-label="Escolher outra data" style="flex:1;min-width:140px;min-height:40px"></div></div>
      <div class="field">${label('wallet',gain?'Como recebeu?':'Como pagou?')}<div class="chips">${payMethods.slice(1).map(p=>chip(p,'pickPayment',p,x.payment===p)).join('')}</div></div>
      <div class="field">${label('file','Observação (opcional)')}<input id="description" value="${esc(x.description||'')}" maxlength="250" placeholder="${gain?'Ex.: pagamento do cliente':'Ex.: compras da semana'}"></div>
      <button type="button" class="more-btn" data-act="more" aria-expanded="${open}">${ic('chevron','chev'+(open?' open':''))}Mais detalhes${gain?' · trabalho':' · local e custo do trabalho'}</button>
      <div class="more"${open?'':' hidden'}>
        ${gain?`<div class="field">${label('briefcase','É ganho de trabalho?')}<div class="chips">${workSources.map(w=>chip(w,'pickWork',w,w===wsel)).join('')}</div></div>`
          :`<label class="check"><input id="work-cost" type="checkbox"${x.workCost?' checked':''}>Este gasto é custo do trabalho</label>
            <div class="field">${label('pin','Local da compra')}<input id="place" value="${esc(x.place||'')}" maxlength="120" placeholder="Ex.: Mercado Central"><div id="loc-panel">${locHTML()}</div></div>`}
      </div>
      <p class="error" id="entry-error" role="alert"></p>
    </form>
  </div>
  ${x.id?`<button type="button" class="btn danger block" style="margin-top:16px" data-act="deleteEntry">${ic('trash')}Mover para a lixeira</button>`:''}`;
  const d=sheet('entry',`${x.id?'Editar':'Novo'} lançamento`,body,`<button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" form="entryform" class="btn primary${gain?' green':''}">${ic('check')}Salvar</button>`,`<button type="button" class="icon-btn" data-act="voice" aria-label="Falar lançamento" style="color:var(--focus)">${ic('mic')}</button>`);
  d.dataset.tone=tone;
  d.querySelector('#entryform').onsubmit=submitEntry;
  if(!gain&&!x.id&&data.settings.locationEnabled&&!x.location&&!locMsg&&!locBusy)requestLocation();
}
function submitEntry(e){
  e.preventDefault();const err=m=>{$('#entry-error').textContent=m};
  if(locBusy){err('A localização ainda está sendo buscada. Aguarde ou toque em “Salvar sem localização”.');return}
  capture();
  if(!Number.isSafeInteger(draft.amount)||draft.amount<=0||!draft.category||!dateOK(draft.date)){err('Informe um valor positivo, categoria e data.');return}
  delete draft.voiceText;delete draft.voiceWarning;delete draft.workOff;
  const rec={...draft,id:draft.id||uid(),created:draft.created||Date.now()};
  if(!rec.place)delete rec.place;
  data.entries=data.entries.filter(x=>x.id!==rec.id);data.entries.push(rec);save();closeSheet('entry');render();
}
changeHandlers.date=()=>{capture();entryForm()};
Object.assign(acts,{
  entryType:el=>{capture();if(el.dataset.v===draft.type)return;if(el.dataset.v==='gain')cancelLocation();draft.type=el.dataset.v;draft.category='';draft.item='';entryForm()},
  pickCategory:el=>{capture();if(draft.category!==el.dataset.v){draft.category=el.dataset.v;draft.item=''}entryForm()},
  pickItem:el=>{capture();draft.item=draft.item===el.dataset.v?'':el.dataset.v;entryForm()},
  pickPayment:el=>{capture();draft.payment=draft.payment===el.dataset.v?'Não informado':el.dataset.v;entryForm()},
  pickDate:el=>{capture();draft.date=el.dataset.v;entryForm()},
  pickWork:el=>{capture();const cur=draft.workSource||'';if(cur===el.dataset.v||(!cur&&!draft.workOff&&draft.category==='driver'&&draft.item===el.dataset.v)){delete draft.workSource;draft.workOff=true}else{draft.workSource=el.dataset.v;delete draft.workOff}entryForm()},
  more:()=>{capture();moreOpen=!moreOpen;entryForm()},
  newCategory:async()=>{capture();const n=await ask({title:draft.type==='gain'?'Nova fonte de renda':'Nova categoria',message:'Escolha um nome que faça sentido para você.',input:''});if(n){const c={id:uid(),name:n.slice(0,80),type:draft.type,items:[]};data.categories.push(c);draft.category=c.id;draft.item='';save()}if(draft)entryForm()},
  newItem:async()=>{capture();const c=data.categories.find(c=>c.id===draft.category);if(!c)return;const n=await ask({title:'Novo item',message:'Você poderá escolher este item nos próximos lançamentos.',input:''});if(n){const v=n.slice(0,80);if(!c.items.includes(v))c.items.push(v);draft.item=v;save()}if(draft)entryForm()},
  deleteEntry:async()=>{
    const rec=data.entries.find(e=>e.id===draft.id);if(!rec)return;
    if(!await ask({title:'Mover para a lixeira?',message:'O lançamento sairá dos totais e poderá ser recuperado. O vencimento de uma conta recorrente não será alterado.',ok:'Mover'}))return;
    data.trash.push({entry:{...rec},deletedDate:today()});data.entries=data.entries.filter(e=>e.id!==rec.id);save();closeSheet('entry');render();
  },
  voice:()=>voiceEntry(),
  locate:()=>requestLocation(),
  removeLocation:()=>{cancelLocation();delete draft.location;locMsg='Sem localização. O gasto poderá ser salvo normalmente.';drawLocation()},
  mapDraft:()=>{if(draft?.location)openMap(draft.location)}
});
async function requestLocation(){
  if(locBusy||!draft||draft.type!=='loss'||!data.settings.locationEnabled)return;
  const s=session;locBusy=true;locMsg='';drawLocation();
  try{
    let r;
    if(window.AndroidDevice)r=await deviceCall('locate');
    else r=await new Promise((ok,fail)=>{if(!navigator.geolocation){fail(Error('Localização indisponível neste navegador.'));return}navigator.geolocation.getCurrentPosition(p=>ok({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,capturedAt:new Date(p.timestamp).toISOString()}),()=>fail(Error('Localização não autorizada ou indisponível. Você pode salvar sem localização.')),{enableHighAccuracy:true,maximumAge:0,timeout:18000})});
    if(s!==session||!draft||draft.type!=='loss')return;
    draft.location={latitude:r.latitude,longitude:r.longitude,accuracy:r.accuracy,capturedAt:r.capturedAt,source:'device'};locMsg='';
  }catch(e){if(s===session)locMsg=e.message}
  finally{if(s===session){locBusy=false;drawLocation()}}
}
function openMap(l){if(window.AndroidDevice)AndroidDevice.openMap(l.latitude,l.longitude);else window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.latitude+','+l.longitude)}`,'_blank','noopener')}

/* ---------- Voz ---------- */
async function voiceEntry(){
  if(voiceBusy)return;capture();const s=session;voiceBusy=true;
  try{
    if(!window.AndroidDevice){await notice('Falar um lançamento','No aplicativo Android, este botão usa o reconhecimento de voz. Aqui você pode ditar pelo microfone do teclado.');return}
    toast('Ouvindo… diga, por exemplo, “gastei 85 reais no mercado hoje”.');
    const r=await deviceCall('speak');
    if(s!==session||!openSheet('entry'))return;
    applyVoice(r.text);
  }catch(e){if(s===session)await notice('Lançamento por voz',e.message)}
  finally{voiceBusy=false}
}
function applyVoice(text){
  const p=parseVoice(text);
  draft={...draft,type:p.type||draft.type,amount:p.amount||0,category:p.category,item:p.item,date:p.date,description:p.description,voiceText:text,voiceWarning:p.warnings.join(' ')};
  if(draft.type!=='loss'){delete draft.location;delete draft.place}
  entryForm();
}

/* ---------- Categorias e fontes ---------- */
function categoriesDialog(){
  const group=(type,label)=>`<h3>${label}</h3><div class="card">${data.categories.filter(c=>c.type===type).map(c=>row({icon:'tag',tone:type==='gain'?'gain':'',title:esc(c.name),sub:c.archived?'Arquivada':`${c.items.length} item(ns)`,act:'editCategory',id:c.id,end:ic('chevron')})).join('')||empty('Nenhuma.')}</div>`;
  sheet('categories','Categorias e fontes',group('gain','Fontes de renda')+group('loss','Categorias de despesa'),'<button type="button" class="btn primary" data-act="editCategory">Nova categoria ou fonte</button>');
}
function categoryEditor(key){
  const c=data.categories.find(c=>c.id===key)||{name:'',type:'loss',items:[]},isNew=!key;
  sheet('category-edit',isNew?'Nova categoria ou fonte':'Editar',`<form id="catform" novalidate>
    <div class="field"><label for="c-name">Nome</label><input id="c-name" maxlength="80" value="${esc(c.name)}"></div>
    ${isNew?`<div class="field"><label for="c-type">Tipo</label><select id="c-type"><option value="gain">Fonte de renda (ganho)</option><option value="loss" selected>Categoria de despesa</option></select></div>`:''}
    <div class="field"><label for="c-items">Itens (separados por vírgula)</label><input id="c-items" maxlength="1000" value="${esc(c.items.join(', '))}"><p class="hint">Itens retirados da lista continuam nos lançamentos antigos.</p></div>
    <p class="error" id="c-error" role="alert"></p></form>
    ${isNew?'':`<button type="button" class="btn block" style="margin-top:16px" data-act="archiveCategory" data-id="${esc(key)}">${c.archived?'Reativar':'Arquivar'}</button>`}`,
    `<button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" form="catform" class="btn primary">Salvar</button>`);
  $('#catform').onsubmit=e=>{
    e.preventDefault();const n=$('#c-name').value.trim().slice(0,80);
    if(!n){$('#c-error').textContent='Informe um nome.';return}
    const items=[...new Set($('#c-items').value.split(',').map(x=>x.trim().slice(0,80)).filter(Boolean))];
    if(isNew)data.categories.push({id:uid(),name:n,type:$('#c-type').value,items});else{c.name=n;c.items=items}
    save();closeSheet('category-edit');categoriesDialog();render();
  };
}
Object.assign(acts,{
  categories:()=>categoriesDialog(),
  editCategory:el=>categoryEditor(el.dataset.id),
  archiveCategory:el=>{const c=data.categories.find(c=>c.id===el.dataset.id);c.archived=!c.archived;save();closeSheet('category-edit');categoriesDialog();render()}
});

/* ---------- Saldo inicial ---------- */
Object.assign(acts,{opening:async()=>{
  const v=await ask({title:'Saldo inicial',message:'Valor que você já tinha antes dos lançamentos. Use um formato como 100,00 ou -100,00.',input:asInput(data.opening)||'0,00',label:'Valor (R$)'});
  if(v===null)return;
  const neg=v.startsWith('-'),n=parseAmount(v.replace(/^-/,''))*(neg?-1:1);
  if(!Number.isSafeInteger(n)){await notice('Confira o valor','Use um valor como 100,00 ou -100,00.');return}
  data.opening=n;save();render();toast('Saldo inicial salvo.');
}});

/* ---------- Orçamento mensal ---------- */
function budgetsDialog(){
  const cats=data.categories.filter(c=>c.type==='loss'&&!c.archived),stats=Object.fromEntries(budgetStats().map(b=>[b.category,b]));
  const spent=id=>data.entries.filter(e=>e.type==='loss'&&e.category===id&&e.date.startsWith(today().slice(0,7))).reduce((s,e)=>s+e.amount,0);
  sheet('budgets','Orçamento mensal',`<p class="text" style="margin-top:12px">Limite por categoria para o mês atual. Avisos aparecem no Painel a partir de 80%. Contas previstas só entram depois de pagas.</p>
    <form id="budgets-form" novalidate>${cats.map(c=>{const b=stats[c.id];return `<div class="field"><label for="budget-${esc(c.id)}">${esc(c.name)} (R$)</label><input id="budget-${esc(c.id)}" inputmode="decimal" placeholder="Sem limite" value="${asInput(data.budgets[c.id])}"><p class="hint">Gasto neste mês: ${money(spent(c.id))}${b?` · ${Math.round(b.ratio*100)}% do limite`:''}</p>${b?`<div class="bar ${b.ratio>=1?'over':b.ratio>=.8?'near':''}"><i style="width:${Math.min(100,b.ratio*100)}%"></i></div>`:''}</div>`}).join('')}<p class="error" id="budget-error" role="alert"></p></form>`,
    `<button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" form="budgets-form" class="btn primary">Salvar limites</button>`);
  $('#budgets-form').onsubmit=e=>{
    e.preventDefault();const next={...data.budgets};
    for(const c of cats){const v=$('#budget-'+c.id).value.trim();if(!v){delete next[c.id];continue}const n=parseAmount(v);if(!Number.isSafeInteger(n)||n<=0){$('#budget-error').textContent='Use valores positivos ou deixe em branco para remover o limite.';return}next[c.id]=n}
    data.budgets=next;save();closeSheet('budgets');render();toast('Limites salvos.');
  };
}
acts.budgets=()=>budgetsDialog();

/* ---------- Contas recorrentes ---------- */
function recurringDialog(){
  const list=data.recurring.slice().sort((a,b)=>a.nextDue.localeCompare(b.nextDue));
  sheet('recurring','Contas recorrentes',`<p class="text" style="margin-top:12px">Um lançamento só é criado quando você confirma o pagamento. Contas vencidas continuam na lista.</p>
    <div class="card" style="margin-top:12px">${list.map(r=>row({icon:'repeat',title:esc(r.name),sub:`${money(r.amount)} · ${br(r.nextDue)} · ${r.active?'Ativa':'Pausada'}`,act:'editRecurring',id:r.id,end:`<button type="button" class="btn sm primary" data-act="payRecurring" data-id="${esc(r.id)}">Pagar</button>`})).join('')||empty('Nenhuma conta cadastrada.')}</div>`,
    `<button type="button" class="btn" data-act="reminders">${ic('bell')}Lembretes</button><button type="button" class="btn primary" data-act="editRecurring">Nova conta</button>`);
}
function recurringEditor(key){
  const r=data.recurring.find(r=>r.id===key)||{name:'',amount:0,nextDue:today(),frequency:'monthly',lead:1,payment:'Não informado',category:'',active:true};
  sheet('recurring-edit',key?'Editar conta':'Nova conta',`<form id="recurring-form" novalidate>
    <div class="field"><label for="r-name">Nome</label><input id="r-name" maxlength="120" value="${esc(r.name)}" placeholder="Ex.: Internet"></div>
    <div class="field"><label for="r-amount">Valor (R$)</label><input id="r-amount" inputmode="decimal" value="${asInput(r.amount)}"></div>
    <div class="field"><label for="r-category">Categoria</label><select id="r-category"><option value="">Selecione</option>${data.categories.filter(c=>c.type==='loss'&&(!c.archived||c.id===r.category)).map(c=>`<option value="${esc(c.id)}"${r.category===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="r-date">Próximo vencimento</label><input id="r-date" type="date" value="${esc(r.nextDue)}"></div>
    <div class="field"><label for="r-frequency">Frequência</label><select id="r-frequency">${[['monthly','Mensal'],['weekly','Semanal'],['yearly','Anual']].map(([v,l])=>`<option value="${v}"${r.frequency===v?' selected':''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label for="r-lead">Avisar quantos dias antes?</label><input id="r-lead" type="number" min="0" max="30" value="${r.lead}"></div>
    <div class="field"><label for="r-payment">Forma de pagamento</label><select id="r-payment">${payMethods.map(p=>`<option${p===r.payment?' selected':''}>${p}</option>`).join('')}</select></div>
    <p class="error" id="recurring-error" role="alert"></p></form>
    ${key?`<div class="stack"><button type="button" class="btn block" data-act="toggleRecurring" data-id="${esc(key)}">${r.active?'Pausar conta':'Ativar conta'}</button><button type="button" class="btn danger block" data-act="deleteRecurring" data-id="${esc(key)}">${ic('trash')}Remover conta</button></div>`:''}`,
    `<button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" form="recurring-form" class="btn primary">Salvar conta</button>`);
  $('#recurring-form').onsubmit=e=>{
    e.preventDefault();const v=k=>$('#r-'+k).value,amount=parseAmount(v('amount')),lead=Number(v('lead'));
    if(!Number.isSafeInteger(amount)||amount<=0||!dateOK(v('date'))||!Number.isInteger(lead)||lead<0||lead>30||!v('name').trim()||!v('category')){$('#recurring-error').textContent='Confira nome, valor, categoria, data e dias de aviso.';return}
    const date=v('date'),rec={...r,id:key||uid(),name:v('name').trim(),amount,category:v('category'),nextDue:date,anchor:date===r.nextDue&&r.anchor?r.anchor:Number(date.slice(8)),frequency:v('frequency'),lead,payment:v('payment')};
    data.recurring=data.recurring.filter(x=>x.id!==key);data.recurring.push(rec);save();closeSheet('recurring-edit');recurringDialog();render();
  };
}
Object.assign(acts,{
  recurring:()=>recurringDialog(),
  editRecurring:el=>recurringEditor(el.dataset?.id),
  toggleRecurring:el=>{const r=data.recurring.find(x=>x.id===el.dataset.id);if(r){r.active=!r.active;save();closeSheet('recurring-edit');recurringDialog();render()}},
  deleteRecurring:async el=>{if(await ask({title:'Remover conta recorrente?',message:'Os pagamentos já registrados serão mantidos.',ok:'Remover'})){data.recurring=data.recurring.filter(r=>r.id!==el.dataset.id);save();closeSheet('recurring-edit');recurringDialog();render()}},
  payRecurring:async el=>{
    const key=el.dataset.id,r=data.recurring.find(x=>x.id===key);if(!r)return;const due=r.nextDue;
    if(data.entries.some(e=>e.recurringId===key&&e.recurringDue===due)){await notice('Pagamento já registrado','Esta conta já foi paga neste vencimento.');return}
    if(!await ask({title:'Confirmar pagamento?',message:`${r.name}: ${money(r.amount)}. Será registrado hoje. Vencimento: ${br(due)}.`,ok:'Paguei esta conta'}))return;
    const cur=data.recurring.find(x=>x.id===key);if(!cur||cur.nextDue!==due)return;
    data.entries.push({id:uid(),type:'loss',amount:r.amount,category:r.category,date:today(),description:r.name,item:'',created:Date.now(),payment:r.payment,recurringId:key,recurringDue:due});
    r.nextDue=nextDueDate(r);save();render();recurringDialog();
  },
  reminders:async()=>{try{const r=await plusCall('notifications');await notice('Lembretes',r.message)}catch(e){await notice('Lembretes',e.message)}}
});

/* ---------- Lixeira ---------- */
function trashDialog(){
  sheet('trash','Lixeira',`<p class="text" style="margin-top:12px">Os lançamentos ficam aqui até você excluir definitivamente. Eles não entram nos totais e vão no backup.</p>
  <div class="card" style="margin-top:12px">${data.trash.map(t=>row({icon:'trash',title:`${esc(catName(t.entry))} · ${money(t.entry.amount)}`,sub:esc(br(t.entry.date)+(t.entry.description?' · '+t.entry.description:'')),end:`<button type="button" class="btn sm" data-act="recover" data-id="${esc(t.entry.id)}">Recuperar</button><button type="button" class="btn sm danger" data-act="purge" data-id="${esc(t.entry.id)}">Excluir</button>`})).join('')||empty('Lixeira vazia.')}</div>`);
}
Object.assign(acts,{
  trash:()=>trashDialog(),
  recover:async el=>{const key=el.dataset.id,t=data.trash.find(t=>t.entry.id===key);if(!t)return;
    if(data.entries.some(e=>e.id===key||(t.entry.recurringId&&e.recurringId===t.entry.recurringId&&e.recurringDue===t.entry.recurringDue))){await notice('Lançamento já existe','Não foi criado um pagamento duplicado.');return}
    data.entries.push(t.entry);data.trash=data.trash.filter(t=>t.entry.id!==key);save();render();trashDialog()},
  purge:async el=>{if(await ask({title:'Excluir definitivamente?',message:'Este lançamento não poderá ser recuperado.',ok:'Excluir'})){data.trash=data.trash.filter(t=>t.entry.id!==el.dataset.id);save();render();trashDialog()}}
});

/* ---------- Localização (liga/desliga) ---------- */
acts.toggleLocation=async()=>{
  if(data.settings.locationEnabled){data.settings.locationEnabled=false;save();if(window.AndroidDevice)AndroidDevice.cancelLocation();render();return}
  if(await ask({title:'Localização dos gastos',message:'Ao ativar, o app registra sua localização no momento em que você adiciona uma despesa. Se você já saiu do lugar da compra, será o local onde você está agora. Confira antes de salvar. A permissão só é pedida ao usar a função.',ok:'Ativar',cancel:'Agora não'})){data.settings.locationEnabled=true;save();render()}
};
