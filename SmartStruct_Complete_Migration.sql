-- ═══════════════════════════════════════════════════════════════
-- SmartStruct v7.4 — COMPLETE MIGRATION SQL
-- شغّل هذا كاملاً في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ① جداول جديدة
CREATE TABLE IF NOT EXISTS suppliers (
  id BIGSERIAL PRIMARY KEY, tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, name_fr TEXT, activity TEXT, category TEXT DEFAULT 'materials',
  phone TEXT, phone2 TEXT, email TEXT, wilaya TEXT, address TEXT,
  nif TEXT, nis TEXT, rc TEXT, rating INTEGER DEFAULT 3, notes TEXT,
  color TEXT DEFAULT '#4A90E2', is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS supplier_purchases (
  id BIGSERIAL PRIMARY KEY, tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  date DATE, description TEXT, amount NUMERIC(15,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'cash', payment_status TEXT DEFAULT 'unpaid',
  due_date DATE, receipt_number TEXT, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS supplier_prices (
  id BIGSERIAL PRIMARY KEY, tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL, unit TEXT, unit_price NUMERIC(15,2) DEFAULT 0,
  date DATE, project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, note TEXT
);
CREATE TABLE IF NOT EXISTS supplier_obligations (
  id BIGSERIAL PRIMARY KEY, tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'invoice', description TEXT, amount NUMERIC(15,2) DEFAULT 0,
  due_date DATE, ref TEXT, status TEXT DEFAULT 'pending', done_date DATE, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS leave_requests (
  id BIGSERIAL PRIMARY KEY, tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'annual', status TEXT DEFAULT 'pending',
  start_date DATE, end_date DATE, days INTEGER DEFAULT 1,
  reason TEXT, approved_by TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS worker_warnings (
  id BIGSERIAL PRIMARY KEY, tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'verbal', date DATE, reason TEXT, action TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS worker_overtime (
  id BIGSERIAL PRIMARY KEY, tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  date DATE, hours NUMERIC(5,2) DEFAULT 1, rate INTEGER DEFAULT 125,
  amount NUMERIC(15,2) DEFAULT 0, project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL
);

-- ② projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name_fr TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'planning';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ③ workers
ALTER TABLE workers ADD COLUMN IF NOT EXISTS full_name_fr TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS cnas_number TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS monthly_base NUMERIC(15,2) DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS marital_status TEXT DEFAULT 'single';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS spouse_works BOOLEAN DEFAULT false;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_handicap BOOLEAN DEFAULT false;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS contract_end DATE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS avatar_color TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS dob DATE;

-- ④ equipment
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'other';
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS serial TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS next_maintenance DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS plate_number TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS icon TEXT;

-- ⑤ attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS hours NUMERIC(5,2) DEFAULT 8;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS gps TEXT;

-- ⑥ notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unread';

-- ⑦ invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_history JSONB;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS confirmed_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_ht NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tva_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tva_rate NUMERIC(5,2) DEFAULT 19;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- ⑧ salary_records
ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS allowances NUMERIC(15,2) DEFAULT 0;
ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS deductions NUMERIC(15,2) DEFAULT 0;
ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS allowance_transport NUMERIC(15,2) DEFAULT 0;
ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS allowance_prod NUMERIC(15,2) DEFAULT 0;
ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS allowance_housing NUMERIC(15,2) DEFAULT 0;
ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS ded_late NUMERIC(15,2) DEFAULT 0;
ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS ded_advance NUMERIC(15,2) DEFAULT 0;
ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS ded_other NUMERIC(15,2) DEFAULT 0;

-- ⑨ tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_start DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_end DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gdrive_client_id TEXT;

-- ⑩ documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS doc_kind TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS doc_number TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS meta_data JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploader_id INTEGER;

-- ⑪ materials
ALTER TABLE materials ADD COLUMN IF NOT EXISTS min_quantity NUMERIC(15,2) DEFAULT 0;

-- ⑫ RLS
ALTER TABLE suppliers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_purchases   ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_prices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_warnings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_overtime      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='suppliers' AND policyname='allow_all') THEN
    CREATE POLICY "allow_all" ON suppliers FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='supplier_purchases' AND policyname='allow_all') THEN
    CREATE POLICY "allow_all" ON supplier_purchases FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='supplier_prices' AND policyname='allow_all') THEN
    CREATE POLICY "allow_all" ON supplier_prices FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='supplier_obligations' AND policyname='allow_all') THEN
    CREATE POLICY "allow_all" ON supplier_obligations FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leave_requests' AND policyname='allow_all') THEN
    CREATE POLICY "allow_all" ON leave_requests FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='worker_warnings' AND policyname='allow_all') THEN
    CREATE POLICY "allow_all" ON worker_warnings FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='worker_overtime' AND policyname='allow_all') THEN
    CREATE POLICY "allow_all" ON worker_overtime FOR ALL USING (true);
  END IF;
END $$;

-- ⑬ Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE supplier_purchases;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE supplier_prices;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE supplier_obligations;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE worker_warnings;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE worker_overtime;
EXCEPTION WHEN others THEN NULL; END $$;

SELECT 'SmartStruct v7.4 Migration Complete ✅' AS result;
