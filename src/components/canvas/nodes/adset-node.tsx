import { Handle, Position } from '@xyflow/react';
import { Users, MapPin, Target } from 'lucide-react';

export default function AdSetNode({ data }: any) {
  const { targeting } = data;
  
  let geoNames: string[] = [];
  if (targeting?.geo_locations) {
      if (targeting.geo_locations.countries?.length > 0) geoNames.push(...targeting.geo_locations.countries);
      if (targeting.geo_locations.regions?.length > 0) geoNames.push(...targeting.geo_locations.regions.map((r:any) => r.name));
      if (targeting.geo_locations.cities?.length > 0) geoNames.push(...targeting.geo_locations.cities.map((c:any) => c.name));
  }
  const geoText = geoNames.length > 0 ? geoNames.slice(0, 3).join(', ') + (geoNames.length > 3 ? '...' : '') : 'Global/Custom';
  
  let interests: string[] = [];
  if (targeting?.flexible_spec) {
      targeting.flexible_spec.forEach((spec: any) => {
          if (spec.interests) interests.push(...spec.interests.map((i:any) => i.name));
          if (spec.behaviors) interests.push(...spec.behaviors.map((b:any) => b.name));
      });
  }
  const audienceText = interests.length > 0 ? interests.slice(0, 2).join(', ') + (interests.length > 2 ? '...' : '') : 'Abierto / Lookalike';
  const ages = targeting ? `${targeting.age_min || 18}-${targeting.age_max || '65+'}` : '';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-3 w-[260px]">
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-zinc-300" />
      
      <div className="flex items-center gap-2 mb-2 border-b border-zinc-100 pb-2">
        <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Users className="w-3 h-3" />
        </div>
        <div className="flex-1 overflow-hidden">
           <div className="text-xs font-semibold text-zinc-900 truncate" title={data.name}>{data.name}</div>
        </div>
      </div>
      
      {targeting && (
        <div className="flex flex-col gap-1.5 px-0.5">
           <div className="flex items-center gap-2 text-[10px] text-zinc-500">
             <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
             <span className="truncate leading-tight">{geoText}</span>
           </div>
           <div className="flex items-center gap-2 text-[10px] text-zinc-500">
             <Target className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
             <span className="truncate leading-tight">{audienceText} ({ages})</span>
           </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-zinc-300" />
    </div>
  );
}
