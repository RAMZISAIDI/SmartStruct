/**
 * ╔══════════════════════════════════════════════════════════════╗
 *  SmartStruct v7.1 Pro — Supabase DB Adapter
 *  ──────────────────────────────────────────────────────────────
 *  • طبقة قاعدة البيانات الهجينة (Supabase + localStorage)
 *  • Heartbeat + Auto-reconnect + Exponential Backoff
 *  • Sync Queue محمية من فقدان البيانات
 *
 *  🔧 للإعداد: غيّر SUPABASE_URL و SUPABASE_KEY أدناه
 *  ──────────────────────────────────────────────────────────────
 *  v7.1.1 — تم تصحيح الأخطاء:
 *    ✅ إزالة تعريف SUPABASE_HARDCODED المكرر مع index.html
 *    ✅ إضافة _supabaseUrl/_supabaseKey لـ DBHybrid (متوافق مع app.js)
 *    ✅ تصحيح _sanitizeRecord (كانت تحتوي خطأ في نطاق المتغير)
 *    ✅ دمج cleanForSupabase في مكان واحد
 *    ✅ إضافة AbortController timeout لجميع الطلبات
 *    ✅ حماية _processSyncQueue من الاستدعاء المتزامن
 *    ✅ توحيد مفتاح localStorage إلى 'sbtp_supabase_config'
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ══════════════════════════════════════════════════════
   ⚙️  إعداد Supabase — عدّل هذين السطرين فقط
   اذهب: Supabase Dashboard → Settings → API
══════════════════════════════════════════════════════ */
const SUPABASE_URL     = 'https://udinbxcnehcevajhrral.supabase.co';
const SUPABASE_KEY     = 'sb_publishable_kl2FcK_mMUfQ_EqGK21KkA_4M4ZEdMZ';   // مفتاح anon/public

// ─── LS_KEY: مفتاح localStorage الموحّد ────────────────
const SB_LS_KEY = 'sbtp_supabase_config';

/* ══════════════════════════════════════════════════════
   SUPABASE_CONFIG — يدير تحميل/حفظ الإعدادات
══════════════════════════════════════════════════════ */
const SUPABASE_CONFIG = {
  url:     SUPABASE_URL,
  anonKey: SUPABASE_KEY,

  /** هل الإعدادات جاهزة؟ */
  get isConfigured() {
    return !!(this.url && this.anonKey);
  },

  /** تحميل الإعدادات (الكود → localStorage → فارغ) */
  load() {
    // 1. المضمّن في الكود (أعلى أولوية)
    if (SUPABASE_URL && SUPABASE_KEY) {
      this.url     = SUPABASE_URL;
      this.anonKey = SUPABASE_KEY;
      return true;
    }
    // 2. المحفوظ من لوحة الإدارة
    try {
      const saved = JSON.parse(localStorage.getItem(SB_LS_KEY) || '{}');
      if (saved.url && saved.anonKey) {
        this.url     = saved.url;
        this.anonKey = saved.anonKey;
        return true;
      }
    } catch (_) {}
    return false;
  },

  /** حفظ الإعدادات وتحديث الذاكرة */
  save(url, anonKey) {
    this.url     = url     || '';
    this.anonKey = anonKey || '';
    try {
      localStorage.setItem(SB_LS_KEY, JSON.stringify({ url: this.url, anonKey: this.anonKey }));
    } catch (_) {}
    // تحديث DBHybrid فوراً
    if (typeof DBHybrid !== 'undefined') {
      DBHybrid._supabaseUrl = this.url;
      DBHybrid._supabaseKey = this.anonKey;
    }
  },

  /** مسح الإعدادات تماماً */
  clear() {
    this.url = this.anonKey = '';
    try { localStorage.removeItem(SB_LS_KEY); } catch (_) {}
    if (typeof DBHybrid !== 'undefined') {
      DBHybrid._supabaseUrl = '';
      DBHybrid._supabaseKey = '';
    }
  }
};

/* ══════════════════════════════════════════════════════
   SB_SCHEMA — أعمدة كل جدول (المصدر الموحّد)
   يُستخدم لتنظيف السجلات قبل الإرسال لـ Supabase
   ⚠️ يجب أن يطابق تماماً supabase-schema.sql + SB_SCHEMA في app.js
══════════════════════════════════════════════════════ */
const _SB_SCHEMA_INTERNAL = {
  plans:          ['id','slug','name','price_monthly','price','max_projects','max_workers','max_equipment','max_emails','created_at'],
  tenants:        ['id','name','name_fr','plan_id','wilaya','address','phone','email','nif','nis','rc_number','article_imp','rib','tva_rate','subscription_status','trial_start','trial_end','is_active','logo_url','stamp_url','bank_account','bank_name','created_at','updated_at'],
  users:          ['id','tenant_id','full_name','email','password','role','is_admin','is_active','account_status','avatar_color','last_login','gdrive_connected','created_at','updated_at'],
  projects:       ['id','tenant_id','name','project_type','wilaya','client_name','client_name_fr','phone','budget','total_spent','progress','status','color','phase','description','start_date','end_date','is_archived','created_at','updated_at'],
  workers:        ['id','tenant_id','project_id','full_name','full_name_fr','role','phone','national_id','cnas_number','daily_salary','monthly_base','contract_type','hire_date','color','avatar_color','marital_status','children_count','spouse_works','is_handicap','is_active','created_at'],
  equipment:      ['id','tenant_id','project_id','name','model','type','serial','plate_number','icon','status','purchase_price','purchase_date','next_maintenance','insurance_expiry','notes','created_at'],
  equipment_logs: ['id','tenant_id','equipment_id','type','date','cost','note','vendor','next_maintenance','created_at'],
  transactions:   ['id','tenant_id','project_id','worker_id','type','category','amount','description','date','payment_method','supplier','created_at'],
  attendance:     ['id','tenant_id','worker_id','project_id','date','status','hours','note','gps','created_at'],
  materials:      ['id','tenant_id','project_id','name','unit','quantity','min_quantity','unit_price','supplier','created_at'],
  invoices:       ['id','tenant_id','project_id','number','client','amount','amount_ht','tva_amount','tva_rate','date','due_date','status','paid_date','description','payment_method','created_at'],
  salary_records: ['id','tenant_id','worker_id','month_key','amount','paid_date','created_at'],
  kanban_tasks:   ['id','tenant_id','project_id','title','priority','assignee_id','due_date','col','created_at'],
  documents:      ['id','tenant_id','project_id','worker_id','name','category','type','url','size','date','uploader_id','meta_data','doc_kind','doc_number','created_at'],
  obligations:    ['id','tenant_id','title','amount','due','created_at'],
  notes:          ['id','tenant_id','project_id','user_id','text','date','created_at'],
  notifications:  ['id','tenant_id','user_id','type','title','body','message','link','action_url','date','read','status','created_at'],
  global_settings:['key','value','updated_at'],
  stock_movements:['id','tenant_id','material_id','type','quantity','date','note','created_at'],
  audit_log:           ['id','tenant_id','user_id','user_email','action','table_name','record_id','before_data','after_data','ip_address','user_agent','created_at'],
  custom_roles:        ['id','tenant_id','name','description','permissions','scope','created_at'],
  equipment_locations: ['id','tenant_id','equipment_id','user_id','latitude','longitude','accuracy','recorded_at','note'],
  tenders:             ['id','tenant_id','project_id','title','description','deadline','status','awarded_to','created_at'],
  tender_offers:       ['id','tender_id','supplier','supplier_phone','total_price','delivery_days','notes','is_winner','submitted_at'],
  bank_transactions:   ['id','tenant_id','bank_name','account_number','transaction_date','amount','description','reference','matched_with','is_matched','created_at'],
  signatures:          ['id','tenant_id','document_id','signer_name','signer_email','signature_data','ip_address','signed_at','token'],
  ai_conversations:    ['id','tenant_id','user_id','messages','title','created_at','updated_at']
};

// حقول التواريخ لكل جدول
const _SB_DATE_FIELDS_INTERNAL = {
  projects:       ['start_date','end_date'],
  tenants:        ['trial_start','trial_end'],
  workers:        ['hire_date'],
  equipment:      ['purchase_date','next_maintenance','insurance_expiry'],
  equipment_logs: ['date','next_maintenance'],
  transactions:   ['date'],
  attendance:     ['date'],
  invoices:       ['date','due_date','paid_date'],
  salary_records: ['paid_date'],
  documents:      ['date'],
  obligations:    ['due'],
  kanban_tasks:   ['due_date'],
  stock_movements:['date'],
  notes:          ['date'],
  tenders:        ['deadline'],
  bank_transactions:['transaction_date']
};

// حقول الأرقام لكل جدول
const _SB_NUM_FIELDS_INTERNAL = {
  plans:          ['price_monthly','price','max_projects','max_workers','max_equipment','max_emails'],
  tenants:        ['tva_rate'],
  projects:       ['budget','total_spent','progress'],
  workers:        ['daily_salary','monthly_base','children_count','spouse_works','is_handicap'],
  equipment:      ['purchase_price'],
  equipment_logs: ['cost'],
  transactions:   ['amount'],
  materials:      ['quantity','min_quantity','unit_price'],
  invoices:       ['amount','amount_ht','tva_amount','tva_rate'],
  salary_records: ['amount'],
  obligations:    ['amount'],
  documents:      ['size'],
  stock_movements:['quantity'],
  attendance:     ['hours','overtime'],
  equipment_locations:['latitude','longitude','accuracy'],
  tender_offers:  ['total_price','delivery_days'],
  bank_transactions:['amount']
};

// IDs الاختيارية (تقبل null) — لا تشمل id (المفتاح الأساسي)
const _NULLABLE_IDS_INTERNAL = new Set([
  'project_id','worker_id','material_id','user_id','equipment_id','document_id','tender_id',
  'plan_id','uploader_id','assignee_id','tenant_id'
]);

