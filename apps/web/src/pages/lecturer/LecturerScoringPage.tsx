import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Calculator,
  Loader2,
} from 'lucide-react';
import {
  lecturerService,
  distributeScoresEqually,
  type AssignmentItem,
  type QuestionItem,
} from '../../services/lecturer.service';
import { AssignmentStepperHeader } from './AssignmentStepperHeader';
import { toast } from '../../context/toastService';
import './lecturerAssignments.css';

export const LecturerScoringPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State initialization
  const [assignment, setAssignment] = useState<AssignmentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isDirtyRef = useRef(false);
  const assignmentRef = useRef<AssignmentItem | null>(null);

  // Keep assignmentRef in sync
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

  // Debounced auto-save to API (600ms) - only fires when modified
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

  // Explicit Save Draft handler
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
      toast.error('Có lỗi khi lưu');
    } finally {
      setIsSaving(false);
    }
  }, [assignment]);

  // Pure in-memory update for questions (zero disk write per keystroke)
  const updateQuestion = useCallback(
    (qId: string, updater: (prev: QuestionItem) => QuestionItem) => {
      isDirtyRef.current = true;
      setAssignment((prev) => {
        if (!prev) return null;
        const newQuestions = prev.questions.map((q) => (q.id === qId ? updater(q) : q));
        return { ...prev, questions: newQuestions };
      });
    },
    []
  );

  // Set correct answer for SINGLE CHOICE (radio)
  const handleSelectSingleCorrect = useCallback(
    (qId: string, optId: string) => {
      updateQuestion(qId, (prev) => ({
        ...prev,
        options: prev.options.map((opt) => ({
          ...opt,
          isCorrect: opt.id === optId,
        })),
      }));
    },
    [updateQuestion]
  );

  // Toggle correct answer for MULTIPLE CHOICE (checkbox)
  const handleToggleMultipleCorrect = useCallback(
    (qId: string, optId: string) => {
      updateQuestion(qId, (prev) => ({
        ...prev,
        options: prev.options.map((opt) =>
          opt.id === optId ? { ...opt, isCorrect: !opt.isCorrect } : opt
        ),
      }));
    },
    [updateQuestion]
  );

  // Set correct answer for TRUE/FALSE
  const handleSelectTrueFalseCorrect = useCallback(
    (qId: string, isTrueCorrect: boolean) => {
      updateQuestion(qId, (prev) => ({
        ...prev,
        options: prev.options.map((opt, idx) => ({
          ...opt,
          isCorrect: isTrueCorrect ? idx === 0 : idx === 1,
        })),
      }));
    },
    [updateQuestion]
  );

  // Update score for a question
  const handleScoreChange = useCallback(
    (qId: string, rawScore: string) => {
      const val = parseFloat(rawScore);
      const score = isNaN(val) ? 0 : Math.max(0, Math.round(val * 100) / 100);
      updateQuestion(qId, (prev) => ({
        ...prev,
        score,
      }));
    },
    [updateQuestion]
  );

  // Update solution text
  const handleSolutionChange = useCallback(
    (qId: string, solutionText: string) => {
      updateQuestion(qId, (prev) => ({
        ...prev,
        solutionText,
      }));
    },
    [updateQuestion]
  );

  // Helper: Equal distribution of 10 points
  const handleAutoDistributeScores = useCallback(async () => {
    if (!assignment || assignment.questions.length === 0) return;
    const rebalancedQuestions = distributeScoresEqually(assignment.questions, 10);
    const updated = { ...assignment, questions: rebalancedQuestions, totalScore: 10 };
    setAssignment(updated);
    assignmentRef.current = updated;
    try {
      const saved = await lecturerService.saveAssessment(updated);
      setAssignment(saved);
      assignmentRef.current = saved;
      toast.success(`Đã tự động chia đều thang 10 điểm cho ${rebalancedQuestions.length} câu hỏi`);
    } catch {
      // kept in memory
    }
  }, [assignment]);

  // Total score calculation memoized
  const totalScore = useMemo(() => {
    if (!assignment) return 0;
    const sum = assignment.questions.reduce((acc, q) => acc + (Number(q.score) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [assignment]);

  // Validate and Navigate to Page 3
  const handleContinueToAssign = useCallback(async () => {
    if (!assignment) return;
    for (const q of assignment.questions) {
      if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
        const hasCorrect = q.options.some((opt) => opt.isCorrect);
        if (!hasCorrect) {
          toast.warning(`Câu hỏi số ${q.sortOrder} chưa được chọn đáp án đúng!`);
          return;
        }
      }
    }
    await lecturerService.saveAssessment(assignment);
    navigate(`/lecturer/assignments/${assignment.id}/assign`);
  }, [assignment, navigate]);

  if (!assignment) {
    return (
      <div className="tku-lecturer-loading-wrapper" role="status" aria-live="polite">
        <Loader2 size={36} className="tku-lecturer-spin-icon" />
        <span>Đang tải dữ liệu thiết lập đáp án & thang điểm...</span>
      </div>
    );
  }

  return (
    <div className="tku-page-container tku-scoring-page">
      {/* 3-Step Wizard Navigation Header with Auto-save */}
      <AssignmentStepperHeader
        assignment={assignment}
        currentStep={2}
        onSaveDraft={handleSaveDraft}
        isSaving={isSaving}
      />

      {/* Top Scoring Summary Banner */}
      <div className="tku-scoring-summary-banner">
        <div className="tku-scoring-summary-banner__left">
          <div className="tku-score-metric">
            <span className="tku-score-metric__label">Tổng số câu hỏi</span>
            <span className="tku-score-metric__val">{assignment.questions.length} câu</span>
          </div>

          <div className="tku-score-metric-divider" />

          <div className="tku-score-metric">
            <span className="tku-score-metric__label">Thang điểm hiện tại</span>
            <div className="tku-score-display">
              <span className={`tku-score-val ${totalScore === 10 ? 'tku-score-val--ideal' : ''}`}>
                {totalScore}
              </span>
              <span className="tku-score-total">/ 10.0 đ</span>
            </div>
          </div>
        </div>

        <div className="tku-scoring-summary-banner__right">
          <button
            type="button"
            className="tku-btn-distribute-scores"
            onClick={handleAutoDistributeScores}
          >
            <Calculator size={15} />
            <span>Chia đều điểm (10đ cho {assignment.questions.length} câu)</span>
          </button>
        </div>
      </div>

      {/* Questions Scoring Cards List */}
      <main className="tku-scoring-body">
        <div className="tku-scoring-list">
          {assignment.questions.map((q, idx) => {
            return (
              <article key={q.id} className="tku-scoring-card">
                {/* Question Header & Points Input */}
                <div className="tku-scoring-card__header">
                  <div className="tku-scoring-card__title-wrap">
                    <span className="tku-scoring-card__q-num">Câu {idx + 1}</span>
                    <span className="tku-scoring-card__q-type">
                      {q.type === 'SINGLE_CHOICE' && 'Trắc nghiệm (1 đáp án)'}
                      {q.type === 'MULTIPLE_CHOICE' && 'Trắc nghiệm (Nhiều đáp án)'}
                      {q.type === 'TRUE_FALSE' && 'Đúng / Sai'}
                      {q.type === 'TEXT' && 'Tự luận / Trả lời ngắn'}
                    </span>
                  </div>

                  <div className="tku-scoring-card__score-wrap">
                    <label className="tku-score-input-label" htmlFor={`score-${q.id}`}>
                      Điểm câu này:
                    </label>
                    <div className="tku-score-input-group">
                      <input
                        id={`score-${q.id}`}
                        type="number"
                        step="0.25"
                        min="0"
                        max="100"
                        className="tku-score-number-input"
                        value={q.score}
                        onChange={(e) => handleScoreChange(q.id, e.target.value)}
                      />
                      <span className="tku-score-unit">điểm</span>
                    </div>
                  </div>
                </div>

                {/* Question Content Display */}
                <div className="tku-scoring-card__content">
                  <p className="tku-scoring-q-text">
                    {q.content.trim() || (
                      <em className="tku-text-empty-warning">(Chưa có nội dung câu hỏi)</em>
                    )}
                  </p>
                </div>

                {/* Answer Configuration Area */}
                <div className="tku-scoring-card__answer-section">
                  <div className="tku-answer-section-header">
                    <h4 className="tku-answer-section-title">
                      <CheckCircle2 size={16} className="tku-text-emerald" />
                      <span>Thiết lập đáp án chính xác</span>
                    </h4>
                    <span className="tku-answer-section-hint">
                      {q.type === 'SINGLE_CHOICE' && 'Bấm chọn vào đáp án đúng (chỉ 1 lựa chọn)'}
                      {q.type === 'MULTIPLE_CHOICE' && 'Tích chọn các đáp án đúng (có thể chọn nhiều)'}
                      {q.type === 'TRUE_FALSE' && 'Chọn nhận định là Đúng hay Sai'}
                      {q.type === 'TEXT' && 'Nhập đáp án chuẩn hoặc từ khóa thang chấm tự luận'}
                    </span>
                  </div>

                  {/* Single Choice Answer Selection */}
                  {q.type === 'SINGLE_CHOICE' && (
                    <div className="tku-scoring-options-grid">
                      {q.options.map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isCorrect = opt.isCorrect;
                        return (
                          <div
                            key={opt.id}
                            className={`tku-scoring-option-item ${
                              isCorrect ? 'tku-scoring-option-item--correct' : ''
                            }`}
                            onClick={() => handleSelectSingleCorrect(q.id, opt.id)}
                          >
                            <div className="tku-scoring-radio-wrap">
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={isCorrect}
                                onChange={() => handleSelectSingleCorrect(q.id, opt.id)}
                                className="tku-scoring-radio"
                              />
                              <span className="tku-scoring-letter">{letter}</span>
                            </div>
                            <span className="tku-scoring-opt-content">
                              {opt.content || <em>(Lựa chọn trống)</em>}
                            </span>
                            {isCorrect && (
                              <span className="tku-scoring-badge-correct">
                                <CheckCircle2 size={13} />
                                <span>Đáp án đúng</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Multiple Choice Answer Selection */}
                  {q.type === 'MULTIPLE_CHOICE' && (
                    <div className="tku-scoring-options-grid">
                      {q.options.map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isCorrect = opt.isCorrect;
                        return (
                          <div
                            key={opt.id}
                            className={`tku-scoring-option-item ${
                              isCorrect ? 'tku-scoring-option-item--correct' : ''
                            }`}
                            onClick={() => handleToggleMultipleCorrect(q.id, opt.id)}
                          >
                            <div className="tku-scoring-checkbox-wrap">
                              <input
                                type="checkbox"
                                checked={isCorrect}
                                onChange={() => handleToggleMultipleCorrect(q.id, opt.id)}
                                className="tku-scoring-checkbox"
                              />
                              <span className="tku-scoring-letter">{letter}</span>
                            </div>
                            <span className="tku-scoring-opt-content">
                              {opt.content || <em>(Lựa chọn trống)</em>}
                            </span>
                            {isCorrect && (
                              <span className="tku-scoring-badge-correct">
                                <CheckCircle2 size={13} />
                                <span>Đáp án đúng</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* True / False Answer Selection */}
                  {q.type === 'TRUE_FALSE' && (
                    <div className="tku-tf-scoring-row">
                      <button
                        type="button"
                        className={`tku-tf-btn ${
                          q.options[0]?.isCorrect ? 'tku-tf-btn--selected' : ''
                        }`}
                        onClick={() => handleSelectTrueFalseCorrect(q.id, true)}
                      >
                        <CheckCircle2 size={16} />
                        <span>Đúng (True)</span>
                      </button>

                      <button
                        type="button"
                        className={`tku-tf-btn ${
                          q.options[1]?.isCorrect ? 'tku-tf-btn--selected' : ''
                        }`}
                        onClick={() => handleSelectTrueFalseCorrect(q.id, false)}
                      >
                        <CheckCircle2 size={16} />
                        <span>Sai (False)</span>
                      </button>
                    </div>
                  )}

                  {/* Text / Essay Solution / Answer */}
                  {q.type === 'TEXT' && (
                    <div className="tku-text-answer-box">
                      <label className="tku-form-label" htmlFor={`text-guide-${q.id}`}>
                        Mô tả đáp số chuẩn & barem điểm gợi ý
                      </label>
                      <input
                        id={`text-guide-${q.id}`}
                        type="text"
                        className="tku-form-input"
                        placeholder="Nhập từ khóa hoặc kết quả chuẩn (ví dụ: x = 5, Cl2O7, ...)"
                        value={q.options[0]?.content || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateQuestion(q.id, (prev) => ({
                            ...prev,
                            options: [{ id: `opt-text-${q.id}`, content: val, isCorrect: true }],
                          }));
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Step-by-Step Detailed Solution & Explanation */}
                <div className="tku-scoring-card__solution-section">
                  <div className="tku-solution-header">
                    <label className="tku-solution-label" htmlFor={`sol-${q.id}`}>
                      <Lightbulb size={16} className="tku-text-amber" />
                      <span>Lời giải chi tiết & hướng dẫn giải</span>
                    </label>
                    <span className="tku-solution-subtext">
                      Học sinh sẽ xem phần giải thích này sau khi làm bài xong để củng cố kiến thức
                    </span>
                  </div>

                  <textarea
                    id={`sol-${q.id}`}
                    className="tku-solution-textarea"
                    rows={3}
                    placeholder="Nhập các bước giải chi tiết, công thức áp dụng hoặc giải thích lý do vì sao đáp án này đúng..."
                    value={q.solutionText || ''}
                    onChange={(e) => handleSolutionChange(q.id, e.target.value)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {/* Sticky Bottom Actions Bar */}
      <footer className="tku-scoring-bottom-bar">
        <div className="tku-scoring-bottom-bar__left">
          <button
            type="button"
            className="tku-btn-back-step"
            onClick={() => {
              if (assignment) lecturerService.saveAssessment(assignment).catch(() => {});
              navigate(`/lecturer/assignments/${assignment.id}/questions`);
            }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại: Tạo câu hỏi</span>
          </button>
        </div>

        <div className="tku-scoring-bottom-bar__right">
          <button
            type="button"
            className="tku-btn-next-primary"
            onClick={handleContinueToAssign}
          >
            <span>Tiếp tục: Giao bài cho học sinh</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default LecturerScoringPage;
