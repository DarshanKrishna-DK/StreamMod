// User service that integrates wallet authentication with Firebase
import { 
  signInAnonymously, 
  signInWithCustomToken, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  uid: string;
  walletAddress: string;
  displayName: string;
  email?: string;
  profileImage?: string;
  createdAt: any;
  lastLoginAt: any;
  
  // Streaming-related data
  totalStreams: number;
  totalViewTime: number;
  totalEarnings: number;
  moderatorsCreated: string[];
  
  // Platform connections
  twitchConnected: boolean;
  twitchUsername?: string;
  youtubeConnected: boolean;
  youtubeChannelId?: string;
  
  // Preferences
  preferredModerators: string[];
  defaultStreamCategory?: string;
  notificationSettings: {
    streamStarted: boolean;
    newFollower: boolean;
    moderatorAlerts: boolean;
  };
}

export interface StreamRecord {
  id: string;
  streamerId: string;
  streamerAddress: string;
  title: string;
  category: string;
  topic: string;
  startTime: any;
  endTime?: any;
  duration?: number;
  peakViewers: number;
  totalViewers: number;
  earnings: number;
  moderatorsUsed: string[];
  platform: 'pandapi' | 'twitch' | 'youtube';
  status: 'live' | 'ended' | 'scheduled';
}

export interface ModeratorRecord {
  id: string;
  creatorId: string;
  creatorAddress: string;
  name: string;
  type: string;
  platform: 'pandapi' | 'twitch' | 'youtube';
  mcpId?: string;
  configuration: any;
  createdAt: any;
  lastUsed?: any;
  totalUsage: number;
  totalEarnings: number;
  isActive: boolean;
}

class UserService {
  private static instance: UserService;
  private currentUser: FirebaseUser | null = null;
  private userProfile: UserProfile | null = null;
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {
    // Listen for auth state changes only if Firebase is configured
    if (auth) {
      onAuthStateChanged(auth, (user) => {
        this.currentUser = user;
        if (user) {
          this.loadUserProfile(user.uid);
        } else {
          this.userProfile = null;
        }
        this.triggerListeners('authStateChanged', { user, profile: this.userProfile });
      });
      console.log('✅ UserService initialized with Firebase auth');
    } else {
      console.log('ℹ️ UserService initialized without Firebase - using localStorage only');
    }
  }

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // Authenticate user with wallet address (simplified for wallet-based auth)
  async authenticateWithWallet(walletAddress: string, signature?: string): Promise<UserProfile> {
    try {
      // For wallet-based authentication, we'll create a mock user profile
      // In production, you would integrate with your preferred auth system
      
      // First, check if user exists with this wallet address
      const existingUser = await this.getUserByWalletAddress(walletAddress);
      
      if (existingUser) {
        // Update existing user's last login
        await this.updateUserProfile(existingUser.uid, {
          lastLoginAt: serverTimestamp()
        });
        this.userProfile = existingUser;
        this.triggerListeners('authStateChanged', { user: { uid: existingUser.uid }, profile: existingUser });
        return existingUser;
      } else {
        // Create new user profile with wallet address as UID
        const userId = `wallet_${walletAddress.toLowerCase()}`;
        const newProfile = await this.createUserProfile(userId, walletAddress);
        this.userProfile = newProfile;
        this.triggerListeners('authStateChanged', { user: { uid: userId }, profile: newProfile });
        return newProfile;
      }
    } catch (error) {
      console.error('Error authenticating with wallet:', error);
      throw error;
    }
  }

  // Create new user profile
  async createUserProfile(uid: string, walletAddress: string): Promise<UserProfile> {
    const profile: UserProfile = {
      uid,
      walletAddress,
      displayName: `User ${walletAddress.slice(-4)}`,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      totalStreams: 0,
      totalViewTime: 0,
      totalEarnings: 0,
      moderatorsCreated: [],
      twitchConnected: false,
      youtubeConnected: false,
      preferredModerators: [],
      notificationSettings: {
        streamStarted: true,
        newFollower: true,
        moderatorAlerts: true,
      },
    };

    // Store in localStorage for now (in production, use your preferred database)
    try {
      localStorage.setItem(`pandapi_user_${uid}`, JSON.stringify(profile));
    } catch (error) {
      console.warn('Could not save user profile to localStorage:', error);
    }
    
    this.userProfile = profile;
    return profile;
  }

