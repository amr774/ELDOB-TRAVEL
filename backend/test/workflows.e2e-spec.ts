import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/prisma/prisma-exception.filter';

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; role: string; password?: string };
}
interface Created {
  id: string;
  status: string;
}

describe('Live PostgreSQL workflows (isolated test records)', () => {
  let app: INestApplication<App>;
  let db: PrismaService;
  const tag = `qa-${randomUUID()}`;
  const password = randomUUID();
  const emails = [0, 1, 2, 3].map((i) => `${tag}-${i}@example.invalid`);
  const ids: string[] = [];
  const tokens: string[] = [];
  let carId: string;
  let bookingId: string;
  let tripId: string;
  let hotelId: string;
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL || '');
    if (
      process.env.NODE_ENV === 'production' ||
      !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    ) {
      throw new Error(
        'Workflow tests require a local, non-production database',
      );
    }
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new PrismaExceptionFilter());
    await app.init();
    db = app.get(PrismaService);
    for (const [i, email] of emails.entries()) {
      const registered = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password,
          fullName: `${tag}-${i}`,
          role: 'OWNER',
          operationsEnabled: true,
        })
        .expect(201);
      const body = registered.body as {
        user: {
          id: string;
          role: string;
          operationsEnabled: boolean;
          password?: string;
        };
      };
      expect(body.user.role).toBe('CUSTOMER');
      expect(body.user.operationsEnabled).toBe(false);
      expect(body.user.password).toBeUndefined();
      ids.push(body.user.id);
    }
    await db.user.update({ where: { id: ids[1] }, data: { role: 'OWNER' } });
    await db.user.update({
      where: { id: ids[2] },
      data: { role: 'EMPLOYEE', operationsEnabled: true },
    });
    await db.user.update({
      where: { id: ids[3] },
      data: { role: 'EMPLOYEE', operationsEnabled: false },
    });
    for (const email of emails) {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);
      tokens.push((login.body as LoginResult).accessToken);
    }
    const car = await request(app.getHttpServer())
      .post('/cars')
      .set('Authorization', `Bearer ${tokens[1]}`)
      .send({
        name: tag,
        brand: 'QA',
        model: 'Isolated test',
        year: 2026,
        pricePerDay: 1500,
        category: 'Sedan',
        capacity: 4,
      })
      .expect(201);
    carId = (car.body as Created).id;
  }, 60000);
  afterAll(async () => {
    if (db) {
      // Only records created by this run are removed. Never clear business tables.
      await db.payment.deleteMany({ where: { recordedBy: { in: ids } } });
      await db.serviceRequest.deleteMany({ where: { userId: { in: ids } } });
      await db.booking.deleteMany({ where: { userId: { in: ids } } });
      await db.user.deleteMany({
        where: { id: { in: ids }, email: { in: emails } },
      });
      if (carId) await db.car.deleteMany({ where: { id: carId, name: tag } });
      if (hotelId)
        await db.hotel.deleteMany({ where: { id: hotelId, name: tag } });
      await db.$disconnect();
    }
    if (app) await app.close();
  });
  it('denies public, customer and employee access to owner data', async () => {
    for (const path of [
      '/dashboard',
      '/payments',
      '/users',
      '/bookings',
      '/hotels/manage',
    ]) {
      await request(app.getHttpServer()).get(path).expect(401);
      for (const index of [0, 2, 3])
        await request(app.getHttpServer())
          .get(path)
          .set('Authorization', `Bearer ${tokens[index]}`)
          .expect(403);
    }
    await request(app.getHttpServer())
      .get('/operations/bookings')
      .set('Authorization', `Bearer ${tokens[3]}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/operations/bookings')
      .set('Authorization', `Bearer ${tokens[0]}`)
      .expect(403);
    await request(app.getHttpServer())
      .post('/cars')
      .set('Authorization', `Bearer ${tokens[2]}`)
      .send({})
      .expect(403);
  });
  it('stores owner image links and returns them publicly without an upload', async () => {
    const image = 'https://images.example.invalid/main.jpg?size=large';
    const images = ['https://images.example.invalid/gallery.webp'];
    await request(app.getHttpServer())
      .patch(`/cars/${carId}`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .send({ image, images })
      .expect(200);
    const result = await request(app.getHttpServer())
      .get(`/cars/${carId}`)
      .expect(200);
    expect(result.body as Record<string, unknown>).toMatchObject({
      image,
      images,
    });
  });
  it('supports owner-managed hotels, customer requests and employee follow-up', async () => {
    for (const index of [0, 2, 3]) {
      await request(app.getHttpServer())
        .post('/hotels')
        .set('Authorization', `Bearer ${tokens[index]}`)
        .send({ name: tag, city: 'Giza' })
        .expect(403);
    }
    const created = await request(app.getHttpServer())
      .post('/hotels')
      .set('Authorization', `Bearer ${tokens[1]}`)
      .send({
        name: tag,
        city: 'Giza',
        image: 'https://images.example.invalid/hotel.jpg',
        pricePerNight: 2000,
      })
      .expect(201);
    hotelId = (created.body as Created).id;
    await request(app.getHttpServer()).get(`/hotels/${hotelId}`).expect(200);
    await request(app.getHttpServer())
      .patch(`/hotels/${hotelId}`)
      .set('Authorization', `Bearer ${tokens[2]}`)
      .send({ available: false })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/hotels/${hotelId}`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .send({ name: null })
      .expect(400);
    const payload = {
      kind: 'HOTEL',
      hotelId,
      city: 'Forged',
      preference: 'Forged',
      startDate: '2099-02-01',
      endDate: '2099-02-04',
      passengers: 2,
      rooms: 1,
    };
    const result = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send(payload)
      .expect(201);
    expect(result.body as Record<string, unknown>).toMatchObject({
      hotelId,
      city: 'Giza',
      preference: tag,
      status: 'PENDING',
    });
    const requestId = (result.body as Created).id;
    const mine = await request(app.getHttpServer())
      .get('/requests/me')
      .set('Authorization', `Bearer ${tokens[0]}`)
      .expect(200);
    expect((mine.body as Created[]).some((r) => r.id === requestId)).toBe(true);
    await request(app.getHttpServer())
      .patch(`/operations/requests/${requestId}`)
      .set('Authorization', `Bearer ${tokens[2]}`)
      .send({ reply: 'Availability being checked' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/hotels/${hotelId}`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .send({ available: false, pricePerNight: null })
      .expect(200);
    await request(app.getHttpServer()).get(`/hotels/${hotelId}`).expect(404);
    const publicList = await request(app.getHttpServer())
      .get('/hotels')
      .expect(200);
    expect((publicList.body as Created[]).some((h) => h.id === hotelId)).toBe(
      false,
    );
    await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send(payload)
      .expect(400);
    expect(
      await db.serviceRequest.findUnique({ where: { id: requestId } }),
    ).toMatchObject({ hotelId, preference: tag });
  });
  it('allows exactly one of two simultaneous overlapping bookings', async () => {
    const responses = await Promise.all(
      [0, 1].map(() =>
        request(app.getHttpServer())
          .post('/bookings')
          .set('Authorization', `Bearer ${tokens[0]}`)
          .send({
            carId,
            startDate: '2098-03-01',
            endDate: '2098-03-03',
            pickupLocation: 'Cairo',
          }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([201, 400]);
    bookingId = (responses.find((r) => r.status === 201)!.body as Created).id;
  });
  it('keeps customer ownership, review eligibility and state transitions authoritative', async () => {
    await request(app.getHttpServer())
      .get(`/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${tokens[3]}`)
      .expect(403);
    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({ carId, rating: 5 })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/operations/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${tokens[2]}`)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/bookings/${bookingId}/pay`)
      .set('Authorization', `Bearer ${tokens[0]}`)
      .expect(403);
    const operational = await request(app.getHttpServer())
      .get('/operations/bookings')
      .set('Authorization', `Bearer ${tokens[2]}`)
      .expect(200);
    const own = (operational.body as Array<Record<string, unknown>>).find(
      (b) => b.id === bookingId,
    );
    expect(own).not.toHaveProperty('paidAt');
    expect(own).not.toHaveProperty('totalPrice');
  });
  it('records real receipts, prevents overpayment and protects history', async () => {
    const initial = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Authorization', `Bearer ${tokens[1]}`)
      .expect(200);
    const before = (initial.body as { revenue: number }).revenue;
    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${tokens[1]}`)
      .send({ bookingId, amount: 1000, reference: tag })
      .expect(201);
    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${tokens[1]}`)
      .send({ bookingId, amount: 2500, reference: `${tag}-over` })
      .expect(400);
    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${tokens[1]}`)
      .send({ bookingId, amount: 1000, reference: tag })
      .expect(409);
    const after = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Authorization', `Bearer ${tokens[1]}`)
      .expect(200);
    expect((after.body as { revenue: number }).revenue).toBe(before + 1000);
    await request(app.getHttpServer())
      .delete(`/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .expect(409);
  });
  it('saves trips/hotels and requires quotation before confirmation', async () => {
    const trip = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({
        kind: 'TRIP',
        pickupLocation: 'Cairo',
        destination: 'Alexandria',
        startDate: '2098-05-01T10:00:00Z',
        passengers: 2,
      })
      .expect(201);
    tripId = (trip.body as Created).id;
    await request(app.getHttpServer())
      .patch(`/operations/requests/${tripId}`)
      .set('Authorization', `Bearer ${tokens[2]}`)
      .send({ status: 'CONFIRMED' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/operations/requests/${tripId}`)
      .set('Authorization', `Bearer ${tokens[2]}`)
      .send({
        status: 'CONFIRMED',
        quotedPrice: 2500,
        reply: 'Your arrangements are confirmed.',
      })
      .expect(200);
    await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({
        kind: 'HOTEL',
        city: 'Luxor',
        startDate: '2098-05-01',
        endDate: '2098-05-03',
        passengers: 2,
        rooms: 1,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({ kind: 'INQUIRY', notes: 'Business transfer inquiry' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/requests/${tripId}/cancel`)
      .set('Authorization', `Bearer ${tokens[3]}`)
      .expect(403);
  });
  it('rotates HttpOnly browser sessions and rejects cross-origin requests', async () => {
    await request(app.getHttpServer())
      .post('/auth/browser/login')
      .set('Origin', 'https://untrusted.invalid')
      .set('X-ELDOB-Client', 'web')
      .send({ email: emails[0], password })
      .expect(403);
    const login = await request(app.getHttpServer())
      .post('/auth/browser/login')
      .set('X-ELDOB-Client', 'web')
      .send({ email: emails[0], password })
      .expect(200);
    expect(login.body as LoginResult).not.toHaveProperty('refreshToken');
    const cookies = login.headers['set-cookie'] as unknown as string[];
    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0]).toContain('SameSite=Strict');
    const cookie = cookies[0].split(';')[0];
    const rotated = await request(app.getHttpServer())
      .post('/auth/browser/refresh')
      .set('X-ELDOB-Client', 'web')
      .set('Cookie', cookie)
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/browser/refresh')
      .set('X-ELDOB-Client', 'web')
      .set('Cookie', cookie)
      .expect(401);
    const nextCookie = (
      rotated.headers['set-cookie'] as unknown as string[]
    )[0].split(';')[0];
    await request(app.getHttpServer())
      .post('/auth/browser/logout')
      .set('X-ELDOB-Client', 'web')
      .set('Cookie', nextCookie)
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/browser/refresh')
      .set('X-ELDOB-Client', 'web')
      .set('Cookie', nextCookie)
      .expect(401);
  });
  it('rejects disguised image uploads', async () => {
    await request(app.getHttpServer())
      .post('/upload')
      .set('Authorization', `Bearer ${tokens[1]}`)
      .attach('file', Buffer.from('<svg onload="alert(1)"></svg>'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(400);
  });
});
