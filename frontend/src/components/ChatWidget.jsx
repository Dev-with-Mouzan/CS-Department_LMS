import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User } from 'lucide-react'

const FAQ_DATA = [
  {
    keywords: ['attendance', 'present', 'absent', 'mark'],
    answer: '**Attendance Management**\n\n- Teachers can mark attendance from the **Attendance** tab in their dashboard\n- Students can view their attendance percentage and per-course breakdown from **My Attendance** in the student portal\n- Attendance records are timestamped and synced in real-time',
    followUp: ['How is attendance calculated?', 'Can I view attendance by course?'],
  },
  {
    keywords: ['assignment', 'submit', 'homework', 'deadline'],
    answer: '**Assignment System**\n\n- Teachers create assignments from the **Assignments** tab\n- Students can view and submit assignments (PDF, DOC, images, ZIP) from **My Assignments**\n- Set deadlines to keep everyone on track\n- Auto-reminders for due dates',
    followUp: ['What file formats are supported?', 'Can I edit my submission?'],
  },
  {
    keywords: ['register', 'signup', 'sign up', 'account', 'create account'],
    answer: '**Getting Started**\n\n1. Click **"Get Started"** on the homepage\n2. Fill in your details (name, email, phone, password)\n3. Verify your account with the **OTP** sent to your phone\n4. You\'re ready to go!',
    followUp: ['What if I didn\'t receive the OTP?', 'Can I change my email later?'],
  },
  {
    keywords: ['login', 'sign in', 'password', 'forgot'],
    answer: '**Signing In**\n\n- Use the **Sign In** page with your registered email and password\n- If you forgot your password, click **"Forgot Password"**\n- Enter your email to receive an OTP\n- Reset your password with the OTP',
    followUp: ['How do I reset my password?', 'Is my account secure?'],
  },
  {
    keywords: ['material', 'notes', 'slides', 'download'],
    answer: '**Course Materials**\n\n- Teachers upload notes, slides, and reference materials\n- Students can view and download from the **Materials** tab\n- Supports PDF, DOC, PPT, images, and ZIP files',
    followUp: ['Can I upload my own notes?', 'What\'s the file size limit?'],
  },
  {
    keywords: ['course', 'enroll', 'semester'],
    answer: '**Course Management**\n\n- Admins manage courses and enrollments\n- Students are auto-enrolled in their semester courses\n- Contact your admin if you need to be enrolled in a course',
    followUp: ['How do I add a new course?', 'Can I drop a course?'],
  },
  {
    keywords: ['grade', 'marks', 'result', 'score'],
    answer: '**Grading System**\n\n- Teachers grade submissions from the **Submissions** tab\n- Students view marks and grades on assignment cards\n- Performance analytics available in the dashboard',
    followUp: ['How are grades calculated?', 'Can I request a grade review?'],
  },
  {
    keywords: ['profile', 'name', 'email', 'update'],
    answer: '**Profile Management**\n\n- Your profile is managed by the admin\n- Contact your administrator to update name, email, or personal details\n- Keep your information up to date',
    followUp: ['How do I change my password?', 'Can I update my phone number?'],
  },
  {
    keywords: ['teacher', 'faculty', 'instructor'],
    answer: '**Teacher Features**\n\nTeachers can:\n- ✅ Mark attendance\n- 📝 Create assignments\n- 📊 Review & grade submissions\n- 📚 Upload materials\n\nAll from the dedicated teacher dashboard.',
    followUp: ['How do I create an assignment?', 'Can I see class statistics?'],
  },
  {
    keywords: ['admin', 'administrator'],
    answer: '**Admin Capabilities**\n\nAdmins have full oversight:\n- 👥 Manage users\n- 📚 Manage courses & semesters\n- 📋 Manage enrollments\n- 📊 View system analytics',
    followUp: ['How do I add a new user?', 'How do I create a course?'],
  },
  {
    keywords: ['hello', 'hi', 'hey', 'help'],
    answer: 'Hello! 👋 I\'m the **CS Department LMS Assistant**.\n\nI can help you with:\n- Attendance\n- Assignments\n- Materials\n- Courses\n- Grades\n- Registration\n\nWhat would you like to know?',
    followUp: ['How do I register?', 'How do I submit an assignment?', 'Where can I download materials?'],
  },
]