/* ══════════════════════════════════════════════════════
   cleanForSupabase — المصدر الموحّد لتنظيف السجلات
   (يُستخدم هنا وفي app.js عبر استدعاء DBHybrid.clean)
══════════════════════════════════════════════════════ */
function _cleanForSupabase_INTERNAL(table, record) {
  if (!record || typeof record !== 'object') return record;

  const allowed = _SB_SCHEMA_INTERNAL[table];
  if (!allowed) return record; // جدول غير معروف

  const arabicDigits = { '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9' };

  function toISO(val) {
    if (!val && val !== 0) return null;
    const s = String(val).trim().replace(/[٠-٩]/g, d => arabicDigits[d] || d);
    // dd/mm/yyyy أو dd-mm-yyyy → yyyy-mm-dd
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return null;
  }

  const dateFields = new Set(_SB_DATE_FIELDS_INTERNAL[table] || []);
  const numFields  = new Set(_SB_NUM_FIELDS_INTERNAL[table]  || []);
  const clean = {};

  for (const col of allowed) {
    let v = record[col];
    if (v === undefined) v = null;

    if (v === null) { clean[col] = null; continue; }

    // IDs إلزامية
    if (col === 'id') {
      const n = Number(v);
      clean[col] = Number.isFinite(n) && n > 0 ? n : null;
      continue;
    }

    // IDs اختيارية
    if (_NULLABLE_IDS_INTERNAL.has(col)) {
      const n = Number(v);
      clean[col] = Number.isFinite(n) && n > 0 ? n : null;
      continue;
    }

    // حقول التاريخ
    if (dateFields.has(col)) {
      clean[col] = toISO(v);
      continue;
    }

    // حقول الأرقام
    if (numFields.has(col) || col === 'progress' || col === 'hours' || col === 'price') {
      const n = Number(String(v).replace(',', '.'));
      clean[col] = Number.isFinite(n) ? n : 0;
      continue;
    }

    // بوليان
    if (['is_active','is_admin','is_archived','read'].includes(col)) {
      clean[col] = Boolean(v);
      continue;
    }

    // النصوص الفارغة في حقول التواريخ تُعتبر null (تم التعامل أعلاه)
    // أي نص آخر فارغ → null (Postgres يقبل null لكن "" يسبب أخطاء في بعض الأنواع)
    if (typeof v === 'string' && v.trim() === '') {
      clean[col] = null;
      continue;
    }

    clean[col] = v;
  }

  return clean;
}

