// Simple, reliable cross-window stream synchronization
// Works across normal and incognito windows using multiple communication methods

export interface StreamData {
  id: string;
  title: string;
  category: string;
  topic: string;
  streamerAddress: string;
  isLive: boolean;
  viewerCount: number;
  startTime: number;
  moderators: string[];
  lastUpdate: number;
}

export interface ChatMessage {
  id: string;
  streamId: string;
  sender: string;
  senderAddress?: string;
  message: string;
  timestamp: number;
  type: 'message' | 'join' | 'leave' | 'system';
}

class SimpleStreamSync {
  private static instance: SimpleStreamSync;
  private listeners: Map<string, Function[]> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private windowId: string;

  private constructor() {
    this.windowId = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🔄 SimpleStreamSync initialized with window ID:', this.windowId);
    
    if (typeof window !== 'undefined') {
      this.startSync();
      
      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
    }
  }

  static getInstance(): SimpleStreamSync {
    if (!SimpleStreamSync.instance) {
      SimpleStreamSync.instance = new SimpleStreamSync();
    }
    return SimpleStreamSync.instance;
  }

  private startSync() {
    // Sync every 500ms for real-time feel
    this.syncInterval = setInterval(() => {
      this.syncStreams();
    }, 500);
    
    if (typeof window !== 'undefined') {
      // Listen for storage changes from other windows/tabs (normal windows only)
      window.addEventListener('storage', (e) => {
        if (e.key?.startsWith('pandapi_')) {
          console.log('📡 Storage change detected:', e.key);
          // Trigger immediate sync when storage changes
          setTimeout(() => this.syncStreams(), 100);
        }
      });
      
      // Listen for focus events to sync when user switches tabs
      window.addEventListener('focus', () => {
        console.log('👁️ Window focused, syncing streams');
        this.syncStreams();
      });
      
      // Set up BroadcastChannel for incognito/cross-origin communication
      try {
        const broadcastChannel = new BroadcastChannel('pandapi_streams');
        
        broadcastChannel.addEventListener('message', (event) => {
          console.log('📻 BroadcastChannel message received:', event.data);
          
          if (event.data.type === 'streamCreated') {
            // Store the stream data locally
            this.storeStreamFromBroadcast(event.data.stream);
            this.triggerListeners('streamCreated', event.data.stream);
            this.syncStreams();
          } else if (event.data.type === 'streamEnded') {
            // Remove the stream locally
            this.removeStreamFromBroadcast(event.data.streamId);
            this.triggerListeners('streamEnded', { streamId: event.data.streamId });
            this.syncStreams();
          } else if (event.data.type === 'syncRequest') {
            // Another window is requesting current streams
            const currentStreams = this.getAllStreamsFromStorage();
            if (currentStreams.length > 0) {
              broadcastChannel.postMessage({
                type: 'syncResponse',
                streams: currentStreams,
                windowId: this.windowId
              });
            }
          } else if (event.data.type === 'syncResponse') {
            // Received streams from another window
            if (event.data.windowId !== this.windowId) {
              event.data.streams.forEach((stream: StreamData) => {
                this.storeStreamFromBroadcast(stream);
              });
              this.syncStreams();
            }
          }
        });
        
        // Store reference for cleanup
        (window as any).pandapiChannel = broadcastChannel;
        
        // Request streams from other windows on startup (for incognito)
        setTimeout(() => {
          broadcastChannel.postMessage({
            type: 'syncRequest',
            windowId: this.windowId
          });
        }, 1000);
        
        console.log('📻 BroadcastChannel initialized for cross-window sync');
      } catch (error) {
        console.warn('BroadcastChannel not supported:', error);
      }
    }
    
    console.log('✅ Stream sync started with cross-window communication');
  }

  private syncStreams() {
    try {
      // Get all streams from all sources
      const allStreams = this.getAllStreamsFromStorage();
      
      // Trigger listeners if streams changed
      this.triggerListeners('streamsUpdated', allStreams);
    } catch (error) {
      console.error('Error syncing streams:', error);
    }
  }

