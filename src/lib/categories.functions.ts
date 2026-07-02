import { createServerFn } from "@tanstack/react-start";

export type PublicCategory = {
  id: string;
  slug: string;
  icon: string | null;
  name: string;
  description: string | null;
};

export const getActiveCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicCategory[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select(
        "id, slug, icon, sort_order, category_translations!inner(name, description, language_code)",
      )
      .eq("is_active", true)
      .is("parent_id", null)
      .eq("category_translations.language_code", "es")
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map((c: any) => ({
      id: c.id,
      slug: c.slug,
      icon: c.icon,
      name: c.category_translations?.[0]?.name ?? c.slug,
      description: c.category_translations?.[0]?.description ?? null,
    }));
  },
);
