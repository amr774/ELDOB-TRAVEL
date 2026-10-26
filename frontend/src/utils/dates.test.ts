import { describe, expect, it } from 'vitest';
import { cairoDateTime } from './dates';
describe('Egypt travel times', () => {
  it('uses Egypt winter offset', () =>
    expect(cairoDateTime('2027-01-15', '10:30')).toBe(
      '2027-01-15T08:30:00.000Z',
    ));
  it('uses Egypt summer offset', () =>
    expect(cairoDateTime('2027-07-15', '10:30')).toBe(
      '2027-07-15T07:30:00.000Z',
    ));
  it('rejects invalid dates', () =>
    expect(() => cairoDateTime('invalid', '10:30')).toThrow());
});
