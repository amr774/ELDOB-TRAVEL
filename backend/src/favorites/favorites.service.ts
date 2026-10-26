import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async add(userId: string, carId: string) {
    const car = await this.prisma.car.findUnique({ where: { id: carId } });
    if (!car) {
      throw new NotFoundException('Car not found');
    }
    await this.prisma.favorite.upsert({
      where: { userId_carId: { userId, carId } },
      create: { userId, carId },
      update: {},
    });
    return { message: 'Car added to favorites' };
  }

  async remove(userId: string, carId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, carId } });
    return { message: 'Car removed from favorites' };
  }

  findMine(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { car: true },
    });
  }
}
