import type { StringValue } from 'ms';

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32 ||
    !process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_REFRESH_SECRET.length < 32 ||
    process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET)
) {
  throw new Error(
    'Set distinct JWT secrets of at least 32 characters in production',
  );
}

export const jwtConstants = {
  secret: process.env.JWT_SECRET ?? 'dev-access-secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
};

export const ACCESS_TOKEN_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ??
  '15m') as StringValue;
export const REFRESH_TOKEN_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN ??
  '7d') as StringValue;
