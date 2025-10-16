'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, Play, Pause, ArrowRight, BookOpen, Target, VideoIcon, Home, GraduationCap, FileText } from 'lucide-react'
import { CommunityPostsFeedConnected } from './CommunityPostsFeedConnected'
import { CommunityGoalsSection } from './CommunityGoalsSection'
import { CommunityCoursesSection } from './CommunityCoursesSection'
import { CommunityResourcesSectionConnected } from './CommunityResourcesSectionConnected'
import { createClient } from '@/lib/supabase/client'

interface CommunityHeaderProps {
  communityPosts?: any[]
  userRole?: 'guest' | 'student' | 'instructor'
  goalData?: {
    similarStudents?: Array<{ name: string; progress: number; days: number }>
    recentlyCompletedStudents?: Array<{ name: string; goal: string; days: number; rank: number }>
  }
  hiddenTabs?: string[]
  coursesByGoal?: any[]
  initialTab?: 'community' | 'goals' | 'courses' | 'resources'
}

export function CommunityHeader({ communityPosts, userRole = 'student', goalData, hiddenTabs = [], coursesByGoal, initialTab = 'community' }: CommunityHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [currentActivity, setCurrentActivity] = useState(0)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showFloatingCTA, setShowFloatingCTA] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  const allNavigationTabs = [
    { id: 'community', label: 'Community', icon: Home },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'courses', label: 'Courses', icon: GraduationCap },
    { id: 'resources', label: 'Resources', icon: FileText }
  ]
  
  const navigationTabs = allNavigationTabs.filter(tab => !hiddenTabs.includes(tab.id))

  const liveActivities = [
    {
      id: 1,
      user: 'Sarah',
      action: 'submitted reflection',
      icon: BookOpen,
      time: '2 mins ago',
      color: 'text-blue-600'
    },
    {
      id: 2,
      user: 'John',
      action: 'activated Quiz AI at 2:20',
      detail: 'Claude Code Mastery video',
      icon: VideoIcon,
      time: '5 mins ago',
      color: 'text-purple-600'
    },
    {
      id: 3,
      user: 'Jen',
      action: 'graduated from $1k to $3k goal',
      detail: 'Agency milestone reached',
      icon: Target,
      time: '8 mins ago',
      color: 'text-green-600'
    },
    {
      id: 4,
      user: 'Mike',
      action: 'completed course',
      detail: 'No Code Agency Fundamentals',
      icon: BookOpen,
      time: '12 mins ago',
      color: 'text-orange-600'
    },
    {
      id: 5,
      user: 'Lisa',
      action: 'hit $2k milestone',
      detail: 'First month earnings',
      icon: Target,
      time: '15 mins ago',
      color: 'text-green-600'
    }
  ]

  const galleryItems = [
    {
      id: 1,
      type: 'video',
      src: '/api/placeholder/800/450',
      thumbnail: '/api/placeholder/800/450',
      title: 'Building $500k Agency with Claude Code',
      description: 'Watch how I built a successful development agency using AI'
    },
    {
      id: 2,
      type: 'image',
      src: '/api/placeholder/800/450',
      title: 'Upwork Success Dashboard',
      description: 'Real earnings screenshots from successful projects'
    },
    {
      id: 3,
      type: 'image', 
      src: '/api/placeholder/800/450',
      title: 'Client Project Results',
      description: 'Before and after of client applications built with Claude Code'
    },
    {
      id: 4,
      type: 'image',
      src: '/api/placeholder/800/450', 
      title: 'Team Structure',
      description: 'How I built and manage a profitable development team'
    },
    {
      id: 5,
      type: 'image',
      src: '/api/placeholder/800/450',
      title: 'Revenue Growth Chart', 
      description: 'Month by month growth from $0 to $500k+'
    }
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % galleryItems.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + galleryItems.length) % galleryItems.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  // Removed auto-advance - gallery is now manual only

  // Fetch current user ID
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    fetchUser()
  }, [])

  // Auto-advance activities
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentActivity((prev) => (prev + 1) % liveActivities.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  // Handle scroll for floating CTA
  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.getElementById('hero-section')
      if (heroSection) {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight
        const scrollPosition = window.scrollY + window.innerHeight * 0.3
        setShowFloatingCTA(scrollPosition > heroBottom)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const currentItem = galleryItems[currentSlide]

  return (
    <div className="bg-white">
      <div id="hero-section" className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Left Side - Gallery */}
          <div className="lg:col-span-2">
            {/* Hero Title Section */}
            <div className="text-left mb-8">
              <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                The Puzzle Community
              </h1>
              <p className="text-lg text-gray-600">
                Where problems become profit and developers become entrepreneurs
              </p>
            </div>
            
            {/* Main Gallery */}
            <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video mb-4">
              {currentItem.type === 'video' ? (
                <div className="relative w-full h-full">
                  <img 
                    src={currentItem.thumbnail}
                    alt={currentItem.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button 
                      onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                      className="bg-gray-900 hover:bg-black rounded-full p-4 transition-colors shadow-lg"
                    >
                      {isVideoPlaying ? (
                        <Pause className="h-8 w-8" />
                      ) : (
                        <Play className="h-8 w-8 ml-1" />
                      )}
                    </button>
                  </div>
                  {isVideoPlaying && (
                    <div className="absolute top-4 left-4 bg-red-500 px-3 py-1 rounded-full text-sm font-medium text-white">
                      ● LIVE
                    </div>
                  )}
                </div>
              ) : (
                <img 
                  src={currentItem.src}
                  alt={currentItem.title}
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Navigation Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 transition-colors shadow-md"
              >
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 transition-colors shadow-md"
              >
                <ChevronRight className="h-5 w-5 text-gray-700" />
              </button>

              {/* Slide Counter */}
              <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-1 rounded-full text-sm text-gray-700 shadow-sm">
                {currentSlide + 1} / {galleryItems.length}
              </div>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {galleryItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => goToSlide(index)}
                  className={`relative flex-shrink-0 w-20 h-12 rounded-md overflow-hidden border-2 transition-all ${
                    currentSlide === index ? 'border-gray-900' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img 
                    src={item.type === 'video' ? item.thumbnail : item.src}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Play className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

          </div>

          {/* Right Side - CTA Box */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-lg">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mb-4">
                  <div className="text-xs font-medium text-gray-700 mb-1">🏆 FOUNDING MEMBERS (37/50 LEFT)</div>
                  <div className="text-lg font-semibold text-gray-900">Learn My $300K Upwork System</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-4">
                  <div className="flex items-center gap-2 text-xs">
                    {React.createElement(liveActivities[currentActivity].icon, {
                      className: `h-3 w-3 ${liveActivities[currentActivity].color}`
                    })}
                    <span className="text-gray-700">
                      <span className="font-medium">{liveActivities[currentActivity].user}</span>{' '}
                      {liveActivities[currentActivity].action}
                      {liveActivities[currentActivity].detail && (
                        <span className="text-gray-500"> - {liveActivities[currentActivity].detail}</span>
                      )}
                    </span>
                    <span className="text-gray-500 ml-auto">{liveActivities[currentActivity].time}</span>
                  </div>
                </div>
              </div>

              {/* Goal Tracks Slider */}
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-3 text-center">Choose Your Track</h3>
                <div className="flex gap-3 justify-center">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-40">
                    <div className="text-center">
                      <div className="text-3xl mb-2">⚡</div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Ecom/AI Agency</div>
                      <div className="text-xs text-gray-600">$1k → $25k</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-40">
                    <div className="text-center">
                      <div className="text-3xl mb-2">💰</div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Code With AI SaaS</div>
                      <div className="text-xs text-gray-600">$1k → $20k MRR</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Core Value */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                    <span className="text-gray-700">$300K on Upwork</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                    <span className="text-gray-700">Freelancer to SaaS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                    <span className="text-gray-700">Daily Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                    <span className="text-gray-700">Goal Tracker</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                    <span className="text-gray-700">1 to 1 Mentorship</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                    <span className="text-gray-700">$1-$3/hr Devs</span>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="text-center mb-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-xl text-gray-400 line-through">$197</span>
                    <span className="text-3xl font-bold text-gray-900">$97</span>
                    <span className="text-lg text-gray-600">/month</span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Lock in Forever</div>
                  <div className="text-xs text-red-600 font-medium">
                    Founding member price ends in 48h
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <button className="w-full bg-gray-900 text-white font-semibold py-4 px-6 rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-2 group mb-3">
                SECURE YOUR SPOT - 37 LEFT
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Guarantee */}
              <div className="text-center text-xs text-gray-600">
                <div className="text-gray-700">
                  ✅ 30-day money-back guarantee
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Community Navigation */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Column - Navigation */}
            <div className="lg:col-span-1">
              {/* Navigation */}
              <div>
                <nav className="space-y-2">
                  {navigationTabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id)
                          // Navigate to the appropriate route without scrolling
                          const route = tab.id === 'community' ? '/community' : `/community/${tab.id}`
                          router.push(route, { scroll: false })
                        }}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                          activeTab === tab.id
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    )
                  })}
                </nav>
              </div>
            </div>

            {/* Right Content Area - Tab-specific content */}
            <div className="lg:col-span-3">
              {activeTab === 'community' && <CommunityPostsFeedConnected />}
              {activeTab === 'goals' && (
                <CommunityGoalsSection
                  userRole={userRole}
                  studentId={currentUserId || undefined}
                  memberName="John D."
                  isOwnProfile={true}
                  similarStudents={goalData?.similarStudents}
                  recentlyCompletedStudents={goalData?.recentlyCompletedStudents}
                />
              )}
              {activeTab === 'courses' && (
                <CommunityCoursesSection
                  userRole={userRole}
                />
              )}
              {activeTab === 'resources' && (
                <CommunityResourcesSectionConnected />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating CTA Box */}
      {showFloatingCTA && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xl max-w-xs">
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-900 mb-2">🏆 37 spots left</div>
              <div className="flex items-center justify-center gap-1 mb-3">
                <span className="text-sm text-gray-400 line-through">$197</span>
                <span className="text-xl font-bold text-gray-900">$97</span>
                <span className="text-sm text-gray-600">/month</span>
              </div>
              <button className="w-full bg-gray-900 text-white font-medium py-2 px-4 rounded-lg hover:bg-black transition-colors text-sm flex items-center justify-center gap-2 group">
                Join Community
                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="text-xs text-gray-500 mt-2">30-day guarantee</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}