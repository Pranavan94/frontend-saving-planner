import './UpdateUser.css';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
const basicAuthUsername = process.env.REACT_APP_BASIC_AUTH_USERNAME;
const basicAuthPassword = process.env.REACT_APP_BASIC_AUTH_PASSWORD;

const validateField = (name, value) => {
    value = value == null ? '' : String(value);
    if (name === 'email') {
        if (!value.trim()) return 'Email is required.';
        if (!emailPattern.test(value.trim())) return 'Enter a valid email in the format email@domain.com.';
    }
    if (name === 'telephoneNumber') {
        if (!value.trim()) return 'Phone number is required.';
        const normalizedPhone = value.replace(/[()\s-]/g, '');
        if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) return 'Enter a valid phone number with country code, for example +1 5551234567.';
    }
    if (name === 'password' && value.trim()) {
        if (value.length < 8) return 'Password must be at least 8 characters long.';
    }
    if (name === 'role') {
        if (!value.trim()) return 'Role is required.';
        if (!['user', 'admin'].includes(value)) return 'Role must be either user or admin.';
    }
    return '';
};

const UpdateUser = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        telephoneNumber: '',
        password: '',
        role: '',
        onboarding: false,
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const credentials = btoa(`${basicAuthUsername}:${basicAuthPassword}`);
                const response = await fetch(`${apiBaseUrl}/api/v1/users/${id}`, {
                    headers: { 'Authorization': `Basic ${credentials}` }
                });
                const data = await response.json();
                setFormData({
                    firstName: data.firstName || '',
                    middleName: data.middleName || '',
                    lastName: data.lastName || '',
                    email: data.email || '',
                    telephoneNumber: data.telephoneNumber || '',
                    password: '',
                    role: data.role || '',
                    onboarding: data.onboarding ?? false,
                });
            } catch (error) {
                console.error('Error fetching user:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id]);

    const handleInputChange = (event) => {
        const { name, value, type, checked } = event.target;
        const nextFormData = { ...formData, [name]: type === 'checkbox' ? checked : value };
        setFormData(nextFormData);
        if (touched[name]) {
            setErrors({ ...errors, [name]: validateField(name, value) });
        }
    };

    const handleBlur = (event) => {
        const { name, value } = event.target;
        setTouched({ ...touched, [name]: true });
        setErrors({ ...errors, [name]: validateField(name, value) });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const fieldsToValidate = ['email', 'telephoneNumber', 'role'];
        if (formData.password.trim()) fieldsToValidate.push('password');

        const nextErrors = {};
        fieldsToValidate.forEach((fieldName) => {
            const msg = validateField(fieldName, formData[fieldName]);
            if (msg) nextErrors[fieldName] = msg;
        });

        setTouched({ ...touched, email: true, telephoneNumber: true, role: true, password: true });
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) return;

        try {
            if (!apiBaseUrl || !basicAuthUsername || !basicAuthPassword) {
                console.error('Missing required environment variables for API request.');
                return;
            }
            const credentials = btoa(`${basicAuthUsername}:${basicAuthPassword}`);
            const body = { ...formData };
            if (!body.password.trim()) delete body.password;

            const response = await fetch(`${apiBaseUrl}/api/v1/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${credentials}`
                },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                navigate('/');
            } else {
                console.error('Failed to update user:', response.status);
            }
        } catch (error) {
            console.error('Failed to update user:', error);
        }
    };

    if (loading) {
        return <div className="center-form"><p>Loading...</p></div>;
    }

    return (
        <div className="center-form">
            <div className="update-user-card">
                <h1>Update User</h1>
                <Form className="update-user-form" noValidate onSubmit={handleSubmit}>
                    <Form.Group>
                        <Form.Control
                            type="text"
                            name="firstName"
                            placeholder="Enter First Name"
                            value={formData.firstName}
                            onChange={handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Control
                            type="text"
                            name="middleName"
                            placeholder="Enter Middle Name"
                            value={formData.middleName}
                            onChange={handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Control
                            type="text"
                            name="lastName"
                            placeholder="Enter Last Name"
                            value={formData.lastName}
                            onChange={handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Control
                            type="email"
                            name="email"
                            placeholder="Enter Email"
                            value={formData.email}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            isInvalid={Boolean(touched.email && errors.email)}
                            required
                        />
                        <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group>
                        <Form.Control
                            type="tel"
                            name="telephoneNumber"
                            placeholder="Enter Phone Number (e.g. +1 5551234567)"
                            value={formData.telephoneNumber}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            isInvalid={Boolean(touched.telephoneNumber && errors.telephoneNumber)}
                            required
                        />
                        <Form.Control.Feedback type="invalid">{errors.telephoneNumber}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group>
                        <Form.Control
                            type="password"
                            name="password"
                            placeholder="New password (leave blank to keep current)"
                            value={formData.password}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            isInvalid={Boolean(touched.password && errors.password)}
                        />
                        <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group>
                        <Form.Select
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            isInvalid={Boolean(touched.role && errors.role)}
                            required
                        >
                            <option value="">Select role</option>
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">{errors.role}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group>
                        <Form.Check
                            type="switch"
                            id="onboarding-switch"
                            name="onboarding"
                            label={formData.onboarding ? 'On' : 'Off'}
                            checked={formData.onboarding}
                            onChange={handleInputChange}
                        />
                    </Form.Group>
                    <div className="update-user-actions">
                        <Button variant="secondary" onClick={() => navigate('/')}>Cancel</Button>
                        <Button variant="primary" type="submit">Save Changes</Button>
                    </div>
                </Form>
            </div>
        </div>
    );
};

export default UpdateUser;