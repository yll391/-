import React, { useState, useEffect } from 'react';
import { APPS } from '../constants';
import { WindowState } from '../types';
import { Layout, ChevronUp } from 'lucide-react';

interface TaskbarProps {
  windows: WindowState[];
  activeWindowId: string | null;
  onAppClick: (appId: string) => void;
  onToggleStart: () => void;
  onRestore: (id: string) => void;
  isStartOpen: boolean;
}

const Taskbar: React.FC<TaskbarProps> = ({ 
  windows, 
  activeWindowId, 
  onAppClick, 
  onToggleStart, 
  onRestore,
  isStartOpen
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 win-mica flex items-center justify-between px-3 z-[10000]">
      {/* Left section (Widgets/Weather mock) */}
      <div className="flex items-center gap-2 w-40">
        <div className="win-taskbar-item">
          <Layout className="w-5 h-5 text-blue-500" />
        </div>
      </div>

      {/* Center section (Apps) */}
      <div className="flex items-center gap-1">
        <button 
          onClick={onToggleStart}
          className={`win-taskbar-item relative ${isStartOpen ? 'bg-white/20' : ''}`}
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/Windows_logo_-_2021.svg" className="w-5 h-5" alt="Start" />
        </button>

        {/* Pinned & Running Apps */}
        {APPS.filter(a => a.isPinned || windows.some(w => w.appId === a.id)).map(app => {
          const window = windows.find(w => w.appId === app.id);
          const isActive = window?.id === activeWindowId;
          const isRunning = !!window;

          return (
            <button
              key={app.id}
              onClick={() => isRunning ? onRestore(window.id) : onAppClick(app.id)}
              className={`win-taskbar-item relative group ${isActive ? 'bg-white/20' : ''}`}
            >
              <div className="group-hover:scale-110 transition-transform">
                {app.icon}
              </div>
              {isRunning && (
                <div className={`absolute bottom-0.5 h-0.5 rounded-full bg-win-accent transition-all ${isActive ? 'w-4' : 'w-1.5'}`} />
              )}
              
              {/* Tooltip/Preview mock could go here */}
            </button>
          );
        })}
      </div>

      {/* Right section (System Tray) */}
      <div className="flex items-center gap-1 w-40 justify-end">
        <div className="win-taskbar-item">
          <ChevronUp className="w-4 h-4" />
        </div>
        <div className="flex flex-col items-end px-2 hover:bg-white/10 rounded-md transition-colors cursor-default">
          <span className="text-[11px] font-medium leading-tight">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-[11px] leading-tight">
            {time.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Taskbar;
