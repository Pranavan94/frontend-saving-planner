
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import { Link, NavLink, useLocation } from "react-router-dom";
import { FiBarChart2, FiCompass, FiGrid, FiStar } from "react-icons/fi";
import LogoutButton from "../login/LogoutButton.jsx";
import './Header.css';

const Header = () => {
    const { pathname } = useLocation();
    const dropdownActive = pathname === "/" || pathname === "/user-details";
    const currentYear = new Date().getFullYear();

    return (
        <Navbar className="app-navbar" variant="dark" expand="lg">
            <Container className="app-navbar-container">
                <Navbar.Brand as={Link} to="/" className="app-navbar-brand">
                    <span className="app-navbar-brand-mark" aria-hidden="true">
                        <FiStar size={14} />
                    </span>
                    <strong>Saving Planner</strong>
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="app-navbar-nav" />
                <Navbar.Collapse id="app-navbar-nav">
                    <Nav className="ms-auto app-navbar-links">
                        <Nav.Link
                            as={Link}
                            to={`/saving-plan-overview/${currentYear}`}
                            className="app-navbar-link text-nowrap"
                        >
                            <span className="app-navbar-link-content">
                                <span className="app-navbar-link-icon" aria-hidden="true"><FiBarChart2 size={14} /></span>
                                <span>Saving Overview</span>
                            </span>
                        </Nav.Link>
                        <NavDropdown
                            title={(
                                <span className="app-navbar-link-content">
                                    <span className="app-navbar-link-icon" aria-hidden="true"><FiGrid size={14} /></span>
                                    <span>User Settings</span>
                                </span>
                            )}
                            id="app-info-dropdown"
                            className={`app-navbar-link app-navbar-dropdown text-nowrap${dropdownActive ? " app-navbar-link-active" : ""}`}
                        >
                            <NavDropdown.Item
                                as={NavLink}
                                to="/"
                                end
                                className={({ isActive }) =>
                                    isActive ? "app-dropdown-item app-dropdown-item-active" : "app-dropdown-item"
                                }
                            >
                                <span className="app-dropdown-item-content">
                                    <FiCompass size={13} aria-hidden="true" />
                                    <span>Users overview</span>
                                </span>
                            </NavDropdown.Item>
                            <NavDropdown.Item
                                as={NavLink}
                                to="/user-details"
                                className={({ isActive }) =>
                                    isActive ? "app-dropdown-item app-dropdown-item-active" : "app-dropdown-item"
                                }
                            >
                                <span className="app-dropdown-item-content">
                                    <FiStar size={13} aria-hidden="true" />
                                    <span>Create user</span>
                                </span>
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