import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Users,
  PenLine,
  TrendingUp,
  ArrowRight,
  BookOpen,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import {
  lecturerService,
  type LecturerDashboardData,
} from '../../services/lecturer.service';
import './lecturerDashboard.css';

const DashboardLoading: React.FC = () => (
  <div className="tku-lecturer-empty-state">
    <div className="tku-lecturer-spinner" />
    <span className="tku-lecturer-empty-state__title">
      Đang tải dữ liệu...
    </span>
  </div>
);

export const LecturerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<LecturerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    lecturerService
      .getDashboardData()
      .then((res) => {
        if (isMounted) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Display Name / Greeting
  const teacherFullName = user?.fullName || 'Giảng viên';
  const cleanLecturerName = useMemo(() => {
    // Clean out parentheses such as (K17 DN)
    const cleaned = teacherFullName.replace(/\s*\([^)]*\)/g, '').trim();
    return cleaned || 'Giảng viên';
  }, [teacherFullName]);

  // Greeting based on current hour
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }, []);

  const stats = data?.stats;
  const courses = data?.courses || [];
  const submissions = data?.submissions || [];

  return (
    <div className="tku-lecturer-dashboard">
      {/* Top Banner Greeting */}
      <section className="tku-lecturer-banner">
        <div className="tku-lecturer-banner__left">
          <h1 className="tku-lecturer-banner__title">
            {greetingText}, giảng viên {cleanLecturerName}!
          </h1>
          <p className="tku-lecturer-banner__desc">
            Đây là tổng quan lớp học và những việc cần bạn xử lý hôm nay.
          </p>
        </div>
      </section>

      {/* Row 1: 4 Quick Stat Cards */}
      <section className="tku-lecturer-stats-grid">
        {/* Card 1 */}
        <div className="tku-lecturer-stat-card">
          <div className="tku-lecturer-stat-card__top">
            <span className="tku-lecturer-stat-card__title">
              Khóa học được phân công
            </span>
            <div className="tku-lecturer-stat-card__icon-box tku-lecturer-stat-card__icon-box--blue">
              <FolderKanban size={18} />
            </div>
          </div>
          <div className="tku-lecturer-stat-card__value">
            {stats ? stats.totalCourses : 0}
          </div>
          <div className="tku-lecturer-stat-card__sub">
            {stats && stats.totalCourses > 0 ? (
              <>
                <span className="tku-lecturer-stat-highlight--blue">
                  {stats.publishedCourses} đang xuất bản
                </span>{' '}
                • {stats.draftCourses} bản nháp
              </>
            ) : (
              'Chưa có khóa học nào'
            )}
          </div>
        </div>

        {/* Card 2 */}
        <div className="tku-lecturer-stat-card">
          <div className="tku-lecturer-stat-card__top">
            <span className="tku-lecturer-stat-card__title">Tổng số học sinh</span>
            <div className="tku-lecturer-stat-card__icon-box tku-lecturer-stat-card__icon-box--cyan">
              <Users size={18} />
            </div>
          </div>
          <div className="tku-lecturer-stat-card__value">
            {stats ? stats.totalStudents.toLocaleString('vi-VN') : 0}
          </div>
          <div className="tku-lecturer-stat-card__sub">
            {stats && stats.newStudentsThisMonth > 0 ? (
              <>
                <span className="tku-lecturer-stat-pill--green">
                  +{stats.newStudentsThisMonth} học sinh
                </span>{' '}
                trong tháng này
              </>
            ) : (
              '0 học sinh trong tháng này'
            )}
          </div>
        </div>

        {/* Card 3 */}
        <div className="tku-lecturer-stat-card">
          <div className="tku-lecturer-stat-card__top">
            <span className="tku-lecturer-stat-card__title">Bài cần chấm</span>
            <div className="tku-lecturer-stat-card__icon-box tku-lecturer-stat-card__icon-box--amber">
              <PenLine size={18} />
            </div>
          </div>
          <div className="tku-lecturer-stat-card__value">
            {stats ? stats.pendingGrading : 0}
          </div>
          <div className="tku-lecturer-stat-card__sub">
            {stats && stats.pendingGrading > 0
              ? `${stats.essayCount} bài tự luận • ${stats.quizCount} bài kiểm tra`
              : 'Không có bài cần chấm'}
          </div>
        </div>

        {/* Card 4 */}
        <div className="tku-lecturer-stat-card">
          <div className="tku-lecturer-stat-card__top">
            <span className="tku-lecturer-stat-card__title">
              Tiến độ học tập trung bình
            </span>
            <div className="tku-lecturer-stat-card__icon-box tku-lecturer-stat-card__icon-box--emerald">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="tku-lecturer-stat-card__value">
            {stats ? `${stats.averageProgress}%` : '0%'}
          </div>
          <div className="tku-lecturer-stat-card__sub">
            {stats && stats.progressChange !== 0 ? (
              <>
                <span className="tku-lecturer-stat-highlight--green">
                  {stats.progressChange > 0 ? '↑' : '↓'}{' '}
                  {Math.abs(stats.progressChange)}%
                </span>{' '}
                so với tháng trước
              </>
            ) : (
              'Chưa có dữ liệu tiến độ'
            )}
          </div>
        </div>
      </section>

      {/* Row 2: 2 Bảng công việc cốt lõi của Giảng viên */}
      <section className="tku-lecturer-columns-grid">
        {/* Khối 1: Khóa học của tôi */}
        <div className="tku-lecturer-card">
          <div className="tku-lecturer-card__header">
            <div className="tku-lecturer-card__header-titles">
              <h2 className="tku-lecturer-card__title">Khóa học của tôi</h2>
              <p className="tku-lecturer-card__subtitle">
                Theo dõi nhanh nội dung và số lượng học sinh
              </p>
            </div>
            {courses.length > 0 && (
              <Link to="/lecturer/courses" className="tku-lecturer-card__link">
                <span>Xem tất cả</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {isLoading ? (
            <DashboardLoading />
          ) : courses.length === 0 ? (
            <div className="tku-lecturer-empty-state">
              <div className="tku-lecturer-empty-state__icon">
                <BookOpen size={24} />
              </div>
              <span className="tku-lecturer-empty-state__title">
                Chưa có dữ liệu
              </span>
              <p className="tku-lecturer-empty-state__desc">
                Hiện tại bạn chưa được phân công phụ trách khóa học nào.
              </p>
            </div>
          ) : (
            <div className="tku-lecturer-course-list">
              {courses.map((c) => (
                <div key={c.id} className="tku-lecturer-course-item">
                  <div className="tku-lecturer-course-left">
                    <div
                      className={`tku-lecturer-course-symbol tku-lecturer-course-symbol--${c.symbolType || 'blue'}`}
                    >
                      {c.symbol || '∑'}
                    </div>
                    <div className="tku-lecturer-course-info">
                      <span className="tku-lecturer-course-title">{c.title}</span>
                      <span className="tku-lecturer-course-meta">
                        {c.studentCount ?? c.studentsCount ?? 0} học sinh •{' '}
                        {c.chapterCount ?? c.chaptersCount ?? 0} chương • Cập
                        nhật {c.updatedAt}
                      </span>
                    </div>
                  </div>

                  <div className="tku-lecturer-course-right">
                    <div className="tku-lecturer-course-pct">
                      {c.progressPercent}%
                      <span className="tku-lecturer-course-pct-label">
                        hoàn thành
                      </span>
                    </div>
                    <div className="tku-lecturer-progress-track">
                      <div
                        className="tku-lecturer-progress-fill"
                        style={{ width: `${c.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Khối 2: Bài làm cần chấm */}
        <div className="tku-lecturer-card">
          <div className="tku-lecturer-card__header">
            <div className="tku-lecturer-card__header-titles">
              <h2 className="tku-lecturer-card__title">Bài làm cần chấm</h2>
              <p className="tku-lecturer-card__subtitle">
                Ưu tiên xử lý các bài đã nộp gần đây
              </p>
            </div>
            {submissions.length > 0 && (
              <Link to="/lecturer/grading" className="tku-lecturer-card__link">
                <span>Xem tất cả</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {isLoading ? (
            <DashboardLoading />
          ) : submissions.length === 0 ? (
            <div className="tku-lecturer-empty-state">
              <div className="tku-lecturer-empty-state__icon">
                <ClipboardCheck size={24} />
              </div>
              <span className="tku-lecturer-empty-state__title">
                Chưa có dữ liệu
              </span>
              <p className="tku-lecturer-empty-state__desc">
                Hiện không có bài làm nào đang chờ chấm điểm.
              </p>
            </div>
          ) : (
            <div className="tku-lecturer-table-wrap">
              <table className="tku-lecturer-table">
                <thead>
                  <tr>
                    <th>Học sinh</th>
                    <th>Bài kiểm tra</th>
                    <th>Ngày nộp</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td>
                        <div className="tku-lecturer-student-cell">
                          <div className="tku-lecturer-student-avatar">
                            {sub.studentInitials || 'HS'}
                          </div>
                          <div>
                            <div className="tku-lecturer-student-name">
                              {sub.studentName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="tku-lecturer-exam-title" title={sub.examTitle}>
                          {sub.examTitle}
                        </div>
                      </td>
                      <td>
                        <div className="tku-lecturer-exam-time">
                          {sub.submittedAt}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`tku-lecturer-status-pill ${
                            sub.status === 'pending'
                              ? 'tku-lecturer-status-pill--pending'
                              : 'tku-lecturer-status-pill--recheck'
                          }`}
                        >
                          {sub.statusText}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="tku-lecturer-grade-btn"
                        >
                          Chấm ngay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default LecturerDashboardPage;
