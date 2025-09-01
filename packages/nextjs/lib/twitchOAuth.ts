// Real Twitch OAuth implementation for production use
"use client";

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
  email?: string;
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
  badges: { [key: string]: string };
  emotes: any[];
  color?: string;
}

class TwitchOAuthService {
  private static instance: TwitchOAuthService;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private baseUrl = 'https://api.twitch.tv/helix';

  private constructor() {
    // Load Twitch credentials from environment variables
    this.clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '';
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET || '';
    
    // Set redirect URI based on environment
    if (typeof window !== 'undefined') {
      this.redirectUri = `${window.location.origin}/auth/twitch/callback`;
    } else {
      this.redirectUri = 'http://localhost:3000/auth/twitch/callback';
    }
    
    console.log('🔧 Twitch OAuth Configuration:', {
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      redirectUri: this.redirectUri,
      origin: typeof window !== 'undefined' ? window.location.origin : 'server-side'
    });
  }

  static getInstance(): TwitchOAuthService {
    if (!TwitchOAuthService.instance) {
      TwitchOAuthService.instance = new TwitchOAuthService();
    }
    return TwitchOAuthService.instance;
  }

  // Generate OAuth URL for user authentication
  getAuthUrl(): string {
    const scopes = [
      'user:read:email',
      'channel:read:subscriptions',
      'moderation:read',
      'chat:read',
      'channel:moderate'
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state: Math.random().toString(36).substring(2)
    });

    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token (via server-side API)
  async exchangeCodeForToken(code: string): Promise<{ access_token: string; refresh_token: string } | null> {
    try {
      console.log('🔄 Exchanging code for token via server API...');
      
      const response = await fetch('/api/auth/twitch/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirectUri: this.redirectUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Token exchange failed:', response.status, errorData);
        throw new Error(`Token exchange failed: ${response.status} - ${errorData.error}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;

      // Store tokens in localStorage
      localStorage.setItem('twitch_access_token', data.access_token);
      localStorage.setItem('twitch_refresh_token', data.refresh_token);
      localStorage.setItem('twitch_token_expires', (Date.now() + (data.expires_in * 1000)).toString());

      console.log('✅ Successfully obtained Twitch tokens');
      return data;
    } catch (error) {
      console.error('❌ Error exchanging code for token:', error);
      return null;
    }
  }

  // Get stored access token
  getAccessToken(): string | null {
    if (this.accessToken) {
      // Check if token is expired
      const expiresAt = localStorage.getItem('twitch_token_expires');
      if (expiresAt && Date.now() > parseInt(expiresAt)) {
        console.log('🔄 Access token expired, clearing...');
        this.logout();
        return null;
      }
      return this.accessToken;
    }
    
    const stored = localStorage.getItem('twitch_access_token');
    if (stored) {
      // Check if stored token is expired
      const expiresAt = localStorage.getItem('twitch_token_expires');
      if (expiresAt && Date.now() > parseInt(expiresAt)) {
        console.log('🔄 Stored token expired, clearing...');
        this.logout();
        return null;
      }
      
      this.accessToken = stored;
      return stored;
    }
    
    return null;
  }

  // Get authenticated user info
  async getAuthenticatedUser(): Promise<TwitchUser | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      console.log('👤 Fetching authenticated user info...');
      
      const response = await fetch(`${this.baseUrl}/users`, {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ User info retrieved:', data.data[0]?.display_name);
      return data.data[0] || null;
    } catch (error) {
      console.error('❌ Error fetching user info:', error);
      return null;
    }
  }

  // Get user's stream info
  async getUserStream(userId: string): Promise<TwitchStream | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      console.log('📺 Fetching stream info for user:', userId);
      
      const response = await fetch(`${this.baseUrl}/streams?user_id=${userId}`, {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stream: ${response.status}`);
      }

      const data = await response.json();
      const stream = data.data[0] || null;
      
      if (stream) {
        console.log('✅ Stream is live:', stream.title);
      } else {
        console.log('📺 Stream is offline');
      }
      
      return stream;
    } catch (error) {
      console.error('❌ Error fetching stream info:', error);
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // Logout user
  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('twitch_access_token');
    localStorage.removeItem('twitch_refresh_token');
    localStorage.removeItem('twitch_token_expires');
    localStorage.removeItem('twitch_user');
    console.log('👋 User logged out from Twitch');
  }
}

