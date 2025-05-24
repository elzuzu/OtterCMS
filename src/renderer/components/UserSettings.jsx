import React, { useState, useEffect } from 'react';

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
    <div className="user-settings">
      <h2>Paramètres utilisateur</h2>
      <div className="ui-card">
        <div className="ui-card-body">
          <div className="form-group">
            <label>Login Windows (nom d'utilisateur uniquement):</label>
            <div className="input-action">
              <input
                placeholder="Ex: jean (sans domaine)"
                value={loginWin}
                onChange={e => setLoginWin(e.target.value)}
              />
              <button onClick={associerLogin} disabled={loading}>
                {loading ? 'Association...' : 'Associer'}
              </button>
            </div>
            {message && (
              <div className={message.includes('succès') ? 'success' : 'error'}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="ui-card">
        <div className="ui-card-header">
          <h3>Informations utilisateur</h3>
        </div>
        <div className="ui-card-body user-info">
          <div>Nom d'utilisateur: <strong>{user.username}</strong></div>
          <div>Rôle actuel: <strong>{user.role}</strong></div>
          <div>ID utilisateur: <strong>{user.id || user.userId}</strong></div>
        </div>
      </div>
    </div>
  );
}