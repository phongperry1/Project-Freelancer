import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
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
  Paperclip,
  UploadCloud,
  FileArchive,
  Presentation,
  Link2,
} from 'lucide-react';
import {
  lecturerService,
  type LecturerCourseItem,
  type LessonSummary,
} from '../../services/lecturer.service';
import { toast } from '../../context/toastService';
import './lecturerCurriculum.css';

export interface LessonAttachmentItem {
  id: string;
  title: string;
  url: string;
  type: 'pdf' | 'slide' | 'doc' | 'archive' | 'link';
  sizeStr?: string;
}

interface LessonFormState {
  mode: 'create' | 'edit';
  chapterId: string;
  chapterTitle?: string;
  lessonId?: string;
  title: string;
  content: string;
  attachments: LessonAttachmentItem[];
  videoUrl: string;
}

interface DeleteTarget {
  type: 'chapter' | 'lesson';
  id: string;
  title: string;
}

const inferAttachmentType = (url: string, filename?: string): LessonAttachmentItem['type'] => {
  const target = (filename || url).toLowerCase();
  if (target.includes('.pdf') || target.includes('/pdf')) return 'pdf';
  if (
    target.includes('.ppt') ||
    target.includes('.pptx') ||
    target.includes('presentation') ||
    target.includes('slideshare') ||
    target.includes('canva.com')
  ) {
    return 'slide';
  }
  if (
    target.includes('.doc') ||
    target.includes('.docx') ||
    target.includes('docs.google.com') ||
    target.includes('drive.google.com')
  ) {
    return 'doc';
  }
  if (
    target.includes('.zip') ||
    target.includes('.rar') ||
    target.includes('.7z') ||
    target.includes('.tar') ||
    target.includes('.gz')
  ) {
    return 'archive';
  }
  return 'link';
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const parseAttachmentsFromContent = (
  rawContent?: string | null,
): { notes: string; attachments: LessonAttachmentItem[] } => {
  if (!rawContent) return { notes: '', attachments: [] };

  const attachments: LessonAttachmentItem[] = [];
  const seenUrls = new Set<string>();

  // Extract markdown links: [Title](url)
  const mdRegex = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g;
  let mdMatch: RegExpExecArray | null;
  while ((mdMatch = mdRegex.exec(rawContent)) !== null) {
    if (mdMatch.index > 0 && rawContent[mdMatch.index - 1] === '!') {
      continue; // Skip images ![alt](url)
    }
    const rawTitle = mdMatch[1].trim();
    const rawUrl = mdMatch[2].trim();
    if (seenUrls.has(rawUrl)) continue;
    if (/\.(png|jpe?g|gif|webp|svg|mp4|webm|mov)($|\?)/i.test(rawUrl)) continue;
    if (/youtube\.com|youtu\.be|vimeo\.com/i.test(rawUrl)) continue;

    seenUrls.add(rawUrl);
    attachments.push({
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: rawTitle,
      url: rawUrl,
      type: inferAttachmentType(rawUrl, rawTitle),
    });
  }

  // Clean the notes so raw repeated markdown headings don't clutter the textarea
  const cleanedNotes = rawContent
    .replace(/###\s*(?:📁)?\s*Tài liệu & Slide đính kèm:?/gi, '')
    .replace(/###\s*(?:📁)?\s*Tài liệu đính kèm:?/gi, '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return !/^[-*]\s*\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)$/.test(trimmed);
    })
    .join('\n')
    .trim();

  return { notes: cleanedNotes, attachments };
};

const composeContentWithAttachments = (
  notes: string,
  attachments: LessonAttachmentItem[],
): string => {
  const cleanNotes = notes.trim();
  if (!attachments || attachments.length === 0) {
    return cleanNotes;
  }

  const attachmentsSection = [
    '### 📁 Tài liệu & Slide đính kèm:',
    ...attachments.map((att) => `- [${att.title.trim() || 'Tài liệu học tập'}](${att.url.trim()})`),
  ].join('\n');

  if (!cleanNotes) {
    return attachmentsSection;
  }

  return `${cleanNotes}\n\n${attachmentsSection}`;
};

const countAttachments = (content?: string | null): number => {
  if (!content) return 0;
  const mdRegex = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g;
  let count = 0;
  let match: RegExpExecArray | null;
  while ((match = mdRegex.exec(content)) !== null) {
    if (match.index > 0 && content[match.index - 1] === '!') continue;
    const url = match[2].trim();
    if (/\.(png|jpe?g|gif|webp|svg|mp4|webm|mov)($|\?)/i.test(url)) continue;
    if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) continue;
    count++;
  }
  return count;
};

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

  // Lesson Attachment Uploader State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [showAddLinkForm, setShowAddLinkForm] = useState<boolean>(false);
  const [linkTitle, setLinkTitle] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');

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
      attachments: [],
      videoUrl: '',
    });
    setShowAddLinkForm(false);
    setLinkTitle('');
    setLinkUrl('');
  }, []);

  const handleOpenEditLesson = useCallback(
    (chapterId: string, chapterTitle: string, lesson: LessonSummary) => {
      const { notes, attachments } = parseAttachmentsFromContent(lesson.content);
      setLessonForm({
        mode: 'edit',
        chapterId,
        chapterTitle,
        lessonId: lesson.id,
        title: lesson.title,
        content: notes,
        attachments,
        videoUrl: lesson.videoUrl || '',
      });
      setShowAddLinkForm(false);
      setLinkTitle('');
      setLinkUrl('');
    },
    [],
  );

  // 4. Lesson Attachment Handlers
  const handleUploadDocumentFile = async (file: File) => {
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      toast.error('Dung lượng tệp vượt quá giới hạn cho phép (tối đa 30MB).');
      return;
    }

    setIsUploadingDocument(true);
    try {
      const res = await lecturerService.uploadDocument(file);
      const originalname = res.originalname || file.name;
      const type = inferAttachmentType(res.url, originalname);

      const newAttachment: LessonAttachmentItem = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: originalname,
        url: res.url,
        type,
        sizeStr: formatFileSize(file.size),
      };

      setLessonForm((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          attachments: [...prev.attachments, newAttachment],
        };
      });

      toast.success(`Đã tải lên tài liệu: "${originalname}"`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể tải lên tệp tài liệu.',
      );
    } finally {
      setIsUploadingDocument(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddExternalLink = () => {
    if (!linkUrl.trim()) {
      toast.warning('Vui lòng nhập đường dẫn liên kết.');
      return;
    }

    const cleanUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      toast.warning('Đường dẫn phải bắt đầu bằng http:// hoặc https://');
      return;
    }

    const title = linkTitle.trim() || cleanUrl;
    const type = inferAttachmentType(cleanUrl, title);

    const newAttachment: LessonAttachmentItem = {
      id: `att_link_${Date.now()}`,
      title,
      url: cleanUrl,
      type,
    };

    setLessonForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        attachments: [...prev.attachments, newAttachment],
      };
    });

    setLinkTitle('');
    setLinkUrl('');
    setShowAddLinkForm(false);
    toast.success('Đã thêm liên kết tài liệu thành công.');
  };

  const handleRemoveAttachment = (attId: string) => {
    setLessonForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        attachments: prev.attachments.filter((a) => a.id !== attId),
      };
    });
  };

  const handleUpdateAttachmentTitle = (attId: string, newTitle: string) => {
    setLessonForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        attachments: prev.attachments.map((a) =>
          a.id === attId ? { ...a, title: newTitle } : a,
        ),
      };
    });
  };

  // 5. Save Lesson
  const handleSaveLesson = async () => {
    if (!lessonForm) return;
    if (!lessonForm.title.trim()) {
      toast.warning('Vui lòng nhập tiêu đề bài học.');
      return;
    }

    setIsSubmittingLesson(true);
    try {
      const finalContent = composeContentWithAttachments(
        lessonForm.content,
        lessonForm.attachments,
      );

      if (lessonForm.mode === 'create') {
        await lecturerService.addLesson(lessonForm.chapterId, {
          title: lessonForm.title.trim(),
          content: finalContent || null,
          videoUrl: lessonForm.videoUrl.trim() || null,
        });
        toast.success(`Đã thêm bài học: "${lessonForm.title.trim()}"`);
      } else if (lessonForm.mode === 'edit' && lessonForm.lessonId) {
        await lecturerService.updateLesson(lessonForm.lessonId, {
          title: lessonForm.title.trim(),
          content: finalContent || null,
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

  // Target Chapter and Lesson Lookups for Delete Confirmation Modal
  const targetChapter =
    deleteTarget?.type === 'chapter'
      ? course?.chapters?.find((c) => c.id === deleteTarget.id) || null
      : null;

  const targetLessonInfo =
    deleteTarget?.type === 'lesson'
      ? (() => {
          for (const ch of course?.chapters || []) {
            const found = ch.lessons?.find((l) => l.id === deleteTarget.id);
            if (found) return { lesson: found, chapter: ch };
          }
          return null;
        })()
      : null;

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

          {/* Dòng chỉ số học thuật đồng bộ thiết kế TKU */}
          <div className="tku-curriculum-metrics-bar">
            <div className="tku-curriculum-stat-tag tku-curriculum-stat-tag--chapters">
              <Layers size={14} className="tku-curriculum-stat-tag__icon" />
              <span><strong>{stats.totalChapters}</strong> chương học</span>
            </div>
            <div className="tku-curriculum-stat-tag tku-curriculum-stat-tag--lessons">
              <FileText size={14} className="tku-curriculum-stat-tag__icon" />
              <span><strong>{stats.totalLessons}</strong> bài giảng</span>
            </div>
            <div className="tku-curriculum-stat-tag tku-curriculum-stat-tag--videos">
              <Video size={14} className="tku-curriculum-stat-tag__icon" />
              <span><strong>{stats.videoLessons}</strong> bài có video</span>
            </div>
            <div className="tku-curriculum-stat-tag tku-curriculum-stat-tag--students">
              <Users size={14} className="tku-curriculum-stat-tag__icon" />
              <span><strong>{stats.studentsCount}</strong> học viên</span>
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

                                {countAttachments(lesson.content) > 0 && (
                                  <span
                                    className="tku-curriculum-media-badge tku-curriculum-media-badge--attachment"
                                    title={`Có ${countAttachments(lesson.content)} tệp tài liệu / slide đính kèm`}
                                  >
                                    <Paperclip size={11} />
                                    <span>{countAttachments(lesson.content)} tài liệu</span>
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

              {/* Tài liệu & Slide bài giảng đính kèm */}
              <div className="tku-form-group tku-attachments-section">
                <div className="tku-attachments-header">
                  <div className="tku-attachments-header-title">
                    <label className="tku-form-label" style={{ margin: 0 }}>
                      <Paperclip size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Tài liệu & Slide bài giảng đính kèm
                    </label>
                    {lessonForm.attachments.length > 0 && (
                      <span className="tku-attachments-badge">
                        {lessonForm.attachments.length} tệp
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="tku-add-link-btn"
                    onClick={() => setShowAddLinkForm(!showAddLinkForm)}
                  >
                    <Plus size={13} />
                    <span>{showAddLinkForm ? 'Đóng thêm link' : 'Thêm link ngoài (Drive, Canva)'}</span>
                  </button>
                </div>

                <span className="tku-form-sublabel">
                  Tải lên slide bài giảng (PPTX, PPT, PDF), tài liệu học tập (DOCX, ZIP) hoặc dán link Google Drive, Canva Slides. Học sinh có thể tải về trực tiếp trong phòng học.
                </span>

                {/* Form thêm link ngoài (Drive, Canva, Slides) */}
                {showAddLinkForm && (
                  <div className="tku-add-link-card">
                    <div className="tku-add-link-inputs">
                      <input
                        type="text"
                        className="tku-curriculum-input"
                        placeholder="Tiêu đề tài liệu (Ví dụ: Slide thuyết trình Canva...)"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                      />
                      <input
                        type="text"
                        className="tku-curriculum-input"
                        placeholder="Đường link URL (https://drive.google.com/... hoặc Canva)"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                      />
                    </div>
                    <div className="tku-add-link-actions">
                      <button
                        type="button"
                        className="tku-curriculum-btn-cancel"
                        style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                        onClick={() => {
                          setShowAddLinkForm(false);
                          setLinkTitle('');
                          setLinkUrl('');
                        }}
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        className="tku-curriculum-btn-submit"
                        style={{ height: '32px', padding: '0 14px', fontSize: '12px' }}
                        onClick={handleAddExternalLink}
                        disabled={!linkUrl.trim()}
                      >
                        <Check size={13} />
                        <span>Thêm tài liệu</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Dropzone Upload file */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.zip,.rar,.7z,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleUploadDocumentFile(file);
                    }
                  }}
                />

                <div
                  className={`tku-doc-dropzone ${isDraggingOver ? 'tku-doc-dropzone--active' : ''} ${
                    isUploadingDocument ? 'tku-doc-dropzone--uploading' : ''
                  }`}
                  onClick={() => {
                    if (!isUploadingDocument) {
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      void handleUploadDocumentFile(file);
                    }
                  }}
                >
                  <div className="tku-doc-dropzone-icon">
                    {isUploadingDocument ? (
                      <Loader2 size={22} className="animate-spin" />
                    ) : (
                      <UploadCloud size={24} />
                    )}
                  </div>
                  <div className="tku-doc-dropzone-text">
                    {isUploadingDocument ? (
                      <span>Đang tải tệp lên Cloudinary... Vui lòng chờ</span>
                    ) : (
                      <span>
                        Kéo thả tệp tài liệu / slide vào đây, hoặc <strong>duyệt tệp từ thiết bị</strong>
                      </span>
                    )}
                  </div>
                  <span className="tku-doc-dropzone-hint">
                    Hỗ trợ: PDF, PPTX, PPT, DOCX, ZIP, RAR (Tối đa 30MB/file)
                  </span>
                </div>

                {/* Danh sách các tài liệu đã đính kèm */}
                {lessonForm.attachments.length > 0 && (
                  <div className="tku-attachment-list">
                    {lessonForm.attachments.map((att) => {
                      let IconComponent = FileText;
                      let iconModifier = 'pdf';
                      if (att.type === 'slide') {
                        IconComponent = Presentation;
                        iconModifier = 'slide';
                      } else if (att.type === 'doc') {
                        IconComponent = FileText;
                        iconModifier = 'doc';
                      } else if (att.type === 'archive') {
                        IconComponent = FileArchive;
                        iconModifier = 'archive';
                      } else if (att.type === 'link') {
                        IconComponent = Link2;
                        iconModifier = 'link';
                      }

                      return (
                        <div key={att.id} className="tku-attachment-card">
                          <div className="tku-attachment-left">
                            <div className={`tku-attachment-icon-wrap tku-attachment-icon-wrap--${iconModifier}`}>
                              <IconComponent size={18} />
                            </div>
                            <div className="tku-attachment-info">
                              <input
                                type="text"
                                className="tku-attachment-title-input"
                                value={att.title}
                                onChange={(e) => handleUpdateAttachmentTitle(att.id, e.target.value)}
                                title="Nhấp để sửa tên hiển thị của tài liệu"
                              />
                              <div className="tku-attachment-meta">
                                <span className="tku-attachment-type-tag">{att.type}</span>
                                {att.sizeStr && <span>• {att.sizeStr}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="tku-attachment-actions">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="tku-attachment-action-btn"
                              title="Mở xem tài liệu trong tab mới"
                            >
                              <ExternalLink size={13} />
                            </a>
                            <button
                              type="button"
                              className="tku-attachment-action-btn tku-attachment-action-btn--delete"
                              onClick={() => handleRemoveAttachment(att.id)}
                              title="Xóa tài liệu này"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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

      {/* 7. Delete Confirmation Modal (Enhanced Academic UI) */}
      {deleteTarget && (
        <div
          className="tku-confirm-modal-overlay"
          onClick={() => {
            if (!isDeleting) setDeleteTarget(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tku-delete-modal-title"
        >
          <div className="tku-confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tku-delete-modal-header">
              <div className="tku-delete-modal-icon-wrap">
                <AlertTriangle size={22} />
              </div>
              <div className="tku-delete-modal-heading">
                <h3 id="tku-delete-modal-title" className="tku-delete-modal-title">
                  {deleteTarget.type === 'chapter' ? 'Xác nhận xóa chương học' : 'Xác nhận xóa bài giảng'}
                </h3>
                <p className="tku-delete-modal-subtitle">
                  {deleteTarget.type === 'chapter'
                    ? 'Thao tác sẽ xóa chương và toàn bộ bài giảng trực thuộc.'
                    : 'Thao tác sẽ gỡ bỏ bài giảng này khỏi giáo trình.'}
                </p>
              </div>
              <button
                type="button"
                className="tku-modal-close"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                aria-label="Đóng hộp thoại"
              >
                <X size={18} />
              </button>
            </div>

            <div className="tku-modal-body tku-delete-modal-body">
              {deleteTarget.type === 'chapter' && targetChapter && (
                <div className="tku-delete-item-preview">
                  <div className="tku-delete-item-preview__badge">
                    <BookOpen size={12} />
                    <span>{course?.title || 'Khóa học'}</span>
                  </div>
                  <h4 className="tku-delete-item-preview__title" title={deleteTarget.title}>
                    {deleteTarget.title}
                  </h4>
                  <div className="tku-delete-item-preview__meta">
                    <span>{targetChapter.lessons?.length || 0} bài giảng trực thuộc</span>
                  </div>
                </div>
              )}

              {deleteTarget.type === 'lesson' && targetLessonInfo && (
                <div className="tku-delete-item-preview">
                  <div className="tku-delete-item-preview__badge">
                    <Layers size={12} />
                    <span>{targetLessonInfo.chapter.title || 'Chương học'}</span>
                  </div>
                  <h4 className="tku-delete-item-preview__title" title={deleteTarget.title}>
                    {deleteTarget.title}
                  </h4>
                  <div className="tku-delete-item-preview__meta">
                    <span>{targetLessonInfo.lesson.videoUrl ? 'Bài giảng Video' : 'Lý thuyết / Tài liệu'}</span>
                    {targetLessonInfo.lesson.content && (
                      <>
                        <span className="tku-delete-item-sep">•</span>
                        <span className="tku-delete-item-sub">{targetLessonInfo.lesson.content}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="tku-delete-warning-callout">
                <AlertCircle size={16} className="tku-delete-warning-icon" />
                <p className="tku-delete-warning-text">
                  <strong>Cảnh báo học vụ:</strong>{' '}
                  {deleteTarget.type === 'chapter'
                    ? 'Toàn bộ bài giảng, tài liệu đính kèm và dữ liệu tiến độ học tập của học viên trong chương này sẽ bị xóa vĩnh viễn và không thể khôi phục.'
                    : 'Nội dung bài học, tài liệu đính kèm và lịch sử học tập của học viên đối với bài này sẽ bị xóa vĩnh viễn và không thể khôi phục.'}
                </p>
              </div>
            </div>

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
                {isDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Xóa vĩnh viễn</span>
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

export default LecturerCourseCurriculumPage;
