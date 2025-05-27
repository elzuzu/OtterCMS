import React, { useState } from 'react';
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
    <div className="pc-container">
      <DattaSidebar
        open={sidebarOpen}
        user={user}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
      <DattaHeader
        onToggleSidebar={handleToggleSidebar}
        onLogout={onLogout}
        user={user}
        title={title}
      />
      <div className="pc-content">
        {children}
      </div>
    </div>
  );
}
