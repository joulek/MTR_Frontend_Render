"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Facebook, MoreVertical, User, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

/* ---------------------------- API backend ---------------------------- */
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com").replace(/\/$/, "");
const API = `${BACKEND}/api`;

/* --------------------------- Helpers --------------------------- */
function pickName(cat, locale) {
  return (
    (cat?.translations &&
      (cat.translations[locale] || cat.translations.fr || cat.translations.en)) ||
    cat?.label ||
    ""
  );
}
function slugifySafe(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
const makeCatHref = (cat, locale) =>
  `/${locale}/produits/${cat?.slug || slugifySafe(pickName(cat, locale))}`;

function pickProdName(p, locale) {
  const byLocale =
    locale === "en"
      ? p?.name_en || p?.label_en || p?.title_en
      : p?.name_fr || p?.label_fr || p?.title_fr;

  return (
    byLocale ||
    (p?.translations &&
      (p.translations[locale] || p.translations.fr || p.translations.en)) ||
    p?.name ||
    p?.label ||
    p?.title ||
    ""
  );
}
const makeProductHref = (prod, locale) => {
  const slug = prod?.slug || slugifySafe(pickProdName(prod, locale));
  const id = prod?._id || prod?.id || prod?.productId;
  return id ? `/${locale}/produits/${slug}/${id}` : `/${locale}/produits/${slug}`;
};

function swapLocaleInPath(path, nextLocale) {
  const [p, q] = (path || "/").split("?");
  let base = p || "/";
  if (/^\/(fr|en)(\/|$)/.test(base)) base = base.replace(/^\/(fr|en)(?=\/|$)/, `/${nextLocale}`);
  else if (base === "/") base = `/${nextLocale}`;
  else base = `/${nextLocale}${base}`;
  return q ? `${base}?${q}` : base;
}
const PATH_LOCALE_RE = /^\/(fr|en)(?:\/|$)/;

export default function SiteHeader({ mode = "public", onLogout }) {
  const t = useTranslations("auth.header");

  const router = useRouter();
  const pathname = usePathname() || "/";
  const homePaths = ["/", "/fr", "/en", "/fr/", "/en/"];

  /* ===== Langue ===== */
  const [locale, setLocale] = useState("fr");
  useEffect(() => {
    let desired = "fr";
    try {
      const saved = localStorage.getItem("mtr_locale");
      if (saved === "en" || saved === "fr") desired = saved;
    } catch {}
    const m = PATH_LOCALE_RE.exec(pathname);
    const pathLocale = m?.[1] || null;
    if (!localStorage.getItem("mtr_locale") && (pathLocale === "fr" || pathLocale === "en")) {
      desired = pathLocale;
    }
    setLocale(desired);
    if (typeof document !== "undefined") document.documentElement.lang = desired;
    const current = pathLocale;
    if (current !== desired) router.replace(swapLocaleInPath(pathname, desired), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isHome = homePaths.includes(pathname);
  const homeHref = `/${locale}`;

  /* ===== Session (who am I) ===== */
  const [me, setMe] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API}/users/me`, { credentials: "include", cache: "no-store" });
        if (!alive) return;
        if (r.ok) {
          const json = await r.json();
          setMe(json || null);
          if (json?.role) {
            try { localStorage.setItem("mtr_role", json.role); } catch {}
          }
        } else {
          setMe(null);
          try { localStorage.removeItem("mtr_role"); } catch {}
        }
      } catch {
        setMe(null);
        try { localStorage.removeItem("mtr_role"); } catch {}
      }
    })();
    return () => { alive = false; };
  }, []);

  const isLoggedClient = me?.role === "client";

  /* ===== Categories ===== */
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingCats(true);
        const res = await fetch(`${API}/categories`, { method: "GET", cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        setCategories(Array.isArray(data?.categories) ? data.categories : []);
      } catch {
        if (alive) setCategories([]);
      } finally {
        if (alive) setLoadingCats(false);
      }
    })();
    return () => { alive = false; if (!controller.signal.aborted) controller.abort(); };
  }, []);

  /* ===== Products (for mega menu) ===== */
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingProducts(true);
        const res = await fetch(`${API}/produits`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];
        if (alive) setProducts(list);
      } catch {
        if (alive) setProducts([]);
      } finally {
        if (alive) setLoadingProducts(false);
      }
    })();
    return () => { alive = false; if (!controller.signal.aborted) controller.abort(); };
  }, []);

  /* ===== Scroll to home sections ===== */
  const [open, setOpen] = useState(false);
  const goToSection = useCallback(async (id, closeMenu) => {
    const doScroll = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      if (location.hash) history.replaceState(null, "", location.pathname + location.search);
      if (closeMenu) setOpen(false);
    };
    if (!homePaths.includes(pathname)) {
      await router.push(homeHref, { scroll: true });
      setTimeout(doScroll, 60);
    } else doScroll();
  }, [pathname, router, homeHref]);

  /* ===== Switch language ===== */
  const switchLang = useCallback((next) => {
    if (next === locale) return;
    setLocale(next);
    try { localStorage.setItem("mtr_locale", next); } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = next;
    const nextPath = swapLocaleInPath(pathname, next);
    router.push(nextPath, { scroll: false });
  }, [pathname, router, locale]);

  async function handleLogout() {
    try {
      await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    try {
      localStorage.removeItem("mtr_role");
      localStorage.removeItem("userRole");
      localStorage.removeItem("rememberMe");
    } catch {}
    setMe(null);
    router.replace(`/${locale}`);
    router.refresh();
    try { window.dispatchEvent(new CustomEvent("mtr:auth", { detail: { state: "logout" } })); } catch {}
    if (typeof onLogout === "function") onLogout();
  }

  /* ======================= RENDER ======================= */
  return (
    <header className="font-inter sticky top-0 z-40">
      {/* top bar */}
      <div className="bg-[#0B2239] text-white">
        <div className="mx-auto flex h-10 max-w-screen-2xl items-center justify-between px-4 text-[13px] sm:text-[14px]">
          <nav className="flex items-center gap-4">
            <button type="button" onClick={() => goToSection("apropos")} className="opacity-90 transition hover:text-[#F5B301]" role="link">
              {t("topbar.about")}
            </button>
            <span className="opacity-40">|</span>
            <Link href={`/${locale}/help-desk`} className="opacity-90 transition hover:text-[#F5B301]">
              {t("topbar.helpdesk")}
            </Link>
            <span className="opacity-40">|</span>
            <button type="button" onClick={() => goToSection("contact")} className="opacity-90 transition hover:text-[#F5B301]" role="link">
              {t("topbar.contact")}
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <a href="https://www.facebook.com/profile.php?id=100076355199317&locale=fr_FR" target="_blank" rel="noreferrer" className="rounded-full bg-white/10 p-1.5 hover:bg-white/20" aria-label={t("aria.facebook")} title="Facebook">
              <Facebook className="h-4 w-4" />
            </a>
            <div className="flex items-center gap-2 ml-2">
              <button onClick={() => switchLang("fr")} className={`${locale === "fr" ? "ring-2 ring-[#F5B301] rounded-full" : ""} px-2 py-1 bg-transparent border-0 text-[14px] font-semibold`} title={t("aria.langFR")} aria-pressed={locale === "fr"}>FR</button>
              <button onClick={() => switchLang("en")} className={`${locale === "en" ? "ring-2 ring-[#F5B301] rounded-full" : ""} px-2 py-1 bg-transparent border-0 text-[14px] font-semibold`} title={t("aria.langEN")} aria-pressed={locale === "en"}>EN</button>
            </div>
          </div>
        </div>
      </div>

      {/* barre principale */}
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur shadow-md">
        <div className="mx-auto max-w-screen-2xl px-6">
          <div className="flex h-20 md:h-24 items-center justify-between">
            <Link href={homeHref} className="flex items-center gap-3" aria-label={t("logoAlt")}>
              <img src="/logo_MTR.png" alt={t("logoAlt")} width={130} height={130} className="object-contain" />
            </Link>

            {/* nav desktop */}
            <nav className="hidden items-center gap-3 md:flex">
              <Link href={homeHref} className="px-4 py-3 text-[16px] md:text-[18px] font-medium text-[#0B2239] hover:text-[#F5B301]">
                {t("nav.home")}
              </Link>

              {!isLoggedClient || isHome ? (
                <>
                  <button type="button" onClick={() => goToSection("presentation")} className="px-4 py-3 text-[16px] md:text-[18px] font-medium text-[#0B2239] hover:text-[#F5B301]" role="link">
                    {t("nav.company")}
                  </button>
                  {!loadingCats && <span className="px-4 py-3 text-[16px] md:text-[18px] font-medium"><ProductsMenu cats={categories} locale={locale} /></span>}
                  <button type="button" onClick={() => goToSection("contact")} className="px-4 py-3 text-[16px] md:text-[18px] font-medium text-[#0B2239] hover:text-[#F5B301]" role="link">
                    {t("nav.contact")}
                  </button>
                  <button type="button" onClick={() => goToSection("localisation")} className="px-4 py-3 text-[16px] md:text-[18px] font-medium text-[#0B2239] hover:text-[#F5B301]" role="link">
                    {t("nav.location")}
                  </button>
                </>
              ) : (
                !loadingCats && <ProductsMenu cats={categories} locale={locale} />
              )}

              {isLoggedClient && <ClientNavItemsDesktop />}
            </nav>

            {/* actions droite */}
            <div className="flex items-center gap-3">
              {isLoggedClient ? (
                <UserMenu />
              ) : (
                <>
                  <Link href={`/${locale}/login`} className="hidden md:inline-block rounded-full bg-[#F5B301] px-5 py-3 text-[16px] md:text-[18px] font-semibold text-[#0B2239] shadow hover:brightness-95">
                    {t("actions.login")}
                  </Link>
                  <Link href={`/${locale}/devis`} className="hidden md:inline-block rounded-full bg-[#F5B301] px-5 py-3 text-[16px] md:text-[18px] font-semibold text-[#0B2239] shadow hover:brightness-95">
                    {t("actions.askQuote")}
                  </Link>
                </>
              )}

              {/* menu mobile */}
              <button
                onClick={() => setOpen((s) => !s)}
                aria-label={t("actions.openMenu")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-[#0B2239] md:hidden"
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
