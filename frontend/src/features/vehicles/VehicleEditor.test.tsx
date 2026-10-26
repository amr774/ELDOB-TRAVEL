// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VehicleEditor } from './VehicleEditor';
import { api } from '../../services/api';
import type { Car } from '../../types';
const car: Car = {
  id: 'car-test',
  name: 'Test car',
  brand: 'Brand',
  model: 'Model',
  year: 2026,
  pricePerDay: 1500,
  available: true,
  images: [],
  image: '/uploads/existing.jpg',
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function open(value: Car = car) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <VehicleEditor car={value} close={vi.fn()} />
    </QueryClientProvider>,
  );
  return invalidate;
}
function link(url: string) {
  fireEvent.change(screen.getByLabelText('Image link (HTTPS)'), {
    target: { value: url },
  });
}
describe('Vehicle image links', () => {
  it('saves a pasted link directly with old uploaded photos preserved and refreshes details', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} });
    const invalidate = open();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    link('https://images.example.com/new-car.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Save vehicle' }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(
        '/cars/car-test',
        expect.objectContaining({
          image: '/uploads/existing.jpg',
          images: ['https://images.example.com/new-car.jpg'],
        }),
      ),
    );
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['car', 'car-test'],
      }),
    );
  });
  it('adds and promotes a gallery image to the main photo without uploading', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} });
    const post = vi.spyOn(api, 'post');
    open();
    link('https://images.example.com/car.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Add image link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Make main photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save vehicle' }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(
        '/cars/car-test',
        expect.objectContaining({
          image: 'https://images.example.com/car.jpg',
          images: ['/uploads/existing.jpg'],
        }),
      ),
    );
    expect(post).not.toHaveBeenCalled();
  });
  it('blocks invalid and duplicate links before saving', () => {
    const patch = vi.spyOn(api, 'patch');
    open();
    link('javascript:alert(1)');
    fireEvent.click(screen.getByRole('button', { name: 'Save vehicle' }));
    expect(screen.getByRole('alert').textContent).toContain('HTTPS');
    expect(patch).not.toHaveBeenCalled();
    link('https://images.example.com/car.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Add image link' }));
    link('https://images.example.com/car.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Add image link' }));
    expect(screen.getByRole('alert').textContent).toContain('already');
  });
  it('enforces the gallery limit and displays a useful preview failure', () => {
    open({
      ...car,
      images: Array.from(
        { length: 11 },
        (_, i) => `https://images.example.com/${i}.jpg`,
      ),
    });
    link('https://images.example.com/extra.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Add image link' }));
    expect(screen.getByRole('alert').textContent).toContain('12');
    fireEvent.error(screen.getAllByRole('img')[0]);
    expect(screen.getByRole('status').textContent).toContain('could not load');
  });
});
