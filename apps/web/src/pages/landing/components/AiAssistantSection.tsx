import React from 'react';
import { Sparkles, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { Badge } from '../../../components/common/Badge';
import { AI_FEATURE_HIGHLIGHTS, INITIAL_CHAT_MESSAGES } from '../../../data/aiAssistant.data';

export const AiAssistantSection: React.FC = () => {
  return (
    <section id="ai-assistant" className="tku-section tku-ai-section">
      <div className="tku-container">
        <div className="tku-ai-grid">
          <div className="tku-ai-info">
            <Badge variant="blue">Trợ lý học tập thông minh</Badge>
            <h2 className="tku-section-title tku-ai-title">
              Giải đáp thắc mắc Hóa học cùng AI TKU
            </h2>
            <p className="tku-ai-desc">
              Không còn lo lắng khi gặp bài toán Hóa hóc búa hay câu hỏi lý thuyết phức tạp. Trợ lý AI đồng hành 24/7, phân tích chuỗi phản ứng và cung cấp lời giải gợi ý chuẩn xác.
            </p>

            <ul className="tku-ai-highlights">
              {AI_FEATURE_HIGHLIGHTS.map((item) => (
                <li key={item.id} className="tku-ai-highlight-item">
                  <CheckCircle2 size={20} className="text-primary tku-ai-highlight-icon" />
                  <div>
                    <h4 className="tku-ai-highlight-title">{item.title}</h4>
                    <p className="tku-ai-highlight-desc">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>

            <a href="#chat" className="tku-btn tku-btn--primary">
              <span>Trải nghiệm hỏi đáp ngay</span>
              <ArrowUpRight size={18} />
            </a>
          </div>

          <div className="tku-chat-preview">
            <div className="tku-chat-header">
              <div className="tku-chat-header__title">
                <div className="tku-chat-status-dot" />
                <Sparkles size={18} className="text-primary" />
                <span>TKU AI Assistant</span>
              </div>
              <span className="tku-chat-badge">Trực tuyến 24/7</span>
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
                    <div className="tku-avatar tku-avatar--ai">
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
};

export default AiAssistantSection;
