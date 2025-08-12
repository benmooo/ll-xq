import { EventEmitter } from 'events';

export interface EventBus extends EventEmitter {
  emit<T>(event: string, data: T): boolean;
  on<T>(event: string, listener: (data: T) => void): this;
  off<T>(event: string, listener: (data: T) => void): this;
}
export class MemoryEventBus extends EventEmitter implements EventBus {
  private emitter = new EventEmitter();

  emit<T>(event: string, data: T) {
    return this.emitter.emit(event, data);
  }
  on<T>(event: string, listener: (data: T) => void) {
    this.emitter.on(event, listener);
    return this;
  }
  off<T>(event: string, listener: (data: T) => void) {
    this.emitter.off(event, listener);
    return this;
  }
}
