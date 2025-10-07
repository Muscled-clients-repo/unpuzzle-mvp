'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { StickyCTAButton } from '@/components/landing/StickyCTAButton'
import { SignupModal } from '@/components/landing/SignupModal'

export default function FreePage() {
  const [hoveredCard, setHoveredCard] = useState<'agency' | 'saas' | null>(null)
  const [showMoreAgency, setShowMoreAgency] = useState(false)
  const [showMoreSaas, setShowMoreSaas] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false)

  // Placeholder images - iPhone screenshot dimensions (390x844)
  const proofImages = Array.from({ length: 18 }, (_, i) => ({
    id: i + 1,
    src: `https://placehold.co/390x844/1e293b/cbd5e1?text=Proof+${i + 1}`,
    alt: `Proof screenshot ${i + 1}`
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 overflow-hidden">
      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-white">Unpuzzle</div>
          <Link
            href="/login"
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Already a member? →
          </Link>
        </div>
      </nav>

      {/* Hero Section - 3 Column Layout */}
      <section className="relative min-h-screen flex items-center justify-center py-16">
        <div className="max-w-7xl mx-auto px-4 w-full">
          <div className="grid grid-cols-12 gap-8 items-center">

            {/* Left Column - Scrolling Screenshots */}
            <div className="col-span-3 hidden lg:block">
              <div className="h-[600px] overflow-hidden relative">
                {/* Gradient fade top */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-950 to-transparent z-10"></div>

                <div className="scroll-up-slow">
                  <div className="flex flex-col gap-6">
                    {/* Duplicate for seamless loop */}
                    {[...proofImages.slice(0, 6), ...proofImages.slice(0, 6), ...proofImages.slice(0, 6)].map((img, idx) => (
                      <div key={idx} className="flex-shrink-0">
                        <div className="w-full aspect-[9/19.5] bg-slate-800/50 rounded-3xl overflow-hidden border-2 border-slate-700/50 shadow-2xl hover:scale-105 transition-transform duration-300">
                          <img
                            src={img.src}
                            alt={img.alt}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gradient fade bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950 to-transparent z-10"></div>
              </div>
            </div>

            {/* Center Column - Hero Copy */}
            <div className="col-span-12 lg:col-span-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center"
              >
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black leading-tight mb-6">
                  <span className="block text-white">I Made $500K in 2 Years</span>
                  <span className="block text-white">With My Software Agency.</span>
                  <span className="block bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mt-2">
                    Now Launching SaaS to Sell for Millions.
                  </span>
                  <span className="block text-white">Copy My System.</span>
                </h1>

                <div className="text-lg sm:text-xl lg:text-2xl text-slate-300 mt-8 mb-12">
                  <p>Skills → Service → Agency → SaaS.</p>
                </div>

                <motion.button
                  onClick={() => setIsSignupModalOpen(true)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-5 px-12 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-[1.02]"
                >
                  START FREE →
                </motion.button>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-slate-400 mt-6 text-sm"
                >
                  No credit card • 10 FREE AI coaching sessions
                </motion.p>
              </motion.div>
            </div>

            {/* Right Column - Scrolling Screenshots (faster) */}
            <div className="col-span-3 hidden lg:block">
              <div className="h-[600px] overflow-hidden relative">
                {/* Gradient fade top */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-950 to-transparent z-10"></div>

                <div className="scroll-up-fast">
                  <div className="flex flex-col gap-6">
                    {/* Duplicate for seamless loop */}
                    {[...proofImages.slice(12, 18), ...proofImages.slice(12, 18), ...proofImages.slice(12, 18)].map((img, idx) => (
                      <div key={idx} className="flex-shrink-0">
                        <div className="w-full aspect-[9/19.5] bg-slate-800/50 rounded-3xl overflow-hidden border-2 border-slate-700/50 shadow-2xl hover:scale-105 transition-transform duration-300">
                          <img
                            src={img.src}
                            alt={img.alt}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gradient fade bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950 to-transparent z-10"></div>
              </div>
            </div>

          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* Platform Video Section */}
      <VideoSection />

      {/* Logo Slider Section */}
      <LogoSliderSection />

      {/* About Section - Scroll Controlled Word Reveal */}
      <AboutSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Choose Your Path Section */}
      <ChoosePathSection
        hoveredCard={hoveredCard}
        setHoveredCard={setHoveredCard}
        showMoreAgency={showMoreAgency}
        setShowMoreAgency={setShowMoreAgency}
        showMoreSaas={showMoreSaas}
        setShowMoreSaas={setShowMoreSaas}
      />

      {/* FAQ Section */}
      <FAQSection openFaq={openFaq} setOpenFaq={setOpenFaq} />

      <style jsx>{`
        @keyframes scrollUp {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-33.333%);
          }
        }

        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }

        .scroll-up-slow {
          animation: scrollUp 30s linear infinite;
        }

        .scroll-up-fast {
          animation: scrollUp 20s linear infinite;
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      {/* Sticky CTA Button */}
      <StickyCTAButton onCTAClick={() => setIsSignupModalOpen(true)} />

      {/* Signup Modal */}
      <SignupModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
      />
    </div>
  )
}

function FAQSection({ openFaq, setOpenFaq }: { openFaq: number | null, setOpenFaq: (index: number | null) => void }) {
  const faqs = [
    {
      question: "Is this really free?",
      answer: "Yes, completely free. No credit card required. You get 10 FREE AI coaching sessions to start. We believe in providing value first and building trust."
    },
    {
      question: "What's the difference between Agency Track and SaaS Track?",
      answer: "Agency Track is for people starting from zero - you'll learn skills, get clients, and build capital. SaaS Track is for those with coding skills or capital to hire developers - you jump straight into building products. Most people start with Agency to fund their SaaS journey."
    },
    {
      question: "Can I switch between tracks?",
      answer: "Absolutely. You can switch anytime. Many students start with Agency Track to build income, then transition to SaaS Track once they have capital and experience."
    },
    {
      question: "How much time do I need to commit?",
      answer: "It depends on your goals. For Agency Track, expect 2-4 hours daily for 6-12 months to hit $5K/month. For SaaS Track, I personally coded 12-16 hours/day for 6 months to build 3 apps. You can go slower, but intensity = speed."
    },
    {
      question: "Do I need coding experience?",
      answer: "For Agency Track: No. I'll teach you everything from scratch. For SaaS Track: Either learn to code (I'll show you how with Claude Code AI) or have capital to hire overseas developers ($100-300/month per person)."
    },
    {
      question: "Will I see other students' progress?",
      answer: "Yes. Each track has a private community feed. Agency Track members only see agency wins. SaaS Track members only see product launches. This keeps your feed focused and relevant."
    },
    {
      question: "How is this different from other courses?",
      answer: "I'm not selling theory. I built a $300K/year agency and I'm actively launching SaaS products. You get access to my real Upwork conversations, sales calls, client projects, code, and daily feedback from me and my team. This is my actual playbook."
    },
    {
      question: "What if I get stuck?",
      answer: "You get daily check-ins with me and my team through looms, voice memos, AI conversations, quizzes, and community support. I built this because I wished someone showed me this path 8 years ago."
    }
  ]

  return (
    <section className="relative py-24 bg-slate-950">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-slate-400">
            Everything you need to know before starting
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 text-left hover:border-green-500/50 transition-all duration-300"
              >
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-lg font-semibold text-white pr-8">
                    {faq.question}
                  </h3>
                  <motion.div
                    animate={{ rotate: openFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0"
                  >
                    <svg
                      className="w-6 h-6 text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </motion.div>
                </div>

                {openFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 text-slate-300 leading-relaxed"
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ChoosePathSection({
  hoveredCard,
  setHoveredCard,
  showMoreAgency,
  setShowMoreAgency,
  showMoreSaas,
  setShowMoreSaas
}: {
  hoveredCard: 'agency' | 'saas' | null
  setHoveredCard: (card: 'agency' | 'saas' | null) => void
  showMoreAgency: boolean
  setShowMoreAgency: (show: boolean) => void
  showMoreSaas: boolean
  setShowMoreSaas: (show: boolean) => void
}) {
  return (
    <section className="relative py-24 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Choose Your Path to $300K+
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Both paths work. The difference? Agency builds capital while learning. SaaS moves faster if you have skills or money.
          </p>
        </motion.div>

        {/* Track Picker Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto mb-16"
        >
          {/* Agency Track Card */}
          <motion.div
            onHoverStart={() => setHoveredCard('agency')}
            onHoverEnd={() => setHoveredCard(null)}
            whileHover={{ y: -8, rotateY: 2 }}
            transition={{ duration: 0.3 }}
            className="relative group"
          >
            {/* Glow effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-300"></div>

            {/* Card */}
            <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 h-full hover:border-green-500/50 transition-all duration-300">
              <h3 className="text-3xl font-bold text-white mb-4">AGENCY TRACK</h3>
              <p className="text-xl text-slate-300 mb-6 font-medium">
                Learn how I hit<br />$30-40K months
              </p>

              <ul className="space-y-3 mb-6 text-slate-300 text-sm">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Learn the following skills: Figma Design, Design and Dev Lingo for sales calls, HTML, CSS, JS, React, Next.js, Full Stack Development, Web App and Shopify App Development</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>How I earned $300K+ earned on Upwork + $200K outside = $500K in ~2 years (USD)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>200+ Upwork conversations + 50+ sales calls (full access to everything)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Hiring and Training: $100 to $300/mo salaried employees that generate 80-90% profit margins on $10k - $50k monthly revenues</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Overseas hiring guide: LinkedIn Job Posts → Interview → Quality checks → Hiring and Skill Development</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Dozens of reusable design sections and code patterns to service clients fast and code solutions quickly</span>
                </li>

                {/* Hidden items - show on expand */}
                {showMoreAgency && (
                  <>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span>Build Your Own Assets: Use employees' spare time to create reusable design and code libraries for future client use or your own SaaS projects</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span>Introduction to Building Your Own SaaS - your own Shopify apps or web apps or mobile apps to take things to the next level</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span>Private mentorship from me and my team with daily checkins and evaluations of your output - looms, voice memos, questions, quizzes, and AI conversations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span className="font-semibold">Private agency-only community feed - see other freelancers' progress, no SaaS noise</span>
                    </li>
                  </>
                )}
              </ul>

              {/* Show More/Less Button */}
              <button
                onClick={() => setShowMoreAgency(!showMoreAgency)}
                className="text-green-400 text-sm font-medium hover:text-green-300 transition-colors mb-6"
              >
                {showMoreAgency ? '- Show Less' : '+ Show 4 More'}
              </button>

              <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-[1.02]">
                START FREE →
              </button>
            </div>
          </motion.div>

          {/* SaaS Track Card */}
          <motion.div
            onHoverStart={() => setHoveredCard('saas')}
            onHoverEnd={() => setHoveredCard(null)}
            whileHover={{ y: -8, rotateY: -2 }}
            transition={{ duration: 0.3 }}
            className="relative group"
          >
            {/* Glow effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-300"></div>

            {/* Card */}
            <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 h-full hover:border-blue-500/50 transition-all duration-300">
              <h3 className="text-3xl font-bold text-white mb-4">SAAS TRACK</h3>
              <p className="text-xl text-slate-300 mb-6 font-medium">
                Turn client knowledge<br />into products
              </p>

              <ul className="space-y-3 mb-6 text-slate-300 text-sm">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">✓</span>
                  <span>3 apps launching now: Build It ASAP (1 week build), Unpuzzle (2 months), Sektions (12 months) → $0 to $1K MRR each</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">✓</span>
                  <span>Tech stack: Supabase, PostgreSQL, WebSockets, Zustand, TanStack, role-based auth, Backblaze/Cloudflare $0 egress</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">✓</span>
                  <span>Shopify app dev: ngrok, partner account, project setup, finding gaps from 200+ client insights</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">✓</span>
                  <span>Expanding code patterns library across apps (reuse features = 10x speed)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">✓</span>
                  <span>Treat SaaS users like agency clients (how I got Top Rated Plus for 2+ years)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">✓</span>
                  <span>0 → revenue: 3-8 posts/day, blog/SEO SaaS, Discord, FB ads, influencer campaigns</span>
                </li>

                {/* Hidden items - show on expand */}
                {showMoreSaas && (
                  <>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">✓</span>
                      <span>Double down on what works, kill what doesn't (watch my testing framework)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">✓</span>
                      <span>Learn complex apps Lovable/Bolt can't build (these 3 apps prove it)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">✓</span>
                      <span className="font-semibold">Private SaaS-only community feed - see other builders' launches, no agency noise</span>
                    </li>
                  </>
                )}
              </ul>

              {/* Show More/Less Button */}
              <button
                onClick={() => setShowMoreSaas(!showMoreSaas)}
                className="text-blue-400 text-sm font-medium hover:text-blue-300 transition-colors mb-6"
              >
                {showMoreSaas ? '- Show Less' : '+ Show 3 More'}
              </button>

              <button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-[1.02]">
                START FREE →
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Section - Can't Decide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Can't Decide?</h3>
            <div className="text-slate-300 space-y-3 text-lg">
              <p>Most people start with <span className="text-green-400 font-semibold">Agency Track</span> to build capital while learning, then transition to <span className="text-blue-400 font-semibold">SaaS Track</span>.</p>
              <p>You can switch tracks anytime. Both communities get full access to me and my team.</p>
              <p className="text-slate-400 text-base mt-6">
                <span className="text-green-400">Agency =</span> Safer path, learn while earning<br />
                <span className="text-blue-400">SaaS =</span> Faster growth if you have skills or capital
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  const testimonials = [
    {
      id: 1,
      name: "Client Name 1",
      company: "Company Name",
      role: "CEO",
      videoUrl: "VIDEO_URL_1", // Replace with actual video URL
      thumbnail: "https://placehold.co/640x360/1e293b/cbd5e1?text=Testimonial+1"
    },
    {
      id: 2,
      name: "Client Name 2",
      company: "Company Name",
      role: "CTO",
      videoUrl: "VIDEO_URL_2",
      thumbnail: "https://placehold.co/640x360/1e293b/cbd5e1?text=Testimonial+2"
    },
    {
      id: 3,
      name: "Client Name 3",
      company: "Company Name",
      role: "Founder",
      videoUrl: "VIDEO_URL_3",
      thumbnail: "https://placehold.co/640x360/1e293b/cbd5e1?text=Testimonial+3"
    },
    {
      id: 4,
      name: "Client Name 4",
      company: "Company Name",
      role: "Product Manager",
      videoUrl: "VIDEO_URL_4",
      thumbnail: "https://placehold.co/640x360/1e293b/cbd5e1?text=Testimonial+4"
    },
    {
      id: 5,
      name: "Client Name 5",
      company: "Company Name",
      role: "Director",
      videoUrl: "VIDEO_URL_5",
      thumbnail: "https://placehold.co/640x360/1e293b/cbd5e1?text=Testimonial+5"
    }
  ]

  return (
    <section className="relative py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            What My Agency Clients Say
          </h2>
          <p className="text-xl text-slate-400">
            Real results from real clients I've built for
          </p>
        </motion.div>

        {/* First row - 2 videos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {testimonials.slice(0, 2).map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group"
            >
              <div className="relative aspect-video bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl hover:border-green-500/50 transition-all duration-300">
                {/* Placeholder - replace with actual video */}
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <p className="text-slate-400 text-sm">Video Testimonial {testimonial.id}</p>
                  </div>
                </div>
                {/* Uncomment when you have video URLs */}
                {/* <video
                  className="w-full h-full object-cover"
                  controls
                  poster={testimonial.thumbnail}
                >
                  <source src={testimonial.videoUrl} type="video/mp4" />
                </video> */}
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-white">{testimonial.name}</h3>
                <p className="text-slate-400 text-sm">{testimonial.role} at {testimonial.company}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Second row - 3 videos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.slice(2, 5).map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group"
            >
              <div className="relative aspect-video bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl hover:border-green-500/50 transition-all duration-300">
                {/* Placeholder - replace with actual video */}
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <p className="text-slate-400 text-sm">Video Testimonial {testimonial.id}</p>
                  </div>
                </div>
                {/* Uncomment when you have video URLs */}
                {/* <video
                  className="w-full h-full object-cover"
                  controls
                  poster={testimonial.thumbnail}
                >
                  <source src={testimonial.videoUrl} type="video/mp4" />
                </video> */}
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-white">{testimonial.name}</h3>
                <p className="text-slate-400 text-sm">{testimonial.role} at {testimonial.company}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function VideoSection() {
  return (
    <section className="relative py-24 bg-slate-950">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            See How Unpuzzle Works
          </h2>
          <p className="text-xl text-slate-400">
            AI-powered coaching that adapts to your goals and learning style
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          {/* Video container */}
          <div className="relative aspect-video bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
            {/* Placeholder - replace with actual video */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50">
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <p className="text-slate-400">Platform demo video</p>
                <p className="text-slate-500 text-sm mt-2">Replace with actual video URL</p>
              </div>
            </div>

            {/* Uncomment when you have the video URL */}
            {/* <video
              className="w-full h-full object-cover"
              controls
              poster="https://placehold.co/1280x720/1e293b/cbd5e1?text=Platform+Demo"
            >
              <source src="YOUR_VIDEO_URL_HERE" type="video/mp4" />
            </video> */}
          </div>

          {/* Feature highlights below video */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
          >
            <div className="text-center">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-lg font-semibold text-white mb-2">Goal-Based Learning</h3>
              <p className="text-slate-400 text-sm">AI creates custom courses based on your specific goals</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Video Chat</h3>
              <p className="text-slate-400 text-sm">Send transcripts to AI, discuss key points, take quizzes</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-white mb-2">Track Progress</h3>
              <p className="text-slate-400 text-sm">Reflections, milestones, and personalized feedback</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

function LogoSliderSection() {
  // Placeholder logos - replace with actual client logos
  const logos = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `Client ${i + 1}`,
    src: `https://placehold.co/200x80/334155/94a3b8?text=Client+${i + 1}`
  }))

  return (
    <section className="relative py-16 bg-slate-900 border-y border-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-2xl font-bold text-white mb-4"
        >
          Trusted by 200+ Clients
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center text-slate-400 mb-12"
        >
          From startups to enterprises, here's who I've built for
        </motion.p>

        {/* Marquee container */}
        <div className="relative overflow-hidden">
          {/* Gradient fade left */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-900 to-transparent z-10"></div>

          {/* Gradient fade right */}
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-900 to-transparent z-10"></div>

          {/* Scrolling logos */}
          <div className="logo-marquee flex gap-12 items-center">
            {/* First set */}
            {logos.map((logo) => (
              <div
                key={`first-${logo.id}`}
                className="flex-shrink-0 grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
              >
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="h-12 w-auto object-contain"
                />
              </div>
            ))}
            {/* Duplicate for seamless loop */}
            {logos.map((logo) => (
              <div
                key={`second-${logo.id}`}
                className="flex-shrink-0 grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
              >
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="h-12 w-auto object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .logo-marquee {
          animation: marquee 40s linear infinite;
        }

        .logo-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  )
}

function AboutSection() {
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 1.2", "end 0.4"]
  })

  const sentences = [
    "I was a civil engineer earning $50K, working 60+ hours a week. In October 2017, they fired me for fighting back against racism. I had $20K in savings and a dream to build tech.",
    "I tried dropshipping. Failed. Lost everything. Then COVID hit and I was truly screwed.",
    "I took a door-to-door sales job in Calgary—knocking on doors in -40°C weather, begging people to let me inside just to escape the cold. I did that for 6 months while trying to make anything work online.",
    "Finally, I pivoted to Upwork. Started arbitraging—close deals for $500, hire contractors for $50. Margins were thin, but I was learning.",
    "In 2022, I made a decision that changed everything: I'd take any client, for any price, and do whatever it took to make them happy. A $700 project took me 6 months to complete. I lost money. But the client was happy.",
    "That obsession with client satisfaction got me to $10K/month by early 2023. Then $20K. Then $40K.",
    "By the end of 2024, I had made $300,000 USD with 80-90% profit margins. I scaled to 25 employees paying them $4K-$6K total per month. I moved to Morocco and bought a fully paid apartment. I got married and had a daughter.",
    "Three years ago, I was desperate. Today, I cherry-pick projects and run 90% margins.",
    "The difference? I stopped trading time for money and started building systems.",
    "If I can go from construction sites and -40°C door knocking to a $300K agency, you can do this from your laptop."
  ]

  // Calculate total words
  const allWords = sentences.flatMap(s => s.split(' '))
  const totalWords = allWords.length

  return (
    <section ref={sectionRef} className="relative py-24 bg-slate-950">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center text-xl sm:text-2xl leading-relaxed">
          {(() => {
            let globalWordIndex = 0

            return sentences.map((sentence, sentenceIdx) => {
              const words = sentence.split(' ')
              const isLastThree = sentenceIdx >= 7
              const isLastSentence = sentenceIdx === 9

              return (
                <p key={sentenceIdx} className={`mb-4 ${isLastThree ? 'font-semibold text-white' : ''} ${isLastSentence ? 'text-2xl' : ''}`}>
                  {words.map((word, wordIdx) => {
                    const currentGlobalIndex = globalWordIndex++
                    const wordProgress = currentGlobalIndex / totalWords

                    // Each word reveals based on scroll progress
                    const blur = useTransform(
                      scrollYProgress,
                      [wordProgress - 0.1, wordProgress + 0.1],
                      [10, 0]
                    )
                    const opacity = useTransform(
                      scrollYProgress,
                      [wordProgress - 0.1, wordProgress + 0.1],
                      [0.3, 1]
                    )

                    return (
                      <motion.span
                        key={wordIdx}
                        style={{
                          filter: useTransform(blur, (val) => `blur(${val}px)`),
                          opacity: opacity
                        }}
                        className={`inline-block mr-[0.3em] ${
                          isLastSentence
                            ? 'bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent'
                            : isLastThree
                            ? 'text-white'
                            : 'text-slate-300'
                        }`}
                      >
                        {word}
                      </motion.span>
                    )
                  })}
                </p>
              )
            })
          })()}
        </div>
      </div>
    </section>
  )
}
