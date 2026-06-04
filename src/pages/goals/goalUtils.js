export const currencyOptions = [
    { code: 'NOK', label: 'Norwegian Krone' },
    { code: 'EUR', label: 'Euro' },
    { code: 'USD', label: 'US Dollar' },
    { code: 'GBP', label: 'British Pound' },
    { code: 'SEK', label: 'Swedish Krona' },
    { code: 'DKK', label: 'Danish Krone' },
];

export const formatCurrency = (value, currency = 'NOK') => {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
        return '';
    }

    if (['NOK', 'DKK', 'SEK'].includes(currency)) {
        return `${new Intl.NumberFormat('en-GB', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(numericValue)} ${currency}`;
    }

    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(numericValue);
};

export const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(date);
};

export const formatDateForInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().split('T')[0];
};

const monthsBetween = (from, to) => {
    const years = to.getFullYear() - from.getFullYear();
    const months = to.getMonth() - from.getMonth();
    return years * 12 + months;
};

/**
 * Build a month-by-month projection of expected balance until the target date.
 * - monthlyRate (decimal, e.g. 0.0058 for ~7%/yr) compounds the balance each month.
 *   Pass 0 for a plain savings goal (linear growth).
 * - monthlyContribution is added at the end of each month.
 */
export const buildProjectionSeries = ({
    currentAmount,
    targetAmount,
    targetDate,
    monthlyContribution,
    monthlyRate = 0,
}) => {
    const now = new Date();
    const series = [{
        label: formatDate(now),
        projected: Math.round(currentAmount),
        target: Math.round(targetAmount),
    }];

    const end = targetDate ? new Date(targetDate) : null;
    const remainingMonths = end ? monthsBetween(now, end) : 0;

    if (!end || remainingMonths <= 0) {
        return series;
    }

    // Cap rendered points to keep the chart readable on long horizons.
    const cappedMonths = Math.min(remainingMonths, 600);
    let balance = currentAmount;

    for (let month = 1; month <= cappedMonths; month += 1) {
        balance = balance * (1 + monthlyRate) + monthlyContribution;
        const pointDate = new Date(now.getFullYear(), now.getMonth() + month, 1);
        series.push({
            label: formatDate(pointDate),
            projected: Math.round(balance),
            target: Math.round(targetAmount),
        });
    }

    return series;
};

/**
 * Derive headline numbers for a goal card.
 */
export const computeGoalStats = ({
    currentAmount = 0,
    targetAmount = 0,
    targetDate,
    monthlyContribution = 0,
    annualReturnRate = 0,
}) => {
    const safeCurrent = Number(currentAmount) || 0;
    const safeTarget = Number(targetAmount) || 0;
    const safeContribution = Number(monthlyContribution) || 0;
    const monthlyRate = (Number(annualReturnRate) || 0) / 100 / 12;

    const progressPct = safeTarget > 0
        ? Math.min((safeCurrent / safeTarget) * 100, 100)
        : 0;
    const remaining = Math.max(safeTarget - safeCurrent, 0);

    const series = buildProjectionSeries({
        currentAmount: safeCurrent,
        targetAmount: safeTarget,
        targetDate,
        monthlyContribution: safeContribution,
        monthlyRate,
    });

    const projectedFinal = series.length ? series[series.length - 1].projected : safeCurrent;
    const reached = safeCurrent >= safeTarget && safeTarget > 0;
    const onTrack = reached || projectedFinal >= safeTarget;

    return {
        progressPct,
        remaining,
        projectedFinal,
        reached,
        onTrack,
        monthlyRate,
        series,
    };
};
