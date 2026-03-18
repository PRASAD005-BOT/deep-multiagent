import { useState } from 'react'
import axios from 'axios'

const STACK_COLORS = {
  react:   { bg: '#185FA520', text: '#378ADD', label: 'React'  },
  vue:     { bg: '#3B6D1120', text: '#3ECF8E', label: 'Vue'    },
  nodejs:  { bg: '#3B6D1120', text: '#3ECF8E', label: 'Node'   },
  python:  { bg: '#854F0B20', text: '#EF9F27', label: 'Python' },
  html:    { bg: '#993C1D20', text: '#D85A30', label: 'HTML'   },
  unknown: { bg: '#3A3D4720', text: '#5A5D6A', label: '?'      },
}

export default function ProjectsPanel({ projects, onRefresh, onChat, API, isMobile }) {
  const [selected, setSelected]     = useState(null)
  const [files, setFiles]           = useState([])
  const [fileContent, setFileContent] = useState(null)
  const [deleting, setDeleting]     = useState(null)
  const [showFiles, setShowFiles]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [launching, setLaunching]   = useState(false)

  const loadFiles = async (name) => {
    setSelected(name)
    setFileContent(null)
    if (isMobile) setShowFiles(true)
    try {
      const r = await axios.get(`${API}/projects/${encodeURIComponent(name)}/files`)
      setFiles(r.data)
    } catch { setFiles([]) }
  }

  const openFile = async (name, path) => {
    try {
      const r = await axios.get(`${API}/projects/${encodeURIComponent(name)}/file?path=${encodeURIComponent(path)}`)
      setFileContent({ path, content: r.data.content, original: r.data.content })
    } catch {}
  }

  const saveFile = async () => {
    if (!fileContent || saving) return
    setSaving(true)
    try {
      await axios.post(`${API}/projects/${encodeURIComponent(selected)}/file`, {
        path: fileContent.path,
        content: fileContent.content
      })
      setFileContent({ ...fileContent, original: fileContent.content })
    } catch (e) {
      alert("Failed to save: " + e.message)
    }
    setSaving(false)
  }

  const launchProject = async () => {
    if (launching) return
    setLaunching(true)
    try {
      const r = await axios.post(`${API}/projects/${encodeURIComponent(selected)}/run`)
      // If the result contains a URL, try to open it
      const m = r.data.result.match(/http:\/\/localhost:\d+/)
      if (m) window.open(m[0], '_blank')
    } catch (e) {
      alert("Failed to launch: " + e.message)
    }
    setLaunching(false)
  }

  const downloadProject = () => {
    window.location.href = `${API}/projects/${encodeURIComponent(selected)}/download`
  }

  const deleteProject = async (name) => {
    if (!confirm(`Delete '${name}'?`)) return
    setDeleting(name)
    try {
      await axios.delete(`${API}/projects/${encodeURIComponent(name)}`)
      if (selected === name) { setSelected(null); setFiles([]); setShowFiles(false) }
      onRefresh()
    } catch {}
    setDeleting(null)
  }

  const fmt = (b) => b < 1024 ? `${b}b` : `${(b/1024).toFixed(1)}k`

  // ── Mobile: full-screen list → full-screen files ──
  if (isMobile) {
    if (showFiles && selected) {
      return (
        <div className="flex flex-col h-full">
          {/* Back header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-[#222428] flex items-center gap-3">
            <button onClick={() => { setShowFiles(false); setFileContent(null) }}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#1C1E22] transition-colors">
              <BackIcon />
            </button>
            <span className="text-sm font-medium text-white truncate flex-1">{selected}</span>
            <div className="flex gap-2">
              <button onClick={() => { onChat(selected); setShowFiles(false) }}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#222428] text-[#5A5D6A] hover:text-white transition-colors">
                Ask
              </button>
              <button onClick={() => deleteProject(selected)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#E05252]/30 text-[#E05252]/70 hover:text-[#E05252] transition-colors">
                {deleting === selected ? '...' : 'Del'}
              </button>
            </div>
          </div>

          {fileContent ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-shrink-0 px-4 py-2.5 border-b border-[#222428] flex items-center gap-2">
                <button onClick={() => setFileContent(null)} className="text-[#5A5D6A] hover:text-white">
                  <BackIcon size={14} />
                </button>
                <span className="text-xs font-mono text-[#5A5D6A] truncate">{fileContent.path}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <pre className="text-xs font-mono text-white/70 leading-relaxed whitespace-pre-wrap break-all">
                  {fileContent.content}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-1">
              {files.map(f => (
                <button key={f.path} onClick={() => openFile(selected, f.path)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#1C1E22] transition-colors border-b border-[#222428]/50">
                  <FileExt path={f.path} />
                  <span className="flex-1 text-sm text-white/80 font-mono truncate">{f.path}</span>
                  <span className="text-xs text-[#5A5D6A] flex-shrink-0">{fmt(f.size)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }

    // Mobile project list
    return (
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 px-4 py-3 border-b border-[#222428] flex items-center justify-between">
          <span className="text-sm font-medium text-white">Projects ({projects.length})</span>
          <button onClick={onRefresh}
            className="text-xs text-[#5A5D6A] hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-[#1C1E22]">
            Refresh
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#5A5D6A] text-sm gap-2">
              <p>No projects yet</p>
              <p className="text-xs opacity-60">Build something in Chat first</p>
            </div>
          ) : projects.map(p => {
            const s = STACK_COLORS[p.stack] || STACK_COLORS.unknown
            return (
              <button key={p.name} onClick={() => loadFiles(p.name)}
                className="w-full px-4 py-4 flex items-center gap-3 hover:bg-[#1C1E22] transition-colors border-b border-[#222428]/50 active:bg-[#1C1E22]">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: s.bg }}>
                  <span className="text-xs font-semibold" style={{ color: s.text }}>{s.label}</span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium text-white truncate">{p.name}</div>
                  <div className="text-xs text-[#5A5D6A] mt-0.5">{p.files} files · {p.built_at || 'unknown'}</div>
                </div>
                <ChevRight />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Desktop: two-panel layout ──
  return (
    <div className="flex h-full">
      {/* Project list */}
      <div className="w-[260px] xl:w-[300px] flex-shrink-0 border-r border-[#222428] flex flex-col">
        <div className="flex-shrink-0 px-4 py-3.5 border-b border-[#222428] flex items-center justify-between">
          <span className="text-sm font-medium text-white">Projects</span>
          <button onClick={onRefresh}
            className="text-xs text-[#5A5D6A] hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-[#1C1E22]">
            Refresh
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {projects.length === 0 ? (
            <div className="px-4 py-10 text-center text-[#5A5D6A] text-sm">
              No projects yet.<br/><span className="text-xs opacity-50">Build in Chat.</span>
            </div>
          ) : projects.map(p => {
            const s = STACK_COLORS[p.stack] || STACK_COLORS.unknown
            return (
              <button key={p.name} onClick={() => loadFiles(p.name)}
                className={`w-full px-4 py-3 flex gap-3 items-center text-left transition-all hover:bg-[#1C1E22] border-l-2
                  ${selected === p.name ? 'bg-[#1C1E22] border-[#7C6AF7]' : 'border-transparent'}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: s.bg }}>
                  <span className="text-xs font-semibold" style={{ color: s.text, fontSize: '9px' }}>{s.label}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{p.name}</div>
                  <div className="text-xs text-[#5A5D6A] mt-0.5">{p.files} files</div>
                </div>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: p.status === 'built' ? '#3ECF8E' : '#E05252' }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Content area */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-[#5A5D6A] text-sm">
          Select a project
        </div>
      ) : (
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-shrink-0 px-5 py-3 border-b border-[#222428] flex items-center gap-3">
            <span className="text-sm font-medium text-white">{selected}</span>
            <span className="text-xs text-[#5A5D6A]">{files.length} files</span>
            <div className="ml-auto flex gap-2">
              <button onClick={downloadProject}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#222428] text-[#5A5D6A] hover:text-white hover:bg-[#1C1E22] transition-all flex items-center gap-1.5">
                <DownloadIcon size={12} /> Download
              </button>
              <button onClick={launchProject} disabled={launching}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#3ECF8E]/30 text-[#3ECF8E]/80 hover:text-[#3ECF8E] hover:bg-[#3ECF8E]/10 transition-all flex items-center gap-1.5">
                {launching ? '...' : <><PlayIcon size={12} /> Launch</>}
              </button>
              <button onClick={() => onChat(selected)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#7C6AF7]/30 text-[#7C6AF7]/80 hover:text-[#7C6AF7] hover:bg-[#7C6AF7]/5 transition-all">
                Ask Agent
              </button>
              <button onClick={() => deleteProject(selected)} disabled={deleting === selected}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#E05252]/30 text-[#E05252]/70 hover:text-[#E05252] hover:bg-[#E05252]/10 transition-all">
                {deleting === selected ? '...' : 'Delete'}
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* File list */}
            <div className="w-[220px] xl:w-[260px] border-r border-[#222428] overflow-y-auto py-1">
              {files.map(f => (
                <button key={f.path} onClick={() => openFile(selected, f.path)}
                  className={`w-full px-3.5 py-2.5 flex items-center gap-2 hover:bg-[#1C1E22] transition-all text-left
                    ${fileContent?.path === f.path ? 'bg-[#1C1E22]' : ''}`}>
                  <FileExt path={f.path} />
                  <span className="text-xs font-mono text-white/75 flex-1 truncate">{f.path}</span>
                  <span className="text-xs text-[#5A5D6A] flex-shrink-0">{fmt(f.size)}</span>
                </button>
              ))}
            </div>

            {/* File content */}
            <div className="flex-1 min-w-0 flex flex-col relative">
              {fileContent ? (
                <div className="flex flex-col h-full">
                  <div className="flex-shrink-0 px-5 py-2.5 border-b border-[#222428] flex items-center justify-between bg-[#0D0F10]">
                    <div className="flex items-center gap-2">
                      <FileExt path={fileContent.path} />
                      <span className="text-xs font-mono text-[#5A5D6A]">{fileContent.path}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {fileContent.content !== fileContent.original && (
                        <span className="text-[10px] text-[#7C6AF7] font-medium animate-pulse">Unsaved changes</span>
                      )}
                      <button 
                        onClick={saveFile} 
                        disabled={saving || fileContent.content === fileContent.original}
                        className={`text-xs px-3 py-1 rounded-md transition-all ${
                          fileContent.content !== fileContent.original 
                            ? 'bg-[#7C6AF7] text-white hover:bg-[#6B5BE6]' 
                            : 'bg-[#1C1E22] text-[#5A5D6A] opacity-50'
                        }`}
                      >
                        {saving ? '...' : 'Save'}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden relative">
                    <textarea
                      value={fileContent.content}
                      onChange={e => setFileContent({ ...fileContent, content: e.target.value })}
                      spellCheck={false}
                      className="w-full h-full p-5 bg-[#0D0F10] text-sm font-mono text-white/80 resize-none outline-none focus:ring-1 focus:ring-[#7C6AF7]/30 selection:bg-[#7C6AF7]/30"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#3A3D47]">
                  <FileIcon size={40} className="mb-4 opacity-10" />
                  <p className="text-sm">Select a file from the explorer to view or edit</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FileExt({ path }) {
  const ext = path.split('.').pop()?.toLowerCase()
  const M = {
    jsx:{bg:'#185FA520',text:'#378ADD'}, tsx:{bg:'#185FA520',text:'#378ADD'},
    js:{bg:'#854F0B20',text:'#EF9F27'},  ts:{bg:'#185FA520',text:'#4285F4'},
    css:{bg:'#993C1D20',text:'#D85A30'}, html:{bg:'#993C1D20',text:'#D85A30'},
    json:{bg:'#3B6D1120',text:'#3ECF8E'},py:{bg:'#854F0B20',text:'#EF9F27'},
  }
  const s = M[ext] || {bg:'#3A3D4720',text:'#5A5D6A'}
  return (
    <span className="flex-shrink-0 font-mono rounded"
      style={{ background: s.bg, color: s.text, fontSize:'9px', padding:'2px 4px' }}>
      {ext || '?'}
    </span>
  )
}

function BackIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ChevRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 3l4 4-4 4" stroke="#5A5D6A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function DownloadIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PlayIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M5 3l8 5-8 5V3z" fill="currentColor"/>
    </svg>
  )
}

function FileIcon({ size = 14, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M9 2H4v12h8V7L9 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M9 2v5h5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  )
}
