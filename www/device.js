'use strict';
/* Ponte com o Android (mesmos nomes da v0.8) + backup, restauração, segurança e exportação. */
const nativePending=new Map();
function nativeCall(invoke,timeoutMs){
  return new Promise((resolve,reject)=>{
    const request=uid();
    const timeout=setTimeout(()=>{nativePending.delete(request);reject(Error('A operação demorou demais. Tente novamente.'))},timeoutMs);
    nativePending.set(request,{resolve,reject,timeout});
    try{invoke(request)}catch(e){clearTimeout(timeout);nativePending.delete(request);reject(e)}
  });
}
window.nativeResult=function(request,result){
  const p=nativePending.get(request);if(!p)return;
  clearTimeout(p.timeout);nativePending.delete(request);
  result.ok?p.resolve(result):p.reject(Error(result.message||'Não foi possível concluir a operação.'));
};
function deviceCall(method,...args){
  if(!window.AndroidDevice||typeof AndroidDevice[method]!=='function')return Promise.reject(Error('Esta função está disponível no aplicativo Android.'));
  return nativeCall(request=>{
    if(method==='setBackupEnabled'||method==='autosave')AndroidDevice[method](args[0],request);
    else AndroidDevice[method](request,...args);
  },method==='locate'?25000:180000);
}
function plusCall(method,...args){
  if(!window.AndroidPlus)return Promise.reject(Error('Disponível no aplicativo Android.'));
  return nativeCall(request=>AndroidPlus.call(method,request,JSON.stringify(args)),180000);
}

