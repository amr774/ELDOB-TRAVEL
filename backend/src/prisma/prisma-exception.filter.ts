import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      error.code === 'P2025'
        ? 409
        : ['P2002', 'P2003', 'P2034'].includes(error.code)
          ? 409
          : 500;
    response.status(status).json({
      statusCode: status,
      message:
        status === 409
          ? 'This record already exists, changed, or has related records. Refresh and try again.'
          : 'A database operation failed',
    });
  }
}
