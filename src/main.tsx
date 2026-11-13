import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker } from './services/serviceWorkerRegistration';

// Register Service Worker for offline-first PWA caching
registerServiceWorker({
  onSuccess: () => {
    console.log('[URJA SAATHI] Offline cache ready.');
  },
  onUpdate: () => {
    console.log('[URJA SAATHI] New version detected.');
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

