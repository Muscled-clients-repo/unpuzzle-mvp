"use client"

import { useAppStore } from "@/stores/app-store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export function CourseSelector() {
  const { 
    courseAnalytics, 
    selectedInstructorCourse, 
    setSelectedInstructorCourse
  } = useAppStore()

  return (
    <div className="bg-background border-b">
      <div className="container mx-auto px-6 py-3">
        {/* Simplified to just the dropdown selector */}
        <Select 
          value={selectedInstructorCourse} 
          onValueChange={setSelectedInstructorCourse}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="font-medium">All Courses</span>
            </SelectItem>
            
            <div className="my-1 h-px bg-border" />
            
            {courseAnalytics?.map(course => (
              <SelectItem key={course.courseId} value={course.courseId}>
                <div className="flex items-center justify-between w-full">
                  <span>{course.courseName}</span>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge variant="outline" className="text-xs">
                      {course.totalStudents} students
                    </Badge>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}