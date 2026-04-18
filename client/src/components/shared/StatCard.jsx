import { cn } from '../../lib/utils';

const StatCard = ({ label, value, icon, footer, trend, className }) => (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow transition-shadow', className)}>
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{value}</p>
                {trend && (
                    <p className={cn('text-xs font-medium mt-1', trend > 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {trend > 0 ? '+' : ''}{trend}% from last week
                    </p>
                )}
            </div>
            {icon && (
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                    {icon}
                </div>
            )}
        </div>
        {footer && <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">{footer}</p>}
    </div>
);

export default StatCard;
