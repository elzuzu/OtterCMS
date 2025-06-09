import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/colors.css';
import { OperationProvider } from './components/common/DattaOperationQueue';
import NotificationProvider from './components/common/DattaNotificationCenter';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NotificationProvider>
      <OperationProvider>
        <App />
      </OperationProvider>
    </NotificationProvider>
  </React.StrictMode>
);
