"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";

import CompressionForm from "@/components/forms/CompressionForm";
import TractionForm from "@/components/forms/TractionForm";
import TorsionForm from "@/components/forms/TorsionForm";
import FilDresseForm from "@/components/forms/FilDresseForm";
import GrilleMetalliqueForm from "@/components/forms/GrilleMetalliqueForm";
import AutreArticleForm from "@/components/forms/AutreArticleForm";

import compressionImg from "@/public/devis/compression_logo.png";
import tractionImg from "@/public/devis/ressort_traction_1.jpg";
import torsionImg from "@/public/devis/torsion_ressorts.png";
import fillImg from "@/public/devis/dresser.png";
import grillImg from "@/public/devis/grille.png";
import autreImg from "@/public/devis/autre.jpg";

import SiteFooter from "@/components/SiteFooter";

export default function DevisPage() {
  const [type, setType] = useState("compression");
  const t = useTranslations("auth.devis");
  const locale = useLocale();

  const TYPES = useMemo(
    () => [
      { key: "compression", label: t("types.compression") || "Compression", img: compressionImg },
      { key: "traction", label: t("types.traction") || "Traction", img: tractionImg },
      { key: "torsion", label: t("types.torsion") || "Torsion", img: torsionImg },
      { key: "fil", label: t("types.fil") || "Fil dressé", img: fillImg },
      { key: "grille", label: t("types.grille") || "Grille métallique", img: grillImg },
      { key: "autre", label: t("types.autre") || "Autre", img: autreImg },
    ],
    [t]
  );

  const renderForm = () => {
    switch (type) {
      case "compression": return <CompressionForm />;
      case "traction": return <TractionForm />;
      case "torsion": return <TorsionForm />;
      case "fil": return <FilDresseForm />;
      case "grille": return <GrilleMetalliqueForm />;
      case "autre": return <AutreArticleForm />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-[#002147] text-center">{t("title")}</h1>
          <p className="text-gray-600 mt-1 text-center">{t("subtitle")}</p>

          {/* Liste des types */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TYPES.map(({ key, label, img }, idx) => {
              const active = type === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={[
                    "rounded-xl border p-4 text-left transition group h-full",
                    active ? "border-[#ffb400] bg-[#fff7e6] shadow"
                           : "border-gray-200 bg-white hover:border-[#ffb400]/60 hover:shadow-md",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  <div className="flex items-center gap-3 h-full">
                    <div
                      className={`relative w-10 h-10 overflow-hidden rounded-lg ring-1 ${
                        active ? "ring-[#ffb400]" : "ring-gray-200"
                      }`}
                    >
                      <Image
                        src={img}
                        alt={label || key}
                        fill
                        sizes="80px"
                        className="object-cover"
                        priority={idx === 0}
                      />
                    </div>

                    <div className="flex items-center">
                      <div className="font-semibold text-[#002147]">{label || key}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Formulaire affiché */}
          <div className="mt-8 bg-white rounded-2xl shadow p-6">
            {renderForm()}
          </div>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter locale={locale} />
    </div>
  );
}
