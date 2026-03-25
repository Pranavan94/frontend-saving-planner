export const fixedMonthlyExpenseFields = [
    { key: 'mortgagePayment', label: 'Mortgage Payment' },
    { key: 'sharedHouseCost', label: 'Shared House Cost' },
    { key: 'foodBudget', label: 'Food Budget' },
    { key: 'carLoan', label: 'Car Loan' },
    { key: 'studentLoans', label: 'Student Loans' },
];

export const variableMonthlyExpenseFields = [
    { key: 'creditCardBill', label: 'Credit Card Bill' },
    { key: 'electricityBill', label: 'Electricity Bill' },
    { key: 'tollFees', label: 'Toll Fees' },
];

const emptySubscriptionEntry = {
    name: '',
    amountCost: '',
};

const emptyInsuranceEntry = {
    name: '',
    companyName: '',
    amountCost: '',
};

export const emptyMonthlyExpenses = {
    mortgagePayment: '',
    sharedHouseCost: '',
    foodBudget: '',
    carLoan: '',
    creditCardBill: '',
    insurancePayment: [{ ...emptyInsuranceEntry }],
    electricityBill: '',
    studentLoans: '',
    tollFees: '',
    subscriptions: [{ ...emptySubscriptionEntry }],
};

const getObject = (value) => (value && typeof value === 'object' ? value : {});
const getArray = (value) => (Array.isArray(value) ? value : []);

const getNestedNumber = (value) => {
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? 0 : numericValue;
};

const normalizeSubscriptionEntries = (value, legacyNames = {}) => {
    if (Array.isArray(value)) {
        const entries = value.map((entry) => ({
            name: entry?.subscriptionName ?? entry?.name ?? '',
            amountCost: entry?.subscriptionCost ?? entry?.amountCost ?? entry?.amount ?? '',
        }));

        return entries.length > 0 ? entries : [{ ...emptySubscriptionEntry }];
    }

    const objectValue = getObject(value);
    const legacyEntries = Object.entries(objectValue)
        .filter(([, amount]) => amount !== '' && amount !== null && amount !== undefined)
        .map(([legacyKey, amount]) => ({
            name: legacyNames[legacyKey] ?? legacyKey,
            amountCost: amount,
        }));

    return legacyEntries.length > 0 ? legacyEntries : [{ ...emptySubscriptionEntry }];
};

const normalizeInsuranceEntries = (value, legacyNames = {}) => {
    if (Array.isArray(value)) {
        const entries = value.map((entry) => ({
            name: entry?.insuranceType ?? entry?.name ?? '',
            companyName: entry?.insuranceCompany ?? entry?.companyName ?? '',
            amountCost: entry?.insuranceCost ?? entry?.amountCost ?? entry?.amount ?? '',
        }));

        return entries.length > 0 ? entries : [{ ...emptyInsuranceEntry }];
    }

    const objectValue = getObject(value);
    const legacyEntries = Object.entries(objectValue)
        .filter(([, amount]) => amount !== '' && amount !== null && amount !== undefined)
        .map(([legacyKey, amount]) => ({
            name: legacyNames[legacyKey] ?? legacyKey,
            companyName: '',
            amountCost: amount,
        }));

    return legacyEntries.length > 0 ? legacyEntries : [{ ...emptyInsuranceEntry }];
};

const toNumericSubscriptionEntries = (entries) =>
    getArray(entries)
        .filter((entry) => entry && (String(entry.name ?? '').trim() || String(entry.amountCost ?? '').trim()))
        .map((entry) => ({
            subscriptionName: String(entry.name ?? '').trim(),
            subscriptionCost: getNestedNumber(entry.amountCost),
        }));

const toNumericInsuranceEntries = (entries) =>
    getArray(entries)
        .filter((entry) => entry && (
            String(entry.name ?? '').trim()
            || String(entry.companyName ?? '').trim()
            || String(entry.amountCost ?? '').trim()
        ))
        .map((entry) => ({
            insuranceType: String(entry.name ?? '').trim(),
            insuranceCompany: String(entry.companyName ?? '').trim(),
            insuranceCost: getNestedNumber(entry.amountCost),
        }));

