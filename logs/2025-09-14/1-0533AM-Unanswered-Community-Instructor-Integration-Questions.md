# Unanswered Community-Instructor Integration Questions

## Date: 2025-09-14
## Time: 05:33 AM EST
## Status: Questions Requiring Answers for Community Migration

## Executive Summary

This document contains all unanswered questions from the Community-Instructor Integration Questions analysis. These answers are needed to proceed with the community playground migration to production route.

## Currently Answered Questions Summary

**✅ Answered Questions:**
- Q1: Goal Creation Workflow (1.1, 1.2, 1.3)
- Q2: Goal Progression and Upgrades (2.1, 2.2, 2.3, 2.4)
- Q3: Goal-Course Relationship (3.1, 3.2, 3.3)
- Q4: Post Moderation Authority (4.1, 4.2, 4.3)
- Q5: Community-Course Content Synchronization (5.1, 5.2, 5.3)
- Q6: Success Proof Validation (6.1, 6.2, 6.3)
- Q7: Progress Data Synchronization (7.1, 7.2, 7.3)
- Q8: Learn Rate Calculation (8.1, 8.2, 8.3)
- Q9: Execution Rate Dependency (9.1, 9.2, 9.3)
- Q10: Resource Library Control (10.1, 10.2, 10.3)
- Q11: Course-Community Visibility (11.1, 11.2, 11.3)
- Q12: Affiliate Integration (12.1, 12.2, 12.3)
- Q13: Role Switching Experience (13.1, 13.2, 13.3)
- Q14: Data Consistency Across Routes (14.1, 14.2, 14.3)
- Q15: Authentication and Access Control (15.1)
- Q19: Member Onboarding Flow (19.1, 19.2, 19.3)
- Q20: Progress Tracking Dependencies (20.1, 20.2, 20.3)

---

## ANSWERED QUESTIONS WITH DETAILED RESPONSES

### **Q6: Success Proof Validation (Complete)**
- **6.2**: Can instructors add their own commentary to member achievements?
**Answer**: No.

### **Q7: Progress Data Synchronization (Complete)**
- **7.1**: Does community leaderboard pull from instructor course completion data?
**Answer**: Yes, it should pull learn rate and whatever other data community has. It should be in sync with instructor/student data.

- **7.2**: How do we handle members who take courses outside the platform but still want community ranking?
**Answer**: No ranking allowed if courses taken outside the community.

- **7.3**: Should instructor-assigned quizzes/reflections automatically update community metrics?
**Answer**: Yes.

### **Q8: Learn Rate Calculation (Complete)**
- **8.1**: Is community "Learn Rate" based on instructor course video consumption only?
**Answer**: Yes - learn rate is affected by course videos watched, quiz results during watching those videos, and grading the reflection quality that users provide.

- **8.2**: How do we track video consumption across instructor's multiple courses?
**Answer**: Quiz results during watching those videos, and grading the reflection quality that users provide. Each video should have a learn rate. Each course should combine all learn rates from all videos of that course. Videos that are longer should have higher weight in terms of learn rate calculation of the entire course. Learn rate of a user in achieving a goal will be the learn rate of all courses combined in that goal. Learn rate calculation from courses is dependent on, is calculated based on the learn rate of individual courses. And it should combine the learn rate of individual courses and the courses that are bigger should have a higher weight in determining the overall learn rate.

- **8.3**: Should community discussions and resource consumption count toward learn rate?
**Answer**: No.

### **Q9: Execution Rate Dependency (Complete)**
- **9.1**: Are community execution rates tied to instructor-assigned tasks only?
**Answer**: Execution rate depends on: a. when tasks given in goals dashboard by instructor, are they being done? course videos being watched - are they being followed?

- **9.2**: Can members self-report execution without instructor validation?
**Answer**: No. But maybe in the future.

- **9.3**: How do we prevent gaming the system while maintaining community motivation?
**Answer**: We'll worry about that later.

### **Q10: Resource Library Control (Complete)**
- **10.1**: Can instructors upload directly to community resource library?
**Answer**: They can upload files or links in the /media route which they can use to create resources via a form with choose media from /media and then creating resources that way directly in community resource library. When filling the form they choose free or premium.

- **10.2**: Should instructor resources be automatically marked as "premium" vs community resources as "free"?
**Answer**: Answered in 10.1

- **10.3**: How do we handle version control when instructors update shared resources?
**Answer**: Don't worry for now.

### **Q12: Affiliate Integration (Complete)**
- **12.1**: Do instructor earnings factor into community affiliate calculations?
**Answer**: No, only community membership fees commissions.

- **12.2**: Can instructors see which community members are driving referrals?
**Answer**: Yes.

- **12.3**: Should instructor success stories appear in community affiliate success proof?
**Answer**: No.

### **Q13: Role Switching Experience (Complete)**
- **13.1**: When instructor is viewing community as a member, should they see instructor-only features?
**Answer**: No.

- **13.2**: How do we handle instructor accounts that are also community members?
**Answer**: Instructor can switch to student mode and become community member but instructor himself cannot be community member, needs to switch to student mode.

- **13.3**: Should there be a clear "instructor mode" vs "community member mode" toggle?
**Answer**: Student mode should allow them to become part of the community and see things as a community member mode. So student mode is the community member mode.

### **Q14: Data Consistency Across Routes (Complete)**
- **14.1**: If instructor updates a course, should community members see changes immediately?
**Answer**: Yes.

