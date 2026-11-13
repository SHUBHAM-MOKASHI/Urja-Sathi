import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (type: NotificationType, title: string, message?: string, duration?: number) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, title: string, message?: string, duration: number = 4000) => {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newNotification: Notification = { id, type, title, message, duration };

      setNotifications((prev) => [...prev, newNotification]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, removeNotification }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {notifications.map((notif) => {
          return (
            <div
              key={notif.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-premium border transition-all duration-300 transform translate-y-0",
                notif.type === 'success' && "bg-emerald-50/95 border-emerald-200 text-emerald-950",
                notif.type === 'warning' && "bg-amber-50/95 border-amber-200 text-amber-950",
                notif.type === 'error' && "bg-rose-50/95 border-rose-200 text-rose-950",
                notif.type === 'info' && "bg-sky-50/95 border-sky-200 text-sky-950"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {notif.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {notif.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                {notif.type === 'error' && <XCircle className="w-5 h-5 text-rose-600" />}
                {notif.type === 'info' && <Info className="w-5 h-5 text-sky-600" />}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold">{notif.title}</p>
                {notif.message && <p className="mt-0.5 opacity-90 text-xs">{notif.message}</p>}
              </div>
              <button
                onClick={() => removeNotification(notif.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

