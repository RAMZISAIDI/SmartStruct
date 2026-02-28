/**
 * ══════════════════════════════════════════════════════
 *  SmartStruct — Supabase DB Adapter
 *  يحل هذا الملف محل localStorage ويوفر مزامنة سحابية
 *  مع الاحتفاظ بـ localStorage كـ cache وfallback
 * ══════════════════════════════════════════════════════
 */

// ─── إعداد Supabase ─────────────────────────────────
// ══════════════════════════════════════════════════════
//  ⚠️ ضع هنا بيانات Supabase مباشرة — هذا يضمن عمل
//     التسجيل لجميع المستخدمين على GitHub Pages
//  اذهب: Supabase Dashboard → Settings → API
// ══════════════════════════════════════════════════════
const SUPABASE_HARDCODED = {
  url:     'https://udinbxcnehcevajhrral.supabase.co',
  anonKey: 'sb_publishable_kl2FcK_mMUfQ_EqGK21KkA_4M4ZEdMZ'
};

const SUPABASE_CONFIG = {
  url: '',
  anonKey: '',
  get isConfigured() {
    try {
      // 1. المدمج في الكود (الأولوية الأعلى)
      if (SUPABASE_HARDCODED.url && SUPABASE_HARDCODED.anonKey) return true;
      // 2. المحفوظ في localStorage (من لوحة الأدمن)
      const saved = JSON.parse(localStorage.getItem('sbtp_supabase_config') || '{}');
      return !!(saved.url && saved.anonKey);
    } catch { return false; }
  },
  load() {
    try {
      // 1. المدمج في الكود
      if (SUPABASE_HARDCODED.url && SUPABASE_HARDCODED.anonKey) {
        this.url     = SUPABASE_HARDCODED.url;
        this.anonKey = SUPABASE_HARDCODED.anonKey;
        return true;
      }
      // 2. المحفوظ في localStorage
      const saved = JSON.parse(localStorage.getItem('sbtp_supabase_config') || '{}');
      this.url     = saved.url     || '';
      this.anonKey = saved.anonKey || '';
      return !!(this.url && this.anonKey);
    } catch { return false; }
  },
  save(url, anonKey) {
    this.url     = url;
    this.anonKey = anonKey;
    localStorage.setItem('sbtp_supabase_config', JSON.stringify({ url, anonKey }));
    // حدّث الـ HARDCODED أيضاً في الذاكرة
    SUPABASE_HARDCODED.url     = url;
    SUPABASE_HARDCODED.anonKey = anonKey;
  }
};

