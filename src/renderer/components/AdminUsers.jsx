import React, { useState, useEffect } from 'react';
import DataTable from './common/DataTable';
import { EditIcon, TrashIcon, SearchIcon } from './common/Icons';

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
        <DataTable
          data={filteredUsers}
          getRowKey={u => u.id}
          tableClassName="users-table data-table"
          columns={[
            { header: 'ID', accessor: 'id' },
            { header: "Nom d'utilisateur", accessor: 'username' },
            { header: 'Rôle', accessor: 'role' },
            { header: 'Login Windows', accessor: 'windows_login', render: u => u.windows_login || '-' },
            {
              header: 'Actions',
              thStyle: { textAlign: 'center' },
              render: u => (
                <>
                  <button
                    onClick={() => startEditing(u)}
                    className="btn-secondary btn-small btn-icon"
                    aria-label="Éditer l'utilisateur"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => deleteUser(u.id)}
                    className="btn-danger btn-small btn-icon"
                    aria-label="Supprimer l'utilisateur"
                  >
                    <TrashIcon />
                  </button>
                </>
              )
            }
          ]}
        />
      )}
    </div>
  );
}
