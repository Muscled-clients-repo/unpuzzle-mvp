# AI Learning System Django Backend Implementation Plan with OpenAI

**Date:** 2025-08-26  
**Component:** AI-Powered Course Learning System  
**Backend:** Python Django + Django REST Framework  
**Objective:** Implement comprehensive backend system for AI learning agents using OpenAI APIs

## 📊 Current Frontend AI Features Analysis

### Identified AI Components

#### 1. **AI Chat Sidebar** (`/components/student/ai/ai-chat-sidebar.tsx`)
- **Interactive Chat Interface**: Real-time messaging with AI assistant
- **AI Agent Types**: Hint, Quiz, Reflect, Learning Path agents
- **Video Context Integration**: Links chat to specific video timestamps
- **Transcript References**: AI can reference selected transcript segments
- **Quick Actions**: Pre-defined AI interactions (hint, quiz, reflect, path)
- **Rate Limiting**: Subscription-based interaction limits

#### 2. **AI Agent Cards** (`/components/ai/agent-card.tsx`)
- **Four Agent Types**:
  - **Hint Agent**: Provides contextual learning hints
  - **Check Agent**: Generates knowledge check quizzes
  - **Reflect Agent**: Prompts reflection exercises
  - **Path Agent**: Suggests personalized learning paths
- **Visual Indicators**: Color-coded agent identification
- **Interactive Triggers**: Manual activation capabilities

#### 3. **AI State Management** (`/stores/slices/ai-slice.ts`)
- **Chat Message System**: Persistent conversation history
- **Transcript References**: Selected video segment context
- **Interaction Metrics**: Usage tracking and analytics
- **Error Handling**: Comprehensive error state management
- **Rate Limiting**: Built-in usage controls

#### 4. **Video-AI Integration** (`/stores/slices/student-video-slice.ts`)
- **Video Segment Selection**: In/out point marking for AI context
- **Reflection System**: Video-linked reflective exercises
- **Quiz Integration**: Context-aware assessment system
- **Timestamp Tracking**: AI interactions linked to video progress

## 🏗️ Django Project Structure

```
ai_learning_backend/
├── manage.py
├── requirements.txt
├── ai_learning_backend/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── development.py
│   │   ├── production.py
│   │   └── testing.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── ai_agents/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── agents/
│   │   │   ├── hint_agent.py
│   │   │   ├── quiz_agent.py
│   │   │   ├── reflection_agent.py
│   │   │   └── path_agent.py
│   │   └── urls.py
│   ├── ai_chat/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── consumers.py  # WebSocket for real-time chat
│   │   └── urls.py
│   ├── transcripts/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── embedding_service.py
│   │   └── urls.py
│   ├── learning_analytics/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── tasks.py  # Celery tasks
│   │   └── urls.py
│   ├── courses/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py
│   │   └── serializers.py
│   └── users/
│       ├── __init__.py
│       ├── models.py
│       ├── views.py
│       └── serializers.py
├── utils/
│   ├── __init__.py
│   ├── openai_client.py
│   ├── cache_utils.py
│   ├── privacy_filter.py
│   └── rate_limiting.py
└── tests/
    ├── test_ai_agents.py
    ├── test_ai_chat.py
    └── test_transcripts.py
```

## 🗄️ Django Models

### AI Chat Models

