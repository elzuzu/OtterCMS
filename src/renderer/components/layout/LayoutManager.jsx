import React, { useState } from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import DattaHeader from './DattaHeader';
import DattaSidebar from './DattaSidebar';

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
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left 0.3s',
        }}
      >
        <DattaHeader
          onToggleSidebar={handleToggleSidebar}
          onLogout={onLogout}
          user={user}
          title={title}
        />
        <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', padding: 2 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
