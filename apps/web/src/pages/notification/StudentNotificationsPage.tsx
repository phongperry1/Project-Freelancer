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
import '../course/coursesPage.css';
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
    document.title = 'Thông báo học tập | TKU E-Learning';
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let isMounted = true;
    notificationService
      .getNotifications(50)
      .then((res) => {
        if (!isMounted) return;
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const message =
          err instanceof Error ? err.message : 'Không thể tải thông báo học tập';
        toast.error(message);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    try {
      setIsMarkingAll(true);
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
      window.dispatchEvent(
        new CustomEvent('tku:notification-read', {
          detail: { all: true, count: 0 },
        }),
      );
    } catch {
      toast.error('Không thể đánh dấu đã đọc. Vui lòng thử lại.');
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
        {/* ================================================================
            1. ACADEMIC HERO BANNER (ĐỒNG BỘ 100% TOÀN HỆ THỐNG TKU)
            ================================================================ */}
        <section className="tku-courses-hub-hero">
          <div className="tku-container">
            {/* Breadcrumb Trail */}
            <nav className="tku-hero-breadcrumbs" aria-label="Đường dẫn điều hướng">
              <Link to="/" className="tku-hero-breadcrumb-link">
                <Home size={14} />
                <span>Trang chủ</span>
              </Link>
              <ChevronRight size={13} className="tku-hero-breadcrumb-sep" />
              <span className="tku-hero-breadcrumb-current">Thông báo của tôi</span>
            </nav>

            <div className="tku-courses-hub-hero__grid">
              {/* Cột Trái: Tiêu đề & Thông tin */}
              <div className="tku-courses-hub-hero__main">
                <div className="tku-courses-hub-hero__tag-wrap">
                  <span className="tku-courses-hub-hero__tag">
                    <Bell size={14} />
                    <span>TRUNG TÂM THÔNG BÁO HỌC TẬP</span>
                  </span>
                  <span className="tku-courses-hub-hero__subtag">
                    Cập nhật trực tiếp từ Giảng viên
                  </span>
                </div>

                <h1 className="tku-courses-hub-hero__title">
                  Trung tâm thông báo học tập
                </h1>

                <p className="tku-courses-hub-hero__desc">
                  Cập nhật kịp thời mọi phản hồi thảo luận bài học, bài kiểm tra mới và tin tức quan trọng từ giảng viên.
                </p>
              </div>

              {/* Cột Phải: 4 Thẻ Thống Kê Học Thuật Glassmorphism */}
              <div className="tku-courses-hub-stats-grid">
                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--blue">
                    <Bell size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{notifications.length}</span>
                    <span className="tku-hub-glass-card__lbl">Tổng thông báo</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--amber">
                    <Sparkles size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{unreadCount}</span>
                    <span className="tku-hub-glass-card__lbl">Cần xem ngay</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--emerald">
                    <FileCheck size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{examCount}</span>
                    <span className="tku-hub-glass-card__lbl">Bài kiểm tra</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--purple">
                    <MessageSquare size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{qaCount}</span>
                    <span className="tku-hub-glass-card__lbl">Hỏi đáp & Thảo luận</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            2. BODY CONTENT (ĐỒNG BỘ 100% CONTAINER & BỘ LỌC)
            ================================================================ */}
        <div className="tku-container tku-notif-container">
          {/* Thanh công cụ: Tabs phân loại + Nút Đánh dấu tất cả đã đọc */}
          <div className="tku-notif-toolbar">
            <div className="tku-notif-tabs" role="tablist" aria-label="Phân loại thông báo">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ALL'}
                onClick={() => setActiveTab('ALL')}
                className={`tku-notif-tab ${activeTab === 'ALL' ? 'is-active' : ''}`}
              >
                <Sparkles size={14} />
                <span>Tất cả</span>
                <span className="tku-notif-tab__badge">{notifications.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'UNREAD'}
                onClick={() => setActiveTab('UNREAD')}
                className={`tku-notif-tab ${activeTab === 'UNREAD' ? 'is-active' : ''}`}
              >
                <Bell size={14} />
                <span>Chưa đọc</span>
                {unreadCount > 0 && (
                  <span className="tku-notif-tab__badge tku-notif-tab__badge--unread">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'EXAM'}
                onClick={() => setActiveTab('EXAM')}
                className={`tku-notif-tab ${activeTab === 'EXAM' ? 'is-active' : ''}`}
              >
                <FileCheck size={14} />
                <span>Bài kiểm tra</span>
                <span className="tku-notif-tab__badge">{examCount}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'QA'}
                onClick={() => setActiveTab('QA')}
                className={`tku-notif-tab ${activeTab === 'QA' ? 'is-active' : ''}`}
              >
                <MessageSquare size={14} />
                <span>Hỏi đáp & Thảo luận</span>
                <span className="tku-notif-tab__badge">{qaCount}</span>
              </button>
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
                  <Loader2 size={15} className="tku-notif-spinner" />
                ) : (
                  <CheckCheck size={15} />
                )}
                <span>Đánh dấu tất cả đã đọc</span>
              </button>
            )}
          </div>

          {/* Danh sách thông báo */}
          {isLoading ? (
            <div className="tku-notif-loading-box">
              <Loader2 size={32} className="tku-notif-spinner" />
              <span>Đang tải thông báo học tập...</span>
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
                  ? 'Tuyệt vời! Hiện không còn thông báo học tập nào chưa được xử lý.'
                  : 'Mọi thông báo về bài kiểm tra mới và phản hồi câu hỏi sẽ hiển thị tại đây.'}
              </p>
            </div>
          ) : (
            <div className="tku-notif-list">
              {filteredNotifications.map((item) => {
                const category = getNotificationCategory(item);
                return (
                  <article
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
                    aria-label={`Thông báo: ${item.title}`}
                  >
                    {/* Icon danh mục */}
                    <div className="tku-notif-card__icon-col">
                      {renderCategoryIcon(category)}
                    </div>

                    {/* Nội dung thông báo */}
                    <div className="tku-notif-card__body">
                      <div className="tku-notif-card__meta-row">
                        <div className="tku-notif-card__badges">
                          <span className={`tku-notif-cat-badge is-${category.toLowerCase()}`}>
                            {category === 'EXAM'
                              ? 'Bài kiểm tra'
                              : category === 'QA'
                              ? 'Hỏi đáp & Thảo luận'
                              : 'Tin học vụ'}
                          </span>
                          {!item.isRead && (
                            <span className="tku-notif-status-badge">
                              <span className="tku-notif-unread-dot" />
                              Mới
                            </span>
                          )}
                        </div>

                        <span className="tku-notif-card__time">
                          <Clock size={12} />
                          <span>{formatRelativeTime(item.createdAt)}</span>
                        </span>
                      </div>

                      <h3 className="tku-notif-card__title">
                        {item.title}
                      </h3>

                      <p className="tku-notif-card__content">
                        {item.content}
                      </p>

                      <div className="tku-notif-card__footer">
                        <span className="tku-notif-card__action-text">
                          {category === 'EXAM'
                            ? 'Vào làm bài kiểm tra'
                            : category === 'QA'
                            ? 'Xem phản hồi thảo luận'
                            : 'Xem chi tiết'}
                        </span>
                        <ArrowRight size={14} className="tku-notif-card__arrow" />
                      </div>
                    </div>

                    {/* Chevron icon ở góc phải */}
                    <div className="tku-notif-card__arrow-col" aria-hidden="true">
                      <ChevronRight size={18} className="tku-notif-card__chevron" />
                    </div>
                  </article>
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
