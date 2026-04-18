import { cn } from '../../lib/utils';

const FormField = ({
    label,
    name,
    type = 'text',
    value,
    onChange,
    placeholder,
    required,
    error,
    icon,
    className,
    children,
    ...props
}) => {
    const inputClasses = cn(
        'block w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 text-sm',
        'placeholder:text-gray-400 transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 focus:bg-white',
        icon && 'pl-10',
        error && 'border-red-300 focus:ring-red-500/10',
        className
    );

    return (
        <div>
            {label && (
                <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        {icon}
                    </div>
                )}
                {children || (
                    <input
                        id={name}
                        name={name}
                        type={type}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        required={required}
                        className={inputClasses}
                        {...props}
                    />
                )}
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
};

export default FormField;
