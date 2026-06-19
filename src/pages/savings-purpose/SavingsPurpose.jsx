import GoalsPage from '../goals/GoalsPage.jsx';

const SavingsPurpose = () => (
    <GoalsPage
        apiPath="/api/v1/goals/savings"
        isInvestment={false}
        eyebrow="Savings Planner"
        title="Savings Purpose"
        subtitle="Set what you're saving for this year — a car, a vacation, a rainy day — and track the average you are saving each month so far."
        contributionLabel="Avg monthly savings so far"
        addLabel="Add Savings Goal"
        entityLabel="savings goals"
    />
);

export default SavingsPurpose;
