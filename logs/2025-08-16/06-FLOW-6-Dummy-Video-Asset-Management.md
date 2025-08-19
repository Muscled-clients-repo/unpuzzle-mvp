# Flow 6: Dummy Video Asset Management
## Quick Testing Without Recording

> **Implementation Status**: READY FOR DEVELOPMENT
> **Prerequisites**: Flows 1-5 must be completed and user-approved
> **User Testing Required**: MANDATORY after implementation
> **Purpose**: Enable rapid testing without recording videos each time

---

## 🎯 Flow Overview

This flow implements a dummy video asset system that allows developers and testers to quickly add pre-made test videos to the timeline without recording. This dramatically speeds up testing and development workflows.

### Core Requirements
- **Pre-loaded Test Videos**: Multiple test videos available immediately
- **Single-Click Addition**: One click to add to both preview and timeline
- **Variety of Durations**: Short (5s), medium (30s), and long (2min) clips
- **Immediate Playback**: Videos ready to play without processing
- **State Tracking**: State machine properly tracks all dummy assets

---

## 📋 Initial State

**System State Before User Interaction:**
- Assets panel visible on left side
- Empty or populated with existing assets
- Preview panel ready to display video
- Timeline ready to receive new segments
- Test videos pre-loaded in memory/filesystem

**State Machine Context:**
```typescript
interface DummyAssetState {
  assetsState: {
    dummyVideos: DummyVideo[]
    selectedAssetId: string | null
    hoveredAssetId: string | null
    lastAddedAssetId: string | null
  }
  timelineState: {
    currentPlayheadPosition: number
    segments: VideoSegment[]
    nextAvailablePosition: number
  }
  previewState: {
    currentVideoUrl: string | null
    isVideoLoaded: boolean
  }
}

interface DummyVideo {
  id: string
  name: string
  duration: number
  thumbnailUrl: string
  videoUrl: string
  resolution: string
  aspectRatio: string
  fileSize: number
}
```

---

## 🔄 User Interaction Flow

### 1. Asset Display
**System Behavior:**
- Dummy test videos appear in assets panel
- Thumbnails show video preview
- Duration displayed on each asset
- Click interaction highlighted on hover

**Implementation Requirements:**
```typescript
class DummyAssetManager {
  private readonly TEST_VIDEOS: DummyVideo[] = [
    {
      id: 'test-5s',
      name: '5 Second Test',
      duration: 5,
      thumbnailUrl: '/test-assets/thumbnails/5s.jpg',
      videoUrl: '/test-assets/test-5s.mp4',
      resolution: '1920x1080',
      aspectRatio: '16:9',
      fileSize: 1024 * 500 // 500KB
    },
    {
      id: 'test-30s',
      name: '30 Second Test',
      duration: 30,
      thumbnailUrl: '/test-assets/thumbnails/30s.jpg',
      videoUrl: '/test-assets/test-30s.mp4',
      resolution: '1920x1080',
      aspectRatio: '16:9',
      fileSize: 1024 * 2000 // 2MB
    },
    {
      id: 'test-2min',
      name: '2 Minute Test',
      duration: 120,
      thumbnailUrl: '/test-assets/thumbnails/2min.jpg',
      videoUrl: '/test-assets/test-2min.mp4',
      resolution: '1280x720',
      aspectRatio: '16:9',
      fileSize: 1024 * 8000 // 8MB
    }
  ]
  
  renderDummyAssets() {
    return (
      <div className="dummy-assets-section">
        <h3>Test Videos (Quick Testing)</h3>
        <div className="dummy-assets-grid">
          {this.TEST_VIDEOS.map(video => (
            <DummyAssetCard
              key={video.id}
              video={video}
              isHovered={this.state.hoveredAssetId === video.id}
              onHover={this.handleAssetHover}
              onClick={this.handleAssetClick}
            />
          ))}
        </div>
      </div>
    )
  }
}
```

### 2. Click to Add
**System Behavior:**
- User clicks on dummy video asset
- Video immediately appears in preview
- Video added to timeline at current playhead
- No recording needed for testing

