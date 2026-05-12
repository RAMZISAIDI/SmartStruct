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
  // محاولة استخدام L العالمية أولاً (الأكثر أماناً)
  try { if (typeof L === 'function') return L(ar, fr); } catch(_) {}
  // فحص آمن لـ I18N (قد يكون const مع TDZ في بعض البيئات)
  try {
    if (typeof I18N !== 'undefined' && I18N && I18N.currentLang === 'fr') return fr;
  } catch(_) {}
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

  // فحص اللغة بأمان (تجنب TDZ مع const I18N)
  let _isFr = false;
  try { _isFr = (typeof I18N !== 'undefined' && I18N && I18N.currentLang === 'fr'); } catch(_) {}
  const _alignSide = _isFr ? 'left' : 'right';

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
  .dzd-section-count{margin-${_alignSide}:auto;font-size:.7rem;padding:4px 10px;border-radius:20px;background:rgba(232,184,75,.1);color:var(--gold);font-weight:700}
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

  // ── إنشاء المودال في الـ DOM إذا لم يكن موجوداً (لأنه يُعرض فقط داخل صفحة dz_documents) ──
  _ensureModal() {
    if (document.getElementById('dzdModal')) return;
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.id = 'dzdModal';
    div.innerHTML = `
      <div class="modal" style="max-width:800px">
        <div class="modal-title" id="dzdModalTitle">📄 ${_L('توليد وثيقة','Générer document')}</div>
        <div id="dzdModalBody" style="max-height:65vh;overflow-y:auto;padding:.4rem"></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="DZDocsUI.close()">${_L('إلغاء','Annuler')}</button>
          <button class="btn btn-gold" id="dzdGenerateBtn">📄 ${_L('توليد وطباعة PDF','Générer & Imprimer PDF')}</button>
        </div>
      </div>`;
    document.body.appendChild(div);
    // إغلاق عند النقر على الخلفية
    div.addEventListener('click', e => { if (e.target === div) this.close(); });
  },

  open(key) {
    const handler = this._handlers[key];
    if (!handler) { _toast(_L('وثيقة غير معروفة','Document inconnu'),'error'); return; }
    // ── التحقق من صلاحية توليد الوثائق ──
    if (typeof canDo === 'function' && !canDo('write_documents')) {
      _toast(_L('ليس لديك صلاحية لتوليد الوثائق','Permission refusée : génération de documents'), 'error');
      return;
    }
    this._ensureModal();
    this._currentKey = key;
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
      try {
        fn();
        this._saveToHistory();
        this.close();
      }
      catch(e) { console.error('[DZDocs]',e); _toast(e.message||'Erreur','error'); }
    });
  },

  // ── حفظ بيانات الوثيقة في سجل التاريخ ──
  _saveToHistory() {
    try {
      if (typeof Auth === 'undefined' || typeof DB === 'undefined') return;
      const tid = Auth.getUser()?.tenant_id;
      if (!tid) return;

      const body = document.getElementById('dzdModalBody');
      const titleEl = document.getElementById('dzdModalTitle');
      const fields = {};
      if (body) {
        body.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
          if (el.id && el.value) fields[el.id] = el.value;
        });
      }
      const docs = DB.get('dz_generated_docs') || [];
      const record = {
        id: docs.length > 0 ? Math.max(...docs.map(d=>d.id||0)) + 1 : 1,
        tenant_id: tid,
        doc_type: this._currentKey || '',
        doc_title: titleEl ? titleEl.innerText.replace(/[\n\r]/g,'').trim() : '',
        fields,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      };
      docs.unshift(record);
      if (docs.length > 300) docs.splice(300);
      DB.set('dz_generated_docs', docs);
    } catch(e) { console.warn('[DZDocs] saveToHistory error:', e); }
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
  _equipmentList() {
    if (typeof Auth==='undefined') return [];
    const tid = Auth.getUser()?.tenant_id;
    return (DB.get('equipment')||[]).filter(e => e.tenant_id===tid);
  },
  _tenantName() {
    try { return Auth.getTenant()?.name || ''; } catch(_) { return ''; }
  },
  _tenantWilaya() {
    try { return Auth.getTenant()?.wilaya || ''; } catch(_) { return ''; }
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

    // ══════════════════════════════════════════════
    // ① PRE-CONTRACT — الوثائق التجارية
    // ══════════════════════════════════════════════

    proforma() {
      const projs = this._projectsList();
      const defProj = projs.length === 1 ? projs[0] : null;
      this._setTitle('📋 ' + _L('فاتورة شكلية', 'Facture Proforma'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group">
    <label class="form-label">${_L('اسم العميل','Nom client')} *</label>
    <input class="form-input" id="proClient" value="${_esc(defProj?.client_name||'')}" placeholder="SARL / اسم العميل...">
  </div>
  <div class="form-group">
    <label class="form-label">NIF ${_L('العميل','client')}</label>
    <input class="form-input" id="proClientNif">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('عنوان العميل','Adresse client')}</label>
    <input class="form-input" id="proClientAddr">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('الموضوع / المشروع','Objet / Projet')}</label>
    <input class="form-input" id="proSubject" value="${_esc(defProj ? 'Travaux — ' + defProj.name : _L('أشغال البناء','Travaux de construction'))}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مدة الصلاحية','Validité')}</label>
    <input class="form-input" id="proValid" value="${_L('30 يوم','30 jours')}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('شروط الدفع','Modalités')}</label>
    <input class="form-input" id="proPay" value="${_L('50% مسبق، 50% عند التسليم','50% acompte + 50% livraison')}">
  </div>
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
        const items = this._readRows('proItems', ['desc','unit','qty','price'])
          .map(r => ({...r, total: Number(r.qty||0)*Number(r.price||0)}))
          .filter(r => r.desc);
        if (!this._val('proClient')) { _toast(_L('أدخل اسم العميل','Saisir le client'),'error'); return; }
        if (!items.length) { _toast(_L('أضف بنداً واحداً على الأقل','Au moins une ligne'),'error'); return; }
        DZDocs.factureProforma({ clientName:this._val('proClient'), clientNif:this._val('proClientNif'), clientAddress:this._val('proClientAddr'), subject:this._val('proSubject'), validity:this._val('proValid'), payTerms:this._val('proPay'), items });
      });
    },

    devis() {
      const projs = this._projectsList();
      const defProj = projs.length === 1 ? projs[0] : null;
      this._setTitle('📊 ' + _L('كشف كمي وتقديري','Devis Estimatif'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group">
    <label class="form-label">🏗️ ${_L('المشروع','Projet')}</label>
    <select class="form-select" id="devProj">
      <option value="">— ${_L('بدون','Aucun')} —</option>
      ${projs.map(p => `<option value="${p.id}" data-name="${_esc(p.name)}" data-mo="${_esc(p.client_name||'')}" ${defProj?.id===p.id?'selected':''}>${_esc(p.name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('صاحب المشروع','Maître d\'ouvrage')}</label>
    <input class="form-input" id="devMO" value="${_esc(defProj?.client_name||'')}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مدة التنفيذ','Délai')}</label>
    <input class="form-input" id="devDelay" value="${_L('6 أشهر','6 mois')}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('تاريخ الكشف','Date devis')}</label>
    <input class="form-input" type="date" id="devDate" value="${new Date().toISOString().split('T')[0]}">
  </div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📊 ${_L('اللوطات والبنود','Lots & lignes')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addLot()">+ ${_L('إضافة لوط','Ajouter LOT')}</button>
  </div>
  <div id="devLots" style="display:flex;flex-direction:column;gap:.7rem"></div>
</div>`);
      // auto-fill MO when project changes
      setTimeout(() => {
        document.getElementById('devProj')?.addEventListener('change', e => {
          const opt = e.target.selectedOptions[0];
          const mo = document.getElementById('devMO');
          if (mo && opt?.dataset?.mo) mo.value = opt.dataset.mo;
        });
        this._addLot();
      }, 30);
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
          }).filter(i => i.desc);
          return { name, items };
        }).filter(l => l.items.length > 0);
        if (!lots.length) { _toast(_L('أضف لوطاً واحداً','Ajouter au moins un lot'),'error'); return; }
        const projId = this._val('devProj');
        const proj = projId ? this._projectsList().find(p => String(p.id)===String(projId)) : null;
        DZDocs.devisEstimatif({ project: proj||{name:this._val('devProjName')}, maitreOuvrage:this._val('devMO'), delay:this._val('devDelay'), lots });
      });
    },

    bpu() {
      const projs = this._projectsList();
      const defProj = projs.length === 1 ? projs[0] : null;
      this._setTitle('💰 ' + _L('جدول الأسعار الوحدوية','BPU'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group">
    <label class="form-label">${_L('مرجع الصفقة','Réf. marché')}</label>
    <input class="form-input" id="bpuMarket">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('صاحب المشروع','Maître d\'ouvrage')}</label>
    <input class="form-input" id="bpuMO" value="${_esc(defProj?.client_name||'')}">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('الموضوع','Objet')}</label>
    <input class="form-input" id="bpuSubject" value="${_esc(defProj ? 'Travaux — '+defProj.name : _L('أشغال البناء العامة','Travaux BTP'))}">
  </div>
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
        const items = this._readRows('bpuItems', ['code','desc','unit','price']).filter(i => i.desc);
        if (!items.length) { _toast(_L('أضف بنداً','Au moins une ligne'),'error'); return; }
        DZDocs.bpu({ marketRef:this._val('bpuMarket'), maitreOuvrage:this._val('bpuMO'), subject:this._val('bpuSubject'), items });
      });
    },

    offre() {
      const workers = this._workersList();
      const equips  = this._equipmentList();
      this._setTitle('🏢 ' + _L('عرض الخدمة','Offre de Service'));
      // تجميع الموارد البشرية من العمال المسجلين
      const roleCount = {};
      workers.forEach(w => { const r=w.role||_L('عامل','Ouvrier'); roleCount[r]=(roleCount[r]||0)+1; });
      const teamRows  = Object.entries(roleCount).map(([role,count]) =>
        `<div data-row style="display:grid;grid-template-columns:2fr 1fr 2fr auto;gap:.4rem;align-items:center;background:rgba(255,255,255,.02);padding:.4rem;border-radius:8px;border:1px solid var(--border)">
          <input class="form-input" style="font-size:.78rem;padding:.4rem" data-field="role" value="${_esc(role)}" placeholder="${_L('المنصب','Fonction')}">
          <input class="form-input" style="font-size:.78rem;padding:.4rem" data-field="count" type="number" value="${count}" min="1">
          <input class="form-input" style="font-size:.78rem;padding:.4rem" data-field="qualification" placeholder="${_L('المؤهل','Qualification')}">
          <button type="button" onclick="this.closest('[data-row]').remove()" style="padding:.35rem .6rem;background:rgba(240,78,106,.1);border:1px solid rgba(240,78,106,.3);color:#F04E6A;border-radius:6px;cursor:pointer;font-size:.75rem">✕</button>
        </div>`).join('');
      const equipRows = equips.map(e =>
        `<div data-row style="display:grid;grid-template-columns:2fr 1fr 2fr auto;gap:.4rem;align-items:center;background:rgba(255,255,255,.02);padding:.4rem;border-radius:8px;border:1px solid var(--border)">
          <input class="form-input" style="font-size:.78rem;padding:.4rem" data-field="name" value="${_esc(e.name||'')}" placeholder="${_L('الاسم','Nom')}">
          <input class="form-input" style="font-size:.78rem;padding:.4rem" data-field="count" type="number" value="1" min="1">
          <input class="form-input" style="font-size:.78rem;padding:.4rem" data-field="specs" value="${_esc(e.type||e.model||'')}" placeholder="${_L('المواصفات','Spécif.')}">
          <button type="button" onclick="this.closest('[data-row]').remove()" style="padding:.35rem .6rem;background:rgba(240,78,106,.1);border:1px solid rgba(240,78,106,.3);color:#F04E6A;border-radius:6px;cursor:pointer;font-size:.75rem">✕</button>
        </div>`).join('');
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('المرسل إليه','Destinataire')} *</label>
    <input class="form-input" id="offRecipient" placeholder="${_L('اسم الجهة / المؤسسة المستفيدة','Organisme destinataire...')}">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('العنوان','Adresse')}</label>
    <input class="form-input" id="offRecipAddr">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('تقديم المؤسسة (اتركه فارغاً للنص الافتراضي)','Présentation (vide = défaut)')}</label>
    <textarea class="form-input" id="offPresent" rows="2"></textarea>
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('مجالات النشاط','Domaines d\'intervention')}</label>
    <textarea class="form-input" id="offDomains" rows="2" placeholder="${_L('مباني، طرق، أشغال عمومية...','Bâtiments TCE, TP, VRD...')}"></textarea>
  </div>
