/**
 * ╔══════════════════════════════════════════════════════════════╗
 *  SmartStruct v7.2 Pro — Supabase DB Adapter (مصحح بالكامل)
 *  ──────────────────────────────────────────────────────────────
 *  ✅ تم تصحيح مشكلة duplicate key violation
 *  ✅ تحسين معالجة الـ id في POST/PATCH
 *  ✅ إضافة validation قبل الإرسال
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ══════════════════════════════════════════════════════
   ⚙️ إعداد Supabase — عدّل هذين السطرين فقط
══════════════════════════════════════════════════════ */
const SUPABASE_URL     = 'https://udinbxcnehcevajhrral.supabase.co';
const SUPABASE_KEY     = 'sb_publishable_kl2FcK_mMUfQ_EqGK21kK A_4M4ZEdMZ';

// ─── مفتاح localStorage الموحّد ────────────────
const SB_LS_KEY = 'sbtp_supabase_config';

/* ══════════════════════════════════════════════════════
   SUPABASE_CONFIG
══════════════════════════════════════════════════════ */
const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_KEY,

  get isConfigured() {
    return !!(this.url && this.anonKey);
  },

  load() {
    if (SUPABASE_URL && SUPABASE_KEY) {
      this.url = SUPABASE_URL;
      this.anonKey = SUPABASE_KEY;
      return true;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(SB_LS_KEY) || '{}');
      if (saved.url && saved.anonKey) {
        this.url = saved.url;
        this.anonKey = saved.anonKey;
        return true;
      }
    } catch (_) {}
    return false;
  },

  save(url, anonKey) {
    this.url = url || '';
    this.anonKey = anonKey || '';
    try {
      localStorage.setItem(SB_LS_KEY, JSON.stringify({ url: this.url, anonKey: this.anonKey }));
    } catch (_) {}
    if (typeof DBHybrid !== 'undefined') {
      DBHybrid._supabaseUrl = this.url;
      DBHybrid._supabaseKey = this.anonKey;
    }
  },

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
   SCHEMA وجداول الحقول
══════════════════════════════════════════════════════ */
const _SB_SCHEMA_INTERNAL = {
  plans: ['id', 'slug', 'name', 'price_monthly', 'price', 'max_projects', 'max_workers', 'max_equipment', 'max_emails', 'created_at'],
  tenants: ['id', 'name', 'plan_id', 'wilaya', 'address', 'phone', 'email', 'nif', 'nis', 'rc_number', 'tva_rate', 'subscription_status', 'trial_start', 'trial_end', 'is_active', 'created_at', 'updated_at'],
  users: ['id', 'tenant_id', 'full_name', 'email', 'password', 'role', 'is_admin', 'is_active', 'account_status', 'avatar_color', 'last_login', 'created_at', 'updated_at'],
  projects: ['id', 'tenant_id', 'name', 'project_type', 'wilaya', 'client_name', 'phone', 'budget', 'total_spent', 'progress', 'status', 'color', 'phase', 'description', 'start_date', 'end_date', 'is_archived', 'created_at', 'updated_at'],
  workers: ['id', 'tenant_id', 'project_id', 'full_name', 'role', 'phone', 'national_id', 'daily_salary', 'monthly_base', 'contract_type', 'hire_date', 'color', 'avatar_color', 'is_active', 'created_at'],
  equipment: ['id', 'tenant_id', 'project_id', 'name', 'model', 'plate_number', 'icon', 'status', 'purchase_price', 'notes', 'created_at'],
  transactions: ['id', 'tenant_id', 'project_id', 'worker_id', 'type', 'category', 'amount', 'description', 'date', 'payment_method', 'supplier', 'created_at'],
  attendance: ['id', 'tenant_id', 'worker_id', 'project_id', 'date', 'status', 'hours', 'note', 'created_at'],
  materials: ['id', 'tenant_id', 'project_id', 'name', 'unit', 'quantity', 'min_quantity', 'unit_price', 'supplier', 'created_at'],
  invoices: ['id', 'tenant_id', 'project_id', 'number', 'client', 'amount', 'amount_ht', 'tva_amount', 'tva_rate', 'date', 'due_date', 'status', 'paid_date', 'description', 'payment_method', 'created_at'],
  salary_records: ['id', 'tenant_id', 'worker_id', 'month_key', 'amount', 'paid_date', 'created_at'],
  kanban_tasks: ['id', 'tenant_id', 'project_id', 'title', 'priority', 'assignee_id', 'due_date', 'col', 'created_at'],
  documents: ['id', 'tenant_id', 'project_id', 'name', 'category', 'type', 'url', 'size', 'date', 'uploader_id', 'created_at'],
  obligations: ['id', 'tenant_id', 'title', 'amount', 'due', 'created_at'],
  notes: ['id', 'tenant_id', 'project_id', 'user_id', 'text', 'date', 'created_at'],
  notifications: ['id', 'tenant_id', 'user_id', 'type', 'title', 'body', 'date', 'read', 'status', 'created_at'],
  global_settings: ['key', 'value', 'updated_at'],
  stock_movements: ['id', 'tenant_id', 'material_id', 'type', 'quantity', 'date', 'note', 'created_at']
};

