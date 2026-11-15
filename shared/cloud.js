/* MTV Trainer-Cockpit – gemeinsamer Cloud-Speicher (Supabase, ohne Fremdbibliothek)
   Dokumente: Tabelle public.user_docs (user_id, key, data, updated_at), RLS = nur eigene Daten.
   Lokale Kopie in localStorage, damit es auch ohne Netz in der Halle funktioniert. */
(function(){
'use strict';
const CFG={
  url:'https://igirlnoegyhietojxpds.supabase.co',   // Supabase-Projekt "Handball"
  key:'sb_publishable_FqIAHj2wPerBC4Fv3YbqDQ_53_Z-GaY'
};
const LS_SESSION='mtv_cloud_session',LS_DOC='mtv_cloud_doc_';
const ls={get(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}},
          set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},
          del(k){try{localStorage.removeItem(k);}catch(e){}}};
let session=ls.get(LS_SESSION);
const listeners=new Set();
function emit(state){listeners.forEach(f=>{try{f(state);}catch(e){}});}

async function authReq(path,body){
  const r=await fetch(CFG.url+'/auth/v1/'+path,{method:'POST',headers:{'apikey':CFG.key,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error_description||j.msg||j.message||('Fehler '+r.status));
  return j;
}
function setSession(j){
  session={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Date.now()+(j.expires_in||3600)*1000,user:{id:j.user.id,email:j.user.email}};
  ls.set(LS_SESSION,session);
}
let refreshing=null;
async function token(){
  if(!session)throw new Error('nicht angemeldet');
  if(Date.now()<session.expires_at-60000)return session.access_token;
  if(!refreshing)refreshing=authReq('token?grant_type=refresh_token',{refresh_token:session.refresh_token})
    .then(j=>{setSession(j);}).catch(e=>{if(/invalid|expired|not found/i.test(e.message)){session=null;ls.del(LS_SESSION);emit('logout');}throw e;})
    .finally(()=>{refreshing=null;});
  await refreshing;return session.access_token;
}
async function rest(method,query,body,extra){
  const t=await token();
  const r=await fetch(CFG.url+'/rest/v1/user_docs'+query,{method,headers:Object.assign({'apikey':CFG.key,'Authorization':'Bearer '+t,'Content-Type':'application/json'},extra||{}),body:body?JSON.stringify(body):undefined});
  if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.message||('Fehler '+r.status));}
  return r.status===204?null:r.json();
}

/* Dokument laden: Server gewinnt, außer lokal liegen ungesicherte neuere Änderungen */
async function load(key,fallback){
  const local=ls.get(LS_DOC+key);
  try{
    const rows=await rest('GET','?key=eq.'+encodeURIComponent(key)+'&select=data,updated_at');
    const srv=rows[0];
    if(local&&local.dirty&&(!srv||local.ts>Date.parse(srv.updated_at))){await push(key,local.data);return local.data;}
    if(srv){ls.set(LS_DOC+key,{data:srv.data,ts:Date.parse(srv.updated_at),dirty:false});return srv.data;}
    if(local)return local.data;
    return fallback;
  }catch(e){
    emit('offline');
    return local?local.data:fallback;
  }
}
async function push(key,data){
  const ts=Date.now();
  await rest('POST','?on_conflict=user_id,key',{key,data,updated_at:new Date(ts).toISOString()},{'Prefer':'resolution=merge-duplicates,return=minimal'});
  ls.set(LS_DOC+key,{data,ts,dirty:false});
  emit('saved');
}
const timers={};
function save(key,data){
  ls.set(LS_DOC+key,{data,ts:Date.now(),dirty:true});
  emit('saving');
  clearTimeout(timers[key]);
  timers[key]=setTimeout(()=>{push(key,data).catch(()=>emit('offline'));},700);
}
async function flush(){
  for(const k of Object.keys(localStorage).filter(k=>k.startsWith(LS_DOC))){
    const d=ls.get(k);if(d&&d.dirty){try{await push(k.slice(LS_DOC.length),d.data);}catch(e){emit('offline');return;}}
  }
}
window.addEventListener('online',()=>{if(session)flush();});

