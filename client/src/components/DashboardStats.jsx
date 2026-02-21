const DashboardStats = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((stat, index) => (
                <div
                    key={index}
                    className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
                >
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className={`rounded-md p-3 ${stat.bgColor || 'bg-indigo-100'}`}>
                                    <span className={`text-2xl ${stat.iconColor || 'text-indigo-600'}`}>
                                        {stat.icon}
                                    </span>
                                </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        {stat.label}
                                    </dt>
                                    <dd className="flex items-baseline">
                                        <div className="text-2xl font-semibold text-gray-900">
                                            {stat.value}
                                        </div>
                                        {stat.change && (
                                            <div className={`ml-2 flex items-baseline text-sm font-semibold ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {stat.change}
                                            </div>
                                        )}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    {stat.footer && (
                        <div className="bg-gray-50 px-5 py-3">
                            <div className="text-sm">
                                <span className="font-medium text-gray-700">
                                    {stat.footer}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default DashboardStats;
