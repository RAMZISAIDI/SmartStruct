-- ════════════════════════════════════════════════════════════════════
-- SmartStruct v7.4 — Fix Missing Columns + Realtime
-- شغّل هذا في Supabase SQL Editor قبل أي شيء آخر
-- ════════════════════════════════════════════════════════════════════

-- ─── ① إضافة الأعمدة المفقودة ───
ALTER TABLE tenants     ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE projects    ADD COLUMN IF NOT EXISTS client_name_fr TEXT;
ALTER TABLE workers     ADD COLUMN IF NOT EXISTS full_name_fr TEXT;
ALTER TABLE workers     ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0;
ALTER TABLE workers     ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE workers     ADD COLUMN IF NOT EXISTS spouse_works BOOLEAN DEFAULT false;
ALTER TABLE workers     ADD COLUMN IF NOT EXISTS is_handicap BOOLEAN DEFAULT false;
ALTER TABLE workers     ADD COLUMN IF NOT EXISTS cnas_number TEXT;
ALTER TABLE equipment   ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE attendance  ADD COLUMN IF NOT EXISTS gps JSONB;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS gdrive_connected BOOLEAN DEFAULT false;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS avatar_color TEXT;

-- ─── ② إصلاح audit_log: INTEGER → BIGINT ───
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='audit_log' AND column_name='id' AND data_type='integer') THEN
    ALTER TABLE audit_log ALTER COLUMN id         TYPE BIGINT USING id::bigint;
    ALTER TABLE audit_log ALTER COLUMN tenant_id  TYPE BIGINT USING tenant_id::bigint;
    ALTER TABLE audit_log ALTER COLUMN user_id    TYPE BIGINT USING user_id::bigint;
    ALTER TABLE audit_log ALTER COLUMN record_id  TYPE BIGINT USING record_id::bigint;
  END IF;
END $$;

-- ─── ③ تأكيد global_settings ───
CREATE TABLE IF NOT EXISTS global_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO global_settings (key, value)
VALUES 
  ('global_ai_config', '{"apiKey":"","provider":"","model":""}'),
  ('global_gdrive_config', '{"client_id":"","enabled":false}')
ON CONFLICT (key) DO NOTHING;

-- ─── ④ تفعيل Realtime لكل الجداول المهمة ───
DO $$
DECLARE
  t TEXT;
  realtime_tables TEXT[] := ARRAY[
    'projects','workers','equipment','equipment_logs','transactions','attendance',
    'materials','invoices','salary_records','kanban_tasks','documents',
    'notifications','obligations','notes','stock_movements','tenants','users'
  ];
BEGIN
  FOREACH t IN ARRAY realtime_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;

-- ─── ⑤ تأكيد RLS مفتوح لـ global_settings ───
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "global_settings_all" ON global_settings;
CREATE POLICY "global_settings_all" ON global_settings FOR ALL USING (true);

-- ─── ⑥ إصلاح FK constraints التي تمنع رفع salary_records و documents ───
-- إذا فشل سجل بسبب FK، نسمح بـ NULL مؤقتاً ليُرفع
ALTER TABLE salary_records ALTER COLUMN worker_id DROP NOT NULL;
ALTER TABLE documents      ALTER COLUMN worker_id DROP NOT NULL;
ALTER TABLE transactions   ALTER COLUMN worker_id DROP NOT NULL;

-- ════════════════════════════════════════════════════════════════════
-- انتهى — أعد تحميل التطبيق بعد التشغيل
-- ════════════════════════════════════════════════════════════════════
