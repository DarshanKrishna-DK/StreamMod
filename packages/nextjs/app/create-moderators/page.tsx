"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount } from "wagmi";
import { 
  PlusIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  CpuChipIcon,
  TvIcon,
  VideoCameraIcon
} from "@heroicons/react/24/outline";
import type { NextPage } from "next";

interface Platform {
  id: 'twitch' | 'youtube' | 'pandapi';
  name: string;
  icon: React.ReactNode;
  description: string;
  requiresAuth: boolean;
}

interface ModeratorType {
  id: string;
  name: string;
  type: string;
  description: string;
  pricePerHour: number;
  features: string[];
  requiresMCP: boolean;
  supportedPlatforms: string[];
}

interface MCP {
  id: string;
  name: string;
  description: string;
  category: string;
  topics: string[];
  provider: string;
}

const platforms: Platform[] = [
  {
    id: 'pandapi',
    name: 'PandaPi',
    icon: <span className="text-2xl">🐼</span>,
    description: 'Native PandaPi streaming platform',
    requiresAuth: false
  },
  {
    id: 'twitch',
    name: 'Twitch',
    icon: <TvIcon className="h-6 w-6 text-purple-600" />,
    description: 'Connect your Twitch channel for real-time moderation',
    requiresAuth: false
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: <VideoCameraIcon className="h-6 w-6 text-red-600" />,
    description: 'Connect your YouTube channel for real-time moderation',
    requiresAuth: false
  }
];

const moderatorTypes: ModeratorType[] = [
  {
    id: "toxicity-guardian",
    name: "Toxicity Guardian",
    type: "Content Safety AI",
    description: "Monitors and filters toxic behavior, hate speech, and harmful content in real-time",
    pricePerHour: 0.05,
    features: ["Hate Speech Detection", "Toxicity Scoring", "Auto-Ban System", "Harassment Prevention", "Content Flagging"],
    requiresMCP: false,
    supportedPlatforms: ['pandapi', 'twitch', 'youtube']
  },
  {
    id: "engagement-booster",
    name: "Engagement Booster",
    type: "Community AI",
    description: "Enhances viewer engagement through interactive features and community building",
    pricePerHour: 0.04,
    features: ["Chat Highlights", "Viewer Rewards", "Interactive Polls", "Engagement Analytics", "Community Challenges"],
    requiresMCP: true,
    supportedPlatforms: ['pandapi', 'twitch', 'youtube']
  },
  {
    id: "spam-eliminator",
    name: "Spam Eliminator",
    type: "Anti-Spam AI",
    description: "Detects and removes spam, bots, and repetitive unwanted messages instantly",
    pricePerHour: 0.03,
    features: ["Bot Detection", "Spam Filtering", "Rate Limiting", "Duplicate Message Removal", "Link Protection"],
    requiresMCP: false,
    supportedPlatforms: ['pandapi', 'twitch', 'youtube']
  },
  {
    id: "content-curator",
    name: "Content Curator",
    type: "Quality AI",
    description: "Ensures content quality and compliance with platform guidelines and regulations",
    pricePerHour: 0.05,
    features: ["Content Classification", "DMCA Protection", "Age Rating", "Quality Scoring", "Compliance Monitoring"],
    requiresMCP: true,
    supportedPlatforms: ['pandapi', 'twitch', 'youtube']
  },
  {
    id: "sentiment-analyzer",
    name: "Sentiment Analyzer",
    type: "Emotion AI",
    description: "Analyzes chat sentiment and mood to help streamers understand their audience",
    pricePerHour: 0.04,
    features: ["Mood Detection", "Sentiment Trends", "Emotional Analytics", "Audience Insights", "Reaction Tracking"],
    requiresMCP: true,
    supportedPlatforms: ['pandapi', 'twitch', 'youtube']
  },
  {
    id: "game-assistant",
    name: "Game Assistant",
    type: "Gaming AI",
    description: "Provides game-specific tips, stats, and interactive content for gaming streams",
    pricePerHour: 0.06,
    features: ["Game Stats", "Strategy Tips", "Leaderboards", "Achievement Tracking", "Meta Analysis"],
    requiresMCP: true,
    supportedPlatforms: ['pandapi', 'twitch', 'youtube']
  }
];

