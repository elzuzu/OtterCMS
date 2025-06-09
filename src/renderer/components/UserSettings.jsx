import React, { useState, useEffect } from 'react';
import { DattaTextField } from './common/DattaForm';
import DattaAlert from './common/DattaAlert';
import DattaPageTitle from './common/DattaPageTitle';
import DattaButton from './common/DattaButton';
import DattaCard from './common/DattaCard';

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
    <div className="pc-content user-settings">
      <DattaPageTitle title="Paramètres utilisateur" />
      <DattaCard style={{ padding: 'var(--spacing-2)' }}>
        <div className="mb-3">
          <label>Login Windows (nom d'utilisateur uniquement):</label>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', marginTop: '0.25rem' }}>
            <DattaTextField
              placeholder="Exemple : jean (sans le domaine)"
              value={loginWin}
              onChange={e => setLoginWin(e.target.value)}
              style={{ marginBottom: 0 }}
            />
            <DattaButton variant="primary" onClick={associerLogin} disabled={loading}>
              {loading ? 'Association...' : 'Associer'}
            </DattaButton>
          </div>
          {message && <DattaAlert type={message.includes('succès') ? 'success' : 'error'}>{message}</DattaAlert>}
        </div>
      </DattaCard>
      <DattaCard style={{ marginTop: 'var(--spacing-3)' }} title="Informations utilisateur">
        <div className="user-info">
          <div>Nom d'utilisateur: <strong>{user.username}</strong></div>
          <div>Rôle actuel: <strong>{user.role}</strong></div>
          <div>ID utilisateur: <strong>{user.id || user.userId}</strong></div>
        </div>
      </DattaCard>
    </div>
  );
}