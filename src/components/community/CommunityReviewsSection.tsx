'use client'

import React, { useState } from 'react'
import { Star, ThumbsUp, Image, Play, ChevronDown, Filter } from 'lucide-react'

interface Review {
  id: string
  name: string
  rating: number
  review: string
  timeframe: string
  verified: boolean
  helpful: number
  images?: string[]
  video?: string
  achievement: string
  location: string
}

interface RatingBreakdown {
  star: number
  count: number
  percentage: number
}

export function CommunityReviewsSection() {
  const [filterRating, setFilterRating] = useState('all')
  const [showImages, setShowImages] = useState(false)
  const [showWithMedia, setShowWithMedia] = useState(false)

  const totalReviews = 247
  const averageRating = 4.8

  const ratingBreakdown: RatingBreakdown[] = [
    { star: 5, count: 198, percentage: 80 },
    { star: 4, count: 37, percentage: 15 },
    { star: 3, count: 7, percentage: 3 },
    { star: 2, count: 3, percentage: 1 },
    { star: 1, count: 2, percentage: 1 }
  ]

  const reviews: Review[] = [
    {
      id: '1',
      name: 'Sarah M.',
      rating: 5,
      review: "Finally hit my first $5K month! The community system works exactly as promised. Daily accountability kept me on track and the templates saved me weeks of work. Here's my Upwork dashboard showing the results.",
      timeframe: '3 weeks ago',
      verified: true,
      helpful: 23,
      images: ['/api/placeholder/300/200', '/api/placeholder/300/200'],
      achievement: '$4,850 earned in 3 months',
      location: 'Austin, TX'
    },
    {
      id: '2',
      name: 'Mike R.',
      rating: 5,
      review: "From zero to $2,760/month recurring revenue in 6 weeks. The step-by-step system is incredible. Recorded a quick video showing my client dashboard and monthly earnings. Game changer!",
      timeframe: '1 month ago',
      verified: true,
      helpful: 31,
      video: '/api/placeholder/video',
      achievement: '$2,760 monthly recurring',
      location: 'San Francisco, CA'
    },
    {
      id: '3',
      name: 'Lisa K.',
      rating: 5,
      review: "Best investment I've made this year. The resources are insane quality and the community support is unmatched. Screenshots of my SaaS revenue growth included. Went from idea to $1K MRR in 8 weeks.",
      timeframe: '2 months ago',
      verified: true,
      helpful: 18,
      images: ['/api/placeholder/300/200', '/api/placeholder/300/200', '/api/placeholder/300/200'],
      achievement: '$6,800 total revenue',
      location: 'New York, NY'
    },
    {
      id: '4',
      name: 'John D.',
      rating: 5,
      review: "The daily tracking and goal system actually works. Hit my target 2 weeks early. The templates and community feedback made all the difference. Sharing my earnings dashboard below.",
      timeframe: '3 months ago',
      verified: true,
      helpful: 27,
      images: ['/api/placeholder/300/200'],
      achievement: '$3,750 in 75 days',
      location: 'Miami, FL'
    },
    {
      id: '5',
      name: 'Jenny L.',
      rating: 4,
      review: "Great community and resources. The system works but takes consistent effort. Would love more video tutorials, but overall very satisfied with my progress so far.",
      timeframe: '1 month ago',
      verified: true,
      helpful: 12,
      achievement: '$5,680 total earned',
      location: 'Seattle, WA'
    },
    {
      id: '6',
      name: 'Alex T.',
      rating: 5,
      review: "Skeptical at first but the results speak for themselves. The community keeps you accountable and the resources are top-notch. Here's proof of my first month earnings.",
      timeframe: '2 weeks ago',
      verified: true,
      helpful: 15,
      images: ['/api/placeholder/300/200', '/api/placeholder/300/200'],
      achievement: '$1,660 in first month',
      location: 'Chicago, IL'
    }
  ]

  const filteredReviews = reviews.filter(review => {
    if (filterRating === 'all') return true
    if (filterRating === 'media') return review.images || review.video
    return review.rating === parseInt(filterRating)
  })

  return (
    <div className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Reviews</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="text-xl font-semibold">{averageRating}</span>
              <span className="text-gray-500">({totalReviews.toLocaleString()} reviews)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Rating Breakdown */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Rating Breakdown</h3>
              <div className="space-y-3">
                {ratingBreakdown.map((item) => (
                  <button
                    key={item.star}
                    onClick={() => setFilterRating(item.star.toString())}
                    className={`flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                      filterRating === item.star.toString() ? 'bg-gray-900 text-white hover:bg-gray-800' : ''
                    }`}
                  >
                    <span className="text-sm w-6">{item.star}</span>
                    <Star className={`h-4 w-4 ${
                      filterRating === item.star.toString() ? 'text-yellow-300' : 'text-yellow-400'
                    } fill-current`} />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          filterRating === item.star.toString() ? 'bg-yellow-300' : 'bg-yellow-400'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className={`text-sm w-12 ${
                      filterRating === item.star.toString() ? 'text-gray-200' : 'text-gray-600'
                    }`}>{item.count}</span>
                  </button>
                ))}
              </div>

              {/* Additional Filters */}
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
                <button
                  onClick={() => setFilterRating('all')}
                  className={`block w-full text-left px-3 py-2 rounded text-sm ${
                    filterRating === 'all' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  All Reviews ({totalReviews})
                </button>
                <button
                  onClick={() => setFilterRating('media')}
                  className={`block w-full text-left px-3 py-2 rounded text-sm ${
                    filterRating === 'media' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  With Photos/Videos (67)
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Reviews */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {filteredReviews.map((review) => (
                <div key={review.id} className="border border-gray-200 rounded-lg p-6">
                  {/* Review Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{review.name}</span>
                        {review.verified && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-gray-500">
                        {review.location} • {review.timeframe}
                      </div>
                    </div>
                  </div>

                  {/* Review Content */}
                  <p className="text-gray-900 mb-4 leading-relaxed">{review.review}</p>

                  {/* Achievement Badge */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <div className="text-sm font-medium text-green-800">
                      ✅ {review.achievement}
                    </div>
                  </div>

                  {/* Media */}
                  {review.images && (
                    <div className="mb-4">
                      <div className="flex gap-2 overflow-x-auto">
                        {review.images.map((image, index) => (
                          <div key={index} className="relative flex-shrink-0">
                            <img
                              src={image}
                              alt={`Review image ${index + 1}`}
                              className="w-24 h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
                            />
                            <div className="absolute bottom-1 right-1">
                              <Image className="h-4 w-4 text-white bg-black bg-opacity-50 rounded p-0.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {review.video && (
                    <div className="mb-4">
                      <div className="relative w-32 h-24 bg-gray-100 rounded-lg border border-gray-200 cursor-pointer hover:opacity-90">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-8 w-8 text-gray-600" />
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                          2:30
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Helpful */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <button className="flex items-center gap-1 hover:text-gray-700">
                      <ThumbsUp className="h-4 w-4" />
                      Helpful ({review.helpful})
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            <div className="text-center mt-8">
              <button className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 mx-auto">
                Load More Reviews
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}