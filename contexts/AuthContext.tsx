"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import UserService, { UserProfile } from "~/lib/userService";

interface AuthContextType {
  user: any | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
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
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const userService = UserService.getInstance();

  // Listen for auth state changes from UserService
  useEffect(() => {
    const handleAuthStateChange = ({ user, profile }: { user: any | null; profile: UserProfile | null }) => {
      setUser(user);
      setUserProfile(profile);
      setLoading(false);
    };

    userService.on("authStateChanged", handleAuthStateChange);

    return () => {
      userService.off("authStateChanged", handleAuthStateChange);
    };
  }, [userService]);

  const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
    try {
      setLoading(true);
      const profile = await userService.createUserWithEmail(email, password, userData);
      console.log("✅ User signup successful:", profile);
    } catch (error) {
      console.error("❌ Signup error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const profile = await userService.signInWithEmail(email, password);
      console.log("✅ User signin successful:", profile);
    } catch (error) {
      console.error("❌ Signin error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const profile = await userService.signInWithGoogle();
      console.log("✅ Google signin successful:", profile);
    } catch (error) {
      console.error("❌ Google signin error:", error);
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
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};