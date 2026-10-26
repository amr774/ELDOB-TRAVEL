// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../hooks/useLanguage';
import { WorkspaceLayout } from './WorkspaceLayout';

const session = vi.hoisted(() => ({
  user: { fullName: 'Test employee', role: 'EMPLOYEE' as 'EMPLOYEE' | 'OWNER' },
}));
vi.mock('../features/auth/AuthProvider', () => ({ useAuth: () => session }));
function showWorkspace() {
  render(
    <LanguageProvider>
      <MemoryRouter>
        <WorkspaceLayout />
      </MemoryRouter>
    </LanguageProvider>,
  );
}
afterEach(() => {
  cleanup();
  localStorage.clear();
  session.user.role = 'EMPLOYEE';
});
describe('Workspace navigation', () => {
  it('shows operational tools without owner-only financial or permission links', () => {
    showWorkspace();
    expect(screen.getByRole('link', { name: 'Daily operations' })).toBeTruthy();
    expect(
      screen.queryByRole('link', { name: 'Payments & revenue' }),
    ).toBeNull();
    expect(
      screen.queryByRole('link', { name: 'People & permissions' }),
    ).toBeNull();
  });
  it('shows company controls for the owner', () => {
    session.user.role = 'OWNER';
    showWorkspace();
    expect(
      screen
        .getByRole('link', { name: 'Payments & revenue' })
        .getAttribute('href'),
    ).toBe('/owner#payments');
    expect(
      screen.getByRole('link', { name: 'People & permissions' }),
    ).toBeTruthy();
  });
  it('switches the staff workspace to Arabic and RTL', () => {
    showWorkspace();
    fireEvent.click(screen.getByRole('button', { name: 'العربية' }));
    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getByRole('link', { name: 'العمليات اليومية' })).toBeTruthy();
  });
});
