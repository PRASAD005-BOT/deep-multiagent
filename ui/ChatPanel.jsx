import { useState, useRef, useEffect } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { motion, AnimatePresence } from 'framer-motion'

const QUICK = [
  { icon: '🚀', label: 'E-commerce Site' },
  { icon: '🔐', label: 'Auth System' },
  { icon: '⚡', label: 'FastAPI Backend' },
  { icon: '📝', label: 'Blog Platform' },
]

const TOOL_META = {
  folder:   { icon: FolderIcon,  color: '#E8831A', label: 'Directory' },
  file:     { icon: FileIcon,    color: '#7C6AF7', label: 'Writing' },
  eye:      { icon: EyeIcon,     color: '#4285F4', label: 'Reading' },
  terminal: { icon: TermIcon,    color: '#3ECF8E', label: 'Exec' },
  play:     { icon: PlayIcon,    color: '#3ECF8E', label: 'Launch' },
  package:  { icon: PkgIcon,     color: '#E8831A', label: 'Install' },
  wrench:   { icon: WrenchIcon,  color: '#EF4444', label: 'Fix' },
  check:    { icon: CheckIcon,   color: '#10B981', label: 'Plan' },
  tool:     { icon: ToolIcon,    color: '#5A5D6A', label: 'Tool' },
}

