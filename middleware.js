// middleware.js
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './next-intl.config'; // <= pas d'extension .ts
import { NextResponse } from 'next/server';

const handleI18n = createIntlMiddleware(routing);

export function middleware(req) {
  // Laisse next-intl faire son travail (locales, rewrites/redirects)
  const res = handleI18n(req);
  const url = (res && res.nextUrl) ? res.nextUrl : req.nextUrl;
  const pathname = url.pathname || '/';

  // Détection locale à partir du chemin
  const maybeLocale = pathname.split('/')[1];
  const locale = ['fr', 'en'].includes(maybeLocale) ? maybeLocale : routing.defaultLocale;

  // Rôles via cookie (ex: 'admin', 'client')
  const role = req.cookies.get('role')?.value || null;

  const isAdminPath  = pathname.startsWith(`/${locale}/admin`);
  const isClientPath = pathname.startsWith(`/${locale}/client`);

  // Garde d'accès
  if (isAdminPath && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${locale}/unauthorized`, url));
  }
  if (isClientPath && role !== 'client') {
    return NextResponse.redirect(new URL(`/${locale}/login`, url));
  }

  // Anti-cache sur les zones sensibles pour empêcher la restauration via bfcache / cache HTTP
  if (isAdminPath || isClientPath) {
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
  }

  return res;
}

// Fait matcher les routes (inclut locales)
export const config = {
  matcher: ['/', '/(fr|en)/:path*', '/((?!fr|en|api|_next|.*\\..*).*)']
};
