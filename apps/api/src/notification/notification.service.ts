import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách thông báo của người dùng (sắp xếp mới nhất lên đầu, giới hạn 30 thông báo gần nhất)
   */
  async getNotifications(userId: string, limit = 30) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          targetUrl: true,
          isRead: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
    };
  }

  /**
   * Đếm nhanh số lượng thông báo chưa đọc của người dùng (cho badge quả chuông)
   */
  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount };
  }

  /**
   * Đánh dấu 1 thông báo cụ thể là đã đọc
   */
  async markAsRead(userId: string, notificationId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
      select: { id: true, isRead: true },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy thông báo hoặc bạn không có quyền.');
    }

    if (existing.isRead) {
      return { success: true, message: 'Thông báo đã được đánh dấu đọc trước đó.' };
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return { success: true, message: 'Đã đánh dấu thông báo là đã đọc.' };
  }

  /**
   * Đánh dấu tất cả thông báo của người dùng là đã đọc
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return {
      success: true,
      message: `Đã đánh dấu ${result.count} thông báo là đã đọc.`,
      updatedCount: result.count,
    };
  }
}
