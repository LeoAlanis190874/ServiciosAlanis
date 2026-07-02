import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroSection } from "@/components/landing/HeroSection";
import { CategoriesGrid } from "@/components/landing/CategoriesGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CTASection } from "@/components/landing/CTASection";
import { getActiveCategories } from "@/lib/categories.functions";

const categoriesQuery = queryOptions({
  queryKey: ["public", "categories"],
  queryFn: () => getActiveCategories(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Servicios Alanis — Encuentra ayuda profesional cerca de ti" },
      {
        name: "description",
        content:
          "Solicita servicios y recibe cotizaciones de profesionales y técnicos verificados cerca de ti. Plomería, electricidad, limpieza y más.",
      },
      { property: "og:title", content: "Servicios Alanis — Ayuda profesional cerca de ti" },
      {
        property: "og:description",
        content:
          "Conecta con profesionales verificados y recibe cotizaciones para cualquier servicio.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQuery),
  component: LandingPage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-8 text-center text-sm text-muted-foreground">
      No se pudo cargar la página. {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Página no encontrada.</div>,
});

function LandingPage() {
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <CategoriesGrid categories={categories} limit={8} />
        <HowItWorks />
        <CTASection />
      </main>
      <SiteFooter />
    </div>
  );
}
