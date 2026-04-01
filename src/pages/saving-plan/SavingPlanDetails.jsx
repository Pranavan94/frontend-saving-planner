import './SavingPlanDetails.css';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { authFetch } from '../../api/client';
import {
    createEmptyInsuranceEntry,
    createEmptySubscriptionEntry,
    emptyMonthlyExpenses,
    fixedMonthlyExpenseFields,
    normalizeMonthlyExpenses,
    getMonthlyExpensesTotal,
    toNumericMonthlyExpenses,
    variableMonthlyExpenseFields,
} from './monthlyExpenses.jsx';

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
    savings: '',
    investments: '',
    monthlyExpenses: emptyMonthlyExpenses,
};

const recurringExpensePaths = fixedMonthlyExpenseFields.map((field) => `monthlyExpenses.${field.key}`);
const variableExpensePaths = variableMonthlyExpenseFields.map((field) => `monthlyExpenses.${field.key}`);
const namedAmountSectionConfig = {
    insurancePayment: {
        title: 'Insurance',
        singularTitle: 'Insurance',
        requiresCompanyName: true,
    },
    subscriptions: {
        title: 'Subscriptions',
        singularTitle: 'Subscription',
        requiresCompanyName: false,
    },
};
const requiredMonthlyExpensePaths = [
    'monthlyExpenses.mortgagePayment',
    'monthlyExpenses.sharedHouseCost',
    'monthlyExpenses.foodBudget',
];

const getTotalExpenses = (values) =>
    (Number(values.savings) || 0)
    + (Number(values.investments) || 0)
    + getMonthlyExpensesTotal(values.monthlyExpenses);

const getOverspend = (values) =>
    getTotalExpenses(values) - (Number(values.monthlyIncome) || 0);

const getValueAtPath = (values, path) =>
    path.split('.').reduce((current, key) => current?.[key], values);

const setValueAtPath = (values, path, nextValue) => {
    const pathSegments = path.split('.');
    const updatedValues = { ...values };
    let current = updatedValues;

    pathSegments.forEach((segment, index) => {
        if (index === pathSegments.length - 1) {
            current[segment] = nextValue;
            return;
        }

        current[segment] = { ...current[segment] };
        current = current[segment];
    });

    return updatedValues;
};

const getNamedAmountPath = (section, index, field) =>
    `monthlyExpenses.${section}.${index}.${field}`;

const createNamedAmountEntry = (section) =>
    section === 'insurancePayment'
        ? createEmptyInsuranceEntry()
        : createEmptySubscriptionEntry();

const normalizeSavingPlanForm = (data = {}) => ({
    startDate: formatDateForInput(data.startDate),
    endDate: formatDateForInput(data.endDate),
    monthlyIncome: data.monthlyIncome ?? '',
    savings: data.savings ?? '',
    investments: data.investments ?? '',
    monthlyExpenses: normalizeMonthlyExpenses(data.monthlyExpenses, data),
});

const validateField = (name, value) => {
    if (name === 'startDate' || name === 'endDate') {
        if (!value) return `${name === 'startDate' ? 'Start' : 'End'} date is required.`;
    }
    const numericFields = [
        'monthlyIncome',
        'savings',
        'investments',
        ...recurringExpensePaths,
        ...variableExpensePaths,
    ];
    if (numericFields.includes(name)) {
        const isEmpty = value === '' || value === null || value === undefined;
        const isRequiredMonthlyExpense = requiredMonthlyExpensePaths.includes(name);

        if (isEmpty && isRequiredMonthlyExpense) return 'This field is required.';
        if (isEmpty) return '';
        if (isNaN(Number(value)) || Number(value) < 0) return 'Must be a non-negative number.';
    }
    return '';
};

