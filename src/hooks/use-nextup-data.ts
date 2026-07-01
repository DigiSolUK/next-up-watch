import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTmdbTrailer, importMoreTmdbTitles } from "@/lib/tmdb-catalog.functions";
import { useAuth } from "./use-auth";
import type { MediaTitle, RatingValue, StreamingProvider, UserRating, UserSettings, WatchStatus, WatchlistItem, TasteProfile } from "@/lib/types";
import { buildTasteProfile, summariseProfile } from "@/lib/recommend";

async function ensureUserBootstrap(userId: string) {
  await Promise.all([
    supabase.from("user_settings").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true }),
    supabase.from("user_profiles").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true }),
  ]);
}


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

export function useImportMoreTmdbTitles() {
  const { session } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = session?.access_token;
      if (!token) throw new Error("Not signed in");

      return importMoreTmdbTitles({
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media_titles"] });
      qc.invalidateQueries({ queryKey: ["streaming"] });
    },
  });
}

export function useTmdbTrailer(mediaTitleId: string | undefined, enabled: boolean) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["tmdb_trailer", mediaTitleId],
    queryFn: async () => {
      const token = session?.access_token;
      if (!mediaTitleId) return null;
      if (!token) throw new Error("Not signed in");

      return getTmdbTrailer({
        data: { mediaTitleId },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    enabled: Boolean(enabled && mediaTitleId && session?.access_token),
    staleTime: 1000 * 60 * 60 * 12,
    retry: 1,
  });
}

export function useStreamingForTitles(titleIds: string[], region = "GB", providerNames: string[] = []) {
  const sortedTitleIds = [...titleIds].sort();
  const sortedProviders = [...providerNames].sort();
  return useQuery({
    queryKey: ["streaming", sortedTitleIds.join(","), region, sortedProviders.join(",")],
    queryFn: async () => {
      if (!sortedTitleIds.length) return {} as Record<string, StreamingProvider[]>;
      let query = supabase
        .from("streaming_availability")
        .select("*")
        .in("media_title_id", sortedTitleIds)
        .eq("region", region);
      if (sortedProviders.length) query = query.in("provider_name", sortedProviders);
      const { data, error } = await query;
      if (error) throw error;
      const out: Record<string, StreamingProvider[]> = {};
      for (const row of data ?? []) {
        (out[row.media_title_id] ??= []).push({
          provider_name: row.provider_name,
          provider_logo_url: row.provider_logo_url,
          availability_type: row.availability_type as StreamingProvider["availability_type"],
          region: row.region,
          watch_url: row.watch_url,
        });
      }
      return out;
    },
    enabled: sortedTitleIds.length > 0,
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
      const result = await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();
      let data = result.data;
      const error = result.error;
      if (error) throw error;
      if (!data) {
        await ensureUserBootstrap(user.id);
        const repaired = await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();
        if (repaired.error) throw repaired.error;
        data = repaired.data;
      }
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
      const result = await supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle();
      let data = result.data;
      const error = result.error;
      if (error) throw error;
      if (!data) {
        await ensureUserBootstrap(user.id);
        const repaired = await supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle();
        if (repaired.error) throw repaired.error;
        data = repaired.data;
      }
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
    mutationFn: async ({ mediaTitleId, rating, mode }: { mediaTitleId: string; rating: RatingValue; mode: "learning" | "recommendation" | "watchlist_followup" | "retaste" }) => {
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
      qc.invalidateQueries({ queryKey: ["watchlist"] });
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
        user_id: user.id,
        media_title_id: mediaTitleId,
        status: "want_to_watch",
        removed_at: null,
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
      const patch: { status: WatchStatus; watched_at?: string | null; removed_at?: string | null } = { status };
      if (status === "want_to_watch" || status === "watching") patch.removed_at = null;
      if (status === "watched") {
        patch.watched_at = new Date().toISOString();
        patch.removed_at = null;
      }
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
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        ...patch,
      }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_settings"] });
      qc.invalidateQueries({ queryKey: ["streaming"] });
    },
  });
}
