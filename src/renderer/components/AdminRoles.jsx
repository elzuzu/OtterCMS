import React, { useState, useEffect } from 'react';
import { ALL_PERMISSIONS } from '../constants/permissions';
import { hasPermission } from '../utils/permissions';
import DattaDataTable from './common/DattaDataTable';
import DattaButton from './common/DattaButton';
import { EditIcon, TrashIcon } from './common/Icons';

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
            <DattaButton type="submit" variant="primary">
              {editingRole ? 'Mettre à jour' : 'Créer'}
            </DattaButton>
            {editingRole && (
              <DattaButton type="button" onClick={resetForm} variant="secondary">
                Annuler
              </DattaButton>
            )}
          </div>
        </form>
      </div>
      <h3>Rôles existants</h3>
      <DattaDataTable
        data={roles}
        getRowKey={r => r.name}
        columns={[
          { header: 'Nom', accessor: 'name' },
          { header: 'Permissions', render: r => r.permissions.join(', ') },
          {
            header: 'Actions',
            thStyle: { textAlign: 'center', width: '80px' },
            tdStyle: { textAlign: 'center', width: '80px' },
            render: r => (
              <>
                <DattaButton
                  onClick={() => startEdit(r)}
                  variant="secondary"
                  size="sm"
                  className="btn-icon"
                  aria-label="Éditer le rôle"
                >
                  <EditIcon />
                </DattaButton>
                <DattaButton
                  onClick={() => handleDelete(r.name)}
                  variant="danger"
                  size="sm"
                  className="btn-icon"
                  aria-label="Supprimer le rôle"
                >
                  <TrashIcon />
                </DattaButton>
              </>
            )
          }
        ]}
      />
    </div>
  );
}
