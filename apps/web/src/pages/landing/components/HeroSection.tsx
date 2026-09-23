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

            {/* Description */}
            <p className="tku-hero__description">
              Khám phá các khóa học chất lượng cao, bài giảng chuyên sâu cùng trợ lý AI thông minh luôn sẵn sàng hỗ trợ giải đáp mọi thắc mắc của bạn 24/7.
            </p>

            {/* Action Buttons */}
            <div className="tku-hero__cta-group">
              <a href="#courses" className="tku-btn tku-btn--primary">
                <span>Khám phá khóa học</span>
                <ArrowRight size={18} />
              </a>
              <a href="#features" className="tku-btn tku-btn--outline">
                Tìm hiểu thêm
              </a>
            </div>
          </div>

          {/* Right Column: Visual Graphic */}
          <div className="tku-hero__visual">
            <div className="tku-hero__image-wrapper">
              <img
                src="/assets/hero-ndk.jpg"
                alt="Thầy NDK - Hóa Ra Không Khó"
                className="tku-hero__image"
                width={560}
                height={560}
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
