import "./PostUser.css"
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useState } from "react";

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

    if (name === "phoneNumber") {
        if (!value.trim()) {
            return "Phone number is required.";
        }

        const normalizedPhone = value.replace(/[()\s-]/g, "");

        if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
            return "Enter a valid phone number with country code, for example +1 5551234567.";
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
        phoneNumber: "",
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const validateForm = (values) => {
        const nextErrors = {};

        ["email", "phoneNumber"].forEach((fieldName) => {
            const errorMessage = validateField(fieldName, values[fieldName]);

            if (errorMessage) {
                nextErrors[fieldName] = errorMessage;
            }
        });

        return nextErrors;
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        const nextFormData = {
            ...formData,
            [name]: value,
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

    const handleSubmit = (event) => {
        event.preventDefault();

        const nextErrors = validateForm(formData);

        setTouched({
            ...touched,
            email: true,
            phoneNumber: true,
        });
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        console.log("Form submitted:", formData);
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
                            name="phoneNumber"
                            placeholder="Enter Phone Number (e.g. +1 5551234567)"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            isInvalid={Boolean(touched.phoneNumber && errors.phoneNumber)}
                            required
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.phoneNumber}
                        </Form.Control.Feedback>
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