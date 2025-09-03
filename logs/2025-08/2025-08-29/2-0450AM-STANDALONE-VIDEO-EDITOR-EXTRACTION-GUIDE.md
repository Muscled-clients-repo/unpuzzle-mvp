# Standalone Video Editor Extraction Guide
**Date:** August 29, 2025, 4:50 AM EST  
**Purpose:** Complete guide to extract video editor into new Next.js project

## Overview
Step-by-step guide to create a standalone Next.js project with the video editor at `/video-editor` route, including all features, styles, and dependencies.

## Phase 1: Project Setup

### 1.1 Create New Next.js Project
```bash
npx create-next-app@latest video-editor-app --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint
cd video-editor-app
```

### 1.2 Install Required Dependencies
```bash
# Core dependencies
npm install lucide-react date-fns clsx tailwind-merge
npm install class-variance-authority

# UI Components (shadcn/ui)
npm install @radix-ui/react-slot @radix-ui/react-avatar
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-label @radix-ui/react-popover
npm install @radix-ui/react-select @radix-ui/react-separator
npm install @radix-ui/react-switch @radix-ui/react-tabs
npm install @radix-ui/react-toast @radix-ui/react-tooltip
```

## Phase 2: Core Library Setup

### 2.1 Create Video Editor Library Structure
```
src/lib/video-editor/
├── HistoryManager.ts
├── VirtualTimelineEngine.ts
├── types.ts
├── useKeyboardShortcuts.ts
├── useRecording.ts
├── useVideoEditor.ts
└── utils.ts
```

### 2.2 Files to Copy from Source
```bash
# From: /Users/mahtabalam/Desktop/Coding/Unpuzzle-MVP/src/lib/video-editor/
# To: [new-project]/src/lib/video-editor/

- HistoryManager.ts (118 lines)
- VirtualTimelineEngine.ts (311 lines)
- types.ts (34 lines)
- useKeyboardShortcuts.ts (61 lines)
- useRecording.ts (150 lines)
- useVideoEditor.ts (628 lines)
- utils.ts (98 lines)
```

## Phase 3: UI Components Setup

### 3.1 Create UI Components Directory
```
src/components/ui/
├── button.tsx
├── card.tsx
├── dialog.tsx
├── dropdown-menu.tsx
├── input.tsx
├── label.tsx
├── select.tsx
├── separator.tsx
├── slider.tsx
├── switch.tsx
├── tabs.tsx
└── tooltip.tsx
```

### 3.2 Copy UI Components
```bash
# From: /Users/mahtabalam/Desktop/Coding/Unpuzzle-MVP/src/components/ui/
# Copy all components listed above
```

### 3.3 Setup Utils
```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Phase 4: Video Studio Components

### 4.1 Create Video Studio Structure
```
src/components/video-studio/
├── VideoStudio.tsx
├── Timeline.tsx
├── formatters.ts
├── useKeyboardShortcuts.ts
└── timeline/
    ├── TimelineClips.tsx
    ├── TimelineControls.tsx
    ├── TimelineRuler.tsx
    └── TimelineScrubber.tsx
```

### 4.2 Files to Copy
```bash
# Main Components
VideoStudio.tsx (689 lines)
Timeline.tsx (301 lines)
formatters.ts (16 lines)
useKeyboardShortcuts.ts (155 lines)

# Timeline Components
timeline/TimelineClips.tsx (773 lines)
timeline/TimelineControls.tsx (92 lines)
timeline/TimelineRuler.tsx (75 lines)
timeline/TimelineScrubber.tsx (36 lines)
```

## Phase 5: Styles Configuration

### 5.1 Update globals.css
```css
/* Add to src/app/globals.css */

/* Custom scrollbar styles */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: hsl(var(--border));
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground));
}

/* Timeline-specific styles */
.timeline-grid {
  background-image: repeating-linear-gradient(
    90deg,
    hsl(var(--border)) 0px,
    hsl(var(--border)) 1px,
    transparent 1px,
    transparent 60px
  );
}

.timeline-track {
  min-height: 64px;
  position: relative;
}

/* Clip styles */
.timeline-clip {
  user-select: none;
  touch-action: none;
}

.trim-handle {
  cursor: ew-resize;
  user-select: none;
}

.trim-handle:hover {
  background-color: hsl(var(--primary));
}

/* Scrubber animation */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.scrubber-head {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### 5.2 Tailwind Config Updates
```javascript
// tailwind.config.ts
module.exports = {
  darkMode: ["class"],
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

## Phase 6: Create Video Editor Route

### 6.1 Create Route Structure
```bash
mkdir -p src/app/video-editor
```

### 6.2 Create Page Component
```typescript
// src/app/video-editor/page.tsx
'use client'

import { VideoStudio } from '@/components/video-studio/VideoStudio'

export default function VideoEditorPage() {
  return (
    <div className="h-screen bg-background">
      <VideoStudio />
    </div>
  )
}
```

### 6.3 Create Layout (Optional)
```typescript
// src/app/video-editor/layout.tsx
export default function VideoEditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
```

## Phase 7: Additional Dependencies

### 7.1 Install Animation Library
```bash
npm install tailwindcss-animate
```

### 7.2 Add CSS Variables
```css
/* Add to src/app/globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}
```

## Phase 8: Testing & Verification

### 8.1 Start Development Server
```bash
npm run dev
# Navigate to http://localhost:3000/video-editor
```

### 8.2 Feature Checklist
- [ ] Timeline renders with tracks
- [ ] Drag and drop clips
- [ ] Trim functionality with handles
- [ ] Scrubber syncs with video
- [ ] Keyboard shortcuts work (space, delete, z/Z)
- [ ] Zoom controls functional
- [ ] Recording features (screen/camera)
- [ ] Undo/Redo system
- [ ] Multi-track support
- [ ] Frame-based positioning (30 FPS)

### 8.3 Known Routes
- Main editor: `/video-editor`
- Can add additional routes like:
  - `/video-editor/projects` - Project management
  - `/video-editor/media` - Media library
  - `/video-editor/export` - Export settings

## Phase 9: Optional Enhancements

### 9.1 Add Navigation
```typescript
// src/components/video-studio/VideoStudio.tsx
// Add back button to navigate away from editor
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// In the header section:
<Link href="/">
  <Button variant="ghost" size="sm">
    <ArrowLeft className="mr-2 h-4 w-4" />
    Back
  </Button>
</Link>
```

### 9.2 Add Sample Videos
```typescript
// Create sample data
const SAMPLE_VIDEOS = [
  {
    id: '1',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    title: 'Big Buck Bunny'
  },
  // Add more sample videos
]
```

## Files Summary

### Total Files to Copy: ~20 files
### Total Lines of Code: ~3,500 lines
### Key Dependencies: 15+ npm packages

## Directory Structure Summary
```
video-editor-app/
├── src/
│   ├── app/
│   │   ├── globals.css (with custom styles)
│   │   └── video-editor/
│   │       └── page.tsx
│   ├── components/
│   │   ├── ui/ (12+ components)
│   │   └── video-studio/
│   │       ├── VideoStudio.tsx
│   │       ├── Timeline.tsx
│   │       ├── formatters.ts
│   │       ├── useKeyboardShortcuts.ts
│   │       └── timeline/ (4 components)
│   └── lib/
│       ├── utils.ts
│       └── video-editor/ (7 files)
├── tailwind.config.ts
├── package.json
└── next.config.js
```

This creates a fully functional, standalone video editor application with all features preserved from the original implementation.