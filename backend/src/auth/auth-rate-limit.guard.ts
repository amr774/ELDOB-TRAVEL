import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

/** Per-process protection. Configure an edge/distributed limiter for multiple replicas. */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (
      !['/auth/login', '/auth/register', '/auth/browser/login'].includes(
        request.path,
      )
    )
      return true;
    const now = Date.now();
    for (const [key, entry] of this.attempts)
      if (entry.until <= now) this.attempts.delete(key);
    const key = `${request.ip}:${request.path}`;
    const entry = this.attempts.get(key) || { count: 0, until: now + 60000 };
    if (
      entry.count >= 20 ||
      (!this.attempts.has(key) && this.attempts.size >= 10000)
    )
      throw new HttpException(
        'Too many authentication attempts. Try again in a minute.',
        429,
      );
    entry.count++;
    this.attempts.set(key, entry);
    return true;
  }
}