```python
# apps/ai_chat/models.py
from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField
import uuid

class ChatSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course_id = models.UUIDField()
    video_id = models.UUIDField(null=True, blank=True)
    session_name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ai_chat_sessions'
        indexes = [
            models.Index(fields=['user', 'course_id', 'created_at']),
        ]

class ChatMessage(models.Model):
    MESSAGE_TYPES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES)
    content = models.TextField()
    context = JSONField(default=dict, blank=True)  # Video context, timestamps
    metadata = JSONField(default=dict, blank=True)  # Agent type, confidence, sources
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ai_chat_messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['session', 'created_at']),
        ]

class TranscriptReference(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    video_id = models.UUIDField()
    start_time = models.DecimalField(max_digits=10, decimal_places=3)
    end_time = models.DecimalField(max_digits=10, decimal_places=3)
    text = models.TextField()
    embedding = models.JSONField(null=True, blank=True)  # Store as JSON array
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'transcript_references'
        indexes = [
            models.Index(fields=['video_id', 'start_time']),
        ]

class AIInteraction(models.Model):
    AGENT_TYPES = [
        ('hint', 'Hint'),
        ('check', 'Check'),
        ('reflect', 'Reflect'),
        ('path', 'Path'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course_id = models.UUIDField()
    video_id = models.UUIDField(null=True, blank=True)
    agent_type = models.CharField(max_length=20, choices=AGENT_TYPES)
    trigger_type = models.CharField(max_length=30)  # 'manual', 'automatic', 'video_pause'
    context = JSONField(default=dict, blank=True)
    request_text = models.TextField(blank=True)
    response_text = models.TextField(blank=True)
    response_time_ms = models.IntegerField(null=True)
    confidence_score = models.DecimalField(max_digits=3, decimal_places=2, null=True)
    user_rating = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ai_interactions'
        indexes = [
            models.Index(fields=['user', 'agent_type', 'created_at']),
        ]

class GeneratedContent(models.Model):
    CONTENT_TYPES = [
        ('hint', 'Hint'),
        ('quiz', 'Quiz'),
        ('reflection', 'Reflection'),
        ('path', 'Path'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    source_id = models.UUIDField()  # video_id, course_id, etc.
    prompt_hash = models.CharField(max_length=64)
    generated_content = JSONField()
    openai_model = models.CharField(max_length=50)
    tokens_used = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'ai_generated_content'
        unique_together = ['content_type', 'source_id', 'prompt_hash']

class UserAIPreferences(models.Model):
    PERSONALITIES = [
        ('friendly', 'Friendly'),
        ('professional', 'Professional'),
        ('peer', 'Peer'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    agent_personality = models.CharField(max_length=20, choices=PERSONALITIES, default='friendly')
    preferred_response_length = models.CharField(max_length=10, default='medium')
    auto_hints_enabled = models.BooleanField(default=True)
    quiz_frequency = models.CharField(max_length=15, default='moderate')
    reflection_prompts_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_ai_preferences'
```

## 🔧 Django Settings Configuration

```python
# ai_learning_backend/settings/base.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# OpenAI Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
OPENAI_ORG_ID = os.getenv('OPENAI_ORG_ID')

# AI Configuration
AI_CONFIG = {
    'MODELS': {
        'CHAT': 'gpt-4-turbo-preview',
        'EMBEDDINGS': 'text-embedding-3-small',
    },
    'LIMITS': {
        'MAX_TOKENS_PER_REQUEST': 4000,
        'MAX_REQUESTS_PER_MINUTE': 100,
        'MAX_TOKENS_PER_DAY': 100000,
    },
    'PERSONALITIES': {
        'friendly': {'temperature': 0.7, 'max_tokens': 300},
        'professional': {'temperature': 0.3, 'max_tokens': 400},
        'peer': {'temperature': 0.8, 'max_tokens': 250},
    },
    'CACHE_TTL': 3600,  # 1 hour
}

# Celery Configuration for async tasks
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')

# Django Channels for WebSocket
ASGI_APPLICATION = 'ai_learning_backend.asgi.application'
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}

# Rate Limiting
RATELIMIT_USE_CACHE = 'default'

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'channels',
    'django_celery_beat',
    'django_ratelimit',
    'apps.ai_agents',
    'apps.ai_chat',
    'apps.transcripts',
    'apps.learning_analytics',
    'apps.courses',
    'apps.users',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}
```

## 🤖 OpenAI Service Implementation

