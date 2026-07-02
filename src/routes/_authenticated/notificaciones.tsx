import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCheck, Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount } from "@/lib/account.functions";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/lib/notifications.functions";

const accountQuery = queryOptions({ queryKey: ["me", "account"], queryFn: () => getMyAccount() });
const notifsQuery = queryOptions({
  queryKey: ["me", "notifications"],
  queryFn: () => listMyNotifications(),
});

export const Route = createFileRoute("/_authenticated/notificaciones")({
  head: () => ({ meta: [{ title: "Notificaciones — Servicios Alanis" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(accountQuery),
      context.queryClient.ensureQueryData(notifsQuery),
    ]);
  },
  component: NotificationsPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

function NotificationsPage() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: notifs } = useSuspenseQuery(notifsQuery);
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`notif:${account.userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${account.userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["me", "notifications"] });
          qc.invalidateQueries({ queryKey: ["me", "notifications", "unread"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [account.userId, qc]);

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "notifications"] });
      qc.invalidateQueries({ queryKey: ["me", "notifications", "unread"] });
    },
  });
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      toast.success("Notificaciones marcadas como leídas");
      qc.invalidateQueries({ queryKey: ["me", "notifications"] });
      qc.invalidateQueries({ queryKey: ["me", "notifications", "unread"] });
    },
  });

  const unread = notifs.filter((n) => !n.read_at).length;

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Bell className="h-5 w-5" /> Notificaciones {unread > 0 && <Badge>{unread}</Badge>}
          </h1>
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={!unread || markAll.isPending}>
            <CheckCheck className="mr-1 h-4 w-4" /> Marcar todas
          </Button>
        </div>
        <div className="mt-6 grid gap-3">
          {notifs.length === 0 && (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Sin notificaciones.</CardContent></Card>
          )}
          {notifs.map((n: NotificationRow) => (
            <Card key={n.id} className={n.read_at ? "opacity-60" : ""}>
              <CardContent className="flex items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{n.type}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("es")}</span>
                  </div>
                  <div className="mt-1 font-medium">{n.title}</div>
                  {n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}
                </div>
                {!n.read_at && (
                  <Button variant="ghost" size="sm" onClick={() => markOne.mutate(n.id)}>
                    Marcar leída
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
