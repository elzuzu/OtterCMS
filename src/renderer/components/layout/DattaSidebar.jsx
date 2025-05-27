import React from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import PerfectScrollbar from 'react-perfect-scrollbar';
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
    <Drawer
      variant="persistent"
      open={open}
      onClose={onClose}
      sx={{
        width: 260,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 260,
          backgroundColor: 'var(--datta-sidebar-bg-dark)',
          color: '#fff',
        },
      }}
    >
      <PerfectScrollbar options={{ suppressScrollX: true }} style={{ height: '100%' }}>
        <List sx={{ width: 260 }}>
          {tabs.map((tab) => (
            <ListItemButton
              key={tab.id}
              selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              sx={{
                '&.Mui-selected': {
                  color: 'var(--datta-primary)',
                  borderLeft: '3px solid var(--datta-primary)',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}>{icons[tab.id]}</ListItemIcon>
              <ListItemText primary={tab.label} />
            </ListItemButton>
          ))}
        </List>
        <div style={{ padding: 16, marginTop: 'auto', color: 'rgba(255,255,255,0.65)' }}>
          <div style={{ fontSize: 12 }}>
            {user.windows_login ? `${user.windows_login} (${user.role})` : `${user.username} (${user.role})`}
          </div>
        </div>
      </PerfectScrollbar>
    </Drawer>
  );
}
