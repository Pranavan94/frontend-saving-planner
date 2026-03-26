import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { authFetch } from '../../api/client';
import {
    fixedMonthlyExpenseFields,
    variableMonthlyExpenseFields,
    getInsuranceTotal,
    getMonthlyExpensesTotal,
    getSubscriptionsTotal,
    normalizeMonthlyExpenses,
} from './monthlyExpenses.jsx';
import './SavingPlanExpenses.css';

const currencyOptions = [
    { code: 'NOK', label: 'Norwegian Krone' },
    { code: 'EUR', label: 'Euro' },
    { code: 'USD', label: 'US Dollar' },
    { code: 'GBP', label: 'British Pound' },
    { code: 'SEK', label: 'Swedish Krona' },
    { code: 'DKK', label: 'Danish Krone' },
];

const formatDateForView = (value) => {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);

    return `${day}-${month}-${year}`;
};

const formatCurrencyForView = (value, currency) => {
    if (value === '' || value === null || value === undefined) {
        return '-';
    }

    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
        return value;
    }

    if (['NOK', 'DKK', 'SEK'].includes(currency)) {
        return `${new Intl.NumberFormat('en-GB', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numericValue)} ${currency}`;
    }

    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numericValue);
};

const getPlanYear = (plan) => {
    const sourceDate = plan.startDate || plan.endDate;

    if (!sourceDate) {
        return null;
    }

    const date = new Date(sourceDate);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return String(date.getFullYear());
};

