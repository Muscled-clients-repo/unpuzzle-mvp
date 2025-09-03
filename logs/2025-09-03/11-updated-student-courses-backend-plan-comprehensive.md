# Updated Student Courses Backend Plan - Comprehensive Mock Data Replacement

**Date:** September 3, 2025  
**Route:** `/student/courses`  
**Updated Scope:** Complete mock data architecture replacement  
**Timeline:** 4-5 days (vs original 1-2 days estimate)  
**Principle:** UI Preservation with Full Mock System Replacement

---

## 🚨 **Critical Scope Update**

**Original Assessment:** Simple course data with basic progress  
**Actual Reality:** Complete learning analytics system with extensive mock data

Based on `/logs/2025-09-01/8-Mock-Data-Architecture-Analysis.md`, the `/student/courses` page is not just displaying course lists - it's a **comprehensive learning analytics dashboard** with complex mock data systems.

---

## 📊 **Complete Mock Data Analysis**

### **Mock Data Sources Requiring Replacement**

#### **1. Comprehensive Progress Tracking System**
```typescript
// Current mock in /src/app/student/courses/page.tsx:52-87
const mockProgressData = {
  "course-1": {
    progress: 35,                           // Requires video completion calculation
    lastAccessed: "2 hours ago",          // Requires timestamp formatting
    completedLessons: 2,                   // Requires video completion count
    totalLessons: 5,                       // Requires course video count
    currentLesson: "JavaScript Basics",    // Requires current position tracking
    estimatedTimeLeft: "3.5 hours",       // Requires remaining duration calculation
    aiInteractionsUsed: 15,                // Requires AI interaction counting
    strugglingTopics: ["CSS Grid", "Flexbox"], // Requires difficulty analysis
    nextMilestone: "Complete Module 2"     // Requires progress milestone tracking
  }
  // Mock data for course-2, course-3...
}
```

#### **2. Hardcoded Learning Statistics**
```typescript
// Lines 335, 349, 363 in page.tsx
<p className="text-2xl font-bold">6</p>      // Lessons Completed - hardcoded
<p className="text-2xl font-bold">45</p>     // AI Interactions - hardcoded  
<p className="text-2xl font-bold">12.5h</p>  // Total Study Time - hardcoded
```

#### **3. Mock Course Enrollment Data**
Based on analysis: Student courses page uses mock course enrollment system with:
- Artificial enrollment relationships
- Fake progress percentages
- Mock AI interaction histories
- Simulated learning difficulty patterns

#### **4. Mock Learning Analytics Features**
- **AI Insights Panel:** Struggling topics identification, interaction counting
- **Progress Bars:** Visual completion percentages based on mock data
- **Time Estimates:** Remaining study time calculations from mock progress
- **Learning Milestones:** Next achievement targets from mock progression

---

## 🗄️ **Comprehensive Database Schema**

### **Complete Learning Analytics Tables**

```sql
-- Migration: 20250903_01_comprehensive_student_learning_system.sql
-- Purpose: Replace entire mock learning analytics system with real database

-- Extended user profiles for learning preferences
CREATE TABLE user_learning_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  learning_style TEXT DEFAULT 'visual', -- visual, auditory, kinesthetic
  preferred_pace TEXT DEFAULT 'medium', -- slow, medium, fast
  study_goals JSONB DEFAULT '{}',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses table (enhanced for analytics)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  instructor_name TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  total_duration_minutes INTEGER NOT NULL, -- Store as minutes for calculations
  total_duration_formatted TEXT, -- "12.5 hours" for UI
  total_lessons INTEGER DEFAULT 0,
  estimated_completion_hours DECIMAL(4,1), -- For time estimates
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course videos with detailed metadata
CREATE TABLE course_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL, -- Store as minutes
  duration_formatted TEXT, -- "25 minutes" for UI
  sequence_order INTEGER NOT NULL,
  video_url TEXT,
  transcript_text TEXT, -- For AI context
  key_concepts TEXT[], -- Array of concepts for difficulty tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(course_id, sequence_order)
);

-- Student enrollments with comprehensive tracking
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Enrollment metadata
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  target_completion_date DATE,
  learning_goal TEXT,
  
  -- Progress summary (calculated fields for performance)
  total_videos INTEGER DEFAULT 0, -- Cached from course
  completed_videos INTEGER DEFAULT 0,
  progress_percent INTEGER DEFAULT 0, -- Calculated: (completed/total) * 100
  
  -- Current position tracking  
  current_video_id UUID REFERENCES course_videos(id),
  current_video_position_seconds INTEGER DEFAULT 0,
  current_lesson_title TEXT DEFAULT 'Not started',
  
  -- Time tracking
  total_watch_time_minutes INTEGER DEFAULT 0,
  estimated_time_remaining_minutes INTEGER,
  estimated_time_remaining_formatted TEXT, -- "3.5 hours"
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Completion tracking
  completed_at TIMESTAMPTZ,
  completion_certificate_url TEXT,
  
  UNIQUE(user_id, course_id)
);

-- Detailed video progress tracking
CREATE TABLE video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  video_id UUID REFERENCES course_videos(id) ON DELETE CASCADE,
  
  -- Progress tracking
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  last_position_seconds INTEGER DEFAULT 0,
  max_position_reached_seconds INTEGER DEFAULT 0,
  total_watch_time_seconds INTEGER DEFAULT 0,
  
  -- Engagement metrics
  pause_count INTEGER DEFAULT 0,
  rewind_count INTEGER DEFAULT 0,
  playback_speed DECIMAL(3,1) DEFAULT 1.0,
  
  -- Completion tracking
  first_started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, video_id)
);

-- AI interaction tracking (for aiInteractionsUsed)
CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  video_id UUID REFERENCES course_videos(id) ON DELETE CASCADE,
  
  -- Interaction details
  interaction_type TEXT CHECK (interaction_type IN ('hint', 'explanation', 'quiz', 'reflection', 'question')),
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  
  -- Context
  video_timestamp_seconds INTEGER, -- When in video this happened
  concepts_discussed TEXT[], -- Array of concepts
  
  -- Quality metrics
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  helpful BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning struggles and difficulties (for strugglingTopics)
CREATE TABLE learning_struggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  video_id UUID REFERENCES course_videos(id) ON DELETE CASCADE,
  
  -- Struggle identification
  concept_name TEXT NOT NULL,
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5), -- 1=slight, 5=major
  
  -- Evidence of struggle
  evidence_type TEXT CHECK (evidence_type IN ('multiple_rewinds', 'pause_duration', 'ai_help_requests', 'quiz_failures')),
  evidence_data JSONB, -- Store specific metrics
  
  -- Resolution tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'improving', 'resolved')),
  resolution_strategy TEXT, -- What helped resolve it
  
  -- Timestamps
  identified_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning milestones and achievements (for nextMilestone)
CREATE TABLE learning_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Milestone definition
  milestone_type TEXT CHECK (milestone_type IN ('module_completion', 'skill_mastery', 'time_goal', 'interaction_goal')),
  title TEXT NOT NULL, -- "Complete Module 2", "Master CSS Grid"
  description TEXT,
  target_value INTEGER, -- For measurable milestones
  current_value INTEGER DEFAULT 0,
  
  -- Progress tracking
  progress_percent INTEGER DEFAULT 0,
  is_achieved BOOLEAN DEFAULT FALSE,
  achieved_at TIMESTAMPTZ,
  
  -- Sequencing
  sequence_order INTEGER,
  prerequisite_milestone_id UUID REFERENCES learning_milestones(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated learning statistics (for performance)
CREATE TABLE user_learning_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Course statistics
  total_courses_enrolled INTEGER DEFAULT 0,
  active_courses_count INTEGER DEFAULT 0,
  completed_courses_count INTEGER DEFAULT 0,
  
  -- Learning progress
  total_videos_completed INTEGER DEFAULT 0,
  total_watch_time_minutes INTEGER DEFAULT 0,
  total_watch_time_formatted TEXT DEFAULT '0h', -- "12.5h"
  
  -- AI interaction stats
  total_ai_interactions INTEGER DEFAULT 0,
  ai_interactions_this_week INTEGER DEFAULT 0,
  
  -- Performance metrics
  average_completion_rate DECIMAL(5,2) DEFAULT 0.0, -- Percentage
  average_session_duration_minutes INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  current_streak_days INTEGER DEFAULT 0,
  
  -- Updated tracking
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_enrollments_user_progress ON enrollments(user_id, last_accessed_at DESC);
CREATE INDEX idx_video_progress_user_course ON video_progress(user_id, course_id);
CREATE INDEX idx_ai_interactions_user_course ON ai_interactions(user_id, course_id, created_at DESC);
CREATE INDEX idx_learning_struggles_active ON learning_struggles(user_id, course_id) WHERE status = 'active';
CREATE INDEX idx_learning_milestones_user_active ON learning_milestones(user_id, course_id) WHERE is_achieved = FALSE;

-- Row Level Security policies
ALTER TABLE user_learning_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own learning profile" ON user_learning_profiles FOR ALL USING (auth.uid() = user_id);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own enrollments" ON enrollments FOR ALL USING (auth.uid() = user_id);

ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own progress" ON video_progress FOR ALL USING (auth.uid() = user_id);

ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own AI interactions" ON ai_interactions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE learning_struggles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own struggles" ON learning_struggles FOR ALL USING (auth.uid() = user_id);

ALTER TABLE learning_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own milestones" ON learning_milestones FOR ALL USING (auth.uid() = user_id);

ALTER TABLE user_learning_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own stats" ON user_learning_stats FOR ALL USING (auth.uid() = user_id);

-- Public read access for course data
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view courses" ON courses FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE course_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view course videos" ON course_videos FOR SELECT USING (auth.role() = 'authenticated');
```

