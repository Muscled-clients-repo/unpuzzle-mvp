# AI Assistant App - Django Implementation Plan

**Date:** 2025-08-26  
**App:** `ai_assistant`  
**Backend:** Python Django + OpenAI Integration  

## 🏗️ AI Assistant App Structure

```
ai_assistant/
├── __init__.py
├── apps.py
├── admin.py
├── models.py
├── views.py
├── serializers.py
├── urls.py
├── services/
│   ├── __init__.py
│   ├── openai_service.py
│   ├── chat_service.py
│   ├── hint_agent.py
│   ├── quiz_agent.py
│   ├── reflection_agent.py
│   ├── path_agent.py
│   └── transcript_service.py
├── migrations/
│   └── __init__.py
└── tests/
    ├── __init__.py
    ├── test_models.py
    ├── test_views.py
    └── test_services.py
```

## 🗄️ Models

```python
# ai_assistant/models.py
from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField
import uuid

class ChatSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course_id = models.UUIDField()
    video_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ChatMessage(models.Model):
    MESSAGE_TYPES = [('user', 'User'), ('assistant', 'Assistant')]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES)
    content = models.TextField()
    context = JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class TranscriptReference(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    video_id = models.UUIDField()
    start_time = models.DecimalField(max_digits=10, decimal_places=3)
    end_time = models.DecimalField(max_digits=10, decimal_places=3)
    text = models.TextField()
    embedding = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class AIInteraction(models.Model):
    AGENT_TYPES = [('hint', 'Hint'), ('quiz', 'Quiz'), ('reflect', 'Reflect'), ('path', 'Path')]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    video_id = models.UUIDField()
    agent_type = models.CharField(max_length=20, choices=AGENT_TYPES)
    request_data = JSONField(default=dict)
    response_data = JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
```

## 🌐 API Views

```python
# ai_assistant/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .services.chat_service import ChatService
from .services.hint_agent import HintAgent
from .services.quiz_agent import QuizAgent
from .services.reflection_agent import ReflectionAgent
from .services.path_agent import PathAgent

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_chat_message(request):
    chat_service = ChatService()
    result = chat_service.send_message(
        user=request.user,
        message=request.data.get('message'),
        context=request.data.get('context', {})
    )
    return Response(result)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_hint(request):
    hint_agent = HintAgent()
    result = hint_agent.generate(
        video_id=request.data.get('video_id'),
        timestamp=request.data.get('timestamp'),
        transcript_segment=request.data.get('transcript_segment')
    )
    return Response(result)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_quiz(request):
    quiz_agent = QuizAgent()
    result = quiz_agent.generate(
        video_id=request.data.get('video_id'),
        transcript_segments=request.data.get('transcript_segments'),
        difficulty=request.data.get('difficulty', 'medium')
    )
    return Response(result)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_reflection(request):
    reflection_agent = ReflectionAgent()
    result = reflection_agent.generate(
        completed_topics=request.data.get('completed_topics', []),
        learning_objectives=request.data.get('learning_objectives', [])
    )
    return Response(result)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_learning_path(request):
    path_agent = PathAgent()
    result = path_agent.generate(
        struggling_concepts=request.data.get('struggling_concepts', []),
        completed_concepts=request.data.get('completed_concepts', []),
        learning_goals=request.data.get('learning_goals', [])
    )
    return Response(result)
```

## 🔧 Core Services