  private getAllStreamsFromStorage(): StreamData[] {
    const streams: StreamData[] = [];
    const streamIds = new Set<string>();
    const currentTime = Date.now();
    
    try {
      // Method 1: Check global streams list (primary method)
      const globalStreams = localStorage.getItem('pandapi_global_streams');
      if (globalStreams) {
        try {
          const parsedStreams: StreamData[] = JSON.parse(globalStreams);
          parsedStreams.forEach(stream => {
            // Only include streams that are explicitly live and not too old (max 24 hours)
            const streamAge = currentTime - stream.startTime;
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (stream.isLive === true && stream.id && !streamIds.has(stream.id) && streamAge < maxAge) {
              // Verify the stream still exists in individual storage and is still live
              const individualStream = localStorage.getItem(`pandapi_stream_${stream.id}`);
              if (individualStream) {
                try {
                  const verifiedStream = JSON.parse(individualStream);
                  if (verifiedStream.isLive === true) {
                    streams.push(verifiedStream);
                    streamIds.add(stream.id);
                  } else {
                    // Stream is no longer live, remove from global list
                    console.log('🧹 Removing non-live stream from storage:', stream.id);
                  }
                } catch (e) {
                  console.warn('Invalid individual stream data for:', stream.id);
                  // Remove corrupted entry
                  localStorage.removeItem(`pandapi_stream_${stream.id}`);
                }
              } else {
                // Individual stream doesn't exist, it's stale
                console.log('🧹 Removing stale stream reference:', stream.id);
              }
            } else if (streamAge >= maxAge) {
              console.log('🧹 Removing old stream (>24h):', stream.id);
              localStorage.removeItem(`pandapi_stream_${stream.id}`);
            }
          });
        } catch (e) {
          console.warn('Invalid global streams data, falling back to scan');
        }
      }
      
      // Method 2: Scan for individual stream entries (fallback and verification)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pandapi_stream_')) {
          try {
            const streamData = localStorage.getItem(key);
            if (streamData) {
              const stream: StreamData = JSON.parse(streamData);
              const streamAge = currentTime - stream.startTime;
              const maxAge = 24 * 60 * 60 * 1000; // 24 hours
              
              // Only include if explicitly live, has ID, not duplicate, and not too old
              if (stream.isLive === true && stream.id && !streamIds.has(stream.id) && streamAge < maxAge) {
                streams.push(stream);
                streamIds.add(stream.id);
              } else if (!stream.isLive || streamAge >= maxAge) {
                // Clean up non-live or old streams
                console.log('🧹 Cleaning up non-live/old stream:', stream.id);
                localStorage.removeItem(key);
              }
            }
          } catch (error) {
            console.error('Error parsing stream:', key, error);
            // Clean up corrupted data
            localStorage.removeItem(key);
          }
        }
      }
      
      // Update global streams list to only include currently live streams
      const liveStreams = streams.filter(s => s.isLive === true);
      localStorage.setItem('pandapi_global_streams', JSON.stringify(liveStreams));
      
