import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Company-wide owner reporting', () => {
  afterEach(() => jest.useRealTimers());
  it('combines reservations across services without counting inquiries as bookings', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T12:00:00Z'));
    const db = {
      user: {
        count: jest
          .fn()
          .mockResolvedValueOnce(4)
          .mockResolvedValueOnce(3)
          .mockResolvedValueOnce(2),
      },
      car: {
        count: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(2),
      },
      booking: {
        count: jest
          .fn()
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(2)
          .mockResolvedValueOnce(3)
          .mockResolvedValueOnce(4),
        findMany: jest.fn().mockResolvedValue([]),
      },
      payment: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 500 } }),
      },
      serviceRequest: {
        groupBy: jest.fn().mockResolvedValue([
          { kind: 'TRIP', status: 'PENDING', _count: { _all: 2 } },
          { kind: 'HOTEL', status: 'CONFIRMED', _count: { _all: 1 } },
          { kind: 'INQUIRY', status: 'PENDING', _count: { _all: 7 } },
        ]),
      },
      $queryRaw: jest
        .fn()
        .mockResolvedValue([
          { month: '2026-01', revenue: BigInt(500), payments: BigInt(2) },
        ]),
    };
    const module = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: db }],
    }).compile();
    const result = await module.get(DashboardService).getStats();
    expect(result.bookings).toBe(10); // Preserve the existing rentals-only field.
    expect(result.business.reservations).toBe(13);
    expect(result.business.reservationStatusCounts.PENDING).toBe(3);
    expect(result.business.reservationStatusCounts.CONFIRMED).toBe(3);
    expect(result.business.inquiries).toBe(7);
    expect(result.business.verifiedEmployees).toBe(2);
    expect(result.revenue).toBe(500);
    expect(result.revenueTrend).toHaveLength(6);
    expect(result.revenueTrend[0]).toEqual({
      month: '2025-08',
      revenue: 0,
      payments: 0,
    });
    expect(result.revenueTrend[5]).toEqual({
      month: '2026-01',
      revenue: 500,
      payments: 2,
    });
    expect(() => JSON.stringify(result)).not.toThrow();
    expect(db.payment.aggregate).toHaveBeenCalledWith({
      _sum: { amount: true },
    });
  });
});
