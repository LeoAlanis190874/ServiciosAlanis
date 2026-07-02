import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ConversationRow = {
  id: string;
  request_id: string;
  request_title: string;
  client_id: string;
  professional_id: string;
  other_name: string | null;
  other_avatar: string | null;
  last_message_at: string | null;
  created_at: string;
};

export const listMyConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConversationRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("conversations")
      .select(
        "id, request_id, client_id, professional_id, last_message_at, created_at, service_requests:request_id(title), client:client_id(display_name, full_name, avatar_url), professional:professional_id(display_name, full_name, avatar_url)",
      )
      .or(`client_id.eq.${userId},professional_id.eq.${userId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((c: any) => {
      const isClient = c.client_id === userId;
      const other = isClient ? c.professional : c.client;
      return {
        id: c.id,
        request_id: c.request_id,
        request_title: c.service_requests?.title ?? "",
        client_id: c.client_id,
        professional_id: c.professional_id,
        other_name: other?.display_name ?? other?.full_name ?? null,
        other_avatar: other?.avatar_url ?? null,
        last_message_at: c.last_message_at,
        created_at: c.created_at,
      };
    });
  });

export type ConversationDetail = {
  id: string;
  request_id: string;
  request_title: string;
  other_name: string | null;
  am_client: boolean;
};

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ConversationDetail> => {
    const { supabase, userId } = context;
    const { data: c, error } = await supabase
      .from("conversations")
      .select(
        "id, request_id, client_id, professional_id, service_requests:request_id(title), client:client_id(display_name, full_name), professional:professional_id(display_name, full_name)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("Conversación no encontrada");
    const amClient = c.client_id === userId;
    const other: any = amClient ? c.professional : c.client;
    return {
      id: c.id,
      request_id: c.request_id,
      request_title: (c.service_requests as any)?.title ?? "",
      other_name: other?.display_name ?? other?.full_name ?? null,
      am_client: amClient,
    };
  });

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ conversation_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<MessageRow[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", data.conversation_id)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return (rows ?? []) as MessageRow[];
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        conversation_id: z.string().uuid(),
        body: z.string().min(1).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: data.conversation_id,
        sender_id: userId,
        body: data.body,
      })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();
    if (error) throw new Error(error.message);
    // Bump conversation last_message_at
    await supabase
      .from("conversations")
      .update({ last_message_at: row.created_at })
      .eq("id", data.conversation_id);
    return row as MessageRow;
  });
