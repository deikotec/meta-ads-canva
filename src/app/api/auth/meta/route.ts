import { MetaApi } from "@/lib/meta";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  // En Firebase App Hosting el origin puede ser 0.0.0.0:8080 internamente.
  // Usamos NEXT_PUBLIC_APP_URL si está definido para garantizar el dominio correcto.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const origin = appUrl && !appUrl.includes('localhost') ? appUrl.replace(/\/$/, '') : url.origin;
  const redirectUri = `${origin}/api/auth/meta/callback`;
  const state = "meta_auth";
  
  const authUrl = MetaApi.getAuthUrl(redirectUri, state);
  return NextResponse.redirect(authUrl);
}
