(function(){
'use strict';
function isAr(){try{return(localStorage.getItem('sbtp_lang')||'ar')==='ar';}catch(_){return true;}}
function L(ar,fr){return isAr()?ar:fr;}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function getQ(){try{return JSON.parse(localStorage.getItem('sbtp5_offline_queue')||'[]');}catch(_){return[];}}
function saveQ(q){localStorage.setItem('sbtp5_offline_queue',JSON.stringify(q));}
function toast(msg,type){if(typeof Toast!=='undefined')Toast.show(msg,type||'info');}
function pill(s,d){if(typeof updateSyncPill==='function')updateSyncPill(s,d||'');}
var TBL={projects:'🏗️ مشروع',workers:'👷 عامل',equipment:'🚜 معدة',equipment_logs:'📋 سجل صيانة',transactions:'💰 معاملة',attendance:'📅 حضور',materials:'📦 مادة',invoices:'🧾 فاتورة',salary_records:'💵 راتب',documents:'📄 وثيقة',notifications:'🔔 إشعار',kanban_tasks:'📋 مهمة',obligations:'📌 التزام',stock_movements:'📊 مخزون',tenants:'🏢 مؤسسة',users:'👤 مستخدم',notes:'📝 ملاحظة'};
var TBL_FR={projects:'🏗️ Projet',workers:'👷 Ouvrier',equipment:'🚜 Equip.',equipment_logs:'📋 Log equip.',transactions:'💰 Transaction',attendance:'📅 Pointage',materials:'📦 Matériaux',invoices:'🧾 Facture',salary_records:'💵 Salaire',documents:'📄 Document',notifications:'🔔 Notif.',kanban_tasks:'📋 Tâche',obligations:'📌 Obligation',stock_movements:'📊 Stock',tenants:'🏢 Société',users:'👤 Utilisateur',notes:'📝 Note'};
var MTH={POST:{ar:'إضافة',fr:'Ajout',c:'#34C38F',i:'➕'},PATCH:{ar:'تعديل',fr:'Modif.',c:'#4A90E2',i:'✏️'},DELETE:{ar:'حذف',fr:'Suppr.',c:'#F04E6A',i:'🗑️'}};
function tl(t){return(isAr()?TBL:TBL_FR)[t]||t;}
function mi(m){return MTH[m]||{ar:m,fr:m,c:'#888',i:'•'};}
function ago(ts){var d=Date.now()-ts,mn=Math.floor(d/60000),h=Math.floor(mn/60),dy=Math.floor(h/24);if(dy>0)return L('منذ '+dy+'ي',dy+'j');if(h>0)return L('منذ '+h+'س',h+'h');if(mn>0)return L('منذ '+mn+'د',mn+'m');return L('الآن','maint.');}

function buildRow(op,idx,canSync){
  var m=mi(op.method),r=op.record||{},id=r.id||'—';
  var prev=['name','full_name','title','number','amount','date'].map(function(k){return r[k]?'<span style="color:#999">'+k+':</span> <span style="color:#ccc">'+esc(String(r[k]).slice(0,28))+'</span>':null;}).filter(Boolean).slice(0,2).join('  ');
  var bs=canSync?'background:rgba(52,195,143,.15);border:1px solid rgba(52,195,143,.4);color:#34C38F;cursor:pointer':'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#555;cursor:not-allowed;opacity:.5';
  return '<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 14px;border-bottom:1px solid rgba(255,255,255,.04)" onmouseover="this.style.background=\'rgba(255,255,255,.035)\'" onmouseout="this.style.background=\'\'">'
    +'<div style="flex-shrink:0;width:38px;text-align:center"><div style="font-size:1rem">'+m.i+'</div><div style="font-size:.58rem;font-weight:800;color:'+m.c+'">'+L(m.ar,m.fr)+'</div></div>'
    +'<div style="flex:1;min-width:0;overflow:hidden">'
      +'<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">'
        +'<span style="font-weight:700;font-size:.82rem;color:#fff">'+tl(op.table)+'</span>'
        +'<span style="font-family:monospace;font-size:.62rem;color:#666;background:rgba(255,255,255,.07);padding:1px 5px;border-radius:4px">#'+id+'</span>'
        +(op.time?'<span style="font-size:.62rem;color:#666">⏰'+ago(op.time)+'</span>':'')
      +'</div>'
      +(prev?'<div style="font-size:.68rem;margin-top:3px;color:#aaa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+prev+'</div>':'')
    +'</div>'
    +'<div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0">'
      +'<button onclick="window.PQ.retry('+idx+')" '+(canSync?'':'disabled')+' style="'+bs+';padding:4px 8px;border-radius:6px;font-size:.72rem;font-weight:800" title="'+L('رفع','Envoyer')+'">⚡</button>'
      +'<button onclick="window.PQ.remove('+idx+')" style="background:rgba(240,78,106,.12);border:1px solid rgba(240,78,106,.35);color:#F04E6A;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:.72rem;font-weight:800" title="'+L('حذف','Suppr.')+'">🗑️</button>'
    +'</div>'
  +'</div>';
}

function buildContent(){
  var q=getQ(),online=navigator.onLine,sbOk=typeof DB!=='undefined'&&!!DB._useSupabase,canSync=online&&sbOk;
  var sc=!online?'#888':!sbOk?'#F04E6A':'#34C38F';
  var st=!online?L('📵 غير متصل','📵 Hors ligne'):!sbOk?L('⚠️ Supabase معطل','⚠️ Supabase err.'):L('✅ متصل','✅ Connecté');
  if(!q.length){
    return '<div style="padding:13px 16px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between"><span style="font-weight:800;font-size:.9rem">'+L('🔄 المزامنة','🔄 Synchronisation')+'</span><span style="font-size:.7rem;color:'+sc+';font-weight:700">'+st+'</span></div>'
      +'<div style="padding:38px 24px;text-align:center"><div style="font-size:2.8rem;margin-bottom:8px">✅</div><div style="font-weight:700;color:#34C38F;margin-bottom:6px">'+L('كل شيء متزامن','Tout synchronisé')+'</div><div style="font-size:.76rem;color:#888;margin-bottom:16px">'+L('لا توجد عمليات معلقة','Aucune opération en attente')+'</div>'
      +'<button onclick="window.PQ.close();typeof manualSyncNow!==\'undefined\'&&manualSyncNow()" style="padding:8px 20px;background:#4A90E2;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:.82rem">🔄 '+L('مزامنة الآن','Synchroniser')+'</button></div>';
  }
  var rows=q.map(function(op,i){return buildRow(op,i,canSync);}).join('');
  return '<div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:8px">'
      +'<div style="flex:1"><span style="font-weight:800;font-size:.9rem">'+L('⏳ العمليات المعلقة','⏳ File d\'attente')+'</span><span style="font-size:.85rem;font-weight:800;color:#E8B84B;margin:0 6px">'+q.length+'</span></div>'
      +'<span style="font-size:.68rem;color:'+sc+';font-weight:700">'+st+'</span>'
      +'<button onclick="window.PQ.close()" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#aaa;padding:3px 9px;border-radius:6px;cursor:pointer">✕</button>'
    +'</div>'
    +'<div style="padding:8px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(232,184,75,.05);display:flex;gap:6px">'
      +'<button onclick="window.PQ.uploadAll()" '+(canSync?'':'disabled')+' style="flex:1;padding:8px 0;background:'+(canSync?'#E8B84B':'rgba(255,255,255,.06)')+';color:'+(canSync?'#1a1a1a':'#555')+';border:none;border-radius:8px;cursor:'+(canSync?'pointer':'not-allowed')+';font-weight:800;font-size:.8rem;opacity:'+(canSync?'1':'.45')+'">⚡ '+L('رفع الكل','Tout envoyer')+'</button>'
      +'<button onclick="window.PQ.clearAll()" style="flex:1;padding:8px 0;background:rgba(240,78,106,.1);color:#F04E6A;border:1px solid rgba(240,78,106,.3);border-radius:8px;cursor:pointer;font-weight:800;font-size:.8rem">🗑️ '+L('مسح الكل','Tout supprimer')+'</button>'
    +'</div>'
    +'<div style="flex:1;overflow-y:auto;max-height:320px">'+rows+'</div>'
    +'<div style="padding:7px 14px;border-top:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.2);font-size:.62rem;color:#666;text-align:center">💡 '+L('⚡ رفع فردي  •  🗑️ حذف فردي','⚡ envoi individuel  •  🗑️ suppression individuelle')+'</div>';
}

function showProg(done,total){
  var el=document.getElementById('pq-prog');
  if(!el){el=document.createElement('div');el.id='pq-prog';el.style.cssText='position:fixed;bottom:20px;'+(isAr()?'left':'right')+':16px;z-index:9999999;width:290px;background:#111c28;border:1px solid rgba(232,184,75,.5);border-radius:12px;padding:14px 16px;box-shadow:0 12px 40px rgba(0,0,0,.7);font-family:inherit;color:#eee';document.body.appendChild(el);}
  var pct=total?Math.round(done/total*100):0;
  el.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-weight:700;font-size:.85rem">⚡ '+L('جاري الرفع...','Envoi en cours...')+'</span><span style="font-size:.9rem;font-weight:800;color:#E8B84B">'+pct+'%</span></div><div style="background:rgba(255,255,255,.1);border-radius:4px;height:7px;overflow:hidden;margin-bottom:8px"><div style="height:100%;border-radius:4px;transition:width .3s ease;background:linear-gradient(90deg,#E8B84B,#34C38F);width:'+pct+'%"></div></div><div style="font-size:.72rem;color:#aaa;text-align:center">'+done+' / '+total+'</div>';
}
function hideProg(){setTimeout(function(){var el=document.getElementById('pq-prog');if(el)el.remove();},1200);}

window.PQ={
  show:function(){
    if(document.getElementById('pq-dropdown')){this.close();return;}
    if(!document.getElementById('pq-css')){var s=document.createElement('style');s.id='pq-css';s.textContent='@keyframes pqIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:none}}#pq-dropdown{animation:pqIn .18s ease-out}';document.head.appendChild(s);}
    var ar=isAr(),div=document.createElement('div');div.id='pq-dropdown';
    div.style.cssText='position:fixed;top:56px;'+(ar?'left':'right')+':12px;width:390px;max-width:calc(100vw - 24px);background:#111c28;border:1px solid rgba(255,255,255,.13);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.75);z-index:9999998;overflow:hidden;display:flex;flex-direction:column;font-family:inherit;color:#e0e0e0;direction:'+(ar?'rtl':'ltr');
    div.innerHTML=buildContent();
    document.body.appendChild(div);
    setTimeout(function(){
      function outside(e){var dd=document.getElementById('pq-dropdown'),p=document.getElementById('syncPill');if(dd&&!dd.contains(e.target)&&!(p&&p.contains(e.target))){window.PQ.close();document.removeEventListener('click',outside);}}
      document.addEventListener('click',outside);
    },80);
  },
  close:function(){var el=document.getElementById('pq-dropdown');if(el)el.remove();},
  refresh:function(){var dd=document.getElementById('pq-dropdown');if(dd)dd.innerHTML=buildContent();},
  remove:function(idx){var q=getQ();if(idx<0||idx>=q.length)return;q.splice(idx,1);saveQ(q);toast(L('🗑️ تم الحذف','🗑️ Supprimée'),'info');this.refresh();this._p();},
  retry:async function(idx){
    if(!navigator.onLine||typeof DB==='undefined'||!DB._useSupabase){toast(L('📵 لا اتصال','📵 Hors ligne'),'error');return;}
    var q=getQ();if(idx<0||idx>=q.length)return;var op=q[idx];
    toast(L('⏳ جاري الرفع...','⏳ Envoi...'),'info');
    try{
      // ✅ نحوّل PATCH إلى POST+UPSERT لتجنب "PATCH failed"
      var m=op.method==='PATCH'?'POST':op.method;
      await DB._pushToSupabase(op.table,op.record,m,{fromQueue:true});
      q.splice(idx,1);saveQ(q);
      toast(L('✅ تم الرفع بنجاح','✅ Envoyée avec succès'),'success');
      this.refresh();this._p();
    }catch(e){
      toast(L('❌ فشل الرفع: ','❌ Echec: ')+e.message,'error');
      console.error('retry failed:',op.table,op.method,e);
    }
  },
  uploadAll:async function(){
    if(!navigator.onLine||typeof DB==='undefined'||!DB._useSupabase){
      toast(L('📵 لا يوجد اتصال بالإنترنت أو Supabase','📵 Pas de connexion Internet ou Supabase'),'error');
      return;
    }
    var q=getQ();
    if(!q.length){toast(L('لا توجد عمليات معلقة','Aucune opération en attente'),'info');return;}

    var total=q.length,self=this,done=0,failed=[];
    self.close();
    showProg(0,total);
    pill('syncing');

    // ✅ كل عملية تستخدم UPSERT (POST+on_conflict=id) لتجنب مشكلة PATCH على سجل غير موجود
    var CONC=6;
    for(var i=0;i<q.length;i+=CONC){
      var slice=q.slice(i,i+CONC);
      await Promise.all(slice.map(async function(op){
        try{
          // نحوّل كل PATCH إلى UPSERT لأن السجل قد لا يكون موجوداً في Supabase
          var effectiveMethod = op.method==='PATCH' ? 'POST' : op.method;
          await DB._pushToSupabase(op.table,op.record,effectiveMethod,{fromQueue:true});
        }catch(e){
          console.warn('PQ uploadAll failed:',op.table,op.method,'→',e.message);
          // لا نُضيف للفاشلة إذا كان الخطأ مجرد "غير موجود" — سيُعالج بالـ UPSERT
          if(!e.message.includes('0 rows')){
            failed.push(op);
          }
        }
        done++;
        showProg(done,total);
      }));
    }

    saveQ(failed);
    hideProg();
    var succ=total-failed.length;
    if(!failed.length){
      toast(L('✅ تم رفع '+succ+' عملية بنجاح','✅ '+succ+' opérations envoyées'),'success');
      pill('synced');
    }else{
      toast(L('⚠️ نجح '+succ+' / فشل '+failed.length,'⚠️ '+succ+' ok / '+failed.length+' echec'),'warn');
      pill('pending',String(failed.length));
    }
    self._p();
  },
  clearAll:function(){
    var q=getQ();if(!q.length){toast(L('لا توجد','Aucune'),'info');return;}
    if(!confirm(L('مسح '+q.length+' عملية معلقة؟\nلن ترفع للسحابة.\nالبيانات المحلية آمنة.','Supprimer '+q.length+' operation(s)?\nNe seront pas synchronisees.\nDonnees locales conservees.')))return;
    localStorage.removeItem('sbtp5_offline_queue');toast(L('✅ مسحت '+q.length+' عملية','✅ '+q.length+' supprimees'),'success');pill('synced');this.close();this._p();
  },
  _p:function(){var c=getQ().length;pill(c>0?'pending':'synced',c>0?L(c+' معلقة',c+' en attente'):'');}
};

function bindPill(){var el=document.getElementById('syncPill');if(!el||el._pqBound)return;el._pqBound=true;el.onclick=function(e){e.stopPropagation();window.PQ.show();};}
document.addEventListener('DOMContentLoaded',function(){setTimeout(bindPill,300);});
[500,1500,3000].forEach(function(t){setTimeout(bindPill,t);});
(function(){var ti=setInterval(function(){if(typeof App!=='undefined'&&App.render){var o=App.render.bind(App);App.render=function(){var r=o.apply(App,arguments);setTimeout(function(){var el=document.getElementById('syncPill');if(el){el._pqBound=false;bindPill();}},120);return r;};clearInterval(ti);}},500);})();
window.showPendingQueue=function(){window.PQ.show();};
window.removePendingItem=function(i){window.PQ.remove(i);};
window.retryPendingItem=function(i){window.PQ.retry(i);};
window.forceUploadAllPending=function(){window.PQ.uploadAll();};
window.clearAllPending=function(){window.PQ.clearAll();};
console.log('PendingQueue v2 ready');
})();