const availableMCPs: MCP[] = [
  {
    id: "valorant-mcp",
    name: "Valorant Game Data",
    description: "Real-time Valorant stats, agent info, and match data",
    category: "Gaming",
    topics: ["valorant", "fps", "competitive", "agents", "maps"],
    provider: "Riot Games API"
  },
  {
    id: "league-mcp",
    name: "League of Legends Data",
    description: "Champion stats, build guides, and match analytics",
    category: "Gaming", 
    topics: ["league of legends", "moba", "champions", "builds"],
    provider: "Riot Games API"
  },
  {
    id: "crypto-mcp",
    name: "Cryptocurrency Data",
    description: "Real-time crypto prices, market data, and trading info",
    category: "Finance",
    topics: ["cryptocurrency", "bitcoin", "ethereum", "trading", "defi"],
    provider: "CoinGecko API"
  },
  {
    id: "weather-mcp",
    name: "Weather Information",
    description: "Current weather conditions and forecasts",
    category: "Lifestyle",
    topics: ["weather", "forecast", "temperature", "conditions"],
    provider: "OpenWeather API"
  },
  {
    id: "music-mcp",
    name: "Music & Entertainment",
    description: "Song information, artist data, and music recommendations",
    category: "Entertainment",
    topics: ["music", "songs", "artists", "albums", "recommendations"],
    provider: "Spotify API"
  }
];

