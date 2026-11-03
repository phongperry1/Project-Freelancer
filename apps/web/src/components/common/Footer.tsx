import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, BookOpen } from 'lucide-react';
import { FOOTER_COLUMNS } from '../../data/navigation.data';

export const Footer: React.FC = memo(() => {
  return (
    <footer className="tku-footer" role="contentinfo" aria-label="Chân trang TKU E-Learning">
      <div className="tku-container">
        <div className="tku-footer__grid">
          {/* Cột 1: Thông tin thương hiệu */}
          <div className="tku-footer__brand-col">
            <Link to="/" className="tku-footer__brand" aria-label="Trang chủ TKU E-Learning">
              <img
                src="/assets/logo.png"
                alt="TKU Chemistry Center"
                className="tku-footer__logo"
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
              />
              <div>
                <h4 className="tku-footer__title">NỀN TẢNG HỌC TẬP TKU</h4>
                <p className="tku-footer__subtitle">TƯ DUY • KIẾN THỨC • ƯỚC MƠ</p>
              </div>
            </Link>
            <p className="tku-footer__desc">
              Hệ thống học tập Hóa học trực tuyến toàn diện từ cơ bản đến nâng cao. Tích hợp bài giảng video chuyên sâu, luyện thi trắc nghiệm và Gia sư AI hỗ trợ học sinh 24/7.
            </p>
            <div className="tku-footer__highlights">
              <span className="tku-footer__highlight-pill">
                <Sparkles size={12} aria-hidden="true" />
                <span>Gia sư AI trong phòng học</span>
              </span>
              <span className="tku-footer__highlight-pill">
                <BookOpen size={12} aria-hidden="true" />
                <span>Bám sát chuẩn GDPT mới</span>
              </span>
            </div>
          </div>

          {/* Cột 2, 3, 4: Các cột điều hướng thực tế */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="tku-footer__col">
              <h5 className="tku-footer__col-title">{col.title}</h5>
              <ul className="tku-footer__links">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className="tku-footer__link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar: Bản quyền & Liên kết điều hướng nhanh thực tế */}
        <div className="tku-footer__bottom">
          <p className="tku-footer__copyright">
            © 2026 Nền tảng học tập TKU (TKU E-Learning). Tự hào đồng hành cùng học sinh bứt phá môn Hóa học.
          </p>
          <div className="tku-footer__legal">
            <Link to="/courses">Khóa học</Link>
            <span className="dot" aria-hidden="true">•</span>
            <Link to="/lessons">Bài giảng</Link>
            <span className="dot" aria-hidden="true">•</span>
            <Link to="/roadmap">Lộ trình</Link>
            <span className="dot" aria-hidden="true">•</span>
            <Link to="/qa">Hỏi đáp</Link>
            <span className="dot" aria-hidden="true">•</span>
            <Link to="/support">Hỗ trợ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
