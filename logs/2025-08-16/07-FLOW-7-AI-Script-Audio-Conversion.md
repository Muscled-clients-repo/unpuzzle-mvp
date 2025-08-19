# Flow 7: AI Script to Audio Conversion
## Dummy Implementation for Phase 1

> **Implementation Status**: READY FOR DEVELOPMENT
> **Prerequisites**: Flows 1-6 must be completed and user-approved
> **User Testing Required**: MANDATORY after implementation
> **Phase 1 Scope**: Dummy audio implementation (real AI voice in future phases)

---

## 🎯 Flow Overview

This flow implements script-to-audio conversion functionality. In Phase 1, this returns a dummy audio file to simulate the AI voice synthesis workflow. Future phases will implement actual AI voice generation.

### Core Requirements
- **Script Text Management**: Multi-section script editing and organization
- **Dummy Audio Generation**: Returns pre-recorded test audio immediately
- **Timeline Integration**: Auto-adds audio to timeline audio track
- **Waveform Visualization**: Shows audio waveform in timeline
- **Sync Capability**: Audio synchronized with video playback

---

## 📋 Initial State

**System State Before User Interaction:**
- Script panel visible on left
- Timeline with audio track visible
- Text input area ready for script
- No audio segments on timeline
- Convert button inactive until script entered

**State Machine Context:**
```typescript
interface ScriptAudioState {
  scriptState: {
    sections: ScriptSection[]
    selectedSectionId: string | null
    totalCharacterCount: number
    isDraft: boolean
    lastSaved: Date | null
  }
  audioState: {
    segments: AudioSegment[]
    currentAudioUrl: string | null
    waveformData: Float32Array | null
    isGenerating: boolean
  }
  timelineState: {
    audioTrackVisible: boolean
    audioTrackHeight: number
    currentTime: number
  }
}

interface ScriptSection {
  id: string
  title: string
  content: string
  timestamp: number
  isExpanded: boolean
  characterCount: number
  estimatedDuration: number
}

interface AudioSegment {
  id: string
  startTime: number
  duration: number
  audioUrl: string
  name: string
  trackIndex: number
  waveformData?: Float32Array
  scriptSectionId?: string
}
```

---

## 🔄 User Interaction Flow

### 1. Script Writing
**System Behavior:**
- User types/pastes script in script panel
- Real-time character count displayed
- Section markers for organization
- Save draft capability

**Implementation Requirements:**
```typescript
class ScriptManager {
  private readonly CHARACTERS_PER_SECOND = 15 // Average speaking rate
  
  handleScriptInput(sectionId: string, content: string) {
    // Update script content
    const section = this.findSection(sectionId)
    section.content = content
    section.characterCount = content.length
    section.estimatedDuration = this.calculateEstimatedDuration(content)
    
    // Update state
    this.dispatch({
      type: 'UPDATE_SCRIPT_SECTION',
      id: sectionId,
      updates: {
        content,
        characterCount: content.length,
        estimatedDuration: section.estimatedDuration
      }
    })
    
    // Update total character count
    this.updateTotalCharacterCount()
    
    // Enable/disable convert button
    this.updateConvertButtonState()
  }
  
  private calculateEstimatedDuration(text: string): number {
    // Remove extra whitespace and calculate duration
    const cleanText = text.trim().replace(/\s+/g, ' ')
    const wordCount = cleanText.split(' ').length
    const wordsPerMinute = 150 // Average speaking rate
    return (wordCount / wordsPerMinute) * 60
  }
  
  renderScriptSection(section: ScriptSection) {
    return (
      <div className="script-section">
        <div className="section-header">
          <input 
            value={section.title}
            onChange={(e) => this.updateSectionTitle(section.id, e.target.value)}
            className="section-title"
          />
          <div className="section-stats">
            <span>{section.characterCount} chars</span>
            <span>~{Math.ceil(section.estimatedDuration)}s</span>
          </div>
        </div>
        <textarea
          value={section.content}
          onChange={(e) => this.handleScriptInput(section.id, e.target.value)}
          placeholder="Enter script content..."
          className="script-textarea"
        />
      </div>
    )
  }
}
```

