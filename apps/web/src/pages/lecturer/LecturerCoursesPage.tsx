import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Users,
  Layers,
  Search,
  X,
  RotateCcw,
  ChevronDown,
  AlertCircle,
  RotateCw,
  Pencil,
} from 'lucide-react';
import {
  lecturerService,
  type LecturerCoursesResponse,
} from '../../services/lecturer.service';
import './lecturerCourses.css';

export const LecturerCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<LecturerCoursesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'students' | 'lessons'>('newest');

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await lecturerService.getAssignedCourses();
      setData(res);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách khóa học được phân công.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    lecturerService
      .getAssignedCourses()
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách khóa học được phân công.',
        );
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

  // Filtered & Sorted Courses
  const coursesList = data?.courses;
  const filteredCourses = useMemo(() => {
    if (!coursesList) return [];

    const result = coursesList.filter((c) => {
      const matchKeyword =
        !searchKeyword.trim() ||
        c.title.toLowerCase().includes(searchKeyword.trim().toLowerCase()) ||
        (c.description &&
          c.description.toLowerCase().includes(searchKeyword.trim().toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' || c.status === statusFilter;

      return matchKeyword && matchStatus;
    });

    // Sorting (result is a new array from filter, safe to sort in-place)
    result.sort((a, b) => {
      if (sortBy === 'students') {
        return b.studentCount - a.studentCount;
      }
      if (sortBy === 'lessons') {
        return b.lessonCount - a.lessonCount;
      }
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return result;
  }, [coursesList, searchKeyword, statusFilter, sortBy]);

  const handleResetFilters = useCallback(() => {
    setSearchKeyword('');
    setStatusFilter('ALL');
    setSortBy('newest');
  }, []);

  const stats = data?.stats || {
    totalCourses: 0,
    activeCourses: 0,
    hiddenCourses: 0,
    totalStudents: 0,
    totalLessons: 0,
  };

  const totalAssigned = data?.courses.length || 0;

  return (
    <div className="tku-lecturer-courses-page">
      {/* 1. Academic Banner */}
      <section className="tku-lecturer-courses-banner">
        <div className="tku-lecturer-courses-banner__content">
          <h1 className="tku-lecturer-courses-banner__title">
            Khóa học của tôi
          </h1>
          <p className="tku-lecturer-courses-banner__desc">
            Danh sách các khóa học bạn được phân công phụ trách giảng dạy. Bạn có
            thể quản lý và biên soạn giáo trình, tạo chương, thêm bài học và upload
            video bài giảng.
          </p>
        </div>
      </section>

      {/* 2. Stats Grid */}
      <section className="tku-lecturer-courses-stats-grid">
        <div className="tku-lecturer-courses-stat-card">
          <div className="tku-lecturer-courses-stat-icon tku-lecturer-courses-stat-icon--blue">
            <BookOpen size={22} />
          </div>
          <div className="tku-lecturer-courses-stat-info">
            <span className="tku-lecturer-courses-stat-label">Tổng khóa học</span>
            <span className="tku-lecturer-courses-stat-value">
              {stats.totalCourses}
            </span>
          </div>
        </div>

        <div className="tku-lecturer-courses-stat-card">
          <div className="tku-lecturer-courses-stat-icon tku-lecturer-courses-stat-icon--emerald">
            <CheckCircle2 size={22} />
          </div>
          <div className="tku-lecturer-courses-stat-info">
            <span className="tku-lecturer-courses-stat-label">Đang hoạt động</span>
            <span className="tku-lecturer-courses-stat-value">
              {stats.activeCourses}
            </span>
          </div>
        </div>

        <div className="tku-lecturer-courses-stat-card">
          <div className="tku-lecturer-courses-stat-icon tku-lecturer-courses-stat-icon--purple">
            <Users size={22} />
          </div>
          <div className="tku-lecturer-courses-stat-info">
            <span className="tku-lecturer-courses-stat-label">Tổng học viên</span>
            <span className="tku-lecturer-courses-stat-value">
              {stats.totalStudents.toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        <div className="tku-lecturer-courses-stat-card">
          <div className="tku-lecturer-courses-stat-icon tku-lecturer-courses-stat-icon--amber">
            <Layers size={22} />
          </div>
          <div className="tku-lecturer-courses-stat-info">
            <span className="tku-lecturer-courses-stat-label">Tổng bài giảng</span>
            <span className="tku-lecturer-courses-stat-value">
              {stats.totalLessons.toLocaleString('vi-VN')}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Filter Bar */}
      <section className="tku-lecturer-courses-filter-bar">
        <div className="tku-lecturer-courses-search-wrap">
          <Search size={16} className="tku-lecturer-courses-search-icon" />
          <input
            type="text"
            className="tku-lecturer-courses-search-input"
            placeholder="Tìm theo tên khóa học hoặc mô tả..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          {searchKeyword && (
            <button
              type="button"
              className="tku-lecturer-courses-search-clear"
              onClick={() => setSearchKeyword('')}
              title="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="tku-lecturer-courses-select-wrap">
          <select
            className="tku-lecturer-courses-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Lọc theo trạng thái"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="HIDDEN">Đã ẩn</option>
          </select>
          <ChevronDown size={14} className="tku-lecturer-courses-select-icon" />
        </div>

        <div className="tku-lecturer-courses-select-wrap">
          <select
            className="tku-lecturer-courses-select"
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'newest' | 'students' | 'lessons')
            }
            aria-label="Sắp xếp theo"
          >
            <option value="newest">Mới nhất</option>
            <option value="students">Nhiều học viên nhất</option>
            <option value="lessons">Nhiều bài học nhất</option>
          </select>
          <ChevronDown size={14} className="tku-lecturer-courses-select-icon" />
        </div>

        {(searchKeyword || statusFilter !== 'ALL' || sortBy !== 'newest') && (
          <button
            type="button"
            className="tku-lecturer-courses-reset-btn"
            onClick={handleResetFilters}
            title="Đặt lại bộ lọc"
          >
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        )}
      </section>

      {/* 4. Main Content Area */}
      {isLoading ? (
        <div className="tku-lecturer-courses-empty">
          <div className="tku-lecturer-spinner" />
          <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>
            Đang tải danh sách khóa học được phân công...
          </span>
        </div>
      ) : error ? (
        <div className="tku-lecturer-courses-empty">
          <div
            className="tku-lecturer-courses-empty-icon"
            style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
          >
            <AlertCircle size={32} />
          </div>
          <h3 className="tku-lecturer-courses-empty-title">
            Không thể tải dữ liệu
          </h3>
          <p className="tku-lecturer-courses-empty-desc">{error}</p>
          <button
            type="button"
            className="tku-lecturer-courses-reset-btn"
            onClick={fetchCourses}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RotateCw size={14} />
            <span>Thử lại</span>
          </button>
        </div>
      ) : totalAssigned === 0 ? (
        /* Empty State chuẩn mực khi chưa có khóa học phân công */
        <div className="tku-lecturer-courses-empty">
          <div className="tku-lecturer-courses-empty-icon">
            <BookOpen size={32} />
          </div>
          <h3 className="tku-lecturer-courses-empty-title">
            Chưa có khóa học nào được phân công
          </h3>
          <p className="tku-lecturer-courses-empty-desc">
            Hiện tại bạn chưa được quản trị viên phân công phụ trách khóa học nào
            trên hệ thống. Khi có phân công khóa học mới, thông tin sẽ xuất hiện
            tại đây.
          </p>
        </div>
      ) : filteredCourses.length === 0 ? (
        /* Empty State khi lọc tìm kiếm không có kết quả */
        <div className="tku-lecturer-courses-empty">
          <div className="tku-lecturer-courses-empty-icon">
            <Search size={30} />
          </div>
          <h3 className="tku-lecturer-courses-empty-title">
            Không tìm thấy khóa học phù hợp
          </h3>
          <p className="tku-lecturer-courses-empty-desc">
            Không có khóa học nào khớp với từ khóa tìm kiếm hoặc các điều kiện lọc
            hiện tại.
          </p>
          <button
            type="button"
            className="tku-lecturer-courses-reset-btn"
            onClick={handleResetFilters}
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        /* Table / List View */
        <div className="tku-lecturer-courses-table-card">
          <div className="tku-lecturer-courses-table-wrap">
            <table className="tku-lecturer-courses-table">
              <thead>
                <tr>
                  <th>Khóa học</th>
                  <th>Học viên</th>
                  <th>Chương</th>
                  <th>Bài giảng</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="tku-lecturer-table-course-cell">
                        {c.thumbnailUrl ? (
                          <img
                            src={c.thumbnailUrl}
                            alt={c.title}
                            className="tku-lecturer-table-thumb"
                          />
                        ) : (
                          <div
                            className="tku-lecturer-table-thumb"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94a3b8',
                            }}
                          >
                            <BookOpen size={20} />
                          </div>
                        )}
                        <span className="tku-lecturer-table-course-title">
                          {c.title}
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong>{c.studentCount}</strong> học viên
                    </td>
                    <td>{c.chapterCount} chương</td>
                    <td>{c.lessonCount} bài</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="tku-lecturer-pencil-action-btn"
                        onClick={() =>
                          navigate(`/lecturer/courses/${c.id}/curriculum`)
                        }
                        title="Biên soạn nội dung & giáo trình"
                        aria-label="Biên soạn nội dung & giáo trình"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerCoursesPage;
