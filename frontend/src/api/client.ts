import { TimelineResponse } from '../types/event';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000'
).replace(/\/+$/, '');

export async function fetchTimeline(
  serviceName: string
): Promise<TimelineResponse> {
  const response = await fetch(
    `${API_BASE_URL}/events/timeline/${encodeURIComponent(serviceName)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch timeline: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchServices(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/events`);

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }

  const data = await response.json();
  const services = new Set<string>();

  data.events?.forEach((event: { serviceName: string }) => {
    if (event.serviceName) {
      services.add(event.serviceName);
    }
  });

  return Array.from(services).sort();
}

export async function fetchIssues(serviceName: string): Promise<any[]> {
  const response = await fetch(
    `${API_BASE_URL}/issues?serviceName=${encodeURIComponent(serviceName)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch issues: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchNeedsAttention(serviceName: string, limit: number = 3): Promise<any[]> {
  const response = await fetch(
    `${API_BASE_URL}/issues/needs-attention?serviceName=${encodeURIComponent(serviceName)}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch issues needing attention: ${response.statusText}`);
  }

  return response.json();
}
