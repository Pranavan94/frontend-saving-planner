import { useState, useEffect } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../api/client";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import "./Dashboard.css";

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

    return (
        <>
            <Container className="mt-5">
                <Row>
                    <Col>
                        <h1 className="text-center">Users Overview</h1>
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone Number</th>
                                    <th>Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>  
                                        <td>{user.firstName} {user.middleName} {user.lastName}</td>
                                        <td>{user.email}</td>
                                        <td>{user.telephoneNumber}</td>
                                        <td>{user.role}</td>    
                                        <td>
                                            <div className="d-flex gap-1">
                                                <Button
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    onClick={() => handleUpdate(user.id)}
                                                    className="dashboard-action-btn dashboard-action-btn-update">
                                                    <FiEdit2 size={13} />
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(user.id)}
                                                    className="dashboard-action-btn dashboard-action-btn-delete">
                                                    <FiTrash2 size={13} />
                                                </Button>
                                            </div>
                                        </td>       
                                    </tr>
                                ))}
                            </tbody>    
                        </Table>
                    </Col>
                </Row>
            </Container>
        </>
    )
}

export default Dashboard;
