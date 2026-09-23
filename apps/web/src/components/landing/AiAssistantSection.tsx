import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { Badge } from '../common/Badge';
import { AI_FEATURE_HIGHLIGHTS, INITIAL_CHAT_MESSAGES } from '../../data/aiAssistant.data';
import type { ChatMessage } from '../../types/chat.types';

export const AiAssistantSection: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: inputValue.trim(),
    };

    setMessages((prev) => [
      ...prev,
      newMsg,
      {
        id: `reply-${Date.now()}`,
        sender: 'assistant',
        content:
          'Cảm ơn bạn đã đặt câu hỏi! Trợ lý AI Hóa học đang trong giai đoạn thử nghiệm mô phỏng và sẽ hỗ trợ giải đáp trực tiếp khi hệ thống chính thức ra mắt.',
      },
    ]);
    setInputValue('');
  };

  return (
    <section id="ai-assistant" className="tku-section tku-ai-section">
      <div className="tku-container">
        <div className="tku-ai-grid">
          {/* Left Column: Interactive Chat Box Mockup */}
          <div className="tku-ai-chat-box">
            {/* Chat Header */}
            <div className="tku-ai-chat-box__header">
              <div className="tku-ai-chat-box__status-dot" />
              <div>
                <h4 className="tku-ai-chat-box__title">Trợ lý học tập AI Hóa Học</h4>
                <p className="tku-ai-chat-box__status-text">
                  Đang hoạt động • Trực tuyến 24/7
                </p>
              </div>
            </div>

            {/* Chat Messages */}
            <div ref={chatBodyRef} className="tku-ai-chat-box__body">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`tku-chat-bubble-row ${
                    msg.sender === 'user' ? 'is-user' : 'is-ai'
                  }`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="tku-chat-avatar">
                      <Sparkles size={16} />
                    </div>
                  )}
                  <div className="tku-chat-bubble">
                    <p style={{ whiteSpace: 'pre-line' }}>{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="tku-ai-chat-box__input-bar">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Nhập câu hỏi Hóa học của bạn tại đây..."
                className="tku-ai-chat-box__input"
              />
              <button
                type="submit"
                aria-label="Gửi câu hỏi"
                disabled={!inputValue.trim()}
                className="tku-ai-chat-box__send-btn"
              >
                <ArrowUpRight size={18} />
              </button>
            </form>
          </div>

          {/* Right Column: AI Value Proposition */}
          <div className="tku-ai-info">
            <Badge>TRỢ LÝ HỌC TẬP AI ĐỘT PHÁ</Badge>
            <h2 className="tku-section-title tku-ai-title">
              Không còn rào cản bài tập khó
            </h2>
            <p className="tku-ai-desc">
              Giải quyết mọi thắc mắc học tập tức thì mà không cần phải chờ đợi. Trợ lý AI thông minh của TKU hiểu sâu sắc chương trình Hóa học THPT.
            </p>

            {/* Feature Highlights List */}
            <ul className="tku-ai-highlights">
              {AI_FEATURE_HIGHLIGHTS.map((item) => (
                <li key={item.id} className="tku-ai-highlight-item">
                  <div className="tku-ai-highlight-icon">
                    <CheckCircle2 size={22} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="tku-ai-highlight-title">{item.title}</h4>
                    <p className="tku-ai-highlight-desc">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="tku-ai-cta">
              <a href="#ai-assistant" className="tku-btn tku-btn--primary tku-btn--lg">
                <span>Trải nghiệm ngay</span>
                <Sparkles size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