### **Database Triggers for Real-time Calculations**

```sql
-- Trigger to update enrollment progress when video progress changes
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_videos INTEGER;
  completed_videos INTEGER;
  new_progress INTEGER;
  remaining_time INTEGER;
BEGIN
  -- Get total videos for course
  SELECT total_lessons INTO total_videos
  FROM courses 
  WHERE id = NEW.course_id;
  
  -- Count completed videos for this enrollment
  SELECT COUNT(*) INTO completed_videos
  FROM video_progress 
  WHERE user_id = NEW.user_id 
    AND course_id = NEW.course_id 
    AND progress_percent = 100;
  
  -- Calculate progress percentage
  new_progress := CASE 
    WHEN total_videos > 0 THEN (completed_videos::DECIMAL / total_videos * 100)::INTEGER
    ELSE 0
  END;
  
  -- Update enrollment record
  UPDATE enrollments 
  SET 
    completed_videos = completed_videos,
    progress_percent = new_progress,
    estimated_time_remaining_minutes = GREATEST(0, total_videos - completed_videos) * 25, -- Assume 25min per video
    estimated_time_remaining_formatted = 
      CASE 
        WHEN GREATEST(0, total_videos - completed_videos) * 25 < 60 
        THEN GREATEST(0, total_videos - completed_videos) * 25 || ' minutes'
        ELSE ROUND((GREATEST(0, total_videos - completed_videos) * 25)::DECIMAL / 60, 1) || ' hours'
      END,
    last_accessed_at = NOW()
  WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_enrollment_progress
  AFTER INSERT OR UPDATE ON video_progress
  FOR EACH ROW EXECUTE FUNCTION update_enrollment_progress();

-- Trigger to update user learning stats
CREATE OR REPLACE FUNCTION update_user_learning_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_learning_stats (user_id, total_videos_completed, total_ai_interactions, updated_at)
  SELECT 
    NEW.user_id,
    (SELECT COUNT(*) FROM video_progress WHERE user_id = NEW.user_id AND progress_percent = 100),
    (SELECT COUNT(*) FROM ai_interactions WHERE user_id = NEW.user_id),
    NOW()
  ON CONFLICT (user_id) DO UPDATE SET
    total_videos_completed = EXCLUDED.total_videos_completed,
    total_ai_interactions = EXCLUDED.total_ai_interactions,
    updated_at = EXCLUDED.updated_at;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_stats_video
  AFTER INSERT OR UPDATE ON video_progress
  FOR EACH ROW EXECUTE FUNCTION update_user_learning_stats();

CREATE TRIGGER trigger_update_user_stats_ai
  AFTER INSERT OR UPDATE ON ai_interactions
  FOR EACH ROW EXECUTE FUNCTION update_user_learning_stats();
```

---

## 📡 **Advanced Service Layer Implementation**

### **Comprehensive Student Learning Service**

