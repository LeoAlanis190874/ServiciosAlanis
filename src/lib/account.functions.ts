import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "cliente" | "profesional" | "admin";

export type MyAccount = {
  userId: string;
  email: string | null;
  roles: AppRole[];
  isSuperAdmin: boolean;
  profile: {
    full_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    bio: string | null;
    preferred_language: string | null;
    preferred_currency: string | null;
    country_id: string | null;
    address_line: string | null;
  };
  onboardingComplete: boolean;
};

const SUPER_ADMIN_EMAIL = "serviciosalanis.noreply@gmail.com";


export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyAccount> => {
    const { supabase, userId, claims } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "full_name, display_name, avatar_url, phone, bio, preferred_language, preferred_currency, country_id, address_line",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const roleList = (roles ?? []).map((r: any) => r.role as AppRole);
    const p = profile ?? {
      full_name: null,
      display_name: null,
      avatar_url: null,
      phone: null,
      bio: null,
      preferred_language: null,
      preferred_currency: null,
      country_id: null,
      address_line: null,
    };
    const email: string | null = (claims as any)?.email ?? null;
    return {
      userId,
      email,
      roles: roleList,
      isSuperAdmin: (email?.toLowerCase() ?? "") === SUPER_ADMIN_EMAIL,
      profile: p,
      onboardingComplete: Boolean(p.full_name && p.country_id && p.phone),
    };
  });


const profileSchema = z.object({
  full_name: z.string().min(2).max(120),
  display_name: z.string().min(2).max(80).optional().nullable(),
  phone: z.string().min(5).max(30),
  country_id: z.string().uuid(),
  preferred_language: z.enum(["es", "en", "pt"]).default("es"),
  preferred_currency: z.string().min(3).max(3).optional().nullable(),
  address_line: z.string().max(200).optional().nullable(),
  bio: z.string().max(600).optional().nullable(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        display_name: data.display_name ?? data.full_name,
        phone: data.phone,
        country_id: data.country_id,
        preferred_language: data.preferred_language,
        preferred_currency: data.preferred_currency ?? null,
        address_line: data.address_line ?? null,
        bio: data.bio ?? null,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addMyRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ role: z.enum(["cliente", "profesional"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    // Ignore unique violation (already has role)
    if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
    return { ok: true };
  });

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ new_password: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.new_password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMyAvatarUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ avatar_url: z.string().url().max(500).nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: data.avatar_url })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
