import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, BadgeCheck, Search } from "lucide-react";
import { getActiveCategories } from "@/lib/categories.functions";
import { getActiveCountries } from "@/lib/reference.functions";
import { searchProfessionals } from "@/lib/professionals-public.functions";


const categoriesQuery = queryOptions({
  queryKey: ["public", "categories"],
  queryFn: () => getActiveCategories(),
  staleTime: 5 * 60 * 1000,
});
const countriesQuery = queryOptions({
  queryKey: ["public", "countries"],
  queryFn: () => getActiveCountries(),
  staleTime: 60 * 60 * 1000,
});


export const Route = createFileRoute("/profesionales")({
  head: () => ({
    meta: [
      { title: "Profesionales verificados — Servicios Alanis" },
      {
        name: "description",
        content:
          "Encuentra profesionales verificados cerca de ti: plomería, electricidad, limpieza y más. Compara perfiles, reseñas y tarifas.",
      },
      { property: "og:title", content: "Profesionales verificados — Servicios Alanis" },
      {
        property: "og:description",
        content: "Compara profesionales verificados, reseñas reales y tarifas claras.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(countriesQuery),
    ]);
  },
  component: ProfesionalesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

function ProfesionalesPage() {
  const { data: cats } = useSuspenseQuery(categoriesQuery);
  const { data: countries } = useSuspenseQuery(countriesQuery);
  const [categorySlug, setCategorySlug] = useState<string>("__all__");
  const [countryId, setCountryId] = useState<string>("__all__");
  const [sort, setSort] = useState<"rating" | "recent">("rating");
  const [q, setQ] = useState<string>("");

  const results = useQuery({
    queryKey: ["public", "professionals", categorySlug, countryId, sort, q],
    queryFn: () =>
      searchProfessionals({
        data: {
          category_slug: categorySlug === "__all__" ? null : categorySlug,
          country_id: countryId === "__all__" ? null : countryId,
          sort,
          q: q.trim() || null,
          limit: 30,
        },
      }),
  });


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Profesionales verificados</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Filtra por categoría, compara reseñas y elige el profesional adecuado.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nombre…"
                  className="pl-9"
                />
              </div>
              <Select value={categorySlug} onValueChange={setCategorySlug}>
                <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas las categorías</SelectItem>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={countryId} onValueChange={setCountryId}>
                <SelectTrigger><SelectValue placeholder="País" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos los países</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as "rating" | "recent")}>
                <SelectTrigger><SelectValue placeholder="Orden" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Mejor calificados</SelectItem>
                  <SelectItem value="recent">Más recientes</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            {results.isLoading && (
              <div className="text-center text-sm text-muted-foreground">Buscando…</div>
            )}
            {results.error && (
              <div className="text-center text-sm text-destructive">
                {(results.error as Error).message}
              </div>
            )}
            {results.data && results.data.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No encontramos profesionales con esos criterios. Prueba con otra categoría.
                </CardContent>
              </Card>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(results.data ?? []).map((p) => {
                const name = p.display_name ?? p.full_name ?? "Profesional";
                return (
                  <Link
                    key={p.id}
                    to="/profesionales/$id"
                    params={{ id: p.id }}
                    className="block"
                  >
                    <Card className="h-full transition hover:border-primary/50 hover:shadow-md">
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={p.avatar_url ?? undefined} alt={name} />
                            <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 truncate font-semibold">
                              {name}
                              {p.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3 w-3 fill-current" />
                              {p.rating_avg ?? "—"}{" "}
                              <span className="text-muted-foreground/70">({p.rating_count})</span>
                            </div>
                          </div>
                        </div>
                        {p.bio && (
                          <p className="line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {p.categories.slice(0, 3).map((c) => (
                            <Badge key={c.category_id} variant="secondary">{c.name}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