```typescript
// src/lib/services/student-learning.service.ts
import { supabase } from '@/lib/supabase/client'

export interface StudentCourseData {
  // Course basic info
  id: string
  title: string
  instructor: { name: string }
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration: string
  videos: { id: string; title: string; duration: string }[]
  
  // Real-time progress data (calculated from multiple tables)
  progress: number
  lastAccessed: string
  completedLessons: number
  totalLessons: number
  currentLesson: string
  estimatedTimeLeft: string
  
  // AI and learning analytics
  aiInteractionsUsed: number
  strugglingTopics: string[]
  nextMilestone: string
}

export interface LearningStatsData {
  activeCourses: number
  lessonsCompleted: number
  totalAiInteractions: number
  totalStudyTime: string
  currentStreak: number
  averageCompletionRate: number
}

/**
 * Get comprehensive student course data with real-time analytics
 * Replaces all mock data with calculated values from database
 */
export async function getStudentCoursesWithAnalytics(userId: string): Promise<StudentCourseData[]> {
  const { data: enrollmentData, error: enrollmentError } = await supabase
    .from('enrollments')
    .select(`
      *,
      courses (
        id,
        title,
        instructor_name,
        difficulty,
        total_duration_formatted,
        course_videos (
          id,
          title,
          duration_formatted,
          sequence_order
        )
      ),
      video_progress (
        video_id,
        progress_percent
      ),
      ai_interactions (
        id
      ),
      learning_struggles!inner (
        concept_name,
        status
      ),
      learning_milestones!inner (
        title,
        is_achieved
      )
    `)
    .eq('user_id', userId)
    .order('last_accessed_at', { ascending: false })

  if (enrollmentError) {
    console.error('Failed to load student courses:', enrollmentError)
    throw new Error('Failed to load your courses')
  }

  if (!enrollmentData) return []

  // Transform to UI format with real calculated data
  return Promise.all(
    enrollmentData.map(async (enrollment) => {
      // Get current video details
      const currentVideo = await getCurrentVideo(userId, enrollment.course_id)
      
      // Calculate struggling topics from active learning struggles
      const strugglingTopics = enrollment.learning_struggles
        .filter(struggle => struggle.status === 'active')
        .map(struggle => struggle.concept_name)
      
      // Get next unachieved milestone
      const nextMilestone = enrollment.learning_milestones
        .find(milestone => !milestone.is_achieved)?.title || 'Course complete!'
      
      return {
        id: enrollment.courses.id,
        title: enrollment.courses.title,
        instructor: { 
          name: enrollment.courses.instructor_name 
        },
        difficulty: enrollment.courses.difficulty as 'beginner' | 'intermediate' | 'advanced',
        duration: enrollment.courses.total_duration_formatted,
        videos: enrollment.courses.course_videos
          .sort((a, b) => a.sequence_order - b.sequence_order)
          .map(video => ({
            id: video.id,
            title: video.title,
            duration: video.duration_formatted
          })),
        
        // Real-time calculated progress data
        progress: enrollment.progress_percent,
        lastAccessed: formatTimeAgo(enrollment.last_accessed_at),
        completedLessons: enrollment.completed_videos,
        totalLessons: enrollment.total_videos,
        currentLesson: enrollment.current_lesson_title || currentVideo?.title || 'Not started',
        estimatedTimeLeft: enrollment.estimated_time_remaining_formatted || '0 minutes',
        
        // AI and analytics data
        aiInteractionsUsed: enrollment.ai_interactions.length,
        strugglingTopics: strugglingTopics.slice(0, 3), // Limit to 3 for UI
        nextMilestone: nextMilestone
      }
    })
  )
}

/**
 * Get current video for a user's course enrollment
 */
async function getCurrentVideo(userId: string, courseId: string) {
  const { data } = await supabase
    .from('video_progress')
    .select(`
      course_videos (
        id,
        title,
        sequence_order
      )
    `)
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .lt('progress_percent', 100)
    .order('course_videos(sequence_order)', { ascending: true })
    .limit(1)
    .single()
  
  return data?.course_videos
}

/**
 * Get comprehensive learning statistics
 * Replaces hardcoded stats with real calculations
 */
export async function getComprehensiveLearningStats(userId: string): Promise<LearningStatsData> {
  const { data: statsData, error } = await supabase
    .from('user_learning_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    // If no stats record exists, create one by calculating from raw data
    const stats = await calculateLearningStatsFromRaw(userId)
    return stats
  }

  return {
    activeCourses: statsData.active_courses_count,
    lessonsCompleted: statsData.total_videos_completed,
    totalAiInteractions: statsData.total_ai_interactions,
    totalStudyTime: statsData.total_watch_time_formatted,
    currentStreak: statsData.current_streak_days,
    averageCompletionRate: statsData.average_completion_rate
  }
}

/**
 * Calculate learning stats from raw data when aggregated stats don't exist
 */
async function calculateLearningStatsFromRaw(userId: string): Promise<LearningStatsData> {
  // Get active enrollments count
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .is('completed_at', null)

  // Get total completed videos
  const { data: completedVideos } = await supabase
    .from('video_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('progress_percent', 100)

  // Get total AI interactions
  const { data: aiInteractions } = await supabase
    .from('ai_interactions')
    .select('id')
    .eq('user_id', userId)

  // Calculate total watch time
  const { data: watchTimeData } = await supabase
    .from('video_progress')
    .select('total_watch_time_seconds')
    .eq('user_id', userId)

  const totalWatchTimeMinutes = watchTimeData?.reduce(
    (sum, record) => sum + (record.total_watch_time_seconds / 60), 
    0
  ) || 0

  const totalWatchTimeFormatted = totalWatchTimeMinutes < 60 
    ? `${Math.round(totalWatchTimeMinutes)}m`
    : `${(totalWatchTimeMinutes / 60).toFixed(1)}h`

  // Store calculated stats for future use
  await supabase
    .from('user_learning_stats')
    .upsert({
      user_id: userId,
      active_courses_count: enrollments?.length || 0,
      total_videos_completed: completedVideos?.length || 0,
      total_ai_interactions: aiInteractions?.length || 0,
      total_watch_time_minutes: totalWatchTimeMinutes,
      total_watch_time_formatted: totalWatchTimeFormatted,
      last_calculated_at: new Date().toISOString()
    })

  return {
    activeCourses: enrollments?.length || 0,
    lessonsCompleted: completedVideos?.length || 0,
    totalAiInteractions: aiInteractions?.length || 0,
    totalStudyTime: totalWatchTimeFormatted,
    currentStreak: 0, // Would need additional calculation
    averageCompletionRate: 0 // Would need additional calculation
  }
}

/**
 * Update video progress and trigger all related calculations
 * Called when student watches videos
 */
export async function updateVideoProgress(
  userId: string,
  courseId: string,
  videoId: string,
  progressPercent: number,
  currentPositionSeconds: number
) {
  // Update video progress
  const { error: progressError } = await supabase
    .from('video_progress')
    .upsert({
      user_id: userId,
      course_id: courseId,
      video_id: videoId,
      progress_percent: progressPercent,
      last_position_seconds: currentPositionSeconds,
      max_position_reached_seconds: Math.max(currentPositionSeconds, 0),
      updated_at: new Date().toISOString(),
      completed_at: progressPercent >= 100 ? new Date().toISOString() : null
    })

  if (progressError) {
    throw new Error('Failed to update video progress')
  }

  // If video completed, detect learning struggles
  if (progressPercent >= 100) {
    await detectLearningStruggles(userId, courseId, videoId)
  }

  // Update enrollment last accessed time
  await supabase
    .from('enrollments')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('course_id', courseId)

  // Database triggers will automatically update enrollment progress and user stats
}

/**
 * Record AI interaction for analytics
 */
export async function recordAIInteraction(
  userId: string,
  courseId: string,
  videoId: string,
  interactionType: string,
  prompt: string,
  response: string,
  videoTimestamp?: number
) {
  const { error } = await supabase
    .from('ai_interactions')
    .insert({
      user_id: userId,
      course_id: courseId,
      video_id: videoId,
      interaction_type: interactionType,
      prompt: prompt,
      response: response,
      video_timestamp_seconds: videoTimestamp
    })

  if (error) {
    console.error('Failed to record AI interaction:', error)
    // Don't throw - AI interaction recording shouldn't break user flow
  }
}

/**
 * Detect learning struggles based on user behavior
 * Called after video completion or multiple AI interactions
 */
async function detectLearningStruggles(userId: string, courseId: string, videoId: string) {
  // Get video progress data to analyze struggle patterns
  const { data: progressData } = await supabase
    .from('video_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('video_id', videoId)
    .single()

  if (!progressData) return

  // Get video concepts for struggle classification
  const { data: videoData } = await supabase
    .from('course_videos')
    .select('key_concepts')
    .eq('id', videoId)
    .single()

  const concepts = videoData?.key_concepts || []

  // Detect struggle patterns
  const struggles: string[] = []

  // Pattern 1: High rewind count indicates difficulty
  if (progressData.rewind_count > 5) {
    struggles.push(...concepts.slice(0, 2)) // Mark first 2 concepts as struggling
  }

  // Pattern 2: Low playback speed indicates difficulty
  if (progressData.playback_speed < 1.0) {
    struggles.push(...concepts.slice(0, 1)) // Mark first concept as struggling
  }

  // Pattern 3: High pause count indicates confusion
  if (progressData.pause_count > 10) {
    struggles.push(...concepts.slice(1, 2)) // Mark middle concepts as struggling
  }

  // Record identified struggles
  for (const concept of struggles) {
    await supabase
      .from('learning_struggles')
      .upsert({
        user_id: userId,
        course_id: courseId,
        video_id: videoId,
        concept_name: concept,
        difficulty_level: Math.min(progressData.rewind_count, 5), // 1-5 scale
        evidence_type: 'multiple_rewinds',
        evidence_data: {
          rewind_count: progressData.rewind_count,
          pause_count: progressData.pause_count,
          playback_speed: progressData.playback_speed
        }
      })
  }
}

/**
 * Format timestamp as human readable string
 * Matches UI expectations
 */
function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const past = new Date(timestamp)
  const diffMs = now.getTime() - past.getTime()
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`
  return `${Math.floor(diffDays / 7)} weeks ago`
}
```

---

## 🔌 **Enhanced Store Integration**

### **Complete Mock Data Replacement in Store**

```typescript
// src/stores/slices/student-course-slice.ts
import { 
  getStudentCoursesWithAnalytics,
  getComprehensiveLearningStats,
  updateVideoProgress,
  recordAIInteraction,
  StudentCourseData,
  LearningStatsData
} from '@/lib/services/student-learning.service'

