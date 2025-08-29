# Video Player AI Agents - Features & User Flows

## Core Vision
"A platform all about timestamps of videos and dissecting it further" - Every moment in a video is a learning opportunity with intelligent AI assistance.

## 4 Agent Types
1. **Hint Agent** (Purple/Yellow theme)
2. **Quiz Agent** (Green theme)  
3. **Reflect Agent** (Blue theme)
4. **Path Agent** (Purple theme)

## User Flows

### Flow 1: Manual Video Pause
- User watches video
- User pauses video by clicking on it
- PuzzleHint agent automatically appears (UNACTIVATED)
- Shows "Paused at X:XX" message
- Shows "Do you want a hint?" prompt
- User can accept (ACTIVATES) or reject
- If activated, hint stays in chat forever
- If not activated and video resumes, hint disappears

### Flow 2: Agent Button Click (While Playing)
- Video is playing
- User clicks an agent button (Hint/Quiz/Reflect/Path)
- Video should pause automatically
- Selected agent appears immediately
- Shows appropriate prompt for that agent
- User can accept or reject

### Flow 3: Agent Button Click (While Paused)
- Video is already paused
- User clicks an agent button
- If previous agent is UNACTIVATED, it disappears
- If previous agent is ACTIVATED, it stays in chat
- New agent appears immediately (UNACTIVATED)
- Shows appropriate prompt for that agent
- Can have multiple ACTIVATED agents in chat history

### Flow 4: Agent Switching (Unactivated)
- User has one agent card showing (e.g., Quiz) 
- User hasn't clicked Yes/No yet
- User clicks different agent button (e.g., Reflect)
- First agent disappears (since it wasn't activated)
- New agent appears
- No duplicate messages

### Flow 4b: Agent Switching (Activated)
- User has activated an agent (clicked "Yes" on Quiz)
- Quiz conversation is in progress
- User clicks different agent button (e.g., Reflect)
- Quiz conversation STAYS in chat (it was activated)
- Reflect agent appears below the Quiz conversation
- Both can be active simultaneously

### Flow 5: Video Resume (Unactivated Agent)
- User has unactivated agent card showing (e.g., "Do you want a quiz?")
- User hasn't clicked Yes or No yet
- User resumes video playback (by clicking play or clicking on video)
- The unactivated agent card disappears from chat
- The system message "Paused at X:XX" also disappears
- Both messages are completely removed from chat history
- Chat returns to previous state (only showing activated/rejected agents if any)
- Next time user pauses, it's a fresh start - new agents can appear
- Example: User pauses at 2:30, sees Quiz prompt, resumes without answering → Quiz disappears completely

### Flow 5b: Video Resume (Activated Agent)
- User has activated agent (clicked Yes)
- Conversation is in progress
- User resumes video playback
- Activated conversation STAYS in chat
- User can continue chatting while video plays

### Flow 6: Agent Acceptance
- User clicks "Yes" on any agent prompt
- Agent prompt stays in chat history
- AI generates appropriate response
- Response stays in chat permanently
- User can continue conversation

### Flow 7: Agent Rejection  
- User clicks "No thanks" on agent prompt
- Agent prompt CHANGES STATE to "rejected" (semi-activated)
- Prompt stays in chat history but buttons are disabled/hidden
- No AI response generated
- Can trigger new agents
- Rejected agents stay in chat (don't disappear on resume)

## Current Issues to Solve

1. **Video doesn't pause when agent buttons clicked while playing**
   - Zustand state updates but video element doesn't pause
   - Need proper video control synchronization

2. **Agents don't appear immediately**
   - Sometimes require multiple clicks
   - Timing issues with state updates

3. **Agent switching problems**
   - Hint agent doesn't always appear after other agents
   - State cleanup issues

4. **Agent persistence not implemented**
   - Currently all agents disappear on video resume
   - Need to track agent states (unactivated/activated/rejected)
   - Need to preserve activated/rejected agents in chat

## Expected Behaviors

### Video Controls
- Play/pause button should always reflect actual video state
- Agent buttons should control video playback
- Manual pause and agent-triggered pause should work identically

### Agent States
1. **UNACTIVATED** - Showing prompt with Yes/No buttons
2. **ACTIVATED** - User clicked "Yes", conversation started
3. **REJECTED** - User clicked "No", buttons disabled

### Agent Display Rules
- Only ONE unactivated agent card at a time
- Multiple activated/rejected agents can coexist in chat
- Unactivated agents disappear on video resume
- Activated agents persist forever
- Rejected agents persist forever (with disabled buttons)
- Immediate response when buttons clicked
- Clean transitions between agents

### Chat Persistence
- System messages for pause events stay if agent activated/rejected
- System messages disappear if agent unactivated and video resumes
- Agent prompts with accept/reject buttons
- AI responses after acceptance
- Full conversation history maintained
- Activated agents never disappear
- Rejected agents never disappear
- Only unactivated agents can be replaced or removed

## Technical Requirements

1. Video element control must be synchronized with UI state
2. Agent activation must be immediate and reliable
3. State management must handle all edge cases
4. No infinite loops or performance issues
5. Clean component unmounting and cleanup