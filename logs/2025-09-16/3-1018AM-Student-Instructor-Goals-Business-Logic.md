# Student & Instructor Goals - Business Logic Overview

**Created**: September 16, 2025, 10:18 AM
**Purpose**: Core business rules for goal tracking and instructor-student interactions
**Scope**: Defines the logic behind goal management, progress tracking, and tiered access

---

## 🎯 **Goal System Architecture**

### **Core Business Rules**
- **One Goal Per Student**: Students can only have 1 active goal at a time across all plans
- **Daily Progress Tracking**: Students log daily updates with text + file attachments
- **Instructor Assignment**: Growth Plan students get assigned human instructors
- **AI vs Human Responses**: Learn Plan gets AI, Growth Plan gets instructor + AI

### **Goal Lifecycle States**
```
ACTIVE → PAUSED → COMPLETED → ARCHIVED
```

---

## 👤 **Student Goal Logic**

### **Free Plan Behavior**
```
✅ Can create and track 1 goal
✅ Daily updates with file uploads
✅ Progress visualization and timeline
❌ No AI responses or feedback
❌ No instructor interaction
❌ Read-only experience with upgrade prompts
```

### **Learn Plan Enhancement**
```
✅ All Free Plan features
✅ AI responses to daily updates within 30 minutes
✅ Personalized suggestions and next actions
✅ Weekly AI progress analysis and insights
✅ Smart notifications for streaks/milestones
```

### **Growth Plan Premium**
```
✅ All Learn Plan features
✅ Assigned human instructor (1:1 relationship)
✅ Instructor responses to daily updates
✅ Weekly scheduled check-ins and goal reviews
✅ Custom milestone assignments from instructor
✅ Priority response times (<2 hours)
```

---

## 👨‍🏫 **Instructor Goal Management**

### **Student Assignment Logic**
- **Capacity**: Each instructor manages 20-30 Growth Plan students
- **Assignment**: Students auto-assigned based on instructor availability + expertise
- **Relationship**: Long-term pairing (instructor stays with student through goal completion)

### **Instructor Dashboard Features**
```
📊 Student Overview: All assigned students with goal progress
💬 Response Queue: Daily updates requiring instructor feedback
📅 Check-in Scheduler: Weekly 1:1 sessions with students
📈 Analytics: Student success rates and engagement metrics
⚠️ Alert System: Students falling behind or needing attention
```

### **Response Workflow**
1. **Student submits daily update** → Notification to assigned instructor
2. **Instructor reviews** → Can see all previous context and AI suggestions
3. **Instructor responds** → Personal message + optional task assignments
4. **Student notification** → Email + in-app alert for instructor response

---

## 🔄 **Interaction Patterns**

### **Daily Update Flow**
```
Student Action → System Processing → Plan-Based Response

Free Plan:
Student Update → Saved to timeline → No response (upgrade prompt)

Learn Plan:
Student Update → AI analysis → AI response generated → Student notified

Growth Plan:
Student Update → AI analysis + Instructor notification →
Instructor response (with AI context) → Student notified
```

### **Progress Tracking Logic**
- **Streak Calculation**: Consecutive days with updates (resets at midnight)
- **Milestone Detection**: AI scans updates for achievement keywords
- **Engagement Score**: Daily activity + response interaction + goal progress
- **Success Prediction**: AI analyzes patterns to predict goal completion likelihood

---

## 💰 **Business Logic by Plan Tier**

### **Conversion Triggers**
```
Free → Learn:
- Day 3: After daily update → "Get AI feedback" prompt
- Day 7: Weekly review → "Unlock insights" upgrade
- Day 14: Struggling pattern → "Get guidance" intervention

Learn → Growth:
- Month 2: AI limitations reached → "Talk to human expert"
- Plateau detected → "Personal coaching breakthrough"
- High engagement → "Accelerate with instructor support"
```

### **Feature Gating Logic**
```typescript
// Pseudo-code for feature access
const canAccessFeature = (userPlan: Plan, feature: Feature) => {
  switch (feature) {
    case 'AI_RESPONSES':
      return userPlan === 'LEARN' || userPlan === 'GROWTH'
    case 'INSTRUCTOR_CHAT':
      return userPlan === 'GROWTH'
    case 'WEEKLY_CHECKINS':
      return userPlan === 'GROWTH'
    case 'GOAL_TRACKING':
      return true // Available to all plans
  }
}
```

---

## 📊 **Analytics & Success Metrics**

### **Student Success Indicators**
- **Goal Completion Rate**: % of students who achieve their stated goal
- **Daily Engagement**: Consistency of daily update submissions
- **Response Interaction**: How students engage with AI/instructor feedback
- **Time to Achievement**: Average days from goal start to completion

### **Instructor Performance Metrics**
- **Response Time**: Average time to respond to student updates
- **Student Retention**: Churn rate of assigned Growth Plan students
- **Goal Success Rate**: % of their students who complete goals
- **Engagement Quality**: Student satisfaction with instructor interactions

### **Business Intelligence**
```
Conversion Tracking:
- Free Plan stickiness (7, 14, 30-day retention)
- Upgrade conversion rates by trigger type
- Plan downgrades and churn reasons
- Lifetime value by acquisition channel

Operational Metrics:
- Instructor utilization rates (students per instructor)
- AI response accuracy and helpfulness ratings
- Support ticket volume by plan tier
- Feature usage patterns across plans
```

---

## 🔧 **Technical Implementation Notes**

### **Database Relationships**
```sql
users (id, plan_type, created_at)
goals (id, user_id, title, status, target_date)
daily_updates (id, goal_id, content, files, created_at)
instructor_assignments (instructor_id, student_id, assigned_at)
responses (id, update_id, content, type: 'ai'|'instructor', created_at)
```

### **Key Business Rules in Code**
- **One Goal Constraint**: Database constraint + UI validation
- **Plan-Based Feature Access**: Middleware checks on all goal-related endpoints
- **Response Generation**: Async jobs for AI, sync notifications for instructors
- **Billing Integration**: Plan changes immediately affect feature access
- **Instructor Workload**: Auto-assignment based on current student count

This business logic forms the foundation for the conversion strategy, ensuring clear value differentiation between plans while maintaining a scalable instructor-student relationship model.