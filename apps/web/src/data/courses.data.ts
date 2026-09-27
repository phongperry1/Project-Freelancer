import type { Course, CourseFilterTab } from '../types/course.types';

export const COURSE_FILTER_TABS: CourseFilterTab[] = [
  { key: 'all', label: 'Tất cả' },
  { key: '10', label: 'Hóa học Lớp 10' },
  { key: '11', label: 'Hóa học Lớp 11' },
  { key: '12', label: 'Hóa học Lớp 12' },
  { key: 'exam', label: 'Luyện thi THPT' },
];

/**
 * Danh sách khóa học được khởi tạo rỗng.
 * Khi chưa có dữ liệu từ backend/API, giao diện sẽ kích hoạt Empty State "Chưa có dữ liệu".
 */
export const INITIAL_COURSES: Course[] = [];
