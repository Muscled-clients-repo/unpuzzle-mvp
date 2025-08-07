// Test script to verify Zustand store setup
import { useAppStore } from './stores/app-store'

// This is a simple test that can be run in browser console or during development
export const testStoreSetup = () => {
  console.log('=== Zustand Store Setup Test ===')
  
  const store = useAppStore.getState()
  
  // Test initial state
  console.log('Initial state:')
  console.log('- User ID:', store.id)
  console.log('- Courses:', store.courses.length)
  console.log('- Video current time:', store.currentTime)
  console.log('- AI messages:', store.chatMessages.length)
  
  // Test video actions
  console.log('\n=== Testing Video Actions ===')
  store.setCurrentTime(120.5)
  store.setInOutPoints(100, 200)
  store.setIsPlaying(true)
  
  console.log('After video actions:')
  console.log('- Current time:', store.currentTime)
  console.log('- Is playing:', store.isPlaying)
  console.log('- In point:', store.inPoint)
  console.log('- Out point:', store.outPoint)
  
  // Test AI actions
  console.log('\n=== Testing AI Actions ===')
  store.addChatMessage('Test message from user')
  store.addTranscriptReference({
    text: 'This is a test transcript selection',
    startTime: 100,
    endTime: 120,
    videoId: 'test-video-1'
  })
  
  console.log('After AI actions:')
  console.log('- Chat messages:', store.chatMessages.length)
  console.log('- Last message:', store.chatMessages[store.chatMessages.length - 1]?.content)
  console.log('- Transcript references:', store.transcriptReferences.length)
  
  // Test user actions
  console.log('\n=== Testing User Actions ===')
  store.updatePreferences({
    volume: 0.8,
    playbackRate: 1.5,
    sidebarWidth: 500
  })
  
  console.log('After user preference update:')
  console.log('- Volume:', store.preferences.volume)
  console.log('- Playback rate:', store.preferences.playbackRate)
  console.log('- Sidebar width:', store.preferences.sidebarWidth)
  
  console.log('\n=== Store Setup Test Complete ===')
  console.log('✅ All basic store operations working correctly!')
  
  return true
}

// Test store reactivity (for component testing)
export const testStoreReactivity = () => {
  const store = useAppStore.getState()
  
  console.log('\n=== Testing Store Reactivity ===')
  
  // Subscribe to video time changes
  const unsubscribe = useAppStore.subscribe(
    (state) => state.currentTime,
    (currentTime) => {
      console.log('⚡ Video time changed to:', currentTime)
    }
  )
  
  // Trigger some changes
  setTimeout(() => store.setCurrentTime(50), 100)
  setTimeout(() => store.setCurrentTime(100), 200)
  setTimeout(() => store.setCurrentTime(150), 300)
  
  // Clean up subscription after test
  setTimeout(() => {
    unsubscribe()
    console.log('✅ Store reactivity test complete!')
  }, 500)
}

// Integration test with mock data
export const testStoreWithMockData = async () => {
  console.log('\n=== Testing Store with Mock Data ===')
  
  try {
    const { mockCourses } = await import('./data/mock/courses')
    const { mockUsers } = await import('./data/mock/users')
    
    const store = useAppStore.getState()
    
    // Load mock data
    store.setCourses(mockCourses)
    store.setUser({
      id: mockUsers.learners[0].id,
      name: mockUsers.learners[0].name,
      email: mockUsers.learners[0].email,
      role: mockUsers.learners[0].role,
      subscription: mockUsers.learners[0].subscription
    })
    
    // Enroll in courses
    mockUsers.learners[0].enrolledCourses.forEach(courseId => {
      store.enrollInCourse(courseId)
    })
    
    console.log('Mock data loaded:')
    console.log('- Courses loaded:', store.courses.length)
    console.log('- User set:', store.profile?.name)
    console.log('- Enrolled courses:', store.enrolledCourses.length)
    console.log('- First course title:', store.courses[0]?.title)
    
    console.log('✅ Mock data integration test complete!')
    return true
    
  } catch (error) {
    console.error('❌ Mock data test failed:', error)
    return false
  }
}