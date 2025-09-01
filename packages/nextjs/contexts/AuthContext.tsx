"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { useAccount } from "wagmi";
import { useContractService } from "~~/lib/contractService";
import UserService, { UserProfile } from "~~/lib/userService";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isWalletConnected: boolean;
  walletAddress: string | undefined;
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithWallet: (walletAddress?: string, signature?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  contractData: {
    userData: any;
    userBalance: bigint | undefined;
    isRegistered: boolean;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { userData, userBalance, registerUser } = useContractService();

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const userService = UserService.getInstance();

  // Listen for auth state changes from UserService
  useEffect(() => {
    const handleAuthStateChange = ({ user, profile }: { user: User | null; profile: UserProfile | null }) => {
      setUser(user);
      setUserProfile(profile);
      setLoading(false);
    };

    userService.on("authStateChanged", handleAuthStateChange);

    return () => {
      userService.off("authStateChanged", handleAuthStateChange);
    };
  }, [userService]);

  // Auto-authenticate when wallet is connected
  useEffect(() => {
    if (isConnected && address && !user) {
      signInWithWallet(address);
    } else if (!isConnected && user) {
      logout();
    }
  }, [isConnected, address]);

  const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
    // For wallet-based auth, this is handled by signInWithWallet
    console.log("Email signup not implemented - use wallet authentication");
  };

  const signIn = async (email: string, password: string) => {
    // For wallet-based auth, this is handled by signInWithWallet
    console.log("Email signin not implemented - use wallet authentication");
  };

  const signInWithGoogle = async () => {
    // For wallet-based auth, this is handled by signInWithWallet
    console.log("Google signin not implemented - use wallet authentication");
  };

  const signInWithWallet = async (walletAddress?: string, signature?: string) => {
    const addressToUse = walletAddress || address;
    if (!addressToUse) {
      throw new Error("No wallet address provided");
    }

    try {
      setLoading(true);

      // Authenticate with Firebase using wallet address
      const profile = await userService.authenticateWithWallet(addressToUse, signature);

      // Check if user is registered on blockchain
      if (userData && !userData.isRegistered) {
        // Register user on blockchain with profile hash
        const profileHash = `profile_${addressToUse}_${Date.now()}`;
        await registerUser(profileHash);
      }

      console.log("✅ Wallet authentication successful:", profile);
    } catch (error) {
      console.error("❌ Wallet authentication error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await userService.signOut();
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user || !userProfile) {
      throw new Error("User not authenticated");
    }

    try {
      await userService.updateUserProfile(user.uid, data);
    } catch (error) {
      console.error("Profile update error:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    isWalletConnected: isConnected,
    walletAddress: address,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithWallet,
    logout,
    updateUserProfile,
    contractData: {
      userData,
      userBalance,
      isRegistered: userData?.isRegistered || false,
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
