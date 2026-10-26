import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { OperationsGuard } from './operations.guard';
import { RequestsService } from '../requests/requests.service';
import { UpdateRequestDto } from '../requests/request.dto';
import { BookingsService } from '../bookings/bookings.service';
import { CreateBookingDto } from '../bookings/dto/create-booking.dto';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';

class CustomerDto extends UpdateProfileDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() @MaxLength(100) declare fullName: string;
}
class StaffBookingDto extends CreateBookingDto {
  @IsString() @IsNotEmpty() userId: string;
}
class RentalDetailsDto {
  @IsString() @MaxLength(300) pickupLocation: string;
  @IsString() @MaxLength(2000) notes: string;
}
const customerSelect = { id: true, fullName: true, email: true, phone: true };
@ApiTags('operations')
@ApiBearerAuth()
@Controller('operations')
@UseGuards(JwtAuthGuard, OperationsGuard)
export class OperationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
    private readonly bookings: BookingsService,
  ) {}
  @Get('requests') requestsList() {
    return this.requests.all();
  }
  @Patch('requests/:id') updateRequest(
    @Param('id') id: string,
    @Body() dto: UpdateRequestDto,
  ) {
    return this.requests.update(id, dto);
  }
  @Get('bookings') bookingsList() {
    return this.prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        pickupLocation: true,
        notes: true,
        car: { select: { id: true, name: true } },
        user: { select: customerSelect },
      },
    });
  }
  @Post('bookings') async createBooking(@Body() dto: StaffBookingDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, role: Role.CUSTOMER },
    });
    if (!user) throw new BadRequestException('Select a customer account');
    const booking = await this.bookings.create(dto, user);
    return { id: booking.id, status: booking.status };
  }
  @Patch('bookings/:id/confirm') async confirm(@Param('id') id: string) {
    const booking = await this.bookings.confirm(id);
    return { id: booking.id, status: booking.status };
  }
  @Patch('bookings/:id/complete') async complete(@Param('id') id: string) {
    const booking = await this.bookings.complete(id);
    return { id: booking.id, status: booking.status };
  }
  @Patch('bookings/:id/cancel') cancel(@Param('id') id: string) {
    return this.prisma.booking.update({
      where: { id, status: { in: ['PENDING', 'CONFIRMED'] } },
      data: { status: 'CANCELLED' },
      select: { id: true, status: true },
    });
  }
  @Patch('bookings/:id') editRental(
    @Param('id') id: string,
    @Body() dto: RentalDetailsDto,
  ) {
    return this.prisma.booking.update({
      where: { id, status: { in: ['PENDING', 'CONFIRMED'] } },
      data: dto,
      select: { id: true, status: true, pickupLocation: true, notes: true },
    });
  }
  @Get('customers') customers() {
    return this.prisma.user.findMany({
      where: { role: Role.CUSTOMER },
      select: customerSelect,
      orderBy: { createdAt: 'desc' },
    });
  }
  @Post('customers') async createCustomer(@Body() dto: CustomerDto) {
    // Staff-created contacts get an unguessable password; no credential is emailed or exposed.
    return this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        role: Role.CUSTOMER,
        password: await bcrypt.hash(randomUUID(), 10),
      },
      select: customerSelect,
    });
  }
  @Patch('customers/:id') updateCustomer(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.prisma.user.update({
      where: { id, role: Role.CUSTOMER },
      data: dto,
      select: customerSelect,
    });
  }
}
