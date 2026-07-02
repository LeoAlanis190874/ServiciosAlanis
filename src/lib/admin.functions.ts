import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export type PendingVerification = {
  id: string;
  professional_id: string;
  professional_name: string | null;
  status: string;
  document_type: string | null;
  document_url: string | null;
  notes: string | null;
  created_at: string;
};

export const listPendingVerifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PendingVerification[]> => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("professional_verifications")
      .select("id, professional_id, status, document_type, document_url, notes, created_at, profiles:professional_id(display_name, full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((v: any) => ({
      id: v.id,
      professional_id: v.professional_id,
      professional_name: v.profiles?.display_name ?? v.profiles?.full_name ?? null,
      status: v.status,
      document_type: v.document_type,
      document_url: v.document_url,
      notes: v.notes,
      created_at: v.created_at,
    }));
  });

export const reviewVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["verified", "rejected"]),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { error } = await supabase
      .from("professional_verifications")
      .update({
        status: data.decision,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        notes: data.notes ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type AdminMetrics = {
  users: number;
  requests: number;
  open_requests: number;
  quotes: number;
  reviews: number;
  pending_verifications: number;
};

export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminMetrics> => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const counts = async (table: string, filter?: (q: any) => any) => {
      let q: any = (supabaseAdmin as any).from(table).select("id", { count: "exact", head: true });
      if (filter) q = filter(q);
      const { count, error } = await q;
      if (error) throw new Error(error.message);
      return (count as number | null) ?? 0;
    };

    const [users, requests, openRequests, quotes, reviews, pending] = await Promise.all([
      counts("profiles"),
      counts("service_requests"),
      counts("service_requests", (q) => q.in("status", ["open", "quoted"])),
      counts("quotes"),
      counts("reviews"),
      counts("professional_verifications", (q) => q.eq("status", "pending")),
    ]);

    return {
      users,
      requests,
      open_requests: openRequests,
      quotes,
      reviews,
      pending_verifications: pending,
    };
  });

// ---------- Users management ----------

const SUPER_ADMIN_EMAIL = "serviciosalanis.noreply@gmail.com";

async function getSuperAdminUserId(): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let page = 1;
  // Small scan (auth.admin doesn't support email filter server-side portably)
  for (; page <= 5; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = (data?.users ?? []).find(
      (u) => (u.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL,
    );
    if (hit) return hit.id;
    if (!data || data.users.length < 200) break;
  }
  return null;
}

export type AdminUserRow = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  roles: string[];
  is_super_admin: boolean;
};

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        q: z.string().max(120).optional().nullable(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .partial()
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<AdminUserRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = data.limit ?? 50;
    let q: any = (supabaseAdmin as any)
      .from("profiles")
      .select("id, display_name, full_name, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data.q) q = q.or(`display_name.ilike.%${data.q}%,full_name.ilike.%${data.q}%`);
    const { data: profiles, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (profiles ?? []).map((p: any) => p.id);
    if (ids.length === 0) return [];
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);
    const byUser = new Map<string, string[]>();
    for (const r of (roles ?? []) as any[]) {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    }
    const superId = await getSuperAdminUserId();
    return (profiles ?? []).map((p: any) => ({
      id: p.id,
      display_name: p.display_name,
      full_name: p.full_name,
      is_active: p.is_active,
      created_at: p.created_at,
      roles: byUser.get(p.id) ?? [],
      is_super_admin: superId === p.id,
    }));
  });

async function assertNotSuperAdmin(userId: string) {
  const superId = await getSuperAdminUserId();
  if (superId && superId === userId) {
    throw new Error("El Super Admin está protegido y no puede ser modificado.");
  }
}

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: z.enum(["cliente", "profesional", "admin"]),
        grant: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await assertNotSuperAdmin(data.user_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ user_id: z.string().uuid(), is_active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await assertNotSuperAdmin(data.user_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.is_active })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


// ---------- Categories management ----------

export type AdminCategory = {
  id: string;
  slug: string;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  name_es: string | null;
};

export const listCategoriesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminCategory[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("id, slug, icon, is_active, sort_order, category_translations(name, language_code)")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((c: any) => ({
      id: c.id,
      slug: c.slug,
      icon: c.icon,
      is_active: c.is_active,
      sort_order: c.sort_order,
      name_es:
        (c.category_translations ?? []).find((t: any) => t.language_code === "es")?.name ?? null,
    }));
  });

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional().nullable(),
        slug: z
          .string()
          .min(2)
          .max(60)
          .regex(/^[a-z0-9-]+$/),
        icon: z.string().max(60).optional().nullable(),
        is_active: z.boolean(),
        sort_order: z.number().int().min(0).max(9999),
        name_es: z.string().min(1).max(120),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let categoryId = data.id ?? null;
    if (categoryId) {
      const { error } = await (supabaseAdmin as any)
        .from("categories")
        .update({
          slug: data.slug,
          icon: data.icon ?? null,
          is_active: data.is_active,
          sort_order: data.sort_order,
        })
        .eq("id", categoryId);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await (supabaseAdmin as any)
        .from("categories")
        .insert({
          slug: data.slug,
          icon: data.icon ?? null,
          is_active: data.is_active,
          sort_order: data.sort_order,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      categoryId = (inserted as any).id;
    }

    const { error: tErr } = await (supabaseAdmin as any)
      .from("category_translations")
      .upsert(
        { category_id: categoryId!, language_code: "es", name: data.name_es },
        { onConflict: "category_id,language_code" },
      );
    if (tErr) throw new Error(tErr.message);
    return { ok: true, id: categoryId };
  });
