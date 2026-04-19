import { useState } from 'react';
import { ChevronRight, ChevronDown, ExternalLink, Terminal, Webhook, Shield, Zap, Database, Code2 } from 'lucide-react';
import type { DeviceClass } from './use-mobile';

interface DocsPageProps {
  device: DeviceClass;
}

const sections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Zap,
    content: [
      {
        title: 'Quick Setup',
        body: `Install the TraceOps SDK in your application to start capturing events automatically. The agent instruments your HTTP layer, database queries, and deployment webhooks out of the box.`,
        code: `npm install @traceops/sdk

# Initialize in your entry point
import { TraceOps } from '@traceops/sdk';

TraceOps.init({
  apiKey: process.env.TRACEOPS_API_KEY,
  service: 'payments-api',
  environment: 'production',
  captureErrors: true,
  captureDeployments: true,
});`,
      },
      {
        title: 'Configuration',
        body: `TraceOps supports environment-based configuration. Set these environment variables or pass them directly to the init function.`,
        code: `# Required
TRACEOPS_API_KEY=tok_xxxxxxxxxxxx
TRACEOPS_SERVICE=payments-api
TRACEOPS_ENV=production

# Optional
TRACEOPS_SAMPLE_RATE=1.0
TRACEOPS_LOG_LEVEL=warn
TRACEOPS_ENDPOINT=https://ingest.traceops.io`,
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
        body: `Errors are automatically captured from uncaught exceptions and unhandled promise rejections. You can also manually report errors with full stack trace and metadata.`,
        code: `import { TraceOps } from '@traceops/sdk';

try {
  await processPayment(chargeId);
} catch (err) {
  TraceOps.captureError(err, {
    service: 'payments-api',
    metadata: {
      chargeId,
      customerId: req.user.id,
      endpoint: '/v1/charge',
    },
  });
}`,
      },
      {
        title: 'Deployment Events',
        body: `Mark deployments so TraceOps can correlate code changes with incidents. Integrates with CI/CD pipelines via webhook or SDK.`,
        code: `// Via SDK
TraceOps.trackDeployment({
  version: '2.14.1',
  commit: 'a3f8c21',
  deployer: 'ci/main',
  changelog: 'Updated stripe-node to v14.0.0',
});

// Via webhook (curl)
curl -X POST https://api.traceops.io/v1/deployments \\
  -H "Authorization: Bearer $TRACEOPS_API_KEY" \\
  -d '{"service":"payments-api","version":"2.14.1"}'`,
      },
      {
        title: 'Config Change Events',
        body: `Track configuration changes like feature flags, rate limits, and environment variables. TraceOps highlights config changes that precede incidents.`,
        code: `TraceOps.trackConfigChange({
  key: 'auth.rate_limit.max_rpm',
  previousValue: '1000',
  newValue: '500',
  changedBy: 'ops-bot',
  service: 'auth-service',
});`,
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
        body: `All API requests require a Bearer token in the Authorization header. Generate API keys from your team settings.`,
        code: `curl https://api.traceops.io/v1/issues \\
  -H "Authorization: Bearer tok_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json"`,
      },
      {
        title: 'List Issues',
        body: `Retrieve all active issues with their associated events, root cause analysis, and impact metrics.`,
        code: `GET /v1/issues?status=open&limit=25

Response:
{
  "issues": [
    {
      "id": "i1",
      "title": "Elevated 5xx on payments-api",
      "status": "open",
      "impact": 2340,
      "rootCauseEventId": "e3",
      "causeSummary": "Triggered by payments-api v2.14.1...",
      "firstSeen": "2026-04-18T08:12:00Z"
    }
  ],
  "total": 1,
  "hasMore": false
}`,
      },
      {
        title: 'Get Event Timeline',
        body: `Fetch the full event timeline for an issue, including phase classification and causality chain.`,
        code: `GET /v1/issues/:id/timeline

Response:
{
  "phases": {
    "before": [{ "id": "e3", "type": "deployment", ... }],
    "incident": [{ "id": "e1", "type": "error", ... }],
    "after": [{ "id": "e7", "type": "deployment", ... }]
  },
  "rootCause": { "eventId": "e3", "confidence": 0.94 }
}`,
      },
    ],
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    icon: Webhook,
    content: [
      {
        title: 'Inbound Webhooks',
        body: `Connect your CI/CD pipeline, feature flag service, or infrastructure tools to automatically push events into TraceOps.`,
        code: `# GitHub Actions integration
- name: Notify TraceOps
  uses: traceops/deploy-action@v1
  with:
    api-key: \${{ secrets.TRACEOPS_API_KEY }}
    service: payments-api
    version: \${{ github.sha }}`,
      },
      {
        title: 'Outbound Webhooks',
        body: `Get notified when TraceOps detects a new issue or identifies a root cause. Integrates with Slack, PagerDuty, and custom endpoints.`,
        code: `POST /v1/webhooks
{
  "url": "https://hooks.slack.com/services/T00/B00/xxx",
  "events": ["issue.created", "issue.root_cause_found"],
  "filters": {
    "services": ["payments-api", "auth-service"],
    "minImpact": 100
  }
}`,
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    icon: Shield,
    content: [
      {
        title: 'Data Handling',
        body: `TraceOps encrypts all data in transit (TLS 1.3) and at rest (AES-256). Log entries are scrubbed of PII by default — you can configure additional scrubbing rules.`,
        code: `TraceOps.init({
  // ...
  scrubFields: ['authorization', 'cookie', 'x-api-key'],
  scrubPaths: ['/v1/users/*/password'],
  retentionDays: 30,
});`,
      },
    ],
  },
  {
    id: 'database',
    title: 'Database Tracing',
    icon: Database,
    content: [
      {
        title: 'Auto-instrumentation',
        body: `TraceOps automatically instruments popular database clients including pg, mysql2, mongoose, and prisma. Connection pool metrics are captured in real-time.`,
        code: `import { TraceOps } from '@traceops/sdk';

// Automatically instruments pg client
TraceOps.instrument('pg');

// Or manually wrap queries
const result = await TraceOps.traceQuery(
  'SELECT * FROM payments WHERE id = $1',
  [paymentId],
  { service: 'payments-db' }
);`,
      },
    ],
  },
];

