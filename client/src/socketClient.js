import { io } from 'socket.io-client';
import { getBaseURL } from './utils/api';
import { getAccessToken } from './authToken';
import { useBookingStore } from './stores/bookingStore';
import { useNotificationStore } from './stores/notificationStore';

let socket = null;
let lastToken = null;

function apiOrigin() {
    return getBaseURL().replace(/\/api\/?$/, '');
}

function resetSocketInstance() {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
}

/** Call on logout — clears token binding and disconnects. */
export function teardownSocket() {
    lastToken = null;
    resetSocketInstance();
}

/**
 * Keeps one authenticated Socket.IO connection for the logged-in user.
 * Subscribes to `bookings:invalidate` → refetches booking store.
 */
export function syncSocketWithAuth(user) {
    const token = getAccessToken();
    if (!user || user._tokenOnly || !token) {
        teardownSocket();
        return;
    }
    if (socket && lastToken === token) {
        if (!socket.connected) socket.connect();
        return;
    }
    lastToken = token;
    resetSocketInstance();

    socket = io(apiOrigin(), {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
    });

    socket.on('bookings:invalidate', () => {
        useBookingStore.getState().fetch({ force: true });
    });

    // Real-time notifications — push into the store, which handles toast + badge.
    socket.on('notification:new', (payload) => {
        const notif = payload?.notification;
        if (notif) useNotificationStore.getState().handleSocketNew(notif);
    });
}

export function getSocket() {
    return socket;
}
