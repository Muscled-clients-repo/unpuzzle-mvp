# Media Hub - Pages & User Flows

## User Roles & Their Journeys

### 1. **You (Admin/Owner)**
```
Upload footage → Organize → Assign to editors → Review cuts → Approve → Publish
```

### 2. **Senior Editors** (Pakistan/BD team leads)
```
Browse all media → Create projects → Assign to clippers → Review → Export
```

### 3. **Clippers** (Junior editors)
```
View assigned projects → Preview → Download proxies → Edit → Submit
```

---

## Core Pages Structure

### 🏠 **Dashboard** `/media-hub`
```
┌─────────────────────────────────────────────┐
│ 📊 Quick Stats                              │
│ • 4.2TB Storage Used                        │
│ • 12 Active Projects                        │
│ • 8 Editors Online                          │
│                                             │
│ 🎬 Recent Uploads          📝 Active Projects│
│ ┌──────┐ ┌──────┐        • House Tour Edit  │
│ │      │ │      │        • Upwork Success   │
│ │ Thu  │ │ Wed  │        • Charity Story    │
│ └──────┘ └──────┘        • Q4 Compilation   │
│                                             │
│ 👥 Team Activity                            │
│ • Ahmed: Editing "House Tour" (45% done)    │
│ • Sara: Downloading proxies                 │
└─────────────────────────────────────────────┘
```

### 📁 **Media Library** `/media-hub/library`
```
┌─────────────────────────────────────────────┐
│ [Search...] [iPhone] [Sony] [2024] [▼Filter]│
├─────────────────────────────────────────────┤
│ View: [Grid ✓] [List] [Timeline]            │
│                                             │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐               │
│ │📹  │ │📹  │ │📹  │ │📹  │  ← Thumbnails │
│ └────┘ └────┘ └────┘ └────┘     strips    │
│ Jan 15 Jan 14 Jan 14 Jan 13     on hover  │
│ 2.4GB  1.8GB  3.2GB  900MB                 │
│                                             │
│ [Load More...]                              │
└─────────────────────────────────────────────┘

Click thumbnail → Quick preview modal
Double-click → Full preview page
```

### 🎥 **Media Preview** `/media-hub/media/[id]`
```
┌─────────────────────────────────────────────┐
│ House_Tour_Raw_01152024.mp4                 │
├─────────────────────────────────────────────┤
│                                             │
│         [Video Player - 240p/480p]          │
│         ◀ ▐▐ ▶  00:47 / 24:35             │
│                                             │
├─────────────────────────────────────────────┤
│ 📊 Details           🏷️ Tags                │
│ • 4K 60fps          • real-estate          │
│ • iPhone 15 Pro     • success-story        │
│ • Jan 15, 2024      • niagara-falls        │
│                                             │
│ 💬 AI Transcript    ⏱️ Segments             │
│ "So this is the     [Create Clip]          │
│ house I bought..."  02:15-04:30 Kitchen    │
│                     04:30-07:45 Backyard    │
│                                             │
│ [Assign to Project] [Download Proxy]        │
└─────────────────────────────────────────────┘
```

### 📋 **Projects** `/media-hub/projects`
```
┌─────────────────────────────────────────────┐
│ Active Projects (4)  Completed (28)  All    │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐    │
│ │ 🎬 Muscle Journey Documentary       │    │
│ │ 6 clips • 2 editors • Due: Jan 20   │    │
│ │ [████████░░] 80% complete           │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ 📱 TikTok Compilation Week 3        │    │
│ │ 12 clips • 1 editor • Due: Tomorrow │    │
│ │ [██████░░░░] 60% complete           │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ [+ Create New Project]                      │
└─────────────────────────────────────────────┘
```

### ✂️ **Project Editor** `/media-hub/projects/[id]/edit`
```
┌─────────────────────────────────────────────┐
│ Muscle Journey Documentary                  │
│ [Preview] [Share] [Export] [Settings]       │
├─────────────────────────────────────────────┤
│ Source Media          Timeline              │
│ ┌──┐┌──┐┌──┐        ━━━━▌━━━━━━━━━━━━     │
│ │  ││  ││  │        V1 [═══][══][════]    │
│ └──┘└──┘└──┘        A1 [═══][══][════]    │
│ Drag to timeline →   00:00    03:45        │
├─────────────────────────────────────────────┤
│ Editor Notes          Team Chat             │
│ • Cut at 2:15        Ahmed: "Found perfect │
│ • Add transition      closing shot!"        │
│ • Color grade scene 3                      │
└─────────────────────────────────────────────┘
```

