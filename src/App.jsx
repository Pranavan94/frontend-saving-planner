
import { Navigate, Routes, Route } from 'react-router-dom';
import Header from './pages/header/Header.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import NoMatch from './pages/noMatch/NoMatch.jsx';
import PostUser from './pages/user/PostUser.jsx';
import UpdateUser from './pages/user/UpdateUser.jsx';
import SavingPlan from './pages/saving-plan/SavingPlan.jsx';
import SavingPlanDetails from './pages/saving-plan/SavingPlanDetails.jsx';
import SavingPlanExpenses from './pages/saving-plan/SavingPlanExpenses.jsx';

function App() {
  const currentYear = String(new Date().getFullYear());

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard/>} />
        <Route path="/saving-plan-overview" element={<Navigate to={`/saving-plan-overview/${currentYear}`} replace />} />
        <Route path="/saving-plan-overview/:year" element={<SavingPlan />} />
        <Route path="/saving-plan-details/:id" element={<SavingPlanDetails />} />
        <Route path="/saving-plan-expenses/:id" element={<SavingPlanExpenses />} />
        <Route path="/user-details" element={<PostUser />} />
        <Route path="/user-details/:id" element={<UpdateUser />} />
        <Route path="*" element={<NoMatch/>} />
      </Routes>
    </>
  );
}

export default App;
