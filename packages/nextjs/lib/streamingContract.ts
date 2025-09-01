// Simple, reliable streaming contract using the new sync system
import SimpleStreamSync, { StreamData, ChatMessage } from './simpleStreamSync';

// Re-export types for compatibility
export type { ChatMessage };

export interface StreamState extends StreamData {}

export interface StreamConfig {
  title: string;
  category: string;
  topic: string;
  moderators: string[];
  moderatorData: Array<{
    id: string;
    name: string;
    type: string;
    pricePerHour: number;
  }>;
  startTime: number;
  walletAddress: string;
}

class StreamingContract {
  private static instance: StreamingContract;
  private sync: SimpleStreamSync;

  private constructor() {
    this.sync = SimpleStreamSync.getInstance();
    console.log('✅ StreamingContract initialized with SimpleStreamSync');
  }

  static getInstance(): StreamingContract {
    if (!StreamingContract.instance) {
      StreamingContract.instance = new StreamingContract();
    }
    return StreamingContract.instance;
  }

  // Create a new stream
  createStream(streamData: Omit<StreamState, 'id' | 'viewerCount' | 'lastUpdate'>): string {
    const fullStreamData = {
      ...streamData,
      viewerCount: 0
    };
    
    return this.sync.createStream(fullStreamData);
  }

  // Get stream state
  getStream(streamId: string): StreamState | null {
    const streams = this.sync.getAllActiveStreams();
    return streams.find(s => s.id === streamId) || null;
  }

  // Update stream state
  updateStream(streamId: string, updates: Partial<StreamState>): boolean {
    return this.sync.updateStream(streamId, updates);
  }

  // End stream
  endStream(streamId: string) {
    this.sync.endStream(streamId);
  }

  // Send chat message
  sendMessage(streamId: string, sender: string, message: string, senderAddress?: string): boolean {
    return this.sync.sendMessage(streamId, sender, message, senderAddress);
  }

  // Get chat messages
  getChatMessages(streamId: string): ChatMessage[] {
    return this.sync.getChatMessages(streamId);
  }

  // Join stream as viewer
  joinStream(streamId: string, viewerName: string, viewerAddress?: string): boolean {
    return this.sync.joinStream(streamId, viewerName, viewerAddress);
  }

  // Leave stream
  leaveStream(streamId: string, viewerName: string): boolean {
    return this.sync.leaveStream(streamId, viewerName);
  }

  // Get all active streams
  getAllActiveStreams(): StreamState[] {
    return this.sync.getAllActiveStreams();
  }

  // Clear all streams
  clearAllStreams(): void {
    this.sync.clearAllStreams();
  }

  // Event listeners
  on(event: string, callback: Function) {
    this.sync.on(event, callback);
  }

  off(event: string, callback: Function) {
    this.sync.off(event, callback);
  }

  // Legacy method for compatibility
  requestStreamsFromOtherWindows() {
    console.log('📢 Requesting streams (using new sync system)');
    // The new system automatically syncs, so this is just for logging
  }
}

export default StreamingContract;