"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Users, BookOpen, Award, TrendingUp, Brain, Sparkles } from "lucide-react"

interface MarketingPanelProps {
  type: 'signup' | 'login'
}

const testimonials = [
  {
    quote: "The AI tutor helped me understand concepts I struggled with for months!",
    author: "Sarah M.",
    role: "Student",
    rating: 5
  },
  {
    quote: "Best online learning platform I've used. The progress tracking is amazing!",
    author: "John D.",
    role: "Developer",
    rating: 5
  },
  {
    quote: "Unpuzzle changed how I learn. The AI assistant is like having a personal tutor.",
    author: "Emily R.",
    role: "Designer",
    rating: 5
  }
]

export function MarketingPanel({ type }: MarketingPanelProps) {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  if (type === 'signup') {
    return (
      <div className="text-white space-y-8 max-w-xl">
        {/* Headline */}
        <div className="space-y-4">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
            Start Your Learning Journey
          </h1>
          <p className="text-xl text-purple-100">
            Join thousands mastering new skills with AI-powered learning
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Learn at Your Own Pace</p>
              <p className="text-sm text-purple-100">Pause, rewind, and rewatch anytime</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Brain className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">AI Learning Assistant</p>
              <p className="text-sm text-purple-100">Get instant help when you're stuck</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Award className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Expert Instructors</p>
              <p className="text-sm text-purple-100">Learn from industry professionals</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <TrendingUp className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Track Your Progress</p>
              <p className="text-sm text-purple-100">Visual progress tracking and certificates</p>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="flex gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Sparkles key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
          <p className="text-lg mb-4 italic">"{testimonials[currentTestimonial].quote}"</p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20" />
            <div>
              <p className="font-semibold text-sm">{testimonials[currentTestimonial].author}</p>
              <p className="text-xs text-purple-200">{testimonials[currentTestimonial].role}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-8 pt-4 border-t border-white/20">
          <div>
            <p className="text-2xl font-bold">10,000+</p>
            <p className="text-sm text-purple-200">Active Students</p>
          </div>
          <div>
            <p className="text-2xl font-bold">500+</p>
            <p className="text-sm text-purple-200">Courses</p>
          </div>
          <div>
            <p className="text-2xl font-bold">95%</p>
            <p className="text-sm text-purple-200">Completion Rate</p>
          </div>
        </div>
      </div>
    )
  }

  // Login marketing content
  return (
    <div className="text-white space-y-8 max-w-xl">
      {/* Welcome Back */}
      <div className="space-y-4">
        <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
          Welcome Back!
        </h1>
        <p className="text-xl text-purple-100">
          Continue where you left off and achieve your learning goals
        </p>
      </div>

      {/* Progress Preview */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="font-semibold text-lg mb-4">Your Learning Journey</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">Overall Progress</span>
            <span className="text-sm font-semibold">68%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full" style={{ width: '68%' }} />
          </div>
          <div className="grid grid-cols-3 gap-4 pt-3">
            <div className="text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-1" />
              <p className="text-2xl font-bold">4</p>
              <p className="text-xs text-purple-200">Active Courses</p>
            </div>
            <div className="text-center">
              <Award className="w-8 h-8 mx-auto mb-1" />
              <p className="text-2xl font-bold">2</p>
              <p className="text-xs text-purple-200">Certificates</p>
            </div>
            <div className="text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-1" />
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-purple-200">Day Streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* Motivation */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          Daily Motivation
        </h3>
        <blockquote className="border-l-4 border-purple-400 pl-4 italic text-purple-100">
          "The expert in anything was once a beginner. Keep going!"
        </blockquote>
      </div>

      {/* Recent Updates */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-purple-200">What's New</p>
        <ul className="space-y-2 text-sm text-purple-100">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            New AI features for better learning
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            50+ new courses added this month
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            Improved progress tracking
          </li>
        </ul>
      </div>
    </div>
  )
}