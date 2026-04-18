import { useEffect } from 'react';
import { X } from 'lucide-react';

const ToastNotification = ({ notification, onClose, onNavigate }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Auto-dismiss after 5 seconds
        return () => clearTimeout(timer);
    }, [onClose]);

    const getIcon = (type) => {
        const icons = {
            // Success/Approval
            'booking_approved': '✓',
            'demo_accepted': '✓',
            'payment_received': '💰',

            // Rejection
            'booking_rejected': '✕',
            'demo_rejected': '✕',

            // New Requests
            'new_booking_request': '📝',
            'new_trial_request': '🎓',

            // Sessions
            'session_reminder': '⏰',
            'session_starting_soon': '🔔',
            'session_completed': '✅',

            // Other
            'progress_report_added': '📊',
            'new_review': '⭐',
            'student_cancellation': '📅',
            'tutor_unavailable': '⚠️'
        };
        return icons[type] || '•';
    };

    const getGradient = (type) => {
        // Success (green)
        if (type.includes('approved') || type.includes('accepted') || type.includes('payment')) {
            return 'from-lime-dark to-lime-dark';
        }
        // Error/Rejection (red)
        if (type.includes('rejected') || type.includes('cancellation') || type.includes('unavailable')) {
            return 'from-red-500 to-rose-600';
        }
        // Session/Reminder (purple)
        if (type.includes('session') || type.includes('reminder') || type.includes('starting')) {
            return 'from-royal to-royal-dark';
        }
        // Info/Request (blue)
        return 'from-royal/50 to-cyan-600';
    };

    const handleClick = () => {
        if (notification.link) {
            onNavigate(notification.link);
        }
        onClose();
    };

    return (
        <div
            onClick={handleClick}
            className={`
                bg-gradient-to-r ${getGradient(notification.type)}
                text-white rounded-lg shadow-2xl p-4 mb-3 
                transform transition-all hover:scale-105 hover:shadow-xl
                animate-slide-in-right max-w-md cursor-pointer
                border border-white/20
            `}
        >
            <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{getIcon(notification.type)}</span>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm">{notification.title}</h4>
                    <p className="text-xs opacity-90 mt-1 line-clamp-2">{notification.message}</p>
                    {notification.link && (
                        <p className="text-xs opacity-75 mt-2">Click to view →</p>
                    )}
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="text-white/80 hover:text-white flex-shrink-0"
                    aria-label="Close"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default ToastNotification;