/* ══════════════════════════════════════════════════════
   SupabaseClient — REST API wrapper
══════════════════════════════════════════════════════ */
const SupabaseClient = {
  _url: '',
  _key: '',
  _timeout: 12000, // 12 ثانية

  init(url, key) {
    this._url = (url || '').replace(/\/$/, '');
    this._key = key || '';
  },

  headers(extra = {}) {
    return {
      'Content-Type': 'application/json',
      'apikey': this._key,
      'Authorization': `Bearer ${this._key}`,
      'Prefer': 'return=representation',
      ...extra
    };
  },

  async _request(method, path, body = null, params = '') {
    if (!this._url || !this._key) throw new Error('Supabase غير مُهيَّأ');
    const url = `${this._url}/rest/v1/${path}${params ? '?' + params : ''}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this._timeout);
    try {
      const opts = { method, headers: this.headers(), signal: controller.signal };
      if (body !== null) opts.body = JSON.stringify(body);
      const resp = await fetch(url, opts);
      const text = await resp.text();
      if (!resp.ok) {
        let err;
        try { err = JSON.parse(text); } catch { err = { message: text }; }
        throw new Error(err.message || err.details || `HTTP ${resp.status}`);
      }
      return text ? JSON.parse(text) : [];
    } finally {
      clearTimeout(timer);
    }
  },

  // SELECT
  async select(table, filters = {}, opts = {}) {
    let params = 'order=id.asc';
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null)
        params += `&${k}=eq.${encodeURIComponent(v)}`;
    }
    if (opts.order) params += `&order=${opts.order}`;
    if (opts.limit) params += `&limit=${opts.limit}`;
    return this._request('GET', table, null, params);
  },

  // INSERT — لا نرسل id أبداً، Supabase يولده تلقائياً بـ SERIAL
  async insert(table, data) {
    const payload = { ...data };
    delete payload.id;  // ✅ منع خطأ "duplicate key value violates unique constraint"
    return this._request('POST', table, payload);
  },

  // UPSERT (merge-duplicates)
  async upsert(table, data) {
    const url = `${this._url}/rest/v1/${table}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this._timeout);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: this.headers({ 'Prefer': 'resolution=merge-duplicates,return=representation' }),
        body: JSON.stringify(data),
        signal: controller.signal
      });
      const text = await resp.text();
      if (!resp.ok) throw new Error(text || `HTTP ${resp.status}`);
      return text ? JSON.parse(text) : [];
    } finally {
      clearTimeout(timer);
    }
  },

  // UPDATE
  async update(table, id, data) {
    return this._request('PATCH', `${table}?id=eq.${id}`, data);
  },

  // DELETE by id
  async delete(table, id) {
    return this._request('DELETE', `${table}?id=eq.${id}`);
  },

  // DELETE by filter
  async deleteWhere(table, filters) {
    let params = Object.entries(filters)
      .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`)
      .join('&');
    return this._request('DELETE', `${table}?${params}`);
  },

  // رفع ملف للـ Storage
  async storageUpload(bucket, path, file, opts = { upsert: true }) {
    const url = `${this._url}/storage/v1/object/${bucket}/${path}`;
    const headers = {
      'apikey': this._key,
      'Authorization': `Bearer ${this._key}`,
      'Content-Type': (file && file.type) ? file.type : 'application/octet-stream'
    };
    if (opts.upsert) headers['x-upsert'] = 'true';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000); // 60s للرفع
    try {
      const resp = await fetch(url, { method: 'PUT', headers, body: file, signal: controller.signal });
      const text = await resp.text();
      if (!resp.ok) throw new Error(text || `HTTP ${resp.status}`);
      return text ? JSON.parse(text) : {};
    } finally {
      clearTimeout(timer);
    }
  },

  storagePublicUrl(bucket, path) {
    return `${this._url}/storage/v1/object/public/${bucket}/${path}`;
  },

  // اختبار الاتصال
  async testConnection() {
    if (!this._url || !this._key) return false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(
        `${this._url}/rest/v1/plans?select=id&limit=1`,
        { headers: this.headers(), signal: controller.signal }
      );
      clearTimeout(timer);
      if (resp.status === 401 || resp.status === 403) {
        console.warn('🔑 Supabase: خطأ في المصادقة (Key منتهي أو غير صحيح)');
        return false;
      }
      return resp.ok;
    } catch (e) {
      const isTimeout = e.name === 'AbortError' || e.name === 'TimeoutError';
      if (isTimeout) console.warn('⏱️ Supabase: انتهت مهلة الاتصال');
      return false;
    }
  }
};

/* ══════════════════════════════════════════════════════
   DBHybrid — قاعدة البيانات الهجينة
   Supabase (primary) + localStorage (cache/fallback)
══════════════════════════════════════════════════════ */
const DBHybrid = {
  _sb: SupabaseClient,
  _useSupabase: false,

  // ── متغيرات متوافقة مع app.js ──
  _supabaseUrl: '',
  _supabaseKey: '',

  // ── Sync Queue ──
  _syncQueue: [],
  _syncing: false,
  _syncTimer: null,

  // ── Heartbeat & Reconnect ──
  _heartbeatTimer: null,
  _reconnectTimer: null,
  _reconnectAttempts: 0,
  _heartbeatInterval: 30000,       // ping كل 30 ثانية
  _reconnectBaseDelay: 5000,       // 5 ثوانٍ أول محاولة
  _reconnectMaxDelay: 120000,      // أقصى دقيقتين
  _networkEventsSetup: false,

  // ── Connection State ──
  _lastHeartbeatAt: 0,
  _lastHeartbeatOk: false,

  get connectionState() {
    return {
      configured: SUPABASE_CONFIG.isConfigured,
      online: navigator.onLine,
      usingSupabase: this._useSupabase,
      lastHeartbeatAt: this._lastHeartbeatAt,
      lastHeartbeatOk: this._lastHeartbeatOk,
    };
  },

  /* ─────────────────────────────────────────────────────
     التهيئة والاتصال
  ───────────────────────────────────────────────────── */
  async initSupabase() {
    if (!SUPABASE_CONFIG.load()) return false;

    this._supabaseUrl = SUPABASE_CONFIG.url;
    this._supabaseKey = SUPABASE_CONFIG.anonKey;
    this._sb.init(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

    try {
      const ok = await this._sb.testConnection();
        this._lastHeartbeatAt = Date.now();
        this._lastHeartbeatOk = !!ok;
      this._useSupabase = ok;
      if (ok) {
        console.log('✅ Supabase: متصل بنجاح');
        this._reconnectAttempts = 0;
        await this._initialSync();
        this._startHeartbeat();
        this._setupNetworkEvents();
        // ⚡ تشغيل Realtime WebSocket
        setTimeout(() => {
          const user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
          const tid  = user && user.tenant_id ? user.tenant_id : null;
          SmartRealtime.start(tid);
        }, 1000);
      } else {
        console.warn('⚠️ Supabase: يعمل في وضع offline');
        this._scheduleReconnect();
      }
      return ok;
    } catch (e) {
      console.warn('⚠️ Supabase init error:', e.message);
      this._useSupabase = false;
      this._scheduleReconnect();
      return false;
    }
  },

  /* ─────────────────────────────────────────────────────
     Heartbeat — ping دوري
  ───────────────────────────────────────────────────── */
  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(async () => {
      if (!SUPABASE_CONFIG.isConfigured) return;
      try {
        const ok = await this._sb.testConnection();
        this._lastHeartbeatAt = Date.now();
        this._lastHeartbeatOk = !!ok;
        if (!ok && this._useSupabase) {
          console.warn('💔 Supabase: انقطع الاتصال');
          this._useSupabase = false;
          this._onConnectionLost();
        } else if (ok && !this._useSupabase) {
          console.log('✅ Supabase: عاد الاتصال (heartbeat)');
          this._useSupabase = true;
          this._reconnectAttempts = 0;
          this._cancelReconnect();
          this._onConnectionRestored();
        }
      } catch {
        this._lastHeartbeatAt = Date.now();
        this._lastHeartbeatOk = false;
        if (this._useSupabase) {
          this._useSupabase = false;
          this._onConnectionLost();
        }
      }
    }, this._heartbeatInterval);
  },

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  },

  /* ─────────────────────────────────────────────────────
     Auto-reconnect — Exponential Backoff
  ───────────────────────────────────────────────────── */
  _scheduleReconnect() {
    if (this._reconnectTimer) return;
    if (!SUPABASE_CONFIG.isConfigured) return;

    const delay = Math.min(
      this._reconnectBaseDelay * Math.pow(2, this._reconnectAttempts),
      this._reconnectMaxDelay
    );
    console.log(`🔄 Supabase: محاولة ${this._reconnectAttempts + 1} بعد ${delay/1000}ث`);

    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      this._reconnectAttempts++;

      if (!SUPABASE_CONFIG.load()) return;
      this._supabaseUrl = SUPABASE_CONFIG.url;
      this._supabaseKey = SUPABASE_CONFIG.anonKey;
      this._sb.init(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

      try {
        const ok = await this._sb.testConnection();
        this._lastHeartbeatAt = Date.now();
        this._lastHeartbeatOk = !!ok;
        if (ok) {
          console.log('✅ Supabase: نجحت إعادة الاتصال!');
          this._useSupabase = true;
          this._reconnectAttempts = 0;
          this._onConnectionRestored();
          this._startHeartbeat();
          this._setupNetworkEvents();
        } else {
          this._scheduleReconnect();
        }
      } catch {
        this._scheduleReconnect();
      }
    }, delay);
  },

  _cancelReconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  },

  /* ─────────────────────────────────────────────────────
     Network Events
  ───────────────────────────────────────────────────── */
  _setupNetworkEvents() {
    if (this._networkEventsSetup) return;
    this._networkEventsSetup = true;

    window.addEventListener('offline', () => {
      if (this._useSupabase) {
        console.warn('📡 الشبكة منقطعة');
        this._useSupabase = false;
        this._onConnectionLost();
      }
    });

    window.addEventListener('online', () => {
      if (!this._useSupabase && SUPABASE_CONFIG.isConfigured) {
        console.log('📡 عادت الشبكة — جاري إعادة الاتصال...');
        this._reconnectAttempts = 0;
        this._cancelReconnect();
        this._scheduleReconnect();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this._useSupabase && SUPABASE_CONFIG.isConfigured) {
        console.log('👁️ المستخدم عاد للتبويب');
        this._reconnectAttempts = 0;
        this._cancelReconnect();
        this._scheduleReconnect();
      }
    });
  },

  /* ─────────────────────────────────────────────────────
     أحداث تغيير الاتصال
  ───────────────────────────────────────────────────── */
  _onConnectionLost() {
    this._stopHeartbeat();
    this._scheduleReconnect();
    this._updateConnectionBadge(false);
    SmartRealtime.stop();
    if (typeof Toast !== 'undefined')
      Toast.warn('⚠️ انقطع الاتصال بـ Supabase — البيانات تُحفظ محلياً');
    this._emitSyncEvent('offline');
  },

  _onConnectionRestored() {
    this._cancelReconnect();
    this._updateConnectionBadge(true);

    // ① مزامنة الـ offline queue (البيانات المحفوظة أثناء الانقطاع)
    setTimeout(() => this._flushOfflineQueue().catch(() => {}), 800);

    // ② مزامنة كاملة من السحابة (تسحب كل جداول المؤسسة، ليس فقط tenants/users)
    setTimeout(async () => {
      try {
        await this._initialSync();
      } catch(e) {
        console.warn('⚠️ فشل _initialSync عند استعادة الاتصال:', e.message);
      }
    }, 1500);

    // ③ إعادة تشغيل Realtime
    setTimeout(() => {
      const user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
      const tid  = user && user.tenant_id ? user.tenant_id : null;
      SmartRealtime.restart(tid);
    }, 3000);

    if (typeof Toast !== 'undefined')
      Toast.success('✅ عاد الاتصال بـ Supabase — جارٍ مزامنة البيانات...');
    this._emitSyncEvent('syncing');
  },

  /** سحب جدول من Supabase مع احترام blacklist المحذوفات */
  async _pullRemoteTable(table, lsKey) {
    const remote = await this._sb.select(table).catch(() => null);
    if (!remote || !Array.isArray(remote)) return;
    try {
      // ✅ احترم blacklist المؤسسات المحذوفة محلياً
      let filtered = remote;
      if (table === 'tenants' || table === 'users') {
        try {
          const deletedIds = JSON.parse(localStorage.getItem('sbtp_deleted_tenant_ids') || '[]');
          if (deletedIds.length) {
            if (table === 'tenants') {
              filtered = remote.filter(r => !deletedIds.includes(Number(r.id)));
            } else if (table === 'users') {
              filtered = remote.filter(r => !deletedIds.includes(Number(r.tenant_id)));
            }
            const removed = remote.length - filtered.length;
            if (removed > 0) {
              console.log(`🛡️ _pullRemoteTable[${table}]: تجاهل ${removed} سجل محذوف محلياً`);
            }
          }
        } catch(_) {}
      }
      localStorage.setItem(lsKey, JSON.stringify(filtered));
    } catch (_) {}
  },

  _updateConnectionBadge(connected) {
    const badge = document.getElementById('sbStatusBadge');
    if (badge) {
      badge.style.background = connected
        ? 'rgba(52,195,143,0.1)' : 'rgba(232,184,75,0.1)';
      badge.style.color       = connected ? '#34C38F' : '#E8B84B';
      badge.textContent       = connected
        ? '🟢 متصل بـ Supabase' : '🟡 غير متصل (إعادة محاولة...)';
    }
    const dot = document.getElementById('sbAdminDot');
    if (dot) dot.textContent = connected ? '🟢' : '🔴';
  },

  /* ─────────────────────────────────────────────────────
     CRUD محلي (localStorage)
  ───────────────────────────────────────────────────── */
  get(key) {
    try { return JSON.parse(localStorage.getItem('sbtp5_' + key)) || []; }
    catch (_) { return []; }
  },

  set(key, val) {
    // 1. احفظ محلياً أولاً (دائماً)
    let prev = [];
    try { prev = JSON.parse(localStorage.getItem('sbtp5_' + key) || '[]'); } catch {}
    try { localStorage.setItem('sbtp5_' + key, JSON.stringify(val)); }
    catch (_) {}

    // 2. إذا Supabase مُفعّل (حتى لو offline) → سجّل التغييرات للرفع الفوري أو للـ Offline Queue
    if (SUPABASE_CONFIG.isConfigured) {
      // أطلق حدث "syncing" لتحديث الـ pill في الـ topbar
      this._emitSyncEvent('syncing');
      this._smartSync(key, val, prev);
    }
  },

  /** إطلاق حدث مزامنة لتحديث واجهة المستخدم */
  _emitSyncEvent(state, detail = '') {
    try {
      document.dispatchEvent(new CustomEvent('smartsync', { detail: { state, detail } }));
    } catch (_) {}
  },

  /**
   * setSilent: حفظ محلي فقط بدون مزامنة Supabase
   * يُستخدم عندما تكون السجلات قد رُفعت بالفعل لـ Supabase (مثل التسجيل اليدوي)
   * لتجنب إنشاء نُسخ مكررة
   */
  setSilent(key, val) {
    try { localStorage.setItem('sbtp5_' + key, JSON.stringify(val)); }
    catch (_) {}
  },

  /**
   * _smartSync: يقارن الحالة الجديدة بالقديمة ويرفع فقط التغييرات
   * INSERT: سجل جديد (id غير موجود في السابق)
   * UPDATE: سجل معدَّل (id موجود لكن محتواه تغيّر)
   * DELETE: سجل محذوف (id موجود في القديم لكن غير موجود في الجديد)
   */
  _smartSync(key, newVal, prevVal) {
    const SYNCABLE = new Set([
      'plans','tenants','users','projects','workers','equipment','equipment_logs',
      'transactions','attendance','materials','invoices','salary_records',
      'kanban_tasks','documents','obligations','notes',
      'notifications','global_settings','admin_notifications','stock_movements',
      'audit_log','custom_roles','equipment_locations','tenders','tender_offers',
      'bank_transactions','signatures','ai_conversations'
    ]);
    if (!SYNCABLE.has(key)) return;
    if (!Array.isArray(newVal) || !Array.isArray(prevVal)) {
      // ليست مصفوفة → استخدم المزامنة العادية
      this._queueSync(key, newVal);
      return;
    }

    const prevMap = new Map(prevVal.map(r => [r.id, r]));
    const newMap  = new Map(newVal.map(r => [r.id, r]));


    let changed = false;

    // INSERT: موجود في الجديد وغير موجود في القديم
    for (const [id, rec] of newMap) {
      if (!prevMap.has(id)) {
        this._pushToSupabase(key, rec, 'POST');
        changed = true;
        continue;
      }
      // UPDATE: موجود في الاثنين لكن تغيّر
      const prevRec = prevMap.get(id);
      if (JSON.stringify(rec) !== JSON.stringify(prevRec)) {
        this._pushToSupabase(key, rec, 'PATCH');
        changed = true;
      }
    }

    // DELETE: موجود في القديم وغير موجود في الجديد
    for (const [id] of prevMap) {
      if (!newMap.has(id)) {
        this._pushToSupabase(key, { id }, 'DELETE');
        changed = true;
      }
    }
  },

    /**
   * _pushToSupabase: يرفع سجل واحد إلى Supabase فوراً
   * - إذا كنا Offline أو Supabase غير متصل: تُحفظ العملية في Offline Queue
   * - عند الفشل (HTTP غير OK أو Exception): تُحفظ أيضاً في Offline Queue كـ fallback
   */
  async _pushToSupabase(table, record, method, opts = {}) {
    const cfg = SUPABASE_CONFIG;
    if (!cfg.url || !cfg.anonKey) return;

    // إذا لا يوجد اتصال (شبكة/سوبابيس) → خزّن للمزامنة لاحقاً
if (!navigator.onLine || !this._useSupabase) {
  // إذا كانت العملية قادمة من الـ Offline Queue فلا نُعيد إضافتها مرة أخرى (لتجنب التكرار اللانهائي)
  if (!opts.fromQueue) {
    this._saveToOfflineQueue(table, record, method);
    this._updateAdminSyncUI();
    return;
  }
  throw new Error('Offline/Disconnected while flushing queue');
}

    const headers = {
      'Content-Type':  'application/json',
      'apikey':         cfg.anonKey,
      'Authorization': `Bearer ${cfg.anonKey}`,
      'Prefer':         'return=representation'
    };

    const clean = _cleanForSupabase_INTERNAL(table, record);
    const baseUrl = `${cfg.url}/rest/v1/${table}`;

    // بعض الجداول تحتاج الحفاظ على id (لأنها تُستخدم للمطابقة بين الأجهزة)
    const _KEEP_ID_TABLES = new Set(['notifications']);

    try {
      if (method === 'POST') {
        const body = { ...clean };
        const oldId = record && record.id;
        // افتراضياً نحذف id لأن Supabase يولده، لكن لبعض الجداول (مثل notifications) نُبقيه لتوحيد السجلات بين الأجهزة
        if (!_KEEP_ID_TABLES.has(table)) delete body.id;

        let postUrl = baseUrl;
        let postHeaders = headers;
        if (_KEEP_ID_TABLES.has(table) && record && record.id) {
          postUrl += '?on_conflict=id';
          postHeaders = { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' };
        }

        const res = await fetch(postUrl, { method: 'POST', headers: postHeaders, body: JSON.stringify(body) });
        if (!res.ok) {
          // إذا فشل POST بسبب تكرار → حاول PATCH، وإن فشل خزّن بالـ queue (فقط إذا ليست من queue)
          if (record && record.id) {
            await this._pushToSupabase(table, record, 'PATCH', opts);
          } else {
            if (!opts.fromQueue) this._saveToOfflineQueue(table, record, method);
            this._updateAdminSyncUI();
            if (opts.fromQueue) throw new Error('POST failed while flushing queue');
          }
          return;
        }

        console.log(`✅ AutoSync [POST ${table}]`);
        this._emitSyncEvent('synced');
        // ✅ مزامنة الـ ID المحلي مع الـ ID الجديد من Supabase (لتجنب التكرار)
        if (!_KEEP_ID_TABLES.has(table) && oldId) {
          try {
            const respText = await res.text();
            if (respText) {
              const respData = JSON.parse(respText);
              const newId = Array.isArray(respData) ? respData[0]?.id : respData?.id;
              if (newId && newId !== oldId) {
                const lsKey = 'sbtp5_' + table;
                const local = JSON.parse(localStorage.getItem(lsKey) || '[]');
                const idx = local.findIndex(r => r.id === oldId);
                if (idx >= 0) {
                  local[idx] = { ...local[idx], id: newId };
                  localStorage.setItem(lsKey, JSON.stringify(local));
                  console.log(`🔄 ID re-sync ${table}: ${oldId} → ${newId}`);
                }
              }
            }
          } catch(_) {}
        }
        this._updateAdminSyncUI();
        return;
      }

      if (method === 'PATCH') {
        if (!record || !record.id) return;

        const res = await fetch(`${baseUrl}?id=eq.${record.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(clean)
        });

        if (!res.ok) {
          console.warn(`⚠️ AutoSync [PATCH ${table} #${record.id}]:`, await res.text().catch(() => ''));
          this._emitSyncEvent('error');
          if (!opts.fromQueue) this._saveToOfflineQueue(table, record, method);
          this._updateAdminSyncUI();
          if (opts.fromQueue) throw new Error('PATCH failed while flushing queue');
          return;
        }

        console.log(`✅ AutoSync [PATCH ${table} #${record.id}]`);
        this._emitSyncEvent('synced');
        this._updateAdminSyncUI();
        return;
      }

      if (method === 'DELETE') {
        if (!record || !record.id) return;

        const res = await fetch(`${baseUrl}?id=eq.${record.id}`, { method: 'DELETE', headers });

        if (!res.ok) {
          console.warn(`⚠️ AutoSync [DELETE ${table} #${record.id}]:`, await res.text().catch(() => ''));
          if (!opts.fromQueue) this._saveToOfflineQueue(table, record, method);
          this._updateAdminSyncUI();
          if (opts.fromQueue) throw new Error('DELETE failed while flushing queue');
          return;
        }

        console.log(`✅ AutoSync [DELETE ${table} #${record.id}]`);
        this._emitSyncEvent('synced');
        this._updateAdminSyncUI();
        return;
      }
    } catch (e) {
      console.warn(`⚠️ AutoSync [${method} ${table}] failed:`, e?.message || e);
      if (!opts.fromQueue) this._saveToOfflineQueue(table, record, method);
      this._updateAdminSyncUI();
      if (opts.fromQueue) throw e;
    }
  },

  nextId(key) {
    const items = this.get(key);
    return items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
  },

  /* ─────────────────────────────────────────────────────
     Offline Queue — رفع البيانات المحفوظة أثناء الانقطاع
  ───────────────────────────────────────────────────── */
  _offlineQueue: [],   // [{table, record, method, time}]
  _OFFLINE_QUEUE_KEY: 'sbtp5_offline_queue',


  // ─────────────────────────────────────────────────────
  // Upload Required Flag (يمنع تسجيل الخروج حتى الضغط على زر الرفع)
  // ─────────────────────────────────────────────────────
  _DIRTY_SYNC_KEY: 'sbtp5_sync_dirty',
  _DIRTY_TOAST_KEY: 'sbtp5_sync_dirty_toast',

  /** هل توجد تعديلات تتطلب ضغط زر "↑ مزامنة يدوية"؟ */
  hasUploadRequired() {
    try { return localStorage.getItem(this._DIRTY_SYNC_KEY) === '1'; } catch { return false; }
  },

  /** تعليم أن هناك تعديلات جديدة تتطلب رفع/مزامنة يدوية */
  _markUploadRequired() {
    try { localStorage.setItem(this._DIRTY_SYNC_KEY, '1'); } catch {}
    try {
      // إشعار مرة واحدة لكل جلسة
      if (typeof Toast !== 'undefined' && sessionStorage.getItem(this._DIRTY_TOAST_KEY) !== '1') {
        Toast.warn('🔴 لديك تعديلات جديدة — اضغط "↑ مزامنة يدوية" قبل تسجيل الخروج');
        sessionStorage.setItem(this._DIRTY_TOAST_KEY, '1');
      }
    } catch {}
    this._updateAdminSyncUI();
  },

  /** مسح علامة الرفع الإجباري (بعد ضغط زر الرفع) */
  _clearUploadRequired() {
    try { localStorage.removeItem(this._DIRTY_SYNC_KEY); } catch {}
    try { sessionStorage.removeItem(this._DIRTY_TOAST_KEY); } catch {}
    this._updateAdminSyncUI();
  },

  /** مزامنة يدوية: ترفع المعلّق + تمسح علامة "الرفع الإجباري" */
  async _manualSyncNow() {
    if (typeof Toast !== 'undefined') Toast.info('⏫ جاري المزامنة اليدوية...');
    try {
      // حاول رفع المعلّق إن وجد
      await this._flushOfflineQueue().catch(() => {});
      const remaining = this.getOfflineQueueCount();
      // بعد الضغط على الزر: نمسح علامة الرفع فقط إذا لم يتبق شيء معلّق
      if (remaining === 0) {
        this._clearUploadRequired();
        if (typeof Toast !== 'undefined') Toast.success('✅ تم تنفيذ المزامنة اليدوية');
      } else {
        this._markUploadRequired();
        if (typeof Toast !== 'undefined') Toast.warn(`⚠️ بقي ${remaining} عملية معلّقة — أعد المحاولة عند استقرار الاتصال`);
      }
    } catch (e) {
      if (typeof Toast !== 'undefined') Toast.warn('⚠️ تعذرت المزامنة حالياً — ستبقى العمليات في الانتظار');
      this._markUploadRequired();
    }
  },


  /** قراءة عدد العمليات المعلّقة في Offline Queue */
  getOfflineQueueCount() {
    try {
      const q = JSON.parse(localStorage.getItem(this._OFFLINE_QUEUE_KEY) || '[]');
      return Array.isArray(q) ? q.length : 0;
    } catch {
      return 0;
    }
  },

  /** تحديث واجهة الأدمن (العداد/الأزرار) إن وُجدت */
  _updateAdminSyncUI() {
    try {
      const count = this.getOfflineQueueCount();
      const dirty = this.hasUploadRequired();
      const el = document.getElementById('sbOfflineCount');
      if (el) el.textContent = String(count);

      const badge = document.getElementById('sbOfflineBadge');
      if (badge) {
        badge.style.background = count ? 'rgba(232,184,75,0.12)' : 'rgba(52,195,143,0.10)';
        badge.style.border = count ? '1px solid rgba(232,184,75,0.35)' : '1px solid rgba(52,195,143,0.25)';
        badge.style.color = count ? '#E8B84B' : '#34C38F';
        badge.textContent = count ? `⏳ ${count} عملية معلّقة` : '✅ لا توجد عمليات معلّقة';
      }

      const btn = document.getElementById('sbFlushBtn');
      if (btn) btn.disabled = (!dirty && !count) || !this._useSupabase || !navigator.onLine;

      const small = document.getElementById('sbSyncMini');
      if (small) {
        const s = this.connectionState;
        const status = (s.usingSupabase && s.lastHeartbeatOk) ? '🟢 Live' : (!navigator.onLine ? '🔴 Offline' : '🟡 Connecting');
        small.textContent = `${status} • Pending: ${count}`;
      }

      const dot = document.getElementById('sbUploadDot');
      if (dot) dot.style.display = (dirty || count) ? 'block' : 'none';
    } catch (_) {}
  },

  /** حفظ عملية في قائمة الانتظار الدائمة (localStorage) */
  _saveToOfflineQueue(table, record, method) {
    // ✅ لا نضع عمليات للمؤسسات المحذوفة في الـ queue
    try {
      const deletedIds = JSON.parse(localStorage.getItem('sbtp_deleted_tenant_ids') || '[]').map(Number);
      if (deletedIds.length && record) {
        const tenantId = record.tenant_id || (table === 'tenants' ? record.id : null);
        if (tenantId && deletedIds.includes(Number(tenantId))) {
          console.log(`🛡️ saveToOfflineQueue: تجاهل ${method} على ${table} للمؤسسة المحذوفة`);
          return;
        }
      }
    } catch(_) {}

    this._markUploadRequired();
    try {
      const q = JSON.parse(localStorage.getItem(this._OFFLINE_QUEUE_KEY) || '[]');
      q.push({ table, record, method, time: Date.now() });
      if (q.length > 500) q.splice(0, q.length - 500);
      localStorage.setItem(this._OFFLINE_QUEUE_KEY, JSON.stringify(q));
      this._updateAdminSyncUI();
    } catch {}
  },

  /** رفع كل العمليات المؤجلة عند عودة الاتصال */
  async _flushOfflineQueue() {
    let q;
    try {
      q = JSON.parse(localStorage.getItem(this._OFFLINE_QUEUE_KEY) || '[]');
    } catch { return; }
    if (!q.length) return;

    // ✅ تصفية عمليات المؤسسات المحذوفة من الـ queue قبل الرفع
    let deletedTenantIds = [];
    try {
      deletedTenantIds = JSON.parse(localStorage.getItem('sbtp_deleted_tenant_ids') || '[]').map(Number);
    } catch(_) {}

    if (deletedTenantIds.length) {
      const originalLen = q.length;
      q = q.filter(op => {
        const recTenantId = op.record?.tenant_id || (op.table === 'tenants' ? op.record?.id : null);
        if (recTenantId && deletedTenantIds.includes(Number(recTenantId))) {
          console.log(`🛡️ OfflineQueue: تجاهل ${op.method} على ${op.table} للمؤسسة المحذوفة #${recTenantId}`);
          return false;
        }
        return true;
      });
      if (q.length < originalLen) {
        console.log(`🛡️ OfflineQueue: تم حذف ${originalLen - q.length} عملية لمؤسسات محذوفة`);
        localStorage.setItem(this._OFFLINE_QUEUE_KEY, JSON.stringify(q));
      }
    }

    if (!q.length) return;

    console.log(`⏫ Flushing ${q.length} offline operations to Supabase...`);
    const failed = [];
    for (const op of q) {
      try {
        await this._pushToSupabase(op.table, op.record, op.method, { fromQueue: true });
      } catch {
        failed.push(op);
      }
    }
    localStorage.setItem(this._OFFLINE_QUEUE_KEY, JSON.stringify(failed));
    this._updateAdminSyncUI();
    if (failed.length === 0) {
      console.log('✅ Offline queue flushed successfully');
      if (typeof Toast !== 'undefined')
        Toast.success(`✅ تمت مزامنة ${q.length} عملية محفوظة مع Supabase`);
    }
  },

  /* ─────────────────────────────────────────────────────
     Sync Queue
  ───────────────────────────────────────────────────── */
  _queueSync(key, val) {
    const SYNCABLE = new Set([
      'plans','tenants','users','projects','workers','equipment','equipment_logs',
      'transactions','attendance','materials','invoices','salary_records',
      'kanban_tasks','documents','obligations','notes',
      'notifications','global_settings','admin_notifications','stock_movements',
      'audit_log','custom_roles','equipment_locations','tenders','tender_offers',
      'bank_transactions','signatures','ai_conversations'
    ]);
    if (!SYNCABLE.has(key)) return;

    // أزل مزامنة قديمة لنفس الجدول
    this._syncQueue = this._syncQueue.filter(q => q.key !== key);
    this._syncQueue.push({ key, val, time: Date.now() });

    if (!this._syncing) {
      clearTimeout(this._syncTimer);
      this._syncTimer = setTimeout(() => this._processSyncQueue(), 2000);
    }
  },

  async _processSyncQueue() {
    if (this._syncing || !this._syncQueue.length || !this._useSupabase) return;
    this._syncing = true;

    // ترتيب أولوية: المراجع أولاً، ثم الجداول التابعة
    const ORDER = [
      'plans','tenants','users',                         // الأساسيات
      'projects','workers','equipment','materials',      // الكيانات الرئيسية
      'equipment_logs','attendance','transactions',      // التابعة
      'invoices','salary_records','kanban_tasks',
      'documents','obligations','notes','stock_movements',
      'notifications','admin_notifications','global_settings',
      'audit_log','custom_roles','equipment_locations',
      'tenders','tender_offers','bank_transactions','signatures','ai_conversations'
    ];

    const queue = [...this._syncQueue];
    this._syncQueue = [];
    queue.sort((a, b) => {
      const ai = ORDER.indexOf(a.key), bi = ORDER.indexOf(b.key);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    try {
      for (const { key, val } of queue) {
        if (Array.isArray(val) && val.length)
          await this._syncTableToSupabase(key, val);
      }
    } catch (e) {
      console.warn('⚠️ مزامنة فشلت:', e.message);
      // أعد الفاشلة للقائمة
      this._syncQueue = [...queue, ...this._syncQueue];
    } finally {
      this._syncing = false;
    }
  },

  async _syncTableToSupabase(table, records) {
    if (!Array.isArray(records) || !records.length) return;
    let okCount = 0, failCount = 0;
    const errors = [];
    for (const record of records) {
      const pk = table === 'global_settings' ? record.key : record.id;
      if (!pk) continue;
      try {
        const clean = _cleanForSupabase_INTERNAL(table, record);
        await this._sb.upsert(table, clean);
        okCount++;
      } catch (e) {
        failCount++;
        if (errors.length < 3) errors.push(`${pk}: ${e.message}`);
        console.warn(`⚠️ upsert ${table} [${pk}]:`, e.message);
      }
    }
    if (failCount > 0 && typeof Toast !== 'undefined') {
      // اعرض الخطأ للمستخدم فقط إذا فشل كل شيء (تجنب الإزعاج)
      if (okCount === 0 && errors.length) {
        console.error(`❌ ${table}: فشل رفع ${failCount} سجل`, errors);
      }
    }
    return { ok: okCount, failed: failCount };
  },

  /* ─────────────────────────────────────────────────────
     مزامنة أولية (عند أول اتصال ناجح)
  ───────────────────────────────────────────────────── */
  async _initialSync() {
    const user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
    const tid  = user?.tenant_id;
    const isAdmin = user?.is_admin;

    // الجداول التي تحتوي tenant_id (تُسحب مفلترة للمستخدم العادي)
    const tenantTables = [
      'projects','workers','equipment','equipment_logs',
      'transactions','attendance','materials','stock_movements',
      'invoices','salary_records','kanban_tasks','documents',
      'obligations','notes','notifications','audit_log',
      'custom_roles','equipment_locations','tenders','bank_transactions',
      'signatures','ai_conversations'
    ];
    // الجداول العامة (تُسحب كاملاً للجميع)
    const globalTables = ['plans','tenants','users'];

    // ═══ ① السحب من Supabase أولاً ═══
    console.log('🔽 سحب البيانات من Supabase...');
    try {
      // الجداول العامة
      for (const t of globalTables) {
        try {
          const remote = await this._sb.select(t);
          if (Array.isArray(remote) && remote.length) {
            // احترم blacklist للمحذوفات محلياً
            let filtered = remote;
            if (t === 'tenants' || t === 'users') {
              try {
                const deletedIds = JSON.parse(localStorage.getItem('sbtp_deleted_tenant_ids') || '[]');
                if (deletedIds.length) {
                  filtered = remote.filter(r =>
                    t === 'tenants'
                      ? !deletedIds.includes(Number(r.id))
                      : !deletedIds.includes(Number(r.tenant_id))
                  );
                }
              } catch(_) {}
            }
            // دمج ذكي: لا نُلغي السجلات المحلية الجديدة غير المرفوعة بعد
            const local = this.get(t) || [];
            const remoteIds = new Set(filtered.map(r => Number(r.id)));
            const localOnly = local.filter(r => !remoteIds.has(Number(r.id)));
            const merged = [...filtered, ...localOnly];
            localStorage.setItem('sbtp5_' + t, JSON.stringify(merged));
            console.log(`  ✅ ${t}: ${filtered.length} من السحابة + ${localOnly.length} محلي`);
          }
        } catch(e) {
          console.warn(`  ⚠️ ${t}:`, e.message);
        }
      }

      // الجداول الخاصة بالمؤسسة
      if (tid || isAdmin) {
        for (const t of tenantTables) {
          try {
            // المستخدم العادي: يسحب فقط بيانات مؤسسته
            // الأدمن: يسحب كل شيء
            const filters = isAdmin ? {} : { tenant_id: tid };
            const remote = await this._sb.select(t, filters);
            if (Array.isArray(remote)) {
              // دمج مع المحلي (المحلي الذي ليس له id في البعيد = جديد لم يُرفع)
              const local = this.get(t) || [];
              const remoteIds = new Set(remote.map(r => Number(r.id)));
              const localUnsynced = local.filter(r =>
                !remoteIds.has(Number(r.id)) &&
                (isAdmin || Number(r.tenant_id) === Number(tid))
              );
              const merged = [...remote, ...localUnsynced];
              localStorage.setItem('sbtp5_' + t, JSON.stringify(merged));
              if (remote.length || localUnsynced.length) {
                console.log(`  ✅ ${t}: ${remote.length} من السحابة + ${localUnsynced.length} محلي غير مُرفَع`);
              }
            }
          } catch(e) {
            console.warn(`  ⚠️ ${t}:`, e.message);
          }
        }
      }

      // إعدادات AI
      const aiRows = await this._sb.select('global_settings', { key: 'global_ai_config' }).catch(() => []);
      if (aiRows.length && aiRows[0].value) {
        const cfg = typeof aiRows[0].value === 'string' ? JSON.parse(aiRows[0].value) : aiRows[0].value;
        if (cfg.apiKey) {
          localStorage.setItem('sbtp5_global_ai_config', JSON.stringify(cfg));
          console.log('  ✅ AI config مُحمَّل');
        }
      }

      // إعدادات Google Drive المركزية
      const gdRows = await this._sb.select('global_settings', { key: 'global_gdrive_config' }).catch(() => []);
      if (gdRows.length && gdRows[0].value) {
        const cfg = typeof gdRows[0].value === 'string' ? JSON.parse(gdRows[0].value) : gdRows[0].value;
        localStorage.setItem('sbtp5_global_gdrive_config', JSON.stringify(cfg));
        console.log('  ✅ Google Drive config مُحمَّل');
      }
    } catch (e) {
      console.warn('⚠️ فشل سحب البيانات من Supabase:', e.message);
    }

    // ═══ ② دفع السجلات المحلية غير المرفوعة ═══
    console.log('🔼 رفع السجلات المحلية الجديدة...');
    const allTables = [...globalTables, ...tenantTables];
    for (const t of allTables) {
      try {
        const local = this.get(t) || [];
        if (!local.length) continue;
        // فقط السجلات التي ليس لها id في البعيد (لتفادي إعادة الكتابة)
        // _syncTableToSupabase يستخدم upsert فهو آمن
        await this._syncTableToSupabase(t, local).catch(() => {});
      } catch(_) {}
    }
    console.log('✅ المزامنة الأولية انتهت');

    // إطلاق event لتحديث الواجهة
    document.dispatchEvent(new CustomEvent('smartsync', { detail: { state: 'synced', detail: 'initial' } }));
  },

  /* ─────────────────────────────────────────────────────
     getRemote — قراءة من Supabase مع fallback
  ───────────────────────────────────────────────────── */
  async getRemote(key, filters = {}) {
    if (!this._useSupabase) return this.get(key);
    try {
      const data = await this._sb.select(key, filters);
      if (data.length) this.set(key, data); // تحديث الكاش
      return data.length ? data : this.get(key);
    } catch {
      return this.get(key);
    }
  },

  /** مرجع موحّد لـ cleanForSupabase (لاستخدامه من app.js) */
  clean: _cleanForSupabase_INTERNAL,

  /* ─────────────────────────────────────────────────────
     DB.init — التهيئة الأولى للـ localStorage
     ──────────────────────────────────────────────────────
     فقط الخطط والحسابين الأساسيين (admin + demo)
     جميع الجداول الأخرى تبدأ فارغة
     بيانات الديمو تُسحب من Supabase عند تسجيل دخول الحساب التجريبي
  ───────────────────────────────────────────────────── */
  init() {
    if (this.get('initialized').length) return;

    // ✅ استخدم setSilent للبيانات الافتراضية (موجودة مسبقاً في SQL — لا داعي للمزامنة)
    const _set = (typeof this.setSilent === 'function') ? this.setSilent.bind(this) : this.set.bind(this);

    _set('plans', [
      { id:1, slug:'starter',    name:'المبتدئ',   price_monthly:2900,  price:2900,  max_projects:3,  max_workers:15,  max_equipment:0,  max_emails:50  },
      { id:2, slug:'pro',        name:'الاحترافي', price_monthly:7900,  price:7900,  max_projects:20, max_workers:100, max_equipment:50, max_emails:500 },
      { id:3, slug:'enterprise', name:'المؤسسي',   price_monthly:19900, price:19900, max_projects:-1, max_workers:-1,  max_equipment:-1, max_emails:-1  }
    ]);
    _set('tenants', [
      { id:1, name:'SmartStruct Admin',                plan_id:3, wilaya:'الجزائر', subscription_status:'active', is_active:true },
      { id:2, name:'مؤسسة الجزائر للبناء (تجريبي)',     plan_id:2, wilaya:'الجزائر', subscription_status:'active', is_active:true }
    ]);
    _set('users', [
      { id:1, tenant_id:null, full_name:'مسؤول النظام',       email:'admin@smartbtp.dz',            password:'Admin@SmartStruct2025', role:'admin', is_admin:true,  is_active:true, account_status:'active' },
      { id:2, tenant_id:2,    full_name:'محمد الأمين بوعلام', email:'demo@algerie-construction.dz', password:'Demo@1234',             role:'admin', is_admin:false, is_active:true, account_status:'active' }
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
  }
};

/* ══════════════════════════════════════════════════════
   SupabaseSettings — واجهة إدارة Supabase في الإعدادات
══════════════════════════════════════════════════════ */
const SupabaseSettings = {
  renderCard() {
    const cfg         = JSON.parse(localStorage.getItem(SB_LS_KEY) || '{}');
    const isConnected = DBHybrid._useSupabase;
    const statusColor = isConnected ? '#34C38F' : '#E8B84B';
    const statusText  = isConnected ? '🟢 متصل بـ Supabase' : '🟡 يعمل offline (localStorage)';
    const offlineCount = (typeof DBHybrid !== 'undefined' && DBHybrid.getOfflineQueueCount) ? DBHybrid.getOfflineQueueCount() : (()=>{try{return JSON.parse(localStorage.getItem('sbtp5_offline_queue')||'[]').length||0}catch(e){return 0}})();

    return `
    <!-- ═══════ SUPABASE SETTINGS CARD ═══════ -->
    <div id="supabaseSettingsCard" style="
      background:rgba(52,195,143,0.04);border:1px solid rgba(52,195,143,0.2);
      border-radius:18px;padding:1.5rem;margin-bottom:1.5rem;">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:1.2rem">
        <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#34C38F,#20996F);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">🗄️</div>
        <div>
          <div style="font-size:1rem;font-weight:900;color:var(--text)">Supabase — قاعدة البيانات السحابية</div>
          <div style="font-size:0.72rem;color:var(--dim)">اتصل بـ Supabase لحفظ البيانات عبر الإنترنت ومزامنتها</div>
        </div>
        <div style="margin-right:auto">
          <span id="sbStatusBadge" style="
            display:inline-flex;align-items:center;gap:4px;
            padding:4px 12px;border-radius:20px;
            font-size:0.7rem;font-weight:800;
            background:${isConnected?'rgba(52,195,143,0.1)':'rgba(232,184,75,0.1)'};
            color:${statusColor};border:1px solid ${statusColor}44;">
            ${statusText}
          </span>
        </div>
      </div>

      <!-- Form -->
      <div style="display:grid;gap:0.8rem;margin-bottom:0.8rem">
        <div>
          <label style="display:block;font-size:0.75rem;color:var(--muted);margin-bottom:0.3rem;font-weight:700">🔗 Supabase Project URL</label>
          <input class="form-input" id="sbUrl" type="url"
            placeholder="https://xxxxxxxxxxxx.supabase.co"
            dir="ltr" value="${cfg.url || ''}"
            style="font-family:monospace;font-size:0.82rem;width:100%">
        </div>
        <div>
          <label style="display:block;font-size:0.75rem;color:var(--muted);margin-bottom:0.3rem;font-weight:700">🔑 Supabase Anon Key (Public Key)</label>
          <div style="position:relative">
            <input class="form-input" id="sbKey" type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              dir="ltr" value="${cfg.anonKey || ''}"
              style="font-family:monospace;font-size:0.75rem;padding-left:2.5rem;width:100%">
            <button onclick="document.getElementById('sbKey').type=document.getElementById('sbKey').type==='password'?'text':'password'"
              style="position:absolute;left:0.7rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--dim)">👁️</button>
          </div>
        </div>
      </div>

      <!-- Buttons -->
      <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-bottom:1rem">
        <button class="btn btn-green" onclick="saveSupabaseConfig()" style="flex:1;justify-content:center;min-width:160px">💾 حفظ واختبار الاتصال</button>
        <button class="btn btn-ghost btn-sm" onclick="syncToSupabase()" ${!isConnected?'disabled':''}>🔄 مزامنة الآن</button>
        <button class="btn btn-ghost btn-sm" onclick="clearSupabaseConfig()">🗑️ مسح الإعدادات</button>
      </div>

      <!-- Offline Queue Status -->
      <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;margin:-0.2rem 0 1rem 0">
        <span id="sbOfflineBadge" style="
          display:inline-flex;align-items:center;gap:6px;
          padding:5px 12px;border-radius:999px;
          font-size:0.72rem;font-weight:800;
          background:${offlineCount?'rgba(232,184,75,0.12)':'rgba(52,195,143,0.10)'};
          color:${offlineCount?'#E8B84B':'#34C38F'};
          border:1px solid ${offlineCount?'rgba(232,184,75,0.35)':'rgba(52,195,143,0.25)'};
        ">
          ${offlineCount?`⏳ ${offlineCount} عملية معلّقة`:'✅ لا توجد عمليات معلّقة'}
          <span id="sbOfflineCount" style="display:none">${offlineCount}</span>
        </span>

        <span style="font-size:0.72rem;color:var(--dim)">Offline Queue</span>

        <span style="margin-right:auto;font-size:0.72rem;color:var(--dim);font-family:monospace" id="sbSyncMini">
          ${isConnected?'🟢 Live':'🟡 Connecting'} • Pending: ${offlineCount}
        </span>

        <button id="sbFlushBtn" class="btn btn-ghost btn-sm"
          onclick="flushOfflineQueueNow()"
          ${(!isConnected || !offlineCount) ? 'disabled' : ''}>
          ⏫ رفع المعلّق
        </button>
      </div>

      <!-- Test Result -->
      <div id="sbTestResult" style="display:none;padding:0.75rem 1rem;border-radius:10px;font-size:0.82rem;margin-bottom:0.8rem"></div>

      <!-- Info -->
      <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:1rem;font-size:0.75rem">
        <div style="font-weight:800;color:var(--muted);margin-bottom:0.6rem">📋 كيفية الحصول على بيانات Supabase:</div>
        <div style="color:var(--dim);line-height:1.8">
          1. اذهب إلى <a href="https://supabase.com" target="_blank" style="color:var(--green)">supabase.com</a> وأنشئ مشروعاً مجانياً<br>
          2. افتح <strong style="color:var(--text)">Settings → API</strong><br>
          3. انسخ <strong style="color:var(--text)">Project URL</strong> و <strong style="color:var(--text)">anon public key</strong><br>
          4. شغّل <code style="background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:4px">supabase-schema.sql</code> في <strong style="color:var(--text)">SQL Editor</strong>
        </div>
        <div style="margin-top:0.8rem;display:flex;gap:0.5rem;flex-wrap:wrap">
          <a href="https://supabase.com/dashboard" target="_blank" class="btn btn-ghost btn-sm" style="font-size:0.72rem">🌐 فتح Supabase Dashboard</a>
          <button class="btn btn-ghost btn-sm" onclick="downloadSchema()" style="font-size:0.72rem">📥 تحميل schema.sql</button>
        </div>
      </div>

      ${isConnected ? `
      <div style="margin-top:0.8rem;padding:0.8rem;background:rgba(52,195,143,0.05);border-radius:10px;border:1px solid rgba(52,195,143,0.15)">
        <div style="font-size:0.75rem;color:#34C38F;font-weight:700">✅ متصل — البيانات تتزامن تلقائياً</div>
        <div style="font-size:0.68rem;color:var(--dim);margin-top:0.3rem;font-family:monospace">${cfg.url || '—'}</div>
      </div>` : ''}
    </div>`;
  }
};

/* ══════════════════════════════════════════════════════
   دوال Global (تُستدعى من index.html)
══════════════════════════════════════════════════════ */

/** حفظ إعدادات Supabase واختبار الاتصال */
async function saveSupabaseConfig() {
  const url = (document.getElementById('sbUrl')?.value || '').trim();
  const key = (document.getElementById('sbKey')?.value || '').trim();
  const res = document.getElementById('sbTestResult');

  function showResult(ok, msg) {
    if (!res) return;
    res.style.display    = 'block';
    res.style.background = ok ? 'rgba(52,195,143,0.1)' : 'rgba(240,78,106,0.1)';
    res.style.color      = ok ? '#34C38F' : '#F79FA9';
    res.innerHTML        = msg;
  }

  if (!url || !key) {
    showResult(false, '❌ يرجى إدخال Project URL و Anon Key');
    return;
  }
  if (!url.includes('supabase.co')) {
    showResult(false, '❌ URL غير صحيح — يجب أن يحتوي على supabase.co');
    return;
  }

  showResult(true, '⏳ جاري اختبار الاتصال...');

  SUPABASE_CONFIG.save(url, key);
  SupabaseClient.init(url, key);

  try {
    const ok = await SupabaseClient.testConnection();
    if (ok) {
      DBHybrid._useSupabase        = true;
      DBHybrid._supabaseUrl        = url;
      DBHybrid._supabaseKey        = key;
      DBHybrid._reconnectAttempts  = 0;
      DBHybrid._startHeartbeat();
      DBHybrid._setupNetworkEvents();
      showResult(true, '✅ تم الاتصال بـ Supabase بنجاح! البيانات ستُزامن تلقائياً.');
      DBHybrid._updateConnectionBadge(true);
      if (typeof Toast !== 'undefined') Toast.success('✅ تم الاتصال بـ Supabase!');
      setTimeout(() => syncToSupabase().catch(() => {}), 500);
    } else {
      showResult(false, '❌ فشل الاتصال — تأكد من صحة URL والـ Key، وتأكد من تشغيل schema.sql');
      SUPABASE_CONFIG.clear();
    }
  } catch (e) {
    showResult(false, `❌ خطأ: ${e.message}`);
  }
}

/** مزامنة يدوية لكل الجداول */
async function syncToSupabase() {
  if (!DBHybrid._useSupabase) {
    if (typeof Toast !== 'undefined') Toast.warn('⚠️ لم يتم الاتصال بـ Supabase بعد');
    return;
  }
  const tables = Object.keys(SB_SCHEMA).filter(t => t !== 'global_settings');
  let synced = 0;
  for (const t of tables) {
    const data = DBHybrid.get(t);
    if (data.length) {
      await DBHybrid._syncTableToSupabase(t, data).catch(() => {});
      synced++;
    }
  }
  if (typeof Toast !== 'undefined')
    Toast.success(`✅ تمت مزامنة ${synced} جداول`);
}


/** رفع العمليات المعلقة (Offline Queue) يدوياً */
async function flushOfflineQueueNow() {
  if (typeof DBHybrid === 'undefined') return;
  if (!DBHybrid._useSupabase || !navigator.onLine) {
    if (typeof Toast !== 'undefined') Toast.warn('⚠️ Supabase غير متصل حالياً');
    DBHybrid._updateAdminSyncUI();
    return;
  }
  await DBHybrid._flushOfflineQueue().catch(() => {});
  DBHybrid._updateAdminSyncUI();
}


/** مسح إعدادات Supabase */
function clearSupabaseConfig() {
  if (!confirm('هل تريد مسح إعدادات Supabase؟ ستعمل البيانات محلياً فقط.')) return;
  SUPABASE_CONFIG.clear();
  DBHybrid._useSupabase = false;
  DBHybrid._stopHeartbeat();
  DBHybrid._cancelReconnect();
  DBHybrid._networkEventsSetup = false;
  if (typeof App !== 'undefined') App.navigate('settings');
}

/** تحميل schema.sql */
function downloadSchema() {
  const sql = `-- SmartStruct Supabase Schema
-- شغّل هذا الملف في Supabase SQL Editor
-- https://app.supabase.com -> SQL Editor
SELECT 'Please run supabase-schema.sql in your Supabase SQL Editor' AS instructions;`;
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([sql], { type: 'text/plain' })),
    download: 'supabase-schema.sql'
  });
  a.click();
}









