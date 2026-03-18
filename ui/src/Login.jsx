import { useState } from 'react'
import { supabase } from './lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('login') // 'login' | 'signup'

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      if (mode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) {
          console.error("Login Error:", authError)
          throw authError
        }
        if (data?.user) onLogin(data.user)
      } else {
        console.log("Attempting signup for:", email, "with name:", fullName)
        const { data, error: authError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        })
        if (authError) {
          console.error("Signup Error Object:", authError)
          throw authError
        }
        console.log("Signup Response Data:", data)
        if (data?.user) {
          if (data.session) {
             onLogin(data.user)
          } else {
             setError("Check your email for verification link or disable 'Confirm Email' in Supabase.")
          }
        }
      }
    } catch (err) {
      setError(err.message || "An authentication error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (authError) throw authError
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#050608] overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[#7C6AF7]/10 blur-[150px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-blue-500/5 blur-[150px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md bg-[#0D0F12]/80 backdrop-blur-3xl border border-white/10 rounded-[40px] p-12 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center space-y-8">
           <div className="w-20 h-20 rounded-[30px] bg-accent/10 border border-accent/20 flex items-center justify-center relative group">
              <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent relative z-10"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
           </div>
           
           <div className="space-y-2">
              <h1 className="text-3xl font-black text-white tracking-tight">Devagent</h1>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.3em]">
                {mode === 'login' ? 'Initialize your session' : 'Create your neural ID'}
              </p>
           </div>
           
           <form onSubmit={handleAuth} className="w-full space-y-4">
              <AnimatePresence mode="wait">
                {mode === 'signup' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-1 text-left"
                  >
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/20 pl-4">Cognitive Alias</label>
                     <input 
                       type="text" 
                       value={fullName}
                       onChange={e => setFullName(e.target.value)}
                       placeholder="Full Name"
                       className="w-full bg-white/[0.03] border border-white/5 focus:border-accent/40 focus:bg-white/[0.05] rounded-[20px] px-6 py-4 text-white placeholder:text-white/10 outline-none transition-all font-bold"
                       required={mode === 'signup'}
                     />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1 text-left">
                 <label className="text-[10px] font-black uppercase tracking-widest text-white/20 pl-4">Neural Identifier</label>
                 <input 
                   type="email" 
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                   placeholder="email@agent.os"
                   className="w-full bg-white/[0.03] border border-white/5 focus:border-accent/40 focus:bg-white/[0.05] rounded-[20px] px-6 py-4 text-white placeholder:text-white/10 outline-none transition-all font-bold"
                   required
                 />
              </div>
              
              <div className="space-y-1 text-left">
                 <label className="text-[10px] font-black uppercase tracking-widest text-white/20 pl-4">Security Key</label>
                 <input 
                   type="password" 
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   placeholder="••••••••"
                   className="w-full bg-white/[0.03] border border-white/5 focus:border-accent/40 focus:bg-white/[0.05] rounded-[20px] px-6 py-4 text-white placeholder:text-white/10 outline-none transition-all font-bold"
                   required
                 />
              </div>
              
              <AnimatePresence>
                {error && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-red-500 text-[11px] font-bold uppercase tracking-widest"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 rounded-[22px] bg-accent text-white text-[11px] font-black uppercase tracking-widest hover:bg-accent/80 transition-all shadow-xl shadow-accent/20 active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Processing...' : mode === 'login' ? 'Authorize' : 'Register Unit'}
              </button>
           </form>

           <div className="w-full flex items-center gap-4 py-2">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">or</span>
              <div className="h-px flex-1 bg-white/5" />
           </div>

           <button 
             onClick={handleGoogleLogin}
             disabled={loading}
             className="w-full py-4 rounded-[22px] bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
           >
             <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
             Continue with Google
           </button>
           
           <div className="pt-4">
              <button 
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-white/30 hover:text-white text-[11px] font-black uppercase tracking-widest transition-colors"
              >
                {mode === 'login' ? "Need a neural ID?" : "Already synchronized?"}
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  )
}
