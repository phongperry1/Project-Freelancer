import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  FileSpreadsheet,
  Download,
  Mail,
  User,
  Phone,
  Calendar,
  UploadCloud,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { toast } from '../../context/toastService';
import './adminCreateUser.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseExcelDob = (rawVal: unknown): { dateStr: string | null; error: string | null } => {
  if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
    return { dateStr: null, error: 'Thiếu ngày sinh' };
  }
  let d: Date | null = null;
  if (rawVal instanceof Date) {
    d = rawVal;
  } else if (typeof rawVal === 'number' && rawVal > 0) {
    const totalMs = Math.round((rawVal - 25569) * 86400 * 1000);
    d = new Date(totalMs);
  } else {
    const str = String(rawVal).trim();
    const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const testD = new Date(Date.UTC(year, month, day));
      if (!isNaN(testD.getTime())) {
        d = testD;
      }
    } else {
      const testD = new Date(str);
      if (!isNaN(testD.getTime())) {
        d = testD;
      }
    }
  }

  if (!d || isNaN(d.getTime())) {
    return { dateStr: null, error: `Ngày sinh "${String(rawVal).trim()}" không đúng định dạng (ví dụ: 20/10/1985)` };
  }
  if (d > new Date()) {
    return { dateStr: null, error: 'Ngày sinh không được vượt quá ngày hiện tại' };
  }
  const fullYear = d.getUTCFullYear();
  if (fullYear < 1920) {
    return { dateStr: null, error: 'Năm sinh không hợp lệ' };
  }
  const y = fullYear;
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getUTCDate()).padStart(2, '0');
  return { dateStr: `${y}-${m}-${dayStr}`, error: null };
};

const parseExcelPhone = (rawVal: unknown): { phoneStr: string | null; error: string | null } => {
  if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
    return { phoneStr: null, error: 'Thiếu số điện thoại' };
  }
  const clean = String(rawVal).trim().replace(/[\s.-]/g, '');
  if (!/^(0|\+84)[0-9]{9}$/.test(clean) && !/^(0|\+84)[0-9]{10}$/.test(clean)) {
    return { phoneStr: null, error: `Số điện thoại "${String(rawVal).trim()}" không hợp lệ (gồm 10 số, ví dụ: 0912345678)` };
  }
  return { phoneStr: clean.startsWith('+84') ? '0' + clean.slice(3) : clean, error: null };
};

