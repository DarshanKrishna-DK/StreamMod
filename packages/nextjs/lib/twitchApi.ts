// Twitch API integration for chat data and channel information
// This service handles authentication and data fetching from Twitch

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  created_at: string;
}

export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  is_mature: boolean;
}

export interface TwitchChatMessage {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  message: string;
  timestamp: string;
  badges: string[];
  emotes: any[];
  color?: string;
}

class TwitchApiService {
  private static instance: TwitchApiService;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private baseUrl = 'https://api.twitch.tv/helix';

  private constructor() {
    // Load Twitch credentials from environment variables
    this.clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '';
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET || '';
    
    // Log configuration status (without exposing secrets)
    console.log('🔧 Twitch API Configuration:', {
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      clientIdLength: this.clientId.length
    });
  }

  static getInstance(): TwitchApiService {
    if (!TwitchApiService.instance) {
      TwitchApiService.instance = new TwitchApiService();
    }
    return TwitchApiService.instance;
  }

  // Get OAuth token for app authentication
  async getAppAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        }),
      });

      const data = await response.json();
      this.accessToken = data.access_token || null;
      
      // Set token expiration
      setTimeout(() => {
        this.accessToken = null;
      }, (data.expires_in - 60) * 1000); // Refresh 1 minute before expiry

      return this.accessToken || '';
    } catch (error) {
      console.error('Error getting Twitch access token:', error);
      throw error;
    }
  }

  // Get user information by username
  async getUserByLogin(login: string): Promise<TwitchUser | null> {
    // If no credentials, return mock data
    if (!this.clientId || !this.clientSecret) {
      console.log('🔧 No Twitch credentials found, returning mock user data');
      return {
        id: `mock_${login}`,
        login: login.toLowerCase(),
        display_name: login,
        type: '',
        broadcaster_type: 'partner',
        description: `Mock Twitch channel for ${login}`,
        profile_image_url: 'https://static-cdn.jtvnw.net/jtv_user_pictures/default-profile-image-300x300.png',
        offline_image_url: '',
        view_count: Math.floor(Math.random() * 1000000),
        created_at: '2020-01-01T00:00:00Z'
      };
    }

    try {
      console.log(`🔍 Fetching Twitch user: ${login}`);
      const token = await this.getAppAccessToken();
      const response = await fetch(`${this.baseUrl}/users?login=${login}`, {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Twitch API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Twitch user data received:', data.data?.[0]?.display_name);
      return data.data?.[0] || null;
    } catch (error) {
      console.error('❌ Error fetching Twitch user:', error);
      return null;
    }
  }

  // Get stream information for a user
  async getStreamByUserId(userId: string): Promise<TwitchStream | null> {
    // If no credentials, return mock stream data (simulate live stream)
    if (!this.clientId || !this.clientSecret) {
      console.log('🔧 No Twitch credentials found, returning mock stream data');
      const isLive = Math.random() > 0.3; // 70% chance of being live
      
      if (!isLive) return null;
      
      const games = ['Just Chatting', 'Valorant', 'League of Legends', 'Fortnite', 'Minecraft', 'Grand Theft Auto V'];
      const titles = [
        'Chill stream with chat!',
        'Ranked grind continues',
        'New game trying out!',
        'Community game night',
        'Learning new strategies',
        'Viewer games and fun!'
      ];
      
      return {
        id: `mock_stream_${userId}`,
        user_id: userId,
        user_login: userId.replace('mock_', ''),
        user_name: userId.replace('mock_', ''),
        game_id: '509658',
        game_name: games[Math.floor(Math.random() * games.length)],
        type: 'live',
        title: titles[Math.floor(Math.random() * titles.length)],
        viewer_count: Math.floor(Math.random() * 50000) + 100,
        started_at: new Date(Date.now() - Math.random() * 7200000).toISOString(), // Started 0-2 hours ago
        language: 'en',
        thumbnail_url: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_{width}x{height}.jpg',
        tag_ids: [],
        is_mature: false
      };
    }

    try {
      console.log(`🔍 Fetching stream for user ID: ${userId}`);
      const token = await this.getAppAccessToken();
      const response = await fetch(`${this.baseUrl}/streams?user_id=${userId}`, {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Twitch API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const stream = data.data?.[0] || null;
      console.log(stream ? '✅ Stream is live!' : '📺 Stream is offline');
      return stream;
    } catch (error) {
      console.error('❌ Error fetching Twitch stream:', error);
      return null;
    }
  }

  // Validate channel exists and is accessible
  async validateChannel(channelName: string): Promise<boolean> {
    try {
      const user = await this.getUserByLogin(channelName);
      return user !== null;
    } catch (error) {
      console.error('Error validating Twitch channel:', error);
      return false;
    }
  }

  // Get channel information including stream status
  async getChannelInfo(channelName: string) {
    try {
      const user = await this.getUserByLogin(channelName);
      if (!user) {
        throw new Error('Channel not found');
      }

      const stream = await this.getStreamByUserId(user.id);
      
      return {
        user,
        stream,
        isLive: stream !== null,
        viewerCount: stream?.viewer_count || 0,
        gameCategory: stream?.game_name || 'Not streaming',
        title: stream?.title || user.description,
      };
    } catch (error) {
      console.error('Error getting channel info:', error);
      throw error;
    }
  }

  // Initialize chat connection (WebSocket-based)
  // Note: In production, you'd use Twitch's IRC or EventSub for real-time chat
  initializeChatConnection(channelName: string, onMessage: (message: TwitchChatMessage) => void) {
    // This is a simplified implementation
    // In production, you would:
    // 1. Connect to Twitch IRC (irc.chat.twitch.tv:6667)
    // 2. Authenticate with OAuth token
    // 3. Join the channel
    // 4. Listen for PRIVMSG events
    
    console.log(`Initializing chat connection for channel: ${channelName}`);
    
    // Simulate chat messages for demo purposes
    const simulateChat = () => {
      const sampleMessages = [
        { user: 'viewer1', message: 'Great stream!' },
        { user: 'viewer2', message: 'What game is this?' },
        { user: 'viewer3', message: 'Nice play!' },
        { user: 'moderator1', message: 'Remember to follow the rules!' },
      ];

      setInterval(() => {
        const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
        const chatMessage: TwitchChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: `user_${randomMessage.user}`,
          user_login: randomMessage.user,
          user_name: randomMessage.user,
          message: randomMessage.message,
          timestamp: new Date().toISOString(),
          badges: [],
          emotes: [],
        };
        
        onMessage(chatMessage);
      }, 5000 + Math.random() * 10000); // Random interval between 5-15 seconds
    };

    // Start simulation (in production, this would be real WebSocket connection)
    simulateChat();
  }

  // Get OAuth URL for user authentication (for advanced features)
  getOAuthUrl(redirectUri: string, scopes: string[] = ['chat:read']): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state: Math.random().toString(36).substring(2), // CSRF protection
    });

    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
  }

  // Exchange authorization code for user access token
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
    try {
      const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  // Get user info (alias for getUserByLogin for compatibility)
  async getUserInfo(username: string): Promise<TwitchUser | null> {
    return this.getUserByLogin(username);
  }

  // Get stream info by username
  async getStreamInfo(username: string): Promise<TwitchStream | null> {
    try {
      const user = await this.getUserByLogin(username);
      if (!user) return null;
      
      return this.getStreamByUserId(user.id);
    } catch (error) {
      console.error('Error getting stream info:', error);
      return null;
    }
  }

  // Mock chat messages for development (simulates real Twitch chat)
  async getLiveChatMessages(channelName: string): Promise<any[]> {
    // In production, this would connect to Twitch IRC or use EventSub
    console.log(`💬 Fetching chat messages for ${channelName}`);
    
    const mockUsernames = [
      'GamerPro2024', 'StreamFan99', 'ChatMaster', 'ViewerOne', 'TwitchLover',
      'GameEnthusiast', 'LiveWatcher', 'StreamSniper', 'ChatBot123', 'FanBoy2024',
      'ProGamer', 'StreamKing', 'ViewerQueen', 'ChatLegend', 'GameMaster',
      'xXNoobSlayerXx', 'PogChampion', 'KekWMaster', 'MonkaGiga', 'ClipThat',
      'FirstTimeViewer', 'LongTimeFollower', 'SubTrain', 'DonationAlert', 'ModSquad'
    ];

    const mockMessages = [
      'Great stream!', 'What game is this?', 'Nice play!', 'GG', 'Poggers',
      'That was insane!', 'How did you do that?', 'Amazing content!', 'Keep it up!',
      'First time here, loving it!', 'Subscribed!', 'This is so cool',
      'Can you play my song?', 'Shoutout please!', 'You\'re the best streamer',
      'What\'s your setup?', 'How long have you been streaming?', 'Love from Brazil!',
      'Epic moment!', 'KEKW', 'MonkaS', 'EZ Clap', '5Head play',
      'PogChamp', 'LUL', 'omegalul', 'Kreygasm', 'BlessRNG',
      'Chat is this real?', 'Clip it!', 'That\'s content right there',
      'I\'m dying 😂', 'This is why I watch', 'Best streamer on Twitch',
      'When is the next stream?', 'Discord link?', 'What rank are you?',
      'Tutorial when?', 'Play with viewers!', 'React to this video',
      'Check your donations', 'Read chat!', 'Answer my question please',
      'You missed my message', 'Notice me senpai', 'I\'ve been here for 3 hours'
    ];

    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', 
      '#98D8C8', '#F7DC6F', '#FF9F43', '#6C5CE7', '#A29BFE', '#FD79A8',
      '#00B894', '#E17055', '#74B9FF', '#E84393'
    ];
    
    const badges = [
      [], 
      ['subscriber'], 
      ['moderator'], 
      ['vip'], 
      ['subscriber', 'vip'],
      ['broadcaster'],
      ['subscriber', '6-month'],
      ['subscriber', '1-year'],
      ['bits'],
      ['prime']
    ];

    // Generate 1-5 random messages to simulate real chat flow
    const messageCount = Math.floor(Math.random() * 5) + 1;
    const messages = [];

    for (let i = 0; i < messageCount; i++) {
      const username = mockUsernames[Math.floor(Math.random() * mockUsernames.length)];
      const message = mockMessages[Math.floor(Math.random() * mockMessages.length)];
      const userBadges = badges[Math.floor(Math.random() * badges.length)];
      
      messages.push({
        id: `msg_${channelName}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        username,
        message,
        timestamp: Date.now() - (Math.random() * 10000), // Random time within last 10 seconds
        badges: userBadges,
        color: colors[Math.floor(Math.random() * colors.length)],
        isSubscriber: userBadges.includes('subscriber'),
        isModerator: userBadges.includes('moderator')
      });
    }

    const sortedMessages = messages.sort((a, b) => a.timestamp - b.timestamp);
    console.log(`✅ Generated ${sortedMessages.length} chat messages for ${channelName}`);
    return sortedMessages;
  }
}

// Export a simple class for easier usage
export class TwitchApi {
  private service: TwitchApiService;

  constructor() {
    this.service = TwitchApiService.getInstance();
  }

  async getUserInfo(username: string) {
    return this.service.getUserInfo(username);
  }

  async getStreamInfo(username: string) {
    return this.service.getStreamInfo(username);
  }

  async getLiveChatMessages(channelName: string) {
    return this.service.getLiveChatMessages(channelName);
  }

  async getChannelInfo(channelName: string) {
    return this.service.getChannelInfo(channelName);
  }

  async validateChannel(channelName: string) {
    return this.service.validateChannel(channelName);
  }
}

export default TwitchApiService;
