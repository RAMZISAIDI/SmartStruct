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
const SUPABASE_URL     = '';   // مثال: 'https://xxxxxxxxxxxx.supabase.co'
const SUPABASE_KEY     = '';   // مثال: 'eyJhbGciOiJIUzI1NiIs...'

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
══════════════════════════════════════════════════════ */
const SB_SCHEMA = {
  plans:          ['id','slug','name','price_monthly','price','max_projects','max_workers','max_equipment','max_emails','created_at'],
  tenants:        ['id','name','plan_id','wilaya','address','phone','email','nif','nis','rc_number','tva_rate','subscription_status','trial_start','trial_end','is_active','created_at','updated_at'],
  users:          ['id','tenant_id','full_name','email','password','role','is_admin','is_active','account_status','last_login','created_at','updated_at'],
  projects:       ['id','tenant_id','name','project_type','wilaya','client_name','budget','total_spent','progress','status','color','phase','start_date','end_date','is_archived','created_at','updated_at'],
  workers:        ['id','tenant_id','project_id','full_name','role','phone','daily_salary','contract_type','hire_date','color','is_active','created_at'],
  equipment:      ['id','tenant_id','project_id','name','model','plate_number','icon','status','purchase_price','notes','created_at'],
  transactions:   ['id','tenant_id','project_id','type','category','amount','description','date','payment_method','created_at'],
  attendance:     ['id','tenant_id','worker_id','project_id','date','status','hours','note','created_at'],
  materials:      ['id','tenant_id','project_id','name','unit','quantity','min_quantity','unit_price','supplier','created_at'],
  invoices:       ['id','tenant_id','project_id','number','client_name','date','due_date','status','total','tva','notes','items','created_at'],
  salary_records: ['id','tenant_id','worker_id','project_id','month','days_worked','base_salary','bonuses','deductions','net_salary','paid','created_at'],
  kanban_tasks:   ['id','tenant_id','project_id','title','description','status','priority','assigned_to','due_date','created_at'],
  documents:      ['id','tenant_id','project_id','name','type','url','size','created_at'],
  obligations:    ['id','tenant_id','project_id','title','type','amount','due_date','status','notes','created_at'],
  notes:          ['id','tenant_id','project_id','user_id','text','date','created_at'],
  notifications:  ['id','tenant_id','user_id','type','title','body','date','read','status','created_at'],
  global_settings:['key','value','updated_at'],
  stock_movements:['id','tenant_id','material_id','project_id','type','quantity','date','note','created_at']
};

// حقول التواريخ لكل جدول
const SB_DATE_FIELDS = {
  projects:       ['start_date','end_date'],
  workers:        ['hire_date'],
  transactions:   ['date'],
  attendance:     ['date'],
  invoices:       ['date','due_date','paid_date'],
  salary_records: ['paid_date'],
  documents:      ['date'],
  obligations:    ['due_date'],
  kanban_tasks:   ['due_date'],
  stock_movements:['date'],
  notes:          ['date']
};

// حقول الأرقام لكل جدول
const SB_NUM_FIELDS = {
  projects:       ['budget','total_spent','progress'],
  workers:        ['daily_salary','monthly_base'],
  transactions:   ['amount'],
  materials:      ['quantity','min_quantity','unit_price'],
  invoices:       ['total','tva'],
  salary_records: ['base_salary','bonuses','deductions','net_salary','days_worked'],
  stock_movements:['quantity']
};

// IDs الاختيارية (تقبل null)
const NULLABLE_IDS = new Set([
  'project_id','worker_id','material_id','user_id',
  'plan_id','uploader_id','assignee_id','tenant_id'
]);

