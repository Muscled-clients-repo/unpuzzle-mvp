'use client'

import React from 'react'
import { MessageCircle, Eye, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Message {
  id: string
  instructorName: string
  message: string
  timestamp: string
}

interface Instructor {
  id: string
  name: string
  lastReviewed: string
  recentMessages: Message[]
}

interface InstructorSupportPanelProps {
  instructor: Instructor
}

export function InstructorSupportPanel({ instructor }: InstructorSupportPanelProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-blue-600" />
          <div>
            <CardTitle className="text-lg">Your Instructor: {instructor.name}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Last reviewed your progress: {new Date(instructor.lastReviewed).toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Recent Messages */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Recent Messages</h4>
          <div className="space-y-3">
            {instructor.recentMessages.map((message) => (
              <div 
                key={message.id}
                className="bg-blue-50 border border-blue-200 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">
                    {message.instructorName}
                  </span>
                  <span className="text-xs text-blue-600">
                    {message.timestamp}
                  </span>
                </div>
                <p className="text-sm text-blue-800 leading-relaxed">
                  {message.message}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-4 border-t border-gray-100">
          <Button className="w-full" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            Send Message
          </Button>
          <Button variant="outline" className="w-full" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Mark as Reviewed
          </Button>
        </div>

        {/* Instructor Stats */}
        <div className="bg-gray-50 rounded-lg p-3 mt-4">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Instructor Response</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Avg Response</div>
              <div className="font-semibold text-gray-900">&lt; 2 hours</div>
            </div>
            <div>
              <div className="text-gray-600">Success Rate</div>
              <div className="font-semibold text-green-600">94%</div>
            </div>
          </div>
        </div>

        {/* Quick Help */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-sm">
            <div className="font-medium text-yellow-900 mb-1">💡 Quick Tip</div>
            <p className="text-yellow-800">
              Update your progress regularly to get better guidance from your instructor.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}