/* Passwort ändern: altes Passwort wird zur Sicherheit erst geprüft */
async function changePassword(oldPw,newPw){
  if(!session)throw new Error('nicht angemeldet');
  try{setSession(await authReq('token?grant_type=password',{email:session.user.email,password:oldPw}));}
  catch(e){throw new Error('Aktuelles Passwort ist falsch.');}
  const r=await fetch(CFG.url+'/auth/v1/user',{method:'PUT',headers:{'apikey':CFG.key,'Authorization':'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({password:newPw})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){const m=j.msg||j.message||j.error_description||('Fehler '+r.status);
    throw new Error(/different/i.test(m)?'Das neue Passwort muss sich vom alten unterscheiden.':/at least|short|weak/i.test(m)?'Das neue Passwort ist zu kurz oder zu schwach (mind. 6 Zeichen).':/reauth/i.test(m)?'Supabase verlangt eine erneute Bestätigung – in den Auth-Einstellungen „Secure password change“ ausschalten.':m);}
}
async function login(email,pw){setSession(await authReq('token?grant_type=password',{email,password:pw}));emit('login');}
function logout(){session=null;ls.del(LS_SESSION);Object.keys(localStorage).filter(k=>k.startsWith(LS_DOC)).forEach(k=>ls.del(k));emit('logout');}

/* Login-Maske: ruft onReady() auf, sobald eine Sitzung vorhanden ist */
function requireLogin(onReady,opts){
  opts=opts||{};
  if(session){onReady(session.user);return;}
  const ov=document.createElement('div');
  ov.id='cloud-login';
  ov.innerHTML=`<style>
    #cloud-login{position:fixed;inset:0;z-index:9999;background:rgba(10,10,12,.72);display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.4 -apple-system,system-ui,sans-serif}
    #cloud-login form{background:#fff;color:#1a1a1a;border-radius:16px;padding:22px;width:100%;max-width:360px;box-shadow:0 20px 50px rgba(0,0,0,.4);border-top:4px solid #c8102e}
    #cloud-login h2{margin:0 0 4px;font-size:19px}#cloud-login p{margin:0 0 14px;color:#666;font-size:13px}
    #cloud-login input{width:100%;box-sizing:border-box;margin:0 0 10px;padding:11px 12px;border:1px solid #ccc;border-radius:10px;font-size:16px}
    #cloud-login button{width:100%;padding:12px;border:0;border-radius:10px;background:#c8102e;color:#fff;font-weight:700;font-size:16px}
    #cloud-login .err{color:#c8102e;font-size:13px;min-height:18px;margin-top:8px}
    #cloud-login a{display:block;text-align:center;margin-top:12px;color:#666;font-size:13px}</style>
    <form>${opts.logo?`<img src="${opts.logo}" alt="" style="display:block;height:64px;margin:0 auto 10px">`:''}<h2>${opts.title||'Mein Bereich'}</h2><p>Anmelden, um deine Daten auf allen Geräten zu nutzen.</p>
    <input type="email" name="e" placeholder="E-Mail" autocomplete="username" required>
    <input type="password" name="p" placeholder="Passwort" autocomplete="current-password" required>
    <button type="submit">Anmelden</button><div class="err"></div>${opts.back?`<a href="${opts.back}">← zurück</a>`:''}</form>`;
  document.body.appendChild(ov);
  const fm=ov.querySelector('form'),last=ls.get('mtv_cloud_email');
  if(last){fm.e.value=last;setTimeout(()=>fm.p.focus(),50);}
  ov.querySelector('form').addEventListener('submit',async e=>{
    e.preventDefault();const f=e.target,err=ov.querySelector('.err');err.textContent='…';
    try{await login(f.e.value.trim(),f.p.value);ls.set('mtv_cloud_email',f.e.value.trim());ov.remove();onReady(session.user);}
    catch(x){err.textContent=/invalid/i.test(x.message)?'E-Mail oder Passwort falsch.':x.message;}
  });
}

window.Cloud={load,save,flush,login,logout,requireLogin,changePassword,
  user:()=>session&&session.user,on:f=>listeners.add(f),configured:()=>!/HIER_/.test(CFG.url+CFG.key)};
})();
