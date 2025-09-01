"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TwitchOAuthService from "~~/lib/twitchOAuth";

const TwitchCallback = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing Twitch authentication...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
          throw new Error(`Twitch OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error("No authorization code received from Twitch");
        }

        console.log("🔄 Processing Twitch OAuth callback...");
        setMessage("Exchanging authorization code for access token...");

        const twitchService = TwitchOAuthService.getInstance();
        const tokenData = await twitchService.exchangeCodeForToken(code);

        if (!tokenData) {
          throw new Error(
            "Failed to exchange authorization code for access token. Please check your Twitch app configuration.",
          );
        }

        setMessage("Getting user information...");
        const user = await twitchService.getAuthenticatedUser();

        if (!user) {
          throw new Error("Failed to get user information");
        }

        console.log("✅ Twitch authentication successful for:", user.display_name);
        setStatus("success");
        setMessage(`Successfully connected to Twitch as ${user.display_name}!`);

        // Store user info
        localStorage.setItem("twitch_user", JSON.stringify(user));

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/moderator-dashboard");
        }, 2000);
      } catch (error) {
        console.error("❌ Twitch OAuth error:", error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Authentication failed");

        // Redirect back to create-moderators after 3 seconds
        setTimeout(() => {
          router.push("/create-moderators");
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-black flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700 text-center">
          {status === "processing" && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-6"></div>
              <h1 className="text-2xl font-bold text-white mb-4">Connecting to Twitch</h1>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="text-6xl mb-6">✅</div>
              <h1 className="text-2xl font-bold text-green-400 mb-4">Authentication Successful!</h1>
              <p className="text-gray-400 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="text-6xl mb-6">❌</div>
              <h1 className="text-2xl font-bold text-red-400 mb-4">Authentication Failed</h1>
              <p className="text-gray-400 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirecting back to setup...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwitchCallback;
