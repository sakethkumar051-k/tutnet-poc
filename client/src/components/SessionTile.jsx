import { useAuth } from '../context/AuthContext';

const SessionTile = ({ session, onAction, actionLabel }) => {
    const { user } = useAuth();

    // Determine status color
    const getStatusColor = (status) => {
        const colors = {
            scheduled: 'bg-blue-50 text-blue-700',
            approved: 'bg-green-50 text-green-700',
            completed: 'bg-gray-100 text-gray-600',
            pending: 'bg-yellow-50 text-yellow-700',
            cancelled: 'bg-red-50 text-red-700'
        };
        return colors[status] || colors.scheduled;
    };

    // Format time concisely (e.g., "Mon, 10:00 AM • 1h")
    const formatTime = (dateStr, duration) => {
        if (!dateStr) return 'Unscheduled';
        const date = new Date(dateStr);
        const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `${day}, ${time}${duration ? ` • ${duration}m` : ''}`;
    };

    const targetUser = user?.role === 'student' ? session.tutorId : session.studentId;
    const targetName = targetUser?.name || 'Unknown User';
    const targetInitial = targetName.charAt(0).toUpperCase();

    return (
        <div className="group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-all duration-200 flex items-center justify-between gap-4">
            {/* Left: Avatar & Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {targetInitial}
                </div>

                {/* Main Info */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-gray-900 font-semibold truncate text-sm sm:text-base">
                            {targetName}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 uppercase tracking-wide">
                            {session.subject}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500">
                        <span>{formatTime(session.sessionDate, session.duration)}</span>

                        {/* Status Grid - only show if impactful */}
                        {session.status !== 'approved' && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(session.status)}`}>
                                {session.status}
                            </span>
                        )}

                        {/* Attendance Badge */}
                        {session.attendanceStatus && (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Present
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Action */}
            <div className="flex-shrink-0">
                {session.onlineLink && !['completed', 'cancelled'].includes(session.status) ? (
                    <a
                        href={session.onlineLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        onClick={() => {
                            if (onAction) onAction(session, 'join');
                        }}
                    >
                        Join
                    </a>
                ) : (
                    <button
                        onClick={() => onAction && onAction(session, 'view')}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        {actionLabel || 'Details'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default SessionTile;
