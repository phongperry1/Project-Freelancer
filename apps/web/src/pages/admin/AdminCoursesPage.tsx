import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ArrowUpRight,
  Edit3,
  BookOpen,
  RotateCw,
  AlertCircle,
  X,
  RotateCcw,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import {
  adminService,
  type AdminCourseItem,
  type AdminCoursesResponse,
} from '../../services/admin.service';
import { toast } from '../../context/toastService';
import './adminCourses.css';

export const AdminCoursesPage: React.FC = () => {
  const [data, setData] = useState<AdminCoursesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;
    adminService
      .getCoursesList()
      .then((res) => {
        if (isMounted) {
          setData(res);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không thể tải danh sách khóa học.',
          );
        }
      })
      .finally(() => {
        if (isMounted) {
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
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách khóa học.',
        );
      })
      .finally(() => {
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

      const matchTeacher =
        teacherFilter === 'ALL' || course.teacherId === teacherFilter;

      const matchGrade =
        gradeFilter === 'ALL' || (course.grade || '10') === gradeFilter;

      return matchKeyword && matchTeacher && matchGrade;
    });
  }, [coursesList, searchKeyword, teacherFilter, gradeFilter]);

  const handleResetFilters = useCallback(() => {
    setSearchKeyword('');
    setTeacherFilter('ALL');
    setGradeFilter('ALL');
  }, []);

  const [togglingCourseId, setTogglingCourseId] = useState<string | null>(null);

  const handleToggleStatus = useCallback(async (course: AdminCourseItem) => {
    const nextStatus: 'ACTIVE' | 'HIDDEN' =
      course.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
    setTogglingCourseId(course.id);
    try {
      await adminService.updateCourse(course.id, { status: nextStatus });
      setData((prev) => {
        if (!prev) return prev;
        const updatedCourses = prev.courses.map((item) => {
          if (item.id === course.id) {
            return {
              ...item,
              status: nextStatus,
              statusText: nextStatus === 'HIDDEN' ? 'Đã ẩn' : 'Đang hoạt động',
            };
          }
          return item;
        });
        const activeCount = updatedCourses.filter((c) => c.status === 'ACTIVE').length;
        const hiddenCount = updatedCourses.filter((c) => c.status === 'HIDDEN').length;
        return {
          ...prev,
          courses: updatedCourses,
          stats: {
            ...prev.stats,
            activeCourses: activeCount,
            hiddenCourses: hiddenCount,
            activePercentage:
              prev.stats.totalCourses > 0
                ? Math.round((activeCount / prev.stats.totalCourses) * 100)
                : 0,
          },
        };
      });
      toast.success(
        nextStatus === 'ACTIVE'
          ? `Đã hiện khóa học "${course.title}".`
          : `Đã ẩn khóa học "${course.title}".`,
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật trạng thái khóa học.',
      );
    } finally {
      setTogglingCourseId(null);
    }
  }, []);



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
              Theo dõi tên khóa học, giảng viên, số học sinh và bài học.
            </p>
          </div>
          <Link to="/admin/courses/create" className="tku-courses-banner__btn">
            Tạo khóa học
          </Link>
        </section>



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
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              disabled={teachers.length === 0}
            >
              <option value="ALL">
                {teachers.length === 0 ? 'Tất cả giảng viên (Chưa có dữ liệu)' : 'Tất cả giảng viên'}
              </option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="tku-courses-select-icon" />
          </div>

          <div className="tku-courses-select-wrap">
            <select
              className="tku-courses-select"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              <option value="ALL">Tất cả khối lớp</option>
              <option value="10">Hóa học Lớp 10</option>
              <option value="11">Hóa học Lớp 11</option>
              <option value="12">Hóa học Lớp 12</option>
              <option value="exam">Luyện thi THPT & ĐGNL</option>
              <option value="other">Chuyên đề khác</option>
            </select>
            <ChevronDown size={14} className="tku-courses-select-icon" />
          </div>

          {(searchKeyword || teacherFilter !== 'ALL' || gradeFilter !== 'ALL') && (
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
              <Link to="/admin/courses/create" className="tku-courses-empty__btn">
                Tạo khóa học mới
              </Link>
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
                    <th>Học sinh</th>
                    <th>Bài học</th>
                    <th style={{ textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((c) => (
                    <tr
                      key={c.id}
                      className={c.status === 'HIDDEN' ? 'tku-courses-row--hidden' : ''}
                    >
                      <td>
                        <div className="tku-course-cell">
                          {c.thumbnailUrl ? (
                            <Link
                              to={`/admin/courses/${c.id}`}
                              className="tku-course-thumb-link"
                              tabIndex={-1}
                              aria-hidden="true"
                            >
                              <img
                                src={c.thumbnailUrl}
                                alt={c.title}
                                className="tku-course-thumb-img"
                                loading="lazy"
                                onError={(e) => {
                                  const parent = (e.currentTarget as HTMLElement).parentElement;
                                  if (parent) {
                                    parent.className = 'tku-course-thumb-placeholder';
                                    parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tku-course-thumb-placeholder-icon"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
                                  }
                                }}
                              />
                            </Link>
                          ) : (
                            <div className="tku-course-thumb-placeholder" aria-hidden="true">
                              <BookOpen size={18} className="tku-course-thumb-placeholder-icon" />
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                            <Link
                              to={`/admin/courses/${c.id}`}
                              className="tku-course-item-title-link"
                              title={c.title}
                            >
                              {c.title}
                            </Link>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color:
                                    c.grade === '10'
                                      ? '#2563eb'
                                      : c.grade === '11'
                                        ? '#0d9488'
                                        : c.grade === '12'
                                          ? '#7c3aed'
                                          : c.grade === 'exam'
                                            ? '#d97706'
                                            : '#64748b',
                                  backgroundColor:
                                    c.grade === '10'
                                      ? '#eff6ff'
                                      : c.grade === '11'
                                        ? '#f0fdfa'
                                        : c.grade === '12'
                                          ? '#f5f3ff'
                                          : c.grade === 'exam'
                                            ? '#fffbeb'
                                            : '#f1f5f9',
                                  padding: '1px 7px',
                                  borderRadius: '4px',
                                  width: 'fit-content',
                                }}
                              >
                                {c.grade === '10'
                                  ? 'Lớp 10'
                                  : c.grade === '11'
                                    ? 'Lớp 11'
                                    : c.grade === '12'
                                      ? 'Lớp 12'
                                      : c.grade === 'exam'
                                        ? 'Luyện thi THPT'
                                        : 'Chuyên đề'}
                              </span>
                              {c.status === 'HIDDEN' && (
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    color: '#94a3b8',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  (Đang ẩn)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{c.teacherName}</td>
                      <td>{c.studentCount.toLocaleString('vi-VN')}</td>
                      <td>{c.lessonCount.toLocaleString('vi-VN')}</td>

                      <td>
                        <div className="tku-courses-actions">
                          <button
                            type="button"
                            className={`tku-courses-action-btn ${
                              c.status === 'HIDDEN'
                                ? 'tku-courses-action-btn--toggle-hidden'
                                : 'tku-courses-action-btn--toggle-active'
                            }`}
                            title={
                              c.status === 'ACTIVE'
                                ? 'Đang hiện - Bấm để ẩn khóa học'
                                : 'Đang ẩn - Bấm để hiện khóa học'
                            }
                            onClick={() => handleToggleStatus(c)}
                            disabled={togglingCourseId === c.id}
                            aria-label={
                              c.status === 'ACTIVE'
                                ? 'Ẩn khóa học'
                                : 'Hiện khóa học'
                            }
                          >
                            {c.status === 'ACTIVE' ? (
                              <Eye size={15} />
                            ) : (
                              <EyeOff size={15} />
                            )}
                          </button>
                          <Link
                            to={`/admin/courses/${c.id}`}
                            className="tku-courses-action-btn"
                            title="Xem chi tiết"
                          >
                            <ArrowUpRight size={15} />
                          </Link>
                          <Link
                            to={`/admin/activation-keys?courseId=${c.id}`}
                            className="tku-courses-action-btn"
                            title="Quản lý mã Key tham gia"
                            style={{ color: '#2563eb' }}
                          >
                            <KeyRound size={15} />
                          </Link>
                          <Link
                            to={`/admin/courses/${c.id}/edit`}
                            className="tku-courses-action-btn"
                            title="Chỉnh sửa khóa học"
                          >
                            <Edit3 size={15} />
                          </Link>
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