```python
# utils/openai_client.py
import openai
import hashlib
import json
import time
from typing import Dict, List, Optional, Any
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from apps.ai_chat.models import AIInteraction

class OpenAIService:
    def __init__(self):
        openai.api_key = settings.OPENAI_API_KEY
        if settings.OPENAI_ORG_ID:
            openai.organization = settings.OPENAI_ORG_ID
        
        self.personalities = settings.AI_CONFIG['PERSONALITIES']
        self.models = settings.AI_CONFIG['MODELS']
        
    def create_prompt_hash(self, prompt: str) -> str:
        """Create hash for caching purposes"""
        return hashlib.sha256(prompt.encode()).hexdigest()
    
    def get_cached_response(self, cache_key: str) -> Optional[Dict]:
        """Get cached AI response"""
        return cache.get(f"ai_response:{cache_key}")
    
    def set_cached_response(self, cache_key: str, response: Dict, ttl: int = None):
        """Cache AI response"""
        if ttl is None:
            ttl = settings.AI_CONFIG['CACHE_TTL']
        cache.set(f"ai_response:{cache_key}", response, ttl)
    
    async def send_chat_message(
        self,
        message: str,
        context: Optional[Dict] = None,
        personality: str = 'friendly',
        chat_history: List[Dict] = None,
        user_id: Optional[int] = None,
    ) -> Dict:
        """Send chat message to OpenAI"""
        
        start_time = time.time()
        
        try:
            # Build context prompt
            context_prompt = self._build_context_prompt(context or {})
            personality_config = self.personalities.get(personality, self.personalities['friendly'])
            
            # Create system message
            system_message = self._get_system_message(personality, context_prompt)
            
            # Build message history
            messages = [{'role': 'system', 'content': system_message}]
            
            if chat_history:
                messages.extend(chat_history)
            
            messages.append({'role': 'user', 'content': message})
            
            # Check cache first
            cache_key = self.create_prompt_hash(json.dumps(messages))
            cached_response = self.get_cached_response(cache_key)
            
            if cached_response:
                return cached_response
            
            # Call OpenAI API
            response = await openai.ChatCompletion.acreate(
                model=self.models['CHAT'],
                messages=messages,
                temperature=personality_config['temperature'],
                max_tokens=personality_config['max_tokens'],
                presence_penalty=0.1,
                frequency_penalty=0.1
            )
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            result = {
                'content': response.choices[0].message.content,
                'model': response.model,
                'tokens_used': response.usage.total_tokens,
                'response_time_ms': response_time_ms,
                'cached': False
            }
            
            # Cache the response
            self.set_cached_response(cache_key, result)
            
            # Track interaction if user_id provided
            if user_id and context:
                await self._track_interaction(
                    user_id=user_id,
                    agent_type='chat',
                    context=context,
                    request_text=message,
                    response_text=result['content'],
                    response_time_ms=response_time_ms,
                    tokens_used=result['tokens_used']
                )
            
            return result
            
        except Exception as e:
            return {
                'error': str(e),
                'response_time_ms': int((time.time() - start_time) * 1000)
            }
    
    def _build_context_prompt(self, context: Dict) -> str:
        """Build context prompt from video/course context"""
        prompt_parts = ["CURRENT LEARNING CONTEXT:"]
        
        if context.get('transcript_segment'):
            prompt_parts.append(f"Currently viewing: \"{context['transcript_segment']}\"")
        
        if context.get('timestamp'):
            timestamp = context['timestamp']
            minutes, seconds = divmod(int(timestamp), 60)
            prompt_parts.append(f"Video timestamp: {minutes}:{seconds:02d}")
        
        if context.get('course_title'):
            prompt_parts.append(f"Course: {context['course_title']}")
        
        if context.get('video_title'):
            prompt_parts.append(f"Video: {context['video_title']}")
        
        prompt_parts.append("Provide contextual help based on this current learning situation.")
        
        return "\n".join(prompt_parts)
    
    def _get_system_message(self, personality: str, context_prompt: str) -> str:
        """Get system message based on personality"""
        personality_prompts = {
            'friendly': """You are a friendly, encouraging AI tutor helping students learn web development. 
            Provide clear, supportive explanations. Use encouraging language and break down complex concepts into digestible parts.""",
            
            'professional': """You are a professional programming instructor. Provide precise, technical explanations.
            Focus on accuracy and industry best practices. Use formal language and comprehensive examples.""",
            
            'peer': """You are a helpful peer who's learning alongside the student. Use casual, relatable language.
            Share learning tips and common mistakes. Be encouraging and create a collaborative learning environment."""
        }
        
        base_prompt = personality_prompts.get(personality, personality_prompts['friendly'])
        return f"{base_prompt}\n\n{context_prompt}"
    
    async def _track_interaction(self, **kwargs):
        """Track AI interaction for analytics"""
        try:
            AIInteraction.objects.create(**kwargs)
        except Exception as e:
            # Log error but don't fail the request
            print(f"Failed to track AI interaction: {e}")

# Create singleton instance
openai_service = OpenAIService()
```

