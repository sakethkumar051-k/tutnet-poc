import { useEffect, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useBookingStore } from '../stores/bookingStore';

/** Keeps bookingStore in sync with the logged-in student/tutor. */
export function MyBookingsProvider({ children }) {
    const user = useAuthStore((s) => s.user);

    useEffect(() => {
        useBookingStore.getState().initForUser(user);
    }, [user]);

    return children;
}

export function useMyBookings() {
    const bookings = useBookingStore((s) => s.bookings);
    const loading = useBookingStore((s) => s.loading);
    const error = useBookingStore((s) => s.error);
    const fetch = useBookingStore((s) => s.fetch);

    return useMemo(
        () => ({
            bookings,
            loading,
            error,
            refreshBookings: () => fetch({ force: true })
        }),
        [bookings, loading, error, fetch]
    );
}
