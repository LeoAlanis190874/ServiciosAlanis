import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, BadgeCheck } from "lucide-react";
import { getProfessionalPublic } from "@/lib/professionals-public.functions";

const profQuery = (id: string) =>
  queryOptions({
    queryKey: ["public", "professional", id],
    queryFn: () => getProfessionalPublic({ data: { id } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/profesionales/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(profQuery(params.id));
    if (!data) throw notFound();
    return { data };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.data?.display_name ?? loaderData?.data?.full_name ?? "Profesional";
    const desc = loaderData?.data?.bio ?? "Profesional verificado en Servicios Alanis.";
    return {
      meta: [
        { title: `${name} — Servicios Alanis` },
        { name: "description", content: desc.slice(0, 160) },
        { property: "og:title", content: `${name} — Servicios Alanis` },
        { property: "og:description", content: desc.slice(0, 160) },
        ...(loaderData?.data?.avatar_url
          ? [{ property: "og:image", content: loaderData.data.avatar_url } as const]
          : []),
      ],
    };
  },
  component: ProfesionalPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Profesional no encontrado</h1>
          <Button asChild className="mt-6"><Link to="/profesionales">Ver todos</Link></Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  ),
});

function ProfesionalPage() {
  const { id } = Route.useParams();
  const { data: p } = useSuspenseQuery(profQuery(id));
  if (!p) return null;
  const name = p.display_name ?? p.full_name ?? "Profesional";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 py-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src={p.avatar_url ?? undefined} alt={name} />
                <AvatarFallback className="text-xl">{name.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{name}</h1>
                  {p.verified && (
                    <Badge className="gap-1"><BadgeCheck className="h-3.5 w-3.5" /> Verificado</Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 fill-current text-amber-500" />
                  {p.rating_avg ?? "—"} · {p.rating_count} reseñas
                  {p.country && <span>· {p.country.name}</span>}
                </div>
              </div>
              <Button asChild size="lg">
                <Link to="/auth">Solicitar cotización</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto grid gap-6 px-4 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {p.bio && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Acerca de</CardTitle></CardHeader>
                  <CardContent className="text-sm text-muted-foreground whitespace-pre-line">{p.bio}</CardContent>
                </Card>
              )}
              <Card>
                <CardHeader><CardTitle className="text-base">Reseñas</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {p.reviews.length === 0 && (
                    <div className="text-sm text-muted-foreground">Aún no tiene reseñas públicas.</div>
                  )}
                  {p.reviews.map((r) => (
                    <div key={r.id} className="border-b border-border/40 pb-3 last:border-0">
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                      {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader><CardTitle className="text-base">Servicios y tarifas</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {p.categories.length === 0 && (
                    <div className="text-muted-foreground">Sin servicios listados.</div>
                  )}
                  {p.categories.map((c) => (
                    <div key={c.category_id} className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{c.name}</div>
                        {c.years_experience != null && (
                          <div className="text-xs text-muted-foreground">{c.years_experience} años exp.</div>
                        )}
                      </div>
                      <div className="text-right">
                        {c.hourly_rate != null && (
                          <div className="font-semibold">
                            {c.hourly_rate} <span className="text-xs text-muted-foreground">{c.currency_code ?? ""}/h</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
