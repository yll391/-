import React from 'react';
import { Fingerprint, BarChart2 } from 'lucide-react';

interface Props {
  fingerprint: {
    bloody: number;
    poetic: number;
    technical: number;
    emotional: number;
  };
}

const ToneFingerprint: React.FC<Props> = ({ fingerprint }) => {
  const categories = [
    { key: 'bloody', label: '血腥/暴力 (Bloody)', color: 'bg-rose-500' },
    { key: 'poetic', label: '诗意/优美 (Poetic)', color: 'bg-indigo-500' },
    { key: 'technical', label: '技术/严谨 (Technical)', color: 'bg-slate-500' },
    { key: 'emotional', label: '情感/细腻 (Emotional)', color: 'bg-pink-500' },
  ];

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Fingerprint size={18} className="text-indigo-500" />
        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700">风格与语调指纹 (Tone & Voice)</h3>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.key}>
            <div className="flex justify-between text-[10px] mb-1 uppercase font-bold text-slate-400">
              <span>{cat.label}</span>
              <span>{fingerprint[cat.key as keyof typeof fingerprint]}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`${cat.color} h-full transition-all duration-1000`} 
                style={{ width: `${fingerprint[cat.key as keyof typeof fingerprint]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToneFingerprint;
