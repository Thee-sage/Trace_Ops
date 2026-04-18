import { useState } from 'react';
import { useAuth } from './auth-context';

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
        await register(email, password, name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
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
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-[12px]" style={{ color: 'var(--to-text-4)' }}>
            {mode === 'login' ? 'Sign in to access your dashboard' : 'Start monitoring your services'}
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
            />
          </div>

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
              : mode === 'login'
              ? 'Sign in'
              : 'Create account'}
          </button>
        </form>

        <div className="text-center mt-5">
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-[12px] transition-colors duration-100"
            style={{ color: 'var(--to-text-4)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--to-text-2)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--to-text-4)'; }}
          >
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
