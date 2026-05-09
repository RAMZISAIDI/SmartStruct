/* ════════════════════════════════════════════════════════════════════
   SmartStruct v7.2 — ملف الميزات المتقدمة
   ════════════════════════════════════════════════════════════════════
   يحتوي على:
   ① Crypto         — تشفير كلمات المرور (PBKDF2 SHA-256)
   ② AuditLog       — سجل كل التعديلات
   ③ Backup         — نسخ احتياطي تلقائي + استعادة
   ④ AIReports      — تقارير ذكية بالعربية (Groq)
   ⑤ AIChatbot      — مساعد محادثاتي
   ⑥ PDFGenerator   — فواتير/عقود PDF
   ⑦ CashFlow       — توقعات السيولة
   ⑧ MobileMode     — صفحة مُبسَّطة للميدان
   ⑨ EquipmentGPS   — تتبع المعدات بـ QR
   ⑩ RoleBuilder    — أدوار مخصصة
   ⑪ BankImport     — استيراد كشوف البنوك
   ⑫ ESignature     — توقيع إلكتروني
   ⑬ ContractGen    — مولد عقود قانونية
   ⑭ Tenders        — مقارنة عروض الموردين
   ⑮ GanttDnD       — Gantt drag & drop
   ⑯ TimeTracking   — حضور بالساعات
   ⑰ DashboardWidgets — لوحة قابلة للتخصيص
   ⑱ Themes         — Dark/Light/Gold
   ⑲ QuickWins      — Search, Shortcuts, Bulk, Excel, Print, Onboarding
   ════════════════════════════════════════════════════════════════════ */

(function() {
'use strict';

// ════════════════════════════════════════════════════════════════════
//  ① Crypto — تشفير كلمات المرور (Web Crypto API — لا حاجة لمكتبات خارجية)
// ════════════════════════════════════════════════════════════════════
window.SmartCrypto = {
  // PBKDF2 + SHA-256 + 100k iterations + random salt
  async hash(password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(password), { name:'PBKDF2' }, false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' },
      baseKey, 256
    );
    const hash = new Uint8Array(bits);
    return 'pbkdf2$100000$' + this._b64(salt) + '$' + this._b64(hash);
  },

  async verify(password, stored) {
    if (!stored || typeof stored !== 'string') return false;
    // كلمة مرور قديمة (نص عادي) — للتوافق فقط
    if (!stored.startsWith('pbkdf2$')) return password === stored;
    const parts = stored.split('$');
    if (parts.length !== 4) return false;
    const iters = parseInt(parts[1]);
    const salt = this._fromB64(parts[2]);
    const expected = parts[3];
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(password), { name:'PBKDF2' }, false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name:'PBKDF2', salt, iterations:iters, hash:'SHA-256' },
      baseKey, 256
    );
    const got = this._b64(new Uint8Array(bits));
    return got === expected;
  },

  isHashed(s) { return typeof s === 'string' && s.startsWith('pbkdf2$'); },

  _b64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  },
  _fromB64(b64) {
    const s = atob(b64);
    const u8 = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
    return u8;
  }
};

// ════════════════════════════════════════════════════════════════════
//  ② AuditLog — سجل التعديلات
// ════════════════════════════════════════════════════════════════════
window.AuditLog = {
  // الجداول التي تستحق التتبّع (نتجاهل التغييرات الكثيرة جداً مثل notifications)
  TRACKED: new Set(['projects','workers','transactions','invoices','salary_records',
                    'materials','equipment','users','tenants','documents','obligations',
                    'tender_offers','bank_transactions']),

  log(action, table, recordId, beforeData = null, afterData = null) {
    if (!this.TRACKED.has(table) && action !== 'login' && action !== 'logout') return;

    const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
    if (!user) return;

    const entry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      tenant_id: user.tenant_id || null,
      user_id: user.id,
      user_email: user.email,
      action,
      table_name: table,
      record_id: recordId || null,
      before_data: beforeData,
      after_data: afterData,
      user_agent: navigator.userAgent.substring(0, 200),
      ip_address: null,  // يُحدَّد من السيرفر
      created_at: new Date().toISOString()
    };

    try {
      const logs = (typeof DB !== 'undefined' && DB.get) ? (DB.get('audit_log') || []) : [];
      logs.unshift(entry);
      if (logs.length > 1000) logs.length = 1000;  // الاحتفاظ بآخر 1000 سجل محلياً
      DB.set('audit_log', logs);
      // مزامنة مع Supabase
      if (typeof sbSync === 'function') {
        sbSync('audit_log', entry, 'POST').catch(()=>{});
      }
    } catch(e) { console.warn('AuditLog.log failed:', e); }
  },

  // الحصول على سجلات المؤسسة الحالية مع فلترة
  getLogs(filters = {}) {
    const user = Auth.getUser();
    if (!user) return [];
    let logs = DB.get('audit_log') || [];
    if (!user.is_admin) {
      logs = logs.filter(l => l.tenant_id === user.tenant_id);
    }
    if (filters.action) logs = logs.filter(l => l.action === filters.action);
    if (filters.table)  logs = logs.filter(l => l.table_name === filters.table);
    if (filters.user_id) logs = logs.filter(l => l.user_id === filters.user_id);
    return logs;
  }
};

