import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, RequestKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto, UpdateRequestDto } from './request.dto';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(dto: CreateRequestDto, userId: string) {
    if (dto.hotelId) {
      if (dto.kind !== RequestKind.HOTEL)
        throw new BadRequestException(
          'Hotel selection requires a hotel request',
        );
      const hotel = await this.prisma.hotel.findFirst({
        where: { id: dto.hotelId, available: true },
      });
      if (!hotel)
        throw new BadRequestException('Hotel unavailable / الفندق غير متاح');
      dto = { ...dto, city: hotel.city, preference: hotel.name };
    }
    if (
      dto.kind === RequestKind.TRIP &&
      (!dto.pickupLocation?.trim() ||
        !dto.destination?.trim() ||
        !dto.startDate ||
        !dto.passengers)
    )
      throw new BadRequestException(
        'Pickup, destination, travel time and passenger count are required',
      );
    if (
      dto.kind === RequestKind.HOTEL &&
      (!dto.city?.trim() ||
        !dto.startDate ||
        !dto.endDate ||
        !dto.passengers ||
        !dto.rooms)
    )
      throw new BadRequestException(
        'City, check-in, check-out, guests and rooms are required',
      );
    if (dto.kind === RequestKind.INQUIRY && !dto.notes?.trim())
      throw new BadRequestException('Please enter your inquiry');
    if (dto.startDate && new Date(dto.startDate) <= new Date())
      throw new BadRequestException('Please choose a future date');
    if (
      dto.endDate &&
      (!dto.startDate || new Date(dto.endDate) <= new Date(dto.startDate))
    )
      throw new BadRequestException('End date must follow start date');
    return this.prisma.serviceRequest.create({
      data: {
        ...dto,
        userId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }
  mine(userId: string) {
    return this.prisma.serviceRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
  all() {
    return this.prisma.serviceRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });
  }
  async cancel(id: string, userId: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.userId !== userId) throw new ForbiddenException();
    return this.update(id, { status: BookingStatus.CANCELLED });
  }
  async update(id: string, dto: UpdateRequestDto) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (
      dto.quotedPrice !== undefined &&
      request.status !== BookingStatus.PENDING &&
      dto.quotedPrice !== request.quotedPrice
    )
      throw new BadRequestException('A confirmed quotation cannot be changed');
    if (
      [BookingStatus.CANCELLED, BookingStatus.COMPLETED].includes(
        request.status as 'CANCELLED' | 'COMPLETED',
      )
    )
      throw new BadRequestException('This request is closed');
    if (dto.status && dto.status !== request.status) {
      const valid =
        dto.status === BookingStatus.CANCELLED ||
        (request.status === BookingStatus.PENDING &&
          dto.status === BookingStatus.CONFIRMED) ||
        (request.status === BookingStatus.CONFIRMED &&
          dto.status === BookingStatus.COMPLETED);
      if (!valid) throw new BadRequestException('Invalid status transition');
      if (
        dto.status === BookingStatus.CONFIRMED &&
        request.kind !== RequestKind.INQUIRY &&
        (dto.quotedPrice ?? request.quotedPrice) === null
      )
        throw new BadRequestException('Set a quotation before confirming');
    }
    return this.prisma.serviceRequest.update({
      where: { id, status: request.status },
      data: dto,
    });
  }
}
