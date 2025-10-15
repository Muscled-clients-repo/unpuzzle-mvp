"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/actions/notification-actions";
import { Notification } from "@/types/notifications";
import { NotificationList } from "./NotificationList";
import { createClient } from "@/lib/supabase/client";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load initial notifications
  const loadNotifications = async () => {
    setLoading(true);
    const { data } = await getNotifications({ limit: 10 });
    if (data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  // Load unread count
  const loadUnreadCount = async () => {
    const { data } = await getUnreadNotificationCount();
    if (data !== null) {
      setUnreadCount(data);
    }
  };

  // Initial load
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            // Add new notification to the list
            setNotifications((prev) => [
              payload.new as Notification,
              ...prev.slice(0, 9),
            ]);
            // Increment unread count
            setUnreadCount((prev) => prev + 1);
          } else if (payload.eventType === "UPDATE") {
            // Update notification in the list
            setNotifications((prev) =>
              prev.map((notif) =>
                notif.id === payload.new.id
                  ? (payload.new as Notification)
                  : notif
              )
            );
            // If notification was marked as read, decrement unread count
            if (
              payload.old &&
              !payload.old.read_at &&
              payload.new.read_at
            ) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    // Update local state
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId
          ? { ...notif, read_at: new Date().toISOString() }
          : notif
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    // Update local state
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <NotificationList
          notifications={notifications}
          loading={loading}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onRefresh={loadNotifications}
        />
      </PopoverContent>
    </Popover>
  );
}
