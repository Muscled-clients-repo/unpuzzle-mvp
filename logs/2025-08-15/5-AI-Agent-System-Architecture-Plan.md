# AI Agent System Architecture - Zustand Store Implementation Plan

## Executive Summary
Implement a centralized AI Agent System using Zustand store to manage all AI interactions across the platform. This enables any component or event to trigger AI agents that appear in the chat sidebar, with full timestamp awareness.

## Vision
"A platform all about timestamps of videos and dissecting it further" - Every moment in a video can trigger intelligent, contextual AI assistance.

---

## Phase 1: Foundation (Week 1)
### Goal: Create core AI agent infrastructure

### 1.1 Create AI Agents Store Slice
**File:** `/src/stores/slices/ai-agents-slice.ts`

**Core State:**
- `activeAgent`: Current agent type (hint | quiz | reflect | path | null)
- `agentTrigger`: How it was triggered (pause | manual | auto | instructor)
- `agentContext`: {
    - `timestamp`: number
    - `formattedTime`: string  
    - `videoId`: string
    - `lessonId`: string
    - `segmentId?`: string
  }
- `agentHistory`: Array of past interactions with timestamps
- `pendingAgentCard`: The agent card to display
- `agentResponses`: Map of responses by timestamp

**Core Actions:**
- `triggerAgent(type, context, trigger)`
- `dismissAgent()`
- `acceptAgentAction(agentId, action)`
- `rejectAgentAction(agentId)`
- `clearAgentHistory()`

### 1.2 Remove Props-Based Flow
- Remove `showPuzzleHint`, `pausedTimestamp` props from StudentVideoPlayerV2
- Remove prop drilling through components
- Clean up the parent-child communication

### 1.3 Connect Video Pause to Store
- Video pause dispatches: `triggerAgent('hint', context, 'pause')`
- Video resume checks: if trigger was 'pause' and no action taken, dismiss

---

## Phase 2: Chat Integration (Week 1-2)
### Goal: Make chat sidebar the single source of AI interactions

### 2.1 Refactor AIChatSidebarV2
- Subscribe to ai-agents store instead of props
- Listen for `pendingAgentCard` changes
- Render agent cards based on store state

### 2.2 Implement Agent Card Factory
**Pattern:** Factory pattern for agent cards
```
AgentCardFactory:
  - PuzzleHintCard
  - QuizCard  
  - ReflectionCard
  - PathCard
  - GenericAgentCard (fallback)
```

### 2.3 Agent Response System
- When user accepts agent action → store AI response
- Track responses by timestamp for replay
- Enable "show me what happened at 3:45" features

---

## Phase 3: Multi-Agent Support (Week 2)
### Goal: Implement all 4 core agents

### 3.1 PuzzleHint Agent (Already exists)
- Triggered by: Pause, Hint button
- Shows: Timestamp-specific hints
- Action: "Give me a hint at X:XX"

### 3.2 Quiz Agent
- Triggered by: Quiz button, chapter ends
- Shows: Context-aware questions
- Action: Submit answer, get feedback
- Special: Can run while video plays

### 3.3 Reflect Agent  
- Triggered by: Reflect button, milestone completion
- Shows: Thought-provoking questions
- Action: Submit reflection, get insights
- Special: Saves reflections to profile

### 3.4 Path Agent
- Triggered by: Path button, confusion detection
- Shows: Personalized learning recommendations
- Action: Accept path, modify path
- Special: Adapts based on progress

---

## Phase 4: Advanced Triggers (Week 3)
### Goal: Implement intelligent automatic triggers

### 4.1 Pattern Detection Triggers
- Replay same segment 3+ times → Trigger hint
- Fast forward through content → Trigger checkpoint quiz
- Long pause (>30 seconds) → Trigger reflection
- Multiple wrong quiz answers → Trigger learning path

### 4.2 Timestamp Milestone Triggers
- Every 10 minutes → Mini quiz
- Chapter boundaries → Reflection prompt
- Course 25/50/75% complete → Progress celebration
- Pre-defined instructor timestamps → Custom agents

### 4.3 Behavioral Triggers
- Confusion score (based on pause/replay patterns)
- Engagement score (based on interaction frequency)
- Speed patterns (too fast/slow consumption)
- Note-taking patterns

