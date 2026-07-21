import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('BaselCal error boundary', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            background: '#0a0a0b',
            color: '#f3f4f6',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ color: '#a1a1aa', marginBottom: 20, lineHeight: 1.5 }}>
              {this.state.error.message || 'Unexpected UI error.'} You can clear saved plan data and reload.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  const ok = window.confirm(
                    'Clear ALL BaselCal data (plan, notes, shortlist, theme) and reload? This cannot be undone.',
                  );
                  if (!ok) return;
                  try {
                    const keys = Object.keys(localStorage).filter((k) => k.startsWith('basel-ds-'));
                    for (const k of keys) localStorage.removeItem(k);
                  } catch {
                    /* ignore */
                  }
                  window.location.reload();
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#6366f1',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear all BaselCal data & reload
              </button>
              <button
                type="button"
                onClick={() => this.setState({ error: null })}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid #333',
                  background: '#121214',
                  color: '#f3f4f6',
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