**Nuclear-Grade Implementation:**
```typescript
async handleAssetClick(videoId: string) {
  const dummyVideo = this.TEST_VIDEOS.find(v => v.id === videoId)
  if (!dummyVideo) {
    throw new Error(`Dummy video not found: ${videoId}`)
  }
  
  // Phase 1: Add to preview immediately
  await this.addToPreview(dummyVideo)
  
  // Phase 2: Create timeline segment
  const segment = this.createTimelineSegment(dummyVideo)
  
  // Phase 3: Add to timeline at playhead position
  await this.addToTimeline(segment)
  
  // Phase 4: Update state machine
  this.updateStateMachine(dummyVideo, segment)
  
  // Phase 5: Verify addition succeeded
  await this.verifyAssetAddition(segment)
}

private async addToPreview(video: DummyVideo) {
  // Update preview with video URL
  this.dispatch({
    type: 'UPDATE_CURRENT_SEGMENT_VIDEO',
    videoUrl: video.videoUrl
  })
  
  // Wait for video to load
  await this.waitForVideoLoad(video.videoUrl)
  
  console.log(`✅ Dummy video loaded in preview: ${video.name}`)
}

private createTimelineSegment(video: DummyVideo): VideoSegment {
  const currentTime = this.state.timelineState.currentPlayheadPosition
  
  return {
    id: `segment-${Date.now()}`,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
    startTime: this.findNextAvailablePosition(currentTime),
    duration: video.duration,
    trackIndex: 0,
    name: video.name,
    isDummy: true // Mark as dummy for easy identification
  }
}

private async addToTimeline(segment: VideoSegment) {
  // Add segment to timeline
  this.dispatch({
    type: 'ADD_VIDEO_SEGMENT',
    segment
  })
  
  // Update timeline view to show new segment
  this.scrollTimelineToSegment(segment)
  
  console.log(`✅ Segment added to timeline: ${segment.name}`)
}
```

### 3. Multiple Test Videos
**System Behavior:**
- Variety of test videos available:
  - Short clip (5 seconds)
  - Medium clip (30 seconds)
  - Long clip (2 minutes)
- Different resolutions/aspect ratios for testing

**Test Video Specifications:**
```typescript
interface TestVideoSpecs {
  short: {
    duration: 5,
    purpose: 'Quick timeline operations testing',
    content: 'Animated color bars with timer',
    resolution: '1920x1080',
    fps: 30
  },
  medium: {
    duration: 30,
    purpose: 'Standard editing operations',
    content: 'Sample content with scene changes',
    resolution: '1920x1080',
    fps: 30
  },
  long: {
    duration: 120,
    purpose: 'Performance and long-form testing',
    content: 'Extended content with multiple scenes',
    resolution: '1280x720',
    fps: 24
  }
}
```

---

## 💾 Expected System Behavior

### Asset Management
- Dummy videos pre-loaded in assets folder
- Single-click adds to both preview and timeline
- Immediate playback capability
- State machine tracks current asset

**State Updates:**
```typescript
handleDummyAssetAddition(video: DummyVideo, segment: VideoSegment) {
  // Update assets state
  this.state.assetsState.lastAddedAssetId = video.id
  
  // Update timeline state
  this.state.timelineState.segments.push(segment)
  this.state.timelineState.nextAvailablePosition = 
    segment.startTime + segment.duration + 1 // 1 second gap
  
  // Update preview state
  this.state.previewState.currentVideoUrl = video.videoUrl
  this.state.previewState.isVideoLoaded = true
  
  // Trigger state change notification
  this.notifyStateChange()
}
```

### File System Structure
```
public/
└── test-assets/
    ├── test-5s.mp4
    ├── test-30s.mp4
    ├── test-2min.mp4
    ├── thumbnails/
    │   ├── 5s.jpg
    │   ├── 30s.jpg
    │   └── 2min.jpg
    └── metadata.json
```

---

## 🎬 Technical Implementation

### Asset Loading Strategy
```typescript
class TestAssetLoader {
  private loadedAssets = new Map<string, HTMLVideoElement>()
  
  async preloadTestVideos() {
    // Preload all test videos for instant access
    for (const video of this.TEST_VIDEOS) {
      await this.preloadVideo(video)
    }
    console.log('✅ All test videos preloaded')
  }
  
  private async preloadVideo(video: DummyVideo) {
    const videoElement = document.createElement('video')
    videoElement.src = video.videoUrl
    videoElement.preload = 'auto'
    
    return new Promise((resolve, reject) => {
      videoElement.onloadeddata = () => {
        this.loadedAssets.set(video.id, videoElement)
        resolve(videoElement)
      }
      videoElement.onerror = reject
    })
  }
  
  getPreloadedVideo(videoId: string): HTMLVideoElement | null {
    return this.loadedAssets.get(videoId) || null
  }
}
```

### State Machine Actions
```typescript
// Phase 1: Dummy implementation
type DummyAssetActions = 
  | { type: 'LOAD_DUMMY_ASSETS' }
  | { type: 'ADD_DUMMY_TO_TIMELINE'; video: DummyVideo }
  | { type: 'ADD_DUMMY_TO_PREVIEW'; videoUrl: string }
  | { type: 'HOVER_DUMMY_ASSET'; assetId: string | null }
  | { type: 'SELECT_DUMMY_ASSET'; assetId: string }
```

