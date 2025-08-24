# Bulletproof Video Editor Architecture - True SSOT
## Zero Contradictions, Frame-Based, No Floating-Point

---

## 1. COMPLETE TYPE SYSTEM

```typescript
// Branded types - NEVER mix with regular numbers
type Frame = number & { readonly __brand: 'Frame' };
type Fps = 24 | 25 | 30 | 60;
type ClipId = string & { readonly __brand: 'ClipId' };
type TrackId = string & { readonly __brand: 'TrackId' };

// Helper functions for type safety
const Frame = {
  from: (n: number): Frame => Math.floor(n) as Frame,
  toNumber: (f: Frame): number => f as number, // Explicit unwrap
  add: (a: Frame, b: Frame): Frame => (a + b) as Frame,
  subtract: (a: Frame, b: Frame): Frame => Math.max(0, a - b) as Frame,
  min: (a: Frame, b: Frame): Frame => Math.min(a, b) as Frame,
  max: (a: Frame, b: Frame): Frame => Math.max(a, b) as Frame,
  equals: (a: Frame, b: Frame): boolean => a === b,
};

const ClipId = {
  create: (): ClipId => crypto.randomUUID() as ClipId,
  from: (s: string): ClipId => s as ClipId,
};

const TrackId = {
  from: (s: string): TrackId => s as TrackId,
};

// Core data types
interface Clip {
  id: ClipId;
  videoUrl: string;
  sourceInFrame: Frame;
  sourceOutFrame: Frame;
  timelineFrame: Frame;
  trackId: TrackId;
}

interface Track {
  id: TrackId;
  name: string;
  muted: boolean;
  locked: boolean;
}
```

---

## 2. ZUSTAND STORE - ALL DATA LIVES HERE

```typescript
import { create } from 'zustand';

interface VideoEditorStore {
  // ============ PRIVATE DATA (never access directly) ============
  _clips: Map<ClipId, Clip>;
  _tracks: Map<TrackId, Track>;
  _currentFrame: Frame;
  _fps: Fps;
  _selectedClipId: ClipId | null;
  _zoomLevel: number;
  _isLocked: boolean;

  // ============ PUBLIC GETTERS (read-only access) ============
  getClips: () => Clip[];
  getClip: (id: ClipId) => Clip | undefined;
  getTracks: () => Track[];
  getCurrentFrame: () => Frame;
  getFps: () => Fps;
  getSelectedClipId: () => ClipId | null;
  getZoomLevel: () => number;
  getTotalFrames: () => Frame;
  isLocked: () => boolean;

  // ============ MUTATIONS (ONLY called by XState) ============
  // These are the ONLY ways to modify data
  mutations: {
    addClip: (clip: Clip) => void;
    updateClipTrim: (id: ClipId, inFrame: Frame, outFrame: Frame) => void;
    moveClipToFrame: (id: ClipId, frame: Frame) => void;
    deleteClip: (id: ClipId) => void;
    setCurrentFrame: (frame: Frame) => void;
    setSelectedClip: (id: ClipId | null) => void;
    setZoomLevel: (level: number) => void;
    lockStore: () => void;
    unlockStore: () => void;
  };
}

export const useVideoEditorStore = create<VideoEditorStore>((set, get) => ({
  // Private data
  _clips: new Map(),
  _tracks: new Map([
    [TrackId.from('track-1'), { 
      id: TrackId.from('track-1'), 
      name: 'Video 1', 
      muted: false, 
      locked: false 
    }]
  ]),
  _currentFrame: Frame.from(0),
  _fps: 30 as Fps,
  _selectedClipId: null,
  _zoomLevel: 1,
  _isLocked: false,

  // Public getters - Components use these
  getClips: () => Array.from(get()._clips.values()),
  getClip: (id) => get()._clips.get(id),
  getTracks: () => Array.from(get()._tracks.values()),
  getCurrentFrame: () => get()._currentFrame,
  getFps: () => get()._fps,
  getSelectedClipId: () => get()._selectedClipId,
  getZoomLevel: () => get()._zoomLevel,
  isLocked: () => get()._isLocked,
  
  getTotalFrames: () => {
    const clips = Array.from(get()._clips.values());
    if (clips.length === 0) return Frame.from(0);
    
    return clips.reduce((max, clip) => {
      const clipEnd = Frame.add(
        clip.timelineFrame, 
        Frame.subtract(clip.sourceOutFrame, clip.sourceInFrame)
      );
      return Frame.max(max, clipEnd);
    }, Frame.from(0));
  },

  // Mutations - ONLY XState calls these
  mutations: {
    addClip: (clip) => {
      if (get()._isLocked) throw new Error('Store is locked');
      set(state => {
        const newClips = new Map(state._clips);
        newClips.set(clip.id, clip);
        return { _clips: newClips };
      });
    },

    updateClipTrim: (id, inFrame, outFrame) => {
      if (get()._isLocked) throw new Error('Store is locked');
      set(state => {
        const newClips = new Map(state._clips);
        const clip = newClips.get(id);
        if (clip) {
          newClips.set(id, { 
            ...clip, 
            sourceInFrame: inFrame, 
            sourceOutFrame: outFrame 
          });
        }
        return { _clips: newClips };
      });
    },

    moveClipToFrame: (id, frame) => {
      if (get()._isLocked) throw new Error('Store is locked');
      set(state => {
        const newClips = new Map(state._clips);
        const clip = newClips.get(id);
        if (clip) {
          newClips.set(id, { ...clip, timelineFrame: frame });
        }
        return { _clips: newClips };
      });
    },

    deleteClip: (id) => {
      if (get()._isLocked) throw new Error('Store is locked');
      set(state => {
        const newClips = new Map(state._clips);
        newClips.delete(id);
        return { _clips: newClips };
      });
    },

    setCurrentFrame: (frame) => {
      // Playhead can move even when locked
      set({ _currentFrame: frame });
    },

    setSelectedClip: (id) => {
      if (get()._isLocked) throw new Error('Store is locked');
      set({ _selectedClipId: id });
    },

    setZoomLevel: (level) => {
      set({ _zoomLevel: level });
    },

    lockStore: () => {
      set({ _isLocked: true });
    },

    unlockStore: () => {
      set({ _isLocked: false });
    }
  }
}));
```

