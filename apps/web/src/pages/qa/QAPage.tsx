import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Clock,
  Award,
  Search,
  X,
  CheckCircle2,
  Send,
  HelpCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Plus,
  MessageCircle,
  User,
  GraduationCap,
  Pin,
  Trash2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { useAuth } from '../../context/useAuth';
import { toast } from '../../context/useToast';
import {
  courseService,
  type PublicDiscussionItem,
  type PublicCourseItem,
  type PublicCourseDetailResponse,
} from '../../services/course.service';
import '../course/coursesPage.css';
import './qaPage.css';

export type GradeTab = 'all' | 'exam' | '12' | '11' | '10' | 'other';
export type SubFilter = 'ALL' | 'ANSWERED' | 'WAITING' | 'MY_QUESTIONS';

const GRADE_TABS: Array<{ key: GradeTab; label: string }> = [
  { key: 'all', label: 'Tất cả câu hỏi' },
  { key: 'exam', label: 'Luyện thi THPT 9+' },
  { key: '12', label: 'Hóa học Lớp 12' },
  { key: '11', label: 'Hóa học Lớp 11' },
  { key: '10', label: 'Hóa học Lớp 10' },
  { key: 'other', label: 'Chuyên đề khác' },
];

const formatRelativeTime = (dateStr?: string | null): string => {
  if (!dateStr) return 'Vừa xong';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Vừa xong';
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

const formatVideoTimestamp = (seconds?: number | null): string => {
  if (typeof seconds !== 'number' || seconds < 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const parseVideoTimestamp = (str: string): number | null => {
  const clean = str.trim();
  if (!clean) return null;
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);
  const parts = clean.split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  return null;
};

const getInitials = (name?: string | null): string => {
  if (!name) return 'HS';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Phân loại khối lớp của câu hỏi dựa trên grade hoặc tiêu đề khóa học / bài giảng
 */
const getQuestionGrade = (item: PublicDiscussionItem): GradeTab => {
  const g = String(item.courseGrade || '').toLowerCase().trim();
  if (g === '10' || g === '11' || g === '12' || g === 'exam') {
    return g as GradeTab;
  }
  const text = `${item.courseTitle || ''} ${item.lessonTitle || ''}`.toLowerCase();
  if (
    text.includes('thpt') ||
    text.includes('đại học') ||
    text.includes('luyện thi') ||
    text.includes('quốc gia') ||
    text.includes('đgnl') ||
    text.includes('tsa')
  ) {
    return 'exam';
  }
  if (/\b(lớp\s*12|hóa\s*12|12)\b/i.test(text)) {
    return '12';
  }
  if (/\b(lớp\s*11|hóa\s*11|11)\b/i.test(text)) {
    return '11';
  }
  if (/\b(lớp\s*10|hóa\s*10|10)\b/i.test(text)) {
    return '10';
  }
  return 'other';
};

export const QAPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Danh sách toàn bộ câu hỏi thật từ API (Master List)
  const [allQuestions, setAllQuestions] = useState<PublicDiscussionItem[]>([]);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    answeredCount: 0,
    waitingCount: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Bộ lọc khối lớp & trạng thái
  const [activeTab, setActiveTab] = useState<GradeTab>('all');
  const [subFilter, setSubFilter] = useState<SubFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expand discussion threads & reply inputs
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({});

  // Ask Question Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [availableCourses, setAvailableCourses] = useState<PublicCourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseDetail, setCourseDetail] = useState<PublicCourseDetailResponse | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [questionContent, setQuestionContent] = useState<string>('');
  const [videoTimestampInput, setVideoTimestampInput] = useState<string>('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState<boolean>(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState<boolean>(false);

  // Set document title
  useEffect(() => {
    document.title = 'Hỏi đáp & Giải đáp Thắc mắc Hóa học | TKU E-Learning';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Fetch toàn bộ câu hỏi từ API một lần để tính toán bộ đếm chuẩn xác cho tất cả các tab
  const loadDiscussions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await courseService.getPublicDiscussions();
      const list = res?.questions || [];
      setAllQuestions(list);

      const total = list.length;
      const answered = list.filter((q) => q.replyCount > 0).length;
      const waiting = total - answered;

      setStats({
        totalQuestions: total,
        answeredCount: answered,
        waitingCount: waiting,
      });
    } catch {
      setAllQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    courseService
      .getPublicDiscussions()
      .then((res) => {
        if (!isMounted) return;
        const list = res?.questions || [];
        setAllQuestions(list);

        const total = list.length;
        const answered = list.filter((q) => q.replyCount > 0).length;
        const waiting = total - answered;

        setStats({
          totalQuestions: total,
          answeredCount: answered,
          waitingCount: waiting,
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setAllQuestions([]);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Bộ đếm số lượng câu hỏi cố định theo từng tab (luôn tính trên allQuestions, không bị nhảy về 0)
  const tabCounts = useMemo(() => {
    const counts: Record<GradeTab, number> = {
      all: allQuestions.length,
      exam: 0,
      '12': 0,
      '11': 0,
      '10': 0,
      other: 0,
    };
    allQuestions.forEach((q) => {
      const g = getQuestionGrade(q);
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [allQuestions]);

  // Danh sách câu hỏi sau khi lọc qua tab, sub-filter và tìm kiếm
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((item) => {
      // 1. Lọc theo Tab khối lớp
      if (activeTab !== 'all') {
        const g = getQuestionGrade(item);
        if (g !== activeTab) return false;
      }

      // 2. Lọc theo Sub-filter: Đã trả lời / Chờ giải đáp / Của tôi
      if (subFilter === 'ANSWERED' && item.replyCount === 0) return false;
      if (subFilter === 'WAITING' && item.replyCount > 0) return false;
      if (subFilter === 'MY_QUESTIONS' && (!user || item.userId !== user.id)) return false;

      // 3. Tìm kiếm theo từ khóa
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchContent = item.content.toLowerCase().includes(q);
        const matchAuthor = item.user?.fullName?.toLowerCase().includes(q);
        const matchCourse = item.courseTitle?.toLowerCase().includes(q);
        const matchLesson = item.lessonTitle?.toLowerCase().includes(q);
        if (!matchContent && !matchAuthor && !matchCourse && !matchLesson) return false;
      }

      return true;
    });
  }, [allQuestions, activeTab, subFilter, searchQuery, user]);

  // Toggle discussion expansion
  const toggleDiscussion = (questionId: string) => {
    setExpandedQuestionId((prev) => (prev === questionId ? null : questionId));
  };

  // Submit reply to a question
  const handleSendReply = async (question: PublicDiscussionItem) => {
    const text = replyInputs[question.id]?.trim();
    if (!text) {
      toast.warning('Vui lòng nhập nội dung phản hồi thảo luận.');
      return;
    }

    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập tài khoản để tham gia thảo luận.');
      navigate('/login?redirect=/qa');
      return;
    }

    setSubmittingReply((prev) => ({ ...prev, [question.id]: true }));
    try {
      const createdComment = await courseService.createLessonComment(
        question.courseId,
        question.lessonId,
        {
          content: text,
          parentId: question.id,
        },
      );

      const isTeacherOrAdmin = user?.role === 'TEACHER' || user?.role === 'ADMIN';
      setAllQuestions((prevList) =>
        prevList.map((item) => {
          if (item.id === question.id) {
            const newReply = {
              id: createdComment.id || `reply-${Date.now()}`,
              content: text,
              isPinned: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              userId: user?.id || '',
              user: {
                id: user?.id || '',
                fullName: user?.fullName || 'Học sinh',
                avatarUrl: user?.avatarUrl,
                role: (user?.role as 'STUDENT' | 'TEACHER' | 'ADMIN') || 'STUDENT',
              },
            };
            return {
              ...item,
              replyCount: item.replyCount + 1,
              hasTeacherReply: item.hasTeacherReply || isTeacherOrAdmin,
              replies: [...(item.replies || []), newReply],
            };
          }
          return item;
        }),
      );

      setStats((prev) => ({
        ...prev,
        answeredCount: prev.answeredCount + (question.replyCount === 0 ? 1 : 0),
        waitingCount: Math.max(0, prev.waitingCount - (question.replyCount === 0 ? 1 : 0)),
      }));

      setReplyInputs((prev) => ({ ...prev, [question.id]: '' }));
      toast.success('Đã gửi phản hồi thảo luận thành công!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi phản hồi.';
      toast.error(msg);
    } finally {
      setSubmittingReply((prev) => ({ ...prev, [question.id]: false }));
    }
  };

  // Open Ask Question Modal & load active courses
  const handleOpenAskModal = async () => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để đặt câu hỏi học tập.');
      navigate('/login?redirect=/qa');
      return;
    }

    setIsModalOpen(true);
    try {
      const res = await courseService.getPublicCourses();
      const courses = res?.courses || [];
      setAvailableCourses(courses);

      if (courses.length > 0) {
        setSelectedCourseId(courses[0].id);
        loadCourseDetail(courses[0].id);
      }
    } catch {
      toast.error('Không thể tải danh sách khóa học.');
    }
  };

  // Load Course Lessons
  const loadCourseDetail = async (courseId: string) => {
    setIsLoadingLessons(true);
    try {
      const detail = await courseService.getPublicCourseById(courseId);
      setCourseDetail(detail);

      const firstLesson = detail.chapters?.[0]?.lessons?.[0];
      if (firstLesson) {
        setSelectedLessonId(firstLesson.id);
      } else {
        setSelectedLessonId('');
      }
    } catch {
      toast.error('Không thể tải danh mục bài học của khóa này.');
    } finally {
      setIsLoadingLessons(false);
    }
  };

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value;
    setSelectedCourseId(courseId);
    loadCourseDetail(courseId);
  };

  // Submit new Question
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.warning('Vui lòng chọn khóa học liên quan.');
      return;
    }
    if (!selectedLessonId) {
      toast.warning('Vui lòng chọn bài giảng cụ thể để đặt câu hỏi.');
      return;
    }
    if (!questionContent.trim()) {
      toast.warning('Vui lòng nhập nội dung câu hỏi thắc mắc.');
      return;
    }

    const timestampSec = parseVideoTimestamp(videoTimestampInput);

    setIsSubmittingQuestion(true);
    try {
      await courseService.createLessonComment(selectedCourseId, selectedLessonId, {
        content: questionContent.trim(),
        videoTimestamp: timestampSec,
      });

      toast.success('Đã đăng câu hỏi thành công! Giảng viên và cộng đồng sẽ sớm giải đáp.');
      setIsModalOpen(false);
      setQuestionContent('');
      setVideoTimestampInput('');

      // Tải lại danh sách toàn bộ câu hỏi từ DB
      await loadDiscussions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đăng câu hỏi.';
      toast.error(msg);
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  // Toggle Pin reply (Teacher / Admin)
  const handleTogglePin = async (
    question: PublicDiscussionItem,
    replyId: string,
  ) => {
    try {
      await courseService.togglePinComment(question.courseId, question.lessonId, replyId);
      setAllQuestions((prevList) =>
        prevList.map((item) => {
          if (item.id === question.id) {
            return {
              ...item,
              replies: item.replies.map((r) =>
                r.id === replyId ? { ...r, isPinned: !r.isPinned } : r,
              ),
            };
          }
          return item;
        }),
      );
      toast.success('Đã cập nhật trạng thái ghim câu trả lời!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể thao tác.';
      toast.error(msg);
    }
  };

  // Delete reply (Author / Admin)
  const handleDeleteReply = async (
    question: PublicDiscussionItem,
    replyId: string,
  ) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phản hồi này không?')) return;

    try {
      await courseService.deleteLessonComment(question.courseId, question.lessonId, replyId);
      setAllQuestions((prevList) =>
        prevList.map((item) => {
          if (item.id === question.id) {
            return {
              ...item,
              replyCount: Math.max(0, item.replyCount - 1),
              replies: item.replies.filter((r) => r.id !== replyId),
            };
          }
          return item;
        }),
      );
      toast.success('Đã xóa phản hồi thảo luận thành công.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa phản hồi.';
      toast.error(msg);
    }
  };

  return (
    <div className="tku-app tku-courses-page-wrapper">
      <Navbar />

      <main className="tku-courses-page-main">
        {/* ================================================================
            1. ACADEMIC HERO BANNER (ĐỒNG BỘ 2 CỘT CHUẨN TKU E-LEARNING)
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
              <span className="tku-hero-breadcrumb-current">Hỏi đáp học tập</span>
            </nav>

            <div className="tku-courses-hub-hero__grid">
              {/* Cột Trái: Tiêu đề & Thông tin học thuật */}
              <div className="tku-courses-hub-hero__main">
                <div className="tku-courses-hub-hero__tag-wrap">
                  <span className="tku-courses-hub-hero__tag">
                    <Sparkles size={14} />
                    <span>Hệ thống Hỏi đáp & Giải đáp Thắc mắc TKU</span>
                  </span>
                  <span className="tku-courses-hub-hero__subtag">
                    Học tập tương tác 24/7
                  </span>
                </div>

                <h1 className="tku-courses-hub-hero__title">
                  Hỏi đáp & Giải đáp Thắc mắc Bài giảng
                </h1>

                <p className="tku-courses-hub-hero__desc">
                  Không gian kết nối giữa Học sinh và Giảng viên TKU E-Learning. Đặt câu hỏi thắc mắc trực tiếp theo từng bài giảng, thảo luận bản chất hóa học và nhận giải đáp chuẩn mực từ ban chuyên môn.
                </p>
              </div>

              {/* Cột Phải: 4 Thẻ Thống Kê Dữ Liệu Thật Glassmorphism */}
              <div className="tku-courses-hub-stats-grid">
                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--blue">
                    <MessageSquare size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">
                      {isLoading ? '...' : stats.totalQuestions}
                    </span>
                    <span className="tku-hub-glass-card__lbl">Tổng câu hỏi</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--emerald">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">
                      {isLoading ? '...' : stats.answeredCount}
                    </span>
                    <span className="tku-hub-glass-card__lbl">Đã có lời giải</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--amber">
                    <Clock size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">
                      {isLoading ? '...' : stats.waitingCount}
                    </span>
                    <span className="tku-hub-glass-card__lbl">Chờ giải đáp</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--purple">
                    <Award size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">24/7</span>
                    <span className="tku-hub-glass-card__lbl">Hỗ trợ chuyên môn</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            2. TOOLBAR: TÌM KIẾM, TABS KHỐI LỚP & NÚT ĐẶT CÂU HỎI
            ================================================================ */}
        <div className="tku-container tku-courses-hub-container">
          {/* Main Toolbar */}
          <div className="tku-courses-hub__toolbar">
            {/* Search Input */}
            <div className="tku-courses-search-wrap">
              <Search size={18} className="tku-courses-search-icon" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm câu hỏi theo nội dung, bài học, khóa học hoặc người hỏi..."
                className="tku-courses-search-input"
                aria-label="Tìm kiếm câu hỏi"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="tku-courses-search-clear"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filter Tabs by Grade (Bộ đếm cố định chính xác, chuyển tab mượt mà) */}
            <div className="tku-courses-tabs" role="tablist" aria-label="Lọc câu hỏi theo khối lớp">
              {GRADE_TABS.map((tab) => {
                const count = tabCounts[tab.key] ?? 0;
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.key)}
                    className={`tku-tab-btn ${isActive ? 'is-active' : ''}`}
                  >
                    <span>{tab.label}</span>
                    <span className="tku-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-Controls: Sub-Filters & Ask Question Button */}
          <div className="tku-qa-control-row">
            <div className="tku-qa-sub-filters">
              <button
                type="button"
                onClick={() => setSubFilter('ALL')}
                className={`tku-qa-filter-chip ${subFilter === 'ALL' ? 'is-active' : ''}`}
              >
                <span>Tất cả câu hỏi</span>
              </button>

              <button
                type="button"
                onClick={() => setSubFilter('ANSWERED')}
                className={`tku-qa-filter-chip ${subFilter === 'ANSWERED' ? 'is-active' : ''}`}
              >
                <CheckCircle2 size={14} />
                <span>Đã có câu trả lời</span>
              </button>

              <button
                type="button"
                onClick={() => setSubFilter('WAITING')}
                className={`tku-qa-filter-chip ${subFilter === 'WAITING' ? 'is-active' : ''}`}
              >
                <Clock size={14} />
                <span>Đang chờ giải đáp</span>
              </button>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setSubFilter('MY_QUESTIONS')}
                  className={`tku-qa-filter-chip ${subFilter === 'MY_QUESTIONS' ? 'is-active' : ''}`}
                >
                  <User size={14} />
                  <span>Câu hỏi của tôi</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleOpenAskModal}
              className="tku-qa-ask-btn"
            >
              <Plus size={16} />
              <span>Đặt câu hỏi học tập</span>
            </button>
          </div>

          {/* Search Result Feedback Bar */}
          {searchQuery && (
            <div className="tku-courses-search-result-bar">
              <div className="tku-courses-search-result-left">
                <Search size={18} className="tku-courses-search-result-icon" />
                <span>Kết quả tìm kiếm cho: <strong>"{searchQuery}"</strong></span>
                <span className="tku-courses-search-result-count">{filteredQuestions.length} câu hỏi</span>
              </div>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="tku-courses-search-result-clear-btn"
              >
                <X size={14} />
                <span>Xóa tìm kiếm</span>
              </button>
            </div>
          )}

          {/* ================================================================
              3. DANH SÁCH CÂU HỎI THẢO LUẬN (REAL DATABASE DATA ONLY)
              ================================================================ */}
          {isLoading ? (
            /* Loading Shimmer Skeletons */
            <div className="tku-qa-cards-list">
              {[1, 2, 3].map((n) => (
                <div key={n} className="tku-qa-card" style={{ opacity: 0.7 }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ width: '140px', height: '14px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '6px' }} />
                      <div style={{ width: '80px', height: '12px', background: '#f1f5f9', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div style={{ width: '90%', height: '16px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ width: '60%', height: '16px', background: '#f1f5f9', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
          ) : filteredQuestions.length > 0 ? (
            <div className="tku-qa-cards-list">
              {filteredQuestions.map((question) => {
                const isExpanded = expandedQuestionId === question.id;
                const authorRole = question.user?.role || 'STUDENT';
                const isAuthorTeacher = authorRole === 'TEACHER';
                const isAuthorAdmin = authorRole === 'ADMIN';

                return (
                  <article
                    key={question.id}
                    className={`tku-qa-card ${question.isPinned ? 'is-pinned' : ''}`}
                  >
                    {/* Header: Author & Context Pills */}
                    <div className="tku-qa-card__head">
                      <div className="tku-qa-card__author">
                        <div className="tku-qa-card__avatar">
                          {question.user?.avatarUrl ? (
                            <img src={question.user.avatarUrl} alt={question.user.fullName} />
                          ) : (
                            <span>{getInitials(question.user?.fullName)}</span>
                          )}
                        </div>
                        <div className="tku-qa-card__author-info">
                          <div className="tku-qa-card__author-row">
                            <span className="tku-qa-card__author-name">
                              {question.user?.fullName || 'Học sinh'}
                            </span>

                            {isAuthorTeacher && (
                              <span className="tku-qa-role-badge tku-qa-role-badge--teacher">
                                Giảng viên TKU
                              </span>
                            )}
                            {isAuthorAdmin && (
                              <span className="tku-qa-role-badge tku-qa-role-badge--admin">
                                Quản trị viên
                              </span>
                            )}
                            {!isAuthorTeacher && !isAuthorAdmin && (
                              <span className="tku-qa-role-badge tku-qa-role-badge--student">
                                Học sinh
                              </span>
                            )}
                          </div>

                          <div className="tku-qa-card__author-meta">
                            <span>{formatRelativeTime(question.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="tku-qa-card__badges">
                        {/* Course & Lesson Context Breadcrumb Pill */}
                        <Link
                          to={`/courses/${question.courseId}/learn?lessonId=${question.lessonId}`}
                          className="tku-qa-card__course-pill"
                          title={`${question.courseTitle} - ${question.lessonTitle}`}
                        >
                          <BookOpen size={13} />
                          <span>{question.lessonTitle}</span>
                        </Link>

                        {/* Video Timestamp if attached */}
                        {typeof question.videoTimestamp === 'number' && (
                          <span className="tku-qa-timestamp-pill">
                            <Clock size={12} />
                            <span>{formatVideoTimestamp(question.videoTimestamp)}</span>
                          </span>
                        )}

                        {/* Pinned Badge */}
                        {question.isPinned && (
                          <span className="tku-qa-pin-badge">
                            <Pin size={12} />
                            <span>Đã ghim</span>
                          </span>
                        )}

                        {/* Answered / Waiting Status */}
                        {question.hasTeacherReply ? (
                          <span className="tku-qa-status-pill tku-qa-status-pill--answered">
                            <CheckCircle2 size={13} />
                            <span>Đã có lời giải GV</span>
                          </span>
                        ) : question.replyCount > 0 ? (
                          <span className="tku-qa-status-pill tku-qa-status-pill--answered">
                            <CheckCircle2 size={13} />
                            <span>{question.replyCount} câu trả lời</span>
                          </span>
                        ) : (
                          <span className="tku-qa-status-pill tku-qa-status-pill--pending">
                            <Clock size={13} />
                            <span>Chờ giải đáp</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Content Body */}
                    <div className="tku-qa-card__content">
                      {question.content}
                    </div>

                    {/* Card Footer: Metadata & Actions */}
                    <div className="tku-qa-card__footer">
                      <div className="tku-qa-card__meta-left">
                        <span className="tku-qa-card__meta-item">
                          <MessageSquare size={14} />
                          <span>
                            {question.replyCount > 0
                              ? `${question.replyCount} thảo luận`
                              : 'Chưa có thảo luận'}
                          </span>
                        </span>
                      </div>

                      <div className="tku-qa-card__actions-right">
                        <Link
                          to={`/courses/${question.courseId}/learn?lessonId=${question.lessonId}`}
                          className="tku-qa-card__learn-btn"
                          title="Vào bài giảng để xem video và làm bài tập"
                        >
                          <span>Vào bài học</span>
                          <ExternalLink size={13} />
                        </Link>

                        <button
                          type="button"
                          onClick={() => toggleDiscussion(question.id)}
                          className="tku-qa-card__toggle-btn"
                        >
                          <MessageCircle size={15} />
                          <span>
                            {isExpanded
                              ? 'Thu gọn'
                              : question.replyCount > 0
                              ? `Xem thảo luận (${question.replyCount})`
                              : 'Trả lời câu hỏi'}
                          </span>
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Discussion Thread */}
                    {isExpanded && (
                      <div className="tku-qa-discussion-wrap">
                        {question.replies && question.replies.length > 0 ? (
                          <div className="tku-qa-replies-list">
                            {question.replies.map((reply) => {
                              const rRole = reply.user?.role || 'STUDENT';
                              const isTeacher = rRole === 'TEACHER' || rRole === 'ADMIN';
                              const isMyReply = user?.id === reply.userId;
                              const canManage = isTeacher || isMyReply;

                              return (
                                <div
                                  key={reply.id}
                                  className={`tku-qa-reply-item ${isTeacher ? 'tku-qa-reply-item--teacher' : ''} ${reply.isPinned ? 'tku-qa-reply-item--pinned' : ''}`}
                                >
                                  <div className="tku-qa-reply-head">
                                    <div className="tku-qa-reply-author-wrap">
                                      <div className="tku-qa-reply-avatar">
                                        {reply.user?.avatarUrl ? (
                                          <img src={reply.user.avatarUrl} alt={reply.user.fullName} />
                                        ) : (
                                          <span>{getInitials(reply.user?.fullName)}</span>
                                        )}
                                      </div>
                                      <span className="tku-qa-reply-author">
                                        {reply.user?.fullName || 'Người dùng'}
                                      </span>

                                      {isTeacher && (
                                        <span className="tku-qa-role-badge tku-qa-role-badge--teacher">
                                          Giảng viên TKU
                                        </span>
                                      )}

                                      {reply.isPinned && (
                                        <span className="tku-qa-pin-badge">
                                          <Pin size={11} />
                                          <span>Lời giải chuẩn</span>
                                        </span>
                                      )}
                                    </div>

                                    <span className="tku-qa-reply-time">
                                      {formatRelativeTime(reply.createdAt)}
                                    </span>
                                  </div>

                                  <p className="tku-qa-reply-body">{reply.content}</p>

                                  {canManage && (
                                    <div className="tku-qa-reply-actions">
                                      {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
                                        <button
                                          type="button"
                                          onClick={() => handleTogglePin(question, reply.id)}
                                          className="tku-qa-reply-action-btn"
                                          title={reply.isPinned ? 'Bỏ ghim lời giải' : 'Ghim làm lời giải chuẩn'}
                                        >
                                          <Pin size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                          <span>{reply.isPinned ? 'Bỏ ghim' : 'Ghim chuẩn'}</span>
                                        </button>
                                      )}

                                      {(isMyReply || user?.role === 'ADMIN') && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteReply(question, reply.id)}
                                          className="tku-qa-reply-action-btn"
                                          title="Xóa phản hồi này"
                                        >
                                          <Trash2 size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                          <span>Xóa</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ padding: '14px 0', fontSize: '13.5px', color: 'var(--tku-hub-text-muted)', fontStyle: 'italic' }}>
                            Chưa có câu trả lời nào. Hãy là người đầu tiên chia sẻ lời giải hoặc đóng góp ý kiến!
                          </div>
                        )}

                        {/* Reply Input Form */}
                        <div className="tku-qa-reply-form">
                          <input
                            type="text"
                            placeholder="Nhập câu trả lời hoặc góp ý của bạn..."
                            value={replyInputs[question.id] || ''}
                            onChange={(e) =>
                              setReplyInputs((prev) => ({
                                ...prev,
                                [question.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !submittingReply[question.id]) {
                                handleSendReply(question);
                              }
                            }}
                            className="tku-qa-reply-input"
                          />
                          <button
                            type="button"
                            onClick={() => handleSendReply(question)}
                            disabled={submittingReply[question.id]}
                            className="tku-qa-reply-submit-btn"
                          >
                            {submittingReply[question.id] ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Send size={14} />
                            )}
                            <span>Gửi</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            /* Elegant Empty State When 0 Discussions in Active Tab / Filter */
            <div className="tku-qa-empty-state">
              <div className="tku-qa-empty-icon">
                <HelpCircle size={32} />
              </div>
              <h3 className="tku-qa-empty-title">
                {searchQuery
                  ? 'Không tìm thấy câu hỏi thảo luận phù hợp'
                  : activeTab !== 'all'
                  ? `Chưa có câu hỏi nào trong danh mục ${GRADE_TABS.find((t) => t.key === activeTab)?.label}`
                  : 'Hiện chưa có câu hỏi thảo luận nào'}
              </h3>
              <p className="tku-qa-empty-desc">
                {searchQuery
                  ? `Không có câu hỏi nào khớp với từ khóa "${searchQuery}". Hãy thử tìm kiếm với cụm từ khác hoặc đặt câu hỏi mới.`
                  : activeTab !== 'all'
                  ? `Chuyên mục ${GRADE_TABS.find((t) => t.key === activeTab)?.label} hiện chưa có câu hỏi nào. Bạn có thể chuyển sang tab khác hoặc đặt câu hỏi mới ngay tại đây!`
                  : 'Chưa có câu hỏi nào trong hệ thống. Hãy là người đầu tiên đặt câu hỏi để Giảng viên TKU và cộng đồng học sinh cùng trao đổi, giải đáp!'}
              </p>
            </div>
          )}

          {/* ================================================================
              4. KHỐI QUY CHUẨN GIẢI ĐÁP HỌC THUẬT TKU
              ================================================================ */}
          <section className="tku-qa-guidelines-card">
            <div className="tku-qa-guidelines-head">
              <div className="tku-qa-guidelines-icon">
                <GraduationCap size={22} />
              </div>
              <div className="tku-qa-guidelines-head-info">
                <h3 className="tku-qa-guidelines-title">Quy chuẩn Hỏi đáp & Hỗ trợ Học thuật TKU</h3>
                <p className="tku-qa-guidelines-subtitle">
                  Đội ngũ Giảng viên và Trợ lý học tập TKU cam kết đồng hành cùng học sinh với các nguyên tắc chuẩn mực:
                </p>
              </div>
            </div>

            <div className="tku-qa-advice-grid">
              <div className="tku-qa-advice-box">
                <div className="tku-qa-advice-box__target tku-qa-advice-box__target--blue">
                  <CheckCircle2 size={16} />
                  <span>Giải đáp bản chất hóa học</span>
                </div>
                <p className="tku-qa-advice-box__text">
                  Không chỉ đưa ra đáp án thuần túy mà phân tích chi tiết cơ chế phản ứng, bản chất hiện tượng và chỉ rõ các bẫy thường gặp.
                </p>
              </div>

              <div className="tku-qa-advice-box">
                <div className="tku-qa-advice-box__target tku-qa-advice-box__target--amber">
                  <Clock size={16} />
                  <span>Tương tác nhanh chóng</span>
                </div>
                <p className="tku-qa-advice-box__text">
                  Các câu hỏi trong giờ học hoặc trước kỳ thi luôn được thầy cô và ban chuyên môn phản hồi hỗ trợ kịp thời.
                </p>
              </div>

              <div className="tku-qa-advice-box">
                <div className="tku-qa-advice-box__target tku-qa-advice-box__target--emerald">
                  <ShieldCheck size={16} />
                  <span>Ghim lời giải chuẩn xác</span>
                </div>
                <p className="tku-qa-advice-box__text">
                  Mỗi câu hỏi hay đều được ghim lời giải chuẩn mực từ Giảng viên làm tư liệu học tập dùng chung cho toàn bộ học sinh.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ================================================================
          MODAL: ĐẶT CÂU HỎI HỌC THUẬT MỚI (CHỌN KHÓA HỌC & BÀI HỌC THẬT)
          ================================================================ */}
      {isModalOpen && (
        <div className="tku-qa-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="tku-qa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tku-qa-modal__head">
              <h3 className="tku-qa-modal__title">Đặt câu hỏi học tập mới</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="tku-qa-modal__close-btn"
                aria-label="Đóng cửa sổ"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion}>
              {/* Chọn khóa học */}
              <div className="tku-qa-form-group">
                <label className="tku-qa-form-label">Chọn khóa học liên quan *</label>
                <select
                  value={selectedCourseId}
                  onChange={handleCourseChange}
                  className="tku-qa-form-select"
                  required
                >
                  {availableCourses.length === 0 ? (
                    <option value="">Đang tải danh sách khóa học...</option>
                  ) : (
                    availableCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.grade === 'exam' ? 'Luyện thi 9+' : `Lớp ${c.grade}`})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Chọn bài giảng */}
              <div className="tku-qa-form-group">
                <label className="tku-qa-form-label">Chọn bài giảng / chuyên đề *</label>
                {isLoadingLessons ? (
                  <div style={{ fontSize: '13px', color: 'var(--tku-hub-text-muted)' }}>
                    Đang tải danh mục bài giảng...
                  </div>
                ) : (
                  <select
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    className="tku-qa-form-select"
                    required
                  >
                    {!courseDetail || !courseDetail.chapters?.length ? (
                      <option value="">Khóa học chưa có bài giảng</option>
                    ) : (
                      courseDetail.chapters.flatMap((ch) =>
                        ch.lessons.map((ls) => (
                          <option key={ls.id} value={ls.id}>
                            {ch.title} - {ls.title}
                          </option>
                        )),
                      )
                    )}
                  </select>
                )}
              </div>

              {/* Mốc thời gian video nếu có */}
              <div className="tku-qa-form-group">
                <label className="tku-qa-form-label">Mốc thời gian video (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 05:24 hoặc 324 (giây)"
                  value={videoTimestampInput}
                  onChange={(e) => setVideoTimestampInput(e.target.value)}
                  className="tku-qa-form-input"
                />
                <p className="tku-qa-form-hint">
                  Nếu bạn thắc mắc ở một đoạn cụ thể trong bài giảng, hãy điền mốc phút:giây để Giảng viên dễ đối chiếu.
                </p>
              </div>

              {/* Nội dung câu hỏi chi tiết */}
              <div className="tku-qa-form-group">
                <label className="tku-qa-form-label">Nội dung câu hỏi thắc mắc *</label>
                <textarea
                  placeholder="Nhập chi tiết câu hỏi, dữ kiện bài tập hoặc phần kiến thức bạn chưa hiểu rõ..."
                  value={questionContent}
                  onChange={(e) => setQuestionContent(e.target.value)}
                  className="tku-qa-form-textarea"
                  required
                />
              </div>

              <div className="tku-qa-modal__foot">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="tku-qa-modal-cancel-btn"
                  disabled={isSubmittingQuestion}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuestion || !selectedLessonId}
                  className="tku-qa-modal-submit-btn"
                >
                  {isSubmittingQuestion ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Đăng câu hỏi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default QAPage;