### 2. Conversion Trigger
**System Behavior:**
- "Convert to Audio" button appears when script has content
- User clicks to initiate conversion
- Processing indicator shows progress
- (Phase 1: Returns dummy audio file immediately)

**Nuclear-Grade Implementation:**
```typescript
class DummyAudioGenerator {
  private readonly DUMMY_AUDIO_POOL = [
    '/test-assets/dummy-narration-1.mp3',
    '/test-assets/dummy-narration-2.mp3',
    '/test-assets/dummy-narration-3.mp3'
  ]
  
  async handleConvertToAudio(scriptText: string): Promise<AudioSegment> {
    // Phase 1: Show processing state
    this.dispatch({ type: 'START_AUDIO_GENERATION' })
    
    try {
      // Simulate processing delay (1-2 seconds)
      await this.simulateProcessing()
      
      // Generate dummy audio segment
      const audioSegment = await this.generateDummyAudio(scriptText)
      
      // Add to assets panel
      await this.addToAssets(audioSegment)
      
      // Add to timeline
      await this.addToTimeline(audioSegment)
      
      // Update state
      this.dispatch({ 
        type: 'AUDIO_GENERATION_COMPLETE', 
        segment: audioSegment 
      })
      
      return audioSegment
      
    } catch (error) {
      this.dispatch({ 
        type: 'AUDIO_GENERATION_ERROR', 
        error: error.message 
      })
      throw error
    }
  }
  
  private async simulateProcessing(): Promise<void> {
    // Show realistic processing time
    const processingTime = 1000 + Math.random() * 1000 // 1-2 seconds
    return new Promise(resolve => setTimeout(resolve, processingTime))
  }
  
  private async generateDummyAudio(scriptText: string): Promise<AudioSegment> {
    // Select dummy audio based on script length
    const audioUrl = this.selectDummyAudio(scriptText.length)
    
    // Get audio duration from file
    const duration = await this.getAudioDuration(audioUrl)
    
    // Create audio segment
    return {
      id: `audio-${Date.now()}`,
      audioUrl,
      duration,
      startTime: this.getNextAvailableTime(),
      name: 'AI Narration (Test)',
      trackIndex: 1, // Audio track
      scriptSectionId: this.state.scriptState.selectedSectionId
    }
  }
  
  private selectDummyAudio(scriptLength: number): string {
    // Select appropriate dummy audio based on script length
    if (scriptLength < 100) {
      return this.DUMMY_AUDIO_POOL[0] // Short narration
    } else if (scriptLength < 500) {
      return this.DUMMY_AUDIO_POOL[1] // Medium narration
    } else {
      return this.DUMMY_AUDIO_POOL[2] // Long narration
    }
  }
}
```

### 3. Audio Track Addition
**System Behavior:**
- Converted audio appears in assets
- Auto-adds to audio track on timeline
- Waveform visualization displayed
- Synchronized with video playback

**Timeline Integration:**
```typescript
class AudioTimelineManager {
  async addAudioToTimeline(audioSegment: AudioSegment) {
    // Phase 1: Add segment to timeline
    this.dispatch({
      type: 'ADD_AUDIO_SEGMENT',
      segment: audioSegment
    })
    
    // Phase 2: Generate waveform data
    const waveformData = await this.generateWaveform(audioSegment.audioUrl)
    audioSegment.waveformData = waveformData
    
    // Phase 3: Update timeline view
    this.scrollToAudioSegment(audioSegment)
    
    // Phase 4: Enable audio track if hidden
    if (!this.state.timelineState.audioTrackVisible) {
      this.dispatch({ type: 'SHOW_AUDIO_TRACK' })
    }
  }
  
  private async generateWaveform(audioUrl: string): Promise<Float32Array> {
    // Load audio for waveform generation
    const audioContext = new AudioContext()
    const response = await fetch(audioUrl)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    // Generate waveform data (simplified)
    const samples = audioBuffer.getChannelData(0)
    const waveformSize = 200 // Points for visualization
    const blockSize = Math.floor(samples.length / waveformSize)
    const waveform = new Float32Array(waveformSize)
    
    for (let i = 0; i < waveformSize; i++) {
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(samples[i * blockSize + j] || 0)
      }
      waveform[i] = sum / blockSize
    }
    
    return waveform
  }
  
  renderAudioWaveform(segment: AudioSegment) {
    if (!segment.waveformData) return null
    
    return (
      <svg className="audio-waveform" viewBox="0 0 200 40">
        {Array.from(segment.waveformData).map((amplitude, i) => (
          <rect
            key={i}
            x={i}
            y={20 - amplitude * 20}
            width="1"
            height={amplitude * 40}
            fill="#4a90e2"
          />
        ))}
      </svg>
    )
  }
}
```

