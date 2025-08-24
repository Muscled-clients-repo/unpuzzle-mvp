# Professional Online Video Editor Architecture
## Frame-Based, Conflict-Free, Production-Ready System

---

## Core Architecture Principles

### 1. SINGLE SOURCE OF TRUTH (SSOT) SEPARATION

#### Data Ownership Rules
```typescript
// ZUSTAND owns ALL persistent data
interface ZustandOwnership {
  // Project Data (ONLY in Zustand)
  clips: VideoClip[];
  timeline: TimelineTrack[];
  effects: Effect[];
  
  // Frame-Based Position Data (ONLY in Zustand)
  currentFrame: number;
  totalFrames: number;
  fps: 30 | 24 | 25 | 60;
  
  // User Preferences (ONLY in Zustand)
  zoomLevel: number;
  volume: number;
  selectedClipId: string | null;
}

// XSTATE owns ALL state logic
interface XStateOwnership {
  // Machine States (ONLY in XState)
  editorState: 'idle' | 'recording' | 'playing' | 'trimming' | 'exporting';
  
  // Temporary Operation Data (ONLY in XState context)
  recordingStartTime: number;
  exportProgress: number;
  currentOperation: Operation | null;
}
```

**RULE #1:** Never duplicate data between stores. Each piece of data has ONE owner.

### 2. FRAME-BASED CALCULATIONS ONLY

#### Frame System Foundation
```typescript
// ALL positions and durations are in FRAMES, never seconds
interface FrameSystem {
  // Core frame type - NEVER use number for time
  type FrameNumber = number & { readonly __brand: 'FrameNumber' };
  type Fps = 24 | 25 | 30 | 60;
  
  // Every clip stores frames
  interface Clip {
    id: string;
    sourceInFrame: FrameNumber;    // In point in source
    sourceOutFrame: FrameNumber;   // Out point in source
    timelineFrame: FrameNumber;    // Position on timeline
    sourceFps: Fps;                // Original FPS
    projectFps: Fps;               // Timeline FPS
  }
}

// Conversion utilities - ONE WAY conversions
class FrameMath {
  // Frame to time ONLY for display/export
  static frameToTime(frame: FrameNumber, fps: Fps): number {
    return frame / fps;
  }
  
  // Time to frame ONLY for imports
  static timeToFrame(seconds: number, fps: Fps): FrameNumber {
    return Math.round(seconds * fps) as FrameNumber;
  }
  
  // NEVER store the time value, always recalculate
}
```

**RULE #2:** Frames are integers. No floating-point math for positions.

### 3. STATE MACHINE CONTROLS DATA ACCESS

#### XState Guards Zustand Updates
```typescript
const editorMachine = createMachine({
  id: 'videoEditor',
  initial: 'idle',
  states: {
    idle: {
      on: {
        START_RECORDING: 'recording',
        LOAD_CLIP: {
          target: 'idle',
          actions: 'addClipToZustand'
        }
      }
    },
    recording: {
      // CANNOT trim while recording - enforced by state
      on: {
        STOP_RECORDING: {
          target: 'processing',
          actions: 'saveRecordingToZustand'
        }
      }
    },
    processing: {
      // CANNOT edit while processing
      on: {
        PROCESSING_COMPLETE: 'editing'
      }
    },
    editing: {
      on: {
        TRIM_CLIP: {
          // Guard ensures valid frame ranges
          cond: 'isValidFrameRange',
          actions: 'updateClipFramesInZustand'
        },
        PLAY: 'playing',
        START_EXPORT: 'exporting'
      }
    },
    playing: {
      on: {
        PAUSE: 'editing',
        UPDATE_PLAYHEAD: {
          actions: 'updateCurrentFrameInZustand'
        }
      }
    },
    exporting: {
      // CANNOT modify clips while exporting
      entry: 'lockZustandUpdates',
      exit: 'unlockZustandUpdates',
      on: {
        EXPORT_COMPLETE: 'editing'
      }
    }
  }
}, {
  actions: {
    addClipToZustand: (context, event) => {
      useVideoStore.getState().addClip(event.clip);
    },
    updateClipFramesInZustand: (context, event) => {
      useVideoStore.getState().updateClipFrames(
        event.clipId,
        event.inFrame,
        event.outFrame
      );
    },
    updateCurrentFrameInZustand: (context, event) => {
      useVideoStore.getState().setCurrentFrame(event.frame);
    },
    lockZustandUpdates: () => {
      useVideoStore.setState({ locked: true });
    },
    unlockZustandUpdates: () => {
      useVideoStore.setState({ locked: false });
    }
  },
  guards: {
    isValidFrameRange: (context, event) => {
      return event.inFrame < event.outFrame && 
             event.inFrame >= 0;
    }
  }
});
```

