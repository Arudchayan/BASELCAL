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
      response = `Admission Auflagen are exactly ${DEGREE_RULES.admission.target} CP (Analysis 12 + Algorithms 8 + SciComp 8). Confirm against your Zulassungsbescheid.`;
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
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        aria-label="Open quick tips"
        style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          background: 'var(--accent-primary)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 8px 32px var(--accent-glow)',
          zIndex: 100,
        }}
      >
        <MessageCircle size={28} />
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
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-strong)',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(128,128,128,0.05)',
              }}
            >
              <div>
                <strong>Quick Tips</strong>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Keyword helper — not an AI model</div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close tips"
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
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
                    color: m.sender === 'user' ? '#fff' : 'var(--text-primary)',
                    padding: '10px 12px',
                    borderRadius: 12,
                    maxWidth: '85%',
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  {m.text}
                </div>
              ))}
            </div>
            <div
              style={{
                padding: 16,
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: 8,
                background: 'rgba(128,128,128,0.02)',
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about ML, electives…"
                aria-label="Tip question"
                style={{
                  flex: 1,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                aria-label="Send tip question"
                style={{
                  background: 'var(--accent-primary)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0 14px',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
