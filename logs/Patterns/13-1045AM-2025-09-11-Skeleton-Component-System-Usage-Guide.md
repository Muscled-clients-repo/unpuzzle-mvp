# Skeleton Component System - Usage Guide

**Date:** September 11, 2025  
**Time:** 10:45 AM  
**Location:** `/src/components/common/universal-skeleton.tsx`

## Overview

The Universal Skeleton System provides consistent loading states across all instructor routes. Instead of creating custom loading animations for each page, use these pre-built, tested components that maintain visual consistency and reduce code duplication.

---

## Available Skeleton Components

### 1. `Skeleton` - Base Building Block

**Purpose:** Foundation component for creating custom skeleton elements

```tsx
import { Skeleton } from "@/components/common/universal-skeleton"

// Basic usage
<Skeleton className="h-4 w-24" />

// Common patterns
<Skeleton className="h-8 w-48" />        // Title
<Skeleton className="h-4 w-64" />        // Description  
<Skeleton className="h-10 w-full" />     // Input field
<Skeleton className="h-6 w-12 rounded-full" /> // Badge
```

**Features:**
- Uses consistent gradient animation (`from-muted to-muted/50`)
- Built-in `animate-pulse` class
- Fully customizable with className prop

### 2. `PageHeaderSkeleton` - Page Headers

**Purpose:** Standard page header with title, description, and action area

```tsx
import { PageHeaderSkeleton } from "@/components/common/universal-skeleton"

// Usage
<PageHeaderSkeleton />
<PageHeaderSkeleton className="mb-8" />
```

**Layout:**
- Left side: Title (h-8 w-48) + Description (h-4 w-64)
- Right side: Badge (h-6 w-12) + Button (h-10 w-24)
- Default bottom margin: mb-6

**Best For:**
- Media page headers
- Course page headers
- Any instructor page header

### 3. `FiltersSectionSkeleton` - Filter Controls

**Purpose:** Horizontal row of filter controls (search + dropdowns + buttons)

```tsx
import { FiltersSectionSkeleton } from "@/components/common/universal-skeleton"

// Usage
<FiltersSectionSkeleton />                   // 5 items (default)
<FiltersSectionSkeleton itemCount={3} />     // 3 items
<FiltersSectionSkeleton itemCount={6} />     // 6 items
```

**Layout:**
- First item: Search input (flex-1)
- Remaining items: Fixed width dropdowns/buttons (w-36)
- Responsive: Column on mobile, row on desktop

**Best For:**
- Media page filters (search + course + type + sort + select + view)
- Course page filters (search + status + sort)
- Any page with filter controls

### 4. `MediaCardSkeleton` - Grid Card Layout

**Purpose:** Grid of media cards with responsive columns

```tsx
import { MediaCardSkeleton } from "@/components/common/universal-skeleton"

// Usage
<MediaCardSkeleton />                 // 8 cards (default)
<MediaCardSkeleton count={12} />      // 12 cards
<MediaCardSkeleton count={4} />       // 4 cards
```

**Layout:**
- Responsive grid: 1 col mobile → 2 col tablet → 3 col desktop → 4 col large
- Each card: Aspect-video thumbnail + content area
- Content: Title + metadata row + badges

**Best For:**
- Media file grids
- Course card grids  
- Any card-based layouts

### 5. `ListItemSkeleton` - List Layout

**Purpose:** Vertical list of items with thumbnails and content

```tsx
import { ListItemSkeleton } from "@/components/common/universal-skeleton"

// Usage
<ListItemSkeleton />              // 6 items (default)
<ListItemSkeleton count={10} />   // 10 items
```

**Layout:**
- Horizontal layout: Icon + Thumbnail + Content + Actions
- Each item has border and padding
- Content area grows to fill space

**Best For:**
- Media list view
- Student lists
- Lesson lists

### 6. `StatsCardsSkeleton` - Metrics Dashboard

**Purpose:** Grid of stat cards showing KPIs

