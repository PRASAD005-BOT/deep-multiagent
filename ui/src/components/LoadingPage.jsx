import React from 'react';
import { motion } from 'framer-motion';

const LoadingPage = () => {
    return (
        <div className="h-screen w-screen bg-[#050608] flex flex-col items-center justify-center overflow-hidden relative">
            {/* Background Neural Ambience */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />

                {/* Animated Grid lines */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>

            <div className="relative z-10 flex flex-col items-center">
                {/* Logo Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="w-24 h-24 rounded-[32px] bg-accent/10 border border-accent/20 flex items-center justify-center relative mb-8 group"
                >
                    <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full opacity-50 animate-pulse" />
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent relative z-10">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                </motion.div>

                {/* Brand Name */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="text-center space-y-3"
                >
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
                        Dev<span className="text-accent">Agent</span>
                    </h1>
                    <div className="flex flex-col items-center space-y-4">
                        <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.5em] pl-[0.5em]">
                            Neural Workspace Initialization
                        </p>

                        {/* Progress Bar Container */}
                        <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden relative">
                            <motion.div
                                initial={{ left: "-100%" }}
                                animate={{ left: "100%" }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 1.5,
                                    ease: "easeInOut"
                                }}
                                className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-accent to-transparent"
                            />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Decorative Corners */}
            <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-white/5 rounded-tl-2xl" />
            <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-white/5 rounded-br-2xl" />

            {/* Bottom Status Text */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute bottom-12 left-0 right-0 text-center"
            >
                <span className="text-[9px] font-mono text-white/10 uppercase tracking-widest bg-white/[0.02] border border-white/[0.05] px-4 py-2 rounded-full backdrop-blur-md">
                    v1.4.2 // PRASAD005-BOT // System Stable
                </span>
            </motion.div>
        </div>
    );
};

export default LoadingPage;
