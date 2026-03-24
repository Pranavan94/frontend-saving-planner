
import { Navigate, Routes, Route } from 'react-router-dom';
import Header from './pages/header/Header';
import Dashboard from './pages/dashboard/Dashboard';
import NoMatch from './pages/noMatch/NoMatch';
import PostUser from './pages/user/PostUser';
import UpdateUser from './pages/user/UpdateUser';
import SavingPlan from './pages/saving-plan/SavingPlan';
import SavingPlanDetails from './pages/saving-plan/SavingPlanDetails';

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
        <Route path="/user-details" element={<PostUser />} />
        <Route path="/user-details/:id" element={<UpdateUser />} />
        <Route path="*" element={<NoMatch/>} />
      </Routes>
    </>
  );
}

export default App;
