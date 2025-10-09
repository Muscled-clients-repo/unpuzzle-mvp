-- Allow instructors to update revenue submission messages in their assigned conversations
-- This is needed for approving/rejecting revenue submissions

CREATE POLICY "Instructors can update revenue submissions in assigned conversations"
ON conversation_messages
FOR UPDATE
TO public
USING (
  message_type = 'revenue_submission' 
  AND EXISTS (
    SELECT 1 
    FROM goal_conversations gc 
    WHERE gc.id = conversation_messages.conversation_id 
    AND gc.instructor_id = auth.uid()
  )
)
WITH CHECK (
  message_type = 'revenue_submission'
  AND EXISTS (
    SELECT 1 
    FROM goal_conversations gc 
    WHERE gc.id = conversation_messages.conversation_id 
    AND gc.instructor_id = auth.uid()
  )
);
