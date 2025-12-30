import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'traceops.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Create SQLite database connection
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create events table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    eventType TEXT NOT NULL,
    serviceName TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT
  )
`);

// Create index on serviceName for faster queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_events_serviceName ON events(serviceName)
`);

// Create index on timestamp for time-based queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)
`);

// Create index on eventType for type-based queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_events_eventType ON events(eventType)
`);

// Create issues table if not exists
// Use composite primary key (serviceName, fingerprint) to allow same fingerprint across services
db.exec(`
  CREATE TABLE IF NOT EXISTS issues (
    serviceName TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    count INTEGER NOT NULL,
    severity TEXT NOT NULL,
    regressionCount INTEGER NOT NULL,
    priorityScore INTEGER NOT NULL,
    firstSeen INTEGER NOT NULL,
    lastSeen INTEGER NOT NULL,
    resolvedAt INTEGER,
    suspectedCauseEventId TEXT,
    resolvedByEventId TEXT,
    title TEXT NOT NULL,
    uniqueRoutes INTEGER NOT NULL,
    uniqueUsers INTEGER,
    errorRate REAL NOT NULL,
    priorityReason TEXT,
    relatedEventIds TEXT NOT NULL,
    PRIMARY KEY (serviceName, fingerprint)
  )
`);

// Create index on serviceName for faster queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_issues_serviceName ON issues(serviceName)
`);

// Create index on status for filtering open/resolved issues
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status)
`);

// Create index on priorityScore for sorting
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_issues_priorityScore ON issues(priorityScore)
`);

export { db };

