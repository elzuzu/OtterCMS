import React, { useState, useEffect } from 'react';
import { getPermissionsForRole } from '../utils/permissions';
import WindowControls from './common/WindowControls';
// Utilisation des icônes Feather de Datta Able
import DattaAlert from './common/DattaAlert';
import DattaButton from './common/DattaButton';
import { DattaTextField } from './common/DattaForm';

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
      if (window.__TAURI__ && window.__TAURI__.invoke) {
        try {
          setLoading(true);
          const windowsUserResult = await window.__TAURI__.invoke('get_windows_username');
          if (windowsUserResult && windowsUserResult.success) {
            let windowsUsername = windowsUserResult.username;
            if (windowsUsername && windowsUsername.includes('\\')) {
              windowsUsername = windowsUsername.split('\\').pop();
            }
            const loginResult = await window.__TAURI__.invoke('auto_login_with_windows', { username: windowsUsername });
            if (loginResult && loginResult.success) {
              const user = {
                id: loginResult.userId,
                userId: loginResult.userId,
                username: loginResult.username,
                role: loginResult.role,
                permissions: loginResult.permissions || getPermissionsForRole(loginResult.role),
                windows_login: windowsUsername
              };
              setUser(user);
            }
          }
        } catch (err) {
          console.error("Auth.jsx: Erreur lors de l'autologin:", err);
        } finally {
          setLoading(false);
          setIsAutoLoginAttempted(true);
        }
      } else if (window.api) {
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
                  permissions: loginResult.permissions || getPermissionsForRole(loginResult.role),
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
      let res;
      if (window.__TAURI__ && window.__TAURI__.invoke) {
        res = await window.__TAURI__.invoke('auth_login', { request: { username, password } });
      } else if (window.api && window.api.login) {
        res = await window.api.login(username, password);
      } else {
        setError("Erreur: API de connexion non disponible. Le script preload n'est peut-être pas chargé.");
        setLoading(false);
        return;
      }
      if (res && res.success) {
        const user = {
          id: res.userId,
          userId: res.userId,
          username: res.username,
          role: res.role,
          permissions: res.permissions || getPermissionsForRole(res.role),
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
      <div className="auth-main">
        <div className="auth-wrapper v1">
          <div className="auth-form">
            <WindowControls />
            <div className="position-relative my-5">
              <div className="auth-bg">
                <span className="r"></span>
                <span className="r s"></span>
                <span className="r s"></span>
                <span className="r"></span>
              </div>
              <div className="card mb-0">
                <div className="card-body text-center">
                  <h6 className="mb-3">Connexion automatique...</h6>
                  <p>Tente de se connecter avec votre compte Windows...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-main">
      <div className="auth-wrapper v1">
        <div className="auth-form">
          <WindowControls />
          <div className="position-relative my-5">
            <div className="auth-bg">
              <span className="r"></span>
              <span className="r s"></span>
              <span className="r s"></span>
              <span className="r"></span>
            </div>
            <div className="card mb-0">
              <div className="card-header">
                <h4 className="mb-3 f-w-400">Connexion</h4>
              </div>
              <div className="card-body">
            <form onSubmit={handleLogin}>
              <DattaTextField
                id="username"
                label={<><i className="feather icon-user me-1" /> Nom d'utilisateur</>}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Entrez votre nom d'utilisateur"
                required
                autoFocus
              />
              <DattaTextField
                id="password"
                type="password"
                label={<><i className="feather icon-lock me-1" /> Mot de passe</>}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                required
              />
              <DattaButton variant="primary" className="btn-block mb-4" type="submit" loading={loading || isInitializing}>
                Se connecter
              </DattaButton>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <DattaButton variant="secondary" onClick={testIPC} disabled={isInitializing}>
                  Test IPC
                </DattaButton>
                <DattaButton variant="success" onClick={initDatabase} loading={isInitializing || loading}>
                  {isInitializing ? 'Initialisation...' : 'Initialiser la DB'}
                </DattaButton>
              </div>
            </form>
            {error && <DattaAlert type="error">{error}</DattaAlert>}
            {initStatus && (
              <DattaAlert type={initStatus.includes('succès') ? 'success' : 'warning'}>{initStatus}</DattaAlert>
            )}
            <p className="small mt-3 help-text">
              Identifiants par défaut après initialisation :
              <br />Utilisateur : <strong>admin</strong> | Mot de passe : <strong>admin</strong>
              <br />Si vous rencontrez une erreur de base de données ou "User not found", essayez d'abord "Initialiser la DB".
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}