// ✅ الجداول التي تحتاج الاحتفاظ بـ id (قليلة جداً)
const _KEEP_ID_TABLES = new Set(['notifications']); // فقط الإشعارات تحتاج id ثابت

// ✅ الجداول التي لا ترسل id أبداً في POST
const _NO_ID_ON_POST = new Set([
  'plans', 'tenants', 'users', 'projects', 'workers', 'equipment',
  'transactions', 'attendance', 'materials', 'invoices', 'salary_records',
  'kanban_tasks', 'documents', 'obligations', 'notes', 'global_settings',
  'stock_movements'
]);

// حقول التواريخ
const _SB_DATE_FIELDS_INTERNAL = {
  projects: ['start_date', 'end_date'],
  tenants: ['trial_start', 'trial_end'],
  workers: ['hire_date'],
  transactions: ['date'],
  attendance: ['date'],
  invoices: ['date', 'due_date', 'paid_date'],
  salary_records: ['paid_date'],
  documents: ['date'],
  obligations: ['due'],
  kanban_tasks: ['due_date'],
  stock_movements: ['date'],
  notes: ['date']
};

/* ══════════════════════════════════════════════════════
   cleanForSupabase — تنظيف السجلات قبل الإرسال
══════════════════════════════════════════════════════ */
function _cleanForSupabase_INTERNAL(table, record, isPost = false) {
  if (!record || typeof record !== 'object') return record;

  const allowed = _SB_SCHEMA_INTERNAL[table];
  if (!allowed) return record;

  const arabicDigits = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };

  function toISO(val) {
    if (!val && val !== 0) return null;
    const s = String(val).trim().replace(/[٠-٩]/g, d => arabicDigits[d] || d);
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return null;
  }

  const dateFields = new Set(_SB_DATE_FIELDS_INTERNAL[table] || []);
  const clean = {};

  for (const col of allowed) {
    let v = record[col];
    if (v === undefined) v = null;

    // ✅最重要: في POST نحذف id تماماً (ما عدا الجداول المستثناة)
    if (col === 'id' && isPost && !_KEEP_ID_TABLES.has(table)) {
      continue; // لا نضيف id أبداً في POST
    }

    if (v === null) {
      clean[col] = null;
      continue;
    }

    // معالجة الحقول حسب النوع
    if (col === 'id') {
      const n = Number(v);
      clean[col] = (Number.isFinite(n) && n > 0) ? n : null;
      continue;
    }

    if (dateFields.has(col)) {
      clean[col] = toISO(v);
      continue;
    }

    if (col === 'progress' || col === 'hours') {
      clean[col] = Number(v) || 0;
      continue;
    }

    if (['is_active', 'is_admin', 'is_archived', 'read'].includes(col)) {
      clean[col] = Boolean(v);
      continue;
    }

    if (typeof v === 'string' && v.trim() === '') {
      clean[col] = null;
      continue;
    }

    clean[col] = v;
  }

  return clean;
}

/* ══════════════════════════════════════════════════════
   SupabaseClient
══════════════════════════════════════════════════════ */
const SupabaseClient = {
  _url: '',
  _key: '',
  _timeout: 12000,

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

  async insert(table, data) {
    // ✅ ننسخ البيانات ونحذف id نهائياً
    const payload = { ...data };
    if (!_KEEP_ID_TABLES.has(table)) {
      delete payload.id;
    }
    return this._request('POST', table, payload);
  },

  async update(table, id, data) {
    const payload = { ...data };
    delete payload.id; // لا نرسل id في التحديث
    return this._request('PATCH', `${table}?id=eq.${id}`, payload);
  },

  async delete(table, id) {
    return this._request('DELETE', `${table}?id=eq.${id}`);
  },

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
      return resp.ok;
    } catch {
      return false;
    }
  }
};

