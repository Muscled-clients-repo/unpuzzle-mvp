# AI Assistant Endpoints - Detailed Specifications

**Date:** 2025-08-26  
**Purpose:** Complete API specification for all AI assistant endpoints

## 🔧 **Complete Endpoint Requirements (10 Total)**

### **1. Core AI Agent Endpoints (5 endpoints)**

#### **POST /api/v1/ai-assistant/chat/send/**
**Purpose**: Send message to AI chat assistant with video context  
**Frontend Usage**: Main chat interface in `AIChatSidebar`  
**Request**:
```json
{
  "message": "Can you explain this concept?",
  "session_id": "uuid-string",
  "context": {
    "video_id": "video-123",
    "course_id": "course-456", 
    "timestamp": 120.5,
    "transcript_segment": "CSS flexbox properties..."
  }
}
```
**Response**:
```json
{
  "response": "AI generated response text",
  "session_id": "uuid-string",
  "message_id": "msg-uuid",
  "tokens_used": 45,
  "cached": false
}
```

#### **POST /api/v1/ai-assistant/agents/hint/**
**Purpose**: Generate contextual learning hint based on video content  
**Frontend Usage**: "Hint" button in AI sidebar quick actions  
**Request**:
```json
{
  "video_id": "video-123",
  "timestamp": 120.5,
  "transcript_segment": "CSS flexbox properties allow you to...",
  "user_difficulty": "confused about alignment"
}
```
**Response**:
```json
{
  "hint": "Remember: align-items controls cross-axis alignment in flexbox",
  "confidence": 0.85,
  "agent_type": "hint",
  "tokens_used": 23
}
```

#### **POST /api/v1/ai-assistant/agents/quiz/**
**Purpose**: Generate knowledge check quiz from video content  
**Frontend Usage**: "Quiz" button in AI sidebar quick actions  
**Request**:
```json
{
  "video_id": "video-123",
  "transcript_segments": ["CSS flexbox is a layout method", "It works on two axes"],
  "difficulty_level": "medium"
}
```
**Response**:
```json
{
  "question": "What are the two axes in CSS flexbox?",
  "options": ["Main and cross", "X and Y", "Horizontal and vertical", "Primary and secondary"],
  "correctAnswer": 0,
  "explanation": "Flexbox works on main axis (flex-direction) and cross axis (perpendicular)",
  "agent_type": "quiz",
  "tokens_used": 67
}
```

#### **POST /api/v1/ai-assistant/agents/reflection/**
**Purpose**: Generate reflection prompts for learning consolidation  
**Frontend Usage**: "Reflect" button in AI sidebar quick actions  
**Request**:
```json
{
  "completed_topics": ["CSS flexbox", "Grid layout"],
  "learning_objectives": ["Master CSS layouts", "Build responsive designs"],
  "video_id": "video-123"
}
```
**Response**:
```json
{
  "prompt": "How would you decide between flexbox and grid for a layout?",
  "guidingQuestions": [
    "What are the strengths of each approach?",
    "When would you use one over the other?",
    "Can you think of specific use cases?"
  ],
  "expectedLength": "medium",
  "agent_type": "reflection",
  "tokens_used": 89
}
```

#### **POST /api/v1/ai-assistant/agents/path/**
**Purpose**: Generate personalized learning path recommendations  
**Frontend Usage**: "Path" button in AI sidebar quick actions  
**Request**:
```json
{
  "user_id": 123,
  "struggling_concepts": ["CSS Grid", "Responsive design"],
  "completed_concepts": ["HTML basics", "CSS flexbox"],
  "learning_goals": ["Build modern web layouts", "Master CSS"]
}
```
**Response**:
```json
{
  "detectedIssues": ["Need more grid practice", "Missing responsive design fundamentals"],
  "recommendedContent": [
    {
      "type": "video",
      "title": "CSS Grid Complete Guide",
      "description": "Comprehensive grid layout tutorial",
      "difficulty": "intermediate", 
      "estimatedTime": "25 min",
      "priority": 1
    }
  ],
  "nextSteps": ["Practice grid layouts", "Learn media queries"],
  "agent_type": "path",
  "tokens_used": 156
}
```

### **2. Session Management Endpoints (1 endpoint)**

#### **GET /api/v1/ai-assistant/chat/history/\<session_id\>/**
**Purpose**: Retrieve chat conversation history for session persistence  
**Frontend Usage**: Load previous conversation when user returns to page  
**When Called**: Page load, when `AIChatSidebar` component mounts  
**Request**: GET with session UUID in URL  
**Response**:
```json
{
  "session_id": "session-uuid",
  "course_id": "course-456",
  "video_id": "video-123",
  "messages": [
    {
      "id": "msg-uuid",
      "message_type": "user",
      "content": "What is flexbox?",
      "context": {"video_id": "video-123", "timestamp": 120},
      "created_at": "2025-08-26T10:30:00Z"
    },
    {
      "id": "msg-uuid-2", 
      "message_type": "assistant",
      "content": "Flexbox is a CSS layout method...",
      "agent_type": "chat",
      "created_at": "2025-08-26T10:30:05Z"
    }
  ],
  "total_messages": 24,
  "created_at": "2025-08-26T09:15:00Z",
  "updated_at": "2025-08-26T10:30:05Z"
}
```

### **3. Transcript Processing Endpoints (2 endpoints)**

