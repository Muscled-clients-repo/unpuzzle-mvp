# Student Plan Tiers - UX Specification and Implementation Guide

## Overview

This document details the three-tier pricing strategy for Unpuzzle, defining features, user experience, and frontend implementation requirements for each plan tier. This specification follows the architecture principles established in the logs/patterns folder.

## Plan Structure and Pricing

### Free Plan
- **Price**: $0/month
- **Target Users**: Lead generation, trial users, goal-setting validation
- **Core Value**: Basic goal tracking to build habits and demonstrate platform value

### Learn Plan  
- **Price**: $50/month, $250/6-months (save $50), $450/annual (save $150)
- **Target Users**: Self-directed learners seeking AI-assisted education
- **Core Value**: Complete learning platform with AI guidance

### Growth Plan
- **Price**: $297/month, $1,485/6-months (save $297), $2,673/annual (save $891)  
- **Target Users**: Ambitious learners requiring personal mentorship
- **Core Value**: Premium education with human instructor support

## Feature Matrix by Plan

### Goal Tracking Features

#### Free Plan Goal Features
- **Goal Setting**: Can set 1 goal only (same as all plans)
- **Progress Tracking**: Basic progress bar and daily timeline view
- **Activity Logging**: Can add personal daily notes/updates
- **Auto-Tracking**: Views Unpuzzle platform activities (videos, quizzes, etc.)
- **Timeline View**: See historical progress and daily entries
- **No Feedback**: No responses or guidance on daily updates
- **Read-Only Experience**: Pure self-tracking without interaction

#### Learn Plan Goal Features  
- **All Free Features**: Plus enhanced AI capabilities
- **AI Responses**: AI provides feedback on daily notes and progress
- **AI Suggestions**: Personalized next actions based on progress patterns
- **Smart Notifications**: AI-driven alerts when falling behind or achieving milestones
- **Progress Insights**: Weekly AI-generated progress analysis
- **Goal Optimization**: AI recommendations for goal adjustments

#### Growth Plan Goal Features
- **All Learn Features**: Plus human instructor support
- **Human Instructor Chat**: Real instructor responses to daily updates
- **Custom Goal Planning**: One-on-one goal planning session with instructor
- **Weekly Check-ins**: Scheduled instructor progress reviews
- **Task Assignment**: Instructor can assign specific tasks and milestones
- **Priority Support**: Fast response times for questions and guidance

### Course Access Features

#### Free Plan Course Access
- **Course Previews**: Access to 1 full lesson per course as preview
- **Community Read-Only**: Can view community discussions but not participate
- **No Quiz Access**: Cannot take AI-powered quizzes
- **No Certificates**: No completion certificates or progress tracking

#### Learn Plan Course Access
- **Full Course Library**: Access to all courses and lessons
- **Interactive Quizzes**: AI-powered quizzes with immediate feedback
- **Community Participation**: Full community access with posting privileges
- **Progress Analytics**: Detailed learning analytics and progress reports
- **AI-Powered Reflections**: AI evaluates and responds to video reflections
- **Download Access**: Offline access to course materials
- **Learn Rate Tracking**: Monitors learning efficiency (per Unpuzzle concepts)
- **Execution Rate Tracking**: Tracks quiz completion rates
- **Execution Pace Tracking**: Measures response speed to AI prompts

#### Growth Plan Course Access
- **All Learn Features**: Plus instructor oversight
- **Instructor Course Guidance**: Human instructor monitors course progress
- **Custom Learning Paths**: Instructor creates personalized course sequences
- **Priority AI Responses**: Faster AI feedback on reflections and quizzes
- **Instructor-Reviewed Work**: Human evaluation of complex assignments
- **Live Q&A Sessions**: Access to instructor-led group calls

### Community Features

#### Free Plan Community
- **Read-Only Access**: Can view discussions and posts
- **No Posting**: Cannot create posts or comment
- **No Messaging**: Cannot send direct messages to other members

#### Learn Plan Community
- **Full Participation**: Create posts, comment, and engage fully
- **Direct Messaging**: Connect with other Learn and Growth members
- **AI Moderation**: AI helps moderate discussions and suggests helpful responses
- **Study Groups**: Join and create study groups with other members

