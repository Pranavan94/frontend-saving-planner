import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { formatCurrency } from './goalUtils';

const PROGRESS_COLORS = {
    reached: '#20e0db',
    onTrack: '#31c1ff',
    behind: '#f6a609',
    track: '#e2ecf7',
};

const compactNumber = (value) => new Intl.NumberFormat('en-GB', {
    notation: 'compact',
    maximumFractionDigits: 1,
}).format(value);

export const ProgressDonut = ({ progressPct, reached, onTrack }) => {
    const clamped = Math.max(0, Math.min(progressPct, 100));
    const fill = reached
        ? PROGRESS_COLORS.reached
        : onTrack
            ? PROGRESS_COLORS.onTrack
            : PROGRESS_COLORS.behind;

    const data = [
        { name: 'Achieved', value: clamped },
        { name: 'Remaining', value: 100 - clamped },
    ];

    return (
        <div className="goal-donut">
            <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        innerRadius={62}
                        outerRadius={82}
                        paddingAngle={data[1].value > 0 ? 2 : 0}
                        stroke="none"
                    >
                        <Cell fill={fill} />
                        <Cell fill={PROGRESS_COLORS.track} />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="goal-donut-center">
                <span className="goal-donut-pct">{clamped.toFixed(0)}%</span>
                <span className="goal-donut-label">of goal</span>
            </div>
        </div>
    );
};

export const ProjectionChart = ({ series, targetAmount, currency }) => {
    if (!series || series.length <= 1) {
        return (
            <div className="goal-projection-empty">
                Add a target date to see a month-by-month projection toward your goal.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="projectedFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#31c1ff" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#31c1ff" stopOpacity={0.02} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eef8" vertical={false} />
                <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#5b6b80' }}
                    interval="preserveStartEnd"
                    minTickGap={28}
                />
                <YAxis
                    tick={{ fontSize: 11, fill: '#5b6b80' }}
                    tickFormatter={compactNumber}
                    width={48}
                />
                <Tooltip
                    formatter={(value, name) => [formatCurrency(value, currency), name === 'projected' ? 'Projected' : 'Target']}
                    labelStyle={{ color: '#0e1a2f', fontWeight: 600 }}
                    contentStyle={{ borderRadius: 10, border: '1px solid #d6e3f2' }}
                />
                <ReferenceLine
                    y={targetAmount}
                    stroke="#20e0db"
                    strokeDasharray="5 4"
                    label={{ value: 'Target', position: 'insideTopRight', fill: '#0d9488', fontSize: 11 }}
                />
                <Area
                    type="monotone"
                    dataKey="projected"
                    stroke="#1f8fd1"
                    strokeWidth={2}
                    fill="url(#projectedFill)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};
