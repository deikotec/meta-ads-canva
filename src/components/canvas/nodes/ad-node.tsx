import { Handle, Position } from '@xyflow/react';
import { MousePointerClick } from 'lucide-react';

export default function AdNode({ data }: any) {
  return (
    <div 
       onClick={data.onOpenDetails}
       className="bg-zinc-50 hover:bg-white rounded-xl shadow-sm border border-zinc-200 p-2 w-[220px] cursor-pointer hover:shadow-md transition-all group"
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-zinc-300 group-hover:scale-125 transition-transform" />
      <div className="flex gap-3 items-center">
         <div className="w-12 h-12 rounded-lg bg-zinc-200 overflow-hidden shrink-0 border border-zinc-100 relative">
             {data.thumbnail ? (
                 <img src={data.thumbnail} className="w-full h-full object-cover" />
             ) : (
                 <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">Ad</div>
             )}
         </div>
         <div className="flex-1 overflow-hidden">
             <div className="text-xs font-medium text-zinc-800 truncate mb-1" title={data.name}>{data.name}</div>
             <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                 <MousePointerClick className="w-3 h-3 text-zinc-400" /> {data.metrics?.clicks || 0} clics
             </div>
         </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-transparent border-0" />
    </div>
  );
}
