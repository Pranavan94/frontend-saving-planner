
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import { Link, NavLink } from "react-router-dom";
import './Header.css';

const Header = () => {
    return (
        <Navbar className="app-navbar" variant="dark" expand="lg">
            <Container className="app-navbar-container">
                <Navbar.Brand as={Link} to="/" className="app-navbar-brand">
                    <strong>Saving Planner</strong>
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="app-navbar-nav" />
                <Navbar.Collapse id="app-navbar-nav">
                    <Nav className="ms-auto app-navbar-links">
                        <Nav.Link
                            as={NavLink}
                            to="/"
                            end
                            className={({ isActive }) =>
                                isActive ? "app-navbar-link app-navbar-link-active" : "app-navbar-link"
                            }
                        >
                            Saving overview
                        </Nav.Link>
                        <Nav.Link
                            as={NavLink}
                            to="/user-details"
                            className={({ isActive }) =>
                                isActive ? "app-navbar-link app-navbar-link-active" : "app-navbar-link"
                            }
                        >
                            User Details
                        </Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default Header;