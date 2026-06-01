import { supabase } from "./supabase";

// Records a user activity event. Fire-and-forget — never blocks the UI.
export async function logActivity(eventType, eventDetail = null, metadata = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let userName = user.email;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    if (profile?.full_name) userName = profile.full_name;

    await supabase.from("activity_log").insert({
      user_id: user.id,
      user_email: user.email,
      user_name: userName,
      event_type: eventType,
      event_detail: eventDetail,
      metadata: metadata,
    });
  } catch (e) {
    console.error("logActivity failed:", e);
  }
}
