import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
    return (
        <div className="min-h-screen bg-muted/20">
            <Outlet />
        </div>
    );
};

export default DashboardLayout;
