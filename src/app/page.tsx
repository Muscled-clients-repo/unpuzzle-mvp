import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { AICourseCard } from "@/components/course/ai-course-card"
import { MetricWidget } from "@/components/dashboard/metrics-widget"
import { AgentCard } from "@/components/ai/agent-card"
import { mockCourses } from "@/data/mock"
import { ArrowRight, Sparkles, Brain, Target, TrendingUp, Check, Star } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 pt-16">
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
            
            {/* Three AI Course Card Variants - All using third card design */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Version 1: React Course */}
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
                showAITip={true}
              />
              
              {/* Version 2: Data Science Course */}
              <AICourseCard 
                course={{
                  ...mockCourses[1],
                  title: "Data Science Fundamentals",
                  description: "Learn data science with Python, AI-powered exercises, and personalized feedback.",
                  price: 129,
                  students: 3821,
                  rating: 4.8
                }}
                showAIQuiz={true}
                showAITip={true}
              />
              
              {/* Version 3: JavaScript Course */}
              <AICourseCard 
                course={{
                  ...mockCourses[0],
                  title: "JavaScript Mastery",
                  description: "From basics to advanced concepts with AI tutoring and adaptive learning paths.",
                  price: 89,
                  students: 7234,
                  rating: 4.7
                }}
                showAIQuiz={true}
                showAITip={true}
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

        {/* Pricing Section */}
        <section className="py-16 bg-gradient-to-b from-muted/50 to-background">
          <div className="container px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
                <Star className="h-4 w-4" />
                Founding Member Pricing - First 50 Students Only
              </div>
              <h2 className="text-3xl font-bold mb-4">Choose Your Learning Journey</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Start with our course or get the full AI-enhanced experience with personal instructor feedback
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Basic Tier */}
              <div className="relative p-6 bg-background border rounded-2xl shadow-sm">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">Course Access</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">$39</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Cancel anytime, no commitment</p>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Full video course access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Read community discussions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">10 AI explanations per day</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">View others&apos; confusions & insights</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Basic progress tracking</span>
                  </li>
                </ul>

                <Button className="w-full" variant="outline" asChild>
                  <a href="https://buy.stripe.com/test_your_basic_link" target="_blank" rel="noopener noreferrer">
                    Get Course Access
                  </a>
                </Button>
              </div>

              {/* Premium Tier */}
              <div className="relative p-6 bg-primary/5 border-2 border-primary rounded-2xl shadow-sm">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                    MOST POPULAR
                  </span>
                </div>
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">Full Learning Experience</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">$97</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Everything you need to accelerate learning</p>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Everything in Course Access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-semibold">Unlimited AI explanations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Post your confusions & reflections</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-semibold">Weekly instructor review of YOUR reflections</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-semibold">24hr response to confusions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Performance metrics & leaderboards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Verified completion certificate</span>
                  </li>
                </ul>

                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                    ⚡ First 50 members get lifetime 40% discount - Only {50 - 12} spots remaining
                  </p>
                </div>

                <Button className="w-full" asChild>
                  <a href="https://buy.stripe.com/test_your_premium_link" target="_blank" rel="noopener noreferrer">
                    Get Full Experience
                  </a>
                </Button>
              </div>
            </div>

            <div className="text-center mt-8">
              <p className="text-sm text-muted-foreground mb-4">
                🎁 <strong>Bonus:</strong> Try one complete lesson free before you buy
              </p>
              <Button variant="ghost" asChild>
                <Link href="/preview">
                  Watch Free Lesson <ArrowRight className="ml-2 h-4 w-4" />
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