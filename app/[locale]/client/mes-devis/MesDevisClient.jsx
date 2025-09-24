"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FiSearch, FiXCircle, FiFileText } from "react-icons/fi";
import Pagination from "@/components/Pagination";
import SiteFooter from "@/components/SiteFooter";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://mtr-backend-render.onrender.com";

/* ... tout ton code (helpers, hooks, composants) reste identique ... */

export default function MesDevisClient() {
  const t = useTranslations("auth.client.quotesPage");
  const locale = useLocale();

  /* ... tout ton état/logiciel reste identique ... */

  return (
    // 👉 wrapper pleine hauteur
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 👉 le contenu prend l'espace restant */}
      <main className="flex-1">
        {/* 👉 conteneur centré uniquement pour le contenu */}
        <div className="mx-auto w-full max-w-6xl px-3 sm:px-6 py-6 space-y-6 sm:space-y-8">
          {/* --- ton contenu existant inchangé --- */}
          <header className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E3A]">
              {t("title")}
            </h1>
            <p className="text-sm text-slate-500">{t("subtitle")}</p>
            {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
          </header>

          {/* recherche, cartes, tableau, pagination... (inchangés) */}
          {/* ... */}
        </div>
      </main>

      {/* 👉 footer en dehors du conteneur max-w-6xl pour être full-width */}
      <SiteFooter locale={locale} />
    </div>
  );
}