#### Growth Plan Community
- **All Learn Features**: Plus premium community benefits
- **Instructor Access**: Direct access to instructors in community
- **Priority Support**: Priority responses in community questions
- **Exclusive Channels**: Access to Growth-only discussion channels

## Page-by-Page UX Specifications

### Student Dashboard Page (`/student`)

#### Free Plan Dashboard
- **Goal Progress Card**: Shows basic progress bar and current day
- **Upgrade Prompts**: Prominent CTAs to upgrade for AI feedback
- **Limited Course Access**: Shows locked course cards with "Upgrade to Learn" buttons
- **Community Preview**: Shows recent community activity with "Join the conversation" upgrade prompt
- **Feature Locks**: Visual indicators showing locked features (AI responses, full courses)

#### Learn Plan Dashboard  
- **Enhanced Goal Progress**: Progress card with AI insights and suggestions
- **Course Progress Grid**: Full access to course library with progress indicators
- **Community Activity Feed**: Recent community posts and interactions
- **AI Recommendations**: Personalized course and goal recommendations
- **Analytics Preview**: Learning rate and execution metrics overview

#### Growth Plan Dashboard
- **Premium Goal Section**: Goal progress with recent instructor messages
- **Instructor Communication**: Quick access to instructor chat
- **Priority Course Access**: Featured courses recommended by instructor
- **Exclusive Content**: Access to Growth-only resources and content

### Goals Page (`/student/goals`)

#### Free Plan Goals Page
**Visual State**: Full goals interface visible but with interaction limitations

**Header Section**:
- Goal title, progress bar, and day counter (same as all plans)
- Subtle "Upgrade for AI feedback" text below progress bar

**Today's Activity Section**:
- Unpuzzle tracked activities displayed normally
- Daily update input field present and functional
- "Save Day X" button works for logging updates
- No response or feedback area shown

**Timeline Section**:
- Historical daily entries displayed
- Only shows user's own notes and tracked activities
- No AI responses or instructor messages in timeline
- Clean, simple presentation focused on self-tracking

**Upgrade Prompts**:
- Subtle banner: "Get AI feedback on your progress - Upgrade to Learn Plan"
- CTA buttons strategically placed but not overwhelming
- Focus on value of feedback and guidance

#### Learn Plan Goals Page
**Visual State**: Enhanced with AI interaction capabilities

**Header Section**:
- Same goal tracking as Free plan
- AI insights badge showing recent AI analysis

**Today's Activity Section**:
- Unpuzzle tracked activities with AI commentary
- Enhanced daily input with AI prompt suggestions
- "Save Day X" button with "Get AI Feedback" indicator

**AI Response Area**:
- AI responses to daily updates appear below user notes
- AI suggestions for tomorrow's actions
- Smart notifications and encouragement from AI

**Timeline Section**:
- Historical entries with AI responses displayed
- AI progress insights and pattern recognition
- Visual indicators distinguishing user content from AI responses

**Premium Features Access**:
- "Upgrade to Growth for instructor support" CTA in sidebar

#### Growth Plan Goals Page
**Visual State**: Full premium experience with instructor interaction

**Header Section**:
- Goal tracking with instructor oversight indicators
- Recent instructor message preview

**Instructor Chat Integration**:
- Real-time messaging with assigned instructor
- Instructor can view all progress and respond personally
- Weekly check-in scheduling interface

**Enhanced Activity Section**:
- Instructor can see all activities and add comments
- Task assignment area where instructor adds specific actions
- Priority indicators for instructor-assigned tasks

**Timeline Section**:
- Full conversation history with instructor
- Instructor insights and personalized guidance
- Goal adjustment recommendations from instructor

### Courses Page (`/student/courses`)

#### Free Plan Courses
**Visual State**: Course library with clear upgrade paths

**Course Grid**:
- All courses visible with locked state indicators
- "1 Lesson Preview Available" badges on each course
- Upgrade prompts on hover: "Unlock full course with Learn Plan"

**Preview Access**:
- Can access first lesson of any course
- Clear messaging: "This is lesson 1 of 15 - Upgrade for full access"
- End of preview shows upgrade CTA with course value proposition

#### Learn Plan Courses
**Visual State**: Full course access with AI features

**Course Grid**:
- All courses unlocked and accessible
- Progress indicators and completion status
- AI recommendations for next courses

**Course Experience**:
- Full lessons with AI quizzes and reflections
- Progress tracking with learn rate analytics
- AI feedback on quiz performance and reflections

