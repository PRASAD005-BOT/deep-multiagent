import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import ProjectsPanel from './components/ProjectsPanel.jsx'
import SettingsPanel from './SettingsPanel.jsx'
import BottomNav from './components/BottomNav.jsx'
import IDERoute from './IDERoute.jsx'
import Login from './Login.jsx'
import { supabase } from './lib/supabase'
const API_BASE =
  import.meta.env.VITE_API_BASEURL ||
  "http://localhost:10000";
const API = `${API_BASE}/api`

function MobileHeader({ onMenuClick, view }) {
  const titles = { chat: 'Neural Chat', projects: 'Projects', memory: 'Cognitive Memory', settings: 'Settings' }
  return (
    <div className="h-16 flex flex-shrink-0 items-center justify-between px-6 bg-[#1e1f20]/80 backdrop-blur-md border-b border-white/5 z-40">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white/70">
          <MenuIcon size={20} />
        </button>
        <span className="text-sm font-black uppercase tracking-widest text-white/90">{titles[view] || 'Devagent'}</span>
      </div>
      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      </div>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('chat')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [model, setModel] = useState('auto')
  const [models, setModels] = useState([])
  const [projects, setProjects] = useState([])
  const [memory, setMemory] = useState(null)
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isTablet, setIsTablet] = useState(window.innerWidth < 1024)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [notifications, setNotifications] = useState([])

  const addNotification = useCallback((message, type = 'info') => {
    const id = uuidv4()
    setNotifications(prev => [...prev, { id, message, type }])
    const timeout = type === 'error' ? 10000 : 5000
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, timeout)
  }, [])

  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: "DevAgent Online. Awaiting architecture instructions.",
    id: 'welcome',
    steps: [],
  }])
  const [streaming, setStreaming] = useState(false)
  const esRef = useRef(null)

  useEffect(() => {
    document.body.className = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const handle = () => {
      const w = window.innerWidth
      setIsMobile(w < 768)
      setIsTablet(w < 1024)
      if (w >= 1024) setSidebarOpen(false)
    }
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  const loadProjects = useCallback(async () => {
    console.log("DEBUG: Calling loadProjects at", `${API}/projects`);
    try {
      const r = await axios.get(`${API}/projects`);
      console.log("DEBUG: loadProjects success:", r.data);
      setProjects(r.data)
    }
    catch (e) {
      console.error("DEBUG: loadProjects error:", e.response?.status, e.response?.data || e.message);
    }
  }, [])

  const switchChat = useCallback(async (id) => {
    setActiveChatId(id)
    try {
      const r = await axios.get(`${API}/chats/${id}`)
      setMessages(r.data.map(m => ({
        role: m.role,
        text: m.content,
        image: m.image,
        id: uuidv4(),
        steps: []
      })))
      setView('chat')
    } catch (e) { }
  }, [])

  const createNewChat = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/chats`)
      const existingNew = r.data.find(c => c.title === 'New Chat')
      if (existingNew) {
        switchChat(existingNew.id)
        return
      }

      const res = await axios.post(`${API}/chats`, { title: 'New Chat' })
      setActiveChatId(res.data.id)
      setMessages([{
        role: 'assistant',
        text: "New session initialized. How can I help you build today?",
        id: 'welcome',
        steps: [],
      }])
      setChats(prev => [res.data, ...prev])
      setView('chat')
    } catch (e) { }
  }, [switchChat])

  const loadChats = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/chats`)
      setChats(r.data)
      if (r.data.length > 0 && !activeChatId) {
        switchChat(r.data[0].id)
      }
    } catch (e) { }
  }, [activeChatId, switchChat])

  const loadMemory = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/memory`)
      setMemory(r.data)
      loadChats()
    }
    catch (e) { }
  }, [loadChats])

  const deleteChat = useCallback(async (id) => {
    try {
      await axios.delete(`${API}/chats/${id}`)
      setChats(prev => prev.filter(c => c.id !== id))
      if (activeChatId === id) {
        const remaining = chats.filter(c => c.id !== id)
        if (remaining.length > 0) {
          switchChat(remaining[0].id)
        } else {
          createNewChat()
        }
      }
    } catch (e) { }
  }, [activeChatId, chats, switchChat, createNewChat])

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("DEBUG: Initial session:", session ? "Found" : "None");
      setUser(session?.user ?? null)
      setAuthLoading(false)

      if (session?.access_token) {
        console.log("DEBUG: Setting default Auth header");
        axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("DEBUG: Auth change event:", _event, session ? "Session active" : "No session");
      setUser(session?.user ?? null)
      if (session?.access_token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        delete axios.defaults.headers.common['Authorization'];
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    axios.get(`${API}/models`).then(r => setModels(r.data)).catch(() => { })
    loadProjects()
    loadMemory()
  }, [loadProjects, loadMemory, view, user])

  const sendMessage = useCallback(async (text, projectName = '', imageData = null) => {
    if ((!text.trim() && !imageData) || streaming) return

    if (isMobile) setSidebarOpen(false)

    const userMsg = { role: 'user', text, id: uuidv4(), image: imageData }
    const agentMsg = { role: 'assistant', text: '', id: uuidv4(), steps: [], thinking: true }

    setMessages(prev => [...prev, userMsg, agentMsg])
    setStreaming(true)

    const streamId = uuidv4()

    try {
      await axios.post(`${API}/run`, {
        task: text, model, project_name: projectName, stream_id: streamId, image: imageData, chat_id: activeChatId
      })

      if (esRef.current) esRef.current.close()
      const es = new EventSource(`${API}/stream/${streamId}`)
      esRef.current = es

      es.onmessage = (e) => {
        try {
          const { event: ev, data: d = {} } = JSON.parse(e.data)

          setMessages(prev => {
            const copy = [...prev]
            const last = { ...copy[copy.length - 1] }

            if (ev === 'thinking') {
              last.thinking = true
              last.model = d.model
            } else if (ev === 'thought') {
              last.thinking = false
            } else if (ev === 'tool_start') {
              last.steps = [...(last.steps || []), { ...d, id: uuidv4(), status: 'running' }]
            } else if (ev === 'tool_end') {
              const steps = [...(last.steps || [])]
              if (steps.length) {
                const lastStep = steps[steps.length - 1]
                steps[steps.length - 1] = { ...lastStep, status: 'done', output: d.output }
                if (lastStep.tool === 'create_project') loadProjects()
              }
              last.steps = steps
            } else if (ev === 'tool_error') {
              const steps = [...(last.steps || [])]
              if (steps.length) steps[steps.length - 1] = { ...steps[steps.length - 1], status: 'error', error: d.error }
              last.steps = steps
            } else if (ev === 'done') {
              last.text = d.result || 'Done.'
              last.thinking = false
            } else if (ev === 'error') {
              last.text = `Error: ${d.error}`
              last.thinking = false
              last.isError = true
            }

            copy[copy.length - 1] = last
            return copy
          })

          if (ev === 'end') {
            es.close()
            esRef.current = null
            setStreaming(false)
            loadProjects()
            loadMemory()
          }
        } catch { }
      }

      es.onerror = () => { es.close(); setStreaming(false) }

    } catch (err) {
      setStreaming(false)
      setMessages(prev => {
        const copy = [...prev]
        const last = { ...copy[copy.length - 1], text: 'Could not connect to server.', thinking: false, isError: true }
        copy[copy.length - 1] = last
        return copy
      })
    }
  }, [streaming, model, isMobile, loadProjects, loadMemory])

  const handleViewChange = (v) => {
    setView(v)
    if (isMobile) setSidebarOpen(false)
  }

  if (authLoading) return (
    <div className="h-screen w-screen bg-[#050608] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
    </div>
  )

  if (!supabase) return <SetupGuide />
  if (!user) return <Login onLogin={setUser} />

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-bg-deep text-text-main font-sans selection:bg-accent/30 ${theme}`}>

      {/* Mobile Dynamic Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[50]"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <Sidebar
        user={user}
        view={view}
        setView={handleViewChange}
        model={model}
        setModel={setModel}
        models={models}
        projectCount={projects.length}
        memoryBuilds={memory?.stats?.total_builds || 0}
        isMobile={isMobile}
        isTablet={isTablet}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        chats={chats}
        activeChatId={activeChatId}
        onSwitchChat={switchChat}
        onNewChat={createNewChat}
        onDeleteChat={deleteChat}
      />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative border-l border-accent/20 shadow-[-1px_0_0_rgba(59,130,246,0.1)]">
        {isMobile && <MobileHeader onMenuClick={() => setSidebarOpen(true)} view={view} />}

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="h-full w-full"
          >
            {view === 'chat' && (
              <ChatPanel
                messages={messages}
                streaming={streaming}
                onSend={sendMessage}
                onCancel={() => {
                  if (esRef.current) esRef.current.close()
                  setStreaming(false)
                }}
                model={model}
                models={models}
                projects={projects}
                isMobile={isMobile}
                theme={theme}
              />
            )}
            {view === 'projects' && (
              <ProjectsPanel
                projects={projects}
                onRefresh={loadProjects}
                onExplore={(name) => {
                  setSelectedProject(name)
                }}

                onNotify={addNotification}
                isMobile={isMobile}
                API={API}
                onSend={sendMessage}
                onChat={(name) => {
                  setSelectedProject(name)
                }}
              />
            )}
            {selectedProject && (
              <div className="fixed inset-0 z-[60] bg-[#0D0F10]">
                <IDERoute
                  project={selectedProject}
                  onBack={() => setSelectedProject(null)}
                  API={API}
                  models={models}
                  messages={messages}
                  streaming={streaming}
                  onSend={sendMessage}
                  onNotify={addNotification}
                  isMobile={isMobile}
                />

              </div>
            )}
            {view === 'settings' && (
              <SettingsPanel isMobile={isMobile} />
            )}
          </motion.div>
        </AnimatePresence>

        {isMobile && (
          <BottomNav view={view} setView={handleViewChange} streaming={streaming} />
        )}

        {/* Global Notifications */}
        <div className="fixed top-6 right-6 z-[300] flex flex-col gap-3 pointer-events-none">
          <AnimatePresence>
            {notifications.map(n => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className={`pointer-events-auto px-6 py-4 rounded-[24px] border backdrop-blur-3xl shadow-2xl flex items-center gap-4 min-w-[320px] max-w-md
                  ${n.type === 'error'
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : n.type === 'success'
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : 'bg-white/5 border-white/10 text-white/90'
                  }`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0
                  ${n.type === 'error' ? 'bg-red-500/10' : n.type === 'success' ? 'bg-green-500/10' : 'bg-white/5'}`}>
                  {n.type === 'error' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  ) : n.type === 'success' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-0.5">{n.type}</p>
                  <p className="text-[13px] font-medium tracking-tight leading-snug whitespace-pre-wrap">{n.message}</p>
                </div>
                <button
                  onClick={() => setNotifications(prev => prev.filter(nn => nn.id !== n.id))}
                  className="p-2 -mr-2 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function SetupGuide() {
  return (
    <div className="h-screen w-screen bg-[#050608] flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-8 bg-[#0D0F12] border border-white/10 rounded-[40px] p-12 shadow-2xl">
        <div className="w-20 h-20 rounded-[30px] bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-500"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" /></svg>
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-white tracking-tight">Missing Credentials</h2>
          <p className="text-sm text-white/40 leading-relaxed font-medium">
            Supabase authentication is not configured. Please locate your <code className="text-accent bg-accent/10 px-2 py-0.5 rounded font-bold">.env</code> file and populate it with your credentials.
          </p>
        </div>
        <div className="pt-4 border-t border-white/5 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Neural Link Required</p>
          <div className="bg-white/[0.02] rounded-2xl p-4 text-left font-mono text-[10px] text-white/30 space-y-1">
            <p className={import.meta.env.VITE_SUPABASE_URL?.startsWith('http') ? 'text-green-500/50' : 'text-red-500/50'}>
              URL: {import.meta.env.VITE_SUPABASE_URL || 'undefined'}
            </p>
            <p className={import.meta.env.VITE_SUPABASE_ANON_KEY ? 'text-green-500/50' : 'text-red-500/50'}>
              KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '••••' + import.meta.env.VITE_SUPABASE_ANON_KEY.slice(-4) : 'undefined'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MenuIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
