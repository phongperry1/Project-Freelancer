import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  FileCheck,
  FileDown,
  FileText,
  GraduationCap,
  HelpCircle,
  Loader2,
  Menu,
  MessageSquare,
  Play,
  PlayCircle,
  Plus,
  Presentation,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Footer } from '../../components/common/Footer';
import { Navbar } from '../../components/common/Navbar';
import { useAuth } from '../../context/useAuth';
import { toast } from '../../context/useToast';
import {
  courseService,
  type CourseLearningRoomResponse,
  type LearningChapterItem,
  type LearningLessonItem,
  type LessonNoteItem,
  type StudentAssessmentItem,
} from '../../services/course.service';
import { LessonDiscussionPane } from './components/LessonDiscussionPane';
import { LessonAiAssistantPane } from './components/LessonAiAssistantPane';
import './courseLearningRoom.css';

// ============================================================================
// LOCAL TYPES & YOUTUBE HELPERS (HOÀN TOÀN ĐÓNG GÓI, KHÔNG SỬA CORE)
// ============================================================================
interface YouTubePlayerInstance {
  getCurrentTime: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  pauseVideo: () => void;
  playVideo: () => void;
  destroy: () => void;
}

interface YouTubeNamespace {
  Player: new (
    element: HTMLElement | string | null,
    options: {
      videoId?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, unknown>;
      events?: {
        onReady?: (event: unknown) => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: unknown) => void;
      };
    },
  ) => YouTubePlayerInstance;
}

const getYT = (): YouTubeNamespace | undefined => {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { YT?: YouTubeNamespace }).YT;
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

const isDirectVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)($|\?)/i.test(url) || url.includes('cloudinary');
};

const formatVideoTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export interface LessonAttachment {
  id: string;
  title: string;
  url: string;
  type: 'pdf' | 'slide' | 'doc' | 'archive' | 'link';
}

const extractLessonAttachments = (content?: string | null): LessonAttachment[] => {
  if (!content) return [];
  const results: LessonAttachment[] = [];
  const seenUrls = new Set<string>();

  // 1. Kiểm tra định dạng markdown link: [Tên tài liệu](url)
  const mdRegex = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g;
  let mdMatch: RegExpExecArray | null;
  while ((mdMatch = mdRegex.exec(content)) !== null) {
    // Bỏ qua nếu là cú pháp nhúng ảnh ![Ảnh](url)
    if (mdMatch.index > 0 && content[mdMatch.index - 1] === '!') {
      continue;
    }

    const rawTitle = mdMatch[1].trim();
    const rawUrl = mdMatch[2].trim();
    if (seenUrls.has(rawUrl)) continue;

    // Bỏ qua nếu là file hình ảnh hoặc video
    if (/\.(png|jpe?g|gif|webp|svg|mp4|webm|mov)($|\?)/i.test(rawUrl)) continue;
    if (/youtube\.com|youtu\.be|vimeo\.com/i.test(rawUrl)) continue;

    seenUrls.add(rawUrl);

    let type: LessonAttachment['type'] = 'link';
    const lower = rawUrl.toLowerCase();
    if (lower.includes('.pdf') || lower.includes('/pdf')) type = 'pdf';
    else if (
      lower.includes('.ppt') ||
      lower.includes('.pptx') ||
      lower.includes('presentation') ||
      lower.includes('slideshare') ||
      lower.includes('canva.com')
    ) {
      type = 'slide';
    } else if (lower.includes('.doc') || lower.includes('.docx')) {
      type = 'doc';
    } else if (lower.includes('.zip') || lower.includes('.rar') || lower.includes('.7z')) {
      type = 'archive';
    } else if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) {
      type = 'doc';
    }

    results.push({
      id: `att_md_${results.length}_${rawUrl.slice(-8)}`,
      title: rawTitle,
      url: rawUrl,
      type,
    });
  }

  // 2. Kiểm tra link file trực tiếp (.pdf, .pptx, .ppt, .docx, .zip)
  const urlRegex = /(https?:\/\/[^\s<>"'()]+\.(?:pdf|pptx?|docx?|zip|rar)(?:\?[^\s<>"'()]*)?)/gi;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlRegex.exec(content)) !== null) {
    const rawUrl = urlMatch[1].trim();
    if (seenUrls.has(rawUrl)) continue;
    seenUrls.add(rawUrl);

    const fileName = rawUrl.split('/').pop()?.split('?')[0] || 'Tài liệu bài học';
    let type: LessonAttachment['type'] = 'link';
    const lower = rawUrl.toLowerCase();
    if (lower.includes('.pdf')) type = 'pdf';
    else if (lower.includes('.ppt')) type = 'slide';
    else if (lower.includes('.doc')) type = 'doc';
    else if (lower.includes('.zip') || lower.includes('.rar')) type = 'archive';

    results.push({
      id: `att_file_${results.length}_${rawUrl.slice(-8)}`,
      title: decodeURIComponent(fileName),
      url: rawUrl,
      type,
    });
  }

  // 3. Kiểm tra liên kết tài liệu đám mây Google Drive / Docs / Slides
  const driveRegex = /(https?:\/\/(?:docs|drive)\.google\.com\/[^\s<>"'()]+)/gi;
  let driveMatch: RegExpExecArray | null;
  while ((driveMatch = driveRegex.exec(content)) !== null) {
    const rawUrl = driveMatch[1].trim();
    if (seenUrls.has(rawUrl)) continue;
    seenUrls.add(rawUrl);

    let title = 'Tài liệu bài giảng (Google Drive)';
    let type: LessonAttachment['type'] = 'doc';
    if (rawUrl.includes('presentation')) {
      title = 'Slide bài giảng (Google Slides)';
      type = 'slide';
    } else if (rawUrl.includes('document')) {
      title = 'Văn bản bài học (Google Docs)';
      type = 'doc';
    } else if (rawUrl.includes('spreadsheets')) {
      title = 'Bảng tính thực hành (Google Sheets)';
      type = 'doc';
    }

    results.push({
      id: `att_drive_${results.length}_${rawUrl.slice(-8)}`,
      title,
      url: rawUrl,
      type,
    });
  }

  return results;
};

// Tự động tải YouTube script động chỉ khi người dùng vào phòng học (Lazy Load & Singleton Promise)
let youtubeApiPromise: Promise<void> | null = null;
const loadYouTubeIframeApi = (): Promise<void> => {
  if (getYT()?.Player) {
    return Promise.resolve();
  }
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    if (typeof document !== 'undefined') {
      let script = document.getElementById('youtube-iframe-api') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'youtube-iframe-api';
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      }
    }

    let attempts = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    interval = setInterval(() => {
      attempts++;
      if (getYT()?.Player) {
        if (interval) clearInterval(interval);
        resolve();
      } else if (attempts > 40) {
        if (interval) clearInterval(interval);
        resolve();
      }
    }, 100);
  });

  return youtubeApiPromise;
};

const MAX_ALLOWED_SEEK_FORWARD_SECONDS = 10;

const formatLessonTitle = (title: string, index: number): string => {
  const trimmed = title.trim();
  if (/^(bài\s*\d+[:.]?|\d+[:.])/i.test(trimmed)) {
    return trimmed;
  }
  return `${index + 1}. ${trimmed}`;
};

// ============================================================================
// YOUTUBE PLAYER WITH ANTI-SEEK & AUTO-COMPLETION
// ============================================================================
interface YouTubeVideoPlayerProps {
  videoId: string;
  title: string;
  onEnded: () => void;
  onSeekWarning: (maxWatchedSec: number) => void;
  resumeTrigger: number;
  onTimeUpdate?: (seconds: number) => void;
  seekTarget?: { time: number; trigger: number } | null;
}

