export interface AIInteraction {
  id: string
  type: "hint" | "check" | "reflect" | "path"
  userId: string
  courseId: string
  videoId: string
  timestamp: number
  trigger: string
  request?: string
  response: string
  createdAt: Date
}

export interface PuzzleHint {
  context: string
  hint: string
  relatedConcepts?: string[]
}

export interface PuzzleCheck {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export interface PuzzleReflect {
  prompt: string
  guidingQuestions?: string[]
  expectedLength?: "short" | "medium" | "long"
}

export interface PuzzlePath {
  detectedIssue: string
  recommendedContent: {
    type: "video" | "article" | "exercise"
    title: string
    url: string
    duration: string
  }[]
}

export const mockAIResponses = {
  hints: [
    {
      context: "User paused at HTML forms section",
      hint: "Forms are used to collect user input. Each input element needs a 'name' attribute to be submitted with the form data.",
      relatedConcepts: ["input types", "form validation", "form submission"],
    },
    {
      context: "User rewound CSS flexbox explanation",
      hint: "Flexbox works on two axes: main axis (flex-direction) and cross axis. Items flow along the main axis by default.",
      relatedConcepts: ["justify-content", "align-items", "flex-wrap"],
    },
    {
      context: "User paused at JavaScript functions",
      hint: "Functions are reusable blocks of code. They can take parameters (inputs) and return values (outputs).",
      relatedConcepts: ["parameters vs arguments", "return statement", "function scope"],
    },
  ],
  
  checks: [
    {
      question: "What is the purpose of semantic HTML?",
      options: [
        "To make the code look prettier",
        "To provide meaning and structure to content",
        "To add styling to elements",
        "To make websites load faster",
      ],
      correctAnswer: 1,
      explanation: "Semantic HTML provides meaning to content, helping browsers, screen readers, and search engines understand the structure and purpose of different parts of your webpage.",
    },
    {
      question: "Which CSS property controls the space between flexbox items?",
      options: ["margin", "padding", "gap", "spacing"],
      correctAnswer: 2,
      explanation: "The 'gap' property sets the space between flex items without needing margins on individual items.",
    },
  ],
  
  reflections: [
    {
      prompt: "How would you explain the difference between block and inline elements to someone new to HTML?",
      guidingQuestions: [
        "What visual differences do you notice?",
        "How do they affect layout?",
        "Can you think of common examples of each?",
      ],
      expectedLength: "medium",
    },
    {
      prompt: "Describe a real-world scenario where you would use flexbox instead of grid for layout.",
      guidingQuestions: [
        "What makes flexbox suitable for this scenario?",
        "What limitations might you face?",
      ],
      expectedLength: "short",
    },
  ],
  
  paths: [
    {
      detectedIssue: "Struggling with CSS layout concepts",
      recommendedContent: [
        {
          type: "video",
          title: "CSS Box Model Explained",
          url: "/supplementary/css-box-model",
          duration: "8 min",
        },
        {
          type: "article",
          title: "Understanding CSS Display Property",
          url: "/articles/css-display",
          duration: "5 min read",
        },
        {
          type: "exercise",
          title: "Practice: Build a Card Component",
          url: "/exercises/card-component",
          duration: "15 min",
        },
      ],
    },
    {
      detectedIssue: "Difficulty with JavaScript variables and scope",
      recommendedContent: [
        {
          type: "video",
          title: "JavaScript Scope and Closures",
          url: "/supplementary/js-scope",
          duration: "12 min",
        },
        {
          type: "exercise",
          title: "Variable Scope Challenge",
          url: "/exercises/scope-challenge",
          duration: "10 min",
        },
      ],
    },
  ],
}

export const mockAIInteractions: AIInteraction[] = [
  {
    id: "ai-1",
    type: "hint",
    userId: "learner-1",
    courseId: "course-1",
    videoId: "video-1-2",
    timestamp: 1200,
    trigger: "pause",
    response: "Remember: Semantic HTML elements like <header>, <nav>, and <main> describe their content's purpose, not just its appearance.",
    createdAt: new Date("2024-02-01T10:30:00"),
  },
  {
    id: "ai-2",
    type: "check",
    userId: "learner-1",
    courseId: "course-1",
    videoId: "video-1-3",
    timestamp: 2400,
    trigger: "scheduled",
    response: "Quiz: What is the main difference between flexbox and grid?",
    createdAt: new Date("2024-02-01T11:15:00"),
  },
  {
    id: "ai-3",
    type: "reflect",
    userId: "learner-1",
    courseId: "course-1",
    videoId: "video-1-5",
    timestamp: 5400,
    trigger: "section_complete",
    response: "Time to reflect: How would you structure a website differently now that you understand semantic HTML?",
    createdAt: new Date("2024-02-01T12:45:00"),
  },
]