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
  Upload,
  Image as ImageIcon,
  ExternalLink,
  FileSpreadsheet,
  Download,
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  lecturerService,
  distributeScoresEqually,
  type AssignmentItem,
  type QuestionItem,
  type QuestionType,
  type QuestionOption,
} from '../../services/lecturer.service';
import { AssignmentStepperHeader } from './AssignmentStepperHeader';
import { MathText } from '../../components/common/MathText';
import { toast } from '../../context/toastService';
import './lecturerAssignments.css';

interface ParsedExcelQuestion {
  index: number;
  content: string;
  type: QuestionType;
  options: { letter: string; content: string; isCorrect: boolean }[];
  correctAnswersStr: string;
  solutionText: string;
}

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

  // Excel Import & Template Modal State
  const [showExcelModal, setShowExcelModal] = useState<boolean>(false);
  const [isParsingExcel, setIsParsingExcel] = useState<boolean>(false);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [parsedExcelQuestions, setParsedExcelQuestions] = useState<ParsedExcelQuestion[]>([]);
  const [excelImportMode, setExcelImportMode] = useState<'append' | 'replace'>('append');
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // Student Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewActiveIndex, setPreviewActiveIndex] = useState<number>(0);
  const [showAnswersInPreview, setShowAnswersInPreview] = useState<boolean>(false);
  const [previewSelectedAnswers, setPreviewSelectedAnswers] = useState<Record<string, string[]>>({});

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

  const [uploadingSolution, setUploadingSolution] = useState<boolean>(false);

  const handleSolutionFileUpload = useCallback(
    async (file: File) => {
      if (!activeQuestion) return;
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.warning('Dung lượng tệp vượt quá 10MB. Vui lòng chọn tệp nhỏ hơn.');
        return;
      }
      try {
        setUploadingSolution(true);
        const { url } = await lecturerService.uploadSolutionFile(file);
        updateActiveQuestion((prev) => ({
          ...prev,
          solutionFileUrl: url,
        }));
        toast.success('Đã tải lên tệp lời giải viết tay thành công!');
      } catch (err: unknown) {
        const error = err as Error;
        toast.error(error.message || 'Không thể tải lên tệp lời giải.');
      } finally {
        setUploadingSolution(false);
      }
    },
    [activeQuestion, updateActiveQuestion]
  );

  const handleRemoveSolutionFile = useCallback(() => {
    if (!window.confirm('Bạn có chắc chắn muốn gỡ tệp lời giải viết tay này không?')) return;
    updateActiveQuestion((prev) => ({
      ...prev,
      solutionFileUrl: null,
    }));
    toast.success('Đã gỡ tệp lời giải viết tay.');
  }, [updateActiveQuestion]);

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

  // Download Standard Excel Quiz Template
  const handleDownloadExcelTemplate = useCallback(() => {
    try {
      const headers = [
        'STT',
        'Nội dung câu hỏi',
        'Loại câu hỏi',
        'Đáp án A',
        'Đáp án B',
        'Đáp án C',
        'Đáp án D',
        'Đáp án đúng',
        'Lời giải chi tiết',
      ];

      const sampleRows = [
        [
          1,
          'Cho 5,6 gam Fe tác dụng hoàn toàn với dung dịch HCl dư. Thể tích khí $H_2$ thu được ở đktc là bao nhiêu?',
          'SINGLE_CHOICE',
          '2,24 lít',
          '4,48 lít',
          '1,12 lít',
          '3,36 lít',
          'A',
          'Phương trình phản ứng: $Fe + 2HCl \\rightarrow FeCl_2 + H_2$. Số mol Fe = 5,6 / 56 = 0,1 mol. Do đó $n_{H_2} = 0,1$ mol $\\Rightarrow V = 0,1 \\times 22,4 = 2,24$ lít.',
        ],
        [
          2,
          'Chất nào sau đây là oxit bazơ?',
          'SINGLE_CHOICE',
          '$CaO$',
          '$SO_2$',
          '$CO_2$',
          '$P_2O_5$',
          'A',
          '$CaO$ là oxit bazơ tan trong nước tạo thành dung dịch kiềm $Ca(OH)_2$.',
        ],
        [
          3,
          'Phản ứng giữa axit và bazơ luôn tạo ra muối và nước (phản ứng trung hòa).',
          'TRUE_FALSE',
          'Đúng',
          'Sai',
          '',
          '',
          'A',
          'Theo định nghĩa hóa học, phản ứng giữa một axit và một bazơ luôn tạo ra muối và nước.',
        ],
        [
          4,
          'Những kim loại nào sau đây tác dụng được với nước ở nhiệt độ thường?',
          'MULTIPLE_CHOICE',
          'Na (Natri)',
          'K (Kali)',
          'Cu (Đồng)',
          'Ag (Bạc)',
          'A, B',
          'Na và K là kim loại kiềm có tính khử rất mạnh, phản ứng mãnh liệt với nước ở nhiệt độ phòng.',
        ],
        [
          5,
          'Giải thích hiện tượng và viết phương trình khi sục từ từ khí $CO_2$ vào nước vôi trong $Ca(OH)_2$.',
          'TEXT',
          '',
          '',
          '',
          '',
          '',
          'Hiện tượng: Dung dịch vẩn đục trắng do kết tủa $CaCO_3$, sau đó kết tủa tan dần nếu sục $CO_2$ đến dư tạo $Ca(HCO_3)_2$.',
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 55 },
        { wch: 18 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 },
        { wch: 14 },
        { wch: 45 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Mau_De_Thi_TKU');
      XLSX.writeFile(wb, 'TKU_Mau_Soan_De_Thi.xlsx');
      toast.success('Đã tải xuống file mẫu Excel: TKU_Mau_Soan_De_Thi.xlsx');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể tải file mẫu Excel.');
    }
  }, []);

  // Parse Excel file dropped or selected
  const handleSelectExcelFile = useCallback(async (file: File) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Vui lòng chọn tệp định dạng Excel (.xlsx hoặc .xls).');
      return;
    }

    setIsParsingExcel(true);
    setExcelFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        throw new Error('Trang tính Excel trống hoặc không đọc được.');
      }

      const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (rawRows.length < 2) {
        throw new Error('File Excel chưa có dữ liệu câu hỏi.');
      }

      // Find header row
      let headerRowIndex = 0;
      for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
        const rowStr = rawRows[r].map((c) => String(c || '').toLowerCase()).join(' ');
        if (
          rowStr.includes('nội dung') ||
          rowStr.includes('câu hỏi') ||
          rowStr.includes('content') ||
          rowStr.includes('đáp án')
        ) {
          headerRowIndex = r;
          break;
        }
      }

      const headerRow = rawRows[headerRowIndex].map((c) => String(c || '').trim().toLowerCase());

      const findCol = (keys: string[]): number => {
        return headerRow.findIndex((h) => keys.some((k) => h.includes(k)));
      };

      const colContent = findCol(['nội dung', 'câu hỏi', 'content', 'cau hoi']);
      const colType = findCol(['loại', 'type', 'loai']);
      const colA = findCol(['đáp án a', 'phương án a', 'a', 'option a']);
      const colB = findCol(['đáp án b', 'phương án b', 'b', 'option b']);
      const colC = findCol(['đáp án c', 'phương án c', 'c', 'option c']);
      const colD = findCol(['đáp án d', 'phương án d', 'd', 'option d']);
      const colCorrect = findCol(['đáp án đúng', 'chính xác', 'correct', 'dap an dung']);
      const colSolution = findCol(['lời giải', 'giải thích', 'solution', 'huong dan']);

      const parsedList: ParsedExcelQuestion[] = [];

      for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        const content = String((colContent >= 0 ? row[colContent] : row[1]) || '').trim();
        if (!content) continue;

        const rawType = String((colType >= 0 ? row[colType] : row[2]) || '').trim().toUpperCase();
        let type: QuestionType = 'SINGLE_CHOICE';
        if (rawType.includes('MULTIPLE') || rawType.includes('NHIỀU')) {
          type = 'MULTIPLE_CHOICE';
        } else if (rawType.includes('TRUE') || rawType.includes('ĐÚNG') || rawType.includes('SAI')) {
          type = 'TRUE_FALSE';
        } else if (rawType.includes('TEXT') || rawType.includes('TỰ LUẬN') || rawType.includes('NGẮN')) {
          type = 'TEXT';
        }

        const correctRaw = String((colCorrect >= 0 ? row[colCorrect] : row[7]) || '').trim().toUpperCase();
        const solutionText = String((colSolution >= 0 ? row[colSolution] : row[8]) || '').trim();

        const optA = String((colA >= 0 ? row[colA] : row[3]) || '').trim();
        const optB = String((colB >= 0 ? row[colB] : row[4]) || '').trim();
        const optC = String((colC >= 0 ? row[colC] : row[5]) || '').trim();
        const optD = String((colD >= 0 ? row[colD] : row[6]) || '').trim();

        const options: { letter: string; content: string; isCorrect: boolean }[] = [];

        if (type === 'TRUE_FALSE') {
          const isACorrect =
            correctRaw.includes('A') ||
            correctRaw.includes('ĐÚNG') ||
            correctRaw.includes('TRUE') ||
            correctRaw.includes('1');
          options.push(
            { letter: 'A', content: optA || 'Đúng', isCorrect: isACorrect },
            { letter: 'B', content: optB || 'Sai', isCorrect: !isACorrect },
          );
        } else if (type === 'TEXT') {
          // No options needed for text essay
        } else {
          const rawOptions = [
            { letter: 'A', text: optA },
            { letter: 'B', text: optB },
            { letter: 'C', text: optC },
            { letter: 'D', text: optD },
          ];

          const correctTokens = correctRaw
            .split(/[,;\s]+/)
            .map((t) => t.trim().toUpperCase())
            .filter(Boolean);

          rawOptions.forEach((ro, idx) => {
            if (ro.text) {
              const isCorrect =
                correctTokens.includes(ro.letter) ||
                correctTokens.includes(String(idx + 1)) ||
                (type === 'SINGLE_CHOICE' && correctTokens.length === 0 && idx === 0);

              options.push({
                letter: ro.letter,
                content: ro.text,
                isCorrect,
              });
            }
          });

          if (options.length > 0 && !options.some((o) => o.isCorrect)) {
            options[0].isCorrect = true;
          }
        }

        parsedList.push({
          index: parsedList.length + 1,
          content,
          type,
          options,
          correctAnswersStr: correctRaw || (options.find((o) => o.isCorrect)?.letter ?? 'A'),
          solutionText,
        });
      }

      if (parsedList.length === 0) {
        throw new Error('Không tìm thấy câu hỏi hợp lệ nào trong file Excel.');
      }

      setParsedExcelQuestions(parsedList);
      toast.success(`Đã nhận diện thành công ${parsedList.length} câu hỏi từ file Excel!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi đọc file Excel.');
      setParsedExcelQuestions([]);
    } finally {
      setIsParsingExcel(false);
      if (excelFileInputRef.current) {
        excelFileInputRef.current.value = '';
      }
    }
  }, []);

  // Confirm Import parsed questions into assignment
  const handleConfirmImportExcel = useCallback(async () => {
    if (!assignment || parsedExcelQuestions.length === 0) return;

    const baseTimestamp = Date.now();
    const newQuestions: QuestionItem[] = parsedExcelQuestions.map((pq, qIdx) => {
      const qId = `q-imp-${baseTimestamp}-${qIdx + 1}-${Math.random().toString(36).substring(2, 6)}`;
      return {
        id: qId,
        content: pq.content,
        type: pq.type,
        score: 1, // Will be rebalanced
        sortOrder: qIdx + 1,
        solutionText: pq.solutionText || '',
        options: pq.options.map((opt, optIdx) => ({
          id: `opt-${qId}-${optIdx + 1}`,
          content: opt.content,
          isCorrect: opt.isCorrect,
        })),
      };
    });

    const combinedQuestions =
      excelImportMode === 'replace'
        ? newQuestions.map((q, idx) => ({ ...q, sortOrder: idx + 1 }))
        : [...assignment.questions, ...newQuestions].map((q, idx) => ({ ...q, sortOrder: idx + 1 }));

    const rebalancedQuestions = distributeScoresEqually(combinedQuestions, 10);
    const updated: AssignmentItem = {
      ...assignment,
      questions: rebalancedQuestions,
      totalScore: 10,
    };

    assignmentRef.current = updated;
    setAssignment(updated);
    setActiveQuestionId(rebalancedQuestions[0]?.id || '');
    isDirtyRef.current = false;

    try {
      await lecturerService.saveAssessment(updated);
      toast.success(`Đã nhập thành công ${newQuestions.length} câu hỏi vào đề thi!`);
      setShowExcelModal(false);
      setParsedExcelQuestions([]);
      setExcelFileName('');
    } catch {
      toast.error('Có lỗi khi lưu câu hỏi vào hệ thống.');
    }
  }, [assignment, parsedExcelQuestions, excelImportMode]);

  // Student Preview answer interactive selection
  const handleTogglePreviewAnswer = useCallback((qId: string, optId: string, isMultiple: boolean) => {
    setPreviewSelectedAnswers((prev) => {
      const current = prev[qId] || [];
      if (isMultiple) {
        const next = current.includes(optId)
          ? current.filter((id) => id !== optId)
          : [...current, optId];
        return { ...prev, [qId]: next };
      } else {
        return { ...prev, [qId]: [optId] };
      }
    });
  }, []);

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

      {/* Authoring Top Toolbar: Excel Import & Student Preview Actions */}
      <div className="tku-authoring-toolbar">
        <div className="tku-authoring-toolbar__info">
          <span className="tku-authoring-toolbar__tip">
            💡 Mẹo: Hỗ trợ công thức Toán & Hóa học bằng LaTeX (Ví dụ: <code>{'$H_2SO_4$'}</code>, <code>{'$\\frac{a}{b}$'}</code>)
          </span>
        </div>
        <div className="tku-authoring-toolbar__actions">
          <button
            type="button"
            className="tku-btn-toolbar tku-btn-toolbar--template"
            onClick={handleDownloadExcelTemplate}
            title="Tải xuống file mẫu Excel .xlsx chuẩn cho đề thi"
          >
            <Download size={14} />
            <span>Tải file mẫu Excel</span>
          </button>
          <button
            type="button"
            className="tku-btn-toolbar tku-btn-toolbar--excel"
            onClick={() => {
              setParsedExcelQuestions([]);
              setExcelFileName('');
              setShowExcelModal(true);
            }}
            title="Nhập hàng loạt 40-50 câu hỏi trắc nghiệm tự động từ file Excel"
          >
            <FileSpreadsheet size={14} />
            <span>Nhập từ Excel</span>
          </button>
          <button
            type="button"
            className="tku-btn-toolbar tku-btn-toolbar--preview"
            onClick={() => {
              setPreviewActiveIndex(0);
              setShowPreviewModal(true);
            }}
            title="Xem trước đề thi dưới góc nhìn học sinh"
          >
            <Eye size={14} />
            <span>Xem trước (Học sinh)</span>
          </button>
        </div>
      </div>

      {/* Main Authoring Layout */}
      <div className="tku-authoring-body">
        {/* Left Sidebar: Questions Outline & Navigator */}
        <aside className="tku-authoring-sidebar">
          <div className="tku-authoring-sidebar__header">
            <div className="tku-sidebar-count">
              <span className="tku-sidebar-count__num">{assignment.questions.length}</span>
              <span className="tku-sidebar-count__label">Câu hỏi</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="tku-btn-add-q-compact"
                onClick={() => {
                  setParsedExcelQuestions([]);
                  setExcelFileName('');
                  setShowExcelModal(true);
                }}
                title="Nhập đề thi từ file Excel"
                style={{ backgroundColor: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}
              >
                <FileSpreadsheet size={14} />
                <span>Excel</span>
              </button>
              <button
                type="button"
                className="tku-btn-add-q-compact"
                onClick={() => handleAddQuestion('SINGLE_CHOICE')}
                title="Thêm câu hỏi mới"
              >
                <Plus size={15} />
                <span>Thêm</span>
              </button>
            </div>
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
                    {q.solutionFileUrl && (
                      <span className="tku-q-nav-file-badge" title="Đã có file ảnh lời giải viết tay">
                        <FileText size={10} /> Có lời giải
                      </span>
                    )}
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

                {/* Live Math / Chemistry Formula Preview */}
                {activeQuestion.content && (activeQuestion.content.includes('$') || activeQuestion.content.includes('\\')) && (
                  <div className="tku-q-latex-live-preview">
                    <div className="tku-q-latex-live-preview-header">
                      <Sparkles size={13} style={{ color: '#1d68f2' }} />
                      <span>Xem trước công thức Toán / Hóa học (LaTeX):</span>
                    </div>
                    <div className="tku-q-latex-live-preview-body">
                      <MathText content={activeQuestion.content} />
                    </div>
                  </div>
                )}
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
                        <div key={opt.id} style={{ display: 'flex', flexDirection: 'column' }}>
                          <div className="tku-option-row">
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
                          {opt.content && (opt.content.includes('$') || opt.content.includes('\\')) && (
                            <div className="tku-option-latex-preview">
                              <MathText content={opt.content} />
                            </div>
                          )}
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
                        Hệ thống sẽ cung cấp ô nhập văn bản cho học sinh trình bày lời giải hoặc điền kết quả. Bạn có thể tải ngay file ảnh lời giải viết tay bên dưới để học sinh tham khảo khi xem kết quả.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Handwritten Solution File Upload (Phục vụ phần thi tự luận & trắc nghiệm có lời giải chi tiết) */}
              <div className="tku-authoring-solution-box">
                <div className="tku-authoring-solution-header">
                  <div className="tku-authoring-solution-title">
                    <ImageIcon size={16} className="tku-text-blue" />
                    <span>Tải lên file ảnh lời giải viết tay (Bản gốc / PDF)</span>
                    {activeQuestion.type === 'TEXT' && (
                      <span className="tku-authoring-solution-badge">Quan trọng cho bài tự luận</span>
                    )}
                  </div>
                  <p className="tku-authoring-solution-sub">
                    Tải lên ảnh chụp bài giải viết tay, sơ đồ vẽ tay hoặc tài liệu PDF để học sinh đối chiếu khi xem đáp án và lời giải chi tiết sau khi nộp bài.
                  </p>
                </div>

                {activeQuestion.solutionFileUrl ? (
                  <div className="tku-solution-file-preview-card">
                    <div className="tku-solution-file-preview-info">
                      {/\.(pdf)($|\?)/i.test(activeQuestion.solutionFileUrl) ? (
                        <FileText size={28} className="tku-text-red" />
                      ) : (
                        <img
                          src={activeQuestion.solutionFileUrl}
                          alt="Lời giải viết tay"
                          className="tku-solution-file-thumb"
                          loading="lazy"
                        />
                      )}
                      <div className="tku-solution-file-meta">
                        <span className="tku-solution-file-name">
                          {/\.(pdf)($|\?)/i.test(activeQuestion.solutionFileUrl)
                            ? 'Tài liệu lời giải (PDF)'
                            : 'Ảnh bài giải viết tay'}
                        </span>
                        <a
                          href={activeQuestion.solutionFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="tku-solution-file-link"
                        >
                          <span>Xem bản gốc</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>

                    <div className="tku-solution-file-actions">
                      <label className="tku-btn-reupload-file" title="Thay thế tệp khác">
                        <Upload size={13} />
                        <span>Đổi tệp</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,application/pdf"
                          style={{ display: 'none' }}
                          disabled={uploadingSolution}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleSolutionFileUpload(f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="tku-btn-remove-file"
                        title="Xóa tệp lời giải viết tay"
                        onClick={handleRemoveSolutionFile}
                      >
                        <Trash2 size={13} />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="tku-solution-file-dropzone">
                    <label className="tku-solution-file-upload-btn">
                      {uploadingSolution ? (
                        <>
                          <Loader2 size={15} className="tku-lecturer-spin-icon" />
                          <span>Đang tải lên Cloudinary...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={15} />
                          <span>Tải lên ảnh lời giải viết tay / file PDF</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        disabled={uploadingSolution}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleSolutionFileUpload(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <span className="tku-solution-file-dropzone__note">
                      Hỗ trợ ảnh PNG, JPG, WebP hoặc tài liệu PDF (tối đa 10MB)
                    </span>
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

      {/* Modal 1: Import Quiz from Excel */}
      {showExcelModal && (
        <div className="tku-excel-modal-overlay" onClick={() => setShowExcelModal(false)}>
          <div className="tku-excel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tku-excel-modal-header">
              <h3 className="tku-excel-modal-title">
                <FileSpreadsheet size={20} color="#059669" />
                <span>Nhập câu hỏi trắc nghiệm tự động từ file Excel (.xlsx)</span>
              </h3>
              <button
                type="button"
                className="tku-excel-modal-close-btn"
                onClick={() => setShowExcelModal(false)}
                title="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <div className="tku-excel-modal-body">
              {/* Dropzone */}
              <input
                type="file"
                ref={excelFileInputRef}
                accept=".xlsx, .xls"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleSelectExcelFile(f);
                }}
              />

              <div
                className="tku-excel-dropzone"
                onClick={() => excelFileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const f = e.dataTransfer.files?.[0];
                  if (f) void handleSelectExcelFile(f);
                }}
              >
                <div className="tku-excel-dropzone-icon">
                  {isParsingExcel ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={26} />
                  )}
                </div>
                <div className="tku-excel-dropzone-title">
                  {isParsingExcel ? (
                    <span>Đang xử lý dữ liệu câu hỏi từ file Excel...</span>
                  ) : (
                    <span>
                      Kéo thả file Excel vào đây, hoặc <strong>duyệt tệp từ thiết bị</strong>
                    </span>
                  )}
                </div>
                <span className="tku-excel-dropzone-sub">
                  Định dạng hỗ trợ: .xlsx, .xls (Theo mẫu chuẩn TKU). Tự động nhận diện công thức LaTeX.
                </span>
              </div>

              {/* Download template banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  color: '#475569',
                }}
              >
                <span>Chưa có mẫu file chuẩn hoặc cần tham khảo cấu trúc?</span>
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="tku-btn-toolbar tku-btn-toolbar--template"
                  style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                >
                  <Download size={13} />
                  <span>Tải file mẫu Excel (.xlsx)</span>
                </button>
              </div>

              {/* Parsed questions preview */}
              {parsedExcelQuestions.length > 0 && (
                <>
                  <div className="tku-excel-parsed-summary">
                    <span>
                      ✓ Đã nhận diện <strong>{parsedExcelQuestions.length}</strong> câu hỏi từ tệp:{' '}
                      <em>{excelFileName}</em>
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 'normal' }}>
                      (Thang điểm 10 sẽ được tự động chia đều)
                    </span>
                  </div>

                  {/* Mode selector */}
                  <div className="tku-excel-mode-selector">
                    <span className="tku-excel-mode-title">Phương thức nhập vào đề thi:</span>
                    <div className="tku-excel-mode-options">
                      <label className="tku-excel-mode-label">
                        <input
                          type="radio"
                          name="importMode"
                          value="append"
                          checked={excelImportMode === 'append'}
                          onChange={() => setExcelImportMode('append')}
                        />
                        <span>
                          Thêm tiếp vào sau các câu hiện có ({assignment.questions.length} câu cũ +{' '}
                          {parsedExcelQuestions.length} câu mới)
                        </span>
                      </label>
                      <label className="tku-excel-mode-label">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={excelImportMode === 'replace'}
                          onChange={() => setExcelImportMode('replace')}
                        />
                        <span>
                          Thay thế toàn bộ câu hỏi hiện tại (Đề thi chỉ gồm {parsedExcelQuestions.length} câu mới)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Table preview */}
                  <div>
                    <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Xem trước danh sách câu hỏi trích xuất (Hiển thị tối đa 5 câu đầu):
                    </span>
                    <div className="tku-excel-preview-table-wrap">
                      <table className="tku-excel-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>STT</th>
                            <th>Nội dung câu hỏi</th>
                            <th style={{ width: '120px' }}>Loại câu</th>
                            <th style={{ width: '160px' }}>Phương án</th>
                            <th style={{ width: '90px' }}>Đáp án đúng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedExcelQuestions.slice(0, 5).map((pq, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>
                                <MathText content={pq.content} />
                              </td>
                              <td>
                                <span className="tku-q-nav-type-tag">
                                  {pq.type === 'SINGLE_CHOICE' && '1 Đáp án'}
                                  {pq.type === 'MULTIPLE_CHOICE' && 'Nhiều đáp án'}
                                  {pq.type === 'TRUE_FALSE' && 'Đúng/Sai'}
                                  {pq.type === 'TEXT' && 'Tự luận'}
                                </span>
                              </td>
                              <td>
                                {pq.options.map((opt, oIdx) => (
                                  <div
                                    key={oIdx}
                                    style={{
                                      fontSize: '11px',
                                      color: opt.isCorrect ? '#059669' : '#475569',
                                      fontWeight: opt.isCorrect ? 'bold' : 'normal',
                                    }}
                                  >
                                    {opt.letter}. {opt.content}
                                  </div>
                                ))}
                              </td>
                              <td>
                                <strong style={{ color: '#059669' }}>{pq.correctAnswersStr}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="tku-excel-modal-footer">
              <button
                type="button"
                className="tku-curriculum-btn-cancel"
                onClick={() => setShowExcelModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="tku-btn-toolbar tku-btn-toolbar--excel"
                disabled={parsedExcelQuestions.length === 0}
                onClick={handleConfirmImportExcel}
                style={{ height: '36px', padding: '0 18px' }}
              >
                <Check size={14} />
                <span>
                  Xác nhận nhập {parsedExcelQuestions.length > 0 ? `${parsedExcelQuestions.length} câu hỏi` : ''}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Preview as Student */}
      {showPreviewModal && (
        <div className="tku-preview-modal-overlay">
          <div className="tku-preview-modal-container">
            {/* Header */}
            <div className="tku-preview-modal-header">
              <div className="tku-preview-header-left">
                <span className="tku-preview-student-badge">
                  <Eye size={13} />
                  <span>Góc nhìn học sinh (Preview)</span>
                </span>
                <h2 className="tku-preview-exam-title">{assignment.title}</h2>
              </div>

              <div className="tku-preview-header-right">
                <label className="tku-preview-answers-toggle">
                  <input
                    type="checkbox"
                    checked={showAnswersInPreview}
                    onChange={(e) => setShowAnswersInPreview(e.target.checked)}
                  />
                  <span>Hiện đáp án đúng & Lời giải</span>
                </label>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#1d68f2',
                    backgroundColor: '#eff6ff',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  <span>⏱️ {assignment.durationMinutes || 45}:00</span>
                </div>

                <button
                  type="button"
                  className="tku-preview-close-btn"
                  onClick={() => setShowPreviewModal(false)}
                >
                  <X size={15} />
                  <span>Đóng xem trước</span>
                </button>
              </div>
            </div>

            {/* Body */}
            {assignment.questions.length > 0 ? (
              <div className="tku-preview-modal-body">
                {/* Main Question Display */}
                {(() => {
                  const currentQ = assignment.questions[previewActiveIndex] || assignment.questions[0];
                  const isMultiple = currentQ.type === 'MULTIPLE_CHOICE';
                  const userSelected = previewSelectedAnswers[currentQ.id] || [];

                  return (
                    <div className="tku-preview-main-card">
                      <div className="tku-preview-q-top">
                        <span className="tku-preview-q-tag">
                          Câu {previewActiveIndex + 1} / {assignment.questions.length}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="tku-preview-q-score">
                            {currentQ.score} điểm
                          </span>
                          <span className="tku-q-nav-type-tag">
                            {currentQ.type === 'SINGLE_CHOICE' && '1 Đáp án'}
                            {currentQ.type === 'MULTIPLE_CHOICE' && 'Nhiều đáp án'}
                            {currentQ.type === 'TRUE_FALSE' && 'Đúng / Sai'}
                            {currentQ.type === 'TEXT' && 'Tự luận'}
                          </span>
                        </div>
                      </div>

                      {/* Question Content */}
                      <div className="tku-preview-q-content">
                        <MathText content={currentQ.content} />
                      </div>

                      {/* Options */}
                      {currentQ.type === 'TEXT' ? (
                        <div style={{ marginTop: '10px' }}>
                          <textarea
                            className="tku-q-textarea"
                            rows={4}
                            placeholder="Khu vực học sinh làm bài / nhập kết quả tự luận..."
                            disabled
                            style={{ backgroundColor: '#f8fafc', color: '#64748b' }}
                          />
                        </div>
                      ) : (
                        <div className="tku-preview-options-grid">
                          {currentQ.options.map((opt, oIdx) => {
                            const letter = String.fromCharCode(65 + oIdx);
                            const isSelected = userSelected.includes(opt.id);
                            const isCorrect = opt.isCorrect;

                            let cardClass = 'tku-preview-opt-card';
                            if (isSelected) cardClass += ' tku-preview-opt-card--selected';
                            if (showAnswersInPreview) {
                              if (isCorrect) {
                                cardClass += ' tku-preview-opt-card--correct';
                              } else if (isSelected && !isCorrect) {
                                cardClass += ' tku-preview-opt-card--incorrect';
                              }
                            }

                            return (
                              <div
                                key={opt.id}
                                className={cardClass}
                                onClick={() => handleTogglePreviewAnswer(currentQ.id, opt.id, isMultiple)}
                              >
                                <span className="tku-preview-opt-letter">{letter}</span>
                                <div className="tku-preview-opt-text">
                                  <MathText content={opt.content} />
                                </div>
                                {showAnswersInPreview && isCorrect && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '11.5px',
                                      fontWeight: '700',
                                      color: '#059669',
                                      backgroundColor: '#d1fae5',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                    }}
                                  >
                                    <Check size={12} />
                                    <span>Đáp án đúng</span>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Solution Box when toggle is ON */}
                      {showAnswersInPreview && (
                        <div className="tku-preview-solution-box">
                          <div className="tku-preview-solution-header">
                            💡 Lời giải chi tiết & Hướng dẫn chấm:
                          </div>
                          {currentQ.solutionText ? (
                            <div className="tku-preview-solution-text">
                              <MathText content={currentQ.solutionText} />
                            </div>
                          ) : (
                            <div className="tku-preview-solution-text" style={{ fontStyle: 'italic', color: '#64748b' }}>
                              Chưa có lời giải chi tiết bằng văn bản.
                            </div>
                          )}

                          {currentQ.solutionFileUrl && (
                            <div style={{ marginTop: '10px' }}>
                              {/\.(pdf)($|\?)/i.test(currentQ.solutionFileUrl) ? (
                                <a
                                  href={currentQ.solutionFileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: '#2563eb',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                  }}
                                >
                                  <FileText size={15} />
                                  <span>Xem tài liệu PDF lời giải đính kèm</span>
                                  <ExternalLink size={12} />
                                </a>
                              ) : (
                                <div>
                                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>
                                    Hình ảnh lời giải viết tay:
                                  </span>
                                  <img
                                    src={currentQ.solutionFileUrl}
                                    alt="Lời giải viết tay"
                                    style={{
                                      maxHeight: '220px',
                                      borderRadius: '8px',
                                      border: '1px solid #cbd5e1',
                                      objectFit: 'contain',
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Nav Footer inside question card */}
                      <div className="tku-preview-q-nav-footer">
                        <button
                          type="button"
                          className="tku-btn-toolbar tku-btn-toolbar--template"
                          disabled={previewActiveIndex === 0}
                          onClick={() => setPreviewActiveIndex((prev) => Math.max(0, prev - 1))}
                        >
                          <ChevronLeft size={15} />
                          <span>Câu trước</span>
                        </button>
                        <button
                          type="button"
                          className="tku-btn-toolbar tku-btn-toolbar--preview"
                          disabled={previewActiveIndex >= assignment.questions.length - 1}
                          onClick={() => setPreviewActiveIndex((prev) => Math.min(assignment.questions.length - 1, prev + 1))}
                        >
                          <span>Câu tiếp theo</span>
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Sidebar Question Grid Navigator */}
                <div className="tku-preview-sidebar-card">
                  <h4 className="tku-preview-grid-title">Bảng câu hỏi ({assignment.questions.length})</h4>
                  <div className="tku-preview-grid-nums">
                    {assignment.questions.map((q, idx) => {
                      const isActive = idx === previewActiveIndex;
                      const isAnswered = !!previewSelectedAnswers[q.id]?.length;
                      const hasCorrect = q.options.some((o) => o.isCorrect);

                      let btnClass = 'tku-preview-num-btn';
                      if (isActive) btnClass += ' tku-preview-num-btn--active';
                      else if (isAnswered) btnClass += ' tku-preview-num-btn--answered';

                      return (
                        <button
                          key={q.id}
                          type="button"
                          className={btnClass}
                          onClick={() => setPreviewActiveIndex(idx)}
                        >
                          {idx + 1}
                          {showAnswersInPreview && hasCorrect && (
                            <span className="tku-preview-num-btn-correct-dot" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '12px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tổng số câu hỏi:</span>
                      <strong>{assignment.questions.length} câu</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tổng điểm bài thi:</span>
                      <strong style={{ color: '#1d68f2' }}>{assignment.totalScore} điểm</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Thời gian làm bài:</span>
                      <strong>{assignment.durationMinutes || 45} phút</strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Chưa có câu hỏi nào trong đề thi để xem trước.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerQuestionAuthoringPage;
