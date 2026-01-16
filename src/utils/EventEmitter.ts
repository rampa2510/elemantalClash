import { GameEvent, GameEventType, GameEventListener } from '../types/events';

/**
 * Type-safe event emitter for game events
 */
export class EventEmitter {
  private listeners: Map<GameEventType, Set<GameEventListener<unknown>>>;

  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event type
   */
  on<T>(type: GameEventType, listener: GameEventListener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener as GameEventListener<unknown>);

    // Return unsubscribe function
    return () => this.off(type, listener);
  }

  /**
   * Subscribe to an event type (one-time)
   */
  once<T>(type: GameEventType, listener: GameEventListener<T>): () => void {
    const wrappedListener: GameEventListener<T> = (event) => {
      this.off(type, wrappedListener);
      listener(event);
    };
    return this.on(type, wrappedListener);
  }

  /**
   * Unsubscribe from an event type
   */
  off<T>(type: GameEventType, listener: GameEventListener<T>): void {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.delete(listener as GameEventListener<unknown>);
    }
  }

  /**
   * Emit an event
   */
  emit<T>(type: GameEventType, payload: T): void {
    const event: GameEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
    };

    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach((listener) => {
        try {
          listener(event as GameEvent<unknown>);
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for a type (or all listeners if no type specified)
   */
  removeAllListeners(type?: GameEventType): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get listener count for a type
   */
  listenerCount(type: GameEventType): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

// Global event emitter instance
export const gameEvents = new EventEmitter();
