import {
  AlertCircle,
  Award,
  Clock,
  CornerDownRight,
  GraduationCap,
  Loader2,
  MessageSquare,
  Pin,
  Play,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/useAuth';
import { toast } from '../../../context/useToast';
import {
  courseService,
  type LessonCommentItem,
} from '../../../services/course.service';

interface LessonDiscussionPaneProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  getCurrentVideoTime: () => number;
  hasVideo: boolean;
  onSeekToTimestamp: (seconds: number) => void;
  isCourseTeacher: boolean;
}

const formatVideoTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
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
    return dateStr;
  }
};

const getInitials = (name?: string | null): string => {
  if (!name) return 'HV';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const LessonDiscussionPane: React.FC<LessonDiscussionPaneProps> = React.memo(({
  courseId,
  lessonId,
  lessonTitle,
  getCurrentVideoTime,
  hasVideo,
  onSeekToTimestamp,
  isCourseTeacher,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canModerate = isCourseTeacher || isAdmin;

  // Comments state
  const [comments, setComments] = useState<LessonCommentItem[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Filters & Search
  const [filter, setFilter] = useState<'ALL' | 'TIMESTAMP'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Question composer
  const [newQuestionText, setNewQuestionText] = useState<string>('');
  const [attachedTimestamp, setAttachedTimestamp] = useState<number | null>(null);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState<boolean>(false);

  // Reply composer
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [replyTimestamp, setReplyTimestamp] = useState<number | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);

  // Action loadings
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Load comments
  useEffect(() => {
    let isMounted = true;

    const loadComments = async () => {
      try {
        const res = await courseService.getLessonComments(courseId, lessonId);
        if (!isMounted) return;
        setComments(res.comments || []);
        setTotalQuestions(res.totalQuestions || 0);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Không thể tải thảo luận bài học.';
        setError(msg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadComments();

    return () => {
      isMounted = false;
    };
  }, [courseId, lessonId, refreshTrigger]);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Submit new question with optimistic update
  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) {
      toast.error('Vui lòng nhập nội dung câu hỏi thảo luận.');
      return;
    }
    if (!user) {
      toast.error('Vui lòng đăng nhập để đặt câu hỏi thảo luận.');
      return;
    }

    setIsSubmittingQuestion(true);
    try {
      const created = await courseService.createLessonComment(courseId, lessonId, {
        content: newQuestionText.trim(),
        videoTimestamp: attachedTimestamp,
      });

      toast.success('Đã gửi bình luận thành công!');
      setNewQuestionText('');
      setAttachedTimestamp(null);
      // Tối ưu hóa UI: Cập nhật trực tiếp vào danh sách không cần đợi refetch
      setComments((prev) => [{ ...created, replies: [], replyCount: 0 }, ...prev]);
      setTotalQuestions((prev) => prev + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi câu hỏi.';
      toast.error(msg);
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  // Submit reply with optimistic update
  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi.');
      return;
    }
    if (!user) {
      toast.error('Vui lòng đăng nhập để trả lời.');
      return;
    }

    setIsSubmittingReply(true);
    try {
      const created = await courseService.createLessonComment(courseId, lessonId, {
        parentId,
        content: replyText.trim(),
        videoTimestamp: replyTimestamp,
      });

      toast.success('Đã gửi phản hồi thành công!');
      setActiveReplyId(null);
      setReplyText('');
      setReplyTimestamp(null);
      // Tối ưu hóa UI: Thêm phản hồi mới trực tiếp vào câu hỏi cha
      setComments((prev) =>
        prev.map((q) => {
          if (q.id === parentId) {
            const nextReplies = [...(q.replies || []), created];
            return {
              ...q,
              replies: nextReplies,
              replyCount: nextReplies.length,
            };
          }
          return q;
        }),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi phản hồi.';
      toast.error(msg);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Toggle pin with optimistic update & rollback on error
  const handleTogglePin = async (commentId: string, currentPinned: boolean) => {
    if (!canModerate) {
      toast.error('Bạn không có quyền thao tác ghim câu trả lời này.');
      return;
    }

    setActionLoadingId(commentId);
    // Optimistic local update
    setComments((prev) =>
      prev.map((q) => {
        if (q.id === commentId) {
          return { ...q, isPinned: !currentPinned };
        }
        return {
          ...q,
          replies: q.replies?.map((r) =>
            r.id === commentId ? { ...r, isPinned: !currentPinned } : r,
          ),
        };
      }),
    );

    try {
      await courseService.togglePinComment(courseId, lessonId, commentId);
      toast.success(
        currentPinned
          ? 'Đã bỏ ghim câu trả lời.'
          : 'Đã ghim câu trả lời chuẩn xác lên đầu!',
      );
    } catch (err) {
      // Revert if error
      setComments((prev) =>
        prev.map((q) => {
          if (q.id === commentId) {
            return { ...q, isPinned: currentPinned };
          }
          return {
            ...q,
            replies: q.replies?.map((r) =>
              r.id === commentId ? { ...r, isPinned: currentPinned } : r,
            ),
          };
        }),
      );
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật ghim.';
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete comment (xóa trực tiếp và hiển thị thông báo toast)
  const handleDeleteComment = async (commentId: string, parentId?: string) => {
    setActionLoadingId(commentId);
    try {
      await courseService.deleteLessonComment(courseId, lessonId, commentId);
      toast.success('Đã xóa bình luận thành công!');

      setComments((prev) => {
        if (!parentId) {
          // Xóa câu hỏi gốc
          return prev.filter((q) => q.id !== commentId);
        }
        // Xóa phản hồi con trong câu hỏi gốc
        return prev.map((q) => {
          if (q.id === parentId) {
            const nextReplies = (q.replies || []).filter((r) => r.id !== commentId);
            return {
              ...q,
              replies: nextReplies,
              replyCount: nextReplies.length,
            };
          }
          return q;
        });
      });

      if (!parentId) {
        setTotalQuestions((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa bình luận.';
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered comments
  const filteredComments = useMemo(() => {
    let result = [...comments];

    if (filter === 'TIMESTAMP') {
      result = result.filter((c) => c.videoTimestamp !== null && c.videoTimestamp !== undefined);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.content.toLowerCase().includes(q) ||
          c.user.fullName.toLowerCase().includes(q) ||
          (c.replies &&
            c.replies.some(
              (r) =>
                r.content.toLowerCase().includes(q) ||
                r.user.fullName.toLowerCase().includes(q),
            )),
      );
    }

    return result;
  }, [comments, filter, searchQuery]);

  return (
    <div className="tku-discussion">
      {/* 1. KHUNG ĐẶT CÂU HỎI MỚI (QUESTION COMPOSER) */}
      <div className="tku-discussion__composer">
        <div className="tku-discussion__composer-header">
          <span className="tku-discussion__composer-title">
            <Sparkles size={14} />
            <span>Thảo luận & Bình luận bài học</span>
          </span>

          {hasVideo && (
            <button
              type="button"
              className={`tku-discussion__timestamp-btn ${
                attachedTimestamp !== null ? 'is-attached' : ''
              }`}
              onClick={() => {
                if (attachedTimestamp !== null) {
                  setAttachedTimestamp(null);
                } else {
                  const currentSec = Math.floor(getCurrentVideoTime());
                  setAttachedTimestamp(currentSec);
                  toast.success(
                    `Đã gắn mốc video [${formatVideoTime(currentSec)}] vào câu hỏi!`,
                    { duration: 2000 },
                  );
                }
              }}
              title="Gắn mốc thời gian video hiện tại để hỏi đúng ngữ cảnh bài giảng"
            >
              <Clock size={13} />
              {attachedTimestamp !== null ? (
                <>
                  <span>Gắn mốc [{formatVideoTime(attachedTimestamp)}]</span>
                  <X size={12} className="tku-discussion__remove-time-icon" />
                </>
              ) : (
                <span>Gắn mốc video hiện tại</span>
              )}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmitQuestion}>
          <textarea
            className="tku-discussion__textarea"
            rows={3}
            placeholder={
              attachedTimestamp !== null
                ? `Nhập câu hỏi của bạn tại mốc [${formatVideoTime(
                    attachedTimestamp,
                  )}] (ví dụ: Tại sao phản ứng ở đoạn này lại tạo kết tủa?)...`
                : 'Bạn có thắc mắc gì về bài học này? Nhập câu hỏi rõ ràng để cùng trao đổi nhé...'
            }
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            disabled={isSubmittingQuestion}
          />

          <div className="tku-discussion__composer-footer">
            <div className="tku-discussion__composer-tip">
              {attachedTimestamp !== null && (
                <span className="tku-discussion__attached-chip">
                  <Play size={10} />
                  <span>Mốc video: {formatVideoTime(attachedTimestamp)}</span>
                </span>
              )}
            </div>

            <button
              type="submit"
              className="tku-learning-btn tku-learning-btn--primary tku-discussion__submit-btn"
              disabled={isSubmittingQuestion || !newQuestionText.trim()}
            >
              {isSubmittingQuestion ? (
                <>
                  <Loader2 size={14} className="tku-learning-spinner" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Gửi bình luận</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. THANH TÌM KIẾM VÀ BỘ LỌC CÂU HỎI */}
      <div className="tku-discussion__toolbar">
        <div className="tku-discussion__filters">
          <button
            type="button"
            className={`tku-discussion__filter-btn ${filter === 'ALL' ? 'is-active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            <span>Tất cả</span>
            {totalQuestions > 0 && (
              <span className="tku-discussion__filter-badge">{totalQuestions}</span>
            )}
          </button>
          {hasVideo && (
            <button
              type="button"
              className={`tku-discussion__filter-btn ${
                filter === 'TIMESTAMP' ? 'is-active' : ''
              }`}
              onClick={() => setFilter('TIMESTAMP')}
            >
              <Clock size={12} />
              <span>Gắn mốc video</span>
            </button>
          )}
        </div>

        <div className="tku-discussion__search-box">
          <Search size={14} className="tku-discussion__search-icon" />
          <input
            type="text"
            className="tku-discussion__search-input"
            placeholder="Tìm kiếm thảo luận..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="tku-discussion__search-clear"
              onClick={() => setSearchQuery('')}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 3. TRẠNG THÁI TẢI VÀ LỖI */}
      {isLoading && (
        <div className="tku-discussion__loading">
          <Loader2 size={24} className="tku-learning-spinner" />
          <span>Đang tải các cuộc thảo luận của bài học...</span>
        </div>
      )}

      {error && !isLoading && (
        <div className="tku-discussion__error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="tku-discussion__retry-btn"
          >
            <RotateCcw size={12} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* 4. DANH SÁCH CÂU HỎI & PHẢN HỒI PHÂN CẤP */}
      {!isLoading && !error && filteredComments.length === 0 && (
        <div className="tku-discussion__empty">
          <div className="tku-discussion__empty-icon">
            <MessageSquare size={32} />
          </div>
          <h4 className="tku-discussion__empty-title">
            {searchQuery || filter !== 'ALL'
              ? 'Không tìm thấy thảo luận phù hợp'
              : 'Chưa có bình luận nào cho bài học này'}
          </h4>
          <p className="tku-discussion__empty-desc">
            {searchQuery || filter !== 'ALL'
              ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc "Tất cả" để xem các thảo luận khác.'
              : `Hãy là người đầu tiên đặt câu hỏi về bài giảng "${lessonTitle}" để cùng thảo luận với giáo viên và các bạn học!`}
          </p>
        </div>
      )}

      {!isLoading && !error && filteredComments.length > 0 && (
        <div className="tku-discussion__list">
          {filteredComments.map((question) => {
            const replies = question.replies || [];

            return (
              <article
                key={question.id}
                className={`tku-discussion__card ${question.isPinned ? 'is-pinned' : ''}`}
              >
                {/* ROOT QUESTION HEADER */}
                <div className="tku-discussion__card-header">
                  <div className="tku-discussion__author">
                    {question.user.avatarUrl ? (
                      <img
                        src={question.user.avatarUrl}
                        alt={question.user.fullName}
                        className="tku-discussion__avatar"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="tku-discussion__avatar-fallback">
                        {getInitials(question.user.fullName)}
                      </div>
                    )}

                    <div className="tku-discussion__author-meta">
                      <div className="tku-discussion__author-top">
                        <span className="tku-discussion__author-name">
                          {question.user.fullName}
                        </span>

                        {question.user.role === 'TEACHER' && (
                          <span className="tku-discussion__role-badge tku-discussion__role-badge--teacher">
                            <GraduationCap size={11} />
                            <span>Giảng viên</span>
                          </span>
                        )}
                        {question.user.role === 'ADMIN' && (
                          <span className="tku-discussion__role-badge tku-discussion__role-badge--admin">
                            <ShieldCheck size={11} />
                            <span>Quản trị viên</span>
                          </span>
                        )}

                        {question.isPinned && (
                          <span className="tku-discussion__pinned-badge">
                            <Pin size={11} />
                            <span>Đã ghim</span>
                          </span>
                        )}
                      </div>

                      <div className="tku-discussion__post-time">
                        {formatRelativeTime(question.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* VIDEO TIMESTAMP CHIP (BẤM VÀO ĐỂ NHẢY VIDEO) */}
                  {question.videoTimestamp !== null &&
                    question.videoTimestamp !== undefined && (
                      <button
                        type="button"
                        className="tku-discussion__time-pill"
                        onClick={() => onSeekToTimestamp(question.videoTimestamp!)}
                        title={`Bấm để xem video tại đoạn ${formatVideoTime(
                          question.videoTimestamp,
                        )}`}
                      >
                        <Play size={11} className="tku-discussion__time-play-icon" />
                        <span>[{formatVideoTime(question.videoTimestamp)}]</span>
                      </button>
                    )}
                </div>

                {/* ROOT QUESTION CONTENT */}
                <div className="tku-discussion__card-content">
                  <p>{question.content}</p>
                </div>

                {/* ROOT QUESTION ACTIONS */}
                <div className="tku-discussion__card-actions">
                  <button
                    type="button"
                    className="tku-discussion__action-btn tku-discussion__action-btn--reply"
                    onClick={() => {
                      if (activeReplyId === question.id) {
                        setActiveReplyId(null);
                      } else {
                        setActiveReplyId(question.id);
                        setReplyText('');
                        setReplyTimestamp(null);
                      }
                    }}
                  >
                    <CornerDownRight size={13} />
                    <span>
                      Trả lời {replies.length > 0 ? `(${replies.length})` : ''}
                    </span>
                  </button>

                  {canModerate && (
                    <button
                      type="button"
                      className={`tku-discussion__action-btn ${
                        question.isPinned ? 'is-active-pin' : ''
                      }`}
                      onClick={() => handleTogglePin(question.id, question.isPinned)}
                      disabled={actionLoadingId === question.id}
                      title={question.isPinned ? 'Bỏ ghim câu hỏi' : 'Ghim câu hỏi lên đầu'}
                    >
                      <Pin size={13} />
                      <span>{question.isPinned ? 'Bỏ ghim' : 'Ghim câu hỏi'}</span>
                    </button>
                  )}

                  {(canModerate || user?.id === question.userId) && (
                    <button
                      type="button"
                      className="tku-discussion__action-btn tku-discussion__action-btn--delete"
                      onClick={() => handleDeleteComment(question.id)}
                      disabled={actionLoadingId === question.id}
                      title="Xóa câu hỏi thảo luận"
                    >
                      <Trash2 size={13} />
                      <span>Xóa</span>
                    </button>
                  )}
                </div>

                {/* NESTED REPLIES THREAD */}
                {replies.length > 0 && (
                  <div className="tku-discussion__replies">
                    {replies.map((reply) => {
                      const isTeacherReply = reply.user.role === 'TEACHER';
                      const isPinnedSolution = reply.isPinned;

                      return (
                        <div
                          key={reply.id}
                          className={`tku-discussion__reply-card ${
                            isPinnedSolution ? 'is-solution' : ''
                          }`}
                        >
                          {/* BANNER NẾU LÀ CÂU TRẢ LỜI CHUẨN XÁC ĐÃ ĐƯỢC GHIM */}
                          {isPinnedSolution && (
                            <div className="tku-discussion__solution-header">
                              <Award size={13} />
                              <span>Lời giải từ Giảng viên (Đã ghim)</span>
                            </div>
                          )}

                          <div className="tku-discussion__reply-top">
                            <div className="tku-discussion__author">
                              {reply.user.avatarUrl ? (
                                <img
                                  src={reply.user.avatarUrl}
                                  alt={reply.user.fullName}
                                  className="tku-discussion__avatar tku-discussion__avatar--sm"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="tku-discussion__avatar-fallback tku-discussion__avatar-fallback--sm">
                                  {getInitials(reply.user.fullName)}
                                </div>
                              )}

                              <div className="tku-discussion__author-meta">
                                <div className="tku-discussion__author-top">
                                  <span className="tku-discussion__author-name">
                                    {reply.user.fullName}
                                  </span>

                                  {isTeacherReply && (
                                    <span className="tku-discussion__role-badge tku-discussion__role-badge--teacher">
                                      <GraduationCap size={10} />
                                      <span>Giảng viên</span>
                                    </span>
                                  )}
                                  {reply.user.role === 'ADMIN' && (
                                    <span className="tku-discussion__role-badge tku-discussion__role-badge--admin">
                                      <ShieldCheck size={10} />
                                      <span>Quản trị viên</span>
                                    </span>
                                  )}
                                  {reply.userId === question.userId && !isTeacherReply && (
                                    <span className="tku-discussion__role-badge tku-discussion__role-badge--author">
                                      Người hỏi
                                    </span>
                                  )}
                                </div>

                                <div className="tku-discussion__post-time">
                                  {formatRelativeTime(reply.createdAt)}
                                </div>
                              </div>
                            </div>

                            {/* TIMESTAMP TRONG REPLY NẾU CÓ */}
                            {reply.videoTimestamp !== null &&
                              reply.videoTimestamp !== undefined && (
                                <button
                                  type="button"
                                  className="tku-discussion__time-pill tku-discussion__time-pill--sm"
                                  onClick={() => onSeekToTimestamp(reply.videoTimestamp!)}
                                  title={`Xem video tại đoạn ${formatVideoTime(
                                    reply.videoTimestamp,
                                  )}`}
                                >
                                  <Play size={10} />
                                  <span>[{formatVideoTime(reply.videoTimestamp)}]</span>
                                </button>
                              )}
                          </div>

                          <div className="tku-discussion__reply-content">
                            <p>{reply.content}</p>
                          </div>

                          {/* REPLY ACTIONS */}
                          <div className="tku-discussion__reply-actions">
                            {canModerate && (
                              <button
                                type="button"
                                className={`tku-discussion__pin-solution-btn ${
                                  isPinnedSolution ? 'is-pinned-solution' : ''
                                }`}
                                onClick={() => handleTogglePin(reply.id, reply.isPinned)}
                                disabled={actionLoadingId === reply.id}
                                title={
                                  isPinnedSolution
                                    ? 'Hủy ghim câu trả lời'
                                    : 'Ghim câu trả lời lên đầu'
                                }
                              >
                                <Award size={12} />
                                <span>
                                  {isPinnedSolution
                                    ? 'Bỏ ghim'
                                    : 'Ghim câu trả lời'}
                                </span>
                              </button>
                            )}

                            {(canModerate || user?.id === reply.userId) && (
                              <button
                                type="button"
                                className="tku-discussion__delete-reply-btn"
                                onClick={() => handleDeleteComment(reply.id, question.id)}
                                disabled={actionLoadingId === reply.id}
                                title="Xóa phản hồi"
                              >
                                <Trash2 size={12} />
                                <span>Xóa</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* INLINE REPLY FORM */}
                {activeReplyId === question.id && (
                  <div className="tku-discussion__reply-form-box">
                    <div className="tku-discussion__reply-form-header">
                      <span className="tku-discussion__reply-to-text">
                        Trả lời thảo luận của{' '}
                        <strong>{question.user.fullName}</strong>
                      </span>

                      {hasVideo && (
                        <button
                          type="button"
                          className={`tku-discussion__timestamp-btn tku-discussion__timestamp-btn--sm ${
                            replyTimestamp !== null ? 'is-attached' : ''
                          }`}
                          onClick={() => {
                            if (replyTimestamp !== null) {
                              setReplyTimestamp(null);
                            } else {
                              const currentSec = Math.floor(getCurrentVideoTime());
                              setReplyTimestamp(currentSec);
                              toast.success(
                                `Đã gắn mốc video [${formatVideoTime(currentSec)}] vào câu trả lời!`,
                                { duration: 2000 },
                              );
                            }
                          }}
                          title="Gắn mốc thời gian video hiện tại"
                        >
                          <Clock size={11} />
                          {replyTimestamp !== null ? (
                            <>
                              <span>Mốc [{formatVideoTime(replyTimestamp)}]</span>
                              <X size={10} />
                            </>
                          ) : (
                            <span>Gắn mốc video hiện tại</span>
                          )}
                        </button>
                      )}
                    </div>

                    <textarea
                      className="tku-discussion__textarea tku-discussion__textarea--reply"
                      rows={2}
                      placeholder="Nhập nội dung phản hồi của bạn..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={isSubmittingReply}
                    />

                    <div className="tku-discussion__reply-form-footer">
                      <button
                        type="button"
                        className="tku-learning-btn tku-learning-btn--secondary tku-discussion__reply-cancel-btn"
                        onClick={() => {
                          setActiveReplyId(null);
                          setReplyText('');
                          setReplyTimestamp(null);
                        }}
                      >
                        Hủy
                      </button>

                      <button
                        type="button"
                        className="tku-learning-btn tku-learning-btn--primary tku-discussion__reply-submit-btn"
                        onClick={() => handleSubmitReply(question.id)}
                        disabled={isSubmittingReply || !replyText.trim()}
                      >
                        {isSubmittingReply ? (
                          <>
                            <Loader2 size={12} className="tku-learning-spinner" />
                            <span>Đang gửi...</span>
                          </>
                        ) : (
                          <>
                            <Send size={12} />
                            <span>Gửi trả lời</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
});

LessonDiscussionPane.displayName = 'LessonDiscussionPane';
