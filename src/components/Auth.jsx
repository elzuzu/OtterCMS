import React, { useState, useEffect } from 'react';

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
        <div style={{ padding: '40px', borderRadius: '8px', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <h2>Connexion automatique...</h2>
          <p>Tentative de connexion avec votre compte Windows en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <form
        className="auth-form"
        onSubmit={handleLogin}
        style={{ padding: '40px', borderRadius: '8px', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' }}
      >
        <h2 style={{ marginBottom: '24px', color: '#333' }}>Connexion</h2>
        <input
          style={{ width: '100%', padding: '12px', marginBottom: '16px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
          placeholder="Nom d'utilisateur"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          autoFocus
        />
        <input
          style={{ width: '100%', padding: '12px', marginBottom: '24px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading || isInitializing}
          style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', opacity: (loading || isInitializing) ? 0.7 : 1 }}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button
            type="button"
            onClick={testIPC}
            disabled={isInitializing}
            style={{ flex: '1', padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: isInitializing ? 0.7 : 1 }}
          >
            Test IPC
          </button>
          <button
            type="button"
            onClick={initDatabase}
            disabled={isInitializing || loading}
            style={{ flex: '1', padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: (isInitializing || loading) ? 0.7 : 1 }}
          >
            {isInitializing ? 'Initialisation...' : 'Initialiser la DB'}
          </button>
        </div>
        {error && <div className="error" style={{ color: 'red', marginTop: '15px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{error}</div>}
        {initStatus &&
          <div
            className={initStatus.includes('succès') ? "success" : "warning"}
            style={{ color: initStatus.includes('succès') ? 'green' : 'orange', marginTop: '15px', whiteSpace: 'pre-line', padding: '10px', border: `1px solid ${initStatus.includes('succès') ? 'green' : 'orange'}`, borderRadius: '4px', background: initStatus.includes('succès') ? '#e6ffed' : '#fff8e1' }}
          >
            {initStatus}
          </div>
        }
        <div style={{marginTop: '30px', fontSize: '12px', color: '#666'}}>
          <p>Identifiants par défaut après initialisation :</p>
          <p>Utilisateur: <strong>admin</strong> | Mot de passe: <strong>admin</strong></p>
          <p style={{marginTop: '10px'}}>Si vous rencontrez une erreur de base de données ou "User not found", essayez d'abord "Initialiser la DB".</p>
        </div>
      </form>
    </div>
  );
}