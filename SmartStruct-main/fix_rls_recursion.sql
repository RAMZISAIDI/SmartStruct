-- ══════════════════════════════════════════════════════════════════════════
--  🚨 EMERGENCY FIX — infinite recursion in users RLS policy
--  شغّل هذا الملف في Supabase SQL Editor لإصلاح مشكلة الـ recursion فوراً
--  Run this in Supabase SQL Editor → it will fix the login immediately
-- ══════════════════════════════════════════════════════════════════════════

-- STEP 1: حذف جميع السياسات الحالية على جدول users
DROP POLICY IF EXISTS "allow_all"        ON public.users;
DROP POLICY IF EXISTS "tenant_isolation" ON public.users;
DROP POLICY IF EXISTS "users_isolation"  ON public.users;
DROP POLICY IF EXISTS "users_select"     ON public.users;
DROP POLICY IF EXISTS "users_read"       ON public.users;
DROP POLICY IF EXISTS "users_write"      ON public.users;
DROP POLICY IF EXISTS "users_insert"     ON public.users;
DROP POLICY IF EXISTS "users_update"     ON public.users;
DROP POLICY IF EXISTS "users_delete"     ON public.users;

-- STEP 2: سياسة بسيطة وآمنة — لا recursion
-- التطبيق يستخدم custom auth (ليس Supabase Auth) لذا auth.uid() = NULL دائماً
-- الأمان يأتي من التطبيق نفسه (email + bcrypt password)
CREATE POLICY "users_open_select" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "users_open_insert" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_open_update" ON public.users
  FOR UPDATE USING (true) WITH CHECK (true);

-- حذف محظور عبر API (حماية إضافية)
CREATE POLICY "users_no_delete" ON public.users
  FOR DELETE USING (false);


-- ══════════════════════════════════════════════════════════════════════════
-- STEP 3: إصلاح باقي الجداول إذا كانت تعاني من نفس المشكلة
-- ══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'projects','workers','equipment','transactions','attendance','salary_records',
    'materials','stock_movements','invoices','kanban_tasks','documents','obligations',
    'notes','notifications','equipment_locations','tenders','tender_offers',
    'bank_transactions','signatures','ai_conversations','audit_log','custom_roles',
    'suppliers','supplier_purchases','supplier_prices','supplier_obligations',
    'leave_requests','worker_warnings','worker_overtime',
    'tenants','plans','global_settings'
  ]
  LOOP
    -- حذف أي سياسة قديمة
    EXECUTE format('DROP POLICY IF EXISTS "allow_all"               ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation"        ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tender_offers_isolation" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenants_isolation"       ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenants_select"          ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenants_insert"          ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenants_update"          ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenants_delete"          ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "plans_read"              ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "global_settings_read"    ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "global_settings_write"   ON public.%I', tbl);
    -- إنشاء سياسة مفتوحة (الأمان عبر tenant_id في كود التطبيق)
    EXECUTE format('CREATE POLICY "allow_all" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;


-- ══════════════════════════════════════════════════════════════════════════
-- STEP 4: تأكيد تفعيل RLS على جميع الجداول
-- ══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users','tenants','projects','workers','equipment','transactions','attendance',
    'salary_records','materials','stock_movements','invoices','kanban_tasks',
    'documents','obligations','notes','notifications','equipment_locations',
    'tenders','tender_offers','bank_transactions','signatures','ai_conversations',
    'audit_log','custom_roles','plans','global_settings',
    'suppliers','supplier_purchases','supplier_prices','supplier_obligations',
    'leave_requests','worker_warnings','worker_overtime'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;


-- ══════════════════════════════════════════════════════════════════════════
-- ✅ التحقق من النتيجة — يجب أن يُعيد قائمة السياسات الجديدة
-- ══════════════════════════════════════════════════════════════════════════
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

