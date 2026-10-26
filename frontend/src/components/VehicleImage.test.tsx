// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VehicleImage } from './VehicleImage';
afterEach(cleanup);
it('recovers with a placeholder and retries when the image URL changes', () => {
  const { rerender } = render(
    <VehicleImage src="https://example.com/broken.jpg" alt="Test car" />,
  );
  fireEvent.error(screen.getByRole('img'));
  expect(screen.queryByRole('img')).toBeNull();
  expect(
    screen.getByText('Vehicle photo is temporarily unavailable'),
  ).toBeTruthy();
  rerender(<VehicleImage src="https://example.com/new.jpg" alt="Test car" />);
  expect(screen.getByRole('img').getAttribute('src')).toBe(
    'https://example.com/new.jpg',
  );
});
