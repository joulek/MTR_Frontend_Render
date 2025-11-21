"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

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

  useEffect(() => {
    // Si pas de token/uid → montrer message direct
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
      setTimeout(() => router.push("/fr/login"), 2000); // redirection
    } catch (err) {
      setError("Le lien n’est plus valide ou déjà utilisé.");
    } finally {
      setLoading(false);
    }
  }

  if (error && !uid) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-600 text-xl">{error}</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-green-600 text-2xl">✔ Mot de passe défini avec succès</h1>
        <p>Redirection vers la page de connexion...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border p-6 shadow">
        <h1 className="text-2xl font-bold text-center">Définir votre mot de passe</h1>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            className="w-full rounded border px-3 py-2"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirmation"
            className="w-full rounded border px-3 py-2"
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[#F5B301] px-4 py-2 font-semibold text-[#0B2239] hover:brightness-95"
          >
            {loading ? "En cours..." : "Valider"}
          </button>
        </form>
      </div>
    </div>
  );
}