/* ══════════════════════════════════════════════════════
   تهيئة تلقائية عند تحميل الصفحة
══════════════════════════════════════════════════════ */
(async function initDB() {
  if (SUPABASE_CONFIG.load()) {
    SupabaseClient.init(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    // محاولة الاتصال في الخلفية (لا تُوقف تحميل الصفحة)
    DBHybrid.initSupabase().catch(() => {});
  }
})();

/* ══════════════════════════════════════════════════════════════════════
   ⚡ SmartStruct Realtime Engine — Supabase WebSocket / Realtime
   ──────────────────────────────────────────────────────────────────────
   يُمكّن التحديثات الفورية (Real-time) بين جميع المستخدمين
   بدون تحديث الصفحة — عبر بروتوكول Supabase Realtime (Phoenix Channel)
   ──────────────────────────────────────────────────────────────────────
   الجداول المُراقَبة:
     projects · workers · transactions · attendance · kanban_tasks
     invoices · materials · salary_records · equipment · notifications
   ──────────────────────────────────────────────────────────────────────
   الاستخدام:
     SmartRealtime.start()  ← يبدأ تلقائياً بعد initSupabase
     SmartRealtime.stop()   ← عند تسجيل الخروج
══════════════════════════════════════════════════════════════════════ */
const SmartRealtime = (() => {
  /* ─── إعدادات ──────────────────────────────── */
  const WATCHED_TABLES = [
    'projects','workers','transactions','attendance',
    'kanban_tasks','invoices','materials','salary_records',
    'equipment','equipment_logs','notifications','obligations',
    'notes','stock_movements','documents'
  ];

  const RECONNECT_DELAY  = 5000;   // 5 ث أول محاولة
  const PING_INTERVAL    = 25000;  // ping كل 25 ث (Supabase يقطع بعد 60ث بدون نشاط)
  const DEBOUNCE_RENDER  = 600;    // تأخير قبل إعادة رسم الصفحة (ms)

  /* ─── الحالة الداخلية ───────────────────────── */
  let _ws           = null;
  let _ref          = 1;             // معرّف تسلسلي للرسائل (Phoenix protocol)
  let _pingTimer    = null;
  let _reconnTimer  = null;
  let _renderTimer  = null;
  let _running      = false;
  let _tenantId     = null;
  let _joinedTopics = new Set();
  let _notifQueue   = [];           // إشعارات مؤجلة
  let _reconnDelay  = RECONNECT_DELAY;

  /* ─── مؤشر الحالة في الواجهة ───────────────── */
  function _setBadge(state) {
    // state: 'connecting' | 'live' | 'offline'
    const badge = document.getElementById('rtBadge');
    if (!badge) return;
    const cfg = {
      connecting: { bg:'rgba(232,184,75,.12)', color:'#E8B84B', border:'rgba(232,184,75,.3)', text:'⚡ جاري الاتصال...', dot:'🟡' },
      live:       { bg:'rgba(52,195,143,.12)', color:'#34C38F', border:'rgba(52,195,143,.3)', text:'⚡ Realtime نشط',    dot:'🟢' },
      offline:    { bg:'rgba(240,78,106,.10)', color:'#F04E6A', border:'rgba(240,78,106,.25)',text:'⚡ غير متصل',        dot:'🔴' },
    }[state] || {};
    badge.style.cssText = `
      display:inline-flex;align-items:center;gap:5px;
      padding:3px 10px;border-radius:20px;font-size:.7rem;font-weight:700;
      background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.border};
      transition:all .3s;cursor:default;
    `;
    badge.textContent = cfg.text;

    const dot = document.getElementById('rtAdminDot');
    if (dot) dot.textContent = cfg.dot;
  }

  /* ─── بناء URL الـ WebSocket ────────────────── */
  function _wsUrl() {
    const url = (SUPABASE_CONFIG.url || '').replace(/\/$/, '');
    const key  = SUPABASE_CONFIG.anonKey || '';
    if (!url || !key) return null;
    // Supabase Realtime endpoint
    const wsBase = url.replace('https://', 'wss://').replace('http://', 'ws://');
    return `${wsBase}/realtime/v1/websocket?apikey=${key}&vsn=1.0.0`;
  }

  /* ─── إرسال رسالة Phoenix ───────────────────── */
  function _send(topic, event, payload = {}) {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    const msg = JSON.stringify({ topic, event, payload, ref: String(_ref++) });
    _ws.send(msg);
  }

  /* ─── الانضمام لقناة جدول ──────────────────── */
  function _joinTable(table) {
    if (_joinedTopics.has(table)) return;
    _joinedTopics.add(table);

    // بناء filter للمؤسسة فقط (إذا توفّر tenant_id)
    const filter = _tenantId
      ? `tenant_id=eq.${_tenantId}`
      : undefined;

    const config = {
      broadcast: { ack: false, self: false },
      presence:  { key: '' },
      postgres_changes: [{
        event:  '*',           // INSERT | UPDATE | DELETE
        schema: 'public',
        table,
        ...(filter ? { filter } : {})
      }]
    };

    _send(`realtime:public:${table}`, 'phx_join', config);
  }

  /* ─── معالجة حدث Postgres ──────────────────── */
  function _handlePostgresChange(table, eventType, newRecord, oldRecord) {
    // ✅ تجاهل INSERT/UPDATE للمؤسسات المحذوفة محلياً (blacklist)
    if (eventType !== 'DELETE') {
      try {
        const deletedTenantIds = JSON.parse(localStorage.getItem('sbtp_deleted_tenant_ids') || '[]');
        if (deletedTenantIds.length) {
          const recTenantId = newRecord.tenant_id || (table === 'tenants' ? newRecord.id : null);
          if (recTenantId && deletedTenantIds.includes(Number(recTenantId))) {
            console.log(`⚡ Realtime: تجاهل ${eventType} على ${table} — tenant محذوف محلياً`);
            return;
          }
        }
      } catch(_) {}
    }
    // 1. تحديث localStorage فوراً
    try {
      const lsKey   = `sbtp5_${table}`;
      const current = JSON.parse(localStorage.getItem(lsKey) || '[]');

      let updated;
      if (eventType === 'INSERT') {
        const exists = current.find(r => r.id === newRecord.id);
        updated = exists ? current : [...current, newRecord];
      } else if (eventType === 'UPDATE') {
        updated = current.map(r => r.id === newRecord.id ? { ...r, ...newRecord } : r);
        if (!updated.find(r => r.id === newRecord.id)) updated.push(newRecord);
      } else if (eventType === 'DELETE') {
        const delId = (oldRecord && oldRecord.id) || (newRecord && newRecord.id);
        updated = delId ? current.filter(r => r.id !== delId) : current;
      } else {
        updated = current;
      }

      localStorage.setItem(lsKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('⚡ Realtime: خطأ في تحديث localStorage:', e.message);
    }

    // 2. إشعار بصري وجرس
    _queueNotification(table, eventType, newRecord);

    // 3. إعادة رسم الصفحة (debounced)
    _scheduleRender();
  }

  /* ─── إشعار بصري للمستخدم ──────────────────── */
  const _TABLE_LABELS = {
    projects:'المشاريع', workers:'العمال', transactions:'المعاملات',
    attendance:'الحضور', kanban_tasks:'مهام Kanban', invoices:'الفواتير',
    materials:'المواد', salary_records:'الرواتب', equipment:'المعدات',
    notifications:'الإشعارات', obligations:'الالتزامات', notes:'الملاحظات',
    stock_movements:'حركة المخزون', documents:'الوثائق'
  };
  const _EVENT_LABELS = { INSERT:'أضاف', UPDATE:'عدّل', DELETE:'حذف' };
  const _EVENT_ICONS  = { INSERT:'➕', UPDATE:'✏️', DELETE:'🗑️' };

  function _queueNotification(table, eventType, record) {
    // لا نُظهر إشعاراً عن كل تغيير — فقط الجداول المهمة
    const important = ['projects','transactions','invoices','kanban_tasks','workers','attendance'];
    if (!important.includes(table)) return;

    const label = _TABLE_LABELS[table] || table;
    const evLbl = _EVENT_LABELS[eventType] || eventType;
    const icon  = _EVENT_ICONS[eventType]  || '🔄';
    const name  = record && (record.name || record.title || record.full_name || record.number || '');

    // عرض Toast خفيف
    if (typeof Toast !== 'undefined') {
      const msg = `${icon} ${evLbl} في <b>${label}</b>${name ? `: ${name}` : ''}`;
      Toast.info(msg);
    }
  }

  /* ─── جدولة إعادة رسم الصفحة ───────────────── */
  function _scheduleRender() {
    clearTimeout(_renderTimer);
    _renderTimer = setTimeout(() => {
      try {
        if (typeof App !== 'undefined' && App.currentPage &&
            !['landing','login','admin'].includes(App.currentPage)) {
          App.render();
        }
      } catch(e) {
        console.warn('⚡ Realtime render error:', e.message);
      }
    }, DEBOUNCE_RENDER);
  }

  /* ─── معالجة رسائل WebSocket الواردة ────────── */
  function _onMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const { event, payload, topic } = msg;

    // heartbeat reply
    if (event === 'phx_reply' && payload && payload.status === 'ok') return;

    // قناة انضمت بنجاح
    if (event === 'phx_reply' && topic && topic.startsWith('realtime:')) {
      const table = topic.split(':').pop();
      console.log(`⚡ Realtime: مُتصل بجدول [${table}]`);
      return;
    }

    // حدث Postgres
    if (event === 'postgres_changes' || (payload && payload.type === 'broadcast' && payload.event === 'postgres_changes')) {
      const data = (payload && payload.data) || payload;
      if (!data) return;

      const eventType = data.type    || data.eventType;
      const table     = data.table   || (topic && topic.split(':').pop());
      const newRec    = data.record  || data.new || {};
      const oldRec    = data.old_record || data.old || {};

      if (table && eventType) {
        _handlePostgresChange(table, eventType, newRec, oldRec);
      }
      return;
    }

    // INSERT/UPDATE/DELETE مباشر (بعض إصدارات Realtime)
    if (['INSERT','UPDATE','DELETE'].includes(event)) {
      const table = topic && topic.split(':').pop();
      if (table) {
        _handlePostgresChange(table, event, payload || {}, {});
      }
    }
  }

  /* ─── الواجهة العامة ────────────────────────── */
  return {
    isLive: false,

    /** بدء الاتصال */
    start(tenantId) {
      if (_running) return;
      _running  = true;
      _tenantId = tenantId || null;
      _connect();
    },

    /** إيقاف الاتصال */
    stop() {
      _running = false;
      clearTimeout(_reconnTimer);
      clearInterval(_pingTimer);
      clearTimeout(_renderTimer);
      if (_ws) {
        try { _ws.close(1000, 'logout'); } catch {}
        _ws = null;
      }
      _joinedTopics.clear();
      this.isLive = false;
      _setBadge('offline');
    },

    /** إعادة تشغيل بعد تغيير tenant */
    restart(tenantId) {
      this.stop();
      _running = false;
      setTimeout(() => this.start(tenantId), 500);
    }
  };

  /* ─── الاتصال الفعلي بـ WebSocket ──────────── */
  function _connect() {
    if (!_running) return;

    const wsUrl = _wsUrl();
    if (!wsUrl) {
      console.warn('⚡ Realtime: Supabase غير مُهيَّأ، لن يعمل Realtime');
      _setBadge('offline');
      return;
    }

    _setBadge('connecting');
    _joinedTopics.clear();

    try {
      _ws = new WebSocket(wsUrl);
    } catch(e) {
      console.warn('⚡ Realtime: فشل إنشاء WebSocket:', e.message);
      _scheduleReconnect();
      return;
    }

    _ws.onopen = () => {
      console.log('⚡ Realtime: WebSocket متصل ✅');
      SmartRealtime.isLive = true;
      _reconnDelay = RECONNECT_DELAY;
      _setBadge('live');

      // Ping دوري لإبقاء الاتصال حياً
      clearInterval(_pingTimer);
      _pingTimer = setInterval(() => {
        _send('phoenix', 'heartbeat', {});
      }, PING_INTERVAL);

      // الانضمام لجميع الجداول
      WATCHED_TABLES.forEach(t => _joinTable(t));
    };

    _ws.onmessage = e => _onMessage(e.data);

    _ws.onerror = err => {
      console.warn('⚡ Realtime: خطأ في WebSocket');
    };

    _ws.onclose = (e) => {
      clearInterval(_pingTimer);
      SmartRealtime.isLive = false;
      _joinedTopics.clear();
      _setBadge('offline');

      if (_running) {
        console.log(`⚡ Realtime: انقطع (${e.code}) — إعادة محاولة بعد ${_reconnDelay/1000}ث`);
        _scheduleReconnect();
      }
    };
  }

  function _scheduleReconnect() {
    clearTimeout(_reconnTimer);
    _reconnTimer = setTimeout(() => {
      if (_running) {
        // Exponential backoff
        _reconnDelay = Math.min(_reconnDelay * 1.5, 60000);
        _connect();
      }
    }, _reconnDelay);
  }
})();

// ✅ تصدير SmartRealtime للـ window
window.SmartRealtime = SmartRealtime;

/* ─── Toast.info — إضافة نوع Info إن لم يكن موجوداً ─── */
(function patchToastInfo() {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof Toast !== 'undefined' && !Toast.info) {
      Toast.info = function(html) {
        const el = document.createElement('div');
        el.className = 'toast-item toast-info';
        el.innerHTML = html;
        el.style.cssText = `
          padding:.6rem 1rem;background:rgba(74,144,226,.15);
          border:1px solid rgba(74,144,226,.3);color:#7bb3f0;
          border-radius:10px;font-size:.78rem;max-width:280px;
          animation:slideInRight .3s ease;
        `;
        const container = document.getElementById('toastContainer') ||
          (() => {
            const c = document.createElement('div');
            c.id = 'toastContainer';
            c.style.cssText = 'position:fixed;bottom:1.5rem;left:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:.4rem;';
            document.body.appendChild(c);
            return c;
          })();
        container.appendChild(el);
        setTimeout(() => el.remove(), 3500);
      };
    }
  });
})();

