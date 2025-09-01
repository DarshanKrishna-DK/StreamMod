import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
    }

    // Load Twitch credentials from environment variables
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || "";
    const clientSecret = process.env.TWITCH_CLIENT_SECRET || "";

    console.log("🔧 Environment check:", {
      hasClientId: !!clientId,
      clientIdLength: clientId?.length || 0,
      hasClientSecret: !!clientSecret,
      clientSecretLength: clientSecret?.length || 0,
      clientIdPreview: clientId ? `${clientId.substring(0, 8)}...` : "missing",
    });

    if (!clientId || !clientSecret) {
      console.error("❌ Missing Twitch credentials");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    console.log("🔄 Exchanging code for token on server-side...");

    // Exchange code for token
    const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("❌ Token exchange failed:", tokenResponse.status, errorData);
      console.error("❌ Request details:", {
        clientId: clientId ? `${clientId.substring(0, 8)}...` : "missing",
        clientSecretLength: clientSecret?.length || 0,
        redirectUri,
        codeLength: code?.length || 0,
      });

      // If it's a 403 with invalid client secret, provide specific guidance
      if (tokenResponse.status === 403 && errorData.includes("invalid client secret")) {
        return NextResponse.json(
          {
            error: "Invalid Twitch client secret",
            details:
              "Please generate a new client secret from https://dev.twitch.tv/console/apps and update your .env.local file",
            troubleshooting: {
              step1: "Go to https://dev.twitch.tv/console/apps",
              step2: "Click your app",
              step3: 'Click "New Secret" button',
              step4: "Copy the new secret immediately",
              step5: "Update TWITCH_CLIENT_SECRET in packages/nextjs/.env.local",
              step6: "Restart the development server",
            },
          },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { error: `Token exchange failed: ${tokenResponse.status}`, details: errorData },
        { status: tokenResponse.status },
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("✅ Token exchange successful");

    // Return tokens to client
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      token_type: tokenData.token_type,
    });
  } catch (error) {
    console.error("❌ Server error during token exchange:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
