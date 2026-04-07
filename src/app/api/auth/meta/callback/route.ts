import { MetaApi } from "@/lib/meta";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  // Firebase App Hosting puede exponer 0.0.0.0:8080 como origin internamente.
  // Usamos NEXT_PUBLIC_APP_URL cuando está definido y no es localhost.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const origin = appUrl && !appUrl.includes('localhost') ? appUrl.replace(/\/$/, '') : url.origin;

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  
  if (error) {
    return NextResponse.redirect(`${origin}/admin?error=auth_rejected`);
  }
  
  if (!code) {
    return NextResponse.redirect(`${origin}/admin?error=no_code`);
  }

  try {
    const redirectUri = `${origin}/api/auth/meta/callback`;

    
    // 1. Canjear código por token corto
    const shortTokenRes = await MetaApi.exchangeCode(code, redirectUri);
    if (!shortTokenRes.access_token) {
       throw new Error("No access token received");
    }
    
    // 2. Extender a token de larga vida
    let finalToken = shortTokenRes.access_token;
    try {
        const longTokenRes = await MetaApi.getLongLivedToken(shortTokenRes.access_token);
        if (longTokenRes.access_token) finalToken = longTokenRes.access_token;
    } catch(e) {
        console.warn("No se pudo obtener long-lived token, usando short-lived");
    }
    
    // 3. Guardar en cookies HttpOnly
    const cookieStore = await cookies();
    cookieStore.set("meta_jwt", finalToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 60, // 60 días
      path: "/",
    });
    
    return NextResponse.redirect(`${url.origin}/admin`);
  } catch (err) {
    console.error("Meta Auth Error:", err);
    return NextResponse.redirect(`${url.origin}/admin?error=exchange_failed`);
  }
}
