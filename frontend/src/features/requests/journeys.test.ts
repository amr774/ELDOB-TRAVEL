import { describe, expect, it } from 'vitest';
import {
  buildRequest,
  defaults,
  egyptToday,
  type JourneyFields,
} from './journeys';
const now = new Date('2030-01-01T00:00:00Z');
const trip: JourneyFields = {
  ...defaults,
  date: '2030-02-01',
  time: '12:00',
  pickupLocation: 'Cairo hotel',
  destination: 'Alexandria hotel',
  contactPhone: '+201000000000',
};
const airport: JourneyFields = {
  ...trip,
  airport: 'CAI',
  address: 'Giza hotel',
  flightDate: '2030-02-01',
  flightTime: '11:00',
  flight: 'MS777',
  terminal: '3',
};
describe('Service request preparation', () => {
  it('maps airport arrivals to pickup and carries operational flight details', () => {
    const result = buildRequest('airport', airport, now);
    expect(result.kind).toBe('TRIP');
    expect(result.pickupLocation).toContain('(CAI)');
    expect(result.destination).toBe('Giza hotel');
    expect(result.notes).toContain('MS777');
    expect(result.notes).toContain('Terminal / الصالة: 3');
    expect(result.startDate).toBe('2030-02-01T10:00:00.000Z');
    expect(result).not.toHaveProperty('airport');
  });
  it('maps airport departures to destination', () => {
    const result = buildRequest(
      'airport',
      { ...airport, direction: 'departure', flightTime: '15:00' },
      now,
    );
    expect(result.pickupLocation).toBe('Giza hotel');
    expect(result.destination).toContain('(CAI)');
  });
  it('rejects impossible flight/pickup order and invalid airports', () => {
    expect(() =>
      buildRequest('airport', { ...airport, flightTime: '14:00' }, now),
    ).toThrow('Pickup');
    expect(() =>
      buildRequest('airport', { ...airport, direction: 'departure' }, now),
    ).toThrow('Pickup');
    expect(() =>
      buildRequest('airport', { ...airport, airport: 'XXX' }, now),
    ).toThrow('Select an airport');
  });
  it('keeps return transport details and rejects earlier returns', () => {
    expect(
      buildRequest(
        'trip',
        {
          ...trip,
          returnTrip: true,
          returnDate: '2030-02-03',
          returnTime: '14:00',
        },
        now,
      ).notes,
    ).toContain('2030-02-03 14:00');
    expect(() =>
      buildRequest(
        'trip',
        {
          ...trip,
          returnTrip: true,
          returnDate: '2030-01-30',
          returnTime: '14:00',
        },
        now,
      ),
    ).toThrow('Return pickup');
    expect(
      buildRequest(
        'trip',
        { ...trip, returnTrip: false, returnDate: '2030-01-30' },
        now,
      ).notes,
    ).not.toContain('Return requested');
  });
  it('validates hotel stays and children while keeping preferences', () => {
    const hotel = {
      ...trip,
      city: 'Hurghada',
      endDate: '2030-02-04',
      passengers: 3,
      children: 2,
      childAges: '4, 8',
      rooms: 1,
      meal: 'Breakfast',
      budget: '2500',
    };
    const result = buildRequest('hotel', hotel, now);
    expect(result.kind).toBe('HOTEL');
    expect(result.rooms).toBe(1);
    expect(result.notes).toContain('2500');
    expect(result.notes).toContain('4, 8');
    expect(result).not.toHaveProperty('pickupLocation');
    expect(() =>
      buildRequest('hotel', { ...hotel, endDate: hotel.date }, now),
    ).toThrow('Check-out');
    expect(() =>
      buildRequest('hotel', { ...hotel, childAges: '4' }, now),
    ).toThrow('one age');
    expect(() =>
      buildRequest('hotel', { ...hotel, passengers: 2 }, now),
    ).toThrow('adult');
  });
  it('rejects past trips, empty addresses, invalid counts and oversized notes', () => {
    expect(() =>
      buildRequest('trip', { ...trip, date: '2029-01-01' }, now),
    ).toThrow('future');
    expect(() =>
      buildRequest('trip', { ...trip, pickupLocation: '  ' }, now),
    ).toThrow('pickup');
    expect(() => buildRequest('trip', { ...trip, passengers: 0 }, now)).toThrow(
      '1–100',
    );
    expect(() => buildRequest('trip', { ...trip, luggage: -1 }, now)).toThrow(
      'count',
    );
    expect(() =>
      buildRequest('trip', { ...trip, notes: 'x'.repeat(3000) }, now),
    ).toThrow('shorten');
  });
  it('keeps inquiries separate and uses Cairo dates across midnight', () => {
    expect(
      buildRequest('inquiry', {
        ...defaults,
        contactName: 'Amina Ali',
        contactEmail: 'amina@example.com',
        contactPhone: '+201000000000',
        notes: 'Please call me',
      }, now),
    ).toEqual({
      kind: 'INQUIRY',
      notes: expect.stringContaining('Email / البريد الإلكتروني: amina@example.com'),
    });
    expect(() => buildRequest('inquiry', { ...defaults, notes: 'Hello' }, now)).toThrow('name');
    expect(() => buildRequest('inquiry', { ...defaults, contactName: 'Amina', contactEmail: 'bad', contactPhone: '+201000000000', notes: 'Hello' }, now)).toThrow('valid email');
    expect(egyptToday(new Date('2030-01-01T23:00:00Z'))).toBe('2030-01-02');
  });
});
