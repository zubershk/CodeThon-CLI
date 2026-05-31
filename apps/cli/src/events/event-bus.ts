import type { RuntimeEvent, RuntimeEventSubscriber } from './types';

export class RuntimeEventBus {
  private readonly subscribers = new Set<RuntimeEventSubscriber>();
  private readonly events: RuntimeEvent[] = [];

  constructor(private readonly persist?: (event: RuntimeEvent) => void) {}

  subscribe(subscriber: RuntimeEventSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  emit(event: RuntimeEvent): void {
    this.events.push(event);
    this.persist?.(event);

    for (const subscriber of this.subscribers) {
      void subscriber(event);
    }
  }

  replay(subscriber: RuntimeEventSubscriber): void {
    for (const event of this.events) {
      void subscriber(event);
    }
  }

  snapshot(): RuntimeEvent[] {
    return [...this.events];
  }
}
