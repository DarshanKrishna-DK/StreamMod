"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { PlayIcon, CameraIcon, MicrophoneIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import type { NextPage } from "next";

interface Moderator {
  id: string;
  name: string;
  type: string;
  description: string;
  pricePerHour: number; // in AVAX
  features: string[];
}

const moderators: Moderator[] = [
  {
    id: "toxicity-guardian",
    name: "Toxicity Guardian",
    type: "Content Safety AI",
    description: "Monitors and filters toxic behavior, hate speech, and harmful content in real-time",
    pricePerHour: 0.05,
    features: ["Hate Speech Detection", "Toxicity Scoring", "Auto-Ban System", "Harassment Prevention", "Content Flagging"]
  },
  {
    id: "engagement-booster",
    name: "Engagement Booster",
    type: "Community AI",
    description: "Enhances viewer engagement through interactive features and community building",
    pricePerHour: 0.04,
    features: ["Chat Highlights", "Viewer Rewards", "Interactive Polls", "Engagement Analytics", "Community Challenges"]
  },
  {
    id: "spam-eliminator",
    name: "Spam Eliminator",
    type: "Anti-Spam AI",
    description: "Detects and removes spam, bots, and repetitive unwanted messages instantly",
    pricePerHour: 0.03,
    features: ["Bot Detection", "Spam Filtering", "Rate Limiting", "Duplicate Message Removal", "Link Protection"]
  },
  {
    id: "content-curator",
    name: "Content Curator",
    type: "Quality AI",
    description: "Ensures content quality and compliance with platform guidelines and regulations",
    pricePerHour: 0.05,
    features: ["Content Classification", "DMCA Protection", "Age Rating", "Quality Scoring", "Compliance Monitoring"]
  },
  {
    id: "sentiment-analyzer",
    name: "Sentiment Analyzer",
    type: "Emotion AI",
    description: "Analyzes chat sentiment and mood to help streamers understand their audience",
    pricePerHour: 0.04,
    features: ["Mood Detection", "Sentiment Trends", "Emotional Analytics", "Audience Insights", "Reaction Tracking"]
  }
];

const categories = [
  "Gaming", "Music", "Art & Creative", "Technology", "Education", 
  "Entertainment", "Sports", "Cooking", "Travel", "Business", 
  "Health & Fitness", "News & Politics", "Science", "Other"
];

