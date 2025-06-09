import React, { useState, useEffect, useCallback } from 'react';
import DattaNetworkDataTable from './common/DattaNetworkDataTable';
import DattaButton from './common/DattaButton';
import DattaCard from './common/DattaCard';
import DattaAlert from './common/DattaAlert';
import { DattaTextField, DattaSelect } from './common/DattaForm';
import { EditIcon, TrashIcon } from './common/Icons';
import { useSync } from '../hooks/useSync';

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
  const [error, setError] = useState(null);

  const { syncState, performSync } = useSync();

  const loadUsers = useCallback(async () => {
    try {
      const result = await window.api.getUsers();
      if (result.success) {
        setUsers(result.data);
        setError(null);
        // Synchroniser les données après le chargement
        await performSync();
      } else {
        const errorMsg = result.error || 'Problème lors du chargement des utilisateurs';
        setError(errorMsg);
        setMessage(`Erreur: ${errorMsg}`);
      }
    } catch (err) {
      setError(err.message);
      setMessage(`Erreur critique: ${err.message}`);
    }
  }, [performSync]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
    <>
      {message && (
        <DattaAlert
          type={message.includes('succès') ? 'success' : 'danger'}
          className="mb-3"
        >
          {message}
        </DattaAlert>
      )}
      <div className="row">
        <div className="col-xl-4 col-md-12">
          <DattaCard title={editingUser ? 'Modifier un utilisateur' : 'Ajouter un utilisateur'}>
            <form onSubmit={handleSubmit}>
              <DattaTextField
                label="Nom d'utilisateur"
                name="username"
                value={newUser.username}
                onChange={handleInputChange}
                required
              />
              <DattaTextField
                type="password"
                label={`Mot de passe ${editingUser ? '(laisser vide pour ne pas changer)' : ''}`}
                name="password"
                value={newUser.password}
                onChange={handleInputChange}
                required={!editingUser}
              />
              <DattaSelect
                label="Rôle"
                name="role"
                value={newUser.role}
                onChange={handleInputChange}
                options={[
                  { value: 'user', label: 'Utilisateur' },
                  { value: 'manager', label: 'Manager' },
                  { value: 'admin', label: 'Administrateur' },
                ]}
              />
              <DattaTextField
                label="Login Windows (sans domaine)"
                name="windows_login"
                value={newUser.windows_login}
                onChange={handleInputChange}
                placeholder="Nom d'utilisateur Windows sans domaine"
              />
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
          </DattaCard>
        </div>
        <div className="col-xl-8 col-md-12">
          <DattaCard>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <DattaTextField
                  type="search"
                  placeholder="Rechercher un utilisateur..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="form-control-sm"
                />
              </div>

              <DattaNetworkDataTable
                data={filteredUsers}
                columns={[
                  {
                    title: 'Nom d\'utilisateur',
                    dataIndex: 'username',
                    key: 'username',
                    sorter: true
                  },
                  {
                    title: 'Rôle',
                    dataIndex: 'role',
                    key: 'role',
                    sorter: true,
                    render: (role) => {
                      const roles = {
                        'user': 'Utilisateur',
                        'manager': 'Manager',
                        'admin': 'Administrateur'
                      };
                      return roles[role] || role;
                    }
                  },
                  {
                    title: 'Login Windows',
                    dataIndex: 'windows_login',
                    key: 'windows_login',
                    sorter: true
                  },
                  {
                    title: 'Actions',
                    key: 'actions',
                    render: (_, record) => (
                      <div className="d-flex gap-2">
                        <DattaButton
                          variant="outline-primary"
                          size="sm"
                          onClick={() => startEditing(record)}
                        >
                          <EditIcon />
                        </DattaButton>
                        <DattaButton
                          variant="outline-danger"
                          size="sm"
                          onClick={() => deleteUser(record.id)}
                        >
                          <TrashIcon />
                        </DattaButton>
                      </div>
                    )
                  }
                ]}
                loading={loading}
                error={error}
                onLoadData={loadUsers}
                refreshInterval={30000}
                maxRetries={3}
                pagination={{
                  currentPage: 1,
                  itemsPerPage: 10,
                  totalItems: filteredUsers.length
                }}
              />
            </div>
          </DattaCard>
        </div>
      </div>
    </>
  );
}
