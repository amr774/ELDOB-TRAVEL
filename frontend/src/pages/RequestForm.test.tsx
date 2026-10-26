// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RequestForm } from './RequestForm';
import { api } from '../services/api';
const auth = vi.hoisted(() => ({
  user: { id: 'test-customer' } as { id: string } | null,
}));
vi.mock('../features/auth/AuthProvider', () => ({ useAuth: () => auth }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
  auth.user = { id: 'test-customer' };
});
function open(path = '/requests/airport') {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/requests/:kind" element={<RequestForm />} />
          <Route path="/contact" element={<RequestForm inquiry />} />
          <Route path="/hotels" element={<h1>Hotel catalogue</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function fillAirport() {
  const set = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  set('Airport in Egypt', 'CAI');
  set('Drop-off hotel / exact address', 'Test hotel in Giza');
  set('Flight landing date', '2099-02-01');
  set('Landing time (Egypt)', '10:00');
  set('Requested pickup date', '2099-02-01');
  set('Requested pickup time (Egypt)', '11:00');
  set('Contact phone with country code', '+201000000000');
}
describe('Service request experience', () => {
  it('shows the airport list and sends only after explicit review confirmation', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { id: 'REQUEST-TEST' } });
    open();
    expect(
      screen.getByRole('option', { name: 'Cairo International (CAI)' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('option', { name: 'Sphinx International — Giza (SPX)' }),
    ).toBeTruthy();
    fillAirport();
    fireEvent.click(screen.getByRole('button', { name: 'Review request' }));
    await screen.findByRole('region', { name: 'Review your request' });
    expect(post).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Send quotation request' }),
    );
    await screen.findByText('REQUEST-TEST');
    expect(post).toHaveBeenCalledWith(
      '/requests',
      expect.objectContaining({
        kind: 'TRIP',
        destination: 'Test hotel in Giza',
        pickupLocation: expect.stringContaining('(CAI)'),
      }),
    );
    expect(
      screen
        .getByRole('link', { name: 'Track my request' })
        .getAttribute('href'),
    ).toBe('/account');
  });
  it('preserves a guest draft explicitly before sign-in', async () => {
    auth.user = null;
    open();
    fillAirport();
    fireEvent.click(screen.getByRole('button', { name: 'Review request' }));
    const link = await screen.findByRole('link', {
      name: 'Save draft & sign in',
    });
    expect(link.getAttribute('href')).toContain('next=%2Frequests%2Fairport');
    // Prevent navigation so this test can inspect the saved draft.
    link.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(link);
    expect(
      JSON.parse(sessionStorage.getItem('eldob-request-airport')!).fields
        .airport,
    ).toBe('CAI');
  });
  it('opens the hotel catalogue from the service switcher and supports business links', async () => {
    open('/requests/trip?purpose=business');
    expect(
      (screen.getByLabelText('Journey purpose') as HTMLSelectElement).value,
    ).toBe('Business / أعمال');
    fireEvent.click(screen.getByRole('link', { name: 'Hotel stay' }));
    await waitFor(() =>
      expect(screen.getByText('Hotel catalogue')).toBeTruthy(),
    );
    expect(screen.queryByLabelText('Airport in Egypt')).toBeNull();
  });
  it('sends contact name, email and phone with the inquiry', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 'CONTACT-TEST' } });
    open('/contact');
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Amina Ali' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'amina@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '+201000000000' } });
    fireEvent.change(screen.getByLabelText('How can we help?'), { target: { value: 'Please call me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review request' }));
    await screen.findByRole('region', { name: 'Review your request' });
    fireEvent.click(screen.getByRole('button', { name: 'Send quotation request' }));
    await screen.findByText('CONTACT-TEST');
    expect(post).toHaveBeenCalledWith('/requests', expect.objectContaining({
      kind: 'INQUIRY',
      notes: expect.stringContaining('amina@example.com'),
    }));
  });
});