      if (liveStreams.length !== streams.length) {
        console.log('🧹 Updated global streams list, removed non-live streams');
      }
      
    } catch (error) {
      console.error('Error getting streams from storage:', error);
    }
    
    return streams.filter(s => s.isLive === true); // Final safety filter
  }

  // Create a new stream
  createStream(streamData: Omit<StreamData, 'id' | 'lastUpdate'>): string {
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stream: StreamData = {
      ...streamData,
      id: streamId,
      lastUpdate: Date.now()
    };
    
    console.log('🚀 Creating stream:', stream);
    
    // Store in multiple ways for reliability
    this.storeStream(stream);
    
    // Trigger listeners immediately
    this.triggerListeners('streamCreated', stream);
    
    // Broadcast to other windows (including incognito)
    this.broadcastStreamEvent('streamCreated', { stream });
    
    // Force immediate sync to all windows
    setTimeout(() => {
      const allStreams = this.getAllStreamsFromStorage();
      this.triggerListeners('streamsUpdated', allStreams);
    }, 50);
    
    // Also trigger a storage event manually for cross-window sync (normal windows)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'pandapi_global_streams',
        newValue: localStorage.getItem('pandapi_global_streams'),
        storageArea: localStorage
      }));
    }
    
    return streamId;
  }

  private storeStream(stream: StreamData) {
    try {
      // Store individual stream
      localStorage.setItem(`pandapi_stream_${stream.id}`, JSON.stringify(stream));
      
      // Update global streams list - get fresh data to avoid conflicts
      const existingGlobalStreams = localStorage.getItem('pandapi_global_streams');
      let globalStreams: StreamData[] = [];
      
      if (existingGlobalStreams) {
        try {
          globalStreams = JSON.parse(existingGlobalStreams);
        } catch (e) {
          console.warn('Invalid global streams data, resetting');
          globalStreams = [];
        }
      }
      
      // Remove any existing entry for this stream
      globalStreams = globalStreams.filter(s => s.id !== stream.id);
      
      // Add the new/updated stream only if it's live
      if (stream.isLive) {
        globalStreams.push(stream);
      }
      
      localStorage.setItem('pandapi_global_streams', JSON.stringify(globalStreams));
      
      console.log('✅ Stream stored successfully:', stream.id, 'Total active streams:', globalStreams.length);
    } catch (error) {
      console.error('Error storing stream:', error);
    }
  }

  // Update stream data
  updateStream(streamId: string, updates: Partial<StreamData>) {
    try {
      const existingData = localStorage.getItem(`pandapi_stream_${streamId}`);
      if (existingData) {
        const stream: StreamData = JSON.parse(existingData);
        const updatedStream = {
          ...stream,
          ...updates,
          lastUpdate: Date.now()
        };
        
        this.storeStream(updatedStream);
        this.triggerListeners('streamUpdated', updatedStream);
        
        console.log('📝 Stream updated:', streamId);
        return true;
      }
    } catch (error) {
      console.error('Error updating stream:', error);
    }
    return false;
  }

  // End a stream
  endStream(streamId: string) {
    try {
      // Mark as not live immediately
      this.updateStream(streamId, { isLive: false });
      
      // Remove from global list immediately
      const globalStreamsData = localStorage.getItem('pandapi_global_streams');
      if (globalStreamsData) {
        try {
          const globalStreams: StreamData[] = JSON.parse(globalStreamsData);
          const filteredStreams = globalStreams.filter(s => s.id !== streamId);
          localStorage.setItem('pandapi_global_streams', JSON.stringify(filteredStreams));
          console.log('🧹 Removed stream from global list:', streamId);
        } catch (e) {
          console.error('Error updating global streams on end:', e);
        }
      }
      
      // Clean up individual entry immediately (no delay)
      localStorage.removeItem(`pandapi_stream_${streamId}`);
      localStorage.removeItem(`pandapi_chat_${streamId}`);
      
      // Trigger events
      this.triggerListeners('streamEnded', { streamId });
      
      // Broadcast to other windows (including incognito)
      this.broadcastStreamEvent('streamEnded', { streamId });
      
      // Force immediate sync to all windows
      setTimeout(() => {
        const allStreams = this.getAllStreamsFromStorage();
        this.triggerListeners('streamsUpdated', allStreams);
      }, 50);
      
      // Trigger storage event for cross-window sync (normal windows)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'pandapi_global_streams',
          newValue: localStorage.getItem('pandapi_global_streams'),
          storageArea: localStorage
        }));
      }
      
      console.log('🛑 Stream ended and cleaned up:', streamId);
    } catch (error) {
      console.error('Error ending stream:', error);
    }
  }

  // Get all active streams
  getAllActiveStreams(): StreamData[] {
    return this.getAllStreamsFromStorage();
  }

  // Clear all streams (utility method)
  clearAllStreams(): void {
    try {
      if (typeof window !== 'undefined') {
        // Clear all pandapi data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('pandapi_')) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`🧹 Cleared ${keysToRemove.length} stream entries from localStorage`);
        
        // Broadcast clear event
        this.broadcastStreamEvent('streamsCleared', {});
        
        // Trigger listeners
        this.triggerListeners('streamsUpdated', []);
      }
    } catch (error) {
      console.error('Error clearing streams:', error);
    }
  }

  // Send chat message
  sendMessage(streamId: string, sender: string, message: string, senderAddress?: string): boolean {
    try {
      const chatMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        streamId,
        sender,
        senderAddress,
        message,
        timestamp: Date.now(),
        type: 'message'
      };

      // Get existing messages
      const existingMessages = this.getChatMessages(streamId);
      const updatedMessages = [...existingMessages, chatMessage].slice(-100); // Keep last 100
      
      // Store updated messages
      localStorage.setItem(`pandapi_chat_${streamId}`, JSON.stringify(updatedMessages));
      
      // Trigger listeners
      this.triggerListeners('newMessage', chatMessage);
      
      console.log('💬 Message sent:', chatMessage);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  // Get chat messages
  getChatMessages(streamId: string): ChatMessage[] {
    try {
      const messagesData = localStorage.getItem(`pandapi_chat_${streamId}`);
      return messagesData ? JSON.parse(messagesData) : [];
    } catch (error) {
      console.error('Error getting chat messages:', error);
      return [];
    }
  }

  // Join stream
  joinStream(streamId: string, viewerName: string, viewerAddress?: string) {
    // Update viewer count
    const stream = this.getAllActiveStreams().find(s => s.id === streamId);
    if (stream) {
      this.updateStream(streamId, { 
        viewerCount: stream.viewerCount + 1 
      });

      // Send join message
      const joinMessage: ChatMessage = {
        id: `join_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        streamId,
        sender: 'System',
        message: `${viewerName} joined the stream`,
        timestamp: Date.now(),
        type: 'join'
      };

      const existingMessages = this.getChatMessages(streamId);
      const updatedMessages = [...existingMessages, joinMessage].slice(-100);
      localStorage.setItem(`pandapi_chat_${streamId}`, JSON.stringify(updatedMessages));
      
      this.triggerListeners('viewerJoined', { streamId, viewerName, viewerAddress });
      this.triggerListeners('newMessage', joinMessage);
      
      console.log('👋 Viewer joined:', viewerName);
      return true;
    }
    return false;
  }

  // Leave stream
  leaveStream(streamId: string, viewerName: string) {
    const stream = this.getAllActiveStreams().find(s => s.id === streamId);
    if (stream) {
      this.updateStream(streamId, { 
        viewerCount: Math.max(0, stream.viewerCount - 1) 
      });

      // Send leave message
      const leaveMessage: ChatMessage = {
        id: `leave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        streamId,
        sender: 'System',
        message: `${viewerName} left the stream`,
        timestamp: Date.now(),
        type: 'leave'
      };

      const existingMessages = this.getChatMessages(streamId);
      const updatedMessages = [...existingMessages, leaveMessage].slice(-100);
      localStorage.setItem(`pandapi_chat_${streamId}`, JSON.stringify(updatedMessages));
      
      this.triggerListeners('viewerLeft', { streamId, viewerName });
      this.triggerListeners('newMessage', leaveMessage);
      
      console.log('👋 Viewer left:', viewerName);
      return true;
    }
    return false;
  }

  // Event listeners
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  private triggerListeners(event: string, data: any) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  // Helper methods for BroadcastChannel communication
  private storeStreamFromBroadcast(stream: StreamData) {
    try {
      // Only store if it's a live stream and not already stored
      if (stream.isLive && stream.id) {
        const existingStream = localStorage.getItem(`pandapi_stream_${stream.id}`);
        if (!existingStream) {
          console.log('📻 Storing stream from broadcast:', stream.id);
          this.storeStream(stream);
        }
      }
    } catch (error) {
      console.error('Error storing stream from broadcast:', error);
    }
  }

  private removeStreamFromBroadcast(streamId: string) {
    try {
      console.log('📻 Removing stream from broadcast:', streamId);
      localStorage.removeItem(`pandapi_stream_${streamId}`);
      localStorage.removeItem(`pandapi_chat_${streamId}`);
      
      // Update global streams list
      const globalStreamsData = localStorage.getItem('pandapi_global_streams');
      if (globalStreamsData) {
        const globalStreams: StreamData[] = JSON.parse(globalStreamsData);
        const filteredStreams = globalStreams.filter(s => s.id !== streamId);
        localStorage.setItem('pandapi_global_streams', JSON.stringify(filteredStreams));
      }
    } catch (error) {
      console.error('Error removing stream from broadcast:', error);
    }
  }

  private broadcastStreamEvent(type: string, data: any) {
    if (typeof window !== 'undefined' && (window as any).pandapiChannel) {
      try {
        (window as any).pandapiChannel.postMessage({
          type,
          ...data,
          windowId: this.windowId
        });
        console.log('📻 Broadcasted event:', type, data);
      } catch (error) {
        console.error('Error broadcasting event:', error);
      }
    }
  }

  private cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Clean up BroadcastChannel
    if (typeof window !== 'undefined' && (window as any).pandapiChannel) {
      try {
        (window as any).pandapiChannel.close();
        delete (window as any).pandapiChannel;
      } catch (error) {
        console.error('Error closing BroadcastChannel:', error);
      }
    }
    
    console.log('🧹 SimpleStreamSync cleaned up');
  }
}

export default SimpleStreamSync;
