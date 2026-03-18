import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE =
  import.meta.env.VITE_APIBASE ||
  "https://devagent-backend-95j7.onrender.com";

const SettingsPanel = ({ isMobile }) => {
    const [integrations, setIntegrations] = useState({});
    const [falKey, setFalKey] = useState('');
    const [orKey, setOrKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        fetchIntegrations();
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setProfile(data);
        }
    };

    const fetchIntegrations = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/integrations`);
            const data = res.data;
            setIntegrations(data);
            if (data['fal-ai']) setFalKey(data['fal-ai'].api_key);
            if (data['openrouter']) setOrKey(data['openrouter'].api_key);
        } catch (err) {
            console.error('Failed to fetch integrations', err);
        }
    };

    const saveIntegration = async (service, apiKey) => {
        setSaving(true);
        setMessage('');
        try {
            const res = await axios.post(`${API_BASE}/api/integrations`, { service, api_key: apiKey });
            if (res.status === 200) {
                setMessage(`${service === 'openrouter' ? 'OpenRouter' : 'Settings'} synchronized`);
                fetchIntegrations();
            } else {
                setMessage('Failed to save settings');
            }
        } catch (err) {
            setMessage('Network error');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('avatar', file);
        try {
            const res = await axios.post(`${API_BASE}/api/profile/upload`, formData);
            if (res.data.success) {
                setMessage('Profile picture updated. Refreshing...');
                window.location.reload(); // Refresh to update all components
            }
        } catch (err) {
            setMessage('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-bg-deep relative overflow-hidden transition-colors duration-500">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-full h-[30%] bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
            
            <div className={`flex flex-col flex-1 overflow-y-auto custom-scrollbar z-10 ${isMobile ? 'p-6' : 'p-10'}`}>
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-2xl mx-auto w-full space-y-12"
                >
                    {/* Header */}
                    <div className="space-y-2">
                        <h2 className={`font-extrabold tracking-tighter text-text-main ${isMobile ? 'text-3xl' : 'text-4xl'}`}>System Nexus</h2>
                        <div className="flex items-center gap-3">
                           <div className="h-[1px] w-8 bg-accent/40" />
                           <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Environment Configuration</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Profile Section */}
                        <div className="bg-bg-surface border border-border rounded-[24px] overflow-hidden premium-border group transition-all hover:border-accent/10 shadow-sm">
                            <div className={`${isMobile ? 'p-6' : 'p-8'} space-y-8`}>
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-bg-hover border border-border flex items-center justify-center text-xs font-black text-text-muted transition-all relative overflow-hidden">
                                        {profile?.avatar_url ? (
                                            <img 
                                                src={`${API_BASE}${profile.avatar_url}`} 
                                                alt="Avatar" 
                                                crossOrigin="anonymous"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-lg text-text-main">Neural Identity</h3>
                                        <p className="text-xs text-text-muted font-medium">Avatar & Profile Appearance</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <input 
                                        type="file" 
                                        id="avatar-input" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                    />
                                    <label 
                                        htmlFor="avatar-input"
                                        className="inline-flex items-center px-6 py-3 bg-accent/10 border border-accent/20 rounded-xl text-accent font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-accent/20 transition-all"
                                    >
                                        {uploading ? 'Uploading...' : 'Upload New Portrait'}
                                    </label>
                                    <p className="text-[10px] text-text-muted italic opacity-40 leading-relaxed font-medium">PNG or JPG, max 2MB.</p>
                                </div>
                            </div>
                        </div>

                        {/* OpenRouter Section */}
                        <div className="bg-bg-surface border border-border rounded-[24px] overflow-hidden premium-border group transition-all hover:border-accent/10 shadow-sm">
                            <div className={`${isMobile ? 'p-6' : 'p-8'} space-y-8`}>
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-bg-hover border border-border flex items-center justify-center text-xs font-black text-text-muted group-hover:text-accent group-hover:bg-accent/5 transition-all">
                                        OR
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-lg text-text-main">OpenRouter</h3>
                                        <p className="text-xs text-text-muted font-medium">Global LLM Gateway</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted/40 ml-1">OpenRouter API Key</label>
                                        <input 
                                            type="password" 
                                            value={orKey}
                                            onChange={(e) => setOrKey(e.target.value)}
                                            placeholder="sk-or-v1-..."
                                            className="w-full bg-bg-hover border border-border rounded-xl px-5 py-4 text-sm text-text-main placeholder-text-muted/20 focus:outline-none focus:border-accent/30 transition-all font-mono"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => saveIntegration('openrouter', orKey)}
                                        disabled={saving}
                                        className="w-full bg-text-main hover:opacity-90 text-bg-deep font-black py-4 rounded-xl active:scale-[0.98] transition-all disabled:opacity-20 text-[10px] uppercase tracking-[0.2em] shadow-md shadow-accent/5"
                                    >
                                        {saving ? 'Syncing...' : 'Update Integration'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Fal AI Section */}
                        <div className="bg-bg-surface border border-border rounded-[24px] overflow-hidden premium-border group transition-all hover:border-accent/10 shadow-sm">
                            <div className={`${isMobile ? 'p-6' : 'p-8'} space-y-8`}>
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-bg-hover border border-border flex items-center justify-center text-xs font-black text-text-muted group-hover:text-accent group-hover:bg-accent/5 transition-all">
                                        FAL
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-lg text-text-main">Fal AI</h3>
                                        <p className="text-xs text-text-muted font-medium">Image Generation Protocol</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted/40 ml-1">Secure API Key</label>
                                        <input 
                                            type="password" 
                                            value={falKey}
                                            onChange={(e) => setFalKey(e.target.value)}
                                            placeholder="Enter token..."
                                            className="w-full bg-bg-hover border border-border rounded-xl px-5 py-4 text-sm text-text-main placeholder-text-muted/20 focus:outline-none focus:border-accent/30 transition-all font-mono"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => saveIntegration('fal-ai', falKey)}
                                        disabled={saving}
                                        className="w-full bg-text-main hover:opacity-90 text-bg-deep font-black py-4 rounded-xl active:scale-[0.98] transition-all disabled:opacity-20 text-[10px] uppercase tracking-[0.2em] shadow-md shadow-accent/5"
                                    >
                                        {saving ? 'Syncing...' : 'Update Integration'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* MCP Status Section */}
                        <div className="bg-bg-surface border border-border rounded-[24px] overflow-hidden premium-border shadow-sm">
                            <div className={`${isMobile ? 'p-6' : 'p-8'} space-y-6`}>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-bg-hover border border-border flex items-center justify-center text-[10px] font-black text-text-muted/30">
                                            MCP
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-lg text-text-main">Bridge Status</h3>
                                            <p className="text-xs text-text-muted font-medium">Model Context Protocol</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-success/5 border border-success/10 px-3 py-1.5 rounded-full">
                                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_var(--success)]" />
                                        <span className="text-[9px] font-black text-success uppercase tracking-widest">Active</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-bg-hover rounded-xl border border-border flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-text-muted/20 shrink-0" />
                                    <code className="text-[10px] text-text-muted font-mono truncate tracking-tight">
                                       ${API_BASE}/mcp/tools ✅
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Notification Toast */}
            <AnimatePresence>
                {message && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-text-main text-bg-deep rounded-full font-bold text-[10px] uppercase tracking-[0.2em] shadow-2xl z-50 flex items-center gap-3 border border-border"
                    >
                        <div className="w-1 h-1 rounded-full bg-bg-deep animate-ping" />
                        {message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SettingsPanel;
