"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getFeatureFlags, FeatureGate, debugFeatureFlags } from "@/config/features"
import { UserRole } from "@/types/domain"
import { Settings, Flag, Eye, EyeOff, Users, Zap, MessageSquare } from "lucide-react"

export default function TestFeatureFlagsPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('student')
  
  const roles: { value: UserRole; label: string; description: string }[] = [
    { value: 'student', label: 'Student', description: 'AI-powered learning features' },
    { value: 'instructor', label: 'Instructor', description: 'Analytics and engagement tools' },
    { value: 'moderator', label: 'Moderator', description: 'Community management features' },
    { value: 'admin', label: 'Admin', description: 'Full system access' },
  ]
  
  const currentFlags = getFeatureFlags(selectedRole)
  
  const featureCategories = [
    {
      title: "Student AI Features",
      icon: <Zap className="h-5 w-5" />,
      features: [
        { key: 'aiChat', name: 'AI Chat', description: 'Interactive AI assistance during videos' },
        { key: 'reflections', name: 'Reflections', description: 'AI-prompted learning reflections' },
        { key: 'quizzes', name: 'Quizzes', description: 'Adaptive quizzes based on content' },
        { key: 'videoSegments', name: 'Video Segments', description: 'In/out point selection for AI context' },
        { key: 'aiHints', name: 'AI Hints', description: 'Contextual learning hints' },
      ]
    },
    {
      title: "Instructor Features",
      icon: <Users className="h-5 w-5" />,
      features: [
        { key: 'analytics', name: 'Analytics', description: 'Student performance analytics' },
        { key: 'studentResponses', name: 'Student Responses', description: 'Respond to student reflections' },
        { key: 'engagementDashboard', name: 'Engagement Dashboard', description: 'Student engagement overview' },
        { key: 'confusionTracking', name: 'Confusion Tracking', description: 'Track student confusion points' },
      ]
    },
    {
      title: "Shared Features",
      icon: <MessageSquare className="h-5 w-5" />,
      features: [
        { key: 'comments', name: 'Comments', description: 'Video and lesson comments' },
        { key: 'videoDownload', name: 'Video Download', description: 'Download videos offline' },
        { key: 'communityAccess', name: 'Community Access', description: 'Access to community features' },
      ]
    },
    {
      title: "System Features",
      icon: <Settings className="h-5 w-5" />,
      features: [
        { key: 'betaFeatures', name: 'Beta Features', description: 'Access to experimental features' },
        { key: 'debugMode', name: 'Debug Mode', description: 'Development debugging tools' },
      ]
    }
  ]
  
  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role)
    debugFeatureFlags(role) // Log to console
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Flag className="h-8 w-8" />
          Feature Flags Test Dashboard
        </h1>
        <p className="text-muted-foreground">
          Test role-based feature flags and conditional rendering
        </p>
      </div>

      {/* Role Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select User Role</CardTitle>
          <CardDescription>
            Switch between different user roles to see how feature flags change
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedRole} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{role.label}</span>
                    <span className="text-xs text-muted-foreground">{role.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Current Role Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current Role: {roles.find(r => r.value === selectedRole)?.label}
            <Badge variant="outline">{selectedRole}</Badge>
          </CardTitle>
          <CardDescription>
            {roles.find(r => r.value === selectedRole)?.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {Object.values(currentFlags).filter(Boolean).length} features enabled
            </Badge>
            <Badge variant="outline">
              {Object.values(currentFlags).filter(f => !f).length} features disabled
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Feature Categories */}
      <div className="grid gap-6">
        {featureCategories.map((category) => (
          <Card key={category.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {category.icon}
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {category.features.map((feature) => {
                  const isEnabled = currentFlags[feature.key as keyof typeof currentFlags]
                  return (
                    <div key={feature.key} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {isEnabled ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                        <div>
                          <div className="font-medium">{feature.name}</div>
                          <div className="text-sm text-muted-foreground">{feature.description}</div>
                        </div>
                      </div>
                      <Badge variant={isEnabled ? "default" : "secondary"}>
                        {isEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feature Gate Examples */}
      <Card>
        <CardHeader>
          <CardTitle>FeatureGate Component Examples</CardTitle>
          <CardDescription>
            Examples of conditional rendering using FeatureGate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FeatureGate 
            role={selectedRole} 
            feature="aiChat" 
            fallback={<div className="p-3 bg-gray-100 rounded text-gray-600">AI Chat not available for this role</div>}
          >
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              🤖 AI Chat feature is available! Students can ask questions during videos.
            </div>
          </FeatureGate>

          <FeatureGate 
            role={selectedRole} 
            feature="analytics"
            fallback={<div className="p-3 bg-gray-100 rounded text-gray-600">Analytics not available for this role</div>}
          >
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              📊 Analytics dashboard is available! View student engagement metrics.
            </div>
          </FeatureGate>

          <FeatureGate 
            role={selectedRole} 
            feature="betaFeatures"
            fallback={<div className="p-3 bg-gray-100 rounded text-gray-600">Beta features not enabled</div>}
          >
            <div className="p-3 bg-purple-50 border border-purple-200 rounded">
              🧪 Beta features are enabled! Access experimental functionality.
            </div>
          </FeatureGate>
        </CardContent>
      </Card>

      {/* Debug Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Actions</CardTitle>
          <CardDescription>
            Development tools for testing feature flags
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={() => debugFeatureFlags(selectedRole)} variant="outline">
            Log Feature Flags to Console
          </Button>
          <p className="text-xs text-muted-foreground">
            Check the browser console for detailed feature flag information
          </p>
        </CardContent>
      </Card>
    </div>
  )
}