---

## Phase 5: Instructor Controls (Week 4)
### Goal: Let instructors configure AI agents

### 5.1 Instructor Agent Configuration
- Set trigger points at specific timestamps
- Choose agent types for different moments
- Custom agent messages/prompts
- Disable/enable agents per lesson

### 5.2 Pre-configured Agents
- "Confusion hotspots" from analytics
- Common question timestamps
- Important concept reinforcement points
- Practice problem triggers

### 5.3 Live Instructor Triggers
- Instructor can trigger agent for all students
- "Everyone pause and reflect on this"
- Pop quiz deployment
- Synchronized learning moments

---

## Phase 6: Analytics & Optimization (Week 5)
### Goal: Track and improve agent effectiveness

### 6.1 Agent Analytics
- Track: Which agents get accepted/rejected
- Measure: Time to respond to agents
- Analyze: Correlation with learning outcomes
- Identify: Most helpful agent types per topic

### 6.2 Timestamp Heatmaps
- Visualize where agents trigger most
- Show confusion hotspots
- Identify high-engagement moments
- Optimize agent placement

### 6.3 Personalization Engine
- Learn user's preferred agent types
- Adapt trigger sensitivity per user
- Customize agent personality/tone
- Predict optimal intervention moments

---

## Technical Implementation Details

### State Structure Example
```typescript
interface AIAgentState {
  // Current active agent
  activeAgent: {
    id: string
    type: 'hint' | 'quiz' | 'reflect' | 'path'
    triggerType: 'pause' | 'manual' | 'auto' | 'instructor'
    timestamp: number
    formattedTime: string
    context: {
      videoId: string
      lessonId: string
      segmentId?: string
      metadata?: any
    }
  } | null
  
  // History for this session
  agentHistory: Array<{
    agentId: string
    type: string
    timestamp: number
    action: 'accepted' | 'rejected' | 'timeout'
    response?: string
  }>
  
  // Configuration
  config: {
    autoTriggerEnabled: boolean
    triggerSensitivity: 'low' | 'medium' | 'high'
    preferredAgents: string[]
  }
}
```

### Migration Strategy
1. Implement store alongside existing props (Phase 1)
2. Gradually move features to store (Phase 2)
3. Remove old prop-based system (Phase 2 end)
4. Add new agents using store pattern (Phase 3+)

### Testing Strategy
- Unit tests for store actions
- Integration tests for trigger flows
- E2E tests for user interactions
- A/B testing for trigger sensitivity

---

## Success Metrics

### Technical Metrics
- Zero prop drilling for AI agents
- <100ms agent trigger latency
- No memory leaks from event listeners
- Clean component unmounting

### User Metrics
- Agent acceptance rate >60%
- Average response time <5 seconds
- Increased video completion rates
- Higher quiz scores with agents enabled

### Platform Metrics
- Reduced confusion moments
- Increased timestamp interactions
- Better learning outcomes
- Higher engagement scores

---

## Risk Mitigation

### Risk 1: Too Many Agent Interruptions
- Solution: Smart throttling, user preferences
- Fallback: Manual-only mode

### Risk 2: Store Performance Issues
- Solution: Selective subscriptions, memoization
- Fallback: Paginated agent history

### Risk 3: Complex State Management
- Solution: Clear action patterns, TypeScript
- Fallback: Redux DevTools for debugging

---

## Future Expansions

### Near Future (3-6 months)
- Voice-triggered agents
- Collaborative agents (study groups)
- Mobile app agent sync
- Browser extension agents

### Long Term (6-12 months)
- AI personality customization
- Cross-course agent memory
- Predictive agent deployment
- Real-time instructor analytics

### Vision (12+ months)
- AR/VR agent interactions
- Multi-modal agents (voice, visual)
- Peer-to-peer agent sharing
- Agent marketplace for instructors

---

## Conclusion

This architecture positions the platform to become THE timestamp-based learning platform. By centralizing AI agents in Zustand, we create a scalable, maintainable system that can grow from 4 agents to 40+ without architectural changes.

The key insight: **Timestamps are not just about video position - they're about learning moments that deserve intelligent assistance.**

Every pause is a learning opportunity. Every timestamp is a potential breakthrough. This architecture makes that vision real.