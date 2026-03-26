import { logout } from '../../api/auth';

export default function LogoutButton() {
  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <button onClick={handleLogout} className="btn btn-danger">
      Logout
    </button>
  );
}
