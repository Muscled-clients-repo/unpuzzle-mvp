"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CheckCheck,
  ExternalLink,
  FileText,
  DollarSign,
  Bell,
  Loader2,
} from "lucide-react";
import { Notification } from "@/types/notifications";
import { cn } from "@/lib/utils";

interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRefresh: () => void;
}

export function NotificationList({
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
}: NotificationListProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "track_request":
        return <Bell className="h-4 w-4" />;
      case "daily_note":
        return <FileText className="h-4 w-4" />;
      case "revenue_submission":
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="flex flex-col max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <h3 className="font-semibold">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="h-8 text-xs"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      <Separator />

      {/* Notification List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              No notifications yet
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                icon={getIcon(notification.type)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              asChild
            >
              <Link href="/instructor/notifications">
                View all notifications
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  icon: React.ReactNode;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  icon,
}: NotificationItemProps) {
  const isUnread = !notification.read_at;

  const content = (
    <div
      className={cn(
        "flex gap-3 p-4 hover:bg-accent/50 transition-colors cursor-pointer",
        isUnread && "bg-blue-50/50 dark:bg-blue-950/20"
      )}
      onClick={() => {
        if (isUnread) {
          onMarkAsRead(notification.id);
        }
      }}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
          isUnread
            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-medium", isUnread && "font-semibold")}>
            {notification.title}
          </p>
          {isUnread && (
            <div className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500" />
          )}
        </div>

        {notification.message && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>

      {/* Action Link Icon */}
      {notification.action_url && (
        <div className="flex-shrink-0">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );

  if (notification.action_url) {
    return (
      <Link href={notification.action_url} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
