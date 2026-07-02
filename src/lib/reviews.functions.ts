import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReviewRow = {
  id: string;
  request_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

const createSchema = z.object({
  request_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
});

export const createReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: req, error: reqErr } = await supabase
      .from("service_requests")
      .select("id, status, client_id, assigned_professional_id")
      .eq("id", data.request_id)
      .maybeSingle();
    if (reqErr) throw new Error(reqErr.message);
    if (!req) throw new Error("Solicitud no encontrada");
    if (req.status !== "completed") throw new Error("Solo puedes reseñar trabajos completados");
    let reviewee_id: string | null = null;
    if (req.client_id === userId) reviewee_id = req.assigned_professional_id;
    else if (req.assigned_professional_id === userId) reviewee_id = req.client_id;
    else throw new Error("No participaste en esta solicitud");
    if (!reviewee_id) throw new Error("No hay contraparte asignada");

    const { data: row, error } = await supabase
      .from("reviews")
      .insert({
        request_id: data.request_id,
        reviewer_id: userId,
        reviewee_id,
        rating: data.rating,
        comment: data.comment ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listReviewsForRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ request_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ReviewRow[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("reviews")
      .select("id, request_id, reviewer_id, reviewee_id, rating, comment, created_at")
      .eq("request_id", data.request_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as ReviewRow[];
  });