## 🎯 AI Agent Services

```python
# apps/ai_agents/services.py
from typing import Dict, List, Optional
from utils.openai_client import openai_service
from utils.privacy_filter import PrivacyFilter
import json

class AIAgentService:
    """Base service for AI agents"""
    
    def __init__(self):
        self.privacy_filter = PrivacyFilter()
    
    async def generate_hint(
        self,
        video_id: str,
        timestamp: float,
        transcript_segment: Optional[str] = None,
        user_difficulty: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> Dict:
        """Generate contextual learning hint"""
        
        context = {
            'video_id': video_id,
            'timestamp': timestamp,
            'transcript_segment': transcript_segment,
            'user_difficulty': user_difficulty
        }
        
        prompt = f"""
        ROLE: You are a helpful learning assistant providing targeted hints.
        
        CONTEXT: Student is watching a web development video at timestamp {timestamp}s.
        {f'Current content: "{transcript_segment}"' if transcript_segment else ''}
        {f'Student indicated difficulty with: {user_difficulty}' if user_difficulty else ''}
        
        TASK: Provide a concise, helpful hint that guides learning without giving away the complete answer.
        
        FORMAT: Return only the hint text, 1-2 sentences maximum.
        """
        
        # Filter for privacy
        filtered_prompt = self.privacy_filter.sanitize_for_ai(prompt)
        
        response = await openai_service.send_chat_message(
            message=filtered_prompt,
            context=context,
            personality='friendly',
            user_id=user_id
        )
        
        if 'error' in response:
            return {'error': response['error']}
        
        return {
            'hint': response['content'],
            'confidence': 0.85,
            'tokens_used': response.get('tokens_used', 0)
        }
    
    async def generate_quiz(
        self,
        video_id: str,
        transcript_segments: List[str],
        difficulty_level: str = 'medium',
        user_id: Optional[int] = None
    ) -> Dict:
        """Generate knowledge check quiz"""
        
        transcript_content = '\n'.join(transcript_segments)
        
        prompt = f"""
        ROLE: You are an educational assessment creator.
        
        CONTENT: Based on this video transcript segment:
        "{transcript_content}"
        
        TASK: Create a {difficulty_level} difficulty multiple choice question that tests understanding of the key concept.
        
        FORMAT: Return a JSON object with:
        {{
          "question": "Clear, specific question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0,
          "explanation": "Brief explanation of why the answer is correct"
        }}
        """
        
        context = {
            'video_id': video_id,
            'content_type': 'quiz_generation',
            'difficulty': difficulty_level
        }
        
        response = await openai_service.send_chat_message(
            message=self.privacy_filter.sanitize_for_ai(prompt),
            context=context,
            personality='professional',
            user_id=user_id
        )
        
        if 'error' in response:
            return {'error': response['error']}
        
        try:
            quiz_data = json.loads(response['content'])
            return {
                **quiz_data,
                'tokens_used': response.get('tokens_used', 0)
            }
        except json.JSONDecodeError:
            return {'error': 'Failed to parse quiz response'}
    
    async def generate_reflection_prompt(
        self,
        video_id: str,
        completed_topics: List[str],
        learning_objectives: List[str],
        user_id: Optional[int] = None
    ) -> Dict:
        """Generate reflection exercise prompt"""
        
        prompt = f"""
        ROLE: You are a learning reflection facilitator.
        
        CONTEXT: 
        - Completed topics: {', '.join(completed_topics)}
        - Learning objectives: {', '.join(learning_objectives)}
        
        TASK: Create a thoughtful reflection prompt that helps the student consolidate their learning.
        
        FORMAT: Return JSON with:
        {{
          "prompt": "Main reflection question",
          "guidingQuestions": ["Supporting question 1", "Supporting question 2", "Supporting question 3"],
          "expectedLength": "short|medium|long"
        }}
        """
        
        context = {
            'video_id': video_id,
            'content_type': 'reflection_generation'
        }
        
        response = await openai_service.send_chat_message(
            message=self.privacy_filter.sanitize_for_ai(prompt),
            context=context,
            personality='peer',
            user_id=user_id
        )
        
        if 'error' in response:
            return {'error': response['error']}
        
        try:
            reflection_data = json.loads(response['content'])
            return {
                **reflection_data,
                'tokens_used': response.get('tokens_used', 0)
            }
        except json.JSONDecodeError:
            return {'error': 'Failed to parse reflection response'}
    
    async def generate_learning_path(
        self,
        user_id: int,
        current_course_id: str,
        struggling_concepts: List[str],
        completed_concepts: List[str],
        learning_goals: List[str]
    ) -> Dict:
        """Generate personalized learning path"""
        
        prompt = f"""
        ROLE: You are a personalized learning path advisor.
        
        STUDENT PROFILE:
        - Current course: {current_course_id}
        - Struggling with: {', '.join(struggling_concepts)}
        - Completed: {', '.join(completed_concepts)}
        - Goals: {', '.join(learning_goals)}
        
        TASK: Create a personalized learning path to address knowledge gaps and achieve goals.
        
        FORMAT: Return JSON with:
        {{
          "detectedIssues": ["issue1", "issue2"],
          "recommendedContent": [
            {{
              "type": "video|article|exercise|practice",
              "title": "Content title",
              "description": "Brief description",
              "difficulty": "beginner|intermediate|advanced",
              "estimatedTime": "X minutes",
              "priority": 1
            }}
          ],
          "nextSteps": ["step1", "step2"]
        }}
        """
        
        context = {
            'user_id': user_id,
            'course_id': current_course_id,
            'content_type': 'learning_path_generation'
        }
        
        response = await openai_service.send_chat_message(
            message=self.privacy_filter.sanitize_for_ai(prompt),
            context=context,
            personality='professional',
            user_id=user_id
        )
        
        if 'error' in response:
            return {'error': response['error']}
        
        try:
            path_data = json.loads(response['content'])
            return {
                **path_data,
                'tokens_used': response.get('tokens_used', 0)
            }
        except json.JSONDecodeError:
            return {'error': 'Failed to parse learning path response'}

# Create singleton instance
ai_agent_service = AIAgentService()
```

