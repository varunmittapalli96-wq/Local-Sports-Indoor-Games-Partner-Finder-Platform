'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export interface LiveActivity {
  id?: string;
  action: string;
  title: string;
  description: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, any>;
  timestamp: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineCount: number;
  liveActivities: LiveActivity[];
  unreadNotificationsCount: number;
  setUnreadNotificationsCount: React.Dispatch<React.SetStateAction<number>>;
  incrementUnreadCount: () => void;
  resetUnreadCount: () => void;
  playNotificationSound: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Web Audio API non-intrusive sound synthesizer
const playSubtleChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // User hasn't interacted with document yet or AudioContext restricted
  }
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [liveActivities, setLiveActivities] = useState<LiveActivity[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);

  const incrementUnreadCount = useCallback(() => {
    setUnreadNotificationsCount((prev) => prev + 1);
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadNotificationsCount(0);
  }, []);

  const playNotificationSound = useCallback(() => {
    playSubtleChime();
  }, []);

  useEffect(() => {
    // Determine socket backend URL
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || rawApiUrl.replace(/\/api\/v1\/?$/, '');

    const token = typeof window !== 'undefined' ? localStorage.getItem('playnear_token') : undefined;

    const newSocket = io(socketUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('[PlayNear Realtime] Connected to WebSocket server with ID:', newSocket.id);
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('[PlayNear Realtime] Disconnected from WebSocket server:', reason);
    });

    // Real-time online user presence
    newSocket.on('presence:online_count', (data: { onlineCount: number }) => {
      if (typeof data?.onlineCount === 'number') {
        setOnlineCount(Math.max(1, data.onlineCount));
      }
    });

    // Real-time in-app notification arrival
    newSocket.on('notification:new', (notification: any) => {
      incrementUnreadCount();
      playSubtleChime();

      showToast(notification.title || 'New Notification', 'success');

      // Dispatch global window event for components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('playnear:notification', { detail: notification }));
      }
    });

    // Real-time Play Request Updates
    const handleRequestEvent = (payload: any) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('playnear:request', { detail: payload }));
      }

      if (payload.type === 'created') {
        playSubtleChime();
        showToast('Incoming play invitation received! 🏸', 'info');
      } else if (payload.type === 'accepted') {
        playSubtleChime();
        showToast('Your play request was accepted! Phone & contact info unlocked! 🎉', 'success');
      } else if (payload.type === 'cancelled') {
        showToast('A scheduled play session was cancelled.', 'info');
      } else if (payload.type === 'completed') {
        showToast('Play session recorded as completed! 🏆', 'success');
      }
    };

    newSocket.on('request:update', handleRequestEvent);
    newSocket.on('request:created', handleRequestEvent);
    newSocket.on('request:accepted', handleRequestEvent);
    newSocket.on('request:declined', handleRequestEvent);
    newSocket.on('request:cancelled', handleRequestEvent);
    newSocket.on('request:completed', handleRequestEvent);

    // Live platform activity stream
    newSocket.on('activity:new', (activity: LiveActivity) => {
      setLiveActivities((prev) => [activity, ...prev.slice(0, 19)]);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('playnear:activity', { detail: activity }));
      }
    });

    // Admin real-time alerts
    newSocket.on('admin:new_report', (reportData: any) => {
      playSubtleChime();
      showToast(`🚨 New Player Report Filed: ${reportData.reason}`, 'error');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('playnear:admin_report', { detail: reportData }));
      }
    });

    newSocket.on('admin:activity_new', (activity: LiveActivity) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('playnear:admin_activity', { detail: activity }));
      }
    });

    newSocket.on('admin:user_updated', (userData: any) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('playnear:admin_user_update', { detail: userData }));
      }
    });

    // User account status changes (e.g. suspended by admin)
    newSocket.on('user:status_changed', (data: { status: string }) => {
      if (data.status === 'suspended') {
        alert('Your account has been suspended by an administrator.');
        window.location.href = '/login';
      }
    });

    return () => {
      newSocket.removeAllListeners();
      newSocket.disconnect();
    };
  }, [user?._id, showToast, incrementUnreadCount]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineCount,
        liveActivities,
        unreadNotificationsCount,
        setUnreadNotificationsCount,
        incrementUnreadCount,
        resetUnreadCount,
        playNotificationSound,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
