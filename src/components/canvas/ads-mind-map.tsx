"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { ReactFlow, Background, Controls, Edge, Node } from "@xyflow/react";
import '@xyflow/react/dist/style.css';

import CampaignNode from "./nodes/campaign-node";
import AdSetNode from "./nodes/adset-node";
import AdNode from "./nodes/ad-node";
import { Activity, X, ChevronDown, ChevronRight, Target, Users, MousePointerClick, Calendar } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// ─── Mobile detection hook ──────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

// ─── Loading overlay ─────────────────────────────────────────────
function InsightsLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-30 bg-white/50 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-3 bg-white/90 border border-zinc-200 rounded-2xl px-8 py-5 shadow-lg">
        <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
        <span className="text-sm text-zinc-600 font-medium">Actualizando métricas…</span>
      </div>
    </div>
  );
}

// ─── Date selector ───────────────────────────────────────────────
function DateSelector({ currentDatePreset, onDateChange }: {
  currentDatePreset: string;
  onDateChange: (date: string) => void;
}) {
  return (
    <select
      value={currentDatePreset.startsWith('{') ? 'custom' : currentDatePreset}
      onChange={(e) => {
        if (e.target.value !== 'custom') {
          onDateChange(e.target.value);
        }
      }}
      className="bg-transparent focus:outline-none cursor-pointer text-sm font-medium text-zinc-700 w-full"
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
  );
}

// ─── Carousel image with error fallback ─────────────────────────
function CarouselImage({ src, index }: { src: string; index: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-zinc-400 gap-1">
        <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-[10px]">Tarjeta {index + 1}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Tarjeta ${index + 1}`}
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
    />
  );
}