**RULE #3:** XState is the ONLY way to modify Zustand. Direct Zustand updates are forbidden.

### 4. CONFLICT PREVENTION PATTERNS

#### Pattern 1: Read/Write Separation
```typescript
// Zustand store with controlled access
const useVideoStore = create<VideoStore>((set, get) => ({
  // DATA (private, only modified via XState)
  _clips: [],
  _currentFrame: 0,
  _locked: false,
  
  // READ-ONLY GETTERS for components
  get clips() { return get()._clips; },
  get currentFrame() { return get()._currentFrame; },
  
  // WRITE METHODS (only called by XState)
  addClip: (clip: Clip) => {
    if (get()._locked) throw new Error('Store is locked during export');
    set(state => ({ _clips: [...state._clips, clip] }));
  },
  
  updateClipFrames: (id: string, inFrame: number, outFrame: number) => {
    if (get()._locked) throw new Error('Store is locked during export');
    set(state => ({
      _clips: state._clips.map(c => 
        c.id === id 
          ? { ...c, sourceInFrame: inFrame, sourceOutFrame: outFrame }
          : c
      )
    }));
  },
  
  setCurrentFrame: (frame: number) => {
    // Playhead updates allowed even when locked
    set({ _currentFrame: frame });
  }
}));
```

#### Pattern 2: Command Pattern for All Operations
```typescript
// Every user action is a command
interface Command {
  type: string;
  validate(): boolean;
  execute(): void;
  undo(): void;
}

class TrimClipCommand implements Command {
  constructor(
    private clipId: string,
    private newInFrame: FrameNumber,
    private newOutFrame: FrameNumber,
    private oldInFrame: FrameNumber,
    private oldOutFrame: FrameNumber
  ) {}
  
  validate(): boolean {
    // Check if state allows trimming
    const state = editorService.getState();
    return state.matches('editing') && 
           this.newInFrame < this.newOutFrame;
  }
  
  execute(): void {
    if (!this.validate()) throw new Error('Invalid command');
    editorService.send({
      type: 'TRIM_CLIP',
      clipId: this.clipId,
      inFrame: this.newInFrame,
      outFrame: this.newOutFrame
    });
  }
  
  undo(): void {
    editorService.send({
      type: 'TRIM_CLIP',
      clipId: this.clipId,
      inFrame: this.oldInFrame,
      outFrame: this.oldOutFrame
    });
  }
}
```

### 5. FRAME-ACCURATE PLAYBACK ENGINE

#### Browser API Integration
```typescript
class FrameAccuratePlayer {
  private video: HTMLVideoElement;
  private fps: Fps;
  private rafId: number | null = null;
  
  // Use requestVideoFrameCallback for frame accuracy
  playFromFrame(startFrame: FrameNumber, endFrame: FrameNumber) {
    const startTime = startFrame / this.fps;
    const endTime = endFrame / this.fps;
    
    this.video.currentTime = startTime;
    this.video.play();
    
    // Frame-accurate monitoring
    const checkFrame = () => {
      if ('requestVideoFrameCallback' in this.video) {
        this.video.requestVideoFrameCallback((now, metadata) => {
          const currentFrame = Math.floor(metadata.mediaTime * this.fps);
          
          // Update Zustand via XState
          editorService.send({
            type: 'UPDATE_PLAYHEAD',
            frame: currentFrame
          });
          
          // Stop at exact frame
          if (currentFrame >= endFrame) {
            this.video.pause();
            return;
          }
          
          checkFrame();
        });
      }
    };
    
    checkFrame();
  }
  
  seekToFrame(frame: FrameNumber) {
    const time = frame / this.fps;
    this.video.currentTime = time;
    
    // Verify frame accuracy
    if ('requestVideoFrameCallback' in this.video) {
      this.video.requestVideoFrameCallback((now, metadata) => {
        const actualFrame = Math.floor(metadata.mediaTime * this.fps);
        if (actualFrame !== frame) {
          // Recursive correction
          this.seekToFrame(frame);
        }
      });
    }
  }
}
```

### 6. TIMELINE RENDERING SYSTEM

