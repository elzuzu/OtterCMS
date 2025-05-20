import React, { useState } from 'react';
import Auth from './components/Auth';
import MainContent from './components/MainContent';
import './styles/App.css';

export default function App() {
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Auth setUser={setUser} />;
  }

  if (!user.username || !user.role) {
    return (
      <div className="auth-container">
        <div className="auth-form" style={{ textAlign: 'center' }}>
          <h2>Erreur d'authentification</h2>
          <p>Les informations utilisateur sont invalides. Veuillez vous reconnecter.</p>
          <button onClick={handleLogout} className="btn-primary">Retour à la connexion</button>
        </div>
      </div>
    );
  }

  const normalizedUser = {
    ...user,
    id: user.id || user.userId,
    userId: user.userId || user.id
  };

  return (
    <MainContent user={normalizedUser} onLogout={handleLogout} />
  );
}