export function DocsPage({ device }: DocsPageProps) {
  const [activeSectionId, setActiveSectionId] = useState('getting-started');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const activeSection = sections.find(s => s.id === activeSectionId)!;
  const isMobile = device === 'phone' || device === 'tablet';

  if (isMobile) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile section selector */}
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--to-border)' }}
        >
          <div className="flex items-center gap-2">
            {(() => { const Icon = activeSection.icon; return <Icon size={14} style={{ color: 'var(--to-text-3)' }} />; })()}
            <span className="text-[13px]" style={{ color: 'var(--to-text-1)', fontWeight: 500 }}>
              {activeSection.title}
            </span>
          </div>
          <ChevronDown
            size={14}
            style={{
              color: 'var(--to-text-4)',
              transform: mobileSidebarOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms',
            }}
          />
        </button>

        {/* Mobile section dropdown */}
        {mobileSidebarOpen && (
          <div
            className="px-3 py-2 space-y-0.5 shrink-0"
            style={{
              backgroundColor: 'var(--to-bg-panel)',
              borderBottom: '1px solid var(--to-border)',
            }}
          >
            {sections.map(section => {
              const Icon = section.icon;
              const isActive = section.id === activeSectionId;
              return (
                <button
                  key={section.id}
                  onClick={() => { setActiveSectionId(section.id); setMobileSidebarOpen(false); }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-[5px]"
                  style={{
                    backgroundColor: isActive ? 'var(--to-bg-elevated)' : 'transparent',
                    color: isActive ? 'var(--to-text-1)' : 'var(--to-text-3)',
                  }}
                >
                  <Icon size={14} style={{ opacity: isActive ? 1 : 0.5 }} />
                  <span className="text-[12px]">{section.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-6">
            <div className="space-y-8">
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
                      className="px-3 py-3 overflow-x-auto text-[10px] leading-[1.65]"
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

            {/* Navigation */}
            <div className="mt-8 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--to-border-subtle)' }}>
              {(() => {
                const idx = sections.findIndex(s => s.id === activeSectionId);
                const prev = idx > 0 ? sections[idx - 1] : null;
                const next = idx < sections.length - 1 ? sections[idx + 1] : null;
                return (
                  <>
                    {prev ? (
                      <button
                        onClick={() => setActiveSectionId(prev.id)}
                        className="text-[12px] flex items-center gap-1.5"
                        style={{ color: 'var(--to-text-3)' }}
                      >
                        <ChevronRight size={12} style={{ transform: 'rotate(180deg)' }} />
                        {prev.title}
                      </button>
                    ) : <span />}
                    {next ? (
                      <button
                        onClick={() => setActiveSectionId(next.id)}
                        className="text-[12px] flex items-center gap-1.5"
                        style={{ color: 'var(--to-text-3)' }}
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
            href="#"
            className="flex items-center gap-1.5 text-[11px] transition-colors duration-100"
            style={{ color: 'var(--to-text-4)' }}
          >
            <ExternalLink size={11} />
            API Reference
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