import { motion } from 'framer-motion'

export default function MemoryPanel({ memory, onRefresh, isMobile }) {
  if (!memory) return null

  const stats = [
    { label: 'Platform Builds', value: memory.stats?.total_builds || 0, icon: '🏗️', color: 'from-blue-500/20' },
    { label: 'Fix Protocols', value: memory.stats?.total_fixes || 0, icon: '🔧', color: 'from-emerald-500/20' },
    { label: 'Active Clusters', value: memory.projects ? Object.keys(memory.projects).length : 0, icon: '📁', color: 'from-purple-500/20' },
    { label: 'Sync Cycles', value: memory.chat_history?.length || 0, icon: '🛰️', color: 'from-amber-500/20' },
  ]

  return (
    <div className="h-full flex flex-col bg-bg-deep relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
      
      <div className="px-4 md:px-8 py-6 md:py-8 flex items-center justify-between border-b border-border z-20 glass">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-text-main">Agent Nexus</h2>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-1">Operational Memory & State</p>
        </div>
        <button 
          onClick={onRefresh}
          className="w-10 h-10 rounded-xl bg-bg-hover border border-border flex items-center justify-center hover:bg-bg-hover/80 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10 space-y-8 md:y-12 custom-scrollbar">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
              whileHover={{ y: -2 }}
              className={`bg-bg-surface border border-border rounded-2xl p-6 flex flex-col relative overflow-hidden group premium-border`}
            >
              <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${s.color} blur-2xl opacity-20`} />
              <div className="text-2xl md:text-3xl font-bold text-text-main mb-4 group-hover:scale-110 transition-transform origin-left">{s.value}</div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                <span className="mr-1.5 opacity-60">{s.icon}</span>
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Operation Logs</h3>
            <div className="flex-1 h-[1px] bg-border" />
          </div>
          <div className="bg-bg-surface border border-border rounded-[24px] overflow-hidden premium-border shadow-sm">
            <div className="divide-y divide-border">
              {(memory.chat_history || []).slice().reverse().map((m, i) => (
                <div key={i} className="px-6 py-4 flex items-start gap-5 hover:bg-bg-hover/50 transition-colors group">
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.role === 'user' ? 'bg-text-muted/30' : 'bg-accent shadow-[0_0_8px_var(--accent)]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${m.role === 'user' ? 'text-text-muted' : 'text-accent'}`}>{m.role}</span>
                      <span className="text-[9px] text-text-muted font-mono group-hover:text-text-main transition-colors">{m.timestamp || 'SYNC'}</span>
                    </div>
                    <p className="text-[13px] text-text-main/70 font-medium leading-relaxed line-clamp-2">{m.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