#### Growth Plan Courses
**Visual State**: Premium course experience with instructor oversight

**Course Grid**:
- Instructor-recommended courses highlighted
- Custom learning paths created by instructor
- Priority access indicators

**Enhanced Course Experience**:
- Instructor monitoring of course progress
- Human evaluation of complex assignments
- Instructor can assign specific courses and lessons

### Community Page (`/student/community`)

#### Free Plan Community
**Visual State**: Read-only community experience

**Community Feed**:
- Can view all posts and discussions
- "Join the conversation" overlay on interaction elements
- Upgrade prompts: "Participate fully with Learn Plan"

**Profile Limitations**:
- Basic profile with "Upgrade to unlock full community features"
- Cannot send messages or create posts

#### Learn Plan Community
**Visual State**: Full community participation

**Community Features**:
- Create posts, comment, and engage fully
- Direct messaging with other members
- Study group creation and participation
- AI moderation assistance

#### Growth Plan Community
**Visual State**: Premium community with instructor access

**Enhanced Features**:
- Access to Growth-only discussion channels
- Direct instructor availability in community
- Priority support and responses
- Exclusive content and discussions

## Technical Implementation Requirements

### State Management (Following Architecture Principles)

#### Plan Detection
- **TanStack Query**: Manages user plan data from server
- **Server Actions**: Handle plan verification and feature access
- **Zustand**: Manages UI state for upgrade modals and feature locks

#### Feature Gating Pattern
- Components read plan data from TanStack Query
- Feature availability computed based on plan tier
- Upgrade CTAs managed through Zustand modal state
- No data mixing between plan state and feature state

### Upgrade Flow Implementation

#### In-App Upgrade CTAs
- Contextual upgrade prompts based on attempted feature usage
- Plan comparison modals triggered from feature gates
- Smooth transition from feature attempt to upgrade flow

#### Billing Integration
- Stripe checkout integration for plan upgrades
- Annual/monthly billing toggle with savings display
- Plan change handling for existing subscribers

### Visual Design Patterns

#### Feature Lock Indicators
- Consistent visual language for locked features
- Progressive disclosure of premium capabilities
- Upgrade value proposition at point of need

#### Plan Badge System
- User plan badges in navigation and profile
- Feature availability indicators throughout interface
- Clear plan benefit communication

## Revenue Optimization Strategies

### Conversion Funnels

#### Free to Learn Conversion
- **Hook**: Goal tracking addiction and progress visibility
- **Value Demonstration**: AI feedback preview in Free plan
- **Conversion Trigger**: When user wants guidance on daily updates
- **Target**: 15-20% conversion rate from Free to Learn

#### Learn to Growth Conversion  
- **Hook**: AI limitations and desire for human connection
- **Value Demonstration**: Instructor expertise and personalized guidance
- **Conversion Trigger**: When AI cannot provide sufficient guidance
- **Target**: 5-8% conversion rate from Learn to Growth

### Pricing Psychology

#### Annual Plan Incentives
- Significant savings clearly displayed (25% off annually)
- Commitment psychology increases completion rates
- Better cash flow for business operations

#### Feature Value Stacking
- Each plan tier adds significant value over previous
- Clear feature differentiation prevents confusion
- Premium pricing justified by human instructor access

## Success Metrics and KPIs

### Engagement Metrics
- **Free Plan**: Daily goal updates, time spent in app, upgrade attempt frequency
- **Learn Plan**: AI interaction frequency, course completion rates, community participation
- **Growth Plan**: Instructor message frequency, goal achievement rates, retention

### Revenue Metrics
- **Monthly Recurring Revenue (MRR)**: Target $20k first milestone
- **Annual Contract Value (ACV)**: Focus on annual plan adoption
- **Churn Rates**: Monitor by plan tier for optimization opportunities
- **Lifetime Value (LTV)**: Calculate by plan tier for marketing optimization

### Feature Adoption Metrics
- Goal tracking daily active usage across all plans
- Course completion rates by plan tier
- Community engagement levels by plan tier
- AI vs instructor interaction satisfaction scores

This specification provides the foundation for implementing a conversion-optimized, architecturally-sound plan tier system that supports Unpuzzle's goal of reaching $20k MRR while maintaining platform quality and user experience standards.