-- migrations/rls_setup.sql
-- Run AFTER prisma migrate to enable Row-Level Security on all tenant-scoped tables.
-- CockroachDB RLS requires v25.2+ 

-- ═══════════════════════════════════════════════════════════════
-- Helper function: enable RLS on a table
-- ═══════════════════════════════════════════════════════════════

-- Helper function: enable RLS on tables with direct siteId
CREATE OR REPLACE FUNCTION enable_site_rls(tbl TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %I USING ("siteId" = current_setting(''app.current_tenant'', true))',
    tbl
  );
END;
$$ LANGUAGE plpgsql;

-- Helper function: enable RLS on tables with projectId
CREATE OR REPLACE FUNCTION enable_project_rls(tbl TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %I USING ("projectId" IN (SELECT id FROM "Project" WHERE "siteId" = current_setting(''app.current_tenant'', true)))',
    tbl
  );
END;
$$ LANGUAGE plpgsql;

-- Apply RLS to direct site-scoped tables
SELECT enable_site_rls('Project');
SELECT enable_site_rls('Membership');
SELECT enable_site_rls('GitInstallation');
SELECT enable_site_rls('GitRepository');
SELECT enable_site_rls('GitCommit');
SELECT enable_site_rls('PullRequest');
SELECT enable_site_rls('GitBranch');
SELECT enable_site_rls('SiteIntegration');

-- Apply RLS to project-scoped tables
SELECT enable_project_rls('Issue');
SELECT enable_project_rls('Sprint');
SELECT enable_project_rls('AutomationRule');
SELECT enable_project_rls('CustomField');
SELECT enable_project_rls('ProjectMember');

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC;
