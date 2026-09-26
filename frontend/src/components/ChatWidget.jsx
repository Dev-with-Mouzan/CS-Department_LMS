import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react'

/* ─────────────────────── Knowledge Base ─────────────────────── */
const FAQ_DATA = [
  // Greetings
  {
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'howdy', 'greetings'],
    answer: 'Hello! 👋 Welcome to the **CS Department LMS**.\n\nI can help you with:\n- 📋 Attendance tracking\n- 📝 Assignments & submissions\n- 📚 Course materials\n- 📊 Grades & results\n- 🔐 Account & registration\n\nWhat would you like to know?',
    followUp: ['How do I register?', 'How is attendance tracked?', 'What courses are available?'],
  },
  // Registration & Account
  {
    keywords: ['register', 'registering', 'signup', 'sign up', 'create account', 'new account', 'join', 'get started', 'how do i register', 'how to register'],
    answer: '**Creating Your Account**\n\n1. Click **"Get Started"** on the homepage\n2. Enter your details: name, college email, phone number, and password\n3. You\'ll receive a **6-digit OTP** via SMS\n4. Enter the OTP to verify your account\n5. Sign in with your email and password\n\n⏱️ Takes less than 60 seconds!',
    followUp: ['What if I didn\'t receive the OTP?', 'Can I use a personal email?'],
  },
  {
    keywords: ['otp', 'verification', 'verify', 'code', 'sms', 'didnt receive', 'did not receive', 'verification code'],
    answer: '**OTP Verification**\n\n- After registration, a **6-digit OTP** is sent to your phone via SMS\n- Enter the code on the verification screen\n- The OTP expires after **5 minutes**\n- Didn\'t receive it? Check your spam or request a new code\n\n💡 Make sure your phone number is correct during registration.',
    followUp: ['How do I register?', 'I forgot my password'],
  },
  {
    keywords: ['login', 'sign in', 'log in', 'email', 'password', 'sign in page', 'log in page'],
    answer: '**Signing In**\n\n1. Go to the **Sign In** page\n2. Enter your registered **email** and **password**\n3. Click **Sign In**\n\n🔑 If you forgot your password, click **"Forgot Password"** on the login page to reset it via OTP.',
    followUp: ['How do I reset my password?', 'How do I register?'],
  },
  {
    keywords: ['forgot', 'forgot password', 'reset', 'reset password', 'change password', 'new password', 'lost password', 'forgot my password', 'i forgot'],
    answer: '**Resetting Your Password**\n\n1. On the Sign In page, click **"Forgot Password"**\n2. Enter your registered email address\n3. Check your email for a **6-digit OTP**\n4. Enter the OTP and set a **new password**\n5. Sign in with your new password\n\n🔐 Your account remains secure throughout the process.',
    followUp: ['How do I sign in?', 'Is my data secure?'],
  },
  // Attendance
  {
    keywords: ['attendance', 'attendances', 'present', 'absent', 'mark', 'roll call', 'attendance tracking', 'tracked', 'track attendance', 'mark attendance', 'attendance marked'],
    answer: '**Attendance Management**\n\n**For Teachers:**\n- Open the **Attendance** tab in your dashboard\n- Select the course and date\n- Tap each student to mark **Present** or **Absent**\n- Records are timestamped and saved instantly\n\n**For Students:**\n- View your attendance percentage from **My Attendance**\n- See per-course breakdowns with charts\n- Track your attendance history over time',
    followUp: ['Can I view attendance by course?', 'What if attendance is wrong?'],
  },
  {
    keywords: ['attendance percentage', 'attendance history', 'view attendance', 'check attendance', 'attendance report', 'attendance by course', 'view my attendance', 'my attendance', 'attendance wrong', 'correct attendance'],
    answer: '**Viewing Your Attendance**\n\n1. Go to **My Attendance** in your student dashboard\n2. See your overall **attendance percentage**\n3. View **per-course breakdown** with visual charts\n4. Check daily, weekly, and monthly trends\n\n📊 Your attendance data syncs in real-time.',
    followUp: ['How is attendance marked?', 'Can I correct my attendance?'],
  },
  // Assignments
  {
    keywords: ['assignment', 'assignments', 'submit', 'homework', 'deadline', 'due date', 'upload assignment', 'submit assignment', 'how do i submit', 'how to submit'],
    answer: '**Assignment System**\n\n**For Teachers:**\n- Create assignments from the **Assignments** tab\n- Set title, description, deadline, and total marks\n- Students receive notifications automatically\n\n**For Students:**\n- View assignments in **My Assignments**\n- Submit before the deadline (PDF, DOC, images, ZIP)\n- Auto-reminders before due dates\n- Track submission status and grades',
    followUp: ['What file formats are supported?', 'Can I edit my submission?'],
  },
  {
    keywords: ['file format', 'file type', 'upload format', 'supported format', 'formats', 'pdf', 'doc', 'zip', 'file formats supported', 'what formats', 'resubmit', 'edit submission'],
    answer: '**Supported File Formats**\n\nYou can submit assignments in:\n- 📄 **PDF** documents\n- 📝 **Word** documents (DOC, DOCX)\n- 🖼️ **Images** (JPG, PNG)\n- 📦 **ZIP** archives\n\n📏 Maximum file size: **100MB**\n\n💡 Convert your files to PDF for best compatibility.',
    followUp: ['How do I submit an assignment?', 'Can I resubmit?'],
  },
  {
    keywords: ['resubmit', 'edit submission', 'change submission', 'update submission', 'remove submission'],
    answer: '**Editing Submissions**\n\n- You can **resubmit** before the deadline\n- Only the **latest submission** is considered for grading\n- After the deadline, submissions are locked\n- Contact your teacher if you need special accommodation\n\n⚠️ Late submissions may receive reduced marks.',
    followUp: ['How do I submit an assignment?', 'When is the deadline?'],
  },
  // Materials
  {
    keywords: ['material', 'materials', 'notes', 'slides', 'download', 'download materials', 'lecture', 'study material', 'resources', 'upload materials', 'upload my own notes'],
    answer: '**Course Materials**\n\n**Teachers upload:**\n- 📚 Lecture notes and slides\n- 📄 Reference documents\n- 🖼️ Diagrams and images\n- 📦 ZIP files with multiple resources\n\n**Students can:**\n- View materials from the **Materials** tab\n- Download files for offline study\n- Filter by course or category',
    followUp: ['Can I upload my own notes?', 'What\'s the file size limit?'],
  },
  {
    keywords: ['download limit', 'file size', 'storage', 'space', 'upload limit', 'file size limit', 'size limit', 'how big', 'maximum size'],
    answer: '**File Size Limits**\n\n- Maximum file size: **100MB** per upload\n- Supported formats: PDF, DOC, DOCX, PPT, PPTX, JPG, PNG, ZIP\n- No limit on number of downloads\n- Materials are stored securely in the cloud\n\n💡 Compress large files to ZIP before uploading.',
    followUp: ['How do I upload materials?', 'What formats are supported?'],
  },
  // Courses
  {
    keywords: ['course', 'courses', 'enroll', 'semester', 'subject', 'class', 'program', 'what courses', 'courses available', 'available courses', 'add a course', 'access my courses'],
    answer: '**Course Access**\n\n- Students see courses matching their **session and semester**\n- Courses appear automatically after admin setup\n- Each course has its own materials, assignments, and attendance\n\n**Available programs:**\n- BS Computer Science (GCUF affiliated)\n- ICS programs\n\n📞 Contact your admin if you need access to a course.',
    followUp: ['How do I add a course?', 'What courses are available?'],
  },
  {
    keywords: ['data structure', 'algorithm', 'operating system', 'database', 'network', 'ai', 'machine learning', 'artificial intelligence'],
    answer: '**CS Courses Covered**\n\nThe LMS supports all CS department courses:\n- 📊 Data Structures & Algorithms\n- 🖥️ Operating Systems\n- 🗄️ Database Systems\n- 🌐 Computer Networks\n- 🤖 AI & Machine Learning\n- 💻 Programming Fundamentals\n- ☁️ Cloud Computing\n- 🌍 Web Development\n\n📚 All course materials, assignments, and grades are managed through the LMS.',
    followUp: ['How do I access my courses?', 'Where can I download materials?'],
  },
  // Grades & Results
  {
    keywords: ['grade', 'grades', 'marks', 'result', 'results', 'score', 'gpa', 'cgpa', 'performance', 'how are grades', 'grades calculated', 'check my grades', 'grade review', 'review grade', 'request review'],
    answer: '**Grading System**\n\n**For Students:**\n- View grades on assignment cards in **My Assignments**\n- Check detailed results in **My Results**\n- Track performance trends over time\n- See class rankings and averages\n\n**For Teachers:**\n- Grade submissions from the **Submissions** tab\n- Enter marks and feedback\n- Results appear instantly in student dashboards',
    followUp: ['How are grades calculated?', 'Can I request a grade review?'],
  },
  {
    keywords: ['class rank', 'topper', 'highest', 'average', 'class average', 'statistics', 'how are results', 'results calculated'],
    answer: '**Performance Analytics**\n\n- View your **class rank** in the dashboard\n- See **average marks** for each assignment\n- Track your **performance trends** over time\n- Compare with class statistics\n\n📊 Data-driven insights help you improve!',
    followUp: ['How do I check my grades?', 'How are results calculated?'],
  },
  // Profile & Settings
  {
    keywords: ['profile', 'name', 'email', 'update', 'personal info', 'edit profile', 'phone number', 'who is my admin', 'change my password'],
    answer: '**Profile Management**\n\n- Your profile is managed by the **admin**\n- Contact your administrator to update:\n  - Name, email, or phone number\n  - Roll number or department\n  - Personal details\n\n💡 Keep your information up to date for accurate records.',
    followUp: ['How do I change my password?', 'Who is my admin?'],
  },
  // Teacher Features
  {
    keywords: ['teacher', 'teachers', 'faculty', 'instructor', 'professor', 'lecturer', 'create an assignment', 'how do i create', 'class statistics', 'mark attendance'],
    answer: '**Teacher Features**\n\nTeachers can:\n- ✅ Mark attendance with one tap\n- 📝 Create and manage assignments\n- 📊 Review & grade student submissions\n- 📚 Upload course materials\n- 📈 View class statistics and analytics\n\nAll from the dedicated **Teacher Dashboard**.',
    followUp: ['How do I create an assignment?', 'How do I mark attendance?'],
  },
  // Admin Features
  {
    keywords: ['admin', 'administrator', 'manage users', 'manage courses', 'system', 'add a new user', 'add user', 'create a course', 'add new user'],
    answer: '**Admin Capabilities**\n\nAdmins have full oversight:\n- 👥 Manage users (students, teachers)\n- 📚 Manage courses & semesters\n- 📋 Manage promotions & sessions\n- 📊 View system analytics\n- 🔧 Configure LMS settings\n\nContact the CS Department for admin access.',
    followUp: ['How do I add a new user?', 'How do I create a course?'],
  },
  // Security
  {
    keywords: ['security', 'secure', 'privacy', 'data protection', 'safe', 'encryption', 'data secure', 'is my data secure', 'data stored', 'who can see my grades'],
    answer: '**Data Security**\n\nYour data is protected with:\n- 🔐 **OTP-based** account verification\n- 🔒 **Encrypted** data storage\n- 👤 **Role-based** permissions\n- 🛡️ Secure authentication\n\nOnly verified users can access the system. Each role sees only what\'s relevant to them.',
    followUp: ['How is my data stored?', 'Who can see my grades?'],
  },
  // Contact & Support
  {
    keywords: ['contact', 'support', 'help', 'email', 'phone', 'reach', 'address', 'contact us', 'college located', 'office hours', 'where is the college'],
    answer: '**Contact Us**\n\n📧 **Email:** cs@ggcb.edu.pk\n📞 **Phone:** +92 67 334 5678\n📍 **Address:** CS Dept., Govt. Graduate College Burewala, Vehari District, Punjab, Pakistan\n\n🕐 Office hours: Monday–Saturday, 9:00 AM – 5:00 PM',
    followUp: ['Where is the college located?', 'What are the office hours?'],
  },
  // General
  {
    keywords: ['what is', 'about', 'about lms', 'tell me about', 'explain', 'how does it work', 'tell me about attendance', 'get started'],
    answer: '**CS Department LMS**\n\nA digital platform built for the CS Department at Govt. Graduate College Burewala.\n\n**What it does:**\n- 📋 Digital attendance tracking\n- 📝 Assignment management\n- 📊 Performance analytics\n- 📚 Course materials sharing\n- 💬 Real-time notifications\n\n**Who uses it:** Students, Teachers, and Administrators\n\n🎯 Making classroom management efficient and connected.',
    followUp: ['How do I register?', 'What courses are available?'],
  },
  {
    keywords: ['feature', 'features', 'what can', 'capability', 'function', 'what can it do', 'what does it do', 'how do i get started'],
    answer: '**Key Features**\n\n| Feature | Description |\n|---------|-------------|\n| 📋 Attendance | One-tap digital marking with real-time sync |\n| 📝 Assignments | Create, submit, and grade in one place |\n| 📊 Analytics | Visual dashboards for grades and attendance |\n| 📚 Materials | Upload and download study resources |\n| 🔔 Notifications | Instant alerts for deadlines and updates |\n| 🔐 Security | OTP verification and role-based access |',
    followUp: ['How do I get started?', 'Tell me about attendance'],
  },
]

