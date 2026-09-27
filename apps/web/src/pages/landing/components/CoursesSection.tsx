import React, { useState, useMemo } from 'react';
import { Badge } from '../../../components/common/Badge';
import { EmptyState } from '../../../components/common/EmptyState';
import type { Course, GradeLevel } from '../../../types/course.types';
import { COURSE_FILTER_TABS, INITIAL_COURSES } from '../../../data/courses.data';

export const CoursesSection: React.FC = () => {
  // Dữ liệu khóa học được quản lý qua state động (khởi tạo rỗng, không hardcode hay mock data)
  const [courses] = useState<Course[]>(INITIAL_COURSES);
  const [activeTab, setActiveTab] = useState<GradeLevel>('all');

  const filteredCourses = useMemo(() => {
    return activeTab === 'all'
      ? courses
      : courses.filter((c) => c.grade === activeTab);
  }, [courses, activeTab]);

  return (
    <section id="courses" className="tku-section tku-courses-section">
      <div className="tku-container">
        {/* Section Header */}
        <div className="tku-section-header">
          <Badge variant="blue">Khóa học tiêu biểu</Badge>
          <h2 className="tku-section-title">Lựa chọn lộ trình học của bạn</h2>
          <p className="tku-section-subtitle">
            Các khóa học Hóa học trọng tâm từ lớp 10, 11 đến luyện thi đại học lớp 12 được thiết kế khoa học, bài bản.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="tku-courses-tabs">
          {COURSE_FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`tku-tab-btn ${activeTab === tab.key ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Courses Display or Empty State */}
        {filteredCourses.length > 0 ? (
          <div className="tku-courses-grid">
            {filteredCourses.map((course) => (
              <div key={course.id} className="tku-card">
                <div className="tku-card__thumbnail">
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    loading="lazy"
                  />
                  {course.badge && <span className="tku-card__tag">{course.badge}</span>}
                </div>
                <div className="tku-card__body">
                  <h3 className="tku-card__title">{course.title}</h3>
                  <p className="tku-card__instructor">Giảng viên: {course.teacher}</p>
                  <div className="tku-card__footer">
                    <span className="tku-card__price">{course.price.toLocaleString('vi-VN')} đ</span>
                    <a href={`#course-${course.id}`} className="tku-btn tku-btn--primary">
                      Đăng ký ngay
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Chưa có dữ liệu khóa học"
            description="Hiện tại chưa có khóa học nào được đăng tải trên hệ thống. Danh sách khóa học sẽ sớm được cập nhật."
          />
        )}
      </div>
    </section>
  );
};

export default CoursesSection;
