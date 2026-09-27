import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { FOOTER_COLUMNS, CONTACT_INFO } from '../../data/navigation.data';

export const Footer: React.FC = () => {
  return (
    <footer className="tku-footer">
      <div className="tku-container">
        <div className="tku-footer__grid">
          {/* Brand Info */}
          <div className="tku-footer__brand-col">
            <div className="tku-footer__brand">
              <img
                src="/assets/logo.png"
                alt="TKU Chemistry Center"
                className="tku-footer__logo"
                width={48}
                height={48}
                loading="lazy"
              />
              <div>
                <h4 className="tku-footer__title">NỀN TẢNG HỌC TẬP TKU</h4>
                <p className="tku-footer__subtitle">TƯ DUY • KIẾN THỨC • ƯỚC MƠ</p>
              </div>
            </div>
            <p className="tku-footer__desc">
              Nền tảng học tập TKU — Tư duy · Kiến thức · Ước mơ. Một không gian học tập hiện đại, trực quan và gần gũi.
            </p>
          </div>

          {/* Navigation Columns */}
          {FOOTER_COLUMNS.map((col, idx) => (
            <div key={idx} className="tku-footer__col">
              <h5 className="tku-footer__col-title">{col.title}</h5>
              <ul className="tku-footer__links">
                {col.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <a href={link.href} className="tku-footer__link">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact Column */}
          <div className="tku-footer__col">
            <h5 className="tku-footer__col-title">Liên hệ</h5>
            <ul className="tku-footer__contact-list">
              <li>
                <Mail size={16} className="tku-footer__contact-icon" />
                <a href={`mailto:${CONTACT_INFO.email}`} className="tku-footer__link">
                  {CONTACT_INFO.email}
                </a>
              </li>
              <li>
                <Phone size={16} className="tku-footer__contact-icon" />
                <a href={`tel:${CONTACT_INFO.phone.replace(/\s+/g, '')}`} className="tku-footer__link">
                  {CONTACT_INFO.phone}
                </a>
              </li>
              <li>
                <MapPin size={16} className="tku-footer__contact-icon" />
                <span>{CONTACT_INFO.location}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="tku-footer__bottom">
          <p className="tku-footer__copyright">
            © 2026 Nền tảng học tập TKU. All rights reserved.
          </p>
          <div className="tku-footer__legal">
            <a href="#terms">Điều khoản sử dụng</a>
            <span className="dot">•</span>
            <a href="#privacy">Chính sách bảo mật</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
