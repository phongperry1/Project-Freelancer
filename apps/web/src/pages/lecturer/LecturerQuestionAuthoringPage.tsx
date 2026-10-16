import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Copy,
  ArrowRight,
  FileText,
  ListOrdered,
  CheckSquare,
  ToggleLeft,
  AlignLeft,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  lecturerService,
  distributeScoresEqually,
  type AssignmentItem,
  type QuestionItem,
  type QuestionType,
  type QuestionOption,
} from '../../services/lecturer.service';
import { AssignmentStepperHeader } from './AssignmentStepperHeader';
import { toast } from '../../context/toastService';
import './lecturerAssignments.css';

export const LecturerQuestionAuthoringPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Initialize assignment from PostgreSQL database via API
  const [assignment, setAssignment] = useState<AssignmentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const isDirtyRef = useRef(false);
  const assignmentRef = useRef<AssignmentItem | null>(null);

  // Sync assignment ref
  useEffect(() => {
    assignmentRef.current = assignment;
  }, [assignment]);

  // Fetch assessment by id from database
  useEffect(() => {
    let isMounted = true;
    if (!id) {
      navigate('/lecturer/assignments', { replace: true });
      return;
    }
    const fetchDetail = async () => {
      try {
        const item = await lecturerService.getAssessmentById(id);
        if (isMounted) {
          if (!item) {
            toast.error('Không tìm thấy bài tập hoặc bài kiểm tra này');
            navigate('/lecturer/assignments', { replace: true });
            return;
          }
          let itemToUse = item;
          if (item.questions.length > 0 && Math.abs(item.totalScore - 10) > 0.01) {
            const rebalanced = distributeScoresEqually(item.questions, 10);
            itemToUse = { ...item, questions: rebalanced, totalScore: 10 };
            lecturerService.saveAssessment(itemToUse).catch(() => {});
          }
          setAssignment(itemToUse);
          assignmentRef.current = itemToUse;
          setActiveQuestionId(itemToUse.questions[0]?.id || '');
          isDirtyRef.current = false;
        }
      } catch {
        if (isMounted) {
          toast.error('Có lỗi khi tải dữ liệu bài tập');
          navigate('/lecturer/assignments', { replace: true });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  // Flush save on unmount (guarantees changes are persisted if user leaves page, clicks breadcrumb or back)
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && assignmentRef.current) {
        lecturerService.saveAssessment(assignmentRef.current).catch(() => {});
      }
    };
  }, []);

  // Safeguard when closing tab or reloading page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirtyRef.current && assignmentRef.current) {
        lecturerService.saveAssessment(assignmentRef.current).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Debounced auto-save to database API (600ms) - fires quickly after user stops typing
  useEffect(() => {
    if (!assignment || isLoading || !isDirtyRef.current) return;
    setIsSaving(true);
    const timer = setTimeout(() => {
      lecturerService
        .saveAssessment(assignment)
        .then((updated) => {
          isDirtyRef.current = false;
          if (updated) {
            assignmentRef.current = updated;
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsSaving(false);
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [assignment, isLoading]);

  // Active question memoized for performance
  const activeQuestion = useMemo(() => {
    return (
      assignment?.questions.find((q) => q.id === activeQuestionId) ||
      assignment?.questions[0]
    );
  }, [assignment, activeQuestionId]);

  // Explicit Save Draft handler (awaitable by Stepper navigation)
  const handleSaveDraft = useCallback(async () => {
    const target = assignmentRef.current || assignment;
    if (!target) return;
    setIsSaving(true);
    try {
      const updated = await lecturerService.saveAssessment(target);
      setAssignment(updated);
      assignmentRef.current = updated;
      isDirtyRef.current = false;
    } catch {
      toast.error('Có lỗi khi lưu câu hỏi');
    } finally {
      setIsSaving(false);
    }
  }, [assignment]);

  // Pure in-memory update for active question (blazing fast, no synchronous I/O)
  const updateActiveQuestion = useCallback(
    (updater: (prev: QuestionItem) => QuestionItem) => {
      if (!activeQuestion) return;
      isDirtyRef.current = true;
      setAssignment((prev) => {
        if (!prev) return null;
        const newQuestions = prev.questions.map((q) =>
          q.id === activeQuestion.id ? updater(q) : q
        );
        return { ...prev, questions: newQuestions };
      });
    },
    [activeQuestion]
  );

  // Add new question
  const handleAddQuestion = useCallback((type: QuestionType = 'SINGLE_CHOICE') => {
    const current = assignmentRef.current;
    if (!current) return;

    const ts = Date.now();
    const newQId = `q-${ts}-${Math.random().toString(36).substring(2, 6)}`;
    let initialOptions: QuestionOption[] = [];

    if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') {
      initialOptions = [
        { id: `opt-${ts}-1`, content: 'Lựa chọn A', isCorrect: true },
        { id: `opt-${ts}-2`, content: 'Lựa chọn B', isCorrect: false },
        { id: `opt-${ts}-3`, content: 'Lựa chọn C', isCorrect: false },
        { id: `opt-${ts}-4`, content: 'Lựa chọn D', isCorrect: false },
      ];
    } else if (type === 'TRUE_FALSE') {
      initialOptions = [
        { id: `opt-${ts}-1`, content: 'Đúng', isCorrect: true },
        { id: `opt-${ts}-2`, content: 'Sai', isCorrect: false },
      ];
    }

    const newQuestion: QuestionItem = {
      id: newQId,
      content: '',
      type,
      score: 1, // Will be rebalanced immediately
      sortOrder: current.questions.length + 1,
      solutionText: '',
      options: initialOptions,
    };

    const rebalancedQuestions = distributeScoresEqually([...current.questions, newQuestion], 10);
    const updated: AssignmentItem = {
      ...current,
      questions: rebalancedQuestions,
      totalScore: 10,
    };

    assignmentRef.current = updated;
    setAssignment(updated);
    setActiveQuestionId(newQId);
    isDirtyRef.current = false;
    lecturerService.saveAssessment(updated).catch(() => {});
    toast.success(`Đã thêm câu hỏi số ${updated.questions.length}`);
  }, []);

  // Duplicate question
  const handleDuplicateQuestion = useCallback((qId: string) => {
    const current = assignmentRef.current;
    if (!current) return;
    const source = current.questions.find((q) => q.id === qId);
    if (!source) return;

    const dupTimestamp = Date.now();
    const newQId = `q-dup-${dupTimestamp}`;
    const duplicated: QuestionItem = {
      ...source,
      id: newQId,
      content: `${source.content} (Bản sao)`,
      sortOrder: current.questions.length + 1,
      options: source.options.map((opt, optIndex) => ({
        ...opt,
        id: `opt-dup-${dupTimestamp}-${optIndex}`,
      })),
    };

    const rebalancedQuestions = distributeScoresEqually([...current.questions, duplicated], 10);
    const updated: AssignmentItem = {
      ...current,
      questions: rebalancedQuestions,
      totalScore: 10,
    };

    assignmentRef.current = updated;
    setAssignment(updated);
    setActiveQuestionId(newQId);
    isDirtyRef.current = false;
    lecturerService.saveAssessment(updated).catch(() => {});
    toast.success('Đã nhân bản câu hỏi');
  }, []);

  // Delete question
  const handleDeleteQuestion = useCallback((qId: string) => {
    const current = assignmentRef.current;
    if (!current) return;
    if (current.questions.length <= 1) {
      toast.warning('Bài tập cần có ít nhất 1 câu hỏi');
      return;
    }

    const filtered = current.questions.filter((q) => q.id !== qId);
    const reordered = filtered.map((q, idx) => ({ ...q, sortOrder: idx + 1 }));
    const rebalancedQuestions = distributeScoresEqually(reordered, 10);
    const updated: AssignmentItem = {
      ...current,
      questions: rebalancedQuestions,
      totalScore: 10,
    };

    assignmentRef.current = updated;
    setAssignment(updated);
    setActiveQuestionId((prevActive) => (prevActive === qId ? reordered[0]?.id || '' : prevActive));
    isDirtyRef.current = false;
    lecturerService.saveAssessment(updated).catch(() => {});
    toast.success('Đã xóa câu hỏi');
  }, []);

  // Handle Question Type Change
  const handleChangeQuestionType = useCallback(
    (newType: QuestionType) => {
      updateActiveQuestion((prev) => {
        let newOptions: QuestionOption[];
        if (newType === 'SINGLE_CHOICE' || newType === 'MULTIPLE_CHOICE') {
          newOptions =
            prev.options.length >= 2
              ? prev.options
              : [
                  { id: `opt-${Date.now()}-1`, content: 'Lựa chọn A', isCorrect: true },
                  { id: `opt-${Date.now()}-2`, content: 'Lựa chọn B', isCorrect: false },
                  { id: `opt-${Date.now()}-3`, content: 'Lựa chọn C', isCorrect: false },
                  { id: `opt-${Date.now()}-4`, content: 'Lựa chọn D', isCorrect: false },
                ];
        } else if (newType === 'TRUE_FALSE') {
          newOptions = [
            { id: `opt-${Date.now()}-1`, content: 'Đúng', isCorrect: true },
            { id: `opt-${Date.now()}-2`, content: 'Sai', isCorrect: false },
          ];
        } else {
          newOptions = [];
        }
        return { ...prev, type: newType, options: newOptions };
      });
    },
    [updateActiveQuestion]
  );

  // Option actions
  const handleAddOption = useCallback(() => {
    if (!activeQuestion) return;
    const nextLetter = String.fromCharCode(65 + activeQuestion.options.length);
    const newOpt: QuestionOption = {
      id: `opt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      content: `Lựa chọn ${nextLetter}`,
      isCorrect: false,
    };
    updateActiveQuestion((prev) => ({
      ...prev,
      options: [...prev.options, newOpt],
    }));
  }, [activeQuestion, updateActiveQuestion]);

  const handleUpdateOptionText = useCallback(
    (optId: string, text: string) => {
      updateActiveQuestion((prev) => ({
        ...prev,
        options: prev.options.map((opt) => (opt.id === optId ? { ...opt, content: text } : opt)),
      }));
    },
    [updateActiveQuestion]
  );

  const handleDeleteOption = useCallback(
    (optId: string) => {
      if (!activeQuestion) return;
      if (activeQuestion.options.length <= 2) {
        toast.warning('Câu hỏi trắc nghiệm cần tối thiểu 2 lựa chọn');
        return;
      }
      updateActiveQuestion((prev) => ({
        ...prev,
        options: prev.options.filter((opt) => opt.id !== optId),
      }));
    },
    [activeQuestion, updateActiveQuestion]
  );

  // Validate and Navigate to Page 2
  const handleContinueToScoring = useCallback(async () => {
    if (!assignment) return;
    const emptyQ = assignment.questions.find((q) => !q.content.trim());
    if (emptyQ) {
      toast.warning(`Vui lòng nhập nội dung cho câu hỏi số ${emptyQ.sortOrder}`);
      setActiveQuestionId(emptyQ.id);
      return;
    }
    await lecturerService.saveAssessment(assignment);
    navigate(`/lecturer/assignments/${assignment.id}/scoring`);
  }, [assignment, navigate]);

  if (!assignment) {
    return (
      <div className="tku-lecturer-loading-wrapper" role="status" aria-live="polite">
        <Loader2 size={36} className="tku-lecturer-spin-icon" />
        <span>Đang tải dữ liệu bài tập...</span>
      </div>
    );
  }

  const questionTypes: {
    type: QuestionType;
    label: string;
    desc: string;
    icon: typeof ListOrdered;
  }[] = [
    {
      type: 'SINGLE_CHOICE',
      label: 'Trắc nghiệm (1 đáp án đúng)',
      desc: 'Học sinh chỉ chọn 1 đáp án chính xác duy nhất',
      icon: ListOrdered,
    },
    {
      type: 'MULTIPLE_CHOICE',
      label: 'Trắc nghiệm (Nhiều đáp án)',
      desc: 'Học sinh có thể chọn nhiều đáp án đúng cùng lúc',
      icon: CheckSquare,
    },
    {
      type: 'TRUE_FALSE',
      label: 'Đúng / Sai',
      desc: 'Đưa ra một mệnh đề để học sinh nhận định Đúng hoặc Sai',
      icon: ToggleLeft,
    },
    {
      type: 'TEXT',
      label: 'Tự luận / Trả lời ngắn',
      desc: 'Học sinh tự gõ câu trả lời hoặc trình bày lời giải',
      icon: AlignLeft,
    },
  ];

  return (
    <div className="tku-page-container tku-authoring-page">
      {/* 3-Step Wizard Navigation Header with Auto-save */}
      <AssignmentStepperHeader
        assignment={assignment}
        currentStep={1}
        onSaveDraft={handleSaveDraft}
        isSaving={isSaving}
      />

      {/* Main Authoring Layout */}
      <div className="tku-authoring-body">
        {/* Left Sidebar: Questions Outline & Navigator */}
        <aside className="tku-authoring-sidebar">
          <div className="tku-authoring-sidebar__header">
            <div className="tku-sidebar-count">
              <span className="tku-sidebar-count__num">{assignment.questions.length}</span>
              <span className="tku-sidebar-count__label">Câu hỏi</span>
            </div>
            <button
              type="button"
              className="tku-btn-add-q-compact"
              onClick={() => handleAddQuestion('SINGLE_CHOICE')}
              title="Thêm câu hỏi mới"
            >
              <Plus size={16} />
              <span>Thêm câu</span>
            </button>
          </div>

          <div className="tku-authoring-sidebar__list">
            {assignment.questions.map((q, idx) => {
              const isSelected = q.id === (activeQuestion?.id || '');
              return (
                <div
                  key={q.id}
                  className={`tku-q-nav-card ${isSelected ? 'tku-q-nav-card--active' : ''}`}
                  onClick={() => setActiveQuestionId(q.id)}
                >
                  <div className="tku-q-nav-card__left">
                    <span className="tku-q-nav-number">Câu {idx + 1}</span>
                    <span className="tku-q-nav-type-tag">
                      {q.type === 'SINGLE_CHOICE' && '1 Đáp án'}
                      {q.type === 'MULTIPLE_CHOICE' && 'Nhiều đáp án'}
                      {q.type === 'TRUE_FALSE' && 'Đúng/Sai'}
                      {q.type === 'TEXT' && 'Tự luận'}
                    </span>
                    <p className="tku-q-nav-snippet">
                      {q.content.trim() || 'Chưa nhập nội dung câu hỏi...'}
                    </p>
                  </div>

                  <div className="tku-q-nav-card__actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="tku-q-nav-btn"
                      onClick={() => handleDuplicateQuestion(q.id)}
                      title="Nhân bản câu hỏi"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      className="tku-q-nav-btn tku-q-nav-btn--danger"
                      onClick={() => handleDeleteQuestion(q.id)}
                      title="Xóa câu hỏi"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="tku-authoring-sidebar__footer">
            <button
              type="button"
              className="tku-btn-add-q-full"
              onClick={() => handleAddQuestion('SINGLE_CHOICE')}
            >
              <Plus size={16} />
              <span>Thêm câu hỏi mới</span>
            </button>
          </div>
        </aside>

        {/* Right Area: Dedicated Question Workspace */}
        <main className="tku-authoring-workspace">
          {activeQuestion ? (
            <div className="tku-authoring-card">
              {/* Question Header & Type Selector */}
              <div className="tku-q-editor-header">
                <div className="tku-q-editor-title-wrap">
                  <span className="tku-q-badge-large">
                    Câu hỏi số {activeQuestion.sortOrder} / {assignment.questions.length}
                  </span>
                  <span className="tku-q-editor-subtext">
                    Trang 1: Soạn nội dung câu hỏi và các lựa chọn
                  </span>
                </div>

                <div className="tku-q-type-selector-group">
                  {questionTypes.map((t) => {
                    const TypeIcon = t.icon;
                    const isCurrent = activeQuestion.type === t.type;
                    return (
                      <button
                        key={t.type}
                        type="button"
                        className={`tku-q-type-pill ${isCurrent ? 'tku-q-type-pill--active' : ''}`}
                        onClick={() => handleChangeQuestionType(t.type)}
                        title={t.desc}
                      >
                        <TypeIcon size={14} />
                        <span>{t.label.split(' ')[0]} {t.label.split(' ')[1] || ''}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question Content Input */}
              <div className="tku-q-content-box">
                <label className="tku-form-label" htmlFor={`q-content-${activeQuestion.id}`}>
                  Nội dung câu hỏi <span className="tku-form-required">*</span>
                </label>
                <textarea
                  id={`q-content-${activeQuestion.id}`}
                  className="tku-q-textarea"
                  placeholder="Nhập nội dung câu hỏi, bài toán hoặc tình huống..."
                  value={activeQuestion.content}
                  onChange={(e) =>
                    updateActiveQuestion((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  rows={4}
                />
              </div>

              {/* Options Section */}
              <div className="tku-q-options-container">
                <div className="tku-q-options-heading">
                  <h3 className="tku-q-options-title">
                    {activeQuestion.type === 'TEXT'
                      ? 'Hướng dẫn trả lời cho học sinh'
                      : 'Danh sách các lựa chọn đáp án'}
                  </h3>
                  <span className="tku-q-options-hint">
                    {activeQuestion.type === 'SINGLE_CHOICE' &&
                      'Soạn các phương án A, B, C, D (Thiết lập đáp án đúng sẽ ở Trang 2)'}
                    {activeQuestion.type === 'MULTIPLE_CHOICE' &&
                      'Soạn các phương án trả lời cho học sinh'}
                    {activeQuestion.type === 'TRUE_FALSE' &&
                      'Mặc định gồm 2 lựa chọn Đúng hoặc Sai'}
                    {activeQuestion.type === 'TEXT' &&
                      'Học sinh sẽ trả lời dạng tự luận hoặc điền đáp số ngắn'}
                  </span>
                </div>

                {/* Single Choice / Multiple Choice Options */}
                {(activeQuestion.type === 'SINGLE_CHOICE' ||
                  activeQuestion.type === 'MULTIPLE_CHOICE') && (
                  <div className="tku-options-list">
                    {activeQuestion.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      return (
                        <div key={opt.id} className="tku-option-row">
                          <span className="tku-option-letter">{letter}</span>
                          <input
                            type="text"
                            className="tku-option-input"
                            value={opt.content}
                            onChange={(e) => handleUpdateOptionText(opt.id, e.target.value)}
                            placeholder={`Nội dung lựa chọn ${letter}...`}
                          />
                          <button
                            type="button"
                            className="tku-option-delete-btn"
                            onClick={() => handleDeleteOption(opt.id)}
                            title="Xóa lựa chọn này"
                            disabled={activeQuestion.options.length <= 2}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      className="tku-btn-add-option"
                      onClick={handleAddOption}
                    >
                      <Plus size={15} />
                      <span>Thêm lựa chọn ({String.fromCharCode(65 + activeQuestion.options.length)})</span>
                    </button>
                  </div>
                )}

                {/* True / False Options */}
                {activeQuestion.type === 'TRUE_FALSE' && (
                  <div className="tku-tf-preview-grid">
                    <div className="tku-tf-preview-box">
                      <span className="tku-tf-tag">A</span>
                      <span className="tku-tf-label">Đúng (True)</span>
                    </div>
                    <div className="tku-tf-preview-box">
                      <span className="tku-tf-tag">B</span>
                      <span className="tku-tf-label">Sai (False)</span>
                    </div>
                  </div>
                )}

                {/* Text / Essay Instructions */}
                {activeQuestion.type === 'TEXT' && (
                  <div className="tku-text-preview-box">
                    <FileText size={20} className="tku-text-icon" />
                    <div>
                      <p className="tku-text-title">Dạng câu hỏi tự luận / Trả lời ngắn</p>
                      <p className="tku-text-desc">
                        Hệ thống sẽ cung cấp ô nhập văn bản cho học sinh trình bày lời giải hoặc điền kết quả. Ở bước tiếp theo (Trang 2), bạn sẽ nhập hướng dẫn chấm và đáp án chuẩn.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Informational Callout */}
              <div className="tku-step-info-callout">
                <AlertCircle size={18} className="tku-callout-icon" />
                <div className="tku-callout-content">
                  <strong>Bạn đang ở Trang 1: Tạo câu hỏi</strong>
                  <p>
                    Tại đây bạn tập trung thiết kế câu hỏi và các phương án trả lời. Sau khi hoàn tất danh sách câu hỏi, bấm <strong>"Tiếp tục: Thiết lập đáp án & thang điểm"</strong> để sang Trang 2 chọn đáp án đúng, nhập thang điểm và lời giải chi tiết.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="tku-empty-authoring-state">
              <p>Chọn một câu hỏi từ danh sách bên trái hoặc bấm "Thêm câu hỏi mới"</p>
            </div>
          )}
        </main>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <footer className="tku-authoring-bottom-bar">
        <div className="tku-authoring-bottom-bar__left">
          <span className="tku-bottom-stat">
            Tổng cộng <strong>{assignment.questions.length}</strong> câu hỏi
          </span>
        </div>

        <div className="tku-authoring-bottom-bar__right">
          <button
            type="button"
            className="tku-btn-next-primary"
            onClick={handleContinueToScoring}
          >
            <span>Tiếp tục: Thiết lập đáp án & thang điểm</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default LecturerQuestionAuthoringPage;
