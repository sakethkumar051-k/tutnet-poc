import StatCard from './shared/StatCard';

const DashboardStats = ({ stats }) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((stat, index) => (
            <StatCard
                key={index}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                footer={stat.footer}
                trend={stat.trend}
            />
        ))}
    </div>
);

export default DashboardStats;