---

## Key User Flows

### 🎬 **Flow 1: You Upload & Organize**
```
1. Dashboard → Upload button
2. Drag & drop files (or desktop app sync)
3. Auto-processing starts (proxies, thumbnails)
4. Add tags while uploading
5. Files appear in library when ready
```

### 👥 **Flow 2: Assign to Editor (Ahmed in Dhaka)**
```
1. Select footage in library
2. Click "Create Project" 
3. Name: "House Tour Social Cuts"
4. Assign to: Ahmed
5. Add brief: "Need 3x 60sec clips for Instagram"
6. Ahmed gets notification
```

### ✂️ **Flow 3: Editor Workflow (Optimized for Slow Internet)**
```
1. Ahmed opens assigned project
2. Sees thumbnail strips instantly (100KB)
3. Hovers to preview scenes
4. Clicks to stream 240p (works on 3G)
5. Marks in/out points in browser
6. Downloads ONLY those segments at 480p
7. Edits offline in Premiere
8. Uploads 5KB XML file
9. You review & approve
```

### 📤 **Flow 4: Smart Download System**
```
┌─────────────────────────────────────────────┐
│ Download Manager                            │
├─────────────────────────────────────────────┤
│ ⬇️ House_Tour_Kitchen.mp4 (480p)           │
│    Segment: 02:15-04:30                    │
│    [████████░░] 78% • 45MB/58MB • 2min left│
│                                             │
│ ⏸️ Backyard_Tour.mp4 (480p)                │
│    Queued • 92MB • Starts after above      │
│                                             │
│ ✅ Intro_Speech.mp4 (480p)                 │
│    Complete • 34MB • Open in Finder        │
│                                             │
│ [Pause All] [Clear Completed] [Schedule]    │
└─────────────────────────────────────────────┘
```

---

## Mobile Experience (For Quick Reviews)

### 📱 **Mobile Dashboard**
```
┌──────────────┐
│ Media Hub    │
│              │
│ 📊 4.2TB     │
│ 👥 8 Online  │
│              │
│ Recent ▼     │
│ ┌──┐ ┌──┐   │
│ └──┘ └──┘   │
│              │
│ Projects ▼   │
│ • House Tour │
│ • Upwork Vid │
│              │
│ [Upload] 📷  │
└──────────────┘
```

---

## Special Pages

### 📊 **Analytics** `/media-hub/analytics`
- Storage usage over time
- Most active editors
- Popular footage (most downloaded)
- Bandwidth usage by region
- Project completion rates

### 👥 **Team Management** `/media-hub/team`
```
┌─────────────────────────────────────────────┐
│ Team Members (12)                           │
├─────────────────────────────────────────────┤
│ Name      Role      Location   Status       │
│ Ahmed     Editor    Dhaka      🟢 Active    │
│ Sara      Clipper   Karachi    🟡 Away      │
│ Rashid    Editor    Lahore     🟢 Active    │
│                                             │
│ [+ Invite Team Member]                      │
└─────────────────────────────────────────────┘
```

### ⚙️ **Settings** `/media-hub/settings`
- Storage settings (auto-archive rules)
- Proxy quality preferences
- Team permissions
- Export presets
- API keys (Backblaze, Bunny)

---

## Smart Features Throughout

### 🔍 **AI-Powered Search**
- Search by speech: "Find where I talk about Upwork"
- Visual search: "Footage with whiteboard"
- Smart collections: "All charity content from 2023"

### ⚡ **Quick Actions (Keyboard Shortcuts)**
- `Space` - Play/pause preview
- `I/O` - Set in/out points
- `D` - Download selection
- `E` - Quick edit
- `C` - Create clip
- `S` - Search

### 🎯 **Smart Suggestions**
- "This footage is similar to your viral TikTok"
- "Ahmed usually edits this type of content"
- "Best time to schedule upload: 2AM (faster internet)"

---

## Progressive Loading Strategy

Each page loads in stages for slow connections:

1. **Instant** - Text, layout, navigation
2. **Fast** (< 2s) - Thumbnail strips
3. **Quick** (< 5s) - 240p preview start
4. **Background** - Higher quality as needed

---

## Responsive Design Breakpoints

- **Desktop** (1440px+) - Full interface
- **Laptop** (1024px) - Compact sidebar
- **Tablet** (768px) - Stack panels vertically  
- **Mobile** (375px) - Single column, swipe navigation

This creates a YouTube-meets-Dropbox experience optimized for your video team's specific needs!