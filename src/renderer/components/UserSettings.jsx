import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import DattaAlert from './common/DattaAlert';
import DattaPageTitle from './common/DattaPageTitle';

export default function UserSettings({ user }) {
  const [loginWin, setLoginWin] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentLogin = user.windows_login || '';
    if (currentLogin.includes('\\')) {
      setLoginWin(currentLogin.split('\\').pop());
    } else {
      setLoginWin(currentLogin);
    }
  }, [user]);

  const associerLogin = async () => {
    try {
      setLoading(true);
      let cleanLogin = loginWin;
      if (cleanLogin.includes('\\')) {
        cleanLogin = cleanLogin.split('\\').pop();
      }
      const res = await window.api.associerLoginWindows(user.id || user.userId, cleanLogin);
      if (res.success) {
        setMessage('Login Windows associé avec succès !');
      } else {
        setMessage('Erreur lors de l\'association: ' + (res.error || 'Problème inconnu'));
      }
    } catch (error) {
      setMessage(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="user-settings">
      <DattaPageTitle title="Paramètres utilisateur" />
      <Box className="ui-card" sx={{ p: 2 }}>
        <div className="form-group">
          <label>Login Windows (nom d'utilisateur uniquement):</label>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
            <TextField
              placeholder="Ex: jean (sans domaine)"
              value={loginWin}
              onChange={e => setLoginWin(e.target.value)}
              size="small"
            />
            <Button variant="contained" onClick={associerLogin} disabled={loading}>
              {loading ? 'Association...' : 'Associer'}
            </Button>
          </Box>
          {message && <DattaAlert type={message.includes('succès') ? 'success' : 'error'}>{message}</DattaAlert>}
        </div>
      </Box>
      <Box className="ui-card" sx={{ mt: 3 }}>
        <div className="ui-card-header">
          <Typography variant="h6" className="section-title">Informations utilisateur</Typography>
        </div>
        <div className="ui-card-body user-info">
          <div>Nom d'utilisateur: <strong>{user.username}</strong></div>
          <div>Rôle actuel: <strong>{user.role}</strong></div>
          <div>ID utilisateur: <strong>{user.id || user.userId}</strong></div>
        </div>
      </Box>
    </Box>
  );
}