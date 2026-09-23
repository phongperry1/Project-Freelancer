import React from 'react';
import { ArrowRight } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section id="home" className="tku-hero-section">
      <div className="tku-container">
        <div className="tku-hero__grid">
          {/* Left Column: Content */}
          <div className="tku-hero__content">
            {/* Pill Tag */}
            <div className="tku-hero__pill">
              <span className="tku-hero__pill-dot" />
              <span>Học tập hiệu quả · mọi lúc · mọi nơi</span>
            </div>

            {/* Title */}
            <h1 className="tku-hero__title">
              Nền tảng học tập TKU <span className="text-primary">hiện đại</span> cho hành trình phát triển bản thân
            </h1>

            {/* Subtitle */}
            <p className="tku-hero__description">
              Một không gian học tập trực tuyến tinh gọn, trực quan và dễ sử dụng — nơi người học khám phá kiến thức, luyện tập và phát triển tư duy mỗi ngày.
            </p>

            {/* CTA Buttons */}
            <div className="tku-hero__cta-group">
              <a href="#courses" className="tku-btn tku-btn--primary tku-btn--lg">
                <span>Bắt đầu học ngay</span>
                <ArrowRight size={18} />
              </a>
              <a href="#features" className="tku-btn tku-btn--secondary tku-btn--lg">
                Khám phá nền tảng
              </a>
            </div>
          </div>

          {/* Right Column: Hero Image (Student with laptop) */}
          <div className="tku-hero__visual">
            <div className="tku-hero__image-wrapper">
              <img
                src="/assets/hero-ndk.jpg"
                alt="Học Hóa cùng NDK - Hóa ra không khó - Nền tảng học tập TKU"
                className="tku-hero__image"
                width={500}
                height={500}
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
