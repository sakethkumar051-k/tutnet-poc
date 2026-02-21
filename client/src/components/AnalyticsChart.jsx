import { useEffect, useRef } from 'react';

const AnalyticsChart = ({ data, type = 'line', height = 200 }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data || data.length === 0) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (type === 'line') {
            // Draw grid lines
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 5; i++) {
                const y = padding + (chartHeight / 5) * i;
                ctx.beginPath();
                ctx.moveTo(padding, y);
                ctx.lineTo(width - padding, y);
                ctx.stroke();
            }

            // Draw line
            const maxValue = Math.max(...data.map(d => d.value));
            const minValue = Math.min(...data.map(d => d.value));
            const range = maxValue - minValue || 1;

            ctx.strokeStyle = '#4f46e5';
            ctx.lineWidth = 3;
            ctx.beginPath();

            data.forEach((point, index) => {
                const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
                const y = padding + chartHeight - ((point.value - minValue) / range) * chartHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();

            // Draw points
            ctx.fillStyle = '#4f46e5';
            data.forEach((point, index) => {
                const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
                const y = padding + chartHeight - ((point.value - minValue) / range) * chartHeight;
                
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw labels
            ctx.fillStyle = '#6b7280';
            ctx.font = '12px system-ui';
            ctx.textAlign = 'center';
            data.forEach((point, index) => {
                const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
                ctx.fillText(point.label || '', x, height - 10);
            });
        } else if (type === 'bar') {
            // Draw grid lines
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 5; i++) {
                const y = padding + (chartHeight / 5) * i;
                ctx.beginPath();
                ctx.moveTo(padding, y);
                ctx.lineTo(width - padding, y);
                ctx.stroke();
            }

            // Draw bars
            const maxValue = Math.max(...data.map(d => d.value));
            const barWidth = chartWidth / data.length * 0.6;
            const barSpacing = chartWidth / data.length;

            data.forEach((point, index) => {
                const barHeight = (point.value / maxValue) * chartHeight;
                const x = padding + barSpacing * index + (barSpacing - barWidth) / 2;
                const y = padding + chartHeight - barHeight;

                // Gradient
                const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
                gradient.addColorStop(0, '#6366f1');
                gradient.addColorStop(1, '#4f46e5');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, barWidth, barHeight);

                // Label
                ctx.fillStyle = '#6b7280';
                ctx.font = '11px system-ui';
                ctx.textAlign = 'center';
                ctx.fillText(point.label || '', x + barWidth / 2, height - 10);
            });
        }
    }, [data, type, height]);

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-400">
                <p className="text-sm">No data available</p>
            </div>
        );
    }

    return (
        <canvas
            ref={canvasRef}
            width={400}
            height={height}
            className="w-full"
        />
    );
};

export default AnalyticsChart;