#### **POST /api/v1/ai-assistant/transcript/search/**
**Purpose**: Search transcript content for relevant segments  
**Frontend Usage**: Find specific content when user asks about topics  
**When Called**: AI needs context, user searches transcript content  
**Request**:
```json
{
  "video_id": "video-123",
  "query": "flexbox alignment", 
  "limit": 5
}
```
**Response**:
```json
{
  "results": [
    {
      "text": "Flexbox alignment is controlled by align-items property",
      "start_time": 120.5,
      "end_time": 125.0,
      "similarity": 0.92,
      "chunk_id": "chunk-uuid"
    },
    {
      "text": "Use justify-content for main axis alignment",
      "start_time": 145.2,
      "end_time": 148.8,
      "similarity": 0.87,
      "chunk_id": "chunk-uuid-2"
    }
  ],
  "total_results": 12,
  "search_time_ms": 156
}
```

#### **POST /api/v1/ai-assistant/transcript/reference/**
**Purpose**: Save user's selected transcript segments for AI context  
**Frontend Usage**: When user selects text from video transcript in player  
**When Called**: User highlights transcript text, clicks "Ask AI about this"  
**Request**:
```json
{
  "video_id": "video-123",
  "start_time": 120.5,
  "end_time": 135.0,
  "text": "CSS flexbox properties allow you to align items easily",
  "purpose": "ai_context"
}
```
**Response**:
```json
{
  "reference_id": "ref-uuid",
  "saved": true,
  "message": "Transcript reference saved successfully",
  "expires_at": "2025-08-26T12:00:00Z"
}
```

### **4. User Analytics & Management Endpoints (2 endpoints)**

#### **GET /api/v1/ai-assistant/user/ai-stats/**
**Purpose**: Get user's AI usage statistics and metrics  
**Frontend Usage**: Display usage stats, track learning progress  
**When Called**: Dashboard load, settings page, usage monitoring  
**Request**: GET with user authentication  
**Response**:
```json
{
  "user_id": 123,
  "metrics": {
    "total_interactions": 45,
    "hints_generated": 12,
    "quizzes_completed": 8,
    "reflections_submitted": 5,
    "learning_paths_created": 3
  },
  "daily_usage": {
    "interactions_today": 7,
    "limit": 50,
    "remaining": 43,
    "reset_time": "2025-08-27T00:00:00Z"
  },
  "monthly_usage": {
    "interactions_this_month": 156,
    "limit": 1000,
    "remaining": 844
  },
  "subscription_plan": "premium",
  "cost_this_month": 2.34
}
```

#### **POST /api/v1/ai-assistant/user/check-limits/**
**Purpose**: Check if user can make AI requests based on subscription limits  
**Frontend Usage**: Before enabling AI features, validate usage  
**When Called**: Before any AI agent call, on component mount  
**Request**:
```json
{
  "agent_type": "hint",
  "estimated_tokens": 50
}
```
**Response**:
```json
{
  "can_use_ai": true,
  "remaining_interactions": 43,
  "daily_limit": 50,
  "monthly_limit": 1000,
  "subscription_plan": "premium", 
  "reset_time": "2025-08-27T00:00:00Z",
  "cost_estimate": 0.002,
  "upgrade_required": false,
  "upgrade_message": null
}
```

**When User Hits Limit**:
```json
{
  "can_use_ai": false,
  "remaining_interactions": 0,
  "daily_limit": 3,
  "subscription_plan": "free",
  "reset_time": "2025-08-27T00:00:00Z",
  "upgrade_required": true,
  "upgrade_message": "Daily AI limit reached (3/3). Upgrade to Premium for unlimited AI help!"
}
```

## 🔄 **Frontend-Backend Data Flow**

### **Typical User AI Interaction Flow:**

1. **User loads course learning page**
   - `GET /api/v1/ai-assistant/user/check-limits/` - Check if AI features available
   - `GET /api/v1/ai-assistant/chat/history/<session>/` - Load previous chat (if exists)

2. **User clicks "Hint" button**
   - `POST /api/v1/ai-assistant/user/check-limits/` - Verify can use AI
   - `POST /api/v1/ai-assistant/agents/hint/` - Generate hint
   - `POST /api/v1/ai-assistant/chat/send/` - Save hint to chat history

3. **User selects transcript text and asks AI**
   - `POST /api/v1/ai-assistant/transcript/reference/` - Save selected text
   - `POST /api/v1/ai-assistant/chat/send/` - Send question with transcript context

4. **User asks follow-up questions**
   - `POST /api/v1/ai-assistant/transcript/search/` - Find relevant content (if needed)
   - `POST /api/v1/ai-assistant/chat/send/` - Continue conversation

5. **User views usage stats**
   - `GET /api/v1/ai-assistant/user/ai-stats/` - Show metrics dashboard

## 📊 **Error Handling**

### **Common Error Responses:**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Daily AI limit reached. Upgrade for unlimited access.",
  "code": 429,
  "details": {
    "current_usage": 50,
    "limit": 50,
    "reset_time": "2025-08-27T00:00:00Z"
  }
}
```

```json
{
  "error": "insufficient_context",
  "message": "Video transcript not available for AI processing",
  "code": 400,
  "details": {
    "video_id": "video-123",
    "transcript_status": "processing"
  }
}
```

```json
{
  "error": "openai_api_error", 
  "message": "AI service temporarily unavailable",
  "code": 503,
  "retry_after": 30
}
```

## 🔐 **Authentication & Authorization**

All endpoints require:
- **Authentication**: Valid user token/session
- **Authorization**: User must have access to the specific course/video
- **Rate Limiting**: Per-endpoint rate limits based on subscription
- **Input Validation**: All user inputs sanitized before OpenAI API calls

## 📈 **Performance Considerations**

- **Caching**: Cache AI responses for identical prompts (1 hour TTL)
- **Async Processing**: Long AI operations run in background
- **Rate Limiting**: Prevent API abuse and control costs
- **Token Tracking**: Monitor OpenAI usage for billing
- **Database Indexing**: Optimize transcript search performance