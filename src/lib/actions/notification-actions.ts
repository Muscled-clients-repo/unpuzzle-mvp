"use server";

import { createClient } from "@/lib/supabase/server";
import { Notification, NotificationType } from "@/types/notifications";
import { revalidatePath } from "next/cache";

/**
 * Get notifications for the current user
 */
export async function getNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<{ data: Notification[] | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "Unauthorized" };
  }

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (options?.unreadOnly) {
    query = query.is("read_at", null);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching notifications:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Get unread notification count for the current user
 */
export async function getUnreadNotificationCount(): Promise<{
  data: number | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "Unauthorized" };
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Error fetching unread count:", error);
    return { data: null, error: error.message };
  }

  return { data: count ?? 0, error: null };
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/instructor");
  return { success: true, error: null };
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/instructor");
  return { success: true, error: null };
}

/**
 * Create a notification (should be called from server-side code only)
 * Note: This bypasses RLS by using the service role client
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  metadata?: Record<string, any>;
  actionUrl?: string;
}): Promise<{ success: boolean; error: string | null; data?: Notification }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      metadata: params.metadata ?? {},
      action_url: params.actionUrl,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating notification:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/instructor");
  return { success: true, error: null, data };
}
