"use client";

import { useMemo, useState, useEffect } from "react";
import { ReactFlow, Background, Controls, Edge, Node, Position, Handle, useNodesState, useEdgesState } from "@xyflow/react";
import '@xyflow/react/dist/style.css';

import CampaignNode from "./nodes/campaign-node";
import AdSetNode from "./nodes/adset-node";
import AdNode from "./nodes/ad-node";
import { getAdPreviewAction } from '@/actions/meta-actions';
import { Activity, X, MonitorPlay } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function AdsMindMap({ clientName, selectedMetrics = ['spend', 'clicks', 'impressions', 'cpc'], campaigns, adSets, adsMetrics, adsMetadata, currentDatePreset = 'maximum' }: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleDateChange = (preset: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('date', preset);
      router.push(`${pathname}?${params.toString()}`);
  };

  // Nodos registrados
  const nodeTypes = useMemo(() => ({
    campaign: CampaignNode,
    adset: AdSetNode,
    ad: AdNode
  }), []);

  // Lógica de construcción del árbol
  const buildGraph = () => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Nodo Raíz
    nodes.push({
      id: 'root',
      type: 'default',
      position: { x: 0, y: 0 },
      data: { label: <div className="font-bold text-lg text-black px-4 py-2">{clientName}</div> },
      style: { backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e4e4e7', padding: 0 }
    });

    let currentY = -200;
    
    // Nodos de Campaña (Layer 1)
    campaigns.forEach((camp: any, cIndex: number) => {
        const campId = `camp-${camp.campaign_id}`;
        nodes.push({
            id: campId,
            type: 'campaign',
            position: { x: 350, y: currentY },
            data: { 
              name: camp.campaign_name, 
              spend: camp.spend, 
              clicks: camp.clicks, 
              status: camp.status || 'ACTIVE',
              objective: camp.objective
            }
        });
        edges.push({ id: `e-root-${campId}`, source: 'root', target: campId, type: 'smoothstep', animated: true, style: { stroke: '#a1a1aa', strokeWidth: 2 } });

        const myAdSets = adSets.filter((a: any) => a.campaign_id === camp.campaign_id);
        
        let localAdsetY = currentY - (myAdSets.length * 100) / 2;
        myAdSets.forEach((adset: any, aIndex: number) => {
            const adsetId = `adset-${adset.id || adset.adset_id}`;
            nodes.push({
                id: adsetId,
                type: 'adset',
                position: { x: 700, y: localAdsetY },
                data: {
                    name: adset.name || adset.adset_name,
                    spend: adset.spend,
                    goal: adset.optimization_goal,
                    targeting: adset.targeting
                }
            });
            edges.push({ id: `e-${campId}-${adsetId}`, source: campId, target: adsetId, type: 'smoothstep', style: { stroke: '#a1a1aa', strokeWidth: 1.5 } });

            const myAdsInfo = adsMetadata.filter((a:any) => a.adset_id === (adset.id || adset.adset_id));
            const myAdsMetrics = adsMetrics.filter((a:any) => a.adset_id === (adset.id || adset.adset_id));

            let localAdY = localAdsetY - (myAdsInfo.length * 80) / 2;

            myAdsInfo.forEach((ad: any, adIndex: number) => {
                const adId = `ad-${ad.id}`;
                const metrics = myAdsMetrics.find((m:any) => m.ad_id === ad.id) || {};
                
                nodes.push({
                    id: adId,
                    type: 'ad',
                    position: { x: 1050, y: localAdY },
                    data: {
                        name: ad.name,
                        status: ad.status,
                        thumbnail: ad.creative?.thumbnail_url,
                        metrics: metrics,
                        onOpenDetails: () => setOpenedAd({ ad, metrics })
                    }
                });
                edges.push({ id: `e-${adsetId}-${adId}`, source: adsetId, target: adId, type: 'smoothstep', style: { stroke: '#d4d4d8', strokeWidth: 1.2 } });
                localAdY += 150;
            });
            localAdsetY += Math.max((myAdsInfo.length * 150), 100);
        });
        currentY = Math.max(currentY + 200, localAdsetY + 100);
    });

    return { nodes, edges };
  };

  const { nodes: initialNodes, edges: initialEdges } = useMemo(buildGraph, [campaigns, adSets, adsMetadata, adsMetrics]);

  const [openedAd, setOpenedAd] = useState<any | null>(null);
  const [adPreviewHtml, setAdPreviewHtml] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewFormat, setPreviewFormat] = useState('INSTAGRAM_STANDARD');

  const loadPreview = async (adId: string, format: string) => {
    setIsLoadingPreview(true);
    setAdPreviewHtml(null);
    const res = await getAdPreviewAction(adId, format);
    if (res.success && res.html) {
      setAdPreviewHtml(res.html);
    } else {
      alert('No se pudo cargar la vista previa: ' + res.error);
    }
    setIsLoadingPreview(false);
  };

  // Auto-cargar preview en formato Instagram al abrir el modal
  useEffect(() => {
    if (openedAd?.ad?.id) {
      setPreviewFormat('INSTAGRAM_STANDARD');
      loadPreview(openedAd.ad.id, 'INSTAGRAM_STANDARD');
    } else {
      setAdPreviewHtml(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedAd?.ad?.id]);

  return (
    <div className="w-full h-full relative">
      {/* Header flotante */}
      <div className="absolute top-6 left-6 z-10 pointer-events-auto flex items-center gap-6">
        <div>
           <h1 className="text-2xl font-bold text-zinc-900 drop-shadow-sm">{clientName}</h1>
           <p className="text-sm font-medium text-zinc-500 drop-shadow-sm">Rendimiento en Tiempo Real</p>
        </div>
        <div className="bg-white/90 backdrop-blur border border-zinc-200 rounded-xl px-3 py-1.5 shadow-sm text-sm font-medium text-zinc-700 flex items-center gap-2">
          <select 
             value={currentDatePreset.startsWith('{') ? 'custom' : currentDatePreset}
             onChange={(e) => {
                if (e.target.value === 'custom') {
                    // Just show inputs, do not navigate yet
                } else {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('date', e.target.value);
                    router.push(`${pathname}?${params.toString()}`);
                }
             }}
             className="bg-transparent focus:outline-none cursor-pointer"
          >
             <option value="maximum">Máximo (Historico)</option>
             <option value="today">Hoy</option>
             <option value="yesterday">Ayer</option>
             <option value="this_week_mon_today">Esta Semana</option>
             <option value="last_week_mon_sun">Semana Pasada</option>
             <option value="last_30d">Últimos 30 días</option>
             <option value="last_7d">Últimos 7 días</option>
             <option value="this_month">Este Mes</option>
             <option value="last_month">Mes Pasado</option>
             <option value="custom">Personalizado</option>
          </select>
          {currentDatePreset.startsWith('{') || typeof window !== 'undefined' && document.querySelector('select')?.value === 'custom' ? (
              <div className="flex items-center gap-2 border-l border-zinc-200 pl-2 ml-1">
                  <input type="date" id="custom-start" className="bg-transparent border-b border-zinc-300 focus:outline-none text-xs" />
                  <span className="text-zinc-400">-</span>
                  <input type="date" id="custom-end" className="bg-transparent border-b border-zinc-300 focus:outline-none text-xs" />
                  <button 
                     onClick={() => {
                         const start = (document.getElementById('custom-start') as HTMLInputElement).value;
                         const end = (document.getElementById('custom-end') as HTMLInputElement).value;
                         if (start && end) {
                              const val = JSON.stringify({ since: start, until: end });
                              const params = new URLSearchParams(searchParams.toString());
                              params.set('date', val);
                              router.push(`${pathname}?${params.toString()}`);
                         }
                     }}
                     className="bg-black text-white px-2 py-1 rounded text-xs ml-1 hover:bg-zinc-800"
                  >Ok</button>
              </div>
          ) : null}
        </div>
      </div>
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        className="bg-[#fafafa]"
      >
        <Background gap={24} color="#f4f4f5" />
        <Controls showInteractive={false} />
      </ReactFlow>

      {/* MODAL DEL AD */}
      {openedAd && (() => {
        const ad = openedAd.ad;
        const metrics = openedAd.metrics;
        
        // Helper metrics
        const getActionValue = (metricsObj: any, actionTypes: string[]) => {
           if (!metricsObj?.actions) return '0';
           const action = metricsObj.actions.find((a: any) => actionTypes.includes(a.action_type));
           return action ? action.value : '0';
        };
        const getCostValue = (metricsObj: any, actionTypes: string[]) => {
           if (!metricsObj?.cost_per_action_type) return '0.00';
           const action = metricsObj.cost_per_action_type.find((a: any) => actionTypes.includes(a.action_type));
           return action ? Number(action.value).toFixed(2) : '0.00';
        };

        const conversations = getActionValue(metrics, ['onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.messaging_conversation_started', 'messaging_conversation_started_7d']);
        const cpcConversations = getCostValue(metrics, ['onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.messaging_conversation_started', 'messaging_conversation_started_7d']);
        
        // Heuristica para "Resultados" (Mensajes, Leads, Compras, Clics)
        const results = getActionValue(metrics, ['onsite_conversion.messaging_conversation_started_7d', 'lead', 'purchase', 'offsite_conversion.fb_pixel_lead', 'link_click']);
        const cpr = getCostValue(metrics, ['onsite_conversion.messaging_conversation_started_7d', 'lead', 'purchase', 'offsite_conversion.fb_pixel_lead', 'link_click']);

        // Detección de formato dinámico/flexible (solo para badge)
        const assetFeed = ad.creative?.asset_feed_spec;
        const assetGroups = ad.creative?.creative_asset_groups_spec;
        const degreesFormat = ad.creative?.degrees_of_freedom_spec;
        const isFlexible = !!assetFeed || !!assetGroups || !!degreesFormat;

        // Copy / Texto principal
        let bodyTexts: string[] = [];
        if (isFlexible && assetFeed?.bodies) {
            bodyTexts = assetFeed.bodies.map((b: { text: string }) => b.text);
        } else {
            const txt = ad.creative?.body || ad.creative?.object_story_spec?.link_data?.message || ad.creative?.object_story_spec?.video_data?.message;
            if (txt) bodyTexts.push(txt);
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
             <div className="w-full max-w-[500px] max-h-[90vh] bg-white shadow-2xl rounded-2xl p-6 overflow-y-auto animate-in zoom-in-95 duration-200">
             <button 
               onClick={() => setOpenedAd(null)}
               className="absolute top-4 right-4 p-2 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors flex-shrink-0"
             >
                <X className="w-5 h-5 text-zinc-600" />
             </button>
             
             <h2 className="text-xl font-bold mt-4 mb-1 text-zinc-900 pr-10">{ad.name}</h2>
             <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-3">
                <Activity className="w-3 h-3"/> {ad.status}
                {isFlexible && (
                    <span className="ml-1 px-2 py-0.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full font-sans font-medium">✦ Advantage+ Creative</span>
                )}
             </div>
             {isFlexible && (
                 <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                     <p className="text-[11px] text-amber-700 leading-relaxed">
                         <strong>Formato Dinámico:</strong> Meta mezcla automáticamente tus {' '}
                         <strong>10 recursos</strong> (fotos y videos) para crear combinaciones únicas por usuario — carrusel, imagen única o video. Solo el Administrador de Meta puede renderizar todas las combinaciones.
                     </p>
                 </div>
             )}

             {/* Instagram permalink: link directo al post de referencia */}
             {ad.creative?.instagram_permalink_url && (
                 <a
                    href={ad.creative.instagram_permalink_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 mb-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
                 >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    Ver post de referencia en Instagram →
                 </a>
             )}




             {/* Action Button: Load Meta Ad Preview */}
             <div className="mb-4">
                 <div className="flex items-center gap-2 mb-2">
                     <span className="text-[11px] font-medium text-zinc-500">Formato de Vista: </span>
                     <div className="flex flex-wrap gap-1">
                         {[
                             { label: '📱 Feed Mobile', value: 'MOBILE_FEED_STANDARD' },
                             { label: '🖵 Feed Desktop', value: 'DESKTOP_FEED_STANDARD' },
                             { label: '📷 Instagram', value: 'INSTAGRAM_STANDARD' },
                             { label: '⏰ Story IG', value: 'INSTAGRAM_STORY' },
                             { label: '🎬 Reels', value: 'INSTAGRAM_REELS' },
                         ].map(({ label, value }) => (
                             <button
                                 key={value}
                                 onClick={() => { setPreviewFormat(value); loadPreview(ad.id, value); }}
                                 className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                                     previewFormat === value
                                         ? 'bg-blue-600 text-white border-blue-600'
                                         : 'bg-white text-zinc-600 border-zinc-200 hover:border-blue-300'
                                 }`}
                             >
                                 {label}
                             </button>
                         ))}
                     </div>
                 </div>

                 {!adPreviewHtml ? (
                     <button
                         onClick={() => loadPreview(ad.id, previewFormat)}
                         disabled={isLoadingPreview}
                         className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-medium transition-colors text-sm disabled:opacity-60"
                     >
                         <MonitorPlay className="w-4 h-4" />
                         {isLoadingPreview ? 'Cargando simulador...' : 'Ver Previsualización Real de Facebook'}
                     </button>
                 ) : (
                     <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white">
                         <div className="bg-zinc-50 py-2 px-3 flex justify-between items-center border-b border-zinc-200">
                             <span className="text-xs font-semibold text-zinc-500">📱 Simulador Oficial de Meta</span>
                             <div className="flex items-center gap-2">
                                 <button
                                     onClick={() => loadPreview(ad.id, previewFormat)}
                                     disabled={isLoadingPreview}
                                     className="text-[10px] text-blue-500 hover:text-blue-700 py-1 px-2 transition-colors disabled:opacity-40"
                                 >
                                     {isLoadingPreview ? '...' : '↻ Recargar'}
                                 </button>
                                 <button onClick={() => setAdPreviewHtml(null)} className="text-xs text-zinc-400 hover:text-red-500 py-1 px-2 transition-colors">✕ Cerrar</button>
                             </div>
                         </div>
                         <div className="w-full overflow-auto flex justify-center bg-white py-4 max-h-[540px]" dangerouslySetInnerHTML={{ __html: adPreviewHtml }} />
                     </div>
                 )}
                 <p className="text-[10px] text-zinc-400 mt-1 text-center">Cambia el formato de arriba para ver distintas variaciones del anuncio flexible.</p>
             </div>


             <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Resultados Clave</h3>

             
             <div className="grid grid-cols-2 gap-3 mb-6">
                {selectedMetrics.includes('spend') && (
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="text-xs text-zinc-500 mb-1">Inversión</div>
                      <div className="text-lg font-medium text-black">${metrics.spend || '0.00'}</div>
                    </div>
                )}
                {selectedMetrics.includes('results') && (
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div className="text-xs text-zinc-500 mb-1">Resultados</div>
                        <div className="text-lg font-medium text-black">{results}</div>
                    </div>
                )}
                {selectedMetrics.includes('cpr') && (
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div className="text-xs text-zinc-500 mb-1">Costo por Resultado</div>
                        <div className="text-lg font-medium text-black">${cpr}</div>
                    </div>
                )}
                {selectedMetrics.includes('reach') && (
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div className="text-xs text-zinc-500 mb-1">Alcance</div>
                        <div className="text-lg font-medium text-black">{metrics.reach || '0'}</div>
                    </div>
                )}
                {selectedMetrics.includes('conversations') && (
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div className="text-xs text-zinc-500 mb-1">Conversaciones</div>
                        <div className="text-lg font-medium text-black">{conversations}</div>
                    </div>
                )}
                {selectedMetrics.includes('cpc_conversations') && (
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div className="text-xs text-zinc-500 mb-1">Costo / Conversación</div>
                        <div className="text-lg font-medium text-black">${cpcConversations}</div>
                    </div>
                )}
                {selectedMetrics.includes('clicks') && (
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="text-xs text-zinc-500 mb-1">Clics</div>
                      <div className="text-lg font-medium text-black">{metrics.clicks || '0'}</div>
                    </div>
                )}
                {selectedMetrics.includes('impressions') && (
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="text-xs text-zinc-500 mb-1">Impresiones</div>
                      <div className="text-lg font-medium text-black">{metrics.impressions || '0'}</div>
                    </div>
                )}
                {selectedMetrics.includes('cpc') && (
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="text-xs text-zinc-500 mb-1">Costo por Clic</div>
                      <div className="text-lg font-medium text-black">${metrics.cpc || '0.00'}</div>
                    </div>
                )}
                {selectedMetrics.includes('roas') && (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="text-xs text-emerald-600 mb-1">ROAS</div>
                      <div className="text-lg font-medium text-emerald-900">{metrics.purchase_roas ? metrics.purchase_roas[0]?.value : '0.00'}x</div>
                    </div>
                )}
             </div>
          </div>
          </div>
        );
      })()}
    </div>
  );
}
