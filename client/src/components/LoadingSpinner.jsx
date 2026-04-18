import { cn } from '../lib/utils';

const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-[3px]',
    xl: 'w-16 h-16 border-4',
};

const LoadingSpinner = ({ size = 'md', className = '' }) => (
    <div className={cn('flex items-center justify-center', className)}>
        <div className={cn('rounded-full border-gray-200 border-t-gray-800 animate-spin', sizeMap[size])} />
    </div>
);

export default LoadingSpinner;
