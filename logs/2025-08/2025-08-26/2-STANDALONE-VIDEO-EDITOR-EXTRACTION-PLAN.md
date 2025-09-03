# Standalone Video Editor Extraction Plan
**Date:** 2025-08-26  
**Purpose:** Extract video editor into standalone Next.js SaaS application  
**Timeline:** 1-2 days for extraction, 3-5 days for SaaS features

## Overview
Transform the video-editor route from Unpuzzle into a standalone video editing SaaS application, preserving all functionality while removing course-specific dependencies.

## Project Structure

### New Project Setup
```
video-editor-app/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (marketing)/
│   │   │   ├── page.tsx                 # Landing page
│   │   │   └── pricing/page.tsx
│   │   ├── editor/
│   │   │   └── [projectId]/page.tsx     # Main editor (from video-editor route)
│   │   ├── dashboard/
│   │   │   └── page.tsx                 # User's projects
│   │   └── api/
│   │       ├── elevenlabs/route.ts
│   │       ├── projects/route.ts
│   │       └── export/route.ts
│   ├── lib/
│   │   └── video-editor/                # Copy entire folder
│   │       ├── types.ts
│   │       ├── utils.ts
│   │       ├── VirtualTimelineEngine.ts
│   │       ├── useVideoEditor.ts
│   │       ├── useKeyboardShortcuts.ts
│   │       ├── useRecording.ts
│   │       └── HistoryManager.ts
│   └── components/
│       ├── video-studio/                # Copy entire folder
│       │   ├── VideoStudio.tsx
│       │   ├── Timeline.tsx
│       │   ├── TimelineControls.tsx
│       │   └── timeline/
│       │       ├── TimelineClips.tsx
│       │       ├── TimelineRuler.tsx
│       │       └── TimelineScrubber.tsx
│       └── ui/                          # Copy needed UI components
│           ├── button.tsx
│           ├── dialog.tsx
│           └── [other shadcn components]
```

## Extraction Steps

### Phase 1: Project Initialization (30 mins)

#### 1.1 Create New Next.js Project
```bash
npx create-next-app@latest video-editor-app --typescript --tailwind --app
cd video-editor-app
```

#### 1.2 Install Dependencies
```bash
# Core dependencies from Unpuzzle
npm install framer-motion lucide-react date-fns
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-slider @radix-ui/react-tooltip

# Dev dependencies
npm install -D @types/node
```

### Phase 2: Core Video Editor Migration (2 hours)

#### 2.1 Copy Video Editor Library
**Source:** `/src/lib/video-editor/`
**Destination:** New project `/src/lib/video-editor/`
- Copy all TypeScript files unchanged
- Verify no course-specific imports

#### 2.2 Copy Video Studio Components
**Source:** `/src/components/video-studio/`
**Destination:** New project `/src/components/video-studio/`
- Copy entire folder structure
- Remove any course-specific references

#### 2.3 Copy UI Components
**Source:** `/src/components/ui/`
**Destination:** New project `/src/components/ui/`
- Copy only used components (button, dialog, slider, etc.)
- Copy cn utility function

#### 2.4 Copy Styles
**Source:** `/src/app/globals.css`
- Copy all custom CSS variables
- Copy Tailwind base styles
- Copy any video-editor specific styles

### Phase 3: Route Setup (1 hour)

#### 3.1 Create Editor Route
**File:** `/src/app/editor/[projectId]/page.tsx`
- Copy content from current `/video-editor/page.tsx`
- Replace course context with project context
- Add project loading/saving logic

#### 3.2 Remove Course Dependencies
- Remove instructor context
- Remove lesson/course references
- Replace with project/document model

### Phase 4: Data Model Adaptation (2 hours)

#### 4.1 New Data Types
```typescript
interface Project {
  id: string
  title: string
  userId: string
  clips: Clip[]
  tracks: Track[]
  duration: number
  thumbnail?: string
  createdAt: Date
  updatedAt: Date
}

interface User {
  id: string
  email: string
  projects: Project[]
  subscription?: SubscriptionTier
}
```

#### 4.2 Storage Strategy
- Local storage for autosave
- Cloud storage for projects (Supabase/Firebase)
- CDN for exported videos (Cloudinary/S3)

### Phase 5: Essential SaaS Features (1 day)

#### 5.1 Authentication
- NextAuth.js or Clerk for auth
- Protected routes for editor
- User session management

#### 5.2 Project Management
- Create/Read/Update/Delete projects
- Project listing dashboard
- Autosave functionality
- Project sharing (future)

#### 5.3 Landing Page
- Hero section with demo video
- Features showcase
- Pricing plans
- Call-to-action

#### 5.4 Export Functionality
- MP4 export using FFmpeg.wasm
- Quality settings
- Download or cloud save

### Phase 6: Styling & Branding (2 hours)

