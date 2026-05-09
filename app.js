/* ═══════════════════════════════════════════════════════════════════════════
   SmartStruct Design System
   colors_and_type.css

   Drop-in foundation: CSS custom properties for color, type, spacing, radius,
   shadow, motion, plus base resets and semantic heading classes.

   Usage:
     <link rel="stylesheet" href="fonts/fonts.css">
     <link rel="stylesheet" href="colors_and_type.css">

   Then style with the variables below or with the .ss-h1 / .ss-stat-num /
   .ss-text-gold / etc. helper classes.
   ═══════════════════════════════════════════════════════════════════════════ */

:root {
  /* ── Brand: gold ───────────────────────────────────────────────────────── */
  --ss-gold:        #E8B84B;        /* core brand */
  --ss-gold-hi:     #F5D07A;        /* highlight (top of gradient) */
  --ss-gold-lo:     #C49030;        /* shadow (bottom of gradient) */
  --ss-gold-deep:   #8C6618;        /* far shadow, used in 4-stop gradient */
  --ss-gold-dim:    rgba(232,184,75,0.10);   /* fills (active nav, badge bg) */
  --ss-gold-tint:   rgba(232,184,75,0.06);   /* lightest hover wash */
  --ss-gold-glow:   rgba(232,184,75,0.35);   /* shadow glow for buttons */
  --ss-gold-soft-glow: rgba(232,184,75,0.12); /* outer card glow */

  --ss-gradient-gold:
    linear-gradient(135deg, #F5D07A 0%, #E8B84B 50%, #C49030 100%);
  --ss-gradient-gold-text:
    linear-gradient(135deg, #F5D07A 0%, #E8B84B 40%, #C49030 80%, #8C6618 100%);

  /* ── Neutral / surface tiers ───────────────────────────────────────────── */
  --ss-bg-0:   #060A10;             /* deepest — body background */
  --ss-bg-1:   #0C1220;             /* sidebars, secondary surfaces */
  --ss-bg-2:   #0F1828;             /* cards, modals */
  --ss-bg-3:   #141E2E;             /* raised cards, hover surfaces */

  --ss-glass:  linear-gradient(145deg, rgba(20,30,46,0.85), rgba(12,18,32,0.85));
  --ss-glass-strong:
               linear-gradient(145deg, rgba(20,30,46,0.98), rgba(12,18,32,0.98));

  /* ── Text tiers ────────────────────────────────────────────────────────── */
  --ss-fg:     #EDF2F7;             /* default body */
  --ss-fg-muted: #8892A4;           /* secondary text */
  --ss-fg-dim: #4A5B7A;             /* labels, eyebrows, disabled */
  --ss-fg-on-gold: #09120A;         /* always pair with gold backgrounds */

  /* ── Borders & hairlines (translucent, never a flat colour) ────────────── */
  --ss-border:    rgba(255,255,255,0.06);
  --ss-border-2:  rgba(255,255,255,0.10);
  --ss-divider-fade:
    linear-gradient(180deg, transparent, rgba(255,255,255,0.10), transparent);
  --ss-edge-gold:
    linear-gradient(90deg, transparent, rgba(232,184,75,0.50), transparent);

  /* ── Accent ramp (used sparingly) ──────────────────────────────────────── */
  --ss-green:   #34C38F;            /* revenue, success, online */
  --ss-blue:    #4A90E2;            /* info, projects */
  --ss-red:     #F04E6A;            /* expense, error, danger */
  --ss-purple:  #9B6DFF;            /* AI, secondary feature */
  --ss-orange:  #FF7043;            /* warnings */

  --ss-green-tint: rgba(52,195,143,0.12);
  --ss-blue-tint:  rgba(74,144,226,0.12);
  --ss-red-tint:   rgba(240,78,106,0.12);
  --ss-purple-tint:rgba(155,109,255,0.15);
  --ss-orange-tint:rgba(255,112,67,0.15);

  /* ── Type ──────────────────────────────────────────────────────────────── */
  --ss-font-sans: 'Tajawal', system-ui, -apple-system, 'Segoe UI', Roboto,
                  'Helvetica Neue', Arial, sans-serif;
  --ss-font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo,
                  Consolas, 'Roboto Mono', monospace;

  /* Heading scale (clamp-based; mobile → desktop) */
  --ss-text-hero:    clamp(2.4rem, 6vw, 5rem);    /* hero h1 */
  --ss-text-display: clamp(2rem, 4vw, 3.2rem);    /* section h2 */
  --ss-text-h2:      1.6rem;                       /* in-app page-title-lg */
  --ss-text-h3:      1.30rem;                      /* card heading */
  --ss-text-h4:      1.05rem;                      /* feature card title */
  --ss-text-h5:      0.95rem;                      /* small heading / nav-section */
  --ss-text-body:    0.92rem;                      /* default body */
  --ss-text-sm:      0.84rem;                      /* button, table */
  --ss-text-xs:      0.78rem;                      /* form label, eyebrow */
  --ss-text-2xs:     0.70rem;                      /* badge, micro-label */
  --ss-text-stat:    1.6rem;                       /* stat-card number */
  --ss-text-stat-lg: 2.6rem;                       /* hero stat number */

  /* Weights — the brand sits at 800-900 for headings */
  --ss-w-regular:  400;
  --ss-w-medium:   500;
  --ss-w-semibold: 600;
  --ss-w-bold:     700;
  --ss-w-heavy:    800;
  --ss-w-black:    900;

  /* Line heights */
  --ss-lh-tight:   1.1;     /* hero, big numbers */
  --ss-lh-snug:    1.2;     /* section titles */
  --ss-lh-normal:  1.5;     /* button, label */
  --ss-lh-relaxed: 1.6;     /* default body, Arabic-friendly */
  --ss-lh-loose:   1.8;     /* long-form prose */

  /* Letter spacing */
  --ss-track-eyebrow: 1.5px;   /* uppercase eyebrows */
  --ss-track-label:   0.5px;   /* small caps labels */
  --ss-track-tight:   -0.01em; /* big display numbers */

  /* ── Spacing scale (rem-based, 4-px grid) ──────────────────────────────── */
  --ss-space-1:  0.25rem;   /* 4 */
  --ss-space-2:  0.5rem;    /* 8 */
  --ss-space-3:  0.75rem;   /* 12 */
  --ss-space-4:  1rem;      /* 16 */
  --ss-space-5:  1.25rem;   /* 20 */
  --ss-space-6:  1.5rem;    /* 24 */
  --ss-space-8:  2rem;      /* 32 */
  --ss-space-10: 2.5rem;    /* 40 */
  --ss-space-12: 3rem;      /* 48 */
  --ss-space-16: 4rem;      /* 64 */
  --ss-space-20: 5rem;      /* 80 */
  --ss-space-28: 7rem;      /* 112  — section default */

  /* ── Radii ─────────────────────────────────────────────────────────────── */
  --ss-radius-sm:   8px;    /* small chrome (small buttons, dot wraps) */
  --ss-radius:     12px;    /* default — cards, inputs, modals */
  --ss-radius-lg:  18px;    /* large surfaces */
  --ss-radius-xl:  22px;    /* pricing cards, modals */
  --ss-radius-2xl: 28px;    /* CTA card */
  --ss-radius-pill: 30px;   /* pills, badges, eyebrows */
  --ss-radius-full: 9999px; /* circles */

  /* ── Shadows ───────────────────────────────────────────────────────────── */
  --ss-shadow-card:   0 8px 32px rgba(0,0,0,0.30);
  --ss-shadow-lift:   0 20px 50px rgba(0,0,0,0.60),
                      inset 0 1px 0 rgba(255,255,255,0.05);
  --ss-shadow-modal:  0 24px 80px rgba(0,0,0,0.50);
  --ss-shadow-hero:   0 30px 80px rgba(0,0,0,0.70),
                      0 0 60px rgba(232,184,75,0.12),
                      inset 0 1px 0 rgba(255,255,255,0.08);

  --ss-shadow-btn-gold:  0 4px 18px rgba(232,184,75,0.35),
                         inset 0 1px 1px rgba(255,255,255,0.40);
  --ss-shadow-btn-gold-hover: 0 8px 28px rgba(232,184,75,0.50),
                              inset 0 1px 1px rgba(255,255,255,0.40);

  --ss-focus-ring: 0 0 0 4px rgba(232,184,75,0.10);

  /* ── Motion ────────────────────────────────────────────────────────────── */
  --ss-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);     /* hover, page-state */
  --ss-ease-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1); /* delight, modals */
  --ss-ease-out:       cubic-bezier(0, 0, 0.2, 1);
  --ss-ease-in:        cubic-bezier(0.4, 0, 1, 1);

  --ss-dur-fast:    150ms;
  --ss-dur-base:    250ms;
  --ss-dur-medium:  400ms;
  --ss-dur-slow:    700ms;
  --ss-dur-ambient:   8s;        /* hero float, scene drift */

  --ss-transition: all var(--ss-dur-base) var(--ss-ease-standard);

  /* ── Layout ────────────────────────────────────────────────────────────── */
  --ss-sidebar-w:  240px;
  --ss-topbar-h:   58px;
  --ss-content-max: 1280px;
  --ss-hero-max:    1100px;
  --ss-card-max:     560px;
  --ss-form-max:     480px;

  /* ── Backdrop blur values ──────────────────────────────────────────────── */
  --ss-blur-modal: blur(8px);
  --ss-blur-glass: blur(20px);
  --ss-blur-nav:   blur(24px) saturate(180%);
}


