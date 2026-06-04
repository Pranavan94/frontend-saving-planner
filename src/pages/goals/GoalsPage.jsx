import { useEffect, useState } from 'react';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import { FiCheckCircle, FiEdit2, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { authFetch } from '../../api/client';
import { ProgressDonut, ProjectionChart } from './GoalCharts';
import {
    computeGoalStats,
    currencyOptions,
    formatCurrency,
    formatDate,
    formatDateForInput,
} from './goalUtils';
import './Goals.css';

const buildEmptyForm = (isInvestment) => ({
    purpose: '',
    targetAmount: '',
    startDate: '',
    targetDate: '',
    startingAmount: '',
    ...(isInvestment ? { expectedAnnualReturnRate: '' } : {}),
});

const validateForm = (values, isInvestment) => {
    const errors = {};

    if (!String(values.purpose).trim()) {
        errors.purpose = 'Purpose is required.';
    }
    if (values.targetAmount === '' || Number(values.targetAmount) <= 0) {
        errors.targetAmount = 'Target amount must be greater than zero.';
    }
    if (values.startingAmount !== '' && Number(values.startingAmount) < 0) {
        errors.startingAmount = 'Starting amount cannot be negative.';
    }
    if (values.startDate && values.targetDate && new Date(values.targetDate) < new Date(values.startDate)) {
        errors.targetDate = 'Target date must be after the start date.';
    }
    if (isInvestment && values.expectedAnnualReturnRate !== '' && Number(values.expectedAnnualReturnRate) < 0) {
        errors.expectedAnnualReturnRate = 'Return rate cannot be negative.';
    }

    return errors;
};

const GoalsPage = ({
    apiPath,
    isInvestment = false,
    eyebrow,
    title,
    subtitle,
    heroClass = '',
    contributionLabel,
    addLabel,
    entityLabel,
}) => {
    const [goals, setGoals] = useState([]);
    const [currency, setCurrency] = useState('NOK');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({
        show: false,
        mode: 'create',
        id: null,
        values: buildEmptyForm(isInvestment),
        errors: {},
    });

    const fetchGoals = async () => {
        try {
            const data = await authFetch(apiPath);
            setGoals(Array.isArray(data) ? data : data.value || []);
        } catch (error) {
            console.error('Error fetching goals:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGoals();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiPath]);

    const openCreate = () => {
        setModal({
            show: true,
            mode: 'create',
            id: null,
            values: buildEmptyForm(isInvestment),
            errors: {},
        });
    };

    const openEdit = (goal) => {
        setModal({
            show: true,
            mode: 'edit',
            id: goal.id,
            values: {
                purpose: goal.purpose ?? '',
                targetAmount: goal.targetAmount ?? '',
                startDate: formatDateForInput(goal.startDate),
                targetDate: formatDateForInput(goal.targetDate),
                startingAmount: goal.startingAmount ?? '',
                ...(isInvestment ? { expectedAnnualReturnRate: goal.expectedAnnualReturnRate ?? '' } : {}),
            },
            errors: {},
        });
    };

    const closeModal = () => setModal((prev) => ({ ...prev, show: false }));

    const handleFieldChange = (field, value) => {
        setModal((prev) => ({
            ...prev,
            values: { ...prev.values, [field]: value },
            errors: { ...prev.errors, [field]: '' },
        }));
    };

    const handleSave = async () => {
        const errors = validateForm(modal.values, isInvestment);
        if (Object.keys(errors).length > 0) {
            setModal((prev) => ({ ...prev, errors }));
            return;
        }

        const { values } = modal;
        const payload = {
            purpose: String(values.purpose).trim(),
            targetAmount: Number(values.targetAmount),
            startDate: values.startDate ? new Date(values.startDate).toISOString() : null,
            targetDate: values.targetDate ? new Date(values.targetDate).toISOString() : null,
            startingAmount: values.startingAmount === '' ? 0 : Number(values.startingAmount),
            ...(isInvestment
                ? { expectedAnnualReturnRate: values.expectedAnnualReturnRate === '' ? 0 : Number(values.expectedAnnualReturnRate) }
                : {}),
        };

        try {
            const url = modal.mode === 'create' ? apiPath : `${apiPath}/${modal.id}`;
            await authFetch(url, {
                method: modal.mode === 'create' ? 'POST' : 'PUT',
                body: JSON.stringify(payload),
            });
            closeModal();
            fetchGoals();
        } catch (error) {
            console.error('Error saving goal:', error);
            setModal((prev) => ({ ...prev, errors: { ...prev.errors, form: error.message } }));
        }
    };

    const handleDelete = async (goalId) => {
        try {
            await authFetch(`${apiPath}/${goalId}`, { method: 'DELETE' });
            setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
        } catch (error) {
            console.error('Error deleting goal:', error);
        }
    };

    const renderStatusChip = (stats) => {
        if (stats.reached) {
            return <span className="goal-status-chip goal-status-chip-reached"><FiCheckCircle size={13} /> Goal reached</span>;
        }
        if (stats.onTrack) {
            return <span className="goal-status-chip goal-status-chip-ok"><FiCheckCircle size={13} /> On track</span>;
        }
        return <span className="goal-status-chip goal-status-chip-behind"><FiAlertTriangle size={13} /> Behind target</span>;
    };

    const getProjectedByTargetValueClass = (projectedFinal, targetAmount) => (
        projectedFinal < targetAmount
            ? 'goal-metric-value goal-metric-value-negative'
            : 'goal-metric-value goal-metric-value-positive'
    );

    return (
        <Container className="goals-page py-4">
            <section className={`goals-hero ${heroClass}`}>
                <div>
                    <div className="goals-eyebrow">{eyebrow}</div>
                    <h1>{title}</h1>
                    <p>{subtitle}</p>
                </div>
                <div className="goals-hero-actions">
                    <Button className="goals-add-btn" onClick={openCreate}>+ {addLabel}</Button>
                </div>
            </section>

            <section className="goals-toolbar">
                <Form.Group controlId="goal-currency">
                    <Form.Label className="mb-1">Display currency</Form.Label>
                    <Form.Select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                        {currencyOptions.map((option) => (
                            <option key={option.code} value={option.code}>
                                {option.label} ({option.code})
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>
            </section>

            {loading ? (
                <p className="text-center mt-4">Loading...</p>
            ) : goals.length === 0 ? (
                <div className="goals-empty">
                    <div className="goals-empty-title">No {entityLabel} yet</div>
                    <div className="goals-empty-text">Create your first one to start tracking progress toward your target.</div>
                    <Button className="goals-add-btn" onClick={openCreate}>+ {addLabel}</Button>
                </div>
            ) : (
                <div className="goals-grid">
                    {goals.map((goal) => {
                        const stats = computeGoalStats({
                            currentAmount: goal.currentAmount ?? goal.startingAmount ?? 0,
                            targetAmount: goal.targetAmount,
                            targetDate: goal.targetDate,
                            monthlyContribution: goal.averageMonthlyContribution ?? 0,
                            annualReturnRate: isInvestment ? goal.expectedAnnualReturnRate : 0,
                        });

                        return (
                            <article className="goal-card" key={goal.id}>
                                <div className="goal-card-header">
                                    <div>
                                        <h2 className="goal-card-title">{goal.purpose}</h2>
                                        <p className="goal-card-subtitle">
                                            {formatDate(goal.startDate) || '—'} → {formatDate(goal.targetDate) || 'no target date'}
                                        </p>
                                        <div className="mt-2">{renderStatusChip(stats)}</div>
                                    </div>
                                    <div className="goal-card-actions">
                                        <Button variant="outline-secondary" size="sm" title="Edit" onClick={() => openEdit(goal)}>
                                            <FiEdit2 size={14} />
                                        </Button>
                                        <Button variant="outline-danger" size="sm" title="Delete" onClick={() => handleDelete(goal.id)}>
                                            <FiTrash2 size={14} />
                                        </Button>
                                    </div>
                                </div>

                                <div className="goal-card-body">
                                    <ProgressDonut
                                        progressPct={stats.progressPct}
                                        reached={stats.reached}
                                        onTrack={stats.onTrack}
                                    />
                                    <div className="goal-metrics">
                                        <div className="goal-metric">
                                            <div className="goal-metric-label">Target</div>
                                            <div className="goal-metric-value">{formatCurrency(goal.targetAmount, currency)}</div>
                                        </div>
                                        <div className="goal-metric">
                                            <div className="goal-metric-label">{isInvestment ? 'Invested' : 'Saved'}</div>
                                            <div className="goal-metric-value positive">
                                                {formatCurrency(goal.currentAmount ?? goal.startingAmount ?? 0, currency)}
                                            </div>
                                        </div>
                                        <div className="goal-metric">
                                            <div className="goal-metric-label">Remaining</div>
                                            <div className="goal-metric-value">{formatCurrency(stats.remaining, currency)}</div>
                                        </div>
                                        <div className="goal-metric">
                                            <div className="goal-metric-label">{contributionLabel}</div>
                                            <div className="goal-metric-value">{formatCurrency(goal.averageMonthlyContribution ?? 0, currency)}</div>
                                        </div>
                                        {isInvestment && (
                                            <div className="goal-metric">
                                                <div className="goal-metric-label">Expected return</div>
                                                <div className="goal-metric-value">{Number(goal.expectedAnnualReturnRate ?? 0)}% / yr</div>
                                            </div>
                                        )}
                                        <div className="goal-metric">
                                            <div className="goal-metric-label">Projected by target</div>
                                            <div className={getProjectedByTargetValueClass(stats.projectedFinal, goal.targetAmount)}>
                                                {formatCurrency(stats.projectedFinal, currency)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="goal-projection-title">Projection toward target</div>
                                    <ProjectionChart series={stats.series} targetAmount={goal.targetAmount} currency={currency} />
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <Modal show={modal.show} onHide={closeModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{modal.mode === 'create' ? addLabel : `Edit ${entityLabel.replace(/s$/, '')}`}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {modal.errors.form && <div className="alert alert-danger py-2">{modal.errors.form}</div>}
                    <Form.Group className="mb-3" controlId="goal-purpose">
                        <Form.Label>Purpose</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder={isInvestment ? 'e.g. Retirement fund' : 'e.g. New car, summer vacation'}
                            value={modal.values.purpose}
                            onChange={(event) => handleFieldChange('purpose', event.target.value)}
                            isInvalid={Boolean(modal.errors.purpose)}
                        />
                        <Form.Control.Feedback type="invalid">{modal.errors.purpose}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="goal-target-amount">
                        <Form.Label>Target amount</Form.Label>
                        <Form.Control
                            type="number"
                            min={0}
                            step="any"
                            value={modal.values.targetAmount}
                            onChange={(event) => handleFieldChange('targetAmount', event.target.value)}
                            isInvalid={Boolean(modal.errors.targetAmount)}
                        />
                        <Form.Control.Feedback type="invalid">{modal.errors.targetAmount}</Form.Control.Feedback>
                    </Form.Group>

                    <div className="d-flex gap-3">
                        <Form.Group className="mb-3 flex-fill" controlId="goal-start-date">
                            <Form.Label>Start date</Form.Label>
                            <Form.Control
                                type="date"
                                value={modal.values.startDate}
                                onChange={(event) => handleFieldChange('startDate', event.target.value)}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3 flex-fill" controlId="goal-target-date">
                            <Form.Label>Target date</Form.Label>
                            <Form.Control
                                type="date"
                                value={modal.values.targetDate}
                                onChange={(event) => handleFieldChange('targetDate', event.target.value)}
                                isInvalid={Boolean(modal.errors.targetDate)}
                            />
                            <Form.Control.Feedback type="invalid">{modal.errors.targetDate}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <Form.Group className="mb-3" controlId="goal-starting-amount">
                        <Form.Label>Amount already {isInvestment ? 'invested' : 'saved'} (optional)</Form.Label>
                        <Form.Control
                            type="number"
                            min={0}
                            step="any"
                            value={modal.values.startingAmount}
                            onChange={(event) => handleFieldChange('startingAmount', event.target.value)}
                            isInvalid={Boolean(modal.errors.startingAmount)}
                        />
                        <Form.Control.Feedback type="invalid">{modal.errors.startingAmount}</Form.Control.Feedback>
                    </Form.Group>

                    {isInvestment && (
                        <Form.Group className="mb-1" controlId="goal-return-rate">
                            <Form.Label>Expected annual return (%)</Form.Label>
                            <Form.Control
                                type="number"
                                min={0}
                                step="any"
                                placeholder="e.g. 7"
                                value={modal.values.expectedAnnualReturnRate}
                                onChange={(event) => handleFieldChange('expectedAnnualReturnRate', event.target.value)}
                                isInvalid={Boolean(modal.errors.expectedAnnualReturnRate)}
                            />
                            <Form.Control.Feedback type="invalid">{modal.errors.expectedAnnualReturnRate}</Form.Control.Feedback>
                        </Form.Group>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>
                        {modal.mode === 'create' ? 'Create' : 'Save Changes'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default GoalsPage;
