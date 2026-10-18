'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import { Bell, CheckCheck, Clock, Calendar, CheckCircle2, XCircle } from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{
        success: boolean;
        unreadCount: number;
        notifications: any[];
      }>('/notifications');

      if (res.success) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadNotifications();
    }
  }, [user, authLoading]);

  // Real-time listener for incoming notifications
  useEffect(() => {
    const handleNewNotification = (e: any) => {
      if (e.detail) {
        setNotifications((prev) => [e.detail, ...prev]);
        setUnreadCount((c) => c + 1);
      } else {
        loadNotifications();
      }
    };

    window.addEventListener('playnear:notification', handleNewNotification);
    return () => {
      window.removeEventListener('playnear:notification', handleNewNotification);
    };
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await apiFetch('/notifications/read-all', { method: 'PATCH' });
      if (res.success) {
        showToast('All notifications marked as read', 'success');
        loadNotifications();
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating notifications', 'error');
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      loadNotifications();
    } catch {}
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-emerald-600" />
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Stay updated on play invites, confirmations, and community sessions.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => {
            const dateObj = new Date(n.createdAt);

            return (
              <div
                key={n._id}
                onClick={() => !n.read && handleMarkSingleRead(n._id)}
                className={`glass-card p-4 rounded-2xl flex items-start gap-3.5 transition-all cursor-pointer ${
                  !n.read ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200/80 bg-white'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    n.type === 'request_accepted'
                      ? 'bg-emerald-100 text-emerald-700'
                      : n.type === 'request_received'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {n.type === 'request_accepted' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : n.type === 'request_declined' ? (
                    <XCircle className="w-5 h-5" />
                  ) : (
                    <Calendar className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">{n.title}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                </div>

                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-2" />
                )}
              </div>
            );
          })
        ) : (
          <div className="glass-card p-12 text-center space-y-2">
            <Bell className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No notifications right now</h3>
            <p className="text-xs text-slate-500">
              When players invite you or respond to requests, you will see notifications here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
