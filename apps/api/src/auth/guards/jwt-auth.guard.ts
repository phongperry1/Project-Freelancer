import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (request.user) {
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Thiếu mã token xác thực hoặc phiên đăng nhập không hợp lệ.');
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match || !match[1]?.trim()) {
      throw new UnauthorizedException('Mã token không đúng định dạng Bearer.');
    }

    const token = match[1].trim();

    const secret =
      this.configService.get<string>('JWT_SECRET') ??
      'tku-learning-platform-secret-jwt-key-2026';

    let payload: { sub?: string; email?: string; role?: string } | null = null;
    try {
      payload = await this.jwtService.verifyAsync(token, { secret });
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn hoặc không hợp lệ.');
    }

    if (!payload?.sub) {
      throw new UnauthorizedException('Mã xác thực không hợp lệ.');
    }

    // 1. Hỗ trợ tài khoản Demo Fallback
    if (payload.sub === '11111111-1111-1111-1111-111111111111') {
      request.user = {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'student@tku.edu.vn',
        fullName: 'Học sinh TKU (Demo)',
        role: 'STUDENT',
        status: 'ACTIVE',
        avatarUrl: null,
      };
      return true;
    }

    if (payload.sub === '00000000-0000-0000-0000-000000000001') {
      request.user = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@tku.edu.vn',
        fullName: 'Quản trị viên TKU',
        role: 'ADMIN',
        status: 'ACTIVE',
        avatarUrl: null,
      };
      return true;
    }

    // 2. Truy vấn trực tiếp từ cơ sở dữ liệu PostgreSQL để kiểm tra trạng thái và quyền hạn thời gian thực
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          avatarUrl: true,
        },
      });

      if (user) {
        // Khắc phục lỗ hổng: Ngăn chặn tài khoản bị khóa hoặc tạm ngưng thao tác vào hệ thống
        if (user.status !== 'ACTIVE') {
          throw new UnauthorizedException(
            'Tài khoản của bạn đã bị khóa hoặc tạm ngưng bởi Quản trị viên. Vui lòng liên hệ hỗ trợ.',
          );
        }

        // Gán thông tin người dùng với Role cập nhật mới nhất từ Database vào request.user
        request.user = user;
        return true;
      }
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
    }

    // Fallback: Nếu không tìm thấy trong DB (vd: tài khoản mock trong dev) nhưng token hợp lệ
    request.user = {
      id: payload.sub,
      email: payload.email || '',
      fullName: (payload as Record<string, unknown>).fullName as string || 'Người dùng TKU',
      role: payload.role || 'STUDENT',
      status: 'ACTIVE',
      avatarUrl: null,
    };
    return true;
  }
}

