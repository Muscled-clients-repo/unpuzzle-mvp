# OAuth Component Architecture Design

## Overview
This document details the component architecture for implementing OAuth authentication in the Unpuzzle MVP frontend. The architecture follows React/Next.js best practices, emphasizes reusability, and maintains consistency with the existing codebase patterns.

## Component Hierarchy

```
src/
├── components/
│   └── auth/
│       ├── OAuthProviders/
│       │   ├── index.tsx
│       │   ├── OAuthProviders.tsx
│       │   ├── OAuthProviderButton.tsx
│       │   ├── OAuthProviders.styles.ts
│       │   └── OAuthProviders.test.tsx
│       ├── OAuthCallback/
│       │   ├── index.tsx
│       │   ├── OAuthCallbackHandler.tsx
│       │   └── OAuthCallbackError.tsx
│       └── LinkedAccounts/
│           ├── index.tsx
│           ├── LinkedAccountsList.tsx
│           ├── LinkedAccountCard.tsx
│           └── LinkAccountModal.tsx
├── hooks/
│   └── auth/
│       ├── useOAuth.ts
│       ├── useOAuthProviders.ts
│       ├── useOAuthCallback.ts
│       └── useLinkedIdentities.ts
├── services/
│   └── oauth/
│       ├── oauth.service.ts
│       ├── oauth.types.ts
│       └── oauth.utils.ts
└── app/
    └── auth/
        └── callback/
            └── page.tsx
```

## Core Components

### 1. OAuthProviders Component

#### Purpose
Renders a collection of OAuth provider buttons for authentication.

#### Component Structure
```typescript
// OAuthProviders.tsx
interface OAuthProvidersProps {
  mode: 'signin' | 'signup' | 'link'
  layout?: 'vertical' | 'horizontal' | 'grid'
  providers?: string[] // Filter specific providers
  showDivider?: boolean
  onAuthStart?: (provider: string) => void
  onAuthSuccess?: (user: User, provider: string) => void
  onAuthError?: (error: OAuthError, provider: string) => void
  className?: string
}

const OAuthProviders: React.FC<OAuthProvidersProps> = ({
  mode = 'signin',
  layout = 'vertical',
  providers,
  showDivider = true,
  onAuthStart,
  onAuthSuccess,
  onAuthError,
  className
}) => {
  // Component implementation
}
```

#### Features
- Dynamic provider loading from API
- Configurable layout (vertical/horizontal/grid)
- Provider filtering
- Loading states per provider
- Error handling with retry
- Accessibility support (ARIA labels, keyboard navigation)

#### State Management
```typescript
interface OAuthProvidersState {
  availableProviders: OAuthProvider[]
  loadingProviders: Set<string>
  errorProviders: Map<string, string>
  isInitializing: boolean
}
```

### 2. OAuthProviderButton Component

#### Purpose
Individual OAuth provider button with brand styling and interaction handling.

#### Component Structure
```typescript
// OAuthProviderButton.tsx
interface OAuthProviderButtonProps {
  provider: OAuthProvider
  mode: 'signin' | 'signup' | 'link'
  isLoading?: boolean
  isDisabled?: boolean
  error?: string
  onClick: (provider: OAuthProvider) => void
  size?: 'small' | 'medium' | 'large'
  variant?: 'contained' | 'outlined' | 'text'
}

const OAuthProviderButton: React.FC<OAuthProviderButtonProps> = ({
  provider,
  mode,
  isLoading = false,
  isDisabled = false,
  error,
  onClick,
  size = 'medium',
  variant = 'outlined'
}) => {
  // Component implementation
}
```

#### Provider Configurations
```typescript
const providerConfigs: Record<string, ProviderConfig> = {
  google: {
    icon: GoogleIcon,
    colors: {
      primary: '#4285F4',
      hover: '#357AE8',
      text: '#FFFFFF'
    },
    label: 'Continue with Google'
  },
  linkedin: {
    icon: LinkedInIcon,
    colors: {
      primary: '#0077B5',
      hover: '#006097',
      text: '#FFFFFF'
    },
    label: 'Continue with LinkedIn'
  },
  github: {
    icon: GitHubIcon,
    colors: {
      primary: '#24292E',
      hover: '#1A1E22',
      text: '#FFFFFF'
    },
    label: 'Continue with GitHub'
  }
  // Additional providers...
}
```

