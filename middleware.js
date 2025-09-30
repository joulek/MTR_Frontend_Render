// middleware.ts / middleware.js
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './next-intl.config.ts';
import { NextResponse } from 'next/server';

const handleI18n = createIntlMiddleware(routing);

export function middleware(req) {
  // i18n d'abord
  const res = handleI18n(req);
  const url = res?.nextUrl ?? req.nextUrl;
  const pathname = url.pathname || '/';

  // locale détectée à partir de l'URL
  const maybeLocale = pathname.split('/')[1];
  const locale = ['fr', 'en'].includes(maybeLocale) ? maybeLocale : routing.defaultLocale;

  // cookies
  const token = req.cookies.get('token')?.value || null;
  const role  = req.cookies.get('role')?.value || null;

  // --- Zones protégées côté client (AJOUTE ici toutes tes pages "client" même hors /client/...) ---
  const CLIENT_GUARDS = [
    `/${locale}/client`,        // tout le sous-espace /client/*
    `/${locale}/reclamation`,   // page Réclamation
    `/${locale}/mes-devis`,     // exemple : liste des devis du client
    `/${locale}/mes-commandes`, // exemple : commandes
    // ajoute d'autres chemins privés si besoin...
  ];

  const isUnder = (base) => pathname === base || pathname.startsWith(base + '/');
  const isClientProtected = CLIENT_GUARDS.some((p) => isUnder(p));

  // --- Règles d'accès ---
  // Admin : uniquement role=admin (si tu as un espace /admin)
  const isAdminPath = pathname.startsWith(`/${locale}/admin`);
  if (isAdminPath && role !== 'admin') {
    const to = new URL(`/${locale}/unauthorized`, url);
    to.search = '';
    return NextResponse.redirect(to);
  }

  // Client : doit être connecté (token) ET rôle 'client'
  if (isClientProtected && (!token || role !== 'client')) {
    const to = new URL(`/${locale}/login`, url);
    to.search = '';
    return NextResponse.redirect(to);
  }

  // Optionnel : si déjà connecté, éviter d'aller sur /login ou /signup
  const isAuthPage = pathname === `/${locale}/login` || pathname === `/${locale}/signup`;
  if (token && role === 'client' && isAuthPage) {
    const to = new URL(`/${locale}/client`, url); // ou page d'accueil client
    to.search = '';
    return NextResponse.redirect(to);
  }

  return res;
}

export const config = {
  // couvre tout (sauf assets/api)
  matcher: ['/', '/(fr|en)/:path*', '/((?!fr|en|api|_next|.*\\..*).*)'],
};