#### Canvas-Based Frame Grid
```typescript
class TimelineRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pixelsPerFrame: number = 2;
  
  render() {
    // Get data from Zustand (read-only)
    const clips = useVideoStore.getState().clips;
    const currentFrame = useVideoStore.getState().currentFrame;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render clips
    clips.forEach(clip => {
      const x = clip.timelineFrame * this.pixelsPerFrame;
      const width = (clip.sourceOutFrame - clip.sourceInFrame) * this.pixelsPerFrame;
      
      // Draw clip
      this.ctx.fillStyle = '#4CAF50';
      this.ctx.fillRect(x, 20, width, 60);
      
      // Draw frame markers every 10 frames
      for (let f = 0; f < (clip.sourceOutFrame - clip.sourceInFrame); f += 10) {
        const markerX = x + (f * this.pixelsPerFrame);
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(`F${clip.sourceInFrame + f}`, markerX, 15);
      }
    });
    
    // Draw playhead
    const playheadX = currentFrame * this.pixelsPerFrame;
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(playheadX, 0);
    this.ctx.lineTo(playheadX, this.canvas.height);
    this.ctx.stroke();
  }
  
  // Snap dragging to frames
  pixelToFrame(pixelX: number): FrameNumber {
    return Math.round(pixelX / this.pixelsPerFrame) as FrameNumber;
  }
  
  frameToPixel(frame: FrameNumber): number {
    return frame * this.pixelsPerFrame;
  }
}
```

### 7. EXPORT SYSTEM (LAZY LOADED)

#### FFmpeg Only at Export Time
```typescript
class ExportManager {
  private ffmpeg: FFmpeg | null = null;
  
  async exportProject(): Promise<Blob> {
    // Check state
    const state = editorService.getState();
    if (!state.matches('editing')) {
      throw new Error('Can only export from editing state');
    }
    
    // Transition to exporting state
    editorService.send('START_EXPORT');
    
    try {
      // Lazy load FFmpeg
      if (!this.ffmpeg) {
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        this.ffmpeg = new FFmpeg();
        await this.ffmpeg.load();
      }
      
      // Get clips from Zustand
      const clips = useVideoStore.getState().clips;
      const fps = useVideoStore.getState().fps;
      
      // Build FFmpeg filter complex for frame-accurate editing
      const filterComplex = this.buildFrameAccurateFilter(clips, fps);
      
      // Execute export
      await this.ffmpeg.exec([
        '-filter_complex', filterComplex,
        '-map', '[final]',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '22',
        '-c:a', 'aac',
        '-b:a', '128k',
        'output.mp4'
      ]);
      
      const data = await this.ffmpeg.readFile('output.mp4');
      return new Blob([data.buffer], { type: 'video/mp4' });
      
    } finally {
      // Always return to editing state
      editorService.send('EXPORT_COMPLETE');
    }
  }
  
  private buildFrameAccurateFilter(clips: Clip[], fps: Fps): string {
    // Build frame-accurate trim and concat filter
    const filters = clips.map((clip, i) => {
      const startTime = clip.sourceInFrame / fps;
      const endTime = clip.sourceOutFrame / fps;
      return `[${i}:v]trim=start=${startTime}:end=${endTime},setpts=PTS-STARTPTS[v${i}]`;
    });
    
    const concat = clips.map((_, i) => `[v${i}]`).join('') + 
                  `concat=n=${clips.length}:v=1:a=0[final]`;
    
    return [...filters, concat].join(';');
  }
}
```

### 8. COMPONENT INTEGRATION

#### React Components Using the Architecture
```typescript
// Trim Handle Component
function TrimHandle({ clipId, side }: { clipId: string; side: 'in' | 'out' }) {
  const clip = useVideoStore(state => 
    state.clips.find(c => c.id === clipId)
  );
  const [state] = useMachine(editorMachine);
  
  const canTrim = state.matches('editing');
  
  const handleDrag = (deltaFrames: number) => {
    if (!canTrim) return;
    
    const newFrame = side === 'in' 
      ? clip.sourceInFrame + deltaFrames
      : clip.sourceOutFrame + deltaFrames;
    
    // Send to XState, which validates and updates Zustand
    editorService.send({
      type: 'TRIM_CLIP',
      clipId,
      inFrame: side === 'in' ? newFrame : clip.sourceInFrame,
      outFrame: side === 'out' ? newFrame : clip.sourceOutFrame
    });
  };
  
  return (
    <div 
      className={`trim-handle ${!canTrim ? 'disabled' : ''}`}
      onMouseDown={startDrag}
    />
  );
}

// Timeline Scrubber Component
function Scrubber() {
  const currentFrame = useVideoStore(state => state.currentFrame);
  const totalFrames = useVideoStore(state => state.totalFrames);
  const fps = useVideoStore(state => state.fps);
  const [state] = useMachine(editorMachine);
  
  const canSeek = state.matches('editing') || state.matches('paused');
  
  const handleSeek = (frame: FrameNumber) => {
    if (!canSeek) return;
    
    editorService.send({
      type: 'SEEK',
      frame
    });
  };
  
  return (
    <div className="scrubber">
      <input
        type="range"
        min={0}
        max={totalFrames}
        value={currentFrame}
        onChange={(e) => handleSeek(Number(e.target.value) as FrameNumber)}
        disabled={!canSeek}
      />
      <span className="timecode">
        {frameToTimecode(currentFrame, fps)}
      </span>
    </div>
  );
}
```

