const EmptyState = ({
    icon,
    title = 'No items found',
    description = 'Get started by creating your first item.',
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
    children
}) => (
    <div className="bg-white rounded-xl border border-gray-200 py-16 px-6">
        <div className="max-w-sm mx-auto text-center">
            {icon && (
                <div className="mb-5">
                    {typeof icon === 'string' && icon.length <= 2 ? (
                        <span className="text-4xl">{icon}</span>
                    ) : (
                        <div className="mx-auto w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                            {icon}
                        </div>
                    )}
                </div>
            )}
            <h3 className="text-base font-semibold text-navy-950 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">{description}</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                {actionLabel && onAction && (
                    <button
                        onClick={onAction}
                        className="px-4 py-2.5 bg-navy-950 text-white text-sm font-medium rounded-lg hover:bg-navy-900 transition-colors"
                    >
                        {actionLabel}
                    </button>
                )}
                {secondaryActionLabel && onSecondaryAction && (
                    <button
                        onClick={onSecondaryAction}
                        className="px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        {secondaryActionLabel}
                    </button>
                )}
            </div>
            {children}
        </div>
    </div>
);

export default EmptyState;
