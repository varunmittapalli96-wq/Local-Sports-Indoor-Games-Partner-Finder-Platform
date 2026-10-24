'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';

export interface UserProfile {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'user' | 'organizer' | 'admin';
  gender?: string;
  ageGroup?: string;
  photo?: string;
  bio?: string;
  locality: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  contactPreference?: string;
  contactValue?: string;
  playingLocations?: string[];
  primaryVenue?: string;
  emailVerified?: boolean;
  womenOnlyPlay?: boolean;
  publicPlacesOnly?: boolean;
  games?: any[];
  availability?: any[];
  blockedUsers?: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile | null>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updatedData: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch<{ success: boolean; user: UserProfile }>('/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<UserProfile | null> => {
    const res = await apiFetch<{ success: boolean; user: UserProfile; token?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.user) {
      if (res.token && typeof window !== 'undefined') {
        localStorage.setItem('playnear_token', res.token);
      }
      setUser(res.user);
      await refreshUser(); // Load full profile including games & availability
      return res.user;
    }
    return null;
  };

  const register = async (data: any) => {
    const res = await apiFetch<{ success: boolean; user: UserProfile; token?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.success && res.user) {
      if (res.token && typeof window !== 'undefined') {
        localStorage.setItem('playnear_token', res.token);
      }
      setUser(res.user);
      await refreshUser();
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('playnear_token');
      }
      setUser(null);
    }
  };

  const updateUser = (updatedData: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : null));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