</div>
<div style="margin-top:.8rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
    <label class="form-label" style="margin:0">📚 ${_L('السوابق المهنية','Références')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('offRefs',['project','client','year','amount'])">+ ${_L('مرجع','Réf.')}</button>
  </div>
  <div id="offRefs" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>
<div style="margin-top:.8rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
    <label class="form-label" style="margin:0">👥 ${_L('الموارد البشرية','Moyens humains')} <small style="color:var(--dim)">(${_L('مُعبَّأ من العمال','Pré-rempli depuis ouvriers')})</small></label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('offTeam',['role','count','qualification'])">+ ${_L('فئة','Ajouter')}</button>
  </div>
  <div id="offTeam" style="display:flex;flex-direction:column;gap:.3rem">${teamRows}</div>
</div>
<div style="margin-top:.8rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
    <label class="form-label" style="margin:0">🚜 ${_L('العتاد والمعدات','Matériel')} <small style="color:var(--dim)">(${_L('مُعبَّأ من المعدات','Pré-rempli depuis équipements')})</small></label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('offEquip',['name','count','specs'])">+ ${_L('عتاد','Matériel')}</button>
  </div>
  <div id="offEquip" style="display:flex;flex-direction:column;gap:.3rem">${equipRows}</div>
</div>`);
      setTimeout(() => this._addRow('offRefs', ['project','client','year','amount']), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        if (!this._val('offRecipient')) { _toast(_L('أدخل المرسل إليه','Saisir le destinataire'),'error'); return; }
        DZDocs.offreService({
          recipient:this._val('offRecipient'), recipientAddress:this._val('offRecipAddr'),
          presentation:this._val('offPresent'), domains:this._val('offDomains'),
          references:this._readRows('offRefs',['project','client','year','amount']).filter(r=>r.project),
          team:this._readRows('offTeam',['role','count','qualification']),
          equipment:this._readRows('offEquip',['name','count','specs']),
        });
      });
    },

    // ══════════════════════════════════════════════
    // ② EXECUTION — وثائق الميدان
    // ══════════════════════════════════════════════

    pv_ouverture() {
      const projs = this._projectsList();
      const defProj = projs.length === 1 ? projs[0] : null;
      this._setTitle('🚀 ' + _L('محضر بدء الأشغال','PV d\'Ouverture'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group">
    <label class="form-label">🏗️ ${_L('المشروع','Projet')} *</label>
    <select class="form-select" id="pvoProj" onchange="DZDocsUI._handlers._onProjChange.call(DZDocsUI,this.value,['pvoMO','pvoStart'])">
      <option value="">— ${_L('اختر','Choisir')} —</option>
      ${projs.map(p=>`<option value="${p.id}" data-mo="${_esc(p.client_name||'')}" data-start="${_esc(p.start_date||'')}" ${defProj?.id===p.id?'selected':''}>${_esc(p.name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مرجع الصفقة','Réf. marché')}</label>
    <input class="form-input" id="pvoMarket">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('صاحب المشروع','Maître d\'ouvrage')} *</label>
    <input class="form-input" id="pvoMO" value="${_esc(defProj?.client_name||'')}" placeholder="${_L('اسم الجهة الداعية','Organisme MO')}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('ممثل صاحب المشروع','Représentant MO')}</label>
    <input class="form-input" id="pvoMOrep">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('ممثل المؤسسة','Représentant entreprise')}</label>
    <input class="form-input" id="pvoEntRep" value="${_esc(this._tenantName())}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مكتب الدراسات','BET / M. d\'œuvre')}</label>
    <input class="form-input" id="pvoBet">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('هيئة المراقبة','Organisme contrôle')}</label>
    <input class="form-input" id="pvoCtrl" placeholder="CTC...">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('تاريخ المحضر','Date PV')}</label>
    <input class="form-input" type="date" id="pvoDate" value="${new Date().toISOString().split('T')[0]}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('الساعة','Heure')}</label>
    <input class="form-input" id="pvoHour" value="09h00">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('تاريخ الانطلاق','Date démarrage')}</label>
    <input class="form-input" type="date" id="pvoStart" value="${defProj?.start_date||new Date().toISOString().split('T')[0]}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مدة التنفيذ','Délai d\'exécution')}</label>
    <input class="form-input" id="pvoDelay" value="${_L('6 أشهر','6 mois')}">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('الملاحظات والمعاينات','Observations')}</label>
    <textarea class="form-input" id="pvoObs" rows="2" placeholder="${_L('اتركه فارغاً للنص الافتراضي','Vide = texte par défaut')}"></textarea>
  </div>
