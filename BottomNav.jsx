import { ChatIcon, GridIcon, BrainIcon } from './Sidebar.jsx'

const TABS = [
  { id: 'chat',     icon: ChatIcon,  label: 'Chat'     },
  { id: 'projects', icon: GridIcon,  label: 'Projects' },
  { id: 'memory',   icon: BrainIcon, label: 'Memory'   },
]

export default function BottomNav({ view, setView, streaming }) {
  return (
    <nav className="flex-shrink-0 border-t border-[#222428] bg-[#141618] safe-bottom">
      <div className="flex">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors
              ${view === tab.id ? 'text-[#7C6AF7]' : 'text-[#5A5D6A]'}`}
          >
            <tab.icon size={20} />
            <span className="text-[10px] font-medium">{tab.label}</span>
            {tab.id === 'chat' && streaming && (
              <div className="absolute w-1.5 h-1.5 rounded-full bg-[#7C6AF7] pulse-dot" style={{marginTop: '-18px', marginLeft: '12px'}} />
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
