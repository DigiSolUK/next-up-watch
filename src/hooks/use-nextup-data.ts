import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import type { MediaTitle, RatingValue, UserRating, UserSettings, WatchStatus, WatchlistItem, TasteProfile } from "@/lib/types";
import { buildTasteProfile, summariseProfile } from "@/lib/recommend";

export function useMediaTitles() {
  return useQuery({
    queryKey: ["media_titles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("media_titles").select("*").limit(500);
      if (error) throw error;
      return (data ?? []) as MediaTitle[];
    },
  });
}

export function useStreamingForTitles(titleIds: string[]) {
  return useQuery({
    queryKey: ["streaming", titleIds.sort().join(",")],
    queryFn: async () => {
      if (!titleIds.length) return {} as Record<string, { provider_name: string; availability_type: string; watch_url: string | null }[]>;
      const { data, error } = await supabase
        .from("streaming_availability")
        .select("*")
        .in("media_title_id", titleIds);
      if (error) throw error;
      const out: Record<string, { provider_name: string; availability_type: string; watch_url: string | null }[]> = {};
      for (const row of data ?? []) {
        (out[row.media_title_id] ??= []).push({
          provider_name: row.provider_name,
          availability_type: row.availability_type,
          watch_url: row.watch_url,
        });
      }
      return out;
    },
    enabled: titleIds.length > 0,
  });
}

export function useUserRatings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_ratings", user?.id],
    queryFn: async () => {
      if (!user) return [] as UserRating[];
      const { data, error } = await supabase
        .from("user_ratings")
        .select("*")
        .eq("user_id", user.id)
        .order("rated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UserRating[];
    },
    enabled: !!user,
  });
}

export function useUserSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_settings", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data as unknown as UserSettings | null;
    },
    enabled: !!user,
  });
}

export function useWatchlist() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["watchlist", user?.id],
    queryFn: async () => {
      if (!user) return [] as WatchlistItem[];
      const { data, error } = await supabase
        .from("watchlist")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "removed")
        .order("added_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WatchlistItem[];
    },
    enabled: !!user,
  });
}

export function useUserProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

async function recomputeAndSaveProfile(userId: string, threshold: number) {
  const [{ data: ratings }, { data: titles }] = await Promise.all([
    supabase.from("user_ratings").select("*").eq("user_id", userId),
    supabase.from("media_titles").select("*"),
  ]);
  const titleMap = new Map<string, MediaTitle>();
  for (const t of (titles ?? []) as MediaTitle[]) titleMap.set(t.id, t);
  const joined = ((ratings ?? []) as UserRating[]).map((r) => ({ ...r, media: titleMap.get(r.media_title_id) ?? null }));
  const tp: TasteProfile = buildTasteProfile(joined);
  const ratedCount = joined.filter((r) => r.rating_value !== "not_seen").length;
  const ready = ratedCount >= threshold;
  const confidence = Math.min(1, ratedCount / Math.max(threshold, 1));
  const summary = summariseProfile(tp, ratedCount);
  await supabase.from("user_profiles").upsert({
    user_id: userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: tp as any,
    ratings_count: ratedCount,
    recommendation_ready: ready,
    recommendation_readiness_score: confidence,
    confidence_score: confidence,
    profile_summary: summary,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

}

export function useRateTitle() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mediaTitleId, rating, mode }: { mediaTitleId: string; rating: RatingValue; mode: "learning" | "recommendation" | "watchlist_followup" }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("user_ratings").upsert({
        user_id: user.id,
        media_title_id: mediaTitleId,
        rating_value: rating,
        source_mode: mode,
        rated_at: new Date().toISOString(),
      }, { onConflict: "user_id,media_title_id" });
      if (error) throw error;
      await supabase.from("recommendation_events").insert({
        user_id: user.id,
        media_title_id: mediaTitleId,
        event_type: `rated_${rating}`,
        event_value: { mode },
      });
      const { data: s } = await supabase.from("user_settings").select("learning_threshold").eq("user_id", user.id).maybeSingle();
      await recomputeAndSaveProfile(user.id, s?.learning_threshold ?? 50);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_ratings"] });
      qc.invalidateQueries({ queryKey: ["user_profile"] });
    },
  });
}

export function useAddToWatchlist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mediaTitleId: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("watchlist").upsert({
        user_id: user.id, media_title_id: mediaTitleId, status: "want_to_watch",
      }, { onConflict: "user_id,media_title_id" });
      if (error) throw error;
      await supabase.from("recommendation_events").insert({
        user_id: user.id, media_title_id: mediaTitleId, event_type: "added_to_watchlist",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}

export function useUpdateWatchlistStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mediaTitleId, status }: { mediaTitleId: string; status: WatchStatus }) => {
      if (!user) throw new Error("Not signed in");
      const patch: { status: WatchStatus; watched_at?: string; removed_at?: string } = { status };
      if (status === "watched") patch.watched_at = new Date().toISOString();
      if (status === "removed") patch.removed_at = new Date().toISOString();
      const { error } = await supabase.from("watchlist").update(patch).eq("user_id", user.id).eq("media_title_id", mediaTitleId);
      if (error) throw error;

    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}

export function useLogEvent() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ mediaTitleId, eventType, eventValue }: { mediaTitleId: string; eventType: string; eventValue?: Record<string, unknown> }) => {
      if (!user) return;
      await supabase.from("recommendation_events").insert({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user_id: user.id, media_title_id: mediaTitleId, event_type: eventType, event_value: (eventValue ?? null) as any,
      });
    },

  });
}

export function useUpdateSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("user_settings").update(patch).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_settings"] }),
  });
}
