import { logout } from '../../api/auth';

export default function LogoutButton() {
  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <button onClick={handleLogout} className="app-navbar-link app-navbar-logout-btn text-nowrap" type="button">
      Logout
    </button>
  );
}
