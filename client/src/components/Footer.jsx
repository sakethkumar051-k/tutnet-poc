import { Link } from 'react-router-dom';

const Footer = () => (
    <footer className="bg-navy-950 border-t border-white/5">
        <div className="max-w-[1300px] mx-auto px-6 lg:px-10 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link to="/" className="inline-block">
                        <img src="/tutnet-logo.png" alt="Tutnet" className="h-5 brightness-0 invert opacity-60" />
                    </Link>
                    <span className="text-xs text-gray-600">|</span>
                    <p className="text-xs text-gray-600">
                        &copy; {new Date().getFullYear()} Tutnet. All rights reserved.
                    </p>
                </div>
                <div className="flex items-center gap-6 text-xs text-gray-600 flex-wrap justify-center">
                    <Link to="/pricing" className="hover:text-gray-400 transition-colors">Pricing</Link>
                    <Link to="/how-it-works" className="hover:text-gray-400 transition-colors">How it works</Link>
                    <Link to="/about" className="hover:text-gray-400 transition-colors">About</Link>
                    <Link to="/contact" className="hover:text-gray-400 transition-colors">Contact</Link>
                    <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
                    <Link to="/tutor-agreement" className="hover:text-gray-400 transition-colors">Tutor Agreement</Link>
                </div>
            </div>
        </div>
    </footer>
);

export default Footer;
