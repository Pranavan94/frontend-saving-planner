import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiDollarSign, FiEdit2, FiTrendingUp, FiTrash2 } from "react-icons/fi";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { authFetch } from "../../api/client";
import CsvUpload from './CsvUpload.jsx';
import './SavingPlan.css';
import {
    getMonthlyExpensesTotal,
    normalizeMonthlyExpenses,
} from './monthlyExpenses.jsx';

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
        return '';
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
        return '';
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

const positiveValueThreshold = 1;

const getSavingsValueTone = (value) => {
    const numericValue = Number(value) || 0;
    return numericValue >= positiveValueThreshold ? 'positive' : 'neutral';
};

const formatSavingsCurrency = (value, currency) => {
    const numericValue = Number(value) || 0;
    const formatted = formatCurrencyForView(numericValue, currency);

    if (!formatted) {
        return '';
    }

    return numericValue >= positiveValueThreshold ? `+ ${formatted}` : formatted;
};

const getTotalExpenses = (plan) =>
    (Number(plan.savings) || 0)
    + (Number(plan.investments) || 0)
    + getMonthlyExpensesTotal(normalizeMonthlyExpenses(plan.monthlyExpenses, plan));

const isOverBudget = (plan) => getTotalExpenses(plan) > (Number(plan.monthlyIncome) || 0);

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

