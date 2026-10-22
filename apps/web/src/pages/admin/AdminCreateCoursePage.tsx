import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  User,
  Image as ImageIcon,
  ChevronDown,
  Sparkles,
  UploadCloud,
  Link2,
  Trash2,
  ExternalLink,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { toast } from '../../context/toastService';
import './adminCreateCourse.css';

const GRADE_OPTIONS: Array<{
  value: '10' | '11' | '12' | 'exam' | 'other';
  label: string;
  desc: string;
}> = [
  { value: '10', label: 'Hóa học Lớp 10', desc: 'Chương trình kiến thức chuẩn Lớp 10' },
  { value: '11', label: 'Hóa học Lớp 11', desc: 'Chương trình kiến thức chuẩn Lớp 11' },
  { value: '12', label: 'Hóa học Lớp 12', desc: 'Chương trình kiến thức chuẩn Lớp 12' },
  { value: 'exam', label: 'Luyện thi THPT & ĐGNL', desc: 'Khóa ôn luyện thi tốt nghiệp, TSA, ĐGNL' },
  { value: 'other', label: 'Chuyên đề khác', desc: 'Các chuyên đề chuyên sâu, bồi dưỡng học sinh' },
];

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

export const AdminCreateCoursePage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [grade, setGrade] = useState<'10' | '11' | '12' | 'exam' | 'other'>('10');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [imageError, setImageError] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<'FILE' | 'URL'>('FILE');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [teachers, setTeachers] = useState<
    Array<{ id: string; fullName: string }>
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    let isMounted = true;
    adminService
      .getCoursesList()
      .then((res) => {
        if (isMounted) {
          const list = res.teachers || [];
          setTeachers(list);
          if (list.length > 0) {
            setTeacherId(list[0].id);
          } else {
            setTeacherId('');
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
        await adminService.createCourse({
          title: title.trim(),
          teacherId,
          grade,
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim(),
          status: 'ACTIVE',
        });

        toast.success('Tạo khóa học thành công!');
        navigate('/admin/courses');
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Không thể tạo khóa học lúc này.';
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
    [isUploadingImage, validateForm, title, teacherId, grade, description, thumbnailUrl, uploadMode, navigate],
  );

  return (
    <div className="tku-create-page">
      <header className="tku-create-header">
        <div className="tku-create-breadcrumbs">
          <Link to="/admin">Admin</Link>
          <span className="tku-create-breadcrumbs__sep">/</span>
          <Link to="/admin/courses">Khóa học</Link>
          <span className="tku-create-breadcrumbs__sep">/</span>
          <span className="tku-create-breadcrumbs__current">
            Tạo khóa học mới
          </span>
        </div>

        <div className="tku-create-title-box">
          <h1 className="tku-create-title">Tạo khóa học mới</h1>
          <p className="tku-create-desc">
            Nhập thông tin cơ bản để khởi tạo khóa học trên hệ thống.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="tku-admin-loading-wrapper" style={{ padding: '80px 0' }}>
          <div className="tku-admin-spinner" />
          <span>Đang tải thông tin...</span>
        </div>
      ) : (
        <div className="tku-create-content">
          <form className="tku-create-layout" onSubmit={handleSubmit} noValidate>
            <div className="tku-create-col-main">
              <div className="tku-create-card">
                <div className="tku-create-card-header">
                  <div className="tku-create-card-badge">
                    <BookOpen size={18} />
                  </div>
                  <div className="tku-create-card-info">
                    <h2 className="tku-create-card-title">Thông tin chung</h2>
                    <p className="tku-create-card-subtitle">
                      Tiêu đề và nội dung tóm tắt của khóa học
                    </p>
                  </div>
                </div>

                <div className="tku-create-card-body">
                  <div className="tku-create-form-group">
                    <label htmlFor="course-title" className="tku-create-label">
                      Tên khóa học <span className="tku-create-required">*</span>
                    </label>
                    <div className="tku-create-input-wrap">
                      <BookOpen size={16} className="tku-create-input-icon" />
                      <input
                        id="course-title"
                        type="text"
                        className={`tku-create-input ${errors.title ? 'tku-create-input--error' : ''}`}
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
                      <span className="tku-create-error-msg">{errors.title}</span>
                    )}
                  </div>

                  <div className="tku-create-form-group">
                    <label htmlFor="course-grade" className="tku-create-label">
                      Khối lớp học thuật <span className="tku-create-required">*</span>
                    </label>
                    <div className="tku-create-select-wrap">
                      <GraduationCap size={16} className="tku-create-input-icon" />
                      <select
                        id="course-grade"
                        className="tku-create-select"
                        value={grade}
                        onChange={(e) =>
                          setGrade(
                            e.target.value as '10' | '11' | '12' | 'exam' | 'other',
                          )
                        }
                      >
                        {GRADE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="tku-create-select-arrow" />
                    </div>
                    <span
                      style={{
                        display: 'block',
                        marginTop: '5px',
                        fontSize: '12px',
                        color: '#64748b',
                      }}
                    >
                      {GRADE_OPTIONS.find((opt) => opt.value === grade)?.desc}
                    </span>
                  </div>

                  <div className="tku-create-form-group">
                    <div className="tku-create-label-row">
                      <label htmlFor="course-desc" className="tku-create-label">
                        Mô tả khóa học <span className="tku-create-required">*</span>
                      </label>
                      <span
                        className={`tku-create-char-count ${description.length >= 480 ? 'tku-create-char-count--warn' : ''}`}
                      >
                        {description.length} / 500
                      </span>
                    </div>
                    <textarea
                      id="course-desc"
                      className={`tku-create-textarea ${errors.description ? 'tku-create-textarea--error' : ''}`}
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
                      <span className="tku-create-error-msg">{errors.description}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="tku-create-card">
                <div className="tku-create-card-header">
                  <div className="tku-create-card-badge">
                    <User size={18} />
                  </div>
                  <div className="tku-create-card-info">
                    <h2 className="tku-create-card-title">Phân công giảng viên</h2>
                    <p className="tku-create-card-subtitle">
                      Giảng viên trực tiếp phụ trách và giảng dạy khóa học
                    </p>
                  </div>
                </div>

                <div className="tku-create-card-body">
                  <div className="tku-create-form-group">
                    <label htmlFor="course-teacher" className="tku-create-label">
                      Giảng viên phụ trách <span className="tku-create-required">*</span>
                    </label>
                    <div className="tku-create-select-wrap">
                      <User size={16} className="tku-create-input-icon" />
                      <select
                        id="course-teacher"
                        className={`tku-create-select ${errors.teacherId ? 'tku-create-input--error' : ''}`}
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
                          <option value="">Chưa có dữ liệu</option>
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
                      <ChevronDown size={14} className="tku-create-select-arrow" />
                    </div>
                    {errors.teacherId && (
                      <span className="tku-create-error-msg">{errors.teacherId}</span>
                    )}
                    {teachers.length === 0 && !isLoading && (
                      <span style={{ display: 'block', marginTop: '6px', fontSize: '12.5px', color: '#b45309' }}>
                        Chưa có tài khoản giảng viên nào trong hệ thống.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="tku-create-col-side">
              <div className="tku-create-card">
                <div className="tku-create-card-header">
                  <div className="tku-create-card-info">
                    <h2 className="tku-create-card-title">
                      Ảnh bìa (Thumbnail) <span className="tku-create-required">*</span>
                    </h2>
                    <p className="tku-create-card-subtitle">
                      Hình ảnh đại diện cho khóa học
                    </p>
                  </div>
                </div>

                <div className="tku-create-card-body">
                  <div className="tku-create-tab-pills">
                    <button
                      type="button"
                      className={`tku-create-tab-pill ${uploadMode === 'FILE' ? 'tku-create-tab-pill--active' : ''}`}
                      onClick={() => setUploadMode('FILE')}
                    >
                      <UploadCloud size={14} />
                      <span>Tải từ máy tính</span>
                    </button>
                    <button
                      type="button"
                      className={`tku-create-tab-pill ${uploadMode === 'URL' ? 'tku-create-tab-pill--active' : ''}`}
                      onClick={() => setUploadMode('URL')}
                    >
                      <Link2 size={14} />
                      <span>Nhập link</span>
                    </button>
                  </div>

                  {uploadMode === 'FILE' ? (
                    <div className="tku-create-file-wrap">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />

                      {thumbnailUrl && !imageError ? (
                        <div className="tku-create-uploaded-preview">
                          <div className="tku-create-preview-canvas">
                            <img
                              src={thumbnailUrl}
                              alt="Ảnh bìa đã tải lên"
                              className="tku-create-preview-img"
                              onError={() => setImageError(true)}
                            />
                            <a
                              href={thumbnailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tku-create-preview-badge"
                              title="Mở ảnh gốc trong tab mới"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={12} />
                              <span>Xem đầy đủ</span>
                            </a>
                          </div>
                          <div className="tku-create-uploaded-actions">
                            <button
                              type="button"
                              className="tku-create-file-change-btn"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingImage}
                            >
                              <UploadCloud size={14} />
                              <span>Đổi ảnh khác</span>
                            </button>
                            <button
                              type="button"
                              className="tku-create-file-remove-btn"
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
                          className={`tku-create-dropzone ${isDragging ? 'tku-create-dropzone--active' : ''} ${isUploadingImage ? 'tku-create-dropzone--uploading' : ''} ${errors.thumbnailUrl ? 'tku-create-dropzone--error' : ''}`}
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
                            <div className="tku-create-upload-loading">
                              <div className="tku-create-spinner" />
                              <span>Đang tải ảnh...</span>
                            </div>
                          ) : (
                            <>
                              <div className="tku-create-dropzone-icon">
                                <UploadCloud size={24} />
                              </div>
                              <div className="tku-create-dropzone-text">
                                <strong>Bấm để chọn tệp</strong> hoặc kéo thả ảnh vào đây
                              </div>
                              <div className="tku-create-dropzone-hint">
                                PNG, JPG, WEBP (tối đa 5MB)
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {errors.thumbnailUrl && (
                        <span className="tku-create-error-msg" style={{ display: 'block', marginTop: '8px' }}>
                          {errors.thumbnailUrl}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="tku-create-url-wrap">
                      <div className="tku-create-form-group">
                        <div className="tku-create-input-wrap">
                          <ImageIcon size={16} className="tku-create-input-icon" />
                          <input
                            id="course-thumbnail"
                            type="url"
                            className={`tku-create-input ${errors.thumbnailUrl ? 'tku-create-input--error' : ''}`}
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
                          <span className="tku-create-error-msg">{errors.thumbnailUrl}</span>
                        )}
                      </div>

                      <div className={`tku-create-preview-box ${thumbnailUrl.trim() && !imageError ? 'tku-create-preview-box--has-img' : ''}`}>
                        {thumbnailUrl.trim() && !imageError ? (
                          <div className="tku-create-preview-canvas">
                            <img
                              src={thumbnailUrl.trim()}
                              alt="Xem trước ảnh bìa"
                              className="tku-create-preview-img"
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
                              className="tku-create-preview-badge"
                              title="Mở ảnh gốc trong tab mới"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={12} />
                              <span>Xem đầy đủ</span>
                            </a>
                          </div>
                        ) : thumbnailUrl.trim() && imageError ? (
                          <div className="tku-create-preview-error">
                            <AlertCircle size={22} />
                            <span>Không thể hiển thị ảnh từ liên kết</span>
                            <small>Vui lòng kiểm tra lại đường dẫn ảnh hoặc sử dụng tải tệp từ máy</small>
                          </div>
                        ) : (
                          <div className="tku-create-preview-placeholder">
                            <ImageIcon size={28} className="tku-create-placeholder-icon" />
                            <span>Xem trước ảnh bìa khóa học</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="tku-create-card tku-create-card--actions">
                <div className="tku-create-card-body">
                  <button
                    type="submit"
                    className="tku-create-submit-btn"
                    disabled={isSubmitting || isUploadingImage}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="tku-create-spinner" />
                        <span>Đang tạo khóa học...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Tạo khóa học</span>
                      </>
                    )}
                  </button>

                  <Link to="/admin/courses" className="tku-create-cancel-btn">
                    Hủy
                  </Link>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminCreateCoursePage;