### 4. Future Enhancement (Not in Phase 1)
**Planned Features:**
- Actual AI voice synthesis
- Voice selection options
- Speed/pitch adjustments
- Multiple language support

**Future Implementation Preview:**
```typescript
// Future: Real AI voice synthesis
interface AIVoiceOptions {
  voice: 'male' | 'female' | 'neutral'
  speed: number // 0.5 - 2.0
  pitch: number // -10 to +10
  language: string // 'en-US', 'es-ES', etc.
  style: 'conversational' | 'professional' | 'excited'
}

async function generateRealAIAudio(
  scriptText: string, 
  options: AIVoiceOptions
): Promise<AudioSegment> {
  // Future implementation with actual AI service
  const audioBlob = await AIVoiceService.synthesize(scriptText, options)
  const audioUrl = URL.createObjectURL(audioBlob)
  
  return {
    id: `ai-audio-${Date.now()}`,
    audioUrl,
    duration: await this.getAudioDuration(audioUrl),
    startTime: this.getNextAvailableTime(),
    name: `AI Voice (${options.voice})`,
    trackIndex: 1
  }
}
```

---

## 💾 Expected System Behavior

### Script Storage
- Script text stored in state machine
- Auto-save draft functionality
- Section-based organization
- Character count tracking

### Audio Generation
- Dummy audio file returned immediately (Phase 1)
- Audio segment created with proper duration
- Timeline audio track populated automatically
- Waveform visualization generated

**State Updates:**
```typescript
handleScriptToAudioComplete(audioSegment: AudioSegment) {
  // Update script state
  this.state.scriptState.lastProcessed = new Date()
  
  // Update audio state
  this.state.audioState.segments.push(audioSegment)
  this.state.audioState.currentAudioUrl = audioSegment.audioUrl
  
  // Update timeline state
  this.state.timelineState.audioTrackVisible = true
  
  // Trigger UI updates
  this.notifyStateChange()
}
```

---

## 🎬 Technical Implementation

### Phase 1: Dummy Implementation
```typescript
// Immediate dummy response
class DummyAIService {
  async convertScript(scriptText: string): Promise<AudioResult> {
    // Validate input
    if (!scriptText.trim()) {
      throw new Error('Script text is required')
    }
    
    // Return dummy audio immediately
    return {
      audioUrl: '/test-assets/dummy-narration.mp3',
      duration: 10, // seconds
      waveformData: this.generateDummyWaveform(),
      metadata: {
        scriptLength: scriptText.length,
        estimatedWords: scriptText.split(' ').length,
        processingTime: 0.1 // Instant for dummy
      }
    }
  }
  
  private generateDummyWaveform(): Float32Array {
    // Generate fake waveform data
    const size = 200
    const waveform = new Float32Array(size)
    
    for (let i = 0; i < size; i++) {
      // Create realistic-looking waveform pattern
      waveform[i] = (Math.sin(i * 0.1) + Math.random() * 0.3) * 0.5
    }
    
    return waveform
  }
}
```

### File Structure
```
public/
└── test-assets/
    ├── dummy-narration-1.mp3  // Short (5-10s)
    ├── dummy-narration-2.mp3  // Medium (15-30s)
    ├── dummy-narration-3.mp3  // Long (45-60s)
    └── audio-metadata.json
```

---

## ⚠️ Edge Cases

