# 🔗 ملاحظات الدمج — SmartStruct + Design System

## ما الذي تغيّر؟

تم دمج نظام التصميم الموحّد (`SmartStruct Design System`) مع المشروع الأصلي.
كل ملفاتك القديمة موجودة وتعمل كما هي — أُضيف فوقها طبقة توكنز موحّدة.

## البنية الجديدة

```
SmartStruct/
├── index.html              ← مُحدَّث: يربط fonts + design-system + main
├── admin-login.html        ← مُحدَّث: نفس الشيء
├── css/
│   ├── design-system.css   ← 🆕 التوكنز الموحّدة (ألوان، خطوط، spacing…)
│   └── main.css            ← مُحدَّث: حُذف :root المحلي (يستعمل التوكنز الآن)
├── fonts/
│   └── fonts.css           ← 🆕 تعريف الخطوط
├── assets/                 ← 🆕 الشعارات والـ atmosphere
│   ├── logo.svg
│   ├── logo-mark.svg
│   └── textures/
│       ├── perspective-grid.svg
│       └── atmosphere.css
└── js/                     ← لم يتغيّر
    ├── app.js
    ├── features.js
    └── emailjs-config.js
```

## ترتيب تحميل CSS (مهم!)

في كل صفحة HTML:

```html
<link rel="stylesheet" href="fonts/fonts.css">          <!-- 1. الخطوط -->
<link rel="stylesheet" href="css/design-system.css">    <!-- 2. التوكنز -->
<link rel="stylesheet" href="assets/textures/atmosphere.css"> <!-- 3. الخلفية -->
<link rel="stylesheet" href="css/main.css">             <!-- 4. ستايل التطبيق -->
```

> **التوكنز قبل main.css دائماً** — لأن `main.css` يستعمل المتغيرات.

## طبقة التوافق (Compatibility Layer)

`design-system.css` يعرّف التوكنز بأسماء جديدة (`--ss-gold`, `--ss-bg-0`, …).
لكنه يحتوي أيضاً على **طبقة توافق** في الأسفل تربط الأسماء القديمة بالجديدة:

```css
:root {
  --gold:    var(--ss-gold);     /* legacy → جديد */
  --bg:      var(--ss-bg-0);
  --text:    var(--ss-fg);
  --green:   var(--ss-green);
  /* ... وهكذا */
}
```

✅ **النتيجة:** كود `main.css` القديم يعمل بدون أي تعديل، لكنه الآن يحصل على
القيم من نظام التصميم الموحد. أي تعديل لاحق على لوحة الألوان يطبَّق تلقائياً.

## كيف تستخدم نظام التصميم في كود جديد؟

### الطريقة الموصى بها — استعمل التوكنز الجديدة (`--ss-*`)
```css
.my-card {
  background: var(--ss-bg-2);
  color: var(--ss-fg);
  border: 1px solid var(--ss-border);
  border-radius: var(--ss-radius-md);
  padding: var(--ss-space-4);
}
```

### الطريقة المتوافقة مع القديم
```css
.my-card {
  background: var(--bg3);   /* يعمل أيضاً — يمر عبر طبقة التوافق */
  color: var(--text);
}
```

## الشعار الجديد

استبدل أي شعار حالي بـ:
```html
<img src="assets/logo.svg" alt="SmartStruct" height="40">
<!-- أو الأيقونة فقط -->
<img src="assets/logo-mark.svg" alt="" width="40" height="40">
```

## الخلفية المميزة (اختياري)

أضف هذا في أي صفحة لإظهار خلفية SmartStruct المميزة (شبكة ذهبية + توهج):
```html
<div class="ss-atmosphere"></div>
```

## التشغيل

```bash
cd SmartStruct
python3 -m http.server 8080
# ثم افتح: http://localhost:8080
```

## التحقق

افتح `index.html` وتحقق من:
- ✅ الخط Tajawal يظهر بشكل صحيح
- ✅ اللون الذهبي #E8B84B في الشعار والـ accents
- ✅ الخلفية الداكنة #060A10
- ✅ كل الميزات القديمة (AI chat, sidebar, إلخ) تعمل