const CreateModeratorsPage: NextPage = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  // Form state
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [selectedModerators, setSelectedModerators] = useState<ModeratorType[]>([]);
  const [selectedMCP, setSelectedMCP] = useState<MCP | null>(null);
  const [mcpSearchTerm, setMcpSearchTerm] = useState("");
  const [showMCPRequest, setShowMCPRequest] = useState(false);
  
  // Platform-specific data
  const [twitchChannel, setTwitchChannel] = useState("");
  const [youtubeChannel, setYoutubeChannel] = useState("");
  const [platformConnected, setPlatformConnected] = useState(false);
  
  // MCP Request form
  const [requestedMCPName, setRequestedMCPName] = useState("");
  const [requestedMCPDescription, setRequestedMCPDescription] = useState("");
  const [requestedMCPTopics, setRequestedMCPTopics] = useState("");

  const filteredMCPs = availableMCPs.filter(mcp => 
    mcp.name.toLowerCase().includes(mcpSearchTerm.toLowerCase()) ||
    mcp.description.toLowerCase().includes(mcpSearchTerm.toLowerCase()) ||
    mcp.topics.some(topic => topic.toLowerCase().includes(mcpSearchTerm.toLowerCase()))
  );

  // Handle moderator selection (toggle)
  const toggleModeratorSelection = (moderator: ModeratorType) => {
    setSelectedModerators(prev => {
      const isSelected = prev.some(m => m.id === moderator.id);
      if (isSelected) {
        // Remove if already selected
        return prev.filter(m => m.id !== moderator.id);
      } else {
        // Add if not selected
        return [...prev, moderator];
      }
    });
  };

  // Check if moderator is selected
  const isModeratorSelected = (moderator: ModeratorType) => {
    return selectedModerators.some(m => m.id === moderator.id);
  };

  const connectTwitch = async () => {
    console.log('🔗 Redirecting to Twitch OAuth...');
    
    try {
      // Import the OAuth service dynamically (client-side only)
      const { default: TwitchOAuthService } = await import('~~/lib/twitchOAuth');
      const twitchService = TwitchOAuthService.getInstance();
      
      // Redirect to Twitch OAuth
      const authUrl = twitchService.getAuthUrl();
      console.log('🚀 Redirecting to:', authUrl);
      window.location.href = authUrl;
    } catch (error) {
      console.error('❌ Error connecting to Twitch:', error);
      alert('Error connecting to Twitch. Please check your configuration.');
    }
  };

  const connectYouTube = async () => {
    if (!youtubeChannel.trim()) {
      alert("Please enter your YouTube channel ID");
      return;
    }
    
    // In production, this would use YouTube API
    console.log("Connecting to YouTube channel:", youtubeChannel);
    
    // Simulate API call delay
    setTimeout(() => {
      setPlatformConnected(true);
      alert(`Successfully connected to YouTube channel: ${youtubeChannel}`);
    }, 1000);
  };

  const submitMCPRequest = () => {
    if (!requestedMCPName.trim() || !requestedMCPDescription.trim() || !requestedMCPTopics.trim()) {
      alert("Please fill in all fields for the MCP request");
      return;
    }

    // In production, this would submit to a backend service
    console.log("MCP Request submitted:", {
      name: requestedMCPName,
      description: requestedMCPDescription,
      topics: requestedMCPTopics.split(',').map(t => t.trim())
    });

    alert("MCP request submitted! We'll review it and add it to our platform soon.");
    setShowMCPRequest(false);
    setRequestedMCPName("");
    setRequestedMCPDescription("");
    setRequestedMCPTopics("");
  };

  const createModerator = () => {
    if (!isConnected) {
      alert("Please connect your wallet to create moderators");
      return;
    }

    if (!selectedPlatform || selectedModerators.length === 0) {
      alert("Please select a platform and at least one moderator type");
      return;
    }

    // Check if any selected moderator requires MCP
    const requiresMCP = selectedModerators.some(mod => mod.requiresMCP);
    if (requiresMCP && !selectedMCP) {
      alert("One or more selected moderators require an MCP selection. Please choose one or request a new MCP.");
      return;
    }

    if (selectedPlatform.requiresAuth && !platformConnected) {
      alert(`Please connect your ${selectedPlatform.name} account first`);
      return;
    }

    // Create moderator configuration for each selected moderator
    const moderatorConfigs = selectedModerators.map(moderator => ({
      id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      platform: selectedPlatform.id,
      moderatorType: moderator.id,
      mcp: selectedMCP?.id || null,
      walletAddress: address,
      createdAt: Date.now(),
      platformData: {
        twitchChannel: selectedPlatform.id === 'twitch' ? twitchChannel : null,
        youtubeChannel: selectedPlatform.id === 'youtube' ? youtubeChannel : null
      }
    }));

    // Store moderator configurations
    const existingModerators = JSON.parse(localStorage.getItem('pandapi_moderators') || '[]');
    existingModerators.push(...moderatorConfigs);
    localStorage.setItem('pandapi_moderators', JSON.stringify(existingModerators));

    console.log(`✅ ${moderatorConfigs.length} Moderators created:`, moderatorConfigs);
    
    // For Twitch, redirect to OAuth if not already authenticated
    if (selectedPlatform.id === 'twitch') {
      // Check if user is already authenticated with Twitch
      const hasToken = localStorage.getItem('twitch_access_token');
      if (hasToken) {
        // Already authenticated, go to dashboard
        router.push('/moderator-dashboard');
      } else {
        // Need to authenticate first
        alert(`${moderatorConfigs.length} Moderators created! Now connecting to your Twitch account...`);
        connectTwitch();
      }
    } else {
      alert(`${moderatorConfigs.length} Moderators created successfully! You can now use them across your streaming platforms.`);
      // Reset form for other platforms
      setSelectedPlatform(null);
      setSelectedModerators([]);
    }
    setSelectedMCP(null);
    setPlatformConnected(false);
    setTwitchChannel("");
    setYoutubeChannel("");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create AI Moderators</h1>
            <p className="text-gray-600">Create intelligent moderators that work across PandaPi, Twitch, and YouTube</p>
          </div>

          {/* Step 1: Platform Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Choose Platform</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {platforms.map((platform) => (
                <div
                  key={platform.id}
                  className={`border rounded-lg p-6 cursor-pointer transition-all ${
                    selectedPlatform?.id === platform.id
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedPlatform(platform)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {platform.icon}
                    <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{platform.description}</p>

                </div>
              ))}
            </div>
          </div>

          {/* Platform Authentication */}
          {selectedPlatform?.requiresAuth && (
            <div className="mb-8 p-6 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Connect your {selectedPlatform.name} account
              </h3>
              
              {selectedPlatform.id === 'twitch' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Twitch Channel Name
                    </label>
                    <input
                      type="text"
                      value={twitchChannel}
                      onChange={(e) => setTwitchChannel(e.target.value)}
                      placeholder="Enter your Twitch username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                    />
                  </div>
                  <button
                    onClick={connectTwitch}
                    disabled={platformConnected}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {platformConnected ? "✅ Connected" : "Connect Twitch"}
                  </button>
                </div>
              )}

              {selectedPlatform.id === 'youtube' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      YouTube Channel ID
                    </label>
                    <input
                      type="text"
                      value={youtubeChannel}
                      onChange={(e) => setYoutubeChannel(e.target.value)}
                      placeholder="Enter your YouTube channel ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                    />
                  </div>
                  <button
                    onClick={connectYouTube}
                    disabled={platformConnected}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {platformConnected ? "✅ Connected" : "Connect YouTube"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Moderator Selection */}
          {selectedPlatform && (!selectedPlatform.requiresAuth || platformConnected) && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Step 2: Choose Moderator Types 
                <span className="text-sm font-normal text-gray-600 ml-2">(Select multiple)</span>
              </h2>
              {selectedModerators.length > 0 && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800 font-medium">
                    Selected: {selectedModerators.map(m => m.name).join(', ')}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {moderatorTypes
                  .filter(mod => mod.supportedPlatforms.includes(selectedPlatform.id))
                  .map((moderator) => (
                  <div
                    key={moderator.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isModeratorSelected(moderator)
                        ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => toggleModeratorSelection(moderator)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {isModeratorSelected(moderator) && (
                          <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        <h4 className="font-semibold text-gray-900">{moderator.name}</h4>
                      </div>
                      <span className="text-sm font-bold text-purple-600">
                        {moderator.pricePerHour} AVAX/hr
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{moderator.description}</p>
                    {moderator.requiresMCP && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 mb-2">
                        <CpuChipIcon className="h-4 w-4" />
                        Requires MCP Selection
                      </div>
                    )}
                    <div className="space-y-1">
                      {moderator.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-center text-xs text-gray-500">
                          <CheckCircleIcon className="h-3 w-3 mr-1 text-green-500" />
                          {feature}
                        </div>
                      ))}
                      {moderator.features.length > 3 && (
                        <div className="text-xs text-gray-400">
                          +{moderator.features.length - 3} more features
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: MCP Selection */}
          {selectedModerators.some(mod => mod.requiresMCP) && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 3: Select MCP (Model Context Protocol)</h2>
              <p className="text-gray-600 mb-4">
                Choose an MCP to provide topic-specific data for your moderator. This ensures relevant and accurate moderation.
              </p>
              
              {/* MCP Search */}
              <div className="mb-6">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={mcpSearchTerm}
                    onChange={(e) => setMcpSearchTerm(e.target.value)}
                    placeholder="Search MCPs by name, description, or topic..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Available MCPs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {filteredMCPs.map((mcp) => (
                  <div
                    key={mcp.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedMCP?.id === mcp.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedMCP(mcp)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{mcp.name}</h4>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {mcp.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{mcp.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {mcp.topics.slice(0, 4).map((topic, index) => (
                        <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {topic}
                        </span>
                      ))}
                      {mcp.topics.length > 4 && (
                        <span className="text-xs text-gray-400">+{mcp.topics.length - 4}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Provider: {mcp.provider}
                    </div>
                  </div>
                ))}
              </div>

              {/* Request New MCP */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Can't find the right MCP?</h3>
                  <button
                    onClick={() => setShowMCPRequest(!showMCPRequest)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Request New MCP
                  </button>
                </div>

                {showMCPRequest && (
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MCP Name
                      </label>
                      <input
                        type="text"
                        value={requestedMCPName}
                        onChange={(e) => setRequestedMCPName(e.target.value)}
                        placeholder="e.g., Fortnite Game Data"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={requestedMCPDescription}
                        onChange={(e) => setRequestedMCPDescription(e.target.value)}
                        placeholder="Describe what data this MCP should provide..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Topics (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={requestedMCPTopics}
                        onChange={(e) => setRequestedMCPTopics(e.target.value)}
                        placeholder="e.g., fortnite, battle royale, gaming, stats"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={submitMCPRequest}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Submit Request
                      </button>
                      <button
                        onClick={() => setShowMCPRequest(false)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Create Moderator Button */}
          {selectedPlatform && selectedModerators.length > 0 && (!selectedModerators.some(mod => mod.requiresMCP) || selectedMCP) && (
            <div className="flex justify-end">
              <button
                onClick={createModerator}
                disabled={!isConnected}
                className="flex items-center px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create {selectedModerators.length} Moderator{selectedModerators.length > 1 ? 's' : ''}
              </button>
            </div>
          )}

          {/* Twitch Dashboard Link */}
          {selectedPlatform?.id === 'twitch' && (
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">🎮 Ready to moderate Twitch?</h4>
              <p className="text-sm text-purple-600 mb-3">
                Connect to your Twitch channel to start monitoring chat in real-time with AI moderation.
              </p>
              <Link 
                href="/twitch-dashboard"
                className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm font-medium"
              >
                Open Twitch Dashboard →
              </Link>
            </div>
          )}

          {!isConnected && (
            <p className="text-center text-sm text-red-600 mt-4">
              Please connect your wallet to create moderators
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateModeratorsPage;
