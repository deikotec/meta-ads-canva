/**
 * canvas-data.ts
 * Funciones cacheadas con unstable_cache de Next.js.
 * Compartidas entre getCanvasDataAction (SSR) y la API route de insights (cliente),
 * de modo que ambos paths sirven desde la misma entrada de caché.
 *
 * Estrategia de TTL:
 *  - Metadata (campañas, adsets, creativos)  → 1 h   (cambia raramente)
 *  - Insights "recientes" (hoy/ayer/semana)  → 5 min (datos vivos)
 *  - Insights "medios" (7d / 30d / mes)      → 15 min
 *  - Insights "históricos" (máximo / mes ant) → 1 h
 */

import { unstable_cache } from "next/cache";
import { adminDb } from "./firebase-admin";
import { MetaApi } from "./meta";

// ─── Tipos ────────────────────────────────────────────────────────

export interface CanvasMetadata {
  clientName: string;
  selectedMetrics: string[];
  campaignIds: string[];
  allCampsRaw: any[];
  adSetsRaw: any[];
  adsInfoRaw: any[];
}

export interface CanvasInsights {
  campaignInsights: any[];
  adsetInsights: any[];
  adInsights: any[];
}

// ─── Helpers internos (sin caché) ────────────────────────────────

async function _loadMetadata(publicId: string): Promise<CanvasMetadata | null> {
  const doc = await adminDb
    .collection("public_canvas_links")
    .doc(publicId)
    .get();

  if (!doc.exists) return null;

  const { adAccountId, campaignIds, accessToken, clientName, selectedMetrics } =
    doc.data() as any;

  if (!adAccountId || !campaignIds || !accessToken) return null;

  // 3 fetches de metadata en paralelo (no dependen de fecha)
  const [allCampsRaw, adSetsRaw, adsInfoRaw] = await Promise.all([
    MetaApi.getCampaigns(adAccountId, accessToken, false),
    MetaApi.getAdSets(adAccountId, accessToken, campaignIds),
    MetaApi.getAds(adAccountId, accessToken, campaignIds),
  ]);

  return {
    clientName,
    selectedMetrics: selectedMetrics || ["spend", "clicks", "impressions", "cpc"],
    campaignIds,
    allCampsRaw: allCampsRaw.data || [],
    adSetsRaw: adSetsRaw.data || [],
    adsInfoRaw: adsInfoRaw.data || [],
  };
}

async function _loadInsights(
  publicId: string,
  datePreset: string
): Promise<CanvasInsights | null> {
  const doc = await adminDb
    .collection("public_canvas_links")
    .doc(publicId)
    .get();

  if (!doc.exists) return null;

  const { adAccountId, campaignIds, accessToken } = doc.data() as any;
  if (!adAccountId || !campaignIds || !accessToken) return null;

  // Solo los 3 endpoints que cambian con la fecha
  const [campaignInsightsRaw, adsetInsightsRaw, adInsightsRaw] =
    await Promise.all([
      MetaApi.getCampaignInsights(adAccountId, accessToken, datePreset),
      MetaApi.getAdSetInsights(adAccountId, accessToken, datePreset, campaignIds),
      MetaApi.getAdInsights(adAccountId, accessToken, datePreset, campaignIds),
    ]);

  return {
    campaignInsights: campaignInsightsRaw.data || [],
    adsetInsights: adsetInsightsRaw.data || [],
    adInsights: adInsightsRaw.data || [],
  };
}

// ─── Metadata cacheada — 1 h TTL ─────────────────────────────────
// Campañas, adsets, creativos y targeting rara vez cambian
export const fetchCanvasMetadata = unstable_cache(
  _loadMetadata,
  ["canvas-metadata"],
  {
    revalidate: 60 * 60, // 1 hora
    tags: ["canvas-metadata"],
  }
);

// ─── Insights cacheados — TTL adaptativo por rango de fechas ─────

/** 5 minutos: today / yesterday / this_week_mon_today */
const _insightsRecent = unstable_cache(_loadInsights, ["canvas-insights-5m"], {
  revalidate: 5 * 60,
  tags: ["canvas-insights"],
});

/** 15 minutos: last_7d / last_30d / this_month */
const _insightsMedium = unstable_cache(_loadInsights, ["canvas-insights-15m"], {
  revalidate: 15 * 60,
  tags: ["canvas-insights"],
});

/** 1 hora: historical (maximum, last_month, last_week_mon_sun, custom) */
const _insightsHistorical = unstable_cache(
  _loadInsights,
  ["canvas-insights-1h"],
  {
    revalidate: 60 * 60,
    tags: ["canvas-insights"],
  }
);

// ─── Selector público ─────────────────────────────────────────────
const RECENT_PRESETS = ["today", "yesterday", "this_week_mon_today"];
const MEDIUM_PRESETS = ["last_7d", "last_30d", "this_month"];

/**
 * Devuelve los insights del canvas cacheados con el TTL apropiado
 * según cuánto suelen variar los datos en ese rango de fechas.
 * Tanto el SSR (getCanvasDataAction) como el API route del cliente
 * comparten la misma entrada de caché al llamar esta función.
 */
export function getCachedInsights(
  publicId: string,
  datePreset: string
): Promise<CanvasInsights | null> {
  if (RECENT_PRESETS.includes(datePreset)) {
    return _insightsRecent(publicId, datePreset);
  }
  if (MEDIUM_PRESETS.includes(datePreset)) {
    return _insightsMedium(publicId, datePreset);
  }
  // last_month, last_week_mon_sun, maximum, custom ranges
  return _insightsHistorical(publicId, datePreset);
}
