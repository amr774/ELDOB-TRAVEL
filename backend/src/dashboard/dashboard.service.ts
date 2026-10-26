import { Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      users,
      cars,
      availableCars,
      bookings,
      revenueAgg,
      pending,
      confirmed,
      cancelled,
      completed,
      recentBookings,
      serviceGroups,
      employees,
      verifiedEmployees,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.car.count(),
      this.prisma.car.count({ where: { available: true } }),
      this.prisma.booking.count(),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
      }),
      this.prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
      this.prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
      this.prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
      this.prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
      this.prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          car: true,
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.serviceRequest.groupBy({
        by: ['kind', 'status'],
        _count: { _all: true },
      }),
      this.prisma.user.count({ where: { role: 'EMPLOYEE' } }),
      this.prisma.user.count({
        where: { role: 'EMPLOYEE', operationsEnabled: true },
      }),
    ]);

    const serviceCounts = { TRIP: 0, HOTEL: 0, INQUIRY: 0 };
    const reservationStatusCounts = {
      PENDING: pending,
      CONFIRMED: confirmed,
      CANCELLED: cancelled,
      COMPLETED: completed,
    };
    for (const group of serviceGroups) {
      serviceCounts[group.kind] += group._count._all;
      if (group.kind !== 'INQUIRY')
        reservationStatusCounts[group.status] += group._count._all;
    }
    // Group actual receipt dates in the business timezone, not reservation dates.
    const currentMonth = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(new Date());
    const year = Number(
      currentMonth.find((part) => part.type === 'year')!.value,
    );
    const month = Number(
      currentMonth.find((part) => part.type === 'month')!.value,
    );
    const firstMonth = new Date(Date.UTC(year, month - 6, 1));
    const from = new Date(firstMonth.getTime() - 86400000);
    const receiptMonths = await this.prisma.$queryRaw<
      { month: string; revenue: bigint; payments: bigint }[]
    >`
      SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Cairo', 'YYYY-MM') AS month,
             SUM(amount)::bigint AS revenue, COUNT(*)::bigint AS payments
      FROM "Payment" WHERE "createdAt" >= ${from}
      GROUP BY 1 ORDER BY 1`;
    const revenueTrend = Array.from({ length: 6 }, (_, index) => {
      const key = new Date(Date.UTC(year, month - 6 + index, 1))
        .toISOString()
        .slice(0, 7);
      const recorded = receiptMonths.find((row) => row.month === key);
      return {
        month: key,
        revenue: Number(recorded?.revenue ?? 0),
        payments: Number(recorded?.payments ?? 0),
      };
    });

    return {
      users,
      cars,
      availableCars,
      bookedCars: cars - availableCars,
      bookings,
      revenue: revenueAgg._sum.amount ?? 0,
      statusCounts: { pending, confirmed, cancelled, completed },
      recentBookings,
      business: {
        reservations: bookings + serviceCounts.TRIP + serviceCounts.HOTEL,
        trips: serviceCounts.TRIP,
        hotels: serviceCounts.HOTEL,
        inquiries: serviceCounts.INQUIRY,
        employees,
        verifiedEmployees,
        reservationStatusCounts,
      },
      revenueTrend,
    };
  }
}
