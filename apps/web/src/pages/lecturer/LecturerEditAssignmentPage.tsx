import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  FilePenLine,
  BookOpen,
  Award,
  FileQuestion,
  Clock,
  CheckCircle2,
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Sparkles,
  Save,
} from 'lucide-react';
import {
  lecturerService,
  type LecturerCourseItem,
  type AssessmentType,
  type ChapterSummary,
  type AssignmentItem,
} from '../../services/lecturer.service';
import { toast } from '../../context/toastService';
import './lecturerCreateAssignment.css';

interface TypeCardOption {
  type: AssessmentType;
  title: string;
  badge: string;
  durationHint: string;
  description: string;
  icon: typeof FileQuestion;
  recommendedFor: string;
}

const TYPE_OPTIONS: TypeCardOption[] = [
  {
    type: 'QUIZ',
    title: 'Bài tập ngắn (Quiz)',
    badge: '10 - 15 phút',
    durationHint: '15',
    description: 'Bài tập trắc nghiệm củng cố kiến thức theo từng bài học, bài giảng video hoặc chủ đề nhỏ.',
    icon: FileQuestion,
    recommendedFor: 'Ôn tập nhanh & kiểm tra bài cũ',
  },
  {
    type: 'TEST',
    title: 'Kiểm tra định kỳ (1 tiết)',
    badge: '45 - 60 phút',
    durationHint: '45',
    description: 'Đánh giá định kỳ 1 tiết hoặc giữa kỳ, tổng hợp kiến thức từ nhiều chương và phân loại học sinh.',
    icon: Award,
    recommendedFor: 'Đánh giá giữa kỳ & xếp loại học tập',
  },
  {
    type: 'EXAM',
    title: 'Đề thi học kỳ / Thi thử',
    badge: '60 - 90 phút',
    durationHint: '60',
    description: 'Đề thi học kỳ chính thức hoặc khảo sát năng lực quy mô toàn khóa học với cấu trúc đề chuẩn.',
    icon: Sparkles,
    recommendedFor: 'Thi học kỳ & Khảo sát chất lượng',
  },
];

const DURATION_PRESETS = [10, 15, 30, 45, 60, 90, 120];

