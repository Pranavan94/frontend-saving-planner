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
    const millisecondsPerMonth = 1000 * 60 * 60 * 24 * 30.4375;
    const diffMs = to.getTime() - from.getTime();

    if (diffMs <= 0) {
        return 0;
    }

    // Count partial future months so near-term target dates still produce a projection.
    return Math.max(1, Math.ceil(diffMs / millisecondsPerMonth));
};

const getMonthKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
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
    startDate,
    targetDate,
    monthlyContribution,
    monthlyContributionPlan = [],
    projectionAnchorDate,
    monthlyRate = 0,
}) => {
    const now = new Date();
    const parsedStart = startDate ? new Date(startDate) : null;
    const hasValidStart = parsedStart && !Number.isNaN(parsedStart.getTime());
    const parsedAnchor = projectionAnchorDate ? new Date(projectionAnchorDate) : null;
    const hasValidAnchor = parsedAnchor && !Number.isNaN(parsedAnchor.getTime());
    const projectionStart = hasValidAnchor
        ? parsedAnchor
        : (hasValidStart && parsedStart > now ? parsedStart : now);
    const projectionMonthStart = new Date(projectionStart.getFullYear(), projectionStart.getMonth(), 1);
    const series = [{
        label: formatDate(projectionStart),
        projected: Math.round(currentAmount),
        target: Math.round(targetAmount),
    }];

    const end = targetDate ? new Date(targetDate) : null;
    const remainingMonths = end ? monthsBetween(projectionStart, end) : 0;

    if (!end || remainingMonths <= 0) {
        return series;
    }

    // Cap rendered points to keep the chart readable on long horizons.
    const cappedMonths = Math.min(remainingMonths, 600);
    let balance = currentAmount;
    const contributionByMonthKey = (monthlyContributionPlan || []).reduce((acc, entry) => {
        const monthKey = getMonthKey(entry?.monthDate || entry?.month || entry?.date);
        if (!monthKey) {
            return acc;
        }

        acc[monthKey] = Number(entry?.amount) || 0;
        return acc;
    }, {});

    for (let month = 0; month < cappedMonths; month += 1) {
        const pointDate = new Date(projectionMonthStart.getFullYear(), projectionMonthStart.getMonth() + month, 1);
        const pointMonthKey = getMonthKey(pointDate);
        const contributionForMonth = Object.prototype.hasOwnProperty.call(contributionByMonthKey, pointMonthKey)
            ? contributionByMonthKey[pointMonthKey]
            : monthlyContribution;

        balance = balance * (1 + monthlyRate) + contributionForMonth;
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
    startDate,
    targetDate,
    monthlyContribution = 0,
    monthlyContributionPlan = [],
    projectionAnchorDate,
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
        startDate,
        targetDate,
        monthlyContribution: safeContribution,
        monthlyContributionPlan,
        projectionAnchorDate,
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