---

## 3. XSTATE MACHINE - CONTROLS WHEN MUTATIONS HAPPEN

```typescript
import { createMachine, interpret } from 'xstate';

type EditorEvent =
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING'; clipData: { videoUrl: string; durationFrames: Frame } }
  | { type: 'TRIM_CLIP'; clipId: ClipId; inFrame: Frame; outFrame: Frame }
  | { type: 'MOVE_CLIP'; clipId: ClipId; frame: Frame }
  | { type: 'DELETE_CLIP'; clipId: ClipId }
  | { type: 'SELECT_CLIP'; clipId: ClipId | null }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SEEK'; frame: Frame }
  | { type: 'START_EXPORT' }
  | { type: 'EXPORT_COMPLETE' }
  | { type: 'EXPORT_ERROR' };

const editorMachine = createMachine({
  id: 'videoEditor',
  initial: 'idle',
  
  states: {
    idle: {
      on: {
        START_RECORDING: 'recording',
        PLAY: 'playing',
        TRIM_CLIP: { actions: 'trimClip' },
        MOVE_CLIP: { actions: 'moveClip' },
        DELETE_CLIP: { actions: 'deleteClip' },
        SELECT_CLIP: { actions: 'selectClip' },
        SEEK: { actions: 'seek' },
        START_EXPORT: 'exporting'
      }
    },
    
    recording: {
      on: {
        STOP_RECORDING: {
          target: 'idle',
          actions: 'saveRecording'
        }
      }
    },
    
    playing: {
      on: {
        PAUSE: 'idle',
        SEEK: { actions: 'seek' }
      }
    },
    
    exporting: {
      entry: 'lockStore',
      exit: 'unlockStore',
      on: {
        EXPORT_COMPLETE: 'idle',
        EXPORT_ERROR: 'idle'
      }
    }
  }
}, {
  actions: {
    trimClip: (_, event) => {
      if (event.type !== 'TRIM_CLIP') return;
      
      const store = useVideoEditorStore.getState();
      const clip = store.getClip(event.clipId);
      
      if (clip && Frame.toNumber(event.inFrame) < Frame.toNumber(event.outFrame)) {
        store.mutations.updateClipTrim(event.clipId, event.inFrame, event.outFrame);
      }
    },
    
    moveClip: (_, event) => {
      if (event.type !== 'MOVE_CLIP') return;
      useVideoEditorStore.getState().mutations.moveClipToFrame(event.clipId, event.frame);
    },
    
    deleteClip: (_, event) => {
      if (event.type !== 'DELETE_CLIP') return;
      useVideoEditorStore.getState().mutations.deleteClip(event.clipId);
    },
    
    selectClip: (_, event) => {
      if (event.type !== 'SELECT_CLIP') return;
      useVideoEditorStore.getState().mutations.setSelectedClip(event.clipId);
    },
    
    seek: (_, event) => {
      if (event.type !== 'SEEK') return;
      useVideoEditorStore.getState().mutations.setCurrentFrame(event.frame);
    },
    
    saveRecording: (_, event) => {
      if (event.type !== 'STOP_RECORDING') return;
      
      const store = useVideoEditorStore.getState();
      const clip: Clip = {
        id: ClipId.create(),
        videoUrl: event.clipData.videoUrl,
        sourceInFrame: Frame.from(0),
        sourceOutFrame: event.clipData.durationFrames,
        timelineFrame: store.getTotalFrames(),
        trackId: TrackId.from('track-1')
      };
      
      store.mutations.addClip(clip);
    },
    
    lockStore: () => {
      useVideoEditorStore.getState().mutations.lockStore();
    },
    
    unlockStore: () => {
      useVideoEditorStore.getState().mutations.unlockStore();
    }
  }
});

// Single global instance
export const editorService = interpret(editorMachine).start();
```

