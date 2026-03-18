export default function MemoryPanel({ memory, onRefresh, isMobile }) {
  if (!memory) return (
    <div className="flex-1 flex items-center justify-center text-[#5A5D6A] text-sm h-full">
      Loading memory...
    </div>
  )

  const { stats, projects, history } = memory
  const projectList = Object.entries(projects || {})
  const recentHistory = (history || []).slice(-8).reverse()

  const STATS = [
    { label: 'Builds',   value: stats?.total_builds || 0, color: '#7C6AF7' },
    { label: 'Fixed',    value: stats?.total_fixes  || 0, color: '#3ECF8E' },
    { label: 'Projects', value: projectList.length,       color: '#E8831A' },
    { label: 'Messages', value: history?.length    || 0, color: '#4285F4' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 md:px-6 py-3.5 border-b border-[#222428] flex items-center justify-between">
        <span className="text-sm font-medium text-white">Memory</span>
        <button onClick={onRefresh}
          className="text-xs text-[#5A5D6A] hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-[#1C1E22]">
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 flex flex-col gap-6">

        {/* Stats grid — 2 cols mobile, 4 cols desktop */}
        <div>
          <p className="text-xs text-[#5A5D6A] font-medium uppercase tracking-wider mb-3">Overview</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STATS.map(s => (
              <div key={s.label}
                className="bg-[#141618] border border-[#222428] rounded-2xl p-4 flex flex-col gap-1">
                <div className="text-2xl font-mono font-medium" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className="text-xs text-[#5A5D6A]">{s.label}</div>
              </div>
            ))}
          </div>
          {stats?.first_used && (
            <p className="text-xs text-[#3A3D47] font-mono mt-2">
              Since {stats.first_used} · Last: {stats.last_used}
            </p>
          )}
        </div>

        {/* Projects */}
        {projectList.length > 0 && (
          <div>
            <p className="text-xs text-[#5A5D6A] font-medium uppercase tracking-wider mb-3">Known projects</p>
            <div className="flex flex-col gap-2">
              {projectList.map(([name, data]) => (
                <div key={name}
                  className="bg-[#141618] border border-[#222428] rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{name}</div>
                    {data.description && (
                      <div className="text-xs text-[#5A5D6A] truncate mt-0.5 hidden md:block">
                        {data.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono text-[#5A5D6A] hidden md:block">{data.stack}</span>
                    <div className="w-2 h-2 rounded-full"
                      style={{ background: data.status === 'built' ? '#3ECF8E' : '#E05252' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat history */}
        {recentHistory.length > 0 && (
          <div>
            <p className="text-xs text-[#5A5D6A] font-medium uppercase tracking-wider mb-3">Recent activity</p>
            <div className="bg-[#141618] border border-[#222428] rounded-2xl overflow-hidden divide-y divide-[#222428]">
              {recentHistory.map((msg, i) => (
                <div key={i} className="flex gap-3 px-4 py-3">
                  <span className={`text-xs flex-shrink-0 font-mono mt-0.5 w-7
                    ${msg.role === 'user' ? 'text-[#7C6AF7]' : 'text-[#3ECF8E]'}`}>
                    {msg.role === 'user' ? 'you' : 'bot'}
                  </span>
                  <span className="text-xs text-[#5A5D6A] flex-1 leading-relaxed line-clamp-2">
                    {msg.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {projectList.length === 0 && recentHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#5A5D6A] text-sm gap-2">
            <p>Memory is empty</p>
            <p className="text-xs opacity-50">Build projects to see them here</p>
          </div>
        )}
      </div>
    </div>
  )
}
