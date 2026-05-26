import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    const newToast = { id, message, type, time: new Date() };
    
    setToasts((prev) => [...prev, newToast]);
    setNotifications((prev) => [newToast, ...prev]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, notifications, clearNotifications }}>
      {children}
      <div className="toast-container" style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 9999
      }}>
        {toasts.map((toast) => (
          <div key={toast.id} className="toast fade-in-up" style={{
            padding: '12px 20px',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            background: toast.type === 'error' ? 'var(--danger, #ef4444)' : 
                        toast.type === 'success' ? 'var(--success, #22c55e)' : 
                        'var(--neon-blue, #3b82f6)'
          }}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
