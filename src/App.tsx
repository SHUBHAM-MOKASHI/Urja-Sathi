import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppRoutes } from './routes';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
};

export default App;
