import { cn } from '../../lib/utils';

const PageShell = ({ title, subtitle, badge, actions, children, className }) => (
    <div className={cn('space-y-6', className)}>
        {(title || actions) && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    {title && (
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-navy-950 tracking-tight">{title}</h1>
                            {badge}
                        </div>
                    )}
                    {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
        )}
        {children}
    </div>
);

export default PageShell;
