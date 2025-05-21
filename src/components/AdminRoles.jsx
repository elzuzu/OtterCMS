import React, { useState, useEffect } from 'react';
import { ALL_PERMISSIONS } from '../constants/permissions';
import { hasPermission } from '../utils/permissions';

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
    <div>
      <h2>Gestion des rôles</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleSubmit} style={{marginBottom:'20px'}}>
        <input value={roleName} onChange={e=>setRoleName(e.target.value)} placeholder="Nom" required />
        <div style={{display:'flex',flexWrap:'wrap',gap:'10px',margin:'10px 0'}}>
          {ALL_PERMISSIONS.map(p => (
            <label key={p} style={{marginRight:'10px'}}>
              <input type="checkbox" checked={rolePerms.includes(p)} onChange={()=>togglePerm(p)} /> {p}
            </label>
          ))}
        </div>
        <button type="submit">{editingRole?'Mettre à jour':'Créer'}</button>
        {editingRole && <button type="button" onClick={resetForm}>Annuler</button>}
      </form>
      <div className="table-responsive">
        <table className="users-table">
          <thead><tr><th>Nom</th><th>Permissions</th><th>Actions</th></tr></thead>
          <tbody>
          {roles.map(r => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>{r.permissions.join(', ')}</td>
              <td>
                <button onClick={()=>startEdit(r)}>Éditer</button>
                <button onClick={()=>handleDelete(r.name)} className="delete-button">Supprimer</button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
