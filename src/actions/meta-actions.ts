"use server";

import { adminDb } from "@/lib/firebase-admin";
import { MetaApi } from "@/lib/meta";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";

// Helper para extraer sesión
async function getAccessToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("meta_jwt")?.value;
  if (!token) throw new Error("No hay sesión activa con Meta");
  return token;
}

// Extraer cuentas sin pedir token al frontend
export async function fetchAccountsAction() {
  try {
    const token = await getAccessToken();
    const data = await MetaApi.getAdAccounts(token);
    return { success: true, data: data.data }; 
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Extraer campañas usando token local
export async function fetchCampaignsAction(adAccountId: string) {
  try {
    const token = await getAccessToken();
    const data = await MetaApi.getCampaigns(adAccountId, token, true);
    return { success: true, data: data.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Crear link público
export async function createPublicCanvasAction(
  adAccountId: string,
  campaignIds: string[],
  clientName: string,
  selectedMetrics: string[] = ['spend', 'clicks', 'impressions', 'cpc']
) {
  try {
    const accessToken = await getAccessToken();
    const publicId = randomUUID();
    
    await adminDb.collection("public_canvas_links").doc(publicId).set({
      adAccountId,
      campaignIds,
      accessToken,
      clientName,
      selectedMetrics,
      createdAt: new Date().toISOString(),
    });
    return { success: true, publicId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Obtener datos consolidados para el mapa mental (Se ejecuta sólo en servidor)
export async function getCanvasDataAction(publicId: string, datePreset: string = 'maximum') {
  try {
    const doc = await adminDb.collection("public_canvas_links").doc(publicId).get();
    if (!doc.exists) {
      return { success: false, error: "Este Canvas no existe o ha expirado." };
    }

    const { adAccountId, campaignIds, accessToken, clientName, selectedMetrics } = doc.data() as any;

    if (!adAccountId || !campaignIds || !accessToken) {
        return { success: false, error: "Datos de configuración incompletos." };
    }

    // 1. Obtener información general de las campañas (incluso si tienen 0 spend)
    const allCampsRaw = await MetaApi.getCampaigns(adAccountId, accessToken, false); // activeOnly = false
    const selectedCampaignsMeta = allCampsRaw.data?.filter((c: any) => campaignIds.includes(c.id)) || [];
    
    // Extraer métricas y mezclarlas
    const campaignsRaw = await MetaApi.getCampaignInsights(adAccountId, accessToken, datePreset);
    const selectedCampaignsInsights = selectedCampaignsMeta.map((camp: any) => {
        const insight = campaignsRaw.data?.find((ins: any) => ins.campaign_id === camp.id);
        return {
            ...camp,
            campaign_id: camp.id, // AdsMindMap espera esto
            campaign_name: camp.name,
            spend: insight?.spend || '0.00',
            impressions: insight?.impressions || '0',
            clicks: insight?.clicks || '0',
            cpc: insight?.cpc || '0.00',
            cpm: insight?.cpm || '0.00',
            reach: insight?.reach || '0',
            purchase_roas: insight?.purchase_roas,
            actions: insight?.actions,
            cost_per_action_type: insight?.cost_per_action_type
        };
    });

    const adSetsRaw = await MetaApi.getAdSets(adAccountId, accessToken, campaignIds);
    const adSetInsightsRaw = await MetaApi.getAdSetInsights(adAccountId, accessToken, datePreset, campaignIds);
    
    // Merge ad set insights with metadata
    const adSetsMerged = adSetsRaw.data?.map((adset: any) => {
        const insight = adSetInsightsRaw.data?.find((i: any) => i.adset_id === adset.id);
        return {
             ...adset,
             adset_id: adset.id,
             adset_name: adset.name,
             spend: insight?.spend,
             clicks: insight?.clicks,
             impressions: insight?.impressions,
             cpc: insight?.cpc,
             cpm: insight?.cpm,
             reach: insight?.reach,
             purchase_roas: insight?.purchase_roas,
             actions: insight?.actions,
             cost_per_action_type: insight?.cost_per_action_type
        };
    }) || [];

    const adsRaw = await MetaApi.getAdInsights(adAccountId, accessToken, datePreset, campaignIds);
    const adsInfoRaw = await MetaApi.getAds(adAccountId, accessToken, campaignIds);

    return {
      success: true,
      clientName,
      selectedMetrics,
      campaigns: selectedCampaignsInsights,
      adSets: adSetsMerged, // Mapeado correctamente con insights
      adsMetrics: adsRaw.data || [],
      adsMetadata: adsInfoRaw.data || []
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getAdPreviewAction(adId: string, adFormat: string = 'MOBILE_FEED_STANDARD') {
    try {
        const token = await getAccessToken();
        const previewRaw = await MetaApi.getAdPreview(adId, token, adFormat);
        if (previewRaw.data && previewRaw.data.length > 0) {
            return { success: true, html: previewRaw.data[0].body as string };
        }
        return { success: false, error: 'No preview available' };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
