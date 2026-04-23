import { cn } from '../../lib/utils';

const variants = {
    success: 'bg-lime/20 text-navy-950 border-lime/30',
    warning: 'bg-lime/20 text-navy-950 border-lime/30',
    error: 'bg-red-50 text-red-700 border-red-100',
    info: 'bg-royal/5 text-royal-dark border-royal/20',
    neutral: 'bg-gray-50 text-gray-600 border-gray-200',
};

const statusMap = {
    approved: 'success',
    completed: 'success',
    active: 'success',
    pending: 'warning',
    rejected: 'error',
    cancelled: 'error',
    failed: 'error',
};

const StatusBadge = ({ status, label, variant, className }) => {
    const resolvedVariant = variant || statusMap[status] || 'neutral';
    const displayLabel = label || status;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize',
                variants[resolvedVariant],
                className
            )}
        >
            <span
                className={cn('w-1.5 h-1.5 rounded-full', {
                    'bg-lime': resolvedVariant === 'success',
                    'bg-lime': resolvedVariant === 'warning',
                    'bg-red-500': resolvedVariant === 'error',
                    'bg-royal/50': resolvedVariant === 'info',
                    'bg-gray-400': resolvedVariant === 'neutral',
                })}
            />
            {displayLabel}
        </span>
    );
};

export default StatusBadge;