/* ═══════════════════════════════════════════════════════════════════════════
   Base reset
   ═══════════════════════════════════════════════════════════════════════════ */

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--ss-font-sans);
  font-size: var(--ss-text-body);
  font-weight: var(--ss-w-medium);
  line-height: var(--ss-lh-relaxed);
  color: var(--ss-fg);
  background: var(--ss-bg-0);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

/* RTL is the default for SmartStruct. Set `dir="rtl" lang="ar"` on <html>. */

::-webkit-scrollbar { width: 4px; height: 6px; }
::-webkit-scrollbar-track { background: var(--ss-bg-0); }
::-webkit-scrollbar-thumb {
  background: rgba(232,184,75,0.35);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: rgba(232,184,75,0.60); }


/* ═══════════════════════════════════════════════════════════════════════════
   Semantic typography classes
   Use these as a layer above the variables — they encode the brand's actual
   weight, line-height, and tracking decisions.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Hero h1 — landing only */
.ss-hero {
  font-size: var(--ss-text-hero);
  font-weight: var(--ss-w-black);
  line-height: var(--ss-lh-tight);
  letter-spacing: var(--ss-track-tight);
}

/* Section h2 — marketing */
.ss-display {
  font-size: var(--ss-text-display);
  font-weight: var(--ss-w-black);
  line-height: var(--ss-lh-snug);
}

