import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  Plus,
  ArrowUpRight,
  Edit3,
  BookOpen,
  RotateCw,
  AlertCircle,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  adminService,
  type AdminCourseItem,
  type AdminCoursesResponse,
} from '../../services/admin.service';
import './adminCourses.css';

export const AdminCoursesPage: React.FC = () => {
  const [data, setData] = useState<AdminCoursesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;
    adminService
      .getCoursesList()
      .then((res) => {
        if (isMounted) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không thể tải danh sách khóa học.',
          );
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    adminService
      .getCoursesList()
      .then((res) => {
        setData(res);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách khóa học.',
        );
        setIsLoading(false);
      });
  }, []);

  const coursesList = data?.courses;
  const filteredCourses = useMemo(() => {
    if (!coursesList) return [];
    const query = searchKeyword.trim().toLowerCase();

    return coursesList.filter((course: AdminCourseItem) => {
      const matchKeyword =
        !query || course.title.toLowerCase().includes(query);

      const matchStatus =
        statusFilter === 'ALL' || course.status === statusFilter;

      const matchTeacher =
        teacherFilter === 'ALL' || course.teacherId === teacherFilter;

      return matchKeyword && matchStatus && matchTeacher;
    });
  }, [coursesList, searchKeyword, statusFilter, teacherFilter]);

  const handleResetFilters = useCallback(() => {
    setSearchKeyword('');
    setStatusFilter('ALL');
    setTeacherFilter('ALL');
  }, []);

  const stats = useMemo(
    () =>
      data?.stats ?? {
        totalCourses: 0,
        publishedCourses: 0,
        archivedCourses: 0,
        draftCourses: 0,
        publishedPercentage: 0,
      },
    [data?.stats],
  );

  const teachers = useMemo(() => data?.teachers ?? [], [data?.teachers]);
  const totalInDb = data?.courses?.length ?? 0;

  return (
    <div className="tku-courses-page">
      <header className="tku-admin-header">
        <div className="tku-admin-header__titles">
          <h1 className="tku-admin-header__title">Danh sách khóa học</h1>
          <p className="tku-admin-header__subtitle">
            Xem và lọc toàn bộ khóa học trên hệ thống.
          </p>
        </div>
      </header>

      <div className="tku-courses-content">
        {isLoading ? (
          <div className="tku-admin-loading-wrapper">
            <div className="tku-admin-spinner" />
            <span>Đang tải danh sách khóa học...</span>
          </div>
        ) : error ? (
          <div className="tku-courses-card">
            <div className="tku-courses-empty">
              <div
                className="tku-courses-empty__icon"
                style={{ background: '#fef2f2', color: '#ef4444' }}
              >
                <AlertCircle size={28} />
              </div>
              <h3 className="tku-courses-empty__title">Không thể tải dữ liệu</h3>
              <p className="tku-courses-empty__desc">{error}</p>
              <button
                type="button"
                className="tku-courses-empty__btn"
                onClick={handleRetry}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <RotateCw size={15} />
                <span>Thử lại</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <section className="tku-courses-banner">
          <div className="tku-courses-banner__content">
            <h2 className="tku-courses-banner__title">
              Danh sách tất cả khóa học
            </h2>
            <p className="tku-courses-banner__desc">
              Theo dõi tên khóa học, giảng viên, số học sinh và trạng thái hiển thị.
            </p>
          </div>
          <button
            type="button"
            className="tku-courses-banner__btn"
            onClick={() => {
              alert('Chức năng tạo khóa học đang được hoàn thiện.');
            }}
          >
            <Plus size={16} />
            <span>Tạo khóa học</span>
          </button>
        </section>

        <div className="tku-courses-stats-grid">
          <div className="tku-courses-stat-card">
            <span className="tku-courses-stat-card__label">Tổng khóa học</span>
            <span className="tku-courses-stat-card__value">
              {stats.totalCourses.toLocaleString('vi-VN')}
            </span>
            <span className="tku-courses-stat-card__sub tku-courses-stat-card__sub--green">
              {stats.totalCourses > 0 ? '+6 tháng này' : 'Hệ thống TKU'}
            </span>
          </div>

          <div className="tku-courses-stat-card">
            <span className="tku-courses-stat-card__label">Đang xuất bản</span>
            <span className="tku-courses-stat-card__value">
              {stats.publishedCourses.toLocaleString('vi-VN')}
            </span>
            <span className="tku-courses-stat-card__sub tku-courses-stat-card__sub--green">
              {stats.publishedPercentage}% tổng số
            </span>
          </div>

          <div className="tku-courses-stat-card">
            <span className="tku-courses-stat-card__label">Đã lưu trữ</span>
            <span className="tku-courses-stat-card__value">
              {stats.archivedCourses.toLocaleString('vi-VN')}
            </span>
            <span className="tku-courses-stat-card__sub tku-courses-stat-card__sub--gray">
              Cần rà soát
            </span>
          </div>

          <div className="tku-courses-stat-card">
            <span className="tku-courses-stat-card__label">Bản nháp</span>
            <span className="tku-courses-stat-card__value">
              {stats.draftCourses.toLocaleString('vi-VN')}
            </span>
            <span className="tku-courses-stat-card__sub tku-courses-stat-card__sub--amber">
              Chờ hoàn thiện
            </span>
          </div>
        </div>

        <div className="tku-courses-filter-bar">
          <div className="tku-courses-search-wrap">
            <Search size={16} className="tku-courses-search-icon" />
            <input
              type="text"
              className="tku-courses-search-input"
              placeholder="Tìm theo tên khóa học..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            {searchKeyword && (
              <button
                type="button"
                className="tku-courses-search-clear"
                onClick={() => setSearchKeyword('')}
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="tku-courses-select-wrap">
            <select
              className="tku-courses-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PUBLISHED">Đang xuất bản</option>
              <option value="ARCHIVED">Đã lưu trữ</option>
              <option value="DRAFT">Bản nháp</option>
            </select>
            <ChevronDown size={14} className="tku-courses-select-icon" />
          </div>

          <div className="tku-courses-select-wrap">
            <select
              className="tku-courses-select"
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
            >
              <option value="ALL">Tất cả giảng viên</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="tku-courses-select-icon" />
          </div>

          {(searchKeyword || statusFilter !== 'ALL' || teacherFilter !== 'ALL') && (
            <button
              type="button"
              className="tku-courses-filter-reset-btn"
              onClick={handleResetFilters}
              title="Đặt lại bộ lọc"
            >
              <RotateCcw size={13} />
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        <div className="tku-courses-card">
          <div className="tku-courses-card-header">
            <h3 className="tku-courses-card-title">Khóa học hiện có</h3>
            <span className="tku-courses-card-meta">
              {filteredCourses.length} khóa học
            </span>
          </div>

          {totalInDb === 0 ? (
            <div className="tku-courses-empty">
              <div className="tku-courses-empty__icon">
                <BookOpen size={28} />
              </div>
              <h3 className="tku-courses-empty__title">
                Chưa có khóa học nào trên hệ thống
              </h3>
              <p className="tku-courses-empty__desc">
                Cơ sở dữ liệu hiện tại chưa có khóa học nào được khởi tạo. Hãy bấm
                nút bên dưới để tạo khóa học đầu tiên cho nền tảng.
              </p>
              <button
                type="button"
                className="tku-courses-empty__btn"
                onClick={() => {
                  alert('Chức năng tạo khóa học đang được hoàn thiện.');
                }}
              >
                + Tạo khóa học mới
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="tku-courses-empty">
              <div className="tku-courses-empty__icon">
                <Search size={28} />
              </div>
              <h3 className="tku-courses-empty__title">
                Không tìm thấy khóa học phù hợp
              </h3>
              <p className="tku-courses-empty__desc">
                Không có khóa học nào khớp với từ khóa tìm kiếm hoặc các điều kiện
                lọc hiện tại.
              </p>
              <button
                type="button"
                className="tku-courses-empty__btn"
                onClick={handleResetFilters}
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="tku-courses-table-wrap">
              <table className="tku-courses-table">
                <thead>
                  <tr>
                    <th>Khóa học</th>
                    <th>Giảng viên</th>
                    <th>Khối</th>
                    <th>Học sinh</th>
                    <th>Bài học</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="tku-course-item-title">{c.title}</div>
                        <div className="tku-course-item-date">{c.updatedAt}</div>
                      </td>
                      <td>{c.teacherName}</td>
                      <td>{c.grade}</td>
                      <td>{c.studentCount.toLocaleString('vi-VN')}</td>
                      <td>{c.lessonCount.toLocaleString('vi-VN')}</td>
                      <td>
                        <span
                          className={`tku-courses-badge ${
                            c.status === 'PUBLISHED'
                              ? 'tku-courses-badge--published'
                              : c.status === 'ARCHIVED'
                                ? 'tku-courses-badge--archived'
                                : 'tku-courses-badge--draft'
                          }`}
                        >
                          {c.statusText}
                        </span>
                      </td>
                      <td>
                        <div className="tku-courses-actions">
                          <button
                            type="button"
                            className="tku-courses-action-btn"
                            title="Xem chi tiết"
                            onClick={() => {
                              alert(`Xem chi tiết khóa học: ${c.title}`);
                            }}
                          >
                            <ArrowUpRight size={15} />
                          </button>
                          <button
                            type="button"
                            className="tku-courses-action-btn"
                            title="Chỉnh sửa khóa học"
                            onClick={() => {
                              alert(`Chỉnh sửa khóa học: ${c.title}`);
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
      )}
      </div>
    </div>
  );
};

export default AdminCoursesPage;
