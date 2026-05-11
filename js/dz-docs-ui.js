/* ════════════════════════════════════════════════════════════════════
   SmartStruct v7.3 — صفحة مركز الوثائق + معالجات الواجهة
   ════════════════════════════════════════════════════════════════════
   • Pages.dz_documents — الصفحة الرئيسية (5 أقسام × 22 وثيقة)
   • DZDocsUI           — معالجات المودالز ودوال التوليد
   ════════════════════════════════════════════════════════════════════ */

(function() {
'use strict';

// ─── Helpers ───
function _L(ar, fr) {
  if (typeof L === 'function') return L(ar, fr);
  if (typeof I18N !== 'undefined' && I18N.currentLang === 'fr') return fr;
  return ar;
}
function _esc(s) {
  if (typeof escHtml === 'function') return escHtml(s);
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function _toast(msg, type='info') {
  if (typeof Toast !== 'undefined') {
    if (type === 'error')   { Toast.error(msg); return; }
    if (type === 'success') { Toast.success(msg); return; }
    if (Toast.info) Toast.info(msg);
  }
}

// ════════════════════════════════════════════════════════════════════
//  📚 كتالوج الوثائق
// ════════════════════════════════════════════════════════════════════
const DZ_DOC_CATALOG = [
  {
    section: 'pre',
    title: { ar: '① الوثائق التجارية والتعاقدية', fr: '① Documents commerciaux & pré-contractuels' },
    icon: '📑', color: '#3498db',
    desc: { ar: 'مرحلة التفاوض والمناقصات والتمويلات البنكية (ANADE)', fr: 'Phase de négociation, appels d\'offres, financement bancaire' },
    docs: [
      { key: 'proforma', icon: '📋', name: { ar: 'فاتورة شكلية', fr: 'Facture Proforma' },     desc: { ar: 'وثيقة غير ملزمة لتقديم الأسعار', fr: 'Devis informatif non engageant' } },
      { key: 'devis',    icon: '📊', name: { ar: 'كشف كمي وتقديري', fr: 'Devis Estimatif' },   desc: { ar: 'تفصيل دقيق لكل بند من الأشغال', fr: 'Détail des prestations avec quantités' } },
      { key: 'bpu',      icon: '💰', name: { ar: 'جدول أسعار وحدوية', fr: 'Bordereau Prix Unitaires' }, desc: { ar: 'مرجع قانوني للأسعار حسب الوحدة', fr: 'Prix unitaires fermes par unité' } },
      { key: 'offre',    icon: '🏢', name: { ar: 'عرض الخدمة', fr: 'Offre de Service' },       desc: { ar: 'ملف تعريفي بالشركة وسوابقها', fr: 'Présentation entreprise + références' } },
    ]
  },
  {
    section: 'exec',
    title: { ar: '② وثائق الميدان والتنفيذ', fr: '② Documents de chantier & exécution' },
    icon: '🏗️', color: '#e67e22',
    desc: { ar: 'تضمن حقوق المقاول وتوثق مراحل الإنجاز', fr: 'Garantissent droits & documentent étapes' },
    docs: [
      { key: 'pv_ouverture',     icon: '🚀', name: { ar: 'محضر بدء الأشغال', fr: 'PV d\'Ouverture' }, desc: { ar: 'إثبات تاريخ انطلاق المشروع رسمياً', fr: 'Démarrage officiel des travaux' } },
      { key: 'attachement',      icon: '📐', name: { ar: 'كشف المرفقات', fr: 'Attachement' },         desc: { ar: 'جرد دوري للكميات المنجزة', fr: 'Constat contradictoire des quantités' } },
      { key: 'journal',          icon: '📔', name: { ar: 'يوميات الورشة', fr: 'Journal de Chantier' }, desc: { ar: 'سجل يومي للطقس، العمال، العتاد', fr: 'Suivi quotidien météo, effectifs' } },
      { key: 'pv_reception_pro', icon: '🤝', name: { ar: 'استلام مؤقت', fr: 'PV Réception Provisoire' }, desc: { ar: 'انتهاء الأشغال وبدء الضمان', fr: 'Fin travaux + début garantie' } },
      { key: 'pv_reception_def', icon: '✅', name: { ar: 'استلام نهائي', fr: 'PV Réception Définitive' }, desc: { ar: 'بعد فترة الضمان واستلام كامل المستحقات', fr: 'Fin de la période de garantie' } },
    ]
  },
  {
    section: 'fin',
    title: { ar: '③ النظام المالي والفوترة', fr: '③ Système financier & facturation' },
    icon: '💵', color: '#27ae60',
    desc: { ar: 'الوثائق التي تُترجم إلى مبالغ مالية', fr: 'Documents générant des flux financiers' },
    docs: [
      { key: 'acompte',     icon: '⏩', name: { ar: 'فاتورة تسبيق', fr: 'Facture d\'Acompte' },     desc: { ar: 'طلب جزء من المبلغ قبل البدء', fr: 'Avance pour démarrage' } },
      { key: 'situation',   icon: '📈', name: { ar: 'كشف أشغال (وضعية)', fr: 'Situation de Travaux' }, desc: { ar: 'فاتورة مرحلية حسب نسبة التقدم', fr: 'Facture intermédiaire par avancement' } },
      { key: 'def_invoice', icon: '🏁', name: { ar: 'فاتورة نهائية', fr: 'Facture Définitive' },     desc: { ar: 'تصفية كاملة عند تسليم المشروع', fr: 'Solde de tout compte final' } },
      { key: 'quittance',   icon: '🧾', name: { ar: 'وصل تسديد', fr: 'Quittance de Paiement' },      desc: { ar: 'وثيقة تُسلم بعد استلام المبلغ', fr: 'Reçu après encaissement' } },
    ]
  },
  {
    section: 'hr',
    title: { ar: '④ الموارد البشرية والرواتب', fr: '④ Ressources humaines & paie' },
    icon: '👥', color: '#9b59b6',
    desc: { ar: 'تنظيم العلاقة القانونية والمالية مع اليد العاملة', fr: 'Cadre légal & financier des employés' },
    docs: [
      { key: 'paie',        icon: '💼', name: { ar: 'كشف راتب', fr: 'Bulletin de paie' },        desc: { ar: 'الراتب الشهري + اقتطاعات CNAS و IRG', fr: 'Salaire détaillé + CNAS + IRG' } },
      { key: 'cdd',         icon: '📝', name: { ar: 'عقد محدد المدة', fr: 'Contrat CDD' },         desc: { ar: 'عقد مرتبط بمدة المشروع', fr: 'Lié à la durée du projet' } },
      { key: 'cta',         icon: '🤝', name: { ar: 'عقد مدعم CTA', fr: 'Contrat Aidé (ANEM)' },   desc: { ar: 'بالتنسيق مع وكالة التشغيل ANEM', fr: 'En partenariat avec l\'ANEM' } },
      { key: 'cdi',         icon: '🔒', name: { ar: 'عقد دائم CDI', fr: 'Contrat CDI' },           desc: { ar: 'عقد عمل غير محدد المدة', fr: 'Durée indéterminée' } },
      { key: 'pointage',    icon: '⏱️', name: { ar: 'بطاقة حضور', fr: 'Fiche de Pointage' },       desc: { ar: 'تتبع يومي لساعات العمل والإضافي', fr: 'Suivi heures normales & supp.' } },
      { key: 'attestation', icon: '📄', name: { ar: 'شهادة عمل', fr: 'Attestation de Travail' },   desc: { ar: 'تُمنح عند انتهاء علاقة العامل', fr: 'Certificat pour l\'employé' } },
    ]
  },
  {
    section: 'log',
    title: { ar: '⑤ اللوجستيك والمخزون', fr: '⑤ Logistique & inventaire' },
    icon: '📦', color: '#e74c3c',
    desc: { ar: 'التحكم في حركة المواد ومنع الهدر', fr: 'Contrôle du flux & anti-gaspillage' },
    docs: [
      { key: 'commande',  icon: '🛒', name: { ar: 'وصل طلب', fr: 'Bon de Commande' },         desc: { ar: 'وثيقة شراء رسمية للمورد', fr: 'Commande au fournisseur' } },
      { key: 'reception', icon: '📥', name: { ar: 'وصل استلام', fr: 'Bon de Réception' },     desc: { ar: 'مطابقة السلع المستلمة مع الطلب', fr: 'Vérification de conformité' } },
      { key: 'sortie',    icon: '📤', name: { ar: 'وصل خروج', fr: 'Bon de Sortie' },          desc: { ar: 'مراقبة خروج المواد إلى الورشة', fr: 'Sortie du stock vers chantier' } },
      { key: 'suivi',     icon: '🚜', name: { ar: 'بطاقة تتبع عتاد', fr: 'Fiche Suivi Équipement' }, desc: { ar: 'مراقبة الوقود، ساعات العمل، الصيانة', fr: 'Suivi carburant, heures, maintenance' } },
    ]
  },
];

// ════════════════════════════════════════════════════════════════════
//  📄 Pages.dz_documents — الصفحة الرئيسية
// ════════════════════════════════════════════════════════════════════
if (typeof window.Pages === 'undefined') window.Pages = {};

window.Pages.dz_documents = function() {
  if (typeof Auth === 'undefined' || !Auth.getUser()) return '';
  const tenant = Auth.getTenant() || {};
  const tid = Auth.getUser().tenant_id;

  const projects = (DB.get('projects') || []).filter(p => p.tenant_id === tid && !p.is_archived);
  const workers  = (DB.get('workers')  || []).filter(w => w.tenant_id === tid);

  // فحص اكتمال الترويسة القانونية
  const legalFields = [
    { value: tenant.name },        { value: tenant.rc_number },
    { value: tenant.nif },         { value: tenant.nis },
    { value: tenant.article_imp }, { value: tenant.address },
    { value: tenant.phone },       { value: tenant.rib },
  ];
  const filled = legalFields.filter(f => f.value && String(f.value).trim()).length;
  const totalF = legalFields.length;
  const pct    = Math.round((filled/totalF)*100);
  const totalDocs = DZ_DOC_CATALOG.reduce((s,sec) => s + sec.docs.length, 0);
  const layoutFn = (typeof layoutHTML === 'function') ? layoutHTML : ((id, title, content) => content);

  return layoutFn('dz_documents', _L('الوثائق الإدارية والمالية', 'Documents administratifs'), `
<style>
  .dzd-hero{background:linear-gradient(135deg,rgba(232,184,75,.12),rgba(232,184,75,.04));border:1px solid rgba(232,184,75,.25);border-radius:16px;padding:1.4rem 1.6rem;margin-bottom:1.4rem;display:flex;justify-content:space-between;align-items:center;gap:1.2rem;flex-wrap:wrap}
  .dzd-hero h2{font-size:1.4rem;font-weight:900;color:var(--gold);margin-bottom:.3rem}
  .dzd-hero p{font-size:.85rem;color:var(--muted);line-height:1.6;max-width:640px}
  .dzd-hero-stats{display:flex;gap:1.5rem}
  .dzd-hero-stats .num{font-size:1.6rem;font-weight:900;color:var(--gold);font-family:'JetBrains Mono',monospace}
  .dzd-hero-stats .lbl{font-size:.7rem;color:var(--dim);margin-top:.1rem}
  .dzd-section{margin-bottom:1.6rem;background:var(--card-bg,#0e1720);border:1px solid var(--border);border-radius:14px;overflow:hidden}
  .dzd-section-header{padding:1rem 1.2rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:.8rem;background:linear-gradient(90deg,rgba(255,255,255,.02),transparent)}
  .dzd-section-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;flex-shrink:0}
  .dzd-section-title{font-size:1rem;font-weight:800}
  .dzd-section-desc{font-size:.75rem;color:var(--dim);margin-top:.15rem}
  .dzd-section-count{margin-${I18N&&I18N.currentLang==='fr'?'left':'right'}:auto;font-size:.7rem;padding:4px 10px;border-radius:20px;background:rgba(232,184,75,.1);color:var(--gold);font-weight:700}
  .dzd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.8rem;padding:1rem 1.2rem}
  .dzd-card{padding:1rem;border-radius:12px;cursor:pointer;background:rgba(255,255,255,.02);border:1px solid var(--border);transition:all .2s ease;position:relative;overflow:hidden}
  .dzd-card:hover{background:rgba(232,184,75,.05);border-color:rgba(232,184,75,.4);transform:translateY(-2px);box-shadow:0 6px 20px rgba(232,184,75,.08)}
  .dzd-card-icon{font-size:1.8rem;margin-bottom:.5rem}
  .dzd-card-name{font-weight:800;font-size:.92rem;margin-bottom:.3rem;line-height:1.3}
  .dzd-card-desc{font-size:.72rem;color:var(--dim);line-height:1.5;min-height:2.2em}
  .dzd-card-action{margin-top:.6rem;font-size:.72rem;color:var(--gold);font-weight:700;display:flex;align-items:center;gap:.3rem}
  .dzd-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--card-color,var(--gold));opacity:0;transition:opacity .2s}
  .dzd-card:hover::before{opacity:1}
  .dzd-warn{background:rgba(255,193,7,.08);border:1px solid rgba(255,193,7,.25);padding:.8rem 1rem;border-radius:10px;margin-bottom:1.2rem;font-size:.82rem;display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
  .dzd-bar{height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;margin:.5rem 0;width:100%}
  .dzd-bar-fill{height:100%;background:linear-gradient(90deg,#c0392b,#f39c12,#27ae60);border-radius:4px;transition:width .4s}
  .dzd-row-line{display:grid;grid-template-columns:2fr .8fr .8fr 1fr auto;gap:.4rem;align-items:center;background:rgba(255,255,255,.02);padding:.4rem;border-radius:8px;border:1px solid var(--border)}
  .dzd-row-line input,.dzd-row-line select{padding:.45rem .55rem;font-size:.78rem;border-radius:6px;border:1px solid var(--border);background:rgba(0,0,0,.2);color:var(--text);font-family:inherit}
  .dzd-row-line .row-del{padding:.4rem;background:rgba(240,78,106,.1);border:1px solid rgba(240,78,106,.3);color:#F04E6A;border-radius:6px;cursor:pointer;font-size:.75rem}
  .dzd-row-line .row-del:hover{background:rgba(240,78,106,.2)}
  .dzd-lot{background:rgba(232,184,75,.04);border:1px solid rgba(232,184,75,.2);border-radius:10px;padding:.7rem}
  .dzd-lot-head{display:flex;gap:.4rem;align-items:center;margin-bottom:.5rem}
  .dzd-lot-head input{flex:1;padding:.5rem;font-size:.85rem;border-radius:6px;border:1px solid var(--border);background:rgba(0,0,0,.2);color:var(--text);font-weight:700;font-family:inherit}
</style>

<div class="page-header">
  <div>
    <div class="page-title">📚 ${_L('مركز الوثائق الإدارية والمالية', 'Centre des documents')}</div>
    <div class="page-sub">${_L('الدليل الشامل للمقاولات والشركات المصغرة - الجزائر', 'Guide complet pour les entreprises BTP - Algérie')}</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-ghost" onclick="App.navigate('settings')">⚙️ ${_L('البيانات القانونية', 'Données légales')}</button>
  </div>
</div>

<div class="dzd-hero">
  <div>
    <h2>📋 ${totalDocs} ${_L('نوع وثيقة احترافية', 'types de documents pro.')}</h2>
    <p>${_L(
      'مولّد آلي لكل الوثائق القانونية والمالية والإدارية المطلوبة في قطاع المقاولات الجزائري. كل وثيقة تحوي تلقائياً الترويسة القانونية الكاملة (RC, NIF, NIS, رقم المادة، RIB) وتدعم الطباعة المباشرة وحفظ PDF.',
      'Générateur automatique de tous les documents légaux et administratifs requis dans le BTP algérien. Chaque document inclut l\'en-tête légal complet (RC, NIF, NIS, Art. d\'imposition, RIB) et supporte l\'impression et l\'export PDF.'
    )}</p>
  </div>
  <div class="dzd-hero-stats">
    <div style="text-align:center"><div class="num">${DZ_DOC_CATALOG.length}</div><div class="lbl">${_L('أقسام', 'Sections')}</div></div>
    <div style="text-align:center"><div class="num">${totalDocs}</div><div class="lbl">${_L('وثيقة', 'Documents')}</div></div>
    <div style="text-align:center"><div class="num">${pct}%</div><div class="lbl">${_L('اكتمال البيانات', 'Données')}</div></div>
  </div>
</div>

${pct < 100 ? `
<div class="dzd-warn">
  <span style="font-size:1.4rem">⚠️</span>
  <div style="flex:1;min-width:200px">
    <div style="font-weight:700;margin-bottom:.2rem">${_L('بيانات قانونية ناقصة', 'Données légales incomplètes')}</div>
    <div style="font-size:.78rem;color:var(--muted)">${_L(
      `لكي تظهر الترويسة القانونية كاملة على كل الوثائق، استكمل البيانات (${filled}/${totalF} مكتمل).`,
      `Pour un en-tête légal complet, remplissez tous les champs (${filled}/${totalF} remplis).`
    )}</div>
    <div class="dzd-bar"><div class="dzd-bar-fill" style="width:${pct}%"></div></div>
  </div>
  <button class="btn btn-gold btn-sm" onclick="App.navigate('settings')">⚙️ ${_L('استكمال', 'Compléter')}</button>
</div>` : ''}

${DZ_DOC_CATALOG.map(section => `
  <div class="dzd-section">
    <div class="dzd-section-header">
      <div class="dzd-section-icon" style="background:${section.color}20;color:${section.color}">${section.icon}</div>
      <div style="flex:1">
        <div class="dzd-section-title">${_esc(_L(section.title.ar, section.title.fr))}</div>
        <div class="dzd-section-desc">${_esc(_L(section.desc.ar, section.desc.fr))}</div>
      </div>
      <div class="dzd-section-count">${section.docs.length} ${_L('وثيقة', 'docs')}</div>
    </div>
    <div class="dzd-grid">
      ${section.docs.map(doc => `
        <div class="dzd-card" style="--card-color:${section.color}" onclick="DZDocsUI.open('${doc.key}')">
          <div class="dzd-card-icon">${doc.icon}</div>
          <div class="dzd-card-name">${_esc(_L(doc.name.ar, doc.name.fr))}</div>
          <div class="dzd-card-desc">${_esc(_L(doc.desc.ar, doc.desc.fr))}</div>
          <div class="dzd-card-action">📄 ${_L('توليد PDF', 'Générer PDF')} ←</div>
        </div>
      `).join('')}
    </div>
  </div>
`).join('')}

<!-- ═════════ MODAL UNIVERSEL ═════════ -->
<div class="modal-overlay" id="dzdModal">
  <div class="modal" style="max-width:800px">
    <div class="modal-title" id="dzdModalTitle">📄 ${_L('توليد وثيقة', 'Générer document')}</div>
    <div id="dzdModalBody" style="max-height:65vh;overflow-y:auto;padding:.4rem"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="DZDocsUI.close()">${_L('إلغاء', 'Annuler')}</button>
      <button class="btn btn-gold" id="dzdGenerateBtn">📄 ${_L('توليد وطباعة PDF', 'Générer & Imprimer PDF')}</button>
    </div>
  </div>
</div>
  `);
};

// ════════════════════════════════════════════════════════════════════
//  💼 DZDocsUI — معالجات الواجهة
// ════════════════════════════════════════════════════════════════════
window.DZDocsUI = {

  open(key) {
    const handler = this._handlers[key];
    if (!handler) { _toast(_L('وثيقة غير معروفة','Document inconnu'),'error'); return; }
    handler.call(this);
    document.getElementById('dzdModal')?.classList.add('show');
  },
  close() { document.getElementById('dzdModal')?.classList.remove('show'); },

  // ── Helpers ──
  _setTitle(t)        { const el=document.getElementById('dzdModalTitle'); if(el) el.innerHTML=t; },
  _setBody(html)      { const el=document.getElementById('dzdModalBody'); if(el) el.innerHTML=html; },
  _setAction(label, fn) {
    const old = document.getElementById('dzdGenerateBtn');
    if (!old) return;
    const btn = old.cloneNode(false);
    btn.id = 'dzdGenerateBtn';
    btn.className = 'btn btn-gold';
    btn.innerHTML = label;
    old.parentNode.replaceChild(btn, old);
    btn.addEventListener('click', () => {
      try { fn(); this.close(); }
      catch(e) { console.error('[DZDocs]',e); _toast(e.message||'Erreur','error'); }
    });
  },
  _val(id, fb='') { const el=document.getElementById(id); return el ? (el.value||fb) : fb; },
  _num(id, fb=0)  { const el=document.getElementById(id); if(!el) return fb; const n=Number(el.value); return isNaN(n)?fb:n; },

  _projectsList() {
    if (typeof Auth==='undefined') return [];
    const tid = Auth.getUser()?.tenant_id;
    return (DB.get('projects')||[]).filter(p => p.tenant_id===tid && !p.is_archived);
  },
  _workersList() {
    if (typeof Auth==='undefined') return [];
    const tid = Auth.getUser()?.tenant_id;
    return (DB.get('workers')||[]).filter(w => w.tenant_id===tid);
  },
  _invoicesList() {
    if (typeof Auth==='undefined') return [];
    const tid = Auth.getUser()?.tenant_id;
    return (DB.get('invoices')||[]).filter(i => i.tenant_id===tid);
  },

  // قراءة rows ديناميكية
  _readRows(containerId, fields) {
    const c = document.getElementById(containerId);
    if (!c) return [];
    return Array.from(c.querySelectorAll('[data-row]')).map(row => {
      const o = {};
      fields.forEach(f => {
        const el = row.querySelector(`[data-field="${f}"]`);
        if (!el) return;
        if (el.type==='number') o[f] = Number(el.value||0);
        else o[f] = el.value || '';
      });
      return o;
    });
  },

  // إضافة سطر للجداول الديناميكية
  _addRow(containerId, fields, defaults={}) {
    const c = document.getElementById(containerId);
    if (!c) return;
    const row = document.createElement('div');
    row.className = 'dzd-row-line';
    row.setAttribute('data-row', '');

    const placeholders = {
      desc: _L('الوصف','Description'), unit: _L('الوحدة','Unité'),
      qty: _L('الكمية','Qté'), price: _L('السعر','Prix'),
      qtyMarket: _L('كمية الصفقة','Qté marché'), qtyDone: _L('كمية منجزة','Qté exécutée'),
      qtyCumul: _L('كمية تراكمية','Qté cumul.'),
      qtyOrdered:_L('مطلوبة','Commandée'), qtyDelivered:_L('مسلّمة','Livrée'), qtyAccepted:_L('مقبولة','Acceptée'),
      stockBefore:_L('قبل','Avant'), qtyOut:_L('خارج','Sortie'), usage:_L('الاستعمال','Usage'),
      code:_L('الرقم','Code'),
      // Journal/Pointage
      date:_L('التاريخ','Date'), weather:_L('الطقس','Météo'), workers:_L('عمال','Effectif'),
      work:_L('العمل','Travaux'), equipment:_L('العتاد','Matériel'), notes:_L('ملاحظات','Obs.'),
      checkIn:_L('الدخول','Entrée'), checkOut:_L('الخروج','Sortie'), hours:_L('ساعات','Heures'), overtime:_L('إضافي','Sup.'),
      // Equip
      project:_L('مشروع','Chantier'), hourStart:_L('بداية','Début'), hourEnd:_L('نهاية','Fin'), fuel:_L('وقود','Carburant'),
      type:_L('النوع','Type'), cost:_L('التكلفة','Coût'), nextDate:_L('التالية','Prochaine'),
      // Reception
      status:_L('الحالة','État'),
      // Reserves
      deadline:_L('الأجل','Délai'),
      // Refs/team
      year:_L('السنة','Année'), amount:_L('المبلغ','Montant'),
      role:_L('المنصب','Fonction'), count:_L('العدد','Effectif'), qualification:_L('المؤهل','Qualif.'),
      name:_L('الاسم','Nom'), specs:_L('المواصفات','Spécif.'),
    };

    let html = '';
    fields.forEach(f => {
      const ph = placeholders[f] || f;
      const val = defaults[f] !== undefined ? String(defaults[f]) : '';
      const isNum = ['qty','price','qtyMarket','qtyDone','qtyCumul','qtyOrdered','qtyDelivered','qtyAccepted','stockBefore','qtyOut','workers','hours','overtime','fuel','cost','count','amount'].includes(f);
      const isDate = ['date','nextDate'].includes(f);
      const isSelect = f === 'status';
      if (isSelect) {
        html += `<select data-field="${f}"><option value="ok">${_L('سليم','OK')}</option><option value="partial">${_L('جزئي','Partiel')}</option><option value="refused">${_L('مرفوض','Refusé')}</option></select>`;
      } else if (isDate) {
        html += `<input type="date" data-field="${f}" value="${_esc(val)}">`;
      } else {
        html += `<input type="${isNum?'number':'text'}" data-field="${f}" placeholder="${_esc(ph)}" value="${_esc(val)}" ${isNum?'min="0" step="0.01"':''}>`;
      }
    });
    html += `<button type="button" class="row-del" title="${_L('حذف','Suppr.')}">✕</button>`;

    // override grid template for variable column counts
    const cols = fields.length;
    row.style.gridTemplateColumns = `repeat(${cols}, 1fr) auto`;
    row.innerHTML = html;
    row.querySelector('.row-del')?.addEventListener('click', () => row.remove());
    c.appendChild(row);
  },

  // إضافة LOT للديفيس
  _addLot() {
    const c = document.getElementById('devLots');
    if (!c) return;
    const idx = c.children.length + 1;
    const lot = document.createElement('div');
    lot.className = 'dzd-lot';
    lot.setAttribute('data-lot', '');
    const itemsId = `devLotItems${Date.now()}`;
    lot.innerHTML = `
      <div class="dzd-lot-head">
        <span style="font-weight:700;color:var(--gold)">LOT ${idx}</span>
        <input data-lot-name placeholder="${_L('اسم اللوط (مثلاً: العمل الترابي)','Nom du LOT (ex: Terrassement)')}">
        <button type="button" class="row-del" style="padding:.4rem .7rem">✕</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('${itemsId}', ['desc','unit','qty','price'])">+ ${_L('بند','Ligne')}</button>
      </div>
      <div id="${itemsId}" style="display:flex;flex-direction:column;gap:.3rem"></div>
    `;
    lot.querySelector('.row-del')?.addEventListener('click', () => lot.remove());
    c.appendChild(lot);
    setTimeout(() => this._addRow(itemsId, ['desc','unit','qty','price']), 30);
  },

  // ════════════════════════════════════════════════════
  //  💼 المعالجات الكاملة لكل وثيقة
  // ════════════════════════════════════════════════════
  _handlers: {

    // ════════ ① Pre-Contract ════════
    proforma() {
      this._setTitle('📋 ' + _L('فاتورة شكلية', 'Facture Proforma'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group"><label class="form-label">${_L('اسم العميل','Nom client')} *</label>
    <input class="form-input" id="proClient" placeholder="SARL ..."></div>
  <div class="form-group"><label class="form-label">NIF ${_L('العميل','client')}</label>
    <input class="form-input" id="proClientNif"></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('عنوان العميل','Adresse client')}</label>
    <input class="form-input" id="proClientAddr"></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('الموضوع','Objet')}</label>
    <input class="form-input" id="proSubject" value="${_L('أشغال البناء','Travaux de construction')}"></div>
  <div class="form-group"><label class="form-label">${_L('مدة الصلاحية','Validité')}</label>
    <input class="form-input" id="proValid" value="30 ${_L('يوم','jours')}"></div>
  <div class="form-group"><label class="form-label">${_L('شروط الدفع','Modalités')}</label>
    <input class="form-input" id="proPay" value="${_L('50% مسبق, 50% عند التسليم','50% acompte + 50% livraison')}"></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📋 ${_L('بنود الفاتورة','Lignes')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('proItems',['desc','unit','qty','price'])">+ ${_L('إضافة','Ajouter')}</button>
  </div>
  <div id="proItems" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('proItems', ['desc','unit','qty','price']), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const items = this._readRows('proItems', ['desc','unit','qty','price']).map(r => ({...r, total: Number(r.qty||0)*Number(r.price||0)}));
        if (!this._val('proClient')) { _toast(_L('أدخل اسم العميل','Saisir le client'),'error'); return; }
        if (items.length === 0) { _toast(_L('أضف بنداً واحداً','Au moins une ligne'),'error'); return; }
        DZDocs.factureProforma({
          clientName: this._val('proClient'),
          clientNif: this._val('proClientNif'),
          clientAddress: this._val('proClientAddr'),
          subject: this._val('proSubject'),
          validity: this._val('proValid'),
          payTerms: this._val('proPay'),
          items
        });
      });
    },

    devis() {
      this._setTitle('📊 ' + _L('كشف كمي وتقديري','Devis Estimatif'));
      const projs = this._projectsList();
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group"><label class="form-label">🏗️ ${_L('المشروع','Projet')}</label>
    <select class="form-select" id="devProj">
      <option value="">— ${_L('بدون','Aucun')} —</option>
      ${projs.map(p => `<option value="${p.id}">${_esc(p.name)}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('اسم المشروع (إن لم يكن مسجلاً)','Nom projet')}</label>
    <input class="form-input" id="devProjName"></div>
  <div class="form-group"><label class="form-label">${_L('صاحب المشروع','Maître d\'ouvrage')}</label>
    <input class="form-input" id="devMO"></div>
  <div class="form-group"><label class="form-label">${_L('مدة التنفيذ','Délai')}</label>
    <input class="form-input" id="devDelay" value="${_L('6 أشهر','6 mois')}"></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📊 ${_L('اللوطات والبنود','Lots & lignes')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addLot()">+ ${_L('إضافة لوط','Ajouter LOT')}</button>
  </div>
  <div id="devLots" style="display:flex;flex-direction:column;gap:.7rem"></div>
</div>`);
      setTimeout(() => this._addLot(), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const lots = Array.from(document.querySelectorAll('[data-lot]')).map(lotEl => {
          const name = lotEl.querySelector('[data-lot-name]')?.value || '';
          const items = Array.from(lotEl.querySelectorAll('[data-row]')).map(row => {
            const o = {};
            ['desc','unit','qty','price'].forEach(f => {
              const e = row.querySelector(`[data-field="${f}"]`);
              o[f] = e ? (e.type==='number' ? Number(e.value||0) : e.value) : '';
            });
            o.total = Number(o.qty||0) * Number(o.price||0);
            return o;
          });
          return { name, items };
        }).filter(l => l.items.length > 0);
        if (lots.length === 0) { _toast(_L('أضف لوطاً واحداً مع بند','Ajouter au moins un lot'),'error'); return; }
        const projId = this._val('devProj');
        const proj = projId ? this._projectsList().find(p => String(p.id)===String(projId)) : null;
        DZDocs.devisEstimatif({
          project: proj || { name: this._val('devProjName') },
          maitreOuvrage: this._val('devMO'),
          delay: this._val('devDelay'),
          lots
        });
      });
    },

    bpu() {
      this._setTitle('💰 ' + _L('جدول الأسعار الوحدوية','Bordereau Prix Unitaires'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group"><label class="form-label">${_L('مرجع الصفقة','Réf. marché')}</label>
    <input class="form-input" id="bpuMarket"></div>
  <div class="form-group"><label class="form-label">${_L('صاحب المشروع','Maître d\'ouvrage')}</label>
    <input class="form-input" id="bpuMO"></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('الموضوع','Objet')}</label>
    <input class="form-input" id="bpuSubject" value="${_L('أشغال البناء العامة','Travaux BTP')}"></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">💰 ${_L('قائمة الأسعار','Liste des prix')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('bpuItems',['code','desc','unit','price'])">+ ${_L('إضافة','Ajouter')}</button>
  </div>
  <div id="bpuItems" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('bpuItems', ['code','desc','unit','price']), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const items = this._readRows('bpuItems', ['code','desc','unit','price']);
        if (items.length === 0) { _toast(_L('أضف بنداً','Au moins une ligne'),'error'); return; }
        DZDocs.bpu({
          marketRef: this._val('bpuMarket'),
          maitreOuvrage: this._val('bpuMO'),
          subject: this._val('bpuSubject'),
          items
        });
      });
    },

    offre() {
      this._setTitle('🏢 ' + _L('عرض الخدمة','Offre de Service'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('المرسل إليه','Destinataire')} *</label>
    <input class="form-input" id="offRecipient" placeholder="${_L('اسم الجهة...','Organisme...')}"></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('العنوان','Adresse')}</label>
    <input class="form-input" id="offRecipAddr"></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('تقديم المؤسسة (اتركه فارغاً للنص الافتراضي)','Présentation entreprise (vide = défaut)')}</label>
    <textarea class="form-input" id="offPresent" rows="3"></textarea></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('مجالات النشاط','Domaines d\'intervention')}</label>
    <textarea class="form-input" id="offDomains" rows="2" placeholder="${_L('مباني، أشغال عمومية...','Bâtiments TCE, TP, VRD...')}"></textarea></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📚 ${_L('السوابق المهنية','Références')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('offRefs',['project','client','year','amount'])">+ ${_L('مرجع','Référence')}</button>
  </div>
  <div id="offRefs" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">👥 ${_L('الموارد البشرية','Moyens humains')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('offTeam',['role','count','qualification'])">+ ${_L('فئة','Ajouter')}</button>
  </div>
  <div id="offTeam" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">🚜 ${_L('العتاد والمعدات','Matériel')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('offEquip',['name','count','specs'])">+ ${_L('عتاد','Matériel')}</button>
  </div>
  <div id="offEquip" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      // Pre-fill team from workers if available (top roles)
      const workers = this._workersList();
      if (workers.length > 0) {
        const roles = {};
        workers.forEach(w => { roles[w.role || _L('عامل','Ouvrier')] = (roles[w.role || _L('عامل','Ouvrier')] || 0) + 1; });
        setTimeout(() => {
          Object.entries(roles).forEach(([role, count]) => {
            this._addRow('offTeam', ['role','count','qualification'], { role, count, qualification: '' });
          });
        }, 30);
      } else {
        setTimeout(() => this._addRow('offTeam', ['role','count','qualification']), 30);
      }
      // Pre-fill equipment
      const equips = (typeof Auth!=='undefined') ? (DB.get('equipment')||[]).filter(e => e.tenant_id===Auth.getUser()?.tenant_id) : [];
      if (equips.length > 0) {
        setTimeout(() => {
          equips.slice(0, 5).forEach(e => this._addRow('offEquip', ['name','count','specs'], { name: e.name||'', count: 1, specs: e.type||'' }));
        }, 60);
      } else {
        setTimeout(() => this._addRow('offEquip', ['name','count','specs']), 60);
      }
      setTimeout(() => this._addRow('offRefs', ['project','client','year','amount']), 30);

      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        if (!this._val('offRecipient')) { _toast(_L('أدخل المرسل إليه','Saisir le destinataire'),'error'); return; }
        DZDocs.offreService({
          recipient: this._val('offRecipient'),
          recipientAddress: this._val('offRecipAddr'),
          presentation: this._val('offPresent'),
          domains: this._val('offDomains'),
          references: this._readRows('offRefs', ['project','client','year','amount']),
          team: this._readRows('offTeam', ['role','count','qualification']),
          equipment: this._readRows('offEquip', ['name','count','specs']),
        });
      });
    },

    // ════════ ② Execution ════════
    pv_ouverture() {
      this._setTitle('🚀 ' + _L('محضر بدء الأشغال','PV d\'Ouverture'));
      const projs = this._projectsList();
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group"><label class="form-label">🏗️ ${_L('المشروع','Projet')} *</label>
    <select class="form-select" id="pvoProj">
      <option value="">— ${_L('اختر','Choisir')} —</option>
      ${projs.map(p => `<option value="${p.id}">${_esc(p.name)}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('مرجع الصفقة','Réf. marché')}</label>
    <input class="form-input" id="pvoMarket"></div>
  <div class="form-group"><label class="form-label">${_L('صاحب المشروع','Maître d\'ouvrage')} *</label>
    <input class="form-input" id="pvoMO"></div>
  <div class="form-group"><label class="form-label">${_L('ممثل صاحب المشروع','Représentant MO')}</label>
    <input class="form-input" id="pvoMOrep"></div>
  <div class="form-group"><label class="form-label">${_L('ممثل المؤسسة','Représentant entreprise')}</label>
    <input class="form-input" id="pvoEntRep"></div>
  <div class="form-group"><label class="form-label">${_L('مكتب الدراسات (BET)','BET / M. d\'œuvre')}</label>
    <input class="form-input" id="pvoBet"></div>
  <div class="form-group"><label class="form-label">${_L('هيئة المراقبة','Organisme contrôle')}</label>
    <input class="form-input" id="pvoCtrl" placeholder="CTC..."></div>
  <div class="form-group"><label class="form-label">${_L('تاريخ المحضر','Date')}</label>
    <input class="form-input" type="date" id="pvoDate" value="${new Date().toISOString().split('T')[0]}"></div>
  <div class="form-group"><label class="form-label">${_L('الساعة','Heure')}</label>
    <input class="form-input" id="pvoHour" value="09h00"></div>
  <div class="form-group"><label class="form-label">${_L('تاريخ الانطلاق','Date démarrage')}</label>
    <input class="form-input" type="date" id="pvoStart" value="${new Date().toISOString().split('T')[0]}"></div>
  <div class="form-group"><label class="form-label">${_L('مدة التنفيذ','Délai d\'exécution')}</label>
    <input class="form-input" id="pvoDelay" value="6 ${_L('أشهر','mois')}"></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('الملاحظات والمعاينات','Observations')}</label>
    <textarea class="form-input" id="pvoObs" rows="3" placeholder="${_L('اتركه فارغاً للنص الافتراضي','Vide = texte par défaut')}"></textarea></div>
</div>`);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const projId = this._val('pvoProj');
        const proj = projId ? this._projectsList().find(p => String(p.id)===String(projId)) : null;
        if (!proj) { _toast(_L('اختر مشروعاً','Choisir un projet'),'error'); return; }
        if (!this._val('pvoMO')) { _toast(_L('أدخل صاحب المشروع','Saisir le MO'),'error'); return; }
        DZDocs.pvOuverture({
          project: proj,
          marketRef: this._val('pvoMarket'),
          maitreOuvrage: this._val('pvoMO'),
          maitreRep: this._val('pvoMOrep'),
          entrepriseRep: this._val('pvoEntRep'),
          bet: this._val('pvoBet'),
          controle: this._val('pvoCtrl'),
          date: this._val('pvoDate'),
          hour: this._val('pvoHour'),
          startDate: this._val('pvoStart'),
          delay: this._val('pvoDelay'),
          observations: this._val('pvoObs'),
        });
      });
    },

    attachement() {
      this._setTitle('📐 ' + _L('كشف المرفقات','Attachement'));
      const projs = this._projectsList();
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group"><label class="form-label">🏗️ ${_L('المشروع','Projet')}</label>
    <select class="form-select" id="attProj">
      <option value="">— ${_L('بدون','Aucun')} —</option>
      ${projs.map(p => `<option value="${p.id}">${_esc(p.name)}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('رقم المرفق','N° Attachement')}</label>
    <input class="form-input" id="attNum" value="01"></div>
  <div class="form-group"><label class="form-label">${_L('مرجع الصفقة','Réf. marché')}</label>
    <input class="form-input" id="attMarket"></div>
  <div class="form-group"><label class="form-label">${_L('من تاريخ','Du')}</label>
    <input class="form-input" type="date" id="attFrom"></div>
  <div class="form-group"><label class="form-label">${_L('إلى تاريخ','Au')}</label>
    <input class="form-input" type="date" id="attTo" value="${new Date().toISOString().split('T')[0]}"></div>
  <div class="form-group"><label class="form-label">${_L('تاريخ المعاينة','Date constat')}</label>
    <input class="form-input" type="date" id="attDate" value="${new Date().toISOString().split('T')[0]}"></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📐 ${_L('الكميات المنجزة','Quantités exécutées')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('attItems',['desc','unit','qtyMarket','qtyDone','price'])">+ ${_L('بند','Ligne')}</button>
  </div>
  <div id="attItems" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('attItems', ['desc','unit','qtyMarket','qtyDone','price']), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const items = this._readRows('attItems', ['desc','unit','qtyMarket','qtyDone','price']);
        const projId = this._val('attProj');
        const proj = projId ? this._projectsList().find(p => String(p.id)===String(projId)) : null;
        DZDocs.attachement({
          project: proj || {},
          attNum: this._val('attNum'),
          marketRef: this._val('attMarket'),
          from: this._val('attFrom'),
          to: this._val('attTo'),
          date: this._val('attDate'),
          items
        });
      });
    },

    journal() {
      this._setTitle('📔 ' + _L('يوميات الورشة','Journal de Chantier'));
      const projs = this._projectsList();
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group"><label class="form-label">🏗️ ${_L('المشروع','Projet')}</label>
    <select class="form-select" id="jcProj">
      <option value="">—</option>
      ${projs.map(p => `<option value="${p.id}">${_esc(p.name)}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('قائد الأشغال','Conducteur')}</label>
    <input class="form-input" id="jcCond"></div>
  <div class="form-group"><label class="form-label">${_L('من تاريخ','Du')}</label>
    <input class="form-input" type="date" id="jcFrom"></div>
  <div class="form-group"><label class="form-label">${_L('إلى تاريخ','Au')}</label>
    <input class="form-input" type="date" id="jcTo" value="${new Date().toISOString().split('T')[0]}"></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📔 ${_L('السجل اليومي','Entrées quotidiennes')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('jcDays',['date','weather','workers','work','equipment','notes'])">+ ${_L('يوم','Journée')}</button>
  </div>
  <div id="jcDays" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('jcDays', ['date','weather','workers','work','equipment','notes'], { date: new Date().toISOString().split('T')[0], weather: '☀️' }), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const days = this._readRows('jcDays', ['date','weather','workers','work','equipment','notes']);
        const projId = this._val('jcProj');
        const proj = projId ? this._projectsList().find(p => String(p.id)===String(projId)) : null;
        DZDocs.journalChantier({
          project: proj || {},
          conductor: this._val('jcCond'),
          from: this._val('jcFrom'),
          to: this._val('jcTo'),
          days
        });
      });
    },

    pv_reception_pro() { this._pvReception('pro'); },
    pv_reception_def() { this._pvReception('final'); },
    _pvReception(kind) {
      const isFinal = kind === 'final';
      this._setTitle((isFinal?'✅ ':'🤝 ') + _L(isFinal?'استلام نهائي':'استلام مؤقت', isFinal?'PV Réception Définitive':'PV Réception Provisoire'));
      const projs = this._projectsList();
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group"><label class="form-label">🏗️ ${_L('المشروع','Projet')} *</label>
    <select class="form-select" id="pvrProj">
      <option value="">—</option>
      ${projs.map(p => `<option value="${p.id}">${_esc(p.name)}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('مرجع الصفقة','Réf. marché')}</label>
    <input class="form-input" id="pvrMarket"></div>
  <div class="form-group"><label class="form-label">${_L('صاحب المشروع','Maître d\'ouvrage')} *</label>
    <input class="form-input" id="pvrMO"></div>
  <div class="form-group"><label class="form-label">${_L('تاريخ الاستلام','Date réception')}</label>
    <input class="form-input" type="date" id="pvrDate" value="${new Date().toISOString().split('T')[0]}"></div>
  ${!isFinal ? `
  <div class="form-group"><label class="form-label">${_L('فترة الضمان','Période garantie')}</label>
    <input class="form-input" id="pvrWarranty" value="12 ${_L('شهر','mois')}"></div>
  <div class="form-group"><label class="form-label">${_L('نهاية الضمان','Fin garantie')}</label>
    <input class="form-input" type="date" id="pvrWarrantyEnd"></div>
  ` : ''}
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">⚠️ ${_L('التحفظات','Réserves')} (${_L('اختياري','optionnel')})</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('pvrReserves',['desc','deadline','status'])">+ ${_L('تحفظ','Réserve')}</button>
  </div>
  <div id="pvrReserves" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const projId = this._val('pvrProj');
        const proj = projId ? this._projectsList().find(p => String(p.id)===String(projId)) : null;
        if (!proj) { _toast(_L('اختر مشروعاً','Choisir un projet'),'error'); return; }
        if (!this._val('pvrMO')) { _toast(_L('أدخل صاحب المشروع','Saisir le MO'),'error'); return; }
        DZDocs.pvReception({
          kind,
          project: proj,
          marketRef: this._val('pvrMarket'),
          maitreOuvrage: this._val('pvrMO'),
          date: this._val('pvrDate'),
          warrantyPeriod: this._val('pvrWarranty'),
          warrantyEnd: this._val('pvrWarrantyEnd'),
          reserves: this._readRows('pvrReserves', ['desc','deadline','status'])
        });
      });
    },

    // ════════ ③ Finance ════════
    acompte() {
      this._setTitle('⏩ ' + _L('فاتورة تسبيق','Facture d\'Acompte'));
      const projs = this._projectsList();
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group"><label class="form-label">${_L('اسم العميل','Client')} *</label>
    <input class="form-input" id="acoClient"></div>
  <div class="form-group"><label class="form-label">NIF ${_L('العميل','Client')}</label>
    <input class="form-input" id="acoClientNif"></div>
  <div class="form-group"><label class="form-label">🏗️ ${_L('المشروع','Projet')}</label>
    <select class="form-select" id="acoProj"><option value="">—</option>
      ${projs.map(p => `<option value="${p.id}" data-budget="${p.budget||0}" data-name="${_esc(p.name)}">${_esc(p.name)}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('مرجع الصفقة','Réf. marché')}</label>
    <input class="form-input" id="acoMarket"></div>
  <div class="form-group"><label class="form-label">${_L('قيمة العقد الكلية (دج)','Montant total marché (DA)')}</label>
    <input class="form-input" type="number" id="acoTotal" min="0"></div>
  <div class="form-group"><label class="form-label">${_L('مبلغ التسبيق TTC (دج)','Montant acompte TTC (DA)')} *</label>
    <input class="form-input" type="number" id="acoAmount" min="0"></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('الوصف','Description')}</label>
    <textarea class="form-input" id="acoDesc" rows="2"></textarea></div>
</div>`);
      // Pre-fill description from project
      document.getElementById('acoProj')?.addEventListener('change', e => {
        const opt = e.target.selectedOptions[0];
        if (opt) {
          const total = document.getElementById('acoTotal');
          if (total && !total.value) total.value = opt.dataset.budget || '';
        }
      });
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        if (!this._val('acoClient')) { _toast(_L('أدخل العميل','Saisir le client'),'error'); return; }
        if (this._num('acoAmount') <= 0) { _toast(_L('أدخل مبلغ التسبيق','Saisir le montant'),'error'); return; }
        const projId = this._val('acoProj');
        const proj = projId ? this._projectsList().find(p => String(p.id)===String(projId)) : null;
        DZDocs.factureAcompte({
          clientName: this._val('acoClient'),
          clientNif: this._val('acoClientNif'),
          projectName: proj?.name || '',
          marketRef: this._val('acoMarket'),
          totalContract: this._num('acoTotal'),
          amount: this._num('acoAmount'),
          description: this._val('acoDesc'),
        });
      });
    },

    situation() {
      this._setTitle('📈 ' + _L('كشف الأشغال (وضعية)','Situation de Travaux'));
      const projs = this._projectsList();
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group"><label class="form-label">${_L('رقم الوضعية','N° Situation')}</label>
    <input class="form-input" id="sitNum" value="01"></div>
  <div class="form-group"><label class="form-label">${_L('مرجع الصفقة','Réf. marché')}</label>
    <input class="form-input" id="sitMarket"></div>
  <div class="form-group"><label class="form-label">🏗️ ${_L('المشروع','Projet')}</label>
    <select class="form-select" id="sitProj"><option value="">—</option>
      ${projs.map(p => `<option value="${p.id}" data-name="${_esc(p.name)}">${_esc(p.name)}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('صاحب المشروع','Maître d\'ouvrage')}</label>
    <input class="form-input" id="sitMO"></div>
  <div class="form-group"><label class="form-label">${_L('من تاريخ','Du')}</label>
    <input class="form-input" type="date" id="sitFrom"></div>
  <div class="form-group"><label class="form-label">${_L('إلى تاريخ','Au')}</label>
    <input class="form-input" type="date" id="sitTo" value="${new Date().toISOString().split('T')[0]}"></div>
  <div class="form-group"><label class="form-label">${_L('الوضعيات السابقة TTC (دج)','Cumul antérieur TTC (DA)')}</label>
    <input class="form-input" type="number" id="sitPrev" value="0" min="0"></div>
  <div class="form-group"><label class="form-label">${_L('التسبيق المخصوم (دج)','Acompte à déduire (DA)')}</label>
    <input class="form-input" type="number" id="sitAco" value="0" min="0"></div>
  <div class="form-group"><label class="form-label">${_L('مرجع كشف المرفقات','Réf. attachement')}</label>
    <input class="form-input" id="sitAtt"></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📊 ${_L('البنود التراكمية','Lignes cumulées')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('sitItems',['desc','unit','qtyCumul','price'])">+ ${_L('بند','Ligne')}</button>
  </div>
  <div id="sitItems" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('sitItems', ['desc','unit','qtyCumul','price']), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const items = this._readRows('sitItems', ['desc','unit','qtyCumul','price']).map(r => ({...r, cumulAmount: Number(r.qtyCumul||0)*Number(r.price||0)}));
        if (items.length === 0) { _toast(_L('أضف بنداً','Au moins une ligne'),'error'); return; }
        const projId = this._val('sitProj');
        const proj = projId ? this._projectsList().find(p => String(p.id)===String(projId)) : null;
        DZDocs.situationTravaux({
          sitNum: this._val('sitNum'),
          marketRef: this._val('sitMarket'),
          projectName: proj?.name || '',
          maitreOuvrage: this._val('sitMO'),
          from: this._val('sitFrom'),
          to: this._val('sitTo'),
          previousCumul: this._num('sitPrev'),
          acompteDeducted: this._num('sitAco'),
          attRef: this._val('sitAtt'),
          items
        });
      });
    },

    def_invoice() {
      this._setTitle('🏁 ' + _L('فاتورة نهائية','Facture Définitive'));
      const projs = this._projectsList();
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group"><label class="form-label">${_L('العميل / صاحب المشروع','Client / MO')} *</label>
    <input class="form-input" id="defClient"></div>
  <div class="form-group"><label class="form-label">NIF ${_L('العميل','Client')}</label>
    <input class="form-input" id="defNif"></div>
  <div class="form-group"><label class="form-label">🏗️ ${_L('المشروع','Projet')}</label>
    <select class="form-select" id="defProj"><option value="">—</option>
      ${projs.map(p => `<option value="${p.id}" data-name="${_esc(p.name)}" data-budget="${p.budget||0}">${_esc(p.name)}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('مرجع الصفقة','Réf. marché')}</label>
    <input class="form-input" id="defMarket"></div>
  <div class="form-group"><label class="form-label">${_L('مرجع محضر الاستلام','Réf. PV réception')}</label>
    <input class="form-input" id="defPv"></div>
  <div class="form-group"><label class="form-label">${_L('قيمة العقد الكلية TTC (دج)','Montant total marché TTC')} *</label>
    <input class="form-input" type="number" id="defTotal" min="0"></div>
  <div class="form-group"><label class="form-label">${_L('مجموع التسبيقات (دج)','Total acomptes (DA)')}</label>
    <input class="form-input" type="number" id="defAcoSum" value="0" min="0"></div>
  <div class="form-group"><label class="form-label">${_L('مجموع الوضعيات السابقة (دج)','Total situations payées (DA)')}</label>
    <input class="form-input" type="number" id="defSitSum" value="0" min="0"></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('شروط الدفع','Conditions de paiement')}</label>
    <input class="form-input" id="defPay" value="${_L('تحويل بنكي خلال 30 يوم','Virement sous 30 jours')}"></div>
</div>`);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        if (!this._val('defClient')) { _toast(_L('أدخل العميل','Saisir le client'),'error'); return; }
        if (this._num('defTotal') <= 0) { _toast(_L('أدخل قيمة العقد','Saisir le montant'),'error'); return; }
        const projId = this._val('defProj');
        const proj = projId ? this._projectsList().find(p => String(p.id)===String(projId)) : null;
        DZDocs.factureDefinitive({
          clientName: this._val('defClient'),
          clientNif: this._val('defNif'),
          projectName: proj?.name || '',
          marketRef: this._val('defMarket'),
          pvRef: this._val('defPv'),
          totalContract: this._num('defTotal'),
          acompteSum: this._num('defAcoSum'),
          situationsSum: this._num('defSitSum'),
          payTerms: this._val('defPay'),
        });
      });
    },

    quittance() {
      this._setTitle('🧾 ' + _L('وصل تسديد','Quittance de Paiement'));
      const invs = this._invoicesList().filter(i => i.status === 'paid').slice(-10).reverse();
      this._setBody(`
${invs.length > 0 ? `
<div class="form-group">
  <label class="form-label">⚡ ${_L('استيراد من فاتورة مدفوعة','Importer depuis une facture payée')} (${_L('اختياري','optionnel')})</label>
  <select class="form-select" id="quitInv" onchange="DZDocsUI._fillQuitFromInv(this.value)">
    <option value="">— ${_L('بدون','Aucune')} —</option>
    ${invs.map(i => `<option value="${i.id}">${_esc(i.number)} - ${_esc(i.client)} - ${Number(i.amount).toLocaleString('fr-DZ')} DA</option>`).join('')}
  </select>
</div>` : ''}
<div class="form-grid-2">
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('المستلم منه','Reçu de')} *</label>
    <input class="form-input" id="quitPayer"></div>
  <div class="form-group"><label class="form-label">${_L('عنوانه','Adresse')}</label>
    <input class="form-input" id="quitPayerAddr"></div>
  <div class="form-group"><label class="form-label">NIF</label>
    <input class="form-input" id="quitPayerNif"></div>
  <div class="form-group"><label class="form-label">${_L('المبلغ TTC (دج)','Montant TTC (DA)')} *</label>
    <input class="form-input" type="number" id="quitAmount" min="0"></div>
  <div class="form-group"><label class="form-label">${_L('مرجع الفاتورة','Réf. facture')}</label>
    <input class="form-input" id="quitInvRef"></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('الموضوع','Objet')} *</label>
    <input class="form-input" id="quitSubject" placeholder="${_L('سداد فاتورة...','Règlement facture...')}"></div>
  <div class="form-group"><label class="form-label">${_L('طريقة الدفع','Mode paiement')}</label>
    <select class="form-select" id="quitMethod">
      <option>${_L('نقداً','Espèces')}</option>
      <option>${_L('شيك','Chèque')}</option>
      <option>${_L('تحويل بنكي','Virement')}</option>
      <option>${_L('حوالة بريدية','Mandat poste')}</option>
    </select></div>
  <div class="form-group"><label class="form-label">${_L('رقم الشيك / المرجع','N° chèque/réf.')}</label>
    <input class="form-input" id="quitRef"></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('المكان','Lieu')}</label>
    <input class="form-input" id="quitLocation"></div>
</div>`);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        if (!this._val('quitPayer')) { _toast(_L('أدخل المستلم منه','Saisir le payeur'),'error'); return; }
        if (this._num('quitAmount') <= 0) { _toast(_L('أدخل المبلغ','Saisir le montant'),'error'); return; }
        if (!this._val('quitSubject')) { _toast(_L('أدخل الموضوع','Saisir l\'objet'),'error'); return; }
        DZDocs.quittance({
          payerName: this._val('quitPayer'),
          payerAddress: this._val('quitPayerAddr'),
          payerNif: this._val('quitPayerNif'),
          amount: this._num('quitAmount'),
          invoiceRef: this._val('quitInvRef'),
          subject: this._val('quitSubject'),
          method: this._val('quitMethod'),
          checkNum: this._val('quitRef'),
          location: this._val('quitLocation'),
        });
      });
    },
    _fillQuitFromInv(invId) {
      if (!invId) return;
      const inv = this._invoicesList().find(i => String(i.id)===String(invId));
      if (!inv) return;
      const set = (id,v) => { const e=document.getElementById(id); if(e) e.value=v||''; };
      set('quitPayer', inv.client);
      set('quitAmount', inv.amount);
      set('quitInvRef', inv.number);
      set('quitSubject', _L(`سداد الفاتورة ${inv.number}`, `Règlement facture ${inv.number}`));
      set('quitMethod', _L(inv.payment_method==='cash'?'نقداً':inv.payment_method==='check'?'شيك':'تحويل بنكي', inv.payment_method==='cash'?'Espèces':inv.payment_method==='check'?'Chèque':'Virement'));
    },

    // ════════ ④ HR ════════
    paie() {
      this._setTitle('💼 ' + _L('كشف راتب','Bulletin de paie'));
      const workers = this._workersList();
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">👤 ${_L('العامل','Employé')} *</label>
    <select class="form-select" id="paieWorker" onchange="DZDocsUI._fillPaieFromWorker(this.value)">
      <option value="">— ${_L('اختر','Choisir')} —</option>
      ${workers.map(w => `<option value="${w.id}" data-base="${w.monthly_base||(w.daily_salary||0)*26}" data-daily="${w.daily_salary||0}" data-type="${w.contract_type||'monthly'}">${_esc(w.full_name)}${w.role?' — '+_esc(w.role):''}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('الشهر','Mois')}</label>
    <input class="form-input" id="paieMonth" value="${new Date().toLocaleString('fr-DZ',{month:'long',year:'numeric'})}"></div>
  <div class="form-group"><label class="form-label">${_L('أيام العمل','Jours travaillés')}</label>
    <input class="form-input" type="number" id="paieDays" value="26" min="0" max="31"></div>
  <div class="form-group"><label class="form-label">${_L('الراتب القاعدي (دج)','Salaire de base (DA)')} *</label>
    <input class="form-input" type="number" id="paieBase" min="0"></div>
  <div class="form-group"><label class="form-label">${_L('ساعات إضافية (دج)','Heures supp. (DA)')}</label>
    <input class="form-input" type="number" id="paieOT" value="0" min="0"></div>
  <div class="form-group"><label class="form-label">${_L('علاوات / منح (دج)','Primes (DA)')}</label>
    <input class="form-input" type="number" id="paieBonus" value="0" min="0"></div>
  <div class="form-group"><label class="form-label">${_L('علاوة نقل (دج)','Indemnité transport (DA)')}</label>
    <input class="form-input" type="number" id="paieTransp" value="0" min="0"></div>
  <div class="form-group"><label class="form-label">${_L('اقتطاعات أخرى (دج)','Autres retenues (DA)')}</label>
    <input class="form-input" type="number" id="paieOther" value="0" min="0"></div>
</div>`);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const wid = this._val('paieWorker');
        const worker = wid ? this._workersList().find(w => String(w.id)===String(wid)) : null;
        if (!worker) { _toast(_L('اختر عاملاً','Choisir employé'),'error'); return; }
        if (this._num('paieBase') <= 0) { _toast(_L('أدخل الراتب القاعدي','Saisir salaire base'),'error'); return; }
        DZDocs.fichePaie({
          worker,
          month: this._val('paieMonth'),
          daysWorked: this._num('paieDays', 26),
          baseSalary: this._num('paieBase'),
          overtime: this._num('paieOT'),
          bonuses: this._num('paieBonus'),
          transport: this._num('paieTransp'),
          otherDeductions: this._num('paieOther'),
        });
      });
    },
    _fillPaieFromWorker(wid) {
      if (!wid) return;
      const opt = document.getElementById('paieWorker')?.selectedOptions?.[0];
      if (!opt) return;
      const base = document.getElementById('paieBase');
      if (base) base.value = opt.dataset.base || '';
    },

    cdd() { this._contract('cdd'); },
    cta() { this._contract('cta'); },
    cdi() { this._contract('cdi'); },
    _contract(kind) {
      const labels = { cdd: 'CDD - عقد محدد المدة', cta: 'CTA - عقد مدعم', cdi: 'CDI - عقد دائم' };
      this._setTitle('📝 ' + (_L({cdd:'عقد محدد المدة',cta:'عقد مدعم',cdi:'عقد دائم'}[kind], labels[kind])));
      const workers = this._workersList();
      const projs = this._projectsList();
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">👤 ${_L('العامل','Employé')} *</label>
    <select class="form-select" id="ctWorker" onchange="DZDocsUI._fillCtFromWorker(this.value)">
      <option value="">— ${_L('اختر','Choisir')} —</option>
      ${workers.map(w => `<option value="${w.id}">${_esc(w.full_name)}${w.role?' - '+_esc(w.role):''}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('عنوان العامل','Adresse employé')}</label>
    <input class="form-input" id="ctWorkerAddr"></div>
  <div class="form-group"><label class="form-label">${_L('ممثل صاحب العمل','Représentant employeur')}</label>
    <input class="form-input" id="ctEmpRep" value="${_L('المدير','Le gérant')}"></div>
  <div class="form-group"><label class="form-label">${_L('تاريخ بدء العقد','Date début')}</label>
    <input class="form-input" type="date" id="ctStart" value="${new Date().toISOString().split('T')[0]}"></div>
  ${kind !== 'cdi' ? `
  <div class="form-group"><label class="form-label">${_L('تاريخ نهاية العقد','Date fin')}</label>
    <input class="form-input" type="date" id="ctEnd"></div>
  <div class="form-group"><label class="form-label">${_L('المدة','Durée')}</label>
    <input class="form-input" id="ctDuration" value="${kind==='cta'?'12 mois':'6 mois'}"></div>
  ` : `
  <div class="form-group"><label class="form-label">${_L('فترة التجربة','Période d\'essai')}</label>
    <input class="form-input" id="ctTrial" value="3 ${_L('أشهر','mois')}"></div>
  `}
  <div class="form-group"><label class="form-label">${_L('مكان العمل','Lieu de travail')}</label>
    <input class="form-input" id="ctWorkplace"></div>
  ${kind === 'cdd' ? `
  <div class="form-group"><label class="form-label">🏗️ ${_L('المشروع','Projet')}</label>
    <select class="form-select" id="ctProj"><option value="">—</option>
      ${projs.map(p => `<option value="${p.id}">${_esc(p.name)}</option>`).join('')}
    </select></div>` : ''}
</div>`);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const wid = this._val('ctWorker');
        const worker = wid ? this._workersList().find(w => String(w.id)===String(wid)) : null;
        if (!worker) { _toast(_L('اختر عاملاً','Choisir employé'),'error'); return; }
        const projId = this._val('ctProj');
        const proj = projId ? this._projectsList().find(p => String(p.id)===String(projId)) : null;
        DZDocs.contract({
          kind, worker,
          workerAddress: this._val('ctWorkerAddr'),
          employerRep: this._val('ctEmpRep'),
          startDate: this._val('ctStart'),
          endDate: this._val('ctEnd'),
          duration: this._val('ctDuration'),
          trialPeriod: this._val('ctTrial'),
          workplace: this._val('ctWorkplace'),
          projectName: proj?.name || '',
        });
      });
    },
    _fillCtFromWorker() {/* placeholder for future enhancements */},

    pointage() {
      this._setTitle('⏱️ ' + _L('بطاقة حضور','Fiche de Pointage'));
      const workers = this._workersList();
      const projs = this._projectsList();
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group"><label class="form-label">👤 ${_L('العامل','Employé')} *</label>
    <select class="form-select" id="ptWorker" onchange="DZDocsUI._fillPtFromWorker(this.value)">
      <option value="">—</option>
      ${workers.map(w => `<option value="${w.id}" data-name="${_esc(w.full_name)}" data-role="${_esc(w.role||'')}">${_esc(w.full_name)}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">🏗️ ${_L('الورشة','Chantier')}</label>
    <select class="form-select" id="ptProj">
      <option value="">—</option>
      ${projs.map(p => `<option value="${p.id}" data-name="${_esc(p.name)}">${_esc(p.name)}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('من تاريخ','Du')}</label>
    <input class="form-input" type="date" id="ptFrom"></div>
  <div class="form-group"><label class="form-label">${_L('إلى تاريخ','Au')}</label>
    <input class="form-input" type="date" id="ptTo" value="${new Date().toISOString().split('T')[0]}"></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">⏱️ ${_L('الأيام المسجلة','Jours pointés')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('ptDays',['date','checkIn','checkOut','hours','overtime','notes'])">+ ${_L('يوم','Jour')}</button>
  </div>
  <div id="ptDays" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('ptDays', ['date','checkIn','checkOut','hours','overtime','notes'], { date: new Date().toISOString().split('T')[0], checkIn:'08:00', checkOut:'17:00', hours: 8, overtime: 0 }), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const wOpt = document.getElementById('ptWorker')?.selectedOptions?.[0];
        const pOpt = document.getElementById('ptProj')?.selectedOptions?.[0];
        if (!wOpt || !wOpt.value) { _toast(_L('اختر عاملاً','Choisir employé'),'error'); return; }
        DZDocs.fichePointage({
          workerName: wOpt.dataset.name,
          workerRole: wOpt.dataset.role,
          projectName: pOpt?.dataset?.name || '',
          from: this._val('ptFrom'),
          to: this._val('ptTo'),
          days: this._readRows('ptDays', ['date','checkIn','checkOut','hours','overtime','notes'])
        });
      });
    },
    _fillPtFromWorker() {/* future use */},

    attestation() {
      this._setTitle('📄 ' + _L('شهادة عمل','Attestation de Travail'));
      const workers = this._workersList();
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">👤 ${_L('العامل','Employé')} *</label>
    <select class="form-select" id="atWorker">
      <option value="">— ${_L('اختر','Choisir')} —</option>
      ${workers.map(w => `<option value="${w.id}">${_esc(w.full_name)}${w.role?' - '+_esc(w.role):''}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('تاريخ بدء العمل','Date début')}</label>
    <input class="form-input" type="date" id="atStart"></div>
  <div class="form-group"><label class="form-label">${_L('تاريخ نهاية العمل (إن وجدت)','Date fin (optionnel)')}</label>
    <input class="form-input" type="date" id="atEnd"></div>
  <div class="form-group"><label class="form-label">${_L('اسم الموقع','Signataire')}</label>
    <input class="form-input" id="atSigner"></div>
  <div class="form-group"><label class="form-label">${_L('وظيفته','Fonction signataire')}</label>
    <input class="form-input" id="atSignerRole" value="${_L('المدير','Le gérant')}"></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('ملاحظات إضافية','Observations supplémentaires')}</label>
    <textarea class="form-input" id="atObs" rows="3" placeholder="${_L('اتركه فارغاً للنص الافتراضي','Vide = texte par défaut')}"></textarea></div>
</div>`);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const wid = this._val('atWorker');
        const worker = wid ? this._workersList().find(w => String(w.id)===String(wid)) : null;
        if (!worker) { _toast(_L('اختر عاملاً','Choisir employé'),'error'); return; }
        DZDocs.attestationTravail({
          worker,
          startDate: this._val('atStart'),
          endDate: this._val('atEnd'),
          signerName: this._val('atSigner'),
          signerRole: this._val('atSignerRole'),
          observations: this._val('atObs'),
        });
      });
    },

    // ════════ ⑤ Logistics ════════
    commande() {
      this._setTitle('🛒 ' + _L('وصل طلب','Bon de Commande'));
      const projs = this._projectsList();
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group"><label class="form-label">🏪 ${_L('اسم المورد','Fournisseur')} *</label>
    <input class="form-input" id="bcSupplier"></div>
  <div class="form-group"><label class="form-label">${_L('هاتف المورد','Tél fournisseur')}</label>
    <input class="form-input" id="bcSupplierPhone"></div>
  <div class="form-group"><label class="form-label">NIF ${_L('المورد','fournisseur')}</label>
    <input class="form-input" id="bcSupplierNif"></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('عنوان المورد','Adresse')}</label>
    <input class="form-input" id="bcSupplierAddr"></div>
  <div class="form-group"><label class="form-label">${_L('عنوان التسليم','Lieu livraison')}</label>
    <input class="form-input" id="bcDeliveryAddr"></div>
  <div class="form-group"><label class="form-label">${_L('تاريخ التسليم المطلوب','Date livraison souhaitée')}</label>
    <input class="form-input" type="date" id="bcDeliveryDate"></div>
  <div class="form-group"><label class="form-label">🏗️ ${_L('الورشة','Chantier')}</label>
    <select class="form-select" id="bcProj"><option value="">—</option>
      ${projs.map(p => `<option value="${p.id}" data-name="${_esc(p.name)}">${_esc(p.name)}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('شروط الدفع','Modalités paiement')}</label>
    <input class="form-input" id="bcPay" value="${_L('عند التسليم','À la livraison')}"></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📦 ${_L('المواد المطلوبة','Articles')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('bcItems',['desc','unit','qty','price'])">+ ${_L('إضافة','Ajouter')}</button>
  </div>
  <div id="bcItems" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('bcItems', ['desc','unit','qty','price']), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const items = this._readRows('bcItems', ['desc','unit','qty','price']).map(r => ({...r, total: Number(r.qty||0)*Number(r.price||0)}));
        if (!this._val('bcSupplier')) { _toast(_L('أدخل اسم المورد','Saisir fournisseur'),'error'); return; }
        if (items.length === 0) { _toast(_L('أضف مادة','Ajouter article'),'error'); return; }
        const projOpt = document.getElementById('bcProj')?.selectedOptions?.[0];
        DZDocs.bonCommande({
          supplierName: this._val('bcSupplier'),
          supplierPhone: this._val('bcSupplierPhone'),
          supplierNif: this._val('bcSupplierNif'),
          supplierAddress: this._val('bcSupplierAddr'),
          deliveryAddress: this._val('bcDeliveryAddr'),
          deliveryDate: this._val('bcDeliveryDate'),
          projectName: projOpt?.dataset?.name || '',
          payTerms: this._val('bcPay'),
          items
        });
      });
    },

    reception() {
      this._setTitle('📥 ' + _L('وصل استلام','Bon de Réception'));
      const projs = this._projectsList();
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group"><label class="form-label">🏪 ${_L('اسم المورد','Fournisseur')} *</label>
    <input class="form-input" id="brSupplier"></div>
  <div class="form-group"><label class="form-label">${_L('هاتف المورد','Tél fournisseur')}</label>
    <input class="form-input" id="brSupplierPhone"></div>
  <div class="form-group"><label class="form-label">${_L('مرجع وصل الطلب','Réf. BC')}</label>
    <input class="form-input" id="brBcRef"></div>
  <div class="form-group"><label class="form-label">${_L('مرجع وصل التسليم','Réf. BL')}</label>
    <input class="form-input" id="brBlRef"></div>
  <div class="form-group"><label class="form-label">${_L('مكان الاستلام','Lieu réception')}</label>
    <input class="form-input" id="brLocation"></div>
  <div class="form-group"><label class="form-label">🏗️ ${_L('الورشة','Chantier')}</label>
    <select class="form-select" id="brProj"><option value="">—</option>
      ${projs.map(p => `<option value="${p.id}" data-name="${_esc(p.name)}">${_esc(p.name)}</option>`).join('')}
    </select></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('ملاحظات','Observations')}</label>
    <textarea class="form-input" id="brObs" rows="2"></textarea></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📦 ${_L('المواد المستلمة','Articles reçus')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('brItems',['desc','unit','qtyOrdered','qtyDelivered','qtyAccepted','status'])">+ ${_L('إضافة','Ajouter')}</button>
  </div>
  <div id="brItems" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('brItems', ['desc','unit','qtyOrdered','qtyDelivered','qtyAccepted','status']), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const items = this._readRows('brItems', ['desc','unit','qtyOrdered','qtyDelivered','qtyAccepted','status']);
        if (!this._val('brSupplier')) { _toast(_L('أدخل اسم المورد','Saisir fournisseur'),'error'); return; }
        if (items.length === 0) { _toast(_L('أضف مادة','Ajouter article'),'error'); return; }
        const projOpt = document.getElementById('brProj')?.selectedOptions?.[0];
        DZDocs.bonReception({
          supplierName: this._val('brSupplier'),
          supplierPhone: this._val('brSupplierPhone'),
          bcRef: this._val('brBcRef'),
          blRef: this._val('brBlRef'),
          location: this._val('brLocation'),
          projectName: projOpt?.dataset?.name || '',
          observations: this._val('brObs'),
          items
        });
      });
    },

    sortie() {
      this._setTitle('📤 ' + _L('وصل خروج','Bon de Sortie'));
      const projs = this._projectsList();
      const tid = (typeof Auth!=='undefined') ? Auth.getUser()?.tenant_id : null;
      const materials = (DB.get('materials')||[]).filter(m => m.tenant_id===tid);
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group"><label class="form-label">🏗️ ${_L('الورشة المستلمة','Chantier destinataire')} *</label>
    <select class="form-select" id="bsProj"><option value="">—</option>
      ${projs.map(p => `<option value="${p.id}" data-name="${_esc(p.name)}" data-loc="${_esc(p.location||'')}">${_esc(p.name)}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('الطالب','Demandeur')}</label>
    <input class="form-input" id="bsRequester"></div>
  <div class="form-group"><label class="form-label">${_L('وظيفة الطالب','Fonction')}</label>
    <input class="form-input" id="bsRequesterRole"></div>
  <div class="form-group"><label class="form-label">${_L('تاريخ الخروج','Date sortie')}</label>
    <input class="form-input" type="date" id="bsDate" value="${new Date().toISOString().split('T')[0]}"></div>
  <div class="form-group"><label class="form-label">${_L('الساعة','Heure')}</label>
    <input class="form-input" id="bsHour"></div>
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">${_L('ملاحظات','Observations')}</label>
    <textarea class="form-input" id="bsObs" rows="2"></textarea></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📤 ${_L('المواد الخارجة','Articles sortis')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('bsItems',['desc','unit','stockBefore','qtyOut','usage'])">+ ${_L('إضافة','Ajouter')}</button>
  </div>
  <div id="bsItems" style="display:flex;flex-direction:column;gap:.4rem"></div>
  ${materials.length > 0 ? `<div style="font-size:.7rem;color:var(--dim);margin-top:.4rem">💡 ${_L('متاح في المخزون:','Stock disponible:')} ${materials.length} ${_L('مادة','article(s)')}</div>` : ''}
</div>`);
      setTimeout(() => this._addRow('bsItems', ['desc','unit','stockBefore','qtyOut','usage']), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const items = this._readRows('bsItems', ['desc','unit','stockBefore','qtyOut','usage']);
        const projOpt = document.getElementById('bsProj')?.selectedOptions?.[0];
        if (!projOpt?.value) { _toast(_L('اختر الورشة','Choisir chantier'),'error'); return; }
        if (items.length === 0) { _toast(_L('أضف مادة','Ajouter article'),'error'); return; }
        DZDocs.bonSortie({
          projectName: projOpt.dataset.name,
          location: projOpt.dataset.loc,
          requestedBy: this._val('bsRequester'),
          requesterRole: this._val('bsRequesterRole'),
          date: this._val('bsDate'),
          hour: this._val('bsHour'),
          observations: this._val('bsObs'),
          items
        });
      });
    },

    suivi() {
      this._setTitle('🚜 ' + _L('بطاقة تتبع عتاد','Fiche Suivi Équipement'));
      const tid = (typeof Auth!=='undefined') ? Auth.getUser()?.tenant_id : null;
      const equips = (DB.get('equipment')||[]).filter(e => e.tenant_id===tid);
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group" style="grid-column:1/-1"><label class="form-label">🚜 ${_L('العتاد','Équipement')} *</label>
    <select class="form-select" id="seEquip">
      <option value="">— ${_L('اختر','Choisir')} —</option>
      ${equips.map(e => `<option value="${e.id}" data-name="${_esc(e.name||'')}" data-type="${_esc(e.type||'')}" data-serial="${_esc(e.serial||'')}" data-plate="${_esc(e.plate||'')}">${_esc(e.name)}${e.type?' - '+_esc(e.type):''}</option>`).join('')}
    </select></div>
  <div class="form-group"><label class="form-label">${_L('السائق / المشغّل','Conducteur')}</label>
    <input class="form-input" id="seOperator"></div>
  <div class="form-group"><label class="form-label">${_L('من تاريخ','Du')}</label>
    <input class="form-input" type="date" id="seFrom"></div>
  <div class="form-group"><label class="form-label">${_L('إلى تاريخ','Au')}</label>
    <input class="form-input" type="date" id="seTo" value="${new Date().toISOString().split('T')[0]}"></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">⛽ ${_L('سجل الاستعمال','Utilisation')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('seUsages',['date','project','hourStart','hourEnd','hours','fuel','notes'])">+ ${_L('سجل','Entrée')}</button>
  </div>
  <div id="seUsages" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">🔧 ${_L('سجل الصيانة','Maintenance')} (${_L('اختياري','optionnel')})</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('seMaint',['date','type','notes','cost','nextDate'])">+ ${_L('صيانة','Entretien')}</button>
  </div>
  <div id="seMaint" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('seUsages', ['date','project','hourStart','hourEnd','hours','fuel','notes']), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const opt = document.getElementById('seEquip')?.selectedOptions?.[0];
        if (!opt?.value) { _toast(_L('اختر العتاد','Choisir équipement'),'error'); return; }
        const equipment = {
          name: opt.dataset.name, type: opt.dataset.type,
          serial: opt.dataset.serial, plate: opt.dataset.plate,
        };
        DZDocs.ficheSuiviEquip({
          equipment,
          operator: this._val('seOperator'),
          from: this._val('seFrom'),
          to: this._val('seTo'),
          usages: this._readRows('seUsages', ['date','project','hourStart','hourEnd','hours','fuel','notes']),
          maintenances: this._readRows('seMaint', ['date','type','notes','cost','nextDate']).map(m => ({...m, desc: m.notes})),
        });
      });
    },

  } // end _handlers
}; // end DZDocsUI

console.log('✅ DZDocsUI — واجهة الوثائق الإدارية محمّلة (22 وثيقة)');

// ════════════════════════════════════════════════════════════════════
//  🎨 CSS موحد لأزرار dropdown داخل الصفحات
// ════════════════════════════════════════════════════════════════════
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.id = 'dz-dd-styles';
  style.textContent = `
    .dz-dd-item {
      display: block; width: 100%; text-align: ${typeof I18N!=='undefined' && I18N.currentLang==='fr'?'left':'right'};
      padding: .55rem .8rem; font-size: .82rem;
      background: transparent; border: none; color: var(--text, #fff);
      cursor: pointer; border-radius: 6px;
      font-family: inherit; font-weight: 500;
      transition: background .15s ease;
      white-space: nowrap;
    }
    .dz-dd-item:hover {
      background: rgba(232,184,75,.1); color: var(--gold, #E8B84B);
    }
    .dz-dd-menu { animation: dzFadeIn .15s ease; }
    @keyframes dzFadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
  `;
  document.head.appendChild(style);

  // إغلاق الـ dropdowns عند النقر خارجها
  document.addEventListener('click', (e) => {
    if (e.target.closest('.dz-dd')) return;
    document.querySelectorAll('.dz-dd-menu').forEach(m => m.style.display = 'none');
  });
}

// ════════════════════════════════════════════════════════════════════
//  🔧 دوال التكامل مع الصفحات الأخرى — Toggle DropDowns
// ════════════════════════════════════════════════════════════════════
window.toggleWorkerDocs = function(wid, ev) {
  ev?.stopPropagation();
  const menu = document.getElementById('wDocs' + wid);
  if (!menu) return;
  // إغلاق كل القوائم الأخرى
  document.querySelectorAll('.dz-dd-menu').forEach(m => { if (m !== menu) m.style.display = 'none'; });
  menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'block' : 'none';
};

window.toggleProjDocs = function(ev) {
  ev?.stopPropagation();
  const menu = document.getElementById('projDocsMenu');
  if (!menu) return;
  document.querySelectorAll('.dz-dd-menu').forEach(m => { if (m !== menu) m.style.display = 'none'; });
  menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'block' : 'none';
};

window.toggleFinDocs = function(ev) {
  ev?.stopPropagation();
  const menu = document.getElementById('finDocsMenu');
  if (!menu) return;
  document.querySelectorAll('.dz-dd-menu').forEach(m => { if (m !== menu) m.style.display = 'none'; });
  menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'block' : 'none';
};

// ════════════════════════════════════════════════════════════════════
//  🔗 helpers لفتح وثيقة مع بيانات pre-filled
// ════════════════════════════════════════════════════════════════════

// فتح وثيقة لعامل محدد — pre-fill بيانات العامل
window.DZDocsUI.openForWorker = function(key, wid, extras) {
  // إغلاق كل القوائم
  document.querySelectorAll('.dz-dd-menu').forEach(m => m.style.display = 'none');
  if (typeof Auth === 'undefined') return;
  const tid = Auth.getUser()?.tenant_id;
  const worker = (DB.get('workers')||[]).find(w => w.id === wid && w.tenant_id === tid);
  if (!worker) { _toast(_L('العامل غير موجود','Employé introuvable'),'error'); return; }

  this.open(key);

  // إعطاء وقت للـ DOM لتركيب الـ modal
  setTimeout(() => {
    if (key === 'cdd' || key === 'cta' || key === 'cdi') {
      const sel = document.getElementById('ctWorker');
      if (sel) { sel.value = String(worker.id); sel.dispatchEvent(new Event('change')); }
      if (worker.hire_date) {
        const start = document.getElementById('ctStart');
        if (start) start.value = worker.hire_date;
      }
    }
    else if (key === 'attestation') {
      const sel = document.getElementById('atWorker');
      if (sel) { sel.value = String(worker.id); sel.dispatchEvent(new Event('change')); }
      if (worker.hire_date) {
        const start = document.getElementById('atStart');
        if (start) start.value = worker.hire_date;
      }
    }
    else if (key === 'paie') {
      const sel = document.getElementById('paieWorker');
      if (sel) {
        sel.value = String(worker.id);
        sel.dispatchEvent(new Event('change'));
      }
      // إذا أتى extras من Pages.salary مع راتب محسوب
      if (extras) {
        if (extras.baseSalary) {
          const baseInp = document.getElementById('paieBase');
          if (baseInp) baseInp.value = extras.baseSalary;
        }
        if (extras.daysWorked) {
          const daysInp = document.getElementById('paieDays');
          if (daysInp) daysInp.value = extras.daysWorked;
        }
        if (extras.monthKey) {
          const [y, m] = extras.monthKey.split('-').map(Number);
          const monthInp = document.getElementById('paieMonth');
          if (monthInp) {
            const date = new Date(y, m-1, 1);
            monthInp.value = date.toLocaleString('fr-DZ', { month:'long', year:'numeric' });
          }
        }
      }
    }
  }, 80);
};

// فتح وثيقة لمشروع محدد — pre-fill بيانات المشروع
window.DZDocsUI.openForProject = function(key, pid) {
  document.querySelectorAll('.dz-dd-menu').forEach(m => m.style.display = 'none');
  if (typeof Auth === 'undefined') return;
  const tid = Auth.getUser()?.tenant_id;
  const proj = (DB.get('projects')||[]).find(p => p.id === pid && p.tenant_id === tid);
  if (!proj) { _toast(_L('المشروع غير موجود','Projet introuvable'),'error'); return; }

  this.open(key);

  setTimeout(() => {
    const setVal = (id, val) => { const e = document.getElementById(id); if(e) e.value = val||''; };
    // مفاتيح حقول المشروع لكل وثيقة
    const projSelectorMap = {
      'pv_ouverture':  'pvoProj',
      'attachement':   'attProj',
      'journal':       'jcProj',
      'pv_reception_pro': 'pvrProj',
      'pv_reception_def': 'pvrProj',
      'acompte':       'acoProj',
      'situation':     'sitProj',
      'def_invoice':   'defProj',
    };
    const fieldId = projSelectorMap[key];
    if (fieldId) {
      const sel = document.getElementById(fieldId);
      if (sel) { sel.value = String(proj.id); sel.dispatchEvent(new Event('change')); }
    }

    // pre-fill بيانات إضافية
    if (key === 'acompte') {
      if (proj.client_name) setVal('acoClient', proj.client_name);
      if (proj.budget) setVal('acoTotal', proj.budget);
    }
    if (key === 'def_invoice') {
      if (proj.client_name) setVal('defClient', proj.client_name);
      if (proj.budget) setVal('defTotal', proj.budget);
    }
    if (key === 'situation') {
      if (proj.client_name) setVal('sitMO', proj.client_name);
    }
    if (key === 'pv_ouverture') {
      if (proj.client_name) setVal('pvoMO', proj.client_name);
      if (proj.start_date)  setVal('pvoStart', proj.start_date);
    }
    if (key === 'pv_reception_pro' || key === 'pv_reception_def') {
      if (proj.client_name) setVal('pvrMO', proj.client_name);
    }
  }, 80);
};

// فتح وصل تسديد من فاتورة محددة
window.DZDocsUI.openForInvoice = function(key, invId) {
  if (typeof Auth === 'undefined') return;
  const tid = Auth.getUser()?.tenant_id;
  const inv = (DB.get('invoices')||[]).find(i => i.id === invId && i.tenant_id === tid);
  if (!inv) { _toast(_L('الفاتورة غير موجودة','Facture introuvable'),'error'); return; }

  this.open(key);
  setTimeout(() => {
    if (key === 'quittance') {
      const sel = document.getElementById('quitInv');
      if (sel) { sel.value = String(inv.id); }
      // pre-fill يدوياً
      const set = (id, v) => { const e = document.getElementById(id); if(e) e.value = v||''; };
      set('quitPayer', inv.client);
      set('quitAmount', inv.amount);
      set('quitInvRef', inv.number);
      set('quitSubject', _L(`سداد الفاتورة ${inv.number}`, `Règlement facture ${inv.number}`));
    }
  }, 80);
};

// فتح بطاقة تتبع لمعدة محددة
window.DZDocsUI.openForEquipment = function(key, eid) {
  if (typeof Auth === 'undefined') return;
  const tid = Auth.getUser()?.tenant_id;
  const equip = (DB.get('equipment')||[]).find(e => e.id === eid && e.tenant_id === tid);
  if (!equip) { _toast(_L('المعدة غير موجودة','Équipement introuvable'),'error'); return; }

  this.open(key);
  setTimeout(() => {
    if (key === 'suivi') {
      const sel = document.getElementById('seEquip');
      if (sel) { sel.value = String(equip.id); }
    }
  }, 80);
};

// فتح بطاقة حضور لعامل وفترة محددة
window.DZDocsUI.openAttendanceCard = function() {
  this.open('pointage');
};

})();
