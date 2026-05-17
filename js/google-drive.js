/* ════════════════════════════════════════════════════════════════════
   SmartStruct v7.4 — Google Drive Integration
   حفظ الوثائق والفواتير تلقائياً في Google Drive المستخدم
   ════════════════════════════════════════════════════════════════════
   التدفق:
   1. المستخدم يضغط "ربط بـ Google Drive" في الإعدادات
   2. OAuth2 Implicit Flow → Google يُعطي access_token مؤقت
   3. عند توليد أي وثيقة، نرفعها تلقائياً كـ HTML في Drive
   4. البنية: SmartStruct / اسم المؤسسة / 2026 / الفئة / الملف
   ════════════════════════════════════════════════════════════════════ */

(function() {
'use strict';

// ── إعدادات Google OAuth ──
// ⚠️ يجب على المطوّر إنشاء مشروع في console.cloud.google.com
// وإضافة redirect URI = origin الموقع + تفعيل Google Drive API
const GDRIVE_CONFIG = {
  // Client ID من Google Console (يجب أن يكون مخصصاً للنطاق)
  CLIENT_ID: localStorage.getItem('sbtp_gdrive_client_id') || '',
  SCOPE: 'https://www.googleapis.com/auth/drive.file',
  DISCOVERY: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
};

// ── حالة الاتصال ──
const GDrive = {
  _token: null,
  _tokenExpiry: 0,
  _gapiLoaded: false,

  // ── الاتصال بـ Google Drive ──
  async connect() {
    // تحميل Google API Script
    await this._loadGAPI();

    // التحقق من وجود Client ID
    if (!GDRIVE_CONFIG.CLIENT_ID) {
      const id = prompt(
        L(
          'أدخل Google Client ID من Google Console:\n(console.cloud.google.com → APIs & Services → Credentials)',
          'Entrez votre Google Client ID depuis Google Console:\n(console.cloud.google.com → APIs & Services → Credentials)'
        )
      );
      if (!id?.trim()) { Toast.warn(L('تم الإلغاء','Annulé')); return false; }
      localStorage.setItem('sbtp_gdrive_client_id', id.trim());
      GDRIVE_CONFIG.CLIENT_ID = id.trim();
    }

    return new Promise((resolve) => {
      // OAuth2 Implicit Flow
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GDRIVE_CONFIG.CLIENT_ID,
        scope: GDRIVE_CONFIG.SCOPE,
        callback: (resp) => {
          if (resp.error) {
            Toast.error(L('فشل تسجيل الدخول بـ Google: ' + resp.error, 'Échec connexion Google: ' + resp.error));
            resolve(false);
            return;
          }
          this._token = resp.access_token;
          this._tokenExpiry = Date.now() + (Number(resp.expires_in) * 1000);
          // حفظ token مؤقتاً (ينتهي خلال ساعة)
          localStorage.setItem('sbtp_gdrive_token', JSON.stringify({ token: this._token, expiry: this._tokenExpiry }));
          Toast.success(L('✅ تم ربط Google Drive بنجاح!', '✅ Google Drive connecté avec succès!'));
          resolve(true);
        },
      });
      tokenClient.requestAccessToken({ prompt: '' });
    });
  },

  // ── فحص الاتصال ──
  isConnected() {
    // قراءة token من storage
    if (!this._token) {
      try {
        const saved = JSON.parse(localStorage.getItem('sbtp_gdrive_token') || 'null');
        if (saved && saved.expiry > Date.now()) {
          this._token = saved.token;
          this._tokenExpiry = saved.expiry;
        }
      } catch(_) {}
    }
    return !!this._token && this._tokenExpiry > Date.now();
  },

  // ── قطع الاتصال ──
  disconnect() {
    this._token = null;
    this._tokenExpiry = 0;
    localStorage.removeItem('sbtp_gdrive_token');
    Toast.info(L('تم قطع الاتصال بـ Google Drive','Google Drive déconnecté'));
  },

  // ── تحميل Google API ──
  async _loadGAPI() {
    if (this._gapiLoaded) return;
    await new Promise((res, rej) => {
      if (typeof google !== 'undefined' && google.accounts) { this._gapiLoaded = true; res(); return; }
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = () => { this._gapiLoaded = true; res(); };
      s.onerror = () => rej(new Error('Google GSI not loaded'));
      document.head.appendChild(s);
    });
  },

  // ── إنشاء أو إيجاد مجلد في Drive ──
  async _getOrCreateFolder(name, parentId = null) {
    const token = this._token;
    // بحث عن المجلد
    let q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;
    if (parentId) q += ` and '${parentId}' in parents`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const searchData = await searchRes.json();
    if (searchData.files?.length) return searchData.files[0].id;

    // إنشاء المجلد إذا لم يوجد
    const meta = { name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : [] };
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(meta),
    });
    const created = await createRes.json();
    return created.id;
  },

  // ── بناء هيكل المجلدات: SmartStruct > اسم المؤسسة > 2026 > الفئة ──
  async _buildFolderStructure(category) {
    const tenant = (typeof Auth !== 'undefined' && Auth.getTenant) ? Auth.getTenant() : {};
    const company = tenant?.name || 'SmartStruct';
    const year    = new Date().getFullYear().toString();

    // المجلد الجذر
    const rootId    = await this._getOrCreateFolder('SmartStruct BTP');
    const companyId = await this._getOrCreateFolder(company, rootId);
    const yearId    = await this._getOrCreateFolder(year, companyId);
    const catId     = await this._getOrCreateFolder(category, yearId);
    return catId;
  },

  // ── رفع ملف HTML إلى Drive ──
  async uploadHTML(htmlContent, filename, category) {
    if (!this.isConnected()) {
      const ok = await this.connect();
      if (!ok) return null;
    }

    Toast.info(L(`⏳ جاري الرفع إلى Google Drive...`, `⏳ Envoi vers Google Drive...`));

    try {
      const folderId = await this._buildFolderStructure(category);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });

      // Multipart upload
      const boundary = '-------314159265358979323846';
      const meta = JSON.stringify({ name: filename + '.html', parents: [folderId] });
      const body = [
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n`,
        `--${boundary}\r\nContent-Type: text/html\r\n\r\n`,
        await blob.text(),
        `\r\n--${boundary}--`,
      ].join('');

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this._token}`,
            'Content-Type': `multipart/related; boundary="${boundary}"`,
          },
          body,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error?.code === 401) {
          // Token انتهى — أعد التوثيق
          this._token = null;
          localStorage.removeItem('sbtp_gdrive_token');
          Toast.warn(L('انتهت جلسة Google — جارٍ إعادة الاتصال...','Session Google expirée — reconnexion...'));
          return this.uploadHTML(htmlContent, filename, category);
        }
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      const file = await res.json();
      Toast.success(
        `✅ ${L('تم الحفظ في Google Drive','Sauvegardé dans Google Drive')} — <a href="${file.webViewLink}" target="_blank" style="color:#E8B84B;text-decoration:underline">${L('فتح الملف','Ouvrir')}</a>`,
        6000
      );
      return file;
    } catch(err) {
      Toast.error(L('❌ فشل الرفع: ' + err.message, '❌ Échec upload: ' + err.message));
      return null;
    }
  },

  // ── تحديد الفئة حسب نوع الوثيقة ──
  _getCategory(docType) {
    const map = {
      PROFORMA: L('فواتير شكلية','Factures Proforma'),
      DEVIS:    L('كشوفات تقديرية','Devis Estimatifs'),
      BPU:      L('جداول الأسعار','BPU'),
      OFFRE:    L('عروض الخدمة','Offres de Service'),
      ACOMPTE:  L('فواتير التسبيق','Factures Acompte'),
      SITUATION:L('كشوفات الأشغال','Situations de Travaux'),
      FACTURE_DEF: L('فواتير نهائية','Factures Définitives'),
      QUITTANCE: L('وصولات الدفع','Quittances'),
      FICHE_PAIE: L('كشوف الرواتب','Bulletins de Paie'),
      CONTRAT:  L('عقود العمل','Contrats de Travail'),
      POINTAGE: L('بطاقات الحضور','Fiches de Pointage'),
      ATTESTATION: L('شهادات العمل','Attestations'),
      BON_CMD:  L('أوامر الشراء','Bons de Commande'),
      BON_REC:  L('وصولات الاستلام','Bons de Réception'),
      BON_SORTIE: L('وصولات الخروج','Bons de Sortie'),
      FICHE_SUIVI: L('بطاقات المعدات','Fiches Équipement'),
      PV_OUVERTURE: L('محاضر الأشغال','PV Ouverture'),
      PV_PROV:  L('محاضر الاستلام','PV Réception'),
      PV_DEF:   L('محاضر الاستلام','PV Réception'),
      ATTACHEMENT: L('المرفقات','Attachements'),
      JOURNAL:  L('يوميات الورشة','Journaux de Chantier'),
    };
    return map[docType] || L('وثائق أخرى','Autres Documents');
  },
};

