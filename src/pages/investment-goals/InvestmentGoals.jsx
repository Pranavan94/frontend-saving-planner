import GoalsPage from '../goals/GoalsPage.jsx';

const InvestmentGoals = () => (
    <GoalsPage
        apiPath="/api/v1/goals/investments"
        isInvestment
        eyebrow="Investment Planner"
        title="Investment Goals"
        subtitle="Define your investment targets for this year, set your expected annual return, and track the average you are investing each month so far."
        heroClass="goals-hero-invest"
        contributionLabel="Avg monthly invested so far"
        addLabel="Add Investment Goal"
        entityLabel="investment goals"
    />
);

export default InvestmentGoals;
