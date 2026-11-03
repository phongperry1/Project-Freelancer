import type { FooterColumn, NavItem } from '../types/nav.types';

export const MAIN_NAV_ITEMS: NavItem[] = [
  { id: 'nav-home', label: 'Trang chủ', href: '/' },
  { id: 'nav-courses', label: 'Khóa học', href: '/courses' },
  { id: 'nav-lessons', label: 'Bài giảng', href: '/lessons' },
  { id: 'nav-roadmap', label: 'Lộ trình', href: '/roadmap' },
  { id: 'nav-qa', label: 'Hỏi đáp', href: '/qa' },
  { id: 'nav-support', label: 'Hỗ trợ', href: '/support' },
];

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Khóa học Hóa học',
    links: [
      { label: 'Tất cả khóa học', href: '/courses' },
      { label: 'Chương trình Lớp 10', href: '/courses/category/10' },
      { label: 'Chương trình Lớp 11', href: '/courses/category/11' },
      { label: 'Chương trình Lớp 12', href: '/courses/category/12' },
      { label: 'Luyện thi THPT & ĐGNL', href: '/courses/category/exam' },
    ],
  },
  {
    title: 'Không gian học tập',
    links: [
      { label: 'Kho bài giảng video', href: '/lessons' },
      { label: 'Lộ trình học tập chuẩn', href: '/roadmap' },
      { label: 'Cộng đồng Hỏi đáp', href: '/qa' },
      { label: 'Khóa học của tôi', href: '/my-courses' },
    ],
  },
  {
    title: 'Hỗ trợ & Trợ giúp',
    links: [
      { label: 'Trung tâm Hỗ trợ & FAQ', href: '/support' },
      { label: 'Hướng dẫn kích hoạt mã Key', href: '/support' },
      { label: 'Đăng nhập tài khoản', href: '/login' },
      { label: 'Đăng ký học viên mới', href: '/register' },
    ],
  },
];