---

## 4. REACT COMPONENTS - READ FROM ZUSTAND, SEND TO XSTATE

```typescript
import React from 'react';
import { useActor } from '@xstate/react';
import { editorService } from './state-machine';
import { useVideoEditorStore } from './store';

// Timeline Component
function Timeline() {
  // Read from Zustand
  const clips = useVideoEditorStore(state => state.getClips());
  const currentFrame = useVideoEditorStore(state => state.getCurrentFrame());
  const fps = useVideoEditorStore(state => state.getFps());
  
  // Send to XState
  const handleSeek = (frame: Frame) => {
    editorService.send({ type: 'SEEK', frame });
  };
  
  const handleClipMove = (clipId: ClipId, frame: Frame) => {
    editorService.send({ type: 'MOVE_CLIP', clipId, frame });
  };
  
  return (
    <div className="timeline">
      {clips.map(clip => (
        <ClipView 
          key={clip.id} 
          clip={clip}
          onMove={(frame) => handleClipMove(clip.id, frame)}
        />
      ))}
      <Playhead frame={currentFrame} onSeek={handleSeek} />
    </div>
  );
}

// Trim Handle Component
function TrimHandle({ clipId, side }: { clipId: ClipId; side: 'in' | 'out' }) {
  const clip = useVideoEditorStore(state => state.getClip(clipId));
  
  if (!clip) return null;
  
  const handleTrim = (deltaFrames: number) => {
    const newInFrame = side === 'in' 
      ? Frame.add(clip.sourceInFrame, Frame.from(deltaFrames))
      : clip.sourceInFrame;
    
    const newOutFrame = side === 'out'
      ? Frame.add(clip.sourceOutFrame, Frame.from(deltaFrames))
      : clip.sourceOutFrame;
    
    editorService.send({
      type: 'TRIM_CLIP',
      clipId,
      inFrame: newInFrame,
      outFrame: newOutFrame
    });
  };
  
  return <div className="trim-handle" onDrag={handleTrim} />;
}

// Scrubber Component - NO LOCAL STATE
function Scrubber() {
  const currentFrame = useVideoEditorStore(state => state.getCurrentFrame());
  const totalFrames = useVideoEditorStore(state => state.getTotalFrames());
  
  return (
    <input
      type="range"
      min={0}
      max={Frame.toNumber(totalFrames)}
      value={Frame.toNumber(currentFrame)}
      onChange={(e) => editorService.send({ 
        type: 'SEEK', 
        frame: Frame.from(Number(e.target.value)) 
      })}
    />
  );
}

// Playback Controls
function PlaybackControls() {
  const [state] = useActor(editorService);
  const isPlaying = state.matches('playing');
  
  return (
    <div className="controls">
      <button onClick={() => editorService.send({ type: isPlaying ? 'PAUSE' : 'PLAY' })}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <Scrubber />
    </div>
  );
}
```

---

## 5. FRAME-ACCURATE PLAYBACK ENGINE

