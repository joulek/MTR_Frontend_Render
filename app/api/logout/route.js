// app/api/logout/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const response = NextResponse.json(
      { success: true, message: 'Déconnexion réussie' },
      { status: 200 }
    );

    // Liste de tous les cookies possibles à supprimer
    const cookiesToDelete = [
      'token',
      'authToken',
      'role',
      'connect.sid',
      'session',
      'auth',
      'user'
    ];

    // Supprimer tous les cookies d'authentification
    cookiesToDelete.forEach(cookieName => {
      // Supprimer avec différentes configurations pour être sûr
      response.cookies.delete(cookieName);
      
      // Supprimer avec path /
      response.cookies.set(cookieName, '', {
        maxAge: 0,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      // Supprimer avec path /api
      response.cookies.set(cookieName, '', {
        maxAge: 0,
        path: '/api',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    });

    // Ajouter des headers pour empêcher le cache
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');

    return response;
  } catch (error) {
    console.error('Erreur logout API:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    );
  }
}

// Méthode GET pour éviter les erreurs si appelée par erreur
export async function GET() {
  return NextResponse.json(
    { error: 'Méthode non autorisée. Utilisez POST.' },
    { status: 405 }
  );
}