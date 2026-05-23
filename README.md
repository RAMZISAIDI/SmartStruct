# 🏗️ SmartStruct v7.3 Pro — دليل النشر والإعداد

> ## 📚 الجديد في v7.3 — مركز الوثائق الإدارية والمالية الجزائرية
>
> تمت إضافة **وحدة كاملة لإدارة وتوليد الوثائق القانونية** للمقاولات الجزائرية حسب دورة حياة المشروع:
>
> ### 📋 5 أقسام تحتوي 22 نوع وثيقة احترافية
>
> **① الوثائق التجارية والتعاقدية (Pre-Contract):**
> - 📋 فاتورة شكلية (Facture Proforma)
> - 📊 كشف كمي وتقديري (Devis Estimatif) — بنظام LOTs
> - 💰 جدول الأسعار الوحدوية (BPU)
> - 🏢 عرض الخدمة (Offre de Service) — مع سوابق + موارد بشرية + عتاد
>
> **② وثائق الميدان والتنفيذ (Execution):**
> - 🚀 محضر بدء الأشغال (PV d'Ouverture)
> - 📐 كشف المرفقات (Attachement)
> - 📔 يوميات الورشة (Journal de Chantier)
> - 🤝 محضر استلام مؤقت (PV Réception Provisoire) — مع تحفظات
> - ✅ محضر استلام نهائي (PV Réception Définitive)
>
> **③ النظام المالي والفوترة (Billing):**
> - ⏩ فاتورة تسبيق (Facture d'Acompte)
> - 📈 كشف أشغال / وضعية (Situation de Travaux) — مع خصم تلقائي للسابقة والتسبيقات والضمان 5%
> - 🏁 فاتورة نهائية (Facture Définitive) — تصفية حساب كامل
> - 🧾 وصل تسديد (Quittance de Paiement) — مع استيراد من فاتورة مدفوعة
>
> **④ الموارد البشرية والرواتب (HR):**
> - 💼 كشف راتب (Fiche de Paie) — حساب آلي لـ CNAS 9% + IRG حسب الشرائح الجزائرية
> - 📝 عقد CDD محدد المدة
> - 🤝 عقد CTA مدعم (ANEM)
> - 🔒 عقد CDI دائم
> - ⏱️ بطاقة حضور (Fiche de Pointage)
> - 📄 شهادة عمل (Attestation de Travail)
>
> **⑤ اللوجستيك والمخزون (Logistics):**
> - 🛒 وصل طلب (Bon de Commande)
> - 📥 وصل استلام (Bon de Réception) — مع تأشير حالة كل صنف
> - 📤 وصل خروج (Bon de Sortie) — مع تتبع المخزون
> - 🚜 بطاقة تتبع عتاد (Fiche Suivi Équipement) — وقود + ساعات + صيانة
>
> ### ✨ الميزات التقنية
>
> - **🎨 قالب احترافي موحد**: ترويسة سوداء مع شعار ذهبي + ترقيم آلي
> - **🏛️ الترويسة القانونية الإلزامية تلقائياً**: RC, NIF, NIS, رقم المادة، RIB، العنوان
> - **🌐 ثنائي اللغة**: عربي + فرنسي في نفس الوثيقة (مطلب قانوني)
> - **📄 طباعة وحفظ PDF**: عبر "Save as PDF" في متصفح المستخدم — جودة عالية + دعم كامل للعربية
> - **🔗 ربط ذكي بالبيانات**: قوائم منسدلة من المشاريع/العمال/المعدات/الفواتير الموجودة
> - **🛡️ سجل تدقيق آلي**: كل توليد وثيقة يُسجل في `audit_log`
> - **💡 نسب TVA والضرائب**: حسب القانون الجزائري (TVA 19% افتراضي، IRG حسب الشرائح، CNAS 9%/26%)
>
> ### 🚀 طريقة الاستخدام
>
> 1. **استكمل البيانات القانونية** أولاً من: **الإعدادات → البيانات القانونية الجزائرية** (RC, NIF, NIS, المادة، RIB، العنوان)
> 2. **افتح**: القائمة الجانبية → قسم **"الوثائق والتقارير"** → **📚 وثائق إدارية ومالية**
> 3. **اختر** القسم المناسب ثم نوع الوثيقة → املأ النموذج → **توليد وطباعة PDF**
>
> ### 📁 الملفات الجديدة
> - `js/dz-docs.js` — وحدة `DZDocs` (مولّد الوثائق - 22 دالة)
> - `js/dz-docs-ui.js` — صفحة `Pages.dz_documents` + معالجات `DZDocsUI`
>
> ### 🗄️ تحديثات قاعدة البيانات
> أضيفت حقول جديدة لجدول `tenants`:
> - `article_imp` (رقم المادة الجبائية)
> - `rib` (رقم الحساب البنكي)
>
> Migration آلي في `supabase-schema.sql` (آخر الملف) للقواعد القائمة.

---

> ## 🎨 من v7.2 — واجهة هبوط ثلاثية الأبعاد
>
> تم إعادة تصميم صفحة الهبوط (`Pages.landing`) بالكامل بأسلوب **Premium 3D** متناسق مع هوية الموقع الذهبية:
> - **مشهد 3D عائم** في الـ Hero مع 5 بطاقات (لوحة التحكم + 4 إحصائيات حية)
> - **شبكة perspective متحركة** في الأرضية + ذرات ذهبية متصاعدة
> - **3 معاينات mockup حقيقية**: فاتورة PDF، محادثة SmartAI، هاتف بوضع الميدان مع نبضات GPS
> - **تفاعلات تتبع الفأرة** على بطاقات المزايا (3D tilt) والـ Showcase
> - **عدّاد أرقام تلقائي** + reveal-on-scroll + navbar شفافة تتبدّل عند التمرير
> - **CSS namespace `.ll-*`** لمنع أي تعارض مع باقي التطبيق
> - **دعم RTL/LTR كامل** مع AR + FR عبر `L()` و `I18N`
> - **استجابة كاملة** على الموبايل (البطاقات العائمة تختفي تلقائياً)
>
> **التكامل**: يعمل مع نفس `App.navigate()`, `showLoginPanel()`, `showRegisterPanel()`, `applyDOMTranslation()` — لا حاجة لتعديل أي شيء آخر. الـ effects تُهيّأ تلقائياً عبر `initLandingEffects()` التي تستدعى من `App.render()`.

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
    ├── features.js         ← الميزات المتقدمة (v7.2)
    ├── dz-docs.js          ← 🆕 وحدة DZDocs — مولد 22 وثيقة جزائرية (v7.3)
    ├── dz-docs-ui.js       ← 🆕 صفحة Pages.dz_documents + معالجات DZDocsUI (v7.3)
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
