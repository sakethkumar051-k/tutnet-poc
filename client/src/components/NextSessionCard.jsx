import { Link } from 'react-router-dom';

const NextSessionCard = ({ session }) => {
    if (!session) {
        return (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 text-center border-2 border-dashed border-gray-300">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Upcoming Sessions</h3>
                <p className="text-gray-600 mb-6">Find a tutor and book your first session!</p>
                <Link
                    to="/find-tutors"
                    className="inline-flex items-center px-6 py-3 bg-royal text-white font-medium rounded-lg hover:bg-royal-dark transition shadow-lg hover:shadow-xl"
                >
                    Browse Tutors →
                </Link>
            </div>
        );
    }

    const sessionDate = new Date(session.sessionDate || session.preferredSchedule);
    const isToday = sessionDate.toDateString() === new Date().toDateString();
    const timeUntil = getTimeUntil(sessionDate);

    return (
        <div className="bg-gradient-to-br from-royal to-navy-900 rounded-2xl p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-3xl">🎯</span>
                        <h3 className="text-lg font-bold">Next Session</h3>
                    </div>
                    {isToday && timeUntil && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm">
                            {timeUntil}
                        </span>
                    )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${session.status === 'approved' ? 'bg-lime/40 text-navy-950' : 'bg-lime/40 text-navy-950'
                    }`}>
                    {session.status === 'approved' ? 'Confirmed' : 'Pending'}
                </span>
            </div>

            <div className="space-y-3 mb-6">
                <div>
                    <h4 className="text-2xl font-bold">{session.subject}</h4>
                    <p className="text-royal text-lg">with {session.tutorId?.name || 'Tutor'}</p>
                </div>

                <div className="flex items-center gap-4 text-sm text-royal">
                    <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatSessionDate(sessionDate)}
                    </span>
                    <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatSessionTime(sessionDate)}
                    </span>
                </div>
            </div>

            <div className="flex gap-3">
                {session.status === 'approved' && isToday && (
                    <button className="flex-1 bg-white text-royal font-semibold py-3 px-4 rounded-lg hover:bg-royal/5 transition shadow-lg">
                        Join Session →
                    </button>
                )}
                <Link
                    to={`/student-dashboard?tab=sessions`}
                    className="flex-1 bg-white/10 backdrop-blur-sm text-white font-medium py-3 px-4 rounded-lg hover:bg-white/20 transition text-center border border-white/20"
                >
                    View Details
                </Link>
            </div>
        </div>
    );
};

// Helper functions
function getTimeUntil(date) {
    const now = new Date();
    const diff = date - now;

    if (diff < 0) return 'Started';
    if (diff < 3600000) { // Less than 1 hour
        const mins = Math.floor(diff / 60000);
        return `In ${mins} min${mins !== 1 ? 's' : ''}`;
    }
    if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        return `In ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return null;
}

function formatSessionDate(date) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatSessionTime(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default NextSessionCard;