</div>`);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const projId = this._val('pvoProj');
        const proj = projId ? this._projectsList().find(p=>String(p.id)===String(projId)) : null;
        if (!proj) { _toast(_L('اختر مشروعاً','Choisir un projet'),'error'); return; }
        if (!this._val('pvoMO')) { _toast(_L('أدخل صاحب المشروع','Saisir le MO'),'error'); return; }
        DZDocs.pvOuverture({ project:proj, marketRef:this._val('pvoMarket'), maitreOuvrage:this._val('pvoMO'), maitreRep:this._val('pvoMOrep'), entrepriseRep:this._val('pvoEntRep'), bet:this._val('pvoBet'), controle:this._val('pvoCtrl'), date:this._val('pvoDate'), hour:this._val('pvoHour'), startDate:this._val('pvoStart'), delay:this._val('pvoDelay'), observations:this._val('pvoObs') });
      });
    },

    attachement() {
      const projs = this._projectsList();
      const defProj = projs.length === 1 ? projs[0] : null;
      this._setTitle('📐 ' + _L('كشف المرفقات','Attachement'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group">
    <label class="form-label">🏗️ ${_L('المشروع','Projet')}</label>
    <select class="form-select" id="attProj">
      <option value="">— ${_L('بدون','Aucun')} —</option>
      ${projs.map(p=>`<option value="${p.id}" ${defProj?.id===p.id?'selected':''}>${_esc(p.name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('رقم المرفق','N° Attachement')}</label>
    <input class="form-input" id="attNum" value="01">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مرجع الصفقة','Réf. marché')}</label>
    <input class="form-input" id="attMarket">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('تاريخ المعاينة','Date constat')}</label>
    <input class="form-input" type="date" id="attDate" value="${new Date().toISOString().split('T')[0]}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('من تاريخ','Du')}</label>
    <input class="form-input" type="date" id="attFrom">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('إلى تاريخ','Au')}</label>
    <input class="form-input" type="date" id="attTo" value="${new Date().toISOString().split('T')[0]}">
  </div>
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
        const items = this._readRows('attItems',['desc','unit','qtyMarket','qtyDone','price']);
        const projId = this._val('attProj');
        const proj = projId ? this._projectsList().find(p=>String(p.id)===String(projId)) : null;
        DZDocs.attachement({ project:proj||{}, attNum:this._val('attNum'), marketRef:this._val('attMarket'), from:this._val('attFrom'), to:this._val('attTo'), date:this._val('attDate'), items });
      });
    },

    journal() {
      const projs = this._projectsList();
      const defProj = projs.length === 1 ? projs[0] : null;
      this._setTitle('📔 ' + _L('يوميات الورشة','Journal de Chantier'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group">
    <label class="form-label">🏗️ ${_L('المشروع','Projet')}</label>
    <select class="form-select" id="jcProj">
      <option value="">—</option>
      ${projs.map(p=>`<option value="${p.id}" ${defProj?.id===p.id?'selected':''}>${_esc(p.name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('قائد الأشغال','Conducteur')}</label>
    <input class="form-input" id="jcCond" value="${_esc(this._tenantName())}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('من تاريخ','Du')}</label>
    <input class="form-input" type="date" id="jcFrom">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('إلى تاريخ','Au')}</label>
    <input class="form-input" type="date" id="jcTo" value="${new Date().toISOString().split('T')[0]}">
  </div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📔 ${_L('السجل اليومي','Entrées quotidiennes')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('jcDays',['date','weather','workers','work','equipment','notes'])">+ ${_L('يوم','Journée')}</button>
  </div>
  <div id="jcDays" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('jcDays',['date','weather','workers','work','equipment','notes'],{date:new Date().toISOString().split('T')[0],weather:'☀️'}), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const projId = this._val('jcProj');
        const proj = projId ? this._projectsList().find(p=>String(p.id)===String(projId)) : null;
        DZDocs.journalChantier({ project:proj||{}, conductor:this._val('jcCond'), from:this._val('jcFrom'), to:this._val('jcTo'), days:this._readRows('jcDays',['date','weather','workers','work','equipment','notes']) });
      });
    },

    pv_reception_pro() { this._handlers._pvReception.call(this,'pro'); },
    pv_reception_def() { this._handlers._pvReception.call(this,'final'); },
    _pvReception(kind) {
      const isFinal = kind==='final';
      const projs = this._projectsList();
      const defProj = projs.length===1 ? projs[0] : null;
      this._setTitle((isFinal?'✅ ':'🤝 ')+_L(isFinal?'استلام نهائي':'استلام مؤقت',isFinal?'PV Réception Définitive':'PV Réception Provisoire'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group">
    <label class="form-label">🏗️ ${_L('المشروع','Projet')} *</label>
    <select class="form-select" id="pvrProj" onchange="DZDocsUI._handlers._onProjChange.call(DZDocsUI,this.value,['pvrMO'])">
      <option value="">—</option>
      ${projs.map(p=>`<option value="${p.id}" data-mo="${_esc(p.client_name||'')}" ${defProj?.id===p.id?'selected':''}>${_esc(p.name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مرجع الصفقة','Réf. marché')}</label>
    <input class="form-input" id="pvrMarket">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('صاحب المشروع','Maître d\'ouvrage')} *</label>
    <input class="form-input" id="pvrMO" value="${_esc(defProj?.client_name||'')}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('تاريخ الاستلام','Date réception')}</label>
    <input class="form-input" type="date" id="pvrDate" value="${new Date().toISOString().split('T')[0]}">
  </div>
  ${!isFinal?`
  <div class="form-group">
    <label class="form-label">${_L('فترة الضمان','Période garantie')}</label>
    <input class="form-input" id="pvrWarranty" value="${_L('12 شهر','12 mois')}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('نهاية الضمان','Fin garantie')}</label>
    <input class="form-input" type="date" id="pvrWarrantyEnd">
  </div>`:''}
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
        const proj = projId ? this._projectsList().find(p=>String(p.id)===String(projId)) : null;
        if (!proj) { _toast(_L('اختر مشروعاً','Choisir un projet'),'error'); return; }
        if (!this._val('pvrMO')) { _toast(_L('أدخل صاحب المشروع','Saisir le MO'),'error'); return; }
        DZDocs.pvReception({ kind, project:proj, marketRef:this._val('pvrMarket'), maitreOuvrage:this._val('pvrMO'), date:this._val('pvrDate'), warrantyPeriod:this._val('pvrWarranty'), warrantyEnd:this._val('pvrWarrantyEnd'), reserves:this._readRows('pvrReserves',['desc','deadline','status']) });
      });
    },

    // ══════════════════════════════════════════════
    // ③ FINANCE — النظام المالي
    // ══════════════════════════════════════════════

    acompte() {
      const projs = this._projectsList();
      const defProj = projs.length===1 ? projs[0] : null;
      const defClient = defProj?.client_name||'';
      const defBudget = defProj?.budget||'';
      this._setTitle('⏩ ' + _L('فاتورة تسبيق','Facture d\'Acompte'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group">
    <label class="form-label">${_L('اسم العميل / صاحب المشروع','Client / MO')} *</label>
    <input class="form-input" id="acoClient" value="${_esc(defClient)}" placeholder="بلدية / شركة...">
  </div>
  <div class="form-group">
    <label class="form-label">NIF ${_L('العميل','Client')}</label>
    <input class="form-input" id="acoClientNif">
  </div>
  <div class="form-group">
    <label class="form-label">🏗️ ${_L('المشروع','Projet')}</label>
    <select class="form-select" id="acoProj" onchange="DZDocsUI._handlers._onProjChange.call(DZDocsUI,this.value,['acoClient'],['acoTotal','acoClient'])">
      <option value="">—</option>
      ${projs.map(p=>`<option value="${p.id}" data-mo="${_esc(p.client_name||'')}" data-budget="${p.budget||''}" ${defProj?.id===p.id?'selected':''}>${_esc(p.name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مرجع الصفقة','Réf. marché')}</label>
    <input class="form-input" id="acoMarket">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('قيمة العقد الكلية TTC (دج)','Montant total marché TTC')}</label>
    <input class="form-input" type="number" id="acoTotal" value="${defBudget}" min="0">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مبلغ التسبيق TTC (دج)','Montant acompte TTC')} *</label>
    <input class="form-input" type="number" id="acoAmount" min="0" placeholder="${_L('مثلاً: 20% من قيمة العقد','Ex: 20% du montant')}">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('الوصف','Description')}</label>
    <textarea class="form-input" id="acoDesc" rows="2" placeholder="${_L('تسبيق لبدء الأشغال واقتناء المواد الأولية','Avance pour démarrage et matières premières')}"></textarea>
  </div>
</div>`);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        if (!this._val('acoClient')) { _toast(_L('أدخل العميل','Saisir le client'),'error'); return; }
        if (!this._num('acoAmount')) { _toast(_L('أدخل مبلغ التسبيق','Saisir le montant'),'error'); return; }
        const projId = this._val('acoProj');
        const proj = projId ? this._projectsList().find(p=>String(p.id)===String(projId)) : null;
        DZDocs.factureAcompte({ clientName:this._val('acoClient'), clientNif:this._val('acoClientNif'), projectName:proj?.name||'', marketRef:this._val('acoMarket'), totalContract:this._num('acoTotal'), amount:this._num('acoAmount'), description:this._val('acoDesc') });
      });
    },

    situation() {
      const projs = this._projectsList();
      const defProj = projs.length===1 ? projs[0] : null;
      this._setTitle('📈 ' + _L('كشف الأشغال — وضعية','Situation de Travaux'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group">
    <label class="form-label">${_L('رقم الوضعية','N° Situation')}</label>
    <input class="form-input" id="sitNum" value="01">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مرجع الصفقة','Réf. marché')}</label>
    <input class="form-input" id="sitMarket">
  </div>
  <div class="form-group">
    <label class="form-label">🏗️ ${_L('المشروع','Projet')}</label>
    <select class="form-select" id="sitProj" onchange="DZDocsUI._handlers._onProjChange.call(DZDocsUI,this.value,['sitMO'])">
      <option value="">—</option>
      ${projs.map(p=>`<option value="${p.id}" data-mo="${_esc(p.client_name||'')}" ${defProj?.id===p.id?'selected':''}>${_esc(p.name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('صاحب المشروع','Maître d\'ouvrage')}</label>
    <input class="form-input" id="sitMO" value="${_esc(defProj?.client_name||'')}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('من تاريخ','Du')}</label>
    <input class="form-input" type="date" id="sitFrom">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('إلى تاريخ','Au')}</label>
    <input class="form-input" type="date" id="sitTo" value="${new Date().toISOString().split('T')[0]}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('الوضعيات السابقة TTC (دج)','Cumul antérieur TTC')}</label>
    <input class="form-input" type="number" id="sitPrev" value="0" min="0">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('التسبيق المخصوم (دج)','Acompte à déduire')}</label>
    <input class="form-input" type="number" id="sitAco" value="0" min="0">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مرجع كشف المرفقات','Réf. attachement')}</label>
    <input class="form-input" id="sitAtt">
  </div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📊 ${_L('البنود التراكمية','Lignes cumulées')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('sitItems',['desc','unit','qtyCumul','price'])">+ ${_L('بند','Ligne')}</button>
  </div>
  <div id="sitItems" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('sitItems',['desc','unit','qtyCumul','price']), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const items = this._readRows('sitItems',['desc','unit','qtyCumul','price']).map(r=>({...r,cumulAmount:Number(r.qtyCumul||0)*Number(r.price||0)}));
        if (!items.length) { _toast(_L('أضف بنداً','Au moins une ligne'),'error'); return; }
        const projId = this._val('sitProj');
        const proj = projId ? this._projectsList().find(p=>String(p.id)===String(projId)) : null;
        DZDocs.situationTravaux({ sitNum:this._val('sitNum'), marketRef:this._val('sitMarket'), projectName:proj?.name||'', maitreOuvrage:this._val('sitMO'), from:this._val('sitFrom'), to:this._val('sitTo'), previousCumul:this._num('sitPrev'), acompteDeducted:this._num('sitAco'), attRef:this._val('sitAtt'), items });
      });
    },

    def_invoice() {
      const projs = this._projectsList();
      const defProj = projs.length===1 ? projs[0] : null;
      this._setTitle('🏁 ' + _L('فاتورة نهائية','Facture Définitive'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group">
    <label class="form-label">${_L('العميل / صاحب المشروع','Client / MO')} *</label>
    <input class="form-input" id="defClient" value="${_esc(defProj?.client_name||'')}">
  </div>
  <div class="form-group">
    <label class="form-label">NIF ${_L('العميل','Client')}</label>
    <input class="form-input" id="defNif">
  </div>
  <div class="form-group">
    <label class="form-label">🏗️ ${_L('المشروع','Projet')}</label>
    <select class="form-select" id="defProj" onchange="DZDocsUI._handlers._onProjChange.call(DZDocsUI,this.value,['defClient'],['defTotal'])">
      <option value="">—</option>
      ${projs.map(p=>`<option value="${p.id}" data-mo="${_esc(p.client_name||'')}" data-budget="${p.budget||''}" ${defProj?.id===p.id?'selected':''}>${_esc(p.name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مرجع الصفقة','Réf. marché')}</label>
    <input class="form-input" id="defMarket">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مرجع محضر الاستلام','Réf. PV réception')}</label>
    <input class="form-input" id="defPv">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('قيمة العقد الكلية TTC (دج)','Montant total marché TTC')} *</label>
    <input class="form-input" type="number" id="defTotal" value="${defProj?.budget||''}" min="0">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مجموع التسبيقات (دج)','Total acomptes')}</label>
    <input class="form-input" type="number" id="defAcoSum" value="0" min="0">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مجموع الوضعيات السابقة (دج)','Total situations payées')}</label>
    <input class="form-input" type="number" id="defSitSum" value="0" min="0">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('شروط الدفع','Conditions de paiement')}</label>
    <input class="form-input" id="defPay" value="${_L('تحويل بنكي خلال 30 يوم','Virement sous 30 jours')}">
  </div>
</div>`);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        if (!this._val('defClient')) { _toast(_L('أدخل العميل','Saisir le client'),'error'); return; }
        if (!this._num('defTotal')) { _toast(_L('أدخل قيمة العقد','Saisir le montant'),'error'); return; }
        const projId = this._val('defProj');
        const proj = projId ? this._projectsList().find(p=>String(p.id)===String(projId)) : null;
        DZDocs.factureDefinitive({ clientName:this._val('defClient'), clientNif:this._val('defNif'), projectName:proj?.name||'', marketRef:this._val('defMarket'), pvRef:this._val('defPv'), totalContract:this._num('defTotal'), acompteSum:this._num('defAcoSum'), situationsSum:this._num('defSitSum'), payTerms:this._val('defPay') });
      });
    },

    quittance() {
      const invs = this._invoicesList().filter(i=>i.status==='paid').slice(-15).reverse();
      this._setTitle('🧾 ' + _L('وصل تسديد','Quittance de Paiement'));
      this._setBody(`
${invs.length>0?`<div class="form-group" style="margin-bottom:1rem;padding:.8rem;background:rgba(232,184,75,.05);border-radius:8px;border:1px solid rgba(232,184,75,.2)">
  <label class="form-label">⚡ ${_L('استيراد من فاتورة مدفوعة','Importer depuis facture payée')}</label>
  <select class="form-select" id="quitInv" onchange="DZDocsUI._handlers._fillQuitFromInv.call(DZDocsUI,this.value)">
    <option value="">— ${_L('اختر فاتورة لتعبئة البيانات','Choisir facture pour pré-remplir')} —</option>
    ${invs.map(i=>`<option value="${i.id}">${_esc(i.number)} — ${_esc(i.client)} — ${Number(i.amount||0).toLocaleString('fr-DZ')} DA</option>`).join('')}
  </select>
</div>`:''}
<div class="form-grid-2">
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('المستلم منه','Reçu de')} *</label>
    <input class="form-input" id="quitPayer" placeholder="${_L('اسم العميل أو المؤسسة','Nom du payeur')}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('عنوانه','Adresse')}</label>
    <input class="form-input" id="quitPayerAddr">
  </div>
  <div class="form-group">
    <label class="form-label">NIF</label>
    <input class="form-input" id="quitPayerNif">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('المبلغ TTC (دج)','Montant TTC')} *</label>
    <input class="form-input" type="number" id="quitAmount" min="0">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مرجع الفاتورة','Réf. facture')}</label>
    <input class="form-input" id="quitInvRef">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('الموضوع','Objet')} *</label>
    <input class="form-input" id="quitSubject" placeholder="${_L('سداد فاتورة / تسبيق...','Règlement facture...')}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('طريقة الدفع','Mode paiement')}</label>
    <select class="form-select" id="quitMethod">
      <option value="${_L('نقداً','Espèces')}">${_L('نقداً','Espèces')}</option>
      <option value="${_L('شيك','Chèque')}">${_L('شيك','Chèque')}</option>
      <option value="${_L('تحويل بنكي','Virement')}">${_L('تحويل بنكي','Virement')}</option>
      <option value="${_L('حوالة بريدية','Mandat CCP')}">${_L('حوالة بريدية','Mandat CCP')}</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('رقم الشيك / المرجع البنكي','N° chèque / réf. banque')}</label>
    <input class="form-input" id="quitRef">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('المكان','Lieu')}</label>
    <input class="form-input" id="quitLocation" value="${_esc(this._tenantWilaya())}">
  </div>
</div>`);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        if (!this._val('quitPayer')) { _toast(_L('أدخل المستلم منه','Saisir le payeur'),'error'); return; }
        if (!this._num('quitAmount')) { _toast(_L('أدخل المبلغ','Saisir le montant'),'error'); return; }
        if (!this._val('quitSubject')) { _toast(_L('أدخل الموضوع','Saisir l\'objet'),'error'); return; }
        DZDocs.quittance({ payerName:this._val('quitPayer'), payerAddress:this._val('quitPayerAddr'), payerNif:this._val('quitPayerNif'), amount:this._num('quitAmount'), invoiceRef:this._val('quitInvRef'), subject:this._val('quitSubject'), method:this._val('quitMethod'), checkNum:this._val('quitRef'), location:this._val('quitLocation') });
      });
    },
    _fillQuitFromInv(invId) {
      if (!invId) return;
      const inv = this._invoicesList().find(i=>String(i.id)===String(invId));
      if (!inv) return;
      const set = (id,v) => { const e=document.getElementById(id); if(e) e.value=v||''; };
      set('quitPayer',  inv.client);
      set('quitAmount', inv.amount);
      set('quitInvRef', inv.number);
      set('quitSubject', _L(`سداد الفاتورة ${inv.number}`,`Règlement facture ${inv.number}`));
      const method = inv.payment_method==='cash' ? _L('نقداً','Espèces') : inv.payment_method==='check' ? _L('شيك','Chèque') : _L('تحويل بنكي','Virement');
      const sel = document.getElementById('quitMethod');
      if (sel) { for (const o of sel.options) { if (o.value===method) { o.selected=true; break; } } }
    },

    // ══════════════════════════════════════════════
    // ④ HR — الموارد البشرية
    // ══════════════════════════════════════════════

    paie() {
      const workers = this._workersList();
      const defW = workers.length===1 ? workers[0] : null;
      const defBase = defW ? (defW.monthly_base || defW.daily_salary*26 || '') : '';
      this._setTitle('💼 ' + _L('كشف راتب','Bulletin de paie'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">👤 ${_L('العامل','Employé')} *</label>
    <select class="form-select" id="paieWorker" onchange="DZDocsUI._handlers._fillPaieFromWorker.call(DZDocsUI,this.value)">
      <option value="">— ${_L('اختر','Choisir')} —</option>
      ${workers.map(w=>`<option value="${w.id}" data-base="${w.monthly_base||(w.daily_salary||0)*26}" data-daily="${w.daily_salary||0}" data-type="${w.contract_type||'monthly'}" ${defW?.id===w.id?'selected':''}>${_esc(w.full_name)}${w.role?' — '+_esc(w.role):''}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('الشهر','Mois')}</label>
    <input class="form-input" id="paieMonth" value="${new Date().toLocaleString('fr-DZ',{month:'long',year:'numeric'})}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('أيام العمل','Jours travaillés')}</label>
    <input class="form-input" type="number" id="paieDays" value="26" min="0" max="31">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('الراتب القاعدي (دج)','Salaire de base (DA)')} *</label>
    <input class="form-input" type="number" id="paieBase" value="${defBase}" min="0" placeholder="${_L('يُملأ تلقائياً عند اختيار العامل','Auto-rempli à la sélection')}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('ساعات إضافية (دج)','Heures supp. (DA)')}</label>
    <input class="form-input" type="number" id="paieOT" value="0" min="0">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('علاوات / منح (دج)','Primes (DA)')}</label>
    <input class="form-input" type="number" id="paieBonus" value="0" min="0">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('علاوة نقل (دج)','Indemnité transport (DA)')}</label>
    <input class="form-input" type="number" id="paieTransp" value="0" min="0">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('اقتطاعات أخرى (دج)','Autres retenues (DA)')}</label>
    <input class="form-input" type="number" id="paieOther" value="0" min="0">
  </div>
