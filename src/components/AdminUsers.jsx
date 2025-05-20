import React, { useState, useEffect } from 'react';
import { hasPermission } from '../utils/permissions';

export default function AdminUsers({ user }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user',
    windows_login: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  if (!hasPermission(user, 'manage_users')) {
    return <div>Accès refusé.</div>;
  }

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  useEffect(() => {
    if (roles.length > 0 && !editingUser) {
      setNewUser(prev => ({ ...prev, role: roles[0].name }));
    }
  }, [roles, editingUser]);

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

  const loadRoles = async () => {
    try {
      const result = await window.api.getRoles();
      if (result.success) {
        setRoles(result.data);
      }
    } catch (err) {
      console.error('Erreur chargement roles:', err);
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

  return (
    <div>
      <h2>Gestion des utilisateurs</h2>
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
            <select name="role" value={newUser.role} onChange={handleInputChange}>
              {roles.map(r => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
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
      <h3>Liste des utilisateurs</h3>
      {loading && <div className="loading">Chargement...</div>}
      {!loading && users.length === 0 ? (
        <div className="no-data-message">Aucun utilisateur trouvé.</div>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom d'utilisateur</th>
              <th>Rôle</th>
              <th>Login Windows</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>{user.windows_login || '-'}</td>
                <td>
                  <button onClick={() => startEditing(user)}>Éditer</button>
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="delete-button"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}