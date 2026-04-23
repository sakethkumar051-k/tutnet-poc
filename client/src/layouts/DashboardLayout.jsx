import { Outlet } from 'react-router-dom';
import { MyBookingsProvider } from '../context/MyBookingsContext';

/**
 * The dashboard has its own sidebar (see <Sidebar />) so we don't render the
 * public navbar here. The outlet component is expected to render the sidebar
 * itself alongside its main content.
 */
const DashboardLayout = () => {
    return (
        <div className="h-screen bg-[#f7f7f7] overflow-hidden">
            <MyBookingsProvider>
                <Outlet />
            </MyBookingsProvider>
        </div>
    );
};

export default DashboardLayout;
