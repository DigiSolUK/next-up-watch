import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { importMoreTmdbCatalog } from "@/lib/tmdb-catalog.server";
import type { UserSettings } from "@/lib/types";

export const importMoreTmdbTitles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw error;

    return importMoreTmdbCatalog(data as unknown as UserSettings | null);
  });
