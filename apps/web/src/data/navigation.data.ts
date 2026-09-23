import type { FooterColumn, NavItem } from '../types/nav.types';

export const MAIN_NAV_ITEMS: NavItem[] = [
  { id: 'nav-home', label: 'Trang chủ', href: '#home', isActive: true },
  { id: 'nav-courses', label: 'Khóa học', href: '#courses' },
  { id: 'nav-lessons', label: 'Bài giảng', href: '#lessons' },
  { id: 'nav-roadmap', label: 'Lộ trình', href: '#roadmap' },
  { id: 'nav-qa', label: 'Hỏi đáp', href: '#qa' },
  { id: 'nav-support', label: 'Hỗ trợ', href: '#support' },
];

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Về chúng tôi',
    links: [
      { label: 'Giới thiệu', href: '#about' },
      { label: 'Khóa học', href: '#courses' },
      { label: 'Giảng viên', href: '#teachers' },
      { label: 'Tin tức học tập', href: '#news' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Hướng dẫn học', href: '#guide' },
      { label: 'Chính sách bảo mật', href: '#privacy' },
      { label: 'Hướng dẫn thanh toán', href: '#payment-guide' },
      { label: 'Câu hỏi thường gặp', href: '#faq' },
    ],
  },
];

export const CONTACT_INFO = {
  email: 'contact@tku.edu.vn',
  phone: '090 123 4567',
  location: 'Việt Nam',
};
