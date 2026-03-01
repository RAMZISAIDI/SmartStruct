-- ══════════════════════════════════════════════════════
--  SmartStruct — Supabase Schema v3.0 (FIXED)
--  محدَّث ليتطابق 100% مع app.js و SB_SCHEMA
--  شغّل هذا الملف كاملاً في SQL Editor
--  supabase.com → SQL Editor → New Query → Paste → Run
-- ══════════════════════════════════════════════════════

-- ─── حذف الجداول القديمة إذا موجودة ───
DROP TABLE IF EXISTS notifications    CASCADE;
DROP TABLE IF EXISTS global_settings  CASCADE;
DROP TABLE IF EXISTS audit_log        CASCADE;
DROP TABLE IF EXISTS obligations      CASCADE;
DROP TABLE IF EXISTS documents        CASCADE;
DROP TABLE IF EXISTS kanban_tasks     CASCADE;
DROP TABLE IF EXISTS salary_records   CASCADE;
DROP TABLE IF EXISTS invoices         CASCADE;
DROP TABLE IF EXISTS stock_movements  CASCADE;
DROP TABLE IF EXISTS materials        CASCADE;
DROP TABLE IF EXISTS attendance       CASCADE;
DROP TABLE IF EXISTS transactions     CASCADE;
DROP TABLE IF EXISTS equipment        CASCADE;
DROP TABLE IF EXISTS workers          CASCADE;
DROP TABLE IF EXISTS projects         CASCADE;
DROP TABLE IF EXISTS notes            CASCADE;
DROP TABLE IF EXISTS users            CASCADE;
DROP TABLE IF EXISTS tenants          CASCADE;
DROP TABLE IF EXISTS plans            CASCADE;

