import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount } from "@/lib/account.functions";
import { getConversation, listMessages, sendMessage, type MessageRow } from "@/lib/messages.functions";

const accountQuery = queryOptions({ queryKey: ["me", "account"], queryFn: () => getMyAccount() });
const convQuery = (id: string) =>
  queryOptions({ queryKey: ["conversation", id], queryFn: () => getConversation({ data: { id } }) });
const msgsQuery = (id: string) =>
  queryOptions({
    queryKey: ["conversation", id, "messages"],
    queryFn: () => listMessages({ data: { conversation_id: id } }),
  });

export const Route = createFileRoute("/_authenticated/mensajes/$id")({
  head: () => ({ meta: [{ title: "Conversación — Servicios Alanis" }] }),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(accountQuery),
      context.queryClient.ensureQueryData(convQuery(params.id)),
      context.queryClient.ensureQueryData(msgsQuery(params.id)),
    ]);
  },
  component: ConversationView,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Conversación no encontrada.</div>,
});

function ConversationView() {
  const { id } = Route.useParams();
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: conv } = useSuspenseQuery(convQuery(id));
  const { data: messages } = useSuspenseQuery(msgsQuery(id));
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: () => sendMessage({ data: { conversation_id: id, body } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["conversation", id, "messages"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo enviar"),
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const newMsg = payload.new as MessageRow;
          qc.setQueryData<MessageRow[]>(["conversation", id, "messages"], (prev = []) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col px-4 py-4">
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="text-base">{conv.other_name ?? "Usuario"}</CardTitle>
            <div className="text-xs text-muted-foreground">{conv.request_title}</div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-2 overflow-hidden p-0">
            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Inicia la conversación enviando un mensaje.
                </p>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === account.userId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <div className="whitespace-pre-wrap">{m.body}</div>
                      <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <form
              className="flex items-end gap-2 border-t p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (body.trim()) send.mutate();
              }}
            >
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                placeholder="Escribe un mensaje…"
                className="resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (body.trim()) send.mutate();
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={send.isPending || !body.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
