import {
  ArrowRight,
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  Clock,
  FileCheck,
  Home,
  Loader2,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer } from '../../components/common/Footer';
import { Navbar } from '../../components/common/Navbar';
import { toast } from '../../context/useToast';
import {
  notificationService,
  type NotificationItem,
} from '../../services/notification.service';
import './studentNotifications.css';

type TabType = 'ALL' | 'UNREAD' | 'EXAM' | 'QA';

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

const getNotificationCategory = (
  item: NotificationItem,
): 'EXAM' | 'QA' | 'GENERAL' => {
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

export const StudentNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = () => {
      notificationService
        .getNotifications(50)
        .then((data) => {
          if (!isMounted) return;
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        })
        .catch(() => {
          if (!isMounted) return;
          toast.error('Không thể tải danh sách thông báo.');
        })
        .finally(() => {
          if (!isMounted) return;
          setIsLoading(false);
        });
    };

    loadNotifications();

    // Lắng nghe thông báo thời gian thực để cập nhật trang ngay lập tức
    const handleNewNotification = () => {
      loadNotifications();
    };

    window.addEventListener('tku:new-notification', handleNewNotification);

    return () => {
      isMounted = false;
      window.removeEventListener('tku:new-notification', handleNewNotification);
    };
  }, []);

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    try {
      setIsMarkingAll(true);
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      window.dispatchEvent(
        new CustomEvent('tku:notification-read', { detail: { count: 0 } }),
      );
      await notificationService.markAllAsRead();
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc.');
    } catch {
      toast.error('Không thể cập nhật trạng thái thông báo.');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => {
        const nextCount = Math.max(0, prev - 1);
        window.dispatchEvent(
          new CustomEvent('tku:notification-read', {
            detail: { id: item.id, count: nextCount },
          }),
        );
        return nextCount;
      });
      void notificationService.markAsRead(item.id);
    }

    if (item.targetUrl) {
      navigate(item.targetUrl);
    }
  };

  // Filtered Notifications based on Active Tab
  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'UNREAD':
        return notifications.filter((n) => !n.isRead);
      case 'EXAM':
        return notifications.filter((n) => getNotificationCategory(n) === 'EXAM');
      case 'QA':
        return notifications.filter((n) => getNotificationCategory(n) === 'QA');
      case 'ALL':
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  const examCount = useMemo(
    () => notifications.filter((n) => getNotificationCategory(n) === 'EXAM').length,
    [notifications],
  );

  const qaCount = useMemo(
    () => notifications.filter((n) => getNotificationCategory(n) === 'QA').length,
    [notifications],
  );

  const renderCategoryIcon = (category: 'EXAM' | 'QA' | 'GENERAL') => {
    switch (category) {
      case 'EXAM':
        return (
          <div className="tku-notif-card__icon-box tku-notif-card__icon-box--exam">
            <FileCheck size={20} />
          </div>
        );
      case 'QA':
        return (
          <div className="tku-notif-card__icon-box tku-notif-card__icon-box--qa">
            <MessageSquare size={20} />
          </div>
        );
      case 'GENERAL':
      default:
        return (
          <div className="tku-notif-card__icon-box tku-notif-card__icon-box--general">
            <Bell size={20} />
          </div>
        );
    }
  };

  return (
    <div className="tku-notif-page">
      <Navbar />

      <main className="tku-notif-page__main">
        {/* HERO SECTION */}
        <section className="tku-notif-hero">
          <div className="tku-notif-hero__container">
            <nav className="tku-notif-breadcrumbs" aria-label="Đường dẫn điều hướng">
              <Link to="/" className="tku-notif-breadcrumb-link">
                <Home size={14} />
                <span>Trang chủ</span>
              </Link>
              <ChevronRight size={13} className="tku-notif-breadcrumb-sep" />
              <span className="tku-notif-breadcrumb-current">Thông báo của tôi</span>
            </nav>

            <div className="tku-notif-hero__header">
              <div className="tku-notif-hero__title-wrap">
                <div className="tku-notif-hero__icon-box">
                  <Bell size={26} />
                </div>
                <div>
                  <h1 className="tku-notif-hero__title">Trung tâm thông báo học tập</h1>
                  <p className="tku-notif-hero__desc">
                    Cập nhật kịp thời mọi phản hồi thảo luận bài học, bài kiểm tra mới và tin tức quan trọng từ giảng viên.
                  </p>
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll}
                  className="tku-notif-mark-all-btn"
                  title="Đánh dấu tất cả thông báo là đã đọc"
                >
                  {isMarkingAll ? (
                    <Loader2 size={16} className="tku-notif-spinner" />
                  ) : (
                    <CheckCheck size={16} />
                  )}
                  <span>Đánh dấu tất cả đã đọc</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* BODY CONTENT */}
        <div className="tku-notif-content-container">
          {/* Filter Tabs */}
          <div className="tku-notif-tabs-bar">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`tku-notif-tab ${activeTab === 'ALL' ? 'is-active' : ''}`}
            >
              <Sparkles size={15} />
              <span>Tất cả</span>
              <span className="tku-notif-tab__badge">{notifications.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('UNREAD')}
              className={`tku-notif-tab ${activeTab === 'UNREAD' ? 'is-active' : ''}`}
            >
              <Bell size={15} />
              <span>Chưa đọc</span>
              {unreadCount > 0 && (
                <span className="tku-notif-tab__badge tku-notif-tab__badge--unread">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('EXAM')}
              className={`tku-notif-tab ${activeTab === 'EXAM' ? 'is-active' : ''}`}
            >
              <FileCheck size={15} />
              <span>Bài kiểm tra</span>
              <span className="tku-notif-tab__badge">{examCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('QA')}
              className={`tku-notif-tab ${activeTab === 'QA' ? 'is-active' : ''}`}
            >
              <MessageSquare size={15} />
              <span>Hỏi đáp & Thảo luận</span>
              <span className="tku-notif-tab__badge">{qaCount}</span>
            </button>
          </div>

          {/* Notifications List */}
          {isLoading ? (
            <div className="tku-notif-loading-box">
              <Loader2 size={32} className="tku-notif-spinner" />
              <span>Đang tải thông báo...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="tku-notif-empty-state">
              <div className="tku-notif-empty-icon-box">
                <BellOff size={32} />
              </div>
              <h3 className="tku-notif-empty-title">
                {activeTab === 'UNREAD'
                  ? 'Bạn đã đọc hết tất cả thông báo!'
                  : 'Chưa có thông báo nào trong mục này.'}
              </h3>
              <p className="tku-notif-empty-desc">
                {activeTab === 'UNREAD'
                  ? 'Tuyệt vời! Không có tin nhắn hoặc lời nhắc nhở nào chưa được xử lý.'
                  : 'Mọi thông báo về bài kiểm tra mới và phản hồi câu hỏi sẽ hiển thị tại đây.'}
              </p>
              <Link to="/courses" className="tku-notif-empty-btn">
                <span>Khám phá các khóa học</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="tku-notif-list">
              {filteredNotifications.map((item) => {
                const category = getNotificationCategory(item);
                return (
                  <div
                    key={item.id}
                    className={`tku-notif-card ${!item.isRead ? 'is-unread' : ''}`}
                    onClick={() => handleNotificationClick(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(item);
                      }
                    }}
                  >
                    {renderCategoryIcon(category)}

                    <div className="tku-notif-card__body">
                      <div className="tku-notif-card__top-row">
                        <h4 className="tku-notif-card__title">
                          {!item.isRead && <span className="tku-notif-unread-dot" />}
                          <span>{item.title}</span>
                        </h4>
                        <span className="tku-notif-card__time">
                          <Clock size={12} />
                          <span>{formatRelativeTime(item.createdAt)}</span>
                        </span>
                      </div>

                      <p className="tku-notif-card__content">{item.content}</p>

                      <div className="tku-notif-card__footer">
                        <span>
                          {category === 'EXAM'
                            ? 'Vào làm bài kiểm tra'
                            : category === 'QA'
                            ? 'Xem phản hồi thảo luận'
                            : 'Xem chi tiết'}
                        </span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StudentNotificationsPage;

