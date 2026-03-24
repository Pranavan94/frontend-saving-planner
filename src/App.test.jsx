import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';

test('renders app navbar', () => {
  render(
    <MemoryRouter initialEntries={['/does-not-exist']}>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByText(/saving planner/i)).toBeInTheDocument();
});