```python
# ai_assistant/services/openai_service.py
import openai
from django.conf import settings

class OpenAIService:
    def __init__(self):
        openai.api_key = settings.OPENAI_API_KEY
    
    def chat_completion(self, messages, temperature=0.7, max_tokens=300):
        response = openai.ChatCompletion.create(
            model='gpt-4-turbo-preview',
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content

# ai_assistant/services/chat_service.py
from .openai_service import OpenAIService
from ..models import ChatSession, ChatMessage

class ChatService:
    def __init__(self):
        self.openai_service = OpenAIService()
    
    def send_message(self, user, message, context):
        session = self._get_or_create_session(user, context)
        
        # Save user message
        ChatMessage.objects.create(
            session=session,
            message_type='user',
            content=message,
            context=context
        )
        
        # Generate AI response
        messages = self._build_messages(session, message, context)
        ai_response = self.openai_service.chat_completion(messages)
        
        # Save AI response
        ChatMessage.objects.create(
            session=session,
            message_type='assistant',
            content=ai_response,
            context=context
        )
        
        return {'response': ai_response, 'session_id': str(session.id)}

# ai_assistant/services/hint_agent.py
from .openai_service import OpenAIService

class HintAgent:
    def __init__(self):
        self.openai_service = OpenAIService()
    
    def generate(self, video_id, timestamp, transcript_segment=None):
        prompt = f"""
        Provide a helpful learning hint for a student watching a video at {timestamp} seconds.
        {f'Current content: "{transcript_segment}"' if transcript_segment else ''}
        Give a concise hint (1-2 sentences) that guides without giving the answer.
        """
        
        messages = [{'role': 'user', 'content': prompt}]
        hint = self.openai_service.chat_completion(messages, temperature=0.6, max_tokens=150)
        
        return {'hint': hint, 'confidence': 0.85}

# ai_assistant/services/quiz_agent.py
from .openai_service import OpenAIService
import json

class QuizAgent:
    def __init__(self):
        self.openai_service = OpenAIService()
    
    def generate(self, video_id, transcript_segments, difficulty='medium'):
        transcript_content = '\n'.join(transcript_segments)
        
        prompt = f"""
        Create a {difficulty} multiple choice question based on: "{transcript_content}"
        Return JSON: {{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "..."}}
        """
        
        messages = [{'role': 'user', 'content': prompt}]
        response = self.openai_service.chat_completion(messages, temperature=0.4, max_tokens=300)
        
        try:
            quiz_data = json.loads(response)
            return quiz_data
        except json.JSONDecodeError:
            return {'error': 'Failed to generate quiz'}

# ai_assistant/services/reflection_agent.py
from .openai_service import OpenAIService
import json

class ReflectionAgent:
    def __init__(self):
        self.openai_service = OpenAIService()
    
    def generate(self, completed_topics, learning_objectives):
        prompt = f"""
        Create a reflection prompt for a student who completed: {', '.join(completed_topics)}
        Learning objectives: {', '.join(learning_objectives)}
        Return JSON: {{"prompt": "...", "guidingQuestions": ["...", "...", "..."], "expectedLength": "medium"}}
        """
        
        messages = [{'role': 'user', 'content': prompt}]
        response = self.openai_service.chat_completion(messages, temperature=0.7, max_tokens=250)
        
        try:
            reflection_data = json.loads(response)
            return reflection_data
        except json.JSONDecodeError:
            return {'error': 'Failed to generate reflection'}

# ai_assistant/services/path_agent.py
from .openai_service import OpenAIService
import json

class PathAgent:
    def __init__(self):
        self.openai_service = OpenAIService()
    
    def generate(self, struggling_concepts, completed_concepts, learning_goals):
        prompt = f"""
        Create a learning path for a student:
        - Struggling with: {', '.join(struggling_concepts)}
        - Completed: {', '.join(completed_concepts)}  
        - Goals: {', '.join(learning_goals)}
        Return JSON with recommended learning steps and resources.
        """
        
        messages = [{'role': 'user', 'content': prompt}]
        response = self.openai_service.chat_completion(messages, temperature=0.5, max_tokens=400)
        
        try:
            path_data = json.loads(response)
            return path_data
        except json.JSONDecodeError:
            return {'error': 'Failed to generate learning path'}
```

## 🔗 URLs

```python
# ai_assistant/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('chat/send/', views.send_chat_message, name='send_chat_message'),
    path('agents/hint/', views.generate_hint, name='generate_hint'),
    path('agents/quiz/', views.generate_quiz, name='generate_quiz'),
    path('agents/reflection/', views.generate_reflection, name='generate_reflection'),
    path('agents/path/', views.generate_learning_path, name='generate_learning_path'),
]
```

## ⚙️ Settings Integration

```python
# settings.py (add these)
INSTALLED_APPS = [
    # ... existing apps
    'ai_assistant',
]

# OpenAI Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
```

## 📦 Requirements

```python
# Add to requirements.txt
openai==0.27.0
```

This focused implementation provides only the essential AI assistant functionality with the four agent types (hint, quiz, reflect, path) and chat capabilities that your frontend requires.