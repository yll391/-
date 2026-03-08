import React from 'react';
import { APPS } from '../constants';

interface DesktopProps {
  onAppClick: (appId: string) => void;
}

const Desktop: React.FC<DesktopProps> = ({ onAppClick }) => {
  return (
    <div className="absolute inset-0 p-4 grid grid-flow-col grid-rows-[repeat(auto-fill,100px)] gap-2 content-start justify-start">
      {APPS.map(app => (
        <button
          key={app.id}
          onDoubleClick={() => onAppClick(app.id)}
          className="w-24 h-24 flex flex-col items-center justify-center gap-1 rounded-md hover:bg-white/10 border border-transparent hover:border-white/20 transition-all group active:bg-white/20"
        >
          <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform drop-shadow-lg">
            {app.icon}
          </div>
          <span className="text-xs text-white text-center drop-shadow-md font-medium px-1 line-clamp-2">
            {app.name}
          </span>
        </button>
      ))}
    </div>
  );
};

export default Desktop;
