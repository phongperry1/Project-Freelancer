import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Headers,
  UnauthorizedException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { NotificationService } from './notification.service.js';

@ApiTags('Notifications')
@Controller(['api/v1/notifications', 'notifications'])
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Trích xuất thông tin user từ Bearer Token trong Authorization Header
   */
  private async getUserIdFromHeader(authorization?: string): Promise<string> {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Vui lòng đăng nhập để xem thông báo.');
    }
    const token = authorization.slice(7).trim();
    const secret =
      this.configService.get<string>('JWT_SECRET') ??
      'tku-learning-platform-secret-jwt-key-2026';

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub?: string;
        role?: string;
      }>(token, { secret });
      if (!payload?.sub) {
        throw new UnauthorizedException('Token không hợp lệ.');
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
    }
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách thông báo của người dùng' })
  @ApiQuery({ name: 'limit', required: false, description: 'Số lượng thông báo cần lấy (mặc định 30)' })
  @ApiResponse({ status: 200, description: 'Danh sách thông báo và số lượng chưa đọc' })
  async getNotifications(
    @Query('limit') limit?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserIdFromHeader(authorization);
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100) : 30;
    return this.notificationService.getNotifications(userId, parsedLimit);
  }

  @Get('unread-count')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đếm nhanh số lượng thông báo chưa đọc (dùng cho polling quả chuông)' })
  @ApiResponse({ status: 200, description: 'Số lượng thông báo chưa đọc' })
  async getUnreadCount(@Headers('authorization') authorization?: string) {
    const userId = await this.getUserIdFromHeader(authorization);
    return this.notificationService.getUnreadCount(userId);
  }

  @Patch('read-all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
  @ApiResponse({ status: 200, description: 'Đã đánh dấu tất cả là đã đọc' })
  async markAllAsRead(@Headers('authorization') authorization?: string) {
    const userId = await this.getUserIdFromHeader(authorization);
    return this.notificationService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đánh dấu 1 thông báo cụ thể là đã đọc' })
  @ApiParam({ name: 'id', description: 'Mã UUID của thông báo' })
  @ApiResponse({ status: 200, description: 'Đã đánh dấu đọc thành công' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserIdFromHeader(authorization);
    return this.notificationService.markAsRead(userId, id);
  }
}
