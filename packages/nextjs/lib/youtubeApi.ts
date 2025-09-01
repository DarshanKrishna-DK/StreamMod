// YouTube API integration for live chat and channel information
// This service handles YouTube Data API v3 and Live Chat API

export interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
    country?: string;
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
}

export interface YouTubeLiveStream {
  id: string;
  snippet: {
    channelId: string;
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: any;
    channelTitle: string;
    liveBroadcastContent: string;
  };
  liveStreamingDetails?: {
    actualStartTime?: string;
    actualEndTime?: string;
    scheduledStartTime?: string;
    concurrentViewers?: string;
    activeLiveChatId?: string;
  };
}

export interface YouTubeChatMessage {
  id: string;
  snippet: {
    type: string;
    liveChatId: string;
    authorChannelId: string;
    publishedAt: string;
    hasDisplayContent: boolean;
    displayMessage: string;
    textMessageDetails?: {
      messageText: string;
    };
  };
  authorDetails: {
    channelId: string;
    channelUrl: string;
    displayName: string;
    profileImageUrl: string;
    isVerified: boolean;
    isChatOwner: boolean;
    isChatSponsor: boolean;
    isChatModerator: boolean;
  };
}

class YouTubeApiService {
  private static instance: YouTubeApiService;
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  private constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
  }

  static getInstance(): YouTubeApiService {
    if (!YouTubeApiService.instance) {
      YouTubeApiService.instance = new YouTubeApiService();
    }
    return YouTubeApiService.instance;
  }

  // Get channel information by channel ID
  async getChannelById(channelId: string): Promise<YouTubeChannel | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/channels?part=snippet,statistics&id=${channelId}&key=${this.apiKey}`
      );

      const data = await response.json();
      return data.items?.[0] || null;
    } catch (error) {
      console.error('Error fetching YouTube channel:', error);
      return null;
    }
  }

  // Get channel information by custom URL/username
  async getChannelByUsername(username: string): Promise<YouTubeChannel | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/channels?part=snippet,statistics&forUsername=${username}&key=${this.apiKey}`
      );

      const data = await response.json();
      return data.items?.[0] || null;
    } catch (error) {
      console.error('Error fetching YouTube channel by username:', error);
      return null;
    }
  }

  // Search for channel by name
  async searchChannel(channelName: string): Promise<YouTubeChannel | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search?part=snippet&type=channel&q=${encodeURIComponent(channelName)}&key=${this.apiKey}&maxResults=1`
      );

      const data = await response.json();
      const channelId = data.items?.[0]?.id?.channelId;
      
      if (channelId) {
        return await this.getChannelById(channelId);
      }
      
      return null;
    } catch (error) {
      console.error('Error searching YouTube channel:', error);
      return null;
    }
  }

  // Get live streams for a channel
  async getLiveStreams(channelId: string): Promise<YouTubeLiveStream[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search?part=snippet&channelId=${channelId}&type=video&eventType=live&key=${this.apiKey}`
      );

      const data = await response.json();
      const videoIds = data.items?.map((item: any) => item.id.videoId).join(',');
      
      if (!videoIds) {
        return [];
      }

      // Get detailed information including live streaming details
      const detailsResponse = await fetch(
        `${this.baseUrl}/videos?part=snippet,liveStreamingDetails&id=${videoIds}&key=${this.apiKey}`
      );

      const detailsData = await detailsResponse.json();
      return detailsData.items || [];
    } catch (error) {
      console.error('Error fetching YouTube live streams:', error);
      return [];
    }
  }

  // Validate channel exists and is accessible
  async validateChannel(channelIdentifier: string): Promise<boolean> {
    try {
      // Try different methods to find the channel
      let channel = await this.getChannelById(channelIdentifier);
      
      if (!channel) {
        channel = await this.getChannelByUsername(channelIdentifier);
      }
      
      if (!channel) {
        channel = await this.searchChannel(channelIdentifier);
      }
      
      return channel !== null;
    } catch (error) {
      console.error('Error validating YouTube channel:', error);
      return false;
    }
  }

  // Get comprehensive channel information including live status
  async getChannelInfo(channelIdentifier: string) {
    try {
      // Try to get channel by different methods
      let channel = await this.getChannelById(channelIdentifier);
      
      if (!channel) {
        channel = await this.getChannelByUsername(channelIdentifier);
      }
      
      if (!channel) {
        channel = await this.searchChannel(channelIdentifier);
      }

      if (!channel) {
        throw new Error('Channel not found');
      }

      // Get live streams
      const liveStreams = await this.getLiveStreams(channel.id);
      const isLive = liveStreams.length > 0;
      
      return {
        channel,
        liveStreams,
        isLive,
        viewerCount: isLive ? parseInt(liveStreams[0]?.liveStreamingDetails?.concurrentViewers || '0') : 0,
        subscriberCount: parseInt(channel.statistics.subscriberCount),
        title: isLive ? liveStreams[0].snippet.title : channel.snippet.title,
      };
    } catch (error) {
      console.error('Error getting YouTube channel info:', error);
      throw error;
    }
  }

  // Get live chat messages (requires OAuth for full functionality)
  async getLiveChatMessages(liveChatId: string, pageToken?: string): Promise<{
    messages: YouTubeChatMessage[];
    nextPageToken?: string;
    pollingIntervalMillis: number;
  }> {
    try {
      let url = `${this.baseUrl}/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${this.apiKey}`;
      
      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      return {
        messages: data.items || [],
        nextPageToken: data.nextPageToken,
        pollingIntervalMillis: data.pollingIntervalMillis || 5000,
      };
    } catch (error) {
      console.error('Error fetching YouTube live chat messages:', error);
      return {
        messages: [],
        pollingIntervalMillis: 5000,
      };
    }
  }

  // Initialize chat monitoring for a live stream
  initializeChatConnection(channelId: string, onMessage: (message: YouTubeChatMessage) => void) {
    console.log(`Initializing YouTube chat connection for channel: ${channelId}`);
    
    // In production, this would:
    // 1. Get current live streams for the channel
    // 2. Extract the liveChatId from the live stream
    // 3. Poll the Live Chat API for new messages
    // 4. Handle rate limiting and pagination
    
    // Simulate chat messages for demo purposes
    const simulateChat = () => {
      const sampleMessages = [
        { user: 'YouTubeViewer1', message: 'Amazing content!' },
        { user: 'YouTubeViewer2', message: 'Love this stream!' },
        { user: 'YouTubeViewer3', message: 'Can you explain that again?' },
        { user: 'YouTubeMod', message: 'Please keep chat respectful!' },
      ];

      setInterval(() => {
        const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
        const chatMessage: YouTubeChatMessage = {
          id: `yt_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          snippet: {
            type: 'textMessageEvent',
            liveChatId: `live_chat_${channelId}`,
            authorChannelId: `channel_${randomMessage.user}`,
            publishedAt: new Date().toISOString(),
            hasDisplayContent: true,
            displayMessage: randomMessage.message,
            textMessageDetails: {
              messageText: randomMessage.message,
            },
          },
          authorDetails: {
            channelId: `channel_${randomMessage.user}`,
            channelUrl: `https://www.youtube.com/channel/channel_${randomMessage.user}`,
            displayName: randomMessage.user,
            profileImageUrl: 'https://via.placeholder.com/32x32',
            isVerified: false,
            isChatOwner: false,
            isChatSponsor: false,
            isChatModerator: randomMessage.user.includes('Mod'),
          },
        };
        
        onMessage(chatMessage);
      }, 7000 + Math.random() * 8000); // Random interval between 7-15 seconds
    };

    // Start simulation (in production, this would be real API polling)
    simulateChat();
  }

  // Get OAuth URL for user authentication (for posting messages, etc.)
  getOAuthUrl(redirectUri: string, scopes: string[] = ['https://www.googleapis.com/auth/youtube.readonly']): string {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      state: Math.random().toString(36).substring(2), // CSRF protection
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID || '',
          client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Error exchanging code for YouTube token:', error);
      throw error;
    }
  }
}

export default YouTubeApiService;


