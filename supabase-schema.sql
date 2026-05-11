-- ══════════════════════════════════════════════════════
--  SmartStruct — Supabase Schema v7.2 (FIXED)
--  محدَّث ليتطابق 100% مع app.js و SB_SCHEMA
--  شغّل هذا الملف كاملاً في SQL Editor
--  supabase.com → SQL Editor → New Query → Paste → Run
-- ══════════════════════════════════════════════════════

-- ─── حذف الجداول القديمة إذا موجودة (الترتيب: الفرعية أولاً ثم الأم) ───

-- جداول v7.2 الجديدة (تحذف أولاً لأنها تشير لجداول أساسية)
DROP TABLE IF EXISTS ai_conversations    CASCADE;
DROP TABLE IF EXISTS signatures          CASCADE;
DROP TABLE IF EXISTS bank_transactions   CASCADE;
DROP TABLE IF EXISTS tender_offers       CASCADE;
DROP TABLE IF EXISTS tenders             CASCADE;
DROP TABLE IF EXISTS equipment_locations CASCADE;
DROP TABLE IF EXISTS custom_roles        CASCADE;
DROP TABLE IF EXISTS audit_log           CASCADE;

-- جداول v7.1 الأساسية
DROP TABLE IF EXISTS notifications    CASCADE;
DROP TABLE IF EXISTS global_settings  CASCADE;
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

-- ─── حذف الـ sequences إن وُجدت يتيمة (احتياطاً) ───
DROP SEQUENCE IF EXISTS plans_id_seq           CASCADE;
DROP SEQUENCE IF EXISTS tenants_id_seq         CASCADE;
DROP SEQUENCE IF EXISTS users_id_seq           CASCADE;
DROP SEQUENCE IF EXISTS projects_id_seq        CASCADE;
DROP SEQUENCE IF EXISTS workers_id_seq         CASCADE;
DROP SEQUENCE IF EXISTS equipment_id_seq       CASCADE;
DROP SEQUENCE IF EXISTS transactions_id_seq    CASCADE;
DROP SEQUENCE IF EXISTS attendance_id_seq      CASCADE;
DROP SEQUENCE IF EXISTS materials_id_seq       CASCADE;
DROP SEQUENCE IF EXISTS stock_movements_id_seq CASCADE;
DROP SEQUENCE IF EXISTS invoices_id_seq        CASCADE;
DROP SEQUENCE IF EXISTS salary_records_id_seq  CASCADE;
DROP SEQUENCE IF EXISTS kanban_tasks_id_seq    CASCADE;
DROP SEQUENCE IF EXISTS documents_id_seq       CASCADE;
DROP SEQUENCE IF EXISTS obligations_id_seq     CASCADE;
DROP SEQUENCE IF EXISTS notes_id_seq           CASCADE;
DROP SEQUENCE IF EXISTS audit_log_id_seq       CASCADE;
DROP SEQUENCE IF EXISTS custom_roles_id_seq    CASCADE;
DROP SEQUENCE IF EXISTS equipment_locations_id_seq CASCADE;
DROP SEQUENCE IF EXISTS tenders_id_seq         CASCADE;
DROP SEQUENCE IF EXISTS tender_offers_id_seq   CASCADE;
DROP SEQUENCE IF EXISTS bank_transactions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS signatures_id_seq      CASCADE;
DROP SEQUENCE IF EXISTS ai_conversations_id_seq CASCADE;

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
  article_imp           VARCHAR(100),         -- ✅ v7.3 رقم المادة الجبائية
  rib                   VARCHAR(100),         -- ✅ v7.3 رقم الحساب البنكي
  logo_url              TEXT,                 -- ✅ v7.3 شعار المؤسسة
  stamp_url             TEXT,                 -- ✅ v7.3 ختم المؤسسة
  bank_account          VARCHAR(100),         -- ✅ رقم الحساب المصرفي
  bank_name             VARCHAR(100),         -- ✅ اسم البنك
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
  phone        VARCHAR(50),                    -- ✅ هاتف العميل (مضاف)
  budget       BIGINT DEFAULT 0,
  total_spent  BIGINT DEFAULT 0,
  progress     INTEGER DEFAULT 0,
  status       VARCHAR(50) DEFAULT 'active',
  color        VARCHAR(20) DEFAULT '#4A90E2',
  phase        VARCHAR(255),
  description  TEXT,
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
--  Audit Log — سجل التعديلات (للمحاسبة الرسمية)
-- ══════════════════════════════════════════════════════
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     INTEGER,
  user_email  VARCHAR(255),
  action      VARCHAR(20) NOT NULL,        -- create | update | delete | login | logout
  table_name  VARCHAR(60),
  record_id   INTEGER,
  before_data JSONB,
  after_data  JSONB,
  ip_address  VARCHAR(50),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_log(user_id);