### 3. OAuthCallbackHandler Component

#### Purpose
Processes OAuth callback, extracts authorization code, and completes authentication.

#### Component Structure
```typescript
// OAuthCallbackHandler.tsx
interface OAuthCallbackHandlerProps {
  onSuccess?: (user: User) => void
  onError?: (error: OAuthError) => void
  redirectOnSuccess?: string
  redirectOnError?: string
}

const OAuthCallbackHandler: React.FC<OAuthCallbackHandlerProps> = ({
  onSuccess,
  onError,
  redirectOnSuccess = '/dashboard',
  redirectOnError = '/login'
}) => {
  // Component implementation
}
```

#### Callback Processing Flow
```typescript
const processCallback = async () => {
  // 1. Extract code from URL
  const code = extractAuthCode()
  
  // 2. Validate state parameter (CSRF protection)
  const isValidState = validateState()
  
  // 3. Exchange code for tokens
  const response = await exchangeCodeForTokens(code)
  
  // 4. Update user state
  updateUserState(response.user, response.session)
  
  // 5. Handle redirect
  handlePostAuthRedirect()
}
```

### 4. LinkedAccountsList Component

#### Purpose
Displays and manages user's linked OAuth accounts.

#### Component Structure
```typescript
// LinkedAccountsList.tsx
interface LinkedAccountsListProps {
  userId: string
  allowLinking?: boolean
  allowUnlinking?: boolean
  onLink?: (provider: string) => void
  onUnlink?: (identityId: string) => void
  className?: string
}

const LinkedAccountsList: React.FC<LinkedAccountsListProps> = ({
  userId,
  allowLinking = true,
  allowUnlinking = true,
  onLink,
  onUnlink,
  className
}) => {
  // Component implementation
}
```

#### Features
- Display linked accounts with metadata
- Link new providers
- Unlink providers (with confirmation)
- Security warnings for last auth method
- Last used timestamp
- Provider status indicators

### 5. LinkAccountModal Component

#### Purpose
Modal dialog for linking new OAuth providers to existing account.

#### Component Structure
```typescript
// LinkAccountModal.tsx
interface LinkAccountModalProps {
  isOpen: boolean
  onClose: () => void
  availableProviders: OAuthProvider[]
  linkedProviders: string[]
  onLink: (provider: string) => Promise<void>
}

const LinkAccountModal: React.FC<LinkAccountModalProps> = ({
  isOpen,
  onClose,
  availableProviders,
  linkedProviders,
  onLink
}) => {
  // Component implementation
}
```

## Custom Hooks

### 1. useOAuth Hook

#### Purpose
Main hook for OAuth operations.

#### Interface
```typescript
interface UseOAuthReturn {
  // State
  providers: OAuthProvider[]
  isLoading: boolean
  error: OAuthError | null
  
  // Actions
  signIn: (provider: string) => Promise<void>
  signUp: (provider: string) => Promise<void>
  linkAccount: (provider: string) => Promise<void>
  unlinkAccount: (identityId: string) => Promise<void>
  
  // Utilities
  isProviderLinked: (provider: string) => boolean
  getProviderInfo: (provider: string) => OAuthProvider | null
}

const useOAuth = (): UseOAuthReturn => {
  // Hook implementation
}
```

### 2. useOAuthProviders Hook

#### Purpose
Fetches and caches available OAuth providers.

#### Implementation
```typescript
const useOAuthProviders = () => {
  const [providers, setProviders] = useState<OAuthProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const data = await oauthService.getProviders()
        setProviders(data.filter(p => p.enabled))
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProviders()
  }, [])
  
  return { providers, loading, error, refetch: fetchProviders }
}
```

