export default function BottomNav({ view, setView, streaming }) {
  const TABS = [
    { id: 'chat',     icon: ChatIcon,     label: 'Command'  },
    { id: 'projects', icon: ProjectsIcon, label: 'Projects' },
    { id: 'memory',   icon: MemoryIcon,   label: 'Memory'   },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' },
  ]

  return (
    <nav className="flex-shrink-0 border-t border-white/[0.04]" style={{ background: '#0A0B0D' }}>
      <div className="flex">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors relative"
            style={{ color: view === tab.id ? '#7C6AF7' : 'rgba(255,255,255,0.25)' }}
          >
            <tab.icon size={20} active={view === tab.id} />
            <span className="text-[10px] font-semibold">{tab.label}</span>
            {tab.id === 'chat' && streaming && (
              <div
                className="absolute w-1.5 h-1.5 rounded-full bg-[#7C6AF7] animate-pulse"
                style={{ top: '8px', right: 'calc(50% - 14px)' }}
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}

function ChatIcon({ size = 18, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={active ? '#7C6AF7' : 'currentColor'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function ProjectsIcon({ size = 18, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={active ? '#7C6AF7' : 'currentColor'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function MemoryIcon({ size = 18, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={active ? '#7C6AF7' : 'currentColor'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
    </svg>
  )
}

function SettingsIcon({ size = 18, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={active ? '#7C6AF7' : 'currentColor'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
