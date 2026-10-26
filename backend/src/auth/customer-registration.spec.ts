import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './register.dto';
describe('Public registration', () => {
  it('forces CUSTOMER and strips passwords even if privileged properties are submitted', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 'new', role: 'CUSTOMER', password: 'hash' });
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn().mockResolvedValue(null), create },
          },
        },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();
    const dto = {
      email: 'test@example.com',
      fullName: 'Customer',
      password: 'testing123',
      role: 'OWNER',
      operationsEnabled: true,
    } as RegisterDto;
    const result = await module.get(AuthService).register(dto);
    const call: unknown = (create.mock.calls as unknown[][])[0][0];
    expect(call).toHaveProperty('data.role', 'CUSTOMER');
    expect(call).not.toHaveProperty('data.operationsEnabled');
    expect(result.user).not.toHaveProperty('password');
  });
});
