"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageContainer } from "@/components/layout/page-container"
import { PageContentHeader } from "@/components/layout/page-content-header"
import { StatsGrid } from "@/components/layout/stats-grid"
import {
  FileText,
  FolderOpen,
  Bug,
  Lightbulb,
} from "lucide-react"

export default function AdminDashboard() {
  return (
    <PageContainer>
      <PageContentHeader
        title="Admin Dashboard"
        description="Manage blog, resources, and platform requests"
      />

      {/* Key Metrics */}
      <StatsGrid columns={4}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Blog Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6</div>
            <p className="text-xs text-muted-foreground">
              2 featured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resources</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Community resources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bug Reports</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feature Requests</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Awaiting implementation
            </p>
          </CardContent>
        </Card>
      </StatsGrid>

      {/* Quick Links */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Blog Management</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Create and manage blog posts
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <FolderOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-base">Resources</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage community resources
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <Bug className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-base">Bug Reports</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Review and fix reported bugs
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Blog System</span>
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                Static (Migration Needed)
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">AI Generation</span>
              <Badge variant="outline" className="text-gray-600">
                Not Configured
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SEO Optimization</span>
              <Badge variant="outline" className="text-gray-600">
                Not Configured
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
