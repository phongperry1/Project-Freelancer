import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { Badge } from '../../../components/common/Badge';
import { AI_FEATURE_HIGHLIGHTS, INITIAL_CHAT_MESSAGES } from '../../../data/aiAssistant.data';
import type { ChatMessage } from '../../../types/chat.types';

export const AiAssistantSection: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

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

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: inputValue,
      timestamp: 'Vừa xong',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');

    // Simulate AI intelligent reply with cleanup safety
    timerRef.current = setTimeout(() => {
      const aiReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: 'Cảm ơn câu hỏi của bạn! Trợ lý AI TKU luôn sẵn sàng phân tích và hướng dẫn bạn phương pháp giải chi tiết từng bước.',
        timestamp: 'Vừa xong',
      };
      setMessages((prev) => [...prev, aiReply]);
    }, 700);
  };

  return (
    <section id="ai-assistant" className="tku-section tku-ai-section">
      <div className="tku-container">
        <div className="tku-ai-grid">
          {/* Left Column: Feature Description */}
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

          {/* Right Column: Interactive Chat Interface Preview */}
          <div className="tku-chat-preview">
            {/* Header */}
            <div className="tku-chat-header">
              <div className="tku-chat-header__title">
                <div className="tku-chat-status-dot" />
                <Sparkles size={18} className="text-primary" />
                <span>TKU AI Assistant</span>
              </div>
              <span className="tku-chat-badge">Trực tuyến 24/7</span>
            </div>

            {/* Chat Body */}
            <div className="tku-chat-body" ref={chatBodyRef}>
              {messages.map((msg) => (
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

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="tku-chat-input-form">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Đặt câu hỏi về bài tập Hóa học..."
                className="tku-chat-input"
              />
              <button
                type="submit"
                className="tku-btn tku-btn--primary tku-chat-send-btn"
                disabled={!inputValue.trim()}
              >
                Gửi
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiAssistantSection;
