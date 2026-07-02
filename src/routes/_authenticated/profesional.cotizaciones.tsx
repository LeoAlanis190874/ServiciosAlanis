import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMyAccount } from "@/lib/account.functions";
import { listMyQuotes } from "@/lib/quotes.functions";

const accountQuery = queryOptions({ queryKey: ["me", "account"], queryFn: () => getMyAccount() });
const quotesQuery = queryOptions({
  queryKey: ["pro", "quotes"],
  queryFn: () => listMyQuotes(),
  staleTime: 30_000,
});

export const Route = createFileRoute("/_authenticated/profesional/cotizaciones")({
  head: () => ({ meta: [{ title: "Mis cotizaciones — Servicios Alanis" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(accountQuery),
      context.queryClient.ensureQueryData(quotesQuery),
    ]);
  },
  component: MyQuotesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

const statusColor: Record<string, string> = {
  pending: "secondary",
  accepted: "default",
  rejected: "destructive",
  withdrawn: "outline",
  expired: "outline",
};

function MyQuotesPage() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: quotes } = useSuspenseQuery(quotesQuery);

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Mis cotizaciones</h1>
        <div className="mt-6 grid gap-3">
          {quotes.length === 0 && (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Aún no has enviado cotizaciones.</CardContent></Card>
          )}
          {quotes.map((q) => (
            <Link key={q.id} to="/profesional/oportunidades/$id" params={{ id: q.request_id }}>
              <Card className="transition hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div>
                    <div className="font-medium">{q.request_title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(q.created_at).toLocaleString("es")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold">{q.amount} {q.currency_code}</div>
                    <Badge variant={statusColor[q.status] as any}>{q.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