const SavingPlanExpenses = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [selectedCurrency, setSelectedCurrency] = useState('NOK');
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                const data = await authFetch(`/api/v1/finance/overview/${id}`);
                setPlan(data);
            } catch (error) {
                console.error('Error fetching expense breakdown:', error);
                setPlan(null);
            } finally {
                setLoading(false);
            }
        };

        fetchPlan();
    }, [id]);

    if (loading) {
        return <p className="text-center mt-5">Loading expense breakdown...</p>;
    }

    if (!plan) {
        return (
            <Container className="mt-5 text-center">
                <h1>Expense Breakdown</h1>
                <p>Could not load this saving plan.</p>
                <Button variant="secondary" onClick={() => navigate('/saving-plan-overview')}>
                    Back to overview
                </Button>
            </Container>
        );
    }

    const monthlyExpenses = normalizeMonthlyExpenses(plan.monthlyExpenses, plan);
    const monthlyExpensesTotal = getMonthlyExpensesTotal(monthlyExpenses);
    const totalAllocated = monthlyExpensesTotal
        + (Number(plan.consumption) || 0)
        + (Number(plan.savings) || 0)
        + (Number(plan.investments) || 0);
    const overspend = totalAllocated - (Number(plan.monthlyIncome) || 0);
    const overBudget = overspend > 0;
    const planYear = getPlanYear(plan);

    return (
        <Container className="expense-page mt-4 mb-5">
            <Row className="align-items-center mb-3 gy-3">
                <Col>
                    <h1 className="expense-page-title">Expense Breakdown</h1>
                    <p className="text-muted mb-0">
                        Start: {formatDateForView(plan.startDate)} | End: {formatDateForView(plan.endDate)}
                    </p>
                </Col>
                <Col md="auto" className="d-flex align-items-end gap-2 flex-wrap justify-content-md-end">
                    <Form.Group controlId="expense-currency-select">
                        <Form.Label className="mb-1">Display currency</Form.Label>
                        <Form.Select
                            value={selectedCurrency}
                            onChange={(event) => setSelectedCurrency(event.target.value)}
                        >
                            {currencyOptions.map((currency) => (
                                <option key={currency.code} value={currency.code}>
                                    {currency.label} ({currency.code})
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <Button
                        variant="outline-secondary"
                        onClick={() => navigate(planYear ? `/saving-plan-overview/${planYear}` : '/saving-plan-overview')}
                    >
                        Back to overview
                    </Button>
                </Col>
            </Row>

            <Row className="g-3 mb-3">
                <Col md={6} lg={3}>
                    <Card className="expense-summary-card">
                        <Card.Body>
                            <Card.Subtitle className="text-muted">Monthly Income</Card.Subtitle>
                            <Card.Title>{formatCurrencyForView(plan.monthlyIncome, selectedCurrency)}</Card.Title>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} lg={3}>
                    <Card className="expense-summary-card">
                        <Card.Body>
                            <Card.Subtitle className="text-muted">Monthly Expenses</Card.Subtitle>
                            <Card.Title>{formatCurrencyForView(monthlyExpensesTotal, selectedCurrency)}</Card.Title>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} lg={3}>
                    <Card className="expense-summary-card">
                        <Card.Body>
                            <Card.Subtitle className="text-muted">Consumption</Card.Subtitle>
                            <Card.Title>{formatCurrencyForView(plan.consumption, selectedCurrency)}</Card.Title>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} lg={3}>
                    <Card className={`expense-summary-card ${overBudget ? 'expense-summary-card-alert' : ''}`}>
                        <Card.Body>
                            <Card.Subtitle className="text-muted">Budget Status</Card.Subtitle>
                            <Card.Title>
                                {overBudget
                                    ? `Over by ${formatCurrencyForView(overspend, selectedCurrency)}`
                                    : `Within budget by ${formatCurrencyForView(Math.abs(overspend), selectedCurrency)}`}
                            </Card.Title>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="g-3 mb-3">
                <Col lg={6}>
                    <Card className="h-100">
                        <Card.Header>Fixed Expenses</Card.Header>
                        <Card.Body className="p-0">
                            <Table responsive className="mb-0">
                                <tbody>
                                    {fixedMonthlyExpenseFields.map((field) => (
                                        <tr key={field.key}>
                                            <th>{field.label}</th>
                                            <td className="text-end">{formatCurrencyForView(monthlyExpenses[field.key], selectedCurrency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={6}>
                    <Card className="h-100">
                        <Card.Header>Variable Expenses</Card.Header>
                        <Card.Body className="p-0">
                            <Table responsive className="mb-0">
                                <tbody>
                                    {variableMonthlyExpenseFields.map((field) => (
                                        <tr key={field.key}>
                                            <th>{field.label}</th>
                                            <td className="text-end">{formatCurrencyForView(monthlyExpenses[field.key], selectedCurrency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="g-3 mb-3">
                <Col lg={6}>
                    <Card className="h-100">
                        <Card.Header>
                            Insurance Payments ({formatCurrencyForView(getInsuranceTotal(monthlyExpenses), selectedCurrency)})
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table responsive className="mb-0">
                                <thead>
                                    <tr>
                                        <th>Insurance Type</th>
                                        <th>Company</th>
                                        <th className="text-end">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyExpenses.insurancePayment.map((item, index) => (
                                        <tr key={`insurance-${index}`}>
                                            <td>{item.name || 'Unnamed insurance'}</td>
                                            <td>{item.companyName || '-'}</td>
                                            <td className="text-end">{formatCurrencyForView(item.amountCost, selectedCurrency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={6}>
                    <Card className="h-100">
                        <Card.Header>
                            Subscriptions ({formatCurrencyForView(getSubscriptionsTotal(monthlyExpenses), selectedCurrency)})
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table responsive className="mb-0">
                                <thead>
                                    <tr>
                                        <th>Subscription</th>
                                        <th className="text-end">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyExpenses.subscriptions.map((item, index) => (
                                        <tr key={`subscription-${index}`}>
                                            <td>{item.name || 'Unnamed subscription'}</td>
                                            <td className="text-end">{formatCurrencyForView(item.amountCost, selectedCurrency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Card>
                <Card.Header>Allocation Summary</Card.Header>
                <Card.Body>
                    <div className="expense-summary-row">
                        <span>Monthly Expenses</span>
                        <strong>{formatCurrencyForView(monthlyExpensesTotal, selectedCurrency)}</strong>
                    </div>
                    <div className="expense-summary-row">
                        <span>Consumption</span>
                        <strong>{formatCurrencyForView(plan.consumption, selectedCurrency)}</strong>
                    </div>
                    <div className="expense-summary-row">
                        <span>Savings</span>
                        <strong>{formatCurrencyForView(plan.savings, selectedCurrency)}</strong>
                    </div>
                    <div className="expense-summary-row">
                        <span>Investments</span>
                        <strong>{formatCurrencyForView(plan.investments, selectedCurrency)}</strong>
                    </div>
                    <hr />
                    <div className="expense-summary-row">
                        <span>Total Allocated</span>
                        <strong>{formatCurrencyForView(totalAllocated, selectedCurrency)}</strong>
                    </div>
                </Card.Body>
            </Card>

            <div className="mt-3">
                <Link to={planYear ? `/saving-plan-overview/${planYear}` : '/saving-plan-overview'}>
                    Return to saving plan overview
                </Link>
            </div>
        </Container>
    );
};

export default SavingPlanExpenses;
