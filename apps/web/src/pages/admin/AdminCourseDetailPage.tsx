import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Users,
  Edit3,
  ChevronDown,
  Video,
  X,
  AlertCircle,
  RotateCw,
  GraduationCap,
  Layers,
} from 'lucide-react';
import {
  adminService,
  type AdminCourseDetail,
} from '../../services/admin.service';
import { toast } from '../../context/toastService';
import './adminCourseDetail.css';

export const AdminCourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [course, setCourse] = useState<AdminCourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openChapterIds, setOpenChapterIds] = useState<Record<string, boolean>>({});

  const [isAddChapterModalOpen, setIsAddChapterModalOpen] = useState<boolean>(false);
  const [chapterTitle, setChapterTitle] = useState<string>('');
  const [chapterOrder, setChapterOrder] = useState<number>(1);
  const [isAddingChapter, setIsAddingChapter] = useState<boolean>(false);

  const applyCourseData = useCallback(
    (courseData: AdminCourseDetail) => {
      setCourse(courseData);

      const initialOpen: Record<string, boolean> = {};
      if (courseData.chapters && courseData.chapters.length > 0) {
        courseData.chapters.forEach((ch, idx) => {
          if (idx === 0) initialOpen[ch.id] = true;
        });
      }
      setOpenChapterIds(initialOpen);
      setChapterOrder((courseData.chapters?.length || 0) + 1);
    },
    [],
  );

  const fetchCourseData = useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    adminService
      .getCourseById(id)
      .then((courseData) => {
        applyCourseData(courseData);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải thông tin chi tiết khóa học.',
        );
        setIsLoading(false);
      });
  }, [id, applyCourseData]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    adminService
      .getCourseById(id)
      .then((courseData) => {
        if (isMounted) {
          applyCourseData(courseData);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không thể tải thông tin chi tiết khóa học.',
          );
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, applyCourseData]);

  const toggleChapter = useCallback((chapterId: string) => {
    setOpenChapterIds((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  }, []);

  const totalLessons = useMemo(() => {
    if (!course || !course.chapters) return 0;
    return course.chapters.reduce(
      (acc, ch) => acc + (ch.lessons ? ch.lessons.length : 0),
      0,
    );
  }, [course]);

  const handleAddChapter = useCallback(async () => {
    if (!id || !chapterTitle.trim()) {
      toast.error('Vui lòng nhập tên chương học.');
      return;
    }
    setIsAddingChapter(true);
    try {
      await adminService.addChapter(id, {
        title: chapterTitle.trim(),
        sortOrder: chapterOrder,
      });
      toast.success('Thêm chương học mới thành công!');
      setChapterTitle('');
      setIsAddChapterModalOpen(false);
      fetchCourseData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể tạo chương học lúc này.',
      );
    } finally {
      setIsAddingChapter(false);
    }
  }, [id, chapterTitle, chapterOrder, fetchCourseData]);



  return (
    <div className="tku-detail-page">
      <header className="tku-detail-header">
        <div className="tku-detail-top-nav">
          <div className="tku-detail-breadcrumbs">
            <Link to="/admin">Dashboard</Link>
            <span className="tku-detail-breadcrumbs__sep">/</span>
            <Link to="/admin/courses">Khóa học</Link>
            <span className="tku-detail-breadcrumbs__sep">/</span>
            <span className="tku-detail-breadcrumbs__current">
              {course ? course.title : 'Chi tiết khóa học'}
            </span>
          </div>
        </div>
      </header>

      <div className="tku-detail-content">
        {isLoading ? (
          <div className="tku-admin-loading-wrapper">
            <div className="tku-admin-spinner" />
            <span>Đang tải thông tin chi tiết khóa học...</span>
          </div>
        ) : error ? (
          <div className="tku-detail-card">
            <div className="tku-detail-empty-box">
              <div
                className="tku-detail-empty-icon"
                style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
              >
                <AlertCircle size={28} />
              </div>
              <h3 className="tku-detail-empty-title">Không thể tải khóa học</h3>
              <p className="tku-detail-empty-desc">{error}</p>
              <button
                type="button"
                className="tku-detail-btn tku-detail-btn--secondary"
                onClick={fetchCourseData}
                style={{ marginTop: '12px' }}
              >
                <RotateCw size={14} />
                <span>Thử lại</span>
              </button>
            </div>
          </div>
        ) : course ? (
          <div className="tku-detail-layout">
            <div className="tku-detail-col-main">
              <div className="tku-detail-card tku-detail-hero">
                <div className="tku-detail-hero-top">
                  <div className="tku-detail-academic-badge">
                    <GraduationCap size={15} />
                    <span>Chương trình học thuật</span>
                  </div>
                  <Link
                    to={`/admin/courses/${course.id}/edit`}
                    className="tku-detail-btn-edit-sm"
                  >
                    <Edit3 size={13} />
                    <span>Chỉnh sửa</span>
                  </Link>
                </div>

                <h1 className="tku-detail-course-title">{course.title}</h1>

                <div className="tku-detail-teacher-pill">
                  <div className="tku-detail-teacher-avatar-sm">
                    {course.teacher?.fullName
                      ? course.teacher.fullName.slice(0, 1).toUpperCase()
                      : 'G'}
                  </div>
                  <span className="tku-detail-teacher-label">
                    Giảng viên:{' '}
                    <strong className="tku-detail-teacher-name-bold">
                      {course.teacher?.fullName || 'Chưa phân công'}
                    </strong>
                  </span>
                </div>

                <div className="tku-detail-stats-bar">
                  <div className="tku-detail-stat-item">
                    <div className="tku-detail-stat-icon tku-detail-stat-icon--blue">
                      <Layers size={20} />
                    </div>
                    <div className="tku-detail-stat-info">
                      <span className="tku-detail-stat-value">
                        {course.chapters?.length || 0}
                      </span>
                      <span className="tku-detail-stat-label">Chương học</span>
                    </div>
                  </div>

                  <div className="tku-detail-stat-item">
                    <div className="tku-detail-stat-icon tku-detail-stat-icon--emerald">
                      <FileText size={20} />
                    </div>
                    <div className="tku-detail-stat-info">
                      <span className="tku-detail-stat-value">{totalLessons}</span>
                      <span className="tku-detail-stat-label">Bài giảng</span>
                    </div>
                  </div>

                  <div className="tku-detail-stat-item">
                    <div className="tku-detail-stat-icon tku-detail-stat-icon--amber">
                      <Users size={20} />
                    </div>
                    <div className="tku-detail-stat-info">
                      <span className="tku-detail-stat-value">
                        {course._count?.enrollments || 0}
                      </span>
                      <span className="tku-detail-stat-label">Học viên</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tku-detail-card">
                <div className="tku-detail-section-header">
                  <div className="tku-detail-section-title-box">
                    <h2 className="tku-detail-section-title">
                      Giáo trình & Khung chương trình
                    </h2>
                    <p className="tku-detail-section-sub">
                      Danh sách các chương học và bài giảng theo cấu trúc sư phạm
                    </p>
                  </div>
                </div>

                <div className="tku-detail-syllabus-body">
                  {!course.chapters || course.chapters.length === 0 ? (
                    <div className="tku-detail-empty-box">
                      <div className="tku-detail-empty-icon">
                        <BookOpen size={28} />
                      </div>
                      <h3 className="tku-detail-empty-title">
                        Chưa có chương học nào
                      </h3>
                      <p className="tku-detail-empty-desc">
                        Khóa học này hiện chưa được thiết lập cấu trúc giáo trình.
                      </p>
                    </div>
                  ) : (
                    course.chapters.map((ch, idx) => {
                      const isOpen = Boolean(openChapterIds[ch.id]);
                      return (
                        <div
                          key={ch.id}
                          className={`tku-detail-chapter-card ${
                            isOpen ? 'tku-detail-chapter-card--open' : ''
                          }`}
                        >
                          <button
                            type="button"
                            className="tku-detail-chapter-header"
                            onClick={() => toggleChapter(ch.id)}
                          >
                            <div className="tku-detail-chapter-header-left">
                              <span className="tku-detail-chapter-tag">
                                Chương {idx + 1}
                              </span>
                              <span className="tku-detail-chapter-title">
                                {ch.title}
                              </span>
                            </div>
                            <div className="tku-detail-chapter-header-right">
                              <span className="tku-detail-lesson-badge">
                                {ch.lessons?.length || 0} bài học
                              </span>
                              <ChevronDown
                                size={18}
                                className={`tku-detail-chapter-chevron ${
                                  isOpen ? 'tku-detail-chapter-chevron--open' : ''
                                }`}
                              />
                            </div>
                          </button>

                          {isOpen && (
                            <div className="tku-detail-lesson-list">
                              {!ch.lessons || ch.lessons.length === 0 ? (
                                <div className="tku-detail-chapter-empty">
                                  Chương này hiện chưa có bài giảng nào được tải lên.
                                </div>
                              ) : (
                                ch.lessons.map((lesson, lessonIdx) => (
                                  <div
                                    key={lesson.id}
                                    className="tku-detail-lesson-row"
                                  >
                                    <div className="tku-detail-lesson-left">
                                      <span className="tku-detail-lesson-num">
                                        {lessonIdx + 1}
                                      </span>
                                      <div
                                        className={`tku-detail-lesson-icon ${
                                          lesson.videoUrl
                                            ? 'tku-detail-lesson-icon--video'
                                            : 'tku-detail-lesson-icon--doc'
                                        }`}
                                      >
                                        {lesson.videoUrl ? (
                                          <Video size={14} />
                                        ) : (
                                          <FileText size={14} />
                                        )}
                                      </div>
                                      <span className="tku-detail-lesson-title">
                                        {lesson.title}
                                      </span>
                                    </div>

                                    <div className="tku-detail-lesson-meta">
                                      {lesson.videoUrl && (
                                        <span className="tku-detail-video-tag">
                                          Video
                                        </span>
                                      )}
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
            </div>

            <div className="tku-detail-col-side">
              <div className="tku-detail-card tku-detail-thumb-card">
                <div className="tku-detail-thumb-box">
                  {course.thumbnailUrl || course.thumbnail ? (
                    <img
                      src={course.thumbnailUrl || course.thumbnail || ''}
                      alt={course.title}
                      className="tku-detail-thumb-img"
                    />
                  ) : (
                    <div className="tku-detail-thumb-placeholder">
                      <BookOpen size={36} />
                      <span>Chưa có ảnh bìa</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="tku-detail-card">
                <div className="tku-detail-section-header">
                  <h3 className="tku-detail-section-title">Giảng viên phụ trách</h3>
                </div>
                <div className="tku-detail-side-body">
                  <div className="tku-detail-teacher-profile">
                    <div className="tku-detail-teacher-avatar-lg">
                      {course.teacher?.fullName
                        ? course.teacher.fullName.slice(0, 1).toUpperCase()
                        : 'G'}
                    </div>
                    <div className="tku-detail-teacher-info">
                      <span className="tku-detail-teacher-name">
                        {course.teacher?.fullName || 'Chưa phân công'}
                      </span>
                      <span className="tku-detail-teacher-badge">Giảng viên</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {isAddChapterModalOpen && (
        <div className="tku-modal-overlay" onClick={() => setIsAddChapterModalOpen(false)}>
          <div className="tku-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="tku-modal-header">
              <h3 className="tku-modal-title">Thêm chương học mới</h3>
              <button
                type="button"
                className="tku-modal-close-btn"
                onClick={() => setIsAddChapterModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tku-modal-body">
              <div className="tku-form-group">
                <label className="tku-form-label">Tên chương học *</label>
                <input
                  type="text"
                  className="tku-form-input"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="Ví dụ: Chương 1: Cấu tạo nguyên tử..."
                  autoFocus
                />
              </div>

              <div className="tku-form-group">
                <label className="tku-form-label">Thứ tự sắp xếp</label>
                <input
                  type="number"
                  min="1"
                  className="tku-form-input"
                  value={chapterOrder}
                  onChange={(e) => setChapterOrder(parseInt(e.target.value, 10) || 1)}
                />
              </div>
            </div>

            <div className="tku-modal-footer">
              <button
                type="button"
                className="tku-detail-btn tku-detail-btn--secondary"
                onClick={() => setIsAddChapterModalOpen(false)}
                disabled={isAddingChapter}
              >
                Hủy
              </button>
              <button
                type="button"
                className="tku-detail-btn tku-detail-btn--primary"
                onClick={handleAddChapter}
                disabled={isAddingChapter}
              >
                {isAddingChapter ? 'Đang tạo...' : 'Tạo chương'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourseDetailPage;
