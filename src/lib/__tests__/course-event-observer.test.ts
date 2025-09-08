import { courseEventObserver, COURSE_EVENTS } from '../course-event-observer'

describe('CourseEventObserver', () => {
  beforeEach(() => {
    courseEventObserver.clear()
  })

  test('subscribes and unsubscribes correctly', () => {
    const listener = jest.fn()
    const unsubscribe = courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, listener)
    
    expect(courseEventObserver.getListenerCount(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE)).toBe(1)
    
    unsubscribe()
    
    expect(courseEventObserver.getListenerCount(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE)).toBe(0)
  })

  test('emits events to correct listeners', () => {
    const chapterListener = jest.fn()
    const videoListener = jest.fn()
    
    courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, chapterListener)
    courseEventObserver.subscribe(COURSE_EVENTS.VIDEO_UPDATE_COMPLETE, videoListener)
    
    courseEventObserver.emit(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, 'course-123', { chapterId: 'ch-1' })
    
    expect(chapterListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE,
        courseId: 'course-123',
        data: { chapterId: 'ch-1' }
      })
    )
    expect(videoListener).not.toHaveBeenCalled()
  })

  test('handles listener errors gracefully', () => {
    const errorListener = jest.fn(() => { throw new Error('Test error') })
    const goodListener = jest.fn()
    
    courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, errorListener)
    courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, goodListener)
    
    // Should not throw
    courseEventObserver.emit(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, 'course-123', {})
    
    expect(goodListener).toHaveBeenCalled()
  })

  test('filters events by course ID correctly', () => {
    const listener1 = jest.fn()
    const listener2 = jest.fn()
    
    courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, listener1)
    courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, listener2)
    
    courseEventObserver.emit(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, 'course-123', { chapterId: 'ch-1' })
    
    expect(listener1).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: 'course-123'
      })
    )
    expect(listener2).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: 'course-123'
      })
    )
  })

  test('tracks metrics correctly', () => {
    const listener = jest.fn()
    courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, listener)
    
    courseEventObserver.emit(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, 'course-123', {})
    courseEventObserver.emit(COURSE_EVENTS.VIDEO_UPDATE_COMPLETE, 'course-123', {})
    
    const metrics = courseEventObserver.getMetrics()
    expect(metrics.eventsEmitted).toBe(2)
    expect(metrics.listenersNotified).toBe(1) // Only chapter event had a listener
  })

  test('reports health status correctly', () => {
    const listener = jest.fn()
    courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, listener)
    
    courseEventObserver.emit(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, 'course-123', {})
    
    expect(courseEventObserver.isHealthy()).toBe(true)
  })

  test('includes operation ID in events', () => {
    const listener = jest.fn()
    courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, listener)
    
    const operationId = 'test-operation-123'
    courseEventObserver.emit(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, 'course-123', { chapterId: 'ch-1' }, operationId)
    
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        operationId: 'test-operation-123'
      })
    )
  })

  test('handles multiple subscribers for same event', () => {
    const listener1 = jest.fn()
    const listener2 = jest.fn()
    const listener3 = jest.fn()
    
    const unsubscribe1 = courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, listener1)
    const unsubscribe2 = courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, listener2)
    const unsubscribe3 = courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, listener3)
    
    courseEventObserver.emit(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, 'course-123', {})
    
    expect(listener1).toHaveBeenCalled()
    expect(listener2).toHaveBeenCalled()
    expect(listener3).toHaveBeenCalled()
    
    // Test partial unsubscribe
    unsubscribe2()
    
    courseEventObserver.emit(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, 'course-123', {})
    
    expect(listener1).toHaveBeenCalledTimes(2)
    expect(listener2).toHaveBeenCalledTimes(1) // Should not be called again
    expect(listener3).toHaveBeenCalledTimes(2)
  })

  test('clears all listeners and metrics', () => {
    const listener = jest.fn()
    courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, listener)
    courseEventObserver.emit(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, 'course-123', {})
    
    expect(courseEventObserver.getListenerCount()).toBe(1)
    expect(courseEventObserver.getMetrics().eventsEmitted).toBe(1)
    
    courseEventObserver.clear()
    
    expect(courseEventObserver.getListenerCount()).toBe(0)
    expect(courseEventObserver.getMetrics().eventsEmitted).toBe(0)
  })
})