import React, { memo } from 'react';
import { Sparkles, CheckCircle2, Video } from 'lucide-react';
import { Badge } from '../../../components/common/Badge';
import { AI_FEATURE_HIGHLIGHTS, INITIAL_CHAT_MESSAGES } from '../../../data/aiAssistant.data';

export const AiAssistantSection: React.FC = memo(() => {
  return (
    <section id="ai-assistant" className="tku-section tku-ai-section">
      <div className="tku-container">
        <div className="tku-ai-grid">
          <div className="tku-ai-info">
            <Badge variant="blue">Gia sư AI trong phòng học</Badge>
            <h2 className="tku-section-title tku-ai-title">
              Học Hóa không lo bế tắc cùng Gia sư AI TKU
            </h2>
            <p className="tku-ai-desc">
              Không còn cảm giác cô đơn hay lúng túng khi tự học video bài giảng. Gia sư AI được tích hợp trực tiếp ngay bên cạnh video, sẵn sàng giải thích hiện tượng, cân bằng phương trình và gỡ rối kiến thức tức thì 24/7.
            </p>

            <ul className="tku-ai-highlights">
              {AI_FEATURE_HIGHLIGHTS.map((item) => (
                <li key={item.id} className="tku-ai-highlight-item">
                  <CheckCircle2 size={20} className="text-primary tku-ai-highlight-icon" aria-hidden="true" />
                  <div>
                    <h4 className="tku-ai-highlight-title">{item.title}</h4>
                    <p className="tku-ai-highlight-desc">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="tku-chat-preview"
            role="region"
            aria-label="Mô phỏng Gia sư AI trong phòng học"
          >
            {/* Thanh thông tin ngữ cảnh bài học mô phỏng phòng học thực tế */}
            <div className="tku-chat-lesson-banner">
              <div className="tku-chat-lesson-badge">
                <Video size={14} aria-hidden="true" />
                <span>Đang phát: Hợp chất của Nhôm</span>
              </div>
              <span className="tku-chat-timestamp">Mốc 04:20</span>
            </div>

            <div className="tku-chat-header">
              <div className="tku-chat-header__title">
                <div className="tku-chat-status-dot" aria-hidden="true" />
                <Sparkles size={18} className="text-primary" aria-hidden="true" />
                <span>Gia sư AI TKU</span>
              </div>
              <span className="tku-chat-badge">Tích hợp bài giảng</span>
            </div>

            <div className="tku-chat-body">
              {INITIAL_CHAT_MESSAGES.map((msg) => (
                <div
                  key={msg.id}
                  className={`tku-message-wrapper ${
                    msg.sender === 'user' ? 'is-user' : 'is-ai'
                  }`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="tku-avatar tku-avatar--ai" aria-hidden="true">
                      <Sparkles size={16} />
                    </div>
                  )}
                  <div className="tku-message-bubble">
                    <p className="tku-message-text">{msg.content}</p>
                    {msg.timestamp && <span className="tku-message-time">{msg.timestamp}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

AiAssistantSection.displayName = 'AiAssistantSection';

export default AiAssistantSection;
