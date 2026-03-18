import React from 'react';

const BottomNav = ({ view, setView }) => {
  const items = [
    { id: 'chat', label: 'Command' },
    { id: 'projects', label: 'Workspace' },
    { id: 'settings', label: 'System' },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full glass px-6 py-4 flex items-center justify-around z-[100] border-t border-white/[0.04]">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setView(item.id)}
          className={`text-[10px] font-black uppercase tracking-widest transition-all ${
            view === item.id ? 'text-accent' : 'text-white/20'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default BottomNav;
