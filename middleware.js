import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './next-intl.config';
import { NextResponse } from 'next/server';


const handleI18n = createIntlMiddleware(routing);

export function middleware(req) {
  const url = req.nextUrl;
  const pathname = url.pathname || '/';
  // 1️⃣ Si la requête est sur '/' → redirection vers /fr
if (pathname === '/') {
  return NextResponse.redirect(new URL('/fr', req.url));
}


  // 1️⃣ Vérification si la locale est absente → on redirige vers /fr
  if (!pathname.startsWith('/fr') && !pathname.startsWith('/en')) {
    return NextResponse.redirect(new URL(`/fr${pathname}`, req.url));
  }

  // 2️⃣ Détection locale
  const locale = pathname.split('/')[1];

  // 3️⃣ Récupération des cookies utilisateur
  const token = req.cookies.get('token')?.value || null;
  const role = req.cookies.get('role')?.value || null;

  // 4️⃣ Routes protégées
  const isAdminPath = pathname.startsWith(`/${locale}/admin`);
  const isClientPath = pathname.startsWith(`/${locale}/client`);
  const isLoginPage = pathname.startsWith(`/${locale}/login`);
  const isUnauthorized = pathname.startsWith(`/${locale}/unauthorized`);

  // Fonction utilitaire (redirect + disable cache)
  const secureRedirect = (target) => {
    const res = NextResponse.redirect(new URL(target, req.url));
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  };

  /* ===================== 🔒 Authentification PRIORITAIRE ===================== */

  // ⚠️ Si utilisateur connecté mais mauvais rôle → direct /unauthorized (sans passer par /login)
  if (isAdminPath && role !== 'admin') {
    return secureRedirect(`/${locale}/unauthorized`);
  }

  if (isClientPath && role !== 'client') {
    return secureRedirect(`/${locale}/unauthorized`);
  }

  // 🚫 Si zone protégée et NON connecté → login
  if ((isAdminPath || isClientPath) && !token) {
    return secureRedirect(`/${locale}/login`);
  }

  // 🔁 Si utilisateur déjà connecté et tente /login → on le redirige vers son dashboard
  if (isLoginPage && token) {
    return secureRedirect(`/${locale}/${role}`);
  }

  /* ===================== 🌍 Internationalisation après sécurité ===================== */
  let res = handleI18n(req);

  // Désactiver le cache si zone sensible
  if (isAdminPath || isClientPath) {
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
  }

  return res;
}

/* ===================== ⚙ Configuration Next middleware ===================== */

 export const config = {
  matcher: [
    '/((?!api|_next|.*\\..*).*)' // 👉 Now middleware runs on ALL frontend routes (including "/")
  ]
};

