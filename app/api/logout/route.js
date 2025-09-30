// app/api/logout/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Les attributs DOIVENT matcher ceux utilisés au login côté backend
function expiredCookieOpts() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    path: "/",
    secure: isProd ? true : false,
    sameSite: isProd ? "none" : "lax",
    maxAge: 0,
    expires: new Date(0),
    // Si tu utilises un domain au login (COOKIE_DOMAIN), dé-commente:
    // domain: process.env.COOKIE_DOMAIN,
  };
}

export async function POST() {
  try {
    const res = NextResponse.json({ 
      success: true,
      message: "Déconnexion réussie"
    });

    const gone = expiredCookieOpts();

    // token était httpOnly:true au login → efface en httpOnly:true
    res.cookies.set("token", "", { ...gone, httpOnly: true });
    
    // role / rememberMe côté UI → httpOnly:false
    res.cookies.set("role", "", { ...gone, httpOnly: false });
    res.cookies.set("rememberMe", "", { ...gone, httpOnly: false });

    // Autres cookies possibles à nettoyer
    res.cookies.set("userId", "", { ...gone, httpOnly: false });
    res.cookies.set("userRole", "", { ...gone, httpOnly: false });

    return res;
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la déconnexion" },
      { status: 500 }
    );
  }
}

// (optionnel) si /api/logout est appelé cross-origin
export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set(
    "Access-Control-Allow-Origin", 
    process.env.NEXT_PUBLIC_APP_ORIGIN ?? "*"
  );
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "content-type");
  return res;
}