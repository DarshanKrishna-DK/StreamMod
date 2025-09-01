"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  EyeIcon, 
  ClockIcon,
  PlayIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";
import type { NextPage } from "next";
import StreamingContract, { StreamState } from "../../lib/streamingContract";

interface LiveStream {
  id: string;
  title: string;
  category: string;
  topic: string;
  streamerName: string;
  viewerCount: number;
  duration: number;
  thumbnail?: string;
  isLive: boolean;
  moderators: string[];
}

const ExploreStreamsPage: NextPage = () => {
  const router = useRouter();
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [streamingContract, setStreamingContract] = useState<StreamingContract | null>(null);

  const categories = [
    "All", "Gaming", "Music", "Art & Creative", "Technology", "Education", 
    "Entertainment", "Sports", "Cooking", "Travel", "Business", 
    "Health & Fitness", "News & Politics", "Science", "Other"
  ];

  // Initialize streaming contract on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔧 Initializing StreamingContract in viewer window...');
      const contract = StreamingContract.getInstance();
      setStreamingContract(contract);
      console.log('✅ StreamingContract initialized in viewer window');
    }
  }, []);

  // Check for active streams using new sync system
  useEffect(() => {
    if (!streamingContract) return;
    
    const updateStreams = (activeStreams?: any[]) => {
      // Get streams from parameter or fetch them
      const streams = activeStreams || streamingContract.getAllActiveStreams();
      console.log('🔄 Updating streams in explore page:', streams);
      console.log('🔍 Raw streams data:', streams.map(s => ({ id: s.id, title: s.title, isLive: s.isLive, streamerAddress: s.streamerAddress })));
      
      const currentStreamConfig = localStorage.getItem('currentStream');
      const currentWalletAddress = currentStreamConfig ? JSON.parse(currentStreamConfig).walletAddress : null;
      console.log('👤 Current wallet address:', currentWalletAddress);
      
      // Filter to only include explicitly live streams and map to display format
      const processedStreams: LiveStream[] = streams
        .filter(stream => stream.isLive === true) // Extra safety filter
        .map(stream => ({
          id: stream.id,
          title: stream.title,
          category: stream.category,
          topic: stream.topic,
          streamerName: stream.streamerAddress === currentWalletAddress ? 'You' : `Streamer ${stream.streamerAddress?.slice(-4)}`,
          viewerCount: stream.viewerCount,
          duration: Math.floor((Date.now() - stream.startTime) / 1000),
          isLive: stream.isLive,
          moderators: stream.moderators
        }));

      console.log('✅ Processed streams for display:', processedStreams);
      setLiveStreams(processedStreams);
    };

    // Initial load with delay to ensure contract is ready
    setTimeout(() => updateStreams(), 100);
    
    // Set up a more aggressive polling for this page
    const pollInterval = setInterval(() => {
      updateStreams();
    }, 2000);
    
    // Listen for real-time updates
    const handleStreamsUpdated = (streams: any[]) => {
      console.log('📡 Streams updated event received:', streams);
      updateStreams(streams);
    };

    const handleStreamCreated = (stream: any) => {
      console.log('🆕 Stream created event received:', stream);
      updateStreams();
    };

    const handleStreamEnded = (data: any) => {
      console.log('🛑 Stream ended event received:', data);
      updateStreams();
    };

    // Subscribe to events
    streamingContract.on('streamsUpdated', handleStreamsUpdated);
    streamingContract.on('streamCreated', handleStreamCreated);
    streamingContract.on('streamEnded', handleStreamEnded);
    
    return () => {
      clearInterval(pollInterval);
      streamingContract.off('streamsUpdated', handleStreamsUpdated);
      streamingContract.off('streamCreated', handleStreamCreated);
      streamingContract.off('streamEnded', handleStreamEnded);
    };
  }, [streamingContract]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const filteredStreams = selectedCategory === "All" 
    ? liveStreams 
    : liveStreams.filter(stream => stream.category === selectedCategory);

  const watchStream = (streamId: string) => {
    const currentStreamConfig = localStorage.getItem('currentStream');
    const isOwnStream = currentStreamConfig && liveStreams.find(s => s.id === streamId && s.streamerName === 'You');
    
    if (isOwnStream) {
      // Redirect to own live stream
      router.push('/live');
    } else {
      // Redirect to viewer interface
      router.push(`/watch/${streamId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🎥 Explore Live Streams
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover amazing content from creators around the world, all powered by AI moderation
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            

          </div>
        </div>

        {/* Live Streams Grid */}
        {filteredStreams.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📺</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Live Streams</h3>
            <p className="text-gray-600 mb-6">
              {selectedCategory === "All" 
                ? "No one is streaming right now. Be the first to go live!"
                : `No live streams in ${selectedCategory} category right now.`
              }
            </p>
            <button
              onClick={() => router.push('/create')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium"
            >
              Start Streaming
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStreams.map((stream) => (
              <div key={stream.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-purple-400 to-blue-500 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlayIcon className="h-16 w-16 text-white opacity-80" />
                  </div>
                  
                  {/* Live Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    LIVE
                  </div>
                  
                  {/* Viewer Count */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black bg-opacity-50 text-white rounded text-sm">
                    <EyeIcon className="h-4 w-4" />
                    {stream.viewerCount}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                      {stream.title}
                    </h3>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <UserGroupIcon className="h-4 w-4" />
                      <span className="font-medium">{stream.streamerName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="bg-gray-100 px-2 py-1 rounded">{stream.category}</span>
                      <span>{stream.topic}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <ClockIcon className="h-4 w-4" />
                      {formatDuration(stream.duration)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {stream.moderators.length} AI moderator{stream.moderators.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <button
                    onClick={() => watchStream(stream.id)}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    {stream.id === 'current-stream' ? 'View Your Stream' : 'Watch Stream'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-16 bg-white rounded-lg p-8 border border-gray-200">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🤖 AI-Powered Moderation
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              All streams on PandaPi are protected by advanced AI moderators that ensure a safe, 
              engaging, and spam-free experience for everyone. Our AI systems work 24/7 to maintain 
              community standards while enhancing viewer engagement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExploreStreamsPage;