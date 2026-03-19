import { useState, useEffect } from 'react'
import axios from 'axios'
import { supabase } from './lib/supabase'
import ChatPanel from './components/ChatPanel'
import Editor from '@monaco-editor/react'

function SaveIcon({ size = 16, className="" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> }
function Spinner() { return <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> }
function EyeIcon({ size = 16, className="" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M1 12s4-8 11-8 11 8 11 8-4-8-11-8-11 8-11 8z"/><circle cx="12" cy="12" r="3"/></svg> }
function RocketIcon({ size = 16, className="" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4.5c1.45-1.47 4.5-2 4.5-2"/><path d="M15 12v5s3.03-.55 4.5-2c1.47-1.45 2-4.5 2-4.5"/></svg> }
function ExternalLink({ size = 16, className="" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> }
function DownloadIcon({ size = 16, className="" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function TerminalIcon({ size = 16, className="" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg> }

export default function IDERoute({ project, onBack, API, models, messages, streaming, onSend, isMobile }) {
  const [files, setFiles] = useState([])
  const [fileContent, setFileContent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [activeTab, setActiveTab] = useState(isMobile ? 'explorer' : 'chat')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showConsole, setShowConsole] = useState(false)
  const [splitPosition, setSplitPosition] = useState(50)
  const [isResizing, setIsResizing] = useState(false)
  const [showNewFileModal, setShowNewFileModal] = useState(false)
  const [newFilePath, setNewFilePath] = useState("")
  const [fileToDelete, setFileToDelete] = useState(null)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const percent = (e.clientX / window.innerWidth) * 100
      // Limit range
      if (percent > 20 && percent < 80) {
        setSplitPosition(percent)
      }
    }
    const handleMouseUp = () => setIsResizing(false)

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  useEffect(() => {
    if (project) loadFiles(project)
  }, [project])

  const loadFiles = async (name) => {
    try {
      const r = await axios.get(`${API}/projects/${encodeURIComponent(name)}/files`)
      setFiles(r.data)
    } catch { setFiles([]) }
  }

  const openFile = async (path) => {
    try {
      const r = await axios.get(`${API}/projects/${encodeURIComponent(project)}/file?path=${encodeURIComponent(path)}`)
      setFileContent({ path, content: r.data.content, original: r.data.content })
    } catch {}
  }

  const saveFile = async () => {
    if (!fileContent || saving) return
    setSaving(true)
    try {
      await axios.post(`${API}/projects/${encodeURIComponent(project)}/file`, {
        path: fileContent.path,
        content: fileContent.content
      })
      setFileContent({ ...fileContent, original: fileContent.content })
    } catch (e) {
      alert("Failed to save: " + e.message)
    }
    setSaving(false)
  }

  const deleteFile = (path) => {
    setFileToDelete(path)
  }

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return
    const path = fileToDelete
    setFileToDelete(null)
    try {
      await axios.delete(`${API}/projects/${encodeURIComponent(project)}/file?path=${encodeURIComponent(path)}`)
      if (fileContent?.path === path) setFileContent(null)
      loadFiles(project)
    } catch (e) {
      alert("Failed to delete: " + e.message)
    }
  }

  const handleCreateFileClick = () => {
    setNewFilePath("")
    setShowNewFileModal(true)
  }

  const submitCreateFile = async (e) => {
    e?.preventDefault();
    if (!newFilePath) return
    setShowNewFileModal(false)
    try {
      await axios.post(`${API}/projects/${encodeURIComponent(project)}/file`, { path: newFilePath, content: "" })
      loadFiles(project)
      openFile(newFilePath)
    } catch (err) {
      alert("Failed to create file: " + err.message)
    }
  }

  const launchProject = async () => {
    setLaunching(true)
    try {
      const r = await axios.post(`${API}/projects/${encodeURIComponent(project)}/run`)
      let url = r.data.url || r.data.result.match(/https?:\/\/localhost:\d+/)?.[0]
      if (url) {
        // If it's a relative API path, prepend the base domain
        if (url.startsWith('/api/workspace')) {
          const base = API.replace(/\/api$/, '');
          url = `${base}${url}`;
        }
        setPreviewUrl(url)
        setShowPreview(true)
        setShowConsole(true)
      }
    } catch (e) {
      alert("Failed to launch: " + e.message)
    }
    setLaunching(false)
  }

  const downloadProject = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    window.location.href = `${API}/projects/${encodeURIComponent(project)}/download?token=${token}`
  }

  return (
    <div className="flex h-full w-full bg-[#050608] overflow-hidden text-white font-sans relative">
      
      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#1C1E22] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-white">Create New File</h3>
            <form onSubmit={submitCreateFile}>
              <input 
                type="text" 
                value={newFilePath}
                onChange={e => setNewFilePath(e.target.value)}
                placeholder="e.g. src/components/Button.jsx"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7C6AF7] transition-colors mb-6 font-mono text-white/90 placeholder:text-white/20"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowNewFileModal(false)}
                  className="px-5 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-[#7C6AF7] hover:bg-[#6B5BE6] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#7C6AF7]/20 transition-all active:scale-95"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete File Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#1C1E22] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-2 text-white">Delete File</h3>
            <p className="text-white/70 text-sm mb-6">
              Are you sure you want to delete <span className="font-mono text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">{fileToDelete}</span>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setFileToDelete(null)}
                className="px-5 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteFile}
                className="px-5 py-2.5 bg-red-500/20 hover:bg-red-500 border border-red-500/30 hover:border-red-500 text-red-500 hover:text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/10 transition-all active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Assistant (Left Panel) - RESTORED WIDTH */}
      <div className={`${isMobile ? (activeTab === 'chat' ? 'w-full h-full pb-16 absolute inset-0 z-40' : 'hidden') : 'w-[360px] relative z-30'} flex-shrink-0 flex flex-col bg-[#050608] border-r border-white/[0.05] glass`}>
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between bg-black/20 backdrop-blur-md">
           <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-[#7C6AF7] accent-glow" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">Assistant</span>
           </div>
           <div className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] pulse-dot opacity-80" />
        </div>
        <div className="flex-1 min-h-0 no-scrollbar overflow-y-auto">
          <ChatPanel 
            messages={messages}
            streaming={streaming}
            onSend={(text) => onSend(text, project)}
            model={null}
            models={models}
            projects={[]} 
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* 2. IDE Sidebar (Explorer - Center) */}
      <div className={`${isMobile ? (activeTab === 'explorer' ? 'w-full h-full pb-16 absolute inset-0 z-40' : 'hidden') : (sidebarOpen ? 'w-[280px] relative z-20' : 'w-0 relative z-20')} flex-shrink-0 flex flex-col transition-all duration-300 bg-[#050608] border-r border-white/[0.05]`}>
        <div className="flex-shrink-0 px-6 py-4 border-b border-white/[0.05] flex items-center justify-between overflow-hidden bg-black/20 backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Explorer</span>
          <div className="flex items-center gap-3">
            <button onClick={handleCreateFileClick} className="text-white/20 hover:text-white transition-colors" title="New File">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
            </button>
            {!isMobile && (
              <button onClick={() => setSidebarOpen(false)} className="text-white/20 hover:text-white transition-colors">
                 <ChevronLeft size={16} />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          <FileTree 
            files={files} 
            openFile={(path) => {
              openFile(path);
              if (isMobile) setActiveTab('code');
            }} 
            deleteFile={deleteFile}
            activePath={fileContent?.path} 
          />
        </div>

      </div>

      {!isMobile && !sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)} className="fixed left-[376px] bottom-8 z-50 w-14 h-14 bg-[#1C1E22] rounded-2xl border border-white/10 text-white/40 hover:text-white hover:border-[#7C6AF7]/50 transition-all shadow-2xl flex items-center justify-center group">
          <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* 3. Main Editor Area (Right) */}
      <div className={`${isMobile ? (activeTab === 'code' ? 'w-full h-full pb-16 absolute inset-0 z-40' : 'hidden') : 'flex-1 min-w-0 relative z-10'} flex flex-col bg-[#050608]`}>
        <div className="flex-shrink-0 px-8 py-5 border-b border-white/[0.05] flex items-center justify-between bg-black/20 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-all text-white/40 hover:text-white group" title="Return to Dashboard">
              <BackIcon size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[#7C6AF7]/10 flex items-center justify-center border border-[#7C6AF7]/20 shadow-inner">
                 <ProjectIcon size={20} className="text-[#7C6AF7]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Project Source</span>
                </div>
                <div className="flex items-center gap-2">
                   <h1 className="text-lg font-black tracking-tight text-white/90">{project}</h1>
                   {fileContent && (
                     <>
                        <span className="text-white/10 mx-1">/</span>
                        <span className="text-sm font-bold text-accent/80 font-mono">{fileContent.path}</span>
                     </>
                   )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center gap-4">
            <button 
              onClick={launchProject} 
              disabled={launching}
              className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl ${
                launching 
                ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                : 'bg-[#3ECF8E] text-black hover:bg-[#36B67C] hover:scale-105 active:scale-95 shadow-[#3ECF8E]/20'
              }`}
            >
              {launching ? <Spinner /> : <RocketIcon size={16} />}
              {launching ? 'Powering up...' : 'Run'}
            </button>

            <button 
              onClick={downloadProject}
              className="px-6 py-2.5 bg-white/5 border border-white/10 text-white/50 text-[11px] font-black uppercase tracking-widest rounded-xl hover:text-white hover:bg-white/10 transition-all active:scale-95"
            >
              Source
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {fileContent && (
              <div className="flex items-center gap-3 pr-3 border-r border-white/5 mr-3">
                 {previewUrl && (
                   <div className="flex items-center gap-2">
                     <button 
                       onClick={() => setShowPreview(!showPreview)} 
                       className={`p-2.5 rounded-xl transition-all border flex items-center gap-2 group ${
                         showPreview ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                       }`}
                       title={showPreview ? "Hide Preview" : "Show Preview"}
                     >
                       <EyeIcon size={18} />
                     </button>
                     <button 
                       onClick={() => setShowConsole(!showConsole)} 
                       className={`p-2.5 rounded-xl transition-all border flex items-center gap-2 group ${
                         showConsole ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                       }`}
                       title={showConsole ? "Hide Terminal" : "Show Terminal"}
                     >
                       <TerminalIcon size={18} />
                     </button>
                   </div>
                 )}
                 <button 
                  onClick={saveFile} 
                  disabled={saving || fileContent.content === fileContent.original}
                  className={`text-[11px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
                    fileContent.content !== fileContent.original 
                    ? 'bg-[#7C6AF7] text-white hover:bg-[#6B5BE6] shadow-xl shadow-[#7C6AF7]/20' 
                    : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                  }`}>
                  {saving ? <Spinner /> : <SaveIcon size={14} />}
                  {saving ? 'Syncing...' : 'Deploy Changes'}
                </button>
              </div>
            )}

            <button 
              onClick={downloadProject}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all active:scale-95 group"
              title="Download Project ZIP"
            >
              <DownloadIcon size={20} className="group-hover:scale-110 transition-transform" />
            </button>

            <button 
              onClick={onBack}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all active:scale-95 group"
              title="Close Workspace"
            >
              <CloseIcon size={20} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative grid-bg flex select-none">
          {fileContent ? (
            <>
              <div 
                className={`h-full relative overflow-hidden transition-all ${showPreview ? '' : 'w-full'} ${isResizing ? '' : 'duration-300'}`}
                style={{ width: showPreview ? `${splitPosition}%` : '100%' }}
              >
                <Editor
                  height="100%"
                  language={
                    fileContent.path.endsWith('.js') ? 'javascript' :
                    fileContent.path.endsWith('.jsx') ? 'javascript' :
                    fileContent.path.endsWith('.ts') ? 'typescript' :
                    fileContent.path.endsWith('.tsx') ? 'typescript' :
                    fileContent.path.endsWith('.html') ? 'html' :
                    fileContent.path.endsWith('.css') ? 'css' :
                    fileContent.path.endsWith('.json') ? 'json' : 'plaintext'
                  }
                  theme="vs-dark"
                  value={fileContent.content}
                  onChange={value => setFileContent({ ...fileContent, content: value })}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    automaticLayout: true,
                    folding: true,
                    lineDecorationsWidth: 0,
                    lineNumbersMinChars: 3,
                    renderLineHighlight: 'all',
                    cursorBlinking: 'smooth',
                    smoothScrolling: true,
                    contextmenu: false,
                  }}
                  beforeMount={(monaco) => {
                    monaco.editor.defineTheme('custom-dark', {
                      base: 'vs-dark',
                      inherit: true,
                      rules: [],
                      colors: {
                        'editor.background': '#050608',
                      }
                    });
                  }}
                  onMount={(editor, monaco) => {
                    monaco.editor.setTheme('custom-dark');
                  }}
                />
              </div>
              
              {showPreview && previewUrl && (
                <>
                  {/* Resizer Divider */}
                  <div 
                    onMouseDown={() => setIsResizing(true)}
                    className="w-1.5 h-full bg-white/5 hover:bg-[#7C6AF7]/50 cursor-col-resize transition-colors relative z-50 flex items-center justify-center shrink-0 group"
                  >
                    <div className="w-0.5 h-12 bg-white/10 group-hover:bg-[#7C6AF7] rounded-full transition-colors" />
                  </div>

                  <div 
                    className={`h-full bg-[#0B0C0E] border-white/10 flex flex-col relative ${isResizing ? '' : 'transition-all duration-300'}`}
                    style={{ width: `${100 - splitPosition}%` }}
                  >
                    {isResizing && <div className="absolute inset-0 z-50 bg-transparent" />}
                  {/* Address Bar */}
                  <div className="flex-shrink-0 bg-[#161719] border-b border-white/5 px-4 py-2 flex items-center gap-3 transition-all">
                    <div className="flex items-center gap-2 text-white/30">
                      <div className="p-1 hover:bg-white/5 rounded-md transition-colors cursor-pointer"><BackIcon size={12} /></div>
                      <div className="p-1 hover:bg-white/5 rounded-md transition-colors cursor-pointer rotate-180"><BackIcon size={12} /></div>
                      <div className="p-1 hover:bg-white/5 rounded-md transition-colors cursor-pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></div>
                    </div>
                    <div className="flex-1 max-w-2xl h-8 bg-black/40 rounded-lg border border-white/10 flex items-center px-4 gap-3 text-[11px] font-medium group transition-all hover:border-white/20">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                      <span className="text-white/40 font-mono truncate select-all">{previewUrl}</span>
                    </div>
                    <button onClick={() => window.open(previewUrl, '_blank')} className="p-2 text-white/20 hover:text-white transition-colors ml-auto" title="Open in New Tab">
                      <ExternalLink size={14} />
                    </button>
                  </div>

                  {/* Iframe + Console Stack */}
                  <div className="flex-1 flex flex-col min-h-0 bg-white">
                    <iframe 
                      src={previewUrl} 
                      className="flex-1 w-full border-none bg-white"
                      title="Live Preview"
                    />
                    
                    {/* Collapsible Console Area */}
                    <div className={`border-t border-black/10 bg-[#0B0C0E] transition-all duration-300 ${showConsole ? 'h-48' : 'h-10'}`}>
                      <div className="h-10 px-4 flex items-center justify-between border-b border-white/5 bg-[#161719]">
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Console</span>
                            <div className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-bold text-white/20 uppercase">Bash</div>
                         </div>
                         <button 
                          onClick={() => setShowConsole(!showConsole)}
                          className="p-1.5 text-white/20 hover:text-white transition-colors"
                         >
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-300 ${showConsole ? 'rotate-180' : ''}`}>
                             <polyline points="18 15 12 9 6 15"></polyline>
                           </svg>
                         </button>
                      </div>
                      {showConsole && (
                        <div className="p-4 font-mono text-[11px] text-[#3ECF8E]/80 overflow-y-auto h-38">
                          <div className="flex gap-2">
                             <span className="text-[#7C6AF7]">$</span>
                             <span>{launching ? 'Initializing environment...' : 'Environment ready. Listening on port...'}</span>
                          </div>
                          <div className="mt-1 opacity-50"># Real-time logs will appear here</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-accent/20 blur-[100px] rounded-full scale-150 animate-pulse opacity-50" />
                <div className="w-32 h-32 rounded-[40px] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center relative z-10 transition-transform duration-700 hover:rotate-6 shadow-2xl">
                   <ProjectIcon size={48} className="text-white/20 group-hover:text-accent transition-colors" />
                </div>
              </div>
              <div className="space-y-3 max-w-sm">
                 <h2 className="text-xl font-black tracking-tight text-white/80">Neural Workspace</h2>
                 <p className="text-sm text-white/30 font-medium leading-relaxed">
                   Select a file from the explorer to begin editing, or launch the project environment to see your progress live.
                 </p>
              </div>
              <div className="flex items-center gap-4">
                 <button 
                  onClick={launchProject}
                  disabled={launching}
                  className="px-8 py-4 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-2xl text-accent text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                 >
                  {launching ? <Spinner /> : <RocketIcon size={16} />}
                  {launching ? 'Powering up...' : 'Run Environment'}
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobile && (
        <div className="fixed bottom-0 left-0 w-full h-[64px] bg-[#121315]/95 backdrop-blur-xl border-t border-white/10 z-[100] flex items-center justify-around px-2">
          <button 
            onClick={() => setActiveTab('chat')} 
            className={`flex flex-col items-center justify-center w-20 flex-1 h-full gap-1 transition-colors ${activeTab === 'chat' ? 'text-[#7C6AF7]' : 'text-white/40 hover:text-white/70'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="text-[10px] font-black uppercase tracking-widest">Chat</span>
          </button>
          <button 
            onClick={() => setActiveTab('explorer')} 
            className={`flex flex-col items-center justify-center w-20 flex-1 h-full gap-1 transition-colors ${activeTab === 'explorer' ? 'text-[#7C6AF7]' : 'text-white/40 hover:text-white/70'}`}
          >
            <FolderIcon size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Files</span>
          </button>
          <button 
            onClick={() => setActiveTab('code')} 
            className={`flex flex-col items-center justify-center w-20 flex-1 h-full gap-1 transition-colors ${activeTab === 'code' ? 'text-[#7C6AF7]' : 'text-white/40 hover:text-white/70'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            <span className="text-[10px] font-black uppercase tracking-widest">Code</span>
          </button>
        </div>
      )}
    </div>
  )
}

function FileExt({ path }) {
  const ext = path.split('.').pop()?.toLowerCase()
  const M = {
    jsx:{text:'#61DAFB'}, tsx:{text:'#3178C6'},
    js:{text:'#F7DF1E'},  ts:{text:'#3178C6'},
    css:{text:'#1572B6'}, html:{text:'#E34F26'},
    json:{text:'#3ECF8E'}, py:{text:'#3776AB'},
  }
  const s = M[ext] || {text:'#5A5D6A'}
  return (
    <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-md bg-white/[0.02] border border-white/[0.05]">
      <span className="font-bold font-mono" style={{ color: s.text, fontSize:'7px' }}>
        {ext?.substring(0,2) || '?'}
      </span>
    </div>
  )
}

function BackIcon({size=20}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg> }
function ChevronLeft({size=16}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg> }
function ChevronRight() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg> }
function CloseIcon({ size = 16, strokeWidth = 1.5, className="" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> }
function FileIcon({ size = 16, className="" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
function ProjectIcon({ size = 16, className="" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> }

function FileTree({ files, openFile, deleteFile, activePath }) {
  const [expanded, setExpanded] = useState({ "": true });

  // Build tree
  const tree = {};
  files.forEach(f => {
    const parts = f.path.split('/');
    let curr = tree;
    parts.forEach((p, i) => {
      if (!curr[p]) curr[p] = i === parts.length - 1 ? { _file: f } : {};
      curr = curr[p];
    });
  });

  const renderTree = (node, path = "", depth = 0) => {
    return Object.entries(node).sort(([a, na], [b, nb]) => {
      // Dirs first
      const aIsFile = !!na._file;
      const bIsFile = !!nb._file;
      if (aIsFile !== bIsFile) return aIsFile ? 1 : -1;
      return a.localeCompare(b);
    }).map(([name, contents]) => {
      const fullPath = path ? `${path}/${name}` : name;
      const isFile = !!contents._file;
      const isExpanded = expanded[fullPath];

      if (isFile) {
        return (
          <div key={fullPath} className={`w-full relative group transition-all ${activePath === fullPath ? 'bg-white/[0.05] border-r-2 border-[#7C6AF7]' : 'hover:bg-white/[0.03]'}`}>
            <button onClick={() => openFile(fullPath)}
              style={{ paddingLeft: `${(depth + 1) * 20}px` }}
              className="w-full py-2 flex items-center gap-3 pr-8 text-left">
              <FileExt path={fullPath} />
              <span className={`text-[12px] font-mono truncate transition-colors ${activePath === fullPath ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}>
                {name}
              </span>
            </button>
            {deleteFile && (
              <button 
                onClick={(e) => { e.stopPropagation(); deleteFile(fullPath); }} 
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-all p-1.5"
                title="Delete File"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
            )}
          </div>
        );
      } else {
        return (
          <div key={fullPath}>
            <button 
              onClick={() => setExpanded(prev => ({ ...prev, [fullPath]: !prev[fullPath] }))}
              style={{ paddingLeft: `${(depth + 1) * 20}px` }}
              className="w-full py-2 flex items-center gap-3 hover:bg-white/[0.03] transition-all group pr-4 opacity-60 hover:opacity-100"
            >
              <div className="w-4 h-4 flex items-center justify-center transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
              </div>
              <FolderIcon size={14} className="text-[#3ECF8E]/60" />
              <span className="text-[11px] font-bold uppercase tracking-wider truncate">{name}</span>
            </button>
            {isExpanded && renderTree(contents, fullPath, depth + 1)}
          </div>
        );
      }
    });
  };

  return <div className="flex flex-col">{renderTree(tree)}</div>;
}

function FolderIcon({ size = 14, className="" }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> }
