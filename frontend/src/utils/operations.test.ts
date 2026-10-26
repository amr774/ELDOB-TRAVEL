import { describe, expect, it } from 'vitest';
import { filterRequests, matchesSearch } from './operations';
import type { ServiceRequest } from '../types';
const rows: ServiceRequest[] = [
  { id: 'a', kind: 'TRIP', status: 'PENDING', destination: 'Cairo Airport' },
  { id: 'b', kind: 'HOTEL', status: 'CONFIRMED', city: 'الأقصر' },
  { id: 'c', kind: 'INQUIRY', status: 'PENDING', notes: 'Group transfer' },
];
describe('Operational queues', () => {
  it('combines service and status filters', () =>
    expect(filterRequests(rows, '', 'HOTEL', 'PENDING')).toEqual([]));
  it('searches Arabic locations', () =>
    expect(filterRequests(rows, 'الأقصر', '', '')[0].id).toBe('b'));
  it('finds airport transportation without a separate booking model', () =>
    expect(filterRequests(rows, 'AIRPORT', 'TRIP', 'PENDING')[0].id).toBe('a'));
  it('handles missing optional contact details', () =>
    expect(matchesSearch('someone', [undefined])).toBe(false));
});
