import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './next-intl.config.ts';
import { NextResponse } from 'next/server';

const handleI18n = createIntlMiddleware(routing);

// Liste des paths qui nécessitent une authentification
const PROTECTED_PATHS = {
  admin: '/admin',
  client: '/client'
};

export async function middleware(req) {
  const res = handleI18n(req);
  const url = res?.nextUrl ?? req.nextUrl;
  const pathname = url.pathname || '/';

  const maybeLocale = pathname.split('/')[1];
  const locale = ['fr', 'en'].includes(maybeLocale) ? maybeLocale : routing.defaultLocale;

  // Récupérer les cookies d'authentification
  const token = req.cookies.get('token')?.value || 
                req.cookies.get('authToken')?.value || 
                req.cookies.get('connect.sid')?.value;
  const role = req.cookies.get('role')?.value || null;

  const isAdminPath = pathname.startsWith(`/${locale}/admin`);
  const isClientPath = pathname.startsWith(`/${locale}/client`);
  const isLoginPage = pathname.startsWith(`/${locale}/login`);

  // Si pas de token et sur une page protégée -> rediriger vers login
  if ((isAdminPath || isClientPath) && !token) {
    const response = NextResponse.redirect(new URL(`/${locale}/login`, url));
    
    // Nettoyer tous les cookies d'auth pour être sûr
    response.cookies.delete('token');
    response.cookies.delete('authToken');
    response.cookies.delete('role');
    response.cookies.delete('connect.sid');
    
    return response;
  }

  // Si token existe, vérifier le rôle
  if (token) {
    // Vérification admin
    if (isAdminPath && role !== 'admin') {
      const response = NextResponse.redirect(new URL(`/${locale}/unauthorized`, url));
      return response;
    }

    // Vérification client
    if (isClientPath && role !== 'client') {
      const response = NextResponse.redirect(new URL(`/${locale}/login`, url));
      
      // Nettoyer les cookies si le rôle ne correspond pas
      response.cookies.delete('token');
      response.cookies.delete('authToken');
      response.cookies.delete('role');
      response.cookies.delete('connect.sid');
      
      return response;
    }
  }

  // Si connecté et essaie d'accéder à la page login -> rediriger vers dashboard
  if (token && isLoginPage) {
    if (role === 'admin') {
      return NextResponse.redirect(new URL(`/${locale}/admin/dashboard`, url));
    }
    if (role === 'client') {
      return NextResponse.redirect(new URL(`/${locale}/client/mes-devis`, url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/', '/(fr|en)/:path*', '/((?!fr|en|api|_next|.*\\..*).*)']
};