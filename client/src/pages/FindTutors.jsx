import TutorList from '../components/TutorList';

const FindTutors = () => (
    <div className="min-h-screen bg-[#FAFAF8]">
        {/* Hero header — editorial style */}
        <div className="bg-white border-b border-gray-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                <div className="max-w-xl">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                        <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-widest">Live tutors available</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight leading-[1.1]">
                        Find your perfect tutor
                    </h1>
                    <p className="text-gray-500 text-[15px] mt-3 leading-relaxed">
                        Every tutor is verified by our team. Start with a free trial — no payment, no commitment.
                    </p>
                </div>
            </div>
        </div>

        {/* Main content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <TutorList />
        </div>
    </div>
);

export default FindTutors;
