-- FINAL DATABASE CLEANUP RECOMMENDATIONS
-- Based on comprehensive analysis of conversation tables/views

-- =============================================================================
-- SUMMARY OF FINDINGS
-- =============================================================================
/*
TABLES ANALYSIS:
- conversations: 0 records (SAFE TO DELETE)
- goal_conversations: 1 live record + 49 dead rows (KEEP + VACUUM)
- conversation_messages: 4 live records + 35 dead rows (KEEP + VACUUM)
- conversation_attachments: 5 live records + 1 dead row (KEEP + VACUUM)

VIEWS ANALYSIS:
- active_goal_conversations: Returns 1 record (KEEP - functional)
- conversation_timeline: Returns 4 records (KEEP - functional)
*/

-- =============================================================================
-- STEP 1: SAFE TO DELETE - Empty conversations table
-- =============================================================================

-- Check one more time for any foreign key dependencies
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'conversations';

-- If no dependencies found above, safe to drop:
-- DROP TABLE conversations CASCADE;

-- =============================================================================
-- STEP 2: PERFORMANCE CLEANUP - Vacuum dead rows
-- =============================================================================

-- Clean up dead rows in active tables
VACUUM FULL goal_conversations;        -- Remove 49 dead rows
VACUUM FULL conversation_messages;     -- Remove 35 dead rows
VACUUM FULL conversation_attachments;  -- Remove 1 dead row

-- =============================================================================
-- STEP 3: KEEP EVERYTHING ELSE - All functional
-- =============================================================================
/*
KEEP THESE (all have data and are used):
✅ goal_conversations (1 live record)
✅ conversation_messages (4 live records)
✅ conversation_attachments (5 live records)
✅ active_goal_conversations view (returns 1 record)
✅ conversation_timeline view (returns 4 records)
*/

-- =============================================================================
-- STEP 4: CODE CLEANUP NEEDED
-- =============================================================================
/*
Since 'conversations' table is empty but referenced in code, you need to either:

OPTION A: Remove all code references to 'conversations' table
- Remove from database.types.ts
- Remove from any actions files
- Remove from components

OPTION B: Start using the conversations table properly
- Migrate data from goal_conversations to conversations
- Update code to use conversations instead of goal_conversations

RECOMMENDED: Option A - Remove conversations table and code references
*/

-- =============================================================================
-- FINAL SUMMARY
-- =============================================================================
/*
ACTIONS TO TAKE:
1. ✅ DROP conversations table (empty, unused)
2. 🧹 VACUUM the 3 active tables (remove dead rows)
3. 🔧 Remove 'conversations' references from TypeScript code
4. ✅ Keep all other tables and views (they're working!)

RESULT: Cleaner, faster database with no unused tables
*/