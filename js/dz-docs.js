/* ════════════════════════════════════════════════════════════════════
   SmartStruct v7.3 — وحدة الوثائق الإدارية والمالية الجزائرية
   ════════════════════════════════════════════════════════════════════
   DZDocs : مولد احترافي لـ 20+ وثيقة قانونية ومالية حسب التشريع الجزائري
   
   📚 الأقسام:
   ① الوثائق التجارية (Pre-Contract)
      • Facture Proforma  — الفاتورة الشكلية
      • Devis Estimatif   — الكشف الكمي والتقديري
      • BPU              — جدول الأسعار الوحدويّة
      • Offre de Service  — عرض الخدمة
      
   ② وثائق الميدان (Execution)
      • PV d'ouverture    — محضر بدء الأشغال
      • Attachement       — كشف المرفقات
      • Journal de Chantier — يوميات الورشة
      • PV de Réception   — محضر الاستلام (مؤقت/نهائي)
      
   ③ النظام المالي (Billing)
      • Facture d'Acompte — فاتورة التسبيق
      • Situation de Travaux — كشف الأشغال
      • Facture Définitive — الفاتورة النهائية
      • Quittance de Paiement — وصل التسديد
      
   ④ الموارد البشرية (HR)
      • Fiche de Paie     — كشف الراتب
      • Contrat CDD/CTA   — عقود العمل
      • Fiche de Pointage — بطاقة الحضور
      • Attestation de Travail — شهادة العمل
      
   ⑤ اللوجستيك (Logistics)
      • Bon de Commande   — وصل الطلب
      • Bon de Réception  — وصل الاستلام
      • Bon de Sortie     — وصل الخروج
      • Fiche de Suivi    — بطاقة تتبع العتاد
      
   جميع الوثائق:
   ✅ تحوي الترويسة القانونية الإلزامية تلقائياً (RC, NIF, NIS, Article, RIB)
   ✅ متوافقة مع الطباعة وتصدير PDF (Save as PDF)
   ✅ ثنائية اللغة (عربي / فرنسي)
   ✅ تستخدم بيانات المؤسسة والمشاريع الفعلية
   ════════════════════════════════════════════════════════════════════ */

(function() {
'use strict';

if (typeof Auth === 'undefined' || typeof DB === 'undefined') {
  console.warn('[DZDocs] Auth/DB not yet available, deferring initialization');
}

// ════════════════════════════════════════════════════════════════════
//  Helpers مشتركة
// ════════════════════════════════════════════════════════════════════
function _esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function _fmt(n) {
  return Number(n || 0).toLocaleString('fr-DZ');
}

function _fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return _esc(d);
    return dt.toLocaleDateString('fr-DZ', { year:'numeric', month:'2-digit', day:'2-digit' });
  } catch(e) { return _esc(d); }
}

// ── اختيار الاسم المناسب حسب لغة الوثيقة ──
function _localName(obj, nameField) {
  if (!obj) return '—';
  const isAr = _docLang === 'ar';
  const frField = (nameField || 'name') + '_fr';
  const arField = nameField || 'name';
  if (isAr) return obj[arField] || obj[frField] || '—';
  return obj[frField] || obj[arField] || '—';
}

// ── اختيار اسم الشخص (full_name / full_name_fr) ──
function _localPerson(obj) {
  if (!obj) return '—';
  const isAr = _docLang === 'ar';
  if (isAr) return obj.full_name || obj.full_name_fr || obj.name || '—';
  return obj.full_name_fr || obj.full_name || obj.name_fr || obj.name || '—';
}

function _today() {
  return new Date().toLocaleDateString('fr-DZ');
}

function _todayISO() {
  return new Date().toISOString().split('T')[0];
}

// تحويل مبلغ إلى نص بالعربية والفرنسية (لمحاضر الاستلام والفواتير الرسمية)
function _amountInWords(amount, lang='ar') {
  const n = Math.round(Number(amount || 0));
  if (lang === 'fr') {
    return `(${n.toLocaleString('fr-DZ')} DA)`;
  }
  return `(${n.toLocaleString('fr-DZ')} دج)`;
}

// الحصول على شعار المؤسسة بأمان
function _getLogo() {
  try {
    if (typeof getTenantLogo === 'function') return getTenantLogo();
  } catch(e) {}
  const t = (typeof Auth !== 'undefined') ? Auth.getTenant() : null;
  return t?.logo_url || '';
}