const FALLBACK_ANSWER = "I'm not sure about that specific topic. Here's what I can help with:\n\n- **Attendance** — marking, viewing, reports\n- **Assignments** — creating, submitting, deadlines\n- **Materials** — uploading, downloading notes\n- **Courses** — access, enrollment, semesters\n- **Grades** — viewing, analytics, results\n- **Account** — registration, login, password\n- **Security** — data protection, privacy\n\nTry rephrasing your question, or contact **cs@ggcb.edu.pk** for direct help."

const INITIAL_SUGGESTIONS = [
  'How do I register?',
  'How is attendance tracked?',
  'Where can I download materials?',
  'What courses are available?',
]

const QUICK_ACTIONS = [
  { label: '📋 Attendance', query: 'How is attendance tracked?' },
  { label: '📝 Assignments', query: 'How do I submit an assignment?' },
  { label: '📚 Materials', query: 'Where can I download materials?' },
  { label: '📊 Grades', query: 'How do I check my grades?' },
  { label: '🔐 Register', query: 'How do I register?' },
  { label: '🔒 Security', query: 'Is my data secure?' },
]

/* ─────────────────── Smart Matching Engine ─────────────────── */
function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
}

function wordOverlap(input, keywords) {
  const normalized = normalize(input)
  const words = normalized.split(' ')
  let score = 0
  for (const kw of keywords) {
    const kwNorm = normalize(kw)
    if (kwNorm.includes(' ')) {
      // Multi-word keyword: check if phrase exists in input
      if (normalized.includes(kwNorm)) score += 3
    } else {
      // Single word: check if keyword is contained in any input word (handles plurals)
      if (words.some(w => w === kwNorm || w.startsWith(kwNorm) || kwNorm.startsWith(w))) score += 1
    }
  }
  return score
}

