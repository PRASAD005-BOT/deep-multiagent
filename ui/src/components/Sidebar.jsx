import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import axios from 'axios'

const MODEL_COLORS = {
  auto:'#888', kimi:'#E8831A', gpt5:'#10A37F',
  gemini3:'#4285F4', claude:'#CC785C', minimax:'#9B59B6'
}

const NAV = [
  { id: 'chat',     icon: ChatIcon,  label: 'Command'  },
  { id: 'projects', icon: GridIcon,  label: 'Projects' },
]

const NAV_FOOTER = [
  { id: 'settings', icon: GearIcon, label: 'Settings' },
]

export default function Sidebar({
  user,
  view, setView, model, setModel, models,
  projectCount, memoryBuilds,
  isMobile, isTablet, isOpen, onClose,
  theme, onToggleTheme,
  chats, activeChatId, onSwitchChat, onNewChat, onDeleteChat
}) {
  const collapsed = isTablet && !isMobile && !isOpen

  return (
    <AnimatePresence>
      {isMobile && isOpen && (
        <motion.aside 
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed left-0 top-0 bottom-0 w-72 z-[60] flex flex-col bg-[#1e1f20] shadow-[15px_0_50px_rgba(0,0,0,0.8)]"
        >
          <SidebarContent
            view={view} setView={setView}
            model={model} setModel={setModel}
            models={models}
            projectCount={projectCount}
            memoryBuilds={memoryBuilds}
            collapsed={false}
            onClose={onClose}
            isMobile={true}
            theme={theme}
            onToggleTheme={onToggleTheme}
            chats={chats}
            activeChatId={activeChatId}
            onSwitchChat={onSwitchChat}
            onNewChat={onNewChat}
            onDeleteChat={onDeleteChat}
          />
        </motion.aside>
      )}

      {(!isMobile) && (
        <aside
          className="flex-shrink-0 flex flex-col bg-[#1e1f20] transition-all duration-300 relative z-30"
          style={{ width: collapsed ? '68px' : '280px' }}
        >
          <SidebarContent
            user={user}
            view={view} setView={setView}
            model={model} setModel={setModel}
            models={models}
            projectCount={projectCount}
            memoryBuilds={memoryBuilds}
            collapsed={collapsed}
            isMobile={false}
            theme={theme}
            onToggleTheme={onToggleTheme}
            chats={chats}
            activeChatId={activeChatId}
            onSwitchChat={onSwitchChat}
            onNewChat={onNewChat}
            onDeleteChat={onDeleteChat}
          />
        </aside>
      )}
    </AnimatePresence>
  )
}

function SidebarContent({
  user,
  view, setView, model, setModel, models,
  projectCount, memoryBuilds, collapsed, onClose, isMobile,
  theme, onToggleTheme,
  chats = [], activeChatId, onSwitchChat, onNewChat, onDeleteChat
}) {
  const [profile, setProfile] = useState(null)
  const API_BASE = import.meta.env.VITE_APIBASE || "http://localhost:10000";

  useEffect(() => {
    if (user && supabase) {
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => setProfile(data))
    }
  }, [user])

  const getFullUrl = (url) => {
    if (!url) return '';
    const base = API_BASE.startsWith('http') ? API_BASE : `http://${API_BASE}`;
    return `${base}${url}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f20]">
      {/* Brand & Menu Header */}
      <div className={`flex items-center mb-4 ${collapsed ? 'px-3 py-4 flex-col' : 'px-4 py-4 justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-accent/10 border border-accent/20">
               <AgentLogo size={14} className="text-accent shadow-sm" />
            </div>
            <span className="text-sm font-black uppercase tracking-[0.3em] text-white/90">Devagent</span>
          </div>
        )}
        {isMobile && onClose && (
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70">
            <CloseIcon />
          </button>
        )}
      </div>

      {/* New Chat Button - Gemini Style */}
      {!collapsed && (
        <div className="px-4 mb-6">
          <button 
            onClick={onNewChat}
            className="flex items-center gap-3 px-5 py-3.5 rounded-full bg-[#2e2f30] hover:bg-[#3e3f40] text-white/90 transition-all group active:scale-95 shadow-sm"
          >
            <PlusIcon size={20} className="text-white/60 group-hover:text-white" />
            <span className="text-sm font-medium tracking-tight">New chat</span>
          </button>
        </div>
      )}
      {collapsed && (
        <div className="px-2 mb-6">
          <button 
            onClick={onNewChat}
            className="w-10 h-10 rounded-full bg-[#2e2f30] hover:bg-[#3e3f40] flex items-center justify-center text-white/60 mx-auto transition-all"
          >
            <PlusIcon size={18} />
          </button>
        </div>
      )}

      {/* Navigation / History */}
      <div className={`flex-1 flex flex-col overflow-y-auto no-scrollbar ${collapsed ? 'px-2' : 'px-4'}`}>
        
        {/* Recent Chats Section */}
        {!collapsed && chats.length > 0 && (
          <div className="mb-4">
            <p className="px-5 py-2 text-[13px] font-medium text-white/50">Recent</p>
            <div className="flex flex-col gap-0.5 mt-1">
              {chats.slice(0, 10).map(chat => (
                <div
                  key={chat.id}
                  onClick={() => onSwitchChat(chat.id)}
                  className={`w-full text-left px-5 py-2.5 rounded-full text-[13px] font-medium transition-all truncate pr-8 group relative cursor-pointer
                    ${activeChatId === chat.id 
                      ? 'bg-[#2e2f30] text-white' 
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <ChatIcon size={16} active={activeChatId === chat.id} />
                    <span className="truncate">{chat.title}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id) }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-white/0 group-hover:text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
                    title="Delete Chat"
                  >
                    <TrashIcon size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories / Gems */}
        <div className={`mt-4 ${!collapsed ? 'pt-6' : ''}`}>
          <nav className="flex flex-col gap-0.5">
            {NAV.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`group w-full flex items-center rounded-full transition-all duration-200
                  ${collapsed ? 'justify-center py-4' : 'gap-3 px-5 py-2.5'}
                  ${view === item.id
                    ? 'bg-[#2e2f30] text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <item.icon size={18} active={view === item.id} />
                {!collapsed && (
                  <span className="text-[13px] font-medium flex-1 text-left tracking-tight">{item.label}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Model Selector Section - Restored */}
        {!collapsed && (
          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="px-5 py-2 text-[11px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Model</p>
            <div className="flex flex-col gap-1">
              {models.map(m => (
                <button
                  key={m.key}
                  onClick={() => setModel(m.key)}
                  className={`w-full text-left px-5 py-2 rounded-full text-[13px] font-medium transition-all flex items-center gap-3
                    ${model === m.key 
                      ? 'bg-white/5 text-white' 
                      : 'text-white/40 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <div 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ background: MODEL_COLORS[m.key] || '#888' }}
                  />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* Profile & Footer Section */}
      <div className={`mt-auto border-t border-white/5 ${collapsed ? 'py-4 px-2' : 'px-4 py-4'} space-y-1`}>
        {/* User Profile */}
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-2xl bg-white/[0.02] border border-white/5">
            {profile?.avatar_url ? (
              <img 
                src={getFullUrl(profile.avatar_url)} 
                alt="Avatar" 
                crossOrigin="anonymous"
                onError={(e) => console.error("Avatar Load Error:", e.target.src)}
                onLoad={() => console.log("Avatar Load Success:", getFullUrl(profile.avatar_url))}
                className="w-10 h-10 rounded-xl object-cover border border-white/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent font-black text-xs">
                {user.email?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-white/90 truncate uppercase tracking-tight">{user.email?.split('@')[0]}</p>
              <p className="text-[9px] font-bold text-white/20 truncate uppercase tracking-widest leading-none">Neural Link Active</p>
            </div>
          </div>
        )}

        {/* Settings restoration */}
        {NAV_FOOTER.map(item => (
          <button 
            key={item.label} 
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 rounded-full transition-all text-[13px] font-medium 
              ${collapsed ? 'justify-center py-4' : 'px-5 py-2.5'}
              ${view === item.id 
                ? 'bg-[#2e2f30] text-white shadow-sm' 
                : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
          >
             <item.icon size={18} active={view === item.id} />
             {!collapsed && <span>{item.label}</span>}
          </button>
        ))}

        {/* Logout Button */}
        <button 
          onClick={() => supabase.auth.signOut()}
          className={`w-full flex items-center gap-3 rounded-full transition-all text-[13px] font-medium text-red-400/60 hover:bg-red-500/5 hover:text-red-500
            ${collapsed ? 'justify-center py-4' : 'px-5 py-2.5'}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )
}

function MenuIcon({ className }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  )
}

function PlusIcon({ className, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )
}

function HelpIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  )
}

function HistoryIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><polyline points="12 7 12 12 16 14"></polyline>
    </svg>
  )
}

function TrashIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
    </svg>
  )
}

function GearIcon({ size = 18, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={active ? 'text-accent' : ''}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function BrainIcon({ size = 18, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={active ? 'text-accent' : ''}>
      <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="12" cy="9" r="1"/><circle cx="12" cy="15" r="1"/><path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 16a7 7 0 1 1 7-7 7 7 0 0 1-7 7z"/>
    </svg>
  )
}

function GridIcon({ size = 18, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={active ? 'text-accent' : ''}>
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function ChatIcon({ size = 18, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={active ? 'text-white' : ''}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  )
}

function AgentLogo({ size = 14, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
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
