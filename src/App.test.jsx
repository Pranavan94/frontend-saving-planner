import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from './App.jsx';

vi.mock('./api/auth.js', () => ({
  getAccessToken: () => 'mock-token',
}));

test('renders app navbar', () => {
  render(
    <MemoryRouter initialEntries={['/does-not-exist']}>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByText(/saving planner/i)).toBeInTheDocument();
});
