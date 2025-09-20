# Quiz Storage Database Implementation & Cleanup Plan

## 🎯 Current Status
- **Issue**: Quiz dropdown shows no results after completion
- **Root Cause**: Quiz results exist in memory but not linked to activities properly
- **Solution**: Implement database storage for quiz attempts similar to reflections system

## 🗄️ Database Schema Design

### New Table: `quiz_attempts`
```sql
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  video_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  video_timestamp DECIMAL NOT NULL,

  -- Quiz content and results
  questions JSONB NOT NULL, -- Array of question objects with options, correct answers, explanations
  user_answers JSONB NOT NULL, -- Array of user's selected answers (indices)
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL NOT NULL,

  -- Timing data for analytics
  quiz_duration_seconds INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_quiz_attempts_user_video ON quiz_attempts(user_id, video_id);
CREATE INDEX idx_quiz_attempts_course ON quiz_attempts(course_id);
CREATE INDEX idx_quiz_attempts_timestamp ON quiz_attempts(video_timestamp);
```

### Existing Table: `reflections` (Keep as-is)
- Already handles voice memos, screenshots, loom links, text reflections
- Working well with current reflection system

## 🏗️ Implementation Plan

### Phase 1: Database Setup
1. **Create Migration File**
   - Add quiz_attempts table
   - Add necessary indexes
   - Test migration on dev database

2. **Create Database Actions**
   - `src/app/actions/quiz-actions.ts`
   - `submitQuizAttemptAction()` - Save quiz attempt to DB
   - `getQuizAttemptsAction()` - Load quiz history for video

### Phase 2: State Machine Integration
3. **Update Quiz Completion Flow**
   - Modify state machine to call `submitQuizAttemptAction()` when quiz completes
   - Include all quiz data: questions, answers, score, timing
   - Maintain backward compatibility with existing quiz flow

4. **Create Quiz Query Hook**
   - `src/hooks/use-quiz-attempts-query.ts`
   - Similar to `use-reflections-query.ts`
   - Cache quiz attempts per video/course

### Phase 3: UI Integration
5. **Update Activity List Logic**
   - Load quiz attempts from database on page load
   - Create activities from DB records instead of messages
   - Link dropdown content to specific quiz attempt records

6. **Fix Dropdown Content Display**
   - Show quiz questions, user answers, and explanations
   - Format score and percentage display
   - Include completion timestamp

### Phase 4: Cleanup Current Implementation
7. **Remove Redundant Message Logic**
   - Clean up timestamp proximity searches
   - Remove unused quiz result message handling
   - Simplify dropdown content lookup

8. **Update Message Filtering**
   - Keep quiz-question messages for active quiz interaction
   - Remove quiz-result message creation (replaced by DB storage)
   - Maintain clean separation between active quiz and quiz history

## 🔄 Data Flow Architecture

### Before (Current - Broken)
```
Quiz Complete → Quiz-Result Message → Activity List → Dropdown (No Content)
```

### After (Database-Driven)
```
Quiz Complete → Save to DB → Load Quiz History → Activity List → Dropdown (DB Content)
```

## 📊 Benefits

### Immediate Fixes
- ✅ Quiz dropdowns show proper results
- ✅ Content isolation per quiz attempt
- ✅ No countdown message contamination
- ✅ Persistent quiz history

### Long-term Analytics
- 📈 Learn rate calculation (quizzes per time period)
- 📈 Execution rate tracking (score trends)
- 📈 Execution pace analysis (time between attempts)
- 📈 Knowledge retention insights
- 📈 Student dashboard analytics

## 🧹 Cleanup Tasks

### Message System Cleanup
1. **Remove Unused Code**
   - Remove quiz-result message type handling in activities
   - Clean up timestamp proximity logic
   - Remove debug console logs

2. **Simplify Content Lookup**
   - Replace complex message relationship logic with direct DB queries
   - Remove `linkedMessageId` dependency for quiz content
   - Keep explicit relationships only for active quiz interaction

### Performance Optimizations
3. **Database Queries**
   - Efficient indexing on user_id + video_id
   - Batch loading of quiz attempts
   - Proper caching with TanStack Query

4. **Memory Management**
   - Reduce in-memory message storage for quiz results
   - Clean up unused message state
   - Optimize component re-renders

## 🎯 Success Criteria

### Functional Requirements
- [ ] Quiz dropdowns show complete results after completion
- [ ] Multiple quiz attempts display independently
- [ ] Quiz history persists across page refreshes
- [ ] No content mixing between different quiz attempts

### Performance Requirements
- [ ] Sub-100ms dropdown content loading
- [ ] Efficient database queries
- [ ] Clean memory usage

### Analytics Requirements
- [ ] All quiz data captured for analytics
- [ ] Timestamp accuracy for pace calculation
- [ ] Score trends trackable over time

## 🚀 Implementation Notes

### Following Existing Patterns
- Mirror the reflection system architecture (`reflection-actions.ts`, `use-reflections-query.ts`)
- Use TanStack Query for caching and state management
- Maintain 3-Layer SSOT architecture principles

### Backward Compatibility
- Keep existing quiz interaction flow unchanged
- Maintain quiz-question message handling for active quizzes
- Preserve AI streaming and question generation

### Error Handling
- Graceful fallback if DB save fails
- Retry logic for quiz submission
- User feedback for save status

---

**Ready for Implementation**: This plan provides a clear path to fix the quiz dropdown issue while establishing robust quiz analytics foundation.