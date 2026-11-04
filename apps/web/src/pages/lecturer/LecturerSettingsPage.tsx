import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Camera,
  ChevronRight,
  GraduationCap,
  Eye,
  EyeOff,
  Check,
  X,
  Award,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { authService } from '../../services/auth.service';
import type { User } from '../../types/auth.types';
import './lecturerSettings.css';

const DEFAULT_AVATAR = '/assets/default-avatar.jpg';

// =============================================================================
// SUB-COMPONENT: THÔNG TIN GIẢNG VIÊN (TAB 1)
// Tách component độc lập có key đồng bộ để tránh setState trong effect
// =============================================================================
interface LecturerInfoTabProps {
  user: User;
  onSaveSuccess: (updated: User) => void;
}

const LecturerInfoTab: React.FC<LecturerInfoTabProps> = ({ user, onSaveSuccess }) => {
  const { toast } = useToast();

  const initialDob = useMemo(() => {
    if (!user.dateOfBirth) return '';
    const dobStr =
      typeof user.dateOfBirth === 'string'
        ? user.dateOfBirth
        : user.dateOfBirth instanceof Date
        ? user.dateOfBirth.toISOString()
        : '';
    return dobStr ? dobStr.split('T')[0] : '';
  }, [user]);

  const [fullName, setFullName] = useState(user.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
  const [dateOfBirth, setDateOfBirth] = useState(initialDob);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  const hasInfoChanged = useMemo(() => {
    const origFullName = user.fullName || '';
    const origPhone = user.phoneNumber || '';
    return (
      fullName.trim() !== origFullName.trim() ||
      phoneNumber.trim() !== origPhone.trim() ||
      dateOfBirth !== initialDob
    );
  }, [user, fullName, phoneNumber, dateOfBirth, initialDob]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setInfoError('Họ và tên giảng viên không được để trống.');
      return;
    }

    const trimmedPhone = phoneNumber.trim();
    if (trimmedPhone) {
      const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
      const simplePhoneRegex = /^[0-9]{9,11}$/;
      if (!phoneRegex.test(trimmedPhone) && !simplePhoneRegex.test(trimmedPhone)) {
        setInfoError('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại gồm 10 chữ số.');
        return;
      }
    }

    try {
      setIsSavingInfo(true);
      const updatedUser = await authService.updateProfile({
        fullName: trimmedName,
        phoneNumber: trimmedPhone || undefined,
        dateOfBirth: dateOfBirth || undefined,
      });

      onSaveSuccess(updatedUser);
      toast.success('Cập nhật thông tin giảng viên thành công!');
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Không thể lưu thay đổi. Vui lòng thử lại.';
      setInfoError(msg);
      toast.error(msg);
    } finally {
      setIsSavingInfo(false);
    }
  };

  return (
    <div>
      <div className="tku-profile-panel-header">
        <div className="tku-profile-panel-header__left">
          <div className="tku-profile-panel-header__icon-box">
            <UserIcon size={24} />
          </div>
          <div>
            <h2 className="tku-profile-panel-header__title">Hồ sơ giảng viên</h2>
            <p className="tku-profile-panel-header__subtitle">
              Cập nhật thông tin định danh và hồ sơ sư phạm hiển thị trên hệ sinh thái học tập TKU.
            </p>
          </div>
        </div>
      </div>

      {/* Thông báo gợi ý học thuật */}
      <div className="tku-profile-notice-box">
        <div>
          Họ tên và ảnh đại diện của bạn sẽ hiển thị công khai tới học viên trong danh sách bài học,
          kết quả kiểm tra và không gian thảo luận trực tuyến.
        </div>
      </div>

      {infoError && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '10px',
            color: '#b91c1c',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '22px',
          }}
        >
          <AlertCircle size={18} />
          <span>{infoError}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="tku-profile-form">
        {/* Section 1: Định danh */}
        <div>
          <div className="tku-profile-section-title">
            <span>1. Định danh giảng viên</span>
          </div>

          <div className="tku-profile-form-grid">
            {/* Full Name */}
            <div className="tku-form-group tku-form-group--full">
              <label className="tku-form-label" htmlFor="lecturer-fullName">
                <span>Họ và tên giảng viên</span>
                <span className="tku-form-required">*</span>
              </label>
              <div className="tku-input-wrapper">
                <UserIcon size={18} className="tku-input-prefix-icon" />
                <input
                  id="lecturer-fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên đầy đủ của giảng viên"
                  required
                  className="tku-profile-input"
                />
              </div>
            </div>

            {/* Email (Read-only) */}
            <div className="tku-form-group tku-form-group--full">
              <label className="tku-form-label" htmlFor="lecturer-email">
                <span>Email đăng nhập học vụ</span>
              </label>
              <div className="tku-input-wrapper">
                <Mail size={18} className="tku-input-prefix-icon" />
                <input
                  id="lecturer-email"
                  type="email"
                  value={user.email}
                  readOnly
                  disabled
                  className="tku-profile-input"
                />
              </div>
              <div className="tku-form-hint--locked">
                <Lock size={12} />
                <span>
                  Email là định danh duy nhất của tài khoản giảng viên để quản trị bài học và phân
                  quyền học vụ.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Thông tin liên hệ & Năm sinh */}
        <div>
          <div className="tku-profile-section-title">
            <span>2. Thông tin liên hệ & Ngày sinh</span>
          </div>

          <div className="tku-profile-form-grid">
            {/* Phone Number */}
            <div className="tku-form-group">
              <label className="tku-form-label" htmlFor="lecturer-phone">
                <span>Số điện thoại liên hệ</span>
              </label>
              <div className="tku-input-wrapper">
                <Phone size={18} className="tku-input-prefix-icon" />
                <input
                  id="lecturer-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ví dụ: 0912345678"
                  className="tku-profile-input"
                />
              </div>
              <span className="tku-form-hint">Dùng để nhận thông báo công việc hoặc xác thực khi cần.</span>
            </div>

            {/* Date of Birth */}
            <div className="tku-form-group">
              <label className="tku-form-label" htmlFor="lecturer-dob">
                <span>Ngày sinh</span>
              </label>
              <div className="tku-input-wrapper">
                <Calendar size={18} className="tku-input-prefix-icon" />
                <input
                  id="lecturer-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="tku-profile-input"
                />
              </div>
              <span className="tku-form-hint">Ngày tháng năm sinh hiển thị trong hồ sơ học vụ.</span>
            </div>
          </div>
        </div>

        {/* Section 3: Vai trò tài khoản */}
        <div>
          <div className="tku-profile-section-title">
            <span>3. Vai trò tài khoản</span>
          </div>

          <div className="tku-profile-form-grid">
            <div className="tku-form-group tku-form-group--full">
              <label className="tku-form-label">
                <span>Vai trò tài khoản</span>
              </label>
              <div className="tku-input-wrapper">
                <Award size={18} className="tku-input-prefix-icon" />
                <input
                  type="text"
                  value="Giảng viên chuyên môn (Teacher)"
                  readOnly
                  disabled
                  className="tku-profile-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Row */}
        <div className="tku-profile-actions-row">
          <button
            type="submit"
            disabled={!hasInfoChanged || isSavingInfo}
            className="tku-btn-academic-primary"
            title={!hasInfoChanged ? 'Vui lòng thay đổi thông tin để lưu' : 'Lưu thông tin hồ sơ'}
          >
            {isSavingInfo ? (
              <>
                <Loader2 size={16} className="tku-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Lưu thông tin</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT: LecturerSettingsPage
// =============================================================================
export const LecturerSettingsPage: React.FC = () => {
  const { user, isAuthenticated, updateUser } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');

  // Fetch fresh profile on mount to guarantee latest DB data
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;
    authService
      .getProfile()
      .then((freshUser) => {
        if (!isMounted) return;
        updateUser(freshUser);
      })
      .catch(() => {
        // Silently continue with cached user
      });
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, updateUser]);

  // =========================================================================
  // 1. AVATAR UPLOAD STATE & HANDLERS
  // =========================================================================
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarClick = () => {
    if (fileInputRef.current && !isUploadingAvatar) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa cho phép là 5MB.');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const res = await authService.uploadAvatar(file);
      updateUser(res.user);
      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Tải ảnh lên thất bại. Vui lòng thử lại sau.';
      toast.error(msg);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    target.onerror = null;
    if (!target.src.endsWith(DEFAULT_AVATAR)) {
      target.src = DEFAULT_AVATAR;
    }
  };

  // =========================================================================
  // 2. SECURITY & PASSWORD STATE & HANDLERS
  // =========================================================================
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const hasPassword = user?.hasPassword !== false;

  const passwordStrength = useMemo(() => {
    if (!newPassword) {
      return {
        score: 0,
        label: 'Chưa nhập',
        colorClass: '',
        hasLength: false,
        hasUpper: false,
        hasNumber: false,
        hasSpecial: false,
      };
    }

    const hasLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (hasLength) score += 1;
    if (hasUpper && hasLower) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 1;

    let label = 'Yếu';
    let colorClass = 'weak';

    if (score >= 4) {
      label = 'Rất mạnh';
      colorClass = 'strong';
    } else if (score >= 3) {
      label = 'Trung bình';
      colorClass = 'medium';
    }

    return {
      score,
      label,
      colorClass,
      hasLength,
      hasUpper: hasUpper && hasLower,
      hasNumber,
      hasSpecial,
    };
  }, [newPassword]);

  const canSubmitPassword = useMemo(() => {
    if (hasPassword && !currentPassword) return false;
    if (!newPassword || !confirmPassword) return false;
    if (newPassword !== confirmPassword) return false;
    if (newPassword.length < 8) return false;
    return true;
  }, [hasPassword, currentPassword, newPassword, confirmPassword]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (hasPassword && !currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    try {
      setIsChangingPassword(true);
      if (!hasPassword) {
        const res = await authService.setInitialPassword({
          newPassword,
        });
        toast.success(res.message || 'Thiết lập mật khẩu thành công!');
        if (user) {
          updateUser({ ...user, hasPassword: true });
        }
      } else {
        const res = await authService.changePassword({
          currentPassword,
          newPassword,
        });
        toast.success(res.message || 'Cập nhật mật khẩu thành công!');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg =
        (err as Error)?.message ||
        (hasPassword ? 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.' : 'Thiết lập mật khẩu thất bại.');
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="tku-lecturer-settings-page">
        <div className="tku-profile-loading">
          <Loader2 size={36} className="tku-spin" />
          <p>Đang tải thông tin giảng viên...</p>
        </div>
      </div>
    );
  }

  const avatarUrl = user.avatarUrl || DEFAULT_AVATAR;

  return (
    <div className="tku-lecturer-settings-page">
      {/* =====================================================================
          1. ACADEMIC BANNER CHUYÊN NGHIỆP DÀNH CHO GIẢNG VIÊN
          ===================================================================== */}
      <section className="tku-lecturer-settings-banner">
        <div className="tku-lecturer-settings-banner__content">
          <div className="tku-lecturer-settings-banner__pill">
            <GraduationCap size={14} />
            <span>Cổng thông tin & Học vụ Giảng viên TKU</span>
          </div>
          <h1 className="tku-lecturer-settings-banner__title">
            Cài đặt tài khoản & Hồ sơ giảng viên
          </h1>
          <p className="tku-lecturer-settings-banner__desc">
            Quản lý thông tin định danh sư phạm và tối ưu bảo mật tài khoản trên hệ sinh thái học
            tập TKU.
          </p>
        </div>
      </section>

      {/* =====================================================================
          2. NỘI DUNG CHÍNH (2 CỘT ĐỒNG BỘ 100% VỚI HỆ THỐNG PROFILE)
          ===================================================================== */}
      <div className="tku-lecturer-settings-grid">
        {/* Left Column: Lecturer Profile Card & Nav Menu */}
        <aside className="tku-profile-sidebar">
          {/* Identity Card */}
          <div className="tku-profile-identity-card">
            {/* Banner trang trí phía sau avatar */}
            <div className="tku-profile-cover-banner" />

            <div className="tku-profile-identity-body">
              {/* File input ẩn */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/webp,image/jpg"
                style={{ display: 'none' }}
                aria-label="Tải lên ảnh đại diện"
              />

              {/* Avatar tròn nổi bật */}
              <div className="tku-profile-avatar-outer">
                <button
                  type="button"
                  className="tku-profile-avatar-btn"
                  onClick={handleAvatarClick}
                  title="Nhấn để đổi ảnh đại diện"
                >
                  <img
                    src={avatarUrl}
                    alt={user.fullName || 'Ảnh đại diện giảng viên'}
                    className="tku-profile-avatar-img"
                    referrerPolicy="no-referrer"
                    onError={handleAvatarImgError}
                  />

                  {/* Hover Overlay */}
                  <div className="tku-profile-avatar-hover">
                    <Camera size={22} />
                    <span>Đổi ảnh</span>
                  </div>
                </button>

                {/* Camera Floating Button */}
                <button
                  type="button"
                  className="tku-profile-avatar-floating-btn"
                  onClick={handleAvatarClick}
                  title="Tải ảnh mới"
                  aria-label="Tải ảnh mới"
                >
                  <Camera size={15} />
                </button>

                {/* Loading Spinner */}
                {isUploadingAvatar && (
                  <div className="tku-profile-avatar-loading">
                    <Loader2 size={30} className="tku-spin" />
                  </div>
                )}
              </div>

              {/* User Name & Email */}
              <div className="tku-profile-user-name-row">
                <h2 className="tku-profile-user-name">
                  <span>{user.fullName || 'Giảng viên TKU'}</span>
                  <span
                    className="tku-verified-badge-wrap"
                    title="Tài khoản giảng viên đã xác thực"
                  >
                    <CheckCircle2 size={17} className="tku-verified-badge" />
                  </span>
                </h2>
              </div>
              <div className="tku-profile-user-email" title={user.email}>
                <Mail size={13} className="tku-profile-user-email-icon" />
                <span>{user.email}</span>
              </div>

              {/* Badges */}
              <div className="tku-profile-badges-row">
                <span className="tku-badge-pill tku-badge-pill--role">
                  <GraduationCap size={13} />
                  <span>Giảng viên môn học</span>
                </span>
              </div>
            </div>
          </div>

          {/* Menu chuyển tab */}
          <div className="tku-profile-nav-card">
            <button
              type="button"
              className={`tku-profile-nav-item ${activeTab === 'info' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <div className="tku-profile-nav-icon-wrap">
                <UserIcon size={18} />
              </div>
              <span>Thông tin cá nhân</span>
              <ChevronRight size={16} className="tku-profile-nav-chevron" />
            </button>

            <button
              type="button"
              className={`tku-profile-nav-item ${activeTab === 'security' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <div className="tku-profile-nav-icon-wrap">
                <Shield size={18} />
              </div>
              <span>Đổi mật khẩu & Bảo mật</span>
              <ChevronRight size={16} className="tku-profile-nav-chevron" />
            </button>
          </div>
        </aside>

        {/* Right Column: Settings Content Panels */}
        <main className="tku-profile-main-panel">
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === 'info' && (
            <LecturerInfoTab
              key={`${user.id}-${user.fullName}-${user.phoneNumber}-${user.dateOfBirth}`}
              user={user}
              onSaveSuccess={updateUser}
            />
          )}

          {/* TAB 2: ĐỔI MẬT KHẨU & BẢO MẬT */}
          {activeTab === 'security' && (
            <div>
              <div className="tku-profile-panel-header">
                <div className="tku-profile-panel-header__left">
                  <div className="tku-profile-panel-header__icon-box tku-profile-panel-header__icon-box--amber">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h2 className="tku-profile-panel-header__title">
                      {hasPassword ? 'Đổi mật khẩu' : 'Thiết lập mật khẩu tài khoản'}
                    </h2>
                    <p className="tku-profile-panel-header__subtitle">
                      {hasPassword
                        ? 'Bảo vệ an toàn tài khoản giảng viên với mật khẩu mạnh theo tiêu chuẩn an toàn thông tin.'
                        : 'Sau khi thiết lập mật khẩu, bạn có thể đăng nhập linh hoạt bằng cả tài khoản Google hoặc Email & Mật khẩu.'}
                    </p>
                  </div>
                </div>
              </div>

              {passwordError && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: '10px',
                    color: '#b91c1c',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '22px',
                  }}
                >
                  <AlertCircle size={18} />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="tku-profile-form">
                {/* Section 1: Mật khẩu hiện tại */}
                {hasPassword && (
                  <div>
                    <div className="tku-profile-section-title">
                      <span>1. Xác thực tài khoản hiện tại</span>
                    </div>

                    <div className="tku-form-group">
                      <label className="tku-form-label" htmlFor="current-password">
                        <span>Mật khẩu hiện tại</span>
                        <span className="tku-form-required">*</span>
                      </label>
                      <div className="tku-input-wrapper">
                        <Lock size={18} className="tku-input-prefix-icon" />
                        <input
                          id="current-password"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Nhập mật khẩu hiện tại để xác thực"
                          required
                          className="tku-profile-input"
                        />
                        <button
                          type="button"
                          className="tku-input-toggle-btn"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          aria-label={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 2: Thiết lập mật khẩu mới */}
                <div>
                  <div className="tku-profile-section-title">
                    <span>
                      {hasPassword ? '2. Thiết lập mật khẩu mới' : 'Thiết lập mật khẩu bảo mật'}
                    </span>
                  </div>

                  <div className="tku-profile-form-grid">
                    {/* New Password */}
                    <div className="tku-form-group tku-form-group--full">
                      <label className="tku-form-label" htmlFor="new-password">
                        <span>Mật khẩu mới</span>
                        <span className="tku-form-required">*</span>
                      </label>
                      <div className="tku-input-wrapper">
                        <Lock size={18} className="tku-input-prefix-icon" />
                        <input
                          id="new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Tối thiểu 8 ký tự"
                          required
                          className="tku-profile-input"
                        />
                        <button
                          type="button"
                          className="tku-input-toggle-btn"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {/* Password Strength Widget */}
                      {newPassword.length > 0 && (
                        <div className="tku-password-strength-widget">
                          <div className="tku-strength-header">
                            <span className="tku-strength-label">Độ mạnh mật khẩu:</span>
                            <span
                              className={`tku-strength-score-text tku-strength-score-text--${passwordStrength.colorClass}`}
                            >
                              {passwordStrength.label}
                            </span>
                          </div>

                          <div className="tku-strength-meter-bar">
                            <div
                              className={`tku-strength-meter-segment ${
                                passwordStrength.score >= 1
                                  ? `is-active-${passwordStrength.colorClass}`
                                  : ''
                              }`}
                            />
                            <div
                              className={`tku-strength-meter-segment ${
                                passwordStrength.score >= 3
                                  ? `is-active-${passwordStrength.colorClass}`
                                  : ''
                              }`}
                            />
                            <div
                              className={`tku-strength-meter-segment ${
                                passwordStrength.score >= 4
                                  ? `is-active-${passwordStrength.colorClass}`
                                  : ''
                              }`}
                            />
                          </div>

                          <div className="tku-strength-checklist">
                            <div
                              className={`tku-checklist-item ${
                                passwordStrength.hasLength ? 'is-met' : ''
                              }`}
                            >
                              {passwordStrength.hasLength ? (
                                <Check size={14} />
                              ) : (
                                <X size={14} />
                              )}
                              <span>Tối thiểu 8 ký tự</span>
                            </div>

                            <div
                              className={`tku-checklist-item ${
                                passwordStrength.hasUpper ? 'is-met' : ''
                              }`}
                            >
                              {passwordStrength.hasUpper ? (
                                <Check size={14} />
                              ) : (
                                <X size={14} />
                              )}
                              <span>Chữ hoa & chữ thường</span>
                            </div>

                            <div
                              className={`tku-checklist-item ${
                                passwordStrength.hasNumber ? 'is-met' : ''
                              }`}
                            >
                              {passwordStrength.hasNumber ? (
                                <Check size={14} />
                              ) : (
                                <X size={14} />
                              )}
                              <span>Có chứa chữ số (0-9)</span>
                            </div>

                            <div
                              className={`tku-checklist-item ${
                                passwordStrength.hasSpecial ? 'is-met' : ''
                              }`}
                            >
                              {passwordStrength.hasSpecial ? (
                                <Check size={14} />
                              ) : (
                                <X size={14} />
                              )}
                              <span>Ký tự đặc biệt (!@#$...)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="tku-form-group tku-form-group--full">
                      <label className="tku-form-label" htmlFor="confirm-password">
                        <span>Xác nhận mật khẩu mới</span>
                        <span className="tku-form-required">*</span>
                      </label>
                      <div className="tku-input-wrapper">
                        <Lock size={18} className="tku-input-prefix-icon" />
                        <input
                          id="confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Nhập lại mật khẩu mới"
                          required
                          className="tku-profile-input"
                        />
                        <button
                          type="button"
                          className="tku-input-toggle-btn"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {confirmPassword && confirmPassword !== newPassword && (
                        <span className="tku-form-hint--error">
                          <AlertCircle size={13} />
                          <span>Mật khẩu xác nhận chưa khớp với mật khẩu mới.</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="tku-profile-actions-row">
                  <button
                    type="submit"
                    disabled={!canSubmitPassword || isChangingPassword}
                    className="tku-btn-academic-primary"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 size={16} className="tku-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={16} />
                        <span>{hasPassword ? 'Cập nhật mật khẩu' : 'Lưu mật khẩu mới'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default LecturerSettingsPage;
