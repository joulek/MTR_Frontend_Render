"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export default function SetPasswordClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const uid = sp?.get("uid");
  const token = sp?.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  // Vérification du lien
  useEffect(() => {
    if (!uid || !token) {
      setError("Le lien est invalide ou expiré.");
    }
  }, [uid, token]);

 async function handleSubmit(e) {
  e.preventDefault();
  setError("");

  if (!password || !confirm) return setError("Veuillez remplir les champs.");
  if (password !== confirm) return setError("Les mots de passe ne correspondent pas.");
  if (password.length < 6) return setError("Le mot de passe doit contenir au moins 6 caractères.");

  try {
    setLoading(true);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")}/api/users/set-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, password }),
      }
    );

    if (!res.ok) throw new Error(`Erreur ${res.status}`);

    setSuccess(true);

    // 🔥 Correction de la redirection
    const currentPath = window.location.pathname;
    const localeMatch = currentPath.match(/^\/(fr|en)(?:\/|$)/);
    const locale = localeMatch ? localeMatch[1] : null;

    // 🟩 FORCER une redirection absolue et propre (sans /client)
    const redirectPath = locale ? `/${locale}` : "/";

    // 🚀 Redirection immédiate (replace = empêche de revenir sur set-password)
    router.replace(redirectPath);
  } catch (err) {
    setError("Le lien n’est plus valide ou déjà utilisé.");
  } finally {
    setLoading(false);
  }
}


  return (
    <div className="relative min-h-screen bg-slate-50 flex items-center justify-center px-4">
      {/* Radial Effects */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#F5B301]/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#0B2239]/10 blur-3xl" />
      </div>

      <div className="w-full max-w-xl rounded-3xl bg-white/90 p-8 shadow-xl ring-1 ring-slate-200 backdrop-blur">
        <h1 className="text-center text-2xl md:text-3xl font-extrabold text-[#0B2239]">
          Définir un mot de passe
        </h1>
        <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-[#F5B301] to-transparent" />

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="mt-4 text-center text-green-700 font-semibold">
            ✔ Mot de passe défini avec succès
            <p className="text-sm">Redirection vers la page de connexion...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Nouveau mot de passe */}
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                required
                className="peer w-full rounded-2xl border border-slate-300 bg-transparent px-4 py-4 pr-12 outline-none ring-[#F5B301] focus:border-[#F5B301] focus:ring-2"
              />
              <label className="absolute left-4 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-slate-500 transition-all peer-focus:-top-2 peer-focus:text-xs peer-[&:not(:placeholder-shown)]:-top-2">
                Nouveau mot de passe
              </label>
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-[#0B2239] hover:bg-slate-100"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Confirmation */}
            <div className="relative">
              <input
                type={showPw2 ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder=" "
                required
                className="peer w-full rounded-2xl border border-slate-300 bg-transparent px-4 py-4 pr-12 outline-none ring-[#F5B301] focus:border-[#F5B301] focus:ring-2"
              />
              <label className="absolute left-4 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-slate-500 transition-all peer-focus:-top-2 peer-focus:text-xs peer-[&:not(:placeholder-shown)]:-top-2">
                Confirmer le mot de passe
              </label>
              <button
                type="button"
                onClick={() => setShowPw2((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-[#0B2239] hover:bg-slate-100"
              >
                {showPw2 ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full rounded-full bg-[#F5B301] px-6 py-3 font-semibold text-[#0B2239] shadow ring-1 ring-black/5 hover:brightness-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? "Validation…" : "Valider"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
