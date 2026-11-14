import { supabase } from "@/integrations/supabase/client";

export async function setNotifications(userId: string, enabled: boolean) {
  const { error } = await supabase.from("profiles").update({
    email_notifications_enabled: enabled,
    email_notifications_updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return error;
}