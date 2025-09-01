"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { TwitchApi } from '~~/lib/twitchApi';
import { Header } from "~~/components/Header";

interface TwitchChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  badges: string[];
  color?: string;
  isSubscriber: boolean;
  isModerator: boolean;
}

interface TwitchStreamData {
  id: string;
  title: string;
  game_name: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
  user_name: string;
  user_login: string;
}

const TwitchDashboard = () => {
  const router = useRouter();
  const { address: walletAddress } = useAccount();
  const [twitchUsername, setTwitchUsername] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [streamData, setStreamData] = useState<TwitchStreamData | null>(null);
  const [chatMessages, setChatMessages] = useState<TwitchChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [chatInput, setChatInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const twitchApi = new TwitchApi();

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Poll for new chat messages when connected
  useEffect(() => {
    if (!isConnected || !twitchUsername) return;

    const interval = setInterval(async () => {
      try {
        const newMessages = await twitchApi.getLiveChatMessages(twitchUsername);
        setChatMessages(prev => {
          // Merge new messages, avoiding duplicates
          const existingIds = new Set(prev.map(msg => msg.id));
          const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));
          
          // Keep only last 150 messages for performance
          const allMessages = [...prev, ...uniqueNewMessages].slice(-150);
          return allMessages;
        });
      } catch (error) {
        console.error('Error fetching chat messages:', error);
      }
    }, 1500); // Poll every 1.5 seconds for more responsive chat

    return () => clearInterval(interval);
  }, [isConnected, twitchUsername]);

  const handleConnect = async () => {
    if (!twitchUsername.trim()) {
      setError('Please enter a Twitch username');
      return;
    }

    setIsLoading(true);
    setConnectionStatus('connecting');
    setError('');

    try {
      console.log('🔗 Connecting to Twitch API for user:', twitchUsername);
      
      // Validate channel exists
      const isValid = await twitchApi.validateChannel(twitchUsername);
      if (!isValid) {
        throw new Error(`Twitch channel "${twitchUsername}" not found`);
      }

      // Get user info
      const userInfo = await twitchApi.getUserInfo(twitchUsername);
      console.log('👤 User info:', userInfo);

      // Get stream data
      const stream = await twitchApi.getStreamInfo(twitchUsername);
      console.log('📺 Stream info:', stream);
      setStreamData(stream);

      // Get initial chat messages
      const initialMessages = await twitchApi.getLiveChatMessages(twitchUsername);
      console.log('💬 Initial chat messages:', initialMessages.length);
      setChatMessages(initialMessages);

      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Store connection in localStorage
      localStorage.setItem('twitchConnection', JSON.stringify({
        username: twitchUsername,
        walletAddress,
        connectedAt: Date.now()
      }));

    } catch (error) {
      console.error('❌ Error connecting to Twitch:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to Twitch');
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setStreamData(null);
    setChatMessages([]);
    setTwitchUsername('');
    setConnectionStatus('disconnected');
    localStorage.removeItem('twitchConnection');
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !isConnected) return;

    // In a real implementation, this would send via Twitch API
    // For now, we'll add it as a local message
    const newMessage: TwitchChatMessage = {
      id: `local_${Date.now()}`,
      username: `Moderator_${walletAddress?.slice(-6)}` || 'PandaPi_Mod',
      message: chatInput,
      timestamp: Date.now(),
      badges: ['moderator', 'pandapi'],
      color: '#9146FF',
      isSubscriber: false,
      isModerator: true
    };

    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');
  };

  // Load saved connection on mount
  useEffect(() => {
    const savedConnection = localStorage.getItem('twitchConnection');
    if (savedConnection) {
      try {
        const { username } = JSON.parse(savedConnection);
        setTwitchUsername(username);
        // Auto-reconnect after a short delay
        setTimeout(() => {
          handleConnect();
        }, 1000);
      } catch (error) {
        console.error('Error loading saved connection:', error);
      }
    }
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getBadgeEmoji = (badges: string[]) => {
    if (badges.includes('broadcaster')) return '📺';
    if (badges.includes('moderator')) return '⚔️';
    if (badges.includes('pandapi')) return '🐼';
    if (badges.includes('subscriber')) return '⭐';
    if (badges.includes('vip')) return '💎';
    return '';
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-900 text-white">
        {!isConnected ? (
          // Connection Interface - Twitch Purple Theme
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-black">
            <div className="max-w-md w-full mx-4">
              <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">🎮</div>
                  <h1 className="text-3xl font-bold text-white mb-2">Twitch Dashboard</h1>
                  <p className="text-gray-400">Connect to monitor your Twitch stream with AI moderation</p>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Twitch Channel Username
                  </label>
                  <input
                    type="text"
                    value={twitchUsername}
                    onChange={(e) => setTwitchUsername(e.target.value.toLowerCase())}
                    placeholder="Enter Twitch username (e.g. ninja, shroud)"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                    onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-200 rounded-lg text-sm">
                    ❌ {error}
                  </div>
                )}

                <button
                  onClick={handleConnect}
                  disabled={isLoading || !twitchUsername.trim()}
                  className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Connecting to Twitch...
                    </>
                  ) : (
                    '🔗 Connect to Twitch'
                  )}
                </button>

                <div className="mt-6 text-center text-sm text-gray-400">
                  <p>✅ Real Twitch API Integration</p>
                  <p>🤖 AI-Powered Chat Moderation</p>
                  <p>📊 Live Stream Analytics</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Main Dashboard - Twitch-like Layout
          <div className="flex h-screen bg-gray-900">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              {/* Top Bar */}
              <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-bold text-white">🎮 {twitchUsername}</h1>
                    <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
                      <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                      <span className="text-sm font-medium">{getStatusText()}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Stream Info */}
              {streamData && (
                <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-1">{streamData.title}</h2>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className="flex items-center">
                          🎮 {streamData.game_name}
                        </span>
                        <span className="flex items-center">
                          👥 {streamData.viewer_count.toLocaleString()} viewers
                        </span>
                        <span className="flex items-center">
                          🔴 Live
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stream Player */}
              <div className="flex-1 bg-black">
                {streamData ? (
                  <div className="w-full h-full">
                    <iframe
                      src={`https://player.twitch.tv/?channel=${twitchUsername}&parent=localhost&autoplay=false&muted=false`}
                      height="100%"
                      width="100%"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-8xl mb-4">📺</div>
                      <h3 className="text-2xl font-bold text-white mb-2">Stream Offline</h3>
                      <p className="text-gray-400">The channel is not currently live</p>
                      <p className="text-sm text-gray-500 mt-2">Chat monitoring is still active</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Sidebar */}
            <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
              {/* Chat Header */}
              <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">Stream Chat</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-300">Live</span>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-800"
                style={{ scrollBehavior: 'smooth' }}
              >
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-3">💬</div>
                    <p className="text-sm">Waiting for chat messages...</p>
                    <p className="text-xs text-gray-600 mt-1">Messages will appear here when viewers start chatting</p>
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div key={message.id} className="group hover:bg-gray-700 hover:bg-opacity-50 p-2 rounded transition-colors">
                      <div className="flex items-start space-x-2">
                        <div className="flex-shrink-0 text-xs text-gray-500 mt-1">
                          {formatTimestamp(message.timestamp)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1 mb-1">
                            {message.badges.map((badge, idx) => (
                              <span key={idx} className="text-xs">
                                {getBadgeEmoji([badge])}
                              </span>
                            ))}
                            <span 
                              className="font-semibold text-sm truncate"
                              style={{ color: message.color || '#ffffff' }}
                            >
                              {message.username}
                            </span>
                          </div>
                          <div className="text-sm text-gray-200 break-words">
                            {message.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <div className="bg-gray-700 p-4 border-t border-gray-600">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Send a message as moderator..."
                    className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim()}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Moderation Status Bar */}
        {isConnected && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-6 py-3">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center space-x-6">
                <span className="text-sm font-medium text-white">🤖 AI Moderation Active</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-300">Toxicity Guardian</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-gray-300">Spam Eliminator</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-xs text-gray-300">Content Curator</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400">
                Messages: {chatMessages.length} | Connected: {formatTimestamp(Date.now())}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TwitchDashboard;