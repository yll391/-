import React from 'react';
import { Character } from '../types';
import { Heart, Zap, ShieldAlert } from 'lucide-react';

interface Props {
  character: Character;
}

const CharacterStatusCard: React.FC<Props> = ({ character }) => {
  const hpPercent = (character.status.hp / character.status.maxHp) * 100;
  const staminaPercent = (character.status.stamina / character.status.maxStamina) * 100;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-slate-800 text-lg">{character.name}</h3>
        <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
          ID: {character.id}
        </span>
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
