# 🏗️ SmartStruct v7.4 Hybrid — منصة الإدارة الذكية

> ## 🎯 الإصدار v7.4 — أفضل ما في الإصدارين
>
> تم استرجاع التصميم الفاخر **v7.2 PRO 3D** (الأنظف بصرياً) مع الحفاظ على **كل الأقسام الجديدة** من v7.3 (الخدمات، الشهادات، الشركاء، FAQ).
>
> **النتيجة**: صفحة هبوط من 12 قسماً بترتيب احترافي:
> 1. Navbar (6 روابط) → 2. Hero مع 3D Scene → 3. Stats Bar → 4. 6 Features → 5. Showcase 3D → 6. 3 Benefits → 7. Pricing → 8. **10 Services** → 9. **3 Testimonials** → 10. **6 Partners** → 11. **6 FAQ** → 12. CTA + Footer
>
> ✅ **البساطة الفاخرة** للتصميم الأصلي + ✅ **العمق الاحترافي** لمنصة SaaS

## 📁 هيكل الملفات

```
SmartStruct/
├── index.html              ← التطبيق الرئيسي
├── admin-login.html        ← لوحة تحكم المسؤول
├── supabase-db.js          ← محرك قاعدة البيانات (27 جدول متطابق)
├── supabase-schema.sql     ← هيكل قاعدة البيانات PostgreSQL
├── README.md               ← هذا الدليل
├── css/
│   └── main.css
└── js/
    ├── app.js              ← منطق التطبيق الأساسي
    ├── features.js         ← 🆕 الميزات المتقدمة (v7.2)
    └── emailjs-config.js
```

---

## 🆕 الجديد في v7.2 — 19 ميزة احترافية

### 🔐 الأمان (4)
| # | الميزة | كيف تستخدمها |
|---|--------|---------------|
| 1 | **تشفير كلمات المرور** (PBKDF2 + SHA-256 + 100k iterations) | تلقائي — يطبَّق عند التسجيل، ويُرقّى الحسابات القديمة عند أول دخول |
| 2 | **Row Level Security (RLS)** | مفعّل افتراضياً في `supabase-schema.sql` على كل الجداول |
| 3 | **Audit Log** — سجل كل التعديلات | جدول `audit_log` يلتقط: من، متى، ماذا غيّر (قبل/بعد) + IP + User Agent |
| 4 | **النسخ الاحتياطي** | `SmartBackup.exportAll()` لتصدير JSON كامل · تذكير أسبوعي تلقائي |

### 🤖 الذكاء الاصطناعي (2)
| # | الميزة | الاستخدام |
|---|--------|-----------|
| 5 | **مساعد محادثاتي ذكي** 🤖 | زر عائم أسفل اليسار → يجيب على أسئلة بناءً على بيانات المستخدم |
| 6 | **تقارير شهرية ذكية** | `AIReports.showReportModal()` — يحلل البيانات ويكتب تقريراً عربياً مع توصيات |

> **API**: يستخدم Groq (مجاني — 14,400 طلب/يوم)

### 📄 توليد PDF (3)
| # | الميزة | الاستخدام |
|---|--------|-----------|
| 7 | **فواتير PDF احترافية** | `PDFGenerator.invoice(invoiceId)` — مع شعار، NIF/NIS/RC، TVA 19%، مكان الختم |
| 8 | **عقود عمل قانونية** | `PDFGenerator.contractWorker(workerId)` — حسب القانون الجزائري |
| 9 | **توقيع إلكتروني** | جدول `signatures` — رابط فريد للعميل لتوقيع الفاتورة |

### 💰 التحليلات المالية (2)
| # | الميزة | الاستخدام |
|---|--------|-----------|
| 10 | **توقعات السيولة (Cash Flow)** | `CashFlow.showPanel()` — يرسم منحنى الرصيد لـ 90 يوم قادمة + تنبيهات |
| 11 | **استيراد كشوف البنوك** | جدول `bank_transactions` — استيراد CSV من CCP/BNA/BEA + مطابقة آلية |

### 📱 الموبايل والميدان (2)
| # | الميزة | الاستخدام |
|---|--------|-----------|
| 12 | **وضع الميدان (Mobile Mode)** | `MobileMode.show()` — 5 أزرار كبيرة: حضور، استلام مواد، صور، طلب صرف، GPS معدات |
| 13 | **تتبع GPS للمعدات** | `EquipmentGPS.generateQR(id)` — QR code للمعدة → مسح → تسجيل موقع تلقائي |

### 🎨 تجربة المستخدم (5)
| # | الميزة | الاستخدام |
|---|--------|-----------|
| 14 | **3 ثيمات** (داكن / فاتح / ذهبي) | `SmartThemes.cycleNext()` — تبديل سريع بزر واحد |
| 15 | **بحث فوري شامل (Ctrl+K)** | اضغط Ctrl+K → ابحث في كل البيانات |
| 16 | **تصدير Excel** | `QuickWins.exportExcel('projects')` بدلاً من CSV |
| 17 | **Onboarding tour** | يظهر تلقائياً للمستخدم الجديد عند أول دخول |
| 18 | **Time Tracking** | حقول `check_in/check_out/overtime/gps` في جدول `attendance` |

