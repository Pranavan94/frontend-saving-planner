import { useState, useEffect } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";

const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
const basicAuthUsername = process.env.REACT_APP_BASIC_AUTH_USERNAME;
const basicAuthPassword = process.env.REACT_APP_BASIC_AUTH_PASSWORD;

const Dashboard = () => {

    const [users, setUsers] = useState([]);

    useEffect( () => {

        const fetchUsers = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/api/v1/users`, {
                    headers: {
                        "Authorization": `Basic ${btoa(`${basicAuthUsername}:${basicAuthPassword}`)}`
                    }
                });
                const data = await response.json();
                setUsers(data);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();    

    }, []);

    const handleDelete = async (userId) => {
        try {
            const response = await fetch(`${apiBaseUrl}/api/v1/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Basic ${btoa(`${basicAuthUsername}:${basicAuthPassword}`)}`
                }
            }); 
            if (response.ok) {
                setUsers(users.filter(user => user.id !== userId));
            } else {
                console.error('Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        }
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
                                            <Button variant="outline-secondary">Update</Button>
                                            <Button variant="outline-danger" onClick={() => handleDelete(user.id)} className="ms-2">Delete</Button>
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
