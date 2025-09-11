# Server Actions vs API Routes Pattern

## Date: 2025-09-04

## The Problem We Faced

When implementing course deletion with proper authentication and cascade cleanup, we encountered multiple issues with the traditional API route approach:

### What Didn't Work (API Routes)

#### Initial Implementation Issues:
1. **Authentication Complexity**
   - Manual cookie/token handling
   - Confusion between `credentials: 'include'` vs Bearer tokens
   - Server-side auth context not properly accessible
   - 401/403 errors despite valid sessions

2. **Code Organization**
   - API routes separate from business logic
   - Duplicate type definitions
   - Manual request/response handling
   - No automatic type safety

3. **Database Trigger Conflicts**
   - Cascade deletes triggered database functions
   - Trigger bug: used `NEW.user_id` on DELETE operations (NEW is NULL on DELETE)
   - Caused: `null value in column "user_id" violates not-null constraint`

### What Worked (Server Actions)

## The Professional Pattern: Server Actions

### Implementation
```typescript
// src/app/actions/course-actions.ts
'use server'

export async function deleteCourse(courseId: string): Promise<DeleteCourseResult> {
  // 1. Authentication is automatic via cookies
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // 2. Direct database access with proper permissions
  const serviceClient = createServiceClient()
  
  // 3. Handle cascade deletes properly
  await serviceClient.from('courses').delete().eq('id', courseId)
  
  // 4. Cleanup external resources
  await backblazeService.deleteVideos(...)
  
  // 5. Automatic cache revalidation
  revalidatePath('/instructor/courses')
  
  return { success: true }
}
```

### Client-Side Usage
```typescript
// Clean, type-safe, no manual auth
const { deleteCourse } = await import('@/app/actions/course-actions')
const result = await deleteCourse(courseId)
```

## Key Benefits

### 1. **Automatic Authentication**
- No manual cookie/token handling
- Server automatically has access to session
- Works seamlessly with Supabase SSR

### 2. **Type Safety**
- Full TypeScript support end-to-end
- No manual type definitions for requests/responses
- IDE autocomplete works perfectly

### 3. **Better Security**
- No exposed API endpoints
- Server-only code can't leak to client
- Direct database access with service role

### 4. **Simpler Architecture**
```
Traditional API Route:
Client → fetch() → API Route → Auth Check → Database → Response → Client

Server Action:
Client → Server Action (auth automatic) → Database → Return
```

### 5. **Built-in Features**
- Automatic request deduplication
- Built-in error boundaries
- Progressive enhancement support
- Automatic cache revalidation

## The Database Fix

### Root Cause Analysis
The `update_user_learning_stats()` trigger failed because:
```sql
-- WRONG: Uses NEW.user_id which is NULL on DELETE
WHERE user_id = NEW.user_id
```

### Professional Fix
```sql
-- RIGHT: Handle DELETE operations properly
DECLARE
  target_user_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;  -- Use OLD for DELETE
  ELSE
    target_user_id := NEW.user_id;  -- Use NEW for INSERT/UPDATE
  END IF;
```

## Pattern for Future Features

### When to Use Server Actions

✅ **Perfect for:**
- CRUD operations requiring auth
- Database transactions
- File operations (upload/delete)
- Cache invalidation
- Admin operations
- Complex business logic

### When to Use API Routes

✅ **Still needed for:**
- Webhooks (external services)
- Public APIs for mobile apps
- Rate-limited endpoints
- Streaming responses
- File downloads with headers

## Implementation Checklist

When implementing new features:

1. **Start with Server Actions**
   ```typescript
   'use server'
   export async function featureName(params) {
     // Auth is automatic
     const supabase = await createClient()
   }
   ```

2. **Check Database Triggers**
   - Ensure triggers handle DELETE operations
   - Use `OLD` for DELETE, `NEW` for INSERT/UPDATE
   - Return appropriate value (`OLD` or `NEW`)

3. **Use Optimistic Updates**
   ```typescript
   // Client: Update UI immediately
   set(state => ({ items: filtered }))
   // Then call server action
   await deleteItem(id)
   ```

4. **Handle Cascade Deletes**
   - Let database CASCADE handle related records
   - Don't manually delete related records unless necessary
   - Fix triggers instead of working around them

## Common Pitfalls to Avoid

1. **Don't mix patterns**
   - Either use Server Actions OR API routes, not both for same feature

2. **Don't bypass database constraints**
   - Fix the root cause (triggers, constraints)
   - Don't delete records in specific order to avoid errors

3. **Don't forget error handling**
   ```typescript
   try {
     const result = await serverAction()
     if (!result.success) throw new Error(result.error)
   } catch (error) {
     // Rollback optimistic update
     set({ items: originalItems })
   }
   ```

## Migration Guide

To migrate from API routes to Server Actions:

1. Create `app/actions/feature-actions.ts`
2. Add `'use server'` directive
3. Move API logic to server action
4. Remove manual auth checks (automatic now)
5. Update client to import and call action directly
6. Delete the API route file

## Conclusion

Server Actions are the modern, professional pattern for Next.js applications. They eliminate authentication complexity, provide better type safety, and result in cleaner, more maintainable code. Combined with optimistic updates and proper database trigger handling, they create a robust, production-ready architecture that matches how platforms like YouTube, Netflix, and Vercel handle server operations.

### Key Takeaway
**Fix problems at their root (database triggers), use modern patterns (Server Actions), and maintain consistency (optimistic updates) for professional, scalable applications.**