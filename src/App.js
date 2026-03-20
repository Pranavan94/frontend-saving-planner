
import Header from './pages/header/Header';
import Dashboard from './pages/dashboard/Dashboard';
import NoMatch from './pages/noMatch/NoMatch';
import {Route, Routes } from 'react-router-dom';

function UserDetails() {
  return <main className="container py-4">User Details page</main>;
}

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard/>} />
        <Route path="/user-details" element={<UserDetails />} />
        <Route path="*" element={<NoMatch/>} />
      </Routes>
    </>
  );
}

export default App;
