import React, { useState } from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import DattaHeader from './DattaHeader';
import DattaSidebar from './DattaSidebar';
import useTheme from '../../hooks/useTheme';

export default function LayoutManager({
  user,
  onLogout,
  activeTab,
  onTabChange,
  title,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useTheme();

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100vh' }}>
      <CssBaseline />
      <DattaSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <DattaHeader
          onToggleSidebar={handleToggleSidebar}
          onLogout={onLogout}
          user={user}
          title={title}
        />
        <Box component="main" sx={{ flexGrow: 1, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
