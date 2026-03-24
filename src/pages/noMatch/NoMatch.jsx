
import { Link } from 'react-router-dom';
import './NoMatch.css';

const NoMatch = () => {
    return (
        <main className="no-match-page">
            <section className="no-match-card" aria-label="Page not found">
                <p className="no-match-code">404</p>
                <h1 className="no-match-title">Page not found</h1>
                <p className="no-match-text">The page you are looking for does not exist or has been moved.</p>
                <Link to="/" className="btn no-match-button">
                    Back to Home
                </Link>
            </section>
        </main>
    );
};

export default NoMatch;