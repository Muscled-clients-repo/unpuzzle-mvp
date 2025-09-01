# Unpuzzle MVP Backend API Documentation

**Version:** 1.0.0  
**Base URL:** `https://api.unpuzzle.com`  
**API Version:** `/api/v1/`  
**Last Updated:** September 1, 2025

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
   - [Authentication & User Management](#authentication--user-management)
   - [Course Management](#course-management)
   - [Content Management](#content-management)
   - [Media Library](#media-library)
   - [AI Assistant](#ai-assistant)
   - [Payments](#payments)
   - [Enrollments](#enrollments)
   - [Analytics](#analytics)
   - [Notifications](#notifications)
   - [Puzzle Reflections](#puzzle-reflections)
4. [Request/Response Formats](#requestresponse-formats)
5. [Error Codes](#error-codes)
6. [Rate Limiting](#rate-limiting)
7. [Webhooks](#webhooks)

---

## Overview

The Unpuzzle MVP Backend API is a RESTful API built with Django REST Framework that powers the Unpuzzle learning management system. It provides comprehensive endpoints for course management, user authentication, AI-powered learning assistance, media handling, and payment processing.

### Key Features
- JWT-based authentication with Supabase integration
- OAuth support for 10+ providers
- AI-powered learning assistant with GPT-4
- Chunked file upload for large media files
- Stripe payment integration
- Row Level Security (RLS) for data isolation
- Real-time processing with Celery
- CDN integration for media delivery

### Technology Stack
- **Framework:** Django 5.0.1 + Django REST Framework 3.14.0
- **Database:** PostgreSQL with Row Level Security
- **Authentication:** Supabase Auth with JWT
- **Cache:** Redis
- **Task Queue:** Celery
- **File Storage:** Backblaze B2 with CDN
- **Payment Processing:** Stripe
- **AI Services:** OpenAI GPT-4

---

## Authentication

### Authentication Methods

#### 1. JWT Bearer Token
Include the JWT token in the Authorization header:
```http
Authorization: Bearer <jwt_token>
```

#### 2. HTTP-Only Cookie
The API also supports authentication via HTTP-only cookies set during login.

### Public Endpoints
The following endpoints do not require authentication:
- Health check and API info
- Authentication endpoints (signup, signin, password reset)
- Public course listing and details
- Course reviews
- Payment webhooks
- OAuth provider information

### Protected Endpoints
All other endpoints require valid authentication unless otherwise specified.

---

## API Endpoints

### Authentication & User Management

#### **Sign Up**
```http
POST /api/v1/auth/signup/
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "John Doe",
  "metadata": {
    "source": "web",
    "referral_code": "FRIEND123"
  }
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2025-01-01T00:00:00Z"
  },
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "expires_at": "2025-01-02T00:00:00Z"
}
```

#### **Sign In**
```http
POST /api/v1/auth/signin/
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "roles": ["student"],
    "subscription": {
      "plan": "free",
      "ai_limit": 3,
      "ai_used": 1
    }
  },
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "expires_at": "2025-01-02T00:00:00Z"
}
```

#### **Refresh Token**
```http
POST /api/v1/auth/refresh/
```

**Request Body:**
```json
{
  "refresh_token": "refresh_token"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "new_jwt_token",
  "refresh_token": "new_refresh_token",
  "expires_at": "2025-01-02T00:00:00Z"
}
```

#### **OAuth Sign In**
```http
POST /api/v1/auth/oauth/signin/
```

**Request Body:**
```json
{
  "provider": "google",
  "redirect_url": "https://app.unpuzzle.com/auth/callback"
}
```

**Response:** `200 OK`
```json
{
  "auth_url": "https://accounts.google.com/oauth/authorize?...",
  "state": "random_state_string"
}
```

#### **OAuth Callback**
```http
POST /api/v1/auth/oauth/callback/
```

**Request Body:**
```json
{
  "provider": "google",
  "code": "authorization_code",
  "state": "random_state_string"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar_url": "https://..."
  },
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "is_new_user": false
}
```

#### **Get User Profile**
```http
GET /api/v1/auth/profile/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "avatar_url": "https://...",
  "bio": "Software developer and lifelong learner",
  "roles": ["student", "instructor"],
  "subscription": {
    "plan": "premium",
    "ai_limit": 50,
    "ai_used": 12,
    "valid_until": "2025-12-31T23:59:59Z"
  },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-15T00:00:00Z"
}
```

#### **Update User Profile**
```http
PUT /api/v1/auth/profile/update/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "full_name": "John Updated Doe",
  "bio": "Updated bio",
  "avatar_url": "https://new-avatar.com/image.jpg",
  "preferences": {
    "email_notifications": true,
    "learning_reminders": false
  }
}
```

**Response:** `200 OK`
```json
{
  "message": "Profile updated successfully",
  "profile": {
    "id": "uuid",
    "full_name": "John Updated Doe",
    "bio": "Updated bio",
    "avatar_url": "https://new-avatar.com/image.jpg"
  }
}
```

---

### Course Management

#### **List Published Courses (Public)**
```http
GET /api/v1/courses/
```

**Query Parameters:**
- `page` (integer): Page number for pagination (default: 1)
- `page_size` (integer): Items per page (default: 20, max: 100)
- `category` (string): Filter by category slug
- `search` (string): Search in title and description
- `difficulty` (string): Filter by difficulty (beginner, intermediate, advanced)
- `sort` (string): Sort by field (title, created_at, price, rating)
- `order` (string): Sort order (asc, desc)

**Response:** `200 OK`
```json
{
  "count": 150,
  "next": "https://api.unpuzzle.com/api/v1/courses/?page=2",
  "previous": null,
  "results": [
    {
      "id": "course_uuid",
      "title": "Introduction to Python Programming",
      "slug": "intro-python-programming",
      "description": "Learn Python from scratch...",
      "thumbnail_url": "https://cdn.unpuzzle.com/thumbnails/python.jpg",
      "instructor": {
        "id": "instructor_uuid",
        "name": "Jane Smith",
        "avatar_url": "https://..."
      },
      "category": {
        "id": "category_uuid",
        "name": "Programming",
        "slug": "programming"
      },
      "difficulty": "beginner",
      "duration_hours": 12.5,
      "price": 49.99,
      "currency": "USD",
      "rating": 4.8,
      "reviews_count": 234,
      "students_count": 1520,
      "sections_count": 8,
      "lessons_count": 45,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-15T00:00:00Z"
    }
  ]
}
```

#### **Get Course Details (Public)**
```http
GET /api/v1/courses/{course_id}/
```

**Response:** `200 OK`
```json
{
  "id": "course_uuid",
  "title": "Introduction to Python Programming",
  "slug": "intro-python-programming",
  "description": "Comprehensive Python course...",
  "detailed_description": "HTML formatted detailed description...",
  "thumbnail_url": "https://cdn.unpuzzle.com/thumbnails/python.jpg",
  "preview_video_url": "https://cdn.unpuzzle.com/previews/python-intro.mp4",
  "instructor": {
    "id": "instructor_uuid",
    "name": "Jane Smith",
    "avatar_url": "https://...",
    "bio": "10+ years of experience...",
    "courses_count": 15,
    "students_count": 5000,
    "rating": 4.9
  },
  "category": {
    "id": "category_uuid",
    "name": "Programming",
    "slug": "programming"
  },
  "difficulty": "beginner",
  "duration_hours": 12.5,
  "price": 49.99,
  "currency": "USD",
  "rating": 4.8,
  "reviews_count": 234,
  "students_count": 1520,
  "sections": [
    {
      "id": "section_uuid",
      "title": "Getting Started",
      "description": "Setup and basics",
      "order": 1,
      "duration_minutes": 90,
      "lessons_count": 6,
      "is_preview": true
    }
  ],
  "requirements": [
    "Basic computer skills",
    "No programming experience required"
  ],
  "objectives": [
    "Write Python programs from scratch",
    "Understand fundamental programming concepts"
  ],
  "target_audience": [
    "Complete beginners",
    "Students wanting to learn programming"
  ],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-15T00:00:00Z",
  "published_at": "2025-01-05T00:00:00Z"
}
```

#### **Enroll in Course**
```http
POST /api/v1/courses/{course_id}/enroll/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body (for paid courses):**
```json
{
  "payment_method_id": "pm_stripe_method_id",
  "coupon_code": "DISCOUNT20"
}
```

**Response:** `201 Created`
```json
{
  "enrollment_id": "enrollment_uuid",
  "course_id": "course_uuid",
  "user_id": "user_uuid",
  "enrolled_at": "2025-01-20T00:00:00Z",
  "payment": {
    "amount": 39.99,
    "currency": "USD",
    "status": "completed",
    "payment_id": "pi_stripe_payment_id"
  },
  "message": "Successfully enrolled in course"
}
```

#### **Get Student's Enrolled Courses**
```http
GET /api/v1/student/courses/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `status` (string): Filter by progress status (not_started, in_progress, completed)
- `sort` (string): Sort by field (enrolled_at, last_accessed, progress)

**Response:** `200 OK`
```json
{
  "count": 5,
  "results": [
    {
      "enrollment_id": "enrollment_uuid",
      "course": {
        "id": "course_uuid",
        "title": "Introduction to Python Programming",
        "thumbnail_url": "https://...",
        "instructor_name": "Jane Smith",
        "total_duration_hours": 12.5
      },
      "progress": {
        "percentage": 45,
        "completed_lessons": 20,
        "total_lessons": 45,
        "last_accessed_at": "2025-01-19T14:30:00Z",
        "estimated_time_remaining_hours": 6.8
      },
      "enrolled_at": "2025-01-10T00:00:00Z",
      "completed_at": null,
      "certificate_url": null
    }
  ]
}
```

#### **Get Course Progress**
```http
GET /api/v1/student/courses/{course_id}/progress/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:** `200 OK`
```json
{
  "course_id": "course_uuid",
  "overall_progress": 45,
  "sections": [
    {
      "section_id": "section_uuid",
      "title": "Getting Started",
      "progress": 100,
      "completed_lessons": 6,
      "total_lessons": 6,
      "lessons": [
        {
          "lesson_id": "lesson_uuid",
          "title": "Introduction",
          "type": "video",
          "duration_minutes": 10,
          "is_completed": true,
          "completed_at": "2025-01-11T00:00:00Z",
          "watch_time_seconds": 600
        }
      ]
    }
  ],
  "quizzes": {
    "total": 8,
    "completed": 3,
    "average_score": 85
  },
  "last_accessed": {
    "lesson_id": "lesson_uuid",
    "lesson_title": "Variables and Data Types",
    "section_id": "section_uuid",
    "timestamp": "2025-01-19T14:30:00Z"
  },
  "time_spent": {
    "total_minutes": 320,
    "this_week_minutes": 45,
    "today_minutes": 15
  }
}
```

#### **Create Course (Instructor)**
```http
POST /api/v1/instructor/courses/create/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "title": "Advanced React Development",
  "description": "Master React with advanced patterns",
  "detailed_description": "<p>HTML formatted description...</p>",
  "category_id": "category_uuid",
  "difficulty": "advanced",
  "price": 79.99,
  "currency": "USD",
  "thumbnail_url": "https://...",
  "preview_video_url": "https://...",
  "requirements": [
    "JavaScript proficiency",
    "Basic React knowledge"
  ],
  "objectives": [
    "Build complex React applications",
    "Implement advanced patterns"
  ],
  "target_audience": [
    "Intermediate React developers",
    "Frontend engineers"
  ],
  "tags": ["react", "javascript", "frontend", "web development"]
}
```

**Response:** `201 Created`
```json
{
  "id": "course_uuid",
  "title": "Advanced React Development",
  "slug": "advanced-react-development",
  "status": "draft",
  "created_at": "2025-01-20T00:00:00Z",
  "message": "Course created successfully"
}
```

---

### Content Management

#### **Get Course Sections (Instructor)**
```http
GET /api/v1/content/courses/{course_id}/sections/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:** `200 OK`
```json
{
  "count": 8,
  "results": [
    {
      "id": "section_uuid",
      "course_id": "course_uuid",
      "title": "Introduction to React",
      "description": "Getting started with React basics",
      "order": 1,
      "is_published": true,
      "media_count": 6,
      "total_duration_minutes": 75,
      "created_at": "2025-01-10T00:00:00Z",
      "updated_at": "2025-01-15T00:00:00Z"
    }
  ]
}
```

#### **Create Course Section (Instructor)**
```http
POST /api/v1/content/courses/{course_id}/sections/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "title": "State Management",
  "description": "Learn about React state management",
  "order": 3
}
```

**Response:** `201 Created`
```json
{
  "id": "section_uuid",
  "course_id": "course_uuid",
  "title": "State Management",
  "description": "Learn about React state management",
  "order": 3,
  "is_published": false,
  "created_at": "2025-01-20T00:00:00Z"
}
```

#### **Assign Media to Section (Instructor)**
```http
POST /api/v1/content/sections/{section_id}/media/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "media_ids": ["media_uuid_1", "media_uuid_2"],
  "order_mapping": {
    "media_uuid_1": 1,
    "media_uuid_2": 2
  }
}
```

**Response:** `200 OK`
```json
{
  "message": "Media assigned successfully",
  "assigned_count": 2,
  "section_id": "section_uuid"
}
```

---

### Media Library

#### **Initiate File Upload**
```http
POST /api/v1/media/upload/initiate/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "filename": "lesson-01-intro.mp4",
  "file_size": 157286400,
  "content_type": "video/mp4",
  "metadata": {
    "title": "Lesson 1: Introduction",
    "description": "Course introduction video",
    "duration_seconds": 600,
    "course_id": "course_uuid"
  }
}
```

**Response:** `200 OK`
```json
{
  "upload_id": "upload_session_uuid",
  "upload_url": "https://s3.backblazeb2.com/...",
  "upload_method": "PUT",
  "headers": {
    "Authorization": "Bearer b2_token",
    "Content-Type": "video/mp4",
    "X-Bz-File-Name": "lesson-01-intro.mp4"
  },
  "chunk_size": 5242880,
  "total_chunks": 30,
  "expires_at": "2025-01-20T02:00:00Z"
}
```

#### **Complete File Upload**
```http
POST /api/v1/media/upload/complete/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "upload_id": "upload_session_uuid",
  "file_id": "b2_file_id",
  "cdn_url": "https://cdn.unpuzzle.com/videos/lesson-01-intro.mp4"
}
```

**Response:** `200 OK`
```json
{
  "media_id": "media_uuid",
  "filename": "lesson-01-intro.mp4",
  "file_size": 157286400,
  "content_type": "video/mp4",
  "cdn_url": "https://cdn.unpuzzle.com/videos/lesson-01-intro.mp4",
  "thumbnail_url": "https://cdn.unpuzzle.com/thumbnails/lesson-01-intro.jpg",
  "metadata": {
    "title": "Lesson 1: Introduction",
    "duration_seconds": 600
  },
  "created_at": "2025-01-20T00:00:00Z"
}
```

#### **List User Videos**
```http
GET /api/v1/media/videos/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `course_id` (string): Filter by course
- `assigned` (boolean): Filter by assignment status
- `search` (string): Search in filename and title

**Response:** `200 OK`
```json
{
  "count": 25,
  "results": [
    {
      "id": "media_uuid",
      "filename": "lesson-01-intro.mp4",
      "title": "Lesson 1: Introduction",
      "file_size": 157286400,
      "duration_seconds": 600,
      "thumbnail_url": "https://...",
      "cdn_url": "https://...",
      "is_assigned": true,
      "assigned_to": {
        "course_id": "course_uuid",
        "course_title": "Advanced React Development",
        "section_id": "section_uuid",
        "section_title": "Introduction"
      },
      "upload_date": "2025-01-15T00:00:00Z"
    }
  ]
}
```

---

### AI Assistant

#### **Send Chat Message**
```http
POST /api/v1/ai-assistant/chat/send/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "message": "Can you explain React hooks?",
  "session_id": "ai_session_uuid",
  "context": {
    "course_id": "course_uuid",
    "lesson_id": "lesson_uuid",
    "timestamp_seconds": 245
  },
  "include_transcript": true,
  "stream": false
}
```

**Response:** `200 OK`
```json
{
  "message_id": "ai_message_uuid",
  "response": "React hooks are functions that allow you to use state and other React features in functional components...",
  "session_id": "ai_session_uuid",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350,
    "cost_usd": 0.0105
  },
  "references": [
    {
      "type": "transcript",
      "lesson_id": "lesson_uuid",
      "timestamp": 245,
      "content": "...relevant transcript segment..."
    }
  ],
  "suggested_actions": [
    {
      "type": "watch_video",
      "lesson_id": "lesson_uuid",
      "timestamp": 300,
      "label": "Watch explanation of useState"
    }
  ]
}
```

#### **Generate Learning Hint**
```http
POST /api/v1/ai-assistant/agents/hint/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "lesson_id": "lesson_uuid",
  "concept": "React useEffect",
  "difficulty_level": "struggling",
  "previous_hints": []
}
```

**Response:** `200 OK`
```json
{
  "hint_id": "hint_uuid",
  "hint": "Think about useEffect as a way to synchronize your component with external systems...",
  "level": "basic",
  "next_hint_available": true,
  "related_examples": [
    {
      "code": "useEffect(() => { fetchData(); }, [dependency]);",
      "explanation": "This effect runs when 'dependency' changes"
    }
  ]
}
```

#### **Generate Quiz Questions**
```http
POST /api/v1/ai-assistant/agents/quiz/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "lesson_id": "lesson_uuid",
  "topics": ["React hooks", "useState", "useEffect"],
  "question_count": 5,
  "difficulty": "intermediate",
  "question_types": ["multiple_choice", "true_false"]
}
```

**Response:** `200 OK`
```json
{
  "quiz_id": "quiz_uuid",
  "questions": [
    {
      "id": "question_uuid_1",
      "type": "multiple_choice",
      "question": "What is the primary purpose of the useEffect hook?",
      "options": [
        "To manage component state",
        "To perform side effects in functional components",
        "To optimize component rendering",
        "To handle user events"
      ],
      "correct_answer": 1,
      "explanation": "useEffect is designed to handle side effects...",
      "difficulty": "intermediate",
      "points": 10
    }
  ],
  "total_points": 50,
  "passing_score": 35,
  "time_limit_minutes": 10
}
```

#### **Check AI Usage Limits**
```http
GET /api/v1/ai-assistant/user/check-limits/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:** `200 OK`
```json
{
  "subscription_plan": "premium",
  "limits": {
    "daily_limit": 50,
    "monthly_limit": 1500
  },
  "usage": {
    "daily_used": 12,
    "monthly_used": 245,
    "daily_remaining": 38,
    "monthly_remaining": 1255
  },
  "reset_times": {
    "daily_reset": "2025-01-21T00:00:00Z",
    "monthly_reset": "2025-02-01T00:00:00Z"
  },
  "features": {
    "gpt4_access": true,
    "code_execution": true,
    "image_generation": false,
    "priority_queue": true
  }
}
```

---

### Payments

#### **Create Payment Intent**
```http
POST /api/v1/payments/intents/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "course_id": "course_uuid",
  "amount": 49.99,
  "currency": "USD",
  "payment_method": "card",
  "coupon_code": "SAVE20",
  "metadata": {
    "source": "web",
    "campaign": "new_year_sale"
  }
}
```

**Response:** `200 OK`
```json
{
  "payment_intent_id": "pi_stripe_intent_id",
  "client_secret": "pi_stripe_intent_secret",
  "amount": 39.99,
  "currency": "USD",
  "discount": {
    "coupon_code": "SAVE20",
    "discount_amount": 10.00,
    "discount_percentage": 20
  },
  "status": "requires_payment_method",
  "created_at": "2025-01-20T00:00:00Z"
}
```

#### **Confirm Payment**
```http
POST /api/v1/payments/intents/{payment_id}/confirm/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "payment_method_id": "pm_stripe_method_id"
}
```

**Response:** `200 OK`
```json
{
  "status": "succeeded",
  "payment_id": "pay_unpuzzle_uuid",
  "stripe_payment_intent": "pi_stripe_intent_id",
  "enrollment": {
    "enrollment_id": "enrollment_uuid",
    "course_id": "course_uuid",
    "enrolled_at": "2025-01-20T00:00:00Z"
  },
  "receipt_url": "https://receipt.stripe.com/...",
  "message": "Payment successful. You are now enrolled in the course."
}
```

#### **Get Payment History**
```http
GET /api/v1/payments/history/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `start_date` (date): Filter by start date
- `end_date` (date): Filter by end date
- `status` (string): Filter by status (succeeded, failed, refunded)

**Response:** `200 OK`
```json
{
  "count": 5,
  "total_spent": 199.95,
  "results": [
    {
      "payment_id": "pay_unpuzzle_uuid",
      "amount": 49.99,
      "currency": "USD",
      "status": "succeeded",
      "description": "Course: Introduction to Python Programming",
      "course": {
        "id": "course_uuid",
        "title": "Introduction to Python Programming",
        "instructor": "Jane Smith"
      },
      "receipt_url": "https://receipt.stripe.com/...",
      "created_at": "2025-01-10T00:00:00Z"
    }
  ]
}
```

---

### Enrollments

#### **Get User Enrollments**
```http
GET /api/v1/enrollments/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:** `200 OK`
```json
{
  "count": 8,
  "active_enrollments": 5,
  "completed_courses": 3,
  "results": [
    {
      "enrollment_id": "enrollment_uuid",
      "course": {
        "id": "course_uuid",
        "title": "Advanced React Development",
        "thumbnail_url": "https://...",
        "instructor": "John Doe"
      },
      "status": "active",
      "progress_percentage": 65,
      "enrolled_at": "2025-01-05T00:00:00Z",
      "last_accessed_at": "2025-01-19T00:00:00Z",
      "completed_at": null,
      "certificate": null,
      "time_spent_minutes": 480
    }
  ]
}
```

---

### Analytics

#### **Get Learning Analytics**
```http
GET /api/v1/analytics/learning/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `period` (string): Time period (week, month, year, all_time)
- `course_id` (string): Filter by specific course

**Response:** `200 OK`
```json
{
  "period": "month",
  "summary": {
    "total_learning_time_minutes": 1250,
    "courses_in_progress": 3,
    "courses_completed": 2,
    "lessons_completed": 45,
    "quizzes_taken": 12,
    "average_quiz_score": 82,
    "certificates_earned": 2
  },
  "daily_activity": [
    {
      "date": "2025-01-19",
      "minutes_learned": 45,
      "lessons_completed": 2,
      "quizzes_taken": 1
    }
  ],
  "course_progress": [
    {
      "course_id": "course_uuid",
      "course_title": "Python Programming",
      "progress_percentage": 75,
      "time_spent_minutes": 480,
      "last_activity": "2025-01-19T00:00:00Z"
    }
  ],
  "achievements": [
    {
      "type": "streak",
      "title": "7-Day Learning Streak",
      "description": "Learned for 7 consecutive days",
      "earned_at": "2025-01-15T00:00:00Z",
      "icon_url": "https://..."
    }
  ]
}
```

---

### Notifications

#### **Get User Notifications**
```http
GET /api/v1/notifications/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `unread_only` (boolean): Show only unread notifications
- `type` (string): Filter by type (course, payment, achievement, system)

**Response:** `200 OK`
```json
{
  "count": 12,
  "unread_count": 3,
  "results": [
    {
      "id": "notification_uuid",
      "type": "course",
      "title": "New lesson available",
      "message": "A new lesson has been added to 'Python Programming'",
      "is_read": false,
      "action_url": "/courses/python-programming/learn",
      "icon": "lesson",
      "created_at": "2025-01-19T10:00:00Z"
    }
  ]
}
```

#### **Mark Notification as Read**
```http
PUT /api/v1/notifications/{notification_id}/read/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:** `200 OK`
```json
{
  "message": "Notification marked as read",
  "notification_id": "notification_uuid"
}
```

---

### Puzzle Reflections

#### **Create Reflection**
```http
POST /api/v1/reflections/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "lesson_id": "lesson_uuid",
  "type": "puzzle",
  "content": "This concept reminds me of...",
  "tags": ["hooks", "state-management"],
  "visibility": "private"
}
```

**Response:** `201 Created`
```json
{
  "id": "reflection_uuid",
  "lesson_id": "lesson_uuid",
  "type": "puzzle",
  "content": "This concept reminds me of...",
  "tags": ["hooks", "state-management"],
  "visibility": "private",
  "created_at": "2025-01-20T00:00:00Z"
}
```

#### **Get User Reflections**
```http
GET /api/v1/reflections/
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `course_id` (string): Filter by course
- `lesson_id` (string): Filter by lesson
- `type` (string): Filter by type (puzzle, note, question)

**Response:** `200 OK`
```json
{
  "count": 25,
  "results": [
    {
      "id": "reflection_uuid",
      "lesson": {
        "id": "lesson_uuid",
        "title": "Understanding Hooks",
        "course_title": "React Development"
      },
      "type": "puzzle",
      "content": "This concept reminds me of...",
      "tags": ["hooks", "state-management"],
      "visibility": "private",
      "created_at": "2025-01-15T00:00:00Z",
      "updated_at": "2025-01-15T00:00:00Z"
    }
  ]
}
```

---

## Request/Response Formats

### Standard Request Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
X-Client-Version: 1.0.0
X-Request-ID: unique_request_id
```

### Standard Success Response
```json
{
  "status": "success",
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "timestamp": "2025-01-20T00:00:00Z"
}
```

### Standard Error Response
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2025-01-20T00:00:00Z",
  "request_id": "unique_request_id"
}
```

### Pagination Format
```json
{
  "count": 100,
  "next": "https://api.unpuzzle.com/endpoint?page=2",
  "previous": "https://api.unpuzzle.com/endpoint?page=1",
  "page_size": 20,
  "page": 2,
  "total_pages": 5,
  "results": []
}
```

---

## Error Codes

### HTTP Status Codes
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no content to return
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required or invalid
- `403 Forbidden` - Authenticated but not authorized
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate enrollment)
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

### Application Error Codes
- `AUTH_INVALID_TOKEN` - Invalid or expired authentication token
- `AUTH_USER_NOT_FOUND` - User account not found
- `AUTH_INVALID_CREDENTIALS` - Invalid email or password
- `COURSE_NOT_FOUND` - Course does not exist
- `COURSE_NOT_PUBLISHED` - Course is not yet published
- `ENROLLMENT_EXISTS` - Already enrolled in course
- `ENROLLMENT_NOT_FOUND` - Enrollment record not found
- `PAYMENT_FAILED` - Payment processing failed
- `PAYMENT_INSUFFICIENT_FUNDS` - Insufficient funds
- `AI_LIMIT_EXCEEDED` - AI usage limit exceeded
- `AI_SERVICE_ERROR` - AI service temporarily unavailable
- `MEDIA_UPLOAD_FAILED` - File upload failed
- `MEDIA_SIZE_EXCEEDED` - File size exceeds limit
- `VALIDATION_ERROR` - Input validation failed
- `PERMISSION_DENIED` - Insufficient permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests

---

## Rate Limiting

### General Limits
- **Anonymous requests:** 100 requests per hour
- **Authenticated requests:** 1000 requests per hour
- **AI endpoints:** Based on subscription plan
  - Free: 3 requests per day
  - Premium: 50 requests per day
  - Enterprise: Custom limits

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1611532800
X-RateLimit-Reset-After: 3600
```

### Rate Limit Response
```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 3600
  }
}
```

---

## Webhooks

### Stripe Payment Webhook
```http
POST /api/v1/payments/webhooks/stripe/
```

**Headers:**
```http
Stripe-Signature: webhook_signature
Content-Type: application/json
```

**Events Handled:**
- `payment_intent.succeeded` - Payment completed
- `payment_intent.failed` - Payment failed
- `charge.refunded` - Refund processed
- `customer.subscription.created` - Subscription created
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription cancelled

### Supabase Auth Webhook
```http
POST /api/v1/auth/webhooks/auth/
```

**Headers:**
```http
X-Supabase-Signature: webhook_signature
Content-Type: application/json
```

**Events Handled:**
- `user.created` - New user registered
- `user.updated` - User profile updated
- `user.deleted` - User account deleted
- `session.created` - User logged in
- `session.ended` - User logged out

---

## API Versioning

The API uses URL versioning. The current version is `v1`.

### Version Header
Include the API version in requests:
```http
X-API-Version: 1.0.0
```

### Deprecation Policy
- Deprecated endpoints will include a `Deprecation` header
- Minimum 6 months notice before removing endpoints
- Migration guides provided for breaking changes

---

## Security

### Authentication Security
- JWT tokens with 1-hour expiration
- Refresh tokens with 30-day expiration
- Secure HTTP-only cookies for web clients
- Rate limiting on authentication endpoints

### Data Security
- TLS 1.3 encryption for all API traffic
- Row Level Security (RLS) in PostgreSQL
- Encrypted storage for sensitive data
- PCI DSS compliance for payment processing

### CORS Policy
```http
Access-Control-Allow-Origin: https://app.unpuzzle.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, X-API-Version
Access-Control-Allow-Credentials: true
```

---

## Support

### API Status
Check API status at: https://status.unpuzzle.com

### Documentation
Full documentation: https://docs.unpuzzle.com/api

### Support Channels
- Email: api-support@unpuzzle.com
- Developer Forum: https://forum.unpuzzle.com/developers
- GitHub Issues: https://github.com/unpuzzle/api-issues

### SDKs and Libraries
- JavaScript/TypeScript: `npm install @unpuzzle/sdk`
- Python: `pip install unpuzzle-sdk`
- PHP: `composer require unpuzzle/sdk`
- Ruby: `gem install unpuzzle-sdk`

---

## Changelog

### Version 1.0.0 (January 2025)
- Initial API release
- Core authentication system
- Course management endpoints
- AI assistant integration
- Payment processing
- Media upload system
- OAuth provider support
- Real-time notifications
- Analytics dashboard

---

## License

The Unpuzzle API is proprietary software. Usage is subject to the Unpuzzle API Terms of Service.

Copyright © 2025 Unpuzzle. All rights reserved.