import React, { useState, useEffect, lazy, Suspense } from 'react';
const Auth = lazy(() => import('./components/Auth'));
const MainContent = lazy(() => import('./components/MainContent'));

function LoadingFallback() {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Chargement...</p>
    </div>
  );
}
import './styles/app.css'; // Ensure this is imported for global styles

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingTheme, setLoadingTheme] = useState(true);

  useEffect(() => {
    async function loadThemeAndUser() {
      // Load theme from localStorage
      const saved = localStorage.getItem('themeColor') || 'blue';
      ['blue', 'green', 'purple', 'orange', 'red'].forEach(c => document.body.classList.remove('theme-' + c));
      document.body.classList.add('theme-' + saved);
      setLoadingTheme(false);

      // Potentially load persisted user session here if you implement that
      // For now, it relies on Auth component to set user
    }
    loadThemeAndUser();
  }, []);

  const handleLogout = () => {
    setUser(null);
    // Optionally, clear any persisted user session data here
  };

  if (loadingTheme) {
    // Optional: a very simple loading state to prevent FOUC for theme
    return <div>Chargement...</div>;
  }

  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Auth setUser={setUser} />
      </Suspense>
    );
  }

  // Basic validation for user object after login
  if (!user.username || !user.role || user.userId === undefined) {
    console.error("Invalid user object:", user);
    return (
      <div className="auth-container">
        <div className="auth-form" style={{ textAlign: 'center' }}>
          <h2>Erreur d'authentification</h2>
          <p>Les informations utilisateur sont corrompues ou incomplètes. Veuillez vous reconnecter.</p>
          <button onClick={handleLogout} className="btn-primary">Retour à la connexion</button>
        </div>
      </div>
    );
  }
  
  // Normalize userId just in case it comes as 'id' from some auth paths
  const normalizedUser = {
    ...user,
    id: user.id || user.userId, // Ensure 'id' is present if needed by components
    userId: user.userId || user.id // Ensure 'userId' is present
  };

  return (
    <Suspense fallback={<LoadingFallback />}>
      <MainContent user={normalizedUser} onLogout={handleLogout} />
    </Suspense>
  );
}
