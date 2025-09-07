# UI Component Migration Strategy: Old UI + New Architecture

## Core Principle
**Keep existing UI components (JSX, styling, layouts) but strip out old state management and connect to new TanStack+Zustand architecture**

---

## 🎯 What We Keep vs What We Replace

### ✅ KEEP (Old UI Components)
- **JSX Structure**: All form layouts, cards, buttons, inputs
- **Styling**: All className, CSS, component structures
- **UI Components**: shadcn/ui components (Card, Button, Input, etc.)
- **Layout Logic**: Grid layouts, responsive design, visual hierarchy

### ❌ REPLACE (Old State Management)
- **Old Hooks**: useWizardState, useFormState, usePreferences, useUploadProgress
- **Old Stores**: Any store that mixes server + UI state
- **Old Mutations**: useCourseMutations, useVideoMutations (replace with TanStack)

---

## 🔄 Migration Pattern

### Before (Old Architecture)
```tsx
// ❌ OLD: Mixed state management
const { createCourse } = useCourseMutations()
const wizard = useWizardState()
const form = useFormState()

// ❌ OLD: Complex state
const [courseData, setCourseData] = useState(...)
```

### After (New Architecture)
```tsx
// ✅ NEW: TanStack for server state
const { createCourse, isCreating } = useCourseCreation()

// ✅ NEW: Zustand for UI state only OR simple React state
const [formData, setFormData] = useState({
  title: '',
  description: '',
  price: 0,
  difficulty: 'beginner'
})
```

---

## 📋 Step-by-Step Migration Process

### Step 1: Import Cleanup
```tsx
// ❌ REMOVE these imports
import { useWizardState, useFormState, usePreferences } from '@/stores/app-store-new'

// ✅ KEEP these imports (UI components)
import { Card, Button, Input, Label } from "@/components/ui/*"

// ✅ ADD new architecture imports
import { useCourseCreation } from '@/hooks/use-course-queries'
```

### Step 2: State Management Replacement
```tsx
// ❌ REMOVE old state hooks
const wizard = useWizardState()
const form = useFormState()

// ✅ REPLACE with simple React state or minimal Zustand
const [formData, setFormData] = useState({
  title: '',
  description: '',
  price: 0,
  difficulty: 'beginner'
})
```

### Step 3: Event Handler Updates
```tsx
// ❌ OLD: Complex state updates
onChange={(e) => {
  setCourseCreation(prev => ({ ...prev, title: e.target.value }))
  form.setFormDirty()
}}

// ✅ NEW: Simple state updates
onChange={(e) => {
  setFormData(prev => ({ ...prev, title: e.target.value }))
}}
```

### Step 4: Server Operations
```tsx
// ❌ OLD: Mixed mutation hooks
const { createCourse, saveDraft, publishCourse } = useCourseMutations()

// ✅ NEW: Pure TanStack Query
const { createCourse, isCreating } = useCourseCreation()
```

---

## 🎨 UI Component Preservation Examples

### Form Fields (Keep Exact Same JSX)
```tsx
{/* ✅ KEEP: Exact same UI structure */}
<div className="space-y-2">
  <Label htmlFor="title">Course Title *</Label>
  <Input
    id="title"
    placeholder="e.g., React Masterclass"
    value={formData.title}           {/* ✅ NEW: Simple state */}
    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
  />
</div>
```

### Buttons (Keep Styling, Update Logic)
```tsx
{/* ✅ KEEP: Exact same button styling and structure */}
<Button 
  onClick={handleCreateAndEdit}     {/* ✅ NEW: Simplified handler */}
  disabled={!formData.title || isCreating}  {/* ✅ NEW: TanStack loading state */}
  className="exact-same-classes"    {/* ✅ KEEP: All styling */}
>
  {isCreating ? 'Creating...' : 'Create Course'}
</Button>
```

### Cards & Layouts (Keep Everything)
```tsx
{/* ✅ KEEP: Exact same card structure and styling */}
<Card>
  <CardHeader>
    <CardTitle>Course Information</CardTitle>
    <CardDescription>Provide basic details</CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    {/* Form fields here with new state management */}
  </CardContent>
</Card>
```

---

## 🔧 Specific File Migration Plan

### Course Creation Page
**File**: `/src/app/instructor/course/new/page.tsx`

#### Remove:
- `useWizardState`, `useFormState`, `usePreferences` imports
- Complex wizard step logic
- Old mutation hooks

#### Keep:
- All JSX structure and styling
- All UI components (Card, Button, Input, etc.)
- All className and layout logic

#### Add:
- `useCourseCreation` from TanStack
- Simple React state for form data
- Direct navigation to edit-v3 page

---

## 🎯 Benefits of This Approach

1. **Zero UI Regression**: Keep all existing styling and layouts
2. **Clean Architecture**: Separate server state (TanStack) from UI state (simple React state)
3. **No Mixed State**: Eliminate complex state management that causes infinite loops
4. **Reuse Existing Work**: Don't rebuild UI that already works
5. **Faster Migration**: Focus only on state management, not UI redesign

---

## ⚠️ Common Pitfalls to Avoid

1. **Don't rebuild UI components** - Just change their data sources
2. **Don't import old state hooks** - Use TanStack + simple React state
3. **Don't mix architectures** - Fully commit to new pattern per component
4. **Don't over-engineer** - Simple form doesn't need complex state management

---

## 🏁 Success Criteria

After migration, each component should:
- ✅ Look identical to before (same UI/UX)
- ✅ Use TanStack Query for all server operations
- ✅ Use simple React state or minimal Zustand for UI state
- ✅ Have zero infinite loops or state conflicts
- ✅ Navigate to new architecture pages (edit-v3, not old edit pages)

---

This approach lets us keep all the good UI work while getting the benefits of our clean new architecture.