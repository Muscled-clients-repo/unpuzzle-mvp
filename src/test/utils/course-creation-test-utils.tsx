import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

// Create a custom render function that includes all providers
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: createWrapper(), ...options })

// Mock data factories
export const createMockCourse = (overrides = {}) => ({
  id: 'course-1',
  title: 'Test Course',
  description: 'Test course description',
  price: 99,
  difficulty: 'beginner' as const,
  status: 'draft' as const,
  instructor_id: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

export const createMockChapter = (overrides = {}) => ({
  id: 'chapter-1',
  title: 'Test Chapter',
  courseId: 'course-1',
  order: 0,
  videos: [],
  videoCount: 0,
  ...overrides
})

export const createMockVideo = (overrides = {}) => ({
  id: 'video-1',
  filename: 'test-video.mp4',
  originalFilename: 'test-video.mp4',
  course_id: 'course-1',
  chapter_id: 'chapter-1',
  order: 0,
  duration: 300,
  size: 1024 * 1024 * 100, // 100MB
  format: 'video/mp4',
  status: 'ready' as const,
  backblaze_file_id: 'file-123',
  backblaze_url: 'https://example.com/video.mp4',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

export const createMockFile = (overrides = {}): File => {
  const file = new File(['test content'], 'test-video.mp4', {
    type: 'video/mp4',
    ...overrides
  })
  
  // Add size property that's not normally settable
  Object.defineProperty(file, 'size', {
    value: 1024 * 1024 * 100, // 100MB
    writable: false,
    ...overrides
  })
  
  return file
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { customRender as render }