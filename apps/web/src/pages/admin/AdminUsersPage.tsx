import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  RotateCw,
  AlertCircle,
  Users,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Unlock,
  Mail,
  Calendar,
  Eye,
  UserPlus,
  Phone,
} from 'lucide-react';
import {
  adminService,
  type AdminUserItem,
  type AdminUsersResponse,
} from '../../services/admin.service';
import { toast } from '../../context/toastService';
import { CustomSelect, type CustomSelectOption } from '../../components/common/CustomSelect';
import './adminUsers.css';

const ROLE_OPTIONS: CustomSelectOption[] = [
  { value: 'ALL', label: 'Tất cả vai trò' },
  { value: 'STUDENT', label: 'Học sinh', icon: <GraduationCap size={14} /> },
  { value: 'TEACHER', label: 'Giảng viên', icon: <BookOpen size={14} /> },
];

const STATUS_OPTIONS: CustomSelectOption[] = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  {
    value: 'ACTIVE',
    label: 'Đang hoạt động',
    icon: <CheckCircle2 size={14} style={{ color: '#10b981' }} />,
  },
  {
    value: 'SUSPENDED',
    label: 'Tạm khóa',
    icon: <Lock size={14} style={{ color: '#ef4444' }} />,
  },
];

const UserAvatar: React.FC<{
  fullName: string;
  avatarUrl?: string | null;
  role: string;
}> = React.memo(({ fullName, avatarUrl, role }) => {
  const [hasError, setHasError] = useState(false);

  const initials = useMemo(() => {
    if (!fullName) return 'U';
    const words = fullName.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  }, [fullName]);

  const avatarRoleClass =
    role === 'TEACHER'
      ? 'tku-user-avatar--teacher'
      : role === 'ADMIN'
      ? 'tku-user-avatar--admin'
      : 'tku-user-avatar--student';

  return (
    <div className={`tku-user-avatar ${avatarRoleClass}`}>
      {avatarUrl && !hasError ? (
        <img
          src={avatarUrl}
          alt={fullName}
          className="tku-user-avatar-img"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
});
UserAvatar.displayName = 'UserAvatar';

export const AdminUsersPage: React.FC = () => {
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  const navigate = useNavigate();

  const handleRoleFilterChange = useCallback((val: string) => {
    setRoleFilter(val);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    adminService
      .getUsersList()
      .then((res) => {
        if (isMounted) {
          setData(res);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không thể tải danh sách người dùng.',
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
  }, []);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    adminService
      .getUsersList()
      .then((res) => {
        setData(res);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách người dùng.',
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const usersList = data?.users;
  const filteredUsers = useMemo(() => {
    if (!usersList) return [];
    const query = searchKeyword.trim().toLowerCase();

    return usersList.filter((u: AdminUserItem) => {
      if (u.role === 'ADMIN') return false;
      const matchKeyword =
        !query ||
        u.fullName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (Boolean(u.phoneNumber) && u.phoneNumber!.includes(query));

      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;

      return matchKeyword && matchRole && matchStatus;
    });
  }, [usersList, searchKeyword, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const startIndex = (activePage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, activePage, pageSize]);

  const handleToggleStatus = useCallback(async (user: AdminUserItem) => {
    const nextStatus: 'ACTIVE' | 'SUSPENDED' =
      user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setTogglingUserId(user.id);

    try {
      const updatedUser = await adminService.updateUserStatus(user.id, nextStatus);

      setData((prev) => {
        if (!prev) return prev;
        const updatedUsers = prev.users.map((item) =>
          item.id === user.id ? updatedUser : item,
        );
        const activeCount = updatedUsers.filter((u) => u.status === 'ACTIVE' && u.role !== 'ADMIN').length;
        const suspendedCount = updatedUsers.filter((u) => u.status === 'SUSPENDED' && u.role !== 'ADMIN').length;

        return {
          ...prev,
          stats: {
            ...prev.stats,
            activeUsers: activeCount,
            suspendedUsers: suspendedCount,
          },
          users: updatedUsers,
        };
      });

      toast.success(
        nextStatus === 'ACTIVE'
          ? `Đã mở khóa tài khoản của ${user.fullName}.`
          : `Đã tạm khóa tài khoản của ${user.fullName}.`,
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật trạng thái người dùng.',
      );
    } finally {
      setTogglingUserId(null);
    }
  }, []);

  const studentCount = data?.stats.studentCount ?? 0;
  const teacherCount = data?.stats.teacherCount ?? 0;
  const totalUsers = studentCount + teacherCount;
  const activeUsers = data?.stats.activeUsers ?? 0;

  const totalInDb = usersList ? usersList.length : 0;

  return (
    <div className="tku-users-page">
      <header className="tku-admin-header">
        <div className="tku-admin-header__titles">
          <h1 className="tku-admin-header__title">Quản lý người dùng</h1>
          <p className="tku-admin-header__subtitle">
            Xem danh sách, phân quyền và kiểm soát trạng thái tài khoản trên hệ thống.
          </p>
        </div>
      </header>

      <div className="tku-users-content">
        {isLoading ? (
          <div className="tku-admin-loading-wrapper">
            <div className="tku-admin-spinner" />
            <span>Đang tải danh sách người dùng...</span>
          </div>
        ) : error ? (
          <div className="tku-users-card">
            <div className="tku-users-empty">
              <div
                className="tku-users-empty__icon"
                style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
              >
                <AlertCircle size={28} />
              </div>
              <h3 className="tku-users-empty__title">Không thể tải dữ liệu</h3>
              <p className="tku-users-empty__desc">{error}</p>
              <button
                type="button"
                className="tku-users-empty__btn"
                onClick={handleRetry}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <RotateCw size={15} />
                <span>Thử lại</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <section className="tku-users-banner">
              <div className="tku-users-banner__content">
                <h2 className="tku-users-banner__title">
                  Quản lý tài khoản người dùng
                </h2>
                <p className="tku-users-banner__desc">
                  Theo dõi danh sách học sinh và giảng viên trong nền tảng học tập TKU.
                </p>
              </div>
            </section>

            <div className="tku-users-stats-grid">
              <div className="tku-users-stat-card">
                <div className="tku-users-stat-card__icon tku-users-stat-card__icon--blue">
                  <Users size={22} />
                </div>
                <div className="tku-users-stat-card__info">
                  <span className="tku-users-stat-card__label">Tổng người dùng</span>
                  <span className="tku-users-stat-card__value">
                    {totalUsers.toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              <div className="tku-users-stat-card">
                <div className="tku-users-stat-card__icon tku-users-stat-card__icon--cyan">
                  <GraduationCap size={22} />
                </div>
                <div className="tku-users-stat-card__info">
                  <span className="tku-users-stat-card__label">Học sinh</span>
                  <span className="tku-users-stat-card__value">
                    {studentCount.toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              <div className="tku-users-stat-card">
                <div className="tku-users-stat-card__icon tku-users-stat-card__icon--purple">
                  <BookOpen size={22} />
                </div>
                <div className="tku-users-stat-card__info">
                  <span className="tku-users-stat-card__label">Giảng viên</span>
                  <span className="tku-users-stat-card__value">
                    {teacherCount.toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              <div className="tku-users-stat-card">
                <div className="tku-users-stat-card__icon tku-users-stat-card__icon--emerald">
                  <CheckCircle2 size={22} />
                </div>
                <div className="tku-users-stat-card__info">
                  <span className="tku-users-stat-card__label">Đang hoạt động</span>
                  <span className="tku-users-stat-card__value">
                    {activeUsers.toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="tku-users-filter-bar">
              <div className="tku-users-search-wrap">
                <Search size={16} className="tku-users-search-icon" />
                <input
                  type="text"
                  className="tku-users-search-input"
                  placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                {searchKeyword && (
                  <button
                    type="button"
                    className="tku-users-search-clear"
                    onClick={() => {
                      setSearchKeyword('');
                      setCurrentPage(1);
                    }}
                    title="Xóa tìm kiếm"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <CustomSelect
                value={roleFilter}
                onChange={handleRoleFilterChange}
                options={ROLE_OPTIONS}
                icon={<Users size={14} />}
                ariaLabel="Lọc theo vai trò người dùng"
                defaultValue="ALL"
                className="tku-users-custom-select"
              />

              <CustomSelect
                value={statusFilter}
                onChange={handleStatusFilterChange}
                options={STATUS_OPTIONS}
                icon={<CheckCircle2 size={14} />}
                ariaLabel="Lọc theo trạng thái tài khoản"
                defaultValue="ALL"
                className="tku-users-custom-select"
              />

              <button
                type="button"
                className="tku-users-add-btn"
                onClick={() => navigate('/admin/users/create')}
              >
                <UserPlus size={16} />
                <span>Thêm tài khoản</span>
              </button>
            </div>

            <div className="tku-users-card">
              {totalInDb === 0 ? (
                <div className="tku-users-empty">
                  <div className="tku-users-empty__icon">
                    <Users size={28} />
                  </div>
                  <h3 className="tku-users-empty__title">
                    Chưa có người dùng nào trên hệ thống
                  </h3>
                  <p className="tku-users-empty__desc">
                    Hệ thống chưa ghi nhận tài khoản nào trong cơ sở dữ liệu.
                  </p>
                  <button
                    type="button"
                    className="tku-users-empty__btn"
                    onClick={() => navigate('/admin/users/create')}
                  >
                    Thêm tài khoản mới
                  </button>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="tku-users-empty">
                  <div className="tku-users-empty__icon">
                    <Search size={28} />
                  </div>
                  <h3 className="tku-users-empty__title">
                    Không tìm thấy người dùng phù hợp
                  </h3>
                  <p className="tku-users-empty__desc">
                    Không có tài khoản nào khớp với từ khóa tìm kiếm hoặc các điều kiện lọc hiện tại.
                  </p>
                </div>
              ) : (
                <div className="tku-users-table-wrap">
                  <table className="tku-users-table">
                    <thead>
                      <tr>
                        <th>Người dùng</th>
                        <th>Vai trò</th>
                        <th>Số điện thoại</th>
                        <th>Ngày sinh</th>
                        <th>Ngày tham gia</th>
                        <th style={{ textAlign: 'right' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map((u) => {
                        return (
                          <tr
                            key={u.id}
                            className={u.status === 'SUSPENDED' ? 'tku-users-row--suspended' : ''}
                          >
                            <td>
                              <div
                                className="tku-user-cell"
                                style={{ cursor: 'pointer' }}
                                onClick={() => navigate(`/admin/users/${u.id}`)}
                                title="Xem chi tiết người dùng"
                              >
                                <UserAvatar
                                  fullName={u.fullName}
                                  avatarUrl={u.avatarUrl}
                                  role={u.role}
                                />
                                <div className="tku-user-info">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="tku-user-name">{u.fullName}</span>
                                    {u.status === 'SUSPENDED' && (
                                      <span
                                        className="tku-status-badge tku-status-badge--suspended"
                                        style={{ padding: '1px 6px', fontSize: '10.5px' }}
                                      >
                                        Tạm khóa
                                      </span>
                                    )}
                                  </div>
                                  <span className="tku-user-email">
                                    <Mail size={12} />
                                    {u.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td>
                              {u.role === 'STUDENT' ? (
                                <span className="tku-role-badge tku-role-badge--student">
                                  <GraduationCap size={13} />
                                  <span>{u.roleText}</span>
                                </span>
                              ) : u.role === 'TEACHER' ? (
                                <span className="tku-role-badge tku-role-badge--teacher">
                                  <BookOpen size={13} />
                                  <span>{u.roleText}</span>
                                </span>
                              ) : (
                                <span className="tku-role-badge tku-role-badge--admin">
                                  <ShieldCheck size={13} />
                                  <span>{u.roleText}</span>
                                </span>
                              )}
                            </td>

                            <td>
                              {u.phoneNumber ? (
                                <span className="tku-user-phone-cell">
                                  <Phone size={13} className="tku-user-meta-icon" />
                                  <span>{u.phoneNumber}</span>
                                </span>
                              ) : (
                                <span className="tku-user-empty-val">—</span>
                              )}
                            </td>

                            <td>
                              {u.formattedDateOfBirth ? (
                                <span className="tku-user-dob-cell">
                                  <Calendar size={13} className="tku-user-meta-icon" />
                                  <span>{u.formattedDateOfBirth}</span>
                                </span>
                              ) : (
                                <span className="tku-user-empty-val">—</span>
                              )}
                            </td>

                            <td>
                              <div className="tku-user-date-cell">
                                <span className="tku-user-date-main">{u.formattedCreatedAt}</span>
                                <span className="tku-user-date-sub">{u.timeAgo}</span>
                              </div>
                            </td>

                            <td>
                              <div className="tku-users-actions">
                                <button
                                  type="button"
                                  className={`tku-users-action-btn ${
                                    u.status === 'ACTIVE'
                                      ? 'tku-users-action-btn--lock'
                                      : 'tku-users-action-btn--unlock'
                                  }`}
                                  title={
                                    u.status === 'ACTIVE'
                                      ? 'Tạm khóa tài khoản'
                                      : 'Mở khóa tài khoản'
                                  }
                                  onClick={() => handleToggleStatus(u)}
                                  disabled={togglingUserId === u.id}
                                >
                                  {u.status === 'ACTIVE' ? (
                                    <Lock size={15} />
                                  ) : (
                                    <Unlock size={15} />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  className="tku-users-action-btn"
                                  title="Xem chi tiết người dùng"
                                  onClick={() => navigate(`/admin/users/${u.id}`)}
                                >
                                  <Eye size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredUsers.length > 0 && (
                    <div className="tku-users-pagination">
                      <div className="tku-users-pagination__info">
                        <Users size={14} className="tku-users-pagination__info-icon" />
                        <span>Hiển thị</span>
                        <span className="tku-users-pagination__info-badge">
                          {(activePage - 1) * pageSize + 1} – {Math.min(filteredUsers.length, activePage * pageSize)}
                        </span>
                        <span>trong</span>
                        <span className="tku-users-pagination__info-total">
                          {filteredUsers.length}
                        </span>
                        <span>người dùng</span>
                      </div>
                      {totalPages > 1 && (
                        <div className="tku-users-pagination__buttons">
                          <button
                            type="button"
                            className="tku-users-pagination__btn"
                            disabled={activePage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          >
                            Trước
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((page) => {
                              return (
                                page === 1 ||
                                page === totalPages ||
                                Math.abs(page - activePage) <= 1
                              );
                            })
                            .map((page, idx, arr) => {
                              const prev = arr[idx - 1];
                              const hasGap = prev && page - prev > 1;
                              return (
                                <React.Fragment key={page}>
                                  {hasGap && (
                                    <span className="tku-users-pagination__ellipsis">...</span>
                                  )}
                                  <button
                                    type="button"
                                    className={`tku-users-pagination__page ${
                                      activePage === page
                                        ? 'tku-users-pagination__page--active'
                                        : ''
                                    }`}
                                    onClick={() => setCurrentPage(page)}
                                  >
                                    {page}
                                  </button>
                                </React.Fragment>
                              );
                            })}
                          <button
                            type="button"
                            className="tku-users-pagination__btn"
                            disabled={activePage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          >
                            Sau
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
