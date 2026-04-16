import { NextRequest, NextResponse } from "next/server";
import { getCachedInsights } from "@/lib/canvas-data";

/**
 * GET /api/canvas/[id]/insights?date=<datePreset>
 *
 * Devuelve solo métricas (3 endpoints) para un datePreset dado.
 * Usa la misma función cacheada que el SSR (getCanvasDataAction),
 * así que si el servidor ya calentó la caché en la carga inicial,
 * esta respuesta es prácticamente instantánea.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: publicId } = await params;
    const datePreset = req.nextUrl.searchParams.get("date") || "maximum";

    const data = await getCachedInsights(publicId, datePreset);

    if (!data) {
      return NextResponse.json(
        { error: "Canvas no encontrado o sin acceso" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[insights route] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
