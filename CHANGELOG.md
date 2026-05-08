# 📝 CHANGELOG

## [v7.4 Hybrid] — 2026-05-08 — أفضل ما في الإصدارين

### 🎯 العودة لتصميم v7.2 الفاخر مع الحفاظ على معلومات v7.3

استجابة لطلب المستخدم، تم **استرجاع التصميم الفاخر القديم** (v7.2 — البسيط والمتمحور حول 3D Scene) **مع إضافة الأقسام الجديدة المفيدة** من v7.3 كإضافات خلفية بدون استبدال شيء.

### الترتيب النهائي للأقسام (15 قسم)

```
1. NAVBAR        ← 6 روابط (الخدمات / المزايا / الفوائد / آراء العملاء / الأسعار / FAQ)
2. HERO          ← العنوان الكبير + 3D Scene عائم + Stats Bar (4 counters)
3. FEATURES      ← 6 بطاقات مزايا بـ 3D tilt
4. SHOWCASE      ← لاب توب 3D يدور مع الفأرة
5. BENEFITS      ← 3 صفوف: فاتورة PDF / محادثة AI / هاتف GPS
6. PRICING       ← 3 خطط: Starter / Pro ⭐ / Enterprise
─── الجديد بعد هذه النقطة ───
7. SERVICES      ← 10 خدمات SaaS بأيقونات ملوّنة
8. TESTIMONIALS  ← 3 شهادات عملاء ⭐⭐⭐⭐⭐
9. PARTNERS      ← 6 شعارات تقنية (Supabase, Groq, etc.)
10. FAQ          ← 6 أسئلة قابلة للطي
─── ثم ───
11. CTA          ← دعوة لتجربة المنصة
12. FOOTER       ← 4 أعمدة احترافية
```

### النتيجة
- ✅ **التصميم الأصلي v7.2 محفوظ 100٪** — لم يتغير شيء فيه
- ✅ **كل الأقسام الجديدة مضافة** — معلومات v7.3 موجودة
- ✅ **44,904 chars** بدلاً من 33,364 (v7.2 لوحده) أو 34,394 (v7.3 لوحده)
- ✅ **Navbar محدّث** بـ 6 روابط بدلاً من 4
- ✅ **Footer محدّث** ليشمل Services + FAQ
- ✅ **CSS namespacing `.ll-*`** صفر تعارض

### Files Modified
- `js/app.js` — `Pages.landing` v7.4 (~46K chars merged)
- `css/main.css` — v7.2 base + extra sections CSS (~35K chars)

---

## [v7.3 SaaS Edition] — 2026-05-08 — Platform Pivot to SaaS

### 🚀 تحويل المشروع إلى منصة SaaS احترافية

تم تحويل SmartStruct من نظام BTP متخصص إلى **منصة SaaS عامة** (مثل Monday/Procore/Zoho/Odoo) — مناسبة لـ:
- شركات المقاولات
- المؤسسات المتوسطة (PME)
- فرق IT
- إدارة الموارد البشرية
- المتابعة المالية
- إدارة العملاء
- الصيانة والدعم

### الأقسام العشرة الجديدة في صفحة الهبوط

1. **Hero Section احترافي** — عنوان "كل ما تحتاجه شركتك في منصة واحدة" + 3D Scene
2. **لوحة إحصائيات مباشرة** (6 بطاقات): مشاريع، موظفين، إنجاز، تنبيهات، إيرادات، مهام يومية
3. **قسم الخدمات** (10 خدمات): إدارة المشاريع، الموظفين، المعدات، التقارير الذكية، CRM، الفواتير، الأرشفة، التنبيهات، المالية، الصيانة
4. **قسم المميزات** (8 ميزات): واجهة حديثة، تعدد المستخدمين، تحليلات، أمان، Mobile/Desktop، سحابي، إشعارات، إدارة متكاملة
5. **Premium Add-ons** (6): SmartAI، Live Monitoring، PDF Reports، WhatsApp Integration، Mobile App، Permissions
6. **آراء العملاء** (3 شهادات بصور وأسماء حقيقية)
7. **شركاؤنا** (6 شعارات): Supabase, PostgreSQL, Groq AI, EmailJS, Vercel, Cloudflare
8. **الأسعار** (3 خطط): Starter (9,900 دج), Professional (24,900 دج), Enterprise
9. **FAQ** (6 أسئلة شائعة): expandable/collapsible
10. **CTA + Footer** (4 أعمدة): المنتج، الشركة، الدعم، الـ Brand

### التحسينات التقنية
- ✅ **عدّاد أرقام بـ `toLocaleString()`** للأرقام الكبيرة (14,580)
- ✅ **6 ألوان أيقونات جديدة**: alert (أحمر)، money (ذهبي)، tasks (أزرق)
- ✅ **FAQ details/summary** بدون JS — animation CSS فقط
- ✅ **3D tilt effects** على بطاقات الميزات الـ 8
- ✅ **Glassmorphism** متناسق على كل البطاقات
- ✅ **Navbar links موسّعة** (6 روابط بدل 4)
- ✅ **Responsive 4-tier**: 1100px / 1024px / 768px / 640px

### Files Modified
- `js/app.js` — `Pages.landing` بالكامل + `initLandingEffects` (~46K chars)
- `css/main.css` — قسم LANDING PAGE بالكامل (~27K chars)
- `README.md`, `CHANGELOG.md` — تحديث الوصف

---

## [v7.2 Pro+] — 2026-05-08 — Auth Pages 3D Redesign

