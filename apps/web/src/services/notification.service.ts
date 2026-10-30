import { authService } from './auth.service';

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  targetUrl: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

class NotificationService {
  private getAuthHeaders(): HeadersInit {
    const token = authService.getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Lấy danh sách thông báo và số lượng chưa đọc
   */
  async getNotifications(limit = 30): Promise<NotificationListResponse> {
    const token = authService.getStoredToken();
    if (!token) {
      return { notifications: [], unreadCount: 0 };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/notifications?limit=${limit}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách thông báo');
      }

      return await response.json();
    } catch {
      return { notifications: [], unreadCount: 0 };
    }
  }

  /**
   * Đếm nhanh số lượng thông báo chưa đọc (cho polling badge)
   */
  async getUnreadCount(): Promise<number> {
    const token = authService.getStoredToken();
    if (!token) return 0;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) return 0;

      const data = await response.json();
      return data?.unreadCount || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Đánh dấu 1 thông báo cụ thể là đã đọc
   */
  async markAsRead(id: string): Promise<boolean> {
    const token = authService.getStoredToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc
   */
  async markAllAsRead(): Promise<boolean> {
    const token = authService.getStoredToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const notificationService = new NotificationService();
