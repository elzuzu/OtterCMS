import React, { useEffect, useState } from 'react';
import WindowControls from '../common/WindowControls';
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
    dashboard: <i className="feather icon-home"></i>,
    individus: <i className="feather icon-list"></i>,
    import: <i className="feather icon-upload"></i>,
    attribution: <i className="feather icon-users"></i>,
    categories: <i className="feather icon-tag"></i>,
    users: <i className="feather icon-user"></i>,
    template: <i className="feather icon-feather"></i>,
    settings: <i className="feather icon-settings"></i>,
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

  // Re-apply Feather icons after React renders dynamic elements
  useEffect(() => {
    if (window.feather && typeof window.feather.replace === 'function') {
      window.feather.replace();
    }
  }, [activeTab]);

  return (
    <>
      <nav className={`pc-sidebar ${!sidebarOpen ? 'pc-sidebar-hide' : ''}`}>
        <div className="navbar-wrapper">
          <div className="m-header">
            <a href="#" className="b-brand text-primary" onClick={handleToggleSidebar}>
              <svg
                width="28"
                height="28"
                viewBox="0 0 64 64"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="me-2"
                style={{ flexShrink: 0 }}
              >
                <circle cx="32" cy="20" r="9" />
                <circle cx="25" cy="12" r="3" />
                <circle cx="39" cy="12" r="3" />
                <circle cx="28" cy="18" r="1.5" fill="currentColor" />
                <circle cx="36" cy="18" r="1.5" fill="currentColor" />
                <path d="M30 24 Q32 25 34 24" />
                <path d="M20 32 Q16 48 32 54 Q48 48 44 32" />
                <path d="M26 36 Q32 33 38 36" />
              </svg>
              <span className="b-brand-text d-sm-block fw-medium">
                {title || 'Indi-Suivi'}
              </span>
              <span className="badge bg-brand-color-3 rounded-pill ms-2">v2.0</span>
            </a>
          </div>
          <div className="navbar-content">
            <ul className="pc-navbar">
              <li className="pc-item pc-caption">
                <label>Navigation</label>
              </li>
              {tabs.map(tab => (
                <li key={tab.id} className={`pc-item ${activeTab === tab.id ? 'active' : ''}`}>
                  <a href="#" className="pc-link" onClick={() => onTabChange(tab.id)}>
                    <span className="pc-micon">{icons[tab.id]}</span>
                    <span className="pc-mtext">{tab.label}</span>
                    <span className="pc-arrow"><i className="feather icon-chevron-right"></i></span>
                    {tab.badge && <span className="pc-badge">{tab.badge}</span>}
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
      <header className="pc-header" style={{ WebkitAppRegion: 'drag' }}>
        <div className="header-wrapper">
          <div className="me-auto pc-mob-drp">
            <ul className="list-unstyled">
              <li className="pc-h-item pc-sidebar-collapse">
                <a
                  href="#"
                  className="pc-head-link ms-0"
                  style={{ WebkitAppRegion: 'no-drag' }}
                  onClick={handleToggleSidebar}
                >
                  <i className="ph-duotone ph-list"></i>
                </a>
              </li>
            </ul>
          </div>
          <div className="ms-auto">
            <ul className="list-unstyled">
              <li className="dropdown pc-h-item">
                <a
                  className="pc-head-link dropdown-toggle arrow-none me-0"
                  data-bs-toggle="dropdown"
                  href="#"
                  role="button"
                  style={{ WebkitAppRegion: 'no-drag' }}
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
                  <a
                    href="#"
                    className="dropdown-item"
                    style={{ WebkitAppRegion: 'no-drag' }}
                    onClick={onLogout}
                  >
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
