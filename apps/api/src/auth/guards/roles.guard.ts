import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu không yêu cầu vai trò cụ thể, cho phép đi qua
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Bạn không có quyền thực hiện hành động này.');
    }

    // Quyền Quản trị viên tối cao (ADMIN) có thể truy cập toàn bộ tài nguyên
    if (user.role === 'ADMIN') {
      return true;
    }

    // Khắc phục lỗ hổng: Kiểm tra quyền thời gian thực dựa trên role mới nhất của user từ DB
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException('Bạn không có quyền truy cập vào chức năng này.');
    }

    return true;
  }
}