### 3. useOAuthCallback Hook

#### Purpose
Handles OAuth callback processing.

#### Implementation
```typescript
const useOAuthCallback = () => {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<OAuthError | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const processCallback = useCallback(async () => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    if (error) {
      handleOAuthError(error)
      return
    }
    
    if (!code) {
      setError(new OAuthError('Missing authorization code'))
      return
    }
    
    setProcessing(true)
    
    try {
      const response = await oauthService.handleCallback(code, state)
      await handleSuccessfulAuth(response)
    } catch (err) {
      setError(err as OAuthError)
    } finally {
      setProcessing(false)
    }
  }, [searchParams])
  
  return { processCallback, processing, error }
}
```

### 4. useLinkedIdentities Hook

#### Purpose
Manages user's linked OAuth identities.

#### Implementation
```typescript
const useLinkedIdentities = () => {
  const [identities, setIdentities] = useState<Identity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const fetchIdentities = useCallback(async () => {
    try {
      const data = await oauthService.getLinkedIdentities()
      setIdentities(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  const linkIdentity = useCallback(async (provider: string) => {
    const response = await oauthService.linkIdentity(provider)
    window.location.href = response.url
  }, [])
  
  const unlinkIdentity = useCallback(async (identityId: string) => {
    await oauthService.unlinkIdentity(identityId)
    await fetchIdentities()
  }, [fetchIdentities])
  
  useEffect(() => {
    fetchIdentities()
  }, [fetchIdentities])
  
  return {
    identities,
    loading,
    error,
    linkIdentity,
    unlinkIdentity,
    refetch: fetchIdentities
  }
}
```

## Service Layer

### OAuth Service Implementation

```typescript
// oauth.service.ts
class OAuthService {
  private apiClient: ApiClient
  private cache: Map<string, CachedData>
  
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient
    this.cache = new Map()
  }
  
  async getProviders(): Promise<OAuthProvider[]> {
    const cacheKey = 'providers'
    const cached = this.getFromCache(cacheKey)
    
    if (cached) return cached
    
    const response = await this.apiClient.get('/auth/oauth/providers/')
    const providers = response.data.providers
    
    this.setCache(cacheKey, providers, 3600000) // Cache for 1 hour
    return providers
  }
  
  async initiateSignIn(provider: string, redirectUrl?: string): Promise<OAuthResponse> {
    const response = await this.apiClient.post('/auth/oauth/signin/', {
      provider,
      redirect_url: redirectUrl || this.getDefaultRedirectUrl()
    })
    
    return response.data
  }
  
  async handleCallback(code: string, state?: string): Promise<AuthResponse> {
    const response = await this.apiClient.post('/auth/oauth/callback/', {
      code,
      state
    })
    
    // Store tokens
    this.storeTokens(response.data.session)
    
    return response.data
  }
  
  async getLinkedIdentities(): Promise<Identity[]> {
    const response = await this.apiClient.get('/auth/oauth/identities/')
    return response.data.identities
  }
  
  async linkIdentity(provider: string): Promise<OAuthResponse> {
    const response = await this.apiClient.post('/auth/oauth/identities/link/', {
      provider
    })
    
    return response.data
  }
  
  async unlinkIdentity(identityId: string): Promise<void> {
    await this.apiClient.delete(`/auth/oauth/identities/${identityId}/unlink/`)
  }
  
  private storeTokens(session: Session): void {
    // Store access token in httpOnly cookie (handled by backend)
    // Store refresh token securely
    // Update local storage for client-side state
  }
  
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }
  
  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    })
  }
  
  private getDefaultRedirectUrl(): string {
    return `${window.location.origin}/auth/callback`
  }
}

export const oauthService = new OAuthService(apiClient)
```

## State Management Integration

### Zustand Store Enhancement