// ── تصدير للـ window ──
window.GDrive = GDrive;

// ════════════════════════════════════════════════════════════════════
//  اعتراض _openPrint لحفظ تلقائي في Drive
// ════════════════════════════════════════════════════════════════════
(function patchOpenPrint() {
  // ننتظر تحميل dz-docs.js أولاً
  const waitForDZDocs = setInterval(() => {
    if (typeof window._openPrint !== 'function' && typeof window.DZDocs === 'undefined') return;
    clearInterval(waitForDZDocs);

    const origOpenPrint = window._openPrint;
    if (!origOpenPrint) return;

    // نعترض _openPrint ونضيف زر "حفظ في Drive" في نافذة الطباعة
    window._openPrint = function(html, filename, autoPrint) {
      // إضافة زر Drive في HTML الوثيقة إذا كان المستخدم موصولاً
      if (GDrive.isConnected()) {
        // حقن زر Drive في شريط أزرار الوثيقة
        const driveBtn = `<button class="btn-print" style="background:#4285F4" onclick="(function(){
          const html = document.documentElement.outerHTML;
          window.opener && window.opener.GDrive && window.opener.GDrive.uploadHTML(html, ${JSON.stringify(filename)}, 'Documents');
        })()">
          <svg width="16" height="16" viewBox="0 0 87.3 78" style="margin-right:6px;vertical-align:middle">
            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
            <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
            <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
            <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
            <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
          </svg>
          ${L('حفظ في Drive','Sauv. Drive')}
        </button>`;
        html = html.replace('<div class="no-print">', '<div class="no-print">' + driveBtn);
      }

      const win = origOpenPrint(html, filename, autoPrint);

      // إذا كان Drive موصولاً → حفظ تلقائي في الخلفية
      if (GDrive.isConnected() && html && filename) {
        setTimeout(() => {
          GDrive.uploadHTML(html, filename, 'Documents').catch(() => {});
        }, 500);
      }

      return win;
    };
  }, 500);
})();

