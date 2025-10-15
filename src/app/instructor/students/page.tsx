"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PageContainer } from "@/components/layout/page-container"
import { PageContentHeader } from "@/components/layout/page-content-header"
import { StatsGrid } from "@/components/layout/stats-grid"
import { FiltersSection } from "@/components/layout"
import { SearchInput } from "@/components/ui/filters"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppStore } from "@/stores/app-store"
import { ErrorBoundary, LoadingSpinner, ErrorFallback } from "@/components/common"
import { getPaidStudents, getLeadUsers, type PaidStudent, type LeadUser } from "@/lib/actions/student-list-actions"
import {
  Search,
  Filter,
  User,
  Clock,
  BookOpen,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Target,
  DollarSign,
  Mail,
  Download
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function InstructorStudentsPage() {
  const { user } = useAppStore()

  const [paidStudents, setPaidStudents] = useState<PaidStudent[]>([])
  const [leadUsers, setLeadUsers] = useState<LeadUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<'paid' | 'leads'>('paid')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)

      const [paidResult, leadsResult] = await Promise.all([
        getPaidStudents(),
        getLeadUsers()
      ])

      if (paidResult.error) {
        setError(paidResult.error)
      } else {
        setPaidStudents(paidResult.data || [])
      }

      if (leadsResult.error) {
        setError(leadsResult.error)
      } else {
        setLeadUsers(leadsResult.data || [])
      }

      setLoading(false)
    }

    if (user?.id) {
      loadData()
    }
  }, [user?.id])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorFallback error={error} />

  // Filter paid students based on search
  const filteredPaidStudents = paidStudents.filter(student =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.goal_title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter lead users based on search
  const filteredLeadUsers = leadUsers.filter(lead =>
    lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.resource_title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getGoalStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="text-xs">Completed</Badge>
      case 'in_progress':
        return <Badge variant="secondary" className="text-xs">In Progress</Badge>
      case 'not_started':
        return <Badge variant="outline" className="text-xs">Not Started</Badge>
      default:
        return <Badge variant="outline" className="text-xs">No Goal</Badge>
    }
  }

  const getLeadSourceBadge = (source: 'resource_download' | 'signup') => {
    if (source === 'resource_download') {
      return <Badge variant="secondary" className="text-xs"><Download className="h-3 w-3 mr-1" />Resource</Badge>
    }
    return <Badge variant="outline" className="text-xs"><Mail className="h-3 w-3 mr-1" />Signup</Badge>
  }

  return (
    <ErrorBoundary>
      <PageContainer>
        <PageContentHeader
          title="Students"
          description="Monitor and support your students' learning journey"
        />

        {/* Summary Cards */}
        <StatsGrid columns={4}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Paid Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paidStudents.length}</div>
                <p className="text-xs text-muted-foreground">Active subscribers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total MRR</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${paidStudents.reduce((sum, s) => sum + (s.current_mrr || 0), 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Monthly recurring</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ${paidStudents.reduce((sum, s) => sum + (s.total_revenue_earned || 0), 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">All time earnings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {leadUsers.length}
                </div>
                <p className="text-xs text-muted-foreground">Potential customers</p>
              </CardContent>
            </Card>
        </StatsGrid>

        {/* Tabs for Paid Students and Leads */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'paid' | 'leads')} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="paid" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Paid Students ({paidStudents.length})
              </TabsTrigger>
              <TabsTrigger value="leads" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Leads ({leadUsers.length})
              </TabsTrigger>
            </TabsList>

            <SearchInput
              placeholder={activeTab === 'paid' ? "Search paid students..." : "Search leads..."}
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          {/* Paid Students Tab */}
          <TabsContent value="paid" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paid Students</CardTitle>
                <CardDescription>
                  Students with active track assignments and revenue progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPaidStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No students found matching your search" : "No paid students yet"}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Goal</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>MRR</TableHead>
                        <TableHead>Total Revenue</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPaidStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {student.avatar_url ? (
                                <img
                                  src={student.avatar_url}
                                  alt={student.full_name}
                                  className="h-8 w-8 rounded-full"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                  <User className="h-4 w-4" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{student.full_name}</p>
                                <p className="text-xs text-muted-foreground">{student.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">
                              {student.goal_title || <span className="text-muted-foreground">No goal set</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {student.goal_progress !== null ? (
                              <div className="space-y-1">
                                <Progress value={student.goal_progress} className="h-2 w-20" />
                                <p className="text-xs text-muted-foreground">{student.goal_progress}%</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getGoalStatusBadge(student.goal_status)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-green-600">
                              ${student.current_mrr?.toLocaleString() || '0'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              ${student.total_revenue_earned?.toLocaleString() || '0'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {student.track_assigned_at ? formatDistanceToNow(new Date(student.track_assigned_at), { addSuffix: true }) : '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/instructor/student-goals/${student.id}`}>
                                <Target className="h-4 w-4 mr-2" />
                                View
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Leads</CardTitle>
                <CardDescription>
                  Free users and resource downloaders without paid subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredLeadUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No leads found matching your search" : "No leads yet"}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Resource/Track</TableHead>
                        <TableHead>Downloads</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeadUsers.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                <Mail className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{lead.full_name || lead.email}</p>
                                {lead.full_name && (
                                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getLeadSourceBadge(lead.source)}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">
                              {lead.resource_title || <span className="text-muted-foreground">Free signup</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {lead.download_count !== undefined ? (
                              <Badge variant="outline" className="text-xs">
                                {lead.download_count} {lead.download_count === 1 ? 'download' : 'downloads'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`mailto:${lead.email}`}>
                                <Mail className="h-4 w-4 mr-2" />
                                Email
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </ErrorBoundary>
  )
}