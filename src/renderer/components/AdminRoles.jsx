import React, { useState, useEffect, useCallback } from 'react';
import { ALL_PERMISSIONS } from '../constants/permissions';
import { hasPermission } from '../utils/permissions';
import DattaNetworkDataTable from './common/DattaNetworkDataTable';
import DattaButton from './common/DattaButton';
import DattaCard from './common/DattaCard';
import DattaAlert from './common/DattaAlert';
import DattaCheckbox from './common/DattaCheckbox';
import { DattaTextField, DattaSelect } from './common/DattaForm';
import { EditIcon, TrashIcon } from './common/Icons';
import { useSync } from '../hooks/useSync';

export default function AdminRoles({ user }) {
  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState({
    name: '',
    permissions: []
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [error, setError] = useState(null);

  const { syncState, performSync } = useSync();

  const loadRoles = useCallback(async () => {
    try {
      const result = await window.api.getRoles();
      if (result.success) {
        setRoles(result.data);
        setError(null);
        // Synchroniser les données après le chargement
        await performSync();
      } else {
        const errorMsg = result.error || 'Problème lors du chargement des rôles';
        setError(errorMsg);
        setMessage(`Erreur: ${errorMsg}`);
      }
    } catch (err) {
      setError(err.message);
      setMessage(`Erreur critique: ${err.message}`);
    }
  }, [performSync]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const togglePerm = perm => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm) ? prev.permissions.filter(p => p !== perm) : [...prev.permissions, perm]
    }));
  };

  const startEditing = role => {
    setEditingRole(role);
    setNewRole({
      name: role.name,
      permissions: role.permissions
    });
  };

  const cancelEditing = () => {
    setEditingRole(null);
    setNewRole({
      name: '',
      permissions: []
    });
  };

  const handleInputChange = e => {
    const { name, value, type, checked } = e.target;
    setNewRole(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? [value] : []) : value
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!window.api) {
      setMessage('API indisponible');
      return;
    }
    const data = { name: newRole.name, permissions: newRole.permissions };
    try {
      const res = editingRole ? await window.api.updateRole(data) : await window.api.createRole(data);
      if (res.success) {
        setMessage('Role sauvegardé');
        loadRoles();
        cancelEditing();
      } else {
        setMessage(res.error || 'Erreur');
      }
    } catch (e) {
      setMessage(e.message || 'Erreur');
    }
  };

  const handleDelete = async name => {
    if (!window.confirm('Supprimer ce rôle ?')) return;
    if (!window.api || !window.api.deleteRole) {
      setMessage('API indisponible');
      return;
    }
    try {
      const res = await window.api.deleteRole(name);
      if (res.success) {
        loadRoles();
      } else {
        setMessage(res.error || 'Erreur');
      }
    } catch (e) {
      setMessage(e.message || 'Erreur');
    }
  };

  if (!hasPermission(user, 'manage_roles')) return <div>Accès refusé.</div>;

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
          <DattaCard title={editingRole ? 'Modifier un rôle' : 'Ajouter un rôle'}>
            <form onSubmit={handleSubmit}>
              <DattaTextField
                label="Nom du rôle"
                name="name"
                value={newRole.name}
                onChange={handleInputChange}
                required
              />
              <DattaSelect
                label="Permissions"
                name="permissions"
                value={newRole.permissions}
                onChange={handleInputChange}
                multiple
                options={[
                  { value: 'read', label: 'Lecture' },
                  { value: 'write', label: 'Écriture' },
                  { value: 'delete', label: 'Suppression' },
                  { value: 'admin', label: 'Administration' }
                ]}
              />
              <div className="form-actions">
                <DattaButton type="submit" variant="primary" disabled={loading}>
                  {loading ? 'En cours...' : (editingRole ? 'Mettre à jour' : 'Ajouter')}
                </DattaButton>
                {editingRole && (
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
              <DattaNetworkDataTable
                data={roles}
                columns={[
                  {
                    title: 'Nom',
                    dataIndex: 'name',
                    key: 'name',
                    sorter: true
                  },
                  {
                    title: 'Permissions',
                    dataIndex: 'permissions',
                    key: 'permissions',
                    render: (permissions) => permissions.join(', ')
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
                          onClick={() => handleDelete(record.name)}
                        >
                          <TrashIcon />
                        </DattaButton>
                      </div>
                    )
                  }
                ]}
                loading={loading}
                error={error}
                onLoadData={loadRoles}
                refreshInterval={30000}
                maxRetries={3}
                pagination={{
                  currentPage: 1,
                  itemsPerPage: 10,
                  totalItems: roles.length
                }}
              />
            </div>
          </DattaCard>
        </div>
      </div>
    </>
  );
}