```typescript
// oauth-slice.ts
interface OAuthSlice {
  // State
  providers: OAuthProvider[]
  linkedIdentities: Identity[]
  currentProvider: string | null
  isAuthenticating: boolean
  authError: OAuthError | null
  
  // Actions
  setProviders: (providers: OAuthProvider[]) => void
  setLinkedIdentities: (identities: Identity[]) => void
  setCurrentProvider: (provider: string | null) => void
  setAuthenticating: (isAuthenticating: boolean) => void
  setAuthError: (error: OAuthError | null) => void
  
  // Thunks
  initiateOAuthSignIn: (provider: string) => Promise<void>
  handleOAuthCallback: (code: string) => Promise<void>
  linkOAuthProvider: (provider: string) => Promise<void>
  unlinkOAuthProvider: (identityId: string) => Promise<void>
  fetchLinkedIdentities: () => Promise<void>
  
  // Selectors
  getProviderById: (id: string) => OAuthProvider | undefined
  isProviderLinked: (provider: string) => boolean
  canUnlinkProvider: () => boolean
}

const createOAuthSlice: StateCreator<OAuthSlice> = (set, get) => ({
  // State initialization
  providers: [],
  linkedIdentities: [],
  currentProvider: null,
  isAuthenticating: false,
  authError: null,
  
  // Action implementations...
})
```

## Error Handling

### OAuth Error Types

```typescript
// oauth.types.ts
export class OAuthError extends Error {
  constructor(
    public code: OAuthErrorCode,
    message: string,
    public provider?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'OAuthError'
  }
}

export enum OAuthErrorCode {
  // Provider errors
  PROVIDER_NOT_AVAILABLE = 'PROVIDER_NOT_AVAILABLE',
  PROVIDER_NOT_CONFIGURED = 'PROVIDER_NOT_CONFIGURED',
  PROVIDER_AUTH_FAILED = 'PROVIDER_AUTH_FAILED',
  
  // Callback errors
  INVALID_AUTH_CODE = 'INVALID_AUTH_CODE',
  INVALID_STATE = 'INVALID_STATE',
  CALLBACK_TIMEOUT = 'CALLBACK_TIMEOUT',
  
  // Linking errors
  ALREADY_LINKED = 'ALREADY_LINKED',
  LINK_FAILED = 'LINK_FAILED',
  UNLINK_FAILED = 'UNLINK_FAILED',
  LAST_AUTH_METHOD = 'LAST_AUTH_METHOD',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  
  // User errors
  USER_CANCELLED = 'USER_CANCELLED',
  ACCESS_DENIED = 'ACCESS_DENIED'
}
```

### Error Boundary

```typescript
// OAuthErrorBoundary.tsx
interface OAuthErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: OAuthError }>
}

class OAuthErrorBoundary extends React.Component<
  OAuthErrorBoundaryProps,
  { hasError: boolean; error: OAuthError | null }
> {
  constructor(props: OAuthErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: Error) {
    if (error instanceof OAuthError) {
      return { hasError: true, error }
    }
    return { hasError: true, error: new OAuthError(
      OAuthErrorCode.API_ERROR,
      error.message
    )}
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('OAuth Error:', error, errorInfo)
    // Log to error tracking service
  }
  
  render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback || DefaultOAuthErrorFallback
      return <Fallback error={this.state.error} />
    }
    
    return this.props.children
  }
}
```

## Testing Strategy

### Component Testing

```typescript
// OAuthProviders.test.tsx
describe('OAuthProviders', () => {
  it('should render available providers', async () => {
    const { getByText } = render(<OAuthProviders mode="signin" />)
    
    await waitFor(() => {
      expect(getByText('Continue with Google')).toBeInTheDocument()
      expect(getByText('Continue with LinkedIn')).toBeInTheDocument()
    })
  })
  
  it('should handle provider click', async () => {
    const onAuthStart = jest.fn()
    const { getByText } = render(
      <OAuthProviders mode="signin" onAuthStart={onAuthStart} />
    )
    
    await waitFor(() => {
      fireEvent.click(getByText('Continue with Google'))
      expect(onAuthStart).toHaveBeenCalledWith('google')
    })
  })
  
  it('should show loading state', () => {
    const { getByTestId } = render(<OAuthProviders mode="signin" />)
    expect(getByTestId('oauth-loading')).toBeInTheDocument()
  })
})
```

