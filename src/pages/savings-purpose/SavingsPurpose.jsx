import GoalsPage from '../goals/GoalsPage.jsx';

const SavingsPurpose = () => (
    <GoalsPage
        apiPath="/api/v1/goals/savings"
        isInvestment={false}
        eyebrow="Savings Planner"
        title="Savings Purpose"
        subtitle="Set what you're saving for — a car, a vacation, a rainy day — and watch how close you are using your real savings data."
        contributionLabel="Avg monthly savings"
        addLabel="Add Savings Goal"
        entityLabel="savings goals"
    />
);

export default SavingsPurpose;
