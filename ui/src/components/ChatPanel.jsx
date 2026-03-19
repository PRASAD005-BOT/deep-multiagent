import { useState, useRef, useEffect } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { motion, AnimatePresence } from 'framer-motion'

const QUICK = [
  { icon: '🚀', label: 'E-commerce Site' },
  { icon: '🔐', label: 'Auth System' },
  { icon: '🌩️', label: 'FastAPI Backend' },
  { icon: '📝', label: 'Blog Platform' },
]

const TOOL_META = {
  folder:   { icon: FolderIcon,  color: '#E8831A', label: 'Directory' },
  file:     { icon: FileIcon,    color: '#7C6AF7', label: 'Writing' },
  eye:      { icon: EyeIcon,     color: '#4285F4', label: 'Reading' },
  terminal: { icon: TermIcon,    color: '#3ECF8E', label: 'Exec' },
  play:     { icon: PlayIcon,    color: '#3ECF8E', label: 'Run' },
  package:  { icon: PkgIcon,     color: '#E8831A', label: 'Install' },
  wrench:   { icon: WrenchIcon,  color: '#EF4444', label: 'Fix' },
  check:    { icon: CheckIcon,   color: '#10B981', label: 'Plan' },
  tool:     { icon: ToolIcon,    color: '#5A5D6A', label: 'Tool' },
  lab:      { icon: LabIcon,     color: '#F472B6', label: 'Sandbox' },
}

export default function ChatPanel({ messages, streaming, onSend, onCancel, model, models, projects, isMobile, theme }) {
  const [input, setInput] = useState('')
  const [project, setProject] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileInputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = async () => {
    if ((!input.trim() && !selectedImage) || streaming) return

    let imageData = null
    if (selectedImage) {
      imageData = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(selectedImage)
      })
    }

    onSend(input.trim(), project, imageData)
    setInput('')
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className={`flex flex-col h-full bg-bg-deep relative transition-colors duration-500 no-scrollbar`}>
      
      {/* Dynamic Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60%] bg-accent/5 blur-[120px] pointer-events-none rounded-full overflow-hidden" />

      {/* Header Context Bar */}
      <div className="px-6 py-6 flex items-center justify-between bg-transparent z-20">
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 rounded-full ${streaming ? 'bg-accent pulse' : 'bg-accent/20'}`} />
          {!isMobile && <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted opacity-30">Neural Workspace</span>}
        </div>
        
        <div className="flex items-center gap-4">
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 flex flex-col grid-bg">
        <AnimatePresence mode="wait">
          {messages.length <= 1 ? (
            <motion.div 
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="flex-1 flex flex-col items-center justify-start md:justify-center px-6 pt-8 pb-32 md:pt-0 md:pb-0 relative"
            >
              <div className="max-w-3xl w-full text-left space-y-8">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="space-y-4"
                >
                  <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white/90">
                    Hello! How can I help you today?
                  </h1>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                  {QUICK.map((q, i) => (
                    <motion.button
                      key={q.label}
                      whileHover={{ bg: 'white/5' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onSend(`Build a ${q.label}`)}
                      className="p-5 bg-[#1e1f20] hover:bg-[#2e2f30] border border-white/5 rounded-2xl text-left transition-all h-28 md:h-40 flex flex-col justify-between group"
                    >
                      <span className="text-white/60 text-sm font-medium leading-relaxed group-hover:text-white transition-colors">{q.label}</span>
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-lg">{q.icon}</div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col w-full relative z-10"
            >
              <div className={`max-w-3xl w-full mx-auto ${isMobile ? 'px-4 py-4' : 'px-4 py-8'} space-y-12`}>
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'user' ? (
                      <UserBubble text={msg.text} image={msg.image} />
                    ) : (
                      <AgentBubble msg={msg} />
                    )}
                  </div>
                ))}
                <div ref={bottomRef} className="h-40" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Centered Input Area - Gemini Style */}
      <div className={`flex flex-col items-center px-4 ${isMobile ? 'pb-28' : 'pb-8'} z-30`}>
        <div className="max-w-3xl w-full">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[#1e1f20] rounded-[32px] p-2 border border-white/5 shadow-2xl"
          >
            {/* Image Preview */}
            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="px-4 pt-4 relative group"
                >
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/10 group-hover:border-[#4285F4]/50 transition-all">
                    <img src={imagePreview} alt="Upload" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white/70 hover:text-white transition-colors"
                    >
                      <CloseIcon className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-1 px-2">
              <TextareaAutosize
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
                }}
                placeholder={streaming ? 'Working...' : 'Ask DevAgent...'}
                disabled={streaming}
                minRows={1}
                maxRows={10}
                className="w-full bg-transparent text-[16px] text-white/90 placeholder-white/30 leading-relaxed py-4 px-4 focus:outline-none resize-none no-scrollbar font-medium"
              />

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*"
                className="hidden" 
              />
              
              <div className="flex items-center justify-between pb-2 px-2">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-full hover:bg-white/5 text-white/40 transition-colors"
                    title="Upload File"
                  >
                    <PlusIcon size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={submit}
                    disabled={(!input.trim() && !selectedImage) || streaming}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      (input.trim() || selectedImage) ? 'bg-[#4285F4] text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-white/10'
                    }`}
                  >
                    {streaming ? <Spinner /> : <SendIcon size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function UserBubble({ text, image }) {
  return (
    <div className="flex flex-col gap-3 items-end max-w-[85%] md:max-w-[70%] group">
      {image && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl overflow-hidden bg-bg-surface shadow-2xl relative"
        >
          <img src={image} alt="User Upload" className="w-full max-h-60 object-contain bg-black/20" />
        </motion.div>
      )}
      {text && (
        <div className="bg-white/[0.03] border border-accent/30 text-text-main px-5 py-3 rounded-[24px] shadow-sm transition-all hover:bg-white/[0.05]">
          <p className="text-[14px] font-bold leading-relaxed tracking-tight">{text}</p>
        </div>
      )}
    </div>
  )
}

