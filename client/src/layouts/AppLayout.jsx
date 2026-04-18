import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const AppLayout = () => {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Navbar variant="public" />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default AppLayout;