function getAnswer(input) {
  const normalized = normalize(input)

  // Exact match first
  for (const faq of FAQ_DATA) {
    if (faq.keywords.some(kw => normalize(kw) === normalized)) {
      return { text: faq.answer, followUp: faq.followUp }
    }
  }

  // Scored matching
  let bestMatch = null
  let bestScore = 0

  for (const faq of FAQ_DATA) {
    const score = wordOverlap(input, faq.keywords)
    if (score > bestScore) {
      bestScore = score
      bestMatch = faq
    }
  }

  if (bestMatch && bestScore >= 1) {
    return { text: bestMatch.answer, followUp: bestMatch.followUp }
  }

  // Context-aware fallback
  const contextSuggestions = getContextSuggestions(input)
  return {
    text: FALLBACK_ANSWER + (contextSuggestions ? `\n\n💡 Based on your question, you might want to ask about:\n${contextSuggestions}` : ''),
    followUp: ['How do I register?', 'What courses are available?'],
  }
}

function getContextSuggestions(input) {
  const lower = input.toLowerCase()
  const suggestions = []

  if (lower.includes('how') || lower.includes('what') || lower.includes('where')) {
    if (lower.includes('attend')) suggestions.push('- How attendance works')
    if (lower.includes('submit') || lower.includes('assignment')) suggestions.push('- Assignment submission process')
    if (lower.includes('grade') || lower.includes('mark')) suggestions.push('- Viewing grades and results')
    if (lower.includes('register') || lower.includes('sign')) suggestions.push('- Registration steps')
  }

  return suggestions.length > 0 ? suggestions.join('\n') : ''
}

