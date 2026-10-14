import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Video,
  FileText,
  Check,
  X,
  Play,
  Save,
  Loader2,
  ExternalLink,
  Users,
  Layers,
  AlertCircle,
  RotateCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  lecturerService,
  type LecturerCourseItem,
  type LessonSummary,
} from '../../services/lecturer.service';
import { toast } from '../../context/toastService';
import './lecturerCurriculum.css';

interface LessonFormState {
  mode: 'create' | 'edit';
  chapterId: string;
  chapterTitle?: string;
  lessonId?: string;
  title: string;
  content: string;
  videoUrl: string;
}

interface DeleteTarget {
  type: 'chapter' | 'lesson';
  id: string;
  title: string;
}

const getYouTubeVideoId = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const clean = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }
  const match = clean.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/,
  );
  return match?.[1] || null;
};

const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`;
};

const isDirectVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)($|\?)/i.test(url) || url.includes('cloudinary');
};

export const LecturerCourseCurriculumPage: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();

  const [course, setCourse] = useState<LecturerCourseItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion state: open/closed chapter IDs
  const [openChapterIds, setOpenChapterIds] = useState<Record<string, boolean>>({});

  // Chapter creation & inline edit state
  const [isAddingChapter, setIsAddingChapter] = useState<boolean>(false);
  const [newChapterTitle, setNewChapterTitle] = useState<string>('');
  const [isSubmittingChapter, setIsSubmittingChapter] = useState<boolean>(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState<string>('');

  // Lesson Modal State
  const [lessonForm, setLessonForm] = useState<LessonFormState | null>(null);
  const [isSubmittingLesson, setIsSubmittingLesson] = useState<boolean>(false);

  // Preview Video Modal
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  // 1. Fetch Course Detail
  const fetchCurriculum = useCallback(
    async (showLoading = false) => {
      if (!courseId) return;
      if (showLoading) {
        setIsLoading(true);
      }
      try {
        const data = await lecturerService.getCourseDetail(courseId);
        setCourse(data);

        // Open all chapters by default for best UX
        if (data.chapters && data.chapters.length > 0) {
          setOpenChapterIds((prev) => {
            const nextOpen = { ...prev };
            data.chapters?.forEach((ch) => {
              if (nextOpen[ch.id] === undefined) {
                nextOpen[ch.id] = true;
              }
            });
            return nextOpen;
          });
        }
        setError(null);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải thông tin khóa học và giáo trình.',
        );
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [courseId],
  );

  useEffect(() => {
    if (!courseId) return;
    let isMounted = true;

    lecturerService
      .getCourseDetail(courseId)
      .then((data) => {
        if (!isMounted) return;
        setCourse(data);
        if (data.chapters && data.chapters.length > 0) {
          const initialOpen: Record<string, boolean> = {};
          data.chapters.forEach((ch) => {
            initialOpen[ch.id] = true;
          });
          setOpenChapterIds(initialOpen);
        }
        setError(null);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải thông tin khóa học và giáo trình.',
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // Modal keyboard listeners (Escape key) & scroll lock
  useEffect(() => {
    const isModalOpen = Boolean(lessonForm || previewVideoUrl || deleteTarget);
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewVideoUrl) {
          setPreviewVideoUrl(null);
        } else if (deleteTarget && !isDeleting) {
          setDeleteTarget(null);
        } else if (lessonForm && !isSubmittingLesson) {
          setLessonForm(null);
        }
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [lessonForm, previewVideoUrl, deleteTarget, isDeleting, isSubmittingLesson]);

  // Accordion toggle
  const toggleChapter = useCallback((chapterId: string) => {
    setOpenChapterIds((prev) => ({
      ...prev,
      [chapterId]: prev[chapterId] !== undefined ? !prev[chapterId] : false,
    }));
  }, []);

  // 2. Chapter CRUD
  const handleCreateChapter = async () => {
    if (!courseId || !newChapterTitle.trim()) {
      toast.warning('Vui lòng nhập tên chương học.');
      return;
    }

    setIsSubmittingChapter(true);
    try {
      const res = await lecturerService.addChapter(courseId, newChapterTitle.trim());
      toast.success(`Đã tạo chương: "${newChapterTitle.trim()}"`);
      setNewChapterTitle('');
      setIsAddingChapter(false);

      // Automatically keep the new chapter open
      if (res?.id) {
        setOpenChapterIds((prev) => ({ ...prev, [res.id]: true }));
      }
      await fetchCurriculum();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể tạo chương học.',
      );
    } finally {
      setIsSubmittingChapter(false);
    }
  };

  const handleUpdateChapter = async (chapterId: string) => {
    if (!editChapterTitle.trim()) {
      toast.warning('Tên chương học không được để trống.');
      return;
    }

    try {
      await lecturerService.updateChapter(chapterId, editChapterTitle.trim());
      toast.success('Đã cập nhật tên chương học thành công.');
      setEditingChapterId(null);
      await fetchCurriculum();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể cập nhật tên chương.',
      );
    }
  };

  // 3. Lesson Modal Openers
  const handleOpenCreateLesson = useCallback((chapterId: string, chapterTitle?: string) => {
    setLessonForm({
      mode: 'create',
      chapterId,
      chapterTitle,
      title: '',
      content: '',
      videoUrl: '',
    });
  }, []);

  const handleOpenEditLesson = useCallback(
    (chapterId: string, chapterTitle: string, lesson: LessonSummary) => {
      setLessonForm({
        mode: 'edit',
        chapterId,
        chapterTitle,
        lessonId: lesson.id,
        title: lesson.title,
        content: lesson.content || '',
        videoUrl: lesson.videoUrl || '',
      });
    },
    [],
  );

  // 5. Save Lesson
  const handleSaveLesson = async () => {
    if (!lessonForm) return;
    if (!lessonForm.title.trim()) {
      toast.warning('Vui lòng nhập tiêu đề bài học.');
      return;
    }

    setIsSubmittingLesson(true);
    try {
      if (lessonForm.mode === 'create') {
        await lecturerService.addLesson(lessonForm.chapterId, {
          title: lessonForm.title.trim(),
          content: lessonForm.content.trim() || null,
          videoUrl: lessonForm.videoUrl.trim() || null,
        });
        toast.success(`Đã thêm bài học: "${lessonForm.title.trim()}"`);
      } else if (lessonForm.mode === 'edit' && lessonForm.lessonId) {
        await lecturerService.updateLesson(lessonForm.lessonId, {
          title: lessonForm.title.trim(),
          content: lessonForm.content.trim() || null,
          videoUrl: lessonForm.videoUrl.trim() || null,
        });
        toast.success(`Đã cập nhật bài học: "${lessonForm.title.trim()}"`);
      }

      setLessonForm(null);
      await fetchCurriculum();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể lưu bài học.',
      );
    } finally {
      setIsSubmittingLesson(false);
    }
  };

  // 6. Delete Target Executions
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'chapter') {
        await lecturerService.deleteChapter(deleteTarget.id);
        toast.success(`Đã xóa chương học: "${deleteTarget.title}"`);
      } else {
        await lecturerService.deleteLesson(deleteTarget.id);
        toast.success(`Đã xóa bài học: "${deleteTarget.title}"`);
      }
      setDeleteTarget(null);
      await fetchCurriculum();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể thực hiện xóa.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // 7. Academic Metrics & Calculations
  const stats = useMemo(() => {
    const chapters = course?.chapters || [];
    const totalChapters = chapters.length;
    let totalLessons = 0;
    let videoLessons = 0;

    chapters.forEach((ch) => {
      totalLessons += ch.lessons?.length || 0;
      ch.lessons?.forEach((l) => {
        if (l.videoUrl) videoLessons++;
      });
    });

    return {
      totalChapters,
      totalLessons,
      videoLessons,
      studentsCount: course?.studentCount || 0,
    };
  }, [course]);

  return (
    <div className="tku-curriculum-page">
      {/* 1. Academic Header Card (Tối giản, chuẩn học thuật TKU) */}
      <header className="tku-curriculum-academic-card">
        <div className="tku-curriculum-academic-card__body">
          <div className="tku-curriculum-academic-card__title-row">
            <h1 className="tku-curriculum-course-title">
              {course?.title || 'Đang tải thông tin khóa học...'}
            </h1>
            <span
              className={`tku-curriculum-status-pill ${
                course?.status === 'ACTIVE'
                  ? 'tku-curriculum-status-pill--active'
                  : 'tku-curriculum-status-pill--hidden'
              }`}
            >
              <span className="tku-curriculum-status-dot" />
              <span>{course?.statusText || 'Đang hoạt động'}</span>
            </span>
          </div>

          {course?.description && (
            <p className="tku-curriculum-course-desc">{course.description}</p>
          )}

          {/* Dòng chỉ số học thuật tinh gọn */}
          <div className="tku-curriculum-metrics-bar">
            <div className="tku-curriculum-metric-item">
              <Layers size={15} className="tku-curriculum-metric-icon" />
              <span>
                <strong>{stats.totalChapters}</strong> chương học
              </span>
            </div>
            <span className="tku-curriculum-metric-sep">•</span>
            <div className="tku-curriculum-metric-item">
              <FileText size={15} className="tku-curriculum-metric-icon" />
              <span>
                <strong>{stats.totalLessons}</strong> bài giảng
              </span>
            </div>
            <span className="tku-curriculum-metric-sep">•</span>
            <div className="tku-curriculum-metric-item">
              <Video size={15} className="tku-curriculum-metric-icon" />
              <span>
                <strong>{stats.videoLessons}</strong> bài có video
              </span>
            </div>
            <span className="tku-curriculum-metric-sep">•</span>
            <div className="tku-curriculum-metric-item">
              <Users size={15} className="tku-curriculum-metric-icon" />
              <span>
                <strong>{stats.studentsCount}</strong> học viên
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Focused Curriculum Builder (Giao diện tập trung, đơn giản, thoáng đãng) */}
      <main className="tku-curriculum-builder-container">
        <div className="tku-curriculum-section-bar">
          <div className="tku-curriculum-section-title-wrap">
            <h2 className="tku-curriculum-section-title">Cấu trúc chương & bài giảng</h2>
            <span className="tku-curriculum-section-badge">
              {stats.totalChapters} chương ({stats.totalLessons} bài học)
            </span>
          </div>

          <div>
            <button
              type="button"
              className="tku-curriculum-btn-primary tku-curriculum-btn-primary--sm"
              onClick={() => setIsAddingChapter(true)}
            >
              <Plus size={14} />
              <span>Thêm chương</span>
            </button>
          </div>
        </div>

          {/* Inline Create Chapter Form Card */}
          {isAddingChapter && (
            <div className="tku-curriculum-create-chapter-card">
              <div className="tku-curriculum-create-chapter-header">
                <Plus size={18} />
                <span>Tạo chương học mới</span>
              </div>
              <input
                type="text"
                className="tku-curriculum-input"
                placeholder="Nhập tên chương học (ví dụ: Chương 1: Giới thiệu tổng quan và thuật ngữ cơ bản)..."
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateChapter();
                }}
                autoFocus
              />
              <div className="tku-curriculum-create-chapter-actions">
                <button
                  type="button"
                  className="tku-curriculum-btn-submit"
                  onClick={handleCreateChapter}
                  disabled={isSubmittingChapter || !newChapterTitle.trim()}
                >
                  {isSubmittingChapter ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>Xác nhận tạo chương</span>
                </button>
                <button
                  type="button"
                  className="tku-curriculum-btn-cancel"
                  onClick={() => {
                    setIsAddingChapter(false);
                    setNewChapterTitle('');
                  }}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="tku-curriculum-card" style={{ padding: '60px 24px', textAlign: 'center', alignItems: 'center' }}>
              <Loader2 size={32} className="animate-spin" color="#1d68f2" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                Đang tải cấu trúc chương và bài giảng...
              </span>
            </div>
          ) : error ? (
            <div className="tku-curriculum-card" style={{ padding: '48px 24px', textAlign: 'center', alignItems: 'center' }}>
              <AlertCircle size={36} color="#ef4444" />
              <h3 style={{ margin: '8px 0 4px 0', fontSize: '16px', color: '#0f172a' }}>
                Không thể tải dữ liệu giáo trình
              </h3>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>{error}</p>
              <button
                type="button"
                className="tku-curriculum-btn-submit"
                onClick={() => void fetchCurriculum(true)}
                style={{ marginTop: '12px' }}
              >
                <RotateCw size={14} />
                <span>Thử lại</span>
              </button>
            </div>
          ) : !course?.chapters || course.chapters.length === 0 ? (
            /* Empty State for Course without Chapters */
            <div className="tku-curriculum-empty-card">
              <div className="tku-curriculum-empty-icon-wrap">
                <BookOpen size={28} />
              </div>
              <h3 className="tku-curriculum-empty-title">
                Khóa học chưa có chương nào
              </h3>
              <p className="tku-curriculum-empty-desc">
                Bấm vào nút "Thêm chương" ở góc trên để khởi tạo cấu trúc giáo trình và biên soạn bài giảng cho học viên.
              </p>
            </div>
          ) : (
            /* Chapters List */
            <div className="tku-curriculum-chapters-list">
              {course.chapters.map((ch, idx) => {
                const isOpen = Boolean(openChapterIds[ch.id]);
                const isEditing = editingChapterId === ch.id;

                return (
                  <div key={ch.id} className="tku-curriculum-chapter-card">
                    <div
                      className={`tku-curriculum-chapter-header ${
                        isOpen ? 'tku-curriculum-chapter-header--open' : ''
                      }`}
                      onClick={() => toggleChapter(ch.id)}
                    >
                      {isEditing ? (
                        <div
                          className="tku-curriculum-chapter-edit-inline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            className="tku-curriculum-input tku-curriculum-input--sm"
                            value={editChapterTitle}
                            onChange={(e) => setEditChapterTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateChapter(ch.id);
                              if (e.key === 'Escape') setEditingChapterId(null);
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
                        <div className="tku-curriculum-chapter-title-group">
                          <span className="tku-curriculum-chapter-index-badge">
                            Chương {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                          </span>
                          <span className="tku-curriculum-chapter-title" title={ch.title}>
                            {ch.title}
                          </span>
                          <span className="tku-curriculum-chapter-count">
                            {ch.lessons?.length || 0} bài giảng
                          </span>
                        </div>
                      )}

                      <div
                        className="tku-curriculum-chapter-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="tku-curriculum-btn-add-lesson"
                          onClick={() => handleOpenCreateLesson(ch.id, ch.title)}
                          title="Tạo bài học mới trong chương này"
                        >
                          <Plus size={13} />
                          <span>Thêm bài học</span>
                        </button>

                        {!isEditing && (
                          <button
                            type="button"
                            className="tku-curriculum-icon-btn"
                            onClick={() => {
                              setEditingChapterId(ch.id);
                              setEditChapterTitle(ch.title);
                            }}
                            title="Đổi tên chương học"
                          >
                            <Pencil size={13} />
                          </button>
                        )}

                        <button
                          type="button"
                          className="tku-curriculum-icon-btn tku-curriculum-icon-btn--danger"
                          onClick={() =>
                            setDeleteTarget({
                              type: 'chapter',
                              id: ch.id,
                              title: ch.title,
                            })
                          }
                          title="Xóa chương học"
                        >
                          <Trash2 size={13} />
                        </button>

                        <button
                          type="button"
                          className="tku-curriculum-icon-btn"
                          onClick={() => toggleChapter(ch.id)}
                          title={isOpen ? 'Thu gọn' : 'Mở rộng'}
                        >
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Lessons list of Chapter */}
                    {isOpen && (
                      <div className="tku-curriculum-lessons-list">
                        {!ch.lessons || ch.lessons.length === 0 ? (
                          <div className="tku-curriculum-lesson-empty">
                            <div className="tku-curriculum-lesson-empty-icon">
                              <BookOpen size={20} />
                            </div>
                            <div className="tku-curriculum-lesson-empty-text-wrap">
                              <span className="tku-curriculum-lesson-empty-title">
                                Chưa có bài học nào trong chương này
                              </span>
                              <span className="tku-curriculum-lesson-empty-desc">
                                Bấm vào nút "+ Thêm bài học" ở góc trên để khởi tạo bài giảng video hoặc tài liệu lý thuyết.
                              </span>
                            </div>
                          </div>
                        ) : (
                          ch.lessons.map((lesson, lIdx) => (
                            <div key={lesson.id} className="tku-curriculum-lesson-row">
                              <div className="tku-curriculum-lesson-left">
                                <span className="tku-curriculum-lesson-num">
                                  {lIdx + 1 < 10 ? `0${lIdx + 1}` : lIdx + 1}
                                </span>
                                <div
                                  className={`tku-curriculum-lesson-icon-box ${
                                    lesson.videoUrl
                                      ? 'tku-curriculum-lesson-icon-box--video'
                                      : 'tku-curriculum-lesson-icon-box--doc'
                                  }`}
                                  title={lesson.videoUrl ? 'Bài giảng Video' : 'Bài giảng Lý thuyết / Tài liệu'}
                                >
                                  {lesson.videoUrl ? <Video size={15} /> : <FileText size={15} />}
                                </div>
                                <div className="tku-curriculum-lesson-info">
                                  <span className="tku-curriculum-lesson-title" title={lesson.title}>
                                    {lesson.title}
                                  </span>
                                  {lesson.content && (
                                    <span className="tku-curriculum-lesson-preview-text" title={lesson.content}>
                                      {lesson.content}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="tku-curriculum-lesson-right">
                                {lesson.videoUrl ? (
                                  <span
                                    className={`tku-curriculum-media-badge ${
                                      getYouTubeVideoId(lesson.videoUrl)
                                        ? 'tku-curriculum-media-badge--youtube'
                                        : 'tku-curriculum-media-badge--video'
                                    }`}
                                    title={
                                      getYouTubeVideoId(lesson.videoUrl)
                                        ? 'Bài giảng video YouTube Unlisted'
                                        : 'Bài giảng video'
                                    }
                                  >
                                    <Video size={11} />
                                    <span>
                                      {getYouTubeVideoId(lesson.videoUrl) ? 'YouTube' : 'Video'}
                                    </span>
                                  </span>
                                ) : (
                                  <span
                                    className="tku-curriculum-media-badge tku-curriculum-media-badge--text"
                                    title="Bài học lý thuyết / tài liệu"
                                  >
                                    <FileText size={11} />
                                    <span>Lý thuyết</span>
                                  </span>
                                )}

                                {lesson.videoUrl && (
                                  <button
                                    type="button"
                                    className="tku-curriculum-lesson-action-btn tku-curriculum-lesson-action-btn--play"
                                    onClick={() => setPreviewVideoUrl(lesson.videoUrl || null)}
                                    title="Xem trước video bài giảng"
                                  >
                                    <Play size={11} />
                                    <span>Xem video</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="tku-curriculum-lesson-action-btn"
                                  onClick={() => handleOpenEditLesson(ch.id, ch.title, lesson)}
                                  title="Chỉnh sửa nội dung bài học"
                                >
                                  <Pencil size={11} />
                                  <span>Sửa</span>
                                </button>

                                <button
                                  type="button"
                                  className="tku-curriculum-lesson-action-btn tku-curriculum-lesson-action-btn--delete"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'lesson',
                                      id: lesson.id,
                                      title: lesson.title,
                                    })
                                  }
                                  title="Xóa bài học"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
      </main>

      {/* 5. Sub-modal / Drawer Soạn thảo bài học (Thêm mới / Sửa) */}
      {lessonForm && (
        <div
          className="tku-lesson-modal-overlay"
          onClick={() => {
            if (!isSubmittingLesson) {
              setLessonForm(null);
            }
          }}
        >
          <div className="tku-lesson-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tku-lesson-modal-header">
              <div>
                <span className="tku-lesson-modal-badge">
                  {lessonForm.mode === 'create' ? 'Tạo bài giảng mới' : 'Chỉnh sửa bài giảng'}
                </span>
                <h3 className="tku-lesson-modal-title">
                  {lessonForm.chapterTitle ? `Chương: ${lessonForm.chapterTitle}` : 'Soạn bài học'}
                </h3>
              </div>
              <button
                type="button"
                className="tku-lesson-modal-close-btn"
                onClick={() => setLessonForm(null)}
                title="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <div className="tku-lesson-modal-body">
              {/* Tiêu đề bài học */}
              <div className="tku-form-group">
                <label className="tku-form-label">
                  Tiêu đề bài học <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="tku-curriculum-input"
                  placeholder="Ví dụ: Bài 1: Khái niệm liên kết hóa học và cấu trúc phân tử..."
                  value={lessonForm.title}
                  onChange={(e) =>
                    setLessonForm((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev,
                    )
                  }
                  autoFocus
                />
              </div>

              {/* Video bài giảng */}
              <div className="tku-form-group">
                <div>
                  <label className="tku-form-label" style={{ margin: 0 }}>
                    Video bài giảng (YouTube Không công khai)
                  </label>
                  <span className="tku-form-sublabel">
                    Dán link video YouTube để phát mượt mà, 0đ và không tốn dung lượng máy chủ
                  </span>
                </div>

                <div className="tku-video-url-wrap">
                  {/* Hướng dẫn YouTube Unlisted */}
                  <div className="tku-youtube-unlisted-guide">
                    <div className="tku-youtube-guide-header">
                      <span className="tku-youtube-badge">Khuyên dùng</span>
                      <span className="tku-youtube-guide-title">
                        Hướng dẫn nhúng video YouTube "Không công khai"
                      </span>
                    </div>
                    <ol className="tku-youtube-steps">
                      <li>
                        Tải video lên YouTube của bạn, tại bước <strong>Chế độ hiển thị (Visibility)</strong> chọn{' '}
                        <strong style={{ color: '#1d68f2' }}>"Không công khai" (Unlisted)</strong> để video không xuất hiện trên tìm kiếm chung.
                      </li>
                      <li>Sao chép đường link video đó và dán vào ô bên dưới.</li>
                    </ol>
                  </div>

                  <div className="tku-youtube-input-wrap">
                    <input
                      type="text"
                      className="tku-curriculum-input"
                      placeholder="Dán link YouTube (ví dụ: https://www.youtube.com/watch?v=... hoặc https://youtu.be/...)"
                      value={lessonForm.videoUrl}
                      onChange={(e) =>
                        setLessonForm((prev) =>
                          prev ? { ...prev, videoUrl: e.target.value } : prev,
                        )
                      }
                    />
                    {lessonForm.videoUrl && (
                      <button
                        type="button"
                        className="tku-youtube-clear-btn"
                        onClick={() =>
                          setLessonForm((prev) =>
                            prev ? { ...prev, videoUrl: '' } : prev,
                          )
                        }
                        title="Xóa đường dẫn"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {getYouTubeVideoId(lessonForm.videoUrl) ? (
                    <div className="tku-youtube-detected-badge">
                      <CheckCircle2 size={14} color="#10b981" />
                      <span>Đã nhận diện video YouTube hợp lệ. Trình phát chuyên biệt đã sẵn sàng cho học viên.</span>
                    </div>
                  ) : lessonForm.videoUrl && !isDirectVideoUrl(lessonForm.videoUrl) ? (
                    <span className="tku-input-helper-text" style={{ color: '#eab308' }}>
                      Đường dẫn chưa đúng định dạng YouTube tiêu chuẩn. Vui lòng kiểm tra lại.
                    </span>
                  ) : (
                    <span className="tku-input-helper-text">
                      Hệ thống tự động nhúng trình phát chuyên dụng, tắt các gợi ý video ngoài để học viên tập trung học tập.
                    </span>
                  )}

                  {/* Form Video Preview khi nhập link */}
                  {lessonForm.videoUrl && (
                    <div className="tku-video-preview-box">
                      {getYouTubeEmbedUrl(lessonForm.videoUrl) ? (
                        <iframe
                          src={getYouTubeEmbedUrl(lessonForm.videoUrl)!}
                          title="Xem trước video bài giảng"
                          className="tku-video-preview-iframe"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      ) : isDirectVideoUrl(lessonForm.videoUrl) ? (
                        <video
                          src={lessonForm.videoUrl}
                          controls
                          className="tku-video-preview-player"
                        />
                      ) : (
                        <div className="tku-video-preview-link-fallback">
                          <a href={lessonForm.videoUrl} target="_blank" rel="noreferrer">
                            <ExternalLink size={14} />
                            <span>Mở liên kết video bài giảng trong tab mới</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Nội dung bài học */}
              <div className="tku-form-group">
                <label className="tku-form-label">
                  Nội dung bài giảng / Ghi chú lý thuyết
                </label>
                <textarea
                  className="tku-curriculum-textarea"
                  rows={5}
                  placeholder="Nhập nội dung tóm tắt bài giảng, hướng dẫn học tập, công thức hoặc tài liệu liên quan cho học viên..."
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
                className="tku-curriculum-btn-cancel"
                onClick={() => setLessonForm(null)}
                disabled={isSubmittingLesson}
              >
                Hủy
              </button>
              <button
                type="button"
                className="tku-curriculum-btn-submit"
                onClick={handleSaveLesson}
                disabled={isSubmittingLesson || !lessonForm.title.trim()}
              >
                {isSubmittingLesson ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>
                  {lessonForm.mode === 'create' ? 'Lưu bài học' : 'Cập nhật bài học'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Video Preview Modal */}
      {previewVideoUrl && (
        <div
          className="tku-video-modal-overlay"
          onClick={() => setPreviewVideoUrl(null)}
        >
          <div
            className="tku-video-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tku-video-modal-header">
              <div className="tku-video-modal-title">
                <Video size={16} />
                <span>Xem trước video bài giảng</span>
              </div>
              <button
                type="button"
                className="tku-video-modal-close"
                onClick={() => setPreviewVideoUrl(null)}
                title="Đóng video"
              >
                <X size={18} />
              </button>
            </div>
            <div className="tku-video-modal-player-wrap">
              {getYouTubeEmbedUrl(previewVideoUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(previewVideoUrl)!}
                  title="Video bài giảng"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video
                  src={previewVideoUrl}
                  controls
                  autoPlay
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="tku-confirm-modal-overlay"
          onClick={() => {
            if (!isDeleting) setDeleteTarget(null);
          }}
        >
          <div className="tku-confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tku-confirm-icon-box">
              <Trash2 size={24} />
            </div>
            <h3 className="tku-confirm-title">
              Xác nhận xóa {deleteTarget.type === 'chapter' ? 'chương học' : 'bài giảng'}?
            </h3>
            <p className="tku-confirm-desc">
              Bạn có chắc chắn muốn xóa{' '}
              <strong>"{deleteTarget.title}"</strong>?
              {deleteTarget.type === 'chapter' &&
                ' Toàn bộ các bài giảng trực thuộc chương này cũng sẽ bị xóa. Thao tác này không thể hoàn tác.'}
            </p>
            <div className="tku-confirm-actions">
              <button
                type="button"
                className="tku-curriculum-btn-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="tku-btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerCourseCurriculumPage;
