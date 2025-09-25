-- Query to get all table names in the public schema
SELECT
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers,
    rowsecurity as has_rls
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;