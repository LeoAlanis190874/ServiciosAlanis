import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FileText,
  Plus,
  Briefcase,
  Shield,
  UserCog,
  ShieldCheck,
  Users,
  ListTree,
  BadgeCheck,
  Activity,
} from "lucide-react";
import { getMyAccount } from "@/lib/account.functions";
import { getAdminMetrics } from "@/lib/admin.functions";

const accountQuery = queryOptions({
  queryKey: ["me", "account"],
  queryFn: () => getMyAccount(),
  staleTime: 30_000,
});

const metricsQuery = queryOptions({
  queryKey: ["admin", "metrics"],
  queryFn: () => getAdminMetrics(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Servicios Alanis" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(accountQuery),
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">
      Error: {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

function DashboardPage() {
  const { data: account } = useSuspenseQuery(accountQuery);

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Hola, {account.profile.display_name || account.profile.full_name || "bienvenido"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Tus roles: {account.roles.length > 0 ? account.roles.join(", ") : "sin rol asignado"}
            </p>
          </div>
          {account.isSuperAdmin && (
            <Badge className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Super Admin
            </Badge>
          )}
        </div>

        {!account.onboardingComplete && (
          <Alert className="mt-6">
            <UserCog className="h-4 w-4" />
            <AlertTitle>Completa tu perfil</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>Necesitamos algunos datos para personalizar tu experiencia.</span>
              <Button asChild size="sm">
                <Link to="/onboarding">Completar ahora</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {account.isSuperAdmin && <SuperAdminPanel />}

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {account.roles.includes("cliente") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" /> Mis solicitudes
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Publica un servicio y recibe cotizaciones de profesionales verificados.
                </p>
                <div className="flex gap-2">
                  <Button asChild size="sm">
                    <Link to="/cliente/solicitudes/nueva">
                      <Plus className="mr-1 h-4 w-4" /> Nueva solicitud
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/cliente/solicitudes">Ver todas</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {account.roles.includes("profesional") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="h-4 w-4" /> Oportunidades
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Solicitudes abiertas filtradas por tus categorías.
                </p>
                <Button asChild size="sm">
                  <Link to="/profesional/oportunidades">Explorar</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {account.roles.includes("admin") && !account.isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" /> Administración
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Panel de verificaciones, categorías y usuarios.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link to="/admin">Ir al panel</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function SuperAdminPanel() {
  const { data: metrics, isLoading } = useQuery(metricsQuery);

  const stats = [
    { label: "Usuarios", value: metrics?.users, icon: Users, to: "/admin/usuarios" },
    { label: "Solicitudes", value: metrics?.requests, icon: FileText, to: "/admin" },
    { label: "Abiertas", value: metrics?.open_requests, icon: Activity, to: "/admin" },
    { label: "Cotizaciones", value: metrics?.quotes, icon: Briefcase, to: "/admin" },
    { label: "Reseñas", value: metrics?.reviews, icon: BadgeCheck, to: "/admin" },
    {
      label: "Verif. pendientes",
      value: metrics?.pending_verifications,
      icon: ShieldCheck,
      to: "/admin/verificaciones",
    },
  ];

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Panel Super Admin</h2>
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="h-3 w-3" /> Cuenta protegida
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="mt-1 text-2xl font-bold">
                  {isLoading ? "…" : (s.value ?? 0)}
                </div>
              </div>
              <s.icon className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm"><Link to="/admin">Panel admin</Link></Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/usuarios"><Users className="mr-1 h-4 w-4" /> Usuarios</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/categorias"><ListTree className="mr-1 h-4 w-4" /> Categorías</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/verificaciones"><BadgeCheck className="mr-1 h-4 w-4" /> Verificaciones</Link>
        </Button>
      </div>
    </section>
  );
}

