import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FilePenLine,
  Sparkles,
  BookOpen,
  Award,
  FileQuestion,
  Clock,
  CheckCircle2,
  ChevronDown,
  Layers,
  ArrowRight,
  Save,
  Loader2,
} from 'lucide-react';
import {
  lecturerService,
  type LecturerCourseItem,
  type AssessmentType,
  type ChapterSummary,
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

const TITLE_SUGGESTIONS = [
  'Kiểm tra 15 phút: Cấu tạo nguyên tử & Bảng tuần hoàn',
  'Bài tập củng cố Este - Lipit & Ứng dụng thực tế',
  'Kiểm tra giữa kỳ I: Hóa học vô cơ & Phương trình ion',
  'Đề thi thử tốt nghiệp THPT Quốc gia môn Hóa',
];

const DURATION_PRESETS = [10, 15, 30, 45, 60, 90, 120];

export const LecturerCreateAssignmentPage: React.FC = () => {
  const navigate = useNavigate();

  // Form states
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [type, setType] = useState<AssessmentType>('QUIZ');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);

  // Data states
  const [courses, setCourses] = useState<LecturerCourseItem[]>([]);
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(false);
  const [submittingMode, setSubmittingMode] = useState<'AUTHOR' | 'LIST' | null>(null);

  // Fetch courses on mount
  useEffect(() => {
    let isMounted = true;
    const fetchCourses = async () => {
      try {
        setIsLoadingCourses(true);
        const res = await lecturerService.getMyCourses();
        if (isMounted) {
          const list = res.courses || [];
          setCourses(list);
          if (list.length > 0) {
            setCourseId(list[0].id);
          }
        }
      } catch {
        toast.error('Không thể tải danh sách khóa học của bạn');
      } finally {
        if (isMounted) setIsLoadingCourses(false);
      }
    };
    fetchCourses();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCourseChange = useCallback((newCourseId: string) => {
    setCourseId(newCourseId);
    setLessonId('');
    if (!newCourseId) {
      setChapters([]);
    }
  }, []);

  // Fetch curriculum when selected course changes
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

  // Handle select type
  const handleSelectType = useCallback((selectedType: AssessmentType) => {
    setType(selectedType);
    if (selectedType === 'QUIZ') setDurationMinutes(15);
    else if (selectedType === 'TEST') setDurationMinutes(45);
    else if (selectedType === 'EXAM') setDurationMinutes(60);
  }, []);

  // Core Create handler supporting both immediate authoring and return to list
  const executeCreate = useCallback(
    async (mode: 'AUTHOR' | 'LIST') => {
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
        setSubmittingMode(mode);
        const created = await lecturerService.createAssessment({
          title: title.trim(),
          type,
          courseId,
          lessonId: lessonId || null,
          durationMinutes,
        });

        if (mode === 'AUTHOR') {
          toast.success('Khởi tạo bài tập thành công! Bắt đầu soạn câu hỏi.');
          navigate(`/lecturer/assignments/${created.id}/questions`);
        } else {
          toast.success('Đã khởi tạo khung bài tập và lưu vào danh sách bản nháp.');
          navigate('/lecturer/assignments');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo bài tập.';
        toast.error(msg);
        setSubmittingMode(null);
      }
    },
    [title, courseId, lessonId, type, durationMinutes, navigate],
  );

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      executeCreate('AUTHOR');
    },
    [executeCreate],
  );

  const handleCreateAndBackToList = useCallback(() => {
    executeCreate('LIST');
  }, [executeCreate]);

  return (
    <div className="tku-create-asg-page">
      {/* 1. Header Navigation Bar */}
      <header className="tku-create-asg-header">
        <div className="tku-create-asg-header__titles">
          <h1 className="tku-create-asg-title">Khởi tạo Bài tập & Đề kiểm tra mới</h1>
          <p className="tku-create-asg-subtitle">
            Cấu hình thông tin cơ bản, chọn khóa học và hình thức kiểm tra. Sau khi tạo, bạn sẽ được đưa đến quy trình biên soạn 3 bước chuyên nghiệp: <strong>1. Soạn câu hỏi → 2. Thiết lập đáp án & thang điểm → 3. Giao bài</strong>.
          </p>
        </div>
      </header>

      {/* 2. Main Content Layout (Form Grid: Left Form + Right Sidebar) */}
      <form className="tku-create-asg-layout" onSubmit={handleSubmit}>
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
                  Đặt tên bài kiểm tra và chỉ định khóa học hoặc bài học áp dụng.
                </p>
              </div>
            </div>

            <div className="tku-create-card__body">
              {/* Assignment Title */}
              <div className="tku-form-group">
                <label className="tku-form-label" htmlFor="asg-title-input">
                  Tiêu đề bài tập / đề kiểm tra <span className="tku-form-required">*</span>
                </label>
                <input
                  id="asg-title-input"
                  type="text"
                  className="tku-form-input tku-create-input-lg"
                  placeholder="Ví dụ: Kiểm tra 15 phút: Cấu tạo nguyên tử & Bảng tuần hoàn..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
                
                {/* Title Suggestions */}
                <div className="tku-title-suggestions">
                  <span className="tku-title-suggestions__label">Gợi ý nhanh:</span>
                  <div className="tku-title-suggestions__list">
                    {TITLE_SUGGESTIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="tku-title-suggestion-chip"
                        onClick={() => setTitle(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Course Selection */}
              <div className="tku-form-row">
                <div className="tku-form-group">
                  <label className="tku-form-label" htmlFor="asg-course-select">
                    Khóa học áp dụng <span className="tku-form-required">*</span>
                  </label>
                  <div className="tku-create-select-wrap">
                    <select
                      id="asg-course-select"
                      className="tku-form-select"
                      value={courseId}
                      onChange={(e) => handleCourseChange(e.target.value)}
                      disabled={isLoadingCourses}
                    >
                      {isLoadingCourses ? (
                        <option value="">Đang tải danh sách khóa học...</option>
                      ) : courses.length === 0 ? (
                        <option value="">Chưa có khóa học nào</option>
                      ) : (
                        courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title} ({c.studentCount} học viên)
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown size={14} className="tku-create-select-icon" />
                  </div>
                  {courses.length === 0 && !isLoadingCourses && (
                    <p className="tku-form-hint tku-text-warning">
                      Bạn chưa tạo khóa học nào. Hãy vào mục <Link to="/lecturer/courses">Khóa học của tôi</Link> để tạo trước.
                    </p>
                  )}
                </div>

                {/* Scope: Whole course or specific lesson */}
                <div className="tku-form-group">
                  <label className="tku-form-label" htmlFor="asg-lesson-select">
                    Phạm vi bài học (Tùy chọn)
                  </label>
                  <div className="tku-create-select-wrap">
                    <select
                      id="asg-lesson-select"
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
                      ? 'Bài tập sẽ gắn trực tiếp sau video bài học này.'
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
                  Lựa chọn loại hình phù hợp với mục tiêu kiểm tra năng lực của học sinh.
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
                        onClick={() => handleSelectType(opt.type)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleSelectType(opt.type);
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
                <label className="tku-form-label" htmlFor="asg-duration-input">
                  Thời lượng làm bài (phút) <span className="tku-form-required">*</span>
                </label>
                <div className="tku-duration-row">
                  <div className="tku-duration-input-wrap">
                    <Clock size={16} className="tku-duration-input-icon" />
                    <input
                      id="asg-duration-input"
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
                  Học sinh sẽ có bộ đếm ngược tự động tương ứng khi vào làm bài thi.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Summary & 3-Step Roadmap Preview */}
        <aside className="tku-create-asg-sidebar">
          <div className="tku-create-summary-card">
            <h3 className="tku-summary-card__title">
              <FilePenLine size={18} />
              <span>Tóm tắt thiết lập</span>
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
            </div>

            {/* Workflow Roadmap */}
            <div className="tku-summary-roadmap">
              <h4 className="tku-roadmap-title">
                <Layers size={14} />
                <span>Quy trình 3 bước sau khi khởi tạo</span>
              </h4>

              <div className="tku-roadmap-steps">
                <div className="tku-roadmap-step tku-roadmap-step--active">
                  <div className="tku-roadmap-step__num">1</div>
                  <div className="tku-roadmap-step__content">
                    <span className="tku-roadmap-step__name">Soạn câu hỏi & phân bổ điểm</span>
                    <span className="tku-roadmap-step__desc">Nhập nội dung, đáp án trắc nghiệm hoặc tự luận</span>
                  </div>
                </div>

                <div className="tku-roadmap-step">
                  <div className="tku-roadmap-step__num">2</div>
                  <div className="tku-roadmap-step__content">
                    <span className="tku-roadmap-step__name">Thiết lập đáp án & thang điểm</span>
                    <span className="tku-roadmap-step__desc">Chỉ định đáp án đúng, điểm số và lời giải chi tiết</span>
                  </div>
                </div>

                <div className="tku-roadmap-step">
                  <div className="tku-roadmap-step__num">3</div>
                  <div className="tku-roadmap-step__content">
                    <span className="tku-roadmap-step__name">Giao bài cho học sinh</span>
                    <span className="tku-roadmap-step__desc">Đặt hạn nộp, cài đặt làm lại và kích hoạt làm bài</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="tku-summary-actions">
              <button
                type="submit"
                className="tku-btn-submit-create"
                disabled={submittingMode !== null || !title.trim() || !courseId}
              >
                {submittingMode === 'AUTHOR' ? (
                  <>
                    <Loader2 size={16} className="tku-spin-icon" />
                    <span>Đang khởi tạo bài tập...</span>
                  </>
                ) : (
                  <>
                    <span>Tạo bài & Soạn câu hỏi</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                className="tku-btn-secondary-create"
                onClick={handleCreateAndBackToList}
                disabled={submittingMode !== null || !title.trim() || !courseId}
                title="Lưu khung đề thi vào danh sách bản nháp và biên soạn sau"
              >
                {submittingMode === 'LIST' ? (
                  <>
                    <Loader2 size={15} className="tku-spin-icon" />
                    <span>Đang lưu bản nháp...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Chỉ tạo & Về danh sách</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default LecturerCreateAssignmentPage;
