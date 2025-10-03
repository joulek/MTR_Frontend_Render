// middleware.js (JS)
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./next-intl.config";
import { NextResponse } from "next/server";

const handleI18n = createIntlMiddleware(routing);

export function middleware(req) {
  const res = handleI18n(req);
  const url = (res && res.nextUrl) ? res.nextUrl : req.nextUrl;
  const pathname = url.pathname || "/";

  const maybeLocale = pathname.split("/")[1];
  const locale = ["fr", "en"].includes(maybeLocale) ? maybeLocale : routing.defaultLocale;

  const role = req.cookies.get("role")?.value || null;
  const isAdminPath  = pathname.startsWith(`/${locale}/admin`);
  const isClientPath = pathname.startsWith(`/${locale}/client`);

  if (isAdminPath && role !== "admin") {
    return NextResponse.redirect(new URL(`/${locale}/login`, url));
  }
  if (isClientPath && role !== "client") {
    return NextResponse.redirect(new URL(`/${locale}/login`, url));
  }

  if (isAdminPath || isClientPath) {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    res.headers.set("Surrogate-Control", "no-store");
  }

  return res;
}

export const config = {
  matcher: ["/", "/(fr|en)/:path*", "/((?!fr|en|api|_next|.*\\..*).*)"]
};
