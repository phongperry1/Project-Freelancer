import React from 'react';
import { Video, FileText, Sparkles, BarChart3 } from 'lucide-react';
import { Badge } from '../../../components/common/Badge';
import { PLATFORM_FEATURES } from '../../../data/features.data';

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  video: <Video size={24} className="text-primary" />,
  'file-text': <FileText size={24} className="text-primary" />,
  sparkles: <Sparkles size={24} className="text-primary" />,
  'bar-chart': <BarChart3 size={24} className="text-primary" />,
};

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="tku-section tku-features-section">
      <div className="tku-container">
        {/* Section Header */}
        <div className="tku-section-header">
          <Badge variant="blue">Tính năng nổi bật</Badge>
          <h2 className="tku-section-title">Trải nghiệm học tập toàn diện</h2>
          <p className="tku-section-subtitle">
            Hệ thống công cụ và tài nguyên đa dạng giúp bạn tiếp thu kiến thức một cách chủ động, nhanh chóng và đạt hiệu quả tối đa.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="tku-features-grid">
          {PLATFORM_FEATURES.map((feature) => (
            <div key={feature.id} className="tku-feature-card">
              <div className="tku-feature-card__icon-box">
                {FEATURE_ICONS[feature.iconName] ?? <Sparkles size={24} className="text-primary" />}
              </div>
              <h3 className="tku-feature-card__title">{feature.title}</h3>
              <p className="tku-feature-card__desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
