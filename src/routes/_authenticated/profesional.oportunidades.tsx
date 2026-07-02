import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyAccount } from "@/lib/account.functions";
import { listOpportunities } from "@/lib/quotes.functions";

const accountQuery = queryOptions({ queryKey: ["me", "account"], queryFn: () => getMyAccount() });
const oppsQuery = queryOptions({
  queryKey: ["pro", "opportunities"],
  queryFn: () => listOpportunities(),
  staleTime: 30_000,
});

export const Route = createFileRoute("/_authenticated/profesional/oportunidades")({
  head: () => ({ meta: [{ title: "Oportunidades — Servicios Alanis" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(accountQuery),
      context.queryClient.ensureQueryData(oppsQuery),
    ]);
  },
  component: OpportunitiesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

function OpportunitiesPage() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: opps } = useSuspenseQuery(oppsQuery);

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Oportunidades abiertas</h1>
        <p className="text-sm text-muted-foreground">
          Solicitudes recientes que puedes cotizar.
        </p>
        <div className="mt-6 grid gap-4">
          {opps.length === 0 && (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No hay oportunidades abiertas.</CardContent></Card>
          )}
          {opps.map((o) => (
            <Card key={o.id} className="transition hover:shadow-md">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{o.category_name}</Badge>
                  <Badge variant="secondary">Urgencia: {o.urgency}</Badge>
                </div>
                <CardTitle className="mt-2 text-lg">{o.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">{o.description}</p>
                <Button asChild size="sm">
                  <Link to="/profesional/oportunidades/$id" params={{ id: o.id }}>Ver y cotizar</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
