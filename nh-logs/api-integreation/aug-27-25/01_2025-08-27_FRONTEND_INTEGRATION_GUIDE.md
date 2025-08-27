# Frontend Integration Guide - AI Assistant & Subscription System

**Date:** 2025-08-27  
**Purpose:** Complete frontend integration guide for AI Assistant and Subscription systems  
**Backend Status:** AI Assistant (95% complete), Subscription System (Core implementation complete)

---

## 📚 **Table of Contents**
1. [AI Assistant Integration](#ai-assistant-integration)
2. [Subscription System Integration](#subscription-system-integration)
3. [Authentication & Headers](#authentication--headers)
4. [Error Handling](#error-handling)
5. [WebSocket Support](#websocket-support)
6. [UI/UX Requirements](#uiux-requirements)

---

## 🤖 **AI Assistant Integration**

### **Overview**
The AI Assistant provides intelligent chat, hints, quizzes, reflections, and learning path recommendations. All interactions are rate-limited based on user subscription tiers.

### **1. Core AI Chat Endpoints**

#### **1.1 Send Chat Message**
```javascript
POST /api/v1/ai-assistant/chat/send/
```

**Request:**
```json
{
  "message": "Can you explain this concept?",
  "session_id": "uuid-string",  // Optional - for conversation continuity
  "context": {
    "video_id": "video123",
    "timestamp": 145.5,
    "course_id": "course456"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "AI response here...",
  "session_id": "uuid-string",
  "message_id": "uuid-string",
  "tokens_used": 150,
  "cached": false,
  "subscription": {
    "plan": "premium",
    "usage_today": 12,
    "limit_today": 50,
    "usage_this_month": 234,
    "limit_this_month": 1000
  }
}
```

**Rate Limit Error (429):**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Daily AI limit reached (3 interactions)",
  "code": 429,
  "details": {
    "can_use": false,
    "reason": "daily_limit_exceeded",
    "current_usage": 3,
    "daily_limit": 3,
    "reset_time": "2025-08-28T00:00:00Z",
    "upgrade_required": true,
    "upgrade_message": "Upgrade to Premium for 50 daily AI interactions"
  }
}
```

#### **1.2 Get Chat History**
```javascript
GET /api/v1/ai-assistant/chat/history/<session_id>/
```

**Response:**
```json
{
  "session": {
    "id": "uuid-string",
    "title": "Linear Algebra Discussion",
    "course_id": "course456",
    "video_id": "video123",
    "created_at": "2025-08-27T10:00:00Z",
    "updated_at": "2025-08-27T11:30:00Z"
  },
  "messages": [
    {
      "id": "msg-uuid-1",
      "message_type": "user",
      "content": "What is a matrix?",
      "created_at": "2025-08-27T10:00:00Z"
    },
    {
      "id": "msg-uuid-2",
      "message_type": "assistant",
      "content": "A matrix is a rectangular array...",
      "agent_type": "chat",
      "created_at": "2025-08-27T10:00:05Z"
    }
  ],
  "pagination": {
    "page": 1,
    "total_pages": 3,
    "total_messages": 45
  }
}
```

#### **1.3 Create New Session**
```javascript
POST /api/v1/ai-assistant/chat/session/
```

**Request:**
```json
{
  "course_id": "course456",
  "video_id": "video123",
  "title": "Optional session title"
}
```

**Response:**
```json
{
  "session_id": "new-uuid-string",
  "created_at": "2025-08-27T12:00:00Z",
  "title": "New Session"
}
```

### **2. Specialized AI Agents**

#### **2.1 Hint Generator**
```javascript
POST /api/v1/ai-assistant/agents/hint/
```

**Request:**
```json
{
  "context": {
    "video_id": "video123",
    "timestamp": 145.5,
    "course_id": "course456",
    "topic": "matrix multiplication",
    "difficulty_level": "intermediate"
  },
  "hint_type": "conceptual"  // or "procedural", "example"
}
```

**Response:**
```json
{
  "hint": "Think about matrices as transformations in space. Each column represents...",
  "hint_level": 1,
  "next_hint_available": true,
  "usage": {
    "feature_available": true,  // false for free users
    "usage_today": 5,
    "limit_today": 50
  }
}
```

#### **2.2 Quiz Generator**
```javascript
POST /api/v1/ai-assistant/agents/quiz/
```

**Request:**
```json
{
  "context": {
    "video_id": "video123",
    "course_id": "course456",
    "topics": ["matrices", "vectors"],
    "difficulty": "intermediate"
  },
  "quiz_type": "multiple_choice",  // or "true_false", "short_answer"
  "num_questions": 5
}
```

**Response:**
```json
{
  "quiz": {
    "id": "quiz-uuid",
    "questions": [
      {
        "id": "q1",
        "question": "What is the result of multiplying a 2x3 matrix by a 3x2 matrix?",
        "type": "multiple_choice",
        "options": [
          "A 2x2 matrix",
          "A 3x3 matrix",
          "A 2x3 matrix",
          "Cannot be multiplied"
        ],
        "correct_answer": "A 2x2 matrix",
        "explanation": "When multiplying matrices..."
      }
    ],
    "metadata": {
      "total_questions": 5,
      "estimated_time": "10 minutes",
      "difficulty": "intermediate"
    }
  },
  "usage": {
    "feature_available": true,
    "usage_today": 2,
    "limit_today": 50
  }
}
```

#### **2.3 Reflection Prompt Generator**
```javascript
POST /api/v1/ai-assistant/agents/reflection/
```

**Request:**
```json
{
  "context": {
    "video_id": "video123",
    "course_id": "course456",
    "learning_duration": 1800,  // seconds
    "topics_covered": ["matrices", "determinants"]
  },
  "reflection_type": "comprehension"  // or "application", "synthesis"
}
```

**Response:**
```json
{
  "reflection": {
    "prompt": "How would you explain the relationship between matrices and linear transformations to someone new to the concept?",
    "follow_up_questions": [
      "What real-world applications can you think of?",
      "Which part was most challenging?"
    ],
    "guidance": "Consider both geometric and algebraic perspectives..."
  },
  "usage": {
    "feature_available": true,
    "usage_today": 1,
    "limit_today": 50
  }
}
```

#### **2.4 Learning Path Recommendations**
```javascript
POST /api/v1/ai-assistant/agents/path/
```

**Request:**
```json
{
  "user_progress": {
    "completed_videos": ["video1", "video2"],
    "current_course": "course456",
    "learning_goals": ["master linear algebra"],
    "difficulty_preference": "challenging"
  }
}
```

**Response:**
```json
{
  "learning_path": {
    "next_recommended": [
      {
        "video_id": "video124",
        "title": "Eigenvalues and Eigenvectors",
        "reason": "Natural progression from matrix operations",
        "estimated_time": "45 minutes"
      }
    ],
    "long_term_path": [
      "Complete Linear Algebra fundamentals",
      "Move to Multivariate Calculus",
      "Applied Machine Learning Mathematics"
    ],
    "personalized_tips": [
      "Focus on problem-solving practice",
      "Review matrix multiplication before proceeding"
    ]
  },
  "usage": {
    "feature_available": false,  // Enterprise only
    "upgrade_required": true,
    "upgrade_message": "Learning paths are available in Enterprise plan"
  }
}
```

### **3. Transcript Services**

#### **3.1 Transcript Search**
```javascript
POST /api/v1/ai-assistant/transcript/search/
```

**Request:**
```json
{
  "query": "eigenvalues",
  "video_id": "video123",
  "semantic_search": true,
  "limit": 5
}
```

**Response:**
```json
{
  "results": [
    {
      "segment_id": "seg-uuid-1",
      "text": "Eigenvalues are special scalars associated with...",
      "start_time": 145.5,
      "end_time": 165.3,
      "similarity_score": 0.92,
      "video_id": "video123"
    }
  ],
  "total_results": 5
}
```

#### **3.2 Save Transcript Reference**
```javascript
POST /api/v1/ai-assistant/transcript/reference/
```

**Request:**
```json
{
  "video_id": "video123",
  "text": "Important concept about eigenvalues...",
  "start_time": 145.5,
  "end_time": 165.3,
  "purpose": "ai_context"
}
```

**Response:**
```json
{
  "reference_id": "ref-uuid",
  "saved": true,
  "expires_at": "2025-08-28T12:00:00Z"
}
```

### **4. AI Usage Analytics**

#### **4.1 Get User AI Stats**
```javascript
GET /api/v1/ai-assistant/user/ai-stats/
```

**Response:**
```json
{
  "subscription_plan": "premium",
  "subscription_status": "active",
  "usage_today": 15,
  "usage_this_period": 345,
  "daily_limit": 50,
  "monthly_limit": 1000,
  "remaining_today": 35,
  "remaining_this_period": 655,
  "daily_usage_percentage": 30.0,
  "monthly_usage_percentage": 34.5,
  "daily_breakdown": [
    {"agent_type": "chat", "count": 10, "tokens": 1500},
    {"agent_type": "hint", "count": 3, "tokens": 200},
    {"agent_type": "quiz", "count": 2, "tokens": 800}
  ],
  "period_breakdown": [
    {"agent_type": "chat", "count": 250, "tokens": 35000, "cost": "1.75"},
    {"agent_type": "hint", "count": 50, "tokens": 3500, "cost": "0.18"},
    {"agent_type": "quiz", "count": 30, "tokens": 12000, "cost": "0.60"},
    {"agent_type": "reflection", "count": 15, "tokens": 2000, "cost": "0.10"}
  ],
  "features": {
    "ai_chat": true,
    "ai_hints": true,
    "ai_quiz": true,
    "ai_reflection": true,
    "ai_path": false,
    "priority_support": true
  },
  "current_period_start": "2025-08-01T00:00:00Z",
  "current_period_end": "2025-08-31T23:59:59Z",
  "days_until_renewal": 4
}
```

#### **4.2 Check Usage Limits (Pre-flight)**
```javascript
POST /api/v1/ai-assistant/user/check-limits/
```

**Request:**
```json
{
  "agent_type": "chat",
  "estimated_tokens": 100
}
```

**Response:**
```json
{
  "can_use_ai": true,
  "remaining_interactions": 35,
  "daily_limit": 50,
  "monthly_limit": 1000,
  "subscription_plan": "premium",
  "reset_time": "2025-08-28T00:00:00Z",
  "cost_estimate": 0.005,
  "upgrade_required": false,
  "upgrade_message": null
}
```

---

## 💳 **Subscription System Integration**

### **Overview**
The subscription system manages user access to AI features through tiered plans (Free, Premium, Enterprise) with Stripe integration for payments.

### **1. Subscription Plans**

#### **1.1 Get Available Plans**
```javascript
GET /api/v1/accounts/subscriptions/plans/
```

**Response:**
```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "display_name": "Free Plan",
      "description": "Get started with basic AI features",
      "price_monthly": 0.00,
      "price_yearly": 0.00,
      "ai_daily_limit": 3,
      "ai_monthly_limit": 50,
      "trial_days": 0,
      "features": {
        "ai_chat": true,
        "ai_hints": false,
        "ai_quiz": false,
        "ai_reflection": false,
        "ai_path": false,
        "priority_support": false
      },
      "is_featured": false
    },
    {
      "id": "premium",
      "name": "Premium",
      "display_name": "Premium Plan",
      "description": "Unlock advanced AI features and higher limits",
      "price_monthly": 19.99,
      "price_yearly": 199.99,
      "ai_daily_limit": 50,
      "ai_monthly_limit": 1000,
      "trial_days": 14,
      "features": {
        "ai_chat": true,
        "ai_hints": true,
        "ai_quiz": true,
        "ai_reflection": true,
        "ai_path": false,
        "priority_support": true,
        "unlimited_courses": true,
        "advanced_analytics": true
      },
      "is_featured": true
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "display_name": "Enterprise Plan",
      "description": "Maximum AI capabilities with custom features",
      "price_monthly": 49.99,
      "price_yearly": 499.99,
      "ai_daily_limit": 200,
      "ai_monthly_limit": 5000,
      "trial_days": 14,
      "features": {
        "ai_chat": true,
        "ai_hints": true,
        "ai_quiz": true,
        "ai_reflection": true,
        "ai_path": true,
        "priority_support": true,
        "custom_models": true,
        "api_access": true,
        "unlimited_courses": true,
        "advanced_analytics": true,
        "white_label": true,
        "dedicated_support": true
      },
      "is_featured": false
    }
  ]
}
```

### **2. Subscription Management**

#### **2.1 Get Current Subscription**
```javascript
GET /api/v1/accounts/subscriptions/current/
```

**Response (Active Subscription):**
```json
{
  "has_subscription": true,
  "subscription": {
    "plan_id": "premium",
    "plan_name": "Premium Plan",
    "status": "active",
    "billing_period": "monthly",
    "current_period_start": "2025-08-01T00:00:00Z",
    "current_period_end": "2025-08-31T23:59:59Z",
    "cancel_at_period_end": false,
    "trial_end": null,
    "is_trial": false,
    "days_until_renewal": 4,
    "last_payment_amount": 19.99,
    "last_payment_date": "2025-08-01T00:00:00Z",
    "next_payment_date": "2025-09-01T00:00:00Z"
  },
  "usage": {
    "ai_usage_today": 15,
    "ai_usage_this_period": 345,
    "ai_daily_limit": 50,
    "ai_monthly_limit": 1000
  },
  "features": {
    "ai_chat": true,
    "ai_hints": true,
    "ai_quiz": true,
    "ai_reflection": true,
    "ai_path": false,
    "priority_support": true
  }
}
```

**Response (No Subscription - Free Tier):**
```json
{
  "has_subscription": false,
  "plan": "free",
  "status": "none",
  "usage": {
    "ai_usage_today": 2,
    "ai_daily_limit": 3
  },
  "features": {
    "ai_chat": true,
    "ai_hints": false,
    "ai_quiz": false,
    "ai_reflection": false,
    "ai_path": false,
    "priority_support": false
  }
}
```

#### **2.2 Create Subscription**
```javascript
POST /api/v1/accounts/subscriptions/create/
```

**Request:**
```json
{
  "plan_id": "premium",
  "billing_period": "monthly",  // or "yearly"
  "payment_method_id": "pm_1234567890",  // Stripe payment method
  "trial": true  // Start with trial period
}
```

**Response:**
```json
{
  "success": true,
  "subscription_id": "sub-uuid",
  "stripe_subscription_id": "sub_1234567890",
  "status": "trialing",
  "trial_end": "2025-09-10T00:00:00Z",
  "message": "Subscription created successfully. Your 14-day trial has started.",
  "client_secret": "seti_1234567890_secret_abc"  // For 3D Secure if required
}
```

#### **2.3 Update Subscription (Upgrade/Downgrade)**
```javascript
PUT /api/v1/accounts/subscriptions/update/
```

**Request:**
```json
{
  "new_plan_id": "enterprise",
  "billing_period": "yearly"  // Optional
}
```

**Response (Upgrade):**
```json
{
  "success": true,
  "subscription": {
    "plan_id": "enterprise",
    "status": "active",
    "message": "Subscription upgraded successfully. Changes are effective immediately."
  },
  "proration": {
    "amount": 15.50,
    "description": "Prorated charge for remaining period"
  }
}
```

**Response (Downgrade):**
```json
{
  "success": true,
  "subscription": {
    "plan_id": "premium",
    "status": "active",
    "message": "Subscription will be downgraded at the end of current billing period",
    "effective_date": "2025-08-31T23:59:59Z"
  }
}
```

#### **2.4 Cancel Subscription**
```javascript
POST /api/v1/accounts/subscriptions/cancel/
```

**Request:**
```json
{
  "reason": "Too expensive",
  "immediate": false  // Cancel at period end
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription will be canceled at the end of the current period",
  "effective_date": "2025-08-31T23:59:59Z",
  "retain_access_until": "2025-08-31T23:59:59Z"
}
```

#### **2.5 Resume Canceled Subscription**
```javascript
POST /api/v1/accounts/subscriptions/resume/
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription resumed successfully",
  "subscription": {
    "plan_id": "premium",
    "status": "active",
    "cancel_at_period_end": false
  }
}
```

### **3. Billing Management**

#### **3.1 Get Payment Methods**
```javascript
GET /api/v1/accounts/billing/payment-methods/
```

**Response:**
```json
{
  "payment_methods": [
    {
      "id": "pm_1234567890",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "exp_month": 12,
        "exp_year": 2027
      },
      "is_default": true,
      "created_at": "2025-08-01T00:00:00Z"
    }
  ],
  "default_payment_method": "pm_1234567890"
}
```

#### **3.2 Add Payment Method**
```javascript
POST /api/v1/accounts/billing/add-payment-method/
```

**Request:**
```json
{
  "payment_method_id": "pm_new_1234567890",
  "set_default": true
}
```

**Response:**
```json
{
  "success": true,
  "payment_method": {
    "id": "pm_new_1234567890",
    "type": "card",
    "card": {
      "brand": "mastercard",
      "last4": "5555",
      "exp_month": 6,
      "exp_year": 2028
    },
    "is_default": true
  }
}
```

#### **3.3 Get Invoices**
```javascript
GET /api/v1/accounts/billing/invoices/
```

**Response:**
```json
{
  "invoices": [
    {
      "id": "inv_1234567890",
      "number": "INV-2025-001",
      "status": "paid",
      "amount": 19.99,
      "currency": "USD",
      "period_start": "2025-08-01T00:00:00Z",
      "period_end": "2025-08-31T23:59:59Z",
      "paid_at": "2025-08-01T00:00:00Z",
      "pdf_url": "https://stripe.com/invoices/inv_1234567890.pdf",
      "items": [
        {
          "description": "Premium Plan (Monthly)",
          "amount": 19.99
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "total_pages": 3,
    "total_invoices": 25
  }
}
```

#### **3.4 Get Upcoming Invoice**
```javascript
GET /api/v1/accounts/billing/upcoming-invoice/
```

**Response:**
```json
{
  "upcoming_invoice": {
    "amount": 19.99,
    "currency": "USD",
    "period_start": "2025-09-01T00:00:00Z",
    "period_end": "2025-09-30T23:59:59Z",
    "billing_date": "2025-09-01T00:00:00Z",
    "items": [
      {
        "description": "Premium Plan (Monthly)",
        "amount": 19.99
      }
    ],
    "proration_adjustments": []
  }
}
```

### **4. Subscription History**
```javascript
GET /api/v1/accounts/subscriptions/history/
```

**Response:**
```json
{
  "history": [
    {
      "id": "hist-uuid-1",
      "action": "create",
      "from_plan": null,
      "to_plan": "premium",
      "created_at": "2025-08-01T00:00:00Z",
      "reason": "",
      "metadata": {
        "trial": true,
        "billing_period": "monthly"
      }
    },
    {
      "id": "hist-uuid-2",
      "action": "trial_end",
      "from_plan": "premium",
      "to_plan": "premium",
      "created_at": "2025-08-15T00:00:00Z",
      "reason": "Trial period ended"
    }
  ]
}
```

---

## 🔐 **Authentication & Headers**

### **Required Headers for All Requests**
```javascript
{
  "Authorization": "Bearer <supabase-jwt-token>",
  "Content-Type": "application/json",
  "X-Client-Version": "1.0.0",  // Optional but recommended
  "X-Request-ID": "unique-request-id"  // Optional for debugging
}
```

### **Authentication Flow**
1. User authenticates with Supabase
2. Receive JWT token from Supabase
3. Include token in all API requests
4. Backend validates token with Supabase
5. User profile is loaded from database

---

## ⚠️ **Error Handling**

### **Standard Error Response Format**
```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "code": 400,  // HTTP status code
  "details": {
    // Additional error context
  }
}
```

### **Common Error Codes**

| Code | Error | Description | Action |
|------|-------|-------------|--------|
| 401 | `unauthorized` | Invalid or missing token | Re-authenticate |
| 403 | `forbidden` | No access to resource | Check permissions |
| 404 | `not_found` | Resource doesn't exist | Verify ID/path |
| 429 | `rate_limit_exceeded` | AI usage limit reached | Show upgrade prompt |
| 402 | `payment_required` | Subscription required | Show pricing page |
| 422 | `validation_error` | Invalid request data | Fix form validation |
| 500 | `server_error` | Internal server error | Retry with backoff |
| 503 | `service_unavailable` | AI service down | Show maintenance message |

### **Handling Rate Limits**
```javascript
// Example rate limit handling
async function callAIEndpoint(request) {
  try {
    const response = await fetch('/api/v1/ai-assistant/chat/send/', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request)
    });
    
    if (response.status === 429) {
      const error = await response.json();
      // Show upgrade modal
      showUpgradeModal({
        message: error.details.upgrade_message,
        currentPlan: error.details.subscription_plan,
        resetTime: error.details.reset_time
      });
      return;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    handleError(error);
  }
}
```

---

## 🔄 **WebSocket Support (Future)**

### **AI Chat Real-time Connection**
```javascript
// WebSocket endpoint for real-time AI chat
ws://api.example.com/ws/ai-chat/<session_id>/

// Connection flow
const ws = new WebSocket('ws://api.example.com/ws/ai-chat/session123/');

ws.onopen = () => {
  // Send authentication
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'supabase-jwt-token'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'ai_response_chunk') {
    // Stream AI response chunks
    appendToChat(data.content);
  }
};
```

---

## 🎨 **UI/UX Requirements**

### **1. AI Assistant UI Components**

#### **Chat Interface**
- **Persistent sidebar** (collapsible on mobile)
- **Session management** (new, switch, delete sessions)
- **Message threading** with timestamps
- **Typing indicators** during AI processing
- **Copy/Export** functionality for messages
- **Context indicators** (video timestamp, course name)

#### **Usage Display**
- **Progress bar** showing daily usage
- **Countdown timer** to next reset
- **Quick stats** (X/50 interactions today)
- **Warning at 80%** usage
- **Blocked state** with clear upgrade CTA

#### **Agent Quick Actions**
- **Floating action buttons** for hints, quiz, reflection
- **Contextual appearance** based on video progress
- **Disabled state** for unavailable features
- **Tooltips** explaining each agent

### **2. Subscription Management UI**

#### **Pricing Page**
- **Plan comparison table** with feature matrix
- **Monthly/Yearly toggle** with savings badge
- **Current plan indicator**
- **Trial badge** for eligible users
- **FAQ section** about billing

#### **Account Settings - Subscription Section**
```
Current Plan: Premium
Status: Active
Renews: Sept 1, 2025

