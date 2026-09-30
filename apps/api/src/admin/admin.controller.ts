import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AdminService, type DashboardStatsResponse, type AdminCoursesResponse } from './admin.service.js';

@ApiTags('Admin')
@Controller('api/v1/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async verifyAdmin(authorization?: string): Promise<void> {
    if (!authorization) {
      throw new UnauthorizedException('Thiếu mã token xác thực.');
    }

    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      throw new UnauthorizedException('Token không hợp lệ.');
    }

    const secret =
      this.configService.get<string>('JWT_SECRET') ??
      'tku-learning-platform-secret-jwt-key-2026';

    let payload: { sub?: string; role?: string } | null = null;
    try {
      payload = await this.jwtService.verifyAsync(token, { secret });
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
    }

    if (!payload?.sub) {
      throw new UnauthorizedException('Token không hợp lệ.');
    }

    if (payload.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập trang quản trị hệ thống.',
      );
    }
  }

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy dữ liệu thống kê tổng quan cho Admin Dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê tổng quan hệ thống.',
  })
  async getDashboard(
    @Headers('authorization') authorization?: string,
  ): Promise<DashboardStatsResponse> {
    await this.verifyAdmin(authorization);
    return this.adminService.getDashboardStats();
  }

  @Get('courses')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách khóa học và thống kê cho trang quản lý khóa học',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách khóa học và thống kê phân loại.',
  })
  async getCourses(
    @Headers('authorization') authorization?: string,
  ): Promise<AdminCoursesResponse> {
    await this.verifyAdmin(authorization);
    return this.adminService.getAdminCourses();
  }
}
