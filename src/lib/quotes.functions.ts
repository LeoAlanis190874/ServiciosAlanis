import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type QuoteStatus = "pending" | "accepted" | "rejected" | "withdrawn" | "expired";

export type OpportunityRow = {
  id: string;
  title: string;
  description: string;
  urgency: string;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string | null;
  category_name: string;
  category_slug: string;
  created_at: string;
};

// Lists open service requests visible to the current professional (via RLS).
export const listOpportunities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OpportunityRow[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("service_requests")
      .select(
        "id, title, description, urgency, budget_min, budget_max, budget_currency, created_at, categories!inner(slug, category_translations(name, language_code))",
      )
      .in("status", ["open", "quoted"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => {
      const tr = (r.categories?.category_translations ?? []).find(
        (t: any) => t.language_code === "es",
      );
      return {
        id: r.id,
        title: r.title,
        description: r.description,
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

export const getOpportunity = createServerFn({ method: "GET" })
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
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Oportunidad no encontrada");

    // Check whether current professional already quoted
    const { data: myQuote } = await supabase
      .from("quotes")
      .select("id, amount, currency_code, estimated_days, message, status, created_at")
      .eq("request_id", data.id)
      .eq("professional_id", userId)
      .maybeSingle();

    const tr = (row.categories as any)?.category_translations?.find(
      (t: any) => t.language_code === "es",
    );
    return {
      request: {
        ...row,
        category_name: tr?.name ?? (row.categories as any)?.slug ?? "",
      },
      myQuote: myQuote ?? null,
    };
  });

const createQuoteSchema = z.object({
  request_id: z.string().uuid(),
  amount: z.number().positive(),
  currency_code: z.string().length(3),
  estimated_days: z.number().int().min(1).max(365).optional().nullable(),
  message: z.string().min(10).max(2000),
});

export const createQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createQuoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("quotes")
      .insert({
        request_id: data.request_id,
        professional_id: userId,
        amount: data.amount,
        currency_code: data.currency_code,
        estimated_days: data.estimated_days ?? null,
        message: data.message,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Bump request status to quoted if still open
    await supabase
      .from("service_requests")
      .update({ status: "quoted" })
      .eq("id", data.request_id)
      .eq("status", "open");

    return { id: row.id };
  });

export type MyQuoteRow = {
  id: string;
  amount: number;
  currency_code: string;
  status: QuoteStatus;
  created_at: string;
  request_id: string;
  request_title: string;
  request_status: string;
};

export const listMyQuotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyQuoteRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("quotes")
      .select("id, amount, currency_code, status, created_at, request_id, service_requests!inner(title, status)")
      .eq("professional_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((q: any) => ({
      id: q.id,
      amount: Number(q.amount),
      currency_code: q.currency_code,
      status: q.status,
      created_at: q.created_at,
      request_id: q.request_id,
      request_title: q.service_requests?.title ?? "",
      request_status: q.service_requests?.status ?? "",
    }));
  });

export type RequestQuoteRow = {
  id: string;
  amount: number;
  currency_code: string;
  estimated_days: number | null;
  message: string | null;
  status: QuoteStatus;
  created_at: string;
  professional_id: string;
  professional_name: string | null;
  professional_avatar: string | null;
};

export const listQuotesForMyRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ request_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<RequestQuoteRow[]> => {
    const { supabase, userId } = context;
    // Verify ownership
    const { data: req } = await supabase
      .from("service_requests")
      .select("id, client_id")
      .eq("id", data.request_id)
      .maybeSingle();
    if (!req || req.client_id !== userId) throw new Error("No autorizado");

    const { data: rows, error } = await supabase
      .from("quotes")
      .select(
        "id, amount, currency_code, estimated_days, message, status, created_at, professional_id, profiles:professional_id(display_name, full_name, avatar_url)",
      )
      .eq("request_id", data.request_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((q: any) => ({
      id: q.id,
      amount: Number(q.amount),
      currency_code: q.currency_code,
      estimated_days: q.estimated_days,
      message: q.message,
      status: q.status,
      created_at: q.created_at,
      professional_id: q.professional_id,
      professional_name: q.profiles?.display_name ?? q.profiles?.full_name ?? null,
      professional_avatar: q.profiles?.avatar_url ?? null,
    }));
  });

export const acceptQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ quote_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: conversationId, error } = await supabase.rpc("accept_quote", {
      _quote_id: data.quote_id,
    });
    if (error) throw new Error(error.message);
    return { conversation_id: conversationId as string };
  });
