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
      label: "Service Contact",
      email: "contact@mtr-ressorts.tn",
      mailto: "mailto:contact@mtr-ressorts.tn",
    },
    {
      label: "Service Commercial",
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
            <a
              href="https://www.facebook.com/profile.php?id=100076355199317&locale=fr_FR"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/10 p-2 hover:bg-white/20"
              aria-label="Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="https://www.linkedin.com/in/manufacutre-tunisienne-des-ressorts-22b388276/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/10 p-2 hover:bg-white/20"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href="https://wa.me/21698333883"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/10 p-2 hover:bg-white/20"
              aria-label="WhatsApp"
              title="+216 98 333 883"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-500" fill="currentColor">
                <path d="M20.52 3.48A11.9 11.9 0 0012 .07A..." />
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
            <Link href={anchor("apropos")} className="hover:underline">
              {t("links.about")}
            </Link>
            <Link href={`/${locale}/help-desk`} className="hover:underline">
              {t("links.helpdesk")}
            </Link>
            <Link href={`/${locale}/privacy-policy`} className="hover:underline">
              {t("links.privacy")}
            </Link>
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