[Manage Subscription] [View Invoices]

Usage This Month:
AI Interactions: 345/1000
Daily Reset: 10 hours

Features:
✓ AI Chat
✓ Smart Hints
✓ Quiz Generation
✓ Reflection Prompts
✗ Learning Paths (Enterprise only)
```

#### **Upgrade Modal**
```
You've reached your daily limit!

Free Plan: 3 AI interactions/day
Current usage: 3/3

Upgrade to Premium:
• 50 AI interactions per day
• Smart hints & quizzes
• Priority support
• Only $19.99/month

[Start 14-day Free Trial] [View Plans]
[Remind me tomorrow]
```

### **3. Loading & Error States**

#### **AI Response Loading**
```
Assistant is thinking...
[Animated dots or spinner]
Estimated response time: 3-5 seconds
```

#### **Error Recovery**
```
Oops! Something went wrong.
The AI service is temporarily unavailable.

[Retry] [Report Issue] [Use Basic Mode]
```

### **4. Mobile Responsiveness**

#### **Mobile AI Chat**
- Full-screen chat mode
- Swipe to show/hide
- Voice input support
- Simplified quick actions

#### **Mobile Subscription**
- Simplified pricing cards
- Native payment sheet integration
- Touch-optimized CTAs

---

## 📊 **Performance Considerations**

### **Caching Strategy**
```javascript
// Cache AI responses locally
const aiCache = new Map();

