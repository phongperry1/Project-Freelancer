import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  CornerDownRight,
  GraduationCap,
  Inbox,
  Loader2,
  MessageSquare,
  Pin,
  Play,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '../../context/useToast';
import {
  lecturerService,
  type LecturerDiscussionQuestion,
} from '../../services/lecturer.service';
import { courseService } from '../../services/course.service';
import { notificationService } from '../../services/notification.service';
import './lecturerDiscussions.css';

const formatVideoTime = (seconds?: number | null): string => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

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

const getInitials = (name?: string): string => {
  if (!name) return 'HS';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const LecturerDiscussionsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryCourseId = searchParams.get('courseId');
  const queryCommentId = searchParams.get('commentId');

  // State
  const [questions, setQuestions] = useState<LecturerDiscussionQuestion[]>([]);
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    unansweredCount: 0,
    answeredCount: 0,
    timestampedCount: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [userSelectedCourseId, setUserSelectedCourseId] = useState<string | null>(null);
  const [prevQueryCourseId, setPrevQueryCourseId] = useState<string | null>(queryCourseId);

  if (queryCourseId !== prevQueryCourseId) {
    setPrevQueryCourseId(queryCourseId);
    setUserSelectedCourseId(null);
  }

  const selectedCourseId = userSelectedCourseId ?? queryCourseId ?? 'all';
  const setSelectedCourseId = (id: string) => {
    setIsLoading(true);
    setUserSelectedCourseId(id);
  };

  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'UNANSWERED' | 'ANSWERED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Highlight state: quản lý ID câu hỏi hoặc câu trả lời được click từ thông báo
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(() => queryCommentId);
  const [prevQueryCommentId, setPrevQueryCommentId] = useState<string | null>(queryCommentId);
  const lastScrolledTargetRef = useRef<string | null>(null);

  if (queryCommentId !== prevQueryCommentId) {
    setPrevQueryCommentId(queryCommentId);
    if (queryCommentId) {
      setHighlightedCommentId(queryCommentId);
    }
  }

  // Reply inline composer
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
  const [pinningId, setPinningId] = useState<string | null>(null);

  // Check if any filter is active
  const isFiltered =
    searchQuery.trim() !== '' || selectedCourseId !== 'all' || selectedStatus !== 'ALL';

  // Filter change tracking handled in loadDiscussions / useEffect

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Tự động đồng bộ thời gian thực (Real-time Auto-Sync):
  // 1) Khi tải trang lần đầu (isLoading đã khởi tạo true)
  // 2) Tự động quét ngầm mỗi 8 giây (silent refresh, chỉ quét khi tab đang mở)
  // 3) Khi chuyển tab quay lại cửa sổ
  // 4) Khi chuông thông báo phát hiện có bình luận mới
  useEffect(() => {
    let isMounted = true;

    const fetchDiscussions = async () => {
      try {
        const res = await lecturerService.getLecturerDiscussions({
          courseId: selectedCourseId !== 'all' ? selectedCourseId : undefined,
          status: selectedStatus,
          search: searchQuery.trim() || undefined,
        });

        if (isMounted) {
          setQuestions(res.questions || []);
          setStats(
            res.stats || {
              totalQuestions: 0,
              unansweredCount: 0,
              answeredCount: 0,
              timestampedCount: 0,
            }
          );
          setCourses(res.courses || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Không thể tải danh sách thảo luận.';
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDiscussions();

    const interval = setInterval(() => {
      if (document.hidden) return;
      if (isMounted) {
        fetchDiscussions();
      }
    }, 8000);

    const handleFocus = () => {
      if (isMounted && !document.hidden) {
        fetchDiscussions();
      }
    };
    window.addEventListener('focus', handleFocus);

    const handleNewNotif = () => {
      if (isMounted) {
        fetchDiscussions();
      }
    };
    window.addEventListener('tku:new-notification', handleNewNotif);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('tku:new-notification', handleNewNotif);
    };
  }, [selectedCourseId, selectedStatus, searchQuery, refreshTrigger]);

  // Khi có queryCommentId (từ URL khi click thông báo):
  // Xóa ngay param commentId khỏi URL trên thanh địa chỉ bằng window.history.replaceState
  // để khi người dùng F5 / reload lại trang thì URL sạch sẽ, KHÔNG bị tự động nhảy lại xuống bình luận đó nữa!
  useEffect(() => {
    if (queryCommentId) {
      lastScrolledTargetRef.current = null;
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('commentId')) {
          url.searchParams.delete('commentId');
          window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
        }
      } catch {
        // Bỏ qua lỗi URL replaceState nếu không hỗ trợ
      }
    }
  }, [queryCommentId]);

  // Tự động cuộn đến câu hỏi hoặc phản hồi được chọn từ thông báo (chỉ cuộn 1 lần cho mỗi ID)
  useEffect(() => {
    if (highlightedCommentId && questions.length > 0 && lastScrolledTargetRef.current !== highlightedCommentId) {
      lastScrolledTargetRef.current = highlightedCommentId;
      const timer = setTimeout(() => {
        const el =
          document.getElementById(`comment-${highlightedCommentId}`) ||
          document.getElementById(`question-${highlightedCommentId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Tự động gỡ bỏ viền highlight sau 3.5 giây để trả lại giao diện bình thường
        setTimeout(() => {
          setHighlightedCommentId(null);
        }, 3500);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [highlightedCommentId, questions]);

  // Tự động kiểm tra và đánh dấu đã đọc thông báo liên quan đến câu hỏi đang xem
  useEffect(() => {
    const targetId = queryCommentId || highlightedCommentId;
    if (targetId) {
      notificationService
        .getNotifications(20)
        .then(async (res) => {
          const unreadTargets = (res.notifications || []).filter(
            (n) => !n.isRead && n.targetUrl && n.targetUrl.includes(targetId)
          );
          if (unreadTargets.length > 0) {
            await Promise.all(
              unreadTargets.map((notif) => notificationService.markAsRead(notif.id))
            );
            window.dispatchEvent(
              new CustomEvent('tku:notification-read', { detail: { id: targetId } })
            );
          }
        })
        .catch(() => {});
    }
  }, [queryCommentId, highlightedCommentId]);

  const resetFilters = useCallback(() => {
    setSelectedCourseId('all');
    setSelectedStatus('ALL');
    setSearchQuery('');
  }, []);

  // Handle Reply
  const handleSendReply = async (question: LecturerDiscussionQuestion) => {
    const text = (replyTextMap[question.id] || '').trim();
    if (!text) {
      toast.error('Vui lòng nhập nội dung câu trả lời.');
      return;
    }

    setSubmittingReplyId(question.id);
    try {
      await lecturerService.replyDiscussion(
        question.course.id,
        question.lesson.id,
        question.id,
        text,
        null
      );
      toast.success('Đã gửi phản hồi thành công và thông báo tới học sinh!');
      // Clear reply box for this question
      setReplyTextMap((prev) => ({ ...prev, [question.id]: '' }));
      setActiveReplyId(null);
      // Reload discussions list
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi phản hồi.';
      toast.error(msg);
    } finally {
      setSubmittingReplyId(null);
    }
  };

  // Handle Pin/Unpin
  const handleTogglePin = async (
    question: LecturerDiscussionQuestion,
    commentId: string,
    currentPinned: boolean
  ) => {
    setPinningId(commentId);
    try {
      await courseService.togglePinComment(
        question.course.id,
        question.lesson.id,
        commentId
      );
      toast.success(currentPinned ? 'Đã bỏ ghim câu trả lời.' : 'Đã ghim câu trả lời chuẩn xác!');
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Thao tác ghim thất bại.';
      toast.error(msg);
    } finally {
      setPinningId(null);
    }
  };

  return (
    <div className="tku-discussions-page">
      {/* 1. Academic Header Banner - Synchronized with Lecturer Assignments */}
      <section className="tku-assignments-banner">
        <div className="tku-assignments-banner__content">
          <div className="tku-banner-pill">
            <Sparkles size={14} />
            <span>Tương tác & Giải đáp học sinh</span>
          </div>
          <h1 className="tku-assignments-banner__title">
            Quản lý Hỏi đáp & Thảo luận bài học
          </h1>
          <p className="tku-assignments-banner__desc">
            Theo dõi, phản hồi kịp thời thắc mắc của học sinh trong các bài giảng video, ghim lời giải chuẩn xác và gửi thông báo trực tiếp đến học sinh.
          </p>
        </div>
      </section>

      {/* 2. Filter Bar - Synchronized with Assignments Filter Bar */}
      <section className="tku-discussions-filter-bar">
        <div className="tku-discussions-search-wrap">
          <Search size={18} className="tku-discussions-search-icon" />
          <input
            type="text"
            className="tku-discussions-search-input"
            placeholder="Tìm kiếm theo nội dung câu hỏi, tên học sinh, bài học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="tku-discussions-search-clear"
              onClick={() => setSearchQuery('')}
              title="Xóa tìm kiếm"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="tku-discussions-select-wrap">
          <select
            className="tku-discussions-select"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            <option value="all">Tất cả khóa học</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="tku-discussions-select-icon" />
        </div>

        <div className="tku-discussions-select-wrap">
          <select
            className="tku-discussions-select"
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value as 'ALL' | 'UNANSWERED' | 'ANSWERED')
            }
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="UNANSWERED">Chờ giải đáp ({stats.unansweredCount})</option>
            <option value="ANSWERED">Đã phản hồi ({stats.answeredCount})</option>
          </select>
          <ChevronDown size={16} className="tku-discussions-select-icon" />
        </div>

        {isFiltered && (
          <button
            type="button"
            className="tku-discussions-reset-btn"
            onClick={resetFilters}
            title="Đặt lại bộ lọc"
          >
            <RotateCcw size={15} />
            <span>Đặt lại</span>
          </button>
        )}
      </section>

      {/* 4. DISCUSSIONS LIST */}
      <section className="tku-discussions-list-container">
        {isLoading ? (
          <div className="tku-discussions-loading">
            <Loader2 size={36} className="tku-spin" />
            <p>Đang tải danh sách câu hỏi thảo luận...</p>
          </div>
        ) : error ? (
          <div className="tku-discussions-error">
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
        ) : questions.length === 0 ? (
          <div className="tku-discussions-empty">
            <div className="tku-discussions-empty-icon">
              <Inbox size={40} />
            </div>
            <h3>Không tìm thấy câu hỏi nào</h3>
            <p>
              {selectedStatus === 'UNANSWERED'
                ? 'Tuyệt vời! Hiện không còn câu hỏi nào đang chờ bạn giải đáp.'
                : 'Chưa có câu hỏi thảo luận nào từ học sinh trong các khóa học này.'}
            </p>
            {isFiltered && (
              <button
                type="button"
                className="tku-discussions-reset-btn"
                style={{ marginTop: 8 }}
                onClick={resetFilters}
              >
                <RotateCcw size={15} />
                <span>Xóa bộ lọc để xem tất cả</span>
              </button>
            )}
          </div>
        ) : (
          <div className="tku-discussions-cards">
            {questions.map((q) => {
              const currentReplyText = replyTextMap[q.id] || '';
              const isReplying = submittingReplyId === q.id;

              return (
                <article
                  key={q.id}
                  id={`question-${q.id}`}
                  className={`tku-discussion-card ${
                    highlightedCommentId === q.id || q.replies.some((r) => r.id === highlightedCommentId)
                      ? 'is-target-highlighted'
                      : ''
                  }`}
                >
                  {/* Card Header */}
                  <div className="tku-discussion-card-header">
                    <div className="tku-discussion-author">
                      {q.student.avatarUrl ? (
                        <img
                          src={q.student.avatarUrl}
                          alt={q.student.fullName}
                          className="tku-discussion-avatar"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="tku-discussion-avatar-fallback">
                          {getInitials(q.student.fullName)}
                        </div>
                      )}
                      <div className="tku-discussion-author-meta">
                        <div className="tku-discussion-author-name-row">
                          <span className="tku-discussion-author-name">{q.student.fullName}</span>
                          <span className="tku-pill-role-student">Học sinh</span>
                        </div>
                        <div className="tku-discussion-context-row">
                          <span className="tku-discussion-time">
                            <Clock size={12.5} />
                            <span>{formatRelativeTime(q.createdAt)}</span>
                          </span>
                          <span className="tku-discussion-sep">•</span>
                          <span className="tku-discussion-course" title={q.course.title}>
                            <BookOpen size={12.5} />
                            <span>{q.course.title}</span>
                          </span>
                          <span className="tku-discussion-sep">•</span>
                          <span className="tku-discussion-lesson" title={q.lesson.title}>
                            {q.lesson.title}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="tku-discussion-header-badges">
                      {q.videoTimestamp !== null && q.videoTimestamp !== undefined && (
                        <span className="tku-pill-timestamp" title="Thảo luận tại mốc video">
                          <Play size={11} fill="currentColor" />
                          <span>Mốc [{formatVideoTime(q.videoTimestamp)}]</span>
                        </span>
                      )}

                      {q.hasTeacherReply ? (
                        <span className="tku-pill-status tku-pill-status--answered">
                          <CheckCircle2 size={13} />
                          <span>Đã phản hồi</span>
                        </span>
                      ) : (
                        <span className="tku-pill-status tku-pill-status--unanswered">
                          <Clock size={13} />
                          <span>Chờ giải đáp</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Content Body - Synchronized with Student Side */}
                  <div className="tku-discussion-question-body">
                    <p>{q.content}</p>
                  </div>

                  {/* Card Actions - Synchronized with Student Side */}
                  <div className="tku-discussion-card-actions">
                    <button
                      type="button"
                      className={`tku-discussion-action-btn tku-discussion-action-btn--reply ${
                        activeReplyId === q.id ? 'is-active' : ''
                      }`}
                      onClick={() => {
                        setActiveReplyId((prev) => (prev === q.id ? null : q.id));
                      }}
                    >
                      <CornerDownRight size={13} />
                      <span>
                        Trả lời {q.replies && q.replies.length > 0 ? `(${q.replies.length})` : ''}
                      </span>
                    </button>
                  </div>

                  {/* Nested Replies Section */}
                  {q.replies && q.replies.length > 0 && (
                    <div className="tku-discussion-replies-section">
                      <div className="tku-discussion-replies-heading">
                        <MessageSquare size={14} />
                        <span>Các phản hồi đã có ({q.replies.length}):</span>
                      </div>

                      <div className="tku-discussion-replies-list">
                        {q.replies.map((reply) => {
                          const isTeacher = reply.user.role === 'TEACHER';
                          const isAdmin = reply.user.role === 'ADMIN';

                          return (
                            <div
                              key={reply.id}
                              id={`comment-${reply.id}`}
                              className={`tku-discussion-reply-item ${
                                reply.isPinned ? 'is-pinned-solution' : ''
                              } ${isTeacher ? 'is-teacher' : ''} ${
                                highlightedCommentId === reply.id ? 'is-target-highlighted' : ''
                              }`}
                            >
                              <div className="tku-discussion-reply-header">
                                <div className="tku-discussion-reply-user">
                                  {reply.user.avatarUrl ? (
                                    <img
                                      src={reply.user.avatarUrl}
                                      alt={reply.user.fullName}
                                      className="tku-reply-avatar"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="tku-reply-avatar-fallback">
                                      {getInitials(reply.user.fullName)}
                                    </div>
                                  )}
                                  <span className="tku-reply-user-name">{reply.user.fullName}</span>
                                  {isTeacher && (
                                    <span className="tku-pill-role-teacher">
                                      <GraduationCap size={11} />
                                      <span>Giảng viên</span>
                                    </span>
                                  )}
                                  {isAdmin && (
                                    <span className="tku-pill-role-admin">
                                      <ShieldCheck size={11} />
                                      <span>Quản trị viên</span>
                                    </span>
                                  )}
                                  {reply.user.id === q.student.id && !isTeacher && (
                                    <span className="tku-pill-role-author">Người hỏi</span>
                                  )}
                                  {reply.isPinned && (
                                    <span className="tku-pill-pinned-solution">
                                      <Sparkles size={11} />
                                      <span>Lời giải chuẩn xác</span>
                                    </span>
                                  )}
                                </div>

                                <div className="tku-discussion-reply-meta-right">
                                  <span className="tku-reply-time">
                                    {formatRelativeTime(reply.createdAt)}
                                  </span>
                                  <button
                                    type="button"
                                    className={`tku-btn-pin-toggle ${
                                      reply.isPinned ? 'is-active' : ''
                                    }`}
                                    onClick={() => handleTogglePin(q, reply.id, reply.isPinned)}
                                    disabled={pinningId === reply.id}
                                    title={reply.isPinned ? 'Bỏ ghim lời giải này' : 'Ghim làm lời giải chuẩn xác'}
                                  >
                                    <Pin size={12} />
                                    <span>{reply.isPinned ? 'Đã ghim' : 'Ghim lời giải'}</span>
                                  </button>
                                </div>
                              </div>

                              <div className="tku-discussion-reply-body">
                                <p>{reply.content}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Inline Quick Reply Composer - Opens when clicking "Trả lời" */}
                  {activeReplyId === q.id && (
                    <div className="tku-discussion-reply-composer">
                      <div className="tku-discussion-composer-header">
                        <span className="tku-discussion-composer-reply-to">
                          Trả lời câu hỏi của <strong>{q.student.fullName}</strong>
                        </span>
                        <button
                          type="button"
                          className="tku-discussion-composer-close-btn"
                          onClick={() => setActiveReplyId(null)}
                          title="Đóng khung trả lời"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="tku-discussion-composer-input-row">
                        <textarea
                          className="tku-discussion-composer-textarea"
                          rows={3}
                          autoFocus
                          placeholder={`Trả lời câu hỏi của ${q.student.fullName}... (Học sinh sẽ nhận thông báo chuông ngay lập tức)`}
                          value={currentReplyText}
                          onChange={(e) =>
                            setReplyTextMap((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                              e.preventDefault();
                              if (currentReplyText.trim() && !isReplying) {
                                handleSendReply(q);
                              }
                            }
                          }}
                        />

                        <div className="tku-discussion-composer-actions">
                          <span className="tku-discussion-composer-tip">
                            <Sparkles size={13} />
                            <span>Nhấn Ctrl+Enter để gửi nhanh</span>
                          </span>

                          <div className="tku-discussion-composer-btn-group">
                            <button
                              type="button"
                              className="tku-btn-cancel-reply"
                              onClick={() => setActiveReplyId(null)}
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              className="tku-btn-send-reply"
                              disabled={!currentReplyText.trim() || isReplying}
                              onClick={() => handleSendReply(q)}
                            >
                              {isReplying ? (
                                <Loader2 size={14} className="tku-spin" />
                              ) : (
                                <Send size={14} />
                              )}
                              <span>{isReplying ? 'Đang gửi...' : 'Gửi lời giải'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default LecturerDiscussionsPage;
