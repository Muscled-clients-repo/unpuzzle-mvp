"use client"

import { useState } from "react"
import { QuizResultData } from "@/lib/video-agent-system/types/states"
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuizResultBoxProps {
  quizResult: QuizResultData
}

export function QuizResultBox({ quizResult }: QuizResultBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const { score, total, percentage, questions } = quizResult
  
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden bg-secondary/10">
      {/* Collapsed view - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-secondary/20 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Trophy className={cn(
            "h-4 w-4",
            percentage >= 80 ? "text-green-600" : percentage >= 60 ? "text-yellow-600" : "text-orange-600"
          )} />
          <span className="text-sm font-medium">
            Quiz Complete • Score: {score}/{total} ({percentage}%)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      {/* Expanded view - questions and answers */}
      {isExpanded && (
        <div className="border-t border-border/50 p-3 space-y-3">
          {questions.map((q, idx) => (
            <div key={q.questionId} className="space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground mt-0.5">
                  Q{idx + 1}.
                </span>
                <div className="flex-1 space-y-1">
                  <p className="text-sm">{q.question}</p>
                  
                  <div className="flex items-center gap-2">
                    {q.isCorrect ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span className={cn(
                      "text-xs",
                      q.isCorrect ? "text-green-600" : "text-red-600"
                    )}>
                      Your answer: {q.options[q.userAnswer]}
                    </span>
                  </div>
                  
                  {!q.isCorrect && (
                    <div className="text-xs text-muted-foreground">
                      Correct: {q.options[q.correctAnswer]}
                    </div>
                  )}
                  
                  {!q.isCorrect && q.explanation && (
                    <div className="text-xs text-muted-foreground mt-1 pl-2 border-l-2 border-border/50">
                      {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}