// ════════════════════════════════════════════════════════════════════
//  واجهة إعدادات Google Drive في الإعدادات
// ════════════════════════════════════════════════════════════════════
window.renderGDriveSettings = function() {
  const connected = GDrive.isConnected();
  const clientId  = localStorage.getItem('sbtp_gdrive_client_id') || '';
  const expiry    = JSON.parse(localStorage.getItem('sbtp_gdrive_token') || 'null')?.expiry;
  const remaining = expiry ? Math.max(0, Math.round((expiry - Date.now()) / 60000)) : 0;

  return `
    <div class="card" style="margin-bottom:1rem;border:1px solid ${connected?'rgba(52,195,143,.3)':'rgba(255,255,255,.1)'}">
      <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:1rem">
        <svg width="28" height="28" viewBox="0 0 87.3 78">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
        </svg>
        <div>
          <div style="font-weight:800">Google Drive</div>
          <div style="font-size:.72rem;color:${connected?'#34C38F':'var(--dim)'}">
            ${connected
              ? `✅ ${L('متصل','Connecté')} — ${L('الجلسة تنتهي خلال','Session expire dans')} ${remaining} ${L('دقيقة','min')}`
              : `⭕ ${L('غير متصل','Non connecté')}`
            }
          </div>
        </div>
        ${connected
          ? `<span style="margin-right:auto;background:rgba(52,195,143,.1);border:1px solid rgba(52,195,143,.3);color:#34C38F;font-size:.7rem;padding:3px 10px;border-radius:20px;font-weight:700">${L('الحفظ التلقائي مُفعَّل','Auto-save activé')}</span>`
          : ''
        }
      </div>

      ${connected ? `
        <!-- حالة Drive -->
        <div style="background:rgba(52,195,143,.05);border:1px solid rgba(52,195,143,.15);border-radius:10px;padding:.8rem 1rem;margin-bottom:.8rem;font-size:.78rem">
          <div style="font-weight:700;margin-bottom:.4rem;color:#34C38F">📁 ${L('بنية المجلدات التلقائية','Structure de dossiers automatique')}</div>
          <div style="font-family:monospace;color:var(--dim);line-height:2;font-size:.72rem">
            <div>📂 SmartStruct BTP</div>
            <div style="padding-right:1rem">📂 ${escHtml((typeof Auth!=='undefined'&&Auth.getTenant)?Auth.getTenant()?.name||'مؤسستك':'مؤسستك')}</div>
            <div style="padding-right:2rem">📂 ${new Date().getFullYear()}</div>
            <div style="padding-right:3rem">📂 ${L('فواتير نهائية','Factures Définitives')}</div>
            <div style="padding-right:3rem">📂 ${L('كشوف الرواتب','Bulletins de Paie')}</div>
            <div style="padding-right:3rem">📂 ${L('عقود العمل','Contrats de Travail')}</div>
            <div style="padding-right:3rem">📂 ${L('...','...')}</div>
          </div>
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="GDrive.disconnect();App.navigate('settings')">
            🔌 ${L('قطع الاتصال','Déconnecter')}
          </button>
          <button class="btn btn-blue btn-sm" onclick="GDrive.connect().then(ok=>ok&&App.navigate('settings'))">
            🔄 ${L('تجديد الجلسة','Renouveler session')}
          </button>
        </div>
      ` : `
        <!-- إرشادات الربط -->
        <div style="font-size:.78rem;color:var(--dim);line-height:1.7;margin-bottom:.8rem">
          ${L(
            '🔗 اربط حسابك بـ Google Drive لحفظ وثائقك وفواتيرك تلقائياً في مجلدات منظمة. الوثائق تُحفظ في Drive الخاص بك فقط — لا يصل إليها SmartStruct.',
            '🔗 Connectez votre compte Google Drive pour sauvegarder automatiquement vos documents dans des dossiers organisés. Les fichiers sont dans votre Drive uniquement.'
          )}
        </div>

        <!-- خطوات الإعداد -->
        <div style="background:rgba(232,184,75,.05);border:1px solid rgba(232,184,75,.15);border-radius:10px;padding:.8rem 1rem;margin-bottom:.8rem;font-size:.75rem">
          <div style="font-weight:700;color:var(--gold);margin-bottom:.5rem">⚙️ ${L('إعداد لمرة واحدة:','Configuration unique:')}</div>
          <ol style="padding-right:1.2rem;color:var(--dim);line-height:1.9;margin:0">
            <li>${L('اذهب إلى','Allez sur')} <a href="https://console.cloud.google.com" target="_blank" style="color:var(--gold)">console.cloud.google.com</a></li>
            <li>${L('أنشئ مشروعاً جديداً → فعّل Google Drive API','Créez un projet → activez Google Drive API')}</li>
            <li>${L('APIs & Services → Credentials → Create OAuth 2.0 Client ID','APIs & Services → Credentials → Create OAuth 2.0 Client ID')}</li>
            <li>${L('أضف نطاق موقعك في Authorized JavaScript origins','Ajoutez votre domaine dans Authorized JavaScript origins')}</li>
            <li>${L('انسخ Client ID وأدخله أدناه','Copiez le Client ID et entrez-le ci-dessous')}</li>
          </ol>
        </div>

        <div class="form-group" style="margin-bottom:.6rem">
          <label class="form-label" style="font-size:.72rem">Google Client ID</label>
          <input class="form-input" id="gdriveClientId" type="text" dir="ltr"
            placeholder="xxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
            value="${escHtml(clientId)}"
            style="font-family:monospace;font-size:.75rem">
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-blue" onclick="(function(){
            const id=document.getElementById('gdriveClientId')?.value?.trim();
            if(id){localStorage.setItem('sbtp_gdrive_client_id',id);}
            GDrive.connect().then(ok=>ok&&App.navigate('settings'));
          })()">
            <svg width="16" height="14" viewBox="0 0 87.3 78" style="margin-left:6px;vertical-align:middle;display:inline">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
            ${L('ربط بـ Google Drive','Connecter Google Drive')}
          </button>
        </div>
      `}
    </div>`;
};

// ════════════════════════════════════════════════════════════════════
//  ميزة "رفع يدوي" — زر في كل وثيقة
// ════════════════════════════════════════════════════════════════════
window.uploadDocToDrive = async function(htmlContent, filename, docType) {
  const category = GDrive._getCategory(docType);
  await GDrive.uploadHTML(htmlContent, filename, category);
};

console.log('☁️ SmartStruct Google Drive Integration محمّلة');

})();
