import {
    getSameYearCarryForwardSource,
    isCarryForwardFieldsPristine,
    mergeCarryForwardExpenses,
    normalizeMonthlyExpenses,
    toNumericMonthlyExpenses,
} from './monthlyExpenses.jsx';

describe('monthlyExpenses API contract mapping', () => {
    it('serializes UI entries to backend request field names', () => {
        const uiModel = {
            mortgagePayment: '5000',
            sharedHouseCost: '1000',
            foodBudget: '2500',
            carLoan: '1000',
            creditCardBill: '2500',
            electricityBill: '1000',
            studentLoans: '2000',
            tollFees: '500',
            insurancePayment: [
                {
                    name: 'health insurance',
                    companyName: 'CVS Health',
                    amountCost: '1000',
                },
            ],
            subscriptions: [
                {
                    name: 'Netflix',
                    amountCost: '100',
                },
            ],
        };

        expect(toNumericMonthlyExpenses(uiModel)).toEqual({
            mortgagePayment: 5000,
            sharedHouseCost: 1000,
            foodBudget: 2500,
            carLoan: 1000,
            creditCardBill: 2500,
            insurances: [
                {
                    insuranceType: 'health insurance',
                    insuranceCompany: 'CVS Health',
                    insuranceCost: 1000,
                },
            ],
            electricityBill: 1000,
            studentLoans: 2000,
            tollFees: 500,
            subscriptions: [
                {
                    subscriptionName: 'Netflix',
                    subscriptionCost: 100,
                },
            ],
        });
    });

    it('normalizes backend response arrays into UI-friendly entries', () => {
        const backendModel = {
            monthlyExpenses: {
                mortgagePayment: 5000,
                sharedHouseCost: 1000,
                foodBudget: 2500,
                carLoan: 1000,
                creditCardBill: 2500,
                electricityBill: 1000,
                studentLoans: 2000,
                tollFees: 500,
                insurances: [
                    {
                        insuranceType: 'health insurance',
                        insuranceCompany: 'CVS Health',
                        insuranceCost: 1000,
                    },
                ],
                subscriptions: [
                    {
                        subscriptionName: 'Netflix',
                        subscriptionCost: 100,
                    },
                ],
            },
        };

        expect(normalizeMonthlyExpenses(backendModel.monthlyExpenses, backendModel)).toEqual({
            mortgagePayment: 5000,
            sharedHouseCost: 1000,
            foodBudget: 2500,
            carLoan: 1000,
            creditCardBill: 2500,
            insurancePayment: [
                {
                    name: 'health insurance',
                    companyName: 'CVS Health',
                    amountCost: 1000,
                },
            ],
            electricityBill: 1000,
            studentLoans: 2000,
            tollFees: 500,
            subscriptions: [
                {
                    name: 'Netflix',
                    amountCost: 100,
                },
            ],
        });
    });

    it('detects when carry-forward fields (fixed, insurance, subscriptions) are still pristine', () => {
        expect(isCarryForwardFieldsPristine({})).toBe(true);

        // Variable expenses should NOT block auto-fill
        expect(isCarryForwardFieldsPristine({
            creditCardBill: '500',
            electricityBill: '200',
        })).toBe(true);

        expect(isCarryForwardFieldsPristine({
            subscriptions: [{ name: 'Netflix', amountCost: 100 }],
        })).toBe(false);

        expect(isCarryForwardFieldsPristine({
            mortgagePayment: '5000',
        })).toBe(false);
    });

    it('merges only fixed, insurance, and subscriptions from source, leaving variable expenses untouched', () => {
        const current = {
            mortgagePayment: '',
            sharedHouseCost: '',
            foodBudget: '',
            carLoan: '',
            studentLoans: '',
            creditCardBill: '750',
            electricityBill: '120',
            tollFees: '45',
            insurancePayment: [{ name: '', companyName: '', amountCost: '' }],
            subscriptions: [{ name: '', amountCost: '' }],
        };

        const sourcePlan = {
            monthlyExpenses: {
                mortgagePayment: 5000,
                sharedHouseCost: 1000,
                foodBudget: 2500,
                carLoan: 300,
                studentLoans: 400,
                creditCardBill: 999,
                electricityBill: 999,
                tollFees: 999,
                insurances: [{ insuranceType: 'Car', insuranceCompany: 'Tryg', insuranceCost: 600 }],
                subscriptions: [{ subscriptionName: 'Netflix', subscriptionCost: 99 }],
            },
        };

        const merged = mergeCarryForwardExpenses(current, sourcePlan);

        // Fixed values come from source
        expect(merged.mortgagePayment).toBe(5000);
        expect(merged.foodBudget).toBe(2500);

        // Variable values stay from current — NOT copied from source
        expect(merged.creditCardBill).toBe('750');
        expect(merged.electricityBill).toBe('120');
        expect(merged.tollFees).toBe('45');

        // Insurance and subscriptions come from source
        expect(merged.insurancePayment[0].name).toBe('Car');
        expect(merged.subscriptions[0].name).toBe('Netflix');
    });

    it('finds the latest earlier plan in the same year for carry-forward', () => {
        const plans = [
            { id: 1, startDate: '2025-01-01T00:00:00.000Z', monthlyExpenses: { subscriptions: [{ subscriptionName: 'Netflix', subscriptionCost: 99 }] } },
            { id: 2, startDate: '2025-03-01T00:00:00.000Z', monthlyExpenses: { subscriptions: [{ subscriptionName: 'Spotify', subscriptionCost: 89 }] } },
            { id: 3, startDate: '2024-12-01T00:00:00.000Z', monthlyExpenses: { subscriptions: [{ subscriptionName: 'Old', subscriptionCost: 50 }] } },
            { id: 4, startDate: '2025-08-01T00:00:00.000Z', monthlyExpenses: { subscriptions: [] } },
        ];

        expect(getSameYearCarryForwardSource(plans, '2025-04-01', null)?.id).toBe(2);
        expect(getSameYearCarryForwardSource(plans, '2025-09-01', 4)?.id).toBe(2);
        expect(getSameYearCarryForwardSource(plans, '2025-01-01', null)).toBeNull();
    });
});
