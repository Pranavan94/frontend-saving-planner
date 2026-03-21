
import { Routes, Route } from 'react-router-dom';
import Header from './pages/header/Header';
import Dashboard from './pages/dashboard/Dashboard';
import NoMatch from './pages/noMatch/NoMatch';
import PostUser from './pages/user/PostUser';
import UpdateUser from './pages/user/UpdateUser';

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard/>} />
        <Route path="/user-details" element={<PostUser />} />
        <Route path="/user-details/:id" element={<UpdateUser />} />
        <Route path="*" element={<NoMatch/>} />
      </Routes>
    </>
  );
}

export default App;