/* In-app h2 — page titles */
.ss-h2 {
  font-size: var(--ss-text-h2);
  font-weight: var(--ss-w-black);
  line-height: var(--ss-lh-snug);
}

.ss-h3 {
  font-size: var(--ss-text-h3);
  font-weight: var(--ss-w-heavy);
  line-height: var(--ss-lh-snug);
}

.ss-h4 {
  font-size: var(--ss-text-h4);
  font-weight: var(--ss-w-heavy);
  line-height: var(--ss-lh-snug);
}

.ss-h5 {
  font-size: var(--ss-text-h5);
  font-weight: var(--ss-w-heavy);
}

/* Body */
.ss-body {
  font-size: var(--ss-text-body);
  font-weight: var(--ss-w-medium);
  line-height: var(--ss-lh-relaxed);
  color: var(--ss-fg);
}
.ss-body-muted {
  font-size: var(--ss-text-body);
  font-weight: var(--ss-w-medium);
  line-height: var(--ss-lh-loose);
  color: var(--ss-fg-muted);
}

/* Small / supporting */
.ss-text-sm  { font-size: var(--ss-text-sm); }
.ss-text-xs  { font-size: var(--ss-text-xs); font-weight: var(--ss-w-bold); }
.ss-text-2xs { font-size: var(--ss-text-2xs); font-weight: var(--ss-w-heavy); }

