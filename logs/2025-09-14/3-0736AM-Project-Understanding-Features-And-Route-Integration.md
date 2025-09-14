# Project Understanding: Features & Route Integration

## Date: 2025-09-14
## Time: 07:36 AM EST
## Status: Complete Project Architecture Understanding

---

## Project Core Purpose

Goal-driven learning platform where instructor teaches entrepreneurship through structured courses and community accountability system tracks student progress toward specific monetary goals ($1K-$25K agencies/SaaS).

---

## Route Architecture

### **Instructor Routes**
- Course creation and management
- Video upload and organization
- Student progress analytics
- Goal approval and validation system
- Media library management (/media)

### **Community Routes**  
- Goal-based student community
- Progress leaderboards and tracking
- Resource library with lead generation
- Member posts and discussions
- Success proof validation

### **Video Processing**
- Upload to external storage (Backblaze)
- Video analytics and progress tracking
- Quiz integration during video playback
- Reflection quality grading system

---

## Core Features

### **Goal Management System**
- Instructor creates goal templates ($1K, $3K, $5K, $10K, $25K tiers)
- Students select goals, instructor approves
- Proof-based progression (bank statements, transaction screenshots)
- Auto-skip goals when exceeding targets (e.g., $3K → $10K)
- Goal-course tagging for access control

### **Learn Rate Calculation**
- Video consumption time per session hour
- Quiz performance during video watching (80%+ threshold)
- Reflection quality grading by instructor
- Weighted by video length and course size
- Combined across all goal-tagged courses

### **Execution Rate System**
- Task completion from goals dashboard
- Course video follow-through tracking  
- No self-reporting, instructor validation only
- Automatic updates from course progress

### **Community Features**
- Posts feed with replies and reactions
- Goal-specific leaderboards (ranking by days to completion)
- Resource library (free/premium instructor resources)
- Success proof section (instructor-approved achievements)
- Affiliate system (30% commission on community fees only)

### **Progress Tracking**
- Real-time sync between instructor course data and community metrics
- Timeline visualization of goal progression
- Achievement milestones with instructor approval
- Historical data retention for leaderboard rankings

---

## Route Integration Patterns

### **Instructor → Community**
- Instructor-created courses with goal tags automatically display in community for students with matching approved goals
- Course updates immediately visible to community members
- Student progress data flows to community leaderboards
- Quiz/reflection scores update community execution rates
- Instructor moderation powers across community posts

### **Community → Instructor**
- Goal selections require instructor approval
- Success proof submissions trigger instructor review workflows
- Community affiliate referrals visible in instructor dashboard
- Student community engagement affects instructor analytics

### **Media → All Routes**
- Instructor uploads via /media route
- Videos used in instructor courses
- Media assets available for community resource creation
- Video analytics feed learn rate calculations

### **Data Flow Hierarchy**
1. Instructor creates courses and tags with goals
2. Students select goals → instructor approves → course access granted
3. Course progress updates community metrics automatically
4. Community displays instructor-validated achievements
5. All progression requires instructor approval

---

## User Experience Flows

### **Student Journey**
1. Join community ($97/month)
2. Select goal from instructor options
3. Wait for instructor approval
4. Access goal-tagged courses
5. Complete videos, quizzes, reflections
6. Submit goal achievement proof
7. Instructor validates → auto-promote to next goal
8. Participate in community discussions and leaderboards

### **Instructor Operations**
1. Create courses and tag with appropriate goals
2. Upload videos via /media route
3. Review and approve student goal selections
4. Monitor student progress through analytics
5. Grade reflections and validate quiz performance
6. Approve success proof submissions
7. Moderate community posts and discussions
8. Create community resources (free/premium)

### **Community Engagement**
- View goal-specific leaderboards (ranked by completion speed)
- Access resources based on goal level and membership
- Post achievements with instructor validation
- Browse affiliate success stories
- Participate in goal-driven discussions

---

## Business Model Integration

### **Revenue Streams**
- Community membership: $97/month
- Premium resources: Instructor-set pricing
- Affiliate commissions: 30% of community fees only

### **Value Proposition**
- Structured path from $0 to $25K+ revenue
- Daily accountability through community system
- Proven templates and resources
- Direct instructor mentorship and validation
- Peer motivation through leaderboards

### **Quality Control**
- All goal progression instructor-approved
- Success proof validation prevents false claims
- Resource quality controlled through instructor curation
- Community posts subject to instructor moderation

---

## Technical Architecture Requirements

### **Authentication System**
- Single user system with role-based permissions
- Instructor/student mode switching
- Course access based on approved goals
- Community features gated by subscription status

### **Data Synchronization**
- Real-time updates between instructor course data and community metrics
- Background sync for learn/execution rate calculations
- Optimistic updates with server validation
- Historical data preservation for rankings

### **Content Management**
- Media upload and processing pipeline
- Course-goal tagging system
- Resource creation workflow
- Community post moderation tools

### **Performance Considerations**
- Video streaming optimization
- Leaderboard calculation efficiency
- Real-time community updates
- Analytics dashboard responsiveness