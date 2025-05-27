import React, { useState } from 'react';
import AdminUsers from './AdminUsers';
import AdminRoles from './AdminRoles';
import DattaButton from './common/DattaButton';

export default function AdminUsersSection({ user }) {
  const [tab, setTab] = useState('users');
  return (
    <div>
      <div className="sub-tabs" style={{ marginBottom: '1rem' }}>
        <DattaButton
          variant="secondary"
          size="sm"
          className={tab === 'users' ? 'active' : ''}
          onClick={() => setTab('users')}
        >
          Utilisateurs
        </DattaButton>
        <DattaButton
          variant="secondary"
          size="sm"
          className={tab === 'roles' ? 'active' : ''}
          onClick={() => setTab('roles')}
        >
          Rôles
        </DattaButton>
      </div>
      {tab === 'users' ? <AdminUsers /> : <AdminRoles user={user} />}
    </div>
  );
}
