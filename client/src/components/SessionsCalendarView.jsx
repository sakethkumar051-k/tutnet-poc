import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * SessionsCalendarView
 * --------------------
 * A clean, standalone month calendar for the Sessions tab.
 * No tutor-picker clutter. No duplicate "Book a Session" cards.
 *
 * Left: month grid with dots on days that have sessions.
 * Right: selected-day detail panel with inline actions.
 */
export default function SessionsCalendarView({ sessions = [], onSessionClick }) {
    const navigate = useNavigate();
    const [viewDate, setViewDate] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });

    // Group sessions by YYYY-MM-DD
    const sessionsByDay = useMemo(() => {
        const map = new Map();
        for (const s of sessions) {
            if (!s.sessionDate) continue;
            const d = new Date(s.sessionDate);
            const key = ymd(d);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(s);
        }
        return map;
    }, [sessions]);

    const selectedDayKey = ymd(selectedDate);
    const selectedDaySessions = sessionsByDay.get(selectedDayKey) || [];

    // Build the month grid (lead + trail days from neighbour months)
    const days = useMemo(() => buildMonthGrid(viewDate), [viewDate]);

    const monthLabel = viewDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const todayKey = ymd(new Date());

    const prevMonth = () => {
        const d = new Date(viewDate); d.setDate(1); d.setMonth(d.getMonth() - 1);
        setViewDate(d);
    };
    const nextMonth = () => {
        const d = new Date(viewDate); d.setDate(1); d.setMonth(d.getMonth() + 1);
        setViewDate(d);
    };
    const goToToday = () => {
        const d = new Date(); d.setHours(0, 0, 0, 0);
        setViewDate(d);
        setSelectedDate(d);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
            {/* Calendar card */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 lg:p-7">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-extrabold text-navy-950 tracking-tight">{monthLabel}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {sessions.length} session{sessions.length === 1 ? '' : 's'} scheduled
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <IconBtn onClick={prevMonth} label="Previous month" icon="‹" />
                        <button
                            onClick={goToToday}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                        >Today</button>
                        <IconBtn onClick={nextMonth} label="Next month" icon="›" />
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                        <div key={d} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center py-2">
                            {d}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {days.map((d, i) => {
                        const key = ymd(d.date);
                        const ds = sessionsByDay.get(key) || [];
                        const isToday = key === todayKey;
                        const isSelected = key === selectedDayKey;
                        const isCurMonth = d.inMonth;
                        return (
                            <button
                                key={i}
                                onClick={() => setSelectedDate(d.date)}
                                className={`relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                                    isSelected
                                        ? 'bg-navy-950 text-white'
                                        : isToday
                                            ? 'bg-lime/25 text-navy-950 ring-1 ring-lime/40'
                                            : isCurMonth
                                                ? 'text-navy-950 hover:bg-gray-50'
                                                : 'text-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <span className="text-sm font-semibold">{d.date.getDate()}</span>
                                {ds.length > 0 && (
                                    <div className="flex items-center gap-0.5">
                                        {ds.slice(0, 3).map((_, k) => (
                                            <span key={k} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-lime' : 'bg-royal'}`} />
                                        ))}
                                        {ds.length > 3 && (
                                            <span className={`text-[8px] font-bold ml-0.5 ${isSelected ? 'text-lime' : 'text-royal'}`}>+{ds.length - 3}</span>
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-5 pt-5 border-t border-gray-100 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-royal" /> Session scheduled
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-lime/40 ring-1 ring-lime/60" /> Today
                    </span>
                </div>
            </div>

            {/* Selected-day side panel */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6">
                <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Selected day</p>
                <h3 className="text-xl font-extrabold text-navy-950 tracking-tight mt-1">
                    {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>

                <div className="mt-5 space-y-3">
                    {selectedDaySessions.length === 0 ? (
                        <div className="py-8 text-center">
                            <div className="w-10 h-10 mx-auto rounded-full bg-gray-50 flex items-center justify-center mb-3">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="text-sm font-semibold text-navy-950">No sessions this day</p>
                            <p className="text-xs text-gray-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                                Pick another day from the calendar or book a new session.
                            </p>
                            <button
                                onClick={() => navigate('/find-tutors')}
                                className="mt-4 px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white text-xs font-bold rounded-full transition-colors"
                            >
                                Find a tutor
                            </button>
                        </div>
                    ) : (
                        selectedDaySessions
                            .sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate))
                            .map((s) => <DayPanelRow key={s._id} session={s} onClick={() => onSessionClick?.(s)} />)
                    )}
                </div>
            </div>
        </div>
    );
}

function DayPanelRow({ session, onClick }) {
    const time = session.sessionDate
        ? new Date(session.sessionDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '';
    const tutorName = session.tutorId?.name || session.studentId?.name || 'Session';
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-royal/30 hover:bg-royal/[0.02] transition-all"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-navy-950 truncate">{session.subject}</p>
                    <p className="text-xs text-gray-500 truncate">with {tutorName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-royal">{time}</p>
                    <StatusBadge status={session.status} compact />
                </div>
            </div>
        </button>
    );
}

function StatusBadge({ status, compact }) {
    const cls = {
        approved: 'bg-lime/30 text-navy-950',
        pending: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-royal/10 text-royal-dark',
        rejected: 'bg-rose-100 text-rose-700',
        cancelled: 'bg-gray-100 text-gray-600'
    }[status] || 'bg-gray-100 text-gray-600';
    return <span className={`inline-flex items-center ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-xs'} rounded-full font-bold uppercase tracking-wide ${cls}`}>{status}</span>;
}

function IconBtn({ onClick, label, icon }) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-navy-950 transition-colors text-lg font-bold"
        >{icon}</button>
    );
}

// ── helpers ───────────────────────────────────────────────────────────

function ymd(d) {
    if (!d) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildMonthGrid(refDate) {
    const first = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const firstWeekday = (first.getDay() + 6) % 7; // Mon=0..Sun=6
    const daysInMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).getDate();
    const days = [];

    // Lead days (previous month)
    for (let i = firstWeekday; i > 0; i--) {
        const d = new Date(first);
        d.setDate(first.getDate() - i);
        d.setHours(0, 0, 0, 0);
        days.push({ date: d, inMonth: false });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(refDate.getFullYear(), refDate.getMonth(), i);
        days.push({ date: d, inMonth: true });
    }
    // Trail days (next month) until we fill 6 rows (42 cells)
    while (days.length % 7 !== 0 || days.length < 42) {
        const last = days[days.length - 1].date;
        const d = new Date(last);
        d.setDate(last.getDate() + 1);
        days.push({ date: d, inMonth: d.getMonth() === refDate.getMonth() });
        if (days.length >= 42) break;
    }
    return days;
}
