import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls the window to the top whenever the route changes.
 * Mount once, inside <Router>. Renders nothing.
 *
 * We intentionally ignore hash navigation (e.g. /page#section) — those should
 * keep the browser's native anchor behavior.
 */
const ScrollToTop = () => {
    const { pathname, hash } = useLocation();

    useEffect(() => {
        if (hash) return;
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname, hash]);

    return null;
};

export default ScrollToTop;
