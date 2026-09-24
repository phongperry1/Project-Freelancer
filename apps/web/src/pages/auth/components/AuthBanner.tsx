import React, { memo } from 'react';

export const AuthBanner: React.FC = memo(function AuthBanner() {
  return (
    <div className="tku-auth-banner">
      <div className="tku-auth-banner__decor">
        <div className="tku-auth-banner__circle tku-auth-banner__circle--1" />
        <div className="tku-auth-banner__circle tku-auth-banner__circle--2" />
        <div className="tku-auth-banner__circle tku-auth-banner__circle--3" />
      </div>

      <a href="/" className="tku-auth-banner__brand" title="Quay về trang chủ">
        <img
          src="/assets/logo.png"
          alt="TKU Chemistry Center"
          className="tku-auth-banner__logo"
          width={48}
          height={48}
          loading="eager"
        />
        <div className="tku-auth-banner__brand-text">
          <span className="tku-auth-banner__brand-title">TKU</span>
          <span className="tku-auth-banner__brand-subtitle">
            TƯ DUY • KIẾN THỨC • ƯỚC MƠ
          </span>
        </div>
      </a>

      <div className="tku-auth-banner__content">
        <h1 className="tku-auth-banner__slogan">
          Học sâu hơn.
          <br />
          Tiến xa hơn.
        </h1>
        <p className="tku-auth-banner__desc">
          TKU đồng hành cùng bạn trong từng bài học, từ xây dựng nền tảng Hóa học vững chắc, hiểu đúng bản chất kiến thức đến luyện tập theo chuyên đề, kiểm tra và theo dõi sự tiến bộ qua từng giai đoạn. Mỗi nội dung được tổ chức rõ ràng để bạn học có định hướng, củng cố tư duy và chủ động chinh phục mục tiêu học tập.
        </p>
      </div>

      <div className="tku-auth-banner__footer">
        <span>Bài giảng</span>
        <span className="dot">•</span>
        <span>Luyện tập</span>
        <span className="dot">•</span>
        <span>Kiểm tra</span>
        <span className="dot">•</span>
        <span>Hỏi đáp</span>
      </div>
    </div>
  );
});

export default AuthBanner;