### Empty Script
```typescript
handleEmptyScript() {
  this.showUserFeedback({
    type: 'warning',
    message: 'Please enter script content before converting to audio.',
    duration: 3000
  })
  
  // Disable convert button
  this.dispatch({ type: 'DISABLE_CONVERT_BUTTON' })
}
```

### Very Long Script
```typescript
handleLongScript(scriptText: string) {
  const MAX_CHARACTERS = 5000 // Phase 1 limit
  
  if (scriptText.length > MAX_CHARACTERS) {
    this.showUserFeedback({
      type: 'warning',
      message: `Script too long. Maximum ${MAX_CHARACTERS} characters allowed in Phase 1.`,
      action: {
        label: 'Trim Script',
        handler: () => this.trimScript(MAX_CHARACTERS)
      }
    })
  }
}
```

### Audio Timeline Collision
```typescript
handleAudioCollision(newSegment: AudioSegment) {
  const collision = this.findAudioCollision(newSegment)
  
  if (collision) {
    // Offer resolution options
    this.showCollisionDialog({
      options: [
        'Replace existing audio',
        'Add to next available position',
        'Cancel conversion'
      ],
      onResolve: (choice) => this.resolveAudioCollision(choice, newSegment)
    })
  }
}
```

---

## 🧪 User Testing Checklist

### Script Writing
- [ ] Text input works in script panel
- [ ] Character count updates in real-time
- [ ] Section organization functions properly
- [ ] Draft auto-save works

### Audio Conversion
- [ ] Convert button appears when script has content
- [ ] Processing indicator shows during conversion
- [ ] Dummy audio file loads successfully
- [ ] Conversion completes within 2 seconds

### Timeline Integration
- [ ] Audio appears in timeline audio track
- [ ] Waveform visualization displays correctly
- [ ] Audio syncs with video playback
- [ ] Audio controls work properly

### State Management
- [ ] Script state persists across sessions
- [ ] Audio segments tracked correctly
- [ ] Timeline updates properly
- [ ] Undo/redo works with audio operations

### Edge Cases
- [ ] Empty script handling works
- [ ] Long script warnings appear
- [ ] Audio collision detection works
- [ ] Error states display clearly

---

## 🚀 Implementation Strategy

### Phase 7.1: Script Panel UI (30 min)
1. Create script section components
2. Add character counting
3. Implement section management
4. Add convert button

### Phase 7.2: Dummy Audio System (30 min)
1. Create dummy audio files
2. Implement selection logic
3. Add processing simulation
4. Create audio segment generation

### Phase 7.3: Timeline Integration (45 min)
1. Add audio track support
2. Implement waveform generation
3. Add audio segment rendering
4. Integrate with playback system

### Phase 7.4: Polish & Testing (15 min)
1. Add visual feedback
2. Handle edge cases
3. Test all workflows
4. Performance optimization

---

## 🔗 Integration Points

### State Machine Integration
```typescript
// New actions for Flow 7
type ScriptAudioActions = 
  | { type: 'UPDATE_SCRIPT_CONTENT'; sectionId: string; content: string }
  | { type: 'START_AUDIO_GENERATION' }
  | { type: 'AUDIO_GENERATION_COMPLETE'; segment: AudioSegment }
  | { type: 'AUDIO_GENERATION_ERROR'; error: string }
  | { type: 'ADD_AUDIO_SEGMENT'; segment: AudioSegment }
  | { type: 'SHOW_AUDIO_TRACK' }
```

---

## ✅ Success Criteria

Flow 7 is considered complete when:

1. **Script Management**: Users can write and organize scripts
2. **Dummy Conversion**: Script converts to dummy audio immediately
3. **Timeline Integration**: Audio appears in timeline with waveform
4. **Playback Sync**: Audio plays synchronized with video
5. **State Persistence**: Script and audio state properly managed
6. **User Approval**: Manual testing checklist completed and approved by user

**🚨 MANDATORY**: This flow requires explicit user testing and approval before proceeding to Flow 8

---

**Next Flow**: Flow 8 - Advanced Editing (Trim, Delete, Magnetic Timeline)
**Dependencies**: This flow integrates with the timeline system and builds audio capabilities