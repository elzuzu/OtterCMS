import React, { useState, useEffect } from 'react';
import { getPermissionsForRole } from '../utils/permissions';
import WindowControls from './common/WindowControls';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import DattaAlert from './common/DattaAlert';
import DattaPageTitle from './common/DattaPageTitle';

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
      <Box className="auth-container">
        <Box className="auth-form" sx={{ p: 3 }}>
          <Typography variant="h6">Connexion automatique...</Typography>
          <Typography variant="body2">Tente de se connecter avec votre compte Windows...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="auth-container">
      <WindowControls />
      <Box
        component="form"
        className="auth-form"
        onSubmit={handleLogin}
        sx={{ maxWidth: 360, mx: 'auto', mt: 4, p: 3, backgroundColor: 'var(--current-surface-color)', borderRadius: 'var(--border-radius-md)' }}
      >
        <DattaPageTitle title="Connexion" />
        <TextField
          id="username"
          label="Nom d'utilisateur"
          value={username}
          onChange={e => setUsername(e.target.value)}
          margin="normal"
          fullWidth
          size="small"
          required
          autoFocus
        />
        <TextField
          id="password"
          label="Mot de passe"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          margin="normal"
          fullWidth
          size="small"
          required
        />
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button type="submit" variant="contained" disabled={loading || isInitializing}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
          <Button variant="outlined" onClick={testIPC} disabled={isInitializing}>Test IPC</Button>
          <Button variant="contained" color="success" onClick={initDatabase} disabled={isInitializing || loading}>
            {isInitializing ? 'Initialisation...' : 'Initialiser la DB'}
          </Button>
        </Box>
        {error && <DattaAlert type="error">{error}</DattaAlert>}
        {initStatus && (
          <DattaAlert type={initStatus.includes('succès') ? 'success' : 'warning'}>{initStatus}</DattaAlert>
        )}
        <Typography variant="body2" sx={{ mt: 2 }} className="help-text">
          Identifiants par défaut après initialisation :
          <br />Utilisateur : <strong>admin</strong> | Mot de passe : <strong>admin</strong>
          <br />Si vous rencontrez une erreur de base de données ou "User not found", essayez d'abord "Initialiser la DB".
        </Typography>
      </Box>
    </Box>
  );
}