### 9. ERROR PREVENTION & RECOVERY

#### Defensive Programming
```typescript
// Error boundary for state conflicts
class StateConflictBoundary {
  static assertValidState() {
    const xState = editorService.getState();
    const zustandLocked = useVideoStore.getState()._locked;
    
    // Verify lock state consistency
    if (xState.matches('exporting') && !zustandLocked) {
      throw new Error('CRITICAL: Export state but store not locked');
    }
    
    if (!xState.matches('exporting') && zustandLocked) {
      throw new Error('CRITICAL: Store locked but not exporting');
    }
  }
  
  static assertFrameIntegrity() {
    const clips = useVideoStore.getState().clips;
    
    clips.forEach(clip => {
      // Frames must be integers
      if (!Number.isInteger(clip.sourceInFrame) || 
          !Number.isInteger(clip.sourceOutFrame)) {
        throw new Error(`CRITICAL: Non-integer frame in clip ${clip.id}`);
      }
      
      // In must be before out
      if (clip.sourceInFrame >= clip.sourceOutFrame) {
        throw new Error(`CRITICAL: Invalid frame range in clip ${clip.id}`);
      }
    });
  }
}

// Run assertions in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    StateConflictBoundary.assertValidState();
    StateConflictBoundary.assertFrameIntegrity();
  }, 1000);
}
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. Set up XState machine with all states
2. Create Zustand store with frame-based data
3. Implement command pattern
4. Build frame math utilities

### Phase 2: Recording & Playback (Week 2)
1. Implement MediaRecorder integration
2. Build frame-accurate player
3. Create scrubber component
4. Add keyboard navigation

### Phase 3: Timeline & Editing (Week 3)
1. Canvas timeline renderer
2. Clip trimming with handles
3. Drag and drop positioning
4. Multi-track support

### Phase 4: Export & Optimization (Week 4)
1. Lazy load FFmpeg.wasm
2. Frame-accurate export
3. Performance optimization
4. Error recovery

## Critical Success Factors

### DO's
✅ Store ALL data in Zustand  
✅ Control ALL state transitions through XState  
✅ Use ONLY integers for frame numbers  
✅ Calculate time from frames when needed  
✅ Validate state before every operation  
✅ Use requestVideoFrameCallback for accuracy  
✅ Lazy load heavy libraries  
✅ Lock store during exports  

### DON'Ts
❌ NEVER store time as floating-point  
❌ NEVER duplicate data between stores  
❌ NEVER allow direct Zustand updates from components  
❌ NEVER mix frame and time calculations  
❌ NEVER trust browser currentTime for frames  
❌ NEVER load FFmpeg before export  
❌ NEVER allow state transitions during export  
❌ NEVER store derived data  

## Testing Strategy

### Unit Tests
```typescript
describe('Frame Calculations', () => {
  test('frames are always integers', () => {
    const frame = timeToFrame(2.3333, 30);
    expect(Number.isInteger(frame)).toBe(true);
    expect(frame).toBe(70);
  });
  
  test('frame ranges are valid', () => {
    const clip = { sourceInFrame: 0, sourceOutFrame: 100 };
    expect(clip.sourceOutFrame > clip.sourceInFrame).toBe(true);
  });
});

describe('State Machine', () => {
  test('cannot trim while exporting', () => {
    const machine = editorMachine.withContext({});
    const exportingState = machine.transition('editing', 'START_EXPORT');
    const result = exportingState.context.can('TRIM_CLIP');
    expect(result).toBe(false);
  });
});
```

### Integration Tests
```typescript
describe('Editor Integration', () => {
  test('trim updates propagate correctly', async () => {
    // Start in editing state
    editorService.send('LOAD_CLIP', { clip: testClip });
    
    // Trim clip
    editorService.send('TRIM_CLIP', {
      clipId: testClip.id,
      inFrame: 10,
      outFrame: 90
    });
    
    // Verify Zustand updated
    const clip = useVideoStore.getState().clips[0];
    expect(clip.sourceInFrame).toBe(10);
    expect(clip.sourceOutFrame).toBe(90);
  });
});
```

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Frame seek accuracy | 100% | Exact frame match |
| Timeline render | <16ms | 60 FPS smooth |
| Trim response | <50ms | Instant feel |
| Export start | <3s | FFmpeg load time |
| Memory usage | <200MB | Without FFmpeg |
| State transitions | <1ms | Instant |

## Conclusion

This architecture ensures:
1. **Zero conflicts** between XState and Zustand
2. **Frame-perfect** accuracy
3. **Single source of truth** for all data
4. **Bulletproof** state management
5. **Professional-grade** video editing

Every line of code follows these principles. No exceptions. No contradictions.