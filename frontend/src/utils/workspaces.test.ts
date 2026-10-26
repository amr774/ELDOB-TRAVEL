import { describe, expect, it } from 'vitest';
import { workspacePath } from './workspaces';
describe('Workspace destinations', () => {
  it('routes owners to company management', () =>
    expect(workspacePath({ role: 'OWNER', operationsEnabled: false })).toBe(
      '/owner',
    ));
  it('routes verified employees to operations', () =>
    expect(workspacePath({ role: 'EMPLOYEE', operationsEnabled: true })).toBe(
      '/operations',
    ));
  it('does not send historical unverified employees to staff pages', () =>
    expect(workspacePath({ role: 'EMPLOYEE', operationsEnabled: false })).toBe(
      '/account',
    ));
  it('keeps customers in their own portal', () =>
    expect(workspacePath({ role: 'CUSTOMER', operationsEnabled: true })).toBe(
      '/account',
    ));
});
