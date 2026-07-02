import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getMyAccount } from "@/lib/account.functions";
import { listUsers, setUserRole, setUserActive } from "@/lib/admin.functions";

const accountQuery = queryOptions({ queryKey: ["me", "account"], queryFn: () => getMyAccount() });
const usersQuery = (q: string) =>
  queryOptions({
    queryKey: ["admin", "users", q],
    queryFn: () => listUsers({ data: { q: q || null, limit: 100 } }),
    staleTime: 10_000,
  });

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuarios — Admin" }] }),
  loader: async ({ context }) => {
    const account = await context.queryClient.ensureQueryData(accountQuery);
    if (!account.roles.includes("admin")) throw redirect({ to: "/dashboard" });
    await context.queryClient.ensureQueryData(usersQuery(""));
  },
  component: AdminUsersPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

const ROLES = ["cliente", "profesional", "admin"] as const;

function AdminUsersPage() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const [q, setQ] = useState("");
  const { data: users } = useSuspenseQuery(usersQuery(q));
  const qc = useQueryClient();

  const roleMut = useMutation({
    mutationFn: (v: { user_id: string; role: (typeof ROLES)[number]; grant: boolean }) =>
      setUserRole({ data: v }),
    onSuccess: () => {
      toast.success("Rol actualizado");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const activeMut = useMutation({
    mutationFn: (v: { user_id: string; is_active: boolean }) => setUserActive({ data: v }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <div className="mt-4 max-w-md">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre…" />
        </div>
        <div className="mt-6 space-y-3">
          {users.length === 0 && (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Sin resultados.</CardContent></Card>
          )}
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 truncate font-medium">
                    <span className="truncate">
                      {u.display_name ?? u.full_name ?? u.id.slice(0, 8)}
                    </span>
                    {u.is_super_admin && (
                      <Badge className="gap-1">
                        <span className="text-[10px]">SUPER ADMIN</span>
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {u.roles.length === 0 && <Badge variant="outline">sin rol</Badge>}
                    {u.roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {ROLES.map((r) => {
                    const has = u.roles.includes(r);
                    return (
                      <Button
                        key={r}
                        size="sm"
                        variant={has ? "default" : "outline"}
                        disabled={roleMut.isPending || u.is_super_admin}
                        title={u.is_super_admin ? "Super Admin protegido" : undefined}
                        onClick={() => roleMut.mutate({ user_id: u.id, role: r, grant: !has })}
                      >
                        {has ? `– ${r}` : `+ ${r}`}
                      </Button>
                    );
                  })}
                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-xs text-muted-foreground">Activo</span>
                    <Switch
                      checked={u.is_active}
                      disabled={activeMut.isPending || u.is_super_admin}
                      onCheckedChange={(v) => activeMut.mutate({ user_id: u.id, is_active: v })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

        </div>
      </div>
    </AppShell>
  );
}
