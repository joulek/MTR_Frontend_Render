// app/(client)/mes-devis/page.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FiSearch, FiXCircle, FiFileText } from "react-icons/fi";
import Pagination from "@/components/Pagination";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");

/* -------------------- helpers -------------------- */
function getCookie(name) {
  if (typeof document === "undefined") return "";
  const v = document.cookie.split("; ").find((c) => c.startsWith(name + "="));
  return v ? decodeURIComponent(v.split("=")[1]) : "";
}

const ORDERED_KEY = "mtr:client:ordered:devis";
function readOrdered() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ORDERED_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeOrdered(map) {
  try {
    localStorage.setItem(ORDERED_KEY, JSON.stringify(map || {}));
  } catch {}
}

/* === Bouton “Ouvrir” === */
function OpenChipDoc({ onClick, label = "Ouvrir", tooltip, className = "" }) {
  const title = tooltip || label;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={
        "inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A] " +
        className
      }
    >
      <FiFileText size={16} />
      <span>{label}</span>
    </button>
  );
}

/* --- helpers clés/états robustes --- */
const getRowId = (it) => it?.devisId || it?.devisNumero || it?.devisPdf || "";
const getRowKey = (it, i) =>
  String(it?.devisId || it?.devisNumero || it?.devisPdf || `idx-${i}`);

// ✅ construit l'URL PDF côté front pour éviter les soucis d'URL serveur
const buildPdfUrl = (numero) => `${BACKEND}/files/devis/${numero}.pdf`;

