import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X } from 'lucide-react';
import { COURSES } from './courses';
import { DEGREE_RULES } from './degreeRules';

/** Keyword tip helper — not an LLM. Labeled honestly. */
export function QuickTips() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: 'bot' | 'user'; text: string }[]>([
    {
      sender: 'bot',
      text: `Quick tips (keyword matcher, not AI). Ask about ML, Math, admission (${DEGREE_RULES.admission.target} CP), or electives (exactly ${DEGREE_RULES.electives.target} CP).`,
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: msg }]);
    setInput('');

    const lower = msg.toLowerCase();
    let response = 'Try keywords: ML, math, admission, electives, thesis.';
    if (lower.includes('machine learning') || lower.includes('ml') || lower.includes('ai')) {
      const mlCourses = COURSES.filter((c) => c.module.includes('Machine Learning')).slice(0, 3);
      response = `ML foundation picks: ${mlCourses.map((c) => c.title).join(', ')}. Min ${DEGREE_RULES.ml.target} CP in ML; foundations sum min ${DEGREE_RULES.foundationsSum.target}.`;
    } else if (lower.includes('math') || lower.includes('theory')) {
      const mathCourses = COURSES.filter((c) => c.module.includes('Math')).slice(0, 3);
      response = `Math picks: ${mathCourses.map((c) => c.title).join(', ')}.`;
    } else if (lower.includes('easy') || lower.includes('intro') || lower.includes('admission')) {
      response = `This plan models student-specific admission conditions as exactly ${DEGREE_RULES.admission.target} CP (Analysis 12 + Algorithms 8 + SciComp 8). They are not a universal MSc requirement; confirm against your Zulassungsbescheid.`;
    } else if (lower.includes('elective')) {
      response = `Electives must be exactly ${DEGREE_RULES.electives.target} CP. Overshoot fails validation.`;
    } else if (lower.includes('thesis')) {
      response = `Thesis block is exactly ${DEGREE_RULES.thesis.target} CP (Prep 6 + Thesis 30).`;
    } else if (lower.includes('total') || lower.includes('120') || lower.includes('148')) {
      response = `MSc total must be exactly ${DEGREE_RULES.mscTotal.target} CP; grand total (with admission) exactly ${DEGREE_RULES.grandTotal.target} CP.`;
    }

    setMessages((prev) => [...prev, { sender: 'bot', text: response }]);
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setIsOpen(true)}
        aria-label="Open quick tips"
        style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          width: '52px',
          height: '52px',
          borderRadius: '12px',
          background: 'var(--accent-primary)',
          color: 'var(--on-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 6px 20px -6px var(--accent-glow)',
          zIndex: 100,
        }}
      >
        <MessageCircle size={22} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="glass-panel tips-panel"
            role="dialog"
            aria-label="Quick tips"
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: 360,
              maxWidth: 'calc(100vw - 32px)',
              height: 500,
              maxHeight: '70vh',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ fontSize: 14, margin: 0, color: 'var(--text-primary)' }}>Quick Tips</h3>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Keyword helper — not an AI model</div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close tips"
                className="btn btn--quiet"
                style={{ cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                    background: m.sender === 'user' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    border: m.sender === 'user' ? 'none' : '1px solid var(--border-subtle)',
                    color: m.sender === 'user' ? 'var(--on-accent)' : 'var(--text-primary)',
                    padding: '10px 12px',
                    borderRadius: 10,
                    maxWidth: '85%',
                    fontSize: 12.5,
                    lineHeight: 1.5,
                  }}
                >
                  {m.text}
                </div>
              ))}
            </div>
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: 8,
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about ML, electives…"
                aria-label="Tip question"
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8 }}
              />
              <button
                onClick={handleSend}
                aria-label="Send tip question"
                className="btn btn--primary"
                style={{ padding: '0 12px' }}
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
