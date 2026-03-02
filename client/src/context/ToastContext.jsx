import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ToastNotification from '../components/ToastNotification';

const ToastContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [oldStyleToasts, setOldStyleToasts] = useState([]);
    const navigate = useNavigate();

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // New: Show rich notification toast
    const showNotificationToast = useCallback((notification) => {
        const id = Date.now() + Math.random();
        const toast = { ...notification, id };

        setToasts(prev => [...prev.slice(-2), toast]); // Max 3 toasts

        // Auto-remove after 5.1 seconds
        setTimeout(() => {
            removeToast(id);
        }, 5100);
    }, [removeToast]);

    // Legacy: Simple text toasts
    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setOldStyleToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            setOldStyleToasts(prev => prev.filter(toast => toast.id !== id));
        }, 5000);
    }, []);

    const removeOldToast = useCallback((id) => {
        setOldStyleToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const handleNavigate = useCallback((link) => {
        navigate(link);
    }, [navigate]);

    const showSuccess = useCallback((message) => addToast(message, 'success'), [addToast]);
    const showError = useCallback((message) => addToast(message, 'error'), [addToast]);
    const showWarning = useCallback((message) => addToast(message, 'warning'), [addToast]);
    const showInfo = useCallback((message) => addToast(message, 'info'), [addToast]);

    return (
        <ToastContext.Provider value={{
            showSuccess,
            showError,
            showWarning,
            showInfo,
            showNotificationToast // NEW: For rich notifications
        }}>
            {children}

            {/* Rich Notification Toasts (top-right) */}
            <div className="fixed top-20 right-4 z-[9999] space-y-3">
                {toasts.map(toast => (
                    <ToastNotification
                        key={toast.id}
                        notification={toast}
                        onClose={() => removeToast(toast.id)}
                        onNavigate={handleNavigate}
                    />
                ))}
            </div>

            {/* Legacy Simple Toasts (top-center) */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {oldStyleToasts.map(toast => (
                    <Toast key={toast.id} {...toast} onClose={() => removeOldToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

// Legacy toast component (keep for backwards compatibility)
const Toast = ({ message, type, onClose }) => {
    const bgColors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    return (
        <div
            className={`${bgColors[type]} text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 min-w-[300px] max-w-md animate-slide-in border-l-4 border-white border-opacity-50`}
            role="alert"
            aria-live="polite"
        >
            <span className="text-xl font-bold flex-shrink-0">{icons[type]}</span>
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button
                onClick={onClose}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClose();
                    }
                }}
                className="text-white hover:text-gray-200 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-white rounded transition-colors flex-shrink-0"
                aria-label="Close notification"
            >
                ×
            </button>
        </div>
    );
};
