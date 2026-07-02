import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProfessionalProfile = {
  bio: string | null;
  categories: { category_id: string; hourly_rate: number | null; currency_code: string | null; years_experience: number | null }[];
  coverage: { id: string; country_id: string | null; service_radius_km: number | null }[];
  verification: {
    status: "pending" | "verified" | "rejected" | "unverified" | null;
    document_type: string | null;
    document_url: string | null;
    notes: string | null;
    reviewed_at: string | null;
  } | null;
};

export const getMyProfessionalProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfessionalProfile> => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: cats }, { data: cov }, { data: verif }] = await Promise.all([
      supabase.from("profiles").select("bio").eq("id", userId).maybeSingle(),
      supabase
        .from("professional_categories")
        .select("category_id, hourly_rate, currency_code, years_experience")
        .eq("professional_id", userId),
      supabase
        .from("professional_coverage")
        .select("id, country_id, service_radius_km")
        .eq("professional_id", userId),
      supabase
        .from("professional_verifications")
        .select("status, document_type, document_url, notes, reviewed_at")
        .eq("professional_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      bio: profile?.bio ?? null,
      categories: (cats ?? []) as any,
      coverage: (cov ?? []) as any,
      verification: (verif ?? null) as any,
    };
  });

export const setProfessionalCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        items: z
          .array(
            z.object({
              category_id: z.string().uuid(),
              hourly_rate: z.number().nonnegative().optional().nullable(),
              currency_code: z.string().length(3).optional().nullable(),
              years_experience: z.number().int().min(0).max(80).optional().nullable(),
            }),
          )
          .max(30),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Replace strategy
    await supabase.from("professional_categories").delete().eq("professional_id", userId);
    if (data.items.length > 0) {
      const rows = data.items.map((i) => ({ professional_id: userId, ...i }));
      const { error } = await supabase.from("professional_categories").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setProfessionalCoverage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        items: z
          .array(
            z.object({
              country_id: z.string().uuid(),
              service_radius_km: z.number().int().min(1).max(2000).optional().nullable(),
            }),
          )
          .max(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("professional_coverage").delete().eq("professional_id", userId);
    if (data.items.length > 0) {
      const rows = data.items.map((i) => ({ professional_id: userId, ...i }));
      const { error } = await supabase.from("professional_coverage").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const submitVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        document_type: z.string().min(2).max(60),
        document_url: z.string().url().max(500),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("professional_verifications").insert({
      professional_id: userId,
      status: "pending",
      document_type: data.document_type,
      document_url: data.document_url,
      notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