### 🛠️ إدارة متقدمة (1)
| # | الميزة | الاستخدام |
|---|--------|-----------|
| 19 | **Custom Role Builder** | جدول `custom_roles` — صلاحيات مخصصة مع scope (مثلاً: محاسب-مشروع-X) |

---

## ✅ الأخطاء التي تم تصحيحها (v7.1.2 → v7.2)

### 1️⃣ تطابق تام لقاعدة البيانات (27 جدول)
كانت هناك اختلافات حرجة في أسماء الأعمدة بين `SB_SCHEMA` (app.js) و `_SB_SCHEMA_INTERNAL` (supabase-db.js) و SQL — كانت تسبب فشل الرفع لـ Supabase بصمت. تم توحيد كل الجداول الـ 18 الأصلية + إضافة 9 جداول جديدة.

### 2️⃣ مزامنة الـ ID المحلي بعد INSERT الناجح
أكبر مشكلة: عند إضافة سجل، يولّد Supabase ID جديداً مختلفاً عن المحلي. النسخة السابقة لم تكن تحدّث الـ ID المحلي. الآن: بعد كل INSERT ناجح، يُحدَّث الـ ID المحلي تلقائياً.

### 3️⃣ نظام Trial/Expiration كامل
كانت `TrialManager.showExpiredModal/checkAndEnforce/checkExpiryWarning` غير معرَّفة! تمت إضافتها مع modal احترافي يشكر المستخدم على 14 يوم + يعرض الخطط.

### 4️⃣ دوال الأدمن — حذف من Supabase أولاً
`deleteTenantAccount`, `deleteUserAccount`, `toggleTenant`, `toggleUserActive`, `approveUpgrade` — جميعها تتحقق الآن من `res.ok` لكل طلب. حماية للحسابات الأساسية + منع حذف الذات.

### 5️⃣ ضبط sequences في SQL
`SELECT setval('tenants_id_seq', GREATEST(MAX(id), 100))` — يحل خطأ `duplicate key value` عند التسجيل الجديد.

---

## 🚀 خطوات النشر

### 1) إنشاء مشروع Supabase
[supabase.com](https://supabase.com) → New project (مجاني).

### 2) ⚠️ تشغيل SQL Schema
**مهم**: إذا كان لديك قاعدة بيانات قديمة، احذف الجداول أولاً. الـ schema الجديد يبدأ بـ `DROP TABLE IF EXISTS ... CASCADE`:

```
Supabase Dashboard → SQL Editor → New Query → الصق محتوى supabase-schema.sql → Run
```

### 3) إدخال مفاتيح Supabase
**خيار A (الأفضل):** افتح `supabase-db.js` السطرين 28-29:
```javascript
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xxxxx';
```

**خيار B:** التطبيق → الإعدادات → Supabase → أدخل URL و Key.

### 4) (اختياري) تفعيل AI
أدخل API Key من [groq.com](https://groq.com) (مجاني) في:
- لوحة المسؤول → الإعدادات → AI

---

## 🔐 بيانات الدخول الافتراضية

### لوحة الإدارة (`admin-login.html`)
| الحقل | القيمة |
|-------|--------|
| البريد | `admin@smartbtp.dz` |
| كلمة المرور | `Admin@SmartStruct2025` |
| مفتاح الأمان | `SSTR-ADMIN-2025` |

### حساب تجريبي (التطبيق الرئيسي)
| الحقل | القيمة |
|-------|--------|
| البريد | `demo@algerie-construction.dz` |
| كلمة المرور | `Demo@1234` |

> ⚠️ كلمات المرور الافتراضية في SQL **غير مشفّرة** — ستُشفَّر تلقائياً عند أول تسجيل دخول.

---

## 🗄️ جداول قاعدة البيانات (27 جدول)

**الأساسية (18):** `plans` · `tenants` · `users` · `projects` · `workers` · `equipment` · `transactions` · `attendance` · `materials` · `stock_movements` · `invoices` · `salary_records` · `kanban_tasks` · `documents` · `obligations` · `notes` · `notifications` · `global_settings`

**الجديدة في v7.2 (9):** `audit_log` · `custom_roles` · `equipment_locations` · `tenders` · `tender_offers` · `bank_transactions` · `signatures` · `ai_conversations` + توسعات على `users`, `tenants`, `attendance`

---

## 🔧 للمطورين

### إضافة جدول جديد
يجب إضافته في **3 أماكن**:
1. **`supabase-schema.sql`** — تعريف الجدول
2. **`supabase-db.js`** — في `_SB_SCHEMA_INTERNAL` + `_SB_DATE_FIELDS_INTERNAL` + `_SB_NUM_FIELDS_INTERNAL`
3. **`js/app.js`** — في `SB_SCHEMA`

### إضافة ميزة جديدة
أضفها كـ module في `js/features.js`:
```javascript
window.MyFeature = {
  doSomething() { /* ... */ }
};
```

### استخدام Audit Log
```javascript
AuditLog.log('update', 'projects', projectId, oldData, newData);
```

---

SmartStruct v7.2 Pro — صُمم للشركات الجزائرية في قطاع البناء والمقاولات
