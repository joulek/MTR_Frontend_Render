// app/api/logout/route.js
import { NextResponse } from "next/server";

export async function POST() {
  const resp = NextResponse.json({ success: true, message: "Déconnexion réussie" });

  const expired = {
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    // utile si les cookies ont été posés en SameSite=None; Secure
    sameSite: "none",
    secure: true,
  };

  resp.cookies.set("token", "", { ...expired, httpOnly: true });
  resp.cookies.set("role",  "", expired);

  return resp;
}
