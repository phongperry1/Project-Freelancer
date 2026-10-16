import React, { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileQuestion,
  Award,
  Send,
  CheckCircle2,
  BookOpen,
  Clock,
  Loader2,
} from 'lucide-react';
import type { AssignmentItem } from '../../services/lecturer.service';

interface AssignmentStepperHeaderProps {
  assignment: AssignmentItem;
  currentStep: 1 | 2 | 3;
  onSaveDraft?: () => Promise<void> | void;
  isSaving?: boolean;
}

export const AssignmentStepperHeader: React.FC<AssignmentStepperHeaderProps> = memo(({
  assignment,
  currentStep,
  onSaveDraft,
  isSaving = false,
}) => {
  const navigate = useNavigate();
  const [isStepSwitching, setIsStepSwitching] = useState(false);

  const getStepStatus = useCallback(
    (stepNumber: number) => {
      if (stepNumber === currentStep) return 'active';
      if (stepNumber < currentStep) return 'completed';
      return 'upcoming';
    },
    [currentStep]
  );

  const handleStepClick = useCallback(
    async (path: string) => {
      if (isStepSwitching) return;
      if (onSaveDraft) {
        setIsStepSwitching(true);
        try {
          await onSaveDraft();
        } catch (e) {
          console.error('Failed to auto-save draft before step navigation', e);
        } finally {
          setIsStepSwitching(false);
        }
      }
      navigate(path);
    },
    [onSaveDraft, navigate, isStepSwitching]
  );

  const steps = useMemo(
    () => [
      {
        number: 1,
        title: 'Tạo câu hỏi',
        subtitle: `${assignment.questions?.length || 0} câu hỏi`,
        icon: FileQuestion,
        path: `/lecturer/assignments/${assignment.id}/questions`,
      },
      {
        number: 2,
        title: 'Thiết lập đáp án & thang điểm',
        subtitle: `Tổng ${assignment.totalScore} điểm`,
        icon: Award,
        path: `/lecturer/assignments/${assignment.id}/scoring`,
      },
      {
        number: 3,
        title: 'Giao bài cho học sinh',
        subtitle: assignment.status === 'ASSIGNED' ? 'Đã giao' : 'Chưa giao',
        icon: Send,
        path: `/lecturer/assignments/${assignment.id}/assign`,
      },
    ],
    [assignment.id, assignment.questions?.length, assignment.totalScore, assignment.status]
  );

  return (
    <div className="tku-stepper-header-wrapper">
      {/* Top Bar with Title & Meta Tags */}
      <div className="tku-stepper-top-bar">
        <div className="tku-stepper-top-bar__left">
          <div className="tku-stepper-assignment-info">
            <div className="tku-stepper-meta-tags">
              <span className="tku-badge-type">
                {assignment.type === 'QUIZ' && 'Bài tập ngắn (Quiz)'}
                {assignment.type === 'TEST' && 'Kiểm tra 45-60p'}
                {assignment.type === 'EXAM' && 'Đề thi học kỳ'}
              </span>

              <span className="tku-badge-course">
                <BookOpen size={12} />
                <span>{assignment.courseTitle || 'Chưa gán khóa học'}</span>
              </span>

              {assignment.durationMinutes && (
                <span className="tku-badge-duration">
                  <Clock size={12} />
                  <span>{assignment.durationMinutes} phút</span>
                </span>
              )}

              <span
                className={`tku-badge-status ${
                  assignment.status === 'ASSIGNED'
                    ? 'tku-badge-status--assigned'
                    : 'tku-badge-status--draft'
                }`}
              >
                {assignment.status === 'ASSIGNED' ? 'Đã giao' : 'Đang biên soạn'}
              </span>
            </div>

            <h1 className="tku-stepper-assignment-title" title={assignment.title}>
              {assignment.title}
            </h1>
          </div>
        </div>

        <div className="tku-stepper-top-bar__right">
          <div
            className={`tku-stepper-autosave-badge ${
              isSaving || isStepSwitching ? 'tku-stepper-autosave-badge--saving' : ''
            }`}
          >
            {isSaving || isStepSwitching ? (
              <>
                <Loader2 size={13} className="tku-lecturer-spin-icon" />
                <span>Đang lưu vào hệ thống...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} className="tku-stepper-saved-icon" />
                <span>Đã tự động lưu vào cơ sở dữ liệu</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3 Dedicated Steps Navigation Bar */}
      <nav aria-label="Các bước thiết lập bài tập" className="tku-stepper-nav">
        {steps.map((step) => {
          const status = getStepStatus(step.number);
          const StepIcon = step.icon;

          return (
            <button
              key={step.number}
              type="button"
              className={`tku-stepper-nav-item tku-stepper-nav-item--${status}`}
              onClick={() => handleStepClick(step.path)}
              title={`Chuyển đến Bước ${step.number}: ${step.title}`}
            >
              <div className="tku-stepper-nav-icon-wrap">
                {status === 'completed' ? (
                  <CheckCircle2 size={18} className="tku-stepper-icon-done" />
                ) : (
                  <StepIcon size={18} />
                )}
                <span className="tku-stepper-nav-badge">{step.number}</span>
              </div>

              <div className="tku-stepper-nav-text">
                <span className="tku-stepper-nav-step-label">Bước {step.number}</span>
                <span className="tku-stepper-nav-title">{step.title}</span>
                <span className="tku-stepper-nav-subtitle">{step.subtitle}</span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
});

AssignmentStepperHeader.displayName = 'AssignmentStepperHeader';