const getNamedAmountEntriesTotal = (entries) =>
    getArray(entries).reduce((sum, entry) => sum + getNestedNumber(entry?.amountCost ?? entry?.amount), 0);

export const normalizeMonthlyExpenses = (source, fallback = {}) => {
    const monthlyExpenses = getObject(source);
    const fallbackExpenses = getObject(fallback.monthlyExpenses);

    return {
        mortgagePayment: monthlyExpenses.mortgagePayment ?? fallback.mortgagePayment ?? fallback.mortagePayment ?? '',
        sharedHouseCost: monthlyExpenses.sharedHouseCost ?? fallback.sharedHouseCost ?? '',
        foodBudget: monthlyExpenses.foodBudget ?? fallback.foodBudget ?? '',
        carLoan: monthlyExpenses.carLoan ?? fallback.carLoan ?? '',
        creditCardBill: monthlyExpenses.creditCardBill ?? fallback.creditCardBill ?? '',
        insurancePayment: normalizeInsuranceEntries(
            monthlyExpenses.insurances
            ?? monthlyExpenses.insurancePayment
            ?? fallbackExpenses.insurances
            ?? fallbackExpenses.insurancePayment
            ?? fallback.insurances
            ?? fallback.insurancePayment,
        ),
        electricityBill: monthlyExpenses.electricityBill ?? fallback.electricityBill ?? '',
        studentLoans: monthlyExpenses.studentLoans ?? fallback.studentLoans ?? '',
        tollFees: monthlyExpenses.tollFees ?? fallback.tollFees ?? '',
        subscriptions: normalizeSubscriptionEntries(
            monthlyExpenses.subscriptions ?? fallbackExpenses.subscriptions ?? fallback.subscriptions,
        ),
    };
};

export const getInsuranceTotal = (monthlyExpenses) =>
    getNamedAmountEntriesTotal(getObject(monthlyExpenses).insurancePayment);

export const getSubscriptionsTotal = (monthlyExpenses) =>
    getNamedAmountEntriesTotal(getObject(monthlyExpenses).subscriptions);

export const createEmptySubscriptionEntry = () => ({ ...emptySubscriptionEntry });

export const createEmptyInsuranceEntry = () => ({ ...emptyInsuranceEntry });


export const getMonthlyExpensesTotal = (monthlyExpenses) => {
    const normalized = normalizeMonthlyExpenses(monthlyExpenses);
    const fixedTotal = fixedMonthlyExpenseFields.reduce(
        (sum, field) => sum + getNestedNumber(normalized[field.key]),
        0
    );
    const variableTotal = variableMonthlyExpenseFields.reduce(
        (sum, field) => sum + getNestedNumber(normalized[field.key]),
        0
    );

    return fixedTotal + variableTotal + getInsuranceTotal(normalized) + getSubscriptionsTotal(normalized);
};

export const toNumericMonthlyExpenses = (monthlyExpenses) => {
    const normalized = normalizeMonthlyExpenses(monthlyExpenses);

    return {
        mortgagePayment: getNestedNumber(normalized.mortgagePayment),
        sharedHouseCost: getNestedNumber(normalized.sharedHouseCost),
        foodBudget: getNestedNumber(normalized.foodBudget),
        carLoan: getNestedNumber(normalized.carLoan),
        creditCardBill: getNestedNumber(normalized.creditCardBill),
        insurances: toNumericInsuranceEntries(normalized.insurancePayment),
        electricityBill: getNestedNumber(normalized.electricityBill),
        studentLoans: getNestedNumber(normalized.studentLoans),
        tollFees: getNestedNumber(normalized.tollFees),
        subscriptions: toNumericSubscriptionEntries(normalized.subscriptions),
    };
};