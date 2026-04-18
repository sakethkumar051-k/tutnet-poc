import { useEffect } from 'react';

/**
 * Locks scroll on <body> while mounted. Restores the previous overflow value
 * on unmount so nested modals compose cleanly.
 *
 * Counts active locks so multiple modals at once don't prematurely release
 * the lock when one of them closes.
 */
let lockCount = 0;
let previousOverflow = '';
let previousPaddingRight = '';

export default function useBodyScrollLock(active = true) {
    useEffect(() => {
        if (!active) return undefined;

        if (lockCount === 0) {
            previousOverflow = document.body.style.overflow;
            previousPaddingRight = document.body.style.paddingRight;
            // Compensate for the scrollbar width so the page doesn't shift.
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }
            document.body.style.overflow = 'hidden';
        }
        lockCount += 1;

        return () => {
            lockCount -= 1;
            if (lockCount <= 0) {
                lockCount = 0;
                document.body.style.overflow = previousOverflow;
                document.body.style.paddingRight = previousPaddingRight;
            }
        };
    }, [active]);
}
