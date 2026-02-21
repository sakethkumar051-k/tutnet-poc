import { useState } from 'react';

const Tooltip = ({ children, content, position = 'top' }) => {
    const [show, setShow] = useState(false);

    const positionClasses = {
        top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
    };

    return (
        <div 
            className="relative inline-block"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            onFocus={() => setShow(true)}
            onBlur={() => setShow(false)}
        >
            {children}
            {show && (
                <div className={`absolute z-50 ${positionClasses[position]}`}>
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                        {content}
                        <div className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
                            position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
                            position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
                            position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
                            'right-full top-1/2 -translate-y-1/2 -mr-1'
                        }`}></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tooltip;

