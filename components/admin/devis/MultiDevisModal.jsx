"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FiX, FiTrash2, FiPlus, FiSearch } from "react-icons/fi";

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://mtr-backend-render.onrender.com";

// الأنواع المسموحة للبحث عن demandes أخرى لنفس العميل
const DEFAULT_KINDS = ["compression", "torsion", "traction", "fil", "grille", "autre"];

/* ------------------------------ Helpers ------------------------------ */
const tx =
  (t) =>
  (key, fallback) => {
    try {
      const v = t(key);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  };

function getClientFromDemand(d) {
  // نحاول نلقى ID للعميل إن وجد
  const id =
    d?.user?._id ||
    d?.client?._id ||
    d?.clientId ||
    d?.userId ||
    null;

  // label fallback
  const label =
    (d?.clientName && d.clientName.trim()) ||
    `${d?.client?.prenom || d?.user?.prenom || ""} ${d?.client?.nom || d?.user?.nom || ""}`.trim() ||
    d?.client?.email ||
    d?.user?.email ||
    "";

  return { id: id ? String(id) : null, label: (label || "").trim() };
}

function cleanFilename(name = "") {
  return name?.startsWith?.("~$") ? "" : name || "";
}

function fmtDate(d) {
  try {
    const dt = new Date(d || "");
    return dt.toLocaleDateString();
  } catch {
    return "";
  }
}

/* ------------------------------ Component ------------------------------ */
export default function MultiDevisModal({
  open,
  onClose,
  demands = [],
  onCreated,
  demandKinds, // اختياري: لو حبيت تحدد قائمة أنواع مخصّصة
}) {
  const t = useTranslations("auth.admin.devisMulti");
  const T = tx(t);

  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  const [lines, setLines] = useState([]);
  const [creating, setCreating] = useState(false);

  // Pool لاختيار demandes إضافية من نفس العميل
  const [pool, setPool] = useState([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState("");

  // عميل الدفعة الأولى من الاختيار
  const rootClient = getClientFromDemand(demands[0]);

  // PU helper (prix de l’article depuis la liste)
  const getPU = (articleId) => {
    const a = articles.find((x) => x._id === articleId);
    return Number(a?.prixHT ?? a?.priceHT ?? 0) || 0;
  };

  // NEW: prix actuel d’une ligne (priorité au champ modifiable "puht")
  const getLinePU = (ln) => {
    const v = Number(ln?.puht);
    return Number.isFinite(v) && v >= 0 ? v : getPU(ln.articleId);
  };

  /* ------------------------------ Init عند الفتح ------------------------------ */
  useEffect(() => {
    if (!open) return;

    // نحضّر السطور مباشرةً من demandes المختارة
    setLines(
      demands.map((d) => ({
        demandeId: d._id,
        ddvNumber:
          d.demandeNumero ||
          d.numero ||
          d.ref ||
          d.requestNumber ||
          d.reference ||
          "", // رقم الطلب (أي فيلد متوفر)
        articleId: "",
        qty: Number(d?.quantite ?? 1) || 1,
        remisePct: 0,
        tvaPct: 19,
        puht: 0, // NEW: prix unitaire modifiable par l'utilisateur
      }))
    );

    // جلب لائحة المقالات
    (async () => {
      setLoadingArticles(true);
      try {
        const r = await fetch(`${BACKEND}/api/articles?limit=2000`, {
          cache: "no-store",
          credentials: "include",
        });
        const j = await r.json().catch(() => null);
        const arr =
          (Array.isArray(j) ? j : null) ?? j?.data ?? j?.items ?? j?.results ?? [];
        // تنظيف أسماء الملفات + الحفاظ على المرجع/التسمية
        setArticles(
          (arr || []).map((a) => ({
            ...a,
            reference: a.reference || a.ref || a.code || a.sku || "",
            designation: a.designation || a.label || a.name || "",
            prixHT: Number(a?.prixHT ?? a?.priceHT ?? 0) || 0,
          }))
        );
      } catch {
        setArticles([]);
      } finally {
        setLoadingArticles(false);
      }
    })();
  }, [open, demands]);

  /* ------------------------------ Pool demandes أخرى لنفس العميل ------------------------------ */
  const loadPool = useCallback(async () => {
    if (!rootClient.id && !rootClient.label) return;

    setPoolLoading(true);
    try {
      const kinds = demandKinds?.length ? demandKinds : DEFAULT_KINDS;

      // نجيب demandes من عدة endpoints (واحد لكل نوع)
      const results = await Promise.all(
        kinds.map(async (k) => {
          try {
            const res = await fetch(`${BACKEND}/api/admin/devis/${encodeURIComponent(k)}`, {
              cache: "no-store",
              credentials: "include",
            });
            const json = await res.json().catch(() => null);
            const arr = json?.items ?? [];
            return arr.map((x) => ({ ...x, __type: k }));
          } catch {
            return [];
          }
        })
      );

      // نفلتر على نفس العميل: بالأولوية بالـid، وإلا بالاسم
      const all = results.flat();
      const sameClient = all.filter((x) => {
        const c = getClientFromDemand(x);
        if (rootClient.id && c.id) return c.id === rootClient.id;
        if (rootClient.label && c.label)
          return c.label.toLowerCase() === rootClient.label.toLowerCase();
        return false;
      });

      // إزالة التكرار
      const uniq = new Map();
      for (const d of sameClient) if (!uniq.has(d._id)) uniq.set(d._id, d);
      setPool(Array.from(uniq.values()));
    } catch {
      setPool([]);
    } finally {
      setPoolLoading(false);
    }
  }, [rootClient.id, rootClient.label, demandKinds]);

  useEffect(() => {
    if (open) loadPool();
  }, [open, loadPool]);

  /* ------------------------------ Filter في الـpicker ------------------------------ */
  const availableToAdd = useMemo(() => {
    const taken = new Set(lines.map((l) => l.demandeId));
    const base = pool.filter((d) => !taken.has(d._id));
    if (!pickerQ.trim()) return base;
    const needle = pickerQ.trim().toLowerCase();
    return base.filter((d) => {
      const numero =
        String(d?.demandeNumero || d?.numero || d?.ref || "").toLowerCase();
      const date = fmtDate(d?.createdAt).toLowerCase();
      const type = String(d?.__type || d?.type || "").toLowerCase();
      return numero.includes(needle) || date.includes(needle) || type.includes(needle);
    });
  }, [pool, lines, pickerQ]);

  /* ------------------------------ Totaux ------------------------------ */
  const totals = useMemo(() => {
    let ht = 0, ttc = 0;
    for (const l of lines) {
      const pu = getLinePU(l); // NEW
      const q = Number(l.qty || 0);
      const r = Number(l.remisePct || 0);
      const v = Number(l.tvaPct || 0);
      const lht = Math.max(0, pu * q * (1 - r / 100));
      const lttc = lht * (1 + v / 100);
      ht += lht;
      ttc += lttc;
    }
    const mfodec = +(ht * 0.01).toFixed(3);
    return { ht: +ht.toFixed(3), ttc: +(ttc + mfodec).toFixed(3) };
  }, [lines, articles]);

  const canSubmit = lines.length > 0 && lines.every((l) => l.articleId && l.qty > 0);

  /* ------------------------------ Actions ------------------------------ */
  const addLineFromDemand = (d) => {
    if (!d?._id) return;
    setLines((ls) => [
      ...ls,
      {
        demandeId: d._id,
        ddvNumber:
          d.demandeNumero ||
          d.numero ||
          d.ref ||
          d.requestNumber ||
          d.reference ||
          "",
        articleId: "",
        qty: Number(d?.quantite ?? 1) || 1,
        remisePct: 0,
        tvaPct: 19,
        puht: 0, // NEW
      },
    ]);
    setPickerOpen(false);
    setPickerQ("");
  };

  async function submit() {
    if (!canSubmit) return;
    setCreating(true);
    try {
      const payload = {
        demandeIds: Array.from(new Set(lines.map((l) => l.demandeId))),
        lines: lines.map((l) => ({
          demandeId: l.demandeId,
          articleId: l.articleId,
          qty: Number(l.qty || 1),
          remisePct: Number(l.remisePct || 0),
          tvaPct: Number(l.tvaPct || 0),
          puht: Number(getLinePU(l).toFixed(3)), // NEW: envoyer le PU choisi/édité
        })),
        sendEmail: true,
      };

      const r = await fetch(`${BACKEND}/api/devis/admin/from-demande`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => null);
      if (!j?.success) throw new Error(j?.message || T("errors.create", "Échec de création"));

      onClose?.();
      onCreated?.();

      const pdfUrl = j.pdf || j.pdfUrl || j.url;
      if (pdfUrl) window.open(pdfUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(e?.message || T("errors.network", "Erreur réseau"));
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  /* ------------------------------ UI ------------------------------ */
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="multi-devis-title"
      onKeyDown={(e) => e.key === "Escape" && onClose?.()}
    >
      <div className="w-[min(96vw,1100px)] max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        {/* Header */}
        <div className="sticky top-0 z-10 rounded-t-2xl border-b bg-white/95 backdrop-blur px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id="multi-devis-title" className="text-lg sm:text-xl font-semibold text-[#0B1E3A]">
                {T("header.title", "Créer un devis")}{" "}
                <span className="text-slate-500">{T("header.multi", "(multi-demandes)")}</span>
              </h3>

              {rootClient.label && (
                <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F7C600] text-[#0B1E3A] font-semibold">
                    {rootClient.label.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{rootClient.label}</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label={T("aria.close", "Fermer")}
              title={T("aria.close", "Fermer")}
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Bouton Ajouter */}
          <div className="mb-4 flex justify-between items-center">
            <h4 className="text-sm font-semibold text-slate-700">
              {T("header.selectedDemands", "Demandes sélectionnées : {count}").replace(
                "{count}",
                String(lines.length)
              )}
            </h4>

            <div className="relative">
              <button
                onClick={() => {
                  setPickerOpen((p) => !p);
                  if (!pool.length && !poolLoading) loadPool();
                }}
                disabled={!poolLoading && availableToAdd.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                title={T("picker.addFromList", "Ajouter depuis la liste")}
                aria-label={T("picker.addFromList", "Ajouter depuis la liste")}
              >
                {poolLoading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-[#0B1E3A] border-t-transparent animate-spin" />
                ) : (
                  <FiPlus size={16} />
                )}
                {T("picker.addBtn", "Ajouter une demande")}
              </button>

              {/* Popin */}
              {pickerOpen && (
                <div className="absolute right-0 mt-2 w-[460px] max-h-[60vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl z-20">
                  <div className="p-2 border-b bg-slate-50">
                    <div className="relative">
                      <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={pickerQ}
                        onChange={(e) => setPickerQ(e.target.value)}
                        placeholder={T("picker.searchPlaceholder", "Rechercher : numéro, date, type…")}
                        className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                        aria-label={T("picker.searchAria", "Recherche")}
                      />
                    </div>
                  </div>

                  <div className="max-h-[50vh] overflow-y-auto">
                    {poolLoading ? (
                      <div className="p-4 text-sm text-slate-500">
                        {T("common.loading", "Chargement…")}
                      </div>
                    ) : availableToAdd.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500">
                        {T("picker.empty", "Aucune demande disponible.")}
                      </div>
                    ) : (
                      <ul className="divide-y">
                        {availableToAdd.map((d) => (
                          <li key={d._id}>
                            <button
                              onClick={() => addLineFromDemand(d)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50"
                              aria-label={T("picker.addOne", "Ajouter")}
                              title={T("picker.addOne", "Ajouter")}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
                                  <span className="font-mono">
                                    {d.demandeNumero || d.numero || d.ref || "—"}
                                  </span>
                                  {(d.__type || d.type) && (
                                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                                      {d.__type || d.type}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500">{fmtDate(d.createdAt)}</span>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full table-auto border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-[12px] uppercase tracking-wide text-slate-500">
                  <th className="p-2">{T("table.ddv", "DDV")}</th>
                  <th className="p-2">{T("table.article", "Article")}</th>
                  <th className="p-2 text-right">{T("table.puht", "PU HT")}</th>
                  <th className="p-2 text-right">{T("table.qty", "Qté")}</th>
                  <th className="p-2 text-right">{T("table.remisePct", "Remise %")}</th>
                  <th className="p-2 text-right">{T("table.tvaPct", "TVA %")}</th>
                  <th className="p-2 text-right">{T("table.totalHT", "Total HT")}</th>
                  <th className="p-2 text-right">{T("table.actions", "Actions")}</th>
                </tr>
                <tr>
                  <td colSpan={8}>
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                  </td>
                </tr>
              </thead>

              <tbody className="text-[#0B1E3A]">
                {lines.map((ln, i) => {
                  const pu = getLinePU(ln); // NEW
                  const lht = Math.max(
                    0,
                    pu * Number(ln.qty || 0) * (1 - Number(ln.remisePct || 0) / 100)
                  );

                  return (
                    <tr
                      key={`${ln.demandeId}:${i}`}
                      className="odd:bg-slate-50/40 hover:bg-[#0B1E3A]/[0.03] transition-colors"
                    >
                      <td className="p-2 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
                          <span className="font-mono">{ln.ddvNumber || "—"}</span>
                        </div>
                      </td>

                      <td className="p-2 align-middle">
                        <select
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                          value={ln.articleId}
                          onChange={(e) => {
                            const v = e.target.value;
                            const autoPU = getPU(v);
                            setLines((ls) =>
                              ls.map((x, idx) =>
                                idx === i ? { ...x, articleId: v, puht: autoPU } : x
                              )
                            );
                          }}
                        >
                          <option value="">{T("selects.articlePlaceholder", "Choisir un article…")}</option>
                          {articles.map((a) => (
                            <option key={a._id} value={a._id}>
                              {a.reference} — {a.designation}
                            </option>
                          ))}
                        </select>
                        {loadingArticles && (
                          <p className="text-xs text-slate-400 mt-1">
                            {T("common.loading", "Chargement…")}
                          </p>
                        )}
                      </td>

                      {/* PU HT editable */}
                      <td className="p-2 align-middle text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          value={Number(getLinePU(ln)).toFixed(3)}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            const v = Number.isFinite(raw) ? Math.max(0, raw) : 0;
                            setLines((ls) =>
                              ls.map((x, idx) =>
                                idx === i ? { ...x, puht: +v.toFixed(3) } : x
                              )
                            );
                          }}
                          className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-right shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none tabular-nums"
                          aria-label={T("table.puht", "PU HT")}
                        />
                      </td>

                      <td className="p-2 align-middle text-right">
                        <input
                          type="number"
                          min={1}
                          value={ln.qty}
                          onChange={(e) => {
                            const v = Math.max(1, Number(e.target.value || 1));
                            setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, qty: v } : x)));
                          }}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                          aria-label={T("inputs.qty", "Quantité")}
                        />
                      </td>

                      <td className="p-2 align-middle text-right">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={ln.remisePct}
                          onChange={(e) => {
                            const v = Math.min(100, Math.max(0, Number(e.target.value || 0)));
                            setLines((ls) =>
                              ls.map((x, idx) => (idx === i ? { ...x, remisePct: v } : x))
                            );
                          }}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                          aria-label={T("inputs.remise", "Remise")}
                        />
                      </td>

                      <td className="p-2 align-middle text-right">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={ln.tvaPct}
                          onChange={(e) => {
                            const v = Math.min(100, Math.max(0, Number(e.target.value || 0)));
                            setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, tvaPct: v } : x)));
                          }}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                          aria-label={T("inputs.tva", "TVA")}
                        />
                      </td>

                      <td className="p-2 align-middle text-right font-medium tabular-nums">
                        {lht.toFixed(3)}
                      </td>

                      <td className="p-2 align-middle text-right">
                        <button
                          onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-red-600 hover:bg-red-100"
                          title={T("actions.removeLine", "Supprimer la ligne")}
                          aria-label={T("actions.removeLine", "Supprimer la ligne")}
                        >
                          <FiTrash2 size={16} />
                          {T("actions.remove", "Supprimer")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {lines.map((ln, i) => {
              const pu = getLinePU(ln); // NEW
              const lht = Math.max(
                0,
                pu * Number(ln.qty || 0) * (1 - Number(ln.remisePct || 0) / 100)
              );
              return (
                <div
                  key={`${ln.demandeId}:${i}`}
                  className="rounded-xl border border-slate-200 p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-[#0B1E3A]">
                    <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
                    <span className="font-mono">{ln.ddvNumber || "—"}</span>
                    <button
                      onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                      className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      aria-label={T("actions.removeLine", "Supprimer la ligne")}
                      title={T("actions.removeLine", "Supprimer la ligne")}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs font-semibold text-slate-600">
                      {T("table.article", "Article")}
                    </label>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                      value={ln.articleId}
                      onChange={(e) => {
                        const v = e.target.value;
                        const autoPU = getPU(v);
                        setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, articleId: v, puht: autoPU } : x)));
                      }}
                    >
                      <option value="">{T("selects.articlePlaceholder", "Choisir un article…")}</option>
                      {articles.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.reference} — {a.designation}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        {T("table.puht", "PU HT")}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        value={Number(getLinePU(ln)).toFixed(3)}
                        onChange={(e) => {
                          const raw = Number(e.target.value);
                          const v = Number.isFinite(raw) ? Math.max(0, raw) : 0;
                          setLines((ls) =>
                            ls.map((x, idx) => (idx === i ? { ...x, puht: +v.toFixed(3) } : x))
                          );
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-right shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none tabular-nums"
                        aria-label={T("table.puht", "PU HT")}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        {T("table.qty", "Qté")}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={ln.qty}
                        onChange={(e) => {
                          const v = Math.max(1, Number(e.target.value || 1));
                          setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, qty: v } : x)));
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-right shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                        aria-label={T("inputs.qty", "Quantité")}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        {T("table.remisePct", "Remise %")}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={ln.remisePct}
                        onChange={(e) => {
                          const v = Math.min(100, Math.max(0, Number(e.target.value || 0)));
                          setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, remisePct: v } : x)));
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-right shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                        aria-label={T("inputs.remise", "Remise")}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        {T("table.tvaPct", "TVA %")}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={ln.tvaPct}
                        onChange={(e) => {
                          const v = Math.min(100, Math.max(0, Number(e.target.value || 0)));
                          setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, tvaPct: v } : x)));
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-right shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                        aria-label={T("inputs.tva", "TVA")}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-slate-600">{T("table.totalHT", "Total HT")}</span>
                    <span className="text-base font-semibold text-[#0B1E3A] tabular-nums">
                      {lht.toFixed(3)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totaux */}
          <div className="mt-6 flex flex-col items-end gap-2 md:flex-row md:justify-end md:gap-8 text-right">
            <div>
              <div className="text-sm text-slate-500">{T("totals.ht", "Total HT")}</div>
              <div className="text-lg font-semibold text-[#0B1E3A] tabular-nums">
                {totals.ht.toFixed(3)}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500">{T("totals.ttc", "Total TTC (MFODEC inclus)")}</div>
              <div className="text-lg font-semibold text-[#0B1E3A] tabular-nums">
                {totals.ttc.toFixed(3)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 rounded-b-2xl border-t bg-white/95 backdrop-blur px-6 py-4">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
              aria-label={T("actions.cancel", "Annuler")}
              title={T("actions.cancel", "Annuler")}
            >
              {T("actions.cancel", "Annuler")}
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit || creating}
              className="inline-flex items-center justify-center rounded-xl bg-[#F7C600] px-4 py-2 font-semibold text-[#0B1E3A] shadow hover:brightness-95 disabled:opacity-50"
              aria-label={
                creating
                  ? T("actions.creating", "Création…")
                  : T("actions.createAndSend", "Créer & envoyer")
              }
              title={
                creating
                  ? T("actions.creating", "Création…")
                  : T("actions.createAndSend", "Créer & envoyer")
              }
            >
              {creating
                ? T("actions.creating", "Création…")
                : T("actions.createAndSend", "Créer & envoyer")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
