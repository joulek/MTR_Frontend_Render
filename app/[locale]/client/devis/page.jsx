// app/[locale]/devis/page.jsx
import DevisClient from "./DevisClient";
import { getTranslations } from "next-intl/server";
import Script from "next/script";
import { headers } from "next/headers";

/* ------- Helpers sûrs ------- */
function stripEndSlashes(s) {
  let x = String(s ?? "");
  while (x.endsWith("/")) x = x.slice(0, -1);
  return x;
}

// 🔹 Correction: devient async
async function appBaseFromHeaders() {
  const h = await headers(); // ❗ attente obligatoire
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  return stripEndSlashes(`${proto}://${host}`);
}

// 🔹 getAppBase devient aussi async
async function getAppBase() {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return stripEndSlashes(String(env));
  return await appBaseFromHeaders();
}

/* ------- metadata ------- */
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.devis" });

  const APP_URL = await getAppBase(); // ❗ await ici

  const title = t("seo.title", {
    default:
      "Demander un devis – Ressorts compression, traction, torsion | MTR Manufacture Tunisienne des Ressorts",
  });
  const description = t("seo.description", {
    default:
      "Obtenez un devis rapide pour vos ressorts de compression, traction, torsion, fils dressés et grilles métalliques. Service sur mesure pour l’industrie.",
  });

  const url = `${APP_URL}/${locale}/devis`;
  const images = [
    {
      url: `${APP_URL}/og/devis.jpg`,
      width: 1200,
      height: 630,
      alt: t("seo.ogAlt", {
        default: "Demande de devis MTR Manufacture Tunisienne des Ressorts",
      }),
    },
  ];

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/devis`,
      languages: { fr: "/fr/devis", en: "/en/devis" },
    },
    keywords: [
      "devis ressort",
      "ressort compression",
      "ressort traction",
      "ressort torsion",
      "fil dressé",
      "grille métallique",
      "MTR Manufacture Tunisienne des Ressorts",
    ],
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "MTR Manufacture Tunisienne des Ressorts",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map(i => i.url),
    },
    robots: { index: true, follow: true },
  };
}

/* ------- page ------- */
export default async function Page({ params }) {
  const { locale } = await params;
  const isFr = locale === "fr";

  const APP_URL = await getAppBase(); // ❗ await aussi ici

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: isFr
      ? "Demander un devis – MTR Manufacture Tunisienne des Ressorts"
      : "Request a quote – MTR Manufacture Tunisienne des Ressorts",
    description: isFr
      ? "Obtenez un devis rapide pour vos ressorts de compression, traction, torsion, fils dressés et grilles métalliques."
      : "Get a quick quote for compression, extension, torsion springs, straightened wires and wire mesh.",
    primaryImageOfPage: `${APP_URL}/og/devis.jpg`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: isFr ? "Accueil" : "Home",
          item: `${APP_URL}/${locale}`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: isFr ? "Demander un devis" : "Request a quote",
          item: `${APP_URL}/${locale}/devis`,
        },
      ],
    },
  };

  return (
    <>
      <Script
        id="ldjson-devis"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DevisClient />
    </>
  );
}
