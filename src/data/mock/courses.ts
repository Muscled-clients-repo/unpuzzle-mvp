export interface Course {
  id: string
  title: string
  description: string
  instructor: {
    name: string
    avatar: string
  }
  thumbnail: string
  price: number
  duration: string
  students: number
  rating: number
  level: "beginner" | "intermediate" | "advanced"
  category: string
  videos: Video[]
}

export interface Video {
  id: string
  title: string
  duration: string
  description: string
  thumbnailUrl: string
  videoUrl: string
  transcript?: string
  timestamps?: Timestamp[]
  quizPoints?: QuizPoint[]
}

export interface Timestamp {
  time: number
  label: string
  type: "chapter" | "concept" | "quiz"
}

export interface QuizPoint {
  time: number
  question: string
  options: string[]
  correctAnswer: number
}

export const mockCourses: Course[] = [
  {
    id: "course-1",
    title: "Shopify Freelancer on Upwork",
    description:
      "Master Shopify development and become a successful freelancer on Upwork. Learn to build custom themes, apps, and stores for clients worldwide.",
    instructor: {
      name: "Sarah Chen",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    },
    thumbnail: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80",
    price: 79,
    duration: "12 hours",
    students: 2543,
    rating: 4.8,
    level: "beginner",
    category: "Programming",
    videos: [
      {
        id: "1",
        title: "Getting Started on Upwork as Shopify Developer",
        duration: "15:30",
        description: "Introduction to freelancing on Upwork and Shopify opportunities",
        thumbnailUrl: "/video-thumbs/intro.jpg",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        transcript: `<p class="mb-4"><span class="text-muted-foreground text-xs">[00:00]</span> Welcome to this comprehensive introduction to web development. In this course, we're going to explore the fundamental technologies that power the modern web.</p>
        <p class="mb-4"><span class="text-muted-foreground text-xs">[00:15]</span> We'll start with HTML, which stands for HyperText Markup Language. HTML is the backbone of every webpage and provides the structure and content that browsers can understand and display to users.</p>
        <p class="mb-4"><span class="text-muted-foreground text-xs">[00:35]</span> Next, we'll dive into CSS, or Cascading Style Sheets. CSS is what makes websites look beautiful and engaging. It controls colors, fonts, layouts, animations, and responsive design across different devices.</p>
        <p class="mb-4"><span class="text-muted-foreground text-xs">[01:00]</span> Finally, we'll explore JavaScript, the programming language that brings interactivity to web pages. JavaScript allows us to create dynamic user experiences, handle user input, and communicate with servers.</p>
        <p class="mb-4"><span class="text-muted-foreground text-xs">[01:25]</span> Throughout this course, you'll build several projects that demonstrate these concepts in action. By the end, you'll have the skills needed to create your own websites from scratch.</p>
        <p class="mb-4"><span class="text-muted-foreground text-xs">[01:45]</span> Let's begin our journey into web development. Remember, the key to mastering these technologies is practice and patience. Don't be afraid to experiment and make mistakes - that's how we learn!</p>`,
        timestamps: [
          { time: 0, label: "Introduction", type: "chapter" },
          { time: 180, label: "Course Overview", type: "chapter" },
          { time: 600, label: "Prerequisites", type: "concept" },
        ],
        quizPoints: [
          {
            time: 300,
            question: "What are the three core technologies of web development?",
            options: ["HTML, CSS, JavaScript", "Python, Java, C++", "React, Vue, Angular", "PHP, MySQL, Apache"],
            correctAnswer: 0,
          },
        ],
      },
      {
        id: "2",
        title: "Setting Up Your Upwork Profile",
        duration: "45:00",
        description: "Create a winning Upwork profile that attracts Shopify clients",
        thumbnailUrl: "/video-thumbs/html.jpg",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        timestamps: [
          { time: 0, label: "HTML Basics", type: "chapter" },
          { time: 900, label: "Semantic HTML", type: "chapter" },
          { time: 1800, label: "Forms and Inputs", type: "concept" },
        ],
      },
      {
        id: "3",
        title: "Shopify Liquid Fundamentals",
        duration: "50:00",
        description: "Master Shopify's templating language for custom themes",
        thumbnailUrl: "/video-thumbs/css.jpg",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        timestamps: [
          { time: 0, label: "CSS Syntax", type: "chapter" },
          { time: 1200, label: "Flexbox Layout", type: "concept" },
          { time: 2400, label: "Grid System", type: "concept" },
        ],
      },
      {
        id: "4",
        title: "Building Custom Shopify Apps",
        duration: "60:00",
        description: "Develop Shopify apps that solve real client problems",
        thumbnailUrl: "/video-thumbs/js.jpg",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        timestamps: [
          { time: 0, label: "Variables and Types", type: "chapter" },
          { time: 1500, label: "Functions", type: "concept" },
          { time: 3000, label: "DOM Manipulation", type: "concept" },
        ],
      },
      {
        id: "5",
        title: "Landing Your First Upwork Client",
        duration: "90:00",
        description: "Complete strategy for winning your first Shopify project",
        thumbnailUrl: "/video-thumbs/project.jpg",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        timestamps: [
          { time: 0, label: "Project Setup", type: "chapter" },
          { time: 1800, label: "Building the Layout", type: "chapter" },
          { time: 3600, label: "Adding Interactivity", type: "chapter" },
          { time: 5000, label: "Deployment", type: "concept" },
        ],
      },
    ],
  },
  {
    id: "course-2",
    title: "Shopify Upwork Top Rated Plus",
    description:
      "Scale your Shopify freelance business to Top Rated Plus status. Advanced strategies for premium clients and higher rates.",
    instructor: {
      name: "Dr. James Miller",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    },
    thumbnail: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80",
    price: 129,
    duration: "20 hours",
    students: 1832,
    rating: 4.9,
    level: "intermediate",
    category: "Data Science",
    videos: [
      {
        id: "1",
        title: "Path to Top Rated Plus Badge",
        duration: "25:00",
        description: "Requirements and strategies for Upwork's highest tier",
        thumbnailUrl: "/video-thumbs/ml-intro.jpg",
        videoUrl: "https://sample-video.mp4",
        timestamps: [
          { time: 0, label: "What is ML?", type: "chapter" },
          { time: 600, label: "Types of Learning", type: "concept" },
          { time: 1200, label: "Real-world Applications", type: "chapter" },
        ],
        quizPoints: [
          {
            time: 800,
            question: "Which type of learning uses labeled data?",
            options: ["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning", "Transfer Learning"],
            correctAnswer: 0,
          },
        ],
      },
      {
        id: "2",
        title: "Premium Shopify Services",
        duration: "40:00",
        description: "High-value services that command premium rates",
        thumbnailUrl: "/video-thumbs/python-ds.jpg",
        videoUrl: "https://sample-video.mp4",
        timestamps: [
          { time: 0, label: "NumPy Basics", type: "chapter" },
          { time: 800, label: "Pandas DataFrames", type: "concept" },
          { time: 1600, label: "Matplotlib Visualization", type: "concept" },
        ],
      },
      {
        id: "3",
        title: "Linear Regression Deep Dive",
        duration: "55:00",
        description: "Understanding and implementing linear regression",
        thumbnailUrl: "/video-thumbs/linear-reg.jpg",
        videoUrl: "https://sample-video.mp4",
        timestamps: [
          { time: 0, label: "Theory Behind Linear Regression", type: "chapter" },
          { time: 1500, label: "Gradient Descent", type: "concept" },
          { time: 3000, label: "Implementation in Python", type: "chapter" },
        ],
      },
      {
        id: "4",
        title: "Classification Algorithms",
        duration: "65:00",
        description: "Logistic regression, decision trees, and more",
        thumbnailUrl: "/video-thumbs/classification.jpg",
        videoUrl: "https://sample-video.mp4",
        timestamps: [
          { time: 0, label: "Logistic Regression", type: "chapter" },
          { time: 1800, label: "Decision Trees", type: "chapter" },
          { time: 3600, label: "Model Evaluation", type: "concept" },
        ],
      },
      {
        id: "5",
        title: "Neural Networks Basics",
        duration: "70:00",
        description: "Introduction to deep learning and neural networks",
        thumbnailUrl: "/video-thumbs/neural-nets.jpg",
        videoUrl: "https://sample-video.mp4",
        timestamps: [
          { time: 0, label: "Perceptron Model", type: "chapter" },
          { time: 1200, label: "Backpropagation", type: "concept" },
          { time: 2400, label: "Building a Simple Network", type: "chapter" },
          { time: 3600, label: "Training and Testing", type: "concept" },
        ],
      },
    ],
  },
  {
    id: "course-3",
    title: "Vibe Coding Course",
    description:
      "Learn coding with good vibes and modern techniques. Build real projects while maintaining work-life balance and enjoying the process.",
    instructor: {
      name: "Emily Rodriguez",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
    },
    thumbnail: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&q=80",
    price: 99,
    duration: "15 hours",
    students: 3421,
    rating: 4.7,
    level: "beginner",
    category: "Marketing",
    videos: [
      {
        id: "1",
        title: "Coding with Good Vibes",
        duration: "20:00",
        description: "Setting up your mindset and environment for enjoyable coding",
        thumbnailUrl: "/video-thumbs/marketing-intro.jpg",
        videoUrl: "https://sample-video.mp4",
        timestamps: [
          { time: 0, label: "What is Digital Marketing?", type: "chapter" },
          { time: 600, label: "Marketing Channels", type: "concept" },
          { time: 1000, label: "Strategy Fundamentals", type: "chapter" },
        ],
      },
      {
        id: "2",
        title: "JavaScript for Positive Minds",
        duration: "35:00",
        description: "Learn JavaScript fundamentals while staying motivated",
        thumbnailUrl: "/video-thumbs/seo.jpg",
        videoUrl: "https://sample-video.mp4",
        timestamps: [
          { time: 0, label: "How Search Engines Work", type: "chapter" },
          { time: 800, label: "Keyword Research", type: "concept" },
          { time: 1600, label: "On-Page SEO", type: "concept" },
        ],
      },
      {
        id: "3",
        title: "React with Good Energy",
        duration: "40:00",
        description: "Building React apps with a positive, stress-free approach",
        thumbnailUrl: "/video-thumbs/social.jpg",
        videoUrl: "https://sample-video.mp4",
        timestamps: [
          { time: 0, label: "Platform Selection", type: "chapter" },
          { time: 1000, label: "Content Strategy", type: "concept" },
          { time: 2000, label: "Engagement Tactics", type: "chapter" },
        ],
      },
      {
        id: "4",
        title: "Full-Stack Zen",
        duration: "45:00",
        description: "Complete web development while maintaining inner peace",
        thumbnailUrl: "/video-thumbs/content.jpg",
        videoUrl: "https://sample-video.mp4",
        timestamps: [
          { time: 0, label: "Content Planning", type: "chapter" },
          { time: 1200, label: "Copywriting Basics", type: "concept" },
          { time: 2400, label: "Content Distribution", type: "chapter" },
        ],
      },
      {
        id: "5",
        title: "Analytics and Measurement",
        duration: "30:00",
        description: "Tracking and optimizing marketing performance",
        thumbnailUrl: "/video-thumbs/analytics.jpg",
        videoUrl: "https://sample-video.mp4",
        timestamps: [
          { time: 0, label: "Google Analytics Setup", type: "chapter" },
          { time: 800, label: "Key Metrics", type: "concept" },
          { time: 1600, label: "Reporting", type: "chapter" },
        ],
      },
    ],
  },
]