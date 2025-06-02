import React, { useState, useEffect } from 'react';
import DattaDataTable from './common/DattaDataTable';
import DattaButton from './common/DattaButton';
import DattaCard from './common/DattaCard';
import DattaAlert from './common/DattaAlert';
import { DattaTextField, DattaSelect } from './common/DattaForm';
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
          <DattaCard
            title={`Liste des utilisateurs (${filteredUsers.length})`}
            actions={(
              <DattaTextField
                placeholder="🔍 Rechercher..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{ marginBottom: 0 }}
              />
            )}
          >
            {loading && <div className="loading">Chargement...</div>}
            {!loading && filteredUsers.length === 0 ? (
              <div className="text-muted">Aucun utilisateur trouvé.</div>
            ) : (
              <DattaDataTable
                data={filteredUsers}
                getRowKey={u => u.id}
                columns={[
                  { header: 'Utilisateur', accessor: 'username' },
                  {
                    header: 'Rôle',
                    render: u => (
                      <span className={`badge bg-${u.role === 'admin' ? 'danger' : 'primary'}`}>{u.role}</span>
                    )
                  },
                  {
                    header: 'Statut',
                    render: u =>
                      u.windows_login ? (
                        <span className="badge bg-success">Windows</span>
                      ) : (
                        <span className="badge bg-secondary">Local</span>
                      )
                  },
                  {
                    header: 'Actions',
                    thStyle: { textAlign: 'center', width: '80px' },
                    tdStyle: { textAlign: 'center', width: '80px' },
                    render: u => (
                      <>
                        <DattaButton
                          onClick={() => startEditing(u)}
                          variant="light-primary"
                          size="sm"
                          title="Modifier"
                        >
                          <i className="feather icon-edit"></i>
                        </DattaButton>
                        <DattaButton
                          onClick={() => deleteUser(u.id)}
                          variant="light-danger"
                          size="sm"
                          title="Supprimer"
                        >
                          <i className="feather icon-trash-2"></i>
                        </DattaButton>
                      </>
                    )
                  }
                ]}
              />
            )}
          </DattaCard>
        </div>
      </div>
    </>
  );
}
