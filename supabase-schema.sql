-- ══════════════════════════════════════════════════════
--  SmartStruct — Supabase Schema v2.0
--  شغّل هذا الملف كاملاً في SQL Editor
--  supabase.com → SQL Editor → New Query → Paste → Run
-- ══════════════════════════════════════════════════════

-- ─── حذف الجداول القديمة إذا موجودة (لإعادة البناء نظيف) ───
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
--  الجداول الأساسية
-- ══════════════════════════════════════════════════════

-- خطط الاشتراك
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

-- المؤسسات
CREATE TABLE tenants (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(255) NOT NULL,
  plan_id               INTEGER REFERENCES plans(id) DEFAULT 2,
  wilaya                VARCHAR(100),
  address               TEXT,
  phone                 VARCHAR(50),
  email                 VARCHAR(255),
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

-- المستخدمون
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
  last_login     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- المشاريع
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
  start_date   DATE,
  end_date     DATE,
  is_archived  BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- العمال
CREATE TABLE workers (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id     INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  full_name      VARCHAR(255) NOT NULL,
  role           VARCHAR(100),
  phone          VARCHAR(50),
  daily_salary   INTEGER DEFAULT 0,
  contract_type  VARCHAR(50) DEFAULT 'daily',
  hire_date      DATE,
  color          VARCHAR(20),
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- المعدات
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

-- المعاملات المالية
CREATE TABLE transactions (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id     INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  type           VARCHAR(20) NOT NULL,
  category       VARCHAR(100),
  amount         BIGINT DEFAULT 0,
  description    TEXT,
  date           DATE,
  payment_method VARCHAR(50) DEFAULT 'cash',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- الحضور
CREATE TABLE attendance (
  id         SERIAL PRIMARY KEY,
  tenant_id  INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id  INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  date       DATE NOT NULL,
  status     VARCHAR(20) DEFAULT 'present',
  hours      NUMERIC(5,2) DEFAULT 8,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- المواد
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

-- الفواتير
CREATE TABLE invoices (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id   INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  number       VARCHAR(100),
  client_name  VARCHAR(255),
  date         DATE,
  due_date     DATE,
  status       VARCHAR(50) DEFAULT 'draft',
  total        BIGINT DEFAULT 0,
  tva          INTEGER DEFAULT 19,
  notes        TEXT,
  items        JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- سجلات الرواتب
CREATE TABLE salary_records (
  id         SERIAL PRIMARY KEY,
  tenant_id  INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id  INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  month      VARCHAR(7),
  days_worked INTEGER DEFAULT 0,
  base_salary BIGINT DEFAULT 0,
  bonuses     BIGINT DEFAULT 0,
  deductions  BIGINT DEFAULT 0,
  net_salary  BIGINT DEFAULT 0,
  paid        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- مهام Kanban
CREATE TABLE kanban_tasks (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  status      VARCHAR(50) DEFAULT 'todo',
  priority    VARCHAR(20) DEFAULT 'medium',
  assigned_to INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  due_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- الوثائق
CREATE TABLE documents (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(50),
  url         TEXT,
  size        BIGINT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- الالتزامات
CREATE TABLE obligations (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  type        VARCHAR(50),
  amount      BIGINT DEFAULT 0,
  due_date    DATE,
  status      VARCHAR(50) DEFAULT 'pending',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- الملاحظات
CREATE TABLE notes (
  id         SERIAL PRIMARY KEY,
  tenant_id  INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  text       TEXT NOT NULL,
  date       DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- الإشعارات (تسجيلات جديدة + طلبات كلمة مرور)
CREATE TABLE notifications (
  id         BIGINT PRIMARY KEY,   -- نرسله من الكود كـ Date.now()
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

-- الإعدادات العامة (AI config وغيره)
CREATE TABLE global_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  Row Level Security — السماح لـ anon بكل العمليات
--  (الحماية الحقيقية تتم في الكود بالتحقق من الـ tenant_id)
-- ══════════════════════════════════════════════════════
ALTER TABLE plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment      ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance     ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['plans','tenants','users','projects','workers',
    'equipment','transactions','attendance','materials','invoices',
    'salary_records','kanban_tasks','documents','obligations','notes',
    'notifications','global_settings']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON %I', tbl);
    EXECUTE format('CREATE POLICY "allow_all" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════
--  Indexes للأداء
-- ══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_tenants_active     ON tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant       ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_active       ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_projects_tenant    ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_status    ON projects(status);
CREATE INDEX IF NOT EXISTS idx_workers_tenant     ON workers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workers_project    ON workers(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date  ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_attendance_worker  ON attendance(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date    ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_materials_tenant   ON materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant    ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ══════════════════════════════════════════════════════
--  البيانات الابتدائية
-- ══════════════════════════════════════════════════════

-- خطط الاشتراك
INSERT INTO plans (slug, name, price_monthly, price, max_projects, max_workers, max_equipment, max_emails) VALUES
  ('starter',    'المبتدئ',   2900,  2900,  3,  15,  0,  50),
  ('pro',        'الاحترافي', 7900,  7900,  20, 100, 50, 500),
  ('enterprise', 'المؤسسي',   19900, 19900, -1, -1,  -1, -1)
ON CONFLICT (slug) DO NOTHING;

-- المسؤول العام (is_active=true لأنه مسؤول النظام)
INSERT INTO tenants (id, name, plan_id, wilaya, subscription_status, is_active) VALUES
  (1, 'SmartStruct Admin', 3, 'الجزائر', 'active', true)
ON CONFLICT DO NOTHING;

INSERT INTO users (id, tenant_id, full_name, email, password, role, is_admin, is_active, account_status) VALUES
  (1, NULL, 'مسؤول النظام', 'admin@smartbtp.dz', 'Admin@SmartStruct2025', 'admin', true, true, 'active')
ON CONFLICT (email) DO NOTHING;

-- ضبط تسلسل الـ IDs بعيداً عن البيانات الابتدائية
SELECT setval('plans_id_seq',   10);
SELECT setval('tenants_id_seq', 10);
SELECT setval('users_id_seq',   10);

