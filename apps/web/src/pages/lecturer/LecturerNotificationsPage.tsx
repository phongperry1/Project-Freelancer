import {
  AlertCircle,
  ArrowRight,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock,
  FileCheck,
  Inbox,
  Loader2,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../context/useToast';
import {
  notificationService,
  type NotificationItem,
} from '../../services/notification.service';
import './lecturerNotifications.css';

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
    if (diffDay === 1) return 'Hôm qua';
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

const formatFullDateTime = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const getNotificationCategory = (item: NotificationItem): 'EXAM' | 'QA' | 'GENERAL' => {
  const t = (item.title || '').toLowerCase();
  const c = (item.content || '').toLowerCase();
  const url = (item.targetUrl || '').toLowerCase();
  if (
    t.includes('kiểm tra') ||
    t.includes('bài nộp') ||
    t.includes('bài làm') ||
    t.includes('chấm') ||
    t.includes('kết quả') ||
    c.includes('bài nộp') ||
    c.includes('kiểm tra') ||
    url.includes('/exams') ||
    url.includes('/results')
  ) {
    return 'EXAM';
  }
  if (
    t.includes('câu hỏi') ||
    t.includes('bình luận') ||
    t.includes('thảo luận') ||
    t.includes('phản hồi') ||
    t.includes('ghim') ||
    c.includes('bình luận') ||
    c.includes('câu hỏi') ||
    url.includes('/discussions') ||
    url.includes('tab=discussion')
  ) {
    return 'QA';
  }
  return 'GENERAL';
};

export const LecturerNotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD' | 'EXAM' | 'QA'>('ALL');

  // 1. Tải dữ liệu thông báo từ API
  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        setError(null);
        const res = await notificationService.getNotifications(100);
        if (!isMounted) return;
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Không thể tải thông báo.';
        setError(msg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  // 2. Lắng nghe sự kiện realtime từ hệ thống
  useEffect(() => {
    const handleNewNotification = () => {
      setRefreshTrigger((prev) => prev + 1);
    };

    const handleNotificationRead = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: string; count?: number }>;
      if (customEvent.detail?.id) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === customEvent.detail?.id ? { ...item, isRead: true } : item
          )
        );
      }
      if (typeof customEvent.detail?.count === 'number') {
        setUnreadCount(customEvent.detail.count);
      }
    };

    const handleFocusOrVisible = () => {
      if (!document.hidden) {
        setRefreshTrigger((prev) => prev + 1);
      }
    };

    window.addEventListener('tku:new-notification', handleNewNotification);
    window.addEventListener('tku:notification-read', handleNotificationRead);
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      window.removeEventListener('tku:new-notification', handleNewNotification);
      window.removeEventListener('tku:notification-read', handleNotificationRead);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, []);

  // 3. Tính toán KPI thống kê
  const stats = useMemo(() => {
    let examCount = 0;
    let qaCount = 0;
    notifications.forEach((item) => {
      const cat = getNotificationCategory(item);
      if (cat === 'EXAM') examCount++;
      if (cat === 'QA') qaCount++;
    });

    return {
      total: notifications.length,
      unread: unreadCount,
      exam: examCount,
      qa: qaCount,
    };
  }, [notifications, unreadCount]);

  // 4. Lọc và nhóm thông báo theo mốc thời gian (Tối ưu hóa $O(N)$ tránh khởi tạo Date lặp lại)
  const filteredNotifications = useMemo(() => {
    if (filterType === 'ALL') return notifications;
    if (filterType === 'UNREAD') return notifications.filter((n) => !n.isRead);
    if (filterType === 'EXAM') return notifications.filter((n) => getNotificationCategory(n) === 'EXAM');
    if (filterType === 'QA') return notifications.filter((n) => getNotificationCategory(n) === 'QA');
    return notifications;
  }, [notifications, filterType]);

  const groupedNotifications = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const getGroupLabel = (dateStr: string): string => {
      try {
        const itemDateStr = new Date(dateStr).toDateString();
        if (itemDateStr === todayStr) return 'Hôm nay';
        if (itemDateStr === yesterdayStr) return 'Hôm qua';
        return 'Các ngày trước';
      } catch {
        return 'Các ngày trước';
      }
    };

    const groups: { [key: string]: NotificationItem[] } = {};
    const order = ['Hôm nay', 'Hôm qua', 'Các ngày trước'];

    filteredNotifications.forEach((item) => {
      const label = getGroupLabel(item.createdAt);
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(item);
    });

    return order
      .filter((label) => groups[label] && groups[label].length > 0)
      .map((label) => ({
        label,
        items: groups[label],
      }));
  }, [filteredNotifications]);

  // 5. Đánh dấu 1 thông báo đã đọc
  const handleMarkAsRead = useCallback(
    async (item: NotificationItem, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (item.isRead) return;

      const nextCount = Math.max(0, unreadCount - 1);
      setUnreadCount(nextCount);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );

      window.dispatchEvent(
        new CustomEvent('tku:notification-read', {
          detail: { id: item.id, count: nextCount },
        })
      );

      try {
        await notificationService.markAsRead(item.id);
      } catch (err) {
        console.error('Lỗi khi đánh dấu thông báo đã đọc:', err);
      }
    },
    [unreadCount]
  );

  // 6. Đánh dấu tất cả thông báo đã đọc
  const handleMarkAllAsRead = useCallback(async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);

    try {
      const success = await notificationService.markAllAsRead();
      if (success) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
        window.dispatchEvent(
          new CustomEvent('tku:notification-read', {
            detail: { count: 0 },
          })
        );
        toast.success('Đã đánh dấu tất cả thông báo là đã đọc!');
      } else {
        toast.error('Không thể đánh dấu đọc tất cả, vui lòng thử lại.');
      }
    } catch {
      toast.error('Có lỗi xảy ra khi cập nhật thông báo.');
    } finally {
      setIsMarkingAll(false);
    }
  }, [unreadCount, isMarkingAll]);

  // 7. Chuyển đến trang đích của thông báo
  const handleNavigateToTarget = useCallback(
    (item: NotificationItem) => {
      handleMarkAsRead(item);

      if (!item.targetUrl) return;
      let finalUrl = item.targetUrl;

      // Chuẩn hóa điều hướng sang không gian Giảng viên nếu cần
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

      navigate(finalUrl);
    },
    [handleMarkAsRead, navigate]
  );

  return (
    <div className="tku-notifications-page">
      {/* 1. Academic Header Banner - Đồng bộ phong cách TKU Academic */}
      <section className="tku-assignments-banner">
        <div className="tku-assignments-banner__content">
          <div className="tku-banner-pill">
            <Sparkles size={14} />
            <span>Trung tâm Thông báo Học tập</span>
          </div>
          <h1 className="tku-assignments-banner__title">Thông báo & Hoạt động</h1>
          <p className="tku-assignments-banner__desc">
            Theo dõi toàn diện lịch sử nộp bài kiểm tra, chấm thi, thảo luận hỏi đáp từ học sinh và các sự kiện học tập quan trọng trên hệ thống.
          </p>
        </div>

        {unreadCount > 0 && (
          <div className="tku-banner-action-wrap">
            <button
              type="button"
              className="tku-banner-mark-read-btn"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              title="Đánh dấu tất cả là đã đọc"
            >
              <CheckCheck size={16} />
              <span>Đánh dấu đọc hết ({unreadCount})</span>
            </button>
          </div>
        )}
      </section>

      {/* 2. KPI Quick Stats Overview - Thẻ thống kê tương tác nhanh */}
      <section className="tku-notif-stats-grid">
        <div
          className={`tku-notif-stat-card ${filterType === 'ALL' ? 'is-active' : ''}`}
          onClick={() => setFilterType('ALL')}
          role="button"
          tabIndex={0}
          title="Nhấp để xem tất cả thông báo"
        >
          <div className="tku-notif-stat-icon tku-notif-stat-icon--total">
            <Bell size={22} />
          </div>
          <div className="tku-notif-stat-info">
            <span className="tku-notif-stat-label">Tổng thông báo</span>
            <span className="tku-notif-stat-value">{stats.total}</span>
          </div>
        </div>

        <div
          className={`tku-notif-stat-card ${stats.unread > 0 ? 'is-highlight' : ''} ${filterType === 'UNREAD' ? 'is-active' : ''}`}
          onClick={() => setFilterType((prev) => (prev === 'UNREAD' ? 'ALL' : 'UNREAD'))}
          role="button"
          tabIndex={0}
          title="Nhấp để chỉ xem thông báo chưa đọc"
        >
          <div className="tku-notif-stat-icon tku-notif-stat-icon--unread">
            <Inbox size={22} />
          </div>
          <div className="tku-notif-stat-info">
            <span className="tku-notif-stat-label">Chưa đọc</span>
            <div className="tku-notif-stat-value-row">
              <span className="tku-notif-stat-value">{stats.unread}</span>
              {stats.unread > 0 && (
                <span className="tku-pill-badge-pulse">Mới</span>
              )}
            </div>
          </div>
        </div>

        <div
          className={`tku-notif-stat-card ${filterType === 'EXAM' ? 'is-active' : ''}`}
          onClick={() => setFilterType((prev) => (prev === 'EXAM' ? 'ALL' : 'EXAM'))}
          role="button"
          tabIndex={0}
          title="Nhấp để lọc thông báo bài kiểm tra"
        >
          <div className="tku-notif-stat-icon tku-notif-stat-icon--exam">
            <FileCheck size={22} />
          </div>
          <div className="tku-notif-stat-info">
            <span className="tku-notif-stat-label">Bài kiểm tra & Nộp bài</span>
            <span className="tku-notif-stat-value">{stats.exam}</span>
          </div>
        </div>

        <div
          className={`tku-notif-stat-card ${filterType === 'QA' ? 'is-active' : ''}`}
          onClick={() => setFilterType((prev) => (prev === 'QA' ? 'ALL' : 'QA'))}
          role="button"
          tabIndex={0}
          title="Nhấp để lọc thông báo hỏi đáp"
        >
          <div className="tku-notif-stat-icon tku-notif-stat-icon--qa">
            <MessageSquare size={22} />
          </div>
          <div className="tku-notif-stat-info">
            <span className="tku-notif-stat-label">Hỏi đáp & Thảo luận</span>
            <span className="tku-notif-stat-value">{stats.qa}</span>
          </div>
        </div>
      </section>

      {/* 3. Notification List / Feed */}
      <section className="tku-notif-content-area">
        {isLoading ? (
          <div className="tku-notif-loading-box">
            <Loader2 size={36} className="tku-spin" />
            <p>Đang tải dữ liệu thông báo học tập...</p>
          </div>
        ) : error ? (
          <div className="tku-notif-error-box">
            <AlertCircle size={36} />
            <p>{error}</p>
            <button
              type="button"
              className="tku-btn-primary"
              onClick={() => {
                setIsLoading(true);
                setRefreshTrigger((prev) => prev + 1);
              }}
            >
              Thử lại
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="tku-notif-empty-state">
            <div className="tku-notif-empty-icon-wrap">
              <BellOff size={42} />
            </div>
            <h3 className="tku-notif-empty-title">
              {filterType === 'UNREAD'
                ? 'Không có thông báo chưa đọc nào'
                : filterType === 'EXAM'
                ? 'Không có thông báo bài kiểm tra nào'
                : filterType === 'QA'
                ? 'Không có thông báo thảo luận nào'
                : 'Chưa có thông báo nào'}
            </h3>
            <p className="tku-notif-empty-desc">
              {filterType !== 'ALL'
                ? 'Bạn có thể chọn xem tất cả để kiểm tra các thông báo khác.'
                : 'Khi học sinh nộp bài kiểm tra hoặc đặt câu hỏi thảo luận, thông báo sẽ được lưu và hiển thị tại đây.'}
            </p>
            
          </div>
        ) : (
          <div className="tku-notif-feed">
            {groupedNotifications.map((group) => (
              <div key={group.label} className="tku-notif-group">
                <div className="tku-notif-group-header">
                  <span className="tku-notif-group-label">{group.label}</span>
                  <span className="tku-notif-group-count">{group.items.length} thông báo</span>
                </div>

                <div className="tku-notif-group-list">
                  {group.items.map((item) => {
                    const category = getNotificationCategory(item);

                    return (
                      <article
                        key={item.id}
                        className={`tku-notif-full-card ${!item.isRead ? 'is-unread' : ''}`}
                        onClick={() => handleNavigateToTarget(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNavigateToTarget(item);
                          }
                        }}
                      >
                        {/* Icon đại diện theo danh mục */}
                        <div className={`tku-notif-card-icon tku-notif-card-icon--${category.toLowerCase()}`}>
                          {category === 'EXAM' ? (
                            <FileCheck size={20} />
                          ) : category === 'QA' ? (
                            <MessageSquare size={20} />
                          ) : (
                            <Bell size={20} />
                          )}
                        </div>

                        {/* Thân nội dung thẻ */}
                        <div className="tku-notif-card-body">
                          <div className="tku-notif-card-meta-row">
                            <span className={`tku-notif-category-pill tku-notif-category-pill--${category.toLowerCase()}`}>
                              {category === 'EXAM'
                                ? 'Bài kiểm tra & Chấm thi'
                                : category === 'QA'
                                ? 'Hỏi đáp & Thảo luận'
                                : 'Hệ thống'}
                            </span>

                            <div className="tku-notif-card-time-wrap">
                              <Clock size={13} />
                              <span title={formatFullDateTime(item.createdAt)}>
                                {formatRelativeTime(item.createdAt)}
                              </span>
                            </div>

                            {!item.isRead && (
                              <span className="tku-notif-badge-unread" title="Thông báo mới chưa đọc">
                                Chưa đọc
                              </span>
                            )}
                          </div>

                          <h3 className="tku-notif-card-title">{item.title}</h3>
                          <p className="tku-notif-card-text">{item.content}</p>
                        </div>

                        {/* Thao tác nhanh bên phải */}
                        <div className="tku-notif-card-actions">
                          {!item.isRead && (
                            <button
                              type="button"
                              className="tku-notif-action-btn-check"
                              onClick={(e) => handleMarkAsRead(item, e)}
                              title="Đánh dấu đã đọc"
                            >
                              <Check size={16} />
                              <span>Đã đọc</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="tku-notif-action-btn-go"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateToTarget(item);
                            }}
                            title="Đi đến xem chi tiết"
                          >
                            <span>Xem ngay</span>
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default LecturerNotificationsPage;