export default function ChatPanel({ messages, streaming, onSend, model, models, projects, isMobile }) {
  const [input, setInput]     = useState('')
  const [project, setProject] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = () => {
    if (!input.trim() || streaming) return
    onSend(input.trim(), project)
    setInput('')
  }

  const showWelcome = messages.length <= 1

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: '#0A0B0D' }}>

      {/* Subtle dot grid background */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[50%] pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at top, rgba(124,106,247,0.07) 0%, transparent 70%)' }} />

      {/* ── Top Bar ── */}
      <div className="relative z-20 flex items-center justify-between px-6 py-3 border-b border-white/[0.04]">
        {/* Agent Center label */}
        <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/30">Agent Center</span>

        {/* Right side: project selector */}
        <div className="flex items-center gap-3">
          {streaming && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#7C6AF7] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#7C6AF7]/60">Processing</span>
            </div>
          )}
          <div className="flex items-center gap-2 border border-white/10 rounded-lg px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.05] transition-colors cursor-pointer">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Project</span>
            <select
              value={project}
              onChange={e => setProject(e.target.value)}
              className="bg-transparent text-[12px] font-bold text-white/70 focus:outline-none cursor-pointer appearance-none pr-1"
            >
              <option value="">None</option>
              {projects.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/30">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Messages / Welcome Area ── */}
      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar">

        <AnimatePresence mode="wait">
          {showWelcome ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, filter: 'blur(8px)' }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center min-h-full px-8 pb-32 pt-8"
            >
              {/* System Ready pill */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-2 border border-[#7C6AF7]/30 bg-[#7C6AF7]/10 rounded-full px-4 py-1.5 mb-8"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#7C6AF7] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#7C6AF7]/80">System Ready</span>
              </motion.div>

              {/* Hero Typography */}
              <div className="text-center mb-6 w-full max-w-3xl">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                >
                  {/* "Design." - solid white, huge */}
                  <div
                    className="text-white font-black leading-none tracking-tighter select-none"
                    style={{
                      fontSize: 'clamp(72px, 12vw, 130px)',
                      fontFamily: '"DM Sans", sans-serif',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    Design.
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                >
                  {/* "Build." - outlined/ghost style */}
                  <div
                    className="font-black leading-none tracking-tighter select-none -mt-2"
                    style={{
                      fontSize: 'clamp(65px, 11vw, 118px)',
                      fontFamily: '"DM Sans", sans-serif',
                      letterSpacing: '-0.03em',
                      WebkitTextStroke: '1.5px rgba(255,255,255,0.2)',
                      color: 'transparent',
                    }}
                  >
                    Build.
                  </div>
                </motion.div>
              </div>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-center text-white/40 text-[15px] font-medium leading-relaxed max-w-md mb-12"
              >
                DevAgent is your autonomous command center for software engineering — from concept to deployment.
              </motion.p>

              {/* Recipe Cards — 4 columns */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl"
              >
                {QUICK.map((q, i) => (
                  <motion.button
                    key={q.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.45 + i * 0.07 } }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onSend(`Build a ${q.label}`)}
                    className="flex flex-col items-start p-4 rounded-2xl text-left transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 text-lg"
                      style={{ background: 'rgba(255,255,255,0.05)' }}>
                      {q.icon}
                    </div>
                    {/* RECIPE label */}
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25 mb-1.5">Recipe</span>
                    {/* Title */}
                    <span className="text-[13px] font-bold text-white/80 leading-tight mb-3">{q.label}</span>
                    {/* Arrow */}
                    <span className="text-white/20 text-sm">→</span>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-6 py-8 space-y-10 max-w-4xl mx-auto"
            >
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === 'user' ? (
                    <UserBubble text={msg.text} />
                  ) : (
                    <AgentBubble msg={msg} />
                  )}
                </div>
              ))}
              <div ref={bottomRef} className="h-32" />
            </motion.div>
          )}
        </AnimatePresence>

        {!showWelcome && <div ref={bottomRef} className="h-32" />}
      </div>

      {/* ── Command Input Bar ── */}
      <div className="absolute bottom-0 left-0 w-full px-6 pb-6 pt-4 z-30 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #0A0B0D 60%, transparent)' }}>
        <div
          className="max-w-3xl mx-auto flex items-center gap-2 rounded-2xl pointer-events-auto px-4 py-2"
          style={{
            background: 'rgba(18, 20, 23, 0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px -10px rgba(0,0,0,0.8)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <TextareaAutosize
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); submit()
              }
            }}
            placeholder={streaming ? 'Agent processing...' : 'Describe what you want to build...'}
            disabled={streaming}
            minRows={1}
            maxRows={6}
            className="flex-1 bg-transparent text-[14px] text-white/80 placeholder-white/20 font-medium py-2.5 focus:outline-none resize-none leading-relaxed"
          />

          {/* ↵ Send hint */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {input.trim() && !streaming && (
              <span className="text-[11px] text-white/20 font-mono hidden sm:block">↵ Send</span>
            )}

            {/* Send button */}
            <button
              onClick={submit}
              disabled={!input.trim() || streaming}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
              style={{
                background: input.trim() && !streaming ? '#7C6AF7' : 'rgba(255,255,255,0.05)',
                boxShadow: input.trim() && !streaming ? '0 0 20px rgba(124,106,247,0.4)' : 'none',
              }}
            >
              {streaming ? <Spinner /> : <SendIcon active={input.trim()} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function UserBubble({ text }) {
  return (
    <div className="flex justify-start opacity-70 hover:opacity-100 transition-opacity">
      <div className="px-5 py-3.5 rounded-2xl max-w-[85%]"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[15px] font-medium text-white/90 leading-snug">{text}</p>
      </div>
    </div>
  )
}

function AgentBubble({ msg }) {
  const [isTracesOpen, setIsTracesOpen] = useState(true)
  const steps = msg.steps || []
  const hasSteps = steps.length > 0

  return (
    <div className="flex flex-col gap-5">
      {hasSteps && (
        <div className="ml-1 pl-5 border-l border-white/[0.05] space-y-3">
          <button
            onClick={() => setIsTracesOpen(!isTracesOpen)}
            className="flex items-center gap-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white/40 transition-colors"
          >
            {steps.length} Actions Tracked
            <svg className={`w-3 h-3 transition-transform ${isTracesOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          <AnimatePresence>
            {isTracesOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-1.5"
              >
                {steps.map((step, i) => (
                  <TraceRow key={i} step={step} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="space-y-3">
        {msg.thinking && !msg.text && (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#7C6AF7] animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#7C6AF7]/70">Processing...</span>
          </div>
        )}

        {msg.text && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-[15px] font-medium leading-relaxed ${msg.isError ? 'text-red-400 font-bold' : 'text-white/75'}`}
          >
            {msg.text}
          </motion.div>
        )}
      </div>
    </div>
  )
}

function TraceRow({ step }) {
  const meta = TOOL_META[step.icon] || TOOL_META.tool
  const Icon = meta.icon
  const status = step.status

  return (
    <div className="flex items-center gap-3 py-1.5 group">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: meta.color }}>
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-white/25">{meta.label}</span>
          <span className="text-[11px] font-mono text-white/50 truncate">{step.preview}</span>
        </div>
      </div>
      {status === 'running' && <div className="w-1.5 h-1.5 rounded-full bg-[#7C6AF7] animate-pulse flex-shrink-0" />}
      {status === 'done' && <CheckIcon size={11} className="text-emerald-500 opacity-50 flex-shrink-0" />}
      {status === 'error' && <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
    </div>
  )
}

// Icons
const FolderIcon = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
const FileIcon   = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
const TermIcon   = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m7 15 3-3-3-3m5 6h4"/></svg>
const PlayIcon   = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const PkgIcon    = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
const EyeIcon    = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
const WrenchIcon = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
const CheckIcon  = ({size=16, className=''}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
const ToolIcon   = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
const SendIcon   = ({ active }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? 'white' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>
  </svg>
)
const Spinner = () => <div className="w-4 h-4 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
