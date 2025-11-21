"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Facebook, Linkedin, ArrowUp, ChevronRight, Mail } from "lucide-react";

export default function SiteFooter({ locale = "fr" }) {
  const t = useTranslations("auth.footer");

  const homeHref = `/${locale}`;
  const anchor = (id) => `${homeHref}#${id}`;

  const company = [
    { label: t("links.about"), href: anchor("apropos") },
    { label: t("links.products"), href: anchor("specialites") },
    { label: t("links.quote"), href: `/${locale}/devis` },
  ];

  const resources = [
    { label: t("links.helpdesk"), href: `/${locale}/help-desk` },
    { label: t("links.catalog"), href: anchor("specialites") },
    { label: t("links.contact"), href: anchor("contact") },
  ];

  const contacts = [
    {
      name: "Chorki Hbaeib",
      phone: "+216 74 850 999 / 74 863 888",
      tel: "tel:+21674850999",
    },
    {
      name: "Mohamed Hbaeib",
      phone: "+216 74 858 863 / 74 864 863",
      tel: "tel:+21674858863",
    },
  ];

  const emails = [
    {
      label:  t("column.servicecontact"),
      email: "contact@mtr-ressorts.tn",
      mailto: "mailto:contact@mtr-ressorts.tn",
    },
    {
      label: t("column.commercial"),
      email: "commercial@mtr-ressorts.tn",
      mailto: "mailto:commercial@mtr-ressorts.tn",
    },
  ];

  return (
    <footer className="relative mt-0 bg-[#0B2239] text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_10%,rgba(255,255,255,0.05),transparent),radial-gradient(50%_40%_at_80%_60%,rgba(245,179,1,0.08),transparent)]" />

      {/* Grille principale */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 md:grid-cols-5">
        {/* Col 1 : Brand */}
        <div>
          <h4 className="text-xl font-extrabold">MTR</h4>
          <p className="mt-3 max-w-xs text-sm text-white/80">{t("brandLine")}</p>

          <div className="mt-5 flex items-center gap-3">
            {/* Facebook */}
            <a
              href="https://www.facebook.com/profile.php?id=100076355199317&locale=fr_FR"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/10 p-2 hover:bg-white/20"
            >
              <Facebook className="h-4 w-4" />
            </a>

            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/in/manufacutre-tunisienne-des-ressorts-22b388276/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/10 p-2 hover:bg-white/20"
            >
              <Linkedin className="h-4 w-4" />
            </a>

            {/* WhatsApp corrigé */}
            <a
              href="https://wa.me/21698333883"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/10 p-2 hover:bg-white/20"
              aria-label="WhatsApp"
              title="+216 98 333 883"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4 text-[#25D366]"
              >
                <path d="M12.04 2C6.55 2 2 6.45 2 11.93c0 2.1.58 4.08 1.68 5.84L2 22l4.34-1.65a10.08 10.08 0 0 0 5.7 1.68c5.48 0 9.93-4.45 9.93-9.93S17.52 2 12.04 2zm4.88 14.3c-.2.56-1.19 1.09-1.67 1.14-.44.04-.98.07-1.59-.1-.36-.1-.82-.25-1.42-.51-2.5-1.07-4.11-3.66-4.2-3.8-.1-.14-.93-1.24-.93-2.35 0-1.1.6-1.65.84-1.88.22-.23.5-.27.67-.27.17 0 .34 0 .48.01.15.01.36-.06.56.43.2.5.66 1.74.7 1.86.06.12.07.27.01.4-.06.14-.1.23-.2.35-.1.12-.22.29-.3.4-.1.12-.2.27-.09.51.12.23.53.94 1.22 1.6.84.77 1.55 1.02 1.83 1.13.27.11.43.09.57-.06.14-.16.57-.65.76-.87.17-.2.35-.17.57-.1.22.06 1.39.65 1.62.76.23.11.36.17.41.26.06.08.06.57-.14 1.13z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Col 2 : Entreprise */}
        <div>
          <h5 className="text-lg font-semibold">{t("column.company")}</h5>
          <ul className="mt-4 space-y-3 text-sm text-white/80">
            {company.map((l, i) => (
              <li key={i}>
                <Link href={l.href} className="group inline-flex items-center gap-2 hover:text-[#F5B301]">
                  <ChevronRight className="h-4 w-4 opacity-60" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 : Ressources */}
        <div>
          <h5 className="text-lg font-semibold">{t("column.resources")}</h5>
          <ul className="mt-4 space-y-3 text-sm text-white/80">
            {resources.map((l, i) => (
              <li key={i}>
                <Link href={l.href} className="group inline-flex items-center gap-2 hover:text-[#F5B301]">
                  <ChevronRight className="h-4 w-4 opacity-60" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4 : Contacts */}
        <div>
          <h5 className="text-lg font-semibold">{t("column.contacts")}</h5>
          <ul className="mt-4 space-y-3 text-sm text-white/80">
            {contacts.map((c, i) => (
              <li key={i} className="flex flex-col">
                <span className="font-semibold">{c.name}</span>
                <a href={c.tel} className="hover:text-[#F5B301]" dir="ltr">
                  {c.phone}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 5 : Emails */}
        <div>
          <h5 className="text-lg font-semibold">Email</h5>
          <ul className="mt-4 space-y-3 text-sm text-white/80">
            {emails.map((e, i) => (
              <li key={i} className="flex flex-col">
                <span className="font-semibold">{e.label}</span>
                <a href={e.mailto} className="hover:text-[#F5B301] flex items-center gap-2">
                  <Mail className="h-4 w-4 opacity-70" />
                  {e.email}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Barre inférieure */}
      <div className="bg-[#F5B301]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-sm text-[#0B2239] md:flex-row">
          <p className="font-medium">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-4">
            <Link href={anchor("apropos")} className="hover:underline">{t("links.about")}</Link>
            <Link href={`/${locale}/help-desk`} className="hover:underline">{t("links.helpdesk")}</Link>
            <Link href={`/${locale}/privacy-policy`} className="hover:underline">{t("links.privacy")}</Link>
          </div>
        </div>
      </div>

      {/* Back to top */}
      <a
        href="#accueil"
        className="fixed bottom-6 right-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#F5B301] text-[#0B2239] shadow-xl border border-[#0B2239] hover:-translate-y-0.5"
      >
        <ArrowUp className="h-5 w-5" />
      </a>
    </footer>
  );
}
