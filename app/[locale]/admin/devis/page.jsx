// app/[locale]/admin/devis/AdminDevisSelector.jsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

// ---- Listes par type (garde tes imports existants) ----
import DevisCompressionList from "@/components/admin/devis/DevisCompressionList";
import DevisTractionList from "@/components/admin/devis/DevisTractionList";
import DevisTorsionList from "@/components/admin/devis/DevisTorsionList";
import DevisAutreList from "@/components/admin/devis/DevisAutreList";
import DevisFillList from "@/components/admin/devis/DevisFillList";
import DevisGrilleList from "@/components/admin/devis/DevisGrilleList";
import DemandeDevisList from "../../../../components/admin/devis/DemandeDevisList";
// Si tu as une liste globale, décommente cette ligne et utilise-la pour "all"
// import DevisAllList from "@/components/admin/devis/DevisAllList";

export default function AdminDevisSelector() {
  const t = useTranslations("auth.admin.devisAdmin");

  // ----- État UI -----
  const [type, setType] = useState("all"); // "all" = Tous les types
  const [query, setQuery] = useState("");

  // ----- Libellés (fallback si la clé i18n n'existe pas) -----
  const tl = (k) =>
    t.has(`types.${k}`)
      ? t(`types.${k}`)
      : {
          compression: "Compression",
          traction: "Traction",
          torsion: "Torsion",
          fill: "Fil dressé coupé",
          grille: "Grille métallique",
          autre: "Autre article",
          all: "Tous les types",
        }[k];

  // ----- Options du <select> -----
  const TYPE_OPTIONS = useMemo(
    () => [
      { key: "all", label: tl("all") },
      { key: "compression", label: tl("compression") },
      { key: "torsion", label: tl("torsion") },
      { key: "traction", label: tl("traction") },
      { key: "fill", label: tl("fill") },
      { key: "grille", label: tl("grille") },
      { key: "autre", label: tl("autre") },
    ],
    // tl() est stable ici; si tu relies aux traductions dynamiques, enlève ce mémo.
    []
  );

  // ----- Rendu de la liste selon "type" -----
  const renderPage = () => {
    const passedProps = { type, query };

    // Si tu as une page "tous les devis", remplace par: return <DevisAllList {...passedProps} />
    if (type === "all") return <DemandeDevisList {...passedProps} />;

    switch (type) {
      case "compression":
        return <DevisCompressionList {...passedProps} />;
      case "traction":
        return <DevisTractionList {...passedProps} />;
      case "torsion":
        return <DevisTorsionList {...passedProps} />;
      case "fill":
        return <DevisFillList {...passedProps} />;
      case "grille":
        return <DevisGrilleList {...passedProps} />;
      case "autre":
        return <DevisAutreList {...passedProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 sm:mb-8 text-3xl font-extrabold tracking-tight text-[#002147] text-center">
        {t.has("title") ? t("title") : "Liste des devis"}
      </h1>

      {/* Barre d’actions : Select + Recherche */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        {/* Select types */}
        <div className="relative w-full sm:w-[260px]">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-10 text-sm text-gray-900 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
            aria-label="Filtrer par type"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
            ▾
          </span>
        </div>

        {/* Champ de recherche */}
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher : devis, demande, client, type, date…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
            aria-label="Recherche"
          />
        </div>
      </div>

      {/* Contenu */}
      <div className="bg-white rounded-lg shadow p-6">{renderPage()}</div>
    </div>
  );
}
