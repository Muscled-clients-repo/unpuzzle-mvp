# FrameVoice Migration - Systematic Plan
**Date:** 2025-08-26  
**Target:** /Users/mahtabalam/Desktop/Coding/Vibe Coding/FrameVoice  
**Strategy:** Step-by-step migration with verification at each phase

## Critical Requirements
- package.json must be directly in FrameVoice folder (not nested)
- Preserve all video editor functionality
- Systematic approach with verification checkpoints
- No course-specific dependencies

## Phase-by-Phase Migration Plan

### PHASE 1: Project Initialization (STOP & VERIFY)
**Location:** `/Users/mahtabalam/Desktop/Coding/Vibe Coding/FrameVoice`

#### Steps:
1. Navigate to Vibe Coding folder
2. Create Next.js app with specific name:
   ```bash
   cd "/Users/mahtabalam/Desktop/Coding/Vibe Coding"
   npx create-next-app@latest FrameVoice --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint
   ```
3. Navigate into FrameVoice
4. Verify package.json is at root level

#### Verification Checklist:
- [ ] package.json exists at `/FrameVoice/package.json`
- [ ] src folder structure created
- [ ] TypeScript configured
- [ ] Tailwind configured
- [ ] App router enabled

**⚠️ STOP: Verify all items before proceeding to Phase 2**

---

### PHASE 2: Install Required Dependencies (STOP & VERIFY)
**Working Directory:** `/Users/mahtabalam/Desktop/Coding/Vibe Coding/FrameVoice`

#### Core Dependencies to Install:
```bash
npm install lucide-react framer-motion date-fns clsx tailwind-merge
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu 
npm install @radix-ui/react-slider @radix-ui/react-tooltip
npm install @radix-ui/react-switch @radix-ui/react-separator
```

#### Verification:
- [ ] All packages installed without errors
- [ ] package.json updated with dependencies
- [ ] No version conflicts

**⚠️ STOP: Verify installations before proceeding**

---

### PHASE 3: Create Directory Structure (STOP & VERIFY)

#### Directories to Create:
```
FrameVoice/src/
├── lib/
│   └── video-editor/    # Create this
├── components/
│   ├── video-studio/    # Create this
│   └── ui/              # Create this
└── app/
    └── editor/          # Create this
```

#### Verification:
- [ ] All directories created
- [ ] Structure matches above
- [ ] Ready for file copying

**⚠️ STOP: Verify structure before copying files**

---

### PHASE 4: Copy Core Library Files

#### Source → Destination Mapping:

**4.1 Video Editor Library**
```
FROM: Unpuzzle-MVP/src/lib/video-editor/
TO:   FrameVoice/src/lib/video-editor/

Files to copy:
- types.ts
- utils.ts
- VirtualTimelineEngine.ts
- useVideoEditor.ts
- useKeyboardShortcuts.ts
- useRecording.ts
- HistoryManager.ts
```

#### Verification:
- [ ] All 7 files copied
- [ ] No import errors (check for course-specific imports)
- [ ] Files in correct location

**⚠️ STOP: Check imports before proceeding**

---

### PHASE 5: Copy Component Files

**5.1 Video Studio Components**
```
FROM: Unpuzzle-MVP/src/components/video-studio/
TO:   FrameVoice/src/components/video-studio/

Files to copy:
- VideoStudio.tsx
- Timeline.tsx  
- TimelineControls.tsx
- formatters.ts
- useKeyboardShortcuts.ts (local one)
- timeline/ (entire folder)
  - TimelineClips.tsx
  - TimelineRuler.tsx
  - TimelineScrubber.tsx
```

**5.2 UI Components**
```
FROM: Unpuzzle-MVP/src/components/ui/
TO:   FrameVoice/src/components/ui/

Essential files:
- button.tsx
- dialog.tsx
- slider.tsx
- switch.tsx
- separator.tsx
- dropdown-menu.tsx
- tooltip.tsx
- card.tsx
- badge.tsx
- sheet.tsx
```

#### Verification:
- [ ] All video-studio files copied
- [ ] All UI components copied
- [ ] No missing dependencies

**⚠️ STOP: Verify all components before proceeding**

---

### PHASE 6: Copy Utilities and Styles

**6.1 Utility Functions**
```
FROM: Unpuzzle-MVP/src/lib/utils.ts
TO:   FrameVoice/src/lib/utils.ts

Content: cn() function for className merging
```

**6.2 Global Styles**
```
FROM: Unpuzzle-MVP/src/app/globals.css
TO:   FrameVoice/src/app/globals.css

Copy:
- CSS variables
- Dark mode variables
- Custom utility classes
- Animation keyframes
```

#### Verification:
- [ ] cn() function works
- [ ] Styles applied correctly
- [ ] Dark mode variables present

**⚠️ STOP: Test styling before final route**

---

### PHASE 7: Create Editor Route

**7.1 Create Main Editor Page**
```
CREATE: FrameVoice/src/app/editor/page.tsx
```

Simple initial content:
- Import VideoStudio
- Basic layout wrapper
- Remove all course/instructor references

**7.2 Update Layout**
```
MODIFY: FrameVoice/src/app/layout.tsx
```
- Add proper metadata
- Ensure dark mode support

#### Verification:
- [ ] Route accessible at /editor
- [ ] VideoStudio renders
- [ ] No console errors

**⚠️ STOP: Test basic functionality**

---

### PHASE 8: Clean Up and Test

**8.1 Remove Course Dependencies**
- Search for "instructor", "course", "lesson" references
- Replace with generic project/document concepts
- Update any broken imports

**8.2 Functionality Testing**
- [ ] Video loads and plays
- [ ] Timeline drag works
- [ ] Recording works
- [ ] Trim/split works
- [ ] Undo/redo works
- [ ] Keyboard shortcuts work

---

## File Copy Order Summary

### Order of Operations:
1. **Project setup** → Verify structure
2. **Dependencies** → Verify installation
3. **Directories** → Create all folders
4. **Library files** → Copy core logic (7 files)
5. **Components** → Copy UI (20+ files)
6. **Utilities** → Copy helpers
7. **Styles** → Copy CSS
8. **Routes** → Create editor page
9. **Test** → Verify everything works

## Common Issues to Watch For

### Import Path Issues:
- Change `@/instrutor/*` to remove
- Update any absolute imports
- Fix component import paths

### Missing Dependencies:
- Check console for missing packages
- Install additional Radix UI components as needed

### Style Issues:
- Ensure all CSS variables copied
- Check Tailwind config matches

### Course-Specific Code:
- Remove CourseContext
- Remove instructor checks
- Replace with generic logic

## Verification Commands

After each phase, run:
```bash
npm run dev
# Check localhost:3000/editor
# Check console for errors
# Test basic interactions
```

## Final Directory Structure

```
FrameVoice/
├── package.json              ✓ At root level
├── src/
│   ├── app/
│   │   ├── editor/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── utils.ts
│   │   └── video-editor/
│   │       └── [7 files]
│   └── components/
│       ├── video-studio/
│       │   └── [all files]
│       └── ui/
│           └── [all components]
└── [config files]
```

## Success Criteria

- ✅ Clean Next.js project at FrameVoice root
- ✅ All video editor features working
- ✅ No course dependencies
- ✅ No console errors
- ✅ Ready for new features (AI voice, etc.)

This systematic approach ensures nothing is missed and each phase is verified before proceeding.