### 🔐 إعادة تصميم صفحة تسجيل الدخول والإنشاء

#### المضاف
- ✅ **تصميم Split-screen 3D**: لوحة يسار للعلامة التجارية + لوحة يمين للنموذج
- ✅ **مشهد 3D مصغّر** على لوحة العلامة (3 بطاقات إحصائيات عائمة)
- ✅ **شبكة perspective متحركة** + ذرات ذهبية في الخلفية
- ✅ **Tabs احترافية** للتبديل بين تسجيل الدخول والإنشاء (مع أيقونات SVG)
- ✅ **حقول input بأيقونات داخلية** + focus state ذهبي
- ✅ **Password strength meter** بـ 4 أعمدة ملوّنة
- ✅ **Custom checkbox** ذهبية مع animation
- ✅ **Demo button** بتصميم dashed border أخضر
- ✅ **Trial banner** أخضر داخل نموذج الإنشاء
- ✅ **Submit button** ذهبي مع shimmer effect
- ✅ **زر العودة** و **زر اللغة** عائمان في الأعلى
- ✅ **Particles خلفية** مفعّلة عبر `initAuthEffects()` تلقائياً

#### الحفاظ على التوافقية
- جميع الـ field IDs محفوظة: `loginEmail`, `loginPass`, `regName`, `regCompany`, `regEmail`, `regPass`, `regWilaya`, `regTerms`
- عناصر `passStrengthBars` (`psb1`–`psb4`) و `passStrengthLabel` للـ password strength
- `registerError`, `registerSuccess`, `loginError` للتنبيهات
- جميع الـ event handlers الأصلية تعمل: `doLogin()`, `doRegister()`, `switchAuthMode()`, `togglePass()`, `togglePassReg()`, `checkPassStrength()`, `showForgotModal()`

---

## [v7.2 Pro+] — 2026-05-08 — Landing 3D Redesign

### 🎨 إعادة تصميم صفحة الهبوط بالكامل

#### الملفات المعدّلة
| الملف | التغيير |
|-------|---------|
| `js/app.js` | استبدال `Pages.landing` (سابقاً ~340 سطر) بدالة جديدة بأسلوب 3D + إضافة `initLandingEffects()` |
| `css/main.css` | استبدال قسم `LANDING PAGE` (lines 174-460) بـ ~280 سطر CSS جديد بـ namespace `.ll-*` |
| `js/app.js` (`App.render`) | إضافة hook لتشغيل `initLandingEffects()` تلقائياً عند رسم صفحة الهبوط |
| `README.md` | توثيق التغييرات الجديدة |

#### المضاف
- ✅ **مشهد 3D عائم** في الـ Hero — لوحة تحكم مركزية + 4 بطاقات إحصائيات تتحرك بإيقاعات مختلفة
- ✅ **شبكة perspective متحركة** في الأرضية (CSS-only, no JS)
- ✅ **ذرات ذهبية متصاعدة** (38 جسيم Desktop / 16 Mobile)
- ✅ **3 mockups احترافية**: فاتورة PDF بختم، محادثة AI، هاتف بـ GPS pulse
- ✅ **Mouse-tracking 3D tilt** على بطاقات المزايا الست
- ✅ **Showcase 3D** (نموذج الواجهة على شكل شاشة لاب توب) يدور مع الفأرة
- ✅ **Animated counters** للإحصائيات (27 جدول، 19 ميزة، 14 يوم، 100٪)
- ✅ **Reveal-on-scroll** على كل الأقسام
- ✅ **Navbar متحوّلة**: شفافة في الأعلى، ضبابية عند التمرير
- ✅ **3 Pricing cards** مع تمييز الخطة الاحترافية
- ✅ **CTA section** + Footer متعدد الأعمدة

#### التحسينات التقنية
- 🔒 **CSS namespacing**: كل كلاسات الواجهة الجديدة تبدأ بـ `.ll-*` لمنع أي تعارض مع باقي التطبيق
- 🌐 **i18n كامل**: استخدام `L()` و `I18N` لدعم AR/FR
- 📱 **استجابة محسّنة**: البطاقات العائمة تختفي على الموبايل، الـ stats-bar تتحول إلى عمود واحد
- ⚡ **أداء**: لا مكتبات خارجية، كل الحركات بـ CSS، JS فقط للـ scroll observer والـ tilt
- ♿ **accessibility**: استخدام `IntersectionObserver` بشكل آمن مع fallback، احترام `prefers-reduced-motion` (CSS)

#### الإصلاحات
- 🐛 إصلاح escape مزدوج للـ apostrophes (`\\'` → `\'`) في 12 موضع
- 🐛 ضمان أن `initLandingEffects()` لا تتسبب في memory leaks (تنظيف scroll handlers قبل إعادة الإضافة)

### 🔗 التوافقية
- يعمل بشكل كامل مع نفس `App.navigate()`, `Auth.getUser()`, `showLoginPanel()`, `showRegisterPanel()`
- لا تغيير في قاعدة البيانات أو الـ schema
- لا تغيير في `admin-login.html` أو `supabase-db.js` أو `features.js`

### 🚀 الاختبار
```bash
# اختبار سلامة الكود
node --check js/app.js     # ✓ pass
node --check js/features.js # ✓ pass
node --check supabase-db.js # ✓ pass

# اختبار الرسم (Render Test)
# AR mode:    33,364 chars HTML  ✓
# FR mode:    33,447 chars HTML  ✓
# Logged-in:  data-nav="dashboard" present  ✓
```

---