-- ══════════════════════════════════════════════════════
--  Custom Roles — أدوار مخصصة (Role Builder)
-- ══════════════════════════════════════════════════════
CREATE TABLE custom_roles (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',     -- {"projects":["view","create"], ...}
  scope       JSONB DEFAULT '{}',              -- {"project_ids":[1,3]} مثلاً
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON custom_roles(tenant_id);

-- ربط المستخدم بدور مخصص (إن وجد)
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_role_id INTEGER REFERENCES custom_roles(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_layout JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme            VARCHAR(20) DEFAULT 'dark';
ALTER TABLE users ADD COLUMN IF NOT EXISTS lang             VARCHAR(5) DEFAULT 'ar';

-- ══════════════════════════════════════════════════════
--  GPS Tracking — تتبع المعدات
-- ══════════════════════════════════════════════════════
CREATE TABLE equipment_locations (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  latitude     NUMERIC(10,6),
  longitude    NUMERIC(10,6),
  accuracy     NUMERIC(8,2),
  recorded_at  TIMESTAMPTZ DEFAULT NOW(),
  note         TEXT
);
CREATE INDEX IF NOT EXISTS idx_eqloc_eq    ON equipment_locations(equipment_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_eqloc_tenant ON equipment_locations(tenant_id);

-- ══════════════════════════════════════════════════════
--  Time Tracking — حضور دقيق بالساعات
-- ══════════════════════════════════════════════════════
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in   TIME;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out  TIME;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS overtime   NUMERIC(5,2) DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS gps_in     TEXT;        -- "lat,lng"
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS gps_out    TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS photo_url  TEXT;        -- صورة العامل عند الحضور

-- ══════════════════════════════════════════════════════
--  Tenders — مناقصات الموردين
-- ══════════════════════════════════════════════════════
CREATE TABLE tenders (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  deadline    DATE,
  status      VARCHAR(20) DEFAULT 'open',     -- open | closed | awarded
  awarded_to  VARCHAR(255),                    -- اسم المورد الفائز
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tender_offers (
  id           SERIAL PRIMARY KEY,
  tender_id    INTEGER REFERENCES tenders(id) ON DELETE CASCADE NOT NULL,
  supplier     VARCHAR(255) NOT NULL,
  supplier_phone VARCHAR(50),
  total_price  NUMERIC(15,2) NOT NULL,
  delivery_days INTEGER,
  notes        TEXT,
  is_winner    BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenders_tenant ON tenders(tenant_id);

-- ══════════════════════════════════════════════════════
--  Bank Transactions — استيراد كشوف البنوك
-- ══════════════════════════════════════════════════════
CREATE TABLE bank_transactions (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  bank_name       VARCHAR(100),               -- CCP, BNA, BEA, ...
  account_number  VARCHAR(50),
  transaction_date DATE NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  description     TEXT,
  reference       VARCHAR(100),
  matched_with    INTEGER,                    -- transactions.id إذا تطابقت
  is_matched      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_tenant ON bank_transactions(tenant_id, transaction_date);

-- ══════════════════════════════════════════════════════
--  E-Signatures — توقيعات إلكترونية
-- ══════════════════════════════════════════════════════
CREATE TABLE signatures (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  signer_name  VARCHAR(255),
  signer_email VARCHAR(255),
  signature_data TEXT,                        -- base64 PNG of signature
  ip_address  VARCHAR(50),
  signed_at   TIMESTAMPTZ DEFAULT NOW(),
  token       VARCHAR(64) UNIQUE              -- token to access the signature link
);

-- ══════════════════════════════════════════════════════
--  AI Conversations — محادثات المساعد الذكي
-- ══════════════════════════════════════════════════════
CREATE TABLE ai_conversations (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  messages    JSONB NOT NULL DEFAULT '[]',    -- array of {role, content, timestamp}
  title       VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_user ON ai_conversations(user_id, updated_at DESC);

-- ══════════════════════════════════════════════════════
--  إضافات على جداول موجودة
-- ══════════════════════════════════════════════════════
-- توقيع رقمي على الفواتير
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- معلومات إضافية للمؤسسة
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url     TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stamp_url    TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_name    VARCHAR(100);

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
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_offers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations    ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'plans','tenants','users','projects','workers','equipment',
    'transactions','attendance','materials','stock_movements','invoices',
    'salary_records','kanban_tasks','documents','obligations',
    'notes','notifications','global_settings',
    'audit_log','custom_roles','equipment_locations','tenders','tender_offers',
    'bank_transactions','signatures','ai_conversations'
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
--  ⚠️ السياسة: قاعدة البيانات تكون فارغة تماماً عدا:
--    1. خطط الاشتراك (plans) — ضرورية لعمل التطبيق
--    2. حساب المسؤول (admin@smartbtp.dz) — لإدارة النظام
--    3. الحساب التجريبي (demo@algerie-construction.dz) — ببيانات وهمية
--  أي مستخدم جديد يُسجَّل بـ tenant_id جديد ويبدأ فارغاً تماماً
-- ══════════════════════════════════════════════════════

-- ─── خطط الاشتراك ───
INSERT INTO plans (slug, name, price_monthly, price, max_projects, max_workers, max_equipment, max_emails) VALUES
  ('starter',    'المبتدئ',   2900,  2900,  3,  15,  0,  50),
  ('pro',        'الاحترافي', 7900,  7900,  20, 100, 50, 500),
  ('enterprise', 'المؤسسي',   19900, 19900, -1, -1,  -1, -1)
ON CONFLICT (slug) DO NOTHING;

-- ─── المؤسسات ───
-- id=1 → مؤسسة المسؤول (لا تستخدم لأي بيانات تشغيلية)
-- id=2 → الحساب التجريبي ببيانات وهمية كاملة
INSERT INTO tenants (id, name, plan_id, wilaya, subscription_status, is_active) VALUES
  (1, 'SmartStruct Admin',                3, 'الجزائر', 'active', true),
  (2, 'مؤسسة الجزائر للبناء (تجريبي)',     2, 'الجزائر', 'active', true)
ON CONFLICT (id) DO NOTHING;

-- ─── المستخدمون ───
INSERT INTO users (id, tenant_id, full_name, email, password, role, is_admin, is_active, account_status) VALUES
  (1, NULL, 'مسؤول النظام',       'admin@smartbtp.dz',            'Admin@SmartStruct2025', 'admin', true,  true, 'active'),
  (2, 2,    'محمد الأمين بوعلام', 'demo@algerie-construction.dz', 'Demo@1234',             'admin', false, true, 'active')
ON CONFLICT (email) DO NOTHING;

-- ══════════════════════════════════════════════════════
--  بيانات الديمو — كلها لـ tenant_id=2 (الحساب التجريبي فقط)
--  ⚠️ ملاحظة: لا نُحدد id يدوياً — Supabase يولّده تلقائياً (SERIAL)
--  هذا يضمن أن sequence_id يبقى متزامناً ولا تحدث أخطاء duplicate key
-- ══════════════════════════════════════════════════════

-- المشاريع التجريبية
INSERT INTO projects (tenant_id, name, project_type, wilaya, client_name, phone, budget, total_spent, progress, status, color, phase, start_date, end_date, is_archived) VALUES
  (2, 'بناء عمارة R+5 حيدرة',     'سكني',   'الجزائر', 'عبد القادر بن علي', '0550111222', 45000000, 18500000, 42, 'active',    '#4A90E2', 'الهيكل الخرساني',         '2024-03-01', '2025-12-31', false),
  (2, 'فيلا سكنية دار البيضاء',   'سكني',   'البليدة', 'سمير حمادة',        '0660333444', 12500000, 12800000, 98, 'completed', '#34C38F', 'الاستلام النهائي',          '2023-06-01', '2024-11-30', false),
  (2, 'مستودع تجاري وهران',       'تجاري',  'وهران',   'شركة لوجيستيك',     '0770555666', 22000000,  8900000, 35, 'active',    '#E8B84B', 'البناء والجدران',           '2024-08-15', '2025-08-14', false),
  (2, 'مدرسة ابتدائية بجاية',     'عمومي',  'بجاية',   'بلدية بجاية',       '0555777888', 31000000,  5200000, 15, 'delayed',   '#F04E6A', 'أعمال الحفر والأساسات',     '2024-01-10', '2025-06-30', false);

-- العمال التجريبيون (نفترض أن المشاريع أعلاه تحصل على ids 1,2,3,4)
INSERT INTO workers (tenant_id, project_id, full_name, role, phone, daily_salary, monthly_base, contract_type, hire_date, color, is_active) VALUES
  (2, 1, 'محمد الأمين زروق', 'بنّاء رئيسي', '0550 111 222', 3500, 91000,  'daily',   '2024-03-01', '#4A90E2', true),
  (2, 1, 'كريم بن عزيز',     'حداد',         '0661 333 444', 4000, 104000, 'daily',   '2024-03-15', '#34C38F', true),
  (2, 1, 'يوسف شريف',        'كهربائي',      '0770 555 666', 4500, 117000, 'monthly', '2024-04-01', '#E8B84B', true),
  (2, 3, 'فريد بوزيدي',      'سباك',         '0555 777 888', 4200, 109200, 'daily',   '2024-05-01', '#9B6DFF', true),
  (2, 3, 'عمر حمزة',         'مساعد بنّاء',  '0660 999 111', 2500, 65000,  'daily',   '2024-06-01', '#FF7043', true);

-- المعدات التجريبية
INSERT INTO equipment (tenant_id, project_id, name, model, plate_number, icon, status, purchase_price, notes) VALUES
  (2, 1, 'حفارة كاتربيلر',     'CAT 320',       '16-1234-16', '🚜',  'active',      8500000,  ''),
  (2, 1, 'شاحنة خلط الخرسانة', 'Mercedes 3344', '16-5678-16', '🚛',  'active',      4200000,  ''),
  (2, 3, 'رافعة برجية 50T',    'Potain MCT 88', '',           '🏗️', 'maintenance', 12000000, 'صيانة دورية');

-- المعاملات المالية التجريبية
INSERT INTO transactions (tenant_id, project_id, type, category, amount, description, date, payment_method) VALUES
  (2, 1, 'revenue', 'دفعة مقدمة',      10000000, 'دفعة مقدمة مشروع حيدرة',           '2024-03-05', 'bank'),
  (2, 1, 'expense', 'مواد البناء',      4500000,  'حديد تسليح وأسمنت',                '2024-03-15', 'cash'),
  (2, 1, 'expense', 'رواتب العمال',     2800000,  'رواتب شهر مارس',                   '2024-03-31', 'bank'),
  (2, 2, 'revenue', 'استلام نهائي',     12500000, 'دفعة الاستلام النهائي فيلا البيضاء', '2024-11-30', 'bank'),
  (2, 3, 'expense', 'اكراءات المعدات', 1200000,  'إيجار شاحنات لنقل مواد البناء',    '2024-09-10', 'cash');

-- المواد التجريبية
INSERT INTO materials (tenant_id, project_id, name, unit, quantity, min_quantity, unit_price, supplier) VALUES
  (2, 1, 'حديد تسليح 12mm', 'طن',        25,  5,  95000, 'مصنع الحجار'),
  (2, 1, 'أسمنت CPA 42.5',  'كيس',       320, 50, 650,   'مصنع مفتاح'),
  (2, 1, 'رمل مغسول',       'م³',        80,  20, 4500,  'المحجرة الشرقية'),
  (2, 3, 'طوب قرميد',       'ألف قطعة', 15,  3,  28000, 'مصنع كريم');

-- الملاحظات التجريبية
INSERT INTO notes (tenant_id, project_id, user_id, text, date) VALUES
  (2, 1, 2, 'تم اكتمال الطابق الثالث، العمل يسير بشكل ممتاز.',           '2024-10-15'),
  (2, 1, 2, 'تأخر وصول الحديد من المورد، يُتوقع الوصول نهاية الأسبوع.', '2024-10-20');

-- ضبط تسلسل الـ IDs ليبدأ من رقم آمن (بعد آخر سجل مُدرج)
-- هذا حاسم لمنع خطأ "duplicate key value violates unique constraint" عند التسجيل الجديد
SELECT setval('plans_id_seq',           (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM plans));
SELECT setval('tenants_id_seq',         (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM tenants));
SELECT setval('users_id_seq',           (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM users));
SELECT setval('projects_id_seq',        (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM projects));
SELECT setval('workers_id_seq',         (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM workers));
SELECT setval('equipment_id_seq',       (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM equipment));
SELECT setval('transactions_id_seq',    (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM transactions));
SELECT setval('attendance_id_seq',      (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM attendance));
SELECT setval('materials_id_seq',       (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM materials));
SELECT setval('stock_movements_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM stock_movements));
SELECT setval('invoices_id_seq',        (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM invoices));
SELECT setval('salary_records_id_seq',  (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM salary_records));
SELECT setval('kanban_tasks_id_seq',    (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM kanban_tasks));
SELECT setval('documents_id_seq',       (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM documents));
SELECT setval('obligations_id_seq',     (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM obligations));
SELECT setval('notes_id_seq',           (SELECT GREATEST(COALESCE(MAX(id), 0), 100) FROM notes));
SELECT setval('audit_log_id_seq',       (SELECT GREATEST(COALESCE(MAX(id), 0), 1)   FROM audit_log));
SELECT setval('custom_roles_id_seq',    (SELECT GREATEST(COALESCE(MAX(id), 0), 1)   FROM custom_roles));
SELECT setval('equipment_locations_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM equipment_locations));
SELECT setval('tenders_id_seq',         (SELECT GREATEST(COALESCE(MAX(id), 0), 1)   FROM tenders));
SELECT setval('tender_offers_id_seq',   (SELECT GREATEST(COALESCE(MAX(id), 0), 1)   FROM tender_offers));
SELECT setval('bank_transactions_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM bank_transactions));
SELECT setval('signatures_id_seq',      (SELECT GREATEST(COALESCE(MAX(id), 0), 1)   FROM signatures));
SELECT setval('ai_conversations_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1)  FROM ai_conversations));

-- ══════════════════════════════════════════════════════
--  ⚡ تفعيل Supabase Realtime على جميع الجداول
--  هذا ضروري لعمل خاصية التحديثات الفورية (WebSocket)
-- ══════════════════════════════════════════════════════

-- إضافة الجداول لـ publication الخاصة بـ Realtime (آمنة للتشغيل المتكرر)
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'projects','workers','transactions','attendance','kanban_tasks','invoices',
    'materials','salary_records','equipment','notifications','obligations','notes',
    'stock_movements','documents','tenants','users',
    'audit_log','custom_roles','equipment_locations','tenders','tender_offers',
    'bank_transactions','signatures','ai_conversations'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    EXCEPTION
      WHEN duplicate_object THEN NULL;  -- الجدول مضاف بالفعل، تجاهل
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not add % to publication: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════════
--  🆕 v7.3 — Migration: إضافة الحقول الجديدة للترويسة القانونية
--  آمن للتشغيل على قواعد جديدة وقديمة على حد سواء
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS article_imp  VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rib          VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url     TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stamp_url    TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_account VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_name    VARCHAR(100);