const YouTubeVideoPlayer: React.FC<YouTubeVideoPlayerProps> = ({
  videoId,
  title,
  onEnded,
  onSeekWarning,
  resumeTrigger,
  onTimeUpdate,
  seekTarget,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const maxWatchedTimeRef = useRef<number>(0);
  const hasEndedRef = useRef<boolean>(false);
  const [apiFailed, setApiFailed] = useState<boolean>(false);

  // Lưu callback vào ref để tránh re-trigger effect hủy và tạo lại iframe YouTube khi state ở component cha thay đổi
  const onEndedRef = useRef(onEnded);
  const onSeekWarningRef = useRef(onSeekWarning);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    onSeekWarningRef.current = onSeekWarning;
  }, [onSeekWarning]);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  // Hỗ trợ nhảy mốc thời gian khi học viên/giáo viên bấm vào tag [MM:SS]
  useEffect(() => {
    if (seekTarget && playerRef.current && typeof playerRef.current.seekTo === 'function') {
      const targetSec = seekTarget.time;
      maxWatchedTimeRef.current = Math.max(maxWatchedTimeRef.current, targetSec);
      try {
        playerRef.current.seekTo(targetSec, true);
        playerRef.current.playVideo();
      } catch {
        // Bỏ qua lỗi phát video nếu có
      }
    }
  }, [seekTarget]);

  useEffect(() => {
    let isMounted = true;
    maxWatchedTimeRef.current = 0;
    hasEndedRef.current = false;

    loadYouTubeIframeApi().then(() => {
      if (!isMounted) return;

      const YT = getYT();
      if (!YT || !YT.Player || !containerRef.current) {
        setApiFailed(true);
        return;
      }

      try {
        playerRef.current = new YT.Player(containerRef.current, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onStateChange: (event: { data: number }) => {
              // 0: ENDED, 1: PLAYING, 2: PAUSED, 3: BUFFERING, 5: CUED
              if (event.data === 0) {
                if (!hasEndedRef.current) {
                  hasEndedRef.current = true;
                  onEndedRef.current();
                }
              }
            },
            onError: () => {
              setApiFailed(true);
            },
          },
        });
      } catch {
        setApiFailed(true);
      }
    });

    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;

      try {
        const state = player.getPlayerState();
        // 1: PLAYING, 3: BUFFERING
        if (state === 1 || state === 3) {
          const currentTime = player.getCurrentTime();
          if (typeof currentTime === 'number' && !isNaN(currentTime)) {
            onTimeUpdateRef.current?.(currentTime);
            // Chỉ hiển thị cảnh báo và kéo lùi nếu tua video nhanh quá 10 giây
            if (currentTime > maxWatchedTimeRef.current + MAX_ALLOWED_SEEK_FORWARD_SECONDS) {
              player.seekTo(maxWatchedTimeRef.current, true);
              player.pauseVideo();
              onSeekWarningRef.current(maxWatchedTimeRef.current);
            } else if (currentTime > maxWatchedTimeRef.current) {
              maxWatchedTimeRef.current = currentTime;
            }
          }
        } else if (state === 0) {
          if (!hasEndedRef.current) {
            hasEndedRef.current = true;
            onEndedRef.current();
          }
        }
      } catch {
        // Bỏ qua lỗi giao tiếp iframe cross-origin tạm thời
      }
    }, 300);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {
          // Bỏ qua
        }
      }
      playerRef.current = null;
    };
  }, [videoId]);

  // Tiếp tục phát lại sau khi đóng modal cảnh báo
  useEffect(() => {
    if (resumeTrigger > 0 && playerRef.current && typeof playerRef.current.playVideo === 'function') {
      try {
        playerRef.current.playVideo();
      } catch {
        // Bỏ qua
      }
    }
  }, [resumeTrigger]);

  if (apiFailed) {
    return (
      <iframe
        className="tku-learning-video-iframe"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return <div ref={containerRef} className="tku-learning-video-iframe" />;
};

// ============================================================================
// NATIVE HTML5 VIDEO PLAYER WITH ANTI-SEEK & AUTO-COMPLETION
// ============================================================================
interface NativeVideoPlayerProps {
  videoUrl: string;
  poster?: string;
  onEnded: () => void;
  onSeekWarning: (maxWatchedSec: number) => void;
  resumeTrigger: number;
  onTimeUpdate?: (seconds: number) => void;
  seekTarget?: { time: number; trigger: number } | null;
}

const NativeVideoPlayer: React.FC<NativeVideoPlayerProps> = ({
  videoUrl,
  poster,
  onEnded,
  onSeekWarning,
  resumeTrigger,
  onTimeUpdate,
  seekTarget,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const maxWatchedTimeRef = useRef<number>(0);
  const hasEndedRef = useRef<boolean>(false);

  const onEndedRef = useRef(onEnded);
  const onSeekWarningRef = useRef(onSeekWarning);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    onSeekWarningRef.current = onSeekWarning;
  }, [onSeekWarning]);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  // Hỗ trợ nhảy mốc thời gian khi học viên/giáo viên bấm vào tag [MM:SS]
  useEffect(() => {
    if (seekTarget && videoRef.current) {
      const targetSec = seekTarget.time;
      maxWatchedTimeRef.current = Math.max(maxWatchedTimeRef.current, targetSec);
      videoRef.current.currentTime = targetSec;
      videoRef.current.play().catch(() => {});
    }
  }, [seekTarget]);

  const checkSeeking = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const current = video.currentTime;
    if (current > maxWatchedTimeRef.current + MAX_ALLOWED_SEEK_FORWARD_SECONDS) {
      video.currentTime = maxWatchedTimeRef.current;
      video.pause();
      onSeekWarningRef.current(maxWatchedTimeRef.current);
    } else if (current > maxWatchedTimeRef.current) {
      maxWatchedTimeRef.current = current;
    }
  }, []);

  const handleEnded = useCallback(() => {
    if (!hasEndedRef.current) {
      hasEndedRef.current = true;
      onEndedRef.current();
    }
  }, []);

  useEffect(() => {
    if (resumeTrigger > 0 && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [resumeTrigger]);

  return (
    <video
      ref={videoRef}
      className="tku-learning-video-native"
      src={videoUrl}
      controls
      controlsList="nodownload"
      poster={poster}
      onSeeking={checkSeeking}
      onTimeUpdate={(e) => {
        checkSeeking();
        onTimeUpdateRef.current?.(e.currentTarget.currentTime);
      }}
      onEnded={handleEnded}
    >
      <track kind="captions" />
      Trình duyệt của bạn không hỗ trợ phát video định dạng này.
    </video>
  );
};

// ============================================================================
// GHI CHÚ BÀI HỌC & ĐÁNH DẤU MỐC THỜI GIAN (DATABASE-SYNCED COMPONENT)
// ============================================================================
const sortLessonNotes = (list: LessonNoteItem[]): LessonNoteItem[] =>
  [...list].sort((a, b) => {
    const ta = a.videoTimestamp ?? Infinity;
    const tb = b.videoTimestamp ?? Infinity;
    if (ta !== tb) return ta - tb;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

const formatNoteCreatedDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

interface LessonNotesPaneProps {
  courseId: string;
  lessonId: string;
  onSeekToTimestamp: (seconds: number) => void;
  getCurrentVideoTime: () => number;
}

const LessonNotesPane: React.FC<LessonNotesPaneProps> = React.memo(
  ({ courseId, lessonId, onSeekToTimestamp, getCurrentVideoTime }) => {
    const [notes, setNotes] = useState<LessonNoteItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [newContent, setNewContent] = useState<string>('');
    const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState<string>('');
    const [editTimestamp, setEditTimestamp] = useState<number | null>(null);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Tải danh sách ghi chú từ cơ sở dữ liệu
    useEffect(() => {
      let isMounted = true;
      courseService
        .getLessonNotes(courseId, lessonId)
        .then((data) => {
          if (isMounted) setNotes(sortLessonNotes(data || []));
        })
        .catch(() => {
          if (isMounted) setNotes([]);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }, [courseId, lessonId]);

    // Gắn mốc thời gian hiện tại của video
    const handleCaptureCurrentTime = useCallback(() => {
      const cur = Math.max(0, Math.floor(getCurrentVideoTime() || 0));
      setSelectedTimestamp(cur);
      toast.success(`Đã chọn mốc thời gian [${formatVideoTime(cur)}]`);
    }, [getCurrentVideoTime]);

    // Tạo mới ghi chú
    const handleCreateNote = useCallback(async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newContent.trim();
      if (!trimmed) {
        toast.error('Vui lòng nhập nội dung ghi chú.');
        return;
      }

      try {
        setIsSaving(true);
        const created = await courseService.createLessonNote(courseId, lessonId, {
          content: trimmed,
          videoTimestamp: selectedTimestamp,
        });
        setNotes((prev) => sortLessonNotes([...prev, created]));
        setNewContent('');
        setSelectedTimestamp(null);
        toast.success('Đã lưu ghi chú bài học vào cơ sở dữ liệu!');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Lưu ghi chú thất bại.');
      } finally {
        setIsSaving(false);
      }
    }, [courseId, lessonId, newContent, selectedTimestamp]);

    // Bắt đầu sửa ghi chú
    const handleStartEdit = useCallback((note: LessonNoteItem) => {
      setEditingNoteId(note.id);
      setEditContent(note.content);
      setEditTimestamp(note.videoTimestamp);
    }, []);

    // Hủy sửa ghi chú
    const handleCancelEdit = useCallback(() => {
      setEditingNoteId(null);
      setEditContent('');
      setEditTimestamp(null);
    }, []);

    // Lưu cập nhật ghi chú
    const handleSaveEdit = useCallback(async (noteId: string) => {
      const trimmed = editContent.trim();
      if (!trimmed) {
        toast.error('Nội dung ghi chú không được để trống.');
        return;
      }

      try {
        setIsUpdating(true);
        const updated = await courseService.updateLessonNote(courseId, lessonId, noteId, {
          content: trimmed,
          videoTimestamp: editTimestamp,
        });
        setNotes((prev) =>
          sortLessonNotes(prev.map((item) => (item.id === noteId ? updated : item)))
        );
        handleCancelEdit();
        toast.success('Đã cập nhật ghi chú thành công!');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Cập nhật ghi chú thất bại.');
      } finally {
        setIsUpdating(false);
      }
    }, [courseId, lessonId, editContent, editTimestamp, handleCancelEdit]);

    // Xóa ghi chú
    const handleDeleteNote = useCallback(async (noteId: string) => {
      if (!window.confirm('Bạn có chắc chắn muốn xóa ghi chú này không?')) return;
      try {
        setDeletingId(noteId);
        await courseService.deleteLessonNote(courseId, lessonId, noteId);
        setNotes((prev) => prev.filter((item) => item.id !== noteId));
        toast.success('Đã xóa ghi chú thành công.');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Xóa ghi chú thất bại.');
      } finally {
        setDeletingId(null);
      }
    }, [courseId, lessonId]);

    return (
      <div className="tku-learning-notes-pane">
        {/* Form thêm mới ghi chú */}
        <form onSubmit={handleCreateNote} className="tku-learning-notes-form-box">
          <div className="tku-notes-form-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="tku-notes-timestamp-btn"
                onClick={handleCaptureCurrentTime}
                title="Bấm để lưu kèm mốc thời gian hiện tại của video"
              >
                <Clock size={14} />
                <span>Gắn mốc video hiện tại</span>
              </button>

              {selectedTimestamp !== null ? (
                <span className="tku-notes-active-tag">
                  <Play size={11} fill="currentColor" />
                  <span>Mốc: {formatVideoTime(selectedTimestamp)}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTimestamp(null)}
                    title="Xóa mốc thời gian (lưu thành ghi chú chung)"
                    aria-label="Xóa mốc"
                  >
                    <X size={13} />
                  </button>
                </span>
              ) : (
                <span className="tku-learning-notes-hint">
                  (Ghi chú chung không gắn mốc thời gian)
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSaving || !newContent.trim()}
              className="tku-learning-save-note-btn"
            >
              {isSaving ? (
                <>
                  <Loader2 size={13} className="tku-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Thêm ghi chú</span>
                </>
              )}
            </button>
          </div>

          <textarea
            className="tku-learning-note-textarea"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Nhập kiến thức trọng tâm, công thức Hóa học cần nhớ hoặc lưu ý của bạn tại mốc này..."
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleCreateNote(e);
              }
            }}
            rows={3}
          />
        </form>

        {/* Danh sách các ghi chú của học sinh */}
        <div className="tku-notes-list-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} className="text-blue-600" />
              <span>Ghi chú đã lưu ({notes.length})</span>
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Đồng bộ trực tiếp trên đám mây
            </span>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
              <Loader2 size={24} className="tku-spin" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13px' }}>Đang nạp ghi chú bài học từ máy chủ...</p>
            </div>
          ) : notes.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 20px',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '10px',
                color: '#64748b',
              }}
            >
              <Sparkles size={28} style={{ margin: '0 auto 10px', color: '#94a3b8' }} />
              <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155', margin: '0 0 4px' }}>
                Chưa có ghi chú nào cho bài học này
              </p>
              <p style={{ fontSize: '12.5px', margin: 0, color: '#94a3b8' }}>
                Nhấn &quot;Gắn mốc video hiện tại&quot; phía trên để ghi lại các mẹo giải nhanh hoặc công thức Hóa học quan trọng!
              </p>
            </div>
          ) : (
            <div className="tku-notes-list">
              {notes.map((note) => {
                const isEditing = editingNoteId === note.id;
                const isDeleting = deletingId === note.id;

                return (
                  <div key={note.id} className="tku-note-item">
                    <div className="tku-note-item__head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {note.videoTimestamp !== null && note.videoTimestamp !== undefined ? (
                          <button
                            type="button"
                            className="tku-note-item__time-badge"
                            onClick={() => onSeekToTimestamp(note.videoTimestamp as number)}
                            title={`Nhấp để tua video tới mốc [${formatVideoTime(note.videoTimestamp)}]`}
                          >
                            <Play size={10} fill="currentColor" />
                            <span>{formatVideoTime(note.videoTimestamp)}</span>
                          </button>
                        ) : (
                          <span className="tku-note-item__general-badge">
                            Ghi chú chung
                          </span>
                        )}
                        <span className="tku-note-item__date">{formatNoteCreatedDate(note.createdAt)}</span>
                      </div>

                      <div className="tku-note-item__actions">
                        {!isEditing && (
                          <>
                            <button
                              type="button"
                              className="tku-note-action-btn"
                              onClick={() => handleStartEdit(note)}
                              title="Chỉnh sửa ghi chú"
                              aria-label="Sửa ghi chú"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              className="tku-note-action-btn tku-note-action-btn--delete"
                              onClick={() => handleDeleteNote(note.id)}
                              disabled={isDeleting}
                              title="Xóa ghi chú"
                              aria-label="Xóa ghi chú"
                            >
                              {isDeleting ? <Loader2 size={14} className="tku-spin" /> : <Trash2 size={14} />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div style={{ marginTop: '8px' }}>
                        <textarea
                          className="tku-learning-note-textarea"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(note.id);
                            }
                          }}
                          rows={3}
                          style={{ marginBottom: '10px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="tku-learning-save-note-btn"
                            style={{ background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }}
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(note.id)}
                            disabled={isUpdating || !editContent.trim()}
                            className="tku-learning-save-note-btn"
                          >
                            {isUpdating ? <Loader2 size={13} className="tku-spin" /> : <Check size={13} />}
                            <span>Lưu thay đổi</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="tku-note-item__content">{note.content}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  },
);
LessonNotesPane.displayName = 'LessonNotesPane';

const GRADE_LABELS: Record<string, string> = {
  '10': 'Lớp 10',
  '11': 'Lớp 11',
  '12': 'Lớp 12',
  exam: 'Luyện thi THPTQG',
  other: 'Chuyên đề học thuật',
};

// ============================================================================
// POPUP HƯỚNG DẪN LÀM BÀI TẬP (QUIZ GUIDE MODAL)
// ============================================================================
interface QuizGuideModalProps {
  quiz: StudentAssessmentItem;
  lessonTitle?: string;
  courseId: string;
  onClose: () => void;
  onStart: (quizId: string) => void;
}

const QuizGuideModal: React.FC<QuizGuideModalProps> = React.memo(
  ({ quiz, lessonTitle, courseId, onClose, onStart }) => {
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
      <div
        className="tku-quiz-guide-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tku-quiz-guide-title"
        onClick={onClose}
      >
        <div className="tku-quiz-guide-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="tku-quiz-guide-modal-header">
            <div className="tku-quiz-guide-modal-header-left">
              <div className="tku-quiz-guide-modal-icon">
                <FileCheck size={22} />
              </div>
              <div>
                <h3 id="tku-quiz-guide-title" className="tku-quiz-guide-modal-title">
                  Hướng dẫn làm bài tập
                </h3>
                <p className="tku-quiz-guide-modal-subtitle">
                  Kiểm tra & củng cố kiến thức trọng tâm bài học
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="tku-quiz-guide-modal-close-btn"
              aria-label="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="tku-quiz-guide-modal-body">
            {/* Quiz Identification Box */}
            <div className="tku-quiz-guide-hero-box">
              <div className="tku-quiz-guide-badge-row">
                <span className="tku-quiz-guide-type-badge">
                  <Sparkles size={12} />
                  <span>
                    {quiz.type === 'QUIZ'
                      ? 'Bài tập củng cố'
                      : quiz.type === 'TEST'
                      ? 'Kiểm tra định kỳ'
                      : 'Đề thi trực tuyến'}
                  </span>
                </span>
                {lessonTitle && (
                  <span className="tku-quiz-guide-lesson-badge" title={lessonTitle}>
                    {lessonTitle}
                  </span>
                )}
              </div>
              <h4 className="tku-quiz-guide-quiz-name">{quiz.title}</h4>
            </div>

            {/* Stats Row */}
            <div className="tku-quiz-guide-stats-grid">
              <div className="tku-quiz-guide-stat-card">
                <div className="tku-quiz-guide-stat-icon">
                  <FileText size={18} />
                </div>
                <div className="tku-quiz-guide-stat-content">
                  <span className="tku-quiz-guide-stat-label">Số lượng</span>
                  <strong className="tku-quiz-guide-stat-value">{quiz.totalQuestions} câu hỏi</strong>
                </div>
              </div>

              <div className="tku-quiz-guide-stat-card">
                <div className="tku-quiz-guide-stat-icon">
                  <Clock size={18} />
                </div>
                <div className="tku-quiz-guide-stat-content">
                  <span className="tku-quiz-guide-stat-label">Thời gian</span>
                  <strong className="tku-quiz-guide-stat-value">
                    {quiz.durationMinutes ? `${quiz.durationMinutes} phút` : 'Tự do'}
                  </strong>
                </div>
              </div>

              <div className="tku-quiz-guide-stat-card">
                <div className="tku-quiz-guide-stat-icon">
                  <GraduationCap size={18} />
                </div>
                <div className="tku-quiz-guide-stat-content">
                  <span className="tku-quiz-guide-stat-label">Thang điểm</span>
                  <strong className="tku-quiz-guide-stat-value">10 điểm</strong>
                </div>
              </div>
            </div>

            {/* Previous Submission Banner */}
            {quiz.bestScore !== null && (
              <div className="tku-quiz-guide-previous-score">
                <CheckCircle2 size={16} />
                <span>
                  Bạn đã hoàn thành bài tập này {quiz.submissionsCount} lần • Điểm cao nhất: <strong>{quiz.bestScore}/10</strong>
                </span>
              </div>
            )}

            {/* Instructions & Guidelines */}
            <div className="tku-quiz-guide-instructions">
              <h5 className="tku-quiz-guide-instructions-title">
                <HelpCircle size={15} />
                <span>Quy chế & Lưu ý khi làm bài</span>
              </h5>
              <ul className="tku-quiz-guide-rules-list">
                <li>
                  <span className="tku-quiz-rule-bullet">1</span>
                  <span><strong>Hình thức làm bài:</strong> Trắc nghiệm khách quan, hệ thống tự động ghi nhận và chấm điểm ngay khi nộp.</span>
                </li>
                <li>
                  <span className="tku-quiz-rule-bullet">2</span>
                  <span><strong>Thời gian:</strong> {quiz.durationMinutes ? `Đồng hồ đếm ngược ${quiz.durationMinutes} phút sẽ chạy khi bạn ấn "Làm bài". Hết giờ bài làm sẽ tự động nộp.` : 'Không giới hạn thời gian, bạn có thể cân nhắc kỹ lưỡng trước khi nộp bài.'}</span>
                </li>
                <li>
                  <span className="tku-quiz-rule-bullet">3</span>
                  <span><strong>Chuyển câu & Sửa đáp án:</strong> Bạn có thể chuyển câu tự do và thay đổi đáp án bất kỳ lúc nào trước khi xác nhận Nộp bài.</span>
                </li>
                <li>
                  <span className="tku-quiz-rule-bullet">4</span>
                  <span><strong>Đáp án & Lời giải:</strong> Điểm số và lời giải chi tiết của giảng viên sẽ hiển thị đầy đủ ngay sau khi bạn hoàn thành.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="tku-quiz-guide-modal-footer">
            <button
              type="button"
              className="tku-quiz-guide-btn tku-quiz-guide-btn--outline"
              onClick={onClose}
            >
              Đóng
            </button>

            {quiz.latestSubmission && (
              <Link
                to={`/courses/${courseId}/exams/${quiz.id}/results/${quiz.latestSubmission.id}`}
                className="tku-quiz-guide-btn tku-quiz-guide-btn--secondary"
                onClick={onClose}
              >
                <span>Xem lời giải cũ</span>
              </Link>
            )}

            <button
              type="button"
              className="tku-quiz-guide-btn tku-quiz-guide-btn--primary"
              onClick={() => onStart(quiz.id)}
            >
              <PlayCircle size={16} />
              <span>{quiz.submissionsCount > 0 ? 'Bắt đầu làm lại' : 'Làm bài ngay'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
);
QuizGuideModal.displayName = 'QuizGuideModal';

export const CourseLearningRoomPage: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [data, setData] = useState<CourseLearningRoomResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState<boolean>(false);

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

  // Quản lý tab bài học: đồng bộ mượt mà với URL query param theo chuẩn React
  const queryTab = searchParams.get('tab');
  const [userTab, setUserTab] = useState<'content' | 'resources' | 'teacher' | 'notes' | 'discussion' | 'ai' | null>(null);
  const [prevQueryTab, setPrevQueryTab] = useState<string | null>(queryTab);

  if (queryTab !== prevQueryTab) {
    setPrevQueryTab(queryTab);
    setUserTab(null);
  }

  const activeTab: 'content' | 'resources' | 'teacher' | 'notes' | 'discussion' | 'ai' =
    userTab ??
    (queryTab === 'discussion' || queryTab === 'ai' || queryTab === 'notes' || queryTab === 'teacher' || queryTab === 'resources'
      ? queryTab
      : 'content');
  const setActiveTab = setUserTab;

  // Assessments / Quizzes / Exams state (Bước 2 & Bước 3)
  const [assessments, setAssessments] = useState<StudentAssessmentItem[]>([]);

  // Pop up hướng dẫn làm bài tập
  const [selectedQuizForGuide, setSelectedQuizForGuide] = useState<{
    quiz: StudentAssessmentItem;
    lessonTitle: string;
  } | null>(null);

  const handleOpenQuizGuide = useCallback((quiz: StudentAssessmentItem, lessonTitle: string) => {
    setSelectedQuizForGuide({ quiz, lessonTitle });
  }, []);

  const handleCloseQuizGuide = useCallback(() => {
    setSelectedQuizForGuide(null);
  }, []);

  const handleStartQuiz = useCallback((quizId: string) => {
    setSelectedQuizForGuide(null);
    if (courseId) {
      navigate(`/courses/${courseId}/exams/${quizId}`);
    }
  }, [courseId, navigate]);

  // Anti-seeking Warning & Video Completion state
  const [showSeekWarning, setShowSeekWarning] = useState<boolean>(false);
  const [seekWarningWatchedSec, setSeekWarningWatchedSec] = useState<number>(0);
  const [resumeTrigger, setResumeTrigger] = useState<number>(0);

  // Tải danh sách bài tập & đề thi của khóa học
  useEffect(() => {
    if (!courseId) return;
    let isMounted = true;
    courseService
      .getStudentAssessments(courseId)
      .then((res) => {
        if (isMounted) setAssessments(res);
      })
      .catch((err) => {
        console.error('Không thể tải danh sách bài tập của khóa học:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Map bài tập theo từng bài học (O(1) lookup thay vì duyệt filter lặp đi lặp lại)
  const assessmentsByLessonId = useMemo(() => {
    const map = new Map<string, StudentAssessmentItem[]>();
    for (const a of assessments) {
      if (a.lessonId) {
        const list = map.get(a.lessonId) || [];
        list.push(a);
        map.set(a.lessonId, list);
      }
    }
    return map;
  }, [assessments]);

  // 1. Fetch Room Data from Backend (Không gọi setState đồng bộ trong effect body)
  useEffect(() => {
    if (!courseId) return;

    let isMounted = true;
    courseService
      .getCourseLearningRoom(courseId)
      .then((response) => {
        if (isMounted) {
          setData(response);
          setErrorMessage(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu phòng học.';
          setErrorMessage(msg);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [courseId, refreshTrigger]);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // 2. Flatten all lessons for easy sequential navigation
  const allLessons = useMemo<LearningLessonItem[]>(() => {
    if (!data?.chapters) return [];
    return data.chapters.flatMap((ch) => ch.lessons);
  }, [data]);

  // 3. Determine active lesson
  const activeLesson = useMemo<LearningLessonItem | null>(() => {
    if (allLessons.length === 0) return null;
    if (lessonId) {
      const found = allLessons.find((l) => l.id === lessonId);
      if (found) return found;
    }
    if (data?.currentLessonId) {
      const found = allLessons.find((l) => l.id === data.currentLessonId);
      if (found) return found;
    }
    return allLessons[0];
  }, [allLessons, lessonId, data]);

  // 4. Identify the chapter of the active lesson
  const activeChapter = useMemo<LearningChapterItem | null>(() => {
    if (!data?.chapters || !activeLesson) return null;
    return data.chapters.find((ch) => ch.id === activeLesson.chapterId) || null;
  }, [data, activeLesson]);

  // 5. Next & Previous Lesson Navigation
  const activeLessonIndex = useMemo<number>(() => {
    if (!activeLesson) return -1;
    return allLessons.findIndex((l) => l.id === activeLesson.id);
  }, [allLessons, activeLesson]);

  const prevLesson = useMemo<LearningLessonItem | null>(() => {
    if (activeLessonIndex > 0) return allLessons[activeLessonIndex - 1];
    return null;
  }, [allLessons, activeLessonIndex]);

  const nextLesson = useMemo<LearningLessonItem | null>(() => {
    if (activeLessonIndex >= 0 && activeLessonIndex < allLessons.length - 1) {
      return allLessons[activeLessonIndex + 1];
    }
    return null;
  }, [allLessons, activeLessonIndex]);

  // 6. Tài liệu đính kèm & Slide bài học (PDF / Slide / Docs / Drive)
  const lessonAttachments = useMemo<LessonAttachment[]>(() => {
    return extractLessonAttachments(activeLesson?.content);
  }, [activeLesson?.content]);

  const handleDownloadAttachment = useCallback((att: LessonAttachment) => {
    if (att.url.startsWith('http')) {
      window.open(att.url, '_blank', 'noopener,noreferrer');
      toast.success(`Đang mở / tải tài liệu: ${att.title}`);
    } else {
      const a = document.createElement('a');
      a.href = att.url;
      a.download = att.title;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Đã bắt đầu tải tài liệu: ${att.title}`);
    }
  }, []);

  const handleDownloadLessonNotesText = useCallback(() => {
    if (!activeLesson) return;
    const rawText = activeLesson.content
      ? activeLesson.content
          .replace(/<[^>]+>/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      : 'Bài học này chưa có nội dung văn bản.';

    const fileContent = `TKU ACADEMY - TÀI LIỆU BÀI HỌC
Khóa học: ${data?.course?.title || 'Khóa học'}
Chương: ${activeChapter?.title || 'Chương học'}
Bài học: ${activeLesson.title}
Giảng viên: ${data?.course?.teacher?.fullName || 'TKU'}
Ngày tải về: ${new Date().toLocaleDateString('vi-VN')}

========================================
NỘI DUNG TÓM TẮT BÀI GIẢNG:
========================================

${rawText}

----------------------------------------
© Bản quyền học liệu thuộc về Giảng viên và Nền tảng Giáo dục TKU Academy.
`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeLesson.title.replace(/[\\/:*?"<>|]/g, '_')}_Tai_Lieu.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Đã tải tài liệu tóm tắt bài giảng về máy!');
  }, [activeLesson, data?.course, activeChapter]);

  const handleQuickDownload = useCallback(() => {
    if (lessonAttachments.length === 1) {
      handleDownloadAttachment(lessonAttachments[0]);
    } else if (lessonAttachments.length > 1) {
      setActiveTab('resources');
      toast.info(`Bài học có ${lessonAttachments.length} tài liệu đính kèm. Vui lòng chọn tệp muốn tải.`);
    } else if (activeLesson?.content) {
      handleDownloadLessonNotesText();
    } else {
      toast.info('Bài học này chưa có tài liệu đính kèm từ giảng viên.');
    }
  }, [lessonAttachments, handleDownloadAttachment, setActiveTab, activeLesson, handleDownloadLessonNotesText]);


  // 7. Navigation to lesson
  const handleSelectLesson = useCallback(
    (targetLessonId: string) => {
      if (!courseId) return;
      navigate(`/courses/${courseId}/learn/${targetLessonId}`);
    },
    [courseId, navigate],
  );

  // 9. Tự động đánh dấu hoàn thành bài học khi xem xong video
  const handleAutoMarkComplete = useCallback(async () => {
    if (!courseId || !activeLesson) return;
    if (activeLesson.isCompleted || isUpdatingProgress) return;

    setIsUpdatingProgress(true);
    try {
      const res = await courseService.updateLessonProgress(courseId, activeLesson.id, {
        isCompleted: true,
        progressPercent: 100,
      });

      // Optimistic update in state
      setData((prev) => {
        if (!prev) return null;
        const updatedChapters = prev.chapters.map((ch) => ({
          ...ch,
          lessons: ch.lessons.map((les) =>
            les.id === activeLesson.id
              ? {
                  ...les,
                  isCompleted: true,
                  progressPercent: 100,
                }
              : les,
          ),
        }));

        const totalCompleted = updatedChapters
          .flatMap((c) => c.lessons)
          .filter((l) => l.isCompleted).length;

        return {
          ...prev,
          chapters: updatedChapters,
          completedLessons: totalCompleted,
          progressPercent: res.courseProgressPercent,
        };
      });

      toast.success(`🎉 Chúc mừng! Bạn đã hoàn thành bài giảng "${activeLesson.title}".`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu tiến độ học tập.';
      console.error('Error auto-marking lesson completed:', err);
      toast.error(msg);
    } finally {
      setIsUpdatingProgress(false);
    }
  }, [courseId, activeLesson, isUpdatingProgress]);

  // Hoàn thành thủ công cho bài đọc lý thuyết (không có video)
  const handleCompleteTheoryLesson = useCallback(async () => {
    if (!courseId || !activeLesson || isUpdatingProgress || activeLesson.isCompleted) return;

    setIsUpdatingProgress(true);
    try {
      const res = await courseService.updateLessonProgress(courseId, activeLesson.id, {
        isCompleted: true,
        progressPercent: 100,
      });

      setData((prev) => {
        if (!prev) return null;
        const updatedChapters = prev.chapters.map((ch) => ({
          ...ch,
          lessons: ch.lessons.map((les) =>
            les.id === activeLesson.id
              ? {
                  ...les,
                  isCompleted: true,
                  progressPercent: 100,
                }
              : les,
          ),
        }));

        const totalCompleted = updatedChapters
          .flatMap((c) => c.lessons)
          .filter((l) => l.isCompleted).length;

        return {
          ...prev,
          chapters: updatedChapters,
          completedLessons: totalCompleted,
          progressPercent: res.courseProgressPercent,
        };
      });

      toast.success(`🎉 Chúc mừng! Bạn đã hoàn thành bài học lý thuyết "${activeLesson.title}".`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật tiến độ bài học.';
      toast.error(msg);
    } finally {
      setIsUpdatingProgress(false);
    }
  }, [courseId, activeLesson, isUpdatingProgress]);

  // Kích hoạt hiển thị UI cảnh báo không được tua video
  const handleSeekWarning = useCallback((maxWatchedSec: number) => {
    setSeekWarningWatchedSec(maxWatchedSec);
    setShowSeekWarning(true);
  }, []);

  // Đóng modal cảnh báo và cho video tiếp tục phát từ mốc an toàn
  const handleDismissSeekWarning = useCallback(() => {
    setShowSeekWarning(false);
    setResumeTrigger((prev) => prev + 1);
  }, []);

  // 9.1 Mốc thời gian video & Chuyển video đến mốc thời gian (Video Timestamp Tagging)
  // Tối ưu hóa: Dùng Ref thay vì State để loại bỏ hoàn toàn việc re-render toàn bộ trang mỗi 250ms khi video phát
  const currentVideoTimeRef = useRef<number>(0);
  const [seekTarget, setSeekTarget] = useState<{ time: number; trigger: number } | null>(null);

  // Reset mốc video ref khi chuyển đổi bài học (không gọi setState trong effect)
  useEffect(() => {
    currentVideoTimeRef.current = 0;
  }, [activeLesson?.id]);

  const handleTimeUpdate = useCallback((seconds: number) => {
    currentVideoTimeRef.current = seconds;
  }, []);

  const getCurrentVideoTime = useCallback(() => currentVideoTimeRef.current, []);

  const handleSeekToTimestamp = useCallback((seconds: number) => {
    setSeekTarget({ time: seconds, trigger: Date.now() });
    const playerCard = document.getElementById('main-learning-content');
    if (playerCard) {
      playerCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    toast.success(`Đã chuyển video đến mốc [${formatVideoTime(seconds)}]`, { duration: 2500 });
  }, []);

  // Toggle chapter accordion
  const toggleChapter = useCallback((chapterId: string) => {
    setOpenChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  }, []);

  // Format teacher initials
  const teacherFullName = data?.course?.teacher?.fullName;
  const teacherInitials = useMemo(() => {
    if (!teacherFullName) return 'GV';
    const parts = teacherFullName.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }, [teacherFullName]);

  // --------------------------------------------------------------------------
  // RENDER: LOADING STATE
  // --------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="tku-learning-loading-screen" role="status" aria-live="polite">
        <Loader2 className="tku-learning-spinner" size={48} />
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
          Đang chuẩn bị không gian học tập...
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 13.5, margin: 0 }}>
          Hệ thống đang tải dữ liệu bài giảng và giáo trình từ máy chủ TKU.
        </p>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: ERROR STATE
  // --------------------------------------------------------------------------
  if (errorMessage || !data) {
    return (
      <div className="tku-learning-error-screen">
        <div className="tku-learning-error-box">
          <div className="tku-learning-error-icon">
            <AlertCircle size={32} />
          </div>
          <h2 className="tku-learning-error-title">Không thể truy cập phòng học</h2>
          <p className="tku-learning-error-desc">
            {errorMessage || 'Bạn chưa ghi danh vào khóa học này hoặc phiên đăng nhập đã hết hạn.'}
          </p>
          <div className="tku-learning-error-actions">
            <button
              type="button"
              onClick={handleRetry}
              className="tku-learning-btn tku-learning-btn--secondary"
            >
              <RotateCcw size={15} />
              <span>Thử lại</span>
            </button>
            <Link
              to={courseId ? `/courses/${courseId}` : '/courses'}
              className="tku-learning-btn tku-learning-btn--primary"
            >
              <ArrowLeft size={15} />
              <span>Quay lại khóa học</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { course, chapters, totalLessons, completedLessons, progressPercent } = data;
  const youtubeVideoId = getYouTubeVideoId(activeLesson?.videoUrl);
  const isDirectVideo = isDirectVideoUrl(activeLesson?.videoUrl);

  return (
    <div className="tku-learning-room">
      {/* 1. THANH ĐIỀU HƯỚNG CHÍNH CỦA HỆ THỐNG TKU (GIỮ NGUYÊN) */}
      <Navbar />

      {/* 2. KHÔNG GIAN HỌC TẬP (CONTAINER CHUẨN ĐỒNG BỘ TOÀN HỆ THỐNG TKU) */}
      <div className="tku-container tku-learning-container">
        {/* 3. MAIN CONTENT LAYOUT (VIDEO STAGE & CURRICULUM SIDEBAR) */}
        <div className="tku-learning-layout">
        {/* LEFT COLUMN: UNIFIED VIDEO PLAYER CARD & LESSON DETAILS */}
        <main className="tku-learning-main" id="main-learning-content">
          {/* KHỐI PLAYER GỘP THỐNG NHẤT (HEADER KHÓA HỌC + VIDEO 16:9 + ĐIỀU KHIỂN BÀI HỌC) */}
          <div className="tku-learning-player-card">
            {/* 1. TOP HEADER CỦA KHỐI PLAYER (HIỂN THỊ ĐỊNH DANH KHÓA HỌC) */}
            <div className="tku-learning-player-header">
              <div className="tku-learning-player-header__left">
                <span className="tku-learning-player-header__badge">
                  <GraduationCap size={13} />
                  <span>{GRADE_LABELS[course.grade] || course.grade}</span>
                </span>
                <h1 className="tku-learning-player-header__course-title" title={course.title}>
                  {course.title}
                </h1>
              </div>

              <div className="tku-learning-player-header__right">
                {/* Khi danh mục bài học đang ẩn, hiện nút mở lại ngay trên Player */}
                {!isSidebarOpen && (
                  <button
                    type="button"
                    className="tku-learning-sidebar-reopen-btn"
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Mở danh sách bài học"
                    title="Mở lại danh mục bài học"
                  >
                    <Menu size={14} />
                    <span>Hiện bài học ({completedLessons}/{totalLessons})</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. MÀN HÌNH PHÁT VIDEO Ở GIỮA VỚI CƠ CHẾ CHỐNG TUA & TỰ ĐỘNG HOÀN THÀNH */}
            <section className="tku-learning-stage" aria-label="Khu vực phát video bài giảng">
              <div className="tku-learning-video-container">
                {youtubeVideoId ? (
                  <YouTubeVideoPlayer
                    key={`${activeLesson?.id}_${youtubeVideoId}`}
                    videoId={youtubeVideoId}
                    title={activeLesson ? activeLesson.title : 'Video bài giảng'}
                    onEnded={handleAutoMarkComplete}
                    onSeekWarning={handleSeekWarning}
                    resumeTrigger={resumeTrigger}
                    onTimeUpdate={handleTimeUpdate}
                    seekTarget={seekTarget}
                  />
                ) : isDirectVideo && activeLesson?.videoUrl ? (
                  <NativeVideoPlayer
                    key={`${activeLesson?.id}_${activeLesson.videoUrl}`}
                    videoUrl={activeLesson.videoUrl}
                    poster={course.thumbnailUrl || undefined}
                    onEnded={handleAutoMarkComplete}
                    onSeekWarning={handleSeekWarning}
                    resumeTrigger={resumeTrigger}
                    onTimeUpdate={handleTimeUpdate}
                    seekTarget={seekTarget}
                  />
                ) : (
                  <div className="tku-learning-no-video">
                    <div className="tku-learning-no-video__icon">
                      <BookOpen size={36} />
                    </div>
                    <h3 className="tku-learning-no-video__title">
                      {activeLesson ? activeLesson.title : 'Bài học lý thuyết chuyên đề'}
                    </h3>
                    <p className="tku-learning-no-video__desc">
                      Bài học này tập trung vào kiến thức lý thuyết và tài liệu bài đọc học thuật.
                      Mời bạn nghiên cứu chi tiết nội dung bài giảng ở phần tài liệu bên dưới.
                    </p>
                    {activeLesson && !activeLesson.isCompleted && (
                      <button
                        type="button"
                        className="tku-learning-no-video__action-btn"
                        onClick={handleCompleteTheoryLesson}
                        disabled={isUpdatingProgress}
                      >
                        {isUpdatingProgress ? (
                          <Loader2 size={15} className="tku-learning-spinner" />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}
                        <span>Xác nhận đã đọc xong lý thuyết</span>
                      </button>
                    )}
                    {activeLesson && activeLesson.isCompleted && (
                      <div className="tku-learning-no-video__done-badge">
                        <CheckCircle2 size={15} />
                        <span>Bạn đã hoàn thành bài học lý thuyết này</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* 3. THANH ĐIỀU KHIỂN & BÀI HỌC Ở ĐÁY CỦA KHỐI PLAYER */}
            <section className="tku-learning-controls-bar" aria-label="Điều khiển bài học">
              <div className="tku-learning-lesson-title-meta">
                <div className="tku-learning-lesson-meta-top">
                  <Link
                    to={`/courses/${course.id}`}
                    className="tku-learning-back-course-btn"
                    title="Quay lại trang chi tiết khóa học"
                  >
                    <ArrowLeft size={13} />
                    <span>Chi tiết khóa học</span>
                  </Link>
                  <span className="tku-learning-meta-sep" aria-hidden="true">•</span>
                  <span className="tku-learning-chapter-crumb">
                    {activeChapter ? activeChapter.title : 'Chương học'}
                  </span>
                  {activeLesson?.isCompleted && (
                    <>
                      <span className="tku-learning-meta-sep" aria-hidden="true">•</span>
                      <span className="tku-learning-completed-pill">
                        <CheckCircle2 size={12} />
                        <span>Đã hoàn thành</span>
                      </span>
                    </>
                  )}
                </div>
                <h2 className="tku-learning-active-title">
                  {activeLesson ? activeLesson.title : 'Bài học'}
                </h2>
              </div>

              <div className="tku-learning-nav-btns">
                {/* Nút Tải tài liệu đính kèm (PDF/Slide) */}
                <button
                  type="button"
                  className="tku-learning-btn tku-learning-btn--download"
                  onClick={handleQuickDownload}
                  title="Tải tài liệu và Slide bài giảng đính kèm bài học này"
                >
                  <Download size={15} />
                  <span>Tải tài liệu {lessonAttachments.length > 0 ? `(${lessonAttachments.length})` : ''}</span>
                </button>

                {/* Previous Lesson */}
                <button
                  type="button"
                  className="tku-learning-btn tku-learning-btn--secondary"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && handleSelectLesson(prevLesson.id)}
                  title={prevLesson ? `Bài trước: ${prevLesson.title}` : 'Đây là bài đầu tiên'}
                >
                  <ArrowLeft size={15} />
                  <span>Bài trước</span>
                </button>

                {/* Next Lesson */}
                <button
                  type="button"
                  className="tku-learning-btn tku-learning-btn--primary"
                  disabled={!nextLesson}
                  onClick={() => nextLesson && handleSelectLesson(nextLesson.id)}
                  title={nextLesson ? `Bài tiếp: ${nextLesson.title}` : 'Bạn đã xem đến bài cuối cùng'}
                >
                  <span>Bài tiếp theo</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </section>
          </div>

          {/* 2.3 LESSON DETAILS & ACADEMIC TABS */}
          <section className="tku-learning-details-section">
            <nav className="tku-learning-tabs-nav" aria-label="Thanh chuyển tab nội dung">
              <button
                type="button"
                className={`tku-learning-tab-btn ${activeTab === 'content' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('content')}
              >
                <BookOpen size={16} />
                <span>Nội dung bài học</span>
              </button>

              <button
                type="button"
                className={`tku-learning-tab-btn ${activeTab === 'resources' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('resources')}
              >
                <FileDown size={16} />
                <span>Tài liệu & Slide</span>
                {lessonAttachments.length > 0 && (
                  <span className="tku-learning-tab-count">{lessonAttachments.length}</span>
                )}
              </button>

              <button
                type="button"
                className={`tku-learning-tab-btn ${activeTab === 'notes' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                <Edit3 size={16} />
                <span>Ghi chú của bạn</span>
              </button>

              <button
                type="button"
                className={`tku-learning-tab-btn ${activeTab === 'teacher' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('teacher')}
              >
                <GraduationCap size={16} />
                <span>Giảng viên</span>
              </button>

              <button
                type="button"
                className={`tku-learning-tab-btn ${activeTab === 'discussion' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('discussion')}
              >
                <MessageSquare size={16} />
                <span>Thảo luận học tập</span>
              </button>

              <button
                type="button"
                className={`tku-learning-tab-btn ${activeTab === 'ai' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('ai')}
              >
                <Sparkles size={16} />
                <span>Trợ lý Gia sư AI</span>
              </button>
            </nav>

            <div className="tku-learning-tab-panel">
              {/* TAB 1: NỘI DUNG BÀI HỌC */}
              {activeTab === 'content' && (
                <div className="tku-learning-content-pane">
                  {/* Banner gợi ý tài liệu đính kèm nếu bài học có tài liệu */}
                  {lessonAttachments.length > 0 && (
                    <div className="tku-learning-attachment-banner">
                      <div className="tku-learning-attachment-banner__left">
                        <span className="tku-learning-attachment-banner__badge">
                          <FileDown size={13} />
                          {lessonAttachments.length} tài liệu
                        </span>
                        <span>Bài học này có tài liệu và Slide học tập đính kèm từ giảng viên.</span>
                      </div>
                      <button
                        type="button"
                        className="tku-learning-attachment-banner__btn"
                        onClick={() => setActiveTab('resources')}
                      >
                        <Download size={13} />
                        <span>Xem và tải tài liệu</span>
                      </button>
                    </div>
                  )}

                  {activeLesson?.content ? (
                    <article className="tku-learning-markdown-body">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: activeLesson.content.replace(/\n/g, '<br/>'),
                        }}
                      />
                    </article>
                  ) : (
                    <div className="tku-learning-placeholder-card">
                      <div className="tku-learning-placeholder-card__icon">
                        <FileText size={24} />
                      </div>
                      <h4 className="tku-learning-placeholder-card__title">Tài liệu bài giảng</h4>
                      <p className="tku-learning-placeholder-card__desc">
                        Bài học này hiện chưa có tài liệu văn bản bổ sung. Bạn có thể theo dõi kiến thức trực tiếp qua video phía trên.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB MỚI: TÀI LIỆU & SLIDE BÀI GIẢNG ĐÍNH KÈM */}
              {activeTab === 'resources' && (
                <div className="tku-learning-resources-pane">
                  <div className="tku-learning-resources-header">
                    <h3 className="tku-learning-resources-title">
                      <FileDown size={20} style={{ color: '#166534' }} />
                      <span>Tài liệu học tập & Slide đính kèm bài giảng</span>
                    </h3>
                    <p className="tku-learning-resources-subtitle">
                      Tải về tài liệu PDF, Slide thuyết trình hoặc tệp thực hành do giảng viên cung cấp để ôn tập và làm bài tập.
                    </p>
                  </div>

                  {lessonAttachments.length > 0 ? (
                    <div className="tku-learning-resources-list">
                      {lessonAttachments.map((att) => (
                        <div key={att.id} className="tku-resource-card">
                          <div className="tku-resource-card__left">
                            <div className={`tku-resource-card__icon-box tku-resource-card__icon-box--${att.type}`}>
                              {att.type === 'slide' ? (
                                <Presentation size={22} />
                              ) : att.type === 'doc' ? (
                                <FileCheck size={22} />
                              ) : (
                                <FileText size={22} />
                              )}
                            </div>
                            <div className="tku-resource-card__info">
                              <div className="tku-resource-card__title-row">
                                <h4 className="tku-resource-card__title">{att.title}</h4>
                                <span className={`tku-resource-card__tag tku-resource-card__tag--${att.type}`}>
                                  {att.type.toUpperCase()}
                                </span>
                              </div>
                              <p className="tku-resource-card__desc">
                                Học liệu bổ trợ chính thức cho bài học "{activeLesson?.title}"
                              </p>
                            </div>
                          </div>

                          <div className="tku-resource-card__actions">
                            <button
                              type="button"
                              className="tku-resource-btn tku-resource-btn--primary"
                              onClick={() => handleDownloadAttachment(att)}
                              title={`Tải xuống ${att.title}`}
                            >
                              <Download size={14} />
                              <span>Tải về</span>
                            </button>
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tku-resource-btn tku-resource-btn--secondary"
                              title="Mở xem trong tab mới"
                            >
                              <ExternalLink size={14} />
                              <span>Xem trực tiếp</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="tku-learning-placeholder-card">
                      <div className="tku-learning-placeholder-card__icon">
                        <FileText size={24} />
                      </div>
                      <h4 className="tku-learning-placeholder-card__title">Chưa có tệp đính kèm riêng biệt</h4>
                      <p className="tku-learning-placeholder-card__desc">
                        Giảng viên chưa tải lên tệp tài liệu PDF hoặc Slide riêng cho bài học này.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: GHI CHÚ BÀI HỌC CÁ NHÂN */}
              {activeTab === 'notes' && activeLesson && (
                <LessonNotesPane
                  key={`lesson_notes_${course.id}_${activeLesson.id}`}
                  courseId={course.id}
                  lessonId={activeLesson.id}
                  onSeekToTimestamp={handleSeekToTimestamp}
                  getCurrentVideoTime={getCurrentVideoTime}
                />
              )}

              {/* TAB 3: THÔNG TIN GIẢNG VIÊN */}
              {activeTab === 'teacher' && (
                <div className="tku-learning-teacher-pane">
                  <div className="tku-learning-teacher-card">
                    {course.teacher.avatarUrl && !avatarFailed ? (
                      <img
                        src={course.teacher.avatarUrl}
                        alt={course.teacher.fullName}
                        className="tku-learning-teacher-avatar"
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      <div className="tku-learning-teacher-avatar-fallback">
                        {teacherInitials}
                      </div>
                    )}
                    <div className="tku-learning-teacher-info">
                      <h4 className="tku-learning-teacher-name">{course.teacher.fullName}</h4>
                      <p className="tku-learning-teacher-title">
                        Giảng viên chuyên môn TKU
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: THẢO LUẬN */}
              {activeTab === 'discussion' && activeLesson && (
                <div className="tku-learning-discussion-pane">
                  <LessonDiscussionPane
                    key={`discussion_${activeLesson.id}`}
                    courseId={course.id}
                    lessonId={activeLesson.id}
                    lessonTitle={activeLesson.title}
                    getCurrentVideoTime={getCurrentVideoTime}
                    hasVideo={Boolean(youtubeVideoId || (isDirectVideo && activeLesson?.videoUrl))}
                    onSeekToTimestamp={handleSeekToTimestamp}
                    isCourseTeacher={user?.role === 'TEACHER' && course.teacher.id === user?.id}
                    targetCommentId={searchParams.get('commentId')}
                  />
                </div>
              )}

              {/* TAB 5: TRỢ LÝ GIA SƯ AI */}
              {activeTab === 'ai' && activeLesson && (
                <div className="tku-learning-ai-tab-pane">
                  <LessonAiAssistantPane
                    key={`ai_${activeLesson.id}`}
                    courseId={course.id}
                    lessonId={activeLesson.id}
                    lessonTitle={activeLesson.title}
                    courseTitle={course.title}
                    courseGrade={course.grade}
                  />
                </div>
              )}
            </div>
          </section>
        </main>

        {/* RIGHT COLUMN: CURRICULUM SIDEBAR (DANH SÁCH BÀI GIẢNG) */}
        <aside
          className={`tku-learning-sidebar ${!isSidebarOpen ? 'is-collapsed is-hidden' : ''}`}
          aria-label="Danh sách bài học trong khóa"
        >
          {/* HEADER SIDEBAR: TIẾN ĐỘ VÀ NÚT ẨN BÀI HỌC */}
          <div className="tku-learning-sidebar__header">
            <div className="tku-learning-sidebar__header-top">
              <span className="tku-learning-sidebar__title">Nội dung khóa học</span>
              <button
                type="button"
                className="tku-learning-sidebar-collapse-btn"
                onClick={() => setIsSidebarOpen(false)}
                title="Thu gọn danh sách bài học"
              >
                <span>Ẩn bài học</span>
              </button>
            </div>

            {/* PROGRESS INTEGRATED INSIDE SIDEBAR */}
            <div className="tku-learning-sidebar__progress-box">
              <div className="tku-learning-sidebar__progress-meta">
                <span className="tku-learning-sidebar__progress-label">Tiến độ của bạn</span>
                <span className="tku-learning-sidebar__progress-val">
                  {completedLessons}/{totalLessons} ({progressPercent}%)
                </span>
              </div>
              <div className="tku-learning-sidebar__progress-track">
                <div
                  className="tku-learning-sidebar__progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* CURRICULUM ACCORDION LIST */}
          <div className="tku-learning-sidebar__list">
            {chapters.map((chapter, chIdx) => {
              const isOpen = openChapters[chapter.id] ?? true;
              const chapterCompletedCount = chapter.lessons.filter((l) => l.isCompleted).length;

              return (
                <div key={chapter.id} className="tku-learning-chapter-group">
                  <button
                    type="button"
                    className="tku-learning-chapter-head"
                    onClick={() => toggleChapter(chapter.id)}
                    aria-expanded={isOpen}
                  >
                    <div className="tku-learning-chapter-head__left">
                      <span className="tku-learning-chapter-num">Chương {chIdx + 1}</span>
                      <span className="tku-learning-chapter-name" title={chapter.title}>
                        {chapter.title}
                      </span>
                    </div>
                    <div className="tku-learning-chapter-head__right">
                      <span className="tku-learning-chapter-progress">
                        {chapterCompletedCount}/{chapter.lessons.length} bài đã học
                      </span>
                      <ChevronDown
                        size={16}
                        className={`tku-learning-chapter-chevron ${isOpen ? 'is-open' : ''}`}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="tku-learning-lesson-list">
                      {chapter.lessons.length > 0 ? (
                        chapter.lessons.map((lesson, lesIdx) => {
                          const isActive = activeLesson?.id === lesson.id;
                          const lessonQuizzes = assessmentsByLessonId.get(lesson.id) || [];

                          return (
                            <div key={lesson.id} className="tku-learning-lesson-group-item">
                              <button
                                type="button"
                                className={`tku-learning-lesson-item ${isActive ? 'is-active' : ''} ${
                                  lesson.isCompleted ? 'is-completed' : ''
                                }`}
                                onClick={() => handleSelectLesson(lesson.id)}
                              >
                                <div
                                  className={`tku-learning-lesson-status-icon ${
                                    lesson.isCompleted
                                      ? 'tku-learning-lesson-status-icon--completed'
                                      : isActive
                                      ? 'tku-learning-lesson-status-icon--active'
                                      : 'tku-learning-lesson-status-icon--pending'
                                  }`}
                                >
                                  {lesson.isCompleted ? (
                                    <CheckCircle2 size={16} />
                                  ) : isActive ? (
                                    <PlayCircle size={16} />
                                  ) : (
                                    <Circle size={14} />
                                  )}
                                </div>

                                <div className="tku-learning-lesson-info">
                                  <span className="tku-learning-lesson-name" title={lesson.title}>
                                    {formatLessonTitle(lesson.title, lesIdx)}
                                  </span>
                                  <div className="tku-learning-lesson-meta">
                                    <span className="tku-learning-lesson-tag">
                                      {lesson.hasVideo || lesson.videoUrl ? (
                                        <>
                                          <PlayCircle size={11} style={{ display: 'inline', marginRight: 3 }} />
                                          <span>Video</span>
                                        </>
                                      ) : (
                                        <>
                                          <FileText size={11} style={{ display: 'inline', marginRight: 3 }} />
                                          <span>Lý thuyết</span>
                                        </>
                                      )}
                                    </span>
                                    {lessonQuizzes.length > 0 && (
                                      <span className="tku-learning-lesson-quiz-count-tag" title="Bài tập củng cố kèm theo bài học">
                                        <FileCheck size={10} style={{ display: 'inline', marginRight: 2 }} />
                                        <span>{lessonQuizzes.length} bài tập</span>
                                      </span>
                                    )}
                                    {lesson.isCompleted && (
                                      <span style={{ color: '#10b981', fontWeight: 500 }}>· Hoàn thành</span>
                                    )}
                                  </div>
                                </div>
                              </button>

                              {/* BÀI TẬP KÈM THEO Ở DƯỚI BÀI HỌC TRONG NỘI DUNG KHÓA HỌC */}
                              {lessonQuizzes.length > 0 && (
                                <div className="tku-learning-lesson-sub-exercises">
                                  {lessonQuizzes.map((quiz) => {
                                    const isDone = quiz.bestScore !== null;
                                    const formattedTitle = formatLessonTitle(lesson.title, lesIdx);
                                    return (
                                      <div
                                        key={quiz.id}
                                        className={`tku-learning-sub-exercise-card ${isDone ? 'is-done' : ''}`}
                                      >
                                        <div
                                          className="tku-learning-sub-exercise-main"
                                          onClick={() => handleOpenQuizGuide(quiz, formattedTitle)}
                                          title="Xem hướng dẫn làm bài tập"
                                        >
                                          <div className="tku-learning-sub-exercise-icon">
                                            {isDone ? (
                                              <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                                            ) : (
                                              <FileCheck size={13} style={{ color: '#0284c7' }} />
                                            )}
                                          </div>
                                          <div className="tku-learning-sub-exercise-body">
                                            <div className="tku-learning-sub-exercise-title-row">
                                              <span className="tku-learning-sub-exercise-title" title={quiz.title}>
                                                {quiz.title}
                                              </span>
                                              <span className="tku-learning-sub-exercise-badge">Trắc nghiệm</span>
                                            </div>
                                            <div className="tku-learning-sub-exercise-meta">
                                              <span>{quiz.totalQuestions} câu hỏi</span>
                                              {quiz.durationMinutes ? <span> • {quiz.durationMinutes} phút</span> : ''}
                                              {isDone && (
                                                <span className="tku-learning-sub-exercise-score">
                                                  {' '}• Điểm: {quiz.bestScore}/10
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Nút Bắt đầu */}
                                        <button
                                          type="button"
                                          className="tku-learning-sub-exercise-start-btn"
                                          onClick={() => handleOpenQuizGuide(quiz, formattedTitle)}
                                          title={isDone ? 'Bắt đầu làm lại' : 'Bắt đầu làm bài'}
                                        >
                                          <PlayCircle size={13} />
                                          <span>{isDone ? 'Làm lại' : 'Bắt đầu'}</span>
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="tku-learning-chapter-empty">
                          Chương này chưa có bài giảng.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>

    {/* 4. MODAL CẢNH BÁO KHÔNG ĐƯỢC TUA VIDEO */}
    {showSeekWarning && (
      <div
        className="tku-learning-seek-modal-backdrop"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="tku-seek-warn-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleDismissSeekWarning();
          }
        }}
      >
        <div className="tku-learning-seek-modal">
          <div className="tku-learning-seek-modal__glow" />

          <div className="tku-learning-seek-modal__icon-wrap">
            <div className="tku-learning-seek-modal__icon-halo" />
            <AlertTriangle className="tku-learning-seek-modal__icon" size={32} />
          </div>

          <div className="tku-learning-seek-modal__tag">Quy định học tập TKU</div>

          <h3 id="tku-seek-warn-title" className="tku-learning-seek-modal__title">
            Không được phép tua nhanh video!
          </h3>

          <p className="tku-learning-seek-modal__desc">
            Để đảm bảo chất lượng tiếp thu kiến thức học thuật và được tự động ghi nhận
            hoàn thành bài học, bạn cần theo dõi bài giảng tuần tự. Hệ thống không cho
            phép tua nhanh vượt quá 10 giây so với nội dung bạn đang học.
          </p>

          <div className="tku-learning-seek-modal__badge">
            <span>⏱ Video đã được đưa về mốc thời gian đã xem: {formatVideoTime(seekWarningWatchedSec)}</span>
          </div>

          <button
            type="button"
            className="tku-learning-seek-modal__btn"
            onClick={handleDismissSeekWarning}
          >
            <Play size={16} />
            <span>Tôi đã hiểu, tiếp tục học</span>
          </button>
        </div>
      </div>
    )}

    {/* POPUP HƯỚNG DẪN LÀM BÀI TẬP */}
    {selectedQuizForGuide && courseId && (
      <QuizGuideModal
        quiz={selectedQuizForGuide.quiz}
        lessonTitle={selectedQuizForGuide.lessonTitle}
        courseId={courseId}
        onClose={handleCloseQuizGuide}
        onStart={handleStartQuiz}
      />
    )}

    {/* GLOBAL FOOTER */}
    <Footer />
  </div>
  );
};

export default CourseLearningRoomPage;
