"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { 
  StopIcon, 
  EyeIcon, 
  ClockIcon,
  PaperAirplaneIcon
} from "@heroicons/react/24/outline";
import type { NextPage } from "next";
import StreamingContract, { ChatMessage } from "../../lib/streamingContract";

interface StreamConfig {
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

interface ModeratorStats {
  [key: string]: {
    messagesFlagged: number;
    usersBanned: number;
    spamBlocked: number;
    engagementBoosts: number;
    sentimentScore: number;
  };
}

const LiveStreamPage: NextPage = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Stream configuration
  const [streamConfig, setStreamConfig] = useState<StreamConfig | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamId, setStreamId] = useState<string>("");
  
  // Blockchain communication
  const [streamingContract, setStreamingContract] = useState<StreamingContract | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  // Moderator stats - all start at 0
  const [moderatorStats, setModeratorStats] = useState<ModeratorStats>({});
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  // Initialize streaming contract on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setStreamingContract(StreamingContract.getInstance());
    }
  }, []);

  // Load stream configuration
  useEffect(() => {
    if (!streamingContract) return;
    
    const savedConfig = localStorage.getItem('currentStream');
    if (savedConfig) {
      const config: StreamConfig = JSON.parse(savedConfig);
      setStreamConfig(config);
      
      // Create stream in blockchain system
      const streamData = {
        title: config.title,
        category: config.category,
        topic: config.topic,
        streamerAddress: config.walletAddress,
        isLive: true,
        startTime: config.startTime,
        moderators: config.moderators
      };
      
      console.log('🚀 Creating stream with data:', streamData);
      const newStreamId = streamingContract.createStream(streamData);
      console.log('✅ Stream created with ID:', newStreamId);
      
      setStreamId(newStreamId);
      
      // Force an additional sync after a short delay to ensure visibility
      setTimeout(() => {
        console.log('🔄 Forcing additional sync for stream visibility');
        const allStreams = streamingContract.getAllActiveStreams();
        console.log('📺 Current active streams after creation:', allStreams);
      }, 1000);
      
      // Initialize moderator stats - all start at 0
      const initialStats: ModeratorStats = {};
      config.moderatorData.forEach(mod => {
        initialStats[mod.id] = {
          messagesFlagged: 0,
          usersBanned: 0,
          spamBlocked: 0,
          engagementBoosts: 0,
          sentimentScore: 0
        };
      });
      setModeratorStats(initialStats);
      
      // Start streaming
      startStreaming();
    } else {
      // No stream config, redirect back
      router.push('/create');
    }
  }, [streamingContract]);

  // Timer for stream duration and billing
  useEffect(() => {
    if (!isStreaming || !streamConfig) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - streamConfig.startTime) / 1000);
      setStreamDuration(elapsed);
      
      // Calculate cost (minimum 1 hour billing)
      const hours = Math.max(1, Math.ceil(elapsed / 3600));
      const hourlyRate = streamConfig.moderatorData.reduce((sum, mod) => sum + mod.pricePerHour, 0);
      setTotalCost(hours * hourlyRate);
    }, 1000);

    return () => clearInterval(timer);
  }, [isStreaming, streamConfig]);

  // Set up real-time event listeners
  useEffect(() => {
    if (!streamId || !streamingContract) return;

    const handleNewMessage = (message: ChatMessage) => {
      if (message.streamId === streamId) {
        setChatMessages(prev => [...prev, message]);
      }
    };

    const handleViewerJoined = (data: { streamId: string; viewerName: string }) => {
      if (data.streamId === streamId) {
        const stream = streamingContract.getStream(streamId);
        if (stream) {
          setViewerCount(stream.viewerCount);
        }
      }
    };

    const handleViewerLeft = (data: { streamId: string; viewerName: string }) => {
      if (data.streamId === streamId) {
        const stream = streamingContract.getStream(streamId);
        if (stream) {
          setViewerCount(stream.viewerCount);
        }
      }
    };

    const handleStreamsUpdated = (streams: any[]) => {
      const currentStream = streams.find(s => s.id === streamId);
      if (currentStream) {
        setViewerCount(currentStream.viewerCount);
      }
    };

    // Subscribe to events
    streamingContract.on('newMessage', handleNewMessage);
    streamingContract.on('viewerJoined', handleViewerJoined);
    streamingContract.on('viewerLeft', handleViewerLeft);
    streamingContract.on('streamsUpdated', handleStreamsUpdated);

    // Load existing messages
    const existingMessages = streamingContract.getChatMessages(streamId);
    setChatMessages(existingMessages);

    return () => {
      streamingContract.off('newMessage', handleNewMessage);
      streamingContract.off('viewerJoined', handleViewerJoined);
      streamingContract.off('viewerLeft', handleViewerLeft);
      streamingContract.off('streamsUpdated', handleStreamsUpdated);
    };
  }, [streamId, streamingContract]);

  const startStreaming = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsStreaming(true);
      setViewerCount(0); // Start with 0 viewers
    } catch (error) {
      console.error('Failed to start stream:', error);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !streamId || !streamingContract || !address) return;

    // Streamer is identified by their wallet address matching the stream's streamer address
    const senderName = streamConfig?.walletAddress === address ? 'Streamer' : `Viewer ${address.slice(-4)}`;
    
    const success = streamingContract.sendMessage(
      streamId,
      senderName,
      newMessage.trim(),
      address
    );

    if (success) {
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const endStream = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    // End stream in blockchain system
    if (streamId && streamingContract) {
      streamingContract.endStream(streamId);
    }
    
    setIsStreaming(false);
    setShowPaymentModal(true);
  };

  const handlePayment = () => {
    // In a real implementation, this would process the AVAX payment
    console.log(`Processing payment of ${totalCost.toFixed(4)} AVAX`);
    localStorage.removeItem('currentStream');
    router.push('/');
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!streamConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading stream configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">{streamConfig.title}</h1>
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                LIVE
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span>{streamConfig.category}</span>
              <span>•</span>
              <span>{streamConfig.topic}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-700">
              <ClockIcon className="h-5 w-5" />
              <span className="font-mono">{formatTime(streamDuration)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <EyeIcon className="h-5 w-5" />
              <span>{viewerCount} viewers</span>
            </div>
            <button
              onClick={endStream}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
            >
              <StopIcon className="h-5 w-5" />
              End Stream
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Video */}
          <div className="lg:col-span-3">
            <div className="bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Live Chat */}
          <div className="bg-white border border-gray-200 rounded-lg flex flex-col h-[600px]">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Live Chat</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <EyeIcon className="h-4 w-4" />
                  <span>{viewerCount} viewers</span>
                </div>
              </div>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-sm">Chat will appear here when viewers join</p>
                  <p className="text-xs mt-1">No messages yet</p>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div key={message.id} className={`${
                    message.type === 'system' || message.type === 'join' || message.type === 'leave'
                      ? 'text-center text-gray-500 text-sm italic'
                      : ''
                  }`}>
                    {message.type === 'message' ? (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold text-sm ${
                            message.sender === 'Streamer' ? 'text-purple-600' : 'text-blue-600'
                          }`}>
                            {message.sender}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-900 text-sm">{message.message}</p>
                      </div>
                    ) : (
                      <p>{message.message}</p>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Say something..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                />
                <button 
                  onClick={sendMessage}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stream Stats and Moderators - Bottom Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stream Stats */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Stream Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{formatTime(streamDuration)}</div>
                <div className="text-sm text-gray-600">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{viewerCount}</div>
                <div className="text-sm text-gray-600">Viewers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{streamConfig.moderatorData.reduce((sum, mod) => sum + mod.pricePerHour, 0).toFixed(4)}</div>
                <div className="text-sm text-gray-600">AVAX/hr</div>
              </div>
            </div>
          </div>

          {/* Active Moderators */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">AI Moderators</h3>
            <div className="grid grid-cols-1 gap-3">
              {streamConfig.moderatorData.map((moderator) => {
                const stats = moderatorStats[moderator.id];
                return (
                  <div key={moderator.id} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{moderator.name}</h4>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="text-xs text-gray-600 grid grid-cols-2 gap-2">
                      {moderator.id === 'toxicity-guardian' && (
                        <>
                          <div>Flagged: <span className="text-red-600 font-medium">{stats?.messagesFlagged || 0}</span></div>
                          <div>Banned: <span className="text-red-600 font-medium">{stats?.usersBanned || 0}</span></div>
                        </>
                      )}
                      {moderator.id === 'spam-eliminator' && (
                        <div className="col-span-2">Spam Blocked: <span className="text-yellow-600 font-medium">{stats?.spamBlocked || 0}</span></div>
                      )}
                      {moderator.id === 'engagement-booster' && (
                        <div className="col-span-2">Boosts: <span className="text-blue-600 font-medium">{stats?.engagementBoosts || 0}</span></div>
                      )}
                      {moderator.id === 'sentiment-analyzer' && (
                        <div className="col-span-2">Sentiment: <span className="text-green-600 font-medium">{Math.round(stats?.sentimentScore || 0)}%</span></div>
                      )}
                      {moderator.id === 'content-curator' && (
                        <div className="col-span-2">Reviewed: <span className="text-purple-600 font-medium">{(stats?.messagesFlagged || 0) * 2}</span></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Stream Completed</h2>
            
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Stream Summary</h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-mono">{formatTime(streamDuration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peak Viewers:</span>
                    <span>{viewerCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Moderators Used:</span>
                    <span>{streamConfig.moderatorData.length}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Billing Details</h3>
                <div className="text-sm text-gray-600 space-y-2">
                  {streamConfig.moderatorData.map(mod => (
                    <div key={mod.id} className="flex justify-between">
                      <span>{mod.name}</span>
                      <span>{mod.pricePerHour.toFixed(4)} AVAX/hr</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-3">
                    <div className="flex justify-between font-semibold text-gray-900">
                      <span>Total Cost:</span>
                      <span>{totalCost.toFixed(4)} AVAX</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      *Minimum 1 hour billing applies
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/')}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 font-medium"
              >
                Pay {totalCost.toFixed(4)} AVAX
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveStreamPage;