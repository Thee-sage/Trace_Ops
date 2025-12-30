type EventMetadata = Record<string, unknown>;

interface TraceOpsOptions {
  endpoint: string;
  service: string;
}

interface EventPayload {
  eventType: 'DEPLOY' | 'CONFIG_CHANGE' | 'ERROR';
  serviceName: string;
  timestamp: number;
  message?: string;
  metadata?: EventMetadata;
}

export class TraceOps {
  private endpoint: string;
  private serviceName: string;

  constructor({ endpoint, service }: TraceOpsOptions) {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.serviceName = service;
  }

  async deploy(metadata?: EventMetadata): Promise<void> {
    await this.sendEvent({
      eventType: 'DEPLOY',
      message: 'Deployment event',
      metadata,
    });
  }

  async configChange(metadata?: EventMetadata): Promise<void> {
    await this.sendEvent({
      eventType: 'CONFIG_CHANGE',
      message: 'Configuration change event',
      metadata,
    });
  }

  async error(error: Error | EventMetadata, metadata?: EventMetadata): Promise<void> {
    if (error instanceof Error) {
      await this.sendEvent({
        eventType: 'ERROR',
        message: error.message,
        metadata: {
          errorName: error.name,
          errorStack: error.stack,
          ...metadata,
        },
      });
    } else {
      await this.sendEvent({
        eventType: 'ERROR',
        message: 'Error event',
        metadata: {
          ...error,
          ...metadata,
        },
      });
    }
  }

  private async sendEvent(payload: Omit<EventPayload, 'serviceName' | 'timestamp'>): Promise<void> {
    const eventPayload: EventPayload = {
      ...payload,
      serviceName: this.serviceName,
      timestamp: Date.now(),
    };

    const response = await fetch(`${this.endpoint}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!response.ok) {
      throw new Error(`Failed to send event: ${response.statusText}`);
    }
  }
}

