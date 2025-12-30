import { createHash } from 'crypto';
import { Event, EventType } from '../models/Event';

function getTopStackLine(metadata?: Record<string, unknown>): string {
  if (!metadata) return '';
  
  const errorStack = metadata.errorStack;
  if (typeof errorStack !== 'string') return '';
  
  const lines = errorStack.split('\n').filter(line => line.trim());
  if (lines.length < 2) return '';
  
  const firstStackFrame = lines[1] || '';
  
  const functionMatch = firstStackFrame.match(/at\s+([^\s(]+(?:\.[^\s(]+)?)/);
  if (functionMatch && functionMatch[1]) {
    return functionMatch[1];
  }
  
  return '';
}

function getRoute(metadata?: Record<string, unknown>, message?: string): string {
  if (metadata?.route && typeof metadata.route === 'string') {
    return metadata.route;
  }
  
  if (message) {
    const routeMatch = message.match(/(?:GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)/i);
    if (routeMatch) {
      return routeMatch[1];
    }
  }
  
  return '';
}

export function generateFingerprint(event: Event): string {
  if (event.eventType !== EventType.ERROR) {
    throw new Error('Fingerprint can only be generated for ERROR events');
  }

  const errorMessage = event.message || '';
  const topStackLine = getTopStackLine(event.metadata);
  const route = getRoute(event.metadata, event.message);

  const fingerprintData = `${errorMessage}|${topStackLine}|${route}`;

  return createHash('sha256').update(fingerprintData).digest('hex');
}

