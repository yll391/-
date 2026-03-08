import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { APPS } from '../constants';
import { WindowState } from '../types';
import { Search, Power, User, Settings } from 'lucide-react';

interface StartMenuProps {
  onClose: () => void;
  onAppClick: (appId: string) => void;
}

const StartMenu: React.FC<StartMenuProps> = ({ onClose, onAppClick }) => {
  const [search, setSearch] = useState('');

  const filteredApps = APPS.filter(app => 
    app.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed bottom-14 left-1/2 -translate-x-1/2 w-[600px] h-[700px] win-mica win-shadow rounded-xl z-[9999] p-8 flex flex-col gap-8"
    >
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="搜索应用、设置和文档"
          className="w-full bg-white/50 border border-black/5 rounded-full py-2 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-win-accent/20 focus:bg-white transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {/* Pinned Apps */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-sm">已固定</h3>
          <button className="text-xs bg-white/50 px-2 py-1 rounded hover:bg-white transition-colors">所有应用 &gt;</button>
        </div>
        <div className="grid grid-cols-6 gap-4">
          {filteredApps.map(app => (
            <button
              key={app.id}
              onClick={() => onAppClick(app.id)}
              className="flex flex-col items-center gap-2 p-2 rounded-md hover:bg-white/20 transition-all active:scale-95 group"
            >
              <div className="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform">
                {app.icon}
              </div>
              <span className="text-xs text-center line-clamp-2">{app.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recommended (Mock) */}
      <div className="h-40">
        <h3 className="font-semibold text-sm mb-4">推荐</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-2 rounded-md hover:bg-white/20 cursor-pointer">
            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-600 text-xs font-bold">W</div>
            <div>
              <p className="text-xs font-medium">项目计划书.docx</p>
              <p className="text-[10px] text-slate-500">2 小时前</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-md hover:bg-white/20 cursor-pointer">
            <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center text-green-600 text-xs font-bold">X</div>
            <div>
              <p className="text-xs font-medium">财务报表.xlsx</p>
              <p className="text-[10px] text-slate-500">昨天</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-black/5 flex justify-between items-center">
        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-white/20 cursor-pointer">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-slate-600" />
          </div>
          <span className="text-xs font-medium">User</span>
        </div>
        <button className="p-2 rounded-md hover:bg-white/20 transition-colors">
          <Power className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </motion.div>
  );
};

export default StartMenu;
