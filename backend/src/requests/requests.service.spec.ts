import { Test } from '@nestjs/testing';
import { BookingStatus, RequestKind } from '@prisma/client';
import { RequestsService } from './requests.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Service request rules', () => {
  let service: RequestsService;
  const db = {
    hotel: { findFirst: jest.fn() },
    serviceRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [RequestsService, { provide: PrismaService, useValue: db }],
    }).compile();
    service = module.get(RequestsService);
  });
  it('requires hotel dates, city, guest and room counts', async () => {
    await expect(
      service.create({ kind: RequestKind.HOTEL }, 'customer'),
    ).rejects.toThrow('City, check-in');
  });
  it('requires a trip route and passenger count', async () => {
    await expect(
      service.create(
        { kind: RequestKind.TRIP, pickupLocation: 'Cairo' },
        'customer',
      ),
    ).rejects.toThrow('Pickup, destination');
  });
  it('creates a trip request without inventing daily pricing', async () => {
    const dto = {
      kind: RequestKind.TRIP,
      pickupLocation: 'Cairo',
      destination: 'Alexandria',
      passengers: 2,
      startDate: '2099-02-02T10:00:00Z',
    };
    await service.create(dto, 'customer');
    expect(db.serviceRequest.create).toHaveBeenCalledWith({
      data: {
        ...dto,
        userId: 'customer',
        startDate: new Date(dto.startDate),
        endDate: undefined,
      },
    });
  });
  it('rejects reverse hotel dates', async () => {
    await expect(
      service.create(
        {
          kind: RequestKind.HOTEL,
          city: 'Luxor',
          passengers: 2,
          rooms: 1,
          startDate: '2099-02-03',
          endDate: '2099-02-02',
        },
        'customer',
      ),
    ).rejects.toThrow('End date');
  });
  it('requires a quote before confirming transport', async () => {
    db.serviceRequest.findUnique.mockResolvedValue({
      kind: 'TRIP',
      status: 'PENDING',
      quotedPrice: null,
    });
    await expect(
      service.update('request', { status: BookingStatus.CONFIRMED }),
    ).rejects.toThrow('quotation');
  });
  it('rejects hidden or missing hotels before creating a request', async () => {
    db.hotel.findFirst.mockResolvedValue(null);
    await expect(
      service.create(
        { kind: RequestKind.HOTEL, hotelId: 'hidden' },
        'customer',
      ),
    ).rejects.toThrow('Hotel unavailable');
    expect(db.serviceRequest.create).not.toHaveBeenCalled();
  });
  it('uses the selected hotel name and city from the catalog', async () => {
    db.hotel.findFirst.mockResolvedValue({
      id: 'hotel',
      name: 'Owner hotel',
      city: 'Giza',
    });
    await service.create(
      {
        kind: RequestKind.HOTEL,
        hotelId: 'hotel',
        city: 'Forged city',
        preference: 'Forged name',
        passengers: 2,
        rooms: 1,
        startDate: '2099-02-02',
        endDate: '2099-02-04',
      },
      'customer',
    );
    expect(
      (db.serviceRequest.create.mock.calls as unknown[][])[0][0],
    ).toMatchObject({
      data: {
        hotelId: 'hotel',
        city: 'Giza',
        preference: 'Owner hotel',
        userId: 'customer',
      },
    });
  });
  it('does not attach hotels to unrelated services', async () => {
    await expect(
      service.create(
        { kind: RequestKind.INQUIRY, hotelId: 'hotel', notes: 'hello' },
        'customer',
      ),
    ).rejects.toThrow('Hotel selection');
    expect(db.serviceRequest.create).not.toHaveBeenCalled();
  });
  it('rejects completing pending requests', async () => {
    db.serviceRequest.findUnique.mockResolvedValue({ status: 'PENDING' });
    await expect(
      service.update('request', { status: BookingStatus.COMPLETED }),
    ).rejects.toThrow('Invalid status');
  });
  it('rejects another customer’s cancellation', async () => {
    db.serviceRequest.findUnique.mockResolvedValue({ userId: 'another' });
    await expect(service.cancel('request', 'customer')).rejects.toThrow();
    expect(db.serviceRequest.update).not.toHaveBeenCalled();
  });
});
