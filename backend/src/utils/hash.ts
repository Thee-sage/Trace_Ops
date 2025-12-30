import { ethers } from 'ethers';
import { Event } from '../models/Event';

export function generateTimelineHash(events: Event[]): string {
  if (events.length === 0) {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(''));
  }

  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  
  const eventData = sortedEvents.map(event => ({
    id: event.id,
    timestamp: event.timestamp,
    eventType: event.eventType,
    serviceName: event.serviceName,
    message: event.message,
  }));
  
  const jsonString = JSON.stringify(eventData);
  
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(jsonString));
}
