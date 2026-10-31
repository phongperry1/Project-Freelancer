import {
  AlertCircle,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Home,
  Loader2,
  Lock,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer } from '../../components/common/Footer';
import { Navbar } from '../../components/common/Navbar';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { authService } from '../../services/auth.service';
import { ProfileSidebar } from './ProfileSidebar';
import './profile.css';

export const SecurityPage: React.FC = () => {
  const { user, isAuthenticated, updateUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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

  // Password Strength Meter Calculations
  const passwordStrength = useMemo(() => {
    if (!newPassword) {
      return {
        score: 0,
        label: 'Chưa nhập',
        colorClass: '',
        hasLength: false,
        hasUpper: false,
        hasLower: false,
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

  // Handle Password Change Submit
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (!newPassword) {
      setPasswordError('Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
      });

      toast.success(res.message || 'Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.';
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // If unauthenticated, show clean prompt
  if (!isAuthenticated || !user) {
    return (
      <div className="tku-profile-page-wrapper">
        <Navbar />
        <main className="tku-profile-page-main">
          <div className="tku-profile-content-container" style={{ textAlign: 'center', padding: '90px 20px' }}>
            <div
              style={{
                maxWidth: '480px',
                margin: '0 auto',
                background: '#ffffff',
                padding: '40px 32px',
                borderRadius: '18px',
                boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  border: '1px solid #bfdbfe',
                }}
              >
                <Lock size={32} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Yêu cầu đăng nhập
              </h2>
              <p style={{ fontSize: '14.5px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
                Vui lòng đăng nhập vào tài khoản học tập TKU để truy cập và quản lý bảo mật của bạn.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="tku-btn-academic-primary"
                >
                  Đăng nhập ngay
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="tku-btn-academic-secondary"
                >
                  Về trang chủ
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="tku-profile-page-wrapper">
      <Navbar />

      <main className="tku-profile-page-main">
        {/* =================================================================
            1. ACADEMIC HERO BANNER (CHUẨN DESIGN SYSTEM TKU)
            ================================================================= */}
        <section className="tku-profile-hero">
          <div className="tku-container">
            {/* Breadcrumb Trail */}
            <nav className="tku-hero-breadcrumbs" aria-label="Đường dẫn điều hướng">
              <Link to="/" className="tku-hero-breadcrumb-link">
                <Home size={14} />
                <span>Trang chủ</span>
              </Link>
              <ChevronRight size={13} className="tku-hero-breadcrumb-sep" />
              <Link to="/profile" className="tku-hero-breadcrumb-link">
                <span>Hồ sơ cá nhân</span>
              </Link>
              <ChevronRight size={13} className="tku-hero-breadcrumb-sep" />
              <span className="tku-hero-breadcrumb-current">Đổi mật khẩu</span>
            </nav>

            <div className="tku-profile-hero__grid">
              <div className="tku-profile-hero__main">
                <div className="tku-profile-hero__tag-wrap">
                  <span className="tku-profile-hero__tag">
                    <Sparkles size={14} />
                    <span>Hệ sinh thái học tập TKU</span>
                  </span>
                </div>

                <h1 className="tku-profile-hero__title">
                  Đổi mật khẩu
                </h1>

                <p className="tku-profile-hero__desc">
                  Thiết lập mật khẩu bảo vệ tài khoản với thuật toán mã hóa Argon2 hiện đại, đảm bảo an toàn tối đa cho dữ liệu học tập của bạn.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            2. MAIN CONTENT (2 CỘT CHUYÊN NGHIỆP)
            ================================================================= */}
        <div className="tku-profile-content-container">
          <div className="tku-profile-grid">
            {/* Cột Trái: Sidebar Nhận diện & Menu */}
            <ProfileSidebar activeTab="security" />

            {/* Cột Phải: Nội dung Đổi mật khẩu */}
            <section className="tku-profile-main-panel">
              {/* Panel Header */}
              <div className="tku-profile-panel-header">
                <div className="tku-profile-panel-header__left">
                  <div className="tku-profile-panel-header__icon-box tku-profile-panel-header__icon-box--amber">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h2 className="tku-profile-panel-header__title">Đổi mật khẩu</h2>
                    <p className="tku-profile-panel-header__subtitle">
                      Bảo vệ an toàn tài khoản học tập với mật khẩu mạnh theo tiêu chuẩn an toàn thông tin.
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
                {/* Section 1 */}
                <div>
                  <div className="tku-profile-section-title">
                    <span>1. Xác thực tài khoản hiện tại</span>
                  </div>

                  <div className="tku-form-group">
                    <label className="tku-form-label" htmlFor="profile-current-pass">
                      <span>Mật khẩu hiện tại</span>
                      <span className="tku-form-required">*</span>
                    </label>
                    <div className="tku-input-wrapper">
                      <Lock size={18} className="tku-input-prefix-icon" />
                      <input
                        id="profile-current-pass"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Nhập mật khẩu bạn đang dùng"
                        required
                        className="tku-profile-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="tku-input-toggle-btn"
                        aria-label={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 2 */}
                <div>
                  <div className="tku-profile-section-title">
                    <span>2. Thiết lập mật khẩu mới</span>
                  </div>

                  <div className="tku-profile-form-grid">
                    {/* New Password */}
                    <div className="tku-form-group tku-form-group--full">
                      <label className="tku-form-label" htmlFor="profile-new-pass">
                        <span>Mật khẩu mới</span>
                        <span className="tku-form-required">*</span>
                      </label>
                      <div className="tku-input-wrapper">
                        <Lock size={18} className="tku-input-prefix-icon" />
                        <input
                          id="profile-new-pass"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Tối thiểu 6 - 8 ký tự"
                          required
                          className="tku-profile-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="tku-input-toggle-btn"
                          aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
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

                    {/* Confirm New Password */}
                    <div className="tku-form-group tku-form-group--full">
                      <label className="tku-form-label" htmlFor="profile-confirm-pass">
                        <span>Xác nhận mật khẩu mới</span>
                        <span className="tku-form-required">*</span>
                      </label>
                      <div className="tku-input-wrapper">
                        <Lock size={18} className="tku-input-prefix-icon" />
                        <input
                          id="profile-confirm-pass"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Nhập lại chính xác mật khẩu mới"
                          required
                          className="tku-profile-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="tku-input-toggle-btn"
                          aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <span style={{ fontSize: '12.5px', color: '#ef4444', marginTop: '4px' }}>
                          Mật khẩu xác nhận chưa khớp với mật khẩu mới.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="tku-profile-actions-row">
                  <button
                    type="submit"
                    disabled={
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword ||
                      newPassword !== confirmPassword ||
                      isChangingPassword
                    }
                    className="tku-btn-academic-primary"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 size={16} className="tku-spin" />
                        <span>Đang cập nhật...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Cập nhật mật khẩu</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SecurityPage;

