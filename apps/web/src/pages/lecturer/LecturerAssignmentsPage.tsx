import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FilePenLine,
  Plus,
  Search,
  X,
  RotateCcw,
  BookOpen,
  Users,
  Clock,
  Calendar,
  Trash2,
  FileQuestion,
  Send,
  Sparkles,
  ChevronDown,
  Pencil,
  Loader2,
  Layers,
  Award,
} from 'lucide-react';
import {
  lecturerService,
  type LecturerCourseItem,
  type AssignmentItem,
} from '../../services/lecturer.service';
import { toast } from '../../context/toastService';
import './lecturerAssignments.css';

export const LecturerAssignmentsPage: React.FC = () => {
  const navigate = useNavigate();

  // Assignments loaded from PostgreSQL database
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<LecturerCourseItem[]>([]);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Delete Confirmation Modal State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Load assignments from PostgreSQL database
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await lecturerService.getAssessments();
      setAssignments(list);
    } catch {
      toast.error('Không thể tải danh sách bài tập từ cơ sở dữ liệu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchCoursesAndAssignments = async () => {
      try {
        const [courseRes, assignmentList] = await Promise.all([
          lecturerService.getMyCourses(),
          lecturerService.getAssessments(),
        ]);
        if (isMounted) {
          const list = courseRes.courses || [];
          setCourses(list);
          setAssignments(assignmentList);
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchCoursesAndAssignments();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteTargetId) setDeleteTargetId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteTargetId]);

  // Dynamic Metrics Calculation memoized
  const stats = useMemo(() => {
    const total = assignments.length;
    const assigned = assignments.filter((a) => a.status === 'ASSIGNED').length;
    const draft = assignments.filter((a) => a.status === 'DRAFT').length;
    const totalSubmissions = assignments.reduce((sum, a) => sum + (a.submittedCount || 0), 0);
    return { total, assigned, draft, totalSubmissions };
  }, [assignments]);

  // Filtered List memoized
  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(term);
        const matchCourse = item.courseTitle.toLowerCase().includes(term);
        if (!matchTitle && !matchCourse) return false;
      }
      if (selectedCourseFilter !== 'ALL' && item.courseId !== selectedCourseFilter) {
        return false;
      }
      if (selectedTypeFilter !== 'ALL' && item.type !== selectedTypeFilter) {
        return false;
      }
      if (selectedStatusFilter !== 'ALL' && item.status !== selectedStatusFilter) {
        return false;
      }
      return true;
    });
  }, [assignments, searchTerm, selectedCourseFilter, selectedTypeFilter, selectedStatusFilter]);


  // Handle Delete
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTargetId) return;
    const targetId = deleteTargetId;
    setDeleteTargetId(null);

    try {
      const success = await lecturerService.deleteAssessment(targetId);
      if (success) {
        toast.success('Đã xóa bài tập');
        setAssignments((prev) => prev.filter((a) => a.id !== targetId));
      } else {
        toast.error('Có lỗi khi xóa bài tập');
        await loadData();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi khi xóa bài tập';
      toast.error(msg);
      await loadData();
    }
  }, [deleteTargetId, loadData]);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCourseFilter('ALL');
    setSelectedTypeFilter('ALL');
    setSelectedStatusFilter('ALL');
  }, []);

  return (
    <div className="tku-assignments-page">
      {/* 1. Academic Header Banner */}
      <section className="tku-assignments-banner">
        <div className="tku-assignments-banner__content">
          <div className="tku-banner-pill">
            <Sparkles size={14} />
            <span>Khảo thí & Đánh giá năng lực học sinh</span>
          </div>
          <h1 className="tku-assignments-banner__title">
            Quản lý Bài tập & Đề kiểm tra
          </h1>
          <p className="tku-assignments-banner__desc">
            Quy trình biên soạn độc lập chia theo từng trang chuyên biệt: Tạo câu hỏi → Thiết lập đáp án, lời giải & thang điểm → Giao bài cho học sinh.
          </p>
        </div>

        <div className="tku-assignments-banner__action">
          <button
            type="button"
            className="tku-btn-create-assignment"
            onClick={() => navigate('/lecturer/assignments/create')}
          >
            <Plus size={18} />
            <span>Tạo bài tập / kiểm tra mới</span>
          </button>
        </div>
      </section>

      {/* 2. Stats Metric Cards */}
      <section className="tku-assignments-stats-grid">
        <div className="tku-assignments-stat-card">
          <div className="tku-assignments-stat-icon tku-assignments-stat-icon--blue">
            <FilePenLine size={24} />
          </div>
          <div className="tku-assignments-stat-info">
            <span className="tku-assignments-stat-label">Tổng số bài</span>
            <span className="tku-assignments-stat-value">{stats.total}</span>
          </div>
        </div>

        <div className="tku-assignments-stat-card">
          <div className="tku-assignments-stat-icon tku-assignments-stat-icon--emerald">
            <Send size={24} />
          </div>
          <div className="tku-assignments-stat-info">
            <span className="tku-assignments-stat-label">Đang mở / Đã giao</span>
            <span className="tku-assignments-stat-value">{stats.assigned}</span>
          </div>
        </div>

        <div className="tku-assignments-stat-card">
          <div className="tku-assignments-stat-icon tku-assignments-stat-icon--purple">
            <FileQuestion size={24} />
          </div>
          <div className="tku-assignments-stat-info">
            <span className="tku-assignments-stat-label">Bản nháp</span>
            <span className="tku-assignments-stat-value">{stats.draft}</span>
          </div>
        </div>

        <div className="tku-assignments-stat-card">
          <div className="tku-assignments-stat-icon tku-assignments-stat-icon--amber">
            <Users size={24} />
          </div>
          <div className="tku-assignments-stat-info">
            <span className="tku-assignments-stat-label">Lượt nộp bài</span>
            <span className="tku-assignments-stat-value">{stats.totalSubmissions}</span>
          </div>
        </div>
      </section>

      {/* 3. Search & Filter Bar */}
      <section className="tku-assignments-filter-bar">
        <div className="tku-assignments-search-wrap">
          <Search size={16} className="tku-assignments-search-icon" />
          <input
            type="text"
            className="tku-assignments-search-input"
            placeholder="Tìm kiếm bài tập theo tên hoặc khóa học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="tku-assignments-search-clear"
              onClick={() => setSearchTerm('')}
              title="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="tku-assignments-select-wrap">
          <select
            className="tku-assignments-select"
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
          >
            <option value="ALL">Tất cả khóa học</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="tku-assignments-select-icon" />
        </div>

        <div className="tku-assignments-select-wrap">
          <select
            className="tku-assignments-select"
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
          >
            <option value="ALL">Tất cả loại bài</option>
            <option value="QUIZ">Bài tập ngắn (Quiz)</option>
            <option value="TEST">Kiểm tra định kỳ (1 tiết)</option>
            <option value="EXAM">Đề thi học kỳ</option>
          </select>
          <ChevronDown size={14} className="tku-assignments-select-icon" />
        </div>

        <div className="tku-assignments-select-wrap">
          <select
            className="tku-assignments-select"
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ASSIGNED">Đang mở / Đã giao</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
          <ChevronDown size={14} className="tku-assignments-select-icon" />
        </div>
      </section>

      {/* 4. Assignments Content: Loading State OR Empty State OR Rich Table */}
      {isLoading ? (
        <div className="tku-lecturer-loading-wrapper" style={{ minHeight: '320px' }} role="status" aria-live="polite">
          <Loader2 size={36} className="tku-lecturer-spin-icon" />
          <span>Đang tải danh sách bài tập từ hệ thống...</span>
        </div>
      ) : assignments.length === 0 ? (
        <section className="tku-assignments-empty-box">
          <div className="tku-assignments-empty-graphic">
            <FilePenLine size={44} className="tku-empty-icon" />
          </div>
          <h2 className="tku-assignments-empty-title">
            Chưa có bài tập hoặc đề kiểm tra nào
          </h2>
          <p className="tku-assignments-empty-desc">
            Hiện tại trong hệ thống chưa có dữ liệu bài tập hoặc bài kiểm tra. Hãy bắt đầu bằng cách bấm vào nút <strong>"Tạo bài tập / kiểm tra mới"</strong> ở góc trên bên phải để soạn đề thi.
          </p>
        </section>
      ) : filteredAssignments.length === 0 ? (
        <section className="tku-assignments-empty-box">
          <div className="tku-assignments-empty-graphic">
            <Search size={36} className="tku-empty-icon" />
          </div>
          <h2 className="tku-assignments-empty-title">
            Không tìm thấy bài tập phù hợp
          </h2>
          <p className="tku-assignments-empty-desc">
            Không có kết quả nào khớp với bộ lọc tìm kiếm hiện tại. Hãy thử tìm từ khóa khác hoặc bấm đặt lại bộ lọc.
          </p>
          <button
            type="button"
            className="tku-assignments-reset-btn"
            onClick={resetFilters}
          >
            <RotateCcw size={14} />
            <span>Đặt lại bộ lọc</span>
          </button>
        </section>
      ) : (
        <section className="tku-assignments-table-card">
          <div className="tku-table-responsive">
            <table className="tku-assignments-table">
              <thead>
                <tr>
                  <th className="tku-asg-th-title">Tên bài tập & Khóa học</th>
                  <th className="tku-asg-th-type">Phân loại</th>
                  <th className="tku-asg-th-metric">Quy mô & Thang điểm</th>
                  <th className="tku-asg-th-time">Thời lượng & Hạn nộp</th>
                  <th className="tku-asg-th-status">Trạng thái</th>
                  <th className="tku-asg-th-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((asg) => (
                  <tr key={asg.id}>
                    <td className="tku-asg-td-title">
                      <div className="tku-asg-title-cell">
                        <span className="tku-asg-title-text" title={asg.title}>
                          {asg.title}
                        </span>
                        <div className="tku-asg-course-sub">
                          <BookOpen size={12} />
                          <span>{asg.courseTitle}</span>
                        </div>
                      </div>
                    </td>

                    <td className="tku-asg-td-type">
                      <span
                        className={`tku-asg-type-badge ${
                          asg.type === 'EXAM'
                            ? 'tku-asg-type-badge--exam'
                            : asg.type === 'TEST'
                            ? 'tku-asg-type-badge--test'
                            : 'tku-asg-type-badge--quiz'
                        }`}
                      >
                        {asg.type === 'QUIZ' && 'Bài tập (Quiz)'}
                        {asg.type === 'TEST' && 'Kiểm tra 1 tiết'}
                        {asg.type === 'EXAM' && 'Thi học kỳ'}
                      </span>
                    </td>

                    <td className="tku-asg-td-metric">
                      <div className="tku-asg-metric-cell">
                        {/* Badges số câu hỏi và thang điểm */}
                        <div className="tku-asg-metric-badges">
                          <span className="tku-asg-stat-tag tku-asg-stat-tag--questions">
                            <FileQuestion size={12} className="tku-asg-tag-icon" />
                            <span><strong>{asg.questionCount ?? asg.questions?.length ?? 0}</strong> câu</span>
                          </span>
                          <span className="tku-asg-stat-tag tku-asg-stat-tag--score">
                            <Award size={12} className="tku-asg-tag-icon" />
                            <span><strong>{asg.totalScore}</strong> điểm</span>
                          </span>
                        </div>

                        {/* Tiến độ học sinh nộp bài */}
                        {asg.assignedStudentsCount > 0 ? (
                          <div className="tku-asg-submit-meter">
                            <div className="tku-asg-submit-meter-info">
                              <span className="tku-asg-submit-meter-text">
                                <Users size={12} className="tku-asg-submit-meter-icon" />
                                <span>
                                  <strong>{asg.submittedCount}</strong>/{asg.assignedStudentsCount} đã nộp
                                </span>
                              </span>
                              <span className="tku-asg-submit-meter-percent">
                                {Math.round(
                                  (asg.submittedCount / asg.assignedStudentsCount) * 100
                                )}%
                              </span>
                            </div>
                            <div className="tku-asg-meter-bar">
                              <div
                                className={`tku-asg-meter-bar-fill ${
                                  asg.submittedCount === asg.assignedStudentsCount
                                    ? 'tku-asg-meter-bar-fill--full'
                                    : ''
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.round(
                                      (asg.submittedCount / asg.assignedStudentsCount) * 100
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="tku-asg-unassigned-tag">
                            <Users size={12} className="tku-asg-unassigned-icon" />
                            <span>Chưa giao học sinh</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="tku-asg-td-time">
                      <div className="tku-asg-time-cell">
                        <div className="tku-time-item tku-time-item--duration">
                          <Clock size={13} className="tku-time-icon-clock" />
                          <span>
                            {asg.durationMinutes
                              ? `${asg.durationMinutes} phút`
                              : 'Không giới hạn'}
                          </span>
                        </div>
                        {asg.dueDate ? (
                          <div className="tku-time-item tku-time-item--due">
                            <Calendar size={13} className="tku-time-icon-calendar" />
                            <span>
                              <span className="tku-time-due-label">Hạn:</span>{' '}
                              <strong className="tku-time-due-date">
                                {new Date(asg.dueDate).toLocaleDateString('vi-VN')}
                              </strong>
                            </span>
                          </div>
                        ) : (
                          <div className="tku-time-item tku-time-item--nodue">
                            <Calendar size={13} className="tku-time-icon-muted" />
                            <span>Không thời hạn</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="tku-asg-td-status">
                      <span
                        className={`tku-badge-status ${
                          asg.status === 'ASSIGNED'
                            ? 'tku-badge-status--assigned'
                            : asg.status === 'CLOSED'
                            ? 'tku-badge-status--closed'
                            : 'tku-badge-status--draft'
                        }`}
                      >
                        {asg.status === 'ASSIGNED' && 'Đang mở'}
                        {asg.status === 'DRAFT' && 'Bản nháp'}
                        {asg.status === 'CLOSED' && 'Đã đóng'}
                      </span>
                    </td>

                    <td className="tku-asg-td-actions">
                      <div className="tku-asg-row-actions">
                        {/* Quy trình biên soạn & thiết lập đề thi 3 bước (chỉ hiển thị khi chưa mở / bản nháp) */}
                        {asg.status !== 'ASSIGNED' && (
                          <button
                            type="button"
                            className="tku-row-btn tku-row-btn--primary"
                            title="Biên soạn đề thi (Soạn câu hỏi → Thiết lập đáp án & thang điểm → Giao bài)"
                            onClick={() =>
                              navigate(`/lecturer/assignments/${asg.id}/questions`)
                            }
                          >
                            <Layers size={14} />
                            <span>Biên soạn đề thi</span>
                          </button>
                        )}

                        {/* Chỉnh sửa thông tin cơ bản: Tên, khóa học, loại đề, thời lượng */}
                        <button
                          type="button"
                          className="tku-row-btn-icon"
                          title="Chỉnh sửa thông tin bài tập (Tên, Loại bài, Thời lượng...)"
                          onClick={() =>
                            navigate(`/lecturer/assignments/${asg.id}/edit`)
                          }
                        >
                          <Pencil size={15} />
                        </button>

                        {/* Xóa bài tập */}
                        <button
                          type="button"
                          className="tku-row-btn-icon tku-row-btn-icon--danger"
                          title="Xóa bài tập này"
                          onClick={() => setDeleteTargetId(asg.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}


      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="tku-modal-backdrop" onClick={() => setDeleteTargetId(null)}>
          <div className="tku-modal-card tku-modal-card--danger" onClick={(e) => e.stopPropagation()}>
            <div className="tku-modal-header">
              <h3 className="tku-modal-title">Xác nhận xóa bài tập</h3>
              <button
                type="button"
                className="tku-modal-close"
                onClick={() => setDeleteTargetId(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="tku-modal-body">
              <p>
                Bạn có chắc chắn muốn xóa bài tập này không? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="tku-modal-footer">
              <button
                type="button"
                className="tku-btn-cancel-modal"
                onClick={() => setDeleteTargetId(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="tku-btn-danger-modal"
                onClick={handleConfirmDelete}
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerAssignmentsPage;
