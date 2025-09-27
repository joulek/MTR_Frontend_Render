// components/admin/demandes/DemandeDevisList.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";

/* ---------------------------- API backend ---------------------------- */
const BACKEND = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://mtr-backend-render.onrender.com"
).replace(/\/$/, "");
const API = `${BACKEND}/api`;

/* ---------------------------- Utils ---------------------------- */
function cn(...cls) {
  return cls.filter(Boolean).join(" ");
}
function formatDate(d) {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState({ loading: false, error: "" });

  // re-fetch quand type / query / page / limit changent
  const qDebounced = useDebounced(query, 400);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  useEffect(() => {
    setPage(1);
  }, [type, qDebounced]);

  useEffect(() => {
    let aborted = false;

    async function run() {
      setState({ loading: true, error: "" });
      try {
        const params = new URLSearchParams({
          type: type || "all",
          q: qDebounced || "",
          page: String(page),
          limit: String(limit),
        });

        const res = await fetch(`${API}/devis/demandes/compact?` + params.toString());

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`HTTP ${res.status} - ${txt}`);
        }

        const data = await res.json();
        if (aborted) return;

        if (!data?.success) {
          throw new Error(data?.message || "Réponse invalide");
        }

        setRows(data.items || []);
        setTotal(data.total || 0);
        setState({ loading: false, error: "" });
      } catch (err) {
        if (aborted) return;
        setState({ loading: false, error: err?.message || "Erreur inconnue" });
      }
    }

    run();
    return () => {
      aborted = true;
    };
  }, [type, qDebounced, page, limit]);

  const onPrev = () => setPage((p) => Math.max(1, p - 1));
  const onNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="space-y-4">
      {/* Header infos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="text-sm text-gray-600">
          <h1>Demandes de devis</h1>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
              <th className="px-4 py-3">Demande</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">PDF DDV </th>
              <th className="px-4 py-3">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {state.loading && rows.length === 0 ? (
              Array.from({ length: Math.min(5, limit) }).map((_, i) => (
                <tr key={`sk-${i}`} className="animate-pulse">
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-40 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-12 bg-gray-200 rounded" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  Aucun résultat
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.demandeNumero ?? `${r.type}-${r._id}`} className="hover:bg-yellow-50/40">
                  <td className="px-4 py-3 font-medium text-[#0B1E3A]">
                    {r.demandeNumero || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        r.type === "compression" && "bg-blue-100 text-blue-800",
                        r.type === "traction" && "bg-emerald-100 text-emerald-800",
                        r.type === "torsion" && "bg-fuchsia-100 text-fuchsia-800",
                        r.type === "fil" && "bg-amber-100 text-amber-800",
                        r.type === "grille" && "bg-cyan-100 text-cyan-800",
                        r.type === "autre" && "bg-gray-200 text-gray-800"
                      )}
                    >
                      {r.type || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.client || "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(r.date)}</td>
                  <td className="px-4 py-3">
                    {r.devisNumero || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.ddvPdf ? (
                      <a
                        href={r.ddvPdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-700 hover:text-yellow-900 underline underline-offset-2"
                      >
                        Ouvrir
                      </a>
                    ) : r.devisPdf ? (
                      <a
                        href={r.devisPdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-700 hover:text-yellow-900 underline underline-offset-2"
                      >
                        Ouvrir
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Error */}
      {state.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}
    </div>
  );
}

DemandeDevisList.propTypes = {
  type: PropTypes.oneOf([
    "all",
    "compression",
    "traction",
    "torsion",
    "fill",
    "grille",
    "autre",
  ]),
  query: PropTypes.string,
};
