import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map(({ password, ...user }) => user);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, dto: UpdateUserDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE role = 'OWNER' ORDER BY id FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (
        user.role === 'OWNER' &&
        dto.role &&
        dto.role !== 'OWNER' &&
        (await tx.user.count({ where: { role: 'OWNER' } })) <= 1
      )
        throw new BadRequestException('The last owner cannot be demoted');
      const updated = await tx.user.update({ where: { id }, data: dto });
      const { password, ...userWithoutPassword } = updated;
      return userWithoutPassword;
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE role = 'OWNER' ORDER BY id FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (
        user.role === 'OWNER' &&
        (await tx.user.count({ where: { role: 'OWNER' } })) <= 1
      )
        throw new BadRequestException('The last owner cannot be deleted');
      if (
        (await tx.serviceRequest.count({ where: { userId: id } })) ||
        (await tx.payment.count({ where: { booking: { userId: id } } }))
      )
        throw new ConflictException(
          'This customer has reservations or payments that must be retained',
        );
      await tx.user.delete({ where: { id } });
      return { message: 'User deleted successfully' };
    });
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    const { password, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }
}