const validateNamedAmountEntries = (entries, section, config) => {
    const nextErrors = {};
    const requiresCompanyName = config.requiresCompanyName;

    entries.forEach((entry, index) => {
        const name = String(entry?.name ?? '').trim();
        const companyName = String(entry?.companyName ?? '').trim();
        const amountCost = entry?.amountCost;
        const hasName = name.length > 0;
        const hasCompanyName = companyName.length > 0;
        const hasAmountCost = amountCost !== '' && amountCost !== null && amountCost !== undefined;
        const namePath = getNamedAmountPath(section, index, 'name');
        const companyNamePath = getNamedAmountPath(section, index, 'companyName');
        const amountCostPath = getNamedAmountPath(section, index, 'amountCost');

        const hasAnyValue = hasName || hasAmountCost || (requiresCompanyName && hasCompanyName);

        if (hasAnyValue) {
            if (!hasName) {
                nextErrors[namePath] = 'Name is required.';
            }

            if (requiresCompanyName && !hasCompanyName) {
                nextErrors[companyNamePath] = 'Company name is required.';
            }

            if (!hasAmountCost) {
                nextErrors[amountCostPath] = 'Amount cost is required.';
            }
        }

        if (hasAmountCost && (isNaN(Number(amountCost)) || Number(amountCost) < 0)) {
            nextErrors[amountCostPath] = 'Must be a non-negative number.';
        }
    });

    return nextErrors;
};