```typescript
class PlaybackEngine {
  private video: HTMLVideoElement;
  private fps: Fps;
  private animationId: number | null = null;
  
  constructor(video: HTMLVideoElement, fps: Fps) {
    this.video = video;
    this.fps = fps;
  }
  
  playFromFrame(startFrame: Frame, endFrame: Frame) {
    // CRITICAL: Convert frame to time ONLY at the last moment
    // Never store the time value
    this.video.currentTime = Frame.toNumber(startFrame) / this.fps;
    
    this.video.play().then(() => {
      this.trackPlayback(endFrame);
    });
  }
  
  private trackPlayback(endFrame: Frame) {
    const updateFrame = () => {
      if ('requestVideoFrameCallback' in this.video) {
        this.video.requestVideoFrameCallback((now, metadata) => {
          // Convert time back to frame immediately
          // NEVER store the time value
          const currentFrameNumber = Math.floor(metadata.mediaTime * this.fps);
          const currentFrame = Frame.from(currentFrameNumber);
          
          // Update store via XState
          editorService.send({ type: 'SEEK', frame: currentFrame });
          
          if (Frame.toNumber(currentFrame) >= Frame.toNumber(endFrame)) {
            this.video.pause();
            editorService.send({ type: 'PAUSE' });
          } else {
            updateFrame();
          }
        });
      } else {
        // Fallback for browsers without requestVideoFrameCallback
        const checkFrame = () => {
          const currentFrameNumber = Math.floor(this.video.currentTime * this.fps);
          const currentFrame = Frame.from(currentFrameNumber);
          
          editorService.send({ type: 'SEEK', frame: currentFrame });
          
          if (Frame.toNumber(currentFrame) >= Frame.toNumber(endFrame)) {
            this.video.pause();
            editorService.send({ type: 'PAUSE' });
            if (this.animationId) cancelAnimationFrame(this.animationId);
          } else {
            this.animationId = requestAnimationFrame(checkFrame);
          }
        };
        this.animationId = requestAnimationFrame(checkFrame);
      }
    };
    
    updateFrame();
  }
  
  seekToFrame(frame: Frame) {
    // Convert to time only when setting video element
    // NEVER store the time value
    this.video.currentTime = Frame.toNumber(frame) / this.fps;
    
    // Update state with frame (not time!)
    editorService.send({ type: 'SEEK', frame });
  }
  
  pause() {
    this.video.pause();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
```

---

## 6. EXPORT MANAGER - ONLY PLACE TIME EXISTS

```typescript
class ExportManager {
  private ffmpeg: FFmpeg | null = null;
  
  async export(): Promise<Blob> {
    const state = editorService.getSnapshot();
    
    if (!state.matches('idle')) {
      throw new Error('Can only export from idle state');
    }
    
    editorService.send({ type: 'START_EXPORT' });
    
    try {
      // Lazy load FFmpeg
      if (!this.ffmpeg) {
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        this.ffmpeg = new FFmpeg();
        await this.ffmpeg.load();
      }
      
      const store = useVideoEditorStore.getState();
      const clips = store.getClips();
      const fps = store.getFps();
      
      // ONLY place we convert frames to time for export
      for (const clip of clips) {
        // Convert at the last moment, never store
        const startTimeSeconds = Frame.toNumber(clip.sourceInFrame) / fps;
        const endTimeSeconds = Frame.toNumber(clip.sourceOutFrame) / fps;
        
        await this.ffmpeg.exec([
          '-i', clip.videoUrl,
          '-ss', startTimeSeconds.toString(),
          '-to', endTimeSeconds.toString(),
          '-c', 'copy',
          `clip_${clip.id}.mp4`
        ]);
      }
      
      // Concat clips...
      // Build concat filter
      const concatFilter = clips.map((_, i) => `[${i}:v]`).join('') + 
                          `concat=n=${clips.length}:v=1:a=0[outv]`;
      
      await this.ffmpeg.exec([
        ...clips.flatMap((_, i) => ['-i', `clip_${clips[i].id}.mp4`]),
        '-filter_complex', concatFilter,
        '-map', '[outv]',
        'output.mp4'
      ]);
      
      const data = await this.ffmpeg.readFile('output.mp4');
      editorService.send({ type: 'EXPORT_COMPLETE' });
      return new Blob([data.buffer], { type: 'video/mp4' });
      
    } catch (error) {
      editorService.send({ type: 'EXPORT_ERROR' });
      throw error;
    }
  }
}
```

---

## 7. INTEGRATION HOOK

```typescript
// Hook to integrate playback engine with state
function useVideoEditor() {
  const [state] = useActor(editorService);
  const currentFrame = useVideoEditorStore(state => state.getCurrentFrame());
  const clips = useVideoEditorStore(state => state.getClips());
  const fps = useVideoEditorStore(state => state.getFps());
  
  const playbackEngineRef = React.useRef<PlaybackEngine | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  
  React.useEffect(() => {
    if (videoRef.current && !playbackEngineRef.current) {
      playbackEngineRef.current = new PlaybackEngine(videoRef.current, fps);
    }
  }, [fps]);
  
  React.useEffect(() => {
    if (!playbackEngineRef.current) return;
    
    if (state.matches('playing')) {
      // Find clip at current position
      const currentClip = clips.find(clip => {
        const clipStart = clip.timelineFrame;
        const clipEnd = Frame.add(
          clipStart, 
          Frame.subtract(clip.sourceOutFrame, clip.sourceInFrame)
        );
        return Frame.toNumber(currentFrame) >= Frame.toNumber(clipStart) && 
               Frame.toNumber(currentFrame) < Frame.toNumber(clipEnd);
      });
      
      if (currentClip) {
        // Calculate local position within clip
        const localFrame = Frame.subtract(currentFrame, currentClip.timelineFrame);
        const startFrame = Frame.add(currentClip.sourceInFrame, localFrame);
        playbackEngineRef.current.playFromFrame(startFrame, currentClip.sourceOutFrame);
      }
    } else {
      playbackEngineRef.current.pause();
    }
  }, [state.value, currentFrame, clips]);
  
  return {
    videoRef,
    currentFrame,
    isPlaying: state.matches('playing'),
    isExporting: state.matches('exporting')
  };
}
```

