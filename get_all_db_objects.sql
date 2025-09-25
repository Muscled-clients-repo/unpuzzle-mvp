-- Get all database objects (tables and views) with their security status
WITH all_objects AS (
    -- Get all tables
    SELECT
        'table' as object_type,
        tablename as name,
        rowsecurity as has_rls,
        true as can_have_rls
    FROM pg_tables
    WHERE schemaname = 'public'

    UNION ALL

    -- Get all views
    SELECT
        'view' as object_type,
        viewname as name,
        false as has_rls,  -- views cannot have RLS
        false as can_have_rls
    FROM pg_views
    WHERE schemaname = 'public'
),
policy_counts AS (
    SELECT
        tablename,
        COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
)
SELECT
    ao.object_type,
    ao.name,
    ao.has_rls,
    COALESCE(pc.policy_count, 0) as policy_count,
    CASE
        WHEN ao.object_type = 'view' THEN 'Views inherit from tables'
        WHEN ao.has_rls = true AND COALESCE(pc.policy_count, 0) > 0 THEN 'Secured with RLS'
        WHEN ao.has_rls = true AND COALESCE(pc.policy_count, 0) = 0 THEN 'RLS enabled, no policies'
        ELSE 'Unrestricted'
    END as security_status
FROM all_objects ao
LEFT JOIN policy_counts pc ON ao.name = pc.tablename
ORDER BY ao.object_type, ao.name;