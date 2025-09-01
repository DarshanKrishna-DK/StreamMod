
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "~~/contexts/AuthContext";
import AuthModal from "~~/components/auth/AuthModal";
import { PlayIcon, EyeIcon, SparklesIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import type { NextPage } from "next";

const Home: NextPage = () => {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const openAuthModal = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleStartStreaming = () => {
    router.push("/create");
  };

  const handleExploreStreams = () => {
    router.push("/streams");
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-50">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-blue-600">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
            <div className="text-center">
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                🐼 <span className="bg-gradient-to-r from-pink-300 to-yellow-300 bg-clip-text text-transparent">PandaPi</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-100 mb-8 max-w-3xl mx-auto">
                The future of live streaming with AI-powered moderation on Avalanche L1. 
                Stream without limits, moderated by intelligence.
              </p>
              
              {user && userProfile ? (
                // Authenticated user buttons
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button 
                    onClick={handleStartStreaming}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 flex items-center gap-2 shadow-lg"
                  >
                    <PlayIcon className="h-6 w-6" />
                    Start Streaming
                  </button>
                  <button 
                    onClick={handleExploreStreams}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center gap-2 shadow-lg"
                  >
                    <EyeIcon className="h-6 w-6" />
                    Explore Streams
                  </button>
                </div>
              ) : (
                // Guest user buttons
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    onClick={() => openAuthModal("signup")}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 shadow-lg"
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => openAuthModal("signin")}
                    className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-purple-900 transition-all duration-300"
                  >
                    Sign In
                  </button>
                </div>
              )}

              {user && userProfile && (
                <div className="mt-6 text-center">
                  <p className="text-gray-100">
                    Welcome back, <span className="text-yellow-300 font-semibold">{userProfile.displayName}</span>! 🎉
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Why Choose PandaPi?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Experience the next generation of live streaming with cutting-edge technology
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center hover:bg-gray-100 transition-colors duration-300 shadow-lg">
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <SparklesIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Moderation</h3>
                <p className="text-gray-600">
                  Advanced AI automatically moderates content in real-time, ensuring a safe environment
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center hover:bg-gray-100 transition-colors duration-300 shadow-lg">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheckIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Avalanche L1</h3>
                <p className="text-gray-600">
                  Built on Avalanche for lightning-fast transactions and low fees
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center hover:bg-gray-100 transition-colors duration-300 shadow-lg">
                <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <PlayIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">HD Streaming</h3>
                <p className="text-gray-600">
                  Crystal clear streaming quality with minimal latency for the best experience
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center hover:bg-gray-100 transition-colors duration-300 shadow-lg">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <EyeIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Web3 Native</h3>
                <p className="text-gray-600">
                  Seamless wallet integration and blockchain-powered features
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20 bg-gradient-to-r from-purple-600 to-blue-600">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Start Your Streaming Journey?
            </h2>
            <p className="text-xl text-gray-100 mb-8">
              Join thousands of creators who trust PandaPi for their live streaming needs
            </p>
            {!user && (
              <button
                onClick={() => openAuthModal("signup")}
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-12 py-4 rounded-full text-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 shadow-lg"
              >
                Get Started Today
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
      />
    </>
  );
};

export default Home;
