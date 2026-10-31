import React, { useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  User as UserIcon,
  Shield,
  Camera,
  CheckCircle2,
  ChevronRight,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { authService } from '../../services/auth.service';

const DEFAULT_AVATAR = '/assets/default-avatar.jpg';

interface ProfileSidebarProps {
  activeTab: 'info' | 'security';
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ activeTab }) => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Role display label
  const roleDisplay = useMemo(() => {
    switch (user?.role) {
      case 'ADMIN':
        return 'Quản trị viên';
      case 'TEACHER':
        return 'Giảng viên';
      default:
        return 'Học sinh';
    }
  }, [user]);

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

  if (!user) return null;

  return (
    <aside className="tku-profile-sidebar">
      {/* Thẻ định danh người dùng */}
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
                src={user.avatarUrl || DEFAULT_AVATAR}
                alt={user.fullName || 'Ảnh đại diện người dùng'}
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
            <h2 className="tku-profile-user-name">{user.fullName}</h2>
            <span title="Tài khoản đã xác thực" style={{ display: 'inline-flex' }}>
              <CheckCircle2 size={18} className="tku-verified-badge" />
            </span>
          </div>
          <p className="tku-profile-user-email">{user.email}</p>

          {/* Badges */}
          <div className="tku-profile-badges-row" style={{ marginBottom: '8px' }}>
            <span className="tku-badge-pill tku-badge-pill--role">
              <GraduationCap size={13} />
              <span>{roleDisplay}</span>
            </span>
            <span className="tku-badge-pill tku-badge-pill--status">
              <span className="tku-pulse-dot" />
              <span>Đang hoạt động</span>
            </span>
          </div>
        </div>
      </div>

      {/* Menu chuyển trang */}
      <div className="tku-profile-nav-card">
        <Link
          to="/profile"
          className={`tku-profile-nav-item ${activeTab === 'info' ? 'is-active' : ''}`}
        >
          <div className="tku-profile-nav-icon-wrap">
            <UserIcon size={18} />
          </div>
          <span>Thông tin cá nhân</span>
          <ChevronRight size={16} className="tku-profile-nav-chevron" />
        </Link>

        <Link
          to="/profile/security"
          className={`tku-profile-nav-item ${activeTab === 'security' ? 'is-active' : ''}`}
        >
          <div className="tku-profile-nav-icon-wrap">
            <Shield size={18} />
          </div>
          <span>Đổi mật khẩu</span>
          <ChevronRight size={16} className="tku-profile-nav-chevron" />
        </Link>
      </div>
    </aside>
  );
};

export default ProfileSidebar;