/* ---------- Backup ---------- */
let backupBusy=false,backupOpen=false,secState={enabled:false,backupEncrypted:false};
const fullBackup=()=>JSON.stringify(data,null,2);
async function refreshBackup(){
  if(!window.AndroidDevice)return;
  try{backupStatus=await deviceCall('backupState')}catch(e){backupStatus={enabled:false,error:e.message}}
  try{secState=await plusCall('securityState')}catch{}
  drawBackup();
}
async function writeCloudBackup(manual=true){
  if(!manual){
    const delta=Date.now()-(Date.parse(backupStatus?.lastSaved)||0),interval={change:0,hour:3600000,day:86400000}[data.settings.backupInterval||'change'];
    if(delta<interval){clearTimeout(backupTimer);backupTimer=setTimeout(()=>writeCloudBackup(false),Math.min(interval-delta,2147483647));return}
  }
  if(backupBusy){if(manual)await notice('Backup em andamento','Aguarde a gravação atual terminar.');return}
  if(!backupStatus?.enabled)return;
  clearTimeout(backupTimer);backupDirty=false;backupBusy=true;drawBackup();
  try{backupStatus=await deviceCall('autosave',fullBackup());if(manual)toast('Arquivo de backup atualizado.')}
  catch(e){backupStatus={...backupStatus,error:e.message};if(manual)await notice('Confira o backup',e.message)}
  finally{backupBusy=false;drawBackup();if(backupDirty&&backupStatus?.enabled)backupTimer=setTimeout(()=>writeCloudBackup(false),300)}
}
function drawBackup(){
  if(!openSheet('backup'))return;
  const s=backupStatus||(window.AndroidDevice?null:{enabled:false}),configured=s?.configured;
  const status=s?`<p><strong>${configured?(s.enabled?'Backup automático ativo':'Backup automático pausado'):'Backup automático não configurado'}</strong></p>${configured?`<p class="text">Destino: ${esc(s.source)}<br>Última gravação: ${s.lastSaved?new Date(s.lastSaved).toLocaleString('pt-BR'):'ainda não realizada'}</p>`:''}${s.error?`<p class="error" role="status">${esc(s.error)}</p>`:''}`:'<p class="text">Verificando o backup…</p>';
  const body=`<h3 style="margin-top:12px">Backup automático no Drive</h3>${status}
    <div class="stack">${configured?`<div class="inline"><button type="button" class="btn" style="flex:1" data-act="cloudNow"${backupBusy||!s.enabled?' disabled':''}>${backupBusy?'Salvando…':'Salvar agora'}</button><button type="button" class="btn" style="flex:1" data-act="cloudToggle">${s.enabled?'Pausar':'Ativar'}</button></div>`:''}<button type="button" class="btn block" data-act="cloudConfigure">${ic('cloud')}Escolher arquivo no Google Drive</button></div>
    <div class="field"><label for="backup-interval">Atualizar o arquivo</label><select id="backup-interval" data-change="interval">${[['change','Após alterações'],['hour','A cada hora, com o app aberto'],['day','A cada 24 horas, com o app aberto']].map(([v,l])=>`<option value="${v}"${data.settings.backupInterval===v?' selected':''}>${l}</option>`).join('')}</select></div>
    <h3>Cópia manual</h3>
    <div class="inline"><button type="button" class="btn" style="flex:1" data-act="backupManual">Salvar cópia</button><button type="button" class="btn" style="flex:1" data-act="restore">Restaurar</button></div>
    <p class="hint">Restaurar substitui os dados atuais pelos do arquivo.</p>
    <h3>Segurança</h3>
    <div class="stack" style="margin-top:8px"><button type="button" class="btn block" data-act="lock">${secState.enabled?'Desativar':'Ativar'} bloqueio do aplicativo</button><button type="button" class="btn block" data-act="backupPassword">${secState.backupEncrypted?'Alterar ou remover':'Definir'} senha do backup</button></div>
    <p class="hint">${secState.backupEncrypted?'Novos backups são criptografados com a senha definida.':'Backups exportados estão sem senha.'} O bloqueio usa a biometria ou o PIN do celular. Gravar o arquivo não garante que ele já chegou à nuvem: confirme no Drive antes de desinstalar. A voz usa o reconhecimento do Android, que pode processar a fala conforme os ajustes do aparelho. PDF e Excel exportados não têm senha.</p>`;
  sheet('backup','Backup e segurança',body);
}
changeHandlers.interval=el=>{data.settings.backupInterval=el.value;save()};
function manualBackup(){
  const text=fullBackup();
  if(window.AndroidBackup){AndroidBackup.save(text);return}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download='meu-controle-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function restoreText(text){
  let d,note='';
  try{
    const raw=parseBackupText(text);
    if(valid(raw))d=raw;
    else{
      const fixed=sanitizeBackup(raw);
      if(!fixed)throw Error('O arquivo não contém lançamentos nem categorias do Eu Anoto.');
      d=fixed.data;
      note=` Alguns dados fora do padrão foram ajustados${fixed.report.dropped?` e ${fixed.report.dropped} item(ns) inválido(s) foram ignorados`:''}.`;
    }
  }catch(e){await notice('Não foi possível ler o backup',(e.message||'Arquivo inválido.')+' Seus dados atuais foram preservados.');return false}
  if(!await ask({title:'Restaurar todos os dados?',message:`O arquivo tem ${d.entries.length} lançamento(s) e ${d.categories.length} categoria(s). Os dados atuais serão substituídos.${note} A localização ficará desativada até você ativar de novo.`,ok:'Restaurar'}))return false;
  d.settings={...d.settings,locationEnabled:false};data=d;ensureExtras();save();
  document.querySelectorAll('dialog.sheet').forEach(x=>x.close());render();toast('Backup restaurado.');return true;
}
Object.assign(acts,{
  backup:()=>{backupOpen=true;sheet('backup','Backup e segurança','<p class="text" style="margin-top:12px">Carregando…</p>');drawBackup();refreshBackup()},
  cloudNow:()=>writeCloudBackup(true),
  cloudToggle:async()=>{try{backupStatus=await deviceCall('setBackupEnabled',!backupStatus?.enabled);drawBackup();if(backupStatus.enabled)writeCloudBackup(false)}catch(e){await notice('Backup',e.message)}},
  cloudConfigure:async()=>{
    if(!window.AndroidDevice){await notice('Use o aplicativo Android','A escolha de um arquivo no Google Drive está disponível no aplicativo instalado no celular.');return}
    if(!await ask({title:'Backup automático no Drive',message:'Na próxima tela, abra o menu do seletor Android e escolha Google Drive. O arquivo guardará lançamentos, categorias, configurações e locais. Se escolher uma pasta do aparelho, ele ficará só nesse local. O app Drive precisa estar instalado e conectado à sua conta.',ok:'Escolher arquivo'}))return;
    try{backupStatus=await deviceCall('configureBackup',fullBackup());drawBackup();await notice('Backup automático ativado',`Destino: ${backupStatus.source}. O arquivo é atualizado após mudanças, com o app aberto. Confira a sincronização no Drive antes de desinstalar.`)}
    catch(e){await notice('Backup não configurado',e.message)}
  },
  backupManual:()=>manualBackup(),
  restore:async()=>{
    if(!window.AndroidDevice){const i=document.createElement('input');i.type='file';i.accept='application/json';i.onchange=async()=>{const f=i.files[0];if(!f)return;if(f.size>16*1024*1024){await notice('Backup inválido','Arquivo grande demais.');return}await restoreText(await f.text())};i.click();return}
    try{const r=await deviceCall('restoreBackup');await restoreText(r.text)}catch(e){await notice('Restauração',e.message)}
  },
  lock:async()=>{try{await plusCall('toggleLock');secState=await plusCall('securityState');drawBackup()}catch(e){await notice('Bloqueio',e.message)}},
  backupPassword:async()=>{try{await plusCall('backupPassword');secState=await plusCall('securityState');drawBackup()}catch(e){await notice('Senha do backup',e.message)}}
});

/* ---------- Exportação ---------- */
async function exportReport(type){
  const[s,e]=bounds();
  if(!dateOK(s)||!dateOK(e)||s>e){toast('Confira a data inicial e final.');return}
  try{
    if(type==='pdf')await plusCall('pdf',pdfHTML());
    else{const bytes=xlsxBytes();let bin='';for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode(...bytes.subarray(i,i+8192));await plusCall('xlsx',btoa(bin),`Eu-Anoto-${s}-${e}.xlsx`)}
    toast('Exportação aberta no Android.');
  }catch(err){toast(err.message)}
}

/* ---------- Início ---------- */
render();
refreshBackup();
