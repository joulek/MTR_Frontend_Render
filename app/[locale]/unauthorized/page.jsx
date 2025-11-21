export default function UnauthorizedPage() {
  return (
    <div style={{ textAlign: 'center', padding: '100px' }}>
      <h1>⛔ Accès refusé</h1>
      <p>Vous n'avez pas les autorisations nécessaires.</p>
      <a href="/" style={{ color: 'blue' }}>Retour à l'accueil</a>
    </div>
  );
}

// 🚨 FORCE RENDU SERVEUR POUR ÉVITER FLASH
export const dynamic = 'force-static';
