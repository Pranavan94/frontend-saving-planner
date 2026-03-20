
import Header from './pages/header/Header';
import { Navigate, Route, Routes } from 'react-router-dom';

function PlannerPage() {
  return <main className="container py-4">Saving Planner page</main>;
}

function UserDetails() {
  return <main className="container py-4">User Details page</main>;
}

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<PlannerPage />} />
        <Route path="/user-details" element={<UserDetails />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
