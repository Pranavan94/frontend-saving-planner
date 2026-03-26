
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import { Link, NavLink, useLocation } from "react-router-dom";
import LogoutButton from "../login/LogoutButton.jsx";
import './Header.css';

const Header = () => {
    const { pathname } = useLocation();
    const dropdownActive = pathname === "/" || pathname === "/user-details";
    const savingPlanActive = pathname.startsWith("/saving-plan-overview")
        || pathname.startsWith('/saving-plan-details')
        || pathname.startsWith('/saving-plan-expenses');
    const currentYear = new Date().getFullYear();

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
                            as={Link}
                            to={`/saving-plan-overview/${currentYear}`}
                            className={savingPlanActive ? "app-navbar-link app-navbar-link-active" : "app-navbar-link"}
                        >
                            My Saving Plan Overview
                        </Nav.Link>
                        <NavDropdown
                            title="Information"
                            id="app-info-dropdown"
                            className={`app-navbar-link app-navbar-dropdown${dropdownActive ? " app-navbar-link-active" : ""}`}
                        >
                            <NavDropdown.Item
                                as={NavLink}
                                to="/"
                                end
                                className={({ isActive }) =>
                                    isActive ? "app-dropdown-item app-dropdown-item-active" : "app-dropdown-item"
                                }
                            >
                                Users overview
                            </NavDropdown.Item>
                            <NavDropdown.Item
                                as={NavLink}
                                to="/user-details"
                                className={({ isActive }) =>
                                    isActive ? "app-dropdown-item app-dropdown-item-active" : "app-dropdown-item"
                                }
                            >
                                Create user
                            </NavDropdown.Item>
                        </NavDropdown>
                        <LogoutButton />
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default Header;