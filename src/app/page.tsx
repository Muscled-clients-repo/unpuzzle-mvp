import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { AICourseCard } from "@/components/course/ai-course-card"
import { MetricWidget } from "@/components/dashboard/metrics-widget"
import { AgentCard } from "@/components/ai/agent-card"
import { mockCourses } from "@/data/mock"
import { ArrowRight, Sparkles, Brain, Target, TrendingUp } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted py-20">
          <div className="container px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-6 text-5xl font-bold tracking-tight">
                Learn Faster with{" "}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI-Powered
                </span>{" "}
                Learning
              </h1>
              <p className="mb-8 text-xl text-muted-foreground">
                The only platform that measures how you learn, not just what you watch. 
                Get contextual hints, personalized quizzes, and adaptive learning paths.
              </p>
              <div className="flex justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/courses">
                    Browse Courses
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/signup">Start Free Trial</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              AI Agents That Accelerate Your Learning
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <AgentCard
                type="hint"
                title="Puzzle Hint"
                description="Get contextual hints when you're stuck"
                content="Automatically detects confusion and offers help based on video context"
                actionLabel="Learn More"
              />
              <AgentCard
                type="check"
                title="Puzzle Check"
                description="Test your understanding"
                content="Context-aware quizzes at key learning moments"
                actionLabel="Learn More"
              />
              <AgentCard
                type="reflect"
                title="Puzzle Reflect"
                description="Deepen your learning"
                content="Guided reflection prompts with instructor feedback"
                actionLabel="Learn More"
              />
              <AgentCard
                type="path"
                title="Puzzle Path"
                description="Personalized learning"
                content="Dynamic content injection based on your pace"
                actionLabel="Learn More"
              />
            </div>
          </div>
        </section>

        <section className="bg-muted py-16">
          <div className="container px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Track Your Learning Progress
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricWidget
                title="Learn Rate"
                value="35 min/hr"
                description="Active learning time"
                icon={<Brain className="h-4 w-4 text-muted-foreground" />}
                change={15}
                variant="success"
              />
              <MetricWidget
                title="Execution Rate"
                value="85%"
                description="Activities completed"
                icon={<Target className="h-4 w-4 text-muted-foreground" />}
                progress={85}
                variant="success"
              />
              <MetricWidget
                title="Execution Pace"
                value="45s"
                description="Response time"
                icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                change={-12}
                variant="success"
              />
              <MetricWidget
                title="AI Interactions"
                value="7/10"
                description="Free tier usage"
                icon={<Sparkles className="h-4 w-4 text-muted-foreground" />}
                progress={70}
                progressLabel="Upgrade for unlimited"
              />
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container px-4">
            <div className="mb-8 text-center">
              <h2 className="mb-4 text-3xl font-bold">AI-Enhanced Course Experience</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                See how our AI adapts to different learning scenarios and provides personalized insights
              </p>
            </div>
            
            {/* Three AI Course Card Variants */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Version 1: High-performing Enrolled Student */}
              <AICourseCard 
                course={mockCourses[0]} 
                variant="enrolled"
                progress={75}
                aiMetrics={{
                  learnRate: 48,
                  strugglingTopics: [],
                  predictedCompletion: "1 week",
                  aiInteractionsUsed: 8
                }}
              />
              
              {/* Version 2: Struggling Student */}
              <AICourseCard 
                course={mockCourses[1]} 
                variant="enrolled"
                progress={25}
                aiMetrics={{
                  learnRate: 18,
                  strugglingTopics: ["Linear Regression", "NumPy Arrays"],
                  predictedCompletion: "6 weeks",
                  aiInteractionsUsed: 23
                }}
              />
              
              {/* Version 3: New Student Preview with AI Quiz */}
              <AICourseCard 
                course={{
                  ...mockCourses[0],
                  title: "React for Beginners",
                  description: "Master React fundamentals with AI-guided learning paths and interactive challenges.",
                  price: 99,
                  students: 5432,
                  rating: 4.9
                }}
                showAIQuiz={true}
              />
            </div>
            
            <div className="mt-8 text-center">
              <Button asChild>
                <Link href="/courses">
                  Explore All AI-Enhanced Courses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-primary py-16 text-primary-foreground">
          <div className="container px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold">
              Ready to Transform Your Learning?
            </h2>
            <p className="mb-8 text-xl opacity-90">
              Join thousands of learners accelerating their education with AI
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/signup">Start Learning Today</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/instructors">Become an Instructor</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}