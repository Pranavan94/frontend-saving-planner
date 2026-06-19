import { useEffect, useMemo, useState } from 'react';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import { FiCheckCircle, FiEdit2, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { authFetch } from '../../api/client';
import { ProgressDonut, ProjectionChart } from './GoalCharts';
import {
    computeGoalStats,
    currencyOptions,
    formatCurrency,
    formatDate,
    formatDateForInput,
} from './goalUtils';
import './Goals.css';

const toNonNegativeNumber = (value) => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
        return 0;
    }
    return Math.max(0, numericValue);
};

const roundToTwo = (value) => Math.round(toNonNegativeNumber(value) * 100) / 100;

const getTodayInputValue = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getElapsedMonthsSince = (startDateValue) => {
    if (!startDateValue) {
        return 0;
    }

    const startDate = new Date(startDateValue);
    if (Number.isNaN(startDate.getTime())) {
        return 0;
    }

    const diffMs = Date.now() - startDate.getTime();
    if (diffMs <= 0) {
        return 0;
    }

    const millisecondsPerMonth = 1000 * 60 * 60 * 24 * 30.4375;
    return Math.max(1, Math.ceil(diffMs / millisecondsPerMonth));
};

const normalizeLeadingZeros = (value) => {
    if (value === '' || value === null || value === undefined) {
        return '';
    }

    const stringValue = String(value);
    if (stringValue.includes('.')) {
        return stringValue;
    }

    return stringValue.replace(/^0+(\d)/, '$1');
};

const getGoalCurrentAmount = (goal) => toNonNegativeNumber(goal.currentAmount ?? goal.startingAmount ?? 0);

const getOverflowSortTimestamp = (goal) => {
    const sourceDate = goal?.targetDate || goal?.startDate;
    if (!sourceDate) {
        return Number.POSITIVE_INFINITY;
    }

    const timestamp = new Date(sourceDate).getTime();
    return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
};

const buildAdjustedCurrentAmounts = (goals) => {
    const adjustedByGoalId = {};
    let overflow = 0;

    (goals || []).forEach((goal) => {
        const goalId = String(goal.id);
        const targetAmount = toNonNegativeNumber(goal.targetAmount);
        const rawCurrent = getGoalCurrentAmount(goal);
        const cappedCurrent = roundToTwo(Math.min(rawCurrent, targetAmount));

        adjustedByGoalId[goalId] = cappedCurrent;
        overflow = roundToTwo(overflow + Math.max(rawCurrent - targetAmount, 0));
    });

    const goalsByPriority = [...(goals || [])].sort((left, right) => {
        const dateDiff = getOverflowSortTimestamp(left) - getOverflowSortTimestamp(right);
        if (dateDiff !== 0) {
            return dateDiff;
        }

        return String(left.id).localeCompare(String(right.id));
    });

    goalsByPriority.forEach((goal) => {
        if (overflow <= 0) {
            return;
        }

        const goalId = String(goal.id);
        const targetAmount = toNonNegativeNumber(goal.targetAmount);
        const currentAdjusted = toNonNegativeNumber(adjustedByGoalId[goalId]);
        const remainingNeed = roundToTwo(Math.max(targetAmount - currentAdjusted, 0));

        if (remainingNeed <= 0) {
            return;
        }

        const transfer = roundToTwo(Math.min(remainingNeed, overflow));
        adjustedByGoalId[goalId] = roundToTwo(currentAdjusted + transfer);
        overflow = roundToTwo(overflow - transfer);
    });

    return adjustedByGoalId;
};

