# Raw Data: Types in domain.ts vs Types Imported
**Date:** 2025-08-13  
**Method:** Direct extraction, no analysis

---

## 1. ALL TYPES EXPORTED FROM domain.ts (35 total)

```
export type UserRole = 'student' | 'instructor' | 'moderator' | 'admin'
export interface User {
export interface Subscription {
export interface Video {
export interface StudentVideoData extends Video {
export interface InstructorVideoData extends Video {
export interface Lesson {
export interface StudentLessonData extends Lesson {
export interface InstructorLessonData extends Lesson {
export interface Reflection {
export interface VideoSegment {
export interface Quiz {
export interface StudentActivity {
export interface ConfusionHotspot {
export interface VideoMetrics {
export interface Course {
export interface Instructor {
export interface AIMessage {
export interface AIChat {
export interface VideoProgress {
export interface AIEngagementMetrics {
export interface AIPrompt {
export interface QuizAttempt {
export interface CourseProgress {
export interface TranscriptEntry {
export interface UIPreferences {
export interface TranscriptReference {
export interface UserPreferences {
export interface UserProfile {
export interface UserLearningPath {
export interface UserAchievement {
export interface VideoMetadata {
export interface TranscriptSegment {
export interface ServiceResult<T> {
export interface PaginatedResult<T> {
```

---

## 2. ALL FILES IMPORTING FROM domain.ts (15 total)

```
src/config/features.ts
src/services/instructor-course-service.ts
src/services/instructor-video-service.ts
src/services/role-services.ts
src/services/student-course-service.ts
src/services/student-video-service.ts
src/stores/slices/ai-slice.ts
src/stores/slices/instructor-course-slice.ts
src/stores/slices/instructor-video-slice.ts
src/stores/slices/student-course-slice.ts
src/stores/slices/student-video-slice.ts
src/stores/slices/user-slice.ts
src/app/test-feature-flags/page.tsx
src/components/course/ai-course-card.tsx
src/components/examples/service-usage-example.tsx
```

---

## 3. DETAILED IMPORTS BY FILE

### Single-line imports:
```
src/config/features.ts: import { UserRole } from '@/types/domain'
src/stores/slices/ai-slice.ts: import { AIMessage, TranscriptReference, VideoSegment } from '@/types/domain'
src/stores/slices/instructor-course-slice.ts: import { Course, Video } from '@/types/domain'
src/stores/slices/instructor-video-slice.ts: import { InstructorVideoData, StudentActivity } from '@/types/domain'
src/stores/slices/student-course-slice.ts: import { Course, CourseProgress } from '@/types/domain'
src/stores/slices/student-video-slice.ts: import { StudentVideoData, Reflection, VideoSegment, Quiz } from '@/types/domain'
src/stores/slices/user-slice.ts: import { User, UIPreferences, CourseProgress } from '@/types/domain'
src/app/test-feature-flags/page.tsx: import { UserRole } from "@/types/domain"
src/components/course/ai-course-card.tsx: import { Course, UserRole } from "@/types/domain"
src/components/examples/service-usage-example.tsx: import { StudentVideoData } from '@/types/domain'
```

### Multi-line imports from services:

**instructor-course-service.ts:**
```
Course
Video
Lesson
InstructorLessonData
ServiceResult
StudentActivity
```

**instructor-video-service.ts:**
```
InstructorVideoData
StudentActivity
VideoMetrics
ServiceResult
ConfusionHotspot
Reflection
```

**student-course-service.ts:**
```
Course
Video
Lesson
StudentLessonData
ServiceResult
CourseProgress
```

**student-video-service.ts:**
```
StudentVideoData
VideoProgress
Reflection
Quiz
ServiceResult
VideoSegment
AIMessage
AIChat
```

---

## 4. SUMMARY COUNTS

- **Types defined in domain.ts:** 35
- **Files importing from domain.ts:** 15
- **Service files using domain types:** 4
- **Slice files using domain types:** 6
- **Component files using domain types:** 2
- **Other files using domain types:** 3

---

**End of raw data extraction. No analysis or conclusions provided.**