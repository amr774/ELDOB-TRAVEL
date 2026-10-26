// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CarCard } from './CarCard';
afterEach(cleanup);
describe('Fleet cards', () => {
  it('renders real vehicle details without inventing photos or capacity', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <CarCard
            car={{
              id: '1',
              name: 'Test vehicle',
              brand: 'Brand',
              model: 'Model',
              year: 2025,
              pricePerDay: 1500,
              available: true,
              images: [],
            }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole('link', { name: 'Test vehicle' }).getAttribute('href'),
    ).toBe('/cars/1');
    expect(screen.getByText('Vehicle photo coming soon')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
