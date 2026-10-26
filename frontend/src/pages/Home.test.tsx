// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home } from './Home';
import { api } from '../services/api';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

it('starts an airport request with the selected airport and address', () => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [] } });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/requests/airport" element={<h1>Airport request</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Airport transfer' }));
  fireEvent.change(screen.getByLabelText('Egyptian airport'), { target: { value: 'CAI' } });
  fireEvent.change(screen.getByLabelText('Your hotel or address'), { target: { value: 'Giza hotel' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue planning' }));
  expect(screen.getByText('Airport request')).toBeTruthy();
  expect(JSON.parse(sessionStorage.getItem('eldob-request-airport')!).fields).toMatchObject({
    airport: 'CAI',
    address: 'Giza hotel',
  });
});

it('keeps daily rental dates while browsing the fleet', () => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [] } });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cars" element={<h1>Cars catalogue</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2099-02-01' } });
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2099-02-03' } });
  fireEvent.click(screen.getByRole('button', { name: 'Explore cars' }));
  expect(screen.getByText('Cars catalogue')).toBeTruthy();
  expect(JSON.parse(sessionStorage.getItem('eldob-daily-search')!)).toMatchObject({
    startDate: '2099-02-01',
    endDate: '2099-02-03',
  });
});
