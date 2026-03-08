import React, { useState, useEffect } from 'react';
import { Save, Trash2, Plus } from 'lucide-react';

const Notepad: React.FC = () => {
  const [content, setContent] = useState(() => {
    return localStorage.getItem('win11_notepad_content') || '';
  });

  useEffect(() => {
    localStorage.setItem('win11_notepad_content', content);
  }, [content]);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center gap-2 p-2 border-bottom border-slate-100 bg-slate-50/50">
        <button className="p-1.5 hover:bg-slate-200 rounded transition-colors text-xs flex items-center gap-1">
          文件
        </button>
        <button className="p-1.5 hover:bg-slate-200 rounded transition-colors text-xs flex items-center gap-1">
          编辑
        </button>
        <button className="p-1.5 hover:bg-slate-200 rounded transition-colors text-xs flex items-center gap-1">
          查看
        </button>
      </div>
      <textarea
        className="flex-1 p-4 resize-none focus:outline-none font-mono text-sm leading-relaxed"
        placeholder="在此输入文本..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="p-1 px-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500">
        <span>第 1 行，第 {content.length} 列</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
};

export default Notepad;
