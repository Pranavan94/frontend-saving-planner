import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { FaHome, FaUtensils, FaCarAlt, FaGraduationCap, FaCreditCard, FaLightbulb, FaRoad, FaShieldAlt, FaTag, FaChartLine } from 'react-icons/fa';
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

// Category icons mapping
const categoryIcons = {
    mortgagePayment: <FaHome className="category-icon" />,
    sharedHouseCost: <FaHome className="category-icon" />,
    foodBudget: <FaUtensils className="category-icon" />,
    carLoan: <FaCarAlt className="category-icon" />,
    studentLoans: <FaGraduationCap className="category-icon" />,
    creditCardBill: <FaCreditCard className="category-icon" />,
    electricityBill: <FaLightbulb className="category-icon" />,
    tollFees: <FaRoad className="category-icon" />,
    insurancePayment: <FaShieldAlt className="category-icon" />,
    subscriptions: <FaTag className="category-icon" />,
};

// Chart colors
const CHART_COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140', '#30b0fe', '#e0c3fc'];

// Generate expense breakdown data for charts
const generateExpenseBreakdownData = (monthlyExpenses) => {
    const data = [];
    
    fixedMonthlyExpenseFields.forEach((field) => {
        const value = Number(monthlyExpenses[field.key]) || 0;
        if (value > 0) {
            data.push({
                name: field.label,
                value: value,
                icon: categoryIcons[field.key],
            });
        }
    });
    
    variableMonthlyExpenseFields.forEach((field) => {
        const value = Number(monthlyExpenses[field.key]) || 0;
        if (value > 0) {
            data.push({
                name: field.label,
                value: value,
                icon: categoryIcons[field.key],
            });
        }
    });
    
    const insuranceTotal = getInsuranceTotal(monthlyExpenses);
    if (insuranceTotal > 0) {
        data.push({
            name: 'Insurance',
            value: insuranceTotal,
            icon: categoryIcons.insurancePayment,
        });
    }
    
    const subscriptionsTotal = getSubscriptionsTotal(monthlyExpenses);
    if (subscriptionsTotal > 0) {
        data.push({
            name: 'Subscriptions',
            value: subscriptionsTotal,
            icon: categoryIcons.subscriptions,
        });
    }
    
    return data.sort((a, b) => b.value - a.value);
};

// Generate budget allocation data
const generateBudgetAllocationData = (plan, monthlyExpensesTotal) => {
    return [
        {
            name: 'Expenses',
            value: Number(monthlyExpensesTotal) || 0,
            fill: '#ff6b6b',
        },
        {
            name: 'Savings & Investments',
            value: (Number(plan.savings) || 0) + (Number(plan.investments) || 0),
            fill: '#51cf66',
        },
    ].filter((item) => item.value > 0);
};

// Generate trend data (simulated for now, can be replaced with historical data)
const generateTrendData = (plan, monthlyExpensesTotal) => {
    const startDate = new Date(plan.startDate);
    const months = [];
    
    // Generate 6 months of data around the plan period
    for (let i = -2; i < 4; i++) {
        const monthDate = new Date(startDate);
        monthDate.setMonth(monthDate.getMonth() + i);
        
        const monthName = monthDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        
        // Add some variation to make the trend interesting
        const variation = (Math.random() - 0.5) * monthlyExpensesTotal * 0.15;
        const expenseValue = Math.max(0, monthlyExpensesTotal + variation);
        
        months.push({
            month: monthName,
            expenses: Math.round(expenseValue * 100) / 100,
            budget: Number(plan.monthlyIncome) || 0,
        });
    }
    
    return months;
};

const getTrendLabelMetadata = (data, key) => {
    if (!Array.isArray(data) || data.length === 0) {
        return {
            visibleIndices: new Set(),
            maxIndex: -1,
            minIndex: -1,
        };
    }

    let maxIndex = 0;
    let minIndex = 0;

    data.forEach((item, index) => {
        const currentValue = Number(item?.[key]);
        const maxValue = Number(data[maxIndex]?.[key]);
        const minValue = Number(data[minIndex]?.[key]);

        if (!Number.isNaN(currentValue) && (Number.isNaN(maxValue) || currentValue > maxValue)) {
            maxIndex = index;
        }

        if (!Number.isNaN(currentValue) && (Number.isNaN(minValue) || currentValue < minValue)) {
            minIndex = index;
        }
    });

    return {
        visibleIndices: new Set([0, data.length - 1, maxIndex, minIndex]),
        maxIndex,
        minIndex,
    };
};

