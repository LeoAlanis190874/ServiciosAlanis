import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, Users, FileText, FileSignature, Star } from "lucide-react";
import { getMyAccount } from "@/lib/account.functions";
import { getAdminMetrics } from "@/lib/admin.functions";

const accountQuery = queryOptions({ queryKey: ["me", "account"], queryFn: () => getMyAccount() });
const metricsQuery = queryOptions({ queryKey: ["admin", "metrics"], queryFn: () => getAdminMetrics() });

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Panel admin — Servicios Alanis" }] }),
  loader: async ({ context }) => {
    const account = await context.queryClient.ensureQueryData(accountQuery);
    if (!account.roles.includes("admin")) {
      throw redirect({ to: "/dashboard" });
    }
    await context.queryClient.ensureQueryData(metricsQuery);
  },
  component: AdminHome,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

function AdminHome() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: m } = useSuspenseQuery(metricsQuery);

  const cards = [
    { label: "Usuarios", value: m.users, icon: Users },
    { label: "Solicitudes", value: m.requests, icon: FileText },
    { label: "Solicitudes abiertas", value: m.open_requests, icon: FileText },
    { label: "Cotizaciones", value: m.quotes, icon: FileSignature },
    { label: "Reseñas", value: m.reviews, icon: Star },
    { label: "Verificaciones pendientes", value: m.pending_verifications, icon: BadgeCheck },
  ];

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Panel de administración</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <c.icon className="h-4 w-4" /> {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{c.value}</CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link to="/admin/verificaciones">
            <Card className="transition hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BadgeCheck className="h-4 w-4" /> Verificaciones pendientes
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Revisa los documentos enviados por los profesionales.
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
