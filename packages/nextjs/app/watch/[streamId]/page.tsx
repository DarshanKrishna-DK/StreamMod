"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { 
  EyeIcon, 
  PaperAirplaneIcon,
  ArrowLeftIcon,
  WalletIcon
} from "@heroicons/react/24/outline";
import type { NextPage } from "next";
import StreamingContract, { ChatMessage, StreamState } from "../../../lib/streamingContract";

const ViewerPage: NextPage = () => {
  const router = useRouter();
  const params = useParams();
  const { address, isConnected } = useAccount();
  const streamId = params?.streamId as string;
  
  // Stream state
  const [streamingContract, setStreamingContract] = useState<StreamingContract | null>(null);
  const [streamData, setStreamData] = useState<StreamState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [viewerName, setViewerName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);

  // Initialize streaming contract on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setStreamingContract(StreamingContract.getInstance());
    }
  }, []);

  // Load stream data and join as viewer
  useEffect(() => {
    if (!streamId || !streamingContract) return;

    const stream = streamingContract.getStream(streamId);
    if (!stream) {
      router.push('/streams');
      return;
    }

    setStreamData(stream);
    
    // Generate viewer name
    const name = address ? `Viewer ${address.slice(-4)}` : `Viewer ${Math.random().toString(36).substr(2, 4)}`;
    setViewerName(name);

    // Join stream
    streamingContract.joinStream(streamId, name, address);
    setHasJoined(true);

    // Load existing messages
    const existingMessages = streamingContract.getChatMessages(streamId);
    setChatMessages(existingMessages);

    return () => {
      // Leave stream when component unmounts
      if (hasJoined && streamingContract) {
        streamingContract.leaveStream(streamId, name);
      }
    };
  }, [streamId, address, streamingContract]);

  // Set up real-time event listeners
  useEffect(() => {
    if (!streamId || !streamingContract) return;

    const handleNewMessage = (message: ChatMessage) => {
      if (message.streamId === streamId) {
        setChatMessages(prev => [...prev, message]);
      }
    };

    const handleStreamUpdated = (stream: StreamState) => {
      if (stream.id === streamId) {
        setStreamData(stream);
      }
    };

    const handleStreamsUpdated = (streams: StreamState[]) => {
      const currentStream = streams.find(s => s.id === streamId);
      if (currentStream) {
        setStreamData(currentStream);
      }
    };

    const handleStreamEnded = (data: { streamId: string }) => {
      if (data.streamId === streamId) {
        alert('Stream has ended');
        router.push('/streams');
      }
    };

    // Subscribe to events
    streamingContract.on('newMessage', handleNewMessage);
    streamingContract.on('streamUpdated', handleStreamUpdated);
    streamingContract.on('streamsUpdated', handleStreamsUpdated);
    streamingContract.on('streamEnded', handleStreamEnded);

    return () => {
      streamingContract.off('newMessage', handleNewMessage);
      streamingContract.off('streamUpdated', handleStreamUpdated);
      streamingContract.off('streamsUpdated', handleStreamsUpdated);
      streamingContract.off('streamEnded', handleStreamEnded);
    };
  }, [streamId, streamingContract, router]);

  const sendMessage = () => {
    if (!newMessage.trim() || !streamId || !streamingContract || !address) return;

    // Determine sender identity based on wallet address
    const isStreamer = streamData?.streamerAddress === address;
    const senderName = isStreamer ? 'Streamer' : `Viewer ${address.slice(-4)}`;
    
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

  if (!streamData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/streams')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">{streamData.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>{streamData.category}</span>
                <span>•</span>
                <span>{streamData.topic}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              LIVE
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <EyeIcon className="h-5 w-5" />
              <span>{streamData.viewerCount} viewers</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Video Area */}
        <div className="flex-1 bg-black flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">📹</div>
            <p className="text-xl mb-2">Live Stream</p>
            <p className="text-sm">Video stream would appear here</p>
            <p className="text-xs mt-2 opacity-60">
              In a real implementation, this would show the streamer's video feed
            </p>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Live Chat</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <EyeIcon className="h-4 w-4" />
                <span>{streamData.viewerCount} viewers</span>
              </div>
            </div>
            {/* User Status */}
            <div className="flex items-center gap-2 mt-2 text-sm">
              <WalletIcon className="h-4 w-4 text-gray-400" />
              {isConnected && address ? (
                <span className={`font-medium ${
                  streamData.streamerAddress === address ? 'text-purple-400' : 'text-blue-400'
                }`}>
                  {streamData.streamerAddress === address ? 'Streamer' : `Viewer ${address.slice(-4)}`}
                </span>
              ) : (
                <span className="text-gray-500">Not connected</span>
              )}
            </div>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Be the first to say something!</p>
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
                          message.sender === 'Streamer' 
                            ? 'text-purple-400' 
                            : message.senderAddress === address
                            ? 'text-green-400'
                            : 'text-blue-400'
                        }`}>
                          {message.sender}
                        </span>
                        {message.senderAddress && (
                          <span className="text-xs text-gray-500">
                            ({message.senderAddress.slice(0, 4)}...{message.senderAddress.slice(-2)})
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-200 text-sm">{message.message}</p>
                    </div>
                  ) : (
                    <p>{message.message}</p>
                  )}
                </div>
              ))
            )}
          </div>
          
          {/* Chat Input */}
          <div className="p-4 border-t border-gray-700">
            {isConnected && address ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Say something..."
                  className="flex-1 px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white bg-gray-800 placeholder-gray-400"
                />
                <button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                  Send
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm mb-3">Connect your wallet to participate in chat</p>
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium">
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewerPage;
