import {
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  KeyRound,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '../../context/toastService';
import {
  adminService,
  type AdminActivationKeyItem,
  type AdminAllActivationKeysResponse,
} from '../../services/admin.service';
import { CustomSelect, type CustomSelectOption } from '../../components/common/CustomSelect';
import './adminActivationKeys.css';

const KEY_STATUS_OPTIONS: CustomSelectOption[] = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  {
    value: 'ACTIVE',
    label: 'Chưa dùng (Còn hạn)',
    icon: <CheckCircle2 size={14} style={{ color: '#10b981' }} />,
  },
  {
    value: 'USED',
    label: 'Đã kích hoạt',
    icon: <KeyRound size={14} style={{ color: '#3b82f6' }} />,
  },
  {
    value: 'EXPIRED',
    label: 'Đã hết hạn',
    icon: <Clock size={14} style={{ color: '#f59e0b' }} />,
  },
];

const formatDateTime = (dateString?: string | null): string => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

export const AdminActivationKeysPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryCourseId = searchParams.get('courseId');

  const [data, setData] = useState<AdminAllActivationKeysResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Bộ lọc
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>(
    () => queryCourseId || 'ALL',
  );
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Copy state
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Modal tạo key
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [modalCourseId, setModalCourseId] = useState<string>(
    () => queryCourseId || '',
  );
  const [selectedHours, setSelectedHours] = useState<number>(72);
  const [customHours, setCustomHours] = useState<string>('');
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Tải danh sách key từ backend khi mount
  useEffect(() => {
    let isMounted = true;
    adminService
      .getAllActivationKeys()
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        if (res.courses.length > 0) {
          setModalCourseId(res.courses[0].id);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách mã kích hoạt.';
        toast.error(msg);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

  return () => {
      isMounted = false;
    };
  }, []);

  // Làm mới dữ liệu khi người dùng tạo hoặc xóa key
  const refreshData = useCallback(async () => {
    try {
      const res = await adminService.getAllActivationKeys();
      setData(res);
      if (res.courses.length > 0) {
        setModalCourseId((prev) => prev || res.courses[0].id);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách mã kích hoạt.';
      toast.error(msg);
    }
  }, []);

  const coursesList = data?.courses;
  const courseOptions = useMemo<CustomSelectOption[]>(() => {
    const defaultOption: CustomSelectOption = {
      value: 'ALL',
      label: 'Tất cả khóa học',
      icon: <BookOpen size={14} />,
    };
    if (!coursesList) return [defaultOption];
    return [
      defaultOption,
      ...coursesList.map((c) => ({
        value: c.id,
        label: c.title,
      })),
    ];
  }, [coursesList]);

  const allKeys = data?.keys;

  // Lọc dữ liệu keys tức thì theo từ khóa, khóa học và trạng thái
  const filteredKeys = useMemo<Array<AdminActivationKeyItem & { courseTitle: string }>>(() => {
    if (!allKeys) return [];
    const keyword = searchKeyword.trim().toLowerCase();

    return allKeys.filter((k: AdminActivationKeyItem & { courseTitle: string }) => {
      // 1. Lọc theo khóa học
      if (selectedCourseFilter !== 'ALL' && k.courseId !== selectedCourseFilter) {
        return false;
      }

      // 2. Lọc theo trạng thái
      if (selectedStatusFilter !== 'ALL' && k.status !== selectedStatusFilter) {
        return false;
      }

      // 3. Tìm kiếm theo mã key, tên học sinh, email hoặc tên khóa học
      if (keyword) {
        const matchKey = k.key.toLowerCase().includes(keyword);
        const matchStudent =
          Boolean(k.usedBy?.fullName && k.usedBy.fullName.toLowerCase().includes(keyword)) ||
          Boolean(k.usedBy?.email && k.usedBy.email.toLowerCase().includes(keyword));
        const matchCourse = k.courseTitle.toLowerCase().includes(keyword);
        return matchKey || matchStudent || matchCourse;
      }

      return true;
    });
  }, [allKeys, searchKeyword, selectedCourseFilter, selectedStatusFilter]);

  // Sao chép 1 key
  const handleCopyKey = useCallback((keyCode: string, keyId: string) => {
    navigator.clipboard
      .writeText(keyCode)
      .then(() => {
        setCopiedKeyId(keyId);
        toast.success(`Đã sao chép: ${keyCode}`);
        setTimeout(() => setCopiedKeyId(null), 2000);
      })
      .catch(() => {
        toast.info(`Mã: ${keyCode}`);
      });
  }, []);


  // Xóa key chưa dùng
  const handleDeleteKey = useCallback(async (keyId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mã key này không?')) return;
    try {
      await adminService.deleteActivationKey(keyId);
      toast.success('Đã xóa mã key thành công.');
      refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa mã key.';
      toast.error(msg);
    }
  }, [refreshData]);

  // Mở modal tạo key
  const handleOpenCreateModal = useCallback((preselectedCourseId?: string) => {
    if (preselectedCourseId && preselectedCourseId !== 'ALL') {
      setModalCourseId(preselectedCourseId);
    } else if (data?.courses && data.courses.length > 0) {
      setModalCourseId(data.courses[0].id);
    }
    setSelectedHours(72);
    setIsCustomDuration(false);
    setCustomHours('');
    setIsCreateModalOpen(true);
  }, [data]);

  // Xác nhận tạo mã Key
  const handleCreateKeys = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCourseId) {
      toast.error('Vui lòng chọn khóa học để tạo mã key.');
      return;
    }

    let hours = selectedHours;
    if (isCustomDuration) {
      const parsed = parseInt(customHours, 10);
      if (isNaN(parsed) || parsed <= 0) {
        toast.error('Vui lòng nhập số giờ hợp lệ (lớn hơn 0).');
        return;
      }
      hours = parsed;
    }

    setIsCreating(true);
    try {
      const res = await adminService.createCourseActivationKeys(modalCourseId, {
        expiresInHours: hours,
        quantity: 1,
      });

      toast.success(res.message || 'Đã tạo mã key thành công!');
      setIsCreateModalOpen(false);
      refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo mã key.';
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  }, [modalCourseId, selectedHours, isCustomDuration, customHours, refreshData]);

  return (
    <div className="tku-keys-page">
      <div className="tku-keys-content">
        {/* Banner đầu trang */}
        <div className="tku-keys-page-banner">
          <div className="tku-keys-page-banner__content">
            <h1 className="tku-keys-page-banner__title">
              Quản lý mã kích hoạt khóa học
            </h1>
            <p className="tku-keys-page-banner__desc">
              Khởi tạo và quản trị các mã key tham gia khóa học dùng một lần,
              thiết lập thời hạn hiệu lực tự động và kiểm soát học sinh đã kích
              hoạt.
            </p>
          </div>
          <button
            type="button"
            className="tku-keys-page-banner__btn"
            onClick={() => handleOpenCreateModal(selectedCourseFilter)}
          >
            <Plus size={18} />
            <span>Tạo mã Key mới</span>
          </button>
        </div>

        {/* 4 Thẻ thống kê */}
        <div className="tku-keys-stats-grid">
          <div className="tku-keys-stat-card">
            <div className="tku-keys-stat-card__icon tku-keys-stat-card__icon--blue">
              <KeyRound size={22} />
            </div>
            <div className="tku-keys-stat-card__body">
              <span className="tku-keys-stat-card__label">Tổng số mã key</span>
              <span className="tku-keys-stat-card__value">
                {data?.stats?.totalKeys ?? 0}
              </span>
            </div>
          </div>

          <div className="tku-keys-stat-card">
            <div className="tku-keys-stat-card__icon tku-keys-stat-card__icon--emerald">
              <CheckCircle2 size={22} />
            </div>
            <div className="tku-keys-stat-card__body">
              <span className="tku-keys-stat-card__label">Chưa dùng (Còn hạn)</span>
              <span className="tku-keys-stat-card__value">
                {data?.stats?.activeCount ?? 0}
              </span>
            </div>
          </div>

          <div className="tku-keys-stat-card">
            <div className="tku-keys-stat-card__icon tku-keys-stat-card__icon--purple">
              <UserCheck size={22} />
            </div>
            <div className="tku-keys-stat-card__body">
              <span className="tku-keys-stat-card__label">Đã kích hoạt</span>
              <span className="tku-keys-stat-card__value">
                {data?.stats?.usedCount ?? 0}
              </span>
            </div>
          </div>

          <div className="tku-keys-stat-card">
            <div className="tku-keys-stat-card__icon tku-keys-stat-card__icon--amber">
              <Clock size={22} />
            </div>
            <div className="tku-keys-stat-card__body">
              <span className="tku-keys-stat-card__label">Đã hết hạn</span>
              <span className="tku-keys-stat-card__value">
                {data?.stats?.expiredCount ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Thanh công cụ tìm kiếm và lọc */}
        <div className="tku-keys-filter-bar">
          <div className="tku-keys-search-wrap">
            <Search size={18} className="tku-keys-search-icon" />
            <input
              type="text"
              className="tku-keys-search-input"
              placeholder="Tìm theo mã key hoặc tên học sinh..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            {searchKeyword && (
              <button
                type="button"
                className="tku-keys-search-clear"
                onClick={() => setSearchKeyword('')}
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Lọc theo khóa học */}
          <CustomSelect
            value={selectedCourseFilter}
            onChange={setSelectedCourseFilter}
            options={courseOptions}
            icon={<BookOpen size={14} />}
            ariaLabel="Lọc theo khóa học"
            defaultValue="ALL"
            className="tku-keys-custom-select"
          />

          {/* Lọc theo trạng thái */}
          <CustomSelect
            value={selectedStatusFilter}
            onChange={setSelectedStatusFilter}
            options={KEY_STATUS_OPTIONS}
            icon={<CheckCircle2 size={14} />}
            ariaLabel="Lọc theo trạng thái"
            defaultValue="ALL"
            className="tku-keys-custom-select"
          />

        </div>

        {/* Danh sách mã Key */}
        <div className="tku-keys-table-card">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '56px 20px', color: '#64748b' }}>
              <RotateCw
                size={28}
                className="tku-admin-spinner"
                style={{ margin: '0 auto 12px', display: 'block', color: '#1d68f2' }}
              />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                Đang tải dữ liệu mã kích hoạt...
              </span>
            </div>
          ) : !data || filteredKeys.length === 0 ? (
            <div className="tku-keys-empty-box">
              <div className="tku-keys-empty-icon">
                <KeyRound size={28} />
              </div>
              <h3 className="tku-keys-empty-title">
                {searchKeyword ||
                selectedCourseFilter !== 'ALL' ||
                selectedStatusFilter !== 'ALL'
                  ? 'Không tìm thấy mã key phù hợp với bộ lọc'
                  : 'Chưa có mã key nào trên hệ thống'}
              </h3>
              <p className="tku-keys-empty-desc">
                {searchKeyword ||
                selectedCourseFilter !== 'ALL' ||
                selectedStatusFilter !== 'ALL'
                  ? 'Hãy thử điều chỉnh lại từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc trạng thái.'
                  : 'Hãy bấm nút "Tạo mã Key mới" ở trên để khởi tạo mã tham gia khóa học gửi cho học sinh.'}
              </p>
            </div>
          ) : (
            <div className="tku-keys-table-responsive">
              <table className="tku-keys-main-table">
                <thead>
                  <tr>
                    <th>Mã Key kích hoạt</th>
                    <th>Khóa học áp dụng</th>
                    <th>Thời hạn hiệu lực</th>
                    <th>Trạng thái</th>
                    <th>Học sinh kích hoạt</th>
                    <th>Ngày tạo</th>
                    <th style={{ textAlign: 'center', width: '60px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeys.map((keyItem: AdminActivationKeyItem & { courseTitle: string }) => (
                    <tr key={keyItem.id}>
                      {/* Mã Key */}
                      <td>
                        <div className="tku-key-code-box">
                          <span className="tku-key-code-str">{keyItem.key}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyKey(keyItem.key, keyItem.id)}
                            className={`tku-key-copy-icon-btn ${
                              copiedKeyId === keyItem.id
                                ? 'tku-key-copy-icon-btn--copied'
                                : ''
                            }`}
                            title="Sao chép mã"
                          >
                            {copiedKeyId === keyItem.id ? (
                              <Check size={13} />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Khóa học */}
                      <td>
                        <div className="tku-key-course-badge" title={keyItem.courseTitle}>
                          <BookOpen size={15} style={{ color: '#1d68f2', flexShrink: 0 }} />
                          <span>{keyItem.courseTitle}</span>
                        </div>
                      </td>

                      {/* Thời hạn hiệu lực */}
                      <td>
                        <div className="tku-key-expiry-cell">
                          <span className="tku-key-expiry-date">
                            {formatDateTime(keyItem.expiresAt)}
                          </span>
                          <span
                            className={`tku-key-expiry-countdown ${
                              keyItem.status === 'EXPIRED'
                                ? 'tku-key-expiry-countdown--expired'
                                : keyItem.status === 'USED'
                                  ? 'tku-key-expiry-countdown--used'
                                  : 'tku-key-expiry-countdown--active'
                            }`}
                          >
                            {formatTimeRemaining(keyItem.expiresAt, keyItem.status)}
                          </span>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td>
                        {keyItem.status === 'ACTIVE' && (
                          <span className="tku-key-badge tku-key-badge--active">
                            <span className="tku-key-badge__dot" />
                            <span>Chưa dùng</span>
                          </span>
                        )}
                        {keyItem.status === 'USED' && (
                          <span className="tku-key-badge tku-key-badge--used">
                            <span className="tku-key-badge__dot" />
                            <span>Đã kích hoạt</span>
                          </span>
                        )}
                        {keyItem.status === 'EXPIRED' && (
                          <span className="tku-key-badge tku-key-badge--expired">
                            <span className="tku-key-badge__dot" />
                            <span>Đã hết hạn</span>
                          </span>
                        )}
                      </td>

                      {/* Học sinh kích hoạt */}
                      <td>
                        {keyItem.usedBy ? (
                          <div className="tku-key-user-info">
                            <div className="tku-key-user-avatar-circle">
                              {keyItem.usedBy.fullName.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="tku-key-user-text">
                              <span className="tku-key-user-name">
                                {keyItem.usedBy.fullName}
                              </span>
                              <span className="tku-key-user-email">
                                {keyItem.usedBy.email}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12.5px' }}>
                            Chưa có
                          </span>
                        )}
                      </td>

                      {/* Ngày tạo */}
                      <td style={{ color: '#64748b', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                        {formatDateTime(keyItem.createdAt)}
                      </td>

                      {/* Thao tác */}
                      <td style={{ textAlign: 'center' }}>
                        {keyItem.status !== 'USED' ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteKey(keyItem.id)}
                            className="tku-key-delete-action"
                            title="Xóa mã key này"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <span
                            style={{
                              color: '#cbd5e1',
                              fontSize: '11px',
                              userSelect: 'none',
                            }}
                            title="Key đã được sử dụng nên không thể xóa"
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

      {/* MODAL TẠO MÃ KEY MỚI */}
      {isCreateModalOpen && (
        <div
          className="tku-keys-create-modal-backdrop"
          onClick={() => !isCreating && setIsCreateModalOpen(false)}
        >
          <div
            className="tku-keys-create-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tku-keys-modal-head">
              <h3 className="tku-keys-modal-head-title">
                <KeyRound size={20} style={{ color: '#1d68f2' }} />
                <span>Khởi tạo mã Key kích hoạt (Dùng 1 lần)</span>
              </h3>
              <button
                type="button"
                className="tku-keys-modal-close-btn"
                onClick={() => !isCreating && setIsCreateModalOpen(false)}
                disabled={isCreating}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateKeys}>
              <div className="tku-keys-modal-body">
                {/* 1. Chọn khóa học */}
                <div className="tku-keys-form-group">
                  <label className="tku-keys-form-label">
                    Khóa học áp dụng mã key:
                  </label>
                  <select
                    className="tku-keys-form-select"
                    value={modalCourseId}
                    onChange={(e) => setModalCourseId(e.target.value)}
                    required
                  >
                    {data?.courses?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Chọn thời hạn hiệu lực */}
                <div className="tku-keys-form-group">
                  <label className="tku-keys-form-label">
                    Thời hạn hiệu lực của Key (Tự động hết hạn):
                  </label>
                  <div className="tku-keys-pills-grid">
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
                        className={`tku-keys-pill-btn ${
                          !isCustomDuration && selectedHours === opt.hours
                            ? 'tku-keys-pill-btn--active'
                            : ''
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIsCustomDuration(true)}
                      className={`tku-keys-pill-btn ${
                        isCustomDuration ? 'tku-keys-pill-btn--active' : ''
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
                        className="tku-keys-input"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="tku-keys-modal-foot">
                <button
                  type="button"
                  className="tku-keys-btn-cancel"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreating}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="tku-keys-btn-submit"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <RotateCw size={15} className="tku-admin-spinner" />
                      <span>Đang khởi tạo mã Key...</span>
                    </>
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

export default AdminActivationKeysPage;