/* ══════════════════════════════════════════════════════
   cleanForSupabase — المصدر الموحّد لتنظيف السجلات
   (يُستخدم هنا وفي app.js عبر استدعاء DBHybrid.clean)
══════════════════════════════════════════════════════ */
function cleanForSupabase(table, record) {
  if (!record || typeof record !== 'object') return record;

  const allowed = SB_SCHEMA[table];
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

  const dateFields = new Set(SB_DATE_FIELDS[table] || []);
  const numFields  = new Set(SB_NUM_FIELDS[table]  || []);
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
    if (NULLABLE_IDS.has(col)) {
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
    if (['is_active','is_admin','is_archived','read','paid'].includes(col)) {
      clean[col] = Boolean(v);
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

  // INSERT
  async insert(table, data) {
    return this._request('POST', table, data);
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
      this._useSupabase = ok;
      if (ok) {
        console.log('✅ Supabase: متصل بنجاح');
        this._reconnectAttempts = 0;
        await this._initialSync();
        this._startHeartbeat();
        this._setupNetworkEvents();
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
    if (typeof Toast !== 'undefined')
      Toast.warn('⚠️ انقطع الاتصال بـ Supabase — البيانات تُحفظ محلياً');
  },

  _onConnectionRestored() {
    this._cancelReconnect();
    this._updateConnectionBadge(true);
    setTimeout(() => syncToSupabase().catch(() => {}), 1000);

    // جلب AI config من Supabase
    setTimeout(async () => {
      try {
        const rows = await this._sb.select('global_settings', { key: 'global_ai_config' });
        if (rows.length && rows[0].value) {
          const cfg = typeof rows[0].value === 'string'
            ? JSON.parse(rows[0].value) : rows[0].value;
          if (cfg.apiKey) {
            localStorage.setItem('sbtp5_global_ai_config', JSON.stringify(cfg));
          }
        }
      } catch (_) {}

      // جلب المستخدمين والمؤسسات الجديدة
      try {
        await this._pullRemoteTable('tenants', 'sbtp5_tenants');
        await this._pullRemoteTable('users',   'sbtp5_users');
      } catch (_) {}
    }, 1500);

    if (typeof Toast !== 'undefined')
      Toast.success('✅ عاد الاتصال بـ Supabase — جاري مزامنة البيانات...');
  },

  /** سحب جدول من Supabase ودمجه مع المحلي */
  async _pullRemoteTable(table, lsKey) {
    const remote = await this._sb.select(table).catch(() => []);
    if (!remote.length) return;
    try {
      const local  = JSON.parse(localStorage.getItem(lsKey) || '[]');
      const merged = [...remote];
      local.forEach(l => { if (!merged.find(r => r.id === l.id)) merged.push(l); });
      localStorage.setItem(lsKey, JSON.stringify(merged));
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
    try { localStorage.setItem('sbtp5_' + key, JSON.stringify(val)); }
    catch (_) {}
    if (this._useSupabase) this._queueSync(key, val);
  },

  nextId(key) {
    const items = this.get(key);
    return items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
  },

  /* ─────────────────────────────────────────────────────
     Sync Queue
  ───────────────────────────────────────────────────── */
  _queueSync(key, val) {
    const SYNCABLE = new Set([
      'plans','tenants','users','projects','workers','equipment',
      'transactions','attendance','materials','invoices','salary_records',
      'kanban_tasks','documents','obligations','notes',
      'notifications','global_settings','admin_notifications','stock_movements'
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

    const ORDER = [
      'plans','tenants','users','workers','projects',
      'materials','equipment','attendance','transactions',
      'invoices','salary_records','kanban_tasks','documents',
      'obligations','notes','notifications','global_settings',
      'admin_notifications','stock_movements'
    ];

    const queue = [...this._syncQueue];
    this._syncQueue = [];
    queue.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));

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
    for (const record of records) {
      const pk = table === 'global_settings' ? record.key : record.id;
      if (!pk) continue;
      const clean = cleanForSupabase(table, record);
      await this._sb.upsert(table, clean).catch(e =>
        console.warn(`⚠️ upsert ${table} [${pk}]:`, e.message)
      );
    }
  },

  /* ─────────────────────────────────────────────────────
     مزامنة أولية (عند أول اتصال ناجح)
  ───────────────────────────────────────────────────── */
  async _initialSync() {
    const tables = [
      'plans','tenants','users','workers','projects',
      'materials','equipment','attendance','transactions'
    ];
    // رفع المحلي
    for (const t of tables) {
      const local = this.get(t);
      if (local.length)
        await this._syncTableToSupabase(t, local).catch(() => {});
    }
    // سحب البعيد
    try {
      await this._pullRemoteTable('tenants', 'sbtp5_tenants');
      await this._pullRemoteTable('users',   'sbtp5_users');

      const aiRows = await this._sb.select('global_settings', { key: 'global_ai_config' }).catch(() => []);
      if (aiRows.length && aiRows[0].value) {
        const cfg = typeof aiRows[0].value === 'string'
          ? JSON.parse(aiRows[0].value) : aiRows[0].value;
        if (cfg.apiKey) {
          localStorage.setItem('sbtp5_global_ai_config', JSON.stringify(cfg));
          console.log('✅ AI config مُحمَّل من Supabase');
        }
      }

      const notifs = await this._sb.select('notifications').catch(() => []);
      if (notifs.length) {
        const local = this.get('admin_notifications') || [];
        const merged = [...notifs];
        local.forEach(l => { if (!merged.find(r => r.id === l.id)) merged.push(l); });
        localStorage.setItem('sbtp5_admin_notifications',
          JSON.stringify(merged.sort((a, b) =>
            new Date(b.date || 0) - new Date(a.date || 0)
          ))
        );
      }
    } catch (e) {
      console.warn('⚠️ فشل سحب البيانات من Supabase:', e.message);
    }
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
  clean: cleanForSupabase,

  /* ─────────────────────────────────────────────────────
     DB.init — بيانات التطبيق الافتراضية
  ───────────────────────────────────────────────────── */
  init() {
    if (this.get('initialized').length) return;

    this.set('plans', [
      { id:1, slug:'starter',    name:'المبتدئ',   price_monthly:2900,  price:2900,  max_projects:3,  max_workers:15,  max_equipment:0,  max_emails:50  },
      { id:2, slug:'pro',        name:'الاحترافي', price_monthly:7900,  price:7900,  max_projects:20, max_workers:100, max_equipment:50, max_emails:500 },
      { id:3, slug:'enterprise', name:'المؤسسي',   price_monthly:19900, price:19900, max_projects:-1, max_workers:-1,  max_equipment:-1, max_emails:-1  }
    ]);
    this.set('tenants', [
      { id:1, name:'مؤسسة الجزائر للبناء', plan_id:2, wilaya:'الجزائر', subscription_status:'active', is_active:true }
    ]);
    this.set('users', [
      { id:1, tenant_id:null, full_name:'مسؤول النظام',        email:'admin@smartbtp.dz',              password:'Admin@SmartStruct2025', role:'admin', is_admin:true,  is_active:true },
      { id:2, tenant_id:1,    full_name:'محمد الأمين بوعلام', email:'demo@algerie-construction.dz',   password:'Demo@1234',             role:'admin', is_admin:false, is_active:true }
    ]);
    this.set('projects', [
      { id:1, tenant_id:1, name:'بناء عمارة R+5 حيدرة',      wilaya:'الجزائر', client_name:'عبد القادر بن علي', budget:45000000, total_spent:18500000, progress:42, status:'active',    color:'#4A90E2', phase:'الهيكل الخرساني',       start_date:'2024-03-01', end_date:'2025-12-31', is_archived:false },
      { id:2, tenant_id:1, name:'فيلا سكنية دار البيضاء',    wilaya:'البليدة', client_name:'سمير حمادة',        budget:12500000, total_spent:12800000, progress:98, status:'completed', color:'#34C38F', phase:'الاستلام النهائي',        start_date:'2023-06-01', end_date:'2024-11-30', is_archived:false },
      { id:3, tenant_id:1, name:'مستودع تجاري وهران',         wilaya:'وهران',   client_name:'شركة لوجيستيك',     budget:22000000, total_spent:8900000,  progress:35, status:'active',    color:'#E8B84B', phase:'البناء والجدران',          start_date:'2024-08-15', end_date:'2025-08-14', is_archived:false },
      { id:4, tenant_id:1, name:'مدرسة ابتدائية بجاية',      wilaya:'بجاية',   client_name:'بلدية بجاية',       budget:31000000, total_spent:5200000,  progress:15, status:'delayed',   color:'#F04E6A', phase:'أعمال الحفر والأساسات', start_date:'2024-01-10', end_date:'2025-06-30', is_archived:false }
    ]);
    this.set('workers', [
      { id:1, tenant_id:1, project_id:1, full_name:'محمد الأمين زروق', role:'بنّاء رئيسي', phone:'0550 111 222', daily_salary:3500, contract_type:'daily',   hire_date:'2024-03-01', color:'#4A90E2' },
      { id:2, tenant_id:1, project_id:1, full_name:'كريم بن عزيز',    role:'حداد',         phone:'0661 333 444', daily_salary:4000, contract_type:'daily',   hire_date:'2024-03-15', color:'#34C38F' },
      { id:3, tenant_id:1, project_id:1, full_name:'يوسف شريف',       role:'كهربائي',      phone:'0770 555 666', daily_salary:4500, contract_type:'monthly', hire_date:'2024-04-01', color:'#E8B84B' },
      { id:4, tenant_id:1, project_id:3, full_name:'فريد بوزيدي',     role:'سباك',          phone:'0555 777 888', daily_salary:4200, contract_type:'daily',   hire_date:'2024-05-01', color:'#9B6DFF' },
      { id:5, tenant_id:1, project_id:3, full_name:'عمر حمزة',        role:'مساعد بنّاء',  phone:'0660 999 111', daily_salary:2500, contract_type:'daily',   hire_date:'2024-06-01', color:'#FF7043' }
    ]);
    this.set('equipment', [
      { id:1, tenant_id:1, project_id:1, name:'حفارة كاتربيلر',     model:'CAT 320',        plate_number:'16-1234-16', icon:'🚜', status:'active',      purchase_price:8500000,  notes:'' },
      { id:2, tenant_id:1, project_id:1, name:'شاحنة خلط الخرسانة', model:'Mercedes 3344',  plate_number:'16-5678-16', icon:'🚛', status:'active',      purchase_price:4200000,  notes:'' },
      { id:3, tenant_id:1, project_id:3, name:'رافعة برجية 50T',    model:'Potain MCT 88',  plate_number:'',           icon:'🏗️', status:'maintenance', purchase_price:12000000, notes:'صيانة دورية' }
    ]);
    this.set('transactions', [
      { id:1, tenant_id:1, project_id:1, type:'revenue', category:'دفعة مقدمة',      amount:10000000, description:'دفعة مقدمة مشروع حيدرة',           date:'2024-03-05', payment_method:'bank' },
      { id:2, tenant_id:1, project_id:1, type:'expense', category:'مواد البناء',      amount:4500000,  description:'حديد تسليح وأسمنت',                date:'2024-03-15', payment_method:'cash' },
      { id:3, tenant_id:1, project_id:1, type:'expense', category:'رواتب العمال',     amount:2800000,  description:'رواتب شهر مارس',                   date:'2024-03-31', payment_method:'bank' },
      { id:4, tenant_id:1, project_id:2, type:'revenue', category:'استلام نهائي',     amount:12500000, description:'دفعة الاستلام النهائي فيلا البيضاء', date:'2024-11-30', payment_method:'bank' },
      { id:5, tenant_id:1, project_id:3, type:'expense', category:'اكراءات المعدات', amount:1200000,  description:'إيجار شاحنات لنقل مواد البناء',    date:'2024-09-10', payment_method:'cash' }
    ]);
    this.set('attendance', []);
    this.set('materials', [
      { id:1, tenant_id:1, project_id:1, name:'حديد تسليح 12mm', unit:'طن',       quantity:25,  min_quantity:5,  unit_price:95000, supplier:'مصنع الحجار' },
      { id:2, tenant_id:1, project_id:1, name:'أسمنت CPA 42.5',  unit:'كيس',     quantity:320, min_quantity:50, unit_price:650,   supplier:'مصنع مفتاح'  },
      { id:3, tenant_id:1, project_id:1, name:'رمل مغسول',       unit:'م³',      quantity:80,  min_quantity:20, unit_price:4500,  supplier:'المحجرة الشرقية' },
      { id:4, tenant_id:1, project_id:3, name:'طوب قرميد',       unit:'ألف قطعة', quantity:15,  min_quantity:3,  unit_price:28000, supplier:'مصنع كريم' }
    ]);
    this.set('notes', [
      { id:1, tenant_id:1, project_id:1, user_id:2, text:'تم اكتمال الطابق الثالث، العمل يسير بشكل ممتاز.',         date:'2024-10-15' },
      { id:2, tenant_id:1, project_id:1, user_id:2, text:'تأخر وصول الحديد من المورد، يُتوقع الوصول نهاية الأسبوع.', date:'2024-10-20' }
    ]);
    this.set('initialized', [true]);
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
   sbSync — مزامنة سجل واحد (تُستخدم من app.js)
══════════════════════════════════════════════════════ */
async function sbSync(table, record, method = 'POST') {
  if (!DBHybrid._useSupabase) return;
  try {
    const url = SUPABASE_CONFIG.url;
    const key = SUPABASE_CONFIG.anonKey;
    if (!url || !key) return;

    const preferHeader = method === 'POST'
      ? 'resolution=merge-duplicates,return=representation'
      : 'return=representation';

    const headers = {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': preferHeader
    };

    let endpoint = `${url}/rest/v1/${table}`;
    if (method === 'PATCH' || method === 'DELETE')
      endpoint += `?id=eq.${record.id}`;

    const cleanRecord = method === 'DELETE' ? record : cleanForSupabase(table, record);
    const body        = method === 'DELETE' ? undefined : JSON.stringify(cleanRecord);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(endpoint, { method, headers, body, signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`⚠️ sbSync [${method} ${table}] id=${record.id}:`, errText);
        // محاولة PATCH عند فشل POST
        if (method === 'POST' && record.id) {
          const patchRes = await fetch(`${url}/rest/v1/${table}?id=eq.${record.id}`, {
            method: 'PATCH',
            headers: { ...headers, 'Prefer': 'return=representation' },
            body: JSON.stringify(cleanRecord)
          });
          if (!patchRes.ok) console.warn(`❌ sbSync PATCH fallback:`, await patchRes.text());
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    if (e.name !== 'AbortError')
      console.warn('⚠️ sbSync error:', e.message);
  }
}

async function sbSyncDelete(table, id) {
  return sbSync(table, { id }, 'DELETE');
}

async function sbSyncUpsert(table, record) {
  const clean = { ...record };
  delete clean._fromSupabase;
  return sbSync(table, clean, 'POST');
}

/* ══════════════════════════════════════════════════════
   getSupabaseConfig — مصدر موحّد (متوافق مع app.js)
══════════════════════════════════════════════════════ */
function getSupabaseConfig() {
  // 1. localStorage (الأحدث)
  try {
    const saved = JSON.parse(localStorage.getItem(SB_LS_KEY) || '{}');
    if (saved.url && saved.anonKey) return { url: saved.url, key: saved.anonKey };
  } catch (_) {}
  // 2. الكود المضمّن
  if (SUPABASE_URL && SUPABASE_KEY) return { url: SUPABASE_URL, key: SUPABASE_KEY };
  // 3. DBHybrid في الذاكرة
  if (DBHybrid._supabaseUrl) return { url: DBHybrid._supabaseUrl, key: DBHybrid._supabaseKey };
  return null;
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
