import { getCanvasDataAction } from "@/actions/meta-actions";
import { AdsMindMap } from "@/components/canvas/ads-mind-map";
import { notFound } from "next/navigation";

export const revalidate = 60; // Cash por 60 segundos si queremos, o 0 para dinámico. Lo dejamos dinámico para ver métricas "real-time"

export default async function CanvasPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const id = resolvedParams.id;
  const datePreset = typeof resolvedSearchParams.date === 'string' ? resolvedSearchParams.date : 'maximum';
  
  const result = await getCanvasDataAction(id, datePreset);

  if (!result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-center">
          <h1 className="text-xl font-medium text-zinc-800 mb-2">Enlace Inválido</h1>
          <p className="text-zinc-500 max-w-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  // Si no hay campañas, por alguna razón de data
  if (!result.campaigns?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <p className="text-zinc-500">No hay campañas para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-[#fafafa]">
        <AdsMindMap 
          publicId={id}
          clientName={result.clientName}
          selectedMetrics={result.selectedMetrics || ['spend', 'clicks', 'impressions', 'cpc']}
          campaigns={result.campaigns}
          adSets={result.adSets}
          adsMetrics={result.adsMetrics}
          adsMetadata={result.adsMetadata}
          currentDatePreset={datePreset}
        />
    </div>
  );
}
