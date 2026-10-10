import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Users,
  Layers,
  Search,
  X,
  RotateCcw,
  Video,
  FileText,
  ChevronDown,
  AlertCircle,
  RotateCw,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
  Check,
  Play,
  Save,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import {
  lecturerService,
  type LecturerCourseItem,
  type LecturerCoursesResponse,
} from '../../services/lecturer.service';
import { toast } from '../../context/toastService';
import './lecturerCourses.css';

interface LessonFormState {
  mode: 'create' | 'edit';
  chapterId: string;
  chapterTitle?: string;
  lessonId?: string;
  title: string;
  content: string;
  videoUrl: string;
  status: 'DRAFT' | 'PUBLISHED';
}

const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11
    ? `https://www.youtube.com/embed/${match[2]}`
    : null;
};

const isDirectVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)($|\?)/i.test(url) || url.includes('cloudinary');
};

export const LecturerCoursesPage: React.FC = () => {
  const [data, setData] = useState<LecturerCoursesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'students' | 'lessons'>('newest');

  // Selected course for curriculum modal / drawer
  const [selectedCourse, setSelectedCourse] = useState<LecturerCourseItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Chapter management state
  const [isAddingChapter, setIsAddingChapter] = useState<boolean>(false);
  const [newChapterTitle, setNewChapterTitle] = useState<string>('');
  const [isSubmittingChapter, setIsSubmittingChapter] = useState<boolean>(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState<string>('');

  // Lesson management state
  const [lessonForm, setLessonForm] = useState<LessonFormState | null>(null);
  const [videoUploadTab, setVideoUploadTab] = useState<'upload' | 'url'>('upload');
  const [isUploadingVideo, setIsUploadingVideo] = useState<boolean>(false);
  const [isSubmittingLesson, setIsSubmittingLesson] = useState<boolean>(false);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Video preview modal
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await lecturerService.getAssignedCourses();
      setData(res);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách khóa học được phân công.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const loadInitialCourses = async () => {
      try {
        const res = await lecturerService.getAssignedCourses();
        if (!ignore) {
          setData(res);
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không thể tải danh sách khóa học được phân công.',
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialCourses();

    return () => {
      ignore = true;
    };
  }, []);

  // Filtered & Sorted Courses
  const coursesList = data?.courses;
  const filteredCourses = useMemo(() => {
    if (!coursesList) return [];

    let result = coursesList.filter((c) => {
      const matchKeyword =
        !searchKeyword.trim() ||
        c.title.toLowerCase().includes(searchKeyword.trim().toLowerCase()) ||
        (c.description &&
          c.description.toLowerCase().includes(searchKeyword.trim().toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' || c.status === statusFilter;

      return matchKeyword && matchStatus;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === 'students') {
        return b.studentCount - a.studentCount;
      }
      if (sortBy === 'lessons') {
        return b.lessonCount - a.lessonCount;
      }
      // 'newest' default
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return result;
  }, [coursesList, searchKeyword, statusFilter, sortBy]);

  const handleResetFilters = useCallback(() => {
    setSearchKeyword('');
    setStatusFilter('ALL');
    setSortBy('newest');
  }, []);

  const stats = data?.stats || {
    totalCourses: 0,
    activeCourses: 0,
    hiddenCourses: 0,
    totalStudents: 0,
    totalLessons: 0,
  };

  const totalAssigned = data?.courses.length || 0;

  const handleOpenEditor = async (course: LecturerCourseItem) => {
    setSelectedCourse(course);
    setIsLoadingDetail(true);
    try {
      const fresh = await lecturerService.getCourseDetail(course.id);
      if (fresh) setSelectedCourse(fresh);
    } catch {
      // keep initial course
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const refreshSelectedCourse = async (courseId: string) => {
    try {
      const fresh = await lecturerService.getCourseDetail(courseId);
      if (fresh) setSelectedCourse(fresh);
      fetchCourses();
    } catch {
      // ignore
    }
  };

  const handleCreateChapter = async () => {
    if (!selectedCourse || !newChapterTitle.trim()) {
      toast.warning('Vui lòng nhập tên chương học.');
      return;
    }
    setIsSubmittingChapter(true);
    try {
      await lecturerService.addChapter(selectedCourse.id, newChapterTitle.trim());
      toast.success('Đã tạo chương mới thành công!');
      setNewChapterTitle('');
      setIsAddingChapter(false);
      await refreshSelectedCourse(selectedCourse.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể tạo chương.');
    } finally {
      setIsSubmittingChapter(false);
    }
  };

  const handleUpdateChapter = async (chapterId: string) => {
    if (!selectedCourse || !editChapterTitle.trim()) {
      toast.warning('Vui lòng nhập tên chương học.');
      return;
    }
    try {
      await lecturerService.updateChapter(chapterId, editChapterTitle.trim());
      toast.success('Đã cập nhật tên chương!');
      setEditingChapterId(null);
      await refreshSelectedCourse(selectedCourse.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật chương.');
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!selectedCourse) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa chương này cùng các bài học bên trong?')) return;
    try {
      await lecturerService.deleteChapter(chapterId);
      toast.success('Đã xóa chương học!');
      await refreshSelectedCourse(selectedCourse.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa chương.');
    }
  };

  const handleOpenCreateLesson = (chapterId: string, chapterTitle?: string) => {
    setLessonForm({
      mode: 'create',
      chapterId,
      chapterTitle,
      title: '',
      content: '',
      videoUrl: '',
      status: 'PUBLISHED',
    });
    setVideoUploadTab('upload');
  };

  const handleOpenEditLesson = (
    chapterId: string,
    chapterTitle: string,
    lesson: {
      id: string;
      title: string;
      content?: string | null;
      videoUrl?: string | null;
      status?: string;
    },
  ) => {
    setLessonForm({
      mode: 'edit',
      chapterId,
      chapterTitle,
      lessonId: lesson.id,
      title: lesson.title,
      content: lesson.content || '',
      videoUrl: lesson.videoUrl || '',
      status: lesson.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
    });
    setVideoUploadTab(lesson.videoUrl ? 'url' : 'upload');
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error('Dung lượng video vượt quá 100MB.');
      return;
    }

    setIsUploadingVideo(true);
    try {
      const res = await lecturerService.uploadVideo(file);
      if (res.url) {
        setLessonForm((prev) => (prev ? { ...prev, videoUrl: res.url } : prev));
        toast.success('Tải video bài giảng lên thành công!');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể tải video lên.');
    } finally {
      setIsUploadingVideo(false);
      if (videoFileInputRef.current) {
        videoFileInputRef.current.value = '';
      }
    }
  };

  const handleSaveLesson = async () => {
    if (!selectedCourse || !lessonForm || !lessonForm.title.trim()) {
      toast.warning('Vui lòng nhập tiêu đề bài học.');
      return;
    }

    setIsSubmittingLesson(true);
    try {
      if (lessonForm.mode === 'create') {
        await lecturerService.addLesson(lessonForm.chapterId, {
          title: lessonForm.title.trim(),
          content: lessonForm.content || null,
          videoUrl: lessonForm.videoUrl || null,
          status: lessonForm.status,
        });
        toast.success('Đã thêm bài học mới thành công!');
      } else if (lessonForm.lessonId) {
        await lecturerService.updateLesson(lessonForm.lessonId, {
          title: lessonForm.title.trim(),
          content: lessonForm.content || null,
          videoUrl: lessonForm.videoUrl || null,
          status: lessonForm.status,
        });
        toast.success('Đã cập nhật bài học thành công!');
      }
      setLessonForm(null);
      await refreshSelectedCourse(selectedCourse.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể lưu bài học.');
    } finally {
      setIsSubmittingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!selectedCourse) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài học này không?')) return;
    try {
      await lecturerService.deleteLesson(lessonId);
      toast.success('Đã xóa bài học thành công!');
      await refreshSelectedCourse(selectedCourse.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa bài học.');
    }
  };

  return (
    <div className="tku-lecturer-courses-page">
      {/* 1. Academic Header chuẩn đồng bộ */}
      <section className="tku-lecturer-courses-banner">
        <div className="tku-lecturer-courses-banner__content">
          <h1 className="tku-lecturer-courses-banner__title">
            Khóa học được phân công giảng dạy
          </h1>
          <p className="tku-lecturer-courses-banner__desc">
            Theo dõi tiến trình giáo trình, bài giảng và quản lý nội dung đào tạo
            của bạn trên nền tảng.
          </p>
        </div>
      </section>

      {/* 2. Stats Grid 4 Cards */}
      <section className="tku-lecturer-courses-stats-grid">
        <div className="tku-lecturer-courses-stat-card">
          <div className="tku-lecturer-courses-stat-icon tku-lecturer-courses-stat-icon--blue">
            <BookOpen size={22} />
          </div>
          <div className="tku-lecturer-courses-stat-info">
            <span className="tku-lecturer-courses-stat-label">
              Khóa học phân công
            </span>
            <span className="tku-lecturer-courses-stat-value">
              {stats.totalCourses.toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        <div className="tku-lecturer-courses-stat-card">
          <div className="tku-lecturer-courses-stat-icon tku-lecturer-courses-stat-icon--emerald">
            <CheckCircle2 size={22} />
          </div>
          <div className="tku-lecturer-courses-stat-info">
            <span className="tku-lecturer-courses-stat-label">Đang hiển thị</span>
            <span className="tku-lecturer-courses-stat-value">
              {stats.activeCourses.toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        <div className="tku-lecturer-courses-stat-card">
          <div className="tku-lecturer-courses-stat-icon tku-lecturer-courses-stat-icon--purple">
            <Users size={22} />
          </div>
          <div className="tku-lecturer-courses-stat-info">
            <span className="tku-lecturer-courses-stat-label">Tổng học viên</span>
            <span className="tku-lecturer-courses-stat-value">
              {stats.totalStudents.toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        <div className="tku-lecturer-courses-stat-card">
          <div className="tku-lecturer-courses-stat-icon tku-lecturer-courses-stat-icon--amber">
            <Layers size={22} />
          </div>
          <div className="tku-lecturer-courses-stat-info">
            <span className="tku-lecturer-courses-stat-label">Tổng bài giảng</span>
            <span className="tku-lecturer-courses-stat-value">
              {stats.totalLessons.toLocaleString('vi-VN')}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Filter Bar */}
      <section className="tku-lecturer-courses-filter-bar">
        <div className="tku-lecturer-courses-search-wrap">
          <Search size={16} className="tku-lecturer-courses-search-icon" />
          <input
            type="text"
            className="tku-lecturer-courses-search-input"
            placeholder="Tìm theo tên khóa học hoặc mô tả..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          {searchKeyword && (
            <button
              type="button"
              className="tku-lecturer-courses-search-clear"
              onClick={() => setSearchKeyword('')}
              title="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="tku-lecturer-courses-select-wrap">
          <select
            className="tku-lecturer-courses-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hiển thị</option>
            <option value="HIDDEN">Đã ẩn / Bản nháp</option>
          </select>
          <ChevronDown size={14} className="tku-lecturer-courses-select-icon" />
        </div>

        <div className="tku-lecturer-courses-select-wrap">
          <select
            className="tku-lecturer-courses-select"
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'newest' | 'students' | 'lessons')
            }
          >
            <option value="newest">Sắp xếp: Mới nhất</option>
            <option value="students">Sắp xếp: Nhiều học viên nhất</option>
            <option value="lessons">Sắp xếp: Nhiều bài học nhất</option>
          </select>
          <ChevronDown size={14} className="tku-lecturer-courses-select-icon" />
        </div>

        {(searchKeyword || statusFilter !== 'ALL' || sortBy !== 'newest') && (
          <button
            type="button"
            className="tku-lecturer-courses-reset-btn"
            onClick={handleResetFilters}
            title="Đặt lại bộ lọc"
          >
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        )}
      </section>

      {/* 4. Main Content Area */}
      {isLoading ? (
        <div className="tku-lecturer-courses-empty">
          <div className="tku-lecturer-spinner" />
          <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>
            Đang tải danh sách khóa học được phân công...
          </span>
        </div>
      ) : error ? (
        <div className="tku-lecturer-courses-empty">
          <div
            className="tku-lecturer-courses-empty-icon"
            style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
          >
            <AlertCircle size={32} />
          </div>
          <h3 className="tku-lecturer-courses-empty-title">
            Không thể tải dữ liệu
          </h3>
          <p className="tku-lecturer-courses-empty-desc">{error}</p>
          <button
            type="button"
            className="tku-lecturer-courses-reset-btn"
            onClick={fetchCourses}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RotateCw size={14} />
            <span>Thử lại</span>
          </button>
        </div>
      ) : totalAssigned === 0 ? (
        /* Empty State chuẩn mực khi chưa có khóa học phân công */
        <div className="tku-lecturer-courses-empty">
          <div className="tku-lecturer-courses-empty-icon">
            <BookOpen size={32} />
          </div>
          <h3 className="tku-lecturer-courses-empty-title">
            Chưa có khóa học nào được phân công
          </h3>
          <p className="tku-lecturer-courses-empty-desc">
            Hiện tại bạn chưa được quản trị viên phân công phụ trách khóa học nào
            trên hệ thống. Khi có phân công khóa học mới, thông tin sẽ xuất hiện
            tại đây.
          </p>
        </div>
      ) : filteredCourses.length === 0 ? (
        /* Empty State khi lọc tìm kiếm không có kết quả */
        <div className="tku-lecturer-courses-empty">
          <div className="tku-lecturer-courses-empty-icon">
            <Search size={30} />
          </div>
          <h3 className="tku-lecturer-courses-empty-title">
            Không tìm thấy khóa học phù hợp
          </h3>
          <p className="tku-lecturer-courses-empty-desc">
            Không có khóa học nào khớp với từ khóa tìm kiếm hoặc các điều kiện lọc
            hiện tại.
          </p>
          <button
            type="button"
            className="tku-lecturer-courses-reset-btn"
            onClick={handleResetFilters}
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        /* Table / List View */
        <div className="tku-lecturer-courses-table-card">
          <div className="tku-lecturer-courses-table-wrap">
            <table className="tku-lecturer-courses-table">
              <thead>
                <tr>
                  <th>Khóa học</th>
                  <th>Học viên</th>
                  <th>Chương</th>
                  <th>Bài giảng</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="tku-lecturer-table-course-cell">
                        {c.thumbnailUrl ? (
                          <img
                            src={c.thumbnailUrl}
                            alt={c.title}
                            className="tku-lecturer-table-thumb"
                          />
                        ) : (
                          <div
                            className="tku-lecturer-table-thumb"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94a3b8',
                            }}
                          >
                            <BookOpen size={20} />
                          </div>
                        )}
                        <span className="tku-lecturer-table-course-title">
                          {c.title}
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong>{c.studentCount}</strong> học viên
                    </td>
                    <td>{c.chapterCount} chương</td>
                    <td>{c.lessonCount} bài</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="tku-lecturer-pencil-action-btn"
                        onClick={() => handleOpenEditor(c)}
                        title="Biên soạn nội dung & giáo trình"
                        aria-label="Biên soạn nội dung & giáo trình"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Modal Biên soạn nội dung & giáo trình khóa học */}
      {selectedCourse && (
        <div
          className="tku-curriculum-modal-overlay"
          onClick={() => {
            if (!isSubmittingLesson && !isUploadingVideo) {
              setSelectedCourse(null);
              setIsAddingChapter(false);
              setEditingChapterId(null);
            }
          }}
        >
          <div
            className="tku-curriculum-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tku-curriculum-modal-header">
              <div className="tku-curriculum-modal-header-info">
                <span className="tku-curriculum-modal-badge">
                  Biên soạn nội dung giáo trình
                </span>
                <h2 className="tku-curriculum-modal-title">
                  {selectedCourse.title}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="tku-curriculum-add-chapter-top-btn"
                  onClick={() => setIsAddingChapter((prev) => !prev)}
                >
                  <Plus size={15} />
                  <span>Thêm chương mới</span>
                </button>
                <button
                  type="button"
                  className="tku-curriculum-modal-close-btn"
                  onClick={() => {
                    setSelectedCourse(null);
                    setIsAddingChapter(false);
                    setEditingChapterId(null);
                  }}
                  title="Đóng"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="tku-curriculum-modal-body">
              {/* Thống kê nhanh giáo trình */}
              <div className="tku-curriculum-overview-bar">
                <div className="tku-curriculum-overview-item">
                  <span className="tku-curriculum-overview-label">
                    Tổng số chương
                  </span>
                  <span className="tku-curriculum-overview-value">
                    {selectedCourse.chapterCount} chương
                  </span>
                </div>
                <div className="tku-curriculum-overview-item">
                  <span className="tku-curriculum-overview-label">
                    Tổng số bài giảng
                  </span>
                  <span className="tku-curriculum-overview-value">
                    {selectedCourse.lessonCount} bài học
                  </span>
                </div>
                <div className="tku-curriculum-overview-item">
                  <span className="tku-curriculum-overview-label">
                    Trạng thái khóa học
                  </span>
                  <span className="tku-curriculum-overview-value">
                    {selectedCourse.statusText}
                  </span>
                </div>
              </div>

              {/* Form Thêm chương mới (khi bấm nút Thêm chương mới) */}
              {isAddingChapter && (
                <div className="tku-curriculum-new-chapter-card">
                  <div className="tku-curriculum-new-chapter-card-header">
                    <Layers size={16} color="#1d68f2" />
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                      Thêm chương học mới
                    </span>
                  </div>
                  <div className="tku-curriculum-new-chapter-card-body">
                    <input
                      type="text"
                      className="tku-curriculum-input"
                      placeholder="Nhập tên chương (ví dụ: Chương 1: Giới thiệu chung)..."
                      value={newChapterTitle}
                      onChange={(e) => setNewChapterTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateChapter();
                      }}
                      autoFocus
                    />
                    <div className="tku-curriculum-new-chapter-actions">
                      <button
                        type="button"
                        className="tku-curriculum-btn-primary"
                        onClick={handleCreateChapter}
                        disabled={isSubmittingChapter || !newChapterTitle.trim()}
                      >
                        {isSubmittingChapter ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        <span>Tạo chương</span>
                      </button>
                      <button
                        type="button"
                        className="tku-curriculum-btn-secondary"
                        onClick={() => {
                          setIsAddingChapter(false);
                          setNewChapterTitle('');
                        }}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Danh sách các chương và bài học */}
              <div className="tku-curriculum-chapters-list">
                {isLoadingDetail ? (
                  <div className="tku-curriculum-loading-box">
                    <Loader2 size={28} className="animate-spin" color="#1d68f2" />
                    <span>Đang tải cấu trúc chương và bài giảng...</span>
                  </div>
                ) : !selectedCourse.chapters || selectedCourse.chapters.length === 0 ? (
                  <div
                    className="tku-lecturer-courses-empty"
                    style={{ padding: '36px 20px', borderStyle: 'dashed' }}
                  >
                    <BookOpen size={28} color="#94a3b8" />
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>
                      Khóa học chưa có chương nào
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: '#64748b',
                        maxWidth: '440px',
                      }}
                    >
                      Bấm vào nút <strong>"Thêm chương mới"</strong> ở góc trên để khởi tạo
                      cấu trúc giáo trình và biên soạn bài giảng cho học viên.
                    </p>
                    <button
                      type="button"
                      className="tku-curriculum-btn-primary"
                      onClick={() => setIsAddingChapter(true)}
                      style={{ marginTop: '6px' }}
                    >
                      <Plus size={14} />
                      <span>Thêm chương đầu tiên</span>
                    </button>
                  </div>
                ) : (
                  selectedCourse.chapters.map((ch, idx) => {
                    const isEditingThisChapter = editingChapterId === ch.id;
                    return (
                      <div key={ch.id} className="tku-curriculum-chapter-box">
                        <div className="tku-curriculum-chapter-header">
                          {isEditingThisChapter ? (
                            <div className="tku-curriculum-chapter-edit-inline">
                              <input
                                type="text"
                                className="tku-curriculum-input tku-curriculum-input--sm"
                                value={editChapterTitle}
                                onChange={(e) => setEditChapterTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateChapter(ch.id);
                                }}
                                autoFocus
                              />
                              <button
                                type="button"
                                className="tku-curriculum-icon-btn tku-curriculum-icon-btn--save"
                                onClick={() => handleUpdateChapter(ch.id)}
                                title="Lưu tên chương"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                className="tku-curriculum-icon-btn"
                                onClick={() => setEditingChapterId(null)}
                                title="Hủy"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="tku-curriculum-chapter-title-wrap">
                              <span className="tku-curriculum-chapter-title">
                                Chương {idx + 1}: {ch.title}
                              </span>
                              <span className="tku-curriculum-chapter-count">
                                {ch.lessons?.length || 0} bài học
                              </span>
                            </div>
                          )}

                          <div className="tku-curriculum-chapter-actions">
                            <button
                              type="button"
                              className="tku-curriculum-chapter-btn-add-lesson"
                              onClick={() => handleOpenCreateLesson(ch.id, ch.title)}
                              title="Tạo bài học mới trong chương này"
                            >
                              <Plus size={13} />
                              <span>Thêm bài học</span>
                            </button>
                            {!isEditingThisChapter && (
                              <button
                                type="button"
                                className="tku-curriculum-icon-btn"
                                onClick={() => {
                                  setEditingChapterId(ch.id);
                                  setEditChapterTitle(ch.title);
                                }}
                                title="Chỉnh sửa tên chương"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="tku-curriculum-icon-btn tku-curriculum-icon-btn--danger"
                              onClick={() => handleDeleteChapter(ch.id)}
                              title="Xóa chương học"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Danh sách bài học của chương */}
                        <div className="tku-curriculum-lessons-list">
                          {!ch.lessons || ch.lessons.length === 0 ? (
                            <div className="tku-curriculum-lesson-empty">
                              <span>Chương này chưa có bài học nào.</span>
                              <button
                                type="button"
                                className="tku-curriculum-link-btn"
                                onClick={() => handleOpenCreateLesson(ch.id, ch.title)}
                              >
                                + Thêm bài học đầu tiên
                              </button>
                            </div>
                          ) : (
                            ch.lessons.map((lesson, lIdx) => (
                              <div
                                key={lesson.id}
                                className="tku-curriculum-lesson-row"
                              >
                                <div className="tku-curriculum-lesson-left">
                                  <span className="tku-curriculum-lesson-index">
                                    {lIdx + 1 < 10 ? `0${lIdx + 1}` : lIdx + 1}
                                  </span>
                                  {lesson.videoUrl ? (
                                    <span
                                      className="tku-curriculum-type-icon tku-curriculum-type-icon--video"
                                      title="Bài học có video giảng dạy"
                                    >
                                      <Video size={14} />
                                    </span>
                                  ) : (
                                    <span
                                      className="tku-curriculum-type-icon tku-curriculum-type-icon--doc"
                                      title="Bài học tài liệu / văn bản"
                                    >
                                      <FileText size={14} />
                                    </span>
                                  )}
                                  <span className="tku-curriculum-lesson-name">
                                    {lesson.title}
                                  </span>
                                </div>

                                <div className="tku-curriculum-lesson-right">
                                  <span
                                    className={`tku-lecturer-card-status-badge ${
                                      lesson.status === 'PUBLISHED'
                                        ? 'tku-lecturer-card-status-badge--active'
                                        : 'tku-lecturer-card-status-badge--hidden'
                                    }`}
                                    style={{ position: 'static', padding: '3px 8px', fontSize: '11px' }}
                                  >
                                    <span className="tku-lecturer-status-dot" />
                                    <span>
                                      {lesson.status === 'PUBLISHED'
                                        ? 'Đã xuất bản'
                                        : 'Bản nháp'}
                                    </span>
                                  </span>

                                  {lesson.videoUrl && (
                                    <button
                                      type="button"
                                      className="tku-curriculum-lesson-action-btn tku-curriculum-lesson-action-btn--play"
                                      onClick={() => setPreviewVideoUrl(lesson.videoUrl || null)}
                                      title="Xem trước video bài giảng"
                                    >
                                      <Play size={12} />
                                      <span>Xem video</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="tku-curriculum-lesson-action-btn"
                                    onClick={() => handleOpenEditLesson(ch.id, ch.title, lesson)}
                                    title="Sửa nội dung bài học"
                                  >
                                    <Pencil size={12} />
                                    <span>Sửa</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="tku-curriculum-lesson-action-btn tku-curriculum-lesson-action-btn--delete"
                                    onClick={() => handleDeleteLesson(lesson.id)}
                                    title="Xóa bài học"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="tku-curriculum-modal-footer">
              <button
                type="button"
                className="tku-curriculum-btn-secondary"
                onClick={() => {
                  setSelectedCourse(null);
                  setIsAddingChapter(false);
                  setEditingChapterId(null);
                }}
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Sub-modal Soạn thảo bài học (Tạo mới / Sửa) */}
      {lessonForm && (
        <div
          className="tku-lesson-modal-overlay"
          onClick={() => {
            if (!isSubmittingLesson && !isUploadingVideo) {
              setLessonForm(null);
            }
          }}
        >
          <div
            className="tku-lesson-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tku-lesson-modal-header">
              <div>
                <span className="tku-curriculum-modal-badge">
                  {lessonForm.mode === 'create' ? 'Tạo bài học mới' : 'Chỉnh sửa bài học'}
                </span>
                <h3 className="tku-lesson-modal-title">
                  {lessonForm.chapterTitle ? `${lessonForm.chapterTitle}` : 'Biên soạn bài học'}
                </h3>
              </div>
              <button
                type="button"
                className="tku-curriculum-modal-close-btn"
                onClick={() => setLessonForm(null)}
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="tku-lesson-modal-body">
              {/* Form group: Tiêu đề */}
              <div className="tku-form-group">
                <label className="tku-form-label">
                  Tiêu đề bài học <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="tku-curriculum-input"
                  placeholder="Ví dụ: Bài 1: Khái niệm liên kết hóa học..."
                  value={lessonForm.title}
                  onChange={(e) =>
                    setLessonForm((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev,
                    )
                  }
                  autoFocus
                />
              </div>

              {/* Form group: Trạng thái */}
              <div className="tku-form-group">
                <label className="tku-form-label">Trạng thái bài giảng</label>
                <select
                  className="tku-curriculum-select"
                  value={lessonForm.status}
                  onChange={(e) =>
                    setLessonForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            status: e.target.value as 'DRAFT' | 'PUBLISHED',
                          }
                        : prev,
                    )
                  }
                >
                  <option value="PUBLISHED">Đã xuất bản (Học viên xem được ngay)</option>
                  <option value="DRAFT">Bản nháp (Đang biên soạn, chưa hiển thị)</option>
                </select>
              </div>

              {/* Form group: Video bài giảng */}
              <div className="tku-form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="tku-form-label" style={{ margin: 0 }}>
                    Video bài giảng (Tùy chọn)
                  </label>
                  <div className="tku-video-tab-toggle">
                    <button
                      type="button"
                      className={`tku-video-tab-btn ${videoUploadTab === 'upload' ? 'tku-video-tab-btn--active' : ''}`}
                      onClick={() => setVideoUploadTab('upload')}
                    >
                      <UploadCloud size={13} />
                      <span>Tải lên tệp video</span>
                    </button>
                    <button
                      type="button"
                      className={`tku-video-tab-btn ${videoUploadTab === 'url' ? 'tku-video-tab-btn--active' : ''}`}
                      onClick={() => setVideoUploadTab('url')}
                    >
                      <ExternalLink size={13} />
                      <span>Đường dẫn URL / YouTube</span>
                    </button>
                  </div>
                </div>

                {videoUploadTab === 'upload' ? (
                  <div className="tku-video-upload-card">
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska"
                      style={{ display: 'none' }}
                      onChange={handleVideoFileChange}
                    />

                    {isUploadingVideo ? (
                      <div className="tku-video-uploading-state">
                        <Loader2 size={32} className="animate-spin" color="#1d68f2" />
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                          Đang tải video bài giảng lên Cloudinary...
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          Quá trình xử lý video có thể mất vài giây tùy vào dung lượng file.
                        </span>
                      </div>
                    ) : (
                      <div
                        className="tku-video-dropzone"
                        onClick={() => videoFileInputRef.current?.click()}
                      >
                        <div className="tku-video-dropzone-icon">
                          <UploadCloud size={24} color="#1d68f2" />
                        </div>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                          Bấm vào đây để chọn tệp video từ máy tính
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          Hỗ trợ định dạng MP4, WebM, MOV (tối đa 100MB)
                        </span>
                      </div>
                    )}

                    {lessonForm.videoUrl && (
                      <div className="tku-video-current-file">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <CheckCircle2 size={16} color="#10b981" />
                          <span className="tku-video-current-url" title={lessonForm.videoUrl}>
                            {lessonForm.videoUrl}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="tku-video-remove-btn"
                          onClick={() =>
                            setLessonForm((prev) =>
                              prev ? { ...prev, videoUrl: '' } : prev,
                            )
                          }
                          title="Gỡ bỏ video này"
                        >
                          <X size={14} />
                          <span>Gỡ bỏ</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      className="tku-curriculum-input"
                      placeholder="Dán link YouTube (https://www.youtube.com/watch?v=...) hoặc đường dẫn MP4..."
                      value={lessonForm.videoUrl}
                      onChange={(e) =>
                        setLessonForm((prev) =>
                          prev ? { ...prev, videoUrl: e.target.value } : prev,
                        )
                      }
                    />
                    <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                      Hệ thống tự động nhận diện và phát video YouTube hoặc liên kết video trực tiếp.
                    </span>
                  </div>
                )}

                {/* Xem trước video trong form */}
                {lessonForm.videoUrl && (
                  <div className="tku-video-form-preview">
                    {getYouTubeEmbedUrl(lessonForm.videoUrl) ? (
                      <iframe
                        src={getYouTubeEmbedUrl(lessonForm.videoUrl)!}
                        title="Xem trước video bài giảng"
                        className="tku-video-preview-iframe"
                        allowFullScreen
                      />
                    ) : isDirectVideoUrl(lessonForm.videoUrl) ? (
                      <video
                        src={lessonForm.videoUrl}
                        controls
                        className="tku-video-preview-player"
                      />
                    ) : (
                      <div className="tku-video-preview-link">
                        <Video size={16} color="#1d68f2" />
                        <a
                          href={lessonForm.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Mở liên kết video trong tab mới
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Form group: Nội dung bài học */}
              <div className="tku-form-group">
                <label className="tku-form-label">
                  Nội dung bài học / Ghi chú lý thuyết
                </label>
                <textarea
                  className="tku-curriculum-textarea"
                  rows={5}
                  placeholder="Nhập nội dung tóm tắt bài giảng, hướng dẫn tự học, công thức hoặc tài liệu liên quan..."
                  value={lessonForm.content}
                  onChange={(e) =>
                    setLessonForm((prev) =>
                      prev ? { ...prev, content: e.target.value } : prev,
                    )
                  }
                />
              </div>
            </div>

            <div className="tku-lesson-modal-footer">
              <button
                type="button"
                className="tku-curriculum-btn-secondary"
                onClick={() => setLessonForm(null)}
                disabled={isSubmittingLesson}
              >
                Hủy
              </button>
              <button
                type="button"
                className="tku-curriculum-btn-primary"
                onClick={handleSaveLesson}
                disabled={isSubmittingLesson || !lessonForm.title.trim()}
              >
                {isSubmittingLesson ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>{lessonForm.mode === 'create' ? 'Lưu bài học' : 'Cập nhật bài học'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal xem video bài giảng */}
      {previewVideoUrl && (
        <div
          className="tku-video-preview-modal-overlay"
          onClick={() => setPreviewVideoUrl(null)}
        >
          <div
            className="tku-video-preview-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tku-video-preview-modal-header">
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                Xem trước video bài giảng
              </span>
              <button
                type="button"
                className="tku-curriculum-modal-close-btn"
                onClick={() => setPreviewVideoUrl(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="tku-video-preview-modal-body">
              {getYouTubeEmbedUrl(previewVideoUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(previewVideoUrl)!}
                  title="Video bài học"
                  className="tku-video-modal-iframe"
                  allowFullScreen
                />
              ) : (
                <video
                  src={previewVideoUrl}
                  controls
                  autoPlay
                  className="tku-video-modal-player"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerCoursesPage;
