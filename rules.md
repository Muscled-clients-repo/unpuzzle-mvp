# Development Rules

## Component Development

### 1. Mock Data
- **Keep mock data inside the component** - Never create separate mock data files or modify existing data files
- **Self-contained components** - Each component should work independently with its own mock data
- **Example:**
  ```tsx
  // ✅ GOOD - Mock data inside component
  export function VideoChat() {
    const mockMessages = [
      { id: 1, text: "Hello", sender: "user" },
      { id: 2, text: "Hi there!", sender: "ai" }
    ]
    
    return <div>...</div>
  }
  
  // ❌ BAD - Don't import from or create external mock files
  import { mockMessages } from '@/data/mock'
  ```

### 2. File Structure
- **Don't touch existing file structure** - Work within the current architecture
- **Don't reorganize folders** - Maintain existing organization
- **Create new components in appropriate existing folders**

### 3. Component Independence
- **Components should be plug-and-play** - Easy to add or remove without breaking other parts
- **No side effects** - Component changes shouldn't affect unrelated parts of the app
- **Minimal dependencies** - Reduce coupling between components

## UI Development

### 4. Styling Approach
- **Use existing UI components** from `/components/ui/`
- **Follow existing patterns** - Check similar components for consistency
- **Maintain design system** - Use existing color schemes, spacing, typography

### 5. State Management
- **Local state first** - Use component state before reaching for global state
- **Don't modify existing stores** unless absolutely necessary
- **Keep UI state separate from business logic**

## Code Quality

### 6. Testing & Validation
- **Test in isolation** - Component should work with mock data
- **Verify no breaking changes** - Ensure existing functionality still works
- **Check responsive design** - Test on different screen sizes

### 7. Performance
- **Lazy load when appropriate** - For heavy components
- **Optimize re-renders** - Use memo, useMemo, useCallback wisely
- **Keep bundle size in mind** - Don't add unnecessary dependencies

## Collaboration

### 8. Git Practices
- **Small, focused commits** - One feature/fix per commit
- **Clear commit messages** - Describe what and why
- **Test before committing** - Ensure code runs without errors

### 9. Documentation
- **Comment complex logic** - Help future developers understand
- **Update this file** - Add new rules as needed
- **Document component props** - Use TypeScript interfaces

## Specific Rules for Current Work

### 10. AI Agent UI Improvements
- **Preserve existing functionality** - Don't break current AI features
- **Enhance, don't replace** - Build on top of what exists
- **Keep mock conversations realistic** - Use believable AI responses

### 11. Video Player Integration
- **Don't modify video player core** - Only enhance UI around it
- **Maintain playback functionality** - Test that video controls still work
- **Keep performance smooth** - Video playback shouldn't lag

### 12. Chat Interface
- **Real-time feel** - Even with mock data, should feel responsive
- **Accessibility** - Keyboard navigation, screen reader support
- **Mobile-first** - Should work well on small screens

---

**Remember:** These rules help maintain code quality and team collaboration. When in doubt, ask before making significant changes.