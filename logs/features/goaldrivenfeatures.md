now we got the course creation / edit course figured out thats good. now what i want is something like skool or whop community but goal driven. 

For example:
1. i'll be targeting ppl who wanna do great on Upwork
2. 


My Achievements:
1. $500k usd in 2.25 years on upwork + outside upwork but from 90% from upwork, selling shopify theme/app dev service
2. 80% profit margin, selling for $50 to $90/hr and my team getting paid $1-$3/hr
3. hiring devs/designers for $1-$3/hr 
4. having a system where top designer / dev can do hands on training to multiply desingers / devs by giving them tasks and helping them throughout their journey and strengthening their skills
5. Vibe coded using claude code ai unpuzzle app, 2 shopify apps ill be releasing
6. Documenting my journey through videos on how i'm building several apps and trying to go from agency owner to saas owner and will be posting them on Unpuzzle

I can build apps in 2 weeks that'd take other devs 2-3 months because of claude code.

so i want to teach that in courses and also try to get projects in upwork beyond shopify using my vibe coded projects full stack apps and grow Muscled Digital Agency (the upwork agency that did 500k in 2.25 years) even further.

1. users wanna make money from upwork
2. build portfolio projects
3. send proposals
4. do sales calls, upload sales calls for review
5. 


Goals to unlock:
1. Earn 1k with Shopify Agency
1. Earn 2k with Shopify Agency
2. Earn $5k with Shopify Agency
...
3. Earn $10k with Shopify Agency
4. Earn $50k with Shopify Agency
...


1. Earn 1k with AI Software Agency
1. Earn 2k with AI Software Agency
2. Earn $5k with AI Software Agency
...
3. Earn $5k with AI Software Agency
4. Earn $10k with AI Software Agency
3. Earn $20k with AI Software Agency
...

1. Earn 1k MRR with SaaS
2. Earn 2k MRR with SaaS
3. Earn 5k MRR with SaaS
4. Earn $10k MRR with SaaS
5. Earn $20k MRR with SaaS

after i launch unpuzzle i will do the following:
1. code vibe coded apps to make more SaaS revenue
2. continue selling shopify services on upwork
3. sell web app dev services on upwork using my vibe coded projects as portfolio
4. create content about my progress and post on unpuzzle for unpuzzle members


## MVP Community Features

### Community Page (Main Hub)
- Member list with name, goal badge, learn rate (mins video/hour)
- Leaderboards: Lifetime vs This week, month, year EARNED
- Mixed community: all goal types + "just learners"

### Learn Rate System
- Calculation: `Total video minutes watched / Total session hours`
- Real-time tracking: video watch time, quiz completion, reflection time
- Visual indicators: progress bars, color coding (green/yellow/red)

### Individual Goal Pages (/community/user/[id]/goal)
- Progress overview: videos watched, quizzes passed, reflections submitted
- Activity timeline: chronological achievement tracking
- Task completion status from instructor assignments

### Goal-Based Course Delivery
- Algorithm shows courses relevant to selected goal
- Progress tracking: watch time, quiz scores, reflection submissions
- Achievement milestones tied to goal progression

### Implementation Order (4 weeks)
Week 1: Goal selection, learn rate tracking, basic community page
Week 2: Quiz integration, reflection system, individual goal pages  
Week 3: Leaderboards, activity feed, goal-based course filtering
Week 4: UI polish, performance optimization, user testing

## Required Routes

### Instructor Routes (Existing + Extensions)
- `/instructor/dashboard` - Overview with community stats
- `/instructor/courses` - Course management with goal targeting
- `/instructor/course/[id]/edit` - Course editor with quiz/reflection tools
- `/instructor/media` - Media library management
- `/instructor/community` - Community management and moderation
- `/instructor/community/leaderboards` - Earnings verification and management
- `/instructor/analytics` - Student progress and earnings analytics
- `/instructor/goals` - Goal management and milestone setup

### Student Routes (New)
- `/student/dashboard` - Personal dashboard with goal progress
- `/student/courses` - Goal-filtered course catalog
- `/student/course/[id]` - Course viewing with quizzes/reflections
- `/student/community` - Community hub with member list and leaderboards
- `/student/community/user/[id]/goal` - Individual user goal pages
- `/student/profile` - Goal selection, earnings submission, progress tracking
- `/student/leaderboards` - Earnings leaderboards (week/month/year/lifetime)
- `/student/goals` - Personal goal management and milestone tracking

### Shared/Auth Routes
- `/auth/signup` - Registration with goal selection
- `/auth/signin` - Login
- `/onboarding` - Goal selection and initial setup
- `/settings` - Account settings and privacy options

## Auth System Status

### ✅ Current Auth (Good to Go)
- Supabase SSR auth properly implemented
- Role-based routing (student/instructor/admin) with middleware protection
- Social auth (Google/GitHub) available
- Clean login/signup flows with error handling
- Server-side auth with proper session management

### ➕ Needs Addition for Goals
- Goal selection step in signup flow
- User goals table in database (user_id, goal_type, current_level)
- Goal-based redirect after signup (instead of /student)
- Goal selection component for signup page

### Implementation Plan
1. Add goal selection to signup page after form validation
2. Create user_goals table in Supabase
3. Update signup action to save selected goal
4. Redirect to goal-specific onboarding after signup

