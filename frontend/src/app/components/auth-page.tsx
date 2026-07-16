import { useState } from 'react';
import { useAuth } from './auth-context';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://trace-ops.onrender.com';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

export function AuthPage() {
  const { login, register, enterGuestMode } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
        await register(email, password, name);
      } else if (mode === 'forgot') {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        setSuccess('Reset code sent to your email!');
        setMode('reset');
      } else if (mode === 'reset') {
        const res = await fetch(`${API_BASE}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: resetCode, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Reset failed');
        setSuccess('Password reset! You can sign in now.');
        setMode('login');
        setPassword('');
        setResetCode('');
        setNewPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Mode, { heading: string; sub: string }> = {
    login: { heading: 'Welcome back', sub: 'Sign in to access your dashboard' },
    register: { heading: 'Create your account', sub: 'Start monitoring your services' },
    forgot: { heading: 'Reset password', sub: 'Enter your email to get a reset code' },
    reset: { heading: 'Enter reset code', sub: 'Check your email or backend console for the code' },
  };

  return (
    <div
      className="h-screen flex items-center justify-center"
      style={{
        backgroundColor: 'var(--to-bg-primary)',
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      }}
    >
      <div className="w-full max-w-[380px] px-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div
            className="w-[24px] h-[24px] rounded-[5px] flex items-center justify-center"
            style={{ backgroundColor: 'var(--to-brand-bg)' }}
          >
            <span style={{ fontSize: 13, color: 'var(--to-brand-text)', fontWeight: 600, lineHeight: 1 }}>T</span>
          </div>
          <span className="text-[18px] tracking-[-0.02em]" style={{ fontWeight: 500, color: 'var(--to-text-1)' }}>
            TraceOps
          </span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-[15px] mb-1" style={{ fontWeight: 500, color: 'var(--to-text-1)' }}>
            {titles[mode].heading}
          </h1>
          <p className="text-[12px]" style={{ color: 'var(--to-text-4)' }}>
            {titles[mode].sub}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="mb-3">
              <label className="block text-[11px] uppercase tracking-[0.06em] mb-1.5" style={{ color: 'var(--to-text-4)' }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-[6px] text-[13px] outline-none transition-colors duration-100"
                style={{
                  backgroundColor: 'var(--to-bg-elevated)',
                  border: '1px solid var(--to-border)',
                  color: 'var(--to-text-1)',
                }}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'forgot' || mode === 'reset') && (
            <div className="mb-3">
              <label className="block text-[11px] uppercase tracking-[0.06em] mb-1.5" style={{ color: 'var(--to-text-4)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-[6px] text-[13px] outline-none transition-colors duration-100"
                style={{
                  backgroundColor: 'var(--to-bg-elevated)',
                  border: '1px solid var(--to-border)',
                  color: 'var(--to-text-1)',
                }}
                placeholder="you@company.com"
                autoComplete="email"
                required
                disabled={mode === 'reset'}
              />
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div className="mb-3">
                <label className="block text-[11px] uppercase tracking-[0.06em] mb-1.5" style={{ color: 'var(--to-text-4)' }}>
                  Reset Code
                </label>
                <input
                  type="text"
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-[6px] text-[13px] outline-none transition-colors duration-100 font-mono tracking-[0.2em] text-center"
                  style={{
                    backgroundColor: 'var(--to-bg-elevated)',
                    border: '1px solid var(--to-border)',
                    color: 'var(--to-text-1)',
                  }}
                  placeholder="123456"
                  maxLength={6}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-[11px] uppercase tracking-[0.06em] mb-1.5" style={{ color: 'var(--to-text-4)' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-[6px] text-[13px] outline-none transition-colors duration-100"
                  style={{
                    backgroundColor: 'var(--to-bg-elevated)',
                    border: '1px solid var(--to-border)',
                    color: 'var(--to-text-1)',
                  }}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="mb-4">
              <label className="block text-[11px] uppercase tracking-[0.06em] mb-1.5" style={{ color: 'var(--to-text-4)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-[6px] text-[13px] outline-none transition-colors duration-100"
                style={{
                  backgroundColor: 'var(--to-bg-elevated)',
                  border: '1px solid var(--to-border)',
                  color: 'var(--to-text-1)',
                }}
                placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
              />
            </div>
          )}

          {error && (
            <div
              className="mb-4 px-3 py-2 rounded-[5px] text-[12px]"
              style={{
                backgroundColor: 'var(--to-error-subtle)',
                color: 'var(--to-error)',
                border: '1px solid var(--to-error-border)',
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="mb-4 px-3 py-2 rounded-[5px] text-[12px]"
              style={{
                backgroundColor: 'var(--to-deploy-subtle)',
                color: 'var(--to-deploy)',
                border: '1px solid var(--to-deploy-border)',
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-[6px] text-[13px] transition-all duration-150"
            style={{
              backgroundColor: 'var(--to-brand-bg)',
              color: 'var(--to-brand-text)',
              fontWeight: 500,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading
              ? '...'
              : mode === 'login' ? 'Sign in'
              : mode === 'register' ? 'Create account'
              : mode === 'forgot' ? 'Send reset code'
              : 'Reset password'}
          </button>
        </form>

        <div className="text-center mt-5 space-y-2">
          {mode === 'login' && (
            <>
              <div className="flex items-center justify-center gap-2">
                <button
                  disabled
                  type="button"
                  className="text-[12px]"
                  style={{ color: 'var(--to-text-4)', opacity: 0.5, cursor: 'not-allowed' }}
                >
                  Forgot password? (Disabled)
                </button>
                <span style={{ color: 'var(--to-text-4)', fontSize: 10 }}>—</span>
                <button
                  onClick={() => setShowWhy(true)}
                  className="text-[11px] transition-colors duration-100"
                  style={{ color: 'var(--to-text-4)', textDecoration: 'underline', textUnderlineOffset: 2 }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--to-text-2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--to-text-4)'; }}
                >
                  Know why?
                </button>
              </div>
              <button
                onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                className="block w-full text-[12px] transition-colors duration-100"
                style={{ color: 'var(--to-text-4)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--to-text-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--to-text-4)'; }}
              >
                Don't have an account? Sign up
              </button>
            </>
          )}

          {/* Why forgot password doesn't work — developer frustration modal */}
          {showWhy && (
            <div
              style={{
                position: 'fixed', inset: 0, zIndex: 50,
                backgroundColor: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px',
              }}
              onClick={() => setShowWhy(false)}
            >
              <div
                style={{
                  backgroundColor: 'var(--to-bg-primary)',
                  border: '1px solid var(--to-border)',
                  borderRadius: 10,
                  padding: '28px 24px',
                  maxWidth: 420,
                  width: '100%',
                  textAlign: 'left',
                }}
                onClick={e => e.stopPropagation()}
              >
                <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--to-text-1)', marginBottom: 14 }}>
                  Why forgot password doesn't work
                </h2>
                <p style={{ fontSize: 12, color: 'var(--to-text-3)', lineHeight: 1.7, marginBottom: 12 }}>
                  Reliable password reset emails require a verified sending domain or trusted email infrastructure. Platforms using shared infrastructure can have their emails delayed or rejected by Gmail.
                </p>
                <p style={{ fontSize: 12, color: 'var(--to-text-3)', lineHeight: 1.7, marginBottom: 12 }}>
                  So here's what happened: I built the feature. The code works. Brevo accepted the email. Gmail said no. Not because anything is broken—because I don't own a verified domain and Gmail doesn't trust shared relay IPs.
                </p>
                <p style={{ fontSize: 12, color: 'var(--to-text-3)', lineHeight: 1.7, marginBottom: 12 }}>
                  If this is as frustrating to you as it is to me, consider donating so this developer can finally afford a domain and make Forgot Password work the way it should.
                </p>
                <p style={{ fontSize: 12, color: 'var(--to-text-1)', fontWeight: 500, lineHeight: 1.7, marginBottom: 20 }}>
                  Until then... please don't forget your password.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href="https://x.com/AbhijeetS_878"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1, padding: '8px', borderRadius: 6,
                      fontSize: 12, fontWeight: 600,
                      backgroundColor: 'var(--to-text-1)',
                      color: 'var(--to-bg-primary)',
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    Buy me a domain <span style={{ color: '#ef4444', fontSize: '14px' }}>♥</span>
                  </a>
                  <button
                    onClick={() => setShowWhy(false)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 6,
                      fontSize: 12, fontWeight: 500,
                      backgroundColor: 'var(--to-bg-elevated)',
                      border: '1px solid var(--to-border)',
                      color: 'var(--to-text-3)',
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          {(mode === 'login' || mode === 'register') && (
            <div className="pt-3" style={{ borderTop: '1px solid var(--to-border)' }}>
              <button
                onClick={enterGuestMode}
                className="w-full py-2 rounded-[6px] text-[12px] transition-all duration-150"
                style={{
                  color: 'var(--to-text-3)',
                  backgroundColor: 'var(--to-bg-elevated)',
                  border: '1px solid var(--to-border)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--to-text-4)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--to-border)'; }}
              >
                Explore without signing in
              </button>
            </div>
          )}
          {mode === 'register' && (
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className="text-[12px] transition-colors duration-100"
              style={{ color: 'var(--to-text-4)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--to-text-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--to-text-4)'; }}
            >
              Already have an account? Sign in
            </button>
          )}
          {(mode === 'forgot' || mode === 'reset') && (
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className="text-[12px] transition-colors duration-100"
              style={{ color: 'var(--to-text-4)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--to-text-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--to-text-4)'; }}
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
