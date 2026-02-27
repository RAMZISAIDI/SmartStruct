-- ══════════════════════════════════════════════════════
--  SmartStruct v6.0 — Supabase Schema
--  قاعدة بيانات منصة إدارة مشاريع المقاولة الجزائرية
--  تاريخ الإنشاء: 2025
-- ══════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PLANS (خطط الاشتراك) ───────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  price_monthly INTEGER DEFAULT 0,
  price INTEGER DEFAULT 0,
  max_projects INTEGER DEFAULT -1,
  max_workers INTEGER DEFAULT -1,
  max_equipment INTEGER DEFAULT -1,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TENANTS (المؤسسات) ───────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  plan_id INTEGER REFERENCES plans(id) DEFAULT 1,
  wilaya VARCHAR(100),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  nif VARCHAR(100),
  nis VARCHAR(100),
  rc_number VARCHAR(100),
  tva_rate INTEGER DEFAULT 19,
  subscription_status VARCHAR(50) DEFAULT 'trial',
  trial_end DATE,
  is_active BOOLEAN DEFAULT true,
  supabase_url TEXT,
  supabase_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USERS (المستخدمون) ───────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  is_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROJECTS (المشاريع) ───────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  project_type VARCHAR(100),
  wilaya VARCHAR(100),
  client_name VARCHAR(255),
  client_phone VARCHAR(50),
  budget BIGINT DEFAULT 0,
  total_spent BIGINT DEFAULT 0,
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status VARCHAR(50) DEFAULT 'active',
  color VARCHAR(20) DEFAULT '#4A90E2',
  phase VARCHAR(255),
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_archived BOOLEAN DEFAULT false,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WORKERS (العمال) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS workers (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  project_id INTEGER REFERENCES projects(id),
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(100),
  phone VARCHAR(50),
  daily_salary INTEGER DEFAULT 0,
  contract_type VARCHAR(50) DEFAULT 'daily',
  hire_date DATE,
  color VARCHAR(20) DEFAULT '#4A90E2',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EQUIPMENT (المعدات) ────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  project_id INTEGER REFERENCES projects(id),
  name VARCHAR(255) NOT NULL,
  model VARCHAR(100),
  plate_number VARCHAR(50),
  icon VARCHAR(10) DEFAULT '🔧',
  status VARCHAR(50) DEFAULT 'active',
  purchase_price BIGINT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRANSACTIONS (المعاملات المالية) ─────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  project_id INTEGER REFERENCES projects(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('revenue', 'expense')),
  category VARCHAR(100),
  amount BIGINT DEFAULT 0,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) DEFAULT 'cash',
  supplier VARCHAR(255),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ATTENDANCE (الحضور) ────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  worker_id INTEGER REFERENCES workers(id) NOT NULL,
  project_id INTEGER REFERENCES projects(id),
  date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half')),
  hours DECIMAL(4,1) DEFAULT 8.0,
  overtime DECIMAL(4,1) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id, date)
);

-- ─── MATERIALS (المواد) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  project_id INTEGER REFERENCES projects(id),
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  quantity DECIMAL(10,2) DEFAULT 0,
  min_quantity DECIMAL(10,2) DEFAULT 0,
  unit_price BIGINT DEFAULT 0,
  supplier VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── STOCK MOVEMENTS (حركة المخزون) ────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  material_id INTEGER REFERENCES materials(id),
  project_id INTEGER REFERENCES projects(id),
  type VARCHAR(20) DEFAULT 'out' CHECK (type IN ('in', 'out')),
  quantity DECIMAL(10,2) DEFAULT 0,
  note TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INVOICES (الفواتير) ────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  number VARCHAR(50),
  client VARCHAR(255),
  project_id INTEGER REFERENCES projects(id),
  amount BIGINT DEFAULT 0,
  amount_ht BIGINT DEFAULT 0,
  tva_rate INTEGER DEFAULT 19,
  tva_amount BIGINT DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'cash',
  description TEXT,
  items JSONB DEFAULT '[]',
  paid_date DATE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SALARY RECORDS (سجلات الرواتب) ─────────────────────
