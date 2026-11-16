import {
    AlertCircle,
    AlignLeft,
    BookOpen,
    Calendar,
    Check,
    Clock,
    Copy,
    ExternalLink,
    Eye,
    EyeOff,
    GraduationCap,
    KeyRound,
    Layers,
    Plus,
    RotateCw,
    Sparkles,
    Trash2,
    User as UserIcon,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from '../../context/toastService';
import {
    adminService,
    type AdminActivationKeyItem,
    type AdminActivationKeysResponse,
    type AdminCourseDetail,
} from '../../services/admin.service';
import './adminCourseDetail.css';

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString?: string | null): string => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    const date = d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const time = d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${date} • ${time}`;
  } catch {
    return dateString;
  }
};

const formatTimeRemaining = (expiresAtStr: string, status: string): string => {
  if (status === 'USED') return 'Đã sử dụng';
  const now = new Date().getTime();
  const exp = new Date(expiresAtStr).getTime();
  const diffMs = exp - now;

  if (diffMs <= 0) return 'Đã hết hạn';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remHours = diffHours % 24;

  if (diffDays > 0) {
    return `Còn ${diffDays} ngày ${remHours}h`;
  }
  const remMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `Còn ${diffHours}h ${remMinutes}m`;
};

export const AdminCourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [course, setCourse] = useState<AdminCourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Quản lý mã key kích hoạt 1 lần
  const [keysData, setKeysData] = useState<AdminActivationKeysResponse | null>(null);
  const [isLoadingKeys, setIsLoadingKeys] = useState<boolean>(false);
  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState<boolean>(false);

  // Form tạo key
  const [selectedHours, setSelectedHours] = useState<number>(72);
  const [customHours, setCustomHours] = useState<string>('');
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false);
  const [isCreatingKeys, setIsCreatingKeys] = useState<boolean>(false);

  // Copy feedback
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Danh sách key hiển thị
  const visibleKeys = useMemo<AdminActivationKeyItem[]>(
    () => keysData?.keys ?? [],
    [keysData?.keys],
  );

  const fetchCourseData = useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    adminService
      .getCourseById(id)
      .then((courseData) => {
        setCourse(courseData);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải thông tin chi tiết khóa học.',
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    adminService
      .getCourseById(id)
      .then((courseData) => {
        if (isMounted) {
          setCourse(courseData);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không thể tải thông tin chi tiết khóa học.',
          );
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
  }, [id]);

  // Tải danh sách mã key của khóa học khi mount
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    adminService
      .getCourseActivationKeys(id)
      .then((data) => {
        if (isMounted) {
          setKeysData(data);
        }
      })
      .catch((err: unknown) => {
        console.error('Lỗi tải danh sách mã key:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingKeys(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Làm mới danh sách mã key khi tạo hoặc xóa key
  const fetchKeysData = useCallback(() => {
    if (!id) return;
    setIsLoadingKeys(true);

    adminService
      .getCourseActivationKeys(id)
      .then((data) => {
        setKeysData(data);
      })
      .catch((err: unknown) => {
        console.error('Lỗi tải danh sách mã key:', err);
      })
      .finally(() => {
        setIsLoadingKeys(false);
      });
  }, [id]);

  useEffect(() => {
    if (!isLoading && window.location.hash === '#activation-keys') {
      const el = document.getElementById('activation-keys');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, [isLoading]);

  // Xử lý tạo mã Key 1 lần
  const handleCreateKeys = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    let hours = selectedHours;
    if (isCustomDuration) {
      const parsed = parseInt(customHours, 10);
      if (isNaN(parsed) || parsed <= 0) {
        toast.error('Vui lòng nhập số giờ hiệu lực hợp lệ (lớn hơn 0).');
        return;
      }
      hours = parsed;
    }

    setIsCreatingKeys(true);
    try {
      const res = await adminService.createCourseActivationKeys(id, {
        expiresInHours: hours,
        quantity: 1,
      });

      toast.success(res.message || 'Đã tạo mã key thành công!');
      setIsCreateKeyModalOpen(false);
      fetchKeysData();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Không thể tạo mã key cho khóa học.';
      toast.error(msg);
    } finally {
      setIsCreatingKeys(false);
    }
  }, [id, selectedHours, isCustomDuration, customHours, fetchKeysData]);

  // Sao chép 1 mã key
  const handleCopyKey = useCallback((keyCode: string, keyId: string) => {
    navigator.clipboard
      .writeText(keyCode)
      .then(() => {
        setCopiedKeyId(keyId);
        toast.success(`Đã sao chép mã: ${keyCode}`);
        setTimeout(() => setCopiedKeyId(null), 2000);
      })
      .catch(() => {
        toast.info(`Mã key: ${keyCode}`);
      });
  }, []);


  // Xóa mã key
  const handleDeleteKey = useCallback(async (keyId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mã key này không? Mã sẽ bị hủy vĩnh viễn.')) {
      return;
    }

    try {
      await adminService.deleteActivationKey(keyId);
      toast.success('Đã xóa mã key thành công.');
      fetchKeysData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa mã key.';
      toast.error(msg);
    }
  }, [fetchKeysData]);


  return (
    <div className="tku-detail-page">
      {/* 1. Header & Breadcrumbs & Action Bar */}
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
            {/* Cột Trái: Giới thiệu khóa học & Thống kê đào tạo */}
            <div className="tku-detail-col-main">
              {/* Card 1: Tổng quan & Giới thiệu khóa học */}
              <div className="tku-detail-card">
                <div className="tku-detail-hero-box">
                  <div className="tku-detail-hero-header-row">
                    <div className="tku-detail-hero-tags-left">
                      <span className="tku-detail-academic-pill">
                        <GraduationCap size={14} />
                        <span>Khóa học học thuật</span>
                      </span>

                      {course.grade && (
                        <span className={`tku-detail-grade-pill tku-detail-grade-pill--${course.grade}`}>
                          <Layers size={13} />
                          <span>
                            {course.grade === '10'
                              ? 'Hóa học Lớp 10'
                              : course.grade === '11'
                                ? 'Hóa học Lớp 11'
                                : course.grade === '12'
                                  ? 'Hóa học Lớp 12'
                                  : course.grade === 'exam'
                                    ? 'Luyện thi THPT & ĐGNL'
                                    : 'Chuyên đề khác'}
                          </span>
                        </span>
                      )}
                    </div>

                    <span
                      className={`tku-detail-status-pill ${
                        course.status === 'ACTIVE'
                          ? 'tku-detail-status-pill--active'
                          : 'tku-detail-status-pill--hidden'
                      }`}
                    >
                      <span className="tku-detail-status-dot" />
                      <span>
                        {course.status === 'ACTIVE' ? 'Đang hiển thị' : 'Đang tạm ẩn'}
                      </span>
                    </span>
                  </div>

                  <h1 className="tku-detail-course-heading">{course.title}</h1>

                  {/* Khu vực mô tả khóa học */}
                  <div className="tku-detail-description-section">
                    <div className="tku-detail-desc-header">
                      <AlignLeft size={16} className="tku-detail-desc-icon" />
                      <h3 className="tku-detail-desc-title">Mô tả khóa học</h3>
                    </div>
                    <div className="tku-detail-desc-box">
                      {course.description ? (
                        <p className="tku-detail-desc-body">{course.description}</p>
                      ) : (
                        <p className="tku-detail-desc-placeholder">
                          Khóa học này hiện chưa có nội dung mô tả chi tiết.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Thông tin & Thống kê đào tạo */}
              <div className="tku-detail-card">
                <div className="tku-detail-section-head">
                  <div className="tku-detail-section-title-wrap">
                    <h2 className="tku-detail-section-title-main">
                      Thông tin & Thống kê đào tạo
                    </h2>
                    <p className="tku-detail-section-title-sub">
                      Dữ liệu vận hành và học viên của khóa học trên hệ thống
                    </p>
                  </div>
                </div>

                <div className="tku-detail-stats-grid-4">
                  {/* Ô 1: Số học viên */}
                  <div className="tku-detail-stat-card-item">
                    <div className="tku-detail-stat-icon-wrapper tku-detail-stat-icon--blue">
                      <Users size={20} />
                    </div>
                    <div className="tku-detail-stat-info-text">
                      <span className="tku-detail-stat-number">
                        {(course._count?.enrollments || 0).toLocaleString('vi-VN')}
                      </span>
                      <span className="tku-detail-stat-caption">Học viên tham gia</span>
                    </div>
                  </div>

                  {/* Ô 2: Trạng thái hiển thị */}
                  <div className="tku-detail-stat-card-item">
                    <div
                      className={`tku-detail-stat-icon-wrapper ${
                        course.status === 'ACTIVE'
                          ? 'tku-detail-stat-icon--emerald'
                          : 'tku-detail-stat-icon--slate'
                      }`}
                    >
                      {course.status === 'ACTIVE' ? (
                        <Eye size={20} />
                      ) : (
                        <EyeOff size={20} />
                      )}
                    </div>
                    <div className="tku-detail-stat-info-text">
                      <span className="tku-detail-stat-number">
                        {course.status === 'ACTIVE' ? 'Công khai' : 'Tạm ẩn'}
                      </span>
                      <span className="tku-detail-stat-caption">Trạng thái hệ thống</span>
                    </div>
                  </div>

                  {/* Ô 3: Ngày tạo */}
                  <div className="tku-detail-stat-card-item">
                    <div className="tku-detail-stat-icon-wrapper tku-detail-stat-icon--purple">
                      <Calendar size={20} />
                    </div>
                    <div className="tku-detail-stat-info-text">
                      <span className="tku-detail-stat-number">
                        {formatDate(course.createdAt)}
                      </span>
                      <span className="tku-detail-stat-caption">Thời gian khởi tạo</span>
                    </div>
                  </div>

                  {/* Ô 4: Cập nhật gần nhất */}
                  <div className="tku-detail-stat-card-item">
                    <div className="tku-detail-stat-icon-wrapper tku-detail-stat-icon--slate">
                      <Clock size={20} />
                    </div>
                    <div className="tku-detail-stat-info-text">
                      <span className="tku-detail-stat-number">
                        {formatDate(course.updatedAt)}
                      </span>
                      <span className="tku-detail-stat-caption">Lần cập nhật cuối</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Quản lý Mã Key Tham Gia Khóa Học (Dùng 1 Lần & Có Thời Hạn Cụ Thể) */}
              <div id="activation-keys" className="tku-detail-card tku-keys-card">
                <div className="tku-keys-card-header">
                  <div className="tku-keys-title-with-icon">
                    <div className="tku-keys-icon-badge">
                      <KeyRound size={22} />
                    </div>
                    <div className="tku-keys-title-wrap">
                      <h2 className="tku-keys-title-main">
                        Quản lý Mã Key Tham Gia (Dùng 1 Lần)
                      </h2>
                      <p className="tku-keys-title-sub">
                        Tạo và cấp phát mã key kích hoạt khóa học cho học sinh. Mã tự động hết hiệu lực sau khi sử dụng hoặc khi quá thời hạn quy định.
                      </p>
                    </div>
                  </div>

                  <div className="tku-keys-header-actions">
                    <button
                      type="button"
                      onClick={() => setIsCreateKeyModalOpen(true)}
                      className="tku-keys-create-btn"
                    >
                      <Plus size={16} />
                      <span>Tạo mã Key mới</span>
                    </button>
                  </div>
                </div>

                <div className="tku-keys-card-body">
                  {/* Thống kê nhanh về mã key */}
                  <div className="tku-keys-summary-grid">
                    <div className="tku-keys-stat-box">
                      <div className="tku-keys-stat-box-icon tku-keys-stat-box-icon--blue">
                        <KeyRound size={20} />
                      </div>
                      <div className="tku-keys-stat-box-body">
                        <span className="tku-keys-stat-num">
                          {keysData?.totalKeys || 0}
                        </span>
                        <span className="tku-keys-stat-label">Tổng mã đã tạo</span>
                      </div>
                    </div>

                    <div className="tku-keys-stat-box tku-keys-stat-box--active">
                      <div className="tku-keys-stat-box-icon tku-keys-stat-box-icon--emerald">
                        <Clock size={20} />
                      </div>
                      <div className="tku-keys-stat-box-body">
                        <span className="tku-keys-stat-num">
                          {keysData?.activeCount || 0}
                        </span>
                        <span className="tku-keys-stat-label">Chưa dùng (Còn hạn)</span>
                      </div>
                    </div>

                    <div className="tku-keys-stat-box tku-keys-stat-box--used">
                      <div className="tku-keys-stat-box-icon tku-keys-stat-box-icon--indigo">
                        <UserCheck size={20} />
                      </div>
                      <div className="tku-keys-stat-box-body">
                        <span className="tku-keys-stat-num">
                          {keysData?.usedCount || 0}
                        </span>
                        <span className="tku-keys-stat-label">Đã kích hoạt</span>
                      </div>
                    </div>

                    <div className="tku-keys-stat-box tku-keys-stat-box--expired">
                      <div className="tku-keys-stat-box-icon tku-keys-stat-box-icon--rose">
                        <AlertCircle size={20} />
                      </div>
                      <div className="tku-keys-stat-box-body">
                        <span className="tku-keys-stat-num">
                          {keysData?.expiredCount || 0}
                        </span>
                        <span className="tku-keys-stat-label">Đã hết hạn</span>
                      </div>
                    </div>
                  </div>

                  {/* Bảng danh sách mã key */}
                  {isLoadingKeys ? (
                    <div className="tku-keys-loading-state">
                      Đang tải danh sách mã key...
                    </div>
                  ) : !keysData || visibleKeys.length === 0 ? (
                    <div className="tku-keys-empty-card">
                      <KeyRound
                        size={36}
                        className="tku-keys-empty-card-icon"
                      />
                      <p className="tku-keys-empty-card-title">
                        Chưa có mã Key nào được tạo cho khóa học này
                      </p>
                      <p className="tku-keys-empty-card-sub">
                        Bấm vào nút "Tạo mã Key mới" phía trên để tạo mã gửi cho học sinh tham gia lớp.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCreateKeyModalOpen(true)}
                        className="tku-keys-create-btn"
                      >
                        <Plus size={16} />
                        <span>Tạo mã Key ngay</span>
                      </button>
                    </div>
                  ) : (
                    <div className="tku-keys-table-container">
                      <table className="tku-keys-table">
                        <thead>
                          <tr>
                            <th style={{ minWidth: '230px' }}>Mã Key</th>
                            <th style={{ minWidth: '180px' }}>Thời hạn hiệu lực</th>
                            <th style={{ minWidth: '130px' }}>Trạng thái</th>
                            <th style={{ minWidth: '220px' }}>Học sinh kích hoạt</th>
                            <th style={{ minWidth: '160px' }}>Ngày tạo</th>
                            <th style={{ textAlign: 'center', width: '64px' }}>Xóa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleKeys.map((keyItem: AdminActivationKeyItem) => (
                            <tr key={keyItem.id}>
                              {/* Cột 1: Mã Key + Copy */}
                              <td>
                                <div className="tku-key-code-wrap">
                                  <span className="tku-key-code-text">{keyItem.key}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyKey(keyItem.key, keyItem.id)}
                                    className={`tku-key-copy-btn ${
                                      copiedKeyId === keyItem.id
                                        ? 'tku-key-copy-btn--copied'
                                        : ''
                                    }`}
                                    title={copiedKeyId === keyItem.id ? 'Đã sao chép' : 'Sao chép mã'}
                                  >
                                    {copiedKeyId === keyItem.id ? (
                                      <Check size={14} />
                                    ) : (
                                      <Copy size={14} />
                                    )}
                                  </button>
                                </div>
                              </td>

                              {/* Cột 2: Thời hạn */}
                              <td>
                                <div className="tku-key-time-meta">
                                  <span className="tku-key-time-main">
                                    {formatDateTime(keyItem.expiresAt)}
                                  </span>
                                  <span
                                    className={`tku-key-time-sub tku-key-time-sub--${
                                      keyItem.status === 'EXPIRED'
                                        ? 'expired'
                                        : keyItem.status === 'USED'
                                          ? 'used'
                                          : 'active'
                                    }`}
                                  >
                                    {formatTimeRemaining(keyItem.expiresAt, keyItem.status)}
                                  </span>
                                </div>
                              </td>

                              {/* Cột 3: Trạng thái */}
                              <td>
                                {keyItem.status === 'ACTIVE' && (
                                  <span className="tku-key-status-badge tku-key-status-badge--active">
                                    <span className="tku-key-status-dot" />
                                    <span>Chưa dùng</span>
                                  </span>
                                )}
                                {keyItem.status === 'USED' && (
                                  <span className="tku-key-status-badge tku-key-status-badge--used">
                                    <span className="tku-key-status-dot" />
                                    <span>Đã dùng</span>
                                  </span>
                                )}
                                {keyItem.status === 'EXPIRED' && (
                                  <span className="tku-key-status-badge tku-key-status-badge--expired">
                                    <span className="tku-key-status-dot" />
                                    <span>Hết hạn</span>
                                  </span>
                                )}
                              </td>

                              {/* Cột 4: Người đã kích hoạt */}
                              <td>
                                {keyItem.usedBy ? (
                                  <div className="tku-key-user-chip">
                                    <div className="tku-key-user-avatar">
                                      {keyItem.usedBy.fullName.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="tku-key-user-meta">
                                      <span className="tku-key-user-name">
                                        {keyItem.usedBy.fullName}
                                      </span>
                                      <span className="tku-key-user-email">
                                        {keyItem.usedBy.email}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="tku-key-user-empty">
                                    Chưa có người dùng
                                  </span>
                                )}
                              </td>

                              {/* Cột 5: Ngày tạo */}
                              <td>
                                <span className="tku-key-created-text">
                                  {formatDateTime(keyItem.createdAt)}
                                </span>
                              </td>

                              {/* Cột 6: Xóa (chỉ hiển thị khi chưa dùng) */}
                              <td style={{ textAlign: 'center' }}>
                                {keyItem.status !== 'USED' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteKey(keyItem.id)}
                                    className="tku-key-delete-btn"
                                    title="Xóa mã key này"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                ) : (
                                  <span
                                    className="tku-key-dash"
                                    title="Không thể xóa key đã được học sinh sử dụng"
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cột Phải: Ảnh bìa & Giảng viên phụ trách */}
            <div className="tku-detail-col-side">
              {/* Thẻ Ảnh bìa đại diện */}
              <div className="tku-detail-card">
                <div className="tku-detail-section-head">
                  <h3 className="tku-detail-section-title-main" style={{ fontSize: '15px' }}>
                    Ảnh bìa đại diện
                  </h3>
                </div>
                <div className="tku-detail-thumb-container">
                  <div className="tku-detail-thumb-box-rounded">
                    {course.thumbnailUrl || course.thumbnail ? (
                      <img
                        src={course.thumbnailUrl || course.thumbnail || ''}
                        alt={course.title}
                        className="tku-detail-thumb-image"
                      />
                    ) : (
                      <div className="tku-detail-thumb-empty-notice">
                        <BookOpen size={32} />
                        <span>Chưa cập nhật ảnh bìa</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Thẻ Giảng viên phụ trách */}
              <div className="tku-detail-card">
                <div className="tku-detail-section-head">
                  <h3 className="tku-detail-section-title-main" style={{ fontSize: '15px' }}>
                    Giảng viên phụ trách
                  </h3>
                </div>
                <div className="tku-detail-teacher-box">
                  <div className="tku-detail-teacher-profile-row">
                    <div className="tku-detail-teacher-avatar-big">
                      {course.teacher?.fullName
                        ? course.teacher.fullName.slice(0, 1).toUpperCase()
                        : 'G'}
                    </div>
                    <div className="tku-detail-teacher-info-column">
                      <span className="tku-detail-teacher-name-bold">
                        {course.teacher?.fullName || 'Chưa phân công giảng viên'}
                      </span>
                      <span className="tku-detail-teacher-role-tag">Giảng viên</span>
                    </div>
                  </div>

                  {course.teacher?.id && (
                    <Link
                      to={`/admin/users/${course.teacher.id}`}
                      className="tku-detail-teacher-link-btn"
                    >
                      <UserIcon size={14} />
                      <span>Xem hồ sơ giảng viên</span>
                      <ExternalLink size={12} style={{ marginLeft: 'auto' }} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* MODAL TẠO MÃ KEY THAM GIA KHÓA HỌC (DÙNG 1 LẦN) */}
      {isCreateKeyModalOpen && (
        <div
          className="tku-keys-modal-backdrop"
          onClick={() => !isCreatingKeys && setIsCreateKeyModalOpen(false)}
        >
          <div
            className="tku-keys-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tku-keys-modal-header">
              <h3 className="tku-keys-modal-title">
                <KeyRound size={20} style={{ color: '#1d68f2' }} />
                <span>Tạo mã Key tham gia khóa học (1 lần)</span>
              </h3>
              <button
                type="button"
                className="tku-keys-modal-close-btn"
                onClick={() => !isCreatingKeys && setIsCreateKeyModalOpen(false)}
                disabled={isCreatingKeys}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateKeys}>
              <div className="tku-keys-modal-body">
                {/* 1. Chọn thời hạn hiệu lực */}
                <div className="tku-keys-modal-field">
                  <label className="tku-keys-modal-label">
                    Thời hạn hiệu lực của Key (Tự động hết hạn):
                  </label>
                  <div className="tku-keys-duration-grid">
                    {[
                      { hours: 24, label: '24 Giờ (1 ngày)' },
                      { hours: 72, label: '3 Ngày (72h)' },
                      { hours: 168, label: '7 Ngày (1 tuần)' },
                      { hours: 336, label: '14 Ngày (2 tuần)' },
                      { hours: 720, label: '30 Ngày (1 tháng)' },
                    ].map((opt) => (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() => {
                          setSelectedHours(opt.hours);
                          setIsCustomDuration(false);
                        }}
                        className={`tku-keys-duration-pill ${
                          !isCustomDuration && selectedHours === opt.hours
                            ? 'tku-keys-duration-pill--active'
                            : ''
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIsCustomDuration(true)}
                      className={`tku-keys-duration-pill ${
                        isCustomDuration ? 'tku-keys-duration-pill--active' : ''
                      }`}
                    >
                      Tùy chỉnh giờ...
                    </button>
                  </div>

                  {isCustomDuration && (
                    <div style={{ marginTop: '8px' }}>
                      <input
                        type="number"
                        min="1"
                        max="8760"
                        value={customHours}
                        onChange={(e) => setCustomHours(e.target.value)}
                        placeholder="Nhập số giờ hết hạn (ví dụ: 48, 120...)"
                        className="tku-keys-modal-input"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="tku-keys-modal-footer">
                <button
                  type="button"
                  className="tku-detail-btn tku-detail-btn--secondary"
                  onClick={() => setIsCreateKeyModalOpen(false)}
                  disabled={isCreatingKeys}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="tku-keys-create-btn"
                  disabled={isCreatingKeys}
                >
                  {isCreatingKeys ? (
                    <span>Đang khởi tạo mã Key...</span>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Xác nhận tạo mã Key</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


export default AdminCourseDetailPage;
