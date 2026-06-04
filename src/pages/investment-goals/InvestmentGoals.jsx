import GoalsPage from '../goals/GoalsPage.jsx';

const InvestmentGoals = () => (
    <GoalsPage
        apiPath="/api/v1/goals/investments"
        isInvestment
        eyebrow="Investment Planner"
        title="Investment Goals"
        subtitle="Define your investment targets, set your expected annual return, and project compounded growth from your real investment data."
        heroClass="goals-hero-invest"
        contributionLabel="Avg monthly invested"
        addLabel="Add Investment Goal"
        entityLabel="investment goals"
    />
);

export default InvestmentGoals;
