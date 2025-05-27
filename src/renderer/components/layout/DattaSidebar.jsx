import React, { useMemo } from 'react';
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

export default function DattaSidebar({ open, user, activeTab, onTabChange }) {
  const tabs = useMemo(() => {
    const t = [];
    if (hasPermission(user, PERMISSIONS.VIEW_DASHBOARD)) {
      t.push({ id: 'dashboard', label: 'Tableau de bord' });
    }
    if (hasPermission(user, PERMISSIONS.VIEW_INDIVIDUS)) {
      t.push({ id: 'individus', label: 'Individus' });
    }
    if (hasPermission(user, PERMISSIONS.IMPORT_DATA)) {
      t.push({ id: 'import', label: 'Import de données' });
    }
    if (hasPermission(user, PERMISSIONS.MASS_ATTRIBUTION)) {
      t.push({ id: 'attribution', label: 'Attribution de masse' });
    }
    if (hasPermission(user, PERMISSIONS.MANAGE_CATEGORIES)) {
      t.push({ id: 'categories', label: 'Gérer les catégories' });
    }
    if (hasPermission(user, PERMISSIONS.MANAGE_USERS) || hasPermission(user, PERMISSIONS.MANAGE_ROLES)) {
      t.push({ id: 'users', label: 'Gérer les utilisateurs' });
    }
    if (hasPermission(user, PERMISSIONS.MANAGE_COLUMNS)) {
      t.push({ id: 'template', label: 'Templates' });
    }
    return t;
  }, [user]);

  return (
    <nav className={`pc-sidebar ${!open ? 'pc-sidebar-hide' : ''}`}>
      <div className="navbar-wrapper">
        <div className="m-header">
          <a href="#" className="b-brand text-primary">
            <i className="ph-duotone ph-buildings f-26"></i>
            <span className="badge bg-brand-color-3 rounded-pill ms-2">v2.0</span>
          </a>
        </div>
        <div className="navbar-content">
          <ul className="pc-navbar">
            {tabs.map(tab => (
              <li key={tab.id} className={`pc-item ${activeTab === tab.id ? 'active' : ''}`}>
                <a href="#" className="pc-link" onClick={() => onTabChange(tab.id)}>
                  <span className="pc-micon">{icons[tab.id]}</span>
                  <span className="pc-mtext">{tab.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="sidebar-user text-center mt-auto mb-3 small">
          {user.windows_login ? `${user.windows_login} (${user.role})` : `${user.username} (${user.role})`}
        </div>
      </div>
    </nav>
  );
}
