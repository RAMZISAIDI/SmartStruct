-- ════════════════════════════════════════════════════════════════════
-- SmartStruct v7.4 — Schema Migration (Bilingual + Equipment Logs + GDrive)
-- شغّل هذا الملف في Supabase SQL Editor مرة واحدة
-- ════════════════════════════════════════════════════════════════════

-- ─── ① حقول ثنائية اللغة ───
ALTER TABLE tenants   ADD COLUMN IF NOT EXISTS name_fr          TEXT;
ALTER TABLE workers   ADD COLUMN IF NOT EXISTS full_name_fr     TEXT;
ALTER TABLE projects  ADD COLUMN IF NOT EXISTS client_name_fr   TEXT;

-- ─── ② حقول العامل للحالة العائلية وحساب الرواتب ───
ALTER TABLE workers ADD COLUMN IF NOT EXISTS marital_status  TEXT DEFAULT 'single' CHECK (marital_status IN ('single','married','divorced','widowed'));
ALTER TABLE workers ADD COLUMN IF NOT EXISTS children_count  INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS spouse_works    SMALLINT DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_handicap     SMALLINT DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS cnas_number     TEXT;

-- ─── ③ حقول إضافية للمعدات ───
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS type             TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS serial           TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS purchase_date    DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS next_maintenance DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS insurance_expiry DATE;

-- ─── ④ جدول equipment_logs (سجل الصيانة والعمليات) ───
CREATE TABLE IF NOT EXISTS equipment_logs (
  id               BIGSERIAL PRIMARY KEY,
  tenant_id        BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
  equipment_id     BIGINT REFERENCES equipment(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('maintenance','fuel','repair','inspection','incident','use')),
  date             DATE NOT NULL,
  cost             NUMERIC(15,2) DEFAULT 0,
  note             TEXT,
  vendor           TEXT,
  next_maintenance DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_logs_equipment ON equipment_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_tenant    ON equipment_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_date      ON equipment_logs(date);

-- RLS للجدول الجديد
ALTER TABLE equipment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_logs_select"    ON equipment_logs;
DROP POLICY IF EXISTS "equipment_logs_insert"    ON equipment_logs;
DROP POLICY IF EXISTS "equipment_logs_update"    ON equipment_logs;
DROP POLICY IF EXISTS "equipment_logs_delete"    ON equipment_logs;

CREATE POLICY "equipment_logs_select" ON equipment_logs FOR SELECT USING (true);
CREATE POLICY "equipment_logs_insert" ON equipment_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "equipment_logs_update" ON equipment_logs FOR UPDATE USING (true);
CREATE POLICY "equipment_logs_delete" ON equipment_logs FOR DELETE USING (true);

-- ─── ⑤ Google Drive — تتبع ربط المستخدمين ───
ALTER TABLE users ADD COLUMN IF NOT EXISTS gdrive_connected SMALLINT DEFAULT 0;

-- ─── ⑥ Attendance: GPS coordinates ───
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS gps JSONB;

-- ─── ⑦ Notifications: حقول إضافية ───
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message     TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link        TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url  TEXT;

-- ─── ⑧ تفعيل Realtime للجداول المهمة ───
ALTER PUBLICATION supabase_realtime ADD TABLE equipment_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ════════════════════════════════════════════════════════════════════
--  انتهى — كل جداولك جاهزة لاستقبال البيانات الجديدة
-- ════════════════════════════════════════════════════════════════════
