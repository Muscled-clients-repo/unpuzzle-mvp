# Project Rules for Claude Code

## Core Development Principles

### 1. ALWAYS Check Existing Code First
- **NEVER** create new implementations without searching for similar existing code
- **ALWAYS** search for similar pages/components before writing new ones
- **ALWAYS** reuse existing patterns, structures, and components

### 2. Code Reuse Patterns
- Course pages and Lesson pages should share base components
- Analytics pages must reuse the same structure
- Check `/instructor/courses` and `/instructor/lessons` for patterns
- Forms, tables, and cards should follow existing implementations

### 3. Before Starting Any Task
1. Search for similar existing implementations
2. Identify reusable components and patterns
3. Explain what will be reused
4. Only then proceed with implementation

### 4. Specific Reuse Guidelines
- **Analytics Pages**: All analytics (course/lesson) share the same structure
- **List Pages**: Courses/lessons lists should have similar filtering, search, and card layouts
- **Edit Pages**: Follow the same tab structure and form patterns
- **Dashboards**: Reuse card components and stat displays

### 5. Development Workflow
For every new feature request:
1.  Search existing codebase for similar features
2.  List what can be reused
3.  Show found code snippets
4.  Explain the reuse strategy
5.  Implement with maximum code reuse

### 6. Common Patterns to Reuse
- Header with breadcrumbs
- Stats cards grid layouts
- Table structures with filters
- Tab navigation patterns
- Form layouts and validation
- Modal and dialog patterns
- Loading and error states

### 7. Files to Check Before Creating New Pages
- `/src/app/instructor/courses/page.tsx` - Course list pattern
- `/src/app/instructor/course/[id]/analytics/page.tsx` - Analytics pattern
- `/src/app/instructor/course/[id]/edit/page.tsx` - Edit form pattern
- `/src/app/instructor/lessons/page.tsx` - Lesson list pattern
- `/src/components/ui/` - All reusable UI components

## Reminders
- DRY (Don't Repeat Yourself) - If similar code exists, reuse it
- Check twice, code once
- When in doubt, search the codebase
- Similar features = similar code structure

## Red Flags to Avoid
L Writing similar components from scratch
L Creating new patterns when existing ones work
L Ignoring established project conventions
L Not checking existing implementations first