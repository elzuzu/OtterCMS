import React, { useEffect, useState } from 'react';
import ThemeToggle from '../common/ThemeToggle';
import WindowControls from '../common/WindowControls';
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

export default function LayoutManager({
  user,
  onLogout,
  activeTab,
  onTabChange,
  title,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1025) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <nav className={`pc-sidebar ${!sidebarOpen ? 'pc-sidebar-hide' : ''}`}>
        <div className="navbar-wrapper">
          <div className="m-header">
            <a href="#" className="b-brand text-primary" onClick={handleToggleSidebar}>
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
      <header className="pc-header">
        <div className="header-wrapper">
          <div className="me-auto pc-mob-drp">
            <ul className="list-unstyled">
              <li className="pc-h-item pc-sidebar-collapse">
                <a href="#" className="pc-head-link ms-0" onClick={handleToggleSidebar}>
                  <i className="ph-duotone ph-list"></i>
                </a>
              </li>
            </ul>
          </div>
          <div className="ms-auto">
            <ul className="list-unstyled">
              <li className="pc-h-item">
                <ThemeToggle />
              </li>
              <li className="dropdown pc-h-item">
                <a
                  className="pc-head-link dropdown-toggle arrow-none me-0"
                  data-bs-toggle="dropdown"
                  href="#"
                  role="button"
                >
                  <i className="ph-duotone ph-user-circle"></i>
                </a>
                <div className="dropdown-menu dropdown-menu-end pc-h-dropdown">
                  <div className="dropdown-header">
                    <h5 className="text-overflow">
                      <small>{user.username}</small>
                    </h5>
                    <span>{user.role}</span>
                  </div>
                  <div className="dropdown-divider"></div>
                  <a href="#" className="dropdown-item" onClick={onLogout}>
                    <i className="ph-duotone ph-power"></i>
                    <span>Déconnexion</span>
                  </a>
                </div>
              </li>
              <li className="pc-h-item">
                <WindowControls />
              </li>
            </ul>
          </div>
        </div>
      </header>
      <div className="pc-container">{children}</div>
    </>
  );
}
