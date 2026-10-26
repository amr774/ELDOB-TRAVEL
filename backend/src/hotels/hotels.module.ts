import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateHotelDto, UpdateHotelDto } from './hotel.dto';

@Injectable()
export class HotelsService {
  constructor(private readonly prisma: PrismaService) {}
  list(owner = false) {
    return this.prisma.hotel.findMany({
      where: owner ? {} : { available: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  async find(id: string) {
    const hotel = await this.prisma.hotel.findFirst({
      where: { id, available: true },
    });
    if (!hotel)
      throw new NotFoundException('Hotel unavailable / الفندق غير متاح');
    return hotel;
  }
  create(dto: CreateHotelDto) {
    return this.prisma.hotel.create({ data: dto });
  }
  async update(id: string, dto: UpdateHotelDto) {
    if (!(await this.prisma.hotel.findUnique({ where: { id } })))
      throw new NotFoundException('Hotel not found');
    return this.prisma.hotel.update({ where: { id }, data: dto });
  }
}
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotels: HotelsService) {}
  @Get() list() {
    return this.hotels.list();
  }
  @Get('manage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  manage() {
    return this.hotels.list(true);
  }
  @Get(':id') find(@Param('id') id: string) {
    return this.hotels.find(id);
  }
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  create(@Body() dto: CreateHotelDto) {
    return this.hotels.create(dto);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  update(@Param('id') id: string, @Body() dto: UpdateHotelDto) {
    return this.hotels.update(id, dto);
  }
}
@Module({ controllers: [HotelsController], providers: [HotelsService] })
export class HotelsModule {}
