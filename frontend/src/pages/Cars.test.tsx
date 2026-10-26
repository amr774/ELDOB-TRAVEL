// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Cars } from './Cars';
import { api } from '../services/api';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('clears visible filter fields when clearing URL filters', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { data: [], meta: { total: 0, page: 1, limit: 9, totalPages: 0 } },
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/cars?brand=BMW&search=Business']}>
        <Cars />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect((screen.getByLabelText('Brand') as HTMLInputElement).value).toBe(
    'BMW',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  await waitFor(() =>
    expect((screen.getByLabelText('Brand') as HTMLInputElement).value).toBe(''),
  );
  expect(
    (screen.getByLabelText('Search vehicles') as HTMLInputElement).value,
  ).toBe('');
});
