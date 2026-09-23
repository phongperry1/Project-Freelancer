import React from 'react';
import { Video, FileText, Sparkles, BarChart3 } from 'lucide-react';
import { Badge } from '../common/Badge';
import { PLATFORM_FEATURES } from '../../data/features.data';

export const FeaturesSection: React.FC = () => {
  const getFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case 'video':
        return <Video size={24} className="text-primary" />;
      case 'file-text':
        return <FileText size={24} className="text-primary" />;
      case 'sparkles':
        return <Sparkles size={24} className="text-primary" />;
      case 'bar-chart':
        return <BarChart3 size={24} className="text-primary" />;
      default:
        return <Sparkles size={24} className="text-primary" />;
    }
  };

  return (
    <section id="features" className="tku-section tku-features-section">
      <div className="tku-container">
        {/* Section Header */}
        <div className="tku-section-header">
          <Badge>TÍNH NĂNG NỔI BẬT</Badge>
          <h2 className="tku-section-title">
            Phương pháp học tập thông minh & hiệu quả
          </h2>
          <p className="tku-section-subtitle">
            TKU mang lại hệ thống công cụ hỗ trợ học tập toàn diện giúp học sinh nắm vững lý thuyết và thực hành nhuần nhuyễn môn Hóa học.
          </p>
        </div>

        {/* Features 4-card Grid */}
        <div className="tku-features-grid">
          {PLATFORM_FEATURES.map((feat) => (
            <div key={feat.id} className="tku-feature-card">
              <div className="tku-feature-card__icon-box">
                {getFeatureIcon(feat.iconName)}
              </div>
              <h3 className="tku-feature-card__title">{feat.title}</h3>
              <p className="tku-feature-card__desc">{feat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
