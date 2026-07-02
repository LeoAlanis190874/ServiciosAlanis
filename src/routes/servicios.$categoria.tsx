import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { getActiveCategories } from "@/lib/categories.functions";

const categoriesQuery = queryOptions({
  queryKey: ["public", "categories"],
  queryFn: () => getActiveCategories(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/servicios/$categoria")({
  loader: async ({ context, params }) => {
    const cats = await context.queryClient.ensureQueryData(categoriesQuery);
    const cat = cats.find((c) => c.slug === params.categoria);
    if (!cat) throw notFound();
    return { cat };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.cat.name} — Servicios Alanis` },
          {
            name: "description",
            content:
              loaderData.cat.description ??
              `Solicita servicios de ${loaderData.cat.name} con profesionales verificados.`,
          },
          { property: "og:title", content: `${loaderData.cat.name} — Servicios Alanis` },
          {
            property: "og:description",
            content:
              loaderData.cat.description ??
              `Profesionales verificados de ${loaderData.cat.name} cerca de ti.`,
          },
        ]
      : [{ title: "Servicios Alanis" }],
  }),
  component: CategoriaPage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-8 text-center text-sm text-muted-foreground">
      No se pudo cargar la categoría. {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Categoría no encontrada</h1>
          <p className="mt-2 text-muted-foreground">
            Revisa el catálogo completo para encontrar el servicio que necesitas.
          </p>
          <Button asChild className="mt-6">
            <Link to="/servicios">Ver catálogo</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  ),
});

function CategoriaPage() {
  const { categoria } = Route.useParams();
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const cat = categories.find((c) => c.slug === categoria)!;
  const Icon = (Icons as any)[cat.icon ?? "Wrench"] ?? Icons.Wrench;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 py-16">
            <nav className="text-sm text-muted-foreground">
              <Link to="/servicios" className="hover:text-foreground">
                Servicios
              </Link>{" "}
              <span className="mx-1">/</span>
              <span className="text-foreground">{cat.name}</span>
            </nav>
            <div className="mt-6 flex items-start gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{cat.name}</h1>
                {cat.description ? (
                  <p className="mt-2 max-w-2xl text-muted-foreground">{cat.description}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Solicitar este servicio</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/servicios">Volver al catálogo</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-8 text-center">
              <h2 className="text-lg font-semibold">Próximamente: profesionales de {cat.name}</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                Pronto verás aquí a los profesionales verificados de esta categoría en tu zona. Mientras
                tanto, crea tu cuenta y publica tu solicitud — los profesionales te enviarán cotizaciones.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
