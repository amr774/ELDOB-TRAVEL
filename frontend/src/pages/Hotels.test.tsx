// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Hotels } from './Hotels';
import { api } from '../services/api';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('filters owner-listed hotels by city while keeping the apartment contact option', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: [
    { id: 'cairo', name: 'Cairo stay', city: 'Cairo', description: '', stars: 5, image: '' },
    { id: 'luxor', name: 'Luxor stay', city: 'Luxor', description: '', stars: 4, image: '' },
  ] });
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><Hotels /></MemoryRouter></QueryClientProvider>);
  await screen.findByText('Cairo stay');
  fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'Luxor' } });
  expect(screen.queryByText('Cairo stay')).toBeNull();
  expect(screen.getByText('Luxor stay')).toBeTruthy();
  expect(screen.getByRole('link', { name: /Ask about apartments/ }).getAttribute('href')).toBe('/contact?stay=apartment');
});