const FALLBACK_ANSWER = "I'm not sure about that. Try asking about:\n\n- **Attendance**\n- **Assignments**\n- **Materials**\n- **Courses**\n- **Grades**\n- **Registration**\n\nYou can also contact the CS Department at cs@ggcb.edu.pk for further help."

const INITIAL_SUGGESTIONS = [
  'How do I submit an assignment?',
  'How is attendance tracked?',
  'Where can I download materials?',
  'How do I register?',
]

function getAnswer(input) {
  const lower = input.toLowerCase()
  for (const faq of FAQ_DATA) {
    if (faq.keywords.some(kw => lower.includes(kw))) {
      return { text: faq.answer, followUp: faq.followUp }
    }
  }
  return { text: FALLBACK_ANSWER, followUp: ['How do I register?', 'What courses are available?'] }
}

function renderMarkdown(text) {
  // Simple markdown: **bold**, bullet points, line breaks
  const lines = text.split('\n')
  
  return lines.map((line, i) => {
    // Bold
    let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // Bullet points with emoji or dash
    if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
      processed = processed.replace(/^[\s]*[-•]\s/, '')
      return `<li class="ml-4 list-disc">${processed}</li>`
    }
    
    // Numbered list
    if (/^\d+\./.test(line.trim())) {
      return `<li class="ml-4 list-decimal">${processed}</li>`
    }
    
    // Checkmark items
    if (line.trim().startsWith('✅') || line.trim().startsWith('📝') || line.trim().startsWith('📊') || line.trim().startsWith('📚') || line.trim().startsWith('📢') || line.trim().startsWith('👥') || line.trim().startsWith('📋')) {
      return `<li class="ml-4">${processed}</li>`
    }
    
    // Empty lines
    if (line.trim() === '') return '<br/>'
    
    return `<p>${processed}</p>`
  }).join('')
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'bot',
      text: 'Hi! 👋 I\'m the **CS Department LMS Assistant**. How can I help you today?',
      followUp: INITIAL_SUGGESTIONS,
      time: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const sendMessage = (text) => {
    const question = text || input.trim()
    if (!question) return

    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: question,
      time: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')

    // Simulate bot thinking
    setTimeout(() => {
      const { text: answerText, followUp } = getAnswer(question)
      const botMsg = {
        id: Date.now() + 1,
        role: 'bot',
        text: answerText,
        followUp: followUp,
        time: new Date(),
      }
      setMessages(prev => [...prev, botMsg])
    }, 400)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
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
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-surface-200 flex flex-col overflow-hidden animate-slide-up"
          style={{ height: '480px' }}
        >
          {/* Header */}
          <div className="bg-navy-950 px-5 py-4 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-accent-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-navy-950" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">LMS Assistant</p>
              <p className="text-2xs text-white/50">CS Department · Ask me anything</p>
            </div>
          </div>

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
                  <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'bot'
                      ? 'bg-surface-50 text-navy-800 border border-surface-200 rounded-tl-md'
                      : 'bg-accent-500 text-navy-950 rounded-tr-md'
                  }`}>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
                  </div>
                </div>
                
                {/* Follow-up suggestions for bot messages */}
                {msg.role === 'bot' && msg.followUp && (
                  <div className="ml-9 space-y-1.5">
                    <p className="text-2xs font-semibold text-navy-400">You might also want to know:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.followUp.map((q) => (
                        <button
                          key={q}
                          onClick={() => sendMessage(q)}
                          className="text-2xs font-medium px-2.5 py-1 rounded-full border border-accent-200 bg-accent-50 text-accent-700 hover:bg-accent-100 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

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
                className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm text-navy-900 placeholder-navy-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
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
