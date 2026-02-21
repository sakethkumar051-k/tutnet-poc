const LoadingSpinner = ({ size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16'
    };

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <div className="relative">
                <div className={`${sizeClasses[size]} border-4 border-indigo-100 rounded-full`}></div>
                <div className={`${sizeClasses[size]} border-4 border-t-indigo-600 border-r-indigo-600 rounded-full animate-spin absolute top-0 left-0`}></div>
            </div>
        </div>
    );
};

export default LoadingSpinner;
