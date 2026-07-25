-- migrations/rls_setup.sql
-- Run AFTER prisma migrate to enable Row-Level Security on all tenant-scoped tables.
-- CockroachDB RLS requires v25.2+ 

-- ═══════════════════════════════════════════════════════════════
-- Helper function: enable RLS on a table
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION enable_tenant_rls(table_name TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
  EXECUTE format(
    'CREATE POLICY tenant_isolation_policy ON %I USING (site_id = current_setting(''app.current_tenant'')::UUID)',
    table_name
  );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- Apply RLS to all tenant-scoped tables
-- ═══════════════════════════════════════════════════════════════

SELECT enable_tenant_rls('Issue');
SELECT enable_tenant_rls('Project');
SELECT enable_tenant_rls('Sprint');
SELECT enable_tenant_rls('Comment');
SELECT enable_tenant_rls('IssueHistory');
SELECT enable_tenant_rls('WorkLog');
SELECT enable_tenant_rls('Watcher');
SELECT enable_tenant_rls('IssueLink');
SELECT enable_tenant_rls('Attachment');
SELECT enable_tenant_rls('AutomationRule');
SELECT enable_tenant_rls('CustomField');
SELECT enable_tenant_rls('ProjectMember');
SELECT enable_tenant_rls('Membership');

-- ═══════════════════════════════════════════════════════════════
-- Grant permissions
-- ═══════════════════════════════════════════════════════════════

GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC;
