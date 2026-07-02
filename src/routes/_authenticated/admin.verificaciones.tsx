import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { getMyAccount } from "@/lib/account.functions";
import { listPendingVerifications, reviewVerification } from "@/lib/admin.functions";

const accountQuery = queryOptions({ queryKey: ["me", "account"], queryFn: () => getMyAccount() });
const pendingQuery = queryOptions({
  queryKey: ["admin", "verifications", "pending"],
  queryFn: () => listPendingVerifications(),
  staleTime: 10_000,
});

export const Route = createFileRoute("/_authenticated/admin/verificaciones")({
  head: () => ({ meta: [{ title: "Verificaciones — Admin" }] }),
  loader: async ({ context }) => {
    const account = await context.queryClient.ensureQueryData(accountQuery);
    if (!account.roles.includes("admin")) throw redirect({ to: "/dashboard" });
    await context.queryClient.ensureQueryData(pendingQuery);
  },
  component: AdminVerificationsPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

function AdminVerificationsPage() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: items } = useSuspenseQuery(pendingQuery);
  const qc = useQueryClient();

  const review = useMutation({
    mutationFn: (v: { id: string; decision: "verified" | "rejected" }) =>
      reviewVerification({ data: { id: v.id, decision: v.decision, notes: null } }),
    onSuccess: () => {
      toast.success("Revisión guardada");
      qc.invalidateQueries({ queryKey: ["admin", "verifications", "pending"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Verificaciones pendientes</h1>
        <div className="mt-6 grid gap-3">
          {items.length === 0 && (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
              No hay verificaciones pendientes.
            </CardContent></Card>
          )}
          {items.map((v) => (
            <Card key={v.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {v.professional_name ?? v.professional_id}
                  <Badge variant="secondary">{v.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Tipo:</span> {v.document_type ?? "—"}</div>
                {v.document_url && (
                  <div>
                    <a href={v.document_url} target="_blank" rel="noreferrer" className="text-primary underline">
                      Ver documento
                    </a>
                  </div>
                )}
                {v.notes && <div className="rounded-md bg-muted p-3">{v.notes}</div>}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: v.id, decision: "verified" })}
                  >
                    <Check className="mr-1 h-4 w-4" /> Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: v.id, decision: "rejected" })}
                  >
                    <X className="mr-1 h-4 w-4" /> Rechazar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
