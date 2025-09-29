// app/[locale]/client/layout.client.jsx
"use client";

import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { useRouter } from "next/navigation";

const API = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://mtr-backend-render.onrender.com"
).replace(/\/$/, "") + "/api";

export default function ClientLayoutShell({ children, locale }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const response = await fetch(`${API}/users/me`, {
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
          },
        });

        if (!mounted) return;

        if (!response.ok) {
          // Non authentifié
          setIsAuthenticated(false);
          router.replace(`/${locale}/login`);
          return;
        }

        const userData = await response.json();

        // Vérifier le rôle client
        if (userData?.role !== "client") {
          setIsAuthenticated(false);
          router.replace(`/${locale}/login`);
          return;
        }

        // Authentifié avec succès
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Erreur vérification auth:", error);
        if (mounted) {
          setIsAuthenticated(false);
          router.replace(`/${locale}/login`);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    // Empêcher la navigation arrière après déconnexion
    const preventBackNavigation = () => {
      window.history.pushState(null, "", window.location.href);
    };

    // Initialiser la protection
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", preventBackNavigation);

    return () => {
      mounted = false;
      window.removeEventListener("popstate", preventBackNavigation);
    };
  }, [router, locale]);

  // Fonction de déconnexion sécurisée
  const handleLogout = async () => {
    try {
      // 1) Appeler l'API de logout front
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      // 2) Appeler l'API backend
      try {
        await fetch(`${API}/auth/logout`, {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
      } catch (err) {
        console.error("Erreur logout backend:", err);
      }

      // 3) Nettoyer localStorage
      try {
        localStorage.removeItem("mtr_role");
        localStorage.removeItem("userRole");
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");

        // Nettoyer tous les items liés à l'auth
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith("mtr_") ||
            key.includes("auth") ||
            key.includes("token")
          ) {
            localStorage.removeItem(key);
          }
        });
      } catch (err) {
        console.error("Erreur localStorage:", err);
      }

      // 4) Nettoyer sessionStorage
      try {
        sessionStorage.clear();
      } catch (err) {
        console.error("Erreur sessionStorage:", err);
      }

      // 5) Réinitialiser l'état
      setIsAuthenticated(false);

      // 6) Redirection FORCÉE vers login (sans historique)
      const loginUrl = `/${locale}/login`;
      window.history.replaceState(null, "", loginUrl);
      window.location.replace(loginUrl);
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      // Forcer la redirection même en cas d'erreur
      const loginUrl = `/${locale}/login`;
      window.location.replace(loginUrl);
    }
  };

  // Afficher un loader pendant la vérification
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#F5B301] border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Vérification...</p>
        </div>
      </div>
    );
  }

  // Ne rien afficher si pas authentifié (redirection en cours)
  if (!isAuthenticated) {
    return null;
  }

  // Afficher le layout seulement si authentifié
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SiteHeader mode="client" onLogout={handleLogout} />
      <main className="flex-1">{children}</main>
    </div>
  );
}