function getCachedResponse(messageHash) {
  const cached = aiCache.get(messageHash);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    return cached.response;
  }
  return null;
}
```

### **Optimistic Updates**
```javascript
// Show message immediately, then sync
function sendMessage(message) {
  // Add to UI immediately
  addMessageToUI({ type: 'user', content: message, pending: true });
  
  // Send to backend
  api.sendChat(message)
    .then(response => {
      updateMessageStatus('sent');
      addMessageToUI({ type: 'assistant', content: response.message });
    })
    .catch(error => {
      updateMessageStatus('failed');
      showRetryOption();
    });
}
```

### **Pagination & Lazy Loading**
- Load chat history in chunks (20 messages)
- Infinite scroll for history
- Virtual scrolling for long conversations
- Lazy load transcript segments

---

## 🔄 **State Management Recommendations**

### **Global State Structure**
```javascript
{
  ai: {
    sessions: Map<id, Session>,
    currentSession: string,
    messages: Map<sessionId, Message[]>,
    loading: boolean,
    error: Error | null
  },
  subscription: {
    current: Subscription | null,
    plans: Plan[],
    usage: Usage,
    invoices: Invoice[],
    paymentMethods: PaymentMethod[]
  },
  ui: {
    chatVisible: boolean,
    selectedAgent: 'chat' | 'hint' | 'quiz' | 'reflection' | 'path',
    upgradeModalVisible: boolean
  }
}
```

### **Real-time Updates**
```javascript
// Subscribe to usage updates
useEffect(() => {
  const interval = setInterval(async () => {
    const stats = await api.getUserAIStats();
    dispatch(updateUsageStats(stats));
  }, 60000); // Check every minute
  
  return () => clearInterval(interval);
}, []);
```

---

## 🚀 **Quick Start Implementation**

### **1. Basic AI Chat Implementation**
```javascript
import { AIChat } from './components/AIChat';
import { useAI } from './hooks/useAI';

