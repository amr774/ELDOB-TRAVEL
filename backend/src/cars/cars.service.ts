import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { QueryCarsDto } from './dto/query-cars.dto';

@Injectable()
export class CarsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateCarDto) {
    return this.prisma.car.create({ data: dto });
  }

  async findAll(dto: QueryCarsDto) {
    const where: Prisma.CarWhereInput = {};
    if (dto.search)
      where.OR = ['name', 'brand', 'model'].map((field) => ({
        [field]: { contains: dto.search, mode: 'insensitive' },
      }));
    if (dto.category) where.category = dto.category;

    if (dto.brand) {
      where.brand = { contains: dto.brand, mode: 'insensitive' };
    }
    if (dto.model) {
      where.model = { contains: dto.model, mode: 'insensitive' };
    }
    if (dto.year) {
      where.year = dto.year;
    }
    if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
      if (
        dto.minPrice !== undefined &&
        dto.maxPrice !== undefined &&
        dto.maxPrice < dto.minPrice
      ) {
        throw new BadRequestException(
          'maxPrice must be greater than or equal to minPrice',
        );
      }
      where.pricePerDay = {};
      if (dto.minPrice !== undefined) {
        where.pricePerDay.gte = dto.minPrice;
      }
      if (dto.maxPrice !== undefined) {
        where.pricePerDay.lte = dto.maxPrice;
      }
    }
    if (dto.available !== undefined) {
      where.available = dto.available === 'true';
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;

    const [data, total] = await Promise.all([
      this.prisma.car.findMany({
        where,
        orderBy:
          dto.sort === 'priceAsc'
            ? { pricePerDay: 'asc' }
            : dto.sort === 'priceDesc'
              ? { pricePerDay: 'desc' }
              : { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.car.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const car = await this.prisma.car.findUnique({ where: { id } });
    if (!car) {
      throw new NotFoundException('Car not found');
    }
    const agg = await this.prisma.review.aggregate({
      where: { carId: id },
      _avg: { rating: true },
      _count: true,
    });
    const average = agg._avg.rating;
    return {
      ...car,
      averageRating: average === null ? null : Number(average),
      reviewCount: agg._count,
    };
  }

  async update(id: string, dto: UpdateCarDto) {
    const car = await this.prisma.car.findUnique({ where: { id } });
    if (!car) {
      throw new NotFoundException('Car not found');
    }
    return this.prisma.car.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const car = await this.prisma.car.findUnique({ where: { id } });
    if (!car) {
      throw new NotFoundException('Car not found');
    }
    await this.prisma.car.delete({ where: { id } });
    return { message: 'Car deleted successfully' };
  }
}
