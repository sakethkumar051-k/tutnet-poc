import { cn } from '../../lib/utils';

const SectionCard = ({ title, subtitle, children, actions, className, noPad }) => (
    <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm', className)}>
        {(title || actions) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                    {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
                    {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
        )}
        <div className={cn(!noPad && 'p-6')}>{children}</div>
    </div>
);

export default SectionCard;