## 🌐 Django REST API Views

```python
# apps/ai_chat/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .models import ChatSession, ChatMessage
from .serializers import ChatMessageSerializer, ChatSessionSerializer
from utils.openai_client import openai_service
import json

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='30/m', method='POST')  # 30 requests per minute per user
def send_chat_message(request):
    """Send message to AI chat"""
    
    try:
        data = request.data
        message = data.get('message', '').strip()
        session_id = data.get('session_id')
        context = data.get('context', {})
        
        if not message:
            return Response(
                {'error': 'Message content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create chat session
        if session_id:
            try:
                session = ChatSession.objects.get(id=session_id, user=request.user)
            except ChatSession.DoesNotExist:
                return Response(
                    {'error': 'Chat session not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            session = ChatSession.objects.create(
                user=request.user,
                course_id=context.get('course_id', ''),
                video_id=context.get('video_id')
            )
        
        # Save user message
        user_message = ChatMessage.objects.create(
            session=session,
            message_type='user',
            content=message,
            context=context
        )
        
        # Get chat history for context
        recent_messages = ChatMessage.objects.filter(
            session=session
        ).order_by('-created_at')[:10]  # Last 10 messages
        
        chat_history = []
        for msg in reversed(recent_messages):
            if msg.id != user_message.id:  # Don't include the current message
                chat_history.append({
                    'role': 'assistant' if msg.message_type == 'assistant' else 'user',
                    'content': msg.content
                })
        
        # Get AI response
        ai_response = await openai_service.send_chat_message(
            message=message,
            context=context,
            chat_history=chat_history,
            user_id=request.user.id
        )
        
        if 'error' in ai_response:
            return Response(
                {'error': ai_response['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Save AI response
        ai_message = ChatMessage.objects.create(
            session=session,
            message_type='assistant',
            content=ai_response['content'],
            context=context,
            metadata={
                'model': ai_response.get('model'),
                'tokens_used': ai_response.get('tokens_used'),
                'response_time_ms': ai_response.get('response_time_ms'),
                'cached': ai_response.get('cached', False)
            }
        )
        
        # Serialize response
        ai_message_data = ChatMessageSerializer(ai_message).data
        
        return Response({
            'message': ai_message_data,
            'session_id': str(session.id),
            'tokens_used': ai_response.get('tokens_used', 0)
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_chat_history(request, session_id):
    """Get chat message history for a session"""
    
    try:
        session = ChatSession.objects.get(id=session_id, user=request.user)
        messages = ChatMessage.objects.filter(session=session).order_by('created_at')
        serializer = ChatMessageSerializer(messages, many=True)
        
        return Response({
            'session': ChatSessionSerializer(session).data,
            'messages': serializer.data
        })
        
    except ChatSession.DoesNotExist:
        return Response(
            {'error': 'Chat session not found'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_chat_history(request, session_id):
    """Clear chat history for a session"""
    
    try:
        session = ChatSession.objects.get(id=session_id, user=request.user)
        ChatMessage.objects.filter(session=session).delete()
        
        return Response({'message': 'Chat history cleared successfully'})
        
    except ChatSession.DoesNotExist:
        return Response(
            {'error': 'Chat session not found'},
            status=status.HTTP_404_NOT_FOUND
        )

# AI Agent endpoints
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='20/m', method='POST')
def generate_hint(request):
    """Generate AI hint"""
    
    from apps.ai_agents.services import ai_agent_service
    
    try:
        data = request.data
        video_id = data.get('video_id')
        timestamp = data.get('timestamp', 0)
        transcript_segment = data.get('transcript_segment')
        user_difficulty = data.get('user_difficulty')
        
        if not video_id:
            return Response(
                {'error': 'video_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = await ai_agent_service.generate_hint(
            video_id=video_id,
            timestamp=timestamp,
            transcript_segment=transcript_segment,
            user_difficulty=user_difficulty,
            user_id=request.user.id
        )
        
        if 'error' in result:
            return Response(
                {'error': result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(result)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='15/m', method='POST')
def generate_quiz(request):
    """Generate AI quiz"""
    
    from apps.ai_agents.services import ai_agent_service
    
    try:
        data = request.data
        video_id = data.get('video_id')
        transcript_segments = data.get('transcript_segments', [])
        difficulty_level = data.get('difficulty_level', 'medium')
        
        if not video_id or not transcript_segments:
            return Response(
                {'error': 'video_id and transcript_segments are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = await ai_agent_service.generate_quiz(
            video_id=video_id,
            transcript_segments=transcript_segments,
            difficulty_level=difficulty_level,
            user_id=request.user.id
        )
        
        if 'error' in result:
            return Response(
                {'error': result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(result)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

## 📊 Transcript Processing with Embeddings

```python
# apps/transcripts/services.py
from typing import List, Dict, Optional
import numpy as np
from django.conf import settings
from .models import TranscriptChunk, VideoTranscript
from utils.openai_client import openai_service
import openai

