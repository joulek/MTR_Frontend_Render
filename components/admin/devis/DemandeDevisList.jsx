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

function cn(...cls) {
  return cls.filter(Boolean).join(" ");
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

// 🔹 label client
function getClientLabel(r) {
  if (r?.clientName && r.clientName.trim()) return r.clientName.trim();
  const prenom = r?.client?.prenom || r?.client?.firstName || "";
  const nom = r?.client?.nom || r?.client?.lastName || "";
  const full = `${prenom} ${nom}`.trim();
  if (full) return full;
  if (typeof r?.client === "string" && r.client.trim()) return r.client.trim();
  return "";
}

// 🔗 liens PDFs
const ddvHref   = (r) => `${API}/devis/${r.type}/${r._id}/pdf`;
const devisHref = (r) => (r.devisNumero ? `${BACKEND}/files/devis/${r.devisNumero}.pdf` : null);

// 🔗 lien fichier joint PAR INDEX  ✅ (route correcte: document (singulier))
const attachmentHref = (r, idx) => `${BACKEND}/api/devis/${r.type}/${r._id}/document/${idx}`;

/* ---------------------------- Component ---------------------------- */
export default function DemandeDevisList({ type = "all", query = "" }) {
  const t = useTranslations("auth.admin.demandsListPage");
  const tTypes = useTranslations("auth.admin.devisAdmin.types");

  const [q, setQ] = useState(query);
  const qDebounced = useDebounced(q, 400);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  // ✅ sélection multiple + modal
  const [selectedIds, setSelectedIds] = useState([]);
  const [multiOpen, setMultiOpen] = useState(false);
  const [multiDemands, setMultiDemands] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((text, kind = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, kind });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  useEffect(() => {
    setPage(1);
    // تنظيف الاختيارات عند تغيير الفلتر/البحث
    setSelectedIds([]);
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
          limit: String(pageSize),
        });

        const res = await fetch(`${API}/devis/demandes/compact?` + params.toString(), {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) throw new Error(data?.message || `HTTP ${res.status}`);

        setRows(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total) || 0);
      } catch (err) {
        setError(err?.message || "Error");
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

  const typeLabel = (v) => {
    const map = {
      compression: tTypes("compression"),
      traction: tTypes("traction"),
      torsion: tTypes("torsion"),
      fil: tTypes("fill"), // clé i18n existante "fill" pour "fil"
      grille: tTypes("grille"),
      autre: tTypes("autre"),
    };
    return map[v] ?? (v || dash);
  };

  const typeBadgeClass = (v) =>
    cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
      v === "compression" && "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
      v === "traction" && "bg-blue-50 text-blue-800 ring-1 ring-blue-200",
      v === "torsion" && "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
      v === "fil" && "bg-fuchsia-50 text-fuchsia-800 ring-1 ring-fuchsia-200",
      v === "grille" && "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200",
      (!v || v === "autre") && "bg-slate-50 text-slate-800 ring-1 ring-slate-200"
    );

  // ✅ ouvrir modal à partir de la sélection
  function openMultiFromSelection() {
    const chosen = rows.filter((r) => selectedIds.includes(r._id));
    if (!chosen.length) return;

    // تأكد كلّهم نفس الclient بالاسم المتوفّر من الـpipeline
    const baseClient = (getClientLabel(chosen[0]) || "").toLowerCase().trim();
    const okSameClient = chosen.every(
      (x) => (getClientLabel(x) || "").toLowerCase().trim() === baseClient
    );
    if (!okSameClient) {
      showToast("Sélectionne des demandes appartenant au même client.", "warning");
      return;
    }

    setMultiDemands(chosen);
    setMultiOpen(true);
  }

  // ✅ ids متاع الصفحة الحالية (لـ Select All)
  const pageIds = useMemo(() => rows.map((r) => r._id), [rows]);
  const allOnPageSelected =
    rows.length > 0 && rows.every((it) => selectedIds.includes(it._id));

  return (
    <div className="py-6 space-y-6">
      {/* Toolbar */}
      <div className={WRAP}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-1xl lg:text-2xl font-extrabold tracking-tight text-[#0B1E3A]">
            {t("title")}
          </h1>

          {/* Recherche + bouton créer devis */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[320px] lg:w-[420px]">
              <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder={t("search.placeholder")}
                aria-label={t("search.aria")}
                className="w-full rounded-xl border border-gray-300 bg-white px-10 pr-9 py-2 text-sm text-[#0B1E3A] shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setPage(1);
                  }}
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
              Créer devis
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700">{error}</p>
        )}
      </div>

      {/* Table responsive */}
      <div className={WRAP}>
        {loading && rows.length === 0 ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ) : total === 0 ? (
          <p className="text-gray-500">{t("messages.noData")}</p>
        ) : (
          <>
            {/* TABLE >= md */}
            <div className="hidden md:block">
              <div className="-mx-4 md:mx-0 overflow-x-auto">
                <table className="min-w-[980px] w-full table-auto text-[13px] lg:text-sm border-separate border-spacing-0">
                  <thead>
                    <tr>
                      {/* ✅ Select all */}
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
                      <th className="p-2.5 text-left whitespace-nowrap">Fichiers joints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const clientLabel = getClientLabel(r);
                      const docs = Array.isArray(r.documents) ? r.documents : [];
                      const hasDocs = docs.length > 0 || Number(r.attachments) > 0;

                      return (
                        <tr key={r._id} className="odd:bg-slate-50/40 hover:bg-[#0B1E3A]/[0.04] transition-colors">
                          {/* ✅ checkbox ligne */}
                          <td className="p-2.5 border-b border-gray-200 w-12">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(r._id)}
                              onChange={(e) =>
                                setSelectedIds((prev) =>
                                  e.target.checked
                                    ? [...prev, r._id]
                                    : prev.filter((id) => id !== r._id)
                                )
                              }
                            />
                          </td>

                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#F7C600]" />
                              <span className="font-mono">{r.demandeNumero || dash}</span>
                            </div>
                          </td>

                          <td className="p-2.5 border-b border-gray-200">
                            <span className={typeBadgeClass(r.type)}>{typeLabel(r.type)}</span>
                          </td>

                          {/* Client */}
                          <td className="p-2.5 border-b border-gray-200">
                            <span className="block truncate max-w-[18rem]" title={clientLabel || ""}>
                              {clientLabel || dash}
                            </span>
                          </td>

                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            {formatDate(r.date)}
                          </td>

                          {/* PDF DDV */}
                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            <a
                              href={ddvHref(r)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                              aria-label={t("actions.open")}
                              title={t("actions.open")}
                            >
                              <FiFileText size={16} />
                              {t("actions.open")}
                            </a>
                          </td>

                          {/* PDF (devis) */}
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

                          {/* Fichiers joints */}
                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            {hasDocs ? (
                              <details className="group">
                                <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-[#0B1E3A] hover:bg-slate-50">
                                  {docs.length > 0 ? `${docs.length} fichier(s)` : `${r.attachments} fichier(s)`}
                                </summary>
                                <ul className="mt-2 ml-1 w-max max-w-[28rem] rounded-xl border border-slate-200 bg-white shadow-lg p-2 space-y-1">
                                  {docs.length > 0
                                    ? docs.map((d, i) => (
                                        <li key={i}>
                                          <a
                                            href={attachmentHref(r, d.index ?? i)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block truncate px-2 py-1 text-sm hover:bg-slate-50"
                                            title={d.filename || `Fichier ${i + 1}`}
                                          >
                                            {d.filename || `Fichier ${i + 1}`}
                                          </a>
                                        </li>
                                      ))
                                    : Array.from({ length: Number(r.attachments) || 0 }).map((_, i) => (
                                        <li key={i}>
                                          <a
                                            href={attachmentHref(r, i)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block truncate px-2 py-1 text-sm hover:bg-slate-50"
                                            title={`Fichier ${i + 1}`}
                                          >
                                            {`Fichier ${i + 1}`}
                                          </a>
                                        </li>
                                      ))}
                                </ul>
                              </details>
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
              {rows.map((r) => {
                const clientLabel = getClientLabel(r);
                const docs = Array.isArray(r.documents) ? r.documents : [];
                const hasDocs = docs.length > 0 || Number(r.attachments) > 0;

                return (
                  <div key={r._id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* ✅ checkbox mobile */}
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={selectedIds.includes(r._id)}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? [...prev, r._id]
                                : prev.filter((id) => id !== r._id)
                            )
                          }
                        />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#F7C600]" />
                        <span className="font-mono">{r.demandeNumero || dash}</span>
                      </div>

                      {(ddvHref(r) || devisHref(r)) ? (
                        <a
                          href={ddvHref(r) || devisHref(r)}
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
                        <p className="truncate" title={clientLabel || ""}>{clientLabel || dash}</p>
                      </div>

                      {/* Fichiers joints (mobile) */}
                      <div className="col-span-2">
                        <p className="text-[11px] font-semibold text-gray-500">Fichiers joints</p>
                        {hasDocs ? (
                          <ul className="mt-1 space-y-1">
                            {docs.length > 0
                              ? docs.map((d, i) => (
                                  <li key={i}>
                                    <a
                                      href={attachmentHref(r, d.index ?? i)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline"
                                      title={d.filename || `Fichier ${i + 1}`}
                                    >
                                      {d.filename || `Fichier ${i + 1}`}
                                    </a>
                                  </li>
                                ))
                              : Array.from({ length: Number(r.attachments) || 0 }).map((_, i) => (
                                  <li key={i}>
                                    <a
                                      href={attachmentHref(r, i)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline"
                                    >
                                      {`Fichier ${i + 1}`}
                                    </a>
                                  </li>
                                ))}
                          </ul>
                        ) : (
                          <p className="text-gray-400">{dash}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

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

      {/* ✅ Multi-devis modal */}
      <MultiDevisModal
        open={multiOpen}
        onClose={() => setMultiOpen(false)}
        demands={multiDemands}
        onCreated={() => {
          setMultiOpen(false);
          setSelectedIds([]);
          load(false);
        }}
        // نسمح بكل الأنواع بما أن الصفحة فيها mix
        demandKinds={["compression", "traction", "torsion", "fil", "grille", "autre"]}
        articleKinds={["compression", "traction", "torsion", "fil", "grille", "autre"]}
      />

      {/* Toast بسيط */}
      {toast && (
        <div className="fixed z-50 top-4 right-4 rounded-xl border px-4 py-2 shadow-lg bg-blue-50 border-blue-200 text-blue-800">
          <div className="flex items-center gap-3">
            <span className="text-sm">{toast.text}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-1 inline-flex rounded-md border px-2 py-0.5 text-xs"
            >
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
