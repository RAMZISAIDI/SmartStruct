-- ════════════════════════════════════════════════════════════════════
-- SmartStruct v7.4 — Fix Migration
-- إصلاح أنواع البيانات + Realtime
-- شغّل هذا الملف في Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════

-- ─── ① إصلاح audit_log: INTEGER → BIGINT ───
-- الخطأ: "value out of range for type integer"
-- JavaScript timestamps تتجاوز حد INTEGER (2.1 مليار)
ALTER TABLE audit_log ALTER COLUMN id         TYPE BIGINT USING id::bigint;
ALTER TABLE audit_log ALTER COLUMN tenant_id  TYPE BIGINT USING tenant_id::bigint;
ALTER TABLE audit_log ALTER COLUMN user_id    TYPE BIGINT USING user_id::bigint;
ALTER TABLE audit_log ALTER COLUMN record_id  TYPE BIGINT USING record_id::bigint;

-- ─── ② إصلاح global_settings: تأكيد PK على 'key' ───
-- يجب أن يكون 'key' هو PK وليس 'id' (الجدول ليس له id)
CREATE TABLE IF NOT EXISTS global_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة بيانات افتراضية إذا لم توجد
INSERT INTO global_settings (key, value) 
VALUES 
  ('global_ai_config', '{"apiKey":"","provider":"","model":""}'),
  ('global_gdrive_config', '{"client_id":"","enabled":false}')
ON CONFLICT (key) DO NOTHING;

-- ─── ③ تفعيل Realtime لتصحيح WebSocket ───
DO $$
BEGIN
  -- projects
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='projects') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE projects;
  END IF;
  -- workers
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='workers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE workers;
  END IF;
  -- transactions
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
  END IF;
  -- attendance
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='attendance') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
  END IF;
  -- equipment
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='equipment') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE equipment;
  END IF;
  -- equipment_logs
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='equipment_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE equipment_logs;
  END IF;
  -- notifications
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- ─── ④ تأكيد RLS مفتوح للجداول الجديدة ───
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "global_settings_all" ON global_settings;
CREATE POLICY "global_settings_all" ON global_settings FOR ALL USING (true);

-- ════════════════════════════════════════════════════════════════════
-- انتهى — شغّل هذا الملف مرة واحدة فقط
-- ════════════════════════════════════════════════════════════════════
