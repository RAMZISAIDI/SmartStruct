/* ════════════════════════════════════════════════════════════
   ⚠️  المتغيرات الأساسية تأتي الآن من css/design-system.css
   تم حذف :root المحلي لتفادي التعارض.
   التوكنز المتاحة: --gold, --bg, --text, --green, --red,
                    --radius, --shadow, --transition، الخ.
═══════════════════════════════════════════════════════════════ */
:root {
  /* متغيرات خاصة بالتطبيق فقط (غير موجودة في design-system) */
  --sidebar-w: 240px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Tajawal',sans-serif;background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
::-webkit-scrollbar{width:4px;height:6px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:rgba(232,184,75,0.35);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:rgba(232,184,75,0.6)}
.mono{font-family:'JetBrains Mono',monospace}
.app-shell{display:flex;min-height:100vh;overflow-x:hidden;background:var(--bg)}
.main-wrap{margin-right:var(--sidebar-w);flex:1;display:flex;flex-direction:column}
.page-content{flex:1;padding:1.5rem;width:100%;overflow-x:hidden}

/* ===== SIDEBAR ===== */
.sidebar{width:var(--sidebar-w);background:var(--bg2);border-left:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;right:0;height:100vh;z-index:200;transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);overflow:hidden}
.sidebar::before{content:'';position:absolute;top:0;left:0;right:0;height:180px;background:radial-gradient(ellipse at 50% -20%,rgba(232,184,75,0.08),transparent 70%);pointer-events:none}
.sidebar-logo{padding:0.9rem 1rem 0.9rem 1.2rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:0.6rem}
.sidebar-logo-icon{width:36px;height:36px;background:linear-gradient(135deg,#E8B84B,#C49030);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0}
/* SmartStruct SVG Logo */
.ss-logo-svg{display:inline-flex;align-items:center;justify-content:center}
.sidebar-logo-text{font-size:1rem;font-weight:900;color:var(--gold)}
.sidebar-logo-sub{font-size:0.65rem;color:var(--dim)}
.sidebar-nav{flex:1;overflow-y:auto;padding:0.8rem 0.7rem}
.nav-section-label{font-size:0.62rem;font-weight:800;color:var(--dim);letter-spacing:1px;padding:0.6rem 0.7rem 0.3rem;text-transform:uppercase}
.nav-link{display:flex;align-items:center;gap:0.6rem;padding:0.55rem 0.8rem;border-radius:var(--radius);color:var(--muted);text-decoration:none;font-size:0.84rem;font-weight:600;transition:var(--transition);cursor:pointer;border:none;background:none;width:100%;font-family:'Tajawal',sans-serif}
.nav-link:hover{background:rgba(255,255,255,0.05);color:var(--text)}
.nav-link.active{background:var(--gold-dim);color:var(--gold)}
.nav-link-icon{width:18px;text-align:center;font-size:0.95rem}
.nav-badge{font-size:0.58rem;padding:2px 7px;border-radius:20px;font-weight:800;margin-right:auto}
.sidebar-footer{padding:0.8rem;border-top:1px solid var(--border)}
.tenant-chip{display:flex;align-items:center;gap:0.6rem;padding:0.6rem 0.8rem;background:rgba(255,255,255,0.03);border-radius:var(--radius);margin-bottom:0.5rem}
.tenant-avatar{width:32px;height:32px;border-radius:50%;background:var(--gold-dim);border:1px solid rgba(232,184,75,0.3);display:flex;align-items:center;justify-content:center;font-size:1rem}
.tenant-name{font-size:0.8rem;font-weight:700;color:var(--text)}
.tenant-plan{font-size:0.65rem;color:var(--dim)}
.nav-link.logout{color:var(--red);margin-top:0.3rem}
.nav-link.logout:hover{background:rgba(240,78,106,0.1)}
.sidebar-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:350;display:none;backdrop-filter:blur(4px)}
.sidebar-overlay.show{display:block}


/* ===== TOPBAR ===== */
.topbar{height:58px;background:rgba(6,10,16,0.8);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 1.8rem;position:sticky;top:0;z-index:300;overflow:visible}
.topbar-breadcrumb{font-size:0.82rem;color:var(--muted)}
.topbar-user{display:flex;align-items:center;gap:0.5rem}
.topbar-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#E8B84B,#C49030);display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:900;color:#09120A;cursor:pointer}
.hamburger{display:none;background:none;border:1px solid var(--border2);border-radius:8px;cursor:pointer;color:var(--text);font-size:1.2rem;padding:6px 10px;transition:var(--transition);width:38px;height:38px;align-items:center;justify-content:center}

/* ===== BUTTONS ===== */
.btn{display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 1rem;border-radius:var(--radius);border:none;font-family:'Tajawal',sans-serif;font-size:0.85rem;font-weight:700;cursor:pointer;text-decoration:none;transition:var(--transition);user-select:none}
.btn:active{transform:scale(0.97)}
.btn-gold{background:linear-gradient(135deg,#E8B84B,#C49030);color:#09120A;box-shadow:0 3px 14px rgba(232,184,75,0.3)}
.btn-gold:hover{box-shadow:0 6px 22px rgba(232,184,75,0.45);transform:translateY(-1px)}
.btn-blue{background:rgba(74,144,226,0.12);border:1px solid rgba(74,144,226,0.3);color:#60A5FA}
.btn-blue:hover{background:rgba(74,144,226,0.22);transform:translateY(-1px)}
.btn-red{background:rgba(240,78,106,0.1);border:1px solid rgba(240,78,106,0.3);color:#F79FA9}
.btn-red:hover{background:rgba(240,78,106,0.2);transform:translateY(-1px)}
.btn-green{background:rgba(52,195,143,0.12);border:1px solid rgba(52,195,143,0.3);color:#34C38F}
.btn-green:hover{background:rgba(52,195,143,0.22);transform:translateY(-1px)}
.btn-ghost{background:rgba(255,255,255,0.05);border:1px solid var(--border2);color:var(--muted)}
.btn-ghost:hover{background:rgba(255,255,255,0.1);color:var(--text)}
.btn-sm{padding:0.3rem 0.7rem;font-size:0.78rem;border-radius:8px}
.btn-lg{padding:0.75rem 1.4rem;font-size:1rem}
.btn-outline-gold{background:transparent;border:2px solid var(--gold);color:var(--gold)}
.btn-outline-gold:hover{background:var(--gold);color:#09120A}

/* ===== FORMS ===== */
.form-group{margin-bottom:1rem}
.form-label{display:block;font-size:0.78rem;font-weight:700;color:var(--muted);margin-bottom:0.35rem}
.form-input,.form-select,.form-textarea{width:100%;padding:0.68rem 1rem;background:rgba(255,255,255,0.04);border:1px solid var(--border2);border-radius:var(--radius);color:var(--text);font-family:'Tajawal',sans-serif;font-size:0.88rem;outline:none;transition:border-color 0.2s,box-shadow 0.2s}
.form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(232,184,75,0.12)}
.form-input::placeholder{color:var(--dim)}
.form-select option{background:#1a2535}
.form-textarea{resize:vertical;min-height:70px}
.form-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem}
.form-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem}

/* ===== MODAL ===== */
.modal-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;animation:overlayIn 0.2s ease}
.modal-overlay.show{display:flex}
@keyframes overlayIn{from{opacity:0}to{opacity:1}}
.modal{background:var(--bg3);border:1px solid var(--border2);border-radius:20px;padding:1.8rem;width:90%;max-width:560px;max-height:90vh;overflow-y:auto;animation:modalIn 0.32s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 24px 80px rgba(0,0,0,0.5)}
.modal-lg{max-width:680px}
@keyframes modalIn{from{opacity:0;transform:scale(0.88) translateY(24px)}to{opacity:1;transform:none}}
.modal-title{font-size:1.15rem;font-weight:900;margin-bottom:1.3rem;padding-bottom:0.8rem;border-bottom:1px solid var(--border)}
.modal-footer{display:flex;gap:0.6rem;margin-top:1.3rem;padding-top:1rem;border-top:1px solid var(--border)}

/* ===== TABLE ===== */
.table-wrap{overflow-x:auto;border-radius:var(--radius-lg);border:1px solid var(--border)}
table{width:100%;border-collapse:collapse}
thead th{padding:0.85rem 1rem;font-size:0.73rem;font-weight:800;color:var(--dim);background:rgba(255,255,255,0.02);border-bottom:1px solid var(--border);white-space:nowrap;text-align:right}
tbody td{padding:0.78rem 1rem;font-size:0.84rem;border-bottom:1px solid rgba(255,255,255,0.04);color:var(--text);vertical-align:middle}
tbody tr:last-child td{border-bottom:none}
tbody tr:hover td{background:rgba(255,255,255,0.03)}

/* ===== BADGES ===== */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;white-space:nowrap}
.badge-active{background:rgba(52,195,143,0.12);color:#34C38F;border:1px solid rgba(52,195,143,0.25)}
.badge-completed{background:rgba(74,144,226,0.12);color:#60A5FA;border:1px solid rgba(74,144,226,0.25)}
.badge-delayed{background:rgba(240,78,106,0.12);color:#F79FA9;border:1px solid rgba(240,78,106,0.25)}
.badge-paused{background:rgba(74,91,122,0.2);color:#8892A4;border:1px solid rgba(74,91,122,0.35)}
.badge-revenue{background:rgba(52,195,143,0.12);color:#34C38F;border:1px solid rgba(52,195,143,0.25)}
.badge-expense{background:rgba(240,78,106,0.12);color:#F79FA9;border:1px solid rgba(240,78,106,0.25)}

/* ===== CARDS ===== */
.card{background:rgba(255,255,255,0.025);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.3rem;transition:var(--transition)}
.card:hover{border-color:rgba(255,255,255,0.12);transform:translateY(-2px);box-shadow:var(--shadow)}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0.8rem;margin-bottom:1.5rem}
.stat-card{background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.1rem 1.2rem;transition:var(--transition)}
.stat-card:hover{border-color:rgba(255,255,255,0.14);transform:translateY(-2px)}
.stat-icon{font-size:1.4rem;margin-bottom:0.4rem}
.stat-value{font-size:1.6rem;font-weight:900;font-family:'JetBrains Mono',monospace}
.stat-label{font-size:0.72rem;color:var(--dim);margin-top:3px}
.grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem}

/* ===== PROGRESS ===== */
.progress-bar{height:6px;border-radius:4px;background:rgba(255,255,255,0.07);overflow:hidden}
.progress-fill{height:100%;border-radius:4px;transition:width 1.2s cubic-bezier(0.34,1.56,0.64,1)}

/* ===== PAGE HEADER ===== */
.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap}
.page-title{font-size:1.5rem;font-weight:900;margin-bottom:0.2rem}
.page-sub{font-size:0.82rem;color:var(--dim)}
.page-actions{display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap}

/* ===== EMPTY STATE ===== */
.empty{text-align:center;padding:4rem 1rem}
.empty-icon{font-size:3.5rem;margin-bottom:1rem;opacity:0.4}
.empty-title{font-size:1.1rem;font-weight:800;color:var(--muted);margin-bottom:0.5rem}
.empty-text{font-size:0.85rem;color:var(--dim);line-height:1.7}

/* ===== TOAST ===== */
.toast-container{position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem}
.toast{display:flex;align-items:center;gap:0.6rem;padding:0.75rem 1.1rem;border-radius:var(--radius);font-size:0.87rem;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,0.4);animation:toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1);max-width:340px;backdrop-filter:blur(12px)}
@keyframes toastIn{from{opacity:0;transform:translateX(30px) scale(0.9)}to{opacity:1;transform:none}}
.toast-success{background:rgba(52,195,143,0.15);border:1px solid rgba(52,195,143,0.4);color:#6eddb5}
.toast-error{background:rgba(240,78,106,0.15);border:1px solid rgba(240,78,106,0.4);color:#f79fa9}
.toast-info{background:rgba(74,144,226,0.15);border:1px solid rgba(74,144,226,0.4);color:#60A5FA}

/* ===== ALERTS ===== */
.alert{padding:0.78rem 1rem;border-radius:var(--radius);font-size:0.87rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem}
.alert-success{background:rgba(52,195,143,0.1);border:1px solid rgba(52,195,143,0.3);color:#6eddb5}
.alert-error{background:rgba(240,78,106,0.1);border:1px solid rgba(240,78,106,0.3);color:#f79fa9}

/* ===== ANIMATIONS ===== */
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:none}}
@keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes floatUp{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
.animate-fade{animation:fadeIn 0.5s ease both}
.animate-up{animation:slideUp 0.4s ease both}

/* ===== COLOR OPTIONS ===== */
.color-options{display:flex;flex-wrap:wrap;gap:0.5rem}
.color-option{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all 0.2s}
.color-option:hover{transform:scale(1.2)}
.color-option.selected{border-color:#fff;transform:scale(1.25);box-shadow:0 0 0 3px rgba(255,255,255,0.2)}

/* ===== LANGUAGE TOGGLE BUTTON (global) ===== */
.lang-toggle-btn{display:inline-flex;align-items:center;gap:5px;background:rgba(232,184,75,.08);border:1px solid rgba(232,184,75,.25);border-radius:20px;padding:.3rem .9rem;font-size:.78rem;font-weight:800;color:var(--gold);cursor:pointer;font-family:'Tajawal',sans-serif;transition:all .2s;letter-spacing:.3px}
.lang-toggle-btn:hover{background:rgba(232,184,75,.15);border-color:rgba(232,184,75,.5);transform:translateY(-1px)}

/* ===== LANDING PAGE — v7.2 PRO 3D ===== */

.landing-page{min-height:100vh;background:linear-gradient(180deg,#060A10 0%,#080E18 50%,#060A10 100%);overflow-x:hidden;font-family:'Tajawal',sans-serif;position:relative}

/* Atmosphere */
.ll-atmosphere{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(232,184,75,0.10),transparent 60%),radial-gradient(ellipse 60% 80% at 80% 50%,rgba(155,109,255,0.06),transparent 60%),radial-gradient(ellipse 70% 60% at 20% 80%,rgba(74,144,226,0.05),transparent 60%)}
.ll-atmosphere::before{content:'';position:absolute;left:50%;bottom:0;width:200%;height:60vh;transform:translateX(-50%) perspective(900px) rotateX(60deg);transform-origin:bottom center;background-image:linear-gradient(rgba(232,184,75,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(232,184,75,0.18) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse 60% 60% at 50% 100%,#000 30%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse 60% 60% at 50% 100%,#000 30%,transparent 75%);opacity:0.35;animation:llGridScroll 20s linear infinite}
@keyframes llGridScroll{from{background-position:0 0,0 0}to{background-position:0 60px,60px 0}}
.ll-atmosphere::after{content:'';position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");opacity:0.5}

.ll-particles{position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden}
.ll-particle{position:absolute;border-radius:50%;background:var(--gold);box-shadow:0 0 10px var(--gold),0 0 20px rgba(232,184,75,0.35);opacity:0;animation:llFloatUp linear infinite}
@keyframes llFloatUp{0%{transform:translateY(0) translateX(0);opacity:0}10%{opacity:0.8}90%{opacity:0.8}100%{transform:translateY(-100vh) translateX(40px);opacity:0}}

/* Navbar */
.ll-nav{position:fixed;top:0;left:0;right:0;z-index:500;padding:1rem 2.5rem;display:flex;align-items:center;justify-content:space-between;backdrop-filter:blur(0);border-bottom:1px solid transparent;transition:all 0.4s cubic-bezier(0.4,0,0.2,1)}
.ll-nav.ll-scrolled{padding:0.65rem 2.5rem;background:rgba(6,10,16,0.85);backdrop-filter:blur(24px) saturate(180%);border-bottom:1px solid var(--border)}
.ll-nav-logo{display:flex;align-items:center;gap:0.7rem;cursor:pointer;text-decoration:none}
.ll-nav-logo-mark{width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,#F5D07A 0%,#E8B84B 50%,#C49030 100%);display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 4px 16px rgba(232,184,75,0.4),inset 0 1px 1px rgba(255,255,255,0.4),inset 0 -2px 4px rgba(0,0,0,0.2)}
.ll-nav-logo-text{display:flex;flex-direction:column;line-height:1}
.ll-nav-logo-name{font-weight:900;font-size:1.15rem;color:var(--gold);letter-spacing:0.5px}
.ll-nav-logo-sub{font-size:0.62rem;color:var(--dim);font-weight:600;margin-top:3px;letter-spacing:1.5px;text-transform:uppercase}

.ll-nav-links{display:flex;align-items:center;gap:0.4rem}
.ll-nav-link{padding:0.5rem 0.95rem;border-radius:9px;color:var(--muted);font-size:0.86rem;font-weight:600;text-decoration:none;transition:all 0.25s;cursor:pointer;background:none;border:none;font-family:inherit}
.ll-nav-link:hover{color:var(--gold);background:rgba(232,184,75,0.06)}

.ll-nav-cta{display:flex;align-items:center;gap:0.6rem}
.ll-lang-btn{display:inline-flex;align-items:center;gap:5px;background:rgba(232,184,75,0.08);border:1px solid rgba(232,184,75,0.25);border-radius:20px;padding:0.3rem 0.9rem;font-size:0.78rem;font-weight:800;color:var(--gold);cursor:pointer;font-family:'Tajawal',sans-serif;transition:all 0.2s}
.ll-lang-btn:hover{background:rgba(232,184,75,0.15);border-color:rgba(232,184,75,0.5);transform:translateY(-1px)}

/* Buttons */
.ll-btn{display:inline-flex;align-items:center;gap:0.5rem;padding:0.75rem 1.4rem;border-radius:12px;border:none;font-family:inherit;font-size:0.9rem;font-weight:700;cursor:pointer;text-decoration:none;transition:all 0.25s;position:relative;overflow:hidden}
.ll-btn-gold{background:linear-gradient(135deg,#F5D07A 0%,#E8B84B 50%,#C49030 100%);color:#09120A;box-shadow:0 4px 18px rgba(232,184,75,0.35),inset 0 1px 1px rgba(255,255,255,0.4)}
.ll-btn-gold::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);transition:left 0.6s}
.ll-btn-gold:hover::before{left:100%}
.ll-btn-gold:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(232,184,75,0.5)}
.ll-btn-ghost{background:rgba(255,255,255,0.04);border:1px solid var(--border2);color:var(--text);backdrop-filter:blur(10px)}
.ll-btn-ghost:hover{background:rgba(255,255,255,0.08);border-color:var(--gold);color:var(--gold)}
.ll-btn-lg{padding:0.95rem 1.8rem;font-size:0.98rem}
.ll-btn-sm{padding:0.45rem 0.95rem;font-size:0.8rem}

/* Hero */
.ll-hero{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8rem 2rem 4rem;text-align:center;z-index:5;overflow:hidden}.ll-hero-bg{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:1}.ll-hero>*:not(.ll-hero-bg){position:relative;z-index:2}
.ll-hero-badge{display:inline-flex;align-items:center;gap:0.5rem;padding:0.45rem 1rem;border-radius:30px;background:rgba(232,184,75,0.06);border:1px solid rgba(232,184,75,0.25);font-size:0.78rem;font-weight:700;color:var(--gold);margin-bottom:1.8rem;backdrop-filter:blur(8px);animation:llFadeInUp 0.8s 0.1s both}
.ll-hero-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:llPulseDot 2s ease-in-out infinite}
@keyframes llPulseDot{0%,100%{box-shadow:0 0 6px var(--green)}50%{box-shadow:0 0 14px var(--green),0 0 22px var(--green)}}

.ll-hero-title{font-size:clamp(2.4rem,6vw,5rem);font-weight:900;line-height:1.1;margin-bottom:1.5rem;max-width:900px;animation:llFadeInUp 0.8s 0.2s both}
.ll-word-gold{background:linear-gradient(135deg,#F5D07A 0%,#E8B84B 40%,#C49030 80%,#8C6618 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 4px 20px rgba(232,184,75,0.3));display:inline-block}
.ll-hero-sub{font-size:clamp(1rem,1.5vw,1.2rem);color:var(--muted);max-width:680px;margin:0 auto 2.5rem;line-height:1.8;font-weight:500;animation:llFadeInUp 0.8s 0.3s both}
.ll-hero-actions{display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;animation:llFadeInUp 0.8s 0.4s both}
.ll-hero-trust{margin-top:3rem;display:flex;gap:2.5rem;justify-content:center;flex-wrap:wrap;animation:llFadeInUp 0.8s 0.5s both}
.ll-trust-item{display:flex;align-items:center;gap:0.5rem;color:var(--dim);font-size:0.85rem;font-weight:600}
.ll-trust-item svg{width:16px;height:16px;color:var(--green)}

/* 3D Scene */
.ll-scene{position:relative;width:100%;max-width:1100px;height:520px;margin:5rem auto 0;perspective:1600px;perspective-origin:50% 40%;animation:llFadeIn 1s 0.6s both}
.ll-scene-stage{position:relative;width:100%;height:100%;transform-style:preserve-3d;animation:llSceneFloat 8s ease-in-out infinite}
@keyframes llSceneFloat{0%,100%{transform:rotateX(8deg) rotateY(0deg) translateY(0)}50%{transform:rotateX(8deg) rotateY(-4deg) translateY(-12px)}}
.ll-scene-platform{position:absolute;left:50%;bottom:-40px;width:70%;height:80px;transform:translateX(-50%) rotateX(85deg);background:radial-gradient(ellipse,rgba(232,184,75,0.4),transparent 70%);filter:blur(20px);animation:llPlatformPulse 4s ease-in-out infinite}
@keyframes llPlatformPulse{0%,100%{opacity:0.6}50%{opacity:1}}
.ll-scene-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:400px;border-radius:50%;background:radial-gradient(ellipse,rgba(232,184,75,0.12),transparent 65%);filter:blur(40px);pointer-events:none;animation:llGlowPulse 5s ease-in-out infinite}
@keyframes llGlowPulse{0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.9;transform:translate(-50%,-50%) scale(1.1)}}

.ll-float-card{position:absolute;border-radius:20px;background:linear-gradient(145deg,rgba(20,30,46,0.95),rgba(12,18,32,0.95));border:1px solid rgba(232,184,75,0.18);padding:1.2rem;backdrop-filter:blur(20px);box-shadow:0 20px 50px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.05),0 0 0 1px rgba(232,184,75,0.05);transform-style:preserve-3d}

.ll-fc-main{width:540px;height:340px;top:50%;left:50%;transform:translate3d(-50%,-50%,0);padding:1.5rem;background:linear-gradient(145deg,rgba(20,30,46,0.98),rgba(12,18,32,0.98));border:1px solid rgba(232,184,75,0.3);box-shadow:0 30px 80px rgba(0,0,0,0.7),0 0 60px rgba(232,184,75,0.12),inset 0 1px 0 rgba(255,255,255,0.08);animation:llMainFloat 6s ease-in-out infinite}
@keyframes llMainFloat{0%,100%{transform:translate3d(-50%,-50%,0)}50%{transform:translate3d(-50%,-54%,20px)}}

.ll-fc-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;padding-bottom:0.8rem;border-bottom:1px solid var(--border)}
.ll-fc-title{font-size:0.95rem;font-weight:800;color:var(--text);display:flex;align-items:center;gap:0.5rem}
.ll-fc-title-icon{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--gold),var(--gold2));display:flex;align-items:center;justify-content:center;font-size:0.85rem}
.ll-fc-dots{display:flex;gap:5px}
.ll-fc-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.15)}
.ll-fc-dot.ll-active{background:var(--gold);box-shadow:0 0 8px var(--gold)}

.ll-fc-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:0.7rem;margin-bottom:1rem}
.ll-fc-stat-box{padding:0.65rem 0.8rem;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:10px}
.ll-fc-stat-label{font-size:0.62rem;color:var(--dim);font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:4px}
.ll-fc-stat-val{font-family:'JetBrains Mono',monospace;font-size:1.15rem;font-weight:900;color:var(--text)}
.ll-fc-stat-val.ll-gold{color:var(--gold)}
.ll-fc-stat-val.ll-green{color:var(--green)}

.ll-fc-chart{height:120px;position:relative;padding:0.5rem 0}
.ll-fc-chart svg{width:100%;height:100%;overflow:visible}
.ll-chart-line{fill:none;stroke:var(--gold);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 6px rgba(232,184,75,0.35));stroke-dasharray:1000;stroke-dashoffset:1000;animation:llDrawLine 3s ease-out 1s forwards}
@keyframes llDrawLine{to{stroke-dashoffset:0}}
.ll-chart-area{fill:url(#llGoldGrad);opacity:0;animation:llFadeIn 1s 3s forwards}
.ll-chart-grid{stroke:rgba(255,255,255,0.04);stroke-width:1;stroke-dasharray:4 4}

.ll-fc-stat{width:200px;padding:1.1rem}
.ll-fc-projects{top:8%;right:-20px;transform:translate3d(0,0,80px) rotateY(-12deg);animation:llFloatRight 7s ease-in-out infinite}
@keyframes llFloatRight{0%,100%{transform:translate3d(0,0,80px) rotateY(-12deg)}50%{transform:translate3d(0,-15px,90px) rotateY(-10deg)}}
.ll-fc-revenue{bottom:5%;right:30px;transform:translate3d(0,0,60px) rotateY(-8deg);animation:llFloatRight2 6s ease-in-out infinite}
@keyframes llFloatRight2{0%,100%{transform:translate3d(0,0,60px) rotateY(-8deg)}50%{transform:translate3d(0,-10px,70px) rotateY(-6deg)}}
.ll-fc-workers{top:14%;left:-10px;transform:translate3d(0,0,80px) rotateY(12deg);animation:llFloatLeft 8s ease-in-out infinite}
@keyframes llFloatLeft{0%,100%{transform:translate3d(0,0,80px) rotateY(12deg)}50%{transform:translate3d(0,-12px,90px) rotateY(10deg)}}
.ll-fc-ai{bottom:8%;left:10px;transform:translate3d(0,0,70px) rotateY(10deg);animation:llFloatLeft2 7.5s ease-in-out infinite;width:230px}
@keyframes llFloatLeft2{0%,100%{transform:translate3d(0,0,70px) rotateY(10deg)}50%{transform:translate3d(0,-8px,80px) rotateY(8deg)}}

.ll-fc-mini-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;margin-bottom:0.7rem}
.ll-icon-projects{background:rgba(74,144,226,0.15);border:1px solid rgba(74,144,226,0.3);color:#60A5FA}
.ll-icon-revenue{background:rgba(52,195,143,0.15);border:1px solid rgba(52,195,143,0.3);color:var(--green)}
.ll-icon-workers{background:rgba(155,109,255,0.15);border:1px solid rgba(155,109,255,0.3);color:var(--purple)}
.ll-icon-ai{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#09120A}

.ll-fc-mini-label{font-size:0.7rem;color:var(--dim);font-weight:700;margin-bottom:3px}
.ll-fc-mini-val{font-family:'JetBrains Mono',monospace;font-size:1.4rem;font-weight:900;color:var(--text);line-height:1}
.ll-fc-mini-trend{font-size:0.7rem;font-weight:700;margin-top:6px;display:flex;align-items:center;gap:3px}
.ll-trend-up{color:var(--green)}
.ll-trend-down{color:var(--red)}

.ll-ai-typing{display:flex;gap:4px;align-items:center;padding:0.5rem 0.7rem;background:rgba(232,184,75,0.05);border-radius:8px;margin-top:0.5rem}
.ll-typing-dot{width:5px;height:5px;border-radius:50%;background:var(--gold);animation:llTypingDot 1.4s ease-in-out infinite}
.ll-typing-dot:nth-child(2){animation-delay:0.2s}
.ll-typing-dot:nth-child(3){animation-delay:0.4s}
@keyframes llTypingDot{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-4px);opacity:1}}
.ll-ai-text{font-size:0.72rem;color:var(--muted);font-weight:600}

/* Stats bar */
.ll-stats-bar{position:relative;z-index:5;margin:6rem auto 0;max-width:1100px;padding:2.5rem 2rem;display:grid;grid-template-columns:repeat(4,1fr);gap:2rem;background:linear-gradient(135deg,rgba(20,30,46,0.5),rgba(12,18,32,0.5));border-radius:24px;border:1px solid var(--border);backdrop-filter:blur(20px)}
.ll-stat-item{text-align:center;position:relative}
.ll-stat-item:not(:last-child)::after{content:'';position:absolute;left:-1rem;top:20%;bottom:20%;width:1px;background:linear-gradient(180deg,transparent,var(--border2),transparent)}
.ll-stat-number{font-family:'JetBrains Mono',monospace;font-size:2.6rem;font-weight:900;background:linear-gradient(135deg,#F5D07A,#C49030);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;line-height:1}
.ll-stat-label{font-size:0.82rem;color:var(--muted);margin-top:0.5rem;font-weight:600}

/* Sections */
.ll-section{position:relative;z-index:5;padding:7rem 2rem;max-width:1280px;margin:0 auto}
.ll-section-head{text-align:center;margin-bottom:4rem;max-width:700px;margin-left:auto;margin-right:auto}
.ll-eyebrow{display:inline-block;padding:0.35rem 0.95rem;border-radius:30px;background:rgba(232,184,75,0.08);border:1px solid rgba(232,184,75,0.2);font-size:0.72rem;font-weight:800;color:var(--gold);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:1.2rem}
.ll-section-title{font-size:clamp(2rem,4vw,3.2rem);font-weight:900;line-height:1.2;margin-bottom:1rem}
.ll-section-title .ll-gold,.ll-gold{background:linear-gradient(135deg,#F5D07A,#C49030);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.ll-section-desc{font-size:1.05rem;color:var(--muted);line-height:1.8}

/* Features */
.ll-features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem}
.ll-feature-card{position:relative;padding:2rem 1.8rem;background:linear-gradient(145deg,rgba(20,30,46,0.6),rgba(12,18,32,0.6));border:1px solid var(--border);border-radius:20px;backdrop-filter:blur(20px);transition:transform 0.5s cubic-bezier(0.4,0,0.2,1),border-color 0.3s,box-shadow 0.3s;transform-style:preserve-3d;overflow:hidden}
.ll-feature-card::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at var(--mx,50%) var(--my,0%),rgba(232,184,75,0.12),transparent 60%);opacity:0;transition:opacity 0.4s;pointer-events:none}
.ll-feature-card:hover{border-color:rgba(232,184,75,0.35);box-shadow:0 20px 50px rgba(0,0,0,0.4),0 0 40px rgba(232,184,75,0.08)}
.ll-feature-card:hover::before{opacity:1}
.ll-feature-icon{width:54px;height:54px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:1.3rem;font-size:1.5rem;background:linear-gradient(135deg,var(--gold),var(--gold2));color:#09120A;box-shadow:0 6px 20px rgba(232,184,75,0.3);position:relative;transform:translateZ(20px)}
.ll-feature-icon.ll-purple{background:linear-gradient(135deg,var(--purple),#6D45D9);color:#fff;box-shadow:0 6px 20px rgba(155,109,255,0.3)}
.ll-feature-icon.ll-green{background:linear-gradient(135deg,var(--green),#1F8B65);color:#fff;box-shadow:0 6px 20px rgba(52,195,143,0.3)}
.ll-feature-icon.ll-blue{background:linear-gradient(135deg,var(--blue),#2E6BB8);color:#fff;box-shadow:0 6px 20px rgba(74,144,226,0.3)}
.ll-feature-icon.ll-red{background:linear-gradient(135deg,var(--red),#C13954);color:#fff;box-shadow:0 6px 20px rgba(240,78,106,0.3)}
.ll-feature-title{font-size:1.2rem;font-weight:800;margin-bottom:0.6rem;color:var(--text);transform:translateZ(15px)}
.ll-feature-desc{font-size:0.9rem;color:var(--muted);line-height:1.7;transform:translateZ(10px)}
.ll-feature-tag{position:absolute;top:1.2rem;left:1.2rem;font-size:0.62rem;font-weight:800;color:var(--gold);background:rgba(232,184,75,0.1);border:1px solid rgba(232,184,75,0.25);padding:3px 9px;border-radius:20px;letter-spacing:0.5px}

/* Showcase */
.ll-showcase{perspective:1800px;margin-top:2rem}
.ll-showcase-stage{position:relative;width:100%;max-width:900px;margin:0 auto;aspect-ratio:16/10;transform-style:preserve-3d;transform:rotateX(15deg) rotateY(-8deg);transition:transform 0.6s cubic-bezier(0.4,0,0.2,1)}
.ll-showcase-stage:hover{transform:rotateX(8deg) rotateY(-4deg)}
.ll-showcase-screen{position:absolute;inset:0;border-radius:18px;background:linear-gradient(145deg,#0F1828,#0A1018);border:1px solid rgba(232,184,75,0.25);box-shadow:0 40px 100px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.05),0 0 80px rgba(232,184,75,0.1),inset 0 1px 0 rgba(255,255,255,0.06);overflow:hidden;padding:1rem}
.ll-showcase-toolbar{display:flex;align-items:center;gap:0.5rem;padding-bottom:0.7rem;border-bottom:1px solid var(--border);margin-bottom:0.8rem}
.ll-tb-dot{width:11px;height:11px;border-radius:50%}
.ll-tb-dot.ll-r{background:#FF5F57}
.ll-tb-dot.ll-y{background:#FEBC2E}
.ll-tb-dot.ll-g{background:#28C840}
.ll-tb-url{flex:1;padding:5px 12px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:var(--dim);margin-right:0.8rem;text-align:center}
.ll-showcase-body{display:grid;grid-template-columns:170px 1fr;gap:0.8rem;height:calc(100% - 50px)}
.ll-sc-sidebar{background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:10px;padding:0.7rem 0.5rem;display:flex;flex-direction:column;gap:0.25rem}
.ll-sc-nav{display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.6rem;border-radius:7px;font-size:0.72rem;color:var(--muted);font-weight:600}
.ll-sc-nav.ll-active{background:rgba(232,184,75,0.1);color:var(--gold)}
.ll-sc-nav-icon{width:14px;height:14px;opacity:0.8;flex-shrink:0}
.ll-sc-content{display:flex;flex-direction:column;gap:0.7rem}
.ll-sc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem}
.ll-sc-stat-box{padding:0.6rem;background:rgba(255,255,255,0.025);border:1px solid var(--border);border-radius:8px}
.ll-sc-stat-label{font-size:0.6rem;color:var(--dim);margin-bottom:3px}
.ll-sc-stat-val{font-family:'JetBrains Mono',monospace;font-size:0.95rem;font-weight:900;color:var(--gold)}
.ll-sc-graph{flex:1;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:10px;padding:0.6rem;position:relative;overflow:hidden}
.ll-sc-graph svg{width:100%;height:100%}

/* Benefits */
.ll-benefits{display:flex;flex-direction:column;gap:6rem}
.ll-benefit-row{display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center}
.ll-benefit-row.ll-reverse{direction:ltr}
.ll-benefit-row.ll-reverse > *{direction:rtl}
.ll-benefit-content h3{font-size:2rem;font-weight:900;margin-bottom:1rem;line-height:1.3}
.ll-benefit-content p{color:var(--muted);font-size:1.02rem;line-height:1.8;margin-bottom:1.5rem}
.ll-benefit-list{list-style:none;display:flex;flex-direction:column;gap:0.8rem;padding:0;margin:0}
.ll-benefit-list li{display:flex;align-items:flex-start;gap:0.75rem;font-size:0.95rem;color:var(--text);font-weight:500}
.ll-check{flex-shrink:0;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold2));display:flex;align-items:center;justify-content:center;color:#09120A;font-weight:900;font-size:0.7rem;box-shadow:0 4px 12px rgba(232,184,75,0.3);margin-top:2px}

.ll-benefit-visual{position:relative;aspect-ratio:1.1;perspective:1200px}
.ll-benefit-stage{position:relative;width:100%;height:100%;transform-style:preserve-3d;transform:rotateY(-12deg) rotateX(8deg);transition:transform 0.6s}
.ll-benefit-visual:hover .ll-benefit-stage{transform:rotateY(-6deg) rotateX(4deg)}

/* PDF mockup */
.ll-pdf-mockup{position:absolute;inset:0;background:#fff;border-radius:12px;padding:1.5rem;color:#222;box-shadow:0 30px 70px rgba(0,0,0,0.5),0 0 0 1px rgba(232,184,75,0.3);font-family:'Tajawal',sans-serif;direction:rtl}
.ll-pdf-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:1rem;border-bottom:2px solid var(--gold);margin-bottom:1rem}
.ll-pdf-logo{width:50px;height:50px;border-radius:8px;background:linear-gradient(135deg,var(--gold),var(--gold2));display:flex;align-items:center;justify-content:center}
.ll-pdf-co{font-size:0.85rem;font-weight:900;color:#222}
.ll-pdf-co-sub{font-size:0.65rem;color:#888;margin-top:2px}
.ll-pdf-num{font-size:0.7rem;color:#999;text-align:left}
.ll-pdf-num strong{display:block;font-size:1rem;color:#222;margin-top:3px}
.ll-pdf-title{font-size:0.95rem;font-weight:800;color:#222;margin-bottom:0.7rem}
.ll-pdf-line{display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid #eee;font-size:0.72rem}
.ll-pdf-line span:first-child{color:#666}
.ll-pdf-line span:last-child{font-family:'JetBrains Mono',monospace;font-weight:700;color:#222}
.ll-pdf-total{display:flex;justify-content:space-between;padding:0.7rem 0.8rem;background:linear-gradient(135deg,rgba(232,184,75,0.08),transparent);border-radius:6px;margin-top:0.8rem;font-size:0.78rem;font-weight:900}
.ll-pdf-total span:last-child{color:#8C6618;font-family:'JetBrains Mono',monospace}
.ll-pdf-stamp{position:absolute;bottom:1rem;left:1.5rem;width:70px;height:70px;border:2px solid #C44;border-radius:50%;transform:rotate(-15deg);display:flex;align-items:center;justify-content:center;color:#C44;font-size:0.55rem;font-weight:900;text-align:center;line-height:1.2;opacity:0.85}

/* AI mockup */
.ll-ai-mockup{position:absolute;inset:0;background:linear-gradient(145deg,#0F1828,#0A1018);border:1px solid rgba(232,184,75,0.3);border-radius:14px;padding:1.2rem;box-shadow:0 30px 70px rgba(0,0,0,0.5);display:flex;flex-direction:column}
.ll-ai-mock-header{display:flex;align-items:center;gap:0.6rem;padding-bottom:0.8rem;border-bottom:1px solid var(--border)}
.ll-ai-avatar-mock{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold2));display:flex;align-items:center;justify-content:center;font-size:1.1rem}
.ll-ai-mock-name{font-size:0.85rem;font-weight:900;color:var(--text)}
.ll-ai-mock-status{font-size:0.65rem;color:var(--green);display:flex;align-items:center;gap:4px;margin-top:2px}
.ll-ai-mock-status::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green)}
.ll-ai-mock-body{flex:1;display:flex;flex-direction:column;gap:0.7rem;padding:1rem 0;overflow:hidden}
.ll-ai-msg{max-width:85%;padding:0.6rem 0.9rem;border-radius:12px;font-size:0.78rem;line-height:1.5;animation:llMsgIn 0.5s ease both}
.ll-ai-msg.ll-user{align-self:flex-start;background:rgba(232,184,75,0.1);border:1px solid rgba(232,184,75,0.25);color:var(--text);border-radius:12px 12px 0 12px}
.ll-ai-msg.ll-bot{align-self:flex-end;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--muted);border-radius:12px 12px 12px 0}
.ll-ai-msg.ll-user{animation-delay:0.3s}
.ll-ai-msg.ll-bot{animation-delay:1s}
@keyframes llMsgIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

/* Mobile mockup */
.ll-mobile-mockup{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:240px;height:480px;background:#000;border-radius:32px;padding:8px;border:2px solid #222;box-shadow:0 30px 70px rgba(0,0,0,0.6),0 0 0 1px rgba(232,184,75,0.2)}
.ll-mobile-screen{width:100%;height:100%;border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#0F1828,#060A10);position:relative;padding:1.5rem 1rem 1rem}
.ll-mobile-notch{position:absolute;top:0;left:50%;transform:translateX(-50%);width:80px;height:18px;background:#000;border-radius:0 0 12px 12px}
.ll-mobile-time{font-size:0.7rem;font-weight:800;color:var(--text);text-align:center;margin-bottom:1rem;padding-top:0.3rem}
.ll-mobile-greeting{font-size:0.75rem;color:var(--dim);text-align:center;margin-bottom:0.3rem}
.ll-mobile-name{font-size:1.05rem;font-weight:900;color:var(--gold);text-align:center;margin-bottom:1.3rem}
.ll-mobile-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.6rem}
.ll-mobile-btn{aspect-ratio:1;border-radius:14px;padding:0.6rem;background:rgba(232,184,75,0.08);border:1px solid rgba(232,184,75,0.2);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.4rem}
.ll-mobile-btn-icon{font-size:1.4rem}
.ll-mobile-btn-label{font-size:0.62rem;font-weight:800;color:var(--text);text-align:center;line-height:1.2}
.ll-mobile-btn.ll-gold{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#09120A;border-color:transparent}
.ll-mobile-btn.ll-gold .ll-mobile-btn-label{color:#09120A}
.ll-gps-pulse{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:100%;height:100%;pointer-events:none;z-index:-1}
.ll-gps-pulse::before,.ll-gps-pulse::after{content:'';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:280px;height:280px;border-radius:50%;border:2px solid var(--gold);opacity:0;animation:llGpsRing 3s ease-out infinite}
.ll-gps-pulse::after{animation-delay:1.5s}
@keyframes llGpsRing{0%{width:200px;height:200px;opacity:0.7}100%{width:480px;height:480px;opacity:0}}

/* Pricing */
.ll-pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;max-width:1100px;margin:0 auto}
.ll-price-card{position:relative;padding:2.2rem 1.8rem;background:linear-gradient(145deg,rgba(20,30,46,0.6),rgba(12,18,32,0.6));border:1px solid var(--border);border-radius:22px;backdrop-filter:blur(20px);transition:transform 0.4s,border-color 0.3s,box-shadow 0.3s;display:flex;flex-direction:column}
.ll-price-card:hover{transform:translateY(-6px);border-color:rgba(232,184,75,0.25)}
.ll-price-card.ll-featured{border:1px solid rgba(232,184,75,0.4);background:linear-gradient(145deg,rgba(232,184,75,0.05),rgba(12,18,32,0.6));box-shadow:0 20px 60px rgba(0,0,0,0.4),0 0 60px rgba(232,184,75,0.08);transform:scale(1.04)}
.ll-price-card.ll-featured:hover{transform:translateY(-6px) scale(1.04)}
.ll-price-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);padding:5px 14px;background:linear-gradient(135deg,var(--gold),var(--gold2));color:#09120A;font-size:0.7rem;font-weight:900;border-radius:20px;box-shadow:0 4px 14px rgba(232,184,75,0.4);letter-spacing:0.5px;white-space:nowrap}
.ll-price-name{font-size:1.3rem;font-weight:900;margin-bottom:0.4rem}
.ll-price-tagline{font-size:0.85rem;color:var(--dim);margin-bottom:1.5rem}
.ll-price-amount{display:flex;align-items:baseline;gap:0.4rem;margin-bottom:1.8rem;flex-wrap:wrap}
.ll-price-num{font-family:'JetBrains Mono',monospace;font-size:2.8rem;font-weight:900;line-height:1}
.ll-price-currency{font-size:0.95rem;color:var(--muted);font-weight:700}
.ll-price-period{font-size:0.8rem;color:var(--dim)}
.ll-price-features{list-style:none;display:flex;flex-direction:column;gap:0.7rem;margin-bottom:1.8rem;flex:1;padding:0}
.ll-price-features li{display:flex;align-items:flex-start;gap:0.55rem;font-size:0.86rem;color:var(--text)}
.ll-price-check{flex-shrink:0;width:18px;height:18px;border-radius:50%;background:rgba(52,195,143,0.15);border:1px solid rgba(52,195,143,0.3);display:flex;align-items:center;justify-content:center;color:var(--green);font-size:0.7rem;margin-top:2px}

/* CTA */
.ll-cta{position:relative;z-index:5;margin:6rem auto;max-width:1100px;padding:5rem 3rem;background:linear-gradient(135deg,rgba(232,184,75,0.08),rgba(20,30,46,0.6));border:1px solid rgba(232,184,75,0.25);border-radius:28px;text-align:center;overflow:hidden}
.ll-cta::before{content:'';position:absolute;top:-50%;left:-10%;width:120%;height:200%;background:radial-gradient(ellipse at center,rgba(232,184,75,0.15),transparent 50%);filter:blur(40px);pointer-events:none}
.ll-cta-content{position:relative;z-index:2}
.ll-cta-title{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:900;margin-bottom:1rem}
.ll-cta-desc{color:var(--muted);font-size:1.05rem;margin-bottom:2rem;max-width:600px;margin-left:auto;margin-right:auto}

/* Footer */
.ll-footer{position:relative;z-index:5;padding:4rem 2rem 2rem;max-width:1280px;margin:0 auto;border-top:1px solid var(--border)}
.ll-footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:3rem;margin-bottom:3rem}
.ll-footer-brand{display:flex;align-items:center;gap:0.7rem;margin-bottom:1rem}
.ll-footer-desc{font-size:0.88rem;color:var(--muted);line-height:1.7;max-width:340px}
.ll-footer-col h4{font-size:0.95rem;font-weight:800;margin-bottom:1rem;color:var(--gold)}
.ll-footer-col ul{list-style:none;display:flex;flex-direction:column;gap:0.6rem;padding:0;margin:0}
.ll-footer-col a{color:var(--muted);text-decoration:none;font-size:0.85rem;font-weight:500;transition:color 0.2s}
.ll-footer-col a:hover{color:var(--gold)}
.ll-footer-bottom{padding-top:2rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;font-size:0.82rem;color:var(--dim)}

/* Reveal */
.ll-reveal{opacity:0;transform:translateY(30px);transition:opacity 0.8s,transform 0.8s}
.ll-reveal.ll-in{opacity:1;transform:none}

@keyframes llFadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}
@keyframes llFadeIn{from{opacity:0}to{opacity:1}}

/* Responsive */
@media (max-width:1024px){
  .ll-nav{padding:0.85rem 1.5rem}
  .ll-nav.ll-scrolled{padding:0.6rem 1.5rem}
  .ll-nav-links{display:none}
  .ll-scene{height:420px}
  .ll-fc-main{width:90%;max-width:480px;height:300px}
  .ll-fc-projects,.ll-fc-revenue,.ll-fc-workers,.ll-fc-ai{display:none}
  .ll-stats-bar{grid-template-columns:repeat(2,1fr);gap:1.5rem 2rem}
  .ll-stat-item:nth-child(2n)::after{display:none}
  .ll-benefit-row{grid-template-columns:1fr;gap:3rem}
  .ll-footer-grid{grid-template-columns:1fr 1fr;gap:2rem}
  .ll-price-card.ll-featured{transform:none}
  .ll-price-card.ll-featured:hover{transform:translateY(-6px)}
}
@media (max-width:640px){
  .ll-hero{padding:7rem 1.2rem 3rem}
  .ll-scene{height:340px;margin-top:3rem}
  .ll-fc-main{padding:1rem}
  .ll-fc-stats{grid-template-columns:1fr 1fr}
  .ll-fc-chart{display:none}
  .ll-stats-bar{grid-template-columns:1fr;gap:1.5rem;padding:2rem 1.5rem}
  .ll-stat-item::after{display:none}
  .ll-section{padding:5rem 1.2rem}
  .ll-footer-grid{grid-template-columns:1fr}
  .ll-cta{padding:3.5rem 1.5rem;margin:4rem 1rem}
  .ll-nav-cta .ll-btn-ghost{display:none}
}


/* ═══════════════════════════════════════════════
   AUTH PAGE — v7.2 PRO 3D (Login + Register)
═══════════════════════════════════════════════ */

.auth-page{
  min-height:100vh; width:100%;
  background:linear-gradient(180deg,#060A10 0%,#080E18 50%,#060A10 100%);
  color:var(--text); font-family:'Tajawal',sans-serif;
  position:relative; overflow-x:hidden;
}

/* Atmosphere */
.auth-atmosphere{
  position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden;
  background:
    radial-gradient(ellipse 60% 60% at 20% 30%,rgba(232,184,75,0.10),transparent 60%),
    radial-gradient(ellipse 50% 70% at 80% 70%,rgba(155,109,255,0.05),transparent 60%),
    radial-gradient(ellipse 80% 50% at 50% 100%,rgba(232,184,75,0.08),transparent 70%);
}
.auth-atmosphere::before{
  content:''; position:absolute; left:50%; bottom:0;
  width:200%; height:50vh; transform:translateX(-50%) perspective(900px) rotateX(60deg);
  transform-origin:bottom center;
  background-image:
    linear-gradient(rgba(232,184,75,0.15) 1px,transparent 1px),
    linear-gradient(90deg,rgba(232,184,75,0.15) 1px,transparent 1px);
  background-size:50px 50px;
  mask-image:radial-gradient(ellipse 60% 60% at 50% 100%,#000 30%,transparent 75%);
  -webkit-mask-image:radial-gradient(ellipse 60% 60% at 50% 100%,#000 30%,transparent 75%);
  opacity:0.3;
  animation:authGridScroll 20s linear infinite;
}
@keyframes authGridScroll{from{background-position:0 0,0 0}to{background-position:0 50px,50px 0}}

.auth-particles{position:fixed; inset:0; z-index:1; pointer-events:none; overflow:hidden}
.auth-particle{
  position:absolute; border-radius:50%; background:var(--gold);
  box-shadow:0 0 8px var(--gold),0 0 16px rgba(232,184,75,0.3);
  opacity:0; animation:authFloatUp linear infinite;
}
@keyframes authFloatUp{
  0%{transform:translateY(0);opacity:0}
  10%{opacity:0.6}
  90%{opacity:0.6}
  100%{transform:translateY(-100vh) translateX(30px);opacity:0}
}

/* Top controls */
.auth-back-btn{
  position:fixed; top:1.4rem; right:1.5rem; z-index:50;
  display:inline-flex; align-items:center; gap:0.5rem;
  padding:0.55rem 1rem; border-radius:30px;
  background:rgba(255,255,255,0.04);
  border:1px solid var(--border2);
  color:var(--muted);
  font-family:inherit; font-size:0.82rem; font-weight:700;
  cursor:pointer; backdrop-filter:blur(12px);
  transition:all 0.25s; text-decoration:none;
}
.auth-back-btn:hover{
  background:rgba(232,184,75,0.08);
  border-color:rgba(232,184,75,0.3);
  color:var(--gold);
  transform:translateX(3px);
}
[dir="ltr"] .auth-back-btn{right:auto; left:1.5rem}
[dir="ltr"] .auth-back-btn:hover{transform:translateX(-3px)}

.auth-lang-btn{
  position:fixed; top:1.4rem; left:1.5rem; z-index:50;
  display:inline-flex; align-items:center; gap:5px;
  background:rgba(232,184,75,0.08);
  border:1px solid rgba(232,184,75,0.25);
  border-radius:30px;
  padding:0.45rem 1rem;
  font-size:0.78rem; font-weight:800; color:var(--gold);
  cursor:pointer; font-family:inherit;
  transition:all 0.2s;
  backdrop-filter:blur(12px);
}
.auth-lang-btn:hover{
  background:rgba(232,184,75,0.18);
  border-color:rgba(232,184,75,0.5);
  transform:translateY(-1px);
}
[dir="ltr"] .auth-lang-btn{left:auto; right:1.5rem}

/* Main shell */
.auth-shell{
  position:relative; z-index:5;
  min-height:100vh;
  display:grid; grid-template-columns:1.05fr 1fr;
  gap:0;
  max-width:1400px; margin:0 auto;
  padding:5rem 2rem 2rem;
  align-items:stretch;
}

/* ═══ LEFT BRAND PANEL ═══ */
.auth-brand{
  position:relative;
  padding:3rem 3rem 3rem 0;
  display:flex; align-items:center;
  overflow:hidden;
}
[dir="ltr"] .auth-brand{padding:3rem 0 3rem 3rem}

.auth-brand-glow{
  position:absolute; top:50%; left:50%;
  transform:translate(-50%,-50%);
  width:550px; height:550px; border-radius:50%;
  background:radial-gradient(circle,rgba(232,184,75,0.15),transparent 65%);
  filter:blur(50px);
  pointer-events:none;
  animation:authBrandGlow 6s ease-in-out infinite;
}
@keyframes authBrandGlow{
  0%,100%{opacity:0.6;transform:translate(-50%,-50%) scale(1)}
  50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}
}

.auth-brand-grid{
  position:absolute; inset:0;
  background-image:
    linear-gradient(rgba(232,184,75,0.04) 1px,transparent 1px),
    linear-gradient(90deg,rgba(232,184,75,0.04) 1px,transparent 1px);
  background-size:40px 40px;
  mask-image:radial-gradient(ellipse 70% 60% at 50% 50%,#000,transparent 80%);
  -webkit-mask-image:radial-gradient(ellipse 70% 60% at 50% 50%,#000,transparent 80%);
  pointer-events:none;
}

.auth-brand-content{
  position:relative; z-index:2;
  width:100%; max-width:520px;
}

.auth-brand-logo{
  display:inline-flex; align-items:center; gap:0.7rem;
  margin-bottom:2rem; cursor:pointer; text-decoration:none;
  animation:authFadeUp 0.8s 0.1s both;
}
.auth-brand-logo-mark{
  width:48px; height:48px; border-radius:12px;
  background:linear-gradient(135deg,#F5D07A,#E8B84B 50%,#C49030);
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 6px 20px rgba(232,184,75,0.4),inset 0 1px 1px rgba(255,255,255,0.4);
}
.auth-brand-logo-text{display:flex; flex-direction:column; line-height:1}
.auth-brand-logo-name{font-weight:900; font-size:1.2rem; color:var(--gold); letter-spacing:0.5px}
.auth-brand-logo-sub{font-size:0.65rem; color:var(--dim); font-weight:600; margin-top:3px; letter-spacing:1.5px; text-transform:uppercase}

.auth-trial-pill{
  display:inline-flex; align-items:center; gap:0.5rem;
  padding:0.45rem 1rem; border-radius:30px;
  background:rgba(52,195,143,0.08);
  border:1px solid rgba(52,195,143,0.25);
  font-size:0.78rem; font-weight:700; color:var(--green);
  margin-bottom:1.8rem;
  backdrop-filter:blur(8px);
  animation:authFadeUp 0.8s 0.2s both;
}
.auth-trial-dot{
  width:6px; height:6px; border-radius:50%; background:var(--green);
  box-shadow:0 0 8px var(--green);
  animation:authPulseDot 2s ease-in-out infinite;
}
@keyframes authPulseDot{
  0%,100%{box-shadow:0 0 6px var(--green)}
  50%{box-shadow:0 0 14px var(--green),0 0 22px var(--green)}
}

.auth-brand-title{
  font-size:clamp(1.8rem,3.5vw,2.8rem);
  font-weight:900; line-height:1.15;
  margin-bottom:1rem;
  animation:authFadeUp 0.8s 0.3s both;
}
.auth-brand-title-gold{
  background:linear-gradient(135deg,#F5D07A 0%,#E8B84B 40%,#C49030 80%);
  -webkit-background-clip:text; background-clip:text;
  -webkit-text-fill-color:transparent;
  filter:drop-shadow(0 4px 20px rgba(232,184,75,0.3));
  display:inline-block;
}

.auth-brand-desc{
  color:var(--muted); font-size:0.98rem; line-height:1.75;
  margin-bottom:2rem;
  animation:authFadeUp 0.8s 0.4s both;
}

/* Mini 3D scene */
.auth-mini-scene{
  position:relative;
  margin-bottom:2rem;
  height:130px;
  perspective:1000px;
  animation:authFadeUp 0.8s 0.5s both;
}
.auth-mini-card{
  position:absolute;
  display:flex; align-items:center; gap:0.7rem;
  padding:0.8rem 1rem;
  background:linear-gradient(145deg,rgba(20,30,46,0.95),rgba(12,18,32,0.95));
  border:1px solid rgba(232,184,75,0.18);
  border-radius:14px;
  backdrop-filter:blur(20px);
  box-shadow:0 12px 32px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.05);
  min-width:160px;
}
.auth-mc-1{
  top:0; left:0;
  transform:translateZ(20px) rotateY(8deg);
  animation:authMcFloat1 6s ease-in-out infinite;
}
.auth-mc-2{
  top:25px; left:50%; transform:translateX(-50%) translateZ(40px);
  z-index:2;
  border-color:rgba(232,184,75,0.35);
  box-shadow:0 16px 40px rgba(0,0,0,0.6),0 0 30px rgba(232,184,75,0.12);
  animation:authMcFloat2 5s ease-in-out infinite;
}
.auth-mc-3{
  top:50px; right:0;
  transform:translateZ(20px) rotateY(-8deg);
  animation:authMcFloat3 7s ease-in-out infinite;
}
@keyframes authMcFloat1{0%,100%{transform:translateZ(20px) rotateY(8deg) translateY(0)}50%{transform:translateZ(20px) rotateY(8deg) translateY(-6px)}}
@keyframes authMcFloat2{0%,100%{transform:translateX(-50%) translateZ(40px) translateY(0)}50%{transform:translateX(-50%) translateZ(40px) translateY(-8px)}}
@keyframes authMcFloat3{0%,100%{transform:translateZ(20px) rotateY(-8deg) translateY(0)}50%{transform:translateZ(20px) rotateY(-8deg) translateY(-7px)}}

.auth-mc-icon{
  width:32px; height:32px; border-radius:9px;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.auth-mc-text{display:flex; flex-direction:column; line-height:1.2}
.auth-mc-label{font-size:0.66rem; color:var(--dim); font-weight:700; text-transform:uppercase; letter-spacing:0.5px}
.auth-mc-val{font-family:'JetBrains Mono',monospace; font-size:1rem; font-weight:900; color:var(--text); margin-top:2px}

.auth-brand-features{
  list-style:none; padding:0; margin:0;
  display:flex; flex-direction:column; gap:0.7rem;
  animation:authFadeUp 0.8s 0.6s both;
}
.auth-brand-features li{
  display:flex; align-items:center; gap:0.7rem;
  font-size:0.88rem; color:var(--text); font-weight:500;
}
.auth-feat-check{
  flex-shrink:0; width:22px; height:22px; border-radius:50%;
  background:linear-gradient(135deg,var(--gold),var(--gold2));
  display:flex; align-items:center; justify-content:center;
  color:#09120A; font-weight:900; font-size:0.7rem;
  box-shadow:0 4px 12px rgba(232,184,75,0.3);
}

/* ═══ RIGHT FORM PANEL ═══ */
.auth-form-panel{
  display:flex; align-items:center; justify-content:center;
  padding:1rem 0;
}
.auth-form-card{
  width:100%; max-width:480px;
  position:relative;
  background:linear-gradient(145deg,rgba(20,30,46,0.85),rgba(12,18,32,0.85));
  border:1px solid rgba(232,184,75,0.2);
  border-radius:24px;
  backdrop-filter:blur(24px);
  box-shadow:
    0 30px 80px rgba(0,0,0,0.6),
    0 0 60px rgba(232,184,75,0.08),
    inset 0 1px 0 rgba(255,255,255,0.06);
  overflow:hidden;
  animation:authCardIn 0.7s cubic-bezier(0.4,0,0.2,1) both;
}
@keyframes authCardIn{
  from{opacity:0; transform:translateY(20px) scale(0.98)}
  to{opacity:1; transform:none}
}
.auth-form-card::before{
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(232,184,75,0.5),transparent);
}
.auth-form-inner{
  padding:2.2rem 2rem;
  transition:opacity 0.25s, transform 0.25s;
}

/* Tabs */
.auth-tabs{
  display:grid; grid-template-columns:1fr 1fr;
  gap:0.4rem;
  padding:0.35rem;
  background:rgba(255,255,255,0.03);
  border:1px solid var(--border);
  border-radius:14px;
  margin-bottom:1.6rem;
}
.auth-tab{
  display:flex; align-items:center; justify-content:center; gap:0.45rem;
  padding:0.6rem 0.7rem;
  background:transparent; border:none;
  border-radius:10px;
  color:var(--muted); font-family:inherit; font-size:0.84rem; font-weight:700;
  cursor:pointer; transition:all 0.25s;
}
.auth-tab:hover{color:var(--text); background:rgba(255,255,255,0.04)}
.auth-tab.active{
  background:linear-gradient(135deg,#F5D07A,#E8B84B 50%,#C49030);
  color:#09120A;
  box-shadow:0 4px 14px rgba(232,184,75,0.3),inset 0 1px 0 rgba(255,255,255,0.4);
}
.auth-tab svg{stroke-width:2.5}

/* Heading */
.auth-heading{margin-bottom:1.4rem; text-align:center}
.auth-h-title{
  font-size:1.45rem; font-weight:900; line-height:1.2;
  color:var(--text); margin-bottom:0.4rem;
}
.auth-h-sub{font-size:0.86rem; color:var(--muted); line-height:1.6}

/* Trial banner inside form */
.auth-trial-banner{
  display:flex; align-items:center; gap:0.7rem;
  padding:0.85rem 1rem;
  background:linear-gradient(135deg,rgba(52,195,143,0.08),rgba(52,195,143,0.02));
  border:1px solid rgba(52,195,143,0.25);
  border-radius:12px;
  margin-bottom:1.3rem;
}
.auth-trial-banner-icon{
  width:38px; height:38px; border-radius:10px;
  background:linear-gradient(135deg,var(--green),#1F8B65);
  display:flex; align-items:center; justify-content:center;
  color:#fff; flex-shrink:0;
  box-shadow:0 4px 12px rgba(52,195,143,0.35);
}
.auth-trial-banner-text{display:flex; flex-direction:column; line-height:1.3}
.auth-trial-banner-text strong{font-size:0.92rem; color:var(--green); font-weight:900}
.auth-trial-banner-text span{font-size:0.76rem; color:var(--muted); margin-top:2px}

/* Alerts */
.auth-alert{
  display:flex; align-items:flex-start; gap:0.6rem;
  padding:0.8rem 1rem;
  border-radius:12px;
  font-size:0.85rem;
  margin-bottom:1rem;
  animation:authAlertIn 0.3s ease;
}
@keyframes authAlertIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.auth-alert svg{flex-shrink:0; margin-top:1px}
.auth-alert-error{
  background:rgba(240,78,106,0.1);
  border:1px solid rgba(240,78,106,0.3);
  color:#F79FA9;
}
.auth-alert-success{
  background:rgba(52,195,143,0.1);
  border:1px solid rgba(52,195,143,0.3);
  color:#6EDDB5;
}

/* Fields */
.auth-field{margin-bottom:1rem}
.auth-grid-2{
  display:grid; grid-template-columns:1fr 1fr; gap:0.85rem;
  margin-bottom:0;
}
.auth-grid-2 .auth-field{margin-bottom:1rem}

.auth-label{
  display:block;
  font-size:0.78rem; font-weight:700;
  color:var(--text); margin-bottom:0.45rem;
}
.auth-required{color:var(--red); margin-right:2px}
[dir="ltr"] .auth-required{margin-right:0; margin-left:2px}

.auth-input-wrap{
  position:relative;
  display:flex; align-items:center;
}
.auth-input-icon{
  position:absolute;
  right:0.85rem;
  color:var(--dim);
  pointer-events:none;
  transition:color 0.2s;
}
[dir="ltr"] .auth-input-icon{right:auto; left:0.85rem}

.auth-input{
  width:100%;
  padding:0.78rem 2.5rem 0.78rem 1rem;
  background:rgba(255,255,255,0.03);
  border:1.5px solid var(--border2);
  border-radius:11px;
  color:var(--text);
  font-family:inherit; font-size:0.9rem;
  outline:none;
  transition:all 0.2s;
}
[dir="ltr"] .auth-input{padding:0.78rem 1rem 0.78rem 2.5rem}

.auth-input:focus{
  border-color:rgba(232,184,75,0.5);
  background:rgba(232,184,75,0.04);
  box-shadow:0 0 0 4px rgba(232,184,75,0.1);
}
.auth-input:focus ~ .auth-input-icon,
.auth-input-wrap:focus-within .auth-input-icon{color:var(--gold)}
.auth-input::placeholder{color:var(--dim); font-weight:500}

.auth-input.auth-select{
  appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238892A4' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat:no-repeat;
  background-position:left 0.85rem center;
  background-size:14px;
  padding-left:2.5rem;
}
[dir="ltr"] .auth-input.auth-select{
  background-position:right 0.85rem center;
  padding-left:1rem; padding-right:2.5rem;
}
.auth-input.auth-select option{background:#0F1828; color:var(--text)}

.auth-input-eye{
  position:absolute;
  left:0.6rem;
  background:none; border:none; cursor:pointer;
  color:var(--dim);
  padding:6px; border-radius:6px;
  transition:all 0.2s;
}
.auth-input-eye:hover{background:rgba(232,184,75,0.08); color:var(--gold)}
[dir="ltr"] .auth-input-eye{left:auto; right:0.6rem}

/* Password strength */
.auth-pass-strength{
  display:flex; gap:4px; margin-top:7px;
}
.auth-pass-bar{
  flex:1; height:3px; border-radius:2px;
  background:rgba(255,255,255,0.06);
  transition:background 0.3s;
}
.auth-pass-bar.weak{background:var(--red)}
.auth-pass-bar.medium{background:#FFA94D}
.auth-pass-bar.strong{background:var(--green)}
.auth-pass-label{font-size:0.7rem; font-weight:700; margin-top:5px; color:var(--muted)}

/* Row between */
.auth-row-between{
  display:flex; justify-content:space-between; align-items:center;
  margin:0.3rem 0 1.2rem;
  flex-wrap:wrap; gap:0.5rem;
}

/* Checkbox */
.auth-checkbox-wrap, .auth-terms-wrap{
  display:flex; align-items:center; gap:0.5rem;
  cursor:pointer; user-select:none;
}
.auth-terms-wrap{
  align-items:flex-start; margin-bottom:1.2rem;
  padding:0.7rem 0.9rem;
  background:rgba(255,255,255,0.02);
  border:1px solid var(--border);
  border-radius:10px;
  transition:all 0.2s;
}
.auth-terms-wrap:hover{background:rgba(232,184,75,0.04); border-color:rgba(232,184,75,0.2)}
.auth-checkbox{
  position:absolute; opacity:0; pointer-events:none;
}
.auth-checkbox-mark{
  flex-shrink:0;
  width:18px; height:18px;
  border:1.5px solid var(--border2);
  border-radius:5px;
  background:rgba(255,255,255,0.03);
  display:flex; align-items:center; justify-content:center;
  transition:all 0.2s;
  position:relative;
}
.auth-terms-wrap .auth-checkbox-mark{margin-top:2px}
.auth-checkbox:checked ~ .auth-checkbox-mark{
  background:linear-gradient(135deg,var(--gold),var(--gold2));
  border-color:var(--gold);
}
.auth-checkbox:checked ~ .auth-checkbox-mark::after{
  content:'';
  width:6px; height:10px;
  border:solid #09120A;
  border-width:0 2.5px 2.5px 0;
  transform:rotate(45deg) translate(-1px,-1px);
}
.auth-checkbox-label{font-size:0.82rem; color:var(--muted); font-weight:600}
.auth-terms-text{font-size:0.78rem; color:var(--muted); line-height:1.6}

/* Links */
.auth-link{
  background:none; border:none; cursor:pointer;
  color:var(--gold); font-family:inherit;
  font-size:0.82rem; font-weight:700;
  padding:0; transition:color 0.2s;
  text-decoration:none;
}
.auth-link:hover{color:var(--gold3); text-decoration:underline}
.auth-link-strong{color:var(--gold); font-weight:800}

/* Submit button */
.auth-submit{
  width:100%;
  display:inline-flex; align-items:center; justify-content:center; gap:0.55rem;
  padding:0.85rem 1.5rem;
  border:none; border-radius:12px;
  font-family:inherit; font-size:0.92rem; font-weight:800;
  cursor:pointer; transition:all 0.25s;
  position:relative; overflow:hidden;
  margin-top:0.4rem;
}
.auth-submit-gold{
  background:linear-gradient(135deg,#F5D07A 0%,#E8B84B 50%,#C49030 100%);
  color:#09120A;
  box-shadow:0 4px 18px rgba(232,184,75,0.35),inset 0 1px 1px rgba(255,255,255,0.4);
}
.auth-submit-gold::before{
  content:''; position:absolute; top:0; left:-100%;
  width:100%; height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);
  transition:left 0.6s;
}
.auth-submit-gold:hover::before{left:100%}
.auth-submit-gold:hover{
  transform:translateY(-2px);
  box-shadow:0 8px 28px rgba(232,184,75,0.5),inset 0 1px 1px rgba(255,255,255,0.4);
}
.auth-submit:active{transform:scale(0.98)}
.auth-submit:disabled{opacity:0.6; cursor:not-allowed; transform:none}

/* Divider */
.auth-divider{
  display:flex; align-items:center; gap:1rem;
  margin:1.4rem 0 1rem;
  color:var(--dim);
}
.auth-divider::before, .auth-divider::after{
  content:''; flex:1; height:1px;
  background:linear-gradient(90deg,transparent,var(--border2),transparent);
}
.auth-divider span{font-size:0.75rem; font-weight:700; letter-spacing:1px; text-transform:uppercase}

/* Demo button */
.auth-demo-btn{
  width:100%;
  display:inline-flex; align-items:center; justify-content:center; gap:0.5rem;
  padding:0.7rem 1rem;
  background:rgba(52,195,143,0.06);
  border:1px dashed rgba(52,195,143,0.35);
  border-radius:11px;
  color:var(--green);
  font-family:inherit; font-size:0.82rem; font-weight:700;
  cursor:pointer; transition:all 0.2s;
}
.auth-demo-btn:hover{
  background:rgba(52,195,143,0.12);
  border-style:solid;
  transform:translateY(-1px);
}

/* Bottom text */
.auth-bottom-text{
  text-align:center; margin-top:1.3rem;
  font-size:0.83rem; color:var(--muted);
}

/* Backward-compat: btn-trial alias for legacy code paths */
.btn-trial{
  display:inline-flex; align-items:center; justify-content:center; gap:0.5rem;
  background:linear-gradient(135deg,#F5D07A 0%,#E8B84B 50%,#C49030 100%);
  color:#09120A;
  border:none; border-radius:12px;
  font-family:'Tajawal',sans-serif; font-weight:800;
  cursor:pointer; transition:all 0.25s;
  padding:0.7rem 1.4rem; font-size:0.9rem;
}
.btn-trial:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(232,184,75,0.4)}

@keyframes authFadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}

/* ═══ RESPONSIVE ═══ */
@media (max-width:1024px){
  .auth-shell{
    grid-template-columns:1fr;
    padding:5rem 1.5rem 2rem;
    gap:2rem;
    max-width:560px;
  }
  .auth-brand{
    padding:1rem 0;
    text-align:center;
  }
  [dir="ltr"] .auth-brand{padding:1rem 0}
  .auth-brand-content{margin:0 auto}
  .auth-brand-logo{margin-left:auto;margin-right:auto}
  .auth-mini-scene{display:none}
  .auth-brand-features{display:none}
  .auth-brand-title{font-size:1.6rem}
  .auth-brand-desc{display:none}
}
@media (max-width:560px){
  .auth-shell{padding:5rem 1rem 1.5rem}
  .auth-form-inner{padding:1.5rem 1.3rem}
  .auth-grid-2{grid-template-columns:1fr; gap:0}
  .auth-grid-2 .auth-field{margin-bottom:1rem}
  .auth-back-btn span{display:none}
  .auth-brand-title{font-size:1.4rem}
  .auth-trial-pill{font-size:0.72rem}
  .auth-tab{font-size:0.78rem; padding:0.55rem 0.4rem}
  .auth-tab svg{display:none}
}


/* ===== SIDEBAR OVERLAY (mobile) ===== */
.sidebar-overlay{
  display:none;
  position:fixed;
  inset:0;
  z-index:199;
  background:rgba(0,0,0,0.65);
  backdrop-filter:blur(3px);
  -webkit-backdrop-filter:blur(3px);
  animation:overlayIn 0.25s ease;
  cursor:pointer;
}
.sidebar-overlay.show{display:block}

/* ===== RESPONSIVE ===== */
@media(max-width:900px){
  .sidebar{
    transform:translateX(110%);
    transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);
    z-index:400;
  }
  .sidebar.open{
    transform:translateX(0) !important;
    box-shadow:-24px 0 80px rgba(0,0,0,0.7);
  }
  .main-wrap{margin-right:0 !important}
  .hamburger{display:flex !important;align-items:center;justify-content:center}
  .page-content{padding:1rem}
  .form-grid-2,.form-grid-3{grid-template-columns:1fr}
  .grid-cards{grid-template-columns:1fr}
  .login-wrap{grid-template-columns:1fr;max-width:480px}
  .login-left{display:none}
  .land-nav-links{display:none}
  .land-nav{padding:.7rem 1rem}
  .land-nav-actions .btn-ghost{display:none}
  .hero-stats{gap:1.2rem}
  .hero-divider{display:none}
  /* Landing sections responsive */
  .steps-grid{grid-template-columns:1fr}
  .features-grid{grid-template-columns:1fr}
  .pricing-grid{grid-template-columns:1fr;max-width:420px;margin-left:auto;margin-right:auto}
  .testimonials-grid{grid-template-columns:1fr}
  .section-center{padding:0 1rem}
  .section-title{font-size:clamp(1.4rem,5vw,2rem)}
}
@media(min-width:901px){
  .sidebar{transform:none !important}
  .sidebar-overlay{display:none !important}
  .hamburger{display:none !important}
  .sidebar-close-btn{display:none !important}
  .main-wrap{margin-right:var(--sidebar-w) !important}
}
@media(max-width:480px){
  .stats-grid{grid-template-columns:1fr 1fr}
  .kanban-col-v5{min-width:160px;width:160px}
  .page-header{flex-direction:column;align-items:flex-start;gap:.5rem}
  .page-actions{width:100%;justify-content:flex-start}
  .topbar{padding:0 .8rem}
  .topbar-breadcrumb{font-size:.72rem}
  .land-nav-actions .lang-toggle-btn{font-size:.7rem;padding:.25rem .65rem}
  .land-nav-actions .btn{font-size:.78rem;padding:.4rem .8rem}
  .trust-strip{flex-wrap:wrap;gap:.5rem;justify-content:center;padding:.8rem 1rem}
  .trust-item{font-size:.72rem}
}

/* ===== NEW v4.2 FEATURES ===== */
/* Search / Filter bar */
.filter-bar{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:1.2rem}
.search-input-wrap{position:relative;flex:1;min-width:180px}
.search-input-wrap input{width:100%;padding:.55rem .9rem .55rem 2.4rem;background:rgba(255,255,255,.04);border:1px solid var(--border2);border-radius:var(--radius);color:var(--text);font-family:'Tajawal',sans-serif;font-size:.85rem;outline:none;transition:border-color .2s}
.search-input-wrap input:focus{border-color:var(--gold)}
.search-icon{position:absolute;left:.75rem;top:50%;transform:translateY(-50%);color:var(--dim);font-size:.9rem;pointer-events:none}

/* Notification bell */
.notif-bell{position:relative;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;transition:var(--transition)}
.notif-bell:hover{background:rgba(255,255,255,.1)}
.notif-dot{position:absolute;top:4px;right:4px;width:8px;height:8px;background:var(--red);border-radius:50%;border:2px solid var(--bg)}
.notif-count{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 5px;background:var(--red);color:#fff;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:.66rem;font-weight:900;border:2px solid var(--bg);line-height:1}

/* Alert budget bar */
.budget-alert{display:flex;align-items:center;gap:.7rem;padding:.75rem 1rem;border-radius:var(--radius);font-size:.83rem;font-weight:700;margin-bottom:1rem}
.budget-alert-warn{background:rgba(232,184,75,.08);border:1px solid rgba(232,184,75,.3);color:var(--gold)}
.budget-alert-danger{background:rgba(240,78,106,.08);border:1px solid rgba(240,78,106,.3);color:#f79fa9}

/* Project detail tabs */
.detail-tabs{display:flex;gap:0;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:var(--radius);padding:.25rem;margin-bottom:1.2rem;overflow-x:auto}
.detail-tab{padding:.45rem .9rem;border-radius:8px;border:none;font-family:'Tajawal',sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;transition:all .2s;color:var(--dim);background:none;white-space:nowrap}
.detail-tab.active{background:var(--bg2);color:var(--text);box-shadow:0 2px 8px rgba(0,0,0,.3)}

/* Materials table */
.material-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:.68rem;font-weight:700}
.material-low{background:rgba(240,78,106,.1);color:#f79fa9;border:1px solid rgba(240,78,106,.25)}
.material-ok{background:rgba(52,195,143,.1);color:#34C38F;border:1px solid rgba(52,195,143,.25)}

/* Print styles */
@media print{
  .sidebar,.topbar,.page-actions,.btn,.modal-overlay,.toast-container{display:none!important}
  .main-wrap{margin-right:0!important}
  .page-content{padding:.5rem!important}
  body{background:#fff!important;color:#000!important}
  .stat-card,.card{border:1px solid #ddd!important;background:#f9f9f9!important;break-inside:avoid}
  .stat-value,.stat-label,.page-title{color:#000!important}
  table{font-size:.75rem}
}

/* Kanban style for project phases */
.kanban-col{background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:var(--radius-lg);padding:.8rem;min-width:200px}
.kanban-header{font-size:.72rem;font-weight:800;color:var(--dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.7rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)}
.kanban-card{background:rgba(255,255,255,.03);border:1px solid var(--border2);border-radius:10px;padding:.75rem;margin-bottom:.5rem;cursor:pointer;transition:var(--transition)}
.kanban-card:hover{border-color:rgba(232,184,75,.3);transform:translateY(-2px)}

/* Monthly attendance summary */
.month-nav{display:flex;align-items:center;gap:.8rem;margin-bottom:1rem}
.month-nav button{width:30px;height:30px;border-radius:50%;border:1px solid var(--border2);background:rgba(255,255,255,.04);color:var(--text);cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;transition:var(--transition)}
.month-nav button:hover{background:rgba(255,255,255,.1)}
.month-label{font-weight:800;font-size:.95rem}

/* Notes section */
.note-card{background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:var(--radius);padding:.85rem 1rem;margin-bottom:.6rem;position:relative}
.note-card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem}
.note-card-author{font-size:.72rem;font-weight:700;color:var(--gold)}
.note-card-date{font-size:.7rem;color:var(--dim)}
.note-card-text{font-size:.84rem;color:var(--muted);line-height:1.5}

/* ===== v5.0 NEW FEATURES ===== */
.badge-role-admin{background:rgba(232,184,75,0.12);color:var(--gold);border:1px solid rgba(232,184,75,0.25)}
.badge-role-manager{background:rgba(74,144,226,0.12);color:#60A5FA;border:1px solid rgba(74,144,226,0.25)}
.badge-role-accountant{background:rgba(52,195,143,0.12);color:#34C38F;border:1px solid rgba(52,195,143,0.25)}
.badge-role-hr{background:rgba(155,109,255,0.12);color:#9B6DFF;border:1px solid rgba(155,109,255,0.25)}
.badge-role-viewer{background:rgba(255,255,255,0.06);color:var(--muted);border:1px solid var(--border2)}
.kanban-board,.kanban-board-v5{display:flex;gap:.8rem;overflow-x:auto;padding-bottom:1rem;align-items:flex-start;-webkit-overflow-scrolling:touch}
.kanban-col-v5{background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:var(--radius-lg);padding:.8rem;min-width:200px;width:200px;flex-shrink:0;transition:background 0.2s;min-height:120px}
.kanban-col-v5.drag-over{background:rgba(232,184,75,0.05);border-color:rgba(232,184,75,0.3)}
.kanban-col-header{font-size:.72rem;font-weight:800;color:var(--dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.7rem;padding-bottom:.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.kanban-count{background:rgba(255,255,255,0.1);border-radius:12px;padding:1px 7px;font-size:.65rem;font-weight:900}
.kanban-task-card{background:rgba(255,255,255,.04);border:1px solid var(--border2);border-radius:10px;padding:.7rem;margin-bottom:.5rem;cursor:grab;transition:var(--transition);user-select:none;direction:rtl;-webkit-user-select:none;touch-action:none}
.kanban-task-card:hover{border-color:rgba(232,184,75,.3);transform:translateY(-2px)}
.kanban-task-card.dragging{opacity:0.4;transform:rotate(2deg)}
.kanban-add-task-btn{width:100%;padding:.4rem;border:1px dashed var(--border2);background:none;border-radius:8px;color:var(--dim);font-family:'Tajawal',sans-serif;font-size:.78rem;cursor:pointer;transition:all 0.2s;margin-top:.5rem}
.kanban-add-task-btn:hover{border-color:var(--gold);color:var(--gold);background:var(--gold-dim)}
.chart-card{background:rgba(255,255,255,0.025);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.3rem}
.chart-title{font-size:.9rem;font-weight:800;margin-bottom:1rem}
.doc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem;margin-top:1rem}
.doc-card{background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius);padding:1rem;text-align:center;cursor:pointer;transition:var(--transition)}
.doc-card:hover{border-color:rgba(232,184,75,0.3);transform:translateY(-2px)}
.upload-zone{border:2px dashed var(--border2);border-radius:var(--radius-lg);padding:2rem;text-align:center;cursor:pointer;transition:all 0.3s}
.upload-zone:hover{border-color:var(--gold);background:var(--gold-dim)}
.stock-alert-bar{display:flex;align-items:center;gap:.7rem;padding:.7rem 1rem;background:rgba(240,78,106,0.08);border:1px solid rgba(240,78,106,0.3);border-radius:var(--radius);margin-bottom:1rem;font-size:.83rem;font-weight:700;color:#f79fa9}
.stock-movement-log{background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;max-height:300px;overflow-y:auto}
.stock-movement-item{display:flex;align-items:center;gap:.8rem;padding:.6rem 1rem;border-bottom:1px solid rgba(255,255,255,0.04);font-size:.8rem}
.movement-in{color:var(--green);font-weight:700}
.movement-out{color:var(--red);font-weight:700}
.salary-card{background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.2rem;transition:var(--transition)}
.salary-card:hover{border-color:rgba(52,195,143,0.3)}
.salary-breakdown{margin-top:.8rem;padding-top:.8rem;border-top:1px solid var(--border)}
.salary-line{display:flex;justify-content:space-between;font-size:.8rem;padding:.25rem 0;color:var(--muted)}
.salary-line.total-line{font-weight:900;color:var(--green);font-size:.9rem;border-top:1px solid var(--border);margin-top:.3rem;padding-top:.5rem}
.user-card-v5{background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.2rem;display:flex;align-items:center;gap:1rem;transition:var(--transition)}
.user-card-v5:hover{border-color:rgba(255,255,255,0.15)}
.role-select-mini{padding:.25rem .5rem;background:rgba(255,255,255,0.04);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-family:'Tajawal',sans-serif;font-size:.75rem;outline:none}
.notif-panel{position:absolute;top:44px;left:0;right:auto;width:min(320px,85vw);background:var(--bg3);border:1px solid var(--border2);border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,0.5);z-index:1500;animation:slideDown 0.2s ease}
.notif-item{padding:0.75rem 1rem;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.2s}
.notif-item:hover{background:rgba(255,255,255,0.03)}
.notif-item:last-child{border-bottom:none}
.notif-item.unread{border-right:3px solid var(--gold)}
.sub-status{display:inline-flex;align-items:center;gap:.3rem;padding:.25rem .7rem;border-radius:12px;font-size:.72rem;font-weight:700}
.sub-active{background:rgba(52,195,143,0.12);color:#34C38F}
.sub-expiring{background:rgba(232,184,75,0.12);color:var(--gold)}
.sub-expired{background:rgba(240,78,106,0.12);color:#F79FA9}
.btn-purple{background:rgba(155,109,255,0.12);border:1px solid rgba(155,109,255,0.3);color:#9B6DFF}
.btn-purple:hover{background:rgba(155,109,255,0.22);transform:translateY(-1px)}
.toast-warn{background:rgba(232,184,75,0.15);border:1px solid rgba(232,184,75,0.4);color:var(--gold)}
.gps-map-placeholder{background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius);height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;position:relative;overflow:hidden;margin-bottom:1rem}
.gps-grid-bg{position:absolute;inset:0;background-image:linear-gradient(rgba(74,144,226,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(74,144,226,0.05) 1px,transparent 1px);background-size:30px 30px}
.gantt-row-v5{display:flex;align-items:center;border-bottom:1px solid rgba(255,255,255,0.04);min-height:44px;transition:background 0.2s}
.gantt-row-v5:hover{background:rgba(255,255,255,0.02)}
.pdf-header-block{display:none;align-items:center;justify-content:space-between;padding:1rem;border-bottom:3px solid #E8B84B;margin-bottom:1rem}
@media print{.pdf-header-block{display:flex!important}}


/* ===== SIDEBAR CLOSE BUTTON (mobile only) ===== */
.sidebar-close-btn{
  display:none;
  background:rgba(255,255,255,0.06);
  border:1px solid var(--border2);
  color:var(--text);
  font-size:1rem;
  cursor:pointer;
  padding:0;
  width:28px;
  height:28px;
  margin-right:auto;
  border-radius:8px;
  transition:var(--transition);
  font-family:Tajawal,sans-serif;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
}
.sidebar-close-btn:hover{background:rgba(255,255,255,0.14);color:var(--red)}
@media(max-width:900px){
  .sidebar-close-btn{display:flex !important}
}

/* ===== KANBAN MOBILE FIXES ===== */
@media(max-width:900px){
  .kanban-board{
    display:flex;
    flex-direction:row;
    overflow-x:scroll;
    gap:.6rem;
    scroll-snap-type:x mandatory;
    -webkit-overflow-scrolling:touch;
    padding:.5rem .5rem 1.5rem;
  }
  .kanban-col-v5{
    min-width:75vw;
    width:75vw;
    flex-shrink:0;
    scroll-snap-align:start;
  }
}
@media(max-width:480px){
  .kanban-col-v5{
    min-width:85vw;
    width:85vw;
  }
}


/* ===== NEW v6.0 FEATURES ===== */
/* Language toggle */
[dir="ltr"] body { font-family: Arial, 'Tajawal', sans-serif; }
[dir="ltr"] .main-wrap { margin-right: 0; margin-left: var(--sidebar-w); }
[dir="ltr"] .sidebar { right: auto; left: 0; border-left: none; border-right: 1px solid var(--border); }
[dir="ltr"] .topbar-breadcrumb { direction: ltr; }
[dir="ltr"] thead th { text-align: left; }
/* Calendar */
.cal-today { background: rgba(232,184,75,.08) !important; border-color: rgba(232,184,75,.4) !important; }
/* Map SVG tooltip */
svg circle:hover { opacity: 1 !important; transform-box: fill-box; transform-origin: center; transform: scale(1.3); transition: all .2s; cursor: pointer; }
/* Compare page winner highlight */
.cmp-winner { background: rgba(52,195,143,.06); }
/* Backup card */
.backup-zone { border: 2px dashed var(--border2); border-radius: var(--radius); padding: 1.5rem; text-align: center; transition: var(--transition); }
.backup-zone:hover { border-color: var(--gold); background: var(--gold-dim); }

/* ===== v9 SMART DASHBOARD ===== */
/* Health Score Ring */
.health-command-bar {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: stretch;
}
.health-score-card {
  background: linear-gradient(145deg, rgba(14,22,36,0.95), rgba(9,15,25,0.95));
  border: 1px solid rgba(232,184,75,0.2);
  border-radius: 18px;
  padding: 1.4rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.health-score-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(232,184,75,0.06), transparent 60%);
  pointer-events: none;
}
.health-ring-wrap {
  position: relative;
  width: 120px;
  height: 120px;
  margin-bottom: 0.8rem;
}
.health-ring-svg {
  width: 120px;
  height: 120px;
  transform: rotate(-90deg);
}
.health-ring-bg { fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 10; }
.health-ring-fill {
  fill: none;
  stroke-width: 10;
  stroke-linecap: round;
  transition: stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1);
}
.health-score-val {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  text-align: center;
}
.health-score-num {
  font-size: 1.7rem;
  font-weight: 900;
  line-height: 1;
  font-family: 'JetBrains Mono', monospace;
}
.health-score-lbl { font-size: 0.58rem; color: var(--dim); font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
.health-title { font-size: 0.82rem; font-weight: 800; color: var(--text); margin-bottom: 0.2rem; }
.health-sub { font-size: 0.7rem; color: var(--dim); text-align: center; }
.health-status-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.65rem;
  font-weight: 800;
  margin-top: 0.5rem;
  letter-spacing: 0.5px;
}
/* Smart Overview Bar */
.smart-kpi-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.6rem;
}
.smart-kpi {
  background: rgba(255,255,255,0.025);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.9rem 0.8rem;
  transition: var(--transition);
  position: relative;
  overflow: hidden;
}
.smart-kpi:hover {
  border-color: rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  transform: translateY(-2px);
}
.smart-kpi::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  border-radius: 14px 14px 0 0;
}
.smart-kpi.kpi-blue::after { background: var(--blue); }
.smart-kpi.kpi-green::after { background: var(--green); }
.smart-kpi.kpi-red::after { background: var(--red); }
.smart-kpi.kpi-gold::after { background: var(--gold); }
.smart-kpi.kpi-purple::after { background: var(--purple); }
.kpi-icon { font-size: 1.3rem; margin-bottom: 0.35rem; }
.kpi-value { font-size: 1.2rem; font-weight: 900; font-family: 'JetBrains Mono', monospace; line-height: 1.1; margin-bottom: 0.15rem; }
.kpi-label { font-size: 0.68rem; color: var(--dim); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

/* Risk Panel */
.risk-panel {
  background: rgba(240,78,106,0.04);
  border: 1px solid rgba(240,78,106,0.2);
  border-radius: 14px;
  padding: 0;
  overflow: hidden;
}
.risk-panel-header {
  background: rgba(240,78,106,0.08);
  padding: 0.7rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(240,78,106,0.15);
}
.risk-panel-title { font-size: 0.82rem; font-weight: 800; color: #F79FA9; }
.risk-count-badge { background: rgba(240,78,106,0.2); color: #F04E6A; padding: 1px 8px; border-radius: 10px; font-size: 0.68rem; font-weight: 900; }
.risk-item {
  padding: 0.7rem 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  border-bottom: 1px solid rgba(240,78,106,0.08);
  transition: background 0.2s;
}
.risk-item:hover { background: rgba(240,78,106,0.05); }
.risk-item:last-child { border-bottom: none; }
.risk-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
.risk-text { font-size: 0.8rem; color: var(--text); line-height: 1.4; }
.risk-meta { font-size: 0.7rem; color: var(--dim); margin-top: 1px; }

/* Profit Forecast */
.forecast-card {
  background: rgba(52,195,143,0.03);
  border: 1px solid rgba(52,195,143,0.18);
  border-radius: 14px;
  padding: 1rem;
}
.forecast-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}
.forecast-title { font-size: 0.85rem; font-weight: 800; }
.forecast-badge {
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(52,195,143,0.12);
  color: var(--green);
  font-weight: 800;
}
.forecast-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}
.forecast-row:last-child { border-bottom: none; }
.forecast-label { font-size: 0.78rem; color: var(--dim); }
.forecast-amount { font-size: 0.9rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; }

/* Worker efficiency widget */
.worker-eff-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 0.7rem;
}
.worker-eff-item {
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
}
.worker-eff-name { font-size: 0.75rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.worker-eff-role { font-size: 0.65rem; color: var(--dim); }
.worker-eff-stat { font-size: 0.8rem; font-weight: 900; margin-top: 0.2rem; }

/* Profitability badge */
.prof-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 800;
}
.prof-high   { background: rgba(52,195,143,0.15); color: #34C38F; }
.prof-medium { background: rgba(232,184,75,0.15);  color: var(--gold); }
.prof-low    { background: rgba(255,112,67,0.15);  color: #FF7043; }
.prof-loss   { background: rgba(240,78,106,0.15);  color: var(--red); }

/* Activity feed */
.activity-feed { display: flex; flex-direction: column; gap: 0.5rem; }
.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background 0.2s;
}
.activity-item:hover { background: rgba(255,255,255,0.03); }
.activity-dot-wrap { display: flex; flex-direction: column; align-items: center; }
.activity-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
.activity-line { width: 1px; background: var(--border); flex: 1; min-height: 16px; margin-top: 3px; }
.activity-text { font-size: 0.78rem; color: var(--text); line-height: 1.4; }
.activity-time { font-size: 0.65rem; color: var(--dim); margin-top: 2px; }

@keyframes scorePulse {
  0%,100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.health-score-card.danger .health-score-num { animation: scorePulse 2s infinite; }

/* Dashboard layout upgrades */
.dash-grid-top {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}
.dash-grid-bottom {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
}
@media (max-width:900px) {
  .health-command-bar { grid-template-columns: 1fr; }
  .smart-kpi-row { grid-template-columns: repeat(3,1fr); }
  .dash-grid-top { grid-template-columns: 1fr; }
  .dash-grid-bottom { grid-template-columns: 1fr; }
}
@media (max-width:600px) {
  .smart-kpi-row { grid-template-columns: repeat(2,1fr); }
}

/* ══ v11 NEW FEATURES CSS ══ */

/* --- AI CEO Summary Banner --- */
.ai-ceo-banner {
  background: linear-gradient(135deg, rgba(155,109,255,0.08), rgba(74,144,226,0.08));
  border: 1px solid rgba(155,109,255,0.25);
  border-radius: 16px;
  padding: 1.1rem 1.4rem;
  margin-bottom: 1.2rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  position: relative;
  overflow: hidden;
  animation: slideDown 0.5s ease both;
}
.ai-ceo-banner::before {
  content: '';
  position: absolute;
  top: -40px; right: -40px;
  width: 140px; height: 140px;
  background: radial-gradient(circle, rgba(155,109,255,0.12), transparent 70%);
  border-radius: 50%;
}
.ai-ceo-icon {
  font-size: 2rem;
  flex-shrink: 0;
  line-height: 1;
}
.ai-ceo-greeting {
  font-size: 0.75rem;
  color: var(--purple);
  font-weight: 800;
  letter-spacing: 0.5px;
  margin-bottom: 0.3rem;
}
.ai-ceo-insights {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.ai-ceo-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid;
}
.ai-ceo-chip.red { background: rgba(240,78,106,0.1); color: #F79FA9; border-color: rgba(240,78,106,0.3); }
.ai-ceo-chip.yellow { background: rgba(232,184,75,0.1); color: var(--gold); border-color: rgba(232,184,75,0.3); }
.ai-ceo-chip.green { background: rgba(52,195,143,0.1); color: #34C38F; border-color: rgba(52,195,143,0.3); }
.ai-ceo-chip.blue { background: rgba(74,144,226,0.1); color: #60A5FA; border-color: rgba(74,144,226,0.3); }
.ai-ceo-actions {
  margin-right: auto;
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  align-items: flex-start;
}

/* --- Health Score Breakdown --- */
.health-breakdown-panel {
  margin-top: 0.8rem;
  display: none;
  flex-direction: column;
  gap: 0.4rem;
  animation: slideDown 0.3s ease both;
}
.health-breakdown-panel.show {
  display: flex;
}
.hb-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.72rem;
}
.hb-label {
  width: 90px;
  color: var(--dim);
  font-weight: 600;
  flex-shrink: 0;
}
.hb-bar {
  flex: 1;
  height: 4px;
  background: rgba(255,255,255,0.07);
  border-radius: 4px;
  overflow: hidden;
}
.hb-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 1s ease;
}
.hb-val {
  width: 35px;
  text-align: left;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
}
.hb-trend {
  font-size: 0.65rem;
  font-weight: 800;
}
.health-trend-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.65rem;
  font-weight: 800;
  margin-top: 0.4rem;
}

/* --- Upcoming Obligations Widget --- */
.obligations-widget {
  background: rgba(255,255,255,0.025);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}
.obligation-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: all 0.2s;
}
.obligation-item:last-child { border-bottom: none; }
.obligation-item:hover { background: rgba(255,255,255,0.02); border-radius: 8px; padding-inline: 0.4rem; }
.obligation-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.obligation-title {
  font-size: 0.82rem;
  font-weight: 700;
  flex: 1;
}
.obligation-amount {
  font-size: 0.78rem;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  color: var(--red);
}
.obligation-days {
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 800;
}
.ob-urgent { background: rgba(240,78,106,0.15); color: #F79FA9; }
.ob-soon   { background: rgba(232,184,75,0.15);  color: var(--gold); }
.ob-ok     { background: rgba(52,195,143,0.1);   color: #34C38F; }

/* --- Profit Simulator Page --- */
.simulator-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}
.simulator-result-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border2);
  border-radius: 20px;
  padding: 1.8rem;
  text-align: center;
  transition: all 0.4s;
}
.sim-result-val {
  font-size: 2.5rem;
  font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
  margin: 0.5rem 0;
}
.sim-rating {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border-radius: 40px;
  font-size: 1rem;
  font-weight: 900;
  margin-top: 0.5rem;
}
.sim-rating.green  { background: rgba(52,195,143,0.15);  color: #34C38F;   border: 2px solid rgba(52,195,143,0.4); }
.sim-rating.yellow { background: rgba(232,184,75,0.12);  color: var(--gold); border: 2px solid rgba(232,184,75,0.4); }
.sim-rating.red    { background: rgba(240,78,106,0.12);  color: #F79FA9;   border: 2px solid rgba(240,78,106,0.4); }
.sim-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
  margin-top: 1rem;
}
.sim-metric {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.8rem;
  text-align: center;
}
.sim-metric-val {
  font-size: 1.3rem;
  font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
}
.sim-metric-lbl {
  font-size: 0.7rem;
  color: var(--dim);
  margin-top: 3px;
}
@media (max-width:768px) {
  .simulator-container { grid-template-columns: 1fr; }
  .sim-metrics { grid-template-columns: 1fr 1fr; }
}

/* --- Bank Report Page --- */
.bank-report-preview {
  background: #fff;
  color: #1a1a1a;
  border-radius: 12px;
  padding: 2rem;
  font-family: 'Tajawal', sans-serif;
  direction: rtl;
  box-shadow: 0 16px 50px rgba(0,0,0,0.4);
  max-width: 800px;
  margin: 0 auto;
}
.bank-report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 3px solid #1a3a5c;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}
.bank-report-logo {
  font-size: 1.4rem;
  font-weight: 900;
  color: #1a3a5c;
}
.bank-report-section {
  margin-bottom: 1.5rem;
}
.bank-report-section-title {
  background: #1a3a5c;
  color: #fff;
  padding: 0.4rem 0.8rem;
  font-weight: 800;
  font-size: 0.9rem;
  border-radius: 6px;
  margin-bottom: 0.8rem;
}
.bank-report-row {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  border-bottom: 1px solid #eee;
  font-size: 0.85rem;
}
.bank-report-stamp {
  border: 3px solid #1a3a5c;
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 800;
  text-align: center;
  color: #1a3a5c;
  transform: rotate(-15deg);
  opacity: 0.7;
}

/* --- Audit Log --- */
.audit-log-item {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.audit-log-item:last-child { border-bottom: none; }
.audit-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--gold-dim);
  border: 1px solid rgba(232,184,75,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--gold);
  flex-shrink: 0;
}
.audit-action {
  font-size: 0.82rem;
  font-weight: 700;
}
.audit-before-after {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.25rem;
  font-size: 0.68rem;
}
.audit-before {
  background: rgba(240,78,106,0.1);
  color: #F79FA9;
  padding: 1px 7px;
  border-radius: 4px;
}
.audit-after {
  background: rgba(52,195,143,0.1);
  color: #34C38F;
  padding: 1px 7px;
  border-radius: 4px;
}
.audit-time {
  font-size: 0.65rem;
  color: var(--dim);
  margin-top: 2px;
}

/* --- Basic/Advanced Toggle --- */
.mode-toggle-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 30px;
  padding: 3px 5px;
}
.mode-btn {
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: none;
  color: var(--muted);
  font-family: 'Tajawal', sans-serif;
  transition: all 0.2s;
}
.mode-btn.active {
  background: var(--gold);
  color: #09120A;
}

/* --- Onboarding Wizard --- */
.onboard-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.onboard-card {
  background: var(--bg3);
  border: 1px solid var(--border2);
  border-radius: 24px;
  padding: 2.5rem;
  width: 90%;
  max-width: 520px;
  animation: modalIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
}
.onboard-step-dots {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-bottom: 1.5rem;
}
.onboard-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--border2);
  transition: all 0.3s;
}
.onboard-dot.active {
  width: 24px;
  border-radius: 4px;
  background: var(--gold);
}
.onboard-dot.done {
  background: var(--green);
}
.onboard-progress {
  height: 3px;
  background: rgba(255,255,255,0.07);
  border-radius: 3px;
  margin-bottom: 2rem;
  overflow: hidden;
}
.onboard-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--green), var(--gold));
  border-radius: 3px;
  transition: width 0.5s cubic-bezier(0.34,1.56,0.64,1);
}
.onboard-close {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1.1rem;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background .2s, color .2s;
}
.onboard-close:hover {
  background: var(--border2);
  color: var(--text);
}

/* --- Upsell Modal --- */
.upsell-modal {
  background: var(--bg3);
  border: 1px solid rgba(232,184,75,0.3);
  border-radius: 20px;
  padding: 2rem;
  text-align: center;
  animation: modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
}
.upsell-icon {
  font-size: 3rem;
  margin-bottom: 0.8rem;
}
.upsell-title {
  font-size: 1.3rem;
  font-weight: 900;
  margin-bottom: 0.5rem;
}
.upsell-desc {
  font-size: 0.88rem;
  color: var(--muted);
  margin-bottom: 1.5rem;
  line-height: 1.7;
}
.plan-compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}
.plan-card-mini {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1rem;
  transition: all 0.2s;
  cursor: pointer;
}
.plan-card-mini.featured {
  border-color: rgba(232,184,75,0.5);
  background: rgba(232,184,75,0.06);
  transform: scale(1.03);
}
.plan-card-mini-name {
  font-weight: 900;
  font-size: 0.88rem;
  margin-bottom: 0.3rem;
}
.plan-card-mini-price {
  font-size: 1.1rem;
  font-weight: 900;
  color: var(--gold);
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 0.3rem;
}
.plan-card-mini-limit {
  font-size: 0.65rem;
  color: var(--dim);
}

/* --- Roles Permission Matrix --- */
.role-matrix-table td, .role-matrix-table th {
  text-align: center;
}
.role-matrix-table tbody td:first-child {
  text-align: right;
  font-weight: 700;
  font-size: 0.8rem;
}
.perm-icon-yes { color: var(--green); font-size: 1rem; }
.perm-icon-no  { color: var(--red);   font-size: 1rem; }
.perm-icon-partial { color: var(--gold); font-size: 1rem; }

/* --- Invoice Legal --- */
.invoice-legal-field {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

/* --- Admin Usage Analytics --- */
.admin-stat-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.2rem;
  text-align: center;
}
.admin-stat-val {
  font-size: 2rem;
  font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
  color: var(--gold);
  margin-bottom: 0.3rem;
}
.admin-stat-lbl {
  font-size: 0.75rem;
  color: var(--dim);
}

/* --- Empty States Enhanced --- */
.empty-state-enhanced {
  text-align: center;
  padding: 4rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-state-illustration {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  margin-bottom: 1.5rem;
  position: relative;
}
.empty-state-illustration::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px dashed rgba(255,255,255,0.1);
  animation: spin 20s linear infinite;
}
.empty-state-title {
  font-size: 1.1rem;
  font-weight: 900;
  margin-bottom: 0.5rem;
}
.empty-state-desc {
  font-size: 0.85rem;
  color: var(--dim);
  margin-bottom: 1.5rem;
  max-width: 300px;
  line-height: 1.7;
}

/* --- Feature Lock Overlay --- */
.feature-lock-overlay {
  position: absolute;
  inset: 0;
  background: rgba(6,10,16,0.85);
  backdrop-filter: blur(4px);
  border-radius: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.6rem;
  z-index: 10;
}
.feature-lock-icon {
  font-size: 2rem;
}
.feature-lock-text {
  font-size: 0.82rem;
  font-weight: 800;
  text-align: center;
  color: var(--gold);
}

/* --- Topbar Mode Toggle integration --- */
.topbar-extras {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

/* --- Multi-branch selector --- */
.branch-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 4px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.branch-selector:hover {
  border-color: rgba(232,184,75,0.4);
  color: var(--gold);
}

/* --- Forecast 3 months --- */
.forecast-3m-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.7rem;
  margin-top: 0.8rem;
}
.forecast-month-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.8rem;
  text-align: center;
}
.forecast-month-label {
  font-size: 0.72rem;
  color: var(--dim);
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.forecast-month-val {
  font-size: 0.95rem;
  font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
}

/* scroll fade-in */
[data-animate] { opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease, transform 0.5s ease; }
[data-animate].in-view { opacity: 1; transform: none; }

/* ═══════════════════════════════════════════
   AI ASSISTANT CHAT — SmartStruct AI
═══════════════════════════════════════════ */
.ai-fab {
  position: fixed;
  bottom: 1.5rem;
  left: 1.5rem;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #9B6DFF, #6B3FD4);
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 32px rgba(155,109,255,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  z-index: 2000;
  transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
  animation: aiPulse 3s ease-in-out infinite;
}
@keyframes aiPulse {
  0%,100% { box-shadow: 0 8px 32px rgba(155,109,255,0.5); }
  50% { box-shadow: 0 8px 48px rgba(155,109,255,0.8), 0 0 0 8px rgba(155,109,255,0.1); }
}
.ai-fab:hover { transform: scale(1.1) rotate(5deg); }
.ai-fab.open { border-radius: 16px; width: auto; padding: 0 1rem; gap: .5rem; font-size: .85rem; font-weight: 800; color: #fff; font-family: 'Tajawal', sans-serif; animation: none; }
.ai-fab-badge {
  position: absolute;
  top: -4px;
  left: -4px;
  background: var(--red);
  color: #fff;
  font-size: .55rem;
  font-weight: 900;
  padding: 2px 5px;
  border-radius: 20px;
  font-family: 'Tajawal', sans-serif;
}

.ai-chat-panel {
  position: fixed;
  bottom: 5rem;
  left: 1.5rem;
  width: 380px;
  max-height: 600px;
  background: var(--bg3);
  border: 1px solid rgba(155,109,255,0.3);
  border-radius: 20px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(155,109,255,0.1);
  display: flex;
  flex-direction: column;
  z-index: 1999;
  animation: chatIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
  overflow: hidden;
}
@keyframes chatIn {
  from { opacity: 0; transform: scale(0.85) translateY(20px); transform-origin: bottom left; }
  to { opacity: 1; transform: none; }
}
.ai-chat-header {
  padding: .9rem 1rem;
  background: linear-gradient(135deg, rgba(155,109,255,0.15), rgba(107,63,212,0.1));
  border-bottom: 1px solid rgba(155,109,255,0.2);
  display: flex;
  align-items: center;
  gap: .7rem;
  flex-shrink: 0;
}
.ai-chat-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #9B6DFF, #6B3FD4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(155,109,255,0.4);
}
.ai-chat-name { font-size: .88rem; font-weight: 900; color: var(--text); }
.ai-chat-status { font-size: .68rem; color: #34C38F; display: flex; align-items: center; gap: .3rem; }
.ai-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #34C38F; animation: blink 1.5s infinite; }
.ai-chat-close { margin-right: auto; background: none; border: none; cursor: pointer; color: var(--dim); font-size: 1.1rem; padding: .2rem .4rem; border-radius: 6px; transition: color .2s; }
.ai-chat-close:hover { color: var(--red); }

.ai-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: .8rem;
  min-height: 0;
}
.ai-msg {
  max-width: 88%;
  padding: .7rem .9rem;
  border-radius: 14px;
  font-size: .84rem;
  line-height: 1.6;
}
.ai-msg.bot {
  background: rgba(155,109,255,0.1);
  border: 1px solid rgba(155,109,255,0.2);
  border-radius: 4px 14px 14px 14px;
  color: var(--text);
  align-self: flex-start;
}
.ai-msg.user {
  background: linear-gradient(135deg, rgba(232,184,75,0.15), rgba(196,144,48,0.1));
  border: 1px solid rgba(232,184,75,0.25);
  border-radius: 14px 14px 4px 14px;
  color: var(--text);
  align-self: flex-end;
}
.ai-msg-time { font-size: .6rem; color: var(--dim); margin-top: .3rem; }
.ai-typing {
  display: flex;
  align-items: center;
  gap: .3rem;
  padding: .7rem .9rem;
  background: rgba(155,109,255,0.08);
  border: 1px solid rgba(155,109,255,0.15);
  border-radius: 4px 14px 14px 14px;
  align-self: flex-start;
}
.ai-typing-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #9B6DFF;
  animation: typingBounce 1.2s ease-in-out infinite;
}
.ai-typing-dot:nth-child(2) { animation-delay: .2s; }
.ai-typing-dot:nth-child(3) { animation-delay: .4s; }
@keyframes typingBounce { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-5px);opacity:1} }

.ai-quick-btns {
  padding: .5rem 1rem;
  display: flex;
  gap: .4rem;
  flex-wrap: wrap;
  border-top: 1px solid rgba(255,255,255,.05);
  flex-shrink: 0;
}
.ai-quick-btn {
  font-size: .7rem;
  font-weight: 700;
  padding: .3rem .6rem;
  border-radius: 20px;
  border: 1px solid rgba(155,109,255,0.3);
  background: rgba(155,109,255,0.08);
  color: #B89AFF;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: all .2s;
  white-space: nowrap;
}
.ai-quick-btn:hover { background: rgba(155,109,255,0.2); border-color: rgba(155,109,255,0.6); }

.ai-chat-input-wrap {
  padding: .7rem 1rem;
  border-top: 1px solid rgba(155,109,255,0.15);
  display: flex;
  gap: .5rem;
  align-items: center;
  flex-shrink: 0;
  background: rgba(0,0,0,0.2);
}
.ai-chat-input {
  flex: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(155,109,255,0.25);
  border-radius: 12px;
  padding: .55rem .85rem;
  color: var(--text);
  font-family: 'Tajawal', sans-serif;
  font-size: .85rem;
  outline: none;
  resize: none;
  transition: border-color .2s;
  max-height: 80px;
  overflow-y: auto;
}
.ai-chat-input:focus { border-color: rgba(155,109,255,0.7); }
.ai-chat-input::placeholder { color: var(--dim); }
.ai-send-btn {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #9B6DFF, #6B3FD4);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .95rem;
  transition: all .2s;
  flex-shrink: 0;
}
.ai-send-btn:hover { transform: scale(1.08); box-shadow: 0 4px 12px rgba(155,109,255,0.5); }
.ai-send-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

/* AI Analysis Page */
.ai-page-header {
  background: linear-gradient(135deg, rgba(155,109,255,0.1), rgba(107,63,212,0.05));
  border: 1px solid rgba(155,109,255,0.2);
  border-radius: 20px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}
.ai-page-icon {
  width: 60px; height: 60px;
  border-radius: 16px;
  background: linear-gradient(135deg, #9B6DFF, #6B3FD4);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.8rem;
  box-shadow: 0 8px 24px rgba(155,109,255,0.4);
  flex-shrink: 0;
}
.ai-analysis-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.ai-analysis-card {
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(155,109,255,0.15);
  border-radius: 16px;
  padding: 1.2rem;
  position: relative;
  overflow: hidden;
  transition: all .3s;
}
.ai-analysis-card:hover { border-color: rgba(155,109,255,0.35); transform: translateY(-2px); }
.ai-analysis-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #9B6DFF, transparent);
}
.ai-analysis-title { font-size: .88rem; font-weight: 800; margin-bottom: .8rem; color: #B89AFF; }
.ai-insight-item {
  display: flex;
  align-items: flex-start;
  gap: .6rem;
  padding: .5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  font-size: .82rem;
  line-height: 1.55;
}
.ai-insight-item:last-child { border-bottom: none; }
.ai-insight-icon { font-size: 1rem; flex-shrink: 0; margin-top: .05rem; }
.ai-insight-text { color: var(--text); }
.ai-insight-meta { font-size: .7rem; color: var(--dim); margin-top: .2rem; }

.ai-project-score {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .4rem .8rem;
  border-radius: 20px;
  font-size: .72rem;
  font-weight: 800;
}
.ai-score-excellent { background: rgba(52,195,143,0.12); border: 1px solid rgba(52,195,143,0.3); color: #34C38F; }
.ai-score-good { background: rgba(74,144,226,0.12); border: 1px solid rgba(74,144,226,0.3); color: #60A5FA; }
.ai-score-warn { background: rgba(232,184,75,0.12); border: 1px solid rgba(232,184,75,0.3); color: var(--gold); }
.ai-score-danger { background: rgba(240,78,106,0.12); border: 1px solid rgba(240,78,106,0.3); color: #F79FA9; }

.ai-loading-bar {
  height: 3px;
  background: linear-gradient(90deg, transparent, #9B6DFF, transparent);
  background-size: 200% 100%;
  animation: loadingBar 1.5s linear infinite;
  border-radius: 3px;
  margin: .5rem 0;
}
@keyframes loadingBar { 0%{background-position:100% 0} 100%{background-position:-100% 0} }

/* ═══ AI PROVIDER SETTINGS ═══ */
.ai-provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
  margin-bottom: 1.2rem;
}
.ai-provider-card {
  border: 2px solid var(--border2);
  border-radius: 16px;
  padding: 1.2rem;
  cursor: pointer;
  transition: all .25s;
  position: relative;
  background: rgba(255,255,255,0.025);
}
.ai-provider-card:hover { border-color: rgba(155,109,255,0.4); transform: translateY(-2px); }
.ai-provider-card.selected {
  border-color: #9B6DFF;
  background: rgba(155,109,255,0.08);
  box-shadow: 0 0 0 3px rgba(155,109,255,0.15);
}
.ai-provider-card.selected::before {
  content: '✓';
  position: absolute;
  top: .6rem;
  left: .6rem;
  width: 20px; height: 20px;
  background: #9B6DFF;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .7rem; font-weight: 900; color: #fff;
  line-height: 20px; text-align: center;
}
.ai-provider-logo {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem;
  margin-bottom: .8rem;
}
.ai-provider-name { font-size: .95rem; font-weight: 900; margin-bottom: .25rem; }
.ai-provider-desc { font-size: .75rem; color: var(--muted); line-height: 1.5; margin-bottom: .6rem; }
.ai-provider-badges { display: flex; flex-wrap: wrap; gap: .3rem; }
.ai-provider-badge {
  font-size: .62rem; font-weight: 800;
  padding: 2px 7px; border-radius: 20px;
}
.badge-free { background: rgba(52,195,143,0.15); color: #34C38F; border: 1px solid rgba(52,195,143,0.3); }
.badge-fast { background: rgba(74,144,226,0.15); color: #60A5FA; border: 1px solid rgba(74,144,226,0.3); }
.badge-smart { background: rgba(155,109,255,0.15); color: #B89AFF; border: 1px solid rgba(155,109,255,0.3); }
.badge-paid { background: rgba(232,184,75,0.12); color: var(--gold); border: 1px solid rgba(232,184,75,0.3); }

.ai-key-section {
  background: rgba(155,109,255,0.05);
  border: 1px solid rgba(155,109,255,0.2);
  border-radius: 14px;
  padding: 1.2rem;
  margin-top: 1rem;
}
.ai-key-input-wrap { position: relative; }
.ai-key-input-wrap input { padding-left: 2.8rem !important; font-family: 'JetBrains Mono', monospace; font-size: .82rem; letter-spacing: .5px; }
.ai-key-eye { position: absolute; left: .7rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--dim); font-size: .95rem; }
.ai-test-result {
  display: none;
  padding: .6rem .9rem;
  border-radius: 10px;
  font-size: .8rem;
  font-weight: 700;
  margin-top: .6rem;
  align-items: center;
  gap: .5rem;
}
.ai-test-result.success { display: flex; background: rgba(52,195,143,0.1); border: 1px solid rgba(52,195,143,0.3); color: #34C38F; }
.ai-test-result.error { display: flex; background: rgba(240,78,106,0.1); border: 1px solid rgba(240,78,106,0.3); color: #F79FA9; }
.ai-test-result.loading { display: flex; background: rgba(155,109,255,0.1); border: 1px solid rgba(155,109,255,0.2); color: #B89AFF; }

.ai-status-indicator {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  padding: .3rem .8rem;
  border-radius: 20px;
  font-size: .72rem;
  font-weight: 800;
}
.ai-status-active { background: rgba(52,195,143,0.1); border: 1px solid rgba(52,195,143,0.3); color: #34C38F; }
.ai-status-inactive { background: rgba(74,91,122,0.2); border: 1px solid rgba(74,91,122,0.3); color: var(--dim); }
.ai-status-error { background: rgba(240,78,106,0.1); border: 1px solid rgba(240,78,106,0.3); color: #F79FA9; }

@media(max-width:900px){
  .ai-chat-panel { left: .5rem; right: .5rem; width: auto; }
  .ai-fab { bottom: 1rem; left: 1rem; }
}

/* ══ Animation Safety Fallback ══
   يضمن ظهور المحتوى حتى لو تأخرت الـ animations
   أو لم تعمل في بعض المتصفحات */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* fallback: ensure animated elements become visible after max animation time */
.hero-content,
.hero-top-badge,
.hero-title,
.hero-sub,
.trial-hero-box,
.hero-actions,
.hero-no-cc,
.hero-stats,
.hero-features-grid,
.hero-feat-pill,
.land-nav {
  animation-fill-mode: both;
}

/* ⚡ Realtime Realtime toast animation */
@keyframes slideInRight{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:none}}
@keyframes rtPulse{0%,100%{opacity:1}50%{opacity:.5}}
.rt-live-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#34C38F;animation:rtPulse 1.5s ease-in-out infinite;margin-left:4px;}

