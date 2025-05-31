import React, { useState, lazy, Suspense, useEffect } from 'react';
// MUI ThemeProvider is kept to leverage its theming system
import { ThemeProvider } from '@mui/material/styles';
import useTheme from './hooks/useTheme';
import DattaButton from './components/common/DattaButton';
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
  const { theme } = useTheme();

  useEffect(() => {
    async function applyWindowBorder() {
      let color = localStorage.getItem('windowBorderColor');
      let width = localStorage.getItem('windowBorderWidth');
      if ((!color || !width) && window.api && window.api.getConfig) {
        const result = await window.api.getConfig();
        if (result.success && result.data && result.data.windowBorder) {
          color = color || result.data.windowBorder.color;
          width = width || String(result.data.windowBorder.width);
        }
      }
      if (color) document.body.style.setProperty('--window-border-color', color);
      if (width) document.body.style.setProperty('--window-border-width', width + 'px');
    }
    applyWindowBorder();
  }, []);

  const handleLogout = () => {
    setUser(null);
    // Optionally, clear any persisted user session data here
  };


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
    <ThemeProvider theme={theme}>
      <Suspense fallback={<LoadingFallback />}>
        <MainContent user={normalizedUser} onLogout={handleLogout} />
      </Suspense>
    </ThemeProvider>
  );
}
