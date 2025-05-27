import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { IconMenu2 } from '@tabler/icons-react';
import ThemeToggle from '../common/ThemeToggle';
import WindowControls from '../common/WindowControls';

export default function DattaHeader({ onToggleSidebar, onLogout, user, title = 'Indi-Suivi' }) {
  return (
    <AppBar
      position="static"
      color="default"
      elevation={1}
      className="no-drag"
      sx={{ backgroundColor: '#fff', boxShadow: 'var(--datta-box-shadow)' }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', minHeight: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center' }} className="no-drag">
          <IconButton edge="start" onClick={onToggleSidebar} size="small" sx={{ mr: 1 }}>
            <IconMenu2 size={20} />
          </IconButton>
          <Typography variant="h6" sx={{ fontSize: '1rem' }} component="div">
            {title}
          </Typography>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ThemeToggle />
          <button onClick={onLogout} className="btn btn-ghost" style={{ marginLeft: 8 }}>
            Déconnexion
          </button>
          <WindowControls />
        </div>
      </Toolbar>
    </AppBar>
  );
}
