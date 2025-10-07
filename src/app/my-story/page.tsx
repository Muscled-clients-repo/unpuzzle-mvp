'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useRef, useState, useEffect } from 'react'

interface TimelineEvent {
  year: string
  label: string
  id: string
}

const timelineEvents: TimelineEvent[] = [
  { year: '2017', label: 'The Breaking Point', id: 'breaking-point' },
  { year: '2019', label: 'Valley of Darkness', id: 'valley' },
  { year: '2020', label: 'Survival Mode', id: 'survival' },
  { year: '2021', label: 'The Foundation', id: 'foundation' },
  { year: '2022', label: 'Obsessive Focus', id: 'reinvention' },
  { year: '2024', label: 'The Breakthrough', id: 'breakthrough' },
  { year: '2025', label: 'The Transformation', id: 'transformation' }
]

export default function MyStoryPage() {
  const [activeSection, setActiveSection] = useState('breaking-point')

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-sm bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white">
            Unpuzzle
          </Link>
          <Link
            href="/free-v3"
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Timeline Sidebar - Sticky on Desktop */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-32">
              <h2 className="text-2xl font-bold text-white mb-8">The Journey</h2>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700"></div>

                {timelineEvents.map((event, idx) => (
                  <button
                    key={event.id}
                    onClick={() => {
                      document.getElementById(event.id)?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className={`relative flex items-start mb-8 text-left transition-all duration-300 ${
                      activeSection === event.id ? 'opacity-100' : 'opacity-50 hover:opacity-75'
                    }`}
                  >
                    {/* Dot */}
                    <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      activeSection === event.id
                        ? 'bg-green-500 border-green-500 shadow-lg shadow-green-500/50'
                        : 'bg-slate-900 border-slate-600'
                    }`}>
                      {activeSection === event.id && (
                        <motion.div
                          layoutId="active-dot"
                          className="w-3 h-3 bg-white rounded-full"
                          transition={{ duration: 0.3 }}
                        />
                      )}
                    </div>

                    {/* Label */}
                    <div className="ml-4">
                      <div className={`text-sm font-bold transition-colors ${
                        activeSection === event.id ? 'text-white' : 'text-slate-400'
                      }`}>
                        {event.year}
                      </div>
                      <div className={`text-xs transition-colors ${
                        activeSection === event.id ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        {event.label}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Story Content */}
          <div className="lg:col-span-9">
            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-20"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
                My Story
              </h1>
              <p className="text-xl text-slate-400">
                From construction sites to $300K agencies. From -40°C door knocking to 80-90% profit margins.
              </p>
            </motion.div>

            {/* Story Sections */}
            <StorySection
              id="breaking-point"
              year="2017"
              title="The Breaking Point"
              content="In October 2017, everything changed. I was earning $50,000 USD as a civil engineer, but the reality was darker. My boss demanded 60+ hours of work, sometimes without pay. I faced racism in the construction sector. I fought back—hard. And they fired me for it. But here's the thing: I had already been planning my escape. I had saved $20,000 CAD and was four months away from quitting anyway. Getting fired just accelerated the inevitable. With my savings and $2,000/month from EI insurance for six months, I had my runway. It was now or never. I chose now."
              setActiveSection={setActiveSection}
            />

            <StorySection
              id="valley"
              year="2019"
              title="The Valley of Darkness"
              content="In 2016, while still working construction, I discovered dropshipping with Shopify and AliExpress. I studied it obsessively—before work, after work, during work. By 2017, I was building stores. None of them clicked. Month after month, failure after failure. Then, January 2019 happened. One store finally broke through. $17,000 in 20 days. I thought I had made it. But PayPal held my funds. My supplier scammed me. And just like that, I was back to zero. My savings? Gone. My EI insurance? Dried up. My last lifeline? Cut. Then COVID-19 hit. I was truly screwed."
              setActiveSection={setActiveSection}
            />

            <StorySection
              id="survival"
              year="2020"
              title="Survival Mode: -40°C and Door Knocking"
              content="I took a door-to-door sales job in Calgary, selling fiber optic installations for Telus. The training in Burnaby, BC was pleasant enough. But Calgary? That was a different beast. Imagine this: -40°C winters. Double-layered socks. Arcteryx jacket. Winter boots. And me, knocking on doors, begging people to let me inside—not just to sell them fiber optics, but to escape the brutal cold even for a few minutes. I did that for six months. And I was still trying to make dropshipping work on the side. It didn't. I moved back to my parents' house. I quit the sales job. And I decided to pivot—again."
              setActiveSection={setActiveSection}
            />

            <StorySection
              id="foundation"
              year="2021"
              title="The Foundation: Niagara Falls"
              content="With the COVID loan, I did something bold: I bought a house in Niagara Falls for $520,000. I moved in alone. No distractions. No excuses. It was time to build a real business with real employees. I hired two people. They were terrible at Figma, coding, and English. But they were dedicated. We learned together. Project by project, we improved. I found a mentor who taught me how to win on Upwork. Everything changed. By April 2021, I was making $5,000/month in revenue with $2,000-$3,000 in profit. By the end of 2021, two big clients paid me $30,000 in two months. I sold the house in February 2022 for a $220,000 profit—right before the crash. It was the best decision I ever made."
              setActiveSection={setActiveSection}
            />

            <StorySection
              id="reinvention"
              year="2022"
              title="The Reinvention: Obsessive Client Satisfaction"
              content="With $220,000 in my pocket, I finally had breathing room. But I also made mistakes. I lost $100,000 in crypto. I spent another $60,000-$80,000 experimenting with contractors and employees. In September 2022, I made a decision that would define my business: I would take any client, for any price, and do whatever it took to make them happy. One project paid me $700 and took six months to complete. I lost money. I didn't care. The client had to be happy. By early 2023, I was making $10,000/month consistently. By the end of 2023, I had earned $120,000 USD with $40,000-$60,000 in profit."
              setActiveSection={setActiveSection}
            />

            <StorySection
              id="breakthrough"
              year="2024"
              title="The Breakthrough: $300K and 80-90% Margins"
              content="2024 was the year everything solidified. I took my best clients from 2023 and went all-in. I scaled my team to 25 full-time employees at one point, paying them $4,000-$6,000/month total. By the end of 2024, I had made $300,000 USD. That's $50,000-$72,000 in expenses for $300,000 in revenue—75-84% profit margins. To cut costs even further, I moved to Morocco and bought a fully paid apartment. My monthly expenses dropped to $1,000-$1,500. In 2023, I got married. By January 2025, I had a wife and daughter to take care of. That apartment wasn't just a financial decision—it was security for my family."
              setActiveSection={setActiveSection}
            />

            <StorySection
              id="transformation"
              year="2025"
              title="The Transformation: Becoming the Coder"
              content="In April 2025, my Upwork profile took a hit. Messages from potential clients dried up. I could have panicked. Instead, I pivoted—again. I discovered Claude Code AI. And everything changed. From 2020 to 2025, I hadn't written a single line of code—my team did it all. But Claude Code was different. With Claude Code, I became addicted. I worked 12-16 hours a day, building, failing, learning. I became the best coder on my team. Today, I'm balancing two worlds. I still service 3-5 agency clients every month. But the last six months have been about building SaaS products. My goal is to hire a CEO to run Muscled Digital Agency while I fuel its portfolio with my SaaS ventures. The journey never ends. The learning never stops. The hustle never quits."
              setActiveSection={setActiveSection}
            />

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-20 text-center py-16 border-t border-slate-800"
            >
              <h2 className="text-3xl font-bold text-white mb-6">
                Ready to Build Your Own Story?
              </h2>
              <p className="text-xl text-slate-400 mb-8">
                Learn the exact system I used to go from zero to $300K/year.
              </p>
              <Link
                href="/free-v3"
                className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-12 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-[1.02]"
              >
                START FREE →
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface StorySectionProps {
  id: string
  year: string
  title: string
  content: string
  setActiveSection: (id: string) => void
}

function StorySection({ id, year, title, content, setActiveSection }: StorySectionProps) {
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.5", "end 0.5"]
  })

  useEffect(() => {
    return scrollYProgress.on('change', (latest) => {
      if (latest > 0.1 && latest < 0.9) {
        setActiveSection(id)
      }
    })
  }, [scrollYProgress, id, setActiveSection])

  const words = content.split(' ')

  return (
    <section ref={sectionRef} id={id} className="mb-24 scroll-mt-32">
      <div className="mb-8">
        <div className="text-green-500 font-bold text-sm mb-2">{year}</div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white">{title}</h2>
      </div>

      <div className="text-xl sm:text-2xl text-slate-300 leading-relaxed">
        {words.map((word, idx) => {
          const wordProgress = idx / words.length

          const blur = useTransform(
            scrollYProgress,
            [Math.max(0, wordProgress - 0.1), Math.min(1, wordProgress + 0.1)],
            [10, 0]
          )
          const opacity = useTransform(
            scrollYProgress,
            [Math.max(0, wordProgress - 0.1), Math.min(1, wordProgress + 0.1)],
            [0.3, 1]
          )

          return (
            <motion.span
              key={idx}
              style={{
                filter: useTransform(blur, (val) => `blur(${val}px)`),
                opacity: opacity
              }}
              className="inline-block mr-[0.3em]"
            >
              {word}
            </motion.span>
          )
        })}
      </div>
    </section>
  )
}
