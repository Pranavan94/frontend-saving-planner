
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from './pages/header/Header.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import NoMatch from './pages/noMatch/NoMatch.jsx';
import PostUser from './pages/user/PostUser.jsx';
import UpdateUser from './pages/user/UpdateUser.jsx';
import SavingPlan from './pages/saving-plan/SavingPlan.jsx';
import SavingPlanDetails from './pages/saving-plan/SavingPlanDetails.jsx';
import SavingPlanExpenses from './pages/saving-plan/SavingPlanExpenses.jsx';
import LoginForm from './pages/login/LoginForm.jsx';
import { getAccessToken } from './api/auth.js';

function ProtectedRoute({ element }) {
  const isAuthenticated = !!getAccessToken();
  return isAuthenticated ? element : <Navigate to="/login" replace />;
}

function App() {
  const currentYear = String(new Date().getFullYear());
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAccessToken());

  useEffect(() => {
    setIsAuthenticated(!!getAccessToken());
  }, [location]);

  return (
    <>
      {isAuthenticated && <Header />}
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/" element={<ProtectedRoute element={<Dashboard/>} />} />
        <Route path="/saving-plan-overview" element={<ProtectedRoute element={<Navigate to={`/saving-plan-overview/${currentYear}`} replace />} />} />
        <Route path="/saving-plan-overview/:year" element={<ProtectedRoute element={<SavingPlan />} />} />
        <Route path="/saving-plan-details/:id" element={<ProtectedRoute element={<SavingPlanDetails />} />} />
        <Route path="/saving-plan-expenses/:id" element={<ProtectedRoute element={<SavingPlanExpenses />} />} />
        <Route path="/user-details" element={<ProtectedRoute element={<PostUser />} />} />
        <Route path="/user-details/:id" element={<ProtectedRoute element={<UpdateUser />} />} />
        <Route path="*" element={<NoMatch/>} />
      </Routes>
    </>
  );
}

export default App;