// ─── Ad Detail Modal ─────────────────────────────────────────────
function AdModal({ openedAd, onClose, selectedMetrics }: { openedAd: any, onClose: () => void, selectedMetrics: string[] }) {
  const ad = openedAd.ad;
  const metrics = openedAd.metrics;

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
  const results = getActionValue(metrics, ['onsite_conversion.messaging_conversation_started_7d', 'lead', 'purchase', 'offsite_conversion.fb_pixel_lead', 'link_click']);
  const cpr = getCostValue(metrics, ['onsite_conversion.messaging_conversation_started_7d', 'lead', 'purchase', 'offsite_conversion.fb_pixel_lead', 'link_click']);

  const assetFeed = ad.creative?.asset_feed_spec;
  const assetGroups = ad.creative?.creative_asset_groups_spec;
  const degreesFormat = ad.creative?.degrees_of_freedom_spec;
  const isFlexible = !!assetFeed || !!assetGroups || !!degreesFormat;

  const childAttachments = ad.creative?.object_story_spec?.link_data?.child_attachments || [];
  const isCarousel = childAttachments.length > 0;

  const singleVideoId = ad.creative?.video_id || ad.creative?.object_story_spec?.video_data?.video_id;
  const fallbackImage = ad.creative?.image_url
    || ad.creative?.object_story_spec?.link_data?.picture
    || ad.creative?.object_story_spec?.video_data?.thumbnail_url
    || ad.creative?.thumbnail_url;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-[500px] max-h-[92dvh] sm:max-h-[90vh] bg-white shadow-2xl rounded-t-2xl sm:rounded-2xl flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Modal header — sticky */}
        <div className="flex items-start justify-between p-5 pb-3 border-b border-zinc-100 shrink-0">
          <div className="flex-1 pr-3">
            <h2 className="text-base font-bold text-zinc-900 leading-tight">{ad.name}</h2>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mt-1 flex-wrap">
              <Activity className="w-3 h-3 shrink-0" /> {ad.status}
              {isFlexible && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full font-sans font-medium">✦ Advantage+ Creative</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors shrink-0"
          >
            <X className="w-5 h-5 text-zinc-600" />
          </button>
        </div>

        {/* Modal body — scrollable */}
        <div className="overflow-y-auto flex-1 overscroll-contain p-5 pt-4">
          {/* Instagram permalink */}
          {ad.creative?.instagram_permalink_url && (
            <a
              href={ad.creative.instagram_permalink_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 mb-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
              Ver post en Instagram →
            </a>
          )}

          {/* Creative */}
          {isCarousel ? (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Carrusel</h4>
                <span className="text-[10px] text-zinc-400">{childAttachments.length} tarjetas</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x -mx-1 px-1">
                {childAttachments.map((item: any, i: number) => {
                  const imgSrc = item.image_url || item.picture || null;
                  return (
                    <div key={i} className="min-w-[80%] shrink-0 snap-center">
                      <div className="aspect-square bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200 relative">
                        {item.video_id ? (
                          <iframe
                            src={`https://www.facebook.com/video/embed?video_id=${item.video_id}`}
                            frameBorder="0"
                            allowFullScreen
                            className="w-full h-full"
                          />
                        ) : imgSrc ? (
                          <CarouselImage src={imgSrc} index={i} />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-1 text-zinc-400">
                            <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px]">Sin imagen</span>
                          </div>
                        )}
                      </div>
                      {(item.name || item.description) && (
                        <p className="text-[10px] text-zinc-500 mt-1 truncate px-0.5">
                          {item.name || item.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          ) : (
            <div className="w-full aspect-square bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200 mb-5">
              {singleVideoId ? (
                <iframe src={`https://www.facebook.com/video/embed?video_id=${singleVideoId}`} frameBorder="0" allowFullScreen className="w-full h-full" />
              ) : fallbackImage ? (
                <img src={fallbackImage} alt="Creativo" className="w-full h-full object-contain bg-black/5" />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sin vista previa</div>
              )}
            </div>
          )}

          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Resultados Clave</h3>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {selectedMetrics.includes('spend') && (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="text-xs text-zinc-500 mb-1">Inversión</div>
                <div className="text-base font-semibold text-black">${metrics.spend || '0.00'}</div>
              </div>
            )}
            {selectedMetrics.includes('results') && (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="text-xs text-zinc-500 mb-1">Resultados</div>
                <div className="text-base font-semibold text-black">{results}</div>
              </div>
            )}
            {selectedMetrics.includes('cpr') && (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="text-xs text-zinc-500 mb-1">Costo por Resultado</div>
                <div className="text-base font-semibold text-black">${cpr}</div>
              </div>
            )}
            {selectedMetrics.includes('reach') && (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="text-xs text-zinc-500 mb-1">Alcance</div>
                <div className="text-base font-semibold text-black">{metrics.reach || '0'}</div>
              </div>
            )}
            {selectedMetrics.includes('conversations') && (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="text-xs text-zinc-500 mb-1">Conversaciones</div>
                <div className="text-base font-semibold text-black">{conversations}</div>
              </div>
            )}
            {selectedMetrics.includes('cpc_conversations') && (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="text-xs text-zinc-500 mb-1">Costo / Conversación</div>
                <div className="text-base font-semibold text-black">${cpcConversations}</div>
              </div>
            )}
            {selectedMetrics.includes('clicks') && (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="text-xs text-zinc-500 mb-1">Clics</div>
                <div className="text-base font-semibold text-black">{metrics.clicks || '0'}</div>
              </div>
            )}
            {selectedMetrics.includes('impressions') && (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="text-xs text-zinc-500 mb-1">Impresiones</div>
                <div className="text-base font-semibold text-black">{metrics.impressions || '0'}</div>
              </div>
            )}
            {selectedMetrics.includes('cpc') && (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="text-xs text-zinc-500 mb-1">Costo por Clic</div>
                <div className="text-base font-semibold text-black">${metrics.cpc || '0.00'}</div>
              </div>
            )}
            {selectedMetrics.includes('roas') && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-xs text-emerald-600 mb-1">ROAS</div>
                <div className="text-base font-semibold text-emerald-900">{metrics.purchase_roas ? metrics.purchase_roas[0]?.value : '0.00'}x</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile List View ────────────────────────────────────────────
function MobileListView({ clientName, campaigns, adSets, adsMetrics, adsMetadata, selectedMetrics, currentDatePreset, onDateChange, isLoadingInsights }: any) {
  const [openedAd, setOpenedAd] = useState<any | null>(null);
  const [expandedCamps, setExpandedCamps] = useState<Set<string>>(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set());

  const toggleCamp = (id: string) => setExpandedCamps(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAdset = (id: string) => setExpandedAdsets(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div className="flex flex-col min-h-dvh bg-[#fafafa] relative">
      {/* Loading overlay */}
      {isLoadingInsights && <InsightsLoadingOverlay />}

      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-zinc-100 px-4 pt-safe-top">
        <div className="pt-4 pb-3">
          <h1 className="text-xl font-bold text-zinc-900 leading-tight">{clientName}</h1>
          <p className="text-xs font-medium text-zinc-400 mt-0.5">Rendimiento en Tiempo Real</p>
        </div>
        <div className="pb-3 flex items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-200">
          <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <DateSelector currentDatePreset={currentDatePreset} onDateChange={onDateChange} />
        </div>
        <div className="h-3" />
      </div>

      {/* Campaign list */}
      <div className="flex-1 px-4 py-4 space-y-3 pb-safe-bottom pb-8">
        {campaigns.map((camp: any) => {
          const campId = camp.campaign_id;
          const isOpen = expandedCamps.has(campId);
          const myAdSets = adSets.filter((a: any) => a.campaign_id === campId);

          return (
            <div key={campId} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              {/* Campaign header */}
              <button
                onClick={() => toggleCamp(campId)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-zinc-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Campaña</div>
                  <div className="text-sm font-semibold text-zinc-900 truncate">{camp.campaign_name}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-zinc-500">${camp.spend || '0.00'} invertido</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${camp.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {camp.status || 'ACTIVE'}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* AdSets */}
              {isOpen && (
                <div className="border-t border-zinc-100">
                  {myAdSets.length === 0 && (
                    <p className="text-xs text-zinc-400 px-4 py-3">Sin conjuntos de anuncios</p>
                  )}
                  {myAdSets.map((adset: any) => {
                    const adsetId = adset.id || adset.adset_id;
                    const isAdsetOpen = expandedAdsets.has(adsetId);
                    const myAdsInfo = adsMetadata.filter((a: any) => a.adset_id === adsetId);
                    const myAdsMetrics = adsMetrics.filter((a: any) => a.adset_id === adsetId);

                    return (
                      <div key={adsetId} className="border-t border-zinc-100 first:border-t-0">
                        <button
                          onClick={() => toggleAdset(adsetId)}
                          className="w-full flex items-center gap-3 px-4 py-3 pl-6 text-left active:bg-zinc-50 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-zinc-800 truncate">{adset.name || adset.adset_name}</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">{myAdsInfo.length} anuncio{myAdsInfo.length !== 1 ? 's' : ''}</div>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${isAdsetOpen ? 'rotate-90' : ''}`} />
                        </button>

                        {/* Ads */}
                        {isAdsetOpen && (
                          <div className="bg-zinc-50 border-t border-zinc-100 divide-y divide-zinc-100">
                            {myAdsInfo.length === 0 && (
                              <p className="text-xs text-zinc-400 px-6 py-3">Sin anuncios</p>
                            )}
                            {myAdsInfo.map((ad: any) => {
                              const metrics = myAdsMetrics.find((m: any) => m.ad_id === ad.id) || {};
                              return (
                                <button
                                  key={ad.id}
                                  onClick={() => setOpenedAd({ ad, metrics })}
                                  className="w-full flex items-center gap-3 px-4 py-3 pl-9 text-left active:bg-zinc-100 transition-colors"
                                >
                                  <div className="w-10 h-10 rounded-lg bg-zinc-200 overflow-hidden shrink-0 border border-zinc-100">
                                    {ad.creative?.thumbnail_url ? (
                                      <img src={ad.creative.thumbnail_url} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-zinc-400 text-[10px]">Ad</div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-zinc-800 truncate">{ad.name}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                        <MousePointerClick className="w-3 h-3" /> {metrics.clicks || 0} clics
                                      </span>
                                      {metrics.spend && (
                                        <span className="text-[10px] text-zinc-400">${metrics.spend}</span>
                                      )}
                                    </div>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ad modal */}
      {openedAd && (
        <AdModal openedAd={openedAd} onClose={() => setOpenedAd(null)} selectedMetrics={selectedMetrics} />
      )}
    </div>
  );
}

// ─── Desktop Canvas View ─────────────────────────────────────────
function DesktopCanvasView({ clientName, campaigns, adSets, adsMetrics, adsMetadata, selectedMetrics, currentDatePreset, onDateChange, isLoadingInsights }: any) {
  const nodeTypes = useMemo(() => ({
    campaign: CampaignNode,
    adset: AdSetNode,
    ad: AdNode
  }), []);

  const [openedAd, setOpenedAd] = useState<any | null>(null);

  const buildGraph = () => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    nodes.push({
      id: 'root',
      type: 'default',
      position: { x: 0, y: 0 },
      data: { label: <div className="font-bold text-lg text-black px-4 py-2">{clientName}</div> },
      style: { backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e4e4e7', padding: 0 }
    });

    let currentY = -200;

    campaigns.forEach((camp: any) => {
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

      myAdSets.forEach((adset: any) => {
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

        const myAdsInfo = adsMetadata.filter((a: any) => a.adset_id === (adset.id || adset.adset_id));
        const myAdsMetrics = adsMetrics.filter((a: any) => a.adset_id === (adset.id || adset.adset_id));

        let localAdY = localAdsetY - (myAdsInfo.length * 80) / 2;

        myAdsInfo.forEach((ad: any) => {
          const adId = `ad-${ad.id}`;
          const metrics = myAdsMetrics.find((m: any) => m.ad_id === ad.id) || {};

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

  return (
    <div className="w-full h-full relative">
      {/* Loading overlay */}
      {isLoadingInsights && <InsightsLoadingOverlay />}

      {/* Floating header */}
      <div className="absolute top-6 left-6 z-10 pointer-events-auto flex items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 drop-shadow-sm">{clientName}</h1>
          <p className="text-sm font-medium text-zinc-500 drop-shadow-sm">Rendimiento en Tiempo Real</p>
        </div>
        <div className="bg-white/90 backdrop-blur border border-zinc-200 rounded-xl px-3 py-1.5 shadow-sm text-sm font-medium text-zinc-700 flex items-center gap-2">
          <DateSelector currentDatePreset={currentDatePreset} onDateChange={onDateChange} />
          {currentDatePreset.startsWith('{') && (
            <div className="flex items-center gap-2 border-l border-zinc-200 pl-2 ml-1">
              <input type="date" id="custom-start" className="bg-transparent border-b border-zinc-300 focus:outline-none text-xs" />
              <span className="text-zinc-400">-</span>
              <input type="date" id="custom-end" className="bg-transparent border-b border-zinc-300 focus:outline-none text-xs" />
              <button
                onClick={() => {
                  const start = (document.getElementById('custom-start') as HTMLInputElement).value;
                  const end = (document.getElementById('custom-end') as HTMLInputElement).value;
                  if (start && end) {
                    onDateChange(JSON.stringify({ since: start, until: end }));
                  }
                }}
                className="bg-black text-white px-2 py-1 rounded text-xs ml-1 hover:bg-zinc-800"
              >Ok</button>
            </div>
          )}
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

      {openedAd && (
        <AdModal openedAd={openedAd} onClose={() => setOpenedAd(null)} selectedMetrics={selectedMetrics} />
      )}
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────
export function AdsMindMap({
  publicId,
  clientName,
  selectedMetrics = ['spend', 'clicks', 'impressions', 'cpc'],
  campaigns: initialCampaigns,
  adSets: initialAdSets,
  adsMetrics: initialAdsMetrics,
  adsMetadata,
  currentDatePreset: initialDatePreset = 'maximum',
}: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // ── Estado de datos (solo insights cambian con la fecha) ─────────
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [adSets, setAdSets] = useState(initialAdSets);
  const [adsMetrics, setAdsMetrics] = useState(initialAdsMetrics);
  const [currentDatePreset, setCurrentDatePreset] = useState(initialDatePreset);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // ── Metadata estable (no depende de fecha) ───────────────────────
  // Se extrae una sola vez de los props iniciales del servidor
  const campaignsMeta = useMemo(() =>
    initialCampaigns.map((c: any) => ({
      id: c.campaign_id || c.id,
      campaign_id: c.campaign_id,
      campaign_name: c.campaign_name,
      name: c.campaign_name,
      objective: c.objective,
      status: c.status,
      start_time: c.start_time,
      stop_time: c.stop_time,
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  const adSetsMeta = useMemo(() =>
    initialAdSets.map((a: any) => ({
      id: a.id || a.adset_id,
      adset_id: a.adset_id || a.id,
      adset_name: a.adset_name || a.name,
      name: a.name || a.adset_name,
      campaign_id: a.campaign_id,
      status: a.status,
      daily_budget: a.daily_budget,
      lifetime_budget: a.lifetime_budget,
      optimization_goal: a.optimization_goal,
      targeting: a.targeting,
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  // ── Cambio de fecha: solo fetches de insights ────────────────────
  const handleDateChange = useCallback(async (newDatePreset: string) => {
    // Actualizar URL sin navegación (para que el link sea compartible)
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', newDatePreset);
    router.replace(`${pathname}?${params.toString()}`);
    setCurrentDatePreset(newDatePreset);

    // Solo 3 endpoints — sin recargar la página
    setIsLoadingInsights(true);
    try {
      const res = await fetch(
        `/api/canvas/${publicId}/insights?date=${encodeURIComponent(newDatePreset)}`
      );
      if (!res.ok) throw new Error('Error al cargar datos');
      const data = await res.json();

      // Merge insights con la metadata estable
      const newCampaigns = campaignsMeta.map((c: any) => {
        const ins = data.campaignInsights.find((i: any) => i.campaign_id === c.campaign_id);
        return {
          ...c,
          spend: ins?.spend || '0.00',
          impressions: ins?.impressions || '0',
          clicks: ins?.clicks || '0',
          cpc: ins?.cpc || '0.00',
          cpm: ins?.cpm || '0.00',
          reach: ins?.reach || '0',
          purchase_roas: ins?.purchase_roas,
          actions: ins?.actions,
          cost_per_action_type: ins?.cost_per_action_type,
        };
      });

      const newAdSets = adSetsMeta.map((a: any) => {
        const ins = data.adsetInsights.find((i: any) => i.adset_id === a.adset_id);
        return {
          ...a,
          spend: ins?.spend,
          clicks: ins?.clicks,
          impressions: ins?.impressions,
          cpc: ins?.cpc,
          cpm: ins?.cpm,
          reach: ins?.reach,
          purchase_roas: ins?.purchase_roas,
          actions: ins?.actions,
          cost_per_action_type: ins?.cost_per_action_type,
        };
      });

      setCampaigns(newCampaigns);
      setAdSets(newAdSets);
      setAdsMetrics(data.adInsights);
    } catch (err) {
      console.error('[AdsMindMap] Error fetching insights:', err);
    } finally {
      setIsLoadingInsights(false);
    }
  }, [publicId, campaignsMeta, adSetsMeta, pathname, searchParams, router]);

  const sharedProps = {
    clientName,
    campaigns,
    adSets,
    adsMetrics,
    adsMetadata,
    selectedMetrics,
    currentDatePreset,
    onDateChange: handleDateChange,
    isLoadingInsights,
  };

  if (isMobile) {
    return <MobileListView {...sharedProps} />;
  }

  return (
    <div className="w-full h-full relative">
      <DesktopCanvasView {...sharedProps} />
    </div>
  );
}
