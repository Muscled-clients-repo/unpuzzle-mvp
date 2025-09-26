-- Part 2: Clean up dead rows (run AFTER dropping conversations table)
-- Run each command separately, one at a time

VACUUM FULL goal_conversations;

VACUUM FULL conversation_messages;

VACUUM FULL conversation_attachments;