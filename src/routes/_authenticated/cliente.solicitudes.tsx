import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";
import { getMyAccount } from "@/lib/account.functions";
import { listMyRequests, type RequestStatus } from "@/lib/requests.functions";

const accountQuery = queryOptions({
  queryKey: ["me", "account"],
  queryFn: () => getMyAccount(),
});
const requestsQuery = queryOptions({
  queryKey: ["me", "requests"],
  queryFn: () => listMyRequests(),
});

export const Route = createFileRoute("/_authenticated/cliente/solicitudes")({
  head: () => ({ meta: [{ title: "Mis solicitudes — Servicios Alanis" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(accountQuery),
      context.queryClient.ensureQueryData(requestsQuery),
    ]),
  component: SolicitudesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

const statusLabel: Record<RequestStatus, string> = {
  draft: "Borrador",
  open: "Abierta",
  quoted: "Con cotizaciones",
  assigned: "Asignada",
  in_progress: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
  disputed: "En disputa",
};

const statusVariant: Record<RequestStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  open: "default",
  quoted: "default",
  assigned: "secondary",
  in_progress: "secondary",
  completed: "outline",
  cancelled: "outline",
  disputed: "destructive",
};

function SolicitudesPage() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: requests } = useSuspenseQuery(requestsQuery);

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mis solicitudes</h1>
            <p className="text-sm text-muted-foreground">
              Servicios que has publicado para recibir cotizaciones.
            </p>
          </div>
          <Button asChild>
            <Link to="/cliente/solicitudes/nueva">
              <Plus className="mr-1 h-4 w-4" /> Nueva solicitud
            </Link>
          </Button>
        </div>

        {requests.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold">Aún no tienes solicitudes</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Crea tu primera solicitud y recibe cotizaciones de profesionales verificados en tu zona.
              </p>
              <Button asChild className="mt-2">
                <Link to="/cliente/solicitudes/nueva">
                  <Plus className="mr-1 h-4 w-4" /> Crear solicitud
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 grid gap-3">
            {requests.map((r) => (
              <Link
                key={r.id}
                to="/cliente/solicitudes/$id"
                params={{ id: r.id }}
                className="block"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{r.title}</h3>
                          <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                          <Badge variant="outline">{r.category_name}</Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {r.description}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("es")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