export const AdminCreateUserPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'MANUAL' | 'EXCEL'>('MANUAL');

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [isManualSubmitting, setIsManualSubmitting] = useState<boolean>(false);
  const [manualErrors, setManualErrors] = useState<{
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
  }>({});

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const validateField = useCallback(
    (field: 'fullName' | 'email' | 'phoneNumber' | 'dateOfBirth', val: string) => {
      const trimmed = val.trim();
      if (field === 'fullName') {
        if (!trimmed) return 'Vui lòng nhập họ và tên giảng viên.';
        if (trimmed.length < 2) return 'Họ và tên phải có tối thiểu 2 ký tự.';
        return '';
      }
      if (field === 'email') {
        if (!trimmed) return 'Vui lòng nhập email đăng nhập.';
        if (!EMAIL_REGEX.test(trimmed)) return 'Địa chỉ email không đúng định dạng.';
        return '';
      }
      if (field === 'phoneNumber') {
        if (!trimmed) return 'Vui lòng nhập số điện thoại giảng viên.';
        const cleanPhone = trimmed.replace(/[\s.-]/g, '');
        if (!/^(0|\+84)[0-9]{9}$/.test(cleanPhone) && !/^(0|\+84)[0-9]{10}$/.test(cleanPhone)) {
          return 'Số điện thoại không hợp lệ (gồm 10 số, ví dụ: 0912345678).';
        }
        return '';
      }
      if (field === 'dateOfBirth') {
        if (!trimmed) return 'Vui lòng chọn ngày sinh giảng viên.';
        const d = new Date(trimmed);
        if (isNaN(d.getTime())) return 'Ngày sinh không hợp lệ.';
        if (d > new Date()) return 'Ngày sinh không được vượt quá ngày hiện tại.';
        if (d.getFullYear() < 1920) return 'Năm sinh không hợp lệ.';
        return '';
      }
      return '';
    },
    [],
  );

  const handleManualSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const nameErr = validateField('fullName', fullName);
      const emailErr = validateField('email', email);
      const phoneErr = validateField('phoneNumber', phoneNumber);
      const dobErr = validateField('dateOfBirth', dateOfBirth);

      const errors: {
        fullName?: string;
        email?: string;
        phoneNumber?: string;
        dateOfBirth?: string;
      } = {};
      if (nameErr) errors.fullName = nameErr;
      if (emailErr) errors.email = emailErr;
      if (phoneErr) errors.phoneNumber = phoneErr;
      if (dobErr) errors.dateOfBirth = dobErr;

      if (Object.keys(errors).length > 0) {
        setManualErrors(errors);
        toast.error('Vui lòng kiểm tra lại thông tin biểu mẫu.');
        if (errors.fullName) {
          document.getElementById('teacher-fullname')?.focus();
        } else if (errors.email) {
          document.getElementById('teacher-email')?.focus();
        } else if (errors.phoneNumber) {
          document.getElementById('teacher-phone')?.focus();
        } else if (errors.dateOfBirth) {
          document.getElementById('teacher-dob')?.focus();
        }
        return;
      }

      setIsManualSubmitting(true);
      try {
        await adminService.createUser({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password: 'Giangvien@123',
          role: 'TEACHER',
          status: 'ACTIVE',
          phoneNumber: phoneNumber.trim(),
          dateOfBirth: dateOfBirth,
        });

        toast.success(`Đã tạo thành công tài khoản giảng viên cho ${fullName.trim()}!`);
        navigate('/admin/users');
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Không thể tạo tài khoản lúc này.';
        toast.error(msg);
        if (msg.toLowerCase().includes('email')) {
          setManualErrors((prev) => ({ ...prev, email: msg }));
          document.getElementById('teacher-email')?.focus();
        }
      } finally {
        if (isMountedRef.current) {
          setIsManualSubmitting(false);
        }
      }
    },
    [fullName, email, phoneNumber, dateOfBirth, validateField, navigate],
  );

  const handleDownloadSampleExcel = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const headers = ['Họ và tên', 'Email đăng nhập', 'Số điện thoại', 'Ngày sinh'];
      const sampleData = [
        ['PGS. TS. Trần Đức Hòa', 'tran.duchoa@tku.edu.vn', '0912345678', '20/10/1980'],
        ['TS. Lê Thị Mai', 'le.thimai@tku.edu.vn', '0987654321', '15/05/1985'],
        ['ThS. Nguyễn Quốc Huy', 'nguyen.quochuy@tku.edu.vn', '0903123456', '08/12/1990'],
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

      ws['!cols'] = [
        { wch: 28 },
        { wch: 32 },
        { wch: 18 },
        { wch: 18 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Danh_sach_giang_vien');

      XLSX.writeFile(wb, 'Danh_sach_giang_vien_mau.xlsx');
      toast.success('Đã tải xuống tệp mẫu Danh_sach_giang_vien_mau.xlsx thành công!');
    } catch {
      toast.error('Không thể tạo file mẫu Excel lúc này.');
    }
  }, []);

  const processAndImportFile = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
        toast.error('Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp .xlsx, .xls hoặc .csv.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Dung lượng tệp vượt quá giới hạn cho phép (tối đa 5MB).');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setIsImporting(true);

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result;
          if (!buffer) {
            toast.error('Không thể đọc dữ liệu tệp tin.');
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }

          const XLSX = await import('xlsx');
          const wb = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = wb.SheetNames[0];
          if (!firstSheetName) {
            toast.error('Tệp Excel không chứa trang dữ liệu nào.');
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }

          const ws = wb.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
            defval: '',
          });

          if (rawRows.length === 0) {
            toast.error('Tệp Excel không có dòng dữ liệu nào.');
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }

          const rowValidationErrors: string[] = [];
          const emailSet = new Set<string>();
          const validUsers: {
            fullName: string;
            email: string;
            password: string;
            role: 'TEACHER';
            status: 'ACTIVE';
            phoneNumber: string;
            dateOfBirth: string;
          }[] = [];

          rawRows.forEach((row, idx) => {
            const rowNumber = idx + 2;
            let rowName = '';
            let rowEmail = '';
            let rowPhone: unknown = '';
            let rowDob: unknown = '';

            for (const [key, val] of Object.entries(row)) {
              const normalizedKey = key.trim().toLowerCase();
              const stringVal = String(val ?? '').trim();

              if (
                normalizedKey.includes('họ') ||
                normalizedKey.includes('tên') ||
                normalizedKey.includes('name')
              ) {
                rowName = stringVal;
              } else if (
                normalizedKey.includes('email') ||
                normalizedKey.includes('thư')
              ) {
                rowEmail = stringVal;
              } else if (
                normalizedKey.includes('thoại') ||
                normalizedKey.includes('phone') ||
                normalizedKey.includes('sđt') ||
                normalizedKey.includes('tel')
              ) {
                rowPhone = val;
              } else if (
                normalizedKey.includes('sinh') ||
                normalizedKey.includes('birth') ||
                normalizedKey.includes('dob')
              ) {
                rowDob = val;
              }
            }

            if (!rowName && !rowEmail) {
              const values = Object.values(row);
              if (values.length >= 2) {
                rowName = String(values[0] ?? '').trim();
                rowEmail = String(values[1] ?? '').trim();
                rowPhone = values[2];
                rowDob = values[3];
              }
            }

            const trimmedName = rowName.trim();
            const trimmedEmail = rowEmail.trim().toLowerCase();
            const isRowEmpty = !trimmedName && !trimmedEmail && !rowPhone && !rowDob;

            if (isRowEmpty) {
              return;
            }

            let hasRowError = false;

            if (!trimmedName) {
              rowValidationErrors.push(`Dòng ${rowNumber}: Vui lòng nhập họ và tên.`);
              hasRowError = true;
            } else if (trimmedName.length < 2) {
              rowValidationErrors.push(`Dòng ${rowNumber}: Họ và tên phải có tối thiểu 2 ký tự.`);
              hasRowError = true;
            }

            if (!trimmedEmail) {
              rowValidationErrors.push(`Dòng ${rowNumber}: Vui lòng nhập email đăng nhập.`);
              hasRowError = true;
            } else if (!EMAIL_REGEX.test(trimmedEmail)) {
              rowValidationErrors.push(`Dòng ${rowNumber}: Email "${trimmedEmail}" không đúng định dạng.`);
              hasRowError = true;
            } else if (emailSet.has(trimmedEmail)) {
              rowValidationErrors.push(`Dòng ${rowNumber}: Email "${trimmedEmail}" bị trùng lặp trong tệp.`);
              hasRowError = true;
            }

            const phoneRes = parseExcelPhone(rowPhone);
            if (!phoneRes.phoneStr) {
              rowValidationErrors.push(`Dòng ${rowNumber}: ${phoneRes.error}.`);
              hasRowError = true;
            }

            const dobRes = parseExcelDob(rowDob);
            if (!dobRes.dateStr) {
              rowValidationErrors.push(`Dòng ${rowNumber}: ${dobRes.error}.`);
              hasRowError = true;
            }

            if (!hasRowError && phoneRes.phoneStr && dobRes.dateStr) {
              emailSet.add(trimmedEmail);
              validUsers.push({
                fullName: trimmedName,
                email: trimmedEmail,
                password: 'Giangvien@123',
                role: 'TEACHER',
                status: 'ACTIVE',
                phoneNumber: phoneRes.phoneStr,
                dateOfBirth: dobRes.dateStr,
              });
            }
          });

          if (rowValidationErrors.length > 0) {
            const preview = rowValidationErrors.slice(0, 2).join(' | ');
            const more =
              rowValidationErrors.length > 2
                ? ` (và ${rowValidationErrors.length - 2} lỗi khác)`
                : '';
            toast.error(`Dữ liệu tệp Excel chưa hợp lệ: ${preview}${more}`);
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }

          if (validUsers.length === 0) {
            toast.error('Tệp không chứa bản ghi giảng viên hợp lệ nào để tạo tài khoản.');
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }

          const res = await adminService.bulkCreateUsers({ users: validUsers });

          if (res.successCount > 0) {
            if (res.failedCount === 0) {
              toast.success(`Đã tạo thành công toàn bộ ${res.successCount} tài khoản giảng viên!`);
            } else {
              toast.warning(
                `Đã tạo thành công ${res.successCount} tài khoản (${res.failedCount} bản ghi bị bỏ qua do trùng lặp hoặc lỗi).`,
              );
            }
            navigate('/admin/users');
          } else {
            if (res.errors.length > 0) {
              const errorReason = res.errors[0]?.reason || 'Tài khoản đã tồn tại trên hệ thống.';
              toast.error(`Không thể tạo tài khoản: ${errorReason}`);
            } else {
              toast.error('Không thể tạo tài khoản nào từ tệp đã chọn.');
            }
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi xử lý tệp.';
          toast.error(`Không thể tạo tài khoản: ${msg}`);
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };

      reader.onerror = () => {
        toast.error('Có lỗi xảy ra trong quá trình đọc file.');
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };

      reader.readAsArrayBuffer(file);
    },
    [navigate],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processAndImportFile(file);
      }
      e.target.value = '';
    },
    [processAndImportFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        processAndImportFile(file);
      }
    },
    [processAndImportFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div className="tku-create-user-page">
      <header className="tku-create-user-header">
        <div className="tku-create-user-breadcrumbs">
          <Link to="/admin">Admin</Link>
          <span className="tku-create-user-breadcrumbs__sep">/</span>
          <Link to="/admin/users">Quản lý người dùng</Link>
          <span className="tku-create-user-breadcrumbs__sep">/</span>
          <span className="tku-create-user-breadcrumbs__current">
            Thêm tài khoản giảng viên
          </span>
        </div>

        <div className="tku-create-user-title-box">
          <div className="tku-create-user-title-main">
            <h1 className="tku-create-user-title">Thêm tài khoản giảng viên</h1>
            <p className="tku-create-user-desc">
              Khởi tạo tài khoản mới cho cán bộ giảng viên để phân công giảng dạy và quản lý các khóa học học thuật trên hệ thống.
            </p>
          </div>
        </div>
      </header>

      <div className="tku-create-user-content">
        <div className="tku-tabs-nav">
          <button
            type="button"
            className={`tku-tab-btn ${activeTab === 'MANUAL' ? 'tku-tab-btn--active' : ''}`}
            onClick={() => {
              setActiveTab('MANUAL');
              setManualErrors({});
            }}
          >
            <UserPlus size={16} />
            <span>Tạo thủ công</span>
          </button>

          <button
            type="button"
            className={`tku-tab-btn ${activeTab === 'EXCEL' ? 'tku-tab-btn--active' : ''}`}
            onClick={() => {
              setActiveTab('EXCEL');
              setManualErrors({});
            }}
          >
            <FileSpreadsheet size={16} />
            <span>Nhập từ file Excel</span>
          </button>
        </div>

        <div className="tku-create-user-layout">
          <div className="tku-create-user-col-main">
            {activeTab === 'MANUAL' ? (
              <div className="tku-card">
                <div className="tku-card-header">
                  <div className="tku-card-badge">
                    <UserPlus size={20} />
                  </div>
                  <div className="tku-card-info">
                    <h2 className="tku-card-title">Thông tin giảng viên</h2>
                    <p className="tku-card-subtitle">
                      Nhập đầy đủ họ tên và email công vụ để khởi tạo tài khoản
                    </p>
                  </div>
                </div>

                <form onSubmit={handleManualSubmit} noValidate>
                  <div className="tku-card-body">
                    <div className="tku-form-grid">
                      <div className="tku-form-group">
                        <label className="tku-label">
                          Họ và tên giảng viên <span className="tku-required">*</span>
                        </label>
                        <div className="tku-input-wrap">
                          <User size={16} className="tku-input-icon" />
                          <input
                            id="teacher-fullname"
                            type="text"
                            className={`tku-input ${manualErrors.fullName ? 'tku-input--error' : ''}`}
                            placeholder="Ví dụ: PGS. TS. Trần Đức Hòa"
                            value={fullName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFullName(val);
                              if (manualErrors.fullName) {
                                const err = validateField('fullName', val);
                                setManualErrors((prev) => ({ ...prev, fullName: err || undefined }));
                              }
                            }}
                            disabled={isManualSubmitting}
                          />
                        </div>
                        {manualErrors.fullName && (
                          <span className="tku-error-msg">{manualErrors.fullName}</span>
                        )}
                      </div>

                      <div className="tku-form-group">
                        <label className="tku-label">
                          Email đăng nhập học thuật <span className="tku-required">*</span>
                        </label>
                        <div className="tku-input-wrap">
                          <Mail size={16} className="tku-input-icon" />
                          <input
                            id="teacher-email"
                            type="email"
                            className={`tku-input ${manualErrors.email ? 'tku-input--error' : ''}`}
                            placeholder="Ví dụ: tran.duchoa@tku.edu.vn"
                            value={email}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEmail(val);
                              if (manualErrors.email) {
                                const err = validateField('email', val);
                                setManualErrors((prev) => ({ ...prev, email: err || undefined }));
                              }
                            }}
                            disabled={isManualSubmitting}
                          />
                        </div>
                        {manualErrors.email && (
                          <span className="tku-error-msg">{manualErrors.email}</span>
                        )}
                      </div>

                      <div className="tku-form-group">
                        <label className="tku-label">
                          Số điện thoại <span className="tku-required">*</span>
                        </label>
                        <div className="tku-input-wrap">
                          <Phone size={16} className="tku-input-icon" />
                          <input
                            id="teacher-phone"
                            type="tel"
                            className={`tku-input ${manualErrors.phoneNumber ? 'tku-input--error' : ''}`}
                            placeholder="Ví dụ: 0912 345 678"
                            value={phoneNumber}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPhoneNumber(val);
                              if (manualErrors.phoneNumber) {
                                const err = validateField('phoneNumber', val);
                                setManualErrors((prev) => ({ ...prev, phoneNumber: err || undefined }));
                              }
                            }}
                            disabled={isManualSubmitting}
                          />
                        </div>
                        {manualErrors.phoneNumber && (
                          <span className="tku-error-msg">{manualErrors.phoneNumber}</span>
                        )}
                      </div>

                      <div className="tku-form-group">
                        <label className="tku-label">
                          Ngày sinh <span className="tku-required">*</span>
                        </label>
                        <div className="tku-input-wrap">
                          <Calendar size={16} className="tku-input-icon" />
                          <input
                            id="teacher-dob"
                            type="date"
                            className={`tku-input ${manualErrors.dateOfBirth ? 'tku-input--error' : ''}`}
                            value={dateOfBirth}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDateOfBirth(val);
                              if (manualErrors.dateOfBirth) {
                                const err = validateField('dateOfBirth', val);
                                setManualErrors((prev) => ({ ...prev, dateOfBirth: err || undefined }));
                              }
                            }}
                            disabled={isManualSubmitting}
                          />
                        </div>
                        {manualErrors.dateOfBirth && (
                          <span className="tku-error-msg">{manualErrors.dateOfBirth}</span>
                        )}
                      </div>
                    </div>

                    <div className="tku-form-actions">
                      <button
                        type="button"
                        className="tku-btn-secondary"
                        onClick={() => navigate('/admin/users')}
                        disabled={isManualSubmitting}
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="tku-btn-primary"
                        disabled={isManualSubmitting}
                      >
                        <span>{isManualSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="tku-card">
                <div className="tku-card-header">
                  <div className="tku-card-badge tku-card-badge--green">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div className="tku-card-info">
                    <h2 className="tku-card-title">Nhập danh sách từ Excel</h2>
                    <p className="tku-card-subtitle">
                      Tải file Excel mẫu, điền danh sách giảng viên và tải lên hệ thống để khởi tạo hàng loạt
                    </p>
                  </div>
                </div>

                <div className="tku-card-body">
                  <div className="tku-template-box">
                    <div className="tku-template-top">
                      <div className="tku-template-icon">
                        <Download size={22} />
                      </div>
                      <div className="tku-template-info">
                        <h3 className="tku-template-title">Tải biểu mẫu Excel chuẩn (.xlsx)</h3>
                        <p className="tku-template-desc">
                          Hệ thống đã chuẩn hóa biểu mẫu với các cột: Họ và tên, Email đăng nhập, Số điện thoại, Ngày sinh. Mật khẩu mặc định sẽ là Giangvien@123.
                        </p>
                      </div>
                    </div>

                    <div className="tku-template-actions">
                      <button
                        type="button"
                        className="tku-btn-download"
                        onClick={handleDownloadSampleExcel}
                      >
                        <Download size={15} />
                        <span>Tải file Excel mẫu (.xlsx)</span>
                      </button>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    disabled={isImporting}
                  />

                  {isImporting ? (
                    <div className="tku-importing-card">
                      <div className="tku-admin-spinner" />
                      <div className="tku-importing-info">
                        <span className="tku-importing-title">
                          Đang xử lý tệp và tạo tài khoản...
                        </span>
                        <span className="tku-importing-desc">
                          Vui lòng đợi trong giây lát, hệ thống sẽ tự động chuyển về trang danh sách sau khi tạo xong.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`tku-dropzone ${isDragging ? 'tku-dropzone--active' : ''}`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="tku-dropzone-icon">
                        <UploadCloud size={28} />
                      </div>
                      <h4 className="tku-dropzone-title">
                        Kéo thả file Excel vào đây hoặc bấm để chọn tệp
                      </h4>
                      <p className="tku-dropzone-desc">
                        Hỗ trợ các định dạng .xlsx, .xls, .csv (Dung lượng tối đa 5MB)
                      </p>
                      <button
                        type="button"
                        className="tku-dropzone-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        <FileSpreadsheet size={15} />
                        <span>Chọn tệp từ máy tính</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>


        </div>
      </div>
    </div>
  );
};

export default AdminCreateUserPage;
