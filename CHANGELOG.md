# 📝 CHANGELOG

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