export default function MesDevisClient() {
  const t = useTranslations("auth.client.quotesPage");
  const locale = useLocale();

  // items: { devisId, devisNumero, devisPdf, demandeNumeros[], types[], totalTTC, date }
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // marquage local des devis déjà commandés
  const [ordered, setOrdered] = useState({}); // { [rowId]: true }
  const [placing, setPlacing] = useState({}); // { [rowId]: true }

  useEffect(() => {
    setOrdered(readOrdered());
  }, []);

  /* --------- fetch /api/devis/client/devis --------- */
  const fetchDevis = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        q,
        page: String(page),
        limit: String(pageSize),
      });

      const res = await fetch(`${BACKEND}/api/devis/client/devis?` + params.toString(), {
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Fetch error");

      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total || 0));
    } catch (e) {
      setError(e.message || t("errors.network"));
    } finally {
      setLoading(false);
    }
  }, [q, page, pageSize, t]);

  useEffect(() => { fetchDevis(); }, [fetchDevis]);

  // reset page si la recherche change
  useEffect(() => { setPage(1); }, [q]);

  /* --------- helpers UI --------- */
  const prettyDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(locale, {
        year: "numeric",
        month: "long",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso || "-";
    }
  };

  // ✅ ouverture directe d'un PDF public (avec fallback blob)
  const openUrlInNewTab = async (url) => {
    try {
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w) throw new Error("popup_blocked");
    } catch {
      try {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error("not_ok");
        const blob = await res.blob();
        const obj = URL.createObjectURL(blob);
        window.open(obj, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(obj), 60000);
      } catch {
        setError(t("errors.cannotOpen") || "Impossible d’ouvrir le fichier");
      }
    }
  };

  const openDevisPdf = (it) => {
    const url = it?.devisNumero ? buildPdfUrl(it.devisNumero) : (it?.devisPdf || "");
    if (url) openUrlInNewTab(url);
    else setError(t("errors.cannotOpen") || "Impossible d’ouvrir le fichier");
  };

  /* --------- ENVOI COMMANDE (avec devisId) --------- */
  const placeOrder = async (it) => {
    const devisId = it.devisId;
    const devisNumero = it.devisNumero;
    const devisPdf = buildPdfUrl(it.devisNumero);
    const rowId = getRowId(it);

    if (!devisId || !devisNumero) {
      setError(t("errors.missingQuote") || "Devis manquant ou incomplet");
      return;
    }

    try {
      setPlacing((s) => ({ ...s, [rowId]: true }));

      const token =
        getCookie("token") ||
        (typeof localStorage !== "undefined" &&
          (localStorage.getItem("token") || localStorage.getItem("authToken"))) ||
        "";

      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${BACKEND}/api/order/client/commander`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          devisId,
          devisNumero,
          devisPdf,
          demandeNumeros: Array.isArray(it.demandeNumeros) ? it.demandeNumeros : [],
        }),
      });

      if (res.status === 401) { setError(t("errors.notAuthenticated") || "Non authentifié"); return; }
      if (res.status === 403) { setError(t("errors.forbidden") || "Accès interdit"); return; }

      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.success) throw new Error(j?.message || t("errors.cannotPlace") || "Impossible de passer la commande");

      setOrdered((prev) => {
        const next = { ...prev, [rowId]: true };
        writeOrdered(next);
        return next;
      });
      setError("");
    } catch (e) {
      setError(e.message || t("errors.cannotPlace") || "Erreur commande");
    } finally {
      setPlacing((s) => ({ ...s, [rowId]: false }));
    }
  };

  /* --------- rendu mobile (cartes) --------- */
  const Card = ({ it }) => {
    const rowId = getRowId(it);
    const dejaCommande = !!ordered[rowId];
    return (
      <div className="rounded-2xl border border-[#F7C60022] bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,.06)] space-y-3">
        <div className="text-xs text-slate-500">{t("table.number")}</div>
        <div className="font-semibold text-[#0B1E3A] inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
          <span>{it.devisNumero}</span>
        </div>

        <div className="text-xs text-slate-500">{t("labels.ddv")}</div>
        <div className="flex flex-wrap gap-2">
          {Array.isArray(it.demandeNumeros) && it.demandeNumeros.length ? (
            it.demandeNumeros.map((n) => (
              <span
                key={n}
                className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs text-[#0B1E3A]"
              >
                {n}
              </span>
            ))
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>

        <div className="text-xs text-slate-500">{t("table.type")}</div>
        <div className="flex flex-wrap gap-2">
          {Array.isArray(it.types) && it.types.length ? (
            it.types.map((tp, i) => (
              <span
                key={`${tp}-${i}`}
                className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs text-[#0B1E3A]"
              >
                {tp}
              </span>
            ))
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-500">{t("table.total")}</div>
            <div className="text-[#0B1E3A] font-medium">
              {Intl.NumberFormat(locale, { style: "currency", currency: "TND" }).format(
                Number(it.totalTTC || 0)
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">{t("table.createdAt")}</div>
            <div>{prettyDate(it.date)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <OpenChipDoc onClick={() => openDevisPdf(it)} tooltip={t("aria.openPdf")} />
          {dejaCommande ? (
            <span className="inline-block rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs">
              {t("status.ordered")}
            </span>
          ) : (
            <button
              onClick={() => placeOrder(it)}
              disabled={placing[rowId]}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {placing[rowId] ? t("actions.sending") : t("actions.order")}
            </button>
          )}
        </div>
      </div>
    );
  };

  /* --------- rendu --------- */
  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-6 py-6 space-y-6 sm:space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E3A]">
          {t("title")}
        </h1>
        <p className="text-sm text-slate-500">{t("subtitle")}</p>
        {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
      </header>

      {/* recherche */}
      <div className="w-full mt-1">
        <div className="relative mx-auto w-full max-w-2xl">
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
            aria-hidden="true"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-gray-300 bg-white px-9 pr-9 py-2 text-sm text-[#0B1E3A] shadow focus:border-[#F5B301] focus:ring-2 focus:ring-[#F5B301]/30 outline-none transition"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label={t("clear")}
              title={t("clear")}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <FiXCircle size={16} />
            </button>
          )}
        </div>
      </div>

      {/* mobile */}
      <div className="grid md:hidden gap-3 sm:gap-4">
        {loading ? (
          <p className="text-slate-500">{t("loading")}</p>
        ) : error ? (
          <p className="text-rose-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500">{t("noData")}</p>
        ) : (
          items.map((it, i) => <Card key={getRowKey(it, i)} it={it} />)
        )}
      </div>

      {/* desktop */}
      <div className="hidden md:block rounded-2xl border border-[#F7C60022] bg-white shadow-[0_6px_22px_rgba(0,0,0,.06)]">
        {loading ? (
          <p className="px-6 py-6 text-slate-500">{t("loading")}</p>
        ) : error ? (
          <p className="px-6 py-6 text-rose-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="px-6 py-6 text-slate-500">{t("noData")}</p>
        ) : (
          <>
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-white">
                  <th className="p-3 text-left">
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                      {t("table.number")}
                    </div>
                  </th>
                  <th className="p-3 text-left">
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                      {t("labels.ddv")}
                    </div>
                  </th>
                  <th className="p-3 text-left">
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                      {t("table.type")}
                    </div>
                  </th>
                  <th className="p-3 text-right">
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                      {t("table.total")}
                    </div>
                  </th>
                  <th className="p-3 text-left">
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                      {t("table.createdAt")}
                    </div>
                  </th>
                  <th className="p-3 text-left">
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                      {t("labels.devis")}
                    </div>
                  </th>
                  <th className="p-3 text-right whitespace-nowrap">
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                      {t("table.order")}
                    </div>
                  </th>
                </tr>
                <tr>
                  <td colSpan={7}>
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                  </td>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it, i) => {
                  const rowId = getRowId(it);
                  const dejaCommande = !!ordered[rowId];
                  return (
                    <tr key={getRowKey(it, i)} className="bg-white hover:bg-[#0B1E3A]/[0.03] transition-colors">
                      <td className="p-3 align-top">
                        <span className="inline-flex items-center gap-2 text-[#0B1E3A] font-medium">
                          <span className="h-2 w-2 rounded-full bg-[#F7C600] shrink-0" />
                          <span>{it.devisNumero}</span>
                        </span>
                      </td>

                      <td className="p-3 align-top">
                        <div className="flex flex-wrap gap-2 max-w-[360px]">
                          {Array.isArray(it.demandeNumeros) && it.demandeNumeros.length ? (
                            it.demandeNumeros.map((n) => (
                              <span
                                key={n}
                                className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs text-[#0B1E3A]"
                              >
                                {n}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(it.types) && it.types.length ? (
                            it.types.map((tp, j) => (
                              <span
                                key={`${tp}-${j}`}
                                className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs text-[#0B1E3A]"
                              >
                                {tp}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 align-top text-right text-[#0B1E3A] font-medium whitespace-nowrap">
                        {Intl.NumberFormat(locale, { style: "currency", currency: "TND" }).format(
                          Number(it.totalTTC || 0)
                        )}
                      </td>

                      <td className="p-3 align-top text-[#0B1E3A] whitespace-nowrap">
                        {prettyDate(it.date)}
                      </td>

                      <td className="p-3 align-top">
                        <OpenChipDoc onClick={() => openDevisPdf(it)} tooltip={t("aria.openPdf")} />
                      </td>

                      <td className="p-3 align-top text-right whitespace-nowrap">
                        {dejaCommande ? (
                          <span className="inline-block rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-sm">
                            {t("status.ordered")}
                          </span>
                        ) : (
                          <button
                            onClick={() => placeOrder(it)}
                            disabled={placing[rowId]}
                            className="inline-flex items-center rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {placing[rowId] ? t("actions.sending") : t("actions.order")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="px-4 pb-5">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
