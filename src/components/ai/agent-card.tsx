import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, CheckCircle2, MessageSquare, Route, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface AgentCardProps {
  type: "hint" | "check" | "reflect" | "path"
  title: string
  description: string
  content?: string
  actionLabel?: string
  onAction?: () => void
  isActive?: boolean
  badge?: string
}

const agentConfig = {
  hint: {
    icon: Lightbulb,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
  },
  check: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  reflect: {
    icon: MessageSquare,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  path: {
    icon: Route,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
}

export function AgentCard({
  type,
  title,
  description,
  content,
  actionLabel,
  onAction,
  isActive = false,
  badge,
}: AgentCardProps) {
  const config = agentConfig[type]
  const Icon = config.icon

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all",
        isActive && "ring-2 ring-primary",
        config.borderColor
      )}
    >
      {badge && (
        <Badge className="absolute right-2 top-2" variant="secondary">
          {badge}
        </Badge>
      )}
      
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className={cn("rounded-lg p-2", config.bgColor)}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {(content || actionLabel) && (
        <CardContent>
          {content && (
            <div className="mb-4 rounded-lg bg-muted p-3">
              <p className="text-sm">{content}</p>
            </div>
          )}
          
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              className="w-full"
              variant={isActive ? "default" : "outline"}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {actionLabel}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}