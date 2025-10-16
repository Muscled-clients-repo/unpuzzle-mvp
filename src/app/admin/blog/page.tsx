"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageContainer } from "@/components/layout/page-container"
import { PageContentHeader } from "@/components/layout/page-content-header"
import { Plus, FileText } from "lucide-react"

export default function AdminBlogPage() {
  return (
    <PageContainer>
      <PageContentHeader
        title="Blog Management"
        description="Create and manage AI-powered blog posts"
      >
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Post
        </Button>
      </PageContentHeader>

      <Card className="p-12">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Blog system coming soon</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-powered blog generation with SEO optimization will be available here.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Currently using static blog posts at /blog
          </p>
        </div>
      </Card>
    </PageContainer>
  )
}
