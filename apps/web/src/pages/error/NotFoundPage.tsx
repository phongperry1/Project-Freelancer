import React from 'react';
import { Link } from 'react-router-dom';
import './notFound.css';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="tku-not-found-page">
      <div className="tku-not-found-container">
        <div className="tku-not-found-content">
          <div className="tku-not-found-badge">
            <span className="tku-not-found-badge__dot" />
            <span>ERROR 404</span>
          </div>

          <h1 className="tku-not-found-title">
            Không tìm thấy trang
          </h1>

          <p className="tku-not-found-desc">
            Trang bạn đang tìm kiếm không tồn tại hoặc đường dẫn có thể đã được thay đổi. Hãy kiểm tra lại địa chỉ hoặc quay về trang chính của hệ thống học tập.
          </p>

          <div className="tku-not-found-actions">
            <Link to="/admin" className="tku-not-found-btn tku-not-found-btn--primary">
              Về trang dashboard
            </Link>
          </div>
        </div>

        <div className="tku-not-found-illustration-wrapper">
          <div className="tku-not-found-ambient-glow" />
          <img
            src="/assets/not-found-illustration.png"
            alt="Không tìm thấy trang"
            className="tku-not-found-image"
          />
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
