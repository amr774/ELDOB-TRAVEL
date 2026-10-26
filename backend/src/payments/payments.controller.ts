import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RequestWithUser } from '../auth/request-with-user.type';
class RecordPaymentDto {
  @IsOptional() @IsString() bookingId?: string;
  @IsOptional() @IsString() requestId?: string;
  @IsInt() @Min(1) @Max(100000000) amount: number;
  @IsString() @IsNotEmpty() @MaxLength(200) reference: string;
}
@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class PaymentsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list() {
    return this.prisma.payment.findMany({ orderBy: { createdAt: 'desc' } });
  }
  @Post() record(@Body() dto: RecordPaymentDto, @Req() req: RequestWithUser) {
    if (!!dto.bookingId === !!dto.requestId)
      throw new BadRequestException('Choose exactly one booking or request');
    return this.prisma.$transaction(async (tx) => {
      if (dto.bookingId)
        await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${dto.bookingId} FOR UPDATE`;
      else
        await tx.$queryRaw`SELECT id FROM "ServiceRequest" WHERE id = ${dto.requestId} FOR UPDATE`;
      const target = dto.bookingId
        ? await tx.booking.findUnique({ where: { id: dto.bookingId } })
        : await tx.serviceRequest.findUnique({ where: { id: dto.requestId } });
      if (!target || !['CONFIRMED', 'COMPLETED'].includes(target.status))
        throw new BadRequestException(
          'Only confirmed or completed reservations can receive payments',
        );
      const total =
        'totalPrice' in target ? target.totalPrice : target.quotedPrice;
      const sum = await tx.payment.aggregate({
        where: dto.bookingId
          ? { bookingId: dto.bookingId }
          : { requestId: dto.requestId },
        _sum: { amount: true },
      });
      if (total === null || (sum._sum.amount || 0) + dto.amount > total)
        throw new BadRequestException('Payment exceeds the outstanding amount');
      return tx.payment.create({ data: { ...dto, recordedBy: req.user.id } });
    });
  }
}
