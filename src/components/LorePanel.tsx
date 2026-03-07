import React from 'react';
import { LoreEntry } from '../types';
import { Book, Shield, Package, Calendar } from 'lucide-react';

interface Props {
  lore: LoreEntry[];
  onAdd: (entry: LoreEntry) => void;
  onDelete: (id: string) => void;
}

const LorePanel: React.FC<Props> = ({ lore, onAdd, onDelete }) => {
  const getIcon = (category: LoreEntry['category']) => {
    switch (category) {
      case 'world': return <Book size={16} />;
      case 'item': return <Package size={16} />;
      case 'event': return <Calendar size={16} />;
      default: return <Shield size={16} />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-800">动态知识库 (Lore)</h3>
        <button 
          onClick={() => onAdd({
            id: Math.random().toString(36).substr(2, 9),
            category: 'world',
            title: '新条目',
            content: '内容描述...'
          })}
          className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
        >
          + 添加
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {lore.map((entry) => (
          <div key={entry.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                {getIcon(entry.category)}
                <span>{entry.title}</span>
              </div>
              <button 
                onClick={() => onDelete(entry.id)}
                className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
              {entry.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LorePanel;
