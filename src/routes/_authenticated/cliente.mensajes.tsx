import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare } from "lucide-react";
import { getMyAccount } from "@/lib/account.functions";
import { listMyConversations } from "@/lib/messages.functions";

const accountQuery = queryOptions({ queryKey: ["me", "account"], queryFn: () => getMyAccount() });
const convsQuery = queryOptions({
  queryKey: ["me", "conversations"],
  queryFn: () => listMyConversations(),
  staleTime: 10_000,
});

function loader({ context }: any) {
  return Promise.all([
    context.queryClient.ensureQueryData(accountQuery),
    context.queryClient.ensureQueryData(convsQuery),
  ]);
}

function MessagesList({ title }: { title: string }) {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: convs } = useSuspenseQuery(convsQuery);
  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="mt-6 grid gap-2">
          {convs.length === 0 && (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto mb-2 h-6 w-6 opacity-50" />
              Aún no tienes conversaciones.
            </CardContent></Card>
          )}
          {convs.map((c) => (
            <Link key={c.id} to="/mensajes/$id" params={{ id: c.id }}>
              <Card className="transition hover:shadow-md">
                <CardContent className="flex items-center gap-3 py-3">
                  <Avatar><AvatarFallback>{(c.other_name ?? "?").slice(0, 1)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.other_name ?? "Usuario"}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.request_title}</div>
                  </div>
                  {c.last_message_at && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(c.last_message_at).toLocaleDateString("es")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

export const Route = createFileRoute("/_authenticated/cliente/mensajes")({
  head: () => ({ meta: [{ title: "Mensajes — Servicios Alanis" }] }),
  loader,
  component: () => <MessagesList title="Mis mensajes" />,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});