export interface StudentCourseSlice {
  // Core data (replaces all mock data)
  enrolledCourses: StudentCourseData[] | null
  learningStats: LearningStatsData | null
  
  // Loading states
  loading: boolean
  statsLoading: boolean
  error: string | null
  
  // Actions for real backend integration
  loadEnrolledCourses: (userId: string) => Promise<void>
  loadLearningStats: (userId: string) => Promise<void>
  updateVideoProgress: (userId: string, courseId: string, videoId: string, progress: number, position: number) => Promise<void>
  recordAIInteraction: (userId: string, courseId: string, videoId: string, type: string, prompt: string, response: string) => Promise<void>
  refreshCourseData: (userId: string) => Promise<void>
  
  // Search and filtering (client-side)
  searchQuery: string
  setSearchQuery: (query: string) => void
  filterStatus: 'all' | 'in-progress' | 'completed'
  setFilterStatus: (status: 'all' | 'in-progress' | 'completed') => void
  
  // Computed selectors
  filteredCourses: StudentCourseData[]
  
  // Legacy compatibility (remove eventually)
  courseProgress: any
  loadCourseProgress: (userId: string, courseId: string) => Promise<void>
}

export const createStudentCourseSlice: StateCreator<
  AppStore,
  [],
  [],
  StudentCourseSlice
