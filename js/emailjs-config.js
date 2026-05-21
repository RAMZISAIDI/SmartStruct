// ═══════════════════════════════════════════
//  EmailJS Configuration — SmartStruct
// ═══════════════════════════════════════════

// ── القيم الافتراضية ──
const EMAILJS_DEFAULTS = {
  SERVICE_ID:     'service_37ya8ru',
  TEMPLATE_ADMIN: 'template_haus94b',
  TEMPLATE_USER:  'template_9hzgy4s',

  // ← ضع Template ID الحقيقي من EmailJS
  TEMPLATE_OTP:   'template_abc123',

  PUBLIC_KEY:     'hn_PRTs7PuJAgrrDp',
  ADMIN_EMAIL:    'ramzisaidi2018@gmail.com',
};

// ──────────────────────────────────────────
// حفظ / جلب الإعدادات
// ──────────────────────────────────────────
function getEmailJSConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem('sbtp_emailjs_config') || '{}');
    return { ...EMAILJS_DEFAULTS, ...saved };
  } catch(e) {
    return { ...EMAILJS_DEFAULTS };
  }
}

function saveEmailJSConfig(cfg) {
  localStorage.setItem('sbtp_emailjs_config', JSON.stringify(cfg));

  try {
    emailjs.init({
      publicKey: cfg.PUBLIC_KEY
    });
  } catch(e) {}
}

// ──────────────────────────────────────────
// نظام OTP
// ──────────────────────────────────────────

// إنشاء كود OTP عشوائي
function generateOTP(length = 6) {
  let otp = '';

  for(let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }

  return otp;
}

// حفظ OTP مؤقتاً
function saveOTP(email, otp) {
  const data = {
    otp,
    expires: Date.now() + (5 * 60 * 1000) // صالح 5 دقائق
  };

  localStorage.setItem(`otp_${email}`, JSON.stringify(data));
}

// التحقق من OTP
function verifyOTP(email, code) {
  try {
    const saved = JSON.parse(localStorage.getItem(`otp_${email}`));

    if(!saved) {
      return {
        success: false,
        message: 'لم يتم العثور على رمز التحقق'
      };
    }

    // انتهاء الصلاحية
    if(Date.now() > saved.expires) {
      localStorage.removeItem(`otp_${email}`);

      return {
        success: false,
        message: 'انتهت صلاحية رمز التحقق'
      };
    }

    // تحقق من الكود
    if(saved.otp !== code) {
      return {
        success: false,
        message: 'رمز التحقق غير صحيح'
      };
    }

    // حذف بعد النجاح
    localStorage.removeItem(`otp_${email}`);

    return {
      success: true,
      message: 'تم التحقق بنجاح'
    };

  } catch(e) {
    return {
      success: false,
      message: 'خطأ أثناء التحقق'
    };
  }
}

// ──────────────────────────────────────────
// EmailJS API
// ──────────────────────────────────────────
const EMAILJS = {

  get SERVICE_ID()     { return getEmailJSConfig().SERVICE_ID; },
  get TEMPLATE_ADMIN() { return getEmailJSConfig().TEMPLATE_ADMIN; },
  get TEMPLATE_USER()  { return getEmailJSConfig().TEMPLATE_USER; },
  get TEMPLATE_OTP()   { return getEmailJSConfig().TEMPLATE_OTP; },
  get ADMIN_EMAIL()    { return getEmailJSConfig().ADMIN_EMAIL; },

  // ────────────────────────────────────────
  // إرسال OTP
  // ────────────────────────────────────────
  async sendOTP(email, userName = 'مستخدم') {

    try {

      // إنشاء الكود
      const otp = generateOTP(6);

      // حفظه مؤقتاً
      saveOTP(email, otp);

      const params = {

        to_email: email,
        to_name: userName,

        otp_code: otp,

        app_name: 'SmartStruct',

        expiry_time: '5 دقائق',

        message: `
رمز التحقق الخاص بك هو:

${otp}

صلاحية الرمز: 5 دقائق
لا تشارك هذا الرمز مع أي شخص.
        `
      };

      await emailjs.send(
        this.SERVICE_ID,
        this.TEMPLATE_OTP,
        params
      );

      console.log('✅ OTP Sent:', email);

      return {
        success: true,
        message: 'تم إرسال رمز التحقق'
      };

    } catch(e) {

      console.error('❌ sendOTP:', e);

      return {
        success: false,
        message: 'فشل إرسال رمز التحقق'
      };
    }
  },

  // ────────────────────────────────────────
  // تحقق من OTP
  // ────────────────────────────────────────
  verifyOTP(email, code) {
    return verifyOTP(email, code);
  },

};