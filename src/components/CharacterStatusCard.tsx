import React from 'react';
import { Character } from '../types';
import { Heart, Zap, ShieldAlert, Trash2, Wand2 } from 'lucide-react';

interface Props {
  character: Character;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Character>) => void;
  onAiExpand: (id: string) => void;
  isAiLoading?: boolean;
}

const CharacterStatusCard: React.FC<Props> = ({ character, onDelete, onUpdate, onAiExpand, isAiLoading }) => {
  const hpPercent = (character.status.hp / character.status.maxHp) * 100;
  const staminaPercent = (character.status.stamina / character.status.maxStamina) * 100;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4 group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <input 
            value={character.name}
            onChange={(e) => onUpdate(character.id, { name: e.target.value })}
            className="font-bold text-slate-800 text-lg bg-transparent border-none focus:ring-0 p-0 w-full"
            placeholder="角色名称"
          />
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onAiExpand(character.id)}
            disabled={isAiLoading}
            className="text-indigo-500 hover:text-indigo-700"
            title="AI 扩充档案"
          >
            <Wand2 size={16} className={isAiLoading ? 'animate-pulse' : ''} />
          </button>
          <button 
            onClick={() => onDelete(character.id)}
            className="text-slate-300 hover:text-rose-500"
            title="删除角色"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <textarea 
          value={character.description}
          onChange={(e) => onUpdate(character.id, { description: e.target.value })}
          className="text-xs text-slate-500 leading-relaxed w-full bg-transparent border-none focus:ring-0 p-0 resize-none h-16"
          placeholder="角色背景描述..."
        />
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-rose-600 font-medium">
              <Heart size={14} /> 生命值 (HP)
            </span>
            <span>{character.status.hp} / {character.status.maxHp}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-rose-500 h-full transition-all duration-500" 
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-sky-600 font-medium">
              <Zap size={14} /> 体力 (Stamina)
            </span>
            <span>{character.status.stamina} / {character.status.maxStamina}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-sky-500 h-full transition-all duration-500" 
              style={{ width: `${staminaPercent}%` }}
            />
          </div>
        </div>

        {character.status.wounds.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-1 text-amber-600 text-xs font-medium mb-1">
              <ShieldAlert size={14} /> 状态标记 / 伤势
            </div>
            <div className="flex flex-wrap gap-1">
              {character.status.wounds.map((wound, i) => (
                <span key={i} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                  {wound}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterStatusCard;
