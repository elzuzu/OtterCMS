import React, { useState, useEffect, createContext, useContext } from 'react';
import DattaAlert from './DattaAlert';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      timestamp: new Date(),
      autoClose: true,
      duration: 5000,
      ...notification,
    };

    setNotifications((prev) => [...prev, newNotification]);

    if (newNotification.autoClose) {
      setTimeout(() => removeNotification(id), newNotification.duration);
    }

    return id;
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const showSuccess = (message, options = {}) =>
    addNotification({ type: 'success', message, icon: 'icon-check-circle', ...options });

  const showError = (message, options = {}) =>
    addNotification({ type: 'danger', message, icon: 'icon-alert-circle', autoClose: false, ...options });

  const showWarning = (message, options = {}) =>
    addNotification({ type: 'warning', message, icon: 'icon-alert-triangle', ...options });

  const showInfo = (message, options = {}) =>
    addNotification({ type: 'info', message, icon: 'icon-info', ...options });

  useEffect(() => {
    window.showNotification = addNotification;
    window.showSuccess = showSuccess;
    window.showError = showError;
    window.showWarning = showWarning;
    window.showInfo = showInfo;

    return () => {
      delete window.showNotification;
      delete window.showSuccess;
      delete window.showError;
      delete window.showWarning;
      delete window.showInfo;
    };
  }, []);

  const notificationStyles = `
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}`;

  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = notificationStyles;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationDisplay />
    </NotificationContext.Provider>
  );
}

function NotificationDisplay() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 9999, maxWidth: '400px' }}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="mb-2"
          style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
          <DattaAlert
            type={notification.type}
            dismissible
            onClose={() => removeNotification(notification.id)}
            className="shadow"
          >
            <div className="d-flex align-items-start">
              {notification.icon && (
                <i className={`feather ${notification.icon} me-2 mt-1`}></i>
              )}
              <div className="flex-grow-1">
                {notification.title && (
                  <div className="fw-bold mb-1">{notification.title}</div>
                )}
                <div>{notification.message}</div>
                {notification.timestamp && (
                  <small className="text-muted d-block mt-1">
                    {notification.timestamp.toLocaleTimeString()}
                  </small>
                )}
              </div>
            </div>
          </DattaAlert>
        </div>
      ))}
    </div>
  );
}

export default NotificationProvider;
