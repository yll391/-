import React from 'react';
import { LoreEntry } from '../types';
import { Book, Shield, Package, Calendar, ListTree, Wand2, Trash2 } from 'lucide-react';

interface Props {
  lore: LoreEntry[];
  onAdd: (entry: LoreEntry) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<LoreEntry>) => void;
  onAiExpand: (id: string) => void;
  categoryFilter?: LoreEntry['category'];
  isAiLoading?: boolean;
}

const WorldviewPanel: React.FC<Props> = ({ lore, onAdd, onDelete, onUpdate, onAiExpand, categoryFilter, isAiLoading }) => {
  const filteredLore = categoryFilter ? lore.filter(l => l.category === categoryFilter) : lore;

  const getIcon = (category: LoreEntry['category']) => {
    switch (category) {
      case 'world': return <Book size={16} />;
      case 'item': return <Package size={16} />;
      case 'event': return <Calendar size={16} />;
      case 'outline': return <ListTree size={16} />;
      default: return <Shield size={16} />;
    }
  };

  const getTitle = () => {
    if (categoryFilter === 'outline') return '剧情大纲 (Outline)';
    if (categoryFilter === 'world') return '世界观设定 (Worldview)';
    return '知识库 (Lore)';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{getTitle()}</h3>
        <button 
          onClick={() => onAdd({
            id: Math.random().toString(36).substr(2, 9),
            category: categoryFilter || 'world',
            title: '新条目',
            content: '内容描述...'
          })}
          className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
        >
          + 添加
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredLore.map((entry) => (
          <div key={entry.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 text-slate-700 font-medium flex-1">
                {getIcon(entry.category)}
                <input 
                  value={entry.title}
                  onChange={(e) => onUpdate(entry.id, { title: e.target.value })}
                  className="bg-transparent border-none focus:ring-0 p-0 text-sm font-bold w-full"
                  placeholder="标题"
                />
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onAiExpand(entry.id)}
                  disabled={isAiLoading}
                  className="text-indigo-500 hover:text-indigo-700"
                  title="AI 扩充内容"
                >
                  <Wand2 size={14} className={isAiLoading ? 'animate-pulse' : ''} />
                </button>
                <button 
                  onClick={() => onDelete(entry.id)}
                  className="text-slate-300 hover:text-rose-500 transition-colors"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <textarea 
              value={entry.content}
              onChange={(e) => onUpdate(entry.id, { content: e.target.value })}
              className="text-xs text-slate-500 leading-relaxed w-full bg-transparent border-none focus:ring-0 p-0 resize-none h-24"
              placeholder="详细描述..."
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorldviewPanel;
