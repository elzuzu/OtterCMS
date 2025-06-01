import React, { useState } from 'react';
import AdminUsers from './AdminUsers';
import AdminRoles from './AdminRoles';
import DattaPageTitle from './common/DattaPageTitle';

export default function AdminUsersSection({ user }) {
  const [tab, setTab] = useState('users');
  return (
    <div className="pc-content">
      <DattaPageTitle title="Gestion des utilisateurs" />
      <div className="card">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <a
                className={`nav-link ${tab === 'users' ? 'active' : ''}`}
                onClick={() => setTab('users')}
                role="button"
              >
                <i className="feather icon-users me-2"></i>
                Utilisateurs
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link ${tab === 'roles' ? 'active' : ''}`}
                onClick={() => setTab('roles')}
                role="button"
              >
                <i className="feather icon-shield me-2"></i>
                Rôles
              </a>
            </li>
          </ul>
        </div>
        <div className="card-body">
          {tab === 'users' ? <AdminUsers /> : <AdminRoles user={user} />}
        </div>
      </div>
    </div>
  );
}