const createTrendLabelRenderer = (formatter, currency, color, verticalOffset, trendLabelMetadata) =>
    ({ x, y, index, value }) => {
        if (
            value === null
            || value === undefined
            || Number.isNaN(Number(value))
            || !trendLabelMetadata.visibleIndices.has(index)
        ) {
            return null;
        }

        const formattedValue = formatter(value, currency);
        const xOffset = index < 2 ? 16 : 0;
        const textAnchor = index < 2 ? 'start' : 'middle';
        const textX = x + xOffset;
        const textY = y + verticalOffset;
        const isHigh = index === trendLabelMetadata.maxIndex;
        const isLow = index === trendLabelMetadata.minIndex && trendLabelMetadata.minIndex !== trendLabelMetadata.maxIndex;
        const badgeText = isHigh ? 'HIGH' : (isLow ? 'LOW' : null);
        const estimatedTextWidth = formattedValue.length * 7;
        const badgeWidth = badgeText ? (badgeText.length * 7 + 10) : 0;
        const badgeX = textAnchor === 'start'
            ? textX + estimatedTextWidth + 8
            : textX + Math.ceil(estimatedTextWidth / 2) + 8;
        const badgeY = textY - 10;
        const badgeFill = isHigh ? '#198754' : '#0d6efd';

        return (
            <g>
                <text
                    x={textX}
                    y={textY}
                    fill={color}
                    fontSize={12}
                    fontWeight="700"
                    textAnchor={textAnchor}
                    stroke="white"
                    strokeWidth={3}
                    paintOrder="stroke"
                >
                    {formattedValue}
                </text>
                {badgeText ? (
                    <>
                        <rect
                            x={badgeX}
                            y={badgeY}
                            width={badgeWidth}
                            height={16}
                            rx={8}
                            fill={badgeFill}
                            opacity={0.92}
                        />
                        <text
                            x={badgeX + badgeWidth / 2}
                            y={badgeY + 11}
                            fill="#ffffff"
                            fontSize={9}
                            fontWeight="700"
                            textAnchor="middle"
                        >
                            {badgeText}
                        </text>
                    </>
                ) : null}
            </g>
        );
    };

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
        + (Number(plan.savings) || 0)
        + (Number(plan.investments) || 0);
    const overspend = totalAllocated - (Number(plan.monthlyIncome) || 0);
    const overBudget = overspend > 0;
    const planYear = getPlanYear(plan);
    const trendData = generateTrendData(plan, monthlyExpensesTotal);
    const expensesLabelMetadata = getTrendLabelMetadata(trendData, 'expenses');
    const budgetLabelMetadata = getTrendLabelMetadata(trendData, 'budget');

    return (
        <Container className="expense-page mt-4 mb-5">
            {/* Header Section */}
            <Row className="align-items-center mb-4 gy-3">
                <Col>
                    <h1 className="expense-page-title">💰 Expense Breakdown</h1>
                    <div style={{
                        display: 'inline-block',
                        padding: '0.75rem 1.25rem',
                        background: 'linear-gradient(135deg, #e7f5ff 0%, #f0f9ff 100%)',
                        borderLeft: '4px solid #667eea',
                        borderRadius: '6px',
                        marginTop: '0.5rem'
                    }}>
                        <div style={{ fontSize: '0.95rem', color: '#333', fontWeight: '500' }}>
                            📅 <strong>Plan Period:</strong> <span style={{ color: '#667eea', fontWeight: 'bold' }}>{formatDateForView(plan.startDate)}</span> <span style={{ color: '#666' }}>→</span> <span style={{ color: '#667eea', fontWeight: 'bold' }}>{formatDateForView(plan.endDate)}</span>
                        </div>
                    </div>
                </Col>
                <Col md="auto" className="d-flex align-items-end gap-2 flex-wrap justify-content-md-end">
                    <Form.Group controlId="expense-currency-select">
                        <Form.Label className="mb-1">
                            <small>Display currency</small>
                        </Form.Label>
                        <Form.Select
                            value={selectedCurrency}
                            onChange={(event) => setSelectedCurrency(event.target.value)}
                            size="sm"
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
                        size="sm"
                        onClick={() => navigate(planYear ? `/saving-plan-overview/${planYear}` : '/saving-plan-overview')}
                    >
                        Back
                    </Button>
                </Col>
            </Row>

            {/* Summary Cards */}
            <Row className="g-3 mb-4">
                <Col md={6} lg={3}>
                    <Card className="expense-summary-card">
                        <Card.Body>
                            <Card.Subtitle className="text-muted">💵 Monthly Income</Card.Subtitle>
                            <Card.Title className="text-success">{formatCurrencyForView(plan.monthlyIncome, selectedCurrency)}</Card.Title>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} lg={3}>
                    <Card className="expense-summary-card">
                        <Card.Body>
                            <Card.Subtitle className="text-muted">📊 Monthly Expenses</Card.Subtitle>
                            <Card.Title className="text-danger">
                                {monthlyExpensesTotal > 0 ? '-' : ''}{formatCurrencyForView(monthlyExpensesTotal, selectedCurrency)}
                            </Card.Title>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} lg={3}>
                    <Card className="expense-summary-card">
                        <Card.Body>
                            <Card.Subtitle className="text-muted">🏦 Saving & Investment</Card.Subtitle>
                            <Card.Title className="text-success">
                                {formatCurrencyForView(plan.savings + plan.investments, selectedCurrency)}
                            </Card.Title>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} lg={3}>
                    <Card className={`expense-summary-card ${overBudget ? 'expense-summary-card-alert' : ''}`}>
                        <Card.Body>
                            <Card.Subtitle className="text-muted">⚡ Budget Status</Card.Subtitle>
                            <Card.Title className={overBudget ? 'text-danger' : 'text-success'}>
                                {overBudget
                                    ? `Over by ${formatCurrencyForView(overspend, selectedCurrency)}`
                                    : `Within budget by ${formatCurrencyForView(Math.abs(overspend), selectedCurrency)}`}
                            </Card.Title>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Charts Section */}
            <div className="charts-section">
                <h2 className="mb-3" style={{ fontSize: '1.5rem', fontWeight: 600, color: '#333' }}>
                    <FaChartLine style={{ marginRight: '0.5rem' }} /> Visual Analytics
                </h2>
                
                <Row className="g-3 mb-4">
                    {/* Expense Breakdown Chart */}
                    <Col lg={6}>
                        <Card className="chart-card h-100">
                            <div className="chart-card-header">
                                📈 Expense Breakdown by Category
                            </div>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={generateExpenseBreakdownData(monthlyExpenses)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            fill="#667eea"
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {generateExpenseBreakdownData(monthlyExpenses).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => formatCurrencyForView(value, selectedCurrency)}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <Card.Body>
                                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                    {generateExpenseBreakdownData(monthlyExpenses).map((item, index) => (
                                        <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span
                                                    style={{
                                                        display: 'inline-block',
                                                        width: '12px',
                                                        height: '12px',
                                                        borderRadius: '50%',
                                                        backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                                                    }}
                                                />
                                                <small>{item.name}</small>
                                            </div>
                                            <small className="fw-semibold">{formatCurrencyForView(item.value, selectedCurrency)}</small>
                                        </div>
                                    ))}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Budget Allocation Chart */}
                    <Col lg={6}>
                        <Card className="chart-card h-100">
                            <div className="chart-card-header">
                                💳 Budget Allocation
                            </div>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={generateBudgetAllocationData(plan, monthlyExpensesTotal)}
                                            cx="50%"
                                            cy="50%"
                                            fill="#667eea"
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {generateBudgetAllocationData(plan, monthlyExpensesTotal).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => formatCurrencyForView(value, selectedCurrency)}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <Card.Body>
                                {generateBudgetAllocationData(plan, monthlyExpensesTotal).map((item, index) => (
                                    <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '50%',
                                                    backgroundColor: item.fill,
                                                }}
                                            />
                                            <small>{item.name}</small>
                                        </div>
                                        <small className="fw-semibold">{formatCurrencyForView(item.value, selectedCurrency)}</small>
                                    </div>
                                ))}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Expense Trend Chart */}
                <Row className="g-3 mb-4">
                    <Col lg={12}>
                        <Card className="chart-card">
                            <div className="chart-card-header">
                                📉 Monthly Expense Trend
                            </div>
                            <div className="chart-container" style={{ background: 'white' }}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                                        <XAxis dataKey="month" stroke="#666" />
                                        <YAxis stroke="#666" />
                                        <Tooltip
                                            formatter={(value) => formatCurrencyForView(value, selectedCurrency)}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="expenses"
                                            stroke="#ff6b6b"
                                            strokeWidth={2}
                                            dot={{ fill: '#ff6b6b', r: 5 }}
                                            activeDot={{ r: 7 }}
                                            name="Monthly Expenses"
                                            label={createTrendLabelRenderer(formatCurrencyForView, selectedCurrency, '#ff6b6b', -12, expensesLabelMetadata)}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="budget"
                                            stroke="#667eea"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                            dot={{ fill: '#667eea', r: 5 }}
                                            activeDot={{ r: 7 }}
                                            name="Monthly Budget"
                                            label={createTrendLabelRenderer(formatCurrencyForView, selectedCurrency, '#667eea', 18, budgetLabelMetadata)}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* Detailed Tables */}
            <h2 className="mb-3" style={{ fontSize: '1.5rem', fontWeight: 600, color: '#333' }}>
                📋 Detailed Breakdown
            </h2>

            <Row className="g-3 mb-4">
                <Col lg={6}>
                    <Card className="h-100">
                        <Card.Header className="d-flex align-items-center gap-2 fw-bold">
                            <span>Fixed Monthly Expenses</span>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table responsive className="mb-0">
                                <tbody>
                                    {fixedMonthlyExpenseFields.map((field) => (
                                        <tr key={field.key}>
                                            <th className="fw-normal">{field.label}</th>
                                            <td className="text-end text-danger fw-semibold">{monthlyExpensesTotal > 0 ? '-' : ''}{formatCurrencyForView(monthlyExpenses[field.key], selectedCurrency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={6}>
                    <Card className="h-100">
                        <Card.Header className="d-flex align-items-center gap-2 fw-bold">
                            <span>Variable Monthly Expenses</span>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table responsive className="mb-0">
                                <tbody>
                                    {variableMonthlyExpenseFields.map((field) => (
                                        <tr key={field.key}>
                                            <th className="fw-normal">{field.label}</th>
                                            <td className="text-end text-danger fw-semibold">{monthlyExpensesTotal > 0 ? '-' : ''}{formatCurrencyForView(monthlyExpenses[field.key], selectedCurrency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="g-3 mb-4">
                <Col lg={6}>
                    <Card className="h-100">
                        <Card.Header className="d-flex align-items-center gap-2 fw-bold">
                            <span>Insurance Payments</span>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table responsive className="mb-0">
                                <thead>
                                    <tr>
                                        <th className="fw-semibold">Insurance Type</th>
                                        <th className="fw-semibold">Company</th>
                                        <th className="text-end fw-semibold">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyExpenses.insurancePayment.map((item, index) => (
                                        <tr key={`insurance-${index}`}>
                                            <td>{item.name || 'Unnamed insurance'}</td>
                                            <td>{item.companyName || '-'}</td>
                                            <td className="text-end text-danger fw-semibold">{monthlyExpensesTotal > 0 ? '-' : ''}{formatCurrencyForView(item.amountCost, selectedCurrency)}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ borderTop: '2px solid #dee2e6', fontWeight: 'bold' }}>
                                        <td colSpan="2">Total Insurance</td>
                                        <td className="text-end text-danger">{monthlyExpensesTotal > 0 ? '-' : ''}{formatCurrencyForView(getInsuranceTotal(monthlyExpenses), selectedCurrency)}</td>
                                    </tr>
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={6}>
                    <Card className="h-100">
                        <Card.Header className="d-flex align-items-center gap-2 fw-bold">
                            <span>Subscriptions</span>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table responsive className="mb-0">
                                <thead>
                                    <tr>
                                        <th className="fw-semibold">Subscription</th>
                                        <th className="text-end fw-semibold">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyExpenses.subscriptions.map((item, index) => (
                                        <tr key={`subscription-${index}`}>
                                            <td>{item.name || 'Unnamed subscription'}</td>
                                            <td className="text-end text-danger fw-semibold">{monthlyExpensesTotal > 0 ? '-' : ''}{formatCurrencyForView(item.amountCost, selectedCurrency)}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ borderTop: '2px solid #dee2e6', fontWeight: 'bold' }}>
                                        <td>Total Subscriptions</td>
                                        <td className="text-end text-danger">{monthlyExpensesTotal > 0 ? '-' : ''}{formatCurrencyForView(getSubscriptionsTotal(monthlyExpenses), selectedCurrency)}</td>
                                    </tr>
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Income Flow Summary */}
            <Card className="mb-4">
                <Card.Header className="fw-bold">💰 Income Flow</Card.Header>
                <Card.Body>
                    {/* Total Income */}
                    <div style={{
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '8px',
                        color: 'white',
                        marginBottom: '1.5rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>Monthly Income</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrencyForView(plan.monthlyIncome, selectedCurrency)}</div>
                    </div>

                    {/* Allocation Breakdown */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#333', marginBottom: '1rem' }}>Allocated To:</div>
                        
                        {/* Expenses */}
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ color: '#666' }}>📊 Expenses</span>
                                <strong style={{ color: '#ff6b6b' }}>{formatCurrencyForView(monthlyExpensesTotal, selectedCurrency)}</strong>
                            </div>
                            <div style={{
                                width: '100%',
                                height: '8px',
                                background: '#e9ecef',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.min((monthlyExpensesTotal / plan.monthlyIncome) * 100, 100)}%`,
                                    background: 'linear-gradient(90deg, #ff6b6b, #ff8787)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <small style={{ color: '#999' }}>{Math.round((monthlyExpensesTotal / plan.monthlyIncome) * 100)}% of income</small>
                        </div>

                        {/* Savings */}
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ color: '#666' }}>🏦 Savings</span>
                                <strong style={{ color: '#51cf66' }}>{formatCurrencyForView(plan.savings, selectedCurrency)}</strong>
                            </div>
                            <div style={{
                                width: '100%',
                                height: '8px',
                                background: '#e9ecef',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.min((Number(plan.savings) / plan.monthlyIncome) * 100, 100)}%`,
                                    background: 'linear-gradient(90deg, #51cf66, #69db7c)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <small style={{ color: '#999' }}>{Math.round((Number(plan.savings) / plan.monthlyIncome) * 100)}% of income</small>
                        </div>

                        {/* Investments */}
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ color: '#666' }}>📈 Investments</span>
                                <strong style={{ color: '#4dabf7' }}>{formatCurrencyForView(plan.investments, selectedCurrency)}</strong>
                            </div>
                            <div style={{
                                width: '100%',
                                height: '8px',
                                background: '#e9ecef',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.min((Number(plan.investments) / plan.monthlyIncome) * 100, 100)}%`,
                                    background: 'linear-gradient(90deg, #4dabf7, #74c0fc)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <small style={{ color: '#999' }}>{Math.round((Number(plan.investments) / plan.monthlyIncome) * 100)}% of income</small>
                        </div>
                    </div>

                    <hr />

                    {/* Unallocated Amount */}
                    <div style={{
                        padding: '1rem',
                        background: overspend > 0 ? '#fff5f7' : '#f0fdf4',
                        borderRadius: '8px',
                        borderLeft: `4px solid ${overspend > 0 ? '#ff6b6b' : '#51cf66'}`
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>
                                    {overspend > 0 ? '⚠️ Over Budget' : '✅ Remaining/Buffer'}
                                </div>
                                <small style={{ color: '#999' }}>
                                    {overspend > 0 
                                        ? `You've exceeded your budget` 
                                        : 'Extra funds available'}
                                </small>
                            </div>
                            <strong style={{ 
                                fontSize: '1.25rem', 
                                color: overspend > 0 ? '#ff6b6b' : '#51cf66'
                            }}>
                                {overspend > 0 ? '-' : '+'}{formatCurrencyForView(Math.abs(overspend), selectedCurrency)}
                            </strong>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* Footer */}
            <div className="mt-4 pt-3 border-top">
                <Link to={planYear ? `/saving-plan-overview/${planYear}` : '/saving-plan-overview'} className="text-decoration-none">
                    ← Return to saving plan overview
                </Link>
            </div>
        </Container>
    );
};

export default SavingPlanExpenses;
