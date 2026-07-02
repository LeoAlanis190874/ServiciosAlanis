import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CategoriesGrid } from "@/components/landing/CategoriesGrid";
import { getActiveCategories } from "@/lib/categories.functions";

const categoriesQuery = queryOptions({
  queryKey: ["public", "categories"],
  queryFn: () => getActiveCategories(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/servicios")({
  head: () => ({
    meta: [
      { title: "Catálogo de Servicios — Servicios Alanis" },
      {
        name: "description",
        content:
          "Explora todas las categorías de servicios disponibles: plomería, electricidad, limpieza, carpintería y mucho más.",
      },
      { property: "og:title", content: "Catálogo de Servicios — Servicios Alanis" },
      {
        property: "og:description",
        content: "Todas las categorías para encontrar al profesional ideal cerca de ti.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQuery),
  component: ServiciosPage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-8 text-center text-sm text-muted-foreground">
      No se pudo cargar el catálogo. {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Categoría no encontrada.</div>,
});

function ServiciosPage() {
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Catálogo de servicios</h1>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Encuentra al profesional ideal entre nuestras categorías verificadas.
            </p>
          </div>
        </section>
        <CategoriesGrid
          categories={categories}
          heading="Todas las categorías"
          subheading="Selecciona una categoría para ver más detalles y solicitar un servicio."
        />
      </main>
      <SiteFooter />
    </div>
  );
}
