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
}

const LogicGuardrail: React.FC<Props> = ({ conflicts }) => {
  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-amber-500" />
        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700">逻辑规则校验器 (Logic Guardrail)</h3>
      </div>

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
