// ═══════════════════════════════════════════
//  EmailJS Configuration — SmartStruct
// ═══════════════════════════════════════════

// ── القيم الافتراضية — يمكن تغييرها من صفحة المسؤول وتُحفظ في localStorage ──
const EMAILJS_DEFAULTS = {
  SERVICE_ID:     'service_37ya8ru',
  TEMPLATE_ADMIN: 'template_haus94b',
  TEMPLATE_USER:  'template_9hzgy4s',
  PUBLIC_KEY:     'hn_PRTs7PuJAgrrDp',
  ADMIN_EMAIL:    'ramzisaidi2018@gmail.com',
};
function getEmailJSConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem('sbtp_emailjs_config') || '{}');
    return { ...EMAILJS_DEFAULTS, ...saved };
  } catch(e) { return { ...EMAILJS_DEFAULTS }; }
}
function saveEmailJSConfig(cfg) {
  localStorage.setItem('sbtp_emailjs_config', JSON.stringify(cfg));
  // أعد تهيئة EmailJS بالـ Public Key الجديد
  try { emailjs.init({ publicKey: cfg.PUBLIC_KEY }); } catch(e) {}
}

const EMAILJS = {
  get SERVICE_ID()     { return getEmailJSConfig().SERVICE_ID; },
  get TEMPLATE_ADMIN() { return getEmailJSConfig().TEMPLATE_ADMIN; },
  get TEMPLATE_USER()  { return getEmailJSConfig().TEMPLATE_USER; },
  get ADMIN_EMAIL()    { return getEmailJSConfig().ADMIN_EMAIL; },

  // ── إرسال إشعار للمسؤول عند تسجيل حساب جديد ──
  async notifyNewAccount(userData) {
    try {
      const params = {
        to_email:    this.ADMIN_EMAIL,
        to_name:     'المسؤول',
        user_name:   userData.name,
        user_email:  userData.email,
        company_name:userData.company,
        plan_name:   'تجريبي 14 يوم',
        wilaya:      userData.wilaya || '—',
        date:        new Date().toLocaleDateString('ar-DZ', {year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}),
        message:     `تم تسجيل مؤسسة جديدة "${userData.company}" بواسطة ${userData.name} (${userData.email}) من ولاية ${userData.wilaya||'غير محددة'}.`
      };
      await emailjs.send(this.SERVICE_ID, this.TEMPLATE_ADMIN, params);
      console.log('✅ EmailJS: إشعار المسؤول أُرسل');
      return true;
    } catch(e) {
      console.warn('⚠️ EmailJS notifyNewAccount:', e);
      return false;
    }
  },

  // ── إرسال كلمة المرور الجديدة للمستخدم ──
  async sendNewPassword(userData, newPassword) {
    try {
      const params = {
        to_email:    userData.email,
        to_name:     userData.full_name || userData.name,
        user_email:  userData.email,
        new_password:newPassword,
        company_name:userData.company || '',
        date:        new Date().toLocaleDateString('ar-DZ', {year:'numeric',month:'long',day:'numeric'}),
        message:     `تم تعيين كلمة مرور جديدة لحسابك في SmartStruct. يُنصح بتغييرها بعد أول تسجيل دخول.`
      };
      await emailjs.send(this.SERVICE_ID, this.TEMPLATE_USER, params);
      console.log('✅ EmailJS: كلمة المرور أُرسلت للمستخدم');
      return true;
    } catch(e) {
      console.warn('⚠️ EmailJS sendNewPassword:', e);
      return false;
    }
  },

  // ── إرسال إشعار طلب إعادة تعيين كلمة المرور للمسؤول ──
  async notifyResetRequest(userData) {
    try {
      const params = {
        to_email:    this.ADMIN_EMAIL,
        to_name:     'المسؤول',
        user_name:   userData.full_name,
        user_email:  userData.email,
        company_name:userData.companyName || '',
        date:        new Date().toLocaleDateString('ar-DZ', {year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}),
        message:     `طلب المستخدم ${userData.full_name} (${userData.email}) إعادة تعيين كلمة المرور الخاصة به.`
      };
      await emailjs.send(this.SERVICE_ID, this.TEMPLATE_ADMIN, params);
      console.log('✅ EmailJS: إشعار طلب كلمة المرور أُرسل للمسؤول');
      return true;
    } catch(e) {
      console.warn('⚠️ EmailJS notifyResetRequest:', e);
      return false;
    }
  },

  // ── إرسال إيميل تفعيل الحساب للمستخدم الجديد ──
  async sendActivationEmail(userData) {
    try {
      const params = {
        to_email:    userData.email,
        to_name:     userData.full_name || userData.name,
        user_email:  userData.email,
        user_name:   userData.full_name || userData.name,
        new_password:userData.password,
        company_name:userData.company || userData.name,
        plan_name:   'تجريبي 14 يوم',
        date:        new Date().toLocaleDateString('ar-DZ', {year:'numeric',month:'long',day:'numeric'}),
        message:     `مرحباً ${userData.full_name || userData.name}، تم تفعيل حسابك في SmartStruct بنجاح! يمكنك الآن تسجيل الدخول باستخدام بريدك الإلكتروني وكلمة المرور أدناه.`
      };
      await emailjs.send(this.SERVICE_ID, this.TEMPLATE_USER, params);
      console.log('✅ EmailJS: إيميل التفعيل أُرسل للمستخدم');
      return true;
    } catch(e) {
      console.warn('⚠️ EmailJS sendActivationEmail:', e);
      return false;
    }
  }
};
