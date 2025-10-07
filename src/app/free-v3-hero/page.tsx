'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function FreeV3HeroPage() {
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
    </div>
  )
}
