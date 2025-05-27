import React from 'react';
import ThemeToggle from '../common/ThemeToggle';
import WindowControls from '../common/WindowControls';

export default function DattaHeader({ onToggleSidebar, onLogout, user, title = 'Indi-Suivi' }) {
  return (
    <header className="pc-header">
      <div className="header-wrapper">
        <div className="me-auto pc-mob-drp">
          <ul className="list-unstyled">
            <li className="pc-h-item pc-sidebar-collapse">
              <a href="#" className="pc-head-link ms-0" onClick={onToggleSidebar}>
                <i className="ph-duotone ph-list"></i>
              </a>
            </li>
            <li className="pc-h-item pc-sidebar-popup d-block d-md-none">
              <a href="#" className="pc-head-link ms-0" onClick={onToggleSidebar}>
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
              <a className="pc-head-link dropdown-toggle arrow-none me-0" data-bs-toggle="dropdown" href="#" role="button">
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
  );
}
