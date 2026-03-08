import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { WindowState } from '../types';
import { X, Minus, Maximize2 } from 'lucide-react';

interface WindowProps {
  window: WindowState;
  isActive: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  updatePosition: (pos: { x: number; y: number }) => void;
  updateSize: (size: { width: number; height: number }) => void;
  toggleMaximize: () => void;
  children: React.ReactNode;
}

const Window: React.FC<WindowProps> = ({
  window,
  isActive,
  onClose,
  onMinimize,
  onFocus,
  updatePosition,
  updateSize,
  toggleMaximize,
  children
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    onFocus();
    if (window.isMaximized) return;
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - window.position.x,
      y: e.clientY - window.position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updatePosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, updatePosition]);

  const windowStyle = window.isMaximized 
    ? { top: 0, left: 0, width: '100vw', height: 'calc(100vh - 48px)', borderRadius: 0 }
    : { 
        top: window.position.y, 
        left: window.position.x, 
        width: window.size.width, 
        height: window.size.height,
        borderRadius: '8px'
      };

  return (
    <motion.div
      ref={windowRef}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2 }}
      className={`fixed win-mica win-window-shadow flex flex-col overflow-hidden ${isActive ? 'z-[500]' : ''}`}
      style={{ 
        ...windowStyle,
        zIndex: window.zIndex,
        transition: isDragging ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onClick={onFocus}
    >
      {/* Title Bar */}
      <div 
        className="h-10 flex items-center justify-between px-3 cursor-default select-none bg-white/30"
        onMouseDown={handleMouseDown}
        onDoubleClick={toggleMaximize}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-700">{window.title}</span>
        </div>
        <div className="flex items-center">
          <button 
            onClick={(e) => { e.stopPropagation(); onMinimize(); }}
            className="w-10 h-10 flex items-center justify-center hover:bg-black/5 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleMaximize(); }}
            className="w-10 h-10 flex items-center justify-center hover:bg-black/5 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-10 h-10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-white/80 custom-scrollbar">
        {children}
      </div>
    </motion.div>
  );
};

export default Window;
