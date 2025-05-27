import React from 'react';
import {
  IconHome2,
  IconList,
  IconUpload,
  IconUsers,
  IconSettings,
  IconTag,
  IconUser,
  IconPalette,
} from '@tabler/icons-react';
import { PERMISSIONS } from '../../constants/permissions';
import { hasPermission } from '../../utils/permissions';

const icons = {
  dashboard: <IconHome2 size={18} />,
  individus: <IconList size={18} />,
  import: <IconUpload size={18} />,
  attribution: <IconUsers size={18} />,
  categories: <IconTag size={18} />,
  users: <IconUser size={18} />,
  template: <IconPalette size={18} />,
  settings: <IconSettings size={18} />,
};

export default function DattaSidebar({ open, onClose, user, activeTab, onTabChange }) {
  const tabs = [];
  if (hasPermission(user, PERMISSIONS.VIEW_DASHBOARD)) {
    tabs.push({ id: 'dashboard', label: 'Tableau de bord' });
  }
  if (hasPermission(user, PERMISSIONS.VIEW_INDIVIDUS)) {
    tabs.push({ id: 'individus', label: 'Individus' });
  }
  if (hasPermission(user, PERMISSIONS.IMPORT_DATA)) {
    tabs.push({ id: 'import', label: 'Import de données' });
  }
  if (hasPermission(user, PERMISSIONS.MASS_ATTRIBUTION)) {
    tabs.push({ id: 'attribution', label: 'Attribution de masse' });
  }
  if (hasPermission(user, PERMISSIONS.MANAGE_CATEGORIES)) {
    tabs.push({ id: 'categories', label: 'Gérer les catégories' });
  }
  if (hasPermission(user, PERMISSIONS.MANAGE_USERS) || hasPermission(user, PERMISSIONS.MANAGE_ROLES)) {
    tabs.push({ id: 'users', label: 'Gérer les utilisateurs' });
  }
  if (hasPermission(user, PERMISSIONS.MANAGE_COLUMNS)) {
    tabs.push({ id: 'template', label: 'Templates' });
  }

  return (
    <nav
      className={`navbar-nav bg-gradient-primary sidebar sidebar-dark accordion ${open ? '' : 'toggled'}`}
      style={{ backgroundColor: 'var(--sidebar-bg-dark)', width: 260 }}
    >
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon rotate-n-15">
          <i className="fas fa-laugh-wink"></i>
        </div>
        <div className="sidebar-brand-text mx-3">Indi-Suivi</div>
      </div>
      <hr className="sidebar-divider my-0" />
      <ul className="nav flex-column">
        {tabs.map((tab) => (
          <li key={tab.id} className="nav-item">
            <a
              className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              style={{ cursor: 'pointer' }}
            >
              {icons[tab.id]}
              <span style={{ marginLeft: 8 }}>{tab.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <div style={{ padding: 16, marginTop: 'auto', color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
        {user.windows_login ? `${user.windows_login} (${user.role})` : `${user.username} (${user.role})`}
      </div>
    </nav>
  );
}
