# OAuth Implementation Plan

## Executive Summary
This document outlines the comprehensive plan for implementing OAuth authentication in the Unpuzzle MVP frontend application. The implementation will integrate with the documented OAuth API endpoints and extend the existing authentication system to support multiple OAuth providers.

## Current State Analysis

### Existing Infrastructure
1. **Authentication System**
   - Complete email/password authentication flow
   - User state management with Zustand store
   - API client with JWT token handling
   - Login/Signup pages with form validation
   - Protected route system

2. **OAuth Readiness**
   - Comprehensive OAuth API documentation available
   - Backend endpoints presumably implemented
   - Placeholder social auth buttons in UI
   - TypeScript types for authentication

3. **Gaps to Address**
   - Non-functional OAuth provider buttons
   - Missing OAuth callback handler
   - No provider integration logic
   - Identity management UI absent
   - OAuth-specific state management

## Authentication Flow Architecture

### 1. OAuth Sign-In Flow
```
User → Click OAuth Button → Frontend → POST /oauth/signin/
  ↓                                      ↓
Redirect to Provider ← OAuth URL ← Backend Response
  ↓
Provider Auth Screen → User Authorization
  ↓
Callback with Code → Frontend /auth/callback
  ↓
POST /oauth/callback/ → Backend
  ↓
User + Session ← Backend Response
  ↓
Store Tokens → Update User State → Redirect to Dashboard
```

### 2. OAuth Identity Linking Flow
```
Authenticated User → Settings Page → Link Provider Button
  ↓
POST /oauth/identities/link/ → Backend (with JWT)
  ↓
OAuth URL → Redirect to Provider
  ↓
Complete OAuth → Callback → Link Identity
  ↓
Update Linked Accounts UI
```

## Implementation Components

### Phase 1: Core OAuth Infrastructure

#### 1.1 OAuth Service Module
**File**: `/src/services/oauth.service.ts`
```typescript
interface OAuthService {
  getProviders(): Promise<OAuthProvider[]>
  initiateSignIn(provider: string, redirectUrl?: string): Promise<OAuthResponse>
  handleCallback(code: string): Promise<AuthResponse>
  getLinkedIdentities(): Promise<Identity[]>
  linkIdentity(provider: string): Promise<OAuthResponse>
  unlinkIdentity(identityId: string): Promise<void>
}
```

#### 1.2 OAuth Types Definition
**File**: `/src/types/oauth.ts`
```typescript
interface OAuthProvider {
  id: string
  name: string
  enabled: boolean
  icon: string
}

interface OAuthResponse {
  success: boolean
  url: string
  provider: string
  action?: 'signin' | 'link'
}

interface Identity {
  id: string
  provider: string
  createdAt: string
  updatedAt: string
  email: string
  identityData: {
    email: string
    name: string
    avatarUrl: string
    providerId: string
  }
}
```

#### 1.3 OAuth Hooks
**File**: `/src/hooks/useOAuth.ts`
- `useOAuthProviders()` - Fetch and cache available providers
- `useOAuthSignIn()` - Handle OAuth sign-in flow
- `useLinkedIdentities()` - Manage linked accounts
- `useOAuthCallback()` - Process OAuth callbacks

### Phase 2: UI Components

#### 2.1 OAuth Provider Buttons
**File**: `/src/components/auth/OAuthProviders.tsx`
```typescript
interface OAuthProvidersProps {
  mode: 'signin' | 'signup' | 'link'
  onSuccess?: () => void
  onError?: (error: Error) => void
}
```
Features:
- Dynamic provider buttons based on API response
- Loading states per provider
- Error handling with user feedback
- Provider icons and branding
- Accessibility compliance

#### 2.2 OAuth Callback Handler
**File**: `/src/app/auth/callback/page.tsx`
- Extract authorization code from URL
- Call OAuth callback API
- Handle success/error states
- Update user store
- Redirect to intended destination

#### 2.3 Linked Accounts Management
**File**: `/src/components/settings/LinkedAccounts.tsx`
- Display linked OAuth providers
- Link new providers
- Unlink providers (with confirmation)
- Show provider metadata
- Last authentication indicator

### Phase 3: State Management Integration

#### 3.1 Enhanced User Store
**Updates to**: `/src/stores/slices/user-slice.ts`
```typescript
interface UserSlice {
  // Existing properties...
  
  // OAuth additions
  linkedIdentities: Identity[]
  oauthLoading: boolean
  oauthError: string | null
  
  // OAuth actions
  signInWithOAuth: (provider: string) => Promise<void>
  linkOAuthProvider: (provider: string) => Promise<void>
  unlinkOAuthProvider: (identityId: string) => Promise<void>
  fetchLinkedIdentities: () => Promise<void>
}
```

#### 3.2 OAuth Configuration Store
**File**: `/src/stores/slices/oauth-slice.ts`
```typescript
interface OAuthSlice {
  providers: OAuthProvider[]
  loadingProviders: boolean
  selectedProvider: string | null
  callbackInProgress: boolean
  
  fetchProviders: () => Promise<void>
  setSelectedProvider: (provider: string) => void
  clearOAuthState: () => void
}
```

### Phase 4: Integration Points

#### 4.1 Login Page Enhancement
**Updates to**: `/src/app/login/page.tsx`
- Replace placeholder buttons with `<OAuthProviders />`
- Handle OAuth sign-in alongside email/password
- Unified error handling
- Loading state management

#### 4.2 Signup Page Enhancement
**Updates to**: `/src/app/signup/page.tsx`
- Add OAuth signup option
- Handle OAuth user creation
- Profile completion for OAuth users
- Terms acceptance flow