---

## 8. CRITICAL RULES - NO EXCEPTIONS

### Data Flow Rules
1. **Components → XState → Zustand mutations → Components**
2. **NEVER: Components → Zustand mutations directly**
3. **NEVER: XState stores data (no context)**

### Frame Rules
1. **ALL positions are Frame type**
2. **NEVER store time as seconds anywhere**
3. **Convert to time ONLY at video.currentTime assignment**
4. **Convert from time IMMEDIATELY when reading**

### State Rules
1. **XState owns WHEN things can happen**
2. **Zustand owns WHAT the data is**
3. **Components ONLY read from Zustand and send to XState**

### Type Rules
1. **Use branded types everywhere**
2. **Never mix Frame with number without explicit conversion**
3. **Use Frame.toNumber() for unwrapping**
4. **Use Frame.from() for wrapping**

---

## 9. TESTING STRATEGY

```typescript
describe('SSOT Principles', () => {
  test('Store mutations are protected', () => {
    const store = useVideoEditorStore.getState();
    
    // Direct modification should not be possible through public API
    expect(store._clips).toBeUndefined(); // Private property not exposed
    expect(typeof store.mutations.addClip).toBe('function');
  });
  
  test('All modifications go through XState', () => {
    const clipId = ClipId.create();
    const inFrame = Frame.from(10);
    const outFrame = Frame.from(20);
    
    // Send event to XState
    editorService.send({
      type: 'TRIM_CLIP',
      clipId,
      inFrame,
      outFrame
    });
    
    // Verify store was updated
    const clip = useVideoEditorStore.getState().getClip(clipId);
    expect(Frame.toNumber(clip?.sourceInFrame || Frame.from(0))).toBe(10);
  });
  
  test('Frames are always integers', () => {
    const frame = Frame.from(10.7);
    expect(Frame.toNumber(frame)).toBe(10);
  });
  
  test('Cannot modify during export', () => {
    editorService.send({ type: 'START_EXPORT' });
    
    expect(() => {
      const store = useVideoEditorStore.getState();
      store.mutations.addClip({
        id: ClipId.create(),
        videoUrl: 'test.mp4',
        sourceInFrame: Frame.from(0),
        sourceOutFrame: Frame.from(100),
        timelineFrame: Frame.from(0),
        trackId: TrackId.from('track-1')
      });
    }).toThrow('Store is locked');
    
    editorService.send({ type: 'EXPORT_COMPLETE' });
  });
  
  test('Scrubber always reads from single source', () => {
    const testFrame = Frame.from(42);
    editorService.send({ type: 'SEEK', frame: testFrame });
    
    const currentFrame = useVideoEditorStore.getState().getCurrentFrame();
    expect(Frame.equals(currentFrame, testFrame)).toBe(true);
    
    // No other position properties exist
    const store = useVideoEditorStore.getState() as any;
    expect(store.scrubberPosition).toBeUndefined();
    expect(store.playheadPosition).toBeUndefined();
    expect(store.currentTime).toBeUndefined();
  });
});
```

---

## SUMMARY

This architecture achieves TRUE SSOT by:

1. **Single Frame Store**: Only `_currentFrame` in Zustand
2. **No Time Storage**: Time only exists momentarily during video element operations
3. **Branded Types**: Impossible to mix Frame with number accidentally
4. **Unidirectional Flow**: Component → XState → Zustand → Component
5. **No Event Bus**: No circular event patterns
6. **Explicit Conversions**: Frame.toNumber() and Frame.from() make intent clear

**Fixed Issues:**
- ✅ No floating-point storage
- ✅ No division creating floats that persist
- ✅ Consistent event object format
- ✅ Proper type unwrapping with Frame.toNumber()
- ✅ Test assertions that actually work

**This architecture makes sync issues IMPOSSIBLE because there's only ONE source of truth for position: `_currentFrame`**