// ════════════════════════════════════════════════════════════════════
//  CSS موحد لجميع وثائق DZDocs
// ════════════════════════════════════════════════════════════════════
const _SHARED_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
/* ════════════════════════════════════════════════════════════════════
   🖨️ ECO-PRINT v2 — تصميم اقتصادي ذكي يوفّر حبر الطابعة
   استراتيجية:
   • الأسود الكامل → رمادي داكن (3a3a3a) لتوفير ~30% حبر
   • الخلفيات الداكنة → أبيض مع حدود فقط
   • الألوان الكثيفة → تخفيف بنسبة 30-50%
   • الواترمارك → opacity 2 بالمئة فقط
   • النصوص الرئيسية → ر داكن بدلاً من الأسود الكامل
   • الحبر الذهبي → ذهبي مُخفّف بنسبة 25 بالمئة
   ════════════════════════════════════════════════════════════════════ */
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Cairo', 'Tajawal', 'Segoe UI', Arial, sans-serif;
  color: #3a3a3a; background: #fafafa; padding: 24px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.no-print {
  display: flex; gap: 10px; margin-bottom: 18px; justify-content: flex-start; flex-wrap: wrap;
}
.btn-print {
  padding: 9px 22px; background: #B8902F; color: #fff;
  border: none; border-radius: 6px; cursor: pointer;
  font-family: inherit; font-size: 13px; font-weight: 700;
}
.btn-print:hover { background: #a07d28; }
.btn-close {
  padding: 9px 18px; background: #fff; color: #666;
  border: 1px solid #ccc; border-radius: 6px; cursor: pointer;
  font-family: inherit; font-size: 13px;
}
.btn-close:hover { background: #f5f5f5; }
.page {
  background: #fff; max-width: 820px; margin: 0 auto;
  border: 1px solid #e5e5e5;
  box-shadow: 0 2px 8px rgba(0,0,0,.04);
}

/* ═════════ Header — حدود رفيعة بدلاً من خلفية داكنة ═════════ */
.dz-header {
  background: #fff; padding: 18px 28px;
  display: flex; justify-content: space-between; align-items: center; gap: 20px;
  border-bottom: 2px solid #B8902F;
}
.dz-brand { display: flex; align-items: center; gap: 14px; flex: 1; }
.dz-brand img {
  height: 60px; max-width: 130px; object-fit: contain;
  border: 1px solid #e5e5e5; padding: 3px; background: #fff;
}
.dz-brand-text .name {
  font-size: 17px; font-weight: 800; color: #B8902F;
  letter-spacing: .2px;
}
.dz-brand-text .legal {
  font-size: 9.5px; color: #777; margin-top: 4px; line-height: 1.7;
}
.dz-doc-title {
  text-align: left; border-right: 2px solid #B8902F; padding-right: 16px;
}
.dz-doc-title .label {
  font-size: 19px; font-weight: 800; color: #3a3a3a;
  letter-spacing: 1.2px; text-transform: uppercase;
}
.dz-doc-title .num {
  font-size: 11px; color: #B8902F; font-weight: 700; margin-top: 4px;
  font-family: 'JetBrains Mono', monospace;
}
.dz-doc-title .date { font-size: 10px; color: #999; margin-top: 2px; }
.gold-bar { height: 1px; background: #B8902F; }

/* ═════════ Sections ═════════ */
.section { padding: 14px 28px; border-bottom: 1px solid #f0f0f0; }
.section:last-child { border-bottom: none; }
.section-title {
  font-size: 10.5px; font-weight: 700; color: #B8902F;
  text-transform: uppercase; letter-spacing: .7px; margin-bottom: 8px;
  padding-bottom: 4px; border-bottom: 1px dashed #d8d8d8;
}
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.info-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.info-block {
  background: #fff; padding: 10px 12px;
  border: 1px solid #e5e5e5; border-right: 2px solid #B8902F;
  border-radius: 4px;
}
.info-block h4 {
  font-size: 10px; color: #999; font-weight: 700;
  margin-bottom: 5px; text-transform: uppercase; letter-spacing: .3px;
}
.info-block p {
  font-size: 12px; line-height: 1.7; color: #444; margin: 1px 0;
}
.info-block strong { color: #3a3a3a; font-weight: 700; }

/* ═════════ Tables — أنيقة وخفيفة (بدون خلفيات داكنة) ═════════ */
table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin: 8px 0; }
thead th {
  background: #fafafa;
  color: #3a3a3a;
  padding: 8px 10px; text-align: right;
  font-size: 10px; font-weight: 700; letter-spacing: .3px;
  border-bottom: 2px solid #B8902F;
  border-top: 1px solid #e5e5e5;
  text-transform: uppercase;
}
thead th:last-child, thead th.td-right { text-align: left; }
tbody td {
  padding: 8px 10px; border-bottom: 1px solid #f0f0f0;
  color: #444; vertical-align: top;
}
tbody tr:last-child td { border-bottom: 1px solid #e5e5e5; }
tbody tr:nth-child(even) td { background: #fcfcfc; }
.td-right { text-align: left; font-variant-numeric: tabular-nums; }
.td-center { text-align: center; }
.td-num { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #3a3a3a; }

/* ═════════ Totals — حدود فقط ═════════ */
.totals-section { display: flex; justify-content: flex-end; padding: 14px 28px; border-top: 1px solid #e5e5e5; }
.totals-box { width: 320px; }
.total-row {
  display: flex; justify-content: space-between;
  padding: 5px 4px; font-size: 12px; color: #666;
  border-bottom: 1px solid #f4f4f4;
}
.total-row:last-child { border: none; }
.total-final {
  display: flex; justify-content: space-between;
  margin-top: 6px; padding: 10px 14px;
  background: #fff;
  border: 2px solid #B8902F; border-radius: 4px;
  font-size: 13.5px; font-weight: 800; color: #B8902F;
}

/* ═════════ Signatures ═════════ */
.signatures { display: flex; justify-content: space-between; gap: 24px; padding: 24px 28px 14px; }
.sig-block { flex: 1; text-align: center; }
.sig-block .role {
  font-size: 10.5px; color: #888; margin-bottom: 45px;
  font-weight: 700; text-transform: uppercase; letter-spacing: .3px;
}
.sig-block .line {
  border-top: 1px solid #999; padding-top: 5px;
  font-size: 10px; color: #666;
}
.stamp-zone {
  border: 1.5px dashed #B8902F; border-radius: 4px;
  padding: 18px 12px; min-height: 70px;
  text-align: center; color: #B8902F;
  font-size: 9.5px; font-weight: 700; letter-spacing: .4px;
}

/* ═════════ Footer — خفيف ═════════ */
.dz-footer {
  background: #fafafa; padding: 8px 28px;
  display: flex; justify-content: space-between; align-items: center;
  border-top: 1px solid #e5e5e5;
}
.dz-footer span { font-size: 9.5px; color: #999; }
.dz-footer .gold-text { color: #B8902F; font-weight: 600; }

/* ═════════ Articles ═════════ */
.article { padding: 10px 28px; }
.article h3 {
  font-size: 12.5px; color: #3a3a3a; font-weight: 800;
  margin-bottom: 5px; padding-bottom: 3px;
  border-bottom: 1.5px solid #B8902F; display: inline-block;
}
.article p { font-size: 11.5px; line-height: 1.85; color: #444; text-align: justify; }

/* ═════════ Big amount — بحدود بدلاً من خلفية ═════════ */
.big-amount {
  font-size: 24px; font-weight: 800; color: #B8902F;
  text-align: center; padding: 14px;
  background: #fff;
  border: 2px solid #B8902F; border-radius: 4px;
  letter-spacing: .8px; margin: 14px 28px;
}

/* ═════════ Notes ═════════ */
.notes-block {
  margin: 8px 28px; padding: 8px 12px;
  background: #fff; border: 1px solid #e5e5e5;
  border-left: 3px solid #B8902F; border-radius: 0 4px 4px 0;
  font-size: 11px; color: #555; line-height: 1.7;
}

/* ═════════ Watermark — opacity منخفض جداً لتوفير الحبر ═════════ */
.watermark {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-50%) rotate(-30deg);
  font-size: 90px; font-weight: 900; color: #B8902F;
  opacity: .025; pointer-events: none; z-index: 0;
  letter-spacing: 6px;
}
.page { position: relative; }
.page > * { position: relative; z-index: 1; }

/* ═════════ République ═════════ */
.republique {
  text-align: center; padding: 10px 28px 0;
  font-size: 10.5px; color: #666; line-height: 1.5; font-weight: 600;
}
.republique .ar { font-size: 12px; color: #3a3a3a; font-weight: 700; }

/* ═════════ Status badges — بدون خلفيات ملوّنة ═════════ */
.status-success { color: #2a8055 !important; border: 1px solid #2a8055 !important; background: #fff !important; padding: 2px 8px; border-radius: 10px; font-weight: 700; font-size: 10px; }
.status-warning { color: #B8902F !important; border: 1px solid #B8902F !important; background: #fff !important; padding: 2px 8px; border-radius: 10px; font-weight: 700; font-size: 10px; }
.status-danger  { color: #a32d3d !important; border: 1px solid #a32d3d !important; background: #fff !important; padding: 2px 8px; border-radius: 10px; font-weight: 700; font-size: 10px; }

/* ═════════ Print Optimizations ═════════ */
@media print {
  body { background: #fff !important; padding: 0; color: #3a3a3a !important; }
  .no-print { display: none !important; }
  .page { box-shadow: none; border: none; max-width: 100%; }
  @page { size: A4; margin: 1cm; }
  /* تجنب كسر الجداول عبر الصفحات */
  table { page-break-inside: avoid; }
  tr { page-break-inside: avoid; }
  .signatures { page-break-inside: avoid; }
  /* تخفيف إضافي للطباعة */
  tbody tr:nth-child(even) td { background: #fafafa !important; }
  /* الحبر الأسود الكامل ممنوع — يستخدم الـ Composite بدلاً من Pure Black */
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
`;

// ════════════════════════════════════════════════════════════════════
//  بناء الترويسة القانونية الموحدة
// ════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════
//  نظام الترجمة للوثائق — يدعم عربي كامل وفرنسي كامل
// ════════════════════════════════════════════════════════════════════
let _docLang = 'fr'; // اللغة الافتراضية fr أو ar

function _L(fr, ar) {
  return _docLang === 'ar' ? ar : fr;
}

const _TERMS = {
  'PROFORMA':      { fr:'FACTURE PROFORMA',                     ar:'فاتورة شكلية' },
  'DEVIS':         { fr:'DEVIS ESTIMATIF',                      ar:'كشف تقديري' },
  'BPU':           { fr:'BORDEREAU DES PRIX UNITAIRES',         ar:'جدول الأسعار الوحدوية' },
  'OFFRE':         { fr:'OFFRE DE SERVICE',                     ar:'عرض خدمة' },
  'PV_OUVERTURE':  { fr:"PV D'OUVERTURE DES TRAVAUX",           ar:'محضر بدء الأشغال' },
  'ATTACHEMENT':   { fr:'ATTACHEMENT',                          ar:'كشف المرفقات' },
  'JOURNAL':       { fr:'JOURNAL DE CHANTIER',                  ar:'يومية الورشة' },
  'PV_PROV':       { fr:'PV DE RÉCEPTION PROVISOIRE',           ar:'محضر الاستلام المؤقت' },
  'PV_DEF':        { fr:'PV DE RÉCEPTION DÉFINITIVE',           ar:'محضر الاستلام النهائي' },
  'ACOMPTE':       { fr:"FACTURE D'ACOMPTE",                    ar:'فاتورة تسبيق' },
  'SITUATION':     { fr:'SITUATION DE TRAVAUX',                 ar:'كشف الأشغال' },
  'FACTURE_DEF':   { fr:'FACTURE DÉFINITIVE',                   ar:'فاتورة نهائية' },
  'QUITTANCE':     { fr:'QUITTANCE DE PAIEMENT',                ar:'وصل التسديد' },
  'FICHE_PAIE':    { fr:'BULLETIN DE PAIE',                     ar:'كشف الراتب' },
  'CONTRAT':       { fr:'CONTRAT DE TRAVAIL',                   ar:'عقد عمل' },
  'POINTAGE':      { fr:'FICHE DE POINTAGE',                    ar:'بطاقة الحضور' },
  'ATTESTATION':   { fr:'ATTESTATION DE TRAVAIL',               ar:'شهادة عمل' },
  'BON_CMD':       { fr:'BON DE COMMANDE',                      ar:'وصل الطلب' },
  'BON_REC':       { fr:'BON DE RÉCEPTION',                     ar:'وصل الاستلام' },
  'BON_SORTIE':    { fr:'BON DE SORTIE',                        ar:'وصل الخروج' },
  'FICHE_SUIVI':   { fr:'FICHE DE SUIVI ÉQUIPEMENT',            ar:'بطاقة تتبع المعدة' },
  'client':        { fr:'Client',             ar:'العميل' },
  'details':       { fr:'Détails',            ar:'التفاصيل' },
  'designation':   { fr:'Désignation',        ar:'التعيين' },
  'qty':           { fr:'Qté',                ar:'الكمية' },
  'unit':          { fr:'Unité',              ar:'الوحدة' },
  'pu':            { fr:'P.U. (DA)',           ar:'س.و. (دج)' },
  'total_col':     { fr:'Total (DA)',          ar:'المجموع (دج)' },
  'total_ht':      { fr:'Sous-total HT',      ar:'المجموع ق.ض.' },
  'tva':           { fr:'TVA',                ar:'TVA' },
  'total_ttc':     { fr:'TOTAL TTC',          ar:'المجموع الإجمالي' },
  'signature':     { fr:'Signature',          ar:'التوقيع' },
  'stamp':         { fr:'Cachet',             ar:'الختم' },
  'maitre':        { fr:"Maître d'ouvrage",   ar:'صاحب المشروع' },
  'entreprise_lbl':{ fr:'Entreprise',         ar:'المقاول' },
  'date_lbl':      { fr:'Date',               ar:'التاريخ' },
  'project_lbl':   { fr:'Chantier / Projet',  ar:'المشروع / الورشة' },
  'ref_lbl':       { fr:'Réf.',               ar:'المرجع' },
  'worker_lbl':    { fr:'Ouvrier',            ar:'العامل' },
  'role_lbl':      { fr:'Poste',              ar:'المنصب' },
  'period_lbl':    { fr:'Période',            ar:'الفترة' },
  'brut_lbl':      { fr:'Salaire Brut',       ar:'الراتب الإجمالي' },
  'net_lbl':       { fr:'Net à Payer',        ar:'صافي الراتب' },
  'note_lbl':      { fr:'Observation',        ar:'ملاحظة' },
  'visa_lbl':      { fr:'Bon pour accord',    ar:'موافقة / مصادقة' },
  'print_btn':     { fr:'Imprimer / Enregistrer PDF', ar:'طباعة / حفظ PDF' },
  'save_btn':      { fr:'Enregistrer sur PC', ar:'حفظ على الحاسوب' },
  'close_btn':     { fr:'Fermer',             ar:'إغلاق' },
  'lang_badge_fr': { fr:'🌐 Langue : Français',  ar:'🌐 Langue : Français' },
  'lang_badge_ar': { fr:'🌐 لغة الوثيقة: العربية', ar:'🌐 لغة الوثيقة: العربية' },
  'switch_to_ar':  { fr:'🇩🇿 التبديل للعربية',   ar:'🇩🇿 التبديل للعربية' },
  'switch_to_fr':  { fr:'🇫🇷 Passer en Français', ar:'🇫🇷 Passer en Français' },
  'footer_brand':  { fr:'SmartStruct — Plateforme gestion chantiers BTP', ar:'SmartStruct — منصة إدارة مشاريع المقاولة' },
  'important_note_fr': { fr:'⚠️ Note importante :', ar:'⚠️ ملاحظة مهمة:' },
  'proforma_note': {
    fr: "Cette facture proforma est non-définitive et n'a aucune valeur fiscale. Elle est destinée uniquement à informer le client des prix proposés.",
    ar: 'هذه فاتورة شكلية غير ملزمة وليس لها قيمة جبائية. تُستخدم لإطلاع العميل على الأسعار المقترحة فقط.'
  },
};

function _T(key) {
  const e = _TERMS[key];
  if (!e) return key;
  return _docLang === 'ar' ? e.ar : e.fr;
}

function _buildHeader(tenant, docLabelOrKey, docNumber, docDate) {
  const logo  = _getLogo();
  const isAr  = _docLang === 'ar';
  const docLabel = _TERMS[docLabelOrKey]
    ? _T(docLabelOrKey)
    : (docLabelOrKey || '');
  const artLbl = isAr ? 'رقم المادة' : "Art. d'imp.";

  // ✅ اسم المؤسسة حسب لغة الوثيقة
  const tenantName = isAr
    ? (tenant?.name || tenant?.name_fr || 'مؤسستي')
    : (tenant?.name_fr || tenant?.name || 'Mon Entreprise');

  const lines = [];
  if (tenant?.rc_number)   lines.push(`RC: ${_esc(tenant.rc_number)}`);
  if (tenant?.nif)         lines.push(`NIF: ${_esc(tenant.nif)}`);
  if (tenant?.nis)         lines.push(`NIS: ${_esc(tenant.nis)}`);
  if (tenant?.article_imp) lines.push(`${artLbl}: ${_esc(tenant.article_imp)}`);
  if (tenant?.address)     lines.push(`📍 ${_esc(tenant.address)}${tenant?.wilaya ? ', ' + _esc(tenant.wilaya) : ''}`);
  if (tenant?.phone)       lines.push(`📞 ${_esc(tenant.phone)}`);
  if (tenant?.rib)         lines.push(`RIB: ${_esc(tenant.rib)}`);

  return `
<div class="dz-header" style="direction:${isAr?'rtl':'ltr'}">
  <div class="dz-brand">
    ${logo ? `<img src="${_esc(logo)}" alt="Logo">` : ''}
    <div class="dz-brand-text">
      <div class="name">▦ ${_esc(tenantName)}</div>
      <div class="legal">${lines.join('<br>')}</div>
    </div>
  </div>
  <div class="dz-doc-title">
    <div class="label">${_esc(docLabel)}</div>
    ${docNumber ? `<div class="num">N° ${_esc(docNumber)}</div>` : ''}
    <div class="date">${_esc(docDate || _today())}</div>
  </div>
</div>
<div class="gold-bar"></div>`;
}

// ════════════════════════════════════════════════════════════════════
//  Footer مشترك
// ════════════════════════════════════════════════════════════════════
function _buildFooter(docNumber) {
  return `
<div class="dz-footer">
  <span>${_T('footer_brand')}</span>
  <span class="gold-text">${_esc(docNumber || '')} | ${_today()}</span>
</div>`;
}

// ════════════════════════════════════════════════════════════════════
//  فتح نافذة الطباعة + دعم تبديل اللغة
// ════════════════════════════════════════════════════════════════════
function _openPrint(html, filename, autoPrint=false) {
  const win = window.open('', '_blank', 'width=920,height=1100');
  if (!win) {
    if (typeof Toast !== 'undefined') Toast.error(_L('Autorisez les popups dans le navigateur','السماح بالنوافذ المنبثقة مطلوب'));
    else alert(_L('Autorisez les popups','السماح بالنوافذ المنبثقة مطلوب'));
    return null;
  }
  win.document.write(html);
  win.document.close();
  if (filename) win.document.title = filename;
  if (autoPrint) {
    const doPrint = () => { try { win.focus(); win.print(); } catch(e) { console.error(e); } };
    win.addEventListener('load', () => setTimeout(doPrint, 700));
    if (win.document.readyState === 'complete') setTimeout(doPrint, 700);
  }
  return win;
}

// ════════════════════════════════════════════════════════════════════
//  Wrapper HTML (template أساسي مشترك)
// ════════════════════════════════════════════════════════════════════
function _wrap(title, bodyHtml, watermarkText) {
  const isAr = _docLang === 'ar';
  const btnPrint  = _T('print_btn');
  const btnSave   = _T('save_btn');
  const btnClose  = _T('close_btn');
  const langBadge = isAr ? _T('lang_badge_ar') : _T('lang_badge_fr');
  const switchBtn = isAr ? _T('switch_to_fr')  : _T('switch_to_ar');
  const switchTitle = isAr ? 'Passer en Français' : 'التبديل للعربية';

  return `<!DOCTYPE html>
<html dir="${isAr?'rtl':'ltr'}" lang="${isAr?'ar':'fr'}">
<head>
<meta charset="UTF-8">
<title>${_esc(title)}</title>
<style>${_SHARED_CSS}
.btn-lang{padding:9px 16px;background:#fff;color:#B8902F;border:1.5px solid #B8902F;border-radius:6px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700}
.btn-lang:hover{background:#B8902F;color:#fff}
.lang-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;background:rgba(184,144,47,.08);border:1px solid rgba(184,144,47,.25);border-radius:6px;padding:5px 10px;color:#B8902F;font-weight:700}
</style>
</head>
<body>
<div class="no-print" style="align-items:center">
  <button class="btn-print" onclick="window.print()">🖨️ ${btnPrint}</button>
  <button class="btn-print" style="background:#34C38F" onclick="(function(){
    const html=document.documentElement.outerHTML;
    const blob=new Blob([html],{type:'text/html;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=${JSON.stringify(title)}+'.html';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  })()">💾 ${btnSave}</button>
  <span class="lang-badge">${langBadge}</span>
  <button class="btn-lang" title="${_esc(switchTitle)}" onclick="(function(){
    const newLang = '${isAr?'fr':'ar'}';
    if(window.opener&&!window.opener.closed){
      window.opener.postMessage({type:'rebuildDoc',lang:newLang},'*');
      window.close();
    } else {
      alert(isAr ? 'أعِد فتح الوثيقة من التطبيق لتغيير اللغة' : 'Rouvrez le document depuis l\'application');
    }
  })()">${switchBtn}</button>
  <button class="btn-close" onclick="window.close()">✕ ${btnClose}</button>
</div>
<div class="page">
  ${watermarkText ? `<div class="watermark">${_esc(watermarkText)}</div>` : ''}
  ${bodyHtml}
</div>
</body>
</html>`;
}

// ════════════════════════════════════════════════════════════════════
//  La République header (للوثائق الرسمية كالعقود والمحاضر)
// ════════════════════════════════════════════════════════════════════
const _REPUBLIQUE = `
<div class="republique">
  <div class="ar">الجمهورية الجزائرية الديمقراطية الشعبية</div>
  <div>République Algérienne Démocratique et Populaire</div>
</div>`;

// ════════════════════════════════════════════════════════════════════
//  ★ الوحدة الرئيسية : DZDocs
// ════════════════════════════════════════════════════════════════════
window.DZDocs = {

  // ─── إعداد لغة الوثيقة ───
  _setLang(lang) {
    _docLang = (lang === 'ar') ? 'ar' : 'fr';
    // احفظ في localStorage
    try { localStorage.setItem('sbtp_doc_lang', _docLang); } catch(_) {}
  },
  _getLang() { return _docLang; },

  /* ════════════════════════════════════════════════════
     ① الوثائق التجارية (Pre-Contract)
     ════════════════════════════════════════════════════ */

  // 1.1 Facture Proforma — الفاتورة الشكلية
  factureProforma(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `PRO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const items  = opts.items || [];
    const ttc    = items.reduce((s,it) => s + Number(it.total || 0), 0);
    const tvaRate= Number(opts.tvaRate ?? tenant.tva_rate ?? 19);
    const ht     = Math.round(ttc / (1 + tvaRate/100));
    const tva    = ttc - ht;

    const body = `
${_buildHeader(tenant, _T('PROFORMA'), num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid">
    <div class="info-block">
      <h4>👤 Client / العميل</h4>
      <p><strong>${_esc(_localName({name:opts.clientName,name_fr:opts.clientNameFr},'name') || opts.clientName || '—')}</strong></p>
      ${opts.clientAddress ? `<p>📍 ${_esc(opts.clientAddress)}</p>` : ''}
      ${opts.clientPhone   ? `<p>📞 ${_esc(opts.clientPhone)}</p>` : ''}
      ${opts.clientNif     ? `<p>NIF: ${_esc(opts.clientNif)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>📋 Détails / التفاصيل</h4>
      <p><strong>Objet:</strong> ${_esc(opts.subject || 'Devis travaux BTP')}</p>
      <p><strong>Validité:</strong> ${_esc(opts.validity || '30 jours / 30 يوم')}</p>
      <p><strong>Délai:</strong> ${_esc(opts.delay || '—')}</p>
      <p><strong>Modalités:</strong> ${_esc(opts.payTerms || '50% à la commande / 50% à la livraison')}</p>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">📋 Détail des prestations / تفاصيل الخدمات</div>
  <table>
    <thead><tr>
      <th style="width:40px">N°</th>
      <th>${_T('designation')}</th>
      <th class="td-center" style="width:60px">U.</th>
      <th class="td-center" style="width:70px">Qté</th>
      <th class="td-right" style="width:110px">P.U. (DA)</th>
      <th class="td-right" style="width:130px">Total (DA)</th>
    </tr></thead>
    <tbody>
      ${items.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#999;padding:24px">Aucune ligne ajoutée</td></tr>' :
        items.map((it,i) => `<tr>
          <td class="td-center">${i+1}</td>
          <td>${_esc(it.desc || '—')}</td>
          <td class="td-center">${_esc(it.unit || '—')}</td>
          <td class="td-center td-num">${_esc(it.qty ?? 1)}</td>
          <td class="td-right td-num">${_fmt(it.price || 0)}</td>
          <td class="td-right td-num"><strong>${_fmt(it.total || 0)}</strong></td>
        </tr>`).join('')}
    </tbody>
  </table>
</div>

<div class="totals-section">
  <div class="totals-box">
    <div class="total-row"><span>${_T('total_ht')}</span><span class="td-num">${_fmt(ht)} DA</span></div>
    <div class="total-row"><span>TVA ${tvaRate}%</span><span class="td-num">${_fmt(tva)} DA</span></div>
    <div class="total-final"><span>${_T('total_ttc')}</span><span class="td-num">${_fmt(ttc)} DA</span></div>
  </div>
</div>

<div class="notes-block">
  <strong>⚠️ Mention importante :</strong> Cette facture proforma est non-définitive et n'a aucune valeur fiscale.
  Elle est destinée uniquement à informer le client des prix proposés.<br>
  <strong>⚠️ ملاحظة:</strong> هذه فاتورة شكلية غير ملزمة وليس لها قيمة جبائية. تُستخدم لإطلاع العميل على الأسعار المقترحة فقط.
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">Le Client / العميل</div>
    <div class="line">Signature et cachet</div>
  </div>
  <div class="sig-block">
    <div class="role">Le Prestataire / المؤسسة</div>
    <div class="stamp-zone">CACHET<br>ET SIGNATURE</div>
  </div>
</div>

${_buildFooter(num)}
`;
    const html = _wrap(`Proforma_${num}`, body, 'PROFORMA');
    _openPrint(html, `Proforma_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'proforma', number: num });
  },

  // 1.2 Devis Estimatif — الكشف الكمي والتقديري
  devisEstimatif(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `DEV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const lots   = opts.lots || [];
    const ttc    = lots.reduce((s,lot) => s + (lot.items || []).reduce((ss,it) => ss + Number(it.total || 0), 0), 0);
    const tvaRate= Number(opts.tvaRate ?? tenant.tva_rate ?? 19);
    const ht     = Math.round(ttc / (1 + tvaRate/100));
    const tva    = ttc - ht;
    const project= opts.project || {};

    const body = `
${_buildHeader(tenant, _T('DEVIS'), num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid">
    <div class="info-block">
      <h4>🏗️ Projet / المشروع</h4>
      <p><strong>${_esc(project.name || opts.projectName || '—')}</strong></p>
      ${project.location ? `<p>📍 ${_esc(project.location)}</p>` : ''}
      ${opts.maitreOuvrage ? `<p><strong>Maître d'ouvrage:</strong> ${_esc(opts.maitreOuvrage)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>📋 Cadre / الإطار</h4>
      <p><strong>Objet:</strong> ${_esc(opts.subject || 'Travaux de bâtiment')}</p>
      <p><strong>Délai d'exécution:</strong> ${_esc(opts.delay || '—')}</p>
      <p><strong>Validité:</strong> ${_esc(opts.validity || '90 jours')}</p>
    </div>
  </div>
</div>

${lots.length === 0 ? `<div class="section"><p style="color:#999;text-align:center;padding:24px">Aucun lot ajouté</p></div>` :
lots.map((lot, lotIdx) => `
<div class="section">
  <div class="section-title">LOT ${lotIdx+1} — ${_esc(lot.name || '—').toUpperCase()}</div>
  <table>
    <thead><tr>
      <th style="width:40px">N°</th>
      <th>${_T('designation')}</th>
      <th class="td-center" style="width:55px">U.</th>
      <th class="td-center" style="width:70px">Qté</th>
      <th class="td-right" style="width:110px">P.U. (DA)</th>
      <th class="td-right" style="width:130px">Montant (DA)</th>
    </tr></thead>
    <tbody>
      ${(lot.items || []).map((it, i) => `<tr>
        <td class="td-center">${lotIdx+1}.${i+1}</td>
        <td>${_esc(it.desc || '—')}</td>
        <td class="td-center">${_esc(it.unit || '—')}</td>
        <td class="td-center td-num">${_esc(it.qty ?? 1)}</td>
        <td class="td-right td-num">${_fmt(it.price || 0)}</td>
        <td class="td-right td-num"><strong>${_fmt(it.total || 0)}</strong></td>
      </tr>`).join('')}
      <tr style="background:#fff !important; border-top:1.5px solid #B8902F !important">
        <td colspan="5" style="text-align:left;font-weight:900;color:#B8902F">Sous-total LOT ${lotIdx+1}</td>
        <td class="td-right td-num" style="font-weight:900;color:#B8902F">
          ${_fmt((lot.items || []).reduce((s,it) => s + Number(it.total||0), 0))} DA
        </td>
      </tr>
    </tbody>
  </table>
</div>
`).join('')}

<div class="totals-section">
  <div class="totals-box">
    <div class="total-row"><span>${_T('total_ht')}</span><span class="td-num">${_fmt(ht)} DA</span></div>
    <div class="total-row"><span>TVA ${tvaRate}%</span><span class="td-num">${_fmt(tva)} DA</span></div>
    <div class="total-final"><span>TOTAL GÉNÉRAL TTC</span><span class="td-num">${_fmt(ttc)} DA</span></div>
  </div>
</div>

<div class="big-amount">
  Montant arrêté à la somme de : ${_fmt(ttc)} DA TTC
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">Le Soumissionnaire / المقاول</div>
    <div class="stamp-zone">CACHET<br>ET SIGNATURE</div>
  </div>
  <div class="sig-block">
    <div class="role">Lu et approuvé / قُرئ ووُوفِق عليه</div>
    <div class="line">Date et signature du client</div>
  </div>
</div>

${_buildFooter(num)}`;
    const html = _wrap(`Devis_${num}`, body, 'DEVIS');
    _openPrint(html, `Devis_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'devis', number: num });
  },

  // 1.3 Bordereau des Prix Unitaires (BPU)
  bpu(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `BPU-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const items  = opts.items || [];

    const body = `
${_buildHeader(tenant, _T('BPU'), num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid">
    <div class="info-block">
      <h4>📋 Référence / المرجع</h4>
      <p><strong>Marché:</strong> ${_esc(opts.marketRef || '—')}</p>
      <p><strong>Objet:</strong> ${_esc(opts.subject || 'Travaux BTP')}</p>
    </div>
    <div class="info-block">
      <h4>🏗️ Maître d'ouvrage</h4>
      <p><strong>${_esc(opts.maitreOuvrage || '—')}</strong></p>
      ${opts.maitreAddress ? `<p>📍 ${_esc(opts.maitreAddress)}</p>` : ''}
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">💰 Liste des prix unitaires / قائمة الأسعار الوحدويّة</div>
  <table>
    <thead><tr>
      <th style="width:50px">N°</th>
      <th>Désignation des ouvrages</th>
      <th class="td-center" style="width:70px">Unité</th>
      <th class="td-right" style="width:130px">Prix Unitaire HT (DA)</th>
    </tr></thead>
    <tbody>
      ${items.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#999;padding:24px">Aucune ligne ajoutée</td></tr>' :
        items.map((it,i) => `<tr>
          <td class="td-center"><strong>${_esc(it.code || (i+1))}</strong></td>
          <td>${_esc(it.desc || '—')}</td>
          <td class="td-center">${_esc(it.unit || '—')}</td>
          <td class="td-right td-num"><strong>${_fmt(it.price || 0)}</strong></td>
        </tr>`).join('')}
    </tbody>
  </table>
</div>

<div class="notes-block">
  <strong>📌 Note légale :</strong> Les prix indiqués au présent bordereau sont fermes et non révisables.
  Ils s'appliquent à toutes les quantités exécutées dans le cadre du marché, indépendamment de la quantité finale.<br>
  <strong>📌 ملاحظة قانونية:</strong> الأسعار المذكورة في هذا الجدول ثابتة وغير قابلة للمراجعة، وتطبق على جميع الكميات المنفذة في إطار الصفقة بغض النظر عن الكمية النهائية.
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">Le Soumissionnaire / المقاول</div>
    <div class="stamp-zone">CACHET<br>ET SIGNATURE</div>
  </div>
  <div class="sig-block">
    <div class="role">Lu et accepté / قُرئ ووُوفِق</div>
    <div class="line">Maître d'ouvrage</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`BPU_${num}`, body, 'BPU'), `BPU_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'bpu', number: num });
  },

  // 1.4 Offre de Service — عرض الخدمة
  offreService(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `OFF-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const refs   = opts.references || [];
    const team   = opts.team || [];
    const equip  = opts.equipment || [];

    const body = `
${_buildHeader(tenant, _T('OFFRE'), num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-block">
    <h4>📩 Destinataire</h4>
    <p><strong>${_esc(opts.recipient || '—')}</strong></p>
    ${opts.recipientAddress ? `<p>📍 ${_esc(opts.recipientAddress)}</p>` : ''}
  </div>
</div>

<div class="article">
  <h3>1. Présentation de l'entreprise / تقديم المؤسسة</h3>
  <p>${_esc(opts.presentation || `La société ${tenant.name || ''}, créée et active dans le secteur du BTP, met à votre disposition son expertise et son savoir-faire pour la réalisation de vos projets de construction et travaux publics. Forte de son équipe qualifiée et de son matériel performant, notre entreprise s'engage à fournir des prestations de qualité dans le respect des délais et des normes en vigueur.`)}</p>
</div>

<div class="article">
  <h3>2. Domaines d'intervention / مجالات النشاط</h3>
  <p>${_esc(opts.domains || 'Bâtiments tous corps d\'état (TCE), Travaux publics, Voirie et réseaux divers (VRD), Aménagement urbain, Réhabilitation et rénovation, Étude et réalisation.')}</p>
</div>

${refs.length > 0 ? `
<div class="section">
  <div class="section-title">📚 Références / السوابق المهنية</div>
  <table>
    <thead><tr>
      <th>Projet</th>
      <th>Maître d'ouvrage</th>
      <th class="td-center" style="width:90px">Année</th>
      <th class="td-right" style="width:130px">Montant (DA)</th>
    </tr></thead>
    <tbody>
      ${refs.map(r => `<tr>
        <td>${_esc(r.project || '—')}</td>
        <td>${_esc(r.client || '—')}</td>
        <td class="td-center">${_esc(r.year || '—')}</td>
        <td class="td-right td-num">${_fmt(r.amount || 0)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

${team.length > 0 ? `
<div class="section">
  <div class="section-title">👥 Moyens humains / الإمكانيات البشرية</div>
  <table>
    <thead><tr>
      <th>Fonction</th>
      <th class="td-center" style="width:80px">Effectif</th>
      <th>Qualification</th>
    </tr></thead>
    <tbody>
      ${team.map(t => `<tr>
        <td>${_esc(t.role || '—')}</td>
        <td class="td-center td-num">${_esc(t.count || 1)}</td>
        <td>${_esc(t.qualification || '—')}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

${equip.length > 0 ? `
<div class="section">
  <div class="section-title">🚜 Moyens matériels / الإمكانيات المادية</div>
  <table>
    <thead><tr>
      <th>Désignation</th>
      <th class="td-center" style="width:80px">Quantité</th>
      <th>Caractéristiques</th>
    </tr></thead>
    <tbody>
      ${equip.map(e => `<tr>
        <td>${_esc(e.name || '—')}</td>
        <td class="td-center td-num">${_esc(e.qty || 1)}</td>
        <td>${_esc(e.specs || '—')}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<div class="signatures">
  <div class="sig-block" style="flex:2">
    <div class="role">Le Gérant / المدير</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`Offre_${num}`, body), `Offre_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'offre_service', number: num });
  },

  /* ════════════════════════════════════════════════════
     ② وثائق الميدان (Execution Phase)
     ════════════════════════════════════════════════════ */

  // 2.1 PV d'ouverture de Chantier — محضر بدء الأشغال
  pvOuverture(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `PV-OUV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const project= opts.project || {};

    const body = `
${_REPUBLIQUE}
${_buildHeader(tenant, "PV D'OUVERTURE DE CHANTIER", num, _fmtDate(opts.date || _todayISO()))}

<div class="article">
  <p style="text-align:center;font-size:13px;font-weight:700">
    Procès-Verbal d'ouverture de chantier<br>
    <span style="color:#888;font-size:11px">محضر فتح وبدء أشغال ورشة</span>
  </p>
</div>

<div class="section">
  <div class="info-grid">
    <div class="info-block">
      <h4>🏗️ Projet</h4>
      <p><strong>${_esc(project.name || opts.projectName || '—')}</strong></p>
      ${project.location ? `<p>📍 ${_esc(project.location)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>👷 Maître d'ouvrage</h4>
      <p><strong>${_esc(opts.maitreOuvrage || '—')}</strong></p>
    </div>
  </div>
</div>

<div class="article">
  <h3>Procès-verbal</h3>
  <p>
    Le ${_fmtDate(opts.date || _todayISO())} à ${_esc(opts.hour || '09h00')}, sur le site du projet
    <strong>"${_esc(project.name || opts.projectName || '—')}"</strong> situé à
    <strong>${_esc(project.location || opts.location || '—')}</strong>,
    s'est tenue une réunion d'ouverture de chantier en présence de :
  </p>
  <ul style="font-size:12px;line-height:2;padding-right:24px;margin-top:8px">
    <li>👷 <strong>Le Maître d'ouvrage :</strong> ${_esc(opts.maitreOuvrage || '—')} ${opts.maitreRep ? `, représenté par ${_esc(opts.maitreRep)}` : ''}</li>
    <li>🏗️ <strong>L'Entreprise :</strong> ${_esc(tenant.name || '—')}, représentée par ${_esc(opts.entrepriseRep || 'son gérant')}</li>
    ${opts.bet ? `<li>📐 <strong>BET / Maître d'œuvre :</strong> ${_esc(opts.bet)}</li>` : ''}
    ${opts.controle ? `<li>🔍 <strong>Organisme de contrôle :</strong> ${_esc(opts.controle)}</li>` : ''}
  </ul>
</div>

<div class="article">
  <h3>Article 1 : Objet</h3>
  <p>La présente réunion a pour objet l'ouverture officielle du chantier relatif au marché
    <strong>${_esc(opts.marketRef || project.name || '—')}</strong>, et le démarrage effectif des travaux.</p>
</div>

<div class="article">
  <h3>Article 2 : Date de démarrage et délais</h3>
  <p>
    La date de démarrage effectif des travaux est fixée au <strong>${_fmtDate(opts.startDate || project.start_date || opts.date || _todayISO())}</strong>.<br>
    Le délai contractuel d'exécution est de <strong>${_esc(opts.delay || '—')}</strong>,
    soit jusqu'au <strong>${_fmtDate(opts.endDate || project.end_date || '—')}</strong>.
  </p>
</div>

<div class="article">
  <h3>Article 3 : Constatations</h3>
  <p>${_esc(opts.observations || `Le site est libre de toute entrave. L'entreprise dispose des autorisations nécessaires et des plans d'exécution. L'installation de chantier (clôture, panneau, bureau de chantier) sera mise en place dans un délai de 7 jours à compter de la date de la présente.`)}</p>
</div>

<div class="article">
  <h3>Article 4 : Décision</h3>
  <p>En foi de quoi, les parties soussignées <strong>déclarent ouvert le chantier</strong> à compter de ce jour,
    et le présent procès-verbal a été dressé pour servir et valoir ce que de droit.</p>
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">Maître d'ouvrage<br>صاحب المشروع</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
  <div class="sig-block">
    <div class="role">L'Entreprise<br>المقاول</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
  ${opts.bet ? `<div class="sig-block">
    <div class="role">BET / Maître d'œuvre</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>` : ''}
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`PV_Ouverture_${num}`, body), `PV_Ouverture_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'pv_ouverture', number: num });
  },

  // 2.2 Attachement — كشف المرفقات
  attachement(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `ATT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const items  = opts.items || [];
    const project= opts.project || {};
    const total  = items.reduce((s,it) => s + Number(it.totalAmount || 0), 0);

    const body = `
${_buildHeader(tenant, 'ATTACHEMENT N° ' + (opts.attNum || '01'), num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid-3">
    <div class="info-block">
      <h4>🏗️ Projet</h4>
      <p><strong>${_esc(project.name || opts.projectName || '—')}</strong></p>
      ${project.location ? `<p>📍 ${_esc(project.location)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>📅 Période</h4>
      <p><strong>Du:</strong> ${_fmtDate(opts.from || _todayISO())}</p>
      <p><strong>Au:</strong> ${_fmtDate(opts.to || _todayISO())}</p>
    </div>
    <div class="info-block">
      <h4>📋 Référence</h4>
      <p><strong>Marché:</strong> ${_esc(opts.marketRef || '—')}</p>
      <p><strong>N° Attach.:</strong> ${_esc(opts.attNum || '01')}</p>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">📐 Quantités exécutées / الكميات المنجزة</div>
  <table>
    <thead><tr>
      <th style="width:40px">N°</th>
      <th>Désignation</th>
      <th class="td-center" style="width:55px">U.</th>
      <th class="td-center" style="width:75px">Qté Marché</th>
      <th class="td-center" style="width:80px">Qté Exécutée</th>
      <th class="td-center" style="width:55px">% Avanc.</th>
      <th class="td-right" style="width:100px">P.U. (DA)</th>
      <th class="td-right" style="width:120px">Montant (DA)</th>
    </tr></thead>
    <tbody>
      ${items.length === 0 ? '<tr><td colspan="8" style="text-align:center;color:#999;padding:24px">Aucune ligne</td></tr>' :
        items.map((it,i) => {
          const qtyDone = Number(it.qtyDone || 0);
          const qtyMarket = Number(it.qtyMarket || 0);
          const pct = qtyMarket > 0 ? Math.round((qtyDone/qtyMarket)*100) : 0;
          const amount = qtyDone * Number(it.price || 0);
          return `<tr>
            <td class="td-center">${i+1}</td>
            <td>${_esc(it.desc || '—')}</td>
            <td class="td-center">${_esc(it.unit || '—')}</td>
            <td class="td-center td-num">${_fmt(qtyMarket)}</td>
            <td class="td-center td-num"><strong>${_fmt(qtyDone)}</strong></td>
            <td class="td-center"><span style="color:${pct>=100?'#2a8055':pct>=50?'#B8902F':'#a32d3d'};font-weight:700">${pct}%</span></td>
            <td class="td-right td-num">${_fmt(it.price || 0)}</td>
            <td class="td-right td-num"><strong>${_fmt(amount)}</strong></td>
          </tr>`;
        }).join('')}
      ${items.length > 0 ? `<tr style="background:#fafafa !important">
        <td colspan="7" style="text-align:left;font-weight:900;color:#B8902F;padding:12px;border-top:2px solid #B8902F">TOTAL EXÉCUTÉ HT</td>
        <td class="td-right td-num" style="font-weight:900;color:#B8902F;padding:12px;border-top:2px solid #B8902F">${_fmt(total)} DA</td>
      </tr>` : ''}
    </tbody>
  </table>
</div>

<div class="notes-block">
  <strong>📋 Constatation conjointe / مُعاينة مشتركة:</strong> Les quantités ci-dessus ont été constatées
  contradictoirement entre le maître d'ouvrage et l'entreprise sur site, le ${_fmtDate(opts.date || _todayISO())}.
  Cet attachement servira de base à l'établissement de la situation de travaux N° ${_esc(opts.attNum || '01')}.
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">L'Entreprise<br>المقاول</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
  <div class="sig-block">
    <div class="role">Maître d'œuvre<br>المهندس المراقب</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
  <div class="sig-block">
    <div class="role">Maître d'ouvrage<br>صاحب المشروع</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`Attachement_${num}`, body), `Attachement_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'attachement', number: num });
  },

  // 2.3 Journal de Chantier — يوميات الورشة
  journalChantier(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `JC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const days   = opts.days || [];
    const project= opts.project || {};

    const body = `
${_buildHeader(tenant, _T('JOURNAL'), num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid">
    <div class="info-block">
      <h4>🏗️ Projet</h4>
      <p><strong>${_esc(project.name || opts.projectName || '—')}</strong></p>
      ${project.location ? `<p>📍 ${_esc(project.location)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>📅 Période</h4>
      <p><strong>Du:</strong> ${_fmtDate(opts.from || _todayISO())}</p>
      <p><strong>Au:</strong> ${_fmtDate(opts.to || _todayISO())}</p>
      <p><strong>Conducteur:</strong> ${_esc(opts.conductor || '—')}</p>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">📆 Suivi journalier des travaux / المتابعة اليومية للأشغال</div>
  <table>
    <thead><tr>
      <th class="td-center" style="width:80px">Date</th>
      <th class="td-center" style="width:75px">Météo</th>
      <th class="td-center" style="width:60px">Effectif</th>
      <th>Travaux exécutés</th>
      <th>Matériel utilisé</th>
      <th>Observations / Incidents</th>
    </tr></thead>
    <tbody>
      ${days.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#999;padding:24px">Aucune entrée</td></tr>' :
        days.map(d => `<tr>
          <td class="td-center" style="font-weight:700">${_fmtDate(d.date)}</td>
          <td class="td-center">${_esc(d.weather || '☀️')}</td>
          <td class="td-center td-num">${_esc(d.workers || 0)}</td>
          <td>${_esc(d.work || '—')}</td>
          <td style="font-size:11px">${_esc(d.equipment || '—')}</td>
          <td style="font-size:11px;color:${d.incident?'#a32d3d':'#666'}">${_esc(d.notes || '—')}</td>
        </tr>`).join('')}
    </tbody>
  </table>
</div>

<div class="notes-block">
  <strong>ℹ️ Note :</strong> Ce journal est tenu quotidiennement sur le chantier et sert de référence pour la traçabilité
  des travaux, le calcul des délais et la résolution des litiges éventuels.<br>
  <strong>ℹ️ ملاحظة:</strong> هذا اليومية تُمسك يومياً في الورشة وتُستخدم كمرجع لتتبع الأشغال وحساب الآجال وحل النزاعات المحتملة.
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">Conducteur de travaux<br>قائد الأشغال</div>
    <div class="line">Signature</div>
  </div>
  <div class="sig-block">
    <div class="role">Maître d'œuvre<br>المهندس المراقب</div>
    <div class="stamp-zone">VISA ET SIGNATURE</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`Journal_${num}`, body), `Journal_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'journal_chantier', number: num });
  },

  // 2.4 PV de Réception — محضر الاستلام (مؤقت أو نهائي)
  pvReception(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const isFinal= opts.kind === 'final';
    const label  = isFinal ? _T('PV_DEF') : _T('PV_PROV');
    const num    = opts.number || `PV-${isFinal?'DEF':'PRO'}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const project= opts.project || {};
    const reserves = opts.reserves || [];

    const body = `
${_REPUBLIQUE}
${_buildHeader(tenant, label, num, _fmtDate(opts.date || _todayISO()))}

<div class="article">
  <p style="text-align:center;font-size:13px;font-weight:700">
    ${isFinal ? 'Procès-Verbal de Réception Définitive' : 'Procès-Verbal de Réception Provisoire'}<br>
    <span style="color:#888;font-size:11px">${isFinal ? 'محضر استلام نهائي' : 'محضر استلام مؤقت'}</span>
  </p>
</div>

<div class="section">
  <div class="info-grid">
    <div class="info-block">
      <h4>🏗️ Projet</h4>
      <p><strong>${_esc(project.name || opts.projectName || '—')}</strong></p>
      ${project.location ? `<p>📍 ${_esc(project.location)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>📋 Marché</h4>
      <p><strong>Référence:</strong> ${_esc(opts.marketRef || '—')}</p>
      <p><strong>Maître d'ouvrage:</strong> ${_esc(opts.maitreOuvrage || '—')}</p>
    </div>
  </div>
</div>

<div class="article">
  <h3>Article 1 : Constatation</h3>
  <p>
    Le ${_fmtDate(opts.date || _todayISO())}, sur le site du projet susmentionné, et en présence des parties soussignées,
    il a été procédé à la <strong>${isFinal ? 'réception définitive' : 'réception provisoire'}</strong>
    des travaux exécutés par l'entreprise <strong>${_esc(tenant.name || '—')}</strong> dans le cadre du marché précité.
  </p>
</div>

<div class="article">
  <h3>Article 2 : Décision</h3>
  <p>
    Après visite contradictoire et examen des ouvrages réalisés, les travaux sont
    <strong>${isFinal ? 'reçus définitivement' : 'reçus provisoirement'}</strong>
    ${isFinal ? 'et l\'entreprise est libérée de toutes ses obligations contractuelles.' : `à compter du ${_fmtDate(opts.receptionDate || opts.date || _todayISO())}.`}
  </p>
  ${!isFinal ? `<p style="margin-top:8px"><strong>📅 Période de garantie :</strong> ${_esc(opts.warrantyPeriod || '12 mois (un an)')} à compter de la date de réception provisoire,
    soit jusqu'au <strong>${_fmtDate(opts.warrantyEnd || '—')}</strong>.</p>` : ''}
</div>

${reserves.length > 0 ? `
<div class="section">
  <div class="section-title">⚠️ ${isFinal ? 'Réserves levées' : 'Réserves émises'} / التحفظات</div>
  <table>
    <thead><tr>
      <th style="width:40px">N°</th>
      <th>Description de la réserve</th>
      <th class="td-center" style="width:120px">Délai de levée</th>
      <th class="td-center" style="width:80px">Statut</th>
    </tr></thead>
    <tbody>
      ${reserves.map((r,i) => `<tr>
        <td class="td-center">${i+1}</td>
        <td>${_esc(r.desc || '—')}</td>
        <td class="td-center">${_esc(r.deadline || '—')}</td>
        <td class="td-center"><span style="background:#fff;color:${r.status==='resolved'?'#2a8055':'#B8902F'};border:1px solid ${r.status==='resolved'?'#2a8055':'#B8902F'};padding:3px 8px;border-radius:12px;font-size:10px;font-weight:700">${r.status==='resolved'?'✅ Levée':'⏳ En cours'}</span></td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : `
<div class="article">
  <h3>Article 3 : Réserves</h3>
  <p style="color:#2a8055;font-weight:700">✅ Aucune réserve n'a été émise lors de la présente réception.<br>
  ✅ لم تُسجل أي تحفظات خلال هذا الاستلام.</p>
</div>`}

${isFinal ? `
<div class="article">
  <h3>Article 4 : Caution / Retenue de garantie</h3>
  <p>La caution bancaire et/ou la retenue de garantie sont <strong>libérées</strong> au profit de l'entreprise
    à la date de la signature du présent procès-verbal.</p>
</div>` : ''}

<div class="big-amount" style="font-size:18px">
  ${isFinal ? '✅ RÉCEPTION DÉFINITIVE PRONONCÉE' : '✅ RÉCEPTION PROVISOIRE PRONONCÉE'}
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">Maître d'ouvrage<br>صاحب المشروع</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
  <div class="sig-block">
    <div class="role">L'Entreprise<br>المقاول</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
  <div class="sig-block">
    <div class="role">Maître d'œuvre<br>المراقب</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`PV_Reception_${num}`, body, isFinal?'DÉFINITIVE':'PROVISOIRE'), `PV_Reception_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'pv_reception', kind: opts.kind, number: num });
  },

  /* ════════════════════════════════════════════════════
     ③ النظام المالي والفوترة (Billing System)
     ════════════════════════════════════════════════════ */

  // 3.1 Facture d'Acompte — فاتورة التسبيق
  factureAcompte(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `ACO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const tvaRate= Number(opts.tvaRate ?? tenant.tva_rate ?? 19);
    const ttc    = Number(opts.amount || 0);
    const ht     = Math.round(ttc / (1 + tvaRate/100));
    const tva    = ttc - ht;
    const totalContract = Number(opts.totalContract || 0);
    const pct    = totalContract > 0 ? Math.round((ttc/totalContract)*100) : 0;

    const body = `
${_buildHeader(tenant, _T('ACOMPTE'), num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid-3">
    <div class="info-block">
      <h4>👤 Client</h4>
      <p><strong>${_esc(_localName({name:opts.clientName,name_fr:opts.clientNameFr},'name') || opts.clientName || '—')}</strong></p>
      ${opts.clientNif ? `<p>NIF: ${_esc(opts.clientNif)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>🏗️ Projet</h4>
      <p><strong>${_esc(opts.projectName || '—')}</strong></p>
      <p><strong>Marché:</strong> ${_esc(opts.marketRef || '—')}</p>
    </div>
    <div class="info-block">
      <h4>💰 Acompte</h4>
      <p><strong>Pourcentage:</strong> ${pct}%</p>
      ${totalContract > 0 ? `<p><strong>Sur:</strong> ${_fmt(totalContract)} DA</p>` : ''}
    </div>
  </div>
</div>

<div class="section">
  <table>
    <thead><tr>
      <th>Désignation</th>
      <th class="td-right" style="width:160px">Montant HT (DA)</th>
    </tr></thead>
    <tbody>
      <tr>
        <td>${_esc(opts.description || `Acompte sur marché ${opts.marketRef || ''} — Versement initial pour démarrage des travaux et acquisition matières premières`)}</td>
        <td class="td-right td-num"><strong>${_fmt(ht)}</strong></td>
      </tr>
    </tbody>
  </table>
</div>

<div class="totals-section">
  <div class="totals-box">
    <div class="total-row"><span>Montant HT</span><span class="td-num">${_fmt(ht)} DA</span></div>
    <div class="total-row"><span>TVA ${tvaRate}%</span><span class="td-num">${_fmt(tva)} DA</span></div>
    <div class="total-final"><span>NET À PAYER TTC</span><span class="td-num">${_fmt(ttc)} DA</span></div>
  </div>
</div>

<div class="big-amount">
  Acompte de ${pct}% — ${_fmt(ttc)} DA TTC
</div>

<div class="notes-block">
  <strong>📌 Mention légale :</strong> Cet acompte sera déduit lors de l'établissement de la facture définitive.
  Conformément au Code des marchés publics algérien.<br>
  <strong>📌 ملاحظة:</strong> سيُخصم هذا التسبيق من الفاتورة النهائية وفقاً لقانون الصفقات العمومية الجزائري.
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">Le Client</div>
    <div class="line">Signature pour accord</div>
  </div>
  <div class="sig-block">
    <div class="role">L'Entreprise</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`Acompte_${num}`, body, 'ACOMPTE'), `Acompte_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'facture_acompte', number: num });
  },

  // 3.2 Situation de Travaux — كشف الأشغال
  situationTravaux(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `SIT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const items  = opts.items || [];
    const tvaRate= Number(opts.tvaRate ?? tenant.tva_rate ?? 19);
    const cumul  = items.reduce((s,it) => s + Number(it.cumulAmount || 0), 0);
    const previous = Number(opts.previousCumul || 0);
    const thisPeriod = cumul - previous;
    const ht     = Math.round(thisPeriod / (1 + tvaRate/100));
    const tva    = thisPeriod - ht;
    const acompte = Number(opts.acompteDeducted || 0);
    const retenue = Number(opts.retenueGarantie || Math.round(thisPeriod * 0.05));
    const netToPay = thisPeriod - acompte - retenue;

    const body = `
${_buildHeader(tenant, 'SITUATION N° ' + (opts.sitNum || '01'), num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid-3">
    <div class="info-block">
      <h4>🏗️ Projet</h4>
      <p><strong>${_esc(opts.projectName || '—')}</strong></p>
      <p><strong>Marché:</strong> ${_esc(opts.marketRef || '—')}</p>
    </div>
    <div class="info-block">
      <h4>👤 Maître d'ouvrage</h4>
      <p><strong>${_esc(opts.maitreOuvrage || '—')}</strong></p>
    </div>
    <div class="info-block">
      <h4>📅 Période</h4>
      <p><strong>Du:</strong> ${_fmtDate(opts.from || _todayISO())}</p>
      <p><strong>Au:</strong> ${_fmtDate(opts.to || _todayISO())}</p>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">📊 Décompte des travaux exécutés / حساب الأشغال المنجزة</div>
  <table>
    <thead><tr>
      <th style="width:40px">N°</th>
      <th>Désignation</th>
      <th class="td-center" style="width:50px">U.</th>
      <th class="td-center" style="width:70px">Qté Cumul.</th>
      <th class="td-right" style="width:90px">P.U. (DA)</th>
      <th class="td-right" style="width:120px">Cumul HT (DA)</th>
    </tr></thead>
    <tbody>
      ${items.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#999;padding:24px">Aucune ligne</td></tr>' :
        items.map((it,i) => `<tr>
          <td class="td-center">${i+1}</td>
          <td>${_esc(it.desc || '—')}</td>
          <td class="td-center">${_esc(it.unit || '—')}</td>
          <td class="td-center td-num">${_fmt(it.qtyCumul || 0)}</td>
          <td class="td-right td-num">${_fmt(it.price || 0)}</td>
          <td class="td-right td-num"><strong>${_fmt(it.cumulAmount || 0)}</strong></td>
        </tr>`).join('')}
    </tbody>
  </table>
</div>

<div class="totals-section">
  <div class="totals-box">
    <div class="total-row"><span>Cumul travaux exécutés HT</span><span class="td-num">${_fmt(Math.round(cumul/(1+tvaRate/100)))} DA</span></div>
    <div class="total-row"><span>− Situations antérieures</span><span class="td-num">${_fmt(Math.round(previous/(1+tvaRate/100)))} DA</span></div>
    <div class="total-row" style="font-weight:700"><span>= Travaux de la période HT</span><span class="td-num">${_fmt(ht)} DA</span></div>
    <div class="total-row"><span>+ TVA ${tvaRate}%</span><span class="td-num">${_fmt(tva)} DA</span></div>
    <div class="total-row"><span>= Montant brut TTC</span><span class="td-num">${_fmt(thisPeriod)} DA</span></div>
    ${acompte > 0 ? `<div class="total-row" style="color:#a32d3d"><span>− Acompte versé</span><span class="td-num">${_fmt(acompte)} DA</span></div>` : ''}
    <div class="total-row" style="color:#a32d3d"><span>− Retenue de garantie 5%</span><span class="td-num">${_fmt(retenue)} DA</span></div>
    <div class="total-final"><span>NET À PAYER</span><span class="td-num">${_fmt(netToPay)} DA</span></div>
  </div>
</div>

<div class="notes-block">
  <strong>📌 Cette situation est établie conformément à l'attachement N° ${_esc(opts.attRef || opts.sitNum || '—')}</strong>
  contradictoirement constaté entre les parties en date du ${_fmtDate(opts.attDate || opts.date || _todayISO())}.
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">L'Entreprise</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
  <div class="sig-block">
    <div class="role">Maître d'œuvre</div>
    <div class="stamp-zone">VISA ET SIGNATURE</div>
  </div>
  <div class="sig-block">
    <div class="role">Maître d'ouvrage</div>
    <div class="stamp-zone">BON À PAYER</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`Situation_${num}`, body), `Situation_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'situation', number: num });
  },

  // 3.3 Facture Définitive — الفاتورة النهائية
  factureDefinitive(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `DEF-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const tvaRate= Number(opts.tvaRate ?? tenant.tva_rate ?? 19);
    const total  = Number(opts.totalContract || 0);
    const ht     = Math.round(total / (1 + tvaRate/100));
    const tva    = total - ht;
    const acompteSum = Number(opts.acompteSum || 0);
    const sitSum     = Number(opts.situationsSum || 0);
    const retenue    = Number(opts.retenueGarantie || Math.round(total * 0.05));
    const netToPay   = total - acompteSum - sitSum - retenue;

    const body = `
${_buildHeader(tenant, _T('FACTURE_DEF'), num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid">
    <div class="info-block">
      <h4>👤 Client / Maître d'ouvrage</h4>
      <p><strong>${_esc(_localName({name:opts.clientName,name_fr:opts.clientNameFr},'name') || opts.clientName || opts.maitreOuvrage || '—')}</strong></p>
      ${opts.clientAddress ? `<p>📍 ${_esc(opts.clientAddress)}</p>` : ''}
      ${opts.clientNif ? `<p>NIF: ${_esc(opts.clientNif)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>📋 Marché</h4>
      <p><strong>Référence:</strong> ${_esc(opts.marketRef || '—')}</p>
      <p><strong>Projet:</strong> ${_esc(opts.projectName || '—')}</p>
      <p><strong>PV Réception:</strong> ${_esc(opts.pvRef || '—')}</p>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">📊 Décompte général et définitif / الحساب العام النهائي</div>
  <table>
    <thead><tr>
      <th>Désignation</th>
      <th class="td-right" style="width:160px">Montant (DA)</th>
    </tr></thead>
    <tbody>
      <tr>
        <td><strong>Montant total du marché HT</strong></td>
        <td class="td-right td-num">${_fmt(ht)}</td>
      </tr>
      <tr>
        <td>TVA ${tvaRate}%</td>
        <td class="td-right td-num">${_fmt(tva)}</td>
      </tr>
      <tr style="background:#fafafa !important">
        <td style="color:#B8902F;font-weight:900;padding:12px">MONTANT TOTAL TTC</td>
        <td class="td-right td-num" style="color:#B8902F;font-weight:900;padding:12px">${_fmt(total)}</td>
      </tr>
      ${acompteSum > 0 ? `<tr style="color:#a32d3d">
        <td>− Acomptes versés</td>
        <td class="td-right td-num">${_fmt(acompteSum)}</td>
      </tr>` : ''}
      ${sitSum > 0 ? `<tr style="color:#a32d3d">
        <td>− Situations antérieures payées</td>
        <td class="td-right td-num">${_fmt(sitSum)}</td>
      </tr>` : ''}
      <tr style="color:#a32d3d">
        <td>− Retenue de garantie 5%</td>
        <td class="td-right td-num">${_fmt(retenue)}</td>
      </tr>
      <tr style="background:#fff !important">
        <td style="color:#2a8055;font-weight:900;padding:12px;border-top:2px solid #2a8055">NET À PAYER</td>
        <td class="td-right td-num" style="color:#2a8055;font-weight:900;padding:12px;font-size:14px;border-top:2px solid #2a8055">${_fmt(netToPay)} DA</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="big-amount">
  Net à payer : ${_fmt(netToPay)} DA TTC
</div>

<div class="notes-block">
  <strong>📌 Mention de clôture :</strong> La présente facture définitive solde l'ensemble des prestations
  exécutées dans le cadre du marché ${_esc(opts.marketRef || '')}. Elle est établie après réception ${opts.kindReception === 'final' ? 'définitive' : 'provisoire'}
  des ouvrages et tient compte de tous les acomptes et situations versés antérieurement.<br><br>
  <strong>📌 Conditions de paiement :</strong> ${_esc(opts.payTerms || 'Virement bancaire sous 30 jours à compter de la réception de la présente facture.')}
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">Le Client</div>
    <div class="line">Bon à payer</div>
  </div>
  <div class="sig-block">
    <div class="role">L'Entreprise</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`Facture_Definitive_${num}`, body, 'DÉFINITIVE'), `Facture_Definitive_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'facture_definitive', number: num });
  },

  // 3.4 Quittance de Paiement — وصل التسديد
  quittance(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `QUIT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const amount = Number(opts.amount || 0);

    const body = `
${_buildHeader(tenant, _T('QUITTANCE'), num, _fmtDate(opts.date || _todayISO()))}

<div class="article">
  <p style="text-align:center;font-size:13px;font-weight:700;line-height:2">
    Reçu de paiement<br>
    <span style="color:#888;font-size:11px">وصل تسديد / استلام مبلغ مالي</span>
  </p>
</div>

<div class="section">
  <div class="info-block">
    <h4>👤 Reçu de / استُلم من</h4>
    <p style="font-size:14px"><strong>${_esc(opts.payerName || '—')}</strong></p>
    ${opts.payerAddress ? `<p>📍 ${_esc(opts.payerAddress)}</p>` : ''}
    ${opts.payerNif ? `<p>NIF: ${_esc(opts.payerNif)}</p>` : ''}
  </div>
</div>

<div class="big-amount">
  ${_fmt(amount)} DA
</div>

<div class="article">
  <p style="font-size:13px;line-height:2">
    Je soussigné(e), <strong>${_esc(tenant.name || '—')}</strong>,
    ${tenant.rc_number ? `inscrit(e) au registre de commerce sous le N° <strong>${_esc(tenant.rc_number)}</strong>,` : ''}
    reconnais avoir reçu de <strong>${_esc(opts.payerName || '—')}</strong>,
    la somme de <strong>${_fmt(amount)} DA</strong> ${_amountInWords(amount, 'fr')},
    en règlement de :
  </p>
  <p style="background:#fafafa;padding:12px;border-right:3px solid #E8B84B;border-radius:6px;margin-top:10px;font-size:12.5px">
    <strong>📋 Objet :</strong> ${_esc(opts.subject || '—')}<br>
    ${opts.invoiceRef ? `<strong>🧾 Réf. facture :</strong> ${_esc(opts.invoiceRef)}<br>` : ''}
    ${opts.projectName ? `<strong>🏗️ Projet :</strong> ${_esc(opts.projectName)}<br>` : ''}
    <strong>💳 Mode de paiement :</strong> ${_esc(opts.method || 'Espèces')}
    ${opts.checkNum ? `<br><strong>📝 N° chèque :</strong> ${_esc(opts.checkNum)}` : ''}
    ${opts.bankRef ? `<br><strong>🏦 Référence bancaire :</strong> ${_esc(opts.bankRef)}` : ''}
  </p>
  <p style="margin-top:14px;font-size:12.5px">
    Et donne par la présente quittance entière et définitive,
    sous toutes réserves d'usage et de droit.
  </p>
</div>

<div style="text-align:center;padding:20px;margin:20px 32px;border:1px solid #ddd;border-radius:6px;background:#fafafa">
  <p style="font-size:11px;color:#888;margin-bottom:6px">Fait à ${_esc(opts.location || tenant.wilaya || '—')}, le ${_fmtDate(opts.date || _todayISO())}</p>
  <p style="font-size:11px;color:#888">حُرر بـ ${_esc(opts.location || tenant.wilaya || '—')} في ${_fmtDate(opts.date || _todayISO())}</p>
</div>

<div class="signatures">
  <div class="sig-block" style="flex:2">
    <div class="role">L'Entreprise / المؤسسة</div>
    <div class="stamp-zone" style="margin-top:14px">CACHET ET SIGNATURE</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`Quittance_${num}`, body, 'QUITTANCE'), `Quittance_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'quittance', number: num });
  },

  /* ════════════════════════════════════════════════════
     ④ الموارد البشرية والرواتب (HR & Payroll)
     ════════════════════════════════════════════════════ */

  // 4.1 Fiche de Paie — كشف الراتب
  fichePaie(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `PAIE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const worker = opts.worker || {};
    const isAr   = _docLang === 'ar';

    const daysWorked   = Number(opts.daysWorked || 26);
    const contractType = worker.contract_type || opts.contractType || 'monthly';
    const dailySal     = Number(worker.daily_salary || 0);
    const monthlySal   = Number(worker.monthly_base || dailySal * 26);

    // ✅ الحساب الصحيح: العامل اليومي = daily × days / العامل الشهري = monthly_base ثابت
    let baseSalary;
    if (opts.baseSalary !== undefined) {
      // إذا مُرِّر مباشرة (من صفحة الرواتب — يكون محسوباً بالفعل)
      baseSalary = Number(opts.baseSalary);
    } else if (contractType === 'daily' || contractType === 'seasonal') {
      baseSalary = Math.round(dailySal * daysWorked);
    } else {
      // monthly / contract — الراتب ثابت لا يتغير بعدد الأيام
      baseSalary = monthlySal;
    }

    const overtime    = Number(opts.overtime || 0);
    const bonuses     = Number(opts.bonuses || 0);
    const transport   = Number(opts.transport || 0);
    const grossSalary = baseSalary + overtime + bonuses + transport;

    // ── حساب صافي الراتب بالقانون الجزائري 2026 ──
    // نستخدم البيانات الممرّرة إذا كانت محسوبة مسبقاً، وإلا نعيد الحساب
    let cnas, taxableBase, irg_raw, abattement, irg_net, allocations, netSalary;

    if (opts.cnas !== undefined) {
      // ✅ البيانات جاهزة محسوبة مسبقاً من صفحة الرواتب — استخدمها كما هي
      cnas         = Number(opts.cnas);
      irg_net      = Number(opts.irg || 0);
      allocations  = Number(opts.allocations || 0);
      taxableBase  = Number(opts.taxableBase || (grossSalary - cnas));
      irg_raw      = irg_net;
      abattement   = 0;
      netSalary    = Number(opts.netSalary || Math.max(0, taxableBase - irg_net + allocations));
    } else {
      // احسب من صفر باستخدام دالة الحساب الجزائري
      cnas         = Math.round(grossSalary * 0.09);
      taxableBase  = grossSalary - cnas;
      // باريم IRG 2026 الصحيح
      if      (taxableBase <= 30000)  irg_raw = 0;
      else if (taxableBase <= 40000)  irg_raw = (taxableBase - 30000) * 0.23;
      else if (taxableBase <= 80000)  irg_raw = 2300 + (taxableBase - 40000) * 0.27;
      else if (taxableBase <= 160000) irg_raw = 2300 + 10800 + (taxableBase - 80000) * 0.30;
      else if (taxableBase <= 320000) irg_raw = 2300 + 10800 + 24000 + (taxableBase - 160000) * 0.33;
      else                            irg_raw = 2300 + 10800 + 24000 + 52800 + (taxableBase - 320000) * 0.35;
      irg_raw = Math.round(irg_raw);
      // Abattement 40% (min 1000, max 1500)
      abattement = irg_raw > 0 ? Math.min(Math.max(Math.round(irg_raw * 0.40), 1000), 1500) : 0;
      irg_net    = Math.max(0, irg_raw - abattement);
      // Allocations familiales
      const married  = (worker.marital_status || opts.marital_status) === 'married';
      const children = Number(worker.children_count || opts.children || 0);
      const spouseWorks = Number(worker.spouse_works || 0) === 1;
      allocations = children * 300 + (married && !spouseWorks ? 800 : 0);
      netSalary   = Math.max(0, taxableBase - irg_net + allocations);
    }

    const maritalStatus = worker.marital_status || opts.marital_status || 'single';
    const maritalLabel  = isAr
      ? (maritalStatus==='married'?'متزوج/ة':maritalStatus==='divorced'?'مطلق/ة':maritalStatus==='widowed'?'أرمل/ة':'أعزب/عزباء')
      : (maritalStatus==='married'?'Marié(e)':maritalStatus==='divorced'?'Divorcé(e)':maritalStatus==='widowed'?'Veuf/Veuve':'Célibataire');

    const body = `
${_buildHeader(tenant, _T('FICHE_PAIE'), num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid">
    <div class="info-block">
      <h4>👤 ${_L('Employé','العامل')}</h4>
      <p><strong>${_esc(_localPerson(worker) || opts.workerName || '—')}</strong></p>
      ${worker.role ? `<p><strong>${_L('Poste','المنصب')}:</strong> ${_esc(worker.role)}</p>` : ''}
      ${worker.national_id ? `<p><strong>${_L('N° CIN','رقم البطاقة الوطنية')}:</strong> ${_esc(worker.national_id)}</p>` : ''}
      ${worker.cnas_number ? `<p><strong>N° CNAS:</strong> ${_esc(worker.cnas_number)}</p>` : ''}
      <p><strong>${_L('Sit. Familiale','الحالة العائلية')}:</strong> ${maritalLabel}</p>
      ${(Number(worker.children_count||0)>0)?`<p><strong>${_L('Enfants','الأطفال')}:</strong> ${worker.children_count||0}</p>`:''}
    </div>
    <div class="info-block">
      <h4>📅 ${_L('Période','الفترة')}</h4>
      <p><strong>${_L('Mois','الشهر')}:</strong> ${_esc(opts.month || new Date().toLocaleString(isAr?'ar-DZ':'fr-DZ', { month:'long', year:'numeric' }))}</p>
      <p><strong>${_L('Jours travaillés','أيام العمل')}:</strong> ${daysWorked}</p>
      <p><strong>${_L('Type contrat','نوع العقد')}:</strong> ${_esc(worker.contract_type==='monthly'?_L('CDI / Mensuel','شهري CDI'):worker.contract_type==='daily'?_L('Journalier','يومي'):'—')}</p>
      ${worker.hire_date?`<p><strong>${_L('Embauché(e) le','تاريخ التعيين')}:</strong> ${_fmtDate(worker.hire_date)}</p>`:''}
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">💰 ${_L('Gains / Éléments de Rémunération','المكتسبات والعناصر التعويضية')}</div>
  <table>
    <thead><tr>
      <th>${_L('Désignation','التعيين')}</th>
      <th class="td-center" style="width:90px">${_L('Base','القاعدة')}</th>
      <th class="td-center" style="width:80px">${_L('Taux','المعدل')}</th>
      <th class="td-right" style="width:140px">${_L('Montant (DA)','المبلغ (دج)')}</th>
    </tr></thead>
    <tbody>
      <tr>
        <td>${_L('Salaire de base','الراتب القاعدي')}</td>
        <td class="td-center td-num">${daysWorked} ${_L('j','ي')}</td>
        <td class="td-center">—</td>
        <td class="td-right td-num">${_fmt(baseSalary)}</td>
      </tr>
      ${overtime>0?`<tr><td>${_L('Heures supplémentaires','الساعات الإضافية')}</td><td class="td-center">—</td><td class="td-center">—</td><td class="td-right td-num">${_fmt(overtime)}</td></tr>`:''}
      ${bonuses>0?`<tr><td>${_L('Primes & Indemnités','العلاوات والتعويضات')}</td><td class="td-center">—</td><td class="td-center">—</td><td class="td-right td-num">${_fmt(bonuses)}</td></tr>`:''}
      ${transport>0?`<tr><td>${_L('Indemnité Transport (non imposable)','تعويض النقل (معفى)')}</td><td class="td-center">—</td><td class="td-center">—</td><td class="td-right td-num">${_fmt(transport)}</td></tr>`:''}
      <tr style="font-weight:700;background:#f8f3e8">
        <td colspan="3">${_L('SALAIRE BRUT IMPOSABLE','الراتب الإجمالي الخاضع للضريبة')}</td>
        <td class="td-right td-num" style="color:#B8902F">${_fmt(grossSalary)}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">➖ ${_L('Retenues Obligatoires','الاقتطاعات الإلزامية')}</div>
  <table>
    <thead><tr>
      <th>${_L('Désignation','التعيين')}</th>
      <th class="td-center" style="width:120px">${_L('Base de calcul','أساس الحساب')}</th>
      <th class="td-center" style="width:80px">${_L('Taux','المعدل')}</th>
      <th class="td-right" style="width:140px">${_L('Montant (DA)','المبلغ (دج)')}</th>
    </tr></thead>
    <tbody>
      <tr>
        <td>${_L('Cotisation CNAS — Sécurité Sociale (part salariale)','اشتراك الضمان الاجتماعي CNAS — حصة العامل')}</td>
        <td class="td-center td-num">${_fmt(grossSalary)}</td>
        <td class="td-center" style="color:#c0392b">9%</td>
        <td class="td-right td-num" style="color:#c0392b">−${_fmt(cnas)}</td>
      </tr>
      <tr>
        <td>${_L('Base Imposable IRG (Brut − CNAS)','الوعاء الضريبي للـ IRG')}</td>
        <td class="td-center td-num">${_fmt(taxableBase)}</td>
        <td class="td-center">—</td>
        <td class="td-right td-num">${_fmt(taxableBase)}</td>
      </tr>
      <tr>
        <td>${_L('IRG — Impôt sur le Revenu Global (barème 2026)','IRG — الضريبة على الدخل الإجمالي (جدول 2026)')}</td>
        <td class="td-center td-num">${_fmt(taxableBase)}</td>
        <td class="td-center" style="color:#c0392b">${_L('Progressif','تصاعدي')}</td>
        <td class="td-right td-num" style="color:#c0392b">${_fmt(irg_raw > 0 ? irg_raw : 0)}</td>
      </tr>
      ${(abattement>0)?`<tr style="font-size:.85em;color:#2e7d32">
        <td>  ↳ ${_L('Abattement forfaitaire 40%','تخفيض 40%')} (${_L('min','أدنى')} 1 000 / ${_L('max','أقصى')} 1 500 DA)</td>
        <td class="td-center td-num">${_fmt(irg_raw)}</td>
        <td class="td-center">40%</td>
        <td class="td-right td-num" style="color:#2e7d32">−${_fmt(abattement)}</td>
      </tr>`:''}
      <tr style="font-weight:700;background:#fdecea">
        <td colspan="3">IRG ${_L('Net à retenir','الصافي المُحجوز')}</td>
        <td class="td-right td-num" style="color:#c0392b">−${_fmt(irg_net)}</td>
      </tr>
    </tbody>
  </table>
</div>

${allocations>0?`
<div class="section">
  <div class="section-title">➕ ${_L('Allocations Familiales (non imposables)','المنح العائلية (معفاة من الضريبة)')}</div>
  <table>
    <thead><tr><th>${_L('Désignation','التعيين')}</th><th class="td-right" style="width:140px">${_L('Montant (DA)','المبلغ (دج)')}</th></tr></thead>
    <tbody>
      ${Number(worker.children_count||opts.children||0)>0?`<tr><td>${_L('Allocations Enfants','منح الأطفال')} (${Number(worker.children_count||opts.children||0)} × 300 DA)</td><td class="td-right td-num" style="color:#2e7d32">+${_fmt(Number(worker.children_count||opts.children||0)*300)}</td></tr>`:''}
      ${(maritalStatus==='married'&&Number(worker.spouse_works||0)===0)?`<tr><td>${_L('Salaire Unique (conjoint sans activité)','تعويض الزوجة غير العاملة')}</td><td class="td-right td-num" style="color:#2e7d32">+800</td></tr>`:''}
      <tr style="font-weight:700"><td>${_L('Total Allocations Familiales','مجموع المنح العائلية')}</td><td class="td-right td-num" style="color:#2e7d32">+${_fmt(allocations)}</td></tr>
    </tbody>
  </table>
</div>`:''}

<div class="section">
  <table style="border:2px solid #B8902F">
    <tbody>
      <tr style="background:#f8f3e8">
        <td style="font-size:1rem;font-weight:900;padding:.8rem">${_L('NET À PAYER','صافي الراتب للصرف')}</td>
        <td class="td-right" style="font-size:1.3rem;font-weight:900;color:#0a5c2f;padding:.8rem;font-family:monospace">${_fmt(netSalary)} DA</td>
      </tr>
    </tbody>
  </table>
  <div style="margin-top:.5rem;font-size:.75em;color:#666;text-align:center">
    ${_L(`Barème IRG 2026 — Exonération ≤ 30 000 DA | Tranches: 23% / 27% / 30% / 33% / 35% | Abattement 40% (max 1 500 DA) | CNAS 9%`,
         `جدول IRG 2026 — إعفاء ≤ 30,000 دج | شرائح: 23% / 27% / 30% / 33% / 35% | تخفيض 40% (أقصى 1,500 دج) | CNAS 9%`)}
  </div>
</div>

<div class="sig-row">
  <div class="sig-block"><div class="sig-title">${_L('L\'Employeur / Le Responsable RH','صاحب العمل / مسؤول الموارد البشرية')}</div><div class="sig-space"></div><div class="sig-label">${_T('signature')} & ${_T('stamp')}</div></div>
  <div class="sig-block"><div class="sig-title">${_L('L\'Employé(e)','العامل / العاملة')}</div><div class="sig-space"></div><div class="sig-label">${_T('signature')}</div></div>
</div>

<div class="section" style="margin-top:.5rem;font-size:.75em;color:#666;border-top:1px solid #eee;padding-top:.5rem">
  <strong>${_L('Note','ملاحظة')}:</strong> ${_L(
    `Cotisations patronales CNAS (26%) à la charge de l'employeur : ${_fmt(Math.round(grossSalary*0.26))} DA — non déduit du salaire salarié.`,
    `اشتراكات صاحب العمل في الضمان الاجتماعي (CNAS 26%): ${_fmt(Math.round(grossSalary*0.26))} دج — لا تُقتطع من راتب العامل.`
  )}
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`Paie_${num}`, body), `Paie_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'fiche_paie', worker_id: worker.id, number: num });
  },

  // 4.2 Contract — العقود (CDD / CTA / CDI)
  contract(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const worker = opts.worker || {};
    const kind   = opts.kind || 'cdd'; // 'cdd', 'cta', 'cdi'
    const kindLabel = { cdd: 'CONTRAT À DURÉE DÉTERMINÉE', cta: 'CONTRAT DE TRAVAIL AIDÉ (CTA-ANEM)', cdi: 'CONTRAT À DURÉE INDÉTERMINÉE' }[kind] || _T('CONTRAT');
    const num    = opts.number || `CONT-${kind.toUpperCase()}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    const dailySalary = Number(worker.daily_salary || 0);
    const monthlySalary = Number(worker.monthly_base || dailySalary * 26);

    const body = `
${_REPUBLIQUE}
${_buildHeader(tenant, kindLabel, num, _fmtDate(opts.date || _todayISO()))}

<div class="article">
  <p style="text-align:center;font-size:13px;line-height:2">
    <strong>Entre les soussignés / بين الطرفين</strong>
  </p>
  <p style="font-size:12px;line-height:1.9;text-align:justify">
    <strong>L'entreprise ${_esc(tenant.name || '—')}</strong>
    ${tenant.rc_number ? `, inscrite au registre de commerce sous le N° ${_esc(tenant.rc_number)}` : ''}
    ${tenant.nif ? `, NIF : ${_esc(tenant.nif)}` : ''}
    ${tenant.address ? `, sise à ${_esc(tenant.address)}` : ''}
    ${tenant.wilaya ? `, ${_esc(tenant.wilaya)}` : ''},
    représentée par ${_esc(opts.employerRep || 'son gérant')}, ci-après dénommée <strong>"l'Employeur"</strong>,
  </p>
  <p style="text-align:center;font-weight:700;margin:8px 0">— D'UNE PART / من جهة —</p>
  <p style="font-size:12px;line-height:1.9;text-align:justify">
    <strong>Et Monsieur/Madame ${_esc(_localPerson(worker) || '—')}</strong>,
    ${worker.national_id ? `titulaire de la carte d'identité N° ${_esc(worker.national_id)}` : ''}
    ${worker.phone ? `, tél. ${_esc(worker.phone)}` : ''}
    ${opts.workerAddress ? `, demeurant à ${_esc(opts.workerAddress)}` : ''},
    ci-après dénommé(e) <strong>"l'Employé(e)"</strong>.
  </p>
  <p style="text-align:center;font-weight:700;margin:8px 0">— D'AUTRE PART / من جهة أخرى —</p>
  <p style="text-align:center;font-style:italic;margin-top:14px">Il a été convenu et arrêté ce qui suit :</p>
</div>

<div class="article">
  <h3>Article 1 : Objet du contrat</h3>
  <p>L'Employeur engage l'Employé(e) en qualité de <strong>${_esc(worker.role || opts.position || '—')}</strong>
    pour exécuter les missions qui lui seront confiées dans le cadre des activités de l'entreprise.</p>
</div>

<div class="article">
  <h3>Article 2 : Durée du contrat</h3>
  ${kind === 'cdi' ? `
    <p>Le présent contrat est conclu pour une <strong>durée indéterminée (CDI)</strong>,
    à compter du <strong>${_fmtDate(worker.hire_date || opts.startDate || _todayISO())}</strong>.</p>
    <p>Une période d'essai de <strong>${_esc(opts.trialPeriod || '3 mois')}</strong> est prévue,
    durant laquelle chaque partie peut rompre le contrat sans préavis ni indemnité.</p>
  ` : kind === 'cta' ? `
    <p>Le présent contrat est conclu dans le cadre du dispositif d'aide à l'insertion professionnelle (DAIP)
    en partenariat avec l'<strong>ANEM</strong>, pour une durée de <strong>${_esc(opts.duration || '12 mois')}</strong>,
    du <strong>${_fmtDate(worker.hire_date || opts.startDate || _todayISO())}</strong>
    au <strong>${_fmtDate(opts.endDate || '—')}</strong>.</p>
  ` : `
    <p>Le présent contrat est conclu pour une <strong>durée déterminée (CDD)</strong>,
    liée à la durée du projet/marché <strong>"${_esc(opts.projectName || '—')}"</strong>.</p>
    <p>Il prend effet le <strong>${_fmtDate(worker.hire_date || opts.startDate || _todayISO())}</strong>
    et prend fin le <strong>${_fmtDate(opts.endDate || '—')}</strong>,
    soit une durée de <strong>${_esc(opts.duration || '—')}</strong>.</p>
  `}
</div>

<div class="article">
  <h3>Article 3 : Lieu de travail</h3>
  <p>L'Employé(e) exercera ses fonctions sur les chantiers de l'entreprise,
    notamment <strong>${_esc(opts.workplace || tenant.wilaya || '—')}</strong>,
    ainsi que tout autre lieu où l'Employeur aura besoin de ses services.</p>
</div>

<div class="article">
  <h3>Article 4 : Rémunération</h3>
  <p>En contrepartie de son travail, l'Employé(e) percevra une rémunération
    ${worker.contract_type === 'monthly' ? `mensuelle brute de <strong>${_fmt(monthlySalary)} DA</strong>` :
    `journalière de <strong>${_fmt(dailySalary)} DA</strong>${monthlySalary>0?` (soit environ ${_fmt(monthlySalary)} DA/mois pour 26 jours)`:''}`},
    payable à la fin de chaque mois, déduction faite des cotisations sociales (CNAS) et de l'IRG conformément à la législation en vigueur.</p>
</div>

<div class="article">
  <h3>Article 5 : Durée du travail</h3>
  <p>La durée légale du travail est fixée à <strong>40 heures par semaine</strong>, soit 8 heures par jour,
    réparties du dimanche au jeudi, conformément à la loi n° 90-11 relative aux relations de travail.
    Les heures supplémentaires seront rémunérées avec une majoration de 50% à 100% selon le cas.</p>
</div>

<div class="article">
  <h3>Article 6 : Congés</h3>
  <p>L'Employé(e) bénéficie d'un congé annuel payé de <strong>2.5 jours par mois travaillé</strong>,
    soit 30 jours par an, conformément à la législation algérienne du travail.</p>
</div>

<div class="article">
  <h3>Article 7 : Sécurité sociale</h3>
  <p>L'Employé(e) sera affilié(e) à la Caisse Nationale d'Assurances Sociales (<strong>CNAS</strong>)
    dès la signature du présent contrat. L'employeur s'engage à effectuer les déclarations
    et versements des cotisations dans les délais légaux.</p>
</div>

<div class="article">
  <h3>Article 8 : Obligations de l'employé</h3>
  <p>L'Employé(e) s'engage à :
    respecter le règlement intérieur de l'entreprise,
    porter les équipements de protection individuelle (EPI),
    suivre les instructions de son supérieur hiérarchique,
    et préserver le matériel mis à sa disposition.</p>
</div>

<div class="article">
  <h3>Article 9 : Rupture du contrat</h3>
  ${kind === 'cdi' ? `
    <p>Chaque partie peut rompre le contrat moyennant un préavis de <strong>1 à 3 mois</strong> selon l'ancienneté,
    sauf en cas de faute grave constatée selon les procédures légales.</p>
  ` : `
    <p>Le présent contrat prend fin de plein droit à l'arrivée de son terme.
    Toute rupture anticipée doit être motivée par une faute grave ou par accord mutuel des parties.</p>
  `}
</div>

<div class="article">
  <h3>Article 10 : Litiges</h3>
  <p>Tout litige relatif à l'interprétation ou à l'exécution du présent contrat sera soumis,
    après tentative de conciliation à l'inspection du travail, aux juridictions compétentes du lieu de travail.</p>
</div>

<div class="article">
  <p style="text-align:center;font-style:italic;margin-top:14px">
    Fait en deux (02) exemplaires originaux à ${_esc(tenant.wilaya || '—')}, le ${_fmtDate(opts.date || _todayISO())}.<br>
    حُرر من نسختين أصليتين بـ ${_esc(tenant.wilaya || '—')} في ${_fmtDate(opts.date || _todayISO())}.
  </p>
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">L'Employé(e) / العامل</div>
    <div class="line">Lu et approuvé — Signature</div>
  </div>
  <div class="sig-block">
    <div class="role">L'Employeur / صاحب العمل</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`Contrat_${kind}_${num}`, body), `Contrat_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'contrat', kind, worker_id: worker.id, number: num });
  },

  // 4.3 Fiche de Pointage — بطاقة الحضور
  fichePointage(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `POINT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const days   = opts.days || [];
    const totalHours = days.reduce((s,d) => s + Number(d.hours||0) + Number(d.overtime||0), 0);
    const totalOT    = days.reduce((s,d) => s + Number(d.overtime||0), 0);

    const body = `
${_buildHeader(tenant, _T('POINTAGE'), num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid-3">
    <div class="info-block">
      <h4>👤 Employé</h4>
      <p><strong>${_esc(opts.workerName || '—')}</strong></p>
      ${opts.workerRole ? `<p><strong>Fonction:</strong> ${_esc(opts.workerRole)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>📅 Période</h4>
      <p><strong>Du:</strong> ${_fmtDate(opts.from || _todayISO())}</p>
      <p><strong>Au:</strong> ${_fmtDate(opts.to || _todayISO())}</p>
    </div>
    <div class="info-block">
      <h4>🏗️ Chantier</h4>
      <p><strong>${_esc(opts.projectName || '—')}</strong></p>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">⏱️ Pointage journalier / المتابعة اليومية</div>
  <table>
    <thead><tr>
      <th class="td-center" style="width:80px">Date</th>
      <th class="td-center" style="width:80px">Entrée</th>
      <th class="td-center" style="width:80px">Sortie</th>
      <th class="td-center" style="width:90px">Heures normales</th>
      <th class="td-center" style="width:80px">H. supp.</th>
      <th>Observations</th>
    </tr></thead>
    <tbody>
      ${days.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#999;padding:24px">Aucune entrée</td></tr>' :
        days.map(d => `<tr>
          <td class="td-center" style="font-weight:700">${_fmtDate(d.date)}</td>
          <td class="td-center td-num">${_esc(d.checkIn || '—')}</td>
          <td class="td-center td-num">${_esc(d.checkOut || '—')}</td>
          <td class="td-center td-num"><strong>${_esc(d.hours || 0)} h</strong></td>
          <td class="td-center td-num" style="color:${d.overtime>0?'#2a8055':'#999'}">${_esc(d.overtime || 0)} h</td>
          <td style="font-size:11px">${_esc(d.notes || '')}</td>
        </tr>`).join('')}
      <tr style="background:#fafafa !important">
        <td colspan="3" style="text-align:left;font-weight:900;color:#B8902F;padding:12px;border-top:2px solid #B8902F">TOTAL</td>
        <td class="td-center td-num" style="font-weight:900;color:#B8902F;padding:12px;border-top:2px solid #B8902F">${totalHours - totalOT} h</td>
        <td class="td-center td-num" style="font-weight:900;color:#B8902F;padding:12px;border-top:2px solid #B8902F">${totalOT} h</td>
        <td style="color:#B8902F;font-weight:700;padding:12px">${days.length} jour(s)</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">L'Employé(e)</div>
    <div class="line">Signature</div>
  </div>
  <div class="sig-block">
    <div class="role">Chef de chantier</div>
    <div class="line">Visa</div>
  </div>
  <div class="sig-block">
    <div class="role">Service RH</div>
    <div class="stamp-zone">CACHET</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`Pointage_${num}`, body), `Pointage_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'fiche_pointage', number: num });
  },

  // 4.4 Attestation de Travail — شهادة العمل
  attestationTravail(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const worker = opts.worker || {};
    const num    = opts.number || `ATT-TRAV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    const body = `
${_REPUBLIQUE}
${_buildHeader(tenant, _T('ATTESTATION'), num, _fmtDate(opts.date || _todayISO()))}

<div class="article">
  <p style="text-align:center;font-size:14px;font-weight:700;line-height:2;margin-top:20px">
    A T T E S T A T I O N&nbsp;&nbsp;D E&nbsp;&nbsp;T R A V A I L<br>
    <span style="color:#888;font-size:11px">شهادة عمل</span>
  </p>
</div>

<div class="article" style="margin-top:30px">
  <p style="font-size:13px;line-height:2.2;text-align:justify;text-indent:30px">
    Je soussigné, <strong>${_esc(opts.signerName || tenant.name || '—')}</strong>,
    ${_esc(opts.signerRole || 'Gérant')} de l'entreprise <strong>${_esc(tenant.name || '—')}</strong>
    ${tenant.rc_number ? `, inscrite au registre de commerce sous le N° <strong>${_esc(tenant.rc_number)}</strong>` : ''}
    ${tenant.address ? `, sise à <strong>${_esc(tenant.address)}</strong>` : ''},
    atteste par la présente que :
  </p>

  <div style="background:#fafafa;padding:20px;border-radius:8px;border-right:4px solid #E8B84B;margin:20px 0;text-align:center">
    <p style="font-size:18px;font-weight:900;color:#3a3a3a;letter-spacing:1px">
      ${_esc(_localPerson(worker) || opts.workerName || '—')}
    </p>
    ${worker.national_id ? `<p style="font-size:12px;color:#555;margin-top:6px">Carte d'identité N° : <strong>${_esc(worker.national_id)}</strong></p>` : ''}
  </div>

  <p style="font-size:13px;line-height:2.2;text-align:justify">
    A bien exercé au sein de notre entreprise les fonctions de
    <strong>${_esc(worker.role || opts.position || '—')}</strong>,
    ${opts.endDate ? `du <strong>${_fmtDate(worker.hire_date || opts.startDate || '—')}</strong> au <strong>${_fmtDate(opts.endDate)}</strong>` :
      `depuis le <strong>${_fmtDate(worker.hire_date || opts.startDate || '—')}</strong> jusqu'à ce jour`}.
  </p>

  <p style="font-size:13px;line-height:2.2;text-align:justify;text-indent:30px">
    ${_esc(opts.observations || `Durant cette période, l'intéressé(e) a fait preuve de sérieux, de ponctualité et de compétence dans l'exercice de ses fonctions.`)}
  </p>

  <p style="font-size:13px;line-height:2.2;text-align:justify;text-indent:30px;margin-top:14px">
    La présente attestation est délivrée à l'intéressé(e) <strong>pour servir et valoir ce que de droit</strong>.
  </p>
</div>

<div style="text-align:left;padding:24px 32px;font-size:12px;color:#555">
  Fait à ${_esc(tenant.wilaya || '—')}, le ${_fmtDate(opts.date || _todayISO())}<br>
  حُرر بـ ${_esc(tenant.wilaya || '—')} في ${_fmtDate(opts.date || _todayISO())}
</div>

<div class="signatures">
  <div class="sig-block" style="flex:2">
    <div class="role">${_esc(opts.signerRole || 'Le Gérant')}</div>
    <div class="stamp-zone" style="margin-top:14px">CACHET ET SIGNATURE</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`Attestation_Travail_${num}`, body), `Attestation_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'attestation_travail', worker_id: worker.id, number: num });
  },

  /* ════════════════════════════════════════════════════
     ⑤ اللوجستيك والمخزون (Logistics & Inventory)
     ════════════════════════════════════════════════════ */

  // 5.1 Bon de Commande — وصل الطلب
  bonCommande(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `BC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const items  = opts.items || [];
    const ttc    = items.reduce((s,it) => s + Number(it.total || 0), 0);
    const tvaRate= Number(opts.tvaRate ?? tenant.tva_rate ?? 19);
    const ht     = Math.round(ttc / (1 + tvaRate/100));
    const tva    = ttc - ht;

    const body = `
${_buildHeader(tenant, _T('BON_CMD'), num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid">
    <div class="info-block">
      <h4>🏪 Fournisseur</h4>
      <p><strong>${_esc(opts.supplierName || '—')}</strong></p>
      ${opts.supplierAddress ? `<p>📍 ${_esc(opts.supplierAddress)}</p>` : ''}
      ${opts.supplierPhone ? `<p>📞 ${_esc(opts.supplierPhone)}</p>` : ''}
      ${opts.supplierNif ? `<p>NIF: ${_esc(opts.supplierNif)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>📋 Conditions</h4>
      <p><strong>Livraison à:</strong> ${_esc(opts.deliveryAddress || tenant.address || '—')}</p>
      <p><strong>Date livraison souhaitée:</strong> ${_fmtDate(opts.deliveryDate || '—')}</p>
      <p><strong>Modalités paiement:</strong> ${_esc(opts.payTerms || 'À convenir')}</p>
      ${opts.projectName ? `<p><strong>Chantier:</strong> ${_esc(opts.projectName)}</p>` : ''}
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">📦 Articles commandés / المواد المطلوبة</div>
  <table>
    <thead><tr>
      <th style="width:40px">N°</th>
      <th>Désignation</th>
      <th class="td-center" style="width:55px">U.</th>
      <th class="td-center" style="width:70px">Qté</th>
      <th class="td-right" style="width:110px">P.U. HT (DA)</th>
      <th class="td-right" style="width:130px">Total HT (DA)</th>
    </tr></thead>
    <tbody>
      ${items.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#999;padding:24px">Aucun article</td></tr>' :
        items.map((it,i) => `<tr>
          <td class="td-center">${i+1}</td>
          <td>${_esc(it.desc || '—')}</td>
          <td class="td-center">${_esc(it.unit || '—')}</td>
          <td class="td-center td-num"><strong>${_fmt(it.qty || 1)}</strong></td>
          <td class="td-right td-num">${_fmt(it.price || 0)}</td>
          <td class="td-right td-num"><strong>${_fmt(it.total || 0)}</strong></td>
        </tr>`).join('')}
    </tbody>
  </table>
</div>

<div class="totals-section">
  <div class="totals-box">
    <div class="total-row"><span>${_T('total_ht')}</span><span class="td-num">${_fmt(ht)} DA</span></div>
    <div class="total-row"><span>TVA ${tvaRate}%</span><span class="td-num">${_fmt(tva)} DA</span></div>
    <div class="total-final"><span>${_T('total_ttc')}</span><span class="td-num">${_fmt(ttc)} DA</span></div>
  </div>
</div>

<div class="notes-block">
  <strong>📌 Conditions :</strong> Le fournisseur s'engage à livrer la marchandise conforme aux spécifications,
  dans les délais convenus, accompagnée du bon de livraison et de la facture.
  Toute réclamation doit être faite dans les 7 jours suivant la réception.
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">Le Fournisseur</div>
    <div class="line">Bon pour accord</div>
  </div>
  <div class="sig-block">
    <div class="role">L'Acheteur (notre entreprise)</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`BC_${num}`, body), `BC_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'bon_commande', number: num });
  },

  // 5.2 Bon de Réception — وصل الاستلام
  bonReception(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `BR-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const items  = opts.items || [];

    const body = `
${_buildHeader(tenant, _T('BON_REC'), num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid">
    <div class="info-block">
      <h4>🏪 Fournisseur</h4>
      <p><strong>${_esc(opts.supplierName || '—')}</strong></p>
      ${opts.supplierPhone ? `<p>📞 ${_esc(opts.supplierPhone)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>📋 Référence</h4>
      <p><strong>Bon de commande:</strong> ${_esc(opts.bcRef || '—')}</p>
      <p><strong>Bon de livraison:</strong> ${_esc(opts.blRef || '—')}</p>
      <p><strong>Lieu:</strong> ${_esc(opts.location || tenant.address || '—')}</p>
      ${opts.projectName ? `<p><strong>Chantier:</strong> ${_esc(opts.projectName)}</p>` : ''}
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">📦 Articles réceptionnés / المواد المستلمة</div>
  <table>
    <thead><tr>
      <th style="width:40px">N°</th>
      <th>Désignation</th>
      <th class="td-center" style="width:50px">U.</th>
      <th class="td-center" style="width:80px">Qté commandée</th>
      <th class="td-center" style="width:80px">Qté livrée</th>
      <th class="td-center" style="width:80px">Qté acceptée</th>
      <th class="td-center" style="width:90px">État</th>
    </tr></thead>
    <tbody>
      ${items.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:#999;padding:24px">Aucun article</td></tr>' :
        items.map((it,i) => `<tr>
          <td class="td-center">${i+1}</td>
          <td>${_esc(it.desc || '—')}</td>
          <td class="td-center">${_esc(it.unit || '—')}</td>
          <td class="td-center td-num">${_fmt(it.qtyOrdered || 0)}</td>
          <td class="td-center td-num">${_fmt(it.qtyDelivered || 0)}</td>
          <td class="td-center td-num"><strong>${_fmt(it.qtyAccepted || 0)}</strong></td>
          <td class="td-center"><span style="background:#fff;color:${it.status==='ok'?'#2a8055':it.status==='partial'?'#B8902F':'#a32d3d'};border:1px solid ${it.status==='ok'?'#2a8055':it.status==='partial'?'#B8902F':'#a32d3d'};padding:3px 8px;border-radius:12px;font-size:10px;font-weight:700">${it.status==='ok'?'✅ OK':it.status==='partial'?'⚠️ Partiel':it.status==='refused'?'❌ Refusé':'—'}</span></td>
        </tr>`).join('')}
    </tbody>
  </table>
</div>

${opts.observations ? `
<div class="notes-block">
  <strong>📝 Observations / ملاحظات :</strong> ${_esc(opts.observations)}
</div>` : ''}

<div class="notes-block">
  <strong>✅ Vérifications effectuées :</strong>
  Conformité quantitative ☑️ — Conformité qualitative ☑️ — Conformité au BC ☑️ — Documents reçus (BL, certificats) ☑️
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">Livreur / Fournisseur</div>
    <div class="line">Signature</div>
  </div>
  <div class="sig-block">
    <div class="role">Magasinier</div>
    <div class="line">Réceptionné par</div>
  </div>
  <div class="sig-block">
    <div class="role">Conducteur de travaux</div>
    <div class="stamp-zone">VISA</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`BR_${num}`, body), `BR_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'bon_reception', number: num });
  },

  // 5.3 Bon de Sortie — وصل الخروج
  bonSortie(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `BS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const items  = opts.items || [];

    const body = `
${_buildHeader(tenant, _T('BON_SORTIE'), num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid-3">
    <div class="info-block">
      <h4>📤 Destination</h4>
      <p><strong>Chantier:</strong> ${_esc(opts.projectName || '—')}</p>
      ${opts.location ? `<p>📍 ${_esc(opts.location)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>👤 Demandeur</h4>
      <p><strong>${_esc(opts.requestedBy || '—')}</strong></p>
      ${opts.requesterRole ? `<p>${_esc(opts.requesterRole)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>📅 Date</h4>
      <p><strong>Sortie:</strong> ${_fmtDate(opts.date || _todayISO())}</p>
      <p><strong>Heure:</strong> ${_esc(opts.hour || '—')}</p>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">📦 Articles sortis du magasin / المواد الخارجة من المخزن</div>
  <table>
    <thead><tr>
      <th style="width:40px">N°</th>
      <th>Désignation</th>
      <th class="td-center" style="width:55px">U.</th>
      <th class="td-center" style="width:80px">Stock avant</th>
      <th class="td-center" style="width:80px">Qté sortie</th>
      <th class="td-center" style="width:80px">Stock restant</th>
      <th>Usage / Motif</th>
    </tr></thead>
    <tbody>
      ${items.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:#999;padding:24px">Aucun article</td></tr>' :
        items.map((it,i) => {
          const before = Number(it.stockBefore || 0);
          const out    = Number(it.qtyOut || 0);
          const after  = before - out;
          return `<tr>
            <td class="td-center">${i+1}</td>
            <td>${_esc(it.desc || '—')}</td>
            <td class="td-center">${_esc(it.unit || '—')}</td>
            <td class="td-center td-num">${_fmt(before)}</td>
            <td class="td-center td-num" style="color:#a32d3d;font-weight:900">−${_fmt(out)}</td>
            <td class="td-center td-num" style="color:${after<5?'#a32d3d':'#2a8055'};font-weight:700">${_fmt(after)}</td>
            <td style="font-size:11px">${_esc(it.usage || '—')}</td>
          </tr>`;
        }).join('')}
    </tbody>
  </table>
</div>

${opts.observations ? `
<div class="notes-block">
  <strong>📝 Observations :</strong> ${_esc(opts.observations)}
</div>` : ''}

<div class="signatures">
  <div class="sig-block">
    <div class="role">Magasinier</div>
    <div class="line">Sortie autorisée par</div>
  </div>
  <div class="sig-block">
    <div class="role">Réceptionnaire (chantier)</div>
    <div class="line">Reçu par</div>
  </div>
  <div class="sig-block">
    <div class="role">Conducteur de travaux</div>
    <div class="stamp-zone">VISA</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`BS_${num}`, body), `BS_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'bon_sortie', number: num });
  },

  // 5.4 Fiche de Suivi d'Équipement — بطاقة تتبع العتاد
  ficheSuiviEquip(opts) {
    opts = opts || {};
    const tenant = Auth.getTenant() || {};
    const num    = opts.number || `FSE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const equipment = opts.equipment || {};
    const usages = opts.usages || [];
    const maintenances = opts.maintenances || [];
    const totalFuel  = usages.reduce((s,u) => s + Number(u.fuel || 0), 0);
    const totalHours = usages.reduce((s,u) => s + Number(u.hours || 0), 0);

    const body = `
${_buildHeader(tenant, "FICHE DE SUIVI D'ÉQUIPEMENT", num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid">
    <div class="info-block">
      <h4>🚜 Équipement</h4>
      <p><strong>${_esc(equipment.name || opts.equipName || '—')}</strong></p>
      ${equipment.type ? `<p><strong>Type:</strong> ${_esc(equipment.type)}</p>` : ''}
      ${equipment.serial ? `<p><strong>N° Série:</strong> ${_esc(equipment.serial)}</p>` : ''}
      ${equipment.plate ? `<p><strong>Immatriculation:</strong> ${_esc(equipment.plate)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>📅 Période</h4>
      <p><strong>Du:</strong> ${_fmtDate(opts.from || _todayISO())}</p>
      <p><strong>Au:</strong> ${_fmtDate(opts.to || _todayISO())}</p>
      <p><strong>Conducteur:</strong> ${_esc(opts.operator || '—')}</p>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">⛽ Suivi d'utilisation et consommation</div>
  <table>
    <thead><tr>
      <th class="td-center" style="width:80px">Date</th>
      <th>Chantier</th>
      <th class="td-center" style="width:80px">H. début</th>
      <th class="td-center" style="width:80px">H. fin</th>
      <th class="td-center" style="width:80px">H. travail</th>
      <th class="td-center" style="width:90px">Carburant (L)</th>
      <th>Observations</th>
    </tr></thead>
    <tbody>
      ${usages.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:#999;padding:24px">Aucune utilisation</td></tr>' :
        usages.map(u => `<tr>
          <td class="td-center">${_fmtDate(u.date)}</td>
          <td>${_esc(u.project || '—')}</td>
          <td class="td-center td-num">${_esc(u.hourStart || '—')}</td>
          <td class="td-center td-num">${_esc(u.hourEnd || '—')}</td>
          <td class="td-center td-num"><strong>${_esc(u.hours || 0)} h</strong></td>
          <td class="td-center td-num">${_fmt(u.fuel || 0)}</td>
          <td style="font-size:11px">${_esc(u.notes || '')}</td>
        </tr>`).join('')}
      ${usages.length > 0 ? `<tr style="background:#fafafa !important">
        <td colspan="4" style="text-align:left;font-weight:900;color:#B8902F;padding:10px;border-top:2px solid #B8902F">TOTAL</td>
        <td class="td-center td-num" style="font-weight:900;color:#B8902F;padding:10px;border-top:2px solid #B8902F">${totalHours} h</td>
        <td class="td-center td-num" style="font-weight:900;color:#B8902F;padding:10px;border-top:2px solid #B8902F">${_fmt(totalFuel)} L</td>
        <td></td>
      </tr>` : ''}
    </tbody>
  </table>
</div>

${maintenances.length > 0 ? `
<div class="section">
  <div class="section-title">🔧 Historique de maintenance / تاريخ الصيانة</div>
  <table>
    <thead><tr>
      <th class="td-center" style="width:90px">Date</th>
      <th class="td-center" style="width:120px">Type</th>
      <th>Description</th>
      <th class="td-right" style="width:120px">Coût (DA)</th>
      <th class="td-center" style="width:90px">Prochaine</th>
    </tr></thead>
    <tbody>
      ${maintenances.map(m => `<tr>
        <td class="td-center">${_fmtDate(m.date)}</td>
        <td class="td-center"><span style="background:#fff; border-top:1.5px solid #B8902F;color:#B8902F;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">${_esc(m.type || '—')}</span></td>
        <td>${_esc(m.desc || '—')}</td>
        <td class="td-right td-num">${_fmt(m.cost || 0)}</td>
        <td class="td-center">${_fmtDate(m.nextDate)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<div class="notes-block">
  <strong>📌 Note :</strong> Cette fiche doit être tenue à jour quotidiennement et présentée lors des contrôles
  de gestion des équipements et des inventaires de consommation de carburant.
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">Conducteur</div>
    <div class="line">Signature</div>
  </div>
  <div class="sig-block">
    <div class="role">Chef de parc</div>
    <div class="line">Visa</div>
  </div>
  <div class="sig-block">
    <div class="role">Responsable matériel</div>
    <div class="stamp-zone">CACHET</div>
  </div>
</div>

${_buildFooter(num)}`;
    _openPrint(_wrap(`FSE_${num}`, body), `FSE_${num}`);
    if (typeof AuditLog !== 'undefined') AuditLog.log('export', 'documents', null, null, { type: 'fiche_suivi_equip', number: num });
  },

};

console.log('✅ DZDocs — وحدة الوثائق الجزائرية الاحترافية محمّلة (20+ نوع وثيقة)');

// ════════════════════════════════════════════════════════════════════
//  📁 DZArchive — نظام أرشفة الوثائق المولّدة
// ════════════════════════════════════════════════════════════════════
const DZ_DOC_REGISTRY = {
  proforma:         { category: 'commercial', label: { ar:'فاتورة شكلية', fr:'Facture Proforma' },    fn: 'factureProforma',  prefix: 'PRO',     icon: '📋' },
  devis:            { category: 'commercial', label: { ar:'كشف تقديري', fr:'Devis Estimatif' },       fn: 'devisEstimatif',   prefix: 'DEV',     icon: '📊' },
  bpu:              { category: 'commercial', label: { ar:'جدول أسعار', fr:'BPU' },                   fn: 'bpu',              prefix: 'BPU',     icon: '💰' },
  offre:            { category: 'commercial', label: { ar:'عرض خدمة', fr:'Offre Service' },           fn: 'offreService',     prefix: 'OFF',     icon: '🏢' },
  pv_ouverture:     { category: 'chantier',   label: { ar:'محضر بدء أشغال', fr:'PV Ouverture' },     fn: 'pvOuverture',      prefix: 'PV-OUV',  icon: '🚀' },
  attachement:      { category: 'chantier',   label: { ar:'كشف مرفقات', fr:'Attachement' },           fn: 'attachement',      prefix: 'ATT',     icon: '📐' },
  journal:          { category: 'chantier',   label: { ar:'يوميات ورشة', fr:'Journal Chantier' },     fn: 'journalChantier',  prefix: 'JC',      icon: '📔' },
  pv_reception_pro: { category: 'chantier',   label: { ar:'استلام مؤقت', fr:'PV Réception Prov.' },   fn: 'pvReception',      prefix: 'PV-PRO',  icon: '🤝', extraArgs: { kind: 'pro' } },
  pv_reception_def: { category: 'chantier',   label: { ar:'استلام نهائي', fr:'PV Réception Déf.' },   fn: 'pvReception',      prefix: 'PV-DEF',  icon: '✅', extraArgs: { kind: 'final' } },
  acompte:          { category: 'finance',    label: { ar:'فاتورة تسبيق', fr:'Facture Acompte' },     fn: 'factureAcompte',   prefix: 'ACO',     icon: '⏩' },
  situation:        { category: 'finance',    label: { ar:'كشف أشغال', fr:'Situation Travaux' },      fn: 'situationTravaux', prefix: 'SIT',     icon: '📈' },
  def_invoice:      { category: 'finance',    label: { ar:'فاتورة نهائية', fr:'Facture Définitive' }, fn: 'factureDefinitive',prefix: 'DEF',     icon: '🏁' },
  quittance:        { category: 'finance',    label: { ar:'وصل تسديد', fr:'Quittance' },              fn: 'quittance',        prefix: 'QUIT',    icon: '🧾' },
  paie:             { category: 'hr',         label: { ar:'كشف راتب', fr:'Bulletin Paie' },           fn: 'fichePaie',        prefix: 'PAIE',    icon: '💼' },
  cdd:              { category: 'hr',         label: { ar:'عقد CDD', fr:'Contrat CDD' },              fn: 'contract',         prefix: 'CONT-CDD', icon: '📝', extraArgs: { kind: 'cdd' } },
  cta:              { category: 'hr',         label: { ar:'عقد CTA', fr:'Contrat CTA' },              fn: 'contract',         prefix: 'CONT-CTA', icon: '🤝', extraArgs: { kind: 'cta' } },
  cdi:              { category: 'hr',         label: { ar:'عقد CDI', fr:'Contrat CDI' },              fn: 'contract',         prefix: 'CONT-CDI', icon: '🔒', extraArgs: { kind: 'cdi' } },
  pointage:         { category: 'hr',         label: { ar:'بطاقة حضور', fr:'Fiche Pointage' },         fn: 'fichePointage',    prefix: 'POINT',   icon: '⏱️' },
  attestation:      { category: 'hr',         label: { ar:'شهادة عمل', fr:'Attestation Travail' },    fn: 'attestationTravail',prefix: 'ATT-TRAV', icon: '📄' },
  commande:         { category: 'logistics',  label: { ar:'وصل طلب', fr:'Bon Commande' },             fn: 'bonCommande',      prefix: 'BC',      icon: '🛒' },
  reception:        { category: 'logistics',  label: { ar:'وصل استلام', fr:'Bon Réception' },         fn: 'bonReception',     prefix: 'BR',      icon: '📥' },
  sortie:           { category: 'logistics',  label: { ar:'وصل خروج', fr:'Bon Sortie' },              fn: 'bonSortie',        prefix: 'BS',      icon: '📤' },
  suivi:            { category: 'logistics',  label: { ar:'بطاقة تتبع عتاد', fr:'Suivi Équipement' }, fn: 'ficheSuiviEquip',  prefix: 'FSE',     icon: '🚜' },
};

window.DZ_DOC_REGISTRY = DZ_DOC_REGISTRY;

window.DZArchive = {

  save(kind, opts) {
    if (typeof Auth === 'undefined' || !Auth.getUser()) return null;
    const reg = DZ_DOC_REGISTRY[kind];
    if (!reg) return null;

    const tenant_id = Auth.getUser().tenant_id;
    const user_id   = Auth.getUser().id;
    const number    = opts.number || `${reg.prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const docName   = `${reg.label.ar} - ${number}`;

    let project_id = null, worker_id = null;
    try {
      if (opts.project && opts.project.id) project_id = Number(opts.project.id);
      if (opts.projectId)                  project_id = Number(opts.projectId);
      if (opts.worker && opts.worker.id)   worker_id  = Number(opts.worker.id);
      if (opts.workerId)                   worker_id  = Number(opts.workerId);
    } catch(_) {}

    const cleanOpts = JSON.parse(JSON.stringify(opts || {}));
    delete cleanOpts.html;
    delete cleanOpts._isReprint;

    const record = {
      id:          Date.now() * 1000 + Math.floor(Math.random() * 1000),
      tenant_id, project_id, worker_id,
      name:        docName,
      category:    reg.category,
      type:        kind,
      doc_kind:    kind,
      doc_number:  number,
      url:         null,
      size:        0,
      date:        new Date().toISOString().split('T')[0],
      uploader_id: user_id,
      meta_data:   cleanOpts,
      created_at:  new Date().toISOString(),
    };

    try {
      const existing = (typeof DB !== 'undefined') ? (DB.get('documents') || []) : [];
      existing.unshift(record);
      if (typeof DB !== 'undefined') DB.set('documents', existing);
      if (typeof sbSync === 'function') {
        sbSync('documents', record, 'POST').catch(e => console.warn('[DZArchive]', e.message));
      }
      if (typeof AuditLog !== 'undefined' && AuditLog.log) {
        AuditLog.log('archive', 'documents', record.id, null, { kind, number });
      }
      console.log(`📁 [DZArchive] saved: ${kind} #${number}`);
      return record;
    } catch (e) {
      console.warn('[DZArchive] save failed:', e.message);
      return null;
    }
  },

  list(filters) {
    if (typeof Auth === 'undefined' || !Auth.getUser()) return [];
    const tid = Auth.getUser().tenant_id;
    let docs = (typeof DB !== 'undefined') ? (DB.get('documents') || []) : [];
    docs = docs.filter(d => d.tenant_id === tid && d.doc_kind);
    filters = filters || {};
    if (filters.kind)       docs = docs.filter(d => d.doc_kind === filters.kind);
    if (filters.category)   docs = docs.filter(d => d.category === filters.category);
    if (filters.project_id) docs = docs.filter(d => d.project_id === Number(filters.project_id));
    if (filters.worker_id)  docs = docs.filter(d => d.worker_id  === Number(filters.worker_id));
    if (filters.search) {
      const q = filters.search.toLowerCase();
      docs = docs.filter(d => (d.name||'').toLowerCase().includes(q) || (d.doc_number||'').toLowerCase().includes(q));
    }
    return docs.sort((a,b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
  },

  get(id) {
    const docs = (typeof DB !== 'undefined') ? (DB.get('documents') || []) : [];
    return docs.find(d => String(d.id) === String(id));
  },

  reprint(id) {
    const doc = this.get(id);
    if (!doc) { if (typeof Toast !== 'undefined') Toast.error('الوثيقة غير موجودة'); return false; }
    const reg = DZ_DOC_REGISTRY[doc.doc_kind];
    if (!reg) { if (typeof Toast !== 'undefined') Toast.error('نوع وثيقة غير معروف'); return false; }
    const fn = window.DZDocs[reg.fn];
    if (typeof fn !== 'function') return false;
    const opts = Object.assign({}, doc.meta_data || {}, reg.extraArgs || {});
    if (doc.doc_number && !opts.number) opts.number = doc.doc_number;
    opts._isReprint = true;
    try {
      fn(opts);
      if (typeof Toast !== 'undefined') Toast.success('✅ تم إعادة فتح الوثيقة');
      return true;
    } catch (e) {
      console.error('[DZArchive] reprint failed:', e);
      if (typeof Toast !== 'undefined') Toast.error('فشل: ' + e.message);
      return false;
    }
  },

  delete(id) {
    if (typeof Auth === 'undefined' || !Auth.getUser()) return false;
    const tid = Auth.getUser().tenant_id;
    const docs = (typeof DB !== 'undefined') ? (DB.get('documents') || []) : [];
    const doc = docs.find(d => String(d.id) === String(id) && d.tenant_id === tid);
    if (!doc) return false;
    const filtered = docs.filter(d => String(d.id) !== String(id));
    if (typeof DB !== 'undefined') DB.set('documents', filtered);
    if (typeof sbSyncDelete === 'function') {
      sbSyncDelete('documents', id).catch(e => console.warn('[DZArchive]', e.message));
    }
    if (typeof AuditLog !== 'undefined' && AuditLog.log) {
      AuditLog.log('delete', 'documents', id, doc, null);
    }
    return true;
  },

  stats() {
    const all = this.list();
    const byCategory = { commercial: 0, chantier: 0, finance: 0, hr: 0, logistics: 0 };
    all.forEach(d => { if (byCategory[d.category] !== undefined) byCategory[d.category]++; });
    return { total: all.length, byCategory };
  },

  // ── تصدير كل الأرشيف كملف JSON على الحاسوب ──
  exportAll() {
    const all = this.list();
    if (all.length === 0) {
      if (typeof Toast !== 'undefined') Toast.error('لا توجد وثائق للتصدير');
      return;
    }
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      if (typeof Toast !== 'undefined') Toast.error('متصفحك لا يدعم التصدير');
      return;
    }
    const tenantName = (typeof Auth !== 'undefined') ? (Auth.getTenant()?.name || 'archive') : 'archive';
    const dataStr = JSON.stringify({
      version: '1.0',
      exported_at: new Date().toISOString(),
      tenant_name: tenantName,
      count: all.length,
      documents: all
    }, null, 2);
    try {
      const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archive_${tenantName.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (typeof Toast !== 'undefined') Toast.success(`✅ تم تصدير ${all.length} وثيقة`);
    } catch(e) {
      console.error('[DZArchive.exportAll]', e);
      if (typeof Toast !== 'undefined') Toast.error('فشل التصدير: ' + e.message);
    }
  },

  // ── استيراد وثائق من ملف JSON (محفوظ سابقاً) ──
  async importFromFile(file) {
    if (!file) return;
    if (typeof Auth === 'undefined' || !Auth.getUser()) return;
    const tid = Auth.getUser().tenant_id;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.documents || !Array.isArray(data.documents)) {
        if (typeof Toast !== 'undefined') Toast.error('ملف غير صالح');
        return;
      }
      // إضافة الوثائق مع إعطائها IDs جديدة لتجنب التضارب
      const existing = (typeof DB !== 'undefined') ? (DB.get('documents') || []) : [];
      const existingIds = new Set(existing.map(d => d.id));
      let imported = 0, skipped = 0;
      const newDocs = data.documents.map(doc => {
        // تجنّب الازدواج: إذا doc_number موجود مسبقاً، تخطّى
        if (existing.some(e => e.doc_number === doc.doc_number && e.doc_kind === doc.doc_kind)) {
          skipped++;
          return null;
        }
        imported++;
        return {
          ...doc,
          id: existingIds.has(doc.id) ? Date.now()*1000 + Math.floor(Math.random()*1000) : doc.id,
          tenant_id: tid,  // ✅ ربط مع المؤسسة الحالية
          uploader_id: Auth.getUser().id,
        };
      }).filter(Boolean);

      const merged = [...newDocs, ...existing];
      if (typeof DB !== 'undefined') DB.set('documents', merged);

      // مزامنة مع Supabase
      if (typeof sbSync === 'function') {
        for (const doc of newDocs) {
          sbSync('documents', doc, 'POST').catch(e => console.warn('[import]', e.message));
        }
      }
      if (typeof AuditLog !== 'undefined' && AuditLog.log) {
        AuditLog.log('import', 'documents', null, null, { imported, skipped });
      }

      if (typeof Toast !== 'undefined') {
        Toast.success(`✅ تم استيراد ${imported} وثيقة` + (skipped > 0 ? ` (تخطّي ${skipped} مكرّرة)` : ''));
      }
      // إعادة تحميل الصفحة
      if (typeof App !== 'undefined') setTimeout(() => App.navigate('archive'), 600);
    } catch (e) {
      console.error('[DZArchive.import]', e);
      if (typeof Toast !== 'undefined') Toast.error('❌ خطأ في الملف: ' + e.message);
    }
  },

  // ── إعداد file input مخفي للاستيراد ──
  triggerImport() {
    let inp = document.getElementById('dzArchImportInput');
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'file';
      inp.id = 'dzArchImportInput';
      inp.accept = '.json,application/json';
      inp.style.display = 'none';
      inp.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.importFromFile(e.target.files[0]);
          e.target.value = ''; // إعادة تعيين للسماح برفع نفس الملف مرة أخرى
        }
      });
      document.body.appendChild(inp);
    }
    inp.click();
  },

};

// ─── Hook: حفظ تلقائي لكل وثيقة مولّدة ───
(function _installArchiveHook() {
  const fnToKindsMap = {
    factureProforma:    ['proforma'],
    devisEstimatif:     ['devis'],
    bpu:                ['bpu'],
    offreService:       ['offre'],
    pvOuverture:        ['pv_ouverture'],
    attachement:        ['attachement'],
    journalChantier:    ['journal'],
    pvReception:        ['pv_reception_pro', 'pv_reception_def'],
    factureAcompte:     ['acompte'],
    situationTravaux:   ['situation'],
    factureDefinitive:  ['def_invoice'],
    quittance:          ['quittance'],
    fichePaie:          ['paie'],
    contract:           ['cdd', 'cta', 'cdi'],
    fichePointage:      ['pointage'],
    attestationTravail: ['attestation'],
    bonCommande:        ['commande'],
    bonReception:       ['reception'],
    bonSortie:          ['sortie'],
    ficheSuiviEquip:    ['suivi'],
  };

  Object.entries(fnToKindsMap).forEach(([fnName, kinds]) => {
    const orig = window.DZDocs[fnName];
    if (typeof orig !== 'function') return;
    window.DZDocs[fnName] = function(opts) {
      opts = opts || {};
      const result = orig.call(this, opts);
      if (!opts._isReprint) {
        try {
          let kind = kinds[0];
          if (kinds.length > 1 && opts.kind) {
            const map = { 'pro':'pv_reception_pro', 'final':'pv_reception_def', 'cdd':'cdd', 'cta':'cta', 'cdi':'cdi' };
            const m = map[opts.kind];
            if (m && kinds.includes(m)) kind = m;
          }
          window.DZArchive.save(kind, opts);
        } catch(e) {
          console.warn('[DZArchive hook]', e.message);
        }
      }
      return result;
    };
  });

  console.log('📁 DZArchive — نظام الأرشفة مُفعّل (22 نوع وثيقة)');
})();

// ── تحميل اللغة المحفوظة عند الإقلاع ──
try {
  const _savedDocLang = localStorage.getItem('sbtp_doc_lang');
  if (_savedDocLang === 'ar' || _savedDocLang === 'fr') {
    _docLang = _savedDocLang;
    console.log('[DZDocs] لغة الوثيقة المحفوظة:', _savedDocLang);
  }
} catch(_) {}

})();
