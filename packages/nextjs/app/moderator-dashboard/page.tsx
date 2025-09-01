"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import TwitchOAuthService, { TwitchUser, TwitchStream, TwitchChatMessage, TwitchChatService } from '~~/lib/twitchOAuth';
import { Header } from "~~/components/Header";
import StreamingContract, { ChatMessage as PlatformChatMessage } from '~~/lib/streamingContract';

interface ModeratorConfig {
  id: string;
  platform: string;
  moderatorType: string;
  mcp: string | null;
  walletAddress: string;
  createdAt: number;
  platformData: {
    twitchChannel: string | null;
    youtubeChannel: string | null;
  };
}

const ModeratorDashboard = () => {
  const router = useRouter();
  const { address: walletAddress } = useAccount();
  const [twitchUser, setTwitchUser] = useState<TwitchUser | null>(null);
  const [streamData, setStreamData] = useState<TwitchStream | null>(null);
  const [chatMessages, setChatMessages] = useState<TwitchChatMessage[]>([]);
  const [platformChatMessages, setPlatformChatMessages] = useState<PlatformChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'offline'>('connecting');
  const [selectedModerators, setSelectedModerators] = useState<ModeratorConfig[]>([]);
  const [streamStartTime, setStreamStartTime] = useState<Date | null>(null);
  const [streamDuration, setStreamDuration] = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [streamingContract, setStreamingContract] = useState<StreamingContract | null>(null);
  const [chatStats, setChatStats] = useState({
    totalMessages: 0,
    uniqueUsers: new Set<string>(),
    messagesPerMinute: 0,
    toxicMessages: 0,
    spamMessages: 0
  });
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatServiceRef = useRef<TwitchChatService | null>(null);
  const twitchService = TwitchOAuthService.getInstance();

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, platformChatMessages]);

  // Initialize streaming contract for platform chat
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const contract = StreamingContract.getInstance();
      setStreamingContract(contract);
      
      // Function to find and set current stream
      const findCurrentStream = () => {
        const currentStreamConfig = localStorage.getItem('currentStream');
        console.log('🔍 Current stream config:', currentStreamConfig);
        console.log('🔍 Current wallet address:', walletAddress);
        
        if (currentStreamConfig && walletAddress) {
          const streamConfig = JSON.parse(currentStreamConfig);
          console.log('🔍 Looking for stream with wallet:', streamConfig.walletAddress);
          
          // Find the active stream ID from our platform
          const activeStreams = contract.getAllActiveStreams();
          console.log('🔍 Active streams found:', activeStreams.length);
          console.log('🔍 Active streams details:', activeStreams);
          
          const currentStream = activeStreams.find(s => {
            const match1 = s.streamerAddress?.toLowerCase() === streamConfig.walletAddress?.toLowerCase();
            const match2 = s.streamerAddress?.toLowerCase() === walletAddress?.toLowerCase();
            console.log(`🔍 Checking stream ${s.id}: ${s.streamerAddress} vs ${streamConfig.walletAddress} = ${match1}`);
            console.log(`🔍 Checking stream ${s.id}: ${s.streamerAddress} vs ${walletAddress} = ${match2}`);
            return match1 || match2;
          });
          
          if (currentStream) {
            console.log('✅ Found current stream:', currentStream.id);
            setCurrentStreamId(currentStream.id);
            // Load existing chat messages
            const existingMessages = contract.getChatMessages(currentStream.id);
            console.log('💬 Loaded existing messages:', existingMessages.length);
            setPlatformChatMessages(existingMessages);
          } else {
            console.log('❌ No matching stream found');
            console.log('❌ Available streams:', activeStreams.map(s => ({ id: s.id, streamer: s.streamerAddress })));
            // Try again in a few seconds in case stream is still being created
            setTimeout(findCurrentStream, 3000);
          }
        } else {
          console.log('❌ Missing currentStreamConfig or walletAddress');
          console.log('❌ currentStreamConfig:', !!currentStreamConfig);
          console.log('❌ walletAddress:', !!walletAddress);
        }
      };
      
      // Initial attempt
      findCurrentStream();
      
      // Also listen for new streams being created
      const handleStreamCreated = (stream: any) => {
        console.log('🆕 New stream created, checking if it matches current user');
        findCurrentStream();
      };
      
      contract.on('streamCreated', handleStreamCreated);
      
      return () => {
        contract.off('streamCreated', handleStreamCreated);
      };
    }
  }, [walletAddress]);

  // Listen for platform chat messages
  useEffect(() => {
    if (!streamingContract || !currentStreamId) return;

    const handleNewMessage = (message: PlatformChatMessage) => {
      if (message.streamId === currentStreamId) {
        setPlatformChatMessages(prev => [...prev, message]);
        
        // Update chat stats
        setChatStats(prev => ({
          ...prev,
          totalMessages: prev.totalMessages + 1,
          uniqueUsers: new Set([...prev.uniqueUsers, message.sender])
        }));
      }
    };

    streamingContract.on('newMessage', handleNewMessage);

    return () => {
      streamingContract.off('newMessage', handleNewMessage);
    };
  }, [streamingContract, currentStreamId]);

  // Load selected moderators from current stream configuration
  useEffect(() => {
    const loadModerators = () => {
      try {
        const currentStreamConfig = localStorage.getItem('currentStream');
        if (currentStreamConfig) {
          const streamConfig = JSON.parse(currentStreamConfig);
          if (streamConfig.moderatorData && streamConfig.walletAddress?.toLowerCase() === walletAddress?.toLowerCase()) {
            // Convert moderator data to the expected format
            const moderatorConfigs: ModeratorConfig[] = streamConfig.moderatorData.map((mod: any) => ({
              id: mod.id,
              platform: 'pandapi',
              moderatorType: mod.name,
              mcp: mod.type,
              walletAddress: streamConfig.walletAddress,
              createdAt: streamConfig.startTime,
              platformData: {
                twitchChannel: null,
                youtubeChannel: null
              }
            }));
            setSelectedModerators(moderatorConfigs);
            console.log('📋 Loaded moderators from current stream:', moderatorConfigs);
          }
        }
      } catch (error) {
        console.error('❌ Error loading moderators:', error);
      }
    };

    if (walletAddress) {
      loadModerators();
    }
  }, [walletAddress]);

  // Stream timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (streamData && streamStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - streamStartTime.getTime()) / 1000);
        setStreamDuration(duration);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [streamData, streamStartTime]);

  // Refresh stream data
  const refreshStreamData = useCallback(async () => {
    if (!twitchUser) return;
    
    console.log('🔄 Refreshing stream data...');
    const previousStreamData = streamData;
    const stream = await twitchService.getUserStream(twitchUser.id);
    console.log('📊 Refresh - Stream API response:', stream);
    setStreamData(stream);
    
    if (stream && !chatServiceRef.current) {
      // Stream went live, connect to chat
      console.log('🟢 Stream went LIVE! Connecting to chat...');
      setConnectionStatus('connected');
      setStreamStartTime(new Date(stream.started_at));
      chatServiceRef.current = new TwitchChatService();
      chatServiceRef.current.connect(twitchUser.login, handleNewChatMessage);
    } else if (!stream && chatServiceRef.current) {
      // Stream went offline, disconnect chat and show payment modal
      console.log('🔴 Stream went OFFLINE! Disconnecting chat...');
      setConnectionStatus('offline');
      chatServiceRef.current.disconnect();
      chatServiceRef.current = null;
      
      // If stream was previously live, show payment modal
      if (previousStreamData && streamDuration > 60) { // Only if streamed for more than 1 minute
        console.log('💰 Stream ended, showing payment modal...');
        setShowPaymentModal(true);
      }
      
      setStreamStartTime(null);
      setStreamDuration(0);
    }
  }, [twitchUser, streamData, streamDuration, twitchService]);

  // Auto-refresh stream status every 30 seconds
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    
    if (twitchUser && !isLoading) {
      refreshInterval = setInterval(() => {
        console.log('🔄 Auto-refreshing stream status...');
        refreshStreamData();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [twitchUser, isLoading, refreshStreamData]);

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        console.log('🚀 Initializing Moderator Dashboard...');
        
        // Check if user is authenticated
        if (!twitchService.isAuthenticated()) {
          console.log('❌ User not authenticated, redirecting...');
          router.push('/create-moderators');
          return;
        }

        // Get user info
        const user = await twitchService.getAuthenticatedUser();
        if (!user) {
          throw new Error('Failed to get user information');
        }

        console.log('✅ User authenticated:', user.display_name);
        setTwitchUser(user);

        // Get stream info with detailed debugging
        console.log('🔍 Checking stream status for user ID:', user.id);
        const stream = await twitchService.getUserStream(user.id);
        console.log('📊 Stream API response:', stream);
        
        setStreamData(stream);

        if (stream) {
          console.log('📺 Stream is LIVE! Title:', stream.title);
          console.log('👥 Viewers:', stream.viewer_count);
          console.log('🎮 Game:', stream.game_name);
          console.log('🕐 Started at:', stream.started_at);
          
          setConnectionStatus('connected');
          setStreamStartTime(new Date(stream.started_at));
          
          // Connect to real Twitch chat
          chatServiceRef.current = new TwitchChatService();
          chatServiceRef.current.connect(user.login, handleNewChatMessage);
        } else {
          console.log('📺 Stream is OFFLINE - No active stream found');
          console.log('💡 Make sure you are actually streaming on Twitch');
          setConnectionStatus('offline');
          setStreamStartTime(null);
        }

        setIsLoading(false);

      } catch (error) {
        console.error('❌ Dashboard initialization error:', error);
        setConnectionStatus('error');
        setIsLoading(false);
      }
    };

    initializeDashboard();

    // Cleanup on unmount
    return () => {
      if (chatServiceRef.current) {
        chatServiceRef.current.disconnect();
      }
    };
  }, [router, twitchService]);

  // Handle new chat messages
  const handleNewChatMessage = useCallback((message: TwitchChatMessage) => {
    console.log('💬 New chat message:', message.user_name, ':', message.message);
    
    setChatMessages(prev => {
      const newMessages = [...prev, message].slice(-200); // Keep last 200 messages
      return newMessages;
    });

    // Update chat stats
    setChatStats(prev => {
      const newUniqueUsers = new Set(prev.uniqueUsers);
      newUniqueUsers.add(message.user_login);
      
      // Simple toxicity detection (basic keywords)
      const toxicKeywords = ['hate', 'toxic', 'stupid', 'idiot', 'kill', 'die'];
      const isToxic = toxicKeywords.some(keyword => 
        message.message.toLowerCase().includes(keyword)
      );
      
      // Simple spam detection (repeated characters or caps)
      const isSpam = /(.)\1{4,}/.test(message.message) || 
                     message.message === message.message.toUpperCase() && message.message.length > 10;

      return {
        totalMessages: prev.totalMessages + 1,
        uniqueUsers: newUniqueUsers,
        messagesPerMinute: prev.messagesPerMinute, // Would need time-based calculation
        toxicMessages: prev.toxicMessages + (isToxic ? 1 : 0),
        spamMessages: prev.spamMessages + (isSpam ? 1 : 0)
      };
    });
  }, []);

  // Logout
  const handleLogout = () => {
    twitchService.logout();
    if (chatServiceRef.current) {
      chatServiceRef.current.disconnect();
    }
    router.push('/create-moderators');
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const calculatePayment = () => {
    // Calculate payment based on stream duration and moderators used
    const baseRatePerMinute = 0.001; // 0.001 AVAX per minute
    const moderatorMultiplier = selectedModerators.length || 1;
    const minutes = Math.ceil(streamDuration / 60);
    return (baseRatePerMinute * minutes * moderatorMultiplier).toFixed(4);
  };

  const handlePayment = async () => {
    const amount = calculatePayment();
    console.log(`💰 Processing payment of ${amount} AVAX for ${formatDuration(streamDuration)} of streaming`);
    
    // Here you would integrate with the smart contract
    // For now, just simulate payment
    alert(`Payment of ${amount} AVAX processed successfully!`);
    setShowPaymentModal(false);
  };

  const getBadgeEmoji = (badges: { [key: string]: string }) => {
    if (badges.broadcaster) return '📺';
    if (badges.moderator) return '⚔️';
    if (badges.subscriber) return '⭐';
    if (badges.vip) return '💎';
    if (badges.premium) return '👑';
    return '';
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'offline': return 'text-gray-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live & Connected';
      case 'connecting': return 'Connecting...';
      case 'offline': return 'Stream Offline';
      case 'error': return 'Connection Error';
      default: return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-white">Loading Dashboard...</h2>
            <p className="text-gray-400">Connecting to Twitch API...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Top Bar */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <img 
                  src={twitchUser?.profile_image_url} 
                  alt={twitchUser?.display_name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h1 className="text-xl font-bold">{twitchUser?.display_name}</h1>
                  <p className="text-sm text-gray-400">@{twitchUser?.login}</p>
                </div>
              </div>
              
              <div className={`flex items-center space-x-2 ${getConnectionStatusColor()}`}>
                <div className="w-3 h-3 rounded-full bg-current animate-pulse"></div>
                <span className="text-sm font-medium">{getConnectionStatusText()}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshStreamData}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                🔄 Refresh
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-screen">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Stream Info */}
            {streamData ? (
              <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold">{streamData.title}</h2>
                  <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center">
                    🔴 LIVE - {formatDuration(streamDuration)}
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm text-gray-400">
                  <span>🎮 {streamData.game_name}</span>
                  <span>👥 {streamData.viewer_count.toLocaleString()} viewers</span>
                  <span>🕐 Started {new Date(streamData.started_at).toLocaleTimeString()}</span>
                  <span>🌐 {streamData.language.toUpperCase()}</span>
                  <span>💰 Current cost: {calculatePayment()} AVAX</span>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-400">Stream Offline</h2>
                <p className="text-sm text-gray-500">Start streaming on Twitch to see live data and begin moderation</p>
                <p className="text-xs text-gray-600 mt-1">💡 Make sure you're actually live on Twitch, then click Refresh</p>
              </div>
            )}

            {/* Stats Dashboard */}
            <div className="flex-1 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Total Messages</h3>
                  <p className="text-2xl font-bold text-white">{chatStats.totalMessages}</p>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Unique Chatters</h3>
                  <p className="text-2xl font-bold text-white">{chatStats.uniqueUsers.size}</p>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Toxic Messages</h3>
                  <p className="text-2xl font-bold text-red-400">{chatStats.toxicMessages}</p>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Spam Messages</h3>
                  <p className="text-2xl font-bold text-yellow-400">{chatStats.spamMessages}</p>
                </div>
              </div>

              {/* AI Moderation Status - Dynamic */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">🤖 Active AI Moderators</h3>
                {selectedModerators.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedModerators.map((moderator, index) => {
                      const colors = [
                        { bg: 'bg-green-900', border: 'border-green-700', dot: 'bg-green-500', text: 'text-green-400' },
                        { bg: 'bg-blue-900', border: 'border-blue-700', dot: 'bg-blue-500', text: 'text-blue-400' },
                        { bg: 'bg-purple-900', border: 'border-purple-700', dot: 'bg-purple-500', text: 'text-purple-400' },
                        { bg: 'bg-yellow-900', border: 'border-yellow-700', dot: 'bg-yellow-500', text: 'text-yellow-400' },
                        { bg: 'bg-red-900', border: 'border-red-700', dot: 'bg-red-500', text: 'text-red-400' }
                      ];
                      const color = colors[index % colors.length];
                      
                      return (
                        <div key={moderator.id} className={`${color.bg} bg-opacity-50 border ${color.border} rounded-lg p-4`}>
                          <div className="flex items-center space-x-2 mb-2">
                            <div className={`w-3 h-3 ${color.dot} rounded-full animate-pulse`}></div>
                            <span className="font-semibold capitalize">{moderator.moderatorType.replace(/([A-Z])/g, ' $1').trim()}</span>
                          </div>
                          <p className="text-sm text-gray-300">
                            {moderator.mcp ? `MCP: ${moderator.mcp}` : 'General moderation'}
                          </p>
                          <p className={`text-xs ${color.text} mt-1`}>
                            ✅ Active - {streamData ? 'Monitoring live stream' : 'Waiting for stream'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Created: {new Date(moderator.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-3">🤖</div>
                    <p className="text-sm">No moderators configured</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Go to <span className="text-purple-400">Create Moderators</span> to set up AI moderation
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Chat Sidebar */}
          <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
              <h3 className="text-white font-semibold">Live Chat</h3>
              <p className="text-xs text-gray-400">
                Platform: {platformChatMessages.length} | Twitch: {chatMessages.length}
              </p>
              <p className="text-xs text-gray-500">
                Stream ID: {currentStreamId ? currentStreamId.slice(-8) : 'Not found'} | 
                Contract: {streamingContract ? '✅' : '❌'}
              </p>
            </div>

            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-2"
            >
              {chatMessages.length === 0 && platformChatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="text-sm">
                    {connectionStatus === 'connected' || currentStreamId
                      ? 'Waiting for chat messages...' 
                      : 'Chat will appear when stream is live'
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Platform Chat Messages */}
                  {platformChatMessages.map((message) => (
                    <div key={`platform-${message.id}`} className="group hover:bg-gray-700 hover:bg-opacity-50 p-2 rounded transition-colors border-l-2 border-purple-500">
                      <div className="flex items-start space-x-2">
                        <div className="flex-shrink-0 text-xs text-purple-400 mt-1">
                          {formatTimestamp(message.timestamp)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1 mb-1">
                            <span className="text-xs">🎮</span>
                            <span className="font-semibold text-sm truncate text-purple-400">
                              {message.sender}
                            </span>
                            <span className="text-xs text-purple-300 bg-purple-900 px-1 rounded">
                              Platform
                            </span>
                          </div>
                          <div className="text-sm text-gray-200 break-words">
                            {message.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Twitch Chat Messages */}
                  {chatMessages.map((message) => (
                    <div key={`twitch-${message.id}`} className="group hover:bg-gray-700 hover:bg-opacity-50 p-2 rounded transition-colors border-l-2 border-blue-500">
                      <div className="flex items-start space-x-2">
                        <div className="flex-shrink-0 text-xs text-blue-400 mt-1">
                          {formatTimestamp(message.timestamp)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1 mb-1">
                            <span className="text-xs">{getBadgeEmoji(message.badges)}</span>
                            <span 
                              className="font-semibold text-sm truncate"
                              style={{ color: message.color || '#ffffff' }}
                            >
                              {message.user_name}
                            </span>
                            <span className="text-xs text-blue-300 bg-blue-900 px-1 rounded">
                              Twitch
                            </span>
                          </div>
                          <div className="text-sm text-gray-200 break-words">
                            {message.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 border border-gray-700">
              <div className="text-center">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-xl font-bold text-white mb-4">Stream Session Complete</h3>
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="text-sm text-gray-400 mb-2">Session Details:</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="text-white">{formatDuration(streamDuration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Moderators Used:</span>
                      <span className="text-white">{selectedModerators.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Messages Processed:</span>
                      <span className="text-white">{chatStats.totalMessages}</span>
                    </div>
                    <div className="border-t border-gray-600 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span>Total Cost:</span>
                        <span className="text-green-400">{calculatePayment()} AVAX</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Skip Payment
                  </button>
                  <button
                    onClick={handlePayment}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    Pay {calculatePayment()} AVAX
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Payment supports the AI moderation service and platform development
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ModeratorDashboard;
