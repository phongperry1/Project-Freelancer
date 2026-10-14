import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  BookOpen,
  Video,
  Eye,
  EyeOff,
  Search,
  RotateCw,
  ChevronDown,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  User as UserIcon,
  Layers,
} from 'lucide-react';
import {
  adminService,
  type AdminCourseItem,
  type AdminCoursesResponse,
  type AdminCourseDetail,
  type CourseChapter,
  type CourseLesson,
} from '../../services/admin.service';
import { useSearchParams } from 'react-router-dom';
import { toast } from '../../context/toastService';
import './adminContent.css';

const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url
    .trim()
    .match(
      /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/,
    );
  return match?.[1]
    ? `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`
    : null;
};

const isDirectVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return /\.(mp4|webm|ogg)($|\?)/i.test(url);
};

export const AdminContentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryCourseId = searchParams.get('courseId');

  const [data, setData] = useState<AdminCoursesResponse | null>(null);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);

  // Search & Filter
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected Course & Detail
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseDetail, setCourseDetail] = useState<AdminCourseDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Accordion Chapters
  const [openChapterIds, setOpenChapterIds] = useState<Record<string, boolean>>({});

  // Preview Lesson Modal
  const [previewLesson, setPreviewLesson] = useState<CourseLesson | null>(null);

  // Confirm Toggle Status Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);

  // 1. Initial Load Courses (Không gọi setState đồng bộ trong effect để tránh cascading renders)
  useEffect(() => {
    let isMounted = true;

    adminService
      .getCoursesList()
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        if (res.courses.length > 0) {
          setSelectedCourseId((prevId) => {
            const targetId = queryCourseId || prevId;
            const exists = res.courses.some((c) => c.id === targetId);
            return exists ? (targetId as string) : res.courses[0].id;
          });
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setListError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách nội dung khóa học.',
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingList(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [queryCourseId]);

  // Hàm thủ công tải lại danh sách (dùng cho nút Thử lại)
  const handleRefreshList = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const res = await adminService.getCoursesList();
      setData(res);
      if (res.courses.length > 0) {
        setSelectedCourseId((prevId) => {
          const exists = res.courses.some((c) => c.id === prevId);
          return exists ? prevId : res.courses[0].id;
        });
      }
    } catch (err: unknown) {
      setListError(
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách nội dung khóa học.',
      );
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // 2. Load Course Detail when selectedCourseId changes (Không gọi setState đồng bộ trong effect)
  useEffect(() => {
    if (!selectedCourseId) {
      return;
    }

    let isMounted = true;

    adminService
      .getCourseById(selectedCourseId)
      .then((detail) => {
        if (!isMounted) return;
        setCourseDetail(detail);

        // Auto-open first chapter
        const initialOpen: Record<string, boolean> = {};
        if (detail.chapters && detail.chapters.length > 0) {
          detail.chapters.forEach((ch, idx) => {
            if (idx === 0) initialOpen[ch.id] = true;
          });
        }
        setOpenChapterIds(initialOpen);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setDetailError(
          err instanceof Error
            ? err.message
            : 'Không thể tải chi tiết giáo trình khóa học.',
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingDetail(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCourseId]);

  // Chọn khóa học mới từ danh sách
  const handleSelectCourse = useCallback((courseId: string) => {
    setSelectedCourseId((prev) => {
      if (prev === courseId) return prev;
      setIsLoadingDetail(true);
      setDetailError(null);
      return courseId;
    });
  }, []);

  // Thử lại khi tải chi tiết giáo trình thất bại
  const handleRetryDetail = useCallback(async () => {
    if (!selectedCourseId) return;
    setIsLoadingDetail(true);
    setDetailError(null);
    try {
      const detail = await adminService.getCourseById(selectedCourseId);
      setCourseDetail(detail);

      const initialOpen: Record<string, boolean> = {};
      if (detail.chapters && detail.chapters.length > 0) {
        detail.chapters.forEach((ch, idx) => {
          if (idx === 0) initialOpen[ch.id] = true;
        });
      }
      setOpenChapterIds(initialOpen);
    } catch (err: unknown) {
      setDetailError(
        err instanceof Error
          ? err.message
          : 'Không thể tải chi tiết giáo trình khóa học.',
      );
    } finally {
      setIsLoadingDetail(false);
    }
  }, [selectedCourseId]);

  // Filtered courses - tối ưu hóa với React Compiler memoization
  const rawCourses = data?.courses;
  const filteredCourses = useMemo(() => {
    if (!rawCourses) return [];
    const query = searchKeyword.trim().toLowerCase();

    return rawCourses.filter((course: AdminCourseItem) => {
      const matchKeyword =
        !query ||
        course.title.toLowerCase().includes(query) ||
        (course.teacherName &&
          course.teacherName.toLowerCase().includes(query));

      const matchTeacher =
        teacherFilter === 'ALL' || course.teacherId === teacherFilter;

      const matchStatus =
        statusFilter === 'ALL' || course.status === statusFilter;

      return matchKeyword && matchTeacher && matchStatus;
    });
  }, [rawCourses, searchKeyword, teacherFilter, statusFilter]);

  // Quick stats - Tối ưu tính toán 1 lần duy nhất bằng vòng lặp O(n) thay vì filter lặp lại
  const { totalCourses, activeCourses, hiddenCourses, teachersCount } = useMemo(() => {
    const courses = data?.courses || [];
    let active = 0;
    let hidden = 0;
    for (const c of courses) {
      if (c.status === 'ACTIVE') active++;
      else if (c.status === 'HIDDEN') hidden++;
    }
    return {
      totalCourses: courses.length,
      activeCourses: active,
      hiddenCourses: hidden,
      teachersCount: data?.teachers.length || 0,
    };
  }, [data]);

  // Current course lesson stats - Gộp 1 lần tính toán duy nhất thay vì 2 lần reduce/filter
  const { totalLessonsInSelected, publishedLessonsInSelected } = useMemo(() => {
    if (!courseDetail?.chapters) {
      return { totalLessonsInSelected: 0, publishedLessonsInSelected: 0 };
    }
    let total = 0;
    let published = 0;
    for (const ch of courseDetail.chapters) {
      if (ch.lessons) {
        total += ch.lessons.length;
        for (const l of ch.lessons) {
          if (l.status === 'PUBLISHED') published++;
        }
      }
    }
    return { totalLessonsInSelected: total, publishedLessonsInSelected: published };
  }, [courseDetail]);

  // Toggle chapter
  const toggleChapter = useCallback((chapterId: string) => {
    setOpenChapterIds((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  }, []);

  // Expand / collapse all - Functional state update không cần phụ thuộc vào openChapterIds
  const toggleAllChapters = useCallback(() => {
    if (!courseDetail?.chapters) return;
    setOpenChapterIds((prev) => {
      const allOpen = courseDetail.chapters.every((ch) => prev[ch.id]);
      const newState: Record<string, boolean> = {};
      courseDetail.chapters.forEach((ch) => {
        newState[ch.id] = !allOpen;
      });
      return newState;
    });
  }, [courseDetail]);

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setSearchKeyword('');
    setTeacherFilter('ALL');
    setStatusFilter('ALL');
  }, []);

  // Toggle visibility of course (ACTIVE <-> HIDDEN)
  const handleToggleCourseVisibility = useCallback(async () => {
    if (!courseDetail) return;
    const nextStatus: 'ACTIVE' | 'HIDDEN' =
      courseDetail.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';

    setIsTogglingStatus(true);
    try {
      await adminService.updateCourse(courseDetail.id, { status: nextStatus });

      setCourseDetail((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      setData((prev) => {
        if (!prev) return prev;
        const updated = prev.courses.map((item) => {
          if (item.id === courseDetail.id) {
            return {
              ...item,
              status: nextStatus,
              statusText: nextStatus === 'HIDDEN' ? 'Đã ẩn' : 'Đang hoạt động',
            };
          }
          return item;
        });
        return { ...prev, courses: updated };
      });

      toast.success(
        nextStatus === 'ACTIVE'
          ? `Đã hiện nội dung khóa học "${courseDetail.title}".`
          : `Đã ẩn nội dung khóa học "${courseDetail.title}".`,
      );
      setIsConfirmModalOpen(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật trạng thái hiển thị của khóa học.',
      );
    } finally {
      setIsTogglingStatus(false);
    }
  }, [courseDetail]);

  return (
    <div className="tku-content-page">
      {/* 1. Header chuẩn đồng bộ với TKU Admin */}
      <header className="tku-admin-header">
        <div className="tku-admin-header__titles">
          <h1 className="tku-admin-header__title">Nội dung khóa học</h1>
          <p className="tku-admin-header__subtitle">
            Theo dõi cấu trúc giáo trình học thuật, bài giảng và kiểm soát trạng thái hiển thị.
          </p>
        </div>
      </header>

      <div className="tku-content-content">
        {isLoadingList ? (
          <div className="tku-admin-loading-wrapper">
            <div className="tku-admin-spinner" />
            <span>Đang tải danh mục nội dung khóa học...</span>
          </div>
        ) : listError ? (
          <div className="tku-content-card">
            <div className="tku-content-no-content-state">
              <AlertCircle size={32} color="#ef4444" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Không thể tải dữ liệu
              </h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', margin: '4px 0 14px' }}>
                {listError}
              </p>
              <button
                type="button"
                className="tku-content-reset-btn"
                onClick={handleRefreshList}
              >
                <RotateCw size={14} />
                <span>Thử lại</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 2. Banner xanh TKU chuẩn mực */}
            <section className="tku-content-banner">
              <div className="tku-content-banner__content">
                <h2 className="tku-content-banner__title">
                  Kiểm duyệt & Theo dõi nội dung đào tạo
                </h2>
                <p className="tku-content-banner__desc">
                  Theo dõi tiến trình giáo trình do giảng viên biên soạn và điều chỉnh trạng thái hiển thị của khóa học.
                </p>
              </div>
            </section>

            {/* 3. Stats Grid đồng bộ với TKU Users Page */}
            <div className="tku-content-stats-grid">
              <div className="tku-content-stat-card">
                <div className="tku-content-stat-card__icon tku-content-stat-card__icon--blue">
                  <BookOpen size={22} />
                </div>
                <div className="tku-content-stat-card__info">
                  <span className="tku-content-stat-card__label">Tổng khóa học</span>
                  <span className="tku-content-stat-card__value">
                    {totalCourses.toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              <div className="tku-content-stat-card">
                <div className="tku-content-stat-card__icon tku-content-stat-card__icon--emerald">
                  <CheckCircle2 size={22} />
                </div>
                <div className="tku-content-stat-card__info">
                  <span className="tku-content-stat-card__label">Đang hiển thị</span>
                  <span className="tku-content-stat-card__value">
                    {activeCourses.toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              <div className="tku-content-stat-card">
                <div className="tku-content-stat-card__icon tku-content-stat-card__icon--amber">
                  <EyeOff size={22} />
                </div>
                <div className="tku-content-stat-card__info">
                  <span className="tku-content-stat-card__label">Đã ẩn nội dung</span>
                  <span className="tku-content-stat-card__value">
                    {hiddenCourses.toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              <div className="tku-content-stat-card">
                <div className="tku-content-stat-card__icon tku-content-stat-card__icon--purple">
                  <GraduationCap size={22} />
                </div>
                <div className="tku-content-stat-card__info">
                  <span className="tku-content-stat-card__label">Giảng viên phụ trách</span>
                  <span className="tku-content-stat-card__value">
                    {teachersCount.toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Filter Bar phẳng, chuẩn TKU Courses & Users */}
            <div className="tku-content-filter-bar">
              <div className="tku-content-search-wrap">
                <Search size={16} className="tku-content-search-icon" />
                <input
                  type="text"
                  className="tku-content-search-input"
                  placeholder="Tìm theo tên khóa học hoặc giảng viên..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
                {searchKeyword && (
                  <button
                    type="button"
                    className="tku-content-search-clear"
                    onClick={() => setSearchKeyword('')}
                    title="Xóa tìm kiếm"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="tku-content-select-wrap">
                <select
                  className="tku-content-select"
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả giảng viên</option>
                  {data?.teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="tku-content-select-icon" />
              </div>

              <div className="tku-content-select-wrap">
                <select
                  className="tku-content-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hiển thị</option>
                  <option value="HIDDEN">Đã ẩn</option>
                </select>
                <ChevronDown size={14} className="tku-content-select-icon" />
              </div>

              {(searchKeyword || teacherFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  className="tku-content-reset-btn"
                  onClick={handleResetFilters}
                >
                  <RotateCw size={13} />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>

            {/* 5. Master - Detail Layout (Tỷ lệ học thuật tối giản) */}
            <div className="tku-content-main-layout">
              {/* Cột Trái: Danh Mục Khóa Học */}
              <aside className="tku-content-courses-panel">
                <div className="tku-content-panel-header">
                  <span className="tku-content-panel-title">Danh mục khóa học</span>
                  <span className="tku-content-panel-count">
                    {filteredCourses.length} khóa
                  </span>
                </div>

                <div className="tku-content-panel-list">
                  {filteredCourses.length === 0 ? (
                    <div className="tku-content-no-content-state" style={{ padding: '36px 16px' }}>
                      <BookOpen size={26} />
                      <span style={{ fontSize: '13px' }}>Không có khóa học phù hợp</span>
                    </div>
                  ) : (
                    filteredCourses.map((c) => {
                      const isSelected = c.id === selectedCourseId;
                      return (
                        <div
                          key={c.id}
                          className={`tku-content-course-item ${
                            isSelected ? 'tku-content-course-item--active' : ''
                          }`}
                          onClick={() => handleSelectCourse(c.id)}
                        >
                          <div className="tku-content-course-thumb">
                            {c.thumbnailUrl ? (
                              <img src={c.thumbnailUrl} alt={c.title} />
                            ) : (
                              <BookOpen size={18} color="#94a3b8" />
                            )}
                          </div>

                          <div className="tku-content-course-meta">
                            <h4 className="tku-content-course-title" title={c.title}>
                              {c.title}
                            </h4>
                            <span className="tku-content-course-sub">
                              <UserIcon size={11} />
                              <span>{c.teacherName || 'Chưa phân công'}</span>
                            </span>

                            <div className="tku-content-course-bottom">
                              <span className="tku-content-course-stats">
                                {c.lessonCount} bài • {c.studentCount} học viên
                              </span>
                              <span
                                className={`tku-dot-badge ${
                                  c.status === 'ACTIVE'
                                    ? 'tku-dot-badge--active'
                                    : 'tku-dot-badge--hidden'
                                }`}
                              >
                                <span className="tku-dot-badge__circle" />
                                <span>{c.status === 'ACTIVE' ? 'Hiển thị' : 'Đã ẩn'}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </aside>

              {/* Cột Phải: Khung Chi Tiết Giáo Trình */}
              <main className="tku-content-curriculum-panel">
                {isLoadingDetail ? (
                  <div className="tku-content-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <div className="tku-admin-spinner" style={{ margin: '0 auto 14px' }} />
                    <span style={{ color: '#64748b', fontSize: '13.5px' }}>
                      Đang tải cấu trúc giáo trình học thuật...
                    </span>
                  </div>
                ) : detailError ? (
                  <div className="tku-content-card">
                    <div className="tku-content-no-content-state">
                      <AlertCircle size={32} color="#ef4444" />
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        Không thể tải giáo trình
                      </h3>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 12px' }}>
                        {detailError}
                      </p>
                      {selectedCourseId && (
                        <button
                          type="button"
                          className="tku-content-reset-btn"
                          onClick={handleRetryDetail}
                        >
                          <RotateCw size={13} />
                          <span>Thử lại</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : courseDetail ? (
                  <>
                    {/* Hero Header Khóa Học */}
                    <div className="tku-content-card">
                      <div className="tku-content-hero-header">
                        <div className="tku-content-hero-left">
                          <div className="tku-content-hero-img-box">
                            {courseDetail.thumbnailUrl ? (
                              <img src={courseDetail.thumbnailUrl} alt={courseDetail.title} />
                            ) : (
                              <BookOpen size={24} color="#94a3b8" />
                            )}
                          </div>

                          <div className="tku-content-hero-info">
                            <div className="tku-content-hero-tags">
                              <span className="tku-content-academic-pill">
                                Giáo trình học thuật
                              </span>
                              <span
                                className={`tku-dot-badge ${
                                  courseDetail.status === 'ACTIVE'
                                    ? 'tku-dot-badge--active'
                                    : 'tku-dot-badge--hidden'
                                }`}
                              >
                                <span className="tku-dot-badge__circle" />
                                <span>
                                  {courseDetail.status === 'ACTIVE'
                                    ? 'Đang hiển thị'
                                    : 'Nội dung đang bị ẩn'}
                                </span>
                              </span>
                            </div>

                            <h2 className="tku-content-hero-main-title">
                              {courseDetail.title}
                            </h2>

                            <span className="tku-content-hero-teacher-line">
                              <GraduationCap size={14} color="#1d68f2" />
                              <span>Giảng viên phụ trách:</span>
                              <strong>
                                {courseDetail.teacher?.fullName || 'Chưa phân công'}
                              </strong>
                              <span>•</span>
                              <span>{courseDetail._count?.enrollments || 0} học viên</span>
                            </span>
                          </div>
                        </div>

                        {/* Nút Admin Toggle Ẩn / Hiện */}
                        <button
                          type="button"
                          className={`tku-content-action-btn ${
                            courseDetail.status === 'ACTIVE'
                              ? 'tku-content-action-btn--hide'
                              : 'tku-content-action-btn--show'
                          }`}
                          onClick={() => setIsConfirmModalOpen(true)}
                        >
                          {courseDetail.status === 'ACTIVE' ? (
                            <>
                              <EyeOff size={15} />
                              <span>Ẩn nội dung khóa học</span>
                            </>
                          ) : (
                            <>
                              <Eye size={15} />
                              <span>Hiện nội dung khóa học</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Header Giáo Trình */}
                      <div className="tku-content-curriculum-header">
                        <div className="tku-content-curriculum-title-group">
                          <h3 className="tku-content-curriculum-title">
                            Cấu trúc giáo trình
                          </h3>
                          <span className="tku-content-curriculum-summary">
                            {courseDetail.chapters?.length || 0} chương • {totalLessonsInSelected} bài học ({publishedLessonsInSelected} đã xuất bản)
                          </span>
                        </div>

                        {courseDetail.chapters && courseDetail.chapters.length > 0 && (
                          <button
                            type="button"
                            className="tku-content-expand-btn"
                            onClick={toggleAllChapters}
                          >
                            <Layers size={13} />
                            <span>Đóng / Mở tất cả</span>
                          </button>
                        )}
                      </div>

                      {/* Danh Sách Các Chương & Bài Giảng */}
                      <div className="tku-content-chapters-body">
                        {!courseDetail.chapters || courseDetail.chapters.length === 0 ? (
                          <div className="tku-content-no-content-state">
                            <BookOpen size={28} />
                            <h4 style={{ fontSize: '15px', color: '#0f172a', margin: 0 }}>
                              Khóa học chưa có giáo trình
                            </h4>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                              Giảng viên phụ trách ({courseDetail.teacher?.fullName || 'Chưa phân công'}) chưa cập nhật chương học nào.
                            </p>
                          </div>
                        ) : (
                          courseDetail.chapters.map((ch: CourseChapter, idx: number) => {
                            const isOpen = !!openChapterIds[ch.id];
                            return (
                              <div
                                key={ch.id}
                                className={`tku-content-chapter-block ${
                                  isOpen ? 'tku-content-chapter-block--open' : ''
                                }`}
                              >
                                <button
                                  type="button"
                                  className="tku-content-chapter-bar"
                                  onClick={() => toggleChapter(ch.id)}
                                >
                                  <div className="tku-content-chapter-bar-left">
                                    <span className="tku-content-chapter-num">
                                      Chương {idx + 1}
                                    </span>
                                    <span className="tku-content-chapter-name">
                                      {ch.title}
                                    </span>
                                  </div>

                                  <div className="tku-content-chapter-bar-right">
                                    <span className="tku-content-lesson-count-tag">
                                      {ch.lessons?.length || 0} bài học
                                    </span>
                                    <ChevronDown
                                      size={16}
                                      className={`tku-content-chevron ${
                                        isOpen ? 'tku-content-chevron--open' : ''
                                      }`}
                                    />
                                  </div>
                                </button>

                                {isOpen && (
                                  <div>
                                    {!ch.lessons || ch.lessons.length === 0 ? (
                                      <div className="tku-content-empty-block">
                                        Chương này chưa có bài học nào được tải lên.
                                      </div>
                                    ) : (
                                      ch.lessons.map((lesson: CourseLesson, lIdx: number) => (
                                        <div key={lesson.id} className="tku-content-lesson-item">
                                          <div className="tku-content-lesson-left">
                                            <span className="tku-content-lesson-idx">
                                              {lIdx + 1 < 10 ? `0${lIdx + 1}` : lIdx + 1}
                                            </span>
                                            <div
                                              className={`tku-content-lesson-type-icon ${
                                                lesson.videoUrl
                                                  ? 'tku-content-lesson-type-icon--video'
                                                  : 'tku-content-lesson-type-icon--doc'
                                              }`}
                                            >
                                              {lesson.videoUrl ? (
                                                <Video size={14} />
                                              ) : (
                                                <FileText size={14} />
                                              )}
                                            </div>
                                            <span className="tku-content-lesson-name">
                                              {lesson.title}
                                            </span>
                                          </div>

                                          <div className="tku-content-lesson-right">
                                            {lesson.videoUrl && (
                                              <span className="tku-content-type-badge tku-content-type-badge--video">
                                                Video
                                              </span>
                                            )}

                                            <button
                                              type="button"
                                              className="tku-content-view-btn"
                                              onClick={() => setPreviewLesson(lesson)}
                                            >
                                              <Eye size={12} />
                                              <span>Xem nội dung</span>
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="tku-content-card">
                    <div className="tku-content-no-content-state" style={{ padding: '60px 24px' }}>
                      <BookOpen size={36} />
                      <h4 style={{ fontSize: '16px', color: '#0f172a', margin: '4px 0' }}>
                        Chưa chọn khóa học
                      </h4>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                        Vui lòng nhấp vào một khóa học bên danh mục để xem giáo trình chi tiết.
                      </p>
                    </div>
                  </div>
                )}
              </main>
            </div>
          </>
        )}
      </div>

      {/* Modal 1: Preview Lesson (Xem trước video & tài liệu bài học) */}
      {previewLesson && (
        <div className="tku-content-modal-overlay" onClick={() => setPreviewLesson(null)}>
          <div
            className="tku-content-modal-box tku-content-modal-box--preview"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tku-content-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="tku-content-modal-title">{previewLesson.title}</h3>
              </div>
              <button
                type="button"
                className="tku-content-modal-close"
                onClick={() => setPreviewLesson(null)}
              >
                <X size={17} />
              </button>
            </div>

            <div className="tku-content-modal-body">
              {/* Video Player */}
              {previewLesson.videoUrl ? (
                <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                  {getYouTubeEmbedUrl(previewLesson.videoUrl) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(previewLesson.videoUrl)!}
                      title={previewLesson.title}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : isDirectVideoUrl(previewLesson.videoUrl) ? (
                    <video
                      src={previewLesson.videoUrl}
                      controls
                      style={{ width: '100%', height: '100%' }}
                    >
                      Trình duyệt không hỗ trợ xem video.
                    </video>
                  ) : (
                    <div style={{ padding: '28px', textAlign: 'center', color: '#fff' }}>
                      <Video size={36} style={{ margin: '0 auto 10px' }} />
                      <p style={{ margin: '0 0 12px', fontSize: '13.5px' }}>
                        Video bài giảng lưu trữ tại nguồn bên ngoài:
                      </p>
                      <a
                        href={previewLesson.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tku-content-view-btn"
                        style={{ height: '34px', padding: '0 16px', background: '#1d68f2', color: '#fff', border: 'none' }}
                      >
                        <span>Mở liên kết video</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '28px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b' }}>
                  <FileText size={28} style={{ margin: '0 auto 6px' }} />
                  <span style={{ fontSize: '13px' }}>Bài giảng lý thuyết (Không có video)</span>
                </div>
              )}

              {/* Tóm tắt nội dung */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  Tóm tắt kiến thức / Nội dung bài học:
                </span>
                {previewLesson.content ? (
                  <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #f1f5f9', whiteSpace: 'pre-wrap' }}>
                    {previewLesson.content}
                  </p>
                ) : (
                  <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                    Chưa có tóm tắt lý thuyết cho bài học này.
                  </p>
                )}
              </div>
            </div>

            <div className="tku-content-modal-footer">
              <button
                type="button"
                className="tku-content-cancel-btn"
                onClick={() => setPreviewLesson(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Xác nhận Ẩn / Hiện nội dung khóa học (Giao diện chuẩn học thuật, hiện đại) */}
      {isConfirmModalOpen && courseDetail && (
        <div
          className="tku-content-modal-overlay"
          onClick={() => !isTogglingStatus && setIsConfirmModalOpen(false)}
        >
          <div
            className="tku-content-modal-box tku-content-modal-box--confirm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header với Icon trực quan & Phụ đề rõ ràng */}
            <div className="tku-confirm-modal-header">
              <div
                className={`tku-confirm-modal-icon ${
                  courseDetail.status === 'ACTIVE'
                    ? 'tku-confirm-modal-icon--danger'
                    : 'tku-confirm-modal-icon--success'
                }`}
              >
                {courseDetail.status === 'ACTIVE' ? (
                  <EyeOff size={22} />
                ) : (
                  <Eye size={22} />
                )}
              </div>
              <div className="tku-confirm-modal-header-text">
                <h3 className="tku-confirm-modal-title">
                  {courseDetail.status === 'ACTIVE'
                    ? 'Ẩn nội dung khóa học'
                    : 'Kích hoạt hiển thị khóa học'}
                </h3>
                <p className="tku-confirm-modal-subtitle">
                  {courseDetail.status === 'ACTIVE'
                    ? 'Khóa học sẽ tạm ngưng khả dụng đối với học viên.'
                    : 'Khóa học sẽ được công khai trở lại trên hệ thống.'}
                </p>
              </div>
              <button
                type="button"
                className="tku-content-modal-close"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isTogglingStatus}
                title="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thân Modal */}
            <div className="tku-confirm-modal-body">
              {/* Thẻ vắn tắt thông tin khóa học */}
              <div className="tku-confirm-course-card">
                <div className="tku-confirm-course-thumb">
                  {courseDetail.thumbnailUrl ? (
                    <img src={courseDetail.thumbnailUrl} alt={courseDetail.title} />
                  ) : (
                    <BookOpen size={20} color="#94a3b8" />
                  )}
                </div>
                <div className="tku-confirm-course-info">
                  <h4 className="tku-confirm-course-title" title={courseDetail.title}>
                    {courseDetail.title}
                  </h4>
                  <span className="tku-confirm-course-teacher">
                    <UserIcon size={12} />
                    <span>{courseDetail.teacher?.fullName || 'Chưa phân công giảng viên'}</span>
                  </span>
                </div>
              </div>

              {/* Callout box lưu ý bảo toàn giáo trình */}
              {courseDetail.status === 'ACTIVE' ? (
                <div className="tku-confirm-callout tku-confirm-callout--danger">
                  <AlertCircle size={18} className="tku-confirm-callout-icon" />
                  <div className="tku-confirm-callout-content">
                    <span className="tku-confirm-callout-title">Lưu ý khi ẩn nội dung:</span>
                    <p className="tku-confirm-callout-text">
                      Học viên sẽ không thể tìm thấy hoặc xem các bài giảng của khóa học này trên hệ thống. Dữ liệu giáo trình của giảng viên vẫn được bảo lưu an toàn.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="tku-confirm-callout tku-confirm-callout--success">
                  <CheckCircle2 size={18} className="tku-confirm-callout-icon" />
                  <div className="tku-confirm-callout-content">
                    <span className="tku-confirm-callout-title">Khôi phục hiển thị:</span>
                    <p className="tku-confirm-callout-text">
                      Khóa học sẽ hiển thị trở lại và cho phép học viên truy cập bài giảng và học tập bình thường.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer nút hành động */}
            <div className="tku-confirm-modal-footer">
              <button
                type="button"
                className="tku-confirm-btn-cancel"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isTogglingStatus}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`tku-confirm-btn-action ${
                  courseDetail.status === 'ACTIVE'
                    ? 'tku-confirm-btn-action--danger'
                    : 'tku-confirm-btn-action--success'
                }`}
                onClick={handleToggleCourseVisibility}
                disabled={isTogglingStatus}
              >
                {isTogglingStatus ? (
                  <>
                    <RotateCw size={14} className="tku-admin-spinner" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : courseDetail.status === 'ACTIVE' ? (
                  <>
                    <EyeOff size={14} />
                    <span>Xác nhận ẩn</span>
                  </>
                ) : (
                  <>
                    <Eye size={14} />
                    <span>Xác nhận hiện</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContentPage;