### Hook Testing

```typescript
// useOAuth.test.ts
describe('useOAuth', () => {
  it('should fetch providers on mount', async () => {
    const { result } = renderHook(() => useOAuth())
    
    expect(result.current.isLoading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.providers).toHaveLength(3)
    })
  })
  
  it('should handle sign in', async () => {
    const { result } = renderHook(() => useOAuth())
    
    await act(async () => {
      await result.current.signIn('google')
    })
    
    expect(window.location.href).toContain('accounts.google.com')
  })
})
```

## Performance Optimizations

### 1. Provider Icons Lazy Loading
```typescript
const ProviderIcon = lazy(() => 
  import(`./icons/${provider.icon}Icon`)
)
```

### 2. Memoization
```typescript
const memoizedProviders = useMemo(
  () => providers.filter(p => p.enabled),
  [providers]
)
```

### 3. Debounced Error Retry
```typescript
const retryWithDebounce = useDebouncedCallback(
  (provider: string) => {
    initiateOAuthSignIn(provider)
  },
  1000
)
```

### 4. Request Caching
```typescript
const { data: providers } = useSWR(
  '/auth/oauth/providers',
  fetcher,
  {
    revalidateOnFocus: false,
    dedupingInterval: 3600000 // 1 hour
  }
)
```

## Accessibility Considerations

### 1. ARIA Labels
```typescript
<button
  aria-label={`Sign in with ${provider.name}`}
  aria-busy={isLoading}
  aria-disabled={isDisabled}
>
```

### 2. Keyboard Navigation
```typescript
<div
  role="group"
  aria-label="OAuth authentication options"
  onKeyDown={handleKeyboardNavigation}
>
```

### 3. Screen Reader Announcements
```typescript
<div role="alert" aria-live="polite">
  {error && `Authentication failed: ${error.message}`}
</div>
```

### 4. Focus Management
```typescript
useEffect(() => {
  if (error) {
    errorRef.current?.focus()
  }
}, [error])
```

## Security Considerations

### 1. State Parameter (CSRF Protection)
```typescript
const generateState = (): string => {
  const state = crypto.randomBytes(32).toString('hex')
  sessionStorage.setItem('oauth_state', state)
  return state
}

const validateState = (state: string): boolean => {
  const savedState = sessionStorage.getItem('oauth_state')
  sessionStorage.removeItem('oauth_state')
  return state === savedState
}
```

### 2. Redirect URL Validation
```typescript
const isValidRedirectUrl = (url: string): boolean => {
  const allowedDomains = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000'
  ]
  
  try {
    const urlObj = new URL(url)
    return allowedDomains.some(domain => 
      urlObj.origin === new URL(domain).origin
    )
  } catch {
    return false
  }
}
```

### 3. Token Storage
```typescript
const secureTokenStorage = {
  store: (token: string) => {
    // Use httpOnly cookies (handled by backend)
    // Or use sessionStorage for temporary storage
    sessionStorage.setItem('temp_token', token)
  },
  
  retrieve: (): string | null => {
    return sessionStorage.getItem('temp_token')
  },
  
  clear: () => {
    sessionStorage.removeItem('temp_token')
  }
}
```

## Conclusion

This component architecture provides a robust, scalable, and maintainable foundation for OAuth authentication in the Unpuzzle MVP. The design emphasizes:

- **Modularity**: Components are self-contained and reusable
- **Type Safety**: Full TypeScript coverage
- **Error Handling**: Comprehensive error management
- **Performance**: Optimized rendering and caching
- **Accessibility**: WCAG 2.1 AA compliance
- **Security**: Industry-standard OAuth practices
- **Testing**: Comprehensive test coverage

The architecture integrates seamlessly with the existing authentication system while providing flexibility for future enhancements and additional OAuth providers.