import {
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
});
