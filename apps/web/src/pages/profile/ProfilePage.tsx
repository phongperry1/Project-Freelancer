import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  Home,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { authService } from '../../services/auth.service';
import type { User } from '../../types/auth.types';
import { ProfileSidebar } from './ProfileSidebar';
import './profile.css';

interface ProfileInfoFormProps {
  user: User;
  onSaveSuccess: (updated: User) => void;
}

const ProfileInfoForm: React.FC<ProfileInfoFormProps> = ({
  user,
  onSaveSuccess,
}) => {
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
      setInfoError('Họ và tên không được để trống.');
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
      toast.success('Thông tin cá nhân đã được lưu thành công!');
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
      {/* Panel Header */}
      <div className="tku-profile-panel-header">
        <div className="tku-profile-panel-header__left">
          <div className="tku-profile-panel-header__icon-box">
            <UserIcon size={24} />
          </div>
          <div>
            <h2 className="tku-profile-panel-header__title">Thông tin cá nhân</h2>
            <p className="tku-profile-panel-header__subtitle">
              Cập nhật thông tin định danh học viên để giảng viên và hệ thống đồng bộ hồ sơ học tập.
            </p>
          </div>
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
        {/* Section 1 */}
        <div>
          <div className="tku-profile-section-title">
            <span>1. Định danh học viên</span>
          </div>

          <div className="tku-profile-form-grid">
            {/* Full Name */}
            <div className="tku-form-group tku-form-group--full">
              <label className="tku-form-label" htmlFor="profile-fullName">
                <span>Họ và tên</span>
                <span className="tku-form-required">*</span>
              </label>
              <div className="tku-input-wrapper">
                <UserIcon size={18} className="tku-input-prefix-icon" />
                <input
                  id="profile-fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên đầy đủ"
                  required
                  className="tku-profile-input"
                />
              </div>
            </div>

            {/* Email (Read-only) */}
            <div className="tku-form-group tku-form-group--full">
              <label className="tku-form-label" htmlFor="profile-email">
                <span>Email đăng nhập</span>
              </label>
              <div className="tku-input-wrapper">
                <Mail size={18} className="tku-input-prefix-icon" />
                <input
                  id="profile-email"
                  type="email"
                  value={user.email}
                  readOnly
                  disabled
                  className="tku-profile-input"
                />
              </div>
              <div className="tku-form-hint--locked">
                <Lock size={12} />
                <span>Email đăng nhập là định danh duy nhất của học sinh nhằm bảo vệ an toàn tài khoản.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div>
          <div className="tku-profile-section-title">
            <span>2. Thông tin liên hệ & Năm sinh</span>
          </div>

          <div className="tku-profile-form-grid">
            {/* Phone Number */}
            <div className="tku-form-group">
              <label className="tku-form-label" htmlFor="profile-phone">
                <span>Số điện thoại</span>
              </label>
              <div className="tku-input-wrapper">
                <Phone size={18} className="tku-input-prefix-icon" />
                <input
                  id="profile-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ví dụ: 0912345678"
                  className="tku-profile-input"
                />
              </div>
              <span className="tku-form-hint">Dùng để nhận thông báo khẩn cấp hoặc xác thực khi cần.</span>
            </div>

            {/* Date of Birth */}
            <div className="tku-form-group">
              <label className="tku-form-label" htmlFor="profile-dob">
                <span>Ngày sinh</span>
              </label>
              <div className="tku-input-wrapper">
                <Calendar size={18} className="tku-input-prefix-icon" />
                <input
                  id="profile-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="tku-profile-input"
                />
              </div>
              <span className="tku-form-hint">Giúp nền tảng tối ưu hóa lộ trình học phù hợp lứa tuổi.</span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="tku-profile-actions-row">
          <button
            type="submit"
            disabled={!hasInfoChanged || isSavingInfo}
            className="tku-btn-academic-primary"
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

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();

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
                Vui lòng đăng nhập vào tài khoản học tập TKU để truy cập và quản lý hồ sơ cá nhân của bạn.
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
            1. ACADEMIC HERO BANNER (ĐỒNG BỘ CHUẨN DESIGN SYSTEM TKU)
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
              <span className="tku-hero-breadcrumb-current">Hồ sơ cá nhân</span>
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
                  Hồ sơ cá nhân & Thông tin tài khoản
                </h1>

                <p className="tku-profile-hero__desc">
                  Quản lý thông tin định danh học viên, cập nhật ảnh đại diện và hồ sơ học tập tại TKU E-Learning.
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
            {/* Cột Trái: Sidebar Thông tin nhận diện & Menu */}
            <ProfileSidebar activeTab="info" />

            {/* Cột Phải: Nội dung Form Thông tin cá nhân */}
            <section className="tku-profile-main-panel">
              <ProfileInfoForm
                key={`${user.id}-${user.fullName}-${user.phoneNumber}-${user.dateOfBirth}`}
                user={user}
                onSaveSuccess={(updated) => updateUser(updated)}
              />
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;
