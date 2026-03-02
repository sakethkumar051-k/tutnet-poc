import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

const Footer = () => {
    return (
        <footer className="border-t bg-muted/30">
            <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="shadow-none bg-background/80">
                        <CardContent className="p-6">
                        <Link to="/" className="inline-block mb-4">
                            <img
                                src="/tutnet-logo.png"
                                alt="Tutnet Logo"
                                className="h-8"
                            />
                        </Link>
                        <p className="text-muted-foreground text-sm">
                            Connecting students with the best home tutors in West Hyderabad.
                        </p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none bg-background/80">
                        <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Button asChild variant="link" className="h-auto p-0"><Link to="/">Home</Link></Button></li>
                            <li><Button asChild variant="link" className="h-auto p-0"><Link to="/login">Login</Link></Button></li>
                            <li><Button asChild variant="link" className="h-auto p-0"><Link to="/register">Register</Link></Button></li>
                        </ul>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none bg-background/80">
                        <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Contact</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>Email: support@tutnet.com</li>
                            <li>Phone: +91 123 456 7890</li>
                            <li>Location: Hyderabad, India</li>
                        </ul>
                        </CardContent>
                    </Card>
                </div>
                <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} Tutnet. All rights reserved.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
