const EmptyState = ({ 
    icon,
    title = 'No items found', 
    description = 'Get started by creating your first item.',
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
    children 
}) => {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="max-w-md mx-auto text-center">
                {icon && (
                    <div className="mb-6">
                        {typeof icon === 'string' && icon.length <= 2 ? (
                            <div className="text-5xl mb-4">{icon}</div>
                        ) : (
                            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                                {icon}
                            </div>
                        )}
                    </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 mb-8 leading-relaxed max-w-md mx-auto">{description}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {actionLabel && onAction && (
                        <button
                            onClick={onAction}
                            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
                        >
                            {actionLabel}
                        </button>
                    )}
                    {secondaryActionLabel && onSecondaryAction && (
                        <button
                            onClick={onSecondaryAction}
                            className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                            {secondaryActionLabel}
                        </button>
                    )}
                </div>
                {children}
            </div>
        </div>
    );
};

export default EmptyState;

