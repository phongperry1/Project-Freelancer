import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Send,
  Users,
  Clock,
  ShieldCheck,
  BookOpen,
  FileCheck,
  Loader2,
  Search,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  lecturerService,
  type LecturerCourseItem,
  type CourseStudentItem,
  type AssignmentItem,
  type AssignSettings,
} from '../../services/lecturer.service';
import { AssignmentStepperHeader } from './AssignmentStepperHeader';
import { toast } from '../../context/toastService';
import './lecturerAssignments.css';

// Helper to format ISO or Date strings into local YYYY-MM-DDTHH:mm for datetime-local input
const toLocalDatetimeInputValue = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const LecturerAssignPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State initializations
  const [assignment, setAssignment] = useState<AssignmentItem | null>(null);
  const [courses, setCourses] = useState<LecturerCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Form State for Assign Settings with safe initial values
  const [targetType, setTargetType] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() =>
    toLocalDatetimeInputValue(new Date()),
  );
  const [dueDate, setDueDate] = useState<string>(() =>
    toLocalDatetimeInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
  const [showScoreImmediately, setShowScoreImmediately] = useState<boolean>(true);
  const [showSolution, setShowSolution] = useState<'IMMEDIATELY' | 'AFTER_DEADLINE' | 'NEVER'>('IMMEDIATELY');
  const [maxAttempts, setMaxAttempts] = useState<number>(1);

  // Custom Students state
  const [courseStudents, setCourseStudents] = useState<CourseStudentItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');

  // Auto-save draft reference for unmount & beforeunload (declared at top before effects & handlers)
  const isSubmittedRef = useRef<boolean>(false);
  const isDirtyRef = useRef<boolean>(false);
  const assignmentRef = useRef<AssignmentItem | null>(null);
  const latestDraftRef = useRef<AssignmentItem | null>(null);

  // Load assignment and lecturer courses from database
  useEffect(() => {
    let isMounted = true;
    if (!id) {
      navigate('/lecturer/assignments', { replace: true });
      return;
    }
    const fetchAll = async () => {
      setIsLoadingCourses(true);
      try {
        const [courseRes, item] = await Promise.all([
          lecturerService.getMyCourses(),
          lecturerService.getAssessmentById(id),
        ]);
        if (isMounted) {
          if (!item) {
            toast.error('Không tìm thấy bài tập hoặc bài kiểm tra');
            navigate('/lecturer/assignments', { replace: true });
            return;
          }
          const cList = courseRes.courses || [];
          setCourses(cList);
          setAssignment(item);
          assignmentRef.current = item;
          isDirtyRef.current = false;
          setSelectedCourseId(item.courseId || cList[0]?.id || '');
          if (item.startDate) {
            setStartDate(toLocalDatetimeInputValue(item.startDate));
          }
          if (item.dueDate) {
            setDueDate(toLocalDatetimeInputValue(item.dueDate));
          }
          if (item.durationMinutes) {
            setDurationMinutes(item.durationMinutes);
          }
          if (item.assignSettings) {
            if (item.assignSettings.targetType) {
              setTargetType(item.assignSettings.targetType);
            }
            if (Array.isArray(item.assignSettings.selectedStudentIds)) {
              setSelectedStudentIds(item.assignSettings.selectedStudentIds);
            }
          }
        }
      } catch {
        if (isMounted) {
          toast.error('Có lỗi khi tải thông tin bài tập');
          navigate('/lecturer/assignments', { replace: true });
        }
      } finally {
        if (isMounted) {
          setIsLoadingCourses(false);
          setIsLoading(false);
        }
      }
    };
    fetchAll();
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  // Fetch students enrolled in the selected course
  useEffect(() => {
    let isMounted = true;
    if (!selectedCourseId) {
      return;
    }
    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      try {
        const students = await lecturerService.getCourseStudents(selectedCourseId);
        if (isMounted) {
          setCourseStudents(students || []);
        }
      } catch {
        if (isMounted) {
          setCourseStudents([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingStudents(false);
        }
      }
    };
    fetchStudents();
    return () => {
      isMounted = false;
    };
  }, [selectedCourseId]);

  // Filtered students based on search term
  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) return courseStudents;
    const query = studentSearchTerm.toLowerCase().trim();
    return courseStudents.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query),
    );
  }, [courseStudents, studentSearchTerm]);

  // Selected Course memoized
  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  // Input change handlers with isDirty tracking
  const handleCourseChange = useCallback((newId: string) => {
    isDirtyRef.current = true;
    setSelectedCourseId(newId);
    if (!newId) setCourseStudents([]);
  }, []);

  const handleTargetTypeChange = useCallback((type: 'ALL' | 'CUSTOM') => {
    isDirtyRef.current = true;
    setTargetType(type);
  }, []);

  const handleSelectAllStudents = useCallback(() => {
    isDirtyRef.current = true;
    setSelectedStudentIds(courseStudents.map((s) => s.id));
  }, [courseStudents]);

  const handleDeselectAllStudents = useCallback(() => {
    isDirtyRef.current = true;
    setSelectedStudentIds([]);
  }, []);

  const handleToggleStudent = useCallback((studentId: string) => {
    isDirtyRef.current = true;
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((sId) => sId !== studentId)
        : [...prev, studentId],
    );
  }, []);

  const handleStartDateChange = useCallback((val: string) => {
    isDirtyRef.current = true;
    setStartDate(val);
  }, []);

  const handleDueDateChange = useCallback((val: string) => {
    isDirtyRef.current = true;
    setDueDate(val);
  }, []);

  const handleDurationChange = useCallback((val: number) => {
    isDirtyRef.current = true;
    setDurationMinutes(val);
  }, []);

  const handleAttemptsChange = useCallback((val: number) => {
    isDirtyRef.current = true;
    setMaxAttempts(val);
  }, []);

  const handleToggleQuestions = useCallback((checked: boolean) => {
    isDirtyRef.current = true;
    setShuffleQuestions(checked);
  }, []);

  const handleToggleOptions = useCallback((checked: boolean) => {
    isDirtyRef.current = true;
    setShuffleOptions(checked);
  }, []);

  const handleToggleScore = useCallback((checked: boolean) => {
    isDirtyRef.current = true;
    setShowScoreImmediately(checked);
  }, []);

  const handleSolutionChange = useCallback(
    (mode: 'IMMEDIATELY' | 'AFTER_DEADLINE' | 'NEVER') => {
      isDirtyRef.current = true;
      setShowSolution(mode);
    },
    [],
  );

  // Save current settings into assignment object
  const buildUpdatedAssignment = useCallback(
    (status: 'DRAFT' | 'ASSIGNED'): AssignmentItem | null => {
      if (!assignment) return null;
      const studentCount =
        targetType === 'CUSTOM'
          ? selectedStudentIds.length
          : selectedCourse?.studentCount ?? 0;

      const assignSettings: AssignSettings = {
        targetType,
        selectedStudentIds: targetType === 'CUSTOM' ? selectedStudentIds : [],
        startDate,
        dueDate,
        durationMinutes,
        shuffleQuestions,
        shuffleOptions,
        showScoreImmediately,
        showSolution,
        maxAttempts,
      };

      const formattedStartDate = startDate
        ? new Date(startDate).toISOString()
        : null;
      const formattedDueDate = dueDate
        ? new Date(dueDate).toISOString()
        : null;

      return {
        ...assignment,
        courseId: selectedCourseId || assignment.courseId,
        courseTitle: selectedCourse?.title || assignment.courseTitle,
        durationMinutes,
        status,
        startDate: formattedStartDate,
        dueDate: formattedDueDate,
        assignedStudentsCount:
          status === 'ASSIGNED'
            ? studentCount
            : targetType === 'CUSTOM'
            ? selectedStudentIds.length
            : selectedCourse?.studentCount ?? 0,
        assignSettings,
      };
    },
    [
      assignment,
      selectedCourse,
      selectedCourseId,
      targetType,
      selectedStudentIds,
      startDate,
      dueDate,
      durationMinutes,
      shuffleQuestions,
      shuffleOptions,
      showScoreImmediately,
      showSolution,
      maxAttempts,
    ],
  );

  useEffect(() => {
    assignmentRef.current = assignment;
    if (assignment && assignment.status !== 'ASSIGNED' && !isSubmittedRef.current) {
      latestDraftRef.current = buildUpdatedAssignment('DRAFT');
    }
  }, [assignment, buildUpdatedAssignment]);

  useEffect(() => {
    return () => {
      // Chỉ lưu đè nháp khi có thay đổi (isDirty), chưa bấm giao bài và bài tập chưa ASSIGNED
      if (isSubmittedRef.current) return;
      if (assignmentRef.current?.status === 'ASSIGNED') return;
      if (isDirtyRef.current && latestDraftRef.current) {
        lecturerService.saveAssessment(latestDraftRef.current).catch(() => {});
      }
    };
  }, []);

  // Safeguard when closing tab or reloading page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (
        isDirtyRef.current &&
        !isSubmittedRef.current &&
        assignmentRef.current?.status !== 'ASSIGNED' &&
        latestDraftRef.current
      ) {
        lecturerService.saveAssessment(latestDraftRef.current).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Save Draft
  const handleSaveDraft = useCallback(async () => {
    const updated = buildUpdatedAssignment('DRAFT');
    if (!updated) return;
    setIsSaving(true);
    try {
      const saved = await lecturerService.saveAssessment(updated);
      setAssignment(saved);
      assignmentRef.current = saved;
      isDirtyRef.current = false;
      toast.success('Đã lưu cấu hình giao bài dưới dạng bản nháp');
    } catch {
      toast.error('Có lỗi khi lưu');
    } finally {
      setIsSaving(false);
    }
  }, [buildUpdatedAssignment]);

  // Publish & Assign Now
  const handlePublishAndAssign = useCallback(async () => {
    if (!selectedCourseId) {
      toast.warning('Vui lòng chọn khóa học để giao bài');
      return;
    }
    if (!dueDate) {
      toast.warning('Vui lòng chọn hạn chót nộp bài');
      return;
    }
    if (startDate && dueDate && new Date(dueDate) <= new Date(startDate)) {
      toast.warning('Hạn chót nộp bài phải sau thời gian mở đề');
      return;
    }
    if (targetType === 'CUSTOM' && selectedStudentIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 học sinh khi sử dụng chế độ chỉ định cụ thể');
      return;
    }

    const updated = buildUpdatedAssignment('ASSIGNED');
    if (!updated) return;

    // Đánh dấu đã giao bài để vô hiệu hóa ngay việc unmount tự động lưu đè nháp
    isSubmittedRef.current = true;
    isDirtyRef.current = false;
    latestDraftRef.current = null;

    try {
      setIsPublishing(true);
      await lecturerService.saveAssessment(updated, {
        notifyStudents: true,
        targetStudentIds: targetType === 'CUSTOM' ? selectedStudentIds : undefined,
      });
      const targetMsg =
        targetType === 'CUSTOM'
          ? `cho ${selectedStudentIds.length} học sinh được chỉ định`
          : 'cho toàn bộ học sinh trong khóa học';
      toast.success(`Đã giao "${updated.title}" thành công ${targetMsg} và tự động gửi thông báo đến học sinh!`);
      navigate('/lecturer/assignments');
    } catch {
      isSubmittedRef.current = false;
      toast.error('Có lỗi khi giao bài');
      setIsPublishing(false);
    }
  }, [
    selectedCourseId,
    dueDate,
    startDate,
    targetType,
    selectedStudentIds,
    buildUpdatedAssignment,
    navigate,
  ]);

  if (!assignment || isLoading) {
    return (
      <div className="tku-lecturer-loading-wrapper" role="status" aria-live="polite">
        <Loader2 size={36} className="tku-lecturer-spin-icon" />
        <span>Đang tải dữ liệu giao bài...</span>
      </div>
    );
  }

  return (
    <div className="tku-page-container tku-assign-page">
      {/* 3-Step Wizard Navigation Header with Auto-save */}
      <AssignmentStepperHeader
        assignment={assignment}
        currentStep={3}
        onSaveDraft={handleSaveDraft}
        isSaving={isSaving}
      />

      <main className="tku-assign-body">
        <div className="tku-assign-grid">
          {/* Left Column: Configuration Forms */}
          <div className="tku-assign-forms-col">
            {/* Card 1: Khóa học & Đối tượng nhận bài */}
            <section className="tku-assign-card">
              <div className="tku-assign-card__header">
                <div className="tku-assign-card__icon-wrap tku-assign-card__icon--blue">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="tku-assign-card__title">1. Khóa học & Đối tượng nhận bài</h3>
                  <p className="tku-assign-card__subtitle">
                    Chỉ định khóa học và danh sách học viên sẽ làm bài tập này
                  </p>
                </div>
              </div>

              <div className="tku-assign-card__content">
                <div className="tku-form-group">
                  <label className="tku-form-label" htmlFor="course-select">
                    Khóa học áp dụng <span className="tku-form-required">*</span>
                  </label>
                  <select
                    id="course-select"
                    className="tku-form-select"
                    value={selectedCourseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    disabled={isLoadingCourses}
                  >
                    <option value="">-- Chọn khóa học giảng dạy --</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} ({course.studentCount} học viên)
                      </option>
                    ))}
                    {courses.length === 0 && (
                      <option value="default-course">
                        {assignment.courseTitle || 'Khóa học của tôi'}
                      </option>
                    )}
                  </select>
                </div>

                <div className="tku-form-group">
                  <label className="tku-form-label">Phạm vi giao bài</label>
                  <div className="tku-target-type-options">
                    <label
                      className={`tku-target-type-card ${
                        targetType === 'ALL' ? 'tku-target-type-card--selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetType"
                        checked={targetType === 'ALL'}
                        onChange={() => handleTargetTypeChange('ALL')}
                        className="tku-target-type-radio"
                      />
                      <div className="tku-target-type-info">
                        <span className="tku-target-type-name">
                          Tất cả học viên trong khóa học
                        </span>
                        <span className="tku-target-type-desc">
                          {selectedCourse
                            ? `Tự động giao cho tất cả ${selectedCourse.studentCount} học sinh đang theo học`
                            : 'Toàn bộ học viên đã đăng ký khóa học này đều phải làm bài'}
                        </span>
                      </div>
                      <Users size={18} className="tku-target-type-icon" />
                    </label>

                    <label
                      className={`tku-target-type-card ${
                        targetType === 'CUSTOM' ? 'tku-target-type-card--selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetType"
                        checked={targetType === 'CUSTOM'}
                        onChange={() => handleTargetTypeChange('CUSTOM')}
                        className="tku-target-type-radio"
                      />
                      <div className="tku-target-type-info">
                        <span className="tku-target-type-name">Chỉ định nhóm học sinh cụ thể</span>
                        <span className="tku-target-type-desc">
                          Dành cho học sinh làm lại bài, học sinh bồi dưỡng hoặc thi lại
                        </span>
                      </div>
                      <ShieldCheck size={18} className="tku-target-type-icon" />
                    </label>
                  </div>

                  {targetType === 'CUSTOM' && (
                    <div className="tku-custom-students-panel">
                      <div className="tku-custom-students-header">
                        <div className="tku-custom-students-title-wrap">
                          <span className="tku-custom-students-title">
                            Danh sách học sinh trong khóa học:
                          </span>
                          <span className="tku-custom-students-badge">
                            Đã chọn {selectedStudentIds.length} / {courseStudents.length}
                          </span>
                        </div>
                        <div className="tku-custom-students-actions">
                          <button
                            type="button"
                            className="tku-btn-quick-select"
                            onClick={handleSelectAllStudents}
                            disabled={courseStudents.length === 0}
                          >
                            <UserCheck size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Chọn tất cả
                          </button>
                          <button
                            type="button"
                            className="tku-btn-quick-select"
                            onClick={handleDeselectAllStudents}
                            disabled={selectedStudentIds.length === 0}
                          >
                            <UserX size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Bỏ chọn
                          </button>
                        </div>
                      </div>

                      {/* Search Box */}
                      <div className="tku-custom-students-search">
                        <Search size={15} className="tku-custom-students-search-icon" />
                        <input
                          type="text"
                          className="tku-custom-students-search-input"
                          placeholder="Tìm kiếm học sinh theo tên hoặc email..."
                          value={studentSearchTerm}
                          onChange={(e) => setStudentSearchTerm(e.target.value)}
                        />
                      </div>

                      {/* Student List */}
                      {isLoadingStudents ? (
                        <div className="tku-custom-students-empty">
                          <Loader2 size={24} className="tku-lecturer-spin-icon" />
                          <span className="tku-custom-students-empty-title">Đang tải danh sách học viên...</span>
                        </div>
                      ) : courseStudents.length === 0 ? (
                        <div className="tku-custom-students-empty">
                          <Users size={28} style={{ color: '#94a3b8' }} />
                          <span className="tku-custom-students-empty-title">Khóa học này chưa có học sinh nào đăng ký</span>
                          <span className="tku-custom-students-empty-desc">
                            Khi có học viên tham gia khóa học, danh sách sẽ tự động hiển thị tại đây để bạn chọn.
                          </span>
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <div className="tku-custom-students-empty">
                          <Search size={24} style={{ color: '#94a3b8' }} />
                          <span className="tku-custom-students-empty-title">Không tìm thấy học sinh phù hợp</span>
                          <span className="tku-custom-students-empty-desc">
                            Không có kết quả nào khớp với từ khóa "{studentSearchTerm}".
                          </span>
                        </div>
                      ) : (
                        <div className="tku-custom-students-list">
                          {filteredStudents.map((student) => {
                            const isSelected = selectedStudentIds.includes(student.id);
                            const initials = student.fullName
                              ? student.fullName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .slice(-2)
                                  .join('')
                                  .toUpperCase()
                              : 'HV';
                            return (
                              <label
                                key={student.id}
                                className={`tku-custom-students-item ${
                                  isSelected ? 'tku-custom-students-item--selected' : ''
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="tku-custom-student-checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleStudent(student.id)}
                                />
                                {student.avatarUrl ? (
                                  <img
                                    src={student.avatarUrl}
                                    alt={student.fullName}
                                    className="tku-custom-student-avatar"
                                  />
                                ) : (
                                  <div className="tku-custom-student-avatar">
                                    {initials}
                                  </div>
                                )}
                                <div className="tku-custom-student-info">
                                  <span className="tku-custom-student-name">{student.fullName}</span>
                                  <span className="tku-custom-student-email">{student.email}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Card 2: Lịch & Thời lượng làm bài */}
            <section className="tku-assign-card">
              <div className="tku-assign-card__header">
                <div className="tku-assign-card__icon-wrap tku-assign-card__icon--amber">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="tku-assign-card__title">2. Lịch & Thời lượng làm bài</h3>
                  <p className="tku-assign-card__subtitle">
                    Thiết lập thời gian mở đề, hạn nộp và thời gian đếm ngược
                  </p>
                </div>
              </div>

              <div className="tku-assign-card__content">
                <div className="tku-form-row">
                  <div className="tku-form-group">
                    <label className="tku-form-label" htmlFor="start-date">
                      Thời gian mở đề
                    </label>
                    <input
                      id="start-date"
                      type="datetime-local"
                      className="tku-form-input"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                  </div>

                  <div className="tku-form-group">
                    <label className="tku-form-label" htmlFor="due-date">
                      Hạn chót nộp bài <span className="tku-form-required">*</span>
                    </label>
                    <input
                      id="due-date"
                      type="datetime-local"
                      className="tku-form-input"
                      value={dueDate}
                      onChange={(e) => handleDueDateChange(e.target.value)}
                    />
                  </div>
                </div>

                <div className="tku-form-row">
                  <div className="tku-form-group">
                    <label className="tku-form-label" htmlFor="duration">
                      Thời lượng làm bài (phút)
                    </label>
                    <select
                      id="duration"
                      className="tku-form-select"
                      value={durationMinutes}
                      onChange={(e) => handleDurationChange(Number(e.target.value))}
                    >
                      <option value={10}>10 phút (Kiểm tra nhanh)</option>
                      <option value={15}>15 phút (Bài tập ngắn)</option>
                      <option value={30}>30 phút</option>
                      <option value={45}>45 phút (1 tiết)</option>
                      <option value={60}>60 phút (Đề kiểm tra định kỳ)</option>
                      <option value={90}>90 phút (Thi học kỳ)</option>
                      <option value={120}>120 phút</option>
                      <option value={0}>Không giới hạn thời gian</option>
                    </select>
                  </div>

                  <div className="tku-form-group">
                    <label className="tku-form-label" htmlFor="attempts">
                      Số lần làm bài tối đa
                    </label>
                    <select
                      id="attempts"
                      className="tku-form-select"
                      value={maxAttempts}
                      onChange={(e) => handleAttemptsChange(Number(e.target.value))}
                    >
                      <option value={1}>1 lần duy nhất (Nghiêm ngặt)</option>
                      <option value={2}>2 lần (Lấy điểm cao nhất)</option>
                      <option value={3}>3 lần</option>
                      <option value={999}>Không giới hạn (Luyện tập tự do)</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Card 3: Cấu hình thi & Chống gian lận */}
            <section className="tku-assign-card">
              <div className="tku-assign-card__header">
                <div className="tku-assign-card__icon-wrap tku-assign-card__icon--emerald">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="tku-assign-card__title">3. Cấu hình bảo mật & Hiển thị kết quả</h3>
                  <p className="tku-assign-card__subtitle">
                    Thiết lập quy chế làm bài và thời điểm công bố đáp án
                  </p>
                </div>
              </div>

              <div className="tku-assign-card__content">
                <div className="tku-toggle-list">
                  <div className="tku-toggle-item">
                    <div className="tku-toggle-info">
                      <span className="tku-toggle-title">Đảo ngẫu nhiên thứ tự câu hỏi</span>
                      <span className="tku-toggle-desc">
                        Mỗi học sinh sẽ nhận đề với thứ tự câu hỏi khác nhau để chống sao chép
                      </span>
                    </div>
                    <label className="tku-switch">
                      <input
                        type="checkbox"
                        checked={shuffleQuestions}
                        onChange={(e) => handleToggleQuestions(e.target.checked)}
                      />
                      <span className="tku-slider" />
                    </label>
                  </div>

                  <div className="tku-toggle-item">
                    <div className="tku-toggle-info">
                      <span className="tku-toggle-title">Đảo ngẫu nhiên thứ tự các phương án</span>
                      <span className="tku-toggle-desc">
                        Các lựa chọn A, B, C, D trong từng câu sẽ tự động hoán đổi vị trí
                      </span>
                    </div>
                    <label className="tku-switch">
                      <input
                        type="checkbox"
                        checked={shuffleOptions}
                        onChange={(e) => handleToggleOptions(e.target.checked)}
                      />
                      <span className="tku-slider" />
                    </label>
                  </div>

                  <div className="tku-toggle-item">
                    <div className="tku-toggle-info">
                      <span className="tku-toggle-title">Hiển thị điểm số ngay sau khi nộp</span>
                      <span className="tku-toggle-desc">
                        Học sinh biết ngay số điểm đạt được khi hoàn thành bài nộp
                      </span>
                    </div>
                    <label className="tku-switch">
                      <input
                        type="checkbox"
                        checked={showScoreImmediately}
                        onChange={(e) => handleToggleScore(e.target.checked)}
                      />
                      <span className="tku-slider" />
                    </label>
                  </div>
                </div>

                <div className="tku-form-group" style={{ marginTop: '16px' }}>
                  <label className="tku-form-label" htmlFor="solution-mode">
                    Thời điểm cho phép xem lời giải chi tiết
                  </label>
                  <select
                    id="solution-mode"
                    className="tku-form-select"
                    value={showSolution}
                    onChange={(e) =>
                      handleSolutionChange(
                        e.target.value as 'IMMEDIATELY' | 'AFTER_DEADLINE' | 'NEVER',
                      )
                    }
                  >
                    <option value="IMMEDIATELY">
                      Xem ngay sau khi nộp bài (Phù hợp bài tập tự luyện)
                    </option>
                    <option value="AFTER_DEADLINE">
                      Chỉ xem sau khi hết hạn nộp đề (Khuyên dùng cho bài kiểm tra)
                    </option>
                    <option value="NEVER">
                      Không hiển thị lời giải (Giáo viên tự chấm & chữa bài trên lớp)
                    </option>
                  </select>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Pre-assignment Summary Card */}
          <aside className="tku-assign-summary-col">
            <div className="tku-summary-card">
              <div className="tku-summary-card__header">
                <FileCheck size={20} className="tku-text-blue" />
                <h4 className="tku-summary-card__title">Tóm tắt bài kiểm tra</h4>
              </div>

              <div className="tku-summary-card__body">
                <div className="tku-summary-row">
                  <span className="tku-summary-label">Tên bài:</span>
                  <span className="tku-summary-value tku-summary-value--highlight">
                    {assignment.title}
                  </span>
                </div>

                <div className="tku-summary-row">
                  <span className="tku-summary-label">Phân loại:</span>
                  <span className="tku-summary-value">
                    {assignment.type === 'QUIZ' && 'Bài tập ngắn (Quiz)'}
                    {assignment.type === 'TEST' && 'Kiểm tra 1 tiết'}
                    {assignment.type === 'EXAM' && 'Đề thi học kỳ'}
                  </span>
                </div>

                <div className="tku-summary-row">
                  <span className="tku-summary-label">Khóa học:</span>
                  <span className="tku-summary-value">
                    {selectedCourse?.title || assignment.courseTitle || 'Chưa chọn'}
                  </span>
                </div>

                <div className="tku-summary-row">
                  <span className="tku-summary-label">Số câu hỏi:</span>
                  <span className="tku-summary-value">{assignment.questions.length} câu</span>
                </div>

                <div className="tku-summary-row">
                  <span className="tku-summary-label">Thang điểm:</span>
                  <span className="tku-summary-value tku-text-emerald font-bold">
                    {assignment.totalScore} điểm
                  </span>
                </div>

                <div className="tku-summary-row">
                  <span className="tku-summary-label">Thời lượng:</span>
                  <span className="tku-summary-value">
                    {durationMinutes > 0 ? `${durationMinutes} phút` : 'Không giới hạn'}
                  </span>
                </div>

                <div className="tku-summary-row">
                  <span className="tku-summary-label">Hạn nộp:</span>
                  <span className="tku-summary-value">
                    {dueDate ? new Date(dueDate).toLocaleString('vi-VN') : 'Chưa đặt'}
                  </span>
                </div>

                <div className="tku-summary-row">
                  <span className="tku-summary-label">Phạm vi giao:</span>
                  <span className="tku-summary-value font-bold">
                    {targetType === 'CUSTOM'
                      ? `Chỉ định (${selectedStudentIds.length} học viên)`
                      : 'Toàn bộ học viên'}
                  </span>
                </div>

                <div className="tku-summary-row">
                  <span className="tku-summary-label">Học sinh dự kiến:</span>
                  <span className="tku-summary-value font-bold">
                    {targetType === 'CUSTOM'
                      ? `${selectedStudentIds.length} học viên`
                      : selectedCourse
                      ? `${selectedCourse.studentCount} học viên`
                      : 'Toàn khóa'}
                  </span>
                </div>
              </div>

              <div className="tku-summary-card__footer">
                <button
                  type="button"
                  className="tku-btn-publish-primary tku-btn-publish-glow"
                  onClick={handlePublishAndAssign}
                  disabled={isPublishing || isSaving}
                >
                  {isPublishing ? (
                    <>
                      <Loader2 size={16} className="tku-spin-icon" />
                      <span>Đang xuất bản...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Xuất bản & Giao bài ngay</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default LecturerAssignPage;
