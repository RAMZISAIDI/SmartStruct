/* ════════════════════════════════════════════════════════════════════
   SmartStruct v7.3 — وحدة الوثائق الإدارية والمالية الجزائرية
   ════════════════════════════════════════════════════════════════════
   DZDocs : مولد احترافي لـ 20+ وثيقة قانونية ومالية حسب التشريع الجزائري
   
   📚 الأقسام:
   ① الوثائق التجارية (Pre-Contract)
      • Facture Proforma  — الفاتورة الشكلية
      • Devis Estimatif   — الكشف الكمي والتقديري
      • BPU              — جدول الأسعار الوحدوية
      • Offre de Service  — عرض الخدمة
      
   ② وثائق الميدان (Execution)
      • PV d'Ouverture    — محضر بدء الأشغال
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
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
  color: #1a1a1a; background: #f4f4f6; padding: 24px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.no-print {
  display: flex; gap: 10px; margin-bottom: 18px; justify-content: flex-start; flex-wrap: wrap;
}
.btn-print {
  padding: 9px 22px; background: #E8B84B; color: #1a1000;
  border: none; border-radius: 8px; cursor: pointer;
  font-family: inherit; font-size: 13px; font-weight: 700;
}
.btn-print:hover { background: #d4a83a; }
.btn-close {
  padding: 9px 18px; background: #2a2a2a; color: #ccc;
  border: none; border-radius: 8px; cursor: pointer;
  font-family: inherit; font-size: 13px;
}
.page {
  background: #fff; max-width: 820px; margin: 0 auto;
  border-radius: 4px; overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,.12);
}
/* === Header قانوني موحد === */
.dz-header {
  background: #141414; padding: 22px 32px;
  display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;
}
.dz-brand { display: flex; align-items: center; gap: 16px; flex: 1; }
.dz-brand img { height: 56px; max-width: 140px; object-fit: contain; border-radius: 4px; background: #fff; padding: 4px; }
.dz-brand-text .name { font-size: 18px; font-weight: 900; color: #E8B84B; letter-spacing: .3px; }
.dz-brand-text .legal { font-size: 9.5px; color: #aaa; margin-top: 3px; line-height: 1.6; }
.dz-doc-title { text-align: left; }
.dz-doc-title .label { font-size: 22px; font-weight: 900; color: #fff; letter-spacing: 1.5px; }
.dz-doc-title .num { font-size: 12px; color: #E8B84B; font-weight: 700; margin-top: 4px; }
.dz-doc-title .date { font-size: 10px; color: #999; margin-top: 2px; }
.gold-bar { height: 3px; background: linear-gradient(90deg,#C49030,#E8B84B,#C49030); }
/* === Sections === */
.section { padding: 18px 32px; border-bottom: 1px solid #f0f0f0; }
.section:last-child { border-bottom: none; }
.section-title {
  font-size: 11px; font-weight: 700; color: #888;
  text-transform: uppercase; letter-spacing: .8px; margin-bottom: 10px;
}
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.info-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.info-block { background: #fafafa; padding: 12px 14px; border-radius: 6px; border-right: 3px solid #E8B84B; }
.info-block h4 { font-size: 11px; color: #888; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; }
.info-block p { font-size: 12.5px; line-height: 1.7; color: #222; margin: 2px 0; }
.info-block strong { color: #111; font-weight: 700; }
/* === Tables === */
table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 10px 0; }
thead th {
  background: #141414; color: #E8B84B;
  padding: 9px 12px; text-align: right;
  font-size: 10px; font-weight: 700; letter-spacing: .4px;
}
thead th:last-child, thead th.td-right { text-align: left; }
tbody td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; color: #222; vertical-align: top; }
tbody tr:last-child td { border-bottom: none; }
tbody tr:nth-child(even) td { background: #fafafa; }
.td-right { text-align: left; font-variant-numeric: tabular-nums; }
.td-center { text-align: center; }
.td-num { font-family: 'JetBrains Mono', monospace; font-weight: 600; }
/* === Totaux === */
.totals-section { display: flex; justify-content: flex-end; padding: 16px 32px; border-top: 1px solid #f0f0f0; }
.totals-box { width: 320px; }
.total-row { display: flex; justify-content: space-between; padding: 6px 4px; font-size: 12.5px; color: #555; border-bottom: 1px solid #f4f4f4; }
.total-row:last-child { border: none; }
.total-final {
  display: flex; justify-content: space-between;
  margin-top: 8px; padding: 11px 14px;
  background: #141414; border-radius: 6px;
  font-size: 14px; font-weight: 900; color: #E8B84B;
}
/* === Signatures === */
.signatures { display: flex; justify-content: space-between; gap: 30px; padding: 30px 32px 16px; }
.sig-block { flex: 1; text-align: center; }
.sig-block .role { font-size: 11px; color: #777; margin-bottom: 50px; font-weight: 700; text-transform: uppercase; }
.sig-block .line { border-top: 1px solid #1a1a1a; padding-top: 6px; font-size: 10px; color: #555; }
.stamp-zone {
  border: 2px dashed #E8B84B; border-radius: 6px;
  padding: 20px; min-height: 80px;
  text-align: center; color: #C49030; font-size: 10px; font-weight: 700;
}
/* === Footer === */
.dz-footer {
  background: #141414; padding: 10px 32px;
  display: flex; justify-content: space-between; align-items: center;
}
.dz-footer span { font-size: 10px; color: #666; }
.dz-footer .gold-text { color: #E8B84B; font-weight: 700; }
/* === Articles juridiques === */
.article { padding: 10px 32px; }
.article h3 { font-size: 13px; color: #1a1a1a; font-weight: 900; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 2px solid #E8B84B; display: inline-block; }
.article p { font-size: 12px; line-height: 1.9; color: #333; text-align: justify; }
/* === Big amount === */
.big-amount {
  font-size: 28px; font-weight: 900; color: #E8B84B;
  text-align: center; padding: 16px; background: #141414;
  border-radius: 8px; letter-spacing: 1px; margin: 16px 32px;
}
/* === Notes === */
.notes-block {
  margin: 8px 32px;
  padding: 10px 14px;
  background: #fafafa;
  border-left: 3px solid #E8B84B;
  border-radius: 0 4px 4px 0;
  font-size: 11.5px; color: #555; line-height: 1.7;
}
/* === Watermark === */
.watermark {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-50%) rotate(-30deg);
  font-size: 110px; font-weight: 900; color: #E8B84B;
  opacity: .04; pointer-events: none; z-index: 0;
  letter-spacing: 8px;
}
.page { position: relative; }
.page > * { position: relative; z-index: 1; }
/* === République === */
.republique {
  text-align: center; padding: 12px 32px 0;
  font-size: 11px; color: #555; line-height: 1.6; font-weight: 600;
}
.republique .ar { font-size: 12.5px; color: #1a1a1a; font-weight: 700; }
@media print {
  body { background: #fff; padding: 0; }
  .no-print { display: none !important; }
  .page { box-shadow: none; border-radius: 0; max-width: 100%; }
  @page { size: A4; margin: 1cm; }
}
`;

// ════════════════════════════════════════════════════════════════════
//  بناء الترويسة القانونية الموحدة
// ════════════════════════════════════════════════════════════════════
function _buildHeader(tenant, docLabel, docNumber, docDate) {
  const logo = _getLogo();
  const lines = [];
  if (tenant?.rc_number) lines.push(`RC: ${_esc(tenant.rc_number)}`);
  if (tenant?.nif)       lines.push(`NIF: ${_esc(tenant.nif)}`);
  if (tenant?.nis)       lines.push(`NIS: ${_esc(tenant.nis)}`);
  if (tenant?.article_imp) lines.push(`Art. d'imp: ${_esc(tenant.article_imp)}`);
  if (tenant?.address)   lines.push(`📍 ${_esc(tenant.address)}${tenant?.wilaya ? ', ' + _esc(tenant.wilaya) : ''}`);
  if (tenant?.phone)     lines.push(`📞 ${_esc(tenant.phone)}`);
  if (tenant?.rib)       lines.push(`RIB: ${_esc(tenant.rib)}`);

  return `
<div class="dz-header">
  <div class="dz-brand">
    ${logo ? `<img src="${_esc(logo)}" alt="Logo">` : ''}
    <div class="dz-brand-text">
      <div class="name">▦ ${_esc(tenant?.name || 'مؤسستي')}</div>
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
  <span>SmartStruct — منصة إدارة مشاريع المقاولة الجزائرية</span>
  <span class="gold-text">${_esc(docNumber || '')} | ${_today()}</span>
</div>`;
}

// ════════════════════════════════════════════════════════════════════
//  فتح نافذة الطباعة وحفظ PDF
// ════════════════════════════════════════════════════════════════════
function _openPrint(html, filename, autoPrint=false) {
  const win = window.open('', '_blank', 'width=920,height=1100');
  if (!win) {
    if (typeof Toast !== 'undefined') Toast.error('السماح بالنوافذ المنبثقة مطلوب');
    else alert('السماح بالنوافذ المنبثقة مطلوب');
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
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>${_esc(title)}</title>
<style>${_SHARED_CSS}</style>
</head>
<body>
<div class="no-print">
  <button class="btn-print" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
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
${_buildHeader(tenant, 'FACTURE PROFORMA', num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid">
    <div class="info-block">
      <h4>👤 Client / العميل</h4>
      <p><strong>${_esc(opts.clientName || '—')}</strong></p>
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
      <th>Désignation / التعيين</th>
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
    <div class="total-row"><span>Sous-total HT</span><span class="td-num">${_fmt(ht)} DA</span></div>
    <div class="total-row"><span>TVA ${tvaRate}%</span><span class="td-num">${_fmt(tva)} DA</span></div>
    <div class="total-final"><span>TOTAL TTC</span><span class="td-num">${_fmt(ttc)} DA</span></div>
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
${_buildHeader(tenant, 'DEVIS ESTIMATIF', num, _fmtDate(opts.date || _todayISO()))}

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
      <th>Désignation / التعيين</th>
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
      <tr style="background:#fff8e1 !important">
        <td colspan="5" style="text-align:left;font-weight:900;color:#8a6000">Sous-total LOT ${lotIdx+1}</td>
        <td class="td-right td-num" style="font-weight:900;color:#8a6000">
          ${_fmt((lot.items || []).reduce((s,it) => s + Number(it.total||0), 0))} DA
        </td>
      </tr>
    </tbody>
  </table>
</div>
`).join('')}

<div class="totals-section">
  <div class="totals-box">
    <div class="total-row"><span>Sous-total HT</span><span class="td-num">${_fmt(ht)} DA</span></div>
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
${_buildHeader(tenant, 'BORDEREAU DES PRIX UNITAIRES', num, _fmtDate(opts.date || _todayISO()))}

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
  <div class="section-title">💰 Liste des prix unitaires / قائمة الأسعار الوحدوية</div>
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
${_buildHeader(tenant, 'OFFRE DE SERVICE', num, _fmtDate(opts.date || _todayISO()))}

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

  // 2.1 PV d'Ouverture de Chantier — محضر بدء الأشغال
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
            <td class="td-center"><span style="color:${pct>=100?'#0a6e3f':pct>=50?'#8a6000':'#c0392b'};font-weight:700">${pct}%</span></td>
            <td class="td-right td-num">${_fmt(it.price || 0)}</td>
            <td class="td-right td-num"><strong>${_fmt(amount)}</strong></td>
          </tr>`;
        }).join('')}
      ${items.length > 0 ? `<tr style="background:#141414 !important">
        <td colspan="7" style="text-align:left;font-weight:900;color:#E8B84B;padding:12px">TOTAL EXÉCUTÉ HT</td>
        <td class="td-right td-num" style="font-weight:900;color:#E8B84B;padding:12px">${_fmt(total)} DA</td>
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
${_buildHeader(tenant, 'JOURNAL DE CHANTIER', num, _fmtDate(opts.date || _todayISO()))}

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
          <td style="font-size:11px;color:${d.incident?'#c0392b':'#555'}">${_esc(d.notes || '—')}</td>
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
    const label  = isFinal ? "PV DE RÉCEPTION DÉFINITIVE" : "PV DE RÉCEPTION PROVISOIRE";
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
        <td class="td-center"><span style="background:${r.status==='resolved'?'#d4f5e2':'#fff8e1'};color:${r.status==='resolved'?'#0a6e3f':'#8a6000'};padding:3px 8px;border-radius:12px;font-size:10px;font-weight:700">${r.status==='resolved'?'✅ Levée':'⏳ En cours'}</span></td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : `
<div class="article">
  <h3>Article 3 : Réserves</h3>
  <p style="color:#0a6e3f;font-weight:700">✅ Aucune réserve n'a été émise lors de la présente réception.<br>
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
${_buildHeader(tenant, "FACTURE D'ACOMPTE", num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid-3">
    <div class="info-block">
      <h4>👤 Client</h4>
      <p><strong>${_esc(opts.clientName || '—')}</strong></p>
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
    ${acompte > 0 ? `<div class="total-row" style="color:#c0392b"><span>− Acompte versé</span><span class="td-num">${_fmt(acompte)} DA</span></div>` : ''}
    <div class="total-row" style="color:#c0392b"><span>− Retenue de garantie 5%</span><span class="td-num">${_fmt(retenue)} DA</span></div>
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
${_buildHeader(tenant, 'FACTURE DÉFINITIVE', num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid">
    <div class="info-block">
      <h4>👤 Client / Maître d'ouvrage</h4>
      <p><strong>${_esc(opts.clientName || opts.maitreOuvrage || '—')}</strong></p>
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
      <tr style="background:#141414 !important">
        <td style="color:#E8B84B;font-weight:900;padding:12px">MONTANT TOTAL TTC</td>
        <td class="td-right td-num" style="color:#E8B84B;font-weight:900;padding:12px">${_fmt(total)}</td>
      </tr>
      ${acompteSum > 0 ? `<tr style="color:#c0392b">
        <td>− Acomptes versés</td>
        <td class="td-right td-num">${_fmt(acompteSum)}</td>
      </tr>` : ''}
      ${sitSum > 0 ? `<tr style="color:#c0392b">
        <td>− Situations antérieures payées</td>
        <td class="td-right td-num">${_fmt(sitSum)}</td>
      </tr>` : ''}
      <tr style="color:#c0392b">
        <td>− Retenue de garantie 5%</td>
        <td class="td-right td-num">${_fmt(retenue)}</td>
      </tr>
      <tr style="background:#0a6e3f !important">
        <td style="color:#fff;font-weight:900;padding:12px">NET À PAYER</td>
        <td class="td-right td-num" style="color:#fff;font-weight:900;padding:12px;font-size:14px">${_fmt(netToPay)} DA</td>
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
${_buildHeader(tenant, 'QUITTANCE DE PAIEMENT', num, _fmtDate(opts.date || _todayISO()))}

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

    const baseSalary = Number(opts.baseSalary || worker.monthly_base || (worker.daily_salary || 0) * 26);
    const daysWorked = Number(opts.daysWorked || 26);
    const overtime   = Number(opts.overtime || 0);
    const bonuses    = Number(opts.bonuses || 0);
    const transport  = Number(opts.transport || 0);

    const grossSalary = baseSalary + overtime + bonuses + transport;
    // Algerian rates: CNAS employee 9% (cotis salariales)
    const cnas = Math.round(grossSalary * 0.09);
    const taxableBase = grossSalary - cnas;
    // IRG (simplified bracket — most workers fall in low bracket)
    let irg = 0;
    if (taxableBase > 30000) {
      if (taxableBase <= 35000) irg = (taxableBase - 30000) * 0.20;
      else if (taxableBase <= 40000) irg = 1000 + (taxableBase - 35000) * 0.23;
      else if (taxableBase <= 80000) irg = 2150 + (taxableBase - 40000) * 0.27;
      else if (taxableBase <= 160000) irg = 12950 + (taxableBase - 80000) * 0.30;
      else if (taxableBase <= 320000) irg = 36950 + (taxableBase - 160000) * 0.33;
      else irg = 89750 + (taxableBase - 320000) * 0.35;
      irg = Math.round(irg);
    }
    const otherDeductions = Number(opts.otherDeductions || 0);
    const netSalary = grossSalary - cnas - irg - otherDeductions;

    const body = `
${_buildHeader(tenant, 'BULLETIN DE PAIE', num, _fmtDate(opts.date || _todayISO()))}

<div class="section">
  <div class="info-grid">
    <div class="info-block">
      <h4>👤 Employé / العامل</h4>
      <p><strong>${_esc(worker.full_name || opts.workerName || '—')}</strong></p>
      ${worker.role ? `<p><strong>Fonction:</strong> ${_esc(worker.role)}</p>` : ''}
      ${worker.national_id ? `<p><strong>N° CNI:</strong> ${_esc(worker.national_id)}</p>` : ''}
      ${worker.hire_date ? `<p><strong>Embauché(e) le:</strong> ${_fmtDate(worker.hire_date)}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>📅 Période / الفترة</h4>
      <p><strong>Mois:</strong> ${_esc(opts.month || new Date().toLocaleString('fr-DZ', { month:'long', year:'numeric' }))}</p>
      <p><strong>Jours travaillés:</strong> ${daysWorked}</p>
      <p><strong>Type contrat:</strong> ${_esc(worker.contract_type === 'monthly' ? 'CDI / Mensuel' : (worker.contract_type === 'daily' ? 'Journalier' : '—'))}</p>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">💰 Gains / المكتسبات</div>
  <table>
    <thead><tr>
      <th>Désignation</th>
      <th class="td-center" style="width:90px">Base</th>
      <th class="td-center" style="width:80px">Taux</th>
      <th class="td-right" style="width:140px">Montant (DA)</th>
    </tr></thead>
    <tbody>
      <tr>
        <td>Salaire de base</td>
        <td class="td-center td-num">${daysWorked} j</td>
        <td class="td-center">—</td>
        <td class="td-right td-num"><strong>${_fmt(baseSalary)}</strong></td>
      </tr>
      ${overtime > 0 ? `<tr>
        <td>Heures supplémentaires</td>
        <td class="td-center">—</td>
        <td class="td-center">+50%</td>
        <td class="td-right td-num">${_fmt(overtime)}</td>
      </tr>` : ''}
      ${bonuses > 0 ? `<tr>
        <td>Primes / Indemnités</td>
        <td class="td-center">—</td>
        <td class="td-center">—</td>
        <td class="td-right td-num">${_fmt(bonuses)}</td>
      </tr>` : ''}
      ${transport > 0 ? `<tr>
        <td>Indemnité de transport</td>
        <td class="td-center">—</td>
        <td class="td-center">—</td>
        <td class="td-right td-num">${_fmt(transport)}</td>
      </tr>` : ''}
      <tr style="background:#fff8e1 !important">
        <td colspan="3" style="font-weight:900;color:#8a6000">SALAIRE BRUT</td>
        <td class="td-right td-num" style="font-weight:900;color:#8a6000">${_fmt(grossSalary)}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">📉 Retenues / الاقتطاعات</div>
  <table>
    <thead><tr>
      <th>Désignation</th>
      <th class="td-center" style="width:120px">Base imposable</th>
      <th class="td-center" style="width:80px">Taux</th>
      <th class="td-right" style="width:140px">Montant (DA)</th>
    </tr></thead>
    <tbody>
      <tr>
        <td>CNAS — Cotisation sécurité sociale (part salariale)</td>
        <td class="td-center td-num">${_fmt(grossSalary)}</td>
        <td class="td-center">9.00%</td>
        <td class="td-right td-num" style="color:#c0392b">−${_fmt(cnas)}</td>
      </tr>
      <tr>
        <td>IRG — Impôt sur le revenu global</td>
        <td class="td-center td-num">${_fmt(taxableBase)}</td>
        <td class="td-center">Barème</td>
        <td class="td-right td-num" style="color:#c0392b">−${_fmt(irg)}</td>
      </tr>
      ${otherDeductions > 0 ? `<tr>
        <td>Autres retenues (avances, prêts...)</td>
        <td class="td-center">—</td>
        <td class="td-center">—</td>
        <td class="td-right td-num" style="color:#c0392b">−${_fmt(otherDeductions)}</td>
      </tr>` : ''}
      <tr style="background:#f8d7da !important">
        <td colspan="3" style="font-weight:900;color:#721c24">TOTAL RETENUES</td>
        <td class="td-right td-num" style="font-weight:900;color:#721c24">−${_fmt(cnas + irg + otherDeductions)}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="big-amount">
  NET À PAYER : ${_fmt(netSalary)} DA
</div>

<div class="notes-block">
  <strong>ℹ️ Cotisations patronales (à la charge de l'employeur, non déduites du salaire) :</strong>
  CNAS 26% sur salaire brut = ${_fmt(Math.round(grossSalary * 0.26))} DA<br>
  <strong>ℹ️ كشف الراتب وفقاً للقانون رقم 90-11 المتعلق بعلاقات العمل والقانون رقم 11-13 المعدل لقانون الضرائب.</strong>
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="role">L'Employé(e) / العامل</div>
    <div class="line">Signature pour réception</div>
  </div>
  <div class="sig-block">
    <div class="role">L'Employeur / صاحب العمل</div>
    <div class="stamp-zone">CACHET ET SIGNATURE</div>
  </div>
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
    const kindLabel = { cdd: 'CONTRAT À DURÉE DÉTERMINÉE', cta: 'CONTRAT DE TRAVAIL AIDÉ (CTA-ANEM)', cdi: 'CONTRAT À DURÉE INDÉTERMINÉE' }[kind] || 'CONTRAT DE TRAVAIL';
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
    <strong>Et Monsieur/Madame ${_esc(worker.full_name || '—')}</strong>,
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
${_buildHeader(tenant, 'FICHE DE POINTAGE', num, _fmtDate(opts.date || _todayISO()))}

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
          <td class="td-center td-num" style="color:${d.overtime>0?'#0a6e3f':'#999'}">${_esc(d.overtime || 0)} h</td>
          <td style="font-size:11px">${_esc(d.notes || '')}</td>
        </tr>`).join('')}
      <tr style="background:#141414 !important">
        <td colspan="3" style="text-align:left;font-weight:900;color:#E8B84B;padding:12px">TOTAL</td>
        <td class="td-center td-num" style="font-weight:900;color:#E8B84B;padding:12px">${totalHours - totalOT} h</td>
        <td class="td-center td-num" style="font-weight:900;color:#E8B84B;padding:12px">${totalOT} h</td>
        <td style="color:#E8B84B;font-weight:700;padding:12px">${days.length} jour(s)</td>
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
${_buildHeader(tenant, 'ATTESTATION DE TRAVAIL', num, _fmtDate(opts.date || _todayISO()))}

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
    <p style="font-size:18px;font-weight:900;color:#1a1a1a;letter-spacing:1px">
      ${_esc(worker.full_name || opts.workerName || '—')}
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
${_buildHeader(tenant, 'BON DE COMMANDE', num, _fmtDate(opts.date || _todayISO()))}

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
    <div class="total-row"><span>Sous-total HT</span><span class="td-num">${_fmt(ht)} DA</span></div>
    <div class="total-row"><span>TVA ${tvaRate}%</span><span class="td-num">${_fmt(tva)} DA</span></div>
    <div class="total-final"><span>TOTAL TTC</span><span class="td-num">${_fmt(ttc)} DA</span></div>
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
${_buildHeader(tenant, 'BON DE RÉCEPTION', num, _fmtDate(opts.date || _todayISO()))}

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
          <td class="td-center"><span style="background:${it.status==='ok'?'#d4f5e2':it.status==='partial'?'#fff8e1':'#f8d7da'};color:${it.status==='ok'?'#0a6e3f':it.status==='partial'?'#8a6000':'#721c24'};padding:3px 8px;border-radius:12px;font-size:10px;font-weight:700">${it.status==='ok'?'✅ OK':it.status==='partial'?'⚠️ Partiel':it.status==='refused'?'❌ Refusé':'—'}</span></td>
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
${_buildHeader(tenant, 'BON DE SORTIE', num, _fmtDate(opts.date || _todayISO()))}

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
            <td class="td-center td-num" style="color:#c0392b;font-weight:900">−${_fmt(out)}</td>
            <td class="td-center td-num" style="color:${after<5?'#c0392b':'#0a6e3f'};font-weight:700">${_fmt(after)}</td>
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
      ${usages.length > 0 ? `<tr style="background:#141414 !important">
        <td colspan="4" style="text-align:left;font-weight:900;color:#E8B84B;padding:10px">TOTAL</td>
        <td class="td-center td-num" style="font-weight:900;color:#E8B84B;padding:10px">${totalHours} h</td>
        <td class="td-center td-num" style="font-weight:900;color:#E8B84B;padding:10px">${_fmt(totalFuel)} L</td>
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
        <td class="td-center"><span style="background:#fff8e1;color:#8a6000;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">${_esc(m.type || '—')}</span></td>
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

})();
