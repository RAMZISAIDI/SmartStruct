'use strict';

/* ══════════════════════════════════════════════════════
   DATABASE — localStorage
══════════════════════════════════════════════════════ */
// ══════════════════════════════════════════
//  SmartStruct — Logo SVG Generator
// ══════════════════════════════════════════
function ssLogo(size=22, dark=false) {
  const c1 = dark ? '#09120A' : '#F5D07A';
  const c2 = dark ? '#09120A' : '#C49030';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="${size}" height="${size}">
    <defs>
      <linearGradient id="ssG${size}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect x="4" y="5" width="28" height="5" rx="2.5" fill="url(#ssG${size})"/>
    <rect x="4" y="15.5" width="20" height="5" rx="2.5" fill="url(#ssG${size})" opacity=".82"/>
    <rect x="4" y="26" width="13" height="5" rx="2.5" fill="url(#ssG${size})" opacity=".6"/>
    <rect x="4" y="5" width="5" height="26" rx="2.5" fill="url(#ssG${size})" opacity=".35"/>
  </svg>`;
}

// ─── DB يستخدم DBHybrid (Supabase + localStorage fallback) ────
// DBHybrid معرّف في supabase-db.js ويُحمّل قبل هذا الملف
const DB = typeof DBHybrid !== 'undefined' ? DBHybrid : {
  get(key) {
    try { return JSON.parse(localStorage.getItem('sbtp5_' + key)) || []; } catch { return []; }
  },
  set(key, val) { localStorage.setItem('sbtp5_' + key, JSON.stringify(val)); },
  nextId(key) {
    const items = this.get(key);
    return items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
  }
};
// patch init إذا لم يكن موجوداً في DB
if (!DB.init) DB.init = function() {
    if (this.get('initialized').length) return;
    // ✅ استخدم setSilent للبيانات الافتراضية (موجودة مسبقاً في SQL — لا داعي للمزامنة المكررة)
    const _set = (typeof this.setSilent === 'function') ? this.setSilent.bind(this) : this.set.bind(this);

    _set('plans', [
      { id:1, slug:'starter',    name:'المبتدئ',   price:2900,  max_projects:3,  max_workers:15,  max_equipment:0,  max_emails:50  },
      { id:2, slug:'pro',        name:'الاحترافي', price:7900,  max_projects:20, max_workers:100, max_equipment:50, max_emails:500 },
      { id:3, slug:'enterprise', name:'المؤسسي',   price:19900, max_projects:-1, max_workers:-1,  max_equipment:-1, max_emails:-1  },
    ]);
    _set('tenants', [
      { id:1, name:'SmartStruct Admin',                plan_id:3, wilaya:'الجزائر', subscription_status:'active', is_active:true },
      { id:2, name:'مؤسسة الجزائر للبناء (تجريبي)',     plan_id:2, wilaya:'الجزائر', subscription_status:'active', is_active:true }
    ]);
    _set('users', [
      { id:1, tenant_id:null, full_name:'مسؤول النظام',       email:'admin@smartbtp.dz',            password:'Admin@SmartStruct2025', role:'admin', is_admin:true,  is_active:true, account_status:'active' },
      { id:2, tenant_id:2,    full_name:'محمد الأمين بوعلام', email:'demo@algerie-construction.dz', password:'Demo@1234',             role:'admin', is_admin:false, is_active:true, account_status:'active' },
    ]);

    // جميع الجداول الأخرى فارغة افتراضياً
    _set('projects',        []);
    _set('workers',         []);
    _set('equipment',       []);
    _set('transactions',    []);
    _set('attendance',      []);
    _set('materials',       []);
    _set('stock_movements', []);
    _set('invoices',        []);
    _set('salary_records',  []);
    _set('kanban_tasks',    []);
    _set('documents',       []);
    _set('obligations',     []);
    _set('notes',           []);
    _set('notifications',   []);

    _set('initialized', [true]);
    // ── إعداد AI المركزي — يملؤه المسؤول من لوحة التحكم ──
    if (!this.get('global_ai_config') || !this.get('global_ai_config').apiKey) {
      this.set('global_ai_config', {
        provider: 'groq',
        apiKey: '',
        model: 'llama-3.3-70b-versatile',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        apiStyle: 'openai',
        status: 'inactive'
      });
    }
  };

/* ══════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════ */
const Auth = {
  currentUser: null,
  login(email, password, type) {
    const users = DB.get('users');
    // ابحث عن المستخدم بالبريد وكلمة المرور بغض النظر عن is_active
    const user = users.find(u => u.email === email.trim().toLowerCase());
    if (!user || user.password !== password) return false;
    if (type === 'admin' && !user.is_admin) return false;
    if (type === 'tenant' && (user.is_admin || !user.tenant_id)) return false;
    // تحقق من حالة الحساب للمستخدمين (وليس المسؤول)
    if (type === 'tenant') {
      if (!user.is_active) return 'pending'; // حساب معلق
      const tenant = DB.get('tenants').find(t => t.id === user.tenant_id);
      if (!tenant || !tenant.is_active) return 'pending';
    }
    this.currentUser = user;
    sessionStorage.setItem('sbtp_user', JSON.stringify(user));
    return true;
  },
  logout() {
    // تنبيه فقط عند وجود تعديلات/عمليات معلّقة (لا نمنع تسجيل الخروج)
    try {
      const dirty = (typeof DBHybrid !== 'undefined' && DBHybrid && typeof DBHybrid.hasUploadRequired === 'function')
        ? DBHybrid.hasUploadRequired()
        : (localStorage.getItem('sbtp5_sync_dirty') === '1');

      const pending = (typeof DBHybrid !== 'undefined' && DBHybrid && typeof DBHybrid.getOfflineQueueCount === 'function')
        ? DBHybrid.getOfflineQueueCount()
        : (() => { try { return (JSON.parse(localStorage.getItem('sbtp5_offline_queue') || '[]') || []).length; } catch { return 0; } })();

      if (dirty || pending) {
        if (typeof Toast !== 'undefined') {
          const msg = pending
            ? `⚠️ تنبيه: لديك عمليات لم تُرفع بعد إلى Supabase (المعلقة: ${pending}). يمكنك رفعها لاحقاً من زر المزامنة.`
            : `⚠️ تنبيه: لديك تعديلات لم تُرفع بعد إلى Supabase. يمكنك رفعها لاحقاً من زر المزامنة.`;
          Toast.warn(msg);
        }
        // ملاحظة: لا نمنع تسجيل الخروج ولا نُحوّل المستخدم لأي صفحة
      }
    } catch (e) {}

    this.currentUser = null;
    sessionStorage.removeItem('sbtp_user');
    // ⚡ إيقاف Realtime عند تسجيل الخروج
    if (typeof SmartRealtime !== 'undefined') SmartRealtime.stop();
    App.navigate('landing');
  },
  load() {
    const u = sessionStorage.getItem('sbtp_user');
    if (u) {
      const parsed = JSON.parse(u);
      // إذا كان المستخدم مسؤولاً ولم يمر من صفحة admin-login، نمسح الجلسة
      if (parsed.is_admin && !sessionStorage.getItem('sbtp_admin_auth')) {
        sessionStorage.removeItem('sbtp_user');
        return;
      }
      this.currentUser = parsed;
    }
  },
  getUser() { return this.currentUser; },
  getTenant() {
    if (!this.currentUser || !this.currentUser.tenant_id) return null;
    return DB.get('tenants').find(t => t.id === this.currentUser.tenant_id) || null;
  },
  getPlan() {
    const t = this.getTenant(); if (!t) return null;
    return DB.get('plans').find(p => p.id === t.plan_id) || null;
  }
};

/* ══════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════ */
const Toast = {
  show(msg, type='info') {
    const icons = { success:'✅', error:'❌', info:'ℹ️', warn:'⚠️' };
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type==='warn'?'warn':type}`;
    t.innerHTML = `<span>${icons[type]||'💬'}</span><span>${String(msg).replace(/</g,'&lt;')}</span>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), type === 'warn' ? 6000 : 4000);
  },
  success: m => Toast.show(m,'success'),
  error: m => Toast.show(m,'error'),
  info: m => Toast.show(m,'info'),
  warn: m => Toast.show(m,'warn')
};

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
function fmt(n) { return Number(n||0).toLocaleString('fr-DZ'); }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('ar-DZ'); }
function statusBadge(s) {
  const map = { active:'badge-active نشط', completed:'badge-completed مكتمل', delayed:'badge-delayed متأخر', paused:'badge-paused متوقف' };
  const [cls, label] = (map[s]||'badge-paused —').split(' ');
  return `<span class="badge ${cls}">${label}</span>`;
}
function statusLabel(s) { return {active:'نشط',completed:'مكتمل',delayed:'متأخر',paused:'متوقف'}[s]||s; }
function escHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/\//g,'&#47;');
}
function todayStr() { return new Date().toISOString().split('T')[0]; }

const WILAYAS = [
  "أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار","البليدة","البويرة",
  "تمنراست","تبسة","تلمسان","تيارت","تيزي وزو","الجزائر","الجلفة","جيجل","سطيف","سعيدة",
  "سكيكدة","سيدي بلعباس","عنابة","قالمة","قسنطينة","المدية","مستغانم","المسيلة","معسكر","ورقلة",
  "وهران","البيض","إليزي","برج بوعريريج","بومرداس","الطارف","تندوف","تيسمسيلت","الوادي","خنشلة",
  "سوق أهراس","تيبازة","ميلة","عين الدفلى","النعامة","عين تموشنت","غرداية","غليزان",
  // الولايات الجديدة (49-58)
  "تيميمون","برج باجي مختار","أولاد جلال","بني عباس","عين صالح","عين قزام","تقرت","جانت","المغير","المنيعة"
];
const PHASES = [
  "دراسة وتصميم","تحضير وتجهيز الموقع","أعمال الحفر والأساسات",
  "الهيكل الخرساني","البناء والجدران","التسقيف",
  "تمديدات الكهرباء","تمديدات السباكة والصرف",
  "أعمال التكييف والتهوية","أعمال الحدادة والمعادن",
  "أعمال النجارة والأبواب","أعمال الأرضيات والبلاط",
  "التشطيبات الداخلية","التشطيبات الخارجية",
  "أعمال الطرق والتهيئة","أعمال الشبكات والاتصالات",
  "أعمال الطاقة الشمسية","أعمال العزل والحماية",
  "تركيب المعدات","اختبار وتسليم","ضمان ومتابعة","الاستلام النهائي"
];
const PROJECT_TYPES = [
  {value:'building', label:'🏗️ بناء وإنشاء', icon:'🏗️'},
  {value:'electrical', label:'⚡ كهرباء وتمديدات', icon:'⚡'},
  {value:'plumbing', label:'🚿 سباكة وصرف صحي', icon:'🚿'},
  {value:'roads', label:'🛣️ طرق وتهيئة', icon:'🛣️'},
  {value:'hvac', label:'❄️ تكييف وتهوية', icon:'❄️'},
  {value:'telecom', label:'📡 اتصالات وشبكات', icon:'📡'},
  {value:'painting', label:'🎨 دهن وديكور', icon:'🎨'},
  {value:'metalworks', label:'🔩 حدادة ومعادن', icon:'🔩'},
  {value:'woodworks', label:'🪵 نجارة وأبواب', icon:'🪵'},
  {value:'flooring', label:'🪟 أرضيات وبلاط', icon:'🪟'},
  {value:'renovation', label:'🔧 ترميم وصيانة', icon:'🔧'},
  {value:'infrastructure', label:'🏛️ بنية تحتية', icon:'🏛️'},
  {value:'landscaping', label:'🌿 تهيئة خضراء وحدائق', icon:'🌿'},
  {value:'demolition', label:'💥 هدم وإزالة', icon:'💥'},
  {value:'waterproofing', label:'💧 عزل وحماية', icon:'💧'},
  {value:'solar', label:'☀️ طاقة شمسية', icon:'☀️'},
  {value:'other', label:'📋 أخرى', icon:'📋'},
];
const COLORS = ['#4A90E2','#34C38F','#E8B84B','#F04E6A','#9B6DFF','#FF7043','#26C6DA','#AB47BC'];

/* ══════════════════════════════════════════════════════
   INTERNATIONALISATION — عربي / Français
══════════════════════════════════════════════════════ */
const I18N = {
  currentLang: localStorage.getItem('sbtp_lang') || 'ar',
  setLang(lang) {
    this.currentLang = lang;
    localStorage.setItem('sbtp_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    App.render();
    setupConnBadge(); // re-render rebuilds with correct L() calls, then applyDOMTranslation covers the rest
  },
  t(key) {
    const d = this.dict[key];
    if (!d) return key;
    return d[this.currentLang] || d['ar'] || key;
  },
  dict: {
    // Navigation
    'nav.dashboard':    {ar:'لوحة التحكم',    fr:'Tableau de bord'},
    'nav.projects':     {ar:'المشاريع',        fr:'Projets'},
    'nav.workers':      {ar:'العمال',          fr:'Ouvriers'},
    'nav.attendance':   {ar:'الحضور',          fr:'Présence'},
    'nav.salary':       {ar:'الرواتب',         fr:'Salaires'},
    'nav.equipment':    {ar:'المعدات',         fr:'Équipements'},
    'nav.transactions': {ar:'المعاملات',       fr:'Transactions'},
    'nav.invoices':     {ar:'الفواتير',        fr:'Factures'},
    'nav.inventory':    {ar:'المخزون',         fr:'Stock'},
    'nav.materials':    {ar:'المواد',          fr:'Matériaux'},
    'nav.documents':    {ar:'الوثائق',         fr:'Documents'},
    'nav.reports':      {ar:'التقارير',        fr:'Rapports'},
    'nav.analytics':    {ar:'تحليلات',         fr:'Analytiques'},
    'nav.kanban':       {ar:'Kanban',           fr:'Kanban'},
    'nav.gantt':        {ar:'Gantt Chart',      fr:'Diagramme Gantt'},
    'nav.team':         {ar:'الفريق',          fr:'Équipe'},
    'nav.settings':     {ar:'الإعدادات',       fr:'Paramètres'},
    'nav.compare':      {ar:'مقارنة المشاريع', fr:'Comparer projets'},
    'nav.calendar':     {ar:'التقويم',         fr:'Calendrier'},
    'nav.map':          {ar:'خريطة الولايات',  fr:'Carte wilayas'},
    // Sections
    'section.main':     {ar:'الرئيسية',        fr:'Principal'},
    'section.projects': {ar:'المشاريع',        fr:'Projets'},
    'section.hr':       {ar:'الموارد البشرية', fr:'Ressources humaines'},
    'section.finance':  {ar:'المالية',         fr:'Finance'},
    'section.stock':    {ar:'المواد',          fr:'Stock'},
    'section.docs':     {ar:'الوثائق والتقارير',fr:'Docs & Rapports'},
    'section.account':  {ar:'الحساب',         fr:'Compte'},
    // Common actions
    'action.add':       {ar:'إضافة',           fr:'Ajouter'},
    'action.edit':      {ar:'تعديل',           fr:'Modifier'},
    'action.delete':    {ar:'حذف',             fr:'Supprimer'},
    'action.save':      {ar:'حفظ',             fr:'Enregistrer'},
    'action.cancel':    {ar:'إلغاء',           fr:'Annuler'},
    'action.export':    {ar:'تصدير',           fr:'Exporter'},
    'action.print':     {ar:'طباعة',           fr:'Imprimer'},
    'action.search':    {ar:'بحث',             fr:'Rechercher'},
    'action.close':     {ar:'إغلاق',           fr:'Fermer'},
    'action.details':   {ar:'تفاصيل',          fr:'Détails'},
    'action.back':      {ar:'العودة',          fr:'Retour'},
    // Status
    'status.active':    {ar:'نشط',             fr:'Actif'},
    'status.completed': {ar:'مكتمل',           fr:'Terminé'},
    'status.delayed':   {ar:'متأخر',           fr:'En retard'},
    'status.paused':    {ar:'متوقف',           fr:'Pausé'},
    // Common labels
    'lbl.project':      {ar:'المشروع',         fr:'Projet'},
    'lbl.budget':       {ar:'الميزانية',       fr:'Budget'},
    'lbl.spent':        {ar:'المُنفَق',        fr:'Dépensé'},
    'lbl.progress':     {ar:'التقدم',          fr:'Avancement'},
    'lbl.client':       {ar:'العميل',          fr:'Client'},
    'lbl.wilaya':       {ar:'الولاية',         fr:'Wilaya'},
    'lbl.date':         {ar:'التاريخ',         fr:'Date'},
    'lbl.amount':       {ar:'المبلغ',          fr:'Montant'},
    'lbl.worker':       {ar:'العامل',          fr:'Ouvrier'},
    'lbl.salary':       {ar:'الأجر',           fr:'Salaire'},
    'lbl.phone':        {ar:'الهاتف',          fr:'Téléphone'},
    'lbl.name':         {ar:'الاسم',           fr:'Nom'},
    'lbl.type':         {ar:'النوع',           fr:'Type'},
    'lbl.notes':        {ar:'ملاحظات',         fr:'Notes'},
    'lbl.total':        {ar:'الإجمالي',        fr:'Total'},
    'lbl.revenue':      {ar:'إيراد',           fr:'Revenu'},
    'lbl.expense':      {ar:'مصروف',           fr:'Dépense'},
    'lbl.profit':       {ar:'الربح',           fr:'Bénéfice'},
    'lbl.netProfit':    {ar:'الربح الصافي',    fr:'Bénéfice net'},
    'lbl.allWilayas':   {ar:'كل الولايات',     fr:'Toutes wilayas'},
    'lbl.allStatus':    {ar:'كل الحالات',      fr:'Tous statuts'},
    'lbl.allTypes':     {ar:'كل أنواع المشاريع',fr:'Tous types'},
    // Pages titles
    'page.projects':    {ar:'🏗️ المشاريع',    fr:'🏗️ Projets'},
    'page.workers':     {ar:'👷 العمال',       fr:'👷 Ouvriers'},
    'page.equipment':   {ar:'🚜 المعدات',      fr:'🚜 Équipements'},
    'page.transactions':{ar:'💰 المعاملات المالية', fr:'💰 Transactions financières'},
    'page.reports':     {ar:'📈 التقارير',     fr:'📈 Rapports'},
    'page.settings':    {ar:'⚙️ الإعدادات',   fr:'⚙️ Paramètres'},
    'page.compare':     {ar:'📊 مقارنة المشاريع', fr:'📊 Comparaison de projets'},
    'page.calendar':    {ar:'🗓️ تقويم المشاريع', fr:'🗓️ Calendrier des projets'},
    'page.map':         {ar:'🗺️ خريطة المشاريع', fr:'🗺️ Carte des projets'},
    'page.backup':      {ar:'💾 النسخ الاحتياطي', fr:'💾 Sauvegarde'},
    // Dashboard v9
    'dash.healthScore':   {ar:'مؤشر صحة المؤسسة',      fr:'Score de santé'},
    'dash.healthSub':     {ar:'تقييم شامل للأداء المالي والتشغيلي', fr:'Évaluation globale des performances'},
    'dash.activeProj':    {ar:'مشاريع نشطة',            fr:'Projets actifs'},
    'dash.forecastProfit':{ar:'ربح متوقع/شهر (دج)',     fr:'Bénéfice prévu/mois (DA)'},
    'dash.atRisk':        {ar:'مشاريع في خطر',          fr:'Projets à risque'},
    'dash.netLiquidity':  {ar:'صافي السيولة (دج)',       fr:'Liquidité nette (DA)'},
    'dash.todayPresence': {ar:'حضور اليوم',              fr:'Présence aujourd\'hui'},
    'dash.budgetConsum':  {ar:'استهلاك الميزانية الإجمالي', fr:'Consommation budget global'},
    'dash.riskPanel':     {ar:'لوحة المخاطر الذكية',    fr:'Tableau des risques IA'},
    'dash.noRisks':       {ar:'لا مخاطر مكتشفة الآن',   fr:'Aucun risque détecté'},
    'dash.forecastTitle': {ar:'توقعات الربح',            fr:'Prévisions de bénéfice'},
    'dash.thisMonth':     {ar:'هذا الشهر',               fr:'Ce mois'},
    'dash.monthRevenue':  {ar:'إيرادات الشهر',           fr:'Revenus du mois'},
    'dash.dailyBurn':     {ar:'معدل الصرف اليومي',       fr:'Taux de dépense journalier'},
    'dash.forecastExp':   {ar:'مصاريف متوقعة نهاية الشهر', fr:'Dépenses prévues fin du mois'},
    'dash.forecastEnd':   {ar:'ربح متوقع نهاية الشهر',   fr:'Bénéfice prévu fin du mois'},
    'dash.workerEff':     {ar:'كفاءة القوى العاملة',     fr:'Efficacité de la main-d\'œuvre'},
    'dash.totalWorkers':  {ar:'إجمالي عمال',             fr:'Total ouvriers'},
    'dash.dailyCost':     {ar:'تكلفة يومية إجمالية',     fr:'Coût journalier total'},
    'dash.presentToday':  {ar:'حاضر اليوم',              fr:'Présent aujourd\'hui'},
    'dash.cashflow':      {ar:'التدفق النقدي (6 أشهر)',  fr:'Flux de trésorerie (6 mois)'},
    'dash.revenues':      {ar:'إيرادات',                 fr:'Revenus'},
    'dash.expenses':      {ar:'مصاريف',                  fr:'Dépenses'},
    'dash.profitClass':   {ar:'تصنيف ربحية المشاريع',   fr:'Classification rentabilité'},
    'dash.recentProj':    {ar:'آخر المشاريع',            fr:'Projets récents'},
    'dash.viewAll':       {ar:'عرض الكل ←',              fr:'Voir tout →'},
    'dash.newProject':    {ar:'+ مشروع جديد',            fr:'+ Nouveau projet'},
    'dash.worker':        {ar:'عامل',                    fr:'ouvrier(s)'},
    'dash.stable':        {ar:'🟢 مستقر',                fr:'🟢 Stable'},
    'dash.needsAttn':     {ar:'🟡 تحتاج انتباه',         fr:'🟡 Attention requise'},
    'dash.danger':        {ar:'🔴 خطر مالي',             fr:'🔴 Danger financier'},
    'dash.overrunWarn':   {ar:'تجاوز متوقع',             fr:'Dépassement prévu'},
    'dash.noProjects':    {ar:'لا توجد مشاريع بعد',      fr:'Aucun projet encore'},
    'dash.alerts':        {ar:'تنبيه',                   fr:'alerte(s)'},
    'dash.budgetPct':     {ar:'مُستهلَك، تقدم',          fr:'consommé, avancement'},
    'dash.delayed':       {ar:'متأخر',                   fr:'En retard'},
    'dash.region':        {ar:'الولاية:',                fr:'Wilaya:'},
    'dash.forecastOver':  {ar:'تجاوز ميزانية متوقع',    fr:'Dépassement budget prévu'},
    'dash.totalBudget':   {ar:'دج',                      fr:'DA'},
    'dash.profHigh':      {ar:'🟢 مربح',                 fr:'🟢 Rentable'},
    'dash.profMed':       {ar:'🟡 متوسط',                fr:'🟡 Moyen'},
    'dash.profLow':       {ar:'🟠 ضعيف',                 fr:'🟠 Faible'},
    'dash.profLoss':      {ar:'🔴 خاسر',                 fr:'🔴 Déficitaire'},
    'dash.riskBudget70':  {ar:'تجاوز 70% ميزانية قبل 50% تقدم', fr:'70% budget avant 50% avancement'},
    'dash.riskConsumed':  {ar:'مستهلك، تقدم',            fr:'consommé, avancement'},
    'dash.riskDelayed':   {ar:'متأخر',                   fr:'En retard'},
    'dash.riskWilaya':    {ar:'الولاية:',                fr:'Wilaya:'},
    'dash.riskForecast':  {ar:'توقع تجاوز ميزانية',     fr:'Dépassement budget prévu'},
    'dash.riskOverrun':   {ar:'تجاوز متوقع:',            fr:'Dépassement prévu:'},
    'dash.budgetConsumed':{ar:'% مستهلك',                fr:'% consommé'},
    // Settings
    'set.company':      {ar:'معلومات الشركة',  fr:'Infos société'},
    'set.companyName':  {ar:'اسم الشركة',      fr:'Nom de la société'},
    'set.language':     {ar:'اللغة',           fr:'Langue'},
    'set.langAr':       {ar:'العربية',         fr:'Arabe'},
    'set.langFr':       {ar:'الفرنسية',        fr:'Français'},
    'set.backup':       {ar:'النسخ الاحتياطي', fr:'Sauvegarde'},
    'set.exportAll':    {ar:'تصدير جميع البيانات', fr:'Exporter toutes les données'},
    'set.importData':   {ar:'استيراد البيانات', fr:'Importer des données'},
    'set.saveChanges':  {ar:'💾 حفظ التغييرات', fr:'💾 Sauvegarder'},
    'set.password':     {ar:'🔑 تغيير كلمة المرور', fr:'🔑 Changer mot de passe'},
    // Compare
    'cmp.title':        {ar:'مقارنة المشاريع', fr:'Comparaison de projets'},
    'cmp.select1':      {ar:'المشروع الأول',   fr:'Premier projet'},
    'cmp.select2':      {ar:'المشروع الثاني',  fr:'Deuxième projet'},
    'cmp.compare':      {ar:'قارن الآن',       fr:'Comparer'},
    'cmp.budget':       {ar:'الميزانية',       fr:'Budget'},
    'cmp.spent':        {ar:'المُنفَق',        fr:'Dépensé'},
    'cmp.progress':     {ar:'التقدم',          fr:'Avancement'},
    'cmp.workers':      {ar:'العمال',          fr:'Ouvriers'},
    'cmp.duration':     {ar:'المدة (يوم)',      fr:'Durée (j)'},
    'cmp.efficiency':   {ar:'كفاءة الميزانية', fr:'Efficacité budget'},
  }
};
// Shortcut
function __(key) { return I18N.t(key); }
// Global bilingual helper — use L(ar, fr) anywhere without redefining const L in every page
function L(ar, fr) { return I18N.currentLang === 'ar' ? ar : fr; }

/* ══════════════════════════════════════════════════════
   DOM TRANSLATION ENGINE
   After every render(), scan the DOM and replace Arabic
   text nodes with French equivalents when lang === 'fr'.
   This is the RADICAL fix — no page needs modification.
══════════════════════════════════════════════════════ */
const TR = {
  // ── Navigation & Sections ──
  'لوحة التحكم':'Tableau de bord',
  'المشاريع':'Projets',
  'العمال':'Ouvriers',
  'الحضور':'Présence',
  'الرواتب':'Salaires',
  'المعدات':'Équipements',
  'المعاملات':'Transactions',
  'الفواتير':'Factures',
  'المخزون':'Stock',
  'المواد':'Matériaux',
  'الوثائق':'Documents',
  'التقارير':'Rapports',
  'تحليلات':'Analytiques',
  'الفريق':'Équipe',
  'الإعدادات':'Paramètres',
  'مقارنة المشاريع':'Comparer projets',
  'التقويم':'Calendrier',
  'خريطة الولايات':'Carte wilayas',
  'الرئيسية':'Principal',
  'الموارد البشرية':'Ressources humaines',
  'المالية':'Finance',
  'الوثائق والتقارير':'Docs & Rapports',
  'الحساب':'Compte',
  // ── Page Titles ──
  '🏗️ المشاريع':'🏗️ Projets',
  '👷 العمال':'👷 Ouvriers',
  '🚜 المعدات':'🚜 Équipements',
  '💰 المعاملات المالية':'💰 Transactions financières',
  '📈 التقارير والإحصاء':'📈 Rapports & Statistiques',
  '📈 التقارير':'📈 Rapports',
  '⚙️ الإعدادات':'⚙️ Paramètres',
  '📊 مقارنة المشاريع':'📊 Comparaison de projets',
  '🗓️ تقويم المشاريع':'🗓️ Calendrier des projets',
  '🗺️ خريطة المشاريع':'🗺️ Carte des projets',
  '📅 الحضور والغياب':'📅 Présence et absences',
  '👷 الرواتب':'👷 Salaires',
  '📦 المخزون':'📦 Stock',
  '🏗️ تفاصيل المشروع':'🏗️ Détails du projet',
  '📋 الفواتير':'📋 Factures',
  '🧾 الفواتير':'🧾 Factures',
  '🔬 المحاكي المالي':'🔬 Simulateur financier',
  // ── Actions ──
  'إضافة':'Ajouter',
  'تعديل':'Modifier',
  'حذف':'Supprimer',
  'حفظ':'Enregistrer',
  'إلغاء':'Annuler',
  'تصدير':'Exporter',
  'طباعة':'Imprimer',
  'بحث':'Rechercher',
  'إغلاق':'Fermer',
  'تفاصيل':'Détails',
  'العودة':'Retour',
  'تأكيد':'Confirmer',
  // ── Common Buttons ──
  'إضافة عامل':'Ajouter ouvrier',
  '+ إضافة عامل':'+ Ajouter ouvrier',
  'تصدير CSV':'Exporter CSV',
  '📥 تصدير CSV':'📥 Exporter CSV',
  'مشروع جديد':'Nouveau projet',
  '+ مشروع جديد':'+ Nouveau projet',
  'إضافة معاملة':'Ajouter transaction',
  '+ إضافة معاملة':'+ Ajouter transaction',
  'إضافة معدة':'Ajouter engin',
  '+ إضافة معدة':'+ Ajouter engin',
  '💾 حفظ':'💾 Enregistrer',
  '💾 حفظ المشروع':'💾 Enregistrer projet',
  '💾 حفظ التعديلات':'💾 Sauvegarder',
  '+ رفع وثيقة':'+ Ajouter document',
  'رفع وثيقة':'Ajouter document',
  // ── Status ──
  'نشط':'Actif',
  'مكتمل':'Terminé',
  'متأخر':'En retard',
  'متوقف':'Pausé',
  'نشطة':'Actifs',
  'مكتملة':'Terminés',
  'متأخرة':'En retard',
  // ── Labels ──
  'المشروع':'Projet',
  'الميزانية':'Budget',
  'المُنفَق':'Dépensé',
  'التقدم':'Avancement',
  'العميل':'Client',
  'الولاية':'Wilaya',
  'التاريخ':'Date',
  'المبلغ':'Montant',
  'العامل':'Ouvrier',
  'الأجر':'Salaire',
  'الهاتف':'Téléphone',
  'الاسم':'Nom',
  'النوع':'Type',
  'ملاحظات':'Notes',
  'الإجمالي':'Total',
  'إيراد':'Revenu',
  'مصروف':'Dépense',
  'الربح':'Bénéfice',
  'الربح الصافي':'Bénéfice net',
  'كل الولايات':'Toutes wilayas',
  'كل الحالات':'Tous statuts',
  'كل أنواع المشاريع':'Tous types',
  'كل المشاريع':'Tous projets',
  // ── Projects Page ──
  'الإجمالي':'Total',
  'التقدم':'Avancement',
  'اسم المشروع *':'Nom du projet *',
  'اسم المشروع':'Nom du projet',
  'نوع المشروع *':'Type de projet *',
  'نوع المشروع':'Type de projet',
  'اسم العميل':'Nom client',
  'هاتف العميل':'Tél. client',
  'الميزانية (دج)':'Budget (DA)',
  'المرحلة الحالية':'Phase actuelle',
  'تاريخ البداية':'Date début',
  'تاريخ الانتهاء':'Date fin',
  'الوصف':'Description',
  'اللون':'Couleur',
  'الحالة':'Statut',
  'المرحلة':'Phase',
  'التقدم %':'Avancement %',
  // ── Workers Page ──
  'الاسم الكامل *':'Nom complet *',
  'المهنة *':'Métier *',
  'المهنة':'Métier',
  'الأجر اليومي (دج)':'Salaire/j (DA)',
  'الأجر اليومي':'Salaire/j',
  'نوع العقد':'Type contrat',
  'تاريخ التعيين':'Date embauche',
  'يومي':'Journalier',
  'شهري':'Mensuel',
  'موسمي':'Saisonnier',
  'مقاول':'Sous-traitant',
  'إجمالي عمال':'Total ouvriers',
  'تكلفة يومية إجمالية':'Coût journalier total',
  'حاضر اليوم':'Présent aujourd\'hui',
  'بدون مشروع':'Sans projet',
  'لا يوجد عمال':'Aucun ouvrier',
  'الطاقة الاستيعابية:':'Capacité :',
  // ── Attendance Page ──
  'الحضور والغياب':'Présence et absences',
  '✅ حاضر':'✅ Présent',
  '❌ غائب':'❌ Absent',
  '🔶 نصف يوم':'🔶 Demi-journée',
  '🏖️ إجازة':'🏖️ Congé',
  'حاضر':'Présent',
  'غائب':'Absent',
  'نصف يوم':'Demi-journée',
  'إجازة':'Congé',
  '⏳ لم يُسجَّل':'⏳ Non enregistré',
  'لم يُسجَّل':'Non enregistré',
  'تكلفة اليوم (دج)':'Coût du jour (DA)',
  '💰 تكلفة اليوم (دج)':'💰 Coût du jour (DA)',
  '✅ تحديد الكل حاضر':'✅ Marquer tous présents',
  '❌ تحديد الكل غائب':'❌ Marquer tous absents',
  'اليوم':'Aujourd\'hui',
  'التالي →':'Suivant →',
  '← السابق':'← Précédent',
  'آخر 30 يوم — انقر يوماً للانتقال إليه':'30 derniers jours — cliquer pour naviguer',
  '📊 آخر 30 يوم — انقر يوماً للانتقال إليه':'📊 30 derniers jours — cliquer pour naviguer',
  '■ 80%+ حضور':'■ 80%+ présence',
  '■ أقل من 50%':'■ moins de 50%',
  'ملاحظة...':'Note...',
  'ساعات':'Heures',
  'التسجيل':'Statut',
  'الأجر':'Salaire',
  // ── Equipment Page ──
  'الاسم *':'Nom *',
  'الطراز':'Modèle',
  'رقم اللوحة':'N° plaque',
  'الأيقونة':'Icône',
  'قيمة الشراء (دج)':'Prix achat (DA)',
  'قيمة الشراء':'Prix achat',
  'نشط':'Actif',
  'صيانة':'Maintenance',
  'خامل':'Inactif',
  'لا توجد معدات':'Aucun équipement',
  'معدة مسجلة':'engin(s) enregistré(s)',
  // ── Transactions Page ──
  'الإيرادات (دج)':'Revenus (DA)',
  'المصاريف (دج)':'Dépenses (DA)',
  'الربح الصافي (دج)':'Bénéfice net (DA)',
  'نقدي':'Espèces',
  'تحويل بنكي':'Virement',
  'شيك':'Chèque',
  'طريقة الدفع':'Mode paiement',
  'المورد':'Fournisseur',
  'الفئة':'Catégorie',
  'المبلغ (دج)':'Montant (DA)',
  'المبلغ (دج) *':'Montant (DA) *',
  'لا توجد معاملات بعد':'Aucune transaction',
  // ── Reports Page ──
  'الإيرادات':'Revenus',
  'المصاريف':'Dépenses',
  'الربح (دج)':'Bénéfice (DA)',
  'استهلاك الميزانية':'Consommation budget',
  'ملخص المشاريع':'Résumé projets',
  '🏗️ ملخص المشاريع':'🏗️ Résumé projets',
  'إحصاء العمال':'Stats ouvriers',
  '👷 إحصاء العمال':'👷 Stats ouvriers',
  'إجمالي العمال':'Total ouvriers',
  'متوسط الأجر اليومي':'Salaire moyen/j',
  'التكلفة اليومية الكلية':'Coût journalier total',
  'أكبر فئات المصاريف':'Top catégories dépenses',
  '🏆 أكبر فئات المصاريف':'🏆 Top catégories dépenses',
  'ربحية المشاريع':'Rentabilité projets',
  '💼 ربحية المشاريع':'💼 Rentabilité projets',
  'إجمالي الميزانية':'Budget total',
  '📥 تصدير مالي CSV':'📥 Export financier CSV',
  '📄 تصدير PDF':'📄 Exporter PDF',
  '📥 تقرير حضور CSV':'📥 Rapport présence CSV',
  '🖨️ طباعة التقرير':'🖨️ Imprimer le rapport',
  // ── Documents Page ──
  'إدارة الوثائق':'Gestion des documents',
  '📁 إدارة الوثائق':'📁 Gestion des documents',
  'رفع وثيقة':'Ajouter document',
  '📁 رفع وثيقة':'📁 Ajouter document',
  'اسم الوثيقة *':'Nom document *',
  'الملف':'Fichier',
  'مخططات':'Plans',
  'عقود':'Contrats',
  'صور':'Photos',
  'فواتير':'Factures',
  'أخرى':'Autres',
  'انقر لاختيار ملف':'Cliquer pour choisir un fichier',
  'ارفع أول وثيقة لمشاريعك':'Ajoutez votre premier document',
  'PDF، مخططات، صور، عقود':'PDF, plans, photos, contrats',
  '⬇️ تنزيل':'⬇️ Télécharger',
  // ── Settings Page ──
  'معلومات الشركة':'Infos société',
  'اسم الشركة':'Nom de la société',
  'اللغة':'Langue',
  'العربية':'Arabe',
  'الفرنسية':'Français',
  'النسخ الاحتياطي':'Sauvegarde',
  'تصدير جميع البيانات':'Exporter toutes les données',
  'استيراد البيانات':'Importer des données',
  '💾 حفظ التغييرات':'💾 Sauvegarder',
  '🔑 تغيير كلمة المرور':'🔑 Changer mot de passe',
  // ── Materials Page ──
  'المواد والمخزون':'Matériaux & Stock',
  'مخزون': 'Stock',
  'الكمية':'Quantité',
  'الوحدة':'Unité',
  'السعر':'Prix',
  'المستودع':'Dépôt',
  'إضافة مادة':'Ajouter matériau',
  '+ إضافة مادة':'+ Ajouter matériau',
  'لا توجد مواد بعد':'Aucun matériau',
  // ── Salary Page ──
  'سجل الرواتب':'Registre salaires',
  'إضافة سجل راتب':'Ajouter salaire',
  'صافي الراتب':'Salaire net',
  'الخصومات':'Déductions',
  'المنح':'Primes',
  'لا توجد سجلات':'Aucun enregistrement',
  // ── Invoices Page ──
  'الفواتير':'Factures',
  'فاتورة جديدة':'Nouvelle facture',
  '+ فاتورة جديدة':'+ Nouvelle facture',
  'رقم الفاتورة':'N° facture',
  'تاريخ الاستحقاق':'Date échéance',
  'تاريخ الإصدار':'Date émission',
  'مدفوع':'Payé',
  'معلق':'En attente',
  'متأخر':'En retard',
  'لا توجد فواتير بعد':'Aucune facture',
  'لا توجد فواتير':'Aucune facture',
  'مدفوعة (دج)':'Payées (DA)',
  'معلقة (دج)':'En attente (DA)',
  'متأخرة (دج)':'En retard (DA)',
  'إجمالي الفواتير':'Total factures',
  'تم تحصيله':'encaissé',
  'الكل':'Tout',
  'مدفوعة':'Payées',
  'معلقة':'En attente',
  'متأخرة':'En retard',
  'بنود الفاتورة':'Lignes de la facture',
  '+ إضافة بند':'+ Ajouter ligne',
  'وصف الخدمة / المادة':'Description service / article',
  'سعر الوحدة':'Prix unit.',
  'المجموع خارج رسم (HT)':'Sous-total HT',
  'الإجمالي (TTC)':'Total TTC',
  'ملاحظات / شروط الدفع':'Notes / conditions de paiement',
  'شروط الدفع، ملاحظات...':'Conditions de paiement, notes...',
  'حفظ الفاتورة':'Enregistrer',
  'تأشير كمدفوعة':'Marquer payée',
  'تصدير PDF':'Exporter PDF',
  'نسبة TVA (%)':'Taux TVA (%)',
  'طريقة الدفع':'Mode paiement',
  'نقداً':'Espèces',
  'تحويل بنكي':'Virement bancaire',
  // ── Team Page ──
  'الفريق':'Équipe',
  'الدور':'Rôle',
  'مدير':'Directeur',
  'محاسب':'Comptable',
  'مشرف':'Superviseur',
  'لا يوجد أعضاء':'Aucun membre',
  // ── Dashboard ──
  'مؤشر صحة المؤسسة':'Score de santé',
  'مشاريع نشطة':'Projets actifs',
  'مشاريع في خطر':'Projets à risque',
  'حضور اليوم':'Présence aujourd\'hui',
  'استهلاك الميزانية الإجمالي':'Consommation budget global',
  'لوحة المخاطر الذكية':'Tableau des risques IA',
  'لا مخاطر مكتشفة الآن':'Aucun risque détecté',
  'توقعات الربح':'Prévisions de bénéfice',
  'هذا الشهر':'Ce mois',
  'إيرادات الشهر':'Revenus du mois',
  'معدل الصرف اليومي':'Taux dépense journalier',
  'آخر المشاريع':'Projets récents',
  'عرض الكل ←':'Voir tout →',
  // ── General ──
  'لا توجد بيانات':'Aucune donnée',
  'لا توجد نتائج':'Aucun résultat',
  'تحميل...':'Chargement...',
  'خطأ':'Erreur',
  'نجح':'Succès',
  'تحذير':'Avertissement',
  'دج':'DA',
  ' دج':' DA',
  'اختر...':'Choisir...',
  'اختر نوع المشروع...':'Choisir un type...',
  'بحث...':'Rechercher...',
  'ابحث عن مشروع...':'Rechercher un projet...',
  'ابحث...':'Rechercher...',
  // ── Compare ──
  'مقارنة المشاريع':'Comparaison de projets',
  'المشروع الأول':'Premier projet',
  'المشروع الثاني':'Deuxième projet',
  'قارن الآن':'Comparer',
  'المدة (يوم)':'Durée (j)',
  'كفاءة الميزانية':'Efficacité budget',
};

// Apply DOM translation to all text nodes after render
function applyDOMTranslation() {
  if (I18N.currentLang === 'ar') return; // no-op for Arabic
  const lang = I18N.currentLang;
  const app = document.getElementById('app');
  if (!app) return;

  // Walk all text nodes and replace
  function walkTextNodes(node) {
    if (node.nodeType === 3) { // TEXT_NODE
      let txt = node.textContent;
      let changed = false;
      // Try longest matches first (sort by length descending for accuracy)
      for (const [ar, fr] of Object.entries(TR)) {
        if (txt.includes(ar)) {
          txt = txt.split(ar).join(lang === 'fr' ? fr : ar);
          changed = true;
        }
      }
      if (changed) node.textContent = txt;
    } else if (node.nodeType === 1) { // ELEMENT_NODE
      // Translate placeholder and title attributes
      if (node.hasAttribute('placeholder')) {
        let ph = node.getAttribute('placeholder');
        for (const [ar, fr] of Object.entries(TR)) {
          if (ph.includes(ar)) ph = ph.split(ar).join(lang === 'fr' ? fr : ar);
        }
        node.setAttribute('placeholder', ph);
      }
      // Don't recurse into script/style/input-value
      if (!['SCRIPT','STYLE','INPUT','TEXTAREA'].includes(node.tagName)) {
        node.childNodes.forEach(walkTextNodes);
      }
    }
  }
  walkTextNodes(app);
}

/* ══════════════════════════════════════════════════════
   ROUTER
══════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════
   ROLES & PERMISSIONS — COMPLETE RBAC SYSTEM
══════════════════════════════════════════════════════ */
const ROLE_NAMES = {
  admin:      'مسؤول',
  manager:    'مدير مشروع',
  accountant: 'محاسب',
  hr:         'موارد بشرية',
  viewer:     'قارئ فقط'
};
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

// ── صلاحيات كل دور ──────────────────────────────────
//  true  = يرى الصفحة ويمكنه التعديل
//  'view'= يرى فقط بدون تعديل
//  false / غياب = محظور تماماً
const ROLE_PERMISSIONS = {
  admin: {
    // المسؤول يملك كل شيء — يتحكم عبر لوحة الإدارة
    dashboard:true, analytics:true, projects:true, project_detail:true,
    compare:true, calendar:true, map:true, kanban:true, gantt:true,
    workers:true, attendance:true, salary:true,
    transactions:true, invoices:true,
    inventory:true, equipment:true, materials:true,
    documents:true, reports:true, bank_report:true, simulator:true,
    obligations:true, audit_log:true, team:true, settings:true,
    // Write actions
    write_projects:true, write_workers:true, write_attendance:true,
    write_salary:true, write_transactions:true, write_invoices:true,
    write_materials:true, write_equipment:true, write_documents:true,
    write_notes:true, write_team:true, write_settings:true,
  },
  manager: {
    // مدير المشروع: يدير المشاريع والعمال والمواد والوثائق — يرى المالية فقط
    dashboard:true, analytics:'view', projects:true, project_detail:true,
    compare:'view', calendar:true, map:'view', kanban:true, gantt:true,
    workers:true, attendance:true, salary:'view',
    transactions:'view', invoices:'view',
    inventory:true, equipment:true, materials:true,
    documents:true, reports:'view', bank_report:false, simulator:'view',
    obligations:'view', audit_log:'view', team:'view', settings:'view',
    // Write actions
    write_projects:true, write_workers:true, write_attendance:true,
    write_salary:false, write_transactions:false, write_invoices:false,
    write_materials:true, write_equipment:true, write_documents:true,
    write_notes:true, write_team:false, write_settings:false,
  },
  accountant: {
    // المحاسب: يدير المالية الكاملة — يرى المشاريع والعمال فقط
    dashboard:true, analytics:true, projects:'view', project_detail:'view',
    compare:'view', calendar:'view', map:false, kanban:false, gantt:false,
    workers:'view', attendance:'view', salary:true,
    transactions:true, invoices:true,
    inventory:'view', equipment:'view', materials:'view',
    documents:'view', reports:true, bank_report:true, simulator:true,
    obligations:true, audit_log:'view', team:'view', settings:'view',
    // Write actions
    write_projects:false, write_workers:false, write_attendance:false,
    write_salary:true, write_transactions:true, write_invoices:true,
    write_materials:false, write_equipment:false, write_documents:false,
    write_notes:false, write_team:false, write_settings:false,
  },
  hr: {
    // الموارد البشرية: يدير العمال والحضور والرواتب — لا يرى المالية
    dashboard:true, analytics:false, projects:'view', project_detail:'view',
    compare:false, calendar:'view', map:false, kanban:false, gantt:false,
    workers:true, attendance:true, salary:true,
    transactions:false, invoices:false,
    inventory:false, equipment:false, materials:false,
    documents:false, reports:false, bank_report:false, simulator:false,
    obligations:false, audit_log:false, team:'view', settings:'view',
    // Write actions
    write_projects:false, write_workers:true, write_attendance:true,
    write_salary:true, write_transactions:false, write_invoices:false,
    write_materials:false, write_equipment:false, write_documents:false,
    write_notes:false, write_team:false, write_settings:false,
  },
  viewer: {
    // قارئ فقط: يرى كل شيء ولا يعدل شيئاً
    dashboard:true, analytics:'view', projects:'view', project_detail:'view',
    compare:'view', calendar:'view', map:'view', kanban:'view', gantt:'view',
    workers:'view', attendance:'view', salary:'view',
    transactions:'view', invoices:'view',
    inventory:'view', equipment:'view', materials:'view',
    documents:'view', reports:'view', bank_report:false, simulator:'view',
    obligations:'view', audit_log:false, team:'view', settings:'view',
    // Write actions — NONE
    write_projects:false, write_workers:false, write_attendance:false,
    write_salary:false, write_transactions:false, write_invoices:false,
    write_materials:false, write_equipment:false, write_documents:false,
    write_notes:false, write_team:false, write_settings:false,
  }
};

// ── Pages that map to permission keys ────────────────
const PAGE_PERM_MAP = {
  dashboard:'dashboard', analytics:'analytics', projects:'projects',
  project_detail:'project_detail', compare:'compare', calendar:'calendar',
  map:'map', kanban:'kanban', gantt:'gantt', workers:'workers',
  attendance:'attendance', salary:'salary', transactions:'transactions',
  invoices:'invoices', inventory:'inventory', equipment:'equipment',
  materials:'materials', documents:'documents', reports:'reports',
  bank_report:'bank_report', simulator:'simulator', obligations:'obligations',
  audit_log:'audit_log', team:'team', settings:'settings',
  dz_documents:'documents',
};

// ── Main permission check ─────────────────────────────
function canDo(action) {
  const u = Auth.getUser();
  if (!u) return false;
  if (u.is_admin) return true; // super admin bypasses all

  // Check custom per-user permissions first (set by admin)
  if (u.custom_perms && u.custom_perms[action] !== undefined) {
    return !!u.custom_perms[action];
  }

  const rolePerms = ROLE_PERMISSIONS[u.role] || ROLE_PERMISSIONS['viewer'];

  // For write actions
  if (action.startsWith('write_') || ['projects','workers','attendance','materials',
      'documents','notes','transactions','invoices','salary','equipment'].includes(action)) {
    const writeKey = 'write_' + action;
    if (rolePerms[writeKey] !== undefined) return !!rolePerms[writeKey];
    // If the page perm is true (not 'view'), allow writes
    const pagePerm = rolePerms[action];
    return pagePerm === true;
  }

  return !!rolePerms[action];
}

// ── Can user view a page (true or 'view') ─────────────
function canView(page) {
  const u = Auth.getUser();
  if (!u) return false;
  if (u.is_admin) return true;
  if (u.custom_perms && u.custom_perms['view_'+page] !== undefined) {
    return !!u.custom_perms['view_'+page];
  }
  const rolePerms = ROLE_PERMISSIONS[u.role] || ROLE_PERMISSIONS['viewer'];
  const perm = rolePerms[page];
  return perm === true || perm === 'view';
}

// ── Can user write on a page ─────────────────────────
function canWrite(page) {
  const u = Auth.getUser();
  if (!u) return false;
  if (u.is_admin) return true;
  const rolePerms = ROLE_PERMISSIONS[u.role] || ROLE_PERMISSIONS['viewer'];
  return rolePerms['write_'+page] === true || rolePerms[page] === true;
}

// ── Access Denied page ────────────────────────────────
function accessDeniedHTML(pageName) {
  return layoutHTML('dashboard', L('وصول مرفوض','Accès refusé'), `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:2rem">
      <div style="font-size:4rem;margin-bottom:1rem">🚫</div>
      <div style="font-size:1.4rem;font-weight:900;color:var(--red);margin-bottom:.5rem">${L('وصول مرفوض','Accès refusé')}</div>
      <div style="font-size:.9rem;color:var(--muted);margin-bottom:1.5rem;max-width:400px;line-height:1.7">
        ${L(`ليس لديك صلاحية للوصول إلى صفحة «${pageName}». تواصل مع المسؤول لطلب الصلاحية.`,
            `Vous n'avez pas la permission d'accéder à «${pageName}». Contactez l'administrateur.`)}
      </div>
      <div style="background:rgba(240,78,106,0.06);border:1px solid rgba(240,78,106,0.2);border-radius:12px;padding:.8rem 1.4rem;margin-bottom:1.5rem;font-size:.82rem;color:var(--muted)">
        ${L('دورك الحالي:','Votre rôle :')} <strong style="color:var(--gold)">${ROLE_NAMES[Auth.getUser()?.role]||'—'}</strong>
      </div>
      <button class="btn btn-gold" onclick="App.navigate('dashboard')">⬅️ ${L('العودة للوحة التحكم','Retour au tableau de bord')}</button>
    </div>
  `);
}

const App = {
  currentPage: 'landing',
  params: {},
  navigate(page, params={}) {
    this.currentPage = page; this.params = params; this.render();
    window.scrollTo(0,0);
  },
  render() {
    const app = document.getElementById('app');
    const user = Auth.getUser();
    if (!user && !['landing','login'].includes(this.currentPage)) this.currentPage = 'landing';
    if (user && this.currentPage === 'login') this.currentPage = user.is_admin ? 'admin' : 'dashboard';
    if (user && this.currentPage === 'landing') this.currentPage = user.is_admin ? 'admin' : 'dashboard';

    // ── ADMIN GUARD: يمنع دخول المسؤول إلا عبر صفحة admin-login المنفصلة ──
    if (user && user.is_admin && !sessionStorage.getItem('sbtp_admin_auth')) {
      Auth.logout();
      window.location.href = 'admin-login.html';
      return;
    }
    // ── BLOCK normal users from reaching admin page ──
    if (user && !user.is_admin && this.currentPage === 'admin') {
      this.currentPage = 'dashboard';
    }

    // ── TRIAL EXPIRATION GUARD ──
    // إذا انتهت تجربة المستخدم أثناء استخدامه، يُعرض modal الشكر ويُمنع الوصول
    if (user && !user.is_admin && typeof TrialManager !== 'undefined') {
      try {
        const tenant = (typeof Auth.getTenant === 'function') ? Auth.getTenant() : null;
        if (tenant && (TrialManager.isExpired(tenant) || tenant.subscription_status === 'expired' || tenant.is_active === false)) {
          // تجنّب التكرار في نفس الجلسة
          if (!sessionStorage.getItem('sbtp_trial_modal_shown')) {
            sessionStorage.setItem('sbtp_trial_modal_shown', '1');
            // اقفل في Supabase + اعرض modal
            TrialManager.checkAndEnforce();
            return; // أوقف الـ render — modal سيتعامل مع كل شيء
          }
        }
      } catch(_) {}
    }

    // ── PERMISSION GUARD: block unauthorized page access ──
    if (user && !user.is_admin && this.currentPage !== 'landing' && this.currentPage !== 'login') {
      const permKey = PAGE_PERM_MAP[this.currentPage];
      if (permKey && !canView(this.currentPage)) {
        // Redirect to access denied page inline
        const pageLabel = {
          analytics:'التحليلات', projects:'المشاريع', compare:'مقارنة المشاريع',
          calendar:'التقويم', map:'الخريطة', kanban:'Kanban', gantt:'Gantt',
          workers:'العمال', attendance:'الحضور', salary:'الرواتب',
          transactions:'المعاملات', invoices:'الفواتير', inventory:'المخزون',
          equipment:'المعدات', materials:'المواد', documents:'الوثائق',
          reports:'التقارير', bank_report:'التقرير البنكي', simulator:'المحاكي',
          obligations:'الالتزامات', audit_log:'سجل النشاط', team:'الفريق'
        }[this.currentPage] || this.currentPage;
        app.innerHTML = accessDeniedHTML(pageLabel);
        this.bindEvents();
        applyDOMTranslation();
        return;
      }
    }

    const pages = { landing:Pages.landing, login:(()=>Pages.login(App.params&&App.params.mode)), dashboard:Pages.dashboard,
      projects:Pages.projects, workers:Pages.workers, equipment:Pages.equipment,
      transactions:Pages.transactions, attendance:Pages.attendance, reports:Pages.reports,
      settings:Pages.settings, admin:Pages.admin,
      project_detail:Pages.project_detail, materials:Pages.materials,
      analytics:Pages.analytics, kanban:Pages.kanban, gantt:Pages.gantt,
      salary:Pages.salary, invoices:Pages.invoices, inventory:Pages.inventory,
      documents:Pages.documents, team:Pages.team,
      compare:Pages.compare, calendar:Pages.calendar, map:Pages.map,
      simulator:Pages.simulator, bank_report:Pages.bankReport,
      audit_log:Pages.auditLog, obligations:Pages.obligations,
      dz_documents:Pages.dz_documents };
    const render = pages[this.currentPage];
    if (render) {
      app.innerHTML = render();
      this.bindEvents();
      this.animateBars();
      if (this.currentPage === 'analytics') setTimeout(initAnalyticsCharts, 150);
      if (this.currentPage === 'simulator') setTimeout(runSimulator, 100);
      if (this.currentPage === 'landing' && typeof initLandingEffects === 'function') setTimeout(initLandingEffects, 60);
      if (this.currentPage === 'login' && typeof initAuthEffects === 'function') setTimeout(initAuthEffects, 60);
      applyDOMTranslation(); // ← RADICAL FIX: translate every text node after render

      // ── إظهار/إخفاء زر الدردشة SmartAI حسب الصفحة الحالية ──
      // يظهر فقط لمستخدمي المؤسسة (tenant) وليس للمسؤول أو الصفحات العامة
      const fabEl = document.getElementById('aiFab');
      const chatPanelEl = document.getElementById('aiChatPanel');
      const currentUser = Auth.getUser();
      const isTenantPage = currentUser && !currentUser.is_admin && currentUser.tenant_id &&
                           !['landing','login'].includes(this.currentPage);
      if (fabEl) fabEl.style.display = isTenantPage ? '' : 'none';
      if (chatPanelEl && !isTenantPage) { chatPanelEl.style.display = 'none'; SmartAI.isOpen = false; }
    }
  },
  bindEvents() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); App.navigate(el.dataset.nav); });
    });
    document.querySelectorAll('[data-modal-open]').forEach(el => {
      el.addEventListener('click', () => { const m = document.getElementById(el.dataset.modalOpen); if(m) m.classList.add('show'); });
    });
    document.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', () => { const m = el.closest('.modal-overlay'); if(m) m.classList.remove('show'); });
    });
    document.querySelectorAll('.modal-overlay').forEach(el => {
      el.addEventListener('click', e => { if(e.target===el) el.classList.remove('show'); });
    });
    // ===== SIDEBAR TOGGLE (Mobile) =====
    window.openSidebar = function() {
      const sb = document.getElementById('sidebar');
      const ov = document.getElementById('sidebarOverlay');
      if(sb) sb.classList.add('open');
      if(ov) { ov.classList.add('show'); ov.style.display='block'; }
    };
    window.closeSidebar = function() {
      const sb = document.getElementById('sidebar');
      const ov = document.getElementById('sidebarOverlay');
      if(sb) sb.classList.remove('open');
      if(ov) { ov.classList.remove('show'); ov.style.display=''; }
    };
    document.querySelectorAll('.hamburger').forEach(ham => {
      ham.addEventListener('click', (e) => {
        e.stopPropagation();
        const sb = document.getElementById('sidebar');
        if(sb && sb.classList.contains('open')) window.closeSidebar();
        else window.openSidebar();
      });
    });
    // Close sidebar when clicking overlay
    const sov = document.getElementById('sidebarOverlay');
    if(sov) sov.addEventListener('click', window.closeSidebar);
    // Close sidebar on nav link click (mobile)
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if(window.innerWidth <= 900) window.closeSidebar();
      });
    });
    // ESC key closes sidebar
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape') window.closeSidebar();
    });
    document.querySelectorAll('[data-logout]').forEach(el => {
      el.addEventListener('click', () => Auth.logout());
    });
    document.querySelectorAll('[data-color]').forEach(el => {
      el.addEventListener('click', () => {
        const target = document.getElementById(el.dataset.target);
        if(target) target.value = el.dataset.color;
        el.closest('.color-options')?.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
      });
    });
  },
  animateBars() {
    setTimeout(() => {
      document.querySelectorAll('.progress-fill[data-width]').forEach(el => {
        el.style.width = (el.dataset.width||0) + '%';
      });
    }, 100);
  }
};

/* ══════════════════════════════════════════════════════
   SHARED LAYOUT
══════════════════════════════════════════════════════ */

function topbarHTML(breadcrumb) {
  const user = Auth.getUser();
  const initial = (user?.full_name||'U')[0].toUpperCase();
  const tid = user?.tenant_id;
  // Check budget alerts
  const projects = tid ? DB.get('projects').filter(p=>p.tenant_id===tid&&!p.is_archived) : [];
  const alertCount = projects.filter(p=>p.total_spent >= p.budget*0.9 && p.budget>0).length;
  return `<header class="topbar">
    <div style="display:flex;align-items:center;gap:.8rem">
      <button class="hamburger">☰</button>
      <div class="topbar-breadcrumb">SmartStruct <span style="opacity:.3">›</span> ${breadcrumb}</div>
    </div>
    <div style="display:flex;align-items:center;gap:.6rem">
      ${alertCount>0?`<div class="notif-bell" title="${alertCount} مشروع يقترب من تجاوز الميزانية" onclick="App.navigate('reports')">🔔<span class="notif-dot"></span></div>`:''}
      <button class="btn btn-ghost btn-sm" data-nav="landing" style="font-size:.78rem">🌐 ${I18N.currentLang==='ar'?'الموقع':'Site'}</button>
      <button class="lang-toggle-btn" style="padding:.25rem .7rem;font-size:.72rem" onclick="I18N.setLang(I18N.currentLang==='ar'?'fr':'ar')" title="${I18N.currentLang==='ar'?'Français':'العربية'}">
        ${I18N.currentLang === 'ar' ? '🇫🇷 FR' : '🇩🇿 AR'}
      </button>
      <div id="syncPill" title="${L('حالة المزامنة مع Supabase','État de synchronisation Supabase')}" style="display:flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:.7rem;font-weight:700;cursor:pointer;background:rgba(52,195,143,.1);border:1px solid rgba(52,195,143,.25);color:#34C38F;transition:all .3s" onclick="App.navigate('settings')"><span id="syncDot" style="width:7px;height:7px;border-radius:50%;background:#34C38F;display:inline-block;animation:syncPulse 2s infinite"></span> <span id="syncLabel">${L('متزامن','Synchronisé')}</span></div>
      <div class="topbar-user">
        <div class="topbar-avatar" title="${escHtml(user?.full_name||'')}">${initial}</div>
        <span style="font-size:.82rem;color:var(--muted)">${escHtml((user?.full_name||'').split(' ')[0])}</span>
      </div>
    </div>
  </header>`;
}

function layoutHTML(active, breadcrumb, content) {
  return `<div class="app-shell"><div class="sidebar-overlay" id="sidebarOverlay" onclick="window.closeSidebar()"></div>${sidebarHTML(active)}
  <div class="main-wrap">
    ${topbarHTML(breadcrumb)}
    <main class="page-content animate-fade">${content}</main>
    <footer style="padding:.8rem 1.8rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem">
      <span style="font-size:.7rem;color:var(--dim)">© 2025 SmartStruct — منصة إدارة مشاريع المقاولة الجزائرية</span>
      <span style="font-size:.7rem;color:var(--dim)">v7.0</span>
    </footer>
  </div></div>`;
}

/* ══════════════════════════════════════════════════════
   PAGES
══════════════════════════════════════════════════════ */

function attTodayWidget(workers) {
  var att = DB.get('attendance');
  var today = todayStr();
  var todayAtt = att.filter(function(a) {
    return a.date === today && workers.find(function(w) { return w.id === a.worker_id; });
  });
  var todayPresent  = todayAtt.filter(function(a) { return a.status === 'present'; }).length;
  var todayAbsent   = todayAtt.filter(function(a) { return a.status === 'absent'; }).length;
  var todayUnmarked = workers.length - todayAtt.length;
  var pct = workers.length ? Math.round(todayPresent / workers.length * 100) : 0;
  var L = function(ar, fr) { return I18N.currentLang === 'ar' ? ar : fr; };
  var warnDiv = todayUnmarked > 0
    ? ('<div style="margin-top:.6rem;padding:.5rem .8rem;background:rgba(232,184,75,.06);border:1px solid rgba(232,184,75,.2);border-radius:8px;font-size:.75rem;color:var(--gold)">\u26a0\ufe0f '
       + todayUnmarked + ' ' + L('\u0639\u0627\u0645\u0644 \u0644\u0645 \u064a\u064f\u0633\u062c\u064e\u0651\u0644 \u062d\u0636\u0648\u0631\u0647 \u0627\u0644\u064a\u0648\u0645 \u2014 ', 'ouvrier(s) non enregistr\u00e9(s) \u2014 ') + '<span onclick="sessionStorage.setItem(\'att_date\',todayStr());App.navigate(\'attendance\')" style="cursor:pointer;text-decoration:underline">' + L('\u0633\u062c\u0651\u0644 \u0627\u0644\u0622\u0646','Enregistrer') + '</span></div>')
    : '<div style="margin-top:.6rem;padding:.5rem .8rem;background:rgba(52,195,143,.06);border:1px solid rgba(52,195,143,.2);border-radius:8px;font-size:.75rem;color:var(--green)">\u2705 ' + L('\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 \u062d\u0636\u0648\u0631 \u062c\u0645\u064a\u0639 \u0627\u0644\u0639\u0645\u0627\u0644 \u0627\u0644\u064a\u0648\u0645', 'Pr\u00e9sence de tous les ouvriers enregistr\u00e9e') + '</div>';
  return '<div class="card" style="margin-bottom:1rem;padding:1rem 1.2rem">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.8rem">'
    + '<div style="font-weight:800;font-size:.9rem">\ud83d\udcc5 ' + L('\u062d\u0636\u0648\u0631 \u0627\u0644\u064a\u0648\u0645','Pr\u00e9sence du jour') + '</div>'
    + '<button class="btn btn-gold btn-sm" onclick="sessionStorage.setItem(\'att_date\',todayStr());App.navigate(\'attendance\')">' + L('\u0633\u062c\u0651\u0644 \u0627\u0644\u062d\u0636\u0648\u0631 \u2190','Enregistrer \u2192') + '</button>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem">'
    + '<div style="text-align:center;padding:.5rem;background:rgba(52,195,143,.08);border:1px solid rgba(52,195,143,.2);border-radius:10px"><div style="font-size:1.3rem;font-weight:900;color:var(--green)">' + todayPresent  + '</div><div style="font-size:.7rem;color:var(--dim)">\u2705 ' + L('\u062d\u0627\u0636\u0631','Pr\u00e9sent') + '</div></div>'
    + '<div style="text-align:center;padding:.5rem;background:rgba(240,78,106,.08);border:1px solid rgba(240,78,106,.2);border-radius:10px"><div style="font-size:1.3rem;font-weight:900;color:var(--red)">'   + todayAbsent   + '</div><div style="font-size:.7rem;color:var(--dim)">\u274c ' + L('\u063a\u0627\u0626\u0628','Absent') + '</div></div>'
    + '<div style="text-align:center;padding:.5rem;background:rgba(232,184,75,.08);border:1px solid rgba(232,184,75,.2);border-radius:10px"><div style="font-size:1.3rem;font-weight:900;color:var(--gold)">' + todayUnmarked + '</div><div style="font-size:.7rem;color:var(--dim)">\u23f3 ' + L('\u0644\u0645 \u064a\u064f\u0633\u062c\u064e\u0651\u0644','Non enreg.') + '</div></div>'
    + '<div style="text-align:center;padding:.5rem;background:rgba(74,144,226,.08);border:1px solid rgba(74,144,226,.2);border-radius:10px"><div style="font-size:1.3rem;font-weight:900;color:var(--blue)">' + pct + '%</div><div style="font-size:.7rem;color:var(--dim)">\ud83d\udcca ' + L('\u0646\u0633\u0628\u0629 \u0627\u0644\u062d\u0636\u0648\u0631','Taux pr\u00e9sence') + '</div></div>'
    + '</div>'
    + warnDiv
    + '</div>';
}

const Pages = {};

/* ─── LANDING PAGE — v7.2 PRO 3D ─── */
Pages.landing = function() {
  const user = Auth.getUser();
  const isAr = I18N.currentLang === 'ar';

  return `<div class="landing-page" id="landingRoot">
    <!-- ═══ ATMOSPHERE LAYERS ═══ -->
    <div class="ll-atmosphere"></div>
    <div class="ll-particles" id="llParticles"></div>

    <!-- ═══ NAVBAR ═══ -->
    <nav class="ll-nav" id="llNav">
      <a class="ll-nav-logo" data-nav="landing" onclick="event.preventDefault();window.scrollTo({top:0,behavior:'smooth'})">
        <div class="ll-nav-logo-mark">${ssLogo(22)}</div>
        <div class="ll-nav-logo-text">
          <div class="ll-nav-logo-name">SmartStruct</div>
          <div class="ll-nav-logo-sub">v7.2 PRO</div>
        </div>
      </a>

      <div class="ll-nav-links">
        <a class="ll-nav-link" href="#ll-features">${L('المزايا','Fonctionnalités')}</a>
        <a class="ll-nav-link" href="#ll-showcase">${L('عرض الواجهة','Aperçu')}</a>
        <a class="ll-nav-link" href="#ll-benefits">${L('الفوائد','Avantages')}</a>
        <a class="ll-nav-link" href="#ll-pricing">${L('الأسعار','Tarifs')}</a>
      </div>

      <div class="ll-nav-cta">
        <button class="ll-lang-btn" onclick="I18N.setLang(I18N.currentLang==='ar'?'fr':'ar')" title="${L('Français','العربية')}">
          ${isAr ? '🇫🇷 FR' : '🇩🇿 AR'}
        </button>
        ${user
          ? `<button class="ll-btn ll-btn-gold ll-btn-sm" data-nav="${user.is_admin?'admin':'dashboard'}">→ ${L('لوحة التحكم','Tableau de bord')}</button>`
          : `<button class="ll-btn ll-btn-ghost ll-btn-sm" onclick="showLoginPanel()">${L('دخول','Connexion')}</button>
             <button class="ll-btn ll-btn-gold ll-btn-sm" onclick="showRegisterPanel()">${L('جرّب مجاناً','Essai gratuit')}</button>`
        }
      </div>
    </nav>

    <!-- ═══ HERO ═══ -->
    <section class="ll-hero">
      <!-- خلفية مقاولاتية هندسية -->
      <svg class="ll-hero-bg" viewBox="0 0 1440 900" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e8b84b;stop-opacity:0.03"/>
            <stop offset="100%" style="stop-color:#e8b84b;stop-opacity:0.01"/>
          </linearGradient>
          <!-- شبكة هندسية خفيفة -->
          <pattern id="gridPat" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(232,184,75,0.07)" stroke-width="0.8"/>
          </pattern>
          <!-- خطوط قُطرية -->
          <pattern id="diagPat" width="120" height="120" patternUnits="userSpaceOnUse">
            <line x1="0" y1="120" x2="120" y2="0" stroke="rgba(232,184,75,0.04)" stroke-width="1"/>
          </pattern>
        </defs>

        <!-- طبقة شبكة -->
        <rect width="1440" height="900" fill="url(#gridPat)"/>
        <rect width="1440" height="900" fill="url(#diagPat)"/>

        <!-- رافعة بناء — يمين (إحداثيات مصحّحة داخل viewBox 1440x900) -->
        <g opacity="0.13" stroke="#e8b84b" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- عمود الرافعة الرأسي: x=1280, من y=30 إلى y=820 -->
          <line x1="1280" y1="30" x2="1280" y2="820"/>
          <!-- ذراع أفقي رئيسي: يمتد يساراً من العمود -->
          <line x1="1280" y1="80" x2="1060" y2="80"/>
          <!-- ذراع ثقل الموازنة: يمتد يميناً -->
          <line x1="1280" y1="80" x2="1380" y2="80"/>
          <!-- حبل التعليق من طرف الذراع -->
          <line x1="1065" y1="80" x2="1065" y2="260"/>
          <!-- خطوط دعم مائلة -->
          <line x1="1280" y1="120" x2="1090" y2="80"/>
          <line x1="1280" y1="160" x2="1090" y2="80"/>
          <!-- شبكة العمود (مزيكا) -->
          <line x1="1270" y1="100" x2="1290" y2="100"/>
          <line x1="1270" y1="140" x2="1290" y2="140"/>
          <line x1="1270" y1="180" x2="1290" y2="180"/>
          <line x1="1270" y1="220" x2="1290" y2="220"/>
          <line x1="1270" y1="260" x2="1290" y2="260"/>
          <line x1="1270" y1="300" x2="1290" y2="300"/>
          <line x1="1270" y1="340" x2="1290" y2="340"/>
          <line x1="1270" y1="380" x2="1290" y2="380"/>
          <line x1="1270" y1="420" x2="1290" y2="420"/>
          <line x1="1270" y1="460" x2="1290" y2="460"/>
          <line x1="1270" y1="500" x2="1290" y2="500"/>
          <line x1="1270" y1="540" x2="1290" y2="540"/>
          <line x1="1270" y1="580" x2="1290" y2="580"/>
          <line x1="1270" y1="620" x2="1290" y2="620"/>
          <line x1="1270" y1="660" x2="1290" y2="660"/>
          <line x1="1270" y1="700" x2="1290" y2="700"/>
          <line x1="1270" y1="740" x2="1290" y2="740"/>
          <line x1="1270" y1="780" x2="1290" y2="780"/>
          <!-- قاعدة الرافعة -->
          <line x1="1240" y1="820" x2="1320" y2="820"/>
          <line x1="1250" y1="800" x2="1310" y2="800"/>
          <!-- علبة الرفع (hook box) -->
          <rect x="1048" y="255" width="34" height="26" rx="3" fill="rgba(232,184,75,0.08)"/>
          <!-- خطاف الرافعة -->
          <path d="M1065 281 Q1075 295 1065 305 Q1055 315 1060 325" stroke-width="2"/>
          <!-- ثقل الموازنة يمين -->
          <rect x="1330" y="70" width="50" height="20" rx="3" fill="rgba(232,184,75,0.08)"/>
        </g>

        <!-- مخطط هندسي — يسار أسفل -->
        <g opacity="0.07" stroke="#e8b84b" stroke-width="1.5" fill="none" stroke-linecap="round" transform="translate(40, 480)">
          <!-- مستطيل مبنى -->
          <rect x="20" y="20" width="200" height="160" rx="2"/>
          <!-- طوابق -->
          <line x1="20" y1="73" x2="220" y2="73"/>
          <line x1="20" y1="126" x2="220" y2="126"/>
          <!-- نوافذ طابق 1 -->
          <rect x="45" y="35" width="30" height="25" rx="1"/>
          <rect x="95" y="35" width="30" height="25" rx="1"/>
          <rect x="145" y="35" width="30" height="25" rx="1"/>
          <!-- نوافذ طابق 2 -->
          <rect x="45" y="88" width="30" height="25" rx="1"/>
          <rect x="95" y="88" width="30" height="25" rx="1"/>
          <rect x="145" y="88" width="30" height="25" rx="1"/>
          <!-- باب -->
          <rect x="90" y="135" width="40" height="45" rx="2"/>
          <!-- خطوط قياس -->
          <line x1="-15" y1="20" x2="-15" y2="180"/>
          <line x1="-20" y1="20" x2="-10" y2="20"/>
          <line x1="-20" y1="180" x2="-10" y2="180"/>
          <line x1="20" y1="195" x2="220" y2="195"/>
          <line x1="20" y1="190" x2="20" y2="200"/>
          <line x1="220" y1="190" x2="220" y2="200"/>
        </g>

        <!-- نقاط زاوية هندسية — يسار أعلى -->
        <g opacity="0.1" stroke="#e8b84b" stroke-width="1.5" fill="rgba(232,184,75,0.15)" transform="translate(60, 60)">
          <circle cx="0" cy="0" r="4"/>
          <circle cx="80" cy="0" r="4"/>
          <circle cx="0" cy="80" r="4"/>
          <line x1="0" y1="0" x2="80" y2="0"/>
          <line x1="0" y1="0" x2="0" y2="80"/>
          <line x1="4" y1="4" x2="30" y2="30"/>
        </g>

        <!-- خطوط ضوء في المنتصف -->
        <ellipse cx="720" cy="420" rx="520" ry="300" fill="radial" opacity="0"/>
        <radialGradient id="glowCenter" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:#e8b84b;stop-opacity:0.04"/>
          <stop offset="100%" style="stop-color:#e8b84b;stop-opacity:0"/>
        </radialGradient>
        <ellipse cx="720" cy="430" rx="600" ry="350" fill="url(#glowCenter)"/>
      </svg>
      <div class="ll-hero-badge">
        <span class="ll-hero-badge-dot"></span>
        ${L('تجربة مجانية 14 يوماً — بدون بطاقة بنكية','Essai gratuit 14 jours — sans carte bancaire')}
      </div>

      <h1 class="ll-hero-title">
        ${L('إدارة مشاريع المقاولة','Gestion de projets')}<br>
        <span class="ll-word-gold">${L('بذكاءٍ احترافي','en intelligence pro')}</span>
      </h1>

      <p class="ll-hero-sub">
        ${L(
          'منصة متكاملة لشركات المقاولة الجزائرية — من إدارة المشاريع والعمال إلى الفوترة والتوقعات المالية، مدعومة بالذكاء الاصطناعي ومتوافقة مع القانون الجزائري (NIF/NIS/RC + TVA 19٪).',
          'Plateforme complète pour les entreprises de BTP en Algérie — projets, ouvriers, facturation, prévisions financières, le tout propulsé par l\'IA et conforme à la loi algérienne (NIF/NIS/RC + TVA 19%).'
        )}
      </p>

      <div class="ll-hero-actions">
        ${user
          ? `<button class="ll-btn ll-btn-gold ll-btn-lg" data-nav="${user.is_admin?'admin':'dashboard'}">
               ${L('الذهاب للوحة التحكم','Tableau de bord')}
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:${isAr?'rotate(180deg)':'none'}"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
             </button>`
          : `<button class="ll-btn ll-btn-gold ll-btn-lg" onclick="showRegisterPanel()">
               ${L('ابدأ التجربة الآن','Commencer l\'essai')}
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:${isAr?'rotate(180deg)':'none'}"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
             </button>`
        }
        <a class="ll-btn ll-btn-ghost ll-btn-lg" href="#ll-showcase">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          ${L('شاهد العرض','Voir la démo')}
        </a>
      </div>

      <div class="ll-hero-trust">
        <div class="ll-trust-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ${L('27 جدول قاعدة بيانات','27 tables de BDD')}
        </div>
        <div class="ll-trust-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ${L('تشفير PBKDF2','Chiffrement PBKDF2')}
        </div>
        <div class="ll-trust-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Row-Level Security
        </div>
        <div class="ll-trust-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ${L('دعم عربي كامل','Support arabe complet')}
        </div>
      </div>

      <!-- ═══ 3D HERO SCENE ═══ -->
      <div class="ll-scene">
        <div class="ll-scene-glow"></div>
        <div class="ll-scene-stage" id="llSceneStage">

          <!-- Floating: Projects (top-right in LTR / top-left in RTL via auto reposition) -->
          <div class="ll-float-card ll-fc-stat ll-fc-projects">
            <div class="ll-fc-mini-icon ll-icon-projects">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <div class="ll-fc-mini-label">${L('المشاريع النشطة','Projets actifs')}</div>
            <div class="ll-fc-mini-val">12</div>
            <div class="ll-fc-mini-trend ll-trend-up">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              ${L('+3 هذا الشهر','+3 ce mois')}
            </div>
          </div>

          <!-- Floating: Workers -->
          <div class="ll-float-card ll-fc-stat ll-fc-workers">
            <div class="ll-fc-mini-icon ll-icon-workers">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div class="ll-fc-mini-label">${L('العمال الحاضرون','Ouvriers présents')}</div>
            <div class="ll-fc-mini-val">87 / 92</div>
            <div class="ll-fc-mini-trend ll-trend-up">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              ${L('نسبة 94٪','Taux 94%')}
            </div>
          </div>

          <!-- Floating: Revenue -->
          <div class="ll-float-card ll-fc-stat ll-fc-revenue">
            <div class="ll-fc-mini-icon ll-icon-revenue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="ll-fc-mini-label">${L('إيرادات الشهر','Revenus du mois')}</div>
            <div class="ll-fc-mini-val">4.2M <span style="font-size:.7rem;color:var(--muted)">${L('دج','DA')}</span></div>
            <div class="ll-fc-mini-trend ll-trend-up">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              +18.4٪
            </div>
          </div>

          <!-- Floating: AI -->
          <div class="ll-float-card ll-fc-stat ll-fc-ai">
            <div class="ll-fc-mini-icon ll-icon-ai">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </div>
            <div class="ll-fc-mini-label">SmartAI</div>
            <div class="ll-ai-typing">
              <span class="ll-typing-dot"></span><span class="ll-typing-dot"></span><span class="ll-typing-dot"></span>
              <span class="ll-ai-text">${L('يحلل بياناتك...','analyse en cours...')}</span>
            </div>
          </div>

          <!-- Main dashboard card -->
          <div class="ll-float-card ll-fc-main">
            <div class="ll-fc-header">
              <div class="ll-fc-title">
                <div class="ll-fc-title-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#09120A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17l-5-5-4 4-4-4"/></svg>
                </div>
                ${L('لوحة التحكم','Tableau de bord')}
              </div>
              <div class="ll-fc-dots">
                <span class="ll-fc-dot ll-active"></span><span class="ll-fc-dot"></span><span class="ll-fc-dot"></span>
              </div>
            </div>
            <div class="ll-fc-stats">
              <div class="ll-fc-stat-box">
                <div class="ll-fc-stat-label">${L('إجمالي المشاريع','Total projets')}</div>
                <div class="ll-fc-stat-val ll-gold">24</div>
              </div>
              <div class="ll-fc-stat-box">
                <div class="ll-fc-stat-label">${L('معدل الإنجاز','Avancement')}</div>
                <div class="ll-fc-stat-val ll-green">76%</div>
              </div>
              <div class="ll-fc-stat-box">
                <div class="ll-fc-stat-label">${L('صافي الربح','Bénéfice net')}</div>
                <div class="ll-fc-stat-val">1.8M</div>
              </div>
            </div>
            <div class="ll-fc-chart">
              <svg viewBox="0 0 500 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="llGoldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#E8B84B" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#E8B84B" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <line class="ll-chart-grid" x1="0" y1="30" x2="500" y2="30"/>
                <line class="ll-chart-grid" x1="0" y1="60" x2="500" y2="60"/>
                <line class="ll-chart-grid" x1="0" y1="90" x2="500" y2="90"/>
                <path class="ll-chart-area" d="M0,90 L40,75 L80,82 L120,55 L160,62 L200,40 L240,48 L280,30 L320,35 L360,18 L400,25 L440,12 L480,20 L500,15 L500,120 L0,120 Z"/>
                <path class="ll-chart-line" d="M0,90 L40,75 L80,82 L120,55 L160,62 L200,40 L240,48 L280,30 L320,35 L360,18 L400,25 L440,12 L480,20 L500,15"/>
              </svg>
            </div>
          </div>

          <div class="ll-scene-platform"></div>
        </div>
      </div>

      <!-- ═══ STATS BAR ═══ -->
      <div class="ll-stats-bar ll-reveal">
        <div class="ll-stat-item">
          <div class="ll-stat-number" data-target="27">0</div>
          <div class="ll-stat-label">${L('جدول قاعدة بيانات','Tables de BDD')}</div>
        </div>
        <div class="ll-stat-item">
          <div class="ll-stat-number" data-target="19">0</div>
          <div class="ll-stat-label">${L('ميزة احترافية','Fonctionnalités pro')}</div>
        </div>
        <div class="ll-stat-item">
          <div class="ll-stat-number"><span data-target="14">0</span> ${L('يوم','jours')}</div>
          <div class="ll-stat-label">${L('تجربة مجانية','Essai gratuit')}</div>
        </div>
        <div class="ll-stat-item">
          <div class="ll-stat-number">100<span style="font-size:1.5rem">٪</span></div>
          <div class="ll-stat-label">${L('متوافق مع القانون الجزائري','Conforme loi algérienne')}</div>
        </div>
      </div>
    </section>

    <!-- ═══ FEATURES ═══ -->
    <section class="ll-section" id="ll-features">
      <div class="ll-section-head ll-reveal">
        <span class="ll-eyebrow">${L('19 ميزة احترافية','19 fonctionnalités pro')}</span>
        <h2 class="ll-section-title">${L('كل ما تحتاجه شركتك','Tout ce dont votre entreprise a besoin')}<br><span class="ll-gold">${L('في منصة واحدة','dans une seule plateforme')}</span></h2>
        <p class="ll-section-desc">${L(
          'من تشفير البيانات إلى توقعات السيولة، من توليد PDF إلى تتبع GPS — أدوات حقيقية لمشاكل حقيقية في قطاع البناء.',
          'Du chiffrement aux prévisions de trésorerie, du PDF au GPS — des outils réels pour des problèmes réels du BTP.'
        )}</p>
      </div>

      <div class="ll-features-grid">
        <div class="ll-feature-card ll-reveal" data-tilt>
          <span class="ll-feature-tag">${L('أمان','Sécurité')}</span>
          <div class="ll-feature-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h3 class="ll-feature-title">${L('تشفير عسكري','Chiffrement militaire')}</h3>
          <p class="ll-feature-desc">${L('PBKDF2 + SHA-256 + 100,000 تكرار · Row-Level Security · سجل تدقيق كامل لكل تعديل.','PBKDF2 + SHA-256 + 100k itérations · RLS · audit log complet.')}</p>
        </div>

        <div class="ll-feature-card ll-reveal" data-tilt>
          <span class="ll-feature-tag">${L('جديد','Nouveau')}</span>
          <div class="ll-feature-icon ll-purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg>
          </div>
          <h3 class="ll-feature-title">${L('SmartAI — مساعد ذكي','SmartAI — assistant IA')}</h3>
          <p class="ll-feature-desc">${L('يحلّل مشاريعك ويكتب تقارير شهرية بالعربية مع توصيات قابلة للتنفيذ. مدعوم بـ Groq.','Analyse vos projets et rédige des rapports mensuels avec recommandations. Propulsé par Groq.')}</p>
        </div>

        <div class="ll-feature-card ll-reveal" data-tilt>
          <span class="ll-feature-tag">PDF</span>
          <div class="ll-feature-icon ll-red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <h3 class="ll-feature-title">${L('فواتير وعقود رسمية','Factures & contrats officiels')}</h3>
          <p class="ll-feature-desc">${L('PDF احترافي مع NIF/NIS/RC، TVA 19٪، عقود عمل حسب القانون الجزائري، وتوقيع إلكتروني.','PDF pro avec NIF/NIS/RC, TVA 19%, contrats conformes & signature électronique.')}</p>
        </div>

        <div class="ll-feature-card ll-reveal" data-tilt>
          <span class="ll-feature-tag">${L('مالي','Finance')}</span>
          <div class="ll-feature-icon ll-green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <h3 class="ll-feature-title">${L('توقعات السيولة 90 يوم','Prévisions cash 90 jours')}</h3>
          <p class="ll-feature-desc">${L('منحنى رصيد متوقع للأشهر الثلاثة القادمة + تنبيهات استباقية + استيراد كشوف CCP/BNA/BEA.','Courbe de solde projetée + alertes proactives + import des relevés CCP/BNA/BEA.')}</p>
        </div>

        <div class="ll-feature-card ll-reveal" data-tilt>
          <span class="ll-feature-tag">${L('ميدان','Terrain')}</span>
          <div class="ll-feature-icon ll-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <h3 class="ll-feature-title">${L('تتبع GPS للمعدات','Suivi GPS du matériel')}</h3>
          <p class="ll-feature-desc">${L('QR لكل معدة → مسح بالهاتف → تسجيل الموقع تلقائياً. وضع ميدان مبسط بـ 5 أزرار كبيرة.','QR par engin → scan → géolocalisation auto. Mode chantier à 5 gros boutons.')}</p>
        </div>

        <div class="ll-feature-card ll-reveal" data-tilt>
          <span class="ll-feature-tag">${L('إنتاجية','Productivité')}</span>
          <div class="ll-feature-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <h3 class="ll-feature-title">${L('بحث فوري شامل','Recherche globale instantanée')}</h3>
          <p class="ll-feature-desc">${L('Ctrl+K → ابحث في كل البيانات: مشاريع، عمال، فواتير، ملاحظات. تصدير Excel بنقرة واحدة.','Ctrl+K → cherchez partout : projets, ouvriers, factures. Export Excel en un clic.')}</p>
        </div>

        <div class="ll-feature-card ll-reveal" data-tilt>
          <span class="ll-feature-tag">${L('عمال','RH')}</span>
          <div class="ll-feature-icon ll-green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h3 class="ll-feature-title">${L('إدارة العمال والرواتب','Gestion RH & paie')}</h3>
          <p class="ll-feature-desc">${L('تسجيل الحضور والغياب، كشوف الرواتب التلقائية، تتبع الإضافي والسلف — كل شيء في مكان واحد.','Pointage, fiches de paie automatiques, heures sup & avances — tout centralisé.')}</p>
        </div>

        <div class="ll-feature-card ll-reveal" data-tilt>
          <span class="ll-feature-tag">${L('مخزون','Stock')}</span>
          <div class="ll-feature-icon ll-red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <h3 class="ll-feature-title">${L('مراقبة المواد والمخزون','Suivi matériaux & stock')}</h3>
          <p class="ll-feature-desc">${L('تتبع دخول وخروج المواد لكل مشروع، تنبيهات نقص المخزون، وربط مباشر مع المصاريف.','Entrées/sorties par chantier, alertes rupture de stock, liaison directe aux dépenses.')}</p>
        </div>
      </div>
    </section>

    <!-- ═══ SHOWCASE ═══ -->
    <section class="ll-section" id="ll-showcase">
      <div class="ll-section-head ll-reveal">
        <span class="ll-eyebrow">${L('واجهة عربية احترافية','Interface arabe professionnelle')}</span>
        <h2 class="ll-section-title">${L('صُممت','Conçue')}<span class="ll-gold"> ${L('للسرعة والوضوح','pour vitesse & clarté')}</span></h2>
        <p class="ll-section-desc">${L('واجهة RTL كاملة، 3 ثيمات (داكن، فاتح، ذهبي)، أيقونات واضحة، وتجربة سلسة على الهاتف والحاسوب.','RTL complet, 3 thèmes, icônes claires, expérience fluide sur mobile et desktop.')}</p>
      </div>

      <div class="ll-showcase ll-reveal">
        <div class="ll-showcase-stage" id="llShowcaseStage">
          <div class="ll-showcase-screen">
            <div class="ll-showcase-toolbar">
              <span class="ll-tb-dot ll-r"></span><span class="ll-tb-dot ll-y"></span><span class="ll-tb-dot ll-g"></span>
              <span class="ll-tb-url">smartstruct.dz/dashboard</span>
            </div>
            <div class="ll-showcase-body">
              <div class="ll-sc-sidebar">
                <div class="ll-sc-nav ll-active">
                  <svg class="ll-sc-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
                  <span>${L('لوحة التحكم','Tableau')}</span>
                </div>
                <div class="ll-sc-nav">
                  <svg class="ll-sc-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  <span>${L('المشاريع','Projets')}</span>
                </div>
                <div class="ll-sc-nav">
                  <svg class="ll-sc-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  <span>${L('العمال','Ouvriers')}</span>
                </div>
                <div class="ll-sc-nav">
                  <svg class="ll-sc-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  <span>${L('الفواتير','Factures')}</span>
                </div>
                <div class="ll-sc-nav">
                  <svg class="ll-sc-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                  <span>${L('التقارير','Rapports')}</span>
                </div>
                <div class="ll-sc-nav">
                  <svg class="ll-sc-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>
                  <span>SmartAI</span>
                </div>
              </div>
              <div class="ll-sc-content">
                <div class="ll-sc-stats">
                  <div class="ll-sc-stat-box"><div class="ll-sc-stat-label">${L('المشاريع','Projets')}</div><div class="ll-sc-stat-val">24</div></div>
                  <div class="ll-sc-stat-box"><div class="ll-sc-stat-label">${L('العمال','Ouvriers')}</div><div class="ll-sc-stat-val">92</div></div>
                  <div class="ll-sc-stat-box"><div class="ll-sc-stat-label">${L('الإيرادات','Revenus')}</div><div class="ll-sc-stat-val">4.2M</div></div>
                  <div class="ll-sc-stat-box"><div class="ll-sc-stat-label">${L('الربح','Bénéfice')}</div><div class="ll-sc-stat-val">1.8M</div></div>
                </div>
                <div class="ll-sc-graph">
                  <svg viewBox="0 0 400 140" preserveAspectRatio="none">
                    <rect x="20" y="80" width="20" height="50" rx="3" fill="rgba(232,184,75,0.3)"/>
                    <rect x="55" y="60" width="20" height="70" rx="3" fill="rgba(232,184,75,0.5)"/>
                    <rect x="90" y="70" width="20" height="60" rx="3" fill="rgba(232,184,75,0.4)"/>
                    <rect x="125" y="40" width="20" height="90" rx="3" fill="rgba(232,184,75,0.6)"/>
                    <rect x="160" y="55" width="20" height="75" rx="3" fill="rgba(232,184,75,0.5)"/>
                    <rect x="195" y="30" width="20" height="100" rx="3" fill="rgba(232,184,75,0.7)"/>
                    <rect x="230" y="20" width="20" height="110" rx="3" fill="#E8B84B"/>
                    <rect x="265" y="50" width="20" height="80" rx="3" fill="rgba(232,184,75,0.5)"/>
                    <rect x="300" y="35" width="20" height="95" rx="3" fill="rgba(232,184,75,0.6)"/>
                    <rect x="335" y="15" width="20" height="115" rx="3" fill="#F5D07A"/>
                    <path d="M30,90 Q70,70 100,80 T180,55 T260,40 T340,25" stroke="#E8B84B" stroke-width="2" fill="none" stroke-linecap="round" filter="drop-shadow(0 0 4px #E8B84B)"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ BENEFITS ═══ -->
    <section class="ll-section" id="ll-benefits">
      <div class="ll-section-head ll-reveal">
        <span class="ll-eyebrow">${L('حلول مصممة لقطاعك','Solutions sur mesure')}</span>
        <h2 class="ll-section-title">${L('من الميدان إلى','Du chantier à la')}<span class="ll-gold"> ${L('غرفة الاجتماعات','salle de réunion')}</span></h2>
        <p class="ll-section-desc">${L('SmartStruct يغطي كل أبعاد عمل شركة المقاولة الجزائرية — قانونياً، مالياً، وميدانياً.','SmartStruct couvre toutes les dimensions du BTP algérien — légal, financier, terrain.')}</p>
      </div>

      <div class="ll-benefits">

        <!-- Row 1: PDF -->
        <div class="ll-benefit-row ll-reveal">
          <div class="ll-benefit-content">
            <h3>${L('فواتير و','Factures &')}<span class="ll-gold">${L('عقود قانونية','contrats légaux')}</span> ${L('بنقرة واحدة','en un clic')}</h3>
            <p>${L('توقَّف عن إعادة تنسيق نفس الفاتورة كل مرة. SmartStruct يولّد فواتير PDF احترافية متوافقة مع القانون الجزائري في ثوانٍ.','Cessez de reformater à chaque fois. SmartStruct génère des factures PDF pro conformes en quelques secondes.')}</p>
            <ul class="ll-benefit-list">
              <li><span class="ll-check">✓</span> ${L('NIF / NIS / RC تلقائياً في الترويسة','NIF / NIS / RC auto en en-tête')}</li>
              <li><span class="ll-check">✓</span> ${L('TVA 19٪ محسوبة بدقة + مكان الختم','TVA 19% calculée + emplacement cachet')}</li>
              <li><span class="ll-check">✓</span> ${L('عقود عمل حسب قانون العمل الجزائري','Contrats conformes au droit du travail')}</li>
              <li><span class="ll-check">✓</span> ${L('توقيع إلكتروني عبر رابط فريد للعميل','Signature électronique via lien unique')}</li>
            </ul>
          </div>
          <div class="ll-benefit-visual">
            <div class="ll-benefit-stage">
              <div class="ll-pdf-mockup">
                <div class="ll-pdf-header">
                  <div>
                    <div class="ll-pdf-logo">${ssLogo(26, true)}</div>
                  </div>
                  <div style="text-align:${isAr?'right':'left'}">
                    <div class="ll-pdf-co">${L('شركة الإنشاءات الجزائرية','Sté Constructions DZ')}</div>
                    <div class="ll-pdf-co-sub">NIF: 0987 6543 21 · RC: 16/00-A123</div>
                  </div>
                  <div class="ll-pdf-num">
                    ${L('فاتورة رقم','Facture N°')}
                    <strong>INV-2026-0142</strong>
                  </div>
                </div>
                <div class="ll-pdf-title">${L('تفاصيل الخدمات','Détails des prestations')}</div>
                <div class="ll-pdf-line"><span>${L('أعمال خرسانة مسلحة','Béton armé')}</span><span>1,250,000 ${L('دج','DA')}</span></div>
                <div class="ll-pdf-line"><span>${L('تركيب هيكل معدني','Structure métallique')}</span><span>875,000 ${L('دج','DA')}</span></div>
                <div class="ll-pdf-line"><span>${L('أعمال البناء — المرحلة 2','Maçonnerie — Phase 2')}</span><span>620,000 ${L('دج','DA')}</span></div>
                <div class="ll-pdf-line"><span>TVA 19٪</span><span>521,550 ${L('دج','DA')}</span></div>
                <div class="ll-pdf-total"><span>${L('الإجمالي المستحق','Total dû')}</span><span>3,266,550 ${L('دج','DA')}</span></div>
                <div class="ll-pdf-stamp">SmartStruct<br>VERIFIED</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Row 2: AI -->
        <div class="ll-benefit-row ll-reverse ll-reveal">
          <div class="ll-benefit-content">
            <h3>${L('مساعدك الذكي يعمل','Votre IA travaille')} <span class="ll-gold">${L('معك 24/7','avec vous 24/7')}</span></h3>
            <p>${L('SmartAI ليس chatbot عام — هو يعرف بياناتك، يحلل مشاريعك، ويعطيك توصيات قابلة للتنفيذ بالعربية.','SmartAI n\'est pas un chatbot générique — il connaît vos données et donne des recommandations concrètes.')}</p>
            <ul class="ll-benefit-list">
              <li><span class="ll-check">✓</span> ${L('تحليل ربحية كل مشروع على حدة','Analyse de rentabilité par projet')}</li>
              <li><span class="ll-check">✓</span> ${L('تقارير شهرية احترافية تلقائية','Rapports mensuels pro automatiques')}</li>
              <li><span class="ll-check">✓</span> ${L('تنبيهات للمخاطر المالية مبكراً','Alertes financières précoces')}</li>
              <li><span class="ll-check">✓</span> ${L('14,400 سؤال يومياً مجاناً','14 400 questions/jour gratuites')}</li>
            </ul>
          </div>
          <div class="ll-benefit-visual">
            <div class="ll-benefit-stage">
              <div class="ll-ai-mockup">
                <div class="ll-ai-mock-header">
                  <div class="ll-ai-avatar-mock">🤖</div>
                  <div>
                    <div class="ll-ai-mock-name">SmartAI</div>
                    <div class="ll-ai-mock-status">${L('متصل — يحلّل بياناتك','En ligne — analyse en cours')}</div>
                  </div>
                </div>
                <div class="ll-ai-mock-body">
                  <div class="ll-ai-msg ll-user">${L('ما هو أفضل مشروع من حيث الربحية هذا الشهر؟','Quel projet est le plus rentable ce mois ?')}</div>
                  <div class="ll-ai-msg ll-bot">${L('مشروع "فيلا حيدرة" حقق هامش ربح 28٪ — الأعلى بين مشاريعك. لكن انتبه: مشروع "مبنى وهران" متأخر 12 يوماً.','Le projet "Villa Hydra" a une marge de 28% — la plus élevée. Attention : "Immeuble Oran" a 12 jours de retard.')}</div>
                  <div class="ll-ai-msg ll-user">${L('كم سأكسب نهاية الشهر؟','Combien à la fin du mois ?')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Row 3: Mobile / GPS -->
        <div class="ll-benefit-row ll-reveal">
          <div class="ll-benefit-content">
            <h3>${L('ميدان رقمي','Chantier numérique')}<span class="ll-gold"> ${L('في جيب كل عامل','dans la poche')}</span></h3>
            <p>${L('وضع الميدان (Mobile Mode) صُمم للعمال على ورشة البناء — ليس للمحاسبين خلف المكاتب.','Le mode Chantier est conçu pour les ouvriers sur le terrain — pas pour les comptables.')}</p>
            <ul class="ll-benefit-list">
              <li><span class="ll-check">✓</span> ${L('5 أزرار كبيرة فقط — حضور، مواد، صور، صرف، GPS','5 gros boutons : présence, matériaux, photos, dépense, GPS')}</li>
              <li><span class="ll-check">✓</span> ${L('تتبع GPS لكل معدة عبر QR code','Suivi GPS de chaque engin via QR')}</li>
              <li><span class="ll-check">✓</span> ${L('تسجيل الحضور بالموقع الجغرافي','Pointage avec géolocalisation')}</li>
              <li><span class="ll-check">✓</span> ${L('يعمل بدون إنترنت ويتزامن لاحقاً','Fonctionne offline + sync différée')}</li>
            </ul>
          </div>
          <div class="ll-benefit-visual">
            <div class="ll-benefit-stage">
              <div class="ll-gps-pulse"></div>
              <div class="ll-mobile-mockup">
                <div class="ll-mobile-screen">
                  <div class="ll-mobile-notch"></div>
                  <div class="ll-mobile-time">9:42 ${isAr?'ص':'AM'}</div>
                  <div class="ll-mobile-greeting">${L('صباح الخير','Bonjour')}</div>
                  <div class="ll-mobile-name">${L('أحمد بن علي','Ahmed Benali')}</div>
                  <div class="ll-mobile-grid">
                    <div class="ll-mobile-btn ll-gold">
                      <div class="ll-mobile-btn-icon">✓</div>
                      <div class="ll-mobile-btn-label">${L('حضور','Pointage')}</div>
                    </div>
                    <div class="ll-mobile-btn">
                      <div class="ll-mobile-btn-icon">📦</div>
                      <div class="ll-mobile-btn-label">${L('مواد','Matériaux')}</div>
                    </div>
                    <div class="ll-mobile-btn">
                      <div class="ll-mobile-btn-icon">📷</div>
                      <div class="ll-mobile-btn-label">${L('صور','Photos')}</div>
                    </div>
                    <div class="ll-mobile-btn">
                      <div class="ll-mobile-btn-icon">💰</div>
                      <div class="ll-mobile-btn-label">${L('طلب صرف','Dépense')}</div>
                    </div>
                    <div class="ll-mobile-btn" style="grid-column:1/-1">
                      <div class="ll-mobile-btn-icon">📍</div>
                      <div class="ll-mobile-btn-label">${L('GPS — موقع المعدة','GPS — Position engin')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ═══ PRICING ═══ -->
    <section class="ll-section" id="ll-pricing">
      <div class="ll-section-head ll-reveal">
        <span class="ll-eyebrow">${L('أسعار شفافة','Tarifs transparents')}</span>
        <h2 class="ll-section-title">${L('اختر الخطة','Choisissez le plan')} <span class="ll-gold">${L('المناسبة لك','qui vous convient')}</span></h2>
        <p class="ll-section-desc">${L('جميع الخطط تشمل التجربة المجانية 14 يوماً — بدون بطاقة بنكية. ألغِ متى شئت.','Tous les plans incluent l\'essai 14 jours — sans CB. Annulez à tout moment.')}</p>
      </div>

      <div class="ll-pricing-grid">
        <div class="ll-price-card ll-reveal">
          <div class="ll-price-name">${L('المبتدئ','Starter')}</div>
          <div class="ll-price-tagline">${L('للشركات الناشئة','Pour les start-ups')}</div>
          <div class="ll-price-amount">
            <span class="ll-price-num">9,900</span>
            <span class="ll-price-currency">${L('دج','DA')}</span>
            <span class="ll-price-period">${L('/ شهرياً','/ mois')}</span>
          </div>
          <ul class="ll-price-features">
            <li><span class="ll-price-check">✓</span> ${L('حتى 5 مشاريع نشطة','Jusqu\'à 5 projets actifs')}</li>
            <li><span class="ll-price-check">✓</span> ${L('حتى 20 عامل','Jusqu\'à 20 ouvriers')}</li>
            <li><span class="ll-price-check">✓</span> ${L('فواتير PDF احترافية','Factures PDF pro')}</li>
            <li><span class="ll-price-check">✓</span> ${L('3 مستخدمين','3 utilisateurs')}</li>
            <li><span class="ll-price-check">✓</span> ${L('دعم بالبريد الإلكتروني','Support par email')}</li>
          </ul>
          ${user
            ? `<button class="ll-btn ll-btn-ghost" style="width:100%;justify-content:center" data-nav="${user.is_admin?'admin':'dashboard'}">${L('لوحة التحكم','Tableau de bord')}</button>`
            : `<button class="ll-btn ll-btn-ghost" style="width:100%;justify-content:center" onclick="showRegisterPanel()">${L('ابدأ مجاناً','Commencer')}</button>`
          }
        </div>

        <div class="ll-price-card ll-featured ll-reveal">
          <div class="ll-price-badge">⭐ ${L('الأكثر شيوعاً','Plus populaire')}</div>
          <div class="ll-price-name">${L('الاحترافي','Professionnel')}</div>
          <div class="ll-price-tagline">${L('للشركات النامية','Pour entreprises en croissance')}</div>
          <div class="ll-price-amount">
            <span class="ll-price-num ll-gold">24,900</span>
            <span class="ll-price-currency">${L('دج','DA')}</span>
            <span class="ll-price-period">${L('/ شهرياً','/ mois')}</span>
          </div>
          <ul class="ll-price-features">
            <li><span class="ll-price-check">✓</span> ${L('مشاريع غير محدودة','Projets illimités')}</li>
            <li><span class="ll-price-check">✓</span> ${L('حتى 100 عامل','Jusqu\'à 100 ouvriers')}</li>
            <li><span class="ll-price-check">✓</span> ${L('SmartAI كامل + تقارير شهرية','SmartAI complet + rapports')}</li>
            <li><span class="ll-price-check">✓</span> ${L('توقعات السيولة 90 يوم','Prévisions cash 90 jours')}</li>
            <li><span class="ll-price-check">✓</span> ${L('10 مستخدمين + أدوار مخصصة','10 utilisateurs + rôles')}</li>
            <li><span class="ll-price-check">✓</span> ${L('دعم هاتفي أولوية','Support prioritaire')}</li>
          </ul>
          ${user
            ? `<button class="ll-btn ll-btn-gold" style="width:100%;justify-content:center" data-nav="${user.is_admin?'admin':'dashboard'}">${L('لوحة التحكم','Tableau de bord')}</button>`
            : `<button class="ll-btn ll-btn-gold" style="width:100%;justify-content:center" onclick="showRegisterPanel()">${L('ابدأ التجربة','Commencer l\'essai')}</button>`
          }
        </div>

        <div class="ll-price-card ll-reveal">
          <div class="ll-price-name">${L('المؤسسات','Enterprise')}</div>
          <div class="ll-price-tagline">${L('للشركات الكبرى','Pour les grandes entreprises')}</div>
          <div class="ll-price-amount">
            <span class="ll-price-num">${L('حسب الطلب','Sur devis')}</span>
          </div>
          <ul class="ll-price-features">
            <li><span class="ll-price-check">✓</span> ${L('كل ميزات الاحترافي','Tout le plan Pro')}</li>
            <li><span class="ll-price-check">✓</span> ${L('عمال ومستخدمون غير محدودين','Ouvriers & utilisateurs illimités')}</li>
            <li><span class="ll-price-check">✓</span> ${L('خادم Supabase خاص','Serveur Supabase dédié')}</li>
            <li><span class="ll-price-check">✓</span> ${L('تكامل مع أنظمتك الحالية','Intégration vos systèmes')}</li>
            <li><span class="ll-price-check">✓</span> ${L('SLA + تدريب فريقك','SLA + formation équipe')}</li>
            <li><span class="ll-price-check">✓</span> ${L('مدير حساب مخصص','Account manager dédié')}</li>
          </ul>
          <a class="ll-btn ll-btn-ghost" style="width:100%;justify-content:center" href="mailto:contact@smartstruct.dz">${L('تواصل معنا','Nous contacter')}</a>
        </div>
      </div>
    </section>

    <!-- ═══ CTA ═══ -->
    <div class="ll-cta ll-reveal">
      <div class="ll-cta-content">
        <h2 class="ll-cta-title">${L('جاهز لتحويل طريقة','Prêt à transformer la gestion')} <span class="ll-gold">${L('إدارة شركتك؟','de votre entreprise ?')}</span></h2>
        <p class="ll-cta-desc">${L('14 يوم تجربة مجانية كاملة. لا بطاقة بنكية. لا التزام. فقط جرّب وقرّر.','14 jours d\'essai complet. Sans CB. Sans engagement. Testez et décidez.')}</p>
        <div class="ll-hero-actions" style="justify-content:center">
          ${user
            ? `<button class="ll-btn ll-btn-gold ll-btn-lg" data-nav="${user.is_admin?'admin':'dashboard'}">
                 ${L('الذهاب للوحة التحكم','Tableau de bord')}
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:${isAr?'rotate(180deg)':'none'}"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
               </button>`
            : `<button class="ll-btn ll-btn-gold ll-btn-lg" onclick="showRegisterPanel()">
                 ${L('ابدأ التجربة الآن','Commencer l\'essai')}
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:${isAr?'rotate(180deg)':'none'}"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
               </button>
               <button class="ll-btn ll-btn-ghost ll-btn-lg" onclick="showLoginPanel()">${L('لدي حساب — دخول','J\'ai un compte')}</button>`
          }
        </div>
      </div>
    </div>

    <!-- ═══ FOOTER ═══ -->
    <footer class="ll-footer">
      <div class="ll-footer-grid">
        <div>
          <div class="ll-footer-brand">
            <div class="ll-nav-logo-mark">${ssLogo(22)}</div>
            <div class="ll-nav-logo-text">
              <div class="ll-nav-logo-name">SmartStruct</div>
              <div class="ll-nav-logo-sub">v7.2 PRO</div>
            </div>
          </div>
          <p class="ll-footer-desc">${L('منصة احترافية لإدارة مشاريع المقاولة والبناء في الجزائر — مدعومة بالذكاء الاصطناعي ومتوافقة مع القانون.','Plateforme pro pour la gestion de chantiers en Algérie — propulsée par l\'IA et conforme à la loi.')}</p>
        </div>
        <div class="ll-footer-col">
          <h4>${L('المنتج','Produit')}</h4>
          <ul>
            <li><a href="#ll-features">${L('المزايا','Fonctionnalités')}</a></li>
            <li><a href="#ll-pricing">${L('الأسعار','Tarifs')}</a></li>
            <li><a href="#ll-showcase">${L('عرض الواجهة','Aperçu')}</a></li>
          </ul>
        </div>
        <div class="ll-footer-col">
          <h4>${L('الشركة','Entreprise')}</h4>
          <ul>
            <li><a href="mailto:contact@smartstruct.dz">${L('تواصل معنا','Contact')}</a></li>
            <li><a href="#">${L('من نحن','À propos')}</a></li>
            <li><a href="#">${L('الوظائف','Carrières')}</a></li>
          </ul>
        </div>
        <div class="ll-footer-col">
          <h4>${L('الدعم','Support')}</h4>
          <ul>
            <li><a href="#">${L('مركز المساعدة','Aide')}</a></li>
            <li><a href="#">${L('التوثيق','Documentation')}</a></li>
            <li><a href="#">${L('حالة الخدمة','Statut')}</a></li>
          </ul>
        </div>
      </div>
      <div class="ll-footer-bottom">
        <div>© 2026 SmartStruct — ${L('صُمم للشركات الجزائرية في قطاع البناء','Conçu pour les entreprises BTP algériennes')}</div>
        <div>${L('صُنع بـ ♥ في الجزائر','Fait avec ♥ en Algérie')}</div>
      </div>
    </footer>
  </div>`;
};

/* ─── Init dynamic effects after landing renders ─── */
function initLandingEffects() {
  const root = document.getElementById('landingRoot');
  if (!root) return;

  // Particles
  const pc = document.getElementById('llParticles');
  if (pc && !pc.children.length) {
    const count = window.innerWidth < 768 ? 16 : 36;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'll-particle';
      const size = 1 + Math.random() * 3;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.bottom = (-20 - Math.random() * 30) + '%';
      p.style.animationDuration = (12 + Math.random() * 16) + 's';
      p.style.animationDelay = (Math.random() * 15) + 's';
      p.style.opacity = 0.3 + Math.random() * 0.5;
      pc.appendChild(p);
    }
  }

  // Navbar scroll state
  const nav = document.getElementById('llNav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('ll-scrolled', window.scrollY > 30);
    window._llScrollHandler && window.removeEventListener('scroll', window._llScrollHandler);
    window._llScrollHandler = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Reveal on scroll
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('ll-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    root.querySelectorAll('.ll-reveal').forEach(el => io.observe(el));

    // Animated counters
    const counterIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const target = parseInt(e.target.dataset.target);
          if (isNaN(target)) { counterIO.unobserve(e.target); return; }
          const duration = 1600;
          const start = performance.now();
          const animate = (t) => {
            const p = Math.min((t - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            e.target.textContent = Math.floor(target * eased);
            if (p < 1) requestAnimationFrame(animate);
            else e.target.textContent = target;
          };
          requestAnimationFrame(animate);
          counterIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    root.querySelectorAll('[data-target]').forEach(el => counterIO.observe(el));
  }

  // 3D tilt on feature cards
  root.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const rotX = ((y / r.height) - 0.5) * -8;
      const rotY = ((x / r.width) - 0.5) * 8;
      card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
      card.style.setProperty('--mx', (x / r.width * 100) + '%');
      card.style.setProperty('--my', (y / r.height * 100) + '%');
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  // Showcase 3D follow
  const stage = document.getElementById('llShowcaseStage');
  if (stage) {
    const wrap = stage.parentElement;
    wrap.addEventListener('mousemove', (e) => {
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      stage.style.transform = `rotateX(${15 - y * 10}deg) rotateY(${-8 - x * 10}deg)`;
    });
    wrap.addEventListener('mouseleave', () => { stage.style.transform = ''; });
  }

  // Hero scene parallax
  const sceneStage = document.getElementById('llSceneStage');
  if (sceneStage && window.innerWidth > 768) {
    const sceneWrap = sceneStage.closest('.ll-scene');
    if (sceneWrap) {
      sceneWrap.addEventListener('mousemove', (e) => {
        const r = sceneStage.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        sceneStage.style.animation = 'none';
        sceneStage.style.transform = `rotateX(${8 - y * 8}deg) rotateY(${-x * 10}deg)`;
      });
      sceneWrap.addEventListener('mouseleave', () => {
        sceneStage.style.animation = '';
        sceneStage.style.transform = '';
      });
    }
  }
}
window.initLandingEffects = initLandingEffects;

/* ─── Init effects for auth (login/register) page ─── */
function initAuthEffects() {
  const root = document.getElementById('authRoot');
  if (!root) return;
  const pc = document.getElementById('authParticles');
  if (pc && !pc.children.length) {
    const count = window.innerWidth < 768 ? 12 : 24;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'auth-particle';
      const size = 1 + Math.random() * 2.5;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.bottom = (-15 - Math.random() * 25) + '%';
      p.style.animationDuration = (14 + Math.random() * 14) + 's';
      p.style.animationDelay = (Math.random() * 14) + 's';
      p.style.opacity = 0.3 + Math.random() * 0.4;
      pc.appendChild(p);
    }
  }
}
window.initAuthEffects = initAuthEffects;


/* ─── LOGIN PAGE ─── */

Pages.login = function(mode) {
  const initMode = mode || sessionStorage.getItem('auth_mode') || 'login';
  const isAr = I18N.currentLang === 'ar';

  return `<div class="auth-page" id="authRoot">
    <!-- Atmospheric background layers -->
    <div class="auth-atmosphere"></div>
    <div class="auth-particles" id="authParticles"></div>

    <!-- Top controls -->
    <button class="auth-back-btn" data-nav="landing" title="${L('العودة','Retour')}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:${isAr?'none':'rotate(180deg)'}">
        <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
      </svg>
      <span>${L('العودة للموقع','Retour au site')}</span>
    </button>

    <button class="auth-lang-btn" onclick="I18N.setLang(I18N.currentLang==='ar'?'fr':'ar')">
      ${isAr ? '🇫🇷 FR' : '🇩🇿 AR'}
    </button>

    <!-- Main grid: Left brand panel + Right form -->
    <div class="auth-shell">

      <!-- ═══ LEFT BRAND PANEL — 3D Scene ═══ -->
      <div class="auth-brand">
        <div class="auth-brand-glow"></div>
        <div class="auth-brand-grid"></div>

        <div class="auth-brand-content">
          <a class="auth-brand-logo" data-nav="landing">
            <div class="auth-brand-logo-mark">${ssLogo(26)}</div>
            <div class="auth-brand-logo-text">
              <div class="auth-brand-logo-name">SmartStruct</div>
              <div class="auth-brand-logo-sub">v7.2 PRO</div>
            </div>
          </a>

          <div class="auth-trial-pill">
            <span class="auth-trial-dot"></span>
            ${L('تجربة مجانية 14 يوم — بدون بطاقة بنكية','Essai gratuit 14j — sans CB')}
          </div>

          <h1 class="auth-brand-title">
            ${L('أدِر شركتك','Gérez votre BTP')}<br>
            <span class="auth-brand-title-gold">${L('بذكاءٍ احترافي','en intelligence pro')}</span>
          </h1>

          <p class="auth-brand-desc">${L(
            'منصة متكاملة لإدارة مشاريع المقاولة والعمال والفوترة والمالية، مدعومة بالذكاء الاصطناعي ومتوافقة مع القانون الجزائري.',
            'Plateforme complète pour la gestion de chantiers, ouvriers, factures et finances — propulsée par l\'IA et conforme à la loi algérienne.'
          )}</p>

          <!-- Mini 3D card preview -->
          <div class="auth-mini-scene">
            <div class="auth-mini-card auth-mc-1">
              <div class="auth-mc-icon" style="background:linear-gradient(135deg,#34C38F,#1F8B65);color:#fff">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="auth-mc-text">
                <div class="auth-mc-label">${L('المشاريع','Projets')}</div>
                <div class="auth-mc-val">+18.4%</div>
              </div>
            </div>
            <div class="auth-mini-card auth-mc-2">
              <div class="auth-mc-icon" style="background:linear-gradient(135deg,#E8B84B,#C49030);color:#09120A">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div class="auth-mc-text">
                <div class="auth-mc-label">${L('الإيرادات','Revenus')}</div>
                <div class="auth-mc-val">4.2M</div>
              </div>
            </div>
            <div class="auth-mini-card auth-mc-3">
              <div class="auth-mc-icon" style="background:linear-gradient(135deg,#9B6DFF,#6D45D9);color:#fff">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>
              </div>
              <div class="auth-mc-text">
                <div class="auth-mc-label">SmartAI</div>
                <div class="auth-mc-val">${L('نشط','Actif')}</div>
              </div>
            </div>
          </div>

          <ul class="auth-brand-features">
            <li><span class="auth-feat-check">✓</span> ${L('27 جدول قاعدة بيانات + RLS','27 tables BDD + RLS')}</li>
            <li><span class="auth-feat-check">✓</span> ${L('فواتير PDF + توقيع إلكتروني','Factures PDF + signature')}</li>
            <li><span class="auth-feat-check">✓</span> ${L('SmartAI + توقعات السيولة','SmartAI + prévisions cash')}</li>
            <li><span class="auth-feat-check">✓</span> ${L('GPS للمعدات + وضع ميدان','GPS engins + mode chantier')}</li>
          </ul>
        </div>
      </div>

      <!-- ═══ RIGHT FORM PANEL ═══ -->
      <div class="auth-form-panel">
        <div class="auth-form-card" id="authFormCard">
          <div class="auth-form-inner" id="authRightPanel">
            ${initMode === 'register' ? renderRegisterForm(L) : renderLoginForm(L)}
          </div>
        </div>
      </div>

    </div>
  </div>`;
};

function renderLoginForm(L) {
  if (!L) L = (ar, fr) => I18N.currentLang === 'ar' ? ar : fr;
  return `
    <!-- Mode tabs -->
    <div class="auth-tabs">
      <button class="auth-tab active" onclick="switchAuthMode('login')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        ${L('تسجيل الدخول','Connexion')}
      </button>
      <button class="auth-tab" onclick="switchAuthMode('register')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        ${L('إنشاء حساب','Inscription')}
      </button>
    </div>

    <div class="auth-heading">
      <h2 class="auth-h-title">${L('مرحباً بعودتك 👋','Bon retour 👋')}</h2>
      <p class="auth-h-sub">${L('سجّل دخولك للوصول إلى لوحة التحكم','Connectez-vous pour accéder à votre tableau de bord')}</p>
    </div>

    <div id="loginError" style="display:none" class="auth-alert auth-alert-error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div>
        <strong>${L('بيانات الدخول غير صحيحة','Identifiants incorrects')}</strong>
        <div style="font-size:.74rem;margin-top:3px;opacity:.85">
          ${L('💡 جرّب الحساب التجريبي بالأسفل','💡 Essayez le compte démo ci-dessous')}
        </div>
      </div>
    </div>

    <div class="auth-field">
      <label class="auth-label">${L('البريد الإلكتروني','Adresse email')}</label>
      <div class="auth-input-wrap">
        <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        <input class="auth-input" id="loginEmail" type="email" placeholder="example@company.dz" dir="ltr" autocomplete="email">
      </div>
    </div>

    <div class="auth-field">
      <label class="auth-label">${L('كلمة المرور','Mot de passe')}</label>
      <div class="auth-input-wrap">
        <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <input class="auth-input" id="loginPass" type="password" placeholder="••••••••" dir="ltr" autocomplete="current-password" onkeydown="if(event.key==='Enter')doLogin()">
        <button type="button" class="auth-input-eye" onclick="togglePass()" title="${L('إظهار/إخفاء','Afficher/Masquer')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
    </div>

    <div class="auth-row-between">
      <label class="auth-checkbox-wrap">
        <input type="checkbox" id="loginRemember" class="auth-checkbox">
        <span class="auth-checkbox-mark"></span>
        <span class="auth-checkbox-label">${L('تذكّرني','Se souvenir')}</span>
      </label>
      <button type="button" class="auth-link" onclick="showForgotModal()">
        ${L('نسيت كلمة المرور؟','Mot de passe oublié ?')}
      </button>
    </div>

    <button class="auth-submit auth-submit-gold" onclick="doLogin()">
      <span>${L('تسجيل الدخول','Se connecter')}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:${I18N.currentLang==='ar'?'rotate(180deg)':'none'}">
        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
      </svg>
    </button>

    <div class="auth-divider"><span>${L('أو','ou')}</span></div>

    <button class="auth-demo-btn" onclick="document.getElementById('loginEmail').value='demo@algerie-construction.dz';document.getElementById('loginPass').value='Demo@1234';">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      ${L('ملء بيانات الحساب التجريبي','Remplir compte démo')}
    </button>

    <div class="auth-bottom-text">
      ${L('ليس لديك حساب؟','Pas encore de compte ?')}
      <button type="button" class="auth-link auth-link-strong" onclick="switchAuthMode('register')">
        ${L('ابدأ تجربتك المجانية 14 يوم ←','Démarrer l\'essai gratuit →')}
      </button>
    </div>
  `;
}

function renderRegisterForm(L) {
  if (!L) L = (ar, fr) => I18N.currentLang === 'ar' ? ar : fr;
  return `
    <!-- Mode tabs -->
    <div class="auth-tabs">
      <button class="auth-tab" onclick="switchAuthMode('login')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        ${L('تسجيل الدخول','Connexion')}
      </button>
      <button class="auth-tab active" onclick="switchAuthMode('register')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        ${L('إنشاء حساب','Inscription')}
      </button>
    </div>

    <div class="auth-heading">
      <h2 class="auth-h-title">${L('ابدأ مجاناً 🚀','Commencez gratuitement 🚀')}</h2>
      <p class="auth-h-sub">${L('14 يوماً تجربة كاملة. بدون بطاقة بنكية. ألغِ متى شئت.','14 jours d\'essai complet. Sans CB. Annulez quand vous voulez.')}</p>
    </div>

    <div class="auth-trial-banner">
      <div class="auth-trial-banner-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      </div>
      <div class="auth-trial-banner-text">
        <strong>${L('14 يوم مجاناً','14 jours gratuits')}</strong>
        <span>${L('وصول كامل لكل الميزات الاحترافية','Accès complet à toutes les fonctionnalités')}</span>
      </div>
    </div>

    <div id="registerError" style="display:none" class="auth-alert auth-alert-error"></div>
    <div id="registerSuccess" style="display:none" class="auth-alert auth-alert-success"></div>

    <div class="auth-grid-2">
      <div class="auth-field">
        <label class="auth-label">${L('الاسم الكامل','Nom complet')} <span class="auth-required">*</span></label>
        <div class="auth-input-wrap">
          <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <input class="auth-input" id="regName" type="text" placeholder="${L('محمد بن علي','Mohamed Ben Ali')}" autocomplete="name">
        </div>
      </div>
      <div class="auth-field">
        <label class="auth-label">${L('اسم المؤسسة','Entreprise')} <span class="auth-required">*</span></label>
        <div class="auth-input-wrap">
          <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h2M9 13h2M9 17h2M13 9h2M13 13h2"/></svg>
          <input class="auth-input" id="regCompany" type="text" placeholder="${L('مؤسسة المقاولة','Entreprise BTP')}" autocomplete="organization">
        </div>
      </div>
    </div>

    <div class="auth-field">
      <label class="auth-label">${L('البريد الإلكتروني','Email')} <span class="auth-required">*</span></label>
      <div class="auth-input-wrap">
        <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        <input class="auth-input" id="regEmail" type="email" placeholder="exemple@entreprise.dz" dir="ltr" autocomplete="email">
      </div>
    </div>

    <div class="auth-grid-2">
      <div class="auth-field">
        <label class="auth-label">${L('كلمة المرور','Mot de passe')} <span class="auth-required">*</span></label>
        <div class="auth-input-wrap">
          <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input class="auth-input" id="regPass" type="password" placeholder="••••••••" dir="ltr" autocomplete="new-password" oninput="checkPassStrength(this.value)">
          <button type="button" class="auth-input-eye" onclick="togglePassReg()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="auth-pass-strength" id="passStrengthBars">
          <div class="auth-pass-bar" id="psb1"></div>
          <div class="auth-pass-bar" id="psb2"></div>
          <div class="auth-pass-bar" id="psb3"></div>
          <div class="auth-pass-bar" id="psb4"></div>
        </div>
        <div class="auth-pass-label" id="passStrengthLabel"></div>
      </div>
      <div class="auth-field">
        <label class="auth-label">${L('الولاية','Wilaya')}</label>
        <div class="auth-input-wrap">
          <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <select class="auth-input auth-select" id="regWilaya">
            <option value="">${L('اختر الولاية','Choisir wilaya')}</option>
            ${WILAYAS.map(w=>`<option value="${w}">${w}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <label class="auth-terms-wrap">
      <input type="checkbox" id="regTerms" class="auth-checkbox">
      <span class="auth-checkbox-mark"></span>
      <span class="auth-terms-text">
        ${L('أوافق على','J\'accepte les')}
        <a href="#" class="auth-link auth-link-strong" onclick="event.preventDefault()">${L('شروط الاستخدام','conditions')}</a>
        ${L('و','et la')}
        <a href="#" class="auth-link auth-link-strong" onclick="event.preventDefault()">${L('سياسة الخصوصية','politique de confidentialité')}</a>
      </span>
    </label>

    <button class="auth-submit auth-submit-gold btn-trial" onclick="doRegister()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      <span>${L('إنشاء الحساب والبدء مجاناً','Créer le compte et démarrer')}</span>
    </button>

    <div class="auth-bottom-text">
      ${L('لديك حساب بالفعل؟','Vous avez déjà un compte ?')}
      <button type="button" class="auth-link auth-link-strong" onclick="switchAuthMode('login')">
        ${L('تسجيل الدخول','Se connecter')}
      </button>
    </div>
  `;
}

function switchAuthMode(mode) {
  sessionStorage.setItem('auth_mode', mode);
  const panel = document.getElementById('authRightPanel');
  if (panel) {
  
    panel.style.opacity = '0';
    panel.style.transform = 'translateX(10px)';
    panel.style.transition = 'all .2s';
    setTimeout(() => {
      panel.innerHTML = mode === 'register' ? renderRegisterForm(L) : renderLoginForm(L);
      panel.style.opacity = '1';
      panel.style.transform = '';
    }, 200);
  }
}

function showRegisterPanel() {
  sessionStorage.setItem('auth_mode', 'register');
  App.navigate('login', {mode:'register'});
}
function showLoginPanel() {
  sessionStorage.setItem('auth_mode', 'login');
  App.navigate('login', {mode:'login'});
}

function checkPassStrength(val) {

  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const bars = [document.getElementById('psb1'), document.getElementById('psb2'), document.getElementById('psb3'), document.getElementById('psb4')];
  const lblEl = document.getElementById('passStrengthLabel');
  const cls = score <= 1 ? 'weak' : score <= 2 ? 'medium' : 'strong';
  const lbl = score <= 1 ? L('ضعيفة','Faible') : score <= 2 ? L('متوسطة','Moyen') : L('قوية','Fort');
  bars.forEach((b, i) => { if (b) b.className = 'pass-strength-bar ' + (i < score ? cls : ''); });
  if (lblEl) lblEl.textContent = val.length ? lbl : '';
}

function togglePassReg() {
  const i = document.getElementById('regPass');
  if (i) i.type = i.type === 'password' ? 'text' : 'password';
}

async function doRegister() {

  const name    = (document.getElementById('regName')  ||{}).value||'';
  const company = (document.getElementById('regCompany')||{}).value||'';
  const email   = ((document.getElementById('regEmail') ||{}).value||'').trim().toLowerCase();
  const pass    = (document.getElementById('regPass')   ||{}).value||'';
  const wilaya  = (document.getElementById('regWilaya') ||{}).value||'';
  const terms   = (document.getElementById('regTerms')  ||{}).checked||false;
  const errEl   = document.getElementById('registerError');
  const btnReg  = document.querySelector('.btn-trial');

  const showErr = (msg) => {
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    if (btnReg) { btnReg.disabled = false; btnReg.innerHTML = '🚀 إنشاء حساب مجاني'; }
  };

  // ── تحقق من الحقول ──
  if (!name.trim())    return showErr(L('❌ الاسم الكامل مطلوب','❌ Le nom complet est requis'));
  if (!company.trim()) return showErr(L('❌ اسم المؤسسة مطلوب',"❌ Le nom de l'entreprise est requis"));
  if (!email || !email.includes('@')) return showErr(L('❌ البريد الإلكتروني غير صالح','❌ Email invalide'));
  if (pass.length < 6) return showErr(L('❌ كلمة المرور 6 أحرف على الأقل','❌ 6 caractères minimum'));
  if (!terms) return showErr(L('❌ يجب الموافقة على الشروط','❌ Vous devez accepter les conditions'));

  // ── عرض حالة التحميل ──
  if (btnReg) { btnReg.disabled = true; btnReg.innerHTML = '⏳ جاري التسجيل...'; }
  if (errEl) errEl.style.display = 'none';

  try {
    // ── جلب بيانات Supabase ──
    let sbUrl = '', sbKey = '';
    if (typeof SUPABASE_HARDCODED !== 'undefined' && SUPABASE_HARDCODED.url) {
      sbUrl = SUPABASE_HARDCODED.url;
      sbKey = SUPABASE_HARDCODED.anonKey;
    } else {
      const saved = JSON.parse(localStorage.getItem('sbtp_supabase_config') || '{}');
      sbUrl = saved.url || ''; sbKey = saved.anonKey || '';
    }
    if (!sbUrl || !sbKey) throw new Error('Supabase غير مربوط — تواصل مع المسؤول');

    const sbH = {
      'Content-Type': 'application/json',
      'apikey': sbKey,
      'Authorization': `Bearer ${sbKey}`,
      'Prefer': 'return=representation'
    };

    // 1. تحقق من تكرار البريد مباشرة في Supabase
    const chkR = await fetch(`${sbUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id`, { headers: sbH });
    if (chkR.ok && (await chkR.json()).length) {
      return showErr(L('❌ هذا البريد مستخدم بالفعل','❌ Email déjà utilisé'));
    }

    const now = new Date();
    const registrationDate = now.toISOString().split('T')[0];
    const trialEndDate = (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]; })();

    // 2. INSERT tenant في Supabase
    const tRes = await fetch(`${sbUrl}/rest/v1/tenants`, {
      method: 'POST', headers: sbH,
      body: JSON.stringify({
        name: company.trim(), plan_id: 2, wilaya: wilaya,
        subscription_status: 'trial',
        trial_start: registrationDate,
        trial_end: trialEndDate,
        is_active: false
      })
    });
    if (!tRes.ok) throw new Error('فشل حفظ بيانات المؤسسة: ' + await tRes.text());
    const [sbTenant] = await tRes.json();

    // 3. INSERT user في Supabase (مع تشفير كلمة المرور)
    let hashedPass = pass;
    try {
      if (typeof SmartCrypto !== 'undefined') {
        hashedPass = await SmartCrypto.hash(pass);
      }
    } catch(e) { console.warn('Password hashing failed:', e); }

    const uRes = await fetch(`${sbUrl}/rest/v1/users`, {
      method: 'POST', headers: sbH,
      body: JSON.stringify({
        tenant_id: sbTenant.id,
        full_name: name.trim(),
        email: email,
        password: hashedPass,
        role: 'admin',
        is_admin: false,
        is_active: false,
        account_status: 'pending'
      })
    });
    if (!uRes.ok) throw new Error('فشل حفظ بيانات المستخدم: ' + await uRes.text());
    const [sbUser] = await uRes.json();

    // 4. إشعار Supabase بطلب التسجيل (يظهر للأدمن) — احفظ ID المُرجَع
    let sbNotif = null;
    try {
      const nRes = await fetch(`${sbUrl}/rest/v1/notifications`, {
        method: 'POST', headers: sbH,
        body: JSON.stringify({
          id: Date.now(),  // notifications.id هو BIGINT (نولّده بأنفسنا)
          type: 'new_account',
          title: '🆕 طلب تسجيل جديد بانتظار الموافقة',
          body: `مؤسسة "${company.trim()}" — ${name.trim()} (${email}) — ${wilaya}`,
          user_id: sbUser.id, tenant_id: sbTenant.id,
          date: now.toISOString(), read: false, status: 'pending'
        })
      });
      if (nRes.ok) {
        const arr = await nRes.json();
        sbNotif = Array.isArray(arr) ? arr[0] : arr;
      }
    } catch(e) { console.warn('Notification creation failed:', e); }

    // 5. حفظ في localStorage بـ setSilent (تجنب مزامنة مكررة لأن السجلات موجودة في Supabase)
    const localTenants = DB.get('tenants') || [];
    const localUsers   = DB.get('users')   || [];
    const localNotifs  = DB.get('notifications') || [];

    // تجنب الإضافة المكررة محلياً (في حال أُعيد التسجيل بنفس البريد)
    if (!localTenants.find(t => t.id === sbTenant.id)) {
      localTenants.push({
        id: sbTenant.id, name: company.trim(), plan_id: 2, wilaya: wilaya,
        subscription_status: 'trial', trial_start: registrationDate,
        trial_end: trialEndDate, is_active: false
      });
    }
    if (!localUsers.find(u => u.id === sbUser.id)) {
      localUsers.push({
        id: sbUser.id, tenant_id: sbTenant.id, full_name: name.trim(),
        email: email, password: hashedPass, role: 'admin', is_admin: false,
        is_active: false, account_status: 'pending'
      });
    }
    if (sbNotif && !localNotifs.find(n => n.id === sbNotif.id)) {
      localNotifs.unshift({
        id: sbNotif.id, type: 'new_account',
        title: '🆕 طلب تسجيل جديد — بانتظار الموافقة',
        body: `مؤسسة "${company.trim()}" — ${name.trim()} (${email})`,
        user_id: sbUser.id, tenant_id: sbTenant.id,
        date: now.toISOString(), read: false, status: 'pending'
      });
    }

    // ✅ setSilent بدلاً من set — لا تُشغّل مزامنة (السجلات موجودة بالفعل في Supabase)
    if (typeof DB.setSilent === 'function') {
      DB.setSilent('tenants',       localTenants);
      DB.setSilent('users',         localUsers);
      DB.setSilent('notifications', localNotifs);
    } else {
      // fallback
      DB.set('tenants', localTenants);
      DB.set('users', localUsers);
      DB.set('notifications', localNotifs);
    }

    // 6. إرسال إيميل إشعار للأدمن
    EMAILJS.notifyNewAccount({ name: name.trim(), email, company: company.trim(), wilaya }).catch(() => {});

    // 7. عرض شاشة الترحيب وانتظار الموافقة (بدون تسجيل دخول)
    if (btnReg) { btnReg.disabled = false; btnReg.innerHTML = '🚀 إنشاء حساب مجاني'; }
    showPendingActivationScreen(name.trim(), email, company.trim());

  } catch(e) {
    console.error('❌ خطأ في التسجيل:', e.message);
    showErr('❌ ' + e.message);
  }
}

// ─── شاشة ترحيب وانتظار تفعيل الحساب ───
function showPendingActivationScreen(userName, userEmail, companyName) {
  const old = document.getElementById('pendingActivationOverlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pendingActivationOverlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(4,8,15,0.98);
    display:flex;align-items:center;justify-content:center;
    font-family:'Tajawal',sans-serif;
    animation:fadeIn .5s ease;
    padding:1rem;
  `;

  overlay.innerHTML = `
    <div style="
      max-width:520px;width:100%;
      background:linear-gradient(165deg,rgba(15,22,38,0.98) 0%,rgba(10,15,28,0.98) 100%);
      border:1px solid rgba(232,184,75,0.25);
      border-radius:28px;
      padding:2.8rem 2.2rem 2.2rem;
      text-align:center;
      box-shadow:0 50px 120px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.04) inset;
      position:relative;overflow:hidden;
    ">
      <!-- خلفية ديكور -->
      <div style="position:absolute;top:-60px;right:-60px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(232,184,75,.07),transparent 70%);pointer-events:none"></div>
      <div style="position:absolute;bottom:-40px;left:-40px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,rgba(74,144,226,.06),transparent 70%);pointer-events:none"></div>

      <!-- أيقونة نجاح -->
      <div style="
        width:90px;height:90px;border-radius:50%;
        background:linear-gradient(135deg,rgba(52,195,143,.15),rgba(52,195,143,.05));
        border:2.5px solid rgba(52,195,143,.4);
        display:flex;align-items:center;justify-content:center;
        font-size:2.8rem;margin:0 auto 1.6rem;
        box-shadow:0 0 40px rgba(52,195,143,.15);
        animation:pulse 2.5s ease-in-out infinite;
      ">🎉</div>

      <!-- عنوان الترحيب -->
      <div style="font-size:1.6rem;font-weight:900;color:#EDF2F7;margin-bottom:.4rem;line-height:1.3">
        أهلاً وسهلاً، ${escHtml(userName)}! 🌟
      </div>
      <div style="font-size:.95rem;color:#8892A4;margin-bottom:.5rem">
        مؤسسة: <strong style="color:#E8B84B">${escHtml(companyName||'')}</strong>
      </div>
      <div style="font-size:.88rem;color:#6B7694;margin-bottom:2rem;line-height:1.6">
        تم استلام طلب تسجيلك بنجاح ✅
      </div>

      <!-- كارت الحالة -->
      <div style="
        background:linear-gradient(135deg,rgba(232,184,75,.08),rgba(232,184,75,.04));
        border:1px solid rgba(232,184,75,.25);
        border-radius:18px;padding:1.5rem 1.3rem;
        margin-bottom:1.3rem;text-align:right;
      ">
        <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:1rem;justify-content:flex-end">
          <span style="font-size:.9rem;font-weight:800;color:#E8B84B">⏳ حسابك قيد المراجعة</span>
          <span style="
            background:rgba(232,184,75,.15);color:#E8B84B;
            border:1px solid rgba(232,184,75,.3);
            border-radius:20px;padding:.15rem .7rem;
            font-size:.72rem;font-weight:700;
          ">بانتظار الموافقة</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:.7rem">
          <div style="display:flex;align-items:center;gap:.8rem;font-size:.83rem;color:#A0AABB">
            <span style="width:28px;height:28px;border-radius:50%;background:rgba(52,195,143,.12);border:1px solid rgba(52,195,143,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.9rem">✅</span>
            <span>تم حفظ بيانات مؤسستك في النظام بنجاح</span>
          </div>
          <div style="display:flex;align-items:center;gap:.8rem;font-size:.83rem;color:#A0AABB">
            <span style="width:28px;height:28px;border-radius:50%;background:rgba(74,144,226,.12);border:1px solid rgba(74,144,226,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.9rem">👑</span>
            <span>سيقوم المسؤول بمراجعة طلبك في أقرب وقت</span>
          </div>
          <div style="display:flex;align-items:center;gap:.8rem;font-size:.83rem;color:#A0AABB">
            <span style="width:28px;height:28px;border-radius:50%;background:rgba(232,184,75,.12);border:1px solid rgba(232,184,75,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.9rem">📧</span>
            <span>ستصلك رسالة بريد إلكتروني فور تفعيل حسابك</span>
          </div>
          <div style="display:flex;align-items:center;gap:.8rem;font-size:.83rem;color:#A0AABB">
            <span style="width:28px;height:28px;border-radius:50%;background:rgba(240,78,106,.12);border:1px solid rgba(240,78,106,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.9rem">🚀</span>
            <span>بعد التفعيل يمكنك الدخول والاستمتاع بـ 14 يوم مجاناً</span>
          </div>
        </div>
      </div>

      <!-- بريد المستخدم -->
      <div style="
        background:rgba(74,144,226,.06);
        border:1px solid rgba(74,144,226,.2);
        border-radius:12px;padding:.85rem 1.1rem;
        margin-bottom:1.5rem;
        display:flex;align-items:center;gap:.6rem;justify-content:center;
        flex-wrap:wrap;
      ">
        <span style="font-size:1.1rem">📬</span>
        <span style="font-size:.82rem;color:#8892A4">سيُرسَل إيميل التفعيل إلى:</span>
        <strong style="font-size:.85rem;color:#4A90E2;direction:ltr;font-family:monospace">${escHtml(userEmail)}</strong>
      </div>

      <!-- زر العودة -->
      <button
        onclick="document.getElementById('pendingActivationOverlay').remove(); App.navigate('login');"
        style="
          width:100%;padding:.9rem;
          background:linear-gradient(135deg,#E8B84B 0%,#C49030 100%);
          color:#09120A;border:none;border-radius:14px;
          font-family:'Tajawal',sans-serif;font-size:1rem;font-weight:900;
          cursor:pointer;letter-spacing:.02em;
          box-shadow:0 4px 20px rgba(232,184,75,.3);
          transition:transform .15s,box-shadow .15s;
        "
        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 30px rgba(232,184,75,.45)'"
        onmouseout="this.style.transform='';this.style.boxShadow='0 4px 20px rgba(232,184,75,.3)'"
      >
        ← العودة لصفحة تسجيل الدخول
      </button>

      <div style="margin-top:1rem;font-size:.75rem;color:#4A5568">
        للاستفسار تواصل مع فريق الدعم
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

// ─── ربوت الترحيب للحسابات الجديدة ───
function showWelcomeRobot(userName, daysLeft) {
  // لا تظهر لو مش أول مرة
  if (sessionStorage.getItem('sbtp_welcomed')) return;
  sessionStorage.setItem('sbtp_welcomed', '1');

  const firstName = userName.split(' ')[0];
  const overlay = document.createElement('div');
  overlay.id = 'welcomeRobotOverlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);
    display:flex;align-items:center;justify-content:center;
    animation:fadeIn .4s ease;
  `;
  overlay.innerHTML = `
    <div style="
      background:var(--surface,#1a1f2e);border-radius:24px;
      padding:2.5rem 2rem;max-width:480px;width:90%;
      border:1px solid rgba(255,255,255,0.08);
      box-shadow:0 30px 80px rgba(0,0,0,0.5);
      text-align:center;position:relative;
      animation:slideUp .5s cubic-bezier(0.34,1.56,0.64,1);
    ">
      <!-- Robot -->
      <div style="font-size:5rem;margin-bottom:1rem;animation:robotBounce 1s ease infinite alternate">🤖</div>
      
      <!-- Welcome text -->
      <div style="font-size:1.6rem;font-weight:900;color:var(--text,#fff);margin-bottom:.5rem">
        ${I18N.currentLang==='ar' ? `مرحباً ${firstName}! 👋` : `Bienvenue ${firstName}! 👋`}
      </div>
      <div style="font-size:.9rem;color:var(--dim,#8899aa);margin-bottom:1.5rem;line-height:1.6">
        ${I18N.currentLang==='ar'
          ? `أنا <strong style="color:#B89AFF">SmartAI</strong> مساعدك الذكي 🧠<br>تجربتك المجانية بدأت — لديك <strong style="color:#34C38F;font-size:1.1rem">${daysLeft} يوم</strong> لاستكشاف كل الميزات!`
          : `Je suis <strong style="color:#B89AFF">SmartAI</strong>, votre assistant intelligent 🧠<br>Votre essai gratuit a commencé — <strong style="color:#34C38F;font-size:1.1rem">${daysLeft} jours</strong> pour explorer toutes les fonctionnalités!`
        }
      </div>
      
      <!-- Features quick list -->
      <div style="
        background:rgba(255,255,255,0.03);border-radius:14px;
        padding:1rem;margin-bottom:1.5rem;text-align:right;
      ">
        ${[
          ['📊', I18N.currentLang==='ar'?'لوحة تحكم ذكية بمؤشرات صحة المؤسسة':'Tableau de bord intelligent'],
          ['💰', I18N.currentLang==='ar'?'إدارة مالية كاملة ومتكاملة':'Gestion financière complète'],
          ['👷', I18N.currentLang==='ar'?'متابعة العمال والحضور والرواتب':'Suivi des employés et salaires'],
          ['🤖', I18N.currentLang==='ar'?'مساعد ذكاء اصطناعي خاص بك':'Assistant IA personnel'],
        ].map(([icon, text]) => `
          <div style="display:flex;align-items:center;gap:.6rem;padding:.35rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <span style="font-size:1.1rem">${icon}</span>
            <span style="font-size:.78rem;color:var(--muted,#aab)">${text}</span>
            <span style="margin-right:auto;color:#34C38F;font-size:.7rem">✓</span>
          </div>
        `).join('')}
      </div>
      
      <!-- CTA Button -->
      <button onclick="document.getElementById('welcomeRobotOverlay').remove()" style="
        background:linear-gradient(135deg,#34C38F,#20996F);
        color:#fff;border:none;border-radius:12px;
        padding:.85rem 2rem;font-size:1rem;font-weight:800;
        cursor:pointer;width:100%;font-family:inherit;
        box-shadow:0 4px 20px rgba(52,195,143,0.3);
        transition:transform .2s;
      " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
        ${I18N.currentLang==='ar' ? '🚀 ابدأ الآن!' : '🚀 Commencer maintenant!'}
      </button>
      
      <!-- Days counter bottom -->
      <div style="margin-top:.8rem;font-size:.72rem;color:var(--dim,#667)">
        ${I18N.currentLang==='ar' ? `⏱️ التجربة المجانية تنتهي بعد ${daysLeft} يوم` : `⏱️ Essai gratuit se termine dans ${daysLeft} jours`}
      </div>
    </div>
  `;

  // CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes robotBounce { from { transform:translateY(0) rotate(-5deg); } to { transform:translateY(-8px) rotate(5deg); } }
    @keyframes slideUp { from { transform:translateY(40px);opacity:0; } to { transform:translateY(0);opacity:1; } }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}


// ══════════════════════════════════════════
//  نظام التحقق من الخطة المجانية
// ══════════════════════════════════════════
const TrialManager = {
  // ═══════════════════════════════════════
  //  Server Time Sync (حتى لا يعتمد على وقت الجهاز)
  // ═══════════════════════════════════════
  _serverBase: null,      // Date من السيرفر
  _clientBaseMs: null,    // Date.now() لحظة جلب وقت السيرفر
  _syncInFlight: false,

  // محاولة جلب وقت السيرفر من Supabase (يتطلب View: public.server_time)
  async syncServerNow() {
    if (this._syncInFlight) return;
    this._syncInFlight = true;
    try {
      if (typeof SupabaseClient === 'undefined' || !SupabaseClient._url) return;
      const rows = await SupabaseClient.select('server_time', {}, { limit: 1 });
      if (rows && rows[0] && rows[0].now) {
        this._serverBase = new Date(rows[0].now);
        this._clientBaseMs = Date.now();
      }
    } catch (e) {
      // fallback silently (يستخدم وقت الجهاز)
      // console.warn('Server time sync failed:', e);
    } finally {
      this._syncInFlight = false;
    }
  },

  // وقت "حقيقي" تقديري: serverBase + (الفرق من وقت الجهاز)
  getNow() {
    if (this._serverBase && this._clientBaseMs) {
      const drift = Date.now() - this._clientBaseMs;
      return new Date(this._serverBase.getTime() + drift);
    }
    return new Date();
  },

  // احسب الأيام المتبقية بدقة (باستخدام وقت السيرفر إن توفر)
  getDaysLeft(tenant) {
    if (!tenant) return null;
    const status = tenant.subscription_status || tenant.plan || '';
    const trialEnd = tenant.trial_ends_at || tenant.trial_end || tenant.trial_end_at || null;
    if (!trialEnd) return null;
    if (String(status) !== 'trial') return null;

    const now = this.getNow();
    const today = new Date(now); today.setHours(0,0,0,0);
    const end   = new Date(trialEnd); end.setHours(0,0,0,0);

    return Math.max(-1, Math.ceil((end - today) / 86400000));
  },

  // هل الحساب منتهي؟ (تجريبي أو مدفوع منتهي)
  isExpired(tenant) {
    if (!tenant) return false;

    // للحسابات التجريبية
    const days = this.getDaysLeft(tenant);
    if (days !== null && days < 0) return true;

    // للخطط المدفوعة المنتهية
    const status = tenant.subscription_status || '';
    const subEnd = tenant.subscription_end || tenant.subscription_ends_at || null;
    if (String(status) === 'active' && subEnd) {
      const now = this.getNow();
      const today = new Date(now); today.setHours(0,0,0,0);
      const end = new Date(subEnd); end.setHours(0,0,0,0);
      return end < today;
    }
    return false;
  },

  // احسب أيام انتهاء الخطة المدفوعة
  getPaidDaysLeft(tenant) {
    if (!tenant) return null;
    const status = tenant.subscription_status || '';
    const subEnd = tenant.subscription_end || tenant.subscription_ends_at || null;
    if (!subEnd || String(status) !== 'active') return null;

    const now = this.getNow();
    const today = new Date(now); today.setHours(0,0,0,0);
    const end = new Date(subEnd); end.setHours(0,0,0,0);
    return Math.ceil((end - today) / 86400000);
  },

  // هل الحساب نشط؟
  isActive(tenant) {
    if (!tenant) return false;
    if (tenant.is_active === false) return false;
    return !this.isExpired(tenant);
  },

  // ════════════════════════════════════════════════
  //  عند انتهاء التجربة: قفل الحساب في Supabase
  //  (يمنع تسجيل الدخول من أي جهاز آخر)
  // ════════════════════════════════════════════════
  async lockAccountInSupabase(tenantId) {
    if (!tenantId) return;
    const cfg = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : null;
    if (!cfg?.url || !cfg?.key) return;

    try {
      const sbH = {
        'Content-Type':'application/json',
        'apikey': cfg.key,
        'Authorization': `Bearer ${cfg.key}`,
        'Prefer':'return=minimal'
      };
      // تحديث المؤسسة → معطّلة + الاشتراك منتهي
      await fetch(`${cfg.url}/rest/v1/tenants?id=eq.${tenantId}`, {
        method: 'PATCH', headers: sbH,
        body: JSON.stringify({
          is_active: false,
          subscription_status: 'expired'
        })
      });
      // تعطيل جميع المستخدمين التابعين لها
      await fetch(`${cfg.url}/rest/v1/users?tenant_id=eq.${tenantId}`, {
        method: 'PATCH', headers: sbH,
        body: JSON.stringify({
          is_active: false,
          account_status: 'expired'
        })
      });
      console.log(`🔒 تم قفل المؤسسة #${tenantId} في Supabase (انتهاء التجربة)`);
    } catch(e) {
      console.warn('lockAccountInSupabase failed:', e.message);
    }
  },

  // ════════════════════════════════════════════════
  //  Modal انتهاء التجربة
  //  - يشكر المستخدم على 14 يوم
  //  - يعرض الخطط المدفوعة
  //  - يمنع تسجيل الدخول
  // ════════════════════════════════════════════════
  showExpiredModal(tenantName, daysUsed = 14) {
    // إزالة أي modal سابق
    const old = document.getElementById('trial-expired-modal');
    if (old) old.remove();

    const isAr = (typeof I18N !== 'undefined' && I18N.lang === 'ar') ||
                 document.documentElement.dir === 'rtl';
    const t = (a, f) => isAr ? a : f;

    const modal = document.createElement('div');
    modal.id = 'trial-expired-modal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:rgba(0,0,0,.85);backdrop-filter:blur(8px);
      display:flex;align-items:center;justify-content:center;
      padding:1rem;direction:${isAr?'rtl':'ltr'};
      animation:fadeIn .3s ease;
    `;
    modal.innerHTML = `
      <style>
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        .tem-card{
          background:linear-gradient(135deg,#1a1f2e 0%,#0f1420 100%);
          border:1px solid rgba(212,175,55,.3);border-radius:20px;
          max-width:680px;width:100%;max-height:92vh;overflow-y:auto;
          box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.05) inset;
          animation:slideUp .4s ease;
        }
        .tem-hero{
          padding:2rem 2rem 1.5rem;text-align:center;
          background:linear-gradient(135deg,rgba(212,175,55,.1),rgba(212,175,55,.02));
          border-radius:20px 20px 0 0;
          border-bottom:1px solid rgba(212,175,55,.15);
        }
        .tem-icon{font-size:3.5rem;margin-bottom:.5rem}
        .tem-title{font-size:1.6rem;font-weight:800;color:#D4AF37;margin:.5rem 0}
        .tem-thanks{color:#E0E0E0;font-size:1rem;line-height:1.7;margin:.75rem 0}
        .tem-thanks strong{color:#FFD700}
        .tem-body{padding:1.5rem 2rem}
        .tem-msg{
          background:rgba(74,144,226,.08);border-${isAr?'right':'left'}:3px solid #4A90E2;
          padding:1rem 1.25rem;border-radius:8px;margin-bottom:1.5rem;
          color:#C8D4E8;font-size:.95rem;line-height:1.6;
        }
        .tem-plans-title{
          color:#FFF;font-weight:700;margin-bottom:1rem;font-size:1.1rem;
          text-align:center;
        }
        .tem-plans{display:grid;gap:.75rem;margin-bottom:1.5rem}
        @media(min-width:540px){.tem-plans{grid-template-columns:repeat(3,1fr)}}
        .tem-plan{
          background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
          border-radius:12px;padding:1rem .75rem;text-align:center;
          transition:all .2s;cursor:pointer;
        }
        .tem-plan:hover{
          border-color:rgba(212,175,55,.5);
          background:rgba(212,175,55,.06);transform:translateY(-2px);
        }
        .tem-plan.featured{
          border-color:rgba(212,175,55,.6);
          background:linear-gradient(135deg,rgba(212,175,55,.1),rgba(212,175,55,.03));
        }
        .tem-plan-name{color:#D4AF37;font-weight:700;font-size:.95rem;margin-bottom:.5rem}
        .tem-plan-price{color:#FFF;font-size:1.4rem;font-weight:800}
        .tem-plan-period{color:#8A95A8;font-size:.75rem;margin-top:.2rem}
        .tem-plan-feat{color:#A8B5CC;font-size:.78rem;margin-top:.6rem;line-height:1.4}
        .tem-actions{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center}
        .tem-btn{
          padding:.85rem 1.5rem;border-radius:10px;font-weight:700;
          font-size:.95rem;border:none;cursor:pointer;
          transition:all .2s;min-width:160px;
        }
        .tem-btn-gold{
          background:linear-gradient(135deg,#D4AF37,#B8941F);color:#0a0e1a;
          box-shadow:0 4px 14px rgba(212,175,55,.3);
        }
        .tem-btn-gold:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(212,175,55,.5)}
        .tem-btn-ghost{
          background:rgba(255,255,255,.05);color:#C8D4E8;
          border:1px solid rgba(255,255,255,.1);
        }
        .tem-btn-ghost:hover{background:rgba(255,255,255,.1)}
        .tem-foot{
          padding:1rem 2rem;border-top:1px solid rgba(255,255,255,.05);
          text-align:center;color:#6F7B8E;font-size:.85rem;
        }
      </style>
      <div class="tem-card">
        <div class="tem-hero">
          <div class="tem-icon">🌟</div>
          <div class="tem-title">${t('شكراً جزيلاً لك!','Merci infiniment !')}</div>
          <div class="tem-thanks">
            ${t(
              `لقد قضيت معنا <strong>${daysUsed} يوماً</strong> رائعة في <strong>${tenantName || 'مؤسستك'}</strong>،<br>ونحن نقدّر ثقتك في <strong>SmartStruct</strong> لإدارة مشاريعك.`,
              `Vous avez passé <strong>${daysUsed} jours</strong> formidables avec nous chez <strong>${tenantName || 'votre entreprise'}</strong>,<br>et nous apprécions votre confiance en <strong>SmartStruct</strong>.`
            )}
          </div>
        </div>

        <div class="tem-body">
          <div class="tem-msg">
            ⏰ <strong>${t('انتهت فترتك التجريبية المجانية', "Votre période d'essai gratuite est terminée")}</strong><br>
            ${t(
              'لمواصلة استخدام التطبيق والاستفادة من كل الميزات، يُرجى الاشتراك في إحدى خططنا المدفوعة أدناه. تواصل معنا واختر ما يناسب حجم مؤسستك.',
              "Pour continuer à utiliser l'application et profiter de toutes les fonctionnalités, veuillez souscrire à l'un de nos plans payants ci-dessous."
            )}
          </div>

          <div class="tem-plans-title">💎 ${t('اختر خطتك','Choisissez votre plan')}</div>
          <div class="tem-plans">
            <div class="tem-plan" onclick="TrialManager._requestUpgrade(1)">
              <div class="tem-plan-name">${t('المبتدئ','Starter')}</div>
              <div class="tem-plan-price">2,900</div>
              <div class="tem-plan-period">${t('دج / شهر','DA / mois')}</div>
              <div class="tem-plan-feat">${t('3 مشاريع · 15 عامل','3 projets · 15 ouvriers')}</div>
            </div>
            <div class="tem-plan featured" onclick="TrialManager._requestUpgrade(2)">
              <div class="tem-plan-name">⭐ ${t('الاحترافي','Pro')}</div>
              <div class="tem-plan-price">7,900</div>
              <div class="tem-plan-period">${t('دج / شهر','DA / mois')}</div>
              <div class="tem-plan-feat">${t('20 مشروع · 100 عامل','20 projets · 100 ouvriers')}</div>
            </div>
            <div class="tem-plan" onclick="TrialManager._requestUpgrade(3)">
              <div class="tem-plan-name">${t('المؤسسي','Entreprise')}</div>
              <div class="tem-plan-price">19,900</div>
              <div class="tem-plan-period">${t('دج / شهر','DA / mois')}</div>
              <div class="tem-plan-feat">${t('غير محدود','Illimité')}</div>
            </div>
          </div>

          <div class="tem-actions">
            <button class="tem-btn tem-btn-gold" onclick="TrialManager._requestUpgrade(2)">
              💎 ${t('اشترك الآن', "S'abonner maintenant")}
            </button>
            <button class="tem-btn tem-btn-ghost" onclick="TrialManager._closeAndLogout()">
              👋 ${t('تسجيل الخروج','Se déconnecter')}
            </button>
          </div>
        </div>

        <div class="tem-foot">
          📧 ${t('للاستفسارات:','Contact :')} <strong>contact@smartbtp.dz</strong>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
  },

  // طلب ترقية من داخل modal الانتهاء
  _requestUpgrade(planId) {
    try {
      const tenant = (typeof Auth !== 'undefined' && Auth.getTenant) ? Auth.getTenant() : null;
      const user   = (typeof Auth !== 'undefined' && Auth.getUser)   ? Auth.getUser()   : null;
      const company = tenant?.name || '—';
      const planNames = {1:'المبتدئ', 2:'الاحترافي', 3:'المؤسسي'};

      // سجّل طلب الترقية في الإشعارات
      const notifs = DB.get('notifications') || [];
      notifs.unshift({
        id: Date.now(),
        type: 'upgrade_request',
        title: 'طلب اشتراك بعد انتهاء التجربة',
        body: `المؤسسة "${company}" تطلب الاشتراك في خطة "${planNames[planId]||'?'}"`,
        user_id: user?.id || null,
        tenant_id: tenant?.id || null,
        tenant_name: company,
        requested_plan: planId,
        date: new Date().toISOString(),
        status: 'pending',
        read: false
      });
      DB.set('notifications', notifs);
      try { sbSync('notifications', notifs[0], 'POST'); } catch(_) {}

      // بريد إلى المسؤول
      if (typeof EMAILJS !== 'undefined' && EMAILJS.notifyNewAccount) {
        EMAILJS.notifyNewAccount({
          name: user?.full_name || '—',
          email: user?.email || '—',
          company,
          wilaya: tenant?.wilaya || '—',
          subject: `💎 طلب اشتراك (${planNames[planId]}) — ${company}`
        }).catch(()=>{});
      }

      if (typeof Toast !== 'undefined') {
        Toast.success(L('✅ تم إرسال طلبك — سيتواصل معك المسؤول قريباً عبر البريد','✅ Demande envoyée — l\'administrateur vous contactera bientôt'));
      } else {
        alert(L('✅ تم إرسال طلبك بنجاح. سيتواصل معك المسؤول قريباً.','✅ Demande envoyée. L\'administrateur vous contactera bientôt.'));
      }
    } catch(e) {
      console.warn('_requestUpgrade error:', e);
    }
    // نسجّل الخروج بعد الطلب
    setTimeout(() => this._closeAndLogout(), 1500);
  },

  _closeAndLogout() {
    const modal = document.getElementById('trial-expired-modal');
    if (modal) modal.remove();
    document.body.style.overflow = '';
    try {
      sessionStorage.removeItem('sbtp_user');
      sessionStorage.removeItem('sbtp_admin_auth');
      if (typeof Auth !== 'undefined') Auth.currentUser = null;
    } catch(_) {}
    // العودة لصفحة الدخول
    if (typeof App !== 'undefined' && App.navigate) {
      App.navigate('login');
    } else {
      location.reload();
    }
  },

  // ════════════════════════════════════════════════
  //  حماية الصفحات: تحقّق وأنفذ
  //  - يُستدعى بعد تسجيل الدخول وبعد كل تنقل
  //  - يقفل الحساب في Supabase ويعرض modal
  // ════════════════════════════════════════════════
  async checkAndEnforce() {
    try {
      const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
      if (!user) return;
      // المسؤول معفي
      if (user.is_admin) return;

      const tenant = (typeof Auth !== 'undefined' && Auth.getTenant) ? Auth.getTenant() : null;
      if (!tenant) return;

      // إذا انتهى الحساب
      if (this.isExpired(tenant)) {
        const days = this.getDaysLeft(tenant);
        const used = days !== null ? Math.max(14, 14 - days) : 14;

        // قفل في Supabase (لمنع الدخول من أجهزة أخرى)
        await this.lockAccountInSupabase(tenant.id);

        // تحديث محلي
        try {
          const tenants = DB.get('tenants') || [];
          DB.set('tenants', tenants.map(t => t.id === tenant.id
            ? {...t, is_active: false, subscription_status: 'expired'}
            : t
          ));
          const users = DB.get('users') || [];
          DB.set('users', users.map(u => u.tenant_id === tenant.id
            ? {...u, is_active: false, account_status: 'expired'}
            : u
          ));
        } catch(_) {}

        // اعرض modal الشكر + خطط
        this.showExpiredModal(tenant.name, used);
        return true;
      }
      return false;
    } catch(e) {
      console.warn('checkAndEnforce error:', e);
      return false;
    }
  },

  // ════════════════════════════════════════════════
  //  تحذير قبل الانتهاء (3 أيام أو أقل)
  // ════════════════════════════════════════════════
  checkExpiryWarning() {
    try {
      const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
      if (!user || user.is_admin) return;

      const tenant = (typeof Auth !== 'undefined' && Auth.getTenant) ? Auth.getTenant() : null;
      if (!tenant) return;

      const days = this.getDaysLeft(tenant);
      if (days === null) return;

      if (days <= 0) return; // انتهى — يتعامل معه checkAndEnforce
      if (days > 3) return;  // أكثر من 3 أيام — لا حاجة للتحذير

      // تجنّب التكرار في نفس اليوم
      const todayKey = `trial_warned_${tenant.id}_${new Date().toISOString().split('T')[0]}`;
      if (sessionStorage.getItem(todayKey)) return;
      sessionStorage.setItem(todayKey, '1');

      const isAr = (typeof I18N !== 'undefined' && I18N.lang === 'ar') ||
                   document.documentElement.dir === 'rtl';
      const t = (a, f) => isAr ? a : f;

      if (typeof Toast !== 'undefined') {
        const msg = days === 1
          ? t(`⚠️ ينتهي حسابك التجريبي غداً! اشترك الآن لتجنب الانقطاع.`,
              `⚠️ Votre essai expire demain ! Abonnez-vous maintenant.`)
          : t(`⚠️ تبقى ${days} أيام فقط على انتهاء التجربة. اشترك الآن!`,
              `⚠️ Plus que ${days} jours d'essai. Abonnez-vous !`);
        if (Toast.warn) Toast.warn(msg, 8000);
        else if (Toast.show) Toast.show(msg, 'warn', 8000);
      }
    } catch(e) {
      console.warn('checkExpiryWarning error:', e);
    }
  }
};

// ── دالة طلب الترقية من صاحب الحساب ──
function requestPlanUpgrade(companyNameOpt) {
  const user = Auth.getUser();
  const tenant = Auth.getTenant() || {};
  const company = companyNameOpt || tenant.name || '—';
  const plan = Auth.getPlan() || {};

  // سجّل الطلب في قاعدة البيانات
  const adminNotifs = DB.get('notifications') || [];
  const alreadyPending = adminNotifs.find(n => n.type === 'upgrade_request' && n.tenant_id === tenant.id && n.status === 'pending');
  if (alreadyPending) {
    if (typeof Toast !== 'undefined') Toast.warn(L('⏳ طلبك مرسل بالفعل — ينتظر موافقة المسؤول','⏳ Demande déjà envoyée — en attente d\'approbation'));
    return;
  }
  adminNotifs.unshift({
    id: Date.now(),
    type: 'upgrade_request',
    title: 'طلب ترقية / تجديد اشتراك',
    body: `المؤسسة "${company}" تطلب ترقية من خطة "${plan.name || '—'}"`,
    user_id: user?.id,
    tenant_id: tenant.id,
    tenant_name: company,
    current_plan: plan.name || '—',
    date: new Date().toISOString(),
    status: 'pending',
    read: false
  });
  DB.set('notifications', adminNotifs);

  // إرسال بريد للمسؤول
  if (typeof EMAILJS !== 'undefined') {
    EMAILJS.notifyNewAccount({
      name: user?.full_name || '—',
      email: user?.email || '—',
      company: company,
      wilaya: tenant.wilaya || '—',
      subject: '⬆️ طلب ترقية اشتراك — ' + company
    }).catch(() => {});
  }
  if (typeof Toast !== 'undefined') Toast.success(L('✅ تم إرسال طلب الترقية للمسؤول — سيتواصل معك قريباً','✅ Demande de mise à niveau envoyée — vous serez contacté bientôt'));
}

/* ─── DASHBOARD ─── */

/* ─── SMART HEALTH SCORE ENGINE ─── */
function calcHealthScore(projects, txs, workers, attendance) {
  if (!projects.length) return { score: 0, color: '#F04E6A', label: I18N.t('dash.danger'), breakdown: {} };
  const revenue = txs.filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
  const expense  = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  const totalBudget = projects.reduce((s,p)=>s+Number(p.budget),0);
  const totalSpent  = projects.reduce((s,p)=>s+Number(p.total_spent),0);
  // 40% profitability
  const profitScore = revenue > 0 ? Math.max(0, Math.min(100, ((revenue - expense) / revenue) * 100)) : 50;
  // 20% delayed projects
  const delayedRatio = projects.length ? (projects.filter(p=>p.status==='delayed').length / projects.length) * 100 : 0;
  const delayScore = Math.max(0, 100 - delayedRatio * 3);
  // 20% budget stability
  const budgetPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 50;
  const budgetScore = budgetPct > 100 ? 0 : budgetPct > 90 ? 50 : 100;
  // 20% cash liquidity
  const liquidityScore = (revenue - expense) >= 0 ? 100 : 30;
  // 10% worker stability (attendance)
  const today = new Date().toISOString().split('T')[0];
  const todayAtt = attendance.filter(a=>a.date===today);
  const presentToday = todayAtt.filter(a=>a.status==='present').length;
  const workerScore = workers.length > 0 ? Math.round((presentToday / workers.length) * 100) : 70;

  const score = Math.round(profitScore*0.35 + delayScore*0.2 + budgetScore*0.2 + liquidityScore*0.15 + workerScore*0.1);
  const color = score >= 75 ? '#34C38F' : score >= 55 ? '#E8B84B' : '#F04E6A';
  const label = score >= 75 ? I18N.t('dash.stable') : score >= 55 ? I18N.t('dash.needsAttn') : I18N.t('dash.danger');
  
  // Previous month comparison (simple estimate)
  const prevMonthTxs = txs.filter(t => {
    const d = new Date(t.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() - 1 || (now.getMonth() === 0 && d.getMonth() === 11);
  });
  const prevRev = prevMonthTxs.filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
  const prevExp = prevMonthTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  const prevProfit = prevRev > 0 ? Math.max(0, Math.min(100, ((prevRev-prevExp)/prevRev)*100)) : 50;
  const prevScore = Math.round(prevProfit*0.35 + 80*0.2 + budgetScore*0.2 + (prevRev-prevExp>=0?100:30)*0.15 + 70*0.1);
  const trend = score - prevScore;

  return { 
    score, color, label, trend,
    breakdown: {
      profitability: Math.round(profitScore),
      budget: Math.round(budgetScore),
      liquidity: Math.round(liquidityScore),
      delay: Math.round(delayScore),
      workers: Math.round(workerScore)
    }
  };
}

function calcBudgetForecastDays(project) {
  if (!project.budget || !project.total_spent || project.progress <= 0) return null;
  const progressRemaining = 100 - project.progress;
  if (progressRemaining <= 0) return null;
  const spentPerProgress = project.total_spent / project.progress;
  const estimatedTotal = spentPerProgress * 100;
  const willExceed = estimatedTotal > project.budget;
  const overrunAmount = estimatedTotal - project.budget;
  return { willExceed, overrunAmount, estimatedTotal };
}

function getProfitClass(project) {
  if (!project.budget || !project.total_spent) return '';
  const margin = ((project.budget - project.total_spent) / project.budget) * 100;
  if (margin > 15) return 'prof-high';
  if (margin > 5) return 'prof-medium';
  if (margin > 0) return 'prof-low';
  return 'prof-loss';
}

function getProfitLabel(project) {
  if (!project.budget || !project.total_spent) return '';
  const margin = ((project.budget - project.total_spent) / project.budget) * 100;
  if (margin > 15) return I18N.t('dash.profHigh') + ` +${Math.round(margin)}%`;
  if (margin > 5)  return I18N.t('dash.profMed')  + ` +${Math.round(margin)}%`;
  if (margin > 0)  return I18N.t('dash.profLow')  + ` +${Math.round(margin)}%`;
  return I18N.t('dash.profLoss') + ` ${Math.round(margin)}%`;
}

Pages.dashboard = function() {
  const user = Auth.getUser();
  const tid = user.tenant_id;
  const projects = DB.get('projects').filter(p => p.tenant_id===tid && !p.is_archived);
  const workers  = DB.get('workers').filter(w => w.tenant_id===tid);
  const equip    = DB.get('equipment').filter(e => e.tenant_id===tid);
  const txs      = DB.get('transactions').filter(t => t.tenant_id===tid);
  const attendance = DB.get('attendance').filter(a => workers.find(w=>w.id===a.worker_id));
  const revenue  = txs.filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
  const expense  = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  const totalBudget = projects.reduce((s,p)=>s+Number(p.budget),0);
  const totalSpent  = projects.reduce((s,p)=>s+Number(p.total_spent),0);
  const recent = [...projects].sort((a,b)=>b.id-a.id).slice(0,4);
  const plan = Auth.getPlan();
  const tenant = Auth.getTenant();
  // Trial banner
  let trialBannerHTML = '';
  if (tenant && tenant.subscription_status === 'trial' && tenant.trial_end) {
    const daysLeft = Math.max(0, TrialManager.getDaysLeft(tenant) ?? 0);
    const pct = Math.round((daysLeft / 14) * 100);
  
    const urgency = daysLeft <= 3 ? 'var(--red)' : daysLeft <= 7 ? 'var(--gold)' : 'var(--green)';
    trialBannerHTML = `<div style="background:rgba(52,195,143,.05);border:1px solid rgba(52,195,143,.2);border-radius:14px;padding:.9rem 1.2rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.7rem">
      <div style="display:flex;align-items:center;gap:.8rem">
        <div style="font-size:1.6rem;font-weight:900;color:${urgency};font-family:'JetBrains Mono',monospace">${daysLeft}</div>
        <div>
          <div style="font-size:.82rem;font-weight:800;color:var(--text)">${L('يوم متبقي من التجربة المجانية','Jours restants d\'essai gratuit')}</div>
          <div style="height:4px;background:rgba(255,255,255,.08);border-radius:4px;width:180px;margin-top:4px">
            <div style="height:4px;background:${urgency};border-radius:4px;width:${pct}%;transition:width 1s ease"></div>
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:.6rem">
        <span style="font-size:.75rem;color:var(--dim)">${L('انتهاء التجربة:','Fin de l\'essai:')} ${tenant.trial_end}</span>
        <button class="btn btn-gold btn-sm" onclick="requestPlanUpgrade()">${L('ترقية الحساب ↑','Mettre à niveau ↑')}</button>
      </div>
    </div>`;
  }
  const health = calcHealthScore(projects, txs, workers, attendance);

  // Today attendance
  const today = new Date().toISOString().split('T')[0];
  const todayAtt = attendance.filter(a=>a.date===today);
  const presentToday = todayAtt.filter(a=>a.status==='present').length;
  const attendanceRate = workers.length > 0 ? Math.round((presentToday / workers.length) * 100) : 0;

  // Profit forecast: estimated end-of-month
  const monthTxs = txs.filter(t => { const d = new Date(t.date); return d.getMonth() === new Date().getMonth(); });
  const monthRevenue = monthTxs.filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
  const monthExpense = monthTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
  const dailyBurnRate = dayOfMonth > 0 ? monthExpense / dayOfMonth : 0;
  const forecastExpense = dailyBurnRate * daysInMonth;
  const forecastProfit = monthRevenue - forecastExpense;

  // AI Risk Detection
  const risks = [];
  projects.forEach(p => {
    if (p.budget > 0 && p.total_spent >= p.budget * 0.7 && p.progress < 50) {
      risks.push({ level: 'danger', text: `${__('dash.riskBudget70')}: "${escHtml(p.name)}"`, meta: `${Math.round(p.total_spent/p.budget*100)}% ${__('dash.riskConsumed')} ${p.progress}%` });
    }
    if (p.status === 'delayed') {
      risks.push({ level: 'warn', text: `"${escHtml(p.name)}" — ${__('dash.riskDelayed')}`, meta: `${__('dash.riskWilaya')} ${p.wilaya||'—'}` });
    }
    const fc = calcBudgetForecastDays(p);
    if (fc && fc.willExceed && fc.overrunAmount > 0) {
      risks.push({ level: 'warn', text: `${__('dash.riskForecast')}: "${escHtml(p.name)}"`, meta: `${__('dash.riskOverrun')} +${fmt(Math.round(fc.overrunAmount))} دج` });
    }
  });

  // Ring circumference for SVG
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = circ - (circ * Math.min(health.score, 100) / 100);

  // Monthly cashflow chart data (last 6 months)
  const now = new Date();
  const monthLabels = [];
  const monthRev = [];
  const monthExp = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth(); const y = d.getFullYear();
    monthLabels.push(d.toLocaleDateString('ar-DZ', { month: 'short' }));
    monthRev.push(txs.filter(t=>t.type==='revenue' && new Date(t.date).getMonth()===m && new Date(t.date).getFullYear()===y).reduce((s,t)=>s+Number(t.amount),0));
    monthExp.push(txs.filter(t=>t.type==='expense' && new Date(t.date).getMonth()===m && new Date(t.date).getFullYear()===y).reduce((s,t)=>s+Number(t.amount),0));
  }

  return layoutHTML('dashboard','لوحة التحكم',`
    ${trialBannerHTML}

    <!-- AI CEO DAILY SUMMARY -->
    <div class="ai-ceo-banner">
      <div class="ai-ceo-icon">🤖</div>
      <div style="flex:1">
        <div class="ai-ceo-greeting">🌅 ملخص الذكاء الاصطناعي — ${new Date().toLocaleDateString('ar-DZ',{weekday:'long',day:'numeric',month:'long'})}</div>
        <div style="font-size:.88rem;font-weight:800;margin-bottom:.4rem">
          ${risks.filter(r=>r.level==='danger').length > 0 ? `🔴 ${risks.filter(r=>r.level==='danger').length} مشروع في خطر` : `✅ جميع المشاريع في وضع سليم`}
          ${totalBudget > 0 && totalSpent/totalBudget > 0.7 ? ` • 🟡 استهلاك الميزانية مرتفع ${Math.round(totalSpent/totalBudget*100)}%` : ''}
        </div>
        <div class="ai-ceo-insights">
          <span class="ai-ceo-chip ${forecastProfit >= 0 ? 'green' : 'red'}">💰 ربح متوقع: ${fmt(Math.round(forecastProfit))} دج</span>
          ${health.score >= 75 ? `<span class="ai-ceo-chip green">🏥 الصحة المالية ممتازة ${health.score}/100</span>` 
            : health.score >= 55 ? `<span class="ai-ceo-chip yellow">🏥 تحتاج اهتمام ${health.score}/100</span>`
            : `<span class="ai-ceo-chip red">🏥 خطر مالي ${health.score}/100</span>`}
          ${workers.length > 0 ? `<span class="ai-ceo-chip blue">👷 ${presentToday}/${workers.length} حاضر اليوم</span>` : ''}
          ${projects.filter(p=>p.status==='active').length > 0 ? `<span class="ai-ceo-chip blue">🏗️ ${projects.filter(p=>p.status==='active').length} مشروع نشط</span>` : ''}
          ${risks.length > 0 ? `<span class="ai-ceo-chip ${risks.filter(r=>r.level==='danger').length>0?'red':'yellow'}">⚠️ ${risks.length} تنبيه</span>` : ''}
        </div>
      </div>
      <div class="ai-ceo-actions">
        <button class="btn btn-sm btn-ghost" onclick="printAICEOSummary()" style="font-size:.72rem">📄 PDF</button>
      </div>
    </div>

    <div class="page-header">
      <div>
        <div class="page-title">👋 أهلاً، ${escHtml(user.full_name.split(' ')[0])}</div>
        <div class="page-sub">${new Date().toLocaleDateString('ar-DZ',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      </div>
      <div class="page-actions">
        <span style="font-size:.78rem;background:rgba(52,195,143,.1);border:1px solid rgba(52,195,143,.2);border-radius:8px;padding:5px 12px;color:#34C38F;font-weight:700">✅ ${plan?.name||''}</span>
        <button id="syncAllBtn" class="btn btn-sm" style="background:rgba(74,144,226,.15);border:1px solid rgba(74,144,226,.4);color:#4A90E2;font-weight:700" onclick="syncAllDataToSupabase()" title="رفع كل البيانات لـ Supabase">☁️ رفع البيانات</button>
        <button class="btn btn-sm" style="background:rgba(52,195,143,.1);border:1px solid rgba(52,195,143,.3);color:#34C38F;font-weight:700" onclick="checkSupabaseStatus()" title="تحقق من الاتصال">🔌 حالة Supabase</button>
        <button class="btn btn-gold btn-sm" data-nav="projects">${__('dash.newProject')}</button>
      </div>
    </div>

    <!-- COMMAND CENTER: Health Score + Smart KPIs -->
    <div class="health-command-bar">
      <!-- Health Score Ring -->
      <div class="health-score-card ${health.score < 55 ? 'danger' : ''}">
        <div class="health-ring-wrap">
          <svg class="health-ring-svg" viewBox="0 0 120 120">
            <circle class="health-ring-bg" cx="60" cy="60" r="${r}"/>
            <circle class="health-ring-fill" cx="60" cy="60" r="${r}"
              stroke="${health.color}"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${circ}"
              id="healthRingFill"
              data-score="${health.score}"
            />
          </svg>
          <div class="health-score-val">
            <div class="health-score-num" style="color:${health.color}" id="healthNum" data-target="${health.score}">0</div>
            <div class="health-score-lbl">/100</div>
          </div>
        </div>
        <div class="health-title">${__('dash.healthScore')}</div>
        <div class="health-sub">${__('dash.healthSub')}</div>
        <div class="health-status-badge" style="background:${health.color}22;color:${health.color};border:1px solid ${health.color}44">${health.label}</div>
        ${health.trend !== undefined ? `<div class="health-trend-badge" style="background:${health.trend>=0?'rgba(52,195,143,0.1)':'rgba(240,78,106,0.1)'};color:${health.trend>=0?'#34C38F':'#F79FA9'};border:1px solid ${health.trend>=0?'rgba(52,195,143,0.3)':'rgba(240,78,106,0.3)'}">
          ${health.trend >= 0 ? '↑' : '↓'} ${Math.abs(health.trend)} مقارنة بالشهر الماضي
        </div>` : ''}
        <button class="btn btn-ghost btn-sm" style="margin-top:.5rem;font-size:.7rem" onclick="this.nextElementSibling.classList.toggle('show')">📊 تفاصيل المؤشرات ▾</button>
        <div class="health-breakdown-panel">
          <div class="hb-row">
            <div class="hb-label">الربحية</div>
            <div class="hb-bar"><div class="hb-fill" style="width:${health.breakdown.profitability||0}%;background:${(health.breakdown.profitability||0)>=70?'var(--green)':(health.breakdown.profitability||0)>=40?'var(--gold)':'var(--red)'}"></div></div>
            <div class="hb-val" style="color:${(health.breakdown.profitability||0)>=70?'var(--green)':(health.breakdown.profitability||0)>=40?'var(--gold)':'var(--red)'}">${health.breakdown.profitability||0}%</div>
          </div>
          <div class="hb-row">
            <div class="hb-label">الميزانية</div>
            <div class="hb-bar"><div class="hb-fill" style="width:${health.breakdown.budget||0}%;background:${(health.breakdown.budget||0)>=70?'var(--green)':(health.breakdown.budget||0)>=40?'var(--gold)':'var(--red)'}"></div></div>
            <div class="hb-val" style="color:${(health.breakdown.budget||0)>=70?'var(--green)':(health.breakdown.budget||0)>=40?'var(--gold)':'var(--red)'}">${health.breakdown.budget||0}%</div>
          </div>
          <div class="hb-row">
            <div class="hb-label">السيولة</div>
            <div class="hb-bar"><div class="hb-fill" style="width:${health.breakdown.liquidity||0}%;background:${(health.breakdown.liquidity||0)>=70?'var(--green)':(health.breakdown.liquidity||0)>=40?'var(--gold)':'var(--red)'}"></div></div>
            <div class="hb-val" style="color:${(health.breakdown.liquidity||0)>=70?'var(--green)':(health.breakdown.liquidity||0)>=40?'var(--gold)':'var(--red)'}">${health.breakdown.liquidity||0}%</div>
          </div>
          <div class="hb-row">
            <div class="hb-label">التأخير</div>
            <div class="hb-bar"><div class="hb-fill" style="width:${health.breakdown.delay||0}%;background:${(health.breakdown.delay||0)>=70?'var(--green)':(health.breakdown.delay||0)>=40?'var(--gold)':'var(--red)'}"></div></div>
            <div class="hb-val" style="color:${(health.breakdown.delay||0)>=70?'var(--green)':(health.breakdown.delay||0)>=40?'var(--gold)':'var(--red)'}">${health.breakdown.delay||0}%</div>
          </div>
          <div class="hb-row">
            <div class="hb-label">العمالة</div>
            <div class="hb-bar"><div class="hb-fill" style="width:${health.breakdown.workers||0}%;background:${(health.breakdown.workers||0)>=70?'var(--green)':(health.breakdown.workers||0)>=40?'var(--gold)':'var(--red)'}"></div></div>
            <div class="hb-val" style="color:${(health.breakdown.workers||0)>=70?'var(--green)':(health.breakdown.workers||0)>=40?'var(--gold)':'var(--red)'}">${health.breakdown.workers||0}%</div>
          </div>
        </div>
      </div>

      <!-- Smart KPI Bar -->
      <div style="display:flex;flex-direction:column;gap:0.6rem">
        <div class="smart-kpi-row">
          <div class="smart-kpi kpi-blue">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value" style="color:var(--blue)">${projects.filter(p=>p.status==='active').length}</div>
            <div class="kpi-label">${__('dash.activeProj')}</div>
          </div>
          <div class="smart-kpi kpi-green">
            <div class="kpi-icon">📈</div>
            <div class="kpi-value" style="color:var(--green);font-size:0.85rem">${fmt(Math.round(forecastProfit))}</div>
            <div class="kpi-label">${__('dash.forecastProfit')}</div>
          </div>
          <div class="smart-kpi kpi-red">
            <div class="kpi-icon">⚠️</div>
            <div class="kpi-value" style="color:var(--red)">${risks.filter(r=>r.level==='danger').length}</div>
            <div class="kpi-label">${__('dash.atRisk')}</div>
          </div>
          <div class="smart-kpi kpi-gold">
            <div class="kpi-icon">💰</div>
            <div class="kpi-value" style="color:${revenue-expense>=0?'var(--green)':'var(--red)'};font-size:0.85rem">${fmt(revenue-expense)}</div>
            <div class="kpi-label">${__('dash.netLiquidity')}</div>
          </div>
          <div class="smart-kpi kpi-purple">
            <div class="kpi-icon">👷</div>
            <div class="kpi-value" style="color:var(--purple)">${attendanceRate}%</div>
            <div class="kpi-label">${__('dash.todayPresence')}</div>
          </div>
        </div>
        <!-- Budget Progress -->
        <div class="card" style="padding:.9rem 1rem;margin:0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
            <span style="font-size:.78rem;font-weight:800">📊 ${__('dash.budgetConsum')}</span>
            <span style="font-size:.78rem;font-weight:900;color:var(--gold)">${totalBudget>0?Math.round(totalSpent/totalBudget*100):0}% — ${fmt(totalSpent)} / ${fmt(totalBudget)} دج</span>
          </div>
          <div class="progress-bar" style="height:8px;border-radius:8px">
            <div class="progress-fill" style="background:linear-gradient(90deg,var(--green),var(--gold))" data-width="${totalBudget>0?Math.min(Math.round(totalSpent/totalBudget*100),100):0}"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI RISK PANEL + PROFIT FORECAST + WORKER EFFICIENCY -->
    <div class="dash-grid-top">
      <!-- AI Risk Detection -->
      <div class="risk-panel">
        <div class="risk-panel-header">
          <span>🚨</span>
          <span class="risk-panel-title">${__('dash.riskPanel')}</span>
          <span class="risk-count-badge">${risks.length} ${__('dash.alerts')}</span>
        </div>
        ${risks.length ? risks.map(r=>`
          <div class="risk-item">
            <div class="risk-dot" style="background:${r.level==='danger'?'var(--red)':'#FF7043'}"></div>
            <div>
              <div class="risk-text">${r.text}</div>
              <div class="risk-meta">${r.meta}</div>
            </div>
          </div>
        `).join('') : `
          <div style="padding:1.5rem;text-align:center;color:var(--green)">
            <div style="font-size:1.5rem;margin-bottom:.4rem">✅</div>
            <div style="font-size:.82rem;font-weight:700">${__('dash.noRisks')}</div>
          </div>`}
      </div>

      <!-- Profit Forecast -->
      <div class="forecast-card">
        <div class="forecast-header">
          <span style="font-size:.85rem;font-weight:800">📈 ${__('dash.forecastTitle')}</span>
          <span class="forecast-badge">${__('dash.thisMonth')}</span>
        </div>
        <div class="forecast-row">
          <span class="forecast-label">${__('dash.monthRevenue')}</span>
          <span class="forecast-amount" style="color:var(--green)">${fmt(monthRevenue)} دج</span>
        </div>
        <div class="forecast-row">
          <span class="forecast-label">${__('dash.dailyBurn')}</span>
          <span class="forecast-amount" style="color:var(--red)">${fmt(Math.round(dailyBurnRate))} دج</span>
        </div>
        <div class="forecast-row">
          <span class="forecast-label">${__('dash.forecastExp')}</span>
          <span class="forecast-amount" style="color:var(--orange)">${fmt(Math.round(forecastExpense))} دج</span>
        </div>
        <div class="forecast-row" style="border-top:1px solid rgba(52,195,143,0.2);margin-top:.3rem;padding-top:.6rem">
          <span class="forecast-label" style="font-weight:800;color:var(--text)">🎯 ${__('dash.forecastEnd')}</span>
          <span class="forecast-amount" style="color:${forecastProfit>=0?'var(--green)':'var(--red)'}; font-size:1rem">${fmt(Math.round(forecastProfit))} دج</span>
        </div>
        <!-- 3-Month Forecast -->
        <div style="margin-top:.8rem;font-size:.72rem;font-weight:800;color:var(--dim);margin-bottom:.4rem">📆 توقع 3 أشهر</div>
        <div class="forecast-3m-grid">
          ${[1,2,3].map(m => {
            const d = new Date(); d.setMonth(d.getMonth() + m);
            const lbl = d.toLocaleDateString('ar-DZ',{month:'short'});
            const projRev = monthRevenue * (1 + m * 0.02);
            const projExp = forecastExpense * (1 + m * 0.015);
            const projProfit = projRev - projExp;
            return `<div class="forecast-month-card">
              <div class="forecast-month-label">${lbl}</div>
              <div class="forecast-month-val" style="color:${projProfit>=0?'var(--green)':'var(--red)'}">${projProfit>=0?'+':''}${(projProfit/1000000).toFixed(1)}M</div>
            </div>`;
          }).join('')}
        </div>
        <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:.7rem" data-nav="simulator">🧮 محاكي الربح ←</button>
      </div>

      <!-- Worker Efficiency -->
      <div class="card" style="padding:1rem">
        <div style="font-size:.85rem;font-weight:800;margin-bottom:.7rem">👷 ${__('dash.workerEff')}</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:.5rem">
          <span style="font-size:.75rem;color:var(--dim)">${__('dash.totalWorkers')}</span>
          <span style="font-weight:800;color:var(--purple)">${workers.length} ${__('dash.worker')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:.5rem">
          <span style="font-size:.75rem;color:var(--dim)">${__('dash.dailyCost')}</span>
          <span style="font-weight:800;color:var(--red)">${fmt(workers.reduce((s,w)=>s+Number(w.daily_salary||0),0))} دج</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:.7rem">
          <span style="font-size:.75rem;color:var(--dim)">${__('dash.presentToday')}</span>
          <span style="font-weight:800;color:var(--green)">${presentToday} / ${workers.length}</span>
        </div>
        <div class="progress-bar" style="height:6px;margin-bottom:.8rem">
          <div class="progress-fill" style="background:${attendanceRate>=80?'var(--green)':attendanceRate>=50?'var(--gold)':'var(--red)'}" data-width="${attendanceRate}"></div>
        </div>
        <div class="worker-eff-grid">
          ${workers.slice(0,4).map(w=>`
            <div class="worker-eff-item">
              <div class="worker-eff-name">${escHtml(w.full_name)}</div>
              <div class="worker-eff-role">${escHtml(w.role)}</div>
              <div class="worker-eff-stat" style="color:var(--gold)">${fmt(w.daily_salary)} دج/يوم</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- CASH FLOW CHART + PROJECTS PROFITABILITY -->
    <div class="dash-grid-bottom" style="margin-bottom:1rem">
      <!-- Cash Flow Chart -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <div style="font-size:.9rem;font-weight:800">💰 ${__('dash.cashflow')}</div>
          <div style="display:flex;gap:.7rem;font-size:.7rem">
            <span><span style="color:var(--green)">●</span> ${__('dash.revenues')}</span>
            <span><span style="color:var(--red)">●</span> ${__('dash.expenses')}</span>
          </div>
        </div>
        <canvas id="cashflowChart" height="180"
          data-labels='${JSON.stringify(monthLabels).replace(/'/g,"&#39;")}'
          data-rev='${JSON.stringify(monthRev)}'
          data-exp='${JSON.stringify(monthExp)}'
          data-lbl-rev='${__("dash.revenues")}'
          data-lbl-exp='${__("dash.expenses")}'
        ></canvas>
      </div>

      <!-- Project Profitability Classification -->
      <div class="card">
        <div style="font-size:.85rem;font-weight:800;margin-bottom:.8rem">🏆 ${__('dash.profitClass')}</div>
        ${projects.length ? projects.map(p => {
          const margin = p.budget > 0 ? Math.round(((p.budget - p.total_spent) / p.budget) * 100) : 0;
          const cls = getProfitClass(p);
          const lbl = getProfitLabel(p);
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-size:.78rem;font-weight:700">${escHtml(p.name)}</div>
              <div style="font-size:.65rem;color:var(--dim)">${escHtml(p.wilaya||'')} • ${statusLabel(p.status)}</div>
            </div>
            <span class="prof-badge ${cls}">${lbl}</span>
          </div>`;
        }).join('') : `<div class="empty" style="padding:1rem"><div class="empty-title">${__('dash.noProjects')}</div></div>`}
      </div>
    </div>

    <!-- RECENT PROJECTS + ACTIVITY FEED -->
    ${attTodayWidget(workers)}
    <div class="card" style="margin-top:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <div style="font-size:.9rem;font-weight:800">🏗️ ${__('dash.recentProj')}</div>
        <button class="btn btn-ghost btn-sm" data-nav="projects">${__('dash.viewAll')}</button>
      </div>
      <div class="grid-cards">
        ${recent.map(p=>{
          const fc = calcBudgetForecastDays(p);
          return `<div style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:14px;overflow:hidden;transition:all .2s" onmouseover="this.style.transform='translateY(-3px)';this.style.borderColor='${p.color}55'" onmouseout="this.style.transform='';this.style.borderColor='rgba(255,255,255,.07)'">
            <div style="height:3px;background:${p.color}"></div>
            <div style="padding:1rem">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.3rem">
                <div style="font-weight:800;font-size:.9rem">${escHtml(p.name)}</div>
                <span class="prof-badge ${getProfitClass(p)}">${getProfitLabel(p)}</span>
              </div>
              <div style="font-size:.75rem;color:var(--dim);margin-bottom:.7rem">${escHtml(p.wilaya||'')} ${p.client_name?'• '+escHtml(p.client_name):''}</div>
              <div style="display:flex;justify-content:space-between;margin-bottom:.4rem"><span style="font-size:.75rem;color:var(--dim)">التقدم</span><span style="font-size:.75rem;font-weight:700">${p.progress}%</span></div>
              <div class="progress-bar"><div class="progress-fill" style="background:${p.color}" data-width="${p.progress}"></div></div>
              ${fc && fc.willExceed ? `<div style="margin-top:.5rem;font-size:.65rem;color:var(--orange);background:rgba(255,112,67,.08);border-radius:6px;padding:2px 7px;display:inline-block">⚠️ ${__('dash.overrunWarn')} +${fmt(Math.round(fc.overrunAmount))} دج</div>` : ''}
              <div style="margin-top:.7rem">${statusBadge(p.status)}</div>
            </div>
          </div>`;
        }).join('')||`<div class="empty"><div class="empty-icon">🏗️</div><div class="empty-title">${__('dash.noProjects')}</div></div>`}
      </div>
    </div>
  `);

  // Run charts and animations after render
  setTimeout(() => {
    // تحميل Chart.js إذا لم يكن محملاً
    if (typeof Chart === 'undefined' && typeof window.loadChartJS === 'function') {
      window.loadChartJS().then(() => {
        // إعادة تهيئة الرسوم البيانية بعد تحميل المكتبة
        const ctx2 = document.getElementById('cashflowChart');
        if (ctx2 && typeof Chart !== 'undefined') _initDashboardChart(ctx2);
      });
    }
    // Animate Health Score ring
    const ring = document.getElementById('healthRingFill');
    const numEl = document.getElementById('healthNum');
    if (ring) {
      const circ2 = 2 * Math.PI * 52;
      const scoreVal = parseInt(ring.getAttribute('data-score') || '0');
      const targetOffset = circ2 - (circ2 * Math.min(scoreVal, 100) / 100);
      ring.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)';
      setTimeout(() => { ring.style.strokeDashoffset = targetOffset; }, 50);
    }
    if (numEl) {
      const target = parseInt(numEl.getAttribute('data-target') || '0');
      let current = 0;
      const step = () => { if (current < target) { current = Math.min(current + 2, target); numEl.textContent = current; requestAnimationFrame(step); } };
      step();
    }
    // Cash Flow Chart
    const ctx = document.getElementById('cashflowChart');
    if (ctx) {
      const chartLabels = JSON.parse(ctx.getAttribute('data-labels') || '[]');
      const chartRev = JSON.parse(ctx.getAttribute('data-rev') || '[]');
      const chartExp = JSON.parse(ctx.getAttribute('data-exp') || '[]');
      const lblRev = ctx.getAttribute('data-lbl-rev') || 'Revenus';
      const lblExp = ctx.getAttribute('data-lbl-exp') || 'Dépenses';
      if (typeof Chart !== 'undefined') new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [
            { label: lblRev, data: chartRev, backgroundColor: 'rgba(52,195,143,0.6)', borderRadius: 6 },
            { label: lblExp, data: chartExp, backgroundColor: 'rgba(240,78,106,0.5)', borderRadius: 6 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + Number(ctx.raw).toLocaleString('fr-DZ') + ' دج' } } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892A4', font: { family: 'Tajawal', size: 11 } } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892A4', font: { family: 'Tajawal', size: 10 }, callback: v => (v/1000000).toFixed(1)+'M' } }
          }
        }
      });
    }
  }, 100);
};

/* ─── PROJECTS ─── */
Pages.projects = function() {
  const tid = Auth.getUser().tenant_id;
  const plan = Auth.getPlan();
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid && !p.is_archived);
  const workers  = DB.get('workers');
  const total=projects.length, active=projects.filter(p=>p.status==='active').length;
  const completed=projects.filter(p=>p.status==='completed').length, delayed=projects.filter(p=>p.status==='delayed').length;

  const cards = projects.map(p=>{
    const wCount=workers.filter(w=>w.project_id===p.id).length;
    const pTypeObj = PROJECT_TYPES.find(t=>t.value===p.project_type);
    return `<div style="background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);border-radius:16px;overflow:hidden;transition:all .28s cubic-bezier(.34,1.56,.64,1)" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''">
      <div style="height:3px;background:${p.color}"></div>
      <div style="padding:1.1rem 1.2rem">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">
          <div style="font-weight:800;font-size:.95rem;flex:1">${escHtml(p.name)}</div>${statusBadge(p.status)}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.8rem">
          ${pTypeObj?`<span style="font-size:.72rem;background:rgba(232,184,75,.1);border:1px solid rgba(232,184,75,.2);color:var(--gold);border-radius:20px;padding:2px 8px">${pTypeObj.label}</span>`:''}
          ${p.wilaya?`<span style="font-size:.72rem;color:var(--dim)">📍 ${escHtml(p.wilaya)}</span>`:''}
          ${p.client_name?`<span style="font-size:.72rem;color:var(--dim)">👤 ${escHtml(p.client_name)}</span>`:''}
          ${wCount?`<span style="font-size:.72rem;color:var(--dim)">👷 ${wCount}</span>`:''}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.75rem;margin-bottom:4px"><span style="color:var(--dim)">${L('التقدم','Avancement')}</span><span style="font-weight:700">${p.progress}%</span></div>
        <div class="progress-bar" style="margin-bottom:.8rem"><div class="progress-fill" style="background:${p.color}" data-width="${p.progress}"></div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;font-size:.75rem;margin-bottom:.8rem">
          <div><div style="color:var(--dim)">${L('الميزانية','Budget')}</div><div style="font-weight:700;font-family:monospace">${fmt(p.budget)}</div></div>
          <div><div style="color:var(--dim)">${L('المُنفَق','Dépensé')}</div><div style="font-weight:700;color:${p.total_spent>p.budget?'var(--red)':'var(--green)'};font-family:monospace">${fmt(p.total_spent)}</div></div>
        </div>
        <div style="display:flex;gap:.4rem">
          <button class="btn btn-ghost btn-sm" style="flex:1" onclick="App.navigate('project_detail',{id:${p.id}})">📋 ${L('تفاصيل','Détails')}</button>
          <button class="btn btn-blue btn-sm" onclick="editProject(${p.id})">✏️</button>
          <button class="btn btn-red btn-sm" onclick="deleteProject(${p.id},'${escHtml(p.name)}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('')||`<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🏗️</div><div class="empty-title">${L('لا توجد مشاريع بعد','Aucun projet')}</div><div class="empty-text">${L('أضف مشروعك الأول للبدء','Ajoutez votre premier projet')}</div></div>`;

  return layoutHTML('projects',L('المشاريع','Projets'),`
    <div class="page-header">
      <div><div class="page-title">🏗️ ${L('المشاريع','Projets')}</div><div class="page-sub">${total} ${L('مشروع','projet(s)')}</div></div>
      <div class="page-actions"><button class="btn btn-gold" data-modal-open="addProjectModal">+ ${L('مشروع جديد','Nouveau projet')}</button></div>
    </div>
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card"><div class="stat-value" style="color:var(--blue)">${total}</div><div class="stat-label">${L('الإجمالي','Total')}</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--green)">${active}</div><div class="stat-label">${L('نشطة','Actifs')}</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--blue)">${completed}</div><div class="stat-label">${L('مكتملة','Terminés')}</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--red)">${delayed}</div><div class="stat-label">${L('متأخرة','En retard')}</div></div>
    </div>
    <div class="filter-bar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="${L('ابحث عن مشروع...','Rechercher un projet...')}" id="projSearch" oninput="filterProjects()" style="padding-right:.9rem">
      </div>
      <select class="form-select" id="projStatusFilter" onchange="filterProjects()" style="width:auto;min-width:130px">
        <option value="">${L('كل الحالات','Tous statuts')}</option>
        <option value="active">${L('نشط','Actif')}</option>
        <option value="completed">${L('مكتمل','Terminé')}</option>
        <option value="delayed">${L('متأخر','En retard')}</option>
        <option value="paused">${L('متوقف','Pausé')}</option>
      </select>
      <select class="form-select" id="projWilayaFilter" onchange="filterProjects()" style="width:auto;min-width:130px">
        <option value="">${L('كل الولايات','Toutes wilayas')}</option>
        ${[...new Set(projects.map(p=>p.wilaya).filter(Boolean))].map(w=>`<option>${w}</option>`).join('')}
      </select>
      <select class="form-select" id="projTypeFilter" onchange="filterProjects()" style="width:auto;min-width:160px">
        <option value="">${L('كل أنواع المشاريع','Tous types')}</option>
        ${PROJECT_TYPES.map(t=>`<option value="${t.value}">${t.label}</option>`).join('')}
      </select>
    </div>
    <div class="grid-cards" id="projGrid">${cards}</div>
    <div class="modal-overlay" id="addProjectModal">
      <div class="modal modal-lg">
        <div class="modal-title">🏗️ ${L('إضافة مشروع جديد','Ajouter un projet')}</div>
        <div class="form-group"><label class="form-label">${L('نوع المشروع *','Type de projet *')}</label><select class="form-select" id="pType"><option value="">${L('اختر نوع المشروع...','Choisir un type...')}</option>${PROJECT_TYPES.map(t=>`<option value="${t.value}">${t.label}</option>`).join('')}</select></div>
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">${L('اسم المشروع *','Nom du projet *')}</label><input class="form-input" id="pName" placeholder="${L('اسم المشروع...','Construction...')}"></div>
          <div class="form-group"><label class="form-label">${L('الولاية','Wilaya')}</label><select class="form-select" id="pWilaya"><option value="">${L('اختر...','Choisir...')}</option>${WILAYAS.map(w=>`<option>${w}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">${L('اسم العميل','Nom client')}</label><input class="form-input" id="pClient" placeholder="${L('عبد القادر...','Client...')}"></div>
          <div class="form-group"><label class="form-label">${L('هاتف العميل','Tél. client')}</label><input class="form-input" id="pPhone" placeholder="0550..."></div>
          <div class="form-group"><label class="form-label">${L('الميزانية (دج)','Budget (DA)')}</label><input class="form-input" id="pBudget" type="number" placeholder="0"></div>
          <div class="form-group"><label class="form-label">${L('المرحلة الحالية','Phase actuelle')}</label><select class="form-select" id="pPhase"><option value="">${L('اختر...','Choisir...')}</option>${PHASES.map(ph=>`<option>${ph}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">${L('تاريخ البداية','Date début')}</label><input class="form-input" id="pStart" type="date"></div>
          <div class="form-group"><label class="form-label">${L('تاريخ الانتهاء','Date fin')}</label><input class="form-input" id="pEnd" type="date"></div>
        </div>
        <div class="form-group"><label class="form-label">${L('الوصف','Description')}</label><textarea class="form-textarea" id="pDesc"></textarea></div>
        <div class="form-group"><label class="form-label">${L('اللون','Couleur')}</label><input type="hidden" id="pColor" value="#4A90E2"><div class="color-options">${COLORS.map((c,i)=>`<div class="color-option${i===0?' selected':''}" style="background:${c}" data-color="${c}" data-target="pColor"></div>`).join('')}</div></div>
        <div class="modal-footer"><button class="btn btn-ghost" data-modal-close>${L('إلغاء','Annuler')}</button><button class="btn btn-gold" onclick="addProject()">💾 ${L('حفظ المشروع','Enregistrer')}</button></div>
      </div>
    </div>
    <div class="modal-overlay" id="editProjectModal">
      <div class="modal modal-lg">
        <div class="modal-title">✏️ ${L('تعديل المشروع','Modifier le projet')}</div><input type="hidden" id="epId">
        <div class="form-group"><label class="form-label">${L('نوع المشروع','Type de projet')}</label><select class="form-select" id="epType"><option value="">${L('اختر...','Choisir...')}</option>${PROJECT_TYPES.map(t=>`<option value="${t.value}">${t.label}</option>`).join('')}</select></div>
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">${L('اسم المشروع','Nom du projet')}</label><input class="form-input" id="epName"></div>
          <div class="form-group"><label class="form-label">${L('الولاية','Wilaya')}</label><select class="form-select" id="epWilaya"><option value="">${L('اختر...','Choisir...')}</option>${WILAYAS.map(w=>`<option>${w}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">${L('الحالة','Statut')}</label><select class="form-select" id="epStatus">
            <option value="active">${L('نشط','Actif')}</option>
            <option value="completed">${L('مكتمل','Terminé')}</option>
            <option value="delayed">${L('متأخر','En retard')}</option>
            <option value="paused">${L('متوقف','Pausé')}</option>
          </select></div>
          <div class="form-group"><label class="form-label">${L('التقدم %','Avancement %')}</label><input class="form-input" id="epProgress" type="number" min="0" max="100"></div>
          <div class="form-group"><label class="form-label">${L('الميزانية (دج)','Budget (DA)')}</label><input class="form-input" id="epBudget" type="number"></div>
          <div class="form-group"><label class="form-label">${L('المرحلة','Phase')}</label><select class="form-select" id="epPhase"><option value="">${L('اختر...','Choisir...')}</option>${PHASES.map(ph=>`<option>${ph}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">${L('اسم العميل','Nom client')}</label><input class="form-input" id="epClient"></div>
          <div class="form-group"><label class="form-label">${L('تاريخ الانتهاء','Date fin')}</label><input class="form-input" id="epEnd" type="date"></div>
        </div>
        <div class="modal-footer"><button class="btn btn-ghost" data-modal-close>${L('إلغاء','Annuler')}</button><button class="btn btn-gold" onclick="saveProject()">💾 ${L('حفظ التعديلات','Enregistrer')}</button></div>
      </div>
    </div>
  `);
};

/* ─── WORKERS ─── */
/* ══════════════════════════════════════════════════════
   ☁️  SYNC STATUS UI — مؤشر المزامنة التلقائية
══════════════════════════════════════════════════════ */

// حقن CSS الخاص بالـ syncPill
(function() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes syncPulse {
      0%,100% { opacity:1; transform:scale(1); }
      50%      { opacity:.4; transform:scale(.75); }
    }
    @keyframes syncSpin {
      to { transform: rotate(360deg); }
    }
    #syncPill { user-select:none }
    #syncPill.syncing {
      background:rgba(232,184,75,.12)!important;
      border-color:rgba(232,184,75,.35)!important;
      color:#E8B84B!important;
    }
    #syncPill.error {
      background:rgba(240,78,106,.1)!important;
      border-color:rgba(240,78,106,.3)!important;
      color:#F04E6A!important;
    }
    #syncPill.offline {
      background:rgba(150,150,150,.1)!important;
      border-color:rgba(150,150,150,.25)!important;
      color:#888!important;
    }
  `;
  document.head.appendChild(style);
})();

/**
 * updateSyncPill(state, detail)
 * state: 'synced' | 'syncing' | 'error' | 'offline' | 'pending'
 */
function updateSyncPill(state, detail = '') {
  const isAr = typeof I18N !== 'undefined' ? I18N.currentLang === 'ar' : true;
  const pill  = document.getElementById('syncPill');
  const dot   = document.getElementById('syncDot');
  const label = document.getElementById('syncLabel');
  if (!pill || !dot || !label) return;

  pill.className = '';
  const states = {
    synced:  {
      cls:   '',
      color: '#34C38F',
      anim:  'syncPulse 2s infinite',
      txt:   isAr ? '✅ متزامن' : '✅ Synchronisé',
    },
    syncing: {
      cls:   'syncing',
      color: '#E8B84B',
      anim:  'syncPulse .6s infinite',
      txt:   isAr ? '⏫ جاري الرفع...' : '⏫ Envoi...',
    },
    pending: {
      cls:   'syncing',
      color: '#E8B84B',
      anim:  'syncPulse 1s infinite',
      txt:   isAr ? `⏳ ${detail||'في الانتظار'}` : `⏳ ${detail||'En attente'}`,
    },
    error: {
      cls:   'error',
      color: '#F04E6A',
      anim:  'none',
      txt:   isAr ? '❌ خطأ في الرفع' : '❌ Erreur sync',
    },
    offline: {
      cls:   'offline',
      color: '#888',
      anim:  'none',
      txt:   isAr ? '📵 غير متصل' : '📵 Hors ligne',
    },
  };
  const cfg = states[state] || states.synced;

  pill.classList.add(cfg.cls);
  dot.style.background  = cfg.color;
  dot.style.animation   = cfg.anim;
  label.textContent     = cfg.txt;
}

// ── تحديث الـ pill عند أي حدث sync ──
document.addEventListener('smartsync', function(e) {
  const { state, detail } = e.detail || {};
  updateSyncPill(state, detail);
  // إخفاء حالة syncing بعد ثانيتين والرجوع لـ synced
  if (state === 'syncing') {
    clearTimeout(window._syncResetTimer);
    window._syncResetTimer = setTimeout(() => {
      const count = (typeof DBHybrid !== 'undefined') ? DBHybrid.getOfflineQueueCount?.() || 0 : 0;
      updateSyncPill(count > 0 ? 'pending' : 'synced', count > 0 ? (I18N.currentLang==='ar'?`${count} عملية معلقة`:`${count} en attente`) : '');
    }, 2000);
  }
});

// ── مراقبة حالة الشبكة ──
window.addEventListener('online',  () => updateSyncPill('syncing'));
window.addEventListener('offline', () => updateSyncPill('offline'));

// ── تحديث دوري كل 5 ثوانٍ ──
setInterval(() => {
  if (!navigator.onLine) { updateSyncPill('offline'); return; }
  const count = (typeof DBHybrid !== 'undefined' && DBHybrid.getOfflineQueueCount)
    ? DBHybrid.getOfflineQueueCount() : 0;
  const isAr = typeof I18N !== 'undefined' ? I18N.currentLang === 'ar' : true;
  if (count > 0) {
    updateSyncPill('pending', isAr ? `${count} عملية معلقة` : `${count} en attente`);
  } else {
    updateSyncPill('synced');
  }
}, 5000);


/* ══════════════════════════════════════════════════════
   🖨️  SMART PRINT ENGINE — محرك الطباعة الاحترافي
   يُستخدم من جميع الصفحات: عمال، حضور، رواتب، معاملات، مخزون، معدات
══════════════════════════════════════════════════════ */
function smartPrint({ title, subtitle, icon, columns, rows, summaryRows = [], notes = '' }) {
  const isAr   = I18N.currentLang === 'ar';
  const dir     = isAr ? 'rtl' : 'ltr';
  const tenant  = Auth.getTenant();
  const logo    = getTenantLogo();
  const today   = new Date().toLocaleDateString(isAr ? 'ar-DZ' : 'fr-DZ', { dateStyle: 'full' });
  const now     = new Date().toLocaleTimeString(isAr ? 'ar-DZ' : 'fr-DZ', { hour: '2-digit', minute: '2-digit' });

  const logoHTML = logo
    ? `<img src="${logo}" style="height:52px;max-width:140px;object-fit:contain;border-radius:4px;background:#fff;padding:3px">`
    : `<div style="font-size:1.1rem;font-weight:900;color:#E8B84B;letter-spacing:.5px">▦ SmartStruct</div>`;

  const thCells = columns.map(c =>
    `<th style="padding:9px 12px;font-size:10px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#E8B84B;text-align:${c.align||'right'}">${c.label}</th>`
  ).join('');

  const tbRows = rows.map((row, i) => {
    const cells = columns.map(c =>
      `<td style="padding:9px 12px;font-size:12px;text-align:${c.align||'right'};${c.style||''}">${row[c.key] ?? '—'}</td>`
    ).join('');
    return `<tr style="background:${i%2===0?'#fafafa':'#fff'};border-bottom:1px solid #f0f0f0">${cells}</tr>`;
  }).join('');

  const summaryHTML = summaryRows.length ? `
    <div style="display:flex;justify-content:flex-end;margin-top:20px">
      <div style="min-width:260px">
        ${summaryRows.map((s,i) => i === summaryRows.length-1
          ? `<div style="display:flex;justify-content:space-between;background:#141414;color:#E8B84B;padding:10px 14px;border-radius:6px;font-weight:900;font-size:14px;margin-top:6px">
               <span>${s.label}</span><span>${s.value}</span></div>`
          : `<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:12px;color:#555;border-bottom:1px solid #f4f4f4">
               <span>${s.label}</span><span style="font-weight:600">${s.value}</span></div>`
        ).join('')}
      </div>
    </div>` : '';

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${isAr?'ar':'fr'}">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Cairo',Arial,sans-serif;background:#f4f4f6;color:#1a1a1a;padding:24px}
  .no-print{display:flex;gap:10px;margin-bottom:20px}
  .btn-p{padding:9px 22px;background:#E8B84B;color:#1a1000;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700}
  .btn-c{padding:9px 18px;background:#2a2a2a;color:#ccc;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px}
  .sheet{background:#fff;max-width:900px;margin:0 auto;border-radius:4px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.12)}
  .hdr{background:#141414;padding:22px 32px;display:flex;justify-content:space-between;align-items:center}
  .hdr-left{display:flex;align-items:center;gap:14px}
  .co-name{font-size:13px;font-weight:700;color:#fff;margin-top:4px}
  .co-sub{font-size:9.5px;color:#888;margin-top:2px}
  .doc-label{text-align:${isAr?'left':'right'}}
  .doc-title{font-size:20px;font-weight:900;color:#fff}
  .doc-sub{font-size:11px;color:#E8B84B;margin-top:4px;font-weight:600}
  .gold-bar{height:3px;background:linear-gradient(90deg,#C49030,#E8B84B,#C49030)}
  .meta{display:flex;justify-content:space-between;align-items:center;padding:14px 32px;border-bottom:1px solid #eee;background:#fafafa}
  .meta-item{font-size:11px;color:#888}
  .meta-item strong{color:#222;font-size:12px}
  .body{padding:24px 32px}
  .section-title{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#141414}
  tbody tr:last-child td{border-bottom:none}
  .footer{background:#141414;padding:10px 32px;display:flex;justify-content:space-between;align-items:center}
  .footer span{font-size:10px;color:#666}
  .footer .gld{color:#E8B84B;font-weight:700}
  .notes{margin-top:16px;padding:10px 14px;background:#fafafa;border-${isAr?'right':'left'}:3px solid #E8B84B;border-radius:0 4px 4px 0;font-size:11px;color:#555;line-height:1.7}
  @media print{
    body{background:#fff;padding:0}
    .no-print{display:none!important}
    .sheet{box-shadow:none;border-radius:0;max-width:100%}
    thead tr{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .hdr,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .gold-bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style>
</head>
<body>
<div class="no-print">
  <button class="btn-p" onclick="window.print()">🖨️ ${isAr?'طباعة':'Imprimer'}</button>
  <button class="btn-c" onclick="window.close()">${isAr?'إغلاق':'Fermer'}</button>
</div>
<div class="sheet">
  <div class="hdr">
    <div class="hdr-left">
      ${logoHTML}
      <div>
        <div class="co-name">${escHtml(tenant?.name||'SmartStruct')}</div>
        ${tenant?.nif?`<div class="co-sub">NIF: ${escHtml(tenant.nif)}</div>`:''}
        ${tenant?.address?`<div class="co-sub">📍 ${escHtml(tenant.address)}</div>`:''}
      </div>
    </div>
    <div class="doc-label">
      <div class="doc-title">${icon} ${title}</div>
      ${subtitle?`<div class="doc-sub">${subtitle}</div>`:''}
    </div>
  </div>
  <div class="gold-bar"></div>
  <div class="meta">
    <div class="meta-item">${isAr?'تاريخ الطباعة':'Date d\'impression'}: <strong>${today} — ${now}</strong></div>
    <div class="meta-item">${isAr?'عدد السجلات':'Nombre de lignes'}: <strong>${rows.length}</strong></div>
    <div class="meta-item">SmartStruct v7.2 Pro</div>
  </div>
  <div class="body">
    <div class="section-title">${isAr?'قائمة البيانات':'Liste des données'}</div>
    <table>
      <thead><tr>${thCells}</tr></thead>
      <tbody>${tbRows}</tbody>
    </table>
    ${summaryHTML}
    ${notes?`<div class="notes"><strong>${isAr?'ملاحظات:':'Notes :'}</strong> ${notes}</div>`:''}
  </div>
  <div class="footer">
    <span>SmartStruct — ${isAr?'منصة إدارة مشاريع المقاولة الجزائرية':'Plateforme algérienne de gestion BTP'}</span>
    <span class="gld">${title} — ${today}</span>
  </div>
</div>
</body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

/* ── دوال الطباعة لكل صفحة ── */

function printWorkers() {
  const isAr = I18N.currentLang === 'ar';
  const tid = Auth.getUser().tenant_id;
  const workers = DB.get('workers').filter(w=>w.tenant_id===tid);
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid);
  const contractLabels = {
    daily:    isAr?'يومي':'Journalier',
    monthly:  isAr?'شهري':'Mensuel',
    seasonal: isAr?'موسمي':'Saisonnier',
    contract: isAr?'مقاول':'Sous-traitant'
  };
  smartPrint({
    title:    isAr ? 'قائمة العمال' : 'Liste des Ouvriers',
    subtitle: `${workers.length} ${isAr?'عامل مسجل':'ouvrier(s) enregistré(s)'}`,
    icon:     '👷',
    columns: [
      { key:'name',     label: isAr?'الاسم الكامل':'Nom complet',    align: isAr?'right':'left' },
      { key:'role',     label: isAr?'المهنة':'Métier',               align: isAr?'right':'left' },
      { key:'contract', label: isAr?'العقد':'Contrat',               align: 'center' },
      { key:'project',  label: isAr?'المشروع':'Projet',              align: isAr?'right':'left' },
      { key:'salary',   label: isAr?'الأجر اليومي (دج)':'Salaire/j (DA)', align: 'center' },
      { key:'phone',    label: isAr?'الهاتف':'Téléphone',            align: 'center' },
      { key:'hire',     label: isAr?'تاريخ التعيين':'Date embauche', align: 'center' },
    ],
    rows: workers.map(w => ({
      name:     w.full_name,
      role:     w.role,
      contract: contractLabels[w.contract_type] || w.contract_type,
      project:  projects.find(p=>p.id===w.project_id)?.name || '—',
      salary:   `${Number(w.daily_salary).toLocaleString('fr-DZ')} ${isAr?'دج':'DA'}`,
      phone:    w.phone || '—',
      hire:     fmtDate(w.hire_date),
    })),
    summaryRows: [
      { label: isAr?'إجمالي العمال':'Total ouvriers',       value: workers.length },
      { label: isAr?'يومي':'Journaliers',                   value: workers.filter(w=>w.contract_type==='daily').length },
      { label: isAr?'شهري':'Mensuels',                      value: workers.filter(w=>w.contract_type==='monthly').length },
      { label: isAr?'مجموع الأجور اليومية (دج)':'Total salaires/j (DA)',
        value: `${workers.reduce((s,w)=>s+Number(w.daily_salary||0),0).toLocaleString('fr-DZ')} ${isAr?'دج':'DA'}` },
    ],
  });
}

function printAttendance() {
  const isAr = I18N.currentLang === 'ar';
  const tid = Auth.getUser().tenant_id;
  const workers = DB.get('workers').filter(w=>w.tenant_id===tid);
  const att = DB.get('attendance').filter(a=>a.tenant_id===tid);
  const selDate = sessionStorage.getItem('att_date') || todayStr();
  const dayAtt = att.filter(a=>a.date===selDate);
  const dateLabel = new Date(selDate+'T12:00').toLocaleDateString(isAr?'ar-DZ':'fr-DZ',{dateStyle:'full'});
  const statusLabel = { present: isAr?'حاضر':'Présent', absent: isAr?'غائب':'Absent', late: isAr?'متأخر':'En retard', leave: isAr?'إجازة':'Congé' };
  const statusColor  = { present:'#0a6e3f', absent:'#c0392b', late:'#8a6000', leave:'#2563eb' };
  const rows = workers.map(w => {
    const rec = dayAtt.find(a=>a.worker_id===w.id);
    const st = rec?.status || 'absent';
    return {
      name:   w.full_name,
      role:   w.role,
      status: `<span style="padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${statusColor[st]}22;color:${statusColor[st]}">${statusLabel[st]||st}</span>`,
      hours:  rec?.hours ? `${rec.hours}h` : '—',
      note:   rec?.note || '—',
    };
  });
  const present = dayAtt.filter(a=>a.status==='present').length;
  const absent  = workers.length - present;
  smartPrint({
    title:    isAr ? 'سجل الحضور والغياب' : 'Registre de Présence',
    subtitle: dateLabel,
    icon:     '📅',
    columns: [
      { key:'name',   label: isAr?'العامل':'Ouvrier',   align: isAr?'right':'left' },
      { key:'role',   label: isAr?'المهنة':'Métier',    align: isAr?'right':'left' },
      { key:'status', label: isAr?'الحالة':'Statut',    align: 'center' },
      { key:'hours',  label: isAr?'الساعات':'Heures',   align: 'center' },
      { key:'note',   label: isAr?'ملاحظة':'Note',      align: isAr?'right':'left' },
    ],
    rows,
    summaryRows: [
      { label: isAr?'الحضور':'Présents',   value: present },
      { label: isAr?'الغياب':'Absents',    value: absent  },
      { label: isAr?'نسبة الحضور':'Taux de présence', value: `${workers.length?Math.round(present/workers.length*100):0}%` },
    ],
    notes: isAr ? `تاريخ الطباعة يوم: ${dateLabel}` : `Feuille du : ${dateLabel}`,
  });
}

function printSalary() {
  const isAr = I18N.currentLang === 'ar';
  const tid = Auth.getUser().tenant_id;
  const workers = DB.get('workers').filter(w=>w.tenant_id===tid);
  const selectedMonthKey = sessionStorage.getItem('salary_month') || new Date().toISOString().slice(0,7);
  const salaryRecs = DB.get('salary_records').filter(s=>s.tenant_id===tid && s.month_key===selectedMonthKey);
  const monthLabel = new Date(selectedMonthKey+'-15').toLocaleDateString(isAr?'ar-DZ':'fr-DZ',{month:'long',year:'numeric'});
  const rows = workers.map(w => {
    const rec = salaryRecs.find(s=>s.worker_id===w.id);
    const paid = !!rec;
    return {
      name:   w.full_name,
      role:   w.role,
      base:   `${Number(w.monthly_base||w.daily_salary*26||0).toLocaleString('fr-DZ')} ${isAr?'دج':'DA'}`,
      amount: rec ? `${Number(rec.amount).toLocaleString('fr-DZ')} ${isAr?'دج':'DA'}` : '—',
      status: `<span style="padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${paid?'#d4f5e2':'#fff8e1'};color:${paid?'#0a6e3f':'#8a6000'}">${paid?(isAr?'✅ مدفوع':'✅ Payé'):(isAr?'⏳ معلق':'⏳ En attente')}</span>`,
      date:   rec?.paid_date ? fmtDate(rec.paid_date) : '—',
    };
  });
  const totalPaid = salaryRecs.reduce((s,r)=>s+Number(r.amount||0),0);
  smartPrint({
    title:    isAr ? 'كشف الرواتب' : 'Fiche de Paie',
    subtitle: monthLabel,
    icon:     '💵',
    columns: [
      { key:'name',   label: isAr?'العامل':'Ouvrier',           align: isAr?'right':'left' },
      { key:'role',   label: isAr?'المهنة':'Métier',            align: isAr?'right':'left' },
      { key:'base',   label: isAr?'الراتب الأساسي':'Salaire base', align: 'center' },
      { key:'amount', label: isAr?'المبلغ المصروف':'Montant versé', align: 'center' },
      { key:'status', label: isAr?'الحالة':'Statut',            align: 'center' },
      { key:'date',   label: isAr?'تاريخ الصرف':'Date versement', align: 'center' },
    ],
    rows,
    summaryRows: [
      { label: isAr?'إجمالي العمال':'Total ouvriers',   value: workers.length },
      { label: isAr?'تم الصرف':'Payés',                value: salaryRecs.length },
      { label: isAr?'إجمالي المصروف (دج)':'Total versé (DA)', value: `${totalPaid.toLocaleString('fr-DZ')} ${isAr?'دج':'DA'}` },
    ],
    notes: isAr ? `كشف رواتب شهر: ${monthLabel}` : `Bulletin de salaire — ${monthLabel}`,
  });
}

function printTransactions() {
  const isAr = I18N.currentLang === 'ar';
  const tid = Auth.getUser().tenant_id;
  const txs = DB.get('transactions').filter(t=>t.tenant_id===tid);
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid);
  const sorted = [...txs].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const revenue = txs.filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  const balance = revenue - expense;
  smartPrint({
    title:    isAr ? 'المعاملات المالية' : 'Transactions Financières',
    subtitle: `${txs.length} ${isAr?'معاملة':'transaction(s)'}`,
    icon:     '💰',
    columns: [
      { key:'date',    label: isAr?'التاريخ':'Date',          align: 'center' },
      { key:'type',    label: isAr?'النوع':'Type',            align: 'center' },
      { key:'desc',    label: isAr?'البيان':'Description',    align: isAr?'right':'left' },
      { key:'cat',     label: isAr?'الفئة':'Catégorie',       align: isAr?'right':'left' },
      { key:'project', label: isAr?'المشروع':'Projet',        align: isAr?'right':'left' },
      { key:'amount',  label: isAr?'المبلغ (دج)':'Montant (DA)', align: 'center' },
    ],
    rows: sorted.map(t => ({
      date:    fmtDate(t.date),
      type:    `<span style="padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${t.type==='revenue'?'#d4f5e2':'#fde8e8'};color:${t.type==='revenue'?'#0a6e3f':'#c0392b'}">${t.type==='revenue'?(isAr?'إيراد':'Revenu'):(isAr?'مصروف':'Dépense')}</span>`,
      desc:    t.description,
      cat:     t.category || '—',
      project: projects.find(p=>p.id===t.project_id)?.name || '—',
      amount:  `<span style="font-weight:700;color:${t.type==='revenue'?'#0a6e3f':'#c0392b'}">${t.type==='revenue'?'+':'-'}${Number(t.amount).toLocaleString('fr-DZ')}</span>`,
    })),
    summaryRows: [
      { label: isAr?'إجمالي الإيرادات':'Total revenus',  value: `${revenue.toLocaleString('fr-DZ')} ${isAr?'دج':'DA'}` },
      { label: isAr?'إجمالي المصاريف':'Total dépenses',  value: `${expense.toLocaleString('fr-DZ')} ${isAr?'دج':'DA'}` },
      { label: isAr?'الرصيد الصافي':'Solde net',          value: `${balance.toLocaleString('fr-DZ')} ${isAr?'دج':'DA'}` },
    ],
  });
}

function printInventory() {
  const isAr = I18N.currentLang === 'ar';
  const tid = Auth.getUser().tenant_id;
  const materials = DB.get('materials').filter(m=>m.tenant_id===tid);
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid);
  const totalVal = materials.reduce((s,m)=>s+Number(m.quantity||0)*Number(m.unit_price||0),0);
  smartPrint({
    title:    isAr ? 'جرد المخزون' : 'État des Stocks',
    subtitle: `${materials.length} ${isAr?'مادة مسجلة':'matériau(x) enregistré(s)'}`,
    icon:     '📦',
    columns: [
      { key:'name',    label: isAr?'المادة':'Matériau',         align: isAr?'right':'left' },
      { key:'unit',    label: isAr?'الوحدة':'Unité',            align: 'center' },
      { key:'qty',     label: isAr?'الكمية':'Quantité',         align: 'center' },
      { key:'min',     label: isAr?'الحد الأدنى':'Seuil min',   align: 'center' },
      { key:'uprice',  label: isAr?'سعر الوحدة (دج)':'Prix unit. (DA)', align: 'center' },
      { key:'total',   label: isAr?'القيمة الإجمالية (دج)':'Valeur totale (DA)', align: 'center' },
      { key:'status',  label: isAr?'الحالة':'Statut',           align: 'center' },
      { key:'project', label: isAr?'المشروع':'Projet',          align: isAr?'right':'left' },
    ],
    rows: materials.map(m => {
      const isLow = m.quantity <= m.min_quantity;
      return {
        name:    m.name,
        unit:    m.unit || '—',
        qty:     m.quantity,
        min:     m.min_quantity || '—',
        uprice:  Number(m.unit_price||0).toLocaleString('fr-DZ'),
        total:   `${(Number(m.quantity||0)*Number(m.unit_price||0)).toLocaleString('fr-DZ')} ${isAr?'دج':'DA'}`,
        status:  `<span style="padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${isLow?'#fde8e8':'#d4f5e2'};color:${isLow?'#c0392b':'#0a6e3f'}">${isLow?(isAr?'⚠️ نقص':'⚠️ Faible'):(isAr?'✅ كافي':'✅ OK')}</span>`,
        project: projects.find(p=>p.id===m.project_id)?.name || '—',
      };
    }),
    summaryRows: [
      { label: isAr?'إجمالي المواد':'Total matériaux',      value: materials.length },
      { label: isAr?'مواد ناقصة':'Matériaux en rupture',    value: materials.filter(m=>m.quantity<=m.min_quantity).length },
      { label: isAr?'القيمة الإجمالية للمخزون (دج)':'Valeur totale du stock (DA)', value: `${totalVal.toLocaleString('fr-DZ')} ${isAr?'دج':'DA'}` },
    ],
  });
}

function printEquipment() {
  const isAr = I18N.currentLang === 'ar';
  const tid = Auth.getUser().tenant_id;
  const equip = DB.get('equipment').filter(e=>e.tenant_id===tid);
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid);
  const statusLabel = { active: isAr?'نشط':'Actif', maintenance: isAr?'صيانة':'Maintenance', idle: isAr?'خامل':'Inactif' };
  const statusColor  = { active:'#0a6e3f', maintenance:'#8a6000', idle:'#555' };
  const totalVal = equip.reduce((s,e)=>s+Number(e.purchase_price||0),0);
  smartPrint({
    title:    isAr ? 'قائمة المعدات' : 'Liste des Équipements',
    subtitle: `${equip.length} ${isAr?'معدة مسجلة':'équipement(s) enregistré(s)'}`,
    icon:     '🚜',
    columns: [
      { key:'icon',    label: '',                                  align: 'center', style:'width:36px' },
      { key:'name',    label: isAr?'المعدة':'Équipement',         align: isAr?'right':'left' },
      { key:'model',   label: isAr?'الموديل':'Modèle',           align: isAr?'right':'left' },
      { key:'plate',   label: isAr?'رقم اللوحة':'N° immatriculation', align: 'center' },
      { key:'status',  label: isAr?'الحالة':'État',              align: 'center' },
      { key:'project', label: isAr?'المشروع':'Chantier',         align: isAr?'right':'left' },
      { key:'price',   label: isAr?'قيمة الشراء (دج)':'Valeur achat (DA)', align: 'center' },
    ],
    rows: equip.map(e => {
      const st = e.status || 'idle';
      return {
        icon:    e.icon || '🚜',
        name:    e.name,
        model:   e.model || '—',
        plate:   e.plate_number || '—',
        status:  `<span style="padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${statusColor[st]}22;color:${statusColor[st]}">${statusLabel[st]||st}</span>`,
        project: projects.find(p=>p.id===e.project_id)?.name || '—',
        price:   `${Number(e.purchase_price||0).toLocaleString('fr-DZ')} ${isAr?'دج':'DA'}`,
      };
    }),
    summaryRows: [
      { label: isAr?'نشط':'Actif',           value: equip.filter(e=>e.status==='active').length },
      { label: isAr?'صيانة':'Maintenance',   value: equip.filter(e=>e.status==='maintenance').length },
      { label: isAr?'إجمالي القيمة (دج)':'Valeur totale (DA)', value: `${totalVal.toLocaleString('fr-DZ')} ${isAr?'دج':'DA'}` },
    ],
  });
}


Pages.workers = function() {
  const tid = Auth.getUser().tenant_id;
  const workers  = DB.get('workers').filter(w=>w.tenant_id===tid);
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid && !p.is_archived);
  const plan = Auth.getPlan();
  const maxW = plan?.max_workers||-1;
  const pct = maxW>0?Math.min(Math.round(workers.length/maxW*100),100):0;
  const contractLabels = {daily:L('يومي','Journalier'),monthly:L('شهري','Mensuel'),seasonal:L('موسمي','Saisonnier'),contract:L('مقاول','Sous-traitant')};
  const rows = workers.map(w=>{
    const proj=projects.find(p=>p.id===w.project_id);
    const typeLabel=contractLabels[w.contract_type]||w.contract_type;
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:.7rem"><div style="width:36px;height:36px;border-radius:50%;background:${w.color||'#4A90E2'};display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:.8rem">${(w.full_name||'?')[0]}</div><div><div style="font-weight:700">${escHtml(w.full_name)}</div><div style="font-size:.72rem;color:var(--dim)">📞 ${escHtml(w.phone||'')}</div></div></div></td>
      <td>${escHtml(w.role)}</td>
      <td style="color:var(--dim);font-size:.82rem">${escHtml(proj?.name||'—')}</td>
      <td><span style="font-weight:700;font-family:monospace">${fmt(w.daily_salary)}</span> <span style="font-size:.72rem;color:var(--dim)">${L('دج','DA')}</span></td>
      <td><span class="badge" style="background:rgba(74,144,226,.1);color:#60A5FA;border:1px solid rgba(74,144,226,.2)">${typeLabel}</span></td>
      <td style="color:var(--dim);font-size:.82rem">${fmtDate(w.hire_date)}</td>
      <td><div style="display:flex;gap:.3rem;flex-wrap:wrap">
        <div style="position:relative;display:inline-block" class="dz-dd">
          <button class="btn btn-blue btn-sm" onclick="toggleWorkerDocs(${w.id}, event)" title="${L('وثائق العامل','Documents')}">📄 ${L('وثائق','Docs')} ▾</button>
          <div id="wDocs${w.id}" class="dz-dd-menu" style="display:none;position:absolute;top:100%;${I18N.currentLang==='ar'?'right':'left'}:0;margin-top:4px;background:var(--card-bg,#0e1720);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.4);min-width:200px;z-index:100;padding:.3rem">
            <button class="dz-dd-item" onclick="DZDocsUI.openForWorker('cdd',${w.id})">📝 ${L('عقد CDD محدد المدة','Contrat CDD')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.openForWorker('cta',${w.id})">🤝 ${L('عقد CTA مدعم','Contrat CTA')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.openForWorker('cdi',${w.id})">🔒 ${L('عقد CDI دائم','Contrat CDI')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.openForWorker('attestation',${w.id})">📄 ${L('شهادة عمل','Attestation travail')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.openForWorker('paie',${w.id})">💼 ${L('كشف راتب','Bulletin paie')}</button>
          </div>
        </div>
        <button class="btn btn-blue btn-sm" onclick="editWorker(${w.id})">✏️</button>
        <button class="btn btn-red btn-sm" onclick="deleteWorker(${w.id},'${escHtml(w.full_name)}')">🗑️</button>
      </div></td>
    </tr>`;
  }).join('');

  return layoutHTML('workers',L('العمال','Ouvriers'),`
    <div class="page-header">
      <div><div class="page-title">👷 ${L('العمال','Ouvriers')}</div><div class="page-sub">${workers.length} ${L('عامل','ouvrier(s)')}</div></div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="exportWorkers()">📥 ${L('تصدير CSV','Exporter CSV')}</button>
        <button class="btn btn-ghost btn-sm" onclick="printWorkers()">🖨️ ${L('طباعة PDF','Imprimer PDF')}</button>
        <button class="btn btn-gold" data-modal-open="addWorkerModal">+ ${L('إضافة عامل','Ajouter ouvrier')}</button>
      </div>
    </div>
    ${maxW>0?`<div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:var(--radius);padding:.85rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:1rem">
      <span style="font-size:.78rem;color:var(--muted);font-weight:700;white-space:nowrap">${L('الطاقة الاستيعابية:','Capacité :')}</span>
      <div style="flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden"><div style="height:100%;border-radius:3px;background:${pct>=90?'var(--red)':pct>=70?'var(--gold)':'var(--green)'};width:${pct}%"></div></div>
      <span style="font-size:.76rem;color:var(--dim);font-family:monospace">${workers.length}/${maxW}</span></div>`:''}
    ${workers.length?`<div class="table-wrap"><table>
      <thead><tr><th>${L('العامل','Ouvrier')}</th><th>${L('المهنة','Métier')}</th><th>${L('المشروع','Projet')}</th><th>${L('الأجر اليومي','Salaire/j')}</th><th>${L('العقد','Contrat')}</th><th>${L('التعيين','Embauche')}</th><th>${L('إجراءات','Actions')}</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`:`<div class="empty"><div class="empty-icon">👷</div><div class="empty-title">${L('لا يوجد عمال','Aucun ouvrier')}</div></div>`}
    <div class="modal-overlay" id="addWorkerModal">
      <div class="modal">
        <div class="modal-title">👷 ${L('إضافة عامل جديد','Ajouter un ouvrier')}</div>
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">${L('الاسم الكامل *','Nom complet *')}</label><input class="form-input" id="wName" placeholder="${L('محمد الأمين...','Prénom Nom...')}"></div>
          <div class="form-group"><label class="form-label">${L('المهنة *','Métier *')}</label><input class="form-input" id="wRole" placeholder="${L('بنّاء، حداد...','Maçon, Ferrailleur...')}"></div>
          <div class="form-group"><label class="form-label">${L('الهاتف','Téléphone')}</label><input class="form-input" id="wPhone" placeholder="0550..."></div>
          <div class="form-group"><label class="form-label">${L('رقم الهوية','N° identité')}</label><input class="form-input" id="wNid"></div>
          <div class="form-group"><label class="form-label">${L('الأجر اليومي (دج)','Salaire/j (DA)')}</label><input class="form-input" id="wSalary" type="number" placeholder="3000"></div>
          <div class="form-group"><label class="form-label">${L('نوع العقد','Type contrat')}</label><select class="form-select" id="wContract">
            <option value="daily">${L('يومي','Journalier')}</option>
            <option value="monthly">${L('شهري','Mensuel')}</option>
            <option value="seasonal">${L('موسمي','Saisonnier')}</option>
            <option value="contract">${L('مقاول','Sous-traitant')}</option>
          </select></div>
          <div class="form-group"><label class="form-label">${L('المشروع','Projet')}</label><select class="form-select" id="wProject"><option value="">${L('بدون مشروع','Sans projet')}</option>${projects.map(p=>`<option value="${p.id}">${escHtml(p.name)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">${L('تاريخ التعيين','Date embauche')}</label><input class="form-input" id="wHire" type="date"></div>
        </div>
        <div class="form-group"><label class="form-label">${L('اللون','Couleur')}</label><input type="hidden" id="wColor" value="#4A90E2"><div class="color-options">${COLORS.map((c,i)=>`<div class="color-option${i===0?' selected':''}" style="background:${c}" data-color="${c}" data-target="wColor"></div>`).join('')}</div></div>
        <div class="modal-footer"><button class="btn btn-ghost" data-modal-close>${L('إلغاء','Annuler')}</button><button class="btn btn-gold" onclick="addWorker()">💾 ${L('حفظ','Enregistrer')}</button></div>
      </div>
    </div>
    <div class="modal-overlay" id="editWorkerModal">
      <div class="modal">
        <div class="modal-title">✏️ ${L('تعديل بيانات العامل','Modifier l\'ouvrier')}</div><input type="hidden" id="ewId">
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">${L('الاسم','Nom')}</label><input class="form-input" id="ewName"></div>
          <div class="form-group"><label class="form-label">${L('المهنة','Métier')}</label><input class="form-input" id="ewRole"></div>
          <div class="form-group"><label class="form-label">${L('الهاتف','Téléphone')}</label><input class="form-input" id="ewPhone"></div>
          <div class="form-group"><label class="form-label">${L('الأجر اليومي','Salaire/j')}</label><input class="form-input" id="ewSalary" type="number"></div>
          <div class="form-group"><label class="form-label">${L('نوع العقد','Type contrat')}</label><select class="form-select" id="ewContract">
            <option value="daily">${L('يومي','Journalier')}</option>
            <option value="monthly">${L('شهري','Mensuel')}</option>
            <option value="seasonal">${L('موسمي','Saisonnier')}</option>
            <option value="contract">${L('مقاول','Sous-traitant')}</option>
          </select></div>
          <div class="form-group"><label class="form-label">${L('المشروع','Projet')}</label><select class="form-select" id="ewProject"><option value="">${L('بدون مشروع','Sans projet')}</option>${projects.map(p=>`<option value="${p.id}">${escHtml(p.name)}</option>`).join('')}</select></div>
        </div>
        <div class="modal-footer"><button class="btn btn-ghost" data-modal-close>${L('إلغاء','Annuler')}</button><button class="btn btn-gold" onclick="saveWorker()">💾 ${L('حفظ','Enregistrer')}</button></div>
      </div>
    </div>
  `);
};

/* ─── EQUIPMENT ─── */
Pages.equipment = function() {
  const tid = Auth.getUser().tenant_id;
  const equip = DB.get('equipment').filter(e=>e.tenant_id===tid);
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid && !p.is_archived);
  const statusMap = { active:{label:L('نشط','Actif'),col:'var(--green)'}, maintenance:{label:L('صيانة','Maintenance'),col:'var(--gold)'}, idle:{label:L('خامل','Inactif'),col:'var(--dim)'} };
  const cards = equip.map(e=>{
    const proj=projects.find(p=>p.id===e.project_id);
    const st=statusMap[e.status]||statusMap.idle;
    return `<div class="card" style="position:relative">
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
        <div style="width:52px;height:52px;border-radius:14px;background:rgba(232,184,75,.1);border:1px solid rgba(232,184,75,.2);display:flex;align-items:center;justify-content:center;font-size:1.8rem">${e.icon||'🚜'}</div>
        <div><div style="font-weight:800">${escHtml(e.name)}</div><div style="font-size:.75rem;color:var(--dim)">${escHtml(e.model||'')}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:.78rem;margin-bottom:.8rem">
        <div><div style="color:var(--dim)">${L('المشروع','Projet')}</div><div style="font-weight:600">${escHtml(proj?.name||'—')}</div></div>
        <div><div style="color:var(--dim)">${L('رقم اللوحة','N° plaque')}</div><div style="font-weight:600;font-family:monospace;direction:ltr;text-align:right">${escHtml(e.plate_number||'—')}</div></div>
        <div><div style="color:var(--dim)">${L('قيمة الشراء','Valeur d\'achat')}</div><div style="font-weight:600;font-family:monospace">${fmt(e.purchase_price)} دج</div></div>
        <div><div style="color:var(--dim)">${L('الحالة','État')}</div>
          <select class="form-select" style="padding:.2rem .5rem;font-size:.75rem;margin-top:2px" onchange="updateEquipStatus(${e.id},this.value)">
            ${Object.entries(statusMap).map(([k,v])=>`<option value="${k}"${e.status===k?' selected':''}>${v.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:.4rem">
        <button class="btn btn-blue btn-sm" style="flex:1;justify-content:center" onclick="DZDocsUI.openForEquipment('suivi',${e.id})" title="${L('بطاقة تتبع PDF','Fiche suivi PDF')}">📄 ${L('بطاقة تتبع','Fiche suivi')}</button>
        <button class="btn btn-red btn-sm" onclick="deleteEquip(${e.id},'${escHtml(e.name)}')" title="${L('حذف','Suppr.')}">🗑️</button>
      </div>
    </div>`;
  }).join('')||`<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🚜</div><div class="empty-title">${L('لا توجد معدات','Aucun équipement')}</div></div>`;

  return layoutHTML('equipment',L('المعدات','Équipements'),`
    <div class="page-header">
      <div><div class="page-title">🚜 ${L('المعدات','Équipements')}</div><div class="page-sub">${equip.length} ${L('معدة مسجلة','équipement(s)')}</div></div>
      <div class="page-actions"><button class="btn btn-ghost btn-sm" onclick="printEquipment()">🖨️ ${L('طباعة PDF','Imprimer PDF')}</button><button class="btn btn-gold" data-modal-open="addEquipModal">+ ${L('إضافة معدة','Ajouter équipement')}</button></div>
    </div>
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card"><div class="stat-value" style="color:var(--green)">${equip.filter(e=>e.status==='active').length}</div><div class="stat-label">${L('نشط','Actif')}</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--gold)">${equip.filter(e=>e.status==='maintenance').length}</div><div class="stat-label">${L('صيانة','Maintenance')}</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--dim)">${equip.filter(e=>e.status==='idle').length}</div><div class="stat-label">${L('خامل','Inactif')}</div></div>
    </div>
    <div class="grid-cards">${cards}</div>
    <div class="modal-overlay" id="addEquipModal">
      <div class="modal">
        <div class="modal-title">🚜 ${L('إضافة معدة','Ajouter un équipement')}</div>
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">${L('الاسم *','Nom *')}</label><input class="form-input" id="eName" placeholder="${L('حفارة...','Pelle...')}"></div>
          <div class="form-group"><label class="form-label">${L('الطراز','Modèle')}</label><input class="form-input" id="eModel" placeholder="CAT 320"></div>
          <div class="form-group"><label class="form-label">${L('رقم اللوحة','N° plaque')}</label><input class="form-input" id="ePlate" dir="ltr"></div>
          <div class="form-group"><label class="form-label">${L('الأيقونة','Icône')}</label><select class="form-select" id="eIcon"><option>🚜</option><option>🚛</option><option>🏗️</option><option>🚧</option><option>⛏️</option></select></div>
          <div class="form-group"><label class="form-label">${L('قيمة الشراء (دج)','Valeur achat (DA)')}</label><input class="form-input" id="ePrice" type="number"></div>
          <div class="form-group"><label class="form-label">${L('المشروع','Projet')}</label><select class="form-select" id="eProject"><option value="">${L('اختر...','Choisir...')}</option>${projects.map(p=>`<option value="${p.id}">${escHtml(p.name)}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label class="form-label">${L('ملاحظات','Notes')}</label><textarea class="form-textarea" id="eNotes" style="min-height:60px"></textarea></div>
        <div class="modal-footer"><button class="btn btn-ghost" data-modal-close>${L('إلغاء','Annuler')}</button><button class="btn btn-gold" onclick="addEquip()">💾 ${L('حفظ','Enregistrer')}</button></div>
      </div>
    </div>
  `);
};

/* ─── TRANSACTIONS ─── */
Pages.transactions = function() {
  const tid = Auth.getUser().tenant_id;
  const txs = DB.get('transactions').filter(t=>t.tenant_id===tid);
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid && !p.is_archived);
  const revenue = txs.filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);

  const rows = [...txs].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t=>{
    const proj=projects.find(p=>p.id===t.project_id);
    return `<tr>
      <td style="color:var(--dim);font-size:.82rem">${fmtDate(t.date)}</td>
      <td><span class="badge ${t.type==='revenue'?'badge-revenue':'badge-expense'}">${t.type==='revenue'?L('إيراد','Revenu'):L('مصروف','Dépense')}</span></td>
      <td style="font-size:.84rem">${escHtml(t.description)}</td>
      <td style="font-size:.78rem;color:var(--dim)">${escHtml(t.category)}</td>
      <td style="font-family:monospace;font-weight:700;color:${t.type==='revenue'?'var(--green)':'var(--red)'}">${t.type==='revenue'?'+':'-'}${fmt(t.amount)}</td>
      <td style="font-size:.78rem;color:var(--dim)">${escHtml(proj?.name||'—')}</td>
      <td><button class="btn btn-red btn-sm" onclick="deleteTx(${t.id})">🗑️</button></td>
    </tr>`;
  }).join('');

  const RCATS_AR = ["دفعة عميل","دفعة مقدمة","دفعة مرحلية","استلام نهائي","إيراد آخر"];
  const ECATS_AR = [
    "مواد البناء","حديد تسليح","أسمنت","رمل وحصى","طوب وبلوك",
    "مواد كهربائية","كابلات وأسلاك","مواد السباكة","أنابيب وتوصيلات",
    "مواد التكييف","مواد الحدادة","مواد النجارة","مواد الأرضيات",
    "مواد الدهن","مواد العزل","مواد الطاقة الشمسية","مواد الطرق",
    "رواتب العمال","مستحقات المقاولين من الباطن",
    "اكراءات المعدات","وقود","صيانة المعدات","نقل ومواصلات","مصاريف إدارية","أخرى"
  ];
  const RCATS_FR = ["Acompte client","Avance","Paiement partiel","Réception finale","Autre revenu"];
  const ECATS_FR = [
    "Matériaux bâtiment","Fer à béton","Ciment","Sable et gravier","Brique/Bloc",
    "Matériaux électriques","Câbles et fils","Matériaux plomberie","Tuyaux et raccords",
    "Matériaux CVC","Matériaux métallerie","Matériaux menuiserie","Matériaux revêtement",
    "Matériaux peinture","Matériaux étanchéité","Matériaux solaire","Matériaux VRD",
    "Salaires","Sous-traitants",
    "Location engins","Carburant","Maintenance engins","Transport","Frais admin","Autres"
  ];
  const RCATS = I18N.currentLang==='ar' ? RCATS_AR : RCATS_FR;
  const ECATS = I18N.currentLang==='ar' ? ECATS_AR : ECATS_FR;

  return layoutHTML('transactions',L('المعاملات المالية','Transactions financières'),`
    <div class="page-header">
      <div><div class="page-title">💰 ${L('المعاملات المالية','Transactions financières')}</div><div class="page-sub">${txs.length} ${L('معاملة','transaction(s)')}</div></div>
      <div class="page-actions"><button class="btn btn-ghost btn-sm" onclick="printTransactions()">🖨️ ${L('طباعة PDF','Imprimer PDF')}</button><button class="btn btn-gold" data-modal-open="addTxModal">+ ${L('إضافة معاملة','Ajouter transaction')}</button></div>
    </div>
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card"><div class="stat-icon">📈</div><div class="stat-value" style="color:var(--green);font-size:1.1rem">${fmt(revenue)}</div><div class="stat-label">${L('الإيرادات (دج)','Revenus (DA)')}</div></div>
      <div class="stat-card"><div class="stat-icon">📉</div><div class="stat-value" style="color:var(--red);font-size:1.1rem">${fmt(expense)}</div><div class="stat-label">${L('المصاريف (دج)','Dépenses (DA)')}</div></div>
      <div class="stat-card"><div class="stat-icon">💹</div><div class="stat-value" style="color:${revenue-expense>=0?'var(--green)':'var(--red)'};font-size:1.1rem">${fmt(revenue-expense)}</div><div class="stat-label">${L('الربح الصافي (دج)','Bénéfice net (DA)')}</div></div>
    </div>
    ${txs.length?`<div class="table-wrap"><table>
      <thead><tr><th>${L('التاريخ','Date')}</th><th>${L('النوع','Type')}</th><th>${L('الوصف','Description')}</th><th>${L('الفئة','Catégorie')}</th><th>${L('المبلغ (دج)','Montant (DA)')}</th><th>${L('المشروع','Projet')}</th><th>${L('حذف','Suppr.')}</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`:`<div class="empty"><div class="empty-icon">💰</div><div class="empty-title">${L('لا توجد معاملات بعد','Aucune transaction')}</div></div>`}
    <div class="modal-overlay" id="addTxModal">
      <div class="modal">
        <div class="modal-title">💰 ${L('إضافة معاملة','Ajouter une transaction')}</div>
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">${L('النوع','Type')}</label><select class="form-select" id="txType" onchange="updateTxCats()"><option value="revenue">${L('إيراد','Revenu')}</option><option value="expense">${L('مصروف','Dépense')}</option></select></div>
          <div class="form-group"><label class="form-label">${L('الفئة','Catégorie')}</label><select class="form-select" id="txCat">${RCATS.map(c=>`<option>${c}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">${L('المبلغ (دج) *','Montant (DA) *')}</label><input class="form-input" id="txAmount" type="number" placeholder="0"></div>
          <div class="form-group"><label class="form-label">${L('التاريخ','Date')}</label><input class="form-input" id="txDate" type="date" value="${todayStr()}"></div>
          <div class="form-group"><label class="form-label">${L('المشروع','Projet')}</label><select class="form-select" id="txProject"><option value="">—</option>${projects.map(p=>`<option value="${p.id}">${escHtml(p.name)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">${L('طريقة الدفع','Mode paiement')}</label><select class="form-select" id="txPayment">
            <option value="cash">${L('نقدي','Espèces')}</option>
            <option value="bank">${L('تحويل بنكي','Virement')}</option>
            <option value="check">${L('شيك','Chèque')}</option>
          </select></div>
        </div>
        <div class="form-group"><label class="form-label">${L('الوصف *','Description *')}</label><input class="form-input" id="txDesc" placeholder="${L('وصف المعاملة...','Description...')}"></div>
        <div class="form-group"><label class="form-label">${L('المورد','Fournisseur')}</label><input class="form-input" id="txSupplier" placeholder="${L('اسم المورد...','Nom fournisseur...')}"></div>
        <div class="modal-footer"><button class="btn btn-ghost" data-modal-close>${L('إلغاء','Annuler')}</button><button class="btn btn-gold" onclick="addTx()">💾 ${L('حفظ','Enregistrer')}</button></div>
      </div>
    </div>
  `);
};

/* ─── ATTENDANCE ─── */
Pages.attendance = function() {
  const tid = Auth.getUser().tenant_id;
  const workers = DB.get('workers').filter(w => w.tenant_id === tid);
  const projects = DB.get('projects').filter(p => p.tenant_id === tid && !p.is_archived);
  const att = DB.get('attendance');
  const today = todayStr();

  // Selected date
  const selDate = sessionStorage.getItem('att_date') || today;
  const isToday = selDate === today;

  // Date navigation
  const selDateObj = new Date(selDate + 'T12:00:00');
  const dayName = selDateObj.toLocaleDateString('ar-DZ', {weekday:'long'});
  const fullDateLabel = selDateObj.toLocaleDateString('ar-DZ', {year:'numeric',month:'long',day:'numeric'});

  const prevDate = new Date(selDate + 'T12:00:00');
  prevDate.setDate(prevDate.getDate() - 1);
  const prevStr = prevDate.toISOString().split('T')[0];

  const nextDate = new Date(selDate + 'T12:00:00');
  nextDate.setDate(nextDate.getDate() + 1);
  const nextStr = nextDate.toISOString().split('T')[0];
  const canGoNext = nextStr <= today;

  const getAtt = (wid, date) => att.find(a => a.worker_id === wid && a.date === date);

  // Stats for selected day
  const dayAtt = att.filter(a => a.date === selDate && workers.find(w => w.id === a.worker_id));
  const presentCount = dayAtt.filter(a => a.status === 'present').length;
  const absentCount  = dayAtt.filter(a => a.status === 'absent').length;
  const halfdayCount = dayAtt.filter(a => a.status === 'halfday').length;
  const holidayCount = dayAtt.filter(a => a.status === 'holiday').length;
  const totalMarked  = dayAtt.length;
  const notMarked    = workers.length - totalMarked;

  // Day cost
  const dayCost = workers.reduce((s, w) => {
    const a = getAtt(w.id, selDate);
    if (!a || a.status === 'present') return s + Number(w.daily_salary || 0);
    if (a.status === 'halfday') return s + Number(w.daily_salary || 0) * 0.5;
    return s;
  }, 0);

  // Project filter
  const filterPid = Number(sessionStorage.getItem('att_proj') || 0);
  const filteredWorkers = filterPid ? workers.filter(w => w.project_id === filterPid) : workers;

  // Build worker rows - NO nested backticks, use string concatenation
  let rows = '';
  filteredWorkers.forEach(function(w) {
    const proj = projects.find(p => p.id === w.project_id);
    const a = getAtt(w.id, selDate);
    const status = a ? a.status : '';
    const note   = a ? (a.note || '') : '';
    const hours  = a ? (a.hours || 8) : 8;
    const salary = Number(w.daily_salary || 0);
    const earnedStr = status === 'present' ? fmt(salary) : status === 'halfday' ? fmt(salary * 0.5) : '0';
    const statusColors = {present:'var(--green)', absent:'var(--red)', halfday:'var(--gold)', holiday:'var(--blue)', '':'var(--dim)'};
    const statusLabels = {present:L('حاضر ✅','Présent ✅'), absent:L('غائب ❌','Absent ❌'), halfday:L('نصف يوم 🔶','Demi-journée 🔶'), holiday:L('إجازة 🏖️','Congé 🏖️'), '':L('لم يُسجَّل ⏳','Non noté ⏳')};
    const projBadge = proj
      ? '<span style="background:' + proj.color + '22;color:' + proj.color + ';padding:2px 8px;border-radius:20px;font-size:.72rem;font-weight:700">' + escHtml(proj.name) + '</span>'
      : '—';
    const hoursDisabled = (!status || status === 'absent' || status === 'holiday') ? ' disabled' : '';
    rows += '<tr id="attrow_' + w.id + '">';
    rows += '<td><div style="display:flex;align-items:center;gap:.7rem">';
    rows += '<div style="width:36px;height:36px;border-radius:50%;background:' + (w.color || '#4A90E2') + ';display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:.8rem;flex-shrink:0">' + (w.full_name||'?')[0] + '</div>';
    rows += '<div><div style="font-weight:700;font-size:.85rem">' + escHtml(w.full_name) + '</div>';
    rows += '<div style="font-size:.7rem;color:var(--dim)">' + escHtml(w.role||'') + '</div></div></div></td>';
    rows += '<td>' + projBadge + '</td>';
    rows += '<td><select class="form-select" style="padding:.35rem .7rem;font-size:.82rem;min-width:140px" id="att_' + w.id + '" onchange="saveAtt(' + w.id + ',\'' + selDate + '\',this.value)">';
    rows += '<option value=""' + (!status ? ' selected' : '') + '>'+L('⏳ لم يُسجَّل','⏳ Non noté')+'</option>';
    rows += '<option value="present"' + (status==='present'?' selected':'') + '>'+L('✅ حاضر','✅ Présent')+'</option>';
    rows += '<option value="absent"'  + (status==='absent' ?' selected':'') + '>'+L('❌ غائب','❌ Absent')+'</option>';
    rows += '<option value="halfday"' + (status==='halfday'?' selected':'') + '>'+L('🔶 نصف يوم','🔶 Demi-journée')+'</option>';
    rows += '<option value="holiday"' + (status==='holiday'?' selected':'') + '>'+L('🏖️ إجازة','🏖️ Congé')+'</option>';
    rows += '</select></td>';
    rows += '<td><input type="number" class="form-input" style="width:65px;padding:.3rem .5rem;font-size:.8rem;text-align:center" value="' + hours + '" min="1" max="12" id="hours_' + w.id + '" onchange="saveAttHours(' + w.id + ',\'' + selDate + '\',this.value)"' + hoursDisabled + '></td>';
    rows += '<td><input type="text" class="form-input" style="padding:.3rem .6rem;font-size:.78rem;min-width:110px" placeholder="' + L('ملاحظة...','Note...') + '" value="' + escHtml(note) + '" id="note_' + w.id + '" onblur="saveAttNote(' + w.id + ',\'' + selDate + '\',this.value)"></td>';
    rows += '<td style="color:' + (statusColors[status]||'var(--dim)') + ';font-weight:700;font-size:.8rem">' + (statusLabels[status]||statusLabels['']) + '</td>';
    rows += '<td style="font-family:monospace;font-size:.82rem;color:var(--gold);font-weight:700">' + earnedStr + ' '+L('دج','DA')+'</td>';
    rows += '</tr>';
  });

  // 30-day history bars - build as string, no nested backticks
  const last30days = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(today + 'T12:00:00');
    d.setDate(d.getDate() - 29 + i);
    last30days.push(d.toISOString().split('T')[0]);
  }
  let historyBars = '';
  last30days.forEach(function(d) {
    const dAtt = att.filter(a => a.date === d && workers.find(w => w.id === a.worker_id));
    const pPresent = dAtt.filter(a => a.status === 'present').length;
    const pct = workers.length ? Math.round(pPresent / workers.length * 100) : 0;
    const h = Math.max(8, Math.round(pct * 0.55));
    const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : 'var(--red)';
    const isSelected = d === selDate;
    const border = isSelected ? 'box-shadow:0 0 0 2px var(--gold);' : '';
    const w_ = isSelected ? '12px' : '8px';
    const dayNum = new Date(d + 'T12:00:00').getDate();
    const dow = new Date(d + 'T12:00:00').getDay();
    const label = (dow === 5 || dow === 6) ? '<div style="font-size:.5rem;color:var(--dim)">' + dayNum + '</div>' : '<div style="height:9px"></div>';
    historyBars += '<div title="' + d + ': ' + pPresent + '/' + workers.length + ' حاضر" onclick="sessionStorage.setItem(\'att_date\',\'' + d + '\');App.navigate(\'attendance\')" style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer">';
    historyBars += '<div style="width:' + w_ + ';height:' + h + 'px;background:' + color + ';border-radius:3px;' + border + '"></div>';
    historyBars += label + '</div>';
  });

  // Project filter options
  let projOpts = '<option value="0"' + (!filterPid?' selected':'') + '>كل المشاريع</option>';
  projects.forEach(function(p) {
    projOpts += '<option value="' + p.id + '"' + (filterPid===p.id?' selected':'') + '>' + escHtml(p.name) + '</option>';
  });

  // Today button (only if not already on today)
  const todayBtn = !isToday ? '<button class="btn btn-gold btn-sm" onclick="sessionStorage.setItem(\'att_date\',\'' + today + '\');App.navigate(\'attendance\')">اليوم</button>' : '';
  const nextBtn = canGoNext ? '<button class="btn btn-ghost btn-sm" onclick="sessionStorage.setItem(\'att_date\',\'' + nextStr + '\');App.navigate(\'attendance\')">التالي →</button>' : '';
  const warningBadge = notMarked > 0 ? ' <span style="font-size:.72rem;color:var(--gold);margin-right:.5rem">⚠️ ' + notMarked + ' لم يُسجَّلوا</span>' : '';

  const tableContent = filteredWorkers.length
    ? '<div class="table-wrap"><table><thead><tr><th>العامل</th><th>المشروع</th><th>الحالة</th><th>ساعات</th><th>ملاحظة</th><th>التسجيل</th><th>الأجر</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
    : '<div class="empty"><div class="empty-icon">📅</div><div class="empty-title">لا يوجد عمال</div><div class="empty-text">أضف عمالاً من صفحة العمال</div></div>';

  return layoutHTML('attendance', 'الحضور والغياب', `
    <div class="page-header">
      <div>
        <div class="page-title">📅 الحضور والغياب</div>
        <div class="page-sub">${dayName} — ${fullDateLabel} ${warningBadge}</div>
      </div>
      <div class="page-actions" style="flex-wrap:wrap;gap:.5rem">
        <button class="btn btn-ghost btn-sm" onclick="printAttendance()">🖨️ ${L('طباعة PDF','Imprimer PDF')}</button>
        <button class="btn btn-ghost btn-sm" onclick="sessionStorage.setItem('att_date','${prevStr}');App.navigate('attendance')">← السابق</button>
        ${todayBtn}
        ${nextBtn}
        <input type="date" class="form-input" style="width:auto;padding:.3rem .7rem;font-size:.82rem" value="${selDate}" max="${today}" onchange="sessionStorage.setItem('att_date',this.value);App.navigate('attendance')">
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:1rem">
      <div class="stat-card"><div class="stat-value" style="color:var(--green)">${presentCount}</div><div class="stat-label">✅ حاضر</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--red)">${absentCount}</div><div class="stat-label">❌ غائب</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--gold)">${halfdayCount}</div><div class="stat-label">🔶 نصف يوم</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--blue)">${holidayCount}</div><div class="stat-label">🏖️ إجازة</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--gold);font-size:1rem">${fmt(dayCost)}</div><div class="stat-label">💰 تكلفة اليوم (دج)</div></div>
    </div>

    <div class="card" style="margin-bottom:1rem;padding:.8rem 1rem">
      <div style="font-size:.78rem;font-weight:700;color:var(--muted);margin-bottom:.5rem">📊 آخر 30 يوم — انقر يوماً للانتقال إليه</div>
      <div style="display:flex;align-items:flex-end;gap:3px;height:64px;overflow-x:auto;padding-bottom:2px">${historyBars}</div>
      <div style="display:flex;gap:1rem;margin-top:.4rem;font-size:.68rem;color:var(--dim)">
        <span style="color:var(--green)">■ 80%+ حضور</span>
        <span style="color:var(--gold)">■ 50–79%</span>
        <span style="color:var(--red)">■ أقل من 50%</span>
      </div>
    </div>

    <div class="filter-bar" style="margin-bottom:.8rem">
      <select class="form-select" style="max-width:220px" onchange="sessionStorage.setItem('att_proj',this.value);App.navigate('attendance')">${projOpts}</select>
      <div style="flex:1"></div>
      <button class="btn btn-green btn-sm" onclick="markAllStatus('present','${selDate}')">✅ تحديد الكل حاضر</button>
      <button class="btn btn-red btn-sm" onclick="markAllStatus('absent','${selDate}')">❌ تحديد الكل غائب</button>
      <button class="btn btn-blue btn-sm" onclick="DZDocsUI.openAttendanceCard()" title="${L('بطاقة حضور PDF لعامل ومدة محددة','Fiche pointage PDF')}">📄 ${L('بطاقة حضور PDF','Fiche pointage')}</button>
      <button class="btn btn-ghost btn-sm" onclick="exportAttendanceMonthly()">📥 تصدير CSV</button>
    </div>

    ${tableContent}
  `);
};


/* ─── REPORTS ─── */
Pages.reports = function() {
  const tid = Auth.getUser().tenant_id;
  const txs = DB.get('transactions').filter(t=>t.tenant_id===tid);
  const projs = DB.get('projects').filter(p=>p.tenant_id===tid && !p.is_archived);
  const workers = DB.get('workers').filter(w=>w.tenant_id===tid);
  const revenue=txs.filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
  const expense=txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  const totalBudget=projs.reduce((s,p)=>s+Number(p.budget),0);
  const totalSpent=projs.reduce((s,p)=>s+Number(p.total_spent),0);
  const catMap={};
  txs.filter(t=>t.type==='expense').forEach(t=>{catMap[t.category]=(catMap[t.category]||0)+Number(t.amount);});
  const topCats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxCat=topCats[0]?.[1]||1;
  return layoutHTML('reports','التقارير',`
    <div class="page-header">
      <div class="page-title">📈 التقارير والإحصاء</div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="exportFinancialCSV()">📥 تصدير مالي CSV</button><button class="btn btn-gold btn-sm" onclick="exportReportPDF()">📄 تصدير PDF</button>
        <button class="btn btn-ghost btn-sm" onclick="exportAttendanceMonthly()">📥 تقرير حضور CSV</button>
        <button class="btn btn-gold btn-sm" onclick="window.print()">🖨️ طباعة التقرير</button>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value" style="color:var(--green);font-size:1rem">${fmt(revenue)}</div><div class="stat-label">الإيرادات (دج)</div></div>
      <div class="stat-card"><div class="stat-icon">📉</div><div class="stat-value" style="color:var(--red);font-size:1rem">${fmt(expense)}</div><div class="stat-label">المصاريف (دج)</div></div>
      <div class="stat-card"><div class="stat-icon">💹</div><div class="stat-value" style="color:${revenue-expense>=0?'var(--green)':'var(--red)'};font-size:1rem">${fmt(revenue-expense)}</div><div class="stat-label">الربح (دج)</div></div>
      <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value" style="color:var(--gold)">${totalBudget>0?Math.round(totalSpent/totalBudget*100):0}%</div><div class="stat-label">استهلاك الميزانية</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="card">
        <div style="font-weight:800;margin-bottom:1rem">🏗️ ملخص المشاريع</div>
        ${['active','completed','delayed'].map(s=>{const cnt=projs.filter(p=>p.status===s).length;const col=s==='active'?'var(--green)':s==='completed'?'var(--blue)':'var(--red)';return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted);font-size:.84rem">${statusLabel(s)}</span><span style="font-weight:900;color:${col};font-family:monospace">${cnt}</span></div>`;}).join('')}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0"><span style="color:var(--muted);font-size:.84rem">إجمالي الميزانية</span><span style="font-weight:700;font-family:monospace;font-size:.82rem">${fmt(totalBudget)} دج</span></div>
      </div>
      <div class="card">
        <div style="font-weight:800;margin-bottom:1rem">👷 إحصاء العمال</div>
        <div style="display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted);font-size:.84rem">إجمالي العمال</span><span style="font-weight:900;font-family:monospace">${workers.length}</span></div>
        <div style="display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted);font-size:.84rem">متوسط الأجر اليومي</span><span style="font-weight:700;font-family:monospace;font-size:.82rem">${workers.length?fmt(Math.round(workers.reduce((s,w)=>s+Number(w.daily_salary),0)/workers.length)):0} دج</span></div>
        <div style="display:flex;justify-content:space-between;padding:.5rem 0"><span style="color:var(--muted);font-size:.84rem">التكلفة اليومية الكلية</span><span style="font-weight:700;font-family:monospace;font-size:.82rem">${fmt(workers.reduce((s,w)=>s+Number(w.daily_salary),0))} دج</span></div>
      </div>
    </div>
    ${topCats.length?`<div class="card" style="margin-bottom:1rem"><div style="font-weight:800;margin-bottom:1rem">🏆 أكبر فئات المصاريف</div>${topCats.map(([cat,amt])=>`<div style="margin-bottom:.8rem"><div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:4px"><span style="color:var(--muted)">${escHtml(cat)}</span><span style="font-weight:700;font-family:monospace">${fmt(amt)} دج</span></div><div class="progress-bar"><div class="progress-fill" style="background:var(--red)" data-width="${Math.round(amt/maxCat*100)}"></div></div></div>`).join('')}</div>`:''}
    <div class="card"><div style="font-weight:800;margin-bottom:1rem">💼 ربحية المشاريع</div><div class="table-wrap"><table><thead><tr><th>المشروع</th><th>الميزانية</th><th>المُنفَق</th><th>التقدم</th><th>الحالة</th></tr></thead>
      <tbody>${projs.map(p=>`<tr><td><span style="font-weight:700">${escHtml(p.name)}</span></td><td style="font-family:monospace;font-size:.82rem">${fmt(p.budget)}</td><td style="font-family:monospace;font-size:.82rem;color:${p.total_spent>p.budget?'var(--red)':'var(--green)'}">${fmt(p.total_spent)}</td><td><div style="display:flex;align-items:center;gap:.5rem"><div class="progress-bar" style="flex:1"><div class="progress-fill" style="background:${p.color}" data-width="${p.progress}"></div></div><span style="font-size:.75rem;font-weight:700">${p.progress}%</span></div></td><td>${statusBadge(p.status)}</td></tr>`).join('')}</tbody>
    </table></div></div>
  `);
};

/* ─── SETTINGS ─── */
/* ── مزامنة شعار الشركة من Supabase إلى localStorage عند كل فتح ── */
async function syncTenantLogoFromSupabase() {
  const tid = Auth.getTenant()?.id;
  const sbUrl = DBHybrid._supabaseUrl;
  const sbKey = DBHybrid._supabaseKey;
  if (!tid || !sbUrl || !sbKey) return;
  try {
    const res = await fetch(`${sbUrl}/rest/v1/tenants?id=eq.${tid}&select=logo_url`, {
      headers: { 'apikey': sbKey, 'Authorization': 'Bearer ' + sbKey }
    });
    if (!res.ok) return;
    const data = await res.json();
    const logoUrl = data?.[0]?.logo_url;
    if (logoUrl) {
      // حدّث localStorage cache
      try { localStorage.setItem('sbtp_logo_' + tid, logoUrl); } catch {}
      // حدّث كائن tenant المحلي
      const tenants = DB.get('tenants');
      const idx = tenants.findIndex(t => t.id === tid);
      if (idx !== -1 && tenants[idx].logo_url !== logoUrl) {
        tenants[idx].logo_url = logoUrl;
        DB.set('tenants', tenants);
      }
    }
  } catch (e) { /* silent */ }
}

Pages.settings = function() {

  // جلب الشعار من Supabase في الخلفية وتحديث الـ cache
  syncTenantLogoFromSupabase();

  const tenant=Auth.getTenant(), plan=Auth.getPlan(), user=Auth.getUser();
  const savedMode = localStorage.getItem('sbtp_mode') || 'advanced';

  const permRows = [
    [L('عرض المشاريع','Voir projets'),'✅','✅','✅','✅'],
    [L('تعديل المشاريع','Modifier projets'),'✅','✅','🟡','❌'],
    [L('حذف المشاريع','Supprimer projets'),'✅','❌','❌','❌'],
    [L('عرض الرواتب','Voir salaires'),'✅','🟡','✅','❌'],
    [L('تعديل الميزانية','Modifier budget'),'✅','✅','❌','❌'],
    [L('طباعة التقارير','Imprimer rapports'),'✅','✅','✅','❌'],
    [L('إدارة المستخدمين','Gérer utilisateurs'),'✅','❌','❌','❌'],
    [L('سجل النشاط','Journal activité'),'✅','✅','❌','❌'],
  ];

  return layoutHTML('settings', L('الإعدادات','Paramètres'),`
    <div class="page-header"><div class="page-title">⚙️ ${L('الإعدادات','Paramètres')}</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div>
        <!-- Company Info -->
        <div class="card" style="margin-bottom:1rem">
          <div style="font-weight:800;margin-bottom:1rem">🏢 ${L('معلومات الشركة','Infos de l\'entreprise')}</div>
          <div class="form-group"><label class="form-label">${L('اسم الشركة','Nom de la société')}</label><input class="form-input" id="setName" value="${escHtml(tenant?.name||'')}"></div>
          <div class="form-group"><label class="form-label">${L('الولاية','Wilaya')}</label><select class="form-select" id="setWilaya"><option value="">${L('اختر...','Choisir...')}</option>${WILAYAS.map(w=>`<option${tenant?.wilaya===w?' selected':''}>${w}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">${L('رقم الهاتف','Téléphone')}</label><input class="form-input" id="setPhone" value="${escHtml(tenant?.phone||'')}" placeholder="0550..."></div>
          <button class="btn btn-gold" onclick="saveTenantSettings()">💾 ${L('حفظ التغييرات','Sauvegarder')}</button>
        </div>

        <!-- Logo Upload -->
        <div class="card" style="margin-bottom:1rem">
          <div style="font-weight:800;margin-bottom:.3rem">🖼️ ${L('شعار الشركة','Logo de l\'entreprise')}</div>
          <div style="font-size:.78rem;color:var(--dim);margin-bottom:1rem">${L('يُحفَظ في Supabase ويظهر تلقائياً في كل الفواتير والوثائق المطبوعة','Sauvegardé dans Supabase, apparaît sur toutes les factures')}</div>
          <div id="logoPreviewZone" style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
            ${(()=>{
              const logo = getTenantLogo();
              return logo
                ? `<img id="logoPreviewImg" src="${logo}" style="height:64px;max-width:180px;object-fit:contain;border-radius:6px;border:1px solid var(--border);padding:6px;background:#fff">`
                : `<div id="logoPreviewImg" style="width:120px;height:64px;border:2px dashed var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:.75rem;color:var(--dim)">${L('لا يوجد شعار','Aucun logo')}</div>`;
            })()}
            <div>
              <div class="logo-status-text" style="font-size:.78rem">
                ${(()=>{ const logo = getTenantLogo(); return logo
                  ? `<span style="color:var(--green)">✅ ${L('الشعار مُحفَظ في Supabase','Logo sauvegardé dans Supabase')}</span>`
                  : `<span style="color:var(--dim)">${L('PNG أو JPEG — حتى 2MB','PNG ou JPEG, max 2 Mo')}</span>`; })()}
              </div>
              <div style="font-size:.72rem;color:var(--dim);margin-top:4px">
                ${L('يظهر في الفواتير والعقود والتقارير المطبوعة','Visible sur factures, contrats et rapports imprimés')}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center">
            <label class="btn btn-blue" style="cursor:pointer;margin:0">
              📁 ${L('رفع الشعار','Charger le logo')}
              <input type="file" id="logoFileInput" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadTenantLogo(this)">
            </label>
            <button class="btn btn-ghost btn-sm" onclick="removeTenantLogo()" style="color:var(--red)">🗑️ ${L('حذف','Supprimer')}</button>
            <span style="font-size:.7rem;color:var(--dim)">☁️ Supabase</span>
          </div>
        </div>
        
        <!-- Legal Algerian Fields -->
        <div class="card" style="margin-bottom:1rem">
          <div style="font-weight:800;margin-bottom:1rem">🔖 ${L('البيانات القانونية الجزائرية','Données légales algériennes')}</div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">${L('رقم السجل التجاري (RC)','Registre de commerce (RC)')}</label>
              <input class="form-input" id="setRc" value="${escHtml(tenant?.rc_number||'')}" placeholder="00/00-0000000">
            </div>
            <div class="form-group">
              <label class="form-label">${L('الرقم الجبائي (NIF)','N° identification fiscale (NIF)')}</label>
              <input class="form-input" id="setNif" value="${escHtml(tenant?.nif||'')}" placeholder="000000000000000">
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">${L('الرقم الإحصائي (NIS)','N° statistique (NIS)')}</label>
              <input class="form-input" id="setNis" value="${escHtml(tenant?.nis||'')}" placeholder="000000000000000">
            </div>
            <div class="form-group">
              <label class="form-label">${L('رقم المادة الجبائية','Article d\'imposition')}</label>
              <input class="form-input" id="setArticleImp" value="${escHtml(tenant?.article_imp||'')}" placeholder="0000000000">
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">${L('رقم الحساب البنكي (RIB)','Compte bancaire (RIB)')}</label>
              <input class="form-input" id="setRib" value="${escHtml(tenant?.rib||'')}" placeholder="00000 00000 00000000 00">
            </div>
            <div class="form-group">
              <label class="form-label">${L('نسبة TVA (%)','Taux TVA (%)')}</label>
              <input class="form-input" id="setTva" type="number" value="${escHtml(String(tenant?.tva_rate||19))}" placeholder="19">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${L('العنوان القانوني','Adresse légale')}</label>
            <input class="form-input" id="setAddress" value="${escHtml(tenant?.address||'')}" placeholder="${L('شارع، حي، ولاية...','Rue, quartier, wilaya...')}">
          </div>
          <button class="btn btn-blue" onclick="saveLegalSettings()">💾 ${L('حفظ البيانات القانونية','Sauvegarder données légales')}</button>
          <div style="margin-top:.6rem;font-size:.72rem;color:var(--dim);background:rgba(232,184,75,0.06);padding:.6rem .8rem;border-radius:8px;border-right:3px solid var(--gold)">
            💡 ${L('هذه البيانات تظهر تلقائياً على رأس كل الوثائق المولّدة من <strong>مركز الوثائق الإدارية والمالية</strong>','Ces données apparaissent automatiquement en haut de chaque document généré depuis le <strong>Centre des documents administratifs</strong>')}
          </div>
        </div>

        <!-- UI Mode -->
        <div class="card" style="margin-bottom:1rem">
          <div style="font-weight:800;margin-bottom:.8rem">🎛️ ${L('وضع العرض','Mode d\'affichage')}</div>
          <div style="font-size:.8rem;color:var(--dim);margin-bottom:.8rem">${L('اختر بين الوضع الأساسي (مبسّط) والمتقدم (كامل الميزات)','Choisissez entre le mode basique (simplifié) et avancé (toutes fonctionnalités)')}</div>
          <div style="display:flex;gap:.6rem">
            <button class="btn ${savedMode==='basic'?'btn-gold':'btn-ghost'}" onclick="setDisplayMode('basic')">📱 ${L('أساسي','Basique')}</button>
            <button class="btn ${savedMode==='advanced'?'btn-gold':'btn-ghost'}" onclick="setDisplayMode('advanced')">🚀 ${L('متقدم','Avancé')}</button>
          </div>
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:1rem">
          <div style="font-weight:800;margin-bottom:1rem">👤 ${L('الحساب الشخصي','Compte personnel')}</div>
          <div style="padding:.6rem 0;border-bottom:1px solid var(--border)"><div style="font-size:.72rem;color:var(--dim)">${L('الاسم','Nom')}</div><div style="font-weight:700">${escHtml(user.full_name)}</div></div>
          <div style="padding:.6rem 0;border-bottom:1px solid var(--border)"><div style="font-size:.72rem;color:var(--dim)">${L('البريد','Email')}</div><div style="font-weight:700;direction:ltr;text-align:right">${escHtml(user.email)}</div></div>
          <div style="padding:.6rem 0"><div style="font-size:.72rem;color:var(--dim)">${L('الخطة','Plan')}</div><div style="font-weight:700;color:var(--gold)">${escHtml(plan?.name||'—')}</div></div>
        </div>
        <div class="card" style="margin-bottom:1rem">
          <div style="font-weight:800;margin-bottom:1rem">🔑 ${L('تغيير كلمة المرور','Changer le mot de passe')}</div>
          <div class="form-group"><label class="form-label">${L('كلمة المرور الحالية','Mot de passe actuel')}</label><input class="form-input" id="pwCurrent" type="password"></div>
          <div class="form-group"><label class="form-label">${L('كلمة المرور الجديدة','Nouveau mot de passe')}</label><input class="form-input" id="pwNew" type="password"></div>
          <div class="form-group"><label class="form-label">${L('تأكيد كلمة المرور','Confirmer le mot de passe')}</label><input class="form-input" id="pwConfirm" type="password"></div>
          <button class="btn btn-blue" onclick="changePassword()">🔑 ${L('تغيير كلمة المرور','Changer le mot de passe')}</button>
        </div>
        <div class="card" style="margin-bottom:1rem">
          <div style="font-weight:800;margin-bottom:1rem">🔐 ${L('مصفوفة الصلاحيات','Matrice des permissions')}</div>
          <div class="table-wrap">
            <table class="role-matrix-table">
              <thead><tr>
                <th style="text-align:right">${L('الميزة','Fonctionnalité')}</th>
                <th>Admin</th><th>Manager</th><th>Accountant</th><th>Viewer</th>
              </tr></thead>
              <tbody>
                ${permRows.map(row=>`<tr>
                  <td>${row[0]}</td>
                  ${row.slice(1).map(v=>`<td><span class="${v==='✅'?'perm-icon-yes':v==='❌'?'perm-icon-no':'perm-icon-partial'}">${v}</span></td>`).join('')}
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div style="font-weight:800;margin-bottom:1rem">💾 ${L('النسخ الاحتياطي','Sauvegarde des données')}</div>
          <div style="display:flex;flex-direction:column;gap:.6rem">
            <button class="btn btn-green" onclick="exportAllData()" style="justify-content:center">
              📤 ${L('تصدير جميع البيانات (JSON)','Exporter toutes les données (JSON)')}
            </button>
            <button class="btn btn-ghost" onclick="importAllData()" style="justify-content:center">
              📥 ${L('استيراد بيانات من ملف','Importer depuis un fichier')}
            </button>
            <div style="font-size:.72rem;color:var(--dim);margin-top:.3rem">
              ${L('⚠️ الاستيراد سيستبدل البيانات الحالية','⚠️ L\'import remplace les données actuelles')}
            </div>
          </div>
        </div>


      </div>
    </div>
  `);
};

/* ── شعار الشركة — رفع وحذف وعرض (Supabase + localStorage cache) ── */

/**
 * يرفع الشعار كـ base64 مباشرة في حقل logo_url بجدول tenants
 * ويحفظ نسخة محلية كـ cache لتسريع العرض
 */
async function uploadTenantLogo(input) {
  const file = input.files?.[0];
  if (!file) return;

  // ── تحقق من الحجم (2MB max) ──
  if (file.size > 2 * 1024 * 1024) {
    Toast.error(L('حجم الملف يتجاوز 2MB — يرجى ضغط الصورة','Fichier > 2 Mo, veuillez compresser'));
    return;
  }

  const tid = Auth.getTenant()?.id;
  if (!tid) { Toast.error(L('خطأ: لم يتم العثور على حساب الشركة','Erreur : entreprise introuvable')); return; }

  // ── إظهار حالة الرفع ──
  _logoSetStatus('uploading');

  // ── تحويل الصورة إلى base64 ──
  const reader = new FileReader();
  reader.onload = async function(e) {
    const dataUrl = e.target.result;

    // 1) حفظ محلي فوري كـ cache
    try { localStorage.setItem('sbtp_logo_' + tid, dataUrl); } catch {}

    // 2) رفع إلى Supabase — تحديث حقل logo_url في جدول tenants
    try {
      const sbUrl = DBHybrid._supabaseUrl;
      const sbKey = DBHybrid._supabaseKey;

      if (sbUrl && sbKey) {
        const res = await fetch(`${sbUrl}/rest/v1/tenants?id=eq.${tid}`, {
          method: 'PATCH',
          headers: {
            'apikey': sbKey,
            'Authorization': 'Bearer ' + sbKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ logo_url: dataUrl })
        });

        if (!res.ok) {
          const err = await res.text();
          console.error('Supabase logo upload error:', err);
          Toast.warn(L(
            '⚠️ تم الحفظ محلياً فقط — تحقق من إعدادات Supabase',
            '⚠️ Sauvegardé localement — vérifier Supabase'
          ));
        } else {
          // تحديث كائن tenant المحلي أيضاً
          const tenants = DB.get('tenants');
          const idx = tenants.findIndex(t => t.id === tid);
          if (idx !== -1) { tenants[idx].logo_url = dataUrl; DB.set('tenants', tenants); }
          Toast.success(L('✅ تم رفع الشعار وحفظه في Supabase','✅ Logo sauvegardé dans Supabase'));
        }
      } else {
        // وضع offline — محلي فقط
        Toast.success(L('✅ تم حفظ الشعار محلياً','✅ Logo sauvegardé localement'));
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      Toast.warn(L('تم الحفظ محلياً — لا يوجد اتصال بـ Supabase','Sauvegardé localement — pas de connexion'));
    }

    // ── تحديث المعاينة ──
    _logoSetPreview(dataUrl);
    _logoSetStatus('done');
  };

  reader.onerror = () => {
    Toast.error(L('فشل قراءة الملف','Erreur de lecture du fichier'));
    _logoSetStatus('idle');
  };

  reader.readAsDataURL(file);
}

async function removeTenantLogo() {
  const tid = Auth.getTenant()?.id;
  if (!tid) return;

  // 1) حذف محلي
  try { localStorage.removeItem('sbtp_logo_' + tid); } catch {}

  // 2) مسح من Supabase
  try {
    const sbUrl = DBHybrid._supabaseUrl;
    const sbKey = DBHybrid._supabaseKey;
    if (sbUrl && sbKey) {
      await fetch(`${sbUrl}/rest/v1/tenants?id=eq.${tid}`, {
        method: 'PATCH',
        headers: {
          'apikey': sbKey,
          'Authorization': 'Bearer ' + sbKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ logo_url: null })
      });
      // تحديث كائن tenant المحلي
      const tenants = DB.get('tenants');
      const idx = tenants.findIndex(t => t.id === tid);
      if (idx !== -1) { tenants[idx].logo_url = null; DB.set('tenants', tenants); }
    }
  } catch (err) { console.error('Logo remove error:', err); }

  _logoSetPreview(null);
  _logoSetStatus('idle');
  Toast.info(L('تم حذف الشعار','Logo supprimé'));
}

/** يسترجع الشعار: أولاً من tenant المحمّل، ثم من localStorage كـ cache */
function getTenantLogo() {
  const tenant = Auth.getTenant();
  if (tenant?.logo_url) return tenant.logo_url;
  const tid = tenant?.id;
  if (!tid) return null;
  try { return localStorage.getItem('sbtp_logo_' + tid) || null; } catch { return null; }
}

function getTenantLogoHTML(height = 56) {
  const logo = getTenantLogo();
  if (!logo) return '';
  return `<img src="${logo}" style="height:${height}px;max-width:200px;object-fit:contain;display:block" alt="logo">`;
}

/** helpers UI ──────────────────── */
function _logoSetPreview(dataUrl) {
  const preview = document.getElementById('logoPreviewImg');
  if (!preview) return;
  if (dataUrl) {
    if (preview.tagName === 'DIV') {
      const img = document.createElement('img');
      img.id = 'logoPreviewImg';
      img.src = dataUrl;
      img.style.cssText = 'height:64px;max-width:180px;object-fit:contain;border-radius:6px;border:1px solid var(--border);padding:6px;background:#fff';
      preview.replaceWith(img);
    } else {
      preview.src = dataUrl;
    }
  } else {
    const ph = document.createElement('div');
    ph.id = 'logoPreviewImg';
    ph.style.cssText = 'width:120px;height:64px;border:2px dashed var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:.75rem;color:var(--dim)';
    ph.textContent = L('لا يوجد شعار','Aucun logo');
    preview.replaceWith(ph);
  }
}

function _logoSetStatus(state) {
  const zone = document.getElementById('logoPreviewZone');
  if (!zone) return;
  const statusEl = zone.querySelector('.logo-status-text');
  if (!statusEl) return;
  const msgs = {
    uploading: `<span style="color:var(--gold)">⏳ ${L('جاري الرفع إلى Supabase...','Chargement vers Supabase...')}</span>`,
    done:      `<span style="color:var(--green)">✅ ${L('الشعار مُحفَظ في Supabase','Logo sauvegardé dans Supabase')}</span>`,
    idle:      `<span style="color:var(--dim)">${L('ادعم PNG أو JPEG حتى 2MB','PNG ou JPEG, max 2 Mo')}</span>`,
  };
  statusEl.innerHTML = msgs[state] || msgs.idle;
}


/* ══════════════════════════════════════════════════════
   🤖 AI PROVIDER MANAGEMENT — إدارة وكلاء الذكاء الاصطناعي
   وكلاء مجانيون مُختارون + Claude API
══════════════════════════════════════════════════════ */

/* ── مفتاح AI الافتراضي — يُضبط من المسؤول مرة واحدة ──
   هذا المفتاح يشتغل لجميع المؤسسات تلقائياً بدون أي إعداد
   المسؤول يستطيع تغييره من: لوحة الإدارة → SmartAI Settings
*/
const DEFAULT_AI_CONFIG = {
  provider: 'groq',
  apiKey: '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', // ← مُحدَّث من لوحة المسؤول
  model: 'llama-3.3-70b-versatile',
  endpoint: 'https://api.groq.com/openai/v1/chat/completions',
  apiStyle: 'openai',
  status: 'active'
};

const AI_PROVIDERS = [
  {
    id: 'groq',
    name: 'Groq Cloud',
    logo: '⚡',
    logoColor: '#F55036',
    desc: 'أسرع نموذج مجاني في العالم — يعمل بـ LLaMA 3.3 70B. مجاني تماماً مع 14,400 طلب/يوم.',
    model: 'llama-3.3-70b-versatile',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    keyPlaceholder: 'gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    freeLimit: '14,400 طلب/يوم',
    badges: ['free', 'fast', 'smart'],
    apiStyle: 'openai',
    signupUrl: 'https://console.groq.com/keys',
    tip: 'سجّل في console.groq.com → API Keys → Create Key'
  },
  {
    id: 'openrouter_free',
    name: 'OpenRouter (مجاني)',
    logo: '🔀',
    logoColor: '#7C3AED',
    desc: 'وصول موحّد لأكثر من 20 نموذج مجاني — Mistral, Gemma, LLaMA وغيرها. مجاني بشكل دائم.',
    model: 'mistralai/mistral-7b-instruct:free',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    keyPlaceholder: 'sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    freeLimit: 'مجاني دائم (نماذج Free)',
    badges: ['free', 'smart'],
    apiStyle: 'openai',
    signupUrl: 'https://openrouter.ai/keys',
    tip: 'سجّل في openrouter.ai → Keys → Create Key. اختر نماذج (free) مجانية'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    logo: '🔵',
    logoColor: '#4285F4',
    desc: 'نموذج Google المجاني Gemini 1.5 Flash — ذكي وسريع وداعم للعربية. 1,500 طلب/يوم مجاناً.',
    model: 'gemini-1.5-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    keyPlaceholder: 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    freeLimit: '1,500 طلب/يوم',
    badges: ['free', 'smart'],
    apiStyle: 'gemini',
    signupUrl: 'https://aistudio.google.com/app/apikey',
    tip: 'سجّل في aistudio.google.com → Get API Key'
  },
  {
    id: 'together',
    name: 'Together AI',
    logo: '🤝',
    logoColor: '#0EA5E9',
    desc: 'LLaMA 3 و Mixtral مجاناً لأول $5 (كريدت ترحيبي). جودة عالية ودعم ممتاز للعربية.',
    model: 'meta-llama/Llama-3-70b-chat-hf',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    keyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    freeLimit: '$5 كريدت مجاني عند التسجيل',
    badges: ['smart', 'paid'],
    apiStyle: 'openai',
    signupUrl: 'https://api.together.ai/',
    tip: 'سجّل في together.ai → احصل على $5 مجاناً → Settings → API Keys'
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    logo: '🧠',
    logoColor: '#D97706',
    desc: 'أقوى نموذج لتحليل المشاريع الجزائرية — Claude claude-sonnet-4-6. يفهم السياق الجزائري بعمق.',
    model: 'claude-sonnet-4-6',
    endpoint: 'https://api.anthropic.com/v1/messages',
    keyPlaceholder: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    freeLimit: '$5 كريدت مجاني عند التسجيل',
    badges: ['smart', 'paid'],
    apiStyle: 'anthropic',
    signupUrl: 'https://console.anthropic.com/',
    tip: 'سجّل في console.anthropic.com → API Keys → Create Key'
  },
];

function getAIConfig() {
  try {
    // ── 1. الأولوية: الإعداد المركزي من localStorage (مزامن من Supabase) ──
    const globalCfg = DB.get('global_ai_config');
    if (globalCfg && globalCfg.apiKey && globalCfg.status === 'active') {
      DEFAULT_AI_CONFIG.apiKey    = globalCfg.apiKey;
      DEFAULT_AI_CONFIG.provider  = globalCfg.provider  || DEFAULT_AI_CONFIG.provider;
      DEFAULT_AI_CONFIG.model     = globalCfg.model     || DEFAULT_AI_CONFIG.model;
      DEFAULT_AI_CONFIG.endpoint  = globalCfg.endpoint  || DEFAULT_AI_CONFIG.endpoint;
      DEFAULT_AI_CONFIG.apiStyle  = globalCfg.apiStyle  || DEFAULT_AI_CONFIG.apiStyle;
      return { ...DEFAULT_AI_CONFIG, ...globalCfg };
    }
    // ── 2. fallback: المفتاح المدمج في الكود ──
    if (DEFAULT_AI_CONFIG.apiKey) {
      return { ...DEFAULT_AI_CONFIG, status: 'active' };
    }
    return { provider: 'groq', apiKey: '', model: 'llama-3.3-70b-versatile', status: 'inactive' };
  } catch(e) { return { provider: 'groq', apiKey: '', model: 'llama-3.3-70b-versatile', status: 'inactive' }; }
}

// ── جلب AI config من Supabase وتخزينه محلياً (يُستدعى عند أول تحميل) ──
async function fetchAIConfigFromSupabase() {
  try {
    const sbCfg = (() => {
      if (typeof SUPABASE_HARDCODED !== 'undefined' && SUPABASE_HARDCODED.url)
        return { url: SUPABASE_HARDCODED.url, anonKey: SUPABASE_HARDCODED.anonKey };
      try { return JSON.parse(localStorage.getItem('sbtp_supabase_config')||'{}'); } catch { return {}; }
    })();
    if (!sbCfg.url || !sbCfg.anonKey) return;
    const resp = await fetch(`${sbCfg.url}/rest/v1/global_settings?key=eq.global_ai_config&select=value`, {
      headers: { 'apikey': sbCfg.anonKey, 'Authorization': `Bearer ${sbCfg.anonKey}` }
    });
    if (!resp.ok) return;
    const rows = await resp.json();
    if (!rows.length || !rows[0].value) return;
    const remoteCfg = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
    if (remoteCfg.apiKey && remoteCfg.status === 'active') {
      DB.set('global_ai_config', remoteCfg);
      DEFAULT_AI_CONFIG.apiKey   = remoteCfg.apiKey;
      DEFAULT_AI_CONFIG.provider = remoteCfg.provider || DEFAULT_AI_CONFIG.provider;
      DEFAULT_AI_CONFIG.model    = remoteCfg.model    || DEFAULT_AI_CONFIG.model;
      DEFAULT_AI_CONFIG.endpoint = remoteCfg.endpoint || DEFAULT_AI_CONFIG.endpoint;
      DEFAULT_AI_CONFIG.apiStyle = remoteCfg.apiStyle || DEFAULT_AI_CONFIG.apiStyle;
      DEFAULT_AI_CONFIG.status   = 'active';
      console.log('✅ SmartAI: تم تحميل إعداد AI من Supabase تلقائياً');
    }
  } catch(e) { /* silent */ }
}
// تحميل تلقائي عند بدء التطبيق
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(fetchAIConfigFromSupabase, 1500));
} else {
  setTimeout(fetchAIConfigFromSupabase, 1500);
}


// ─── مزامنة وقت السيرفر (Supabase) لتجربة 14 يوم ───
async function initServerTimeSync() {
  try { await TrialManager.syncServerNow(); } catch(e) {}
  // تحديث كل 5 دقائق لتقليل الانحراف
  setInterval(() => TrialManager.syncServerNow().catch(()=>{}), 5 * 60 * 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initServerTimeSync, 1200));
} else {
  setTimeout(initServerTimeSync, 1200);
}

function saveAIConfig(cfg) {
  const base = getAIConfig();
  const merged = { ...base, ...cfg };
  try { DB.set('global_ai_config', merged); } catch(e) {}
  try { localStorage.setItem('sbtp_ai_config', JSON.stringify(merged)); } catch(e) {}
  try {
    if (merged.apiKey) {
      DEFAULT_AI_CONFIG.apiKey   = merged.apiKey;
      DEFAULT_AI_CONFIG.provider = merged.provider  || DEFAULT_AI_CONFIG.provider;
      DEFAULT_AI_CONFIG.model    = merged.model     || DEFAULT_AI_CONFIG.model;
      DEFAULT_AI_CONFIG.endpoint = merged.endpoint  || DEFAULT_AI_CONFIG.endpoint;
      DEFAULT_AI_CONFIG.apiStyle = merged.apiStyle  || DEFAULT_AI_CONFIG.apiStyle;
      DEFAULT_AI_CONFIG.status   = merged.status    || 'active';
    }
  } catch(e) {}
  try {
    if (typeof SmartAI !== 'undefined' && SmartAI) {
      SmartAI.currentProvider = merged.provider;
    }
  } catch(e) {}
  // ─── حفظ إعداد AI في Supabase حتى تراه جميع الحسابات الجديدة ───
  try {
    const sbCfg = (() => {
      if (typeof SUPABASE_HARDCODED !== 'undefined' && SUPABASE_HARDCODED.url)
        return { url: SUPABASE_HARDCODED.url, anonKey: SUPABASE_HARDCODED.anonKey };
      try { return JSON.parse(localStorage.getItem('sbtp_supabase_config')||'{}'); } catch { return {}; }
    })();
    if (sbCfg.url && sbCfg.anonKey) {
      const sbHeaders = { 'Content-Type': 'application/json', 'apikey': sbCfg.anonKey, 'Authorization': `Bearer ${sbCfg.anonKey}`, 'Prefer': 'resolution=merge-duplicates,return=representation' };
      fetch(`${sbCfg.url}/rest/v1/global_settings`, {
        method: 'POST', headers: sbHeaders,
        body: JSON.stringify({ key: 'global_ai_config', value: merged, updated_at: new Date().toISOString() })
      }).then(r => { if (r.ok) console.log('✅ AI config حُفظ في Supabase'); }).catch(() => {});
    }
  } catch(e) {}
}

function renderTenantSmartAIAnalytics(projects, txs, workers, equip, attendance, tid) {
  const now      = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth()+1).padStart(2,'0')}`;

  // ── مؤشرات المشاريع ──
  const activeProj   = projects.filter(p => p.status === 'active');
  const delayedProj  = projects.filter(p => p.status === 'delayed');
  const completedProj= projects.filter(p => p.status === 'completed');
  const avgProgress  = projects.length ? Math.round(projects.reduce((s,p)=>s+Number(p.progress||0),0)/projects.length) : 0;
  const totalBudget  = projects.reduce((s,p)=>s+Number(p.budget||0),0);
  const totalSpent   = projects.reduce((s,p)=>s+Number(p.total_spent||0),0);
  const budgetHealth = totalBudget > 0 ? Math.round((1 - totalSpent/totalBudget)*100) : 100;

  // ── مؤشرات مالية ──
  const revenue   = txs.filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
  const expenses  = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  const netProfit = revenue - expenses;

  // هذا الشهر
  const monthTxs  = txs.filter(t => t.date && t.date.startsWith(monthStr));
  const monthRev  = monthTxs.filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
  const monthExp  = monthTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  const monthNet  = monthRev - monthExp;

  // الشهر الماضي
  const prevTxs   = txs.filter(t => t.date && t.date.startsWith(prevMonthStr));
  const prevRev   = prevTxs.filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
  const prevExp   = prevTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  const prevNet   = prevRev - prevExp;
  const revenueGrowth = prevRev > 0 ? Math.round((monthRev - prevRev) / prevRev * 100) : null;

  // ── مؤشرات العمال ──
  const today = now.toISOString().split('T')[0];
  const todayAtt = attendance.filter(a => a.date === today);
  const presentToday = todayAtt.filter(a => a.status === 'present').length;
  const attendanceRate = workers.length > 0 ? Math.round(presentToday / workers.length * 100) : 0;

  // احسب معدل الحضور للأيام الـ7 الأخيرة
  const last7 = [];
  for (let i=0; i<7; i++) {
    const d = new Date(now); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split('T')[0];
    const dayAtt = attendance.filter(a=>a.date===ds);
    const pct = workers.length > 0 ? Math.round(dayAtt.filter(a=>a.status==='present').length/workers.length*100) : 0;
    last7.unshift({ date: ds, pct });
  }

  // ── مؤشرات المعدات ──
  const equipActive  = equip.filter(e => e.status === 'active').length;
  const equipMaint   = equip.filter(e => e.status === 'maintenance').length;
  const equipRate    = equip.length > 0 ? Math.round(equipActive / equip.length * 100) : 100;

  // ── تنبيهات ذكية ──
  const alerts = [];
  delayedProj.forEach(p => alerts.push({ type:'danger', icon:'⚠️', text:`مشروع "${escHtml(p.name)}" متأخر — تقدمه ${p.progress}%` }));
  projects.forEach(p => {
    if (p.budget > 0 && p.total_spent > p.budget) alerts.push({ type:'danger', icon:'💸', text:`مشروع "${escHtml(p.name)}" تجاوز الميزانية بـ ${fmt(p.total_spent - p.budget)} دج` });
    else if (p.budget > 0 && p.total_spent >= p.budget * 0.85) alerts.push({ type:'warning', icon:'🟡', text:`مشروع "${escHtml(p.name)}" استهلك ${Math.round(p.total_spent/p.budget*100)}% من الميزانية` });
  });
  if (equipMaint > 0) alerts.push({ type:'warning', icon:'🔧', text:`${equipMaint} معدة في الصيانة حالياً` });
  if (workers.length > 0 && attendanceRate < 70) alerts.push({ type:'warning', icon:'👷', text:`نسبة الحضور اليوم منخفضة: ${attendanceRate}%` });
  if (netProfit < 0) alerts.push({ type:'danger', icon:'📉', text:`الرصيد الصافي سلبي: ${fmt(netProfit)} دج` });

  // ── رسم أعمدة الحضور mini ──
  const attBars = last7.map(d => {
    const color = d.pct >= 80 ? '#34C38F' : d.pct >= 50 ? '#E8B84B' : '#F04E6A';
    const h = Math.max(4, Math.round(d.pct * 40 / 100));
    return `<div title="${d.date}: ${d.pct}%" style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1">
      <div style="width:100%;background:rgba(255,255,255,.06);border-radius:4px;height:40px;display:flex;align-items:flex-end;overflow:hidden">
        <div style="width:100%;height:${h}px;background:${color};border-radius:3px 3px 0 0;transition:height .5s ease"></div>
      </div>
      <div style="font-size:.55rem;color:var(--dim)">${d.pct}%</div>
    </div>`;
  }).join('');

  // ── شريط الميزانية لكل مشروع (pre-computed) ──
  const budgetBarsHTML = projects.length === 0
    ? `<div style="font-size:.78rem;color:var(--dim);text-align:center;padding:.5rem">لا توجد مشاريع</div>`
    : projects.slice(0,4).map(p => {
        const pct = p.budget > 0 ? Math.min(100, Math.round(p.total_spent/p.budget*100)) : 0;
        const bc  = pct >= 100 ? 'var(--red)' : pct >= 85 ? '#FF7043' : pct >= 60 ? 'var(--gold)' : 'var(--green)';
        return '<div style="margin-bottom:.55rem">'
          + '<div style="display:flex;justify-content:space-between;font-size:.68rem;margin-bottom:2px">'
          + '<span style="color:var(--muted);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(p.name) + '</span>'
          + '<span style="color:' + bc + ';font-weight:800">' + pct + '%</span>'
          + '</div>'
          + '<div style="height:5px;background:rgba(255,255,255,.07);border-radius:3px">'
          + '<div style="height:5px;background:' + bc + ';border-radius:3px;width:' + pct + '%;transition:width 1s ease"></div>'
          + '</div></div>';
      }).join('');

  // ── تنبيهات HTML (pre-computed) ──
  const alertsHTML = alerts.length === 0
    ? `<div style="padding:.7rem 1rem;background:rgba(52,195,143,0.06);border:1px solid rgba(52,195,143,0.2);border-radius:10px;display:flex;align-items:center;gap:.6rem"><span>✅</span><span style="font-size:.8rem;color:var(--green);font-weight:700">لا توجد تنبيهات — مؤسستك في وضع ممتاز</span></div>`
    : alerts.map(a => {
        const bgClr = a.type==='danger' ? '240,78,106' : '232,184,75';
        const txtClr= a.type==='danger' ? 'var(--red)' : 'var(--gold)';
        return '<div style="padding:.55rem .9rem;background:rgba(' + bgClr + ',0.06);border:1px solid rgba(' + bgClr + ',0.2);border-radius:9px;display:flex;align-items:center;gap:.6rem;margin-bottom:.4rem">'
          + '<span style="font-size:.95rem">' + a.icon + '</span>'
          + '<span style="font-size:.78rem;color:' + txtClr + ';font-weight:700">' + a.text + '</span>'
          + '</div>';
      }).join('');

  // ── تحديد لون مؤشر الصحة المالية ──
  const profitPct = revenue > 0 ? Math.round(netProfit / revenue * 100) : 0;
  const profitColor = profitPct >= 15 ? '#34C38F' : profitPct >= 0 ? '#E8B84B' : '#F04E6A';
  const growthHTML = revenueGrowth !== null
    ? `<span style="color:${revenueGrowth>=0?'var(--green)':'var(--red)'};margin-right:.3rem">${revenueGrowth>=0?'▲':'▼'} ${Math.abs(revenueGrowth)}%</span>`
    : '';
  const equipMaintHTML = equipMaint ? `<div style="color:var(--gold)">🔧 ${equipMaint} صيانة</div>` : '';
  const attChartHTML = workers.length === 0
    ? `<div style="font-size:.78rem;color:var(--dim);text-align:center;padding:1rem">لا يوجد عمال مسجلون</div>`
    : `<div style="display:flex;gap:3px;align-items:flex-end;height:58px">${attBars}</div><div style="display:flex;justify-content:space-between;margin-top:.4rem;font-size:.6rem;color:var(--dim)"><span>منذ 7 أيام</span><span>اليوم</span></div>`;

  return `
  <div class="card" style="margin-top:1.5rem;border-color:rgba(155,109,255,0.3);background:linear-gradient(135deg,rgba(155,109,255,0.04),rgba(52,195,143,0.02))" id="tenant-smartai-analytics">
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;flex-wrap:wrap;gap:.6rem">
      <div style="display:flex;align-items:center;gap:.8rem">
        <div style="width:42px;height:42px;border-radius:13px;background:linear-gradient(135deg,rgba(155,109,255,0.25),rgba(52,195,143,0.15));border:1px solid rgba(155,109,255,0.35);display:flex;align-items:center;justify-content:center;font-size:1.3rem;box-shadow:0 4px 16px rgba(155,109,255,0.2)">📡</div>
        <div>
          <div style="font-size:.95rem;font-weight:900;letter-spacing:-.2px">🧠 تحليلات ذكية</div>
          <div style="font-size:.68rem;color:var(--muted)">تُحدَّث تلقائياً • آخر تحديث: <span style="color:var(--gold);font-weight:700">${now.toLocaleTimeString('ar-DZ')}</span></div>
        </div>
      </div>
      <button onclick="refreshTenantAnalytics()" style="background:rgba(155,109,255,0.1);border:1px solid rgba(155,109,255,0.25);color:#B89AFF;border-radius:9px;padding:.35rem .9rem;cursor:pointer;font-size:.75rem;font-weight:800;font-family:'Tajawal',sans-serif;transition:all .2s" onmouseover="this.style.background='rgba(155,109,255,0.2)'" onmouseout="this.style.background='rgba(155,109,255,0.1)'">
        🔄 تحديث
      </button>
    </div>

    <!-- صف 1: KPIs رئيسية -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.8rem;margin-bottom:1rem">
      <!-- المشاريع -->
      <div style="background:rgba(74,144,226,0.07);border:1px solid rgba(74,144,226,0.18);border-radius:12px;padding:.9rem">
        <div style="font-size:.68rem;color:var(--dim);font-weight:700;margin-bottom:.4rem">🏗️ المشاريع</div>
        <div style="font-size:1.6rem;font-weight:900;color:var(--blue);line-height:1">${projects.length}</div>
        <div style="font-size:.68rem;margin-top:.3rem;display:flex;gap:.3rem;flex-wrap:wrap">
          <span style="color:var(--green)">✅ ${activeProj.length} نشط</span>
          ${delayedProj.length ? `<span style="color:var(--red)">⚠️ ${delayedProj.length} متأخر</span>` : ''}
          ${completedProj.length ? `<span style="color:var(--muted)">🏁 ${completedProj.length} منجز</span>` : ''}
        </div>
      </div>

      <!-- الإيرادات الشهرية -->
      <div style="background:rgba(52,195,143,0.07);border:1px solid rgba(52,195,143,0.18);border-radius:12px;padding:.9rem">
        <div style="font-size:.68rem;color:var(--dim);font-weight:700;margin-bottom:.4rem">💰 إيرادات الشهر</div>
        <div style="font-size:1rem;font-weight:900;color:var(--green);line-height:1.2;font-family:monospace">${fmt(monthRev)}</div>
        <div style="font-size:.65rem;margin-top:.3rem;color:var(--dim)">
          دج
          ${growthHTML}
        </div>
      </div>

      <!-- الربح الصافي الكلي -->
      <div style="background:rgba(${netProfit>=0?'52,195,143':'240,78,106'},0.07);border:1px solid rgba(${netProfit>=0?'52,195,143':'240,78,106'},0.18);border-radius:12px;padding:.9rem">
        <div style="font-size:.68rem;color:var(--dim);font-weight:700;margin-bottom:.4rem">📊 الربح الصافي الكلي</div>
        <div style="font-size:.95rem;font-weight:900;color:${netProfit>=0?'var(--green)':'var(--red)'};line-height:1.2;font-family:monospace">${netProfit>=0?'+':''}${fmt(netProfit)}</div>
        <div style="font-size:.65rem;margin-top:.3rem;color:var(--dim)">دج • هامش ${profitPct}%</div>
      </div>

      <!-- العمال -->
      <div style="background:rgba(232,184,75,0.07);border:1px solid rgba(232,184,75,0.18);border-radius:12px;padding:.9rem">
        <div style="font-size:.68rem;color:var(--dim);font-weight:700;margin-bottom:.4rem">👷 العمال اليوم</div>
        <div style="font-size:1.6rem;font-weight:900;color:var(--gold);line-height:1">${presentToday}<span style="font-size:.8rem;color:var(--dim)">/${workers.length}</span></div>
        <div style="font-size:.68rem;margin-top:.3rem">
          <div style="height:4px;background:rgba(255,255,255,.07);border-radius:3px">
            <div style="height:4px;background:${attendanceRate>=80?'var(--green)':attendanceRate>=50?'var(--gold)':'var(--red)'};border-radius:3px;width:${attendanceRate}%;transition:width 1s"></div>
          </div>
          <span style="color:var(--dim)">حضور ${attendanceRate}%</span>
        </div>
      </div>
    </div>

    <!-- صف 2: شريط الميزانية + حضور mini + المعدات -->
    <div style="display:grid;grid-template-columns:1fr 1fr 160px;gap:.8rem;margin-bottom:1rem">

      <!-- شريط الميزانية vs المنفق -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;padding:.9rem">
        <div style="font-size:.75rem;font-weight:800;margin-bottom:.7rem">💼 الميزانية مقابل الإنفاق</div>
        ${budgetBarsHTML}
        ${projects.length > 0 ? `<div style="font-size:.65rem;color:var(--dim);margin-top:.4rem">متوسط التقدم: <strong style="color:var(--text)">${avgProgress}%</strong></div>` : ''}
      </div>

      <!-- حضور آخر 7 أيام mini chart -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;padding:.9rem">
        <div style="font-size:.75rem;font-weight:800;margin-bottom:.7rem">📅 الحضور — آخر 7 أيام</div>
        ${attChartHTML}
      </div>

      <!-- المعدات -->
      <div style="background:rgba(155,109,255,0.07);border:1px solid rgba(155,109,255,0.18);border-radius:12px;padding:.9rem;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
        <div style="font-size:.68rem;color:var(--dim);font-weight:700;margin-bottom:.3rem">🚜 المعدات</div>
        <div style="font-size:1.4rem;font-weight:900;color:#B89AFF">${equip.length}</div>
        <div style="font-size:.65rem;color:var(--dim);margin-top:.2rem">
          <div style="color:var(--green)">✅ ${equipActive} نشطة</div>
          ${equipMaintHTML}
        </div>
        <div style="margin-top:.5rem;width:100%">
          <div style="height:4px;background:rgba(255,255,255,.07);border-radius:3px">
            <div style="height:4px;background:#B89AFF;border-radius:3px;width:${equipRate}%;transition:width 1s"></div>
          </div>
          <div style="font-size:.6rem;color:var(--dim);margin-top:2px">${equipRate}% تشغيل</div>
        </div>
      </div>
    </div>

    <!-- تنبيهات SmartAI -->
    <div id="tenant-smartai-alerts">
      ${alertsHTML}
    </div>
  </div>`;
}

function refreshTenantAnalytics() {
  const card = document.getElementById('tenant-smartai-analytics');
  if (!card) return;
  const user = Auth.getUser();
  if (!user || !user.tenant_id) return;
  const tid = user.tenant_id;
  const projects  = DB.get('projects').filter(p => p.tenant_id===tid && !p.is_archived);
  const workers   = DB.get('workers').filter(w => w.tenant_id===tid);
  const equip     = DB.get('equipment').filter(e => e.tenant_id===tid);
  const txs       = DB.get('transactions').filter(t => t.tenant_id===tid);
  const attendance= DB.get('attendance').filter(a => workers.find(w=>w.id===a.worker_id));
  card.style.opacity = '0.4';
  card.style.transition = 'opacity .18s';
  setTimeout(() => {
    card.outerHTML = renderTenantSmartAIAnalytics(projects, txs, workers, equip, attendance, tid);
    const newCard = document.getElementById('tenant-smartai-analytics');
    if (newCard) {
      newCard.style.opacity = '1';
      newCard.style.boxShadow = '0 0 0 2px rgba(155,109,255,0.45)';
      setTimeout(() => { if(newCard) newCard.style.boxShadow = ''; newCard.style.transition = 'box-shadow .6s'; }, 1000);
    }
  }, 200);
}

// ── مراقبة تغييرات البيانات → تحديث تحليلات لوحة المؤسسة تلقائياً ──
(function() {
  const _origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, val) {
    _origSet.call(this, key, val);
    if (key && key.startsWith('sbtp5_')) {
      clearTimeout(window._tenantAnalyticsTimer);
      window._tenantAnalyticsTimer = setTimeout(() => {
        if (typeof refreshTenantAnalytics === 'function') {
          const card = document.getElementById('tenant-smartai-analytics');
          if (card) refreshTenantAnalytics();
        }
      }, 700);
    }
  };
})();

function renderSmartAIAnalytics() {
  const tenants  = DB.get('tenants');
  const users    = DB.get('users').filter(u => !u.is_admin);
  const projects = DB.get('projects').filter(p => !p.is_archived);
  const txs      = DB.get('transactions');
  const workers  = DB.get('workers');
  const equipment= DB.get('equipment');
  const now      = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  // ── حساب البيانات لكل مؤسسة ──
  const tenantStats = tenants.map(t => {
    const tProjects = projects.filter(p => p.tenant_id === t.id);
    const tTxs      = txs.filter(x => x.tenant_id === t.id);
    const tWorkers  = workers.filter(w => w.tenant_id === t.id);
    const tEquip    = equipment.filter(e => e.tenant_id === t.id);
    const revenue   = tTxs.filter(x=>x.type==='revenue').reduce((s,x)=>s+Number(x.amount),0);
    const expenses  = tTxs.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0);
    const activeP   = tProjects.filter(p=>p.status==='active').length;
    const delayedP  = tProjects.filter(p=>p.status==='delayed').length;
    const avgProgress = tProjects.length ? Math.round(tProjects.reduce((s,p)=>s+Number(p.progress||0),0)/tProjects.length) : 0;
    const netProfit = revenue - expenses;
    const plan      = DB.get('plans').find(pl=>pl.id===t.plan_id);
    const monthTxs  = tTxs.filter(x=>x.date && x.date.startsWith(monthStr));
    const monthRev  = monthTxs.filter(x=>x.type==='revenue').reduce((s,x)=>s+Number(x.amount),0);
    // Health score simple (0-100)
    const healthScore = Math.min(100, Math.round(
      (activeP > 0 ? 30 : 0) +
      (netProfit > 0 ? 25 : 0) +
      (avgProgress > 50 ? 20 : avgProgress > 20 ? 10 : 0) +
      (tWorkers.length > 0 ? 15 : 0) +
      (delayedP === 0 ? 10 : delayedP === 1 ? 5 : 0)
    ));
    const healthColor = healthScore >= 70 ? '#34C38F' : healthScore >= 40 ? '#E8B84B' : '#F04E6A';
    return { t, plan, tProjects, tWorkers, tEquip, revenue, expenses, netProfit, activeP, delayedP, avgProgress, monthRev, healthScore, healthColor };
  });

  // ── إجماليات للرسم البياني ──
  const totalRev  = tenantStats.reduce((s,x)=>s+x.revenue,0);
  const totalExp  = tenantStats.reduce((s,x)=>s+x.expenses,0);
  const totalProj = projects.length;
  const totalWork = workers.length;
  const avgHealth = tenantStats.length ? Math.round(tenantStats.reduce((s,x)=>s+x.healthScore,0)/tenantStats.length) : 0;
  const avgHealthColor = avgHealth >= 70 ? '#34C38F' : avgHealth >= 40 ? '#E8B84B' : '#F04E6A';

  const tenantRows = tenantStats.map(({t, plan, tProjects, tWorkers, tEquip, revenue, expenses, netProfit, activeP, delayedP, avgProgress, monthRev, healthScore, healthColor}) => {
    const subBadge = t.subscription_status==='active'?'badge-active':t.subscription_status==='trial'?'badge-paused':'badge-delayed';
    const profitColor = netProfit >= 0 ? 'var(--green)' : 'var(--red)';
    const profitSign  = netProfit >= 0 ? '+' : '';
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:.6rem">
          <div style="width:32px;height:32px;border-radius:9px;background:rgba(155,109,255,.12);border:1px solid rgba(155,109,255,.25);display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0">🏢</div>
          <div>
            <div style="font-weight:800;font-size:.84rem">${escHtml(t.name)}</div>
            <div style="font-size:.68rem;color:var(--dim)">📍 ${escHtml(t.wilaya||'—')} • <span class="badge ${subBadge}" style="font-size:.62rem;padding:1px 6px">${t.subscription_status==='active'?'نشط':t.subscription_status==='trial'?'تجريبي':'منتهي'}</span></div>
          </div>
        </div>
      </td>
      <td style="text-align:center">
        <div style="width:38px;height:38px;border-radius:50%;border:3px solid ${healthColor};display:flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:900;color:${healthColor};margin:0 auto">${healthScore}</div>
      </td>
      <td style="text-align:center">
        <div style="font-weight:800;color:var(--blue)">${tProjects.length}</div>
        <div style="font-size:.67rem;color:var(--green)">${activeP} نشط${delayedP>0?` · <span style="color:var(--red)">${delayedP} متأخر</span>`:''}</div>
      </td>
      <td style="text-align:center">
        <div style="font-size:.75rem;font-weight:700;color:var(--muted)">${avgProgress}%</div>
        <div style="height:5px;background:rgba(255,255,255,.07);border-radius:4px;margin-top:3px;width:60px;margin:3px auto 0">
          <div style="height:5px;background:${avgProgress>70?'var(--green)':avgProgress>40?'var(--gold)':'var(--red)'};border-radius:4px;width:${avgProgress}%"></div>
        </div>
      </td>
      <td style="text-align:center;font-weight:700;color:var(--muted)">${tWorkers.length}</td>
      <td style="text-align:right;font-family:monospace;font-size:.78rem">
        <div style="color:var(--green)">${fmt(revenue)} دج</div>
        <div style="color:var(--red);font-size:.7rem">- ${fmt(expenses)} دج</div>
      </td>
      <td style="font-weight:900;font-family:monospace;font-size:.82rem;color:${profitColor};text-align:right">${profitSign}${fmt(netProfit)} دج</td>
      <td style="font-size:.72rem;color:var(--muted);text-align:right;font-family:monospace">${fmt(monthRev)} دج</td>
      <td style="font-size:.75rem;color:var(--muted);text-align:center">${escHtml(plan?.name||'—')}</td>
    </tr>`;
  }).join('');

  return `
  <div class="card" style="margin-top:1.5rem;border-color:rgba(155,109,255,0.3);background:linear-gradient(135deg,rgba(155,109,255,0.03),rgba(52,195,143,0.02))" id="smartai-analytics-card">
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.3rem;flex-wrap:wrap;gap:.7rem">
      <div style="display:flex;align-items:center;gap:.8rem">
        <div style="width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,rgba(155,109,255,0.2),rgba(52,195,143,0.15));border:1px solid rgba(155,109,255,0.3);display:flex;align-items:center;justify-content:center;font-size:1.4rem">📡</div>
        <div>
          <div style="font-size:1rem;font-weight:900">SmartAI Analytics — تحليلات المؤسسات</div>
          <div style="font-size:.72rem;color:var(--muted)">تُحدَّث تلقائياً عند كل تعديل في بيانات المؤسسات • آخر تحديث: <span id="smartai-last-update" style="color:var(--gold)">${new Date().toLocaleTimeString('ar-DZ')}</span></div>
        </div>
      </div>
      <button onclick="refreshSmartAIAnalytics()" style="background:rgba(155,109,255,0.12);border:1px solid rgba(155,109,255,0.3);color:#B89AFF;border-radius:10px;padding:.4rem 1rem;cursor:pointer;font-size:.78rem;font-weight:800;font-family:'Tajawal',sans-serif;transition:all .2s" onmouseover="this.style.background='rgba(155,109,255,0.22)'" onmouseout="this.style.background='rgba(155,109,255,0.12)'">
        🔄 تحديث الآن
      </button>
    </div>

    <!-- KPIs سريعة -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:.8rem;margin-bottom:1.5rem">
      <div style="background:rgba(155,109,255,0.08);border:1px solid rgba(155,109,255,0.18);border-radius:12px;padding:.9rem;text-align:center">
        <div style="font-size:1.5rem;font-weight:900;color:#B89AFF">${tenants.length}</div>
        <div style="font-size:.68rem;color:var(--dim);margin-top:.2rem">إجمالي المؤسسات</div>
      </div>
      <div style="background:rgba(74,144,226,0.08);border:1px solid rgba(74,144,226,0.18);border-radius:12px;padding:.9rem;text-align:center">
        <div style="font-size:1.5rem;font-weight:900;color:var(--blue)">${totalProj}</div>
        <div style="font-size:.68rem;color:var(--dim);margin-top:.2rem">مشاريع نشطة</div>
      </div>
      <div style="background:rgba(52,195,143,0.08);border:1px solid rgba(52,195,143,0.18);border-radius:12px;padding:.9rem;text-align:center">
        <div style="font-size:1rem;font-weight:900;color:var(--green)">${fmt(totalRev)}</div>
        <div style="font-size:.68rem;color:var(--dim);margin-top:.2rem">إجمالي الإيرادات دج</div>
      </div>
      <div style="background:rgba(240,78,106,0.08);border:1px solid rgba(240,78,106,0.18);border-radius:12px;padding:.9rem;text-align:center">
        <div style="font-size:1rem;font-weight:900;color:var(--red)">${fmt(totalExp)}</div>
        <div style="font-size:.68rem;color:var(--dim);margin-top:.2rem">إجمالي النفقات دج</div>
      </div>
      <div style="background:rgba(${avgHealth>=70?'52,195,143':avgHealth>=40?'232,184,75':'240,78,106'},0.08);border:1px solid rgba(${avgHealth>=70?'52,195,143':avgHealth>=40?'232,184,75':'240,78,106'},0.18);border-radius:12px;padding:.9rem;text-align:center">
        <div style="font-size:1.5rem;font-weight:900;color:${avgHealthColor}">${avgHealth}%</div>
        <div style="font-size:.68rem;color:var(--dim);margin-top:.2rem">متوسط صحة المؤسسات</div>
      </div>
    </div>

    <!-- شريط الربح/الخسارة الإجمالي -->
    ${totalRev+totalExp > 0 ? `
    <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;padding:1rem;margin-bottom:1.3rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem">
        <div style="font-size:.8rem;font-weight:800">📊 نسبة الإيرادات مقابل النفقات (إجمالي)</div>
        <div style="font-size:.78rem;font-weight:900;color:${totalRev-totalExp>=0?'var(--green)':'var(--red)'}">
          صافي: ${totalRev-totalExp>=0?'+':''}${fmt(totalRev-totalExp)} دج
        </div>
      </div>
      <div style="height:12px;background:rgba(255,255,255,0.06);border-radius:6px;overflow:hidden;display:flex">
        <div style="height:100%;background:var(--green);border-radius:6px 0 0 6px;width:${totalRev+totalExp>0?Math.round(totalRev/(totalRev+totalExp)*100):0}%;transition:width 1s ease"></div>
        <div style="height:100%;background:var(--red);flex:1;border-radius:0 6px 6px 0"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:.4rem;font-size:.68rem;color:var(--dim)">
        <span>🟢 إيرادات ${Math.round(totalRev/(totalRev+totalExp)*100)}%</span>
        <span>🔴 نفقات ${Math.round(totalExp/(totalRev+totalExp)*100)}%</span>
      </div>
    </div>` : ''}

    <!-- جدول تفصيلي لكل مؤسسة -->
    <div style="font-size:.82rem;font-weight:800;color:var(--muted);margin-bottom:.7rem">🏢 تحليل تفصيلي لكل مؤسسة</div>
    ${tenants.length === 0 ? `<div style="text-align:center;padding:2rem;color:var(--dim);font-size:.85rem">لا توجد مؤسسات مسجلة بعد</div>` : `
    <div class="table-wrap" style="border:1px solid rgba(155,109,255,0.15);border-radius:12px">
      <table>
        <thead>
          <tr style="background:rgba(155,109,255,0.06)">
            <th>المؤسسة</th>
            <th style="text-align:center">🏥 الصحة</th>
            <th style="text-align:center">🏗️ المشاريع</th>
            <th style="text-align:center">📈 التقدم</th>
            <th style="text-align:center">👷 العمال</th>
            <th style="text-align:right">💰 الإيرادات/النفقات</th>
            <th style="text-align:right">📊 الربح الصافي</th>
            <th style="text-align:right">📅 إيرادات الشهر</th>
            <th style="text-align:center">🎯 الخطة</th>
          </tr>
        </thead>
        <tbody>${tenantRows}</tbody>
      </table>
    </div>`}

    <!-- تحذيرات ذكية -->
    ${(()=>{
      const warnings = [];
      tenantStats.forEach(({t, delayedP, netProfit, healthScore, tProjects}) => {
        if (delayedP > 0) warnings.push({ icon: '⚠️', color: 'var(--red)', msg: `مؤسسة «${t.name}» لديها ${delayedP} مشروع متأخر` });
        if (netProfit < 0 && tProjects.length > 0) warnings.push({ icon: '💸', color: 'var(--red)', msg: `مؤسسة «${t.name}» تسجل خسارة صافية: ${fmt(Math.abs(netProfit))} دج` });
        if (healthScore < 40 && tProjects.length > 0) warnings.push({ icon: '🚨', color: '#FF7043', msg: `مؤسسة «${t.name}» بمؤشر صحة منخفض جداً (${healthScore}%)` });
      });
      if (!warnings.length) return `
        <div style="margin-top:1rem;padding:.8rem 1rem;background:rgba(52,195,143,0.06);border:1px solid rgba(52,195,143,0.2);border-radius:10px;display:flex;align-items:center;gap:.6rem">
          <span style="font-size:1.1rem">✅</span>
          <span style="font-size:.8rem;color:var(--green);font-weight:700">جميع المؤسسات في حالة جيدة — لا توجد تنبيهات</span>
        </div>`;
      return `
        <div style="margin-top:1rem">
          <div style="font-size:.78rem;font-weight:800;color:var(--muted);margin-bottom:.5rem">🚨 تنبيهات SmartAI</div>
          ${warnings.map(w=>`
            <div style="padding:.6rem .9rem;background:rgba(240,78,106,0.06);border:1px solid rgba(240,78,106,0.18);border-radius:8px;display:flex;align-items:center;gap:.6rem;margin-bottom:.4rem">
              <span style="font-size:1rem">${w.icon}</span>
              <span style="font-size:.78rem;color:${w.color};font-weight:700">${w.msg}</span>
            </div>
          `).join('')}
        </div>`;
    })()}
  </div>`;
}

function refreshSmartAIAnalytics() {
  const card = document.getElementById('smartai-analytics-card');
  if (!card) return;
  // إعادة رسم القسم كاملاً
  card.style.opacity = '0.5';
  card.style.transition = 'opacity .2s';
  setTimeout(() => {
    const newHtml = renderSmartAIAnalytics();
    card.outerHTML = newHtml;
    // إضافة بريق تحديث
    const newCard = document.getElementById('smartai-analytics-card');
    if (newCard) {
      newCard.style.opacity = '1';
      newCard.style.boxShadow = '0 0 0 2px rgba(155,109,255,0.5)';
      setTimeout(() => { if(newCard) newCard.style.boxShadow = ''; }, 1200);
    }
  }, 200);
}

// ── مراقبة التغييرات في localStorage لتحديث التحليلات تلقائياً ──
(function() {
  const _origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, val) {
    _origSet.call(this, key, val);
    if (key && key.startsWith('sbtp5_') && typeof refreshSmartAIAnalytics === 'function') {
      const card = document.getElementById('smartai-analytics-card');
      if (card) {
        // تأخير بسيط للسماح للبيانات بالاستقرار
        clearTimeout(window._smartAIRefreshTimer);
        window._smartAIRefreshTimer = setTimeout(refreshSmartAIAnalytics, 600);
      }
    }
  };
})();

function renderAIProviderSettings() {
  const cfg = getAIConfig();
  const currentProvider = AI_PROVIDERS.find(p => p.id === cfg.provider) || AI_PROVIDERS[0];
  const statusClass = cfg.status === 'active' ? 'ai-status-active' : cfg.status === 'error' ? 'ai-status-error' : 'ai-status-inactive';
  const statusLabel = cfg.status === 'active' ? '✅ متصل ويعمل' : cfg.status === 'error' ? '❌ خطأ في الاتصال' : '⚪ غير مفعّل';

  const defaultKeySet = !!DEFAULT_AI_CONFIG.apiKey;
  return `
  <!-- ── بانر المفتاح الافتراضي ── -->
  <div style="background:${defaultKeySet ? 'rgba(52,195,143,0.08)' : 'rgba(232,184,75,0.08)'};border:1px solid ${defaultKeySet ? 'rgba(52,195,143,0.3)' : 'rgba(232,184,75,0.3)'};border-radius:14px;padding:1rem 1.2rem;margin-bottom:1rem">
    <div style="display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;margin-bottom:${defaultKeySet ? '.7rem' : '0'}">
      <div style="font-size:1.5rem">${defaultKeySet ? '✅' : '⚠️'}</div>
      <div style="flex:1">
        <div style="font-weight:900;font-size:.88rem;color:${defaultKeySet ? '#34C38F' : '#E8B84B'}">${defaultKeySet ? 'الروبوت مُفعَّل — يشتغل لجميع المؤسسات تلقائياً' : 'أدخل مفتاح API أدناه ثم حمّل الملف المحدَّث'}</div>
        <div style="font-size:.72rem;color:var(--dim);margin-top:.2rem">${defaultKeySet ? `${DEFAULT_AI_CONFIG.provider} • ${DEFAULT_AI_CONFIG.model.split('-').slice(0,3).join('-')}` : 'اختبر الاتصال ← حمّل index.html المحدَّث ← ارفعه على GitHub'}</div>
      </div>
    </div>
    ${defaultKeySet ? `
    <button onclick="downloadUpdatedHTML(DEFAULT_AI_CONFIG.apiKey, DEFAULT_AI_CONFIG.provider, DEFAULT_AI_CONFIG.model)" style="background:linear-gradient(135deg,#34C38F,#20996F);color:#fff;border:none;border-radius:10px;padding:.55rem 1.2rem;font-size:.8rem;font-weight:900;cursor:pointer;font-family:inherit;width:100%">
      📥 تحميل index.html محدَّث (المفتاح مدمج — جاهز للرفع على GitHub)
    </button>` : ''}
  </div>

  <div class="card" style="margin-top:0;border-color:rgba(155,109,255,0.3);background:linear-gradient(135deg,rgba(155,109,255,0.04),rgba(107,63,212,0.02))">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:.7rem">
      <div style="display:flex;align-items:center;gap:.8rem">
        <div style="width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#9B6DFF,#6B3FD4);display:flex;align-items:center;justify-content:center;font-size:1.4rem;box-shadow:0 6px 20px rgba(155,109,255,0.4)">🤖</div>
        <div>
          <div style="font-size:1rem;font-weight:900">SmartAI — إعدادات وكيل الذكاء الاصطناعي</div>
          <div style="font-size:.75rem;color:var(--muted)">بعد الحفظ والاختبار، انسخ مفتاحك وضعه في DEFAULT_AI_CONFIG.apiKey في الكود</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:.6rem">
        <span class="ai-status-indicator ${statusClass}">${statusLabel}</span>
        ${cfg.lastTested ? `<span style="font-size:.65rem;color:var(--dim)">آخر اختبار: ${new Date(cfg.lastTested).toLocaleTimeString('ar-DZ')}</span>` : ''}
      </div>
    </div>

    <!-- اختيار الوكيل -->
    <div style="font-size:.82rem;font-weight:800;color:var(--muted);margin-bottom:.8rem">🎯 اختر الوكيل (الوكلاء المجانية مُعلَّمة بـ ✅ مجاني)</div>
    <div class="ai-provider-grid" id="aiProviderGrid">
      ${AI_PROVIDERS.map(p => `
        <div class="ai-provider-card ${cfg.provider === p.id ? 'selected' : ''}"
             onclick="selectAIProvider('${p.id}')" id="apcard_${p.id}">
          <div class="ai-provider-logo" style="background:${p.logoColor}22;border:1px solid ${p.logoColor}44">${p.logo}</div>
          <div class="ai-provider-name">${p.name}</div>
          <div class="ai-provider-desc">${p.desc}</div>
          <div class="ai-provider-badges">
            ${p.badges.includes('free') ? '<span class="ai-provider-badge badge-free">✅ مجاني</span>' : ''}
            ${p.badges.includes('fast') ? '<span class="ai-provider-badge badge-fast">⚡ سريع جداً</span>' : ''}
            ${p.badges.includes('smart') ? '<span class="ai-provider-badge badge-smart">🧠 ذكي</span>' : ''}
            ${p.badges.includes('paid') ? '<span class="ai-provider-badge badge-paid">💳 مدفوع/كريدت</span>' : ''}
          </div>
          <div style="margin-top:.7rem;font-size:.68rem;color:var(--dim)">📊 ${p.freeLimit}</div>
        </div>
      `).join('')}
    </div>

    <!-- إدخال مفتاح API -->
    <div class="ai-key-section" id="aiKeySection">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
        <div style="font-size:.88rem;font-weight:900;color:#B89AFF">
          🔑 مفتاح API — <span id="aiProviderNameLabel">${currentProvider.name}</span>
        </div>
        <a href="${currentProvider.signupUrl}" target="_blank" rel="noopener noreferrer"
           style="font-size:.72rem;color:var(--blue);text-decoration:none;font-weight:700;border:1px solid rgba(74,144,226,0.3);padding:.2rem .6rem;border-radius:8px;transition:all .2s"
           id="aiSignupLink">
          🔗 احصل على مفتاح مجاني ←
        </a>
      </div>

      <!-- تعليمات سريعة -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:.8rem;margin-bottom:.9rem;font-size:.75rem;color:var(--muted);line-height:1.7" id="aiProviderTip">
        💡 <strong style="color:var(--text)">${currentProvider.tip}</strong>
      </div>

      <!-- Model selector -->
      <div class="form-group" style="margin-bottom:.8rem">
        <label class="form-label">🧩 النموذج المستخدم</label>
        <select class="form-select" id="aiModelSelect" style="font-family:'JetBrains Mono',monospace;font-size:.82rem" onchange="saveAIConfig({model:this.value})">
          ${getModelsForProvider(cfg.provider).map(m => `<option value="${m.id}" ${(cfg.model||currentProvider.model)===m.id?'selected':''}>${m.label}</option>`).join('')}
        </select>
      </div>

      <div class="form-group" style="margin-bottom:.6rem">
        <label class="form-label">🔑 API Key</label>
        <div class="ai-key-input-wrap">
          <input class="form-input" type="password" id="aiApiKeyInput"
            value="${cfg.apiKey ? '•'.repeat(Math.min(cfg.apiKey.length, 40)) : ''}"
            placeholder="${currentProvider.keyPlaceholder}"
            dir="ltr"
            onfocus="if(this.value.includes('•'))this.value=''"
            data-real="${escHtml(cfg.apiKey)}">
          <button class="ai-key-eye" onclick="toggleAIKeyVisibility()" title="إظهار/إخفاء">👁️</button>
        </div>
      </div>

      <div id="aiTestResult" class="ai-test-result"></div>

      <div style="display:flex;gap:.6rem;margin-top:.8rem;flex-wrap:wrap">
        <button class="btn btn-purple" onclick="saveAndTestAIKey()" style="flex:1;justify-content:center;min-width:140px">
          💾 حفظ واختبار الاتصال
        </button>
        <button class="btn btn-ghost btn-sm" onclick="clearAIKey()">🗑️ مسح</button>
        <button class="btn btn-ghost btn-sm" onclick="showAIUsageStats()">📊 إحصائيات</button>
      </div>

      <!-- Quota & Usage Info -->
      <div style="margin-top:1rem;padding-top:.8rem;border-top:1px solid rgba(155,109,255,0.15)">
        <div style="font-size:.72rem;font-weight:800;color:var(--dim);margin-bottom:.5rem">📋 معلومات الوكيل الحالي</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem" id="aiProviderInfo">
          <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:.5rem .7rem;font-size:.72rem">
            <div style="color:var(--dim)">الحد اليومي المجاني</div>
            <div style="font-weight:700;color:var(--green)">${currentProvider.freeLimit}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:.5rem .7rem;font-size:.72rem">
            <div style="color:var(--dim)">النموذج الافتراضي</div>
            <div style="font-weight:700;color:#B89AFF;font-family:monospace">${currentProvider.model.split('/').pop()}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:.5rem .7rem;font-size:.72rem">
            <div style="color:var(--dim)">جلسات AI اليوم</div>
            <div style="font-weight:700;color:var(--blue)" id="aiSessionCount">
              ${JSON.parse(sessionStorage.getItem('ai_session_stats')||'{"count":0}').count || 0}
            </div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:.5rem .7rem;font-size:.72rem">
            <div style="color:var(--dim)">حالة الاتصال</div>
            <div style="font-weight:700" class="${statusClass}">${statusLabel}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- معلومات أمنية -->
    <div style="margin-top:1rem;display:flex;align-items:flex-start;gap:.5rem;font-size:.72rem;color:var(--dim);background:rgba(255,255,255,0.02);border-radius:10px;padding:.7rem .9rem">
      <span>🔒</span>
      <span>مفتاح API يُحفظ فقط في متصفحك المحلي (localStorage) ولا يُرسل لأي خادم خارجي. استخدم دائماً مفاتيح بأذونات محدودة وقابلة للإلغاء.</span>
    </div>
  </div>`;
}

function getModelsForProvider(providerId) {
  const models = {
    groq: [
      { id: 'llama-3.3-70b-versatile', label: '⭐ LLaMA 3.3 70B (مجاني - موصى به)' },
      { id: 'llama-3.1-8b-instant', label: '⚡ LLaMA 3.1 8B Instant (مجاني - أسرع)' },
      { id: 'mixtral-8x7b-32768', label: '🔀 Mixtral 8x7B (مجاني)' },
      { id: 'gemma2-9b-it', label: '🔵 Gemma 2 9B (مجاني)' },
    ],
    openrouter_free: [
      { id: 'mistralai/mistral-7b-instruct:free', label: '⭐ Mistral 7B (مجاني - موصى به)' },
      { id: 'google/gemma-2-9b-it:free', label: '🔵 Gemma 2 9B (مجاني)' },
      { id: 'meta-llama/llama-3.2-3b-instruct:free', label: '🦙 LLaMA 3.2 3B (مجاني)' },
      { id: 'microsoft/phi-3-mini-128k-instruct:free', label: '🔬 Phi-3 Mini (مجاني)' },
    ],
    gemini: [
      { id: 'gemini-1.5-flash', label: '⭐ Gemini 1.5 Flash (مجاني - موصى به)' },
      { id: 'gemini-1.5-flash-8b', label: '⚡ Gemini 1.5 Flash 8B (مجاني - أسرع)' },
      { id: 'gemini-1.0-pro', label: '🔵 Gemini 1.0 Pro (مجاني)' },
    ],
    together: [
      { id: 'meta-llama/Llama-3-70b-chat-hf', label: '⭐ LLaMA 3 70B (موصى به)' },
      { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', label: '🔀 Mixtral 8x22B' },
      { id: 'meta-llama/Llama-3-8b-chat-hf', label: '⚡ LLaMA 3 8B (أسرع)' },
    ],
    claude: [
      { id: 'claude-sonnet-4-6', label: '⭐ Claude Sonnet 4.6 (موصى به)' },
      { id: 'claude-haiku-4-5-20251001', label: '⚡ Claude Haiku 4.5 (أسرع وأرخص)' },
    ],
  };
  return models[providerId] || models.groq;
}

function selectAIProvider(providerId) {
  const provider = AI_PROVIDERS.find(p => p.id === providerId);
  if (!provider) return;

  // تحديث CSS
  document.querySelectorAll('.ai-provider-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('apcard_' + providerId);
  if (card) card.classList.add('selected');

  // تحديث التسمية والرابط والنصيحة
  const nameLabel = document.getElementById('aiProviderNameLabel');
  const signupLink = document.getElementById('aiSignupLink');
  const tipEl = document.getElementById('aiProviderTip');
  const modelSelect = document.getElementById('aiModelSelect');
  const infoEl = document.getElementById('aiProviderInfo');

  if (nameLabel) nameLabel.textContent = provider.name;
  if (signupLink) {
    signupLink.href = provider.signupUrl;
    signupLink.textContent = '🔗 احصل على مفتاح مجاني ←';
  }
  if (tipEl) tipEl.innerHTML = `💡 <strong style="color:var(--text)">${provider.tip}</strong>`;
  if (modelSelect) {
    modelSelect.innerHTML = getModelsForProvider(providerId).map(m =>
      `<option value="${m.id}">${m.label}</option>`
    ).join('');
  }
  if (infoEl) {
    infoEl.innerHTML = `
      <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:.5rem .7rem;font-size:.72rem">
        <div style="color:var(--dim)">الحد اليومي المجاني</div>
        <div style="font-weight:700;color:var(--green)">${provider.freeLimit}</div>
      </div>
      <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:.5rem .7rem;font-size:.72rem">
        <div style="color:var(--dim)">النموذج الافتراضي</div>
        <div style="font-weight:700;color:#B89AFF;font-family:monospace">${provider.model.split('/').pop()}</div>
      </div>`;
  }

  // مسح حقل المفتاح
  const keyInput = document.getElementById('aiApiKeyInput');
  if (keyInput) { keyInput.value = ''; keyInput.placeholder = provider.keyPlaceholder; }
  const testResult = document.getElementById('aiTestResult');
  if (testResult) { testResult.className = 'ai-test-result'; testResult.textContent = ''; }

  saveAIConfig({ provider: providerId, model: getModelsForProvider(providerId)[0].id, status: 'inactive' });
}

function toggleAIKeyVisibility() {
  const input = document.getElementById('aiApiKeyInput');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    // استرجاع القيمة الحقيقية من data-real
    const real = input.getAttribute('data-real');
    if (real && input.value.includes('•')) input.value = real;
  } else {
    input.type = 'password';
  }
}

async function saveAndTestAIKey() {
  const input = document.getElementById('aiApiKeyInput');
  const modelSelect = document.getElementById('aiModelSelect');
  const testResult = document.getElementById('aiTestResult');
  if (!input || !testResult) return;

  let apiKey = input.value.trim();
  // إذا كان المستخدم لم يغير الـ placeholder (نقاط)
  if (!apiKey || apiKey.includes('•')) {
    const real = input.getAttribute('data-real');
    apiKey = real || '';
  }
  if (!apiKey) {
    testResult.className = 'ai-test-result error';
    testResult.textContent = '⚠️ أدخل مفتاح API أولاً';
    return;
  }

  const cfg = getAIConfig();
  const provider = AI_PROVIDERS.find(p => p.id === cfg.provider) || AI_PROVIDERS[0];
  const model = modelSelect?.value || provider.model;

  // حفظ فوري
  saveAIConfig({ provider: cfg.provider, apiKey, model, status: 'testing' });
  input.setAttribute('data-real', apiKey);
  input.value = '•'.repeat(Math.min(apiKey.length, 40));
  input.type = 'password';

  testResult.className = 'ai-test-result loading';
  testResult.innerHTML = '<div class="ai-loading-bar" style="width:100px;display:inline-block;height:3px;vertical-align:middle"></div> جاري اختبار الاتصال...';

  try {
    const reply = await testAIConnection(provider, apiKey, model);
    saveAIConfig({ provider: cfg.provider, apiKey, model, status: 'active', lastTested: Date.now() });
    // ── تحديث DEFAULT_AI_CONFIG فوراً في الذاكرة ──
    DEFAULT_AI_CONFIG.apiKey = apiKey;
    DEFAULT_AI_CONFIG.provider = cfg.provider;
    DEFAULT_AI_CONFIG.model = model;
    DEFAULT_AI_CONFIG.endpoint = provider.endpoint || DEFAULT_AI_CONFIG.endpoint;
    DEFAULT_AI_CONFIG.apiStyle = provider.apiStyle || 'openai';
    DEFAULT_AI_CONFIG.status = 'active';

    testResult.className = 'ai-test-result success';
    testResult.innerHTML = `
      <div style="margin-bottom:.8rem;font-size:.88rem;font-weight:800;color:#34C38F">✅ الاتصال ناجح! الروبوت يشتغل الآن.</div>
      <div style="background:rgba(52,195,143,0.08);border:1px solid rgba(52,195,143,0.25);border-radius:12px;padding:1rem">
        <div style="font-size:.8rem;font-weight:900;color:var(--text);margin-bottom:.5rem">📥 لتفعيله لجميع المؤسسات بشكل دائم:</div>
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:.8rem;line-height:1.6">
          اضغط الزر أدناه لتحميل ملف <code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px">index.html</code> محدَّث مع المفتاح مدمج فيه — ثم ارفعه على GitHub بدل القديم.
        </div>
        <button onclick="downloadUpdatedHTML('${apiKey}','${cfg.provider}','${model}')" style="background:linear-gradient(135deg,#34C38F,#20996F);color:#fff;border:none;border-radius:10px;padding:.6rem 1.4rem;font-size:.82rem;font-weight:900;cursor:pointer;font-family:inherit;width:100%">
          📥 تحميل index.html محدَّث (مع المفتاح)
        </button>
      </div>`;
    Toast.success(L('✅ SmartAI تم تفعيله! حمّل الملف المحدَّث وارفعه على GitHub.','✅ SmartAI activé ! Téléchargez le fichier mis à jour.'));

    // تحديث SmartAI engine فوراً
    try {
      if (typeof SmartAI !== 'undefined' && SmartAI) {
        SmartAI.activeProvider = provider;
        SmartAI.activeKey = apiKey;
        SmartAI.activeModel = model;
      }
    } catch(e) {}
    // تحديث status indicator
    setTimeout(() => App.navigate('admin'), 1500);
  } catch(err) {
    testResult.className = 'ai-test-result error';
    testResult.innerHTML = `❌ فشل الاتصال: ${escHtml(err.message)}`;
    saveAIConfig({ ...getAIConfig(), status: 'error', lastTested: Date.now() });
  }
}

async function testAIConnection(provider, apiKey, model) {
  const testMsg = 'قل "مرحبا" فقط';

  if (provider.apiStyle === 'openai') {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    if (provider.id === 'openrouter_free') {
      headers['HTTP-Referer'] = 'https://smartstruct.dz';
      headers['X-Title'] = 'SmartStruct';
    }
    const resp = await fetch(provider.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: testMsg }],
        max_tokens: 30
      })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || 'OK';

  } else if (provider.apiStyle === 'gemini') {
    const url = `${provider.endpoint}?key=${apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: testMsg }] }],
        generationConfig: { maxOutputTokens: 30 }
      })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'OK';

  } else if (provider.apiStyle === 'anthropic') {
    const resp = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        max_tokens: 30,
        messages: [{ role: 'user', content: testMsg }]
      })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return data.content?.[0]?.text || 'OK';
  }

  throw new Error('نوع API غير معروف');
}

function clearAIKey() {
  if (!confirm(L('هل تريد مسح مفتاح API الحالي؟','Effacer la clé API actuelle ?'))) return;
  saveAIConfig({ apiKey: '', status: 'inactive', lastTested: null });
  const input = document.getElementById('aiApiKeyInput');
  if (input) { input.value = ''; input.setAttribute('data-real', ''); }
  const testResult = document.getElementById('aiTestResult');
  if (testResult) { testResult.className = 'ai-test-result'; testResult.textContent = ''; }
  try { if (typeof SmartAI !== 'undefined' && SmartAI) { SmartAI.activeKey = null; } } catch(e) {}
  Toast.success(L('تم مسح مفتاح API','Clé API effacée'));
}

function switchAdminTab(tab) {
  const tabs = ['tenants','ai','notif','supabase'];
  const colors = { tenants:'var(--gold)', ai:'#9B6DFF', notif:'var(--blue)', supabase:'#34C38F' };
  tabs.forEach(t => {
    const btn = document.getElementById('adminTab_' + t);
    const panel = document.getElementById('adminTabContent_' + t);
    if (!btn || !panel) return;
    if (t === tab) {
      btn.style.background = colors[t] || 'var(--gold)';
      btn.style.color = t === 'ai' ? '#fff' : '#1a1a1a';
      panel.style.display = 'block';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--muted)';
      panel.style.display = 'none';
    }
  });
  // ── مزامنة تلقائية عند فتح تبويب Supabase ──
  if (tab === 'supabase' && typeof DBHybrid !== 'undefined') {
    // تحديث عداد Offline Queue فور فتح التبويب
    if (DBHybrid._updateAdminSyncUI) setTimeout(() => DBHybrid._updateAdminSyncUI(), 50);
  }
  if (tab === 'supabase' && typeof DBHybrid !== 'undefined' && !DBHybrid._useSupabase && SUPABASE_CONFIG.isConfigured) {
    setTimeout(async () => {
      const hbStatus = document.getElementById('hbStatus');
      if (hbStatus) hbStatus.textContent = '⏳ جاري إعادة الاتصال التلقائي...';
      const ok = await DBHybrid.initSupabase().catch(() => false);
      if (hbStatus) hbStatus.textContent = ok ? '✅ متصل — Heartbeat نشط كل 30 ثانية' : '⚠️ غير متصل — تأكد من الإعدادات';
      const badge = document.getElementById('sbStatusBadge');
      if (badge) {
        badge.style.background = ok ? 'rgba(52,195,143,0.1)' : 'rgba(232,184,75,0.1)';
        badge.style.color = ok ? '#34C38F' : '#E8B84B';
        badge.textContent = ok ? '🟢 متصل بـ Supabase' : '🟡 غير متصل';
      }
    }, 300);
  }
}

function showAIUsageStats() {
  const stats = JSON.parse(sessionStorage.getItem('ai_session_stats') || '{"count":0,"tokens":0}');
  const cfg = getAIConfig();
  const provider = AI_PROVIDERS.find(p => p.id === cfg.provider);
  Toast.info(`📊 الجلسة الحالية: ${stats.count} رسالة • الوكيل: ${provider?.name||'—'}`);
}

/* ── تحديث SmartAI ليستخدم مفتاح الإدارة ── */
/* سيتم استدعاء هذه الدالة بعد تعريف SmartAI */
function patchSmartAIWithSavedConfig() {
  try {
    if (typeof SmartAI === 'undefined' || !SmartAI || typeof SmartAI.callAPI !== 'function') {
      console.warn('patchSmartAI: SmartAI not ready yet');
      return;
    }
  } catch(e) { return; }
  const origCallAPI = SmartAI.callAPI.bind(SmartAI);
  SmartAI.callAPI = async function(userMessage) {
    // تتبع الاستخدام
    const stats = JSON.parse(sessionStorage.getItem('ai_session_stats') || '{"count":0}');
    stats.count = (stats.count || 0) + 1;
    sessionStorage.setItem('ai_session_stats', JSON.stringify(stats));

    // ── الـ callAPI الجديد يقرأ الإعداد المركزي مباشرة ──
    return origCallAPI(userMessage);
  };
}

/* ─── ADMIN ─── */
Pages.admin = function() {

  const tenants=DB.get('tenants'), users=DB.get('users'), plans=DB.get('plans');
  const projects=DB.get('projects'), workers=DB.get('workers');
  const totalRevenue = DB.get('transactions').filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);

  const rows=tenants.map(t=>{
    const plan=plans.find(p=>p.id===t.plan_id);
    const uCount=users.filter(u=>u.tenant_id===t.id).length;
    const pCount=projects.filter(p=>p.tenant_id===t.id && !p.is_archived).length;
    const wCount=workers.filter(w=>w.tenant_id===t.id).length;
    const adminUser = users.find(u=>u.tenant_id===t.id && !u.is_admin);
    const subStatus = t.subscription_status;
    const subLbl = subStatus==='active'? L('نشط','Actif') : subStatus==='trial'? L('تجريبي','Essai') : L('منتهي','Expiré');
    const subCls = subStatus==='active'?'badge-active':subStatus==='trial'?'badge-paused':'badge-delayed';
    const planColors = ['var(--blue)','var(--gold)','var(--purple)'];
    const planIdx = plans.findIndex(p=>p.id===t.plan_id);
    const planColor = planColors[planIdx] || 'var(--gold)';
    const createdAtStr = t.created_at ? new Date(t.created_at).toLocaleDateString('ar-DZ',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const planData2 = plans.find(p=>p.id===t.plan_id)||{};
    const maxEmails = planData2.max_emails ?? -1;
    const usedEmails = (DB.get('notifications')||[]).filter(n=>n.tenant_id===t.id && n.type==='new_account').length;
    const emailsLabel = maxEmails === -1 ? '∞ إيميل' : usedEmails + '/' + maxEmails + ' إيميل';
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:.7rem"><div style="width:36px;height:36px;border-radius:10px;background:rgba(232,184,75,.1);border:1px solid rgba(232,184,75,.2);display:flex;align-items:center;justify-content:center;font-size:1rem">🏢</div><div><div style="font-weight:700">${escHtml(t.name)}</div><div style="font-size:.72rem;color:var(--dim)">📍 ${escHtml(t.wilaya||L('غير محدد','Non défini'))} • 📅 ${createdAtStr}</div></div></div></td>
      <td><div dir="ltr" style="font-family:monospace;font-size:.78rem;color:var(--blue)">${escHtml(adminUser?.email||'—')}</div></td>
      <td>
        <div style="display:flex;align-items:center;gap:.4rem">
          <code style="font-family:monospace;font-size:.75rem;background:rgba(255,255,255,.05);padding:2px 7px;border-radius:6px;color:var(--muted)" id="pw_${t.id}">••••••••</code>
          <button class="btn btn-sm btn-ghost" style="padding:.1rem .4rem;font-size:.7rem" onclick="togglePwd(${t.id},'${escHtml(adminUser?.password||'')}')">👁️</button>
        </div>
      </td>
      <td><span class="badge" style="background:rgba(${planIdx===0?'74,144,226':planIdx===1?'232,184,75':'155,109,255'},.1);color:${planColor};border:1px solid rgba(${planIdx===0?'74,144,226':planIdx===1?'232,184,75':'155,109,255'},.2)">${escHtml(plan?.name||'—')}</span></td>
      <td><span class="badge ${subCls}">${subLbl}</span></td>
      <td style="text-align:center;font-size:.78rem;color:${maxEmails!==-1&&usedEmails>=maxEmails?'var(--red)':'var(--muted)'}">${emailsLabel}</td>
      <td style="text-align:center;font-weight:700">${pCount}</td>
      <td style="text-align:center;font-weight:700">${wCount}</td>
      <td>${(()=>{
        const isPending = !t.is_active && t.subscription_status==='pending';
        const cls = t.is_active ? 'badge-active' : isPending ? 'badge-paused' : 'badge-delayed';
        const lbl = t.is_active ? L('نشط','Actif') : isPending ? '⏳ '+L('بانتظار التفعيل','En attente') : L('موقوف','Suspendu');
        return `<span class="badge ${cls}">${lbl}</span>`;
      })()}</td>
      <td>
        <div style="display:flex;gap:.3rem;flex-wrap:wrap">
          <button class="btn btn-sm ${t.is_active?'btn-red':'btn-green'}" onclick="toggleTenant(${t.id})" title="${t.is_active?L('إيقاف المؤسسة','Désactiver l\'entreprise'):L('تفعيل المؤسسة','Activer l\'entreprise')}">${t.is_active?'⏸️':'▶️'}</button>
          <button class="btn btn-sm btn-blue" onclick="editTenantPlan(${t.id})" title="${L('تعديل الخطة','Modifier le plan')}">⚙️</button>
          <button class="btn btn-sm btn-ghost" onclick="openSubInvoicesModal(${t.id})" title="${L('فواتير الاشتراك','Factures abonnement')}">🧾</button>
          <button class="btn btn-sm btn-red" onclick="deleteTenantAccount(${t.id})" title="${L('حذف المؤسسة نهائياً','Supprimer définitivement')}">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  const featuresAr = ['لوحة التحكم 🏠','المشاريع 🏗️','الرواتب 💵','الحضور 📋','التقارير 📈','الفواتير 🧾'];
  const featuresFr = ['Tableau de bord 🏠','Projets 🏗️','Salaires 💵','Présence 📋','Rapports 📈','Factures 🧾'];
  const features = L('ar','fr') === 'ar' ? featuresAr : featuresFr;

  return `<div class="app-shell"><div class="sidebar-overlay" id="sidebarOverlay"></div>${sidebarHTML('admin')}
    <div class="main-wrap">
      ${topbarHTML(L('لوحة الإدارة','Panneau d\'administration'))}
      <main class="page-content animate-fade">
        <!-- Header -->
        <div class="page-header">
          <div>
            <div class="page-title">👑 ${L('لوحة إدارة النظام','Tableau d\'administration')}</div>
            <div class="page-sub">${L('مرحباً بك في مركز التحكم الكامل بـ SmartStruct','Bienvenue dans le centre de contrôle complet de SmartStruct')}</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-ghost btn-sm" data-nav="landing">🌐 ${L('الموقع','Site')}</button>
            <button id="syncAdminBtn" class="btn btn-ghost btn-sm" onclick="syncAdminFromSupabase()">🔄 ${L('تحديث من Supabase','Sync Supabase')}</button>
            <button class="btn btn-ghost btn-sm" onclick="cleanupDuplicateTenants()" title="${L('حذف المؤسسات المكررة والمستخدمين اليتامى','Supprimer les doublons')}">🧹 ${L('تنظيف التكرارات','Nettoyer doublons')}</button>
            <button class="btn btn-gold" data-modal-open="addTenantModal">+ ${L('إضافة مؤسسة','Ajouter entreprise')}</button>
          </div>
        </div>

        <!-- Admin Tabs -->
        <div style="display:flex;gap:.4rem;margin-bottom:1.5rem;background:rgba(255,255,255,0.03);border:1px solid var(--border2);border-radius:14px;padding:.35rem">
          <button id="adminTab_tenants" onclick="switchAdminTab('tenants')"
            style="flex:1;padding:.55rem 1rem;border-radius:10px;font-size:.82rem;font-weight:800;border:none;cursor:pointer;transition:all .2s;background:var(--gold);color:#1a1a1a">
            🏢 المؤسسات والإحصائيات
          </button>
          <button id="adminTab_ai" onclick="switchAdminTab('ai')"
            style="flex:1;padding:.55rem 1rem;border-radius:10px;font-size:.82rem;font-weight:800;border:none;cursor:pointer;transition:all .2s;background:transparent;color:var(--muted)">
            🤖 إعدادات SmartAI
          </button>
          <button id="adminTab_notif" onclick="switchAdminTab('notif')"
            style="flex:1;padding:.55rem 1rem;border-radius:10px;font-size:.82rem;font-weight:800;border:none;cursor:pointer;transition:all .2s;background:transparent;color:var(--muted)">
            📧 الإشعارات والبريد
          </button>
          <button id="adminTab_supabase" onclick="switchAdminTab('supabase')"
            style="flex:1;padding:.55rem 1rem;border-radius:10px;font-size:.82rem;font-weight:800;border:none;cursor:pointer;transition:all .2s;background:transparent;color:var(--muted)">
            🗄️ قاعدة البيانات Supabase
          </button>
        </div>

        <!-- TAB CONTENT: المؤسسات -->
        <div id="adminTabContent_tenants" style="display:block">

        <!-- Stats -->
        <div class="stats-grid" style="grid-template-columns:repeat(5,1fr)">
          <div class="stat-card"><div class="stat-icon">🏢</div><div class="stat-value" style="color:var(--green)">${tenants.filter(t=>t.is_active).length}</div><div class="stat-label">${L('مؤسسات نشطة','Entreprises actives')}</div></div>
          <div class="stat-card"><div class="stat-icon">👤</div><div class="stat-value" style="color:var(--blue)">${users.filter(u=>u.is_active).length}</div><div class="stat-label">${L('مستخدمون','Utilisateurs')}</div></div>
          <div class="stat-card"><div class="stat-icon">🏗️</div><div class="stat-value" style="color:var(--gold)">${projects.filter(p=>!p.is_archived).length}</div><div class="stat-label">${L('مشاريع','Projets')}</div></div>
          <div class="stat-card"><div class="stat-icon">👷</div><div class="stat-value" style="color:var(--purple)">${workers.length}</div><div class="stat-label">${L('عمال','Ouvriers')}</div></div>
          <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value" style="color:var(--green);font-size:1rem">${fmt(totalRevenue)}</div><div class="stat-label">${L('إجمالي الإيرادات (دج)','Total revenus (DA)')}</div></div>
        </div>

        <!-- Usage Analytics -->
        <div class="card" style="margin-bottom:1.5rem">
          <div style="font-size:.9rem;font-weight:800;margin-bottom:1rem">📊 ${L('تحليلات الاستخدام','Analytiques d\'utilisation')}</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem">
            <div class="admin-stat-card">
              <div class="admin-stat-val">${tenants.length > 0 ? Math.round(projects.filter(p=>!p.is_archived).length / tenants.length * 10) / 10 : 0}</div>
              <div class="admin-stat-lbl">${L('متوسط المشاريع لكل مؤسسة','Moy. projets par entreprise')}</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-val" style="color:var(--green)">${tenants.filter(t=>t.subscription_status==='active').length}</div>
              <div class="admin-stat-lbl">${L('اشتراكات مدفوعة نشطة','Abonnements actifs payants')}</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-val" style="color:var(--gold)">${tenants.filter(t=>t.subscription_status==='trial').length}</div>
              <div class="admin-stat-lbl">${L('في فترة التجربة','En période d\'essai')}</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-val" style="color:var(--red)">${tenants.filter(t=>!t.is_active).length}</div>
              <div class="admin-stat-lbl">${L('مؤسسات معلقة','Entreprises suspendues')}</div>
            </div>
          </div>
          <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
            <div style="font-size:.78rem;font-weight:800;color:var(--dim);margin-bottom:.6rem">🔥 ${L('أكثر الميزات استخداماً (تقديري)','Fonctionnalités les plus utilisées (estimé)')}</div>
            <div style="display:flex;flex-wrap:wrap;gap:.5rem">
              ${(I18N.currentLang==='ar'?featuresAr:featuresFr).map(f=>`
                <span style="background:rgba(232,184,75,.1);border:1px solid rgba(232,184,75,.2);color:var(--gold);padding:3px 10px;border-radius:20px;font-size:.72rem;font-weight:700">${f}</span>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Plan Distribution -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem">
          ${plans.map(p=>{
            const cnt=tenants.filter(t=>t.plan_id===p.id).length;
            const pct=tenants.length?Math.round(cnt/tenants.length*100):0;
            const colors=['var(--blue)','var(--gold)','var(--purple)'];
            const idx=plans.indexOf(p);
            return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem"><div style="font-weight:800;font-size:.9rem">${L('خطة','Plan')} ${escHtml(p.name)}</div><span style="font-weight:900;font-size:1.3rem;color:${colors[idx]}">${cnt}</span></div>
              <div class="progress-bar" style="margin-bottom:.4rem"><div class="progress-fill" style="background:${colors[idx]}" data-width="${pct}"></div></div>
              <div style="font-size:.75rem;color:var(--dim)">${fmt(p.price)} ${L('دج / شهر','DA / mois')} • ${pct}% ${L('من المؤسسات','des entreprises')}</div></div>`;
          }).join('')}
        </div>

        <!-- Tenants Table -->
        <div class="card" style="padding:0">
          <div style="padding:1.2rem 1.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <div style="font-weight:800">🏢 ${L('قائمة المؤسسات','Liste des entreprises')}</div>
            <span style="font-size:.78rem;color:var(--dim)">${tenants.length} ${L('مؤسسة مسجلة','entreprise(s) enregistrée(s)')}</span>
          </div>
          <div class="table-wrap" style="border:none;border-radius:0">
            <table>
              <thead><tr><th>${L('المؤسسة','Entreprise')}</th><th>${L('البريد الإلكتروني','Email')}</th><th>${L('كلمة المرور','Mot de passe')}</th><th>${L('الخطة','Plan')}</th><th>${L('الاشتراك','Abonnement')}</th><th>📧 الإيميلات</th><th>${L('المشاريع','Projets')}</th><th>${L('العمال','Ouvriers')}</th><th>${L('الحالة','Statut')}</th><th>${L('إجراء','Action')}</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>

        <!-- Recent Users -->
        <div class="card" style="margin-top:1rem">
          <div style="font-weight:800;margin-bottom:1rem">👥 ${L('المستخدمون','Utilisateurs')}</div>
          <div class="table-wrap"><table>
            <thead><tr><th>${L('الاسم','Nom')}</th><th>${L('البريد الإلكتروني','Email')}</th><th>${L('الدور','Rôle')}</th><th>${L('الحالة','Statut')}</th></tr></thead>
            <tbody>${users.filter(u=>!u.is_admin).map(u=>{
              const tenant=tenants.find(t=>t.id===u.tenant_id);
              return `<tr><td style="font-weight:700">${escHtml(u.full_name)}</td>
                <td style="font-family:monospace;font-size:.82rem;direction:ltr;text-align:right">${escHtml(u.email)}</td>
                <td>${escHtml(tenant?.name||'—')}</td>
                <td><span class="badge ${u.is_active?'badge-active':'badge-delayed'}">${u.is_active?L('نشط','Actif'):L('موقوف','Suspendu')}</span></td></tr>`;
            }).join('')}</tbody>
          </table></div>
        </div>

        </div><!-- END adminTabContent_tenants -->

        <!-- TAB CONTENT: الإشعارات والبريد -->
        <div id="adminTabContent_notif" style="display:none">

        <!-- ══ Notifications Panel ══ -->
        ${(()=>{
          const notifs = (DB.get('notifications')||[]).filter(n=>!n.read||n.status==='pending');
          if(!notifs.length) return '';
          const nrows = notifs.map(n=>{
            const isReset   = n.type==='reset_password';
            const isUpgrade = n.type==='upgrade_request';
            const isNew     = n.type==='new_account';
            const icon    = isReset ? '🔑' : isUpgrade ? '⬆️' : '🆕';
            const badge   = isReset ? 'badge-delayed' : isUpgrade ? 'badge-paused' : 'badge-paused';
            const badgeTxt= isReset ? L('إعادة كلمة مرور','Réinitialisation MDP') : isUpgrade ? 'طلب ترقية' : L('حساب جديد — بانتظار التفعيل','Nouveau compte — En attente');
            const dateStr = new Date(n.date).toLocaleDateString(I18N.currentLang==='ar'?'ar-DZ':'fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
            // تحقق هل الحساب لا يزال معلقاً
            const linkedUser = isNew ? (DB.get('users')||[]).find(u=>u.id===n.user_id) : null;
            const isPending  = linkedUser && !linkedUser.is_active;
            return `<tr>
              <td><span style="font-size:1.3rem">${icon}</span></td>
              <td style="font-weight:700">${escHtml(n.title)}</td>
              <td style="font-size:.82rem;color:var(--muted)">${escHtml(n.body)}</td>
              <td><span class="badge ${isPending?'badge-paused':badge}">${isPending?'⏳ '+badgeTxt:(isNew?'✅ مُفعَّل':badgeTxt)}</span></td>
              <td style="font-size:.75rem;color:var(--dim)">${dateStr}</td>
              <td style="display:flex;gap:.4rem;flex-wrap:wrap">
                ${isNew && isPending ? `<button class="btn btn-green btn-sm" onclick="activateAccount(${n.id},${n.user_id},${n.tenant_id})">✅ تفعيل وإرسال إيميل</button>` : ''}
                ${isNew && !isPending ? `<span style="font-size:.75rem;color:var(--green)">✅ مُفعَّل</span>` : ''}
                ${isReset && n.status==='pending' ? `<button class="btn btn-gold btn-sm" onclick="openResetModal(${n.id},${n.user_id})">🔐 ${L('تعيين كلمة مرور','Définir MDP')}</button>` : ''}
                ${isUpgrade && n.status==='pending' ? `<button class="btn btn-green btn-sm" onclick="approveUpgrade(${n.id},${n.tenant_id})">✅ موافقة</button><button class="btn btn-red btn-sm" onclick="rejectUpgrade(${n.id})">❌ رفض</button>` : ''}
                <button class="btn btn-ghost btn-sm" onclick="dismissNotif(${n.id})">✓ ${L('إخفاء','Masquer')}</button>
              </td>
            </tr>`;
          }).join('');
          return `<div class="card" style="margin-bottom:1rem;border-color:rgba(232,184,75,.25)">
            <div style="font-weight:800;margin-bottom:1rem;display:flex;align-items:center;gap:.5rem">
              🔔 ${L('الإشعارات','Notifications')}
              <span style="background:var(--red);color:#fff;border-radius:20px;padding:1px 8px;font-size:.7rem;font-weight:800">${notifs.length}</span>
            </div>
            <div class="table-wrap"><table>
              <thead><tr><th></th><th>${L('العنوان','Titre')}</th><th>${L('التفاصيل','Détails')}</th><th>${L('النوع','Type')}</th><th>${L('التاريخ','Date')}</th><th>${L('الإجراء','Action')}</th></tr></thead>
              <tbody>${nrows}</tbody>
            </table></div>
          </div>`;
        })()}

        <!-- ══ EmailJS Notifications System ══ -->
        ${(()=>{
          const cfg = getEmailJSConfig();
          const allNotifs = DB.get('notifications') || [];
          const sentNew   = allNotifs.filter(n=>n.type==='new_account').length;
          const sentReset = allNotifs.filter(n=>n.type==='reset_password').length;
          const last5     = allNotifs.slice(0,5);
          return `
        <div class="card" style="margin-top:1.5rem;border-color:rgba(52,195,143,.25)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;flex-wrap:wrap;gap:.5rem">
            <div style="display:flex;align-items:center;gap:.7rem">
              <div style="width:40px;height:40px;border-radius:12px;background:rgba(52,195,143,.12);border:1px solid rgba(52,195,143,.25);display:flex;align-items:center;justify-content:center;font-size:1.3rem">📧</div>
              <div>
                <div style="font-weight:800;font-size:.95rem">${L('نظام إشعارات البريد الإلكتروني','Système de notifications email')}</div>
                <div style="font-size:.72rem;color:var(--muted)">EmailJS — ${L('قابل للتعديل من هنا','Configurable depuis ici')}</div>
              </div>
            </div>
            <span style="background:rgba(52,195,143,.12);color:var(--green);border:1px solid rgba(52,195,143,.3);border-radius:20px;padding:3px 12px;font-size:.72rem;font-weight:800">● ${L('مُفعَّل','Activé')}</span>
          </div>

          <!-- إحصاء -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin-bottom:1.2rem">
            <div style="background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:10px;padding:.8rem;text-align:center">
              <div style="font-size:1.5rem;font-weight:900;color:var(--green)">${sentNew+sentReset}</div>
              <div style="font-size:.7rem;color:var(--muted)">${L('إجمالي الإيميلات','Total emails')}</div>
            </div>
            <div style="background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:10px;padding:.8rem;text-align:center">
              <div style="font-size:1.5rem;font-weight:900;color:var(--blue)">${sentNew}</div>
              <div style="font-size:.7rem;color:var(--muted)">${L('حسابات جديدة','Nouveaux comptes')}</div>
            </div>
            <div style="background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:10px;padding:.8rem;text-align:center">
              <div style="font-size:1.5rem;font-weight:900;color:var(--gold)">${sentReset}</div>
              <div style="font-size:.7rem;color:var(--muted)">${L('طلبات كلمة مرور','Demandes MDP')}</div>
            </div>
          </div>

          <!-- نموذج التعديل -->
          <div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:12px;padding:1.2rem;margin-bottom:1rem">
            <div style="font-size:.8rem;font-weight:800;color:var(--muted);margin-bottom:1rem;display:flex;align-items:center;gap:.4rem">
              ⚙️ ${L('إعدادات EmailJS — قابلة للتعديل','Configuration EmailJS — Modifiable')}
            </div>
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label" style="font-size:.75rem">Service ID</label>
                <input class="form-input" id="ejs_service" value="${escHtml(cfg.SERVICE_ID)}" dir="ltr" style="font-family:monospace;font-size:.82rem" placeholder="service_xxxxxxx">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:.75rem">Public Key</label>
                <input class="form-input" id="ejs_pubkey" value="${escHtml(cfg.PUBLIC_KEY)}" dir="ltr" style="font-family:monospace;font-size:.82rem" placeholder="user_xxxxxxxxx">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:.75rem">Template ID — ${L('حساب جديد','Nouveau compte')}</label>
                <input class="form-input" id="ejs_tmpl_admin" value="${escHtml(cfg.TEMPLATE_ADMIN)}" dir="ltr" style="font-family:monospace;font-size:.82rem" placeholder="template_xxxxxxx">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:.75rem">Template ID — ${L('كلمة المرور','Mot de passe')}</label>
                <input class="form-input" id="ejs_tmpl_user" value="${escHtml(cfg.TEMPLATE_USER)}" dir="ltr" style="font-family:monospace;font-size:.82rem" placeholder="template_xxxxxxx">
              </div>
              <div class="form-group" style="grid-column:1/-1">
                <label class="form-label" style="font-size:.75rem">📬 ${L('إيميل استقبال الإشعارات (المسؤول)','Email réception des notifications (admin)')}</label>
                <input class="form-input" id="ejs_email" value="${escHtml(cfg.ADMIN_EMAIL)}" type="email" dir="ltr" style="font-size:.85rem" placeholder="admin@example.com">
              </div>
            </div>
            <div style="display:flex;gap:.6rem;margin-top:.4rem;flex-wrap:wrap">
              <button class="btn btn-gold" onclick="saveEmailJSSettings()" style="flex:1;justify-content:center">
                💾 ${L('حفظ الإعدادات','Enregistrer la configuration')}
              </button>
              <button class="btn btn-ghost btn-sm" onclick="testEmailJS(event)">
                🧪 ${L('اختبار الاتصال','Tester connexion')}
              </button>
              <button class="btn btn-ghost btn-sm" onclick="resetEmailJSSettings()">
                🔄 ${L('إعادة الضبط','Réinitialiser')}
              </button>
            </div>
          </div>

          <!-- قنوات الإشعارات -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin-bottom:1rem">
            <div style="padding:.6rem .8rem;background:rgba(52,195,143,.05);border:1px solid rgba(52,195,143,.12);border-radius:8px;font-size:.75rem">
              <div style="font-weight:700;margin-bottom:2px">✅ ${L('حساب جديد','Nouveau compte')}</div>
              <div style="color:var(--muted)">${L('إيميل للمسؤول','Email → admin')}</div>
            </div>
            <div style="padding:.6rem .8rem;background:rgba(232,184,75,.05);border:1px solid rgba(232,184,75,.12);border-radius:8px;font-size:.75rem">
              <div style="font-weight:700;margin-bottom:2px">✅ ${L('طلب كلمة مرور','Demande MDP')}</div>
              <div style="color:var(--muted)">${L('إيميل للمسؤول','Email → admin')}</div>
            </div>
            <div style="padding:.6rem .8rem;background:rgba(74,144,226,.05);border:1px solid rgba(74,144,226,.12);border-radius:8px;font-size:.75rem">
              <div style="font-weight:700;margin-bottom:2px">✅ ${L('كلمة مرور جديدة','Nouveau MDP')}</div>
              <div style="color:var(--muted)">${L('إيميل للمستخدم','Email → utilisateur')}</div>
            </div>
          </div>

          <!-- سجل آخر الإشعارات -->
          ${last5.length ? `
          <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden">
            <div style="padding:.5rem 1rem;background:rgba(255,255,255,.03);border-bottom:1px solid var(--border);font-size:.73rem;font-weight:800;color:var(--muted)">
              📋 ${L('آخر الإشعارات المُرسلة','Dernières notifications envoyées')}
            </div>
            ${last5.map(n=>{
              const isReset = n.type==='reset_password';
              const icon  = isReset ? '🔑' : '🆕';
              const color = isReset ? 'var(--gold)' : 'var(--green)';
              const label = isReset ? L('طلب MDP','Demande MDP') : L('حساب جديد','Nouveau compte');
              const date  = new Date(n.date).toLocaleDateString(I18N.currentLang==='ar'?'ar-DZ':'fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
              const statusIcon = n.status==='done'?'✅':n.status==='pending'?'⏳':'👁️';
              return `<div style="display:flex;align-items:center;gap:.7rem;padding:.5rem 1rem;border-bottom:1px solid var(--border);font-size:.77rem">
                <span>${icon}</span>
                <div style="flex:1;min-width:0;overflow:hidden">
                  <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(n.body)}</div>
                  <div style="font-size:.67rem;color:var(--muted)">${date}</div>
                </div>
                <span style="color:${color};font-size:.7rem;font-weight:700;white-space:nowrap">${label}</span>
                <span>${statusIcon}</span>
              </div>`;
            }).join('')}
          </div>` : `<div style="text-align:center;padding:.8rem;color:var(--muted);font-size:.8rem">📭 ${L('لا توجد إشعارات بعد','Aucune notification encore')}</div>`}
        </div>`;
        })()}

        </div><!-- END adminTabContent_notif -->

        <!-- TAB CONTENT: SmartAI -->
        <div id="adminTabContent_ai" style="display:none">
          ${renderAIProviderSettings()}
        </div><!-- END adminTabContent_ai -->

        <!-- TAB CONTENT: Supabase -->
        <div id="adminTabContent_supabase" style="display:none">
          ${typeof SupabaseSettings !== 'undefined' ? SupabaseSettings.renderCard() : `
          <div class="card" style="background:rgba(52,195,143,0.03);border:1px solid rgba(52,195,143,0.2)">
            <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:1.2rem">
              <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#34C38F,#0e9f6e);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">🗄️</div>
              <div>
                <div style="font-size:.95rem;font-weight:900">Supabase — ربط قاعدة البيانات</div>
                <div style="font-size:.7rem;color:var(--dim)">أدخل بيانات مشروعك من supabase.com → Settings → API</div>
              </div>
              <div id="sbStatusBadge" style="margin-right:auto;padding:3px 10px;border-radius:20px;font-size:.68rem;font-weight:800;background:rgba(232,184,75,0.1);color:#E8B84B;border:1px solid rgba(232,184,75,0.3)">
                🔴 غير متصل
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr;gap:.7rem;margin-bottom:1rem">
              <div class="form-group" style="margin:0">
                <label class="form-label" style="font-size:.75rem">🔗 Project URL</label>
                <input class="form-input" id="sbUrlInput" dir="ltr" style="font-family:monospace;font-size:.78rem"
                  placeholder="https://xxxxxxxxxxxx.supabase.co"
                  value="\${(()=>{try{return JSON.parse(localStorage.getItem('sbtp_supabase_config')||'{}').url||''}catch(e){return ''}})()\}">
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label" style="font-size:.75rem">🔑 Anon Public Key</label>
                <input class="form-input" id="sbKeyInput" dir="ltr" style="font-family:monospace;font-size:.78rem"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value="\${(()=>{try{return JSON.parse(localStorage.getItem('sbtp_supabase_config')||'{}').anonKey||''}catch(e){return ''}})()\}">
              </div>
            </div>
            <div style="display:flex;gap:.6rem;flex-wrap:wrap">
              <button class="btn btn-green" style="flex:1;justify-content:center" onclick="saveSupabaseConfigInline()">
                💾 حفظ واتصال
              </button>
              <button class="btn btn-ghost btn-sm" onclick="testSupabaseConnectionInline()">
                🧪 اختبار الاتصال
              </button>
              <button class="btn btn-ghost btn-sm" onclick="localStorage.removeItem('sbtp_supabase_config');SUPABASE_HARDCODED.url='';SUPABASE_HARDCODED.anonKey='';Toast.success('تم مسح الإعدادات');App.navigate('admin')">
                🗑️ مسح
              </button>
            </div>
            <div id="sbTestResult" style="display:none;margin-top:.7rem;padding:.6rem .8rem;border-radius:8px;font-size:.78rem"></div>
          </div>`}
          
          <!-- Auto-Sync Toggle Card -->
          <div class="card" style="margin-top:1rem;background:rgba(52,195,143,0.03);border:1px solid rgba(52,195,143,0.15)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
              <div>
                <div style="font-weight:800;font-size:.9rem">⚡ المزامنة التلقائية</div>
                <div style="font-size:.72rem;color:var(--dim);margin-top:.2rem">يبقى Supabase متصلاً ويتزامن تلقائياً بدون إعادة اتصال</div>
              </div>
              <label style="position:relative;display:inline-block;width:48px;height:26px;cursor:pointer">
                <input type="checkbox" id="autoSyncToggle"
                  ${localStorage.getItem('sbtp_auto_sync')!=='false' ? 'checked' : ''}
                  onchange="toggleAutoSync(this.checked)"
                  style="opacity:0;width:0;height:0">
                <span style="
                  position:absolute;inset:0;border-radius:26px;
                  background:${localStorage.getItem('sbtp_auto_sync')!=='false' ? '#34C38F' : 'rgba(255,255,255,0.1)'};
                  transition:.3s;
                " id="autoSyncSlider"></span>
                <span style="
                  position:absolute;top:3px;right:${localStorage.getItem('sbtp_auto_sync')!=='false' ? '3px' : '22px'};
                  width:20px;height:20px;border-radius:50%;background:#fff;
                  transition:.3s;box-shadow:0 1px 4px rgba(0,0,0,.3);
                " id="autoSyncKnob"></span>
              </label>
            </div>
            
            <!-- Heartbeat + Realtime Status -->
            <div style="display:flex;align-items:center;gap:.6rem;padding:.6rem .8rem;background:rgba(255,255,255,0.03);border-radius:10px;margin-bottom:.5rem">
              <div id="hbDot" style="width:8px;height:8px;border-radius:50%;background:#34C38F;animation:hbPulse 2s infinite"></div>
              <div style="font-size:.75rem;color:var(--muted)" id="hbStatus">
                ${typeof DBHybrid!=='undefined' && DBHybrid._useSupabase ? '✅ متصل — Heartbeat نشط كل 30 ثانية' : '⚠️ غير متصل بـ Supabase'}
              </div>
              <button onclick="forceReconnectSupabase()" class="btn btn-ghost btn-sm" style="margin-right:auto;font-size:.7rem">🔌 إعادة الاتصال</button>
            </div>
            <!-- Realtime WebSocket Status -->
            <div style="display:flex;align-items:center;gap:.6rem;padding:.6rem .8rem;border-radius:10px;margin-bottom:.8rem;
              background:${typeof SmartRealtime!=='undefined'&&SmartRealtime.isLive?'rgba(52,195,143,.07)':'rgba(240,78,106,.07)'};
              border:1px solid ${typeof SmartRealtime!=='undefined'&&SmartRealtime.isLive?'rgba(52,195,143,.2)':'rgba(240,78,106,.2)'};
            ">
              <div id="rtAdminDot" style="font-size:.9rem">${typeof SmartRealtime!=='undefined'&&SmartRealtime.isLive?'🟢':'🔴'}</div>
              <div style="flex:1">
                <div style="font-size:.75rem;color:var(--text);font-weight:700">⚡ Realtime WebSocket</div>
                <div style="font-size:.68rem;color:var(--dim);margin-top:1px">
                  ${typeof SmartRealtime!=='undefined'&&SmartRealtime.isLive
                    ? 'التحديثات الفورية نشطة — جميع المستخدمين يرون التعديلات لحظياً'
                    : 'غير نشط — التحديثات لن تنعكس إلا عند تحديث الصفحة'}
                </div>
              </div>
              <button onclick="if(typeof SmartRealtime!=='undefined'){SmartRealtime.stop();setTimeout(()=>SmartRealtime.start(null),500);Toast.info('⚡ جاري إعادة تشغيل Realtime...');}" class="btn btn-ghost btn-sm" style="font-size:.68rem;flex-shrink:0">🔄 إعادة تشغيل</button>
            </div>

            <!-- Auto-Sync Status -->
            <div style="
              padding:.7rem 1rem;border-radius:12px;margin-bottom:.8rem;
              background:${typeof DBHybrid!=='undefined'&&DBHybrid._useSupabase?'rgba(52,195,143,.07)':'rgba(240,78,106,.07)'};
              border:1px solid ${typeof DBHybrid!=='undefined'&&DBHybrid._useSupabase?'rgba(52,195,143,.2)':'rgba(240,78,106,.2)'};
              display:flex;align-items:center;gap:.7rem;
            ">
              <span style="font-size:1.2rem">${typeof DBHybrid!=='undefined'&&DBHybrid._useSupabase?'⬆️':'📥'}</span>
              <div style="flex:1">
                <div style="font-size:.78rem;font-weight:800;color:var(--text)">
                  ${typeof DBHybrid!=='undefined'&&DBHybrid._useSupabase
                    ? '✅ المزامنة التلقائية نشطة — كل تعديل يُرفع لـ Supabase فوراً'
                    : '⚠️ المزامنة متوقفة — البيانات تُحفظ محلياً وسترتفع عند الاتصال'}
                </div>
                <div style="font-size:.68rem;color:var(--dim);margin-top:2px">
                  ${(() => {
                    try {
                      const q = JSON.parse(localStorage.getItem('sbtp5_offline_queue')||'[]');
                      return q.length>0 ? `🟡 ${q.length} عملية بانتظار الرفع` : '🟢 لا توجد عمليات معلقة';
                    } catch { return ''; }
                  })()}
                </div>
              </div>
              ${typeof DBHybrid!=='undefined'&&DBHybrid._useSupabase ? `
                <div style="position:relative;display:inline-block;flex-shrink:0">
                  <button id="sbFlushBtn" onclick="if(typeof DBHybrid!=='undefined'){DBHybrid._manualSyncNow && DBHybrid._manualSyncNow().then(()=>App.navigate('admin',{tab:'supabase'}));}" 
                    class="btn btn-ghost btn-sm" style="font-size:.68rem">↑ مزامنة يدوية</button>
                  <span id="sbUploadDot" title="توجد تعديلات تتطلب رفع/مزامنة"
                    style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;border-radius:50%;background:#ff3b30;display:none;box-shadow:0 0 0 2px rgba(17,17,17,.85)"></span>
                </div>
              ` : ''}
            </div>

            <!-- Sync Dashboard -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.8rem;margin-bottom:.8rem">
              <div class="stat-card">
                <div class="stat-icon">🏗️</div>
                <div class="stat-value" style="color:var(--blue)">${projects?.length||0}</div>
                <div class="stat-label">مشاريع</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">👷</div>
                <div class="stat-value" style="color:var(--green)">${workers?.length||0}</div>
                <div class="stat-label">عمال</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-value" style="color:var(--gold)">${(typeof DB!=='undefined'?DB.get('transactions'):[]).length}</div>
                <div class="stat-label">معاملات</div>
              </div>
            </div>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap">
              <button class="btn btn-green" onclick="syncToSupabase()" style="flex:1;justify-content:center">
                🔄 مزامنة كل البيانات الآن
              </button>
              <button class="btn btn-ghost" onclick="downloadSchema()" style="flex:1;justify-content:center">
                📥 تحميل schema.sql
              </button>
            </div>
          </div>

          <!-- EmailJS Settings Card -->
          <div class="card" style="margin-top:1rem;background:rgba(74,144,226,0.03);border:1px solid rgba(74,144,226,0.15)">
            <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:1.2rem">
              <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#4A90E2,#2563eb);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0">📧</div>
              <div>
                <div style="font-size:.95rem;font-weight:900">EmailJS — إشعارات البريد الإلكتروني</div>
                <div style="font-size:.7rem;color:var(--dim)">إعداد خادم الإشعارات والرسائل التلقائية</div>
              </div>
              <div style="margin-right:auto">
                <span id="emailjsStatusBadge" style="
                  padding:3px 10px;border-radius:20px;font-size:.68rem;font-weight:800;
                  background:rgba(52,195,143,0.1);color:#34C38F;border:1px solid #34C38F44;
                ">🟢 مُفعَّل</span>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.7rem;margin-bottom:.8rem">
              <div class="form-group" style="margin:0">
                <label class="form-label" style="font-size:.7rem">Service ID</label>
                <input class="form-input" id="ejServiceId" dir="ltr" style="font-family:monospace;font-size:.75rem"
                  value="${getEmailJSConfig().SERVICE_ID}"
                  placeholder="service_xxxxxxx">
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label" style="font-size:.7rem">Public Key</label>
                <input class="form-input" id="ejPublicKey" dir="ltr" style="font-family:monospace;font-size:.75rem"
                  value="${getEmailJSConfig().PUBLIC_KEY}"
                  placeholder="xxxxxxxxxxxxxxx">
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label" style="font-size:.7rem">Template (للمسؤول)</label>
                <input class="form-input" id="ejTemplateAdmin" dir="ltr" style="font-family:monospace;font-size:.75rem"
                  value="${getEmailJSConfig().TEMPLATE_ADMIN}"
                  placeholder="template_xxxxxxx">
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label" style="font-size:.7rem">Template (للمستخدم)</label>
                <input class="form-input" id="ejTemplateUser" dir="ltr" style="font-family:monospace;font-size:.75rem"
                  value="${getEmailJSConfig().TEMPLATE_USER}"
                  placeholder="template_xxxxxxx">
              </div>
              <div class="form-group" style="margin:0;grid-column:1/-1">
                <label class="form-label" style="font-size:.7rem">📬 بريد المسؤول (استقبال الإشعارات)</label>
                <input class="form-input" id="ejAdminEmail" type="email" dir="ltr"
                  value="${getEmailJSConfig().ADMIN_EMAIL}"
                  placeholder="admin@example.com">
              </div>
            </div>

            <div style="display:flex;gap:.6rem;flex-wrap:wrap">
              <button class="btn btn-primary" onclick="saveEmailJSSettings()" style="flex:1;justify-content:center">
                💾 حفظ إعدادات EmailJS
              </button>
              <button class="btn btn-ghost btn-sm" onclick="testEmailJS()">
                🧪 اختبار الإرسال
              </button>
            </div>
            <div id="ejTestResult" style="display:none;margin-top:.7rem;padding:.6rem .8rem;border-radius:8px;font-size:.78rem"></div>
          </div>

          <!-- Quick Setup Guide -->
          <div class="card" style="margin-top:1rem">
            <div style="font-weight:800;margin-bottom:1rem">🚀 دليل الإعداد السريع</div>
            <div style="display:flex;flex-direction:column;gap:0.8rem">
              ${[
                {num:'1', title:'أنشئ مشروع Supabase مجاني', desc:'اذهب إلى supabase.com وسجّل حساباً مجانياً وأنشئ مشروعاً جديداً', link:'https://supabase.com/dashboard'},
                {num:'2', title:'شغّل ملف Schema SQL', desc:'افتح SQL Editor في Supabase وألصق محتوى ملف supabase-schema.sql', link:null},
                {num:'3', title:'انسخ بيانات الاتصال', desc:'من Settings → API: انسخ Project URL وanon public key', link:null},
                {num:'4', title:'أدخل البيانات في الإعدادات', desc:'أدخل URL والمفتاح في الحقول أعلاه واضغط "حفظ واختبار"', link:null},
              ].map(s=>`
                <div style="display:flex;align-items:flex-start;gap:1rem;padding:0.8rem;background:rgba(255,255,255,0.02);border-radius:10px">
                  <div style="width:30px;height:30px;border-radius:50%;background:rgba(52,195,143,0.15);border:1px solid rgba(52,195,143,0.3);display:flex;align-items:center;justify-content:center;font-weight:900;color:#34C38F;font-size:0.9rem;flex-shrink:0">${s.num}</div>
                  <div style="flex:1">
                    <div style="font-weight:800;font-size:0.85rem;margin-bottom:0.2rem">${s.title}</div>
                    <div style="font-size:0.75rem;color:var(--dim)">${s.desc}</div>
                    ${s.link?`<a href="${s.link}" target="_blank" class="btn btn-ghost btn-sm" style="margin-top:0.5rem;font-size:0.72rem">🔗 فتح الرابط</a>`:''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div><!-- END adminTabContent_supabase -->

        <!-- Add Tenant Modal -->
        <div class="modal-overlay" id="addTenantModal">
          <div class="modal">
            <div class="modal-title">🏢 ${L('إضافة مؤسسة جديدة','Ajouter une nouvelle entreprise')}</div>
            <div class="form-group"><label class="form-label">${L('اسم الشركة','Nom de l\'entreprise')} *</label><input class="form-input" id="atName" placeholder="${L('مؤسسة المقاولة...','Entreprise BTP...')}"></div>
            <div class="form-group"><label class="form-label">${L('بريد المسؤول','Email administrateur')} *</label><input class="form-input" id="atEmail" type="email" placeholder="admin@company.dz" dir="ltr"></div>
            <div class="form-group"><label class="form-label">${L('كلمة المرور','Mot de passe')} *</label><input class="form-input" id="atPass" type="password" dir="ltr"></div>
            <div class="form-group"><label class="form-label">${L('اسم المسؤول','Nom de l\'administrateur')} *</label><input class="form-input" id="atAdmin" placeholder="${L('محمد...','Mohamed...')}"></div>
            <div class="form-group"><label class="form-label">${L('الخطة','Plan')}</label><select class="form-select" id="atPlan">${plans.map(p=>`<option value="${p.id}">${p.name} — ${fmt(p.price)} ${L('دج/شهر','DA/mois')}</option>`).join('')}</select></div>
            <div class="modal-footer"><button class="btn btn-ghost" data-modal-close>${L('إلغاء','Annuler')}</button><button class="btn btn-gold" onclick="addTenant()">💾 ${L('إنشاء المؤسسة','Créer l\'entreprise')}</button></div>
          </div>
        </div>
      </main>
      <footer style="padding:.8rem 1.8rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem">
        <span style="font-size:.7rem;color:var(--dim)">© 2025 SmartStruct Admin Panel</span>
        <span style="font-size:.7rem;color:var(--dim)">v7.0 Pro Edition</span>
      </footer>
    </div>
  </div>`;
};

/* ─── PROJECT DETAIL ─── */
Pages.project_detail = function() {

  const pid = App.params.id;
  const tid = Auth.getUser().tenant_id;
  const p = DB.get('projects').find(pr=>pr.id===pid && pr.tenant_id===tid);
  if (!p) return layoutHTML('projects', L('تفاصيل المشروع','Détails du projet'),`<div class="empty"><div class="empty-icon">🏗️</div><div class="empty-title">${L('المشروع غير موجود','Projet introuvable')}</div><button class="btn btn-ghost" data-nav="projects">${L('العودة','Retour')}</button></div>`);

  const workers = DB.get('workers').filter(w=>w.project_id===pid);
  const equip = DB.get('equipment').filter(e=>e.project_id===pid);
  const txs = DB.get('transactions').filter(t=>t.project_id===pid);
  const materials = DB.get('materials').filter(m=>m.project_id===pid);
  const notes = DB.get('notes').filter(n=>n.project_id===pid).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const revenue = txs.filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  const budgetPct = p.budget>0?Math.round(p.total_spent/p.budget*100):0;
  const user = Auth.getUser();
  const contractTypes = {daily:L('يومي','Journalier'),monthly:L('شهري','Mensuel'),seasonal:L('موسمي','Saisonnier'),contract:L('مقاول','Sous-traitant')};

  return layoutHTML('projects', L('تفاصيل المشروع','Détails du projet'),`
    <div class="page-header" style="flex-wrap:wrap">
      <div>
        <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.3rem">
          <button class="btn btn-ghost btn-sm" data-nav="projects">← ${L('العودة','Retour')}</button>
          ${statusBadge(p.status)}
        </div>
        <div class="page-title">${escHtml(p.name)}</div>
        <div class="page-sub">
          ${(()=>{const t=PROJECT_TYPES.find(t=>t.value===p.project_type);return t?`<span style="background:rgba(232,184,75,.12);border:1px solid rgba(232,184,75,.25);color:var(--gold);border-radius:20px;padding:2px 10px;font-size:.75rem;font-weight:700;margin-left:.5rem">${t.label}</span>`:''})()}
          ${p.wilaya?'📍 '+escHtml(p.wilaya):''} ${p.client_name?'• 👤 '+escHtml(p.client_name):''} ${p.phase?'• 🔧 '+escHtml(p.phase):''}
        </div>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="window.print()">🖨️ ${L('طباعة','Imprimer')}</button>
        <div style="position:relative;display:inline-block" class="dz-dd">
          <button class="btn btn-blue btn-sm" onclick="toggleProjDocs(event)" title="${L('وثائق الميدان','Documents chantier')}">📚 ${L('وثائق الميدان','Docs chantier')} ▾</button>
          <div id="projDocsMenu" class="dz-dd-menu" style="display:none;position:absolute;top:100%;${I18N.currentLang==='ar'?'right':'left'}:0;margin-top:4px;background:var(--card-bg,#0e1720);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.4);min-width:240px;z-index:100;padding:.3rem">
            <button class="dz-dd-item" onclick="DZDocsUI.openForProject('pv_ouverture',${p.id})">🚀 ${L('محضر بدء الأشغال','PV d\'Ouverture')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.openForProject('attachement',${p.id})">📐 ${L('كشف المرفقات','Attachement')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.openForProject('journal',${p.id})">📔 ${L('يوميات الورشة','Journal Chantier')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.openForProject('pv_reception_pro',${p.id})">🤝 ${L('استلام مؤقت','PV Réception Provisoire')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.openForProject('pv_reception_def',${p.id})">✅ ${L('استلام نهائي','PV Réception Définitive')}</button>
            <div style="height:1px;background:var(--border);margin:.3rem 0"></div>
            <button class="dz-dd-item" onclick="DZDocsUI.openForProject('acompte',${p.id})">⏩ ${L('فاتورة تسبيق','Facture Acompte')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.openForProject('situation',${p.id})">📈 ${L('كشف أشغال (وضعية)','Situation Travaux')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.openForProject('def_invoice',${p.id})">🏁 ${L('فاتورة نهائية','Facture Définitive')}</button>
          </div>
        </div>
        <button class="btn btn-blue btn-sm" onclick="editProject(${p.id})">✏️ ${L('تعديل','Modifier')}</button>
      </div>
    </div>

    <!-- Budget Overview -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.8rem;margin-bottom:1.2rem">
      <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value" style="color:var(--gold)">${p.progress}%</div><div class="stat-label">${L('نسبة الإنجاز','Avancement')}</div><div class="progress-bar" style="margin-top:.5rem"><div class="progress-fill" style="background:${p.color}" data-width="${p.progress}"></div></div></div>
      <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value" style="color:var(--blue);font-size:1rem">${fmt(p.budget)}</div><div class="stat-label">${L('الميزانية (دج)','Budget (DA)')}</div></div>
      <div class="stat-card"><div class="stat-icon">📉</div><div class="stat-value" style="color:${budgetPct>=100?'var(--red)':budgetPct>=80?'var(--gold)':'var(--green)'};font-size:1rem">${fmt(p.total_spent)}</div><div class="stat-label">${L('المُنفَق','Dépensé')} — ${budgetPct}%</div></div>
      <div class="stat-card"><div class="stat-icon">💹</div><div class="stat-value" style="color:${revenue-expense>=0?'var(--green)':'var(--red)'};font-size:1rem">${fmt(revenue-expense)}</div><div class="stat-label">${L('الربح الصافي (دج)','Bénéfice net (DA)')}</div></div>
    </div>

    ${budgetPct>=90?`<div class="${budgetPct>=100?'budget-alert budget-alert-danger':'budget-alert budget-alert-warn'}">
      <span>${budgetPct>=100?'🚨':'⚠️'}</span>
      ${budgetPct>=100?L('تجاوز الميزانية!','Dépassement de budget!'):L('اقتراب من الميزانية!','Budget presque atteint!')} ${L('تم استهلاك','Consommé')} ${budgetPct}% (${fmt(p.total_spent)} / ${fmt(p.budget)} ${L('دج','DA')})
    </div>`:''}

    <!-- Tabs -->
    <div class="detail-tabs">
      <button class="detail-tab active" onclick="showDetailTab(this,'dt-workers')">👷 ${L('العمال','Ouvriers')} (${workers.length})</button>
      <button class="detail-tab" onclick="showDetailTab(this,'dt-equip')">🚜 ${L('المعدات','Équipements')} (${equip.length})</button>
      <button class="detail-tab" onclick="showDetailTab(this,'dt-txs')">💰 ${L('المالية','Finances')} (${txs.length})</button>
      <button class="detail-tab" onclick="showDetailTab(this,'dt-mats')">🧱 ${L('المواد','Matériaux')} (${materials.length})</button>
      <button class="detail-tab" onclick="showDetailTab(this,'dt-notes')">📝 ${L('الملاحظات','Notes')} (${notes.length})</button>
    </div>

    <!-- Workers Tab -->
    <div id="dt-workers">
      ${workers.length?`<div class="table-wrap"><table>
        <thead><tr><th>${L('العامل','Ouvrier')}</th><th>${L('المهنة','Métier')}</th><th>${L('الأجر اليومي','Salaire/jour')}</th><th>${L('العقد','Contrat')}</th><th>${L('التعيين','Embauché le')}</th></tr></thead>
        <tbody>${workers.map(w=>`<tr>
          <td><div style="display:flex;align-items:center;gap:.6rem"><div style="width:30px;height:30px;border-radius:50%;background:${w.color||'#4A90E2'};display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:.72rem">${(w.full_name||'?')[0]}</div>${escHtml(w.full_name)}</div></td>
          <td>${escHtml(w.role)}</td>
          <td style="font-family:monospace">${fmt(w.daily_salary)} ${L('دج','DA')}</td>
          <td>${contractTypes[w.contract_type]||w.contract_type}</td>
          <td style="color:var(--dim);font-size:.82rem">${fmtDate(w.hire_date)}</td>
        </tr>`).join('')}</tbody>
      </table></div>`:`<div class="empty"><div class="empty-icon">👷</div><div class="empty-title">${L('لا يوجد عمال في هذا المشروع','Aucun ouvrier dans ce projet')}</div></div>`}
    </div>

    <!-- Equipment Tab -->
    <div id="dt-equip" style="display:none">
      ${equip.length?`<div class="grid-cards">${equip.map(e=>`<div class="card">
        <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:.7rem">
          <div style="font-size:2rem">${e.icon||'🚜'}</div>
          <div><div style="font-weight:800">${escHtml(e.name)}</div><div style="font-size:.75rem;color:var(--dim)">${escHtml(e.model||'')}</div></div>
        </div>
        <div style="font-size:.78rem;color:var(--dim)">${L('رقم اللوحة','Immatriculation')}: <span style="color:var(--text);font-family:monospace">${escHtml(e.plate_number||'—')}</span></div>
        <div style="font-size:.78rem;color:var(--dim)">${L('القيمة','Valeur')}: <span style="color:var(--text);font-family:monospace">${fmt(e.purchase_price)} ${L('دج','DA')}</span></div>
      </div>`).join('')}</div>`:`<div class="empty"><div class="empty-icon">🚜</div><div class="empty-title">${L('لا توجد معدات','Aucun équipement')}</div></div>`}
    </div>

    <!-- Transactions Tab -->
    <div id="dt-txs" style="display:none">
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:1rem">
        <div class="stat-card"><div class="stat-value" style="color:var(--green);font-size:1rem">${fmt(revenue)}</div><div class="stat-label">${L('الإيرادات (دج)','Revenus (DA)')}</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--red);font-size:1rem">${fmt(expense)}</div><div class="stat-label">${L('المصاريف (دج)','Dépenses (DA)')}</div></div>
        <div class="stat-card"><div class="stat-value" style="color:${revenue-expense>=0?'var(--green)':'var(--red)'};font-size:1rem">${fmt(revenue-expense)}</div><div class="stat-label">${L('الربح (دج)','Bénéfice (DA)')}</div></div>
      </div>
      ${txs.length?`<div class="table-wrap"><table>
        <thead><tr><th>${L('التاريخ','Date')}</th><th>${L('النوع','Type')}</th><th>${L('الوصف','Description')}</th><th>${L('الفئة','Catégorie')}</th><th>${L('المبلغ','Montant')}</th></tr></thead>
        <tbody>${[...txs].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t=>`<tr>
          <td style="color:var(--dim);font-size:.82rem">${fmtDate(t.date)}</td>
          <td><span class="badge ${t.type==='revenue'?'badge-revenue':'badge-expense'}">${t.type==='revenue'?L('إيراد','Revenu'):L('مصروف','Dépense')}</span></td>
          <td>${escHtml(t.description)}</td>
          <td style="color:var(--dim);font-size:.78rem">${escHtml(t.category)}</td>
          <td style="font-family:monospace;font-weight:700;color:${t.type==='revenue'?'var(--green)':'var(--red)'}">${t.type==='revenue'?'+':'-'}${fmt(t.amount)}</td>
        </tr>`).join('')}</tbody>
      </table></div>`:`<div class="empty"><div class="empty-icon">💰</div><div class="empty-title">${L('لا توجد معاملات','Aucune transaction')}</div></div>`}
    </div>

    <!-- Materials Tab -->
    <div id="dt-mats" style="display:none">
      ${materials.length?`<div class="table-wrap"><table>
        <thead><tr><th>${L('المادة','Matériau')}</th><th>${L('الكمية','Qté')}</th><th>${L('الوحدة','Unité')}</th><th>${L('سعر الوحدة','Prix unit.')}</th><th>${L('إجمالي','Total')}</th><th>${L('المورد','Fournisseur')}</th><th>${L('الحالة','Statut')}</th></tr></thead>
        <tbody>${materials.map(m=>`<tr>
          <td style="font-weight:700">${escHtml(m.name)}</td>
          <td style="font-family:monospace">${m.quantity}</td>
          <td style="color:var(--dim)">${escHtml(m.unit)}</td>
          <td style="font-family:monospace">${fmt(m.unit_price)}</td>
          <td style="font-family:monospace;font-weight:700">${fmt(m.quantity*m.unit_price)}</td>
          <td style="color:var(--dim);font-size:.8rem">${escHtml(m.supplier||'—')}</td>
          <td><span class="material-badge ${m.quantity<=m.min_quantity?'material-low':'material-ok'}">${m.quantity<=m.min_quantity?L(L('⚠️ منخفض','⚠️ Bas'),'⚠️ Bas'):L(L('✅ كافٍ','✅ OK'),'✅ Suffisant')}</span></td>
        </tr>`).join('')}</tbody>
      </table></div>`:`<div class="empty"><div class="empty-icon">🧱</div><div class="empty-title">${L('لا توجد مواد مسجلة','Aucun matériau enregistré')}</div></div>`}
    </div>

    <!-- Notes Tab -->
    <div id="dt-notes" style="display:none">
      <div style="margin-bottom:1rem">
        <div class="form-group" style="margin-bottom:.5rem"><textarea class="form-textarea" id="noteText" placeholder="${L('أضف ملاحظة أو تعليق...','Ajouter une note ou commentaire...')}"></textarea></div>
        <button class="btn btn-gold btn-sm" onclick="addNote(${pid})">💬 ${L('إضافة ملاحظة','Ajouter une note')}</button>
      </div>
      ${notes.length?notes.map(n=>`<div class="note-card">
        <div class="note-card-header">
          <span class="note-card-author">👤 ${escHtml(user.full_name)}</span>
          <span class="note-card-date">${fmtDate(n.date)}</span>
        </div>
        <div class="note-card-text">${escHtml(n.text)}</div>
        <button onclick="deleteNote(${n.id},${pid})" style="position:absolute;top:.5rem;left:.5rem;background:none;border:none;cursor:pointer;color:var(--dim);font-size:.8rem">🗑️</button>
      </div>`).join(''):`<div class="empty"><div class="empty-icon">📝</div><div class="empty-title">${L('لا توجد ملاحظات','Aucune note')}</div></div>`}
    </div>

    <!-- Edit Modal embedded -->
    <div class="modal-overlay" id="editProjectModal">
      <div class="modal modal-lg">
        <div class="modal-title">✏️ ${L('تعديل المشروع','Modifier le projet')}</div><input type="hidden" id="epId">
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">${L('اسم المشروع','Nom du projet')}</label><input class="form-input" id="epName"></div>
          <div class="form-group"><label class="form-label">${L('الولاية','Wilaya')}</label><select class="form-select" id="epWilaya"><option value="">${L('اختر...','Choisir...')}</option>${WILAYAS.map(w=>`<option>${w}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">${L('الحالة','Statut')}</label><select class="form-select" id="epStatus"><option value="active">${L('نشط','Actif')}</option><option value="completed">${L('مكتمل','Terminé')}</option><option value="delayed">${L('متأخر','En retard')}</option><option value="paused">${L('متوقف','Pausé')}</option></select></div>
          <div class="form-group"><label class="form-label">${L('التقدم %','Avancement %')}</label><input class="form-input" id="epProgress" type="number" min="0" max="100"></div>
          <div class="form-group"><label class="form-label">${L('الميزانية (دج)','Budget (DA)')}</label><input class="form-input" id="epBudget" type="number"></div>
          <div class="form-group"><label class="form-label">${L('المرحلة','Phase')}</label><select class="form-select" id="epPhase"><option value="">${L('اختر...','Choisir...')}</option>${PHASES.map(ph=>`<option>${ph}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">${L('اسم العميل','Nom du client')}</label><input class="form-input" id="epClient"></div>
          <div class="form-group"><label class="form-label">${L('تاريخ الانتهاء','Date de fin')}</label><input class="form-input" id="epEnd" type="date"></div>
        </div>
        <div class="modal-footer"><button class="btn btn-ghost" data-modal-close>${L('إلغاء','Annuler')}</button><button class="btn btn-gold" onclick="saveProject()">💾 ${L('حفظ التعديلات','Enregistrer')}</button></div>
      </div>
    </div>
  `);
};

/* ─── MATERIALS PAGE ─── */
Pages.materials = function() {
  const tid = Auth.getUser().tenant_id;
  const materials = DB.get('materials').filter(m=>m.tenant_id===tid);
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid && !p.is_archived);
  const lowStock = materials.filter(m=>m.quantity<=m.min_quantity).length;
  const totalValue = materials.reduce((s,m)=>s+m.quantity*m.unit_price,0);

  const rows = materials.map(m=>{
    const proj = projects.find(p=>p.id===m.project_id);
    const isLow = m.quantity <= m.min_quantity;
    return `<tr>
      <td style="font-weight:700">${escHtml(m.name)}</td>
      <td style="color:var(--dim);font-size:.82rem">${escHtml(proj?.name||'—')}</td>
      <td>
        <div style="display:flex;align-items:center;gap:.5rem">
          <button class="btn btn-sm" style="padding:.1rem .5rem;background:rgba(240,78,106,.1);border:1px solid rgba(240,78,106,.3);color:#f79fa9;border-radius:6px" onclick="updateMatQty(${m.id},-1)">−</button>
          <span style="font-family:monospace;font-weight:700;min-width:30px;text-align:center">${m.quantity}</span>
          <button class="btn btn-sm" style="padding:.1rem .5rem;background:rgba(52,195,143,.1);border:1px solid rgba(52,195,143,.3);color:#34C38F;border-radius:6px" onclick="updateMatQty(${m.id},1)">+</button>
        </div>
      </td>
      <td style="color:var(--dim)">${escHtml(m.unit)}</td>
      <td style="font-family:monospace">${fmt(m.unit_price)}</td>
      <td style="font-family:monospace;font-weight:700">${fmt(m.quantity*m.unit_price)}</td>
      <td style="color:var(--dim);font-size:.8rem">${escHtml(m.supplier||'—')}</td>
      <td><span class="material-badge ${isLow?'material-low':'material-ok'}">${isLow?L('⚠️ منخفض','⚠️ Bas'):L('✅ كافٍ','✅ OK')}</span></td>
      <td><button class="btn btn-red btn-sm" onclick="deleteMat(${m.id})">🗑️</button></td>
    </tr>`;
  }).join('');

  return layoutHTML('materials','المواد والمخزون',`
    <div class="page-header">
      <div><div class="page-title">🧱 المواد والمخزون</div><div class="page-sub">${materials.length} ${L('مادة مسجلة','matériau(x)')}</div></div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="exportMaterials()">📥 تصدير CSV</button>
        <button class="btn btn-gold" data-modal-open="addMatModal">+ إضافة مادة</button>
      </div>
    </div>
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card"><div class="stat-icon">🧱</div><div class="stat-value" style="color:var(--blue)">${materials.length}</div><div class="stat-label">إجمالي المواد</div></div>
      <div class="stat-card"><div class="stat-icon">⚠️</div><div class="stat-value" style="color:${lowStock>0?'var(--red)':'var(--green)'}">${lowStock}</div><div class="stat-label">مخزون منخفض</div></div>
      <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value" style="color:var(--gold);font-size:1rem">${fmt(totalValue)}</div><div class="stat-label">قيمة المخزون (دج)</div></div>
    </div>
    ${lowStock>0?`<div class="budget-alert budget-alert-warn">⚠️ تنبيه: ${lowStock} مادة وصلت للحد الأدنى من المخزون وتحتاج إلى تجديد</div>`:''}
    ${materials.length?`<div class="table-wrap"><table>
      <thead><tr><th>المادة</th><th>المشروع</th><th>الكمية</th><th>الوحدة</th><th>سعر الوحدة (دج)</th><th>القيمة الإجمالية</th><th>المورد</th><th>الحالة</th><th>حذف</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`:`<div class="empty"><div class="empty-icon">🧱</div><div class="empty-title">لا توجد مواد مسجلة</div></div>`}
    <div class="modal-overlay" id="addMatModal">
      <div class="modal">
        <div class="modal-title">🧱 إضافة مادة</div>
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">اسم المادة *</label><input class="form-input" id="mName" placeholder="حديد، أسمنت..."></div>
          <div class="form-group"><label class="form-label">الوحدة *</label><select class="form-select" id="mUnit"><option>طن</option><option>كيس</option><option>م³</option><option>ألف قطعة</option><option>لتر</option><option>قطعة</option><option>م²</option></select></div>
          <div class="form-group"><label class="form-label">الكمية المتوفرة</label><input class="form-input" id="mQty" type="number" value="0"></div>
          <div class="form-group"><label class="form-label">الحد الأدنى للتنبيه</label><input class="form-input" id="mMinQty" type="number" value="5"></div>
          <div class="form-group"><label class="form-label">سعر الوحدة (دج)</label><input class="form-input" id="mPrice" type="number" value="0"></div>
          <div class="form-group"><label class="form-label">المشروع</label><select class="form-select" id="mProject"><option value="">— عام</option>${projects.map(p=>`<option value="${p.id}">${escHtml(p.name)}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label class="form-label">المورد</label><input class="form-input" id="mSupplier" placeholder="اسم المورد..."></div>
        <div class="modal-footer"><button class="btn btn-ghost" data-modal-close>إلغاء</button><button class="btn btn-gold" onclick="addMat()">💾 حفظ</button></div>
      </div>
    </div>
  `);
};


/* ─── PROJECT SEARCH/FILTER ─── */
function filterProjects() {
  const search = (document.getElementById('projSearch')?.value||'').toLowerCase();
  const status = document.getElementById('projStatusFilter')?.value||'';
  const wilaya = document.getElementById('projWilayaFilter')?.value||'';
  const ptype  = document.getElementById('projTypeFilter')?.value||'';
  const tid = Auth.getUser().tenant_id;
  const all = DB.get('projects').filter(p=>p.tenant_id===tid&&!p.is_archived);
  const workers = DB.get('workers');
  const filtered = all.filter(p=>{
    const matchSearch = !search || p.name.toLowerCase().includes(search) || (p.client_name||'').toLowerCase().includes(search) || (p.wilaya||'').toLowerCase().includes(search);
    const matchStatus = !status || p.status===status;
    const matchWilaya = !wilaya || p.wilaya===wilaya;
    const matchType   = !ptype  || p.project_type===ptype;
    return matchSearch && matchStatus && matchWilaya && matchType;
  });
  const grid = document.getElementById('projGrid');
  if (!grid) return;
  if (!filtered.length) { grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🔍</div><div class="empty-title">لا توجد نتائج</div></div>`; return; }
  grid.innerHTML = filtered.map(p=>{
    const wCount=workers.filter(w=>w.project_id===p.id).length;
    const pTypeObj = PROJECT_TYPES.find(t=>t.value===p.project_type);
    return `<div style="background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);border-radius:16px;overflow:hidden;transition:all .28s" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''">
      <div style="height:3px;background:${p.color}"></div>
      <div style="padding:1.1rem 1.2rem">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">
          <div style="font-weight:800;font-size:.95rem;flex:1">${escHtml(p.name)}</div>${statusBadge(p.status)}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.8rem">
          ${pTypeObj?`<span style="font-size:.72rem;background:rgba(232,184,75,.1);border:1px solid rgba(232,184,75,.2);color:var(--gold);border-radius:20px;padding:2px 8px">${pTypeObj.label}</span>`:''}
          ${p.wilaya?`<span style="font-size:.72rem;color:var(--dim)">📍 ${escHtml(p.wilaya)}</span>`:''}
          ${p.client_name?`<span style="font-size:.72rem;color:var(--dim)">👤 ${escHtml(p.client_name)}</span>`:''}
          ${wCount?`<span style="font-size:.72rem;color:var(--dim)">👷 ${wCount}</span>`:''}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.75rem;margin-bottom:4px"><span style="color:var(--dim)">التقدم</span><span style="font-weight:700">${p.progress}%</span></div>
        <div class="progress-bar" style="margin-bottom:.8rem"><div class="progress-fill" style="background:${p.color};width:${p.progress}%"></div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;font-size:.75rem;margin-bottom:.8rem">
          <div><div style="color:var(--dim)">الميزانية</div><div style="font-weight:700;font-family:monospace">${fmt(p.budget)}</div></div>
          <div><div style="color:var(--dim)">المُنفَق</div><div style="font-weight:700;color:${p.total_spent>p.budget?'var(--red)':'var(--green)'};font-family:monospace">${fmt(p.total_spent)}</div></div>
        </div>
        <div style="display:flex;gap:.4rem">
          <button class="btn btn-ghost btn-sm" style="flex:1" onclick="App.navigate('project_detail',{id:${p.id}})">📋 تفاصيل</button>
          <button class="btn btn-blue btn-sm" onclick="editProject(${p.id})">✏️</button>
          <button class="btn btn-red btn-sm" onclick="deleteProject(${p.id},'${escHtml(p.name)}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ─── DETAIL TABS ─── */
function showDetailTab(btn, tabId) {
  btn.closest('.detail-tabs').querySelectorAll('.detail-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  ['dt-workers','dt-equip','dt-txs','dt-mats','dt-notes'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.style.display='none';
  });
  const tab=document.getElementById(tabId); if(tab) tab.style.display='';
}

/* ─── NOTES ─── */

/* ══ sbSync — رفع فوري لـ Supabase (يجب أن يكون قبل جميع دوال الحفظ) ══ */


/* ══ cleanForSupabase + SB_SCHEMA ══ */
const SB_SCHEMA = {
  projects:        ['id','tenant_id','name','project_type','wilaya','client_name','phone','budget','total_spent','progress','status','color','phase','description','start_date','end_date','is_archived','created_at'],
  workers:         ['id','tenant_id','full_name','role','phone','national_id','daily_salary','monthly_base','contract_type','project_id','hire_date','color','avatar_color','is_active'],
  equipment:       ['id','tenant_id','name','model','plate_number','icon','status','purchase_price','project_id','notes'],
  transactions:    ['id','tenant_id','type','category','amount','description','project_id','date','payment_method','supplier','worker_id'],
  attendance:      ['id','tenant_id','worker_id','project_id','date','status','hours','note'],
  salary_records:  ['id','tenant_id','worker_id','month_key','amount','paid_date'],
  materials:       ['id','tenant_id','name','unit','quantity','min_quantity','unit_price','project_id','supplier'],
  stock_movements: ['id','tenant_id','material_id','type','quantity','date','note'],
  invoices:        ['id','tenant_id','project_id','number','client','amount','amount_ht','tva_amount','tva_rate','date','due_date','status','paid_date','description','payment_method'],
  documents:       ['id','tenant_id','name','project_id','category','type','url','size','date','uploader_id'],
  kanban_tasks:    ['id','tenant_id','title','project_id','priority','assignee_id','due_date','col'],
  notes:           ['id','tenant_id','project_id','user_id','text','date'],
  obligations:     ['id','tenant_id','title','amount','due'],
  users:           ['id','tenant_id','full_name','email','password','role','is_admin','is_active','account_status','avatar_color','last_login'],
  tenants:         ['id','name','plan_id','wilaya','address','phone','email','nif','nis','rc_number','article_imp','rib','tva_rate','subscription_status','trial_start','trial_end','is_active','logo_url','stamp_url','bank_account','bank_name','created_at','updated_at'],
  notifications:   ['id','type','title','body','user_id','tenant_id','date','read','status'],
  audit_log:           ['id','tenant_id','user_id','user_email','action','table_name','record_id','before_data','after_data','ip_address','user_agent'],
  custom_roles:        ['id','tenant_id','name','description','permissions','scope'],
  equipment_locations: ['id','tenant_id','equipment_id','user_id','latitude','longitude','accuracy','recorded_at','note'],
  tenders:             ['id','tenant_id','project_id','title','description','deadline','status','awarded_to'],
  tender_offers:       ['id','tender_id','supplier','supplier_phone','total_price','delivery_days','notes','is_winner','submitted_at'],
  bank_transactions:   ['id','tenant_id','bank_name','account_number','transaction_date','amount','description','reference','matched_with','is_matched'],
  signatures:          ['id','tenant_id','document_id','signer_name','signer_email','signature_data','ip_address','signed_at','token'],
  ai_conversations:    ['id','tenant_id','user_id','messages','title','updated_at']
};


// ── Helpers: dates + file sizes ───────────────────────────────
function sbNormalizeDate(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date && !isNaN(v)) {
    const y = v.getFullYear();
    const m = String(v.getMonth()+1).padStart(2,'0');
    const d = String(v.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  if (s === '') return null;

  // Already ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // dd/mm/yyyy or d/m/yyyy
  let m1 = s.match(/^([0-3]?\d)[\/\-]([01]?\d)[\/\-](\d{4})$/);
  if (m1) {
    const dd = String(parseInt(m1[1],10)).padStart(2,'0');
    const mm = String(parseInt(m1[2],10)).padStart(2,'0');
    const yy = m1[3];
    return `${yy}-${mm}-${dd}`;
  }

  // Try Date.parse for other formats
  const t = Date.parse(s);
  if (!isNaN(t)) {
    const dt = new Date(t);
    const y = dt.getFullYear();
    const m = String(dt.getMonth()+1).padStart(2,'0');
    const d = String(dt.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function sbParseSizeToBytes(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);

  const s = String(v).trim();
  if (s === '') return null;
  if (/^\d+$/.test(s)) return parseInt(s,10);

  // Example: "2.4 MB", "512 KB", "1.2GB"
  const m = s.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  const mul = { B:1, KB:1024, MB:1024**2, GB:1024**3, TB:1024**4 }[unit];
  if (!mul || !Number.isFinite(num)) return null;
  return Math.round(num * mul);
}


function cleanForSupabase(table, record) {
  const allowed = SB_SCHEMA[table];
  if (!allowed) return record;

  // الحقول الاختيارية (FK) التي تقبل null
  const nullableIds = ['project_id','worker_id','material_id','user_id','plan_id','uploader_id','assignee_id'];

  const clean = {};
  allowed.forEach(function(col) {
    let v = record ? record[col] : undefined;

    // مهم: لتفادي خطأ PostgREST PGRST102 في الإدراج الجماعي (Bulk Insert)
    // يجب أن تكون مفاتيح كل الكائنات متطابقة. لذلك نُرجِع كل الأعمدة دائماً
    // ونحوّل undefined إلى null.
    if (v === undefined) v = null;

    // تطبيع القيم
    if (v === null) {
      clean[col] = null;
      return;
    }

    if (col === 'id' || col === 'tenant_id') {
      const n = Number(v);
      clean[col] = Number.isFinite(n) && n > 0 ? n : null;
      return;
    }

    if (nullableIds.includes(col)) {
      // IDs اختيارية
      const n = Number(v);
      clean[col] = Number.isFinite(n) && n > 0 ? n : null;
      return;
    }

    if (col === 'progress' || col === 'hours') {
      const n = Number(v);
      clean[col] = Number.isFinite(n) ? n : 0;
      return;
    }

    if ([
      'budget','amount','total_spent','daily_salary','monthly_base','purchase_price',
      'unit_price','quantity','min_quantity','amount_ht','tva_amount','tva_rate','price',
      'price_monthly','max_projects','max_workers','max_equipment','max_emails'
    ].includes(col)) {
      const n = Number(v);
      clean[col] = Number.isFinite(n) ? n : 0;
      return;
    }

    if (['is_active','is_admin','is_archived','read'].includes(col)) {
      clean[col] = Boolean(v);
      return;
    }

// توحيد التواريخ: Postgres لا يقبل "" كـ DATE
    if (/(^|_)date$/.test(col) || ['start_date','end_date','paid_date','hire_date','due','trial_start','trial_end'].includes(col)) {
      clean[col] = sbNormalizeDate(v);
      return;
    }

    // حجم الملف: bigint يجب أن يكون bytes وليس "2.4 MB"
    if (table === 'documents' && col === 'size') {
      const bytes = sbParseSizeToBytes(v);
      clean[col] = bytes === null ? 0 : bytes;
      return;
    }

    // النصوص الفارغة → null (تجنّب أخطاء بعض أنواع الأعمدة)
    if (typeof v === 'string' && v.trim() === '') {
      clean[col] = null;
      return;
    }

    clean[col] = v;
  });

  return clean;
}

/* ══ getSupabaseConfig — مصدر موحّد يقرأ أحدث إعدادات Supabase دائماً ══ */
function getSupabaseConfig() {
  // 1: localStorage (الأحدث دائماً — يُحدَّث عند الحفظ)
  try {
    const saved = JSON.parse(localStorage.getItem('sbtp_supabase_config') || '{}');
    if (saved.url && saved.anonKey) return { url: saved.url, key: saved.anonKey };
  } catch(e) {}
  // 2: SUPABASE_HARDCODED (محمّل عند بداية الصفحة)
  if (typeof SUPABASE_HARDCODED !== 'undefined' && SUPABASE_HARDCODED.url) {
    return { url: SUPABASE_HARDCODED.url, key: SUPABASE_HARDCODED.anonKey };
  }
  // 3: DBHybrid
  if (typeof DBHybrid !== 'undefined' && DBHybrid._supabaseUrl) {
    return { url: DBHybrid._supabaseUrl, key: DBHybrid._supabaseKey || '' };
  }
  return null;
}

async function sbSync(table, record, method='POST') {
  try {
    const cfg = getSupabaseConfig();
    if (!cfg || !cfg.url || !cfg.key) {
      console.warn('⚠️ sbSync: Supabase غير مربوط — سيتم حفظ العملية في الـ Offline Queue — table=' + table);
      // ✅ حفظ في Offline Queue حتى لو Supabase غير مهيّأ — للمزامنة لاحقاً
      _saveSbOpToOfflineQueue(table, record, method);
      return;
    }
    const { url: sbUrl, key: sbKey } = cfg;

    const headers = {
      'Content-Type':  'application/json',
      'apikey':         sbKey,
      'Authorization': `Bearer ${sbKey}`,
      'Prefer':         'return=representation'
    };

    let cleanRecord = method === 'DELETE' ? record : cleanForSupabase(table, record);

    let url = `${sbUrl}/rest/v1/${table}`;

    if (method === 'POST') {
      // ✅ لا نرسل id أبداً عند الإدراج — Supabase يولده تلقائياً بـ SERIAL
      // هذا يمنع خطأ "duplicate key value violates unique constraint"
      const oldId = record && record.id;
      const postRecord = { ...cleanRecord };
      delete postRecord.id;

      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(postRecord) });
      if (!res.ok) {
        const err = await res.text();
        console.warn(`⚠️ sbSync [POST ${table}]:`, err);
        // عند الفشل: حفظ في Offline Queue للمزامنة لاحقاً
        _saveSbOpToOfflineQueue(table, record, 'POST');
      } else {
        const data = await res.json();
        const newId = Array.isArray(data) ? data[0]?.id : data?.id;
        console.log(`✅ sbSync [POST ${table}] → Supabase ID=${newId} (local was ${oldId})`);
        // ✅ مزامنة الـ ID المحلي مع الـ ID الذي ولّده Supabase (لتجنب تكرار)
        if (newId && oldId && newId !== oldId) {
          try {
            const local = DB.get(table) || [];
            const idx = local.findIndex(r => r.id === oldId);
            if (idx >= 0) {
              local[idx] = { ...local[idx], id: newId };
              localStorage.setItem('sbtp5_' + table, JSON.stringify(local));
            }
          } catch(e) { console.warn('ID re-sync failed:', e.message); }
        }
      }

    } else if (method === 'PATCH') {
      url += `?id=eq.${record.id}`;
      const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(cleanRecord) });
      if (!res.ok) {
        const err = await res.text();
        console.warn(`⚠️ sbSync [PATCH ${table}] id=${record.id}:`, err);
        _saveSbOpToOfflineQueue(table, record, 'PATCH');
      } else {
        console.log(`✅ sbSync [PATCH ${table}] id=${record.id}`);
      }

    } else if (method === 'DELETE') {
      url += `?id=eq.${record.id}`;
      const res = await fetch(url, { method: 'DELETE', headers });
      if (!res.ok) {
        const err = await res.text();
        console.warn(`⚠️ sbSync [DELETE ${table}] id=${record.id}:`, err);
        _saveSbOpToOfflineQueue(table, record, 'DELETE');
      } else {
        console.log(`✅ sbSync [DELETE ${table}] id=${record.id}`);
      }
    }

  } catch(e) {
    console.warn('⚠️ sbSync error:', e.message);
    // عند خطأ شبكة: احفظ في Offline Queue للمحاولة لاحقاً
    try { _saveSbOpToOfflineQueue(table, record, method); } catch(_) {}
  }
}

// ─── حفظ عملية فاشلة في Offline Queue ───
function _saveSbOpToOfflineQueue(table, record, method) {
  try {
    const KEY = 'sbtp5_offline_queue';
    const q = JSON.parse(localStorage.getItem(KEY) || '[]');
    q.push({ table, record, method, time: Date.now() });
    if (q.length > 500) q.splice(0, q.length - 500);
    localStorage.setItem(KEY, JSON.stringify(q));
    // إعلام DBHybrid بوجود تغييرات لرفعها يدوياً
    if (typeof DBHybrid !== 'undefined' && DBHybrid._markUploadRequired) {
      DBHybrid._markUploadRequired();
    }
  } catch(e) {
    console.warn('⚠️ _saveSbOpToOfflineQueue:', e.message);
  }
}

async function sbSyncDelete(table, id) {
  return sbSync(table, { id }, 'DELETE');
}

async function sbSyncUpsert(table, record) {
  // UPSERT: إذا كان السجل موجوداً (له id من Supabase) نعمل PATCH، وإلا POST
  const method = record._fromSupabase ? 'PATCH' : 'POST';
  const cleanRecord = { ...record };
  delete cleanRecord._fromSupabase;
  return sbSync(table, cleanRecord, method);
}

/* ══════════════════════════════════════════════════════
   syncAllDataToSupabase — رفع كل بيانات المؤسسة دفعة واحدة
══════════════════════════════════════════════════════ */
/* ══ حفظ إعدادات Supabase مباشرة من الواجهة ══ */
function saveSupabaseConfigInline() {
  const url = (document.getElementById('sbUrlInput')?.value || '').trim();
  const key = (document.getElementById('sbKeyInput')?.value || '').trim();
  if (!url || !key) { Toast.error(L('❌ أدخل URL والـ Key كاملين','❌ Saisir URL et Key complets')); return; }
  if (!url.includes('supabase.co')) { Toast.error(L('❌ URL غير صحيح — يجب أن يحتوي على supabase.co','❌ URL invalide — doit contenir supabase.co')); return; }

  const cfg = { url, anonKey: key };
  localStorage.setItem('sbtp_supabase_config', JSON.stringify(cfg));

  // تحديث فوري لكل المتغيرات العالمية
  if (typeof SUPABASE_HARDCODED !== 'undefined') {
    SUPABASE_HARDCODED.url = url;
    SUPABASE_HARDCODED.anonKey = key;
  }
  // تحديث DBHybrid إن كان موجوداً
  if (typeof DBHybrid !== 'undefined') {
    DBHybrid._supabaseUrl = url;
    DBHybrid._supabaseKey = key;
    if (typeof DBHybrid.initSupabase === 'function') {
      DBHybrid.initSupabase().catch(()=>{});
    }
  }

  Toast.success(L('✅ تم حفظ إعدادات Supabase — جاري التحقق من الاتصال...','✅ Configuration Supabase sauvegardée — vérification...'));

  // تحقق تلقائي من الاتصال بعد الحفظ
  setTimeout(async () => {
    try {
      const res = await fetch(`${url}/rest/v1/tenants?select=id&limit=1`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
      });
      const badge = document.getElementById('sbStatusBadge');
      if (res.ok) {
        Toast.success(L('✅ Supabase متصل بنجاح!','✅ Supabase connecté !'));
        if (badge) { badge.textContent='🟢 متصل'; badge.style.background='rgba(52,195,143,0.1)'; badge.style.color='#34C38F'; badge.style.borderColor='rgba(52,195,143,0.3)'; }
      } else {
        const err = await res.text();
        Toast.error('⚠️ الإعدادات حُفظت لكن الاتصال فشل: ' + err.slice(0,60));
        if (badge) { badge.textContent='🔴 خطأ في الاتصال'; badge.style.color='#F04E6A'; }
      }
    } catch(e) {
      Toast.warn(L('⚠️ الإعدادات حُفظت — تحقق من اتصال الإنترنت','⚠️ Configuration sauvegardée — vérifier connexion'));
    }
  }, 500);

  // تحديث حالة الاتصال
  const badge = document.getElementById('sbStatusBadge');
  if (badge) { badge.textContent = '⏳ جاري التحقق...'; badge.style.background='rgba(232,184,75,0.1)'; badge.style.color='#E8B84B'; badge.style.borderColor='rgba(232,184,75,0.3)'; }
}

async function testSupabaseConnectionInline() {
  const url = (document.getElementById('sbUrlInput')?.value || SUPABASE_HARDCODED.url || '').trim();
  const key = (document.getElementById('sbKeyInput')?.value || SUPABASE_HARDCODED.anonKey || '').trim();
  if (!url || !key) { Toast.error(L('❌ أدخل البيانات أولاً','❌ Saisir les données d\'abord')); return; }

  const result = document.getElementById('sbTestResult');
  if (result) { result.style.display='block'; result.style.background='rgba(232,184,75,0.1)'; result.style.color='#E8B84B'; result.textContent='⏳ جاري اختبار الاتصال...'; }

  try {
    const res = await fetch(`${url}/rest/v1/tenants?select=id&limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    if (res.ok) {
      if (result) { result.style.background='rgba(52,195,143,0.1)'; result.style.color='#34C38F'; result.textContent='✅ الاتصال ناجح! Supabase يعمل بشكل صحيح.'; }
      const badge = document.getElementById('sbStatusBadge');
      if (badge) { badge.textContent='🟢 متصل'; badge.style.background='rgba(52,195,143,0.1)'; badge.style.color='#34C38F'; badge.style.borderColor='rgba(52,195,143,0.3)'; }
      Toast.success(L('✅ Supabase متصل بنجاح!','✅ Supabase connecté !'));
    } else {
      const err = await res.text();
      if (result) { result.style.background='rgba(240,78,106,0.1)'; result.style.color='#F04E6A'; result.textContent='❌ فشل: ' + err.slice(0,100); }
      Toast.error(L('❌ فشل الاتصال — تحقق من URL والـ Key','❌ Connexion échouée — vérifier URL et Key'));
    }
  } catch(e) {
    if (result) { result.style.background='rgba(240,78,106,0.1)'; result.style.color='#F04E6A'; result.textContent='❌ خطأ: ' + e.message; }
    Toast.error('❌ خطأ في الاتصال: ' + e.message);
  }
}

function checkSupabaseStatus() {
  let sbUrl = '', sbKey = '';
  // فحص كل المصادر
  const sources = [];
  
  if (typeof SUPABASE_HARDCODED !== 'undefined' && SUPABASE_HARDCODED.url) {
    sbUrl = SUPABASE_HARDCODED.url; sbKey = SUPABASE_HARDCODED.anonKey;
    sources.push('SUPABASE_HARDCODED ✅');
  } else { sources.push('SUPABASE_HARDCODED ❌'); }
  
  try {
    const lsCfg = JSON.parse(localStorage.getItem('sbtp_supabase_config') || '{}');
    if (lsCfg.url) sources.push('localStorage ✅: ' + lsCfg.url.slice(0,30) + '...');
    else sources.push('localStorage ❌ (فارغ)');
    if (!sbUrl && lsCfg.url) { sbUrl = lsCfg.url; sbKey = lsCfg.anonKey; }
  } catch(e) { sources.push('localStorage ❌ (خطأ)'); }
  
  if (typeof DBHybrid !== 'undefined' && DBHybrid._supabaseUrl) {
    sources.push('DBHybrid ✅: ' + DBHybrid._supabaseUrl.slice(0,30) + '...');
    if (!sbUrl) { sbUrl = DBHybrid._supabaseUrl; sbKey = DBHybrid._supabaseKey; }
  } else { sources.push('DBHybrid ❌ (غير محمّل)'); }
  
  const msg = sources.join('\n') + '\n\n' + (sbUrl ? '✅ URL موجود: ' + sbUrl.slice(0,40) + '...' : '❌ لا يوجد URL — يجب إدخاله في الإعدادات');
  alert('🔌 حالة Supabase:\n\n' + msg);
  
  if (!sbUrl) {
    if (confirm('❌ Supabase غير مربوط!\n\nهل تريد الذهاب لصفحة الإعدادات لإدخال URL والـ Key؟')) {
      App.navigate('admin', {tab:'supabase'});
    }
  }
}

async function syncAllDataToSupabase() {
  const btn = document.getElementById('syncAllBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ جاري الرفع...'; }

  const user = Auth.getUser();
  if (!user || !user.tenant_id) {
    Toast.error('❌ يجب تسجيل الدخول أولاً');
    if (btn) { btn.disabled = false; btn.innerHTML = '☁️ رفع البيانات'; }
    return;
  }
  const tid = user.tenant_id;

  // ── جلب إعدادات Supabase ──
  const sbCfg = getSupabaseConfig();
  if (!sbCfg || !sbCfg.url || !sbCfg.key) {
    Toast.error('❌ Supabase غير مربوط — اذهب للإعدادات وأدخل URL والـ Key');
    if (btn) { btn.disabled = false; btn.innerHTML = '☁️ رفع البيانات'; }
    return;
  }
  const { url: sbUrl, key: sbKey } = sbCfg;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': sbKey,
    'Authorization': `Bearer ${sbKey}`,
    'Prefer': 'resolution=merge-duplicates,return=representation'
  };

  // ── جمع كل بيانات المؤسسة ──
  const tables = {
    projects:        DB.get('projects').filter(p => p.tenant_id === tid),
    workers:         DB.get('workers').filter(w => w.tenant_id === tid),
    equipment:       DB.get('equipment').filter(e => e.tenant_id === tid),
    transactions:    DB.get('transactions').filter(t => t.tenant_id === tid),
    attendance:      (function() {
                       const wids = DB.get('workers').filter(w=>w.tenant_id===tid).map(w=>w.id);
                       return DB.get('attendance').filter(a => wids.includes(a.worker_id));
                     })(),
    salary_records:  DB.get('salary_records').filter(r => r.tenant_id === tid),
    materials:       DB.get('materials').filter(m => m.tenant_id === tid),
    stock_movements: DB.get('stock_movements').filter(s => s.tenant_id === tid),
    invoices:        DB.get('invoices').filter(i => i.tenant_id === tid),
    documents:       DB.get('documents').filter(d => d.tenant_id === tid).map(d => ({...d, fileData: null})),
    kanban_tasks:    DB.get('kanban_tasks').filter(k => k.tenant_id === tid),
    notes:           DB.get('notes').filter(n => n.tenant_id === tid),
    obligations:     (DB.get('obligations_'+tid) || []).map(o => ({...o, tenant_id: tid})),
    users:           DB.get('users').filter(u => u.tenant_id === tid),
    tenants:         DB.get('tenants').filter(t => t.id === tid),
  };

  let totalSent = 0;
  let errors = [];

  // ── UPSERT كل جدول ──
  for (const [table, records] of Object.entries(tables)) {
    if (!records || records.length === 0) continue;
    try {
      // إرسال على دفعات (max 50 سجل لكل طلب)
      const BATCH = 50;
      for (let i = 0; i < records.length; i += BATCH) {
        const batch = records.slice(i, i + BATCH);
        const cleanBatch = batch.map(r => cleanForSupabase(table, r));
        const res = await fetch(`${sbUrl}/rest/v1/${table}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(cleanBatch)
        });
        if (!res.ok) {
          const errText = await res.text();
          console.warn(`⚠️ syncAll [${table}]:`, errText);
          // إذا كان خطأ تكرار، نجرب PATCH على كل سجل بشكل مستقل
          if (errText.includes('duplicate') || errText.includes('23505') || errText.includes('conflict')) {
            console.log(`🔄 syncAll [${table}]: جاري UPSERT فردي للـ ${cleanBatch.length} سجل...`);
            for (const r of cleanBatch) {
              if (!r.id) continue;
              try {
                const pr = await fetch(`${sbUrl}/rest/v1/${table}?id=eq.${r.id}`, {
                  method: 'PATCH',
                  headers: { ...headers, 'Prefer': 'return=representation' },
                  body: JSON.stringify(r)
                });
                if (pr.ok) totalSent++;
                else errors.push(`${table}#${r.id}: ${(await pr.text()).slice(0,60)}`);
              } catch(pe) { errors.push(`${table}#${r.id}: ${pe.message}`); }
            }
          } else {
            errors.push(`${table}: ${errText.slice(0,100)}`);
          }
        } else {
          totalSent += batch.length;
          console.log(`✅ syncAll [${table}]: ${batch.length} سجل`);
        }
      }
    } catch(e) {
      errors.push(`${table}: ${e.message}`);
      console.warn(`⚠️ syncAll [${table}]:`, e.message);
    }
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '☁️ رفع البيانات'; }

  if (errors.length === 0) {
    Toast.success(`✅ تم رفع ${totalSent} سجل إلى Supabase بنجاح!`);
  } else if (totalSent > 0) {
    Toast.warn(`⚠️ رُفع ${totalSent} سجل — فشل ${errors.length} جدول: ${errors[0]}`);
  } else {
    Toast.error('❌ فشل الرفع: ' + errors[0]);
  }
}


function addNote(pid) {
  const text = document.getElementById('noteText')?.value?.trim();
  if (!text) { Toast.error('أدخل نص الملاحظة'); return; }
  const user = Auth.getUser();
  const notes = DB.get('notes');
  const newNote = { id:DB.nextId('notes'), tenant_id:user.tenant_id, project_id:pid, user_id:user.id, text, date:todayStr() };
  notes.push(newNote);
  DB.set('notes', notes);
  sbSync('notes', newNote, 'POST').catch(()=>{});
  Toast.success('تمت إضافة الملاحظة');
  App.navigate('project_detail', {id:pid});
}

function deleteNote(id, pid) {
  if (!confirm('حذف هذه الملاحظة؟')) return;
  DB.set('notes', DB.get('notes').filter(n=>n.id!==id));
  sbSyncDelete('notes', id).catch(()=>{});
  Toast.success('تم حذف الملاحظة');
  App.navigate('project_detail', {id:pid});
}

/* ─── MATERIALS ─── */
function addMat() {
  const name = document.getElementById('mName')?.value?.trim();
  if (!name) { Toast.error('أدخل اسم المادة'); return; }
  const tid = Auth.getUser().tenant_id;
  const mats = DB.get('materials');
  const newMat = { id:DB.nextId('materials'), tenant_id:tid, name, unit:document.getElementById('mUnit')?.value||'قطعة', quantity:Number(document.getElementById('mQty')?.value)||0, min_quantity:Number(document.getElementById('mMinQty')?.value)||5, unit_price:Number(document.getElementById('mPrice')?.value)||0, project_id:Number(document.getElementById('mProject')?.value)||null, supplier:document.getElementById('mSupplier')?.value||'' };
  mats.push(newMat);
  DB.set('materials', mats);
  sbSync('materials', newMat, 'POST').catch(()=>{});
  Toast.success('✅ تمت إضافة المادة');
  App.navigate('materials');
}

function updateMatQty(id, delta) {
  const mats = DB.get('materials');
  const idx = mats.findIndex(m=>m.id===id); if (idx<0) return;
  mats[idx].quantity = Math.max(0, (mats[idx].quantity||0) + delta);
  DB.set('materials', mats);
  sbSync('materials', mats[idx], 'PATCH').catch(()=>{});
  App.navigate('materials');
}

function deleteMat(id) {
  if (!confirm('حذف هذه المادة؟')) return;
  DB.set('materials', DB.get('materials').filter(m=>m.id!==id));
  sbSyncDelete('materials', id).catch(()=>{});
  Toast.success('تم الحذف'); App.navigate('materials');
}

function exportMaterials() {
  const tid = Auth.getUser().tenant_id;
  const mats = DB.get('materials').filter(m=>m.tenant_id===tid);
  const projs = DB.get('projects');
  let csv = '\uFEFFالمادة,المشروع,الكمية,الوحدة,السعر,القيمة الإجمالية,المورد,الحالة\n';
  mats.forEach(m=>{ const proj=projs.find(p=>p.id===m.project_id); csv+=`"${m.name}","${proj?.name||'—'}","${m.quantity}","${m.unit}","${m.unit_price}","${m.quantity*m.unit_price}","${m.supplier||''}","${m.quantity<=m.min_quantity?'منخفض':'كافٍ'}"\n`; });
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='materials.csv'; a.click();
  Toast.success('تم تصدير ملف CSV');
}

/* ─── EXPORT FINANCIAL CSV ─── */
function exportFinancialCSV() {
  const tid = Auth.getUser().tenant_id;
  const txs = DB.get('transactions').filter(t=>t.tenant_id===tid);
  const projs = DB.get('projects');
  let csv = '\uFEFFالتاريخ,النوع,الوصف,الفئة,المبلغ,المشروع,طريقة الدفع\n';
  txs.forEach(t=>{ const proj=projs.find(p=>p.id===t.project_id); csv+=`"${t.date}","${t.type==='revenue'?'إيراد':'مصروف'}","${t.description}","${t.category}","${t.amount}","${proj?.name||'—'}","${t.payment_method||''}"\n`; });
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='financial_report.csv'; a.click();
  Toast.success('تم تصدير التقرير المالي');
}

/* ─── EXPORT MONTHLY ATTENDANCE CSV ─── */
function exportAttendanceMonthly() {
  const tid = Auth.getUser().tenant_id;
  const workers = DB.get('workers').filter(w=>w.tenant_id===tid);
  const att = DB.get('attendance');
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const days = new Date(year, month+1, 0).getDate();
  let csv = '\uFEFFالعامل,المهنة,الأجر اليومي';
  for (let d=1; d<=days; d++) csv += `,${d}`;
  csv += ',أيام الحضور,إجمالي الراتب\n';
  workers.forEach(w=>{
    let row = `"${w.full_name}","${w.role}","${w.daily_salary}"`;
    let presentDays = 0;
    for (let d=1; d<=days; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const a = att.find(a=>a.worker_id===w.id && a.date===dateStr);
      const st = a?.status||'—';
      if(st==='present') presentDays++; else if(st==='halfday') presentDays+=0.5;
      row += `,"${st==='present'?'✓':st==='absent'?'✗':st==='halfday'?'½':st==='holiday'?'إج':'—'}"`;
    }
    row += `,"${presentDays}","${Math.round(presentDays*w.daily_salary)}"`;
    csv += row + '\n';
  });
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`attendance_${year}_${month+1}.csv`; a.click();
  Toast.success(`تم تصدير تقرير حضور ${year}/${month+1}`);
}

let currentTab = 'tenant';
function switchTab(t) {
  currentTab = 'tenant'; // always tenant on main login
  document.getElementById('tabTenant')?.classList.add('active');
}

function togglePass() {
  const p = document.getElementById('loginPass');
  if (p) p.type = p.type==='password'?'text':'password';
}

async function doLogin() {
  const email = (document.getElementById('loginEmail')?.value || '').trim().toLowerCase();
  const pass  = (document.getElementById('loginPass')?.value  || '');
  const err   = document.getElementById('loginError');
  const btn   = document.querySelector('.btn-gold');

  if (!email || !pass) {
    if (err) { err.style.display = 'flex'; setTimeout(() => err.style.display = 'none', 3000); }
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ جاري التحقق...'; }
  const resetBtn = () => { if (btn) { btn.disabled = false; btn.innerHTML = L('تسجيل الدخول →','Connexion →'); } };
  const showErrMsg = (html) => {
    if (!err) return;
    err.style.display = 'block';
    err.style.background = 'rgba(240,78,106,.1)';
    err.style.border = '1px solid rgba(240,78,106,.3)';
    err.style.color = '#F79FA9';
    err.innerHTML = html;
  };
  const showPendingMsg = () => {
    if (!err) return;
    err.style.display = 'block';
    err.style.background = 'rgba(232,184,75,.1)';
    err.style.border = '1px solid rgba(232,184,75,.3)';
    err.style.color = 'var(--gold)';
    err.innerHTML = `
      <div style="font-size:.85rem;font-weight:700;margin-bottom:.3rem">⏳ حسابك بانتظار التفعيل</div>
      <div style="font-size:.78rem;opacity:.8">تم استلام طلبك. سيصلك إيميل بعد تفعيل حسابك.</div>
    `;
  };

  try {
    // ── جلب بيانات Supabase ──
    let sbUrl = '', sbKey = '';
    if (typeof SUPABASE_HARDCODED !== 'undefined' && SUPABASE_HARDCODED.url) {
      sbUrl = SUPABASE_HARDCODED.url;
      sbKey = SUPABASE_HARDCODED.anonKey;
    } else {
      const saved = JSON.parse(localStorage.getItem('sbtp_supabase_config') || '{}');
      sbUrl = saved.url || ''; sbKey = saved.anonKey || '';
    }
    if (!sbUrl || !sbKey) throw new Error('Supabase غير مربوط');

    const sbH = { 'Content-Type':'application/json', 'apikey':sbKey, 'Authorization':`Bearer ${sbKey}` };

    // ── 1. جلب المستخدم من Supabase ──
    const uRes = await fetch(`${sbUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=*`, { headers: sbH });
    if (!uRes.ok) throw new Error('فشل الاتصال بقاعدة البيانات');
    const sbUsers = await uRes.json();

    if (!sbUsers.length) {
      resetBtn();
      showErrMsg('❌ البريد الإلكتروني أو كلمة المرور غير صحيحة');
      return;
    }

    const sbUser = sbUsers[0];

    // ── 2. تحقق من كلمة المرور (مع دعم التشفير الجديد + التوافق مع القديم) ──
    let passwordValid = false;
    try {
      if (typeof SmartCrypto !== 'undefined' && SmartCrypto.verify) {
        passwordValid = await SmartCrypto.verify(pass, sbUser.password);
      } else {
        passwordValid = (sbUser.password === pass);
      }
    } catch(e) {
      console.warn('Password verify error, falling back:', e);
      passwordValid = (sbUser.password === pass);
    }

    if (!passwordValid) {
      resetBtn();
      showErrMsg('❌ البريد الإلكتروني أو كلمة المرور غير صحيحة');
      return;
    }

    // ── 2.1. ترقية كلمة المرور إذا كانت غير مشفّرة (auto-migrate) ──
    if (typeof SmartCrypto !== 'undefined' && !SmartCrypto.isHashed(sbUser.password)) {
      try {
        const hashed = await SmartCrypto.hash(pass);
        // حدّث في Supabase وعلى المحلي
        const cfg = getSupabaseConfig?.() || {};
        if (cfg.url && cfg.key) {
          fetch(`${cfg.url}/rest/v1/users?id=eq.${sbUser.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type':'application/json',
              'apikey': cfg.key,
              'Authorization': `Bearer ${cfg.key}`,
              'Prefer':'return=minimal'
            },
            body: JSON.stringify({ password: hashed })
          }).catch(()=>{});
        }
        sbUser.password = hashed;
        console.log('🔒 تم ترقية كلمة المرور للتشفير الآمن');
      } catch(e) { console.warn('Password upgrade failed:', e); }
    }

    // ── 3. تحقق من التفعيل ──
    if (!sbUser.is_active || sbUser.account_status === 'pending') {
      resetBtn();
      showPendingMsg();
      return;
    }

    // ── 4. جلب المؤسسة من Supabase ──
    let sbTenant = null;
    if (sbUser.tenant_id) {
      const tRes = await fetch(`${sbUrl}/rest/v1/tenants?id=eq.${sbUser.tenant_id}&select=*`, { headers: sbH });
      if (tRes.ok) {
        const tArr = await tRes.json();
        if (tArr.length) sbTenant = tArr[0];
      }
    }

    // ── 5. تحقق من حالة المؤسسة ──
    if (!sbUser.is_admin && sbTenant) {
      // 5.1 — إذا الاشتراك منتهي → اعرض modal الشكر + خطط
      if (sbTenant.subscription_status === 'expired' ||
          (TrialManager && TrialManager.isExpired(sbTenant))) {

        // احسب أيام الاستخدام الفعلية
        let daysUsed = 14;
        try {
          const start = sbTenant.trial_start || sbTenant.trial_starts_at || sbTenant.created_at;
          if (start) {
            const sd = new Date(start); sd.setHours(0,0,0,0);
            const today = new Date(); today.setHours(0,0,0,0);
            daysUsed = Math.max(1, Math.floor((today - sd) / 86400000));
          }
        } catch(_) {}

        // اقفل الحساب في Supabase إن لم يكن مقفلاً بعد
        if (sbTenant.is_active !== false) {
          try { await TrialManager.lockAccountInSupabase(sbTenant.id); } catch(_) {}
        }

        resetBtn();
        // اعرض modal دون تسجيل دخول
        setTimeout(() => TrialManager.showExpiredModal(sbTenant.name, daysUsed), 200);
        return;
      }

      // 5.2 — إذا الحساب بانتظار الموافقة
      if (sbTenant.subscription_status === 'pending') {
        resetBtn();
        showPendingMsg();
        return;
      }

      // 5.3 — إذا الحساب معطل يدوياً
      if (sbTenant.is_active === false) {
        resetBtn();
        showErrMsg('🛑 ' + L(
          'حسابك معطّل من المسؤول. يُرجى التواصل معه.',
          'Compte désactivé. Veuillez contacter l\'administrateur.'
        ));
        return;
      }
    }

    // ── 6. حفظ في localStorage بالبيانات الحديثة من Supabase ──
    const localUsers = DB.get('users');
    const uidx = localUsers.findIndex(u => u.email === sbUser.email);
    if (uidx > -1) localUsers[uidx] = sbUser;
    else localUsers.push(sbUser);
    DB.set('users', localUsers);

    if (sbTenant) {
      const localTenants = DB.get('tenants');
      const tidx = localTenants.findIndex(t => t.id === sbTenant.id);
      if (tidx > -1) localTenants[tidx] = sbTenant;
      else localTenants.push(sbTenant);
      DB.set('tenants', localTenants);
    }

    // ── 7. تسجيل الجلسة ──
    Auth.currentUser = sbUser;
    sessionStorage.setItem('sbtp_user', JSON.stringify(sbUser));
    if (sbUser.is_admin) sessionStorage.setItem('sbtp_admin_auth', '1');

    resetBtn();

    Toast.success('✅ تم تسجيل الدخول بنجاح');

    if (typeof SmartAI !== 'undefined' && sbUser.tenant_id) {
      SmartAI.resetForTenant(sbUser.tenant_id);
    }
    setTimeout(() => {
      try {
        const aiCfg = getAIConfig();
        if (aiCfg && aiCfg.apiKey && aiCfg.status === 'active') {
          DEFAULT_AI_CONFIG.apiKey   = aiCfg.apiKey;
          DEFAULT_AI_CONFIG.provider = aiCfg.provider;
          DEFAULT_AI_CONFIG.model    = aiCfg.model;
          DEFAULT_AI_CONFIG.endpoint = aiCfg.endpoint;
          DEFAULT_AI_CONFIG.apiStyle = aiCfg.apiStyle || 'openai';
          DEFAULT_AI_CONFIG.status   = 'active';
        }
      } catch(e) {}
    }, 100);

    App.navigate(sbUser.is_admin ? 'admin' : 'dashboard');
    setTimeout(() => TrialManager.checkAndEnforce(), 200);

    // ⚡ تشغيل Realtime بعد تسجيل الدخول
    setTimeout(() => {
      if (typeof SmartRealtime !== 'undefined' && !SmartRealtime.isLive) {
        SmartRealtime.start(sbUser.tenant_id || null);
      }
    }, 1500);
    setTimeout(() => TrialManager.checkExpiryWarning(), 1500);

    // ✅ مزامنة شاملة بعد تسجيل الدخول:
    //    1. سحب كل بيانات المستخدم من Supabase (لكل الأجهزة)
    //    2. رفع أي عمليات معلقة في الـ Offline Queue
    setTimeout(() => {
      try { pullAllTenantDataFromSupabase(sbUser.tenant_id).catch(()=>{}); } catch(_) {}
      try {
        if (typeof DBHybrid !== 'undefined' && DBHybrid._flushOfflineQueue) {
          DBHybrid._flushOfflineQueue().catch(()=>{});
        }
      } catch(_) {}
    }, 2000);

  } catch(e) {
    console.error('❌ خطأ في تسجيل الدخول:', e.message);
    resetBtn();
    showErrMsg('❌ حدث خطأ: ' + e.message);
  }
}

/* ══════════════════════════════════════════════════════
   pullAllTenantDataFromSupabase
   ──────────────────────────────────────────────────────
   يسحب كل بيانات المؤسسة من Supabase ويدمجها مع البيانات المحلية
   يُستدعى تلقائياً عند تسجيل الدخول لضمان أحدث البيانات
══════════════════════════════════════════════════════ */
async function pullAllTenantDataFromSupabase(tenantId) {
  if (!tenantId) return;
  const cfg = getSupabaseConfig();
  if (!cfg || !cfg.url || !cfg.key) return;

  const sbH = {
    'Content-Type':'application/json',
    'apikey': cfg.key,
    'Authorization': `Bearer ${cfg.key}`
  };

  const TABLES = [
    'projects','workers','equipment','transactions','attendance',
    'materials','stock_movements','invoices','salary_records',
    'kanban_tasks','documents','obligations','notes'
  ];

  for (const table of TABLES) {
    try {
      const r = await fetch(
        `${cfg.url}/rest/v1/${table}?tenant_id=eq.${tenantId}&select=*&order=id.asc`,
        { headers: sbH }
      );
      if (!r.ok) continue;
      const remote = await r.json();
      if (!Array.isArray(remote)) continue;

      // دمج: نفضّل بيانات Supabase (أحدث) لكن نحتفظ بالسجلات المحلية التي لم تُرفع بعد
      const local = DB.get(table) || [];
      const remoteIds = new Set(remote.map(r => r.id));
      const localOnly = local.filter(l => !remoteIds.has(l.id));
      const merged = [...remote, ...localOnly];

      // حفظ مباشر في localStorage بدون استدعاء _smartSync (لأننا نسحب من السحابة)
      localStorage.setItem('sbtp5_' + table, JSON.stringify(merged));
      console.log(`📥 Pulled ${table}: ${remote.length} remote + ${localOnly.length} local-only`);
    } catch(e) {
      console.warn(`⚠️ pull ${table}:`, e.message);
    }
  }

  // إعادة رسم الصفحة الحالية بعد الجلب
  try {
    if (typeof App !== 'undefined' && App.render && App.currentPage &&
        !['landing','login','admin'].includes(App.currentPage)) {
      App.render();
    }
  } catch(_) {}

  if (typeof Toast !== 'undefined') Toast.info('📥 تم سحب أحدث البيانات من السحابة');
}

/* ══════════════════════════════════════════════════════
   🛡️ validateForm — التحقق المركزي من صحة البيانات
   يتأكد أن كل حقل متوافق مع قاعدة البيانات قبل الحفظ
══════════════════════════════════════════════════════ */
function validateForm(fields) {
  // fields = [{ val, label, type }]
  // type: 'required' | 'number' | 'email' | 'date' | 'phone'
  for (const f of fields) {
    const v = (f.val === null || f.val === undefined) ? '' : String(f.val).trim();

    if (f.type === 'required' || !f.type) {
      if (!v) {
        Toast.error(L(`⚠️ الحقل "${f.label}" مطلوب`, `⚠️ Le champ "${f.label}" est requis`));
        return false;
      }
    }

    if (f.type === 'number') {
      if (!v) {
        Toast.error(L(`⚠️ الحقل "${f.label}" مطلوب`, `⚠️ Le champ "${f.label}" est requis`));
        return false;
      }
      const n = Number(v.replace(/\s/g,'').replace(',','.'));
      if (isNaN(n) || n < 0) {
        Toast.error(L(`⚠️ "${f.label}" يجب أن يكون رقماً صحيحاً`, `⚠️ "${f.label}" doit être un nombre valide`));
        return false;
      }
    }

    if (f.type === 'email' && v) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
        Toast.error(L(`⚠️ البريد الإلكتروني "${f.label}" غير صالح`, `⚠️ Email "${f.label}" invalide`));
        return false;
      }
    }

    if (f.type === 'date' && v) {
      // يجب أن يكون بصيغة YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        Toast.error(L(`⚠️ تاريخ "${f.label}" غير صالح (أدخل بصيغة يوم/شهر/سنة)`, `⚠️ Date "${f.label}" invalide`));
        return false;
      }
    }

    if (f.type === 'phone' && v) {
      if (!/^[\d\s\+\-\(\)]{7,20}$/.test(v)) {
        Toast.error(L(`⚠️ رقم هاتف "${f.label}" غير صالح`, `⚠️ Téléphone "${f.label}" invalide`));
        return false;
      }
    }
  }
  return true;
}

/* تنظيف اسم الملف من الفراغات والرموز الخاصة (مطلوب لـ Supabase Storage) */
function sanitizeFileName(name) {
  return name
    .normalize('NFD')                     // تفكيك الحروف المركبة
    .replace(/[\u0300-\u036f]/g, '')      // حذف علامات التشكيل
    .replace(/[\u0600-\u06FF]/g, function(c) { // تحويل الأحرف العربية
      const map = {
        'ا':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh',
        'د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'ss',
        'ض':'dd','ط':'tt','ظ':'zz','ع':'aa','غ':'gh','ف':'f','ق':'q',
        'ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y',
        'ة':'a','ى':'a','أ':'a','إ':'a','آ':'a','ئ':'y','ؤ':'w','ء':'a'
      };
      return map[c] || c;
    })
    .replace(/\s+/g, '_')                 // فراغات → underscore
    .replace(/[^a-zA-Z0-9._\-]/g, '_')   // كل رمز خاص → underscore
    .replace(/_+/g, '_')                  // underscores متعددة → واحدة
    .replace(/^_|_$/g, '')                // حذف underscore من البداية والنهاية
    .toLowerCase();
}

function addProject() {
  const name = document.getElementById('pName')?.value?.trim();
  const budget = document.getElementById('pBudget')?.value;
  if (!validateForm([
    { val: name,   label: L('اسم المشروع','Nom du projet'), type: 'required' },
    { val: budget, label: L('الميزانية','Budget'),          type: 'number'   },
  ])) return;
  const tid = Auth.getUser().tenant_id;
  const projs = DB.get('projects');
  const newProject = { id:DB.nextId('projects'), tenant_id:tid, name, project_type:document.getElementById('pType')?.value||'', wilaya:document.getElementById('pWilaya')?.value||'', client_name:document.getElementById('pClient')?.value||'', phone:document.getElementById('pPhone')?.value||'', budget:Number(document.getElementById('pBudget')?.value)||0, total_spent:0, progress:0, status:'active', color:document.getElementById('pColor')?.value||'#4A90E2', phase:document.getElementById('pPhase')?.value||'', description:document.getElementById('pDesc')?.value||'', start_date:document.getElementById('pStart')?.value||'', end_date:document.getElementById('pEnd')?.value||'', is_archived:false };
  projs.push(newProject);
  DB.set('projects', projs);
  sbSync('projects', newProject, 'POST').catch(()=>{});
  Toast.success('✅ تم إضافة المشروع');
  App.navigate('projects');
}

function editProject(id) {
  const p = DB.get('projects').find(p=>p.id===id); if (!p) return;
  document.getElementById('epId').value=id; document.getElementById('epName').value=p.name;
  document.getElementById('epType').value=p.project_type||'';
  document.getElementById('epWilaya').value=p.wilaya||''; document.getElementById('epStatus').value=p.status;
  document.getElementById('epProgress').value=p.progress; document.getElementById('epBudget').value=p.budget;
  document.getElementById('epPhase').value=p.phase||''; document.getElementById('epClient').value=p.client_name||'';
  document.getElementById('epEnd').value=p.end_date||'';
  document.getElementById('editProjectModal').classList.add('show');
}

function saveProject() {
  const id=Number(document.getElementById('epId').value);
  const projs=DB.get('projects'); const idx=projs.findIndex(p=>p.id===id); if(idx<0) return;
  projs[idx]={...projs[idx], project_type:document.getElementById('epType')?.value||projs[idx].project_type||'', name:document.getElementById('epName').value, wilaya:document.getElementById('epWilaya').value, status:document.getElementById('epStatus').value, progress:Number(document.getElementById('epProgress').value)||0, budget:Number(document.getElementById('epBudget').value)||0, phase:document.getElementById('epPhase').value, client_name:document.getElementById('epClient').value, end_date:document.getElementById('epEnd').value };
  DB.set('projects',projs);
  sbSync('projects', projs[idx], 'PATCH').catch(()=>{});
  Toast.success('✅ تم تحديث المشروع');
  if (App.currentPage==='project_detail') App.navigate('project_detail',{id});
  else App.navigate('projects');
}

function deleteProject(id,name) {
  if(!confirm(`حذف المشروع "${name}"؟`)) return;
  const updProjs = DB.get('projects').map(p=>p.id===id?{...p,is_archived:true}:p);
  DB.set('projects', updProjs);
  sbSync('projects', {id, is_archived:true}, 'PATCH').catch(()=>{});
  Toast.success('تم حذف المشروع'); App.navigate('projects');
}

function addWorker() {
  const name=document.getElementById('wName')?.value?.trim(), role=document.getElementById('wRole')?.value?.trim();
  const phone=document.getElementById('wPhone')?.value?.trim();
  const salary=document.getElementById('wSalary')?.value;
  if (!validateForm([
    { val: name,   label: L('الاسم الكامل','Nom complet'), type: 'required' },
    { val: role,   label: L('المهنة','Métier'),             type: 'required' },
    { val: salary, label: L('الأجر اليومي','Salaire journalier'), type: 'number' },
    { val: phone,  label: L('الهاتف','Téléphone'),         type: 'phone'    },
  ])) return;
  const tid=Auth.getUser().tenant_id; const ws=DB.get('workers');
  const newWorker = { id:DB.nextId('workers'), tenant_id:tid, full_name:name, role, phone:document.getElementById('wPhone')?.value||'', national_id:document.getElementById('wNid')?.value||'', daily_salary:Number(document.getElementById('wSalary')?.value)||0, contract_type:document.getElementById('wContract')?.value||'daily', project_id:Number(document.getElementById('wProject')?.value)||null, hire_date:document.getElementById('wHire')?.value||'', color:document.getElementById('wColor')?.value||'#4A90E2' };
  ws.push(newWorker);
  DB.set('workers',ws);
  sbSync('workers', newWorker, 'POST').catch(()=>{});
  Toast.success('✅ تم إضافة العامل'); App.navigate('workers');
}

function editWorker(id) {
  const w=DB.get('workers').find(w=>w.id===id); if(!w) return;
  document.getElementById('ewId').value=id; document.getElementById('ewName').value=w.full_name;
  document.getElementById('ewRole').value=w.role; document.getElementById('ewPhone').value=w.phone||'';
  document.getElementById('ewSalary').value=w.daily_salary; document.getElementById('ewContract').value=w.contract_type;
  document.getElementById('ewProject').value=w.project_id||'';
  document.getElementById('editWorkerModal').classList.add('show');
}

function saveWorker() {
  const id=Number(document.getElementById('ewId').value); const ws=DB.get('workers');
  const idx=ws.findIndex(w=>w.id===id); if(idx<0) return;
  ws[idx]={...ws[idx], full_name:document.getElementById('ewName').value, role:document.getElementById('ewRole').value, phone:document.getElementById('ewPhone').value, daily_salary:Number(document.getElementById('ewSalary').value)||0, contract_type:document.getElementById('ewContract').value, project_id:Number(document.getElementById('ewProject').value)||null };
  DB.set('workers',ws);
  sbSync('workers', ws[idx], 'PATCH').catch(()=>{});
  Toast.success('✅ تم تحديث العامل'); App.navigate('workers');
}

function deleteWorker(id,name) {
  if(!confirm(`حذف العامل "${name}"؟`)) return;
  DB.set('workers', DB.get('workers').filter(w=>w.id!==id));
  sbSyncDelete('workers', id).catch(()=>{});
  Toast.success('تم حذف العامل'); App.navigate('workers');
}

function exportWorkers() {
  const tid=Auth.getUser().tenant_id; const ws=DB.get('workers').filter(w=>w.tenant_id===tid);
  const projs=DB.get('projects');
  let csv='\uFEFFالاسم,المهنة,الهاتف,الأجر,نوع العقد,تاريخ التعيين,المشروع\n';
  ws.forEach(w=>{const proj=projs.find(p=>p.id===w.project_id);csv+=`"${w.full_name}","${w.role}","${w.phone||''}","${w.daily_salary}","${w.contract_type}","${w.hire_date||''}","${proj?.name||''}"\n`;});
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='workers.csv';a.click();
  Toast.success('تم تصدير ملف CSV');
}

function addEquip() {
  const name=document.getElementById('eName')?.value?.trim();
  if(!name){Toast.error('أدخل اسم المعدة');return;}
  const tid=Auth.getUser().tenant_id; const eq=DB.get('equipment');
  const newEquip = { id:DB.nextId('equipment'), tenant_id:tid, name, model:document.getElementById('eModel')?.value||'', plate_number:document.getElementById('ePlate')?.value||'', icon:document.getElementById('eIcon')?.value||'🚜', status:'active', purchase_price:Number(document.getElementById('ePrice')?.value)||0, project_id:Number(document.getElementById('eProject')?.value)||null, notes:document.getElementById('eNotes')?.value||'' };
  eq.push(newEquip);
  DB.set('equipment',eq);
  sbSync('equipment', newEquip, 'POST').catch(()=>{});
  Toast.success('✅ تم إضافة المعدة'); App.navigate('equipment');
}

function updateEquipStatus(id,status) {
  const updEquip = DB.get('equipment').map(e=>e.id===id?{...e,status}:e);
  DB.set('equipment', updEquip);
  sbSync('equipment', {id, status}, 'PATCH').catch(()=>{});
  Toast.success('تم تحديث حالة المعدة');
}

function deleteEquip(id,name) {
  if(!confirm(`حذف "${name}"؟`)) return;
  DB.set('equipment', DB.get('equipment').filter(e=>e.id!==id));
  sbSyncDelete('equipment', id).catch(()=>{});
  Toast.success('تم حذف المعدة'); App.navigate('equipment');
}

const RCATS=["دفعة عميل","دفعة مقدمة","دفعة مرحلية","استلام نهائي","إيراد آخر"];
const ECATS=[
  "مواد البناء","حديد تسليح","أسمنت","رمل وحصى","طوب وبلوك",
  "مواد كهربائية","كابلات وأسلاك","لوحات كهربائية",
  "مواد السباكة","أنابيب وتوصيلات","صرف صحي",
  "مواد التكييف والتهوية","مواد الحدادة والمعادن",
  "مواد النجارة والأبواب","مواد الأرضيات والبلاط",
  "مواد الدهن والديكور","مواد العزل والحماية",
  "مواد الطاقة الشمسية","مواد الطرق والتهيئة",
  "رواتب العمال","مستحقات المقاولين من الباطن",
  "اكراءات المعدات","وقود","صيانة المعدات",
  "نقل ومواصلات","مصاريف إدارية","أخرى"
];

function updateTxCats() {
  const type=document.getElementById('txType')?.value;
  const cats=type==='revenue'?RCATS:ECATS;
  const sel=document.getElementById('txCat');
  if(sel) sel.innerHTML=cats.map(c=>`<option>${c}</option>`).join('');
}

function addTx() {
  const amount=document.getElementById('txAmount')?.value;
  const desc=document.getElementById('txDesc')?.value?.trim();
  if (!validateForm([
    { val: amount, label: L('المبلغ','Montant'),     type: 'number'   },
    { val: desc,   label: L('الوصف','Description'), type: 'required' },
  ])) return;
  const tid=Auth.getUser().tenant_id; const txs=DB.get('transactions');
  const pid=Number(document.getElementById('txProject')?.value)||null;
  const type=document.getElementById('txType')?.value||'expense';
  const newTx = { id:DB.nextId('transactions'), tenant_id:tid, type, category:document.getElementById('txCat')?.value||'أخرى', amount:Number(amount), description:desc, project_id:pid, date:document.getElementById('txDate')?.value||todayStr(), payment_method:document.getElementById('txPayment')?.value||'cash', supplier:document.getElementById('txSupplier')?.value||'' };
  txs.push(newTx);
  DB.set('transactions',txs);
  sbSync('transactions', newTx, 'POST').catch(()=>{});
  if(type==='expense'&&pid){
    const projs=DB.get('projects'); const pidx=projs.findIndex(p=>p.id===pid);
    if(pidx>=0){projs[pidx].total_spent=DB.get('transactions').filter(t=>t.project_id===pid&&t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);DB.set('projects',projs);sbSync('projects',projs[pidx],'PATCH').catch(()=>{});}
  }
  Toast.success('✅ تم إضافة المعاملة'); App.navigate('transactions');
}

function deleteTx(id) {
  if(!confirm('حذف هذه المعاملة؟')) return;
  DB.set('transactions', DB.get('transactions').filter(t=>t.id!==id));
  sbSyncDelete('transactions', id).catch(()=>{});
  Toast.success('تم حذف المعاملة'); App.navigate('transactions');
}

function saveAtt(wid, date, status) {
  const att = DB.get('attendance');
  const tid = Auth.getUser()?.tenant_id;
  const idx = att.findIndex(a => a.worker_id === wid && a.date === date);
  if (idx >= 0) {
    att[idx].status = status;
  } else {
    att.push({id: DB.nextId('attendance'), tenant_id: tid, worker_id: wid, date: date, status: status, hours: 8, note: ''});
  }
  DB.set('attendance', att);
  sbSync('attendance', att[att.findIndex(a=>a.worker_id===wid&&a.date===date)], idx>=0?'PATCH':'POST').catch(()=>{});
  // Live update the row
  var row = document.getElementById('attrow_' + wid);
  if (!row) return;
  var worker = DB.get('workers').find(function(w) { return w.id === wid; });
  var statusLabels = {present:L('حاضر ✅','Présent ✅'), absent:L('غائب ❌','Absent ❌'), halfday:L('نصف يوم 🔶','Demi-journée 🔶'), holiday:L('إجازة 🏖️','Congé 🏖️'), '':L('لم يُسجَّل ⏳','Non noté ⏳')};
  var statusColors = {present:'var(--green)', absent:'var(--red)', halfday:'var(--gold)', holiday:'var(--blue)', '':'var(--dim)'};
  var cells = row.cells;
  if (cells[5]) { cells[5].textContent = statusLabels[status] || statusLabels['']; cells[5].style.color = statusColors[status] || 'var(--dim)'; }
  if (cells[6] && worker) {
    var sal = Number(worker.daily_salary || 0);
    var earn = status === 'present' ? fmt(sal) : status === 'halfday' ? fmt(sal * 0.5) : '0';
    cells[6].textContent = earn + ' دج';
  }
  var hoursEl = document.getElementById('hours_' + wid);
  if (hoursEl) hoursEl.disabled = (!status || status === 'absent' || status === 'holiday');
}

function saveAttHours(wid, date, hours) {
  var att = DB.get('attendance');
  var idx = att.findIndex(function(a) { return a.worker_id === wid && a.date === date; });
  if (idx >= 0) { att[idx].hours = Number(hours); DB.set('attendance', att); sbSync('attendance', att[idx], 'PATCH').catch(()=>{}); }
}

function saveAttNote(wid, date, note) {
  var att = DB.get('attendance');
  var idx = att.findIndex(function(a) { return a.worker_id === wid && a.date === date; });
  if (idx >= 0) {
    att[idx].note = note;
    DB.set('attendance', att);
    sbSync('attendance', att[idx], 'PATCH').catch(()=>{});
  } else {
    const newAtt = {id: DB.nextId('attendance'), worker_id: wid, date: date, status: '', hours: 8, note: note};
    att.push(newAtt);
    DB.set('attendance', att);
    sbSync('attendance', newAtt, 'POST').catch(()=>{});
  }
}

function markAllStatus(status, date) {
  var tid = Auth.getUser().tenant_id;
  var workers = DB.get('workers').filter(function(w) { return w.tenant_id === tid; });
  var filterPid = Number(sessionStorage.getItem('att_proj') || 0);
  var targets = filterPid ? workers.filter(function(w) { return w.project_id === filterPid; }) : workers;
  targets.forEach(function(w) {
    var sel = document.getElementById('att_' + w.id);
    if (sel) { sel.value = status; saveAtt(w.id, date, status); }
  });
  var labels = {present:'حاضر', absent:'غائب', halfday:'نصف يوم', holiday:'إجازة'};
  Toast.success('✅ تم تحديد الكل: ' + (labels[status] || status));
}

function markAll(status) {
  markAllStatus(status, sessionStorage.getItem('att_date') || todayStr());
}


function saveTenantSettings() {

  const tid=Auth.getUser().tenant_id;
  const tenants=DB.get('tenants').map(t=>t.id===tid?{...t,name:document.getElementById('setName')?.value||t.name,wilaya:document.getElementById('setWilaya')?.value||t.wilaya,phone:document.getElementById('setPhone')?.value||t.phone,rc_number:document.getElementById('setRc')?.value||t.rc_number}:t);
  DB.set('tenants',tenants);
  const updTenant = tenants.find(t=>t.id===tid);
  if (updTenant) sbSync('tenants', updTenant, 'PATCH').catch(()=>{});
  addAuditLog(L('تعديل إعدادات الشركة','Modification paramètres société'), { icon: '⚙️' });
  Toast.success(L('✅ تم حفظ الإعدادات','✅ Paramètres sauvegardés'));
}

function saveLegalSettings() {

  const tid=Auth.getUser().tenant_id;
  const rc_number = document.getElementById('setRc')?.value||'';
  const nif = document.getElementById('setNif')?.value||'';
  const nis = document.getElementById('setNis')?.value||'';
  const article_imp = document.getElementById('setArticleImp')?.value||'';
  const rib = document.getElementById('setRib')?.value||'';
  const tva = document.getElementById('setTva')?.value||'19';
  const address = document.getElementById('setAddress')?.value||'';
  const tenants = DB.get('tenants').map(t=>t.id===tid?{...t, rc_number, nif, nis, article_imp, rib, tva_rate: parseFloat(tva), address }:t);
  DB.set('tenants', tenants);
  const updLegalTenant = tenants.find(t=>t.id===tid);
  if (updLegalTenant) sbSync('tenants', updLegalTenant, 'PATCH').catch(()=>{});
  addAuditLog(L('تعديل البيانات القانونية','Modification données légales'), { icon: '🔖' });
  Toast.success(L('✅ تم حفظ البيانات القانونية','✅ Données légales sauvegardées'));
}

function setDisplayMode(mode) {

  localStorage.setItem('sbtp_mode', mode);
  Toast.success(mode === 'basic' ? L('📱 تم التبديل إلى الوضع الأساسي','📱 Mode basique activé') : L('🚀 تم التبديل إلى الوضع المتقدم','🚀 Mode avancé activé'));
  App.navigate('settings');
}

function changePassword() {

  const current=document.getElementById('pwCurrent')?.value;
  const newPass=document.getElementById('pwNew')?.value;
  const confirm=document.getElementById('pwConfirm')?.value;
  if(!current||!newPass){Toast.error(L('أدخل كلمة المرور الحالية والجديدة','Entrez le mot de passe actuel et le nouveau'));return;}
  if(newPass!==confirm){Toast.error(L('كلمتا المرور غير متطابقتين','Les mots de passe ne correspondent pas'));return;}
  if(newPass.length<8){Toast.error(L('كلمة المرور يجب أن تكون 8 أحرف على الأقل','Le mot de passe doit comporter au moins 8 caractères'));return;}
  const user=Auth.getUser();
  if(user.password!==current){Toast.error(L('كلمة المرور الحالية غير صحيحة','Mot de passe actuel incorrect'));return;}
  const users=DB.get('users').map(u=>u.id===user.id?{...u,password:newPass}:u);
  DB.set('users',users); user.password=newPass; sessionStorage.setItem('sbtp_user',JSON.stringify(user));
  sbSync('users', {id:user.id, password:newPass}, 'PATCH').catch(()=>{});
  Toast.success(L('✅ تم تغيير كلمة المرور','✅ Mot de passe modifié avec succès'));
  ['pwCurrent','pwNew','pwConfirm'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
}

// ── تفعيل حساب جديد من الإشعار ──
async function activateAccount(notifId, userId, tenantId) {
  const btn = (typeof event !== 'undefined' && event?.target) ? event.target : null;
  const origText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري التفعيل...'; }

  const resetBtn = () => { if (btn) { btn.disabled = false; btn.textContent = origText; } };

  try {
    // ── 1. تحقق من البيانات المحلية ──
    const users   = DB.get('users')   || [];
    const tenants = DB.get('tenants') || [];
    let user      = users.find(u => u.id === userId);
    let tenant    = tenants.find(t => t.id === tenantId);

    // ── 2. جلب إعدادات Supabase (الطريقة الموحدة) ──
    const cfg = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : null;
    const sbUrl = cfg?.url || '';
    const sbKey = cfg?.key || '';

    if (!sbUrl || !sbKey) {
      Toast.error('⚠️ Supabase غير مربوط — لا يمكن تفعيل الحساب');
      resetBtn();
      return;
    }

    const sbH = {
      'Content-Type':'application/json',
      'apikey': sbKey,
      'Authorization': `Bearer ${sbKey}`,
      'Prefer':'return=representation'
    };

    // ── 3. إذا لم يجد البيانات محلياً، اجلبها من Supabase ──
    if (!user) {
      try {
        const r = await fetch(`${sbUrl}/rest/v1/users?id=eq.${userId}&select=*`, { headers: sbH });
        if (r.ok) {
          const arr = await r.json();
          if (arr.length) user = arr[0];
        }
      } catch(_) {}
    }
    if (!tenant) {
      try {
        const r = await fetch(`${sbUrl}/rest/v1/tenants?id=eq.${tenantId}&select=*`, { headers: sbH });
        if (r.ok) {
          const arr = await r.json();
          if (arr.length) tenant = arr[0];
        }
      } catch(_) {}
    }

    if (!user)   { Toast.error('❌ المستخدم غير موجود (' + userId + ')'); resetBtn(); return; }
    if (!tenant) { Toast.error('❌ المؤسسة غير موجودة (' + tenantId + ')'); resetBtn(); return; }

    // ── 4. التفعيل في Supabase أولاً (مصدر الحقيقة) مع التحقق من res.ok لكل طلب ──
    if (typeof Toast !== 'undefined') Toast.info('⏳ جاري التفعيل في Supabase...');

    const failures = [];

    // 4.1 تفعيل المستخدم
    try {
      const r = await fetch(`${sbUrl}/rest/v1/users?id=eq.${userId}`, {
        method: 'PATCH', headers: sbH,
        body: JSON.stringify({ is_active: true, account_status: 'active' })
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        throw new Error(`HTTP ${r.status} — ${errText}`);
      }
      console.log('✅ Supabase: user activated');
    } catch(e) {
      console.error('❌ فشل تفعيل المستخدم في Supabase:', e);
      failures.push('user: ' + e.message);
    }

    // 4.2 تفعيل المؤسسة
    try {
      const r = await fetch(`${sbUrl}/rest/v1/tenants?id=eq.${tenantId}`, {
        method: 'PATCH', headers: sbH,
        body: JSON.stringify({ is_active: true, subscription_status: 'trial' })
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        throw new Error(`HTTP ${r.status} — ${errText}`);
      }
      console.log('✅ Supabase: tenant activated');
    } catch(e) {
      console.error('❌ فشل تفعيل المؤسسة في Supabase:', e);
      failures.push('tenant: ' + e.message);
    }

    // 4.3 تحديث الإشعار (اختياري — لا يوقف العملية)
    try {
      await fetch(`${sbUrl}/rest/v1/notifications?id=eq.${notifId}`, {
        method: 'PATCH', headers: sbH,
        body: JSON.stringify({ status: 'activated', read: true })
      });
    } catch(_) {}

    // ── إذا فشل التفعيل في Supabase → أوقف ولا تُعدّل محلياً ──
    if (failures.length > 0) {
      Toast.error('❌ فشل التفعيل في Supabase:\n' + failures.join('\n'));
      resetBtn();
      return;
    }

    // ── 5. التفعيل المحلي (setSilent — لأن السجلات قد حُدّثت في Supabase) ──
    user.is_active      = true;
    user.account_status = 'active';
    tenant.is_active           = true;
    tenant.subscription_status = 'trial';

    const usersIdx   = users.findIndex(u => u.id === userId);
    const tenantsIdx = tenants.findIndex(t => t.id === tenantId);
    if (usersIdx >= 0)   users[usersIdx]     = user;
    else                 users.push(user);
    if (tenantsIdx >= 0) tenants[tenantsIdx] = tenant;
    else                 tenants.push(tenant);

    // setSilent للحفاظ على عدم تكرار المزامنة
    if (typeof DB.setSilent === 'function') {
      DB.setSilent('users',   users);
      DB.setSilent('tenants', tenants);
    } else {
      DB.set('users', users);
      DB.set('tenants', tenants);
    }

    // تحديث الإشعار محلياً
    const notifs = DB.get('notifications') || [];
    const notifIdx = notifs.findIndex(n => n.id === notifId);
    if (notifIdx >= 0) {
      notifs[notifIdx].status = 'activated';
      notifs[notifIdx].read   = true;
      if (typeof DB.setSilent === 'function') DB.setSilent('notifications', notifs);
      else DB.set('notifications', notifs);
    }

    // ── 6. سجل بداية التجربة كفاتورة (0 دج) للمتابعة ──
    try {
      recordSubscriptionInvoice(tenantId, tenant.plan_id || 1, {
        amount: 0, status: 'trial', method: 'activation',
        note: 'Trial started'
      });
    } catch(e) { console.warn('recordSubscriptionInvoice failed:', e); }

    // ── 7. إرسال إيميل التفعيل ──
    let emailOk = false;
    try {
      emailOk = await EMAILJS.sendActivationEmail({
        email:     user.email,
        full_name: user.full_name,
        password:  user.password,  // ⚠️ ملاحظة: مشفّرة الآن، الإيميل قد يحتاج كلمة المرور الأصلية
        company:   tenant.name || ''
      });
    } catch(e) { console.warn('Email send failed:', e); }

    // ── 8. Audit Log ──
    try {
      if (typeof AuditLog !== 'undefined') {
        AuditLog.log('activate', 'tenants', tenantId, null, { activated_by_admin: true });
      }
    } catch(_) {}

    if (emailOk) {
      Toast.success(`✅ تم تفعيل حساب "${user.full_name}" وإرسال إيميل التفعيل إلى ${user.email}`);
    } else {
      Toast.warn(`⚠️ تم التفعيل بنجاح، لكن فشل إرسال الإيميل — تحقق من إعدادات EmailJS`);
    }

    setTimeout(() => App.navigate('admin'), 1000);

  } catch(e) {
    console.error('❌ activateAccount fatal error:', e);
    Toast.error('❌ خطأ في التفعيل: ' + e.message);
    resetBtn();
  }
}

async function toggleTenant(id) {
  const tid = Number(id);
  const tenants = DB.get('tenants') || [];
  const t = tenants.find(x=>x.id===tid);
  if (!t) { Toast.error(L('المؤسسة غير موجودة','Entreprise introuvable')); return; }

  // ── حماية مؤسسة المسؤول ──
  if (tid === 1) {
    Toast.error(L('🛑 لا يمكن تعطيل مؤسسة المسؤول','🛑 Impossible de désactiver l\'organisation administrateur'));
    return;
  }

  const nextActive = !t.is_active;

  // ── جلب إعدادات Supabase ──
  const cfg = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : null;
  const sbUrl = cfg?.url || '';
  const sbKey = cfg?.key || '';

  if (!sbUrl || !sbKey) {
    Toast.error(L('⚠️ Supabase غير مربوط — لا يمكن تحديث الحالة في قاعدة البيانات السحابية',
                   '⚠️ Supabase non connecté — impossible de mettre à jour'));
    return;
  }

  // ── تحديث Supabase أولاً (مصدر الحقيقة) ──
  const sbH = {
    'Content-Type':'application/json',
    'apikey': sbKey,
    'Authorization': `Bearer ${sbKey}`,
    'Prefer': 'return=minimal'
  };

  try {
    // تحديث المؤسسة
    const tRes = await fetch(`${sbUrl}/rest/v1/tenants?id=eq.${tid}`, {
      method: 'PATCH', headers: sbH,
      body: JSON.stringify({ is_active: nextActive })
    });
    if (!tRes.ok) {
      const errText = await tRes.text().catch(()=> '');
      throw new Error(`tenant: HTTP ${tRes.status} — ${errText}`);
    }

    // تحديث جميع مستخدمي المؤسسة
    const uRes = await fetch(`${sbUrl}/rest/v1/users?tenant_id=eq.${tid}`, {
      method: 'PATCH', headers: sbH,
      body: JSON.stringify({
        is_active: nextActive,
        account_status: nextActive ? 'active' : 'suspended'
      })
    });
    if (!uRes.ok) {
      const errText = await uRes.text().catch(()=> '');
      console.warn(`⚠️ تحديث المستخدمين فشل: ${uRes.status} — ${errText}`);
      // لا نوقف العملية، الجدول الأهم (tenants) نجح
    }

    // ── نجح التحديث في Supabase → حدّث محلياً ──
    DB.set('tenants', tenants.map(x => x.id===tid ? {...x, is_active: nextActive} : x));
    const users = DB.get('users') || [];
    DB.set('users', users.map(u => u.tenant_id===tid
      ? {...u, is_active: nextActive, account_status: nextActive ? 'active' : 'suspended'}
      : u
    ));

    Toast.success(nextActive
      ? L('✅ تم تفعيل المؤسسة ومستخدميها','✅ Entreprise et utilisateurs activés')
      : L('⏸️ تم إيقاف المؤسسة ومستخدميها','⏸️ Entreprise et utilisateurs désactivés')
    );
  } catch(e) {
    console.error('❌ toggleTenant failed:', e);
    Toast.error(L(`❌ تعذر تحديث الحالة في Supabase: ${e.message}`,
                   `❌ Impossible de mettre à jour: ${e.message}`));
    return;
  }

  App.navigate('admin');
}

/* ══════════════════════════════════════════════════════
   cleanupDuplicateTenants — تنظيف المؤسسات المكررة
   ──────────────────────────────────────────────────────
   يبحث عن المؤسسات التي لها نفس الاسم أو نفس الـ NIF/RC،
   ويُبقي على الأقدم (الأصلي) ويحذف النسخ المكررة من Supabase.
══════════════════════════════════════════════════════ */
async function cleanupDuplicateTenants() {
  const cfg = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : null;
  if (!cfg?.url || !cfg?.key) {
    Toast.error('⚠️ Supabase غير مربوط');
    return;
  }

  const sbH = {
    'Content-Type':'application/json',
    'apikey': cfg.key,
    'Authorization': `Bearer ${cfg.key}`,
    'Prefer':'return=representation'
  };

  Toast.info('🔍 جاري البحث عن التكرارات...');

  try {
    // 1) جلب كل المؤسسات والمستخدمين من Supabase
    const tRes = await fetch(`${cfg.url}/rest/v1/tenants?select=*&order=id.asc`, { headers: sbH });
    const uRes = await fetch(`${cfg.url}/rest/v1/users?select=*&order=id.asc`, { headers: sbH });
    if (!tRes.ok || !uRes.ok) throw new Error('فشل جلب البيانات');

    const allTenants = await tRes.json();
    const allUsers   = await uRes.json();

    // 2) تجميع المؤسسات حسب الاسم (مع تجاهل id=1 و 2 الافتراضيين)
    const groups = new Map();
    allTenants.forEach(t => {
      if (t.id <= 2) return;  // المؤسسات الأساسية
      const key = (t.name || '').trim().toLowerCase();
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    });

    // 3) ابحث عن التكرارات
    const duplicates = [];
    groups.forEach((arr, name) => {
      if (arr.length > 1) {
        // رتّب بـ id تصاعدياً، أبقِ الأول، احذف الباقي
        arr.sort((a,b) => a.id - b.id);
        const keeper = arr[0];
        const toDelete = arr.slice(1);
        duplicates.push({ name, keeper, toDelete });
      }
    });

    // أيضاً ابحث عن users يتيمين (tenant_id غير موجود في tenants)
    const tenantIds = new Set(allTenants.map(t => t.id));
    const orphanUsers = allUsers.filter(u =>
      u.id > 2 &&  // ليس admin أو demo
      u.tenant_id !== null &&
      !tenantIds.has(u.tenant_id)
    );

    // أيضاً ابحث عن users بدون email أو full_name (نسخ مشوّهة)
    const corruptUsers = allUsers.filter(u =>
      u.id > 2 &&
      (!u.email || u.email.trim() === '' || !u.full_name || u.full_name.trim() === '')
    );

    if (duplicates.length === 0 && orphanUsers.length === 0 && corruptUsers.length === 0) {
      Toast.success('✅ لا توجد مؤسسات مكررة أو يتيمة');
      return;
    }

    // 4) عرض ملخص للموافقة
    const totalToDelete =
      duplicates.reduce((s,d) => s + d.toDelete.length, 0) +
      orphanUsers.length + corruptUsers.length;

    let msg = `سيتم حذف ${totalToDelete} عنصر مكرر/يتيم:\n\n`;
    if (duplicates.length) {
      msg += '🔁 مؤسسات مكررة:\n';
      duplicates.forEach(d => {
        msg += `  • "${d.name}" — يبقي #${d.keeper.id}، يحذف: ${d.toDelete.map(t => '#'+t.id).join(', ')}\n`;
      });
    }
    if (orphanUsers.length) {
      msg += `\n👤 مستخدمين يتامى (مؤسستهم محذوفة): ${orphanUsers.length}\n`;
      orphanUsers.slice(0,5).forEach(u => msg += `  • ${u.email || '#'+u.id}\n`);
      if (orphanUsers.length > 5) msg += `  ... و ${orphanUsers.length - 5} آخرين\n`;
    }
    if (corruptUsers.length) {
      msg += `\n⚠️ مستخدمين بدون بيانات صالحة: ${corruptUsers.length}\n`;
    }
    msg += '\n⚠️ هذه العملية لا يمكن التراجع عنها. متابعة؟';

    if (!confirm(msg)) return;

    // 5) تنفيذ الحذف
    Toast.info('⏳ جاري الحذف...');
    let deleted = 0, failed = 0;

    // 5.1 حذف المؤسسات المكررة (cascade سيحذف المستخدمين المرتبطين)
    for (const dup of duplicates) {
      for (const t of dup.toDelete) {
        try {
          const r = await fetch(`${cfg.url}/rest/v1/tenants?id=eq.${t.id}`, {
            method: 'DELETE', headers: sbH
          });
          if (r.ok) deleted++; else failed++;
        } catch(e) { failed++; }
      }
    }

    // 5.2 حذف المستخدمين اليتامى
    for (const u of orphanUsers) {
      try {
        const r = await fetch(`${cfg.url}/rest/v1/users?id=eq.${u.id}`, {
          method: 'DELETE', headers: sbH
        });
        if (r.ok) deleted++; else failed++;
      } catch(e) { failed++; }
    }

    // 5.3 حذف المستخدمين المشوّهين
    for (const u of corruptUsers) {
      try {
        const r = await fetch(`${cfg.url}/rest/v1/users?id=eq.${u.id}`, {
          method: 'DELETE', headers: sbH
        });
        if (r.ok) deleted++; else failed++;
      } catch(e) { failed++; }
    }

    // 6) إعادة سحب البيانات النظيفة لـ localStorage
    const tRes2 = await fetch(`${cfg.url}/rest/v1/tenants?select=*&order=id.asc`, { headers: sbH });
    const uRes2 = await fetch(`${cfg.url}/rest/v1/users?select=*&order=id.asc`, { headers: sbH });
    if (tRes2.ok && uRes2.ok) {
      const cleanTenants = await tRes2.json();
      const cleanUsers   = await uRes2.json();
      if (typeof DB.setSilent === 'function') {
        DB.setSilent('tenants', cleanTenants);
        DB.setSilent('users', cleanUsers);
      } else {
        localStorage.setItem('sbtp5_tenants', JSON.stringify(cleanTenants));
        localStorage.setItem('sbtp5_users', JSON.stringify(cleanUsers));
      }
    }

    if (failed === 0) {
      Toast.success(`✅ تم حذف ${deleted} عنصر مكرر/يتيم بنجاح`);
    } else {
      Toast.warn(`⚠️ تم حذف ${deleted}، فشل ${failed}`);
    }

    setTimeout(() => App.navigate('admin'), 1500);

  } catch(e) {
    console.error('cleanupDuplicateTenants error:', e);
    Toast.error('❌ ' + e.message);
  }
}


async function deleteTenantAccount(tenantId){
  const tid = Number(tenantId);
  const tenants = DB.get('tenants') || [];
  const t = tenants.find(x=>x.id===tid);
  const name = t?.name || ('#'+tid);

  // ── حماية الحسابات الأساسية ──
  if (tid === 1) {
    Toast.error(L('🛑 لا يمكن حذف مؤسسة المسؤول الأساسية','🛑 Impossible de supprimer l\'organisation administrateur'));
    return;
  }
  if (tid === 2) {
    if (!confirm(L(
      '⚠️ هذه المؤسسة هي الحساب التجريبي الافتراضي. هل أنت متأكد من حذفها نهائياً؟',
      '⚠️ Ceci est le compte de démonstration par défaut. Êtes-vous sûr de vouloir le supprimer ?'
    ))) return;
  } else {
    if (!confirm(L(
      `⚠️ حذف مؤسسة يعني حذف كل بياناتها (المستخدمين/المشاريع/الوثائق/...) نهائياً.\n\nهل تريد المتابعة؟\n${name}`,
      `⚠️ Supprimer l'entreprise effacera toutes ses données (utilisateurs/projets/documents/...) définitivement.\n\nContinuer ?\n${name}`
    ))) return;
  }

  // ── جلب إعدادات Supabase ──
  const cfg = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : null;
  const sbUrl = cfg?.url || '';
  const sbKey = cfg?.key || '';

  if (!sbUrl || !sbKey) {
    Toast.error(L('⚠️ Supabase غير مربوط — لا يمكن حذف الحساب من قاعدة البيانات السحابية',
                   '⚠️ Supabase non connecté — impossible de supprimer dans la base distante'));
    return;
  }

  // ── حفظ نسخة احتياطية محلية لإمكانية الاسترجاع عند الفشل ──
  const depTables = ['users','projects','workers','equipment','transactions','attendance',
                     'materials','stock_movements','invoices','salary_records','kanban_tasks',
                     'documents','obligations','notes','notifications'];
  const backup = { tenants: [...tenants] };
  depTables.forEach(tbl => { try { backup[tbl] = [...(DB.get(tbl) || [])]; } catch{} });

  // ── حذف من Supabase أولاً (مصدر الحقيقة) ──
  const sbH = {
    'Content-Type':'application/json',
    'apikey': sbKey,
    'Authorization': `Bearer ${sbKey}`,
    'Prefer': 'return=minimal'
  };

  // الترتيب مهم: الجداول الفرعية أولاً ثم الأم
  // (مع أن FOREIGN KEY ... ON DELETE CASCADE ستفعل ذلك تلقائياً، لكن نتأكد يدوياً)
  const sbDepTables = ['notifications','notes','obligations','kanban_tasks','documents',
    'salary_records','attendance','stock_movements','materials','invoices',
    'transactions','equipment','workers','projects','users'];

  const failures = [];
  let progress = 0;
  const totalSteps = sbDepTables.length + 1;

  // عرض رسالة تقدم
  if (typeof Toast !== 'undefined') Toast.info(L('⏳ جاري حذف المؤسسة وبياناتها...','⏳ Suppression en cours...'));

  for (const tbl of sbDepTables) {
    try {
      const res = await fetch(
        `${sbUrl}/rest/v1/${tbl}?tenant_id=eq.${tid}`,
        { method: 'DELETE', headers: sbH }
      );
      if (!res.ok) {
        const errText = await res.text().catch(()=> '');
        // 404 / 406 مقبولة (الجدول قد يكون فارغاً)
        if (res.status !== 404 && res.status !== 406) {
          console.warn(`⚠️ حذف ${tbl} من Supabase فشل (${res.status}):`, errText);
          failures.push(`${tbl}: HTTP ${res.status}`);
        }
      } else {
        console.log(`✅ حُذف من ${tbl} (tenant_id=${tid})`);
      }
      progress++;
    } catch(e) {
      console.warn(`⚠️ حذف ${tbl} من Supabase فشل:`, e.message);
      failures.push(`${tbl}: ${e.message}`);
    }
  }

  // ── حذف المؤسسة نفسها ──
  try {
    const res = await fetch(
      `${sbUrl}/rest/v1/tenants?id=eq.${tid}`,
      { method: 'DELETE', headers: sbH }
    );
    if (!res.ok) {
      const errText = await res.text().catch(()=> '');
      throw new Error(`HTTP ${res.status} — ${errText}`);
    }
    console.log(`✅ حُذفت المؤسسة #${tid} من Supabase`);
  } catch(e) {
    // فشل حذف المؤسسة الأم — أعد الاسترجاع
    console.error('❌ فشل حذف المؤسسة من Supabase:', e.message);
    Toast.error(L(`❌ تعذر حذف المؤسسة من Supabase: ${e.message}`,
                   `❌ Impossible de supprimer l'entreprise: ${e.message}`));
    return;
  }

  // ── نجح الحذف من Supabase → احذف محلياً أيضاً ──
  DB.set('tenants', tenants.filter(x => x.id !== tid));
  depTables.forEach(tbl => {
    try {
      const arr = DB.get(tbl);
      if (Array.isArray(arr)) DB.set(tbl, arr.filter(r => r.tenant_id !== tid));
    } catch{}
  });

  // ── إزالة عمليات معلّقة في Offline Queue تخص هذه المؤسسة ──
  try {
    const Q_KEY = 'sbtp5_offline_queue';
    const q = JSON.parse(localStorage.getItem(Q_KEY) || '[]');
    const filtered = q.filter(op => {
      const recTid = op?.record?.tenant_id;
      return recTid !== tid;
    });
    localStorage.setItem(Q_KEY, JSON.stringify(filtered));
    if (typeof DBHybrid !== 'undefined' && DBHybrid._updateAdminSyncUI) {
      DBHybrid._updateAdminSyncUI();
    }
  } catch{}

  if (failures.length === 0) {
    Toast.success(L(`🗑️ تم حذف "${name}" وجميع بياناتها نهائياً`,
                     `🗑️ "${name}" supprimée avec toutes ses données`));
  } else {
    Toast.warn(L(
      `⚠️ تم حذف "${name}" لكن فشل حذف ${failures.length} جدول — قد تحتاج لإعادة المزامنة`,
      `⚠️ "${name}" supprimée mais ${failures.length} table(s) ont échoué`
    ));
    console.warn('Failed deletes:', failures);
  }

  App.navigate('admin');
}

function togglePwd(tenantId, pwd) {

  const el = document.getElementById('pw_' + tenantId);
  if (!el) return;
  if (el.textContent === '••••••••') {
    el.textContent = pwd || L('(غير محدد)','(non défini)');
    el.style.color = 'var(--gold)';
  } else {
    el.textContent = '••••••••';
    el.style.color = '';
  }
}

function editTenantPlan(tenantId) {

  const tenants = DB.get('tenants');
  const plans = DB.get('plans');
  const t = tenants.find(t=>t.id===tenantId);
  if (!t) return;
  const planOptions = plans.map(p=>`<option value="${p.id}" ${t.plan_id===p.id?'selected':''}>${p.name} — ${fmt(p.price)} ${L('دج/شهر','DA/mois')}</option>`).join('');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.id = 'editPlanOverlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-title">⚙️ ${L('تعديل خطة مؤسسة','Modifier le plan')} : ${escHtml(t.name)}</div>
      <div class="form-group"><label class="form-label">${L('الخطة','Plan')}</label>
        <select class="form-select" id="editPlanSelect">${planOptions}</select>
      </div>
      <div class="form-group"><label class="form-label">${L('حالة الاشتراك','Statut abonnement')}</label>
        <select class="form-select" id="editSubStatus">
          <option value="active" ${t.subscription_status==='active'?'selected':''}>${L('نشط','Actif')}</option>
          <option value="trial" ${t.subscription_status==='trial'?'selected':''}>${L('تجريبي','Essai')}</option>
          <option value="expired" ${t.subscription_status==='expired'?'selected':''}>${L('منتهي','Expiré')}</option>
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('editPlanOverlay').remove()">${L('إلغاء','Annuler')}</button>
        <button class="btn btn-gold" onclick="saveTenantPlan(${tenantId})">💾 ${L('حفظ','Enregistrer')}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function saveTenantPlan(tenantId) {

  const planId = Number(document.getElementById('editPlanSelect')?.value);
  const subStatus = document.getElementById('editSubStatus')?.value || 'active';

  const tenantsBefore = DB.get('tenants') || [];
  const before = tenantsBefore.find(t=>t.id===tenantId);

  const updatedTenants = tenantsBefore.map(t=>t.id===tenantId?{...t, plan_id:planId, subscription_status:subStatus}:t);
  DB.set('tenants', updatedTenants);
  sbSync('tenants', {id:tenantId, plan_id:planId, subscription_status:subStatus}, 'PATCH').catch(()=>{});

  // إذا تم تفعيل الاشتراك أو تغيير الخطة أثناء تفعيل الاشتراك → سجل فاتورة اشتراك
  if (subStatus === 'active' && (!before || before.subscription_status !== 'active' || Number(before.plan_id) !== Number(planId))) {
    const now = new Date();
    const end = new Date(now); end.setMonth(end.getMonth()+1);
    recordSubscriptionInvoice(tenantId, planId, { amount: _getPlanPrice(planId), status:'paid', method:'admin_edit', period_start: now.toISOString().split('T')[0], period_end: end.toISOString().split('T')[0], note:'Admin plan update' });
  }
  document.getElementById('editPlanOverlay')?.remove();
  Toast.success(L('✅ تم تحديث خطة المؤسسة','✅ Plan de l\'entreprise mis à jour'));
  App.navigate('admin');
}


// ══════════════════════════════════════════════════════
// Subscription Invoices (Admin billing history)
// يُسجل فواتير الاشتراك (سجل المدفوعات) لكل مؤسسة
// ══════════════════════════════════════════════════════
function _getPlanPrice(planId){
  const plans = DB.get('plans') || [];
  const p = plans.find(x => Number(x.id) === Number(planId));
  return p ? Number(p.price||0) : 0;
}
function recordSubscriptionInvoice(tenantId, planId, opts={}) {
  const invs = DB.get('subscription_invoices') || [];
  const t = (DB.get('tenants')||[]).find(x=>x.id===tenantId) || {};
  const amount = (opts.amount != null) ? Number(opts.amount) : _getPlanPrice(planId);
  const now = new Date();
  const periodStart = opts.period_start || now.toISOString().split('T')[0];
  const periodEnd   = opts.period_end   || (()=>{ const d=new Date(now); d.setMonth(d.getMonth()+1); return d.toISOString().split('T')[0]; })();
  invs.unshift({
    id: Date.now(),
    tenant_id: tenantId,
    plan_id: Number(planId),
    tenant_name: t.name || '',
    amount,
    currency: 'DZD',
    status: opts.status || 'paid', // paid | trial | pending | cancelled
    method: opts.method || 'manual',
    note: opts.note || '',
    period_start: periodStart,
    period_end: periodEnd,
    date: now.toISOString(),
  });
  DB.set('subscription_invoices', invs);
}

// UI: عرض فواتير اشتراك مؤسسة
function openSubInvoicesModal(tenantId) {
  const invs = (DB.get('subscription_invoices')||[]).filter(i=>i.tenant_id===tenantId);
  const tenants = DB.get('tenants')||[];
  const t = tenants.find(x=>x.id===tenantId) || {name:'—'};
  const plans = DB.get('plans')||[];

  const totalPaid = invs.filter(i=>i.status==='paid').reduce((s,i)=>s+Number(i.amount||0),0);
  const overlay = document.createElement('div');
  overlay.className='modal-overlay show';
  overlay.id='subInvOverlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:820px">
      <div class="modal-title">🧾 ${L('فواتير الاشتراك','Factures abonnement')} — ${escHtml(t.name)}</div>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin:.4rem 0 1rem">
        <span class="badge badge-active">💰 ${L('إجمالي المدفوع','Total payé')}: ${fmt(totalPaid)} ${L('دج','DA')}</span>
        <span class="badge" style="background:rgba(255,255,255,.06);border:1px solid var(--border);color:var(--muted)">${L('عدد الفواتير','Nombre')}: ${invs.length}</span>
      </div>

      <div class="table-wrap" style="max-height:340px;overflow:auto">
        <table>
          <thead>
            <tr>
              <th>${L('التاريخ','Date')}</th>
              <th>${L('الخطة','Plan')}</th>
              <th>${L('الفترة','Période')}</th>
              <th>${L('المبلغ','Montant')}</th>
              <th>${L('الحالة','Statut')}</th>
              <th>${L('ملاحظة','Note')}</th>
            </tr>
          </thead>
          <tbody>
            ${invs.length ? invs.map(i=>{
              const p = plans.find(x=>Number(x.id)===Number(i.plan_id));
              const dateStr = new Date(i.date).toLocaleDateString(I18N.currentLang==='ar'?'ar-DZ':'fr-FR',{day:'2-digit',month:'short',year:'numeric'});
              const st = i.status||'paid';
              const badge = st==='paid'?'badge-active':st==='trial'?'badge-paused':'badge-delayed';
              const stLbl = st==='paid'?L('مدفوعة','Payée'):st==='trial'?L('تجريبية','Essai'):st==='pending'?L('معلقة','En attente'):L('ملغاة','Annulée');
              return `<tr>
                <td style="font-size:.82rem;color:var(--dim)">${dateStr}</td>
                <td style="font-weight:800">${escHtml(p?.name||('Plan '+i.plan_id))}</td>
                <td style="font-family:monospace;font-size:.78rem;direction:ltr">${escHtml(i.period_start||'')} → ${escHtml(i.period_end||'')}</td>
                <td style="font-weight:900">${fmt(i.amount||0)} ${L('دج','DA')}</td>
                <td><span class="badge ${badge}">${stLbl}</span></td>
                <td style="font-size:.82rem;color:var(--muted)">${escHtml(i.note||'—')}</td>
              </tr>`;
            }).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:1rem">${L('لا توجد فواتير اشتراك بعد','Aucune facture abonnement')}</td></tr>`}
          </tbody>
        </table>
      </div>

      <div style="margin-top:1rem;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:12px;padding:1rem">
        <div style="font-weight:800;margin-bottom:.6rem">➕ ${L('إضافة فاتورة يدوياً','Ajouter facture manuelle')}</div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">${L('الخطة','Plan')}</label>
            <select class="form-select" id="subInvPlan">
              ${(plans||[]).map(p=>`<option value="${p.id}">${escHtml(p.name)} — ${fmt(p.price)} ${L('دج/شهر','DA/mois')}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${L('المبلغ (دج)','Montant (DA)')}</label>
            <input class="form-input" id="subInvAmount" type="number" min="0" placeholder="7900" value="">
          </div>
          <div class="form-group">
            <label class="form-label">${L('بداية الفترة','Début période')}</label>
            <input class="form-input" id="subInvStart" type="date">
          </div>
          <div class="form-group">
            <label class="form-label">${L('نهاية الفترة','Fin période')}</label>
            <input class="form-input" id="subInvEnd" type="date">
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">${L('ملاحظة','Note')}</label>
            <input class="form-input" id="subInvNote" placeholder="${L('مثال: دفع نقداً / تحويل...','Ex: payé cash / virement...')}">
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('subInvOverlay')?.remove()">${L('إغلاق','Fermer')}</button>
        <button class="btn btn-gold" onclick="(function(){
          const planId=Number(document.getElementById('subInvPlan')?.value||1);
          const amountVal=document.getElementById('subInvAmount')?.value;
          const ps=document.getElementById('subInvStart')?.value||undefined;
          const pe=document.getElementById('subInvEnd')?.value||undefined;
          const note=document.getElementById('subInvNote')?.value||'';
          recordSubscriptionInvoice(${tenantId}, planId, {amount: amountVal?Number(amountVal):undefined, period_start: ps, period_end: pe, note, method:'manual', status:'paid'});
          Toast.success(L('✅ تم حفظ الفاتورة','✅ Facture enregistrée'));
          document.getElementById('subInvOverlay')?.remove();
          App.navigate('admin');
        })()">💾 ${L('حفظ','Enregistrer')}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
}


// ══════════════════════════════════════════════════════
// مزامنة لوحة الأدمن من Supabase (تُستدعى يدوياً)
// ══════════════════════════════════════════════════════
async function syncAdminFromSupabase() {
  const btn = document.getElementById('syncAdminBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري التحديث...'; }

  try {
    const sbCfg = (() => {
      if (typeof SUPABASE_HARDCODED !== 'undefined' && SUPABASE_HARDCODED.url)
        return { url: SUPABASE_HARDCODED.url, anonKey: SUPABASE_HARDCODED.anonKey };
      try { return JSON.parse(localStorage.getItem('sbtp_supabase_config')||'{}'); } catch { return {}; }
    })();
    if (!sbCfg.url || !sbCfg.anonKey) {
      if (typeof Toast !== 'undefined') Toast.warn('⚠️ لم يتم ضبط Supabase بعد');
      return;
    }
    const h = { 'apikey': sbCfg.anonKey, 'Authorization': `Bearer ${sbCfg.anonKey}` };

    // جلب المؤسسات
    const tResp = await fetch(`${sbCfg.url}/rest/v1/tenants?order=id.asc`, { headers: h });
    if (tResp.ok) {
      const sbTenants = await tResp.json();
      if (sbTenants.length) {
        const local = DB.get('tenants');
        const merged = [...sbTenants];
        local.forEach(lt => { if (!merged.find(st => st.id === lt.id)) merged.push(lt); });
        DB.set('tenants', merged);
      }
    }
    // جلب المستخدمين
    const uResp = await fetch(`${sbCfg.url}/rest/v1/users?order=id.asc`, { headers: h });
    if (uResp.ok) {
      const sbUsers = await uResp.json();
      if (sbUsers.length) {
        const local = DB.get('users');
        const merged = [...sbUsers];
        local.forEach(lu => { if (!merged.find(su => su.id === lu.id)) merged.push(lu); });
        DB.set('users', merged);
      }
    }
    // جلب الإشعارات
    const nResp = await fetch(`${sbCfg.url}/rest/v1/notifications?order=id.desc&limit=200`, { headers: h });
    if (nResp.ok) {
      const sbNotifs = await nResp.json();
      if (sbNotifs.length) {
        const local = DB.get('notifications') || [];
        const merged = [...sbNotifs];
        local.forEach(ln => { if (!merged.find(sn => sn.id === ln.id)) merged.push(ln); });
        DB.set('notifications', merged.sort((a,b) => new Date(b.date||0)-new Date(a.date||0)));
      }
    }

    if (typeof Toast !== 'undefined') Toast.success('✅ تم تحديث البيانات من Supabase');
    // إعادة رسم الصفحة بعد التحديث
    App.navigate('admin');
  } catch(e) {
    if (typeof Toast !== 'undefined') Toast.error('❌ فشل التحديث: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 تحديث من Supabase'; }
  }
}


async function addTenant() {

  const name   = document.getElementById('atName')?.value?.trim();
  const email  = document.getElementById('atEmail')?.value?.trim().toLowerCase();
  const pass   = document.getElementById('atPass')?.value;
  const admin  = document.getElementById('atAdmin')?.value?.trim();
  const planId = Number(document.getElementById('atPlan')?.value) || 2;
  const wilaya = document.getElementById('atWilaya')?.value?.trim() || '';

  if (!validateForm([
    { val: name,  label: L('اسم المؤسسة','Nom de l\'entreprise'), type: 'required' },
    { val: admin, label: L('الاسم الكامل','Nom complet'),          type: 'required' },
    { val: email, label: L('البريد الإلكتروني','Email'),           type: 'email'    },
    { val: pass,  label: L('كلمة المرور','Mot de passe'),          type: 'required' },
  ])) return;

  // منع التسجيل المزدوج محلياً
  const users = DB.get('users');
  if (users.find(u => u.email === email)) {
    Toast.error(L('هذا البريد مستخدم بالفعل','Cet email est déjà utilisé'));
    return;
  }

  // زر التأكيد — نعطّله لمنع الضغط المزدوج
  const btn = document.querySelector('[onclick="addTenant()"]');
  if (btn) { btn.disabled = true; btn.textContent = L('جاري الإنشاء...','Création...'); }
  const restoreBtn = () => { if (btn) { btn.disabled = false; btn.textContent = L('✅ إنشاء المؤسسة','✅ Créer l\'entreprise'); } };

  // ── قراءة إعدادات Supabase ──
  const sbCfg = getSupabaseConfig();
  const hasSupabase = !!(sbCfg && sbCfg.url && sbCfg.key);

  let finalTenantId, finalUserId;

  if (hasSupabase) {
    try {
      const sbH = {
        'Content-Type':  'application/json',
        'apikey':         sbCfg.key,
        'Authorization': `Bearer ${sbCfg.key}`,
        'Prefer':         'return=representation'   // ← يُرجع السجل المُدرج مع ID الجديد
      };

      // 1) التحقق من البريد في Supabase أولاً
      const chk = await fetch(
        `${sbCfg.url}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id`,
        { headers: sbH }
      );
      if (chk.ok) {
        const existing = await chk.json();
        if (existing.length) {
          Toast.error(L('هذا البريد مستخدم في Supabase بالفعل','Email déjà utilisé dans Supabase'));
          restoreBtn(); return;
        }
      }

      // 2) إدراج المؤسسة — بدون id (Supabase يولده تلقائياً بـ SERIAL)
      const tenantPayload = {
        name,
        plan_id:             planId,
        wilaya,
        is_active:           true,
        subscription_status: 'active',
        trial_start:         new Date().toISOString().split('T')[0],
        trial_end:           new Date(Date.now() + 14*86400000).toISOString().split('T')[0]
      };

      const tRes = await fetch(`${sbCfg.url}/rest/v1/tenants`, {
        method: 'POST',
        headers: sbH,
        body: JSON.stringify(tenantPayload)
      });

      if (!tRes.ok) {
        const err = await tRes.text();
        Toast.error(L(`❌ فشل حفظ المؤسسة: ${err}`, `❌ Erreur tenant: ${err}`));
        restoreBtn(); return;
      }

      const tenantData = await tRes.json();
      finalTenantId = Array.isArray(tenantData) ? tenantData[0]?.id : tenantData?.id;

      if (!finalTenantId) {
        Toast.error(L('❌ لم يتم الحصول على ID المؤسسة من Supabase','❌ ID tenant non récupéré'));
        restoreBtn(); return;
      }

      // 3) إدراج المستخدم — بدون id (Supabase يولده تلقائياً)
      const userPayload = {
        tenant_id:      finalTenantId,
        full_name:      admin,
        email,
        password:       pass,
        role:           'admin',
        is_admin:       false,
        is_active:      true,
        account_status: 'active'
      };

      const uRes = await fetch(`${sbCfg.url}/rest/v1/users`, {
        method: 'POST',
        headers: sbH,
        body: JSON.stringify(userPayload)
      });

      if (!uRes.ok) {
        const err = await uRes.text();
        Toast.error(L(`❌ فشل حفظ المستخدم: ${err}`, `❌ Erreur utilisateur: ${err}`));
        restoreBtn(); return;
      }

      const userData = await uRes.json();
      finalUserId = Array.isArray(userData) ? userData[0]?.id : userData?.id;

      Toast.success(L(`✅ تم إنشاء مؤسسة "${name}" بنجاح في Supabase`, `✅ Entreprise "${name}" créée dans Supabase`));

    } catch(e) {
      Toast.error(L(`❌ خطأ في الاتصال: ${e.message}`, `❌ Erreur connexion: ${e.message}`));
      restoreBtn(); return;
    }
  }

  // ── حفظ محلي بـ ID الحقيقي من Supabase (أو ID محلي إذا لا يوجد Supabase) ──
  const tenants = DB.get('tenants') || [];
  const localTenantId = finalTenantId || (tenants.length ? Math.max(...tenants.map(t => t.id)) + 1 : 100);
  const localUserId   = finalUserId   || (users.length   ? Math.max(...users.map(u => u.id))   + 1 : 100);

  // تجنب الإضافة المكررة محلياً
  const tenantExists = tenants.find(t => t.id === localTenantId);
  const userExists   = users.find(u => u.id === localUserId);

  if (!tenantExists) {
    tenants.push({
      id: localTenantId, name, plan_id: planId, wilaya,
      is_active: true, subscription_status: 'active',
      trial_start: new Date().toISOString().split('T')[0],
      trial_end: new Date(Date.now() + 14*86400000).toISOString().split('T')[0]
    });
  }
  if (!userExists) {
    users.push({
      id: localUserId, tenant_id: localTenantId,
      full_name: admin, email, password: pass,
      role: 'admin', is_admin: false, is_active: true, account_status: 'active'
    });
  }

  // ✅ setSilent إذا كانت السجلات قد رُفعت لـ Supabase (لتجنب التكرار)
  // أما إذا لم يكن هناك Supabase، نستخدم set العادية لرفعها لاحقاً عند الاتصال
  if (hasSupabase && typeof DB.setSilent === 'function') {
    DB.setSilent('tenants', tenants);
    DB.setSilent('users', users);
  } else {
    DB.set('tenants', tenants);
    DB.set('users', users);
  }

  if (!hasSupabase) {
    Toast.success(L(`✅ تم إنشاء مؤسسة "${name}" (محلياً فقط)`, `✅ Entreprise "${name}" créée localement`));
  }

  restoreBtn();
  App.navigate('admin');
}

/* ══════════════════════════════════════════════════════
   FORGOT PASSWORD — RESET REQUEST SYSTEM
══════════════════════════════════════════════════════ */

function showForgotModal() {

  if (!document.getElementById('forgotModal')) {
    const m = document.createElement('div');
    m.innerHTML = `
    <div class="modal-overlay show" id="forgotModal" style="z-index:2000">
      <div class="modal" style="max-width:420px">
        <div class="modal-title">🔑 ${L('إعادة تعيين كلمة المرور','Réinitialisation du mot de passe')}</div>
        <p style="font-size:.85rem;color:var(--muted);margin-bottom:1.2rem">${L('أدخل بريدك الإلكتروني وسيصل طلبك إلى المسؤول ليقوم بتعيين كلمة مرور جديدة لك.','Entrez votre email et votre demande sera transmise à l\'administrateur.')}</p>
        <div class="form-group">
          <label class="form-label">${L('البريد الإلكتروني','Email')}</label>
          <input class="form-input" id="forgotEmail" type="email" placeholder="example@company.dz" dir="ltr">
        </div>
        <div id="forgotMsg" style="display:none;padding:.7rem 1rem;border-radius:10px;font-size:.85rem;margin-bottom:.8rem"></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="document.getElementById('forgotModal').remove()">${L('إلغاء','Annuler')}</button>
          <button class="btn btn-gold" onclick="submitForgotRequest()">📨 ${L('إرسال الطلب','Envoyer la demande')}</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(m.firstElementChild);
  } else {
    document.getElementById('forgotModal').classList.add('show');
  }
}

function submitForgotRequest() {

  const email = document.getElementById('forgotEmail')?.value?.trim().toLowerCase();
  const msgEl = document.getElementById('forgotMsg');
  if (!email || !email.includes('@')) {
    msgEl.style.display='block'; msgEl.style.background='rgba(240,78,106,.1)'; msgEl.style.border='1px solid rgba(240,78,106,.3)'; msgEl.style.color='#f79fa9';
    msgEl.textContent=L('❌ أدخل بريدًا إلكترونيًا صالحًا','❌ Entrez un email valide'); return;
  }
  const users = DB.get('users');
  const user = users.find(u => u.email === email && !u.is_admin);
  if (!user) {
    msgEl.style.display='block'; msgEl.style.background='rgba(240,78,106,.1)'; msgEl.style.border='1px solid rgba(240,78,106,.3)'; msgEl.style.color='#f79fa9';
    msgEl.textContent=L('❌ لا يوجد حساب بهذا البريد الإلكتروني','❌ Aucun compte associé à cet email'); return;
  }
  const notifs = DB.get('notifications') || [];
  const already = notifs.find(n => n.type === 'reset_password' && n.user_id === user.id && n.status === 'pending');
  if (already) {
    msgEl.style.display='block'; msgEl.style.background='rgba(232,184,75,.08)'; msgEl.style.border='1px solid rgba(232,184,75,.25)'; msgEl.style.color='var(--gold)';
    msgEl.textContent=L('⏳ طلبك قيد المراجعة من المسؤول، يرجى الانتظار','⏳ Votre demande est en cours de traitement, veuillez patienter'); return;
  }
  notifs.unshift({
    id: Date.now(),
    type: 'reset_password',
    title: L('طلب إعادة تعيين كلمة المرور','Demande de réinitialisation MDP'),
    body: `${user.full_name} (${user.email}) ${L('يطلب إعادة تعيين كلمة مروره','demande une réinitialisation de mot de passe')}`,
    user_id: user.id,
    tenant_id: user.tenant_id,
    date: new Date().toISOString(),
    read: false,
    status: 'pending'
  });
  DB.set('notifications', notifs);

  // ─── إرسال إيميل للمسؤول عبر EmailJS ───
  const tenant = DB.get('tenants').find(t => t.id === user.tenant_id);
  EMAILJS.notifyResetRequest({
    full_name:   user.full_name,
    email:       user.email,
    companyName: tenant?.name || ''
  }).then(ok => {
    if (ok) console.log('📧 إيميل طلب كلمة المرور أُرسل للمسؤول');
  });
  // ─── إرسال تأكيد للمستخدم أن طلبه وصل ───
  try {
    emailjs.send(getEmailJSConfig().SERVICE_ID, getEmailJSConfig().TEMPLATE_USER, {
      to_email:    user.email,
      to_name:     user.full_name,
      user_email:  user.email,
      company_name:tenant?.name||'',
      date:        new Date().toLocaleDateString(I18N.currentLang==='ar'?'ar-DZ':'fr-DZ',{year:'numeric',month:'long',day:'numeric'}),
      new_password:'[سيتم إرسالها من المسؤول قريباً / Sera envoyé par l\'admin]',
      message:     `تم استلام طلبك لإعادة تعيين كلمة المرور. سيقوم المسؤول بمعالجة طلبك وإرسال كلمة المرور الجديدة إليك قريباً.`
    }).then(()=>console.log('✅ تأكيد الطلب أُرسل للمستخدم')).catch(e=>console.warn('تأكيد المستخدم:',e));
  } catch(e){ console.warn(e); }
  msgEl.style.display='block'; msgEl.style.background='rgba(52,195,143,.08)'; msgEl.style.border='1px solid rgba(52,195,143,.25)'; msgEl.style.color='#6eddb5';
  msgEl.textContent=L('✅ تم إرسال طلبك بنجاح! سيقوم المسؤول بتعيين كلمة مرور جديدة لك قريبًا.','✅ Demande envoyée avec succès ! L\'administrateur vous attribuera un nouveau mot de passe.');
  setTimeout(() => { document.getElementById('forgotModal')?.remove(); }, 2500);
}

function openResetModal(notifId, userId) {

  const users = DB.get('users');
  const user = users.find(u => u.id === userId);
  if (!user) { Toast.error(L('المستخدم غير موجود','Utilisateur introuvable')); return; }
  if (!document.getElementById('resetPassModal')) {
    const m = document.createElement('div');
    m.innerHTML = `
    <div class="modal-overlay show" id="resetPassModal" style="z-index:2000">
      <div class="modal" style="max-width:400px">
        <div class="modal-title">🔐 ${L('تعيين كلمة مرور جديدة','Définir un nouveau mot de passe')}</div>
        <input type="hidden" id="resetNotifId">
        <input type="hidden" id="resetUserId">
        <div style="background:rgba(74,144,226,.08);border:1px solid rgba(74,144,226,.2);border-radius:10px;padding:.75rem 1rem;margin-bottom:1rem;font-size:.85rem">
          <strong style="color:var(--blue)">👤 ${user.full_name}</strong><br>
          <span style="color:var(--muted);font-size:.78rem">${user.email}</span>
        </div>
        <div class="form-group">
          <label class="form-label">${L('كلمة المرور الجديدة','Nouveau mot de passe')} *</label>
          <input class="form-input" id="newPassValue" type="password" placeholder="${L('أدخل كلمة مرور قوية','Entrez un mot de passe fort')}" dir="ltr">
        </div>
        <div class="form-group">
          <label class="form-label">${L('تأكيد كلمة المرور','Confirmer le mot de passe')} *</label>
          <input class="form-input" id="newPassConfirm" type="password" placeholder="${L('أعد الإدخال','Répéter')}" dir="ltr">
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="document.getElementById('resetPassModal').remove()">${L('إلغاء','Annuler')}</button>
          <button class="btn btn-gold" onclick="confirmResetPass()">💾 ${L('تعيين كلمة المرور','Définir le mot de passe')}</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(m.firstElementChild);
  }
  document.getElementById('resetNotifId').value = notifId;
  document.getElementById('resetUserId').value = userId;
}

function confirmResetPass() {

  const notifId = Number(document.getElementById('resetNotifId').value);
  const userId  = Number(document.getElementById('resetUserId').value);
  const newPass = document.getElementById('newPassValue')?.value;
  const confirm = document.getElementById('newPassConfirm')?.value;
  if (!newPass || newPass.length < 6) { Toast.error(L('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل','❌ Le mot de passe doit comporter au moins 6 caractères')); return; }
  if (newPass !== confirm) { Toast.error(L('❌ كلمتا المرور غير متطابقتين','❌ Les mots de passe ne correspondent pas')); return; }
  const users = DB.get('users');
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) { Toast.error(L('المستخدم غير موجود','Utilisateur introuvable')); return; }
  users[idx].password = newPass;
  DB.set('users', users);
  const notifs = DB.get('notifications') || [];
  const ni = notifs.findIndex(n => n.id === notifId);
  if (ni >= 0) { notifs[ni].status = 'done'; notifs[ni].read = true; }
  DB.set('notifications', notifs);
  document.getElementById('resetPassModal')?.remove();

  // ─── إرسال كلمة المرور الجديدة للمستخدم عبر EmailJS ───
  const tenant = DB.get('tenants').find(t => t.id === users[idx].tenant_id);
  EMAILJS.sendNewPassword(
    { ...users[idx], company: tenant?.name || '' },
    newPass
  ).then(ok => {
    if (ok) {
      Toast.success(L(
        `✅ تم تعيين كلمة مرور جديدة لـ ${users[idx].full_name} وأُرسلت له عبر الإيميل 📧`,
        `✅ Nouveau mot de passe défini et envoyé par email à ${users[idx].full_name} 📧`
      ));
    } else {
      Toast.success(L(
        `✅ تم تعيين كلمة مرور جديدة لـ ${users[idx].full_name}`,
        `✅ Nouveau mot de passe défini pour ${users[idx].full_name}`
      ));
    }
  });
  App.navigate('admin');
}

// ── توليد وتحميل index.html محدَّث مع مفتاح AI مدمج ──
function downloadUpdatedHTML(apiKey, provider, model) {
  Toast.info('⏳ جاري توليد الملف...');
  try {
    // قراءة الكود الحالي للصفحة من الـ source
    const xhr = new XMLHttpRequest();
    xhr.open('GET', window.location.href, false); // sync
    xhr.send();
    let html = xhr.responseText;

    // استبدال سطر المفتاح الفارغ بالمفتاح الحقيقي
    const patterns = [
      // Pattern 1: apiKey: '',
      { find: /apiKey:\s*'',\s*\/\/[^\n]*المسؤول[^\n]*/g,
        replace: `apiKey: '${apiKey}', // ← مُحدَّث تلقائياً من لوحة المسؤول` },
      // Pattern 2: apiKey: '' (without comment)
      { find: /const DEFAULT_AI_CONFIG = \{[\s\S]*?apiKey:\s*'[^']*'/,
        replace: (m) => m.replace(/apiKey:\s*'[^']*'/, `apiKey: '${apiKey}'`) }
    ];

    let updated = false;
    // Replace provider and model too
    html = html.replace(
      /(const DEFAULT_AI_CONFIG\s*=\s*\{[^}]*provider:\s*')[^']*(')/,
      `$1${provider}$2`
    );
    html = html.replace(
      /(const DEFAULT_AI_CONFIG\s*=\s*\{[^}]*model:\s*')[^']*(')/,
      `$1${model}$2`
    );
    // Replace apiKey
    const oldEmpty = `apiKey: '',           // ← المسؤول يضع مفتاحه هنا مرة واحدة`;
    const oldWithKey = /apiKey: '[^']*',\s*\/\/ ← م[^'\n]*/;
    if (html.includes(oldEmpty)) {
      html = html.replace(oldEmpty, `apiKey: '${apiKey}', // ← مُحدَّث من لوحة المسؤول`);
      updated = true;
    } else if (oldWithKey.test(html)) {
      html = html.replace(oldWithKey, `apiKey: '${apiKey}', // ← مُحدَّث من لوحة المسؤول`);
      updated = true;
    }

    if (!updated) {
      // fallback: replace any existing key in DEFAULT_AI_CONFIG block
      html = html.replace(
        /(const DEFAULT_AI_CONFIG[\s\S]{0,200}apiKey:\s*')[^']*(')/,
        `$1${apiKey}$2`
      );
    }

    // تحميل الملف
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(a.href);
    Toast.success('✅ تم تحميل index.html المحدَّث — ارفعه على GitHub!');
  } catch(e) {
    Toast.error('❌ خطأ: ' + e.message);
    console.error(e);
  }
}

function dismissNotif(notifId) {
  const notifs = DB.get('notifications') || [];
  const ni = notifs.findIndex(n => n.id === notifId);
  if (ni >= 0) { notifs[ni].read = true; notifs[ni].status = notifs[ni].status || 'dismissed'; }
  DB.set('notifications', notifs);
  App.navigate('admin');
}

// ── موافقة المسؤول على طلب الترقية ──
async function approveUpgrade(notifId, tenantId) {
  const tid = Number(tenantId);
  const plan = prompt('أدخل رقم الخطة الجديدة:\n1 = المبتدئ (2,900 دج)\n2 = الاحترافي (7,900 دج)\n3 = المؤسسي (19,900 دج)');
  const planId = parseInt(plan);
  if (!planId || planId < 1 || planId > 3) { Toast.error('خطة غير صالحة'); return; }

  const tenants = DB.get('tenants');
  const t = tenants.find(x => x.id === tid);
  if (!t) { Toast.error('المؤسسة غير موجودة'); return; }

  // تحضير القيم الجديدة
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  const subEnd = end.toISOString().split('T')[0];

  // ── جلب إعدادات Supabase ──
  const cfg = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : null;
  const sbUrl = cfg?.url || '';
  const sbKey = cfg?.key || '';

  // ── تحديث Supabase أولاً (إذا متاح) ──
  if (sbUrl && sbKey) {
    const sbH = {
      'Content-Type':'application/json',
      'apikey': sbKey,
      'Authorization': `Bearer ${sbKey}`,
      'Prefer': 'return=minimal'
    };
    try {
      const tRes = await fetch(`${sbUrl}/rest/v1/tenants?id=eq.${tid}`, {
        method: 'PATCH', headers: sbH,
        body: JSON.stringify({
          plan_id: planId,
          is_active: true,
          subscription_status: 'active'
        })
      });
      if (!tRes.ok) {
        const errText = await tRes.text().catch(()=> '');
        throw new Error(`HTTP ${tRes.status} — ${errText}`);
      }
      console.log(`✅ تم تحديث المؤسسة #${tid} في Supabase (الخطة ${planId})`);
    } catch(e) {
      console.error('❌ approveUpgrade Supabase failed:', e);
      Toast.error(L(`❌ تعذر تحديث الخطة في Supabase: ${e.message}`,
                     `❌ Impossible de mettre à jour: ${e.message}`));
      return;
    }
  }

  // ── تحديث محلي ──
  t.plan_id = planId;
  t.is_active = true;
  t.subscription_status = 'active';
  t.subscription_end = subEnd;
  DB.set('tenants', tenants);

  // سجل فاتورة اشتراك
  try {
    recordSubscriptionInvoice(tid, planId, {
      amount: _getPlanPrice(planId),
      status: 'paid',
      method: 'upgrade',
      period_start: new Date().toISOString().split('T')[0],
      period_end: subEnd,
      note: 'Upgrade approved'
    });
  } catch(e) { console.warn('recordSubscriptionInvoice failed:', e); }

  // تحديث الإشعار
  const notifs = DB.get('notifications') || [];
  const ni = notifs.findIndex(n => n.id === notifId);
  if (ni >= 0) {
    notifs[ni].status = 'approved';
    notifs[ni].read = true;
    DB.set('notifications', notifs);
    // sync to Supabase
    try { await sbSync('notifications', notifs[ni], 'PATCH'); } catch(_) {}
  }

  Toast.success(L('✅ تم الموافقة على الترقية وتفعيل الحساب',
                   '✅ Mise à niveau approuvée et compte activé'));
  App.navigate('admin');
}

// ── رفض طلب الترقية ──
async function rejectUpgrade(notifId) {
  const notifs = DB.get('notifications') || [];
  const ni = notifs.findIndex(n => n.id === notifId);
  if (ni >= 0) {
    notifs[ni].status = 'rejected';
    notifs[ni].read = true;
    DB.set('notifications', notifs);
    // sync to Supabase
    try { await sbSync('notifications', notifs[ni], 'PATCH'); } catch(_) {}
  }
  Toast.warn(L('تم رفض طلب الترقية','Demande de mise à niveau rejetée'));
  App.navigate('admin');
}

// ── حفظ إعدادات EmailJS من صفحة المسؤول ──
function saveEmailJSSettings() {
  const cfg = {
    SERVICE_ID:     (document.getElementById('ejs_service')?.value||'').trim(),
    PUBLIC_KEY:     (document.getElementById('ejs_pubkey')?.value||'').trim(),
    TEMPLATE_ADMIN: (document.getElementById('ejs_tmpl_admin')?.value||'').trim(),
    TEMPLATE_USER:  (document.getElementById('ejs_tmpl_user')?.value||'').trim(),
    ADMIN_EMAIL:    (document.getElementById('ejs_email')?.value||'').trim(),
  };
  if (!cfg.SERVICE_ID || !cfg.PUBLIC_KEY) {
    Toast.error(L('❌ Service ID و Public Key مطلوبان','❌ Service ID et Public Key sont requis'));
    return;
  }
  saveEmailJSConfig(cfg);
  Toast.success(L('✅ تم حفظ إعدادات EmailJS بنجاح','✅ Configuration EmailJS sauvegardée'));
}

// ── إعادة ضبط إعدادات EmailJS للقيم الافتراضية ──
function resetEmailJSSettings() {
  if (!confirm(L('هل تريد إعادة الضبط للقيم الافتراضية؟','Réinitialiser aux valeurs par défaut ?'))) return;
  localStorage.removeItem('sbtp_emailjs_config');
  Toast.success(L('🔄 تم إعادة الضبط للقيم الافتراضية','🔄 Réinitialisé aux valeurs par défaut'));
  App.navigate('admin');
}

// ── اختبار اتصال EmailJS ──
async function testEmailJS(event) {
  const btn = event && event.target ? event.target : document.querySelector('[onclick*="testEmailJS"]');
  if(btn) { btn.disabled = true; btn.textContent = L('⏳ جاري الاختبار...','⏳ Test en cours...'); }
  try {
    const result = await emailjs.send(
      EMAILJS.SERVICE_ID,
      EMAILJS.TEMPLATE_ADMIN,
      {
        to_email:    EMAILJS.ADMIN_EMAIL,
        to_name:     L('المسؤول','Administrateur'),
        user_name:   'Test User',
        user_email:  'test@smartbtp.dz',
        company_name:'SmartStruct Test',
        plan_name:   'Test',
        wilaya:      'الجزائر',
        date:        new Date().toLocaleString('ar-DZ'),
        message:     L('هذا إيميل اختباري من SmartStruct للتحقق من اتصال EmailJS.','Ceci est un email de test de SmartStruct pour vérifier la connexion EmailJS.')
      }
    );
    Toast.success(L('✅ الاتصال يعمل! تم إرسال إيميل اختباري إلى ' + EMAILJS.ADMIN_EMAIL, '✅ Connexion OK! Email de test envoyé à ' + EMAILJS.ADMIN_EMAIL));
    if(btn) { btn.textContent = L('✅ يعمل','✅ OK'); btn.className = 'btn btn-green btn-sm'; }
  } catch(e) {
    Toast.error(L('❌ فشل الاتصال: ' + (e.text || e.message || 'خطأ غير معروف'), '❌ Connexion échouée: ' + (e.text || e.message || 'Erreur inconnue')));
    if(btn) { btn.textContent = L('❌ فشل','❌ Échec'); btn.className = 'btn btn-red btn-sm'; btn.disabled = false; }
  }
}


/* ══════════════════════════════════════════════════════
   SMOOTH SCROLL FOR LANDING ANCHORS
══════════════════════════════════════════════════════ */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (a) { e.preventDefault(); const el = document.querySelector(a.getAttribute('href')); if(el) el.scrollIntoView({behavior:'smooth'}); }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('loginPass') === document.activeElement) doLogin();
});


/* ══════════════════════════════════════════════════════
   v5.0 NEW FEATURES
══════════════════════════════════════════════════════ */


function roleBadge(role) {
  const map = {admin:'badge-role-admin',manager:'badge-role-manager',accountant:'badge-role-accountant',hr:'badge-role-hr',viewer:'badge-role-viewer'};
  return `<span class="badge ${map[role]||'badge-role-viewer'}">${ROLE_NAMES[role]||role}</span>`;
}

function avatarHtml(name, color, size=32) {
  const initials = (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('');
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color||'#4A90E2'};display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:${Math.round(size*0.35)}px;flex-shrink:0">${initials}</div>`;
}

/* Extend DB.init — لا تُضيف بيانات وهمية، فقط ضمان البنية الصحيحة */
const _origInit = DB.init.bind(DB);
DB.init = function() {
  _origInit();

  // ضمان وجود الجداول الفارغة (إذا لم تكن مهيّأة بعد)
  if (!this.get('kanban_tasks').length    && !localStorage.getItem('sbtp5_kanban_tasks'))    this.set('kanban_tasks',    []);
  if (!this.get('documents').length       && !localStorage.getItem('sbtp5_documents'))       this.set('documents',       []);
  if (!this.get('invoices').length        && !localStorage.getItem('sbtp5_invoices'))        this.set('invoices',        []);
  if (!this.get('stock_movements').length && !localStorage.getItem('sbtp5_stock_movements')) this.set('stock_movements', []);
  if (!this.get('salary_records').length  && !localStorage.getItem('sbtp5_salary_records'))  this.set('salary_records',  []);
  if (!this.get('notifications').length   && !localStorage.getItem('sbtp5_notifications'))   this.set('notifications',   []);
  if (!this.get('obligations').length     && !localStorage.getItem('sbtp5_obligations'))     this.set('obligations',     []);

  // ضمان وجود avatar_color وrole لجميع المستخدمين
  const users = this.get('users');
  let changed = false;
  users.forEach(u => {
    if (!u.role) { u.role = u.is_admin ? 'admin' : 'admin'; changed = true; }
    if (!u.avatar_color) {
      u.avatar_color = ['#4A90E2','#34C38F','#E8B84B','#9B6DFF','#FF7043'][u.id % 5];
      changed = true;
    }
  });
  if (changed) this.set('users', users);

  // ضمان monthly_base للعمال (إن وُجدوا — فقط للحساب التجريبي)
  const workers = this.get('workers');
  let wChanged = false;
  workers.forEach(w => { if (!w.monthly_base) { w.monthly_base = (w.daily_salary || 0) * 26; wChanged = true; } });
  if (wChanged) this.set('workers', workers);
};

/* ── EXTEND TOPBAR with notifications ── */
const _origTopbar = typeof topbarHTML === 'function' ? topbarHTML : null;
function topbarHTMLv5(title) {
  const user = Auth.getUser();
  const allNotifs = DB.get('notifications') || [];
  const unread = allNotifs.filter(n => n.tenant_id === user?.tenant_id && !n.read).length;
  // Admin: show a dedicated bell for pending reset-password requests (system-level)
  const adminResetPending = user?.is_admin
    ? allNotifs.filter(n => n.type === 'reset_password' && (n.status || 'pending') === 'pending').length
    : 0;
  return `<header class="topbar">
    <div style="display:flex;align-items:center;gap:.8rem">
      <button class="hamburger">☰</button>
      <span class="topbar-breadcrumb">SmartStruct / <strong>${escHtml(title)}</strong></span>
    </div>
    <div class="topbar-user" style="position:relative">
      <div id="syncPill" title="${L('حالة المزامنة مع Supabase','État de synchronisation Supabase')}"
        style="display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:.7rem;font-weight:700;cursor:pointer;background:rgba(52,195,143,.1);border:1px solid rgba(52,195,143,.25);color:#34C38F;transition:all .3s;margin-${I18N.currentLang==='ar'?'left':'right'}:.5rem"
        onclick="App.navigate('settings')">
        <span id="syncDot" style="width:7px;height:7px;border-radius:50%;background:#34C38F;display:inline-block;animation:syncPulse 2s infinite"></span>
        <span id="syncLabel">${L('متزامن','Synchronisé')}</span>
      </div>
      <div id="notifPanelWrap" style="position:relative">
        ${user?.is_admin ? `
          <div class="notif-bell" onclick="openAdminNotifTab()" title="طلبات إعادة تعيين كلمة المرور" style="margin-${I18N.currentLang==='ar'?'left':'right'}:.35rem">
            🛎️${adminResetPending>0?`<span class="notif-count">${adminResetPending>99?'99+':adminResetPending}</span>`:''}
          </div>
        ` : ''}
        <div class="notif-bell" onclick="toggleNotifPanel(this)" id="notifBell" style="cursor:pointer;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:1rem;transition:var(--transition);position:relative">
          🔔${unread>0?`<span class="notif-dot" style="position:absolute;top:4px;right:4px;width:8px;height:8px;background:var(--red);border-radius:50%;border:2px solid var(--bg)"></span>`:''}
        </div>
        ${buildNotifPanel()}
      </div>
      ${avatarHtml(user?.full_name, user?.avatar_color || '#E8B84B', 32)}
    </div>
  </header>`;
}

function openAdminNotifTab(){
  const u = Auth.getUser();
  if(!u?.is_admin) return;
  try{
    App.navigate('admin', {tab:'notif'});
    // ensure tab switch after render
    setTimeout(()=>{ try{ if(typeof switchAdminTab==='function') switchAdminTab('notif'); }catch(e){} }, 60);
  }catch(e){}
}

function buildNotifPanel() {
  const user = Auth.getUser();
  if (!user) return '';
  const notifs = DB.get('notifications').filter(n => n.tenant_id === user.tenant_id).slice(0, 8);
  if (!notifs.length) return `<div class="notif-panel" id="notifPanel" style="display:none"><div style="padding:1.5rem;text-align:center;color:var(--dim);font-size:.85rem">لا توجد إشعارات</div></div>`;
  return `<div class="notif-panel" id="notifPanel" style="display:none">
    <div style="padding:.7rem 1rem;border-bottom:1px solid var(--border);font-size:.78rem;font-weight:800;display:flex;justify-content:space-between;align-items:center">
      <span>الإشعارات</span>
      <button onclick="markAllNotifsRead()" style="background:none;border:none;color:var(--blue);font-size:.72rem;cursor:pointer;font-family:'Tajawal',sans-serif">تحديد كمقروء</button>
    </div>
    ${notifs.map(n=>`<div class="notif-item ${n.read?'':'unread'}" onclick="markNotifRead(${n.id})">
      <div style="font-size:.82rem;font-weight:700">${n.type==='warn'?'⚠️':n.type==='danger'?'🚨':'ℹ️'} ${escHtml(n.title)}</div>
      <div style="font-size:.74rem;color:var(--dim)">${escHtml(n.message)}</div>
    </div>`).join('')}
  </div>`;
}

function toggleNotifPanel(el) {
  const p = document.getElementById('notifPanel');
  if (!p) return;
  const isVisible = p.style.display === 'block';
  p.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) {
    // Close when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closePanel(e) {
        const wrap = document.getElementById('notifPanelWrap');
        if (wrap && !wrap.contains(e.target)) {
          p.style.display = 'none';
          document.removeEventListener('click', closePanel);
        }
      });
    }, 0);
  }
}
function markAllNotifsRead() {
  const tid = Auth.getUser()?.tenant_id;
  DB.set('notifications', DB.get('notifications').map(n => n.tenant_id === tid ? {...n, read:true} : n));
  const p = document.getElementById('notifPanel');
  if (p) p.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--dim);font-size:.85rem">لا توجد إشعارات جديدة</div>`;
}
function markNotifRead(id) {
  DB.set('notifications', DB.get('notifications').map(n => n.id === id ? {...n, read:true} : n));
}
function addNotification(tid, title, message, type='info') {
  const notifs = DB.get('notifications');
  notifs.unshift({id:DB.nextId('notifications'),tenant_id:tid,title,message,read:false,date:todayStr(),type});
  DB.set('notifications', notifs);
}

/* ── SIDEBAR v5 - extends with new nav items ── */
const _origSidebarHTML = sidebarHTML;
function sidebarHTML(active='') {
  const user = Auth.getUser();
  const tenant = Auth.getTenant();
  const unread = DB.get('notifications').filter(n => n.tenant_id === user?.tenant_id && !n.read).length;
  const isAdmin = user?.is_admin;

  // Helper: render a nav link only if user can view that page
  function navLink(page, icon, label, badge='') {
    if (!isAdmin && !canView(page)) return ''; // hide if no access
    const isReadOnly = !isAdmin && !canWrite(page) && canView(page);
    const lockIcon = isReadOnly ? ' <span style="font-size:.55rem;opacity:.5;margin-right:auto">👁️</span>' : '';
    return `<button class="nav-link ${active===page?'active':''}" data-nav="${page}">
      <span class="nav-link-icon">${icon}</span>${label}${lockIcon}${badge}
    </button>`;
  }

  let navHTML = '';
  if (isAdmin) {
    const un = (DB.get('notifications')||[]).filter(n=>!n.read).length;
    const unBadge = un>0?`<span style="background:var(--red);color:#fff;border-radius:20px;padding:0 6px;font-size:.6rem;margin-right:auto">${un}</span>`:'';
    navHTML = `
      <div class="nav-section-label">الإدارة</div>
      <button class="nav-link ${active==='admin'?'active':''}" data-nav="admin"><span class="nav-link-icon">👑</span>لوحة التحكم${unBadge}</button>
    `;
  } else {
    // ── Main Section ──
    const mainLinks = [
      navLink('dashboard','📊',__('nav.dashboard')),
      navLink('analytics','📈',__('nav.analytics')),
      navLink('ai_analysis','🤖', I18N.currentLang==='ar'?'تحليل SmartAI':'Analyse SmartAI'),
    ].filter(Boolean).join('');

    // ── Projects Section ──
    const projectLinks = [
      navLink('projects','🏗️',__('nav.projects')),
      navLink('compare','📊',__('nav.compare')),
      navLink('calendar','🗓️',__('nav.calendar')),
      navLink('map','🗺️',__('nav.map')),
      navLink('kanban','📋',__('nav.kanban')),
      navLink('gantt','📅',__('nav.gantt')),
    ].filter(Boolean).join('');

    // ── HR Section ──
    const hrLinks = [
      navLink('workers','👷',__('nav.workers')),
      navLink('attendance','📋',__('nav.attendance')),
      navLink('salary','💵',__('nav.salary')),
    ].filter(Boolean).join('');

    // ── Finance Section ──
    const finLinks = [
      navLink('transactions','💰',__('nav.transactions')),
      navLink('invoices','🧾',__('nav.invoices')),
    ].filter(Boolean).join('');

    // ── Stock Section ──
    const stockLinks = [
      navLink('inventory','📦',__('nav.inventory')),
      navLink('equipment','🚜',__('nav.equipment')),
    ].filter(Boolean).join('');

    // ── Docs & Reports Section ──
    const docLinks = [
      navLink('documents','📁',__('nav.documents')),
      navLink('dz_documents','📚',L('وثائق إدارية ومالية','Documents administratifs')),
      navLink('reports','📈',__('nav.reports')),
      navLink('bank_report','🏦',L('تقرير بنكي','Rapport bancaire')),
      navLink('simulator','🧮',L('محاكي الربح','Simulateur')),
      navLink('obligations','⏰',L('الالتزامات','Obligations')),
      navLink('audit_log','📋',L('سجل النشاط','Journal activité')),
    ].filter(Boolean).join('');

    // ── Account Section ──
    const accountLinks = [
      navLink('team','👥',__('nav.team')),
      navLink('settings','⚙️',__('nav.settings')),
    ].filter(Boolean).join('');

    // Build nav with sections (only show section label if it has items)
    navHTML = '';
    if(mainLinks)     navHTML += `<div class="nav-section-label">${__('section.main')}</div>${mainLinks}`;
    if(projectLinks)  navHTML += `<div class="nav-section-label">${__('section.projects')}</div>${projectLinks}`;
    if(hrLinks)       navHTML += `<div class="nav-section-label">${__('section.hr')}</div>${hrLinks}`;
    if(finLinks)      navHTML += `<div class="nav-section-label">${__('section.finance')}</div>${finLinks}`;
    if(stockLinks)    navHTML += `<div class="nav-section-label">${__('section.stock')}</div>${stockLinks}`;
    if(docLinks)      navHTML += `<div class="nav-section-label">${__('section.docs')}</div>${docLinks}`;
    if(accountLinks)  navHTML += `<div class="nav-section-label">${__('section.account')}</div>${accountLinks}`;
  }

  // Role badge shown in footer
  const roleName = ROLE_NAMES[user?.role] || '';
  const roleColor = {admin:'var(--gold)',manager:'var(--blue)',accountant:'var(--green)',hr:'var(--purple)',viewer:'var(--dim)'}[user?.role]||'var(--dim)';

  return `<aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">${ssLogo(20)}</div>
      <div><div class="sidebar-logo-text">SmartStruct</div><div class="sidebar-logo-sub">منصة المقاولة الذكية</div></div>
      <button class="sidebar-close-btn" onclick="window.closeSidebar()" title="إغلاق">✕</button>
    </div>
    <nav class="sidebar-nav">${navHTML}</nav>
    <div class="sidebar-footer">
      <div class="tenant-chip">
        ${avatarHtml(user?.full_name, user?.avatar_color, 32)}
        <div style="flex:1;min-width:0">
          <div class="tenant-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(user?.full_name||'')}</div>
          <div style="display:flex;align-items:center;gap:4px">
            <div class="tenant-plan" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(tenant?.name||'')}</div>
            ${!isAdmin&&roleName?`<span style="font-size:.58rem;padding:1px 5px;border-radius:8px;background:rgba(255,255,255,0.06);color:${roleColor};flex-shrink:0">${roleName}</span>`:''}
          </div>
        </div>
      </div>
      ${unread>0?`<div style="font-size:.72rem;color:var(--gold);padding:.3rem .8rem;background:rgba(232,184,75,0.08);border-radius:8px;margin-bottom:.4rem">🔔 ${unread} ${L('إشعار جديد','nouvelle(s) notification(s)')}</div>`:''}
      <div style="display:flex;gap:.4rem;margin-bottom:.4rem">
        <button onclick="I18N.setLang('ar')" style="flex:1;padding:.3rem;border-radius:8px;border:1px solid ${I18N.currentLang==='ar'?'var(--gold)':'var(--border)'};background:${I18N.currentLang==='ar'?'var(--gold-dim)':'transparent'};color:${I18N.currentLang==='ar'?'var(--gold)':'var(--muted)'};cursor:pointer;font-family:'Tajawal',sans-serif;font-size:.72rem;font-weight:700">🇩🇿 عربي</button>
        <button onclick="I18N.setLang('fr')" style="flex:1;padding:.3rem;border-radius:8px;border:1px solid ${I18N.currentLang==='fr'?'var(--gold)':'var(--border)'};background:${I18N.currentLang==='fr'?'var(--gold-dim)':'transparent'};color:${I18N.currentLang==='fr'?'var(--gold)':'var(--muted)'};cursor:pointer;font-family:'Tajawal',sans-serif;font-size:.72rem;font-weight:700">🇫🇷 FR</button>
      </div>
      <!-- ⚡ Realtime Badge -->
      <div style="margin-bottom:.4rem">
        <span id="rtBadge" style="
          display:inline-flex;align-items:center;gap:5px;
          padding:3px 10px;border-radius:20px;font-size:.68rem;font-weight:700;
          background:${typeof SmartRealtime!=='undefined'&&SmartRealtime.isLive?'rgba(52,195,143,.12)':'rgba(240,78,106,.10)'};
          color:${typeof SmartRealtime!=='undefined'&&SmartRealtime.isLive?'#34C38F':'#F04E6A'};
          border:1px solid ${typeof SmartRealtime!=='undefined'&&SmartRealtime.isLive?'rgba(52,195,143,.3)':'rgba(240,78,106,.25)'};
          cursor:default;width:100%;justify-content:center;
        ">
          ${typeof SmartRealtime!=='undefined'&&SmartRealtime.isLive?'⚡ Realtime نشط':'⚡ Realtime غير متصل'}
        </span>
      </div>
      <button class="nav-link logout" onclick="Auth.logout()">🚪 ${L('تسجيل الخروج','Déconnexion')}</button>
    </div>
  </aside>`;
}
/* ── OVERRIDE topbarHTML ── */
topbarHTML = topbarHTMLv5;

/* ── KANBAN PAGE ── */
Pages.kanban = function() {
  const tid = Auth.getUser().tenant_id;
  const projects = DB.get('projects').filter(p => p.tenant_id===tid && !p.is_archived);
  const tasks = DB.get('kanban_tasks').filter(t => t.tenant_id===tid);
  const users = DB.get('users').filter(u => u.tenant_id===tid);
  const priorityColors = {high:'var(--red)',medium:'var(--orange)',low:'var(--dim)'};
  const priorityLabels = {high:'عالية',medium:'متوسطة',low:'منخفضة'};
  const cols = [
    {key:'todo',label:'قيد الانتظار',color:'var(--dim)'},
    {key:'inprogress',label:'جاري التنفيذ',color:'var(--blue)'},
    {key:'review',label:'مراجعة',color:'var(--orange)'},
    {key:'done',label:'مكتمل',color:'var(--green)'},
  ];
  return layoutHTML('kanban', 'Kanban Board', `
    <div class="page-header">
      <div><div class="page-title">📋 لوحة Kanban</div><div class="page-sub">اسحب البطاقات بين الأعمدة — Drag & Drop</div></div>
      <div class="page-actions">
        <button class="btn btn-gold btn-sm" data-modal-open="addTaskModal">+ مهمة جديدة</button>
      </div>
    </div>
    <p style="font-size:.75rem;color:var(--dim);margin-bottom:.8rem">💡 اسحب البطاقات أفقياً لتغيير حالتها</p>
    <div class="kanban-board" id="kanbanBoard" style="direction:ltr;padding-bottom:2rem;padding-left:.5rem;padding-right:.5rem">
      ${cols.map(col => {
        const colTasks = tasks.filter(t => t.col === col.key);
        return `<div class="kanban-col-v5" data-col="${col.key}"
          ondragover="event.preventDefault();kanbanDragOver(event,this)"
          ondragleave="kanbanDragLeave(this)"
          ondrop="kanbanDrop(event,'${col.key}')">
          <div class="kanban-col-header">
            <span style="color:${col.color}">${col.label}</span>
            <span class="kanban-count">${colTasks.length}</span>
          </div>
          <div class="kanban-tasks-list">
            ${colTasks.map(task => {
              const assignee = users.find(u => u.id === task.assignee_id);
              const proj = projects.find(p => p.id === task.project_id);
              return `<div class="kanban-task-card" draggable="true" data-task-id="${task.id}"
                ondragstart="kanbanDragStart(event,${task.id})"
                ondragend="kanbanDragEnd(event)">
                <div style="font-weight:700;font-size:.83rem;margin-bottom:.4rem">${escHtml(task.title)}</div>
                <div style="display:flex;gap:.5rem;flex-wrap:wrap;font-size:.7rem;color:var(--dim)">
                  ${proj?`<span>🏗️ ${escHtml(proj.name.substring(0,12))}</span>`:''}
                  <span style="color:${priorityColors[task.priority]||'var(--dim)'}">${priorityLabels[task.priority]||''}</span>
                  ${task.due_date?`<span>📅 ${fmtDate(task.due_date)}</span>`:''}
                </div>
                ${assignee?`<div style="display:flex;align-items:center;gap:.4rem;margin-top:.5rem">${avatarHtml(assignee.full_name,assignee.avatar_color,20)}<span style="font-size:.7rem;color:var(--dim)">${escHtml(assignee.full_name)}</span></div>`:''}
                <div style="margin-top:.5rem;display:flex;gap:.3rem">
                  <button class="btn btn-red btn-sm" style="padding:.15rem .4rem;font-size:.65rem" onclick="deleteKanbanTask(${task.id})">🗑️</button>
                </div>
              </div>`;
            }).join('')}
          </div>
          <button class="kanban-add-task-btn" onclick="quickAddTask('${col.key}')">+ إضافة مهمة</button>
        </div>`;
      }).join('')}
    </div>
    <div class="modal-overlay" id="addTaskModal">
      <div class="modal">
        <div class="modal-title">📋 مهمة جديدة</div>
        <div class="form-group"><label class="form-label">عنوان المهمة *</label><input class="form-input" id="taskTitle" placeholder="وصف المهمة..."></div>
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">المشروع</label><select class="form-select" id="taskProject"><option value="">—</option>${projects.map(p=>`<option value="${p.id}">${escHtml(p.name)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">الأولوية</label><select class="form-select" id="taskPriority"><option value="medium">متوسطة</option><option value="high">عالية</option><option value="low">منخفضة</option></select></div>
          <div class="form-group"><label class="form-label">المسؤول</label><select class="form-select" id="taskAssignee"><option value="">—</option>${users.map(u=>`<option value="${u.id}">${escHtml(u.full_name)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">تاريخ الاستحقاق</label><input class="form-input" type="date" id="taskDue"></div>
          <div class="form-group"><label class="form-label">العمود</label><select class="form-select" id="taskCol"><option value="todo">قيد الانتظار</option><option value="inprogress">جاري</option><option value="review">مراجعة</option><option value="done">مكتمل</option></select></div>
        </div>
        <div class="modal-footer"><button class="btn btn-ghost" data-modal-close>إلغاء</button><button class="btn btn-gold" onclick="addKanbanTask()">💾 حفظ</button></div>
      </div>
    </div>
  `);
};

/* ── KANBAN DRAG & DROP ── */
let _dragTaskId = null;
function kanbanDragStart(e, taskId) {
  _dragTaskId = taskId;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function kanbanDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
}
function kanbanDragOver(e, col) {
  e.preventDefault();
  col.classList.add('drag-over');
}
function kanbanDragLeave(col) {
  col.classList.remove('drag-over');
}
function kanbanDrop(e, colKey) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!_dragTaskId) return;
  const tasks = DB.get('kanban_tasks');
  const idx = tasks.findIndex(t => t.id === _dragTaskId);
  if (idx >= 0) { tasks[idx].col = colKey; DB.set('kanban_tasks', tasks); sbSync('kanban_tasks', tasks[idx], 'PATCH').catch(()=>{}); }
  _dragTaskId = null;
  App.navigate('kanban');
  Toast.success('✅ تم نقل المهمة');
}
function addKanbanTask() {
  const title = document.getElementById('taskTitle')?.value?.trim();
  if (!title) { Toast.error('أدخل عنوان المهمة'); return; }
  const tid = Auth.getUser().tenant_id;
  const tasks = DB.get('kanban_tasks');
  const newTask = {id:DB.nextId('kanban_tasks'),tenant_id:tid,title,project_id:Number(document.getElementById('taskProject')?.value)||null,priority:document.getElementById('taskPriority')?.value||'medium',assignee_id:Number(document.getElementById('taskAssignee')?.value)||null,due_date:document.getElementById('taskDue')?.value||null,col:document.getElementById('taskCol')?.value||'todo'};
  tasks.push(newTask);
  DB.set('kanban_tasks', tasks);
  sbSync('kanban_tasks', newTask, 'POST').catch(()=>{});
  Toast.success('✅ تم إضافة المهمة');
  App.navigate('kanban');
}
function deleteKanbanTask(id) {
  if (!confirm('حذف هذه المهمة؟')) return;
  DB.set('kanban_tasks', DB.get('kanban_tasks').filter(t => t.id !== id));
  sbSyncDelete('kanban_tasks', id).catch(()=>{});
  Toast.success('تم الحذف'); App.navigate('kanban');
}
function quickAddTask(col) {
  const sel = document.getElementById('taskCol');
  if (sel) sel.value = col;
  document.getElementById('addTaskModal')?.classList.add('show');
}

/* ── GANTT PAGE ── */
Pages.gantt = function() {
  const tid = Auth.getUser().tenant_id;
  const projects = DB.get('projects').filter(p => p.tenant_id===tid && !p.is_archived);

  // Projects with no dates → show warning card
  const validProjects = projects.filter(p => p.start_date && p.end_date);
  const noDateProjects = projects.filter(p => !p.start_date || !p.end_date);

  if (!projects.length) return layoutHTML('gantt', 'Gantt Chart', `
    <div class="empty">
      <div class="empty-icon">📅</div>
      <div class="empty-title">لا توجد مشاريع</div>
      <div class="empty-text">أضف مشاريع أولاً لعرض الجدول الزمني</div>
    </div>`);

  // Fallback if no valid date projects
  if (!validProjects.length) return layoutHTML('gantt', 'Gantt Chart', `
    <div class="page-header">
      <div><div class="page-title">📅 Gantt Chart</div><div class="page-sub">الجدول الزمني التفاعلي للمشاريع</div></div>
    </div>
    <div class="alert alert-error">⚠️ لا توجد مشاريع بتواريخ بداية ونهاية محددة. يرجى تعديل المشاريع وإضافة التواريخ.</div>
    <div class="grid-cards">
      ${projects.map(p=>`
        <div class="card" style="display:flex;align-items:center;gap:1rem">
          <div style="width:10px;height:40px;border-radius:4px;background:${p.color};flex-shrink:0"></div>
          <div style="flex:1">
            <div style="font-weight:700">${escHtml(p.name)}</div>
            <div style="font-size:.75rem;color:var(--red)">⚠️ بدون تواريخ</div>
          </div>
          <button class="btn btn-blue btn-sm" onclick="editProject(${p.id})">✏️ تعديل</button>
        </div>`).join('')}
    </div>`);

  // Calculate date range from valid projects only
  const allDates = validProjects.flatMap(p => [new Date(p.start_date), new Date(p.end_date)]);
  const minDate = new Date(Math.min(...allDates.map(d=>d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d=>d.getTime())));
  // Add padding
  minDate.setDate(minDate.getDate() - 15);
  maxDate.setDate(maxDate.getDate() + 30);

  const totalDays = Math.ceil((maxDate - minDate) / (1000*60*60*24));
  const today = new Date();
  const todayOffset = Math.ceil((today - minDate) / (1000*60*60*24));

  // Responsive: smaller day width on mobile
  const DAY_W = window.innerWidth < 768 ? 4 : 6;
  const LABEL_W = window.innerWidth < 768 ? 130 : 180;

  // Build months header
  let months = [];
  let cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cur <= maxDate) {
    months.push(new Date(cur));
    cur = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
  }

  const monthsHTML = months.map(m => {
    const daysInM = new Date(m.getFullYear(), m.getMonth()+1, 0).getDate();
    const startOff = Math.max(0, Math.ceil((m - minDate) / (1000*60*60*24)));
    return `<div style="position:absolute;left:${startOff*DAY_W}px;width:${daysInM*DAY_W}px;font-size:.62rem;color:var(--dim);font-weight:700;text-align:center;border-right:1px solid rgba(255,255,255,0.06);padding-top:5px;overflow:hidden">${MONTHS_AR[m.getMonth()]} ${m.getFullYear()}</div>`;
  }).join('');

  const rowsHTML = projects.map(p => {
    const start = new Date(p.start_date), end = new Date(p.end_date);
    const hasDate = !isNaN(start) && !isNaN(end) && p.start_date && p.end_date;
    const pct = Math.max(0, Math.min(100, p.progress || 0));

    let barHTML = '';
    if (hasDate) {
      const left = Math.max(0, Math.ceil((start - minDate) / (1000*60*60*24)));
      const width = Math.max(14, Math.ceil((end - start) / (1000*60*60*24)));
      const isOverdue = end < today && p.status !== 'completed';
      barHTML = `
        <div style="position:absolute;left:${left*DAY_W}px;width:${width*DAY_W}px;height:26px;background:rgba(255,255,255,0.07);border-radius:5px;border:1px solid rgba(255,255,255,0.08)">
          <div style="width:${pct}%;height:100%;background:${isOverdue?'var(--red)':p.color};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:800;color:#fff;overflow:hidden;transition:width 0.6s ease">
            ${pct>15?pct+'%':''}
          </div>
        </div>`;
    } else {
      barHTML = `<div style="position:absolute;left:8px;font-size:.7rem;color:var(--dim);line-height:26px">بدون تواريخ</div>`;
    }

    return `<div class="gantt-row-v5" style="min-height:48px">
      <div style="width:${LABEL_W}px;flex-shrink:0;padding:.45rem .8rem;border-left:1px solid rgba(255,255,255,0.05)">
        <div style="display:flex;align-items:center;gap:.4rem">
          <div style="width:8px;height:8px;border-radius:50%;background:${p.color};flex-shrink:0"></div>
          <div style="font-weight:700;font-size:.78rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(p.name)}</div>
        </div>
        <div style="font-size:.62rem;color:var(--dim);margin-top:2px">${pct}% • ${hasDate?fmtDate(p.start_date):'—'}</div>
      </div>
      <div style="flex:1;position:relative;padding:.45rem 0;overflow:hidden">
        <div style="position:relative;height:26px;width:${totalDays*DAY_W}px">
          ${barHTML}
          ${todayOffset>0 && todayOffset<totalDays ? `<div style="position:absolute;left:${todayOffset*DAY_W}px;top:-6px;bottom:-6px;width:2px;background:var(--red);border-radius:2px;opacity:0.9;z-index:2"></div>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  const noDateWarning = noDateProjects.length
    ? `<div class="alert" style="background:rgba(232,184,75,0.08);border:1px solid rgba(232,184,75,0.25);color:var(--gold);font-size:.8rem;margin-bottom:1rem">
        ⚠️ ${noDateProjects.length} مشروع بدون تواريخ: ${noDateProjects.map(p=>escHtml(p.name)).join('، ')}
      </div>`
    : '';

  return layoutHTML('gantt', 'Gantt Chart', `
    <div class="page-header">
      <div>
        <div class="page-title">📅 Gantt Chart</div>
        <div class="page-sub">الجدول الزمني التفاعلي للمشاريع</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-gold btn-sm" onclick="window.print()">🖨️ طباعة</button>
      </div>
    </div>
    ${noDateWarning}
    <div class="card" style="padding:0;overflow:hidden">
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
        <div style="min-width:${LABEL_W + totalDays*DAY_W}px">

          <!-- Header: months -->
          <div style="display:flex;border-bottom:1px solid var(--border);background:rgba(255,255,255,0.02);height:30px;position:sticky;top:0;z-index:5">
            <div style="width:${LABEL_W}px;flex-shrink:0;padding:.4rem .8rem;font-size:.7rem;font-weight:800;color:var(--dim);border-left:1px solid rgba(255,255,255,0.05)">المشروع</div>
            <div style="flex:1;position:relative;height:30px">${monthsHTML}</div>
          </div>

          <!-- Rows -->
          ${rowsHTML}

          <!-- Legend -->
          <div style="padding:.6rem 1rem;font-size:.7rem;color:var(--dim);border-top:1px solid var(--border);display:flex;gap:1.2rem;flex-wrap:wrap">
            <span style="display:inline-flex;align-items:center;gap:.4rem">
              <span style="width:16px;height:2px;background:var(--red);display:inline-block;border-radius:1px"></span>اليوم
            </span>
            <span style="display:inline-flex;align-items:center;gap:.4rem">
              <span style="width:16px;height:8px;background:rgba(255,255,255,0.07);border-radius:3px;display:inline-block"></span>نطاق المشروع
            </span>
          </div>
        </div>
      </div>
    </div>
  `);
};

/* ── ANALYTICS PAGE ── */
Pages.analytics = function() {
  const tid = Auth.getUser().tenant_id;
  const txs = DB.get('transactions').filter(t => t.tenant_id===tid);
  const projects = DB.get('projects').filter(p => p.tenant_id===tid && !p.is_archived);
  const workers  = DB.get('workers').filter(w => w.tenant_id===tid);
  const equip    = DB.get('equipment').filter(e => e.tenant_id===tid);
  const attendance = DB.get('attendance').filter(a => workers.find(w=>w.id===a.worker_id));
  const revenue = txs.filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  return layoutHTML('analytics', 'التحليلات', `
    <div class="page-header">
      <div><div class="page-title">📊 التحليلات والرسوم البيانية</div></div>
      <div class="page-actions"><button class="btn btn-gold btn-sm" onclick="window.print()">🖨️ PDF</button></div>
    </div>
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card"><div class="stat-icon">📈</div><div class="stat-value" style="color:var(--green);font-size:1.1rem">${fmt(revenue)}</div><div class="stat-label">الإيرادات (دج)</div></div>
      <div class="stat-card"><div class="stat-icon">📉</div><div class="stat-value" style="color:var(--red);font-size:1.1rem">${fmt(expense)}</div><div class="stat-label">المصاريف (دج)</div></div>
      <div class="stat-card"><div class="stat-icon">💹</div><div class="stat-value" style="color:${revenue-expense>=0?'var(--green)':'var(--red)'};font-size:1.1rem">${fmt(revenue-expense)}</div><div class="stat-label">الربح الصافي (دج)</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="chart-card"><div class="chart-title">📊 الإيرادات الشهرية</div><canvas id="chartRevenue" height="220"></canvas></div>
      <div class="chart-card"><div class="chart-title">🍩 توزيع المصاريف</div><canvas id="chartExpense" height="220"></canvas></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div class="chart-card"><div class="chart-title">💹 تطور الربح الصافي</div><canvas id="chartProfit" height="220"></canvas></div>
      <div class="chart-card"><div class="chart-title">🏗️ تقدم المشاريع</div><canvas id="chartProjects" height="220"></canvas></div>
    </div>

    <!-- ══ التحليلات الذكية ══ -->
    ${renderTenantSmartAIAnalytics(projects, txs, workers, equip, attendance, tid)}
  `);
};

function initAnalyticsCharts() {
  const tid = Auth.getUser()?.tenant_id;
  if (!tid) return;
  // تحميل Chart.js عند الحاجة
  if (typeof Chart === 'undefined') {
    if (typeof window.loadChartJS === 'function') {
      window.loadChartJS().then(() => initAnalyticsCharts());
    }
    return;
  }
  const txs = DB.get('transactions').filter(t => t.tenant_id===tid);
  const projects = DB.get('projects').filter(p => p.tenant_id===tid && !p.is_archived);
  const now = new Date();
  const monthlyData = Array.from({length:6}, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const rev = txs.filter(t=>t.type==='revenue'&&(t.date||'').startsWith(key)).reduce((s,t)=>s+Number(t.amount),0);
    const exp = txs.filter(t=>t.type==='expense'&&(t.date||'').startsWith(key)).reduce((s,t)=>s+Number(t.amount),0);
    return {label:MONTHS_AR[d.getMonth()], rev, exp, profit:rev-exp};
  });
  Chart.defaults.color = '#8892A4';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
  Chart.defaults.font.family = 'Tajawal';
  const opts = {responsive:true,plugins:{legend:{display:false}}};
  const ctxR = document.getElementById('chartRevenue');
  if (ctxR) new Chart(ctxR, {type:'bar',data:{labels:monthlyData.map(m=>m.label),datasets:[{data:monthlyData.map(m=>Math.round(m.rev/1000)),backgroundColor:'rgba(52,195,143,0.6)',borderColor:'#34C38F',borderWidth:2,borderRadius:6}]},options:{...opts,scales:{y:{ticks:{callback:v=>`${v}K`}}}}});
  const catMap = {};
  txs.filter(t=>t.type==='expense').forEach(t=>{catMap[t.category]=(catMap[t.category]||0)+Number(t.amount);});
  const topCats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const ctxE = document.getElementById('chartExpense');
  if (ctxE && topCats.length) new Chart(ctxE, {type:'doughnut',data:{labels:topCats.map(([k])=>k),datasets:[{data:topCats.map(([,v])=>v),backgroundColor:['#F04E6A','#4A90E2','#E8B84B','#34C38F','#9B6DFF','#FF7043'],borderWidth:0}]},options:{...opts,plugins:{legend:{display:true,position:'bottom',labels:{font:{size:10},boxWidth:10}}}}});
  const ctxP = document.getElementById('chartProfit');
  if (ctxP) new Chart(ctxP, {type:'line',data:{labels:monthlyData.map(m=>m.label),datasets:[{data:monthlyData.map(m=>Math.round(m.profit/1000)),borderColor:'#E8B84B',backgroundColor:'rgba(232,184,75,0.1)',fill:true,tension:0.4,pointRadius:4,pointBackgroundColor:'#E8B84B'}]},options:{...opts,scales:{y:{ticks:{callback:v=>`${v}K`}}}}});
  const ctxPr = document.getElementById('chartProjects');
  if (ctxPr && projects.length) new Chart(ctxPr, {type:'bar',data:{labels:projects.slice(0,6).map(p=>p.name.substring(0,12)),datasets:[{data:projects.slice(0,6).map(p=>p.progress),backgroundColor:projects.slice(0,6).map(p=>p.color),borderRadius:6}]},options:{...opts,indexAxis:'y',scales:{x:{max:100,ticks:{callback:v=>`${v}%`}}}}});
}

/* ── SALARY PAGE ── */
Pages.salary = function() {
  const tid = Auth.getUser().tenant_id;
  const workers = DB.get('workers').filter(w => w.tenant_id===tid);
  const att = DB.get('attendance');
  const records = DB.get('salary_records').filter(r => r.tenant_id===tid);
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const selectedMonthKey = App.params.monthKey || currentMonthKey;
  const [sy, sm] = selectedMonthKey.split('-').map(Number);
  const monthLabel = MONTHS_AR[sm-1] + ' ' + sy;
  const monthAtt = att.filter(a => (a.date||'').startsWith(selectedMonthKey));
  const calcSalary = w => {
    const wAtt = monthAtt.filter(a => a.worker_id===w.id);
    const pDays = wAtt.filter(a=>a.status==='present').length;
    const hDays = wAtt.filter(a=>a.status==='halfday').length;
    if (w.contract_type==='monthly') return {base:Number(w.monthly_base||w.daily_salary*26), present:pDays, half:hDays, total:Number(w.monthly_base||w.daily_salary*26)};
    return {base:Number(w.monthly_base||w.daily_salary*26), present:pDays, half:hDays, total:Math.round((pDays+hDays*0.5)*Number(w.daily_salary))};
  };
  const total = workers.reduce((s,w)=>s+calcSalary(w).total, 0);
  // build month options
  const monthOpts = Array.from({length:6}, (_,i) => {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return `<option value="${key}"${key===selectedMonthKey?' selected':''}>${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}</option>`;
  }).join('');
  return layoutHTML('salary', L('الرواتب','Salaires'), `
    <div class="page-header">
      <div><div class="page-title">💵 ${L('الرواتب الشهرية','Salaires mensuels')}</div><div class="page-sub">${monthLabel}</div></div>
      <div class="page-actions">
        <select class="form-select" style="width:auto" onchange="App.navigate('salary',{monthKey:this.value})">${monthOpts}</select>
        <button class="btn btn-ghost btn-sm" onclick="printSalary()">🖨️ ${L('طباعة PDF','Imprimer PDF')}</button>
        ${canDo('salary')?`<button class="btn btn-gold" onclick="payAllSalaries('${selectedMonthKey}')">💳 ${L('صرف الكل','Payer tout')}</button>`:''}
      </div>
    </div>
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card"><div class="stat-icon">💵</div><div class="stat-value" style="color:var(--green);font-size:1.1rem">${fmt(total)}</div><div class="stat-label">إجمالي الرواتب (دج)</div></div>
      <div class="stat-card"><div class="stat-icon">👷</div><div class="stat-value">${workers.length}</div><div class="stat-label">${L('عدد العمال','Nb ouvriers')}</div></div>
      <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value" style="color:var(--blue)">${records.filter(r=>r.month_key===selectedMonthKey).length}</div><div class="stat-label">تم الصرف</div></div>
    </div>
    <div style="display:grid;gap:.8rem">
      ${workers.map(w => {
        const calc = calcSalary(w);
        const paid = records.find(r=>r.worker_id===w.id&&r.month_key===selectedMonthKey);
        return `<div class="salary-card">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem">
            <div style="display:flex;align-items:center;gap:.8rem">
              ${avatarHtml(w.full_name, w.color, 44)}
              <div>
                <div style="font-weight:800;font-size:.9rem">${escHtml(w.full_name)}</div>
                <div style="font-size:.74rem;color:var(--dim)">${escHtml(w.role)} • ${w.contract_type==='monthly'?L('عقد شهري','Contrat mensuel'):L('أجر يومي','Journalier')}</div>
              </div>
            </div>
            <div style="text-align:left">
              <div style="font-size:1.1rem;font-weight:900;color:var(--green);font-family:monospace">${fmt(calc.total)} دج</div>
              <div style="display:flex;gap:.3rem;justify-content:flex-end;align-items:center;margin-top:.3rem">
                <button class="btn btn-blue btn-sm" onclick="DZDocsUI.openForWorker('paie',${w.id},{baseSalary:${calc.total},daysWorked:${calc.present+calc.half},monthKey:'${selectedMonthKey}'})" title="${L('كشف راتب PDF احترافي','Bulletin paie PDF')}">📄 ${L('كشف PDF','Bulletin PDF')}</button>
                ${paid?`<span class="badge badge-active">✅ تم الصرف</span>`:canDo('salary')?`<button class="btn btn-gold btn-sm" onclick="paySalary(${w.id},'${selectedMonthKey}',${calc.total})">💳 صرف</button>`:'<span class="badge">معلق</span>'}
              </div>
            </div>
          </div>
          <div class="salary-breakdown">
            <div class="salary-line"><span>أيام الحضور</span><span>${calc.present} يوم${calc.half?` + ${calc.half} نصف يوم`:''}</span></div>
            <div class="salary-line"><span>الأجر اليومي</span><span>${fmt(w.daily_salary)} دج/يوم</span></div>
            <div class="salary-line total-line"><span>الراتب المستحق</span><span>${fmt(calc.total)} دج</span></div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `);
};

function paySalary(wid, monthKey, amount) {
  const records = DB.get('salary_records');
  if (records.find(r=>r.worker_id===wid&&r.month_key===monthKey)) { Toast.warn('تم صرف الراتب مسبقاً'); return; }
  const worker = DB.get('workers').find(w=>w.id===wid);
  const tid = Auth.getUser().tenant_id;
  const newSalary = {id:DB.nextId('salary_records'),tenant_id:tid,worker_id:wid,month_key:monthKey,amount,paid_date:todayStr()};
  records.push(newSalary);
  DB.set('salary_records', records);
  sbSync('salary_records', newSalary, 'POST').catch(()=>{});
  const txs = DB.get('transactions');
  const salTx = {id:DB.nextId('transactions'),tenant_id:tid,project_id:worker?.project_id||null,type:'expense',category:'رواتب العمال',amount,description:`راتب ${worker?.full_name||''} — ${monthKey}`,date:todayStr(),payment_method:'bank',worker_id:wid};
  txs.push(salTx);
  DB.set('transactions', txs);
  sbSync('transactions', salTx, 'POST').catch(()=>{});
  Toast.success(`✅ تم صرف راتب ${worker?.full_name||''}`);
  App.navigate('salary', {monthKey});
}

function payAllSalaries(monthKey) {
  if (!confirm('صرف رواتب جميع العمال لهذا الشهر؟')) return;
  const tid = Auth.getUser().tenant_id;
  const workers = DB.get('workers').filter(w=>w.tenant_id===tid);
  const att = DB.get('attendance');
  const records = DB.get('salary_records');
  let paid = 0;
  workers.forEach(w => {
    if (records.find(r=>r.worker_id===w.id&&r.month_key===monthKey)) return;
    const wAtt = att.filter(a=>a.worker_id===w.id&&(a.date||'').startsWith(monthKey));
    let amount;
    if (w.contract_type==='monthly') amount = Number(w.monthly_base||w.daily_salary*26);
    else amount = Math.round((wAtt.filter(a=>a.status==='present').length+wAtt.filter(a=>a.status==='halfday').length*0.5)*Number(w.daily_salary));
    if (amount > 0) {
      records.push({id:DB.nextId('salary_records'),tenant_id:tid,worker_id:w.id,month_key:monthKey,amount,paid_date:todayStr()});
      paid++;
    }
  });
  DB.set('salary_records', records);
  // Sync all new salary records to Supabase
  records.filter(r=>r.paid_date===todayStr()).forEach(r => sbSync('salary_records', r, 'POST').catch(()=>{}));
  Toast.success(`✅ تم صرف رواتب ${paid} عامل`);
  App.navigate('salary', {monthKey});
}

/* ── INVOICES PAGE ── */
Pages.invoices = function() {
  const tid = Auth.getUser().tenant_id;
  const invoices = DB.get('invoices').filter(i=>i.tenant_id===tid);
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid);
  const tenant = Auth.getTenant();
  const total_paid = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+Number(i.amount),0);
  const total_pending = invoices.filter(i=>i.status==='pending').reduce((s,i)=>s+Number(i.amount),0);
  const today = new Date(); today.setHours(0,0,0,0);
  const total_overdue = invoices.filter(i=>{
    if(i.status==='paid') return false;
    if(!i.due_date) return false;
    return new Date(i.due_date) < today;
  }).reduce((s,i)=>s+Number(i.amount),0);
  const total_count_overdue = invoices.filter(i=>{
    if(i.status==='paid') return false;
    if(!i.due_date) return false;
    return new Date(i.due_date) < today;
  }).length;

  const filterStatus = sessionStorage.getItem('inv_filter_status')||'all';
  let filtered = invoices;
  if(filterStatus==='paid') filtered=invoices.filter(i=>i.status==='paid');
  else if(filterStatus==='pending') filtered=invoices.filter(i=>i.status==='pending'&&(!i.due_date||new Date(i.due_date)>=today));
  else if(filterStatus==='overdue') filtered=invoices.filter(i=>i.status!=='paid'&&i.due_date&&new Date(i.due_date)<today);

  const nextNum = 'FAC-'+(new Date().getFullYear())+'-'+String(invoices.length+1).padStart(3,'0');

  return layoutHTML('invoices', L('الفواتير','Factures'), `
    <div class="page-header">
      <div>
        <div class="page-title">🧾 ${L('الفواتير','Factures')}</div>
        <div class="page-sub">${invoices.length} ${L('فاتورة','facture(s)')}</div>
      </div>
      <div class="page-actions">
        ${canDo('transactions')?`<button class="btn btn-gold" data-modal-open="addInvModal">+ ${L('فاتورة جديدة','Nouvelle facture')}</button>`:''}
        <div style="position:relative;display:inline-block" class="dz-dd">
          <button class="btn btn-blue" onclick="toggleFinDocs(event)" title="${L('وثائق مالية إضافية','Documents financiers')}">📚 ${L('وثائق مالية','Docs financiers')} ▾</button>
          <div id="finDocsMenu" class="dz-dd-menu" style="display:none;position:absolute;top:100%;${I18N.currentLang==='ar'?'right':'left'}:0;margin-top:4px;background:var(--card-bg,#0e1720);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.4);min-width:240px;z-index:100;padding:.3rem">
            <div style="padding:.4rem .8rem;font-size:.7rem;color:var(--dim);font-weight:700;text-transform:uppercase;letter-spacing:.5px">${L('قبل التعاقد','Pré-contrat')}</div>
            <button class="dz-dd-item" onclick="DZDocsUI.open('proforma')">📋 ${L('فاتورة شكلية (Proforma)','Facture Proforma')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.open('devis')">📊 ${L('كشف كمي وتقديري','Devis Estimatif')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.open('bpu')">💰 ${L('جدول أسعار وحدوية','Bordereau Prix Unit.')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.open('offre')">🏢 ${L('عرض الخدمة','Offre de Service')}</button>
            <div style="padding:.4rem .8rem;font-size:.7rem;color:var(--dim);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:.3rem;border-top:1px solid var(--border)">${L('المرحلية','Intermédiaires')}</div>
            <button class="dz-dd-item" onclick="DZDocsUI.open('acompte')">⏩ ${L('فاتورة تسبيق','Facture d\'Acompte')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.open('situation')">📈 ${L('كشف أشغال (وضعية)','Situation de Travaux')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.open('def_invoice')">🏁 ${L('فاتورة نهائية','Facture Définitive')}</button>
            <button class="dz-dd-item" onclick="DZDocsUI.open('quittance')">🧾 ${L('وصل تسديد','Quittance Paiement')}</button>
          </div>
        </div>
        <button class="btn btn-ghost" onclick="exportInvoicesCSV()">📥 CSV</button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:1.5rem">
      <div class="stat-card" style="border-color:rgba(52,195,143,0.2)">
        <div class="stat-icon">✅</div>
        <div class="stat-value" style="color:var(--green);font-size:1.1rem">${fmt(total_paid)}</div>
        <div class="stat-label">${L('مدفوعة (دج)','Payées (DA)')}</div>
        <div style="font-size:.7rem;color:var(--dim);margin-top:4px">${invoices.filter(i=>i.status==='paid').length} ${L('فاتورة','facture(s)')}</div>
      </div>
      <div class="stat-card" style="border-color:rgba(255,112,67,0.2)">
        <div class="stat-icon">⏳</div>
        <div class="stat-value" style="color:var(--orange);font-size:1.1rem">${fmt(total_pending)}</div>
        <div class="stat-label">${L('معلقة (دج)','En attente (DA)')}</div>
        <div style="font-size:.7rem;color:var(--dim);margin-top:4px">${invoices.filter(i=>i.status==='pending').length} ${L('فاتورة','facture(s)')}</div>
      </div>
      <div class="stat-card" style="border-color:rgba(240,78,106,0.2)">
        <div class="stat-icon">🔴</div>
        <div class="stat-value" style="color:var(--red);font-size:1.1rem">${fmt(total_overdue)}</div>
        <div class="stat-label">${L('متأخرة (دج)','En retard (DA)')}</div>
        <div style="font-size:.7rem;color:var(--dim);margin-top:4px">${total_count_overdue} ${L('فاتورة','facture(s)')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🧾</div>
        <div class="stat-value">${invoices.length}</div>
        <div class="stat-label">${L('إجمالي الفواتير','Total factures')}</div>
        <div style="font-size:.7rem;color:var(--dim);margin-top:4px">${invoices.length>0?Math.round(total_paid/(total_paid+total_pending+total_overdue)*100||0):0}% ${L('تم تحصيله','encaissé')}</div>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div style="display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap">
      <button class="btn ${filterStatus==='all'?'btn-gold':'btn-ghost'} btn-sm" onclick="sessionStorage.setItem('inv_filter_status','all');App.navigate('invoices')">${L('الكل','Tout')} (${invoices.length})</button>
      <button class="btn ${filterStatus==='paid'?'btn-green':'btn-ghost'} btn-sm" onclick="sessionStorage.setItem('inv_filter_status','paid');App.navigate('invoices')">✅ ${L('مدفوعة','Payées')} (${invoices.filter(i=>i.status==='paid').length})</button>
      <button class="btn ${filterStatus==='pending'?'btn-blue':'btn-ghost'} btn-sm" onclick="sessionStorage.setItem('inv_filter_status','pending');App.navigate('invoices')">⏳ ${L('معلقة','En attente')} (${invoices.filter(i=>i.status==='pending').length})</button>
      <button class="btn ${filterStatus==='overdue'?'btn-red':'btn-ghost'} btn-sm" onclick="sessionStorage.setItem('inv_filter_status','overdue');App.navigate('invoices')">🔴 ${L('متأخرة','En retard')} (${total_count_overdue})</button>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>${L('الرقم','N° Facture')}</th>
          <th>${L('العميل','Client')}</th>
          <th>${L('المشروع','Projet')}</th>
          <th>${L('المبلغ TTC','Montant TTC')}</th>
          <th>${L('تاريخ الإصدار','Date émission')}</th>
          <th>${L('تاريخ الاستحقاق','Date échéance')}</th>
          <th>${L('الحالة','Statut')}</th>
          <th>${L('الإجراءات','Actions')}</th>
        </tr></thead>
        <tbody>${filtered.length===0?`<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--dim)">${L('لا توجد فواتير','Aucune facture')}</td></tr>`:filtered.map(inv=>{
          const proj=projects.find(p=>p.id===inv.project_id);
          const isOverdue = inv.status!=='paid' && inv.due_date && new Date(inv.due_date)<today;
          const tvaRate=tenant?.tva_rate||19;
          const amountHT=Math.round(Number(inv.amount)/(1+tvaRate/100));
          let statusBadge='';
          if(inv.status==='paid') statusBadge=`<span class="badge badge-active">✅ ${L('مدفوعة','Payée')}</span>`;
          else if(isOverdue) statusBadge=`<span class="badge badge-delayed">🔴 ${L('متأخرة','En retard')}</span>`;
          else statusBadge=`<span class="badge badge-paused">⏳ ${L('معلقة','En attente')}</span>`;
          return `<tr ${isOverdue?'style="background:rgba(240,78,106,0.04)"':''}>
            <td style="font-family:monospace;color:var(--gold);font-size:.82rem;font-weight:700">${escHtml(inv.number)}</td>
            <td style="font-weight:700">${escHtml(inv.client)}</td>
            <td style="font-size:.78rem;color:var(--dim)">${proj?escHtml(proj.name.substring(0,22)):'—'}</td>
            <td>
              <div style="font-family:monospace;font-weight:700">${fmt(inv.amount)} ${L('دج','DA')}</div>
              <div style="font-size:.72rem;color:var(--dim)">HT: ${fmt(amountHT)}</div>
            </td>
            <td style="font-size:.8rem;color:var(--dim)">${fmtDate(inv.date)}</td>
            <td style="font-size:.8rem;color:${isOverdue?'var(--red)':'var(--dim)'};font-weight:${isOverdue?'700':'400'}">${inv.due_date?fmtDate(inv.due_date):'—'}</td>
            <td>${statusBadge}</td>
            <td><div style="display:flex;gap:.3rem;flex-wrap:wrap">
              <button class="btn btn-blue btn-sm" onclick="exportInvoicePDF(${inv.id})" title="${L('تصدير PDF','Exporter PDF')}">📄 PDF</button>
              <button class="btn btn-ghost btn-sm" onclick="printInvoiceWindow(${inv.id})" title="${L('طباعة','Imprimer')}">🖨️</button>
              ${inv.status==='paid'?`<button class="btn btn-ghost btn-sm" onclick="DZDocsUI.openForInvoice('quittance',${inv.id})" title="${L('وصل تسديد PDF','Quittance PDF')}">🧾</button>`:''}
              ${inv.status!=='paid'&&canDo('transactions')?`<button class="btn btn-green btn-sm" onclick="markInvoicePaid(${inv.id})" title="${L('تأشير كمدفوعة','Marquer payée')}">✅</button>`:''}
              ${canDo('transactions')?`<button class="btn btn-red btn-sm" onclick="deleteInvoiceItem(${inv.id})">🗑️</button>`:''}
            </div></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>

    <!-- ADD INVOICE MODAL with Items -->
    <div class="modal-overlay" id="addInvModal">
      <div class="modal modal-lg" style="max-width:700px">
        <div class="modal-title">🧾 ${L('فاتورة جديدة','Nouvelle facture')}</div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">${L('رقم الفاتورة *','N° Facture *')}</label>
            <input class="form-input" id="invNum" value="${nextNum}" placeholder="FAC-2025-001">
          </div>
          <div class="form-group">
            <label class="form-label">${L('العميل *','Client *')}</label>
            <input class="form-input" id="invClient" placeholder="${L('اسم العميل أو الشركة','Nom client ou société')}">
          </div>
          <div class="form-group">
            <label class="form-label">${L('المشروع','Projet')}</label>
            <select class="form-select" id="invProj">
              <option value="">—</option>
              ${projects.map(p=>`<option value="${p.id}">${escHtml(p.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${L('الحالة','Statut')}</label>
            <select class="form-select" id="invSt">
              <option value="pending">${L('معلقة','En attente')}</option>
              <option value="paid">${L('مدفوعة','Payée')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${L('تاريخ الإصدار','Date émission')}</label>
            <input class="form-input" id="invDt" type="date" value="${todayStr()}">
          </div>
          <div class="form-group">
            <label class="form-label">${L('تاريخ الاستحقاق','Date échéance')}</label>
            <input class="form-input" id="invDue" type="date">
          </div>
          <div class="form-group">
            <label class="form-label">${L('طريقة الدفع','Mode paiement')}</label>
            <select class="form-select" id="invPayMethod">
              <option value="cash">${L('نقداً','Espèces')}</option>
              <option value="bank">${L('تحويل بنكي','Virement bancaire')}</option>
              <option value="check">${L('شيك','Chèque')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${L('نسبة TVA (%)','Taux TVA (%)')}</label>
            <input class="form-input" id="invTVA" type="number" value="${tenant?.tva_rate||19}" min="0" max="100">
          </div>
        </div>

        <!-- Invoice Line Items -->
        <div style="margin-top:1rem">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem">
            <label class="form-label" style="margin:0">${L('بنود الفاتورة','Lignes de la facture')}</label>
            <button class="btn btn-ghost btn-sm" onclick="addInvLine()">${L('+ إضافة بند','+ Ajouter ligne')}</button>
          </div>
          <div id="invLines">
            <div class="inv-line-row" style="display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:.4rem;align-items:center;margin-bottom:.4rem">
              <input class="form-input" placeholder="${L('وصف الخدمة / المادة','Description service / article')}" oninput="calcInvTotal()">
              <input class="form-input" type="number" placeholder="${L('الكمية','Qté')}" value="1" min="0" oninput="calcInvTotal()">
              <input class="form-input" type="number" placeholder="${L('سعر الوحدة','Prix unit.')} (دج)" min="0" oninput="calcInvTotal()">
              <button class="btn btn-ghost btn-sm" onclick="this.closest('.inv-line-row').remove();calcInvTotal()">✕</button>
            </div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:.8rem 1rem;margin-top:.6rem">
            <div style="display:flex;justify-content:space-between;font-size:.85rem;color:var(--muted);margin-bottom:.3rem">
              <span>${L('المجموع خارج رسم (HT)','Sous-total HT')}</span>
              <span id="inv_total_ht" style="font-family:monospace">0 ${L('دج','DA')}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:.85rem;color:var(--muted);margin-bottom:.3rem">
              <span>TVA (<span id="inv_tva_pct">${tenant?.tva_rate||19}</span>%)</span>
              <span id="inv_total_tva" style="font-family:monospace">0 ${L('دج','DA')}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:1rem;font-weight:900;color:var(--gold);border-top:1px solid var(--border);padding-top:.4rem;margin-top:.3rem">
              <span>${L('الإجمالي (TTC)','Total TTC')}</span>
              <span id="inv_total_ttc" style="font-family:monospace">0 ${L('دج','DA')}</span>
            </div>
          </div>
        </div>

        <div class="form-group" style="margin-top:.8rem">
          <label class="form-label">${L('ملاحظات / شروط الدفع','Notes / conditions de paiement')}</label>
          <textarea class="form-textarea" id="invDesc" placeholder="${L('شروط الدفع، ملاحظات...','Conditions de paiement, notes...')}"></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" data-modal-close>${L('إلغاء','Annuler')}</button>
          <button class="btn btn-gold" onclick="addInvoiceItem()">💾 ${L('حفظ الفاتورة','Enregistrer')}</button>
        </div>
      </div>
    </div>

<!-- ════════════════════════════════════════════════════ -->
<!-- 📂 قسم الوثائق المولَّدة (مدمج في صفحة الفواتير)   -->
<!-- ════════════════════════════════════════════════════ -->
<div style="margin-top:2.5rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
    <div>
      <div class="section-title" style="font-size:1.05rem;font-weight:800">📂 ${L('الوثائق المولَّدة','Documents générés')}</div>
      <div style="font-size:.75rem;color:var(--dim)">${(()=>{
        const tid2=Auth.getUser().tenant_id;
        const cnt=(DB.get('dz_generated_docs')||[]).filter(d=>d.tenant_id===tid2).length;
        return cnt + ' ' + L('وثيقة محفوظة','document(s)');
      })()}</div>
    </div>
    <div style="display:flex;gap:.4rem;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="App.navigate('dz_documents')">📚 ${L('مركز الوثائق','Centre docs')}</button>
      <button class="btn btn-red btn-sm" id="dzsClearBtn" style="display:none" onclick="dzsClearAll()">🗑️ ${L('مسح الكل','Tout effacer')}</button>
    </div>
  </div>

  <!-- فلتر النوع -->
  <div id="dzsFilterBar" style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.9rem"></div>

  <!-- البطاقات -->
  <div id="dzsGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:.8rem"></div>
  <div id="dzsEmpty" style="display:none;text-align:center;padding:2rem 1rem;color:var(--dim)">
    <div style="font-size:2.5rem">📂</div>
    <div style="font-size:.85rem;margin-top:.5rem">${L('لا توجد وثائق محفوظة بعد','Aucun document enregistré')}</div>
    <div style="font-size:.72rem;margin-top:.3rem">${L('كل وثيقة تولّدها ستُحفظ هنا تلقائياً','Chaque document généré sera automatiquement enregistré ici')}</div>
  </div>
</div>

<script>
(function initDzsGrid(){
  // خريطة أنواع الوثائق
  const META = {};
  if(typeof DZ_DOC_CATALOG !== 'undefined'){
    DZ_DOC_CATALOG.forEach(sec => sec.docs.forEach(d=>{
      META[d.key]={icon:d.icon, ar:d.name.ar, fr:d.name.fr};
    }));
  }
  const lbl = (ar,fr) => {try{return I18N.currentLang==='fr'?fr:ar;}catch(_){return ar;}};
  const esc = s => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const tid = Auth.getUser().tenant_id;
  let allDocs = (DB.get('dz_generated_docs')||[]).filter(d=>d.tenant_id===tid);
  let activeFilter = sessionStorage.getItem('dzs_filter')||'all';

  // زر مسح الكل
  const clearBtn = document.getElementById('dzsClearBtn');
  if(clearBtn && allDocs.length > 0) clearBtn.style.display='';

  // فلتر
  const bar = document.getElementById('dzsFilterBar');
  if(bar){
    const usedKeys = [...new Set(allDocs.map(d=>d.doc_type).filter(Boolean))];
    const mkBtn = (key, label, count) => {
      const b = document.createElement('button');
      b.className = 'btn btn-sm ' + (activeFilter===key?'btn-gold':'btn-ghost');
      b.textContent = label + ' (' + count + ')';
      b.onclick = () => { sessionStorage.setItem('dzs_filter',key); initDzsGrid(); };
      return b;
    };
    bar.innerHTML='';
    bar.appendChild(mkBtn('all', lbl('الكل','Tout'), allDocs.length));
    usedKeys.forEach(k=>{
      const m=META[k];
      const name = m ? (lbl(m.ar,m.fr)) : k;
      const icon = m ? m.icon+' ' : '';
      bar.appendChild(mkBtn(k, icon+name, allDocs.filter(d=>d.doc_type===k).length));
    });
  }

  // الوثائق المفلترة
  const shown = activeFilter==='all' ? allDocs : allDocs.filter(d=>d.doc_type===activeFilter);
  const grid  = document.getElementById('dzsGrid');
  const empty = document.getElementById('dzsEmpty');
  if(!grid) return;

  if(shown.length===0){
    grid.style.display='none';
    if(empty) empty.style.display='';
    return;
  }
  grid.style.display='';
  if(empty) empty.style.display='none';

  grid.innerHTML = shown.map(doc => {
    const m = META[doc.doc_type];
    const icon  = m ? m.icon  : '📄';
    const tname = m ? lbl(m.ar,m.fr) : (doc.doc_type||'—');
    // أبرز الحقول
    const f = doc.fields||{};
    const snippet = Object.keys(f).slice(0,5).map(k=>{
      const v=String(f[k]||'').trim();
      return v && v.length<60 ? '<span style="color:var(--text)">'+esc(v.substring(0,35))+'</span>' : '';
    }).filter(Boolean).join(' <span style="color:var(--dim)">·</span> ');

    return \`<div style="background:var(--card-bg,#0e1720);border:1px solid var(--border);border-radius:12px;padding:1rem;display:flex;flex-direction:column;gap:.45rem;transition:border-color .2s" onmouseenter="this.style.borderColor='rgba(232,184,75,.5)'" onmouseleave="this.style.borderColor='var(--border)'">
      <div style="font-size:.66rem;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.5px">\${icon} \${esc(tname)}</div>
      <div style="font-size:.88rem;font-weight:800;line-height:1.3">\${esc(doc.doc_title||tname)}</div>
      <div style="font-size:.7rem;color:var(--dim)">📅 \${doc.date||''}</div>
      \${snippet ? \`<div style="font-size:.7rem;color:var(--muted);line-height:1.8;border-top:1px solid var(--border);padding-top:.35rem;margin-top:.1rem">\${snippet}</div>\` : ''}
      <div style="display:flex;gap:.35rem;margin-top:auto;padding-top:.45rem">
        <button class="btn btn-gold btn-sm" style="flex:1;font-size:.72rem" onclick="dzsReopen(\${doc.id})" title="\${lbl('تعديل وإعادة توليد','Modifier & regénérer')}">✏️ \${lbl('تعديل','Modifier')}</button>
        <button class="btn btn-ghost btn-sm" style="flex:1;font-size:.72rem" onclick="dzsReprint(\${doc.id})" title="\${lbl('إعادة طباعة','Réimprimer')}">🖨️ \${lbl('طباعة','Imprimer')}</button>
        <button class="btn btn-ghost btn-sm" style="font-size:.72rem" onclick="dzsPrintPDF(\${doc.id})" title="PDF">📥 PDF</button>
        <button class="btn btn-red btn-sm" style="font-size:.72rem" onclick="dzsDelete(\${doc.id})" title="\${lbl('حذف','Supprimer')}">🗑️</button>
      </div>
    </div>\`;
  }).join('');
})();
</script>

  `);
};

function addInvLine() {
  const L_fn = (ar, fr) => I18N.currentLang==='ar'?ar:fr;
  const row = document.createElement('div');
  row.className='inv-line-row';
  row.style='display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:.4rem;align-items:center;margin-bottom:.4rem';
  row.innerHTML=`
    <input class="form-input" placeholder="${L_fn('وصف الخدمة / المادة','Description service / article')}" oninput="calcInvTotal()">
    <input class="form-input" type="number" placeholder="${L_fn('الكمية','Qté')}" value="1" min="0" oninput="calcInvTotal()">
    <input class="form-input" type="number" placeholder="${L_fn('سعر الوحدة','Prix unit.')} (دج)" min="0" oninput="calcInvTotal()">
    <button class="btn btn-ghost btn-sm" onclick="this.closest('.inv-line-row').remove();calcInvTotal()">✕</button>
  `;
  document.getElementById('invLines')?.appendChild(row);
}

function calcInvTotal() {
  const tvaRate = Number(document.getElementById('invTVA')?.value)||19;
  document.getElementById('inv_tva_pct').textContent = tvaRate;
  const rows = document.querySelectorAll('#invLines .inv-line-row');
  let totalHT = 0;
  rows.forEach(r=>{
    const inputs = r.querySelectorAll('input');
    const qty = parseFloat(inputs[1]?.value)||0;
    const price = parseFloat(inputs[2]?.value)||0;
    totalHT += qty*price;
  });
  const tva = Math.round(totalHT * tvaRate / 100);
  const ttc = totalHT + tva;
  const suffix = I18N.currentLang==='ar'?' دج':' DA';
  document.getElementById('inv_total_ht').textContent = totalHT.toLocaleString('fr-DZ') + suffix;
  document.getElementById('inv_total_tva').textContent = tva.toLocaleString('fr-DZ') + suffix;
  document.getElementById('inv_total_ttc').textContent = ttc.toLocaleString('fr-DZ') + suffix;
}

function addInvoiceItem() {
  const num=document.getElementById('invNum')?.value?.trim();
  const client=document.getElementById('invClient')?.value?.trim();
  if(!num||!client){Toast.error(L('أدخل رقم الفاتورة والعميل','Renseignez le numéro et le client'));return;}

  // Collect line items
  const rows = document.querySelectorAll('#invLines .inv-line-row');
  const items=[];
  rows.forEach(r=>{
    const inputs=r.querySelectorAll('input');
    const desc=inputs[0]?.value?.trim()||'';
    const qty=parseFloat(inputs[1]?.value)||0;
    const price=parseFloat(inputs[2]?.value)||0;
    if(desc||qty||price) items.push({desc,qty,price,total:qty*price});
  });

  const tvaRate=Number(document.getElementById('invTVA')?.value)||19;
  const totalHT=items.reduce((s,i)=>s+i.total,0);
  const tva=Math.round(totalHT*tvaRate/100);
  const ttc=totalHT+tva;
  // Use manual amount if no items entered
  const amount = ttc>0 ? ttc : 0;

  const invs=DB.get('invoices');
  invs.push({
    id:DB.nextId('invoices'),
    tenant_id:Auth.getUser().tenant_id,
    number:num,
    client,
    project_id:Number(document.getElementById('invProj')?.value)||null,
    amount,
    amount_ht:totalHT,
    tva_rate:tvaRate,
    tva_amount:tva,
    date:document.getElementById('invDt')?.value||todayStr(),
    due_date:document.getElementById('invDue')?.value||'',
    status:document.getElementById('invSt')?.value||'pending',
    payment_method:document.getElementById('invPayMethod')?.value||'cash',
    description:document.getElementById('invDesc')?.value||'',
    items
  });
  DB.set('invoices',invs);
  sbSync('invoices', invs[invs.length-1], 'POST').catch(()=>{});
  Toast.success(L('✅ تم إضافة الفاتورة','✅ Facture créée avec succès'));
  App.navigate('invoices');
}

function deleteInvoiceItem(id) {
  if(!confirm(L('حذف هذه الفاتورة؟','Supprimer cette facture ?')))return;
  DB.set('invoices',DB.get('invoices').filter(i=>i.id!==id));
  sbSyncDelete('invoices', id).catch(()=>{});
  Toast.success(L('تم الحذف','Supprimé'));
  App.navigate('invoices');
}

function markInvoicePaid(id) {
  const invs=DB.get('invoices');
  const idx=invs.findIndex(i=>i.id===id);
  if(idx<0)return;
  invs[idx].status='paid';
  invs[idx].paid_date=todayStr();
  DB.set('invoices',invs);
  sbSync('invoices', invs[idx], 'PATCH').catch(()=>{});
  Toast.success(L('✅ تم تأشير الفاتورة كمدفوعة','✅ Facture marquée comme payée'));
  App.navigate('invoices');
}

function exportInvoicesCSV() {
  const tid=Auth.getUser().tenant_id;
  const invoices=DB.get('invoices').filter(i=>i.tenant_id===tid);
  const header=[L('الرقم','N° Facture'),L('العميل','Client'),L('المبلغ TTC','Montant TTC'),L('المبلغ HT','Montant HT'),L('TVA','TVA'),L('التاريخ','Date émission'),L('الاستحقاق','Échéance'),L('الحالة','Statut')];
  const rows=invoices.map(i=>[i.number,i.client,i.amount,i.amount_ht||'',i.tva_amount||'',i.date,i.due_date||'',i.status]);
  const csv=[header,...rows].map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`Factures_SmartStruct_${todayStr()}.csv`;a.click();
  Toast.success(L('✅ تم تصدير CSV','✅ CSV exporté'));
}
// ── PDF Export — يستخدم نفس قالب الطباعة الاحترافي ──
function exportInvoicePDF(id) {
  // الحل الأفضل: نفتح نافذة الطباعة الجميلة، ثم نطلق print()
  // المتصفح سيعطي المستخدم خيار "Save as PDF" تلقائياً
  // النتيجة: PDF بنفس جودة العرض، مع دعم كامل للعربية والشعار
  
  const inv = DB.get('invoices').find(i => i.id === id);
  if (!inv) { 
    Toast.error(L('الفاتورة غير موجودة','Facture introuvable')); 
    return; 
  }

  Toast.info(L('🖨️ افتح نافذة الطباعة ثم اختر "حفظ كـ PDF"','🖨️ Ouvrir l\'impression puis "Enregistrer en PDF"'));
  
  // نفس دالة الطباعة لكن مع تشغيل تلقائي لـ print
  printInvoiceWindow(id, /* autoPrint */ true);
}

function printInvoiceWindow(id, autoPrint = false) {
  const inv    = DB.get('invoices').find(i => i.id === id);
  const tenant = Auth.getTenant();
  const proj   = DB.get('projects').find(p => p.id === inv?.project_id);
  if (!inv) { Toast.error(L('الفاتورة غير موجودة','Facture introuvable')); return; }

  const tvaRate   = inv.tva_rate   || tenant?.tva_rate || 19;
  const amountHT  = inv.amount_ht  || Math.round(Number(inv.amount) / (1 + tvaRate / 100));
  const tvaAmount = inv.tva_amount || (Number(inv.amount) - amountHT);
  const items     = inv.items && inv.items.length > 0
    ? inv.items
    : [{ desc: inv.description || 'Prestations de service', qty: 1, price: amountHT, total: amountHT }];

  const isAr   = I18N.currentLang === 'ar';
  const isPaid = inv.status === 'paid';

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html>
<html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'fr'}">
<head>
<meta charset="UTF-8">
<title>${isAr ? 'فاتورة' : 'Facture'} ${escHtml(inv.number)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Cairo', Arial, sans-serif;
    color: #1a1a1a;
    background: #f4f4f6;
    padding: 30px;
  }

  /* ── Boutons hors impression ── */
  .no-print {
    display: flex; gap: 10px; margin-bottom: 24px; justify-content: flex-start;
  }
  .btn-print {
    padding: 10px 24px; background: #E8B84B; color: #1a1000;
    border: none; border-radius: 8px; cursor: pointer;
    font-family: inherit; font-size: 14px; font-weight: 700;
  }
  .btn-close {
    padding: 10px 20px; background: #2a2a2a; color: #ccc;
    border: none; border-radius: 8px; cursor: pointer;
    font-family: inherit; font-size: 14px;
  }

  /* ── Feuille A4 ── */
  .page {
    background: #fff;
    max-width: 780px;
    margin: 0 auto;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,.12);
  }

  /* ── Header bande noire ── */
  .inv-header {
    background: #141414;
    padding: 28px 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand-name {
    font-size: 22px; font-weight: 900; color: #E8B84B; letter-spacing: .5px;
  }
  .brand-sub {
    font-size: 10px; color: #888; margin-top: 4px;
  }
  .inv-label {
    font-size: 28px; font-weight: 900; color: #fff; letter-spacing: 2px;
    text-align: ${isAr ? 'left' : 'right'};
  }
  .inv-num {
    font-size: 13px; color: #E8B84B; font-weight: 700; margin-top: 4px;
    text-align: ${isAr ? 'left' : 'right'};
  }

  /* ── Bande dorée fine ── */
  .gold-bar { height: 3px; background: linear-gradient(90deg,#C49030,#E8B84B,#C49030); }

  /* ── Bloc infos ── */
  .info-section {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0;
    border-bottom: 1px solid #eee;
  }
  .info-cell {
    padding: 18px 24px;
    border-${isAr ? 'left' : 'right'}: 1px solid #eee;
  }
  .info-cell:last-child { border: none; }
  .info-cell-label {
    font-size: 9px; font-weight: 700; color: #aaa;
    text-transform: uppercase; letter-spacing: .8px; margin-bottom: 6px;
  }
  .info-cell-value { font-size: 13px; font-weight: 700; color: #111; }
  .info-cell-sub   { font-size: 11px; color: #888; margin-top: 3px; }

  /* ── Badge statut ── */
  .status-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 20px;
    font-size: 11px; font-weight: 700;
    background: ${isPaid ? '#d4f5e2' : '#fff8e1'};
    color: ${isPaid ? '#0a6e3f' : '#8a6000'};
    border: 1px solid ${isPaid ? '#a8e6c6' : '#f0d060'};
  }

  /* ── Tableau articles ── */
  .table-section { padding: 24px 36px 0; }
  .table-title {
    font-size: 11px; font-weight: 700; color: #888;
    text-transform: uppercase; letter-spacing: .8px; margin-bottom: 10px;
  }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  thead th {
    background: #141414; color: #E8B84B;
    padding: 10px 14px; text-align: ${isAr ? 'right' : 'left'};
    font-size: 10px; font-weight: 700; letter-spacing: .5px;
  }
  thead th:last-child { text-align: ${isAr ? 'left' : 'right'}; }
  tbody td { padding: 11px 14px; border-bottom: 1px solid #f0f0f0; color: #222; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  .td-right { text-align: ${isAr ? 'left' : 'right'}; font-variant-numeric: tabular-nums; }
  .td-center { text-align: center; }

  /* ── Totaux ── */
  .totals-section {
    display: flex;
    justify-content: flex-end;
    padding: 20px 36px;
    border-top: 1px solid #f0f0f0;
  }
  .totals-box { width: 280px; }
  .total-row {
    display: flex; justify-content: space-between;
    padding: 7px 0; font-size: 12.5px; color: #555;
    border-bottom: 1px solid #f4f4f4;
  }
  .total-row:last-child { border: none; }
  .total-final {
    display: flex; justify-content: space-between;
    margin-top: 8px; padding: 12px 16px;
    background: #141414; border-radius: 8px;
    font-size: 15px; font-weight: 900; color: #E8B84B;
  }

  /* ── Zone cachet + footer ── */
  .bottom-section {
    display: flex; justify-content: space-between; align-items: flex-end;
    padding: 20px 36px 28px;
    border-top: 1px solid #f0f0f0;
  }
  .stamp-box {
    width: 160px; height: 90px;
    border: 2px solid #E8B84B; border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; color: #C49030; font-weight: 700;
    opacity: .6; text-align: center; line-height: 1.5;
  }
  .legal-note { font-size: 10px; color: #bbb; text-align: ${isAr ? 'left' : 'right'}; line-height: 1.7; }

  /* ── Footer bande ── */
  .inv-footer {
    background: #141414;
    padding: 12px 36px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .inv-footer span { font-size: 10px; color: #666; }
  .inv-footer .gold-text { color: #E8B84B; font-weight: 700; }

  /* ── Notes ── */
  .notes-block {
    margin: 0 36px 0;
    padding: 12px 16px;
    background: #fafafa;
    border-left: 3px solid #E8B84B;
    border-radius: 0 4px 4px 0;
    font-size: 11.5px; color: #555; line-height: 1.7;
  }

  @media print {
    body { background: #fff; padding: 0; }
    .no-print { display: none !important; }
    .page { box-shadow: none; border-radius: 0; }
    .inv-header img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- Boutons -->
<div class="no-print">
  <button class="btn-print" onclick="window.print()">🖨️ ${isAr ? 'طباعة' : 'Imprimer'}</button>
  <button class="btn-close" onclick="window.close()">${isAr ? 'إغلاق' : 'Fermer'}</button>
</div>

<div class="page">

  <!-- Header -->
  <div class="inv-header">
    <div style="display:flex;align-items:center;gap:18px">
      ${(()=>{ const _logo=getTenantLogo(); return _logo?`<img src="${_logo}" style="height:60px;max-width:150px;object-fit:contain;border-radius:4px;background:#fff;padding:4px">`:'' })()}
      <div>
        <div class="brand-name">▦ SmartStruct</div>
        <div class="brand-sub">${escHtml(tenant?.name || 'إدارة مشاريع المقاولة')}</div>
        ${tenant?.nif    ? `<div class="brand-sub">NIF: ${escHtml(tenant.nif)}</div>`    : ''}
        ${tenant?.nis    ? `<div class="brand-sub">NIS: ${escHtml(tenant.nis)}</div>`    : ''}
        ${tenant?.rc_number ? `<div class="brand-sub">RC: ${escHtml(tenant.rc_number)}</div>` : ''}
        ${tenant?.address? `<div class="brand-sub">📍 ${escHtml(tenant.address)}</div>` : ''}
      </div>
    </div>
    <div>
      <div class="inv-label">${isAr ? 'فاتورة' : 'FACTURE'}</div>
      <div class="inv-num">${escHtml(inv.number)}</div>
    </div>
  </div>

  <!-- Bande dorée -->
  <div class="gold-bar"></div>

  <!-- Infos : dates | client | statut -->
  <div class="info-section">
    <div class="info-cell">
      <div class="info-cell-label">${isAr ? 'تاريخ الإصدار' : "Date d'émission"}</div>
      <div class="info-cell-value">${fmtDate(inv.date)}</div>
      ${inv.due_date ? `
        <div class="info-cell-label" style="margin-top:10px">${isAr ? 'تاريخ الاستحقاق' : "Date d'échéance"}</div>
        <div class="info-cell-value" style="color:#c0392b">${fmtDate(inv.due_date)}</div>` : ''}
    </div>
    <div class="info-cell">
      <div class="info-cell-label">${isAr ? 'العميل' : 'Client'}</div>
      <div class="info-cell-value">${escHtml(inv.client)}</div>
      ${proj ? `<div class="info-cell-sub">📁 ${escHtml(proj.name)}</div>` : ''}
      ${inv.payment_method ? `<div class="info-cell-sub">💳 ${escHtml(inv.payment_method)}</div>` : ''}
    </div>
    <div class="info-cell">
      <div class="info-cell-label">${isAr ? 'الحالة' : 'Statut'}</div>
      <div style="margin-top:4px">
        <span class="status-badge">${isPaid ? (isAr ? '✅ مدفوعة' : '✅ Payée') : (isAr ? '⏳ معلقة' : '⏳ En attente')}</span>
      </div>
    </div>
  </div>

  <!-- Tableau articles -->
  <div class="table-section">
    <div class="table-title">${isAr ? 'تفاصيل الفاتورة' : 'Détail des prestations'}</div>
    <table>
      <thead>
        <tr>
          <th>${isAr ? 'البيان' : 'Description'}</th>
          <th class="td-center" style="width:60px">${isAr ? 'الكمية' : 'Qté'}</th>
          <th class="td-right" style="width:130px">${isAr ? 'سعر الوحدة (دج)' : 'Prix unit. (DA)'}</th>
          <th class="td-right" style="width:140px">${isAr ? 'الإجمالي HT (دج)' : 'Total HT (DA)'}</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(it => `<tr>
          <td>${escHtml(it.desc || '—')}</td>
          <td class="td-center">${it.qty || 1}</td>
          <td class="td-right">${Number(it.price || 0).toLocaleString('fr-DZ')}</td>
          <td class="td-right" style="font-weight:700">${Number(it.total || 0).toLocaleString('fr-DZ')} ${isAr ? 'دج' : 'DA'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- Totaux -->
  <div class="totals-section">
    <div class="totals-box">
      <div class="total-row">
        <span>${isAr ? 'المجموع HT' : 'Sous-total HT'}</span>
        <span>${Number(amountHT).toLocaleString('fr-DZ')} ${isAr ? 'دج' : 'DA'}</span>
      </div>
      <div class="total-row">
        <span>TVA (${tvaRate}%)</span>
        <span>${Number(tvaAmount).toLocaleString('fr-DZ')} ${isAr ? 'دج' : 'DA'}</span>
      </div>
      <div class="total-final">
        <span>${isAr ? 'المجموع TTC' : 'Total TTC'}</span>
        <span>${Number(inv.amount).toLocaleString('fr-DZ')} ${isAr ? 'دج' : 'DA'}</span>
      </div>
    </div>
  </div>

  ${inv.description ? `
  <!-- Notes -->
  <div class="notes-block">
    <strong>${isAr ? 'ملاحظات:' : 'Notes / Conditions :'}</strong><br>
    ${escHtml(inv.description)}
  </div>
  <div style="height:16px"></div>` : ''}

  <!-- Cachet + mentions légales -->
  <div class="bottom-section">
    <div class="stamp-box">${isAr ? 'الختم\nوالتوقيع' : 'Cachet &\nSignature'}</div>
    <div class="legal-note">
      ${isAr ? 'مطابق للقانون الجزائري' : 'Conforme à la législation algérienne'}<br>
      TVA ${tvaRate}%&nbsp;&nbsp;|&nbsp;&nbsp;NIF / NIS / RC
      ${tenant?.nif ? `<br>NIF : ${escHtml(tenant.nif)}` : ''}
      ${tenant?.nis ? `<br>NIS : ${escHtml(tenant.nis)}` : ''}
    </div>
  </div>

  <!-- Footer -->
  <div class="inv-footer">
    <span>SmartStruct — ${isAr ? 'منصة إدارة مشاريع المقاولة الجزائرية' : 'Plateforme algérienne de gestion BTP'}</span>
    <span class="gold-text">${escHtml(inv.number)}&nbsp;&nbsp;|&nbsp;&nbsp;${new Date().toLocaleDateString(isAr ? 'ar-DZ' : 'fr-DZ')}</span>
  </div>

</div>
</body></html>`);
  win.document.close();
  
  // إذا طُلب الطباعة التلقائية (من زر PDF) — انتظر تحميل الصورة (الشعار) ثم اطبع
  if (autoPrint) {
    win.addEventListener('load', function() {
      // ننتظر قليلاً للتأكد أن الـ CSS و الخطوط حُمّلت
      setTimeout(() => {
        try { win.focus(); win.print(); } catch (e) { console.error(e); }
      }, 800);
    });
    // fallback إذا event load لم يُطلق (الصفحة جاهزة بالفعل)
    if (win.document.readyState === 'complete') {
      setTimeout(() => {
        try { win.focus(); win.print(); } catch (e) { console.error(e); }
      }, 800);
    }
  }
}
/* ── INVENTORY PAGE ── */
Pages.inventory = function() {
  const tid = Auth.getUser().tenant_id;
  const materials = DB.get('materials').filter(m=>m.tenant_id===tid);
  const movements = DB.get('stock_movements').filter(m=>m.tenant_id===tid);
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid&&!p.is_archived);
  const lowStock = materials.filter(m=>m.quantity<=m.min_quantity);
  return layoutHTML('inventory', L('المخزون','Stock'), `
    <div class="page-header">
      <div><div class="page-title">📦 ${L('إدارة المخزون','Gestion du stock')}</div><div class="page-sub">${materials.length} ${L('مادة مسجلة','matériau(x)')}</div></div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="printInventory()">🖨️ ${L('طباعة PDF','Imprimer PDF')}</button>
        <button class="btn btn-blue btn-sm" onclick="DZDocsUI.open('commande')" title="${L('وصل طلب جديد','Nouveau bon de commande')}">🛒 ${L('وصل طلب','Bon commande')}</button>
        <button class="btn btn-blue btn-sm" onclick="DZDocsUI.open('reception')" title="${L('وصل استلام','Bon de réception')}">📥 ${L('وصل استلام','Bon réception')}</button>
        <button class="btn btn-blue btn-sm" onclick="DZDocsUI.open('sortie')" title="${L('وصل خروج','Bon de sortie')}">📤 ${L('وصل خروج','Bon sortie')}</button>
        ${canDo('materials')?`<button class="btn btn-gold" data-modal-open="addMatModal">+ ${L('مادة جديدة','Nouveau matériau')}</button>`:''}
      </div>
    </div>
    ${lowStock.length?`<div class="stock-alert-bar">🔴 ${L('تنبيه:','Alerte :')} ${lowStock.length} ${L('مواد وصلت للحد الأدنى','matériaux en seuil bas')} — ${lowStock.map(m=>escHtml(m.name)).join('، ')}</div>`:''}
    <div class="table-wrap" style="margin-bottom:1.5rem">
      <table><thead><tr><th>${L('المادة','Matériau')}</th><th>${L('المشروع','Projet')}</th><th>${L('الكمية','Quantité')}</th><th>${L('الحد الأدنى','Seuil min')}</th><th>${L('السعر/وحدة','Prix/unité')}</th><th>${L('المورد','Fournisseur')}</th><th>${L('الحالة','Statut')}</th>${canDo('materials')?'<th>الإجراءات</th>':''}</tr></thead>
      <tbody>${materials.map(m=>{
        const proj=projects.find(p=>p.id===m.project_id);
        const isLow=m.quantity<=m.min_quantity;
        return `<tr>
          <td><div style="font-weight:700">${escHtml(m.name)}</div><div style="font-size:.7rem;color:var(--dim)">${escHtml(m.unit)}</div></td>
          <td style="font-size:.78rem;color:var(--dim)">${proj?escHtml(proj.name.substring(0,18)):'—'}</td>
          <td style="font-family:monospace;font-weight:700;color:${isLow?'var(--red)':'var(--text)'}">${m.quantity} ${escHtml(m.unit)}</td>
          <td style="font-family:monospace;font-size:.82rem;color:var(--dim)">${m.min_quantity}</td>
          <td style="font-family:monospace;font-size:.82rem">${fmt(m.unit_price)} دج</td>
          <td style="font-size:.78rem;color:var(--dim)">${escHtml(m.supplier||'—')}</td>
          <td><span class="material-badge ${isLow?'material-low':'material-ok'}">${isLow?L('⚠️ منخفض','⚠️ Bas'):L('✅ كافٍ','✅ OK')}</span></td>
          ${canDo('materials')?`<td><div style="display:flex;gap:.3rem"><button class="btn btn-green btn-sm" onclick="openStockMove(${m.id},'in')">+ دخول</button><button class="btn btn-red btn-sm" onclick="openStockMove(${m.id},'out')">- خروج</button></div></td>`:''}
        </tr>`;
      }).join('')}</tbody></table>
    </div>
    <div class="card">
      <div style="font-weight:800;margin-bottom:1rem">📋 سجل حركات المواد</div>
      <div class="stock-movement-log">
        ${movements.length?movements.slice(-15).reverse().map(mv=>{
          const mat=materials.find(m=>m.id===mv.material_id);
          return `<div class="stock-movement-item">
            <span class="${mv.type==='in'?'movement-in':'movement-out'}">${mv.type==='in'?'↑ دخول':'↓ خروج'}</span>
            <span style="font-weight:700;flex:1">${mat?escHtml(mat.name):'—'}</span>
            <span style="font-family:monospace">${mv.quantity}</span>
            <span style="color:var(--dim);font-size:.75rem">${fmtDate(mv.date)}</span>
            <span style="color:var(--dim);font-size:.75rem">${escHtml(mv.note||'')}</span>
          </div>`;
        }).join(''):
        `<div style="padding:1.5rem;text-align:center;color:var(--dim);font-size:.85rem">لا توجد حركات مسجلة</div>`}
      </div>
    </div>
    <div class="modal-overlay" id="addMatModal">
      <div class="modal">
        <div class="modal-title">📦 إضافة مادة</div>
        <div class="form-grid-2">
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">اسم المادة *</label><input class="form-input" id="matName" placeholder="حديد، أسمنت..."></div>
          <div class="form-group"><label class="form-label">الوحدة</label><input class="form-input" id="matUnit" placeholder="طن، كيس، م³"></div>
          <div class="form-group"><label class="form-label">الكمية الحالية</label><input class="form-input" id="matQty" type="number" placeholder="0"></div>
          <div class="form-group"><label class="form-label">الحد الأدنى للتنبيه</label><input class="form-input" id="matMin" type="number" placeholder="5"></div>
          <div class="form-group"><label class="form-label">السعر/وحدة (دج)</label><input class="form-input" id="matPrice" type="number" placeholder="0"></div>
          <div class="form-group"><label class="form-label">المشروع</label><select class="form-select" id="matProj"><option value="">—</option>${projects.map(p=>`<option value="${p.id}">${escHtml(p.name)}</option>`).join('')}</select></div>
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">المورد</label><input class="form-input" id="matSupplier" placeholder="اسم المورد..."></div>
        </div>
        <div class="modal-footer"><button class="btn btn-ghost" data-modal-close>إلغاء</button><button class="btn btn-gold" onclick="addMaterialItem()">💾 حفظ</button></div>
      </div>
    </div>
    <div class="modal-overlay" id="stockMoveModal">
      <div class="modal">
        <div class="modal-title" id="stockMoveTitle">📦 حركة مخزون</div>
        <input type="hidden" id="stockMatId"><input type="hidden" id="stockMoveTyp">
        <div class="form-group"><label class="form-label">الكمية *</label><input class="form-input" id="stockMoveQty" type="number" placeholder="0" min="1"></div>
        <div class="form-group"><label class="form-label">ملاحظة</label><input class="form-input" id="stockMoveNote" placeholder="توريد، استخدام..."></div>
        <div class="modal-footer"><button class="btn btn-ghost" data-modal-close>إلغاء</button><button class="btn btn-gold" onclick="confirmStockMoveV5()">✅ تأكيد</button></div>
      </div>
    </div>
  `);
};
function addMaterialItem(){
  const name=document.getElementById('matName')?.value?.trim();
  if(!name){Toast.error('أدخل اسم المادة');return;}
  const mats=DB.get('materials');
  const newMatItem = {id:DB.nextId('materials'),tenant_id:Auth.getUser().tenant_id,name,unit:document.getElementById('matUnit')?.value||'وحدة',quantity:Number(document.getElementById('matQty')?.value)||0,min_quantity:Number(document.getElementById('matMin')?.value)||5,unit_price:Number(document.getElementById('matPrice')?.value)||0,project_id:Number(document.getElementById('matProj')?.value)||null,supplier:document.getElementById('matSupplier')?.value||''};
  mats.push(newMatItem);
  DB.set('materials',mats);
  sbSync('materials', newMatItem, 'POST').catch(()=>{});
  Toast.success('✅ تم إضافة المادة');App.navigate('inventory');
}
function openStockMove(matId,type){
  document.getElementById('stockMatId').value=matId;
  document.getElementById('stockMoveTyp').value=type;
  document.getElementById('stockMoveTitle').textContent=type==='in'?'📦 إدخال مواد':'📦 إخراج مواد';
  document.getElementById('stockMoveQty').value='';
  document.getElementById('stockMoveNote').value='';
  document.getElementById('stockMoveModal').classList.add('show');
}
function confirmStockMoveV5(){
  const matId=Number(document.getElementById('stockMatId')?.value);
  const type=document.getElementById('stockMoveTyp')?.value;
  const qty=Number(document.getElementById('stockMoveQty')?.value);
  const note=document.getElementById('stockMoveNote')?.value||'';
  if(!qty){Toast.error('أدخل الكمية');return;}
  const mats=DB.get('materials');
  const idx=mats.findIndex(m=>m.id===matId);
  if(idx<0)return;
  if(type==='out'&&mats[idx].quantity<qty){Toast.error('الكمية المطلوبة أكبر من المخزون');return;}
  mats[idx].quantity=type==='in'?mats[idx].quantity+qty:mats[idx].quantity-qty;
  DB.set('materials',mats);
  sbSync('materials', mats[idx], 'PATCH').catch(()=>{});
  const mvs=DB.get('stock_movements');
  const newMv = {id:DB.nextId('stock_movements'),tenant_id:Auth.getUser().tenant_id,material_id:matId,type,quantity:qty,date:todayStr(),note};
  mvs.push(newMv);
  DB.set('stock_movements',mvs);
  sbSync('stock_movements', newMv, 'POST').catch(()=>{});
  if(mats[idx].quantity<=mats[idx].min_quantity){
    addNotification(Auth.getUser().tenant_id,'تنبيه المخزون',`مخزون "${mats[idx].name}" وصل للحد الأدنى (${mats[idx].quantity} ${mats[idx].unit})`,'warn');
    Toast.warn(`⚠️ تنبيه: مخزون "${mats[idx].name}" منخفض!`);
  } else {
    Toast.success(`✅ ${type==='in'?'إدخال':'إخراج'} ${qty} ${mats[idx].unit} من ${mats[idx].name}`);
  }
  document.getElementById('stockMoveModal').classList.remove('show');
  App.navigate('inventory');
}

/* ── DOCUMENTS PAGE ── */
Pages.documents = function() {

  const tid = Auth.getUser().tenant_id;
  const docs = DB.get('documents').filter(d=>d.tenant_id===tid);
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid&&!p.is_archived);
  const cats = [...new Set(docs.map(d=>d.category).filter(Boolean))];
  const docIconMap = {pdf:'📄',image:'🖼️',contract:'📋',drawing:'📐'};

  // Filter by project selector
  const selProj = sessionStorage.getItem('doc_filter_proj') || '';

  const filteredDocs = selProj ? docs.filter(d=>String(d.project_id)===selProj) : docs;
  const filteredCats = [...new Set(filteredDocs.map(d=>d.category).filter(Boolean))];

  return layoutHTML('documents', L('الوثائق','Documents'), `
    <div class="page-header">
      <div>
        <div class="page-title">📁 ${L('إدارة الوثائق','Gestion des documents')}</div>
        <div class="page-sub">${filteredDocs.length} ${L('وثيقة','document(s)')}</div>
      </div>
      <div class="page-actions">
        <select class="form-select" style="min-width:160px" onchange="sessionStorage.setItem('doc_filter_proj',this.value);App.navigate('documents')">
          <option value="">${L('كل المشاريع','Tous projets')}</option>
          ${projects.map(p=>`<option value="${p.id}" ${String(p.id)===selProj?'selected':''}>${escHtml(p.name)}</option>`).join('')}
        </select>
        ${canDo('documents')?`<button class="btn btn-gold" data-modal-open="uploadDocModal">+ ${L('رفع وثيقة','Ajouter document')}</button>`:''}
      </div>
    </div>

    ${filteredCats.length ? filteredCats.map(cat => {
      const catDocs = filteredDocs.filter(d=>d.category===cat);
      return `<div class="card" style="margin-bottom:1rem">
        <div style="font-weight:800;margin-bottom:.8rem">${escHtml(cat)} <span style="font-size:.75rem;color:var(--dim);font-weight:400">(${catDocs.length})</span></div>
        <div class="doc-grid">
          ${catDocs.map(doc=>{
            const proj = projects.find(p=>p.id===doc.project_id);
            const hasFile = !!(doc.fileData || doc.url);
            const sizeLabel = (typeof doc.size === 'number') ? formatFileSize(doc.size) : (doc.size || '');
            return `<div class="doc-card">
              <div style="font-size:2.5rem;margin-bottom:.5rem">${docIconMap[doc.type]||'📁'}</div>
              <div style="font-weight:700;font-size:.8rem;margin-bottom:.2rem;word-break:break-word">${escHtml(doc.name)}</div>
              ${proj?`<div style="font-size:.66rem;color:var(--blue);margin-bottom:.15rem">🏗️ ${escHtml(proj.name)}</div>`:''}
              <div style="font-size:.68rem;color:var(--dim)">${escHtml(sizeLabel)} • ${fmtDate(doc.date)}</div>
              <div style="display:flex;gap:.3rem;margin-top:.5rem;flex-wrap:wrap">
                ${hasFile?`<button class="btn btn-blue btn-sm" style="flex:1;justify-content:center" onclick="downloadDocFile(${doc.id})">⬇️ ${L('تنزيل','Télécharger')}</button>`:''}
                ${canDo('documents')?`<button class="btn btn-red btn-sm" style="flex:1;justify-content:center" onclick="deleteDocItem(${doc.id})">🗑️ ${L('حذف','Suppr.')}</button>`:''}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('') : `
      <div class="upload-zone" onclick="document.getElementById('uploadDocModal').classList.add('show')" style="cursor:pointer">
        <div style="font-size:2.5rem;margin-bottom:.5rem">📂</div>
        <div style="font-size:.9rem;color:var(--muted)">${L('ارفع أول وثيقة لمشاريعك','Ajoutez votre premier document')}</div>
        <div style="font-size:.78rem;color:var(--dim);margin-top:.3rem">${L('PDF، مخططات، صور، عقود','PDF, plans, photos, contrats')}</div>
      </div>`
    }

    <div class="modal-overlay" id="uploadDocModal">
      <div class="modal">
        <div class="modal-title">📁 ${L('رفع وثيقة','Ajouter un document')}</div>
        <div class="form-grid-2">
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">${L('اسم الوثيقة *','Nom du document *')}</label>
            <input class="form-input" id="docNameInp" placeholder="${L('عنوان الوثيقة...','Titre du document...')}">
          </div>
          <div class="form-group">
            <label class="form-label">${L('المشروع','Projet')}</label>
            <select class="form-select" id="docProjInp">
              <option value="">—</option>
              ${projects.map(p=>`<option value="${p.id}" ${String(p.id)===selProj?'selected':''}>${escHtml(p.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${L('الفئة','Catégorie')}</label>
            <select class="form-select" id="docCatInp">
              <option value="${L('مخططات','Plans')}">${L('مخططات','Plans')}</option>
              <option value="${L('عقود','Contrats')}">${L('عقود','Contrats')}</option>
              <option value="${L('صور','Photos')}">${L('صور','Photos')}</option>
              <option value="${L('فواتير','Factures')}">${L('فواتير','Factures')}</option>
              <option value="${L('أخرى','Autres')}">${L('أخرى','Autres')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${L('النوع','Type')}</label>
            <select class="form-select" id="docTypeInp">
              <option value="pdf">PDF</option>
              <option value="image">${L('صورة','Image')}</option>
              <option value="contract">${L('عقد','Contrat')}</option>
              <option value="drawing">${L('مخطط','Plan')}</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-top:.5rem">
          <label class="form-label">📎 ${L('الملف','Fichier')}</label>
          <div class="upload-zone" style="padding:1rem;cursor:pointer;position:relative" onclick="document.getElementById('docFileInp').click()">
            <input type="file" id="docFileInp" style="display:none" accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.dwg,.zip" onchange="handleDocFileSelect(this)">
            <div id="docFilePreview">
              <div style="font-size:1.5rem">📎</div>
              <div style="font-size:.85rem;color:var(--muted);margin-top:.3rem">${L('انقر لاختيار ملف','Cliquer pour choisir un fichier')}</div>
              <div style="font-size:.72rem;color:var(--dim);margin-top:.2rem">${L('PDF، صور، وورد، اكسل، مخططات','PDF, images, Word, Excel, plans')}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" data-modal-close>${L('إلغاء','Annuler')}</button>
          <button class="btn btn-gold" onclick="uploadDocItem()">💾 ${L('حفظ','Enregistrer')}</button>
        </div>
      </div>
    </div>
  `);
};

// Stores base64 file data temporarily before save
window._docFileTemp = null;

function handleDocFileSelect(input) {
  const file = input.files[0];
  if (!file) return;

  // نسمح بحجم أكبر لأننا سنرفع إلى Supabase Storage، لكن نخزن Base64 محلياً فقط للملفات الصغيرة
  const MAX_BASE64_CACHE = 10 * 1024 * 1024; // 10MB
  const MAX_FILE_UPLOAD  = 50 * 1024 * 1024; // 50MB حد منطقي لرفع المتصفح

  if (file.size > MAX_FILE_UPLOAD) {
    Toast.error(L('الملف كبير جداً (الحد 50 ميجا)','Fichier trop grand (max 50 MB)'));
    input.value = '';
    window._docFileTemp = null;
    return;
  }

  // نخزن File دائماً للرفع إلى Supabase Storage
  window._docFileTemp = { file, name: file.name, sizeBytes: file.size, mimeType: file.type || 'application/octet-stream', data: null };

  const prev = document.getElementById('docFilePreview');
  if (prev) {
    prev.innerHTML = `<div style="font-size:1.5rem">✅</div>
      <div style="font-size:.82rem;color:var(--green);margin-top:.3rem;word-break:break-all">${escHtml(file.name)}</div>
      <div style="font-size:.7rem;color:var(--dim)">${formatFileSize(file.size)}</div>`;
  }

  // Auto-fill name if empty
  const nameInp = document.getElementById('docNameInp');
  if (nameInp && !nameInp.value.trim()) {
    nameInp.value = file.name.replace(/\.[^.]+$/, '');
  }

  // Auto-detect type
  const typeInp = document.getElementById('docTypeInp');
  if (typeInp) {
    if ((file.type || '').includes('pdf')) typeInp.value = 'pdf';
    else if ((file.type || '').includes('image')) typeInp.value = 'image';
    else if (file.name.match(/\.(doc|docx)$/i)) typeInp.value = 'contract';
    else if (file.name.match(/\.(dwg|dxf)$/i)) typeInp.value = 'drawing';
  }

  // Base64 cache اختياري للملفات الصغيرة (يساعد في وضع Offline)
  if (file.size <= MAX_BASE64_CACHE) {
    const reader = new FileReader();
    reader.onload = function(e) {
      if (!window._docFileTemp) return;
      window._docFileTemp.data = e.target.result; // dataURL
    };
    reader.readAsDataURL(file);
  }
}


function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

function uploadDocItem(){
  const name = document.getElementById('docNameInp')?.value?.trim();
  if (!validateForm([
    { val: name, label: L('اسم الوثيقة','Nom du document'), type: 'required' },
  ])) return;

  const user = Auth.getUser();
  const tid = user.tenant_id;

  const fileTemp = window._docFileTemp;
  const docs = DB.get('documents');

  const newDoc = {
    id: DB.nextId('documents'),
    tenant_id: tid,
    name,
    project_id: Number(document.getElementById('docProjInp')?.value)||null,
    category: document.getElementById('docCatInp')?.value || L('أخرى','Autres'),
    type: document.getElementById('docTypeInp')?.value||'pdf',
    size: fileTemp?.sizeBytes ?? 0,              // نخزن Bytes ليتوافق مع Supabase schema
    date: todayStr(),
    uploader_id: user.id,

    // حقول محلية (لن تُرفع إلى Supabase لأن cleanForSupabase سيحذفها)
    fileName: fileTemp ? fileTemp.name : null,
    mimeType: fileTemp ? fileTemp.mimeType : null,
    fileData: fileTemp ? (fileTemp.data || null) : null,
    url: null,            // رابط التخزين في Supabase Storage (سيُملأ بعد الرفع)
    storage_path: null    // مسار الملف داخل الـ bucket (محلي فقط)
  };

  // احفظ محلياً أولاً (يضمن عدم فقدان البيانات)
  docs.push(newDoc);
  DB.set('documents', docs);

  // رفع إلى Supabase (Storage + Table) بشكل سلس
  (async () => {
    try {
      // 1) إذا يوجد ملف + Supabase مربوط → ارفع للـ Storage
      const cfg = getSupabaseConfig();
      const canUpload = cfg && cfg.url && cfg.key && fileTemp && fileTemp.file;

      if (canUpload) {
        const sbUrl = cfg.url.replace(/\/$/,'');
        const sbKey = cfg.key;

        // اسم bucket — غيّره إذا أردت
        const bucket = 'documents';

        // مسار فريد
        const safeName = sanitizeFileName(fileTemp.name || 'file') || 'file';
        const path = `tenant_${tid}/doc_${newDoc.id}_${Date.now()}_${safeName}`;

        // ارفع (PUT) مع upsert
        const upUrl = `${sbUrl}/storage/v1/object/${bucket}/${path}`;
        const upRes = await fetch(upUrl, {
          method: 'PUT',
          headers: {
            'apikey': sbKey,
            'Authorization': `Bearer ${sbKey}`,
            'Content-Type': fileTemp.mimeType || 'application/octet-stream',
            'x-upsert': 'true'
          },
          body: fileTemp.file
        });

        if (!upRes.ok) {
          const err = await upRes.text();
          console.warn('⚠️ فشل رفع الملف إلى Storage:', err);
          Toast.warn(L('⚠️ لم يتم رفع الملف للسحابة، تم حفظ البيانات محلياً','⚠️ Upload cloud échoué, sauvegarde locale فقط'));
        } else {
          // 2) أنشئ رابط عام (يتطلب bucket public)
          const publicUrl = `${sbUrl}/storage/v1/object/public/${bucket}/${path}`;

          // حدّث السجل محلياً
          const updated = { ...newDoc, url: publicUrl, storage_path: path };

          const curDocs = DB.get('documents');
          const idx = curDocs.findIndex(d => d.id === newDoc.id);
          if (idx >= 0) {
            curDocs[idx] = updated;
            DB.set('documents', curDocs);
          }

          // 3) ارفع metadata إلى Supabase Table (cleanForSupabase سيأخذ فقط: id,tenant_id,project_id,name,type,url,size,created_at)
          await sbSync('documents', updated, 'POST');
        }
      } else {
        // لا يوجد ملف/أو غير مربوط → ارفع metadata فقط
        await sbSync('documents', newDoc, 'POST');
      }
    } catch (e) {
      console.warn('⚠️ uploadDocItem sync error:', e.message);
    }
  })();

  window._docFileTemp = null;
  Toast.success(L('✅ تم حفظ الوثيقة','✅ Document sauvegardé'));
  App.navigate('documents');
}

function downloadDocFile(id) {

  const doc = DB.get('documents').find(d=>d.id===id);
  if (!doc) { Toast.error(L('الوثيقة غير موجودة','Document introuvable')); return; }

  // 1) لو لدينا Base64 محلياً (Offline cache)
  if (doc.fileData) {
    const a = document.createElement('a');
    a.href = doc.fileData;
    a.download = doc.fileName || (doc.name + '');
    a.click();
    return;
  }

  // 2) لو لدينا رابط Storage
  if (doc.url) {
    window.open(doc.url, '_blank');
    return;
  }

  Toast.error(L('لا يوجد ملف مرفق','Aucun fichier joint'));
}


function downloadDocFile(id) {

  const doc = DB.get('documents').find(d=>d.id===id);
  if (!doc || !doc.fileData) { Toast.error(L('لا يوجد ملف مرفق','Aucun fichier joint')); return; }
  const a = document.createElement('a');
  a.href = doc.fileData;
  a.download = doc.fileName || doc.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function deleteDocItem(id){

  if(!confirm(L('حذف هذه الوثيقة؟','Supprimer ce document ?')))return;
  DB.set('documents',DB.get('documents').filter(d=>d.id!==id));
  sbSyncDelete('documents', id).catch(()=>{});
  Toast.success(L('تم الحذف','Supprimé'));
  App.navigate('documents');
}

/* ── TEAM PAGE ── */
Pages.team = function() {
  const tid = Auth.getUser().tenant_id;
  const users = DB.get('users').filter(u=>u.tenant_id===tid&&u.is_active);
  const currentUser = Auth.getUser();
  const canManage = currentUser.role === 'admin' || currentUser.is_admin;

  // Permission matrix for display
  const permMatrix = [
    {key:'dashboard',    label:L('لوحة التحكم','Tableau de bord')},
    {key:'analytics',    label:L('التحليلات','Analytiques')},
    {key:'projects',     label:L('المشاريع','Projets') + ' (تعديل)'},
    {key:'workers',      label:L('العمال','Ouvriers') + ' (تعديل)'},
    {key:'attendance',   label:L('الحضور','Présence') + ' (تعديل)'},
    {key:'salary',       label:L('الرواتب','Salaires') + ' (تعديل)'},
    {key:'transactions', label:L('المعاملات','Transactions') + ' (تعديل)'},
    {key:'invoices',     label:L('الفواتير','Factures') + ' (تعديل)'},
    {key:'inventory',    label:L('المخزون','Stock') + ' (تعديل)'},
    {key:'equipment',    label:L('المعدات','Équipements') + ' (تعديل)'},
    {key:'documents',    label:L('الوثائق','Documents') + ' (تعديل)'},
    {key:'reports',      label:L('التقارير','Rapports')},
    {key:'kanban',       label:'Kanban'},
    {key:'gantt',        label:'Gantt'},
    {key:'simulator',    label:L('المحاكي','Simulateur')},
    {key:'bank_report',  label:L('تقرير بنكي','Rapport bancaire')},
    {key:'audit_log',    label:L('سجل النشاط','Journal activité')},
  ];

  const roleOrder = ['manager','accountant','hr','viewer'];

  function permIcon(perm) {
    if(perm === true) return `<span style="color:var(--green);font-size:.9rem" title="${L('وصول كامل','Accès complet')}">✅</span>`;
    if(perm === 'view') return `<span style="color:var(--blue);font-size:.9rem" title="${L('قراءة فقط','Lecture seule')}">👁️</span>`;
    return `<span style="color:var(--dim);font-size:.9rem" title="${L('محظور','Interdit')}">—</span>`;
  }

  return layoutHTML('team', L('الفريق','Équipe'), `
    <div class="page-header">
      <div>
        <div class="page-title">👥 ${L('فريق العمل','Équipe de travail')}</div>
        <div class="page-sub">${users.length} ${L('مستخدم','utilisateur(s)')}</div>
      </div>
      <div class="page-actions">
        ${canManage?`<button class="btn btn-gold" data-modal-open="inviteUserModal">✉️ ${L('إضافة مستخدم','Ajouter utilisateur')}</button>`:''}
      </div>
    </div>

    <!-- Users list -->
    <div style="display:grid;gap:.7rem;margin-bottom:2rem">
      ${users.map(u=>{
        const isMe = u.id === currentUser.id;
        const rolePerm = ROLE_PERMISSIONS[u.role] || ROLE_PERMISSIONS['viewer'];
        const accessCount = Object.values(rolePerm).filter(v=>v===true||v==='view').length;
        const writeCount = Object.entries(rolePerm).filter(([k,v])=>!k.startsWith('write_')&&v===true).length;
        return `<div class="user-card-v5" style="border-color:${isMe?'rgba(232,184,75,0.3)':''}">
          ${avatarHtml(u.full_name, u.avatar_color||'#4A90E2', 48)}
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
              <span style="font-weight:800;font-size:.9rem">${escHtml(u.full_name)}</span>
              ${isMe?`<span style="font-size:.65rem;padding:2px 7px;background:var(--gold-dim);color:var(--gold);border-radius:8px">${L('أنت','Vous')}</span>`:''}
              ${!u.is_active?`<span style="font-size:.65rem;padding:2px 7px;background:rgba(240,78,106,.1);color:var(--red);border-radius:8px">${L('موقوف','Désactivé')}</span>`:''}
            </div>
            <div style="font-size:.75rem;color:var(--dim);direction:ltr;text-align:right">${escHtml(u.email)}</div>
            <div style="font-size:.7rem;color:var(--muted);margin-top:2px">${L('وصول:','Accès:')} ${accessCount} ${L('صفحة','pages')} &nbsp;|&nbsp; ${L('تعديل:','Édit:')} ${writeCount} ${L('وحدة','modules')}</div>
          </div>
          ${roleBadge(u.role)}
          <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap">
            ${canManage&&!isMe?`
              <select class="role-select-mini" onchange="changeUserRoleV5(${u.id},this.value)" title="${L('تغيير الدور','Changer rôle')}">
                ${Object.entries(ROLE_NAMES).map(([k,v])=>`<option value="${k}"${u.role===k?' selected':''}>${v}</option>`).join('')}
              </select>
              <button class="btn btn-sm ${u.is_active?'btn-ghost':'btn-green'}" onclick="toggleUserActive(${u.id})" title="${u.is_active?L('إيقاف','Désactiver'):L('تفعيل','Activer')}">${u.is_active?'⏸️':'▶️'}</button>
              <button class="btn btn-sm btn-red" onclick="deleteUserAccount(${u.id})" title="${L('حذف المستخدم','Supprimer')}">🗑️</button>
            `:''}
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Permission Matrix -->
    <div style="margin-bottom:2rem">
      <div style="font-size:1rem;font-weight:900;margin-bottom:.8rem;display:flex;align-items:center;gap:.5rem">
        🔐 ${L('مصفوفة الصلاحيات','Matrice des permissions')}
        <span style="font-size:.72rem;color:var(--dim);font-weight:400">${L('✅ وصول كامل &nbsp; 👁️ قراءة فقط &nbsp; — محظور','✅ Accès complet &nbsp; 👁️ Lecture seule &nbsp; — Interdit')}</span>
      </div>
      <div class="table-wrap" style="overflow-x:auto">
        <table style="min-width:600px">
          <thead>
            <tr>
              <th style="min-width:160px">${L('الصفحة / الوحدة','Page / Module')}</th>
              ${roleOrder.map(r=>`<th style="text-align:center">${roleBadge(r)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${permMatrix.map(item=>{
              const allSame = roleOrder.every(r=>(ROLE_PERMISSIONS[r]||{})[item.key] === (ROLE_PERMISSIONS[roleOrder[0]]||{})[item.key]);
              return `<tr>
                <td style="font-size:.82rem;font-weight:600">${item.label}</td>
                ${roleOrder.map(r=>`<td style="text-align:center">${permIcon((ROLE_PERMISSIONS[r]||{})[item.key])}</td>`).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ADD USER MODAL -->
    <div class="modal-overlay" id="inviteUserModal">
      <div class="modal">
        <div class="modal-title">✉️ ${L('إضافة مستخدم جديد','Ajouter un utilisateur')}</div>
        <div class="form-group"><label class="form-label">${L('الاسم الكامل *','Nom complet *')}</label><input class="form-input" id="iName" placeholder="${L('الاسم الكامل...','Nom complet...')}"></div>
        <div class="form-group"><label class="form-label">${L('البريد الإلكتروني *','Email *')}</label><input class="form-input" id="iEmail" type="email" placeholder="user@company.dz" dir="ltr"></div>
        <div class="form-group"><label class="form-label">${L('كلمة المرور المؤقتة *','Mot de passe temporaire *')}</label><input class="form-input" id="iPass" type="password" placeholder="${L('كلمة مرور مؤقتة...','Mot de passe temporaire...')}"></div>
        <div class="form-group">
          <label class="form-label">${L('الدور','Rôle')}</label>
          <select class="form-select" id="iRole" onchange="showRolePreview(this.value)">
            ${Object.entries(ROLE_NAMES).filter(([k])=>k!=='admin').map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
        <div id="rolePreviewBox" style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:.8rem;font-size:.78rem;color:var(--muted);margin-bottom:.5rem">
          <strong style="color:var(--gold)">${L('مدير مشروع','Chef de projet')}</strong> — ${L('يمكنه إدارة المشاريع والعمال والمواد والوثائق. يرى المالية ولا يعدلها.','Peut gérer projets, ouvriers, matériaux et documents. Voit les finances sans les modifier.')}
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" data-modal-close>${L('إلغاء','Annuler')}</button>
          <button class="btn btn-gold" onclick="inviteUserV5()">✅ ${L('إضافة','Ajouter')}</button>
        </div>
      </div>
    </div>
  `);
};
function changeUserRoleV5(uid,role){
  const users = DB.get('users').map(u=>u.id===uid?{...u,role}:u);
  DB.set('users', users);
  sbSync('users', {id:uid, role}, 'PATCH').catch(()=>{});
  Toast.success(`✅ ${L('تم تغيير الدور إلى','Rôle changé en')} "${ROLE_NAMES[role]}"`);
  App.navigate('team');
}
async function toggleUserActive(uid){
  const userId = Number(uid);

  // ── حماية حساب المسؤول الأساسي ──
  if (userId === 1) {
    Toast.error(L('🛑 لا يمكن تعطيل حساب المسؤول الأساسي','🛑 Impossible de désactiver le compte admin principal'));
    return;
  }

  // ── منع المستخدم من تعطيل نفسه ──
  const currentUser = Auth.getUser();
  if (currentUser && currentUser.id === userId) {
    Toast.error(L('🛑 لا يمكنك تعطيل حسابك أنت!','🛑 Vous ne pouvez pas désactiver votre propre compte!'));
    return;
  }

  const before = DB.get('users') || [];
  const target = before.find(u => u.id === userId);
  if (!target) { Toast.error(L('المستخدم غير موجود','Utilisateur introuvable')); return; }

  const nextActive = !target.is_active;
  const nextStatus = nextActive ? 'active' : 'disabled';

  // ── جلب إعدادات Supabase ──
  const cfg = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : null;
  const sbUrl = cfg?.url || '';
  const sbKey = cfg?.key || '';

  if (!sbUrl || !sbKey) {
    Toast.error(L('⚠️ Supabase غير مربوط — لا يمكن تحديث الحالة','⚠️ Supabase non connecté'));
    return;
  }

  // ── تحديث Supabase أولاً ──
  try {
    const res = await fetch(`${sbUrl}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type':'application/json',
        'apikey': sbKey,
        'Authorization': `Bearer ${sbKey}`,
        'Prefer':'return=minimal'
      },
      body: JSON.stringify({ is_active: nextActive, account_status: nextStatus })
    });
    if (!res.ok) {
      const errText = await res.text().catch(()=> '');
      throw new Error(`HTTP ${res.status} — ${errText}`);
    }

    // ── نجح في Supabase → حدّث محلياً ──
    DB.set('users', before.map(u => u.id === userId
      ? {...u, is_active: nextActive, account_status: nextStatus}
      : u
    ));

    Toast.success(nextActive
      ? L('▶️ تم تفعيل المستخدم','▶️ Utilisateur activé')
      : L('⏸️ تم إيقاف المستخدم','⏸️ Utilisateur désactivé'));
  } catch(e) {
    console.error('❌ toggleUserActive failed:', e);
    Toast.error(L(`❌ تعذر تحديث الحالة: ${e.message}`,`❌ Impossible: ${e.message}`));
    return;
  }

  App.navigate('team');
}

async function deleteUserAccount(uid){
  const userId = Number(uid);
  const u = (DB.get('users')||[]).find(x=>x.id===userId);
  const name = u?.full_name || u?.name || u?.email || ('#'+userId);

  // ── حماية الحسابات الأساسية ──
  if (userId === 1) {
    Toast.error(L('🛑 لا يمكن حذف حساب المسؤول الأساسي','🛑 Impossible de supprimer le compte admin principal'));
    return;
  }
  if (userId === 2) {
    if (!confirm(L(
      '⚠️ هذا هو الحساب التجريبي الافتراضي. هل أنت متأكد من حذفه؟',
      '⚠️ Ceci est le compte de démonstration. Êtes-vous sûr ?'
    ))) return;
  } else {
    if (!confirm(L(
      `هل تريد حذف حساب المستخدم نهائياً؟\n${name}`,
      `Supprimer définitivement ce compte ?\n${name}`
    ))) return;
  }

  // ── منع المستخدم من حذف نفسه ──
  const currentUser = Auth.getUser();
  if (currentUser && currentUser.id === userId) {
    Toast.error(L('🛑 لا يمكنك حذف حسابك أنت!','🛑 Vous ne pouvez pas supprimer votre propre compte!'));
    return;
  }

  // ── جلب إعدادات Supabase ──
  const cfg = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : null;
  const sbUrl = cfg?.url || '';
  const sbKey = cfg?.key || '';

  if (!sbUrl || !sbKey) {
    Toast.error(L('⚠️ Supabase غير مربوط — لا يمكن حذف الحساب من قاعدة البيانات السحابية',
                   '⚠️ Supabase non connecté — impossible de supprimer'));
    return;
  }

  if (typeof Toast !== 'undefined') Toast.info(L('⏳ جاري حذف المستخدم...','⏳ Suppression en cours...'));

  // ── حذف من Supabase أولاً (مصدر الحقيقة) ──
  const sbH = {
    'Content-Type':'application/json',
    'apikey': sbKey,
    'Authorization': `Bearer ${sbKey}`,
    'Prefer': 'return=minimal'
  };

  try {
    const res = await fetch(
      `${sbUrl}/rest/v1/users?id=eq.${userId}`,
      { method: 'DELETE', headers: sbH }
    );
    if (!res.ok) {
      const errText = await res.text().catch(()=> '');
      throw new Error(`HTTP ${res.status} — ${errText}`);
    }
    console.log(`✅ حُذف المستخدم #${userId} من Supabase`);

    // ── نجح الحذف من Supabase → احذف محلياً ──
    const before = DB.get('users') || [];
    DB.set('users', before.filter(x => x.id !== userId));

    // ── إزالة عمليات معلّقة في Offline Queue تخص هذا المستخدم ──
    try {
      const Q_KEY = 'sbtp5_offline_queue';
      const q = JSON.parse(localStorage.getItem(Q_KEY) || '[]');
      const filtered = q.filter(op => {
        if (op?.table !== 'users') return true;
        const recId = op?.record?.id;
        return recId !== userId;
      });
      localStorage.setItem(Q_KEY, JSON.stringify(filtered));
      if (typeof DBHybrid !== 'undefined' && DBHybrid._updateAdminSyncUI) {
        DBHybrid._updateAdminSyncUI();
      }
    } catch{}

    Toast.success(L(`🗑️ تم حذف "${name}" نهائياً`,`🗑️ "${name}" supprimé`));
  } catch(e) {
    console.error('❌ deleteUserAccount failed:', e);
    Toast.error(L(`❌ تعذر حذف المستخدم من Supabase: ${e.message}`,
                   `❌ Impossible de supprimer: ${e.message}`));
    return;
  }

  App.navigate('team');
}

function showRolePreview(role) {
  const desc = {
    manager:  L('يدير المشاريع والعمال والمواد والوثائق. يرى التقارير والمالية ولا يعدلها.',
                'Gère projets, ouvriers, matériaux et documents. Voit les rapports sans modifier les finances.'),
    accountant:L('يدير المعاملات المالية والفواتير والرواتب والتقارير. يرى المشاريع والعمال فقط.',
                 'Gère transactions, factures, salaires et rapports. Voit projets et ouvriers uniquement.'),
    hr:       L('يدير العمال والحضور والرواتب فقط. لا يرى المالية أو المخزون.',
                'Gère ouvriers, présences et salaires uniquement. Pas d\'accès aux finances ou stock.'),
    viewer:   L('يرى جميع الصفحات المسموح بها ولا يمكنه تعديل أي شيء.',
                'Voit toutes les pages autorisées sans pouvoir modifier quoi que ce soit.'),
  };
  const names = {
    manager:L('مدير مشروع','Chef de projet'),
    accountant:L('محاسب','Comptable'),
    hr:L('موارد بشرية','RH'),
    viewer:L('قارئ فقط','Lecteur'),
  };
  const box = document.getElementById('rolePreviewBox');
  if(box) box.innerHTML = `<strong style="color:var(--gold)">${names[role]||role}</strong> — ${desc[role]||''}`;
}
function inviteUserV5(){
  const name=document.getElementById('iName')?.value?.trim();
  const email=document.getElementById('iEmail')?.value?.trim().toLowerCase();
  const pass=document.getElementById('iPass')?.value;
  const role=document.getElementById('iRole')?.value||'viewer';
  if(!name||!email||!pass){Toast.error(L('أكمل جميع الحقول','Remplissez tous les champs'));return;}
  if(pass.length<6){Toast.error(L('كلمة المرور يجب أن تكون 6 أحرف على الأقل','Mot de passe: 6 caractères minimum'));return;}
  const users=DB.get('users');
  if(users.find(u=>u.email===email)){Toast.error(L('هذا البريد مستخدم بالفعل','Cet email est déjà utilisé'));return;}
  const colors=['#4A90E2','#34C38F','#E8B84B','#9B6DFF','#FF7043','#F04E6A'];
  users.push({
    id:DB.nextId('users'),
    tenant_id:Auth.getUser().tenant_id,
    full_name:name,email,password:pass,role,
    is_admin:false,is_active:true,
    avatar_color:colors[users.length%colors.length]
  });
  DB.set('users',users);
  sbSync('users', users[users.length-1], 'POST').catch(()=>{});
  Toast.success(`✅ ${L('تم إضافة','Ajouté :')} ${name} ${L('بدور','avec rôle')} "${ROLE_NAMES[role]}"`);
  App.navigate('team');
}

/* ── PATCH LOGIN to add more demo users ── */
/* ── PATCH Toast to add warn type ── */
const _origToastShow = Toast.show;
Toast.show = function(msg, type='info') {
  const icons = { success:'✅', error:'❌', info:'ℹ️', warn:'⚠️' };
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icons[type]||'💬'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4500);
};
Toast.warn = m => Toast.show(m, 'warn');

/* ── PATCH nav to register new routes ── */
/* Routes are now handled directly in App.render() */





/* ══════════════════════════════════════════════════════
   PAGE: مقارنة المشاريع — Comparaison de projets
══════════════════════════════════════════════════════ */
Pages.compare = function() {
  const tid = Auth.getUser().tenant_id;
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid && !p.is_archived);
  const workers = DB.get('workers');
  const txs = DB.get('transactions').filter(t=>t.tenant_id===tid);

  const pOpts = projects.map(p=>`<option value="${p.id}">${escHtml(p.name)}</option>`).join('');
  let cmpHTML = '';

  // Get selected IDs from URL-like state (stored in sessionStorage)
  const sel1 = Number(sessionStorage.getItem('cmp_p1')||0);
  const sel2 = Number(sessionStorage.getItem('cmp_p2')||0);
  const p1 = projects.find(p=>p.id===sel1);
  const p2 = projects.find(p=>p.id===sel2);

  if (p1 && p2 && p1.id !== p2.id) {
    const wCount = id => workers.filter(w=>w.project_id===id).length;
    const revenue = id => txs.filter(t=>t.project_id===id&&t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
    const expense = id => txs.filter(t=>t.project_id===id&&t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
    const dur = p => {
      if (!p.start_date||!p.end_date) return '—';
      return Math.max(0,Math.round((new Date(p.end_date)-new Date(p.start_date))/(1000*86400)));
    };
    const eff = p => p.budget>0 ? Math.round((1 - p.total_spent/p.budget)*100) : 0;

    const row = (label, v1, v2, isNum=false, unit='') => {
      const better = isNum ? (Number(v1)>Number(v2)?1:Number(v2)>Number(v1)?2:0) : 0;
      return `<tr>
        <td style="color:var(--muted);font-size:.82rem;font-weight:700;padding:.7rem 1rem">${label}</td>
        <td style="padding:.7rem 1rem;font-weight:700;text-align:center;background:${better===1?'rgba(52,195,143,.06)':'transparent'}">${v1}${unit} ${better===1?'<span style="color:var(--green)">▲</span>':''}</td>
        <td style="padding:.7rem 1rem;font-weight:700;text-align:center;background:${better===2?'rgba(52,195,143,.06)':'transparent'}">${v2}${unit} ${better===2?'<span style="color:var(--green)">▲</span>':''}</td>
      </tr>`;
    };

    cmpHTML = `
    <div class="table-wrap" style="margin-top:1.5rem">
      <table>
        <thead><tr>
          <th style="text-align:right">${__('cmp.title')}</th>
          <th style="text-align:center"><span style="color:${p1.color}">●</span> ${escHtml(p1.name)}</th>
          <th style="text-align:center"><span style="color:${p2.color}">●</span> ${escHtml(p2.name)}</th>
        </tr></thead>
        <tbody>
          ${row(__('cmp.budget'), fmt(p1.budget), fmt(p2.budget), true, ' دج')}
          ${row(__('cmp.spent'), fmt(p1.total_spent), fmt(p2.total_spent), false)}
          ${row(__('lbl.revenue'), fmt(revenue(p1.id)), fmt(revenue(p2.id)), true, ' دج')}
          ${row(__('lbl.profit'), fmt(revenue(p1.id)-expense(p1.id)), fmt(revenue(p2.id)-expense(p2.id)), true, ' دج')}
          ${row(__('cmp.progress'), p1.progress+'%', p2.progress+'%', true)}
          ${row(__('cmp.workers'), wCount(p1.id), wCount(p2.id), true)}
          ${row(__('cmp.duration'), dur(p1), dur(p2), true, ' يوم')}
          ${row(__('cmp.efficiency'), eff(p1)+'%', eff(p2)+'%', true)}
          <tr>
            <td style="color:var(--muted);font-size:.82rem;font-weight:700;padding:.7rem 1rem">${__('lbl.type')}</td>
            <td style="padding:.7rem 1rem;font-size:.78rem;text-align:center">${(PROJECT_TYPES.find(t=>t.value===p1.project_type)||{label:'—'}).label}</td>
            <td style="padding:.7rem 1rem;font-size:.78rem;text-align:center">${(PROJECT_TYPES.find(t=>t.value===p2.project_type)||{label:'—'}).label}</td>
          </tr>
          <tr>
            <td style="color:var(--muted);font-size:.82rem;font-weight:700;padding:.7rem 1rem">الحالة</td>
            <td style="padding:.7rem 1rem;text-align:center">${statusBadge(p1.status)}</td>
            <td style="padding:.7rem 1rem;text-align:center">${statusBadge(p2.status)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="margin-top:1.2rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div class="card">
        <div style="font-weight:800;margin-bottom:.8rem;color:${p1.color}">● ${escHtml(p1.name)}</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:.5rem;font-size:.82rem"><span style="color:var(--dim)">نسبة الإنجاز</span><span style="font-weight:700">${p1.progress}%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="background:${p1.color}" data-width="${p1.progress}"></div></div>
        <div style="margin-top:.8rem;display:flex;justify-content:space-between;font-size:.78rem">
          <span style="color:var(--dim)">الميزانية المتبقية</span>
          <span style="font-weight:700;color:${p1.budget-p1.total_spent>=0?'var(--green)':'var(--red)'}">${fmt(p1.budget-p1.total_spent)} دج</span>
        </div>
      </div>
      <div class="card">
        <div style="font-weight:800;margin-bottom:.8rem;color:${p2.color}">● ${escHtml(p2.name)}</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:.5rem;font-size:.82rem"><span style="color:var(--dim)">نسبة الإنجاز</span><span style="font-weight:700">${p2.progress}%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="background:${p2.color}" data-width="${p2.progress}"></div></div>
        <div style="margin-top:.8rem;display:flex;justify-content:space-between;font-size:.78rem">
          <span style="color:var(--dim)">الميزانية المتبقية</span>
          <span style="font-weight:700;color:${p2.budget-p2.total_spent>=0?'var(--green)':'var(--red)'}">${fmt(p2.budget-p2.total_spent)} دج</span>
        </div>
      </div>
    </div>`;
  }

  return layoutHTML('compare', __('page.compare'), `
    <div class="page-header">
      <div><div class="page-title">${__('page.compare')}</div><div class="page-sub">${I18N.currentLang==='ar'?'اختر مشروعين لمقارنتهما جنباً إلى جنب':'Sélectionnez 2 projets à comparer'}</div></div>
    </div>
    <div class="card" style="margin-bottom:1rem">
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:1rem;align-items:end">
        <div class="form-group" style="margin:0">
          <label class="form-label">${__('cmp.select1')}</label>
          <select class="form-select" id="cmpP1" onchange="sessionStorage.setItem('cmp_p1',this.value)">
            <option value="">-- ${__('cmp.select1')} --</option>${pOpts}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">${__('cmp.select2')}</label>
          <select class="form-select" id="cmpP2" onchange="sessionStorage.setItem('cmp_p2',this.value)">
            <option value="">-- ${__('cmp.select2')} --</option>${pOpts}
          </select>
        </div>
        <button class="btn btn-gold" onclick="App.navigate('compare')">${__('cmp.compare')} 📊</button>
      </div>
    </div>
    ${!p1||!p2?`<div class="empty"><div class="empty-icon">📊</div><div class="empty-title">${I18N.currentLang==='ar'?'اختر مشروعين للمقارنة':'Choisissez 2 projets'}</div></div>`:cmpHTML}
  `);
};

/* ══════════════════════════════════════════════════════
   PAGE: تقويم المشاريع — Calendrier
══════════════════════════════════════════════════════ */
Pages.calendar = function() {
  const tid = Auth.getUser().tenant_id;
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid && !p.is_archived);
  const now = new Date();
  const yearStr = sessionStorage.getItem('cal_year') || now.getFullYear();
  const monthStr = sessionStorage.getItem('cal_month') ?? now.getMonth();
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month+1, 0);
  const daysInMonth = lastDay.getDate();
  // Day offset (0=Sun) - for Arabic calendar start from Saturday or Sunday
  let startOffset = firstDay.getDay(); // 0=Sun

  const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const DAYS_AR = ['أح','إث','ثل','أر','خم','جم','سب'];
  const DAYS_FR = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  const monthName = I18N.currentLang==='ar' ? MONTHS_AR[month] : MONTHS_FR[month];
  const dayNames = I18N.currentLang==='ar' ? DAYS_AR : DAYS_FR;

  // Build calendar cells
  let cells = '';
  // Day headers
  cells += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">`;
  dayNames.forEach(d => {
    cells += `<div style="text-align:center;font-size:.7rem;font-weight:800;color:var(--dim);padding:.4rem">${d}</div>`;
  });
  cells += '</div>';

  cells += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">`;
  // Empty cells before first day
  for (let i=0; i<startOffset; i++) cells += `<div style="min-height:80px"></div>`;

  for (let day=1; day<=daysInMonth; day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = dateStr === todayStr();
    // Find projects active on this day
    const activeProjs = projects.filter(p => {
      if (!p.start_date || !p.end_date) return false;
      return p.start_date <= dateStr && p.end_date >= dateStr;
    });
    const endProjs = projects.filter(p => p.end_date === dateStr);
    const startProjs = projects.filter(p => p.start_date === dateStr);

    cells += `<div style="min-height:80px;background:${isToday?'rgba(232,184,75,.08)':'rgba(255,255,255,.02)'};border:1px solid ${isToday?'rgba(232,184,75,.35)':'var(--border)'};border-radius:8px;padding:.35rem;position:relative">
      <div style="font-size:.72rem;font-weight:${isToday?900:600};color:${isToday?'var(--gold)':'var(--muted)'};margin-bottom:.3rem">${day}</div>
      ${startProjs.map(p=>`<div title="${escHtml(p.name)}" style="font-size:.6rem;background:${p.color}22;border-right:2px solid ${p.color};border-radius:3px;padding:1px 4px;margin-bottom:2px;color:var(--text);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">▶ ${escHtml(p.name)}</div>`).join('')}
      ${endProjs.map(p=>`<div title="${escHtml(p.name)} - انتهاء" style="font-size:.6rem;background:rgba(52,195,143,.1);border-right:2px solid var(--green);border-radius:3px;padding:1px 4px;margin-bottom:2px;color:#34C38F;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">🏁 ${escHtml(p.name)}</div>`).join('')}
      ${activeProjs.filter(p=>p.start_date!==dateStr&&p.end_date!==dateStr).slice(0,2).map(p=>`<div style="height:3px;border-radius:2px;background:${p.color};margin-bottom:2px;opacity:.5"></div>`).join('')}
    </div>`;
  }
  cells += '</div>';

  // Legend
  const legend = projects.slice(0,8).map(p=>`
    <div style="display:flex;align-items:center;gap:.4rem;font-size:.72rem">
      <div style="width:10px;height:10px;border-radius:2px;background:${p.color};flex-shrink:0"></div>
      <span style="color:var(--muted);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escHtml(p.name)}</span>
    </div>`).join('');

  const prevMonth = month===0 ? {y:year-1,m:11} : {y:year,m:month-1};
  const nextMonth = month===11 ? {y:year+1,m:0} : {y:year,m:month+1};

  return layoutHTML('calendar', __('page.calendar'), `
    <div class="page-header">
      <div><div class="page-title">${__('page.calendar')}</div><div class="page-sub">${monthName} ${year}</div></div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="sessionStorage.setItem('cal_year','${prevMonth.y}');sessionStorage.setItem('cal_month','${prevMonth.m}');App.navigate('calendar')">← ${I18N.currentLang==='ar'?'السابق':'Précédent'}</button>
        <button class="btn btn-ghost btn-sm" onclick="sessionStorage.setItem('cal_year','${now.getFullYear()}');sessionStorage.setItem('cal_month','${now.getMonth()}');App.navigate('calendar')">${I18N.currentLang==='ar'?'اليوم':'Aujourd\'hui'}</button>
        <button class="btn btn-ghost btn-sm" onclick="sessionStorage.setItem('cal_year','${nextMonth.y}');sessionStorage.setItem('cal_month','${nextMonth.m}');App.navigate('calendar')">${I18N.currentLang==='ar'?'التالي':'Suivant'} →</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 200px;gap:1rem;align-items:start">
      <div class="card" style="padding:1rem">${cells}</div>
      <div>
        <div class="card" style="margin-bottom:1rem">
          <div style="font-weight:800;font-size:.85rem;margin-bottom:.8rem">${I18N.currentLang==='ar'?'مفتاح المشاريع':'Légende'}</div>
          <div style="display:flex;flex-direction:column;gap:.4rem">${legend}</div>
        </div>
        <div class="card">
          <div style="font-weight:800;font-size:.85rem;margin-bottom:.8rem">${I18N.currentLang==='ar'?'هذا الشهر':'Ce mois'}</div>
          ${projects.filter(p=>p.start_date?.startsWith(`${year}-${String(month+1).padStart(2,'0')}`) || p.end_date?.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).slice(0,5).map(p=>`
            <div style="padding:.5rem 0;border-bottom:1px solid var(--border);font-size:.78rem">
              <div style="display:flex;align-items:center;gap:.4rem;font-weight:700"><div style="width:8px;height:8px;border-radius:50%;background:${p.color}"></div>${escHtml(p.name)}</div>
              ${p.start_date?.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)?`<div style="color:var(--green);font-size:.7rem">▶ ${fmtDate(p.start_date)}</div>`:''}
              ${p.end_date?.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)?`<div style="color:var(--gold);font-size:.7rem">🏁 ${fmtDate(p.end_date)}</div>`:''}
            </div>`).join('')||`<div style="color:var(--dim);font-size:.8rem">${I18N.currentLang==='ar'?'لا توجد مشاريع':'Aucun projet'}</div>`}
        </div>
      </div>
    </div>
  `);
};

/* ══════════════════════════════════════════════════════
   PAGE: خريطة الولايات — Carte des wilayas
══════════════════════════════════════════════════════ */
Pages.map = function() {
  const tid = Auth.getUser().tenant_id;
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid && !p.is_archived);

  // Group by wilaya
  const byWilaya = {};
  projects.forEach(p => {
    if (!p.wilaya) return;
    if (!byWilaya[p.wilaya]) byWilaya[p.wilaya] = [];
    byWilaya[p.wilaya].push(p);
  });

  const wilayas = Object.keys(byWilaya).sort();
  const maxCount = Math.max(...Object.values(byWilaya).map(a=>a.length), 1);

  // Wilaya positions (approximate SVG coordinates for Algeria map)
  const WILAYA_POS = {
    'الجزائر':{x:265,y:118},'وهران':{x:155,y:120},'قسنطينة':{x:358,y:105},
    'عنابة':{x:390,y:85},'بجاية':{x:310,y:110},'سطيف':{x:340,y:115},
    'تلمسان':{x:120,y:115},'البليدة':{x:255,y:128},'المدية':{x:260,y:135},
    'تيزي وزو':{x:290,y:108},'بومرداس':{x:275,y:115},'بوعريريج':{x:325,y:120},
    'تيبازة':{x:242,y:118},'تيارت':{x:210,y:145},'مستغانم':{x:180,y:115},
    'الشلف':{x:210,y:120},'معسكر':{x:178,y:135},'سعيدة':{x:170,y:148},
    'سيدي بلعباس':{x:148,y:128},'عين تموشنت':{x:138,y:118},
    'غليزان':{x:195,y:128},'تيسمسيلت':{x:225,y:135},'عين الدفلى':{x:230,y:128},
    'باتنة':{x:355,y:128},'بسكرة':{x:340,y:155},'تبسة':{x:395,y:125},
    'خنشلة':{x:375,y:138},'سوق أهراس':{x:395,y:98},'قالمة':{x:385,y:98},
    'ميلة':{x:365,y:108},'جيجل':{x:348,y:98},'سكيكدة':{x:380,y:92},
    'برج بوعريريج':{x:320,y:118},'المسيلة':{x:305,y:145},'الأغواط':{x:252,y:175},
    'الجلفة':{x:250,y:158},'النعامة':{x:140,y:178},'البيض':{x:195,y:172},
    'بشار':{x:145,y:228},'أدرار':{x:175,y:295},'تندوف':{x:70,y:268},
    'تمنراست':{x:268,y:330},'إليزي':{x:370,y:295},'ورقلة':{x:315,y:215},
    'الوادي':{x:355,y:195},'غرداية':{x:275,y:200},'الطارف':{x:405,y:88},
    'عنابة':{x:392,y:84},'أم البواقي':{x:375,y:112},'البويرة':{x:285,y:120},
    'بومرداس':{x:272,y:112}
  };

  const svgDots = projects.map(p => {
    const pos = WILAYA_POS[p.wilaya];
    if (!pos) return '';
    const grp = byWilaya[p.wilaya];
    const size = 6 + Math.min(grp.length * 3, 16);
    return `<circle cx="${pos.x}" cy="${pos.y}" r="${size/2}" fill="${p.color}" opacity="0.85" stroke="rgba(255,255,255,.3)" stroke-width="1.5">
      <title>${escHtml(p.wilaya)}: ${grp.map(pr=>pr.name).join(', ')}</title>
    </circle>`;
  }).join('');

  const wilayaLabels = Object.entries(byWilaya).map(([w, prjs]) => {
    const pos = WILAYA_POS[w];
    if (!pos) return '';
    return `<text x="${pos.x}" y="${pos.y+14}" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.5)">${w}</text>`;
  }).join('');

  const statsCards = wilayas.map(w => {
    const prjs = byWilaya[w];
    const budget = prjs.reduce((s,p)=>s+p.budget,0);
    const pct = Math.round(prjs.length/maxCount*100);
    return `<div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;padding:.8rem 1rem;display:flex;align-items:center;gap:.8rem">
      <div style="width:36px;height:36px;border-radius:8px;background:rgba(232,184,75,.1);border:1px solid rgba(232,184,75,.2);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:900;color:var(--gold)">${prjs.length}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📍 ${w}</div>
        <div style="font-size:.7rem;color:var(--dim)">${fmt(budget)} دج</div>
        <div class="progress-bar" style="margin-top:3px;height:4px"><div class="progress-fill" style="background:var(--gold)" data-width="${pct}"></div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px">
        ${prjs.slice(0,3).map(p=>`<div style="width:8px;height:8px;border-radius:50%;background:${p.color}"></div>`).join('')}
      </div>
    </div>`;
  }).join('');

  return layoutHTML('map', __('page.map'), `
    <div class="page-header">
      <div><div class="page-title">${__('page.map')}</div>
      <div class="page-sub">${wilayas.length} ${I18N.currentLang==='ar'?'ولاية':'wilaya(s)'} • ${projects.length} ${I18N.currentLang==='ar'?'مشروع':'projet(s)'}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 280px;gap:1rem;align-items:start">
      <div class="card" style="padding:0;overflow:hidden">
        <div style="background:rgba(255,255,255,.02);padding:.8rem 1rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:700">${I18N.currentLang==='ar'?'خريطة توزيع المشاريع':'Distribution des projets'}</div>
        <svg viewBox="0 0 470 400" style="width:100%;background:rgba(6,10,16,.5);display:block" xmlns="http://www.w3.org/2000/svg">
          <!-- Algeria simplified outline -->
          <path d="M70,80 L130,70 L200,60 L280,55 L360,60 L420,75 L430,100 L420,130 L410,160 L405,200 L390,240 L370,280 L340,320 L310,355 L280,375 L250,380 L220,370 L185,350 L155,310 L130,270 L100,230 L75,190 L60,155 L55,120 Z" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.1)" stroke-width="1.5"/>
          <!-- Mediterranean coast hint -->
          <path d="M70,80 L130,70 L200,60 L280,55 L360,60 L420,75" fill="none" stroke="rgba(74,144,226,.3)" stroke-width="2"/>
          <!-- Project dots -->
          ${svgDots}
          ${wilayaLabels}
          <!-- Legend -->
          <rect x="10" y="355" width="120" height="38" rx="6" fill="rgba(0,0,0,.5)" stroke="rgba(255,255,255,.1)" stroke-width="1"/>
          <circle cx="22" cy="365" r="4" fill="var(--green)"/><text x="30" y="369" font-size="7" fill="rgba(255,255,255,.6)">${I18N.currentLang==='ar'?'مشروع نشط':'Projet actif'}</text>
          <circle cx="22" cy="381" r="4" fill="var(--gold)"/><text x="30" y="385" font-size="7" fill="rgba(255,255,255,.6)">${I18N.currentLang==='ar'?'الحجم = عدد المشاريع':'Taille = nbre projets'}</text>
        </svg>
      </div>
      <div>
        <div style="font-weight:800;font-size:.85rem;margin-bottom:.8rem;color:var(--muted)">${I18N.currentLang==='ar'?'توزيع حسب الولاية':'Par wilaya'}</div>
        <div style="display:flex;flex-direction:column;gap:.5rem;max-height:500px;overflow-y:auto">
          ${statsCards||`<div class="empty"><div class="empty-icon">🗺️</div><div class="empty-title">${I18N.currentLang==='ar'?'لا توجد مشاريع بولايات':'Aucun projet géolocalisé'}</div></div>`}
        </div>
      </div>
    </div>
  `);
};

/* ══════════════════════════════════════════════════════
   PAGE: تصدير PDF التقارير — Rapport PDF
══════════════════════════════════════════════════════ */
function exportReportPDF() {
  const tid = Auth.getUser().tenant_id;
  const tenant = Auth.getTenant();
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid && !p.is_archived);
  const txs = DB.get('transactions').filter(t=>t.tenant_id===tid);
  const workers = DB.get('workers').filter(w=>w.tenant_id===tid);
  const revenue = txs.filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  const profit = revenue - expense;
  const lang = I18N.currentLang;

  const L = (ar, fr) => lang==='ar' ? ar : fr;
  const dir = lang==='ar' ? 'rtl' : 'ltr';

  const projRows = projects.map(p => {
    const pRev = txs.filter(t=>t.project_id===p.id&&t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
    const pExp = txs.filter(t=>t.project_id===p.id&&t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
    const statusColors = {active:'#34C38F',completed:'#4A90E2',delayed:'#F04E6A',paused:'#8892A4'};
    const statusLabels = {active:L('نشط','Actif'),completed:L('مكتمل','Terminé'),delayed:L('متأخر','En retard'),paused:L('متوقف','Pausé')};
    return `<tr>
      <td>${escHtml(p.name)}</td>
      <td>${escHtml(p.wilaya||'—')}</td>
      <td style="text-align:center"><span style="background:${statusColors[p.status]||'#888'}22;color:${statusColors[p.status]||'#888'};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold">${statusLabels[p.status]||p.status}</span></td>
      <td style="text-align:center">${p.progress}%</td>
      <td style="text-align:right">${fmt(p.budget)} ${L('دج','DZD')}</td>
      <td style="text-align:right;color:${pRev-pExp>=0?'#34C38F':'#F04E6A'}">${fmt(pRev-pExp)} ${L('دج','DZD')}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="${lang}" dir="${dir}">
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;color:#222;background:#fff;padding:30px;font-size:12px;direction:${dir}}
  h1{color:#C49030;font-size:22px;margin-bottom:4px}
  h2{color:#444;font-size:14px;margin:20px 0 8px;border-bottom:2px solid #E8B84B;padding-bottom:4px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #E8B84B}
  .logo{font-size:26px;font-weight:900;color:#C49030}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
  .stat{background:#f8f8f8;border:1px solid #eee;border-radius:8px;padding:12px;text-align:center}
  .stat-val{font-size:18px;font-weight:900;color:#C49030}
  .stat-lbl{font-size:10px;color:#888;margin-top:2px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#C49030;color:#fff;padding:7px 10px;text-align:${lang==='ar'?'right':'left'};font-weight:bold}
  td{padding:6px 10px;border-bottom:1px solid #eee}
  tr:nth-child(even) td{background:#fafafa}
  .footer{margin-top:30px;padding-top:10px;border-top:1px solid #eee;font-size:10px;color:#aaa;text-align:center}
  .profit-pos{color:#34C38F;font-weight:bold}
  .profit-neg{color:#F04E6A;font-weight:bold}
  @media print{body{padding:15px}.no-print{display:none}}
</style></head><body>
<div class="header">
  <div>
    <div class="logo">▦ SmartStruct</div>
    <div style="color:#888;font-size:11px">${L('منصة إدارة مشاريع المقاولة الجزائرية','Plateforme de gestion de projets de construction')}</div>
    <div style="font-size:11px;color:#555;margin-top:4px">🏢 ${escHtml(tenant?.name||'')}</div>
  </div>
  <div style="text-align:${lang==='ar'?'left':'right'}">
    <div style="font-size:14px;font-weight:bold">${L('تقرير شامل','Rapport général')}</div>
    <div style="color:#888;font-size:10px">${new Date().toLocaleDateString(lang==='ar'?'ar-DZ':'fr-FR',{year:'numeric',month:'long',day:'numeric'})}</div>
  </div>
</div>

<div class="stats">
  <div class="stat"><div class="stat-val">${projects.length}</div><div class="stat-lbl">${L('إجمالي المشاريع','Total projets')}</div></div>
  <div class="stat"><div class="stat-val">${projects.filter(p=>p.status==='active').length}</div><div class="stat-lbl">${L('مشاريع نشطة','Projets actifs')}</div></div>
  <div class="stat"><div class="stat-val">${workers.length}</div><div class="stat-lbl">${L('العمال','Ouvriers')}</div></div>
  <div class="stat"><div class="stat-val ${profit>=0?'profit-pos':'profit-neg'}">${fmt(profit)} ${L('دج','DZD')}</div><div class="stat-lbl">${L('الربح الصافي','Bénéfice net')}</div></div>
</div>

<h2>${L('الملخص المالي','Résumé financier')}</h2>
<table>
  <tr><th>${L('البيان','Libellé')}</th><th style="text-align:right">${L('المبلغ','Montant')}</th></tr>
  <tr><td>${L('إجمالي الإيرادات','Total revenus')}</td><td style="text-align:right;color:#34C38F;font-weight:bold">${fmt(revenue)} ${L('دج','DZD')}</td></tr>
  <tr><td>${L('إجمالي المصاريف','Total dépenses')}</td><td style="text-align:right;color:#F04E6A;font-weight:bold">${fmt(expense)} ${L('دج','DZD')}</td></tr>
  <tr><td><b>${L('الربح الصافي','Bénéfice net')}</b></td><td style="text-align:right"><b class="${profit>=0?'profit-pos':'profit-neg'}">${fmt(profit)} ${L('دج','DZD')}</b></td></tr>
</table>

<h2>${L('تفاصيل المشاريع','Détail des projets')}</h2>
<table>
  <thead><tr>
    <th>${L('اسم المشروع','Nom du projet')}</th>
    <th>${L('الولاية','Wilaya')}</th>
    <th style="text-align:center">${L('الحالة','Statut')}</th>
    <th style="text-align:center">${L('التقدم','Avancement')}</th>
    <th style="text-align:right">${L('الميزانية','Budget')}</th>
    <th style="text-align:right">${L('الربح','Bénéfice')}</th>
  </tr></thead>
  <tbody>${projRows}</tbody>
</table>

<div class="footer">SmartStruct v6.0 Pro — ${new Date().toLocaleString(lang==='ar'?'ar-DZ':'fr-FR')} — ${L('تقرير تم إنشاؤه تلقائياً','Rapport généré automatiquement')}</div>
<div class="no-print" style="text-align:center;margin-top:20px">
  <button onclick="window.print()" style="background:#C49030;color:#fff;border:none;padding:10px 30px;border-radius:8px;cursor:pointer;font-size:14px">🖨️ ${L('طباعة / حفظ PDF','Imprimer / Enregistrer PDF')}</button>
</div>
</body></html>`;

  const win = window.open('','_blank');
  win.document.write(html);
  win.document.close();
  Toast.success(L('✅ تم فتح تقرير PDF','✅ Rapport PDF ouvert'));
}

/* ══════════════════════════════════════════════════════
   PAGE: النسخ الاحتياطي — Sauvegarde
══════════════════════════════════════════════════════ */
function exportAllData() {
  const keys = ['plans','tenants','users','projects','workers','equipment','transactions','attendance','materials','notes','salary_records','stock_movements','invoices','kanban_tasks','notifications','documents'];
  const data = {};
  keys.forEach(k => { data[k] = DB.get(k); });
  data._exported_at = new Date().toISOString();
  data._version = '6.0';
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SmartStruct_backup_${todayStr()}.json`;
  a.click();
  Toast.success(I18N.currentLang==='ar'?'✅ تم تصدير جميع البيانات':'✅ Données exportées avec succès');
}

function importAllData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const keys = ['plans','tenants','users','projects','workers','equipment','transactions','attendance','materials','notes','salary_records','stock_movements','invoices','kanban_tasks','notifications','documents'];
        keys.forEach(k => { if (data[k]) DB.set(k, data[k]); });
        Toast.success(I18N.currentLang==='ar'?'✅ تم استيراد البيانات بنجاح':'✅ Données importées avec succès');
        setTimeout(() => App.navigate('dashboard'), 1000);
      } catch(err) {
        Toast.error(I18N.currentLang==='ar'?'❌ ملف غير صالح':'❌ Fichier invalide');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

DB.init();

  // ── MIGRATION: move legacy admin_notifications → notifications (once) ──
  try {
    const legacy = (DB.get('admin_notifications')||[]);
    const curr   = (DB.get('notifications')||[]);
    if (legacy.length) {
      const byId = new Set(curr.map(n=>n.id));
      const merged = [...legacy.filter(n=>!byId.has(n.id)), ...curr];
      DB.set('notifications', merged.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)));
      DB.set('admin_notifications', []);
    }
  } catch(e) {}


/* ══════════════════════════════════════════════════════
   sbSync — رفع فوري لـ Supabase عند كل تعديل
══════════════════════════════════════════════════════ */

// ─── تأكد دائماً من وجود بيانات المستخدمين الأساسية ───
(function ensureUsers() {
  const users = DB.get('users');
  const hasAdmin = users.find(u => u.email === 'admin@smartbtp.dz');
  const hasDemo  = users.find(u => u.email === 'demo@algerie-construction.dz');
  if (!hasAdmin || !hasDemo) {
    const current = users.filter(u =>
      u.email !== 'admin@smartbtp.dz' &&
      u.email !== 'demo@algerie-construction.dz'
    );
    DB.set('users', [
      { id:1, tenant_id:null, full_name:'مسؤول النظام', email:'admin@smartbtp.dz',
        password:'Admin@SmartStruct2025', role:'admin', is_admin:true, is_active:true },
      { id:2, tenant_id:1, full_name:'محمد الأمين بوعلام', email:'demo@algerie-construction.dz',
        password:'Demo@1234', role:'admin', is_admin:false, is_active:true },
      ...current.map(u => ({...u, id: u.id > 2 ? u.id : u.id + 100}))
    ]);
    console.log('✅ تم تحديث بيانات المستخدمين الأساسية');
  }
  // تأكد من وجود المؤسسة
  const tenants = DB.get('tenants');
  if (!tenants.length) {
    DB.set('tenants', [
      { id:1, name:'مؤسسة الجزائر للبناء', plan_id:2, wilaya:'الجزائر',
        subscription_status:'active', is_active:true }
    ]);
  }
})();

/* ── CSS: Heartbeat pulse animation ── */
const _hbStyle = document.createElement('style');
_hbStyle.textContent = `@keyframes hbPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }`;
document.head.appendChild(_hbStyle);

// ─── Auto-Sync Toggle ───
function toggleAutoSync(enabled) {
  localStorage.setItem('sbtp_auto_sync', enabled ? 'true' : 'false');
  const slider = document.getElementById('autoSyncSlider');
  const knob   = document.getElementById('autoSyncKnob');
  const status = document.getElementById('hbStatus');
  if (slider) slider.style.background = enabled ? '#34C38F' : 'rgba(255,255,255,0.1)';
  if (knob)   knob.style.right = enabled ? '3px' : '22px';
  if (enabled) {
    // أعد تشغيل الـ heartbeat
    if (typeof DBHybrid !== 'undefined') {
      DBHybrid._heartbeatInterval = 30000;
      DBHybrid._startHeartbeat();
      DBHybrid._setupNetworkEvents();
    }
    if (status) status.textContent = '✅ المزامنة التلقائية مُفعَّلة — Heartbeat نشط';
    typeof Toast !== 'undefined' && Toast.success('✅ المزامنة التلقائية مُفعَّلة');
  } else {
    if (typeof DBHybrid !== 'undefined') DBHybrid._stopHeartbeat();
    if (status) status.textContent = '⏸️ المزامنة التلقائية موقوفة';
    typeof Toast !== 'undefined' && Toast.warn('⏸️ المزامنة التلقائية موقوفة');
  }
}

// ─── Force Reconnect ───
async function forceReconnectSupabase() {
  if (typeof DBHybrid === 'undefined' || typeof SUPABASE_CONFIG === 'undefined') {
    typeof Toast !== 'undefined' && Toast.warn('⚠️ supabase-db.js غير محمّل');
    return;
  }
  const dot    = document.getElementById('hbDot');
  const status = document.getElementById('hbStatus');
  if (dot)    dot.style.background = '#E8B84B';
  if (status) status.textContent = '⏳ جاري إعادة الاتصال...';
  const ok = await DBHybrid.initSupabase();
  if (dot)    dot.style.background = ok ? '#34C38F' : '#F04E6A';
  if (status) status.textContent = ok
    ? '✅ متصل — Heartbeat نشط كل 30 ثانية'
    : '❌ فشل الاتصال — تحقق من الإعدادات';
  typeof Toast !== 'undefined' && (ok
    ? Toast.success('✅ تم الاتصال بـ Supabase!')
    : Toast.error('❌ فشل الاتصال بـ Supabase'));
}

// ─── Save EmailJS Settings ───
function saveEmailJSSettings() {
  const cfg = {
    SERVICE_ID:     (document.getElementById('ejServiceId')?.value||'').trim(),
    PUBLIC_KEY:     (document.getElementById('ejPublicKey')?.value||'').trim(),
    TEMPLATE_ADMIN: (document.getElementById('ejTemplateAdmin')?.value||'').trim(),
    TEMPLATE_USER:  (document.getElementById('ejTemplateUser')?.value||'').trim(),
    ADMIN_EMAIL:    (document.getElementById('ejAdminEmail')?.value||'').trim(),
  };
  if (!cfg.SERVICE_ID || !cfg.PUBLIC_KEY) {
    typeof Toast !== 'undefined' && Toast.error('❌ Service ID و Public Key مطلوبان');
    return;
  }
  saveEmailJSConfig(cfg);
  typeof Toast !== 'undefined' && Toast.success('✅ تم حفظ إعدادات EmailJS بنجاح!');
  const badge = document.getElementById('emailjsStatusBadge');
  if (badge) { badge.textContent = '🟢 مُفعَّل'; badge.style.color = '#34C38F'; }
}

// ─── Test EmailJS ───
async function testEmailJS() {
  const resultEl = document.getElementById('ejTestResult');
  if (resultEl) {
    resultEl.style.display = 'block';
    resultEl.style.background = 'rgba(232,184,75,0.1)';
    resultEl.style.color = 'var(--gold)';
    resultEl.textContent = '⏳ جاري إرسال بريد اختبار...';
  }
  try {
    const cfg = getEmailJSConfig();
    await emailjs.send(cfg.SERVICE_ID, cfg.TEMPLATE_ADMIN, {
      to_email:    cfg.ADMIN_EMAIL,
      to_name:     'المسؤول',
      user_name:   'اختبار النظام',
      user_email:  cfg.ADMIN_EMAIL,
      company_name:'SmartStruct Test',
      plan_name:   'اختبار',
      wilaya:      'الجزائر',
      date:        new Date().toLocaleDateString('ar-DZ'),
      message:     '✅ هذا بريد اختبار من لوحة تحكم SmartStruct — الإعدادات تعمل بشكل صحيح.',
    });
    if (resultEl) {
      resultEl.style.background = 'rgba(52,195,143,0.1)';
      resultEl.style.color = '#34C38F';
      resultEl.textContent = `✅ تم الإرسال بنجاح إلى ${cfg.ADMIN_EMAIL}`;
    }
    typeof Toast !== 'undefined' && Toast.success('✅ البريد الاختباري أُرسل بنجاح!');
  } catch(e) {
    if (resultEl) {
      resultEl.style.background = 'rgba(240,78,106,0.1)';
      resultEl.style.color = '#F79FA9';
      resultEl.textContent = `❌ فشل الإرسال: ${e.text || e.message || JSON.stringify(e)}`;
    }
    typeof Toast !== 'undefined' && Toast.error('❌ فشل إرسال البريد الاختباري');
  }
}

/* ── Supabase fallback functions (if supabase-db.js not loaded) ── */
if (typeof saveSupabaseConfig === 'undefined') {
  function saveSupabaseConfig() { Toast.warn('⚠️ ملف supabase-db.js غير محمّل'); }
  function syncToSupabase() { Toast.warn('⚠️ ملف supabase-db.js غير محمّل'); }
  function clearSupabaseConfig() { localStorage.removeItem('sbtp_supabase_config'); Toast.success('تم مسح الإعدادات'); }
  function downloadSchema() { Toast.info('ℹ️ قم بتحميل ملف supabase-schema.sql من مجلد المشروع'); }
}

/* ══════════════════════════════════════════════
   v11 NEW PAGES
══════════════════════════════════════════════ */

/* ─── PROFIT SIMULATOR ─── */
Pages.simulator = function() {

  return layoutHTML('simulator', L('محاكي الربح','Simulateur de bénéfice'), `
    <div class="page-header">
      <div>
        <div class="page-title">🧮 ${L('محاكي ربح المشروع','Simulateur de rentabilité')}</div>
        <div class="page-sub">${L('حلل ربحية مشروعك قبل توقيع العقد','Analysez la rentabilité avant de signer le contrat')}</div>
      </div>
    </div>

    <div class="simulator-container">
      <!-- Inputs -->
      <div class="card">
        <div style="font-size:.9rem;font-weight:800;margin-bottom:1rem">📝 ${L('بيانات المشروع','Données du projet')}</div>
        <div class="form-group">
          <label class="form-label">${L('قيمة العقد (دج)','Valeur du contrat (DA)')}</label>
          <input class="form-input" id="sim_contract" type="number" placeholder="10000000" oninput="runSimulator()" value="10000000">
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">${L('عدد العمال','Nombre d\'ouvriers')}</label>
            <input class="form-input" id="sim_workers" type="number" placeholder="20" oninput="runSimulator()" value="20">
          </div>
          <div class="form-group">
            <label class="form-label">${L('مدة المشروع (أيام)','Durée du projet (jours)')}</label>
            <input class="form-input" id="sim_days" type="number" placeholder="90" oninput="runSimulator()" value="90">
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">${L('تكلفة يومية للعامل (دج)','Coût journalier/ouvrier (DA)')}</label>
            <input class="form-input" id="sim_daily" type="number" placeholder="2500" oninput="runSimulator()" value="2500">
          </div>
          <div class="form-group">
            <label class="form-label">${L('تكلفة المعدات (دج)','Coût équipements (DA)')}</label>
            <input class="form-input" id="sim_equip" type="number" placeholder="500000" oninput="runSimulator()" value="500000">
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">${L('تكاليف المواد (دج)','Coût matériaux (DA)')}</label>
            <input class="form-input" id="sim_materials" type="number" placeholder="2000000" oninput="runSimulator()" value="2000000">
          </div>
          <div class="form-group">
            <label class="form-label">${L('نسبة المخاطر (%)','Taux de risque (%)')}</label>
            <input class="form-input" id="sim_risk" type="number" placeholder="10" oninput="runSimulator()" value="10" min="0" max="50">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${L('مصاريف أخرى (دج)','Autres charges (DA)')}</label>
          <input class="form-input" id="sim_other" type="number" placeholder="200000" oninput="runSimulator()" value="200000">
        </div>
        <button class="btn btn-gold" style="width:100%;justify-content:center" onclick="runSimulator()">🔍 ${L('تحليل المشروع','Analyser le projet')}</button>
      </div>

      <!-- Results -->
      <div>
        <div class="simulator-result-card" id="sim_result_card">
          <div style="font-size:.8rem;color:var(--dim);margin-bottom:.3rem">📊 ${L('نتيجة التحليل','Résultat de l\'analyse')}</div>
          <div id="sim_rating_badge" class="sim-rating green">🟢 ${L('مربح','Rentable')}</div>
          <div class="sim-result-val" id="sim_net_profit" style="color:var(--green)">---</div>
          <div style="font-size:.75rem;color:var(--dim)">${L('صافي الربح','Bénéfice net')}</div>
          
          <div class="sim-metrics">
            <div class="sim-metric">
              <div class="sim-metric-val" id="sim_roi" style="color:var(--blue)">---</div>
              <div class="sim-metric-lbl">ROI %</div>
            </div>
            <div class="sim-metric">
              <div class="sim-metric-val" id="sim_breakeven" style="color:var(--gold)">---</div>
              <div class="sim-metric-lbl">${L('نقطة التعادل (يوم)','Seuil rentabilité (j)')}</div>
            </div>
            <div class="sim-metric">
              <div class="sim-metric-val" id="sim_margin" style="color:var(--purple)">---</div>
              <div class="sim-metric-lbl">${L('هامش الربح %','Marge bénéficiaire %')}</div>
            </div>
            <div class="sim-metric">
              <div class="sim-metric-val" id="sim_total_cost" style="color:var(--red)">---</div>
              <div class="sim-metric-lbl">${L('إجمالي التكلفة','Coût total')}</div>
            </div>
          </div>
        </div>

        <!-- Cost Breakdown -->
        <div class="card" style="margin-top:1rem">
          <div style="font-size:.82rem;font-weight:800;margin-bottom:.8rem">🔍 ${L('تفصيل التكاليف','Détail des coûts')}</div>
          <div id="sim_breakdown_rows"></div>
        </div>

        <!-- Save as Project Button -->
        <button class="btn btn-gold" style="width:100%;justify-content:center;margin-top:1rem" onclick="saveSimulatorAsProject()">💾 ${L('حفظ كمشروع جديد','Sauvegarder comme nouveau projet')}</button>
      </div>
    </div>
  `);
};

/* ─── BANK REPORT ─── */
Pages.bankReport = function() {

  const da = L('دج','DA');
  const tid = Auth.getUser().tenant_id;
  const tenant = Auth.getTenant();
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid && !p.is_archived);
  const txs = DB.get('transactions').filter(t=>t.tenant_id===tid);
  const workers = DB.get('workers').filter(w=>w.tenant_id===tid);
  const revenue = txs.filter(t=>t.type==='revenue').reduce((s,t)=>s+Number(t.amount),0);
  const expense  = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  const totalBudget = projects.reduce((s,p)=>s+Number(p.budget),0);
  const totalSpent  = projects.reduce((s,p)=>s+Number(p.total_spent),0);
  const health = calcHealthScore(projects, txs, workers, DB.get('attendance').filter(a=>workers.find(w=>w.id===a.worker_id)));
  const now = new Date();
  const reportNum = `RPT-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const locale = I18N.currentLang==='ar' ? 'ar-DZ' : 'fr-DZ';

  // 6-month cashflow
  const months = [];
  for (let i=5;i>=0;i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const m = d.getMonth(), y = d.getFullYear();
    const mRev = txs.filter(t=>t.type==='revenue'&&new Date(t.date).getMonth()===m&&new Date(t.date).getFullYear()===y).reduce((s,t)=>s+Number(t.amount),0);
    const mExp = txs.filter(t=>t.type==='expense'&&new Date(t.date).getMonth()===m&&new Date(t.date).getFullYear()===y).reduce((s,t)=>s+Number(t.amount),0);
    months.push({ label: d.toLocaleDateString(locale,{month:'short',year:'2-digit'}), rev:mRev, exp:mExp });
  }

  return layoutHTML('bank_report', L('تقرير بنكي','Rapport bancaire'), `
    <div class="page-header">
      <div>
        <div class="page-title">🏦 ${L('التقرير البنكي الاحترافي','Rapport bancaire professionnel')}</div>
        <div class="page-sub">${L('تقرير مالي جاهز للتقديم للبنك','Rapport financier prêt à soumettre à la banque')}</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-gold" onclick="window.print()">🖨️ ${L('طباعة / PDF','Imprimer / PDF')}</button>
      </div>
    </div>

    <!-- Preview -->
    <div class="bank-report-preview" id="bankReportDoc">
      <!-- Header -->
      <div class="bank-report-header">
        <div>
          <div class="bank-report-logo">▦ SmartStruct</div>
          <div style="font-size:.75rem;color:#666;margin-top:3px">${L('نظام الإدارة المالية للمقاولين','Système de gestion financière BTP')}</div>
        </div>
        <div style="text-align:left">
          <div style="font-size:.7rem;color:#888">${L('رقم التقرير','N° du rapport')}</div>
          <div style="font-weight:900;color:#1a3a5c;font-family:monospace">${reportNum}</div>
          <div style="font-size:.7rem;color:#888;margin-top:4px">${L('تاريخ الإصدار','Date d\'émission')}: ${now.toLocaleDateString(locale)}</div>
        </div>
      </div>

      <!-- Company Info -->
      <div class="bank-report-section">
        <div class="bank-report-section-title">🏢 ${L('معلومات الشركة','Informations de la société')}</div>
        <div class="bank-report-row"><span>${L('اسم المؤسسة','Nom de l\'entreprise')}</span><span style="font-weight:700">${escHtml(tenant?.name||'—')}</span></div>
        <div class="bank-report-row"><span>${L('الولاية','Wilaya')}</span><span style="font-weight:700">${escHtml(tenant?.wilaya||'—')}</span></div>
        <div class="bank-report-row"><span>${L('رقم السجل التجاري','Registre de commerce')}</span><span style="font-weight:700;font-family:monospace">${escHtml(tenant?.rc_number||'—')}</span></div>
        <div class="bank-report-row"><span>${L('رقم الهاتف','Téléphone')}</span><span style="font-weight:700">${escHtml(tenant?.phone||'—')}</span></div>
        <div class="bank-report-row"><span>${L('عدد العمال','Nombre d\'ouvriers')}</span><span style="font-weight:700">${workers.length} ${L('عامل','ouvrier(s)')}</span></div>
      </div>

      <!-- Financial Summary -->
      <div class="bank-report-section">
        <div class="bank-report-section-title">💰 ${L('الملخص المالي','Résumé financier')}</div>
        <div class="bank-report-row"><span>${L('إجمالي الإيرادات','Total revenus')}</span><span style="font-weight:700;color:green">${fmt(revenue)} ${da}</span></div>
        <div class="bank-report-row"><span>${L('إجمالي المصاريف','Total dépenses')}</span><span style="font-weight:700;color:red">${fmt(expense)} ${da}</span></div>
        <div class="bank-report-row"><span>${L('صافي الربح / الخسارة','Bénéfice / Perte net(te)')}</span><span style="font-weight:900;color:${revenue-expense>=0?'green':'red'};font-size:1rem">${fmt(revenue-expense)} ${da}</span></div>
        <div class="bank-report-row"><span>${L('إجمالي الميزانية المتعاقد عليها','Budget total contracté')}</span><span style="font-weight:700">${fmt(totalBudget)} ${da}</span></div>
        <div class="bank-report-row"><span>${L('المنفق الفعلي','Dépensé réellement')}</span><span style="font-weight:700">${fmt(totalSpent)} ${da}</span></div>
        <div class="bank-report-row"><span>${L('نسبة الاستهلاك','Taux de consommation')}</span><span style="font-weight:700">${totalBudget>0?Math.round(totalSpent/totalBudget*100):0}%</span></div>
      </div>

      <!-- Projects -->
      <div class="bank-report-section">
        <div class="bank-report-section-title">🏗️ ${L('المشاريع','Projets')} (${projects.length})</div>
        ${projects.map(p=>`
          <div class="bank-report-row">
            <span>${escHtml(p.name)} <small style="color:#888">(${escHtml(p.wilaya||'')})</small></span>
            <span style="font-weight:700">${fmt(p.budget)} ${da} — ${p.progress}% ✓</span>
          </div>
        `).join('')}
      </div>

      <!-- Cashflow Table -->
      <div class="bank-report-section">
        <div class="bank-report-section-title">📊 ${L('التدفق النقدي (6 أشهر)','Flux de trésorerie (6 mois)')}</div>
        <table style="width:100%;font-size:.8rem;border-collapse:collapse">
          <thead><tr style="background:#f5f5f5">
            <th style="padding:5px;text-align:right">${L('الشهر','Mois')}</th>
            <th style="padding:5px">${L('الإيرادات','Revenus')}</th>
            <th style="padding:5px">${L('المصاريف','Dépenses')}</th>
            <th style="padding:5px">${L('الرصيد','Solde')}</th>
          </tr></thead>
          <tbody>
            ${months.map(m=>`<tr style="border-bottom:1px solid #eee">
              <td style="padding:5px;font-weight:700">${m.label}</td>
              <td style="padding:5px;text-align:center;color:green">${fmt(m.rev)}</td>
              <td style="padding:5px;text-align:center;color:red">${fmt(m.exp)}</td>
              <td style="padding:5px;text-align:center;font-weight:700;color:${m.rev-m.exp>=0?'green':'red'}">${fmt(m.rev-m.exp)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- Health Score -->
      <div class="bank-report-section">
        <div class="bank-report-section-title">🏥 ${L('مؤشر الصحة المالية','Indice de santé financière')}</div>
        <div style="display:flex;align-items:center;gap:1rem">
          <div style="font-size:2.5rem;font-weight:900;color:${health.score>=75?'green':health.score>=55?'orange':'red'}">${health.score}</div>
          <div>
            <div style="font-weight:700">${health.label} (${health.score}/100)</div>
            <div style="font-size:.75rem;color:#666">${L('ربحية','Rentabilité')}: ${health.breakdown?.profitability||0}% | ${L('سيولة','Liquidité')}: ${health.breakdown?.liquidity||0}% | ${L('تأخير','Retard')}: ${health.breakdown?.delay||0}%</div>
          </div>
        </div>
      </div>

      <!-- Footer & Stamp -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2rem;padding-top:1rem;border-top:1px solid #ddd">
        <div style="font-size:.7rem;color:#888">
          ${L('تم إنشاؤه بواسطة','Généré par')} SmartStruct v1.0 | ${now.toLocaleDateString(locale)} ${now.toLocaleTimeString(locale)}
        </div>
        <div class="bank-report-stamp">SmartStruct<br>${L('تقرير','Rapport')}<br>${L('رسمي','Officiel')}</div>
      </div>
    </div>

    <style>@media print { body * { visibility: hidden } #bankReportDoc, #bankReportDoc * { visibility: visible; color: #1a1a1a !important; } #bankReportDoc { position: fixed; top: 0; left: 0; width: 100%; background: white; } }</style>
  `);
};

/* ─── UPCOMING OBLIGATIONS ─── */
Pages.obligations = function() {

  const da = L('دج','DA');
  const tid = Auth.getUser().tenant_id;
  const workers = DB.get('workers').filter(w=>w.tenant_id===tid);
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid && p.status === 'active');
  const obls = DB.get('obligations_'+tid) || [];

  const monthlyPayroll = workers.reduce((s,w)=>s+Number(w.daily_salary||0)*26,0);
  const today = new Date();
  const daysToEndOfMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate() - today.getDate();
  const locale = I18N.currentLang==='ar' ? 'ar-DZ' : 'fr-FR';

  const builtIn = [
    { title: `${L('رواتب شهر','Salaires du mois de')} ${new Date(today.getFullYear(), today.getMonth()+1, 1).toLocaleDateString(locale,{month:'long'})}`, amount: monthlyPayroll, daysLeft: daysToEndOfMonth+1, type: 'salary' },
  ];

  const allObls = [...builtIn, ...obls].sort((a,b)=>a.daysLeft-b.daysLeft);

  return layoutHTML('obligations', L('الالتزامات القادمة','Obligations à venir'), `
    <div class="page-header">
      <div>
        <div class="page-title">⏰ ${L('الالتزامات القادمة','Obligations à venir')}</div>
        <div class="page-sub">${L('مدفوعات ودفعات مجدولة','Paiements et versements planifiés')}</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-gold btn-sm" onclick="showAddObligationModal()">+ ${L('إضافة التزام','Ajouter obligation')}</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:1rem">
      <div class="card">
        <div style="font-size:.85rem;font-weight:800;margin-bottom:1rem">📋 ${L('قائمة الالتزامات','Liste des obligations')}</div>
        ${allObls.length ? allObls.map((ob,i) => `
          <div class="obligation-item">
            <div class="obligation-dot" style="background:${ob.daysLeft<=7?'var(--red)':ob.daysLeft<=14?'var(--gold)':'var(--green)'}"></div>
            <div class="obligation-title">
              ${escHtml(ob.title)}
              ${ob.type==='salary'?`<span style="font-size:.65rem;color:var(--muted);background:rgba(255,255,255,.05);padding:1px 6px;border-radius:8px;margin-right:5px">👷 ${L('رواتب','Salaires')}</span>`:''}
            </div>
            <div class="obligation-amount">${fmt(ob.amount)} ${da}</div>
            <div class="obligation-days ${ob.daysLeft<=7?'ob-urgent':ob.daysLeft<=14?'ob-soon':'ob-ok'}">${ob.daysLeft} ${L('يوم','j')}</div>
            ${ob.id?`<button class="btn btn-sm btn-red" onclick="deleteObligation('${ob.id}')">🗑</button>`:''}
          </div>
        `).join('') : `
          <div class="empty-state-enhanced">
            <div class="empty-state-illustration" style="background:rgba(52,195,143,0.08)">✅</div>
            <div class="empty-state-title">${L('لا توجد التزامات مجدولة','Aucune obligation planifiée')}</div>
            <div class="empty-state-desc">${L('أضف دفعات موردين، إيجار معدات، أو قروض مستحقة','Ajoutez des paiements fournisseurs, locations ou remboursements')}</div>
            <button class="btn btn-gold" onclick="showAddObligationModal()">+ ${L('إضافة التزام','Ajouter obligation')}</button>
          </div>
        `}
      </div>
      <div>
        <div class="card" style="margin-bottom:1rem">
          <div style="font-size:.82rem;font-weight:800;margin-bottom:.8rem">📊 ${L('ملخص','Résumé')}</div>
          <div style="display:flex;justify-content:space-between;margin-bottom:.5rem">
            <span style="font-size:.75rem;color:var(--dim)">${L('إجمالي الالتزامات','Total obligations')}</span>
            <span style="font-weight:900;color:var(--red)">${fmt(allObls.reduce((s,o)=>s+Number(o.amount),0))} ${da}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:.5rem">
            <span style="font-size:.75rem;color:var(--dim)">🔴 ${L('عاجل (< 7 أيام)','Urgent (< 7 jours)')}</span>
            <span style="font-weight:700;color:var(--red)">${allObls.filter(o=>o.daysLeft<=7).length}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:.75rem;color:var(--dim)">🟡 ${L('قريب (< 14 يوم)','Proche (< 14 jours)')}</span>
            <span style="font-weight:700;color:var(--gold)">${allObls.filter(o=>o.daysLeft<=14&&o.daysLeft>7).length}</span>
          </div>
        </div>
        <div class="card">
          <div style="font-size:.82rem;font-weight:800;margin-bottom:.8rem">💡 ${L('نصيحة','Conseil')}</div>
          <div style="font-size:.78rem;color:var(--dim);line-height:1.7">
            ${L('احرص على الاحتفاظ برصيد يغطي الالتزامات القادمة لمدة 30 يوماً على الأقل لتفادي أي أزمة سيولة.','Veillez à maintenir un solde couvrant vos obligations des 30 prochains jours pour éviter toute crise de liquidité.')}
          </div>
        </div>
      </div>
    </div>

    <!-- Add Obligation Modal -->
    <div class="modal-overlay" id="addObligationModal">
      <div class="modal">
        <div class="modal-title">+ ${L('إضافة التزام جديد','Ajouter une nouvelle obligation')}</div>
        <div class="form-group">
          <label class="form-label">${L('اسم الالتزام','Nom de l\'obligation')}</label>
          <input class="form-input" id="ob_title" placeholder="${L('دفعة مورد مواد...','Paiement fournisseur...')}">
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">${L('المبلغ (دج)','Montant (DA)')}</label>
            <input class="form-input" id="ob_amount" type="number" placeholder="500000">
          </div>
          <div class="form-group">
            <label class="form-label">${L('تاريخ الاستحقاق','Date d\'échéance')}</label>
            <input class="form-input" id="ob_due" type="date">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-gold" onclick="saveObligation()">💾 ${L('حفظ','Enregistrer')}</button>
          <button class="btn btn-ghost" data-modal-close>${L('إلغاء','Annuler')}</button>
        </div>
      </div>
    </div>
  `);
};

/* ─── AUDIT LOG ─── */
Pages.auditLog = function() {

  const tid = Auth.getUser().tenant_id;
  const logs = (DB.get('audit_log_'+tid) || []).slice().reverse();

  return layoutHTML('audit_log', L('سجل النشاط','Journal d\'activité'), `
    <div class="page-header">
      <div>
        <div class="page-title">📋 ${L('سجل النشاط','Journal d\'activité')}</div>
        <div class="page-sub">${L('تتبع جميع التعديلات والعمليات في النظام','Suivi de toutes les modifications et opérations du système')}</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="clearAuditLog()">🗑 ${L('مسح السجل','Effacer le journal')}</button>
      </div>
    </div>

    <div class="card">
      ${logs.length ? logs.map(log => `
        <div class="audit-log-item">
          <div class="audit-avatar">${escHtml((log.user||'?').charAt(0).toUpperCase())}</div>
          <div style="flex:1">
            <div class="audit-action">${escHtml(log.action)}</div>
            ${log.before || log.after ? `
              <div class="audit-before-after">
                ${log.before ? `<span class="audit-before">${L('قبل','Avant')}: ${escHtml(String(log.before).substring(0,30))}</span>` : ''}
                ${log.after  ? `<span class="audit-after">${L('بعد','Après')}: ${escHtml(String(log.after).substring(0,30))}</span>` : ''}
              </div>
            ` : ''}
            <div class="audit-time">🕐 ${log.time} • 👤 ${escHtml(log.user||L('مجهول','Inconnu'))}</div>
          </div>
          <div style="font-size:1.1rem">${log.icon||'📝'}</div>
        </div>
      `).join('') : `
        <div class="empty-state-enhanced">
          <div class="empty-state-illustration" style="background:rgba(74,144,226,0.08)">📋</div>
          <div class="empty-state-title">${L('سجل النشاط فارغ','Journal d\'activité vide')}</div>
          <div class="empty-state-desc">${L('ستظهر هنا جميع العمليات التي يقوم بها أعضاء الفريق','Toutes les opérations effectuées par les membres de l\'équipe apparaîtront ici')}</div>
        </div>
      `}
    </div>
  `);
};

/* ─── AUDIT LOG HELPER ─── */
function addAuditLog(action, opts={}) {
  const user = Auth.getUser();
  if (!user) return;
  const tid = user.tenant_id;
  const locale = I18N.currentLang==='ar' ? 'ar-DZ' : 'fr-FR';
  const logs = DB.get('audit_log_'+tid) || [];
  logs.push({
    id: Date.now(),
    action,
    before: opts.before || null,
    after: opts.after || null,
    user: user.full_name || user.email,
    time: new Date().toLocaleString(locale),
    icon: opts.icon || '📝'
  });
  if (logs.length > 200) logs.splice(0, logs.length - 200);
  DB.set('audit_log_'+tid, logs);
}

/* ─── SIMULATOR LOGIC ─── */
function runSimulator() {
  const contract   = parseFloat(document.getElementById('sim_contract')?.value) || 0;
  const workers    = parseFloat(document.getElementById('sim_workers')?.value) || 0;
  const days       = parseFloat(document.getElementById('sim_days')?.value) || 0;
  const dailySal   = parseFloat(document.getElementById('sim_daily')?.value) || 0;
  const equip      = parseFloat(document.getElementById('sim_equip')?.value) || 0;
  const materials  = parseFloat(document.getElementById('sim_materials')?.value) || 0;
  const riskPct    = parseFloat(document.getElementById('sim_risk')?.value) || 0;
  const other      = parseFloat(document.getElementById('sim_other')?.value) || 0;

  const laborCost = workers * days * dailySal;
  const baseCost = laborCost + equip + materials + other;
  const riskBuffer = baseCost * (riskPct / 100);
  const totalCost = baseCost + riskBuffer;
  const netProfit = contract - totalCost;
  const roi = contract > 0 ? (netProfit / contract) * 100 : 0;
  const margin = contract > 0 ? (netProfit / contract) * 100 : 0;
  const breakeven = dailySal > 0 && workers > 0 ? Math.ceil(totalCost / (workers * dailySal)) : 0;

  const isGreen = roi > 15;
  const isYellow = roi >= 5 && roi <= 15;

  const ratingEl = document.getElementById('sim_rating_badge');
  const profitEl = document.getElementById('sim_net_profit');
  const roiEl = document.getElementById('sim_roi');
  const beEl = document.getElementById('sim_breakeven');
  const marginEl = document.getElementById('sim_margin');
  const costEl = document.getElementById('sim_total_cost');
  const brRows = document.getElementById('sim_breakdown_rows');

  if (!ratingEl) return;

  if (isGreen) {
    ratingEl.className = 'sim-rating green';
    ratingEl.textContent = I18N.currentLang==='ar' ? '🟢 مشروع مربح' : '🟢 Projet rentable';
  } else if (isYellow) {
    ratingEl.className = 'sim-rating yellow';
    ratingEl.textContent = I18N.currentLang==='ar' ? '🟡 ربح متوسط' : '🟡 Rentabilité moyenne';
  } else {
    ratingEl.className = 'sim-rating red';
    ratingEl.textContent = I18N.currentLang==='ar' ? '🔴 خطر — مراجعة مطلوبة' : '🔴 Risque — Révision requise';
  }

  profitEl.textContent = (netProfit >= 0 ? '+' : '') + fmt(Math.round(netProfit)) + ' ' + (I18N.currentLang==='ar'?'دج':'DA');
  profitEl.style.color = netProfit >= 0 ? 'var(--green)' : 'var(--red)';
  roiEl.textContent = roi.toFixed(1) + '%';
  roiEl.style.color = isGreen ? 'var(--green)' : isYellow ? 'var(--gold)' : 'var(--red)';
  beEl.textContent = breakeven > 0 ? breakeven + (I18N.currentLang==='ar'?' يوم':' j') : '—';
  marginEl.textContent = margin.toFixed(1) + '%';
  costEl.textContent = fmt(Math.round(totalCost));

  const da = I18N.currentLang==='ar' ? 'دج' : 'DA';
  brRows.innerHTML = [
    { lbl: I18N.currentLang==='ar'?'👷 أجور العمال':'👷 Salaires ouvriers', val: laborCost },
    { lbl: I18N.currentLang==='ar'?'🚜 معدات':'🚜 Équipements', val: equip },
    { lbl: I18N.currentLang==='ar'?'🧱 مواد':'🧱 Matériaux', val: materials },
    { lbl: I18N.currentLang==='ar'?'📦 مصاريف أخرى':'📦 Autres charges', val: other },
    { lbl: I18N.currentLang==='ar'?'⚠️ احتياطي المخاطر':'⚠️ Réserve de risque', val: riskBuffer },
    { lbl: I18N.currentLang==='ar'?'📊 إجمالي التكلفة':'📊 Coût total', val: totalCost, bold: true },
  ].map(r => `
    <div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid rgba(255,255,255,.04);${r.bold?'font-weight:900;border-top:1px solid rgba(255,255,255,.1);margin-top:.3rem':''}">
      <span style="font-size:.8rem;color:var(--${r.bold?'text':'dim'})">${r.lbl}</span>
      <span style="font-size:.8rem;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--${r.bold?'red':'muted'})">${fmt(Math.round(r.val))} ${da}</span>
    </div>
  `).join('');
}

function saveSimulatorAsProject() {

  const contract = parseFloat(document.getElementById('sim_contract')?.value) || 0;
  if (!contract) { Toast.error(L('أدخل قيمة العقد أولاً','Entrez la valeur du contrat d\'abord')); return; }
  Toast.success(L('✅ يمكنك إضافة مشروع جديد من صفحة المشاريع','✅ Vous pouvez ajouter un nouveau projet depuis la page Projets'));
  App.navigate('projects');
}

/* ─── OBLIGATION HELPERS ─── */
function showAddObligationModal() {
  const m = document.getElementById('addObligationModal');
  if (m) m.classList.add('show');
}
function saveObligation() {

  const tid = Auth.getUser().tenant_id;
  const title = document.getElementById('ob_title')?.value.trim();
  const amount = parseFloat(document.getElementById('ob_amount')?.value) || 0;
  const due = document.getElementById('ob_due')?.value;
  if (!title || !amount || !due) { Toast.error(L('يرجى ملء جميع الحقول','Veuillez remplir tous les champs')); return; }
  const daysLeft = Math.ceil((new Date(due) - new Date()) / 86400000);
  const obs = DB.get('obligations_'+tid) || [];
  const newOb = { id: Date.now(), title, amount, daysLeft, due, tenant_id: tid };
  obs.push(newOb);
  DB.set('obligations_'+tid, obs);
  sbSync('obligations', newOb, 'POST').catch(()=>{});
  addAuditLog(L('إضافة التزام: ','Ajout obligation: ') + title, { after: fmt(amount) + ' ' + L('دج','DA'), icon: '⏰' });
  Toast.success(L('✅ تم إضافة الالتزام','✅ Obligation ajoutée'));
  App.navigate('obligations');
}
function deleteObligation(id) {

  const tid = Auth.getUser().tenant_id;
  const obs = (DB.get('obligations_'+tid) || []).filter(o=>o.id != id);
  DB.set('obligations_'+tid, obs);
  sbSyncDelete('obligations', id).catch(()=>{});
  Toast.success(L('تم الحذف','Supprimé'));
  App.navigate('obligations');
}
function clearAuditLog() {

  if (!confirm(L('هل تريد مسح سجل النشاط؟','Voulez-vous effacer le journal d\'activité ?'))) return;
  const tid = Auth.getUser().tenant_id;
  DB.set('audit_log_'+tid, []);
  Toast.success('تم مسح السجل');
  App.navigate('audit_log');
}
function printAICEOSummary() {
  Toast.info('يمكنك استخدام Ctrl+P لطباعة الصفحة');
}

/* ══════════════════════════════════════════════════════
   🤖 SmartAI — نظام الذكاء الاصطناعي الحقيقي
   يعمل بـ Claude API من Anthropic
══════════════════════════════════════════════════════ */
const SmartAI = {
  isOpen: false,
  isLoading: false,
  history: [],
  _currentTenantId: null,  // لتتبع الحساب الحالي ومنع خلط المحادثات
  apiKey: null,

  // إعادة تهيئة المحادثة عند تغيير الحساب
  resetForTenant(tenantId) {
    if (this._currentTenantId !== tenantId) {
      this.history = [];
      this._currentTenantId = tenantId;
      // أغلق نافذة الدردشة عند التبديل
      if (this.isOpen) {
        const panel = document.getElementById('aiChatPanel');
        if (panel) panel.style.display = 'none';
        this.isOpen = false;
      }
      // امسح الرسائل المعروضة
      const msgEl = document.getElementById('aiMessages');
      if (msgEl) msgEl.innerHTML = '';
    }
  },

  /* ── الحصول على بيانات السياق من قاعدة البيانات ── */
  getContext() {
    try {
      const user = Auth.getUser();
      if (!user) return {};
      const tid = user.tenant_id;
      const tenant = Auth.getTenant() || {};
      const projects = DB.get('projects').filter(p => p.tenant_id === tid && !p.is_archived);
      const workers = DB.get('workers').filter(w => w.tenant_id === tid);
      const txs = DB.get('transactions').filter(t => t.tenant_id === tid);
      const att = DB.get('attendance');
      const today = new Date().toISOString().split('T')[0];
      const revenue = txs.filter(t => t.type === 'revenue').reduce((s, t) => s + Number(t.amount), 0);
      const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      const todayAtt = att.filter(a => a.date === today);
      const presentToday = todayAtt.filter(a => a.status === 'present').length;

      const projectSummaries = projects.map(p => {
        const pRev = txs.filter(t => t.project_id === p.id && t.type === 'revenue').reduce((s, t) => s + Number(t.amount), 0);
        const pExp = txs.filter(t => t.project_id === p.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        const budgetUsed = p.budget > 0 ? Math.round(p.total_spent / p.budget * 100) : 0;
        return {
          اسم: p.name,
          الولاية: p.wilaya || '—',
          الحالة: p.status,
          التقدم: p.progress + '%',
          الميزانية: p.budget.toLocaleString() + ' دج',
          المنفق: p.total_spent.toLocaleString() + ' دج',
          نسبة_الاستهلاك: budgetUsed + '%',
          الإيراد: pRev.toLocaleString() + ' دج',
          المصروف: pExp.toLocaleString() + ' دج',
          الربح: (pRev - pExp).toLocaleString() + ' دج',
          خطر: budgetUsed > 80 && p.progress < 60 ? 'عالي' : budgetUsed > 60 ? 'متوسط' : 'منخفض'
        };
      });

      const workerSummary = {
        العدد_الإجمالي: workers.length,
        الحاضرون_اليوم: presentToday,
        معدل_الحضور: workers.length > 0 ? Math.round(presentToday / workers.length * 100) + '%' : '0%',
        إجمالي_الأجور_اليومية: workers.reduce((s, w) => s + Number(w.daily_salary || 0), 0).toLocaleString() + ' دج'
      };

      return {
        المؤسسة: tenant.name || '—',
        الولاية: tenant.wilaya || '—',
        اليوم: today,
        الماليات: {
          إجمالي_الإيرادات: revenue.toLocaleString() + ' دج',
          إجمالي_المصاريف: expense.toLocaleString() + ' دج',
          الربح_الصافي: (revenue - expense).toLocaleString() + ' دج',
          نسبة_الربحية: revenue > 0 ? Math.round((revenue - expense) / revenue * 100) + '%' : '0%'
        },
        المشاريع: projectSummaries,
        العمال: workerSummary,
        المشاريع_النشطة: projects.filter(p => p.status === 'active').length,
        المشاريع_المتأخرة: projects.filter(p => p.status === 'delayed').length,
        مشاريع_في_خطر: projects.filter(p => p.budget > 0 && p.total_spent / p.budget > 0.8 && p.progress < 60).length
      };
    } catch (e) {
      return {};
    }
  },

  /* ── إنشاء System Prompt بالسياق الكامل ── */
  buildSystemPrompt() {
    const ctx = this.getContext();
    return `أنت SmartAI، مساعد ذكاء اصطناعي متخصص في إدارة مشاريع المقاولة الجزائرية، مدمج في منصة SmartStruct.

**بيانات المؤسسة الحالية (حقيقية، محدّثة):**
${JSON.stringify(ctx, null, 2)}

**دورك:**
- محلل مالي ومستشار مشاريع متخصص في السوق الجزائري
- تقدم توصيات عملية وقابلة للتطبيق فوراً
- تستخدم الأرقام الحقيقية من البيانات أعلاه في تحليلاتك
- تتحدث بالعربية الفصحى البسيطة، مع إمكانية استخدام الفرنسية عند الحاجة
- تكون موجزاً ومركّزاً على الإجراءات

**تعليمات الإجابة:**
- استخدم الإيموجي لتنظيم الإجابة بصرياً
- قدم الأرقام بالدينار الجزائري (دج)
- أولوياتك: سلامة الميزانية، الربحية، كفاءة العمال
- إذا لم تجد بيانات كافية، أشر إلى ذلك وأعطِ توصيات عامة
- لا تتجاوز 300 كلمة في الإجابة إلا إذا طُلب منك التفصيل
- **لا تُجب على أسئلة خارج نطاق إدارة المشاريع والمقاولة**`;
  },

  /* ── إرسال رسالة للـ API ── */
  async callAPI(userMessage) {
    this.history.push({ role: 'user', content: userMessage });

    // ── قراءة إعداد AI المركزي (يُضبط من المسؤول مرة واحدة للجميع) ──
    const cfg = getAIConfig();
    const noKey = !cfg.apiKey || cfg.status === 'inactive' || cfg.status === 'error';

    if (noKey) {
      // المسؤول لم يُعدّ AI بعد — رسالة للمسؤول فقط
      const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
      const isAdmin = user && user.is_admin;
      const guideMsg = isAdmin
        ? `⚙️ **فعّل SmartAI من لوحة التحكم**\n\nاذهب لـ تبويب **🤖 إعدادات SmartAI** في صفحة الإدارة، أدخل مفتاح API (Groq مجاني ⚡)، واضغط اختبار واحفظ.\n\nبعدها يشتغل الروبوت لجميع المؤسسات تلقائياً.`
        : `🤖 **SmartAI** في انتظار التفعيل من المسؤول.\n\nسيكون متاحاً قريباً — تواصل مع إدارة المنصة.`;
      this.history.push({ role: 'assistant', content: guideMsg });
      return guideMsg;
    }

    // ── إرسال الطلب للمزود المضبوط ──
    const provider = (typeof AI_PROVIDERS !== 'undefined'
      ? AI_PROVIDERS.find(p => p.id === cfg.provider)
      : null) || { endpoint: 'https://api.groq.com/openai/v1/chat/completions', apiStyle: 'openai' };

    const model = cfg.model || 'llama-3.3-70b-versatile';
    const systemPrompt = this.buildSystemPrompt();

    let resp;
    if (provider.apiStyle === 'anthropic') {
      resp = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cfg.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model, max_tokens: 1024, system: systemPrompt, messages: this.history.slice(-10) })
      });
      if (!resp.ok) { const e = await resp.json().catch(()=>({})); throw new Error(e.error?.message || `HTTP ${resp.status}`); }
      const data = await resp.json();
      const msg = data.content?.[0]?.text || 'لم أتمكن من الإجابة.';
      this.history.push({ role: 'assistant', content: msg });
      return msg;
    } else if (provider.apiStyle === 'gemini') {
      const url = `${provider.endpoint}?key=${cfg.apiKey}`;
      const histWithSys = [
        { role: 'user', content: 'أنت SmartAI. ' + systemPrompt + '\n\nقل "مفهوم".' },
        { role: 'assistant', content: 'مفهوم.' },
        ...this.history.slice(-8)
      ];
      const contents = histWithSys.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 1024 } }) });
      if (!resp.ok) { const e = await resp.json().catch(()=>({})); throw new Error(e.error?.message || `HTTP ${resp.status}`); }
      const data = await resp.json();
      const msg = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم أتمكن من الإجابة.';
      this.history.push({ role: 'assistant', content: msg });
      return msg;
    } else {
      // OpenAI style (Groq, OpenRouter, Together, etc.)
      const msgs = [{ role: 'system', content: systemPrompt }, ...this.history.slice(-10)];
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` };
      if (cfg.provider === 'openrouter_free') { headers['HTTP-Referer'] = 'https://smartstruct.dz'; headers['X-Title'] = 'SmartStruct'; }
      resp = await fetch(provider.endpoint || 'https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers,
        body: JSON.stringify({ model, messages: msgs, max_tokens: 1024, temperature: 0.7 })
      });
      if (!resp.ok) { const e = await resp.json().catch(()=>({})); throw new Error(e.error?.message || `HTTP ${resp.status}`); }
      const data = await resp.json();
      const msg = data.choices?.[0]?.message?.content || 'لم أتمكن من الإجابة.';
      this.history.push({ role: 'assistant', content: msg });
      return msg;
    }
  },

  /* ── عرض رسالة في الدردشة ── */
  appendMessage(role, text) {
    const el = document.getElementById('aiMessages');
    if (!el) return;
    const now = new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
    // تحويل markdown بسيط لـ HTML
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    const div = document.createElement('div');
    div.className = `ai-msg ${role}`;
    div.innerHTML = `${formatted}<div class="ai-msg-time">${now}</div>`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
    return div;
  },

  showTyping() {
    const el = document.getElementById('aiMessages');
    if (!el) return;
    const div = document.createElement('div');
    div.className = 'ai-typing';
    div.id = 'aiTypingIndicator';
    div.innerHTML = '<div class="ai-typing-dot"></div><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div>';
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  },

  hideTyping() {
    document.getElementById('aiTypingIndicator')?.remove();
  },

  /* ── إرسال رسالة ── */
  async send() {
    if (this.isLoading) return;
    const input = document.getElementById('aiInput');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;

    const user = Auth.getUser();
    if (!user) { Toast.error('يجب تسجيل الدخول أولاً'); return; }

    input.value = '';
    input.style.height = 'auto';
    this.appendMessage('user', msg);
    this.setLoading(true);
    this.showTyping();

    try {
      const reply = await this.callAPI(msg);
      this.hideTyping();
      this.appendMessage('bot', reply);
      // حفظ محادثة AI في audit log
      try {
        const tid = user.tenant_id;
        const log = DB.get('audit_log_' + tid) || [];
        log.push({ action: 'ai_chat', user: user.full_name, q: msg.substring(0, 80), ts: Date.now() });
        DB.set('audit_log_' + tid, log.slice(-200));
      } catch (e) {}
    } catch (err) {
      this.hideTyping();
      const errMsg = err.message.includes('API') || err.message.includes('fetch')
        ? '⚠️ خطأ في الاتصال بـ Claude API. تأكد من اتصال الإنترنت.'
        : `⚠️ ${err.message}`;
      this.appendMessage('bot', errMsg);
    } finally {
      this.setLoading(false);
    }
  },

  quickAsk(msg) {
    const input = document.getElementById('aiInput');
    if (input) { input.value = msg; input.style.height = 'auto'; }
    this.send();
  },

  setLoading(on) {
    this.isLoading = on;
    const btn = document.getElementById('aiSendBtn');
    if (btn) btn.disabled = on;
  },

  toggleChat() {
    this.isOpen = !this.isOpen;
    const panel = document.getElementById('aiChatPanel');
    const fab = document.getElementById('aiFab');
    if (!panel) return;

    if (this.isOpen) {
      panel.style.display = 'flex';
      panel.style.flexDirection = 'column';
      document.getElementById('aiFabBadge').style.display = 'none';
      // رسالة ترحيب شخصية باسم المؤسسة عند أول فتح لكل جلسة
      if (this.history.length === 0) {
        setTimeout(() => {
          const user = Auth.getUser();
          const tenant = Auth.getTenant();
          const ctx = this.getContext();
          // تحقق هل الـ AI مُفعّل
          const aiCfg = getAIConfig();
          const aiReady = aiCfg.apiKey && aiCfg.status === 'active';
          let greeting;
          if (user && tenant) {
            const firstName = escHtml(user.full_name.split(' ')[0]);
            const companyName = escHtml(tenant.name);
            if (aiReady) {
              greeting = `مرحباً ${firstName} 👋 — **${companyName}**\n\nأنا **SmartAI**، مساعدك الذكي المخصص لمؤسستك.\n\n📊 **ملخص سريع:**\n• **${ctx.المشاريع_النشطة || 0}** مشروع نشط\n• **${ctx.العمال?.العدد_الإجمالي || 0}** عامل\n• الربح الصافي: **${ctx.الماليات?.الربح_الصافي || '0 دج'}**\n\nكيف يمكنني مساعدتك اليوم؟`;
            } else {
              greeting = `مرحباً ${firstName} 👋 — **${companyName}**\n\nأنا **SmartAI** 🤖، مساعدك الذكي.\n\n⚙️ **لتفعيلي مجاناً:**\n1. اذهب لـ **الإعدادات** ← تبويب **🤖 SmartAI**\n2. اختر **Groq** (مجاني ⚡) وأدخل مفتاح API\n3. سجّل مجاناً في [console.groq.com](https://console.groq.com/keys)\n\nبعد التفعيل سأحلّل مشاريعك بشكل كامل! 🚀`;
            }
          } else if (user) {
            greeting = `مرحباً ${escHtml(user.full_name.split(' ')[0])} 👋\n\nأنا **SmartAI**. فعّلني من **الإعدادات ← SmartAI** للحصول على تحليل مخصص.`;
          } else {
            greeting = 'مرحباً! أنا SmartAI. سجّل الدخول للحصول على تحليل مخصص لمشاريعك.';
          }
          this.appendMessage('bot', greeting);
        }, 300);
      }
      setTimeout(() => { document.getElementById('aiInput')?.focus(); }, 350);
    } else {
      panel.style.display = 'none';
    }
  },

  /* ── تحليل ذكي تلقائي للمشاريع ── */
  async autoAnalyze() {
    const user = Auth.getUser();
    if (!user || user.is_admin) return;

    // تحقق هل تم التحليل اليوم
    const today = new Date().toISOString().split('T')[0];
    const lastAnalysis = sessionStorage.getItem('ai_last_analysis');
    if (lastAnalysis === today) return;

    const ctx = this.getContext();
    if (!ctx.مشاريع_في_خطر && ctx.المشاريع_المتأخرة === 0) return;

    sessionStorage.setItem('ai_last_analysis', today);

    // إظهار تنبيه ذكي في الـ FAB
    if (ctx.مشاريع_في_خطر > 0 || ctx.المشاريع_المتأخرة > 0) {
      const badge = document.getElementById('aiFabBadge');
      if (badge) { badge.style.display = 'block'; badge.textContent = ctx.مشاريع_في_خطر + ctx.المشاريع_المتأخرة; }
      // إشعار
      setTimeout(() => {
        Toast.warn(`🤖 SmartAI: ${ctx.مشاريع_في_خطر > 0 ? ctx.مشاريع_في_خطر + ' مشاريع في خطر!' : ''} ${ctx.المشاريع_المتأخرة > 0 ? ctx.المشاريع_المتأخرة + ' متأخرة' : ''} — اضغط على 🤖 للتحليل`);
      }, 3000);
    }
  }
};

/* ══════════════════════════════════════════════════════
   🛡️ SECURITY FIXES — إصلاح الثغرات الأمنية
══════════════════════════════════════════════════════ */

/* ── تعزيز Auth: منع Prototype Pollution ── */
/* ── تطبيق patch بعد تعريف SmartAI ── */
patchSmartAIWithSavedConfig();

(function secureDB() {
  const _set = DB.set.bind(DB);
  DB.set = function(key, val) {
    // تحقق من صحة المفتاح — منع حقن مفاتيح خطيرة
    if (typeof key !== 'string' || key.includes('__proto__') || key.includes('constructor') || key.includes('prototype')) {
      console.error('[Security] محاولة حقن مفتاح خطير مرفوضة:', key);
      return;
    }
    return _set(key, val);
  };
})();

/* ── تحقق من صلاحيات الصفحة الحساسة (Admin) ── */
(function secureAdminAccess() {
  const _navigate = App.navigate.bind(App);
  App.navigate = function(page, params) {
    if (page === 'admin') {
      const user = Auth.getUser();
      if (!user || !user.is_admin) {
        Toast.error('⛔ ليس لديك صلاحية الوصول إلى لوحة المسؤول');
        return _navigate('dashboard', {});
      }
      // تحقق إضافي من admin flag في session
      if (!sessionStorage.getItem('sbtp_admin_auth')) {
        Toast.error('⛔ جلسة المسؤول منتهية. أعد تسجيل الدخول');
        return _navigate('dashboard', {});
      }
    }
    return _navigate(page, params);
  };
})();

/* ── Rate Limiting للـ AI Chat ── */
const RateLimit = {
  counts: {},
  check(action, limit = 10, windowMs = 60000) {
    const now = Date.now();
    if (!this.counts[action]) this.counts[action] = [];
    this.counts[action] = this.counts[action].filter(t => now - t < windowMs);
    if (this.counts[action].length >= limit) return false;
    this.counts[action].push(now);
    return true;
  }
};

/* ── تحقق إضافي من المدخلات في نماذج التسجيل ── */
(function patchInputValidation() {
  const _doRegister = typeof doRegister === 'function' ? doRegister : null;
  if (!_doRegister) return;
  window.doRegister = function() {
    const email = document.getElementById('regEmail')?.value?.trim().toLowerCase() || '';
    const name = document.getElementById('regName')?.value?.trim() || '';
    const company = document.getElementById('regCompany')?.value?.trim() || '';
    const pass = document.getElementById('regPass')?.value || '';

    // تحقق من الإيميل
    const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRe.test(email)) {
      Toast.error('البريد الإلكتروني غير صالح');
      return;
    }
    // منع SQL/Script injection بسيط
    const forbiddenPatterns = [new RegExp('<scr'+'ipt', 'i'), /javascript:/i, /on\w+\s*=/i, /SELECT.*FROM/i, /DROP TABLE/i];
    const allInputs = [name, company, email];
    for (const inp of allInputs) {
      for (const pat of forbiddenPatterns) {
        if (pat.test(inp)) {
          Toast.error('⛔ المدخلات تحتوي على محتوى غير مسموح');
          return;
        }
      }
    }
    // كلمة مرور قوية
    if (pass.length < 8) { Toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    // استدعاء الدالة الأصلية
    return _doRegister();
  };
})();

/* ══════════════════════════════════════════════════════
   🤖 AI ANALYSIS PAGE — صفحة التحليل الذكي
══════════════════════════════════════════════════════ */
Pages.ai_analysis = function() {
  if (!Auth.getUser()) return layoutHTML('ai_analysis', 'تحليل AI', '<div class="empty"><div class="empty-icon">🔒</div><div class="empty-title">يجب تسجيل الدخول</div></div>');

  const ctx = SmartAI.getContext();
  const projects = DB.get('projects').filter(p => p.tenant_id === Auth.getUser().tenant_id && !p.is_archived);
  const txs = DB.get('transactions').filter(t => t.tenant_id === Auth.getUser().tenant_id);
  const workers = DB.get('workers').filter(w => w.tenant_id === Auth.getUser().tenant_id);

  // تحليل كل مشروع
  const projectInsights = projects.map(p => {
    const pRev = txs.filter(t => t.project_id === p.id && t.type === 'revenue').reduce((s, t) => s + Number(t.amount), 0);
    const pExp = txs.filter(t => t.project_id === p.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const budgetPct = p.budget > 0 ? Math.round(p.total_spent / p.budget * 100) : 0;
    const roi = pExp > 0 ? Math.round((pRev - pExp) / pExp * 100) : 0;
    let score = 100;
    const issues = [];
    if (budgetPct > 90) { score -= 30; issues.push({ icon: '🔴', text: `استهلاك الميزانية حرج: ${budgetPct}%` }); }
    else if (budgetPct > 70 && p.progress < 60) { score -= 20; issues.push({ icon: '🟡', text: `استهلاك مرتفع (${budgetPct}%) مع تقدم منخفض (${p.progress}%)` }); }
    if (p.status === 'delayed') { score -= 25; issues.push({ icon: '⏰', text: 'المشروع متأخر عن الجدول الزمني' }); }
    if (pRev > 0 && roi < 5) { score -= 15; issues.push({ icon: '💸', text: `هامش ربح منخفض جداً: ${roi}%` }); }
    if (p.progress < 10 && p.start_date && new Date(p.start_date) < new Date(Date.now() - 30 * 86400000)) { score -= 10; issues.push({ icon: '🐢', text: 'بداية متأخرة — التقدم أقل من المتوقع' }); }
    score = Math.max(0, score);
    const scoreClass = score >= 80 ? 'ai-score-excellent' : score >= 60 ? 'ai-score-good' : score >= 40 ? 'ai-score-warn' : 'ai-score-danger';
    const scoreLabel = score >= 80 ? 'ممتاز' : score >= 60 ? 'جيد' : score >= 40 ? 'يحتاج متابعة' : 'خطر';
    return { p, budgetPct, roi, score, scoreClass, scoreLabel, issues, pRev, pExp };
  });

  // توصيات شاملة
  const recommendations = [];
  const delayed = projects.filter(p => p.status === 'delayed');
  if (delayed.length > 0) recommendations.push({ icon: '🚨', priority: 'عالية', text: `${delayed.length} مشاريع متأخرة تحتاج تدخلاً فورياً: ${delayed.map(p => escHtml(p.name)).join('، ')}` });
  const overBudget = projects.filter(p => p.budget > 0 && p.total_spent > p.budget);
  if (overBudget.length > 0) recommendations.push({ icon: '💰', priority: 'عالية', text: `تجاوز الميزانية في: ${overBudget.map(p => escHtml(p.name)).join('، ')} — راجع عقود الموردين` });
  const revenue = txs.filter(t => t.type === 'revenue').reduce((s, t) => s + Number(t.amount), 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  if (revenue > 0 && (revenue - expense) / revenue < 0.1) recommendations.push({ icon: '📉', priority: 'متوسطة', text: 'هامش الربح الإجمالي أقل من 10% — راجع تسعير خدماتك' });
  if (workers.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const att = DB.get('attendance');
    const presentToday = att.filter(a => a.date === today && a.status === 'present').length;
    const rate = Math.round(presentToday / workers.length * 100);
    if (rate < 70) recommendations.push({ icon: '👷', priority: 'متوسطة', text: `معدل الحضور اليوم منخفض: ${rate}% — تحقق من غياب العمال` });
  }
  if (recommendations.length === 0) recommendations.push({ icon: '✅', priority: 'منخفضة', text: 'كل شيء يسير بشكل جيد — استمر في المتابعة اليومية' });

  return layoutHTML('ai_analysis', '🤖 تحليل AI', `
    <div class="ai-page-header">
      <div class="ai-page-icon">🤖</div>
      <div>
        <div style="font-size:1.3rem;font-weight:900;margin-bottom:.3rem">تحليل SmartAI الذكي</div>
        <div style="font-size:.85rem;color:var(--muted)">تحليل شامل لجميع مشاريعك مع توصيات فورية قابلة للتطبيق</div>
        <div style="font-size:.75rem;color:var(--dim);margin-top:.3rem">📅 ${new Date().toLocaleDateString('ar-DZ', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      </div>
      <div style="margin-right:auto">
        <button class="btn btn-purple btn-sm" onclick="SmartAI.toggleChat();SmartAI.quickAsk('أعطني تحليلاً شاملاً مفصلاً لجميع مشاريعي مع أهم التوصيات')">🤖 اسأل SmartAI</button>
      </div>
    </div>

    <!-- توصيات فورية -->
    <div class="card" style="margin-bottom:1.5rem;border-color:rgba(155,109,255,0.25)">
      <div style="font-size:.9rem;font-weight:900;margin-bottom:1rem;color:#B89AFF">🎯 التوصيات الفورية</div>
      ${recommendations.map(r => `
        <div class="ai-insight-item">
          <span class="ai-insight-icon">${r.icon}</span>
          <div>
            <div class="ai-insight-text">${r.text}</div>
            <div class="ai-insight-meta">الأولوية: ${r.priority}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- تحليل كل مشروع -->
    <div style="font-size:.9rem;font-weight:800;color:var(--muted);margin-bottom:.8rem">📊 تحليل المشاريع</div>
    <div class="ai-analysis-cards">
      ${projectInsights.length ? projectInsights.map(({ p, budgetPct, roi, score, scoreClass, scoreLabel, issues, pRev, pExp }) => `
        <div class="ai-analysis-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.8rem">
            <div style="font-weight:800;font-size:.9rem;flex:1">${escHtml(p.name)}</div>
            <div class="ai-project-score ${scoreClass}">${score}/100 — ${scoreLabel}</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:.78rem;margin-bottom:.8rem">
            <div style="color:var(--dim)">الميزانية المستهلكة</div><div style="font-weight:700;color:${budgetPct>80?'var(--red)':budgetPct>60?'var(--gold)':'var(--green)'}">${budgetPct}%</div>
            <div style="color:var(--dim)">التقدم</div><div style="font-weight:700">${p.progress}%</div>
            <div style="color:var(--dim)">العائد على الاستثمار</div><div style="font-weight:700;color:${roi>15?'var(--green)':roi>5?'var(--gold)':'var(--red)'}">${roi}%</div>
            <div style="color:var(--dim)">الربح الصافي</div><div style="font-weight:700;color:${pRev-pExp>=0?'var(--green)':'var(--red)'}">${((pRev-pExp)/1000000).toFixed(1)}M دج</div>
          </div>
          <div class="ai-analysis-title">الملاحظات:</div>
          ${issues.length ? issues.map(i => `
            <div class="ai-insight-item" style="padding:.3rem 0">
              <span class="ai-insight-icon">${i.icon}</span>
              <div class="ai-insight-text" style="font-size:.78rem">${i.text}</div>
            </div>
          `).join('') : `<div style="color:var(--green);font-size:.78rem">✅ المشروع في وضع ممتاز</div>`}
          <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:.7rem"
            onclick="SmartAI.toggleChat();SmartAI.quickAsk('حلّل مشروع ${escHtml(p.name)} بالتفصيل وأعطني خطة عمل محددة')">
            🤖 تحليل مفصّل
          </button>
        </div>
      `).join('') : `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🏗️</div><div class="empty-title">لا توجد مشاريع للتحليل</div></div>`}
    </div>

    <!-- إحصائيات عامة -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-top:1rem">
      <div class="stat-card" style="border-color:rgba(155,109,255,0.2)">
        <div class="stat-icon">🏆</div>
        <div class="stat-value" style="color:#9B6DFF">${projectInsights.filter(p=>p.score>=80).length}</div>
        <div class="stat-label">مشاريع ممتازة</div>
      </div>
      <div class="stat-card" style="border-color:rgba(232,184,75,0.2)">
        <div class="stat-icon">⚠️</div>
        <div class="stat-value" style="color:var(--gold)">${projectInsights.filter(p=>p.score>=40&&p.score<80).length}</div>
        <div class="stat-label">تحتاج متابعة</div>
      </div>
      <div class="stat-card" style="border-color:rgba(240,78,106,0.2)">
        <div class="stat-icon">🚨</div>
        <div class="stat-value" style="color:var(--red)">${projectInsights.filter(p=>p.score<40).length}</div>
        <div class="stat-label">في خطر</div>
      </div>
      <div class="stat-card" style="border-color:rgba(52,195,143,0.2)">
        <div class="stat-icon">📈</div>
        <div class="stat-value" style="color:var(--green);font-size:1rem">${projectInsights.length>0?Math.round(projectInsights.reduce((s,p)=>s+p.score,0)/projectInsights.length):0}</div>
        <div class="stat-label">متوسط الدرجة</div>
      </div>
    </div>
  `);
};

/* ══════════════════════════════════════════════════════
   إضافة AI Analysis للـ Sidebar وإصلاح التنقل
══════════════════════════════════════════════════════ */
(function patchSidebar() {
  const originalLayoutHTML = typeof layoutHTML === 'function' ? layoutHTML : null;
  // إضافة AI Analysis لقائمة الصفحات الصالحة
  const origHash = (function() {
    const hash = window.location.hash.replace('#', '').trim();
    return hash;
  })();
  if (origHash === 'ai_analysis') App.currentPage = 'ai_analysis';
})();

/* ── تهيئة SmartAI بعد تحميل الصفحة ── */
document.addEventListener('DOMContentLoaded', function() {

  // ─── تشغيل Auto-Sync تلقائياً عند التحميل ───
  const autoSyncEnabled = localStorage.getItem('sbtp_auto_sync') !== 'false';
  if (autoSyncEnabled && typeof DBHybrid !== 'undefined' && typeof SUPABASE_CONFIG !== 'undefined') {
    if (SUPABASE_CONFIG.isConfigured) {
      // الـ heartbeat يبدأ تلقائياً في initSupabase()
      // لكن نضمن هنا أنه مُشغَّل دائماً
      setTimeout(() => {
        if (DBHybrid._useSupabase && !DBHybrid._heartbeatTimer) {
          DBHybrid._startHeartbeat();
          DBHybrid._setupNetworkEvents();
          console.log('🔄 Auto-sync: Heartbeat تم تشغيله تلقائياً');
        }
      }, 2000);
    }
  }

  // إظهار زر AI فقط عند تسجيل الدخول
  function updateAIFabVisibility() {
    const fab = document.getElementById('aiFab');
    if (!fab) return;
    const user = Auth.getUser();
    fab.style.display = user && !user.is_admin ? 'flex' : 'none';
    if (user && !user.is_admin) {
      setTimeout(() => SmartAI.autoAnalyze(), 2000);
    }
  }
  updateAIFabVisibility();
  // مراقبة تغيير حالة المستخدم
  const origAuthLoad = Auth.load.bind(Auth);
  Auth.load = function() {
    origAuthLoad();
    setTimeout(updateAIFabVisibility, 100);
  };
});

/* ── Rate limit على إرسال AI ── */
(function patchAISend() {
  const orig = SmartAI.send.bind(SmartAI);
  SmartAI.send = async function() {
    if (!RateLimit.check('ai_chat', 20, 60000)) {
      Toast.warn('⚠️ أرسلت رسائل كثيرة جداً، انتظر دقيقة');
      return;
    }
    return orig();
  };
})();

/* ─── UPSELL MODAL FUNCTION ─── */
function showUpsellModal(feature) {
  const plans = DB.get('plans') || [];
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="upsell-modal" style="width:90%;max-width:480px">
      <div class="upsell-icon">🚀</div>
      <div class="upsell-title">ارقِ خطتك</div>
      <div class="upsell-desc">لقد وصلت للحد الأقصى لـ <strong>${escHtml(feature||'هذه الميزة')}</strong> في خطتك الحالية.<br>ارقِ للاستمتاع بإمكانيات غير محدودة.</div>
      <div class="plan-compare-grid">
        ${plans.slice(0,3).map((p,i)=>`
          <div class="plan-card-mini ${i===1?'featured':''}">
            <div class="plan-card-mini-name">${escHtml(p.name)}</div>
            <div class="plan-card-mini-price">${p.price_monthly||'0'} دج</div>
            <div class="plan-card-mini-limit">حتى ${p.max_projects||'∞'} مشروع</div>
          </div>
        `).join('')}
      </div>
      <div style="display:flex;gap:.7rem;justify-content:center">
        <button class="btn btn-gold" onclick="App.navigate('settings');this.closest('.modal-overlay').remove()">⬆️ ترقية الآن</button>
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">لاحقاً</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

/* ─── ONBOARDING WIZARD ─── */
function checkOnboarding() {
  const user = Auth.getUser();
  if (!user || user.is_admin) return;
  const tid = user.tenant_id;
  // يظهر الـ Onboarding مرة واحدة فقط لكل حساب جديد.
  // إذا ضغط المستخدم "تخطي" أو أكمل الخطوات، لن يظهر مجدداً لنفس المؤسسة.
  const done = localStorage.getItem('sbtp_onboarded_'+tid);
  if (done) return;
  const shownOnce = localStorage.getItem('sbtp_onboarding_shown_'+tid);
  if (shownOnce) return;
  const projects = DB.get('projects').filter(p=>p.tenant_id===tid);
  const workers = DB.get('workers').filter(w=>w.tenant_id===tid);
  const txs = DB.get('transactions').filter(t=>t.tenant_id===tid);
  if (projects.length > 0 && workers.length > 0 && txs.length > 0) {
    localStorage.setItem('sbtp_onboarded_'+tid, '1');
    return;
  }
  // ضع علامة أنه تم عرضه حتى لا يتكرر في كل تنقل/تحديث.
  localStorage.setItem('sbtp_onboarding_shown_'+tid, '1');
  showOnboardingWizard(projects.length, workers.length, txs.length);
}

function showOnboardingWizard(hasProjects, hasWorkers, hasTxs) {
  // ── الخطوات الكاملة دائماً بغض النظر عن البيانات الموجودة ──
  const STEPS = [
    {
      icon: '🏢',
      title: 'مرحباً بك في SmartStruct!',
      desc: 'منصة إدارة شاملة لشركات المقاولة الجزائرية. سنريك أهم الميزات في 30 ثانية.',
      action: null,
      actionLabel: null
    },
    {
      icon: '🏗️',
      title: 'تتبع مشاريعك بدقة',
      desc: 'أضف مشاريعك وتابع ميزانيتها وتقدمها ومواعيدها من مكان واحد. مدعوم بمخططات Gantt وKanban.',
      action: () => App.navigate('projects'),
      actionLabel: 'إضافة مشروع ←'
    },
    {
      icon: '👷',
      title: 'إدارة العمال والرواتب',
      desc: 'سجّل حضور عمالك يومياً، تتبع الوقت الإضافي، وأصدر كشوف الرواتب تلقائياً بنقرة واحدة.',
      action: () => App.navigate('workers'),
      actionLabel: 'إضافة عمال ←'
    },
    {
      icon: '💰',
      title: 'التحليل المالي الذكي',
      desc: 'راقب إيراداتك ومصاريفك، واحصل على توقعات السيولة لـ 90 يوماً قادمة مع تنبيهات استباقية.',
      action: () => App.navigate('transactions'),
      actionLabel: 'إضافة معاملة ←'
    },
    {
      icon: '🤖',
      title: 'مساعد ذكاء اصطناعي',
      desc: 'اسأل SmartAI عن أي شيء في مشاريعك — يحلل بياناتك ويكتب تقارير شهرية بالعربية مع توصيات.',
      action: null,
      actionLabel: null
    },
    {
      icon: '✅',
      title: 'كل شيء جاهز!',
      desc: 'منصتك مكتملة ومتوافقة مع القانون الجزائري (NIF/NIS/RC + TVA 19%). انطلق الآن!',
      action: null,
      actionLabel: null
    }
  ];

  const TOTAL = STEPS.length;
  let currentStep = 0; // نبدأ من الخطوة الأولى دائماً

  function _dismissOnboarding() {
    const u = Auth.getUser();
    const tid = u?.tenant_id;
    if (tid) {
      localStorage.setItem('sbtp_onboarded_' + tid, '1');
      localStorage.setItem('sbtp_onboarding_shown_' + tid, '1');
    }
    const el = document.getElementById('onboardOverlay');
    if (el) el.remove();
  }

  function _renderStep(idx) {
    const s = STEPS[idx];
    const pct = Math.round((idx / (TOTAL - 1)) * 100);
    const isLast = idx === TOTAL - 1;
    const isFirst = idx === 0;

    const dotsHTML = STEPS.map((_, i) =>
      `<div class="onboard-dot ${i < idx ? 'done' : i === idx ? 'active' : ''}"></div>`
    ).join('');

    const card = document.getElementById('onboardCard');
    if (!card) return;

    card.innerHTML = `
      <button class="onboard-close" onclick="window._onboardDismiss()" title="إغلاق">✕</button>
      <div class="onboard-step-dots">${dotsHTML}</div>
      <div class="onboard-progress">
        <div class="onboard-progress-fill" style="width:${pct}%;transition:width .4s ease"></div>
      </div>
      <div style="text-align:center;padding:.5rem 0">
        <div style="font-size:3rem;margin-bottom:.8rem;line-height:1">${s.icon}</div>
        <div style="font-size:1.25rem;font-weight:900;margin-bottom:.6rem;color:var(--text)">${s.title}</div>
        <div style="font-size:.9rem;color:var(--muted);margin-bottom:1.8rem;line-height:1.75;min-height:60px">${s.desc}</div>
        <div style="display:flex;gap:.7rem;justify-content:center;flex-wrap:wrap">
          ${!isFirst ? `<button class="btn btn-ghost btn-lg" onclick="window._onboardPrev()">← السابق</button>` : ''}
          ${s.action ? `<button class="btn btn-ghost btn-sm" style="align-self:center" onclick="window._onboardDismiss();(${s.action.toString()})()">${s.actionLabel}</button>` : ''}
          ${isLast
            ? `<button class="btn btn-gold btn-lg" onclick="window._onboardDismiss()">انطلق الآن 🚀</button>`
            : `<button class="btn btn-gold btn-lg" onclick="window._onboardNext()">التالي ←</button>`
          }
        </div>
        <div style="font-size:.72rem;color:var(--dim);margin-top:1.2rem">${idx + 1} من ${TOTAL}</div>
      </div>
    `;
  }

  // ربط الدوال بـ window حتى تعمل من داخل innerHTML
  window._onboardNext = function() {
    if (currentStep < TOTAL - 1) { currentStep++; _renderStep(currentStep); }
  };
  window._onboardPrev = function() {
    if (currentStep > 0) { currentStep--; _renderStep(currentStep); }
  };
  window._onboardDismiss = _dismissOnboarding;

  // بناء الـ overlay
  const overlay = document.createElement('div');
  overlay.className = 'onboard-overlay';
  overlay.id = 'onboardOverlay';
  overlay.innerHTML = `<div class="onboard-card" id="onboardCard" style="position:relative"></div>`;
  document.body.appendChild(overlay);

  // رسم الخطوة الأولى
  _renderStep(0);
}

// ── قراءة الصفحة المطلوبة من URL hash (مثل #admin) — قبل Auth.load ──
(function(){
  const hash = window.location.hash.replace('#','').trim();
  const validPages = ['admin','dashboard','projects','workers','transactions','reports','settings',
    'attendance','salary','invoices','inventory','equipment','materials','documents',
    'analytics','kanban','gantt','compare','calendar','map','simulator','bank_report',
    'audit_log','obligations','team','ai_analysis','dz_documents'];
  if (hash && validPages.includes(hash)) {
    App.currentPage = hash;
  }
  if (hash) history.replaceState(null, '', window.location.pathname);
})();
Auth.load();

// ── التحقق الفوري من حالة المؤسسة في Supabase عند تحميل الصفحة ──
// هذا يضمن أن الإيقاف من لوحة التحكم يُطبَّق فوراً حتى بعد تحديث الصفحة
async function checkTenantStatusFromSupabase() {
  try {
    const user = Auth.getUser();
    if (!user || user.is_admin || !user.tenant_id) return; // المسؤول لا يخضع لهذا الفحص

    let sbUrl = '', sbKey = '';
    if (typeof SUPABASE_HARDCODED !== 'undefined' && SUPABASE_HARDCODED.url) {
      sbUrl = SUPABASE_HARDCODED.url;
      sbKey = SUPABASE_HARDCODED.anonKey;
    } else {
      const saved = JSON.parse(localStorage.getItem('sbtp_supabase_config') || '{}');
      sbUrl = saved.url || ''; sbKey = saved.anonKey || '';
    }
    if (!sbUrl || !sbKey) return;

    const sbH = { 'Content-Type':'application/json', 'apikey':sbKey, 'Authorization':`Bearer ${sbKey}` };

    // جلب حالة المؤسسة مباشرة من Supabase
    const tRes = await fetch(`${sbUrl}/rest/v1/tenants?id=eq.${user.tenant_id}&select=id,is_active,subscription_status`, { headers: sbH });
    if (!tRes.ok) return;
    const tArr = await tRes.json();
    if (!tArr.length) return;

    const tenant = tArr[0];

    // إذا كانت المؤسسة غير نشطة → تسجيل خروج فوري
    if (tenant.is_active === false) {
      // تحديث localStorage ليتطابق مع Supabase
      const localTenants = DB.get('tenants');
      const idx = localTenants.findIndex(t => t.id === tenant.id);
      if (idx > -1) { localTenants[idx].is_active = false; DB.set('tenants', localTenants); }

      Auth.currentUser = null;
      sessionStorage.removeItem('sbtp_user');
      Toast.error('⛔ تم إيقاف حسابك من قِبل المسؤول. يرجى التواصل مع الدعم.');
      setTimeout(() => App.navigate('login'), 1500);
    } else {
      // تحديث localStorage بالحالة الحديثة من Supabase
      const localTenants = DB.get('tenants');
      const idx = localTenants.findIndex(t => t.id === tenant.id);
      if (idx > -1) { localTenants[idx].is_active = true; DB.set('tenants', localTenants); }
    }
  } catch(e) {
    console.warn('checkTenantStatusFromSupabase failed:', e);
  }
}

// تشغيل الفحص بعد تحميل الصفحة
setTimeout(checkTenantStatusFromSupabase, 800);

// Apply saved language direction
(function(){
  const lang = localStorage.getItem('sbtp_lang')||'ar';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang==='ar'?'rtl':'ltr';
  I18N.currentLang = lang;
})();


// ── مؤشر اتصال Supabase (يعمل طالما الصفحة مفتوحة) ──
function setupConnBadge() {
  const el = document.getElementById('sbConnBadge');
  if (!el) return;

  function renderBadge() {
    try {
      const st = (typeof DBHybrid !== 'undefined' && DBHybrid.connectionState) ? DBHybrid.connectionState : null;
      if (!st || !st.configured) {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'block';

      const online = st.online;
      const using = st.usingSupabase;
      const ok = st.lastHeartbeatOk;

      const label = (!online) ? 'غير متصل بالإنترنت'
                  : (using && ok) ? 'Supabase: متصل'
                  : 'Supabase: محاولة اتصال...';

      el.textContent = label;

      // لون بسيط حسب الحالة
      el.style.background = (!online) ? '#7a1f1f' : (using && ok) ? '#145a2a' : '#6b4a00';
    } catch {
      el.style.display = 'none';
    }
  }

  renderBadge();
  setInterval(renderBadge, 2000);

  // إعادة تحديث فور تغيّر الشبكة
  window.addEventListener('online', renderBadge);
  window.addEventListener('offline', renderBadge);
}

// ── تشغيل التطبيق مع معالجة الأخطاء ──
(function bootApp() {
  try {
    App.render();
    setupConnBadge();
    // إخفاء شاشة التحميل بعد نجاح التشغيل
    const __ldr = document.getElementById('appLoader');
    if (__ldr) __ldr.style.display = 'none';
  } catch(e) {
    console.error('❌ SmartStruct Boot Error:', e);
    // عرض رسالة خطأ واضحة بدلاً من شاشة فارغة
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="
          min-height:100vh;display:flex;flex-direction:column;
          align-items:center;justify-content:center;
          background:#060A10;color:#EDF2F7;
          font-family:'Tajawal',sans-serif;text-align:center;padding:2rem;
        ">
          <div style="font-size:3rem;margin-bottom:1rem">⚠️</div>
          <h2 style="color:#E8B84B;margin-bottom:0.5rem">خطأ في تحميل التطبيق</h2>
          <p style="color:#8892A4;margin-bottom:1.5rem;max-width:400px">
            ${e.message}
          </p>
          <button onclick="location.reload()" style="
            background:#E8B84B;color:#060A10;border:none;
            padding:0.7rem 2rem;border-radius:10px;
            font-family:'Tajawal',sans-serif;font-size:1rem;
            font-weight:700;cursor:pointer;
          ">🔄 إعادة التحميل</button>
          <details style="margin-top:1rem;color:#4A5B7A;font-size:0.75rem;max-width:600px;text-align:right">
            <summary style="cursor:pointer;color:#8892A4">تفاصيل الخطأ</summary>
            <pre style="white-space:pre-wrap;margin-top:0.5rem">${e.stack}</pre>
          </details>
        </div>`;
    }
  }
})();
setTimeout(() => { if (Auth.getUser()) checkOnboarding(); }, 500);
// Auto-run simulator if on simulator page
document.addEventListener('DOMContentLoaded', () => {
  if (App.currentPage === 'simulator') runSimulator();
});
(function(){
  let touchTask = null, touchClone = null, lastCol = null;
  function getColFromPoint(x, y) {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      const col = el.closest('.kanban-col-v5');
      if (col) return col;
    }
    return null;
  }
  document.addEventListener('touchstart', function(e) {
    const card = e.target.closest('.kanban-task-card');
    if (!card) return;
    touchTask = card;
    touchClone = card.cloneNode(true);
    touchClone.style.cssText = 'position:fixed;z-index:9999;opacity:0.85;pointer-events:none;width:' + card.offsetWidth + 'px;transform:rotate(3deg) scale(1.03);box-shadow:0 16px 40px rgba(0,0,0,0.5)';
    document.body.appendChild(touchClone);
    card.style.opacity = '0.3';
  }, {passive:true});
  document.addEventListener('touchmove', function(e) {
    if (!touchClone) return;
    e.preventDefault();
    const t = e.touches[0];
    touchClone.style.left = (t.clientX - touchClone.offsetWidth/2) + 'px';
    touchClone.style.top = (t.clientY - 30) + 'px';
    const col = getColFromPoint(t.clientX, t.clientY);
    document.querySelectorAll('.kanban-col-v5').forEach(c => c.classList.remove('drag-over'));
    if (col) { col.classList.add('drag-over'); lastCol = col; }
  }, {passive:false});
  document.addEventListener('touchend', function(e) {
    if (!touchTask || !touchClone) return;
    if (touchClone) touchClone.remove();
    touchClone = null;
    if (touchTask) touchTask.style.opacity = '';
    if (lastCol) {
      lastCol.classList.remove('drag-over');
      const colKey = lastCol.dataset.col;
      const taskId = parseInt(touchTask.dataset.taskId);
      if (colKey && taskId) {
        const tasks = DB.get('kanban_tasks');
        const idx = tasks.findIndex(t => t.id === taskId);
        if (idx >= 0 && tasks[idx].col !== colKey) {
          tasks[idx].col = colKey;
          DB.set('kanban_tasks', tasks);
          Toast.show('✅ تم نقل المهمة', 'success');
          App.navigate('kanban');
        }
      }
    }
    touchTask = null; lastCol = null;
  }, {passive:true});
})();


// ════════════════════════════════════════════════════════════════════
//  📂 دوال سجل الوثائق المولَّدة (dz_generated_docs)
// ════════════════════════════════════════════════════════════════════

window.dzsDelete = function(id) {
  const msg = typeof L === 'function'
    ? L('حذف هذه الوثيقة من السجل؟', 'Supprimer ce document du registre ?')
    : 'Supprimer ?';
  if (!confirm(msg)) return;
  const docs = (DB.get('dz_generated_docs') || []).filter(d => d.id !== id);
  DB.set('dz_generated_docs', docs);
  App.navigate('invoices');
};

window.dzsClearAll = function() {
  const msg = typeof L === 'function'
    ? L('مسح جميع الوثائق المحفوظة؟ لا يمكن التراجع.', 'Effacer tout l\'historique ? Irréversible.')
    : 'Effacer tout ?';
  if (!confirm(msg)) return;
  const tid = Auth.getUser()?.tenant_id;
  const remaining = (DB.get('dz_generated_docs') || []).filter(d => d.tenant_id !== tid);
  DB.set('dz_generated_docs', remaining);
  App.navigate('invoices');
};

// فتح النموذج مع ملء الحقول بالبيانات المحفوظة
window.dzsReopen = function(id) {
  const doc = (DB.get('dz_generated_docs') || []).find(d => d.id === id);
  if (!doc || !doc.doc_type) return;
  if (typeof DZDocsUI === 'undefined') { alert('DZDocsUI not loaded'); return; }
  DZDocsUI.open(doc.doc_type);
  setTimeout(() => {
    const fields = doc.fields || {};
    Object.keys(fields).forEach(fid => {
      const el = document.getElementById(fid);
      if (el && fields[fid] !== undefined) el.value = fields[fid];
    });
  }, 160);
};

// إعادة طباعة: فتح النموذج + ملء الحقول + ضغط توليد تلقائياً
window.dzsReprint = function(id) {
  const doc = (DB.get('dz_generated_docs') || []).find(d => d.id === id);
  if (!doc || !doc.doc_type) return;
  if (typeof DZDocsUI === 'undefined') { alert('DZDocsUI not loaded'); return; }
  DZDocsUI.open(doc.doc_type);
  setTimeout(() => {
    const fields = doc.fields || {};
    Object.keys(fields).forEach(fid => {
      const el = document.getElementById(fid);
      if (el && fields[fid] !== undefined) el.value = fields[fid];
    });
    setTimeout(() => {
      const btn = document.getElementById('dzdGenerateBtn');
      if (btn) btn.click();
    }, 130);
  }, 170);
};

// تصدير PDF مباشر (نفس منطق إعادة الطباعة لكنه يُنتج PDF تلقائياً)
window.dzsPrintPDF = function(id) {
  // نفس آلية dzsReprint — يُفعّل توليد PDF عبر زر التوليد
  window.dzsReprint(id);
};
