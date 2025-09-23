import { Users, Zap, Target, Crown, ArrowRight, Check } from 'lucide-react'

export function JoinCommunitySection() {
  const benefits = [
    'Access to proven $500k+ strategies',
    'AI-powered development training',
    'Real client proposal templates',
    '1-on-1 sales call reviews',
    'Team building & hiring guides',
    'Weekly accountability sessions'
  ]

  const goalOptions = [
    {
      icon: '🛍️',
      title: 'Shopify Agency',
      description: 'Build apps & themes for clients',
      students: '1,234'
    },
    {
      icon: '🤖',
      title: 'AI Software Agency', 
      description: 'Full-stack apps with Claude Code',
      students: '856'
    },
    {
      icon: '💰',
      title: 'SaaS Builder',
      description: 'Launch your own software',
      students: '423'
    }
  ]

  return (
    <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-lg text-white overflow-hidden">
      {/* Header */}
      <div className="p-6 text-center">
        <div className="bg-white/20 backdrop-blur-sm rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Crown className="h-8 w-8" />
        </div>
        
        <h3 className="text-2xl font-bold mb-2">Join The Puzzle</h3>
        <p className="text-blue-100 mb-6">
          Where problems become profit and goals become reality
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold">2,847</div>
            <div className="text-xs text-blue-100">Active Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">$12.4M+</div>
            <div className="text-xs text-blue-100">Total Earned</div>
          </div>
        </div>
      </div>

      {/* Goal Selection */}
      <div className="px-6 mb-6">
        <h4 className="font-semibold mb-3">Choose Your Goal Track:</h4>
        <div className="space-y-3">
          {goalOptions.map((goal, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-3 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{goal.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{goal.title}</div>
                  <div className="text-sm text-blue-100">{goal.description}</div>
                </div>
                <div className="text-xs text-blue-200">{goal.students} students</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="px-6 mb-6">
        <h4 className="font-semibold mb-3">What You Get:</h4>
        <div className="space-y-2">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
              <span className="text-blue-100">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="p-6 pt-0">
        <button className="w-full bg-white text-blue-600 font-bold py-4 px-6 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 group">
          Start Your Puzzle Journey
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>
        
        <p className="text-xs text-blue-200 text-center mt-3">
          Join 2,847+ students building $500k+ agencies
        </p>
      </div>
    </div>
  )
}