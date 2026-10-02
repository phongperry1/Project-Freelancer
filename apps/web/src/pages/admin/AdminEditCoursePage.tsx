import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen,
  User,
  Image as ImageIcon,
  ChevronDown,
  Save,
  UploadCloud,
  Link2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  GraduationCap,
  RotateCw,
  AlertCircle,
} from 'lucide-react';
import {
  adminService,
  type AdminCourseDetail,
} from '../../services/admin.service';
import { toast } from '../../context/toastService';
import './adminEditCourse.css';

interface FormErrors {
  title?: string;
  teacherId?: string;
  description?: string;
  thumbnailUrl?: string;
}

const isValidHttpUrl = (str: string): boolean => {
  if (!str.trim()) return true;
  try {
    const url = new URL(str.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const AdminEditCoursePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [course, setCourse] = useState<AdminCourseDetail | null>(null);
  const [teachers, setTeachers] = useState<
    Array<{ id: string; fullName: string }>
  >([]);

  const [title, setTitle] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const [imageError, setImageError] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<'FILE' | 'URL'>('FILE');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const fetchInitialData = useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      adminService.getCourseById(id),
      adminService.getCoursesList().catch(() => null),
    ])
      .then(([courseData, coursesRes]) => {
        setCourse(courseData);
        setTitle(courseData.title);
        setTeacherId(courseData.teacher?.id || '');
        setDescription(courseData.description || '');
        setThumbnailUrl(courseData.thumbnailUrl || courseData.thumbnail || '');

        if (coursesRes?.teachers) {
          setTeachers(coursesRes.teachers);
        }
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setLoadError(
          err instanceof Error
            ? err.message
            : 'Không thể tải thông tin khóa học.',
        );
        setIsLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    Promise.all([
      adminService.getCourseById(id),
      adminService.getCoursesList().catch(() => null),
    ])
      .then(([courseData, coursesRes]) => {
        if (!isMounted) return;
        setCourse(courseData);
        setTitle(courseData.title);
        setTeacherId(courseData.teacher?.id || '');
        setDescription(courseData.description || '');
        setThumbnailUrl(courseData.thumbnailUrl || courseData.thumbnail || '');

        if (coursesRes?.teachers) {
          setTeachers(coursesRes.teachers);
        }
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setLoadError(
          err instanceof Error
            ? err.message
            : 'Không thể tải thông tin khóa học.',
        );
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const selectedTeacher = useMemo(() => {
    if (!teacherId) return null;
    const found = teachers.find((t) => t.id === teacherId);
    if (found) return found;
    if (course?.teacher && course.teacher.id === teacherId) {
      return course.teacher;
    }
    return null;
  }, [teachers, teacherId, course?.teacher]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chỉ chọn tệp hình ảnh (JPG, PNG, WEBP, GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dung lượng tệp quá lớn. Vui lòng chọn ảnh dưới 5MB.');
      return;
    }

    setIsUploadingImage(true);
    setImageError(false);
    try {
      const res = await adminService.uploadCourseThumbnail(file);
      setThumbnailUrl(res.url);
      setErrors((prev) => ({ ...prev, thumbnailUrl: undefined }));
      toast.success('Tải ảnh bìa thành công!');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Không thể tải ảnh lúc này.';
      toast.error(message);
    } finally {
      setIsUploadingImage(false);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload],
  );

  const validateField = useCallback(
    (fieldName: keyof FormErrors, value: string): string | undefined => {
      if (fieldName === 'title') {
        const trimmed = value.trim();
        if (!trimmed) return 'Vui lòng nhập tên khóa học, không được để trống.';
        if (trimmed.length < 5) return 'Tên khóa học cần tối thiểu 5 ký tự.';
        if (trimmed.length > 255) return 'Tên khóa học không được vượt quá 255 ký tự.';
        if (!/[a-zA-Z0-9\u00C0-\u1EF9]/.test(trimmed)) {
          return 'Tên khóa học phải chứa ít nhất chữ cái hoặc chữ số.';
        }
      }
      if (fieldName === 'teacherId') {
        if (!value) return 'Vui lòng chọn giảng viên phụ trách, không được để trống.';
      }
      if (fieldName === 'description') {
        const trimmed = value.trim();
        if (!trimmed) return 'Vui lòng nhập mô tả khóa học, không được để trống.';
        if (value.length > 500) return 'Mô tả khóa học không được vượt quá 500 ký tự.';
      }
      if (fieldName === 'thumbnailUrl') {
        const trimmed = value.trim();
        if (!trimmed) return 'Vui lòng tải lên ảnh bìa hoặc nhập liên kết ảnh, không được để trống.';
        if (uploadMode === 'URL') {
          if (!isValidHttpUrl(value)) {
            return 'Đường dẫn ảnh bìa không hợp lệ (phải bắt đầu bằng http:// hoặc https://).';
          }
          if (imageError) {
            return 'Không thể tải ảnh từ liên kết này. Vui lòng kiểm tra lại liên kết.';
          }
        }
      }
      return undefined;
    },
    [uploadMode, imageError],
  );

  const validateForm = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};
    const titleErr = validateField('title', title);
    if (titleErr) newErrors.title = titleErr;

    const teacherErr = validateField('teacherId', teacherId);
    if (teacherErr) newErrors.teacherId = teacherErr;

    const descErr = validateField('description', description);
    if (descErr) newErrors.description = descErr;

    const thumbErr = validateField('thumbnailUrl', thumbnailUrl);
    if (thumbErr) newErrors.thumbnailUrl = thumbErr;

    return newErrors;
  }, [validateField, title, teacherId, description, thumbnailUrl]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!id) return;

      if (isUploadingImage) {
        toast.error('Đang trong quá trình tải ảnh bìa, vui lòng chờ trong giây lát.');
        return;
      }

      const formErrors = validateForm();
      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        toast.error('Vui lòng kiểm tra lại các trường thông tin trên form.');
        if (formErrors.title) {
          document.getElementById('course-title')?.focus();
        } else if (formErrors.teacherId) {
          document.getElementById('course-teacher')?.focus();
        } else if (formErrors.description) {
          document.getElementById('course-desc')?.focus();
        } else if (formErrors.thumbnailUrl) {
          if (uploadMode === 'URL') {
            document.getElementById('course-thumbnail')?.focus();
          } else {
            document.getElementById('course-dropzone')?.focus();
          }
        }
        return;
      }

      setIsSubmitting(true);
      try {
        await adminService.updateCourse(id, {
          title: title.trim(),
          teacherId,
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim(),
        });

        toast.success('Cập nhật thông tin khóa học thành công!');
        navigate(`/admin/courses/${id}`);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Không thể cập nhật khóa học lúc này.';
        toast.error(message);
        if (message.toLowerCase().includes('tiêu đề') || message.toLowerCase().includes('tên')) {
          setErrors((prev) => ({ ...prev, title: message }));
          document.getElementById('course-title')?.focus();
        } else if (message.toLowerCase().includes('giảng viên')) {
          setErrors((prev) => ({ ...prev, teacherId: message }));
          document.getElementById('course-teacher')?.focus();
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [id, isUploadingImage, validateForm, title, teacherId, description, thumbnailUrl, uploadMode, navigate],
  );

  if (isLoading) {
    return (
      <div className="tku-edit-page">
        <div className="tku-admin-loading-wrapper" style={{ padding: '120px 0' }}>
          <div className="tku-admin-spinner" />
          <span>Đang tải thông tin khóa học...</span>
        </div>
      </div>
    );
  }

  if (loadError || !course) {
    return (
      <div className="tku-edit-page">
        <div className="tku-edit-header">
          <div className="tku-edit-breadcrumbs">
            <Link to="/admin">Admin</Link>
            <span className="tku-edit-breadcrumbs__sep">/</span>
            <Link to="/admin/courses">Khóa học</Link>
            <span className="tku-edit-breadcrumbs__sep">/</span>
            <span className="tku-edit-breadcrumbs__current">Chỉnh sửa</span>
          </div>
        </div>
        <div className="tku-edit-content">
          <div className="tku-edit-card" style={{ padding: '40px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#fef2f2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <AlertCircle size={28} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Không thể tải thông tin khóa học
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px 0' }}>
              {loadError || 'Khóa học không tồn tại hoặc đã bị xóa.'}
            </p>
            <button
              type="button"
              className="tku-edit-view-btn"
              onClick={fetchInitialData}
            >
              <RotateCw size={14} />
              <span>Thử lại</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tku-edit-page">
      <header className="tku-edit-header">
        <div className="tku-edit-breadcrumbs">
          <Link to="/admin">Admin</Link>
          <span className="tku-edit-breadcrumbs__sep">/</span>
          <Link to="/admin/courses">Khóa học</Link>
          <span className="tku-edit-breadcrumbs__sep">/</span>
          <Link to={`/admin/courses/${course.id}`}>{course.title}</Link>
          <span className="tku-edit-breadcrumbs__sep">/</span>
          <span className="tku-edit-breadcrumbs__current">Chỉnh sửa</span>
        </div>

        <div className="tku-edit-title-box">
          <h1 className="tku-edit-title">
            <GraduationCap size={26} color="#2563eb" />
            <span>Sửa thông tin khóa học</span>
          </h1>
          <p className="tku-edit-desc">
            Cập nhật thông tin chi tiết và phân công giảng viên phụ trách khóa học.
          </p>
        </div>
      </header>

      <div className="tku-edit-content">
        <form className="tku-edit-layout" onSubmit={handleSubmit} noValidate>
          <div className="tku-edit-col-main">
            <div className="tku-edit-card">
              <div className="tku-edit-card-header">
                <div className="tku-edit-card-badge">
                  <BookOpen size={18} />
                </div>
                <div className="tku-edit-card-info">
                  <h2 className="tku-edit-card-title">Thông tin cơ bản</h2>
                  <p className="tku-edit-card-subtitle">
                    Tiêu đề và nội dung tóm tắt của khóa học
                  </p>
                </div>
              </div>

              <div className="tku-edit-card-body">
                <div className="tku-edit-form-group">
                  <label htmlFor="course-title" className="tku-edit-label">
                    Tên khóa học <span className="tku-edit-required">*</span>
                  </label>
                  <div className="tku-edit-input-wrap">
                    <BookOpen size={16} className="tku-edit-input-icon" />
                    <input
                      id="course-title"
                      type="text"
                      className={`tku-edit-input ${errors.title ? 'tku-edit-input--error' : ''}`}
                      placeholder="Ví dụ: Hóa học 10 – Cấu tạo nguyên tử & Bảng tuần hoàn"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (errors.title) {
                          const err = validateField('title', e.target.value);
                          setErrors((prev) => ({ ...prev, title: err }));
                        }
                      }}
                      onBlur={() => {
                        const err = validateField('title', title);
                        if (err) {
                          setErrors((prev) => ({ ...prev, title: err }));
                        }
                      }}
                      maxLength={255}
                      required
                    />
                  </div>
                  {errors.title && (
                    <span className="tku-edit-error-msg">{errors.title}</span>
                  )}
                </div>

                <div className="tku-edit-form-group">
                  <div className="tku-edit-label-row">
                    <label htmlFor="course-desc" className="tku-edit-label">
                      Mô tả nội dung khóa học <span className="tku-edit-required">*</span>
                    </label>
                    <span
                      className={`tku-edit-char-count ${description.length >= 480 ? 'tku-edit-char-count--warn' : ''}`}
                    >
                      {description.length} / 500
                    </span>
                  </div>
                  <textarea
                    id="course-desc"
                    className={`tku-edit-textarea ${errors.description ? 'tku-edit-textarea--error' : ''}`}
                    placeholder="Nhập tóm tắt nội dung mục tiêu khóa học..."
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (errors.description) {
                        const err = validateField('description', e.target.value);
                        setErrors((prev) => ({ ...prev, description: err }));
                      }
                    }}
                    onBlur={() => {
                      const err = validateField('description', description);
                      if (err) {
                        setErrors((prev) => ({ ...prev, description: err }));
                      }
                    }}
                    maxLength={500}
                    rows={4}
                  />
                  {errors.description && (
                    <span className="tku-edit-error-msg">{errors.description}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="tku-edit-card">
              <div className="tku-edit-card-header">
                <div className="tku-edit-card-badge tku-edit-card-badge--indigo">
                  <User size={18} />
                </div>
                <div className="tku-edit-card-info">
                  <h2 className="tku-edit-card-title">Giảng viên đảm nhiệm</h2>
                  <p className="tku-edit-card-subtitle">
                    Phân công giảng viên chính chịu trách nhiệm quản lý nội dung và đào tạo
                  </p>
                </div>
              </div>

              <div className="tku-edit-card-body">
                <div className="tku-edit-form-group">
                  <label htmlFor="course-teacher" className="tku-edit-label">
                    Chọn giảng viên phụ trách <span className="tku-edit-required">*</span>
                  </label>
                  <div className="tku-edit-select-wrap">
                    <User size={16} className="tku-edit-input-icon" />
                    <select
                      id="course-teacher"
                      className={`tku-edit-select ${errors.teacherId ? 'tku-edit-input--error' : ''}`}
                      value={teacherId}
                      onChange={(e) => {
                        setTeacherId(e.target.value);
                        if (errors.teacherId) {
                          const err = validateField('teacherId', e.target.value);
                          setErrors((prev) => ({ ...prev, teacherId: err }));
                        }
                      }}
                      onBlur={() => {
                        const err = validateField('teacherId', teacherId);
                        if (err) {
                          setErrors((prev) => ({ ...prev, teacherId: err }));
                        }
                      }}
                      disabled={teachers.length === 0}
                    >
                      {teachers.length === 0 ? (
                        <option value="">Chưa có dữ liệu giảng viên</option>
                      ) : (
                        <>
                          <option value="">-- Chọn giảng viên phụ trách --</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.fullName}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <ChevronDown size={14} className="tku-edit-select-arrow" />
                  </div>
                  {errors.teacherId && (
                    <span className="tku-edit-error-msg">{errors.teacherId}</span>
                  )}
                </div>

                {selectedTeacher && (
                  <div className="tku-edit-teacher-card">
                    <div className="tku-edit-teacher-avatar">
                      {selectedTeacher.fullName
                        ? selectedTeacher.fullName.slice(0, 1).toUpperCase()
                        : 'G'}
                    </div>
                    <div className="tku-edit-teacher-details">
                      <span className="tku-edit-teacher-name">
                        {selectedTeacher.fullName}
                      </span>
                      <span className="tku-edit-teacher-role-tag">
                        <CheckCircle2 size={13} />
                        <span>Giảng viên đảm nhiệm khóa học</span>
                      </span>
                    </div>
                  </div>
                )}

                <div className="tku-edit-teacher-hint">
                  Giảng viên được phân công có toàn quyền quản trị bài học, tài liệu sư phạm, theo dõi tiến độ và chấm bài kiểm tra của học sinh trong khóa học này.
                </div>
              </div>
            </div>
          </div>

          <div className="tku-edit-col-side">
            <div className="tku-edit-card">
              <div className="tku-edit-card-header">
                <div className="tku-edit-card-badge tku-edit-card-badge--emerald">
                  <ImageIcon size={18} />
                </div>
                <div className="tku-edit-card-info">
                  <h2 className="tku-edit-card-title">
                    Ảnh bìa (Thumbnail) <span className="tku-edit-required">*</span>
                  </h2>
                  <p className="tku-edit-card-subtitle">
                    Hình ảnh nhận diện chính của khóa học
                  </p>
                </div>
              </div>

              <div className="tku-edit-card-body">
                <div className="tku-edit-tab-pills">
                  <button
                    type="button"
                    className={`tku-edit-tab-pill ${uploadMode === 'FILE' ? 'tku-edit-tab-pill--active' : ''}`}
                    onClick={() => {
                      setUploadMode('FILE');
                      if (errors.thumbnailUrl) {
                        setErrors((prev) => ({ ...prev, thumbnailUrl: undefined }));
                      }
                    }}
                  >
                    <UploadCloud size={14} />
                    <span>Tải từ máy tính</span>
                  </button>
                  <button
                    type="button"
                    className={`tku-edit-tab-pill ${uploadMode === 'URL' ? 'tku-edit-tab-pill--active' : ''}`}
                    onClick={() => setUploadMode('URL')}
                  >
                    <Link2 size={14} />
                    <span>Nhập liên kết URL</span>
                  </button>
                </div>

                {uploadMode === 'FILE' ? (
                  <div className="tku-edit-file-wrap">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />

                    {thumbnailUrl && !imageError ? (
                      <div className="tku-edit-uploaded-preview">
                        <div className="tku-edit-preview-canvas">
                          <img
                            src={thumbnailUrl}
                            alt="Ảnh bìa khóa học"
                            className="tku-edit-preview-img"
                            onError={() => setImageError(true)}
                          />
                          <a
                            href={thumbnailUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tku-edit-preview-badge"
                            title="Mở ảnh gốc trong tab mới"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={12} />
                            <span>Xem đầy đủ</span>
                          </a>
                        </div>
                        <div className="tku-edit-uploaded-actions">
                          <button
                            type="button"
                            className="tku-edit-file-change-btn"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingImage}
                          >
                            <UploadCloud size={14} />
                            <span>Thay đổi ảnh</span>
                          </button>
                          <button
                            type="button"
                            className="tku-edit-file-remove-btn"
                            onClick={() => {
                              setThumbnailUrl('');
                              setImageError(false);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                              const err = validateField('thumbnailUrl', '');
                              if (err) {
                                setErrors((prev) => ({ ...prev, thumbnailUrl: err }));
                              }
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        id="course-dropzone"
                        className={`tku-edit-dropzone ${isDragging ? 'tku-edit-dropzone--active' : ''} ${isUploadingImage ? 'tku-edit-dropzone--uploading' : ''} ${errors.thumbnailUrl ? 'tku-edit-dropzone--error' : ''}`}
                        onClick={() => {
                          if (!isUploadingImage) fileInputRef.current?.click();
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            fileInputRef.current?.click();
                          }
                        }}
                      >
                        {isUploadingImage ? (
                          <div className="tku-edit-upload-loading">
                            <div className="tku-edit-spinner" />
                            <span>Đang tải ảnh lên hệ thống...</span>
                          </div>
                        ) : (
                          <>
                            <div className="tku-edit-dropzone-icon">
                              <UploadCloud size={24} />
                            </div>
                            <div className="tku-edit-dropzone-text">
                              <strong>Bấm để chọn tệp</strong> hoặc kéo thả ảnh vào đây
                            </div>
                            <div className="tku-edit-dropzone-hint">
                              PNG, JPG, WEBP (tối đa 5MB)
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {errors.thumbnailUrl && (
                      <span className="tku-edit-error-msg" style={{ display: 'block', marginTop: '6px' }}>
                        {errors.thumbnailUrl}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="tku-edit-url-wrap">
                    <div className="tku-edit-form-group">
                      <div className="tku-edit-input-wrap">
                        <ImageIcon size={16} className="tku-edit-input-icon" />
                        <input
                          id="course-thumbnail"
                          type="url"
                          className={`tku-edit-input ${errors.thumbnailUrl ? 'tku-edit-input--error' : ''}`}
                          placeholder="https://example.com/image.jpg"
                          value={thumbnailUrl}
                          onChange={(e) => {
                            setThumbnailUrl(e.target.value);
                            setImageError(false);
                            if (errors.thumbnailUrl) {
                              const err = validateField('thumbnailUrl', e.target.value);
                              setErrors((prev) => ({ ...prev, thumbnailUrl: err }));
                            }
                          }}
                          onBlur={() => {
                            const err = validateField('thumbnailUrl', thumbnailUrl);
                            if (err) {
                              setErrors((prev) => ({ ...prev, thumbnailUrl: err }));
                            }
                          }}
                        />
                      </div>
                      {errors.thumbnailUrl && (
                        <span className="tku-edit-error-msg">{errors.thumbnailUrl}</span>
                      )}
                    </div>

                    <div className={`tku-edit-preview-box ${thumbnailUrl.trim() && !imageError ? 'tku-edit-preview-box--has-img' : ''}`}>
                      {thumbnailUrl.trim() && !imageError ? (
                        <div className="tku-edit-preview-canvas">
                          <img
                            src={thumbnailUrl.trim()}
                            alt="Xem trước ảnh bìa"
                            className="tku-edit-preview-img"
                            onError={() => {
                              setImageError(true);
                              setErrors((prev) => ({
                                ...prev,
                                thumbnailUrl: 'Không thể tải ảnh từ liên kết này. Vui lòng kiểm tra lại liên kết.',
                              }));
                            }}
                          />
                          <a
                            href={thumbnailUrl.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tku-edit-preview-badge"
                            title="Mở ảnh gốc trong tab mới"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={12} />
                            <span>Xem đầy đủ</span>
                          </a>
                        </div>
                      ) : thumbnailUrl.trim() && imageError ? (
                        <div className="tku-edit-preview-error">
                          <AlertCircle size={22} />
                          <span>Không thể hiển thị ảnh từ liên kết</span>
                          <small>Vui lòng kiểm tra lại đường dẫn ảnh hoặc sử dụng tải tệp từ máy</small>
                        </div>
                      ) : (
                        <div className="tku-edit-preview-placeholder">
                          <ImageIcon size={28} />
                          <span>Xem trước ảnh bìa khóa học</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="tku-edit-card">
              <div className="tku-edit-card-body">
                <button
                  type="submit"
                  className="tku-edit-submit-btn"
                  disabled={isSubmitting || isUploadingImage}
                >
                  {isSubmitting ? (
                    <>
                      <div className="tku-edit-spinner" />
                      <span>Đang lưu thay đổi...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Lưu thông tin khóa học</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminEditCoursePage;
