import React, { useState, useEffect } from 'react';
import DattaAlert from './DattaAlert';

export default function DattaNotificationCenter() {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { ...notification, id }]);
    if (notification.autoClose !== false) {
      setTimeout(() => removeNotification(id), notification.duration || 5000);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    window.showNotification = addNotification;
    return () => {
      delete window.showNotification;
    };
  }, []);

  return (
    <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 9999 }}>
      {notifications.map(notification => (
        <DattaAlert
          key={notification.id}
          type={notification.type}
          dismissible
          onClose={() => removeNotification(notification.id)}
          className="mb-2 shadow"
        >
          {notification.icon && <i className={`feather ${notification.icon} me-2`}></i>}
          {notification.message}
        </DattaAlert>
      ))}
    </div>
  );
}
