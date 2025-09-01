// User service for authentication and user management
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
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
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
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
  interests: string[];
  notificationSettings: {
    streamStarted: boolean;
    newFollower: boolean;
    moderatorAlerts: boolean;
  };
}

export interface StreamRecord {
  id: string;
  streamerId: string;
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

  // Create user with email and password
  async createUserWithEmail(email: string, password: string, userData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      if (auth && db) {
        // Use Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email || email,
          displayName: userData.displayName || email.split('@')[0],
          username: userData.username,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          totalStreams: 0,
          totalViewTime: 0,
          totalEarnings: 0,
          moderatorsCreated: [],
          twitchConnected: false,
          youtubeConnected: false,
          preferredModerators: [],
          interests: userData.interests || [],
          notificationSettings: {
            streamStarted: true,
            newFollower: true,
            moderatorAlerts: true,
          },
        };

        await setDoc(doc(db, 'users', user.uid), profile);
        this.userProfile = profile;
        return profile;
      } else {
        // Use localStorage fallback
        const userId = `user_${Date.now()}`;
        const profile: UserProfile = {
          uid: userId,
          email,
          displayName: userData.displayName || email.split('@')[0],
          username: userData.username,
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          totalStreams: 0,
          totalViewTime: 0,
          totalEarnings: 0,
          moderatorsCreated: [],
          twitchConnected: false,
          youtubeConnected: false,
          preferredModerators: [],
          interests: userData.interests || [],
          notificationSettings: {
            streamStarted: true,
            newFollower: true,
            moderatorAlerts: true,
          },
        };

        localStorage.setItem(`pandapi_user_${userId}`, JSON.stringify(profile));
        localStorage.setItem('pandapi_current_user', userId);
        this.userProfile = profile;
        this.triggerListeners('authStateChanged', { user: { uid: userId }, profile });
        return profile;
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<UserProfile> {
    try {
      if (auth) {
        // Use Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update last login
        if (db) {
          await updateDoc(doc(db, 'users', user.uid), {
            lastLoginAt: serverTimestamp()
          });
        }
        
        return this.userProfile!;
      } else {
        // Use localStorage fallback - for demo purposes
        throw new Error('Email/password authentication requires Firebase configuration');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<UserProfile> {
    try {
      if (auth && db) {
        // Use Firebase
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;
        
        // Check if user profile exists
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          // Create new profile
          const profile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'User',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            totalStreams: 0,
            totalViewTime: 0,
            totalEarnings: 0,
            moderatorsCreated: [],
            twitchConnected: false,
            youtubeConnected: false,
            preferredModerators: [],
            interests: [],
            notificationSettings: {
              streamStarted: true,
              newFollower: true,
              moderatorAlerts: true,
            },
          };
          
          await setDoc(doc(db, 'users', user.uid), profile);
          this.userProfile = profile;
        } else {
          // Update last login
          await updateDoc(doc(db, 'users', user.uid), {
            lastLoginAt: serverTimestamp()
          });
        }
        
        return this.userProfile!;
      } else {
        // Use localStorage fallback
        const userId = `google_user_${Date.now()}`;
        const profile: UserProfile = {
          uid: userId,
          email: 'demo@example.com',
          displayName: 'Demo User',
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          totalStreams: 0,
          totalViewTime: 0,
          totalEarnings: 0,
          moderatorsCreated: [],
          twitchConnected: false,
          youtubeConnected: false,
          preferredModerators: [],
          interests: [],
          notificationSettings: {
            streamStarted: true,
            newFollower: true,
            moderatorAlerts: true,
          },
        };

        localStorage.setItem(`pandapi_user_${userId}`, JSON.stringify(profile));
        localStorage.setItem('pandapi_current_user', userId);
        this.userProfile = profile;
        this.triggerListeners('authStateChanged', { user: { uid: userId }, profile });
        return profile;
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  // Load user profile
  async loadUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      if (db) {
        // Use Firebase
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          this.userProfile = userDoc.data() as UserProfile;
          return this.userProfile;
        }
      } else {
        // Use localStorage
        const stored = localStorage.getItem(`pandapi_user_${uid}`);
        if (stored) {
          this.userProfile = JSON.parse(stored) as UserProfile;
          return this.userProfile;
        }
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
      if (db) {
        // Use Firebase
        await updateDoc(doc(db, 'users', uid), updates);
      } else {
        // Use localStorage
        if (this.userProfile && this.userProfile.uid === uid) {
          this.userProfile = { 
            ...this.userProfile, 
            ...updates,
            lastLoginAt: Date.now()
          };
          localStorage.setItem(`pandapi_user_${uid}`, JSON.stringify(this.userProfile));
        }
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    if (auth) {
      await signOut(auth);
    }
    this.userProfile = null;
    this.currentUser = null;
    localStorage.removeItem('pandapi_current_user');
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
    return this.currentUser !== null || localStorage.getItem('pandapi_current_user') !== null;
  }
}

export default UserService;