function VideoPlayer({ videoId, courseId }) {
  const { sendMessage, messages, usage } = useAI();
  
  const handleSendMessage = async (message) => {
    const response = await sendMessage(message, {
      video_id: videoId,
      course_id: courseId,
      timestamp: getCurrentTimestamp()
    });
    
    if (response.error === 'rate_limit_exceeded') {
      showUpgradePrompt();
    }
  };
  
  return (
    <>
      <Video />
      <AIChat 
        messages={messages}
        onSend={handleSendMessage}
        usage={usage}
        disabled={usage.remaining_today === 0}
      />
    </>
  );
}
```

### **2. Subscription Management Implementation**
```javascript
import { SubscriptionManager } from './components/SubscriptionManager';
import { useSubscription } from './hooks/useSubscription';

function AccountSettings() {
  const { 
    subscription, 
    plans, 
    updateSubscription,
    cancelSubscription 
  } = useSubscription();
  
  return (
    <SubscriptionManager
      current={subscription}
      plans={plans}
      onUpgrade={(planId) => updateSubscription(planId)}
      onCancel={() => cancelSubscription()}
    />
  );
}
```

---

## 📝 **Testing Checklist**

### **AI Assistant Testing**
- [ ] Send chat message with/without context
- [ ] Hit rate limits and see upgrade prompt
- [ ] Test all agent types (hint, quiz, reflection, path)
- [ ] Verify usage tracking updates
- [ ] Test session management (create, switch, delete)
- [ ] Test transcript search and reference
- [ ] Verify feature availability by plan

### **Subscription Testing**
- [ ] View plans and current subscription
- [ ] Create subscription with trial
- [ ] Upgrade from free to premium
- [ ] Downgrade from enterprise to premium
- [ ] Cancel and resume subscription
- [ ] Add/remove payment methods
- [ ] View invoices and upcoming charges
- [ ] Test Stripe webhook handling

### **Error Handling Testing**
- [ ] Test with invalid/expired token
- [ ] Test rate limit exceeded scenarios
- [ ] Test network failures and retries
- [ ] Test payment failures
- [ ] Test service unavailable states

---

## 📞 **Support & Contact**

### **API Issues**
- Check API status: `/api/v1/health/`
- View API docs: `/api/v1/docs/`
- Report issues: GitHub Issues

### **Integration Support**
- Frontend integration examples
- Postman collection available
- WebSocket testing tools

---

*This integration guide provides comprehensive documentation for implementing both AI Assistant and Subscription features. Refer to the API documentation for detailed schema definitions and additional endpoints.*