</div>
<div style="font-size:.75rem;color:var(--dim);padding:.5rem;background:rgba(232,184,75,.04);border-radius:6px;margin-top:.5rem">
  💡 ${_L('الاقتطاعات المحسوبة تلقائياً: CNAS 9% + IRG حسب الشرائح الجزائرية','CNAS 9% + IRG calculé automatiquement selon barème algérien')}
</div>`);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const wid = this._val('paieWorker');
        const worker = wid ? this._workersList().find(w=>String(w.id)===String(wid)) : null;
        if (!worker) { _toast(_L('اختر عاملاً','Choisir employé'),'error'); return; }
        if (!this._num('paieBase')) { _toast(_L('أدخل الراتب القاعدي','Saisir salaire base'),'error'); return; }
        DZDocs.fichePaie({ worker, month:this._val('paieMonth'), daysWorked:this._num('paieDays',26), baseSalary:this._num('paieBase'), overtime:this._num('paieOT'), bonuses:this._num('paieBonus'), transport:this._num('paieTransp'), otherDeductions:this._num('paieOther') });
      });
    },
    _fillPaieFromWorker(wid) {
      if (!wid) return;
      const worker = this._workersList().find(w=>String(w.id)===String(wid));
      if (!worker) return;
      const base = document.getElementById('paieBase');
      if (base) base.value = worker.monthly_base || (worker.daily_salary||0)*26 || '';
    },

    cdd() { this._handlers._contract.call(this,'cdd'); },
    cta() { this._handlers._contract.call(this,'cta'); },
    cdi() { this._handlers._contract.call(this,'cdi'); },
    _contract(kind) {
      const workers = this._workersList();
      const projs   = this._projectsList();
      const defW    = workers.length===1 ? workers[0] : null;
      const defP    = projs.length===1   ? projs[0]   : null;
      const labels  = { cdd:_L('عقد محدد المدة CDD','Contrat CDD'), cta:_L('عقد مدعم CTA','Contrat CTA-ANEM'), cdi:_L('عقد دائم CDI','Contrat CDI') };
      this._setTitle('📝 ' + labels[kind]);
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">👤 ${_L('العامل','Employé')} *</label>
    <select class="form-select" id="ctWorker" onchange="DZDocsUI._handlers._fillCtFromWorker.call(DZDocsUI,this.value)">
      <option value="">— ${_L('اختر','Choisir')} —</option>
      ${workers.map(w=>`<option value="${w.id}" data-name="${_esc(w.full_name)}" data-role="${_esc(w.role||'')}" data-hire="${_esc(w.hire_date||'')}" ${defW?.id===w.id?'selected':''}>${_esc(w.full_name)} — ${_esc(w.role||'')}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('عنوان العامل','Adresse employé')}</label>
    <input class="form-input" id="ctWorkerAddr">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('ممثل صاحب العمل','Représentant employeur')}</label>
    <input class="form-input" id="ctEmpRep" value="${_esc(this._tenantName())}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('تاريخ بدء العقد','Date début')}</label>
    <input class="form-input" type="date" id="ctStart" value="${defW?.hire_date||new Date().toISOString().split('T')[0]}">
  </div>
  ${kind!=='cdi'?`
  <div class="form-group">
    <label class="form-label">${_L('تاريخ نهاية العقد','Date fin')}</label>
    <input class="form-input" type="date" id="ctEnd" value="${defP?.end_date||''}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('المدة','Durée')}</label>
    <input class="form-input" id="ctDuration" value="${kind==='cta'?_L('12 شهر','12 mois'):_L('6 أشهر','6 mois')}">
  </div>`:`
  <div class="form-group">
    <label class="form-label">${_L('فترة التجربة','Période d\'essai')}</label>
    <input class="form-input" id="ctTrial" value="${_L('3 أشهر','3 mois')}">
  </div>`}
  <div class="form-group">
    <label class="form-label">${_L('مكان العمل','Lieu de travail')}</label>
    <input class="form-input" id="ctWorkplace" value="${_esc(defP?.location||defP?.wilaya||this._tenantWilaya())}">
  </div>
  ${kind==='cdd'?`<div class="form-group">
    <label class="form-label">🏗️ ${_L('المشروع','Projet')}</label>
    <select class="form-select" id="ctProj">
      <option value="">—</option>
      ${projs.map(p=>`<option value="${p.id}" ${defP?.id===p.id?'selected':''}>${_esc(p.name)}</option>`).join('')}
    </select>
  </div>`:''}
