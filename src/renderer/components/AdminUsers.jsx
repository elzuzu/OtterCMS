import React, { useState, useEffect } from 'react';

// Icônes simples pour les actions
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
    <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm-4.208 6.086-7.071 7.072.707.707 7.072-7.071-3.182-3.182z"/>
    <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
  </svg>
);

const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      position: 'absolute',
      left: 'var(--spacing-3)',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--text-color-placeholder)'
    }}
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user',
    windows_login: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await window.api.getUsers();
      if (result.success) {
        setUsers(result.data);
      } else {
        setMessage(`Erreur: ${result.error || 'Problème lors du chargement des utilisateurs'}`);
      }
    } catch (err) {
      setMessage(`Erreur critique: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser({
      ...newUser,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage('');
      if (!newUser.username || (!newUser.password && !editingUser) ) {
        setMessage('Le nom d\'utilisateur et le mot de passe sont obligatoires pour un nouvel utilisateur.');
        setLoading(false);
        return;
      }
      let windowsLogin = newUser.windows_login;
      if (windowsLogin && windowsLogin.includes('\\')) {
        windowsLogin = windowsLogin.split('\\').pop();
      }
      const userData = {
        ...newUser,
        windows_login: windowsLogin
      };
      let result;
      if (editingUser) {
        result = await window.api.updateUser({
          ...userData,
          id: editingUser.id
        });
      } else {
        result = await window.api.createUser(userData);
      }
      if (result.success) {
        setMessage(editingUser ? 'Utilisateur mis à jour avec succès!' : 'Utilisateur créé avec succès!');
        setNewUser({
          username: '',
          password: '',
          role: 'user',
          windows_login: ''
        });
        setEditingUser(null);
        loadUsers();
      } else {
        setMessage(`Erreur: ${result.error || 'Problème inconnu'}`);
      }
    } catch (err) {
      setMessage(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (user) => {
    setEditingUser(user);
    setNewUser({
      username: user.username,
      password: '',
      role: user.role,
      windows_login: user.windows_login || ''
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setNewUser({
      username: '',
      password: '',
      role: 'user',
      windows_login: ''
    });
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) {
      return;
    }
    try {
      setLoading(true);
      const result = await window.api.deleteUser(userId);
      if (result.success) {
        setMessage('Utilisateur supprimé avec succès!');
        loadUsers();
      } else {
        setMessage(`Erreur: ${result.error || 'Problème inconnu'}`);
      }
    } catch (err) {
      setMessage(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(filter.toLowerCase()) ||
    (u.windows_login || '').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="admin-panel user-management-panel">
      <h2 className="panel-title">Gestion des utilisateurs</h2>
      {message && (
        <div className={message.includes('succès') ? 'success' : 'error'}>
          {message}
        </div>
      )}
      <div className="user-form">
        <h3>{editingUser ? 'Modifier un utilisateur' : 'Ajouter un utilisateur'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom d'utilisateur:</label>
            <input
              type="text"
              name="username"
              value={newUser.username}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Mot de passe {editingUser ? "(laisser vide pour ne pas changer)" : ""}:</label>
            <input
              type="password"
              name="password"
              value={newUser.password}
              onChange={handleInputChange}
              required={!editingUser}
            />
          </div>
          <div className="form-group">
            <label>Rôle:</label>
            <select
              name="role"
              value={newUser.role}
              onChange={handleInputChange}
            >
              <option value="user">Utilisateur</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="form-group">
            <label>Login Windows (sans domaine):</label>
            <input
              type="text"
              name="windows_login"
              value={newUser.windows_login}
              onChange={handleInputChange}
              placeholder="Nom d'utilisateur Windows sans domaine"
            />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'En cours...' : (editingUser ? 'Mettre à jour' : 'Ajouter')}
            </button>
            {editingUser && (
              <button
                type="button"
                onClick={cancelEditing}
                className="cancel-button"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="actions-bar">
        <div className="search-container" style={{ position: 'relative' }}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="search-input"
            style={{ paddingLeft: 'calc(var(--spacing-3) + 16px + var(--spacing-2))' }}
          />
        </div>
      </div>

      <h3>Liste des utilisateurs ({filteredUsers.length})</h3>
      {loading && <div className="loading">Chargement...</div>}
      {!loading && filteredUsers.length === 0 ? (
        <div className="no-data-message">Aucun utilisateur trouvé.</div>
      ) : (
        <div className="table-responsive">
        <table className="users-table data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom d'utilisateur</th>
              <th>Rôle</th>
              <th>Login Windows</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>{user.windows_login || '-'}</td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => startEditing(user)}
                    className="btn-secondary btn-small btn-icon"
                    aria-label="Éditer l'utilisateur"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="btn-danger btn-small btn-icon"
                    aria-label="Supprimer l'utilisateur"
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
