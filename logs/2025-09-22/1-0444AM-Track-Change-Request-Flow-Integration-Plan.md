# Track Change Request Flow Integration Plan

## Current System Analysis

### Existing Track & Goal Assignment Flow
1. **Track Selection** → Student chooses agency or SaaS track
2. **Questionnaire** → Detailed questionnaire about experience, skills, goals (`/student/track-selection/questionnaire?track=agency`)
3. **Conversation Creation** → `submitQuestionnaire()` creates `goal_conversation` with status `pending_instructor_review`
4. **Instructor Review** → Instructor views `instructor_review_queue` and reviews questionnaire responses
5. **Goal Assignment** → Instructor assigns specific goal from track progression and sets status to `active`
6. **Learning Journey** → Student works on courses related to assigned goal

### Track Goal Progressions
- **Agency Track**: $1k → $5k → $10k → $20k → $50k → $100k → $250k → $500k (total revenue)
- **SaaS Track**: $1k → $3k → $5k → $10k → $20k (Monthly Recurring Revenue)

### Current Implementation Status
✅ **Implemented**:
- Basic requests table for bug reports, features, track changes, refunds
- Student track change request creation
- Instructor requests management page
- Simple track selection page showing current + alternative track

## Track Change Flow Complexity

### Key Challenges
1. **Goal Progress Preservation** - What happens to current goal progress?
2. **Questionnaire Requirement** - New track needs new questionnaire responses
3. **Multiple Approval Stages** - Track change approval + goal assignment approval
4. **Conversation Management** - Current conversation status vs new conversation
5. **Learning History** - Preserving completed courses/progress from previous track

### Proposed Track Change Workflow

#### Phase 1: Track Change Request (✅ Current Implementation)
1. Student requests track change via `/student/track-selection`
2. Creates `requests` entry with `request_type: 'track_change'`
3. Instructor reviews in `/instructor/requests`

#### Phase 2: Enhanced Track Change Flow (To Implement)
1. **Request Approval** → Instructor approves track change request
2. **Questionnaire Trigger** → System redirects student to new questionnaire
3. **New Goal Conversation** → Create new `goal_conversation` for new track
4. **Instructor Goal Assignment** → Instructor assigns appropriate goal from new track
5. **Conversation Transition** → Archive old conversation, activate new one

## Implementation Strategy

### Database Schema Enhancements

#### Track Change Request Metadata
```sql
-- Enhance requests table metadata for track changes
{
  "current_track": "Agency Services",
  "current_track_id": "uuid",
  "desired_track": "SaaS Development",
  "desired_track_id": "uuid",
  "current_goal_conversation_id": "uuid", -- Link to existing conversation
  "questionnaire_completed": false,
  "new_conversation_id": null -- Will be set after questionnaire
}
```

#### Goal Conversation Enhancement
```sql
-- Add track change context to goal_conversations
ALTER TABLE goal_conversations
ADD COLUMN previous_conversation_id UUID REFERENCES goal_conversations(id),
ADD COLUMN track_change_request_id UUID REFERENCES requests(id),
ADD COLUMN transition_type TEXT CHECK (transition_type IN ('initial', 'track_change', 'goal_upgrade'));
```

### Server Actions Required

#### 1. Enhanced Request Actions
```typescript
// src/lib/actions/request-actions.ts
export async function approveTrackChangeRequest(requestId: string, approvalNotes?: string)
export async function triggerTrackChangeQuestionnaire(requestId: string)
export async function completeTrackChange(requestId: string, newConversationId: string)
```

#### 2. Track Transition Actions
```typescript
// src/lib/actions/track-transition-actions.ts
export async function initializeTrackTransition(requestId: string)
export async function createTransitionConversation(requestId: string, questionnaireResponses: any)
export async function finalizeTrackTransition(oldConversationId: string, newConversationId: string)
```

### UI Flow Enhancements

#### 1. Instructor Request Management
- Add "Approve Track Change" action for track change requests
- Show current goal progress and conversation context
- Option to add approval notes/guidance

#### 2. Student Track Change Journey
- Status indicator showing track change progress:
  - Requested → Approved → Questionnaire → Pending Assignment → Active
- Clear messaging about questionnaire requirement
- Progress preservation visibility

#### 3. Questionnaire Integration
- Modify questionnaire to handle track change context
- Show previous track information for comparison
- Save responses linked to track change request

### Conversation Management Strategy

#### Option A: Archive & Create New (Recommended)
1. Set old conversation status to `archived_track_change`
2. Create new conversation with `pending_instructor_review`
3. Link conversations via `previous_conversation_id`
4. Preserve access to old conversation for reference

#### Option B: Update Existing Conversation
1. Update existing conversation's `track_type`
2. Add transition message explaining track change
3. Reset to `pending_instructor_review` status
4. May lose track-specific context

### Data Migration Considerations

#### Preserving Learning Progress
- Courses completed in previous track remain in history
- Skills gained transfer to new track context
- Goal achievements become "previous track achievements"
- Analytics maintain continuity across track change

#### Progress Metrics
- Track completion percentage resets for new track
- Overall learning hours/engagement preserved
- Previous goal progress archived but visible
- New goal starts from appropriate level based on questionnaire

## Implementation Phases

### Phase 1: Enhanced Request Management ✅
- ✅ Basic track change requests
- ✅ Instructor approval interface
- 🔄 Add approval workflow with questionnaire trigger

### Phase 2: Questionnaire Integration
- Modify questionnaire to handle track change context
- Create new goal conversation linked to track change request
- Implement conversation archival system

### Phase 3: Instructor Goal Assignment
- Enhanced instructor review for track change questionnaires
- Goal assignment with track change context
- Conversation activation and transition

### Phase 4: Student Experience Polish
- Track change status dashboard
- Progress preservation visualization
- Clear messaging throughout process

## Success Criteria

### Functional Requirements
- Students can successfully request and complete track changes
- No data loss during track transitions
- Instructors have full context for goal assignment decisions
- Learning progress preservation across tracks

### User Experience Requirements
- Clear status communication throughout process
- Minimal friction for legitimate track changes
- Proper expectation setting about questionnaire requirement
- Smooth transition without confusion

### Technical Requirements
- Database integrity during transitions
- Performant queries for track change history
- Proper error handling for edge cases
- Comprehensive logging for debugging

## Risk Mitigation

### Data Integrity Risks
- **Risk**: Lost conversation history during transition
- **Mitigation**: Archive rather than delete old conversations

### User Experience Risks
- **Risk**: Confusion about questionnaire requirement
- **Mitigation**: Clear messaging and progress indicators

### Instructor Workflow Risks
- **Risk**: Overwhelming review queue with track changes
- **Mitigation**: Separate track change reviews from initial assignments

### System Performance Risks
- **Risk**: Complex queries for transition data
- **Mitigation**: Proper indexing and query optimization

## Open Questions

1. **Should track changes have limits?** (e.g., max 1 per 6 months)
2. **Auto-approval criteria?** (e.g., early stage students)
3. **Goal level assignment?** (start at beginning vs assess based on previous progress)
4. **Course access?** (retain access to previous track courses?)
5. **Notification system?** (email notifications for track change steps)

## Next Steps

1. Enhance request approval workflow with questionnaire trigger
2. Implement conversation archival and linking system
3. Modify questionnaire for track change context
4. Build instructor track change review interface
5. Add student track change status dashboard