// ════════════════════════════════════════════════════════════════════
//  ③ Backup — نسخ احتياطي
// ════════════════════════════════════════════════════════════════════
window.SmartBackup = {
  TABLES: ['projects','workers','equipment','transactions','attendance','materials',
           'stock_movements','invoices','salary_records','kanban_tasks','documents',
           'obligations','notes','tenders','tender_offers','bank_transactions'],

  // تصدير JSON كامل
  exportAll() {
    const user = Auth.getUser();
    if (!user) return;
    const data = {
      exported_at: new Date().toISOString(),
      tenant_id:   user.tenant_id,
      tenant_name: (Auth.getTenant() || {}).name,
      app_version: 'SmartStruct v7.2',
      tables: {}
    };

    this.TABLES.forEach(t => {
      const all = DB.get(t) || [];
      data.tables[t] = user.is_admin ? all : all.filter(r => r.tenant_id === user.tenant_id);
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `smartstruct_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    if (typeof Toast !== 'undefined') Toast.success('✅ تم تصدير النسخة الاحتياطية');
    AuditLog.log('export', 'backup', null, null, { tables: Object.keys(data.tables).length });
  },

  // استيراد من ملف
  async importFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.tables) throw new Error('ملف غير صالح');

      const user = Auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول');

      if (!confirm('⚠️ هذا سيستبدل بياناتك الحالية! هل أنت متأكد؟')) return;

      let imported = 0;
      for (const [table, rows] of Object.entries(data.tables)) {
        if (!Array.isArray(rows)) continue;
        // ادمج مع البيانات المحلية بدلاً من الاستبدال الكامل
        const existing = DB.get(table) || [];
        const existingIds = new Set(existing.map(r => r.id));
        const newOnes = rows.filter(r => !existingIds.has(r.id));
        DB.set(table, [...existing, ...newOnes]);
        imported += newOnes.length;
        // ارفع للسحابة
        for (const row of newOnes) {
          if (typeof sbSync === 'function') {
            sbSync(table, row, 'POST').catch(()=>{});
          }
        }
      }

      if (typeof Toast !== 'undefined') Toast.success(`✅ تم استيراد ${imported} سجل بنجاح`);
      AuditLog.log('import', 'backup', null, null, { count: imported });
      setTimeout(() => location.reload(), 1500);
    } catch(e) {
      console.error('Backup.import error:', e);
      if (typeof Toast !== 'undefined') Toast.error('❌ فشل الاستيراد: ' + e.message);
    }
  },

  // تذكير أسبوعي بالنسخ الاحتياطي
  checkReminder() {
    const last = localStorage.getItem('sbtp_last_backup');
    if (!last) return false;
    const days = (Date.now() - parseInt(last)) / 86400000;
    if (days >= 7) {
      if (typeof Toast !== 'undefined') {
        Toast.warn('⏰ مرّ أسبوع منذ آخر نسخة احتياطية. يُنصح بأخذ نسخة الآن.', 8000);
      }
      return true;
    }
    return false;
  },

  markBackup() { localStorage.setItem('sbtp_last_backup', String(Date.now())); }
};

// ════════════════════════════════════════════════════════════════════
//  ④ AIReports — تقارير ذكية
// ════════════════════════════════════════════════════════════════════
window.AIReports = {
  async _getApiKey() {
    try {
      const cfg = (typeof getAIConfig === 'function') ? getAIConfig() : null;
      if (cfg?.apiKey && cfg.status === 'active') return cfg;
      // استخدم DEFAULT_AI_CONFIG كاحتياطي
      if (typeof DEFAULT_AI_CONFIG !== 'undefined' && DEFAULT_AI_CONFIG.apiKey) {
        return DEFAULT_AI_CONFIG;
      }
    } catch(_) {}
    return null;
  },

  async generateMonthlyReport() {
    const cfg = await this._getApiKey();
    if (!cfg || !cfg.apiKey) {
      if (typeof Toast !== 'undefined') Toast.error('⚠️ AI غير مفعّل — اطلب من المسؤول إعداده');
      return null;
    }

    const user = Auth.getUser();
    const tid = user?.tenant_id;
    if (!tid) return null;

    // جمع البيانات
    const projects = (DB.get('projects') || []).filter(p => p.tenant_id === tid);
    const workers  = (DB.get('workers') || []).filter(w => w.tenant_id === tid);
    const txs      = (DB.get('transactions') || []).filter(t => t.tenant_id === tid);
    const materials = (DB.get('materials') || []).filter(m => m.tenant_id === tid);

    // إحصائيات
    const totalRevenue = txs.filter(t => t.type === 'revenue').reduce((s,t) => s+Number(t.amount||0), 0);
    const totalExpense = txs.filter(t => t.type === 'expense').reduce((s,t) => s+Number(t.amount||0), 0);
    const profit = totalRevenue - totalExpense;
    const activeProj = projects.filter(p => p.status === 'active').length;
    const delayedProj = projects.filter(p => p.status === 'delayed').length;
    const lowStock = materials.filter(m => Number(m.quantity) <= Number(m.min_quantity));

    const summary = {
      مشاريع_نشطة: activeProj,
      مشاريع_متأخرة: delayedProj,
      عدد_العمال: workers.length,
      إجمالي_الإيرادات: totalRevenue,
      إجمالي_المصروفات: totalExpense,
      الربح: profit,
      مواد_منخفضة_المخزون: lowStock.length,
      أبرز_المشاريع: projects.slice(0,3).map(p => ({
        اسم:p.name, ميزانية:p.budget, مصروف:p.total_spent, تقدم:p.progress
      }))
    };

    const prompt = `أنت محلل مالي خبير لشركة بناء جزائرية. اكتب تقريراً شهرياً احترافياً بناءً على هذه البيانات:

${JSON.stringify(summary, null, 2)}

التقرير يجب أن يحتوي على:
1. ملخص تنفيذي (3 أسطر)
2. أبرز الإنجازات
3. النقاط المقلقة
4. توصيات عملية محددة (3-5 نقاط)

اكتب بالعربية الفصحى المهنية، مختصراً ومركزاً (لا تتجاوز 400 كلمة). استخدم تنسيق Markdown مع عناوين.`;

    if (typeof Toast !== 'undefined') Toast.info('🤖 جاري توليد التقرير...');

    try {
      const res = await fetch(cfg.endpoint || 'https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: cfg.model || 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'أنت محلل مالي خبير في قطاع البناء الجزائري. تكتب تقارير احترافية موجزة بالعربية.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch(e) {
      console.error('AIReports error:', e);
      if (typeof Toast !== 'undefined') Toast.error('❌ فشل توليد التقرير: ' + e.message);
      return null;
    }
  },

  async showReportModal() {
    const report = await this.generateMonthlyReport();
    if (!report) return;
    const html = this._mdToHtml(report);

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.innerHTML = `
      <div style="background:#1a1f2e;border:1px solid rgba(212,175,55,.3);border-radius:16px;max-width:800px;width:100%;max-height:90vh;overflow-y:auto;padding:2rem;color:#E0E0E0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <h2 style="color:#D4AF37;margin:0">📊 التقرير الشهري الذكي</h2>
          <button onclick="this.closest('div').parentElement.remove()" style="background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer">×</button>
        </div>
        <div style="line-height:1.8;font-size:.95rem">${html}</div>
        <div style="margin-top:1.5rem;display:flex;gap:.5rem;flex-wrap:wrap">
          <button onclick="AIReports.printReport()" style="padding:.7rem 1.2rem;background:#4A90E2;color:#fff;border:none;border-radius:8px;cursor:pointer">🖨️ طباعة</button>
          <button onclick="AIReports.copyReport()" style="padding:.7rem 1.2rem;background:#34C38F;color:#fff;border:none;border-radius:8px;cursor:pointer">📋 نسخ</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    this._lastReport = report;
  },

  _mdToHtml(md) {
    return md
      .replace(/^### (.*?)$/gm, '<h3 style="color:#D4AF37;margin:1rem 0 .5rem">$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2 style="color:#D4AF37;margin:1.2rem 0 .7rem">$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1 style="color:#D4AF37;margin:1.5rem 0 1rem">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#FFD700">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*?)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/gm, m => '<ul style="margin:.5rem 0;padding-right:1.5rem">' + m + '</ul>')
      .replace(/\n\n/g, '<br><br>');
  },

  printReport() { window.print(); },
  copyReport() {
    if (this._lastReport) {
      navigator.clipboard.writeText(this._lastReport);
      if (typeof Toast !== 'undefined') Toast.success('📋 تم النسخ');
    }
  }
};

// ════════════════════════════════════════════════════════════════════
//  ⑤ AIChatbot — مساعد محادثاتي
// ════════════════════════════════════════════════════════════════════
window.AIChatbot = {
  _open: false,
  _messages: [],

  _buildContext() {
    const user = Auth.getUser();
    if (!user) return '';
    const tid = user.tenant_id;
    const tenant = Auth.getTenant() || {};

    const projects = (DB.get('projects') || []).filter(p => p.tenant_id === tid);
    const workers  = (DB.get('workers') || []).filter(w => w.tenant_id === tid);
    const txs      = (DB.get('transactions') || []).filter(t => t.tenant_id === tid);
    const materials = (DB.get('materials') || []).filter(m => m.tenant_id === tid);

    return `أنت "ذكي" — المساعد الذكي لـ SmartStruct (نظام إدارة شركات البناء الجزائرية).
المؤسسة: ${tenant.name || '—'}
المستخدم: ${user.full_name || '—'} (${user.role || '—'})

البيانات الحالية:
- المشاريع (${projects.length}): ${JSON.stringify(projects.map(p => ({id:p.id,name:p.name,budget:p.budget,spent:p.total_spent,progress:p.progress,status:p.status})).slice(0,20))}
- العمال (${workers.length}): ${JSON.stringify(workers.map(w => ({name:w.full_name,role:w.role,salary:w.daily_salary,project:w.project_id})).slice(0,30))}
- المعاملات الأخيرة (${txs.length}): ${JSON.stringify(txs.slice(-15).map(t => ({date:t.date,type:t.type,amount:t.amount,desc:t.description,project:t.project_id})))}
- المخزون (${materials.length}): ${JSON.stringify(materials.map(m => ({name:m.name,qty:m.quantity,min:m.min_quantity,price:m.unit_price})))}

تعليمات:
1. أجب بالعربية الفصحى دائماً
2. كن مختصراً ومركزاً (3-5 أسطر للأسئلة البسيطة)
3. استخدم الأرقام والإحصائيات من البيانات أعلاه
4. اقترح إجراءات عملية عند الحاجة
5. إذا سألك عن بيانات ليست لديك، قل ذلك بوضوح`;
  },

  toggle() {
    if (this._open) this.close();
    else this.open();
  },

  open() {
    if (document.getElementById('ai-chat-panel')) return;
    this._open = true;
    const panel = document.createElement('div');
    panel.id = 'ai-chat-panel';
    panel.innerHTML = `
      <style>
        #ai-chat-panel{position:fixed;bottom:20px;left:20px;width:380px;max-width:calc(100vw - 40px);
          height:560px;max-height:calc(100vh - 100px);background:#1a1f2e;border:1px solid rgba(212,175,55,.3);
          border-radius:16px;z-index:9998;display:flex;flex-direction:column;
          box-shadow:0 20px 60px rgba(0,0,0,.5);direction:rtl;animation:aicSlide .3s ease}
        @keyframes aicSlide{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        .aic-head{padding:1rem 1.25rem;border-bottom:1px solid rgba(255,255,255,.08);
          display:flex;justify-content:space-between;align-items:center;
          background:linear-gradient(135deg,rgba(212,175,55,.1),transparent)}
        .aic-title{color:#D4AF37;font-weight:700}
        .aic-close{background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer;padding:.2rem .5rem}
        .aic-msgs{flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.75rem}
        .aic-msg{max-width:85%;padding:.7rem .9rem;border-radius:12px;line-height:1.6;font-size:.9rem;white-space:pre-wrap}
        .aic-msg.user{align-self:flex-end;background:#4A90E2;color:#fff;border-bottom-left-radius:4px}
        .aic-msg.bot{align-self:flex-start;background:rgba(255,255,255,.06);color:#E0E0E0;border-bottom-right-radius:4px}
        .aic-msg.thinking{align-self:flex-start;background:rgba(212,175,55,.1);color:#D4AF37;font-style:italic}
        .aic-input-row{padding:.75rem;border-top:1px solid rgba(255,255,255,.08);display:flex;gap:.5rem}
        .aic-input{flex:1;padding:.7rem .9rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
          border-radius:10px;color:#fff;font-family:inherit;font-size:.9rem;outline:none}
        .aic-input:focus{border-color:#D4AF37}
        .aic-send{padding:.7rem 1rem;background:linear-gradient(135deg,#D4AF37,#B8941F);color:#0a0e1a;
          border:none;border-radius:10px;font-weight:700;cursor:pointer}
        .aic-suggestions{padding:0 1rem;display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.75rem}
        .aic-sug{padding:.4rem .7rem;background:rgba(74,144,226,.1);border:1px solid rgba(74,144,226,.3);
          color:#88C2F2;border-radius:20px;font-size:.78rem;cursor:pointer;white-space:nowrap}
        .aic-sug:hover{background:rgba(74,144,226,.2)}
        #ai-chat-toggle{position:fixed;bottom:20px;left:20px;width:56px;height:56px;border-radius:50%;
          background:linear-gradient(135deg,#D4AF37,#B8941F);border:none;color:#0a0e1a;font-size:1.5rem;
          cursor:pointer;z-index:9997;box-shadow:0 6px 20px rgba(212,175,55,.4);animation:aicPulse 2s infinite}
        @keyframes aicPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
      </style>
      <div class="aic-head">
        <div class="aic-title">🤖 المساعد الذكي</div>
        <button class="aic-close" onclick="AIChatbot.close()">×</button>
      </div>
      <div class="aic-msgs" id="aic-msgs">
        <div class="aic-msg bot">مرحباً! أنا "ذكي"، مساعدك الذكي. اسألني أي شيء عن مشاريعك، عمالك، أو أموالك. مثلاً:</div>
      </div>
      <div class="aic-suggestions">
        <button class="aic-sug" onclick="AIChatbot.askSug('كم صرفت هذا الشهر؟')">كم صرفت هذا الشهر؟</button>
        <button class="aic-sug" onclick="AIChatbot.askSug('من العمال غابوا أكثر هذا الأسبوع؟')">العمال الغائبون</button>
        <button class="aic-sug" onclick="AIChatbot.askSug('أي مشروع يحقق أكبر ربح؟')">أكثر مشروع ربحاً</button>
        <button class="aic-sug" onclick="AIChatbot.askSug('ما المواد التي على وشك النفاد؟')">مواد قاربت النفاد</button>
      </div>
      <div class="aic-input-row">
        <input class="aic-input" id="aic-input" placeholder="اكتب سؤالك..." onkeydown="if(event.key==='Enter')AIChatbot.send()">
        <button class="aic-send" onclick="AIChatbot.send()">إرسال</button>
      </div>`;
    document.body.appendChild(panel);
    setTimeout(() => document.getElementById('aic-input')?.focus(), 100);
    // إخفاء زر التبديل
    const tog = document.getElementById('ai-chat-toggle');
    if (tog) tog.style.display = 'none';
  },

  close() {
    document.getElementById('ai-chat-panel')?.remove();
    this._open = false;
    const tog = document.getElementById('ai-chat-toggle');
    if (tog) tog.style.display = '';
  },

  askSug(q) {
    const input = document.getElementById('aic-input');
    if (input) { input.value = q; this.send(); }
  },

  async send() {
    const input = document.getElementById('aic-input');
    const text = (input?.value || '').trim();
    if (!text) return;
    input.value = '';

    const msgs = document.getElementById('aic-msgs');
    if (!msgs) return;

    // رسالة المستخدم
    const userDiv = document.createElement('div');
    userDiv.className = 'aic-msg user';
    userDiv.textContent = text;
    msgs.appendChild(userDiv);

    // رسالة "يفكر..."
    const thinkDiv = document.createElement('div');
    thinkDiv.className = 'aic-msg thinking';
    thinkDiv.textContent = '🤔 يفكر...';
    msgs.appendChild(thinkDiv);
    msgs.scrollTop = msgs.scrollHeight;

    this._messages.push({ role: 'user', content: text });

    try {
      const cfg = (typeof getAIConfig === 'function') ? getAIConfig() : null;
      const apiKey = cfg?.apiKey || (window.DEFAULT_AI_CONFIG && DEFAULT_AI_CONFIG.apiKey);
      if (!apiKey) throw new Error('AI غير مفعّل');

      const res = await fetch(cfg?.endpoint || 'https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cfg?.model || 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: this._buildContext() },
            ...this._messages.slice(-10)  // آخر 10 رسائل لحفظ السياق
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '(لم يصلني رد)';

      thinkDiv.remove();
      const botDiv = document.createElement('div');
      botDiv.className = 'aic-msg bot';
      botDiv.textContent = reply;
      msgs.appendChild(botDiv);
      msgs.scrollTop = msgs.scrollHeight;

      this._messages.push({ role: 'assistant', content: reply });

      // حفظ المحادثة
      this._saveConversation();
    } catch(e) {
      thinkDiv.remove();
      const errDiv = document.createElement('div');
      errDiv.className = 'aic-msg bot';
      errDiv.style.color = '#F04E6A';
      errDiv.textContent = '❌ خطأ: ' + e.message;
      msgs.appendChild(errDiv);
    }
  },

  _saveConversation() {
    const user = Auth.getUser();
    if (!user) return;
    try {
      const conv = {
        id: this._convId || (this._convId = Date.now()),
        tenant_id: user.tenant_id,
        user_id: user.id,
        messages: this._messages,
        title: this._messages[0]?.content?.substring(0,60) || 'محادثة',
        updated_at: new Date().toISOString()
      };
      const all = DB.get('ai_conversations') || [];
      const idx = all.findIndex(c => c.id === conv.id);
      if (idx >= 0) all[idx] = conv;
      else all.unshift(conv);
      DB.set('ai_conversations', all);
      if (typeof sbSync === 'function') sbSync('ai_conversations', conv, idx >= 0 ? 'PATCH' : 'POST').catch(()=>{});
    } catch(_) {}
  },

  // إضافة الزر العائم
  mount() {
    if (document.getElementById('ai-chat-toggle')) return;
    const user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
    if (!user || user.is_admin) return;

    const btn = document.createElement('button');
    btn.id = 'ai-chat-toggle';
    btn.innerHTML = '🤖';
    btn.title = 'المساعد الذكي';
    btn.onclick = () => AIChatbot.toggle();
    document.body.appendChild(btn);
  }
};

// ════════════════════════════════════════════════════════════════════
//  ⑥ PDFGenerator — توليد PDF احترافي
// ════════════════════════════════════════════════════════════════════
window.PDFGenerator = {
  _ensureLib() {
    if (window.jspdf) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = () => res();
      s.onerror = () => rej(new Error('فشل تحميل مكتبة PDF'));
      document.head.appendChild(s);
    });
  },

  async invoice(invoiceId) {
    await this._ensureLib();
    const inv = (DB.get('invoices') || []).find(i => i.id === invoiceId);
    if (!inv) { Toast.error('الفاتورة غير موجودة'); return; }

    const tenant = Auth.getTenant() || {};
    const project = (DB.get('projects') || []).find(p => p.id === inv.project_id);

    // jspdf لا يدعم العربية تلقائياً — نستخدم HTML→print كحل عملي وأنيق
    const html = this._invoiceHTML(inv, tenant, project);
    this._printHTML(html, `فاتورة_${inv.number || inv.id}`);
    AuditLog.log('export', 'invoices', inv.id, null, { format: 'pdf' });
  },

  _invoiceHTML(inv, tenant, project) {
    const ht = Number(inv.amount_ht || (inv.amount / 1.19).toFixed(0));
    const tva = Number(inv.tva_amount || (inv.amount - ht).toFixed(0));
    const total = Number(inv.amount || 0);
    const dt = inv.date || new Date().toISOString().split('T')[0];
    const due = inv.due_date || '';

    return `
<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>فاتورة ${inv.number}</title>
<style>
  @page { size:A4; margin:1.5cm }
  body { font-family:'Tajawal','Arial',sans-serif; color:#1a1a1a; line-height:1.6 }
  .header { display:flex; justify-content:space-between; border-bottom:3px solid #D4AF37; padding-bottom:1rem; margin-bottom:2rem }
  .logo { font-size:1.8rem; font-weight:900; color:#D4AF37 }
  .company { text-align:left; font-size:.85rem; color:#555 }
  .title { text-align:center; font-size:2rem; font-weight:900; margin:1rem 0; color:#1a1a1a }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:2rem; margin:2rem 0 }
  .info-block { background:#f8f9fa; padding:1rem; border-radius:8px; border-right:3px solid #D4AF37 }
  .info-block h3 { margin:0 0 .5rem; color:#D4AF37; font-size:.95rem }
  .info-block p { margin:.2rem 0; font-size:.9rem }
  table { width:100%; border-collapse:collapse; margin:2rem 0 }
  th { background:#D4AF37; color:#fff; padding:.7rem; text-align:right }
  td { padding:.7rem; border-bottom:1px solid #ddd }
  .totals { width:50%; margin-right:auto; margin-top:1rem }
  .totals tr td:first-child { font-weight:700; text-align:left }
  .totals .total-row { background:#D4AF37; color:#fff; font-size:1.1rem }
  .footer { margin-top:3rem; padding-top:1rem; border-top:1px solid #ddd; text-align:center; font-size:.8rem; color:#777 }
  .stamp { margin-top:2rem; text-align:left; padding:1rem; border:2px dashed #D4AF37; border-radius:8px; display:inline-block }
  @media print { body { -webkit-print-color-adjust:exact } }
</style></head><body>

<div class="header">
  <div>
    <div class="logo">${tenant.logo_url ? `<img src="${tenant.logo_url}" style="height:60px">` : (tenant.name || 'مؤسستي')}</div>
    <div style="font-size:.8rem;color:#777;margin-top:.3rem">${tenant.address || ''} ${tenant.wilaya || ''}</div>
  </div>
  <div class="company">
    <strong>الرقم الجبائي (NIF):</strong> ${tenant.nif || '—'}<br>
    <strong>السجل التجاري (RC):</strong> ${tenant.rc_number || '—'}<br>
    <strong>الرقم الإحصائي (NIS):</strong> ${tenant.nis || '—'}<br>
    <strong>الهاتف:</strong> ${tenant.phone || '—'}
  </div>
</div>

<div class="title">فاتورة رقم ${inv.number || '#'+inv.id}</div>

<div class="info-grid">
  <div class="info-block">
    <h3>📋 معلومات الفاتورة</h3>
    <p><strong>التاريخ:</strong> ${dt}</p>
    <p><strong>تاريخ الاستحقاق:</strong> ${due || '—'}</p>
    <p><strong>الحالة:</strong> ${inv.status === 'paid' ? '✅ مدفوعة' : inv.status === 'overdue' ? '⚠️ متأخرة' : '⏳ غير مدفوعة'}</p>
    <p><strong>طريقة الدفع:</strong> ${inv.payment_method || '—'}</p>
  </div>
  <div class="info-block">
    <h3>👤 معلومات العميل</h3>
    <p><strong>الاسم:</strong> ${inv.client || '—'}</p>
    <p><strong>المشروع:</strong> ${project?.name || '—'}</p>
  </div>
</div>

<table>
  <thead>
    <tr><th>الوصف</th><th style="width:25%;text-align:left">المبلغ</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>${inv.description || 'خدمات وأشغال'}</td>
      <td style="text-align:left">${ht.toLocaleString('fr-DZ')} دج</td>
    </tr>
  </tbody>
</table>

<table class="totals">
  <tr><td>المبلغ خارج الرسم (HT):</td><td style="text-align:left">${ht.toLocaleString('fr-DZ')} دج</td></tr>
  <tr><td>الرسم على القيمة المضافة (TVA 19%):</td><td style="text-align:left">${tva.toLocaleString('fr-DZ')} دج</td></tr>
  <tr class="total-row"><td>المبلغ الإجمالي (TTC):</td><td style="text-align:left">${total.toLocaleString('fr-DZ')} دج</td></tr>
</table>

<div class="stamp">
  <strong>توقيع وختم المؤسسة</strong>
  ${tenant.stamp_url ? `<br><img src="${tenant.stamp_url}" style="height:80px;margin-top:.5rem">` : '<br><br><br><br>'}
</div>

<div class="footer">
  <p>شكراً لثقتكم — ${tenant.name || 'SmartStruct'}</p>
  <p>هذه الفاتورة مولّدة آلياً عبر نظام SmartStruct</p>
</div>

</body></html>`;
  },

  _printHTML(html, filename) {
    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) { Toast.error('السماح بالنوافذ المنبثقة مطلوب'); return; }
    w.document.write(html);
    w.document.close();
    w.document.title = filename;
    setTimeout(() => { w.focus(); w.print(); }, 500);
  },

  // مولد عقود قانونية
  contractWorker(workerId) {
    const w = (DB.get('workers') || []).find(x => x.id === workerId);
    if (!w) return;
    const tenant = Auth.getTenant() || {};
    const today = new Date().toLocaleDateString('ar-DZ');

    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>عقد عمل</title>
<style>
  @page{size:A4;margin:2cm}
  body{font-family:'Tajawal','Arial',sans-serif;line-height:2;color:#1a1a1a}
  h1{text-align:center;color:#D4AF37}
  .article{margin:1.5rem 0}
  .article h3{color:#D4AF37;border-bottom:1px solid #D4AF37}
  .signatures{display:flex;justify-content:space-between;margin-top:4rem}
  .sig-block{text-align:center;width:45%}
  .sig-line{border-top:1px solid #1a1a1a;padding-top:.5rem;margin-top:3rem}
</style></head><body>
<h1>عقد عمل محدد المدة</h1>
<p style="text-align:center">الجمهورية الجزائرية الديمقراطية الشعبية</p>
<p>حُرر هذا العقد بتاريخ: ${today}</p>

<p><strong>بين:</strong> مؤسسة <strong>${tenant.name}</strong>، السجل التجاري ${tenant.rc_number || '—'}، الرقم الجبائي ${tenant.nif || '—'}، الكائن مقرها بـ ${tenant.wilaya || '—'}، ويمثلها مديرها (يُشار إليها فيما يلي بـ "صاحب العمل")</p>

<p><strong>والسيد(ة):</strong> ${w.full_name}، رقم الهاتف ${w.phone || '—'}، رقم بطاقة التعريف ${w.national_id || '—'} (يُشار إليه فيما يلي بـ "العامل")</p>

<div class="article"><h3>المادة 1: موضوع العقد</h3>
<p>يلتزم العامل بأداء مهام <strong>${w.role}</strong> لصالح صاحب العمل وفقاً للشروط المحددة في هذا العقد.</p></div>

<div class="article"><h3>المادة 2: مدة العقد</h3>
<p>يبدأ هذا العقد سريانه من تاريخ ${w.hire_date || today}، وهو من نوع: ${w.contract_type === 'monthly' ? 'عقد شهري' : 'عقد يومي'}.</p></div>

<div class="article"><h3>المادة 3: الأجر</h3>
<p>يتقاضى العامل أجراً قدره <strong>${(w.daily_salary || 0).toLocaleString('fr-DZ')} دج/يوم</strong> ${w.contract_type === 'monthly' ? `(أي ${(w.monthly_base || w.daily_salary*26).toLocaleString('fr-DZ')} دج/شهر)` : ''}، يُدفع بنهاية كل شهر.</p></div>

<div class="article"><h3>المادة 4: ساعات العمل</h3>
<p>تكون ساعات العمل وفقاً للقانون الجزائري للعمل (8 ساعات يومياً، 40 ساعة أسبوعياً).</p></div>

<div class="article"><h3>المادة 5: الالتزامات</h3>
<p>يلتزم العامل باحترام النظام الداخلي للمؤسسة، ومعدّات السلامة، وتعليمات المسؤول المباشر.</p></div>

<div class="signatures">
  <div class="sig-block"><strong>صاحب العمل</strong><div class="sig-line">الاسم والتوقيع والختم</div></div>
  <div class="sig-block"><strong>العامل</strong><div class="sig-line">الاسم والتوقيع</div></div>
</div>
</body></html>`;
    this._printHTML(html, `عقد_عمل_${w.full_name}`);
  }
};

// ════════════════════════════════════════════════════════════════════
//  ⑦ CashFlow — توقعات السيولة
// ════════════════════════════════════════════════════════════════════
window.CashFlow = {
  // توقع 90 يوماً قادمة
  forecast() {
    const user = Auth.getUser();
    if (!user) return null;
    const tid = user.tenant_id;

    const txs = (DB.get('transactions') || []).filter(t => t.tenant_id === tid);
    const obligations = (DB.get('obligations') || []).filter(o => o.tenant_id === tid);
    const invoices = (DB.get('invoices') || []).filter(i => i.tenant_id === tid && i.status !== 'paid');

    // الرصيد الحالي
    const currentBalance = txs.reduce((s,t) => s + (t.type === 'revenue' ? Number(t.amount) : -Number(t.amount)), 0);

    // متوسط المصروفات الشهرية (آخر 3 شهور)
    const now = new Date();
    const threeMonthsAgo = new Date(now); threeMonthsAgo.setMonth(now.getMonth() - 3);
    const recentExp = txs.filter(t => t.type === 'expense' && new Date(t.date) >= threeMonthsAgo);
    const monthlyAvgExp = recentExp.reduce((s,t) => s + Number(t.amount), 0) / 3;

    // توقعات يومية
    const days = [];
    let runningBalance = currentBalance;
    for (let d = 0; d < 90; d++) {
      const date = new Date(now); date.setDate(now.getDate() + d);
      const dateStr = date.toISOString().split('T')[0];

      // إيرادات متوقعة (فواتير غير مدفوعة)
      const expectedIncome = invoices
        .filter(i => i.due_date === dateStr)
        .reduce((s,i) => s + Number(i.amount), 0);

      // التزامات
      const expectedExpense = obligations
        .filter(o => o.due === dateStr)
        .reduce((s,o) => s + Number(o.amount), 0);

      // مصروف يومي متوسط
      const dailyExp = monthlyAvgExp / 30;

      runningBalance += expectedIncome - expectedExpense - dailyExp;
      days.push({
        date: dateStr,
        balance: Math.round(runningBalance),
        income: expectedIncome,
        expense: expectedExpense + dailyExp
      });
    }

    return {
      currentBalance: Math.round(currentBalance),
      monthlyAvgExp: Math.round(monthlyAvgExp),
      days,
      criticalDay: days.find(d => d.balance < 0),
      lowestPoint: days.reduce((m, d) => d.balance < m.balance ? d : m, days[0])
    };
  },

  showPanel() {
    const f = this.forecast();
    if (!f) { Toast.error('لا توجد بيانات كافية للتوقع'); return; }

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem';

    const status = f.criticalDay
      ? `<div style="background:rgba(240,78,106,.15);border:1px solid #F04E6A;color:#F79FA9;padding:1rem;border-radius:8px;margin-bottom:1rem">⚠️ <strong>تنبيه:</strong> سيصبح رصيدك سالباً في <strong>${f.criticalDay.date}</strong>. اتخذ إجراءات الآن!</div>`
      : `<div style="background:rgba(52,195,143,.15);border:1px solid #34C38F;color:#86E0B7;padding:1rem;border-radius:8px;margin-bottom:1rem">✅ <strong>الوضع المالي مستقر</strong> خلال الـ 90 يوماً القادمة.</div>`;

    const points = f.days.filter((_, i) => i % 7 === 0);  // كل 7 أيام
    const maxBal = Math.max(...f.days.map(d => d.balance));
    const minBal = Math.min(...f.days.map(d => d.balance));
    const range = maxBal - minBal || 1;

    const svgW = 700, svgH = 200;
    const path = points.map((p, i) => {
      const x = (i / (points.length-1)) * svgW;
      const y = svgH - ((p.balance - minBal) / range) * svgH;
      return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');

    modal.innerHTML = `
      <div style="background:#1a1f2e;border:1px solid rgba(212,175,55,.3);border-radius:16px;max-width:850px;width:100%;max-height:92vh;overflow-y:auto;padding:2rem;color:#E0E0E0;direction:rtl">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
          <h2 style="color:#D4AF37;margin:0">💰 توقعات السيولة (90 يوم)</h2>
          <button onclick="this.closest('div').parentElement.remove()" style="background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer">×</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem">
          <div style="background:rgba(74,144,226,.1);padding:1rem;border-radius:8px">
            <div style="font-size:.8rem;color:#88C2F2">الرصيد الحالي</div>
            <div style="font-size:1.4rem;font-weight:800;color:#fff;margin-top:.3rem">${f.currentBalance.toLocaleString('fr-DZ')} دج</div>
          </div>
          <div style="background:rgba(232,184,75,.1);padding:1rem;border-radius:8px">
            <div style="font-size:.8rem;color:#FFD700">متوسط الصرف الشهري</div>
            <div style="font-size:1.4rem;font-weight:800;color:#fff;margin-top:.3rem">${f.monthlyAvgExp.toLocaleString('fr-DZ')} دج</div>
          </div>
          <div style="background:rgba(${f.lowestPoint.balance < 0 ? '240,78,106' : '52,195,143'},.1);padding:1rem;border-radius:8px">
            <div style="font-size:.8rem;color:${f.lowestPoint.balance < 0 ? '#F79FA9' : '#86E0B7'}">أقل نقطة (${f.lowestPoint.date})</div>
            <div style="font-size:1.4rem;font-weight:800;color:#fff;margin-top:.3rem">${f.lowestPoint.balance.toLocaleString('fr-DZ')} دج</div>
          </div>
        </div>

        ${status}

        <div style="background:rgba(255,255,255,.04);padding:1rem;border-radius:8px;margin-bottom:1rem">
          <h3 style="color:#D4AF37;margin:0 0 .8rem">📈 منحنى الرصيد المتوقع</h3>
          <svg viewBox="0 0 ${svgW} ${svgH+30}" style="width:100%;height:auto">
            <line x1="0" y1="${svgH - ((0 - minBal) / range) * svgH}" x2="${svgW}" y2="${svgH - ((0 - minBal) / range) * svgH}" stroke="#F04E6A" stroke-width="1" stroke-dasharray="4 4" opacity=".5"/>
            <path d="${path}" stroke="#D4AF37" stroke-width="2.5" fill="none"/>
            ${points.map((p,i) => {
              const x = (i / (points.length-1)) * svgW;
              const y = svgH - ((p.balance - minBal) / range) * svgH;
              return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${p.balance < 0 ? '#F04E6A' : '#34C38F'}"/>`;
            }).join('')}
            ${[0, 30, 60, 89].map(i => {
              const x = (i / 89) * svgW;
              return `<text x="${x}" y="${svgH+20}" fill="#888" font-size="11" text-anchor="middle">${f.days[i]?.date.substring(5)}</text>`;
            }).join('')}
          </svg>
        </div>

        <div style="text-align:center;color:#888;font-size:.8rem;margin-top:1rem">
          💡 يعتمد التوقع على متوسط المصروفات الأخيرة + الفواتير غير المدفوعة + الالتزامات المسجّلة
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
};

// ════════════════════════════════════════════════════════════════════
//  ⑧ EquipmentGPS — تتبع المعدات
// ════════════════════════════════════════════════════════════════════
window.EquipmentGPS = {
  async recordLocation(equipmentId, note = '') {
    if (!navigator.geolocation) { Toast.error('GPS غير مدعوم في هذا المتصفح'); return; }
    const user = Auth.getUser();
    if (!user) return;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const rec = {
            id: Date.now(),
            tenant_id: user.tenant_id,
            equipment_id: equipmentId,
            user_id: user.id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            recorded_at: new Date().toISOString(),
            note: note || ''
          };
          const all = DB.get('equipment_locations') || [];
          all.unshift(rec);
          DB.set('equipment_locations', all);
          if (typeof sbSync === 'function') sbSync('equipment_locations', rec, 'POST').catch(()=>{});
          if (typeof Toast !== 'undefined') Toast.success('📍 تم تسجيل الموقع');
          resolve(rec);
        },
        (err) => {
          if (typeof Toast !== 'undefined') Toast.error('❌ تعذّر الحصول على الموقع: ' + err.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  },

  // إنشاء QR code للمعدة
  generateQR(equipmentId) {
    const url = `${location.origin}${location.pathname}?eq=${equipmentId}&action=track`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    const w = window.open('', '_blank');
    const eq = (DB.get('equipment') || []).find(e => e.id === equipmentId) || {};
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>QR ${eq.name}</title>
      <style>body{font-family:Arial;text-align:center;padding:2rem}h1{color:#D4AF37}img{margin:1rem 0}p{color:#666}</style>
      </head><body>
      <h1>${eq.name || 'معدة'}</h1>
      <p>${eq.model || ''} · ${eq.plate_number || ''}</p>
      <img src="${qrUrl}" alt="QR">
      <p style="font-size:.8rem">امسح الكود لتسجيل موقع المعدة</p>
      <button onclick="window.print()" style="padding:.7rem 1.5rem;background:#D4AF37;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨️ طباعة</button>
      </body></html>`);
  },

  // معالجة رابط tracking عند فتح التطبيق
  handleTrackingURL() {
    const params = new URLSearchParams(location.search);
    const eqId = parseInt(params.get('eq'));
    const action = params.get('action');
    if (eqId && action === 'track') {
      const note = prompt('📍 ملاحظة عن الموقع (اختياري):');
      this.recordLocation(eqId, note || '');
      // إزالة المعاملات من URL
      history.replaceState({}, '', location.pathname);
    }
  }
};

// ════════════════════════════════════════════════════════════════════
//  ⑨ MobileMode — وضع الموبايل المُبسَّط للميدان
// ════════════════════════════════════════════════════════════════════
window.MobileMode = {
  show() {
    const user = Auth.getUser();
    if (!user) return;

    const overlay = document.createElement('div');
    overlay.id = 'mobile-mode-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0a0e1a;color:#fff;direction:rtl;overflow-y:auto';
    overlay.innerHTML = `
      <style>
        #mobile-mode-overlay{font-family:'Tajawal',Arial,sans-serif}
        .mm-head{padding:1.5rem 1rem;background:linear-gradient(135deg,#D4AF37,#B8941F);text-align:center}
        .mm-head h2{margin:0;color:#0a0e1a;font-size:1.3rem}
        .mm-head p{margin:.3rem 0 0;color:#0a0e1a;opacity:.8;font-size:.85rem}
        .mm-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;padding:1rem}
        .mm-btn{padding:1.5rem;border-radius:16px;border:none;color:#fff;font-size:1rem;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:.5rem;box-shadow:0 4px 14px rgba(0,0,0,.3);min-height:130px}
        .mm-btn span:first-child{font-size:2.5rem}
        .mm-close{position:fixed;top:1rem;left:1rem;background:rgba(0,0,0,.5);color:#fff;border:none;width:40px;height:40px;border-radius:50%;font-size:1.3rem;cursor:pointer;z-index:1}
      </style>
      <button class="mm-close" onclick="MobileMode.close()">×</button>
      <div class="mm-head">
        <h2>📱 وضع الميدان</h2>
        <p>${user.full_name}</p>
      </div>
      <div class="mm-grid">
        <button class="mm-btn" style="background:linear-gradient(135deg,#34C38F,#2A9F73)" onclick="MobileMode.attendance()">
          <span>👷</span><span>تسجيل حضور</span>
        </button>
        <button class="mm-btn" style="background:linear-gradient(135deg,#4A90E2,#3A75BC)" onclick="MobileMode.materials()">
          <span>📦</span><span>استلام مواد</span>
        </button>
        <button class="mm-btn" style="background:linear-gradient(135deg,#9B6DFF,#7E54D8)" onclick="MobileMode.photo()">
          <span>📸</span><span>صورة موقع</span>
        </button>
        <button class="mm-btn" style="background:linear-gradient(135deg,#FF7043,#E55A2A)" onclick="MobileMode.cashRequest()">
          <span>💰</span><span>طلب صرف</span>
        </button>
        <button class="mm-btn" style="background:linear-gradient(135deg,#E8B84B,#C99A36);grid-column:span 2" onclick="MobileMode.equipmentTrack()">
          <span>🚜</span><span>تسجيل موقع معدة</span>
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  close() { document.getElementById('mobile-mode-overlay')?.remove(); },

  attendance() {
    const user = Auth.getUser();
    const workers = (DB.get('workers') || []).filter(w => w.tenant_id === user.tenant_id && w.is_active !== false);
    if (!workers.length) { alert('لا يوجد عمال'); return; }
    const list = workers.map((w,i) => `${i+1}. ${w.full_name} (${w.role})`).join('\n');
    const idx = parseInt(prompt(`اختر العامل:\n\n${list}\n\nاكتب الرقم:`));
    if (!idx || idx < 1 || idx > workers.length) return;
    const worker = workers[idx-1];

    const today = new Date().toISOString().split('T')[0];
    const att = DB.get('attendance') || [];
    const existing = att.find(a => a.worker_id === worker.id && a.date === today);
    if (existing) { alert('تم تسجيل حضور هذا العامل اليوم بالفعل'); return; }

    // GPS اختياري
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const rec = {
          id: Date.now(),
          tenant_id: user.tenant_id,
          worker_id: worker.id,
          project_id: worker.project_id,
          date: today,
          status: 'present',
          hours: 8,
          check_in: new Date().toTimeString().substring(0,5),
          gps_in: `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`
        };
        att.push(rec);
        DB.set('attendance', att);
        if (typeof sbSync === 'function') sbSync('attendance', rec, 'POST').catch(()=>{});
        AuditLog.log('create', 'attendance', rec.id, null, rec);
        alert('✅ تم تسجيل حضور ' + worker.full_name);
      }, () => {
        // بدون GPS
        const rec = {
          id: Date.now(), tenant_id: user.tenant_id, worker_id: worker.id,
          project_id: worker.project_id, date: today, status: 'present', hours: 8
        };
        att.push(rec);
        DB.set('attendance', att);
        if (typeof sbSync === 'function') sbSync('attendance', rec, 'POST').catch(()=>{});
        alert('✅ تم تسجيل الحضور');
      });
    }
  },

  materials() {
    const user = Auth.getUser();
    const mats = (DB.get('materials') || []).filter(m => m.tenant_id === user.tenant_id);
    if (!mats.length) { alert('لا توجد مواد'); return; }
    const list = mats.map((m,i) => `${i+1}. ${m.name} (المخزون: ${m.quantity} ${m.unit})`).join('\n');
    const idx = parseInt(prompt(`اختر المادة:\n\n${list}\n\nاكتب الرقم:`));
    if (!idx || idx < 1 || idx > mats.length) return;
    const mat = mats[idx-1];

    const qty = parseFloat(prompt(`كمية الاستلام (${mat.unit}):`));
    if (!qty || qty <= 0) return;

    // تحديث المخزون
    mat.quantity = Number(mat.quantity) + qty;
    DB.set('materials', mats);
    if (typeof sbSync === 'function') sbSync('materials', mat, 'PATCH').catch(()=>{});

    // سجل حركة مخزون
    const move = {
      id: Date.now(), tenant_id: user.tenant_id, material_id: mat.id,
      type: 'in', quantity: qty, date: new Date().toISOString().split('T')[0],
      note: 'استلام ميداني'
    };
    const moves = DB.get('stock_movements') || [];
    moves.unshift(move);
    DB.set('stock_movements', moves);
    if (typeof sbSync === 'function') sbSync('stock_movements', move, 'POST').catch(()=>{});

    alert(`✅ تم استلام ${qty} ${mat.unit} من ${mat.name}`);
  },

  photo() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const user = Auth.getUser();
        const doc = {
          id: Date.now(), tenant_id: user.tenant_id,
          name: 'صورة_موقع_' + new Date().toLocaleDateString('fr-FR'),
          category: 'صور',
          type: 'image',
          url: ev.target.result,  // base64
          size: file.size,
          date: new Date().toISOString().split('T')[0],
          uploader_id: user.id
        };
        const docs = DB.get('documents') || [];
        docs.unshift(doc);
        DB.set('documents', docs);
        if (typeof sbSync === 'function') sbSync('documents', doc, 'POST').catch(()=>{});
        alert('✅ تم رفع الصورة');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  },

  cashRequest() {
    const amount = parseFloat(prompt('💰 المبلغ المطلوب (دج):'));
    if (!amount || amount <= 0) return;
    const reason = prompt('السبب:');
    if (!reason) return;
    const user = Auth.getUser();
    const notif = {
      id: Date.now(), tenant_id: user.tenant_id, user_id: user.id,
      type: 'cash_request', title: '💰 طلب صرف نقدي',
      body: `${user.full_name} يطلب ${amount.toLocaleString('fr-DZ')} دج للسبب: ${reason}`,
      date: new Date().toISOString(), read: false, status: 'pending'
    };
    const notifs = DB.get('notifications') || [];
    notifs.unshift(notif);
    DB.set('notifications', notifs);
    if (typeof sbSync === 'function') sbSync('notifications', notif, 'POST').catch(()=>{});
    alert('✅ تم إرسال الطلب للمحاسب');
  },

  equipmentTrack() {
    const user = Auth.getUser();
    const eqs = (DB.get('equipment') || []).filter(e => e.tenant_id === user.tenant_id);
    if (!eqs.length) { alert('لا توجد معدات'); return; }
    const list = eqs.map((e,i) => `${i+1}. ${e.name}`).join('\n');
    const idx = parseInt(prompt(`اختر المعدة:\n\n${list}\n\nاكتب الرقم:`));
    if (!idx || idx < 1 || idx > eqs.length) return;
    EquipmentGPS.recordLocation(eqs[idx-1].id);
  }
};

// ════════════════════════════════════════════════════════════════════
//  ⑩ Themes — Dark / Light / Gold
// ════════════════════════════════════════════════════════════════════
window.SmartThemes = {
  THEMES: {
    dark:  { name: 'داكن', bg:'#0a0e1a', fg:'#E0E0E0', card:'#1a1f2e', accent:'#D4AF37' },
    light: { name: 'فاتح', bg:'#F5F7FA', fg:'#1a1a1a', card:'#FFFFFF', accent:'#D4AF37' },
    gold:  { name: 'ذهبي', bg:'#1A1410', fg:'#F5E6C8', card:'#2A2018', accent:'#FFD700' }
  },

  apply(themeName) {
    const t = this.THEMES[themeName];
    if (!t) return;
    const root = document.documentElement.style;
    root.setProperty('--theme-bg', t.bg);
    root.setProperty('--theme-fg', t.fg);
    root.setProperty('--theme-card', t.card);
    root.setProperty('--theme-accent', t.accent);
    document.body.dataset.theme = themeName;
    localStorage.setItem('sbtp_theme', themeName);
  },

  init() {
    const saved = localStorage.getItem('sbtp_theme') || 'dark';
    this.apply(saved);
  },

  cycleNext() {
    const order = ['dark', 'light', 'gold'];
    const cur = localStorage.getItem('sbtp_theme') || 'dark';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    this.apply(next);
    if (typeof Toast !== 'undefined') Toast.info(`🎨 ${this.THEMES[next].name}`);
  }
};

// ════════════════════════════════════════════════════════════════════
//  ⑪ QuickWins — Search, Shortcuts, Bulk, Excel, Print, Onboarding
// ════════════════════════════════════════════════════════════════════
window.QuickWins = {
  // === ⌘K Search ===
  initSearch() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openSearch();
      }
      if (e.key === 'Escape') {
        document.getElementById('quick-search')?.remove();
      }
    });
  },

  openSearch() {
    if (document.getElementById('quick-search')) return;
    const user = Auth.getUser();
    if (!user) return;

    const overlay = document.createElement('div');
    overlay.id = 'quick-search';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;padding-top:10vh;direction:rtl';
    overlay.innerHTML = `
      <div style="background:#1a1f2e;border:1px solid rgba(212,175,55,.3);border-radius:12px;width:600px;max-width:90vw;max-height:70vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.5)">
        <input id="qs-input" placeholder="🔍 ابحث في كل البيانات... (Esc للإغلاق)" style="padding:1rem 1.25rem;background:transparent;border:none;color:#fff;font-size:1.1rem;outline:none;border-bottom:1px solid rgba(255,255,255,.08)">
        <div id="qs-results" style="overflow-y:auto;padding:.5rem"></div>
      </div>`;
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);

    const input = document.getElementById('qs-input');
    input.focus();
    input.oninput = () => this._renderResults(input.value);
    this._renderResults('');
  },

  _renderResults(query) {
    const user = Auth.getUser();
    const tid = user.tenant_id;
    const q = query.toLowerCase().trim();
    const results = [];

    const sources = [
      { table:'projects',     icon:'🏗️', label:'المشاريع',  page:'projects',     fields:['name','client_name','phase'] },
      { table:'workers',      icon:'👷', label:'العمال',     page:'workers',      fields:['full_name','role','phone'] },
      { table:'transactions', icon:'💰', label:'المعاملات', page:'transactions', fields:['description','category'] },
      { table:'invoices',     icon:'📄', label:'الفواتير',  page:'invoices',     fields:['number','client','description'] },
      { table:'materials',    icon:'📦', label:'المواد',    page:'materials',    fields:['name','supplier'] },
      { table:'equipment',    icon:'🚜', label:'المعدات',   page:'equipment',    fields:['name','model','plate_number'] }
    ];

    sources.forEach(s => {
      const items = (DB.get(s.table) || []).filter(r => r.tenant_id === tid);
      items.forEach(r => {
        if (!q) return;  // عند الفراغ، لا نعرض شيئاً
        const text = s.fields.map(f => r[f] || '').join(' ').toLowerCase();
        if (text.includes(q)) {
          results.push({
            icon: s.icon,
            label: s.label,
            title: r[s.fields[0]] || '#'+r.id,
            sub: s.fields.slice(1).map(f => r[f]).filter(Boolean).join(' · '),
            page: s.page
          });
        }
      });
    });

    const box = document.getElementById('qs-results');
    if (!box) return;
    if (!q) {
      box.innerHTML = '<div style="padding:2rem;text-align:center;color:#888">ابدأ بالكتابة للبحث في كل البيانات...</div>';
      return;
    }
    if (!results.length) {
      box.innerHTML = '<div style="padding:2rem;text-align:center;color:#888">لا توجد نتائج لـ "' + q + '"</div>';
      return;
    }
    box.innerHTML = results.slice(0,30).map(r => `
      <div onclick="App.navigate('${r.page}');document.getElementById('quick-search').remove()" style="padding:.75rem 1rem;cursor:pointer;border-radius:6px;display:flex;gap:.75rem;align-items:center" onmouseover="this.style.background='rgba(212,175,55,.08)'" onmouseout="this.style.background=''">
        <div style="font-size:1.5rem">${r.icon}</div>
        <div style="flex:1">
          <div style="color:#fff;font-weight:600">${r.title}</div>
          ${r.sub ? `<div style="color:#888;font-size:.8rem">${r.sub}</div>` : ''}
        </div>
        <div style="color:#D4AF37;font-size:.8rem">${r.label}</div>
      </div>
    `).join('');
  },

  // === تصدير Excel ===
  async exportExcel(table, filename) {
    const user = Auth.getUser();
    if (!user) return;
    const tid = user.tenant_id;
    const data = (DB.get(table) || []).filter(r => user.is_admin || r.tenant_id === tid);
    if (!data.length) { Toast.warn('لا توجد بيانات للتصدير'); return; }

    // تحميل SheetJS من CDN
    if (!window.XLSX) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, table);
    XLSX.writeFile(wb, (filename || table) + '_' + new Date().toISOString().split('T')[0] + '.xlsx');
    if (typeof Toast !== 'undefined') Toast.success('✅ تم التصدير لـ Excel');
    AuditLog.log('export', table, null, null, { format: 'xlsx', count: data.length });
  },

  // === Onboarding tour ===
  showOnboarding() {
    if (localStorage.getItem('sbtp_onboarded')) return;
    const steps = [
      { title:'🎉 مرحباً بك في SmartStruct!', text:'نظام إدارة شامل لشركات البناء الجزائرية. سنريك أهم الميزات في 30 ثانية.' },
      { title:'🏗️ المشاريع', text:'أضف مشاريعك وتابع التقدم والميزانية لحظة بلحظة.' },
      { title:'👷 العمال والحضور', text:'سجّل حضور العمال يومياً، واحسب الرواتب تلقائياً.' },
      { title:'💰 المعاملات والفواتير', text:'تتبع كل دج، وأنشئ فواتير PDF احترافية بضغطة زر.' },
      { title:'🤖 المساعد الذكي', text:'اضغط على زر 🤖 (أسفل اليسار) واسأله أي شيء عن أعمالك.' },
      { title:'⌨️ اختصار سريع', text:'اضغط Ctrl+K في أي وقت للبحث الفوري في كل بياناتك.' },
      { title:'✅ ابدأ الآن!', text:'لديك 14 يوم تجربة مجانية. استكشف كل الميزات بحرية!' }
    ];
    let idx = 0;
    const show = () => {
      const s = steps[idx];
      const ov = document.createElement('div');
      ov.id = 'onboarding-step';
      ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem;direction:rtl;animation:obFade .3s';
      ov.innerHTML = `
        <style>@keyframes obFade{from{opacity:0}to{opacity:1}}</style>
        <div style="background:linear-gradient(135deg,#1a1f2e,#0f1420);border:1px solid rgba(212,175,55,.4);border-radius:20px;max-width:500px;width:100%;padding:2.5rem 2rem;text-align:center;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.5)">
          <div style="font-size:3rem;margin-bottom:1rem">${s.title.match(/^[^\s]+/)?.[0] || '✨'}</div>
          <h2 style="color:#D4AF37;margin:0 0 .8rem">${s.title.replace(/^[^\s]+\s*/, '')}</h2>
          <p style="color:#C8D4E8;line-height:1.7;font-size:1rem">${s.text}</p>
          <div style="display:flex;gap:.5rem;justify-content:center;margin:1.5rem 0 1rem">
            ${steps.map((_,i) => `<div style="width:8px;height:8px;border-radius:50%;background:${i===idx?'#D4AF37':'rgba(255,255,255,.2)'}"></div>`).join('')}
          </div>
          <div style="display:flex;gap:.5rem;justify-content:center">
            ${idx > 0 ? `<button onclick="document.getElementById('onboarding-step').remove();window._obIdx=${idx-1};QuickWins._obShow()" style="padding:.7rem 1.5rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#fff;border-radius:8px;cursor:pointer">السابق</button>` : ''}
            ${idx < steps.length-1
              ? `<button onclick="document.getElementById('onboarding-step').remove();window._obIdx=${idx+1};QuickWins._obShow()" style="padding:.7rem 1.5rem;background:linear-gradient(135deg,#D4AF37,#B8941F);border:none;color:#0a0e1a;font-weight:700;border-radius:8px;cursor:pointer">التالي →</button>`
              : `<button onclick="document.getElementById('onboarding-step').remove();localStorage.setItem('sbtp_onboarded','1')" style="padding:.7rem 1.5rem;background:linear-gradient(135deg,#34C38F,#2A9F73);border:none;color:#fff;font-weight:700;border-radius:8px;cursor:pointer">🚀 ابدأ!</button>`}
            <button onclick="document.getElementById('onboarding-step').remove();localStorage.setItem('sbtp_onboarded','1')" style="padding:.7rem 1rem;background:none;border:none;color:#888;cursor:pointer">تخطي</button>
          </div>
        </div>`;
      document.body.appendChild(ov);
    };
    window._obShow = () => { idx = window._obIdx || 0; show(); };
    show();
  }
};

// ════════════════════════════════════════════════════════════════════
//  Init — تشغيل الميزات تلقائياً
// ════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    try { SmartThemes.init(); } catch(_) {}
    try { QuickWins.initSearch(); } catch(_) {}
    try { EquipmentGPS.handleTrackingURL(); } catch(_) {}

    // كل 5 دقائق: تحقق من تذكير النسخ الاحتياطي
    setInterval(() => { try { SmartBackup.checkReminder(); } catch(_) {} }, 5 * 60 * 1000);

    // مراقبة تغيّر المستخدم لإظهار الـ chatbot + onboarding
    let lastUid = null;
    setInterval(() => {
      const u = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
      const uid = u?.id || null;
      if (uid !== lastUid) {
        lastUid = uid;
        if (uid && !u.is_admin) {
          setTimeout(() => { try { AIChatbot.mount(); } catch(_) {} }, 1500);
          setTimeout(() => { try { QuickWins.showOnboarding(); } catch(_) {} }, 3000);
        } else {
          document.getElementById('ai-chat-toggle')?.remove();
          document.getElementById('ai-chat-panel')?.remove();
        }
      }
    }, 1000);
  }, 500);
});

console.log('✅ SmartStruct v7.2 — features.js loaded successfully');

})();
