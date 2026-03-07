import React from 'react';
import { Resources } from '../types';
import { Coins, Package, BarChart3 } from 'lucide-react';

interface Props {
  resources: Resources;
}

const ResourceMonitor: React.FC<Props> = ({ resources }) => {
  return (
    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg border border-slate-700 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={18} className="text-emerald-400" />
        <h3 className="font-bold text-sm uppercase tracking-wider">数值平衡监控 (Resources)</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
          <div className="bg-amber-500/20 p-2 rounded-full">
            <Coins size={20} className="text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">货币 (Currency)</div>
            <div className="text-xl font-mono font-bold text-amber-50">{resources.money}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
          <div className="bg-emerald-500/20 p-2 rounded-full">
            <Package size={20} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">物资 (Supplies)</div>
            <div className="text-xl font-mono font-bold text-emerald-50">{resources.supplies}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceMonitor;
