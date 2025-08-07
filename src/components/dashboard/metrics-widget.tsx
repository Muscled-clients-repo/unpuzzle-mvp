import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Minus, Clock, Target, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricWidgetProps {
  title: string
  value: string | number
  description?: string
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  progress?: number
  progressLabel?: string
  variant?: "default" | "success" | "warning" | "danger"
}

const variantStyles = {
  default: "text-foreground",
  success: "text-green-600",
  warning: "text-yellow-600",
  danger: "text-red-600",
}

export function MetricWidget({
  title,
  value,
  description,
  change,
  changeLabel,
  icon,
  progress,
  progressLabel,
  variant = "default",
}: MetricWidgetProps) {
  const getTrendIcon = () => {
    if (change === undefined) return null
    if (change > 0) return <TrendingUp className="h-4 w-4" />
    if (change < 0) return <TrendingDown className="h-4 w-4" />
    return <Minus className="h-4 w-4" />
  }

  const getTrendColor = () => {
    if (change === undefined) return ""
    if (change > 0) return "text-green-600"
    if (change < 0) return "text-red-600"
    return "text-muted-foreground"
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", variantStyles[variant])}>
          {value}
        </div>
        {description && (
          <CardDescription className="mt-1 text-xs">
            {description}
          </CardDescription>
        )}
        
        {change !== undefined && (
          <div className={cn("mt-2 flex items-center gap-1 text-xs", getTrendColor())}>
            {getTrendIcon()}
            <span className="font-medium">
              {change > 0 ? "+" : ""}{change}%
            </span>
            {changeLabel && (
              <span className="text-muted-foreground">{changeLabel}</span>
            )}
          </div>
        )}

        {progress !== undefined && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progressLabel || "Progress"}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="mt-1" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface LearningMetricsProps {
  learnRate: number
  executionRate: number
  executionPace: number
  totalWatchTime: number
}

export function LearningMetrics({
  learnRate,
  executionRate,
  executionPace,
  totalWatchTime,
}: LearningMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricWidget
        title="Learn Rate"
        value={`${learnRate} min/hr`}
        description="Active learning time per hour"
        change={12}
        changeLabel="vs last week"
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        variant={learnRate >= 30 ? "success" : "warning"}
      />
      
      <MetricWidget
        title="Execution Rate"
        value={`${executionRate}%`}
        description="Activities completed"
        progress={executionRate}
        progressLabel="Target: 80%"
        icon={<Target className="h-4 w-4 text-muted-foreground" />}
        variant={executionRate >= 80 ? "success" : "default"}
      />
      
      <MetricWidget
        title="Execution Pace"
        value={`${executionPace}s`}
        description="Avg response time"
        change={-8}
        changeLabel="faster"
        icon={<Zap className="h-4 w-4 text-muted-foreground" />}
        variant={executionPace <= 60 ? "success" : "warning"}
      />
      
      <MetricWidget
        title="Total Watch Time"
        value={`${Math.floor(totalWatchTime / 60)}h ${totalWatchTime % 60}m`}
        description="Lifetime learning"
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  )
}