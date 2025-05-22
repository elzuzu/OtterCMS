import React, { useState, useEffect } from 'react';
import { ALL_PERMISSIONS } from '../constants/permissions';
import { hasPermission } from '../utils/permissions';

// Simple SVG icons for actions
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

export default function AdminRoles({ user }) {
  const [roles, setRoles] = useState([]);
  const [editingRole, setEditingRole] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [rolePerms, setRolePerms] = useState([]);
  const [message, setMessage] = useState('');

  const loadRoles = async () => {
    const res = await window.api.getRoles();
    if (res.success) setRoles(res.data);
  };

  useEffect(() => { loadRoles(); }, []);

  const togglePerm = perm => {
    setRolePerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const startEdit = role => {
    setEditingRole(role);
    setRoleName(role.name);
    setRolePerms(role.permissions);
  };

  const resetForm = () => {
    setEditingRole(null);
    setRoleName('');
    setRolePerms([]);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const data = { name: roleName, permissions: rolePerms };
    const res = editingRole ? await window.api.updateRole(data) : await window.api.createRole(data);
    if (res.success) {
      setMessage('Role sauvegardé');
      loadRoles();
      resetForm();
    } else {
      setMessage(res.error || 'Erreur');
    }
  };

  const handleDelete = async name => {
    if (!window.confirm('Supprimer ce rôle ?')) return;
    const res = await window.api.deleteRole(name);
    if (res.success) loadRoles();
  };

  if (!hasPermission(user, 'manage_roles')) return <div>Accès refusé.</div>;

  return (
    <div className="admin-panel role-management-panel">
      <h2 className="panel-title">Gestion des rôles</h2>
      {message && (
        <div className={message.toLowerCase().includes('erreur') ? 'error' : 'success'}>
          {message}
        </div>
      )}
      <div className="role-form">
        <h3>{editingRole ? 'Modifier un rôle' : 'Créer un rôle'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom du rôle:</label>
            <input
              value={roleName}
              onChange={e => setRoleName(e.target.value)}
              placeholder="Nom"
              required
            />
          </div>
          <div className="permissions-grid">
            {ALL_PERMISSIONS.map(p => (
              <label key={p}>
                <input
                  type="checkbox"
                  checked={rolePerms.includes(p)}
                  onChange={() => togglePerm(p)}
                />{' '}
                {p}
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingRole ? 'Mettre à jour' : 'Créer'}
            </button>
            {editingRole && (
              <button type="button" onClick={resetForm} className="btn-secondary">
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>
      <h3>Rôles existants</h3>
      <div className="table-responsive">
        <table className="users-table data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Permissions</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.permissions.join(', ')}</td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => startEdit(r)}
                    className="btn-secondary btn-small btn-icon"
                    aria-label="Éditer le rôle"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => handleDelete(r.name)}
                    className="btn-danger btn-small btn-icon"
                    aria-label="Supprimer le rôle"
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
