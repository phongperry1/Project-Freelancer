import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  Sparkles,
  Clock,
  CheckCircle2,
  Headphones,
  KeyRound,
  PlayCircle,
  FileText,
  UserCheck,
  Search,
  X,
  ChevronDown,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import '../course/coursesPage.css';
import '../qa/qaPage.css';
import './supportPage.css';

export type SupportCategory = 'all' | 'activation' | 'learning' | 'exam' | 'account';

interface FAQItem {
  id: string;
  category: SupportCategory;
  categoryLabel: string;
  question: string;
  answerParagraphs: string[];
  bulletPoints?: string[];
  note?: string;
  tag: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'activation',
    categoryLabel: 'Kích hoạt khóa học',
    question: 'Làm thế nào để kích hoạt khóa học bằng mã bản quyền (Key)?',
    answerParagraphs: [
      'Để kích hoạt khóa học bằng mã bản quyền (Key) được cung cấp bởi Ban tuyển sinh hoặc Giảng viên TKU, bạn thực hiện theo các bước chuẩn sau:',
      'Sau khi kích hoạt thành công, khóa học sẽ ngay lập tức được thêm vào danh sách "Khóa học của tôi", cho phép bạn học toàn bộ các bài giảng, làm bài tập và tải tài liệu không giới hạn.',
    ],
    bulletPoints: [
      'Bước 1: Đăng nhập vào tài khoản học sinh TKU của bạn.',
      'Bước 2: Truy cập trang chi tiết của khóa học bạn muốn đăng ký tham gia.',
      'Bước 3: Nhấn vào nút "Kích hoạt khóa học", nhập chính xác mã kích hoạt 16 ký tự được cấp.',
      'Bước 4: Nhấn "Xác nhận kích hoạt" để hoàn tất.',
    ],
    note: 'Lưu ý: Bạn cần kiểm tra kỹ ký tự viết hoa và số để tránh nhập sai mã.',
    tag: 'Mã kích hoạt Key',
  },
  {
    id: 'faq-2',
    category: 'activation',
    categoryLabel: 'Kích hoạt khóa học',
    question: 'Một mã kích hoạt có thể sử dụng cho nhiều tài khoản hoặc dùng lại được không?',
    answerParagraphs: [
      'Mỗi mã kích hoạt chỉ có giá trị sử dụng duy nhất một (01) lần và sẽ được liên kết trực tiếp với tài khoản học sinh kích hoạt đầu tiên.',
      'Toàn bộ lộ trình học tập, lịch sử nộp bài kiểm tra và điểm số tích lũy sẽ được bảo lưu trọn đời trên tài khoản đó. Nếu bạn nhập mã mà hệ thống báo "Mã đã được kích hoạt" hoặc "Mã không hợp lệ", hãy liên hệ ngay Hotline hoặc Fanpage để được kiểm tra đối soát.',
    ],
    tag: 'Chính sách bản quyền',
  },
  {
    id: 'faq-3',
    category: 'learning',
    categoryLabel: 'Bài giảng & Học tập',
    question: 'Tôi có thể xem lại video bài giảng bao nhiêu lần và hệ thống có lưu tiến độ không?',
    answerParagraphs: [
      'Nền tảng học tập TKU không giới hạn số lần xem bài giảng của học sinh trong suốt thời hạn khóa học.',
      'Hệ thống tích hợp công nghệ ghi nhớ tiến độ thông minh, giúp bạn tiếp thu kiến thức khoa học và thuận tiện nhất.',
    ],
    bulletPoints: [
      'Không giới hạn lượt xem: Bạn có thể xem lại các phần lý thuyết hoặc dạng bài tập khó nhiều lần.',
      'Lưu mốc thời gian tự động: Hệ thống lưu chính xác giây xem dở để bạn tiếp tục bài học trên điện thoại hoặc máy tính.',
      'Tùy chỉnh tốc độ: Bạn có thể điều chỉnh tốc độ phát từ 0.75x đến 2.0x để phù hợp với nhịp độ tiếp thu của mình.',
      'Đánh dấu hoàn thành: Bài học sẽ tự động được đánh dấu tick xanh khi bạn hoàn thành đầy đủ thời lượng.',
    ],
    tag: 'Video bài giảng',
  },
  {
    id: 'faq-4',
    category: 'learning',
    categoryLabel: 'Bài giảng & Học tập',
    question: 'Làm cách nào để tải tài liệu PDF bài tập và ghi chú khi đang xem bài giảng?',
    answerParagraphs: [
      'Trong phòng học trực tuyến của mỗi bài giảng, học sinh có thể tiếp cận tài liệu bổ trợ ngay bên cạnh video:',
    ],
    bulletPoints: [
      'Tài liệu đính kèm: Nhấp vào tab "Tài liệu & Tệp đính kèm" để tải về file PDF đề bài, tóm tắt lý thuyết sơ đồ tư duy chất lượng cao.',
      'Tính năng Ghi chú: Sử dụng thanh ghi chú trực tiếp dưới video để lưu lại các mẹo giải nhanh, công thức đặc biệt gắn liền với mốc thời gian của bài giảng.',
    ],
    tag: 'Tài liệu & Ghi chú',
  },
  {
    id: 'faq-5',
    category: 'learning',
    categoryLabel: 'Bài giảng & Học tập',
    question: 'Khi gặp câu hỏi khó hoặc chưa hiểu bản chất lý thuyết, tôi trao đổi với Giảng viên ở đâu?',
    answerParagraphs: [
      'Học sinh TKU được hỗ trợ giải đáp học thuật thông qua 2 kênh chính thức:',
    ],
    bulletPoints: [
      'Mục Hỏi đáp chuyên sâu: Nhấn vào mục "Hỏi đáp" trên thanh Menu điều hướng, chọn khóa học và bài học liên quan để đặt câu hỏi. Đội ngũ Giảng viên và Trợ lý học tập TKU sẽ giải đáp chi tiết.',
      'Bình luận dưới bài học: Đặt câu hỏi trực tiếp tại khung thảo luận trong phòng học để được trợ giảng phản hồi nhanh trong giờ học.',
    ],
    tag: 'Hỗ trợ học vụ',
  },
  {
    id: 'faq-6',
    category: 'exam',
    categoryLabel: 'Kiểm tra & Đề thi',
    question: 'Quy trình làm bài kiểm tra trắc nghiệm online và nộp bài diễn ra như thế nào?',
    answerParagraphs: [
      'Hệ thống phòng thi trực tuyến của TKU được thiết kế chuẩn mực theo đúng cấu trúc thi tốt nghiệp THPT và ĐGNL:',
    ],
    bulletPoints: [
      'Bắt đầu làm bài: Chọn bài kiểm tra trong khóa học, nhấn "Bắt đầu làm bài" để hệ thống khởi tạo mã đề và đồng hồ đếm ngược.',
      'Bảng điều hướng câu hỏi: Ma trận câu hỏi giúp bạn dễ dàng theo dõi các câu đã làm, chưa làm hoặc gắn cờ xem lại.',
      'Tự động lưu bài làm: Mỗi khi bạn chọn đáp án, hệ thống lập tức lưu dữ liệu an toàn lên máy chủ.',
      'Thu bài tự động: Khi hết giờ, bài thi sẽ tự động được nộp nếu bạn chưa nhấn nút "Nộp bài".',
    ],
    tag: 'Phòng thi online',
  },
  {
    id: 'faq-7',
    category: 'exam',
    categoryLabel: 'Kiểm tra & Đề thi',
    question: 'Sau khi nộp bài thi, tôi có thể xem lại lời giải chi tiết và đáp án đúng không?',
    answerParagraphs: [
      'Có. Ngay sau khi nhấn Nộp bài, hệ thống sẽ trả về trang Kết quả thi toàn diện:',
      'Bạn có thể rà soát lại từng câu hỏi, đối chiếu đáp án bạn đã chọn với đáp án chuẩn. Mỗi câu hỏi đều đi kèm lời giải chi tiết từ Giảng viên, phân tích cơ chế phản ứng và chỉ rõ bẫy trắc nghiệm giúp bạn rút kinh nghiệm sâu sắc.',
    ],
    tag: 'Lời giải chi tiết',
  },
  {
    id: 'faq-8',
    category: 'account',
    categoryLabel: 'Tài khoản & Kỹ thuật',
    question: 'Tôi có thể đăng nhập tài khoản trên nhiều thiết bị (điện thoại, máy tính) không?',
    answerParagraphs: [
      'Tài khoản học sinh TKU có thể đăng nhập trên nhiều thiết bị như Máy tính (PC/Laptop), Điện thoại di động (iOS/Android) và Máy tính bảng.',
      'Tuy nhiên, để bảo vệ quyền sở hữu trí tuệ của khóa học và bảo mật tài khoản cá nhân, hệ thống áp dụng cơ chế xác thực phiên học. Nếu phát hiện việc chia sẻ tài khoản cho người khác đăng nhập cùng lúc từ nhiều địa chỉ mạng bất thường, hệ thống sẽ tạm khóa để bảo vệ tài khoản của bạn.',
    ],
    tag: 'Thiết bị & Bảo mật',
  },
  {
    id: 'faq-9',
    category: 'account',
    categoryLabel: 'Tài khoản & Kỹ thuật',
    question: 'Làm thế nào để đổi mật khẩu hoặc khôi phục khi quên mật khẩu đăng nhập?',
    answerParagraphs: [
      'Bạn có thể chủ động quản lý thông tin bảo mật của mình bằng các cách sau:',
    ],
    bulletPoints: [
      'Đổi mật khẩu: Sau khi đăng nhập, nhấp vào tên đại diện của bạn ở góc phải thanh Nav > Chọn "Cài đặt tài khoản & Bảo mật" để đổi mật khẩu mới.',
      'Quên mật khẩu: Tại trang Đăng nhập, bấm vào liên kết "Quên mật khẩu?", nhập email đã đăng ký tài khoản để nhận liên kết đặt lại mật khẩu mới.',
    ],
    note: 'Nếu bạn không nhớ email đăng ký, hãy liên hệ Hotline để được nhân viên hỗ trợ xác minh thông tin học sinh.',
    tag: 'Quên mật khẩu',
  },
  {
    id: 'faq-10',
    category: 'account',
    categoryLabel: 'Tài khoản & Kỹ thuật',
    question: 'Video bài giảng bị gián đoạn, mờ hoặc không tải được thì xử lý thế nào?',
    answerParagraphs: [
      'Nếu bạn gặp sự cố khi phát video bài giảng, vui lòng thử các giải pháp kỹ thuật nhanh sau:',
    ],
    bulletPoints: [
      'Kiểm tra kết nối mạng Internet của thiết bị, đảm bảo đường truyền ổn định.',
      'Chọn độ phân giải video phù hợp: Nhấn biểu tượng cài đặt trên video player và thử chọn 720p hoặc 480p nếu mạng yếu.',
      'Tải lại trang web (F5 hoặc Ctrl+F5) hoặc xóa bộ nhớ đệm (cache) của trình duyệt.',
      'Ưu tiên sử dụng trình duyệt web hiện đại như Google Chrome, Microsoft Edge hoặc Safari phiên bản mới nhất.',
    ],
    tag: 'Khắc phục sự cố mạng',
  },
];

