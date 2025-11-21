"use client";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-screen bg-gray-50 px-6">
      {/* Texte style "Oops!" */}
      <h1
        className="text-9xl font-extrabold tracking-wide"
        style={{
          background: "linear-gradient(45deg, #0B2239, #F5B301)",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        Oops!
      </h1>

      {/* Code d'erreur */}
      <h2 className="mt-4 text-2xl font-semibold text-[#0B2239]">
        403 – Accès refusé
      </h2>

      {/* Message explicatif */}
      <p className="mt-2 text-gray-600 max-w-md">
        Vous n'avez pas les autorisations nécessaires pour accéder à cette page.
      </p>

      {/* Bouton retour */}
      <Link
        href="/"
        className="mt-6 px-6 py-3 bg-[#F5B301] hover:bg-[#e0a001] text-[#0B2239] font-semibold rounded-full shadow-md transition-transform hover:-translate-y-0.5"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}

// 🚨 Force rendu serveur pour éviter flash
export const dynamic = "force-static";
