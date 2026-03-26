import "./PostUser.css"
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { authFetch } from "../../api/client";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const validateField = (name, value) => {
    if (name === "email") {
        if (!value.trim()) {
            return "Email is required.";
        }

        if (!emailPattern.test(value.trim())) {
            return "Enter a valid email in the format email@domain.com.";
        }
    }

    if (name === "telephoneNumber") {
        if (!value.trim()) {
            return "Phone number is required.";
        }

        const normalizedPhone = value.replace(/[()\s-]/g, "");

        if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
            return "Enter a valid phone number with country code, for example +1 5551234567.";
        }
    }

    if (name === "password") {
        if (!value.trim()) {
            return "Password is required.";
        }

        if (value.length < 8) {
            return "Password must be at least 8 characters long.";
        }
    }

    if (name === "role") {
        if (!value.trim()) {
            return "Role is required.";
        }

        if (!["user", "admin"].includes(value)) {
            return "Role must be either user or admin.";
        }
    }

    return "";
};

const PostUser = () => {

    const [formData, setFormData] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        telephoneNumber: "",
        password: "",
        role: "",
        onboarding: false,

    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const validateForm = (values) => {
        const nextErrors = {};

        ["email", "telephoneNumber", "password", "role"].forEach((fieldName) => {
            const errorMessage = validateField(fieldName, values[fieldName]);

            if (errorMessage) {
                nextErrors[fieldName] = errorMessage;
            }
        });

        return nextErrors;
    };

    const handleInputChange = (event) => {
        const { name, value, type, checked } = event.target;
        const nextFormData = {
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        };

        setFormData(nextFormData);

        if (touched[name]) {
            setErrors({
                ...errors,
                [name]: validateField(name, value),
            });
        }
    };

    const handleBlur = (event) => {
        const { name, value } = event.target;

        setTouched({
            ...touched,
            [name]: true,
        });

        setErrors({
            ...errors,
            [name]: validateField(name, value),
        });
    };

    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();

        const nextErrors = validateForm(formData);

        setTouched({
            ...touched,
            email: true,
            telephoneNumber: true,
            password: true,
            role: true,
        });
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        try {
            await authFetch(`/api/v1/users/user`, {
                method: "POST",
                body: JSON.stringify(formData),
            });
            navigate("/");
        } catch (error) {
            console.error("Failed to submit user:", error);
        }
    };

    return (
        <>
        <div className="center-form">
            <div className="post-user-card">
                <h1>Post New User Information</h1>
                <Form className="post-user-form" noValidate onSubmit={handleSubmit}>
                    <Form.Group controlId="formBasicName">
                        <Form.Control
                            type="text"
                            name="firstName"
                            placeholder="Enter First Name"
                            value={formData.firstName}
                            onChange={handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group controlId="formBasicName">
                        <Form.Control
                            type="text"
                            name="middleName"
                            placeholder="Enter Middle Name"
                            value={formData.middleName}
                            onChange={handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group controlId="formBasicName">
                        <Form.Control
                            type="text"
                            name="lastName"
                            placeholder="Enter Last Name"
                            value={formData.lastName}
                            onChange={handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group controlId="formBasicEmail">
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
                        <Form.Control.Feedback type="invalid">
                            {errors.email}
                        </Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group controlId="formBasicPhoneNumber">
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
                        <Form.Control.Feedback type="invalid">
                            {errors.telephoneNumber}
                        </Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group controlId="formBasicName">
                        <Form.Control
                            type="password"
                            name="password"
                            placeholder="Enter password"
                            value={formData.password}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            isInvalid={Boolean(touched.password && errors.password)}
                            required
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.password}
                        </Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group controlId="formBasicRole">
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
                        <Form.Control.Feedback type="invalid">
                            {errors.role}
                        </Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group controlId="formBasicOnboarding">
                        <Form.Check
                            type="switch"
                            id="onboarding-switch"
                            name="onboarding"
                            label={formData.onboarding ? "On" : "Off"}
                            checked={formData.onboarding}
                            onChange={handleInputChange}
                        />
                    </Form.Group>

                    <Button variant="primary" type="submit" className="submit-button">
                        Submit
                    </Button>
                </Form>
            </div>
        </div>
        </>
    )

}

export default PostUser;