export const LecturerEditAssignmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Assignment data
  const [assignment, setAssignment] = useState<AssignmentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [type, setType] = useState<AssessmentType>('QUIZ');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);

  // Course & Curriculum states
  const [courses, setCourses] = useState<LecturerCourseItem[]>([]);
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial assignment and courses
  useEffect(() => {
    if (!id) {
      navigate('/lecturer/assignments');
      return;
    }

    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const [asgData, coursesRes] = await Promise.all([
          lecturerService.getAssessmentById(id),
          lecturerService.getMyCourses(),
        ]);

        if (!isMounted) return;

        if (!asgData) {
          toast.error('Không tìm thấy bài tập yêu cầu.');
          navigate('/lecturer/assignments');
          return;
        }

        setAssignment(asgData);
        setTitle(asgData.title);
        setCourseId(asgData.courseId);
        setLessonId(asgData.lessonId || '');
        setType(asgData.type);
        setDurationMinutes(asgData.durationMinutes || 15);

        const list = coursesRes.courses || [];
        setCourses(list);
      } catch {
        toast.error('Có lỗi khi tải thông tin bài tập');
        navigate('/lecturer/assignments');
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsLoadingCourses(false);
        }
      }
    };

    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  // Handle Course Change
  const handleCourseChange = useCallback((newCourseId: string) => {
    setCourseId(newCourseId);
    setLessonId('');
    if (!newCourseId) {
      setChapters([]);
    }
  }, []);

  // Fetch curriculum when courseId changes
  useEffect(() => {
    if (!courseId) return;

    let isMounted = true;
    const fetchCurriculum = async () => {
      try {
        setIsLoadingCurriculum(true);
        const data = await lecturerService.getCourseDetail(courseId);
        if (isMounted) {
          setChapters(data.chapters || []);
        }
      } catch {
        if (isMounted) setChapters([]);
      } finally {
        if (isMounted) setIsLoadingCurriculum(false);
      }
    };

    fetchCurriculum();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // Selected course object
  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.id === courseId) || null;
  }, [courses, courseId]);

  // Handle save
  const handleSave = useCallback(
    async (navigateNext = false) => {
      if (!id) return;

      if (!title.trim()) {
        toast.warning('Vui lòng nhập tiêu đề cho bài tập / đề kiểm tra');
        return;
      }

      if (!courseId) {
        toast.warning('Vui lòng chọn khóa học áp dụng');
        return;
      }

      if (durationMinutes <= 0) {
        toast.warning('Thời lượng làm bài phải lớn hơn 0 phút');
        return;
      }

      try {
        setIsSubmitting(true);
        await lecturerService.updateAssessment(id, {
          title: title.trim(),
          type,
          courseId,
          lessonId: lessonId || null,
          durationMinutes,
        });

        toast.success('Đã lưu các thay đổi cho bài tập thành công!');

        if (navigateNext) {
          navigate(`/lecturer/assignments/${id}/questions`);
        } else {
          navigate('/lecturer/assignments');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Có lỗi khi cập nhật bài tập.';
        toast.error(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [id, title, type, courseId, lessonId, durationMinutes, navigate]
  );

  if (isLoading || !assignment) {
    return (
      <div className="tku-lecturer-loading-wrapper" role="status" aria-live="polite">
        <Loader2 size={36} className="tku-lecturer-spin-icon" />
        <span>Đang tải thông tin chỉnh sửa bài tập...</span>
      </div>
    );
  }

  return (
    <div className="tku-create-asg-page">
      {/* 1. Header */}
      <header className="tku-create-asg-header">
        <div className="tku-create-asg-header__titles">
          <h1 className="tku-create-asg-title">Chỉnh sửa thông tin Bài tập & Đề thi</h1>
          <p className="tku-create-asg-subtitle">
            Cập nhật tiêu đề, khóa học áp dụng, hình thức đánh giá hoặc thời lượng làm bài.
          </p>
        </div>
      </header>

      {/* 2. Main Layout (Two Columns) */}
      <div className="tku-create-asg-layout">
        {/* Left Column: Form Cards */}
        <div className="tku-create-asg-main">
          {/* Section 1: Basic Information */}
          <section className="tku-create-card">
            <div className="tku-create-card__header">
              <div className="tku-create-card__icon tku-create-card__icon--blue">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="tku-create-card__title">1. Thông tin chung</h2>
                <p className="tku-create-card__desc">
                  Chỉnh sửa tên bài kiểm tra và khóa học hoặc bài học áp dụng.
                </p>
              </div>
            </div>

            <div className="tku-create-card__body">
              {/* Title input */}
              <div className="tku-form-group">
                <label className="tku-form-label" htmlFor="edit-asg-title">
                  Tiêu đề bài tập / đề kiểm tra <span className="tku-form-required">*</span>
                </label>
                <input
                  id="edit-asg-title"
                  type="text"
                  className="tku-form-input tku-create-input-lg"
                  placeholder="Ví dụ: Kiểm tra 15 phút: Cấu tạo nguyên tử & Bảng tuần hoàn..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Course Selection */}
              <div className="tku-form-row">
                <div className="tku-form-group">
                  <label className="tku-form-label" htmlFor="edit-asg-course">
                    Khóa học áp dụng <span className="tku-form-required">*</span>
                  </label>
                  <div className="tku-create-select-wrap">
                    <select
                      id="edit-asg-course"
                      className="tku-form-select"
                      value={courseId}
                      onChange={(e) => handleCourseChange(e.target.value)}
                      disabled={isLoadingCourses}
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.studentCount} học viên)
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="tku-create-select-icon" />
                  </div>
                </div>

                {/* Scope: Whole course or specific lesson */}
                <div className="tku-form-group">
                  <label className="tku-form-label" htmlFor="edit-asg-lesson">
                    Phạm vi bài học (Tùy chọn)
                  </label>
                  <div className="tku-create-select-wrap">
                    <select
                      id="edit-asg-lesson"
                      className="tku-form-select"
                      value={lessonId}
                      onChange={(e) => setLessonId(e.target.value)}
                      disabled={isLoadingCurriculum || chapters.length === 0}
                    >
                      <option value="">Áp dụng cho toàn bộ khóa học (Đề chung)</option>
                      {chapters.map((chap) => (
                        <optgroup key={chap.id} label={`Chương: ${chap.title}`}>
                          {chap.lessons && chap.lessons.length > 0 ? (
                            chap.lessons.map((les) => (
                              <option key={les.id} value={les.id}>
                                Bài: {les.title}
                              </option>
                            ))
                          ) : (
                            <option disabled value="">(Chưa có bài học)</option>
                          )}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown size={14} className="tku-create-select-icon" />
                  </div>
                  <p className="tku-form-hint">
                    {lessonId
                      ? 'Bài tập được gắn trực tiếp sau video bài học này.'
                      : 'Đề kiểm tra thuộc cấp độ toàn khóa (thích hợp cho bài thi, kiểm tra chung).'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Assessment Type & Duration */}
          <section className="tku-create-card">
            <div className="tku-create-card__header">
              <div className="tku-create-card__icon tku-create-card__icon--emerald">
                <Award size={20} />
              </div>
              <div>
                <h2 className="tku-create-card__title">2. Hình thức đánh giá & Thời lượng</h2>
                <p className="tku-create-card__desc">
                  Thay đổi phân loại hình thức và thời gian làm bài của học sinh.
                </p>
              </div>
            </div>

            <div className="tku-create-card__body">
              {/* Type Selection Cards */}
              <div className="tku-form-group">
                <label className="tku-form-label">
                  Phân loại bài kiểm tra <span className="tku-form-required">*</span>
                </label>
                <div className="tku-type-cards-grid">
                  {TYPE_OPTIONS.map((opt) => {
                    const IconComp = opt.icon;
                    const isSelected = type === opt.type;
                    return (
                      <div
                        key={opt.type}
                        className={`tku-type-card ${isSelected ? 'tku-type-card--selected' : ''}`}
                        onClick={() => setType(opt.type)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setType(opt.type);
                          }
                        }}
                      >
                        <div className="tku-type-card__top">
                          <div className="tku-type-card__icon-wrap">
                            <IconComp size={22} />
                          </div>
                          <span className="tku-type-card__badge">{opt.badge}</span>
                        </div>
                        <h3 className="tku-type-card__title">{opt.title}</h3>
                        <p className="tku-type-card__desc">{opt.description}</p>
                        <div className="tku-type-card__footer">
                          <CheckCircle2 size={14} className="tku-type-check-icon" />
                          <span>{opt.recommendedFor}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Duration input & quick presets */}
              <div className="tku-form-group">
                <label className="tku-form-label" htmlFor="edit-asg-duration">
                  Thời lượng làm bài (phút) <span className="tku-form-required">*</span>
                </label>
                <div className="tku-duration-row">
                  <div className="tku-duration-input-wrap">
                    <Clock size={16} className="tku-duration-input-icon" />
                    <input
                      id="edit-asg-duration"
                      type="number"
                      min="5"
                      max="180"
                      step="5"
                      className="tku-form-input tku-duration-input"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Math.max(5, Number(e.target.value)))}
                    />
                    <span className="tku-duration-unit">Phút</span>
                  </div>

                  <div className="tku-duration-presets">
                    {DURATION_PRESETS.map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        className={`tku-duration-preset-btn ${durationMinutes === minutes ? 'tku-duration-preset-btn--active' : ''}`}
                        onClick={() => setDurationMinutes(minutes)}
                      >
                        {minutes}p
                      </button>
                    ))}
                  </div>
                </div>
                <p className="tku-form-hint">
                  Học sinh sẽ có bộ đếm ngược tương ứng khi làm bài thi này.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Summary & Actions */}
        <aside className="tku-create-asg-sidebar">
          <div className="tku-create-summary-card">
            <h3 className="tku-summary-card__title">
              <FilePenLine size={18} />
              <span>Tóm tắt thông tin</span>
            </h3>

            <div className="tku-summary-preview-list">
              <div className="tku-summary-item">
                <span className="tku-summary-item__label">Tên bài kiểm tra:</span>
                <span className="tku-summary-item__value tku-summary-item__value--highlight">
                  {title.trim() || 'Chưa đặt tiêu đề'}
                </span>
              </div>

              <div className="tku-summary-item">
                <span className="tku-summary-item__label">Khóa học áp dụng:</span>
                <span className="tku-summary-item__value">
                  {selectedCourse ? selectedCourse.title : 'Chưa chọn khóa học'}
                </span>
              </div>

              <div className="tku-summary-item">
                <span className="tku-summary-item__label">Hình thức:</span>
                <span className="tku-summary-item__value">
                  {type === 'QUIZ' && 'Bài tập ngắn (Quiz)'}
                  {type === 'TEST' && 'Kiểm tra định kỳ (1 tiết)'}
                  {type === 'EXAM' && 'Đề thi học kỳ / Thi thử'}
                </span>
              </div>

              <div className="tku-summary-item">
                <span className="tku-summary-item__label">Thời lượng làm bài:</span>
                <span className="tku-summary-item__value">
                  {durationMinutes} phút
                </span>
              </div>

              <div className="tku-summary-item">
                <span className="tku-summary-item__label">Số lượng câu hỏi:</span>
                <span className="tku-summary-item__value">
                  {assignment.questions.length} câu hỏi • {assignment.totalScore} điểm
                </span>
              </div>
            </div>

            {/* Quick Step Links */}
            <div className="tku-summary-roadmap">
              <h4 className="tku-roadmap-title">
                <Layers size={14} />
                <span>Truy cập nhanh từng trang</span>
              </h4>

              <div className="tku-roadmap-steps">
                <Link
                  to={`/lecturer/assignments/${assignment.id}/questions`}
                  className="tku-roadmap-step tku-roadmap-step--active"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="tku-roadmap-step__num">1</div>
                  <div className="tku-roadmap-step__content">
                    <span className="tku-roadmap-step__name">Soạn câu hỏi & phân bổ điểm →</span>
                    <span className="tku-roadmap-step__desc">{assignment.questions.length} câu hỏi hiện có</span>
                  </div>
                </Link>

                <Link
                  to={`/lecturer/assignments/${assignment.id}/scoring`}
                  className="tku-roadmap-step"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="tku-roadmap-step__num">2</div>
                  <div className="tku-roadmap-step__content">
                    <span className="tku-roadmap-step__name">Thiết lập đáp án & thang điểm →</span>
                    <span className="tku-roadmap-step__desc">Chỉ định đáp án đúng & lời giải</span>
                  </div>
                </Link>

                <Link
                  to={`/lecturer/assignments/${assignment.id}/assign`}
                  className="tku-roadmap-step"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="tku-roadmap-step__num">3</div>
                  <div className="tku-roadmap-step__content">
                    <span className="tku-roadmap-step__name">Giao bài cho học sinh →</span>
                    <span className="tku-roadmap-step__desc">Hạn nộp & kích hoạt làm bài</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="tku-summary-actions">
              <button
                type="button"
                className="tku-btn-submit-create"
                onClick={() => handleSave(false)}
                disabled={isSubmitting || !title.trim() || !courseId}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="tku-spin-icon" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Lưu thay đổi</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="tku-btn-cancel-create"
                onClick={() => handleSave(true)}
                disabled={isSubmitting || !title.trim() || !courseId}
                style={{
                  backgroundColor: '#eff6ff',
                  borderColor: '#bfdbfe',
                  color: '#1d68f2',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>Lưu & Soạn câu hỏi</span>
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                className="tku-btn-cancel-create"
                onClick={() => navigate('/lecturer/assignments')}
                disabled={isSubmitting}
              >
                Hủy bỏ & Quay lại
              </button>
            </div>

            <div className="tku-summary-security-note">
              <ShieldCheck size={14} />
              <span>Dữ liệu được cập nhật trực tiếp vào cơ sở dữ liệu TKU</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LecturerEditAssignmentPage;
