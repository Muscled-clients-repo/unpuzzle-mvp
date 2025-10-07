'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useState, useEffect } from 'react'

interface StickyCTAButtonProps {
  onCTAClick: () => void
}

export function StickyCTAButton({ onCTAClick }: StickyCTAButtonProps) {
  const [isVisible, setIsVisible] = useState(false)
  const { scrollY } = useScroll()

  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling past 80vh (approximately past hero section)
      const shouldShow = window.scrollY > window.innerHeight * 0.8
      setIsVisible(shouldShow)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial state

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : 20
      }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-8 left-8 z-50"
      style={{
        pointerEvents: isVisible ? 'auto' : 'none'
      }}
    >
      <motion.button
        onClick={onCTAClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-8 rounded-xl font-semibold text-lg shadow-lg shadow-green-500/50 hover:shadow-xl hover:shadow-green-500/60 transition-all duration-300"
      >
        Get Free Course
      </motion.button>
    </motion.div>
  )
}
