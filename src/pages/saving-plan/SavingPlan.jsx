import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { authFetch } from "../../api/client";
import CsvUpload from './CsvUpload.jsx';
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
    <>
            <Container className="mt-5">
                <Row>
                    <Col>
                        <h1 className="text-center">My Saving Plan Overview {activeYear}</h1>
                        <div className="d-flex justify-content-end align-items-end gap-3 mb-3 flex-wrap">
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
                        <CsvUpload onUploadSuccess={handleUploadSuccess} />
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Monthly Income</th>
                                    <th>Monthly Expenses</th>
                                    <th>Savings</th>
                                    <th>Investments</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSavingPlan.map(savingPlan => {
                                    const overBudget = isOverBudget(savingPlan);
                                    const overspend = getTotalExpenses(savingPlan) - (Number(savingPlan.monthlyIncome) || 0);
                                    const monthlyExpenses = normalizeMonthlyExpenses(savingPlan.monthlyExpenses, savingPlan);
                                    return (
                                    <tr key={savingPlan.id} className={overBudget ? 'table-danger' : ''}>
                                        <td>{formatDateForView(savingPlan.startDate)}</td>
                                        <td>{formatDateForView(savingPlan.endDate)}</td>
                                        <td>{formatCurrencyForView(savingPlan.monthlyIncome, selectedCurrency)}</td>
                                        <td>
                                            <Link to={`/saving-plan-expenses/${savingPlan.id}`}>
                                                {formatCurrencyForView(getMonthlyExpensesTotal(monthlyExpenses), selectedCurrency)}
                                            </Link>
                                        </td>
                                        <td>{formatCurrencyForView(savingPlan.savings, selectedCurrency)}</td>
                                        <td>{formatCurrencyForView(savingPlan.investments, selectedCurrency)}</td>
                                        <td>
                                            {overBudget && (
                                                <div className="text-danger small mb-1">
                                                    Exceeds income by {formatCurrencyForView(overspend, selectedCurrency)}
                                                </div>
                                            )}
                                            <Button variant="outline-secondary" onClick={() => handleUpdate(savingPlan.id)}>Update</Button>
                                            <Button variant="outline-danger" onClick={() => handleDelete(savingPlan.id)} className="ms-2">Delete</Button>
                                        </td>       
                                    </tr>
                                    );
                                })}
                                {filteredSavingPlan.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="text-center py-4">
                                            No saving plans found for {activeYear}.
                                        </td>
                                    </tr>
                                )}
                            </tbody>    
                        </Table>
                    </Col>
                </Row>
                <Row className="mt-4">
                    <Col>
                        <Button variant="primary" onClick={() => handleAdd()}>
                            Add New Saving Plan
                        </Button>
                    </Col>
                </Row>
            </Container>
        </>
    )

}

export default SavingPlan;