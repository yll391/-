import React from 'react';
import { Fingerprint, BarChart2 } from 'lucide-react';

interface Props {
  fingerprint: {
    bloody: number;
    poetic: number;
    technical: number;
    emotional: number;
  };
  targetFingerprint: {
    bloody: number;
    poetic: number;
    technical: number;
    emotional: number;
  };
  onUpdateTarget: (target: any) => void;
}

const ToneFingerprint: React.FC<Props> = ({ fingerprint, targetFingerprint, onUpdateTarget }) => {
  const [isEditing, setIsEditing] = React.useState(false);

  const categories = [
    { key: 'bloody', label: '血腥/暴力 (Bloody)', color: 'bg-rose-500' },
    { key: 'poetic', label: '诗意/优美 (Poetic)', color: 'bg-indigo-500' },
    { key: 'technical', label: '技术/严谨 (Technical)', color: 'bg-slate-500' },
    { key: 'emotional', label: '情感/细腻 (Emotional)', color: 'bg-pink-500' },
  ];

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Fingerprint size={18} className="text-indigo-500" />
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700">风格与语调指纹</h3>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="text-[10px] uppercase font-bold text-indigo-600 hover:text-indigo-800"
        >
          {isEditing ? '完成' : '设定目标'}
        </button>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.key}>
            <div className="flex justify-between text-[10px] mb-1 uppercase font-bold text-slate-400">
              <span>{cat.label}</span>
              <div className="flex gap-2">
                <span className="text-indigo-600">目标: {targetFingerprint[cat.key as keyof typeof targetFingerprint]}%</span>
                <span>当前: {fingerprint[cat.key as keyof typeof fingerprint]}%</span>
              </div>
            </div>
            
            {isEditing ? (
              <input 
                type="range"
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                value={targetFingerprint[cat.key as keyof typeof targetFingerprint]}
                onChange={(e) => onUpdateTarget({ ...targetFingerprint, [cat.key]: parseInt(e.target.value) })}
              />
            ) : (
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden relative">
                <div 
                  className={`${cat.color} h-full transition-all duration-1000`} 
                  style={{ width: `${fingerprint[cat.key as keyof typeof fingerprint]}%` }}
                />
                <div 
                  className="absolute top-0 h-full border-r-2 border-indigo-600 z-10"
                  style={{ left: `${targetFingerprint[cat.key as keyof typeof targetFingerprint]}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToneFingerprint;
