// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HotelDetails } from './HotelDetails';
import { api } from '../services/api';
const auth = vi.hoisted(() => ({ user: { phone: '+201000000000' } as { phone: string } | null, ready: true }));
vi.mock('../features/auth/AuthProvider', () => ({ useAuth: () => auth }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); sessionStorage.clear(); auth.user = { phone: '+201000000000' }; });
async function open() {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { id: 'hotel-one', name: 'Selected hotel', city: 'Giza', stars: 5, image: '', description: 'A stay', available: true, pricePerNight: null } });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><MemoryRouter initialEntries={['/hotels/hotel-one']}><Routes><Route path="/hotels/:id" element={<HotelDetails />} /><Route path="/login" element={<p>Sign-in page</p>} /></Routes></MemoryRouter></QueryClientProvider>);
  await screen.findByText('Selected hotel');
  fireEvent.change(screen.getByLabelText('Check-in'), { target: { value: '2099-02-01' } });
  fireEvent.change(screen.getByLabelText('Check-out'), { target: { value: '2099-02-04' } });
  fireEvent.change(screen.getByLabelText('Contact phone'), { target: { value: '+201000000000' } });
}
describe('Simplified hotel requests', () => {
  it('submits the selected hotel and displays the tracking reference', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 'stay-123' } });
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Request this stay' }));
    await screen.findByText(/stay-123/);
    expect(post).toHaveBeenCalledWith('/requests', expect.objectContaining({ hotelId: 'hotel-one', kind: 'HOTEL', city: 'Giza', preference: 'Selected hotel', rooms: 1, passengers: 2 }));
  });
  it('retains guest details before navigating to sign in', async () => {
    auth.user = null;
    const post = vi.spyOn(api, 'post');
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Save & sign in to request' }));
    await screen.findByText('Sign-in page');
    expect(JSON.parse(sessionStorage.getItem('eldob-hotel-hotel-one') || '{}').fields.date).toBe('2099-02-01');
    expect(post).not.toHaveBeenCalled();
  });
  it('blocks checkout before arrival', async () => {
    const post = vi.spyOn(api, 'post');
    await open();
    fireEvent.change(screen.getByLabelText('Check-out'), { target: { value: '2099-01-01' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Request this stay' }).closest('form')!);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Check-out must follow check-in'));
    expect(post).not.toHaveBeenCalled();
  });
});
