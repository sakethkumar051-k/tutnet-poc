import { useState } from 'react';
import api from '../utils/api';
import { getBaseURL } from '../utils/api';
import { getAccessToken } from '../authToken';

/**
 * CalendarExportButton — downloads an ICS file of the current user's sessions.
 * Works for both students and tutors; the server decides which bookings to include.
 */
export default function CalendarExportButton({ compact = false, label = 'Add to Calendar' }) {
    const [busy, setBusy] = useState(false);

    const download = async () => {
        setBusy(true);
        try {
            // Use the api axios instance so the Bearer token is attached automatically,
            // then convert the text response into a download.
            const { data } = await api.get('/calendar/mine.ics', {
                responseType: 'text',
                transformResponse: [(d) => d]
            });
            const blob = new Blob([data], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tutnet-sessions-${new Date().toISOString().slice(0, 10)}.ics`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } finally {
            setBusy(false);
        }
    };

    // Avoid unused-import lint complaints for utilities kept for future subscription-URL flow.
    void getBaseURL; void getAccessToken;

    if (compact) {
        return (
            <button onClick={download} disabled={busy}
                title={label}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>
        );
    }

    return (
        <button onClick={download} disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-royal-dark bg-royal/5 hover:bg-royal/10 border border-royal/20 rounded-lg transition-colors disabled:opacity-50">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {busy ? 'Exporting…' : label}
        </button>
    );
}
