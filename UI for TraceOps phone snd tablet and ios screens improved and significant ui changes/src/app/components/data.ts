export type EventType = 'error' | 'deployment' | 'config';
export type IssueStatus = 'open' | 'resolved' | 'investigating';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: EventType;
  title: string;
  description: string;
  service: string;
  environment: string;
  metadata: Record<string, string>;
  issueIds: string[];
  suggestedCause?: string;
  logEntry?: LogEntry;
}

export interface LogEntry {
  name: string;
  stack: string;
  method: string;
  path: string;
  statusCode: number;
  userAgent: string;
  ip: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  requestId?: string;
  duration?: string;
}

export interface Issue {
  id: string;
  title: string;
  status: IssueStatus;
  impact: number;
  impactLabel: string;
  eventIds: string[];
  rootCauseEventId?: string;
  causeSummary: string;
  summary: string;
  firstSeen: string;
  service: string;
}

export const issues: Issue[] = [
  {
    id: 'i1',
    title: 'Elevated 5xx on payments-api',
    status: 'open',
    impact: 2340,
    impactLabel: '2.3k users affected',
    eventIds: ['e1', 'e3', 'e6'],
    rootCauseEventId: 'e3',
    causeSummary: 'Triggered by payments-api v2.14.1 deployment with breaking Stripe SDK update',
    summary: 'HTTP 500 errors spiked after deployment of payments-api v2.14.1. The updated Stripe SDK introduced a breaking change in connection handling, leading to cascading failures in the payment processing pipeline.',
    firstSeen: '2026-04-18T08:12:00Z',
    service: 'payments-api',
  },
  {
    id: 'i2',
    title: 'Latency spike in auth-service',
    status: 'investigating',
    impact: 890,
    impactLabel: '890 users affected',
    eventIds: ['e2', 'e4'],
    rootCauseEventId: 'e4',
    causeSummary: 'Rate limit threshold halved by ops-bot, causing legitimate request queuing',
    summary: 'Auth token validation latency increased significantly after rate limit configuration was lowered from 1000 to 500 req/min, causing request queuing.',
    firstSeen: '2026-04-18T08:15:00Z',
    service: 'auth-service',
  },
  {
    id: 'i3',
    title: 'Cart abandonment rate increase',
    status: 'resolved',
    impact: 156,
    impactLabel: '156 users affected',
    eventIds: ['e5', 'e7'],
    rootCauseEventId: 'e5',
    causeSummary: "Feature flag 'new-checkout' enabled for 100% of users prematurely",
    summary: 'New checkout feature flag was enabled for 100% of users prematurely. The storefront deployment that followed contained the fix.',
    firstSeen: '2026-04-18T08:30:00Z',
    service: 'storefront',
  },
  {
    id: 'i4',
    title: 'Database connection pool exhaustion',
    status: 'open',
    impact: 4100,
    impactLabel: '4.1k requests queued',
    eventIds: ['e8', 'e9', 'e10'],
    rootCauseEventId: 'e8',
    causeSummary: 'Connection pool reached capacity with no idle connections available',
    summary: 'Connection pool reached 100% capacity with 47 requests waiting. Pool size was increased and pgbouncer was deployed as mitigation.',
    firstSeen: '2026-04-18T08:48:00Z',
    service: 'payments-db',
  },
  {
    id: 'i5',
    title: 'CDN cache invalidation failure',
    status: 'resolved',
    impact: 72,
    impactLabel: '72 stale responses',
    eventIds: ['e11', 'e12'],
    rootCauseEventId: 'e11',
    causeSummary: 'Cache purge requests failing silently, serving stale content',
    summary: 'Cache purge requests were failing silently, causing stale content to be served. Hotfix deployed in cdn-edge v4.0.1.',
    firstSeen: '2026-04-18T09:05:00Z',
    service: 'cdn-edge',
  },
];

