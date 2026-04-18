import { useState } from 'react';
import { ChevronRight, ExternalLink, Terminal, Webhook, Shield, Zap, Database, Code2 } from 'lucide-react';

const sections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Zap,
    content: [
      {
        title: 'Quick Setup',
        body: `Copy the TraceOps SDK into your project and initialize it at app startup. The agent automatically captures deployments, errors, and config changes.`,
        code: `# Copy the SDK into your project
cp traceops.ts ./lib/traceops.ts

# Initialize in your entry point
import TraceOps from './lib/traceops';

TraceOps.init({
  endpoint: 'https://trace-ops.onrender.com',
  serviceName: 'my-service',
  apiKey: process.env.TRACEOPS_API_KEY,
});

// Express: add AFTER all routes
TraceOps.express(app);`,
      },
      {
        title: 'Configuration',
        body: `TraceOps is configured via environment variables. Set these in your .env file.`,
        code: `# Required — URL of your TraceOps backend
TRACEOPS_ENDPOINT=https://trace-ops.onrender.com

# Required if backend enforces API key auth
TRACEOPS_API_KEY=tr_live_xxxxxxxxxxxx`,
      },
    ],
  },
  {
    id: 'events',
    title: 'Event Types',
    icon: Terminal,
    content: [
      {
        title: 'Error Events',
        body: `Errors are automatically captured from uncaught exceptions, unhandled promise rejections, and Express error middleware. You can also report errors manually.`,
        code: `import TraceOps from './lib/traceops';

// Automatic: uncaught exceptions & rejections
// are captured without any code changes.

// Manual: capture errors in try/catch
try {
  await processPayment(chargeId);
} catch (err) {
  await TraceOps.captureError(err, {
    route: '/v1/charge',
    userId: req.user.id,
  });
}`,
      },
      {
        title: 'Deploy Events',
        body: `A DEPLOY event is automatically sent every time the monitored process starts. No manual setup needed.`,
        code: `// Automatic — sent on TraceOps.init()
// The SDK captures:
//   - process start time
//   - Node.js version
//   - service name
//   - hostname`,
      },
      {
        title: 'Config Change Events',
        body: `Config changes are auto-detected when your .env file contents change between restarts. You can also report them manually.`,
        code: `import TraceOps from './lib/traceops';

// Manual config change reporting
await TraceOps.configChange(
  'Feature flag enabled: new-checkout',
  {
    flag: 'new-checkout',
    value: true,
    changedBy: 'deploy-bot',
  }
);`,
      },
    ],
  },
  {
    id: 'api',
    title: 'REST API',
    icon: Code2,
    content: [
      {
        title: 'Authentication',
        body: `Write operations require an x-api-key header matching the TRACEOPS_API_KEY on the backend. Read operations are open.`,
        code: `# Sending events (requires API key)
curl -X POST https://trace-ops.onrender.com/events \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: tr_live_xxxxxxxxxxxx" \\
  -d '{"eventType":"ERROR","serviceName":"my-api",...}'

# Reading events (no auth needed)
curl https://trace-ops.onrender.com/events?serviceName=my-api`,
      },
      {
        title: 'List Issues',
        body: `Retrieve issues with grouping, lifecycle status, severity, and suspected root cause.`,
        code: `GET /issues?serviceName=my-api

Response:
[
  {
    "id": "...",
    "title": "TypeError: Cannot read property 'id'",
    "status": "open",
    "count": 42,
    "severity": "high",
    "priorityScore": 85,
    "suspectedCauseEventId": "...",
    "impactLabel": "42 occurrences",
    "summary": "..."
  }
]`,
      },
      {
        title: 'Event Timeline',
        body: `Fetch the full chronological event timeline for a service, with correlation metadata.`,
        code: `GET /events/timeline/my-api

Response:
{
  "serviceName": "my-api",
  "events": [...],
  "count": 12,
  "correlationWindowMinutes": 30
}`,
      },
    ],
  },
  {
    id: 'webhooks',
    title: 'Integrations',
    icon: Webhook,
    content: [
      {
        title: 'Express.js',
        body: `The SDK provides first-class Express integration. Call TraceOps.express(app) after all your routes.`,
        code: `import express from 'express';
import TraceOps from './lib/traceops';

const app = express();

// Define routes...
app.get('/health', (req, res) => res.json({ ok: true }));

// TraceOps MUST come after all routes
TraceOps.express(app);

app.listen(3000);`,
      },
      {
        title: 'Non-Express Frameworks',
        body: `For Fastify, Koa, or raw Node.js, use captureError() manually in your error handler.`,
        code: `// Fastify
fastify.setErrorHandler(async (error, request, reply) => {
  await TraceOps.captureError(error, {
    method: request.method,
    path: request.url,
  });
  reply.status(500).send({ error: 'Internal Server Error' });
});

// Generic Node.js
process.on('uncaughtException', async (err) => {
  await TraceOps.captureError(err);
  process.exit(1);
});`,
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    icon: Shield,
    content: [
      {
        title: 'API Key Authentication',
        body: `Set TRACEOPS_API_KEY on both the backend and in your SDK init() to secure event ingestion. Without it, the backend runs in open mode.`,
        code: `# Backend .env
TRACEOPS_API_KEY=tr_live_xxxxxxxxxxxx

# Monitored service .env
TRACEOPS_API_KEY=tr_live_xxxxxxxxxxxx

# SDK passes it automatically
TraceOps.init({
  endpoint: '...',
  serviceName: '...',
  apiKey: process.env.TRACEOPS_API_KEY,
});`,
      },
      {
        title: 'CORS Configuration',
        body: `The backend supports configurable CORS origins via the CORS_ORIGINS environment variable.`,
        code: `# Backend .env — comma-separated origins
CORS_ORIGINS=https://my-dashboard.com,https://staging.my-dashboard.com

# Default origins always allowed:
# http://localhost:5173
# https://traceops.vercel.app`,
      },
    ],
  },
  {
    id: 'self-hosting',
    title: 'Self-Hosting',
    icon: Database,
    content: [
      {
        title: 'Deploy Backend',
        body: `Deploy the backend/ folder to any Node.js host (Render, Railway, Fly.io, etc).`,
        code: `# Backend environment variables
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/traceops
TRACEOPS_API_KEY=tr_live_xxxxxxxxxxxx
CORS_ORIGINS=https://your-frontend.com
PORT=3000
NODE_ENV=production`,
      },
      {
        title: 'Deploy Frontend',
        body: `Deploy the frontend/ folder to Vercel, Netlify, or any static host. Set VITE_API_BASE to your backend URL.`,
        code: `# Frontend environment variables
VITE_API_BASE=https://your-traceops-backend.onrender.com

# Build and deploy
npm run build
# Upload dist/ to your static host`,
      },
    ],
  },
];

export function DocsPage() {
  const [activeSectionId, setActiveSectionId] = useState('getting-started');
  const activeSection = sections.find(s => s.id === activeSectionId)!;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar nav */}
      <nav
        className="w-[220px] shrink-0 overflow-y-auto py-4"
        style={{
          backgroundColor: 'var(--to-bg-panel)',
          borderRight: '1px solid var(--to-border)',
        }}
      >
        <div className="px-4 mb-4">
          <span className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--to-text-4)' }}>
            Documentation
          </span>
        </div>
        <div className="space-y-0.5 px-2">
          {sections.map(section => {
            const Icon = section.icon;
            const isActive = section.id === activeSectionId;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSectionId(section.id)}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-[5px] transition-all duration-100"
                style={{
                  backgroundColor: isActive ? 'var(--to-bg-elevated)' : 'transparent',
                  color: isActive ? 'var(--to-text-1)' : 'var(--to-text-3)',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--to-bg-hover)';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon size={14} style={{ opacity: isActive ? 1 : 0.5 }} />
                <span className="text-[12px]">{section.title}</span>
              </button>
            );
          })}
        </div>

        <div className="px-4 mt-6 pt-4" style={{ borderTop: '1px solid var(--to-border-subtle)' }}>
          <a
            href="https://github.com/Thee-sage/Trace_Ops"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] transition-colors duration-100"
            style={{ color: 'var(--to-text-4)' }}
          >
            <ExternalLink size={11} />
            GitHub Repository
          </a>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-8 py-8">
          <div className="flex items-center gap-2 mb-1">
            {(() => { const Icon = activeSection.icon; return <Icon size={16} style={{ color: 'var(--to-text-3)' }} />; })()}
            <h1 className="text-[22px] leading-[1.3]" style={{ fontWeight: 500, color: 'var(--to-text-1)', letterSpacing: '-0.02em' }}>
              {activeSection.title}
            </h1>
          </div>

          <div className="space-y-8 mt-6">
            {activeSection.content.map((item, i) => (
              <div key={i}>
                <h3 className="text-[14px] mb-2" style={{ fontWeight: 500, color: 'var(--to-text-1)' }}>
                  {item.title}
                </h3>
                <p className="text-[12.5px] leading-[1.7] mb-3" style={{ color: 'var(--to-text-2)' }}>
                  {item.body}
                </p>
                <div
                  className="rounded-[6px] overflow-hidden"
                  style={{
                    backgroundColor: 'var(--to-log-bg)',
                    border: '1px solid var(--to-log-border)',
                  }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-1.5"
                    style={{ borderBottom: '1px solid var(--to-log-border)' }}
                  >
                    <Terminal size={10} style={{ color: 'var(--to-text-4)' }} />
                    <span className="text-[9px] uppercase tracking-[0.06em]" style={{ color: 'var(--to-text-4)' }}>
                      code
                    </span>
                  </div>
                  <pre
                    className="px-4 py-3 overflow-x-auto text-[11px] leading-[1.65]"
                    style={{
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      color: 'var(--to-text-2)',
                    }}
                  >
                    {item.code}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation between sections */}
          <div className="mt-10 pt-6 flex items-center justify-between" style={{ borderTop: '1px solid var(--to-border-subtle)' }}>
            {(() => {
              const idx = sections.findIndex(s => s.id === activeSectionId);
              const prev = idx > 0 ? sections[idx - 1] : null;
              const next = idx < sections.length - 1 ? sections[idx + 1] : null;
              return (
                <>
                  {prev ? (
                    <button
                      onClick={() => setActiveSectionId(prev.id)}
                      className="text-[12px] flex items-center gap-1.5 transition-colors duration-100"
                      style={{ color: 'var(--to-text-3)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--to-text-1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--to-text-3)'; }}
                    >
                      <ChevronRight size={12} style={{ transform: 'rotate(180deg)' }} />
                      {prev.title}
                    </button>
                  ) : <span />}
                  {next ? (
                    <button
                      onClick={() => setActiveSectionId(next.id)}
                      className="text-[12px] flex items-center gap-1.5 transition-colors duration-100"
                      style={{ color: 'var(--to-text-3)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--to-text-1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--to-text-3)'; }}
                    >
                      {next.title}
                      <ChevronRight size={12} />
                    </button>
                  ) : <span />}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
