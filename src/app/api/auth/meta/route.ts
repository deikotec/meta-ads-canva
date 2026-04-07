import { MetaApi } from "@/lib/meta";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/auth/meta/callback`;
  const state = "meta_auth";
  
  const authUrl = MetaApi.getAuthUrl(redirectUri, state);
  return NextResponse.redirect(authUrl);
}