class TranscriptProcessingService:
    
    async def process_video_transcript(
        self, 
        video_id: str, 
        transcript: str,
        language: str = 'en'
    ) -> None:
        """Process video transcript and generate embeddings"""
        
        try:
            # Delete existing transcript data
            VideoTranscript.objects.filter(video_id=video_id).delete()
            TranscriptChunk.objects.filter(video_id=video_id).delete()
            
            # Create video transcript record
            video_transcript = VideoTranscript.objects.create(
                video_id=video_id,
                full_text=transcript,
                language=language,
                status='processing'
            )
            
            # Split into chunks
            chunks = self._chunk_transcript(transcript)
            
            # Generate embeddings for each chunk
            for chunk_data in chunks:
                embedding = await self._generate_embedding(chunk_data['text'])
                
                TranscriptChunk.objects.create(
                    video_transcript=video_transcript,
                    video_id=video_id,
                    start_time=chunk_data['start_time'],
                    end_time=chunk_data['end_time'],
                    text=chunk_data['text'],
                    embedding=embedding,
                    chunk_index=chunk_data['index']
                )
            
            # Mark as completed
            video_transcript.status = 'completed'
            video_transcript.save()
            
        except Exception as e:
            if 'video_transcript' in locals():
                video_transcript.status = 'error'
                video_transcript.error_message = str(e)
                video_transcript.save()
            raise e
    
    def _chunk_transcript(self, transcript: str) -> List[Dict]:
        """Split transcript into meaningful chunks"""
        
        # Simple chunking by sentences/time segments
        # In production, use proper transcript timing data
        chunks = []
        sentences = transcript.split('. ')
        
        chunk_size = 3  # 3 sentences per chunk
        chunk_duration = 30  # 30 seconds per chunk (estimated)
        
        for i in range(0, len(sentences), chunk_size):
            chunk_sentences = sentences[i:i + chunk_size]
            chunk_text = '. '.join(chunk_sentences)
            
            start_time = i * chunk_duration / chunk_size
            end_time = start_time + chunk_duration
            
            chunks.append({
                'index': i // chunk_size,
                'text': chunk_text,
                'start_time': start_time,
                'end_time': end_time
            })
        
        return chunks
    
    async def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI"""
        
        response = await openai.Embedding.acreate(
            model=settings.AI_CONFIG['MODELS']['EMBEDDINGS'],
            input=text
        )
        
        return response.data[0].embedding
    
    async def search_transcript_content(
        self,
        video_id: str,
        query: str,
        limit: int = 5
    ) -> List[Dict]:
        """Search transcript content using vector similarity"""
        
        try:
            # Generate embedding for search query
            query_embedding = await self._generate_embedding(query)
            
            # Get all chunks for the video
            chunks = TranscriptChunk.objects.filter(video_id=video_id)
            
            # Calculate similarities
            similarities = []
            for chunk in chunks:
                if chunk.embedding:
                    similarity = self._cosine_similarity(
                        query_embedding, 
                        chunk.embedding
                    )
                    
                    similarities.append({
                        'chunk': chunk,
                        'similarity': similarity
                    })
            
            # Sort by similarity and return top results
            similarities.sort(key=lambda x: x['similarity'], reverse=True)
            
            results = []
            for item in similarities[:limit]:
                chunk = item['chunk']
                results.append({
                    'text': chunk.text,
                    'start_time': float(chunk.start_time),
                    'end_time': float(chunk.end_time),
                    'similarity': item['similarity']
                })
            
            return results
            
        except Exception as e:
            raise Exception(f"Transcript search failed: {str(e)}")
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        
        dot_product = np.dot(vec1, vec2)
        norm_vec1 = np.linalg.norm(vec1)
        norm_vec2 = np.linalg.norm(vec2)
        
        if norm_vec1 == 0 or norm_vec2 == 0:
            return 0.0
        
        return dot_product / (norm_vec1 * norm_vec2)

# Create singleton instance
transcript_service = TranscriptProcessingService()
```

## 🔄 Celery Tasks for Background Processing

```python
# apps/learning_analytics/tasks.py
from celery import shared_task
from django.contrib.auth.models import User
from apps.transcripts.services import transcript_service
from apps.ai_agents.services import ai_agent_service
from .models import LearningInsight
import logging

logger = logging.getLogger(__name__)

@shared_task
def process_video_transcript(video_id: str, transcript: str):
    """Background task to process video transcript"""
    try:
        transcript_service.process_video_transcript(video_id, transcript)
        logger.info(f"Successfully processed transcript for video {video_id}")
    except Exception as e:
        logger.error(f"Failed to process transcript for video {video_id}: {str(e)}")
        raise

@shared_task
def generate_learning_insights(user_id: int):
    """Background task to generate learning insights for a user"""
    try:
        from .services import LearningAnalyticsService
        
        analytics_service = LearningAnalyticsService()
        insights = analytics_service.analyze_learning_patterns(user_id)
        
        # Save insights to database
        user = User.objects.get(id=user_id)
        for insight_data in insights.get('insights', []):
            LearningInsight.objects.create(
                user=user,
                insight_type=insight_data['type'],
                title=insight_data['title'],
                description=insight_data['description'],
                priority=insight_data['priority'],
                data=insight_data,
                is_actionable=insight_data.get('actionable', False)
            )
        
        logger.info(f"Generated learning insights for user {user_id}")
        
    except Exception as e:
        logger.error(f"Failed to generate insights for user {user_id}: {str(e)}")
        raise

@shared_task
def cleanup_old_ai_interactions():
    """Clean up old AI interactions and cached content"""
    try:
        from django.utils import timezone
        from datetime import timedelta
        from apps.ai_chat.models import AIInteraction, GeneratedContent
        
        # Delete interactions older than 90 days
        cutoff_date = timezone.now() - timedelta(days=90)
        deleted_interactions = AIInteraction.objects.filter(
            created_at__lt=cutoff_date
        ).delete()
        
        # Delete expired generated content
        deleted_content = GeneratedContent.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()
        
        logger.info(
            f"Cleaned up {deleted_interactions[0]} AI interactions "
            f"and {deleted_content[0]} generated content items"
        )
        
    except Exception as e:
        logger.error(f"Cleanup task failed: {str(e)}")
        raise
```

## 🧪 Testing

```python
# tests/test_ai_agents.py
from django.test import TestCase
from django.contrib.auth.models import User
from unittest.mock import patch, AsyncMock
from apps.ai_agents.services import ai_agent_service

class AIAgentServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.video_id = 'test-video-123'
    
    @patch('apps.ai_agents.services.openai_service.send_chat_message')
    async def test_generate_hint_success(self, mock_send_message):
        """Test successful hint generation"""
        
        # Mock OpenAI response
        mock_send_message.return_value = {
            'content': 'Here is a helpful hint about CSS flexbox properties.',
            'tokens_used': 45
        }
        
        result = await ai_agent_service.generate_hint(
            video_id=self.video_id,
            timestamp=120.5,
            transcript_segment='CSS flexbox properties allow you to...',
            user_id=self.user.id
        )
        
        self.assertIn('hint', result)
        self.assertIn('confidence', result)
        self.assertIn('tokens_used', result)
        self.assertEqual(result['tokens_used'], 45)
        self.assertGreater(result['confidence'], 0.8)
    
    @patch('apps.ai_agents.services.openai_service.send_chat_message')
    async def test_generate_quiz_success(self, mock_send_message):
        """Test successful quiz generation"""
        
        # Mock OpenAI response
        mock_send_message.return_value = {
            'content': '{"question": "What is flexbox?", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "Flexbox is..."}',
            'tokens_used': 75
        }
        
        result = await ai_agent_service.generate_quiz(
            video_id=self.video_id,
            transcript_segments=['CSS flexbox is a layout method'],
            difficulty_level='medium',
            user_id=self.user.id
        )
        
        self.assertIn('question', result)
        self.assertIn('options', result)
        self.assertIn('correctAnswer', result)
        self.assertIn('explanation', result)
        self.assertEqual(len(result['options']), 4)
    
    async def test_generate_hint_no_video_id(self):
        """Test hint generation with missing video_id"""
        
        with self.assertRaises(TypeError):
            await ai_agent_service.generate_hint(
                video_id=None,
                timestamp=120.5,
                user_id=self.user.id
            )
```

## 🚀 Requirements and Deployment

```python
# requirements.txt
Django==4.2.0
djangorestframework==3.14.0
django-cors-headers==4.0.0
django-channels==4.0.0
channels-redis==4.1.0
django-celery-beat==2.5.0
django-ratelimit==4.0.0
celery==5.3.0
redis==4.5.0
psycopg2-binary==2.9.6
openai==0.27.0
numpy==1.24.0
python-decouple==3.8
gunicorn==20.1.0
whitenoise==6.4.0
```

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "ai_learning_backend.wsgi:application", "--bind", "0.0.0.0:8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  django:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DEBUG=False
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - redis
      - db
    volumes:
      - ./:/app

  celery:
    build: .
    command: celery -A ai_learning_backend worker -l info
    environment:
      - DEBUG=False
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - redis
      - db
    volumes:
      - ./:/app

  celery-beat:
    build: .
    command: celery -A ai_learning_backend beat -l info
    environment:
      - DEBUG=False
      - DATABASE_URL=${DATABASE_URL}
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - redis
      - db
    volumes:
      - ./:/app

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: ai_learning
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

This comprehensive Django backend implementation provides all the necessary components to support the AI learning system with OpenAI integration, including proper models, services, API endpoints, background task processing, and deployment configuration.