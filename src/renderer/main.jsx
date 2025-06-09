import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/colors.css';
import { OperationProvider } from './components/common/DattaOperationQueue';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <OperationProvider>
      <App />
    </OperationProvider>
  </React.StrictMode>
);