const getMonthStartDate = (value) => {
    if (!value) {
        return null;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
};

const getMonthKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

const isGoalActiveForMonth = (goal, monthDate) => {
    const startMonth = getMonthStartDate(goal.startDate);
    const targetMonth = getMonthStartDate(goal.targetDate);

    if (!startMonth || !targetMonth) {
        return false;
    }

    return monthDate >= startMonth && monthDate <= targetMonth;
};

const buildMonthlyPlanningRows = (plans, goals, isInvestment) => {
    const dedupedByMonthKey = (plans || [])
        .map((plan) => {
            const monthDate = getMonthStartDate(plan?.startDate || plan?.endDate);

            if (!monthDate) {
                return null;
            }

            return {
                key: getMonthKey(monthDate),
                monthDate,
                pool: roundToTwo(isInvestment ? plan?.investments : plan?.savings),
            };
        })
        .filter(Boolean)
        .sort((left, right) => left.monthDate - right.monthDate)
        .reduce((acc, row) => {
            acc[row.key] = row;
            return acc;
        }, {});

    return Object.values(dedupedByMonthKey)
        .filter((row) => goals.some((goal) => isGoalActiveForMonth(goal, row.monthDate)))
        .map((row) => ({
            ...row,
            label: formatDate(row.monthDate),
        }));
};

const countFutureActiveMonths = (rows, startIndex, goal) => rows
    .slice(startIndex)
    .filter((row) => isGoalActiveForMonth(goal, row.monthDate)).length;

const buildSmartSuggestionPercentages = (rows, goals, remainingNeedByGoalId) => {
    const remainingByGoalId = { ...remainingNeedByGoalId };

    return rows.reduce((acc, row, rowIndex) => {
        const activeGoals = goals
            .filter((goal) => isGoalActiveForMonth(goal, row.monthDate) && toNonNegativeNumber(remainingByGoalId[String(goal.id)]) > 0.009)
            .sort((left, right) => getOverflowSortTimestamp(left) - getOverflowSortTimestamp(right));

        if (activeGoals.length === 0 || row.pool <= 0) {
            acc[row.key] = {};
            return acc;
        }

        const requiredAmountsByGoalId = activeGoals.reduce((goalAcc, goal) => {
            const goalId = String(goal.id);
            const monthsLeft = Math.max(countFutureActiveMonths(rows, rowIndex, goal), 1);
            goalAcc[goalId] = roundToTwo(toNonNegativeNumber(remainingByGoalId[goalId]) / monthsLeft);
            return goalAcc;
        }, {});

        const totalRequired = roundToTwo(
            activeGoals.reduce((sum, goal) => sum + toNonNegativeNumber(requiredAmountsByGoalId[String(goal.id)]), 0),
        );
        const scalingFactor = totalRequired > row.pool && totalRequired > 0
            ? row.pool / totalRequired
            : 1;

        let remainingPool = row.pool;
        const nextPercentages = {};

        activeGoals.forEach((goal, index) => {
            const goalId = String(goal.id);
            const requestedAmount = roundToTwo(requiredAmountsByGoalId[goalId] * scalingFactor);
            const remainingNeed = toNonNegativeNumber(remainingByGoalId[goalId]);
            const maxAssignable = roundToTwo(Math.min(remainingNeed, remainingPool));
            const amount = index === activeGoals.length - 1
                ? maxAssignable
                : roundToTwo(Math.min(requestedAmount, maxAssignable));

            nextPercentages[goalId] = row.pool > 0 ? roundToTwo((amount / row.pool) * 100) : 0;
            remainingByGoalId[goalId] = roundToTwo(Math.max(remainingNeed - amount, 0));
            remainingPool = roundToTwo(Math.max(remainingPool - amount, 0));
        });

        acc[row.key] = nextPercentages;
        return acc;
    }, {});
};

const getAllocationStorageKey = (apiPath) => `goals-allocation:${apiPath}`;

const readAllocationsFromStorage = (storageKey) => {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writeAllocationsToStorage = (storageKey, allocations) => {
    try {
        localStorage.setItem(storageKey, JSON.stringify(allocations));
    } catch {
        // Ignore storage errors (e.g. private mode quota limits).
    }
};

const hasOwnNumber = (value) => value !== null && value !== undefined && value !== '';

const buildPersistedOverridesByMonth = (goals) => (goals || []).reduce((acc, goal) => {
    const goalId = String(goal.id);

    (goal.monthlyAllocationOverrides || []).forEach((override) => {
        if (!override?.month || !hasOwnNumber(override.overridePercentage)) {
            return;
        }

        if (!acc[override.month]) {
            acc[override.month] = {};
        }

        acc[override.month][goalId] = roundToTwo(override.overridePercentage);
    });

    return acc;
}, {});

const buildEmptyForm = (isInvestment) => ({
    purpose: '',
    targetAmount: '',
    startDate: getTodayInputValue(),
    targetDate: '',
    startingAmount: '',
    defaultAllocationPercentage: '',
    ...(isInvestment ? { expectedAnnualReturnRate: '' } : {}),
});

const validateForm = (values, isInvestment) => {
    const errors = {};

    if (!String(values.purpose).trim()) {
        errors.purpose = 'Purpose is required.';
    }
    if (values.targetAmount === '' || Number(values.targetAmount) <= 0) {
        errors.targetAmount = 'Target amount must be greater than zero.';
    }
    if (values.startingAmount !== '' && Number(values.startingAmount) < 0) {
        errors.startingAmount = 'Starting amount cannot be negative.';
    }
    if (values.defaultAllocationPercentage !== '') {
        const defaultPercentage = Number(values.defaultAllocationPercentage);
        if (Number.isNaN(defaultPercentage) || defaultPercentage < 0 || defaultPercentage > 100) {
            errors.defaultAllocationPercentage = 'Default allocation percentage must be between 0 and 100.';
        }
    }
    if (!values.startDate) {
        errors.startDate = 'Start date is required.';
    }
    if (!values.targetDate) {
        errors.targetDate = 'Target date is required.';
    }
    if (values.startDate && values.targetDate && new Date(values.targetDate) < new Date(values.startDate)) {
        errors.targetDate = 'Target date must be after the start date.';
    }
    if (isInvestment && values.expectedAnnualReturnRate !== '' && Number(values.expectedAnnualReturnRate) < 0) {
        errors.expectedAnnualReturnRate = 'Return rate cannot be negative.';
    }

    return errors;
};

const GoalsPage = ({
    apiPath,
    isInvestment = false,
    eyebrow,
    title,
    subtitle,
    heroClass = '',
    contributionLabel,
    addLabel,
    entityLabel,
}) => {
    const [goals, setGoals] = useState([]);
    const [currency, setCurrency] = useState('NOK');
    const [loading, setLoading] = useState(true);
    const [monthlyPlans, setMonthlyPlans] = useState([]);
    const [allocationOverridesByMonth, setAllocationOverridesByMonth] = useState({});
    const [overrideVisibilityByMonth, setOverrideVisibilityByMonth] = useState({});
    const [allocationSaveStatus, setAllocationSaveStatus] = useState({ type: '', message: '' });
    const [savingAllocations, setSavingAllocations] = useState(false);
    const [modal, setModal] = useState({
        show: false,
        mode: 'create',
        id: null,
        values: buildEmptyForm(isInvestment),
        errors: {},
    });
    const allocationStorageKey = getAllocationStorageKey(apiPath);
    const adjustedCurrentByGoalId = useMemo(() => buildAdjustedCurrentAmounts(goals), [goals]);
    const getAdjustedCurrentAmount = (goal) => {
        const goalId = String(goal.id);
        if (Object.prototype.hasOwnProperty.call(adjustedCurrentByGoalId, goalId)) {
            return toNonNegativeNumber(adjustedCurrentByGoalId[goalId]);
        }

        return getGoalCurrentAmount(goal);
    };
    const getAdjustedRemainingNeed = (goal) => {
        const targetAmount = toNonNegativeNumber(goal.targetAmount);
        return roundToTwo(Math.max(targetAmount - getAdjustedCurrentAmount(goal), 0));
    };
    const completedGoalById = useMemo(
        () => goals.reduce((acc, goal) => {
            const targetAmount = toNonNegativeNumber(goal.targetAmount);
            const adjustedCurrent = toNonNegativeNumber(adjustedCurrentByGoalId[String(goal.id)]);
            const remainingNeed = roundToTwo(Math.max(targetAmount - adjustedCurrent, 0));
            acc[String(goal.id)] = targetAmount > 0 && remainingNeed <= 0;
            return acc;
        }, {}),
        [goals, adjustedCurrentByGoalId],
    );
    const inProgressGoals = useMemo(
        () => goals.filter((goal) => !completedGoalById[String(goal.id)]),
        [goals, completedGoalById],
    );
    const finishedGoals = useMemo(
        () => goals.filter((goal) => completedGoalById[String(goal.id)]),
        [goals, completedGoalById],
    );
    const persistedDefaultPercentageByGoalId = useMemo(
        () => inProgressGoals.reduce((acc, goal) => {
            if (hasOwnNumber(goal.defaultAllocationPercentage)) {
                acc[String(goal.id)] = roundToTwo(goal.defaultAllocationPercentage);
            }
            return acc;
        }, {}),
        [inProgressGoals],
    );
    const persistedOverridesByMonth = useMemo(
        () => buildPersistedOverridesByMonth(inProgressGoals),
        [inProgressGoals],
    );
    const remainingNeedByGoalId = useMemo(
        () => inProgressGoals.reduce((acc, goal) => {
            const goalId = String(goal.id);
            const targetAmount = toNonNegativeNumber(goal.targetAmount);
            const adjustedCurrent = toNonNegativeNumber(adjustedCurrentByGoalId[goalId]);
            acc[goalId] = roundToTwo(Math.max(targetAmount - adjustedCurrent, 0));
            return acc;
        }, {}),
        [inProgressGoals, adjustedCurrentByGoalId],
    );
    const plannerRows = useMemo(
        () => buildMonthlyPlanningRows(monthlyPlans, inProgressGoals, isInvestment),
        [monthlyPlans, inProgressGoals, isInvestment],
    );
    const suggestedPercentagesByMonth = useMemo(
        () => buildSmartSuggestionPercentages(plannerRows, inProgressGoals, remainingNeedByGoalId),
        [plannerRows, inProgressGoals, remainingNeedByGoalId],
    );
    const mergedPercentagesByMonth = useMemo(
        () => plannerRows.reduce((acc, row) => {
            const rowOverrides = allocationOverridesByMonth[row.key] || {};
            const rowSuggestions = suggestedPercentagesByMonth[row.key] || {};

            if (Object.keys(rowOverrides).length === 0) {
                const activeGoalsForRow = inProgressGoals.filter((goal) => isGoalActiveForMonth(goal, row.monthDate));
                const weightedGoals = activeGoalsForRow.map((goal) => {
                    const goalId = String(goal.id);
                    return {
                        goalId,
                        weight: Object.prototype.hasOwnProperty.call(persistedDefaultPercentageByGoalId, goalId)
                            ? toNonNegativeNumber(persistedDefaultPercentageByGoalId[goalId])
                            : toNonNegativeNumber(rowSuggestions[goalId]),
                    };
                });
                const totalWeight = roundToTwo(weightedGoals.reduce((sum, goal) => sum + goal.weight, 0));
                let distributed = 0;

                acc[row.key] = inProgressGoals.reduce((goalAcc, goal) => {
                    goalAcc[String(goal.id)] = 0;
                    return goalAcc;
                }, {});

                weightedGoals.forEach((weightedGoal, index) => {
                    const percentage = totalWeight > 0
                        ? (index === weightedGoals.length - 1
                            ? roundToTwo(100 - distributed)
                            : roundToTwo((weightedGoal.weight / totalWeight) * 100))
                        : (index === weightedGoals.length - 1
                            ? roundToTwo(100 - distributed)
                            : roundToTwo(100 / Math.max(weightedGoals.length, 1)));

                    acc[row.key][weightedGoal.goalId] = percentage;
                    distributed = roundToTwo(distributed + percentage);
                });

                return acc;
            }

            acc[row.key] = inProgressGoals.reduce((goalAcc, goal) => {
                const goalId = String(goal.id);
                goalAcc[goalId] = roundToTwo(
                    Object.prototype.hasOwnProperty.call(rowOverrides, goalId)
                        ? rowOverrides[goalId]
                        : Object.prototype.hasOwnProperty.call(persistedDefaultPercentageByGoalId, goalId)
                            ? persistedDefaultPercentageByGoalId[goalId]
                            : rowSuggestions[goalId] || 0,
                );
                return goalAcc;
            }, {});

            return acc;
        }, {}),
        [plannerRows, inProgressGoals, allocationOverridesByMonth, persistedDefaultPercentageByGoalId, suggestedPercentagesByMonth],
    );
    const plannerRowsWithMetrics = useMemo(
        () => plannerRows.map((row) => {
            const percentages = mergedPercentagesByMonth[row.key] || {};
            const activeGoals = inProgressGoals
                .filter((goal) => isGoalActiveForMonth(goal, row.monthDate))
                .sort((left, right) => {
                    const dateDiff = getOverflowSortTimestamp(left) - getOverflowSortTimestamp(right);
                    if (dateDiff !== 0) {
                        return dateDiff;
                    }

                    return String(left.id).localeCompare(String(right.id));
                });
            const totalPct = roundToTwo(
                activeGoals.reduce((sum, goal) => sum + toNonNegativeNumber(percentages[String(goal.id)]), 0),
            );

            return {
                ...row,
                activeGoals,
                percentages,
                totalPct,
                remainingPct: roundToTwo(100 - totalPct),
                isBalanced: Math.abs(100 - totalPct) < 0.01 || activeGoals.length === 0,
            };
        }),
        [plannerRows, mergedPercentagesByMonth, inProgressGoals],
    );
    const hasPlannerRows = plannerRowsWithMetrics.length > 0;
    const isAllocationBalanced = plannerRowsWithMetrics.every((row) => row.isBalanced);

    const getAverageMonthlyProgress = (goal, currentAmount) => {
        const elapsedMonths = getElapsedMonthsSince(goal.startDate);

        if (elapsedMonths <= 0) {
            return null;
        }

        return roundToTwo(toNonNegativeNumber(currentAmount) / elapsedMonths);
    };

    const getProjectedContributionPlan = (goal) => {
        const goalId = String(goal.id);

        return plannerRowsWithMetrics
            .filter((row) => row.activeGoals.some((activeGoal) => String(activeGoal.id) === goalId))
            .map((row) => ({
                monthDate: row.monthDate,
                amount: roundToTwo((row.pool * toNonNegativeNumber(row.percentages[goalId])) / 100),
            }));
    };

    const getProjectionPlanFromCurrentPosition = (goal, currentAmount) => {
        const fullPlan = getProjectedContributionPlan(goal)
            .filter((entry) => entry.amount > 0.009)
            .sort((left, right) => left.monthDate - right.monthDate);

        if (fullPlan.length === 0) {
            return {
                openingAmount: currentAmount,
                remainingPlan: [],
                anchorDate: undefined,
            };
        }

        const startingBalance = toNonNegativeNumber(goal.startingAmount ?? 0);
        const contributedSoFar = roundToTwo(Math.max(toNonNegativeNumber(currentAmount) - startingBalance, 0));

        let coveredAmount = 0;
        let nextPlanIndex = 0;

        while (nextPlanIndex < fullPlan.length) {
            const nextAmount = toNonNegativeNumber(fullPlan[nextPlanIndex].amount);
            if (coveredAmount + nextAmount > contributedSoFar + 0.01) {
                break;
            }

            coveredAmount = roundToTwo(coveredAmount + nextAmount);
            nextPlanIndex += 1;
        }

        const remainingPlan = fullPlan.slice(nextPlanIndex);

        return {
            openingAmount: currentAmount,
            remainingPlan,
            anchorDate: remainingPlan[0]?.monthDate,
        };
    };

    const fetchGoals = async () => {
        try {
            const [goalsResult, plansResult] = await Promise.allSettled([
                authFetch(apiPath),
                authFetch('/api/v1/finance/overview'),
            ]);

            if (goalsResult.status === 'fulfilled') {
                const data = goalsResult.value;
                setGoals(Array.isArray(data) ? data : data.value || []);
            } else {
                console.error('Error fetching goals:', goalsResult.reason);
                setGoals([]);
            }

            if (plansResult.status === 'fulfilled') {
                const plansData = plansResult.value;
                const plans = Array.isArray(plansData) ? plansData : plansData.value || [];
                setMonthlyPlans(plans);
            } else {
                console.error('Error fetching monthly allocation pool:', plansResult.reason);
                setMonthlyPlans([]);
            }
        } catch (error) {
            console.error('Error fetching goals:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGoals();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiPath]);

    useEffect(() => {
        if (inProgressGoals.length === 0) {
            setAllocationOverridesByMonth({});
            setOverrideVisibilityByMonth({});
            return;
        }

        const hasPersistedBackendPlannerData = Object.keys(persistedOverridesByMonth).length > 0
            || Object.keys(persistedDefaultPercentageByGoalId).length > 0;

        if (hasPersistedBackendPlannerData) {
            setAllocationOverridesByMonth(persistedOverridesByMonth);
            setOverrideVisibilityByMonth({});
            return;
        }

        const savedAllocations = readAllocationsFromStorage(allocationStorageKey);
        setAllocationOverridesByMonth(savedAllocations);
        setOverrideVisibilityByMonth({});
    }, [inProgressGoals, allocationStorageKey, persistedDefaultPercentageByGoalId, persistedOverridesByMonth]);

    useEffect(() => {
        writeAllocationsToStorage(allocationStorageKey, allocationOverridesByMonth);
    }, [allocationOverridesByMonth, allocationStorageKey]);

    const openCreate = () => {
        setModal({
            show: true,
            mode: 'create',
            id: null,
            values: {
                ...buildEmptyForm(isInvestment),
                defaultAllocationPercentage: '',
            },
            errors: {},
        });
    };

    const openEdit = (goal) => {
        setModal({
            show: true,
            mode: 'edit',
            id: goal.id,
            values: {
                purpose: goal.purpose ?? '',
                targetAmount: goal.targetAmount ?? '',
                startDate: formatDateForInput(goal.startDate),
                targetDate: formatDateForInput(goal.targetDate),
                startingAmount: goal.startingAmount ?? '',
                defaultAllocationPercentage: goal.defaultAllocationPercentage ?? '',
                ...(isInvestment ? { expectedAnnualReturnRate: goal.expectedAnnualReturnRate ?? '' } : {}),
            },
            errors: {},
        });
    };

    const closeModal = () => setModal((prev) => ({ ...prev, show: false }));

    const handleFieldChange = (field, value) => {
        const nextValue = field === 'defaultAllocationPercentage'
            ? normalizeLeadingZeros(value)
            : value;

        setModal((prev) => ({
            ...prev,
            values: { ...prev.values, [field]: nextValue },
            errors: { ...prev.errors, [field]: '' },
        }));
    };

    const handleSave = async () => {
        const errors = validateForm(modal.values, isInvestment);
        if (Object.keys(errors).length > 0) {
            setModal((prev) => ({ ...prev, errors }));
            return;
        }

        const { values } = modal;
        const payload = {
            purpose: String(values.purpose).trim(),
            targetAmount: Number(values.targetAmount),
            startDate: values.startDate ? new Date(values.startDate).toISOString() : null,
            targetDate: values.targetDate ? new Date(values.targetDate).toISOString() : null,
            startingAmount: values.startingAmount === '' ? 0 : Number(values.startingAmount),
            defaultAllocationPercentage: values.defaultAllocationPercentage === ''
                ? null
                : Number(values.defaultAllocationPercentage),
            monthlyAllocationOverrides: modal.mode === 'edit' ? (goals.find((goal) => goal.id === modal.id)?.monthlyAllocationOverrides || []) : [],
            ...(isInvestment
                ? { expectedAnnualReturnRate: values.expectedAnnualReturnRate === '' ? 0 : Number(values.expectedAnnualReturnRate) }
                : {}),
        };

        try {
            const url = modal.mode === 'create' ? apiPath : `${apiPath}/${modal.id}`;
            await authFetch(url, {
                method: modal.mode === 'create' ? 'POST' : 'PUT',
                body: JSON.stringify(payload),
            });
            closeModal();
            fetchGoals();
        } catch (error) {
            console.error('Error saving goal:', error);
            setModal((prev) => ({ ...prev, errors: { ...prev.errors, form: error.message } }));
        }
    };

    const handleDelete = async (goalId) => {
        try {
            await authFetch(`${apiPath}/${goalId}`, { method: 'DELETE' });
            setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
        } catch (error) {
            console.error('Error deleting goal:', error);
        }
    };

    const handleAllocationChange = (monthKey, goalId, value) => {
        const goalIdKey = String(goalId);
        const requestedValue = value === '' ? 0 : roundToTwo(normalizeLeadingZeros(value));

        setAllocationOverridesByMonth((prev) => ({
            ...prev,
            [monthKey]: {
                ...(prev[monthKey] || {}),
                [goalIdKey]: requestedValue,
            },
        }));
        setOverrideVisibilityByMonth((prev) => ({
            ...prev,
            [monthKey]: {
                ...(prev[monthKey] || {}),
                [goalIdKey]: true,
            },
        }));

        setAllocationSaveStatus({ type: '', message: '' });
    };

    const handleAutoSplit = (monthKey) => {
        const suggestedPercentages = suggestedPercentagesByMonth[monthKey] || {};

        setAllocationOverridesByMonth((prev) => ({
            ...prev,
            [monthKey]: { ...suggestedPercentages },
        }));
        setOverrideVisibilityByMonth((prev) => {
            const next = { ...prev };
            delete next[monthKey];
            return next;
        });
        setAllocationSaveStatus({ type: '', message: '' });
    };

    const handleResetGoalToSuggestion = (monthKey, goalId) => {
        const goalIdKey = String(goalId);
        const plannerRow = plannerRowsWithMetrics.find((row) => row.key === monthKey);
        if (!plannerRow) {
            return;
        }

        const suggestedPercentages = suggestedPercentagesByMonth[monthKey] || {};
        const suggestedValue = roundToTwo(toNonNegativeNumber(suggestedPercentages[goalIdKey]));

        setAllocationOverridesByMonth((prev) => {
            const currentPercentages = plannerRow.percentages || {};
            const nextPercentages = plannerRow.activeGoals.reduce((acc, activeGoal) => {
                const activeGoalId = String(activeGoal.id);
                acc[activeGoalId] = roundToTwo(toNonNegativeNumber(currentPercentages[activeGoalId]));
                return acc;
            }, {});
            const currentValue = roundToTwo(toNonNegativeNumber(nextPercentages[goalIdKey]));
            const delta = roundToTwo(suggestedValue - currentValue);

            nextPercentages[goalIdKey] = suggestedValue;

            if (Math.abs(delta) > 0.009) {
                const otherGoalIds = plannerRow.activeGoals
                    .map((activeGoal) => String(activeGoal.id))
                    .filter((activeGoalId) => activeGoalId !== goalIdKey);

                const otherTotal = roundToTwo(
                    otherGoalIds.reduce((sum, activeGoalId) => sum + toNonNegativeNumber(nextPercentages[activeGoalId]), 0),
                );

                if (otherGoalIds.length > 0) {
                    let distributed = 0;

                    otherGoalIds.forEach((activeGoalId, index) => {
                        const currentOtherValue = toNonNegativeNumber(nextPercentages[activeGoalId]);
                        const reduction = delta > 0
                            ? (otherTotal > 0
                                ? roundToTwo((currentOtherValue / otherTotal) * delta)
                                : roundToTwo(delta / otherGoalIds.length))
                            : 0;
                        const increase = delta < 0
                            ? (otherTotal > 0
                                ? roundToTwo((currentOtherValue / otherTotal) * Math.abs(delta))
                                : roundToTwo(Math.abs(delta) / otherGoalIds.length))
                            : 0;
                        const nextValue = delta > 0
                            ? Math.max(0, roundToTwo(currentOtherValue - reduction))
                            : roundToTwo(currentOtherValue + increase);

                        if (index === otherGoalIds.length - 1) {
                            const runningTotal = roundToTwo(
                                Object.keys(nextPercentages)
                                    .filter((key) => key !== activeGoalId)
                                    .reduce((sum, key) => sum + toNonNegativeNumber(nextPercentages[key]), 0),
                            );
                            nextPercentages[activeGoalId] = roundToTwo(Math.max(0, 100 - runningTotal));
                        } else {
                            nextPercentages[activeGoalId] = nextValue;
                        }

                        distributed = roundToTwo(distributed + nextPercentages[activeGoalId]);
                    });
                }
            }

            const monthOverrides = { ...(prev[monthKey] || {}) };
            Object.keys(nextPercentages).forEach((activeGoalId) => {
                monthOverrides[activeGoalId] = roundToTwo(nextPercentages[activeGoalId]);
            });

            return {
                ...prev,
                [monthKey]: monthOverrides,
            };
        });
        setOverrideVisibilityByMonth((prev) => {
            const monthFlags = { ...(prev[monthKey] || {}) };
            delete monthFlags[goalIdKey];

            if (Object.keys(monthFlags).length === 0) {
                const next = { ...prev };
                delete next[monthKey];
                return next;
            }

            return {
                ...prev,
                [monthKey]: monthFlags,
            };
        });
        setAllocationSaveStatus({ type: '', message: '' });
    };

    const handleApplyMonthForward = (monthKey) => {
        const sourceRow = plannerRowsWithMetrics.find((row) => row.key === monthKey);
        const sourceRowIndex = plannerRowsWithMetrics.findIndex((row) => row.key === monthKey);

        if (!sourceRow || sourceRowIndex < 0 || !sourceRow.isBalanced) {
            return;
        }

        setAllocationOverridesByMonth((prev) => {
            const next = { ...prev };
            const sourcePercentages = sourceRow.percentages;

            plannerRowsWithMetrics.slice(sourceRowIndex + 1).forEach((targetRow) => {
                if (targetRow.activeGoals.length === 0) {
                    return;
                }

                const nextMonthPercentages = {};
                let copiedTotal = 0;
                const copiedGoalIds = [];

                targetRow.activeGoals.forEach((goal) => {
                    const goalId = String(goal.id);
                    const copiedValue = toNonNegativeNumber(sourcePercentages[goalId]);
                    if (copiedValue > 0) {
                        nextMonthPercentages[goalId] = copiedValue;
                        copiedTotal = roundToTwo(copiedTotal + copiedValue);
                        copiedGoalIds.push(goalId);
                    }
                });

                const remainingPct = roundToTwo(Math.max(100 - copiedTotal, 0));
                const targetSuggestions = suggestedPercentagesByMonth[targetRow.key] || {};
                const goalsToFill = targetRow.activeGoals.filter((goal) => !copiedGoalIds.includes(String(goal.id)));
                const fillTargets = goalsToFill.length > 0 ? goalsToFill : targetRow.activeGoals;
                const suggestionWeightTotal = roundToTwo(
                    fillTargets.reduce((sum, goal) => sum + toNonNegativeNumber(targetSuggestions[String(goal.id)]), 0),
                );

                if (remainingPct > 0) {
                    let distributedPct = 0;

                    fillTargets.forEach((goal, index) => {
                        const goalId = String(goal.id);
                        const weight = suggestionWeightTotal > 0
                            ? toNonNegativeNumber(targetSuggestions[goalId]) / suggestionWeightTotal
                            : 1 / fillTargets.length;
                        const addition = index === fillTargets.length - 1
                            ? roundToTwo(remainingPct - distributedPct)
                            : roundToTwo(remainingPct * weight);

                        nextMonthPercentages[goalId] = roundToTwo((nextMonthPercentages[goalId] || 0) + addition);
                        distributedPct = roundToTwo(distributedPct + addition);
                    });
                }

                next[targetRow.key] = nextMonthPercentages;
            });

            return next;
        });
        setOverrideVisibilityByMonth((prev) => {
            const next = { ...prev };
            plannerRowsWithMetrics.slice(sourceRowIndex + 1).forEach((targetRow) => {
                delete next[targetRow.key];
            });
            return next;
        });
        setAllocationSaveStatus({ type: 'ok', message: `Applied ${sourceRow.label} split to future months.` });
    };

    const handleAssignRemainingToGoal = (monthKey, goalId) => {
        const plannerRow = plannerRowsWithMetrics.find((row) => row.key === monthKey);
        if (!plannerRow || plannerRow.remainingPct <= 0) {
            return;
        }

        const key = String(goalId);

        setAllocationOverridesByMonth((prev) => ({
            ...prev,
            [monthKey]: {
                ...(prev[monthKey] || {}),
                [key]: roundToTwo(toNonNegativeNumber(plannerRow.percentages[key]) + plannerRow.remainingPct),
            },
        }));
        setOverrideVisibilityByMonth((prev) => ({
            ...prev,
            [monthKey]: {
                ...(prev[monthKey] || {}),
                [key]: true,
            },
        }));
        setAllocationSaveStatus({ type: '', message: '' });
    };

    const buildGoalUpdatePayload = (goal, monthlyContribution, defaultAllocationPercentage, monthlyAllocationOverrides) => ({
        purpose: String(goal.purpose ?? '').trim(),
        targetAmount: toNonNegativeNumber(goal.targetAmount),
        startDate: goal.startDate ? new Date(goal.startDate).toISOString() : null,
        targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString() : null,
        startingAmount: toNonNegativeNumber(goal.startingAmount ?? goal.currentAmount ?? 0),
        averageMonthlyContribution: roundToTwo(monthlyContribution),
        defaultAllocationPercentage,
        monthlyAllocationOverrides,
        ...(isInvestment
            ? { expectedAnnualReturnRate: toNonNegativeNumber(goal.expectedAnnualReturnRate) }
            : {}),
    });

    const handleSaveAllocations = async () => {
        if (goals.length === 0) {
            return;
        }

        const unbalancedMonth = plannerRowsWithMetrics.find((row) => !row.isBalanced);
        if (unbalancedMonth) {
            setAllocationSaveStatus({
                type: 'error',
                message: `Please make sure ${unbalancedMonth.label} totals 100% before saving.`,
            });
            return;
        }

        setSavingAllocations(true);
        setAllocationSaveStatus({ type: '', message: '' });

        try {
            const averageMonthlyContributionByGoalId = inProgressGoals.reduce((acc, goal) => {
                const goalId = String(goal.id);
                const activeRows = plannerRowsWithMetrics.filter((row) => row.activeGoals.some((activeGoal) => String(activeGoal.id) === goalId));

                if (activeRows.length === 0) {
                    acc[goalId] = 0;
                    return acc;
                }

                const totalAllocatedAmount = activeRows.reduce((sum, row) => {
                    const percentage = toNonNegativeNumber(row.percentages[goalId]);
                    return sum + roundToTwo((row.pool * percentage) / 100);
                }, 0);

                acc[goalId] = roundToTwo(totalAllocatedAmount / activeRows.length);
                return acc;
            }, {});
            const persistedPlannerByGoalId = inProgressGoals.reduce((acc, goal) => {
                const goalId = String(goal.id);
                const activeRows = plannerRowsWithMetrics.filter((row) => row.activeGoals.some((activeGoal) => String(activeGoal.id) === goalId));

                if (activeRows.length === 0) {
                    acc[goalId] = {
                        defaultAllocationPercentage: null,
                        monthlyAllocationOverrides: [],
                    };
                    return acc;
                }

                const defaultAllocationPercentage = roundToTwo(
                    activeRows.reduce((sum, row) => sum + toNonNegativeNumber(row.percentages[goalId]), 0) / activeRows.length,
                );
                const monthlyAllocationOverrides = activeRows.map((row) => {
                    const percentage = roundToTwo(toNonNegativeNumber(row.percentages[goalId]));
                    const overridePercentage = Math.abs(percentage - defaultAllocationPercentage) < 0.01
                        ? null
                        : percentage;

                    return {
                        month: row.key,
                        overridePercentage,
                        allocatedAmount: roundToTwo((row.pool * percentage) / 100),
                    };
                });

                acc[goalId] = {
                    defaultAllocationPercentage,
                    monthlyAllocationOverrides,
                };
                return acc;
            }, {});

            await Promise.all(
                goals.map((goal) => {
                    const goalId = String(goal.id);
                    const contribution = completedGoalById[goalId]
                        ? 0
                        : toNonNegativeNumber(averageMonthlyContributionByGoalId[goalId]);
                    const persistedPlanner = persistedPlannerByGoalId[goalId] || {
                        defaultAllocationPercentage: null,
                        monthlyAllocationOverrides: [],
                    };

                    return authFetch(`${apiPath}/${goal.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(buildGoalUpdatePayload(
                            goal,
                            contribution,
                            persistedPlanner.defaultAllocationPercentage,
                            persistedPlanner.monthlyAllocationOverrides,
                        )),
                    });
                }),
            );

            setAllocationSaveStatus({
                type: 'ok',
                message: 'Monthly planner percentages saved successfully.',
            });
            await fetchGoals();
        } catch (error) {
            console.error('Error saving allocations:', error);
            setAllocationSaveStatus({
                type: 'error',
                message: error?.message || 'Could not save allocations right now.',
            });
        } finally {
            setSavingAllocations(false);
        }
    };

    const renderStatusChip = (stats) => {
        if (stats.reached) {
            return <span className="goal-status-chip goal-status-chip-reached"><FiCheckCircle size={13} /> Finished</span>;
        }
        if (!stats.onTrack) {
            return <span className="goal-status-chip goal-status-chip-behind"><FiAlertTriangle size={13} /> Off track</span>;
        }
        return <span className="goal-status-chip goal-status-chip-ok"><FiAlertTriangle size={13} /> In progress</span>;
    };

    const getProjectedMetric = (stats, currentAmount) => {
        const safeCurrentAmount = toNonNegativeNumber(currentAmount);
        const hasFutureHorizon = Array.isArray(stats.series) && stats.series.length > 1;
        const projectedAmount = roundToTwo(hasFutureHorizon ? stats.projectedFinal : safeCurrentAmount);
        const projectedDelta = roundToTwo(projectedAmount - safeCurrentAmount);
        const isUnachievable = hasFutureHorizon && !stats.reached && !stats.onTrack;
        const isAchievable = hasFutureHorizon && stats.onTrack;

        if (isUnachievable) {
            return {
                label: 'Projected balance at target',
                value: formatCurrency(projectedAmount, currency),
                valueClass: 'goal-metric-value goal-metric-value-negative',
                warning: 'Won\'t reach target at this pace',
                warningClass: 'goal-metric-warning-copy',
                icon: <FiAlertTriangle size={14} className="goal-metric-warning-icon" />,
            };
        }

        if (isAchievable) {
            return {
                label: 'Projected balance at target',
                value: formatCurrency(projectedAmount, currency),
                valueClass: `goal-metric-value ${projectedAmount >= toNonNegativeNumber(stats.remaining) + safeCurrentAmount ? 'goal-metric-value-positive' : 'goal-metric-value'}`,
                warning: projectedAmount > toNonNegativeNumber(stats.remaining) + safeCurrentAmount
                    ? 'Expected to exceed target'
                    : 'On track to reach target',
                warningClass: 'goal-metric-success-copy',
                icon: <FiCheckCircle size={14} className="goal-metric-success-icon" />,
            };
        }

        if (Math.abs(projectedDelta) < 0.01) {
            return {
                label: hasFutureHorizon ? 'Projected balance at target' : 'Projected balance',
                value: formatCurrency(projectedAmount, currency),
                valueClass: 'goal-metric-value',
                warning: '',
                warningClass: '',
                icon: null,
            };
        }

        const isPositive = projectedDelta > 0;

        return {
            label: hasFutureHorizon ? 'Projected balance at target' : 'Projected balance',
            value: formatCurrency(projectedAmount, currency),
            valueClass: `goal-metric-value ${isPositive ? 'goal-metric-value-positive' : 'goal-metric-value-negative'}`,
            warning: '',
            warningClass: '',
            icon: null,
        };
    };

    const renderGoalCard = (goal) => {
        const adjustedCurrentAmount = getAdjustedCurrentAmount(goal);
        const averageMonthlyProgress = getAverageMonthlyProgress(goal, adjustedCurrentAmount);
        const projectionPlan = getProjectionPlanFromCurrentPosition(goal, adjustedCurrentAmount);
        const stats = computeGoalStats({
            currentAmount: projectionPlan.openingAmount,
            targetAmount: goal.targetAmount,
            startDate: goal.startDate,
            targetDate: goal.targetDate,
            monthlyContribution: projectionPlan.remainingPlan.length > 0 ? 0 : averageMonthlyProgress ?? 0,
            monthlyContributionPlan: projectionPlan.remainingPlan,
            projectionAnchorDate: projectionPlan.remainingPlan.length > 0
                ? (projectionPlan.anchorDate || goal.startDate)
                : undefined,
            annualReturnRate: isInvestment ? goal.expectedAnnualReturnRate : 0,
        });
        const projectedMetric = getProjectedMetric(stats, adjustedCurrentAmount);
        const isUnachievable = !stats.reached && !stats.onTrack;

        const finished = stats.reached;

        return (
            <article className={`goal-card ${finished ? 'goal-card-finished' : ''}`} key={goal.id}>
                <div className="goal-card-header">
                    <div>
                        <h2 className="goal-card-title">{goal.purpose}</h2>
                        <p className="goal-card-subtitle">
                            {formatDate(goal.startDate) || '—'} → {formatDate(goal.targetDate) || 'no target date'}
                        </p>
                        <div className="mt-2">{renderStatusChip(stats)}</div>
                    </div>
                    <div className="goal-card-actions">
                        <Button variant="outline-secondary" size="sm" title="Edit" onClick={() => openEdit(goal)}>
                            <FiEdit2 size={14} />
                        </Button>
                        <Button variant="outline-danger" size="sm" title="Delete" onClick={() => handleDelete(goal.id)}>
                            <FiTrash2 size={14} />
                        </Button>
                    </div>
                </div>

                <div className="goal-card-body">
                    <ProgressDonut
                        progressPct={stats.progressPct}
                        reached={stats.reached}
                        onTrack={stats.onTrack}
                        isUnachievable={isUnachievable}
                    />
                    <div className="goal-metrics">
                        <div className="goal-metric">
                            <div className="goal-metric-label">Target</div>
                            <div className="goal-metric-value">{formatCurrency(goal.targetAmount, currency)}</div>
                        </div>
                        <div className="goal-metric">
                            <div className="goal-metric-label">{isInvestment ? 'Invested' : 'Saved'}</div>
                            <div className="goal-metric-value positive">
                                {formatCurrency(adjustedCurrentAmount, currency)}
                            </div>
                        </div>
                        <div className="goal-metric">
                            <div className="goal-metric-label">Remaining</div>
                            <div className="goal-metric-value goal-metric-value-negative">{formatCurrency(stats.remaining, currency)}</div>
                        </div>
                        <div className="goal-metric">
                            <div className="goal-metric-label">{contributionLabel}</div>
                            <div className="goal-metric-value">
                                {averageMonthlyProgress === null
                                    ? 'Set a start date'
                                    : formatCurrency(averageMonthlyProgress, currency)}
                            </div>
                        </div>
                        {isInvestment && (
                            <div className="goal-metric">
                                <div className="goal-metric-label">Expected return</div>
                                <div className="goal-metric-value">{Number(goal.expectedAnnualReturnRate ?? 0)}% / yr</div>
                            </div>
                        )}
                        <div className="goal-metric">
                            <div className="goal-metric-label">{projectedMetric.label}</div>
                            <div className={projectedMetric.valueClass}>
                                {projectedMetric.icon}
                                {projectedMetric.value}
                            </div>
                            {projectedMetric.warning && (
                                <div className={projectedMetric.warningClass}>{projectedMetric.warning}</div>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <div className="goal-projection-title">Projection toward target</div>
                    <ProjectionChart series={stats.series} targetAmount={goal.targetAmount} currency={currency} />
                </div>
            </article>
        );
    };

    return (
        <Container className="goals-page py-4">
            <section className={`goals-hero ${heroClass}`}>
                <div>
                    <div className="goals-eyebrow">{eyebrow}</div>
                    <h1>{title}</h1>
                    <p>{subtitle}</p>
                </div>
                <div className="goals-hero-actions">
                    <span className="goals-hero-badge">Goals Planner</span>
                    <Button className="goals-add-btn" onClick={openCreate}>+ {addLabel}</Button>
                </div>
            </section>

            <section className="goals-toolbar">
                <Form.Group controlId="goal-currency">
                    <Form.Label className="mb-1">Display currency</Form.Label>
                    <Form.Select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                        {currencyOptions.map((option) => (
                            <option key={option.code} value={option.code}>
                                {option.label} ({option.code})
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>
            </section>

            {!loading && goals.length > 0 && inProgressGoals.length > 0 && (
                <section className="allocation-planner">
                    <div className="allocation-planner-header">
                        <div>
                            <h2>
                                {isInvestment ? 'Smart Investment Planner' : 'Smart Savings Planner'}
                            </h2>
                            <p>
                                Review each month, keep the smart percentage suggestion, or override it for specific months when plans change.
                            </p>
                        </div>
                    </div>

                    <div className={`allocation-balance-chip ${isAllocationBalanced ? 'allocation-balance-chip-ok' : 'allocation-balance-chip-warn'}`}>
                        {isAllocationBalanced
                            ? 'Every active month totals 100%.'
                            : 'One or more months do not total 100% yet. Adjust the month rows below before saving.'}
                    </div>

                    {hasPlannerRows ? (
                        <div className="monthly-allocation-list">
                            {plannerRowsWithMetrics.map((row) => (
                                <section className="monthly-allocation-card" key={row.key}>
                                    <div className="monthly-allocation-card-header">
                                        <div>
                                            <h3>{row.label}</h3>
                                            <div className="monthly-allocation-card-pool">
                                                <span>This month</span>
                                                <strong>{formatCurrency(row.pool, currency)}</strong>
                                            </div>
                                        </div>
                                        <div className="monthly-allocation-card-summary">
                                            <span className={`monthly-allocation-status ${row.isBalanced ? 'monthly-allocation-status-ok' : 'monthly-allocation-status-warn'}`}>
                                                {row.isBalanced ? '100% allocated' : `${roundToTwo(Math.abs(row.remainingPct))}% ${row.remainingPct < 0 ? 'over' : 'left'}`}
                                            </span>
                                            <div className="monthly-allocation-card-actions">
                                                <Button
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    className="monthly-allocation-forward-btn"
                                                    onClick={() => handleApplyMonthForward(row.key)}
                                                    disabled={!row.isBalanced}
                                                >
                                                    Apply to future months
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="monthly-allocation-goals">
                                        {row.activeGoals.map((goal) => {
                                            const goalId = String(goal.id);
                                            const percentage = toNonNegativeNumber(row.percentages[goalId]);
                                            const amount = roundToTwo((row.pool * percentage) / 100);
                                            const suggestedPercentage = toNonNegativeNumber((suggestedPercentagesByMonth[row.key] || {})[goalId]);
                                            const showOverrideControls = Object.prototype.hasOwnProperty.call(overrideVisibilityByMonth[row.key] || {}, goalId);
                                            const displayPercentageValue = percentage === 0 ? '' : row.percentages[goalId];

                                            return (
                                                <div className="monthly-allocation-goal-row" key={`${row.key}-${goalId}`}>
                                                    <div className="monthly-allocation-goal-top">
                                                        <div>
                                                            <div className="allocation-item-title">{goal.purpose}</div>
                                                            <div className="monthly-allocation-goal-meta">
                                                                Suggested {roundToTwo(suggestedPercentage)}%
                                                            </div>
                                                        </div>
                                                        <div className="monthly-allocation-goal-amount">
                                                            {formatCurrency(amount, currency)}
                                                        </div>
                                                    </div>
                                                    <div className="monthly-allocation-goal-controls">
                                                        <div className="monthly-allocation-input-wrap">
                                                            <Form.Control
                                                                type="number"
                                                                min={0}
                                                                max={100}
                                                                step="any"
                                                                value={displayPercentageValue}
                                                                onChange={(event) => handleAllocationChange(row.key, goal.id, event.target.value)}
                                                            />
                                                            <span className="monthly-allocation-percent">%</span>
                                                        </div>
                                                        {row.activeGoals.length > 1 && row.remainingPct > 0 && (
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="allocation-add-rest-btn"
                                                                onClick={() => handleAssignRemainingToGoal(row.key, goal.id)}
                                                            >
                                                                Add remaining here
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className="allocation-item-meta-row">
                                                        <div className="allocation-item-meta-copy">
                                                            <small>
                                                                Remaining need: {formatCurrency(getAdjustedRemainingNeed(goal), currency)}
                                                            </small>
                                                            {showOverrideControls && (
                                                                <div className="monthly-allocation-override-row">
                                                                    <small className="allocation-item-warning">
                                                                        Manual override for this month
                                                                    </small>
                                                                    <button
                                                                        type="button"
                                                                        className="monthly-allocation-reset-btn"
                                                                        onClick={() => handleResetGoalToSuggestion(row.key, goal.id)}
                                                                    >
                                                                        Use suggestion
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {row.activeGoals.length > 1 && (
                                        <div className="monthly-allocation-card-footer">
                                            <Button
                                                className={`allocation-auto-split-btn ${row.isBalanced ? 'allocation-auto-split-btn-muted' : ''}`}
                                                onClick={() => handleAutoSplit(row.key)}
                                            >
                                                Use smart split
                                            </Button>
                                        </div>
                                    )}
                                </section>
                            ))}
                        </div>
                    ) : (
                        <div className="goals-empty">
                            <div className="goals-empty-title">No monthly planner rows yet</div>
                            <div className="goals-empty-text">
                                Add monthly saving plan entries for the same year so the smart planner can connect your goals to each month.
                            </div>
                        </div>
                    )}

                    <div className="allocation-actions">
                        <Button
                            className="allocation-save-btn"
                            onClick={handleSaveAllocations}
                            disabled={savingAllocations || !hasPlannerRows}
                        >
                            {savingAllocations ? 'Saving...' : 'Save Smart Planner'}
                        </Button>
                    </div>

                    {allocationSaveStatus.message && (
                        <div className={`allocation-feedback ${allocationSaveStatus.type === 'ok' ? 'allocation-feedback-ok' : 'allocation-feedback-error'}`}>
                            {allocationSaveStatus.message}
                        </div>
                    )}
                </section>
            )}

            {loading ? (
                <p className="text-center mt-4">Loading...</p>
            ) : goals.length === 0 ? (
                <div className="goals-empty">
                    <div className="goals-empty-title">No {entityLabel} yet</div>
                    <div className="goals-empty-text">Create your first one to start tracking progress toward your target.</div>
                    <Button className="goals-add-btn" onClick={openCreate}>+ {addLabel}</Button>
                </div>
            ) : (
                <>
                    {inProgressGoals.length > 0 && (
                        <section className="goals-section">
                            <h2 className="goals-section-title">In Progress</h2>
                            <div className="goals-grid">
                                {inProgressGoals.map((goal) => renderGoalCard(goal))}
                            </div>
                        </section>
                    )}

                    {finishedGoals.length > 0 && (
                        <section className="goals-section goals-section-finished">
                            <h2 className="goals-section-title">Finished</h2>
                            <div className="goals-grid">
                                {finishedGoals.map((goal) => renderGoalCard(goal))}
                            </div>
                        </section>
                    )}
                </>
            )}

            <Modal show={modal.show} onHide={closeModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{modal.mode === 'create' ? addLabel : `Edit ${entityLabel.replace(/s$/, '')}`}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {modal.errors.form && <div className="alert alert-danger py-2">{modal.errors.form}</div>}
                    <Form.Group className="mb-3" controlId="goal-purpose">
                        <Form.Label>Purpose</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder={isInvestment ? 'e.g. Retirement fund' : 'e.g. New car, summer vacation'}
                            value={modal.values.purpose}
                            onChange={(event) => handleFieldChange('purpose', event.target.value)}
                            isInvalid={Boolean(modal.errors.purpose)}
                        />
                        <Form.Control.Feedback type="invalid">{modal.errors.purpose}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="goal-target-amount">
                        <Form.Label>Target amount</Form.Label>
                        <Form.Control
                            type="number"
                            min={0}
                            step="any"
                            value={modal.values.targetAmount}
                            onChange={(event) => handleFieldChange('targetAmount', event.target.value)}
                            isInvalid={Boolean(modal.errors.targetAmount)}
                        />
                        <Form.Control.Feedback type="invalid">{modal.errors.targetAmount}</Form.Control.Feedback>
                    </Form.Group>

                    <div className="d-flex gap-3">
                        <Form.Group className="mb-3 flex-fill" controlId="goal-start-date">
                            <Form.Label>Start date</Form.Label>
                            <Form.Control
                                type="date"
                                value={modal.values.startDate}
                                onChange={(event) => handleFieldChange('startDate', event.target.value)}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3 flex-fill" controlId="goal-target-date">
                            <Form.Label>Target date</Form.Label>
                            <Form.Control
                                type="date"
                                value={modal.values.targetDate}
                                onChange={(event) => handleFieldChange('targetDate', event.target.value)}
                                isInvalid={Boolean(modal.errors.targetDate)}
                            />
                            <Form.Control.Feedback type="invalid">{modal.errors.targetDate}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <Form.Group className="mb-3" controlId="goal-default-allocation-percentage">
                        <Form.Label>Default allocation percentage</Form.Label>
                        <Form.Control
                            type="number"
                            min={0}
                            step="any"
                            max={100}
                            value={modal.values.defaultAllocationPercentage === 0 ? '' : modal.values.defaultAllocationPercentage}
                            onChange={(event) => handleFieldChange('defaultAllocationPercentage', event.target.value)}
                            isInvalid={Boolean(modal.errors.defaultAllocationPercentage)}
                        />
                        <Form.Text muted>
                            Optional. This is the default planner percentage before month-specific overrides.
                        </Form.Text>
                        <Form.Control.Feedback type="invalid">{modal.errors.defaultAllocationPercentage}</Form.Control.Feedback>
                    </Form.Group>

                    {isInvestment && (
                        <Form.Group className="mb-1" controlId="goal-return-rate">
                            <Form.Label>Expected annual return (%)</Form.Label>
                            <Form.Control
                                type="number"
                                min={0}
                                step="any"
                                placeholder="e.g. 7"
                                value={modal.values.expectedAnnualReturnRate}
                                onChange={(event) => handleFieldChange('expectedAnnualReturnRate', event.target.value)}
                                isInvalid={Boolean(modal.errors.expectedAnnualReturnRate)}
                            />
                            <Form.Control.Feedback type="invalid">{modal.errors.expectedAnnualReturnRate}</Form.Control.Feedback>
                        </Form.Group>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>
                        {modal.mode === 'create' ? 'Create' : 'Save Changes'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default GoalsPage;
