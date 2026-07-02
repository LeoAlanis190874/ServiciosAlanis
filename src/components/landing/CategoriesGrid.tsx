import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import type { PublicCategory } from "@/lib/categories.functions";

export function CategoriesGrid({
  categories,
  limit,
  heading = "Servicios populares",
  subheading = "Explora las categorías más solicitadas y encuentra al profesional ideal.",
}: {
  categories: PublicCategory[];
  limit?: number;
  heading?: string;
  subheading?: string;
}) {
  const items = limit ? categories.slice(0, limit) : categories;

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{heading}</h2>
          <p className="mt-3 text-muted-foreground">{subheading}</p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((cat) => {
            const Icon = (Icons as any)[cat.icon ?? "Wrench"] ?? Icons.Wrench;
            return (
              <Link
                key={cat.id}
                to="/servicios/$categoria"
                params={{ categoria: cat.slug }}
                className="group rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{cat.name}</h3>
                {cat.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{cat.description}</p>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
