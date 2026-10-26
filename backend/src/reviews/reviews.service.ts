import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { RequestWithUser } from '../auth/request-with-user.type';

type AuthedUser = RequestWithUser['user'];

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReviewDto, user: AuthedUser) {
    const car = await this.prisma.car.findUnique({ where: { id: dto.carId } });
    if (!car) {
      throw new NotFoundException('Car not found');
    }
    const eligible = await this.prisma.booking.findFirst({
      where: { userId: user.id, carId: dto.carId, status: 'COMPLETED' },
    });
    if (!eligible)
      throw new BadRequestException(
        'Complete a rental before reviewing this vehicle',
      );
    const existing = await this.prisma.review.findUnique({
      where: { userId_carId: { userId: user.id, carId: dto.carId } },
    });
    if (existing) {
      throw new BadRequestException('You already reviewed this car');
    }
    return this.prisma.review.create({
      data: {
        userId: user.id,
        carId: dto.carId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: { user: { select: { id: true, fullName: true } } },
    });
  }

  findAll(carId?: string) {
    return this.prisma.review.findMany({
      where: carId ? { carId } : {},
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, fullName: true } } },
    });
  }

  async update(id: string, dto: UpdateReviewDto, user: AuthedUser) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (user.role !== Role.OWNER && review.userId !== user.id) {
      throw new ForbiddenException('You can only edit your own reviews');
    }
    return this.prisma.review.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: AuthedUser) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (user.role !== Role.OWNER && review.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own reviews');
    }
    await this.prisma.review.delete({ where: { id } });
    return { message: 'Review deleted successfully' };
  }
}
