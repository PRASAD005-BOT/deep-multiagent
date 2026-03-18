import { useState, useRef, useEffect } from 'react'
import TextareaAutosize from 'react-textarea-autosize'

const QUICK = [
  'Build a React ecommerce site',
  'Create a Node.js REST API',
  'Build a FastAPI backend',
  'Create a Next.js blog',
]

const MODEL_COLORS = {
  'Kimi K2.5':'#E8831A', 'GPT-5.2':'#10A37F',
  'Gemini 3':'#4285F4', 'Claude':'#CC785C', 'MiniMax':'#9B59B6',
}

const TOOL_META = {
  folder:   { icon: FolderIcon,  color: '#E8831A' },
  file:     { icon: FileIcon,    color: '#7C6AF7' },
  eye:      { icon: EyeIcon,     color: '#4285F4' },
  list:     { icon: ListIcon,    color: '#5A5D6A' },
  grid:     { icon: GridIcon2,   color: '#5A5D6A' },
  terminal: { icon: TermIcon,    color: '#3ECF8E' },
  play:     { icon: PlayIcon,    color: '#3ECF8E' },
  package:  { icon: PkgIcon,     color: '#E8831A' },
  wrench:   { icon: WrenchIcon,  color: '#E05252' },
  trash:    { icon: TrashIcon,   color: '#E05252' },
  check:    { icon: CheckIcon2,  color: '#3ECF8E' },
  tool:     { icon: CircleIcon,  color: '#5A5D6A' },
}

