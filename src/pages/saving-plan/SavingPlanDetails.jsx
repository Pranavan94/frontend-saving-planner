import './SavingPlanDetails.css';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
const basicAuthUsername = process.env.REACT_APP_BASIC_AUTH_USERNAME;
const basicAuthPassword = process.env.REACT_APP_BASIC_AUTH_PASSWORD;

const formatDateForInput = (value) => {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toISOString().split('T')[0];
};

const emptyForm = {
    startDate: '',
    endDate: '',
    monthlyIncome: '',
    monthlyExpenses: '',
    consumption: '',
    savings: '',
    investments: '',
    mortgagePayment: '',
    foodBudget: '',
};

const expenseFields = [
    'monthlyExpenses', 'consumption', 'savings',
    'investments', 'mortgagePayment', 'foodBudget',
];

const getTotalExpenses = (values) =>
    expenseFields.reduce((sum, field) => sum + (Number(values[field]) || 0), 0);

const getOverspend = (values) =>
    getTotalExpenses(values) - (Number(values.monthlyIncome) || 0);

const validateField = (name, value) => {
    if (name === 'startDate' || name === 'endDate') {
        if (!value) return `${name === 'startDate' ? 'Start' : 'End'} date is required.`;
    }
    const numericFields = [
        'monthlyIncome', 'monthlyExpenses', 'consumption',
        'savings', 'investments', 'mortgagePayment', 'foodBudget',
    ];
    if (numericFields.includes(name)) {
        if (value === '' || value === null || value === undefined) return 'This field is required.';
        if (isNaN(Number(value)) || Number(value) < 0) return 'Must be a non-negative number.';
    }
    return '';
};

const SavingPlanDetails = () => {
    const { id } = useParams();
    const isNew = id === 'new';
    const navigate = useNavigate();

    const [formData, setFormData] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [loading, setLoading] = useState(!isNew);

    useEffect(() => {
        if (isNew) return;

        const fetchPlan = async () => {
            try {
                const credentials = btoa(`${basicAuthUsername}:${basicAuthPassword}`);
                const response = await fetch(`${apiBaseUrl}/api/v1/finance/overview/${id}`, {
                    headers: { 'Authorization': `Basic ${credentials}` },
                });
                const data = await response.json();
                setFormData({
                    startDate: formatDateForInput(data.startDate),
                    endDate: formatDateForInput(data.endDate),
                    monthlyIncome: data.monthlyIncome ?? '',
                    monthlyExpenses: data.monthlyExpenses ?? '',
                    consumption: data.consumption ?? '',
                    savings: data.savings ?? '',
                    investments: data.investments ?? '',
                    mortgagePayment: data.mortgagePayment ?? '',
                    foodBudget: data.foodBudget ?? '',
                });
            } catch (error) {
                console.error('Error fetching saving plan:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlan();
    }, [id, isNew]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData({ ...formData, [name]: value });
        if (touched[name]) {
            setErrors({ ...errors, [name]: validateField(name, value) });
        }
    };

    const handleBlur = (event) => {
        const { name, value } = event.target;
        setTouched({ ...touched, [name]: true });
        setErrors({ ...errors, [name]: validateField(name, value) });
    };

    const validateAll = (values) => {
        const next = {};
        Object.keys(emptyForm).forEach((field) => {
            const msg = validateField(field, values[field]);
            if (msg) next[field] = msg;
        });
        return next;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const nextErrors = validateAll(formData);
        setTouched(Object.keys(emptyForm).reduce((acc, k) => ({ ...acc, [k]: true }), {}));
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) return;

        if (getOverspend(formData) > 0) return;

        try {
            const credentials = btoa(`${basicAuthUsername}:${basicAuthPassword}`);
            const url = isNew
                ? `${apiBaseUrl}/api/v1/finance/overview/create`
                : `${apiBaseUrl}/api/v1/finance/overview/${id}`;

            const payload = {
                ...formData,
                startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
            };

            const response = await fetch(url, {
                method: isNew ? 'POST' : 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${credentials}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                console.error('Failed to save saving plan:', response.status);
                return;
            }

            navigate('/saving-plan-overview');
        } catch (error) {
            console.error('Error saving saving plan:', error);
        }
    };

    if (loading) return <p className="text-center mt-5">Loading...</p>;

    const overspend = getOverspend(formData);
    const isOverBudget = overspend > 0;

    const fields = [
        { name: 'startDate', label: 'Start Date', type: 'date' },
        { name: 'endDate', label: 'End Date', type: 'date' },
        { name: 'monthlyIncome', label: 'Monthly Income', type: 'number' },
        { name: 'monthlyExpenses', label: 'Monthly Expenses', type: 'number' },
        { name: 'consumption', label: 'Consumption', type: 'number' },
        { name: 'savings', label: 'Savings', type: 'number' },
        { name: 'investments', label: 'Investments', type: 'number' },
        { name: 'mortgagePayment', label: 'Mortgage Payment', type: 'number' },
        { name: 'foodBudget', label: 'Food Budget', type: 'number' },
    ];

    return (
        <div className="center-form">
            <div className="saving-plan-details-card">
                <h1>{isNew ? 'Add New Saving Plan' : 'Update Saving Plan'}</h1>
                <Form noValidate onSubmit={handleSubmit} className="saving-plan-details-form">
                    {isOverBudget && (
                        <div className="alert alert-danger py-2" role="alert">
                            Total expenses exceed monthly income by <strong>{new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(overspend)}</strong>. Please adjust the values before saving.
                        </div>
                    )}
                    {fields.map(({ name, label, type }) => (
                        <Form.Group controlId={`form-${name}`} key={name}>
                            <Form.Label>{label}</Form.Label>
                            <Form.Control
                                type={type}
                                name={name}
                                value={formData[name]}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                isInvalid={Boolean(touched[name] && errors[name])}
                                min={type === 'number' ? 0 : undefined}
                                step={type === 'number' ? 'any' : undefined}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors[name]}
                            </Form.Control.Feedback>
                        </Form.Group>
                    ))}
                    <div className="saving-plan-details-actions">
                        <Button variant="secondary" type="button" onClick={() => navigate('/saving-plan-overview')}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            {isNew ? 'Create' : 'Save Changes'}
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    );
};

export default SavingPlanDetails;