// ─── عميل Supabase المخصص (بدون SDK) ─────────────────
const SupabaseClient = {
  _url: '',
  _key: '',

  init(url, key) {
    this._url = url.replace(/\/$/, '');
    this._key = key;
  },

  headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': this._key,
      'Authorization': `Bearer ${this._key}`,
      'Prefer': 'return=representation'
    };
  },

  async _request(method, path, body = null, params = '') {
    const url = `${this._url}/rest/v1/${path}${params ? '?' + params : ''}`;
    const opts = {
      method,
      headers: this.headers()
    };
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch(url, opts);
    const text = await resp.text();
    if (!resp.ok) {
      let err;
      try { err = JSON.parse(text); } catch { err = { message: text }; }
      throw new Error(err.message || err.details || `HTTP ${resp.status}`);
    }
    if (!text) return [];
    return JSON.parse(text);
  },

  // ─── SELECT ───
  async select(table, filters = {}, opts = {}) {
    let params = 'order=id.asc';
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null) params += `&${k}=eq.${encodeURIComponent(v)}`;
    }
    if (opts.order) params += `&order=${opts.order}`;
    if (opts.limit) params += `&limit=${opts.limit}`;
    return this._request('GET', table, null, params);
  },

  // ─── INSERT ───
  async insert(table, data) {
    return this._request('POST', table, data);
  },

  // ─── UPSERT ───
  async upsert(table, data) {
    const resp = await fetch(`${this._url}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...this.headers(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(data)
    });
    const text = await resp.text();
    if (!resp.ok) throw new Error(text);
    return text ? JSON.parse(text) : [];
  },

  // ─── UPDATE ───
  async update(table, id, data) {
    return this._request('PATCH', table + `?id=eq.${id}`, data);
  },

  // ─── DELETE ───
  async delete(table, id) {
    return this._request('DELETE', table + `?id=eq.${id}`);
  },

  // ─── DELETE by filter ───
  async deleteWhere(table, filters) {
    let params = '';
    for (const [k, v] of Object.entries(filters)) {
      params += `${k}=eq.${encodeURIComponent(v)}&`;
    }
    return this._request('DELETE', table + '?' + params.slice(0, -1));
  },

  // ─── اختبار الاتصال ───
  async testConnection() {
    try {
      if (!this._url || !this._key) return false;
      const resp = await fetch(`${this._url}/rest/v1/plans?select=id&limit=1`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(10000) // timeout 10 ثوانٍ
      });
      // 401/403 = مشكلة في الـ key، 200/206 = متصل
      if (resp.status === 401 || resp.status === 403) {
        console.warn('🔑 Supabase: مشكلة في المصادقة (Key منتهي أو غير صحيح)');
        return false;
      }
      return resp.ok;
    } catch (e) {
      // AbortError = timeout، NetworkError = انقطاع
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        console.warn('⏱️ Supabase: انتهت مهلة الاتصال');
      }
      return false;
    }
  }
};

// ─── DB الهجين: Supabase + localStorage ─────────────────
const DBHybrid = {
  _sb: SupabaseClient,
  _useSupabase: false,
  _syncQueue: [],
  _syncing: false,

  // ─── نظام المراقبة وإعادة الاتصال ──────────────────────
  _heartbeatTimer: null,
  _reconnectTimer: null,
  _reconnectAttempts: 0,
  _maxReconnectAttempts: Infinity, // يحاول للأبد
  _heartbeatInterval: 30000,       // ping كل 30 ثانية
  _reconnectBaseDelay: 5000,       // 5 ثوانٍ أول محاولة
  _reconnectMaxDelay: 120000,      // أقصى انتظار دقيقتين
  _isOnline: navigator.onLine,
  _networkEventsSetup: false,      // منع تسجيل events مرتين

  // تهيئة: حاول الاتصال بـ Supabase
  async initSupabase() {
    if (!SUPABASE_CONFIG.load()) return false;
    this._sb.init(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    try {
      const ok = await this._sb.testConnection();
      this._useSupabase = ok;
      if (ok) {
        console.log('✅ Supabase: متصل بنجاح');
        this._reconnectAttempts = 0;
        await this._initialSync();
        this._startHeartbeat();    // ابدأ المراقبة
        this._setupNetworkEvents(); // راقب الشبكة
      } else {
        console.warn('⚠️ Supabase: فشل الاتصال، يعمل في وضع offline');
        this._scheduleReconnect(); // جدول إعادة المحاولة
      }
      return ok;
    } catch (e) {
      console.warn('⚠️ Supabase init error:', e.message);
      this._useSupabase = false;
      this._scheduleReconnect();
      return false;
    }
  },

  // ─── Heartbeat: ping دوري للتأكد من الاتصال ────────────
  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(async () => {
      if (!SUPABASE_CONFIG.isConfigured) return;
      try {
        const ok = await this._sb.testConnection();
        if (!ok && this._useSupabase) {
          // الاتصال انقطع!
          console.warn('💔 Supabase: انقطع الاتصال، جاري إعادة المحاولة...');
          this._useSupabase = false;
          this._onConnectionLost();
        } else if (ok && !this._useSupabase) {
          // عاد الاتصال! (اكتُشف عبر الـ heartbeat)
          console.log('✅ Supabase: عاد الاتصال تلقائياً (heartbeat)');
          this._useSupabase = true;
          this._reconnectAttempts = 0;
          this._cancelReconnect(); // ألغِ أي reconnect مجدول
          this._onConnectionRestored();
        }
        // إذا ok && _useSupabase → كل شيء طبيعي، لا تفعل شيئاً
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

  // ─── إعادة الاتصال التلقائي (Exponential Backoff) ──────
  _scheduleReconnect() {
    if (this._reconnectTimer) return; // لا تجدول مرتين
    if (!SUPABASE_CONFIG.isConfigured) return;

    // حساب وقت الانتظار بشكل تدريجي: 5s → 10s → 20s → ... → 120s
    const delay = Math.min(
      this._reconnectBaseDelay * Math.pow(2, this._reconnectAttempts),
      this._reconnectMaxDelay
    );

    console.log(`🔄 Supabase: محاولة إعادة الاتصال بعد ${delay/1000}ث (محاولة ${this._reconnectAttempts + 1})`);

    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      this._reconnectAttempts++;

      if (!SUPABASE_CONFIG.load()) return;
      this._sb.init(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

      try {
        const ok = await this._sb.testConnection();
        if (ok) {
          console.log('✅ Supabase: نجحت إعادة الاتصال!');
          this._useSupabase = true;
          this._reconnectAttempts = 0;
          this._onConnectionRestored();
          this._startHeartbeat();    // أعد تشغيل Heartbeat
          this._setupNetworkEvents(); // تأكد من تسجيل network events
        } else {
          this._scheduleReconnect(); // حاول مجدداً
        }
      } catch {
        this._scheduleReconnect(); // حاول مجدداً
      }
    }, delay);
  },

  _cancelReconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  },

  // ─── مراقبة حالة الشبكة (Online/Offline) ──────────────
  _setupNetworkEvents() {
    if (this._networkEventsSetup) return; // لا تسجّل مرتين
    this._networkEventsSetup = true;
    // عند قطع الإنترنت
    window.addEventListener('offline', () => {
      this._isOnline = false;
      if (this._useSupabase) {
        console.warn('📡 الشبكة منقطعة — Supabase في وضع offline');
        this._useSupabase = false;
        this._onConnectionLost();
      }
    });

    // عند عودة الإنترنت
    window.addEventListener('online', () => {
      this._isOnline = true;
      if (!this._useSupabase && SUPABASE_CONFIG.isConfigured) {
        console.log('📡 عادت الشبكة — محاولة إعادة الاتصال...');
        this._reconnectAttempts = 0; // أعد المحاولات من البداية
        this._cancelReconnect();
        this._scheduleReconnect();
      }
    });

    // عند عودة المستخدم للتبويب (Page Visibility)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this._useSupabase && SUPABASE_CONFIG.isConfigured) {
        // المستخدم عاد للتبويب وهو غير متصل → حاول فوراً
        console.log('👁️ المستخدم عاد للتبويب — محاولة إعادة الاتصال...');
        this._reconnectAttempts = 0;
        this._cancelReconnect();
        this._scheduleReconnect();
      }
    });
  },

  // ─── أحداث تغيير حالة الاتصال ──────────────────────────
  _onConnectionLost() {
    this._stopHeartbeat();
    this._scheduleReconnect();

    // تحديث الـ UI
    this._updateConnectionBadge(false);

    if (typeof Toast !== 'undefined') {
      Toast.warn('⚠️ انقطع الاتصال بـ Supabase — البيانات تُحفظ محلياً');
    }
  },

  _onConnectionRestored() {
    this._cancelReconnect();

    // مزامنة البيانات المتراكمة أثناء الانقطاع
    setTimeout(() => syncToSupabase(), 1000);

    // ── جلب AI config من Supabase للمستخدم الحالي ──
    setTimeout(async () => {
      try {
        const aiResp = await fetch(`${this._sb._url}/rest/v1/global_settings?key=eq.global_ai_config&select=value`, {
          headers: this._sb.headers()
        });
        if (aiResp.ok) {
          const rows = await aiResp.json();
          if (rows.length && rows[0].value) {
            const cfg = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
            if (cfg.apiKey) {
              try { localStorage.setItem('sbtp5_global_ai_config', JSON.stringify(cfg)); } catch(e) {}
              console.log('✅ SmartAI config مُحدَّث من Supabase');
            }
          }
        }
        // ── جلب المستخدمين والمؤسسات الجديدة ──
        const tResp = await fetch(`${this._sb._url}/rest/v1/tenants?order=id.asc`, { headers: this._sb.headers() });
        const uResp = await fetch(`${this._sb._url}/rest/v1/users?order=id.asc`, { headers: this._sb.headers() });
        if (tResp.ok) {
          const sbTenants = await tResp.json();
          if (sbTenants.length) {
            const localKey = 'sbtp5_tenants';
            try { const cur = JSON.parse(localStorage.getItem(localKey)||'[]');
              const merged = [...sbTenants]; cur.forEach(lt => { if(!merged.find(st=>st.id===lt.id)) merged.push(lt); });
              localStorage.setItem(localKey, JSON.stringify(merged)); } catch(e) {}
          }
        }
        if (uResp.ok) {
          const sbUsers = await uResp.json();
          if (sbUsers.length) {
            const localKey = 'sbtp5_users';
            try { const cur = JSON.parse(localStorage.getItem(localKey)||'[]');
              const merged = [...sbUsers]; cur.forEach(lu => { if(!merged.find(su=>su.id===lu.id)) merged.push(lu); });
              localStorage.setItem(localKey, JSON.stringify(merged)); } catch(e) {}
          }
        }
      } catch(e) {}
    }, 1500);

    // تحديث الـ UI
    this._updateConnectionBadge(true);

    if (typeof Toast !== 'undefined') {
      Toast.success('✅ عاد الاتصال بـ Supabase — جاري مزامنة البيانات...');
    }
  },

  _updateConnectionBadge(connected) {
    // تحديث badge في الإعدادات
    const badge = document.getElementById('sbStatusBadge');
    if (badge) {
      badge.style.background = connected ? 'rgba(52,195,143,0.1)' : 'rgba(232,184,75,0.1)';
      badge.style.color = connected ? '#34C38F' : '#E8B84B';
      badge.textContent = connected ? '🟢 متصل بـ Supabase' : '🟡 غير متصل (محاولة إعادة الاتصال...)';
    }
    // تحديث dot في admin tab إن وجد
    const dot = document.getElementById('sbAdminDot');
    if (dot) {
      dot.textContent = connected ? '🟢' : '🔴';
    }
  },

  // ─── DB.get (قراءة) ───────────────────────────────────
  get(key) {
    try {
      return JSON.parse(localStorage.getItem('sbtp5_' + key)) || [];
    } catch { return []; }
  },

  // ─── DB.set (كتابة) ───────────────────────────────────
  set(key, val) {
    localStorage.setItem('sbtp5_' + key, JSON.stringify(val));
    // إضافة للقائمة الانتظار للمزامنة
    if (this._useSupabase) {
      this._queueSync(key, val);
    }
  },

  // ─── DB.nextId ─────────────────────────────────────────
  nextId(key) {
    const items = this.get(key);
    return items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
  },

  // ─── مزامنة مجدولة ─────────────────────────────────────
  _queueSync(key, val) {
    const SYNCABLE_TABLES = [
      'projects', 'workers', 'transactions', 'equipment',
      'materials', 'attendance', 'invoices', 'salary_records',
      'kanban_tasks', 'documents', 'obligations', 'notes',
      'tenants', 'users', 'plans', 'notifications',
      'global_settings', 'admin_notifications'
    ];
    if (!SYNCABLE_TABLES.includes(key)) return;

    // إزالة مزامنة سابقة لنفس الجدول
    this._syncQueue = this._syncQueue.filter(q => q.key !== key);
    this._syncQueue.push({ key, val, time: Date.now() });

    if (!this._syncing) {
      clearTimeout(this._syncTimer);
      this._syncTimer = setTimeout(() => this._processSyncQueue(), 2000);
    }
  },

  async _processSyncQueue() {
    if (this._syncing || !this._syncQueue.length) return;
    if (!this._useSupabase) return; // لا تحاول إذا غير متصل
    this._syncing = true;
    const queue = [...this._syncQueue];
    this._syncQueue = [];
    try {
      for (const { key, val } of queue) {
        await this._syncTableToSupabase(key, val);
      }
    } catch (e) {
      console.warn('⚠️ مزامنة Supabase فشلت:', e.message);
      // أعد البيانات الفاشلة إلى القائمة لمزامنتها لاحقاً
      this._syncQueue = [...queue, ...this._syncQueue];
    }
    this._syncing = false;
  },

  async _syncTableToSupabase(key, records) {
    if (!Array.isArray(records) || !records.length) return;
    try {
      // استخدام upsert بدلاً من delete+insert للحفاظ على البيانات
      for (const record of records) {
        if (!record.id) continue;
        await this._sb.upsert(key, record).catch(() => {});
      }
    } catch (e) {
      console.warn(`⚠️ فشل مزامنة ${key}:`, e.message);
    }
  },

  // ─── مزامنة أولية: localStorage → Supabase + Supabase → localStorage ────────────
  async _initialSync() {
    // دفع البيانات المحلية لـ Supabase
    const tables = ['plans', 'tenants', 'users'];
    for (const t of tables) {
      const local = this.get(t);
      if (local.length) await this._syncTableToSupabase(t, local).catch(() => {});
    }

    // ── سحب بيانات Supabase (المستخدمون الجدد والمؤسسات والإعدادات) ──
    try {
      // سحب المؤسسات
      const sbTenants = await this._sb.select('tenants').catch(() => []);
      if (sbTenants.length) {
        const local = this.get('tenants');
        const merged = [...sbTenants];
        local.forEach(lt => { if (!merged.find(st => st.id === lt.id)) merged.push(lt); });
        localStorage.setItem('sbtp5_tenants', JSON.stringify(merged));
      }
      // سحب المستخدمين
      const sbUsers = await this._sb.select('users').catch(() => []);
      if (sbUsers.length) {
        const local = this.get('users');
        const merged = [...sbUsers];
        local.forEach(lu => { if (!merged.find(su => su.id === lu.id)) merged.push(lu); });
        localStorage.setItem('sbtp5_users', JSON.stringify(merged));
      }
      // سحب إعداد AI المركزي
      const aiRows = await this._sb.select('global_settings', { key: 'global_ai_config' }).catch(() => []);
      if (aiRows.length && aiRows[0].value) {
        const cfg = typeof aiRows[0].value === 'string' ? JSON.parse(aiRows[0].value) : aiRows[0].value;
        if (cfg.apiKey) {
          localStorage.setItem('sbtp5_global_ai_config', JSON.stringify(cfg));
          console.log('✅ AI config مُحمَّل من Supabase');
        }
      }
      // سحب الإشعارات
      const sbNotifs = await this._sb.select('notifications').catch(() => []);
      if (sbNotifs.length) {
        const local = this.get('admin_notifications') || [];
        const merged = [...sbNotifs];
        local.forEach(ln => { if (!merged.find(sn => sn.id === ln.id)) merged.push(ln); });
        localStorage.setItem('sbtp5_admin_notifications', JSON.stringify(
          merged.sort((a,b) => new Date(b.date||0) - new Date(a.date||0))
        ));
      }
    } catch(e) {
      console.warn('⚠️ فشل سحب البيانات من Supabase:', e.message);
    }
  },

  // ─── قراءة من Supabase مع fallback ─────────────────────
  async getRemote(key, filters = {}) {
    if (!this._useSupabase) return this.get(key);
    try {
      const data = await this._sb.select(key, filters);
      if (data.length) {
        // تحديث cache المحلي
        const local = this.get(key);
        // دمج البيانات البعيدة مع المحلية (remote يأخذ الأولوية)
        this.set(key, data);
      }
      return data.length ? data : this.get(key);
    } catch {
      return this.get(key);
    }
  },

  // ─── DB.init ─────────────────────────────────────────────
  init() {
    if (this.get('initialized').length) return;
    this.set('plans', [
      { id:1, slug:'starter',    name:'المبتدئ',   price_monthly:2900,  price:2900,  max_projects:3,  max_workers:15,  max_equipment:0,  max_emails:50  },
      { id:2, slug:'pro',        name:'الاحترافي', price_monthly:7900,  price:7900,  max_projects:20, max_workers:100, max_equipment:50, max_emails:500 },
      { id:3, slug:'enterprise', name:'المؤسسي',   price_monthly:19900, price:19900, max_projects:-1, max_workers:-1,  max_equipment:-1, max_emails:-1  },
    ]);
    this.set('tenants', [
      { id:1, name:'مؤسسة الجزائر للبناء', plan_id:2, wilaya:'الجزائر', subscription_status:'active', is_active:true }
    ]);
    this.set('users', [
      { id:1, tenant_id:null, full_name:'مسؤول النظام', email:'admin@smartbtp.dz', password:'Admin@SmartStruct2025', role:'admin', is_admin:true, is_active:true },
      { id:2, tenant_id:1, full_name:'محمد الأمين بوعلام', email:'demo@algerie-construction.dz', password:'Demo@1234', role:'admin', is_admin:false, is_active:true },
    ]);
    this.set('projects', [
      { id:1, tenant_id:1, name:'بناء عمارة R+5 حيدرة', wilaya:'الجزائر', client_name:'عبد القادر بن علي', budget:45000000, total_spent:18500000, progress:42, status:'active', color:'#4A90E2', phase:'الهيكل الخرساني', start_date:'2024-03-01', end_date:'2025-12-31', is_archived:false },
      { id:2, tenant_id:1, name:'فيلا سكنية دار البيضاء', wilaya:'البليدة', client_name:'سمير حمادة', budget:12500000, total_spent:12800000, progress:98, status:'completed', color:'#34C38F', phase:'الاستلام النهائي', start_date:'2023-06-01', end_date:'2024-11-30', is_archived:false },
      { id:3, tenant_id:1, name:'مستودع تجاري وهران', wilaya:'وهران', client_name:'شركة لوجيستيك', budget:22000000, total_spent:8900000, progress:35, status:'active', color:'#E8B84B', phase:'البناء والجدران', start_date:'2024-08-15', end_date:'2025-08-14', is_archived:false },
      { id:4, tenant_id:1, name:'مدرسة ابتدائية بجاية', wilaya:'بجاية', client_name:'بلدية بجاية', budget:31000000, total_spent:5200000, progress:15, status:'delayed', color:'#F04E6A', phase:'أعمال الحفر والأساسات', start_date:'2024-01-10', end_date:'2025-06-30', is_archived:false },
    ]);
    this.set('workers', [
      { id:1, tenant_id:1, project_id:1, full_name:'محمد الأمين زروق', role:'بنّاء رئيسي', phone:'0550 111 222', daily_salary:3500, contract_type:'daily', hire_date:'2024-03-01', color:'#4A90E2' },
      { id:2, tenant_id:1, project_id:1, full_name:'كريم بن عزيز', role:'حداد', phone:'0661 333 444', daily_salary:4000, contract_type:'daily', hire_date:'2024-03-15', color:'#34C38F' },
      { id:3, tenant_id:1, project_id:1, full_name:'يوسف شريف', role:'كهربائي', phone:'0770 555 666', daily_salary:4500, contract_type:'monthly', hire_date:'2024-04-01', color:'#E8B84B' },
      { id:4, tenant_id:1, project_id:3, full_name:'فريد بوزيدي', role:'سباك', phone:'0555 777 888', daily_salary:4200, contract_type:'daily', hire_date:'2024-05-01', color:'#9B6DFF' },
      { id:5, tenant_id:1, project_id:3, full_name:'عمر حمزة', role:'مساعد بنّاء', phone:'0660 999 111', daily_salary:2500, contract_type:'daily', hire_date:'2024-06-01', color:'#FF7043' },
    ]);
    this.set('equipment', [
      { id:1, tenant_id:1, project_id:1, name:'حفارة كاتربيلر', model:'CAT 320', plate_number:'16-1234-16', icon:'🚜', status:'active', purchase_price:8500000, notes:'' },
      { id:2, tenant_id:1, project_id:1, name:'شاحنة خلط الخرسانة', model:'Mercedes 3344', plate_number:'16-5678-16', icon:'🚛', status:'active', purchase_price:4200000, notes:'' },
      { id:3, tenant_id:1, project_id:3, name:'رافعة برجية 50T', model:'Potain MCT 88', plate_number:'', icon:'🏗️', status:'maintenance', purchase_price:12000000, notes:'صيانة دورية' },
    ]);
    this.set('transactions', [
      { id:1, tenant_id:1, project_id:1, type:'revenue', category:'دفعة مقدمة', amount:10000000, description:'دفعة مقدمة مشروع حيدرة', date:'2024-03-05', payment_method:'bank' },
      { id:2, tenant_id:1, project_id:1, type:'expense', category:'مواد البناء', amount:4500000, description:'حديد تسليح وأسمنت', date:'2024-03-15', payment_method:'cash' },
      { id:3, tenant_id:1, project_id:1, type:'expense', category:'رواتب العمال', amount:2800000, description:'رواتب شهر مارس', date:'2024-03-31', payment_method:'bank' },
      { id:4, tenant_id:1, project_id:2, type:'revenue', category:'استلام نهائي', amount:12500000, description:'دفعة الاستلام النهائي فيلا دار البيضاء', date:'2024-11-30', payment_method:'bank' },
      { id:5, tenant_id:1, project_id:3, type:'expense', category:'اكراءات المعدات', amount:1200000, description:'إيجار شاحنات لنقل مواد البناء', date:'2024-09-10', payment_method:'cash' },
    ]);
    this.set('attendance', []);
    this.set('materials', [
      { id:1, tenant_id:1, project_id:1, name:'حديد تسليح 12mm', unit:'طن', quantity:25, min_quantity:5, unit_price:95000, supplier:'مصنع الحجار' },
      { id:2, tenant_id:1, project_id:1, name:'أسمنت CPA 42.5', unit:'كيس', quantity:320, min_quantity:50, unit_price:650, supplier:'مصنع مفتاح' },
      { id:3, tenant_id:1, project_id:1, name:'رمل مغسول', unit:'م³', quantity:80, min_quantity:20, unit_price:4500, supplier:'المحجرة الشرقية' },
      { id:4, tenant_id:1, project_id:3, name:'طوب قرميد', unit:'ألف قطعة', quantity:15, min_quantity:3, unit_price:28000, supplier:'مصنع كريم' },
    ]);
    this.set('notes', [
      { id:1, tenant_id:1, project_id:1, user_id:2, text:'تم اكتمال الطابق الثالث، العمل يسير بشكل ممتاز.', date:'2024-10-15' },
      { id:2, tenant_id:1, project_id:1, user_id:2, text:'تأخر وصول الحديد من المورد، يُتوقع الوصول نهاية الأسبوع.', date:'2024-10-20' },
    ]);
    this.set('initialized', [true]);
  }
};

// ─── UI لإدارة Supabase في الإعدادات ────────────────────
const SupabaseSettings = {

  renderCard() {
    const cfg = JSON.parse(localStorage.getItem('sbtp_supabase_config') || '{}');
    const isConnected = DBHybrid._useSupabase;
    const statusColor = isConnected ? '#34C38F' : '#E8B84B';
    const statusText = isConnected ? '🟢 متصل بـ Supabase' : '🟡 يعمل offline (localStorage)';

    return `
    <!-- ═══════════════════════════ SUPABASE CARD ═══════════════════════════ -->
    <div id="supabaseSettingsCard" style="
      background: rgba(52,195,143,0.04);
      border: 1px solid rgba(52,195,143,0.2);
      border-radius: 18px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    ">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:1.2rem">
        <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#34C38F,#20996F);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">
          🗄️
        </div>
        <div>
          <div style="font-size:1rem;font-weight:900;color:var(--text)">Supabase — قاعدة البيانات السحابية</div>
          <div style="font-size:0.72rem;color:var(--dim)">اتصل بـ Supabase لحفظ البيانات عبر الإنترنت ومزامنتها</div>
        </div>
        <div style="margin-right:auto">
          <span style="
            display:inline-flex;align-items:center;gap:4px;
            padding:4px 12px;border-radius:20px;
            font-size:0.7rem;font-weight:800;
            background:${isConnected?'rgba(52,195,143,0.1)':'rgba(232,184,75,0.1)'};
            color:${statusColor};
            border:1px solid ${statusColor}44;
          " id="sbStatusBadge">${statusText}</span>
        </div>
      </div>

      <!-- Form -->
      <div class="form-grid-2" style="margin-bottom:0.8rem">
        <div class="form-group" style="margin:0;grid-column:1/-1">
          <label class="form-label">🔗 Supabase Project URL</label>
          <input class="form-input" id="sbUrl" type="url"
            placeholder="https://xxxxxxxxxxxx.supabase.co"
            dir="ltr"
            value="${cfg.url||''}"
            style="font-family:monospace;font-size:0.82rem">
        </div>
        <div class="form-group" style="margin:0;grid-column:1/-1">
          <label class="form-label">🔑 Supabase Anon Key (Public Key)</label>
          <div style="position:relative">
            <input class="form-input" id="sbKey" type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              dir="ltr"
              value="${cfg.anonKey||''}"
              style="font-family:monospace;font-size:0.75rem;padding-left:2.5rem">
            <button onclick="document.getElementById('sbKey').type = document.getElementById('sbKey').type==='password'?'text':'password'"
              style="position:absolute;left:0.7rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--dim);font-size:0.9rem">👁️</button>
          </div>
        </div>
      </div>

      <!-- Buttons -->
      <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-bottom:1rem">
        <button class="btn btn-green" onclick="saveSupabaseConfig()" style="flex:1;justify-content:center;min-width:160px">
          💾 حفظ واختبار الاتصال
        </button>
        <button class="btn btn-ghost btn-sm" onclick="syncToSupabase()" ${!isConnected?'disabled':''}>
          🔄 مزامنة الآن
        </button>
        <button class="btn btn-ghost btn-sm" onclick="clearSupabaseConfig()">
          🗑️ مسح الإعدادات
        </button>
      </div>

      <!-- Test Result -->
      <div id="sbTestResult" style="display:none;padding:0.75rem 1rem;border-radius:10px;font-size:0.82rem;margin-bottom:0.8rem"></div>

      <!-- Info Box -->
      <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:1rem;font-size:0.75rem">
        <div style="font-weight:800;color:var(--muted);margin-bottom:0.6rem">📋 كيفية الحصول على بيانات Supabase:</div>
        <div style="color:var(--dim);line-height:1.8">
          1. اذهب إلى <a href="https://supabase.com" target="_blank" style="color:var(--green)">supabase.com</a> وأنشئ مشروعاً مجانياً<br>
          2. افتح <strong style="color:var(--text)">Settings → API</strong> في لوحة تحكم Supabase<br>
          3. انسخ <strong style="color:var(--text)">Project URL</strong> و <strong style="color:var(--text)">anon public key</strong><br>
          4. قم بتشغيل ملف <code style="background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:4px">supabase-schema.sql</code> في <strong style="color:var(--text)">SQL Editor</strong>
        </div>
        <div style="margin-top:0.8rem;display:flex;gap:0.5rem">
          <a href="https://supabase.com/dashboard" target="_blank" class="btn btn-ghost btn-sm" style="font-size:0.72rem">
            🌐 فتح Supabase Dashboard
          </a>
          <button class="btn btn-ghost btn-sm" onclick="downloadSchema()" style="font-size:0.72rem">
            📥 تحميل schema.sql
          </button>
        </div>
      </div>

      <!-- Sync Status -->
      ${isConnected ? `
      <div style="margin-top:0.8rem;padding:0.8rem;background:rgba(52,195,143,0.05);border-radius:10px;border:1px solid rgba(52,195,143,0.15)">
        <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:#34C38F;font-weight:700">
          <span>✅</span>
          <span>متصل بـ Supabase — البيانات تتزامن تلقائياً</span>
        </div>
        <div style="font-size:0.68rem;color:var(--dim);margin-top:0.3rem">
          URL: <span style="font-family:monospace;color:var(--muted)">${cfg.url||'—'}</span>
        </div>
      </div>` : ''}
    </div>`;
  }
};

// ─── دوال الإعدادات (Global) ─────────────────────────────
async function saveSupabaseConfig() {
  const url = (document.getElementById('sbUrl')?.value || '').trim();
  const key = (document.getElementById('sbKey')?.value || '').trim();
  const resultEl = document.getElementById('sbTestResult');

  if (!url || !key) {
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.style.background = 'rgba(240,78,106,0.1)';
      resultEl.style.color = '#F79FA9';
      resultEl.textContent = '❌ يرجى إدخال Project URL و Anon Key';
    }
    return;
  }

  if (resultEl) {
    resultEl.style.display = 'block';
    resultEl.style.background = 'rgba(232,184,75,0.08)';
    resultEl.style.color = 'var(--gold)';
    resultEl.innerHTML = '⏳ جاري اختبار الاتصال...';
  }

  // حفظ الإعدادات
  SUPABASE_CONFIG.save(url, key);
  SupabaseClient.init(url, key);

  // اختبار الاتصال
  try {
    const ok = await SupabaseClient.testConnection();
    if (ok) {
      DBHybrid._useSupabase = true;
      DBHybrid._reconnectAttempts = 0;
      DBHybrid._startHeartbeat();
      DBHybrid._setupNetworkEvents();
      if (resultEl) {
        resultEl.style.background = 'rgba(52,195,143,0.1)';
        resultEl.style.color = '#34C38F';
        resultEl.innerHTML = '✅ تم الاتصال بـ Supabase بنجاح! البيانات ستُزامن تلقائياً.';
      }
      // تحديث badge الحالة
      const badge = document.getElementById('sbStatusBadge');
      if (badge) {
        badge.style.background = 'rgba(52,195,143,0.1)';
        badge.style.color = '#34C38F';
        badge.textContent = '🟢 متصل بـ Supabase';
      }
      typeof Toast !== 'undefined' && Toast.success('✅ تم الاتصال بـ Supabase!');

      // مزامنة أولية
      setTimeout(() => syncToSupabase(), 500);
    } else {
      if (resultEl) {
        resultEl.style.background = 'rgba(240,78,106,0.1)';
        resultEl.style.color = '#F79FA9';
        resultEl.innerHTML = '❌ فشل الاتصال — تأكد من صحة URL والـ Key، وتأكد من تشغيل schema.sql';
      }
      SUPABASE_CONFIG.save('', '');
    }
  } catch (e) {
    if (resultEl) {
      resultEl.style.background = 'rgba(240,78,106,0.1)';
      resultEl.style.color = '#F79FA9';
      resultEl.innerHTML = `❌ خطأ: ${e.message}`;
    }
  }
}

async function syncToSupabase() {
  if (!DBHybrid._useSupabase) {
    typeof Toast !== 'undefined' && Toast.warn('⚠️ لم يتم الاتصال بـ Supabase بعد');
    return;
  }
  const tables = ['plans','tenants','users','projects','workers','equipment','transactions','attendance','materials','invoices','salary_records','kanban_tasks','documents','obligations','notes'];
  let synced = 0;
  for (const t of tables) {
    const data = DBHybrid.get(t);
    if (data.length) {
      await DBHybrid._syncTableToSupabase(t, data).catch(() => {});
      synced++;
    }
  }
  typeof Toast !== 'undefined' && Toast.success(`✅ تمت مزامنة ${synced} جداول بنجاح`);
}

function clearSupabaseConfig() {
  if (!confirm('هل تريد مسح إعدادات Supabase؟ ستعمل البيانات محلياً فقط.')) return;
  SUPABASE_CONFIG.save('', '');
  DBHybrid._useSupabase = false;
  DBHybrid._stopHeartbeat();     // أوقف المراقبة
  DBHybrid._cancelReconnect();   // ألغِ إعادة الاتصال
  DBHybrid._networkEventsSetup = false; // أعد تهيئة events لو أُعيد الاتصال لاحقاً
  typeof App !== 'undefined' && App.navigate('settings');
}

function downloadSchema() {
  const sql = `-- SmartStruct Supabase Schema
-- قم بتشغيل هذا الملف في Supabase SQL Editor
-- https://app.supabase.com -> SQL Editor

-- تأكد من قراءة الملف supabase-schema.sql الكامل المرفق مع المشروع
-- أو تنزيله من لوحة التحكم

SELECT 'Please run supabase-schema.sql in your Supabase SQL Editor' as instructions;`;

  const blob = new Blob([sql], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'supabase-schema.sql';
  a.click();
}

// ─── تهيئة تلقائية عند تحميل الصفحة ──────────────────────
(async function initDB() {
  if (SUPABASE_CONFIG.load()) {
    SupabaseClient.init(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    // محاولة الاتصال في الخلفية
    DBHybrid.initSupabase().catch(() => {});
  }
})();
