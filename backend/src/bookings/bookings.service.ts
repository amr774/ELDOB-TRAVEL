import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RequestWithUser } from '../auth/request-with-user.type';

const DAY_MS = 1000 * 60 * 60 * 24;

type AuthedUser = RequestWithUser['user'];

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBookingDto, user: AuthedUser) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Rental dates are calendar dates interpreted consistently in the Egypt business timezone.
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const tomorrow = new Date(`${today}T00:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (startDate.getTime() < tomorrow.getTime()) {
      throw new BadRequestException('Start date must be at least tomorrow');
    }
    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.prisma.$transaction(async (tx) => {
      // Every rental for this car takes the same row lock before checking overlap.
      await tx.$queryRaw`SELECT id FROM "Car" WHERE id = ${dto.carId} FOR UPDATE`;
      const car = await tx.car.findUnique({ where: { id: dto.carId } });
      if (!car) {
        throw new NotFoundException('Car not found');
      }
      if (!car.available) {
        throw new BadRequestException('Car is not available for booking');
      }

      const overlapping = await tx.booking.findFirst({
        where: {
          carId: dto.carId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
      });
      if (overlapping) {
        throw new BadRequestException('Car is already booked in this period');
      }

      const days = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / DAY_MS,
      );
      const totalPrice = days * car.pricePerDay;

      return tx.booking.create({
        data: {
          userId: user.id,
          carId: dto.carId,
          startDate,
          endDate,
          totalPrice,
          pickupLocation: dto.pickupLocation,
          notes: dto.notes,
        },
        include: { car: true },
      });
    });
  }

  findMine(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { car: true },
    });
  }

  findAll() {
    return this.prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        car: true,
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async findOne(id: string, user: AuthedUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { car: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (user.role !== Role.OWNER && booking.userId !== user.id) {
      throw new ForbiddenException('You can only view your own bookings');
    }
    return booking;
  }

  async cancel(id: string, user: AuthedUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (user.role !== Role.OWNER && booking.userId !== user.id) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }
    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException('This booking cannot be cancelled');
    }
    return this.prisma.booking.update({
      where: { id, status: booking.status },
      data: { status: BookingStatus.CANCELLED },
    });
  }

  async confirm(id: string) {
    await this.ensureStatus(
      id,
      BookingStatus.PENDING,
      'Only pending bookings can be confirmed',
    );
    return this.prisma.booking.update({
      where: { id, status: BookingStatus.PENDING },
      data: { status: BookingStatus.CONFIRMED },
    });
  }

  async complete(id: string) {
    await this.ensureStatus(
      id,
      BookingStatus.CONFIRMED,
      'Only confirmed bookings can be completed',
    );
    return this.prisma.booking.update({
      where: { id, status: BookingStatus.CONFIRMED },
      data: { status: BookingStatus.COMPLETED },
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id} FOR UPDATE`;
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (await tx.payment.count({ where: { bookingId: id } }))
        throw new ConflictException(
          'Reservations with recorded payments cannot be deleted',
        );
      await tx.booking.delete({ where: { id } });
      return { message: 'Booking deleted successfully' };
    });
  }

  async pay(id: string, user: AuthedUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (user.role !== Role.OWNER && booking.userId !== user.id) {
      throw new ForbiddenException('You can only pay for your own bookings');
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be paid');
    }
    if (booking.paidAt) {
      const paid = await this.prisma.booking.findUnique({
        where: { id },
        include: { car: true },
      });
      return { message: 'Booking already paid', booking: paid };
    }
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { paidAt: new Date() },
      include: { car: true },
    });
    return {
      message: 'Payment successful (simulated)',
      booking: updated,
    };
  }

  private async ensureStatus(
    id: string,
    expected: BookingStatus,
    message: string,
  ) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status !== expected) {
      throw new BadRequestException(message);
    }
  }
}
