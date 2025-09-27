// components/admin/demandes/DemandeDevisList.jsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { FiSearch, FiXCircle, FiFileText } from "react-icons/fi";
import Pagination from "@/components/Pagination";

/* ---------------------------- API backend ---------------------------- */
const BACKEND = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://mtr-backend-render.onrender.com"
).replace(/\/$/, "");
const API = `${BACKEND}/api`;

/* ---------------------------- Utils ---------------------------- */
const WRAP = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

function cn(...cls) {
  return cls.filter(Boolean).join(" ");
}
function formatDate(d) {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "-";
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return "-";
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

/* ---------------------------- Component ---------------------------- */
export default function DemandeDevisList({ type = "all", query = "" }) {
  const [q, setQ] = useState(query);
  const qDebounced = useDebounced(q, 400);

  // pagination (même UX que Grille)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
  }, [type, qDebounced]);

  const load = useCallback(
    async (silent = false) => {
      try {
        setError("");
        if (silent) setSyncing(true);
        else if (rows.length === 0) setLoading(true);

        const params = new URLSearchParams({
          type: type || "all",
          q: qDebounced || "",
          page: String(page),
          limit: String(pageSize), // l’endpoint “compact” attend limit
        });

        const res = await fetch(`${API}/devis/demandes/compact?` + params.toString(), {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || `HTTP ${res.status}`);
        }

        setRows(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total) || 0);
      } catch (err) {
        setError(err?.message || "Erreur inconnue");
      } finally {
        if (silent) setSyncing(false);
        else setLoading(false);
      }
    },
    [type, qDebounced, page, pageSize, rows.length]
  );

  useEffect(() => {
    load(rows.length > 0);
  }, [load]);

  return (
    <div className="py-6 space-y-6">
      {/* Toolbar (copie du style Grille) */}
      <div className={WRAP}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-1xl lg:text-2xl font-extrabold tracking-tight text-[#0B1E3A]">
            Tous les demandes devis
          </h1>

          <div className="relative w-full sm:w-[320px] lg:w-[420px]">
            <FiSearch
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher : devis, demande, client, type, date…"
              aria-label="Rechercher"
              className="w-full rounded-xl border border-gray-300 bg-white px-10 pr-9 py-2 text-sm text-[#0B1E3A] shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setPage(1);
                }}
                aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <FiXCircle size={16} />
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700">
            {error}
          </p>
        )}
      </div>

      {/* Table responsive (même design que Grille) */}
      <div className={WRAP}>
        {loading && rows.length === 0 ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ) : total === 0 ? (
          <p className="text-gray-500">Aucune demande de devis</p>
        ) : (
          <>
            {/* TABLE >= md */}
            <div className="hidden md:block">
              <div className="-mx-4 md:mx-0 overflow-x-auto">
                <table className="min-w-[900px] w-full table-auto text-[13px] lg:text-sm border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="p-2.5 text-left">Demande</th>
                      <th className="p-2.5 text-left">Type</th>
                      <th className="p-2.5 text-left">Client</th>
                      <th className="p-2.5 text-left whitespace-nowrap">Date</th>
                      <th className="p-2.5 text-left whitespace-nowrap">PDF DDV</th>
                      <th className="p-2.5 text-left whitespace-nowrap">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.demandeNumero ?? `${r.type}-${r._id}`} className="odd:bg-slate-50/40 hover:bg-[#0B1E3A]/[0.04] transition-colors">
                        <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#F7C600]" />
                            <span className="font-mono">{r.demandeNumero || "-"}</span>
                          </div>
                        </td>

                        <td className="p-2.5 border-b border-gray-200">
                          <span
                            className={cn(
                              "inline-flex items-center text-sm font-semibold capitalize",
                              r.type === "compression" ,
                              r.type === "traction" ,
                              r.type === "torsion" ,
                              r.type === "fil" ,
                              r.type === "grille" ,
                              (!r.type || r.type === "autre") 
                            )}
                          >
                            {r.type || "-"}
                          </span>
                        </td>

                        <td className="p-2.5 border-b border-gray-200">
                          <span className="block truncate max-w-[18rem]" title={r.client || ""}>
                            {r.client || "-"}
                          </span>
                        </td>

                        <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                          {formatDate(r.date)}
                        </td>

                        {/* PDF DDV */}
                        <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                          {r.ddvPdf ? (
                            <a
                              href={r.ddvPdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                            >
                              <FiFileText size={16} />
                              Ouvrir
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* PDF (devis) */}
                        <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                          {r.devisPdf ? (
                            <a
                              href={r.devisPdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                            >
                              <FiFileText size={16} />
                              Ouvrir
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={(n) => setPage(Number(n))}
                  onPageSizeChange={(s) => {
                    setPageSize(Number(s));
                    setPage(1);
                  }}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            </div>

            {/* LISTE < md */}
            <div className="md:hidden divide-y divide-gray-200">
              {rows.map((r) => (
                <div key={r.demandeNumero ?? `${r.type}-${r._id}`} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#F7C600]" />
                      <span className="font-mono">{r.demandeNumero || "-"}</span>
                    </div>

                    {(r.ddvPdf || r.devisPdf) ? (
                      <a
                        href={r.ddvPdf || r.devisPdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                        aria-label="Ouvrir"
                        title="Ouvrir"
                      >
                        <FiFileText size={16} />
                        Ouvrir
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500">Type</p>
                      <p className="truncate capitalize">{r.type || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500">Date</p>
                      <p className="truncate">{formatDate(r.date)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] font-semibold text-gray-500">Client</p>
                      <p className="truncate">{r.client || "-"}</p>
                    </div>
                  </div>
                </div>
              ))}

              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={(n) => setPage(Number(n))}
                onPageSizeChange={(s) => {
                  setPageSize(Number(s));
                  setPage(1);
                }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

DemandeDevisList.propTypes = {
  type: PropTypes.oneOf([
    "all",
    "compression",
    "traction",
    "torsion",
    "fil",   // ← correction (pas "fill")
    "grille",
    "autre",
  ]),
  query: PropTypes.string,
};