/* ══════════════════════════════════════════════════════
   DBHybrid — الكيان الرئيسي
══════════════════════════════════════════════════════ */
const DBHybrid = {
  _sb: SupabaseClient,
  _useSupabase: false,
  _supabaseUrl: '',
  _supabaseKey: '',
  _offlineQueue: [],
  _OFFLINE_QUEUE_KEY: 'sbtp5_offline_queue',

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
      } else {
        console.warn('⚠️ Supabase: غير متصل');
      }
      return ok;
    } catch (e) {
      console.warn('⚠️ Supabase init error:', e.message);
      this._useSupabase = false;
      return false;
    }
  },

  get(key) {
    try { return JSON.parse(localStorage.getItem('sbtp5_' + key)) || []; }
    catch (_) { return []; }
  },

  set(key, val) {
    try { localStorage.setItem('sbtp5_' + key, JSON.stringify(val)); }
    catch (_) {}
    
    // مزامنة مع Supabase إذا كان متصلاً
    if (this._useSupabase && SUPABASE_CONFIG.isConfigured) {
      this._syncToSupabase(key, val);
    }
  },

  setSilent(key, val) {
    try { localStorage.setItem('sbtp5_' + key, JSON.stringify(val)); }
    catch (_) {}
  },

  async _syncToSupabase(key, val) {
    const SYNCABLE = new Set([
      'plans', 'tenants', 'users', 'projects', 'workers', 'equipment',
      'transactions', 'attendance', 'materials', 'invoices', 'salary_records',
      'kanban_tasks', 'documents', 'obligations', 'notes', 'notifications'
    ]);
    if (!SYNCABLE.has(key)) return;
    if (!Array.isArray(val)) return;

    for (const record of val) {
      if (record && record.id) {
        await this._pushToSupabase(key, record, 'PATCH').catch(() => {});
      }
    }
  },

  /**
   * ✅ الدالة الأساسية للرفع إلى Supabase - مصححة بالكامل
   */
  async _pushToSupabase(table, record, method, opts = {}) {
    const cfg = SUPABASE_CONFIG;
    if (!cfg.url || !cfg.anonKey) return;
    if (!this._useSupabase || !navigator.onLine) {
      this._saveToOfflineQueue(table, record, method);
      return;
    }

    const isPost = (method === 'POST');
    // ✅ تنظيف البيانات مع تحديد أنها عملية POST أو PATCH
    const clean = _cleanForSupabase_INTERNAL(table, record, isPost);

    // ✅ تأكد إضافي: في POST لا يوجد id أبداً
    if (isPost && !_KEEP_ID_TABLES.has(table)) {
      delete clean.id;
    }

    const baseUrl = `${cfg.url}/rest/v1/${table}`;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': cfg.anonKey,
      'Authorization': `Bearer ${cfg.anonKey}`,
      'Prefer': 'return=representation'
    };

    try {
      if (method === 'POST') {
        // ✅ POST: بدون id تماماً
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(clean)
        });
        
        if (!response.ok) {
          const error = await response.text();
          if (error.includes('duplicate key')) {
            console.error(`❌ duplicate key في ${table}: لا ترسل id مع البيانات الجديدة`);
            throw new Error('duplicate_key: لا ترسل id في عملية الإضافة');
          }
          throw new Error(error);
        }
        
        console.log(`✅ POST ${table} بنجاح`);
        
        // محاولة تحديث الـ ID المحلي من الرد
        const result = await response.json();
        if (result && result[0] && result[0].id && record.id !== result[0].id) {
          const lsKey = 'sbtp5_' + table;
          const local = this.get(table);
          const idx = local.findIndex(r => r.id === record.id);
          if (idx >= 0) {
            local[idx].id = result[0].id;
            localStorage.setItem(lsKey, JSON.stringify(local));
          }
        }
        return;
      }

      if (method === 'PATCH') {
        if (!record.id) {
          console.warn(`⚠️ PATCH ${table}: لا يوجد id للتحديث`);
          return;
        }
        
        const response = await fetch(`${baseUrl}?id=eq.${record.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(clean)
        });
        
        if (!response.ok) {
          throw new Error(await response.text());
        }
        
        console.log(`✅ PATCH ${table} id=${record.id} بنجاح`);
        return;
      }

      if (method === 'DELETE') {
        if (!record.id) return;
        
        const response = await fetch(`${baseUrl}?id=eq.${record.id}`, {
          method: 'DELETE',
          headers
        });
        
        if (!response.ok) {
          throw new Error(await response.text());
        }
        
        console.log(`✅ DELETE ${table} id=${record.id} بنجاح`);
        return;
      }
    } catch (e) {
      console.warn(`⚠️ فشل ${method} ${table}:`, e.message);
      if (!opts.fromQueue) {
        this._saveToOfflineQueue(table, record, method);
      }
    }
  },

  _saveToOfflineQueue(table, record, method) {
    try {
      const q = JSON.parse(localStorage.getItem(this._OFFLINE_QUEUE_KEY) || '[]');
      q.push({ table, record, method, time: Date.now() });
      if (q.length > 500) q.splice(0, q.length - 500);
      localStorage.setItem(this._OFFLINE_QUEUE_KEY, JSON.stringify(q));
    } catch {}
  },

  async _flushOfflineQueue() {
    let q;
    try {
      q = JSON.parse(localStorage.getItem(this._OFFLINE_QUEUE_KEY) || '[]');
    } catch { return; }
    if (!q.length) return;

    const failed = [];
    for (const op of q) {
      try {
        await this._pushToSupabase(op.table, op.record, op.method, { fromQueue: true });
      } catch {
        failed.push(op);
      }
    }
    localStorage.setItem(this._OFFLINE_QUEUE_KEY, JSON.stringify(failed));
  },

  getOfflineQueueCount() {
    try {
      const q = JSON.parse(localStorage.getItem(this._OFFLINE_QUEUE_KEY) || '[]');
      return Array.isArray(q) ? q.length : 0;
    } catch {
      return 0;
    }
  },

  clean: _cleanForSupabase_INTERNAL,

  nextId(key) {
    const items = this.get(key);
    return items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
  },

  init() {
    if (this.get('initialized').length) return;

    const _set = this.setSilent.bind(this);

    _set('plans', [
      { id: 1, slug: 'starter', name: 'المبتدئ', price_monthly: 2900, price: 2900, max_projects: 3, max_workers: 15, max_equipment: 0, max_emails: 50 },
      { id: 2, slug: 'pro', name: 'الاحترافي', price_monthly: 7900, price: 7900, max_projects: 20, max_workers: 100, max_equipment: 50, max_emails: 500 },
      { id: 3, slug: 'enterprise', name: 'المؤسسي', price_monthly: 19900, price: 19900, max_projects: -1, max_workers: -1, max_equipment: -1, max_emails: -1 }
    ]);
    
    _set('tenants', [
      { id: 1, name: 'SmartStruct Admin', plan_id: 3, wilaya: 'الجزائر', subscription_status: 'active', is_active: true },
      { id: 2, name: 'مؤسسة الجزائر للبناء (تجريبي)', plan_id: 2, wilaya: 'الجزائر', subscription_status: 'active', is_active: true }
    ]);
    
    _set('users', [
      { id: 1, tenant_id: null, full_name: 'مسؤول النظام', email: 'admin@smartbtp.dz', password: 'Admin@SmartStruct2025', role: 'admin', is_admin: true, is_active: true, account_status: 'active' },
      { id: 2, tenant_id: 2, full_name: 'محمد الأمين بوعلام', email: 'demo@algerie-construction.dz', password: 'Demo@1234', role: 'admin', is_admin: false, is_active: true, account_status: 'active' }
    ]);

    _set('projects', []);
    _set('workers', []);
    _set('equipment', []);
    _set('transactions', []);
    _set('attendance', []);
    _set('materials', []);
    _set('invoices', []);
    _set('salary_records', []);
    _set('kanban_tasks', []);
    _set('documents', []);
    _set('obligations', []);
    _set('notes', []);
    _set('notifications', []);

    _set('initialized', [true]);
  }
};

/* ══════════════════════════════════════════════════════
   التوافق مع المتغيرات العالمية
══════════════════════════════════════════════════════ */
var SUPABASE_HARDCODED = {
  get url() { return SUPABASE_CONFIG.url || ''; },
  get anonKey() { return SUPABASE_CONFIG.anonKey || ''; },
  set url(v) { SUPABASE_CONFIG.url = v; },
  set anonKey(v) { SUPABASE_CONFIG.anonKey = v; }
};

/* ══════════════════════════════════════════════════════
   التهيئة التلقائية
══════════════════════════════════════════════════════ */
(async function initDB() {
  DBHybrid.init();
  if (SUPABASE_CONFIG.load()) {
    SupabaseClient.init(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    await DBHybrid.initSupabase();
  }
})();