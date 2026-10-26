import type { User } from '../types';

export function workspacePath(
  user: Pick<User, 'role' | 'operationsEnabled'> | null,
) {
  if (user?.role === 'OWNER') return '/owner';
  if (user?.role === 'EMPLOYEE' && user.operationsEnabled) return '/operations';
  return '/account';
}
