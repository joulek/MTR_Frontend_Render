// middleware.js
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { routing } from './next-intl.config.ts';

// i18n d'abord (next-intl)
const handleI18n = createIntlMiddleware(routing);

export function middleware(req) {
  // 1) laisser next-intl ajuster l’URL/locale
  const res = handleI18n(req);

  const url = res?.nextUrl ?? req.nextUrl;
  const pathname = url.pathname || '/';

  // 2) locale courante à partir du path
  const m = /^\/(fr|en)(?:\/|$)/.exec(pathname);
  const locale = (m && m[1]) || routing.defaultLocale;

  // 3) rôle depuis cookie (défini par ton backend)
  const role = req.cookies.get('role')?.value || null;

  const isAdminPath  = pathname.startsWith(`/${locale}/admin`);
  const isClientPath = pathname.startsWith(`/${locale}/client`);
  const isLoginPath  = pathname.startsWith(`/${locale}/login`);

  // 4) Protections / redirections
  if (isAdminPath && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${locale}/unauthorized`, url));
  }
  if (isClientPath && role !== 'client') {
    return NextResponse.redirect(new URL(`/${locale}/login`, url));
  }
  // optionnel: si déjà client, éviter /login
  if (isLoginPath && role === 'client') {
    return NextResponse.redirect(new URL(`/${locale}/client/mes-devis`, url));
  }

  // 5) Anti-cache (anti “back”) pour /client/* et /login
  if (isClientPath || isLoginPath) {
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
  }

  return res;
}

// matchers propres avec next-intl
export const config = {
  matcher: ['/', '/(fr|en)/:path*'],
};