export default function ChatPanel({ messages, streaming, onSend, model, models, projects, isMobile }) {
  const [input, setInput]     = useState('')
  const [project, setProject] = useState('')
  const [showProj, setShowProj] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = () => {
    if (!input.trim() || streaming) return
    onSend(input.trim(), project)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Topbar — desktop only */}
      {!isMobile && (
        <div className="flex-shrink-0 px-5 py-3 border-b border-[#222428] flex items-center gap-3">
          <span className="text-sm font-medium text-white">Chat</span>
          <span className="text-[#5A5D6A] text-xs">·</span>
          {streaming
            ? <span className="text-xs text-[#7C6AF7] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C6AF7] pulse-dot inline-block"/>Agent working
              </span>
            : <span className="text-xs text-[#5A5D6A]">Ready</span>
          }
          {projects.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-[#5A5D6A]">Context:</span>
              <select
                value={project}
                onChange={e => setProject(e.target.value)}
                className="text-xs bg-[#1C1E22] border border-[#222428] rounded-lg px-2.5 py-1.5 text-white focus:border-[#7C6AF7] transition-colors"
              >
                <option value="">none</option>
                {projects.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-4 md:gap-5">

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="fade-up">
            <p className="text-xs text-[#5A5D6A] mb-3 font-medium">Quick start</p>
            <div className="flex flex-wrap gap-2">
              {QUICK.map(q => (
                <button
                  key={q}
                  onClick={() => onSend(q)}
                  className="text-xs px-3 py-2 rounded-full border border-[#222428] text-[#5A5D6A] hover:text-white hover:border-[#3A3D47] transition-all active:scale-95"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="fade-up">
            {msg.role === 'user'
              ? <UserMessage text={msg.text} />
              : <AgentMessage msg={msg} isMobile={isMobile} />
            }
          </div>
        ))}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Mobile project selector */}
      {isMobile && projects.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-[#222428] flex items-center gap-2">
          <span className="text-xs text-[#5A5D6A]">Context:</span>
          <select
            value={project}
            onChange={e => setProject(e.target.value)}
            className="flex-1 text-xs bg-[#1C1E22] border border-[#222428] rounded-lg px-2 py-1.5 text-white"
          >
            <option value="">none</option>
            {projects.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        </div>
      )}

      {/* Input bar */}
      <div className="flex-shrink-0 px-4 md:px-5 pb-4 md:pb-5 pt-2">
        <div className={`flex items-end gap-2 md:gap-3 rounded-2xl border bg-[#141618] px-3 md:px-4 py-2.5 md:py-3 transition-colors
          ${streaming ? 'border-[#222428] opacity-60' : 'border-[#222428] focus-within:border-[#3A3D47]'}`}>
          <TextareaAutosize
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                e.preventDefault(); submit()
              }
            }}
            placeholder={streaming ? 'Agent is working...' : 'Describe what to build...'}
            disabled={streaming}
            minRows={1}
            maxRows={isMobile ? 4 : 6}
            className="flex-1 bg-transparent text-sm text-white placeholder-[#5A5D6A] font-sans leading-relaxed"
          />
          <button
            onClick={submit}
            disabled={!input.trim() || streaming}
            className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all
              ${input.trim() && !streaming
                ? 'bg-[#7C6AF7] text-white hover:bg-[#6B5BE6] active:scale-95'
                : 'bg-[#1C1E22] text-[#5A5D6A] cursor-not-allowed'
              }`}
          >
            {streaming
              ? <div className="w-3 h-3 rounded border-2 border-[#5A5D6A] spin" />
              : <SendIcon />
            }
          </button>
        </div>
        {!isMobile && (
          <p className="text-xs text-[#3A3D47] mt-1.5 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        )}
      </div>
    </div>
  )
}

function UserMessage({ text }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] md:max-w-[70%] bg-[#1C1E22] border border-[#2A2D35] rounded-2xl rounded-tr-sm px-4 py-3">
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/90">{text}</p>
      </div>
    </div>
  )
}

function AgentMessage({ msg, isMobile }) {
  const [expanded, setExpanded] = useState(true)
  const modelColor = MODEL_COLORS[msg.model] || '#7C6AF7'
  const stepCount  = msg.steps?.length || 0

  return (
    <div className="flex gap-2.5 md:gap-3">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center"
        style={{ background: '#7C6AF717', border: '1px solid #7C6AF730' }}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="1.5" fill="#7C6AF7" opacity="0.9"/>
          <rect x="9" y="2" width="5" height="5" rx="1.5" fill="#7C6AF7" opacity="0.5"/>
          <rect x="2" y="9" width="5" height="5" rx="1.5" fill="#7C6AF7" opacity="0.5"/>
          <rect x="9" y="9" width="5" height="5" rx="1.5" fill="#7C6AF7" opacity="0.9"/>
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-white">DevAgent</span>
          {msg.model && (
            <span className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{ background: modelColor + '18', color: modelColor }}>
              {msg.model}
            </span>
          )}
        </div>

        {/* Steps */}
        {stepCount > 0 && (
          <div className="mb-3 rounded-2xl border border-[#222428] overflow-hidden bg-[#141618]">
            <button
              onClick={() => setExpanded(e => !e)}
              className="w-full px-3.5 py-2.5 flex items-center gap-2 hover:bg-[#1C1E22] transition-colors"
            >
              <div className="flex -space-x-1">
                {msg.steps.slice(0, 3).map((s, i) => {
                  const meta  = TOOL_META[s.icon] || TOOL_META.tool
                  const Icon  = meta.icon
                  return (
                    <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center bg-[#1C1E22] border border-[#2A2D35]"
                      style={{ color: meta.color }}>
                      <Icon size={10} />
                    </div>
                  )
                })}
              </div>
              <span className="text-xs text-[#5A5D6A] flex-1 text-left">
                {stepCount} action{stepCount !== 1 ? 's' : ''}
              </span>
              {msg.thinking && (
                <span className="text-xs text-[#7C6AF7] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7C6AF7] pulse-dot inline-block"/>
                  working
                </span>
              )}
              <ChevronIcon down={expanded} />
            </button>

            {expanded && (
              <div className="divide-y divide-[#222428]">
                {msg.steps.map((step, i) => (
                  <StepRow key={step.id || i} step={step} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Thinking dots */}
        {msg.thinking && !msg.text && (
          <div className="flex items-center gap-1.5 py-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#3A3D47]"
                style={{ animation: `pulse-dot 1.2s ease infinite`, animationDelay: `${i*0.15}s` }} />
            ))}
          </div>
        )}

        {/* Text */}
        {msg.text && (
          <div className={`text-sm leading-relaxed whitespace-pre-wrap
            ${msg.isError ? 'text-[#E05252]' : 'text-white/85'}`}>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  )
}

function StepRow({ step }) {
  const meta    = TOOL_META[step.icon] || TOOL_META.tool
  const Icon    = meta.icon
  const isDone  = step.status === 'done'
  const isErr   = step.status === 'error'
  const running = step.status === 'running'

  return (
    <div className="px-3.5 py-2.5 slide-left">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center">
          {running  && <div className="w-3.5 h-3.5 rounded-full border-2 border-[#7C6AF7] border-t-transparent spin"/>}
          {isDone   && <DoneIcon />}
          {isErr    && <ErrIcon />}
          {!running && !isDone && !isErr && <Icon size={12} style={{ color: meta.color }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-[#5A5D6A]">{step.label}</span>
            <span className="text-xs font-mono text-white/60 truncate max-w-[200px]">{step.preview}</span>
          </div>
          {step.output?.length > 0 && (
            <div className="mt-0.5 space-y-0.5">
              {step.output.slice(0,2).map((line, i) => (
                <div key={i} className="text-xs font-mono text-[#5A5D6A] truncate">{line}</div>
              ))}
            </div>
          )}
          {isErr && step.error && (
            <div className="text-xs text-[#E05252] mt-1 font-mono truncate">{step.error}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChevronIcon({ down }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: down ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}>
      <path d="M2 4l4 4 4-4" stroke="#5A5D6A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SendIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2L9 14 7 9 2 7l12-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/></svg> }
function FolderIcon({size=12}) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M2 4h4l2 2h6v7H2V4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg> }
function FileIcon({size=12})   { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M9 2H4v12h8V7L9 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M9 2v5h5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg> }
function EyeIcon({size=12})    { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></svg> }
function ListIcon({size=12})   { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M5 4h8M5 8h8M5 12h8M2 4h.5M2 8h.5M2 12h.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> }
function GridIcon2({size=12})  { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg> }
function TermIcon({size=12})   { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 6l3 2-3 2M9 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function PlayIcon({size=12})   { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M6.5 5.5l4 2.5-4 2.5V5.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg> }
function PkgIcon({size=12})    { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M8 2l5 3v6L8 14 3 11V5L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg> }
function WrenchIcon({size=12}) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M11 2a3 3 0 00-2.83 4L3 11a1.41 1.41 0 002 2l5-5.17A3 3 0 0011 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg> }
function TrashIcon({size=12})  { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M3 5h10M6 5V3h4v2M5 5l1 8h4l1-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function CheckIcon2({size=12}) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M3 9l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function CircleIcon({size=12}) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.3"/></svg> }
function DoneIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="#3ECF8E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function ErrIcon()  { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 4v4.5M8 11v1" stroke="#E05252" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="8" r="5.5" stroke="#E05252" strokeWidth="1.3"/></svg> }
