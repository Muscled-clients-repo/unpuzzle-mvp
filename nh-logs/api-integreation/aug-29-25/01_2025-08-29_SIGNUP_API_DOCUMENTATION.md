# Signup API Documentation

## Overview
The signup endpoint creates a new user account in the Unpuzzle platform. It integrates with Supabase Auth for authentication and creates a corresponding UserProfile in the Django database.

## Endpoint Details

### URL
```
POST /api/accounts/signup/
POST /api/accounts/signup
POST /api/accounts/register
```

### Authentication
- **Required**: No (Public endpoint)
- **Permission**: `AllowAny`

## Request

### Headers
```
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `email` | string | Yes | User's email address | Valid email format, unique |
| `password` | string | Yes | User's password | Minimum 6 characters |
| `full_name` | string | No | User's full name | Can be blank |
| `firstname` | string | No | User's first name | Alternative to full_name |
| `lastname` | string | No | User's last name | Alternative to full_name |
| `firstName` | string | No | User's first name (camelCase) | Alternative to full_name |
| `lastName` | string | No | User's last name (camelCase) | Alternative to full_name |
| `role` | string | No | User role | Either 'student' or 'instructor', defaults to 'student' |

### Request Example

```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```

Alternative format:
```json
{
  "email": "jane.smith@example.com",
  "password": "strongPass456",
  "full_name": "Jane Smith",
  "role": "instructor"
}
```

## Response

### Success Response (201 Created)

```json
{
  "user": {
    "supabase_user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "username": null,
    "full_name": "John Doe",
    "display_name": "",
    "avatar_url": "",
    "bio": "",
    "status": "active",
    "phone_number": "",
    "timezone": "UTC",
    "language": "en",
    "last_login": null,
    "email_verified": false,
    "created_at": "2025-08-29T10:30:00Z",
    "updated_at": "2025-08-29T10:30:00Z",
    "roles": ["student"]
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "v1.MYrwsdgfdfg34t34tgfg...",
    "token_type": "bearer",
    "expires_in": 3600,
    "expires_at": 1693395600,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@example.com",
      "email_confirmed_at": null,
      "created_at": "2025-08-29T10:30:00Z",
      "updated_at": "2025-08-29T10:30:00Z"
    }
  },
  "success": true
}
```

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "email": ["Email already registered"],
  "password": ["Ensure this field has at least 6 characters."]
}
```

#### 400 Bad Request - Signup Failed
```json
{
  "error": "Sign up failed",
  "success": false
}
```

#### 500 Internal Server Error - Profile Creation Failed
```json
{
  "error": "Profile not created automatically. Check database triggers.",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Business Logic

### 1. Email Validation
- Email is converted to lowercase before processing
- Checked for uniqueness against existing UserProfile records
- Must be in valid email format

### 2. Name Processing
- Accepts `full_name` directly OR
- Combines `firstname`/`lastname` (or camelCase variants) into `full_name`
- Strips whitespace from all name fields
- If both methods provided, firstname/lastname combination takes precedence

### 3. User Creation Flow
1. **Supabase Auth Creation**:
   - Creates user in Supabase Auth system
   - Stores metadata including full_name
   
2. **UserProfile Creation**:
   - Database trigger automatically creates UserProfile when Supabase user is created
   - Profile is linked via `supabase_user_id`
   
3. **Profile Update**:
   - Updates profile with provided full_name if present
   
4. **Role Assignment**:
   - Assigns specified role (student/instructor)
   - Defaults to 'student' if not specified
   - Uses PermissionService to manage role assignment

### 4. Session Management
- Returns JWT access token (expires in 1 hour)
- Returns refresh token for token renewal
- Sets secure HTTP-only cookie with auth token (if configured)

### 5. Cookie Settings
Cookies are configured based on environment variables:
- `COOKIE_SECURE`: Set to 'true' for HTTPS
- `COOKIE_DOMAIN`: Domain for cookie scope
- Cookie properties:
  - `max_age`: 3600 seconds (1 hour)
  - `httponly`: True (prevents JavaScript access)
  - `samesite`: 'Lax' (CSRF protection)

## Integration Notes

### Frontend Integration
1. The endpoint accepts multiple URL patterns for compatibility
2. Both camelCase and lowercase field names are supported
3. Cookie authentication is automatically handled if enabled

### Database Triggers
The system relies on database triggers to automatically create UserProfile records when users are created in Supabase. Ensure these triggers are properly configured.

### Role System
- Available roles: 'student', 'instructor'
- Roles are managed through the PermissionService
- Additional roles can be configured through RoleConstants

## Security Considerations

1. **Password Requirements**: Minimum 6 characters (consider strengthening)
2. **Email Enumeration**: Error messages reveal if email exists
3. **HTTPS Required**: Use secure cookies in production
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Email Verification**: Users start with `email_verified: false`

## Testing Examples

### cURL Example
```bash
curl -X POST https://api.unpuzzle.com/api/accounts/signup/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "firstName": "Test",
    "lastName": "User",
    "role": "student"
  }'
```

### Python Example
```python
import requests

response = requests.post(
    "https://api.unpuzzle.com/api/accounts/signup/",
    json={
        "email": "test@example.com",
        "password": "testpass123",
        "full_name": "Test User",
        "role": "instructor"
    }
)

if response.status_code == 201:
    data = response.json()
    access_token = data["session"]["access_token"]
    user_id = data["user"]["supabase_user_id"]
```

### JavaScript/Axios Example
```javascript
const axios = require('axios');

const signupUser = async () => {
  try {
    const response = await axios.post(
      'https://api.unpuzzle.com/api/accounts/signup/',
      {
        email: 'test@example.com',
        password: 'testpass123',
        firstName: 'Test',
        lastName: 'User',
        role: 'student'
      }
    );
    
    const { user, session } = response.data;
    console.log('User created:', user.supabase_user_id);
    console.log('Access token:', session.access_token);
  } catch (error) {
    console.error('Signup failed:', error.response.data);
  }
};
```

## Related Endpoints

- `POST /api/accounts/signin/` - User login
- `POST /api/accounts/signout/` - User logout
- `GET /api/accounts/profile/` - Get user profile
- `PUT /api/accounts/profile/update/` - Update user profile
- `POST /api/accounts/refresh/` - Refresh access token
- `POST /api/accounts/reset-password/` - Request password reset

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-08-29 | 1.0.0 | Initial documentation |