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
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://mtr-backend-render.onrender.com"
).replace(/\/$/, "");
const API = `${BACKEND}/api`;

/* ---------------------------- Utils ---------------------------- */
const WRAP = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";
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

// 🔹 label client (le backend renvoie déjà `client` en string)
function getClientLabel(r) {
  if (typeof r?.client === "string" && r.client.trim()) return r.client.trim();
  if (r?.clientName && r.clientName.trim()) return r.clientName.trim();
  const prenom = r?.client?.prenom || r?.client?.firstName || "";
  const nom = r?.client?.nom || r?.client?.lastName || "";
  const full = `${prenom} ${nom}`.trim();
  if (full) return full;
  return "";
}

// 🔗 lien PDF devis (fourni par l'API compact)
const devisHref = (r) => r?.devisPdf || null;

export default function DemandeDevisList({ type = "all", query = "" }) {
  const t = useTranslations("auth.admin.demandsListPage");
  const tTypes = useTranslations("auth.admin.devisAdmin.types");

  const [q, setQ] = useState(query);
  const qDebounced = useDebounced(q, 400);

  // pagination (contrôle UI)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // données (mode normal: rows/total depuis serveur ; mode local: allRowsLocal filtrées)
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // stockage brut pour filtrage local quand q != ""
  const [allRowsLocal, setAllRowsLocal] = useState([]);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  // sélection multiple + modal
  const [selectedIds, setSelectedIds] = useState([]); // -> stocke des devisNumero
  const [multiOpen, setMultiOpen] = useState(false);
  const [multiDemands, setMultiDemands] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  const localMode = qDebounced.trim().length > 0;

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

  // Construit une "ligne indexable" pour la recherche locale
  const makeSearchHaystack = useCallback(
    (r) => {
      // nouvelles sources de recherche
      const demandeNums =
        Array.isArray(r.demandeNumeros) && r.demandeNumeros.length
          ? r.demandeNumeros.join(", ")
          : (Array.isArray(r.demandes) ? r.demandes.map(d => d?.numero).filter(Boolean).join(", ") : "");

      const typeList =
        Array.isArray(r.types) && r.types.length
          ? r.types
          : (Array.isArray(r.demandes) ? r.demandes.map(d => d?.type).filter(Boolean) : []);

      const typesTxt = typeList.map(typeLabel).filter(Boolean).join(", ");

      const client = getClientLabel(r);
      const dateTxt = formatDate(r.date);
      const rawDate = r?.date ? new Date(r.date).toISOString() : "";

      return norm(
        [r.devisNumero, demandeNums, typesTxt, client, dateTxt, rawDate]
          .filter(Boolean)
          .join(" | ")
      );
    },
    [typeLabel]
  );

  const load = useCallback(
    async (silent = false) => {
      try {
        setError("");
        if (silent) setSyncing(true);
        else setLoading(true);

        // En mode local, on tire un gros lot (ex. 2000) page=1, et on filtre en front
        const effectivePage = localMode ? 1 : page;
        const effectiveLimit = localMode ? 2000 : pageSize;

        const params = new URLSearchParams({
          type: type || "all",
          q: localMode ? "" : (qDebounced || ""), // ne pas filtrer côté serveur en mode local
          page: String(effectivePage),
          limit: String(effectiveLimit),
        });

        // Chemin REST d'après ton code existant
        const res = await fetch(`${API}/devis/devis/list?` + params.toString(), {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) throw new Error(data?.message || `HTTP ${res.status}`);

        if (localMode) {
          const items = Array.isArray(data.items) ? data.items : [];
          setAllRowsLocal(items);
          setRows(items);
          setTotal(items.length);
        } else {
          setAllRowsLocal([]);
          setRows(Array.isArray(data.items) ? data.items : []);
          setTotal(Number(data.total) || 0);
        }
      } catch (err) {
        setError(err?.message || "Error");
      } finally {
        if (silent) setSyncing(false);
        else setLoading(false);
      }
    },
    [type, qDebounced, page, pageSize, localMode]
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

  // Filtrage/pagination locale (quand qDebounced != "")
  const filteredLocal = useMemo(() => {
    if (!localMode) return { list: rows, total: total };

    const needle = norm(qDebounced);
    const filtered = (allRowsLocal || []).filter((r) => {
      const hay = makeSearchHaystack(r);
      return hay.includes(needle);
    });

    const totalLocal = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const sliced = filtered.slice(start, end);

    return { list: sliced, total: totalLocal };
  }, [localMode, rows, total, allRowsLocal, qDebounced, page, pageSize, makeSearchHaystack]);

  const rowsToRender = localMode ? filteredLocal.list : rows;
  const totalToRender = localMode ? filteredLocal.total : total;

  // 👉 sélection basée sur devisNumero
  const pageIds = useMemo(() => rowsToRender.map((r) => r.devisNumero), [rowsToRender]);
  const allOnPageSelected = rowsToRender.length > 0 && rowsToRender.every((it) => selectedIds.includes(it.devisNumero));

  function openMultiFromSelection() {
    const chosen = rowsToRender.filter((r) => selectedIds.includes(r.devisNumero));
    if (!chosen.length) return;

    const baseClient = (getClientLabel(chosen[0]) || "").toLowerCase().trim();
    const okSameClient = chosen.every(
      (x) => (getClientLabel(x) || "").toLowerCase().trim() === baseClient
    );
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
              <FiSearch
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
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
                      <th className="p-2.5 text-left whitespace-nowrap">{t("table.headers.pdf")}</th>
                      <th className="p-2.5 text-left whitespace-nowrap">{t("table.headers.attachments") ?? "Fichiers joints"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsToRender.map((r) => {
                      const clientLabel = getClientLabel(r);

                      return (
                        <tr key={r.devisNumero} className="odd:bg-slate-50/40 hover:bg-[#0B1E3A]/[0.04] transition-colors">
                          <td className="p-2.5 border-b border-gray-200 w-12">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(r.devisNumero)}
                              onChange={(e) =>
                                setSelectedIds((prev) =>
                                  e.target.checked
                                    ? [...prev, r.devisNumero]
                                    : prev.filter((id) => id !== r.devisNumero)
                                )
                              }
                            />
                          </td>

                          {/* Demandes (plusieurs possibles) */}
                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap align-top">
                            <div className="flex items-start gap-2">
                              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#F7C600]" />
                              {Array.isArray(r.demandes) && r.demandes.length > 0 ? (
                                <div className="flex flex-col">
                                  {r.demandes.map((d, i) => (
                                    <span key={i} className="font-mono">
                                      {d?.numero || dash}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="font-mono">{dash}</span>
                              )}
                            </div>
                          </td>

                          {/* Types correspondants */}
                          <td className="p-2.5 border-b border-gray-200 capitalize align-top">
                            {Array.isArray(r.demandes) && r.demandes.length > 0 ? (
                              <div className="flex flex-col">
                                {r.demandes.map((d, i) => (
                                  <span key={i}>{typeLabel(d?.type) || dash}</span>
                                ))}
                              </div>
                            ) : (
                              <span>{dash}</span>
                            )}
                          </td>

                          <td className="p-2.5 border-b border-gray-200">
                            <span className="block truncate max-w-[18rem]" title={clientLabel || ""}>
                              {clientLabel || dash}
                            </span>
                          </td>

                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            {formatDate(r.date)}
                          </td>

                          {/* PDF devis */}
                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            {devisHref(r) ? (
                              <a
                                href={devisHref(r)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                                aria-label={t("actions.open")}
                                title={t("actions.open")}
                              >
                                <FiFileText size={16} />
                                {t("actions.open")}
                              </a>
                            ) : (
                              <span className="text-gray-400">{dash}</span>
                            )}
                          </td>

                          {/* Fichiers joints : non fournis par l'API compact -> affiche "—" */}
                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            <span className="text-gray-400">{dash}</span>
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
                const clientLabel = getClientLabel(r);

                return (
                  <div key={r.devisNumero} className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={selectedIds.includes(r.devisNumero)}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked ? [...prev, r.devisNumero] : prev.filter((id) => id !== r.devisNumero)
                            )
                          }
                        />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#F7C600]" />
                        <span className="font-mono">{r.devisNumero || dash}</span>
                      </div>

                      {devisHref(r) ? (
                        <a
                          href={devisHref(r)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                          aria-label={t("actions.open")}
                          title={t("actions.open")}
                        >
                          <FiFileText size={16} />
                          {t("actions.open")}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">{dash}</span>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      {/* Demandes / Types */}
                      <div className="col-span-2">
                        <p className="text-[11px] font-semibold text-gray-500">
                          {t("table.headers.demande")} / {t("table.headers.type")}
                        </p>
                        {Array.isArray(r.demandes) && r.demandes.length > 0 ? (
                          <ul className="mt-1 space-y-0.5">
                            {r.demandes.map((d, i) => (
                              <li key={i} className="truncate">
                                <span className="font-mono">{d?.numero || dash}</span>{" "}
                                <span className="text-gray-500">— {typeLabel(d?.type) || dash}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-400">{dash}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-gray-500">{t("table.headers.date")}</p>
                        <p className="truncate">{formatDate(r.date)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500">{t("table.headers.client")}</p>
                        <p className="truncate" title={clientLabel || ""}>{clientLabel || dash}</p>
                      </div>

                      {/* Pièces jointes */}
                      <div className="col-span-2">
                        <p className="text-[11px] font-semibold text-gray-500">{t("table.headers.attachments") ?? "Fichiers joints"}</p>
                        <p className="text-gray-400">{dash}</p>
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
