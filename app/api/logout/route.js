// app/api/logout/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function expiredCookieOpts() {
  const isProd = process.env.NODE_ENV === "production";

  // Doivent MATCHER ceux utilisés au login (authController.baseCookieOpts)
  const base = {
    path: "/",
    httpOnly: true,             // token était httpOnly:true
    secure: isProd ? true : false,
    sameSite: isProd ? "none" : "lax",
    // IMPORTANT: si tu utilises un DOMAIN au login (COOKIE_DOMAIN),
    // dé-commente la ligne suivante pour l'avoir identique ici:
    // domain: process.env.COOKIE_DOMAIN,
    maxAge: 0,
    expires: new Date(0),
  };
  return base;
}

export async function POST() {
  const res = NextResponse.json({ success: true });

  const gone = expiredCookieOpts();

  // Efface le token (httpOnly)
  res.cookies.set("token", "", { ...gone, httpOnly: true });

  // Efface le rôle (non httpOnly côté login)
  res.cookies.set("role", "", { ...gone, httpOnly: false });

  // Si tu avais posé rememberMe
  res.cookies.set("rememberMe", "", { ...gone, httpOnly: false });

  return res;
}

// CORS optionnel si tu appelles /api/logout cross-origin
export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", process.env.NEXT_PUBLIC_APP_ORIGIN ?? "*");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "content-type");
  return res;
}
