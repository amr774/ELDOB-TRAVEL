import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';
import { UseGuards } from '@nestjs/common';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

@Controller('auth/browser')
@UseGuards(AuthRateLimitGuard)
export class BrowserAuthController {
  constructor(private readonly auth: AuthService) {}

  private verifyClient(req: Request) {
    // A non-simple custom header plus a strict origin allowlist prevents cookie CSRF.
    const origins = (
      process.env.FRONTEND_ORIGINS ||
      'http://localhost:5173,http://127.0.0.1:5173'
    ).split(',');
    if (
      req.headers['x-eldob-client'] !== 'web' ||
      (req.headers.origin && !origins.includes(req.headers.origin))
    ) {
      throw new ForbiddenException('Invalid browser origin');
    }
  }
  private cookie(req: Request) {
    return req.headers.cookie
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith('eldob_refresh='))
      ?.slice('eldob_refresh='.length);
  }
  private options() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/auth/browser',
    };
  }
  private send(
    res: Response,
    result: Awaited<ReturnType<AuthService['login']>>,
  ) {
    // Root path accommodates a same-origin /api reverse proxy in production.
    res.cookie('eldob_refresh', result.refreshToken, {
      ...this.options(),
      path: '/',
      maxAge: 7 * 86400000,
    });
    res.setHeader('Cache-Control', 'no-store');
    return { accessToken: result.accessToken, user: result.user };
  }
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.verifyClient(req);
    return this.send(res, await this.auth.login(dto));
  }
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.verifyClient(req);
    const token = this.cookie(req);
    if (!token) throw new UnauthorizedException();
    try {
      return this.send(res, await this.auth.refresh(token));
    } catch (error) {
      res.clearCookie('eldob_refresh', { ...this.options(), path: '/' });
      throw error;
    }
  }
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.verifyClient(req);
    const token = this.cookie(req);
    if (token) await this.auth.logout(token);
    res.clearCookie('eldob_refresh', { ...this.options(), path: '/' });
    return { message: 'Logged out' };
  }
}
