import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ProfessionalListItem = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country_id: string | null;
  categories: { category_id: string; name: string; slug: string; hourly_rate: number | null; currency_code: string | null }[];
  rating_avg: number | null;
  rating_count: number;
  verified: boolean;
};

const filterSchema = z
  .object({
    category_slug: z.string().min(1).max(80).optional().nullable(),
    country_id: z.string().uuid().optional().nullable(),
    q: z.string().max(120).optional().nullable(),
    sort: z.enum(["rating", "recent"]).optional().nullable(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .partial();


export const searchProfessionals = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => filterSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<ProfessionalListItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = data.limit ?? 30;

    let category_id: string | null = null;
    if (data.category_slug) {
      const { data: cat } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("slug", data.category_slug)
        .maybeSingle();
      category_id = (cat as any)?.id ?? null;
      if (!category_id) return [];
    }

    // Verified professionals only
    const { data: verifs, error: vErr } = await supabaseAdmin
      .from("professional_verifications")
      .select("professional_id, status")
      .eq("status", "verified")
      .limit(1000);
    if (vErr) throw new Error(vErr.message);
    const verifiedIds = Array.from(new Set((verifs ?? []).map((v: any) => v.professional_id)));
    if (verifiedIds.length === 0) return [];

    // Filter by category membership if requested
    let candidateIds = verifiedIds;
    if (category_id) {
      const { data: pcs } = await supabaseAdmin
        .from("professional_categories")
        .select("professional_id")
        .eq("category_id", category_id)
        .in("professional_id", verifiedIds);
      candidateIds = Array.from(new Set((pcs ?? []).map((p: any) => p.professional_id)));
      if (candidateIds.length === 0) return [];
    }

    // Profiles
    let pQuery = supabaseAdmin
      .from("profiles")
      .select("id, display_name, full_name, avatar_url, bio, country_id, is_active")
      .in("id", candidateIds)
      .eq("is_active", true)
      .limit(limit);
    if (data.country_id) pQuery = pQuery.eq("country_id", data.country_id);
    if (data.q) pQuery = pQuery.or(`display_name.ilike.%${data.q}%,full_name.ilike.%${data.q}%`);

    const { data: profiles, error: pErr } = await pQuery;
    if (pErr) throw new Error(pErr.message);
    const ids = (profiles ?? []).map((p: any) => p.id);
    if (ids.length === 0) return [];

    const [{ data: pcats }, { data: cats }, { data: reviews }] = await Promise.all([
      supabaseAdmin
        .from("professional_categories")
        .select("professional_id, category_id, hourly_rate, currency_code")
        .in("professional_id", ids),
      supabaseAdmin
        .from("categories")
        .select("id, slug, category_translations(name, language_code)")
        .eq("category_translations.language_code", "es"),
      supabaseAdmin.from("reviews").select("reviewee_id, rating, is_visible").in("reviewee_id", ids),
    ]);

    const catById = new Map<string, { slug: string; name: string }>();
    for (const c of (cats ?? []) as any[]) {
      catById.set(c.id, { slug: c.slug, name: c.category_translations?.[0]?.name ?? c.slug });
    }

    const ratings = new Map<string, { sum: number; n: number }>();
    for (const r of (reviews ?? []) as any[]) {
      if (!r.is_visible) continue;
      const cur = ratings.get(r.reviewee_id) ?? { sum: 0, n: 0 };
      cur.sum += Number(r.rating);
      cur.n += 1;
      ratings.set(r.reviewee_id, cur);
    }

    const items = (profiles ?? []).map((p: any) => {
      const mine = ((pcats ?? []) as any[]).filter((c) => c.professional_id === p.id);
      const r = ratings.get(p.id);
      return {
        id: p.id,
        display_name: p.display_name,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        bio: p.bio,
        country_id: p.country_id,
        categories: mine.map((c) => ({
          category_id: c.category_id,
          name: catById.get(c.category_id)?.name ?? "",
          slug: catById.get(c.category_id)?.slug ?? "",
          hourly_rate: c.hourly_rate,
          currency_code: c.currency_code,
        })),
        rating_avg: r ? Math.round((r.sum / r.n) * 10) / 10 : null,
        rating_count: r?.n ?? 0,
        verified: true,
      };
    });

    if (data.sort === "rating") {
      items.sort((a, b) => {
        const ra = a.rating_avg ?? -1;
        const rb = b.rating_avg ?? -1;
        if (rb !== ra) return rb - ra;
        return b.rating_count - a.rating_count;
      });
    }
    return items;
  });


export const getProfessionalPublic = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, full_name, avatar_url, bio, country_id, is_active")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile || !(profile as any).is_active) return null;

    const [{ data: verif }, { data: pcats }, { data: cats }, { data: reviews }, { data: country }] = await Promise.all([
      supabaseAdmin
        .from("professional_verifications")
        .select("status")
        .eq("professional_id", data.id)
        .eq("status", "verified")
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("professional_categories")
        .select("category_id, hourly_rate, currency_code, years_experience")
        .eq("professional_id", data.id),
      supabaseAdmin
        .from("categories")
        .select("id, slug, category_translations(name, language_code)")
        .eq("category_translations.language_code", "es"),
      supabaseAdmin
        .from("reviews")
        .select("id, rating, comment, created_at, is_visible")
        .eq("reviewee_id", data.id)
        .eq("is_visible", true)
        .order("created_at", { ascending: false })
        .limit(20),
      (profile as any).country_id
        ? supabaseAdmin.from("countries").select("name, iso2").eq("id", (profile as any).country_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const catById = new Map<string, { slug: string; name: string }>();
    for (const c of (cats ?? []) as any[]) {
      catById.set(c.id, { slug: c.slug, name: c.category_translations?.[0]?.name ?? c.slug });
    }
    const ratings = (reviews ?? []) as any[];
    const avg = ratings.length ? ratings.reduce((s, r) => s + Number(r.rating), 0) / ratings.length : null;

    return {
      id: (profile as any).id,
      display_name: (profile as any).display_name,
      full_name: (profile as any).full_name,
      avatar_url: (profile as any).avatar_url,
      bio: (profile as any).bio,
      country: country ? { name: (country as any).name, iso2: (country as any).iso2 } : null,
      verified: !!verif,
      categories: ((pcats ?? []) as any[]).map((c) => ({
        category_id: c.category_id,
        name: catById.get(c.category_id)?.name ?? "",
        slug: catById.get(c.category_id)?.slug ?? "",
        hourly_rate: c.hourly_rate,
        currency_code: c.currency_code,
        years_experience: c.years_experience,
      })),
      rating_avg: avg ? Math.round(avg * 10) / 10 : null,
      rating_count: ratings.length,
      reviews: ratings.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
      })),
    };
  });