```tsx
import { StatsCardsSkeleton } from "@/components/common/universal-skeleton"

// Usage
<StatsCardsSkeleton />            // 4 cards (default)
<StatsCardsSkeleton count={3} />  // 3 cards
```

**Layout:**
- Responsive grid: 1 col → 2 col → 4 col
- Each card: Header row + Large number + Small description
- Consistent card styling with border and padding

**Best For:**
- Course stats (students, revenue, completion)
- Analytics dashboards
- Performance metrics

### 7. `TableSkeleton` - Data Tables

**Purpose:** Tabular data with headers and rows

```tsx
import { TableSkeleton } from "@/components/common/universal-skeleton"

// Usage
<TableSkeleton />                          // 5 rows, 4 columns (default)
<TableSkeleton rows={10} columns={6} />    // Custom size
```

**Layout:**
- Header row with column titles
- Data rows with consistent column widths
- All columns use flex-1 for equal distribution

**Best For:**
- Student data tables
- Course analytics tables
- Any structured data

### 8. `FormSkeleton` - Form Layouts

**Purpose:** Form fields with labels and buttons

```tsx
import { FormSkeleton } from "@/components/common/universal-skeleton"

// Usage
<FormSkeleton />              // 4 fields (default)
<FormSkeleton fields={6} />   // 6 fields
```

**Layout:**
- Each field: Label (h-4 w-24) + Input (h-10 w-full)
- Button row at bottom: Cancel + Save buttons
- Proper spacing between fields

**Best For:**
- Course edit forms
- Settings forms
- Any form with multiple fields

---

## Implementation Examples

### Complete Page Loading State

```tsx
// Media Page Loading
function MediaPageLoading() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <PageHeaderSkeleton />
      
      {/* Upload zone */}
      <div className="mb-8">
        <Skeleton className="h-32 rounded-lg" />
      </div>
      
      <FiltersSectionSkeleton itemCount={5} />
      <MediaCardSkeleton count={8} />
    </div>
  )
}

// Courses Page Loading
function CoursesPageLoading() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <PageHeaderSkeleton />
      <StatsCardsSkeleton count={4} />
      <FiltersSectionSkeleton itemCount={3} />
      <MediaCardSkeleton count={6} />
    </div>
  )
}
```

### Conditional Loading States

```tsx
function CoursesList() {
  const { data: courses, isLoading } = useCourses()
  
  if (isLoading) {
    return (
      <div>
        <FiltersSectionSkeleton itemCount={3} />
        <MediaCardSkeleton count={6} />
      </div>
    )
  }
  
  return (
    <div>
      <CoursesFilter />
      <CoursesGrid courses={courses} />
    </div>
  )
}
```

### Custom Skeletons When Needed

```tsx
// For unique layouts not covered by existing components
function CustomSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  )
}
```

---

## Best Practices

### 1. Match Actual Content Layout

**✅ Good:** Skeleton matches real content structure
```tsx
// If your content has title + description + badge
<PageHeaderSkeleton />  // Matches this pattern

// If your content has search + 2 dropdowns + button  
<FiltersSectionSkeleton itemCount={4} />
```

**❌ Bad:** Skeleton doesn't match content
```tsx
// Don't use if you only have a title (no description)
<PageHeaderSkeleton />

// Don't use if you have 6 filters
<FiltersSectionSkeleton itemCount={3} />
```

### 2. Use Appropriate Counts

**✅ Good:** Count matches expected content
```tsx
// If you expect 12 media files per page
<MediaCardSkeleton count={12} />

// If you typically show 3 stats
<StatsCardsSkeleton count={3} />
```

**❌ Bad:** Count doesn't match reality
```tsx
// Showing 20 skeleton cards for a page that shows 6
<MediaCardSkeleton count={20} />
```

### 3. Consistent Animation Timing

**✅ Good:** Use built-in animations
```tsx
// These all have consistent animation timing
<Skeleton className="h-4 w-24" />
<PageHeaderSkeleton />
<MediaCardSkeleton />
```