function AgentBubble({ msg }) {
  const [isTracesOpen, setIsTracesOpen] = useState(false)
  const steps = msg.steps || []
  const hasSteps = steps.length > 0
  
  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      {/* Activity Trace */}
      {hasSteps && (
        <div className="ml-1 pl-6 border-l-2 border-accent/10 space-y-4">
          <button 
            onClick={() => setIsTracesOpen(!isTracesOpen)}
            className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-accent transition-colors"
          >
            <div className="w-4 h-[1px] bg-current opacity-30" />
            {steps.length} Parallel Ops
            <svg className={`w-3 h-3 transition-transform ${isTracesOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          
          <AnimatePresence>
            {isTracesOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2"
              >
                {steps.map((step, i) => (
                  <TraceRow key={i} step={step} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Main Agent Content */}
      <div className="flex-1 min-w-0 bg-white/[0.01] border border-accent/20 rounded-[24px] p-6 shadow-sm">
        <div className="prose prose-invert max-w-none prose-sm">
        {msg.thinking && !msg.text && (
           <div className="flex items-center gap-2 px-1">
             <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
             <span className="text-[10px] font-black uppercase tracking-widest text-accent/60">Processing Neural Stack...</span>
           </div>
        )}
        
        {msg.text && (
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-base md:text-[17px] font-medium leading-[1.75] tracking-tight whitespace-pre-wrap ${msg.isError ? 'text-error font-bold' : 'text-text-main/90'}`}
            >
              {msg.text.split('\n').map((line, i) => {
                const cleanLine = line.replace(/^\s*#+\s+/, '').replace(/\*/g, '').trim();
                if (!cleanLine) return <div key={i} className="h-4" />;

                if (line.match(/^\s*#+\s+/) || line.match(/^\s*\*\*[^*]+\*\*\s*$/)) {
                  return <p key={i} className="font-extrabold text-text-main mb-4 mt-8 text-xl md:text-2xl tracking-tighter leading-none">{cleanLine}</p>
                }
                if (line.match(/^\s*[-*+]\s+/)) {
                  return <div key={i} className="flex gap-3 mb-2 ml-4 text-[14px] text-text-muted">
                    <span className="text-accent/40 mt-2.5 w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                    <span>{cleanLine}</span>
                  </div>
                }
                return <p key={i} className="mb-4 text-[14px] leading-relaxed opacity-80">{cleanLine}</p>
              })}
            </motion.div>

            {/* Response Action Bar (ChatGPT Style) */}
            {!msg.thinking && (
              <div className="flex items-center gap-2 py-2">
                <ActionButton icon={<CopyIcon />} title="Copy" onClick={() => navigator.clipboard.writeText(msg.text)} />
                <ActionButton icon={<ReloadIcon />} title="Regenerate" />
              </div>
            )}

            {/* Media Rendering for fal.ai images */}
            {(() => {
              const urlRegex = /(https?:\/\/[^\s]+(\.png|\.jpg|\.jpeg|\.webp|\.gif|fal\.run\/[^\s]+))/gi;
              const matches = msg.text.match(urlRegex);
              if (!matches) return null;

              return (
                <div className="flex flex-col gap-4 mt-4">
                  {matches.map((url, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group relative max-w-xl rounded-2xl overflow-hidden border border-accent/20 bg-bg-surface shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img 
                          src={url} 
                          alt="AI Generated" 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-transparent to-transparent opacity-60" />
                      </div>
                      
                      <div className="p-4 flex items-center justify-between border-t border-accent/10 bg-bg-hover/50 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-accent uppercase tracking-widest">Generated Asset</div>
                            <div className="text-[11px] text-text-muted font-mono truncate max-w-[200px]">{url}</div>
                          </div>
                        </div>
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold hover:bg-accent/20 transition-all uppercase tracking-tighter"
                        >
                          View Original
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </div>
              );
            })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TraceRow({ step }) {
  const meta = TOOL_META[step.icon] || TOOL_META.tool
  const Icon = meta.icon
  const status = step.status // running, done, error
  
  return (
    <div className="flex items-center gap-4 py-2 group">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-bg-hover border border-accent/10 group-hover:scale-110 transition-transform ${status === 'running' ? 'accent-glow pulse' : ''}`}
        style={{ color: meta.color }}>
        <Icon size={14} />
      </div>
      
      <div className="flex-1 min-w-0">
         <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted/40">{meta.label}</span>
            <span className="text-xs font-mono text-text-muted truncate">{step.preview}</span>
         </div>
      </div>
      
      {status === 'running' && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
      {status === 'done' && <CheckIcon size={12} className="text-success opacity-40" />}
      {status === 'error' && <div className="w-2 h-2 rounded-full bg-error" />}
    </div>
  )
}

function ActionButton({ icon, title, onClick }) {
  const [copied, setCopied] = useState(false)

  const handleClick = (e) => {
    if (title === 'Copy' && onClick) {
      onClick(e)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else if (onClick) {
      onClick(e)
    }
  }

  return (
    <button 
      title={title}
      onClick={handleClick}
      className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted hover:text-text-main transition-all active:scale-90 opacity-40 hover:opacity-100 relative group"
    >
      {copied ? <CheckIcon size={14} className="text-success" /> : icon}
      {copied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-bg-surface border border-accent/20 px-2 py-1 rounded text-[10px] text-success font-bold animate-in fade-in slide-in-from-bottom-1 bubble shadow-xl">
          COPIED
        </span>
      )}
    </button>
  )
}

function CopyIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> }
function LikeIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg> }
function DislikeIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg> }
function ShareIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> }
function ReloadIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg> }
function MoreIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg> }

// Minimalist High-Fidelity Icons
function FolderIcon({size=16}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg> }
function FileIcon({size=16})   { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg> }
function TermIcon({size=16})   { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m7 15 3-3-3-3m5 6h4"/></svg> }
function PlayIcon({size=16})   { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> }
function PkgIcon({size=16})    { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> }
function EyeIcon({size=16})    { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg> }
function WrenchIcon({size=16}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> }
function CheckIcon({size=16, className}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg> }
function ToolIcon({size=16})   { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }
function LabIcon({size=16})    { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.5M14 2v7.5M8.5 2h7M14 11.5c1.66 0 3 1.34 3 3V17c0 2.2-1.8 4-4 4h-2c-2.2 0-4-1.8-4-4v-2.5c0-1.66 1.34-3 3-3"/><path d="M10 16h4"/></svg> }
function SendIcon({size=20}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> }
function Spinner()             { return <div className="w-5 h-5 border-2 border-accent/20 border-t-accent rounded-full animate-spin" /> }

function PlusIcon({ size = 18, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )
}

function CloseIcon({ className }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  )
}
