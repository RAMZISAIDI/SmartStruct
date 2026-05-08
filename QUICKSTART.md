# 🚀 SmartStruct — تشغيل سريع

## 1️⃣ التشغيل المحلي (للتطوير)

```bash
# في مجلد المشروع
python3 -m http.server 8000
# ثم افتح: http://localhost:8000
```

أو باستخدام Node:
```bash
npx serve .
```

> ⚠️ **مهم**: لا تفتح `index.html` بـ `file://` مباشرة — Supabase و EmailJS يحتاجان CORS/HTTP.

## 2️⃣ النشر على الإنترنت

### الخيار الأسهل — Netlify Drop
1. اذهب إلى [app.netlify.com/drop](https://app.netlify.com/drop)
2. اسحب مجلد المشروع كاملاً
3. ستحصل على URL خلال ثوانٍ

### Vercel
```bash
npm install -g vercel
vercel
```

### GitHub Pages
1. أنشئ repo جديد على GitHub
2. ارفع الملفات
3. Settings → Pages → Source: main branch → Save

### استضافة عادية (cPanel/FTP)
ارفع كل الملفات إلى `public_html/` كما هي. الموقع يعمل مباشرة.

## 3️⃣ ربط Supabase

افتح `supabase-db.js`، عدّل السطرين 28-29:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xxxxx';
```

ثم في Supabase Dashboard → SQL Editor → الصق محتوى `supabase-schema.sql` → Run.

## 4️⃣ بيانات الدخول

### المستخدم العادي (`index.html`)
- **البريد**: `demo@algerie-construction.dz`
- **كلمة المرور**: `Demo@1234`

### المسؤول (`admin-login.html`)
- **البريد**: `admin@smartbtp.dz`
- **كلمة المرور**: `Admin@SmartStruct2025`
- **مفتاح الأمان**: `SSTR-ADMIN-2025`

## 5️⃣ التحقق من نجاح النشر

افتح الموقع وستظهر صفحة الهبوط الجديدة 3D مع:
- ✅ navbar شفافة في الأعلى
- ✅ مشهد 3D متحرك في الـ Hero
- ✅ عدّاد أرقام يتسارع للإحصائيات (27 / 19 / 14 / 100٪)
- ✅ ذرات ذهبية تتصاعد في الخلفية
- ✅ شبكة perspective متحركة في الأرضية

اضغط زر **"ابدأ التجربة الآن"** — يجب أن يأخذك لصفحة التسجيل.
اضغط زر **"دخول"** — يجب أن يأخذك لصفحة تسجيل الدخول.

## 🆘 مشاكل شائعة

| المشكلة | الحل |
|---------|------|
| الواجهة بيضاء/فارغة | افتح Console في المتصفح (F12) — تحقق من أخطاء JavaScript |
| Supabase لا يتصل | تأكد من `SUPABASE_URL` و `SUPABASE_KEY` صحيحين + الـ schema تم تشغيله |
| الخطوط لا تظهر | تأكد من اتصال الإنترنت — الخطوط من Google Fonts |
| التطبيق يعمل لكن الواجهة الجديدة لا تظهر | امسح cache المتصفح (Ctrl+Shift+R أو Cmd+Shift+R) |

---

📚 للمزيد، راجع: [README.md](./README.md) و [CHANGELOG.md](./CHANGELOG.md)