/* Eyebrow — uppercase, tracked, gold */
.ss-eyebrow {
  display: inline-block;
  font-size: var(--ss-text-2xs);
  font-weight: var(--ss-w-heavy);
  letter-spacing: var(--ss-track-eyebrow);
  text-transform: uppercase;
  color: var(--ss-gold);
  padding: 0.35rem 0.95rem;
  border-radius: var(--ss-radius-pill);
  background: var(--ss-gold-tint);
  border: 1px solid rgba(232,184,75,0.20);
}

/* Section / nav-group label — tiny dim caps */
.ss-label {
  font-size: 0.62rem;
  font-weight: var(--ss-w-heavy);
  letter-spacing: var(--ss-track-eyebrow);
  text-transform: uppercase;
  color: var(--ss-fg-dim);
}

/* Form label — small bold */
.ss-form-label {
  display: block;
  font-size: var(--ss-text-xs);
  font-weight: var(--ss-w-bold);
  color: var(--ss-fg);
  margin-bottom: 0.45rem;
}

/* Stat number — JetBrains Mono, heavy, 1.0 line-height */
.ss-stat-num {
  font-family: var(--ss-font-mono);
  font-size: var(--ss-text-stat);
  font-weight: var(--ss-w-black);
  line-height: 1;
}
.ss-stat-num-lg {
  font-family: var(--ss-font-mono);
  font-size: var(--ss-text-stat-lg);
  font-weight: var(--ss-w-black);
  line-height: 1;
}

/* Inline mono — code, IDs, small numeric data in tables */
.ss-mono { font-family: var(--ss-font-mono); }


/* ═══════════════════════════════════════════════════════════════════════════
   Color helpers
   ═══════════════════════════════════════════════════════════════════════════ */

/* Gold gradient text-fill — the brand's most recognisable typographic move */
.ss-text-gold {
  background: var(--ss-gradient-gold-text);
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 4px 20px rgba(232,184,75,0.30));
  display: inline-block;
}

.ss-text-muted { color: var(--ss-fg-muted); }
.ss-text-dim   { color: var(--ss-fg-dim); }
.ss-text-fg    { color: var(--ss-fg); }

.ss-text-green  { color: var(--ss-green); }
.ss-text-blue   { color: var(--ss-blue); }
.ss-text-red    { color: var(--ss-red); }
.ss-text-purple { color: var(--ss-purple); }


/* ═══════════════════════════════════════════════════════════════════════════
   Reduced motion — always respect
   ═══════════════════════════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   Legacy compatibility layer — للتوافق مع main.css القديم
   يربط الأسماء القديمة (--gold, --bg ...) بالتوكنز الجديدة (--ss-*).
   ═══════════════════════════════════════════════════════════════════════════ */
:root {
  /* Brand gold */
  --gold:           var(--ss-gold);
  --gold2:          var(--ss-gold-lo);
  --gold3:          var(--ss-gold-hi);
  --gold-dim:       var(--ss-gold-dim);
  --gold-glow:      var(--ss-gold-glow);

  /* Surfaces */
  --bg:             var(--ss-bg-0);
  --bg2:            var(--ss-bg-1);
  --bg3:            var(--ss-bg-2);
  --bg4:            var(--ss-bg-3);

  /* Borders */
  --border:         var(--ss-border);
  --border2:        var(--ss-border-2);

  /* Text */
  --text:           var(--ss-fg);
  --muted:          var(--ss-fg-muted);
  --dim:            var(--ss-fg-dim);

  /* Accents */
  --green:          var(--ss-green);
  --blue:           var(--ss-blue);
  --red:            var(--ss-red);
  --purple:         var(--ss-purple);
  --orange:         var(--ss-orange);

  /* Shape */
  --radius:         12px;
  --radius-lg:      18px;

  /* Effects */
  --shadow:         0 8px 32px rgba(0,0,0,0.3);
  --transition:     all 0.25s cubic-bezier(0.4,0,0.2,1);
}
