import React from 'react';
import { IconMenu2 } from '@tabler/icons-react';
import ThemeToggle from '../common/ThemeToggle';
import WindowControls from '../common/WindowControls';

export default function DattaHeader({ onToggleSidebar, onLogout, user, title = 'Indi-Suivi' }) {
  return (
    <header className="navbar navbar-expand-lg navbar-light" style={{ height: 64 }}>
      <div className="container-fluid">
        <div className="navbar-brand no-drag" style={{ display: 'flex', alignItems: 'center' }}>
          <button className="navbar-toggler" onClick={onToggleSidebar}>
            <span className="navbar-toggler-icon"></span>
          </button>
          <span className="navbar-title" style={{ marginLeft: 8 }}>{title}</span>
        </div>
        <div className="navbar-nav ml-auto" style={{ display: 'flex', alignItems: 'center' }}>
          <ThemeToggle />
          <div className="nav-item dropdown" style={{ marginLeft: 8 }}>
            <button className="btn btn-link" onClick={onLogout}>Déconnexion</button>
          </div>
          <WindowControls />
        </div>
      </div>
    </header>
  );
}
