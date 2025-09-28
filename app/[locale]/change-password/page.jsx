import ChangePasswordClient from "./ChangePasswordClient";
import { getTranslations } from "next-intl/server";
import Script from "next/script";
import { headers } from "next/headers";

/* ------ helpers صغار داخل نفس الصفحة (ما نستعملوش .replace) ------ */
function stripEndSlashes(s) {
  let x = String(s ?? "");
  while (x.endsWith("/")) x = x.slice(0, -1);
  return x;
}

// كي ما تكونش NEXT_PUBLIC_APP_URL مفعّلة في الbuild، نركّبو الorigin من الheaders
function appBaseFromHeaders() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  return stripEndSlashes(`${proto}://${host}`);
}

// ترجع base URL آمنة: تعطي الأولوية للـ ENV وإلا ترجع من الheaders
function getAppBase() {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return stripEndSlashes(String(env));
  return appBaseFromHeaders();
}

/* -------------------- Metadata -------------------- */
export async function generateMetadata(props) {
  // Next 15: params Promise
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "auth.changePasswordPage.seo" });

  // ✅ نحسبو APP_URL داخل الفنكسيون (موش في top-level)
  const APP_URL = getAppBase();

  const title =
    t("title", { default: "Changer mon mot de passe | MTR Manufacture Tunisienne des Ressorts" });
  const description =
    t("description", { default: "Mettez à jour votre mot de passe depuis votre espace client." });
  const url = `${APP_URL}/${locale}/change-password`;
  const images = [
    {
      url: `${APP_URL}/og/change-password.jpg`,
      width: 1200,
      height: 630,
      alt: t("ogAlt", {
        default: "Changer le mot de passe – MTR Manufacture Tunisienne des Ressorts",
      }),
    },
  ];

  return {
    title,
    description,
    alternates: { canonical: `/${locale}/change-password` },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "MTR Manufacture Tunisienne des Ressorts",
      images,
      locale,
    },
    twitter: { card: "summary_large_image", title, description, images: images.map((i) => i.url) },
    robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
  };
}

/* -------------------- Page -------------------- */
export default async function Page(props) {
  // Next 15: params Promise
  const { locale } = await props.params;

  // ✅ نفس الحساب هنا داخل الفنكسيون
  const APP_URL = getAppBase();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Changer mon mot de passe",
    description: "Mettez à jour votre mot de passe depuis votre espace client.",
    primaryImageOfPage: `${APP_URL}/og/change-password.jpg`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: locale === "fr" ? "Accueil" : "Home", item: `${APP_URL}/${locale}` },
        { "@type": "ListItem", position: 2, name: locale === "fr" ? "Changer le mot de passe" : "Change password", item: `${APP_URL}/${locale}/change-password` },
      ],
    },
  };

  return (
    <>
      <Script
        id="ldjson-change-password"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ChangePasswordClient />
    </>
  );
}
