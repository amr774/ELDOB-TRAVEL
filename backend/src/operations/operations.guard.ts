import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RequestWithUser } from '../auth/request-with-user.type';
@Injectable()
export class OperationsGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    return (
      user?.role === Role.OWNER ||
      (user?.role === Role.EMPLOYEE && user.operationsEnabled === true)
    );
  }
}