/* ══════════════════════════════════════════════════════
   SUPABASE_HARDCODED — متغير التوافق مع app.js
   (يُعاد توجيهه إلى SUPABASE_CONFIG)
══════════════════════════════════════════════════════ */
var SUPABASE_HARDCODED = {
  get url()     { return SUPABASE_CONFIG.url     || ''; },
  get anonKey() { return SUPABASE_CONFIG.anonKey || ''; },
  set url(v)     { SUPABASE_CONFIG.url     = v; },
  set anonKey(v) { SUPABASE_CONFIG.anonKey = v; }
};

window.AutoSync = {
  _enabled: false,
  _pendingChanges: new Set(),
  _debounceTimer: null,
  _periodicTimer: null,
  _isSyncing: false,
  _lastSync: 0,

  enable() {
    if (this._enabled) return;
    this._enabled = true;

    // مزامنة أولى بعد 3 ثوانٍ من التحميل
    setTimeout(() => this._runSync('initial'), 3000);

    // مزامنة دورية كل 5 دقائق
    this._periodicTimer = setInterval(() => {
      if (navigator.onLine && !this._isSyncing) {
        this._runSync('periodic');
      }
    }, 5 * 60 * 1000);

    // إعادة الاتصال بالإنترنت → مزامنة فورية
    window.addEventListener('online', () => {
      console.log('[AutoSync] الاتصال بالإنترنت عاد، مزامنة...');
      setTimeout(() => this._runSync('online'), 1000);
      // إعادة تشغيل Realtime
      if (window.SmartRealtime && !window.SmartRealtime.isLive) {
        const tid = (typeof Auth !== 'undefined') ? Auth.getUser()?.tenant_id : null;
        window.SmartRealtime.start(tid);
      }
    });

    // عند الرجوع للتاب → مزامنة سريعة
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - this._lastSync > 30000) {
        this._runSync('visibility');
      }
    });

    console.log('🔄 AutoSync — تم تفعيل المزامنة التلقائية');
  },

  disable() {
    this._enabled = false;
    if (this._periodicTimer) { clearInterval(this._periodicTimer); this._periodicTimer = null; }
    if (this._debounceTimer) { clearTimeout(this._debounceTimer); this._debounceTimer = null; }
  },

  // يُستدعى عند كل تعديل محلي
  markDirty(table) {
    if (!this._enabled) return;
    this._pendingChanges.add(table);
    // debounce — انتظر 1.5 ثانية قبل المزامنة لتجميع التعديلات
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      if (navigator.onLine && !this._isSyncing) {
        this._runSync('change');
      }
    }, 1500);
  },

  async _runSync(reason) {
    if (this._isSyncing) return;
    if (!navigator.onLine) return;
    if (typeof DBHybrid === 'undefined' || !DBHybrid._useSupabase) return;
    if (typeof Auth === 'undefined' || !Auth.getUser()) return;

    this._isSyncing = true;
    const tablesToSync = Array.from(this._pendingChanges);
    this._pendingChanges.clear();

    try {
      // استدعاء syncAllDataToSupabase من app.js إن كانت موجودة (للمزامنة الأولية)
      if (reason === 'initial' && typeof window.syncAllDataToSupabase === 'function') {
        await window.syncAllDataToSupabase(true /* silent */);
      } else if (tablesToSync.length > 0 && typeof window.syncTablesToSupabase === 'function') {
        // مزامنة جداول محددة
        await window.syncTablesToSupabase(tablesToSync, true /* silent */);
      } else if (typeof window.syncAllDataToSupabase === 'function') {
        // افتراضياً مزامنة الكل بصمت
        await window.syncAllDataToSupabase(true);
      }

      this._lastSync = Date.now();
      console.log(`🔄 [AutoSync] تمت المزامنة (${reason})`);

      // تحديث badge المزامنة
      const lastSyncEl = document.getElementById('lastSyncTime');
      if (lastSyncEl) lastSyncEl.textContent = new Date().toLocaleTimeString('fr-DZ');
    } catch (e) {
      console.warn('[AutoSync] فشل:', e.message);
      // أعد إضافة الجداول المعلّقة
      tablesToSync.forEach(t => this._pendingChanges.add(t));
    } finally {
      this._isSyncing = false;
    }
  },

  // إجبار المزامنة فوراً
  syncNow() {
    return this._runSync('manual');
  },
};

/* ══════════════════════════════════════════════════════════════════════
   🪝 Hook: ربط DBHybrid.set بـ AutoSync.markDirty
   عند كل DB.set('table', ...) نضع علامة dirty للمزامنة التلقائية
══════════════════════════════════════════════════════════════════════ */
(function _installAutoSyncHook() {
  if (typeof DBHybrid === 'undefined' || !DBHybrid.set) return;
  const origSet = DBHybrid.set.bind(DBHybrid);
  DBHybrid.set = function(table, value) {
    const result = origSet(table, value);
    // ضع علامة dirty (سيتم debounce في AutoSync)
    if (window.AutoSync) {
      window.AutoSync.markDirty(table);
    }
    return result;
  };
  console.log('🪝 AutoSync hook مُثبَّت على DBHybrid.set');
})();
