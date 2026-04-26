const MODEL_COLORS = {
  auto:'#888', kimi:'#E8831A', gpt5:'#10A37F',
  gemini3:'#4285F4', claude:'#CC785C', minimax:'#9B59B6',
  // Direct Gemini
  'gemini-flash':'#4285F4', 'gemini-pro':'#34A853',
  'gemini-flash-lite':'#FBBC05', 'gemini-2-5-pro':'#EA4335',
}

const NAV = [
  { id: 'chat',     icon: ChatIcon,  label: 'Chat'     },
  { id: 'projects', icon: GridIcon,  label: 'Projects' },
  { id: 'memory',   icon: BrainIcon, label: 'Memory'   },
]

export default function Sidebar({
  view, setView, model, setModel, models,
  projectCount, memoryBuilds,
  isMobile, isTablet, isOpen, onClose
}) {
  const collapsed = isTablet && !isMobile && !isOpen

  if (isMobile) {
    if (!isOpen) return null
    return (
      <aside className="fixed left-0 top-0 bottom-0 w-72 z-50 flex flex-col bg-[#141618] border-r border-[#222428] drawer-in">
        <SidebarContent
          view={view} setView={setView}
          model={model} setModel={setModel}
          models={models}
          projectCount={projectCount}
          memoryBuilds={memoryBuilds}
          collapsed={false}
          onClose={onClose}
          isMobile={true}
        />
      </aside>
    )
  }

  return (
    <aside
      className="flex-shrink-0 flex flex-col bg-[#141618] border-r border-[#222428] transition-all duration-200"
      style={{ width: collapsed ? '60px' : '220px' }}
    >
      <SidebarContent
        view={view} setView={setView}
        model={model} setModel={setModel}
        models={models}
        projectCount={projectCount}
        memoryBuilds={memoryBuilds}
        collapsed={collapsed}
        isMobile={false}
      />
    </aside>
  )
}

function SidebarContent({
  view, setView, model, setModel, models,
  projectCount, memoryBuilds, collapsed, onClose, isMobile
}) {
  return (
    <>
      {/* Logo */}
      <div className={`border-b border-[#222428] flex items-center gap-3 flex-shrink-0
        ${collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4'}`}>
        <div className="w-8 h-8 rounded-xl bg-[#7C6AF7] flex items-center justify-center flex-shrink-0">
          <AgentLogo />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white leading-tight">DevAgent</div>
            <div className="text-xs text-[#5A5D6A]">AI Builder</div>
          </div>
        )}
        {isMobile && onClose && (
          <button onClick={onClose}
            className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1C1E22] transition-colors flex-shrink-0">
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={`py-2 flex flex-col gap-0.5 ${collapsed ? 'px-2' : 'px-2'}`}>
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            title={collapsed ? item.label : undefined}
            className={`w-full flex items-center rounded-xl transition-all
              ${collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-2.5'}
              ${view === item.id
                ? 'bg-[#1C1E22] text-white border border-[#2A2D35]'
                : 'text-[#5A5D6A] hover:text-white hover:bg-[#1C1E22]'
              }`}
          >
            <item.icon size={16} />
            {!collapsed && (
              <>
                <span className="text-sm flex-1 text-left">{item.label}</span>
                {item.id === 'projects' && projectCount > 0 && (
                  <span className="text-xs text-[#5A5D6A] font-mono">{projectCount}</span>
                )}
                {item.id === 'memory' && memoryBuilds > 0 && (
                  <span className="text-xs text-[#5A5D6A] font-mono">{memoryBuilds}</span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-[#222428] my-1" />

      {/* Model picker */}
      {!collapsed && (
        <div className="px-3 py-2 flex-1 overflow-y-auto">
          <p className="text-xs text-[#5A5D6A] mb-2 px-1 font-medium uppercase tracking-wider">Model</p>
          <div className="flex flex-col gap-0.5">
            {/* OpenRouter models */}
            {models.filter(m => !m.group || m.group !== 'gemini').map(m => (
              <button
                key={m.key}
                onClick={() => setModel(m.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all
                  ${model === m.key
                    ? 'bg-[#1C1E22] text-white border border-[#2A2D35]'
                    : 'text-[#5A5D6A] hover:text-white hover:bg-[#1C1E22]'
                  }`}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: MODEL_COLORS[m.key] || '#888' }} />
                <span className="flex-1 text-left leading-tight">{m.label}</span>
                {model === m.key && <div className="w-1.5 h-1.5 rounded-full bg-[#7C6AF7] flex-shrink-0" />}
              </button>
            ))}

            {/* Gemini Direct group divider */}
            {models.some(m => m.group === 'gemini') && (
              <>
                <div className="flex items-center gap-2 px-1 pt-3 pb-1">
                  <div className="h-px flex-1 bg-[#222428]" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#4285F4]/70 flex items-center gap-1">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Gemini Direct
                  </span>
                  <div className="h-px flex-1 bg-[#222428]" />
                </div>
                {models.filter(m => m.group === 'gemini').map(m => (
                  <button
                    key={m.key}
                    onClick={() => setModel(m.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all
                      ${model === m.key
                        ? 'bg-[#1C1E22] text-white border border-[#2A2D35]'
                        : 'text-[#5A5D6A] hover:text-white hover:bg-[#1C1E22]'
                      }`}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: MODEL_COLORS[m.key] || '#4285F4' }} />
                    <span className="flex-1 text-left leading-tight">{m.label}</span>
                    {model === m.key && <div className="w-1.5 h-1.5 rounded-full bg-[#7C6AF7] flex-shrink-0" />}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Collapsed model dot */}
      {collapsed && (
        <div className="flex-1 flex flex-col items-center py-2 gap-2">
          {models.map(m => (
            <button
              key={m.key}
              onClick={() => setModel(m.key)}
              title={m.label}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all
                ${model === m.key ? 'ring-2 ring-[#7C6AF7] ring-offset-1 ring-offset-[#141618]' : 'hover:scale-110'}`}
              style={{ background: (MODEL_COLORS[m.key] || '#888') + '30' }}
            >
              <div className="w-2.5 h-2.5 rounded-full"
                style={{ background: MODEL_COLORS[m.key] || '#888' }} />
            </button>
          ))}
        </div>
      )}

      {/* Status */}
      <div className={`border-t border-[#222428] ${collapsed ? 'px-2 py-3 flex justify-center' : 'px-4 py-3'}`}>
        {collapsed ? (
          <div className="w-2 h-2 rounded-full bg-[#3ECF8E] pulse-dot" />
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] pulse-dot" />
            <span className="text-xs text-[#5A5D6A]">Server connected</span>
          </div>
        )}
      </div>
    </>
  )
}

function AgentLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1.5" fill="white" opacity="0.9"/>
      <rect x="9" y="2" width="5" height="5" rx="1.5" fill="white" opacity="0.5"/>
      <rect x="2" y="9" width="5" height="5" rx="1.5" fill="white" opacity="0.5"/>
      <rect x="9" y="9" width="5" height="5" rx="1.5" fill="white" opacity="0.9"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="#5A5D6A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function ChatIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M13 9.5c0 .6-.4 1-1 1H5l-2.5 2.5V3c0-.6.4-1 1-1h9.5c.6 0 1 .4 1 1v6.5z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

export function GridIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="9" y="2" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="2" y="9" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="9" y="9" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  )
}

export function BrainIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 4v4.5l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