### Visual Component
```typescript
function DummyAssetCard({ video, isHovered, onHover, onClick }) {
  return (
    <div 
      className={`dummy-asset-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => onHover(video.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(video.id)}
    >
      <div className="thumbnail-wrapper">
        <img src={video.thumbnailUrl} alt={video.name} />
        <div className="duration-badge">
          {formatDuration(video.duration)}
        </div>
      </div>
      <div className="asset-info">
        <h4>{video.name}</h4>
        <span className="resolution">{video.resolution}</span>
      </div>
      {isHovered && (
        <div className="hover-overlay">
          <button className="add-button">
            + Add to Timeline
          </button>
        </div>
      )}
    </div>
  )
}
```

---

## ⚠️ Edge Cases

### Missing Test Files
```typescript
handleMissingTestFile(videoId: string) {
  console.error(`Test video file missing: ${videoId}`)
  
  // Show user-friendly error
  this.showNotification({
    type: 'error',
    message: 'Test video file not found. Please reinstall test assets.',
    action: {
      label: 'Download Test Assets',
      handler: this.downloadTestAssets
    }
  })
}
```

### Timeline Collision
```typescript
findNextAvailablePosition(preferredTime: number): number {
  const segments = this.state.timelineState.segments
  
  // Check for collisions at preferred time
  const collision = segments.find(s => 
    preferredTime >= s.startTime && 
    preferredTime < s.startTime + s.duration
  )
  
  if (collision) {
    // Find next available position after collision
    return collision.startTime + collision.duration + 1
  }
  
  return preferredTime
}
```

### Preview Already Playing
```typescript
async handleAddWhilePlaying(video: DummyVideo) {
  const wasPlaying = this.state.playback.isPlaying
  
  // Pause if playing
  if (wasPlaying) {
    await this.pausePlayback()
  }
  
  // Add new video
  await this.addDummyVideo(video)
  
  // Resume if was playing
  if (wasPlaying) {
    await this.resumePlayback()
  }
}
```

---

## 🧪 User Testing Checklist

### Basic Functionality
- [ ] Test videos appear in assets panel
- [ ] Thumbnails display correctly
- [ ] Duration badges show accurate time
- [ ] Hover state highlights asset cards

### Click to Add
- [ ] Single click adds video to preview
- [ ] Video appears in timeline at playhead
- [ ] No delay or loading time
- [ ] Multiple videos can be added sequentially

### Video Variety
- [ ] 5-second video works correctly
- [ ] 30-second video works correctly
- [ ] 2-minute video works correctly
- [ ] Different resolutions display properly

### State Management
- [ ] State machine tracks current asset
- [ ] Timeline segments created correctly
- [ ] Preview updates immediately
- [ ] Playback controls work with dummy videos

### Edge Cases
- [ ] Timeline collision handling works
- [ ] Missing file error handled gracefully
- [ ] Rapid clicking doesn't cause issues
- [ ] Memory usage remains stable

---

## 🚀 Implementation Strategy

### Phase 6.1: Test Asset Creation (15 min)
1. Create test video files (or use placeholders)
2. Generate thumbnail images
3. Set up file structure
4. Create metadata file

### Phase 6.2: Asset Display UI (30 min)
1. Create DummyAssetCard component
2. Add to AssetsPanel
3. Implement hover states
4. Add duration badges

### Phase 6.3: Click Handler Implementation (30 min)
1. Implement asset click handler
2. Add to preview logic
3. Create timeline segment
4. Update state machine

### Phase 6.4: Integration & Testing (15 min)
1. Test all three video durations
2. Verify timeline addition
3. Check preview playback
4. Validate state updates

---

## 🔗 Integration Points

### With Existing Systems
```typescript
// Integration with AssetPanel
class AssetsPanel {
  renderAssets() {
    return (
      <>
        <DummyAssetsSection />  {/* New section for test videos */}
        <UserAssetsSection />    {/* Existing user uploads */}
      </>
    )
  }
}

// Integration with Timeline
class Timeline {
  acceptDummySegment(segment: VideoSegment) {
    // Treat dummy segments same as regular segments
    this.addSegment(segment)
    
    // Optional: Add visual indicator for dummy content
    if (segment.isDummy) {
      this.addDummyIndicator(segment.id)
    }
  }
}
```

---

## ✅ Success Criteria

Flow 6 is considered complete when:

1. **Test Videos Available**: All three test videos appear in assets panel
2. **Single-Click Addition**: Videos add to timeline with one click
3. **Immediate Preview**: Videos appear in preview without delay
4. **State Tracking**: State machine properly tracks all dummy assets
5. **Performance**: No lag when adding videos
6. **User Approval**: Manual testing checklist completed and approved by user

**🚨 MANDATORY**: This flow requires explicit user testing and approval before proceeding to Flow 7

---

**Next Flow**: Flow 7 - AI Script to Audio Conversion
**Dependencies**: This flow is independent but integrates with the timeline system from previous flows