CREATE TABLE IF NOT EXISTS salary_records (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  worker_id INTEGER REFERENCES workers(id) NOT NULL,
  month VARCHAR(7) NOT NULL,
  days_worked INTEGER DEFAULT 0,
  daily_salary INTEGER DEFAULT 0,
  gross_amount BIGINT DEFAULT 0,
  deductions BIGINT DEFAULT 0,
  net_amount BIGINT DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── KANBAN TASKS (مهام كانبان) ─────────────────────────
CREATE TABLE IF NOT EXISTS kanban_tasks (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  project_id INTEGER REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  col VARCHAR(50) DEFAULT 'todo',
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to INTEGER REFERENCES workers(id),
  due_date DATE,
  color VARCHAR(20) DEFAULT '#4A90E2',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DOCUMENTS (الوثائق) ────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  project_id INTEGER REFERENCES projects(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  url TEXT,
  size BIGINT DEFAULT 0,
  notes TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── OBLIGATIONS (الالتزامات المالية) ──────────────────
CREATE TABLE IF NOT EXISTS obligations (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  project_id INTEGER REFERENCES projects(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount BIGINT DEFAULT 0,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  type VARCHAR(50) DEFAULT 'payment',
  priority VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTES (الملاحظات) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  project_id INTEGER REFERENCES projects(id),
  user_id INTEGER REFERENCES users(id),
  text TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICATIONS (الإشعارات) ──────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  type VARCHAR(50),
  title TEXT,
  body TEXT,
  user_id INTEGER,
  target_user_id INTEGER,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AUDIT LOG (سجل التدقيق) ─────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  user_id INTEGER,
  action VARCHAR(100),
  table_name VARCHAR(100),
  record_id INTEGER,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  Row Level Security (RLS) — حماية البيانات
-- ══════════════════════════════════════════════════════

-- تفعيل RLS على الجداول الرئيسية
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- سياسة: السماح لجميع العمليات عبر service_role (للتطبيق)
CREATE POLICY "Allow service role full access" ON tenants FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON users FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON projects FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON workers FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON equipment FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON materials FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON attendance FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON salary_records FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON kanban_tasks FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON documents FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON obligations FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON notes FOR ALL USING (true);

-- ══════════════════════════════════════════════════════
--  Indexes — مؤشرات الأداء
-- ══════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_workers_tenant ON workers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workers_project ON workers(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_project ON transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_attendance_worker ON attendance(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_materials_tenant ON materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- ══════════════════════════════════════════════════════
--  Seed Data — بيانات ابتدائية
-- ══════════════════════════════════════════════════════

-- خطط الاشتراك
INSERT INTO plans (id, slug, name, price_monthly, price, max_projects, max_workers, max_equipment) VALUES
  (1, 'starter', 'المبتدئ', 2900, 2900, 3, 15, 0),
  (2, 'pro', 'الاحترافي', 7900, 7900, 20, 100, 50),
  (3, 'enterprise', 'المؤسسي', 19900, 19900, -1, -1, -1)
ON CONFLICT (slug) DO NOTHING;

-- المؤسسة التجريبية
INSERT INTO tenants (id, name, plan_id, wilaya, subscription_status, is_active) VALUES
  (1, 'مؤسسة الجزائر للبناء', 2, 'الجزائر', 'active', true)
ON CONFLICT DO NOTHING;

-- المستخدمون
INSERT INTO users (id, tenant_id, full_name, email, password, role, is_admin, is_active) VALUES
  (1, NULL, 'مسؤول النظام', 'admin@smartbtp.dz', 'Admin@SmartStruct2025', 'admin', true, true),
  (2, 1, 'محمد الأمين بوعلام', 'demo@algerie-construction.dz', 'Demo@1234', 'admin', false, true)
ON CONFLICT (email) DO NOTHING;

-- إعادة تعيين تسلسل المعرفات
SELECT setval('plans_id_seq', 10);
SELECT setval('tenants_id_seq', 10);
SELECT setval('users_id_seq', 10);
