import { Handle, Position } from '@xyflow/react';
import { Target } from 'lucide-react';

export default function CampaignNode({ data }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 w-[280px]">
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-zinc-300" />
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Target className="w-4 h-4" />
        </div>
        <div className="overflow-hidden">
           <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Campaña</div>
           <div className="text-sm font-semibold text-zinc-900 truncate" title={data.name}>{data.name}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-zinc-100">
         <div>
            <div className="text-[10px] text-zinc-400">INVERSIÓN</div>
            <div className="text-sm font-medium">${data.spend || '0.00'}</div>
         </div>
         <div className="overflow-hidden">
            <div className="text-[10px] text-zinc-400">OBJETIVO</div>
            <div className="text-xs font-medium truncate" title={data.objective}>{data.objective?.replace(/_/g, ' ') || '-'}</div>
         </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-zinc-300" />
    </div>
  );
}
