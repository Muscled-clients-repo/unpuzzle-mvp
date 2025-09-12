'use client'

import { Crown, ArrowRight, Check, Star } from 'lucide-react'
import { useState, useEffect } from 'react'

export function StickyCTA() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show CTA after scrolling past hero section (500px)
      setIsVisible(window.scrollY > 500)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const goalTracks = [
    {
      icon: '🛍️',
      title: 'Shopify Agency',
      levels: ['$1k', '$5k', '$10k', '$50k']
    },
    {
      icon: '🤖', 
      title: 'AI Software Agency',
      levels: ['$1k', '$5k', '$10k', '$20k']
    },
    {
      icon: '💰',
      title: 'SaaS Builder',
      levels: ['$1k MRR', '$5k MRR', '$10k MRR', '$20k MRR']
    }
  ]

  if (!isVisible) return null

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 w-80">
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl shadow-2xl text-white p-6 border border-white/20">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <Crown className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold mb-1">Join The Puzzle</h3>
          <div className="flex items-center justify-center gap-1 mb-2">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="text-xs text-blue-100 ml-1">(4.9/5)</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-lg text-blue-200 line-through">$297</span>
            <span className="text-3xl font-black">$197</span>
            <span className="text-sm text-green-300">/month</span>
          </div>
          <div className="bg-red-500/20 text-red-300 text-xs px-3 py-1 rounded-full inline-block">
            Limited Time: 34% OFF
          </div>
        </div>

        {/* Goal Tracks */}
        <div className="mb-6">
          <h4 className="font-semibold text-sm mb-3 text-center">Choose Your Path:</h4>
          <div className="space-y-3">
            {goalTracks.map((track, index) => (
              <div key={index} className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{track.icon}</span>
                  <span className="font-medium text-sm">{track.title}</span>
                </div>
                <div className="flex gap-1">
                  {track.levels.map((level, i) => (
                    <div key={i} className="bg-white/20 text-xs px-2 py-1 rounded text-center flex-1">
                      {level}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="mb-6">
          <div className="space-y-2">
            {[
              'AI Development Training',
              'Real Client Templates', 
              'Weekly Accountability',
              'Team Building Guide',
              'Sales Call Reviews'
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                <span className="text-blue-100">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <button className="w-full bg-white text-blue-600 font-bold py-4 px-6 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 group mb-3">
          Start Your Journey
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Social Proof */}
        <div className="text-center">
          <div className="text-xs text-blue-200 mb-1">
            2,847+ members already earning
          </div>
          <div className="text-xs text-green-300 font-semibold">
            💰 $12.4M+ total earned by community
          </div>
        </div>

        {/* Guarantee */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="text-center">
            <div className="text-xs text-blue-200 mb-1">
              ✅ 30-Day Money-Back Guarantee
            </div>
            <div className="text-xs text-blue-200">
              🔒 Cancel anytime, no questions asked
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}