// app/[locale]/set-password/page.jsx (server component)

import { getTranslations } from "next-intl/server";
import Script from "next/script";
import ClientWrapper from "./ClientWrapper";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

// SEO
export async function generateMetadata(props) {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "auth.setPasswordPage.seo" });

  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

// Page render
export default async function Page(props) {
  const { locale } = await props.params;

  return (
    <>
      {/* 🔹 Script JSON-LD */}
      <Script
        id="ldjson-setpwd"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Définir mon mot de passe",
          }),
        }}
      />

      {/* 🔥 Et maintenant on charge proprement le client */}
      <ClientWrapper />
    </>
  );
}
