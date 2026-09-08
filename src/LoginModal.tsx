import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Lock, X } from 'lucide-react';

export function LoginModal({
  onClose,
  onUnlocked,
}: {
  onClose: () => void;
  onUnlocked: (config: unknown) => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({} as { ok?: boolean; error?: string; config?: unknown }));
      if (!response.ok || !data.ok) {
        setError(
          data.error
          || (response.status === 401 ? 'Invalid login' : 'Owner login is only available on the hosted site.'),
        );
        return;
      }
      onUnlocked(data.config ?? null);
    } catch {
      setError('Could not reach the login service.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="login-backdrop"
      onClick={onClose}
    >
      <motion.form
        role="dialog"
        aria-labelledby="login-title"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        className="glass-panel login-card"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => void submit(event)}
      >
        <div className="login-card__head">
          <div>
            <h2 id="login-title">Owner login</h2>
            <p>Public visitors keep the sandbox. This unlocks the private overlay.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close login">
            <X size={16} />
          </button>
        </div>
        <label>
          Username
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <p className="login-card__error">{error}</p>}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          <Lock size={14} /> {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </motion.form>
    </motion.div>
  );
}
