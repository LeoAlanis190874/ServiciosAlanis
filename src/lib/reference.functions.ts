import { createServerFn } from "@tanstack/react-start";

export type CountryOption = { id: string; iso2: string; name: string; default_currency: string | null; default_language: string | null };

export const getActiveCountries = createServerFn({ method: "GET" }).handler(
  async (): Promise<CountryOption[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("countries")
      .select("id, iso2, name, default_currency, default_language")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
);
