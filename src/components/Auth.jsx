import React, { useState, useEffect } from 'react';
import { getPermissionsForRole } from '../utils/permissions';

export default function Auth({ setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initStatus, setInitStatus] = useState('');
  const [isAutoLoginAttempted, setIsAutoLoginAttempted] = useState(false);

  useEffect(() => {
    const checkApiAndAutoLogin = async () => {
      if (window.api) {
        try {
          if (window.api.getWindowsUsername && window.api.autoLoginWithWindows) {
            setLoading(true);
            const windowsUserResult = await window.api.getWindowsUsername();
            if (windowsUserResult && windowsUserResult.success) {
              let windowsUsername = windowsUserResult.username;
              if (windowsUsername && windowsUsername.includes('\\')) {
                windowsUsername = windowsUsername.split('\\').pop();
              }
              const loginResult = await window.api.autoLoginWithWindows(windowsUsername);
              if (loginResult && loginResult.success) {
                const user = {
                  id: loginResult.userId,
                  userId: loginResult.userId,
                  username: loginResult.username,
                  role: loginResult.role,
                  permissions: getPermissionsForRole(loginResult.role),
                  windows_login: windowsUsername
                };
                setUser(user);
              }
            }
          }
        } catch (err) {
          console.error("Auth.jsx: Erreur lors de l'autologin:", err);
        } finally {
          setLoading(false);
          setIsAutoLoginAttempted(true);
        }
      } else {
        setError("Erreur critique : Le pont de communication (preload API) n'est pas chargé. L'application ne peut pas fonctionner.");
        setIsAutoLoginAttempted(true);
      }
    };
    checkApiAndAutoLogin();
  }, [setUser]);

  const testIPC = async () => {
    setError('');
    setInitStatus('');
    try {
      if (window.api && window.api.testConnection) {
        const result = await window.api.testConnection();
        if (result && result.success) {
          setError(`Test IPC réussi: ${result.message}`);
        } else {
          setError(`Test IPC échoué: ${result ? result.message || result.error : 'Réponse invalide'}`);
        }
      } else {
        setError("Erreur: window.api.testConnection non trouvée. Le script preload n'est peut-être pas correctement chargé ou l'API n'est pas exposée.");
      }
    } catch (err) {
      setError(`Erreur lors du test IPC: ${err.message}`);
    }
  };

  const initDatabase = async () => {
    setIsInitializing(true);
    setInitStatus('Initialisation de la base de données en cours...');
    setError('');
    try {
      if (!window.api || !window.api.initDatabase) {
        setInitStatus("Erreur critique: La fonction d'initialisation de la base de données n'est pas disponible.");
        setIsInitializing(false);
        return;
      }
      const result = await window.api.initDatabase();
      if (result.success) {
        setInitStatus('Base de données initialisée avec succès! Vous pouvez maintenant vous connecter avec:\nIdentifiant: admin\nMot de passe: admin');
      } else {
        setInitStatus(`Échec de l'initialisation: ${result.error || 'Erreur inconnue'}`);
      }
    } catch (err) {
      setInitStatus(`Erreur lors de l'initialisation: ${err.message}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInitStatus('');
    try {
      if (!window.api || !window.api.login) {
        setError("Erreur: API de connexion non disponible. Le script preload n'est peut-être pas chargé.");
        setLoading(false);
        return;
      }
      const res = await window.api.login(username, password);
      if (res && res.success) {
        const user = {
          id: res.userId,
          userId: res.userId,
          username: res.username,
          role: res.role,
          permissions: getPermissionsForRole(res.role),
          windows_login: res.windows_login
        };
        setUser(user);
      } else {
        setError(res?.error || 'Identifiant ou mot de passe incorrect. Vérifiez également que la base de données est initialisée.');
      }
    } catch (err) {
      setError(`Erreur de connexion: ${err.message}. Assurez-vous que l'application est correctement configurée.`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !isAutoLoginAttempted) {
    return (
      <div className="auth-container">
        <div className="auth-form">
          <h2>Connexion automatique...</h2>
          <p>Tentative de connexion avec votre compte Windows en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleLogin}>
        <h2>Connexion</h2>
        <input
          placeholder="Nom d'utilisateur"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          autoFocus
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary" disabled={loading || isInitializing}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
        <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button type="button" className="btn-secondary" onClick={testIPC} disabled={isInitializing}>
            Test IPC
          </button>
          <button type="button" className="btn-success" onClick={initDatabase} disabled={isInitializing || loading}>
            {isInitializing ? 'Initialisation...' : 'Initialiser la DB'}
          </button>
        </div>
        {error && <div className="error" style={{ marginTop: '15px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{error}</div>}
        {initStatus && (
          <div className={initStatus.includes('succès') ? 'success' : 'warning'} style={{ marginTop: '15px', whiteSpace: 'pre-line' }}>
            {initStatus}
          </div>
        )}
        <div style={{marginTop: '30px', fontSize: '12px', color: '#666'}}>
          <p>Identifiants par défaut après initialisation :</p>
          <p>Utilisateur: <strong>admin</strong> | Mot de passe: <strong>admin</strong></p>
          <p style={{marginTop: '10px'}}>Si vous rencontrez une erreur de base de données ou "User not found", essayez d'abord "Initialiser la DB".</p>
        </div>
      </form>
    </div>
  );
}