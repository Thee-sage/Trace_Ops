import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { LogEntry } from './types';

interface LogViewerProps {
  log: LogEntry;
}

export function LogViewer({ log }: LogViewerProps) {
  const [copied, setCopied] = useState(false);

  const logJson = JSON.stringify(
    {
      name: log.name,
      stack: log.stack,
      method: log.method,
      path: log.path,
      statusCode: log.statusCode,
      userAgent: log.userAgent,
      ip: log.ip,
      ...(log.requestId ? { requestId: log.requestId } : {}),
      ...(log.duration ? { duration: log.duration } : {}),
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(logJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Syntax highlight the JSON
  const highlighted = logJson
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // String values (after colon)
    .replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match, _content, _esc, offset) => {
      // Check if this is a key (followed by :) or a value
      const after = logJson.substring(offset + match.length);
      if (after.trimStart().startsWith(':')) {
        return `<span style="color: var(--to-log-key)">${match}</span>`;
      }
      return `<span style="color: var(--to-log-string)">${match}</span>`;
    })
    // Numbers
    .replace(/: (\d+)/g, ': <span style="color: var(--to-log-number)">$1</span>');

  return (
    <div className="relative group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.06em] px-1.5 py-[2px] rounded-[3px]"
            style={{
              color: log.level === 'error' ? 'var(--to-error)' : log.level === 'warn' ? 'var(--to-config)' : 'var(--to-deploy)',
              backgroundColor: log.level === 'error' ? 'var(--to-error-subtle)' : log.level === 'warn' ? 'var(--to-config-subtle)' : 'var(--to-deploy-subtle)',
              border: `1px solid ${log.level === 'error' ? 'var(--to-error-border)' : log.level === 'warn' ? 'var(--to-config-border)' : 'var(--to-deploy-border)'}`,
            }}
          >
            {log.level}
          </span>
          <span className="text-[9px] font-mono" style={{ color: 'var(--to-text-4)' }}>
            {log.method} {log.path}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1 rounded-[3px] transition-colors duration-100 opacity-0 group-hover:opacity-100"
          style={{ color: 'var(--to-text-4)' }}
          title="Copy log entry"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </div>

      <div
        className="rounded-[5px] overflow-hidden"
        style={{
          backgroundColor: 'var(--to-log-bg)',
          border: '1px solid var(--to-log-border)',
        }}
      >
        {/* Request badge bar */}
        <div
          className="flex items-center gap-3 px-3 py-1.5"
          style={{ borderBottom: '1px solid var(--to-log-border)' }}
        >
          <span
            className="text-[10px] font-mono px-1.5 py-[1px] rounded-[3px]"
            style={{
              backgroundColor: log.statusCode >= 500 ? 'var(--to-error-subtle)' : 'var(--to-config-subtle)',
              color: log.statusCode >= 500 ? 'var(--to-error)' : 'var(--to-config)',
            }}
          >
            {log.statusCode}
          </span>
          {log.requestId && (
            <span className="text-[9px] font-mono" style={{ color: 'var(--to-text-4)' }}>
              {log.requestId}
            </span>
          )}
          {log.duration && (
            <>
              <span style={{ color: 'var(--to-text-ghost)' }}>&middot;</span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--to-text-4)' }}>
                {log.duration}
              </span>
            </>
          )}
        </div>

        {/* JSON body */}
        <pre
          className="px-3 py-3 overflow-x-auto text-[11px] leading-[1.65]"
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
        >
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  );
}