#### 6.1 Theme Customization
- New color scheme (different from Unpuzzle)
- Custom logo and branding
- Consistent design system

#### 6.2 Responsive Design
- Mobile-friendly landing pages
- Editor mobile warning/redirect
- Tablet optimizations

## File-by-File Migration Guide

### Critical Files to Copy As-Is:
```
✓ /lib/video-editor/types.ts
✓ /lib/video-editor/utils.ts  
✓ /lib/video-editor/VirtualTimelineEngine.ts
✓ /lib/video-editor/useVideoEditor.ts
✓ /lib/video-editor/useKeyboardShortcuts.ts
✓ /lib/video-editor/useRecording.ts
✓ /lib/video-editor/HistoryManager.ts

✓ /components/video-studio/VideoStudio.tsx
✓ /components/video-studio/Timeline.tsx
✓ /components/video-studio/TimelineControls.tsx
✓ /components/video-studio/formatters.ts
✓ /components/video-studio/timeline/*.tsx

✓ All required UI components
✓ All required styles
```

### Files to Modify:
```
⚙️ VideoStudio.tsx - Remove course context
⚙️ Main layout - Add new navigation
⚙️ API routes - Add project endpoints
```

### New Files to Create:
```
+ Landing page
+ Dashboard page
+ Auth pages
+ Project API routes
+ Export functionality
+ Billing/subscription
```

## CSS/Styling Migration

### Global Styles to Copy:
```css
/* From globals.css */
- CSS custom properties (--background, --foreground, etc.)
- Tailwind base/components/utilities
- Dark mode variables
- Animation keyframes
- Custom utility classes (.hide-scrollbar, etc.)
```

### Component Styles:
- All Tailwind classes used in components
- Any inline styles in video components
- Framer Motion animation values
- Critical responsive breakpoints

## Environment Variables

### New .env.local:
```
# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret

# Database
DATABASE_URL=your-database-url

# Storage
CLOUDINARY_URL=your-cloudinary-url

# APIs
ELEVENLABS_API_KEY=your-api-key

# Analytics (optional)
POSTHOG_KEY=your-posthog-key
```

## Testing Checklist

### Core Functionality:
- [ ] Video playback works
- [ ] Timeline drag/drop works
- [ ] Recording works
- [ ] Trim/split works
- [ ] Undo/redo works
- [ ] Keyboard shortcuts work
- [ ] Multi-track works
- [ ] Export works

### New Features:
- [annon create project
- [ ] Can save project
- [ ] Can load project
- [ ] Autosave works
- [ ] Authentication works
- [ ] Dashboard displays projects

## Deployment Strategy

### Hosting Options:
1. **Vercel** - Best for Next.js, easy setup
2. **Railway** - Good for full-stack with DB
3. **AWS Amplify** - Enterprise scale

### Domain & Branding:
- Register domain (voiceforge.io, talktrackeditor.com, etc.)
- Set up SSL certificate
- Configure email service
- Set up analytics

## Progressive Enhancement Roadmap

### MVP (Week 1):
- Core editor functionality
- Basic auth
- Local storage save
- Simple export

### V1 (Week 2-3):
- Cloud storage
- Project management
- User dashboard
- Premium features

### V2 (Month 2):
- Collaboration features
- Advanced export options
- AI voice integration
- Template library

### V3 (Month 3+):
- Team workspaces
- Plugin system
- Mobile app
- API for developers

## Monetization Strategy

### Freemium Model:
- **Free:** 5 projects, 720p export, watermark
- **Pro ($19/mo):** Unlimited projects, 1080p, no watermark
- **Team ($49/mo):** Collaboration, 4K export, priority support

### Additional Revenue:
- AI voice credits
- Storage upgrades
- Custom branding
- Enterprise licenses

## Success Metrics

### Technical:
- Page load < 3s
- Editor load < 5s
- Export success rate > 95%
- Zero data loss

### Business:
- User activation rate > 40%
- Free-to-paid conversion > 3%
- Monthly churn < 10%
- NPS score > 50

## Risk Mitigation

### Technical Risks:
- **Browser compatibility:** Test all major browsers
- **Performance issues:** Implement lazy loading
- **Data loss:** Autosave every 30 seconds
- **Export failures:** Queue system with retries

### Business Risks:
- **Competition:** Focus on unique AI voice feature
- **Pricing:** A/B test different tiers
- **Support burden:** Build comprehensive docs

## Conclusion

This extraction plan creates a clean, standalone video editor SaaS from the existing Unpuzzle codebase. The modular architecture makes this extraction straightforward - most code can be copied directly with minimal modifications. The main work involves adding SaaS wrapper features (auth, projects, billing) around the core editor.

Total estimated time: 3-5 days for fully functional MVP, 2-3 weeks for production-ready V1.