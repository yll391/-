import React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface Conflict {
  id: string;
  type: 'logic' | 'lore' | 'tone';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

interface Props {
  conflicts: Conflict[];
  rules: string[];
  onUpdateRules: (rules: string[]) => void;
}

const LogicGuardrail: React.FC<Props> = ({ conflicts, rules, onUpdateRules }) => {
  const [isEditing, setIsEditing] = React.useState(false);

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" />
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700">逻辑规则校验器</h3>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="text-[10px] uppercase font-bold text-indigo-600 hover:text-indigo-800"
        >
          {isEditing ? '完成' : '修改规则'}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-2 mb-4">
          <textarea 
            className="w-full text-xs p-2 rounded border border-slate-200 h-24 font-mono"
            value={rules.join('\n')}
            onChange={(e) => onUpdateRules(e.target.value.split('\n'))}
            placeholder="每行输入一条规则..."
          />
        </div>
      ) : (
        <div className="flex flex-wrap gap-1 mb-4">
          {rules.map((rule, i) => (
            <span key={i} className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
              {rule}
            </span>
          ))}
        </div>
      )}

      {conflicts.length === 0 ? (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
          <CheckCircle2 size={16} />
          <span className="text-xs font-medium">暂无逻辑冲突或设定矛盾</span>
        </div>
      ) : (
        <div className="space-y-2">
          {conflicts.map((conflict) => (
            <div 
              key={conflict.id} 
              className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${
                conflict.severity === 'high' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                conflict.severity === 'medium' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                'bg-blue-50 border-blue-100 text-blue-700'
              }`}
            >
              <Info size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold uppercase mb-1">{conflict.type} 冲突</div>
                <p className="leading-relaxed">{conflict.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LogicGuardrail;
