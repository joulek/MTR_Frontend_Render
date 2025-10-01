// components/admin/demandes/DemandeDevisList.jsx
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { FiSearch, FiXCircle, FiFileText } from "react-icons/fi";
import { useTranslations } from "next-intl";
import Pagination from "@/components/Pagination";
import MultiDevisModal from "@/components/admin/devis/MultiDevisModal.jsx";

/* ---------------------------- API backend ---------------------------- */
const BACKEND = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://mtr-backend-render.onrender.com"
).replace(/\/$/, "");
const API = `${BACKEND}/api`;

/* ---------------------------- Utils ---------------------------- */
const WRAP = "mx-auto w/full max-w-7xl px-4 sm:px-6 lg:px-8".replace("/","/");
const dash = "—";

// Normalise pour recherche : lower + suppression d'accents + trim
function norm(x) {
  return String(x ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function formatDate(d) {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return dash;
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return dash;
  }
}

function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// 🔗 liens PDFs — maintenant fournis tout prêts par l'API flat
const ddvHref = (r) => r?.ddvPdf || null;                 // /api/devis/:type/:id/pdf (ou null)
const devisHref = (r) => r?.devisPdf || null;              // /files/devis/DVxxxx.pdf

export default function DemandeDevisList({ type = "all", query = "" }) {
  const t = useTranslations("auth.admin.demandsListPage");
  const tTypes = useTranslations("auth.admin.devisAdmin.types");

  const [q, setQ] = useState(query);
  const qDebounced = useDebounced(q, 400);

  // pagination (contrôle UI)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // données
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  // sélection multiple + modal
  const [selectedIds, setSelectedIds] = useState([]);
  const [multiOpen, setMultiOpen] = useState(false);
  const [multiDemands, setMultiDemands] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  const typeLabel = useCallback(
    (v) => {
      const map = {
        compression: tTypes("compression"),
        traction: tTypes("traction"),
        torsion: tTypes("torsion"),
        fil: tTypes("fill"),
        grille: tTypes("grille"),
        autre: tTypes("autre"),
      };
      return map[v] ?? (v || dash);
    },
    [tTypes]
  );

  // Construit une "ligne indexable" pour la recherche locale (flat)
  const makeSearchHaystack = useCallback(
    (r) => {
      const demande = r.demandeNumero || r._id || "";
      const typeTxt = typeLabel(r.type);
      const client = String(r.client || "");
      const dateTxt = formatDate(r.date);
      const rawDate = r?.date ? new Date(r.date).toISOString() : "";
      const rawType = r?.type || "";
      return norm([demande, typeTxt, rawType, client, dateTxt, rawDate].filter(Boolean).join(" | "));
    },
    [typeLabel]
  );

  const load = useCallback(
    async (silent = false) => {
      try {
        setError("");
        if (silent) setSyncing(true);
        else setLoading(true);

        const params = new URLSearchParams({
          type: type || "all",
          q: qDebounced || "",
          page: String(page),
          limit: String(pageSize),
        });

        // ⬇️ نستعمل الendpoint المسطّح
        const res = await fetch(`${API}/devis/devis/list?` + params.toString(), {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) throw new Error(data?.message || `HTTP ${res.status}`);

        const items = Array.isArray(data.items) ? data.items : [];
        // بحث محلي سريع (نفس الريكويست يرجّع subset حسب q/filters من الباك، ونعمل تأكيد هنا)
        const needle = norm(qDebounced);
        const filtered = needle
          ? items.filter((r) => makeSearchHaystack(r).includes(needle))
          : items;

        setRows(filtered);
        setTotal(Number(data.total) || filtered.length);
      } catch (err) {
        setError(err?.message || "Error");
      } finally {
        if (silent) setSyncing(false);
        else setLoading(false);
      }
    },
    [type, qDebounced, page, pageSize, makeSearchHaystack]
  );

  // reset pagination & sélection quand type / recherche changent
  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [type, qDebounced]);

  useEffect(() => {
    load(rows.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const rowsToRender = rows;
  const totalToRender = total;

  const pageIds = useMemo(() => rowsToRender.map((r) => r._id), [rowsToRender]);
  const allOnPageSelected = rowsToRender.length > 0 && rowsToRender.every((it) => selectedIds.includes(it._id));

  function openMultiFromSelection() {
    const chosen = rowsToRender.filter((r) => selectedIds.includes(r._id));
    if (!chosen.length) return;

    const baseClient = String(chosen[0]?.client || "").toLowerCase().trim();
    const okSameClient = chosen.every((x) => String(x?.client || "").toLowerCase().trim() === baseClient);
    if (!okSameClient) {
      setToast({ text: "Sélectionne des demandes appartenant au même client.", kind: "warning" });
      toastTimer.current = setTimeout(() => setToast(null), 3500);
      return;
    }
    setMultiDemands(chosen);
    setMultiOpen(true);
  }

  return (
    <div className="py-6 space-y-6">
      {/* Toolbar */}
      <div className={WRAP}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-1xl lg:text-2xl font-extrabold tracking-tight text-[#0B1E3A]">
            {t("title")}
          </h1>

          {/* Barre de recherche */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[260px] md:w-[320px] lg:w-[360px]">
              <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder={t("search.placeholder")}
                aria-label={t("search.aria")}
                className="w-full h-10 rounded-xl border border-gray-300 bg-white pl-10 pr-9 text-sm text-[#0B1E3A] shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => { setQ(""); setPage(1); }}
                  aria-label={t("search.clear")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <FiXCircle size={16} />
                </button>
              )}
            </div>

            <button
              disabled={selectedIds.length === 0}
              onClick={openMultiFromSelection}
              className="inline-flex items-center justify-center rounded-xl bg-[#F7C600] text-[#0B1E3A] px-4 py-2 font-semibold shadow disabled:opacity-50"
            >
              {t("createDevis", { default: "Créer devis" })}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700">{error}</p>
        )}
      </div>

      {/* Table / List */}
      <div className={WRAP}>
        {loading && rowsToRender.length === 0 ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ) : totalToRender === 0 ? (
          <p className="text-gray-500">{t("messages.noData")}</p>
        ) : (
          <>
            {/* >= md */}
            <div className="hidden md:block">
              <div className="-mx-4 md:mx-0 overflow-x-auto">
                <table className="min-w-[980px] w-full table-auto text-[13px] lg:text-sm border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="p-2.5 text-left w-12">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={(e) => {
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? Array.from(new Set([...prev, ...pageIds]))
                                : prev.filter((id) => !pageIds.includes(id))
                            );
                          }}
                        />
                      </th>
                      <th className="p-2.5 text-left">{t("table.headers.demande")}</th>
                      <th className="p-2.5 text-left">{t("table.headers.type")}</th>
                      <th className="p-2.5 text-left">{t("table.headers.client")}</th>
                      <th className="p-2.5 text-left whitespace-nowrap">{t("table.headers.date")}</th>
                      <th className="p-2.5 text-left whitespace-nowrap">{t("table.headers.pdfDdv")}</th>
                      <th className="p-2.5 text-left whitespace-nowrap">{t("table.headers.pdf")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsToRender.map((r) => {
                      const clientLabel = String(r.client || "");
                      const hasDocs = Number(r.attachments) > 0;

                      return (
                        <tr key={`${r._id}-${r.demandeNumero}`} className="odd:bg-slate-50/40 hover:bg-[#0B1E3A]/[0.04] transition-colors">
                          <td className="p-2.5 border-b border-gray-200 w-12">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(r._id)}
                              onChange={(e) =>
                                setSelectedIds((prev) =>
                                  e.target.checked ? [...prev, r._id] : prev.filter((id) => id !== r._id)
                                )
                              }
                            />
                          </td>

                          {/* Demande (une seule par ligne) */}
                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#F7C600]" />
                              <span className="font-mono">{r.demandeNumero || dash}</span>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="p-2.5 border-b border-gray-200 capitalize">
                            {typeLabel(r.type) || dash}
                          </td>

                          {/* Client */}
                          <td className="p-2.5 border-b border-gray-200">
                            <span className="block truncate max-w-[18rem]" title={clientLabel}>
                              {clientLabel || dash}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            {formatDate(r.date)}
                          </td>

                          {/* PDF DDV */}
                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            {ddvHref(r) ? (
                              <a
                                href={ddvHref(r)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                              >
                                <FiFileText size={16} /> {t("actions.open")}
                              </a>
                            ) : (
                              <span className="text-gray-400">{dash}</span>
                            )}
                          </td>

                          {/* PDF devis (DV...) / Pièces jointes */}
                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            {devisHref(r) ? (
                              <a
                                href={devisHref(r)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                                title={hasDocs ? `${r.attachments} fichier(s)` : undefined}
                              >
                                <FiFileText size={16} />
                                {t("actions.open")}
                              </a>
                            ) : (
                              <span className="text-gray-400">{dash}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={totalToRender}
                  onPageChange={(n) => setPage(Number(n))}
                  onPageSizeChange={(s) => { setPageSize(Number(s)); setPage(1); }}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
                {syncing && <p className="mt-2 text-xs text-gray-400">Mise à jour…</p>}
              </div>
            </div>

            {/* < md */}
            <div className="md:hidden divide-y divide-gray-200">
              {rowsToRender.map((r) => {
                const clientLabel = String(r.client || "");
                const hasDocs = Number(r.attachments) > 0;

                return (
                  <div key={`${r._id}-${r.demandeNumero}`} className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={selectedIds.includes(r._id)}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked ? [...prev, r._id] : prev.filter((id) => id !== r._id)
                            )
                          }
                        />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#F7C600]" />
                        <span className="font-mono">{r.demandeNumero || dash}</span>
                      </div>

                      {ddvHref(r) || devisHref(r) ? (
                        <a
                          href={ddvHref(r) || devisHref(r)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                          title={hasDocs ? `${r.attachments} fichier(s)` : undefined}
                        >
                          <FiFileText size={16} />
                          {t("actions.open")}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">{dash}</span>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500">{t("table.headers.type")}</p>
                        <p className="truncate capitalize">{typeLabel(r.type)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500">{t("table.headers.date")}</p>
                        <p className="truncate">{formatDate(r.date)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[11px] font-semibold text-gray-500">{t("table.headers.client")}</p>
                        <p className="truncate" title={clientLabel}>{clientLabel || dash}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <Pagination
                page={page}
                pageSize={pageSize}
                total={totalToRender}
                onPageChange={(n) => setPage(Number(n))}
                onPageSizeChange={(s) => { setPageSize(Number(s)); setPage(1); }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
              {syncing && <p className="mt-2 text-xs text-gray-400">Mise à jour…</p>}
            </div>
          </>
        )}
      </div>

      {/* Modal multi-devis */}
      <MultiDevisModal
        open={multiOpen}
        onClose={() => setMultiOpen(false)}
        demands={multiDemands}
        onCreated={() => {
          setMultiOpen(false);
          setSelectedIds([]);
          load(false);
        }}
        demandKinds={["compression", "traction", "torsion", "fil", "grille", "autre"]}
        articleKinds={["compression", "traction", "torsion", "fil", "grille", "autre"]}
      />

      {/* Toast simple */}
      {toast && (
        <div className="fixed z-50 top-4 right-4 rounded-xl border px-4 py-2 shadow-lg bg-blue-50 border-blue-200 text-blue-800">
          <div className="flex items-center gap-3">
            <span className="text-sm">{toast.text}</span>
            <button onClick={() => setToast(null)} className="ml-1 inline-flex rounded-md border px-2 py-0.5 text-xs">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

DemandeDevisList.propTypes = {
  type: PropTypes.oneOf(["all", "compression", "traction", "torsion", "fil", "grille", "autre"]),
  query: PropTypes.string,
};