export const events: TimelineEvent[] = [
  {
    id: 'e1',
    timestamp: '2026-04-18T08:12:00Z',
    type: 'error',
    title: '500 errors spike',
    description: 'HTTP 500 responses increased to 12% of total traffic on payments-api',
    service: 'payments-api',
    environment: 'production',
    metadata: { error_rate: '12.3%', p99_latency: '4200ms', affected_endpoints: '/v1/charge, /v1/refund', region: 'us-east-1' },
    issueIds: ['i1'],
    logEntry: {
      name: 'Error',
      stack: 'Error: Stripe connection pool timeout\n    at StripeClient.request (node_modules/stripe/lib/net/HttpClient.js:128:11)\n    at PaymentService.charge (/app/src/services/payment.ts:45:22)\n    at ChargeController.create (/app/src/controllers/charge.ts:18:9)\n    at Layer.handle [as handle_request] (node_modules/express/lib/router/layer.js:95:5)\n    at next (node_modules/express/lib/router/route.js:149:13)\n    at Route.dispatch (node_modules/express/lib/router/route.js:119:3)',
      method: 'POST',
      path: '/v1/charge',
      statusCode: 500,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
      ip: '10.0.42.17',
      timestamp: '2026-04-18T08:12:00.342Z',
      level: 'error',
      requestId: 'req_8f2a3b1c',
      duration: '4201ms',
    },
  },
  {
    id: 'e2',
    timestamp: '2026-04-18T08:15:00Z',
    type: 'error',
    title: 'Auth timeout errors',
    description: 'Token validation requests timing out after 30s',
    service: 'auth-service',
    environment: 'production',
    metadata: { timeout_count: '847', affected_region: 'us-east-1', avg_latency: '31200ms' },
    issueIds: ['i2'],
    logEntry: {
      name: 'TimeoutError',
      stack: 'TimeoutError: Token validation exceeded 30000ms\n    at AuthValidator.validate (/app/src/middleware/auth.ts:67:15)\n    at TokenService.verify (/app/src/services/token.ts:23:8)\n    at Layer.handle [as handle_request] (node_modules/express/lib/router/layer.js:95:5)\n    at next (node_modules/express/lib/router/route.js:149:13)',
      method: 'GET',
      path: '/auth/validate',
      statusCode: 504,
      userAgent: 'payments-api/2.14.1 (internal)',
      ip: '10.0.38.5',
      timestamp: '2026-04-18T08:15:00.891Z',
      level: 'error',
      requestId: 'req_a91c4e2d',
      duration: '31204ms',
    },
  },
  {
    id: 'e3',
    timestamp: '2026-04-18T08:18:00Z',
    type: 'deployment',
    title: 'payments-api v2.14.1',
    description: 'Deployed payments-api with updated Stripe SDK',
    service: 'payments-api',
    environment: 'production',
    metadata: { commit: 'a3f8c21', deployer: 'ci/main', image: 'payments-api:2.14.1', changelog: 'Updated stripe-node to v14.0.0' },
    issueIds: ['i1'],
    suggestedCause: 'This deployment introduced stripe-node v14.0.0 which contains breaking changes in connection pooling. This is the likely root cause of the 5xx spike.',
  },
  {
    id: 'e4',
    timestamp: '2026-04-18T08:22:00Z',
    type: 'config',
    title: 'Rate limit config update',
    description: 'Rate limiting threshold changed from 1000 to 500 req/min on auth-service',
    service: 'auth-service',
    environment: 'production',
    metadata: { previous: '1000 req/min', current: '500 req/min', changed_by: 'ops-bot', config_key: 'auth.rate_limit.max_rpm' },
    issueIds: ['i2'],
    suggestedCause: 'Rate limit reduction coincides with auth latency spike. The lower threshold is causing legitimate requests to be queued.',
  },
  {
    id: 'e5',
    timestamp: '2026-04-18T08:30:00Z',
    type: 'config',
    title: 'Feature flag: new-checkout',
    description: 'Enabled new-checkout flag for 100% of users',
    service: 'storefront',
    environment: 'production',
    metadata: { flag: 'new-checkout', rollout: '100%', previous_rollout: '10%' },
    issueIds: ['i3'],
    suggestedCause: 'Feature flag was ramped from 10% to 100% without gradual rollout. The new checkout flow had an unresolved UX issue.',
  },
  {
    id: 'e6',
    timestamp: '2026-04-18T08:35:00Z',
    type: 'error',
    title: 'Connection refused errors',
    description: 'Downstream service payments-db returning connection refused',
    service: 'payments-api',
    environment: 'production',
    metadata: { error: 'ECONNREFUSED', host: 'payments-db.internal:5432', retry_count: '3' },
    issueIds: ['i1'],
    logEntry: {
      name: 'Error',
      stack: 'Error: connect ECONNREFUSED 10.0.55.12:5432\n    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1141:16)\n    at Pool.connect (node_modules/pg-pool/index.js:45:11)\n    at PaymentRepository.findById (/app/src/repos/payment.ts:32:18)\n    at ChargeController.process (/app/src/controllers/charge.ts:55:12)',
      method: 'POST',
      path: '/v1/charge/process',
      statusCode: 503,
      userAgent: 'internal-retry/1.0',
      ip: '10.0.42.17',
      timestamp: '2026-04-18T08:35:00.127Z',
      level: 'error',
      requestId: 'req_d4f8a21e',
      duration: '312ms',
    },
  },
  {
    id: 'e7',
    timestamp: '2026-04-18T08:42:00Z',
    type: 'deployment',
    title: 'storefront v3.8.0',
    description: 'Deployed storefront with checkout flow redesign',
    service: 'storefront',
    environment: 'production',
    metadata: { commit: 'f91b2e7', deployer: 'ci/main' },
    issueIds: ['i3'],
  },
  {
    id: 'e8',
    timestamp: '2026-04-18T08:48:00Z',
    type: 'error',
    title: 'Pool exhaustion alert',
    description: 'Connection pool at 100% capacity, new connections queued',
    service: 'payments-db',
    environment: 'production',
    metadata: { pool_size: '100', waiting: '47', active: '100', idle: '0' },
    issueIds: ['i4'],
    logEntry: {
      name: 'PoolExhaustionError',
      stack: 'PoolExhaustionError: Cannot acquire connection from pool\n    at BoundPool.acquire (node_modules/pg-pool/index.js:188:27)\n    at ConnectionManager.getConnection (/app/src/db/manager.ts:41:14)\n    at QueryExecutor.run (/app/src/db/executor.ts:22:9)',
      method: 'POST',
      path: '/internal/query',
      statusCode: 503,
      userAgent: 'payments-api/2.14.1 (internal)',
      ip: '10.0.55.12',
      timestamp: '2026-04-18T08:48:00.554Z',
      level: 'error',
      requestId: 'req_e7b2c91f',
      duration: '15023ms',
    },
  },
  {
    id: 'e9',
    timestamp: '2026-04-18T08:52:00Z',
    type: 'config',
    title: 'Pool size increase',
    description: 'Increased max connections from 100 to 200',
    service: 'payments-db',
    environment: 'production',
    metadata: { previous: '100', current: '200', applied_by: 'on-call/jpark' },
    issueIds: ['i4'],
  },
  {
    id: 'e10',
    timestamp: '2026-04-18T08:58:00Z',
    type: 'deployment',
    title: 'payments-db v1.2.3',
    description: 'Deployed connection pooler with pgbouncer',
    service: 'payments-db',
    environment: 'production',
    metadata: { commit: 'c44de90', deployer: 'on-call/jpark' },
    issueIds: ['i4'],
  },
  {
    id: 'e11',
    timestamp: '2026-04-18T09:05:00Z',
    type: 'error',
    title: 'Stale cache responses',
    description: 'CDN serving stale content after purge request failure',
    service: 'cdn-edge',
    environment: 'production',
    metadata: { cache_age: '3600s', purge_status: 'failed', affected_paths: '/api/products/*' },
    issueIds: ['i5'],
    logEntry: {
      name: 'CachePurgeError',
      stack: 'CachePurgeError: Purge request returned 403 Forbidden\n    at CacheManager.purge (/app/src/cache/manager.ts:89:11)\n    at PurgeWorker.process (/app/src/workers/purge.ts:34:8)\n    at Queue.run (node_modules/bull/lib/queue.js:621:12)',
      method: 'PURGE',
      path: '/api/products/*',
      statusCode: 403,
      userAgent: 'cdn-purge-worker/1.0',
      ip: '10.0.71.3',
      timestamp: '2026-04-18T09:05:00.221Z',
      level: 'error',
      requestId: 'req_f1a3d82b',
      duration: '89ms',
    },
  },
  {
    id: 'e12',
    timestamp: '2026-04-18T09:12:00Z',
    type: 'deployment',
    title: 'cdn-edge v4.0.1',
    description: 'Hotfix for cache invalidation logic',
    service: 'cdn-edge',
    environment: 'production',
    metadata: { commit: 'b87a1f3', deployer: 'ci/hotfix' },
    issueIds: ['i5'],
  },
];

export const services = ['All services', 'payments-api', 'auth-service', 'storefront', 'payments-db', 'cdn-edge'];