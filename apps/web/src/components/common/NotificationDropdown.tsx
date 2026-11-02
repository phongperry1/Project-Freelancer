import {
  ArrowRight,
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  FileCheck,
  Inbox,
  Loader2,
  MessageSquare,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import {
  notificationService,
  type NotificationItem,
} from '../../services/notification.service';
import { toast } from '../../context/useToast';
import './NotificationDropdown.css';

const formatRelativeTime = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return 'Gần đây';
  }
};

export const NotificationDropdown: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef<number | null>(null);
  const isOpenRef = useRef<boolean>(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const displayCount = isAuthenticated && user ? unreadCount : 0;

  // 1. Tải danh sách thông báo khi người dùng mở dropdown
  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await notificationService.getNotifications(30);
      setNotifications(data.notifications || []);
      const count = data.unreadCount || 0;
      setUnreadCount(count);
      prevCountRef.current = count;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // 2. Polling nhanh đếm số lượng chưa đọc (mỗi 8 giây & khi focus window)
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    let isMounted = true;

    const pollUnreadCount = async () => {
      if (document.hidden) return;
      try {
        const count = await notificationService.getUnreadCount();
        if (!isMounted) return;

        // Phát hiện có thông báo mới đến trong lúc người dùng đang duyệt web
        if (prevCountRef.current !== null && count > prevCountRef.current) {
          // Bắn Custom Event để các trang (như trang Quản lý Thảo luận) tự động cập nhật dữ liệu tức thì
          window.dispatchEvent(
            new CustomEvent('tku:new-notification', { detail: { count } })
          );

          try {
            const latestData = await notificationService.getNotifications(1);
            const newest = latestData.notifications?.[0];
            if (newest) {
              toast.info(`🔔 ${newest.title}: ${newest.content}`);
            } else {
              toast.info('🔔 Bạn vừa nhận được thông báo mới!');
            }
          } catch {
            toast.info('🔔 Bạn vừa nhận được thông báo mới!');
          }

          if (isOpenRef.current) {
            loadNotifications();
          }
        }

        prevCountRef.current = count;
        setUnreadCount(count);
      } catch {
        // Bỏ qua lỗi polling ngầm
      }
    };

    pollUnreadCount();
    const interval = setInterval(pollUnreadCount, 8000); // 8 giây 1 lần

    const handleFocusOrVisible = () => {
      if (!document.hidden) {
        pollUnreadCount();
      }
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    const handleNotifRead = (e: Event) => {
      const customEvent = e as CustomEvent<{ count?: number }>;
      if (typeof customEvent.detail?.count === 'number') {
        const newCount = customEvent.detail.count;
        setUnreadCount(newCount);
        prevCountRef.current = newCount;
      } else {
        setUnreadCount((prev) => {
          const next = Math.max(0, prev - 1);
          prevCountRef.current = next;
          return next;
        });
      }
    };
    window.addEventListener('tku:notification-read', handleNotifRead);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('tku:notification-read', handleNotifRead);
    };
  }, [isAuthenticated, user, loadNotifications]);

  const handleToggle = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      loadNotifications();
    }
  };

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 3. Đánh dấu tất cả là đã đọc
  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (displayCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    setUnreadCount(0);
    prevCountRef.current = 0;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    window.dispatchEvent(
      new CustomEvent('tku:notification-read', { detail: { count: 0 } })
    );
    try {
      await notificationService.markAllAsRead();
    } catch {
      // ignore
    } finally {
      setIsMarkingAll(false);
    }
  };

  // 4. Click vào 1 thông báo cụ thể -> Mark read & chuyển trang ngay lập tức
  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      const newCount = Math.max(0, displayCount - 1);
      setUnreadCount(newCount);
      prevCountRef.current = newCount;
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      window.dispatchEvent(
        new CustomEvent('tku:notification-read', {
          detail: { id: item.id, count: newCount },
        })
      );
      // Thực hiện đánh dấu đã đọc ngầm không gây block điều hướng
      notificationService.markAsRead(item.id).catch((err) => {
        console.error('Lỗi khi đánh dấu thông báo đã đọc:', err);
      });
    }
    setIsOpen(false);
    if (item.targetUrl) {
      let finalUrl = item.targetUrl;

      // Nếu đang là Giảng viên hoặc đang trong không gian Giảng viên (/lecturer)
      // Các thông báo về câu hỏi / bình luận sẽ dẫn về trang Quản lý Hỏi đáp & Thảo luận của giảng viên
      const isLecturerContext =
        user?.role === 'TEACHER' || location.pathname.startsWith('/lecturer');

      if (isLecturerContext) {
        if (
          finalUrl.includes('/courses/') &&
          (finalUrl.includes('tab=discussion') ||
            item.title.toLowerCase().includes('câu hỏi') ||
            item.title.toLowerCase().includes('bình luận'))
        ) {
          const courseMatch = finalUrl.match(/\/courses\/([0-9a-fA-F-]+)/);
          const commentMatch = finalUrl.match(/commentId=([0-9a-fA-F-]+)/);
          const courseId = courseMatch ? courseMatch[1] : '';
          const commentId = commentMatch ? commentMatch[1] : '';

          const params = new URLSearchParams();
          if (courseId) params.set('courseId', courseId);
          if (commentId) params.set('commentId', commentId);
          const qs = params.toString();

          finalUrl = `/lecturer/discussions${qs ? `?${qs}` : ''}`;
        }
      }

      // Phát CustomEvent để các trang như CourseExamResultPage tự động re-fetch tức thì
      window.dispatchEvent(
        new CustomEvent('tku:refresh-exam-result', {
          detail: { url: finalUrl },
        })
      );

      navigate(finalUrl);
    }
  };

  return (
    <div className="tku-notif-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`tku-btn-icon tku-notif-bell-btn ${isOpen ? 'is-active' : ''}`}
        aria-label="Thông báo học tập"
        title="Thông báo học tập"
        onClick={handleToggle}
      >
        <Bell size={18} />
        {displayCount > 0 && (
          <span className="tku-notif-badge">
            {displayCount > 9 ? '9+' : displayCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="tku-notif-popover">
          {/* Header */}
          <div className="tku-notif-header">
            <div className="tku-notif-header-title">
              <span className="tku-notif-title-text">Thông báo học tập</span>
              {displayCount > 0 && (
                <span className="tku-notif-unread-pill">{displayCount} mới</span>
              )}
            </div>

            <div className="tku-notif-header-actions">
              {displayCount > 0 && (
                <button
                  type="button"
                  className="tku-notif-action-btn"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll}
                  title="Đánh dấu tất cả là đã đọc"
                >
                  <CheckCheck size={14} />
                  <span>Đã đọc hết</span>
                </button>
              )}
              <button
                type="button"
                className="tku-notif-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Đóng"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="tku-notif-list-container">
            {isLoading ? (
              <div className="tku-notif-loading">
                <Loader2 size={24} className="tku-spin" />
                <span>Đang tải thông báo...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="tku-notif-empty">
                <div className="tku-notif-empty-icon">
                  <Inbox size={28} />
                </div>
                <p className="tku-notif-empty-title">Chưa có thông báo nào</p>
                <p className="tku-notif-empty-desc">
                  Khi có người trả lời thảo luận hoặc có bài kiểm tra mới, thông báo sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              <div className="tku-notif-items">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`tku-notif-item ${!item.isRead ? 'is-unread' : ''}`}
                    onClick={() => handleNotificationClick(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(item);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="tku-notif-item-icon">
                      {item.title.toLowerCase().includes('kiểm tra') ||
                      item.title.toLowerCase().includes('bài nộp') ||
                      item.title.toLowerCase().includes('kết quả') ? (
                        <FileCheck size={16} />
                      ) : (
                        <MessageSquare size={16} />
                      )}
                    </div>

                    <div className="tku-notif-item-body">
                      <div className="tku-notif-item-header">
                        <h4 className="tku-notif-item-title">{item.title}</h4>
                        {!item.isRead && <span className="tku-notif-unread-dot" />}
                      </div>

                      <p className="tku-notif-item-content">{item.content}</p>

                      <div className="tku-notif-item-footer">
                        <span className="tku-notif-item-time">
                          <Clock size={12} />
                          <span>{formatRelativeTime(item.createdAt)}</span>
                        </span>
                        <span className="tku-notif-item-hint">
                          <span>Xem ngay</span>
                          <ExternalLink size={11} />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer: Xem tất cả thông báo */}
          <div className="tku-notif-dropdown-footer">
            <button
              type="button"
              className="tku-notif-view-all-btn"
              onClick={() => {
                setIsOpen(false);
                if (user?.role === 'TEACHER') {
                  navigate('/lecturer/notifications');
                } else {
                  navigate('/notifications');
                }
              }}
            >
              <span>Xem tất cả thông báo</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