-- ══════════════════════════════════════════════════════
--  خطط الاشتراك
-- ══════════════════════════════════════════════════════
CREATE TABLE plans (
  id              SERIAL PRIMARY KEY,
  slug            VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  price_monthly   INTEGER DEFAULT 0,
  price           INTEGER DEFAULT 0,
  max_projects    INTEGER DEFAULT 3,
  max_workers     INTEGER DEFAULT 15,
  max_equipment   INTEGER DEFAULT 0,
  max_emails      INTEGER DEFAULT 50,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  المؤسسات — متطابق مع SB_SCHEMA.tenants
-- ══════════════════════════════════════════════════════
CREATE TABLE tenants (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(255) NOT NULL,
  plan_id               INTEGER REFERENCES plans(id) DEFAULT 2,
  wilaya                VARCHAR(100),
  address               TEXT,
  phone                 VARCHAR(50),
  email                 VARCHAR(255),         -- ✅ مضاف
  nif                   VARCHAR(100),
  nis                   VARCHAR(100),
  rc_number             VARCHAR(100),
  tva_rate              INTEGER DEFAULT 19,
  subscription_status   VARCHAR(50) DEFAULT 'pending',
  trial_start           DATE,
  trial_end             DATE,
  is_active             BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  المستخدمون — متطابق مع SB_SCHEMA.users
-- ══════════════════════════════════════════════════════
CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  full_name      VARCHAR(255) NOT NULL,
  email          VARCHAR(255) UNIQUE NOT NULL,
  password       VARCHAR(255) NOT NULL,
  role           VARCHAR(50) DEFAULT 'admin',
  is_admin       BOOLEAN DEFAULT false,
  is_active      BOOLEAN DEFAULT false,
  account_status VARCHAR(50) DEFAULT 'pending',
  avatar_color   VARCHAR(20) DEFAULT '#4A90E2', -- ✅ مضاف
  last_login     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  المشاريع — متطابق مع SB_SCHEMA.projects
-- ══════════════════════════════════════════════════════
CREATE TABLE projects (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name         VARCHAR(255) NOT NULL,
  project_type VARCHAR(100),
  wilaya       VARCHAR(100),
  client_name  VARCHAR(255),
  budget       BIGINT DEFAULT 0,
  total_spent  BIGINT DEFAULT 0,
  progress     INTEGER DEFAULT 0,
  status       VARCHAR(50) DEFAULT 'active',
  color        VARCHAR(20) DEFAULT '#4A90E2',
  phase        VARCHAR(255),
  description  TEXT,                          -- ✅ مضاف
  start_date   DATE,
  end_date     DATE,
  is_archived  BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  العمال — متطابق مع SB_SCHEMA.workers
-- ══════════════════════════════════════════════════════
CREATE TABLE workers (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id     INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  full_name      VARCHAR(255) NOT NULL,
  role           VARCHAR(100),
  phone          VARCHAR(50),
  national_id    VARCHAR(50),                 -- ✅ مضاف
  daily_salary   INTEGER DEFAULT 0,
  monthly_base   INTEGER DEFAULT 0,           -- ✅ مضاف
  contract_type  VARCHAR(50) DEFAULT 'daily',
  hire_date      DATE,
  color          VARCHAR(20),
  avatar_color   VARCHAR(20) DEFAULT '#4A90E2', -- ✅ مضاف
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  المعدات — متطابق مع SB_SCHEMA.equipment
-- ══════════════════════════════════════════════════════
CREATE TABLE equipment (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id     INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  name           VARCHAR(255) NOT NULL,
  model          VARCHAR(100),
  plate_number   VARCHAR(50),
  icon           VARCHAR(10) DEFAULT '🚜',
  status         VARCHAR(50) DEFAULT 'active',
  purchase_price BIGINT DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  المعاملات — متطابق مع SB_SCHEMA.transactions
-- ══════════════════════════════════════════════════════
CREATE TABLE transactions (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id     INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  worker_id      INTEGER REFERENCES workers(id) ON DELETE SET NULL, -- ✅ مضاف
  type           VARCHAR(20) NOT NULL,
  category       VARCHAR(100),
  amount         BIGINT DEFAULT 0,
  description    TEXT,
  date           DATE,
  payment_method VARCHAR(50) DEFAULT 'cash',
  supplier       VARCHAR(255),                -- ✅ مضاف
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  الحضور — متطابق مع SB_SCHEMA.attendance
-- ══════════════════════════════════════════════════════
CREATE TABLE attendance (
  id         SERIAL PRIMARY KEY,
  tenant_id  INTEGER REFERENCES tenants(id) ON DELETE CASCADE, -- ✅ مضاف للـ SB_SCHEMA
  worker_id  INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  date       DATE NOT NULL,
  status     VARCHAR(20) DEFAULT 'present',
  hours      NUMERIC(5,2) DEFAULT 8,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  المواد — متطابق مع SB_SCHEMA.materials
-- ══════════════════════════════════════════════════════
CREATE TABLE materials (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id   INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  name         VARCHAR(255) NOT NULL,
  unit         VARCHAR(50),
  quantity     NUMERIC(12,2) DEFAULT 0,
  min_quantity NUMERIC(12,2) DEFAULT 0,
  unit_price   BIGINT DEFAULT 0,
  supplier     VARCHAR(255),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  حركات المخزون — متطابق مع SB_SCHEMA.stock_movements
-- ══════════════════════════════════════════════════════
CREATE TABLE stock_movements (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
  type        VARCHAR(10) NOT NULL,  -- 'in' | 'out'
  quantity    NUMERIC(12,2) DEFAULT 0,
  date        DATE DEFAULT CURRENT_DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  الفواتير — متطابق مع SB_SCHEMA.invoices
--  ⚠️ إصلاح كامل — أعمدة مختلفة تماماً
-- ══════════════════════════════════════════════════════
CREATE TABLE invoices (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id   INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  number       VARCHAR(100),
  client       VARCHAR(255),            -- ✅ اسم العمود في app.js هو 'client' وليس 'client_name'
  amount       BIGINT DEFAULT 0,        -- ✅ المبلغ الكلي TTC
  amount_ht    BIGINT DEFAULT 0,        -- ✅ HT
  tva_amount   BIGINT DEFAULT 0,        -- ✅ مبلغ TVA
  tva_rate     INTEGER DEFAULT 19,      -- ✅ نسبة TVA
  date         DATE,
  due_date     DATE,
  status       VARCHAR(50) DEFAULT 'pending',
  paid_date    DATE,                    -- ✅ تاريخ الدفع
  description  TEXT,
  payment_method VARCHAR(50) DEFAULT 'cash',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  سجلات الرواتب — متطابق مع SB_SCHEMA.salary_records
--  ⚠️ إصلاح كامل
-- ══════════════════════════════════════════════════════
CREATE TABLE salary_records (
  id         SERIAL PRIMARY KEY,
  tenant_id  INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id  INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  month_key  VARCHAR(7),               -- ✅ 'YYYY-MM' — اسم الحقل في app.js
  amount     BIGINT DEFAULT 0,         -- ✅ صافي الراتب
  paid_date  DATE,                     -- ✅ تاريخ الدفع
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  مهام Kanban — متطابق مع SB_SCHEMA.kanban_tasks
--  ⚠️ إصلاح كامل
-- ══════════════════════════════════════════════════════
CREATE TABLE kanban_tasks (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  priority    VARCHAR(20) DEFAULT 'medium',
  assignee_id INTEGER REFERENCES workers(id) ON DELETE SET NULL, -- ✅ اسم الحقل في app.js
  due_date    DATE,
  col         VARCHAR(50) DEFAULT 'todo',  -- ✅ عمود Kanban (todo/doing/done)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  الوثائق — متطابق مع SB_SCHEMA.documents
--  ⚠️ إصلاح كامل
-- ══════════════════════════════════════════════════════
CREATE TABLE documents (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  name        VARCHAR(255) NOT NULL,
  category    VARCHAR(100),             -- ✅ مضاف
  type        VARCHAR(50),
  url         TEXT,
  size        BIGINT DEFAULT 0,
  date        DATE DEFAULT CURRENT_DATE,-- ✅ مضاف
  uploader_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- ✅ مضاف
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  الالتزامات — متطابق مع SB_SCHEMA.obligations
--  ⚠️ إصلاح كامل
-- ══════════════════════════════════════════════════════
CREATE TABLE obligations (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  amount      BIGINT DEFAULT 0,
  due         DATE,                     -- ✅ اسم الحقل في app.js هو 'due' وليس 'due_date'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  الملاحظات — متطابق مع SB_SCHEMA.notes
-- ══════════════════════════════════════════════════════
CREATE TABLE notes (
  id         SERIAL PRIMARY KEY,
  tenant_id  INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  text       TEXT NOT NULL,
  date       DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  الإشعارات — متطابق مع SB_SCHEMA.notifications
-- ══════════════════════════════════════════════════════
CREATE TABLE notifications (
  id         BIGINT PRIMARY KEY,
  tenant_id  INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    INTEGER,
  type       VARCHAR(50) NOT NULL DEFAULT 'info',
  title      TEXT,
  body       TEXT,
  date       TIMESTAMPTZ DEFAULT NOW(),
  read       BOOLEAN DEFAULT false,
  status     VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  الإعدادات العامة
-- ══════════════════════════════════════════════════════
CREATE TABLE global_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  Row Level Security — السماح بكل العمليات
-- ══════════════════════════════════════════════════════
ALTER TABLE plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance      ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'plans','tenants','users','projects','workers','equipment',
    'transactions','attendance','materials','stock_movements','invoices',
    'salary_records','kanban_tasks','documents','obligations',
    'notes','notifications','global_settings'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON %I', tbl);
    EXECUTE format('CREATE POLICY "allow_all" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════
--  Indexes للأداء
-- ══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_tenants_active      ON tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant        ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant     ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_status     ON projects(status);
CREATE INDEX IF NOT EXISTS idx_workers_tenant      ON workers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workers_project     ON workers(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date   ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_attendance_worker   ON attendance(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date     ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_materials_tenant    ON materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant     ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant    ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tenant       ON kanban_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read  ON notifications(read);

-- ══════════════════════════════════════════════════════
--  البيانات الابتدائية
-- ══════════════════════════════════════════════════════
INSERT INTO plans (slug, name, price_monthly, price, max_projects, max_workers, max_equipment, max_emails) VALUES
  ('starter',    'المبتدئ',   2900,  2900,  3,  15,  0,  50),
  ('pro',        'الاحترافي', 7900,  7900,  20, 100, 50, 500),
  ('enterprise', 'المؤسسي',   19900, 19900, -1, -1,  -1, -1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tenants (id, name, plan_id, wilaya, subscription_status, is_active) VALUES
  (1, 'SmartStruct Admin', 3, 'الجزائر', 'active', true)
ON CONFLICT DO NOTHING;

INSERT INTO users (id, tenant_id, full_name, email, password, role, is_admin, is_active, account_status) VALUES
  (1, NULL, 'مسؤول النظام', 'admin@smartbtp.dz', 'Admin@SmartStruct2025', 'admin', true, true, 'active')
ON CONFLICT (email) DO NOTHING;

-- ضبط تسلسل الـ IDs
SELECT setval('plans_id_seq',   10);
SELECT setval('tenants_id_seq', 10);
SELECT setval('users_id_seq',   10);