#### 4.3 User Settings Page
**New File**: `/src/app/settings/linked-accounts/page.tsx`
- Display linked accounts
- Add new OAuth providers
- Security warnings for unlinking
- Account recovery options

### Phase 5: Security & Error Handling

#### 5.1 Security Measures
- CSRF token validation
- State parameter for OAuth flows
- Secure token storage (httpOnly cookies)
- Redirect URL validation
- Rate limiting on OAuth endpoints

#### 5.2 Error Handling Strategy
```typescript
enum OAuthErrorType {
  PROVIDER_NOT_AVAILABLE = 'provider_not_available',
  CALLBACK_FAILED = 'callback_failed',
  LINKING_FAILED = 'linking_failed',
  ALREADY_LINKED = 'already_linked',
  LAST_AUTH_METHOD = 'last_auth_method',
  NETWORK_ERROR = 'network_error'
}
```

#### 5.3 Fallback Mechanisms
- Graceful degradation when providers unavailable
- Alternative authentication methods
- Clear error messages with recovery actions
- Retry logic for transient failures

## Implementation Timeline

### Week 1: Foundation (Phase 1)
- [ ] Day 1-2: Create OAuth service module and types
- [ ] Day 3-4: Implement OAuth hooks
- [ ] Day 5: Write unit tests for OAuth service

### Week 2: Core Components (Phase 2)
- [ ] Day 1-2: Build OAuth provider buttons component
- [ ] Day 3: Implement callback handler page
- [ ] Day 4-5: Create linked accounts management UI

### Week 3: Integration (Phase 3-4)
- [ ] Day 1-2: Enhance user store with OAuth functionality
- [ ] Day 3: Create OAuth configuration store
- [ ] Day 4-5: Integrate OAuth into login/signup pages

### Week 4: Polish & Testing (Phase 5)
- [ ] Day 1-2: Implement security measures
- [ ] Day 3: Add comprehensive error handling
- [ ] Day 4-5: End-to-end testing and bug fixes

## Testing Strategy

### Unit Tests
- OAuth service methods
- Hook functionality
- Store actions and selectors
- Component rendering and interaction

### Integration Tests
- Full OAuth sign-in flow
- Identity linking/unlinking
- Error recovery scenarios
- Token management

### E2E Tests
- Complete user journeys
- Provider-specific flows
- Mobile responsiveness
- Accessibility compliance

## Environment Configuration

### Required Environment Variables
```env
# OAuth Provider Configuration
NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED=true
NEXT_PUBLIC_OAUTH_LINKEDIN_ENABLED=true
NEXT_PUBLIC_OAUTH_GITHUB_ENABLED=true

# OAuth Redirect URLs
NEXT_PUBLIC_OAUTH_CALLBACK_URL=/auth/callback
NEXT_PUBLIC_OAUTH_SUCCESS_REDIRECT=/dashboard
NEXT_PUBLIC_OAUTH_ERROR_REDIRECT=/login

# API Configuration
NEXT_PUBLIC_API_URL=https://dev.nazmulcodes.org/api/v1
NEXT_PUBLIC_APP_URL=https://dev.nazmulcodes.org
```

## Migration Strategy

### For Existing Users
1. Seamless transition - existing email/password continues working
2. Optional OAuth linking in settings
3. Email notification about new OAuth options
4. No forced migration

### For New Users
1. OAuth as primary option
2. Email/password as fallback
3. Profile completion for OAuth signups
4. Automatic role assignment

## Success Metrics

### Technical Metrics
- OAuth success rate > 95%
- Callback processing < 2 seconds
- Provider availability > 99.9%
- Zero security vulnerabilities

### User Metrics
- OAuth adoption rate > 60% (new users)
- Identity linking usage > 30% (existing users)
- Support tickets < 1% of OAuth attempts
- User satisfaction score > 4.5/5

## Risk Mitigation

### Identified Risks
1. **Provider Downtime**
   - Mitigation: Fallback to email/password
   - Monitoring: Real-time provider status checks

2. **Token Expiration**
   - Mitigation: Automatic refresh mechanism
   - User notification for re-authentication

3. **Account Hijacking**
   - Mitigation: Email verification for linking
   - Two-factor authentication option

4. **Data Privacy**
   - Mitigation: Minimal data collection
   - Clear privacy policy and consent

## Rollback Plan

### Phased Rollback Strategy
1. Feature flag for OAuth functionality
2. Gradual rollout (10% → 50% → 100%)
3. Quick disable mechanism
4. Database migration reversibility
5. User communication plan

## Documentation Requirements

### Developer Documentation
- OAuth service API reference
- Component usage examples
- State management guide
- Testing procedures

### User Documentation
- OAuth setup guide
- Troubleshooting FAQ
- Security best practices
- Privacy information

## Conclusion

This implementation plan provides a comprehensive roadmap for integrating OAuth authentication into the Unpuzzle MVP. The phased approach ensures minimal disruption to existing users while providing modern authentication options. The plan emphasizes security, user experience, and maintainability while leveraging the existing authentication infrastructure.

## Next Steps

1. Review and approve implementation plan
2. Set up OAuth provider applications (Google, LinkedIn, GitHub)
3. Configure Supabase OAuth settings
4. Begin Phase 1 implementation
5. Schedule regular progress reviews

## Appendix

### A. OAuth Provider Setup Guides
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [LinkedIn OAuth Setup](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [GitHub OAuth Setup](https://docs.github.com/en/developers/apps/building-oauth-apps)

### B. Reference Implementation Examples
- [Next.js OAuth Example](https://github.com/nextauthjs/next-auth-example)
- [Supabase Auth Helpers](https://github.com/supabase/auth-helpers)

### C. Security Resources
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)