import { Link } from 'react-router-dom';

const Footer = () => (
    <footer className="border-t bg-white">
        <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                    <Link to="/" className="inline-block mb-3">
                        <img src="/tutnet-logo.png" alt="Tutnet" className="h-6" />
                    </Link>
                    <p className="text-sm text-gray-500 max-w-xs">
                        Connecting students with the best home tutors in West Hyderabad.
                    </p>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Links</h3>
                    <ul className="space-y-2 text-sm">
                        <li><Link to="/" className="text-gray-500 hover:text-gray-900 transition-colors">Home</Link></li>
                        <li><Link to="/login" className="text-gray-500 hover:text-gray-900 transition-colors">Login</Link></li>
                        <li><Link to="/register" className="text-gray-500 hover:text-gray-900 transition-colors">Register</Link></li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact</h3>
                    <ul className="space-y-2 text-sm text-gray-500">
                        <li>support@tutnet.com</li>
                        <li>+91 123 456 7890</li>
                        <li>Hyderabad, India</li>
                    </ul>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
                &copy; {new Date().getFullYear()} Tutnet. All rights reserved.
            </div>
        </div>
    </footer>
);

export default Footer;
