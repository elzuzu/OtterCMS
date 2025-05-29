import React, { useState, useEffect } from 'react';
import DattaDataTable from './common/DattaDataTable';
import DattaButton from './common/DattaButton';
import { EditIcon, TrashIcon } from './common/Icons';

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
    <div className="card user-management-panel">
      <div className="card-header">
        <h5 className="mb-0">Gestion des utilisateurs</h5>
      </div>
      {message && (
        <div className={message.includes('succès') ? 'success' : 'error'}>
          {message}
        </div>
      )}
      <div className="user-form card">
        <div className="card-header">
          <h3>{editingUser ? 'Modifier un utilisateur' : 'Ajouter un utilisateur'}</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label>Nom d'utilisateur:</label>
            <input
              type="text"
              name="username"
              value={newUser.username}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="mb-3">
            <label>Mot de passe {editingUser ? "(laisser vide pour ne pas changer)" : ""}:</label>
            <input
              type="password"
              name="password"
              value={newUser.password}
              onChange={handleInputChange}
              required={!editingUser}
            />
          </div>
          <div className="mb-3">
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
          <div className="mb-3">
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
            <DattaButton type="submit" variant="primary" disabled={loading}>
              {loading ? 'En cours...' : (editingUser ? 'Mettre à jour' : 'Ajouter')}
            </DattaButton>
            {editingUser && (
              <DattaButton
                type="button"
                onClick={cancelEditing}
                variant="secondary"
              >
                Annuler
              </DattaButton>
            )}
          </div>
        </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
      <div className="actions-bar">
        <div className="search-container" style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Rechercher un utilisateur..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="search-input"
            style={{ paddingLeft: 'var(--spacing-3)' }}
          />
        </div>
      </div>

      <h3>Liste des utilisateurs ({filteredUsers.length})</h3>
      {loading && <div className="loading">Chargement...</div>}
      {!loading && filteredUsers.length === 0 ? (
        <div className="no-data-message">Aucun utilisateur trouvé.</div>
      ) : (
        <DattaDataTable
          data={filteredUsers}
          getRowKey={u => u.id}
          columns={[
            { header: 'ID', accessor: 'id' },
            { header: "Nom d'utilisateur", accessor: 'username' },
            { header: 'Rôle', accessor: 'role' },
            { header: 'Login Windows', accessor: 'windows_login', render: u => u.windows_login || '-' },
            {
              header: 'Actions',
              thStyle: { textAlign: 'center', width: '80px' },
              tdStyle: { textAlign: 'center', width: '80px' },
              render: u => (
                <>
                  <DattaButton
                    onClick={() => startEditing(u)}
                    variant="secondary"
                    size="sm"
                    className="btn"
                    aria-label="Éditer l'utilisateur"
                  >
                    <EditIcon />
                  </DattaButton>
                  <DattaButton
                    onClick={() => deleteUser(u.id)}
                    variant="danger"
                    size="sm"
                    className="btn"
                    aria-label="Supprimer l'utilisateur"
                  >
                    <TrashIcon />
                  </DattaButton>
                </>
              )
            }
          ]}
        />
      )}
        </div>
      </div>
    </div>
  );
}
