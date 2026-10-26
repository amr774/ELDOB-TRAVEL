import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
describe('Rental business rules', () => {
  let service: BookingsService;
  const tx = {
    $queryRaw: jest.fn(),
    car: { findUnique: jest.fn() },
    booking: { findFirst: jest.fn(), create: jest.fn() },
  };
  const db = {
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    booking: { findUnique: jest.fn(), update: jest.fn() },
  };
  const user = {
    id: 'customer',
    fullName: 'Customer',
    email: 'c@example.com',
    role: Role.CUSTOMER,
  };
  beforeEach(async () => {
    jest.clearAllMocks();
    tx.car.findUnique.mockResolvedValue({ available: true, pricePerDay: 1200 });
    tx.booking.findFirst.mockResolvedValue(null);
    const module = await Test.createTestingModule({
      providers: [BookingsService, { provide: PrismaService, useValue: db }],
    }).compile();
    service = module.get(BookingsService);
  });
  it('locks the vehicle and rounds partial days upward', async () => {
    await service.create(
      {
        carId: 'car',
        startDate: '2099-01-01T00:00:00Z',
        endDate: '2099-01-02T01:00:00Z',
      },
      user,
    );
    expect(tx.$queryRaw).toHaveBeenCalled();
    const call: unknown = (tx.booking.create.mock.calls as unknown[][])[0][0];
    expect(call).toHaveProperty('data.totalPrice', 2400);
    expect(call).toHaveProperty('data.userId', 'customer');
  });
  it('rejects overlapping rentals', async () => {
    tx.booking.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(
      service.create(
        { carId: 'car', startDate: '2099-01-01', endDate: '2099-01-03' },
        user,
      ),
    ).rejects.toThrow('already booked');
    expect(tx.booking.create).not.toHaveBeenCalled();
  });
  it('rejects unavailable cars', async () => {
    tx.car.findUnique.mockResolvedValue({ available: false });
    await expect(
      service.create(
        { carId: 'car', startDate: '2099-01-01', endDate: '2099-01-03' },
        user,
      ),
    ).rejects.toThrow('not available');
  });
  it('rejects past dates', async () => {
    await expect(
      service.create(
        { carId: 'car', startDate: '2000-01-01', endDate: '2000-01-03' },
        user,
      ),
    ).rejects.toThrow('tomorrow');
  });
  it('rejects reverse dates', async () => {
    await expect(
      service.create(
        { carId: 'car', startDate: '2099-01-03', endDate: '2099-01-02' },
        user,
      ),
    ).rejects.toThrow('after');
  });
  it('prevents viewing another customer’s booking', async () => {
    db.booking.findUnique.mockResolvedValue({ userId: 'other' });
    await expect(service.findOne('booking', user)).rejects.toThrow(
      'own bookings',
    );
  });
  it('prevents confirming completed bookings', async () => {
    db.booking.findUnique.mockResolvedValue({ status: 'COMPLETED' });
    await expect(service.confirm('booking')).rejects.toThrow('Only pending');
  });
  it('prevents cancellation of terminal bookings', async () => {
    db.booking.findUnique.mockResolvedValue({
      userId: user.id,
      status: 'COMPLETED',
    });
    await expect(service.cancel('booking', user)).rejects.toThrow(
      'cannot be cancelled',
    );
  });
});