  // Load user profile from localStorage
  async loadUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const stored = localStorage.getItem(`pandapi_user_${uid}`);
      if (stored) {
        this.userProfile = JSON.parse(stored) as UserProfile;
        return this.userProfile;
      }
      return null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  // Update user profile
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      if (this.userProfile && this.userProfile.uid === uid) {
        this.userProfile = { 
          ...this.userProfile, 
          ...updates,
          lastLoginAt: Date.now()
        };
        
        // Save to localStorage
        localStorage.setItem(`pandapi_user_${uid}`, JSON.stringify(this.userProfile));
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Get user by wallet address
  async getUserByWalletAddress(walletAddress: string): Promise<UserProfile | null> {
    try {
      const userId = `wallet_${walletAddress.toLowerCase()}`;
      const stored = localStorage.getItem(`pandapi_user_${userId}`);
      if (stored) {
        return JSON.parse(stored) as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error getting user by wallet address:', error);
      return null;
    }
  }

  // Create stream record
  async createStreamRecord(streamData: Omit<StreamRecord, 'id'>): Promise<string> {
    try {
      if (!db) {
        console.log('ℹ️ Firestore not configured - stream record not saved to database');
        return `mock_stream_${Date.now()}`;
      }

      const streamRef = doc(collection(db, 'streams'));
      const streamRecord: StreamRecord = {
        id: streamRef.id,
        ...streamData,
        startTime: serverTimestamp(),
      };
      
      await setDoc(streamRef, streamRecord);
      
      // Update user's total streams
      if (this.currentUser) {
        await this.updateUserProfile(this.currentUser.uid, {
          totalStreams: (this.userProfile?.totalStreams || 0) + 1
        });
      }
      
      return streamRef.id;
    } catch (error) {
      console.error('Error creating stream record:', error);
      throw error;
    }
  }

  // End stream record
  async endStreamRecord(streamId: string, endData: { 
    peakViewers: number; 
    totalViewers: number; 
    earnings: number; 
  }): Promise<void> {
    try {
      if (!db) {
        console.log('ℹ️ Firestore not configured - stream end record not saved to database');
        return;
      }

      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await getDoc(streamRef);
      
      if (streamDoc.exists()) {
        const streamData = streamDoc.data() as StreamRecord;
        const duration = Date.now() - streamData.startTime.toMillis();
        
        await updateDoc(streamRef, {
          endTime: serverTimestamp(),
          duration,
          peakViewers: endData.peakViewers,
          totalViewers: endData.totalViewers,
          earnings: endData.earnings,
          status: 'ended'
        });
        
        // Update user's total earnings
        if (this.currentUser) {
          await this.updateUserProfile(this.currentUser.uid, {
            totalEarnings: (this.userProfile?.totalEarnings || 0) + endData.earnings
          });
        }
      }
    } catch (error) {
      console.error('Error ending stream record:', error);
      throw error;
    }
  }

  // Create moderator record
  async createModeratorRecord(moderatorData: Omit<ModeratorRecord, 'id'>): Promise<string> {
    try {
      if (!db) {
        console.log('ℹ️ Firestore not configured - moderator record not saved to database');
        return `mock_moderator_${Date.now()}`;
      }

      const moderatorRef = doc(collection(db, 'moderators'));
      const moderatorRecord: ModeratorRecord = {
        id: moderatorRef.id,
        ...moderatorData,
        createdAt: serverTimestamp(),
        totalUsage: 0,
        totalEarnings: 0,
        isActive: true,
      };
      
      await setDoc(moderatorRef, moderatorRecord);
      
      // Update user's moderators created
      if (this.currentUser) {
        const currentModerators = this.userProfile?.moderatorsCreated || [];
        await this.updateUserProfile(this.currentUser.uid, {
          moderatorsCreated: [...currentModerators, moderatorRef.id]
        });
      }
      
      return moderatorRef.id;
    } catch (error) {
      console.error('Error creating moderator record:', error);
      throw error;
    }
  }

  // Get user's streams
  async getUserStreams(userId: string): Promise<StreamRecord[]> {
    try {
      if (!db) {
        console.log('ℹ️ Firestore not configured - returning empty streams list');
        return [];
      }

      const q = query(
        collection(db, 'streams'),
        where('streamerId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => doc.data() as StreamRecord);
    } catch (error) {
      console.error('Error getting user streams:', error);
      return [];
    }
  }

  // Get user's moderators
  async getUserModerators(userId: string): Promise<ModeratorRecord[]> {
    try {
      if (!db) {
        console.log('ℹ️ Firestore not configured - returning empty moderators list');
        return [];
      }

      const q = query(
        collection(db, 'moderators'),
        where('creatorId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => doc.data() as ModeratorRecord);
    } catch (error) {
      console.error('Error getting user moderators:', error);
      return [];
    }
  }

  // Connect Twitch account
  async connectTwitchAccount(twitchUsername: string): Promise<void> {
    if (!this.currentUser) throw new Error('User not authenticated');
    
    await this.updateUserProfile(this.currentUser.uid, {
      twitchConnected: true,
      twitchUsername
    });
  }

  // Connect YouTube account
  async connectYouTubeAccount(youtubeChannelId: string): Promise<void> {
    if (!this.currentUser) throw new Error('User not authenticated');
    
    await this.updateUserProfile(this.currentUser.uid, {
      youtubeConnected: true,
      youtubeChannelId
    });
  }

  // Sign out
  async signOut(): Promise<void> {
    if (auth) {
      await signOut(auth);
    }
    this.userProfile = null;
    this.currentUser = null;
    // Clear localStorage data
    localStorage.removeItem('user_profile');
    console.log('👋 User signed out');
  }

  // Event listeners
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  private triggerListeners(event: string, data: any) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  // Getters
  get user(): FirebaseUser | null {
    return this.currentUser;
  }

  get profile(): UserProfile | null {
    return this.userProfile;
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}

export default UserService;
