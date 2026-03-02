import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SessionCalendar = ({ currentTutorId, tutorId, studentId, subject, onBookingCreated, tutorName, studentName }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        if (d.getHours() >= 21) d.setDate(d.getDate() + 1);
        return d;
    });
    const [selectedTime, setSelectedTime] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);
    const [existingBookings, setExistingBookings] = useState([]);
    const [tutorAvailability, setTutorAvailability] = useState(null);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

    const timeSlots = [];
    for (let hour = 9; hour <= 21; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    useEffect(() => {
        if (user?.role === 'student' && tutorId) {
            api.get(`/tutors/profile-by-user/${tutorId}`)
                .then(({ data }) => setTutorAvailability(data))
                .catch(() => setTutorAvailability(null));
        } else {
            setTutorAvailability(null);
        }
    }, [user?.role, tutorId]);

    useEffect(() => {
        fetchExistingBookings();
    }, [selectedDate, tutorId, studentId]);

    function getSlotsForDay(date, weeklyAvailability) {
        if (!weeklyAvailability?.length) return timeSlots;
        const dayName = DAY_NAMES[date.getDay()];
        const daySlot = weeklyAvailability.find((x) => x.day === dayName);
        if (!daySlot?.slots?.length) return [];
        const slots = [];
        daySlot.slots.forEach(({ start, end }) => {
            if (!start || !end) return;
            const [sh, sm] = start.split(':').map(Number);
            const [eh] = end.split(':').map(Number);
            for (let h = sh; h < eh || (h === eh && sm === 0); h++) {
                slots.push(`${h.toString().padStart(2, '0')}:00`);
            }
        });
        return [...new Set(slots)].sort();
    }

    const fetchExistingBookings = async () => {
        try {
            const { data } = await api.get('/bookings/mine');
            const dateStr = selectedDate.toISOString().split('T')[0];
            const bookingsForDate = data.filter(booking => {
                if (booking.sessionDate) {
                    return booking.sessionDate.split('T')[0] === dateStr;
                }
                return booking.preferredSchedule && booking.preferredSchedule.includes(dateStr);
            });
            setExistingBookings(bookingsForDate);

            const bookedSlots = bookingsForDate.map(b => {
                if (b.sessionDate) {
                    return new Date(b.sessionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                }
                return null;
            }).filter(Boolean);

            const allowedByTutor = user?.role === 'student' && tutorAvailability
                ? getSlotsForDay(selectedDate, tutorAvailability.weeklyAvailability)
                : timeSlots;
            setAvailableSlots(allowedByTutor.filter(slot => !bookedSlots.includes(slot)));
        } catch (err) {
            setAvailableSlots(user?.role === 'student' && tutorAvailability
                ? getSlotsForDay(selectedDate, tutorAvailability?.weeklyAvailability) || timeSlots
                : timeSlots);
        }
    };

    const handleDateSelect = (date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        if (d < today) return;
        setSelectedDate(date);
        setSelectedTime('');
    };

    const isPastDate = (day) => {
        const d = new Date(year, month, day);
        d.setHours(0, 0, 0, 0);
        return d < today;
    };

    const handleBooking = async () => {
        if (!selectedTime) {
            showError('Please select a time slot');
            return;
        }
        const dateTime = new Date(selectedDate);
        const [hours, minutes] = selectedTime.split(':');
        dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        if (dateTime < new Date()) {
            showError('Cannot book a session in the past. Please choose a future date and time.');
            return;
        }

        setLoading(true);
        try {
            const preferredSchedule = `${selectedDate.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })} at ${selectedTime}`;

            const bookingData = {
                subject: subject,
                preferredSchedule: preferredSchedule,
                sessionDate: dateTime.toISOString()
            };

            // Set tutor and student IDs based on role
            if (user?.role === 'student') {
                bookingData.tutorId = tutorId;
            } else if (user?.role === 'tutor') {
                bookingData.studentId = studentId;
            }

            // Check if there's an existing current tutor relationship
            if (currentTutorId) {
                bookingData.currentTutorId = currentTutorId;
            }

            await api.post('/bookings', bookingData);
            showSuccess('Session booked successfully!');
            setSelectedTime('');
            fetchExistingBookings();
            onBookingCreated?.();
        } catch (err) {
            console.error('Booking error:', err);
            console.error('Error response:', err.response);

            // Extract and display error message
            const errorMessage = err.response?.data?.message || 'Failed to book session';
            const errorCode = err.response?.data?.code;

            // Show detailed error to user
            if (errorCode) {
                showError(`${errorMessage} (Error code: ${errorCode})`);
            } else if (err.response?.status === 400) {
                showError(`Booking validation failed: ${errorMessage}`);
            } else if (err.response?.status === 404) {
                showError(`Tutor not found: ${errorMessage}`);
            } else if (err.response?.status === 403) {
                showError(`Not authorized: ${errorMessage}`);
            } else {
                showError(errorMessage);
            }

            // Also alert for visibility during debugging
            alert(`Booking failed: ${errorMessage}\n\nPlease check the browser console (F12) for more details.`);
        } finally {
            setLoading(false);
        }
    };

    // Get days in month
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
    }
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        days.push(day);
    }

    const isToday = (day) => {
        const today = new Date();
        return day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();
    };

    const isSelected = (day) => {
        return day === selectedDate.getDate() &&
            month === selectedDate.getMonth() &&
            year === selectedDate.getFullYear();
    };

    const hasBooking = (day) => {
        const dateStr = new Date(year, month, day).toISOString().split('T')[0];
        return existingBookings.some(booking => {
            if (booking.sessionDate) {
                return booking.sessionDate.split('T')[0] === dateStr;
            }
            return booking.preferredSchedule.includes(dateStr);
        });
    };

    const navigateMonth = (direction) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(month + direction);
        setSelectedDate(newDate);
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="mb-5 pb-4 border-b border-gray-200">
                <h3 className="text-base font-bold text-gray-900 mb-2">Book a Session</h3>
                {user?.role === 'student' && tutorName && (
                    <p className="text-sm text-gray-600">
                        With <span className="font-semibold text-gray-900">{tutorName}</span>
                        {subject && <span> - {subject}</span>}
                    </p>
                )}
                {user?.role === 'tutor' && studentName && (
                    <p className="text-sm text-gray-600">
                        With <span className="font-semibold text-gray-900">{studentName}</span>
                        {subject && <span> - {subject}</span>}
                    </p>
                )}
            </div>

            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 hover:bg-gray-100 rounded-md"
                >
                    ←
                </button>
                <h4 className="text-lg font-semibold">
                    {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h4>
                <button
                    onClick={() => navigateMonth(1)}
                    className="p-2 hover:bg-gray-100 rounded-md"
                >
                    →
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                        {day}
                    </div>
                ))}
                {days.map((day, index) => {
                    const past = day && isPastDate(day);
                    return (
                    <button
                        key={index}
                        onClick={() => day && !past && handleDateSelect(new Date(year, month, day))}
                        onKeyDown={(e) => {
                            if (day && !past && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                handleDateSelect(new Date(year, month, day));
                            }
                        }}
                        disabled={!day || past}
                        aria-label={day ? `Select ${new Date(year, month, day).toLocaleDateString()}` : undefined}
                        className={`
                            p-2 text-sm rounded-md transition-all duration-200
                            ${!day ? 'cursor-default invisible' : past ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500'}
                            ${day && !past && isToday(day) ? 'bg-blue-100 font-semibold ring-2 ring-blue-300' : ''}
                            ${day && !past && isSelected(day) ? 'bg-indigo-600 text-white shadow-md' : ''}
                            ${day && !past && hasBooking(day) ? 'ring-2 ring-green-500' : ''}
                        `}
                    >
                        {day}
                        {day && !past && hasBooking(day) && (
                            <span className="block w-1 h-1 bg-green-500 rounded-full mx-auto mt-1" />
                        )}
                    </button>
                );})}
            </div>

            {/* Time Selection */}
            {selectedDate && (
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Time
                    </label>
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {(tutorAvailability && user?.role === 'student' ? availableSlots : timeSlots).map(slot => {
                            const isBooked = existingBookings.some(booking => {
                                if (booking.sessionDate) {
                                    const bookingTime = new Date(booking.sessionDate).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    });
                                    return bookingTime === slot;
                                }
                                return false;
                            });

                            return (
                                <button
                                    key={slot}
                                    onClick={() => !isBooked && setSelectedTime(slot)}
                                    onKeyDown={(e) => {
                                        if (!isBooked && (e.key === 'Enter' || e.key === ' ')) {
                                            e.preventDefault();
                                            setSelectedTime(slot);
                                        }
                                    }}
                                    disabled={isBooked}
                                    aria-label={isBooked ? `${slot} - Booked` : `Select ${slot}`}
                                    className={`
                                        px-3 py-2 text-sm rounded-md border transition-all duration-200
                                        ${isBooked
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                            : selectedTime === slot
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                                        }
                                    `}
                                >
                                    {slot}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Book Button */}
            {selectedDate && selectedTime && (
                <button
                    onClick={handleBooking}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleBooking();
                        }
                    }}
                    disabled={loading}
                    className="w-full mt-4 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Booking...
                        </>
                    ) : (
                        <span>Request Class for {selectedDate.toLocaleDateString()} at {selectedTime}</span>
                    )}
                </button>
            )}
        </div>
    );
};

export default SessionCalendar;

