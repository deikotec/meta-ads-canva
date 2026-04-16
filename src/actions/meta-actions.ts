"use server";

import { adminDb } from "@/lib/firebase-admin";
import { MetaApi } from "@/lib/meta";
import { fetchCanvasMetadata, getCachedInsights } from "@/lib/canvas-data";
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
    // Firestore solo se lee una vez; la metadata se cachea 1h y los insights según TTL adaptativo.
    // Si SSR ya calentó la caché, el API route del cliente también se beneficia (mismo key).
    const [metadata, insights] = await Promise.all([
      fetchCanvasMetadata(publicId),
      getCachedInsights(publicId, datePreset),
    ]);

    if (!metadata) {
      return { success: false, error: "Este Canvas no existe o ha expirado." };
    }
    if (!insights) {
      return { success: false, error: "Datos de configuración incompletos." };
    }

    const { clientName, selectedMetrics, campaignIds, allCampsRaw, adSetsRaw, adsInfoRaw } = metadata;
    const { campaignInsights, adsetInsights, adInsights } = insights;

    // Merge campañas: filtrar las seleccionadas y combinar con sus insights
    const selectedCampaignsMeta = allCampsRaw.filter((c: any) => campaignIds.includes(c.id));
    const campaigns = selectedCampaignsMeta.map((camp: any) => {
      const ins = campaignInsights.find((i: any) => i.campaign_id === camp.id);
      return {
        ...camp,
        campaign_id: camp.id,
        campaign_name: camp.name,
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

    // Merge adsets: combinar metadata con insights
    const adSets = adSetsRaw.map((adset: any) => {
      const ins = adsetInsights.find((i: any) => i.adset_id === adset.id);
      return {
        ...adset,
        adset_id: adset.id,
        adset_name: adset.name,
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

    return {
      success: true,
      clientName,
      selectedMetrics,
      campaigns,
      adSets,
      adsMetrics: adInsights,
      adsMetadata: adsInfoRaw,
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