- **14.2**: How do we handle instructor profile data appearing in both instructor routes and community?
**Answer**: Yes.

- **14.3**: Should community member profiles link back to instructor course progress?
**Answer**: No - there are no community member profiles, only student/instructor profiles. Community displays use existing student profile data.

### **Q19: Member Onboarding Flow (Complete)**
- **19.3**: How do we handle community members who join without taking instructor courses?
**Answer**: Not possible - based on Q1/Q3, goal selection and instructor approval required before course access, so all community members must take instructor courses.

### **Q20: Progress Tracking Dependencies (Complete)**
- **20.1**: Should community milestone achievements automatically unlock instructor course modules?
**Answer**: No - based on Q1, instructor approves all goal progression and controls course access via goal-course tagging.

- **20.2**: Can instructor course completions automatically update community goal progress?
**Answer**: Yes - based on Q7.1/Q7.3, community metrics sync with instructor/student data including course completions.

---

## QUESTIONS STILL REQUIRING ANSWERS

### **Q15: Authentication and Access Control (Partial)**
- **15.2**: Can instructors access community analytics that regular members cannot see?
- **15.3**: How do we handle instructor accounts with expired subscriptions?

### **Q16: Shared State Management**
- **16.1**: Should instructor course data and community goal data share the same TanStack Query keys?
- **16.2**: How do we prevent conflicts when instructor updates affect community state?
- **16.3**: Do we need cross-route state synchronization or independent data layers?

### **Q17: Server Actions Coordination**
- **17.1**: Should community server actions call instructor route server actions for course-related data?
- **17.2**: How do we handle transactions that affect both instructor and community databases?
- **17.3**: Do we need event-driven updates between instructor and community features?

### **Q18: Performance and Caching**
- **18.1**: Should instructor-related community data have different cache invalidation strategies?
- **18.2**: How do we optimize queries when community features need instructor course data?
- **18.3**: Do we need separate CDN strategies for instructor vs community assets?

### **Q21: Revenue and Analytics Integration**
- **21.1**: Should instructor earnings dashboard include community-generated revenue?
- **21.2**: Do community engagement metrics affect instructor course recommendations?
- **21.3**: How do we attribute success between instructor teaching and community support?

### **Q22: Multi-Instructor Scenarios**
- **22.1**: How will community features work if multiple instructors join the platform?
- **22.2**: Should each instructor have their own community or one shared community?
- **22.3**: How do we handle conflicting goal recommendations from different instructors?

### **Q23: Advanced Community Features**
- **23.1**: Should community members be able to peer-teach instructor course concepts?
- **23.2**: Can high-performing community members become instructor assistants?
- **23.3**: How do we handle community-generated content that competes with instructor courses?

### **Q24: Cross-Platform Integration**
- **24.1**: Should community achievements integrate with external platforms (LinkedIn, etc.)?
- **24.2**: Can instructor course certificates include community achievement data?
- **24.3**: How do we handle members who want instructor features without community participation?

---

## Priority Classification for Remaining Questions

### **Critical for MVP (Must Answer Before Migration)**
- **Q7**: Progress Data Synchronization (all sub-questions)
- **Q8**: Learn Rate Calculation (all sub-questions) 
- **Q9**: Execution Rate Dependency (all sub-questions)
- **Q16**: Shared State Management (all sub-questions)

### **Important for User Experience (Answer During Development)**
- **Q10**: Resource Library Control (all sub-questions)
- **Q13**: Role Switching Experience (all sub-questions)
- **Q14**: Data Consistency Across Routes (all sub-questions)
- **Q17**: Server Actions Coordination (all sub-questions)
- **Q20**: Progress Tracking Dependencies (20.1, 20.2)

### **Business Logic Integration (Answer for Complete Feature Set)**
- **Q12**: Affiliate Integration (all sub-questions)
- **Q15**: Authentication and Access Control (15.2, 15.3)
- **Q19**: Member Onboarding Flow (19.3)
- **Q21**: Revenue and Analytics Integration (all sub-questions)

### **Future Enhancement (Can Defer)**
- **Q22**: Multi-Instructor Scenarios (all sub-questions)
- **Q23**: Advanced Community Features (all sub-questions)
- **Q24**: Cross-Platform Integration (all sub-questions)

---

## Impact on Migration Strategy

### **Blocking Questions for Technical Architecture:**
These questions directly impact the migration implementation and must be answered first:
- Q7 (leaderboard data sources)
- Q8 (learn rate calculation methodology)
- Q9 (execution rate validation)
- Q16 (state management approach)
- Q17 (server actions coordination)

### **Questions Affecting User Experience:**
These impact the user interface and workflow design:
- Q10 (resource management)
- Q13 (role switching)
- Q14 (data consistency)
- Q15.2-15.3 (analytics access)

### **Questions for Business Logic:**
These affect business rules and revenue tracking:
- Q12 (affiliate integration)
- Q19.3 (member onboarding edge cases)
- Q21 (revenue attribution)

---

## Recommended Next Steps

1. **Priority 1**: Answer Q7-Q9, Q16-Q17 (technical architecture)
2. **Priority 2**: Answer Q10, Q13-Q14 (user experience)
3. **Priority 3**: Answer Q12, Q15.2-15.3, Q19.3, Q21 (business logic)
4. **Priority 4**: Defer Q22-Q24 for post-MVP development

Answering these questions will provide the clarity needed to implement the community migration with proper integration between instructor and community features.