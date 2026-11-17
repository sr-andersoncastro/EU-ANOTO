'use strict';
/* Ponte iOS: no iPhone (Capacitor), recria as interfaces AndroidDevice / AndroidPlus que o app
   já usa, apoiadas em plugins Capacitor. Em outros ambientes (Android, navegador) não faz nada.
   Funções ainda não portadas devolvem uma mensagem amigável em vez de quebrar. */
(function(){
  const C=window.Capacitor;
  if(!C||!C.isNativePlatform||!C.isNativePlatform()||C.getPlatform()!=='ios')return;
  const P=C.Plugins||{};
  const done=(req,r)=>window.nativeResult(req,Object.assign({ok:true},r));
  const fail=(req,m)=>window.nativeResult(req,{ok:false,message:m});
  const run=async(req,fn)=>{try{done(req,await fn())}catch(e){fail(req,(e&&e.message)||'Não foi possível concluir a operação.')}};
  const need=n=>{if(!P[n])throw Error('Recurso indisponível neste aparelho.');return P[n]};
  let watch=0;

  async function shareText(name,text,mime){
    const FS=need('Filesystem'),Sh=need('Share');
    const w=await FS.writeFile({path:name,data:text,directory:'CACHE',encoding:'utf8'});
    await Sh.share({title:name,url:w.uri});
  }
  async function shareBase64(name,b64){
    const FS=need('Filesystem'),Sh=need('Share');
    const w=await FS.writeFile({path:name,data:b64,directory:'CACHE'});
    await Sh.share({title:name,url:w.uri});
  }
  const hash=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)%2147483000+1};

  window.AndroidDevice={
    locate(req){run(req,async()=>{
      const p=await need('Geolocation').getCurrentPosition({enableHighAccuracy:true,timeout:20000});
      return{latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,capturedAt:new Date(p.timestamp).toISOString()};
    })},
    cancelLocation(){},
    openMap(lat,lon){window.open(`https://maps.apple.com/?ll=${lat},${lon}&q=Gasto`,'_blank')},
    speak(req){run(req,async()=>{
      const S=need('SpeechRecognition');
      const a=await S.available();if(!a.available)throw Error('Reconhecimento de voz indisponível.');
      const perm=await S.requestPermissions();
      if(perm.speechRecognition!=='granted')throw Error('Permita o microfone e o reconhecimento de voz em Ajustes do iPhone.');
      const r=await S.start({language:'pt-BR',maxResults:1,partialResults:false,popup:false});
      const text=r&&r.matches&&r.matches[0];if(!text)throw Error('Não entendi. Tente falar de novo.');
      return{text};
    })},
    /* Backup automático em nuvem: iCloud ainda não implementado. */
    backupState(req){done(req,{enabled:false,configured:false})},
    setBackupEnabled(on,req){fail(req,'Backup automático (iCloud) ainda não está disponível no iPhone. Use "Salvar cópia".')},
    configureBackup(req){fail(req,'Backup automático (iCloud) ainda não está disponível no iPhone. Use "Salvar cópia".')},
    autosave(text,req){fail(req,'Backup automático (iCloud) ainda não está disponível no iPhone.')},
    restoreBackup(req){
      const i=document.createElement('input');i.type='file';i.accept='.json,application/json,text/plain';
      i.onchange=async()=>{const f=i.files&&i.files[0];if(!f){fail(req,'Nenhum arquivo escolhido.');return}
        try{done(req,{text:await f.text()})}catch(e){fail(req,'Não foi possível ler o arquivo.')}};
      i.click();
    }
  };

  window.AndroidPlus={call(method,req,json){
    let a=[];try{a=JSON.parse(json||'[]')}catch(e){}
    run(req,async()=>{
      switch(method){
        case 'pdf':
          await shareText(`Eu-Anoto-relatorio-${Date.now()}.html`,a[0],'text/html');
          return{};
        case 'xlsx':
          await shareBase64(a[1]||'Eu-Anoto.xlsx',a[0]);
          return{};
        case 'securityState':
          return{enabled:false,backupEncrypted:false};
        case 'toggleLock':
        case 'backupPassword':
          throw Error('Bloqueio por Face ID e senha de backup ainda não estão disponíveis no iPhone.');
        case 'notifications':{
          const N=need('LocalNotifications');
          const r=await N.requestPermissions();
          return{message:r.display==='granted'?'Lembretes ativados. Você será avisado das contas recorrentes.':'Ative as notificações do Eu Anoto em Ajustes do iPhone.'};
        }
        case 'schedule':{
          const N=P.LocalNotifications;if(!N)return{};
          const list=(a[0]||[]);
          const pend=await N.getPending();
          if(pend.notifications.length)await N.cancel({notifications:pend.notifications});
          const now=Date.now(),items=[];
          for(const r of list){
            const d=new Date(r.date+'T09:00:00');d.setDate(d.getDate()-(Number(r.lead)||0));
            if(d.getTime()>now)items.push({id:hash(r.id),title:'Eu Anoto',body:'Você tem uma conta recorrente chegando.',schedule:{at:d}});
          }
          if(items.length)await N.schedule({notifications:items});
          return{};
        }
        default:throw Error('Função não disponível no iPhone.');
      }
    });
  }};
})();
