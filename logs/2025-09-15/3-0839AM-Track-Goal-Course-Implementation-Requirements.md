# Track-Goal-Course System Implementation Requirements

## Database Schema Updates

### User Track and Goal Management
- Add `user_track` table linking users to specific tracks (Agency/SaaS)
- Add `user_goals` table storing current goal and progress
- Add `track_goals` table defining available goals per track
- Update users table to reference current active track and goal

### Course Tagging System
- Add `course_tags` table for flexible course categorization
- Add `course_track_assignments` table linking courses to specific tracks
- Add `course_goal_assignments` table linking courses to specific goals
- Support multiple tags per course for better organization

### Community Actions System
- Add `user_actions` table storing community actions and points
- Add `action_types` table defining available actions per track
- Add point values for different action types
- Link actions to goals page activities (auto-tracked + user messages)

## Instructor Features Required

### Course Tagging Interface
- Tag selector dropdown with predefined track options (Agency Track, SaaS Track)
- Goal selector dropdown with predefined goal options per track
- Additional custom tags input for content categorization
- Bulk tagging interface for multiple courses
- Tag preview showing which students will see the course

### Course Management Enhancements
- Track filter in course list view
- Goal filter in course list view
- Visibility indicator showing which user groups can access each course
- Warning system for untagged courses

## Student Experience Updates

### Track Assignment Flow
- Post-purchase track selection if not assigned during checkout
- Goal customization screen after track assignment
- Default goal assignment based on track selection
- Track change request system with approval workflow

### Course Discovery System
- Filter courses by user's assigned track
- Filter courses by user's current goal
- Hide courses not tagged for user's track/goal
- Show progress indicators for goal-aligned courses
- Course recommendation engine based on goal progression

### Student Dashboard Improvements
- Display current track and goal prominently
- Show courses relevant to current goal
- Display community points and recent actions
- Next recommended course based on goal progression

### Course Access and Navigation
- Direct course access from student dashboard
- Course page with clear start/continue options
- Video player integration with progress tracking
- Breadcrumb navigation showing course context within goal

## Technical Implementation Priority

### Phase 1: Database and Backend
1. Create database schema for tracks, goals, and course assignments
2. Update user model to include track and goal relationships
3. Create server actions for track assignment and goal management
4. Implement course filtering based on user track/goal

### Phase 2: Instructor Interface
1. Add course tagging interface in course edit flow
2. Implement tag management and bulk operations
3. Add visibility controls and preview functionality
4. Update course list with filtering and tagging information

### Phase 3: Student Experience
1. Build track assignment and goal selection flow
2. Implement filtered course discovery
3. Update student dashboard with goal-aligned content
4. Create course navigation from dashboard to video player

### Phase 4: Community Actions Integration
1. Convert goals page activities into community actions
2. Add points system and leaderboards
3. Create action-based engagement features
4. Build community gamification system

## Data Migration Requirements

### Existing User Handling
- Assign default track to users without track assignment
- Assign default goal based on track or user behavior analysis
- Migrate existing course enrollments to track-based system
- Preserve user progress and completion data

### Course Content Organization
- Tag existing courses with appropriate tracks and goals
- Ensure all courses have at least one track/goal assignment
- Create course sequences and learning paths
- Set up prerequisite and progression logic

## User Flow Validation

### New User Journey
1. User signs up and pays for specific track
2. User completes goal customization during onboarding
3. User sees only courses tagged for their track/goal
4. User can access and start courses from dashboard
5. User earns community points through goals page activities

### Existing User Migration
1. Existing users prompted to select track and goal
2. Course visibility updated based on selections
3. Progress preserved and mapped to new goal system
4. Smooth transition without data loss

## Success Criteria

### Instructor Efficiency
- All courses properly tagged within first week
- Easy course organization and management
- Clear visibility into student access patterns

### Student Experience
- Students see only relevant courses (no empty course lists)
- Clear progression path from dashboard to course content
- Goal alignment obvious throughout experience
- Course access works seamlessly from dashboard
- Community points earned from goals page activities

### System Performance
- Course filtering performs efficiently with large course catalogs
- User track/goal data loads quickly on dashboard
- Tagging interface responsive during bulk operations
- Course recommendations generated without delays