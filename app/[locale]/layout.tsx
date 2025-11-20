// app/[locale]/layout.tsx

import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { ReactNode } from "react";

import CookieBanner from "@/components/CookieBanner";
import AnalyticsGate from "@/components/AnalyticsGate";

export function generateStaticParams() {
  return [{ locale: "fr" }, { locale: "en" }];
}

// 🟢 Ajout pour corriger le warning metadataBase +
export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
};

async function getMessages(locale: string) {
  try {
    return (await import(`../../messages/${locale}.json`)).default;
  } catch {
    notFound();
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages(locale);

  return (
    <>
      {/* 🚨 Supprimé la font Inter */}
      {/* <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head> */}

      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
        <CookieBanner />
        <AnalyticsGate />
      </NextIntlClientProvider>
    </>
  );
}
