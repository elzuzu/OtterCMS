import React, { useState } from 'react';
import AdminUsers from './AdminUsers';
import AdminRoles from './AdminRoles';

export default function AdminUsersSection({ user }) {
  const [tab, setTab] = useState('users');
  return (
    <div>
      <div className="sub-tabs" style={{ marginBottom: '1rem' }}>
        <button
          className={tab === 'users' ? 'active' : ''}
          onClick={() => setTab('users')}
        >
          Utilisateurs
        </button>
        <button
          className={tab === 'roles' ? 'active' : ''}
          onClick={() => setTab('roles')}
        >
          Rôles
        </button>
      </div>
      {tab === 'users' ? <AdminUsers /> : <AdminRoles user={user} />}
    </div>
  );
}