/* ─────────────────── Markdown Renderer ─────────────────── */
function renderMarkdown(text) {
  const lines = text.split('\n')
  const elements = []
  let inList = false
  let listItems = []
  let listType = 'ul'

  const flushList = () => {
    if (listItems.length > 0) {
      const Tag = listType === 'ol' ? 'ol' : 'ul'
      elements.push(
        <Tag key={`list-${elements.length}`} className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} ml-4 space-y-1 my-2`}>
          {listItems.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">{renderInline(item)}</li>
          ))}
        </Tag>
      )
      listItems = []
      inList = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    if (trimmed === '') {
      flushList()
      continue
    }

    // Table support
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList()
      // Skip separator rows
      if (/^\|[\s-|]+\|$/.test(trimmed)) continue
      const cells = trimmed.split('|').filter(c => c.trim()).map(c => c.trim())
      elements.push(
        <div key={i} className="flex gap-3 text-sm py-1 border-b border-surface-100 last:border-0">
          {cells.map((cell, ci) => (
            <span key={ci} className={ci === 0 ? 'font-semibold text-navy-700 flex-1' : 'text-navy-500 flex-[2]'}>{cell}</span>
          ))}
        </div>
      )
      continue
    }

    // Numbered list
    if (/^\d+\./.test(trimmed)) {
      inList = true
      listType = 'ol'
      listItems.push(trimmed.replace(/^\d+\.\s*/, ''))
      continue
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('✅') || trimmed.startsWith('📝') || trimmed.startsWith('📊') || trimmed.startsWith('📚') || trimmed.startsWith('🔐') || trimmed.startsWith('👥') || trimmed.startsWith('📋') || trimmed.startsWith('🌐') || trimmed.startsWith('📄')) {
      inList = true
      listType = 'ul'
      listItems.push(trimmed.replace(/^[-•]\s/, ''))
      continue
    }

    flushList()

    // Bold section headers (lines starting with **)
    if (trimmed.startsWith('**') && trimmed.includes('**')) {
      elements.push(
        <p key={i} className="font-bold text-navy-800 mt-3 mb-1 text-sm">{renderInline(trimmed)}</p>
      )
      continue
    }

    elements.push(
      <p key={i} className="text-sm leading-relaxed my-1">{renderInline(trimmed)}</p>
    )
  }

  flushList()
  return elements
}

function renderInline(text) {
  // Split on **bold** markers
  const parts = text.split(/(\*\*.*?\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-navy-800">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

/* ─────────────────── Typing Indicator ─────────────────── */
function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full bg-accent-50 border border-accent-200 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-accent-600" />
      </div>
      <div className="bg-surface-50 border border-surface-200 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-navy-300 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-navy-300 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-navy-300 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

/* ─────────────────── Chat Widget ─────────────────── */
export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'bot',
      text: 'Hello! 👋 I\'m the **CS Department LMS Assistant**.\n\nI can help you with attendance, assignments, materials, courses, grades, and registration.\n\nWhat would you like to know?',
      followUp: INITIAL_SUGGESTIONS,
      time: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const botTimeoutRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current)
    }
  }, [])

  const sendMessage = useCallback((text) => {
    const question = text || input.trim()
    if (!question || isTyping) return

    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: question,
      time: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Simulate bot thinking with variable delay
    const delay = 600 + Math.random() * 800
    botTimeoutRef.current = setTimeout(() => {
      const { text: answerText, followUp } = getAnswer(question)
      const botMsg = {
        id: Date.now() + 1,
        role: 'bot',
        text: answerText,
        followUp: followUp,
        time: new Date(),
      }
      setIsTyping(false)
      setMessages(prev => [...prev, botMsg])
    }, delay)
  }, [input, isTyping])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
          isOpen
            ? 'bg-navy-900 hover:bg-navy-800 rotate-0'
            : 'bg-accent-500 hover:bg-accent-400 hover:scale-110 hover:shadow-accent-500/30'
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-navy-950" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-surface-200 flex flex-col overflow-hidden animate-slide-up"
          style={{ height: '520px' }}
        >
          {/* Header */}
          <div className="bg-navy-950 px-5 py-4 flex items-center gap-3 shrink-0">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-accent-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-navy-950" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-navy-950 rounded-full" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">LMS Assistant</p>
              <p className="text-xs text-white/50">CS Department · Ask me anything</p>
            </div>
            <Sparkles className="w-4 h-4 text-accent-400" />
          </div>

          {/* Quick Actions (shown when no messages beyond initial) */}
          {messages.length <= 1 && (
            <div className="px-4 pt-3 pb-1 shrink-0">
              <p className="text-xs font-semibold text-navy-400 mb-2">Quick actions:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.query)}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-surface-200 bg-surface-50 text-navy-600 hover:bg-accent-50 hover:border-accent-200 hover:text-accent-700 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                <div className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'bot' ? 'bg-accent-50 border border-accent-200' : 'bg-navy-900'
                  }`}>
                    {msg.role === 'bot' ? (
                      <Bot className="w-3.5 h-3.5 text-accent-600" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <div className="max-w-[80%]">
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'bot'
                        ? 'bg-surface-50 text-navy-800 border border-surface-200 rounded-tl-md'
                        : 'bg-accent-500 text-navy-950 rounded-tr-md'
                    }`}>
                      {msg.role === 'bot' ? (
                        <div className="space-y-0">{renderMarkdown(msg.text)}</div>
                      ) : (
                        msg.text
                      )}
                    </div>
                    <p className={`text-xs text-navy-300 mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                      {formatTime(msg.time)}
                    </p>
                  </div>
                </div>

                {/* Follow-up suggestions */}
                {msg.role === 'bot' && msg.followUp && (
                  <div className="ml-9 space-y-1.5">
                    <p className="text-xs font-semibold text-navy-400">You might also want to know:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.followUp.map((q) => (
                        <button
                          key={q}
                          onClick={() => sendMessage(q)}
                          className="text-xs font-medium px-2.5 py-1 rounded-full border border-accent-200 bg-accent-50 text-accent-700 hover:bg-accent-100 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-surface-200 px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the LMS..."
                disabled={isTyping}
                className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm text-navy-900 placeholder-navy-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-accent-500 text-navy-950 flex items-center justify-center hover:bg-accent-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