const SavingPlanDetails = () => {
    const { id } = useParams();
    const isNew = id === 'new';
    const navigate = useNavigate();

    const [formData, setFormData] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [loading, setLoading] = useState(!isNew);
    const [entryModal, setEntryModal] = useState({
        show: false,
        section: 'subscriptions',
        index: -1,
        values: createEmptySubscriptionEntry(),
        errors: {},
    });

    useEffect(() => {
        if (isNew) return;

        const fetchPlan = async () => {
            try {
                const data = await authFetch(`/api/v1/finance/overview/${id}`);
                setFormData(normalizeSavingPlanForm(data));
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
        const nextFormData = setValueAtPath(formData, name, value);
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

    const handleAddNamedAmountEntry = (section) => {
        setEntryModal({
            show: true,
            section,
            index: -1,
            values: createNamedAmountEntry(section),
            errors: {},
        });
    };

    const handleRemoveNamedAmountEntry = (section, index) => {
        const currentEntries = formData.monthlyExpenses[section] ?? [];
        const nextEntries = currentEntries.length <= 1
            ? [createNamedAmountEntry(section)]
            : currentEntries.filter((_, entryIndex) => entryIndex !== index);

        const nextFormData = {
            ...formData,
            monthlyExpenses: {
                ...formData.monthlyExpenses,
                [section]: nextEntries,
            },
        };

        setFormData(nextFormData);
        setErrors(validateAll(nextFormData));
    };

    const handleOpenEditModal = (section, index) => {
        const entries = formData.monthlyExpenses?.[section] ?? [];
        const selected = entries[index] ?? createNamedAmountEntry(section);

        setEntryModal({
            show: true,
            section,
            index,
            values: selected,
            errors: {},
        });
    };

    const handleCloseEntryModal = () => {
        setEntryModal((prev) => ({ ...prev, show: false, errors: {} }));
    };

    const handleEntryModalChange = (field, value) => {
        setEntryModal((prev) => ({
            ...prev,
            values: {
                ...prev.values,
                [field]: value,
            },
            errors: {
                ...prev.errors,
                [field]: '',
            },
        }));
    };

    const validateEntryModalValues = () => {
        const sectionConfig = namedAmountSectionConfig[entryModal.section];
        const nextErrors = {};
        const name = String(entryModal.values.name ?? '').trim();
        const companyName = String(entryModal.values.companyName ?? '').trim();
        const amountCost = entryModal.values.amountCost;

        if (!name) {
            nextErrors.name = 'Name is required.';
        }
        if (sectionConfig.requiresCompanyName && !companyName) {
            nextErrors.companyName = 'Company name is required.';
        }
        if (amountCost === '' || amountCost === null || amountCost === undefined) {
            nextErrors.amountCost = 'Amount cost is required.';
        } else if (isNaN(Number(amountCost)) || Number(amountCost) < 0) {
            nextErrors.amountCost = 'Must be a non-negative number.';
        }

        return nextErrors;
    };

    const handleSaveEntryModal = () => {
        const modalErrors = validateEntryModalValues();

        if (Object.keys(modalErrors).length > 0) {
            setEntryModal((prev) => ({ ...prev, errors: modalErrors }));
            return;
        }

        const section = entryModal.section;
        const currentEntries = [...(formData.monthlyExpenses?.[section] ?? [])];

        if (entryModal.index === -1) {
            currentEntries.push(entryModal.values);
        } else {
            currentEntries[entryModal.index] = entryModal.values;
        }

        const nextEntries = currentEntries.filter((entry) => {
            const hasName = String(entry.name ?? '').trim();
            const hasAmount = String(entry.amountCost ?? '').trim();
            const hasCompany = String(entry.companyName ?? '').trim();
            return hasName || hasAmount || hasCompany;
        });

        const nextFormData = {
            ...formData,
            monthlyExpenses: {
                ...formData.monthlyExpenses,
                [section]: nextEntries.length > 0 ? nextEntries : [createNamedAmountEntry(section)],
            },
        };

        setFormData(nextFormData);
        setErrors(validateAll(nextFormData));
        handleCloseEntryModal();
    };

    const validateAll = (values) => {
        const next = {};
        [
            'startDate',
            'endDate',
            'monthlyIncome',
            'savings',
            'investments',
            ...recurringExpensePaths,
            ...variableExpensePaths,
        ].forEach((field) => {
            const msg = validateField(field, getValueAtPath(values, field));
            if (msg) next[field] = msg;
        });

        Object.entries(namedAmountSectionConfig).forEach(([section, config]) => {
            Object.assign(next, validateNamedAmountEntries(values.monthlyExpenses?.[section] ?? [], section, config));
        });

        return next;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const nextErrors = validateAll(formData);
        setTouched(
            Object.keys(nextErrors).reduce((acc, key) => ({ ...acc, [key]: true }), {
                startDate: true,
                endDate: true,
                monthlyIncome: true,
                savings: true,
                investments: true,
                ...recurringExpensePaths.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
                ...variableExpensePaths.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
                ...Object.entries(namedAmountSectionConfig).reduce((acc, [section, config]) => {
                    const entries = formData.monthlyExpenses?.[section] ?? [];

                    entries.forEach((_, index) => {
                        acc[getNamedAmountPath(section, index, 'name')] = true;
                        if (config.requiresCompanyName) {
                            acc[getNamedAmountPath(section, index, 'companyName')] = true;
                        }
                        acc[getNamedAmountPath(section, index, 'amountCost')] = true;
                    });

                    return acc;
                }, {}),
            })
        );
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) return;

        if (getOverspend(formData) > 0) return;

        try {
            const url = isNew ? '/api/v1/finance/overview/create' : `/api/v1/finance/overview/${id}`;

            const payload = {
                ...formData,
                startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
                monthlyIncome: Number(formData.monthlyIncome),
                savings: Number(formData.savings),
                investments: Number(formData.investments),
                monthlyExpenses: toNumericMonthlyExpenses(formData.monthlyExpenses),
            };

            await authFetch(url, {
                method: isNew ? 'POST' : 'PUT',
                body: JSON.stringify(payload),
            });

            navigate('/saving-plan-overview');
        } catch (error) {
            console.error('Error saving saving plan:', error);
        }
    };

    if (loading) return <p className="text-center mt-5">Loading...</p>;

    const overspend = getOverspend(formData);
    const isOverBudget = overspend > 0;

    const topLevelFields = [
        { name: 'startDate', label: 'Start Date', type: 'date' },
        { name: 'endDate', label: 'End Date', type: 'date' },
        { name: 'monthlyIncome', label: 'Monthly Income', type: 'number' },
        { name: 'savings', label: 'Savings', type: 'number' },
        { name: 'investments', label: 'Investments', type: 'number' },
    ];

    const renderField = ({ name, label, type }) => (
        <Form.Group controlId={`form-${name.replace(/\./g, '-')}`} key={name}>
            <Form.Label>{label}</Form.Label>
            <Form.Control
                type={type}
                name={name}
                value={getValueAtPath(formData, name)}
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
    );

    const renderNamedAmountSection = (section, config) => {
        const entries = formData.monthlyExpenses?.[section] ?? [];

        return (
            <div className="expense-subsection">
                <div className="named-amount-header">
                    <h3>{config.title}</h3>
                    <Button
                        variant="outline-primary"
                        size="sm"
                        type="button"
                        onClick={() => handleAddNamedAmountEntry(section)}
                    >
                        Add {config.singularTitle}
                    </Button>
                </div>
                <div className="named-amount-list">
                    {entries.map((entry, index) => {
                        const amountPath = getNamedAmountPath(section, index, 'amountCost');

                        return (
                            <div className="named-amount-item" key={`${section}-${index}`}>
                                <div>
                                    <div className="named-amount-title">{entry.name || 'Unnamed'}</div>
                                    {config.requiresCompanyName && (
                                        <div className="named-amount-meta">Company: {entry.companyName || '-'}</div>
                                    )}
                                    <div className="named-amount-meta">Amount Cost: {entry.amountCost || 0}</div>
                                    {errors[amountPath] && <div className="text-danger small">{errors[amountPath]}</div>}
                                </div>
                                <div className="named-amount-actions">
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        type="button"
                                        onClick={() => handleOpenEditModal(section, index)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        type="button"
                                        onClick={() => handleRemoveNamedAmountEntry(section, index)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

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
                    <div className="saving-plan-details-grid">
                        {topLevelFields.map(renderField)}
                    </div>

                    <section className="expense-section">
                        <div className="expense-section-heading">
                            <div>
                                <h2>Monthly Expenses</h2>
                                <p>Organized as a nested object with fixed, variable, and subscription costs.</p>
                            </div>
                            <div className="expense-total">
                                Total: {new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(getMonthlyExpensesTotal(formData.monthlyExpenses))}
                            </div>
                        </div>

                        <div className="expense-subsection">
                            <h3>Fixed expenses</h3>
                            <div className="saving-plan-details-grid">
                                {fixedMonthlyExpenseFields.map((field) => renderField({
                                    name: `monthlyExpenses.${field.key}`,
                                    label: field.label,
                                    type: 'number',
                                }))}
                            </div>
                        </div>

                        <div className="expense-subsection">
                            <h3>Variable expenses</h3>
                            <div className="saving-plan-details-grid">
                                {variableMonthlyExpenseFields.map((field) => renderField({
                                    name: `monthlyExpenses.${field.key}`,
                                    label: field.label,
                                    type: 'number',
                                }))}
                            </div>
                        </div>

                        {Object.entries(namedAmountSectionConfig).map(([section, config]) =>
                            renderNamedAmountSection(section, config)
                        )}
                    </section>
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

            <Modal show={entryModal.show} onHide={handleCloseEntryModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {entryModal.index === -1 ? 'Add' : 'Edit'} {namedAmountSectionConfig[entryModal.section].singularTitle}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3" controlId="entry-name">
                        <Form.Label>Name</Form.Label>
                        <Form.Control
                            type="text"
                            value={entryModal.values.name ?? ''}
                            onChange={(event) => handleEntryModalChange('name', event.target.value)}
                            isInvalid={Boolean(entryModal.errors.name)}
                        />
                        <Form.Control.Feedback type="invalid">
                            {entryModal.errors.name}
                        </Form.Control.Feedback>
                    </Form.Group>

                    {namedAmountSectionConfig[entryModal.section].requiresCompanyName && (
                        <Form.Group className="mb-3" controlId="entry-company-name">
                            <Form.Label>Company Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={entryModal.values.companyName ?? ''}
                                onChange={(event) => handleEntryModalChange('companyName', event.target.value)}
                                isInvalid={Boolean(entryModal.errors.companyName)}
                            />
                            <Form.Control.Feedback type="invalid">
                                {entryModal.errors.companyName}
                            </Form.Control.Feedback>
                        </Form.Group>
                    )}

                    <Form.Group controlId="entry-amount-cost">
                        <Form.Label>Amount Cost</Form.Label>
                        <Form.Control
                            type="number"
                            min={0}
                            step="any"
                            value={entryModal.values.amountCost ?? ''}
                            onChange={(event) => handleEntryModalChange('amountCost', event.target.value)}
                            isInvalid={Boolean(entryModal.errors.amountCost)}
                        />
                        <Form.Control.Feedback type="invalid">
                            {entryModal.errors.amountCost}
                        </Form.Control.Feedback>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseEntryModal}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveEntryModal}>
                        Save
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default SavingPlanDetails;