const SavingPlan = () => {
    const { year } = useParams();
    const [savingPlan, setSavingPlan] = useState([]);
    const [selectedCurrency, setSelectedCurrency] = useState('NOK');
    const navigate = useNavigate();

    const availableYears = Array.from(
        new Set(
            savingPlan
                .map((plan) => getPlanYear(plan))
                .filter(Boolean)
        )
    ).sort((left, right) => Number(right) - Number(left));

    const activeYear = year || String(new Date().getFullYear());
    const yearOptions = availableYears.includes(activeYear)
        ? availableYears
        : [activeYear, ...availableYears].sort((left, right) => Number(right) - Number(left));
    const filteredSavingPlan = savingPlan.filter((plan) => getPlanYear(plan) === activeYear);
    const totalMonthlyIncome = filteredSavingPlan.reduce(
        (sum, plan) => sum + (Number(plan.monthlyIncome) || 0),
        0
    );
    const totalMonthlyExpenses = filteredSavingPlan.reduce(
        (sum, plan) => sum + getMonthlyExpensesTotal(normalizeMonthlyExpenses(plan.monthlyExpenses, plan)),
        0
    );
    const totalSavingsForYear = filteredSavingPlan.reduce(
        (sum, plan) => sum + (Number(plan.savings) || 0),
        0
    );
    const totalInvestmentsForYear = filteredSavingPlan.reduce(
        (sum, plan) => sum + (Number(plan.investments) || 0),
        0
    );

    const summaryCards = [
        {
            key: 'income',
            label: 'Total Income for the Year',
            value: `+ ${formatCurrencyForView(totalMonthlyIncome, selectedCurrency)}`,
            icon: <FiDollarSign size={18} />,
            valuePrefixIcon: <FiTrendingUp size={14} />,
            tone: 'positive',
        },
        {
            key: 'expenses',
            label: 'Total Expenses for the Year',
            value: `- ${formatCurrencyForView(totalMonthlyExpenses, selectedCurrency)}`,
            icon: <FiDollarSign size={18} />,
            tone: 'negative',
        },
        {
            key: 'savings',
            label: 'Total Savings This Year',
            value: formatSavingsCurrency(totalSavingsForYear, selectedCurrency),
            icon: <FiDollarSign size={18} />,
            valuePrefixIcon: getSavingsValueTone(totalSavingsForYear) === 'positive' ? <FiTrendingUp size={14} /> : null,
            tone: getSavingsValueTone(totalSavingsForYear) === 'positive' ? 'positive' : null,
        },
        {
            key: 'investments',
            label: 'Total Investments This Year',
            value: formatSavingsCurrency(totalInvestmentsForYear, selectedCurrency),
            icon: <FiDollarSign size={18} />,
            valuePrefixIcon: getSavingsValueTone(totalInvestmentsForYear) === 'positive' ? <FiTrendingUp size={14} /> : null,
            tone: getSavingsValueTone(totalInvestmentsForYear) === 'positive' ? 'positive' : null,
        },
    ];

        const fetchSavingPlan = async () => {
            try {
                const data = await authFetch('/api/v1/finance/overview');
                setSavingPlan(Array.isArray(data) ? data : data.value || []);
            } catch (error) {
                console.error('Error fetching saving plan:', error);
            }
        };

        useEffect( () => {
            fetchSavingPlan();   
        }, []);

        const handleUploadSuccess = () => {
            // Refresh the saving plan data after successful upload
            fetchSavingPlan();
        };

        
    const handleDelete = async (financeId) => {
        try {
            await authFetch(`/api/v1/finance/overview/${financeId}`, {
                method: 'DELETE'
            });
            setSavingPlan(savingPlan.filter(plan => plan.id !== financeId));
        } catch (error) {
            console.error('Error deleting saving plan:', error);
        }
    };

        const handleUpdate = (financeId) => {
        navigate(`/saving-plan-details/${financeId}`);
    };

    const handleAdd = () => {
        navigate('/saving-plan-details/new');
    };

    const handleYearChange = (event) => {
        navigate(`/saving-plan-overview/${event.target.value}`);
    };

    return (
        <Container className="saving-overview-page py-4">
            <section className="saving-overview-hero">
                <div>
                    <div className="saving-overview-eyebrow">Financial Planner</div>
                    <h1>Saving Plan Overview</h1>
                    <p>Track each month quickly and spot budget risks before they become problems.</p>
                </div>
                <div className="saving-overview-hero-actions">
                    <span className="saving-overview-year-badge">Year {activeYear}</span>
                    <Button variant="primary" className="saving-overview-add-btn" onClick={handleAdd}>
                        + Add New Saving Plan
                    </Button>
                </div>
            </section>

            <section className="saving-overview-toolbar">
                <div className="saving-overview-toolbar-controls">
                    <Form.Group controlId="year-select">
                        <Form.Label className="mb-1">Year</Form.Label>
                        <Form.Select
                            value={activeYear}
                            onChange={handleYearChange}
                        >
                            {yearOptions.map((optionYear) => (
                                <option key={optionYear} value={optionYear}>
                                    {optionYear}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group controlId="currency-select">
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
                </div>
                <div className="saving-overview-csv-wrap">
                    <CsvUpload onUploadSuccess={handleUploadSuccess} />
                </div>
            </section>

            <Row className="g-3 mb-4">
                {summaryCards.map((card) => (
                    <Col md={6} lg={3} key={card.key}>
                        <div className={`saving-summary-card${card.alert ? ' saving-summary-card-alert' : ''}`}>
                            <div className="saving-summary-icon">{card.icon}</div>
                            <div className="saving-summary-label">{card.label}</div>
                            <div className={`saving-summary-value${card.tone ? ` saving-summary-value-${card.tone}` : ''}`}>
                                {card.valuePrefixIcon && <span className="saving-summary-value-prefix">{card.valuePrefixIcon}</span>}
                                {card.value}
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>

            <section className="saving-overview-table-shell">
                <Table responsive className="saving-overview-table">
                    <thead>
                        <tr>
                            <th>Period</th>
                            <th>Monthly Income</th>
                            <th>Monthly Expenses</th>
                            <th>Savings</th>
                            <th>Investments</th>
                            <th>Budget Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSavingPlan.map((plan) => {
                            const overBudget = isOverBudget(plan);
                            const overspend = getTotalExpenses(plan) - (Number(plan.monthlyIncome) || 0);
                            const monthlyExpenses = normalizeMonthlyExpenses(plan.monthlyExpenses, plan);

                            return (
                                <tr key={plan.id} className={overBudget ? 'saving-over-budget-row' : undefined}>
                                    <td className="saving-period-cell">
                                        (From {formatDateForView(plan.startDate)} To {formatDateForView(plan.endDate)})
                                    </td>
                                    <td>
                                        <span className="saving-monthly-income-value">
                                            <FiDollarSign size={12} />
                                            {formatCurrencyForView(plan.monthlyIncome, selectedCurrency)}
                                        </span>
                                    </td>
                                    <td>
                                        <Link
                                            to={`/saving-plan-expenses/${plan.id}`}
                                            className="saving-overview-expense-link"
                                            title="Open detailed monthly expenses"
                                        >
                                            <span className="saving-overview-expense-value">
                                                {formatCurrencyForView(getMonthlyExpensesTotal(monthlyExpenses), selectedCurrency)}
                                            </span>
                                            <span className="saving-overview-expense-link-hint">View details</span>
                                        </Link>
                                    </td>
                                    <td>
                                        <span className={`saving-table-value saving-table-value-${getSavingsValueTone(plan.savings)}`}>
                                            {getSavingsValueTone(plan.savings) === 'positive' && <FiTrendingUp size={12} />}
                                            {formatSavingsCurrency(plan.savings, selectedCurrency)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`saving-table-value saving-table-value-${getSavingsValueTone(plan.investments)}`}>
                                            {getSavingsValueTone(plan.investments) === 'positive' && <FiTrendingUp size={12} />}
                                            {formatSavingsCurrency(plan.investments, selectedCurrency)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`saving-status-chip${overBudget ? ' saving-status-chip-danger' : ' saving-status-chip-ok'}`}>
                                            {overBudget
                                                ? `Over by ${formatCurrencyForView(overspend, selectedCurrency)}`
                                                : 'On Track'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="d-flex gap-2">
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                title="Edit plan"
                                                onClick={() => handleUpdate(plan.id)}
                                                className="saving-plan-action-btn saving-plan-action-btn-update"
                                            >
                                                <FiEdit2 size={14} />
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                title="Delete plan"
                                                onClick={() => handleDelete(plan.id)}
                                                className="saving-plan-action-btn saving-plan-action-btn-delete"
                                            >
                                                <FiTrash2 size={14} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredSavingPlan.length === 0 && (
                            <tr>
                                <td colSpan="8" className="saving-overview-empty">
                                    <div className="saving-overview-empty-title">No saving plans found for {activeYear}</div>
                                    <div className="saving-overview-empty-text">Create a plan to start tracking your monthly money flow.</div>
                                    <Button variant="primary" size="sm" onClick={handleAdd}>Create Your First Plan</Button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </section>
        </Container>
    );

}

export default SavingPlan;