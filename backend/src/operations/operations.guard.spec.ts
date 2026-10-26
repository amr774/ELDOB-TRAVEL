import { ExecutionContext } from '@nestjs/common';
import { OperationsGuard } from './operations.guard';
describe('Operational authorization', () => {
  const guard = new OperationsGuard();
  const context = (role: string, operationsEnabled = false) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: { role, operationsEnabled } }),
      }),
    }) as ExecutionContext;
  it('denies customers even if the operations flag is set', () =>
    expect(guard.canActivate(context('CUSTOMER', true))).toBe(false));
  it('denies legacy publicly registered employees', () =>
    expect(guard.canActivate(context('EMPLOYEE'))).toBe(false));
  it('admits explicitly verified employees', () =>
    expect(guard.canActivate(context('EMPLOYEE', true))).toBe(true));
  it('admits owners', () =>
    expect(guard.canActivate(context('OWNER'))).toBe(true));
});