const CreateStream: NextPage = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  // Form state
  const [streamTitle, setStreamTitle] = useState("");
  const [category, setCategory] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedModerators, setSelectedModerators] = useState<string[]>([]);
  const [estimatedDuration, setEstimatedDuration] = useState(1);
  
  // Camera and microphone testing
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [microphonePermission, setMicrophonePermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [isTestingCamera, setIsTestingCamera] = useState(false);
  const [isTestingMicrophone, setIsTestingMicrophone] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Calculate total cost
  const totalCostPerHour = selectedModerators.reduce((total, modId) => {
    const moderator = moderators.find(m => m.id === modId);
    return total + (moderator?.pricePerHour || 0);
  }, 0);

  const totalEstimatedCost = totalCostPerHour * estimatedDuration;

  const toggleModerator = (moderatorId: string) => {
    setSelectedModerators(prev => 
      prev.includes(moderatorId)
        ? prev.filter(id => id !== moderatorId)
        : [...prev, moderatorId]
    );
  };

  const testCamera = async () => {
    setIsTestingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setCameraPermission("granted");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera access denied:", error);
      setCameraPermission("denied");
    } finally {
      setIsTestingCamera(false);
    }
  };

  const testMicrophone = async () => {
    setIsTestingMicrophone(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophoneStream(stream);
      setMicrophonePermission("granted");
      
      // Create audio context for visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Audio level detection with visualization
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkAudio = () => {
        if (analyserRef.current && microphoneStream) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
          animationFrameRef.current = requestAnimationFrame(checkAudio);
        }
      };
      checkAudio();
      
    } catch (error) {
      console.error("Microphone access denied:", error);
      setMicrophonePermission("denied");
    } finally {
      setIsTestingMicrophone(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const stopMicrophone = () => {
    if (microphoneStream) {
      microphoneStream.getTracks().forEach(track => track.stop());
      setMicrophoneStream(null);
    }
    
    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setAudioLevel(0);
  };

  const startStream = async () => {
    if (!isConnected) {
      alert("Please connect your wallet to start streaming");
      return;
    }

    if (!streamTitle || !category || !topic || selectedModerators.length === 0) {
      alert("Please fill in all required fields and select at least one moderator");
      return;
    }

    if (cameraPermission !== "granted" || microphonePermission !== "granted") {
      alert("Please test and grant camera and microphone permissions before starting");
      return;
    }

    // Store stream configuration in localStorage for the live stream page
    const streamConfig = {
      title: streamTitle,
      category,
      topic,
      moderators: selectedModerators,
      moderatorData: moderators.filter(m => selectedModerators.includes(m.id)),
      startTime: Date.now(),
      walletAddress: address
    };
    
    localStorage.setItem('currentStream', JSON.stringify(streamConfig));
    
    // Redirect to live streaming page
    router.push('/live');
  };

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopMicrophone();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Stream</h1>
            <p className="text-gray-600">Set up your live stream with AI-powered moderation</p>
          </div>

          {/* Stream Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stream Title *
                </label>
                <input
                  type="text"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                  placeholder="Enter your stream title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specific Topic *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Fortnite Battle Royale, Jazz Piano, Digital Art Tutorial"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900 placeholder-gray-500"
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  Be specific about what you're streaming (game name, music genre, art style, etc.)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Duration (hours)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                />
              </div>
            </div>

            {/* Camera and Microphone Testing */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Your Equipment</h3>
                
                {/* Camera Test */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Camera</span>
                    {cameraPermission === "granted" && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                  </div>
                  
                  {cameraStream && (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      className="w-full h-32 bg-gray-200 rounded-md mb-2"
                    />
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={testCamera}
                      disabled={isTestingCamera}
                      className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <CameraIcon className="h-4 w-4 mr-2" />
                      {isTestingCamera ? "Testing..." : "Test Camera"}
                    </button>
                    {cameraStream && (
                      <button
                        onClick={stopCamera}
                        className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                </div>

                {/* Microphone Test */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Microphone</span>
                    {microphonePermission === "granted" && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={testMicrophone}
                        disabled={isTestingMicrophone}
                        className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        <MicrophoneIcon className="h-4 w-4 mr-2" />
                        {isTestingMicrophone ? "Testing..." : "Test Microphone"}
                      </button>
                      {microphoneStream && (
                        <button
                          onClick={stopMicrophone}
                          className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                          Stop
                        </button>
                      )}
                    </div>
                    
                    {/* Audio Level Visualization */}
                    {microphoneStream && (
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-600">Audio Level:</span>
                          <div className="flex-1 bg-gray-300 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-100"
                              style={{ width: `${Math.min(100, (audioLevel / 255) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(10)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-6 rounded-sm transition-all duration-100 ${
                                audioLevel > (i * 25) ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Moderator Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select AI Moderators *</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {moderators.map((moderator) => (
                <div
                  key={moderator.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedModerators.includes(moderator.id)
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => toggleModerator(moderator.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{moderator.name}</h4>
                    <span className="text-sm font-bold text-purple-600">
                      {moderator.pricePerHour} AVAX/hr
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{moderator.description}</p>
                  <div className="space-y-1">
                    {moderator.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-xs text-gray-500">
                        <CheckCircleIcon className="h-3 w-3 mr-1 text-green-500" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Summary */}
          {selectedModerators.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
              <div className="space-y-2">
                {selectedModerators.map((modId) => {
                  const moderator = moderators.find(m => m.id === modId);
                  return (
                    <div key={modId} className="flex justify-between text-sm">
                      <span className="text-gray-600">{moderator?.name}</span>
                      <span className="text-gray-900">{moderator?.pricePerHour} AVAX/hr</span>
                    </div>
                  );
                })}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-900">Total per hour:</span>
                    <span className="text-gray-900">{totalCostPerHour.toFixed(4)} AVAX</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-gray-900">Estimated total ({estimatedDuration}h):</span>
                    <span className="text-purple-600">{totalEstimatedCost.toFixed(4)} AVAX</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Start Stream Button */}
          <div className="flex justify-end">
            <button
              onClick={startStream}
              disabled={!isConnected || !streamTitle || !category || selectedModerators.length === 0}
              className="flex items-center px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <PlayIcon className="h-5 w-5 mr-2" />
              Start Stream
            </button>
          </div>

          {!isConnected && (
            <p className="text-center text-sm text-red-600 mt-4">
              Please connect your wallet to start streaming
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateStream;
