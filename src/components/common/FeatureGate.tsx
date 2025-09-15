interface FeatureGateProps {
  role: string
  feature: string
  children: React.ReactNode
}

export function FeatureGate({ role, feature, children }: FeatureGateProps) {
  // For now, allow all features for students
  // This can be expanded later with proper feature gating logic
  if (role === 'student' || role === 'learner') {
    return <>{children}</>
  }
  
  return null
}