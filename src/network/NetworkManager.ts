import Peer, { DataConnection } from 'peerjs';
import {
  NetworkMessage,
  NetworkMessageType,
  ConnectionState,
  NetworkConfig,
  DEFAULT_NETWORK_CONFIG,
} from './types';
import { gameEvents } from '../utils/EventEmitter';

/**
 * NetworkManager - Core P2P networking using PeerJS
 */
export class NetworkManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private sessionId: string | null = null;
  private isHost: boolean = false;
  private config: NetworkConfig;

  // Initialization guard (Issue #1 fix)
  private isInitializing: boolean = false;

  // Message handling
  private messageHandlers: Map<NetworkMessageType, Set<(msg: NetworkMessage) => void>> = new Map();
  private seenMessageIds: Set<string> = new Set();
  private messageCleanupInterval: number | null = null;

  // Heartbeat
  private heartbeatInterval: number | null = null;
  private lastPongTime: number = 0;
  private heartbeatTimeoutCheck: number | null = null;

  // Reconnection
  private reconnectAttempts: number = 0;
  private reconnectTimer: number | null = null;

  // Peer event handler references for cleanup
  private peerOpenHandler?: (id: string) => void;
  private peerConnectionHandler?: (conn: DataConnection) => void;
  private peerErrorHandler?: (error: Error) => void;
  private peerDisconnectedHandler?: () => void;
  private peerCloseHandler?: () => void;

  // Connection event handler references for cleanup (Issue #2 fix)
  private connOpenHandler?: () => void;
  private connDataHandler?: (data: unknown) => void;
  private connCloseHandler?: () => void;
  private connErrorHandler?: (error: Error) => void;

  constructor(config: Partial<NetworkConfig> = {}) {
    this.config = { ...DEFAULT_NETWORK_CONFIG, ...config };
  }

  /**
   * Initialize as host and wait for connections
   * @param sessionId The session ID to use
   */
  async initializeHost(sessionId: string): Promise<void> {
    // Issue #1 fix: Prevent double initialization
    if (this.isInitializing) {
      this.log('Already initializing, ignoring duplicate call');
      return;
    }

    this.log('Initializing as host with session:', sessionId);
    this.isInitializing = true;
    this.sessionId = sessionId;
    this.isHost = true;
    this.connectionState = ConnectionState.CONNECTING;

    // Cleanup any existing peer
    if (this.peer) {
      this.cleanupPeer();
    }

    return new Promise((resolve, reject) => {
      try {
        // Create peer with session ID
        // Include TURN servers for NAT traversal (required for remote connections)
        this.peer = new Peer(sessionId, {
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
          debug: this.config.debug ? 3 : 0,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              // Free TURN servers from OpenRelay (https://www.metered.ca/tools/openrelay/)
              {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
              },
              {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
              },
              {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
              }
            ]
          }
        });

        // Store handlers for cleanup
        this.peerOpenHandler = (id: string) => {
          this.log('Peer connection opened, ID:', id);
          this.connectionState = ConnectionState.CONNECTED;
          this.isInitializing = false; // Clear initialization flag
          // Don't emit NETWORK_CONNECTED here - wait for data connection
          resolve();
        };

        this.peerConnectionHandler = (conn: DataConnection) => {
          this.log('Incoming connection from peer');
          this.handleIncomingConnection(conn);
        };

        this.peerErrorHandler = (error: Error) => {
          this.isInitializing = false; // Clear initialization flag on error
          this.handlePeerError(error);
          reject(error);
        };

        this.peerDisconnectedHandler = () => {
          this.log('Peer disconnected from signaling server');
        };

        this.peerCloseHandler = () => {
          this.log('Peer connection closed');
          this.handleDisconnection();
        };

        // Attach handlers
        this.peer.on('open', this.peerOpenHandler);
        this.peer.on('connection', this.peerConnectionHandler);
        this.peer.on('error', this.peerErrorHandler);
        this.peer.on('disconnected', this.peerDisconnectedHandler);
        this.peer.on('close', this.peerCloseHandler);
      } catch (error) {
        this.log('Error initializing host:', error);
        reject(error);
      }
    });
  }

  /**
   * Connect as client to host
   * @param sessionId The host's session ID
   */
  async connectAsClient(sessionId: string): Promise<void> {
    // Issue #1 fix: Prevent double initialization
    if (this.isInitializing) {
      this.log('Already initializing, ignoring duplicate call');
      return;
    }

    this.log('Connecting as client to session:', sessionId);
    this.isInitializing = true;
    this.sessionId = sessionId;
    this.isHost = false;
    this.connectionState = ConnectionState.CONNECTING;

    // Cleanup any existing peer
    if (this.peer) {
      this.cleanupPeer();
    }

    return new Promise((resolve, reject) => {
      try {
        // Create peer with random ID
        // Include TURN servers for NAT traversal (required for remote connections)
        const clientId = 'client-' + Math.random().toString(36).substr(2, 9);
        this.peer = new Peer(clientId, {
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
          debug: this.config.debug ? 3 : 0,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              // Free TURN servers from OpenRelay (https://www.metered.ca/tools/openrelay/)
              {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
              },
              {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
              },
              {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
              }
            ]
          }
        });

        // Store handlers for cleanup
        this.peerOpenHandler = (id: string) => {
          this.log('Peer opened, connecting to host...');
          this.isInitializing = false; // Clear initialization flag

          // Connect to host
          const conn = this.peer!.connect(sessionId, {
            reliable: true,
          });

          this.setupConnection(conn);
          resolve();
        };

        this.peerErrorHandler = (error: Error) => {
          this.isInitializing = false; // Clear initialization flag on error
          this.handlePeerError(error);
          reject(error);
        };

        this.peerDisconnectedHandler = () => {
          this.log('Peer disconnected from signaling server');
        };

        this.peerCloseHandler = () => {
          this.log('Peer connection closed');
          this.handleDisconnection();
        };

        // Attach handlers
        this.peer.on('open', this.peerOpenHandler);
        this.peer.on('error', this.peerErrorHandler);
        this.peer.on('disconnected', this.peerDisconnectedHandler);
        this.peer.on('close', this.peerCloseHandler);
      } catch (error) {
        this.log('Error connecting as client:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming connection (host side)
   */
  private handleIncomingConnection(conn: DataConnection): void {
    if (this.connection) {
      this.log('Connection already exists, rejecting new connection');
      conn.close();
      return;
    }

    this.log('Incoming connection accepted, waiting for open event...');
    this.connection = conn;

    // Setup connection with callback to send ACK when ready
    this.setupConnection(conn, () => {
      this.log('Connection open confirmed, sending CONNECTION_ACK');
      this.send({
        type: 'CONNECTION_ACK',
        payload: { accepted: true },
      });
    });
  }

  /**
   * Setup connection event handlers
   * Issue #2 fix: Store handler references for proper cleanup
   */
  private setupConnection(conn: DataConnection, onOpen?: () => void): void {
    // Clean up old connection handlers if they exist
    this.cleanupConnectionHandlers();

    this.connection = conn;

    // Store handlers for cleanup
    this.connOpenHandler = () => {
      this.log('✅ Data connection open event fired');
      this.connectionState = ConnectionState.CONNECTED;
      this.startHeartbeat();
      this.startMessageCleanup();
      gameEvents.emit('NETWORK_CONNECTED', {});
      gameEvents.emit('OPPONENT_JOINED', {});

      // Execute callback now that connection is ready
      if (onOpen) {
        onOpen();
      }
    };

    this.connDataHandler = (data) => {
      this.handleIncomingMessage(data as NetworkMessage);
    };

    this.connCloseHandler = () => {
      this.log('Data connection closed');
      this.handleDisconnection();
    };

    this.connErrorHandler = (error) => {
      this.log('Data connection error:', error);
      gameEvents.emit('NETWORK_ERROR', { error: error.message });
    };

    // Attach handlers
    conn.on('open', this.connOpenHandler);
    conn.on('data', this.connDataHandler);
    conn.on('close', this.connCloseHandler);
    conn.on('error', this.connErrorHandler);
  }

  /**
   * Clean up connection event handlers
   * Issue #2 fix: Properly remove handlers before reconnection
   */
  private cleanupConnectionHandlers(): void {
    if (!this.connection) {
      return;
    }

    // Remove event listeners if handlers exist
    if (this.connOpenHandler) {
      this.connection.off('open', this.connOpenHandler);
      this.connOpenHandler = undefined;
    }
    if (this.connDataHandler) {
      this.connection.off('data', this.connDataHandler);
      this.connDataHandler = undefined;
    }
    if (this.connCloseHandler) {
      this.connection.off('close', this.connCloseHandler);
      this.connCloseHandler = undefined;
    }
    if (this.connErrorHandler) {
      this.connection.off('error', this.connErrorHandler);
      this.connErrorHandler = undefined;
    }
  }

  /**
   * Send a network message
   */
  send<T>(message: Omit<NetworkMessage<T>, 'timestamp' | 'senderId' | 'messageId'>): void {
    if (!this.connection || this.connectionState !== ConnectionState.CONNECTED) {
      this.log('Cannot send message, not connected');
      return;
    }

    const fullMessage: NetworkMessage<T> = {
      ...message,
      timestamp: Date.now(),
      senderId: this.isHost ? 'host' : 'client',
      messageId: this.generateMessageId(),
    };

    try {
      this.connection.send(fullMessage);
      this.log('Sent message:', fullMessage.type);
    } catch (error) {
      this.log('Error sending message:', error);
      gameEvents.emit('NETWORK_ERROR', { error: 'Failed to send message' });
    }
  }

  /**
   * Handle incoming message
   */
  private handleIncomingMessage(message: NetworkMessage): void {
    this.log('Received message:', message.type);

    // Check for duplicate
    if (this.seenMessageIds.has(message.messageId)) {
      this.log('Duplicate message ignored:', message.messageId);
      return;
    }

    this.seenMessageIds.add(message.messageId);

    // Handle special messages
    if (message.type === 'PING') {
      this.handlePing();
      return;
    }

    if (message.type === 'PONG') {
      this.handlePong();
      return;
    }

    // Route to handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers && handlers.size > 0) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          this.log('Error in message handler:', error);
        }
      });
    } else {
      this.log('No handlers for message type:', message.type);
    }
  }

  /**
   * Subscribe to a message type
   */
  on<T>(type: NetworkMessageType, handler: (msg: NetworkMessage<T>) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler as (msg: NetworkMessage) => void);

    // Return unsubscribe function
    return () => {
      this.off(type, handler);
    };
  }

  /**
   * Unsubscribe from a message type
   */
  off<T>(type: NetworkMessageType, handler: (msg: NetworkMessage<T>) => void): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler as (msg: NetworkMessage) => void);
    }
  }

  /**
   * Subscribe to a message type once
   */
  once<T>(type: NetworkMessageType, handler: (msg: NetworkMessage<T>) => void): void {
    const wrappedHandler = (msg: NetworkMessage<T>) => {
      handler(msg);
      this.off(type, wrappedHandler);
    };
    this.on(type, wrappedHandler);
  }

  /**
   * Wait for a specific message with timeout
   */
  async waitForMessage<T>(type: NetworkMessageType, timeout: number = 5000): Promise<NetworkMessage<T>> {
    return new Promise((resolve, reject) => {
      // Declare handler first to avoid hoisting issues
      const handler = (msg: NetworkMessage<T>) => {
        clearTimeout(timer);
        resolve(msg);
      };

      const timer = setTimeout(() => {
        this.off(type, handler);
        reject(new Error(`Timeout waiting for message: ${type}`));
      }, timeout);

      this.once(type, handler);
    });
  }

  /**
   * Start heartbeat system
   * Issue #3 fix: Prevent double-trigger
   */
  private startHeartbeat(): void {
    // Issue #3 fix: Stop any existing heartbeat first
    if (this.heartbeatInterval !== null) {
      this.log('Heartbeat already running, stopping it first');
      this.stopHeartbeat();
    }

    this.log('Starting heartbeat');
    this.lastPongTime = Date.now();

    // Send ping every interval
    this.heartbeatInterval = window.setInterval(() => {
      // Clear previous timeout check if it exists
      if (this.heartbeatTimeoutCheck !== null) {
        clearTimeout(this.heartbeatTimeoutCheck);
      }

      // Check if last pong was too long ago
      if (Date.now() - this.lastPongTime > this.config.heartbeatTimeout!) {
        this.log('Heartbeat timeout, connection lost');
        this.handleDisconnection();
        return;
      }

      // Send ping
      this.send({ type: 'PING', payload: null });

      // Set timeout for this ping's pong
      this.heartbeatTimeoutCheck = window.setTimeout(() => {
        if (Date.now() - this.lastPongTime > this.config.heartbeatTimeout!) {
          this.log('Heartbeat timeout, connection lost');
          this.handleDisconnection();
        }
      }, this.config.heartbeatTimeout!);
    }, this.config.heartbeatInterval!);
  }

  /**
   * Stop heartbeat system
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeoutCheck !== null) {
      clearTimeout(this.heartbeatTimeoutCheck);
      this.heartbeatTimeoutCheck = null;
    }
  }

  /**
   * Handle incoming ping
   */
  private handlePing(): void {
    this.send({ type: 'PONG', payload: null });
  }

  /**
   * Handle incoming pong
   */
  private handlePong(): void {
    this.lastPongTime = Date.now();
  }

  /**
   * Start message cleanup to prevent memory leak
   */
  private startMessageCleanup(): void {
    // Clean up old message IDs every 60 seconds
    this.messageCleanupInterval = window.setInterval(() => {
      this.seenMessageIds.clear();
      this.log('Cleared message ID cache');
    }, 60000);
  }

  /**
   * Stop message cleanup
   */
  private stopMessageCleanup(): void {
    if (this.messageCleanupInterval !== null) {
      clearInterval(this.messageCleanupInterval);
      this.messageCleanupInterval = null;
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(): void {
    this.log('Handling disconnection');
    this.connectionState = ConnectionState.DISCONNECTED;
    this.stopHeartbeat();
    this.stopMessageCleanup();

    gameEvents.emit('NETWORK_DISCONNECTED', {});
    gameEvents.emit('OPPONENT_LEFT', {});

    // Attempt reconnection if configured
    if (this.reconnectAttempts < this.config.reconnectAttempts!) {
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect
   */
  private async attemptReconnect(): Promise<void> {
    this.reconnectAttempts++;
    this.connectionState = ConnectionState.RECONNECTING;

    gameEvents.emit('NETWORK_RECONNECTING', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.reconnectAttempts!,
    });

    const delay = this.config.reconnectDelay! * Math.pow(2, this.reconnectAttempts - 1);
    this.log(`Reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = window.setTimeout(async () => {
      try {
        if (!this.isHost && this.sessionId) {
          await this.connectAsClient(this.sessionId);
          this.reconnectAttempts = 0;  // Reset on success
        }
      } catch (error) {
        this.log('Reconnection failed:', error);
        if (this.reconnectAttempts < this.config.reconnectAttempts!) {
          this.attemptReconnect();
        } else {
          this.connectionState = ConnectionState.ERROR;
          gameEvents.emit('NETWORK_ERROR', { error: 'Reconnection failed' });
        }
      }
    }, delay);
  }

  /**
   * Handle peer error
   */
  private handlePeerError(error: any): void {
    this.log('Peer error:', error);
    this.connectionState = ConnectionState.ERROR;

    // Check for specific error types
    if (error.type === 'peer-unavailable' || error.message?.includes('peer-unavailable')) {
      gameEvents.emit('NETWORK_ERROR', { error: 'Host is not available or offline' });
    } else if (error.type === 'network' || error.message?.includes('Could not connect to peer')) {
      gameEvents.emit('NETWORK_ERROR', { error: 'Host not found or offline' });
    } else if (error.type === 'disconnected' || error.message?.includes('Lost connection to server')) {
      gameEvents.emit('NETWORK_ERROR', { error: 'Lost connection to signaling server' });
    } else if (error.type === 'server-error') {
      gameEvents.emit('NETWORK_ERROR', { error: 'PeerJS server error. Please try again' });
    } else {
      gameEvents.emit('NETWORK_ERROR', { error: error.message || 'Connection error' });
    }
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    this.log('Disconnecting');

    this.stopHeartbeat();
    this.stopMessageCleanup();

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Issue #2 fix: Use proper cleanup instead of removeAllListeners()
    this.cleanupConnectionHandlers();

    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    this.cleanupPeer();

    this.connectionState = ConnectionState.DISCONNECTED;
    this.messageHandlers.clear();
    this.seenMessageIds.clear();
    this.reconnectAttempts = 0;
    this.isInitializing = false; // Reset initialization flag

    gameEvents.emit('NETWORK_DISCONNECTED', {});
  }

  /**
   * Cleanup peer and its event listeners
   */
  private cleanupPeer(): void {
    if (!this.peer) {
      return;
    }

    // Remove event listeners
    if (this.peerOpenHandler) {
      this.peer.off('open', this.peerOpenHandler);
      this.peerOpenHandler = undefined;
    }
    if (this.peerConnectionHandler) {
      this.peer.off('connection', this.peerConnectionHandler);
      this.peerConnectionHandler = undefined;
    }
    if (this.peerErrorHandler) {
      this.peer.off('error', this.peerErrorHandler);
      this.peerErrorHandler = undefined;
    }
    if (this.peerDisconnectedHandler) {
      this.peer.off('disconnected', this.peerDisconnectedHandler);
      this.peerDisconnectedHandler = undefined;
    }
    if (this.peerCloseHandler) {
      this.peer.off('close', this.peerCloseHandler);
      this.peerCloseHandler = undefined;
    }

    // Destroy peer
    this.peer.destroy();
    this.peer = null;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }

  /**
   * Check if this is the host
   */
  isHostPeer(): boolean {
    return this.isHost;
  }

  /**
   * Get peer ID
   */
  getPeerId(): string | null {
    return this.peer?.id ?? null;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log message (if debug enabled)
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[NetworkManager]', ...args);
    }
  }
}

// Export singleton instance
export const networkManager = new NetworkManager({ debug: true });