**❌ Bad:** Custom animations that don't match
```tsx
// Don't add custom animations
<div className="animate-bounce bg-gray-200" />
<div className="animate-spin bg-muted" />
```

### 4. Responsive Considerations

The skeletons are designed to be responsive. Test them at different screen sizes:

- **Mobile (sm):** Filters stack vertically, cards show 1-2 columns
- **Tablet (md):** Filters in row, cards show 2-3 columns  
- **Desktop (lg+):** Full horizontal layout, cards show 3-4 columns

---

## Migration Guide

### Converting Custom Skeletons

**Before:**
```tsx
// Custom skeleton in media page
<div className="h-8 bg-gradient-to-r from-muted to-muted/50 rounded w-48 animate-pulse mb-2" />
<div className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded w-64 animate-pulse" />
```

**After:**
```tsx
<PageHeaderSkeleton />
```

**Benefits:**
- Reduced code by ~10 lines
- Consistent styling across pages
- Easier to maintain and update

### Adding to New Pages

1. **Import needed skeletons:**
```tsx
import { PageHeaderSkeleton, FiltersSectionSkeleton, MediaCardSkeleton } from "@/components/common/universal-skeleton"
```

2. **Use in loading state:**
```tsx
if (isLoading) {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <PageHeaderSkeleton />
      <FiltersSectionSkeleton itemCount={3} />
      <MediaCardSkeleton count={6} />
    </div>
  )
}
```

3. **Match your actual content structure**

---

## Performance Benefits

### Bundle Size Reduction
- **Before:** Each page had custom skeleton code (~50-100 lines)
- **After:** Shared components reduce bundle size by ~300-500 lines across 3 pages

### Consistency Benefits  
- Same animation timing across all pages
- Consistent spacing and sizing
- Same responsive behavior
- Single source of truth for skeleton styles

### Developer Experience
- No need to create custom loading states
- Faster development with pre-built components
- Easy to modify skeleton styles in one place
- TypeScript support with proper prop types

---

## Testing Checklist

When using skeleton components, verify:

- [ ] Skeleton layout matches actual content layout
- [ ] Responsive behavior works on mobile/tablet/desktop
- [ ] Animation timing feels consistent with other pages
- [ ] Count parameters match expected content volume
- [ ] Loading states appear/disappear correctly
- [ ] Skeleton components have proper accessibility

---

## Troubleshooting

### Common Issues

**Issue:** Skeleton doesn't match content layout
- **Solution:** Use different skeleton component or create custom one with base `Skeleton`

**Issue:** Animation feels too fast/slow
- **Solution:** The animation is controlled by Tailwind's `animate-pulse` - don't override

**Issue:** Wrong number of skeleton items
- **Solution:** Adjust `count` or `itemCount` props to match expected content

**Issue:** Skeleton shows after content loads
- **Solution:** Check loading state logic - ensure proper `isLoading` checks

---

## Future Enhancements

### Planned Additions
- **ChartSkeleton** - For analytics charts and graphs
- **SidebarSkeleton** - For navigation sidebar loading
- **BreadcrumbSkeleton** - For navigation breadcrumbs
- **TabsSkeleton** - For tab navigation loading

### Customization Options
- Dark mode skeleton variants
- Custom animation speeds
- Skeleton color theming
- Advanced responsive breakpoints

---

## Conclusion

The Universal Skeleton System provides a comprehensive solution for loading states across the instructor interface. By using these pre-built components, you ensure consistency, reduce code duplication, and improve the user experience with smooth loading transitions.

**Key Takeaways:**
1. Always use shared skeleton components instead of custom ones
2. Match skeleton structure to actual content layout
3. Use appropriate count parameters for realistic loading states
4. Test skeleton components at different screen sizes
5. Import only the skeleton components you need

For questions or requests for new skeleton components, refer to this documentation or create new issues in the project.