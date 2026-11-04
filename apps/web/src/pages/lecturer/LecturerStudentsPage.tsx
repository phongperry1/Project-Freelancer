import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  X,
  BookOpen,
  Calendar,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  ArrowUpDown,
  Loader2,
  GraduationCap,
  MessageSquare,
  Send,
  BarChart3,
  Mail,
  Phone,
} from 'lucide-react';
import {
  lecturerService,
  type LecturerCourseItem,
  type MonitoredStudentItem,
  type MonitoredStudentsSummary,
  type MonitoredStudentsResponse,
} from '../../services/lecturer.service';
import { toast } from '../../context/toastService';
import { CustomSelect, type CustomSelectOption } from '../../components/common/CustomSelect';
import './lecturerStudents.css';

interface StudentAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
}

const StudentAvatar: React.FC<StudentAvatarProps> = React.memo(
  ({ name, avatarUrl, className = 'tku-student-avatar' }) => {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);

    const initials = useMemo(() => {
      if (!name) return 'SV';
      const clean = name.replace(/\s*\([^)]*\)/g, '').trim();
      const words = clean.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
      }
      return clean.slice(0, 2).toUpperCase() || 'SV';
    }, [name]);

    const showImg = Boolean(avatarUrl && failedUrl !== avatarUrl);

    return (
      <div
        className={`${className} ${
          showImg ? 'tku-student-avatar--has-img' : 'tku-student-avatar--initials'
        }`}
      >
        {showImg ? (
          <img
            key={avatarUrl!}
            src={avatarUrl!}
            alt={name}
            className="tku-student-avatar-img"
            referrerPolicy="no-referrer"
            onError={() => setFailedUrl(avatarUrl!)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
    );
  },
);
StudentAvatar.displayName = 'StudentAvatar';

const STATUS_OPTIONS: CustomSelectOption[] = [
  { value: 'ALL', label: 'Tất cả tình trạng học tập' },
  { value: 'ON_TRACK', label: 'Đang học' },
  { value: 'NEEDS_ATTENTION', label: 'Cần nhắc nhở' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
  { value: 'NOT_STARTED', label: 'Chưa bắt đầu' },
];

const SORT_OPTIONS: CustomSelectOption[] = [
  { value: 'ENROLLED_DESC', label: 'Mới tham gia nhất' },
  { value: 'NAME_ASC', label: 'Tên học sinh (A → Z)' },
  { value: 'PROGRESS_DESC', label: 'Tiến độ cao nhất' },
  { value: 'PROGRESS_ASC', label: 'Tiến độ thấp nhất' },
  { value: 'SCORE_DESC', label: 'Điểm trung bình cao nhất' },
];


export const LecturerStudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected course derived directly from URL (single source of truth)
  const selectedCourseId = searchParams.get('courseId') || 'ALL';

  // Data states
  const [courses, setCourses] = useState<LecturerCourseItem[]>([]);
  // Options for course selection dropdown
  const courseOptions = useMemo<CustomSelectOption[]>(() => {
    const list: CustomSelectOption[] = [
      { value: 'ALL', label: 'Tất cả các khóa học' },
    ];
    courses.forEach((c) => {
      list.push({
        value: c.id,
        label: `${c.title} (${c.studentCount} học sinh)`,
      });
    });
    return list;
  }, [courses]);

  const [students, setStudents] = useState<MonitoredStudentItem[]>([]);
  const [summary, setSummary] = useState<MonitoredStudentsSummary>({
    totalStudents: 0,
    activeStudents: 0,
    completedStudents: 0,
    atRiskStudents: 0,
    averageProgress: 0,
  });

  // Fast in-memory cache to allow instantaneous switching between courses
  const studentsCacheRef = useRef<Record<string, MonitoredStudentsResponse>>({});

  // UI & Filter states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('ENROLLED_DESC');

  // Detail Modal State
  const [selectedStudent, setSelectedStudent] = useState<MonitoredStudentItem | null>(null);
  const [studentNote, setStudentNote] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Load courses once on mount
  useEffect(() => {
    let isMounted = true;
    lecturerService
      .getMyCourses()
      .then((res) => {
        if (isMounted) {
          setCourses(res.courses || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          toast.error('Không thể tải danh sách khóa học');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch monitored students whenever selectedCourseId changes (instant display with cache)
  useEffect(() => {
    let isMounted = true;

    lecturerService
      .getMonitoredStudents(selectedCourseId)
      .then((res) => {
        if (isMounted) {
          const freshData: MonitoredStudentsResponse = {
            summary: res.summary,
            students: res.students || [],
          };
          studentsCacheRef.current[selectedCourseId] = freshData;
          setStudents(freshData.students);
          setSummary(freshData.summary);
        }
      })
      .catch(() => {
        const cached = studentsCacheRef.current[selectedCourseId];
        if (isMounted && !cached) {
          toast.error('Không thể tải danh sách học sinh tham gia khóa học');
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
  }, [selectedCourseId]);

  // Handle course switch
  const handleCourseChange = useCallback(
    (courseId: string) => {
      const cached = studentsCacheRef.current[courseId];
      if (cached) {
        setStudents(cached.students || []);
        setSummary(cached.summary);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (courseId === 'ALL') {
          next.delete('courseId');
        } else {
          next.set('courseId', courseId);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  // Open Student Detail
  const handleOpenDetail = useCallback((student: MonitoredStudentItem) => {
    setSelectedStudent(student);
    const savedNote = localStorage.getItem(`tku_student_note_${student.id}_${student.courseId}`) || '';
    setStudentNote(savedNote);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedStudent(null);
    setStudentNote('');
  }, []);

  // Save Student Note
  const handleSaveNote = useCallback(() => {
    if (!selectedStudent) return;
    setIsSavingNote(true);
    try {
      localStorage.setItem(
        `tku_student_note_${selectedStudent.id}_${selectedStudent.courseId}`,
        studentNote.trim(),
      );
      toast.success(`Đã lưu ghi chú cho học sinh ${selectedStudent.fullName}`);
    } catch {
      toast.error('Có lỗi khi lưu ghi chú');
    } finally {
      setIsSavingNote(false);
    }
  }, [selectedStudent, studentNote]);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedStudent) {
        handleCloseDetail();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStudent, handleCloseDetail]);

  // Filtered & Sorted Students
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.fullName.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term) ||
          (s.phoneNumber && s.phoneNumber.includes(term)),
      );
    }

    // Filter by learning status
    if (statusFilter !== 'ALL') {
      result = result.filter((s) => s.learningStatus === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'NAME_ASC') {
        return a.fullName.localeCompare(b.fullName, 'vi');
      }
      if (sortBy === 'PROGRESS_DESC') {
        return b.progressPercent - a.progressPercent;
      }
      if (sortBy === 'PROGRESS_ASC') {
        return a.progressPercent - b.progressPercent;
      }
      if (sortBy === 'SCORE_DESC') {
        return (b.averageScore ?? -1) - (a.averageScore ?? -1);
      }
      // ENROLLED_DESC default (ISO 8601 string descending comparison is fast & allocation-free)
      return b.enrolledAt.localeCompare(a.enrolledAt);
    });

    return result;
  }, [students, searchTerm, statusFilter, sortBy]);

  return (
    <div className="tku-students-page">
      {/* 1. Academic Header Banner */}
      <section className="tku-students-banner">
        <div className="tku-students-banner__content">
          <div className="tku-banner-pill">
            <GraduationCap size={13} />
            <span>Học vụ & Giám sát đào tạo</span>
          </div>
          <h1 className="tku-students-banner__title">
            Theo dõi học sinh tham gia khóa học
          </h1>
          <p className="tku-students-banner__desc">
            Quản lý danh sách học sinh theo từng lớp học phần, theo dõi sát sao tiến độ hoàn thành bài giảng, tỷ lệ nộp bài tập và đánh giá năng lực học tập.
          </p>
        </div>
      </section>

      {/* Sub Navigation Tabs */}
      <nav className="tku-students-nav-tabs" aria-label="Phân hệ theo dõi học sinh">
        <button
          type="button"
          className="tku-students-nav-tab tku-students-nav-tab--active"
        >
          <Users size={16} />
          <span>Danh sách học sinh</span>
        </button>
        <button
          type="button"
          className="tku-students-nav-tab"
          onClick={() =>
            navigate(
              selectedCourseId && selectedCourseId !== 'ALL'
                ? `/lecturer/students/progress?courseId=${selectedCourseId}`
                : '/lecturer/students/progress',
            )
          }
        >
          <TrendingUp size={16} />
          <span>Tiến độ học tập</span>
        </button>
        <button
          type="button"
          className="tku-students-nav-tab"
          onClick={() =>
            navigate(
              selectedCourseId && selectedCourseId !== 'ALL'
                ? `/lecturer/results?courseId=${selectedCourseId}`
                : '/lecturer/results',
            )
          }
        >
          <BarChart3 size={16} />
          <span>Kết quả học tập</span>
        </button>
      </nav>

      {/* 2. KPI Metrics Grid */}
      <section className="tku-students-kpi-grid">
        <div className="tku-students-kpi-card">
          <div className="tku-students-kpi-icon tku-students-kpi-icon--blue">
            <Users size={24} />
          </div>
          <div className="tku-students-kpi-info">
            <span className="tku-students-kpi-label">Tổng số học sinh</span>
            <span className="tku-students-kpi-value">
              {isLoading ? (
                <Loader2 size={20} className="tku-lecturer-spin-icon" />
              ) : (
                summary.totalStudents
              )}
            </span>
            <span className="tku-students-kpi-sub">
              {selectedCourseId === 'ALL'
                ? 'Trong tất cả khóa học'
                : 'Trong khóa học được chọn'}
            </span>
          </div>
        </div>

        <div className="tku-students-kpi-card">
          <div className="tku-students-kpi-icon tku-students-kpi-icon--emerald">
            <TrendingUp size={24} />
          </div>
          <div className="tku-students-kpi-info">
            <span className="tku-students-kpi-label">Đang học</span>
            <span className="tku-students-kpi-value">
              {isLoading ? (
                <Loader2 size={20} className="tku-lecturer-spin-icon" />
              ) : (
                summary.activeStudents
              )}
            </span>
            <span className="tku-students-kpi-sub">
              {summary.totalStudents > 0
                ? `${Math.round((summary.activeStudents / summary.totalStudents) * 100)}% tổng số học sinh`
                : 'Chưa có học sinh'}
            </span>
          </div>
        </div>

        <div className="tku-students-kpi-card">
          <div className="tku-students-kpi-icon tku-students-kpi-icon--cyan">
            <Award size={24} />
          </div>
          <div className="tku-students-kpi-info">
            <span className="tku-students-kpi-label">Tiến độ trung bình</span>
            <span className="tku-students-kpi-value">
              {isLoading ? (
                <Loader2 size={20} className="tku-lecturer-spin-icon" />
              ) : (
                `${summary.averageProgress}%`
              )}
            </span>
            <span className="tku-students-kpi-sub">
              {summary.completedStudents} học sinh đã hoàn thành
            </span>
          </div>
        </div>

        <div className="tku-students-kpi-card">
          <div className="tku-students-kpi-icon tku-students-kpi-icon--rose">
            <AlertCircle size={24} />
          </div>
          <div className="tku-students-kpi-info">
            <span className="tku-students-kpi-label">Cần chú ý / Nhắc nhở</span>
            <span className="tku-students-kpi-value" style={{ color: '#e11d48' }}>
              {isLoading ? (
                <Loader2 size={20} className="tku-lecturer-spin-icon" />
              ) : (
                summary.atRiskStudents
              )}
            </span>
            <span className="tku-students-kpi-sub">
              Tiến độ &lt; 30% hoặc điểm dưới 5.0
            </span>
          </div>
        </div>
      </section>

      {/* 3. Filter & Control Card */}
      <section className="tku-students-filter-card">
        {/* Top: Select Course */}
        <div className="tku-students-filter-top">
          <div className="tku-students-select-group">
            <label className="tku-students-select-label">
              <BookOpen size={13} />
              <span>Khóa học phụ trách</span>
            </label>
            <CustomSelect
              value={selectedCourseId}
              onChange={handleCourseChange}
              options={courseOptions}
              icon={<BookOpen size={14} />}
              ariaLabel="Chọn khóa học phụ trách"
              defaultValue="ALL"
              className="tku-students-custom-select tku-students-custom-select--course"
            />
          </div>
        </div>

        {/* Bottom: Search & Filter Row */}
        <div className="tku-students-filters-row">
          <div className="tku-students-search">
            <Search size={15} className="tku-students-search-icon" />
            <input
              type="text"
              className="tku-students-search-input"
              placeholder="Tìm học sinh theo họ tên, email hoặc số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="tku-students-search-clear"
                onClick={() => setSearchTerm('')}
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            icon={<Filter size={14} />}
            ariaLabel="Lọc theo tình trạng học tập"
            defaultValue="ALL"
            className="tku-students-custom-select"
          />

          <CustomSelect
            value={sortBy}
            onChange={setSortBy}
            options={SORT_OPTIONS}
            icon={<ArrowUpDown size={14} />}
            ariaLabel="Sắp xếp danh sách học sinh"
            defaultValue="ENROLLED_DESC"
            className="tku-students-custom-select"
          />
        </div>
      </section>

      {/* 4. Action Toolbar */}
      <section className="tku-students-toolbar">
        <div className="tku-students-count-badge">
          <span>Danh sách học sinh</span>
          <span className="tku-students-count-number">
            {filteredStudents.length} học sinh
          </span>
        </div>
      </section>

      {/* 5. Main Content: Table or Loading or Empty State */}
      {isLoading ? (
        <div className="tku-lecturer-loading-wrapper" style={{ minHeight: '320px' }}>
          <Loader2 size={36} className="tku-lecturer-spin-icon" />
          <span>Đang tải danh sách học sinh tham gia khóa học...</span>
        </div>
      ) : filteredStudents.length === 0 ? (
        <section className="tku-students-empty-card">
          <div className="tku-students-empty-graphic">
            <Users size={36} />
          </div>
          <h2 className="tku-students-empty-title">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Không tìm thấy học sinh nào phù hợp'
              : 'Hiện tại chưa có học sinh nào tham gia khóa học này'}
          </h2>
          <p className="tku-students-empty-desc">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Không có kết quả nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại. Vui lòng thử tìm từ khóa khác.'
              : 'Khóa học này hiện tại chưa có học sinh nào đăng ký tham gia hoặc chưa được kích hoạt tuyển sinh.'}
          </p>
        </section>
      ) : (
        <section className="tku-students-table-card">
          <div className="tku-students-table-responsive">
            <table className="tku-students-table">
              <thead>
                <tr>
                  <th>Học sinh</th>
                  <th>Khóa học tham gia</th>
                  <th>Ngày tham gia</th>
                  <th>Tiến độ học tập</th>
                  <th>Bài tập & Điểm TB</th>
                  <th>Tình trạng</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={`${s.id}_${s.courseId}`}>
                    {/* Học sinh */}
                    <td>
                      <div
                        className="tku-student-profile-cell"
                        onClick={() => handleOpenDetail(s)}
                        style={{ cursor: 'pointer' }}
                        title="Bấm để xem hồ sơ và ghi chú nhanh"
                      >
                        <StudentAvatar name={s.fullName} avatarUrl={s.avatarUrl} />
                        <div className="tku-student-info">
                          <span className="tku-student-name">{s.fullName}</span>
                          <span className="tku-student-sub">{s.email}</span>
                          {s.phoneNumber && (
                            <span className="tku-student-phone">
                              <Phone size={10} />
                              <span>{s.phoneNumber}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Khóa học */}
                    <td>
                      <div className="tku-course-chip" title={s.courseTitle}>
                        <BookOpen size={12} style={{ flexShrink: 0 }} />
                        <span>{s.courseTitle}</span>
                      </div>
                    </td>

                    {/* Ngày tham gia */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '13px' }}>
                        <Calendar size={13} style={{ color: '#94a3b8' }} />
                        <span>{s.enrolledAtText}</span>
                      </div>
                    </td>

                    {/* Tiến độ học tập */}
                    <td>
                      <div className="tku-progress-cell">
                        <div className="tku-progress-text">
                          <span>
                            {s.completedLessonsCount} / {s.totalLessonsCount} bài
                          </span>
                          <span className="tku-progress-pct">{s.progressPercent}%</span>
                        </div>
                        <div className="tku-progress-track">
                          <div
                            className={`tku-progress-fill ${
                              s.progressPercent >= 100
                                ? 'tku-progress-fill--completed'
                                : s.progressPercent >= 50
                                ? 'tku-progress-fill--active'
                                : s.progressPercent > 0
                                ? 'tku-progress-fill--warning'
                                : 'tku-progress-fill--zero'
                            }`}
                            style={{ width: `${s.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Bài tập & Điểm TB */}
                    <td>
                      <div className="tku-score-cell">
                        <span className="tku-score-sub">
                          Đã làm: <strong>{s.assessmentsSubmitted}</strong> / {s.totalAssessments} bài
                        </span>
                        {s.averageScore !== null ? (
                          <span
                            className={`tku-score-tag ${
                              s.averageScore >= 8.0
                                ? 'tku-score-tag--excellent'
                                : s.averageScore >= 6.5
                                ? 'tku-score-tag--good'
                                : s.averageScore >= 5.0
                                ? 'tku-score-tag--fair'
                                : 'tku-score-tag--weak'
                            }`}
                          >
                            Điểm TB: {s.averageScore.toFixed(1)} / 10
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                            Chưa có điểm
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tình trạng học tập */}
                    <td>
                      <span
                        className={`tku-status-badge ${
                          s.learningStatus === 'COMPLETED'
                            ? 'tku-status-badge--completed'
                            : s.learningStatus === 'ON_TRACK'
                            ? 'tku-status-badge--on-track'
                            : s.learningStatus === 'NEEDS_ATTENTION'
                            ? 'tku-status-badge--needs-attention'
                            : 'tku-status-badge--not-started'
                        }`}
                      >
                        {s.learningStatus === 'COMPLETED' && <CheckCircle2 size={13} />}
                        {s.learningStatus === 'NEEDS_ATTENTION' && <AlertCircle size={13} />}
                        {s.learningStatus === 'ON_TRACK' && <TrendingUp size={13} />}
                        {s.learningStatus === 'NOT_STARTED' && <Clock size={13} />}
                        <span>{s.learningStatusText}</span>
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="tku-row-btn-group">
                        <button
                          type="button"
                          className="tku-student-action-btn tku-student-action-btn--primary"
                          onClick={() =>
                            navigate(
                              `/lecturer/students/${s.id}/progress?courseId=${s.courseId}`,
                            )
                          }
                          title="Xem chi tiết tiến độ học tập của học sinh"
                        >
                          <TrendingUp size={13} />
                          <span>Tiến độ</span>
                        </button>

                        <button
                          type="button"
                          className="tku-student-action-btn"
                          onClick={() =>
                            navigate(
                              `/lecturer/results?courseId=${s.courseId}&search=${encodeURIComponent(
                                s.fullName,
                              )}`,
                            )
                          }
                          title={`Xem kết quả kiểm tra của ${s.fullName}`}
                        >
                          <BarChart3 size={13} />
                          <span>Kết quả</span>
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

      {/* 6. Student Profile Detail Modal */}
      {selectedStudent && (
        <div
          className="tku-student-modal-backdrop"
          onClick={handleCloseDetail}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tku-modal-student-name"
        >
          <div
            className="tku-student-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="tku-student-modal-header">
              <div className="tku-student-modal-summary">
                <StudentAvatar
                  name={selectedStudent.fullName}
                  avatarUrl={selectedStudent.avatarUrl}
                  className="tku-student-modal-avatar"
                />
                <div>
                  <h3 id="tku-modal-student-name" className="tku-student-modal-name">
                    {selectedStudent.fullName}
                  </h3>
                  <div className="tku-student-modal-meta">
                    <span>{selectedStudent.email}</span>
                    {selectedStudent.phoneNumber && (
                      <span> • {selectedStudent.phoneNumber}</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="tku-student-modal-close"
                onClick={handleCloseDetail}
                title="Đóng (ESC)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="tku-student-modal-body">
              {/* Course Title & Status Pill */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={16} style={{ color: '#1d68f2' }} />
                  <strong style={{ fontSize: '14px', color: '#1e293b' }}>
                    {selectedStudent.courseTitle}
                  </strong>
                </div>
                <span
                  className={`tku-status-badge ${
                    selectedStudent.learningStatus === 'COMPLETED'
                      ? 'tku-status-badge--completed'
                      : selectedStudent.learningStatus === 'ON_TRACK'
                      ? 'tku-status-badge--on-track'
                      : selectedStudent.learningStatus === 'NEEDS_ATTENTION'
                      ? 'tku-status-badge--needs-attention'
                      : 'tku-status-badge--not-started'
                  }`}
                >
                  {selectedStudent.learningStatusText}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="tku-modal-stats-grid">
                <div className="tku-modal-stat-box">
                  <span className="tku-modal-stat-box__label">Tiến độ bài giảng</span>
                  <span className="tku-modal-stat-box__value">
                    {selectedStudent.progressPercent}%
                  </span>
                  <span className="tku-modal-stat-box__sub">
                    Hoàn thành {selectedStudent.completedLessonsCount} / {selectedStudent.totalLessonsCount} bài học
                  </span>
                </div>

                <div className="tku-modal-stat-box">
                  <span className="tku-modal-stat-box__label">Điểm số trung bình</span>
                  <span className="tku-modal-stat-box__value">
                    {selectedStudent.averageScore !== null
                      ? `${selectedStudent.averageScore} / 10`
                      : '--'}
                  </span>
                  <span className="tku-modal-stat-box__sub">
                    Đã nộp {selectedStudent.assessmentsSubmitted} / {selectedStudent.totalAssessments} bài kiểm tra
                  </span>
                </div>

                <div className="tku-modal-stat-box">
                  <span className="tku-modal-stat-box__label">Ngày ghi danh</span>
                  <span className="tku-modal-stat-box__value" style={{ fontSize: '15px' }}>
                    {selectedStudent.enrolledAtText}
                  </span>
                  <span className="tku-modal-stat-box__sub">
                    Thời gian bắt đầu tham gia lớp học
                  </span>
                </div>

                <div className="tku-modal-stat-box">
                  <span className="tku-modal-stat-box__label">Trạng thái hoàn thành</span>
                  <span className="tku-modal-stat-box__value" style={{ fontSize: '15px' }}>
                    {selectedStudent.completedAt
                      ? new Date(selectedStudent.completedAt).toLocaleDateString('vi-VN')
                      : 'Đang theo học'}
                  </span>
                  <span className="tku-modal-stat-box__sub">
                    {selectedStudent.progressPercent >= 100
                      ? 'Đã đạt 100% chương trình'
                      : 'Chưa hoàn thành toàn bộ khóa'}
                  </span>
                </div>
              </div>

              {/* Teacher Remarks / Notes */}
              <div className="tku-modal-note-section">
                <label className="tku-modal-note-title">
                  <MessageSquare size={15} style={{ color: '#1d68f2' }} />
                  <span>Sổ tay theo dõi & Nhận xét của giảng viên</span>
                </label>
                <textarea
                  className="tku-modal-textarea"
                  placeholder="Ghi chú theo dõi học sinh (ví dụ: Cần nhắc nhở nộp bài tập số 2, tiếp thu bài tốt nhưng cần hỗ trợ phần thực hành)..."
                  value={studentNote}
                  onChange={(e) => setStudentNote(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="tku-student-modal-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={`mailto:${selectedStudent.email}`}
                  className="tku-modal-footer-btn tku-modal-footer-btn--secondary"
                  title="Gửi email trao đổi trực tiếp với học sinh"
                  style={{ textDecoration: 'none' }}
                >
                  <Mail size={14} />
                  <span>Gửi Email</span>
                </a>

                <button
                  type="button"
                  className="tku-modal-footer-btn tku-modal-footer-btn--primary"
                  onClick={() => {
                    const s = selectedStudent;
                    handleCloseDetail();
                    navigate(
                      `/lecturer/students/${s.id}/progress?courseId=${s.courseId}`,
                    );
                  }}
                  title="Chuyển đến trang theo dõi tiến độ chi tiết của học sinh"
                >
                  <TrendingUp size={14} />
                  <span>Xem tiến độ học tập</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="tku-modal-footer-btn tku-modal-footer-btn--secondary"
                  onClick={handleCloseDetail}
                >
                  Đóng
                </button>

                <button
                  type="button"
                  className="tku-modal-footer-btn tku-modal-footer-btn--primary"
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                >
                  {isSavingNote ? (
                    <>
                      <Loader2 size={14} className="tku-lecturer-spin-icon" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Lưu ghi chú</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerStudentsPage;