const CATEGORY_TABS: Array<{ key: SupportCategory; label: string; icon: React.ReactNode }> = [
  { key: 'all', label: 'Tất cả câu hỏi', icon: <HelpCircle size={15} /> },
  { key: 'activation', label: 'Kích hoạt khóa học', icon: <KeyRound size={15} /> },
  { key: 'learning', label: 'Bài giảng & Học tập', icon: <PlayCircle size={15} /> },
  { key: 'exam', label: 'Kiểm tra & Đề thi', icon: <FileText size={15} /> },
  { key: 'account', label: 'Tài khoản & Kỹ thuật', icon: <UserCheck size={15} /> },
];

export const SupportPage: React.FC = () => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SupportCategory>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');

  // Filtered FAQ Items
  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const inQuestion = item.question.toLowerCase().includes(query);
        const inTag = item.tag.toLowerCase().includes(query);
        const inAnswer = item.answerParagraphs.some((p) => p.toLowerCase().includes(query));
        const inBullets = item.bulletPoints?.some((b) => b.toLowerCase().includes(query));
        return inQuestion || inTag || inAnswer || inBullets;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<SupportCategory, number> = {
      all: FAQ_DATA.length,
      activation: 0,
      learning: 0,
      exam: 0,
      account: 0,
    };
    FAQ_DATA.forEach((item) => {
      counts[item.category] += 1;
    });
    return counts;
  }, []);

  // Handlers
  const handleToggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  const handleCategoryCardClick = (cat: SupportCategory) => {
    setSelectedCategory(cat);
    // Smooth scroll to FAQ section
    const el = document.getElementById('support-faq-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="tku-courses-page-wrapper">
      <Navbar />

      <main className="tku-courses-page-main">
        {/* ================================================================
            1. ACADEMIC HERO BANNER (ĐỒNG BỘ 2 CỘT CHUẨN TKU E-LEARNING)
            ================================================================ */}
        <section className="tku-courses-hub-hero">
          <div className="tku-container">
            {/* Breadcrumb Trail */}
            <nav className="tku-hero-breadcrumbs" aria-label="Đường dẫn điều hướng">
              <Link to="/" className="tku-hero-breadcrumb-link">
                <Home size={14} />
                <span>Trang chủ</span>
              </Link>
              <ChevronRight size={13} className="tku-hero-breadcrumb-sep" />
              <span className="tku-hero-breadcrumb-current">Trung tâm Hỗ trợ Học sinh</span>
            </nav>

            <div className="tku-courses-hub-hero__grid">
              {/* Cột Trái: Tiêu đề & Thông tin hỗ trợ học vụ */}
              <div className="tku-courses-hub-hero__main">
                <div className="tku-courses-hub-hero__tag-wrap">
                  <span className="tku-courses-hub-hero__tag">
                    <Sparkles size={14} />
                    <span>TRUNG TÂM HỖ TRỢ & HỌC VỤ TKU</span>
                  </span>
                  <span className="tku-courses-hub-hero__subtag">
                    Đồng hành 24/7 cùng học sinh
                  </span>
                </div>

                <h1 className="tku-courses-hub-hero__title">
                  Trung tâm Hỗ trợ & Chăm sóc Học sinh
                </h1>

                <p className="tku-courses-hub-hero__desc">
                  Giải đáp chi tiết toàn bộ thắc mắc về kích hoạt khóa học, phương pháp học tập trực tuyến, hướng dẫn làm bài kiểm tra và xử lý các vấn đề kỹ thuật. Đội ngũ Giảng viên và Ban học vụ TKU luôn sẵn sàng hỗ trợ bạn.
                </p>
              </div>

              {/* Cột Phải: 4 Thẻ Thống Kê Học Thuật Glassmorphism */}
              <div className="tku-courses-hub-stats-grid">
                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--blue">
                    <Clock size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">&lt; 15 phút</span>
                    <span className="tku-hub-glass-card__lbl">Phản hồi trung bình</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--emerald">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">100%</span>
                    <span className="tku-hub-glass-card__lbl">Tỷ lệ giải đáp yêu cầu</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--amber">
                    <Sparkles size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">24/7</span>
                    <span className="tku-hub-glass-card__lbl">Hệ thống & Trợ lý học vụ</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--purple">
                    <Headphones size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">08:00 - 22:00</span>
                    <span className="tku-hub-glass-card__lbl">Tổng đài hỗ trợ trực tiếp</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="tku-container tku-courses-hub-container">
          {/* ================================================================
              2. 4 KHỐI CHỦ ĐỀ HỖ TRỢ CHÍNH (TOPIC HUBS)
              ================================================================ */}
          <div className="tku-support-topics-grid">
            <div
              className={`tku-support-topic-card ${selectedCategory === 'activation' ? 'is-active' : ''}`}
              onClick={() => handleCategoryCardClick('activation')}
              role="button"
              tabIndex={0}
            >
              <div className="tku-support-topic-card__icon-box tku-support-topic-card__icon-box--blue">
                <KeyRound size={22} />
              </div>
              <h3 className="tku-support-topic-card__title">Kích hoạt khóa học</h3>
              <p className="tku-support-topic-card__desc">
                Hướng dẫn nhập mã Key bản quyền, kiểm tra thời hạn và mở khóa toàn bộ bài giảng.
              </p>
              <span className="tku-support-topic-card__meta">
                <span>{tabCounts.activation} câu hỏi hướng dẫn</span>
                <ChevronRight size={14} />
              </span>
            </div>

            <div
              className={`tku-support-topic-card ${selectedCategory === 'learning' ? 'is-active' : ''}`}
              onClick={() => handleCategoryCardClick('learning')}
              role="button"
              tabIndex={0}
            >
              <div className="tku-support-topic-card__icon-box tku-support-topic-card__icon-box--emerald">
                <PlayCircle size={22} />
              </div>
              <h3 className="tku-support-topic-card__title">Bài giảng & Học tập</h3>
              <p className="tku-support-topic-card__desc">
                Xem video không giới hạn, ghi chú mốc thời gian, tải tài liệu PDF và theo dõi tiến độ.
              </p>
              <span className="tku-support-topic-card__meta">
                <span>{tabCounts.learning} câu hỏi hướng dẫn</span>
                <ChevronRight size={14} />
              </span>
            </div>

            <div
              className={`tku-support-topic-card ${selectedCategory === 'exam' ? 'is-active' : ''}`}
              onClick={() => handleCategoryCardClick('exam')}
              role="button"
              tabIndex={0}
            >
              <div className="tku-support-topic-card__icon-box tku-support-topic-card__icon-box--amber">
                <FileText size={22} />
              </div>
              <h3 className="tku-support-topic-card__title">Kiểm tra & Đề thi</h3>
              <p className="tku-support-topic-card__desc">
                Quy trình làm bài thi trắc nghiệm trực tuyến, nộp bài, xem lời giải và giải thích chi tiết.
              </p>
              <span className="tku-support-topic-card__meta">
                <span>{tabCounts.exam} câu hỏi hướng dẫn</span>
                <ChevronRight size={14} />
              </span>
            </div>

            <div
              className={`tku-support-topic-card ${selectedCategory === 'account' ? 'is-active' : ''}`}
              onClick={() => handleCategoryCardClick('account')}
              role="button"
              tabIndex={0}
            >
              <div className="tku-support-topic-card__icon-box tku-support-topic-card__icon-box--purple">
                <UserCheck size={22} />
              </div>
              <h3 className="tku-support-topic-card__title">Tài khoản & Kỹ thuật</h3>
              <p className="tku-support-topic-card__desc">
                Quản lý mật khẩu, đăng nhập nhiều thiết bị, bảo mật và khắc phục sự cố phát video.
              </p>
              <span className="tku-support-topic-card__meta">
                <span>{tabCounts.account} câu hỏi hướng dẫn</span>
                <ChevronRight size={14} />
              </span>
            </div>
          </div>

          {/* ================================================================
              3. FAQ SECTION WITH SEARCH & CATEGORY TABS
              ================================================================ */}
          <section id="support-faq-section" className="tku-support-faq-section">
            <div className="tku-support-section-header">
              <span className="tku-support-section-header__badge">
                <HelpCircle size={13} />
                <span>Câu hỏi thường gặp</span>
              </span>
              <h2 className="tku-support-section-header__title">
                Giải đáp Thắc mắc Phổ biến
              </h2>
              <p className="tku-support-section-header__subtitle">
                Tìm câu trả lời nhanh chóng cho các vấn đề thường gặp trong quá trình học tập và sử dụng nền tảng TKU.
              </p>
            </div>

            {/* Live Search Bar */}
            <div className="tku-support-search-bar">
              <Search size={18} className="tku-support-search-icon" />
              <input
                type="text"
                placeholder="Tìm kiếm câu hỏi (ví dụ: mã kích hoạt, xem lại video, đổi mật khẩu, nộp bài thi...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="tku-support-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="tku-support-search-clear"
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="tku-support-tabs-row" role="tablist">
              {CATEGORY_TABS.map((tab) => {
                const count = tabCounts[tab.key];
                const isActive = tab.key === selectedCategory;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedCategory(tab.key)}
                    className={`tku-support-tab-btn ${isActive ? 'is-active' : ''}`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    <span className="tku-support-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* FAQ Accordion List */}
            {filteredFaqs.length > 0 ? (
              <div className="tku-support-faq-list">
                {filteredFaqs.map((faq) => {
                  const isOpen = openFaqId === faq.id;

                  return (
                    <div
                      key={faq.id}
                      className={`tku-support-faq-card ${isOpen ? 'is-open' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleFaq(faq.id)}
                        className="tku-support-faq-question-btn"
                        aria-expanded={isOpen}
                      >
                        <div className="tku-support-faq-q-left">
                          <span className="tku-support-faq-q-icon">?</span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span className="tku-support-faq-badge">{faq.categoryLabel}</span>
                            </div>
                            <h3 className="tku-support-faq-question-text">{faq.question}</h3>
                          </div>
                        </div>

                        <div className="tku-support-faq-toggle-icon">
                          <ChevronDown size={20} />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="tku-support-faq-answer">
                          {faq.answerParagraphs.map((para, pIdx) => (
                            <p key={pIdx}>{para}</p>
                          ))}

                          {faq.bulletPoints && faq.bulletPoints.length > 0 && (
                            <ul>
                              {faq.bulletPoints.map((b, bIdx) => (
                                <li key={bIdx}>{b}</li>
                              ))}
                            </ul>
                          )}

                          {faq.note && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 14px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                color: '#475569',
                                fontSize: '13px',
                                marginTop: '12px',
                              }}
                            >
                              <AlertCircle size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                              <span>{faq.note}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="tku-qa-empty-state">
                <div className="tku-qa-empty-icon">
                  <HelpCircle size={32} />
                </div>
                <h3 className="tku-qa-empty-title">Không tìm thấy câu hỏi phù hợp</h3>
                <p className="tku-qa-empty-desc">
                  Không có nội dung hướng dẫn nào khớp với từ khóa &ldquo;{searchQuery}&rdquo;. Hãy thử tìm với từ khóa khác!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="tku-qa-ask-btn"
                  style={{ margin: '0 auto' }}
                >
                  <span>Xem tất cả câu hỏi</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SupportPage;