</div>`);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const wid = this._val('ctWorker');
        const worker = wid ? this._workersList().find(w=>String(w.id)===String(wid)) : null;
        if (!worker) { _toast(_L('اختر عاملاً','Choisir employé'),'error'); return; }
        const projId = this._val('ctProj');
        const proj = projId ? this._projectsList().find(p=>String(p.id)===String(projId)) : null;
        DZDocs.contract({ kind, worker, workerAddress:this._val('ctWorkerAddr'), employerRep:this._val('ctEmpRep'), startDate:this._val('ctStart'), endDate:this._val('ctEnd'), duration:this._val('ctDuration'), trialPeriod:this._val('ctTrial'), workplace:this._val('ctWorkplace'), projectName:proj?.name||'' });
      });
    },
    _fillCtFromWorker(wid) {
      if (!wid) return;
      const worker = this._workersList().find(w=>String(w.id)===String(wid));
      if (!worker) return;
      const set = (id,v) => { const e=document.getElementById(id); if(e&&v) e.value=v; };
      set('ctStart', worker.hire_date);
    },

    pointage() {
      const workers = this._workersList();
      const projs   = this._projectsList();
      const defW    = workers.length===1 ? workers[0] : null;
      const defP    = projs.length===1   ? projs[0]   : null;
      this._setTitle('⏱️ ' + _L('بطاقة حضور','Fiche de Pointage'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group">
    <label class="form-label">👤 ${_L('العامل','Employé')} *</label>
    <select class="form-select" id="ptWorker">
      <option value="">—</option>
      ${workers.map(w=>`<option value="${w.id}" data-name="${_esc(w.full_name)}" data-role="${_esc(w.role||'')}" ${defW?.id===w.id?'selected':''}>${_esc(w.full_name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">🏗️ ${_L('الورشة','Chantier')}</label>
    <select class="form-select" id="ptProj">
      <option value="">—</option>
      ${projs.map(p=>`<option value="${p.id}" data-name="${_esc(p.name)}" ${defP?.id===p.id?'selected':''}>${_esc(p.name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('من تاريخ','Du')}</label>
    <input class="form-input" type="date" id="ptFrom">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('إلى تاريخ','Au')}</label>
    <input class="form-input" type="date" id="ptTo" value="${new Date().toISOString().split('T')[0]}">
  </div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">⏱️ ${_L('الأيام المسجلة','Jours pointés')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('ptDays',['date','checkIn','checkOut','hours','overtime','notes'])">+ ${_L('يوم','Jour')}</button>
  </div>
  <div id="ptDays" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('ptDays',['date','checkIn','checkOut','hours','overtime','notes'],{date:new Date().toISOString().split('T')[0],checkIn:'08:00',checkOut:'17:00',hours:8,overtime:0}), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const wOpt = document.getElementById('ptWorker')?.selectedOptions?.[0];
        const pOpt = document.getElementById('ptProj')?.selectedOptions?.[0];
        if (!wOpt?.value) { _toast(_L('اختر عاملاً','Choisir employé'),'error'); return; }
        DZDocs.fichePointage({ workerName:wOpt.dataset.name, workerRole:wOpt.dataset.role, projectName:pOpt?.dataset?.name||'', from:this._val('ptFrom'), to:this._val('ptTo'), days:this._readRows('ptDays',['date','checkIn','checkOut','hours','overtime','notes']) });
      });
    },
    _fillPtFromWorker() {},

    attestation() {
      const workers = this._workersList();
      const defW    = workers.length===1 ? workers[0] : null;
      this._setTitle('📄 ' + _L('شهادة عمل','Attestation de Travail'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">👤 ${_L('العامل','Employé')} *</label>
    <select class="form-select" id="atWorker">
      <option value="">— ${_L('اختر','Choisir')} —</option>
      ${workers.map(w=>`<option value="${w.id}" ${defW?.id===w.id?'selected':''}>${_esc(w.full_name)} — ${_esc(w.role||'')}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('تاريخ بدء العمل','Date début')}</label>
    <input class="form-input" type="date" id="atStart" value="${defW?.hire_date||''}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('تاريخ نهاية العمل (إن وجد)','Date fin (optionnel)')}</label>
    <input class="form-input" type="date" id="atEnd">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('اسم الموقّع','Signataire')}</label>
    <input class="form-input" id="atSigner" value="${_esc(this._tenantName())}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('وظيفة الموقّع','Fonction signataire')}</label>
    <input class="form-input" id="atSignerRole" value="${_L('المدير','Le Gérant')}">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('ملاحظات إضافية','Observations')}</label>
    <textarea class="form-input" id="atObs" rows="2" placeholder="${_L('اتركه فارغاً للنص الافتراضي','Vide = texte par défaut')}"></textarea>
  </div>
</div>`);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const wid = this._val('atWorker');
        const worker = wid ? this._workersList().find(w=>String(w.id)===String(wid)) : null;
        if (!worker) { _toast(_L('اختر عاملاً','Choisir employé'),'error'); return; }
        DZDocs.attestationTravail({ worker, startDate:this._val('atStart'), endDate:this._val('atEnd'), signerName:this._val('atSigner'), signerRole:this._val('atSignerRole'), observations:this._val('atObs') });
      });
    },

    // ══════════════════════════════════════════════
    // ⑤ LOGISTICS — اللوجستيك
    // ══════════════════════════════════════════════

    commande() {
      const projs = this._projectsList();
      const defP  = projs.length===1 ? projs[0] : null;
      this._setTitle('🛒 ' + _L('وصل طلب','Bon de Commande'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group">
    <label class="form-label">🏪 ${_L('اسم المورد','Fournisseur')} *</label>
    <input class="form-input" id="bcSupplier" placeholder="${_L('اسم الشركة أو المورد','Nom du fournisseur')}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('هاتف المورد','Tél fournisseur')}</label>
    <input class="form-input" id="bcSupplierPhone">
  </div>
  <div class="form-group">
    <label class="form-label">NIF ${_L('المورد','fournisseur')}</label>
    <input class="form-input" id="bcSupplierNif">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('عنوان المورد','Adresse fournisseur')}</label>
    <input class="form-input" id="bcSupplierAddr">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('عنوان التسليم','Lieu de livraison')}</label>
    <input class="form-input" id="bcDeliveryAddr" value="${_esc(defP?.location||defP?.wilaya||'')}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('تاريخ التسليم المطلوب','Date livraison souhaitée')}</label>
    <input class="form-input" type="date" id="bcDeliveryDate">
  </div>
  <div class="form-group">
    <label class="form-label">🏗️ ${_L('الورشة المستفيدة','Chantier destinataire')}</label>
    <select class="form-select" id="bcProj">
      <option value="">—</option>
      ${projs.map(p=>`<option value="${p.id}" data-name="${_esc(p.name)}" ${defP?.id===p.id?'selected':''}>${_esc(p.name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('شروط الدفع','Modalités paiement')}</label>
    <input class="form-input" id="bcPay" value="${_L('عند التسليم','À la livraison')}">
  </div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📦 ${_L('المواد المطلوبة','Articles à commander')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('bcItems',['desc','unit','qty','price'])">+ ${_L('إضافة','Ajouter')}</button>
  </div>
  <div id="bcItems" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('bcItems',['desc','unit','qty','price']), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const items = this._readRows('bcItems',['desc','unit','qty','price']).map(r=>({...r,total:Number(r.qty||0)*Number(r.price||0)})).filter(i=>i.desc);
        if (!this._val('bcSupplier')) { _toast(_L('أدخل اسم المورد','Saisir fournisseur'),'error'); return; }
        if (!items.length) { _toast(_L('أضف مادة واحدة','Ajouter article'),'error'); return; }
        const projOpt = document.getElementById('bcProj')?.selectedOptions?.[0];
        DZDocs.bonCommande({ supplierName:this._val('bcSupplier'), supplierPhone:this._val('bcSupplierPhone'), supplierNif:this._val('bcSupplierNif'), supplierAddress:this._val('bcSupplierAddr'), deliveryAddress:this._val('bcDeliveryAddr'), deliveryDate:this._val('bcDeliveryDate'), projectName:projOpt?.dataset?.name||'', payTerms:this._val('bcPay'), items });
      });
    },

    reception() {
      const projs = this._projectsList();
      const defP  = projs.length===1 ? projs[0] : null;
      this._setTitle('📥 ' + _L('وصل استلام','Bon de Réception'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group">
    <label class="form-label">🏪 ${_L('اسم المورد','Fournisseur')} *</label>
    <input class="form-input" id="brSupplier" placeholder="${_L('اسم المورد','Nom du fournisseur')}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('هاتف المورد','Tél fournisseur')}</label>
    <input class="form-input" id="brSupplierPhone">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مرجع وصل الطلب','Réf. BC')}</label>
    <input class="form-input" id="brBcRef" placeholder="BC-2025-...">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مرجع وصل التسليم','Réf. BL fournisseur')}</label>
    <input class="form-input" id="brBlRef">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('مكان الاستلام','Lieu de réception')}</label>
    <input class="form-input" id="brLocation" value="${_esc(defP?.location||defP?.wilaya||this._tenantWilaya())}">
  </div>
  <div class="form-group">
    <label class="form-label">🏗️ ${_L('الورشة','Chantier')}</label>
    <select class="form-select" id="brProj">
      <option value="">—</option>
      ${projs.map(p=>`<option value="${p.id}" data-name="${_esc(p.name)}" ${defP?.id===p.id?'selected':''}>${_esc(p.name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('ملاحظات','Observations')}</label>
    <textarea class="form-input" id="brObs" rows="2"></textarea>
  </div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📦 ${_L('المواد المستلمة','Articles reçus')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('brItems',['desc','unit','qtyOrdered','qtyDelivered','qtyAccepted','status'])">+ ${_L('إضافة','Ajouter')}</button>
  </div>
  <div id="brItems" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('brItems',['desc','unit','qtyOrdered','qtyDelivered','qtyAccepted','status']), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const items = this._readRows('brItems',['desc','unit','qtyOrdered','qtyDelivered','qtyAccepted','status']).filter(i=>i.desc);
        if (!this._val('brSupplier')) { _toast(_L('أدخل اسم المورد','Saisir fournisseur'),'error'); return; }
        if (!items.length) { _toast(_L('أضف مادة','Ajouter article'),'error'); return; }
        const projOpt = document.getElementById('brProj')?.selectedOptions?.[0];
        DZDocs.bonReception({ supplierName:this._val('brSupplier'), supplierPhone:this._val('brSupplierPhone'), bcRef:this._val('brBcRef'), blRef:this._val('brBlRef'), location:this._val('brLocation'), projectName:projOpt?.dataset?.name||'', observations:this._val('brObs'), items });
      });
    },

    sortie() {
      const projs = this._projectsList();
      const defP  = projs.length===1 ? projs[0] : null;
      this._setTitle('📤 ' + _L('وصل خروج','Bon de Sortie'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group">
    <label class="form-label">🏗️ ${_L('الورشة المستلمة','Chantier destinataire')} *</label>
    <select class="form-select" id="bsProj">
      <option value="">—</option>
      ${projs.map(p=>`<option value="${p.id}" data-name="${_esc(p.name)}" data-loc="${_esc(p.location||p.wilaya||'')}" ${defP?.id===p.id?'selected':''}>${_esc(p.name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('الطالب','Demandeur')}</label>
    <input class="form-input" id="bsRequester">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('وظيفة الطالب','Fonction')}</label>
    <input class="form-input" id="bsRequesterRole" placeholder="${_L('قائد الأشغال...','Conducteur...')}">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('تاريخ الخروج','Date sortie')}</label>
    <input class="form-input" type="date" id="bsDate" value="${new Date().toISOString().split('T')[0]}">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">${_L('ملاحظات','Observations')}</label>
    <textarea class="form-input" id="bsObs" rows="2"></textarea>
  </div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">📤 ${_L('المواد الخارجة','Articles à sortir')}</label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="DZDocsUI._addRow('bsItems',['desc','unit','stockBefore','qtyOut','usage'])">+ ${_L('إضافة','Ajouter')}</button>
  </div>
  <div id="bsItems" style="display:flex;flex-direction:column;gap:.4rem"></div>
</div>`);
      setTimeout(() => this._addRow('bsItems',['desc','unit','stockBefore','qtyOut','usage']), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const items = this._readRows('bsItems',['desc','unit','stockBefore','qtyOut','usage']).filter(i=>i.desc);
        const projOpt = document.getElementById('bsProj')?.selectedOptions?.[0];
        if (!projOpt?.value) { _toast(_L('اختر الورشة','Choisir chantier'),'error'); return; }
        if (!items.length) { _toast(_L('أضف مادة','Ajouter article'),'error'); return; }
        DZDocs.bonSortie({ projectName:projOpt.dataset.name, location:projOpt.dataset.loc, requestedBy:this._val('bsRequester'), requesterRole:this._val('bsRequesterRole'), date:this._val('bsDate'), observations:this._val('bsObs'), items });
      });
    },

    suivi() {
      const equips = this._equipmentList();
      const projs  = this._projectsList();
      const defE   = equips.length===1 ? equips[0] : null;
      this._setTitle('🚜 ' + _L('بطاقة تتبع عتاد','Fiche Suivi Équipement'));
      this._setBody(`
<div class="form-grid-2">
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">🚜 ${_L('العتاد','Équipement')} *</label>
    <select class="form-select" id="seEquip">
      <option value="">— ${_L('اختر','Choisir')} —</option>
      ${equips.map(e=>`<option value="${e.id}" data-name="${_esc(e.name||'')}" data-type="${_esc(e.type||'')}" data-serial="${_esc(e.serial||'')}" data-plate="${_esc(e.plate_number||e.plate||'')}" ${defE?.id===e.id?'selected':''}>${_esc(e.name)} ${e.type?'— '+_esc(e.type):''}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">${_L('السائق / المشغّل','Conducteur / Opérateur')}</label>
    <input class="form-input" id="seOperator">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('من تاريخ','Du')}</label>
    <input class="form-input" type="date" id="seFrom">
  </div>
  <div class="form-group">
    <label class="form-label">${_L('إلى تاريخ','Au')}</label>
    <input class="form-input" type="date" id="seTo" value="${new Date().toISOString().split('T')[0]}">
  </div>
</div>
<div style="margin-top:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <label class="form-label" style="margin:0">⛽ ${_L('سجل الاستعمال اليومي','Suivi utilisation')}</label>
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
      setTimeout(() => this._addRow('seUsages',['date','project','hourStart','hourEnd','hours','fuel','notes']), 30);
      this._setAction('📄 ' + _L('توليد PDF','Générer PDF'), () => {
        const opt = document.getElementById('seEquip')?.selectedOptions?.[0];
        if (!opt?.value) { _toast(_L('اختر العتاد','Choisir équipement'),'error'); return; }
        DZDocs.ficheSuiviEquip({ equipment:{name:opt.dataset.name,type:opt.dataset.type,serial:opt.dataset.serial,plate:opt.dataset.plate}, operator:this._val('seOperator'), from:this._val('seFrom'), to:this._val('seTo'), usages:this._readRows('seUsages',['date','project','hourStart','hourEnd','hours','fuel','notes']), maintenances:this._readRows('seMaint',['date','type','notes','cost','nextDate']).map(m=>({...m,desc:m.notes})) });
      });
    },

    // ══════════════════════════════════════════════
    // Helpers مشتركة
    // ══════════════════════════════════════════════
    _onProjChange(projId, moFields, budgetFields) {
      if (!projId) return;
      const proj = (typeof Auth!=='undefined') ? (DB.get('projects')||[]).find(p=>String(p.id)===String(projId)) : null;
      if (!proj) return;
      (moFields||[]).forEach(f => { const e=document.getElementById(f); if(e&&proj.client_name) e.value=proj.client_name; });
      (budgetFields||[]).forEach(f => { const e=document.getElementById(f); if(e&&proj.budget&&!e.value) e.value=proj.budget; });
    },

  } // end _handlers
}; // end DZDocsUI

console.log('✅ DZDocsUI — واجهة الوثائق الإدارية محمّلة (22 وثيقة)');

// ════════════════════════════════════════════════════════════════════
//  🎨 CSS موحد لأزرار dropdown داخل الصفحات
// ════════════════════════════════════════════════════════════════════
function _injectDDStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('dz-dd-styles')) return; // مرة واحدة فقط
  // فحص آمن لـ I18N (قد يكون const داخل سكوب مختلف)
  let isFr = false;
  try { isFr = (typeof I18N !== 'undefined' && I18N && I18N.currentLang === 'fr'); }
  catch(_) { isFr = false; }
  const align = isFr ? 'left' : 'right';
  const style = document.createElement('style');
  style.id = 'dz-dd-styles';
  style.textContent = `
    .dz-dd-item {
      display: block; width: 100%; text-align: ${align};
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
}

if (typeof document !== 'undefined') {
  // إغلاق الـ dropdowns عند النقر خارجها — مرة واحدة فقط
  if (!window._dzClickInstalled) {
    window._dzClickInstalled = true;
    document.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('.dz-dd')) return;
      document.querySelectorAll('.dz-dd-menu').forEach(m => m.style.display = 'none');
    });
  }

  // حقن الـ CSS مرة واحدة (بعد التحميل إن لزم)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _injectDDStyles);
  } else {
    _injectDDStyles();
  }
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


// ════════════════════════════════════════════════════════════════════
//  📂 Pages.dz_saved — سجل الوثائق المولَّدة
// ════════════════════════════════════════════════════════════════════
window.Pages.dz_saved = function() {
  if (typeof Auth === 'undefined' || !Auth.getUser()) return '';
  const tid = Auth.getUser().tenant_id;
  const allDocs = (DB.get('dz_generated_docs') || []).filter(d => d.tenant_id === tid);

  // خريطة: key → {icon, name_ar, name_fr}
  const DOC_META = {};
  if (typeof DZ_DOC_CATALOG !== 'undefined') {
    DZ_DOC_CATALOG.forEach(sec => sec.docs.forEach(d => {
      DOC_META[d.key] = { icon: d.icon, ar: d.name.ar, fr: d.name.fr };
    }));
  }

  // دالة مساعدة محلية للترجمة
  const lbl = (ar, fr) => {
    try { return (typeof I18N !== 'undefined' && I18N.currentLang === 'fr') ? fr : ar; } catch(_) { return ar; }
  };

  // تصفية بالنوع
  const filterKey = sessionStorage.getItem('dzs_filter') || 'all';
  const filtered = filterKey === 'all' ? allDocs : allDocs.filter(d => d.doc_type === filterKey);

  // الأنواع الموجودة فعلاً
  const usedKeys = [...new Set(allDocs.map(d => d.doc_type).filter(Boolean))];

  const layoutFn = (typeof layoutHTML === 'function') ? layoutHTML : ((_,__,c) => c);

  return layoutFn('dz_saved', lbl('سجل الوثائق المولَّدة','Historique des documents'), `
<style>
  .dzs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:.9rem;margin-top:1rem}
  .dzs-card{background:var(--card-bg,#0e1720);border:1px solid var(--border);border-radius:12px;padding:1rem;display:flex;flex-direction:column;gap:.5rem;transition:border-color .2s}
  .dzs-card:hover{border-color:rgba(232,184,75,.5)}
  .dzs-type{font-size:.68rem;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.5px}
  .dzs-title{font-size:.9rem;font-weight:800;line-height:1.3}
  .dzs-date{font-size:.72rem;color:var(--dim)}
  .dzs-fields{font-size:.72rem;color:var(--muted);line-height:1.7;margin-top:.2rem;border-top:1px solid var(--border);padding-top:.4rem}
  .dzs-actions{display:flex;gap:.4rem;margin-top:auto;padding-top:.5rem}
  .dzs-empty{text-align:center;padding:3rem 1rem;color:var(--dim)}
  .dzs-filter-bar{display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:1rem}
</style>

<div class="page-header">
  <div>
    <div class="page-title">📂 ${lbl('سجل الوثائق المولَّدة','Historique des documents')}</div>
    <div class="page-sub">${allDocs.length} ${lbl('وثيقة محفوظة','document(s) enregistré(s)')}</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-ghost" onclick="App.navigate('dz_documents')">📚 ${lbl('مركز الوثائق','Centre docs')}</button>
    ${allDocs.length > 0 ? `<button class="btn btn-red btn-sm" onclick="dzsClearAll()">${lbl('🗑️ مسح الكل','🗑️ Tout effacer')}</button>` : ''}
  </div>
</div>

<!-- فلتر بالنوع -->
<div class="dzs-filter-bar">
  <button class="btn ${filterKey==='all'?'btn-gold':'btn-ghost'} btn-sm" onclick="sessionStorage.setItem('dzs_filter','all');App.navigate('dz_saved')">${lbl('الكل','Tout')} (${allDocs.length})</button>
  ${usedKeys.map(k => {
    const m = DOC_META[k];
    const name = m ? lbl(m.ar, m.fr) : k;
    const count = allDocs.filter(d=>d.doc_type===k).length;
    return `<button class="btn ${filterKey===k?'btn-gold':'btn-ghost'} btn-sm" onclick="sessionStorage.setItem('dzs_filter','${k}');App.navigate('dz_saved')">${m?m.icon:''} ${name} (${count})</button>`;
  }).join('')}
</div>

${filtered.length === 0 ? `
  <div class="dzs-empty">
    <div style="font-size:3rem;margin-bottom:1rem">📂</div>
    <div style="font-size:.95rem">${lbl('لا توجد وثائق محفوظة بعد','Aucun document enregistré')}</div>
    <div style="font-size:.78rem;margin-top:.4rem;color:var(--dim)">${lbl('كل وثيقة تولّدها ستُحفظ هنا تلقائياً','Chaque document généré sera sauvegardé ici')}</div>
    <button class="btn btn-gold" style="margin-top:1.2rem" onclick="App.navigate('dz_documents')">📚 ${lbl('ابدأ من مركز الوثائق','Aller au centre')}</button>
  </div>
` : `
  <div class="dzs-grid">
    ${filtered.map(doc => {
      const m = DOC_META[doc.doc_type];
      const icon  = m ? m.icon : '📄';
      const tname = m ? lbl(m.ar, m.fr) : (doc.doc_type || '—');

      // استخراج أبرز الحقول
      const f = doc.fields || {};
      const snippetKeys = Object.keys(f).slice(0, 4);
      const snippet = snippetKeys.map(k => {
        const v = f[k];
        if (!v || v.length > 60) return '';
        return `<span style="color:var(--text)">${String(v).substring(0,40)}</span>`;
      }).filter(Boolean).join(' · ');

      return `<div class="dzs-card">
        <div class="dzs-type">${icon} ${tname}</div>
        <div class="dzs-title">${escHtml ? escHtml(doc.doc_title||tname) : (doc.doc_title||tname)}</div>
        <div class="dzs-date">📅 ${doc.date || ''}</div>
        ${snippet ? `<div class="dzs-fields">${snippet}</div>` : ''}
        <div class="dzs-actions">
          <button class="btn btn-gold btn-sm" style="flex:1" onclick="dzsReprint(${doc.id})"
            title="${lbl('إعادة توليد وطباعة','Régénérer & imprimer')}">🖨️ ${lbl('إعادة طباعة','Réimprimer')}</button>
          <button class="btn btn-ghost btn-sm" style="flex:1" onclick="dzsReopen(${doc.id})"
            title="${lbl('فتح النموذج مع البيانات السابقة','Rouvrir avec données')}">✏️ ${lbl('تعديل','Modifier')}</button>
          <button class="btn btn-red btn-sm" onclick="dzsDelete(${doc.id})" title="${lbl('حذف','Supprimer')}">🗑️</button>
        </div>
      </div>`;
    }).join('')}
  </div>
`}
  `);
};

// ── دوال سجل الوثائق ──

window.dzsDelete = function(id) {
  if (!confirm(_L ? _L('حذف هذه الوثيقة من السجل؟','Supprimer ce document du registre ?') : 'Supprimer ?')) return;
  const docs = (DB.get('dz_generated_docs') || []).filter(d => d.id !== id);
  DB.set('dz_generated_docs', docs);
  App.navigate('dz_saved');
};

window.dzsClearAll = function() {
  const msg = typeof L === 'function'
    ? L('مسح جميع الوثائق المحفوظة؟ لا يمكن التراجع.','Effacer tout l\'historique ? Irréversible.')
    : 'Effacer tout ?';
  if (!confirm(msg)) return;
  const tid = Auth.getUser()?.tenant_id;
  const remaining = (DB.get('dz_generated_docs')||[]).filter(d=>d.tenant_id!==tid);
  DB.set('dz_generated_docs', remaining);
  App.navigate('dz_saved');
};

// إعادة فتح النموذج مع ملء الحقول بالبيانات المحفوظة
window.dzsReopen = function(id) {
  const doc = (DB.get('dz_generated_docs')||[]).find(d=>d.id===id);
  if (!doc || !doc.doc_type) return;
  DZDocsUI.open(doc.doc_type);
  setTimeout(() => {
    const fields = doc.fields || {};
    Object.keys(fields).forEach(fid => {
      const el = document.getElementById(fid);
      if (el && fields[fid]) el.value = fields[fid];
    });
  }, 150);
};

// إعادة توليد وطباعة مباشرة (فتح النموذج ثم ضغط توليد تلقائياً)
window.dzsReprint = function(id) {
  const doc = (DB.get('dz_generated_docs')||[]).find(d=>d.id===id);
  if (!doc || !doc.doc_type) return;
  DZDocsUI.open(doc.doc_type);
  setTimeout(() => {
    // ملء الحقول
    const fields = doc.fields || {};
    Object.keys(fields).forEach(fid => {
      const el = document.getElementById(fid);
      if (el && fields[fid]) el.value = fields[fid];
    });
    // ثم نضغط زر التوليد تلقائياً
    setTimeout(() => {
      const btn = document.getElementById('dzdGenerateBtn');
      if (btn) btn.click();
    }, 120);
  }, 180);
};