// Twitch IRC Chat Connection (Real-time chat)
export class TwitchChatService {
  private ws: WebSocket | null = null;
  private channel: string = '';
  private onMessageCallback: ((message: TwitchChatMessage) => void) | null = null;

  constructor() {
    console.log('💬 Twitch Chat Service initialized');
  }

  // Connect to Twitch IRC via WebSocket
  connect(channel: string, onMessage: (message: TwitchChatMessage) => void): void {
    this.channel = channel.toLowerCase();
    this.onMessageCallback = onMessage;

    console.log(`🔗 Connecting to Twitch IRC for channel: ${this.channel}`);

    // Connect to Twitch IRC via WebSocket
    this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    this.ws.onopen = () => {
      console.log('✅ Connected to Twitch IRC');
      
      // Send authentication (anonymous)
      this.ws?.send('PASS SCHMOOPIIE');
      this.ws?.send('NICK justinfan12345');
      this.ws?.send(`JOIN #${this.channel}`);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = () => {
      console.log('❌ Disconnected from Twitch IRC');
    };

    this.ws.onerror = (error) => {
      console.error('❌ Twitch IRC error:', error);
    };
  }

  // Handle incoming IRC messages
  private handleMessage(data: string): void {
    const lines = data.split('\r\n');
    
    for (const line of lines) {
      if (line.startsWith('PING')) {
        this.ws?.send('PONG :tmi.twitch.tv');
        continue;
      }

      // Parse PRIVMSG (chat messages)
      if (line.includes('PRIVMSG')) {
        const message = this.parsePrivMsg(line);
        if (message && this.onMessageCallback) {
          this.onMessageCallback(message);
        }
      }
    }
  }

  // Parse PRIVMSG into TwitchChatMessage
  private parsePrivMsg(line: string): TwitchChatMessage | null {
    try {
      console.log('🔍 RAW TWITCH MESSAGE:', line);
      
      // Standard Twitch IRC format: @tags :user!user@user.tmi.twitch.tv PRIVMSG #channel :message
      const parts = line.split(' ');
      
      // Extract tags (first part, remove @)
      const tagsString = parts[0].substring(1);
      const tagMap: { [key: string]: string } = {};
      tagsString.split(';').forEach(tag => {
        const [key, value] = tag.split('=');
        tagMap[key] = value || '';
      });
      
      // Find the message text (everything after "PRIVMSG #channel :")
      const messageStartIndex = line.indexOf('PRIVMSG');
      if (messageStartIndex === -1) return null;
      
      const afterPrivmsg = line.substring(messageStartIndex);
      const colonIndex = afterPrivmsg.indexOf(' :');
      const messageText = colonIndex !== -1 ? afterPrivmsg.substring(colonIndex + 2) : '';
      
      // Get username from display-name tag first, then from IRC format
      let username = tagMap['display-name'];
      if (!username) {
        // Extract from :username!username@... format
        const userPart = parts.find(part => part.startsWith(':') && part.includes('!'));
        if (userPart) {
          username = userPart.split('!')[0].substring(1);
        }
      }
      
      username = username || 'Anonymous';
      
      console.log('🔍 PARSED:', { username, messageText, tags: tagMap });
      
      return {
        id: tagMap['id'] || Date.now().toString(),
        user_id: tagMap['user-id'] || '',
        user_login: username.toLowerCase(),
        user_name: username,
        message: messageText,
        timestamp: new Date().toISOString(),
        badges: this.parseBadges(tagMap['badges'] || ''),
        emotes: [],
        color: tagMap['color'] || '#FFFFFF'
      };
    } catch (error) {
      console.error('Error parsing message:', error);
      return null;
    }
  }

  // Parse badges string
  private parseBadges(badgesString: string): { [key: string]: string } {
    const badges: { [key: string]: string } = {};
    if (badgesString) {
      badgesString.split(',').forEach(badge => {
        const [name, version] = badge.split('/');
        badges[name] = version;
      });
    }
    return badges;
  }

  // Disconnect from IRC
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      console.log('👋 Disconnected from Twitch chat');
    }
  }
}

export default TwitchOAuthService;
