import React, { memo } from 'react';
import { BookOpen, TrendingUp, CheckCircle2, GraduationCap } from 'lucide-react';

interface BannerFeature {
  icon: typeof BookOpen;
  title: string;
  sub: string;
}

const BANNER_FEATURES: readonly BannerFeature[] = [
  {
    icon: BookOpen,
    title: 'Bài giảng & Chuyên đề',
    sub: 'Hiểu bản chất từ căn bản đến nâng cao',
  },
  {
    icon: TrendingUp,
    title: 'Luyện tập & Đánh giá',
    sub: 'Theo dõi chi tiết tiến bộ từng giai đoạn',
  },
  {
    icon: CheckCircle2,
    title: 'Giải đáp & Đồng hành',
    sub: 'Hỏi đáp trọng tâm cùng trợ giảng',
  },
] as const;

export const AuthBanner: React.FC = memo(function AuthBanner() {
  return (
    <div className="tku-auth-banner">
      {/* Subtle academic geometric decor */}
      <div className="tku-auth-banner__decor" aria-hidden="true">
        <div className="tku-auth-banner__orbit tku-auth-banner__orbit--1" />
        <div className="tku-auth-banner__orbit tku-auth-banner__orbit--2" />
        <div className="tku-auth-banner__orbit tku-auth-banner__orbit--3" />
      </div>

      {/* Brand Header */}
      <a href="/" className="tku-auth-banner__brand" title="Quay về trang chủ">
        <div className="tku-auth-banner__logo-box">
          <img
            src="/assets/logo.png"
            alt="TKU Chemistry Center"
            className="tku-auth-banner__logo"
            width={44}
            height={44}
            loading="eager"
            decoding="async"
          />
        </div>
        <div className="tku-auth-banner__brand-text">
          <span className="tku-auth-banner__brand-title">TKU</span>
          <span className="tku-auth-banner__brand-subtitle">
            TƯ DUY • KIẾN THỨC • ƯỚC MƠ
          </span>
        </div>
      </a>

      {/* Hero Content */}
      <div className="tku-auth-banner__content">
        <div className="tku-auth-banner__badge">
          <GraduationCap size={13} className="tku-auth-banner__badge-icon" aria-hidden="true" />
          <span>Nền tảng Hóa học trực tuyến</span>
        </div>

        <h1 className="tku-auth-banner__slogan">
          Học sâu hơn
          <br />
          <span>Tiến xa hơn</span>
        </h1>

        <p className="tku-auth-banner__desc">
          Đồng hành cùng bạn xây dựng nền tảng vững chắc, củng cố tư duy và chủ động chinh phục mục tiêu học tập.
        </p>

        {/* Feature Cards - Clean & Unified Academic Style */}
        <div className="tku-auth-banner__features">
          {BANNER_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="tku-auth-banner__feature">
                <div className="tku-auth-banner__feature-icon" aria-hidden="true">
                  <Icon size={16} />
                </div>
                <div className="tku-auth-banner__feature-info">
                  <div className="tku-auth-banner__feature-title">{feature.title}</div>
                  <div className="tku-auth-banner__feature-sub">{feature.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default AuthBanner;
