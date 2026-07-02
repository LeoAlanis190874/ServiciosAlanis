import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RequestStatus =
  | "draft"
  | "open"
  | "quoted"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

export type Urgency = "low" | "normal" | "high" | "urgent";

export type MyRequestRow = {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  urgency: Urgency;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string | null;
  category_name: string;
  category_slug: string;
  created_at: string;
};

export const listMyRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyRequestRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("service_requests")
      .select(
        "id, title, description, status, urgency, budget_min, budget_max, budget_currency, created_at, categories!inner(slug, category_translations(name, language_code))",
      )
      .eq("client_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => {
      const tr = (r.categories?.category_translations ?? []).find(
        (t: any) => t.language_code === "es",
      );
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status,
        urgency: r.urgency,
        budget_min: r.budget_min,
        budget_max: r.budget_max,
        budget_currency: r.budget_currency,
        category_name: tr?.name ?? r.categories?.slug ?? "",
        category_slug: r.categories?.slug ?? "",
        created_at: r.created_at,
      };
    });
  });

export const getMyRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("service_requests")
      .select(
        "id, title, description, status, urgency, budget_min, budget_max, budget_currency, address_line, preferred_date, created_at, categories!inner(slug, category_translations(name, language_code))",
      )
      .eq("id", data.id)
      .eq("client_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Solicitud no encontrada");
    const tr = (row.categories as any)?.category_translations?.find(
      (t: any) => t.language_code === "es",
    );
    return {
      ...row,
      category_name: tr?.name ?? (row.categories as any)?.slug ?? "",
      category_slug: (row.categories as any)?.slug ?? "",
    };
  });

const createSchema = z.object({
  category_id: z.string().uuid(),
  title: z.string().min(5).max(120),
  description: z.string().min(20).max(2000),
  urgency: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  budget_min: z.number().nonnegative().nullable().optional(),
  budget_max: z.number().nonnegative().nullable().optional(),
  budget_currency: z.string().length(3).optional().nullable(),
  address_line: z.string().max(200).optional().nullable(),
  preferred_date: z.string().optional().nullable(),
});

export const createServiceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("service_requests")
      .insert({
        client_id: userId,
        category_id: data.category_id,
        title: data.title,
        description: data.description,
        urgency: data.urgency,
        status: "open",
        budget_min: data.budget_min ?? null,
        budget_max: data.budget_max ?? null,
        budget_currency: data.budget_currency ?? null,
        address_line: data.address_line ?? null,
        preferred_date: data.preferred_date ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const transitionRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        request_id: z.string().uuid(),
        new_status: z.enum(["in_progress", "completed", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("transition_request_status", {
      _request_id: data.request_id,
      _new_status: data.new_status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