> = (set, get) => ({
  // Initial state
  enrolledCourses: null,
  learningStats: null,
  loading: false,
  statsLoading: false,
  error: null,
  searchQuery: '',
  filterStatus: 'all',
  courseProgress: null, // Legacy

  // Actions
  loadEnrolledCourses: async (userId: string) => {
    set({ loading: true, error: null })
    
    try {
      const courses = await getStudentCoursesWithAnalytics(userId)
      set({ 
        enrolledCourses: courses, 
        loading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load courses'
      set({ 
        error: errorMessage,
        loading: false 
      })
    }
  },

  loadLearningStats: async (userId: string) => {
    set({ statsLoading: true })
    
    try {
      const stats = await getComprehensiveLearningStats(userId)
      set({ 
        learningStats: stats,
        statsLoading: false
      })
    } catch (error) {
      console.error('Failed to load learning stats:', error)
      set({ statsLoading: false })
      // Don't set error for stats - not critical for main UI
    }
  },

  updateVideoProgress: async (userId: string, courseId: string, videoId: string, progress: number, position: number) => {
    try {
      await updateVideoProgress(userId, courseId, videoId, progress, position)
      
      // Refresh course data to reflect progress changes
      const { enrolledCourses } = get()
      if (enrolledCourses) {
        // Update local state optimistically
        const updatedCourses = enrolledCourses.map(course => {
          if (course.id === courseId) {
            const updatedVideos = course.videos.map(video => 
              video.id === videoId ? { ...video, progress } : video
            )
            const completedCount = updatedVideos.filter(v => v.progress >= 100).length
            const newProgress = Math.round((completedCount / updatedVideos.length) * 100)
            
            return {
              ...course,
              videos: updatedVideos,
              progress: newProgress,
              completedLessons: completedCount,
              lastAccessed: 'Just now'
            }
          }
          return course
        })
        
        set({ enrolledCourses: updatedCourses })
      }
      
      // Refresh stats
      await get().loadLearningStats(userId)
      
    } catch (error) {
      console.error('Failed to update video progress:', error)
      // Don't throw - let video player continue working
    }
  },

  recordAIInteraction: async (userId: string, courseId: string, videoId: string, type: string, prompt: string, response: string) => {
    try {
      await recordAIInteraction(userId, courseId, videoId, type, prompt, response)
      
      // Update local AI interaction count optimistically
      const { enrolledCourses } = get()
      if (enrolledCourses) {
        const updatedCourses = enrolledCourses.map(course => 
          course.id === courseId 
            ? { ...course, aiInteractionsUsed: course.aiInteractionsUsed + 1 }
            : course
        )
        set({ enrolledCourses: updatedCourses })
      }
      
    } catch (error) {
      console.error('Failed to record AI interaction:', error)
      // Don't throw - let AI chat continue working
    }
  },

  refreshCourseData: async (userId: string) => {
    // Refresh both courses and stats
    await Promise.all([
      get().loadEnrolledCourses(userId),
      get().loadLearningStats(userId)
    ])
  },

  // Search and filter methods
  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  setFilterStatus: (status: 'all' | 'in-progress' | 'completed') => {
    set({ filterStatus: status })
  },

  // Computed selector for filtered courses
  get filteredCourses() {
    const { enrolledCourses, searchQuery, filterStatus } = get()
    if (!enrolledCourses) return []
    
    let filtered = enrolledCourses
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(course => 
        course.title.toLowerCase().includes(query) ||
        course.instructor.name.toLowerCase().includes(query)
      )
    }
    
    // Apply status filter
    switch (filterStatus) {
      case 'in-progress':
        filtered = filtered.filter(course => course.progress > 0 && course.progress < 100)
        break
      case 'completed':
        filtered = filtered.filter(course => course.progress >= 100)
        break
      // 'all' shows everything
    }
    
    return filtered
  },

  // Legacy compatibility method
  loadCourseProgress: async (userId: string, courseId: string) => {
    // Progress is now loaded with courses, so this is a no-op
    // Keep method to avoid breaking existing UI calls
  }
})
```

---

## 🔄 **Complete UI Integration**

### **Updated Page Component with Real Data**

```typescript
// src/app/student/courses/page.tsx - Complete mock data replacement

"use client"
import { useEffect } from "react"
import { ErrorBoundary } from "@/components/common"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/stores/app-store"
import { useAuth } from "@/hooks/use-auth" // Use actual auth hook
import { LoadingSpinner } from "@/components/common"
import { ErrorFallback } from "@/components/common"
import { 
  BookOpen, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  Play,
  CheckCircle2,
  Search,
  Filter,
  Calendar,
  Target,
  Brain,
  Sparkles
} from "lucide-react"
import Link from "next/link"

export default function MyCoursesPage() {
  const {
    enrolledCourses,
    learningStats,
    loading,
    statsLoading,
    error,
    searchQuery,
    filterStatus,
    filteredCourses,
    loadEnrolledCourses,
    loadLearningStats,
    setSearchQuery,
    setFilterStatus
  } = useAppStore()
  
  // Get real authenticated user
  const { user } = useAuth()
  const userId = user?.id
  
  useEffect(() => {
    if (userId) {
      loadEnrolledCourses(userId)
      loadLearningStats(userId)
    }
  }, [userId, loadEnrolledCourses, loadLearningStats])
  
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorFallback error={error} />

  // Calculate tab counts from real data
  const totalCourses = enrolledCourses?.length || 0
  const inProgressCourses = enrolledCourses?.filter(c => c.progress > 0 && c.progress < 100).length || 0
  const completedCourses = enrolledCourses?.filter(c => c.progress >= 100).length || 0

  return (
    <ErrorBoundary>
      <div className="flex-1 p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Courses</h1>
          <p className="text-muted-foreground">
            Continue your learning journey with personalized AI assistance
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search your courses..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Course Tabs with Real Counts */}
        <Tabs value={filterStatus} onValueChange={setFilterStatus} className="mb-8">
          <TabsList>
            <TabsTrigger value="all">All Courses ({totalCourses})</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress ({inProgressCourses})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedCourses})</TabsTrigger>
          </TabsList>

          <TabsContent value={filterStatus} className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((course) => (
                <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Course Thumbnail */}
                  <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-purple-500/20">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-primary/40" />
                    </div>
                    {/* Real Progress Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                      <Progress value={course.progress} className="h-2" />
                      <p className="text-xs text-white mt-1">{course.progress}% Complete</p>
                    </div>
                  </div>

                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                        <CardDescription className="mt-1">
                          By {course.instructor.name}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {course.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Real Progress Data */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Current Lesson</span>
                        <span className="font-medium">{course.currentLesson}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Completed</span>
                        <span className="font-medium">{course.completedLessons}/{course.totalLessons} lessons</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Time left</span>
                        <span className="font-medium">{course.estimatedTimeLeft}</span>
                      </div>
                    </div>

                    {/* Real AI Insights */}
                    <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Sparkles className="h-4 w-4 text-primary" />
                        AI Insights
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">AI interactions used</span>
                          <span className="font-medium">{course.aiInteractionsUsed}</span>
                        </div>
                        
                        {course.strugglingTopics.length > 0 && (
                          <div className="flex items-start gap-2 text-xs">
                            <AlertCircle className="h-3 w-3 text-orange-500 mt-0.5" />
                            <div>
                              <span className="text-muted-foreground">Needs review: </span>
                              <span className="text-orange-600 dark:text-orange-400">
                                {course.strugglingTopics.join(", ")}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs">
                          <Target className="h-3 w-3 text-green-500" />
                          <span className="text-muted-foreground">Next: {course.nextMilestone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button asChild className="w-full">
                      <Link href={`/student/course/${course.id}/video/${course.videos?.[course.completedLessons]?.id || course.videos?.[0]?.id || '1'}`}>
                        <Play className="mr-2 h-4 w-4" />
                        Continue Learning
                      </Link>
                    </Button>

                    {/* Real Last Accessed Time */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Last accessed {course.lastAccessed}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add More Courses Card */}
              <Card className="border-dashed hover:border-primary transition-colors cursor-pointer">
                <Link href="/courses" className="flex h-full items-center justify-center p-12">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1">Explore More Courses</h3>
                    <p className="text-sm text-muted-foreground">
                      Discover new topics to learn
                    </p>
                  </div>
                </Link>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Real Learning Stats Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {statsLoading ? "..." : (learningStats?.activeCourses || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {statsLoading ? "..." : (learningStats?.lessonsCompleted || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Lessons Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {statsLoading ? "..." : (learningStats?.totalAiInteractions || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">AI Interactions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {statsLoading ? "..." : (learningStats?.totalStudyTime || "0h")}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Study Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  )
}
```

---

## 📅 **Gradual Implementation with Manual Verification**

> **⚠️ IMPORTANT: Get confirmation before proceeding to each step. Git commit after each checkpoint.**

### **Step 1: Core Database Tables (2-3 hours)**

#### **Implementation:**
1. Create basic tables: `courses`, `course_videos`, `enrollments`
2. Set up RLS policies for security
3. Insert minimal sample data (2-3 courses, 5-6 videos)

#### **Manual Verification Checkpoint 1:**
```bash
# Test basic queries in Supabase SQL Editor
SELECT * FROM courses;
SELECT * FROM course_videos WHERE course_id = 'course-1';
SELECT * FROM enrollments WHERE user_id = 'your-test-user-id';

# Verify RLS works - should return empty when not authenticated
SELECT * FROM enrollments; -- (run without auth context)
```

#### **Expected Results:**
- [ ] 3 courses appear in courses table
- [ ] 5-6 videos appear in course_videos table
- [ ] 1-2 test enrollments appear
- [ ] RLS blocks unauthorized access
- [ ] All foreign key relationships work

#### **Git Checkpoint:**
```bash
git add .
git commit -m "feat: Add core database tables for student courses

- Add courses, course_videos, enrollments tables
- Set up RLS policies for data security  
- Insert basic sample data for testing
- Verify foreign key relationships work

🤖 Generated with Claude Code"
```

**🛑 STOP HERE - WAIT FOR CONFIRMATION BEFORE CONTINUING**

---

### **Step 2: Progress Tracking Tables (2-3 hours)**

#### **Implementation:**
1. Add `video_progress` and `user_learning_stats` tables
2. Create basic triggers for progress calculation
3. Insert sample progress data

#### **Manual Verification Checkpoint 2:**
```bash
# Test progress queries
SELECT vp.*, cv.title 
FROM video_progress vp
JOIN course_videos cv ON vp.video_id = cv.id
WHERE vp.user_id = 'your-test-user-id';

# Test stats calculation
SELECT * FROM user_learning_stats WHERE user_id = 'your-test-user-id';

# Test trigger by updating progress
UPDATE video_progress 
SET progress_percent = 100 
WHERE user_id = 'your-test-user-id' AND video_id = 'some-video-id';

# Check if enrollment progress updated automatically
SELECT progress_percent, completed_videos 
FROM enrollments 
WHERE user_id = 'your-test-user-id';
```

#### **Expected Results:**
- [ ] Video progress records exist with realistic data
- [ ] User stats show calculated totals
- [ ] Updating video progress triggers enrollment update
- [ ] Progress percentages calculate correctly
- [ ] RLS policies work for new tables

#### **Git Checkpoint:**
```bash
git add .
git commit -m "feat: Add video progress tracking system

- Add video_progress table for granular tracking
- Add user_learning_stats for dashboard summaries  
- Create triggers for automatic progress calculation
- Insert sample progress data for testing

🤖 Generated with Claude Code"
```

**🛑 STOP HERE - WAIT FOR CONFIRMATION BEFORE CONTINUING**

---

### **Step 3: AI and Learning Analytics Tables (2-3 hours)**

#### **Implementation:**
1. Add `ai_interactions`, `learning_struggles`, `learning_milestones` tables
2. Insert sample AI interaction and struggle data
3. Test complex joins

#### **Manual Verification Checkpoint 3:**
```bash
# Test AI interactions query
SELECT 
  ai.interaction_type,
  ai.created_at,
  cv.title as video_title
FROM ai_interactions ai
JOIN course_videos cv ON ai.video_id = cv.id
WHERE ai.user_id = 'your-test-user-id'
ORDER BY ai.created_at DESC;

# Test struggling topics query
SELECT DISTINCT concept_name 
FROM learning_struggles 
WHERE user_id = 'your-test-user-id' AND status = 'active';

# Test milestone progress
SELECT title, progress_percent, is_achieved
FROM learning_milestones 
WHERE user_id = 'your-test-user-id'
ORDER BY sequence_order;

# Test the complex join for UI data
SELECT 
  e.*,
  c.title,
  c.instructor_name,
  COUNT(ai.id) as ai_count,
  ARRAY_AGG(DISTINCT ls.concept_name) FILTER (WHERE ls.status = 'active') as struggling_topics
FROM enrollments e
JOIN courses c ON e.course_id = c.id
LEFT JOIN ai_interactions ai ON ai.user_id = e.user_id AND ai.course_id = e.course_id
LEFT JOIN learning_struggles ls ON ls.user_id = e.user_id AND ls.course_id = e.course_id
WHERE e.user_id = 'your-test-user-id'
GROUP BY e.id, c.id;
```

#### **Expected Results:**
- [ ] AI interactions show with video context
- [ ] Struggling topics array populated
- [ ] Milestones show progress tracking
- [ ] Complex join returns UI-ready data format
- [ ] Performance under 200ms for complex query

#### **Git Checkpoint:**
```bash
git add .
git commit -m "feat: Add AI interactions and learning analytics

- Add ai_interactions table for chat tracking
- Add learning_struggles for difficulty detection  
- Add learning_milestones for achievement tracking
- Insert sample analytics data for testing
- Verify complex joins for UI queries

🤖 Generated with Claude Code"
```

**🛑 STOP HERE - WAIT FOR CONFIRMATION BEFORE CONTINUING**

---

### **Step 4: Basic Service Layer (3-4 hours)**

#### **Implementation:**
1. Create `student-learning.service.ts` with basic functions
2. Implement `getStudentCoursesWithAnalytics()` function
3. Add proper error handling

#### **Manual Verification Checkpoint 4:**
```typescript
// Test in browser console or create test script
// src/test-service.ts

import { getStudentCoursesWithAnalytics } from '@/lib/services/student-learning.service'

async function testService() {
  try {
    const courses = await getStudentCoursesWithAnalytics('your-test-user-id')
    console.log('Courses loaded:', courses.length)
    console.log('First course:', courses[0])
    console.log('Progress data:', {
      progress: courses[0].progress,
      completedLessons: courses[0].completedLessons,
      totalLessons: courses[0].totalLessons,
      aiInteractionsUsed: courses[0].aiInteractionsUsed,
      strugglingTopics: courses[0].strugglingTopics,
      nextMilestone: courses[0].nextMilestone
    })
  } catch (error) {
    console.error('Service test failed:', error)
  }
}

testService()
```

#### **Expected Results:**
- [ ] Service returns array of courses with progress data
- [ ] All progress fields populated with real calculated values
- [ ] AI interactions count matches database
- [ ] Struggling topics array contains actual topics
- [ ] Next milestone shows realistic value
- [ ] Error handling works for invalid user IDs

#### **Git Checkpoint:**
```bash
git add .
git commit -m "feat: Implement basic student learning service

- Create student-learning.service.ts with core functions
- Implement getStudentCoursesWithAnalytics() with complex queries
- Add proper TypeScript interfaces matching UI expectations
- Include error handling and data transformation
- Test service functions with sample data

🤖 Generated with Claude Code"
```

**🛑 STOP HERE - WAIT FOR CONFIRMATION BEFORE CONTINUING**

---

### **Step 5: Store Integration (2-3 hours)**

#### **Implementation:**
1. Update `student-course-slice.ts` to use real service
2. Replace mock data logic with service calls
3. Test store actions in browser dev tools

#### **Manual Verification Checkpoint 5:**
```javascript
// Test in browser dev tools console
// Open /student/courses page and run:

// Check store state
console.log('Store state:', useAppStore.getState())

// Test loading courses
await useAppStore.getState().loadEnrolledCourses('your-test-user-id')
console.log('Enrolled courses:', useAppStore.getState().enrolledCourses)

// Test loading stats  
await useAppStore.getState().loadLearningStats('your-test-user-id')
console.log('Learning stats:', useAppStore.getState().learningStats)

// Verify no mock data remains
console.log('Should be null:', useAppStore.getState().courseProgress) // Legacy field
```

#### **Expected Results:**
- [ ] Store loads real course data from service
- [ ] Learning stats show calculated values
- [ ] No mock data or hardcoded values in store
- [ ] Loading and error states work correctly
- [ ] Store state matches UI data requirements

#### **Git Checkpoint:**
```bash
git add .
git commit -m "feat: Integrate real backend service with store

- Update student-course-slice to use student-learning.service
- Replace all mock data logic with real service calls
- Add proper loading and error state management
- Remove legacy mock data references
- Test store integration with browser dev tools

🤖 Generated with Claude Code"
```

**🛑 STOP HERE - WAIT FOR CONFIRMATION BEFORE CONTINUING**

---

### **Step 6: UI Integration - Phase 1 (2 hours)**

#### **Implementation:**
1. Update page component to use real auth and remove hardcoded user ID
2. Connect real data to course cards
3. Keep stats section with "..." loading for now

#### **Manual Verification Checkpoint 6:**
```bash
# Visual verification in browser:
# Navigate to /student/courses

# Check these elements show real data:
# 1. Course cards display actual course titles from database
# 2. Progress bars show calculated percentages 
# 3. "Last accessed" shows formatted timestamps
# 4. AI interactions count shows real numbers
# 5. Struggling topics show actual topics (if any)
# 6. "Continue Learning" links work

# Check browser dev tools Network tab:
# - Should see real Supabase queries
# - No 404s or failed requests
# - Query responses contain expected data structure

# Check browser console:
# - No error messages
# - No warnings about missing data
# - Service calls succeed
```

#### **Expected Results:**
- [ ] Page loads with real authenticated user
- [ ] Course cards show database course data
- [ ] Progress bars reflect actual completion percentages
- [ ] AI interactions display real counts
- [ ] Last accessed times show formatted timestamps
- [ ] No console errors or network failures

#### **Git Checkpoint:**
```bash
git add .
git commit -m "feat: Connect UI to real backend data - Phase 1

- Update student courses page to use authenticated user
- Connect course cards to real database via store
- Display actual progress data and AI interactions
- Remove hardcoded user ID and mock progress data
- Verify real data displays correctly in UI

🤖 Generated with Claude Code"
```

**🛑 STOP HERE - WAIT FOR CONFIRMATION BEFORE CONTINUING**

---

### **Step 7: UI Integration - Phase 2 (2 hours)**

#### **Implementation:**
1. Replace hardcoded stats with real `learningStats` data
2. Implement search and filtering with real data
3. Test tab counts with actual course states

#### **Manual Verification Checkpoint 7:**
```bash
# Visual verification in browser:
# Navigate to /student/courses

# Test learning stats section (bottom cards):
# 1. "Active Courses" shows actual enrolled count
# 2. "Lessons Completed" shows real completion count  
# 3. "AI Interactions" shows total interaction count
# 4. "Total Study Time" shows calculated time

# Test search functionality:
# 1. Type in search box - courses filter correctly
# 2. Search by instructor name works
# 3. Search by partial course title works

# Test tab filtering:
# 1. "All Courses" tab shows correct count in parentheses
# 2. "In Progress" tab shows courses with 1-99% progress
# 3. "Completed" tab shows courses with 100% progress
# 4. Tab counts match actual data

# Performance test:
# - Page loads under 2 seconds
# - Search filtering is instant
# - Tab switching is smooth
```

#### **Expected Results:**
- [ ] Stats cards show real calculated numbers
- [ ] Search filters courses correctly by title and instructor
- [ ] Tab counts reflect actual course completion states
- [ ] Tab filtering works with real progress percentages
- [ ] Page performance remains good with real data
- [ ] All interactions feel responsive

#### **Git Checkpoint:**
```bash
git add .
git commit -m "feat: Complete UI integration with real backend

- Replace hardcoded learning stats with calculated values
- Implement working search and filtering with real data
- Connect tab counts to actual course completion states
- Verify all UI interactions work with backend data
- Maintain good performance with real queries

🤖 Generated with Claude Code"
```

**🛑 STOP HERE - WAIT FOR CONFIRMATION BEFORE CONTINUING**

---

### **Step 8: Advanced Features (3-4 hours)**

#### **Implementation:**
1. Add `updateVideoProgress()` and `recordAIInteraction()` functions
2. Implement real-time progress updates
3. Add learning struggle detection

#### **Manual Verification Checkpoint 8:**
```javascript
// Test progress updates in browser console:
// Navigate to /student/course/[id]/video/[videoId] page (or simulate)

// Test video progress update
await useAppStore.getState().updateVideoProgress(
  'your-user-id', 
  'course-1', 
  'video-1', 
  75, // 75% progress
  1800 // 30 minutes in seconds
)

// Check database was updated
// In Supabase SQL Editor:
SELECT progress_percent, last_position_seconds 
FROM video_progress 
WHERE user_id = 'your-user-id' AND video_id = 'video-1';

SELECT progress_percent, completed_videos
FROM enrollments 
WHERE user_id = 'your-user-id' AND course_id = 'course-1';

// Test AI interaction recording
await useAppStore.getState().recordAIInteraction(
  'your-user-id',
  'course-1', 
  'video-1',
  'hint',
  'How does CSS flexbox work?',
  'Flexbox is a layout method that...'
)

// Check AI interaction was recorded
SELECT * FROM ai_interactions 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC LIMIT 1;

// Navigate back to /student/courses and verify:
// - Course progress updated
// - AI interaction count increased
// - Learning stats reflect changes
```

#### **Expected Results:**
- [ ] Video progress updates trigger enrollment progress recalculation
- [ ] AI interactions are recorded with proper context
- [ ] Course cards reflect updated progress immediately
- [ ] Learning stats update after progress changes
- [ ] Database triggers calculate derived values correctly

#### **Git Checkpoint:**
```bash
git add .
git commit -m "feat: Add real-time progress tracking and AI recording

- Implement updateVideoProgress() with automatic recalculation
- Add recordAIInteraction() for analytics tracking
- Create learning struggle detection based on user behavior
- Test real-time updates with database triggers
- Verify derived calculations work correctly

🤖 Generated with Claude Code"
```

**🛑 STOP HERE - WAIT FOR CONFIRMATION BEFORE CONTINUING**

---

### **Step 9: Performance Optimization and Final Testing (2-3 hours)**

#### **Implementation:**
1. Add database indexes for performance
2. Optimize complex queries
3. Add error boundaries and loading states
4. Complete end-to-end testing

#### **Manual Verification Checkpoint 9:**
```bash
# Performance testing:
# 1. Open browser dev tools Network tab
# 2. Navigate to /student/courses
# 3. Check query performance:

# Expected query times:
# - Course loading: < 300ms
# - Stats loading: < 200ms  
# - Search filtering: < 50ms (client-side)
# - Tab switching: < 50ms (client-side)

# Load testing with multiple courses:
# Insert 10+ courses with 5+ videos each in database
# Add 50+ progress records
# Add 100+ AI interactions
# Verify page still loads quickly

# Error handling testing:
# 1. Temporarily break database connection
# 2. Verify error states show gracefully
# 3. Test network timeout scenarios
# 4. Verify error recovery works

# Browser compatibility:
# Test in Chrome, Firefox, Safari
# Test responsive design on mobile
# Verify all interactions work on touch devices
```

#### **Expected Results:**
- [ ] Course loading completes under 300ms
- [ ] Page remains responsive with large datasets
- [ ] Error states display helpful messages
- [ ] Error recovery works without page refresh
- [ ] Mobile responsiveness maintained
- [ ] No memory leaks or performance degradation

#### **Git Checkpoint:**
```bash
git add .
git commit -m "feat: Optimize performance and complete testing

- Add database indexes for query optimization
- Optimize complex analytics queries for speed
- Add comprehensive error handling and recovery
- Test with large datasets and various scenarios
- Verify mobile responsiveness and browser compatibility

🤖 Generated with Claude Code"
```

**🛑 STOP HERE - WAIT FOR CONFIRMATION BEFORE CONTINUING**

---

### **Step 10: Documentation and Cleanup (1-2 hours)**

#### **Implementation:**
1. Remove all mock data imports and references
2. Update documentation
3. Clean up console.log statements
4. Final verification

#### **Manual Verification Checkpoint 10:**
```bash
# Code cleanup verification:
grep -r "mock" src/app/student/courses/
grep -r "Mock" src/app/student/courses/
grep -r "hardcoded" src/app/student/courses/
grep -r "TODO" src/app/student/courses/
grep -r "console.log" src/app/student/courses/

# Expected: No results or only legitimate references

# Final functionality test:
# 1. Fresh browser session (clear cache)
# 2. Login as test user
# 3. Navigate to /student/courses
# 4. Verify all features work end-to-end:
#    - Course loading
#    - Progress display  
#    - Stats calculation
#    - Search and filtering
#    - Tab switching
#    - Continue learning links

# Production readiness check:
# 1. No console errors
# 2. No network errors
# 3. Fast loading times
# 4. Responsive design
# 5. Accessibility features work
```

#### **Expected Results:**
- [ ] No mock data references remain in codebase
- [ ] No console.log statements in production code
- [ ] All features work end-to-end
- [ ] Page is production-ready
- [ ] Documentation is updated
- [ ] Code is clean and maintainable

#### **Final Git Checkpoint:**
```bash
git add .
git commit -m "feat: Complete student courses backend integration

✅ COMPLETE MOCK DATA REPLACEMENT:
- Replaced entire mock progress system with real database
- Implemented comprehensive learning analytics backend  
- Added real-time progress tracking and AI interaction recording
- Created complex multi-table queries for dashboard data
- Optimized performance with database indexes and triggers

✅ FEATURES IMPLEMENTED:
- Real course enrollment and progress tracking
- AI interaction counting and analytics  
- Learning struggle detection and topic analysis
- Milestone tracking and achievement system
- Comprehensive learning statistics dashboard
- Search and filtering with real data
- Tab-based course filtering by completion status

✅ PERFORMANCE AND QUALITY:
- Query performance under 300ms for complex dashboard loads
- Real-time updates with database triggers
- Comprehensive error handling and recovery
- Mobile responsive design maintained
- Production-ready with proper security (RLS)

🤖 Generated with Claude Code"
```

---

## 🎯 **Manual Verification Summary**

### **Key Checkpoints:**
1. **Database queries work** and return expected data structure
2. **Service layer transforms** data to match UI expectations  
3. **Store integration** replaces all mock data logic
4. **UI displays real data** with proper loading states
5. **Real-time updates** work for progress and interactions
6. **Performance meets** acceptable standards
7. **Error handling** gracefully manages failures
8. **Mobile responsive** design is maintained
9. **No mock data** remains in production code
10. **Documentation** reflects current implementation

### **Git Strategy:**
- **10 checkpoints** with clear commit messages
- **Wait for confirmation** before each major step
- **Rollback capability** at any checkpoint
- **Progress tracking** through git history
- **Team collaboration** friendly approach

**This gradual approach ensures no "big messups" and maintains confidence throughout the complex migration from mock data to real backend integration.**

---

## 🚨 **Critical Complexity Factors**

### **Why 4-5x Longer Than Original Estimate**

1. **Database Complexity:** 10+ tables vs 3 tables
2. **Real-time Calculations:** Complex triggers vs simple data storage
3. **Learning Analytics:** AI interaction tracking, struggle detection, milestone management
4. **Performance Requirements:** Optimized queries for real-time dashboard updates
5. **Data Relationships:** Complex joins and aggregations vs simple lookups

### **Mock Data Scope Previously Underestimated**

1. **Progress Tracking System:** Complete video progress with timestamps, rewind counts, pause tracking
2. **AI Analytics:** Interaction counting, context tracking, response quality rating
3. **Learning Intelligence:** Struggle detection, topic difficulty analysis, milestone tracking
4. **User Behavior Analysis:** Study patterns, completion rates, engagement metrics

---

## 🎯 **Success Criteria (Updated)**

### **Week 1 Success**
- ✅ Complete database schema deployed
- ✅ All tables populated with realistic sample data  
- ✅ Database triggers calculating progress correctly
- ✅ Query performance under 200ms for dashboard loads

### **Week 2 Success**
- ✅ Service layer handling complex analytics queries
- ✅ Real-time progress updates working
- ✅ AI interaction recording functional
- ✅ Learning struggle detection operational

### **Week 3 Success**
- ✅ UI displaying 100% real data
- ✅ All hardcoded values replaced
- ✅ Search and filtering working with real data
- ✅ Performance equivalent to mock implementation

**This updated plan accounts for the complete mock data architecture that needs replacement - not just simple course listings, but a comprehensive learning analytics and progress tracking system.**