import { useState } from 'react';

const Contact = () => {
    const [status, setStatus] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setStatus('Message sent! We will get back to you soon.');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-8">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold text-navy-950">Contact Us</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Have questions? We're here to help.
                        </p>
                    </div>

                    {status ? (
                        <div className="bg-lime/20 text-navy-950 p-4 rounded-md text-center">
                            {status}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                                <input type="text" id="name" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-royal focus:border-royal sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" id="email" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-royal focus:border-royal sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                                <textarea id="message" rows="4" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-royal focus:border-royal sm:text-sm"></textarea>
                            </div>
                            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-royal hover:bg-royal-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-royal">
                                Send Message
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Contact;
