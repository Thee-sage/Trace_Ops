import { useState } from 'react';
import { Copy, Check, LogOut, Key, User, Terminal } from 'lucide-react';
import { useAuth } from './auth-context';

export function SettingsPanel() {
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const copyApiKey = async () => {
    await navigator.clipboard.writeText(user.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[560px] mx-auto px-8 py-8">
          <h1
            className="text-[22px] leading-[1.3] mb-6"
            style={{ fontWeight: 500, color: 'var(--to-text-1)', letterSpacing: '-0.02em' }}
          >
            Settings
          </h1>

          {/* Profile */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <User size={14} style={{ color: 'var(--to-text-3)' }} />
              <span className="text-[13px]" style={{ fontWeight: 500, color: 'var(--to-text-1)' }}>
                Profile
              </span>
            </div>
            <div
              className="rounded-[6px] p-4 space-y-2.5"
              style={{
                backgroundColor: 'var(--to-bg-elevated)',
                border: '1px solid var(--to-border)',
              }}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[11px]" style={{ color: 'var(--to-text-4)' }}>Name</span>
                <span className="text-[12px]" style={{ color: 'var(--to-text-1)' }}>{user.name}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[11px]" style={{ color: 'var(--to-text-4)' }}>Email</span>
                <span className="text-[12px]" style={{ color: 'var(--to-text-1)' }}>{user.email}</span>
              </div>
            </div>
          </div>

          {/* API Key */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Key size={14} style={{ color: 'var(--to-text-3)' }} />
              <span className="text-[13px]" style={{ fontWeight: 500, color: 'var(--to-text-1)' }}>
                API Key
              </span>
            </div>
            <p className="text-[12px] leading-[1.6] mb-3" style={{ color: 'var(--to-text-3)' }}>
              Use this key in your TraceOps SDK to send events to your account. Keep it secret.
            </p>
            <div
              className="rounded-[6px] flex items-center gap-2 px-3 py-2.5"
              style={{
                backgroundColor: 'var(--to-log-bg)',
                border: '1px solid var(--to-log-border)',
              }}
            >
              <code
                className="flex-1 text-[12px] font-mono truncate select-all"
                style={{ color: 'var(--to-text-2)' }}
              >
                {user.apiKey}
              </code>
              <button
                onClick={copyApiKey}
                className="shrink-0 p-1 rounded-[4px] transition-colors duration-100"
                style={{ color: copied ? 'var(--to-success)' : 'var(--to-text-4)' }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* SDK Setup */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Terminal size={14} style={{ color: 'var(--to-text-3)' }} />
              <span className="text-[13px]" style={{ fontWeight: 500, color: 'var(--to-text-1)' }}>
                Quick Setup
              </span>
            </div>
            <div
              className="rounded-[6px] overflow-hidden"
              style={{
                backgroundColor: 'var(--to-log-bg)',
                border: '1px solid var(--to-log-border)',
              }}
            >
              <pre
                className="px-4 py-3 overflow-x-auto text-[11px] leading-[1.65]"
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  color: 'var(--to-text-2)',
                }}
              >{`import TraceOps from './lib/traceops';

TraceOps.init({
  endpoint: '${import.meta.env.VITE_API_BASE ?? 'https://trace-ops.onrender.com'}',
  serviceName: 'my-service',
  apiKey: '${user.apiKey}',
});

// Express: add AFTER all routes
TraceOps.express(app);`}</pre>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-[6px] text-[12px] transition-all duration-150"
            style={{
              color: 'var(--to-error)',
              backgroundColor: 'var(--to-error-subtle)',
              border: '1px solid var(--to-error-border)',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
