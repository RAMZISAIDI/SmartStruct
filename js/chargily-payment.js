// ══════════════════════════════════════════════════════════════
//  SmartStruct × Chargily Pay — وحدة الدفع الإلكتروني
//  الإصدار: 1.0 | مايو 2026
//  يدعم: EDAHABIA (بريد الجزائر) + CIB (SATIM)
// ══════════════════════════════════════════════════════════════

const ChargilyPayment = (() => {

  // ═══════════════════════════════════════════
  //  الإعدادات — استبدل بمفاتيح الـ Live عند النشر
  // ═══════════════════════════════════════════
  const CONFIG = {
    // مفتاح API السري — يُستخدم للطلبات من الخادم فقط
    // في هذا التطبيق نستخدم المفتاح العام لتوليد روابط الدفع عبر CORS
    SECRET_KEY: 'test_sk_WcofPyGHmE82jzZEojf7KQfe4Ize3DyRwekPK0Og',
    PUBLIC_KEY: 'test_pk_CM0F6oT1DKVFSr7Pve3D37Hh53yI3la3DUAWsTMX',
    API_BASE: 'https://pay.chargily.net/test/api/v2',  // test | استخدم pay.chargily.net/api/v2 للإنتاج
    MODE: 'test', // 'test' | 'live'
  };

  // ═══════════════════════════════════════════
  //  خطط الاشتراك مع أسعار ثابتة
  // ═══════════════════════════════════════════
  const PLANS = {
    1: {
      id: 1,
      nameAr: 'المبتدئ',
      nameFr: 'Starter',
      price: 2900,        // بالدينار الجزائري
      currency: 'dzd',
      descAr: '3 مشاريع · 15 عامل · فواتير PDF',
      descFr: '3 projets · 15 ouvriers · Factures PDF',
      emoji: '👷',
      color: '#4A90E2',
    },
    2: {
      id: 2,
      nameAr: 'الاحترافي',
      nameFr: 'Professionnel',
      price: 7900,
      currency: 'dzd',
      descAr: '20 مشروع · 100 عامل · SmartAI كامل',
      descFr: '20 projets · 100 ouvriers · SmartAI complet',
      emoji: '🏢',
      color: '#E8B84B',
      featured: true,
    },
    3: {
      id: 3,
      nameAr: 'المؤسسي',
      nameFr: 'Entreprise',
      price: 19900,
      currency: 'dzd',
      descAr: 'غير محدود · SLA · مدير حساب مخصص',
      descFr: 'Illimité · SLA · Account manager dédié',
      emoji: '🏛️',
      color: '#34C38F',
    },
  };

  // ═══════════════════════════════════════════
  //  مساعدات
  // ═══════════════════════════════════════════
  const isAr = () => document.documentElement.dir === 'rtl' ||
    (typeof I18N !== 'undefined' && I18N.lang === 'ar');

  const t = (ar, fr) => isAr() ? ar : fr;

  const fmt = (n) => new Intl.NumberFormat('ar-DZ').format(n);

  // عنوان الصفحة الحالية لإعادة التوجيه
  const currentUrl = () => window.location.href.split('?')[0].split('#')[0];

  // ═══════════════════════════════════════════
  //  Chargily API — إنشاء جلسة دفع
  // ═══════════════════════════════════════════
  async function createCheckout(planId, tenantData, userEmail) {
    const plan = PLANS[planId];
    if (!plan) throw new Error('خطة غير موجودة');

    const tenantName = tenantData?.name || 'مستخدم SmartStruct';
    const tenantId   = tenantData?.id   || 0;

    // بيانات الجلسة
    const payload = {
      amount: plan.price,
      currency: plan.currency,
      success_url: `${currentUrl()}?payment=success&plan=${planId}&tenant=${tenantId}&ts=${Date.now()}`,
      failure_url: `${currentUrl()}?payment=failed&plan=${planId}`,
      locale: isAr() ? 'ar' : 'fr',
      description: `SmartStruct — ${isAr() ? plan.nameAr : plan.nameFr} | ${tenantName}`,
      metadata: {
        app: 'SmartStruct',
        plan_id: String(planId),
        plan_name: plan.nameAr,
        tenant_id: String(tenantId),
        tenant_name: tenantName,
        user_email: userEmail || '',
        mode: CONFIG.MODE,
      },
    };

    // إضافة بريد المستخدم إن وُجد
    if (userEmail) {
      payload.customer = { email: userEmail, name: tenantName };
    }

    const res = await fetch(`${CONFIG.API_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.SECRET_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // ═══════════════════════════════════════════
  //  التحقق من عودة الدفع (من URL params)
  // ═══════════════════════════════════════════
  function checkPaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (!payment) return null;

    return {
      status:   payment,       // 'success' | 'failed'
      planId:   Number(params.get('plan'))   || null,
      tenantId: Number(params.get('tenant')) || null,
      ts:       Number(params.get('ts'))     || null,
    };
  }

  // ═══════════════════════════════════════════
  //  تفعيل الاشتراك بعد الدفع الناجح
  // ═══════════════════════════════════════════
  async function activateSubscription(tenantId, planId) {
    const cfg = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : null;
    if (!cfg?.url || !cfg?.key) return false;

    const now = new Date();
    const subEnd = new Date(now);
    subEnd.setMonth(subEnd.getMonth() + 1); // اشتراك شهري

    const sbH = {
      'Content-Type': 'application/json',
      'apikey': cfg.key,
      'Authorization': `Bearer ${cfg.key}`,
      'Prefer': 'return=minimal',
    };

    try {
      await fetch(`${cfg.url}/rest/v1/tenants?id=eq.${tenantId}`, {
        method: 'PATCH', headers: sbH,
        body: JSON.stringify({
          is_active: true,
          plan_id: planId,
          subscription_status: 'active',
          subscription_start: now.toISOString(),
          subscription_end: subEnd.toISOString(),
          subscription_ends_at: subEnd.toISOString(),
        }),
      });

      await fetch(`${cfg.url}/rest/v1/users?tenant_id=eq.${tenantId}`, {
        method: 'PATCH', headers: sbH,
        body: JSON.stringify({ is_active: true, account_status: 'active' }),
      });

      // تحديث LocalStorage
      try {
        const stored = JSON.parse(sessionStorage.getItem('sbtp_user') || '{}');
        if (stored?.tenant) {
          stored.tenant.is_active = true;
          stored.tenant.plan_id = planId;
          stored.tenant.subscription_status = 'active';
          stored.tenant.subscription_end = subEnd.toISOString();
          sessionStorage.setItem('sbtp_user', JSON.stringify(stored));
        }
      } catch(_) {}

      // ── إشعار الأدمين: تم الاشتراك ──
      try {
        const plans = [null,'Starter','Professionnel','Entreprise'];
        const planName = plans[planId] || ('خطة ' + planId);
        // جلب اسم المؤسسة
        let tenantName = '—';
        try {
          const stored = JSON.parse(sessionStorage.getItem('sbtp_user') || '{}');
          tenantName = stored?.tenant?.name || tenantName;
        } catch(_) {}

        // حفظ الإشعار في notifications
        const adminNotifs = (typeof DB !== 'undefined' && DB.get) ? (DB.get('notifications') || []) : [];
        adminNotifs.unshift({
          id: Date.now(),
          type: 'new_subscription',
          title: '💳 اشتراك جديد — ' + tenantName,
          body: `المؤسسة "${tenantName}" اشتركت في خطة "${planName}" — تم التفعيل تلقائياً ✅`,
          tenant_id: tenantId,
          tenant_name: tenantName,
          plan_id: planId,
          plan_name: planName,
          date: now.toISOString(),
          status: 'info',
          read: false
        });
        if (typeof DB !== 'undefined' && DB.set) DB.set('notifications', adminNotifs);

        // إرسال بريد للمسؤول
        if (typeof EMAILJS !== 'undefined' && EMAILJS.notifyNewAccount) {
          const stored2 = JSON.parse(sessionStorage.getItem('sbtp_user') || '{}');
          EMAILJS.notifyNewAccount({
            name: stored2?.user?.full_name || '—',
            email: stored2?.user?.email || '—',
            company: tenantName,
            wilaya: stored2?.tenant?.wilaya || '—',
            subject: '💳 اشتراك جديد مدفوع — ' + tenantName + ' (' + planName + ')'
          }).catch(() => {});
        }
      } catch(_notify) {
        console.warn('Admin notification error:', _notify);
      }

      return true;
    } catch(e) {
      console.warn('activateSubscription error:', e);
      return false;
    }
  }

  // ═══════════════════════════════════════════
  //  نافذة اختيار طريقة الدفع
  // ═══════════════════════════════════════════
  function showPaymentMethodModal(planId, onConfirm) {
    const old = document.getElementById('chargily-method-modal');
    if (old) old.remove();

    const plan = PLANS[planId];
    const modal = document.createElement('div');
    modal.id = 'chargily-method-modal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:100001;
      background:rgba(0,0,0,.8);backdrop-filter:blur(10px);
      display:flex;align-items:center;justify-content:center;
      padding:1rem;direction:${isAr()?'rtl':'ltr'};
      animation:fadeIn .25s ease;
    `;

    modal.innerHTML = `
      <style>
        #chargily-method-modal { font-family: 'Tajawal', sans-serif; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }
        .cm-card {
          background:linear-gradient(145deg,#141b2d 0%,#0d1220 100%);
          border:1px solid rgba(232,184,75,.25);border-radius:22px;
          max-width:480px;width:100%;
          box-shadow:0 24px 64px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04) inset;
          animation:slideUp .35s ease;overflow:hidden;
        }
        .cm-head {
          background:linear-gradient(135deg,rgba(232,184,75,.12),rgba(232,184,75,.03));
          padding:1.75rem 2rem 1.5rem;
          border-bottom:1px solid rgba(232,184,75,.1);
          text-align:center;
        }
        .cm-plan-badge {
          display:inline-flex;align-items:center;gap:.5rem;
          background:rgba(232,184,75,.12);border:1px solid rgba(232,184,75,.3);
          border-radius:30px;padding:.35rem .9rem;
          color:#E8B84B;font-size:.8rem;font-weight:700;margin-bottom:1rem;
        }
        .cm-title { color:#fff;font-size:1.3rem;font-weight:800;margin-bottom:.3rem; }
        .cm-price {
          font-size:2.4rem;font-weight:900;color:#E8B84B;
          font-family:'JetBrains Mono',monospace;line-height:1;
          display:flex;align-items:baseline;gap:.3rem;justify-content:center;
        }
        .cm-price-unit { font-size:.95rem;color:#8A95A8; }
        .cm-body { padding:1.5rem 2rem; }
        .cm-subtitle { color:#8A95A8;font-size:.82rem;margin-bottom:1.2rem;text-align:center; }
        .cm-methods { display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:1.5rem; }
        .cm-method {
          background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.08);
          border-radius:14px;padding:1.1rem .75rem;text-align:center;cursor:pointer;
          transition:all .2s;
        }
        .cm-method:hover {
          border-color:rgba(232,184,75,.5);background:rgba(232,184,75,.06);
          transform:translateY(-2px);
        }
        .cm-method.selected {
          border-color:#E8B84B;background:rgba(232,184,75,.1);
        }
        .cm-method-icon { font-size:2rem;margin-bottom:.5rem; }
        .cm-method-name { color:#fff;font-weight:700;font-size:.9rem;margin-bottom:.2rem; }
        .cm-method-desc { color:#6F7B8E;font-size:.72rem;line-height:1.4; }
        .cm-secure {
          display:flex;align-items:center;justify-content:center;gap:.4rem;
          color:#4A7C59;font-size:.74rem;margin-bottom:1.2rem;
          background:rgba(52,195,143,.06);border:1px solid rgba(52,195,143,.15);
          border-radius:8px;padding:.5rem .75rem;
        }
        .cm-actions { display:flex;flex-direction:column;gap:.6rem; }
        .cm-pay-btn {
          padding:1rem;border-radius:12px;border:none;cursor:pointer;
          font-family:'Tajawal',sans-serif;font-size:1rem;font-weight:800;
          background:linear-gradient(135deg,#E8B84B,#C9971B);color:#0a0e1a;
          box-shadow:0 4px 16px rgba(232,184,75,.35);
          transition:all .2s;display:flex;align-items:center;justify-content:center;gap:.6rem;
        }
        .cm-pay-btn:hover { transform:translateY(-2px);box-shadow:0 6px 22px rgba(232,184,75,.5); }
        .cm-pay-btn:disabled { opacity:.5;cursor:not-allowed;transform:none; }
        .cm-cancel-btn {
          padding:.75rem;border-radius:10px;border:1px solid rgba(255,255,255,.1);
          cursor:pointer;font-family:'Tajawal',sans-serif;font-size:.9rem;font-weight:600;
          background:rgba(255,255,255,.04);color:#8A95A8;transition:all .2s;
        }
        .cm-cancel-btn:hover { background:rgba(255,255,255,.08);color:#C8D4E8; }
        .cm-loading { display:none;align-items:center;gap:.6rem;color:#E8B84B;font-size:.85rem; }
        .cm-spinner {
          width:18px;height:18px;border:2px solid rgba(232,184,75,.2);
          border-top-color:#E8B84B;border-radius:50%;
          animation:spin .7s linear infinite;
        }
        @keyframes spin { to{transform:rotate(360deg)} }
      </style>

      <div class="cm-card">
        <div class="cm-head">
          <div class="cm-plan-badge">${plan.emoji} ${isAr() ? plan.nameAr : plan.nameFr}</div>
          <div class="cm-title">${t('اختر طريقة الدفع','Choisir le moyen de paiement')}</div>
          <div class="cm-price">
            ${fmt(plan.price)}
            <span class="cm-price-unit">${t('دج / شهر','DA / mois')}</span>
          </div>
        </div>

        <div class="cm-body">
          <p class="cm-subtitle">${t('ادفع بأمان عبر بوابة Chargily المعتمدة في الجزائر','Payez en toute sécurité via Chargily, la passerelle certifiée en Algérie')}</p>

          <div class="cm-methods">
            <div class="cm-method selected" id="method-edahabia" onclick="ChargilyPayment._selectMethod('edahabia')">
              <div class="cm-method-icon">📮</div>
              <div class="cm-method-name">EDAHABIA</div>
              <div class="cm-method-desc">${t('بطاقة بريد الجزائر','Carte Algérie Poste')}</div>
            </div>
            <div class="cm-method" id="method-cib" onclick="ChargilyPayment._selectMethod('cib')">
              <div class="cm-method-icon">💳</div>
              <div class="cm-method-name">CIB</div>
              <div class="cm-method-desc">${t('بطاقة بنكية SATIM','Carte bancaire SATIM')}</div>
            </div>
          </div>

          <div class="cm-secure">
            🔒 ${t('دفع آمن 100% — مشفّر SSL — Chargily Pay™','Paiement 100% sécurisé — Chiffrement SSL — Chargily Pay™')}
          </div>

          <div class="cm-actions">
            <button class="cm-pay-btn" id="cm-pay-btn" onclick="ChargilyPayment._confirmPayment(${planId})">
              <span id="cm-btn-text">💳 ${t('الدفع الآن','Payer maintenant')} — ${fmt(plan.price)} ${t('دج','DA')}</span>
              <div class="cm-loading" id="cm-loading">
                <div class="cm-spinner"></div>
                ${t('جارٍ التوجيه...','Redirection en cours...')}
              </div>
            </button>
            <button class="cm-cancel-btn" onclick="ChargilyPayment._closeMethodModal()">
              ${t('إلغاء','Annuler')}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // حفظ planId والـ callback
    window._chargilyCurrentPlan = planId;
    window._chargilySelectedMethod = 'edahabia';
  }

  // ═══════════════════════════════════════════
  //  تحديد طريقة الدفع
  // ═══════════════════════════════════════════
  function _selectMethod(method) {
    window._chargilySelectedMethod = method;
    document.querySelectorAll('.cm-method').forEach(el => el.classList.remove('selected'));
    const el = document.getElementById(`method-${method}`);
    if (el) el.classList.add('selected');
  }

  // ═══════════════════════════════════════════
  //  تأكيد الدفع وتوجيه للبوابة
  // ═══════════════════════════════════════════
  async function _confirmPayment(planId) {
    const btn    = document.getElementById('cm-pay-btn');
    const btnTxt = document.getElementById('cm-btn-text');
    const loader = document.getElementById('cm-loading');

    if (!btn) return;
    btn.disabled = true;
    if (btnTxt) btnTxt.style.display = 'none';
    if (loader) loader.style.display = 'flex';

    try {
      const tenant = (typeof Auth !== 'undefined' && Auth.getTenant) ? Auth.getTenant() : null;
      const user   = (typeof Auth !== 'undefined' && Auth.getUser)   ? Auth.getUser()   : null;

      const checkout = await createCheckout(
        planId,
        tenant,
        user?.email || ''
      );

      if (checkout?.checkout_url) {
        // توجيه لبوابة الدفع
        window.location.href = checkout.checkout_url;
      } else {
        throw new Error(t('لم يتم استلام رابط الدفع','URL de paiement non reçue'));
      }
    } catch(err) {
      console.error('Chargily payment error:', err);

      btn.disabled = false;
      if (btnTxt) btnTxt.style.display = '';
      if (loader) loader.style.display = 'none';

      // عرض رسالة الخطأ
      _showPaymentError(err.message || t('حدث خطأ في الاتصال بالبوابة','Erreur de connexion à la passerelle'));
    }
  }

  // ═══════════════════════════════════════════
  //  إغلاق نافذة اختيار الطريقة
  // ═══════════════════════════════════════════
  function _closeMethodModal() {
    const modal = document.getElementById('chargily-method-modal');
    if (modal) { modal.style.opacity = '0'; setTimeout(() => modal.remove(), 200); }
    document.body.style.overflow = '';
  }

  // ═══════════════════════════════════════════
  //  نافذة خطأ الدفع
  // ═══════════════════════════════════════════
  function _showPaymentError(message) {
    const err = document.createElement('div');
    err.style.cssText = `
      position:fixed;bottom:2rem;${isAr()?'right':'left'}:2rem;z-index:200000;
      background:linear-gradient(135deg,#2d1415,#1a0d0e);
      border:1px solid rgba(240,78,106,.4);border-radius:14px;
      padding:1rem 1.4rem;max-width:380px;
      box-shadow:0 8px 28px rgba(0,0,0,.4);
      animation:slideUp .3s ease;
      font-family:'Tajawal',sans-serif;direction:${isAr()?'rtl':'ltr'};
    `;
    err.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:.7rem">
        <span style="font-size:1.4rem;flex-shrink:0">⚠️</span>
        <div>
          <div style="color:#F04E6A;font-weight:700;font-size:.9rem;margin-bottom:.2rem">
            ${t('خطأ في الدفع','Erreur de paiement')}
          </div>
          <div style="color:#C8D4E8;font-size:.8rem;line-height:1.5">${message}</div>
          <div style="color:#6F7B8E;font-size:.72rem;margin-top:.4rem">
            ${t('تواصل مع الدعم: contact@smartstruct.dz','Support: contact@smartstruct.dz')}
          </div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()"
          style="background:none;border:none;color:#6F7B8E;cursor:pointer;font-size:1rem;flex-shrink:0;padding:.1rem">✕</button>
      </div>
    `;
    document.body.appendChild(err);
    setTimeout(() => { if (err.parentElement) err.remove(); }, 7000);
  }

  // ═══════════════════════════════════════════
  //  نافذة نجاح الدفع
  // ═══════════════════════════════════════════
  function showSuccessModal(planId) {
    const old = document.getElementById('chargily-success-modal');
    if (old) old.remove();

    const plan = PLANS[planId] || PLANS[2];

    const modal = document.createElement('div');
    modal.id = 'chargily-success-modal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:100002;
      background:rgba(0,0,0,.85);backdrop-filter:blur(12px);
      display:flex;align-items:center;justify-content:center;
      padding:1rem;direction:${isAr()?'rtl':'ltr'};
      animation:fadeIn .3s ease;
      font-family:'Tajawal',sans-serif;
    `;
    modal.innerHTML = `
      <style>
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes popIn{0%{transform:scale(.8);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        @keyframes confettiFall{from{transform:translateY(-20px) rotate(0deg);opacity:1}to{transform:translateY(60px) rotate(360deg);opacity:0}}
        .cs-card {
          background:linear-gradient(145deg,#0f1a2e 0%,#0a1020 100%);
          border:1px solid rgba(52,195,143,.35);border-radius:22px;
          max-width:440px;width:100%;text-align:center;overflow:hidden;
          box-shadow:0 24px 64px rgba(0,0,0,.6),0 0 40px rgba(52,195,143,.08) inset;
          animation:popIn .5s cubic-bezier(.175,.885,.32,1.275);
        }
        .cs-confetti-bar {
          height:6px;
          background:linear-gradient(90deg,#E8B84B,#34C38F,#4A90E2,#E8B84B);
          background-size:200% 100%;
          animation:moveGrad 1.5s linear infinite;
        }
        @keyframes moveGrad{0%{background-position:0 0}100%{background-position:200% 0}}
        .cs-icon {
          font-size:4.5rem;margin:2rem auto 1rem;
          animation:popIn .6s cubic-bezier(.175,.885,.32,1.275) .2s both;
        }
        .cs-title {font-size:1.6rem;font-weight:900;color:#34C38F;margin-bottom:.4rem;}
        .cs-sub   {color:#8A95A8;font-size:.88rem;margin-bottom:1.5rem;line-height:1.6;padding:0 1.5rem;}
        .cs-plan-chip {
          display:inline-flex;align-items:center;gap:.5rem;
          background:rgba(52,195,143,.1);border:1px solid rgba(52,195,143,.3);
          border-radius:30px;padding:.45rem 1.1rem;
          color:#34C38F;font-size:.85rem;font-weight:700;margin-bottom:1.5rem;
        }
        .cs-details {
          background:rgba(255,255,255,.03);border-top:1px solid rgba(255,255,255,.06);
          padding:1.25rem 1.75rem;display:flex;flex-direction:column;gap:.6rem;
        }
        .cs-detail-row {
          display:flex;justify-content:space-between;align-items:center;
          font-size:.82rem;
        }
        .cs-detail-label { color:#6F7B8E; }
        .cs-detail-value { color:#C8D4E8;font-weight:600; }
        .cs-actions { padding:1.25rem 1.75rem; }
        .cs-btn {
          width:100%;padding:.95rem;border-radius:12px;border:none;cursor:pointer;
          font-family:'Tajawal',sans-serif;font-size:1rem;font-weight:800;
          background:linear-gradient(135deg,#34C38F,#27916A);color:#fff;
          box-shadow:0 4px 16px rgba(52,195,143,.3);transition:all .2s;
        }
        .cs-btn:hover{transform:translateY(-2px);box-shadow:0 6px 22px rgba(52,195,143,.45)}
      </style>

      <div class="cs-card">
        <div class="cs-confetti-bar"></div>
        <div class="cs-icon">🎉</div>
        <div class="cs-title">${t('تمّ الدفع بنجاح!','Paiement réussi !')}</div>
        <p class="cs-sub">${t(
          'مرحباً بك في SmartStruct! حسابك مفعّل الآن ويمكنك الاستمتاع بكل المميزات.',
          'Bienvenue dans SmartStruct ! Votre compte est maintenant actif.'
        )}</p>
        <div class="cs-plan-chip">${plan.emoji} ${isAr() ? plan.nameAr : plan.nameFr}</div>

        <div class="cs-details">
          <div class="cs-detail-row">
            <span class="cs-detail-label">💳 ${t('المبلغ المدفوع','Montant payé')}</span>
            <span class="cs-detail-value">${fmt(plan.price)} ${t('دج','DA')}</span>
          </div>
          <div class="cs-detail-row">
            <span class="cs-detail-label">📅 ${t('الاشتراك صالح حتى','Abonnement valide jusqu\'au')}</span>
            <span class="cs-detail-value" id="cs-sub-end-date">—</span>
          </div>
          <div class="cs-detail-row">
            <span class="cs-detail-label">✅ ${t('الحالة','Statut')}</span>
            <span class="cs-detail-value" style="color:#34C38F">${t('نشط','Actif')}</span>
          </div>
        </div>

        <div class="cs-actions">
          <button class="cs-btn" onclick="ChargilyPayment._goToDashboard()">
            🚀 ${t('الذهاب للوحة التحكم','Aller au tableau de bord')}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // تحديث تاريخ نهاية الاشتراك
    const endEl = document.getElementById('cs-sub-end-date');
    if (endEl) {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      endEl.textContent = d.toLocaleDateString(isAr() ? 'ar-DZ' : 'fr-FR', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    }
  }

  // ═══════════════════════════════════════════
  //  نافذة فشل الدفع
  // ═══════════════════════════════════════════
  function showFailureModal(planId) {
    const old = document.getElementById('chargily-failure-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'chargily-failure-modal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:100002;
      background:rgba(0,0,0,.85);backdrop-filter:blur(12px);
      display:flex;align-items:center;justify-content:center;
      padding:1rem;direction:${isAr()?'rtl':'ltr'};
      font-family:'Tajawal',sans-serif;
    `;
    modal.innerHTML = `
      <div style="background:linear-gradient(145deg,#1e1014,#110a0c);border:1px solid rgba(240,78,106,.3);border-radius:22px;max-width:400px;width:100%;text-align:center;padding:2.5rem 2rem;box-shadow:0 24px 64px rgba(0,0,0,.6)">
        <div style="font-size:4rem;margin-bottom:1rem">😕</div>
        <div style="color:#F04E6A;font-size:1.4rem;font-weight:900;margin-bottom:.5rem">${t('لم يتم الدفع','Paiement non finalisé')}</div>
        <p style="color:#8A95A8;font-size:.85rem;line-height:1.6;margin-bottom:1.5rem">${t(
          'لم تتم معالجة الدفع. يمكنك المحاولة مجدداً أو التواصل مع الدعم.',
          'Le paiement n\'a pas été traité. Veuillez réessayer ou contacter le support.'
        )}</p>
        <div style="display:flex;flex-direction:column;gap:.6rem">
          <button onclick="ChargilyPayment._retryPayment(${planId})"
            style="padding:.9rem;border-radius:12px;border:none;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:.95rem;font-weight:800;background:linear-gradient(135deg,#E8B84B,#C9971B);color:#0a0e1a;transition:all .2s">
            🔄 ${t('إعادة المحاولة','Réessayer')}
          </button>
          <button onclick="document.getElementById('chargily-failure-modal').remove();document.body.style.overflow=''"
            style="padding:.8rem;border-radius:10px;border:1px solid rgba(255,255,255,.1);cursor:pointer;font-family:'Tajawal',sans-serif;font-size:.9rem;background:rgba(255,255,255,.04);color:#8A95A8">
            ${t('إغلاق','Fermer')}
          </button>
        </div>
        <p style="color:#4A5B7A;font-size:.72rem;margin-top:1rem">📧 contact@smartstruct.dz</p>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
  }

  // ═══════════════════════════════════════════
  //  إعادة محاولة الدفع
  // ═══════════════════════════════════════════
  function _retryPayment(planId) {
    const old = document.getElementById('chargily-failure-modal');
    if (old) old.remove();
    document.body.style.overflow = '';
    // نظّف URL قبل إعادة المحاولة
    const cleanUrl = window.location.href.split('?')[0];
    window.history.replaceState({}, '', cleanUrl);
    // عرض نافذة الدفع مجدداً
    showPaymentMethodModal(planId);
  }

  // ═══════════════════════════════════════════
  //  التوجيه للوحة التحكم
  // ═══════════════════════════════════════════
  function _goToDashboard() {
    const modal = document.getElementById('chargily-success-modal');
    if (modal) modal.remove();
    document.body.style.overflow = '';
    // نظّف URL
    const cleanUrl = window.location.href.split('?')[0];
    window.history.replaceState({}, '', cleanUrl);
    // التوجيه
    if (typeof App !== 'undefined' && App.navigate) {
      App.navigate('dashboard');
    } else {
      window.location.reload();
    }
  }

  // ═══════════════════════════════════════════
  //  معالجة عودة الدفع تلقائياً عند تحميل الصفحة
  // ═══════════════════════════════════════════
  async function handlePaymentReturn() {
    const result = checkPaymentReturn();
    if (!result) return;

    // نظّف URL فوراً
    const cleanUrl = window.location.href.split('?')[0];
    window.history.replaceState({}, '', cleanUrl);

    if (result.status === 'success') {
      // تفعيل الاشتراك في قاعدة البيانات
      if (result.tenantId && result.planId) {
        await activateSubscription(result.tenantId, result.planId);
      }
      // عرض نافذة النجاح
      setTimeout(() => showSuccessModal(result.planId || 2), 800);

    } else if (result.status === 'failed') {
      setTimeout(() => showFailureModal(result.planId || 2), 400);
    }
  }

  // ═══════════════════════════════════════════
  //  الواجهة العامة للوحدة
  // ═══════════════════════════════════════════
  return {
    // يُستدعى من TrialManager لعرض نافذة الدفع
    initiatePayment(planId) {
      showPaymentMethodModal(planId);
    },

    // التحقق من عودة الدفع (يُستدعى عند تحميل الصفحة)
    handlePaymentReturn,

    // نوافذ النجاح والفشل
    showSuccessModal,
    showFailureModal,

    // للاستخدام الداخلي (مُعرَّضة لـ onclick)
    _selectMethod,
    _confirmPayment,
    _closeMethodModal,
    _goToDashboard,
    _retryPayment,

    // بيانات الخطط (للاستخدام الخارجي)
    PLANS,
    CONFIG,
  };
})();

// تسجيل عالمي
window.ChargilyPayment = ChargilyPayment;

// معالجة عودة الدفع عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  ChargilyPayment.handlePaymentReturn();
});
