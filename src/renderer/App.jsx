import React, { useState, lazy, Suspense, useEffect } from 'react';
import DattaButton from './components/common/DattaButton';
import borderTemplateService from './services/borderTemplateService';
const Auth = lazy(() => import('./components/Auth'));
const MainContent = lazy(() => import('./components/MainContent'));

function LoadingFallback() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{minHeight: '200px'}}>
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-2">Chargement...</p>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await borderTemplateService.initialize();
        setIsInitialized(true);
      } catch (e) {
        console.warn('Erreur initialisation service de bordure:', e);
        setInitError(e.message);
        setIsInitialized(true);
      }
    };
    initializeApp();
    return () => {
      try { borderTemplateService.destroy(); } catch (e) { console.error('cleanup', e); }
    };
  }, []);

  const handleLogout = () => {
    setUser(null);
    // Optionally, clear any persisted user session data here
  };


  if (!isInitialized) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p>Initialisation de l'application...</p>
          <small className="text-muted">Configuration des services en cours...</small>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="alert alert-warning mb-3">
            <i className="feather icon-alert-triangle mb-2" style={{ fontSize: '2rem' }}></i>
            <h5>Initialisation incomplète</h5>
            <p>L'application fonctionne en mode dégradé :</p>
            <small>{initError}</small>
          </div>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Réessayer</button>
        </div>
      </div>
    );
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
          <DattaButton onClick={handleLogout}>Retour à la connexion</DattaButton>
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
