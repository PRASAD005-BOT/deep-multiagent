import { useState, useRef } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function ProjectsPanel({ projects, onRefresh, onLaunch, onExplore, isMobile, API, onSend, onNotify }) {
  const fileInputRef = useRef(null)
  const [showInitModal, setShowInitModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [deletingProject, setDeletingProject] = useState(null)

  const handleUpload = async (e) => {
    const files = e.target.files
    if (!files.length) return
    
    const pathParts = files[0].webkitRelativePath.split('/')
    const projectName = pathParts[0]
    if (!projectName) return
    
    onNotify(`Uploading ${projectName}...`, 'info')
    
    const formData = new FormData()
    for (let f of files) {
      formData.append('files', f)
      formData.append('paths', f.webkitRelativePath)
    }
    
    try {
      await axios.post(`${API}/projects/upload`, formData)
      onNotify(`${projectName} synchronized successfully.`, 'success')
      onRefresh()
    } catch (err) {
      onNotify(`Upload failed: ${err.message}`, 'error')
    }
  }

  const handleDelete = async (name) => {
    try {
      await axios.delete(`${API}/projects/${encodeURIComponent(name)}`)
      onNotify(`Environment ${name} purged.`, 'success')
      setDeletingProject(null)
      onRefresh()
    } catch (err) {
      onNotify("Purge failed: " + err.message, 'error')
    }
  }

  const handleDownload = async (name) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      window.location.href = `${API}/projects/${encodeURIComponent(name)}/download?token=${token}`
    } catch (err) {
      onNotify("Download failed: " + err.message, 'error')
    }
  }

  const handleInit = () => {
    if (!newProjectName.trim()) return
    onSend(`Create a new project named ${newProjectName}`)
    setShowInitModal(false)
    setNewProjectName('')
  }

  return (
    <div className="h-full flex flex-col bg-[#050608] relative transition-all duration-700 overflow-hidden">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpload} 
        webkitdirectory="true" 
        className="hidden" 
      />
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-full h-[30%] bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#7C6AF7]/5 blur-[120px] pointer-events-none rounded-full" />
      
      <div className={`${isMobile ? 'px-6 pt-6 pb-8 flex-col gap-6' : 'px-10 pt-16 pb-12 items-end justify-between'} flex z-20 relative`}>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
             </div>
             <div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-accent accent-glow" />
                   <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent/50">Control Center</span>
                </div>
                <h2 className="text-4xl font-extrabold tracking-tighter text-white">Project Matrix</h2>
             </div>
          </div>
          <p className="text-xs text-text-muted font-medium max-w-md">Orchestrate your autonomous agent development through our neural deployment hub.</p>
        </div>
        
        <div className={`flex items-center gap-3 ${isMobile ? 'flex-wrap w-full justify-start mt-4' : ''}`}>
          <button 
            onClick={() => setShowInitModal(true)}
            className="px-6 py-3.5 rounded-2xl bg-[#7C6AF7] text-white text-[11px] font-black uppercase tracking-widest hover:bg-[#6B5BE6] transition-all shadow-xl shadow-blue-500/10 active:scale-95 flex items-center gap-3"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
            Initialize Project
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-[11px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all active:scale-95 flex items-center gap-3"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            Sync Folder
          </button>
          <button 
            onClick={onRefresh}
            className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center hover:bg-white/[0.08] hover:border-white/[0.1] transition-all group active:scale-95 shadow-sm"
          >
            <svg className="text-white/30 group-hover:text-white transition-colors" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
          </button>
        </div>
      </div>


      <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-6 pb-28' : 'px-10 pb-16'} custom-scrollbar relative z-10 grid-bg`}>
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
          {projects.map((p, i) => (
            <ProjectCard 
              key={p.name} 
              project={p} 
              delay={i * 0.05} 
              onLaunch={onLaunch} 
              onExplore={onExplore} 
              onDelete={(name) => setDeletingProject(name)}
              onDownload={handleDownload}
            />
          ))}
          
          {projects.length === 0 && (
            <div className="col-span-full py-40 flex flex-col items-center justify-center text-center space-y-6">
               <div className="relative">
                  <div className="absolute inset-0 bg-[#7C6AF7]/20 blur-3xl rounded-full scale-150" />
                  <div className="w-24 h-24 rounded-[32px] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/10 relative z-10 transition-transform duration-500 hover:rotate-12">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                  </div>
               </div>
               <div className="space-y-2">
                 <p className="text-white/40 font-black uppercase tracking-[0.4em] text-[10px]">Registry Offline</p>
                 <p className="text-white/10 text-xs font-semibold uppercase tracking-widest">Awaiting first environment initialization</p>
               </div>
            </div>
          )}
        </div>
        </div>

      {/* Initialize Modal */}
      <AnimatePresence>
        {showInitModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
               onClick={() => setShowInitModal(false)} 
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-[#0D0F12] border border-white/10 rounded-[32px] p-10 w-full max-w-md relative z-10 shadow-2xl"
             >
                <div className="flex flex-col items-center text-center space-y-6">
                   <div className="w-16 h-16 rounded-[24px] bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                   </div>
                   <div className="space-y-2">
                     <h3 className="text-2xl font-black text-white tracking-tight">New Environment</h3>
                     <p className="text-xs text-white/30 font-medium uppercase tracking-widest">Define your agent's workspace</p>
                   </div>
                   <input 
                     autoFocus
                     type="text" 
                     placeholder="Environment name..."
                     value={newProjectName}
                     onChange={e => setNewProjectName(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleInit()}
                     className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all font-bold"
                   />
                   <div className="flex w-full gap-3 pt-4">
                      <button 
                        onClick={() => setShowInitModal(false)}
                        className="flex-1 py-4 rounded-2xl border border-white/5 text-white/30 text-[11px] font-black uppercase tracking-widest hover:text-white hover:bg-white/5 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleInit}
                        disabled={!newProjectName.trim()}
                        className="flex-1 py-4 rounded-2xl bg-accent text-white text-[11px] font-black uppercase tracking-widest hover:bg-accent/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-accent/20"
                      >
                        Initialize
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingProject && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
               onClick={() => setDeletingProject(null)} 
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-[#0D0F12] border border-white/10 rounded-[32px] p-10 w-full max-w-md relative z-10 shadow-2xl"
             >
                <div className="flex flex-col items-center text-center space-y-6">
                   <div className="w-16 h-16 rounded-[24px] bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                   </div>
                   <div className="space-y-2">
                     <h3 className="text-2xl font-black text-white tracking-tight">Purge Environment?</h3>
                     <p className="text-xs text-red-500 font-black uppercase tracking-widest">This action cannot be undone</p>
                   </div>
                   <p className="text-white/30 text-[13px] font-medium leading-relaxed">
                     You are about to permanently delete <span className="text-white font-bold">{deletingProject}</span> and all associated neural weights.
                   </p>
                   <div className="flex w-full gap-3 pt-4">
                      <button 
                        onClick={() => setDeletingProject(null)}
                        className="flex-1 py-4 rounded-2xl border border-white/5 text-white/30 text-[11px] font-black uppercase tracking-widest hover:text-white hover:bg-white/5 transition-all"
                      >
                        Keep Safe
                      </button>
                      <button 
                        onClick={() => handleDelete(deletingProject)}
                        className="flex-1 py-4 rounded-2xl bg-red-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-500/20"
                      >
                        Delete Now
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProjectCard({ project, delay, onLaunch, onExplore, onDelete, onDownload }) {
  const STACK_ICONS = {
    'react-vite': '⚛️', 'vue': '🖖', 'nodejs': '🟢', 'html': '🌐', 'flask/fastapi': '🐍'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0, transition: { delay, type:'spring', damping:25, stiffness: 120 } }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group bg-[#0D0F12] border border-white/[0.04] rounded-[28px] p-7 transition-all hover:bg-[#111318] hover:border-accent/30 flex flex-col h-[320px] relative overflow-hidden shadow-2xl"
    >
      <div 
        className="absolute inset-0 z-0 cursor-pointer" 
        onClick={() => onExplore(project.name)}
      />

      <div className="flex justify-between items-start mb-6 relative z-10 pointer-events-none">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-3xl group-hover:bg-accent/10 group-hover:border-accent/40 group-hover:text-accent transition-all duration-500 shadow-inner overflow-hidden">
          <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative z-10 group-hover:scale-110 transition-transform duration-500">{STACK_ICONS[project.stack] || '📁'}</span>
        </div>
        <div className="flex flex-col items-end">
           <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.03] border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] shadow-[0_0_8px_rgba(62,207,142,0.4)]" />
              <span className="text-[8px] font-black uppercase tracking-widest text-[#3ECF8E]">Online</span>
           </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 relative z-10 pointer-events-none">
        <h3 className="text-xl font-black text-white/90 mb-2 truncate group-hover:text-white transition-colors tracking-tight">{project.name}</h3>
        <p className="text-[12px] text-white/30 leading-relaxed line-clamp-2 font-medium tracking-tight pr-4 group-hover:text-white/50 transition-colors">
          {project.desc || 'System architecture synchronized.'}
        </p>
      </div>

      <div className="space-y-6 relative z-20">
        <div className="flex items-center gap-5 text-[8px] font-black uppercase tracking-[0.2em] text-white/10 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-accent/40"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>{project.files || 0} Files</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-accent/40"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>{project.built_at || 'Ready'}</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onLaunch(project.name); }}
            className="flex-1 bg-white text-black text-[10px] font-black uppercase tracking-widest h-12 rounded-xl transition-all shadow-xl hover:bg-white/90 active:scale-95 flex items-center justify-center gap-2"
          >
            Launch
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onExplore(project.name); }}
            className="w-12 h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-accent/20 hover:border-accent/40 transition-all active:scale-95"
            title="Open Editor"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); onDownload(project.name); }}
            className="w-12 h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-accent/20 hover:border-accent/40 transition-all active:scale-95"
            title="Download Project"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(project.name); }}
            className="w-12 h-12 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-center text-red-500/40 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all active:scale-95"
            title="Purge Environment"
          >
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
function Spinner({ className = "" }) {
  return (
    <div className={`w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin ${className}`} />
  )
}
