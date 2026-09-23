import React, { useState } from 'react';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import type { Course, GradeLevel } from '../../types/course.types';
import { COURSE_FILTER_TABS, INITIAL_COURSES } from '../../data/courses.data';

export const CoursesSection: React.FC = () => {
  // Dữ liệu khóa học được quản lý qua state động (khởi tạo rỗng, không hardcode hay mock data)
  const [courses] = useState<Course[]>(INITIAL_COURSES);
  const [activeTab, setActiveTab] = useState<GradeLevel>('all');

  const filteredCourses =
    activeTab === 'all'
      ? courses
      : courses.filter((c) => c.grade === activeTab);

  return (
    <section id="courses" className="tku-section tku-courses-section">
      <div className="tku-container">
        {/* Section Header */}
        <div className="tku-section-header">
          <Badge>KHÓA HỌC PHỔ BIẾN</Badge>
          <h2 className="tku-section-title">
            Bắt đầu hành trình chinh phục điểm số
          </h2>
          <p className="tku-section-subtitle">
            Các khóa học được thiết kế bám sát chương trình Hóa học, giúp bạn xây dựng kiến thức từ căn bản đến các chuyên đề nâng cao.
          </p>
        </div>

        {/* Grade Filter Tabs */}
        <div className="tku-courses-tabs">
          {COURSE_FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`tku-tab-btn ${activeTab === tab.key ? 'is-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area: Hiển thị Chưa có dữ liệu khi danh sách rỗng */}
        <div className="tku-courses-content">
          {filteredCourses.length === 0 ? (
            <EmptyState
              title={`Chưa có dữ liệu ${activeTab === 'all' ? 'khóa học' : activeTab === 'exam' ? 'chuyên đề luyện thi' : `Hóa học Lớp ${activeTab}`}`}
              description={
                activeTab === 'all'
                  ? 'Hiện tại chưa có khóa học nào được đăng tải trên hệ thống. Danh sách khóa học sẽ sớm được cập nhật.'
                  : `Hiện tại chưa có khóa học nào thuộc danh mục "${COURSE_FILTER_TABS.find((t) => t.key === activeTab)?.label}". Hệ thống đang cập nhật dữ liệu.`
              }
            />
          ) : (
            <div className="tku-courses-grid">
              {filteredCourses.map((course) => (
                <div key={course.id} className="tku-course-card">
                  {/* Sẵn sàng render khi có dữ liệu thật từ API */}
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="tku-course-card__img"
                  />
                  <div className="tku-course-card__body">
                    <h3 className="tku-course-card__title">{course.title}</h3>
                    <p className="tku-course-card__teacher">{course.teacher}</p>
                    <div className="tku-course-card__footer">
                      <span className="tku-course-card__price">
                        {course.price.toLocaleString('vi-VN')}đ
                      </span>
                      <button type="button" className="tku-btn tku-btn--primary">
                        Tham gia ngay
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
