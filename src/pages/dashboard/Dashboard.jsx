import { useState, useEffect } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../api/client";
import { FiEdit2, FiMail, FiShield, FiTrash2, FiUserCheck, FiUsers } from "react-icons/fi";
import "./Dashboard.css";

const getFullName = (user) => [user.firstName, user.middleName, user.lastName]
    .filter((part) => part && String(part).trim())
    .join(' ');

const Dashboard = () => {

    const [users, setUsers] = useState([]);
    const navigate = useNavigate();

    useEffect( () => {

        const fetchUsers = async () => {
            try {
                const data = await authFetch('/api/v1/users');
                setUsers(Array.isArray(data) ? data : data.value || []);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();    

    }, []);

    const handleDelete = async (userId) => {
        try {
            await authFetch(`/api/v1/users/${userId}`, {
                method: 'DELETE'
            }); 
            setUsers(users.filter(user => user.id !== userId));
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const handleUpdate = (userId) => {
        navigate(`/user-details/${userId}`);
    };

    const handleAddUser = () => {
        navigate('/user-details');
    };

    const totalUsers = users.length;
    const adminUsers = users.filter((user) => String(user.role).toLowerCase() === 'admin').length;
    const activeOnboarding = users.filter((user) => user.onboarding).length;

    const summaryCards = [
        {
            key: 'total-users',
            label: 'Total Users',
            value: String(totalUsers),
            icon: <FiUsers size={18} />,
        },
        {
            key: 'admins',
            label: 'Admin Users',
            value: String(adminUsers),
            icon: <FiShield size={18} />,
        },
        {
            key: 'onboarding',
            label: 'Onboarding Active',
            value: String(activeOnboarding),
            icon: <FiUserCheck size={18} />,
        },
        {
            key: 'contacts',
            label: 'Users With Email',
            value: String(users.filter((user) => user.email).length),
            icon: <FiMail size={18} />,
        },
    ];

    return (
        <Container className="users-overview-page py-4">
            <section className="users-overview-hero">
                <div>
                    <div className="users-overview-eyebrow">Team Management</div>
                    <h1>Users Overview</h1>
                    <p>View, manage, and update account access in one place.</p>
                </div>
                <div className="users-overview-hero-actions">
                    <span className="users-overview-total-badge">{totalUsers} Members</span>
                    <Button variant="primary" className="users-overview-add-btn" onClick={handleAddUser}>
                        + Create User
                    </Button>
                </div>
            </section>

            <Row className="g-3 mb-4">
                {summaryCards.map((card) => (
                    <Col md={6} lg={3} key={card.key}>
                        <div className="users-summary-card">
                            <div className="users-summary-icon">{card.icon}</div>
                            <div className="users-summary-label">{card.label}</div>
                            <div className="users-summary-value">{card.value}</div>
                        </div>
                    </Col>
                ))}
            </Row>

            <section className="users-overview-table-shell">
                <Table responsive className="users-overview-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone Number</th>
                            <th>Role</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td>{getFullName(user) || '-'}</td>
                                <td>{user.email || '-'}</td>
                                <td>{user.telephoneNumber || '-'}</td>
                                <td>
                                    <span className={`users-role-chip ${String(user.role).toLowerCase() === 'admin' ? 'users-role-chip-admin' : 'users-role-chip-user'}`}>
                                        {user.role || 'user'}
                                    </span>
                                </td>
                                <td>
                                    <div className="d-flex gap-2">
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            title="Edit user"
                                            onClick={() => handleUpdate(user.id)}
                                            className="dashboard-action-btn dashboard-action-btn-update"
                                        >
                                            <FiEdit2 size={14} />
                                        </Button>
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            title="Delete user"
                                            onClick={() => handleDelete(user.id)}
                                            className="dashboard-action-btn dashboard-action-btn-delete"
                                        >
                                            <FiTrash2 size={14} />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan="5" className="users-overview-empty">
                                    <div className="users-overview-empty-title">No users found</div>
                                    <div className="users-overview-empty-text">Create a user to start managing roles and access.</div>
                                    <Button variant="primary" size="sm" onClick={handleAddUser}>Create Your First User</Button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </section>
        </Container>
    );
}

export default Dashboard;
