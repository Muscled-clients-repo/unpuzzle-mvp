"use client"

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Star, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { LoadingSpinner } from '@/components/common'

interface CourseReviewsProps {
  courseId: string
  averageRating?: number
  totalReviews?: number
  showAll?: boolean
}

export function CourseReviews({ 
  courseId, 
  averageRating, 
  totalReviews,
  showAll = false 
}: CourseReviewsProps) {
  const { 
    courseReviews, 
    averageRating: storeAverageRating,
    ratingDistribution,
    reviewsTotalCount,
    loadingReviews, 
    reviewsError, 
    loadCourseReviews 
  } = useAppStore()

  useEffect(() => {
    loadCourseReviews(courseId)
  }, [courseId, loadCourseReviews])

  // Use store data if available, otherwise use props
  const displayAverageRating = storeAverageRating || averageRating || 4.5
  const displayTotalReviews = reviewsTotalCount || totalReviews || courseReviews.length

  if (loadingReviews) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (reviewsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load reviews at this time.</p>
        </CardContent>
      </Card>
    )
  }

  if (courseReviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No reviews yet. Be the first to review this course!</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate rating distribution percentages
  const totalRatingCount = Object.values(ratingDistribution).reduce((sum, count) => sum + count, 0)
  const getPercentage = (count: number) => totalRatingCount > 0 ? Math.round((count / totalRatingCount) * 100) : 0

  const reviewsToShow = showAll ? courseReviews : courseReviews.slice(0, 3)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Course Reviews
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="text-2xl font-bold">{displayAverageRating.toFixed(1)}</span>
            <span className="text-muted-foreground">({displayTotalReviews.toLocaleString()} reviews)</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Rating Distribution */}
        <div className="mb-6 space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingDistribution[stars] || 0
            const percentage = getPercentage(count)
            
            return (
              <div key={stars} className="flex items-center gap-4">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm">{stars}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </div>
                <Progress value={percentage} className="flex-1" />
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {percentage}%
                </span>
              </div>
            )
          })}
        </div>

        {/* Individual Reviews */}
        <div className="space-y-6">
          {reviewsToShow.map((review) => (
            <div key={review.id} className="border-b pb-6 last:border-b-0">
              <div className="flex items-start gap-4">
                <Avatar>
                  <AvatarImage src={review.user.avatar} />
                  <AvatarFallback>
                    {review.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-4 w-4 ${
                            star <= review.rating 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-300'
                          }`} 
                        />
                      ))}
                    </div>
                    <span className="font-medium">{review.user.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                    {review.isVerifiedPurchase && (
                      <Badge variant="outline" className="text-xs">
                        Verified Purchase
                      </Badge>
                    )}
                  </div>
                  
                  {review.title && (
                    <h4 className="font-medium mb-2">{review.title}</h4>
                  )}
                  
                  <p className="text-sm text-muted-foreground mb-3">{review.comment}</p>
                  
                  {/* Pros and Cons */}
                  {(review.pros?.length > 0 || review.cons?.length > 0) && (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {review.pros?.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-green-600 mb-1">Pros:</h5>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {review.pros.map((pro, index) => (
                              <li key={index} className="flex items-start gap-1">
                                <span className="text-green-500 mt-0.5">•</span>
                                <span>{pro}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {review.cons?.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-red-600 mb-1">Cons:</h5>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {review.cons.map((con, index) => (
                              <li key={index} className="flex items-start gap-1">
                                <span className="text-red-500 mt-0.5">•</span>
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show More Button */}
        {!showAll && courseReviews.length > 3 && (
          <div className="flex justify-center mt-6">
            <Button variant="outline">
              Show All {displayTotalReviews} Reviews
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Quick Review Summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {getPercentage(ratingDistribution[5] + ratingDistribution[4])}%
              </div>
              <div className="text-xs text-muted-foreground">Positive</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {Math.round(displayAverageRating * 10) / 10}
              </div>
              <div className="text-xs text-muted-foreground">Avg Rating</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {displayTotalReviews.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Total Reviews</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {courseReviews.filter(r => r.isVerifiedPurchase).length}
              </div>
              <div className="text-xs text-muted-foreground">Verified</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}